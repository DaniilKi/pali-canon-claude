// verify_quote: check a quotation against the texts themselves (issue #24).
// Pāli quotes are matched offline against the bundled VRI text; English quotes against the linked
// English translations, fetched live (cached) through english.mjs. The answer only ever reports
// what the texts searched contain: it never says who did or did not say something.
import { fold, load, resolve, segments, source, linksFor, translationId, alignmentInfo } from './canon.mjs';
import { isPartial, partialScope, scopeHash } from './translation-scope.mjs';
import * as englishModule from './english.mjs';
import { romanizeLookupInput, inputNote } from './script.mjs';
import { parseCitation, citationId, rangeEndPath } from './citations.mjs';

export const THRESHOLDS = { found: 0.82, close_paraphrase: 0.5 };
const MAX_QUERY_WORDS = 120;
// 80 fits the default scope: the 26 Dhammapada chapters from three translators (Ṭhānissaro, Buddharakkhita, Ānandajoti).
const MAX_ENGLISH_PAGES = 80;
const COMMON_SKIP = 150000; // query words this frequent are ignored for retrieval (still scored)
const DEFAULT_ENGLISH_SCOPE = { label: 'the Dhammapada (all 26 chapters)', collection: 'dhp' };

const PALI_HINT = /[āīūṅñṭḍṇḷṃṁ]/i;
const words = (folded) => folded.split(/[^a-z0-9]+/).filter(Boolean);
const englishFold = (text) => fold(String(text).replace(/['’‘`]/g, ''));

// ---- similarity -----------------------------------------------------------

function trigrams(s) {
  const t = ` ${s} `;
  const m = new Map();
  for (let i = 0; i + 3 <= t.length; i += 1) {
    const g = t.slice(i, i + 3);
    m.set(g, (m.get(g) || 0) + 1);
  }
  return m;
}

/** Dice coefficient over character-trigram multisets of two normalised strings (0..1). */
export function similarity(a, b) {
  const A = a instanceof Map ? a : trigrams(a);
  const B = b instanceof Map ? b : trigrams(b);
  let inter = 0; let na = 0; let nb = 0;
  for (const v of A.values()) na += v;
  for (const v of B.values()) nb += v;
  for (const [g, v] of A) { const w = B.get(g); if (w) inter += Math.min(v, w); }
  return na + nb ? (2 * inter) / (na + nb) : 0;
}

// ---- generic window search over a token stream ----------------------------
// corpus: { tokens: Int32Array, vocab: string[], positions(id) -> ArrayLike<number>, freq(id), total,
//           variants(word) -> [{ id, sim }] }

const TOP_CANDIDATES = 12; // candidates refined for the matches shown
const KEEP_WINDOWS = 400; // candidate windows kept, so equally good passages elsewhere can be counted
const TIE_REFINE = 200; // at most this many equally scored windows are refined to count ties

function findWindows(corpus, qwords, { keep = KEEP_WINDOWS } = {}) {
  const n = qwords.length;
  const variantIds = qwords.map((w) => corpus.variants(w));
  const weight = variantIds.map((vs) => {
    if (!vs.length) return 0;
    const f = Math.max(...vs.map((v) => corpus.freq(v.id)));
    return Math.log(1 + corpus.total / Math.max(1, f));
  });
  const totalWeight = weight.reduce((a, b) => a + b, 0);
  if (!totalWeight) return [];
  const usable = variantIds.map((vs) => vs.reduce((s, v) => s + corpus.freq(v.id), 0) <= COMMON_SKIP);
  if (!usable.some((u, i) => u && weight[i])) usable.fill(true);
  let count = 0;
  variantIds.forEach((vs, i) => { if (usable[i]) for (const v of vs) count += corpus.freq(v.id); });
  const pos = new Int32Array(count); const who = new Int32Array(count);
  let k = 0;
  variantIds.forEach((vs, i) => {
    if (!usable[i]) return;
    for (const v of vs) for (const p of corpus.positions(v.id)) { pos[k] = p; who[k] = i; k += 1; }
  });
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => pos[a] - pos[b]);
  const span = n + Math.max(3, Math.ceil(n * 0.5));
  const inWindow = new Int32Array(n);
  let score = 0; let lo = 0;
  let region = 0;
  const found = [];
  for (let hi = 0; hi < order.length; hi += 1) {
    const h = order[hi];
    // A candidate cannot gain evidence from a neighbouring, independently cited text.
    if (corpus.boundaries && pos[h] >= corpus.boundaries[region + 1]) {
      while (pos[h] >= corpus.boundaries[region + 1]) region += 1;
      inWindow.fill(0); score = 0; lo = hi;
    }
    if (inWindow[who[h]]++ === 0) score += weight[who[h]];
    while (pos[order[lo]] < pos[h] - span) {
      const l = order[lo];
      if (--inWindow[who[l]] === 0) score -= weight[who[l]];
      lo += 1;
    }
    if (score >= 0.3 * totalWeight) found.push({ start: pos[order[lo]], end: pos[h], score, region });
  }
  found.sort((a, b) => b.score - a.score || a.start - b.start);
  const picked = [];
  for (const f of found) {
    if (picked.some((p) => p.region === f.region && Math.abs(p.start - f.start) < span)) continue;
    picked.push(f);
    if (picked.length >= keep) break;
  }
  return picked;
}

/**
 * Best sub-window of tokens around a candidate. English: score = trigram Dice × coverage, where coverage is the
 * share of the query's (idf-weighted) words present in the window, so a few shared common words ("is the path")
 * cannot pass for the quotation. Pāli: Dice is computed with spaces removed (compounds are split differently
 * from one edition or writer to the next) and weighted more gently, × (0.5 + 0.5 × coverage).
 */
function refine(corpus, query, qwords, cand, { min = 0, max = corpus.tokens.length } = {}) {
  const join = corpus.compounds ? '' : ' ';
  const Q = trigrams(corpus.compounds ? query.replace(/ /g, '') : query);
  const qlen = qwords.length;
  const variantSets = qwords.map((w) => new Set(corpus.variants(w).map((v) => v.id)));
  const weight = variantSets.map((vs) => {
    if (!vs.size) return Math.log(1 + corpus.total); // a word absent from the corpus weighs most
    return Math.log(1 + corpus.total / Math.max(1, Math.max(...[...vs].map((id) => corpus.freq(id)))));
  });
  const totalWeight = weight.reduce((a, b) => a + b, 0) || 1;
  const from = Math.max(min, cand.start - 3);
  const to = Math.min(max, cand.end + 4);
  let best = { sim: 0, dice: 0, coverage: 0, a: cand.start, b: Math.min(max, cand.end + 1) };
  const lens = new Set([qlen - 2, qlen - 1, qlen, qlen + 1, qlen + 2].filter((l) => l > 0));
  for (let a = from; a < to; a += 1) {
    for (const len of lens) {
      const b = a + len;
      if (b > max) continue;
      const ids = corpus.tokens.subarray(a, b);
      const dice = similarity(Q, Array.from(ids, (id) => corpus.vocab[id]).join(join));
      if (dice <= best.sim) continue;
      const present = new Set(ids);
      const joined = corpus.compounds ? Array.from(ids, (id) => corpus.vocab[id]).join('') : '';
      let covered = 0;
      variantSets.forEach((vs, i) => {
        // Pāli: a word written apart from its compound still counts ("ekaputtam anurakkhe").
        if (corpus.compounds && qwords[i].length >= 3 && joined.includes(qwords[i])) { covered += weight[i]; return; }
        for (const id of vs) if (present.has(id)) { covered += weight[i]; break; }
      });
      const coverage = covered / totalWeight;
      const sim = corpus.compounds ? dice * (0.5 + 0.5 * coverage) : dice * coverage;
      if (sim > best.sim) best = { sim, dice, coverage, a, b };
    }
  }
  return best;
}

/**
 * Refine the best windows (and, for a stock phrase, every window that scored as well as the best, up to
 * TIE_REFINE) and sort them by similarity. `truncated` is true when more equally scored windows may exist than
 * were refined, so a tie count is then a lower bound.
 */
function rankWindows(windows, refineOne) {
  const top = windows[0]?.score ?? 0;
  const topCount = windows.filter((w) => w.score >= top - 1e-9).length;
  const chosen = windows.filter((w, i) => i < TOP_CANDIDATES || (i < TIE_REFINE && w.score >= top - 1e-9));
  const ranked = chosen.map((c) => ({ c, ...refineOne(c) })).sort((a, b) => b.r.sim - a.r.sim || a.r.a - b.r.a);
  return { ranked, truncated: topCount > TIE_REFINE || (topCount === windows.length && windows.length >= KEEP_WINDOWS) };
}

/** How many distinct texts match as well as the best match, at the reported precision (`keyOf` names the text). */
function countTies(ranked, truncated, keyOf) {
  const best = Math.round((ranked[0]?.r.sim ?? 0) * 100);
  const keys = new Set();
  for (const x of ranked) if (Math.round(x.r.sim * 100) >= best) { const k = keyOf(x); if (k) keys.add(k); }
  return { texts: keys.size, at_least: truncated };
}

// ---- Pāli index (built lazily, once) ---------------------------------------

let pali = null;

function trigramKeys(w) { return [...trigrams(w).keys()]; }

function buildPaliIndex() {
  if (pali) return pali;
  const d = load();
  const ids = new Map(); const vocab = [];
  let tokens = new Int32Array(1 << 22); let nt = 0;
  const bookStart = []; const blockStart = [];
  const boundaries = [];
  // The outermost citable unit permits a whole recorded group, but never joins independent texts.
  // Abbreviated records provide boundaries only where a complete indexed text does not cover the block.
  const owners = d.canon.books.map((book) => new Array(book.blocks.length).fill(null));
  const outermost = [...d.canon.units].sort((a, b) => Number(!!b.approximate) - Number(!!a.approximate)
    || (a.end - a.start) - (b.end - b.start));
  for (const unit of outermost) for (let i = unit.start; i < unit.end; i += 1) owners[unit.book][i] = unit;
  let blocks = 0;
  for (const [bi, book] of d.canon.books.entries()) {
    bookStart.push(blocks);
    let previousOwner;
    for (const [i, blk] of book.blocks.entries()) {
      const owner = owners[bi][i];
      if ((i === 0 || owner !== previousOwner) && boundaries.at(-1) !== nt) boundaries.push(nt);
      previousOwner = owner;
      blockStart.push(nt);
      blocks += 1;
      for (const w of words(fold(blk[2]))) {
        let id = ids.get(w);
        if (id === undefined) { id = vocab.length; ids.set(w, id); vocab.push(w); }
        if (nt === tokens.length) { const t = new Int32Array(tokens.length * 2); t.set(tokens); tokens = t; }
        tokens[nt] = id; nt += 1;
      }
    }
  }
  blockStart.push(nt);
  boundaries.push(nt);
  tokens = tokens.slice(0, nt);
  const freq = new Int32Array(vocab.length);
  for (let i = 0; i < nt; i += 1) freq[tokens[i]] += 1;
  const offsets = new Int32Array(vocab.length + 1);
  for (let i = 0; i < vocab.length; i += 1) offsets[i + 1] = offsets[i] + freq[i];
  const fill = offsets.slice(0, vocab.length);
  const postings = new Int32Array(nt);
  for (let i = 0; i < nt; i += 1) postings[fill[tokens[i]]++] = i;
  // Trigram → word ids, for spelling variants (sandhi, niggahīta, v/b, long/short vowels after folding).
  const gramIndex = new Map();
  vocab.forEach((w, id) => {
    if (w.length < 4) return;
    for (const g of trigramKeys(w)) { let list = gramIndex.get(g); if (!list) gramIndex.set(g, list = []); list.push(id); }
  });
  for (const [g, list] of gramIndex) gramIndex.set(g, Int32Array.from(list));
  pali = {
    ids, vocab, tokens, freq, total: nt, bookStart, blockStart: Int32Array.from(blockStart), boundaries: Int32Array.from(boundaries),
    positions: (id) => postings.subarray(offsets[id], offsets[id + 1]),
    freqOf: (id) => freq[id],
    gramIndex,
  };
  return pali;
}

const variantCache = new Map();

/** Vocabulary words within trigram-Dice 0.7 of `w` (spelling variants), best first. */
function paliVariants(w) {
  const ix = buildPaliIndex();
  const exact = ix.ids.get(w);
  if (w.length < 4) return exact === undefined ? [] : [{ id: exact, sim: 1 }];
  if (variantCache.has(w)) return variantCache.get(w);
  const grams = trigramKeys(w);
  // Prefix filter: Dice ≥ 0.7 needs at least ⌈0.54·g⌉ shared trigrams, so every such word shares one of the
  // g − ⌈0.54·g⌉ + 1 rarest trigrams of `w`. Only those posting lists are read.
  const need = Math.ceil(0.54 * grams.length);
  const rare = grams.map((g) => ix.gramIndex.get(g) || []).sort((x, y) => x.length - y.length).slice(0, grams.length - need + 1);
  const mine = new Set(grams);
  const seen = new Set();
  const out = [];
  for (const list of rare) {
    for (const id of list) {
      if (seen.has(id)) continue;
      seen.add(id);
      const other = trigramKeys(ix.vocab[id]);
      let c = 0;
      for (const g of other) if (mine.has(g)) c += 1;
      const sim = (2 * c) / (grams.length + other.length);
      if (sim >= 0.7) out.push({ id, sim });
    }
  }
  out.sort((x, y) => y.sim - x.sim);
  const result = out.slice(0, 12);
  if (variantCache.size > 5000) variantCache.clear();
  variantCache.set(w, result);
  return result;
}

function paliCorpus() {
  const ix = buildPaliIndex();
  return { compounds: true, tokens: ix.tokens, vocab: ix.vocab, total: ix.total, positions: ix.positions, freq: ix.freqOf, variants: paliVariants, boundaries: ix.boundaries };
}

function paliBounds(position) {
  const { boundaries } = buildPaliIndex();
  let lo = 0; let hi = boundaries.length - 2;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (boundaries[mid] <= position) lo = mid; else hi = mid - 1; }
  return { min: boundaries[lo], max: boundaries[lo + 1] };
}

function blockAt(tokenPos) {
  const { blockStart, bookStart } = buildPaliIndex();
  let lo = 0; let hi = blockStart.length - 2;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (blockStart[mid] <= tokenPos) lo = mid; else hi = mid - 1; }
  let b = 0; let bh = bookStart.length - 1;
  while (b < bh) { const mid = (b + bh + 1) >> 1; if (bookStart[mid] <= lo) b = mid; else bh = mid - 1; }
  return { book: b, index: lo - bookStart[b] };
}

