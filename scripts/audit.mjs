// Exhaustive offline audit of the bundled canon: every text, every citation form, every PTS start page, every translation link.
import * as canon from '../src/canon.mjs';
import { EDITIONS, editionLabel, editionIndex, nextUnit } from '../src/editions.mjs';
import { textSegments, parseNoteSpans, uncovered, SIGLA } from '../src/variants.mjs';
import * as commentary from '../src/commentary.mjs';

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
console.log(JSON.stringify(counts));
console.log(`texts: ${d.canon.units.length}; failures: ${failures.length}`);
const byKind = {};
for (const f of failures) { const k = f.split(':')[0]; (byKind[k] ||= []).push(f); }
for (const [k, list] of Object.entries(byKind)) { console.log(`\n== ${k} (${list.length})`); list.slice(0, 15).forEach((x) => console.log('  ' + x)); }
process.exitCode = failures.length ? 1 : 0;
