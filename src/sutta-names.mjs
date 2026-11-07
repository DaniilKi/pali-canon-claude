/**
 * Sutta names in resolve_reference (issue #102): "Satipatthana Sutta", "Metta sutta", "Dhammacakkappavattana",
 * "Mindfulness of Breathing", and collection words with spaced numbers ("samyutta 56 11").
 *
 * The name index is built from the bundled canon titles (Pāli, folded, with or without "sutta"/"suttaṃ"), the English
 * titles of the bundled translation links (translations.json, anandajoti.json) and DPD's sutta names
 * (glossary.json.gz `names`: dpd_sutta and dpd_sutta_var, mapped to canon IDs through VRI's file and paragraph; no
 * SuttaCentral column is kept). Rules (D61):
 *  - a name with digits is never looked up here, so SN and AN texts are never reached by a number taken from a name;
 *  - one text with that name resolves, labelled matched_by: 'name';
 *  - several texts → an error that lists every candidate with its citation. The one exception: when exactly one
 *    candidate is in the Dīgha or Majjhima Nikāya and every other is in the Saṃyutta or Aṅguttara (where texts are
 *    cited by number), the DN/MN text is returned with the others listed under also_named and a note saying so.
 */
import * as canon from './canon.mjs';
import { CitationError, _test as citationsTest } from './citations.mjs';
import { normalizeInput, fuzzyKey, normalizationNote } from './input.mjs';
import { loadGlossary } from './glossary-data.mjs';
import { translationTitle } from './translation-titles.mjs';

const fold = canon.fold;
const SUTTA_END = /(suttantam|suttanta|suttam|suttani|suttena|suttassa|sutte|suttam|sutta|suttas|suttanta)$/;

/** Letters-only folded key without a leading number or a final "sutta"/"suttaṃ"/"suttanta" (and its inflections). */
export function nameKey(text) {
  const letters = fold(String(text ?? '')).replace(/^\s*\d+[.)]?\s*/, '').replace(/[^a-z]/g, '');
  return { key: letters.replace(SUTTA_END, ''), sutta: SUTTA_END.test(letters) && letters.replace(SUTTA_END, '').length > 0, letters };
}

let index = null;

function buildIndex() {
  const d = canon.load();
  const exact = new Map();
  const fuzzy = new Map();
  const add = (unit, raw, via, english = false) => {
    const { key, sutta, letters } = nameKey(raw);
    if (key.length < 3) return;
    for (const k of new Set([key, letters])) {
      const entry = { unit, name: raw, via, sutta, english };
      (exact.get(k) || exact.set(k, []).get(k)).push(entry);
      const fk = fuzzyKey(k);
      (fuzzy.get(fk) || fuzzy.set(fk, []).get(fk)).push(entry);
    }
  };
  const units = d.canon.units.filter((u) => !u.approximate);
  const rangeOf = canon._test.rangeContaining;
  for (const u of units) {
    if (!u.title) continue;
    // A Dhammapada verse carries its chapter's title: the name belongs to the chapter, not to each verse.
    const container = u.kind === 'range' ? null : rangeOf(u.id);
    if (container && fold(container.title) === fold(u.title)) continue;
    add(u, u.title, 'Pāli title (VRI)');
  }
  for (const [id, links] of Object.entries(d.translations)) {
    const u = d.byId.get(id);
    if (!u) continue;
    for (const t of links) {
      const english = translationTitle(t);
      if (english && !/\d/.test(english)) {
        const via = `English title (${canon.sourceName(t)}, ${t.translator})`;
        add(u, english, via, true);
        // "The Fire Sermon" is also found as "Fire Sermon".
        const bare = english.replace(/^(the|a|an)\s+/i, '');
        if (bare !== english) add(u, bare, via, true);
      }
      // The Pāli name the translation's page gives ("Adittapariyaya Sutta" for SN 35.28 on Access to Insight).
      if (t.pali_title && !/\d/.test(t.pali_title)) add(u, t.pali_title, `Pāli title (${canon.sourceName(t)})`);
    }
  }
  try {
    for (const [id, variants] of loadGlossary().names) {
      const u = d.byId.get(id);
      if (u) for (const v of variants) add(u, v, 'DPD sutta name');
    }
  } catch { /* glossary data missing: Pāli and English titles still work */ }
  index = { exact, fuzzy };
  return index;
}

const COLLECTION_WORDS = citationsTest.COLLECTIONS;
// Short abbreviations that are also ordinary words or ambiguous are not read with spaced numbers.
const AMBIGUOUS = new Set(['d', 'm', 's', 'a', 'j', 'th', 'thi', 'dh', 'it', 'pt', 'ap', 'pe', 'ne', 'ps', 'pp', 'ds', 'dt', 'cp', 'ya']);

/** "samyutta 56 11" → "samyutta 56.11" when the words name one collection; otherwise null. */
export function spacedNumbers(text) {
  const m = String(text).trim().match(/^([A-Za-zāīūṭḍṇḷñṅṃĀĪŪṬḌṆḶÑṄṂ][A-Za-zāīūṭḍṇḷñṅṃĀĪŪṬḌṆḶÑṄṂ .-]*?)\s+(\d+)\s+(\d+)(?:\s+(\d+))?$/);
  if (!m) return null;
  const key = fold(m[1]).replace(/[\s.-]+/g, '');
  if (!COLLECTION_WORDS[key] || AMBIGUOUS.has(key)) return null;
  return `${m[1]} ${[m[2], m[3], m[4]].filter(Boolean).join('.')}`;
}

