/** Mandatory exact question bindings: removing a selector never creates a whole-page source. */
import { createHash } from 'node:crypto';
import { ATI_SECTION_COMMIT, ATI_SECTION_PROFILES, AN_MIND_SECTION_PROFILE, AN_MIND_SECTION_PATH, AN_MIND_SHARED_LINK_SHA256, AN_TEN_SECTION_PROFILE, ATI_RETAINED_SHARED_BINDINGS, isAtiSectionPath } from './ati-section-profiles.mjs';
export const sectionHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stable = value => JSON.stringify(Array.isArray(value) ? value.map(v => JSON.parse(stable(v))) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k, JSON.parse(stable(value[k]))])) : value);
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 10000;
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const fail = () => { throw Error('Registered ATI question sections lost or changed their reviewed source, selector or root. No whole-page translation or coverage was inferred.'); };

/** Only exact pre-existing page-level versions may coexist with selected bodies. */
export function retainedAtiShared(link, unit) {
  const expected = ATI_RETAINED_SHARED_BINDINGS.find(row => row.owner === unit?.id && row.path === link?.path);
  if (!expected) return false;
  try { return createHash('sha256').update(stable(link)).digest('hex') === expected.sha256; }
  catch { return false; }
}
export function retainedAnMindShared(link, unit) {
  return unit?.id === 'an1.21' && link?.path === AN_MIND_SECTION_PATH && retainedAtiShared(link, unit);
}

