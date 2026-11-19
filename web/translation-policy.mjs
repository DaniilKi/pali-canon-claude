import {translatorNotes,sectionSourceUnit,milindaSourceUnit,anTenSourceUnit,validateSectionIdentity,validateSectionDescriptor} from './milinda-sources.mjs';

import { APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR, APADANA_PROFILES } from '../src/apadana-profiles.mjs';

export const apadanaId = uid => APADANA_PROFILES[uid]?.path ? 'ap:' + APADANA_PROFILES[uid].path.replace(/^\/text\/|\/$/g, '') : undefined;
export const apadanaFamily = id => typeof id === 'string' && /^ap:/i.test(id.trim());
const isApadana = value => apadanaFamily(value?.translation_id) || value?.source === 'apadana' || value?.source === 'Legends of the Buddhist Saints (Apadāna)' || own(value, 'translation_revision') || own(value, 'publisher_paratext') || own(value, 'chapter_summary');

/** Separately owned chapter paratext is never folded into poem text or notes. */
export function validateChapterSummary(value, uid, content = false) {
  const expected = APADANA_PROFILES[uid]?.chapter_summary;
  if (!expected) { if (own(value, 'chapter_summary')) throw Error('The pinned Apadāna chapter-summary owner changed.'); return; }
  const summary = value.chapter_summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) throw Error('The pinned Apadāna chapter-summary declaration is missing.');
  const { text, translator_notes, ...descriptor } = summary;
  if (!sameScope(descriptor, expected) || !content && (own(summary, 'text') || own(summary, 'translator_notes'))
    || content && (!nonempty(text) || text.length > 50000 || !Array.isArray(translator_notes) || translator_notes.length !== 1
      || translator_notes.some(n => !n || Object.keys(n).sort().join(',') !== 'number,text' || n.number !== 8 || !nonempty(n.text) || n.text.length > 50000))) {
    throw Error('The pinned Apadāna chapter-summary scope or note ownership changed.');
  }
}

export function validateApadanaChoice(value, uid, content = false) {
  if (!isApadana(value)) return;
  const profile = APADANA_PROFILES[uid];
  if (!profile || value.translation_id !== apadanaId(uid) || value.translation_revision !== APADANA_COMMIT
    || value.translator !== APADANA_TRANSLATOR || value.license !== APADANA_LICENSE || value.url !== profile.url
    || own(value, 'translation_scope') || own(value, 'source_section') || value.whole_unit_coverage === false) {
    throw Error('The pinned Apadāna source identity or terms changed. No English source was displayed.');
  }
  validateChapterSummary(value, uid, content);
}

/** Browser display/consent guards for backend-validated metadata. Not source, rights or alignment approval. */
const own = (value, key) => value && Object.hasOwn(value, key);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const stable = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(stable(v))) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(stable(value[k]))])) : value);
export const sameScope = (a, b) => stable(a) === stable(b);

