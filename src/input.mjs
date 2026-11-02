/**
 * Pāli typed on an English keyboard (issue #102): one shared normaliser for every tool that takes Pāli words.
 *
 * Handled: plain ASCII (folding is done by the search itself), ṁ = ṃ, NFC/NFD, Velthuis (aa ā, ii ī, uu ū,
 * "n ṅ, ~n ñ, .t .d .n .m .l .h, and the alternates m.. n.. ,,n), Harvard-Kyoto (A I U M G J T D N L),
 * doubled vowels typed without Velthuis markers, anglicised spellings (ny → ñ or ṃy, n before k/g → ṅ) and a
 * few labelled aliases of Sanskrit or English loan forms (nirvana → nibbāna).
 *
 * Detection is conservative and per word. Velthuis dot, quote and tilde markers are never English, so they are
 * converted whenever they sit inside a word of four or more letters. Everything else (Harvard-Kyoto capitals,
 * doubled vowels, anglicised spellings) is converted only when the word as typed is not a Pāli word of the
 * bundled canon and the converted word is: "vacuum", "McDonald" or "LinkedIn" are left alone, and an all-caps
 * word ("MN", "DPD") is never read as Harvard-Kyoto. Every change is reported, so a result can say what was
 * inferred.
 *
 * Ported with attribution (THIRD_PARTY.md): the Velthuis table and its order from DPD's KOReader plugin
 * (digitalpalidictionary/dpd-koreader, dpd/velthuis.lua, MIT), whose English lookup (dpd/english.lua) also gives
 * the fuzzy key (strip diacritics, kh → k, collapse doubled consonants); the spelling-variant classes from
 * tokushige-koyasan/corpus-search-toolkit (scripts/variants.py, MIT). The Velthuis test fixture is the quail
 * table of matko/emacs-pali-velthuis (Unlicense).
 */
import * as canon from './canon.mjs';

export const fold = canon.fold;

// ---- Velthuis ----------------------------------------------------------------------------------------------

