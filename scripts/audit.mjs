// Exhaustive offline audit of the bundled canon: every text, every citation form, every PTS start page, every translation link.
import * as canon from '../src/canon.mjs';
import { EDITIONS, editionLabel, editionIndex, nextUnit } from '../src/editions.mjs';

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
console.log(JSON.stringify(counts));
console.log(`texts: ${d.canon.units.length}; failures: ${failures.length}`);
const byKind = {};
for (const f of failures) { const k = f.split(':')[0]; (byKind[k] ||= []).push(f); }
for (const [k, list] of Object.entries(byKind)) { console.log(`\n== ${k} (${list.length})`); list.slice(0, 15).forEach((x) => console.log('  ' + x)); }
process.exitCode = failures.length ? 1 : 0;
