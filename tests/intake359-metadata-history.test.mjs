// Historical H source/metadata inputs only. The owned provider validates CURRENT375 first.
// Registration stays at this actual-R file; no H .test.mjs is imported or executed.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readFileSync(path,...options){return readOwnedHPhysicalFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
/** Actual368 first, then explicit named359 history; every mutation is confined to an owned temporary fixture. */
import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync as readOwnedHPhysicalFile,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync,unlinkSync,renameSync,symlinkSync,statSync,utimesSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {APADANA_PROFILES:ACTUAL_PROFILES368}=await import(new URL('src/apadana-profiles.mjs',HistoricalHBase).href);
const {requireMetadata359,project359To343,requireProfiles359,INTAKE359_IDS,INTAKE359_PINS,INTAKE359_RUNTIME_SHA,INTAKE359_RUNTIME_REVIEW_SHA}=await import(new URL('tests/helpers/intake359-metadata.mjs',HistoricalHBase).href);
const {assertNextTenActualData}=await import(new URL('tests/helpers/next-ten-history-data.mjs',HistoricalHBase).href);
const {sixDataRecords}=await import(new URL('tests/helpers/six-history-data.mjs',HistoricalHBase).href);
const {requireMetadata368,project368To359,intake368Authority,fresh368Proofs,INTAKE368_DIRECTORY,INTAKE368_PINS,INTAKE368_RUNTIME_FILE,INTAKE368_REVIEW_FILE,AP359_FIXTURE}=await import(new URL('tests/helpers/intake368-metadata.mjs',HistoricalHBase).href);
const ROOT=fileURLToPath(HistoricalHBase),BASE=HistoricalHBase,DIR='docs/evidence/apadana/english335-350/';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>readFileSync(join(ROOT,p)),json=p=>JSON.parse(read(p));
const proofNames=[...Object.keys(INTAKE359_PINS),'RUNTIME_INVENTORY.json','RUNTIME_REVIEW.json'].map(p=>DIR+p);
const oldProofs=['docs/evidence/apadana/boundaries-next-ten/FUTURE_ORACLE.json','docs/evidence/apadana/boundaries-next-ten/runtime/INDEPENDENT_NEXT_TEN_RUNTIME_INVENTORY.json','docs/evidence/apadana/boundaries-next-ten/runtime/INDEPENDENT_NEXT_TEN_RUNTIME_REVIEW.json','docs/evidence/apadana/boundaries340-347/FUTURE_ORACLE.json','docs/evidence/apadana/boundaries340-347/C1_IMMUTABLE_EXPECTATIONS.json','docs/evidence/apadana/boundaries340-347/runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json','docs/evidence/apadana/boundaries340-347/runtime/INDEPENDENT_SIX_RUNTIME_REVIEW.json','docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_INVENTORY.json','docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json'];
const core=['canon.json.gz.part-0001','canon.json.gz.part-0002','canon.json.gz.parts.json','parallels.json.gz'];
const current368Proofs=[...Object.keys(INTAKE368_PINS),INTAKE368_RUNTIME_FILE,INTAKE368_REVIEW_FILE].map(name=>INTAKE368_DIRECTORY+name);
assert.equal(current368Proofs.length,16);
let APADANA_PROFILES,manifest,baseline,current,dd;
before(()=>{
  const actualManifest=json('server/data/apadana.json');requireMetadata368(ACTUAL_PROFILES368,actualManifest);
  ({profiles:APADANA_PROFILES,catalogue:manifest}=project368To359(ACTUAL_PROFILES368,actualManifest));
  requireMetadata359(APADANA_PROFILES,manifest);
  assert.equal(Object.keys(manifest.links).length,359);assert.deepEqual(Object.keys(manifest.links).slice(-16),INTAKE359_IDS);
  assert.equal(sha(read(DIR+'BASELINE343_FULL_OBJECTS.json')),'74c8c358e0bebec17f8679289f533975ee2e95270d3c7017aeb19594464d7a5e');baseline=json(DIR+'BASELINE343_FULL_OBJECTS.json');
  assert.equal(sha(read(DIR+'RUNTIME_INVENTORY.json')),'839e675a31a1eae8329f4942b1b60f453ce860d1c89d85c78300762fcb00b186');assert.equal(INTAKE359_RUNTIME_SHA,'839e675a31a1eae8329f4942b1b60f453ce860d1c89d85c78300762fcb00b186');
  assert.equal(sha(read(DIR+'RUNTIME_REVIEW.json')),'2b19d690992a3289958a9e944be36484cf4257fa34a9b580e04704206e829b16');assert.equal(INTAKE359_RUNTIME_REVIEW_SHA,'2b19d690992a3289958a9e944be36484cf4257fa34a9b580e04704206e829b16');
  const historical359=json(DIR+'RUNTIME_INVENTORY.json').files;assert.deepEqual(intake368Authority(BASE).priorRuntime,historical359);
  fresh368Proofs(BASE,{runtime:true});current=json(INTAKE368_DIRECTORY+INTAKE368_RUNTIME_FILE).files;assert.deepEqual(assertNextTenActualData(BASE),current);
  dd=json('docs/evidence/apadana/boundaries340-347/runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json').files;
});
function fixture(data=false){const owner=mkdtempSync(join(tmpdir(),'pali359-qa-')),base=join(owner,'fixture');try{mkdirSync(base);const paths=[...proofNames];if(data)paths.push(...oldProofs,...current368Proofs,AP359_FIXTURE,...Object.keys(current).filter(p=>p.startsWith('data/')).map(p=>'server/'+p),...core.flatMap(p=>['tests/fixtures/canon-before-six/'+p,'tests/fixtures/canon-before-next-ten/'+p]),'tests/fixtures/canon-before-intake359/apadana.json');for(const p of new Set(paths)){mkdirSync(dirname(join(base,p)),{recursive:true});copyFileSync(join(ROOT,p),join(base,p));}return {owner,base,url:pathToFileURL(base+sep),close(){rmSync(owner,{recursive:true,force:true});}};}catch(error){rmSync(owner,{recursive:true,force:true});throw error;}}
function changed(f,path,body,{missing=false,replacement}={}){const p=join(f.base,path),raw=readFileSync(p),stamp=statSync(p);try{if(missing)unlinkSync(p);else{writeFileSync(p,replacement??Buffer.concat([Buffer.from([raw[0]^1]),raw.subarray(1)]));utimesSync(p,stamp.atime,stamp.mtime);}body();}finally{writeFileSync(p,raw);utimesSync(p,stamp.atime,stamp.mtime);}}

