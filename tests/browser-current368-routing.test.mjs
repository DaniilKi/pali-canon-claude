// Explicit immutable H input lane. The provider validates CURRENT375 first; registrations stay in actual R.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
const ownedHistoricalHInputs=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('current368 source routing preserves every359 object and five exact suffixes without runtime capture',{timeout:125000},()=>{
 const result=spawnSync(process.env.PYTHON||'python3',['-B','tests/browser_current368_routing.py'],{cwd:ownedHistoricalHInputs.root,encoding:'utf8',timeout:120000,killSignal:'SIGKILL',maxBuffer:1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUNBUFFERED:'1'}});
 const output=(result.stdout||'')+'\n'+(result.stderr||'');assert.equal(result.error,undefined,String(result.error||'')+'\n'+output);assert.equal(result.signal,null,output);assert.equal(result.status,0,output);assert.match(output,/Ran 4 tests in /);assert.match(output,/\nOK\s*$/);assert.doesNotMatch(output,/skipped=|FAILED|ERROR|FAIL:/);
});
