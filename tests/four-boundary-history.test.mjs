// Explicit immutable H input lane. The provider validates CURRENT375 first; registrations stay in actual R.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('four-boundary historical inputs remain strict after cached positive reads',()=>{
 const r=spawnSync(process.env.PYTHON||'python3',['-B','tests/four_boundary_history_acceptance.py'],{cwd:ownedHistoricalHInputs.root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024});
 assert.equal(r.error,undefined,String(r.error||''));assert.equal(r.status,0,(r.stdout||'')+'\n'+(r.stderr||''));assert.match(r.stderr,/Ran 6 tests/);assert.doesNotMatch(r.stderr,/skipped=|FAILED/);
});
