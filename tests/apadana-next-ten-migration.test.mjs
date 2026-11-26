import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function runClass(name, count) {
  const result = spawnSync(process.env.PYTHON || 'python3',
    ['-B', 'tests/apadana_next_ten_boundary_acceptance.py', name],
    { encoding: 'utf8', timeout: 120000, killSignal: 'SIGKILL', maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUNBUFFERED: '1' } });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.error, undefined, `${name}: ${result.error}\n${output}`);
  assert.equal(result.signal, null, `${name}: terminated ${result.signal}\n${output}`);
  assert.equal(result.status, 0, `${name}: ${output}`);
  assert.match(output, new RegExp(`Ran ${count} tests? in `));
  assert.match(output, /\nOK\s*$/);
  assert.doesNotMatch(output, /skipped=|FAILED|ERROR|FAIL:/);
}

test('next ten: independent exact data, all144 source positions, full preservation and atomic gates',
  { timeout: 125000 }, () => {
    runClass('NextTenBoundaryData', 12);
  });

test('next ten: both pinned original XML books, late failures, exact PTS and bounded full CLI',
  { skip: !process.env.VRI_SOURCE_CHECKOUT, timeout: 125000 }, () => {
    runClass('OriginalSource', 4);
  });
