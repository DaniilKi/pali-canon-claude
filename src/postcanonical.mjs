import { searchSegments, searchFold, searchExcerpt, searchTerms, romanizeSearchInput, searchInputNote, searchReading, hasSearchPhrase, isSourcePhrase } from './search-segments.mjs';
import { readBundled, bundledExists } from './bundled-data.mjs';
/**
 * Post-canonical Pāli books of the VRI Chaṭṭha Saṅgāyana edition: the sub-commentaries (Ṭīkā) and the
 * "Añña" (other) books, among them the Visuddhimagga and the Abhidhammatthasaṅgaha. Built by
 * scripts/canon/build_postcanonical.py. None of it is the canon: every result carries canonical: false,
 * a label, and VRI's attribution, and the canon search leaves these books out unless asked.
 *
 * Data: server/data/postcanonical.json.gz, all 109 books with their full text, bundled and loaded lazily on
 * first use. Everything works offline; nothing is downloaded and nothing is written to disk.
 *
 * Citations (docs/citations.md): Vism ch. 1 / Vism I (chapter), Vism 1.1 / Vism I,1 (chapter, paragraph in
 * Ñāṇamoli's numbering: the chapter is located, the paragraph only when it is the first), Vism §19 and
 * VRI's own "visuddhi. 1.19" (VRI paragraph), Abhidh-s 1 (chapter), Abhidh-s 1.4 (chapter, VRI section),
 * and any book id ("mahavamsa", "mahavamsa 3", "mahavamsa 3.12"). Visuddhimagga PTS pages ("Vism p. 3",
 * "Vism 3") are recognised but cannot be located: the VRI edition carries no PTS page breaks for it.
 */
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withNormalised } from './input.mjs';
import { romanizeInput, localizePostCanonical, SCRIPT_DESCRIPTION, scriptName } from './script.mjs';

let here;
try { here = __dirname; } catch { here = dirname(fileURLToPath(import.meta.url)); }

export const FILE = 'postcanonical.json.gz';
export const LABELS = {
  'Ṭīkā': 'Post-canonical, not the canon: a book from the VRI Ṭīkā section (sub-commentaries on the canon and its commentaries, and Abhidhamma and Vinaya manuals). Keep it distinct from the root text and from the commentary (Aṭṭhakathā) when quoting.',
  'Añña': 'Post-canonical, not the canon: a book from the VRI "Añña" (other books) section, such as the Visuddhimagga, its Mahāṭīkā, chronicles, grammars and later Pāli works. Keep it distinct from the canonical texts when quoting.',
};
const WORK_LABELS = {
  vism: 'Visuddhimagga ("The Path of Purification"), a post-canonical manual traditionally attributed to Buddhaghosa. Not the canon.',
  'abhidh-s': 'Abhidhammatthasaṅgaha, a post-canonical Abhidhamma manual traditionally attributed to Ācariya Anuruddha. Not the canon.',
};
export const SEARCH_OPTION_DESCRIPTION = 'Also search the post-canonical books (Visuddhimagga, Abhidhammatthasaṅgaha, sub-commentaries/Ṭīkā), returned separately under post_canonical and labelled canonical: false. Ignored when collection is set (a collection limits the search to the canon). Titles and excerpts follow script like the canon results; citations stay Roman. Default false: only the canon is searched.';

