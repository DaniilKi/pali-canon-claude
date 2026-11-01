// Exhaustive offline audit of the bundled canon: every text, every citation form, every PTS start page, every translation link.
import * as canon from '../src/canon.mjs';
import { EDITIONS, editionLabel, editionIndex, nextUnit } from '../src/editions.mjs';
import { textSegments, parseNoteSpans, uncovered, SIGLA } from '../src/variants.mjs';
import { loadDpd, DPD_PIN, tokenize, wordParts } from '../src/analyse.mjs';

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
// 8. Bundled DPD subset (#22, #23): pinned to the recorded release, licensed, internally consistent, and covering
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
console.log(JSON.stringify(counts));
console.log(`texts: ${d.canon.units.length}; failures: ${failures.length}`);
const byKind = {};
for (const f of failures) { const k = f.split(':')[0]; (byKind[k] ||= []).push(f); }
for (const [k, list] of Object.entries(byKind)) { console.log(`\n== ${k} (${list.length})`); list.slice(0, 15).forEach((x) => console.log('  ' + x)); }
process.exitCode = failures.length ? 1 : 0;
