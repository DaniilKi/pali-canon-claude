/**
 * Cross-references from the commentaries' own citations of other canonical texts (D59).
 *
 * Two kinds of evidence are read from the bundled VRI Aṭṭhakathā (server/data/commentary.json.gz):
 *
 *  1. VRI's own references in brackets after a quotation, such as "‘‘…’’ti (ma. ni. 1.27)": the book,
 *     volume and VRI paragraph of the passage quoted. The paragraph is looked up in the bundled canon
 *     (it must occur exactly once in that book), and the quotation, when there is one, must be found in
 *     the cited paragraph (±1). In SN and AN a reference is never used without that quotation check:
 *     no link by number alone.
 *  2. Suttas named in the commentary ("Ambaṭṭhasutte vuttaṃ", "Majjhimanikāye … Cūḷasīhanādasutte"):
 *     the name, diacritics included, must equal the title of exactly one canonical text (within the named
 *     Nikāya, when one is named nearby). The name is ambiguous, and dropped, when it is also the start of
 *     another text's title ("udaya" / "Udayamāṇavapucchā") or a DPD name of another text, and a link is
 *     dropped when a VRI reference in brackets right next to the name points at a different text.
 *     Relative references ("anantarasutte", "purimasutte") are never resolved.
 *
 * A citation is kept only when the commentary passage that holds it is aligned to exactly one text, so the
 * citing text is known. No link is better than a wrong link.
 */
import * as canon from '../../src/canon.mjs';
import * as commentary from '../../src/commentary.mjs';
import { loadGlossary } from '../../src/glossary-data.mjs';

export const fold = canon.fold;
export const tokens = (s) => fold(s).replace(/[^a-z]+/g, ' ').trim().split(' ').filter(Boolean);

// VRI reference prefixes (lower case, dots and spaces removed) -> canon book indexes by volume.
// A single index means the book is cited by paragraph alone ("dha. pa. 131").
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const PREFIXES = {
  dīni: range(5, 7), mani: range(8, 10), saṃni: range(11, 15), sani: range(11, 15), ani: range(16, 26),
  dhapa: 28, udā: 29, itivu: 30, iti: 30, suni: 31, viva: 32, peva: 33, theragā: 34, therīgā: 35,
  mahāni: 42, netti: 46, pārā: 0, pāci: 1, mahāva: 2, cūḷava: 3, cuḷava: 3, pari: 4,
  dhasa: 48, vibha: 49, dhātu: 50, pupa: 51, kathā: 52,
};
const NO_NUMBER_ALONE = new Set(['sn', 'an']);
const GENERIC = new Set(['pathama', 'dutiya', 'tatiya', 'catuttha', 'pancama', 'chattha', 'sattama', 'atthama', 'navama', 'dasama',
  'anantara', 'purima', 'pacchima', 'sakala', 'asuka', 'adi', 'ima', 'tasmim', 'imasmim', 'etasmim', 'sabba', 'nava', 'kata', 'yatha',
  'digha', 'majjhima', 'khuddaka', 'abhidhamma', 'vinaya', 'eka', 'dve', 'ti', 'sutta', 'ekadasa', 'dasa', 'upari', 'hettha', 'mula', 'majjhe']);
const NIKAYA_CONTEXT = [
  [/Dīghanikāye/, ['dn']], [/Majjhimanikāye/, ['mn']], [/Saṃyuttanikāye|Saṃyutte\b/, ['sn']],
  [/Aṅguttaranikāye|Aṅguttare\b/, ['an']],
  [/Khuddakanikāye/, ['kp', 'dhp', 'ud', 'iti', 'snp', 'vv', 'pv', 'thag', 'thig', 'ap', 'bv', 'cp', 'ja', 'mnd', 'cnd', 'ps', 'mil', 'ne', 'pe']],
];
const NAME_RE = /([A-Za-zāīūṃṅñṭḍṇḷĀĪŪṂṄÑṬḌṆḶ]+?)sutt(?:e|ante|aṃ|antaṃ|ena|antena|assa|antassa|ādīsu|ādīni)(?![A-Za-zāīūṃṅñṭḍṇḷ])/g;

