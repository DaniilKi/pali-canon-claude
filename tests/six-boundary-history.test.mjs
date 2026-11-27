// Explicit immutable H input lane. The provider validates CURRENT375 first; registrations stay in actual R.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
import {fileURLToPath} from 'node:url';
import {runPythonPartitions} from './helpers/partitioned-python.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
test('six-boundary actual data and immutable C1 inputs refuse proof loss drift and historical fallback',{timeout:65000},async(t)=>{if(process.platform==='win32'||process.platform==='darwin'||process.platform==='linux'){const partitionRoot=ownedHistoricalHInputs.root;await runPythonPartitions({root:partitionRoot,suiteKey:'six-history',signal:t.signal});return;}const r=spawnSync(process.env.PYTHON||'python3',['-B','tests/six_boundary_history_acceptance.py'],{cwd:ownedHistoricalHInputs.root,encoding:'utf8',timeout:60000,killSignal:'SIGKILL',maxBuffer:1024*1024});assert.equal(r.error,undefined,String(r.error||''));assert.equal(r.signal,null,(r.stdout||'')+'\n'+(r.stderr||''));assert.equal(r.status,0,(r.stdout||'')+'\n'+(r.stderr||''));assert.match(r.stderr,/Ran 7 tests/);assert.doesNotMatch(r.stderr,/skipped=|FAILED|ERROR|FAIL:/);});
