/**
 * lookup_pali with English-keyboard input (issue #102). The word is normalised first (Velthuis, Harvard-Kyoto,
 * doubled vowels, anglicised spellings, aliases). When it has no diacritics, every DPD headword that folds to the same
 * letters is offered from the bundled DPD subset (nibbana → nibbāna and nibbana), labelled inferred_spelling. The live
 * dpdict.net lookup and its offline fallback are unchanged; when the live site has no entry for the word as typed and
 * exactly one spelling was inferred, that spelling is looked up instead, and the result says so.
 */
import { lookupPali } from './providers.mjs';
import { loadDpd } from './analyse.mjs';
import { normalizeInput, normalizationNote } from './input.mjs';
import * as canon from './canon.mjs';

const DIACRITICS = /[āīūṅñṭḍṇḷṃṁ]/i;

/** DPD headwords whose lemma folds to the word: [{ headword, lemma, pos, meaning }], most senses grouped by headword. */
export function foldedHeadwords(word) {
  const dpd = loadDpd();
  const ids = dpd.folded.get(canon.fold(word)) || [];
  return ids.map((id) => dpd.headwords.get(id)).filter(Boolean)
    .map((h) => ({ headword: h.clean, lemma: h.lemma, pos: h.pos, meaning: h.meaning || '(no meaning given)' }));
}

export async function lookupPaliInput({ word, limit = 5 }) {
  const raw = String(word ?? '').trim();
  const n = normalizeInput(raw);
  const typed = n.text.trim();
  let inferred = null;
  // No diacritics, or diacritics only partly inferred by the normaliser (nyana → ñana: vowel length unknown).
  const partial = n.changes.some((c) => c.rule === 'anglicised');
  if (!DIACRITICS.test(typed) || partial) {
    let found = [];
    try { found = foldedHeadwords(typed); } catch { /* bundled DPD missing: live lookup only */ }
    // Keep the letters the normaliser did infer (ñ in ñana).
    const marked = [...new Set(typed.toLowerCase().match(/[ñṅṭḍṇḷṃ]/g) || [])];
    if (marked.length) found = found.filter((f) => marked.every((ch) => f.headword.includes(ch)));
    const spellings = [...new Set(found.map((f) => f.headword))];
    if (spellings.length && !(spellings.length === 1 && spellings[0] === typed.toLowerCase())) {
      inferred = {
        input: raw, spellings, headwords: found.slice(0, 20), ...(found.length > 20 ? { more: found.length - 20 } : {}),
        note: `"${typed}" has ${partial ? 'diacritics only where they could be inferred' : 'no diacritics'}, so every DPD headword spelled with these letters is listed: ${spellings.join(', ')}. The diacritics were inferred from the bundled DPD subset (${loadDpd().source.version}); look up the exact spelling for its full entry.`,
      };
    }
  }
  let result = await lookupPali({ word: typed, limit });
  if (!result.entries?.length && inferred?.spellings.length === 1 && inferred.spellings[0] !== typed) {
    const again = await lookupPali({ word: inferred.spellings[0], limit });
    if (again.entries?.length) result = { ...again, looked_up: inferred.spellings[0], looked_up_note: `No entry for "${typed}"; showing the entry for the inferred spelling "${inferred.spellings[0]}".` };
  }
  return {
    ...result,
    ...(n.changed ? { input_normalised: normalizationNote(n) } : {}),
    ...(inferred ? { inferred_spelling: inferred } : {}),
  };
}
