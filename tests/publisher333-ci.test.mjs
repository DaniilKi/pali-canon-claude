import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readCurrentFileSync} from 'node:fs';
import {d4FileReader} from './helpers/current339-source-inverse.mjs';
const readFileSync=d4FileReader(readCurrentFileSync);
import {createHash} from 'node:crypto';
import {projectCheckStageWorkflow} from './helpers/check-stage-baseline.mjs';
import {PUBLISHER317_STEP} from './helpers/publisher317-ci-baseline.mjs';
import {PUBLISHER325_STEP} from './helpers/publisher325-ci-baseline.mjs';
import {PUBLISHER333_ORIGINAL_WORKFLOW_SHA,PUBLISHER333_SOURCE_PATHS,PUBLISHER333_SOURCE_BLOCK,PUBLISHER333_STEP_NAME,PUBLISHER333_STEP,PUBLISHER333_REPORT_LINE,HISTORICAL104_FETCH_NAME,HISTORICAL104_FETCH,projectPublisher333Workflow,projectPublisher333TestSource} from './helpers/publisher333-ci-baseline.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const current=read('.github/workflows/check.yml');
const sha=text=>createHash('sha256').update(text).digest('hex');
const reject=changed=>assert.throws(()=>projectCheckStageWorkflow(changed));
const suites=['thera312-319-source','thera312-319-client'];

test('CI333 provisions exactly8 approved originals and a distinct bounded14-case zero-skip gate',()=>{
  assert.deepEqual(PUBLISHER333_SOURCE_PATHS,[312,313,314,315,316,317,318,319].map(n=>'src/_poems/chapter-3/poem-'+n+'.md'));
  for(const path of PUBLISHER333_SOURCE_PATHS)assert.equal(current.split(path).length,2);
  for(const block of [PUBLISHER333_SOURCE_BLOCK,PUBLISHER333_STEP,PUBLISHER333_REPORT_LINE,PUBLISHER317_STEP,PUBLISHER325_STEP])assert.equal(current.split(block).length,2);
  const command='node --test --test-reporter=tap '+suites.map(name=>'tests/'+name+'.test.mjs').join(' ')+' | tee reviewed-publisher312-319.tap';
  assert.ok(PUBLISHER333_STEP.includes(command));
  assert.ok(PUBLISHER333_STEP.includes('[["tests",14],["pass",14],["fail",0],["cancelled",0],["skipped",0],["todo",0]]'));
  assert.match(PUBLISHER333_STEP,/if: matrix\.group == 'apadana'\n        timeout-minutes: 10\n        shell: bash\n/);
  for(const key of ['APADANA_SOURCE_CHECKOUT','APADANA_OFFICIAL_CHECKOUT'])assert.ok(PUBLISHER333_STEP.includes(key+': .fixtures/apadana-pinned'));
  assert.doesNotMatch(PUBLISHER333_STEP,/continue-on-error|\|\| true|--test-name|--test-only|--test-concurrency/);
  assert.ok(current.indexOf(PUBLISHER325_STEP)<current.indexOf(PUBLISHER333_STEP));
  assert.ok(current.indexOf(PUBLISHER333_STEP)<current.indexOf('      - name: Check original and new Apadāna parser refusals against pinned source\n'));
});

