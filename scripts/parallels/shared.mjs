/**
 * Internal parallels: passages two canonical texts share word for word (D59).
 *
 * Every text of the bundled canon is cut into overlapping runs of K words (shingles), after folding
 * diacritics and case. A shingle found in more than MAX_DF texts is a stock formula ("evaṃ me sutaṃ…",
 * the jhāna formula, peyyāla frames) and is ignored. Two texts are parallels when the rare shingles they
 * share cover at least MIN_WORDS words in each of them. Runs never cross a peyyāla mark ("…pe…"), so an
 * abbreviation never joins two passages. Output is deterministic: no randomness, sorted throughout.
 */
import * as canon from '../../src/canon.mjs';

export const PARAMS = { shingle_words: 8, max_texts_per_shingle: 4, stock_words: 5, stock_texts: 10, rare_word_texts: 20, min_rare_words: 2, min_shared_words: 30, min_run_words: 20, min_short_coverage: 0.7, min_short_coverage_strict: 0.9, min_short_words: 12, max_segment_refs: 12 };

const fold = canon.fold;
// Books that apply the same glosses or tables throughout: shared wording between two of their sections is the
// book's method, not a parallel. Pairs inside one of these groups are left out (pairs with other books stay).
// The Niddesa (Mahā- and Cūḷa-), Paṭṭhāna, Yamaka, Paṭisambhidāmagga, Kathāvatthu, Vibhaṅga, Dhammasaṅgaṇī and Parivāra.
export const SAME_METHOD = { mnd: 'niddesa', cnd: 'niddesa', patthana: 'patthana', ya: 'yamaka', ps: 'patisambhidamagga', kv: 'kathavatthu', vb: 'vibhanga', ds: 'dhammasangani' };
const methodGroup = (u) => (u.id.startsWith('pli-tv-pvr') ? 'parivara' : SAME_METHOD[u.collection] || null);

function hash(str) {
  // Two FNV-1a variants combined into a 53-bit integer key.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
    h2 ^= h2 >>> 13;
  }
  return (h1 >>> 0) * 2097152 + ((h2 >>> 0) & 0x1fffff);
}

/** The texts used as documents: no grouped ranges whose members are texts themselves, no duplicate spans. */
export function documents() {
  const d = canon.load();
  return d.canon.units.filter((u) => {
    if (u.shares_passage_with) return false;
    if (u.kind === 'range' && (u.members || []).every((m) => d.byId.get(m) && d.byId.get(m) !== u)) return false;
    return true;
  });
}

/** Token runs of a text: [{ seg, words }] split at peyyāla marks, headings left out. */
function runs(u) {
  const out = [];
  canon.segments(u).forEach((s, i) => {
    if (s.type === 'heading') return;
    for (const piece of s.text.split(/…\s*pe\s*…|\.\.\.\s*pe\s*\.\.\.|…|\bpe\b/)) {
      const words = fold(piece).replace(/[^a-z]+/g, ' ').trim().split(' ').filter((w) => w && w !== 'pe');
      if (words.length) out.push({ seg: i + 1, words });
    }
  });
  return out;
}

