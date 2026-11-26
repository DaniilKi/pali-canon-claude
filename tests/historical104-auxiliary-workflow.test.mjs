import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HISTORICAL104_AUX_FETCH,HISTORICAL104_AUX_NAME,HISTORICAL104_AUX_BASELINES,fullInventoryCalls,restoreHistorical104Auxiliary} from './helpers/historical104-auxiliary-workflow.mjs';
const read=path=>readFileSync(path,'utf8');
const sha=value=>createHash('sha256').update(value).digest('hex');
for(const row of HISTORICAL104_AUX_BASELINES){
 test('exact historical104 setup and complete oldworkflow inverse '+row.path,()=>{
  const source=read(row.path),original=restoreHistorical104Auxiliary(row.path,source);
  assert.equal(sha(original),row.old_sha256);
  assert.match(HISTORICAL104_AUX_FETCH,/timeout-minutes: 2\n        shell: bash\n/);
  assert.ok(HISTORICAL104_AUX_FETCH.includes('git fetch --no-tags --depth=1 origin 104b57a6891ddae645c51e39eb3d27b89b64ffdf\n'));
  assert.ok(HISTORICAL104_AUX_FETCH.includes("git cat-file -e '104b57a6891ddae645c51e39eb3d27b89b64ffdf^{commit}'"));
  assert.doesNotMatch(HISTORICAL104_AUX_FETCH,/continue-on-error|--unshallow|fetch-depth: 0|git reset|git checkout|\|\| true|if:/);
 });
 test('historical104 setup refuses missing duplicate moved or broadened provisioning '+row.path,()=>{
  const source=read(row.path),reject=value=>assert.throws(()=>restoreHistorical104Auxiliary(row.path,value));
  reject(source.replace(HISTORICAL104_AUX_FETCH,''));reject(source.replace(HISTORICAL104_AUX_FETCH,HISTORICAL104_AUX_FETCH+HISTORICAL104_AUX_FETCH));
  reject(source.replace(HISTORICAL104_AUX_FETCH,'')+HISTORICAL104_AUX_FETCH);
  for(const [before,after] of [
   ['104b57a6891ddae645c51e39eb3d27b89b64ffdf','HEAD'],['--no-tags --depth=1','--unshallow'],
   ["          git cat-file -e '104b57a6891ddae645c51e39eb3d27b89b64ffdf^{commit}'\n",''],
   ['        timeout-minutes: 2\n','        timeout-minutes: 20\n'],['        shell: bash\n','        shell: sh\n'],
   ['        run: |\n','        if: always()\n        run: |\n'],
  ])reject(source.replace(HISTORICAL104_AUX_FETCH,HISTORICAL104_AUX_FETCH.replace(before,after)));
 });
 test('finite104 setup cannot conceal old fulltest/triggers/permissions/job byte changes '+row.path,()=>{
  const source=read(row.path),reject=value=>assert.throws(()=>restoreHistorical104Auxiliary(row.path,value));
  const current=fullInventoryCalls(source)[0];assert.ok(current);
  reject(source.slice(0,current.index)+source.slice(current.index).replace('npm ','npm --ignore-scripts '));
  reject(source.replace('permissions:','permissions: # unexpected old metadata change'));
  reject(source+'\n# unrelated workflow modification\n');
 });
}
test('every configured full npm inventory job provisions exact104 before tests with no new workflow invocation',()=>{
 const checked=[];
 for(const file of readdirSync('.github/workflows').filter(name=>/\.ya?ml$/.test(name))){
  const source=read('.github/workflows/'+file);
  const jobs=[...source.matchAll(/^  ([a-z][\w-]*):\n([^]*?)(?=^  [a-z][\w-]*:|(?![^]))/gm)];
  for(const job of jobs){const calls=fullInventoryCalls(job[2]);if(!calls.length)continue;
   assert.equal(job[2].split(HISTORICAL104_AUX_FETCH).length,2,file+'/'+job[1]+' has one exact104 setup');
   for(const call of calls)assert.ok(job[2].indexOf(HISTORICAL104_AUX_FETCH)<call.index,file+'/'+job[1]+' setup precedes full tests');
   checked.push(file+'/'+job[1]);
  }
 }
 assert.deepEqual(checked.sort(),['check.yml/check','dasabala-diagnostic.yml/diagnostic','data-refresh.yml/refresh','release.yml/release']);
});