const HEADING = new Set(['subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead']);
const CENTRE_HEADING = /(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$/i;
const VERSE = new Set(['gatha1', 'gatha2', 'gatha3', 'gathalast']);
const ED_KEYS = { P: 'pts', M: 'myanmar', V: 'vri', T: 'thai' };

export const fold = (value) => String(value ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/ṁ/g, 'm').replace(/\s+/g, ' ').trim();

const PARA = /^(\d+)(?:\s*[-–]\s*(\d+))?$/;
/** A VRI paragraph number ("12", "105-106", "105-6") as [first, last], or null. */
export function paraRange(n) {
  const m = String(n ?? '').trim().match(PARA);
  if (!m) return null;
  const a = Number(m[1]);
  let tail = m[2] ?? m[1];
  if (tail.length < m[1].length) tail = m[1].slice(0, m[1].length - tail.length) + tail;
  const b = Number(tail);
  return b >= a && a > 0 ? [a, b] : null;
}

const ROMAN = { i: 1, v: 5, x: 10, l: 50 };
function roman(s) {
  if (!/^[ivxl]+$/i.test(s)) return null;
  let total = 0;
  const v = s.toLowerCase().split('').map((c) => ROMAN[c]);
  for (let i = 0; i < v.length; i += 1) total += v[i] < (v[i + 1] || 0) ? -v[i] : v[i];
  return total;
}
const number = (s) => (/^\d+$/.test(s) ? Number(s) : roman(s));

// ---- data ----------------------------------------------------------------------------------------

let data = null;

function dataPath() {
  const candidates = [join(here, 'data', FILE), join(here, '..', 'server', 'data', FILE), join(process.cwd(), 'server', 'data', FILE)];
  return candidates.find((p) => bundledExists(p)) || null;
}

/** Load the bundled books once. Returns null when the data file is not installed. */
export function load() {
  if (data) return data;
  const path = dataPath();
  if (!path) return null;
  const d = JSON.parse(gunzipSync(readBundled(path)).toString('utf8'));
  d.byId = new Map();
  d.byKey = new Map();
  d.byTitle = new Map();
  for (const b of d.books) {
    b.canonical = false;
    d.byId.set(b.id, b);
    for (const key of [b.id, fold(b.file.replace(/\..*$/, ''))]) d.byKey.set(key, b);
    const title = fold(b.title).replace(/\s+/g, '-');
    if (!d.byTitle.has(title)) d.byTitle.set(title, []);
    d.byTitle.get(title).push(b);
  }
  data = d;
  return data;
}

function need() {
  const d = load();
  if (!d) throw new Error('The post-canonical data file (postcanonical.json.gz) is not installed with this copy of the server. Reinstall it, or read the canon with get_text.');
  return d;
}

// ---- sections ------------------------------------------------------------------------------------

/**
 * Block index where the work containing `start` ends: the next 'book' heading after it that starts a further
 * work in the same file (the first such heading is the file's own title), or the end of the file.
 */
function workEnd(book, start) {
  const next = (book.works || []).slice(1).find(([, i]) => i > start);
  return next ? next[1] : book.block_count;
}

/** Chapter k (1-based) of a book as [start, end), using its 'chapter' headings. */
function chapterRange(book, k, { fromStart = false } = {}) {
  const ch = book.chapters[k - 1];
  if (!ch) return null;
  const start = fromStart && k === 1 ? 0 : ch[1];
  // A heading directly followed by another chapter heading groups what follows (VRI marks both as chapters):
  // it runs on to the end of the first chapter under it, so it never comes back empty.
  let j = k;
  while (book.chapters[j] && book.chapters[j][1] === book.chapters[j - 1][1] + 1) j += 1;
  const nextCh = book.chapters[j] ? book.chapters[j][1] : book.block_count;
  return { start, end: Math.min(nextCh, workEnd(book, ch[1])), title: ch[0], ...(j > k ? { groups: true } : {}) };
}

const VISM_BOOKS = ['visuddhimagga-1', 'visuddhimagga-2'];
/** The 23 Visuddhimagga chapters across its two VRI volumes. */
function vismChapters(d) {
  if (d.vismChapters) return d.vismChapters;
  const out = [];
  for (const id of VISM_BOOKS) {
    const book = d.byId.get(id);
    book.chapters.forEach((ch, i) => {
      const r = chapterRange(book, i + 1, { fromStart: id === VISM_BOOKS[0] });
      out.push({ book, ...r });
    });
  }
  d.vismChapters = out;
  return out;
}

const paraIndexes = new WeakMap();
/** Block indexes carrying each VRI paragraph number, in order (a range "105-106" is listed under both). */
function paraIndex(blocks) {
  let index = paraIndexes.get(blocks);
  if (index) return index;
  index = new Map();
  blocks.forEach(([, n], i) => {
    const r = paraRange(n);
    if (!r) return;
    for (let p = r[0]; p <= Math.min(r[1], r[0] + 1000); p += 1) {
      if (!index.has(p)) index.set(p, []);
      index.get(p).push(i);
    }
  });
  paraIndexes.set(blocks, index);
  return index;
}

/**
 * Paragraph search within [start, end) of a book's blocks: the first block numbered `p`, with the headings just
 * before it, up to the next numbered block or chapter/work heading, less any trailing headings (they belong to the
 * next paragraph). citationFor() relies on these boundaries.
 */
function paragraphRange(blocks, start, end, p) {
  const i = (paraIndex(blocks).get(p) || []).find((j) => j >= start && j < end);
  if (i === undefined) return null;
  {
    let s = i;
    // A heading just before the numbered block belongs to it.
    while (s > start && HEADING.has(blocks[s - 1][0]) && !paraRange(blocks[s - 1][1])) s -= 1;
    let e = i + 1;
    while (e < end && !paraRange(blocks[e][1])) {
      if (blocks[e][0] === 'chapter' || blocks[e][0] === 'book') break;
      e += 1;
    }
    // Trailing headings belong to the next paragraph.
    while (e - 1 > i && HEADING.has(blocks[e - 1][0])) e -= 1;
    return { start: s, end: e, para: blocks[i][1] };
  }
}

// ---- citation parsing ----------------------------------------------------------------------------

class CitationError extends Error {}

const VISM = /^(?:vism|visuddhimagg[ao]|vsm)\.?(?:\s+|$)(.*)$/;
const VISUDDHI = /^visuddhi\.\s*([12])\s*\.\s*(\d+)$/;
// The book id "abhidhammatthasangaho" (the whole VRI file, with the Abhidhammatthavibhāvinī) is not this pattern.
const ABHS = /^(?:abhidh-?s|abhidh\.?\s*s\.?|abh-?s|abhidhammatthasa[n]gaha)\.?(?:\s+|$)(.*)$/;

export const PTS_UNAVAILABLE = 'The Visuddhimagga is cited by PTS page ("Vism 3" = page 3 of the PTS edition), but the VRI edition bundled here carries no PTS page breaks for it (only Myanmar and VRI pages), and no openly licensed PTS-page concordance is available (the PTS text on GRETIL was declined, docs/sources.md). The page cannot be located without guessing, so no passage is given. Cite a chapter instead ("Vism ch. 4" or "Vism IV"), a chapter and paragraph ("Vism IV.1"), or a VRI paragraph ("Vism §51").';

/**
 * Is this a post-canonical citation? Cheap check used before falling back from the canon resolver, so canon
 * citations are never shadowed.
 */
export function isPostCanonical(reference) {
  const f = fold(reference);
  if (!f) return false;
  if (VISM.test(f) || VISUDDHI.test(f) || ABHS.test(f)) return true;
  const d = load();
  if (!d) return false;
  return !!bookFor(d, f);
}

const TAIL = /^(.+?)\s+((?:ch\.?\s*|§\s*|para\.?\s*)?[\divxl]+(?:\s*[.,:]\s*\d+)?)$/;
function keyed(d, key) {
  const normal = key.replace(/\s+/g, '-');
  // Catalogue IDs and file stems identify one source; titles can name different books.
  const exact = d.byKey.get(key) || d.byKey.get(normal);
  if (exact) return exact;
  const books = d.byTitle.get(normal) || [];
  if (books.length > 1) throw new CitationError(`Post-canonical title "${key}" is ambiguous: it names ${books.map((b) => b.id).join(', ')}. Use one exact catalogue ID or VRI file stem to choose the source book.`);
  return books[0] || null;
}
/** A book id, VRI file stem or title, optionally followed by a chapter / paragraph: { book, rest } or null. */
function splitKey(d, f) {
  const whole = keyed(d, f);
  if (whole) return { book: whole, rest: '' };
  const m = f.match(TAIL);
  const book = m && keyed(d, m[1].trim());
  return book ? { book, rest: m[2].trim() } : null;
}
function bookFor(d, f) {
  return splitKey(d, f)?.book || null;
}

/**
 * Parse and locate a post-canonical citation. Returns a selection
 * { work, book, start, end, citation, title, kind, approximate?, notes, paragraph? } (end exclusive), with
 * `pendingParagraph` for a generic paragraph citation (located by settle(); use select() for the final range).
 * Throws CitationError for a recognised citation that cannot be located; returns null when not post-canonical.
 */
export function locate(reference) {
  const d = need();
  const f = fold(reference);
  // A complete catalogue identity is more specific than a work-name prefix (e.g. its Nidānakathā).
  const hit = splitKey(d, f);
  if (hit) return locateGeneric(d, hit.book, hit.rest, reference);
  let m;
  if ((m = f.match(VISUDDHI))) return vismParagraph(d, Number(m[2]), { volume: Number(m[1]), written: reference });
  if ((m = f.match(VISM))) return locateVism(d, m[1].trim(), reference);
  if ((m = f.match(ABHS))) return locateAbhs(d, m[1].trim(), reference);
  return null;
}

function locateVism(d, rest, written) {
  const chapters = vismChapters(d);
  const chapter = (k, extra = {}) => {
    const c = chapters[k - 1];
    if (!c) throw new CitationError(`The Visuddhimagga has 23 chapters; "${written}" asks for chapter ${k}.`);
    return { work: 'vism', book: c.book, start: c.start, end: c.end, title: c.title, kind: 'chapter', chapter: k, citation: `Vism ch. ${k}`, notes: [], ...extra };
  };
  if (!rest) {
    return { work: 'vism', book: d.byId.get(VISM_BOOKS[0]), start: 0, end: d.byId.get(VISM_BOOKS[0]).block_count, title: 'Visuddhimaggo (volume 1)', kind: 'work', citation: 'Vism', notes: ['The Visuddhimagga has 23 chapters in two VRI volumes; cite a chapter ("Vism ch. 4", "Vism IV") to read one. This is volume 1 (chapters 1–11).'], chapters: chapters.map((c, i) => ({ citation: `Vism ch. ${i + 1}`, title: c.title })) };
  }
  let m;
  if ((m = rest.match(/^pp?\.?\s*(\d+)(?:\s*[-–]\s*\d+)?$/)) || (m = rest.match(/^(\d+)$/))) throw new CitationError(PTS_UNAVAILABLE);
  if ((m = rest.match(/^(?:ch\.?|chapter)\s*(\d+|[ivxl]+)$/)) || (m = rest.match(/^([ivxl]+)$/))) return chapter(number(m[1]));
  if ((m = rest.match(/^(?:§|para\.?|paragraph|vri)\s*(\d+)$/))) return vismParagraph(d, Number(m[1]), { written });
  if ((m = rest.match(/^(\d+|[ivxl]+)\s*[.,:]\s*(\d+)$/))) {
    const k = number(m[1]);
    const p = Number(m[2]);
    if (!(p > 0)) throw new CitationError('Give a positive paragraph number. Paragraph 0 does not identify a Visuddhimagga passage.');
    if (p === 1) {
      return chapter(k, { citation: `Vism ${k}.1`, kind: 'chapter-start', notes: [`Vism ${k}.1 is the first paragraph of chapter ${k} (Ñāṇamoli's chapter.paragraph numbering, as in The Path of Purification). ${k === 1 ? 'Chapter 1 is returned from the start of the book: four heading lines come first (the homage "Namo tassa…", the title "Visuddhimaggo", the volume line and "Nidānādikathā"), then paragraph 1, the opening verse "Sīle patiṭṭhāya…". VRI prints the heading "1. Sīlaniddeso" later, after the introduction.' : 'The chapter is returned from its start: its heading (and any section heading under it) comes first, then paragraph 1.'}`] });
    }
    return chapter(k, {
      citation: `Vism ${k}.${p}`, kind: 'chapter', approximate: true,
      notes: [`"${written}" is chapter ${k}, paragraph ${p} in Ñāṇamoli's numbering (The Path of Purification). The VRI edition numbers its paragraphs differently (continuously through the book, and much more coarsely), and no open concordance between the two numberings is bundled, so the paragraph cannot be located exactly: the whole of chapter ${k} is returned from its start. Search for a phrase of the passage, or cite a VRI paragraph ("Vism §N").`],
    });
  }
  throw new CitationError(`Unrecognised Visuddhimagga citation "${written}". Use a chapter ("Vism ch. 4", "Vism IV"), chapter and paragraph ("Vism IV.1"), or a VRI paragraph ("Vism §51", or VRI's own form "visuddhi. 1.51").`);
}

function vismParagraph(d, p, { volume, written }) {
  for (const [vi, id] of VISM_BOOKS.entries()) {
    const book = d.byId.get(id);
    const r = paragraphRange(book.blocks, 0, book.block_count, p);
    if (!r) continue;
    if (volume && volume !== vi + 1) throw new CitationError(`VRI paragraph ${p} of the Visuddhimagga is in volume ${vi + 1}, not volume ${volume} ("${written}").`);
    const chapters = vismChapters(d);
    const k = chapters.findIndex((c) => c.book === book && r.start >= c.start && r.start < c.end) + 1;
    return { work: 'vism', book, start: r.start, end: r.end, kind: 'paragraph', paragraph: r.para, citation: `Vism §${p}`, title: k ? chapters[k - 1].title : book.title, chapter: k || undefined,
      notes: [`VRI paragraph ${r.para} (volume ${vi + 1}). VRI numbers the Visuddhimagga's paragraphs continuously, 1–896, and VRI's own cross-references write it "visuddhi. ${vi + 1}.${p}" (volume.paragraph); this is not Ñāṇamoli's chapter.paragraph numbering.`] };
  }
  throw new CitationError(`The Visuddhimagga has no VRI paragraph ${p} (the numbering runs 1–896).`);
}

const ABHS_BOOK = 'abhidhammatthasangaho';
function locateAbhs(d, rest, written) {
  const book = d.byId.get(ABHS_BOOK);
  const saṅgahaEnd = workEnd(book, 0);
  const nChapters = book.chapters.filter(([, i]) => i < saṅgahaEnd).length;
  const chapter = (k) => {
    if (!(k >= 1 && k <= nChapters)) throw new CitationError(`The Abhidhammatthasaṅgaha has ${nChapters} chapters; "${written}" asks for chapter ${k}.`);
    return chapterRange(book, k, { fromStart: true });
  };
  if (!rest) {
    return { work: 'abhidh-s', book, start: 0, end: saṅgahaEnd, title: 'Abhidhammatthasaṅgaho', kind: 'work', citation: 'Abhidh-s', notes: [`The Abhidhammatthasaṅgaha has ${nChapters} chapters; cite one as "Abhidh-s 1".`],
      chapters: Array.from({ length: nChapters }, (_, i) => ({ citation: `Abhidh-s ${i + 1}`, title: book.chapters[i][0] })) };
  }
  let m;
  if ((m = rest.match(/^(?:ch\.?|chapter)?\s*(\d+|[ivxl]+)$/))) {
    const k = number(m[1]);
    const r = chapter(k);
    return { work: 'abhidh-s', book, ...r, kind: 'chapter', chapter: k, citation: `Abhidh-s ${k}`, notes: k === 1 ? ['Chapter 1 is given with the opening verses (sections 1–2) that precede its heading.'] : [] };
  }
  if ((m = rest.match(/^(\d+|[ivxl]+)\s*[.,:§]\s*(\d+)$/))) {
    const k = number(m[1]);
    const p = Number(m[2]);
    const r = chapter(k);
    const pr = paragraphRange(book.blocks, r.start, r.end, p);
    if (!pr) throw new CitationError(`Chapter ${k} of the Abhidhammatthasaṅgaha (${r.title}) has no section ${p} in the VRI numbering.`);
    return { work: 'abhidh-s', book, start: pr.start, end: pr.end, title: r.title, kind: 'paragraph', chapter: k, paragraph: pr.para, citation: `Abhidh-s ${k}.${p}`,
      notes: ['Sections are VRI\'s paragraph numbers, which restart in each chapter. Other editions and translations (for example Bhikkhu Bodhi\'s Comprehensive Manual of Abhidhamma) number their sections themselves; check the text before citing their numbers.'] };
  }
  throw new CitationError(`Unrecognised Abhidhammatthasaṅgaha citation "${written}". Use a chapter ("Abhidh-s 1") or chapter and section ("Abhidh-s 1.4").`);
}

function locateGeneric(d, book, rest, written) {
  const base = { work: book.id, book, notes: [] };
  if (!rest) return { ...base, start: 0, end: book.block_count, title: book.title, kind: 'book', citation: book.id, chapters: book.chapters.map(([t], i) => ({ citation: `${book.id} ${i + 1}`, title: t })) };
  let m;
  if ((m = rest.match(/^(?:ch\.?\s*)?(\d+|[ivxl]+)$/))) {
    const k = number(m[1]);
    const r = chapterRange(book, k);
    if (!r) throw new CitationError(`${book.title} has ${book.chapters.length} chapter heading(s) in the VRI edition; "${written}" asks for chapter ${k}.`);
    return { ...base, ...r, kind: 'chapter', chapter: k, citation: `${book.id} ${k}`,
      notes: r.groups ? [`"${r.title}" is a heading over the chapters that follow it; the text runs to the end of the first of them (${book.id} ${k + 1}).`] : [] };
  }
  if ((m = rest.match(/^(\d+|[ivxl]+)\s*[.,:]\s*(\d+)$/))) {
    const k = number(m[1]);
    const r = chapterRange(book, k);
    if (!r) throw new CitationError(`${book.title} has ${book.chapters.length} chapter heading(s) in the VRI edition; "${written}" asks for chapter ${k}.`);
    return { ...base, start: r.start, end: r.end, title: r.title, kind: 'paragraph', chapter: k, pendingParagraph: Number(m[2]), citation: `${book.id} ${k}.${m[2]}` };
  }
  if ((m = rest.match(/^(?:§|para\.?)\s*(\d+)$/))) {
    return { ...base, start: 0, end: book.block_count, title: book.title, kind: 'paragraph', pendingParagraph: Number(m[1]), wholeBook: true, citation: `${book.id} §${m[1]}` };
  }
  throw new CitationError(`Unrecognised citation "${written}" for ${book.title}. Use "${book.id}", "${book.id} <chapter>", "${book.id} <chapter>.<VRI paragraph>" or "${book.id} §<VRI paragraph>".`);
}

/** Resolve a generic paragraph citation left pending by locate(). */
function settle(sel, blocks) {
  if (sel.pendingParagraph === undefined) return sel;
  const p = sel.pendingParagraph;
  if (!(p > 0)) throw new CitationError('Give a positive VRI paragraph number. Paragraph 0 does not identify a passage.');
  const scopedHits = (paraIndex(blocks).get(p) || []).filter((i) => i >= sel.start && i < sel.end);
  if (!sel.wholeBook && scopedHits.length > 1) {
    throw new CitationError(`${sel.title} restarts its paragraph numbers within this chapter: VRI paragraph ${p} occurs ${scopedHits.length} times. No occurrence was selected. Read the chapter ("${sel.book.id} ${sel.chapter}") or search for a phrase to locate the passage.`);
  }
  if (sel.wholeBook) {
    const hits = paraIndex(blocks).get(p) || [];
    if (!hits.length) throw new CitationError(`${sel.book.title} has no VRI paragraph ${p}.`);
    if (hits.length > 1) {
      const where = hits.slice(0, 8).map((i) => { const k = sel.book.chapters.filter(([, s]) => s <= i).length; return k ? `${sel.book.id} ${k}.${p}` : null; }).filter(Boolean);
      throw new CitationError(`${sel.book.title} restarts its paragraph numbers, so §${p} occurs ${hits.length} times. Give the chapter: ${[...new Set(where)].join(', ') || `${sel.book.id} <chapter>.${p}`}.`);
    }
  }
  const pr = paragraphRange(blocks, sel.start, sel.end, p);
  if (!pr) throw new CitationError(`${sel.title} has no VRI paragraph ${p}${sel.chapter ? ` in chapter ${sel.chapter}` : ''}.`);
  const k = sel.book.chapters.filter(([, s]) => s <= pr.start).length;
  return { ...sel, start: pr.start, end: pr.end, paragraph: pr.para, chapter: sel.chapter || k || undefined, pendingParagraph: undefined };
}

/**
 * Locate a citation down to its final block range: { book, start, end, ... } (end exclusive). Throws for a citation
 * that is recognised but cannot be located; returns null when it is not post-canonical.
 */
export function select(reference) {
  const sel = locate(reference);
  return sel && settle(sel, sel.book.blocks);
}

// ---- output --------------------------------------------------------------------------------------

function sourceInfo(d) {
  const { name, repository, commit, files, attribution, terms } = d.source;
  return { name, repository, commit, files, attribution, terms };
}

function bookInfo(book) {
  return { id: book.id, title: book.title, vri_file: book.file, vri_section: book.section, vri_group: book.group, canonical: false };
}

const labelFor = (sel) => WORK_LABELS[sel.work] ? `${WORK_LABELS[sel.work]} ${LABELS[sel.book.section]}` : LABELS[sel.book.section];

/** Group blocks into headings, prose paragraphs and whole stanzas (as canon.segments does). */
export function segmentsOf(blocks, { includeVariants = false, includeSourcePositions = false } = {}) {
  const out = [];
  let stanza = null;
  let pending = [];
  const flush = () => { if (stanza) { out.push(stanza); stanza = null; } };
  for (const [i, [rend, n, text, notes = [], pages = {}]] of blocks.entries()) {
    const eds = [...pending, ...Object.entries(pages).flatMap(([ed, list]) => list.map((p) => [ed, p.replace(/\.0*(\d)/, '.$1')]))];
    pending = [];
    if (rend === 'hangnum') { flush(); stanza = { type: 'verse', vri: n, text: '', eds, start: i, end: i + 1 }; continue; }
    if (VERSE.has(rend)) {
      stanza ||= { type: 'verse', vri: n, text: '', eds: [], start: i, end: i + 1 };
      stanza.end = i + 1;
      stanza.text += (stanza.text ? '\n' : '') + text;
      stanza.eds.push(...eds);
      if (includeVariants && notes.length) (stanza.variants ||= []).push(...notes);
      if (rend === 'gathalast') flush();
      continue;
    }
    flush();
    if (!text) { pending = eds; continue; }
    const heading = HEADING.has(rend) || (rend === 'centre' && CENTRE_HEADING.test(text));
    const seg = { type: heading ? 'heading' : 'prose', vri: n, text, eds, start: i, end: i + 1 };
    if (includeVariants && notes.length) seg.variants = notes;
    out.push(seg);
  }
  flush();
  return out.map((s) => {
    const r = { type: s.type, text: s.text };
    if (includeSourcePositions) r.source_blocks = [s.start, s.end];
    if (s.vri) r.vri_paragraph = s.vri;
    for (const [ed, key] of Object.entries(ED_KEYS)) {
      const list = s.eds.filter(([e]) => e === ed).map(([, p]) => p);
      if (list.length) r[`${key}_page_begins`] = [...new Set(list)];
    }
    if (s.variants?.length) r.variant_readings = s.variants;
    return r;
  });
}

function summary(d, sel) {
  return {
    canonical: false, label: labelFor(sel), citation: sel.citation, title: sel.title, kind: sel.kind,
    ...(sel.chapter ? { chapter: sel.chapter } : {}), ...(sel.paragraph ? { vri_paragraph: sel.paragraph } : {}),
    ...(sel.approximate ? { approximate: true } : {}),
    book: bookInfo(sel.book), ...(sel.chapters ? { chapters: sel.chapters } : {}),
    notes: sel.notes || [], source: sourceInfo(d),
  };
}

/** resolve_reference for a post-canonical citation: what it names, without the text. Works offline. */
export function describe(reference) {
  const d = need();
  const sel = select(reference);
  if (!sel) throw new CitationError(`"${reference}" is not a post-canonical citation known here. List the books with browse().`);
  const out = summary(d, sel);
  out.read_with = { tool: 'get_post_canonical', citation: sel.citation };
  return out;
}

/** The text of a post-canonical citation, paginated by segment. Async for the tool interface; all data is local. */
export async function getText(reference, { offset = 0, limit = 60, includeVariants = false } = {}) {
  const d = need();
  const sel = select(reference);
  if (!sel) throw new CitationError(`"${reference}" is not a post-canonical citation known here. List the books with browse().`);
  const all = segmentsOf(sel.book.blocks.slice(sel.start, sel.end), { includeVariants });
  const page = all.slice(offset, offset + limit).map((s, i) => ({ ref: `${sel.citation}/${offset + i + 1}`, ...s }));
  return {
    ...summary(d, sel),
    edition: 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI), Pāli', attribution: d.source.attribution,
    total_segments: all.length, offset, limit, returned: page.length,
    next_offset: offset + page.length < all.length ? offset + page.length : null,
    segments: page,
  };
}

