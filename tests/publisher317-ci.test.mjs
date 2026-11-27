import {after} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {projectPublisher333Workflow} from './helpers/publisher333-ci-baseline.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectCheckStageWorkflow,projectCheckStageWorkflowOnly} from './helpers/check-stage-baseline.mjs';
import {PUBLISHER317_ORIGINAL_WORKFLOW_SHA,PUBLISHER317_SOURCE_PATHS,PUBLISHER317_SOURCE_BLOCK,PUBLISHER317_STEP_NAME,PUBLISHER317_STEP,PUBLISHER317_REPORT_LINE,projectPublisher317Workflow} from './helpers/publisher317-ci-baseline.mjs';
import {projectPublisher325Workflow} from './helpers/publisher325-ci-baseline.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const historical=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
after(()=>historical.close());
const current=projectPublisher325Workflow(projectPublisher333Workflow(historical.workflow.raw));
const sha=text=>createHash('sha256').update(text).digest('hex');
const stagesOnly=projectCheckStageWorkflowOnly(current);
const reject=changed=>assert.throws(()=>projectCheckStageWorkflow(changed));

// These identities are the independently approved18+5+2+7 source cohorts.
const approved=[261,262,263,264,265,267,268,269,270,271,272,273,274,275,276,277,278,279,281,282,283,284,285,287,288,292,293,294,295,296,298,299];
const suites=['thera261-280-source','thera261-280-client','thera281-285-source','thera281-285-client','thera287-288-source','thera287-288-client','thera292-299-source','thera292-299-client'];

test('publisher317 CI adds exactly the approved32 originals and mandatory49 zero-skip cases',()=>{
  assert.equal(approved.length,32);
  assert.deepEqual(PUBLISHER317_SOURCE_PATHS,approved.map(n=>'src/_poems/chapter-3/poem-'+n+'.md'));
  for(const path of PUBLISHER317_SOURCE_PATHS)assert.equal(current.split(path).length,2,path+' is present once');
  assert.equal(current.split(PUBLISHER317_SOURCE_BLOCK).length,2);
  assert.equal(current.split(PUBLISHER317_STEP).length,2);
  assert.equal(current.split(PUBLISHER317_REPORT_LINE).length,2);
  const expected='node --test --test-reporter=tap '+suites.map(name=>'tests/'+name+'.test.mjs').join(' ')+' | tee reviewed-publisher261-299.tap';
  assert.ok(PUBLISHER317_STEP.includes(expected));
  assert.ok(PUBLISHER317_STEP.includes('[['+'"tests",49],["pass",49],["fail",0],["cancelled",0],["skipped",0],["todo",0]]'));
  assert.match(PUBLISHER317_STEP,/if: matrix\.group == 'apadana'\n        timeout-minutes: 10\n        shell: bash\n/);
  for(const key of ['APADANA_SOURCE_CHECKOUT','APADANA_OFFICIAL_CHECKOUT'])assert.ok(PUBLISHER317_STEP.includes(key+': .fixtures/apadana-pinned'));
  assert.doesNotMatch(PUBLISHER317_STEP,/continue-on-error|\|\| true|--test-name|--test-only|--test-concurrency/);
  const before=current.indexOf('      - name: Validate all Apadāna source and rights pins before browser retrieval\n');
  const own=current.indexOf(PUBLISHER317_STEP),after=current.indexOf('      - name: Check original and new Apadāna parser refusals against pinned source\n');
  assert.ok(before<own&&own<after);
});

test('finite publisher317 projection restores the exact complete historical workflow and is idempotent',()=>{
  const original=projectPublisher317Workflow(stagesOnly);
  assert.equal(sha(original),PUBLISHER317_ORIGINAL_WORKFLOW_SHA);
  assert.equal(sha(original),'138d776923eabc71e91042461cd7f21d394a543a09886f6d46eb45486c07710c');
  assert.equal(projectPublisher317Workflow(original),original);
  assert.equal(projectCheckStageWorkflow(current),original);
  assert.equal(projectCheckStageWorkflow(original),original);
  assert.equal(stagesOnly.slice(stagesOnly.indexOf('\n  check:\n')),original.slice(original.indexOf('\n  check:\n')),'intake projection preserves every Node matrix byte');
});

