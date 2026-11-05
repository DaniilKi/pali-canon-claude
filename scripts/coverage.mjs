import { readBundled } from '../src/bundled-data.mjs';
// Print coverage numbers by collection from the bundled data (used for docs/coverage.md).
// Usage: node scripts/coverage.mjs [--json]
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as canon from '../src/canon.mjs';
import * as parallels from '../src/parallels.mjs';

const dataDir = fileURLToPath(new URL('../server/data/', import.meta.url));
const d = JSON.parse(gunzipSync(readBundled(`${dataDir}canon.json.gz`)));
// translations.json merged with server/data/anandajoti.json, as the server sees them.
const { translations } = canon.load();

const rows = new Map();
const total = { texts: 0, approximate: 0, grouped: 0, direct: 0, english: 0, dhammatalks: 0, ati: 0, anandajoti: 0 };
for (const u of d.units) {
  const r = rows.get(u.collection) ?? { collection: u.collection, name: d.collections[u.collection]?.name ?? u.collection, texts: 0, approximate: 0, grouped: 0, direct: 0, english: 0, dhammatalks: 0, ati: 0, anandajoti: 0 };
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
// Parallels and cross-references (#29, D59): links by source, and texts with at least one link, per collection.
const pd = parallels.load();
const par = {};
if (pd) {
  const coll = (id) => canon.load().byId.get(id).collection;
  const row = (c) => (par[c] ||= { collection: c, texts_with_links: new Set(), commentary_citations_from: 0, commentary_citations_to: 0, shared_passages: 0 });
  for (const l of pd.citations) { row(coll(l.from)).commentary_citations_from++; row(coll(l.to)).commentary_citations_to++; row(coll(l.from)).texts_with_links.add(l.from); row(coll(l.to)).texts_with_links.add(l.to); }
  for (const l of pd.shared) for (const id of [l.a, l.b]) { row(coll(id)).shared_passages++; row(coll(id)).texts_with_links.add(id); }
  for (const r of Object.values(par)) r.texts_with_links = r.texts_with_links.size;
}
const parallelsSummary = pd ? { commentary_citations: pd.citations.length, shared_passages: pd.shared.length, by_match: pd.counts.commentary_citations_by_match, collections: Object.values(par).sort((a, b) => (a.collection < b.collection ? -1 : 1)) } : null;
const summary = { source: d.source, books: d.books.length, words, pts_page_markers: pts, ...total, collections: [...rows.values()], parallels: parallelsSummary };

if (process.argv.includes('--json')) console.log(JSON.stringify(summary, null, 2));
else {
  console.log('collection\ttexts\tapprox\tgrouped\tenglish(texts)\tdhammatalks\tati\tanandajoti');
  for (const r of rows.values()) console.log([r.collection, r.texts, r.approximate, r.grouped, r.english, r.dhammatalks, r.ati, r.anandajoti].join('\t'));
  console.log(`\nbooks ${summary.books} · words ${words} · PTS markers ${pts} · texts ${total.texts} · approximate ${total.approximate} · grouped ${total.grouped}`);
  console.log(`english: ${total.direct} texts directly, ${total.english} incl. inherited · links dhammatalks ${total.dhammatalks} + ati ${total.ati} + anandajoti ${total.anandajoti} = ${total.dhammatalks + total.ati + total.anandajoti}`);
  if (parallelsSummary) {
    console.log(`
parallels: ${parallelsSummary.commentary_citations} commentary citations (${Object.entries(parallelsSummary.by_match).map(([k, v]) => `${k} ${v}`).join(', ')}) · ${parallelsSummary.shared_passages} shared passages`);
    console.log('collection	texts_with_links	cited_by_commentary	commentary_cites	shared_passages');
    for (const r of parallelsSummary.collections) console.log([r.collection, r.texts_with_links, r.commentary_citations_to, r.commentary_citations_from, r.shared_passages].join('	'));
  }
}
