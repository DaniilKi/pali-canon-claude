/** Mandatory after independent source-map seal; PENDING is failure, never skip. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertNextTenActualData} from './helpers/next-ten-history-data.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');

test('strict source readers require physical NEXT while explicit DD source-stage input remains legitimate',{timeout:30000},async()=>{
  // Actual-current positive precedes every source proof import/negative case.
  const current=assertNextTenActualData(new URL('../',import.meta.url));assert.equal(Object.keys(current).length,34);
  const next=await import('./helpers/next-ten-source-input.mjs');
  const six=await import('./helpers/six-boundary-source-input.mjs');
  const map=next.readNextTenSourceInverses(),path='src/locator-policy.mjs',row=map.files[path];assert.ok(row,'Critical mapped source is mandatory');
  const input=readFileSync(new URL('../'+path,import.meta.url),'utf8');assert.equal(sha(input),row.current_sha256);
  const dd=next.projectDD7Source(path,input,{requireCurrent:true});assert.equal(sha(dd),row.dd7_sha256);
  assert.equal(next.projectDD7Source(path,dd),dd,'Explicit historical DD source is a legitimate raw stage input');
  const c1=six.projectC1Source(path,dd);assert.equal(sha(c1),six.sixSourceInverses.files[path].c1_sha256);
  for(const identity of [path,new URL('../'+path,import.meta.url)]){
    assert.equal(sha(next.strictDD7SourceReader(readFileSync)(identity)),row.dd7_sha256);
    assert.equal(sha(six.strictC1SourceReader(readFileSync)(identity)),sha(c1));
    // A correct historical-stage DD string/Buffer is not actual NEXT source.
    for(const prior of [dd,Buffer.from(dd)]){
      assert.throws(()=>next.strictDD7SourceReader(()=>prior)(identity));
      assert.throws(()=>six.strictC1SourceReader(()=>prior)(identity));
    }
  }
  const unknown=input+'\n// synthetic unreviewed source bytes\n';
  assert.equal(next.normalizeDD7SourceInput(path,unknown),unknown);
  assert.throws(()=>next.projectDD7Source(path,unknown,{requireCurrent:true}));
  for(const path of ['server/index.cjs','server/data/canon.json.gz','unlisted/input']){
    assert.equal(map.files[path],undefined);
    assert.equal(next.projectDD7Source(path,'runtime is never source-projected'),'runtime is never source-projected');
  }
});
