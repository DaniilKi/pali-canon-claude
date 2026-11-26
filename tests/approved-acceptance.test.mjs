import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('independent intake and runtime acceptance reject omissions, substitutions and drift',()=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const started=process.hrtime.bigint();
  const result=spawnSync('python3',['tests/approved_acceptance.py','-v'],{cwd:root,encoding:'utf8',timeout:30000});
  // Record the actual subprocess outcome; elapsed time alone is not a cause.
  console.error('[approved-acceptance-subprocess] '+JSON.stringify({
    timeout_ms:30000,elapsed_ms:Number(process.hrtime.bigint()-started)/1e6,
    status:result.status,signal:result.signal,error_name:result.error?.name||null,
    error_code:result.error?.code||null,error_message:result.error?.message||null,
  }));
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stderr,/Ran 33 tests/);
});