let unitsByBook = null;
function ownerOf(book, index, end = index + 1) {
  if (!unitsByBook) {
    unitsByBook = new Map();
    for (const u of load().canon.units) { if (!unitsByBook.has(u.book)) unitsByBook.set(u.book, []); unitsByBook.get(u.book).push(u); }
  }
  const covering = (unitsByBook.get(book) || []).filter((u) => u.start <= index && end <= u.end);
  covering.sort((a, b) => (!!a.approximate - !!b.approximate) || ((a.kind === 'range') - (b.kind === 'range')) || ((a.end - a.start) - (b.end - b.start)));
  return covering[0] || null;
}

// Map the comparison's folded words back to untouched UTF-16 source substrings.
function sourceWordSpans(text) {
  let normalized = '', at = 0;
  const starts = [], ends = [];
  for (const ch of text) {
    const value = fold(ch);
    normalized += value;
    for (let i = 0; i < value.length; i++) { starts.push(at); ends.push(at + ch.length); }
    at += ch.length;
  }
  return [...normalized.matchAll(/[a-z0-9]+/gu)].map(match => {
    let end = ends[match.index + match[0].length - 1];
    while (end < text.length && /\p{M}/u.test(String.fromCodePoint(text.codePointAt(end)))) end += String.fromCodePoint(text.codePointAt(end)).length;
    return [starts[match.index], end];
  });
}

