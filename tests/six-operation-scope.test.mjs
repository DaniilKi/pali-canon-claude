import {runPythonPartitions} from './helpers/partitioned-python.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('private per-operation history reuse preserves fresh public data/proof checks and refuses escaped scopes',{timeout:65000},async(t)=>{
 if(process.platform==='win32'||process.platform==='darwin'){
  const partitionRoot=fileURLToPath(new URL('../',import.meta.url));
  await runPythonPartitions({root:partitionRoot,suiteKey:'six-operation-scope',signal:t.signal});
  return;
 }
 const root=fileURLToPath(new URL('../',import.meta.url));
 const r=spawnSync(process.env.PYTHON||'python3',['-B','tests/six_operation_scope_controls.py'],{
  cwd:root,encoding:'utf8',timeout:60000,killSignal:'SIGKILL',maxBuffer:256*1024,
 });
 assert.equal(r.error,undefined,String(r.error||''));
 assert.equal(r.signal,null,(r.stdout||'')+'\n'+(r.stderr||''));
 assert.equal(r.status,0,(r.stdout||'')+'\n'+(r.stderr||''));
 assert.match(r.stderr,/Ran 7 tests/);
 assert.doesNotMatch(r.stderr,/skipped=|FAILED|ERROR|FAIL:/);
});
