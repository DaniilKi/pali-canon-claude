import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Windows CI exceeded the original 30s on the current proof chain. Keep every
// assertion and the existing fixture ceiling: 120s child, 125s parent. Timeout
// remains fatal; no retry or OS-dependent skip is permitted.
test('separate current339 authorities reject new proof loss, substitutions, tampering and historical fallback',{timeout:125000},()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const result=spawnSync('python3',['-B','tests/approved_current339_authority_negatives.py'],{
    cwd:root,encoding:'utf8',timeout:120000,killSignal:'SIGKILL',maxBuffer:256*1024,
  });
  assert.equal(result.error,undefined,String(result.error||''));
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stderr,/Ran 7 tests/);
});
