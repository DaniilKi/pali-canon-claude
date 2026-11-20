import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('independent intake and runtime acceptance reject omissions, substitutions and drift',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const result=spawnSync('python3',['tests/approved_acceptance.py'],{cwd:root,encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stderr,/Ran 33 tests/);
});
