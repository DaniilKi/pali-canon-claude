/** Browser display/consent guards for backend-validated metadata. Not source, rights or alignment approval. */
const own = (value, key) => value && Object.hasOwn(value, key);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const stable = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(stable(v))) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(stable(value[k]))])) : value);
export const sameScope = (a, b) => stable(a) === stable(b);

export function scopeDescriptor(choice, requestedId) {
  if (!own(choice, 'translation_scope')) return null;
  const scope = choice.translation_scope;
  const fail = () => { throw new Error('This source has an unsupported or incomplete scope declaration. No scoped source was requested. Reload the passage and review the updated sources.'); };
  if (!scope || scope.version !== 1 || scope.whole_unit_coverage !== false || !sha(scope.scope_sha256) || !sha(scope.text_sha256) || !sha(scope.pali_sha256) || !nonempty(scope.source_commit) || !nonempty(scope.note) || !nonempty(choice.translation_id)) fail();
  if (scope.kind === 'shared_page') {
    const ids = scope.text_ids;
    const presentation = scope.presentation || (scope.condensed === true ? 'condensed' : null);
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 32 || ids.some(id => !nonempty(id) || id.length > 300) || new Set(ids).size !== ids.length || !ids.includes(requestedId) || scope.owner_id !== ids[0] || scope.individual_alignment_verified !== false || !nonempty(scope.source_reference) || !['condensed', 'compilation'].includes(presentation) || (presentation === 'compilation' && !sha(scope.notice_sha256)) || (own(scope, 'condensed') && scope.condensed !== (presentation === 'condensed'))) fail();
    return { kind: scope.kind, label: presentation === 'compilation' ? 'Shared compilation page' : 'Shared condensed page', scope: JSON.parse(JSON.stringify(scope)), flags: { allow_shared: true, scope_sha256: scope.scope_sha256 } };
  }
  if (scope.kind === 'partial_unit') {
    const prefix = requestedId + '/';
    if(choice.translation_id.startsWith('ati:')&&(scope.extractor!=='ati-freeverse-v1'||!sha(scope.notice_sha256)))fail();
    if (scope.unit_id !== requestedId || !nonempty(scope.first_ref) || !nonempty(scope.last_ref) || !scope.first_ref.startsWith(prefix) || !scope.last_ref.startsWith(prefix) || !/^[1-9]\d*$/.test(scope.first_ref.slice(prefix.length)) || !/^[1-9]\d*$/.test(scope.last_ref.slice(prefix.length)) || Number(scope.first_ref.slice(prefix.length)) > Number(scope.last_ref.slice(prefix.length))) fail();
    return { kind: scope.kind, label: 'Partial-unit source', scope: JSON.parse(JSON.stringify(scope)), flags: { allow_partial: true, scope_sha256: scope.scope_sha256 } };
  }
  fail();
}

/** Validate identity/scope before rendering; return only a checked same-source continuation. */
export function validateEnglishPage(data, args, context) {
  const offset = args.offset || 0;
  if (!data || !nonempty(data.text) || !nonempty(data.translation_id) || !nonempty(data.translator) || !nonempty(data.attribution) || !(nonempty(data.license) || (data.license && typeof data.license === 'object' && nonempty(data.license.name))) || data.offset !== offset) throw new Error('The English source response is incomplete. No translation was displayed.');
  const choice = context.choices.find(c => c.translation_id === data.translation_id);
  if (!choice) throw new Error('The returned English source version was not in the reviewed list. Reload the passage and review sources again.');
  if (context.accepted) {
    const accepted = context.accepted;
    if (data.translation_id !== args.translation || data.whole_unit_coverage !== false || !own(data, 'translation_scope') || !sameScope(data.translation_scope, accepted.scope)) throw new Error('The source scope or version changed after review. Reload the passage and give fresh consent; no scoped text was displayed.');
    if (accepted.kind === 'shared_page') {
      if (args.allow_shared !== true || args.allow_partial === true || data.text_id !== null || data.requested_text_id !== context.uid || data.citation !== accepted.scope.source_reference) throw new Error('A shared page was incorrectly attributed to an individual discourse. No scoped text was displayed.');
    } else if (args.allow_partial !== true || args.allow_shared === true || data.text_id !== context.uid) throw new Error('The partial source no longer matches the reviewed unit. No scoped text was displayed.');
    if (args.scope_sha256 !== accepted.scope.scope_sha256) throw new Error('The scope consent is missing its reviewed mapping pin.');
  } else if (own(data, 'translation_scope') || data.whole_unit_coverage === false || own(choice, 'translation_scope') || data.text_id !== context.uid || args.allow_shared === true || args.allow_partial === true) throw new Error('This response needs a separate scope review. No partial/shared page was displayed as a whole-text translation.');
  if (data.next_offset === null || data.next_offset === undefined) {
    if (data.continue_with != null) throw new Error('The source returned an inconsistent continuation. Reload its first page.');
    return null;
  }
  const next = data.continue_with?.arguments;
  if (data.continue_with?.name !== 'get_translation' || !next || next.uid !== context.uid || next.translation !== data.translation_id || !Number.isSafeInteger(next.offset) || next.offset <= offset || next.offset > 2000000 || next.offset !== data.next_offset || !sha(next.prefix_sha256) || !Number.isInteger(next.limit) || next.limit < 500 || next.limit > 30000) throw new Error('The source returned an unsafe continuation. No next-page request was made.');
  if (context.accepted) {
    const shared = context.accepted.kind === 'shared_page';
    if (next.scope_sha256 !== context.accepted.scope.scope_sha256 || next[shared ? 'allow_shared' : 'allow_partial'] !== true || next[shared ? 'allow_partial' : 'allow_shared'] === true) throw new Error('The next page dropped or changed its scope consent. Review the source again.');
  } else if (next.allow_shared === true || next.allow_partial === true || own(next, 'scope_sha256')) throw new Error('The next page unexpectedly changes source scope. Review it separately.');
  return JSON.parse(JSON.stringify(next));
}