test('publisher317 projection rejects each omitted substituted or duplicated approved original',()=>{
  for(const path of PUBLISHER317_SOURCE_PATHS){
    const line='            '+path+'\n';
    reject(current.replace(line,''));
    reject(current.replace(line,line.replace('.md','-unapproved.md')));
    reject(current.replace(line,line+line));
  }
  reject(current.replace(PUBLISHER317_SOURCE_BLOCK,PUBLISHER317_SOURCE_BLOCK.split('\n').reverse().join('\n')));
  reject(current.replace('            src/_poems/chapter-3/poem-265.md\n','            src/_poems/chapter-3/poem-265.md\n            src/_poems/chapter-3/poem-266.md\n'));
});

test('publisher317 projection rejects missing altered or duplicated source and client gates',()=>{
  reject(current.replace(PUBLISHER317_STEP,''));
  reject(current.replace(PUBLISHER317_STEP,PUBLISHER317_STEP+PUBLISHER317_STEP));
  reject(current.replace(PUBLISHER317_STEP,PUBLISHER317_STEP+PUBLISHER317_STEP.replace('"tests",49','"tests",48')));
  reject(current.replace(PUBLISHER317_STEP_NAME,PUBLISHER317_STEP_NAME+' altered'));
  for(const suite of suites){
    reject(current.replace(' tests/'+suite+'.test.mjs',''));
    reject(current.replace('tests/'+suite+'.test.mjs','tests/unreviewed.test.mjs'));
  }
});

test('publisher317 projection refuses weakened counts skip gates conditions environment or time bounds',()=>{
  for(const [before,after] of [
    ['"tests",49','"tests",48'],['"pass",49','"pass",50'],['"skipped",0','"skipped",1'],['["skipped",0],',''],
    ['        shell: bash\n',''],['        shell: bash\n','        shell: sh\n'],
    ['        timeout-minutes: 10\n','        timeout-minutes: 30\n'],
    ["if: matrix.group == 'apadana'","if: matrix.group == 'apadana' || always()"],
    ['APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned','APADANA_SOURCE_CHECKOUT: .fixtures/unreviewed'],
    ['APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned','APADANA_OFFICIAL_CHECKOUT: .fixtures/unreviewed'],
    [' | tee reviewed-publisher261-299.tap',' | tee reviewed-publisher261-299.tap || true'],
  ])reject(current.replace(PUBLISHER317_STEP,PUBLISHER317_STEP.replace(before,after)));
});

test('publisher317 projection requires retained evidence and rejects partial intake remnants',()=>{
  reject(current.replace(PUBLISHER317_REPORT_LINE,''));
  reject(current.replace(PUBLISHER317_REPORT_LINE,PUBLISHER317_REPORT_LINE+PUBLISHER317_REPORT_LINE));
  reject(current.replace(PUBLISHER317_REPORT_LINE,'            substituted-publisher.tap\n'));
  reject(current.replace(PUBLISHER317_SOURCE_BLOCK,'').replace(PUBLISHER317_STEP,''));
});

test('publisher317 projection cannot hide source revision old commands or budget changes',()=>{
  for(const [before,after] of [
    ['ref: fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4','ref: unreviewed'],
    ['      - run: npm ci --no-audit --no-fund\n','      - run: npm ci --ignore-scripts --no-audit --no-fund\n'],
    ['    timeout-minutes: 10\n','    timeout-minutes: 11\n'],
    ['node: [20, 22]','node: [22]'],
  ]){assert.ok(current.includes(before));reject(current.replace(before,after));}
});