test('the actual333 source and client files contain the independently specified8plus6 cases',()=>{
  for(const [suite,count] of [['thera312-319-source',8],['thera312-319-client',6]])assert.equal((read('tests/'+suite+'.test.mjs').match(/^test\(/gm)||[]).length,count);
});

test('only Node fullcheck jobs provision exact104 artifacts before unchanged build/test gates',()=>{
  assert.equal(current.split(HISTORICAL104_FETCH).length,2);
  const before=current.slice(0,current.indexOf('\n  check:\n')),node=current.slice(current.indexOf('\n  check:\n'));
  assert.ok(!before.includes(HISTORICAL104_FETCH_NAME));
  assert.ok(node.includes(HISTORICAL104_FETCH));
  assert.ok(node.indexOf(HISTORICAL104_FETCH)<node.indexOf('      - name: Verify complete check command contract\n'));
  assert.match(HISTORICAL104_FETCH,/timeout-minutes: 2\n        shell: bash\n/);
  assert.match(HISTORICAL104_FETCH,/git fetch --no-tags --depth=1 origin 104b57a6891ddae645c51e39eb3d27b89b64ffdf\n/);
  assert.ok(HISTORICAL104_FETCH.includes("git cat-file -e '104b57a6891ddae645c51e39eb3d27b89b64ffdf^{commit}'"));
  assert.doesNotMatch(HISTORICAL104_FETCH,/--unshallow|fetch-depth: 0|git reset|git checkout|continue-on-error|\|\| true|if:/);
});

test('finite333 inverse restores whole104 before325,stage and317 projections',()=>{
  const original=projectPublisher333Workflow(current);
  assert.equal(sha(original),PUBLISHER333_ORIGINAL_WORKFLOW_SHA);
  assert.equal(sha(original),'03b8abbf4b8c5001726efaecdca8f737e27b06ab80fb0e777f04d17e36ee83ba');
  assert.equal(projectPublisher333Workflow(original),original);
  assert.equal(sha(projectCheckStageWorkflow(current)),'138d776923eabc71e91042461cd7f21d394a543a09886f6d46eb45486c07710c');
  assert.equal(projectCheckStageWorkflow(current),projectCheckStageWorkflow(original));
});

test('all old stage,317 and325 assertions survive byte-exact after removing only333 input adapters',()=>{
  const imported="import {projectPublisher333Workflow} from './helpers/publisher333-ci-baseline.mjs';\n";
  const adapters={
  "tests/check-ci-stages.test.mjs": {
    "old": "const current=read('.github/workflows/check.yml');",
    "new": "const current=projectPublisher333Workflow(read('.github/workflows/check.yml'));",
    "old_sha256": "84b4a6fd85fd13848a277ce465305b2f8059f4636b956651a546360b992e25e3"
  },
  "tests/publisher317-ci.test.mjs": {
    "old": "const current=projectPublisher325Workflow(read('.github/workflows/check.yml'));",
    "new": "const current=projectPublisher325Workflow(projectPublisher333Workflow(read('.github/workflows/check.yml')));",
    "old_sha256": "6822aa41e30bca4eb1b7fffb8d27d9c5de6027ba215d42b5881931728f6f6839"
  },
  "tests/publisher325-ci.test.mjs": {
    "old": "const current=read('.github/workflows/check.yml');",
    "new": "const current=projectPublisher333Workflow(read('.github/workflows/check.yml'));",
    "old_sha256": "d3bd4bd53061c3fc861576e6dbdf24ab1d062e124cea3e53d76ec2a7d8a51c2c"
  }
};
  for(const [file,a] of Object.entries(adapters)){
    let source=read(file);
    if(file==='tests/publisher325-ci.test.mjs'){
      const special="import {projectPublisher333Workflow,projectPublisher333TestSource} from './helpers/publisher333-ci-baseline.mjs';\n";
      const readNew="const read=name=>projectPublisher333TestSource(name,readFileSync(new URL('../'+name,import.meta.url),'utf8'));";
      const readOld="const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');";
      assert.equal(source.split(special).length,2);assert.equal(source.split('\n'+readNew+'\n').length,2);
      source=source.replace(special,imported).replace('\n'+readNew+'\n','\n'+readOld+'\n');
    }
    assert.equal(source.split(imported).length,2);assert.equal(source.split(a.new).length,2);
    assert.equal(sha(source.replace(imported,'').replace(a.new,a.old)),a.old_sha256,file+' keeps all old bodies/assertions');
  }
});

test('333 inverse refuses each missing substituted duplicate or reordered path and unapproved311/320',()=>{
  for(const path of PUBLISHER333_SOURCE_PATHS){const line='            '+path+'\n';reject(current.replace(line,''));reject(current.replace(line,line.replace('.md','-unapproved.md')));reject(current.replace(line,line+line));}
  reject(current.replace(PUBLISHER333_SOURCE_BLOCK,PUBLISHER333_SOURCE_BLOCK.split('\n').reverse().join('\n')));
  for(const n of [311,320])reject(current.replace(PUBLISHER333_SOURCE_BLOCK,PUBLISHER333_SOURCE_BLOCK+'            src/_poems/chapter-3/poem-'+n+'.md\n'));
});

test('333 inverse refuses omitted duplicate altered gates and individual source/client suites',()=>{
  reject(current.replace(PUBLISHER333_STEP,''));reject(current.replace(PUBLISHER333_STEP,PUBLISHER333_STEP+PUBLISHER333_STEP));
  reject(current.replace(PUBLISHER333_STEP_NAME,PUBLISHER333_STEP_NAME+' changed'));
  for(const suite of suites){reject(current.replace(' tests/'+suite+'.test.mjs',''));reject(current.replace('tests/'+suite+'.test.mjs','tests/unreviewed.test.mjs'));}
  for(const [before,after] of [
    ['"tests",14','"tests",13'],['"pass",14','"pass",15'],['"skipped",0','"skipped",1'],['["skipped",0],',''],
    ['        shell: bash\n',''],['        shell: bash\n','        shell: sh\n'],['        timeout-minutes: 10\n','        timeout-minutes: 30\n'],
    ["if: matrix.group == 'apadana'","if: matrix.group == 'apadana' || always()"],
    ['APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned','APADANA_SOURCE_CHECKOUT: .fixtures/unreviewed'],
    ['APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned','APADANA_OFFICIAL_CHECKOUT: .fixtures/unreviewed'],
    [' | tee reviewed-publisher312-319.tap',' | tee reviewed-publisher312-319.tap || true'],
  ])reject(current.replace(PUBLISHER333_STEP,PUBLISHER333_STEP.replace(before,after)));
});

test('333 inverse refuses missing altered broadened or duplicated historical104 provision',()=>{
  reject(current.replace(HISTORICAL104_FETCH,''));reject(current.replace(HISTORICAL104_FETCH,HISTORICAL104_FETCH+HISTORICAL104_FETCH));
  reject(current.replace(HISTORICAL104_FETCH_NAME,HISTORICAL104_FETCH_NAME+' changed'));
  for(const [before,after] of [
    ['104b57a6891ddae645c51e39eb3d27b89b64ffdf','HEAD'],['--no-tags --depth=1','--unshallow'],
    ["          git cat-file -e '104b57a6891ddae645c51e39eb3d27b89b64ffdf^{commit}'\n",''],
    ['        timeout-minutes: 2\n','        timeout-minutes: 20\n'],['        shell: bash\n','        shell: sh\n'],
    ['        run: |\n','        if: always()\n        run: |\n'],
  ])reject(current.replace(HISTORICAL104_FETCH,HISTORICAL104_FETCH.replace(before,after)));
});

test('333 inverse preserves TAP retention and refuses unrelated old49/old14/sourcepin/budget bytes',()=>{
  reject(current.replace(PUBLISHER333_REPORT_LINE,''));reject(current.replace(PUBLISHER333_REPORT_LINE,PUBLISHER333_REPORT_LINE+PUBLISHER333_REPORT_LINE));
  reject(current.replace(PUBLISHER333_REPORT_LINE,'            substituted.tap\n'));
  reject(current.replace(PUBLISHER333_SOURCE_BLOCK,'').replace(PUBLISHER333_STEP,'').replace(HISTORICAL104_FETCH,''));
  for(const changed of [
    current.replace(PUBLISHER317_STEP,''),current.replace(PUBLISHER325_STEP,''),
    current.replace(PUBLISHER317_STEP,PUBLISHER317_STEP.replace('"tests",49','"tests",48')),
    current.replace(PUBLISHER325_STEP,PUBLISHER325_STEP.replace('"pass",14','"pass",13')),
    current.replace('ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4','ref: unreviewed'),
    current.replace('    timeout-minutes: 60\n','    timeout-minutes: 360\n'),current.replace('node: [20, 22]','node: [22]'),
  ]){assert.notEqual(changed,current);reject(changed);}
});

test('exact333 source-input inverse preserves the old325 nested317 source assertions',()=>{
  const name='tests/publisher317-ci.test.mjs',source=read(name);
  const historical=projectPublisher333TestSource(name,source);
  assert.equal(sha(historical),'6822aa41e30bca4eb1b7fffb8d27d9c5de6027ba215d42b5881931728f6f6839');
  assert.equal(projectPublisher333TestSource(name,historical),historical);
  const imported="import {projectPublisher333Workflow} from './helpers/publisher333-ci-baseline.mjs';\n";
  for(const changed of [
    source+'\n// unrelated change\n',source.replace(imported,''),source.replace(imported,imported+imported),
    source.replace('projectPublisher325Workflow(projectPublisher333Workflow(read(', 'projectPublisher333Workflow(projectPublisher325Workflow(read('),
    source.replace('assert.equal(approved.length,32);','assert.equal(approved.length,31);'),
  ]){assert.notEqual(changed,source);assert.throws(()=>projectPublisher333TestSource(name,changed));}
});
