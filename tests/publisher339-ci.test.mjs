import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {SOURCE_PATHS,SOURCE_BLOCK,STEP,REPORT,D4_WORKFLOW_SHA,projectPublisher339Workflow} from './helpers/publisher339-ci-baseline.mjs';
const current=readFileSync('.github/workflows/check.yml','utf8'),sha=x=>createHash('sha256').update(x).digest('hex'),required=x=>projectPublisher339Workflow(x,{requireCurrent:true});
test('new339 CI retains all D4 jobs, bounds and old source gates after exact six-path twelve-case extension',()=>{
 assert.equal(sha(required(current)),D4_WORKFLOW_SHA);assert.deepEqual(SOURCE_PATHS,[321,323,324,325,326,329].map(n=>'src/_poems/chapter-3/poem-'+n+'.md'));
 assert.match(STEP,/timeout-minutes: 10\n        shell: bash/);assert.ok(STEP.includes('[["tests",12],["pass",12],["fail",0],["cancelled",0],["skipped",0],["todo",0]]'));
 assert.doesNotMatch(STEP,/continue-on-error|\|\| true|--test-name|--test-only/);
 for(const suite of ['source','client'])assert.equal((readFileSync('tests/thera321-329-'+suite+'.test.mjs','utf8').match(/^test\(/gm)||[]).length,6);
});
test('omitted substituted reordered duplicated or held source paths cannot pass a matching count',()=>{
 for(const path of SOURCE_PATHS)for(const replacement of ['',path+path,path.replace(/poem-\d+/, 'poem-322')])assert.throws(()=>required(current.replace(path,replacement)));
 assert.throws(()=>required(current.replace(SOURCE_BLOCK,SOURCE_BLOCK.split('\n').filter(Boolean).reverse().join('\n')+'\n')));
});
test('all twelve exact cases, zero skips and full Bash failure propagation remain required',()=>{
 for(const [from,to]of [['"tests",12','"tests",11'],['"pass",12','"pass",11'],['"skipped",0','"skipped",1'],['shell: bash','shell: sh'],['timeout-minutes: 10','timeout-minutes: 20'],["matrix.group == 'apadana'","matrix.group == 'core'"],['APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned','APADANA_SOURCE_CHECKOUT: arbitrary'],[' | tee reviewed-publisher321-329.tap',' || true | tee reviewed-publisher321-329.tap']])assert.throws(()=>required(current.replace(STEP,STEP.replace(from,to))));
 for(const part of [STEP,REPORT])for(const replacement of ['',part+part])assert.throws(()=>required(current.replace(part,replacement)));
});
test('no earlier source gate, old workflow byte, dependency or baseline provisioning can be hidden',()=>{
 for(const [from,to]of [['node-version: 20','node-version: 24'],['[["tests",14],["pass",14]','[["tests",13],["pass",13]'],['104b57a6891ddae645c51e39eb3d27b89b64ffdf','0000000000000000000000000000000000000000']]){assert.ok(current.includes(from));assert.throws(()=>required(current.replace(from,to)));}
 assert.throws(()=>required(current+'\n# unrelated change\n'));const old=required(current);assert.equal(projectPublisher339Workflow(old),old);assert.throws(()=>required(old));
});
