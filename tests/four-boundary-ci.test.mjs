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
 const unpack=text.split('\n').filter(line=>line.trim().startsWith('node scripts/shard-data.mjs --unpack server/data '));assert.equal(unpack.length,16);
 for(const line of unpack){const directory=line.match(/"([^\"]+)"/)[1];assert.ok(text.includes('python scripts/historical_four_snapshot.py --canon "'+directory+'/canon.json.gz" --output "'+directory+'/canon-before-four.json"'));}
});
