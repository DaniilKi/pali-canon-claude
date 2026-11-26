import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{readBundled}from'../src/bundled-data.mjs';
import{projectHistorical440Data,historical440DataReader}from'./helpers/four-history-data.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const pins={
 'server/data/canon.json.gz.part-0002':'24169740dd71b5ee86767ef72daea44759201987ffb72975afaca5d31b4c0832',
 'server/data/canon.json.gz.parts.json':'639a938e11a230acbf0a87a18c180c820013d95795b7f951439a8cae674b91a7',
 'server/data/parallels.json.gz':'a5c99363bdec68bdaea8ea111eaea74a1c1bc0755235e1c2e49493d86414b385',
};
test('explicit historical data inputs preserve exact old byte pins while real loading stays current',()=>{
 const current=sha(readBundled('server/data/canon.json.gz')),reader=historical440DataReader(readFileSync);
 assert.equal(current,'6f41a168f033e4f82735cb3c3121dc807cbdaee7c4afae1e61082d5642c70c83');
 for(const[path,pin]of Object.entries(pins)){const raw=readFileSync(path),old=projectHistorical440Data(path,raw);assert.equal(sha(old),pin);assert.equal(sha(reader(path)),pin);if(path.endsWith('.json'))assert.equal(sha(Buffer.from(reader(path,'utf8'))),pin);else assert.throws(()=>reader(path,'utf8'));}
 assert.equal(sha(readBundled('server/data/canon.json.gz')),current);
});
test('historical data byte substitutions cannot hide tampered supplied current input after a cached positive',()=>{
 for(const path of Object.keys(pins)){const raw=readFileSync(path);projectHistorical440Data(path,raw);const changed=Buffer.from(raw);changed[0]^=1;assert.throws(()=>projectHistorical440Data(path,changed));}
});
test('unlisted runtime files and metadata retain byte identity and are never projected',()=>{
 for(const path of ['server/data/apadana.json','server/index.cjs','server/data/topics.json']){const raw=readFileSync(path);assert.equal(projectHistorical440Data(path,raw),raw);const altered=Buffer.concat([raw,Buffer.from('\n')]);assert.equal(projectHistorical440Data(path,altered),altered);}
});
