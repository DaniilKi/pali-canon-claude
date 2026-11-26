import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('separate current333 authorities reject new proof loss, substitutions, tampering and historical fallback',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const result=spawnSync('python3',['-B','tests/approved_current333_authority_negatives.py'],{
    cwd:root,encoding:'utf8',timeout:30000,maxBuffer:256*1024,
  });
  assert.equal(result.error,undefined,String(result.error||''));
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stderr,/Ran 7 tests/);
});