export function reviewedSectionLink(row, registry) {
  return { source: 'ati', path: row.path, url: `https://accesstoinsight.org${row.path}.html${row.anchor ? '#' + row.anchor : ''}`,
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
    const selection = profile?.profile === AN_TEN_SECTION_PROFILE;
    if (!profile || seen.has(row.unit_id) || row.path !== profile.path || row.anchor !== profile.anchor || row.source_html_sha256 !== profile.source_html_sha256 || row.translator !== profile.translator || row.license !== profile.license || !text(row.english_title) || !text(row.source_reference) || !text(row.mapping_note) || !unit || unit.collection !== profile.collection || unit.approximate || unit.kind || unit.members) fail();
    seen.add(row.unit_id);
    if (!exactKeys(root, ['id', 'book', 'start', 'end', 'title', 'vri', 'root_blocks_sha256']) || ['id', 'book', 'start', 'end', 'title', 'vri'].some(key => root[key] !== unit[key]) || !sha(root.root_blocks_sha256) || sectionHash(corpus.books[unit.book].blocks.slice(unit.start, unit.end)) !== root.root_blocks_sha256) fail();
    if (!exactKeys(p, ['version', 'status', 'unit_id', 'profile', 'anchor', 'heading', 'paragraph_count', 'note_count', 'section_html_sha256', 'text_sha256', 'notes_sha256', 'notice_sha256', 'pali_sha256', 'first_ref', 'last_ref', 'source_commit', ...(selection ? ['selection_id'] : [])]) || p.version !== 1 || p.status !== 'reviewed' || p.unit_id !== unit.id || p.profile !== profile.profile || p.anchor !== row.anchor || p.heading !== (selection ? null : profile.label || row.source_reference) || p.paragraph_count !== profile.paragraphs || p.note_count !== profile.notes || p.source_commit !== registry.vri_commit || ['section_html_sha256', 'text_sha256', 'notes_sha256', 'notice_sha256', 'pali_sha256'].some(key => !sha(p[key]))) fail();
    const segments = readSegments(unit).map(({ ref, type, text }) => ({ ref, type, text })), first = segments.findIndex(segment => segment.ref === p.first_ref), last = segments.findIndex(segment => segment.ref === p.last_ref);
    if (sectionHash(segments.slice(first, last + 1)) !== p.pali_sha256 || !Array.isArray(row.untranslated_paratext) || !selection && !row.untranslated_paratext.length) fail();
    if (selection) {
      if (p.selection_id !== profile.selection_id || p.selection_id !== unit.id || row.english_title !== profile.parent_title
        || first !== profile.first_ref_number - 1 || last !== profile.last_ref_number - 1 || first < 0 || last < first
        || segments.slice(first,last+1).some(segment => segment.type !== 'prose')) fail();
      const paratext = [...(profile.inline_paratext ? [{ref:segments[first].ref,text:profile.inline_paratext}] : []), ...segments.filter((_,i) => i < first || i > last).map(({ref,text}) => ({ref,text}))];
      if (profile.inline_paratext && !segments[first].text.endsWith(' '+profile.inline_paratext)
        || stable(paratext) !== stable(profile.paratext) || stable(paratext) !== stable(row.untranslated_paratext)) fail();
    } else if (profile.profile === AN_MIND_SECTION_PROFILE) {
      const at = profile.first_ref_number - 1, body = segments[at];
      if (first !== at || last !== at || body?.type !== 'prose' || !body.text.endsWith(' ' + profile.inline_paratext) || segments.length !== profile.first_ref_number + (profile.tail_paratext ? 1 : 0)) fail();
      if (profile.root_heading && (segments[0]?.type !== 'heading' || segments[0].text !== profile.root_heading)) fail();
      if (profile.tail_paratext && segments.at(-1).text !== profile.tail_paratext) fail();
      const paratext = [{ref: body.ref, text: profile.inline_paratext}, ...segments.filter((_,i) => i !== at).map(({ref,text}) => ({ref,text}))];
      if (stable(paratext) !== stable(row.untranslated_paratext)) fail();
    } else if (first !== 1 || last < first || segments[0].type !== 'heading' || segments.slice(first, last + 1).some(segment => segment.type !== 'prose')) fail();
    else if (profile.inline_paratext) {
      // Only the reviewed SN27.5 suffix. Preserve the entire original segment;
      // this declaration does not remove/reconstruct its peyyāla or wording.
      if (segments.length !== 2 || first !== 1 || last !== 1 || !segments[1].text.endsWith(' ' + profile.inline_paratext) || stable(row.untranslated_paratext) !== stable([{ref: segments[1].ref, text: profile.inline_paratext}])) fail();
    } else if (stable(segments.slice(last + 1).map(({ ref, text }) => ({ ref, text }))) !== stable(row.untranslated_paratext)) fail();
  }
  // Validate all source labels and URL spellings, then require every approved binding exactly once.
  for (const [owner, links] of Object.entries(translations)) for (const link of links) assertRegisteredSection(link, units.get(owner), registry);
  for (const binding of ATI_RETAINED_SHARED_BINDINGS) if ((translations[binding.owner] || []).filter(link => link.path === binding.path && retainedAtiShared(link, units.get(binding.owner))).length !== 1) fail();
  for (const row of registry.links) {
    const expected = stable(reviewedSectionLink(row, registry));
    if ((translations[row.unit_id] || []).filter(link => stable(link) === expected).length !== 1) fail();
  }
  return registry;
}

export function assertRegisteredSection(link, unit, registry) {
  if (retainedAtiShared(link, unit)) return;
  let path;
  try { const url = new URL(link.url); if (url.hostname.replace(/^www\./, '') === 'accesstoinsight.org') path = url.pathname.replace(/\.html?$/, ''); } catch { /* The other source contracts validate their URLs. */ }
  if (!Object.hasOwn(link, 'section') && !isAtiSectionPath(link.path) && !isAtiSectionPath(path)) return;
  if (!registry || !Array.isArray(registry.links)) fail();
  const row = registry.links.find(value => value.unit_id === unit?.id && value.path === link.path && value.anchor === link.section?.anchor && value.section.selection_id === link.section?.selection_id);
  if (!row) fail();
  let actual;
  try { actual = stable(link); } catch { fail(); }
  if (actual !== stable(reviewedSectionLink(row, registry))) fail();
}
