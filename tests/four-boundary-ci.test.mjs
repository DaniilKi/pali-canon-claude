import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('actual CI requires the exact four-boundary source and consumer gates after original XML checkout',()=>{
 const text=readFileSync('.github/workflows/check.yml','utf8');
 const name='      - name: Require four-poem source repair and citation compatibility without skips';
 assert.equal(text.split(name).length-1,1);
 const at=text.indexOf(name),step=text.slice(at,text.indexOf('      - name:',at+name.length));
 assert.match(step,/matrix.group == 'apadanatherapair101'/);assert.match(step,/timeout-minutes: 5/);assert.match(step,/VRI_SOURCE_CHECKOUT: .fixtures\/apadana-vri-pinned/);
 assert.match(step,/node --test --test-reporter=tap tests\/apadana-four-boundary-migration.test.mjs tests\/apadana-four-locator-consumers.test.mjs/);
 assert.ok(at>text.indexOf('      - name: Check out exact public Apadāna original XML without credentials'));
 for(const [key,value]of [['tests',13],['pass',13],['fail',0],['cancelled',0],['skipped',0],['todo',0]])assert.ok(step.includes('["'+key+'",'+value+']'));
 assert.ok(!step.includes('continue-on-error')&&!step.includes(' || true'));
 const allUnpack=text.split('\n').filter(line=>line.trim().startsWith('node scripts/shard-data.mjs --unpack server/data '));assert.equal(allUnpack.length,17);
 // The new source replay consumes actual f3b; all sixteen older gates keep
 // their exact, explicitly historical-four canonical inputs.
 const current='node scripts/shard-data.mjs --unpack server/data .fixtures/english16-canon';
 assert.equal(allUnpack.filter(line=>line.trim()===current).length,1);
 const unpack=allUnpack.filter(line=>line.trim()!==current);assert.equal(unpack.length,16);
 for(const line of unpack){const directory=line.match(/"([^\"]+)"/)[1];assert.ok(text.includes('python scripts/historical_four_snapshot.py --canon "'+directory+'/canon.json.gz" --output "'+directory+'/canon-before-four.json"'));}
 const replayName='      - name: Replay sixteen originals without application parser inputs';
 assert.equal(text.split(replayName).length-1,1);const replayAt=text.indexOf(replayName),replay=text.slice(replayAt,text.indexOf('      - name:',replayAt+replayName.length));
 assert.ok(replay.includes(current));assert.ok(replay.includes('python3 scripts/apadana/thera335-350/portable_source_replay.py'));
 assert.ok(replay.includes('--canon .fixtures/english16-canon/canon.json.gz'));
 assert.ok(replay.includes('--vri-xml .fixtures/vri-english335-350/romn/s0510m1.mul.xml'));
 assert.ok(!replay.includes('historical_four_snapshot.py')&&!replay.includes('continue-on-error')&&!replay.includes(' || true'));
});
