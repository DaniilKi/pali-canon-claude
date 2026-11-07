/**
 * English ⇄ Pāli glossary (issue #102), from sourced data only:
 *  - DPD's English index (lookup.epd) and the multi-word senses of DPD meanings, limited to headwords found in the
 *    bundled canon and ranked by DPD's own early-text counts (server/data/glossary.json.gz, scripts/dpd/build_glossary.py,
 *    CC BY-NC-SA 4.0);
 *  - the plain-English glosses of the curated numbered lists (server/data/dhamma_lists.json).
 * Nothing is invented: a term DPD and the lists do not have is reported as not found. Every entry names its source.
 * Glosses are dictionary labels, never translations of a passage.
 */
import * as canon from './canon.mjs';
import { loadGlossary } from './glossary-data.mjs';
import { listsIndex } from './topics.mjs';
import { normalizeInput, normalizationNote, isPaliWord, isPaliStem } from './input.mjs';
import { DPD_LICENSE } from './analyse.mjs';
import { romanizeLookupInput, inputNote } from './script.mjs';

const fold = canon.fold;
export const GLOSS_NOTE = 'Dictionary and list glosses are labels for finding words, not translations. Quote the Pāli text (get_text) or a named translation (get_translation) instead.';
export const STOPWORDS = new Set(['a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'and', 'or', 'is', 'are', 'be', 'as', 'it', 'its', 'from', 'about', 'what', 'which', 'on', 'into', 'how', 'does', 'do', 'that', 'this', 'buddha', 'buddhist', 'sutta', 'suttas', 'teaching', 'teachings',
  // Common English words that are also Pāli forms (there, he, no, so, same…): never evidence that a query is Pāli.
  'there', 'he', 'have', 'has', 'had', 'no', 'so', 'same', 'made', 'use', 'did', 'say', 'said', 'any', 'many', 'was', 'were',
  'i', 'you', 'we', 'they', 'his', 'her', 'not', 'all', 'why', 'who', 'when', 'where', 'can', 'me', 'my', 'some']);

let idx = null;

function indexes() {
  if (idx) return idx;
  const g = loadGlossary();
  const en = new Map();
  for (const [k, ids] of Object.entries(g.en)) en.set(fold(k), { key: k, ids, source: 'DPD English index' });
  for (const [k, ids] of Object.entries(g.phrases)) if (!en.has(fold(k))) en.set(fold(k), { key: k, ids, source: 'DPD meaning (phrase)' });
  const pa = new Map();
  g.headwords.forEach(([lemma], i) => { const k = fold(lemma); (pa.get(k) || pa.set(k, []).get(k)).push(i); });
  // Curated list glosses: English word → members whose gloss uses it.
  const listEn = [];
  for (const l of listsIndex().lists) {
    listEn.push({ pali: l.pali, gloss: l.name, list: l.slug, kind: 'list' });
    for (const m of l.members) listEn.push({ pali: m.pali, gloss: m.gloss, list: l.slug, kind: 'member' });
  }
  idx = { g, en, pa, listEn };
  return idx;
}

const dpdSource = () => {
  const s = loadGlossary().source;
  return { name: 'Digital Pāḷi Dictionary', version: s.version, attribution: s.attribution, license: { ...DPD_LICENSE, attribution: s.attribution } };
};
const LIST_SOURCE = 'dhamma_lists (curated glosses, server/data/dhamma_lists.json)';

const entry = (i, source) => {
  const [pali, pos, meaning, ebt] = idx.g.headwords[i];
  return { pali, pos, meaning, ebt_count: ebt, source };
};