// ---- browse and search ---------------------------------------------------------------------------

/** Catalogue ("" or "post-canonical"), a VRI section ("tika", "anna"), or one book's chapters. Works offline. */
export function browse(node = '', { offset = 0, limit = 60 } = {}) {
  const d = need();
  const key = fold(node);
  const page = (items) => ({ total: items.length, offset, limit, next_offset: offset + limit < items.length ? offset + limit : null, items: items.slice(offset, offset + limit) });
  const card = (b) => ({ id: b.id, title: b.title, vri_section: b.section, vri_group: b.group, chapters: b.chapters.length });
  const base = { canonical: false, source: sourceInfo(d) };
  if (['', 'post-canonical', 'postcanonical', 'all'].includes(key)) {
    return { ...base, node: 'post-canonical', label: 'Post-canonical Pāli books of the VRI edition (not the canon). Cite them as "Vism I.1", "Vism ch. 4", "Abhidh-s 1" or by id ("mahavamsa 3").', ...page(d.books.map(card)) };
  }
  if (['tika', 'anna'].includes(key)) {
    const section = key === 'tika' ? 'Ṭīkā' : 'Añña';
    return { ...base, node: key, label: LABELS[section], ...page(d.books.filter((b) => b.section === section).map(card)) };
  }
  const sel = locate(node);
  if (!sel) throw new CitationError(`Unknown post-canonical node "${node}". Try "post-canonical", "tika", "anna", "vism", "abhidh-s" or a book id.`);
  const chapters = sel.chapters || sel.book.chapters.map(([t], i) => ({ citation: `${sel.book.id} ${i + 1}`, title: t }));
  return { ...base, node: sel.citation, label: labelFor(sel), book: bookInfo(sel.book), ...page(chapters) };
}

