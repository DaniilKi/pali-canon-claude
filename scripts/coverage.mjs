// Print coverage numbers by collection from the bundled data (used for docs/coverage.md).
// Usage: node scripts/coverage.mjs [--json]
import { pathToFileURL } from 'node:url';
import { isPartial, isShared, isScoped } from '../src/translation-scope.mjs';
import * as canon from '../src/canon.mjs';
import * as parallels from '../src/parallels.mjs';

export function buildCoverage() {
  const d = canon.load().canon;
  const { translations } = canon.load();

  const rows = new Map();
  const total = { texts: 0, approximate: 0, grouped: 0, direct: 0, english: 0, dhammatalks: 0, ati: 0, anandajoti: 0, partial_texts: 0, partial_links: 0, partial_dhammatalks: 0, partial_ati: 0, partial_anandajoti: 0, shared_texts: 0, shared_links: 0, shared_dhammatalks: 0, shared_ati: 0, shared_anandajoti: 0 };
  for (const u of d.units) {
    const r = rows.get(u.collection) ?? { collection: u.collection, name: d.collections[u.collection]?.name ?? u.collection, texts: 0, approximate: 0, grouped: 0, direct: 0, english: 0, dhammatalks: 0, ati: 0, anandajoti: 0, partial_texts: 0, partial_links: 0, partial_dhammatalks: 0, partial_ati: 0, partial_anandajoti: 0, shared_texts: 0, shared_links: 0, shared_dhammatalks: 0, shared_ati: 0, shared_anandajoti: 0 };
    rows.set(u.collection, r);
    r.texts++;
    if (u.approximate) r.approximate++;
    r.grouped += u.members?.length ?? 0;
    const own = translations[u.id] || [];
    const reach = canon.linksFor(u).links; // Validates every partial declaration before counting.
    for (const t of own) {
      if (isShared(t)) { r.shared_links++; r['shared_' + t.source]++; }
      else if (isPartial(t)) { r.partial_links++; r['partial_' + t.source]++; }
      else r[t.source]++;
    }
    if (own.some(t => !isScoped(t))) r.direct++;
    if (reach.some(t => !isScoped(t))) r.english++;
    if (own.some(isPartial)) r.partial_texts++;
    if (reach.some(isShared)) r.shared_texts++;
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
  return { source: d.source, books: d.books.length, words, pts_page_markers: pts, ...total, collections: [...rows.values()], parallels: parallelsSummary };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const summary = buildCoverage();
  const { collections: rows, parallels: parallelsSummary } = summary;
  const total = summary;
  const { words, pts_page_markers: pts } = summary;
  if (process.argv.includes('--json')) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log('collection\ttexts\tapprox\tgrouped\tenglish(texts)\tdhammatalks\tati\tanandajoti');
    for (const r of rows) console.log([r.collection, r.texts, r.approximate, r.grouped, r.english, r.dhammatalks, r.ati, r.anandajoti].join('\t'));
    console.log(`\nbooks ${summary.books} · words ${words} · PTS markers ${pts} · texts ${total.texts} · approximate ${total.approximate} · grouped ${total.grouped}`);
    console.log(`english: ${total.direct} texts directly, ${total.english} incl. inherited · links dhammatalks ${total.dhammatalks} + ati ${total.ati} + anandajoti ${total.anandajoti} = ${total.dhammatalks + total.ati + total.anandajoti}`);
    console.log(`partial translations: ${total.partial_texts} indexed records · ${total.partial_links} links (separate from whole-unit English coverage)`);
    console.log(`shared pages: ${total.shared_links} declarations · ${total.shared_texts} listed members (not whole-unit coverage or separate translations)`);
    if (parallelsSummary) {
      console.log(`\nparallels: ${parallelsSummary.commentary_citations} commentary citations (${Object.entries(parallelsSummary.by_match).map(([k, v]) => `${k} ${v}`).join(', ')}) · ${parallelsSummary.shared_passages} shared passages`);
      console.log('collection	texts_with_links	cited_by_commentary	commentary_cites	shared_passages');
      for (const r of parallelsSummary.collections) console.log([r.collection, r.texts_with_links, r.commentary_citations_to, r.commentary_citations_from, r.shared_passages].join('	'));
    }
  }
}
