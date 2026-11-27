/** Adversarial owned-fixture history tests; no app/server/provider execution. */
import test,{before} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readFileSync,writeFileSync,copyFileSync,mkdirSync,mkdtempSync,rmSync,unlinkSync,renameSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {assertNextTenActualData,assertNextTenScope,runNextTenSixOperation} from './helpers/next-ten-history-data.mjs';
import {sixDataRecords,_ddSixDataRecords} from './helpers/six-history-data.mjs';
import {intake368Authority,fresh368Proofs,INTAKE368_DIRECTORY,INTAKE368_PINS,INTAKE368_RUNTIME_FILE,INTAKE368_REVIEW_FILE,AP359_FIXTURE} from './helpers/intake368-metadata.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url)),BASE=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const D='docs/evidence/apadana/boundaries-next-ten/',S='docs/evidence/apadana/boundaries340-347/';
const CURRENT=D+'runtime/INDEPENDENT_NEXT_TEN_RUNTIME_INVENTORY.json',REVIEW=D+'runtime/INDEPENDENT_NEXT_TEN_RUNTIME_REVIEW.json';
const INTAKE='docs/evidence/apadana/english335-350/',AP343='tests/fixtures/canon-before-intake359/apadana.json';
const INTAKE_PINS=Object.freeze({"BASELINE343.json":"4c122fff1283b3ee5904f1f6ea781572347d6e42140dcdd25d7765e8ab00e138","BASELINE343_FULL_OBJECTS.json":"74c8c358e0bebec17f8679289f533975ee2e95270d3c7017aeb19594464d7a5e","BASELINE_DATA27.json":"8631b90104e01329b74d22cc7632df265e9b9072efd6ba17b5478450b026a99f","BASELINE_RUNTIME34.json":"6becdfab6b8e948a6d2df9af1a37131c4c0c727d77db79cf4bb4b93973512f23","SOURCE_REVIEW.json":"61e8d843e61cbbab04c3dc4f1546c8725d0ad883d194d8e5b567c4e3d681385a","SOURCE_CURATION.json":"e777f4dc3b154a448162b8d0c274d44995722903ebef59e133172ee46ecac5da","APPROVAL.json":"9232fdeec1b93618b5019b1aeb2c706b2a6b423a62bbb5dae86ea39b520e4bf6","PROFILES.json":"4d1ba58af7d5918ae18d68eab63d5e4e1258925d90c46d8d889fe5a74977a59d","LINKS.json":"f284bc4dcbb415a55aa025f654018448ce3578772dea010f12d8e7cfd536da0a","EXPECTED_MANIFEST.json":"57b6fd43f4b8273e9542b8a22a6bd84b2042914113d53c94fe727386c5ec0194","PROFILE_SCHEMA_REVIEW.json":"7af2686040b00e89730568771ff8d35e64b676b383f014981eb809d4f63203e5","RUNTIME_INVENTORY.json":"839e675a31a1eae8329f4942b1b60f453ce860d1c89d85c78300762fcb00b186","RUNTIME_REVIEW.json":"2b19d690992a3289958a9e944be36484cf4257fa34a9b580e04704206e829b16"});
const INTAKE_PROOFS=Object.freeze(Object.keys(INTAKE_PINS).map(name=>INTAKE+name));
const CURRENT368_PROOFS=Object.freeze([...Object.keys(INTAKE368_PINS),INTAKE368_RUNTIME_FILE,INTAKE368_REVIEW_FILE].map(name=>INTAKE368_DIRECTORY+name));
assert.equal(CURRENT368_PROOFS.length,16,'Fourteen current368 source proofs and two runtime leaves');
const CORE=['server/data/canon.json.gz.part-0001','server/data/canon.json.gz.part-0002','server/data/canon.json.gz.parts.json','server/data/parallels.json.gz'];
const PROOFS=[D+'FUTURE_ORACLE.json',CURRENT,REVIEW,S+'FUTURE_ORACLE.json',S+'C1_IMMUTABLE_EXPECTATIONS.json',S+'runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json',S+'runtime/INDEPENDENT_SIX_RUNTIME_REVIEW.json','docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_INVENTORY.json','docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json'];
let current,dd,historicalNext;
before(()=>{
  // Genuine actual-current positive FIRST; any refusal aborts, never passes a negative.
  const positive=assertNextTenActualData(BASE);
  const actual=readFileSync(join(ROOT,CURRENT)),prior=readFileSync(join(ROOT,S+'runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json'));
  assert.equal(sha(actual),'ea2b5cfb7c7a6c9216e2f33a5d1950c128b1ef50cb6c32cf929cf555b942408f');
  assert.equal(sha(prior),'ba913149e9d704e1b145d1a6a195f95ad20e0d2dbc73fa6da22f16f43f492c08');
  historicalNext=JSON.parse(actual).files;
  for(const[name,pin]of Object.entries(INTAKE_PINS))assert.equal(sha(readFileSync(join(ROOT,INTAKE+name))),pin);
  const historical359=JSON.parse(readFileSync(join(ROOT,INTAKE+'RUNTIME_INVENTORY.json'))).files;
  const authority368=intake368Authority(BASE);assert.deepEqual(authority368.priorRuntime,historical359);
  fresh368Proofs(BASE,{runtime:true});current=JSON.parse(readFileSync(join(ROOT,INTAKE368_DIRECTORY+INTAKE368_RUNTIME_FILE))).files;
  assert.deepEqual(JSON.parse(readFileSync(join(ROOT,INTAKE+'BASELINE_RUNTIME34.json'))).files,historicalNext);
  dd=JSON.parse(prior).files;assert.deepEqual(positive,current);assert.equal(Object.keys(positive).length,34);
});
function fixture(){
  const owner=mkdtempSync(join(tmpdir(),'pali-next-ten-data-')),base=join(owner,'fixture');mkdirSync(base);
  const paths=[...PROOFS,...INTAKE_PROOFS,...CURRENT368_PROOFS,AP343,AP359_FIXTURE,...Object.keys(current).filter(p=>p.startsWith('data/')).map(p=>'server/'+p),...CORE.flatMap(p=>['tests/fixtures/canon-before-next-ten/'+p.split('/').at(-1),'tests/fixtures/canon-before-six/'+p.split('/').at(-1)])];
  for(const p of paths){mkdirSync(dirname(join(base,p)),{recursive:true});copyFileSync(join(ROOT,p),join(base,p));}
  return {owner,base,url:pathToFileURL(base+sep),close(){rmSync(owner,{recursive:true,force:true});}};
}
function change(f,path,replacement,body){const p=join(f.base,path),original=readFileSync(p);try{if(replacement===null)unlinkSync(p);else writeFileSync(p,replacement??Buffer.concat([Buffer.from([original[0]^1]),original.subarray(1)]));body();}finally{writeFileSync(p,original);}}