// DPD's order (dpd/velthuis.lua): long vowels first, then the marked consonants. Capitals as in emacs-pali-velthuis.
// The alternates write the mark after the letter: m.. (ṁ, read as ṃ), n.. (ṅ) and ,,n (ñ).
export const VELTHUIS = [
  ['m..', 'ṃ'], ['n..', 'ṅ'], [',,n', 'ñ'],
  ['AA', 'Ā'], ['II', 'Ī'], ['UU', 'Ū'], ['aa', 'ā'], ['ii', 'ī'], ['uu', 'ū'],
  ['"N', 'Ṅ'], ['"n', 'ṅ'], ['~N', 'Ñ'], ['~n', 'ñ'],
  ['.T', 'Ṭ'], ['.t', 'ṭ'], ['.D', 'Ḍ'], ['.d', 'ḍ'], ['.N', 'Ṇ'], ['.n', 'ṇ'],
  ['.M', 'Ṃ'], ['.m', 'ṃ'], ['.L', 'Ḷ'], ['.l', 'ḷ'], ['.h', 'ḥ'],
];
const VELTHUIS_MARK = /(?:^|[a-z])(?:\.[tdnmlhTDNML]|"[nN]|~[nN])|,,n|[mn]\.\./;

/** Convert Velthuis sequences in one word (no detection). */
export function fromVelthuis(word) {
  let s = String(word);
  for (const [from, to] of VELTHUIS) s = s.split(from).join(to);
  return s;
}

// ---- Harvard-Kyoto -----------------------------------------------------------------------------------------

const HK = { A: 'ā', I: 'ī', U: 'ū', M: 'ṃ', G: 'ṅ', J: 'ñ', T: 'ṭ', D: 'ḍ', N: 'ṇ', L: 'ḷ' };

/** Harvard-Kyoto capitals to Pāli letters; the first letter is read as an ordinary capital (no detection). */
export function fromHarvardKyoto(word) {
  const s = String(word);
  return s[0].toLowerCase() + s.slice(1).replace(/[AIUMGJTDNL]/g, (c) => HK[c]);
}

const looksHK = (w) => /[a-z]/.test(w) && /^.+[AIUMGJTDNL]/.test(w) && !/[BCEFHKOPQRSVWXYZ]/.test(w.slice(1));

// ---- vocabulary of the bundled canon -----------------------------------------------------------------------

let vocab = null;

/** Folded word → count over the bundled VRI canon, plus a sorted list for prefix and fuzzy-key lookups. Built once (about 0.6 s). */
export function vocabulary() {
  if (vocab) return vocab;
  const d = canon.load();
  const raw = new Map();
  for (const b of d.canon.books) for (const blk of b.blocks) {
    if (!blk[2]) continue;
    for (const w of blk[2].toLowerCase().match(/[a-zāīūṅñṭḍṇḷṃṁ]+/g) || []) raw.set(w, (raw.get(w) || 0) + 1);
  }
  const counts = new Map();
  const spelling = new Map();
  for (const [w, n] of raw) {
    const k = fold(w);
    counts.set(k, (counts.get(k) || 0) + n);
    const best = spelling.get(k);
    if (!best || best[1] < n) spelling.set(k, [w.replace(/ṁ/g, 'ṃ'), n]);
  }
  const sorted = [...counts.keys()].sort();
  const byFuzzy = [...counts.keys()].map((w) => [fuzzyKey(w), w]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  vocab = { counts, spelling, sorted, byFuzzy };
  return vocab;
}

function lowerBound(arr, key, get = (x) => x) {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (get(arr[mid]) < key) lo = mid + 1; else hi = mid; }
  return lo;
}

/** Is this (folded) word a word of the canon, or the start of one ("samyutta" in "saṃyuttanikāye")? */
export function isPaliStem(word) {
  const k = fold(word);
  if (k.length < 2) return false;
  const { counts, sorted } = vocabulary();
  if (counts.has(k)) return true;
  const i = lowerBound(sorted, k);
  return i < sorted.length && sorted[i].startsWith(k);
}

/** Is this exactly a word of the canon (folded)? */
export const isPaliWord = (word) => vocabulary().counts.has(fold(word));

// ---- fuzzy key and spelling variants -----------------------------------------------------------------------

/**
 * Spelling key for English-keyboard forms (after DPD's English fuzzy key): fold diacritics, read ṃ before a
 * consonant and ny as n, drop the h of aspirates (kh → k), collapse doubled consonants. "sanyutta", "saṃyutta"
 * → "sanuta"; "nyana", "ñāṇa" → "nana"; "satipatana", "satipaṭṭhāna" → "satipatana".
 */
export function fuzzyKey(word) {
  return fold(word).replace(/[^a-z]/g, '')
    .replace(/m(?=[^aeiou])/g, 'n')
    .replace(/ny/g, 'n')
    .replace(/([kgcjtdpb])h/g, '$1')
    .replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, '$1');
}

/**
 * Canon spellings (folded) that share a word's fuzzy key, or extend it by an inflection of up to 3 letters,
 * most frequent first. A spelling that merely extends another listed one is dropped, because search matches
 * inside words.
 */