test('genuine359 retains every343 object and strict historical projection refuses identity rights and source-pin drift',{timeout:30000},()=>{
  const prior=project359To343(APADANA_PROFILES,manifest);assert.deepEqual(prior.profiles,baseline.profiles);assert.deepEqual(prior.catalogue.links,baseline.links);assert.deepEqual(prior.catalogue.source,baseline.manifest_source);assert.equal(Object.keys(prior.profiles).length,343);
  for(const edit of [p=>{delete p['tha-ap13'];},p=>{p['tha-ap337'].raw_sha256='0'.repeat(64);},p=>{p['tha-ap13'].title='SYNTHETIC_CHANGED_OLD_TITLE';},p=>{p['tha-ap337'].license='CC BY 4.0';},p=>{p['tha-ap353']=p['tha-ap337'];delete p['tha-ap337'];}]){const p=structuredClone(APADANA_PROFILES);edit(p);assert.throws(()=>requireProfiles359(p));}
  const wrong=structuredClone(manifest);wrong.source.policy='SYNTHETIC_UNKNOWN_RIGHTS';assert.throws(()=>project359To343(APADANA_PROFILES,wrong));
  const clone=structuredClone(prior);clone.profiles['tha-ap13'].title='SYNTHETIC_CALLER_MUTATION';assert.deepEqual(project359To343(APADANA_PROFILES,manifest).profiles,baseline.profiles);
});

test('warm359 metadata requires physical proof bytes after missing tampered or authentic-directory symlink controls',{timeout:30000},()=>{
  const f=fixture();try{
    requireMetadata359(APADANA_PROFILES,manifest,f.url);
    for(const name of ['APPROVAL.json','PROFILES.json','BASELINE343_FULL_OBJECTS.json'])for(const missing of [false,true]){requireMetadata359(APADANA_PROFILES,manifest,f.url);changed(f,DIR+name,()=>assert.throws(()=>requireMetadata359(APADANA_PROFILES,manifest,f.url)),{missing});requireMetadata359(APADANA_PROFILES,manifest,f.url);}
    const parent=join(f.base,DIR.slice(0,-1)),held=join(f.owner,'authentic-359-proofs');renameSync(parent,held);try{symlinkSync(held,parent,process.platform==='win32'?'junction':'dir');assert.throws(()=>requireMetadata359(APADANA_PROFILES,manifest,f.url),/symlink|Symlink/);}finally{try{unlinkSync(parent);}finally{renameSync(held,parent);}}
    requireMetadata359(APADANA_PROFILES,manifest,f.url);
  }finally{f.close();}
});

test('actual359 corpus never accepts its authentic343 historical fixture or unknown AP bytes after warming',{timeout:120000},()=>{
  const f=fixture(true);try{
    assert.deepEqual(assertNextTenActualData(f.url),current);assert.deepEqual(sixDataRecords(f.url),dd);assert.notDeepEqual(current,dd);
    const historical=readFileSync(join(f.base,'tests/fixtures/canon-before-intake359/apadana.json'));assert.equal(Object.keys(JSON.parse(historical).links).length,343);assert.notEqual(sha(historical),current['data/apadana.json'].sha256);
    for(const replacement of [historical,undefined]){assert.deepEqual(assertNextTenActualData(f.url),current);changed(f,'server/data/apadana.json',()=>assert.throws(()=>assertNextTenActualData(f.url)),{replacement});assert.deepEqual(assertNextTenActualData(f.url),current);}
    changed(f,'tests/fixtures/canon-before-intake359/apadana.json',()=>assert.throws(()=>assertNextTenActualData(f.url)));
    assert.deepEqual(assertNextTenActualData(f.url),current);changed(f,DIR+'RUNTIME_REVIEW.json',()=>assert.throws(()=>assertNextTenActualData(f.url)),{missing:true});assert.deepEqual(assertNextTenActualData(f.url),current);
  }finally{f.close();}
});
