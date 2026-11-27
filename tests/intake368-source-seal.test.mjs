// Historical H source/metadata inputs only. The owned provider validates CURRENT375 first.
// Registration stays at this actual-R file; no H .test.mjs is imported or executed.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readFileSync(path,...options){return readOwnedHPhysicalFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
/** Current physical SOURCE closure only; no runtime/body projection or guessed pins. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readOwnedHPhysicalFile,writeFileSync,mkdtempSync,mkdirSync,rmSync,unlinkSync,symlinkSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,dirname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {CURRENT368_SOURCE_CODE_SHA,INTAKE359_SOURCE_MAP_SHA,assertCurrent368SourceClosure,readIntake359SourceInverses,project3dSource}=await import(new URL('tests/helpers/intake359-source-input.mjs',HistoricalHBase).href);
const ROOT=fileURLToPath(HistoricalHBase);
const D='docs/evidence/apadana/english335-350/',N='docs/evidence/apadana/english351-360-nine/';
const sha=b=>createHash('sha256').update(b).digest('hex');
const exactIDs=['tha-ap353','tha-ap354','tha-ap355','tha-ap356','tha-ap357','tha-ap358','tha-ap359','tha-ap361','tha-ap362'];

test('current368 physical source seal preserves frozen3ced and refuses stale missing tampered or aliased source inputs',{timeout:120000},()=>{
 assert.match(CURRENT368_SOURCE_CODE_SHA,/^[a-f0-9]{64}$/);assert.match(INTAKE359_SOURCE_MAP_SHA,/^[a-f0-9]{64}$/);
 const code=assertCurrent368SourceClosure(),map=readIntake359SourceInverses();
 assert.equal(code.source_inputs_only,true);assert.equal(code.runtime_or_corpus_projection,false);
 assert.equal(code.baseline_commit,'3cedb7b7a71a42db1601026cb6d995dafe43c9ce');
 assert.equal(code.current_source_map_sha256,INTAKE359_SOURCE_MAP_SHA);
 for(const name of ['scripts/web_reader_intake368.py','tests/helpers/intake368-metadata.mjs','src/apadana-thera351-360-profiles.mjs'])assert.ok(Object.hasOwn(code.new_code,name),'Required directly pinned new code '+name);
 const profiles=JSON.parse(readFileSync(join(ROOT,N+'PROFILES.json')));assert.deepEqual(Object.keys(profiles),exactIDs);assert.equal(Object.hasOwn(profiles,'tha-ap360'),false);
 const owner=realpathSync(mkdtempSync(join(tmpdir(),'pali368-seal-'))),base=join(owner,'fixture'),archiveRoot=code.historical_archive_root;
 const archive=JSON.parse(readFileSync(join(ROOT,archiveRoot+'MANIFEST.json')));
 const paths=new Set([N+'CURRENT_SOURCE_CODE.json',D+'SOURCE_INVERSES.json',D+'3D_ORIGINAL_SOURCE_MANIFEST.json',archiveRoot+'MANIFEST.json',...Object.keys(archive.files).map(n=>archiveRoot+n),...Object.keys(code.new_code),...Object.keys(code.source_packet14).map(n=>N+n),...Object.keys(code.runtime_leaf).map(n=>N+n)]);
 try{
  for(const name of paths){const target=join(base,name);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,readFileSync(join(ROOT,name)),{flag:'wx'});}
  const proofRoot=pathToFileURL(base+sep),positive=()=>assertCurrent368SourceClosure(proofRoot);
  assert.deepEqual(positive(),code);
  const sampleDirect='scripts/web_reader_intake368.py';
  const sampleRuntime=N+Object.keys(code.runtime_leaf)[0];
  const targets=[N+'CURRENT_SOURCE_CODE.json',D+'SOURCE_INVERSES.json',D+'3D_ORIGINAL_SOURCE_MANIFEST.json',N+'ORIGINAL_INDEPENDENT_REVIEW.json',sampleRuntime,sampleDirect,archiveRoot+'MANIFEST.json',archiveRoot+'BASELINE3CED_SOURCE1001.json'];
  for(const name of targets)for(const missing of [false,true]){
   positive();const target=join(base,name),raw=readFileSync(target);
   try{if(missing)unlinkSync(target);else writeFileSync(target,Buffer.concat([raw,Buffer.from('\nSYNTHETIC_SOURCE_TAMPER\n')]));assert.throws(positive,name+' missing='+missing);}
   finally{writeFileSync(target,raw);}
   assert.deepEqual(positive(),code);
  }
  // Parent alias is refused before any source can be read. No platform skip.
  const alias=join(owner,'alias');symlinkSync(base,alias,process.platform==='win32'?'junction':'dir');
  try{assert.throws(()=>assertCurrent368SourceClosure(pathToFileURL(alias+sep)));}finally{rmSync(alias);}
  assert.deepEqual(positive(),code);
  // Independently reconstruct exact3ced SOURCE from immutable3d + archived old finite hunks.
  const name='src/apadana-thera-profiles.mjs';assert.ok(map.files[name]);
  const current=readFileSync(join(ROOT,name),'utf8'),original=project3dSource(name,current,{requireCurrent:true});
  const priorMap=JSON.parse(readFileSync(join(ROOT,archiveRoot+D+'SOURCE_INVERSES.json'))),priorRow=priorMap.files[name];assert.ok(priorRow);
  let prior=original;
  for(const h of priorRow.hunks){assert.equal(prior.split(h.before).length-1,1);prior=prior.replace(h.before,()=>h.after);}
  assert.equal(sha(prior),priorRow.current_sha256);assert.notEqual(prior,current,'New registry source must differ from historical359');
  assert.throws(()=>project3dSource(name,prior,{requireCurrent:true,proofRoot}));
  assert.equal(sha(project3dSource(name,current,{requireCurrent:true,proofRoot})),map.files[name].base3d_sha256);
  for(const name of ['server/index.cjs','server/data/apadana.json','server/data/canon.json.gz']){
   assert.equal(map.files[name],undefined);assert.equal(project3dSource(name,'actual-runtime-input',{proofRoot}),'actual-runtime-input');assert.throws(()=>project3dSource(name,'actual-runtime-input',{requireCurrent:true,proofRoot}));
  }
  assert.deepEqual(positive(),code);
 }finally{rmSync(owner,{recursive:true,force:true});}
});