test('new current34 is distinct from legitimate historical DD34 and unknown supplied bytes stay unknown',{timeout:120000},()=>{
  const f=fixture();try{
    assert.deepEqual(assertNextTenActualData(f.url),current);assert.deepEqual(sixDataRecords(f.url),dd);assert.notDeepEqual(current,dd);
    const frozen=readFileSync(join(f.base,AP343)),actual=readFileSync(join(f.base,'server/data/apadana.json'));assert.deepEqual({bytes:frozen.length,sha256:sha(frozen)},historicalNext['data/apadana.json']);assert.equal(Object.keys(JSON.parse(frozen).links).length,343);assert.deepEqual({bytes:actual.length,sha256:sha(actual)},current['data/apadana.json']);assert.equal(Object.keys(JSON.parse(actual).links).length,368);assert.notDeepEqual(current['data/apadana.json'],historicalNext['data/apadana.json']);
    const path=CORE[1],genuine=readFileSync(join(f.base,path)),unknown=Buffer.from(genuine);unknown[0]^=1;
    const saved=Buffer.from(unknown);assert.strictEqual(runNextTenSixOperation('normalize',[path,unknown],f.url),unknown);assert.deepEqual(unknown,saved);
    const before=readFileSync(join(f.base,path));const c1=runNextTenSixOperation('packed',[],f.url);
    assert.equal(sha(gunzipSync(c1)),'46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8');assert.deepEqual(readFileSync(join(f.base,path)),before);
    assert.throws(()=>assertNextTenScope(f.url));assert.throws(()=>_ddSixDataRecords(f.url));
    let invoked=false;assert.throws(()=>runNextTenSixOperation('callback',[()=>{invoked=true;}],f.url),/Closed fixed operation set/);assert.equal(invoked,false);
  }finally{f.close();}
});

test('warm current and old proof deletion or tampering cannot turn historical fallback into a positive',{timeout:120000},()=>{
  const f=fixture();try{
    for(const path of PROOFS){
      for(const mode of ['tamper','missing']){
        assert.deepEqual(sixDataRecords(f.url),dd);
        change(f,path,mode==='missing'?null:undefined,()=>assert.throws(()=>sixDataRecords(f.url),path+' '+mode));
        assert.deepEqual(assertNextTenActualData(f.url),current);
      }
    }
  }finally{f.close();}
});

test('actual corpus corruption authentic DD substitutions and authentic authority junctions refuse after a positive',{timeout:120000},()=>{
  const f=fixture();try{
    for(const path of [CORE[1],'server/data/source-notes.json']){
      assert.deepEqual(assertNextTenActualData(f.url),current);
      change(f,path,undefined,()=>assert.throws(()=>assertNextTenActualData(f.url)));
    }
    // part0001 is unchanged: only the three actually different DD data inputs
    // must refuse as current corpus bytes. Honest old stage inputs are separate.
    for(const path of CORE.slice(1)){
      const old=readFileSync(join(f.base,'tests/fixtures/canon-before-next-ten',path.split('/').at(-1)));
      assert.notEqual(sha(old),current[path.slice(7)].sha256);assert.deepEqual(assertNextTenActualData(f.url),current);
      change(f,path,old,()=>assert.throws(()=>assertNextTenActualData(f.url)));
    }
    const parent=join(f.base,D,'runtime'),held=join(f.owner,'authentic-runtime');renameSync(parent,held);
    try{symlinkSync(held,parent,process.platform==='win32'?'junction':'dir');assert.throws(()=>assertNextTenActualData(f.url),/symlink|Symlink/);}finally{try{unlinkSync(parent);}finally{renameSync(held,parent);}}
    const alias=join(f.owner,'root-alias');symlinkSync(f.base,alias,process.platform==='win32'?'junction':'dir');
    try{assert.throws(()=>assertNextTenActualData(pathToFileURL(alias+sep)),/symlink|Symlink/);}finally{unlinkSync(alias);}
    assert.deepEqual(assertNextTenActualData(f.url),current);
  }finally{f.close();}
});
