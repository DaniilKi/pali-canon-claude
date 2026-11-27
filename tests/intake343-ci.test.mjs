import {after} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {join as hJoin,relative as hRelative} from 'node:path';
import {fileURLToPath as hFileURLToPath} from 'node:url';
const historicalH=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
after(()=>historicalH.close());
const actualHSourceRoot=hFileURLToPath(new URL('../',import.meta.url));
const HISTORY_SOURCE_PATHS=Object.freeze([".github/workflows/check.yml","tests/thera331-334-preface-client.test.mjs","tests/thera331-334-source.test.mjs"]);
function readHistoricalHSource(file,...options){
 const name=typeof file==='string'?file:hRelative(actualHSourceRoot,hFileURLToPath(file)).replaceAll('\\','/');
 assert.ok(HISTORY_SOURCE_PATHS.includes(name),'Closed named H source input only: '+name);
 return readActualFileSync(hJoin(historicalH.root,name),...options);
}
const readFileSync=readHistoricalHSource;
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync as readActualFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {projectIntake343Workflow,AC_WORKFLOW_SHA,SOURCE_PATHS,SOURCE_BLOCK,REQUIRED_STEP,REPORT_LINE} from './helpers/intake343-ci-baseline.mjs';
const current=readFileSync(new URL('../.github/workflows/check.yml',import.meta.url),'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
test('current343 gate restores the complete ac workflow before all historical CI inverses',()=>{const old=projectIntake343Workflow(current,{requireCurrent:true});assert.equal(sha(old),AC_WORKFLOW_SHA);assert.equal(projectIntake343Workflow(old),old);assert.throws(()=>projectIntake343Workflow(old,{requireCurrent:true}));});
test('required source/client inventory is exactly eight plus five runnable cases',()=>{for(const[path,n]of [['thera331-334-source.test.mjs',8],['thera331-334-preface-client.test.mjs',5]]){const s=readFileSync(new URL('./'+path,import.meta.url),'utf8');assert.equal((s.match(/^test\(/gm)||[]).length,n);assert.doesNotMatch(s,/\btest\.(?:skip|todo|only)\s*\(|^test\(([\x27"])(?:\\.|(?!\1).)*\1,\s*\{[^}\n]*\b(?:todo|only)\s*:/m);}});
test('source paths cannot be omitted substituted duplicated reordered or broadened',()=>{for(const p of SOURCE_PATHS)for(const bad of [current.replace('            '+p+'\n',''),current.replace(p,p.replace('.md','-wrong.md')),current.replace(p,p+'\n            '+p)])assert.throws(()=>projectIntake343Workflow(bad,{requireCurrent:true}));for(const bad of [current.replace(SOURCE_BLOCK,SOURCE_BLOCK.split('\n').filter(Boolean).reverse().join('\n')+'\n'),current.replace(SOURCE_BLOCK,SOURCE_BLOCK+'            src/_poems/chapter-3/poem-335.md\n')])assert.throws(()=>projectIntake343Workflow(bad,{requireCurrent:true}));});
test('mandatory13 gate refuses changed suites counts skips guards shell env bounds or report',()=>{for(const[a,b]of [['"tests",13','"tests",12'],['"pass",13','"pass",12'],['"skipped",0','"skipped",1'],["matrix.group == 'apadana'","always()"],['timeout-minutes: 10','timeout-minutes: 20'],['shell: bash','shell: sh'],['APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned','APADANA_SOURCE_CHECKOUT: .'],['thera331-334-preface-client.test.mjs','thera331-334-source.test.mjs'],[' | tee ',' ; tee ']]){assert.ok(REQUIRED_STEP.includes(a));assert.throws(()=>projectIntake343Workflow(current.replace(REQUIRED_STEP,REQUIRED_STEP.replace(a,b)),{requireCurrent:true}));}for(const bad of [current.replace(REQUIRED_STEP,''),current.replace(REPORT_LINE,''),current.replace(REPORT_LINE,REPORT_LINE+REPORT_LINE)])assert.throws(()=>projectIntake343Workflow(bad,{requireCurrent:true}));});
test('unrelated earlier gate historical object fetch budget or matrix changes fail whole ac identity',()=>{for(const[a,b]of [['["tests",49]','["tests",48]'],['["pass",12]','["pass",11]'],['104b57a6891ddae645c51e39eb3d27b89b64ffdf','104b57a6891ddae645c51e39eb3d27b89b64ffde']]){assert.ok(current.includes(a));assert.throws(()=>projectIntake343Workflow(current.replace(a,b),{requireCurrent:true}));}assert.throws(()=>projectIntake343Workflow(current+'\n# unrelated\n',{requireCurrent:true}));});
