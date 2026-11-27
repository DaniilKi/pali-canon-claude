// Explicit immutable H pure-source inputs after the genuine CURRENT375 source guard.
// Registration stays in actual R; no H .test.mjs is imported or executed.
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHSourceInputs} from './helpers/historical-h-inputs.mjs';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHSourceInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
/** Five actual-current resource URI bindings; historical source inverses stay unchanged. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readOwnedHPhysicalFile} from 'node:fs';
function readCurrentFileSync(path,...options){return readOwnedHPhysicalFile(typeof path==='string'&&bindings.some(row=>row.path===path)?new URL(path,HistoricalHBase):path,...options);}
const {d4FileReader}=await import(new URL('tests/helpers/current339-source-inverse.mjs',HistoricalHBase).href);
const readFileSync=d4FileReader(readCurrentFileSync);
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const bindings=[
  {
    "path": "tests/widget-hosted-selections.test.mjs",
    "before": "assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v38.html');",
    "after": "assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v39.html');",
    "occurrences": 1,
    "original104_sha256": "3204329bcb32e09adf779b2e16f1daefc647eb35a5b92059c905326949e57abd",
    "proposed_sha256": "aaa66058a2e2e41cbde0c04d3cd06b4afb35a83aa95f34472d8490da39f2e720",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/apadana-third.test.mjs",
    "before": "assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v38.html');",
    "after": "assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v39.html');",
    "occurrences": 1,
    "original104_sha256": "5f8ef501323e81d1c279b7019a1b96ea3b633b708f4870029a435352f28c9b0e",
    "proposed_sha256": "c519ae3e83f97062b2e6088a937befb6bcc1fe0960aa7a3349cecb2b8c32f76c",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/apadana-thera.test.mjs",
    "before": "assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v38.html');",
    "after": "assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v39.html');",
    "occurrences": 1,
    "original104_sha256": "8fc82ca1a10597a39178dddc0b6e6d572443d245b50729f77e6455cce872aef5",
    "proposed_sha256": "8d22f81c510e5962ac55bf1c0202cca442cb6b53ba829b8b1de78a2b515b64a9",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/apadana-fourth.test.mjs",
    "before": "assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v38.html');",
    "after": "assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v39.html');",
    "occurrences": 1,
    "original104_sha256": "cfe31d6333186336c216dda57dbd2bd1224fb864678c1e284138eeca1912d02f",
    "proposed_sha256": "9a20ea311e157f4de559485d3f483b8fde365b5f940aa3c08ec9fa1e6cf81383",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/apadana-next.test.mjs",
    "before": "assert.equal(WIDGET_URI,'ui://pali-canon/reader-v38.html');",
    "after": "assert.equal(WIDGET_URI,'ui://pali-canon/reader-v39.html');",
    "occurrences": 1,
    "original104_sha256": "aa51ca8e84c3f1cd6864b7833a7cfd24e8e4bbefa193918cb91275cc29a8b90a",
    "proposed_sha256": "06bcde4c5b8fed69e234caf825cf6ed7d642e739baf601b327e6086cf339e74f",
    "inverse_to104_full_bytes": true
  }
];
function restore104(row,source){
 assert.equal(source.split(row.after).length-1,row.occurrences,'Exact one approved current URI assertion '+row.path);
 assert.equal(source.split(row.before).length-1,0,'No stale current URI binding remains '+row.path);
 const restored=source.split(row.after).join(row.before);
 assert.equal(sha(restored),row.original104_sha256,'No other old assertion or fixture byte may differ '+row.path);return restored;
}
for(const row of bindings)test('exact current URI and full104 inverse '+row.path,()=>{
 const source=readFileSync(row.path,'utf8');assert.equal(sha(source),row.proposed_sha256,'Exact independently assembled URI binding');assert.equal(sha(restore104(row,source)),row.original104_sha256);
 assert.throws(()=>restore104(row,source.replace(row.after,row.before)),'Missing current URI must refuse');
 assert.throws(()=>restore104(row,source+row.after),'Duplicate current URI must refuse');
 assert.throws(()=>restore104(row,source.replace(row.after,row.after.replace('reader-v39.html','reader-v40.html'))),'Wrong current URI must refuse');
 assert.throws(()=>restore104(row,source+'\n// unrelated old assertion or fixture modification\n'),'A valid URI counter cannot conceal unrelated deltas');
});
