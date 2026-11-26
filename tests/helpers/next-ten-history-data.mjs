/** Current data is physically validated; historical substitutions are TEST INPUTS ONLY. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,relative,sep} from 'node:path';
import {readSixRegularRelative} from './six-regular-file.mjs';
import {nextTenAuthority,exactDD7CanonBytes,DD7_CANON_SHA,NEXT_TEN_CANON_SHA,NEXT_TEN_ORACLE_SHA,NEXT_TEN_DIRECTORY} from './canon-before-next-ten.mjs';
// Fixed handlers only: no arbitrary callback, reader injection, begin/end API or ambient mode.
// This ESM cycle has no eager handler invocation; all function declarations are initialized before use.
import {_ddSixDataRecords,_ddAssertSixActualData,_ddNormalizeC1DataInput,_ddC1PackedCanon,_ddC1FileResult,_ddC1BundledResult} from './six-history-data.mjs';
const root=new URL('../../',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
export const NEXT_TEN_RUNTIME_SHA='ea2b5cfb7c7a6c9216e2f33a5d1950c128b1ef50cb6c32cf929cf555b942408f';
export const NEXT_TEN_RUNTIME_REVIEW_SHA='b3197bdcc429700dee09446abd01ff08c6009d4fcaedc3f2f542429c4f497f55';
export const NEXT_TEN_APPLICATION_COMMIT='6ab4a322108aec740c330e4afd974ee4da808886';
export const NEXT_TEN_RUNTIME_DELTA=Object.freeze(["data/canon.json.gz.part-0002","data/canon.json.gz.parts.json","data/parallels.json.gz","http-worker.cjs","http.cjs","index.cjs","web/reader.js"]);
const ddInv='docs/evidence/apadana/boundaries340-347/runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json',ddReview='docs/evidence/apadana/boundaries340-347/runtime/INDEPENDENT_SIX_RUNTIME_REVIEW.json';
const ddInvSHA='ba913149e9d704e1b145d1a6a195f95ad20e0d2dbc73fa6da22f16f43f492c08',ddReviewSHA='b9b5c3761f65defd45103b3c70cbcac37a8dce4133d9991b18063bceefaa0be9';
export const DD7_DATA_PATHS=Object.freeze(['server/data/canon.json.gz.part-0001','server/data/canon.json.gz.part-0002','server/data/canon.json.gz.parts.json','server/data/parallels.json.gz']);
const proofs=()=>[[NEXT_TEN_DIRECTORY+'FUTURE_ORACLE.json',NEXT_TEN_ORACLE_SHA],[ddInv,ddInvSHA],[ddReview,ddReviewSHA],[NEXT_TEN_DIRECTORY+'runtime/INDEPENDENT_NEXT_TEN_RUNTIME_INVENTORY.json',NEXT_TEN_RUNTIME_SHA],[NEXT_TEN_DIRECTORY+'runtime/INDEPENDENT_NEXT_TEN_RUNTIME_REVIEW.json',NEXT_TEN_RUNTIME_REVIEW_SHA]];
function sealed(base,path,pin){assert.match(pin,/^[a-f0-9]{64}$/,'Pending independent ten runtime seal; no historical fallback');const raw=readSixRegularRelative(base,path);assert.equal(sha(raw),pin);return JSON.parse(raw);}
const freeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;};
function records(base){
 nextTenAuthority({root:base});const old=sealed(base,ddInv,ddInvSHA),oldReview=sealed(base,ddReview,ddReviewSHA);assert.deepEqual(old.files,oldReview.files);assert.equal(Object.keys(old.files).length,34);
 const inv=sealed(base,proofs()[3][0],NEXT_TEN_RUNTIME_SHA),review=sealed(base,proofs()[4][0],NEXT_TEN_RUNTIME_REVIEW_SHA);
 assert.equal(inv.schema,'independent-reviewed-next-ten-runtime-inventory-v1');assert.equal(review.schema,'reviewed-next-ten-runtime-approval-v1');assert.equal(review.status,'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_SOURCE_SCOPE_ONLY');assert.match(NEXT_TEN_APPLICATION_COMMIT,/^[a-f0-9]{40}$/);assert.equal(inv.baseline_commit,'dd7b697df2c54308084fffd934af38130d01f952');assert.equal(review.baseline,inv.baseline_commit);assert.equal(inv.candidate_commit,NEXT_TEN_APPLICATION_COMMIT);assert.equal(review.candidate_commit,NEXT_TEN_APPLICATION_COMMIT);
 assert.equal(inv.prior_six_inventory_sha256,ddInvSHA);assert.equal(review.prior_six_inventory_sha256,ddInvSHA);assert.equal(review.prior_six_review_sha256,ddReviewSHA);assert.deepEqual(review.independent_inventory,{file:'INDEPENDENT_NEXT_TEN_RUNTIME_INVENTORY.json',sha256:NEXT_TEN_RUNTIME_SHA});
 for(const value of [inv,review]){assert.equal(value.old_canon_logical_sha256,DD7_CANON_SHA);assert.equal(value.new_canon_logical_sha256,NEXT_TEN_CANON_SHA);assert.equal(value.source_oracle_sha256,NEXT_TEN_ORACLE_SHA);assert.equal(value.runtime_files,34);}
 for(const key of ['inventory_only','runtime_inventory_approval','finite_source_diff_approval'])assert.equal(review[key],true);assert.equal(inv.behavioral_or_release_approval,false);assert.equal(review.behavioral_harness_approval,false);assert.equal(review.release_or_push_approval,false);
 assert.deepEqual(inv.files,review.files);assert.deepEqual(Object.keys(inv.files).sort(),Object.keys(old.files).sort());assert.equal(Object.keys(inv.files).length,34);
 const delta=Object.keys(inv.files).sort().filter(k=>JSON.stringify(inv.files[k])!==JSON.stringify(old.files[k]));assert.deepEqual(delta,NEXT_TEN_RUNTIME_DELTA);assert.deepEqual(inv.allowed_changed_paths,delta);assert.deepEqual(review.allowed_changed_paths_from_dd,delta);assert.equal(inv.unchanged_paths,34-delta.length);assert.equal(review.unchanged_runtime_paths,34-delta.length);
 for(const path of delta.filter(k=>k.startsWith('data/')))assert.ok(DD7_DATA_PATHS.includes('server/'+path),'Only four finite historical data inputs can differ');
 for(const [path,row] of Object.entries(inv.files)){assert.match(path,/^[a-zA-Z0-9_./-]+$/);assert.ok(!path.startsWith('/')&&path.split('/').every(x=>x&&x!=='.'&&x!=='..'));assert.deepEqual(Object.keys(row),['bytes','sha256']);assert.ok(Number.isSafeInteger(row.bytes)&&row.bytes>0);assert.match(row.sha256,/^[a-f0-9]{64}$/);}
 return {current:freeze(inv.files),dd:freeze(old.files)};
}
function packed(reader){const manifest=JSON.parse(reader('server/data/canon.json.gz.parts.json'));assert.equal(manifest.version,1);assert.deepEqual(manifest.parts.map(p=>p.file),['canon.json.gz.part-0001','canon.json.gz.part-0002']);const chunks=manifest.parts.map(p=>{const b=reader('server/data/'+p.file);assert.equal(b.length,p.size);assert.equal(sha(b),p.sha256);return b;});const result=Buffer.concat(chunks);assert.equal(result.length,manifest.size);assert.equal(sha(result),manifest.sha256);return result;}
function ddFixture(base,path,dd){assert.ok(DD7_DATA_PATHS.includes(path));const bytes=readSixRegularRelative(base,'tests/fixtures/canon-before-next-ten/'+path.split('/').at(-1));assert.deepEqual({bytes:bytes.length,sha256:sha(bytes)},dd[path.slice(7)]);return bytes;}
const carriers=new WeakMap();
// Content-keyed validation memo only: all actual/proof/fixture bytes are read and hashed before use.
let validatedLogicalKey=null;
function publicBase(base){assert.ok(!carriers.has(base),'Carried/closed private scope is not a public root');const path=resolve(base instanceof URL?fileURLToPath(base):base);return pathToFileURL(path+sep);}
function freshProofs(state){assert.equal(state.active,true,'Closed ten-operation scope refused');assert.equal(state.carrier.href,state.href,'Mutated carrier URL refused');for(const [path,pin] of proofs()){assert.match(pin,/^[a-f0-9]{64}$/);assert.equal(sha(readSixRegularRelative(state.base,path)),pin,'Fresh physical ten proof required');}}
function capture(base){
 const physical=publicBase(base),row=records(physical),actual=new Map();const paths=Object.keys(row.current).filter(p=>p.startsWith('data/')).sort();assert.equal(paths.length,27);
 for(const path of paths){const bytes=readSixRegularRelative(physical,'server/'+path);assert.deepEqual({bytes:bytes.length,sha256:sha(bytes)},row.current[path]);actual.set('server/'+path,bytes);}
 // All physical new27 and immutable old4 bytes precede this expensive logical-only memo.
 const prior=new Map(DD7_DATA_PATHS.map(path=>[path,ddFixture(physical,path,row.dd)]));
 const logicalKey=[...proofs().map(([,pin])=>pin),...actual.values()].map(x=>Buffer.isBuffer(x)?sha(x):x).concat([...prior.values()].map(sha)).join(':');
 if(logicalKey!==validatedLogicalKey){exactDD7CanonBytes(gunzipSync(packed(path=>actual.get(path))),{root:physical});assert.equal(sha(gunzipSync(packed(path=>prior.get(path)))),DD7_CANON_SHA);validatedLogicalKey=logicalKey;}
 const carrier=new URL(physical.href),state={base:physical,carrier,href:carrier.href,active:true,current:row.current,dd:row.dd};carriers.set(carrier,state);return state;
}
export function assertNextTenScope(base){const state=carriers.get(base);assert.ok(state,'Only a private ten-operation carrier is permitted');freshProofs(state);return true;}
/** Ordinary reads remain physical; only privately owned active carriers can project four data inputs. */
export function readNextTenSixInput(base,path){
 const state=carriers.get(base);if(!state)return readSixRegularRelative(base,path);freshProofs(state);const raw=readSixRegularRelative(state.base,path);
 if(path.startsWith('server/data/')){const row=state.current[path.slice(7)];assert.ok(row,'Unknown physical current data path');assert.deepEqual({bytes:raw.length,sha256:sha(raw)},row);if(DD7_DATA_PATHS.includes(path))return ddFixture(state.base,path,state.dd);}
 return raw;
}
function normalizeDD(state,path,raw){if(!DD7_DATA_PATHS.includes(path))return raw;assert.ok(Buffer.isBuffer(raw));freshProofs(state);return raw.length===state.current[path.slice(7)].bytes&&sha(raw)===state.current[path.slice(7)].sha256?ddFixture(state.base,path,state.dd):raw;}
function key(path){return typeof path==='string'?path:path instanceof URL&&path.protocol==='file:'?relative(fileURLToPath(root),fileURLToPath(path)).split(sep).join('/'):null;}
export function runNextTenSixOperation(operation,args=[],base=root){
 assert.ok(['records','actual','normalize','packed','file','bundled'].includes(operation),'Closed fixed operation set');const state=capture(base),scope=state.carrier;
 try{
  if(operation==='records')return _ddSixDataRecords(scope);
  if(operation==='actual')return _ddAssertSixActualData(scope);
  if(operation==='packed')return _ddC1PackedCanon(scope);
  if(operation==='normalize'){const[path,bytes]=args;return _ddNormalizeC1DataInput(path,normalizeDD(state,path,bytes),scope);}
  const[path,raw,options]=args,name=key(path);assert.ok(Array.isArray(options));let supplied=raw;
  if(operation==='file'&&DD7_DATA_PATHS.includes(name)){assert.ok(options.length===0||options.length===1&&options[0]==='utf8');const bytes=typeof raw==='string'?Buffer.from(raw):raw,old=normalizeDD(state,name,bytes);supplied=old===bytes?raw:typeof raw==='string'?old.toString('utf8'):old;}
  if(operation==='bundled'&&name==='server/data/canon.json.gz'&&Buffer.isBuffer(raw)){const manifest=JSON.parse(readSixRegularRelative(state.base,'server/data/canon.json.gz.parts.json'));if(raw.length===manifest.size&&sha(raw)===manifest.sha256)supplied=packed(path=>ddFixture(state.base,path,state.dd));}
  return operation==='file'?_ddC1FileResult(path,supplied,options,scope):_ddC1BundledResult(path,supplied,options,scope);
 }finally{state.active=false;}
}
/** Current public gate never returns historical runtime records or accepts private/closed scope tokens. */
export function assertNextTenActualData(base=root){const state=capture(base);try{return state.current;}finally{state.active=false;}}
