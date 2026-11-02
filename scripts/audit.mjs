// Exhaustive offline audit of the bundled canon: every text, every citation form, every PTS start page, every translation link.
import * as canon from '../src/canon.mjs';
import { EDITIONS, editionLabel, editionIndex, nextUnit } from '../src/editions.mjs';
import { textSegments, parseNoteSpans, uncovered, SIGLA } from '../src/variants.mjs';
import * as commentary from '../src/commentary.mjs';
import * as postcanonical from '../src/postcanonical.mjs';
import { statSync } from 'node:fs';
import { loadDpd, DPD_PIN, tokenize, wordParts } from '../src/analyse.mjs';
import * as parallels from '../src/parallels.mjs';
import { checkQuote, titleStem, paragraphWindow } from './parallels/citations.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadGlossary } from '../src/glossary-data.mjs';

const d = canon.load();
const failures = [];
const fail = (kind, detail) => failures.push(`${kind}: ${detail}`);
const counts = {};
const count = (k) => { counts[k] = (counts[k] || 0) + 1; };

for (const u of d.canon.units) {
  // 1. The ID itself resolves to this text (or, for an approximate member, to a text with the same passage).
  try {
    const r = canon.resolve(u.id);
    if (r.unit.id !== u.id && !(u.approximate && r.unit.start === u.start)) fail('id', `${u.id} -> ${r.unit.id}`);
    count('id');
  } catch (e) { fail('id', `${u.id}: ${e.message}`); }
  // 2. The printed citation (acronym, e.g. "Bu Pj 1", "Dhp 1–20") resolves back.
  try {
    const r = canon.resolve(u.acronym);
    if (r.unit.id !== u.id && !(u.approximate && r.unit.start === u.start)) fail('citation', `${u.acronym} -> ${r.unit.id} (expected ${u.id})`);
    count('citation');
  } catch (e) { fail('citation', `${u.acronym} (${u.id}): ${e.message}`); }
  // 3. Text renders and is not empty.
  const segs = canon.segments(u);
  if (!segs.some((s) => s.type !== 'heading' && s.text)) fail('text', `${u.id} has no body text`);
  else count('text');
  // 3b. Every Thai/Myanmar/VRI page break inside the text is shown in its segments.
  const shown = new Set(segs.flatMap((s) => Object.values(EDITIONS).flatMap((e) => s[`${e.key}_page_begins`] || [])));
  const blocks = d.canon.books[u.book].blocks;
  let lastText = u.end - 1;
  while (lastText >= u.start && !blocks[lastText][2]) lastText -= 1;
  for (let i = u.start; i <= lastText; i += 1) {
    for (const ed of Object.keys(EDITIONS)) {
      for (const at of blocks[i][4]?.[ed] || []) {
        const label = editionLabel(d, ed, u.book, at);
        if (!shown.has(label)) fail('edition-segment', `${label} (block ${i}) missing from get_text of ${u.id}`);
        else count('edition-segment');
      }
    }
  }
  // 3c. Structured variants (#28): same text as plain mode; every reading, omission and remark is verbatim from its note and together they cover it; known sigla only; no editorial text or bare "natthi" as a reading.
  {
    const { segments: vs } = textSegments(u, { variants: 'structured' });
    if (vs.length !== segs.length || vs.some((s, i) => s.text !== segs[i].text)) fail('variants', `${u.id} structured text differs from plain text`);
    for (const s of vs) for (const v of s.variants || []) {
      for (const r of v.readings) {
        if (!v.raw.includes(r.reading)) fail('variants', `${s.ref}: reading "${r.reading}" not in note`);
        for (const e of r.editions) if (!SIGLA[e.siglum]) fail('variants', `${s.ref}: unknown siglum ${e.siglum}`);
        count('variant-reading');
      }
      for (const x of v.remarks) if (!v.raw.includes(x)) fail('variants', `${s.ref}: remark "${x}" not in note`);
      for (const o of v.omissions) {
        if (!v.raw.includes(o.text)) fail('variants', `${s.ref}: omission "${o.text}" not in note`);
        for (const e of o.editions) if (!SIGLA[e.siglum]) fail('variants', `${s.ref}: unknown siglum ${e.siglum}`);
        count('variant-omission');
      }
      // Coverage: every non-separator character of the note is in a reading, omission or remark.
      const gap = uncovered(v.raw, parseNoteSpans(v.raw).spans);
      if (gap) fail('variants', `${s.ref}: note text not covered: "${gap}"`);
      // Semantic: a reading is never the omission word "natthi" alone or an editorial sentence.
      for (const r of v.readings) if (/^(sabbattha\s+)?natthi$|na dissati|potthakesu/.test(r.reading)) fail('variants', `${s.ref}: editorial text "${r.reading}" given as a reading`);
    }
  }
  // 4. Range members resolve inside the range.
  for (const m of u.members || []) {
    try {
      const r = canon.resolve(m);
      if (!(r.unit.book === u.book && r.unit.start >= u.start && r.unit.end <= u.end) && r.unit.id !== u.id) fail('member', `${m} -> ${r.unit.id} outside ${u.id}`);
      count('member');
    } catch (e) { fail('member', `${m}: ${e.message}`); }
  }
  // 5. A PTS start page resolves to a text that contains it.
  if (u.pts && u.pts.volume && !u.approximate && u.kind !== 'range' && ['dn', 'mn', 'sn', 'an', 'vinaya'].includes(u.collection)) {
    const abbr = { dn: 'D', mn: 'M', sn: 'S', an: 'A', vinaya: 'Vin' }[u.collection];
    const ref = `${abbr} ${['', 'i', 'ii', 'iii', 'iv', 'v', 'vi'][u.pts.volume]} ${u.pts.page}`;
    try {
      const r = canon.resolve(ref);
      const p = r.unit.pts;
      if (!p || p.volume !== u.pts.volume || p.page > u.pts.page || u.pts.page > p.end_page) fail('pts', `${ref} -> ${r.unit.id} (from ${u.id})`);
      count('pts');
    } catch (e) { fail('pts', `${ref} (${u.id}): ${e.message}`); }
  }
}
// 5b. Every Thai, Myanmar and VRI page marker resolves back to a text containing it (round trip, like PTS).
{
  const idx = editionIndex(d);
  const contains = (u, book, block) => u && u.book === book && u.start <= block && block < u.end;
  d.canon.books.forEach((book, bi) => {
    book.blocks.forEach((blk, k) => {
      for (const ed of Object.keys(EDITIONS)) {
        for (const at of blk[4]?.[ed] || []) {
          const label = editionLabel(d, ed, bi, at);
          let r;
          try { r = canon.resolve(label); } catch (e) { fail('edition', `${label}: ${e.message}`); continue; }
          if (contains(r.unit, bi, k)) { count('edition'); continue; }
          const occurrences = idx.markers.get(`${ed}|${book.collection}|${at}`);
          if (!idx.owner[bi][k] && r.unit === nextUnit(d, bi, k)) { count('edition-between-texts'); continue; }
          if (occurrences.length > 1 && occurrences[0].block !== k
            && [r.unit.id, ...r.alternatives.map((a) => a.id)].includes(idx.owner[bi][k]?.id)) { count('edition-duplicate-marker'); continue; }
          fail('edition', `${label} (${book.file} block ${k}) -> ${r.unit.id}, which does not contain it`);
        }
      }
    });
  });
}
// 6. No two distinct texts claim the same passage (ranges and abbreviated members excepted).
const spans = d.canon.units.filter((u) => u.kind !== 'range' && !u.approximate).sort((a, b) => a.book - b.book || a.start - b.start);
for (let i = 1; i < spans.length; i += 1) {
  const a = spans[i - 1], b = spans[i];
  if (a.book === b.book && b.start < a.end) fail('overlap', `${a.id} [${a.start},${a.end}) overlaps ${b.id} [${b.start},${b.end})`);
  else count('no-overlap');
}
// 7. Every translation link resolves back to its text by URL.
for (const [id, links] of Object.entries(d.translations)) {
  for (const l of links) {
    try {
      const r = canon.resolve(l.url);
      if (r.unit.id !== id && !(d.translations[r.unit.id] || []).some((x) => x.url === l.url)) fail('link', `${l.url} -> ${r.unit.id} (expected ${id})`);
      count('link');
    } catch (e) { fail('link', `${l.url}: ${e.message}`); }
  }
}
// 8. Commentary (server/data/commentary.json.gz): every alignment points at a real text and at root paragraphs
//    inside it; known passages land where they belong; commentary headings agree with the texts' titles.
const com = commentary.load();
if (!com) fail('commentary', 'server/data/commentary.json.gz is missing');
else {
  const HEADINGS = new Set(['subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead', 'centre']);
  const OPENING = /^\d+(?:\s*[-–]\s*\d+)?\.\s*\S.*(?:vaṇṇanā|vatthu)$/;
  // A heading, or a short body-text paragraph that is one (the Jātaka commentary's "2. Vaṇṇupathajātakavaṇṇanā").
  const headingLike = (x) => (HEADINGS.has(x[0]) || x[2].length <= 80) && OPENING.test(x[2]);
  const rootParas = new Map(); // root book + segment -> Map(paragraph -> [block indexes])
  // Paragraphs of a root book, or of the segment [lo, hi) of it that a passage names (books that restart their
  // numbering, like the Jātaka, have many paragraphs 1).
  const parasOf = (bi, lo = 0, hi = d.canon.books[bi].blocks.length) => {
    const cacheKey = `${bi}:${lo}:${hi}`;
    if (rootParas.has(cacheKey)) return rootParas.get(cacheKey);
    const map = new Map();
    let current = null;
    d.canon.books[bi].blocks.slice(lo, hi).forEach((b, k) => {
      const i = lo + k;
      const r = commentary.paraRange(b[1]); // the build's rule: "105-106", "105–106", "105-6"
      if (r) current = r;
      if (!current) return;
      if (!r && HEADINGS.has(b[0])) return;
      for (let p = current[0]; p <= current[1]; p += 1) (map.get(p) || map.set(p, []).get(p)).push(i);
    });
    rootParas.set(cacheKey, map);
    return map;
  };
  for (const [i, p] of com.passages.entries()) {
    const [bi, start, end, root, a, b, , , evidence, lo, hi] = p;
    const book = com.books[bi];
    if (!book || start < 0 || end > book.blocks.length || start >= end) { fail('commentary-passage', `#${i} has a bad block range`); continue; }
    if (!book.blocks.slice(start, end).some((x) => x[2])) fail('commentary-passage', `#${i} (${book.file}) is empty`);
    if (!d.canon.books[root] || !book.root_files.includes(d.canon.books[root].file)) fail('commentary-passage', `#${i} (${book.file}) points at root book ${root}, not one it comments on`);
    else if (!(lo >= 0 && hi > lo && hi <= d.canon.books[root].blocks.length)) fail('commentary-passage', `#${i} has a bad root segment ${lo}-${hi}`);
    else if (![...Array(b - a + 1).keys()].some((k) => parasOf(root, lo, hi).has(a + k))) fail('commentary-passage', `#${i} paragraph ${a}-${b} is not in ${d.canon.books[root].file}`);
    if (!['paragraph', 'paragraph+lemma', 'paragraph+verse', 'paragraph+heading'].includes(evidence)) fail('commentary-passage', `#${i} has unknown evidence ${evidence}`);
    if (!(a >= 1 && b >= a)) fail('commentary-passage', `#${i} (${book.file}) has a bad root paragraph range ${a}-${b}`);
    // A numbered heading that opens a text ("3. Dukkhalakkhaṇavatthu", "3. Kaṅkhārevatattheragāthāvaṇṇanā") after
    // the passage's own numbered paragraph belongs to the next text: the passage must stop before it.
    const blocks = book.blocks.slice(start, end);
    const first = blocks.findIndex((x) => commentary.paraRange(x[1]));
    if (first < 0) fail('commentary-passage', `#${i} (${book.file}) has no numbered paragraph`);
    else {
      const late = blocks.slice(first + 1).find(headingLike);
      if (late) fail('commentary-opening', `#${i} (${book.file}, paragraph ${a}-${b}) carries the next text's heading "${late[2]}"`);
      else count('commentary-opening');
    }
    // A paragraph number is not text: no numbered block starts with the dot left after it.
    if (blocks.some((x) => x[1] && /^\.\s/.test(x[2]))) fail('commentary-passage', `#${i} (${book.file}) has a block starting with ". "`);
    count('commentary-passage');
  }
  for (const [id, list] of Object.entries(com.units)) {
    const u = d.byId.get(id);
    if (!u) { fail('commentary-unit', `${id} is not a canon text`); continue; }
    for (const pi of list) {
      const p = com.passages[pi];
      if (!p) { fail('commentary-unit', `${id} -> missing passage #${pi}`); continue; }
      // The text holds the start of one of the passage's root paragraphs (in its segment), lies inside them,
      // or is an abbreviated (peyyāla) text in them.
      const paras = parasOf(p[3], p[9], p[10]);
      const blocks = new Set();
      const starts = [];
      for (let k = p[4]; k <= p[5]; k += 1) {
        const list = paras.get(k) || [];
        list.forEach((x) => blocks.add(x));
        if (list.length) starts.push(list[0]);
      }
      const inside = () => [...Array(u.end - u.start).keys()].every((k) => blocks.has(u.start + k) || HEADINGS.has(d.canon.books[u.book].blocks[u.start + k][0]));
      if (p[3] !== u.book || !(starts.some((x) => x >= u.start && x < u.end) || (u.approximate && [...blocks].some((x) => x >= u.start && x < u.end)) || inside())) fail('commentary-unit', `${id}: passage #${pi} (paragraphs ${p[4]}-${p[5]}) is outside the text`);
      else count('commentary-alignment');
    }
  }
  // Spot-checks: citation -> a heading the commentary must show (or no commentary at all).
  const spot = [
    ['DN 1', 'Brahmajāla'], ['DN 22', 'Mahāsatipaṭṭhānasuttavaṇṇanā'], ['MN 1', 'Mūlapariyāyasuttavaṇṇanā'],
    ['MN 10', 'Satipaṭṭhānasuttavaṇṇanā'], ['MN 21', 'Kakacūpamasuttavaṇṇanā'], ['SN 56.11', 'Dhammacakkappavattanasuttavaṇṇanā'],
    ['SN 22.59', 'Anattalakkhaṇasuttavaṇṇanā'], ['AN 3.65', 'Kesamuttisuttavaṇṇanā'], ['AN 8.53', 'Saṃkhittasuttavaṇṇanā'],
    ['Dhp 1', 'Cakkhupālattheravatthu'], ['Dhp 183', 'Ānandattherapañhavatthu'], ['Dhp 1–20', 'Yamakavaggo'], ['AN 1.9', null],
    // Each text keeps its own story or introduction (review of #94: they had moved to the previous text).
    ['Dhp 277', 'Aniccalakkhaṇavatthu'], ['Dhp 278', 'Dukkhalakkhaṇavatthu'], ['Dhp 279', 'Anattalakkhaṇavatthu'],
    ['Dhp 54', 'Ānandattherapañhāvatthu'], ['Dhp 153', 'Udānavatthu'], ['Dhp 208', 'Sakkavatthu'],
    ['Thag 1.2', 'Mahākoṭṭhikattheragāthāvaṇṇanā'], ['Thag 1.3', 'Kaṅkhārevata'], ['Thag 1.51', 'Godhikādicatuttheragāthāvaṇṇanā'],
    ['Thig 1.3', 'Puṇṇātherīgāthāvaṇṇanā'], ['Snp 3.8', 'Sallasuttavaṇṇanā'], ['AN 2.1', 'Vajjasuttavaṇṇanā'],
  ];
  // ...and none shows the next text's story or introduction, the previous text's last verse or book front matter.
  const absent = [
    ['Dhp 277', 'Dukkhalakkhaṇavatthu'], ['Dhp 278', 'Anattalakkhaṇavatthu'], ['Dhp 53', 'Ānandattherapañhāvatthu'],
    ['Dhp 152', 'Udānavatthu'], ['Dhp 208', 'Piyavaggo'], ['Thag 1.2', 'Kaṅkhārevata'], ['Thag 1.3', 'Puṇṇattheragāthāvaṇṇanā'],
    ['Snp 3.8', 'Bhikkhavo tisatā'], ['AN 2.1', 'Namo tassa'], ['AN 2.1', 'Dukanipāta-aṭṭhakathā'],
  ];
  for (const [ref, heading, want] of [...spot.map((x) => [...x, true]), ...absent.map((x) => [...x, false])]) {
    try {
      const r = commentary.getCommentary(ref, { limit: 200 });
      const text = r.segments.map((s) => s.text).join('\n');
      if (!want) {
        if (text.includes(heading)) fail('commentary-spot', `${ref}: must not show "${heading}"`);
        else count('commentary-spot');
      } else if (heading === null ? r.available : !(r.available && text.includes(heading))) fail('commentary-spot', `${ref}: expected ${heading === null ? 'no commentary' : `"${heading}"`}`);
      else count('commentary-spot');
    } catch (e) { fail('commentary-spot', `${ref}: ${e.message}`); }
  }
  // Every sutta-commentary heading in a single-paragraph passage names the text it is aligned to.
  const key = (s) => canon.fold(s).replace(/[nm](?=[kg])/g, 'n').replace(/[^a-z]/g, '');
  for (const u of d.canon.units) {
    if (!['dn', 'mn', 'sn', 'an'].includes(u.collection) || u.kind === 'range' || u.approximate) continue;
    // The canon titles the first text of some vaggas with the vagga's name and puts the sutta's on the range
    // ("AN 2.1" Kammakaraṇavagga, "AN 2.1–10" Vajjasuttaṃ): either title may match.
    const titles = [u, ...d.canon.units.filter((r) => r.kind === 'range' && r.book === u.book && r.start === u.start)]
      .map((x) => key(x.title || '').replace(/(suttam|sutta)$/, '')).filter(Boolean);
    for (const pi of com.units[u.id] || []) {
      const p = com.passages[pi];
      if (p[4] !== p[5]) continue;
      for (const head of com.books[p[0]].blocks.slice(p[1], p[2])) {
        if (head[0] === 'centre' || !/suttavaṇṇanā$/.test(head[2])) continue;
        const h = key(head[2].replace(/^[\d\-–. ]+/, '').replace(/suttavaṇṇanā$/, ''));
        if (!(h && titles.some((t) => h.includes(t.slice(0, 6)) || t.includes(h.slice(0, 6))))) fail('commentary-heading', `${u.id} "${u.title}" has commentary headed "${head[2]}"`);
        else count('commentary-heading');
      }
    }
  }
  // Coverage. "Every text with a commentary": every text the commentary numbers (`cited`, counted by the build)
  // has an aligned passage, except these known exceptions, each with its reason.
  const contradicted = 'The commentary numbers a passage with a paragraph of this text, but the words or verse it quotes (or its heading) belong to another text, so the number is not trusted.';
  const KNOWN_UNALIGNED = {
    ...Object.fromEntries(['tha-ap539', 'tha-ap559', 'ja384', 'ja385', 'ja386', 'patthana1.4'].map((id) => [id, contradicted])),
    'an1.130': 'Mp numbers 130 its general passage on AN 1.130-169 (with the five disappearances of the Dhamma); none of its distinctive quotations is in AN 1.130.',
    'pli-tv-bi-vb-ss10': 'Sp numbers 709 a passage headed "7. Sattamasaṅghādisesasikkhāpadavaṇṇanā"; it counts the nuns\' saṅghādisesa rules differently from the root, so the number does not identify this rule.',
  };
  for (const id of Object.keys(KNOWN_UNALIGNED)) if (!(com.cited_unaligned || []).includes(id)) fail('commentary-coverage', `${id} is a known exception but is no longer unaligned: update the list`);
  for (const id of com.cited_unaligned || []) {
    if (com.units[id]) fail('commentary-coverage', `${id} is listed as unaligned but has commentary`);
    else if (!KNOWN_UNALIGNED[id]) fail('commentary-coverage', `${id}: the commentary numbers it but no passage is aligned (not a known exception)`);
    else count('commentary-known-exception');
  }
  // Floors per collection: [aligned share of the texts the commentary numbers (cited_aligned/cited),
  // share of all texts with any commentary]. The second is lower where the commentary passes over texts.
  const cov = com.coverage || {};
  const floor = {
    dn: [1, 1], mn: [1, 1], sn: [1, 0.92], an: [0.999, 0.76], dhp: [1, 1],
    thag: [1, 0.99], thig: [1, 1], snp: [1, 1], vv: [1, 1], pv: [1, 0.98], ja: [0.99, 0.93], vinaya: [0.997, 0.83],
    iti: [1, 1], cp: [1, 1], mnd: [1, 1], vb: [1, 1],
  };
  for (const [coll, [minCited, minTexts]] of Object.entries(floor)) {
    const c = cov[coll];
    if (!c) { fail('commentary-coverage', `${coll}: no coverage counts in commentary.json.gz`); continue; }
    const texts = d.canon.units.filter((u) => (coll === 'vinaya' ? u.collection.startsWith('vin') : u.collection === coll));
    const covered = texts.filter((u) => com.units[u.id]).length;
    counts[`commentary-${coll}`] = `${covered}/${texts.length} texts; ${c.cited_aligned}/${c.cited} numbered`;
    if (covered !== c.with_commentary) fail('commentary-coverage', `${coll}: ${covered} texts have commentary, the build counted ${c.with_commentary}`);
    if (c.cited_aligned < minCited * c.cited) fail('commentary-coverage', `${coll}: ${c.cited_aligned}/${c.cited} texts the commentary numbers are aligned (floor ${minCited})`);
    if (covered < minTexts * texts.length) fail('commentary-coverage', `${coll}: ${covered}/${texts.length} texts have commentary (floor ${minTexts})`);
  }
}
// 9. Post-canonical books (server/data/postcanonical.json.gz, #21): pinned, never canonical, never shadowing a canon
//    citation; every chapter of every book resolves to its own heading; every Visuddhimagga VRI paragraph and every
//    Abhidhammatthasaṅgaha section resolves to the block that carries it; every block's citation (the one search
//    returns for it) resolves, unambiguously, to a passage that contains the block; generic "<book> k.p" and
//    "<book> §p" forms resolve to the block that carries p.
{
  const pc = postcanonical.load();
  if (!pc) fail('postcanonical', 'server/data/postcanonical.json.gz is missing');
  else {
    if (pc.source.commit !== d.canon.source.commit) fail('postcanonical', `VRI commit ${pc.source.commit} differs from the canon's`);
    // Decision D-21a: one bundle of all books (target 12 MB was exceeded on purpose; package budget is 60 MB).
    const size = statSync(new URL('../server/data/postcanonical.json.gz', import.meta.url)).size;
    if (size > 16e6) fail('postcanonical', `bundle is ${size} bytes, over the 16 MB ceiling of decision D-21a`);
    const canonFiles = new Set(d.canon.books.map((b) => b.file));
    for (const b of pc.books) {
      if (b.canonical !== false) fail('postcanonical', `${b.id} not flagged canonical: false`);
      if (canonFiles.has(b.file)) fail('postcanonical', `${b.file} is also in the canon data`);
      if (!Array.isArray(b.blocks) || b.blocks.length !== b.block_count) fail('postcanonical', `${b.id}: text missing or block count wrong`);
      try { canon.resolve(b.id); fail('postcanonical', `${b.id} is also a canon citation`); } catch { count('postcanonical-id-free'); }
      if (postcanonical.isPostCanonical(b.id) !== true) fail('postcanonical', `${b.id} not recognised`);
      try {
        const r = postcanonical.describe(b.id);
        if (r.book.id !== b.id || r.canonical !== false) fail('postcanonical', `${b.id} -> ${r.book.id}`);
        else count('postcanonical-book');
      } catch (e) { fail('postcanonical', `${b.id}: ${e.message}`); }
      b.chapters.forEach(([title, at], i) => {
        try {
          const r = postcanonical.locate(`${b.id} ${i + 1}`);
          if (r.title !== title || r.start !== at || r.end <= r.start) fail('postcanonical-chapter', `${b.id} ${i + 1} -> "${r.title}" [${r.start},${r.end})`);
          else if (!b.blocks.slice(r.start, r.end).some(([rend, , text]) => text && rend !== 'chapter')) fail('postcanonical-chapter', `${b.id} ${i + 1} has no text`);
          else count('postcanonical-chapter');
        } catch (e) { fail('postcanonical-chapter', `${b.id} ${i + 1}: ${e.message}`); }
      });
    }
    // Visuddhimagga: 23 chapters "N. …niddeso"; VRI paragraphs 1–896, each resolving to its own block, in both citation forms.
    for (let k = 1; k <= 23; k += 1) {
      const r = postcanonical.locate(`Vism ch. ${k}`);
      if (!(r.title.startsWith(`${k}. `) && /^\d+\. \S+niddeso$/.test(r.title))) fail("postcanonical-vism", `Vism ch. ${k} -> ${r.title}`);
      else count('postcanonical-vism-chapter');
    }
    for (const [vi, id] of ['visuddhimagga-1', 'visuddhimagga-2'].entries()) {
      for (const [, n] of pc.byId.get(id).blocks) {
        const range = postcanonical.paraRange(n);
        if (!range) continue;
        for (const ref of [`Vism §${range[0]}`, `visuddhi. ${vi + 1}.${range[0]}`]) {
          try {
            const r = postcanonical.locate(ref);
            if (r.book.id !== id || r.paragraph !== n) fail('postcanonical-vism', `${ref} -> ${r.book.id} §${r.paragraph}`);
            else count('postcanonical-vism-paragraph');
          } catch (e) { fail('postcanonical-vism', `${ref}: ${e.message}`); }
        }
      }
    }
    // Abhidhammatthasaṅgaha: 9 chapters "N. …paricchedo"; every numbered section resolves to its own block within its chapter.
    const abhs = pc.byId.get('abhidhammatthasangaho');
    for (let k = 1; k <= 9; k += 1) {
      const ch = postcanonical.locate(`Abhidh-s ${k}`);
      if (!(ch.title.startsWith(`${k}. `) && /^\d+\. \S+paricchedo$/.test(ch.title))) { fail('postcanonical-abhs', `Abhidh-s ${k} -> ${ch.title}`); continue; }
      count('postcanonical-abhs-chapter');
      for (let i = ch.start; i < ch.end; i += 1) {
        const range = postcanonical.paraRange(abhs.blocks[i][1]);
        if (!range) continue;
        try {
          const r = postcanonical.locate(`Abhidh-s ${k}.${range[0]}`);
          if (r.paragraph !== abhs.blocks[i][1] || r.start > i || r.end <= i) fail('postcanonical-abhs', `Abhidh-s ${k}.${range[0]} -> [${r.start},${r.end}) not block ${i}`);
          else count('postcanonical-abhs-section');
        } catch (e) { fail('postcanonical-abhs', `Abhidh-s ${k}.${range[0]}: ${e.message}`); }
      }
    }
    // Every block's citation round-trips: select(citationFor(block)) is a range of the same book that holds the block.
    const levels = { paragraph: 0, chapter: 0, book: 0 };
    for (const b of pc.books) {
      for (let i = 0; i < b.blocks.length; i += 1) {
        const c = postcanonical.citationFor(b, i);
        try {
          const r = postcanonical.select(c);
          if (!r || r.book !== b || i < r.start || i >= r.end) fail('postcanonical-roundtrip', `${b.id} block ${i}: ${c} -> ${r ? `${r.book.id} [${r.start},${r.end})` : 'null'}`);
          else { count('postcanonical-roundtrip'); levels[r.paragraph ? 'paragraph' : r.kind === 'book' || r.kind === 'work' ? 'book' : 'chapter'] += 1; }
        } catch (e) { fail('postcanonical-roundtrip', `${b.id} block ${i}: ${c}: ${e.message}`); }
      }
      // Generic forms: "<id> k.p" for the first block carrying p in chapter k (ranges such as 50-205 carry every p in them), and "<id> §p" when p occurs once.
      const seen = new Map();
      b.blocks.forEach(([, n]) => { const r = postcanonical.paraRange(n); if (r) for (let p = r[0]; p <= r[1]; p += 1) seen.set(p, (seen.get(p) || 0) + 1); });
      const firstInChapter = new Set();
      b.blocks.forEach(([, n], i) => {
        const r = postcanonical.paraRange(n);
        if (!r) return;
        const k = b.chapters.filter(([, s]) => s <= i).length;
        const forms = [];
        if (seen.get(r[0]) === 1) forms.push(`${b.id} §${r[0]}`);
        const first = k && !firstInChapter.has(`${k}|${r[0]}`);
        for (let p = r[0]; p <= r[1] && k; p += 1) firstInChapter.add(`${k}|${p}`);
        if (first) { if (i < (b.works.slice(1).find(([, w]) => w > b.chapters[k - 1][1])?.[1] ?? Infinity)) forms.push(`${b.id} ${k}.${r[0]}`); }
        for (const ref of forms) {
          try {
            const sel = postcanonical.select(ref);
            if (sel.book !== b || sel.start > i || sel.end <= i || sel.paragraph !== n) fail('postcanonical-generic', `${ref} -> [${sel.start},${sel.end}) §${sel.paragraph}, not block ${i}`);
            else count('postcanonical-generic-paragraph');
          } catch (e) { fail('postcanonical-generic', `${ref}: ${e.message}`); }
        }
      });
    }
    counts['postcanonical-citation-levels'] = levels;
    try { postcanonical.locate('Vism p. 3'); fail('postcanonical-vism', 'Vism p. 3 located without PTS data'); } catch { count('postcanonical-pts-refused'); }
  }
}
// 10. Bundled DPD subset (#22, #23): pinned to the recorded release, licensed, internally consistent, and covering
// the words of every text (analyse_passage must have something to say for any segment of any text).
{
  const dpd = loadDpd();
  const src = dpd.source;
  for (const key of ['version', 'asset_sha256', 'doi']) if (src[key] !== DPD_PIN[key]) fail('dpd-pin', `dpd.json.gz ${key} ${src[key]} != DPD_PIN ${DPD_PIN[key]}`);
  if (!/^[0-9a-f]{64}$/.test(src.asset_sha256 || '') || !/^[0-9a-f]{64}$/.test(src.db_sha256 || '')) fail('dpd-pin', 'missing SHA-256 checksums');
  if (src.license !== 'CC BY-NC-SA 4.0' || !/Bodhirasa/.test(src.attribution || '')) fail('dpd-licence', `${src.license} / ${src.attribution}`);
  if (src.canon_commit !== d.canon.source.commit) fail('dpd-canon', `built from canon ${src.canon_commit}, bundled canon is ${d.canon.source.commit}`);
  for (const [form, [ids = [], , splits = []]] of Object.entries(dpd.forms)) {
    for (const id of ids) if (!dpd.headwords.has(id)) fail('dpd-headword', `${form} -> missing headword ${id}`);
    if (!ids.length && !splits.length) fail('dpd-form', `${form} has neither headwords nor splits`);
  }
  for (const hw of dpd.headwords.values()) if (hw.root && !dpd.roots[hw.root]) count('dpd-root-unlisted');
  let tokens = 0;
  let known = 0;
  for (const u of d.canon.units) {
    if (u.kind === 'range') continue;
    let unitKnown = 0;
    for (const seg of canon.segments(u)) {
      for (const tok of tokenize(seg.text)) {
        for (const { form } of wordParts(tok)) {
          tokens += 1;
          if (Object.hasOwn(dpd.forms, form)) { known += 1; unitKnown += 1; }
        }
      }
    }
    if (!unitKnown) fail('dpd-text', `${u.id}: no word found in the DPD subset`);
    else count('dpd-text');
  }
  const coverage = known / tokens;
  counts['dpd-word-coverage-%'] = Number((coverage * 100).toFixed(2));
  if (coverage < 0.985) fail('dpd-coverage', `only ${(coverage * 100).toFixed(2)}% of ${tokens} words are in the DPD subset (need 98.5%)`);
}
// 7b. Content-matched links (#37): a known match type, recorded evidence that really occurs in the Pāli of the
// linked text, a page linked to no other text, and no second page from the same source on the text.
{
  const CONTENT = new Set(['content-pts+names', 'content-number+names', 'content-title+number']);
  const flat = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/(?<=[aiu])\1/g, '').replace(/([aiu])\1/g, '$1').replace(/[^a-z]/g, '');
  const pageKey = (l) => (l.source === 'ati' ? l.path.replace(/\.[^./]+$/, '').replace(/x$/, '') : l.url);
  const owners = new Map();
  for (const [id, links] of Object.entries(d.translations)) for (const l of links) owners.set(l.url, [...(owners.get(l.url) || []), id]);
  for (const [id, links] of Object.entries(d.translations)) {
    for (const l of links) {
      if (!String(l.match || '').startsWith('content')) continue;
      if (!CONTENT.has(l.match)) { fail('content-link', `${id}: unknown match type ${l.match}`); continue; }
      const u = d.byId.get(id);
      if (!u || u.approximate || u.kind === 'range') { fail('content-link', `${id}: content links only go to whole, non-abbreviated texts`); continue; }
      if (l.match !== 'content-title+number' && !(l.evidence || []).length) fail('content-link', `${id}: ${l.url} has no evidence`);
      const pali = flat(canon.segments(u).map((x) => x.text || '').join(' '));
      for (const term of l.evidence || []) {
        const stem = term.length <= 6 ? term.slice(0, -1) : term.slice(0, -2);
        if (!pali.includes(stem)) fail('content-link', `${id}: evidence "${term}" not in its Pāli`);
      }
      if ((owners.get(l.url) || []).length !== 1) fail('content-link', `${l.url} is linked to ${owners.get(l.url).join(', ')}`);
      const keys = new Set(links.filter((x) => x.source === l.source).map(pageKey));
      if (keys.size !== 1) fail('content-link', `${id}: ${keys.size} different ${l.source} pages`);
      count('content-link');
    }
  }
}
// 11. Parallels and cross-references (#29, D59): every link rechecked. Both texts resolve; commentary citations
// point at a real commentary segment that holds their evidence, with the quotation found again in the cited
// paragraph, and never reach SN or AN by number alone; shared passages name real segments that really share
// wording. The data must have been built from the bundled canon and commentary (SHA-256 recorded).
{
  const pd = parallels.load();
  if (!pd) fail('parallels', 'server/data/parallels.json.gz is missing');
  else {
    const size = statSync(new URL('../server/data/parallels.json.gz', import.meta.url)).size;
    counts['parallels-MB'] = Number((size / 1e6).toFixed(2));
    if (size > 5e6) fail('parallels', `parallels.json.gz is ${(size / 1e6).toFixed(1)} MB (budget 5 MB)`);
    for (const [file, meta] of Object.entries(pd.source.inputs)) {
      const sha = createHash('sha256').update(readFileSync(new URL(`../server/data/${file}`, import.meta.url))).digest('hex');
      if (sha !== meta.sha256) fail('parallels', `built from a different ${file}: rebuild with node scripts/parallels/build.mjs`);
      if (meta.vri_commit !== d.canon.source.commit) fail('parallels', `${file} input has VRI commit ${meta.vri_commit}`);
    }
    const MATCHES = new Set(['vri-reference+quotation', 'vri-reference', 'sutta-name', 'sutta-name+nikaya']);
    const comCache = new Map();
    const comSegs = (id) => {
      if (!comCache.has(id)) comCache.set(id, new Map(commentary.commentaryFor(d.byId.get(id), { limit: 100000 }).segments.map((x) => [x.ref, x.text])));
      return comCache.get(id);
    };
    const segCache = new Map();
    const segs = (id) => {
      if (!segCache.has(id)) segCache.set(id, new Map(canon.segments(d.byId.get(id)).map((x) => [x.ref, x])));
      return segCache.get(id);
    };
    const bookOf = new Map(d.canon.books.map((b, i) => [b.file, i]));
    for (const l of pd.citations) {
      const tag = `${l.from} -> ${l.to} (${l.commentary_ref})`;
      const from = d.byId.get(l.from);
      const to = d.byId.get(l.to);
      if (!from || !to) { fail('parallels-citation', `${tag}: a text does not resolve`); continue; }
      if (l.from === l.to) fail('parallels-citation', `${tag}: cites itself`);
      if (!MATCHES.has(l.match)) fail('parallels-citation', `${tag}: unknown match ${l.match}`);
      if (['sn', 'an'].includes(to.collection) && l.match === 'vri-reference') fail('parallels-citation', `${tag}: SN/AN linked by number alone`);
      const text = comSegs(l.from).get(l.commentary_ref);
      if (text === undefined) { fail('parallels-citation', `${tag}: commentary segment does not exist`); continue; }
      if (!l.evidence || !text.includes(l.evidence)) fail('parallels-citation', `${tag}: evidence not in the commentary segment`);
      if (l.target_segment && !segs(l.to).has(l.target_segment)) fail('parallels-citation', `${tag}: cited segment ${l.target_segment} does not exist`);
      if (l.match.startsWith('vri-reference')) {
        const bi = bookOf.get(l.cited?.vri_file);
        const blocks = d.canon.books[bi]?.blocks || [];
        const at = blocks.findIndex((x, i) => i >= to.start && i < to.end && (commentary.paraRange(x[1]) || [0, -1])[0] <= l.cited.vri_paragraph && l.cited.vri_paragraph <= (commentary.paraRange(x[1]) || [0, -1])[1]);
        if (bi !== to.book || at < 0) { fail('parallels-citation', `${tag}: VRI paragraph ${l.cited?.vri_paragraph} is not in ${l.to}`); continue; }
        if (!l.evidence.includes(l.vri_reference)) fail('parallels-citation', `${tag}: evidence lacks the reference`);
        if (l.match === 'vri-reference+quotation') {
          const [a, b] = commentary.paraRange(l.cited.reference_paragraphs) || [];
          const [qs, qe] = l.quotation_span || [];
          const r = a && qe > qs ? checkQuote(l.evidence.slice(qs, qe), paragraphWindow(bi, a, b)) : { status: 'none' };
          if (r.status !== 'whole' && r.status !== 'part') fail('parallels-citation', `${tag}: quotation not found again in the cited paragraph`);
          if (!(a <= l.cited.vri_paragraph && l.cited.vri_paragraph <= b)) fail('parallels-citation', `${tag}: paragraph outside the reference`);
        }
      } else {
        if (!l.named || !l.evidence.endsWith(l.named)) fail('parallels-citation', `${tag}: evidence lacks the sutta name`);
        const stem = canon.fold(l.named).replace(/sutt[a-z]*$/, '').split('sutta').at(-1);
        if (titleStem(to.title) !== stem) fail('parallels-citation', `${tag}: "${l.named}" is not the title of ${l.to}`);
      }
      count('parallels-citation');
    }
    const words = (t) => canon.fold(t).replace(/[^a-z]+/g, ' ').trim().split(' ');
    const K = pd.source.method['shared-passage'].shingle_words;
    for (const l of pd.shared) {
      const tag = `${l.a} <-> ${l.b}`;
      if (!d.byId.get(l.a) || !d.byId.get(l.b) || l.a === l.b) { fail('parallels-shared', `${tag}: a text does not resolve`); continue; }
      if (!(l.score > 0 && l.score <= 1)) fail('parallels-shared', `${tag}: score ${l.score}`);
      const ta = l.a_segments.map((r) => segs(l.a).get(r)?.text);
      const tb = l.b_segments.map((r) => segs(l.b).get(r)?.text);
      if (!ta.length || !tb.length || ta.includes(undefined) || tb.includes(undefined)) { fail('parallels-shared', `${tag}: a segment does not exist`); continue; }
      const grams = new Set();
      const wa = words(ta.join(' '));
      for (let i = 0; i + K <= wa.length; i++) grams.add(wa.slice(i, i + K).join(' '));
      const wb = words(tb.join(' '));
      let found = false;
      for (let i = 0; i + K <= wb.length && !found; i++) found = grams.has(wb.slice(i, i + K).join(' '));
      if (!found) fail('parallels-shared', `${tag}: the segments share no ${K}-word run`);
      count('parallels-shared');
    }
    const one = parallels.getParallels('MN 10', { limit: 100 });
    if (!one.links.every((x) => parallels.SOURCES.includes(x.source) && x.how_matched)) fail('parallels', 'a get_parallels link lacks its source');
  }
}
// 12. Glossary and sutta names (#102): same DPD pin as dpd.json.gz, no SuttaCentral columns, every name on a real
// text, every index entry pointing at a headword, within its 3 MB budget.
{
  const file = new URL('../server/data/glossary.json.gz', import.meta.url);
  const g = loadGlossary();
  const size = statSync(file).size;
  counts['glossary-bytes'] = size;
  if (size > 3 * 1024 * 1024) fail('glossary-size', `${size} bytes, budget 3 MB`);
  for (const key of ['version', 'asset_sha256']) if (g.source[key] !== DPD_PIN[key]) fail('glossary-pin', `glossary.json.gz ${key} ${g.source[key]} != DPD_PIN ${DPD_PIN[key]}`);
  if (g.source.license !== 'CC BY-NC-SA 4.0' || !/Bodhirasa/.test(g.source.attribution || '')) fail('glossary-licence', g.source.license);
  if (g.source.canon_commit !== d.canon.source.commit) fail('glossary-canon', `built from canon ${g.source.canon_commit}`);
  if (/suttacentral\.net|sc_bilara|"sc_/i.test(JSON.stringify(g.names))) fail('glossary-sc', 'SuttaCentral data in names');
  for (const [id, variants] of g.names) {
    if (!d.byId.has(id)) fail('glossary-name', `${id} is not a canon text`);
    else if (!variants.length) fail('glossary-name', `${id} has no name`);
    else count('glossary-name');
  }
  for (const table of ['en', 'phrases']) for (const [k, ids] of Object.entries(g[table])) {
    if (!ids.length || ids.some((i) => !g.headwords[i])) fail('glossary-entry', `${table} "${k}" points at a missing headword`);
  }
  counts['glossary-en-keys'] = Object.keys(g.en).length;
}
console.log(JSON.stringify(counts));
console.log(`texts: ${d.canon.units.length}; failures: ${failures.length}`);
const byKind = {};
for (const f of failures) { const k = f.split(':')[0]; (byKind[k] ||= []).push(f); }
for (const [k, list] of Object.entries(byKind)) { console.log(`\n== ${k} (${list.length})`); list.slice(0, 15).forEach((x) => console.log('  ' + x)); }
process.exitCode = failures.length ? 1 : 0;
