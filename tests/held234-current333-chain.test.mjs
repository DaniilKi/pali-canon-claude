// Explicit immutable H input lane. The provider validates CURRENT375 first; registrations stay in actual R.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
const ownedHistoricalHInputs=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('actual held234 metadata preflight keeps the full325,333,339,343 and359 bridges into current368 and rejects baseline corruption',()=>{
  const root=ownedHistoricalHInputs.root;
  const result=spawnSync('python3',['-B','tests/held234_current333_chain.py'],{
    cwd:root,encoding:'utf8',timeout:30000,maxBuffer:256*1024,
  });
  assert.equal(result.error,undefined,String(result.error||''));
  assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
  assert.match(result.stderr,/Ran 10 tests/);
});