function paliMatch(cand, refined) {
  const d = load(), ix = buildPaliIndex();
  const first = blockAt(refined.a); const last = blockAt(refined.b - 1);
  if (first.book !== last.book) return null;
  const unit = ownerOf(first.book, first.index, last.index + 1);
  if (!unit) return null;
  const blocks = d.canon.books[first.book].blocks;
  const rendered = segments(unit, { includeSourcePositions: true });
  const start = rendered.findIndex(s => s.source_blocks[0] <= first.index && first.index < s.source_blocks[1]);
  const end = rendered.findIndex(s => s.source_blocks[0] <= last.index && last.index < s.source_blocks[1]);
  if (start < 0 || end < start) throw new Error('The verification window has no readable source segment span.');
  const firstWord = refined.a - ix.blockStart[ix.bookStart[first.book] + first.index];
  const lastWord = refined.b - ix.blockStart[ix.bookStart[last.book] + last.index] - 1;
  const begin = sourceWordSpans(blocks[first.index][2])[firstWord]?.[0];
  const finish = sourceWordSpans(blocks[last.index][2])[lastWord]?.[1];
  if (begin === undefined || finish === undefined) throw new Error('The verification window could not be mapped back to its source words.');
  const excerpt = blocks.slice(first.index, last.index + 1).map((b, i) => b[2].slice(i === 0 ? begin : 0,
    first.index + i === last.index ? finish : undefined)).filter(Boolean).join('\n');
  const previewEnd = excerpt.length > 600 ? sourceWordSpans(excerpt).filter(span => span[1] <= 600).at(-1)?.[1] ?? 0 : excerpt.length;
  const preview = excerpt.slice(0, previewEnd) + (excerpt.length > 600 ? '…' : '');
  const readingCommands = [];
  for (let offset = start; offset <= end; offset += 200) readingCommands.push({ tool: 'get_text', uid: unit.id,
    offset, limit: Math.min(200, end + 1 - offset) });
  const segment = rendered[start], notes = [];
  const alignment = alignmentInfo(unit);
  if (alignment) notes.push(alignment.note);
  if (unit.kind === 'range') notes.push(`The citation index uses the grouped source span ${unit.acronym}; the passage is inside that span.`);
  return {
    text_id: unit.id, citation: unit.acronym, title: unit.title,
    segment_ref: segment.ref, vri_paragraph: segment.vri_paragraph, pts_page_begins: segment.pts_page_begins,
    source_span: { first_segment_ref: segment.ref, last_segment_ref: rendered[end].ref,
      offset: start, end_offset: end + 1, segments: end - start + 1 },
    read_with: readingCommands[0], reading_commands: readingCommands,
    similarity: Math.round(refined.sim * 100) / 100,
    matched_text: preview,
    ...(excerpt.length > 600 ? { matched_text_truncated: true } : {}),
    edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli',
    ...(alignment ? { alignment } : {}),
    ...(notes.length ? { notes } : {}),
  };
}

