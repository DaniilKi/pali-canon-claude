/** TEST-ONLY fixed historical source inputs. Never import into app/capture/browser SUT code. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {lstatSync,readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath,URL} from 'node:url';
import {gunzipSync} from 'node:zlib';
const CURRENT='883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a';
const F3='f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de';
const SOURCE='2d134ff9ef60f70a1eb03c9370580228811a3070';
const OLD={"tha-ap389":{"id":"tha-ap389","book":36,"start":11045,"end":11067,"title":"Kadaliphaladāyakattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 389","vri":"37–43","pts":{"volume":1,"page":297,"end_page":297}},"tha-ap390":{"id":"tha-ap390","book":36,"start":11067,"end":11081,"title":"Panasaphaladāyakattheraapadāna","collection":"ap","acronym":"Tha Ap 390","vri":"44–48","pts":{"volume":1,"page":297,"end_page":297}}};
const NEW={"tha-ap389":{"id":"tha-ap389","book":36,"start":11045,"end":11063,"title":"Kadaliphaladāyakattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 389","vri":"37–42","pts":{"volume":1,"page":297,"end_page":297},"index_revision":"apadana-thera389-390-v1"},"tha-ap390":{"id":"tha-ap390","book":36,"start":11063,"end":11081,"title":"Panasaphaladāyakattheraapadānaṃ","collection":"ap","acronym":"Tha Ap 390","vri":"43–48","pts":{"volume":1,"page":297,"end_page":297},"index_revision":"apadana-thera389-390-v1"}};
// Authentic existing H34 physical rows, not recompressed snapshots or current byte fallbacks.
const H_ROWS={"server/data/canon.json.gz.part-0001":{"bytes":4194304,"sha256":"526ba969d0fc3ce62fde7d11764313de43b91a2f71375d602cd647a43b601632"},"server/data/canon.json.gz.part-0002":{"bytes":1367692,"sha256":"54bb0f581aff105d57b2270cdd2ca59821c722792ffae2c8a40486782c300cf4"},"server/data/canon.json.gz.parts.json":{"bytes":455,"sha256":"388a5daaf3a2cf7739b96dc865dbe93455e7e7b268bc22a683c1377180bfa250"}};
const sha=raw=>createHash('sha256').update(raw).digest('hex');
function currentSourceJSON(value){
 assert.ok(value&&Object.getPrototypeOf(value)===Object.prototype);
 assert.equal(value.source?.commit,SOURCE);assert.ok(Array.isArray(value.units));
 for(const id of Object.keys(NEW)){
  const matches=value.units.filter(unit=>unit.id===id);assert.equal(matches.length,1);
  assert.deepEqual(matches[0],NEW[id],'Exact complete typed current pair required for historical source input');
 }
 const raw=JSON.stringify(value);assert.equal(sha(raw),CURRENT,'Actual current full canonical JSON must be exactly883d before historical source derivation');return raw;
}
export function historicalF3SourceFixture(current){
 const historical=JSON.parse(currentSourceJSON(current)); // detached JSON clone, never mutate current
 for(let i=0;i<historical.units.length;i++)if(Object.hasOwn(OLD,historical.units[i].id))historical.units[i]=structuredClone(OLD[historical.units[i].id]);
 assert.equal(sha(JSON.stringify(historical)),F3,'Only the two reviewed metadata replacements may produce historical F3');
 return historical;
}
export function historicalF3SourceFixtureFromOwnedH(current,base){
 currentSourceJSON(current); // actual-R positive remains separate from the historical physical input
 assert.ok(base&&Object.getPrototypeOf(base)===URL.prototype);assert.equal(base.protocol,'file:');
 const root=fileURLToPath(base);const parents=[];for(let path=root;;path=dirname(path)){parents.push(path);if(dirname(path)===path)break;}
 for(const path of parents.reverse()){const status=lstatSync(path);assert.ok(status.isDirectory()&&!status.isSymbolicLink());}
 const values={};
 for(const[name,row]of Object.entries(H_ROWS)){
  let path=root;const parts=name.split('/');for(let i=0;i<parts.length;i++){path=join(path,parts[i]);const status=lstatSync(path);assert.equal(status.isSymbolicLink(),false);assert.equal(i===parts.length-1?status.isFile():status.isDirectory(),true);}
  const raw=readFileSync(path);assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256,'Exact already-owned H canon physical input '+name);values[name]=raw;
 }
 const packed=Buffer.concat([values['server/data/canon.json.gz.part-0001'],values['server/data/canon.json.gz.part-0002']]);
 const manifest=JSON.parse(values['server/data/canon.json.gz.parts.json']);assert.equal(manifest.version,1);assert.equal(manifest.size,packed.length);assert.equal(manifest.sha256,sha(packed));
 const raw=gunzipSync(packed);assert.equal(sha(raw),F3);const historical=JSON.parse(raw);assert.equal(historical.source?.commit,SOURCE);return historical;
}

export function historicalF3SourceBytes(currentRaw){
 assert.ok(Buffer.isBuffer(currentRaw),'Exact decompressed source Buffer required');
 return Buffer.from(JSON.stringify(historicalF3SourceFixture(JSON.parse(currentRaw))),'utf8');
}
