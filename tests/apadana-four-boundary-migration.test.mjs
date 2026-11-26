import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function runClass(name, count, timeout) {
  const result = spawnSync(process.env.PYTHON || 'python3',
    ['-B', 'tests/apadana_four_boundary_acceptance.py', name],
    { encoding: 'utf8', timeout, maxBuffer: 1024 * 1024,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUNBUFFERED: '1' } });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`;
  assert.equal(result.error, undefined, `${name}: ${result.error}\n${output}`);
  assert.equal(result.signal, null, `${name}: terminated ${result.signal}\n${output}`);
  assert.equal(result.status, 0, `${name}: ${output}`);
  assert.match(output, new RegExp(`Ran ${count} tests? in `));
  assert.match(output, /\nOK\s*$/);
  assert.doesNotMatch(output, /skipped=|FAILED|ERROR|FAIL:/);
}

test('finite four-poem data, crosswalk and strict atomic migration gates', { timeout: 95000 }, () => {
  runClass('FourBoundaryData', 8, 90000);
});

test('pinned original XML four-poem repair and global/raw refusal gates',
  { skip: !process.env.VRI_SOURCE_CHECKOUT, timeout: 125000 }, () => {
    runClass('OriginalSource', 2, 120000);
  });