const citationOf = (u) => ({ id: u.id, citation: u.acronym, title: u.title || null });

// Name keys deliberately remove separators; never let that also erase unconverted letters.
function assertRomanName(text) {
  if ([...String(text)].some(ch => /\p{L}/u.test(ch) && !/\p{Script=Latin}/u.test(ch))) {
    throw new CitationError('The reference contains unsupported or unconverted characters. Use Roman or completely convert one supported Pāli script before name lookup.');
  }
}

/** Name lookup: { unit, matched, candidates } or throws CitationError. */
export function resolveName(text) {
  assertRomanName(text);
  const { exact, fuzzy } = index || buildIndex();
  const q = nameKey(text);
  if (q.key.length < 3) return null;
  // A single common word ("Anger") reaches a text through an English title only when the query asks for a sutta,
  // chapter or vagga ("Anger chapter"); otherwise it is a topic, not a name (search_texts or topic).
  const words = fold(String(text)).replace(/[^a-z\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const marked = words.some((w) => /^(sutta|suttas|suttanta|sutra|chapter|vagga|vaggo|discourse)$/.test(w));
  const englishOk = marked || words.length > 1;
  const pick = (entries) => {
    let list = (entries || []).filter((e) => englishOk || !e.english);
    // "… sutta" asks for a sutta: other kinds of text with the same stem (Satipaṭṭhānakathā) are left out.
    if (q.sutta) {
      const suttas = list.filter((e) => e.sutta || e.via !== 'Pāli title (VRI)');
      if (suttas.length) list = suttas;
    }
    const byUnit = new Map();
    for (const e of list) if (!byUnit.has(e.unit.id)) byUnit.set(e.unit.id, e);
    return [...byUnit.values()];
  };
  let found = pick(exact.get(q.key));
  let how = 'exact';
  if (!found.length && q.letters !== q.key) found = pick(exact.get(q.letters));
  // "Anger chapter", "Kodha vagga": the name without the word that says what kind of text it is.
  if (!found.length && words.length > 1 && /^(chapter|vagga|vaggo)$/.test(words.at(-1))) found = pick(exact.get(nameKey(words.slice(0, -1).join(' ')).key));
  if (!found.length) { found = pick(fuzzy.get(fuzzyKey(q.key))); how = 'spelling variant'; }
  if (!found.length) return null;
  found.sort((a, b) => a.unit.book - b.unit.book || a.unit.start - b.unit.start);
  if (found.length === 1) return { entry: found[0], how, others: [] };
  const long = found.filter((e) => ['dn', 'mn'].includes(e.unit.collection));
  if (long.length === 1 && found.every((e) => e === long[0] || ['sn', 'an'].includes(e.unit.collection))) {
    return { entry: long[0], how, others: found.filter((e) => e !== long[0]), rule: 'dn-mn' };
  }
  const list = found.map((e) => `${e.unit.acronym} (${e.unit.title || e.name})`).join(', ');
  const err = new CitationError(`"${String(text).trim()}" is the name of ${found.length} texts: ${list}. Name matches are never guessed; resolve one of these citations instead.`);
  err.candidates = found.map((e) => ({ ...citationOf(e.unit), matched_name: e.name, via: e.via }));
  throw err;
}

/**
 * Resolve a reference as canon.resolve does, then (only if that fails) as a collection with spaced numbers or as a
 * text's name. Returns { unit, notes, alternatives, matched_by?, name_match?, input_normalised? }.
 */
export function resolveReference(reference) {
  try {
    return canon.resolve(reference);
  } catch (error) {
    if (!(error instanceof CitationError)) throw error;
    const spaced = spacedNumbers(reference);
    if (spaced) {
      const r = canon.resolve(spaced);
      return { ...r, notes: [`Read "${reference}" as ${spaced}.`, ...r.notes], matched_by: 'collection and numbers' };
    }
    if (/\d/.test(reference) || /^https?:/i.test(reference.trim())) throw error;
    assertRomanName(reference);
    const n = normalizeInput(reference);
    const hit = resolveName(n.text);
    if (!hit) throw new CitationError(`Could not read "${reference.trim()}" as a citation, and no text in the canon has that name (Pāli titles, English translation titles and DPD sutta names were checked). Try search_texts, or a citation such as MN 10.`);
    const r = canon.resolve(hit.entry.unit.id);
    const notes = [`Resolved by name: "${reference.trim()}" matches the ${hit.entry.via} "${hit.entry.name}"${hit.how === 'spelling variant' ? ' as a spelling variant (aspirates, doubled consonants, ny/ñ ignored)' : ''}.`];
    if (hit.rule === 'dn-mn') notes.push(`${hit.others.length} other text${hit.others.length > 1 ? 's' : ''} in the Saṃyutta or Aṅguttara Nikāya ${hit.others.length > 1 ? 'have' : 'has'} this name too (listed under also_named). By convention a sutta name with no number means the Dīgha or Majjhima text; give the citation if you meant another.`);
    return {
      ...r, notes: [...notes, ...r.notes], matched_by: 'name',
      name_match: { query: reference.trim(), matched_name: hit.entry.name, via: hit.entry.via, match: hit.how },
      ...(hit.others.length ? { also_named: hit.others.map((e) => ({ ...citationOf(e.unit), matched_name: e.name })) } : {}),
      ...(n.changed ? { input_normalised: normalizationNote(n) } : {}),
    };
  }
}
