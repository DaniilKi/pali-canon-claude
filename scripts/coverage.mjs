// Print coverage numbers by collection from the bundled data (used for docs/coverage.md).
// Usage: node scripts/coverage.mjs [--json]
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as canon from '../src/canon.mjs';

const dataDir = fileURLToPath(new URL('../server/data/', import.meta.url));
const d = JSON.parse(gunzipSync(readFileSync(`${dataDir}canon.json.gz`)));
const translations = JSON.parse(readFileSync(`${dataDir}translations.json`, 'utf8'));
canon.load();

const rows = new Map();
const total = { texts: 0, approximate: 0, grouped: 0, direct: 0, english: 0, dhammatalks: 0, ati: 0 };
for (const u of d.units) {
  const r = rows.get(u.collection) ?? { collection: u.collection, name: d.collections[u.collection]?.name ?? u.collection, texts: 0, approximate: 0, grouped: 0, direct: 0, english: 0, dhammatalks: 0, ati: 0 };
  rows.set(u.collection, r);
  r.texts++;
  if (u.approximate) r.approximate++;
  r.grouped += u.members?.length ?? 0;
  for (const t of translations[u.id] ?? []) r[t.source]++;
  if (translations[u.id]?.length) r.direct++;
  if (canon.linksFor(u).links.length) r.english++;
}
for (const r of rows.values()) for (const k of Object.keys(total)) total[k] += r[k];
let words = 0, pts = 0;
for (const b of d.books) for (const block of b.blocks) { words += block[2].split(/\s+/).filter(Boolean).length; pts += block[4]?.P?.length ?? 0; }
const summary = { source: d.source, books: d.books.length, words, pts_page_markers: pts, ...total, collections: [...rows.values()] };

if (process.argv.includes('--json')) console.log(JSON.stringify(summary, null, 2));
else {
  console.log('collection\ttexts\tapprox\tgrouped\tenglish(texts)\tdhammatalks\tati');
  for (const r of rows.values()) console.log([r.collection, r.texts, r.approximate, r.grouped, r.english, r.dhammatalks, r.ati].join('\t'));
  console.log(`\nbooks ${summary.books} · words ${words} · PTS markers ${pts} · texts ${total.texts} · approximate ${total.approximate} · grouped ${total.grouped}`);
  console.log(`english: ${total.direct} texts directly, ${total.english} incl. inherited · links dhammatalks ${total.dhammatalks} + ati ${total.ati} = ${total.dhammatalks + total.ati}`);
}