function terms(query) {
  return searchTerms(query, fold);
}

const searchCache = new Map();
function searchPassages(book, blocks) {
  if (!searchCache.has(book.id)) searchCache.set(book.id, searchSegments(blocks)
    .map((segment) => ({ ...segment, folded: searchFold(segment.text, fold) })));
  return searchCache.get(book.id);
}

const chapterAt = (book, i) => book.chapters.filter(([, s]) => s <= i).length;
const citationMemo = new WeakMap();
/** Does `citation` resolve, unambiguously, to a range of `book` containing [i, end)? */
function covers(book, citation, i, end = i + 1) {
  let memo = citationMemo.get(book);
  if (!memo) citationMemo.set(book, (memo = new Map()));
  if (!memo.has(citation)) {
    let range = null;
    try {
      const sel = select(citation);
      if (sel && sel.book === book) range = [sel.start, sel.end];
    } catch { range = null; }
    memo.set(citation, range);
  }
  const r = memo.get(citation);
  return !!r && i >= r[0] && end <= r[1];
}

/**
 * The most precise citation whose text contains block i of a book. Candidates come from the paragraph the block
 * belongs to (the numbered block a heading opens into, or the last numbered block before it, never across a chapter
 * or work heading) and from its chapter; a candidate is kept only if select() gives a range of this book that holds
 * the block, so a citation is never ambiguous and never points elsewhere. Falls back to the chapter, then the book.
 */