let index = null;
function buildIndex() {
  const d = canon.load();
  const books = d.canon.books;
  // Unique VRI paragraph numbers per book -> block index.
  const paras = books.map((b) => {
    const seen = new Map();
    b.blocks.forEach((bl, i) => {
      const r = commentary.paraRange(bl[1]);
      if (!r) return;
      for (let n = r[0]; n <= r[1]; n++) seen.set(n, seen.has(n) ? -1 : i);
    });
    return seen;
  });
  const byBook = books.map(() => []);
  for (const u of d.canon.units) byBook[u.book].push(u);
  // Titles -> units ("Ambaṭṭhasuttaṃ" -> ambattha).
  const titles = new Map();
  // Every other name a text goes by, with diacritics: its title (any kind of text) and its DPD sutta names
  // (dpd_sutta, dpd_sutta_var). A sutta name that is one of these, or the start of one, for another text is ambiguous.
  const otherNames = [];
  for (const u of d.canon.units) {
    const full = paliLower(u.title || '').replace(/^[\d\s.()-]+/, '');
    if (full) otherNames.push([full, u.id]);
    if (u.kind === 'range') continue;
    const stem = titleStem(u.title);
    if (stem) (titles.get(stem) || titles.set(stem, []).get(stem)).push(u);
  }
  for (const [id, names] of loadGlossary().names) for (const n of names) otherNames.push([paliLower(n), id]);
  index = { d, books, paras, byBook, titles, otherNames };
  return index;
}

/** Lower case, NFC, ṁ = ṃ; diacritics kept. */
export const paliLower = (s) => s.normalize('NFC').toLowerCase().replace(/ṁ/g, 'ṃ');

/** The name stem of a sutta title, diacritics kept: "Ambaṭṭhasuttaṃ" -> "ambaṭṭha". */
export function titleStem(title) {
  const m = paliLower(title || '').replace(/^[\d\s.()-]+/, '').match(/^([a-zāīūṃṅñṭḍṇḷ]+?)sutta(?:ṃ|ntaṃ|nta)?$/);
  return m ? m[1] : null;
}

/** The name stem of a sutta named in the commentary, diacritics kept: "Mahāgovindasutte" -> "mahāgovinda". */
export const nameStem = (named) => paliLower(named).replace(/sutt[a-zāīūṃṅñṭḍṇḷ]*$/, '').split('sutta').at(-1);

/** Other texts that go by this name, or by a name that starts with it (title or DPD sutta name). */
export function otherTextsNamed(stem, id) {
  const { otherNames, d } = index || buildIndex();
  const self = d.byId.get(id) || { id };
  const out = new Set();
  // "rāhulovāda" also names the Cūḷa- and Mahārāhulovāda suttas: a Cūḷa-/Mahā- title ending in the name is another candidate.
  const qualified = ['cūḷa', 'cūla', 'culla', 'mahā'].map((q) => q + stem);
  for (const [n, other] of otherNames) {
    if (other === id || related(d.byId.get(other) || { id: other }, self)) continue;
    if (n.startsWith(stem) || qualified.some((q) => n.startsWith(q))) out.add(other);
  }
  return [...out];
}

/** The texts a bracketed VRI reference points at, or [] when it cannot be resolved. */
export function refTargets(inside) {
  const { paras } = index || buildIndex();
  const out = new Set();
  for (const r of parseRefs(inside)) {
    for (let n = r.a; n <= r.b; n++) {
      const bi = paras[r.book].get(n);
      const t = bi >= 0 ? unitAt(r.book, bi) : null;
      if (t) out.add(t);
    }
  }
  return [...out];
}

/** The smallest canon unit holding block i of a book, or null when two different texts tie. */
export function unitAt(book, i) {
  const { byBook } = index || buildIndex();
  let best = [];
  for (const u of byBook[book]) {
    if (i < u.start || i >= u.end) continue;
    const span = u.end - u.start;
    if (!best.length || span < best[0].end - best[0].start) best = [u];
    else if (span === best[0].end - best[0].start) best.push(u);
  }
  return best.length === 1 ? best[0] : null;
}

/** Block indexes of paragraphs a..b (and one either side) of a book: the window a quotation is checked in. */
export function paragraphWindow(book, a, b) {
  const { paras, books } = index || buildIndex();
  const blocks = books[book].blocks;
  const start = paras[book].get(a - 1) >= 0 ? paras[book].get(a - 1) : paras[book].get(a);
  let end = paras[book].get(b + 1) >= 0 ? paras[book].get(b + 1) : paras[book].get(b);
  // Run to the next numbered block after `end`.
  end += 1;
  while (end < blocks.length && !commentary.paraRange(blocks[end][1])) end++;
  return blocks.slice(start, end).map((x) => x[2] || '').join(' ');
}

