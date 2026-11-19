import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const python = ['python3','python'].find(command => spawnSync(command,['--version']).status === 0);
test('reviewed ATI question build preserves unrelated work and fails closed on finite identity, roots and actual-source drift', {skip:!python}, () => {
  const result = spawnSync(python,['scripts/canon/test_reviewed_ati_sections.py'], {
    encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},maxBuffer:2*1024*1024,
  });
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stderr,/Ran 3 tests/);
});
