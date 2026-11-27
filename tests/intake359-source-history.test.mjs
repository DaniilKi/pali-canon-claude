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
/** Mandatory final source map: PENDING is a failure, never a skipped negative. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readOwnedHPhysicalFile,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,dirname,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {assertNextTenActualData}=await import(new URL('tests/helpers/next-ten-history-data.mjs',HistoricalHBase).href);
const ROOT=fileURLToPath(HistoricalHBase),sha=b=>createHash('sha256').update(b).digest('hex');
const D='docs/evidence/apadana/english335-350/';
const proofPaths=[D+'SOURCE_INVERSES.json',D+'3D_ORIGINAL_SOURCE_MANIFEST.json','docs/evidence/apadana/boundaries-next-ten/NEXT_TEN_SOURCE_INVERSES.json'];

test('all current359 source rows restore whole3d and compose old maps without admitting stale unknown runtime or missing proof inputs',{timeout:30000},async()=>{
  assert.equal(Object.keys(assertNextTenActualData(HistoricalHBase)).length,34);
  const outer=await import(new URL('tests/helpers/intake359-source-input.mjs',HistoricalHBase).href),ten=await import(new URL('tests/helpers/next-ten-source-input.mjs',HistoricalHBase).href);
  assert.match(outer.INTAKE359_SOURCE_MAP_SHA,/^[a-f0-9]{64}$/);const map=outer.readIntake359SourceInverses(),old=ten.readNextTenSourceInverses();assert.ok(Object.keys(map.files).length>0);
  const indexBytes=readFileSync(join(ROOT,D+'3D_ORIGINAL_SOURCE_MANIFEST.json'));assert.equal(sha(indexBytes),'dbb01760a111679828e80c58f325c638ebb97512688c8ff5db8ef624d7bbff6d');const index=JSON.parse(indexBytes);
  for(const[path,row]of Object.entries(map.files)){
    const input=readFileSync(join(ROOT,path),'utf8');assert.equal(sha(input),row.current_sha256);
    const historical=outer.project3dSource(path,input,{requireCurrent:true});assert.equal(sha(historical),row.base3d_sha256);assert.equal(sha(historical),index.files[path].sha256);assert.equal(outer.project3dSource(path,historical),historical);assert.throws(()=>outer.project3dSource(path,historical,{requireCurrent:true}));
    const unknown=input+'\n// SYNTHETIC_UNKNOWN_SOURCE_INPUT\n';assert.equal(outer.normalize3dSourceInput(path,unknown),unknown);assert.throws(()=>outer.project3dSource(path,unknown,{requireCurrent:true}));
  }
  // Literal required paths ensure both seam shapes are exercised, not find/skip.
  for(const[path,intersection]of [['src/chatgpt-widget.mjs',true],['tests/helpers/intake343-metadata.mjs',false]]){
    assert.ok(map.files[path],path+' must be explicitly present in the final new map');assert.equal(Object.hasOwn(old.files,path),intersection);
    const input=readFileSync(join(ROOT,path),'utf8'),prior=outer.project3dSource(path,input,{requireCurrent:true});
    const expected=intersection?old.files[path].dd7_sha256:map.files[path].base3d_sha256;
    assert.equal(sha(ten.projectDD7Source(path,input,{requireCurrent:true})),expected);
    for(const id of [path,new URL(path,HistoricalHBase)]){
      assert.equal(sha(outer.strict3dSourceReader(readFileSync)(id)),map.files[path].base3d_sha256);assert.equal(sha(ten.strictDD7SourceReader(readFileSync)(id)),expected);
      for(const stale of [prior,Buffer.from(prior)]){assert.throws(()=>outer.strict3dSourceReader(()=>stale)(id));assert.throws(()=>ten.strictDD7SourceReader(()=>stale)(id));}
    }
    assert.throws(()=>ten.projectDD7Source(path,prior,{requireCurrent:true}));
  }
  for(const path of ['server/index.cjs','server/data/apadana.json','server/data/canon.json.gz','web/unreviewed-input.js']){assert.equal(map.files[path],undefined);assert.equal(outer.project3dSource(path,'runtime stays actual'),'runtime stays actual');assert.equal(outer.normalize3dSourceInput(path,'runtime stays actual'),'runtime stays actual');assert.throws(()=>outer.project3dSource(path,'runtime stays actual',{requireCurrent:true}));}
  const owner=mkdtempSync(join(tmpdir(),'pali359-source-')),base=join(owner,'fixture');try{
    for(const path of proofPaths){mkdirSync(dirname(join(base,path)),{recursive:true});copyFileSync(join(ROOT,path),join(base,path));}
    const proofRoot=pathToFileURL(base+sep),path='src/chatgpt-widget.mjs',input=readFileSync(join(ROOT,path),'utf8');
    const project=()=>ten.projectDD7Source(path,input,{requireCurrent:true,proofRoot});assert.equal(sha(project()),old.files[path].dd7_sha256);
    for(const name of proofPaths)for(const missing of [false,true]){project();const p=join(base,name),raw=readFileSync(p);try{if(missing)unlinkSync(p);else writeFileSync(p,Buffer.concat([raw,Buffer.from('\n')]));assert.throws(project,name+' '+missing);}finally{writeFileSync(p,raw);}assert.equal(sha(project()),old.files[path].dd7_sha256);}
  }finally{rmSync(owner,{recursive:true,force:true});}
});