export function spellingVariants(word, { max = 4 } = {}) {
  const key = fuzzyKey(word);
  if (key.length < 3) return [];
  const { counts, byFuzzy } = vocabulary();
  const found = [];
  for (let i = lowerBound(byFuzzy, key, (x) => x[0]); i < byFuzzy.length && byFuzzy[i][0].startsWith(key); i += 1) {
    if (byFuzzy[i][0].length <= key.length + 3) found.push(byFuzzy[i][1]);
  }
  const self = fold(word);
  const ranked = found.filter((w) => w !== self).sort((a, b) => counts.get(b) - counts.get(a) || a.length - b.length);
  const out = [];
  for (const w of ranked) {
    if (out.some((o) => w.startsWith(o))) continue;
    for (let j = out.length - 1; j >= 0; j -= 1) if (out[j].startsWith(w)) out.splice(j, 1);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

/** The most frequent spelling with diacritics of a folded canon word ("nana" → "ñāṇa" or "nānā"), or null. */
export const canonSpelling = (folded) => vocabulary().spelling.get(folded)?.[0] ?? null;

/** Diacritic spellings in the canon for a folded stem: the words it begins, most frequent first. */
export function canonSpellings(folded, { max = 3 } = {}) {
  const { counts, sorted, spelling } = vocabulary();
  const out = [];
  for (let i = lowerBound(sorted, folded); i < sorted.length && sorted[i].startsWith(folded); i += 1) {
    if (sorted[i].length <= folded.length + 3) out.push(sorted[i]);
  }
  return out.sort((a, b) => counts.get(b) - counts.get(a)).slice(0, max).map((w) => spelling.get(w)[0]);
}

// ---- aliases -----------------------------------------------------------------------------------------------

/** Sanskrit or English loan forms of Pāli words, applied only to a whole word that is not itself Pāli. */
export const ALIASES = {
  nirvana: 'nibbāna', nirvāṇa: 'nibbāna', karma: 'kamma', dharma: 'dhamma', sutra: 'sutta', sūtra: 'sutta',
  dhyana: 'jhāna', dhyāna: 'jhāna', skandha: 'khandha', skandhas: 'khandha', bodhisattva: 'bodhisatta',
  arhat: 'arahant', arhant: 'arahant', samskara: 'saṅkhāra', saṃskāra: 'saṅkhāra', trishna: 'taṇhā', tṛṣṇā: 'taṇhā',
  pratityasamutpada: 'paṭiccasamuppāda', abhidharma: 'abhidhamma',
};
const ALIAS_LABEL = 'Sanskrit or English loan form of the Pāli word';

// ---- the normaliser ----------------------------------------------------------------------------------------

/**
 * Normalise one word. Returns { word, rule } where rule is null when nothing changed, else one of
 * 'velthuis', 'harvard-kyoto', 'doubled vowels', 'anglicised', 'alias'.
 */
export function normalizeWord(token) {
  const w = String(token).normalize('NFC').replace(/ṁ/g, 'ṃ').replace(/Ṁ/g, 'Ṃ');
  if (!/[A-Za-z]/.test(w) || /\d/.test(w)) return { word: w, rule: null };
  const letters = (w.match(/[A-Za-zāīūṅñṭḍṇḷṃĀĪŪṄÑṬḌṆḶṂ]/g) || []).length;
  if (VELTHUIS_MARK.test(w) && letters >= 4) return { word: fromVelthuis(w), rule: 'velthuis' };
  if (!/^[A-Za-zāīūṅñṭḍṇḷṃĀĪŪṄÑṬḌṆḶṂ'’-]+$/.test(w)) return { word: w, rule: null };
  const lower = w.toLowerCase();
  if (Object.hasOwn(ALIASES, lower) && !isPaliWord(lower)) return { word: ALIASES[lower], rule: 'alias', label: ALIAS_LABEL };
  if (w === w.toUpperCase()) return { word: w, rule: null };
  const pali = (s) => isPaliStem(s);
  if (looksHK(w)) {
    const hk = fromHarvardKyoto(w);
    if (pali(hk)) return { word: hk, rule: 'harvard-kyoto' };
    return { word: w, rule: null };
  }
  if (/[āīūṅñṭḍṇḷṃ]/i.test(w) || pali(w)) return { word: w, rule: null };
  if (/aa|ii|uu/i.test(w)) {
    const v = fromVelthuis(w);
    if (pali(v)) return { word: v, rule: 'doubled vowels' };
  }
  // Anglicised: ny is ñ (ñāṇa) or ṃy (saṃyutta); n before k/g is ṅ (saṅgha). Folding already equates n and ṅ.
  if (/ny/i.test(w)) {
    for (const [re, to] of [[/ny/g, 'ñ'], [/ny/g, 'ṃy'], [/Ny/g, 'Ñ']]) {
      const cand = w.replace(re, to);
      if (cand !== w && pali(cand)) return { word: cand.replace(/n(?=k|g)/g, 'ṅ'), rule: 'anglicised' };
    }
  }
  return { word: w, rule: null };
}

/**
 * Normalise a query, citation or word. Quoted phrases, numbers, URLs and punctuation are kept; each word is
 * normalised on its own. Returns { text, original, changed, scheme, changes: [{ from, to, rule, label? }] }.
 */
export function normalizeInput(text) {
  const original = String(text ?? '');
  const nfc = original.normalize('NFC');
  if (/^\s*https?:\/\//i.test(nfc)) return { text: nfc, original, changed: false, scheme: 'url', changes: [] };
  const changes = [];
  const out = nfc.replace(/[A-Za-zāīūṅñṭḍṇḷṃṁĀĪŪṄÑṬḌṆḶṂṀ.~",'’-]+/g, (token) => {
    // Keep surrounding punctuation ("sa.myutta," or a quoted "nibbaana").
    const m = token.match(/^([,'’"-]*?)(.*?)([.,'’"-]*)$/);
    let [, lead, core, tail] = m;
    // A trailing ".." is part of the Velthuis alternates m.. and n.., not punctuation.
    if (/[mn]$/.test(core) && tail.startsWith('..')) { core += '..'; tail = tail.slice(2); }
    if (lead.endsWith(',,') && core.startsWith('n')) { core = `,,${core}`; lead = lead.slice(0, -2); }
    if (lead.endsWith('"') && /^[nN]/.test(core)) { core = `"${core}`; lead = lead.slice(0, -1); }
    if (!core) return token;
    const r = normalizeWord(core);
    const fixed = r.word.replace(/ṁ/g, 'ṃ');
    if (r.rule) changes.push({ from: core, to: fixed, rule: r.rule, ...(r.label ? { label: r.label } : {}) });
    return lead + fixed + tail;
  }).replace(/ṁ/g, 'ṃ').replace(/Ṁ/g, 'Ṃ');
  const rules = [...new Set(changes.map((c) => c.rule))];
  const scheme = rules.includes('velthuis') ? 'velthuis' : rules.includes('harvard-kyoto') ? 'harvard-kyoto'
    : /[āīūṅñṭḍṇḷṃ]/i.test(out) ? 'unicode' : 'ascii';
  return { text: out, original, changed: changes.length > 0, scheme, changes };
}

/** The label a result carries when the input was rewritten, or undefined. */
export function normalizationNote(n) {
  if (!n?.changed) return undefined;
  return {
    original: n.original, read_as: n.text, scheme: n.scheme,
    changes: n.changes,
    note: `Read "${n.original}" as "${n.text}" (${[...new Set(n.changes.map((c) => c.rule))].join(', ')}). These spellings are inferred from the input, not given by you; check them against the result.`,
  };
}

/**
 * Run fn on the normalised value; label the result (input_normalised) when the input was rewritten. If the rewritten
 * value fails and the value as typed succeeds, the typed value wins, unlabelled. Works with sync and async fn.
 */
export async function withNormalised(value, fn) {
  if (typeof value !== 'string' || !value.trim()) return fn(value);
  const n = normalizeInput(value);
  if (!n.changed) return fn(value);
  try {
    const r = await fn(n.text);
    return r && typeof r === 'object' && !Array.isArray(r) ? { ...r, input_normalised: normalizationNote(n) } : r;
  } catch (error) {
    try { return await fn(value); } catch { throw error; }
  }
}
