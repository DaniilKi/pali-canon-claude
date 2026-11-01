#!/usr/bin/env node
/**
 * Live audit of server/data/anandajoti.json: fetches a sample of linked pages through the server's own
 * allowlisted client (src/http.mjs) and checks that each still answers, still carries the Pāli of the
 * text it is linked to (same coverage rule as the build), and that the extracted text is non-trivial.
 *
 * Usage: node scripts/anandajoti/audit.mjs [--sample 30] [--all]
 */
import { readFileSync } from 'node:fs';
import * as canon from '../../src/canon.mjs';
import { fetchPublic } from '../../src/http.mjs';
import { anandajotiContent, anandajotiUrl } from '../../src/english.mjs';
import { words, paliOf, coverage } from './build.mjs';

const args = process.argv.slice(2);
const all = args.includes('--all');
const n = Number(args[args.indexOf('--sample') + 1]) || 30;
const index = JSON.parse(readFileSync(new URL('../../server/data/anandajoti.json', import.meta.url), 'utf8'));
const entries = Object.entries(index.links);
// Deterministic sample spread over the whole index (every k-th entry), so reruns check the same pages.
const step = all ? 1 : Math.max(1, Math.floor(entries.length / n));
const sample = entries.filter((_, i) => i % step === 0).slice(0, all ? undefined : n);

let failures = 0;
for (const [id, link] of sample) {
  const unit = canon.resolve(id).unit;
  try {
    let html = '';
    for (const part of link.parts || [link.path]) html += await fetchPublic(anandajotiUrl(part), { json: false });
    const cov = coverage(words(paliOf(html)), unit);
    const text = anandajotiContent(html);
    const ok = cov >= 0.6 && text.length > 200;
    if (!ok) failures += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(12)} coverage ${cov.toFixed(2)} text ${String(text.length).padStart(7)} chars  ${link.path}`);
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${id.padEnd(12)} ${error.message}  ${link.path}`);
  }
}
console.log(`\nchecked ${sample.length} of ${entries.length} links; ${failures} failures`);
process.exitCode = failures ? 1 : 0;
