import {projectPublisher333Workflow,projectPublisher333TestSource} from './helpers/publisher333-ci-baseline.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectCheckStageWorkflow} from './helpers/check-stage-baseline.mjs';
import {PUBLISHER317_STEP} from './helpers/publisher317-ci-baseline.mjs';
import {PUBLISHER325_ORIGINAL_WORKFLOW_SHA,PUBLISHER325_SOURCE_PATHS,PUBLISHER325_SOURCE_BLOCK,PUBLISHER325_STEP_NAME,PUBLISHER325_STEP,PUBLISHER325_REPORT_LINE,projectPublisher325Workflow} from './helpers/publisher325-ci-baseline.mjs';

const read=name=>projectPublisher333TestSource(name,readFileSync(new URL('../'+name,import.meta.url),'utf8'));
const current=projectPublisher333Workflow(read('.github/workflows/check.yml'));
const sha=text=>createHash('sha256').update(text).digest('hex');
const reject=changed=>assert.throws(()=>projectCheckStageWorkflow(changed));
const approved=[301,302,303,304,305,308,309,310];
const suites=['thera301-310-source','thera301-310-client'];

test('CI325 adds only eight approved originals and a separate bounded14-pass zero-skip gate',()=>{
  assert.deepEqual(PUBLISHER325_SOURCE_PATHS,approved.map(n=>'src/_poems/chapter-3/poem-'+n+'.md'));
  for(const path of PUBLISHER325_SOURCE_PATHS)assert.equal(current.split(path).length,2);
  assert.equal(current.split(PUBLISHER325_SOURCE_BLOCK).length,2);
  assert.equal(current.split(PUBLISHER325_STEP).length,2);
  assert.equal(current.split(PUBLISHER325_REPORT_LINE).length,2);
  assert.equal(current.split(PUBLISHER317_STEP).length,2,'The complete existing49-case gate is unchanged');
  const command='node --test --test-reporter=tap '+suites.map(name=>'tests/'+name+'.test.mjs').join(' ')+' | tee reviewed-publisher301-310.tap';
  assert.ok(PUBLISHER325_STEP.includes(command));
  assert.ok(PUBLISHER325_STEP.includes('[["tests",14],["pass",14],["fail",0],["cancelled",0],["skipped",0],["todo",0]]'));
  assert.match(PUBLISHER325_STEP,/if: matrix\.group == 'apadana'\n        timeout-minutes: 10\n        shell: bash\n/);
  for(const key of ['APADANA_SOURCE_CHECKOUT','APADANA_OFFICIAL_CHECKOUT'])assert.ok(PUBLISHER325_STEP.includes(key+': .fixtures/apadana-pinned'));
  assert.doesNotMatch(PUBLISHER325_STEP,/continue-on-error|\|\| true|--test-name|--test-only|--test-concurrency/);
  const before=current.indexOf(PUBLISHER317_STEP),own=current.indexOf(PUBLISHER325_STEP),after=current.indexOf('      - name: Check original and new Apadāna parser refusals against pinned source\n');
  assert.ok(before<own&&own<after);
});

test('CI325 inverse restores every byte of final317 before the unchanged historical projections',()=>{
  const original=projectPublisher325Workflow(current);
  assert.equal(sha(original),PUBLISHER325_ORIGINAL_WORKFLOW_SHA);
  assert.equal(sha(original),'483078f599f7e7297f226cd4230961012350c107b909bd0ac812617ea60ef02c');
  assert.equal(projectPublisher325Workflow(original),original);
  const historical=projectCheckStageWorkflow(current);
  assert.equal(sha(historical),'138d776923eabc71e91042461cd7f21d394a543a09886f6d46eb45486c07710c');
  assert.equal(projectCheckStageWorkflow(original),historical);
  assert.equal(projectCheckStageWorkflow(historical),historical);
});

test('all original317 CI assertions remain byte-exact after removing only the325 input adapter',()=>{
  const source=read('tests/publisher317-ci.test.mjs');
  const imported="import {projectPublisher325Workflow} from './helpers/publisher325-ci-baseline.mjs';\n";
  const adapted="const current=projectPublisher325Workflow(read('.github/workflows/check.yml'));";
  const previous="const current=read('.github/workflows/check.yml');";
  assert.equal(source.split(imported).length,2);
  assert.equal(source.split(adapted).length,2);
  assert.equal(sha(source.replace(imported,'').replace(adapted,previous)),'76b3552c62246f42202bd20d7acfc70f7da6521a0b41aae4c74b8fa27d81a81c');
});

