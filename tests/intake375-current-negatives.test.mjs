import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('CURRENT375 flat authority preserves mandatory proof and actual data refusal independently of H history',{timeout:125000},()=>{
 const root=fileURLToPath(new URL('../',import.meta.url));
 const result=spawnSync(process.env.PYTHON||'python3',['-B','tests/intake375_current_negatives.py'],{
  cwd:root,encoding:'utf8',timeout:120000,killSignal:'SIGKILL',maxBuffer:1024*1024,
 });
 assert.equal(result.error,undefined,String(result.error||''));
 assert.equal(result.signal,null,(result.stdout||'')+'\n'+(result.stderr||''));
 assert.equal(result.status,0,(result.stdout||'')+'\n'+(result.stderr||''));
 assert.match(result.stderr,/Ran 9 tests/);
 assert.doesNotMatch(result.stderr,/skipped=|FAILED|ERROR|FAIL:/);
});
