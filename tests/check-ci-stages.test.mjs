import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {verifyCheckContract} from '../scripts/ci-check-contract.mjs';
import {CHECK_STAGE_STEPS,PROPOSED_CHECK_NODE_SHA,projectCheckStageWorkflow} from './helpers/check-stage-baseline.mjs';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const current=read('.github/workflows/check.yml');
const pkg=JSON.parse(read('package.json'));
const sha=text=>createHash('sha256').update(text).digest('hex');

test('raw CI exposes every full-check phase in order with fail-closed bounds',()=>{
  const block='  check:\n'+current.split('\n  check:\n')[1];
  assert.equal(sha(block),PROPOSED_CHECK_NODE_SHA);
  assert.equal(block.split(CHECK_STAGE_STEPS).length,2);
  assert.match(block,/\n    timeout-minutes: 60\n/);
  assert.doesNotMatch(CHECK_STAGE_STEPS,/continue-on-error|if:|\|\| true|--test-name|--test-concurrency|--test-only/);
  assert.deepEqual(verifyCheckContract(pkg).map(stage=>stage.command),['npm run build','npm test','npm run audit']);
  const child=spawnSync(process.execPath,['scripts/ci-check-contract.mjs'],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);assert.equal(JSON.parse(child.stdout).status,'passed');
});

test('contract rejects a newly added full-check component',()=>{
  assert.throws(()=>verifyCheckContract({...pkg,scripts:{...pkg.scripts,check:pkg.scripts.check+' && npm run security'}}));
});

test('contract rejects either check-only npm lifecycle hook before any phase',()=>{
  for(const hook of ['precheck','postcheck'])assert.throws(()=>verifyCheckContract({...pkg,scripts:{...pkg.scripts,[hook]:'node extra-gate.mjs'}}));
});

test('executable contract fails without a success receipt when a lifecycle hook is introduced',()=>{
  const dir=mkdtempSync(join(tmpdir(),'pali-check-contract-'));
  try{
    mkdirSync(join(dir,'scripts'));writeFileSync(join(dir,'scripts/ci-check-contract.mjs'),read('scripts/ci-check-contract.mjs'));
    writeFileSync(join(dir,'package.json'),JSON.stringify({...pkg,scripts:{...pkg.scripts,precheck:'node omitted-gate.mjs'}}));
    const child=spawnSync(process.execPath,[join(dir,'scripts/ci-check-contract.mjs')],{encoding:'utf8',timeout:5000});
    assert.equal(child.error,undefined);assert.notEqual(child.status,0);assert.equal(child.stdout,'');assert.match(child.stderr,/lifecycle hook requires explicit CI integration/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('contract refuses filtered or substituted build, test and audit commands',()=>{
  for(const script of ['build','test','audit'])assert.throws(()=>verifyCheckContract({...pkg,scripts:{...pkg.scripts,[script]:pkg.scripts[script]+' --skip'}}));
});

test('finite stage projection rejects omitted audit, success bypass and altered budgets',()=>{
  for(const changed of [
    current.replace('        run: npm run audit\n',''),
    current.replace('        run: npm test\n','        continue-on-error: true\n        run: npm test\n'),
    current.replace('        timeout-minutes: 30\n','        timeout-minutes: 1\n'),
    current.replace('    timeout-minutes: 60\n','    timeout-minutes: 360\n'),
    current.replace('        run: npm test\n','        run: npm test -- --test-name-pattern selected\n'),
    current.replace('        run: npm run audit\n','        if: always()\n        run: npm run audit\n'),
  ])assert.throws(()=>projectCheckStageWorkflow(changed));
});

test('finite stage projection preserves matrix, setup, smoke, pack and installed audits',()=>{
  const original=projectCheckStageWorkflow(current);
  assert.equal(projectCheckStageWorkflow(original),original);
  assert.equal(current.slice(0,current.indexOf('\n  check:\n')),original.slice(0,original.indexOf('\n  check:\n')));
  for(const changed of [current.replace('node: [20, 22]','node: [22]'),current.replace('      - run: npm run smoke\n',''),current.replace('      - run: npm run pack:desktop\n',''),current.replace('        run: git diff --exit-code -- server/\n','')])assert.throws(()=>projectCheckStageWorkflow(changed));
});

test('every previous source-note CI assertion is retained byte for byte',()=>{
  const imported="import {projectCheckStageWorkflow} from './helpers/check-stage-baseline.mjs';\n";
  const reader="const read=name=>{const raw=readFileSync(new URL('../'+name,import.meta.url),'utf8');return name==='.github/workflows/check.yml'?projectCheckStageWorkflow(raw):raw;};";
  const originalReader="const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');";
  const source=read('tests/source-notes-ci.test.mjs');
  assert.equal(source.split(imported).length,2);assert.equal(source.split(reader).length,2);
  assert.equal(sha(source.replace(imported,'').replace(reader,originalReader)),'5f0d1e6f235b752b629d1d2f07ba1decb42b190b38cd7ac7c748feb75cf0ba98');
});