export function buildShared(params = PARAMS) {
  const K = params.shingle_words;
  const docs = documents();
  // Pass 1: shingles of every text, and in how many texts each occurs.
  const df = new Map();
  const df5 = new Map();
  const wdf = new Map();
  const S = params.stock_words;
  const perDoc = docs.map((u, di) => {
    const shingles = [];
    const g5 = new Map();
    const tok = [];
    const seen = new Set();
    let pos = 0;
    let words = 0;
    for (const r of runs(u)) {
      words += r.words.length;
      r.words.forEach((w, i) => { tok[pos + i] = w; if (!seen.has(w)) { seen.add(w); wdf.set(w, (wdf.get(w) || 0) + 1); } });
      for (let i = 0; i + S <= r.words.length; i++) {
        const key = hash(r.words.slice(i, i + S).join(' '));
        g5.set(pos + i, key);
        const v = df5.get(key);
        if (v === undefined) df5.set(key, 1 * 16384 + di);
        else if (v % 16384 !== di) df5.set(key, (Math.floor(v / 16384) + 1) * 16384 + di);
      }
      for (let i = 0; i + K <= r.words.length; i++) {
        const key = hash(r.words.slice(i, i + K).join(' '));
        shingles.push([key, r.seg, pos + i]);
        const v = df.get(key);
        if (v === undefined) df.set(key, 1 * 16384 + di);
        else if (v % 16384 !== di) df.set(key, (Math.floor(v / 16384) + 1) * 16384 + di);
      }
      pos += r.words.length + K; // a gap, so a run never continues across a peyyāla mark
    }
    return { words, shingles, g5, tok };
  });
  // Pass 2: rare shingles (2..MAX_DF texts) -> occurrences.
  const occ = new Map();
  let stockSkipped = 0;
  perDoc.forEach((p, di) => {
    for (const [key, seg, pos] of p.shingles) {
      const n = Math.floor(df.get(key) / 16384);
      if (n < 2 || n > params.max_texts_per_shingle) continue;
      // Built from common phrases: every shorter run inside it is found in many texts (a stock formula
      // assembled differently, such as the Niddesa's synonym lists or the Paṭṭhāna's counts).
      let common = 0;
      for (let j = pos; j + S <= pos + K; j++) if (Math.floor(df5.get(p.g5.get(j)) / 16384) > params.stock_texts) common++;
      if (common * 2 >= K - S + 1) { stockSkipped++; continue; }
      let list = occ.get(key);
      if (!list) occ.set(key, (list = []));
      list.push([di, seg, pos]);
    }
  });
  // Pass 3: pairs of texts sharing rare shingles.
  const pairs = new Map();
  for (const list of occ.values()) {
    for (let x = 0; x < list.length; x++) {
      for (let y = 0; y < list.length; y++) {
        const [a, sa, pa] = list[x];
        const [b, sb, pb] = list[y];
        if (a >= b) continue;
        const k = a * 16384 + b;
        let p = pairs.get(k);
        if (!p) pairs.set(k, (p = { a, b, posA: new Set(), posB: new Set(), segA: new Set(), segB: new Set(), segPairs: new Set() }));
        p.posA.add(pa); p.posB.add(pb); p.segA.add(sa); p.segB.add(sb); p.segPairs.add(sa * 1e6 + sb);
      }
    }
  }
  const formulaic = (u, v) => methodGroup(u) !== null && methodGroup(u) === methodGroup(v);
  const overlap = (u, v) => u.book === v.book && u.start < v.end && v.start < u.end;
  const cover = (set) => {
    // Words covered by shingles starting at these positions.
    const starts = [...set].sort((m, n) => m - n);
    let total = 0;
    let end = -1;
    for (const s of starts) {
      const from = Math.max(s, end);
      if (s + K > from) total += s + K - from;
      end = Math.max(end, s + K);
    }
    return total;
  };
  const longest = (set) => {
    // Longest stretch of consecutive words covered without a break.
    const starts = [...set].sort((m, n) => m - n);
    let best = 0;
    let from = null;
    let end = -1;
    for (const s of starts) {
      if (from === null || s > end) from = s;
      end = Math.max(end, s + K);
      best = Math.max(best, end - from);
    }
    return best;
  };
  const links = [];
  for (const p of pairs.values()) {
    const ua = docs[p.a];
    const ub = docs[p.b];
    if (overlap(ua, ub) || formulaic(ua, ub)) continue;
    const wa = cover(p.posA);
    const wb = cover(p.posB);
    const shared = Math.min(wa, wb);
    const run = Math.min(longest(p.posA), longest(p.posB));
    const shorter = Math.max(wa / perDoc[p.a].words, wb / perDoc[p.b].words);
    // A long passage (at least 30 words, 20 of them in one stretch), or most of a short text (a verse) shared whole.
    const long = shared >= params.min_shared_words && run >= params.min_run_words;
    const whole = shared >= params.min_short_words && run >= params.min_short_words && (shorter >= params.min_short_coverage_strict || (shorter >= params.min_short_coverage && shared >= 20));
    if (!long && !whole) continue;
    // Distinctive wording: the shared words must include some found in few texts (names, rare terms), so a
    // formula made only of common words (lists of views, the gradual training, rule-analysis tables) is left out.
    const rare = new Set();
    for (const s0 of p.posA) for (let j = s0; j < s0 + K; j++) { const w = perDoc[p.a].tok[j]; if (w && wdf.get(w) <= params.rare_word_texts) rare.add(w); }
    if (rare.size < params.min_rare_words) continue;
    const score = Math.min(1, Math.max(wa / perDoc[p.a].words, wb / perDoc[p.b].words));
    // Segment refs on both sides, taken from matching pairs in reading order so they correspond.
    const keepA = new Set();
    const keepB = new Set();
    for (const sp of [...p.segPairs].sort((m, n) => m - n)) {
      const sa = Math.floor(sp / 1e6);
      const sb = sp % 1e6;
      const roomA = keepA.has(sa) || keepA.size < params.max_segment_refs;
      const roomB = keepB.has(sb) || keepB.size < params.max_segment_refs;
      if (!roomA || !roomB) break;
      keepA.add(sa); keepB.add(sb);
    }
    const segs = (u, set) => [...set].sort((m, n) => m - n).map((i) => `${u.id}/${i}`);
    links.push({
      a: ua.id, b: ub.id, shared_words: shared, longest_run_words: run, rare_words: [...rare].sort().slice(0, 8), score: Math.round(score * 1000) / 1000,
      a_coverage: Math.round((wa / perDoc[p.a].words) * 1000) / 1000, b_coverage: Math.round((wb / perDoc[p.b].words) * 1000) / 1000,
      a_segments: segs(ua, keepA), b_segments: segs(ub, keepB),
      a_segment_count: p.segA.size, b_segment_count: p.segB.size,
    });
  }
  links.sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : x.b < y.b ? -1 : x.b > y.b ? 1 : 0));
  return { links, stats: { documents: docs.length, shingles: df.size, rare_shingles: occ.size, stock_shingles_skipped: stockSkipped, candidate_pairs: pairs.size, links: links.length } };
}
