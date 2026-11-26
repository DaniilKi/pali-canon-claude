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
const ROOT=fileURLToPath(new URL('../',import.meta.url)),BASE=new URL('../',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const D='docs/evidence/apadana/boundaries-next-ten/',S='docs/evidence/apadana/boundaries340-347/';
const CURRENT=D+'runtime/INDEPENDENT_NEXT_TEN_RUNTIME_INVENTORY.json',REVIEW=D+'runtime/INDEPENDENT_NEXT_TEN_RUNTIME_REVIEW.json';
const CORE=['server/data/canon.json.gz.part-0001','server/data/canon.json.gz.part-0002','server/data/canon.json.gz.parts.json','server/data/parallels.json.gz'];
const PROOFS=[D+'FUTURE_ORACLE.json',CURRENT,REVIEW,S+'FUTURE_ORACLE.json',S+'C1_IMMUTABLE_EXPECTATIONS.json',S+'runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json',S+'runtime/INDEPENDENT_SIX_RUNTIME_REVIEW.json','docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_INVENTORY.json','docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json'];
let current,dd;
before(()=>{
  // Genuine actual-current positive FIRST; any refusal aborts, never passes a negative.
  const positive=assertNextTenActualData(BASE);
  const actual=readFileSync(join(ROOT,CURRENT)),prior=readFileSync(join(ROOT,S+'runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json'));
  assert.equal(sha(actual),'ea2b5cfb7c7a6c9216e2f33a5d1950c128b1ef50cb6c32cf929cf555b942408f');
  assert.equal(sha(prior),'ba913149e9d704e1b145d1a6a195f95ad20e0d2dbc73fa6da22f16f43f492c08');
  current=JSON.parse(actual).files;dd=JSON.parse(prior).files;assert.deepEqual(positive,current);assert.equal(Object.keys(positive).length,34);
});
function fixture(){
  const owner=mkdtempSync(join(tmpdir(),'pali-next-ten-data-')),base=join(owner,'fixture');mkdirSync(base);
  const paths=[...PROOFS,...Object.keys(current).filter(p=>p.startsWith('data/')).map(p=>'server/'+p),...CORE.flatMap(p=>['tests/fixtures/canon-before-next-ten/'+p.split('/').at(-1),'tests/fixtures/canon-before-six/'+p.split('/').at(-1)])];
  for(const p of paths){mkdirSync(dirname(join(base,p)),{recursive:true});copyFileSync(join(ROOT,p),join(base,p));}
  return {owner,base,url:pathToFileURL(base+sep),close(){rmSync(owner,{recursive:true,force:true});}};
}
function change(f,path,replacement,body){const p=join(f.base,path),original=readFileSync(p);try{if(replacement===null)unlinkSync(p);else writeFileSync(p,replacement??Buffer.concat([Buffer.from([original[0]^1]),original.subarray(1)]));body();}finally{writeFileSync(p,original);}}

test('new current34 is distinct from legitimate historical DD34 and unknown supplied bytes stay unknown',{timeout:120000},()=>{
  const f=fixture();try{
    assert.deepEqual(assertNextTenActualData(f.url),current);assert.deepEqual(sixDataRecords(f.url),dd);assert.notDeepEqual(current,dd);
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