const MEDICINE_ID = 'ati:/tipitaka/kn/miln/miln.5x.olen';
const MEDICINE_EXTRACTOR = 'ati-milinda-medicine-two-verses-v1';
function medicineFamily(id) {
  if (typeof id !== 'string') return false;
  let decoded=id;try{decoded=decodeURIComponent(id);}catch{}
  return decoded.trim().split(/[?#]/,1)[0].replace(/\.html?$/i,'').toLowerCase()===MEDICINE_ID;
}

export function scopeDescriptor(choice, requestedId) {
  validateApadanaChoice(choice, requestedId);
  validateSectionIdentity(choice);
  if (sectionSourceUnit(choice?.translation_id)) {
    validateSectionDescriptor(choice);
    if (sectionSourceUnit(choice.translation_id) !== requestedId || own(choice, 'translation_scope') || own(choice, 'whole_unit_coverage') && choice.whole_unit_coverage !== true) throw Error('The reviewed source section belongs to another selection or changed scope. No English source was requested.');
  }
  const fail = () => { throw new Error('This source has an unsupported or incomplete scope declaration. No scoped source was requested. Reload the passage and review the updated sources.'); };
  const reserved=medicineFamily(choice?.translation_id), selector=choice?.translation_scope?.extractor===MEDICINE_EXTRACTOR;
  if (!own(choice, 'translation_scope')) { if(reserved)fail();return null; }
  const scope = choice.translation_scope;
  if (reserved || selector) {
    const read=scope?.read_with;
    if(choice.translation_id!==MEDICINE_ID || requestedId!=='mil6.4.1' || scope?.kind!=='partial_unit' || scope.version!==1 || scope.unit_id!=='mil6.4.1' || scope.first_ref!=='mil6.4.1/20' || scope.last_ref!=='mil6.4.1/21' || scope.extractor!==MEDICINE_EXTRACTOR || scope.pali_segments!==2 || scope.whole_unit_coverage!==false || own(choice,'whole_unit_coverage')&&choice.whole_unit_coverage!==false || !read || Object.keys(read).sort().join(',')!=='limit,offset,tool,uid' || read.tool!=='get_text' || read.uid!=='mil6.4.1' || read.offset!==19 || read.limit!==2 || own(scope,'read_pages') || own(scope,'pali_excerpt')) fail();
  }
  if (!scope || ![1,2].includes(scope.version) || scope.whole_unit_coverage !== false || !sha(scope.scope_sha256) || !sha(scope.text_sha256) || !sha(scope.pali_sha256) || !nonempty(scope.source_commit) || !nonempty(scope.note) || !nonempty(choice.translation_id)) fail();
  if (scope.kind === 'shared_page') {
    if(scope.version!==1)fail();
    const ids = scope.text_ids;
    const presentation = scope.presentation || (scope.condensed === true ? 'condensed' : null);
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 32 || ids.some(id => !nonempty(id) || id.length > 300) || new Set(ids).size !== ids.length || !ids.includes(requestedId) || scope.owner_id !== ids[0] || scope.individual_alignment_verified !== false || !nonempty(scope.source_reference) || !['condensed', 'compilation'].includes(presentation) || (presentation === 'compilation' && !sha(scope.notice_sha256)) || (own(scope, 'condensed') && scope.condensed !== (presentation === 'condensed'))) fail();
    return { kind: scope.kind, label: presentation === 'compilation' ? 'Shared compilation page' : 'Shared condensed page', scope: JSON.parse(JSON.stringify(scope)), flags: { allow_shared: true, scope_sha256: scope.scope_sha256 } };
  }
  if (scope.kind === 'partial_unit') {
    const prefix = requestedId + '/';
    if(choice.translation_id.startsWith('ati:')&&(!(scope.version===2?['ati-chapter-prose-v1','ati-chapter-p5-of5-no-notes-v1','ati-chapter-p1to4-of5-notes-v1'].includes(scope.extractor):['ati-freeverse-v1','ati-chapter-p2-of2-v1','ati-chapter-p11-of11-v1','ati-chapter-p1-of4-v1','ati-chapter-p14-of24-v1','ati-excerpt-verse-pre-v1','ati-chapter-p1to3-of4-ellipsis-v1','ati-vinaya-mv6-p1to5-of5-v1','ati-vinaya-mv8-p1to22-of22-v1','ati-vinaya-mv1-mixed21p6v-v1','ati-milinda-medicine-two-verses-v1'].includes(scope.extractor))||!sha(scope.notice_sha256)))fail();
    if(scope.version===2){const p=scope.pali_excerpt;if(!choice.translation_id.startsWith('ati:')||scope.first_ref!==scope.last_ref||!p||p.ref!==scope.first_ref||p.type!=='prose'||!nonempty(p.text)||p.text.length>2000000||p.offset_unit!=='utf16_code_units'||!sha(p.segment_sha256)||!Number.isSafeInteger(p.start_char)||!Number.isSafeInteger(p.end_char)||p.start_char<0||p.end_char<=p.start_char||p.end_char-p.start_char!==p.text.length||own(scope,'read_with')||own(scope,'read_pages'))fail();}
    else if(own(scope,'pali_excerpt'))fail();
    if (scope.unit_id !== requestedId || !nonempty(scope.first_ref) || !nonempty(scope.last_ref) || !scope.first_ref.startsWith(prefix) || !scope.last_ref.startsWith(prefix) || !/^[1-9]\d*$/.test(scope.first_ref.slice(prefix.length)) || !/^[1-9]\d*$/.test(scope.last_ref.slice(prefix.length)) || Number(scope.first_ref.slice(prefix.length)) > Number(scope.last_ref.slice(prefix.length))) fail();
    return { kind: scope.kind, label: 'Partial-unit source', scope: JSON.parse(JSON.stringify(scope)), flags: { allow_partial: true, scope_sha256: scope.scope_sha256 } };
  }
  fail();
}

/** Validate identity/scope before rendering; return only a checked same-source continuation. */
export function validateEnglishPage(data, args, context) {
  const offset = args.offset || 0;
  if(medicineFamily(data?.translation_id) || data?.translation_scope?.extractor===MEDICINE_EXTRACTOR)scopeDescriptor(data,context.uid);
  if (data && typeof data === 'object') {
    translatorNotes(data);
    if (sectionSourceUnit(data.translation_id) && sectionSourceUnit(data.translation_id) !== context.uid) throw Error('The section source belongs to a different Pāli selection. No English was displayed.');
  }
  if (!data || !nonempty(data.text) || !nonempty(data.translation_id) || !nonempty(data.translator) || !nonempty(data.attribution) || !(nonempty(data.license) || (data.license && typeof data.license === 'object' && nonempty(data.license.name))) || data.offset !== offset) throw new Error('The English source response is incomplete. No translation was displayed.');
  const choice = context.choices.find(c => c.translation_id === data.translation_id);
  if (!choice) throw new Error('The returned English source version was not in the reviewed list. Reload the passage and review sources again.');
  validateApadanaChoice(choice, context.uid);
  if (isApadana(choice) || isApadana(data) || apadanaFamily(args.translation)) {
    validateApadanaChoice(data, context.uid, true);
    if (!isApadana(choice) || !isApadana(data) || args.translation !== choice.translation_id
      || args.translation_revision !== APADANA_COMMIT || data.source !== 'apadana'
      || ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'].some(key => data[key] !== APADANA_PROFILES[context.uid][key])
      || data.fetched_url !== APADANA_PROFILES[context.uid].raw_url || data.license_url !== APADANA_LICENSE_URL
      || !nonempty(data.changes) || data.changes.length > 2000
      || typeof data.publisher_paratext !== 'string' || data.publisher_paratext.length > 50000
      || Boolean(data.publisher_paratext.trim()) !== (context.uid === 'thi-ap1')
      || !Array.isArray(data.translator_notes) || data.translator_notes.length !== APADANA_PROFILES[context.uid].note_count
      || (offset > 0 && (!sha(args.prefix_sha256) || data.prefix_sha256 !== args.prefix_sha256))) {
      throw Error('The pinned Apadāna source response does not match its reviewed identity. No English was displayed.');
    }
  }
  if(medicineFamily(choice.translation_id) || choice.translation_scope?.extractor===MEDICINE_EXTRACTOR)scopeDescriptor(choice,context.uid);
  if (sectionSourceUnit(data.translation_id) && (!own(choice, 'source_section') || !sameScope(data.source_section, choice.source_section) || data.source_section?.unit_id !== context.uid || !anTenSourceUnit(data.translation_id) && data.source_section?.anchor !== data.translation_id.split('#')[1] || data.source_section?.status !== 'reviewed')) throw new Error(milindaSourceUnit(data.translation_id) ? 'The reviewed question identity changed. Reload the passage and review sources again; no English was displayed.' : 'The reviewed discourse identity changed. Reload the passage and review sources again; no English was displayed.');
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
  if (isApadana(choice) ? next.translation_revision !== APADANA_COMMIT : own(next, 'translation_revision')) throw Error('The next page changed or dropped the pinned translation revision.');
  if (context.accepted) {
    const shared = context.accepted.kind === 'shared_page';
    if (next.scope_sha256 !== context.accepted.scope.scope_sha256 || next[shared ? 'allow_shared' : 'allow_partial'] !== true || next[shared ? 'allow_partial' : 'allow_shared'] === true) throw new Error('The next page dropped or changed its scope consent. Review the source again.');
  } else if (next.allow_shared === true || next.allow_partial === true || own(next, 'scope_sha256')) throw new Error('The next page unexpectedly changes source scope. Review it separately.');
  return JSON.parse(JSON.stringify(next));
}
