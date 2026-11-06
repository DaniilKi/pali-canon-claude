import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from '../src/canon.mjs';

const candidate = JSON.parse(readFileSync(new URL('../scripts/translations/cbeta-khp-candidate.json', import.meta.url)));
test('Chinese pilot candidates use actual canonical IDs and remain unapproved', () => {
  assert.deepEqual(candidate.candidates.map((row) => row.canonical_id), ['kp1', 'kp2', 'kp3', 'kp4']);
  assert.deepEqual(candidate.candidates.map((row) => row.section), [1, 2, 3, 4]);
  for (const row of candidate.candidates) {
    const { unit } = resolve(row.citation);
    assert.equal(row.canonical_id, unit.id);
    assert.equal(row.pali_title, unit.title);
  }
  assert.equal(candidate.gates.runtime_enabled, false);
  assert.equal(candidate.gates.independent_bilingual_review, 'not_obtained');
  assert.equal(candidate.rights.assigned_cc_license, null);
});

const python = ['python3', 'python'].find((command) => spawnSync(command, ['-c', 'import sys; assert sys.version_info >= (3, 8)'], { timeout: 5000 }).status === 0);
test('CBETA metadata-only inspection rejects ambiguous and incomplete synthetic XML', { skip: !python }, () => {
  const result = spawnSync(python, ['-m', 'unittest', 'discover', '-s', 'scripts/translations', '-p', 'test_cbeta_khp.py'], {
    encoding: 'utf8', timeout: 30000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stderr, /Ran 12 tests/);
});