test('CI325 rejects every omitted substituted duplicated or reordered fixture and held306/307',()=>{
  for(const path of PUBLISHER325_SOURCE_PATHS){
    const line='            '+path+'\n';
    reject(current.replace(line,''));
    reject(current.replace(line,line.replace('.md','-unapproved.md')));
    reject(current.replace(line,line+line));
  }
  reject(current.replace(PUBLISHER325_SOURCE_BLOCK,PUBLISHER325_SOURCE_BLOCK.split('\n').reverse().join('\n')));
  for(const number of [306,307])reject(current.replace(PUBLISHER325_SOURCE_BLOCK,PUBLISHER325_SOURCE_BLOCK+'            src/_poems/chapter-3/poem-'+number+'.md\n'));
});

test('CI325 rejects omitted substituted or duplicated gate and individual suites',()=>{
  reject(current.replace(PUBLISHER325_STEP,''));
  reject(current.replace(PUBLISHER325_STEP,PUBLISHER325_STEP+PUBLISHER325_STEP));
  reject(current.replace(PUBLISHER325_STEP,PUBLISHER325_STEP+PUBLISHER325_STEP.replace('"tests",14','"tests",13')));
  reject(current.replace(PUBLISHER325_STEP_NAME,PUBLISHER325_STEP_NAME+' altered'));
  for(const suite of suites){
    reject(current.replace(' tests/'+suite+'.test.mjs',''));
    reject(current.replace('tests/'+suite+'.test.mjs','tests/unreviewed.test.mjs'));
  }
});

test('CI325 refuses count skip suite environment condition timeout shell and pipeline weakening',()=>{
  for(const [before,after] of [
    ['"tests",14','"tests",13'],['"pass",14','"pass",15'],['"skipped",0','"skipped",1'],['["skipped",0],',''],
    ['        shell: bash\n',''],['        shell: bash\n','        shell: sh\n'],
    ['        timeout-minutes: 10\n','        timeout-minutes: 30\n'],
    ["if: matrix.group == 'apadana'","if: matrix.group == 'apadana' || always()"],
    ['APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned','APADANA_SOURCE_CHECKOUT: .fixtures/unreviewed'],
    ['APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned','APADANA_OFFICIAL_CHECKOUT: .fixtures/unreviewed'],
    [' | tee reviewed-publisher301-310.tap',' | tee reviewed-publisher301-310.tap || true'],
  ])reject(current.replace(PUBLISHER325_STEP,PUBLISHER325_STEP.replace(before,after)));
});

test('CI325 requires retained TAP evidence and refuses partial intake remnants',()=>{
  reject(current.replace(PUBLISHER325_REPORT_LINE,''));
  reject(current.replace(PUBLISHER325_REPORT_LINE,PUBLISHER325_REPORT_LINE+PUBLISHER325_REPORT_LINE));
  reject(current.replace(PUBLISHER325_REPORT_LINE,'            substituted-publisher.tap\n'));
  reject(current.replace(PUBLISHER325_SOURCE_BLOCK,'').replace(PUBLISHER325_STEP,''));
});

test('CI325 cannot mask any old49-case gate source revision budget or diagnostic change',()=>{
  for(const changed of [
    current.replace(PUBLISHER317_STEP,''),
    current.replace(PUBLISHER317_STEP,PUBLISHER317_STEP.replace('"tests",49','"tests",48')),
    current.replace('ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4','ref: unreviewed'),
    current.replace('      - run: npm ci --no-audit --no-fund\n','      - run: npm ci --ignore-scripts --no-audit --no-fund\n'),
    current.replace('    timeout-minutes: 10\n','    timeout-minutes: 11\n'),
    current.replace('        timeout-minutes: 30\n','        timeout-minutes: 31\n'),
    current.replace('node: [20, 22]','node: [22]'),
  ]){assert.notEqual(changed,current);reject(changed);}
});
