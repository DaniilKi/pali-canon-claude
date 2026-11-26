import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('actual held234 metadata preflight keeps the full325,333,339 and343 bridges into current359 and rejects baseline corruption',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const result=spawnSync('python3',['-B','tests/held234_current333_chain.py'],{
    cwd:root,encoding:'utf8',timeout:30000,maxBuffer:256*1024,
  });
  assert.equal(result.error,undefined,String(result.error||''));
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stderr,/Ran 8 tests/);
});
