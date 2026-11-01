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
  const rootParas = new Map(); // root book -> Map(paragraph -> [block indexes])
  const parasOf = (bi) => {
    if (rootParas.has(bi)) return rootParas.get(bi);
    const map = new Map();
    let current = null;
    d.canon.books[bi].blocks.forEach((b, i) => {
      const m = String(b[1] ?? '').match(/^(\d+)(?:-(\d+))?$/);
      if (m) current = [Number(m[1]), Number(m[2] ?? m[1])];
      if (!current) return;
      for (let p = current[0]; p <= current[1]; p += 1) (map.get(p) || map.set(p, []).get(p)).push(i);
    });
    rootParas.set(bi, map);
    return map;
  };
  for (const [i, p] of com.passages.entries()) {
    const [bi, start, end, root, a, b, , , evidence] = p;
    const book = com.books[bi];
    if (!book || start < 0 || end > book.blocks.length || start >= end) { fail('commentary-passage', `#${i} has a bad block range`); continue; }
    if (!book.blocks.slice(start, end).some((x) => x[2])) fail('commentary-passage', `#${i} (${book.file}) is empty`);
    if (!d.canon.books[root] || !book.root_files.includes(d.canon.books[root].file)) fail('commentary-passage', `#${i} (${book.file}) points at root book ${root}, not one it comments on`);
    else if (![...Array(b - a + 1).keys()].some((k) => parasOf(root).has(a + k))) fail('commentary-passage', `#${i} paragraph ${a}-${b} is not in ${d.canon.books[root].file}`);
    if (!['paragraph', 'paragraph+lemma'].includes(evidence)) fail('commentary-passage', `#${i} has unknown evidence ${evidence}`);
    count('commentary-passage');
  }
  for (const [id, list] of Object.entries(com.units)) {
    const u = d.byId.get(id);
    if (!u) { fail('commentary-unit', `${id} is not a canon text`); continue; }
    for (const pi of list) {
      const p = com.passages[pi];
      if (!p) { fail('commentary-unit', `${id} -> missing passage #${pi}`); continue; }
      const blocks = [];
      for (let k = p[4]; k <= p[5]; k += 1) blocks.push(...(parasOf(p[3]).get(k) || []));
      if (p[3] !== u.book || !blocks.some((x) => x >= u.start && x < u.end)) fail('commentary-unit', `${id}: passage #${pi} (paragraphs ${p[4]}-${p[5]}) is outside the text`);
      else count('commentary-alignment');
    }
  }
  // Spot-checks: citation -> a heading the commentary must show (or no commentary at all).
  const spot = [
    ['DN 1', 'Brahmajāla'], ['DN 22', 'Mahāsatipaṭṭhānasuttavaṇṇanā'], ['MN 1', 'Mūlapariyāyasuttavaṇṇanā'],
    ['MN 10', 'Satipaṭṭhānasuttavaṇṇanā'], ['MN 21', 'Kakacūpamasuttavaṇṇanā'], ['SN 56.11', 'Dhammacakkappavattanasuttavaṇṇanā'],
    ['SN 22.59', 'Anattalakkhaṇasuttavaṇṇanā'], ['AN 3.65', 'Kesamuttisuttavaṇṇanā'], ['AN 8.53', 'Saṃkhittasuttavaṇṇanā'],
    ['Dhp 1', 'Cakkhupālattheravatthu'], ['Dhp 183', 'Ānandattherapañhavatthu'], ['Dhp 1–20', 'Yamakavaggo'], ['AN 1.9', null],
  ];
  for (const [ref, heading] of spot) {
    try {
      const r = commentary.getCommentary(ref, { limit: 200 });
      const text = r.segments.map((s) => s.text).join('\n');
      if (heading === null ? r.available : !(r.available && text.includes(heading))) fail('commentary-spot', `${ref}: expected ${heading === null ? 'no commentary' : `"${heading}"`}`);
      else count('commentary-spot');
    } catch (e) { fail('commentary-spot', `${ref}: ${e.message}`); }
  }
  // Every sutta-commentary heading in a single-paragraph passage names the text it is aligned to.
  const key = (s) => canon.fold(s).replace(/[nm](?=[kg])/g, 'n').replace(/[^a-z]/g, '');
  for (const u of d.canon.units) {
    if (!['dn', 'mn', 'sn', 'an'].includes(u.collection) || u.kind === 'range' || u.approximate) continue;
    const t = key(u.title || '').replace(/(suttam|sutta)$/, '');
    for (const pi of com.units[u.id] || []) {
      const p = com.passages[pi];
      if (p[4] !== p[5]) continue;
      for (const head of com.books[p[0]].blocks.slice(p[1], p[2])) {
        if (head[0] === 'centre' || !/suttavaṇṇanā$/.test(head[2])) continue;
        const h = key(head[2].replace(/^[\d\-–. ]+/, '').replace(/suttavaṇṇanā$/, ''));
        if (!(h && t && (h.includes(t.slice(0, 6)) || t.includes(h.slice(0, 6))))) fail('commentary-heading', `${u.id} "${u.title}" has commentary headed "${head[2]}"`);
        else count('commentary-heading');
      }
    }
  }
  // Coverage floor for the main collections (texts with at least one aligned passage).
  const floor = { dn: 1, mn: 1, dhp: 0.99, sn: 0.9, an: 0.75 };
  for (const [coll, min] of Object.entries(floor)) {
    const texts = d.canon.units.filter((u) => u.collection === coll && u.kind !== 'range' && !u.approximate);
    const covered = texts.filter((u) => com.units[u.id]).length;
    counts[`commentary-${coll}`] = `${covered}/${texts.length}`;
    if (covered < min * texts.length) fail('commentary-coverage', `${coll}: ${covered}/${texts.length} texts have commentary (floor ${min})`);
  }
}
console.log(JSON.stringify(counts));
console.log(`texts: ${d.canon.units.length}; failures: ${failures.length}`);
const byKind = {};
for (const f of failures) { const k = f.split(':')[0]; (byKind[k] ||= []).push(f); }
for (const [k, list] of Object.entries(byKind)) { console.log(`\n== ${k} (${list.length})`); list.slice(0, 15).forEach((x) => console.log('  ' + x)); }
process.exitCode = failures.length ? 1 : 0;
