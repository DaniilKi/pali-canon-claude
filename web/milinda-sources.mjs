import { APADANA_PROFILES } from '../src/apadana-profiles.mjs';

/** Only exact pinned poem IDs can use their finite, possibly sparse note sequence. */
const apadanaProfiles = new Map(Object.values(APADANA_PROFILES).map(profile => [
  'ap:' + profile.path.replace(/^\/text\/|\/$/g, ''), profile,
]));

/** Finite reviewed publisher section identities; no source bodies or rights approval. */
const units = new Map([
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-1-08', {unit: 'mil3.1.8', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-1-14', {unit: 'mil3.1.15', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-08', {unit: 'mil3.3.8', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-9', {unit: 'mil3.3.9', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-10', {unit: 'mil3.3.10', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-11', {unit: 'mil3.3.11', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-12', {unit: 'mil3.3.12', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-13', {unit: 'mil3.3.13', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.2x.kell#miln-2-3-14', {unit: 'mil3.3.14', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.3x.kell#miln-3-5-05', {unit: 'mil3.5.5', notes: 2}],
  ['ati:/tipitaka/kn/miln/miln.3x.kell#miln-3-5-06', {unit: 'mil3.5.6', notes: 1}],
  ['ati:/tipitaka/kn/miln/miln.3x.kell#miln-3-5-07', {unit: 'mil3.5.7', notes: 0}],
  ['ati:/tipitaka/kn/miln/miln.3x.kell#miln-3-7-05', {unit: 'mil3.7.5', notes: 1}],
  ['ati:/tipitaka/kn/miln/miln.3x.kell#miln-3-7-08', {unit: 'mil3.7.8', notes: 0}],
]);
const discourses = new Map([
  ['ati:/tipitaka/sn/sn27/sn27.001-010.than#sn27.005', {unit: 'sn27.5', notes: 0, profile: 'ati-sn27-feelings-v1'}],
]);
const numberedPage = 'ati:/tipitaka/an/an01/an01.021-040.than';
const legacyNumberedPins = {
  source_commit: '2d134ff9ef60f70a1eb03c9370580228811a3070',
  pali_sha256: '7c78c04fa2d6b1bf493043ad460002aa08cd83186e679229ab75850cd972f9cf',
  text_sha256: '4ea2069bc8a4bdaf2021f5f9729af8c06362053595841c77cf59b75e395d8145',
  notice_sha256: '4153685976f9d98f9a61ca223a5f71d2ce2c9281fd0b0c043859d133c45a1238',
  scope_sha256: '97589116d588b361438b6ea5db4d27ca2b45d8a77199be466cd6722b7c987ea6',
};
const numbered = new Map(Array.from({length: 20}, (_, i) => {
  const n = i + 21;
  return [numberedPage + '#sutta-' + n, {unit: 'an1.' + n, notes: 0, paragraphs: 1, profile: 'ati-an1-ekadhamma-numbered-paragraph-v1', heading: n + '.'}];
}));
export const AN_TEN_PROFILE = 'ati-an-ten-paragraph-selection-v1';
const anTen = new Map([
  ['ati:/tipitaka/an/an01/an01.045-046.than::selection:an1.45', {unit: 'an1.45', paragraphs: 1, notes: 0, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an01/an01.045-046.than::selection:an1.46', {unit: 'an1.46', paragraphs: 1, notes: 0, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an01/an01.049.than::selection:an1.49', {unit: 'an1.49', paragraphs: 1, notes: 1, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an01/an01.049.than::selection:an1.50', {unit: 'an1.50', paragraphs: 1, notes: 0, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an01/an01.049.than::selection:an1.51', {unit: 'an1.51', paragraphs: 1, notes: 0, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an01/an01.049.than::selection:an1.52', {unit: 'an1.52', paragraphs: 1, notes: 0, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an02/an02.031.than::selection:an2.32', {unit: 'an2.32', paragraphs: 3, notes: 0, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an02/an02.031.than::selection:an2.33', {unit: 'an2.33', paragraphs: 1, notes: 0, anchor: 's32', heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an02/an02.125-126.than::selection:an2.125', {unit: 'an2.125', paragraphs: 1, notes: 1, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
  ['ati:/tipitaka/an/an02/an02.125-126.than::selection:an2.126', {unit: 'an2.126', paragraphs: 1, notes: 0, anchor: null, heading: null, profile: AN_TEN_PROFILE}],
]);
// Immutable pre-existing shared pages remain independent scoped choices.
const legacyAnTen = new Map([
  ['ati:/tipitaka/an/an01/an01.049.than', {"owner_id":"an1.49","text_ids":["an1.49","an1.50","an1.51","an1.52"],"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","pali_sha256":"5c98023f2f97b51c5ea9ef76b4a031ac9725ec8cecee8fbacc0f2c0ecf3f77a0","text_sha256":"35182e6e8d3990b8cb6ace20602277a5d409fd45c5a44b9e277ec25995084c60","notice_sha256":"3b8f3fab868dd8176bb2cce37b9e9437bdca790a6a415a0f67ee589ce099b1fe","scope_sha256":"bf2fca5a6b857f8cf313ef9f01e7e4d937088d9eb52ba3fb8890d214728f7881"}],
  ['ati:/tipitaka/an/an01/an01.045-046.than', {"owner_id":"an1.45","text_ids":["an1.45","an1.46"],"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","pali_sha256":"3842fa2b62de5f546e83337c603df9bfa49cda6be1092221b102b7ea20cf4005","text_sha256":"7297c6cf82b7abe3f94ad8e6fdc5e8fc1c03a6b3c896a2a1bcf5fa895bef69fd","notice_sha256":"c6f4d4898e1844091dabb21aa338b492be115913f2af077c2bd57708890a8bfb","scope_sha256":"0cf6a057f1c0ded3c569a2e71beece92f0597c1d345c0fdb44df7d5856bd09fe"}],
  ['ati:/tipitaka/an/an02/an02.031.than', {"owner_id":"an2.32","text_ids":["an2.32","an2.33"],"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","pali_sha256":"3f85a870476455991af56f4308b4fc92f73d0931c8cd17e18a171c374abfef96","text_sha256":"68448c5eba804b236080fbb41641328da982639a295de44058e070ae99bd7495","notice_sha256":"693ec730c062294a3570512540f883b863bb57f47765b3782199a9a404977d60","scope_sha256":"8c2314215302c25b00437281a3af46dc4db66599fc1591aebf7e01c9fd80a5de"}],
  ['ati:/tipitaka/an/an02/an02.125-126.than', {"owner_id":"an2.125","text_ids":["an2.125","an2.126"],"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","pali_sha256":"01f88254cf733cc057f51d936a8203e51e447a5c711bfac3c7209ac269f44318","text_sha256":"a5d4d3d63f2166947cbcb1ccaa12883f6fbd90ef4445c73ff1c4441064eff8ec","notice_sha256":"d96963652b5b6f051df62ac6a54047af61d5f715b1dd3bcfdab4e62bc0b04de7","scope_sha256":"af5aba23c950eb6804eb68fd23224ce8eca392a216f5aa5e02b399656a48fa87"}],
]);
const sourceProfile = id => units.get(id) || discourses.get(id) || numbered.get(id) || anTen.get(id);
export const milindaSourceUnit = id => units.get(id)?.unit;
export const numberedSourceUnit = id => numbered.get(id)?.unit;
export const anTenSourceUnit = id => anTen.get(id)?.unit;
export const sectionSourceUnit = id => sourceProfile(id)?.unit;
export function validateSectionIdentity(value) {
  const id = value?.translation_id; if (typeof id !== 'string') return;
  let decoded = id;
  for (let i = 0; i < 4; i++) { try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } catch { break; } }
  if (/^ati:/i.test(id.trim()) && id.includes('%')) throw Error('The source section requires its exact reviewed fragment identity or paragraph-selection identity; encoded aliases are unsupported. No English source was displayed.');
  const resource = decoded.trim().split(/::|[?#]/, 1)[0].replace(/\.html?$/i, '').toLowerCase();
  // The immutable, pre-existing shared compilation remains a separate choice.
  // This identity exception grants no consent, ownership or page-level alignment;
  // scopeDescriptor and validateEnglishPage enforce those independently.
  const scope = value.translation_scope;
  if (id === numberedPage && !Object.hasOwn(value, 'source_section')
    && (!Object.hasOwn(value, 'whole_unit_coverage') || value.whole_unit_coverage === false)
    && scope?.kind === 'shared_page' && scope.whole_unit_coverage === false
    && scope.owner_id === 'an1.21' && scope.presentation === 'compilation'
    && Array.isArray(scope.text_ids) && scope.text_ids.length === 20
    && scope.text_ids.every((unit, i) => unit === 'an1.' + (i + 21))
    && Object.entries(legacyNumberedPins).every(([key, pin]) => scope[key] === pin)) return;
  const legacy = legacyAnTen.get(id);
  if (legacy && !Object.hasOwn(value, 'source_section')
    && (!Object.hasOwn(value, 'whole_unit_coverage') || value.whole_unit_coverage === false)
    && scope?.kind === 'shared_page' && scope.version === 1 && scope.whole_unit_coverage === false
    && scope.presentation === 'compilation' && scope.condensed === false && scope.individual_alignment_verified === false
    && Object.entries(legacy).every(([key, pin]) => Array.isArray(pin) ? Array.isArray(scope[key]) && scope[key].length === pin.length && scope[key].every((unit, i) => unit === pin[i]) : scope[key] === pin)) return;
  if ((isSectionPageId(resource) || decoded.includes('::') || /^ati:/i.test(decoded.trim()) && decoded.includes('#')) && !sourceProfile(id)) throw Error('The source section requires its exact reviewed fragment identity. No English source was displayed.');
}
export function validateSectionDescriptor(value) {
  validateSectionIdentity(value);
  const profile = sourceProfile(value.translation_id); if (!profile) return;
  const section = value.source_section;
  if (anTen.has(value.translation_id)) {
    const keys = 'anchor,first_ref,heading,last_ref,note_count,notes_sha256,notice_sha256,pali_sha256,paragraph_count,profile,section_html_sha256,selection_id,source_commit,status,text_sha256,unit_id,version';
    const first = profile.unit === 'an1.51' || profile.unit === 'an2.32' ? 2 : 1;
    const last = profile.unit === 'an2.32' ? 3 : first;
    const hashes = ['section_html_sha256', 'text_sha256', 'notes_sha256', 'notice_sha256', 'pali_sha256'];
    if (!section || Object.keys(section).sort().join(',') !== keys || section.version !== 1 || section.status !== 'reviewed' || section.profile !== AN_TEN_PROFILE || section.unit_id !== profile.unit || section.selection_id !== profile.unit || section.anchor !== profile.anchor || section.heading !== null || section.paragraph_count !== profile.paragraphs || section.note_count !== profile.notes || section.source_commit !== legacyAnTen.get(value.translation_id.split('::')[0]).source_commit || !hashes.every(key => typeof section[key] === 'string' && /^[a-f0-9]{64}$/.test(section[key])) || section.first_ref !== profile.unit + '/' + first || section.last_ref !== profile.unit + '/' + last) throw Error('The reviewed paragraph-selection descriptor or translator-note count is invalid. No English source was displayed.');
    return;
  }
  if (!section || section.version !== 1 || section.status !== 'reviewed' || section.unit_id !== profile.unit || section.anchor !== value.translation_id.split('#')[1] || section.note_count !== profile.notes || profile.profile !== undefined && section.profile !== profile.profile || profile.heading !== undefined && section.heading !== profile.heading || profile.paragraphs !== undefined && section.paragraph_count !== profile.paragraphs) throw Error('The reviewed source-section descriptor or translator-note count is invalid. No English source was displayed.');
}
export function validateMilindaDescriptor(value) {
  if (milindaSourceUnit(value.translation_id)) validateSectionDescriptor(value);
}
export const isMilindaPageId = id => /^ati:\/tipitaka\/kn\/miln\/miln\.[23]x\.kell$/.test(id);
export const isSectionPageId = id => isMilindaPageId(id) || id === 'ati:/tipitaka/sn/sn27/sn27.001-010.than' || id === numberedPage || legacyAnTen.has(id);

/** Preserve owned note numbers and exact plain text separately from the question. */
export function translatorNotes(data) {
  validateSectionDescriptor(data);
  const apadana = apadanaProfiles.get(data.translation_id);
  if (!Object.hasOwn(data, 'translator_notes')) {
    if (sectionSourceUnit(data.translation_id) || apadana) throw Error('The selected source section is missing its translator-note declaration.');
    return [];
  }
  const notes = data.translator_notes;
  if (!Array.isArray(notes) || (apadana ? notes.length !== apadana.note_count : notes.length > 32) || notes.some((note, i) => !note || typeof note !== 'object' || Array.isArray(note) || Object.keys(note).sort().join(',') !== 'number,text' || note.number !== (apadana?.note_numbers?.[i] ?? i + 1) || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 50000)) throw Error(apadana ? 'The pinned Apadāna translator-note declaration is invalid. No English source was displayed.' : 'The translator-note declaration is invalid. No English source was displayed.');
  const profile = sourceProfile(data.translation_id);
  if (profile && notes.length !== profile.notes) throw Error('The reviewed source-section translator-note count changed. No English source was displayed.');
  return notes.map(note => ({number: note.number, text: note.text}));
}