const letters = (s) => fold(s).replace(/[^a-z]+/g, '');
export const MIN_WHOLE = 12;
export const MIN_PART = 25;

/**
 * Check a quotation against the cited text, letter by letter (so word division and quotation sandhi do not
 * matter): 'whole' when a piece of the quotation between peyyāla marks, at least 12 letters long, is found
 * whole (its last two letters, which carry the "’’ti" sandhi, ignored); 'part' when a run of 25 letters of it
 * is found; otherwise 'not-found', or 'too-short' when no piece reaches 12 letters.
 */
export function checkQuote(quote, windowText) {
  const hay = letters(windowText);
  const chunks = quote.split(/pe|…|\.\.\./).map(letters).filter((c) => c.length);
  if (chunks.length) chunks[chunks.length - 1] = chunks.at(-1).slice(0, -2);
  const quoted = chunks.reduce((n, c) => n + c.length, 0);
  if (!chunks.some((c) => c.length >= MIN_WHOLE)) return { status: 'too-short', quoted };
  for (const c of chunks) if (c.length >= MIN_WHOLE && hay.includes(c)) return { status: 'whole', quoted };
  for (const c of chunks) for (let i = 0; i + MIN_PART <= c.length; i++) if (hay.includes(c.slice(i, i + MIN_PART))) return { status: 'part', quoted };
  return { status: 'not-found', quoted };
}

/**
 * The quotation that ends just before position `at` in `text` ("‘‘…’’ti (ref)"), or an open one
 * ("‘‘… (ref)"), or null.
 */
function quoteBefore(text, at) {
  const close = text.lastIndexOf('’’', at);
  const lastOpen = text.lastIndexOf('‘‘', at);
  if (lastOpen > close && at - lastOpen <= 400) return { start: lastOpen, text: text.slice(lastOpen + 2, at), open: true };
  if (close < 0) return null;
  const gap = text.slice(close + 2, at);
  if (gap.length > 40 || /[()‘’]/.test(gap)) return null;
  const open = text.lastIndexOf('‘‘', close);
  if (open < 0) return null;
  const inner = text.slice(open + 2, close);
  if (inner.includes('’’')) return null;
  return { start: open, text: inner };
}

/** Without quotation marks: the words just before the reference (back to the previous bracket or 160 characters). */
function wordsBefore(text, at) {
  const from = Math.max(0, at - 160, text.lastIndexOf(')', at - 1) + 1);
  return { start: from, text: text.slice(from, at) };
}

/** Parse the reference list inside one pair of brackets into [{ book, a, b, raw }]. */
export function parseRefs(inside) {
  const out = [];
  let current = null;
  for (const part of inside.split(';')) {
    const m = part.trim().match(/^([A-Za-zāīūṃṅñṭḍṇḷĀĪŪṂṄÑṬḌṆḶ.\s]*?)\s*(\d[\d.,\s–-]*?)\s*(ādayo|ādi)?\.?$/);
    if (!m) { current = null; continue; }
    if (m[1].trim()) {
      const key = m[1].toLowerCase().replace(/[.\s]/g, '');
      current = Object.hasOwn(PREFIXES, key) ? PREFIXES[key] : null;
    }
    if (current === null) continue;
    for (const item of m[2].split(',').map((s) => s.trim()).filter(Boolean)) {
      let book;
      let num = item;
      if (Array.isArray(current)) {
        const v = item.match(/^(\d+)\.(.+)$/);
        if (!v || current[Number(v[1]) - 1] === undefined) continue;
        book = current[Number(v[1]) - 1];
        num = v[2];
      } else {
        if (item.includes('.')) continue;
        book = current;
      }
      const r = commentary.paraRange(num.replace('–', '-'));
      if (r && r[1] - r[0] <= 20) out.push({ book, a: r[0], b: r[1], raw: item });
    }
  }
  return out;
}

const related = (x, y) => x.id === y.id || (x.members || []).includes(y.id) || (y.members || []).includes(x.id);