export function citationFor(book, i, end = i + 1) {
  const blocks = book.blocks;
  const ps = [];
  const own = paraRange(blocks[i][1]);
  if (own) ps.push(own[0]);
  else {
    let j = i;
    while (j < blocks.length && HEADING.has(blocks[j][0]) && !paraRange(blocks[j][1])) j += 1;
    if (j > i && j < blocks.length && paraRange(blocks[j][1])) ps.push(paraRange(blocks[j][1])[0]);
    if (blocks[i][0] !== 'chapter' && blocks[i][0] !== 'book') {
      for (let b = i - 1; b >= 0; b -= 1) {
        const r = paraRange(blocks[b][1]);
        if (r) { ps.push(r[0]); break; }
        if (blocks[b][0] === 'chapter' || blocks[b][0] === 'book') break;
      }
    }
  }
  const k = chapterAt(book, i);
  const cands = [];
  if (VISM_BOOKS.includes(book.id)) {
    for (const p of ps) cands.push(`Vism §${p}`);
    const n = vismChapters(need()).findIndex((c) => c.book === book && i >= c.start && i < c.end) + 1;
    if (n) cands.push(`Vism ch. ${n}`);
  } else if (book.id === ABHS_BOOK && i < workEnd(book, 0)) {
    for (const p of ps) cands.push(`Abhidh-s ${Math.max(k, 1)}.${p}`);
    cands.push(`Abhidh-s ${Math.max(k, 1)}`);
  }
  for (const p of ps) { if (k) cands.push(`${book.id} ${k}.${p}`); cands.push(`${book.id} §${p}`); }
  if (k) cands.push(`${book.id} ${k}`);
  return cands.find((c) => covers(book, c, i, end)) || book.id;
}

