import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';

test('next-ten Python history refuses stale actual data and escaped proof bindings after genuine positives', {timeout:125000}, () => {
  const historicalH=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
  try {
  const result = spawnSync(process.env.PYTHON || 'python3', ['-B', 'tests/next_ten_history_acceptance.py'], {
    cwd:historicalH.root, encoding:'utf8', timeout:120000,
    killSignal:'SIGKILL', maxBuffer:1024*1024,
    env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONUNBUFFERED:'1'},
  });
  const output = (result.stdout || '') + '\n' + (result.stderr || '');
  assert.equal(result.error,undefined,String(result.error || '')+'\n'+output);
  assert.equal(result.signal,null,output); assert.equal(result.status,0,output);
  assert.match(output,/Ran 5 tests in /); assert.match(output,/\nOK\s*$/);
  assert.doesNotMatch(output,/skipped=|FAILED|ERROR|FAIL:/);
  } finally {historicalH.close();}
});
