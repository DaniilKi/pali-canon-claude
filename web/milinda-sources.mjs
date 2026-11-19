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
const sourceProfile = id => units.get(id) || discourses.get(id) || numbered.get(id);
export const milindaSourceUnit = id => units.get(id)?.unit;
export const numberedSourceUnit = id => numbered.get(id)?.unit;
export const sectionSourceUnit = id => sourceProfile(id)?.unit;
export function validateSectionIdentity(value) {
  const id = value.translation_id; if (typeof id !== 'string') return;
  let decoded = id; try { decoded = decodeURIComponent(id); } catch { /* Invalid aliases remain literal. */ }
  const resource = decoded.split(/[?#]/, 1)[0].replace(/\.html?$/i, '').toLowerCase();
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
  if ((isSectionPageId(resource) || /^ati:/i.test(decoded) && decoded.includes('#')) && !sourceProfile(id)) throw Error('The source section requires its exact reviewed fragment identity. No English source was displayed.');
}
export function validateSectionDescriptor(value) {
  validateSectionIdentity(value);
  const profile = sourceProfile(value.translation_id); if (!profile) return;
  const section = value.source_section;
  if (!section || section.version !== 1 || section.status !== 'reviewed' || section.unit_id !== profile.unit || section.anchor !== value.translation_id.split('#')[1] || section.note_count !== profile.notes || profile.profile !== undefined && section.profile !== profile.profile || profile.heading !== undefined && section.heading !== profile.heading || profile.paragraphs !== undefined && section.paragraph_count !== profile.paragraphs) throw Error('The reviewed source-section descriptor or translator-note count is invalid. No English source was displayed.');
}
export function validateMilindaDescriptor(value) {
  if (milindaSourceUnit(value.translation_id)) validateSectionDescriptor(value);
}
export const isMilindaPageId = id => /^ati:\/tipitaka\/kn\/miln\/miln\.[23]x\.kell$/.test(id);
export const isSectionPageId = id => isMilindaPageId(id) || id === 'ati:/tipitaka/sn/sn27/sn27.001-010.than' || id === numberedPage;

/** Preserve owned note numbers and exact plain text separately from the question. */
export function translatorNotes(data) {
  validateSectionDescriptor(data);
  if (!Object.hasOwn(data, 'translator_notes')) {
    if (sectionSourceUnit(data.translation_id)) throw Error('The selected source section is missing its translator-note declaration.');
    return [];
  }
  const notes = data.translator_notes;
  if (!Array.isArray(notes) || notes.length > 32 || notes.some((note, i) => !note || typeof note !== 'object' || Array.isArray(note) || Object.keys(note).sort().join(',') !== 'number,text' || note.number !== i + 1 || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 50000)) throw Error('The translator-note declaration is invalid. No English source was displayed.');
  const profile = sourceProfile(data.translation_id);
  if (profile && notes.length !== profile.notes) throw Error('The reviewed source-section translator-note count changed. No English source was displayed.');
  return notes.map(note => ({number: note.number, text: note.text}));
}