/**
 * Full-text search of the post-canonical books (folded, all terms, "quoted phrases"), one hit per citable passage.
 * Every hit's citation resolves to a passage that contains it (citationFor). `books` limits to ids, `section` to
 * "tika" or "anna".
 */
export async function search(query, { limit = 10, offset = 0, books, section } = {}) {
  const d = need();
  const wanted = terms(query);
  if (!wanted.length) throw new Error('Search needs at least one word of two or more letters.');
  const scopes = books?.length ? books.flatMap((b) => {
    const f = fold(b);
    if (VISM.test(f) && !f.replace(VISM, '$1')) return VISM_BOOKS.map((id) => [id, d.byId.get(id).block_count]);
    if (ABHS.test(f) && !f.replace(ABHS, '$1')) return [[ABHS_BOOK, workEnd(d.byId.get(ABHS_BOOK), 0)]];
    // Scope filters name whole books/work aliases, not arbitrary strings or passage citations.
    // Silently dropping an unknown entry makes a typo look like absent source text (or a partial search).
    const book = keyed(d, f);
    if (!book) throw new CitationError(`Unknown post-canonical book filter "${b}". Choose whole-book IDs from get_post_canonical (omit citation to list books), or use a work alias such as "vism" or "abhidh-s". Chapter/paragraph citations are not book filters.`);
    return [[book.id, book.block_count]];
  }) : null;
  // All supported filters begin at the source start; union duplicates by the furthest selected end.
  // The Saṅgaha work alias stops before the distinct Vibhāvinī appended in the same VRI file.
  const want = scopes && new Map();
  for (const [id, end] of scopes || []) want.set(id, Math.max(want.get(id) || 0, end));
  const sec = section ? ({ tika: 'Ṭīkā', anna: 'Añña' })[fold(section)] : null;
  const pool = d.books.filter((b) => (!want || want.has(b.id)) && (!sec || b.section === sec));
  const hits = [];
  const seen = new Set();
  let total = 0;
  for (const book of pool) {
    const { blocks } = book;
    const passages = searchPassages(book, blocks);
    for (const passage of passages) {
      if (want && passage.end > want.get(book.id)) continue;
      const i = passage.start;
      if (!wanted.every((w) => passage.folded.includes(w))) continue;
      // One hit per citable passage (a VRI paragraph often spans several blocks).
      const citation = citationFor(book, i, passage.end);
      if (seen.has(`${book.id}|${citation}`)) continue;
      seen.add(`${book.id}|${citation}`);
      total += 1;
      if (total <= offset || hits.length >= limit) continue;
      const excerpt = searchExcerpt(passage.text, wanted[0], fold);
      const k = chapterAt(book, i);
      const selection = select(citation);
      const rendered = segmentsOf(book.blocks.slice(selection.start, selection.end), { includeSourcePositions: true });
      hits.push({ canonical: false, citation, book_id: book.id, book_title: book.title, vri_section: book.section,
        ...(k ? { chapter: book.chapters[k - 1][0] } : {}), ...(blocks[i][1] ? { match_vri_paragraph: blocks[i][1] } : {}),
        excerpt, ...searchReading(rendered, { tool: 'get_post_canonical', citation }, i - selection.start, passage.end - selection.start, selection.citation) });
    }
  }
  return {
    query, canonical: false,
    label: 'Post-canonical books (VRI Ṭīkā and Añña sections), not the canon. Results are kept separate from canonical search results.',
    searched: `${pool.length} post-canonical books`,
    results: hits, total_matched: total, offset, limit, next_offset: offset + limit < total ? offset + limit : null,
    source: sourceInfo(d),
  };
}

