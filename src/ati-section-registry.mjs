/** Mandatory exact question bindings: removing a selector never creates a whole-page source. */
import { createHash } from 'node:crypto';
import { ATI_SECTION_PROFILE, ATI_SECTION_COMMIT, ATI_SECTION_LICENSE, ATI_SECTION_PROFILES, isAtiSectionPath } from './ati-section-profiles.mjs';
export const sectionHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stable = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(stable(v))) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(stable(value[k]))])) : value);
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 10000;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const fail = () => { throw Error('Registered ATI question sections lost or changed their reviewed source, selector or root. No whole-page translation or coverage was inferred.'); };

export function reviewedSectionLink(row, registry) {
  return { source: 'ati', path: row.path, url: `https://accesstoinsight.org${row.path}.html#${row.anchor}`,
    english: row.english_title, translator: row.translator, license: row.license,
    reference: row.source_reference, match: 'reviewed-ati-section', mapping_note: row.mapping_note,
    review: { ati_commit: registry.ati_commit, vri_commit: registry.vri_commit, source_html_sha256: row.source_html_sha256 }, section: JSON.parse(JSON.stringify(row.section)) };
}

export function validateSectionRegistry(registry, corpus, translations, readSegments) {
  if (!exactKeys(registry, ['version', 'ati_commit', 'vri_commit', 'links']) || registry.version !== 1 || registry.ati_commit !== ATI_SECTION_COMMIT || registry.vri_commit !== corpus.source.commit || !Array.isArray(registry.links) || registry.links.length !== ATI_SECTION_PROFILES.length || typeof readSegments !== 'function') fail();
  const units = new Map(corpus.units.map(unit => [unit.id, unit])), seen = new Set();
  for (const row of registry.links) {
    if (!exactKeys(row, ['unit_id', 'path', 'anchor', 'english_title', 'source_reference', 'translator', 'license', 'mapping_note', 'root', 'source_html_sha256', 'untranslated_paratext', 'section'])) fail();
    const profile = ATI_SECTION_PROFILES.find(value => value.unit_id === row.unit_id), p = row.section, root = row.root, unit = units.get(row.unit_id);
    if (!profile || seen.has(row.unit_id) || row.path !== profile.path || row.anchor !== profile.anchor || row.source_html_sha256 !== profile.source_html_sha256 || row.translator !== 'John Kelly' || row.license !== ATI_SECTION_LICENSE || !text(row.english_title) || !text(row.source_reference) || !text(row.mapping_note) || !unit || unit.collection !== 'mil' || unit.approximate || unit.kind || unit.members) fail();
    seen.add(row.unit_id);
    if (!exactKeys(root, ['id', 'book', 'start', 'end', 'title', 'vri', 'root_blocks_sha256']) || ['id', 'book', 'start', 'end', 'title', 'vri'].some(key => root[key] !== unit[key]) || !sha(root.root_blocks_sha256) || sectionHash(corpus.books[unit.book].blocks.slice(unit.start, unit.end)) !== root.root_blocks_sha256) fail();
    if (!exactKeys(p, ['version', 'status', 'unit_id', 'profile', 'anchor', 'heading', 'paragraph_count', 'note_count', 'section_html_sha256', 'text_sha256', 'notes_sha256', 'notice_sha256', 'pali_sha256', 'first_ref', 'last_ref', 'source_commit']) || p.version !== 1 || p.status !== 'reviewed' || p.unit_id !== unit.id || p.profile !== ATI_SECTION_PROFILE || p.anchor !== row.anchor || p.heading !== row.source_reference || p.paragraph_count !== profile.paragraphs || p.note_count !== profile.notes || p.source_commit !== registry.vri_commit || ['section_html_sha256', 'text_sha256', 'notes_sha256', 'notice_sha256', 'pali_sha256'].some(key => !sha(p[key]))) fail();
    const segments = readSegments(unit).map(({ ref, type, text }) => ({ ref, type, text })), first = segments.findIndex(segment => segment.ref === p.first_ref), last = segments.findIndex(segment => segment.ref === p.last_ref);
    if (first !== 1 || last < first || segments[0].type !== 'heading' || segments.slice(first, last + 1).some(segment => segment.type !== 'prose') || sectionHash(segments.slice(first, last + 1)) !== p.pali_sha256 || !Array.isArray(row.untranslated_paratext) || !row.untranslated_paratext.length || stable(segments.slice(last + 1).map(({ ref, text }) => ({ ref, text }))) !== stable(row.untranslated_paratext)) fail();
  }
  // Validate all source labels and URL spellings, then require every approved binding exactly once.
  for (const [owner, links] of Object.entries(translations)) for (const link of links) assertRegisteredSection(link, units.get(owner), registry);
  for (const row of registry.links) {
    const expected = stable(reviewedSectionLink(row, registry));
    if ((translations[row.unit_id] || []).filter(link => stable(link) === expected).length !== 1) fail();
  }
  return registry;
}

export function assertRegisteredSection(link, unit, registry) {
  let path;
  try { const url = new URL(link.url); if (url.hostname.replace(/^www\./, '') === 'accesstoinsight.org') path = url.pathname.replace(/\.html?$/, ''); } catch { /* The other source contracts validate their URLs. */ }
  if (!Object.hasOwn(link, 'section') && !isAtiSectionPath(link.path) && !isAtiSectionPath(path)) return;
  if (!registry || !Array.isArray(registry.links)) fail();
  const row = registry.links.find(value => value.unit_id === unit?.id && value.path === link.path && value.anchor === link.section?.anchor);
  if (!row || stable(link) !== stable(reviewedSectionLink(row, registry))) fail();
}
