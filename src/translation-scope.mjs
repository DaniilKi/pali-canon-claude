// A declaration is reviewed data, not an automatic alignment or rights approval.
import { createHash } from 'node:crypto';
export const scopeHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const isPartial = link => Object.hasOwn(link, 'partial_scope');
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

export function partialScope(link, unit, segments, source) {
  if (!isPartial(link)) return null;
  const p = link.partial_scope;
  const fail = () => { throw new Error('Invalid or unreviewed partial translation scope. No whole-unit coverage or source retrieval is inferred.'); };
  const fields = new Set(['version', 'status', 'unit_id', 'first_ref', 'last_ref', 'source_commit', 'pali_sha256', 'text_sha256', 'notice_sha256', 'extractor']);
  if (!p || p.version !== 1 || Object.keys(p).some(k => !fields.has(k)) || p.status !== 'reviewed' || p.unit_id !== unit.id || p.source_commit !== source.commit
    || !sha(p.pali_sha256) || !sha(p.text_sha256) || unit.approximate) fail();
  const first = segments.findIndex(s => s.ref === p.first_ref);
  const last = segments.findIndex(s => s.ref === p.last_ref);
  if (first < 0 || last < first || (first === 0 && last === segments.length - 1)) fail();
  if (!segments.slice(first, last + 1).some(s => s.type !== 'heading') || !segments.some((s, i) => s.type !== 'heading' && (i < first || i > last))) fail();
  const selected = segments.slice(first, last + 1).map(({ ref, type, text }) => ({ ref, type, text }));
  if (scopeHash(selected) !== p.pali_sha256) fail();
  if (!['dhammatalks', 'ati', 'anandajoti'].includes(link.source)) fail();
  if (link.source === 'ati') {
    if (p.extractor !== 'ati-freeverse-v1' || !sha(p.notice_sha256) || typeof link.path !== 'string'
      || !/^\/tipitaka\/[a-z0-9_/.-]+$/.test(link.path) || link.path.includes('..')
      || link.url !== 'https://accesstoinsight.org' + link.path + '.html') fail();
  } else if (Object.hasOwn(p, 'extractor') || Object.hasOwn(p, 'notice_sha256')) fail();

  if (link.parts && (link.source !== 'anandajoti' || !Array.isArray(link.parts) || !link.parts.length || link.parts.length > 32)) fail();
  const readPages = [];
  for (let offset = first; offset <= last; offset += 200) readPages.push({ tool: 'get_text', uid: unit.id, offset, limit: Math.min(200, last - offset + 1) });
  return { kind: 'partial_unit', version: 1, unit_id: unit.id, first_ref: p.first_ref, last_ref: p.last_ref,
    source_commit: p.source_commit, pali_sha256: p.pali_sha256, text_sha256: p.text_sha256,
    ...(link.source === 'ati' ? {extractor:p.extractor,notice_sha256:p.notice_sha256} : {}),
    scope_sha256: scopeHash({ mapping: p, source: link.source, url: link.url, path: link.path, parts: link.parts || null, translator: link.translator }), whole_unit_coverage: false,
    pali_segments: last - first + 1, read_with: readPages[0],
    ...(readPages.length > 1 ? { read_pages: readPages } : {}),
    note: 'Only this declared contiguous Pāli span has a linked translation. This is not a whole-unit translation or word-level alignment. Stop the Pāli reading at last_ref. Use read_pages when present; generic get_text continuation can leave this span.' };
}

export const isShared = link => Object.hasOwn(link, 'shared_scope');
export const isScoped = link => isPartial(link) || isShared(link);