export const MAX_EVIDENCE = 400;

/**
 * Every commentary citation link. Returns { links, stats }. Each link:
 * { from, to, match, commentary_ref, work, evidence, quote_check?, target_segment?, vri_reference? }.
 */
export function buildCitations({ debug = null } = {}) {
  const { d, books, paras, titles } = index || buildIndex();
  const NEAR = /^\s{0,2}\(([^()]{2,160})\)/;
  const com = commentary.load();
  const stats = {};
  const bump = (k) => { stats[k] = (stats[k] || 0) + 1; };
  const links = [];
  const segCache = new Map();
  const segmentFor = (u, n) => {
    if (!segCache.has(u.id)) segCache.set(u.id, canon.segments(u));
    const s = segCache.get(u.id).find((x) => { const r = commentary.paraRange(x.vri_paragraph); return r && r[0] <= n && n <= r[1]; });
    return s ? s.ref : null;
  };
  const textOf = (u) => canon.segments(u).map((x) => x.text).join(' ');
  for (const unitId of Object.keys(com.units).sort()) {
    const unit = d.byId.get(unitId);
    if (!unit) continue;
    const owners = commentary.segmentOwners(unit);
    const res = commentary.commentaryFor(unit, { limit: 100000 });
    res.segments.forEach((seg, i) => {
      if (seg.type === 'heading') return;
      const own = owners[i]?.units || [];
      const text = seg.text;
      const base = { from: unit.id, commentary_ref: seg.ref, work: com.books[com.passages[owners[i].passage][0]].work };
      // 1. VRI references in brackets.
      for (const m of text.matchAll(/\(([^()]{2,160})\)/g)) {
        const refs = parseRefs(m[1]);
        if (!refs.length) continue;
        bump('vri-references');
        if (own.length !== 1 || own[0] !== unit.id) { bump('dropped: commentary passage shared by several texts'); continue; }
        const q = quoteBefore(text, m.index);
        for (const r of refs) {
          const first = paras[r.book].get(r.a);
          const lastBlock = paras[r.book].get(r.b);
          if (!(first >= 0) || !(lastBlock >= 0)) { bump('dropped: paragraph not unique or not found'); continue; }
          const targets = new Map();
          for (let n = r.a; n <= r.b; n++) {
            const bi = paras[r.book].get(n);
            if (!(bi >= 0)) continue;
            const t = unitAt(r.book, bi);
            if (!t) { targets.set(null, n); break; }
            if (!targets.has(t)) targets.set(t, n);
          }
          if (targets.has(null)) { bump('dropped: paragraph shared by two texts'); continue; }
          if (targets.size > 3) { bump('dropped: range over more than 3 texts'); continue; }
          // The quotation (or, without one, the words just before the reference) is cut from a piece of the
          // segment of at most MAX_EVIDENCE characters ending at the reference; that piece is the stored evidence,
          // and the check runs on exactly the part of it that is stored, so the audit can repeat it.
          const refEnd = m.index + m[0].length;
          const window = paragraphWindow(r.book, r.a, r.b);
          const tryQuote = (abs, len) => {
            const evStart = Math.max(0, abs - 2, refEnd - MAX_EVIDENCE);
            const qs = Math.max(abs, evStart) - evStart;
            const qe = abs + len - evStart;
            if (qe <= qs) return null;
            const ev = text.slice(evStart, refEnd);
            return { ev, span: [qs, qe], ...checkQuote(ev.slice(qs, qe), window) };
          };
          let check = q ? tryQuote(q.start + 2, q.text.length) : null;
          if (check && check.status === 'not-found' && !q.open) { bump('dropped: quotation not in the cited paragraph'); debug?.push({ from: unit.id, ref: m[1], quote: q.text, book: r.book, a: r.a }); continue; }
          if (!check || check.status === 'too-short' || check.status === 'not-found') {
            // No usable quotation: the words just before the reference may still be the cited text itself.
            const w = wordsBefore(text, m.index);
            const c2 = tryQuote(w.start, w.text.length);
            check = c2 && (c2.status === 'whole' || c2.status === 'part') ? { ...c2, status: 'part' } : null;
          }
          const confirmed = check?.status === 'whole' || check?.status === 'part';
          for (const [t, n] of targets) {
            if (related(t, unit)) { bump('dropped: cites its own text'); continue; }
            if (!confirmed && NO_NUMBER_ALONE.has(t.collection)) { bump('dropped: SN/AN reference without a confirmed quotation'); continue; }
            // A reference to a run of paragraphs that spans several texts: each text must hold the whole quotation itself.
            if (targets.size > 1 && confirmed && checkQuote(check.ev.slice(...check.span), textOf(t)).status !== 'whole') { bump('dropped: range reference, quotation not whole in this text'); continue; }
            if (targets.size > 1 && !confirmed) { bump('dropped: range reference over several texts without a quotation'); continue; }
            const ev = confirmed ? check.ev : text.slice(Math.max(0, m.index - 120, refEnd - MAX_EVIDENCE), refEnd);
            links.push({
              ...base, to: t.id, match: confirmed ? 'vri-reference+quotation' : 'vri-reference',
              vri_reference: m[1].trim(), cited: { vri_file: books[r.book].file, vri_paragraph: n, reference_paragraphs: r.a === r.b ? `${r.a}` : `${r.a}-${r.b}` },
              ...(confirmed ? { quotation_span: check.span } : {}),
              target_segment: segmentFor(t, n), evidence: ev,
              ...(confirmed ? { quotation_found: check.status === 'whole' ? 'whole' : 'part' } : {}),
            });
            bump(`kept: ${confirmed ? 'vri-reference+quotation' : 'vri-reference'}`);
          }
        }
      }
      // 2. Suttas named in the text.
      for (const m of text.matchAll(NAME_RE)) {
        const stem = nameStem(m[0]);
        const folded = fold(stem);
        if (!stem || folded.length < 3 || GENERIC.has(folded)) continue;
        // Followed by "vaṇṇanā"/"niddesa": the commentary on, or the Niddesa of, the sutta, not the sutta.
        bump('sutta-names');
        const cands = titles.get(stem);
        if (!cands) { bump('dropped: name matches no title'); continue; }
        const before = text.slice(Math.max(0, m.index - 90), m.index);
        const ctx = NIKAYA_CONTEXT.find(([re]) => re.test(before));
        let pool = cands;
        let match = 'sutta-name';
        if (ctx) { pool = cands.filter((u) => ctx[1].includes(u.collection)); match = 'sutta-name+nikaya'; }
        if (pool.length !== 1) { bump(pool.length ? 'dropped: name matches several titles' : 'dropped: name not in the named Nikāya'); continue; }
        const t = pool[0];
        if (own.length !== 1 || own[0] !== unit.id) { bump('dropped: commentary passage shared by several texts'); continue; }
        if (related(t, unit)) { bump('dropped: names its own text'); continue; }
        // "Evaṃ me sutanti X-suttaṃ": the opening of the commentary on a text, naming that text itself.
        if (/sutanti\s*$/.test(text.slice(Math.max(0, m.index - 12), m.index))) { bump('dropped: names the text being commented on'); continue; }
        if (otherTextsNamed(stem, t.id).length) { bump('dropped: name is also (the start of) a name of another text'); continue; }
        // A VRI reference in brackets right after the name, or just before it ("(dī. ni. 2.329) imasmiṃ … sutte"),
        // must point at the same text.
        const after = text.slice(m.index + m[0].length).match(NEAR);
        const beforeRef = text.slice(Math.max(0, m.index - 175), m.index).match(/\(([^()]{2,160})\)([^()]{0,12})$/);
        const near = [after?.[1], beforeRef && !/[.;]/.test(beforeRef[2]) ? beforeRef[1] : null].filter(Boolean);
        if (near.some((r) => refTargets(r).some((x) => !related(x, t)))) { bump('dropped: a reference next to the name points at another text'); continue; }
        const start = Math.max(0, m.index - (ctx ? 90 : 60));
        links.push({ ...base, to: t.id, match, named: m[0], evidence: text.slice(start, m.index + m[0].length) });
        bump(`kept: ${match}`);
      }
    });
  }
  // One link per (from, to, commentary_ref, match); the first evidence wins.
  const seen = new Set();
  const out = [];
  for (const l of links) {
    const k = `${l.from}|${l.to}|${l.commentary_ref}|${l.match.startsWith('vri') ? 'vri' : 'name'}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
  }
  return { links: out, stats };
}
