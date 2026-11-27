import {after} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {join as hJoin,relative as hRelative} from 'node:path';
import {fileURLToPath as hFileURLToPath} from 'node:url';
const historicalH=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
after(()=>historicalH.close());
const actualHSourceRoot=hFileURLToPath(new URL('../',import.meta.url));
const HISTORY_SOURCE_PATHS=Object.freeze([".github/workflows/check.yml","tests/apadana-six-boundary-migration.test.mjs","tests/apadana-six-cached-consumers.test.mjs","tests/apadana-six-locator-consumers.test.mjs","tests/six-boundary-ci.test.mjs","tests/six-boundary-history.test.mjs","tests/six-boundary-source-input.test.mjs"]);
function readHistoricalHSource(file,...options){
 const name=typeof file==='string'?file:hRelative(actualHSourceRoot,hFileURLToPath(file)).replaceAll('\\','/');
 assert.ok(HISTORY_SOURCE_PATHS.includes(name),'Closed named H source input only: '+name);
 return readActualFileSync(hJoin(historicalH.root,name),...options);
}
const readFileSync=readHistoricalHSource;
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readActualFileSync} from 'node:fs';
import {projectC1Source} from './helpers/six-boundary-source-input.mjs';

const path='.github/workflows/check.yml';
const current=readFileSync(path,'utf8');
const name='      - name: Require six-poem source and saved-citation compatibility without skips';
const at=current.indexOf(name);
const step=current.slice(at,current.indexOf('      - name:',at+name.length));
const suites=['apadana-six-boundary-migration','apadana-six-locator-consumers','apadana-six-cached-consumers','six-boundary-history','six-boundary-source-input','six-boundary-ci'];

test('actual six-boundary CI has the exact mandatory23 zero-skip source and consumer cases',()=>{
 assert.equal(current.split(name).length-1,1);
 assert.ok(at>current.indexOf('      - name: Check out exact public Apadāna original XML without credentials'));
 for(const literal of ["matrix.group == 'apadanatherapair101'",'timeout-minutes: 5','shell: bash','VRI_SOURCE_CHECKOUT: .fixtures/apadana-vri-pinned'])assert.ok(step.includes(literal));
 assert.ok(step.includes('node --test --test-reporter=tap '+suites.map(s=>'tests/'+s+'.test.mjs').join(' ')+' | tee reviewed-six-boundary.tap'));
 for(const [key,n]of [['tests',23],['pass',23],['fail',0],['cancelled',0],['skipped',0],['todo',0]])assert.ok(step.includes('["'+key+'",'+n+']'));
 assert.ok(!step.includes('continue-on-error')&&!step.includes(' || true'));
 assert.equal(current.split('            reviewed-six-boundary.tap\n').length-1,1);
 // The strict inverse restores the complete C1 workflow, preserving59 jobs and
 // every earlier gate. It is source-input authority, never runtime projection.
 projectC1Source(path,current,{requireCurrent:true});
 for(const suite of suites){
  const source=readFileSync('tests/'+suite+'.test.mjs','utf8');
  assert.doesNotMatch(source,/\btest\.(?:skip|todo|only)\s*\(|^test\(([\x27"])(?:\\.|(?!\1).)*\1,\s*\{[^}\n]*\b(?:todo|only)\s*:/m);
 }
});

test('six-boundary gate cannot lose a suite source fixture count bound shell or artifact',()=>{
 const changes=[['"tests",23','"tests",22'],['"pass",23','"pass",22'],['"skipped",0','"skipped",1'],['timeout-minutes: 5','timeout-minutes: 50'],['shell: bash','shell: sh'],['VRI_SOURCE_CHECKOUT: .fixtures/apadana-vri-pinned','VRI_SOURCE_CHECKOUT: .'],[' | tee ',' ; tee ']];
 for(const [a,b]of changes){assert.ok(step.includes(a));assert.throws(()=>projectC1Source(path,current.replace(step,step.replace(a,b)),{requireCurrent:true}));}
 for(const suite of suites)assert.throws(()=>projectC1Source(path,current.replace('tests/'+suite+'.test.mjs','tests/unreviewed.test.mjs'),{requireCurrent:true}));
 for(const bad of [current.replace(step,''),current.replace('            reviewed-six-boundary.tap\n',''),current+'\n# unrelated\n'])assert.throws(()=>projectC1Source(path,bad,{requireCurrent:true}));
});