/**
 * The search_texts option: add post-canonical results to a canon search result, under post_canonical, only when
 * asked (include = false leaves the canon result untouched).
 */
export async function withPostCanonical(canonResult, query, { include = false, limit = 10, offset = 0 } = {}) {
  if (!include) return canonResult;
  try {
    const run = q => search(q, { limit, offset });
    const result = isSourcePhrase(query) ? { ...await run(query), ...searchInputNote({ source_phrase: true }) }
      : await withNormalised(query, run, { preferSource: hasSearchPhrase(query) });
    return { ...canonResult, post_canonical: result };
  } catch (error) {
    return { ...canonResult, post_canonical: { canonical: false, error: error.message } };
  }
}

// ---- tools (feature registration, src/features/index.mjs) ----------------------------------------

/** Feature registration (src/features/index.mjs). */
export function register({ tool, z }) {
  tool('get_post_canonical', 'Read a post-canonical Pāli book of the VRI edition: the Visuddhimagga ("Vism ch. 1" or "Vism I" chapter, "Vism 1.1" chapter.paragraph, "Vism §19" VRI paragraph), the Abhidhammatthasaṅgaha ("Abhidh-s 1", "Abhidh-s 1.4"), the sub-commentaries (Ṭīkā) and other later works by id ("mahavamsa 3"). Omit the citation, or give "tika" or "anna", to list the books. Not the canon: every result is labelled canonical: false. Works offline. Visuddhimagga PTS pages cannot be located (the VRI edition has none). Native-script citation input and script output are supported; continue_with preserves the selection, variants and script.', {
    citation: z.string().max(200).default('').describe('Vism ch. 1, Vism I, Vism 1.1, Vism §19, visuddhi. 1.19, Abhidh-s 1, Abhidh-s 1.4, a book id such as mahavamsa or silakkhandhavagga-tika (optionally with a chapter or chapter.paragraph), or empty to list the books.'),
    offset: z.number().int().min(0).max(100000).default(0).describe('Segment offset for continuation.'),
    limit: z.number().int().min(1).max(200).default(60).describe('Segments per page.'),
    includeVariants: z.boolean().default(false).describe('Include variant readings recorded by VRI (raw notes).'),
    script: z.string().trim().min(1).max(30).optional().describe(SCRIPT_DESCRIPTION),
  }, async ({ citation, offset, limit, includeVariants, script }) => {
    if (script) scriptName(script);
    const input = romanizeInput(citation);
    const key = fold(input.text);
    const catalogue = ['', 'post-canonical', 'postcanonical', 'all', 'tika', 'anna'].includes(key);
    const result = catalogue
      ? browse(key, { offset, limit }) : await getText(input.text, { offset, limit, includeVariants });
    return { ...localizePostCanonical(result, script, input),
      continue_with: result.next_offset !== null ? { tool: 'get_post_canonical', citation: catalogue ? key : result.citation,
        offset: result.next_offset, limit, includeVariants, ...(script ? { script: scriptName(script) } : {}) } : null };
  });

  tool('search_post_canonical', 'Search the full Pāli text of the post-canonical books (Visuddhimagga, Abhidhammatthasaṅgaha, sub-commentaries/Ṭīkā and other VRI Añña books): diacritics optional, all words must appear, "quoted phrases" allowed. Not the canon: results are labelled canonical: false. Native-script query input and script output are supported; exact/context reading commands retain the script. Works offline.', {
    query: z.string().trim().min(1).max(300),
    script: z.string().trim().min(1).max(30).optional().describe(SCRIPT_DESCRIPTION),
    books: z.array(z.string().max(80)).max(20).optional().describe('Limit to whole-book IDs from get_post_canonical or work aliases, e.g. ["vism"], ["abhidh-s"], ["mulapannasa-tika"]. The abhidh-s alias searches only the Saṅgaha, excluding the appended Vibhāvinī; use abhidhammatthasangaho for the whole VRI file. Multiple entries select their union. Unknown entries are errors; chapter/paragraph citations are not book filters. Omit or use [] for no book restriction.'),
    section: z.enum(['tika', 'anna']).optional().describe('Limit to the VRI Ṭīkā or Añña section.'),
    limit: z.number().int().min(1).max(50).default(10),
    offset: z.number().int().min(0).max(100000).default(0),
  }, async ({ query, books, section, limit, offset, script }) => {
    if (script) scriptName(script);
    const input = romanizeSearchInput(query);
    const run = q => search(q, { books, section, limit, offset });
    const result = input.source_phrase ? await run(input.text) : await withNormalised(input.text, run, { preferSource: hasSearchPhrase(input.text) });
    return localizePostCanonical({ ...result, ...searchInputNote(input) }, script, input);
  });
}
