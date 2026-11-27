// Explicit immutable H runtime inputs after the genuine CURRENT375 positive.
// Registration remains in actual R; no H .test.mjs is imported or executed.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
/** Mandatory after independent source-map seal; PENDING is failure, never skip. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readOwnedHPhysicalFile} from 'node:fs';
import {createHash} from 'node:crypto';
const {assertNextTenActualData}=await import(new URL('tests/helpers/next-ten-history-data.mjs',HistoricalHBase).href);
// Only the existing critical literal source input is selected from H.
function readFileSync(path,...options){return readOwnedHPhysicalFile(typeof path==='string'&&path==='src/locator-policy.mjs'?new URL(path,HistoricalHBase):path,...options);}
const sha=b=>createHash('sha256').update(b).digest('hex');

test('strict source readers require physical NEXT while explicit DD source-stage input remains legitimate',{timeout:30000},async()=>{
  // Actual-current positive precedes every source proof import/negative case.
  const current=assertNextTenActualData(HistoricalHBase);assert.equal(Object.keys(current).length,34);
  const next=await import(new URL('tests/helpers/next-ten-source-input.mjs',HistoricalHBase).href);
  const six=await import(new URL('tests/helpers/six-boundary-source-input.mjs',HistoricalHBase).href);
  const map=next.readNextTenSourceInverses(),path='src/locator-policy.mjs',row=map.files[path];assert.ok(row,'Critical mapped source is mandatory');
  const input=readFileSync(new URL(path,HistoricalHBase),'utf8');assert.equal(sha(input),row.current_sha256);
  const dd=next.projectDD7Source(path,input,{requireCurrent:true});assert.equal(sha(dd),row.dd7_sha256);
  assert.equal(next.projectDD7Source(path,dd),dd,'Explicit historical DD source is a legitimate raw stage input');
  const c1=six.projectC1Source(path,dd);assert.equal(sha(c1),six.sixSourceInverses.files[path].c1_sha256);
  for(const identity of [path,new URL(path,HistoricalHBase)]){
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