const paliScope = () => ({
  language: 'pali',
  searched: 'The whole Pāli Tipiṭaka as bundled: VRI Chaṭṭha Saṅgāyana edition, 8,544 texts (Vinaya, Sutta and Abhidhamma Piṭakas). Commentaries (aṭṭhakathā), sub-commentaries and later Pāli literature are not included.',
  attribution: source().attribution,
  terms: source().terms,
});

function verifyPali(text, limit) {
  const q = words(fold(text));
  if (!q.length) throw new Error('The quotation has no Pāli words to match.');
  const corpus = paliCorpus();
  const query = q.join(' ');
  const out = [];
  const seen = new Set();
  const { ranked, truncated } = rankWindows(findWindows(corpus, q), (c) => ({ r: refine(corpus, query, q, c, paliBounds(c.start)) }));
  const ties = countTies(ranked, truncated, ({ r }) => {
    const first = blockAt(r.a), last = blockAt(r.b - 1);
    return first.book === last.book ? ownerOf(first.book, first.index, last.index + 1)?.id : null;
  });
  for (const { c, r } of ranked) {
    const m = paliMatch(c, r);
    if (!m) continue;
    const key = `${m.text_id}/${m.segment_ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
    if (out.length >= limit) break;
  }
  return {
    matches: out,
    ties,
    scope: paliScope(),
  };
}

// Rescue only unchanged substrings actually printed in the bundled canon. Never repair an input
// or convert an unsupported glyph by guessing; source block positions select the reading command.
function literalPaliSource(quote, limit) {
  const d = load(), matches = [], texts = new Set();
  let matchingBlocks = 0;
  for (const [bi, book] of d.canon.books.entries()) for (const [i, block] of book.blocks.entries()) {
    if (!block[2].includes(quote)) continue;
    const unit = ownerOf(bi, i);
    if (!unit) continue;
    const rendered = segments(unit, { includeSourcePositions: true });
    const at = rendered.findIndex(s => s.source_blocks[0] <= i && i < s.source_blocks[1]);
    if (at < 0 || !rendered[at].text.includes(quote)) continue;
    matchingBlocks++; texts.add(unit.id);
    if (matches.length >= limit) continue;
    const seg = rendered[at], alignment = alignmentInfo(unit), notes = [];
    if (alignment) notes.push(alignment.note);
    if (unit.kind === 'range') notes.push(`The citation index uses the grouped source span ${unit.acronym}; the passage is inside that span.`);
    matches.push({ text_id: unit.id, citation: unit.acronym, title: unit.title,
      segment_ref: seg.ref, vri_paragraph: seg.vri_paragraph, pts_page_begins: seg.pts_page_begins,
      similarity: 1, matched_text: block[2].slice(block[2].indexOf(quote), block[2].indexOf(quote) + quote.length),
      edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli', vri_file: book.file,
      read_with: { tool: 'get_text', uid: unit.id, offset: at, limit: 1 },
      ...(alignment ? { alignment } : {}), ...(notes.length ? { notes } : {}) });
  }
  return matches.length ? { matches, ties: { texts: texts.size, at_least: false }, scope: paliScope(),
    source_literal: { matching_blocks: matchingBlocks, returned_blocks: matches.length, query_preserved: true,
      native_conversion: false, source_commit: source().commit } } : null;
}

// ---- English ----------------------------------------------------------------

function englishCorpus(pages) {
  const ids = new Map(); const vocab = []; const tokens = []; const starts = [];
  for (const page of pages) {
    starts.push(tokens.length);
    for (const w of words(englishFold(page.text))) {
      let id = ids.get(w);
      if (id === undefined) { id = vocab.length; ids.set(w, id); vocab.push(w); }
      tokens.push(id);
    }
  }
  starts.push(tokens.length);
  const pos = vocab.map(() => []);
  tokens.forEach((id, i) => pos[id].push(i));
  return {
    tokens: Int32Array.from(tokens), vocab, total: tokens.length, starts, boundaries: Int32Array.from(starts),
    positions: (id) => pos[id], freq: (id) => pos[id].length,
    variants: (w) => {
      const out = [];
      const exact = ids.get(w);
      if (exact !== undefined) out.push({ id: exact, sim: 1 });
      // Light stemming: "hatred"/"hatreds", "conquer"/"conquers"/"conquered".
      for (const alt of [`${w}s`, `${w}es`, `${w}ed`, `${w}d`, w.replace(/(es|s|ed|d)$/, '')]) {
        const id = ids.get(alt);
        if (alt !== w && alt.length > 2 && id !== undefined) out.push({ id, sim: 0.9 });
      }
      return out;
    },
  };
}

/** Resolve one explicit English scope without silently selecting the first of several texts. */
function englishReference(reference) {
  const input = romanizeLookupInput(reference);
  const { unit, notes = [], alternatives = [] } = resolve(input.text);
  const citation = parseCitation(input.text);
  if (citation.kind === 'id' && citation.end !== null && citation.end !== undefined) {
    const first = citationId({ ...citation, end: null });
    const last = citationId({ ...citation, path: rangeEndPath(citation), end: null });
    if (first !== last && citationId(citation) !== unit.id) {
      throw new Error(`"${reference}" spans multiple texts rather than one recorded source group. List each exact text in texts, or choose an indexed source group; no translations were compared.`);
    }
  }
  if (alternatives.length) {
    throw new Error(`"${reference}" maps to multiple canonical passages. Candidates include ${[unit.acronym, ...alternatives.map(u => u.citation)].join(', ')}. Choose an exact text for English verification; no translations were compared.`);
  }
  return { unit, requested: { reference, text_id: unit.id, citation: unit.acronym, ...inputNote(input),
    notes: [...new Set([...notes, ...resolve(unit.id).notes])] } };
}

/** Pages to check for an English quote: one per (text, translator), dhammatalks.org first. */
export function englishScope(texts, { includePartial = false } = {}) {
  if (includePartial && !texts?.length) throw new Error('Partial English verification requires explicit texts and include_partial: true. No default collection was narrowed.');
  let units;
  let label;
  let requested;
  if (texts?.length) {
    const resolved = texts.map(englishReference);
    units = resolved.map(r => r.unit);
    requested = resolved.map(r => r.requested);
    label = units.map((u) => u.acronym).join(', ');
  } else {
    units = load().canon.units.filter((u) => u.collection === DEFAULT_ENGLISH_SCOPE.collection && u.kind === 'range');
    label = DEFAULT_ENGLISH_SCOPE.label;
  }
  const pages = [];
  const byUrl = new Map();
  const withoutEnglish = [];
  const partialOmitted = [];
  for (const [index, unit] of units.entries()) {
    const { links: declaredLinks, via } = linksFor(unit);
    const partialLinks = declaredLinks.filter(isPartial);
    const links = includePartial ? declaredLinks : declaredLinks.filter(link => !isPartial(link));
    if (!includePartial) for (const l of partialLinks) partialOmitted.push({ text_id: unit.id, translation_id: translationId(l), translation_scope: partialScope(l, unit, segments(unit), source()) });
    const owner = via || unit;
    const record = requested?.[index];
    const requestNotes = record ? [...record.notes] : [];
    if (record) {
      record.translation_scope = { text_id: owner.id, citation: owner.acronym,
        kind: !links.length ? (partialLinks.length ? 'partial_excluded' : 'unavailable') : links.every(isPartial) ? 'partial_unit' : via ? 'inherited_container' : 'direct',
        ...(partialLinks.length ? { partial_scopes: partialLinks.map(l => partialScope(l, unit, segments(unit), source())) } : {}) };
      if (via) record.notes.push(`English verification for ${unit.acronym} uses its linked containing source ${owner.acronym}. A match in that source does not verify correspondence to the narrower requested text.`);
    }
    if (!links.length) { withoutEnglish.push(unit.acronym); continue; }
    const seenTranslator = new Set();
    const sorted = [...links].sort((a, b) => (isPartial(a) - isPartial(b)) || (b.source === 'dhammatalks') - (a.source === 'dhammatalks'));
    for (const l of sorted) {
      const translator = l.translator || l.source;
      const declaredScope = partialScope(l, unit, segments(unit), source());
      const who = fold(translator).replace(/[^a-z]/g, '') + (declaredScope ? ':' + declaredScope.scope_sha256 : '');
      const pageOwner = declaredScope ? unit : owner;
      if (seenTranslator.has(who)) continue;
      seenTranslator.add(who);
      const context = record ? { requested_text_ids: [unit.id], scope_notes: [...(declaredScope ? requestNotes : record.notes)],
        ...(via && !declaredScope ? { unverified_requested_text_ids: [unit.id] } : {}) } : {};
      if (declaredScope) { context.translation_scope = declaredScope; context.whole_unit_coverage = false; context.scope_notes = [...(context.scope_notes || []), declaredScope.note]; }
      const pageKey = l.url + (declaredScope ? ':' + declaredScope.scope_sha256 : ':whole');
      const existing = byUrl.get(pageKey);
      if (existing) {
        for (const key of ['requested_text_ids', 'unverified_requested_text_ids', 'scope_notes']) {
          if (context[key]?.length) existing[key] = [...new Set([...(existing[key] || []), ...context[key]])];
        }
        continue;
      }
      const page = { unit: pageOwner, translation_id: translationId(l), translator, url: l.url, ...context };
      pages.push(page); byUrl.set(pageKey, page);
    }
  }
  if (pages.length > MAX_ENGLISH_PAGES) throw new Error(`That scope needs ${pages.length} translation pages; the limit is ${MAX_ENGLISH_PAGES}. Pass fewer texts.`);
  return { label, pages, withoutEnglish, partialOmitted, ...(requested ? { requested_texts: requested } : {}) };
}

async function mapLimit(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

// Request-resolution cautions are separate from the provider's actual-version notes.
function scopeEvidence(page) {
  return { ...Object.fromEntries(['requested_text_ids', 'unverified_requested_text_ids', 'scope_notes']
    .filter(key => page[key]?.length).map(key => [key, page[key]])),
    ...(page.translation_scope ? { translation_scope: page.translation_scope, whole_unit_coverage: false } : {}) };
}

// Matches and checked-source records must describe the version actually read, including labelled fallback.
function englishVersion(page) {
  return {
    translator: page.translator, translation_id: page.translation_id, url: page.url,
    ...(page.requested_translation_id ? { requested_translation_id: page.requested_translation_id } : {}),
    ...(page.notes?.length ? { notes: page.notes } : {}),
    ...scopeEvidence(page),
  };
}

async function verifyEnglish(text, texts, limit, fetchTranslation, includePartial) {
  const q = words(englishFold(text));
  if (!q.length) throw new Error('The quotation has no words to match.');
  const plan = englishScope(texts, { includePartial });
  if (!plan.pages.length && plan.partialOmitted.length) throw new Error('Only partial English sources are available. Review their metadata, then use explicit texts with include_partial: true. No whole-unit comparison was performed.');
  const fetched = await mapLimit(plan.pages, 6, async (p) => {
    try {
      const t = await fetchTranslation(p.unit, p.translation_id, { limit: 2000000, ...(p.translation_scope ? { allow_partial: true, scope_sha256: p.translation_scope.scope_sha256 } : {}) });
      if ((p.translation_scope?.scope_sha256 || null) !== (t.translation_scope?.scope_sha256 || null) || (p.translation_scope && scopeHash(p.translation_scope) !== scopeHash(t.translation_scope))) throw new Error('Retrieved translation scope differs from the planned scope; no quotation was compared.');
      if (p.translation_scope && (t.translation_id !== p.translation_id || t.url !== p.url
        || typeof t.text !== 'string' || scopeHash(t.text) !== p.translation_scope.text_sha256 || t.next_offset != null)) {
        throw new Error('Partial source version/snapshot changed or is incomplete; no quotation was compared.');
      }
      if (t.whole_unit_coverage === false && !t.translation_scope) throw new Error('Partial source omitted its declared scope; no quotation was compared.');
      const actualId = t.translation_id || p.translation_id;
      return { ...p, translation_id: actualId,
        ...(actualId !== p.translation_id ? { requested_translation_id: p.translation_id } : {}),
        text: t.text, attribution: t.attribution, license: t.license, translator: t.translator || p.translator, url: t.url || p.url, notes: t.notes };
    } catch (error) { return { ...p, error: error.message }; }
  });
  const pages = fetched.filter((p) => !p.error);
  const failed = fetched.filter((p) => p.error);
  if (!pages.length) throw new Error(`None of the translations in scope could be retrieved (${failed[0]?.error || 'no pages'}). Try again later, or check a Pāli quotation offline.`);
  const corpus = englishCorpus(pages);
  const query = q.join(' ');
  const matches = [];
  const { ranked, truncated } = rankWindows(findWindows(corpus, q), (c) => {
    let page = 0;
    while (corpus.starts[page + 1] <= c.start) page += 1;
    return { page, r: refine(corpus, query, q, c, { min: corpus.starts[page], max: corpus.starts[page + 1] }) };
  });
  const ties = countTies(ranked, truncated, ({ page }) => pages[page].unit.id);
  const seen = new Set();
  for (const { page, r } of ranked) {
    const p = pages[page];
    const key = `${p.translation_id}:${Math.round(r.a / 20)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const matched = Array.from(corpus.tokens.subarray(r.a, r.b), (id) => corpus.vocab[id]).join(' ');
    matches.push({
      text_id: p.unit.id, citation: p.unit.acronym, title: p.unit.title,
      ...englishVersion(p),
      similarity: Math.round(r.sim * 100) / 100,
      matched_words: matched, // normalised words from the translation, for checking; read the full page at the URL
      attribution: p.attribution, license: p.license,
    });
    if (matches.length >= limit) break;
  }
  return {
    matches,
    ties,
    scope: {
      language: 'english',
      searched: `English translations linked to ${plan.label}: ${pages.length} page(s).`,
      ...(plan.requested_texts ? { requested_texts: plan.requested_texts } : {}),
      translations_checked: pages.map((p) => ({ citation: p.unit.acronym, ...englishVersion(p) })),
      ...(failed.length ? { not_retrieved: failed.map((p) => ({ citation: p.unit.acronym, translator: p.translator, translation_id: p.translation_id, url: p.url, error: p.error, ...scopeEvidence(p) })) } : {}),
      ...(plan.partialOmitted.length ? { partial_translations_excluded: plan.partialOmitted } : {}),
      ...(plan.withoutEnglish.length ? { no_english_linked: plan.withoutEnglish } : {}),
      note: 'Only these translations were compared. Popular English wordings are often older or freer translations, and two translations of the same verse can share few words: check the Pāli as well (verify_quote with language "pali").',
    },
  };
}

// ---- public ---------------------------------------------------------------

// Common English words that are not Pāli words, so most English quotations are recognised without building the
// Pāli index (a few seconds and tens of MB the first time). Pāli look-alikes (na, ca, me, so, te, no, yo, hi) are left out.
const ENGLISH_WORDS = new Set(('the and is are was were be been of to you your a an not with in into that this these those it its '
  + 'what which who by for from will would shall should can cannot could all we our us they them their there than '
  + 'as at do does did have has had my if but or when where only his her he she i nothing everything one own every '
  + 'how why more most never always').split(' '));

export function detectLanguage(text) {
  const input = romanizeLookupInput(text);
  if (input.original) return 'pali';
  text = input.text;
  if (PALI_HINT.test(text)) return 'pali';
  const q = words(fold(text));
  if (!q.length) return 'english';
  if (q.length >= 3 && q.filter((w) => ENGLISH_WORDS.has(w)).length / q.length >= 0.2) return 'english';
  const ix = buildPaliIndex();
  const known = q.filter((w) => ix.ids.has(w) || (w.length >= 5 && paliVariants(w).some((v) => v.sim >= 0.75))).length;
  return known / q.length >= 0.75 ? 'pali' : 'english';
}

function verdictFor(best) {
  if (best >= THRESHOLDS.found) return 'found';
  if (best >= THRESHOLDS.close_paraphrase) return 'close_paraphrase';
  return 'not_found_in_scope';
}

const EXPLAIN = {
  found: 'The quotation meets the normalized similarity threshold for the text cited below. Compare the source wording; this does not establish verbatim wording or authorship.',
  close_paraphrase: 'Similar wording was found below the match threshold. Compare the quotation with the cited source; this does not establish verbatim wording.',
  not_found_in_scope: 'No matching passage was found in the texts searched (see scope). This only describes those texts: the saying may come from a commentary, a later work, another translation, or a modern author.',
  not_found_in_scope_english: 'No translation searched has this wording (see scope). This is not a finding about the saying itself. Popular English wordings are often older or freer translations of a real verse, which can share few words with the translations searched: check the Pāli of the passage (see next_step), or name other texts in `texts`. A saying may also come from a commentary, a later work or a modern author.',
};
const NEXT_STEP_ENGLISH = 'To check whether this is a translation of a real passage, find the Pāli (for example with search_texts or get_text) and run verify_quote on it with language "pali": the Pāli check covers the whole bundled Tipiṭaka, offline.';

function tieNote(ties) {
  if (!ties || ties.texts < 2) return undefined;
  return `This wording matches ${ties.at_least ? 'at least ' : ''}${ties.texts} texts equally well (a stock or repeated passage). The matches listed are the first in canon order, not a unique source: quote more of the passage, or check the text you have in mind.`;
}

/**
 * Verify a quotation. `language`: 'pali' | 'english' | 'auto'. `texts`: citations limiting the English scope
 * (default: the Dhammapada). `fetchTranslation` is injectable for tests (defaults to english.translation).
 */
export async function verifyQuote({ text, language = 'auto', texts, limit = 5, include_partial = false }, { fetchTranslation = englishModule.translation } = {}) {
  const quote = String(text ?? '').trim();
  if (quote.length < 8) throw new Error('Give at least a few words of the quotation.');
  let input, literal;
  try { input = romanizeLookupInput(quote); }
  catch (error) {
    if (['auto', 'pali'].includes(language) && [...quote].some(ch => /\p{L}/u.test(ch) && /\p{Script=Latin}/u.test(ch))) literal = literalPaliSource(quote, limit);
    if (!literal) throw error;
    input = { text: quote, script: 'roman' };
  }
  if (input.original && language === 'english') throw new Error('Native-script quotation input is supported as Pāli. Choose language pali or auto; English mode requires an English quotation in Roman script.');
  const comparisonText = input.text.trim();
  const lang = language === 'auto' || !language ? (input.original || literal ? 'pali' : detectLanguage(comparisonText)) : language;
  if (include_partial && lang !== 'english') throw new Error('include_partial applies only to English quotation verification.');
  const comparisonWords = words(lang === 'pali' ? fold(comparisonText) : englishFold(comparisonText));
  if (comparisonWords.length > MAX_QUERY_WORDS) throw new Error(`Give at most ${MAX_QUERY_WORDS} words. Split a longer quotation into shorter excerpts; no partial comparison was performed.`);
  if (lang === 'pali' && !comparisonWords.length) throw new Error('The quotation has no Pāli words to match.');
  const result = literal || (lang === 'pali' ? verifyPali(comparisonText, limit) : await verifyEnglish(comparisonText, texts, limit, fetchTranslation, include_partial));
  const best = result.matches[0]?.similarity ?? 0;
  const verdict = literal ? 'found' : verdictFor(best);
  const notFoundEnglish = verdict === 'not_found_in_scope' && lang === 'english';
  const note = verdict === 'not_found_in_scope' ? undefined : tieNote(result.ties);
  const partialNote = lang === 'english' && result.scope.translations_checked?.some(p => p.translation_scope?.kind === 'partial_unit') ? ' Partial translation results apply only to their declared spans, including a negative result. Whole-unit coverage or absence and word-level Pāli alignment are not inferred.' : '';
  const containerNote = lang === 'english' && verdict !== 'not_found_in_scope' && result.matches[0]?.unverified_requested_text_ids?.length
    ? ' The match is in a linked containing source; correspondence to the narrower requested text is not verified.' : '';
  return {
    quote, ...inputNote(input), language: lang, verdict, explanation: literal ? 'The quotation occurs as an unchanged substring in the bundled VRI canonical source shown below. Mixed-script source characters were kept, not converted or corrected. This does not establish correct spelling, a unique source or authorship.' : EXPLAIN[notFoundEnglish ? 'not_found_in_scope_english' : verdict] + containerNote + partialNote,
    best_similarity: best,
    ...(literal ? { source_literal: literal.source_literal } : {}),
    comparison: { method: literal ? 'literal_source_substring' : 'normalized_fuzzy', verbatim: 'not_assessed',
      note: literal ? 'The unchanged quotation was located in a readable canonical source segment before comparison. No spelling repair or native conversion was used. This establishes source-substring presence, not source-edition correctness, native-edition collation or authorship.' : 'Case, diacritics and punctuation are normalized; Pāli spacing is also normalized. Native Pāli input is transliterated to Roman first. Even a similarity of 1 does not establish verbatim wording, a unique source or authorship.' },
    ...(note ? { equally_similar_texts: result.ties.texts, equally_similar_at_least: result.ties.at_least, citation_note: note } : {}),
    ...(notFoundEnglish ? { next_step: NEXT_STEP_ENGLISH } : {}),
    matches: verdict === 'not_found_in_scope' ? result.matches.slice(0, 3) : result.matches,
    scope: result.scope,
    thresholds: literal ? { measure: 'Unchanged source-substring presence; no fuzzy similarity threshold was applied.' } : { ...THRESHOLDS, measure: 'Dice coefficient of character trigrams (diacritics and punctuation removed), weighted by the share of the quotation’s distinctive words the passage contains; see docs/verify-quote.md' },
    guidance: 'Report only what the texts searched contain. This result describes those texts; it is not a judgement about who said the words.',
  };
}

export function register({ tool, z }) {
  tool('verify_quote', 'Check whether a quotation attributed to the Buddha appears in the texts: a Pāli quotation is matched (fuzzily) against the whole bundled Pāli Tipiṭaka offline; an English one against the linked English translations of the texts you name (default: the Dhammapada), fetched live. If an otherwise unconvertible quotation occurs unchanged in the bundled canon, source-substring presence is reported separately with exact reading commands; spelling and native-edition correctness are not inferred. Pāli matches provide source-position reading commands covering their complete segment span. Returns the best matches with citation and similarity, a verdict (found, close_paraphrase, not_found_in_scope) and exactly what was searched.', {
    text: z.string().trim().min(8).max(2000).describe('The quotation to check: Pāli in Roman or a supported native script (converted and labelled), or English in Roman script. At most 120 comparison words and 2,000 input characters; split longer quotations into shorter excerpts.'),
    language: z.enum(['auto', 'pali', 'english']).default('auto').describe('Language of the quotation; "auto" detects Roman input and treats supported native-script input as Pāli. This is mechanical transliteration, not translation. Native input with explicit English mode is refused.'),
    texts: z.array(z.string().min(1).max(300)).max(12).optional().describe('English only: exact citations or indexed source groups whose linked translations to search, in Roman or supported native script. Multi-text fallback spans and ambiguous pages are refused before fetching. Inherited containing-source matches do not verify the narrower requested text. Default: all Dhammapada chapters.'),
    include_partial: z.boolean().default(false).describe('English only, with explicit texts: opt into separately labelled reviewed partial-unit translations. They do not establish whole-unit coverage.'),
    limit: z.number().int().min(1).max(10).default(5),
  }, (args) => verifyQuote(args), { network: true });
}
