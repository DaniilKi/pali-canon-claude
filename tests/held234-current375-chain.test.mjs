import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Actual-R current375 CLI metadata AST; the original ten H cases remain separately unchanged.
test('actual current375 held234 preflight preserves all historical bridges and rejects missing substituted or reordered368 hops',{timeout:125000},()=>{
 const result=spawnSync(process.env.PYTHON||'python3',['-B','tests/held234_current375_chain.py'],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:120000,killSignal:'SIGKILL',maxBuffer:1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUNBUFFERED:'1'}});
 const output=(result.stdout||'')+'\n'+(result.stderr||'');assert.equal(result.error,undefined,String(result.error||'')+'\n'+output);assert.equal(result.signal,null,output);assert.equal(result.status,0,output);assert.match(output,/Ran 4 tests in /);assert.match(output,/\nOK\s*$/);assert.doesNotMatch(output,/skipped=|FAILED|ERROR|FAIL:/);
});
