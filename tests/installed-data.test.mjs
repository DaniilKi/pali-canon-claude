// An intact canon alone must not make an incomplete installed package pass.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, unlinkSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('installed package check rejects a missing lazy dictionary shard after the canon loads', { timeout: 120000 }, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pali-missing-dictionary-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(new URL('../server/', import.meta.url), join(dir, 'server'), { recursive: true });
  const data = join(dir, 'server', 'data');
  const manifest = join(data, 'dpd.json.gz.parts.json');
  const missing = existsSync(manifest) ? JSON.parse(readFileSync(manifest)).parts.at(-1).file : 'dpd.json.gz';
  unlinkSync(join(data, missing));
  const script = fileURLToPath(new URL('../scripts/npx-check.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [script, process.execPath, join(dir, 'server', 'index.cjs')], {
    cwd: dir, encoding: 'utf8', timeout: 110000,
  });
  assert.equal(run.status, 1, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /PASS tools\/call get_text/);
  assert.match(run.stdout, /PASS tools\/call get_commentary/);
  assert.match(run.stdout, /PASS tools\/call get_post_canonical/);
  assert.match(run.stderr, /FAIL analyse_passage/);
  assert.ok(run.stderr.includes(missing), run.stderr);
});

test('installed package check rejects a silently omitted translation link index', { timeout: 120000 }, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pali-missing-links-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(new URL('../server/', import.meta.url), join(dir, 'server'), { recursive: true });
  unlinkSync(join(dir, 'server', 'data', 'anandajoti.json'));
  const script = fileURLToPath(new URL('../scripts/npx-check.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [script, process.execPath, join(dir, 'server', 'index.cjs')], {
    cwd: dir, encoding: 'utf8', timeout: 110000,
  });
  assert.equal(run.status, 1, `${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /PASS tools\/call get_text/);
  assert.match(run.stderr, /FAIL get_metadata: bundled offline data check failed/);
});

test('failed isolated package audit replaces an earlier successful report', { timeout: 120000 }, (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'pali-audit-report-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  cpSync(new URL('../server/', import.meta.url), join(dir, 'server'), { recursive: true });
  const data = join(dir, 'server', 'data');
  const missing = existsSync(join(data, 'canon.json.gz')) ? 'canon.json.gz' : 'canon.json.gz.parts.json';
  unlinkSync(join(data, missing));
  const report = join(dir, 'report.json');
  writeFileSync(report, JSON.stringify({ status: 'passed' }));
  const script = fileURLToPath(new URL('../scripts/audit-installed.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [script, '--server-dir', join(dir, 'server'), '--report', report], {
    cwd: dir, encoding: 'utf8', timeout: 110000,
  });
  assert.equal(run.status, 1, `${run.stdout}\n${run.stderr}`);
  const result = JSON.parse(readFileSync(report));
  assert.equal(result.status, 'failed');
  assert.ok(result.error.length);
  assert.ok(result.partial_counts.canonical_texts < 8544);
});