/** Keys tried for an English term: as typed, then a simple singular ("truths" → "truth"). */
function englishKeys(term) {
  const k = fold(term).replace(/[^a-z' -]/g, ' ').replace(/\s+/g, ' ').trim();
  const keys = [k];
  if (/ies$/.test(k)) keys.push(k.replace(/ies$/, 'y'));
  if (/[^s]s$/.test(k)) keys.push(k.slice(0, -1));
  return keys;
}

/** DPD entries for one English word or phrase: { key, source, ids } or null. */
function dpdEnglish(term) {
  const { en } = indexes();
  for (const k of englishKeys(term)) if (en.has(k)) return en.get(k);
  return null;
}

const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[^a-z' -]/g, '')}s?([^a-z]|$)`);

/** English → Pāli: DPD first, then the curated list glosses. */
export function englishToPali(term, { limit = 10 } = {}) {
  const { listEn } = indexes();
  const out = [];
  const hit = dpdEnglish(term);
  if (hit) for (const i of hit.ids.slice(0, limit)) out.push({ ...entry(i, hit.source), english_key: hit.key });
  const k = englishKeys(term)[0];
  if (k.length >= 3) {
    const re = wordRe(k);
    for (const l of listEn) {
      if (out.length >= limit * 2) break;
      if (re.test(fold(l.gloss))) out.push({ pali: l.pali, gloss: l.gloss, list: l.list, source: LIST_SOURCE });
    }
  }
  return out;
}

/** Pāli → English: DPD headwords that fold to the term, and list members with that Pāli name. */
export function paliToEnglish(term, { limit = 10 } = {}) {
  const { pa, listEn } = indexes();
  const k = fold(term).replace(/[^a-z]/g, '');
  const out = (pa.get(k) || []).slice(0, limit).map((i) => entry(i, 'DPD headword'));
  for (const l of listEn) {
    if (fold(l.pali).replace(/[^a-z]/g, '') === k) out.push({ pali: l.pali, gloss: l.gloss, list: l.list, source: LIST_SOURCE });
  }
  return out;
}

/** The glossary tool. */
export function glossary({ term, direction = 'auto', limit = 10 } = {}) {
  const raw = String(term ?? '').trim();
  if (!raw) throw new Error('Give an English or Pāli word or phrase.');
  const input = direction === 'en-pa' ? { text: raw, script: 'roman' } : romanizeLookupInput(raw);
  const n = input.original ? { text: input.text, changed: false, changes: [] } : normalizeInput(raw);
  const en = direction === 'pa-en' || input.original ? [] : englishToPali(raw, { limit });
  const pa = direction === 'en-pa' ? [] : paliToEnglish(n.text, { limit });
  const result = {
    term: raw, ...inputNote(input),
    ...(n.changed && direction !== 'en-pa' ? { input_normalised: normalizationNote(n) } : {}),
    ...(direction !== 'pa-en' ? { english_to_pali: en } : {}),
    ...(direction !== 'en-pa' ? { pali_to_english: pa } : {}),
    found: en.length + pa.length,
    note: GLOSS_NOTE,
    sources: { dpd: dpdSource(), lists: { name: LIST_SOURCE, note: listsIndex().gloss_note } },
  };
  if (!result.found) result.hint = 'Not in DPD\'s English index or the curated list glosses (nothing is guessed). Try a simpler word, lookup_pali for a Pāli word, or search_access_to_insight for English topics.';
  return result;
}

/** Does the query look like English: plain letters, no Pāli word, and at least one word or phrase in the glossary? */
export function looksEnglish(query) {
  const words = fold(String(query ?? '').replace(/"/g, ' ')).split(/[^a-z'-]+/).filter(Boolean);
  if (!words.length || /[āīūṅñṭḍṇḷṃ]/i.test(String(query))) return false;
  const content = words.filter((w) => !STOPWORDS.has(w));
  if (!content.length) return false;
  // A word that is both a Pāli form and an English word in DPD's index ("hate", "time") is not evidence either way;
  // a Pāli loan word in the index ("nibbana", whose entry is nibbāna itself) still counts as Pāli.
  if (content.some((w) => isPaliWord(w) && !englishNotLoan(w))) return false;
  return content.some((w) => dpdEnglish(w));
}

/** In DPD's English index as an English word, not as the Pāli word itself ("nibbana" → nibbāna is a loan). */
function englishNotLoan(w) {
  const hit = dpdEnglish(w);
  if (!hit) return false;
  const { g } = indexes();
  const k = fold(w);
  // The index key itself written with Pāli letters ("nibbāna") is a Pāli word, not English.
  if (/[āīūṅñṭḍṇḷṃ]/.test(hit.key)) return false;
  return !hit.ids.some((i) => fold(g.headwords[i][0]).replace(/[^a-z]/g, '') === k);
}

/** A Pāli word typed in an English question: as typed, or without an English plural s ("jhanas" → "jhana"). */
export function paliStemOf(word) {
  const w = fold(word).replace(/[^a-z]/g, '');
  if (w.length >= 4 && isPaliWord(w)) return w;
  if (w.length >= 5 && /s$/.test(w) && isPaliWord(w.slice(0, -1))) return w.slice(0, -1);
  if (w.length >= 4 && isPaliStem(w)) return w;
  return null;
}

/**
 * The Pāli words of a question written in English around them ("How many jhanas are there" → ["jhana"]): every
 * word that is not an English stop word must be Pāli. Null when there are no stop words or a word is not Pāli.
 */
export function paliWordsInEnglish(query) {
  const words = fold(String(query ?? '').replace(/"/g, ' ')).split(/[^a-z'-]+/).filter(Boolean);
  const content = words.filter((w) => !STOPWORDS.has(w));
  if (!content.length || content.length === words.length) return null;
  const stems = content.map(paliStemOf);
  return stems.every(Boolean) ? stems : null;
}

/**
 * Expand an English query into Pāli search groups: the longest phrases the glossary knows (up to 6 words), then single
 * words; stop words are skipped. Each chunk becomes one group of alternative Pāli terms (any may match); groups are
 * all required. At most maxTerms Pāli terms in all; the rest are counted as dropped.
 */
export function expandEnglish(query, { maxTerms = 8, perChunk = 4 } = {}) {
  const words = fold(String(query ?? '').replace(/"/g, ' ')).split(/[^a-z'-]+/).filter(Boolean);
  const chunks = [];
  for (let i = 0; i < words.length;) {
    let found = null;
    for (let j = Math.min(words.length, i + 6); j > i + 1 && !found; j -= 1) {
      const h = dpdEnglish(words.slice(i, j).join(' '));
      if (h) found = { text: words.slice(i, j).join(' '), hit: h, end: j };
    }
    if (!found && !STOPWORDS.has(words[i])) {
      const h = dpdEnglish(words[i]);
      found = h ? { text: words[i], hit: h, end: i + 1 } : { text: words[i], hit: null, end: i + 1 };
    }
    if (found) chunks.push(found);
    i = found ? found.end : i + 1;
  }
  const { g } = indexes();
  const mapping = {};
  const groups = [];
  const unmatched = [];
  let used = 0;
  let dropped = 0;
  const sources = new Set();
  const keptPali = [];
  for (const c of chunks) {
    if (!c.hit) {
      // A Pāli word inside an English question ("How many jhanas are there") is searched as Pāli (an English plural s dropped).
      const stem = paliStemOf(c.text);
      if (stem) { keptPali.push({ typed: c.text, searched: stem }); groups.push([stem]); } else unmatched.push(c.text);
      continue;
    }
    const terms = [];
    for (const i of c.hit.ids) {
      const lemma = g.headwords[i][0];
      const f = fold(lemma);
      if (f.length < 3 || terms.some((t) => fold(t) === f)) continue;
      if (terms.length < perChunk && used < maxTerms) { terms.push(lemma); used += 1; } else dropped += 1;
    }
    if (terms.length) { mapping[c.text] = terms; groups.push(terms.map(fold)); sources.add(c.hit.source); }
  }
  if (!Object.keys(mapping).length) return null;
  return { mapping, groups, dropped, unmatched, sources: [...sources], ...(keptPali.length ? { kept_pali: keptPali } : {}) };
}

/** MCP registration (feature registry: src/features/index.mjs). */
export function register({ tool, z }) {
  tool('glossary', 'Look up an English word or phrase to find the Pāli terms for it, or a Pāli word to see its short English gloss, from the Digital Pāḷi Dictionary\'s English index and the curated numbered-list glosses. Every entry names its source. Glosses are labels for finding words, not translations. Works offline.', {
    term: z.string().trim().min(1).max(100).describe('An English word or phrase ("mindfulness", "suffering", "dependent origination") or a Pāli word in Roman or any supported native script. Native conversion is labelled; dictionary text stays in its source form.'),
    direction: z.enum(['auto', 'en-pa', 'pa-en']).default('auto').describe('"en-pa" English to Pāli, "pa-en" Pāli to English, "auto" both.'),
    limit: z.number().int().min(1).max(30).default(10).describe('Entries per direction and source.'),
  }, (args) => glossary(args));
}
