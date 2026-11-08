import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import { buildCoverage } from '../scripts/coverage.mjs';
import { buildIndex, toCsv, CSV_COLUMNS, notice } from '../scripts/export-index.mjs';
import { syntheticLink } from './helpers/partial-translation.mjs';
let saved;
function install(links) { const d = canon.load(); saved ||= d.translations; d.translations = { ...d.translations, 'patthana1.1': links }; }
afterEach(() => { if (saved) canon.load().translations = saved; saved = undefined; });
function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\r' && text[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += ch;
  }
  return rows;
}
const record = index => index.texts.find(t => t.id === 'patthana1.1');
const numeric = ['direct', 'english', 'dhammatalks', 'ati', 'anandajoti'];

test('documentation coverage counts partial-only and mixed sources separately from whole-unit links', () => {
  const before = buildCoverage(); const partial = syntheticLink(); install([partial]);
  const after = buildCoverage();
  for (const field of numeric) assert.equal(after[field], before[field], field);
  assert.equal(after.partial_texts, before.partial_texts + 1); assert.equal(after.partial_links, before.partial_links + 1);
  assert.equal(after.partial_dhammatalks, before.partial_dhammatalks + 1);
  for (const field of ['partial_texts', 'partial_links', 'partial_dhammatalks', 'partial_ati', 'partial_anandajoti']) {
    assert.equal(after.collections.reduce((n, r) => n + r[field], 0), after[field]);
  }
  const full = { ...partial, url: partial.url.replace('PARTIAL', 'FULL') }; delete full.partial_scope;
  install([partial, full]); const mixed = buildCoverage();
  for (const field of ['direct', 'english', 'dhammatalks']) assert.equal(mixed[field], before[field] + 1);
  assert.equal(mixed.partial_links, after.partial_links);
});

test('citation JSON and CSV retain exact partial scope, identity and licence without inflating whole-unit columns', () => {
  const partial = syntheticLink(); partial.reference = 'Synthetic, "quoted" | caption\nsecond line'; install([partial]);
  const index = buildIndex(), t = record(index), exported = t.english[0];
  assert.equal(t.english_count, 0); assert.equal(t.partial_english_count, 1);
  assert.deepEqual(exported.translation_scope, canon.describe(canon.resolve(t.id).unit).english[0].translation_scope);
  assert.equal(exported.whole_unit_coverage, false); assert.equal(exported.license, 'CC BY-NC 4.0');
  const rows = parseCsv(toCsv(index)), row = rows.find(r => r[0] === t.id), col = name => CSV_COLUMNS.indexOf(name);
  assert.equal(row[col('english_count')], '0'); assert.equal(row[col('partial_english_count')], '1');
  for (const name of ['english_urls', 'english_translators', 'english_references', 'english_translation_ids', 'english_licenses']) assert.equal(row[col(name)], '', name);
  assert.deepEqual(JSON.parse(row[col('partial_english')]), [exported]);
  assert.match(notice(index), /exclude partial sources/);
  assert.doesNotMatch(JSON.stringify(exported), /Synthetic fixture only: amber|paccayuddesaniddesa/i);
});

test('mixed-version CSV preserves only whole-unit links in legacy fields, with partials separately readable', () => {
  const partial = syntheticLink(), full = { ...partial, url: partial.url.replace('PARTIAL', 'FULL') }; delete full.partial_scope;
  install([partial, full]); const t = record(buildIndex());
  const rows = parseCsv(toCsv({ texts: [t] })), row = rows[1], col = name => CSV_COLUMNS.indexOf(name);
  assert.equal(t.english_count, 1); assert.equal(row[col('english_count')], '1');
  assert.equal(row[col('english_urls')], full.url); assert.equal(row[col('english_translation_ids')], canon.translationId(full));
  assert.equal(JSON.parse(row[col('partial_english')])[0].url, partial.url);
});

test('coverage and export reject invalid partial declarations before publishing a report', () => {
  const partial = syntheticLink(); partial.partial_scope.status = 'assessment_only'; install([partial]);
  assert.throws(buildCoverage, /Invalid or unreviewed/); assert.throws(buildIndex, /Invalid or unreviewed/);
});

test('actual coverage and release-export CLIs preserve synthetic partial scope with network forbidden', () => {
  const stage = mkdtempSync(join(tmpdir(), 'pali-export-fixture-'));
  try {
    const preload = join(stage, 'fixture.mjs'), out = join(stage, 'export');
    writeFileSync(preload, `import * as canon from ${JSON.stringify(pathToFileURL(resolve('src/canon.mjs')).href)};\nimport { syntheticLink } from ${JSON.stringify(pathToFileURL(resolve('tests/helpers/partial-translation.mjs')).href)};\nconst d = canon.load(); d.translations = { ...d.translations, 'patthana1.1': [syntheticLink()] }; globalThis.fetch = () => { throw Error('Unexpected network'); };`);
    const run = (script, args) => { const r = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, script, ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
    const before = buildCoverage(), report = JSON.parse(run('scripts/coverage.mjs', ['--json']));
    for (const field of numeric) assert.equal(report[field], before[field], field);
    assert.equal(report.partial_links, before.partial_links + 1);
    assert.equal(report.partial_texts, before.partial_texts + 1);
    assert.equal(report.partial_ati, before.partial_ati);
    assert.equal(report.partial_dhammatalks, before.partial_dhammatalks + 1);
    run('scripts/export-index.mjs', ['--out', out]);
    const t = record(JSON.parse(readFileSync(join(out, 'citation-index.json'), 'utf8')));
    assert.equal(t.english_count, 0); assert.equal(t.partial_english_count, 1);
    const rows = parseCsv(readFileSync(join(out, 'citation-index.csv'), 'utf8')), row = rows.find(r => r[0] === t.id);
    assert.deepEqual(JSON.parse(row[rows[0].indexOf('partial_english')]), t.english);
    assert.match(readFileSync(join(out, 'citation-index-LICENSE.md'), 'utf8'), /exclude partial sources/);
  } finally { rmSync(stage, { recursive: true, force: true }); }
});