/** One curated source page, owned once; member IDs describe its subject range, not individual alignment. */
export function sharedScope(link, unit, byId, readSegments, source) {
  if (!isShared(link)) return null;
  const p = link.shared_scope;
  let url;
  try { url = new URL(link.url); } catch { throw new Error('Invalid shared-page source URL.'); }
  const sourceUrl = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && !url.port
    && (link.source === 'dhammatalks' ? ['www.dhammatalks.org', 'dhammatalks.org'].includes(url.hostname) && /^\/suttas\/.+\.html$/.test(url.pathname)
      : link.source === 'ati' ? typeof link.path === 'string' && link.url === `https://accesstoinsight.org${link.path}.html`
        : link.source === 'anandajoti' && typeof link.path === 'string' && link.url === 'https://ancient-buddhist-texts.net' + encodeURI(link.path));
  const fail = () => { throw new Error('Invalid or unreviewed shared-page translation scope. No individual alignment or whole-unit coverage is inferred.'); };
  const fields = new Set(['version', 'status', 'owner_id', 'text_ids', 'presentation', 'alignment', 'source_commit', 'pali_sha256', 'text_sha256', 'notice_sha256']);
  if (!sourceUrl || isPartial(link) || !p || p.version !== 1 || p.status !== 'reviewed' || Object.keys(p).some(k => !fields.has(k))
    || !['condensed', 'compilation'].includes(p.presentation) || p.alignment !== 'unverified' || p.source_commit !== source.commit
    || !sha(p.pali_sha256) || !sha(p.text_sha256) || (p.notice_sha256 !== undefined && (!sha(p.notice_sha256) || link.source !== 'ati')) || ((p.presentation === 'compilation' || link.source === 'ati') && !sha(p.notice_sha256)) || !Array.isArray(p.text_ids) || p.text_ids.length < 2 || p.text_ids.length > 32
    || new Set(p.text_ids).size !== p.text_ids.length || p.owner_id !== p.text_ids[0] || !p.text_ids.includes(unit.id)
    || typeof link.reference !== 'string' || !link.reference.trim() || link.reference.length > 200) fail();
  const units = p.text_ids.map(id => byId.get(id));
  if (units.some((u, i) => !u || u.approximate || u.kind === 'range' || u.members?.length
    || u.book !== units[0].book || u.collection !== units[0].collection || (i && units[i - 1].end !== u.start))) fail();
  const selected = units.map(u => ({ id: u.id, segments: readSegments(u).map(({ ref, type, text }) => ({ ref, type, text })) }));
  if (selected.some(u => !u.segments.some(s => s.type !== 'heading')) || selected.reduce((n, u) => n + u.segments.length, 0) > 20000
    || selected.reduce((n, u) => n + u.segments.reduce((v, s) => v + s.text.length, 0), 0) > 2000000 || scopeHash(selected) !== p.pali_sha256) fail();
  if (!['dhammatalks', 'ati', 'anandajoti'].includes(link.source)
    || (link.parts && (link.source !== 'anandajoti' || !Array.isArray(link.parts) || !link.parts.length || link.parts.length > 32))) fail();
  return { kind: 'shared_page', version: 1, owner_id: p.owner_id, text_ids: [...p.text_ids], source_reference: link.reference,
    source_commit: p.source_commit, pali_sha256: p.pali_sha256, text_sha256: p.text_sha256,
    scope_sha256: scopeHash({ mapping: p, source: link.source, url: link.url, path: link.path, parts: link.parts || null, translator: link.translator, reference: link.reference }),
    ...(p.notice_sha256 ? { notice_sha256: p.notice_sha256 } : {}),
    presentation: p.presentation, condensed: p.presentation === 'condensed', individual_alignment_verified: false, whole_unit_coverage: false,
    pali_readings: units.map(u => ({ tool: 'get_text', uid: u.id, offset: 0, limit: 200 })),
    note: 'This is one ' + (p.presentation === 'compilation' ? 'compiled' : 'condensed') + ' source page concerning all listed texts, not separate verified full-unit translations. Individual wording, omissions and cross-referenced verses have no verified per-discourse alignment in this API. A page-level quotation match or absence does not establish a match or absence in an individual text. Do not expand the publisher’s abbreviations.' };
}
