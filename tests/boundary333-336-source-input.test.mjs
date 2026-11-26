import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readActualFileSync} from 'node:fs';
import {acFileReader} from './helpers/intake343-source-input.mjs';
// Every unchanged historical assertion below consumes the explicit ac source frame.
// New343 physical source bytes are asserted separately by intake343-source-input.test.mjs.
const readFileSync=acFileReader(readActualFileSync);
import {createHash} from 'node:crypto';
import {boundarySourceInverses,boundarySourceProofBytes,decodeBoundarySourceInverses,projectFrozen440Source,frozen440FileReader} from './helpers/boundary333-336-source-input.mjs';
import {d4FileReader} from './helpers/current339-source-inverse.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
test('separately sealed current boundary source delta restores full frozen440 bytes in string and Buffer reads',()=>{
 const reader=frozen440FileReader(readFileSync);
 for(const[path,row]of Object.entries(boundarySourceInverses.files)){
  const actual=readFileSync(path,'utf8');assert.equal(sha(actual),row.current_sha256);
  const prior=projectFrozen440Source(path,actual,{requireCurrent:true});assert.equal(sha(prior),row.frozen440_sha256);
  assert.equal(projectFrozen440Source(path,prior),prior,'Explicit genuine historical440 remains historical');
  assert.throws(()=>projectFrozen440Source(path,prior,{requireCurrent:true}),'Current proof cannot fallback to prior440');
  assert.equal(sha(reader(path)),row.frozen440_sha256);assert.equal(sha(reader(path,'utf8')),row.frozen440_sha256);
 }
});
test('omitted duplicate substituted reordered or unrelated current source edits refuse after each exact positive',()=>{
 for(const[path,row]of Object.entries(boundarySourceInverses.files)){
  const actual=readFileSync(path,'utf8');projectFrozen440Source(path,actual,{requireCurrent:true});
  const hunk=row.hunks[0];
  for(const bad of [actual+'\n// unrelated source edit\n',actual.replace(hunk.after,''),actual+hunk.after,actual.replace(hunk.after,hunk.before)])assert.throws(()=>projectFrozen440Source(path,bad,{requireCurrent:true}));
  if(row.hunks.length>1){const[a,b]=row.hunks;assert.throws(()=>projectFrozen440Source(path,actual.replace(a.after,'UNREVIEWED_SWAP').replace(b.after,a.after).replace('UNREVIEWED_SWAP',b.after),{requireCurrent:true}));}
 }
});
test('whole proof bytes are immutable even for semantically equal JSON and altered baseline hashes paths or hunks',()=>{
 const bytes=boundarySourceProofBytes();decodeBoundarySourceInverses(bytes);
 assert.throws(()=>decodeBoundarySourceInverses(Buffer.concat([bytes,Buffer.from(' ')])));
 for(const mutate of [map=>{delete map.files[Object.keys(map.files)[0]]},map=>{map.base_commit='unreviewed'},map=>{map.files['server/index.cjs']=map.files[Object.keys(map.files)[0]]},map=>{map.files[Object.keys(map.files)[0]].frozen440_sha256='0'.repeat(64)},map=>{map.files[Object.keys(map.files)[0]].hunks.reverse()}]){
  const map=JSON.parse(bytes);mutate(map);const altered=Buffer.from(JSON.stringify(map));assert.notEqual(sha(altered),sha(bytes));assert.throws(()=>decodeBoundarySourceInverses(altered));
 }
});
test('unlisted data runtime and ordinary strings never undergo source-input projection',()=>{
 for(const path of ['server/data/canon.json.gz','server/index.cjs','docs/evidence/apadana/CURRENT339_SOURCE_INVERSES.json','unlisted/path']){
  assert.equal(projectFrozen440Source(path,'unchanged'),'unchanged');assert.throws(()=>projectFrozen440Source(path,'unchanged',{requireCurrent:true}));
 }
});


test('explicit file URL source reads retain the same finite frozen440 boundary',()=>{
 const read=frozen440FileReader(readFileSync);
 for(const[path,row]of Object.entries(boundarySourceInverses.files)){
  const value=read(new URL('../'+path,import.meta.url),'utf8');assert.equal(sha(value),row.frozen440_sha256);
 }
});

test('nested D4 file URL reads normalize declared current source before retained historical assertions',()=>{
 const reader=d4FileReader(readFileSync),path='tests/check-ci-stages.test.mjs';
 const url=new URL('../'+path,import.meta.url),row=boundarySourceInverses.files[path];
 assert.equal(sha(reader(url,'utf8')),row.frozen440_sha256);
 assert.equal(sha(reader(url)),row.frozen440_sha256);
 assert.equal(sha(readFileSync(url)),row.current_sha256,'Real source bytes stay current');
 const runtime=new URL('../server/index.cjs',import.meta.url);
 assert.deepEqual(reader(runtime),readFileSync(runtime),'Runtime input is never projected');
});
