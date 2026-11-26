/** Explicit historical test inputs only. Production loaders never import this. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readBundled} from '../../src/bundled-data.mjs';
import {exactHistoricalCanonBytes} from './canon-before-four.mjs';
const root=new URL('../../',import.meta.url),sha=x=>createHash('sha256').update(x).digest('hex');
const directory='docs/evidence/apadana/boundaries333-336/runtime/';
const proofs=[['INDEPENDENT_FOUR_RUNTIME_INVENTORY.json','c8fc751e3f00c986c315400f229561659268ee21f5e8d161be8e4edd9c3a75d7'],['INDEPENDENT_FOUR_RUNTIME_REVIEW.json','6006126f8de46b565a9e194ed0fa4426ce512c9f27e67ee4ce4fcd4bc14d3056']];
const old={
 'server/data/canon.json.gz.part-0002':'24169740dd71b5ee86767ef72daea44759201987ffb72975afaca5d31b4c0832',
 'server/data/canon.json.gz.parts.json':'639a938e11a230acbf0a87a18c180c820013d95795b7f951439a8cae674b91a7',
 'server/data/parallels.json.gz':'a5c99363bdec68bdaea8ea111eaea74a1c1bc0755235e1c2e49493d86414b385',
};
let validated=null;
function actualData(){
 const sealed=proofs.map(([file,pin])=>{const raw=readFileSync(new URL(directory+file,root));assert.equal(sha(raw),pin,'Mandatory independent current data authority');return JSON.parse(raw);});
 const inventory=sealed[0];assert.equal(inventory.candidate_commit,'bf0d6ee639435e160285ccbb984d8fbb8dc6fc1b');assert.deepEqual(inventory.files,sealed[1].files);
 const key=[];
 for(const path of [...Object.keys(old),'server/data/canon.json.gz.part-0001']){const raw=readFileSync(new URL(path,root)),record=inventory.files[path.slice(7)];assert.deepEqual({bytes:raw.length,sha256:sha(raw)},record,'Actual current data must validate before history: '+path);key.push(sha(raw));}
 const identity=key.join(':');
 if(identity!==validated){exactHistoricalCanonBytes(gunzipSync(readBundled(new URL('server/data/canon.json.gz',root))));validated=identity;}
 return inventory.files;
}
export function projectHistorical440Data(path,bytes){
 if(typeof path!=='string'||!Object.hasOwn(old,path))return bytes;
 assert.ok(Buffer.isBuffer(bytes));const records=actualData(),observed=sha(bytes);
 assert.ok(observed===records[path.slice(7)].sha256||observed===old[path],'Only exact current or explicit historical bytes may enter');
 const file=path.slice(path.lastIndexOf('/')+1),historical=readFileSync(new URL('tests/fixtures/canon-before333/'+file,root));assert.equal(sha(historical),old[path],'Exact frozen440 byte fixture');return historical;
}
export function historical440DataReader(reader){return(path,...options)=>{
 const raw=reader(path,...options),bytes=typeof raw==='string'?Buffer.from(raw):raw;
 const old=projectHistorical440Data(path,bytes);return old===bytes?raw:typeof raw==='string'?old.toString('utf8'):old;
};}
