import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// Original case names remain lineage IDs; the SUT and receipt are fixed380.
import {INTAKE375_PINS,INTAKE375_DIRECTORY} from './helpers/intake375-metadata.mjs';
import {intake380Authority,INTAKE380_PINS,INTAKE380_DIRECTORY} from './helpers/intake380-metadata.mjs';
import {current389390Authority} from './helpers/current389390-metadata.mjs';
const CURRENT_CANON='883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a';
const BOUNDARY_DIRECTORY='docs/evidence/apadana/thera389-390/';

const root=fileURLToPath(new URL('../',import.meta.url));
const FULL_METHODS=Object.freeze([
 'test_01_exact_flat375_and_source_only_domains_and_one_actual27_read',
 'test_02_every_actual27_warm_mutation_and_missing_file_refuse',
 'test_03_same_size_mtime_does_not_reuse_a_success',
 'test_04_all_closed_proofs_missing_tamper_and_authentic_symlink_refuse',
 'test_05_exact_roots_and_genuine_H_tokens_reject_before_any_path_IO',
 'test_06_returns_are_detached_and_failure_restoration_is_fresh',
 'test_07_full_old368_plus_literal7_and_no_history_fallback',
 'test_08_actual34_runtime_guards_keep_nondata_extras_and_path_identity',
 'test_09_copiers_refuse_nonempty_alias_and_changed_source',
]);
const GROUPS=Object.freeze({
 'behavior-a':Object.freeze(FULL_METHODS.slice(0,3)),
 'behavior-b':Object.freeze(FULL_METHODS.slice(4)),
 'proof-a':Object.freeze([FULL_METHODS[3]]),
 'proof-b':Object.freeze([FULL_METHODS[3]]),
 'proof-c':Object.freeze([FULL_METHODS[3]]),
});
const BATCHES=Object.freeze({'proof-a':0,'proof-b':1,'proof-c':2});
const CONTROLS=Object.freeze(['positive','missing','valid-json-tamper','authentic-symlink','restored-positive']);
// Receipt accounting only. No authority buffers or cross-child trust cache.
const completed=new Map();
const keys=(value,names)=>assert.deepEqual(Object.keys(value).sort(),[...names].sort());
function independentProofPaths(){
 const context=current389390Authority(new URL('../',import.meta.url));
 assert.equal(context.canonical.new_canonical_logical_sha256,CURRENT_CANON);
 const authority=context.english;
 assert.deepEqual(authority,intake380Authority(new URL('../',import.meta.url)));
 const closure=authority.historical375.documents['H_CURRENT_PROOF_INPUTS.json'];
 assert.equal(Object.keys(closure.files).length,226);assert.equal(Object.keys(INTAKE375_PINS).length,12);
 assert.equal(Object.keys(INTAKE380_PINS).length,7);
 const old=[...Object.keys(INTAKE375_PINS),'EXPECTED_MANIFEST.json','RUNTIME_INVENTORY.json','RUNTIME_REVIEW.json'].map(name=>INTAKE375_DIRECTORY+name);
 const extension=[...Object.keys(INTAKE380_PINS),'EXPECTED_MANIFEST.json','RUNTIME_INVENTORY.json','RUNTIME_REVIEW.json'].map(name=>INTAKE380_DIRECTORY+name).sort();
 const legacy=[...Object.keys(closure.files),...old].sort(),before=[...legacy,...extension].sort();
 const transition=['CURRENT_CANON_BINDING.json','RUNTIME_INVENTORY.json','RUNTIME_REVIEW.json'].map(name=>BOUNDARY_DIRECTORY+name).sort();
 const all=[...before,...transition].sort();
 assert.equal(legacy.length,241);assert.equal(extension.length,10);assert.equal(before.length,251);
 assert.equal(new Set(legacy).size,241);assert.equal(new Set(extension).size,10);assert.equal(new Set(before).size,251);
 assert.equal(transition.length,3);assert.equal(new Set(all).size,254);assert.equal(all.length,254);
 return {legacy,extension,transition,all};
}
function runGroup(group){
 assert.ok(Object.hasOwn(GROUPS,group));assert.equal(completed.has(group),false,'Each fixed group must execute exactly once');
 const result=spawnSync(process.env.PYTHON||'python3',['-B','tests/intake375_current_negatives.py','--group',group],{
  cwd:root,encoding:'utf8',timeout:120000,killSignal:'SIGKILL',maxBuffer:1024*1024,
 });
 assert.equal(result.error,undefined,String(result.error||''));
 assert.equal(result.signal,null,(result.stdout||'')+'\n'+(result.stderr||''));
 assert.equal(result.status,0,(result.stdout||'')+'\n'+(result.stderr||''));
 const expected=GROUPS[group],count=expected.length;
 assert.match(result.stderr,new RegExp('(?:^|\\n)Ran '+count+' test'+(count===1?'':'s')+' in [0-9.]+s\\r?\\n'));
 assert.doesNotMatch(result.stderr,/skipped=|FAILED|ERROR|FAIL:|expected failures=|unexpected successes=/);
 const terminals=[];
 for(const line of result.stderr.split(/\r?\n/)){
  const match=/^(test_[a-zA-Z0-9_]+) \(__main__\.Current375Negatives\.(test_[a-zA-Z0-9_]+)\) \.\.\. ok$/.exec(line);
  if(match){assert.equal(match[1],match[2]);terminals.push(match[1]);}
 }
 assert.deepEqual(terminals,expected,'Genuine stdlib terminal method names/order must match the fixed selection');
 assert.match(result.stdout,/^[^\r\n]*\r?\n$/,'One bounded metadata receipt only');
 const receipt=JSON.parse(result.stdout.trimEnd());
 keys(receipt,['schema','group','full_methods','selected_methods','tests_run','failures','errors','skipped','expected_failures','unexpected_successes','successful','proof','current_canonical_logical_sha256']);
 assert.equal(receipt.schema,'current389390-closed-negative-group-v1');assert.equal(receipt.current_canonical_logical_sha256,CURRENT_CANON);assert.equal(receipt.group,group);
 assert.deepEqual(receipt.full_methods,FULL_METHODS);assert.deepEqual(receipt.selected_methods,expected);assert.equal(receipt.tests_run,count);
 for(const key of ['failures','errors','skipped','expected_failures','unexpected_successes'])assert.equal(receipt[key],0);
 assert.equal(receipt.successful,true);
 if(Object.hasOwn(BATCHES,group)){
  const proof=receipt.proof;assert.ok(proof&&typeof proof==='object');keys(proof,['batch','all_paths','selected_paths','completed_paths','controls_per_path','legacy','extension','transition']);
  const paths=independentProofPaths(),batch=BATCHES[group];
  const legacy=paths.legacy.filter((_path,index)=>index%3===batch),extension=paths.extension.filter((_path,index)=>index%3===batch),transition=paths.transition.filter((_path,index)=>index%3===batch),selected=[...legacy,...extension,...transition].sort();
  assert.equal(proof.batch,batch);assert.deepEqual(proof.all_paths,paths.all);assert.deepEqual(proof.selected_paths,selected);
  assert.equal(legacy.length,[81,80,80][batch]);assert.equal(extension.length,[4,3,3][batch]);assert.equal(transition.length,1);assert.equal(selected.length,[86,84,84][batch]);
  assert.deepEqual(proof.completed_paths,selected);assert.deepEqual(proof.controls_per_path,CONTROLS);
  for(const [family,all,selection]of [['legacy',paths.legacy,legacy],['extension',paths.extension,extension],['transition',paths.transition,transition]]){
   keys(proof[family],['all_paths','selected_paths','completed_paths']);assert.deepEqual(proof[family].all_paths,all);assert.deepEqual(proof[family].selected_paths,selection);assert.deepEqual(proof[family].completed_paths,selection);
  }
 }else assert.equal(receipt.proof,null);
 completed.set(group,receipt);
}
function assertCompleteFamily(){
 assert.deepEqual([...completed.keys()],Object.keys(GROUPS),'All five fixed groups must terminate successfully');
 const paths=independentProofPaths(),covered=[],legacy=[],extension=[],transition=[];
 for(const name of ['proof-a','proof-b','proof-c']){
  const proof=completed.get(name).proof;covered.push(...proof.completed_paths);legacy.push(...proof.legacy.completed_paths);extension.push(...proof.extension.completed_paths);transition.push(...proof.transition.completed_paths);
 }
 // Prove the exact old family separately; never relabel251 as241.
 assert.equal(legacy.length,241);assert.equal(new Set(legacy).size,241);assert.deepEqual([...legacy].sort(),paths.legacy);
 assert.equal(extension.length,10);assert.equal(new Set(extension).size,10);assert.deepEqual([...extension].sort(),paths.extension);
 const before=[...legacy,...extension];assert.equal(before.length,251);assert.equal(new Set(before).size,251,'All old251 proof controls remain disjoint');
 assert.equal(transition.length,3);assert.equal(new Set(transition).size,3);assert.deepEqual([...transition].sort(),paths.transition);
 assert.equal(covered.length,254);assert.equal(new Set(covered).size,254,'All proof groups must be disjoint');
 assert.deepEqual([...covered].sort(),paths.all,'Every independent old and new proof path is covered exactly once');
 assert.equal(legacy.length*3,723);assert.equal(legacy.length*CONTROLS.length,1205);
 assert.equal(before.length*3,753);assert.equal(before.length*CONTROLS.length,1255);
 assert.equal(covered.length*3,762);assert.equal(covered.length*CONTROLS.length,1270);
}

// Intentional NEW-case resource policy: five sequential plain children instead
// of one. Each original120s child/125s case bound remains; aggregate grows.
test('CURRENT375 behavior01-03 preserves exact flat state actual27 and same-mtime refusals',{timeout:125000},()=>{
 runGroup('behavior-a');
});
test('CURRENT375 behavior05-09 preserves roots H-token refusal detached returns and physical runtime integrity',{timeout:125000},()=>{
 runGroup('behavior-b');
});
test('CURRENT375 exhaustive proof batch a retains all five controls on81 independent paths',{timeout:125000},()=>{
 runGroup('proof-a');
});
test('CURRENT375 exhaustive proof batch b retains all five controls on80 independent paths',{timeout:125000},()=>{
 runGroup('proof-b');
});
test('CURRENT375 exhaustive proof batch c retains80 paths and proves complete disjoint241-path family',{timeout:125000},()=>{
 runGroup('proof-c');assertCompleteFamily();
});
