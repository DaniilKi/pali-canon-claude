/** Finite reviewed publisher question identities; no source bodies or rights approval. */
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
export const milindaSourceUnit = id => units.get(id)?.unit;
export function validateMilindaDescriptor(value) {
  const profile = units.get(value.translation_id); if (!profile) return;
  const section = value.source_section;
  if (!section || section.version !== 1 || section.status !== 'reviewed' || section.unit_id !== profile.unit || section.anchor !== value.translation_id.split('#')[1] || section.note_count !== profile.notes) throw Error('The reviewed question descriptor or translator-note count is invalid. No English source was displayed.');
}
export const isMilindaPageId = id => /^ati:\/tipitaka\/kn\/miln\/miln\.[23]x\.kell$/.test(id);

/** Preserve owned note numbers and exact plain text separately from the question. */
export function translatorNotes(data) {
  validateMilindaDescriptor(data);
  if (!Object.hasOwn(data, 'translator_notes')) {
    if (milindaSourceUnit(data.translation_id)) throw Error('The selected question is missing its translator-note declaration.');
    return [];
  }
  const notes = data.translator_notes;
  if (!Array.isArray(notes) || notes.length > 32 || notes.some((note, i) => !note || typeof note !== 'object' || Array.isArray(note) || Object.keys(note).sort().join(',') !== 'number,text' || note.number !== i + 1 || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 50000)) throw Error('The translator-note declaration is invalid. No English source was displayed.');
  const profile = units.get(data.translation_id);
  if (profile && notes.length !== profile.notes) throw Error('The reviewed question translator-note count changed. No English source was displayed.');
  return notes.map(note => ({number: note.number, text: note.text}));
}
