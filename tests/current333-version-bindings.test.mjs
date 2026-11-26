/** Finite current-release bindings; all historical104 fixture/assertion bytes remain exact. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readCurrentFileSync} from 'node:fs';
import {d4FileReader} from './helpers/current339-source-inverse.mjs';
const readFileSync=d4FileReader(readCurrentFileSync);
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const bindings=[
  {
    "path": "tests/apadana-disclosures.test.mjs",
    "before": "assert.equal(WIDGET_VERSION, 'v38');",
    "after": "assert.equal(WIDGET_VERSION, 'v39');",
    "occurrences": 1,
    "original104_sha256": "712cadff2c3d2a703ee042b626705544f18a8f2450d1c0b895f6f025955f6d6e",
    "proposed_sha256": "33f77af040966a8b0c0e7c1e8a5b0dc3fb8f91af84ceb4e4ca1b62aef2ef7d12",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/apadana-fourth-client.test.mjs",
    "before": "assert.equal(WIDGET_VERSION, 'v38');",
    "after": "assert.equal(WIDGET_VERSION, 'v39');",
    "occurrences": 2,
    "original104_sha256": "43f61c89b4d84f85a2e2c6d4b58e4a533e10d6b69bd066de61d2269aa849b854",
    "proposed_sha256": "84947b2e226a6e335567f77f507617477977562406fda0780425b93f97b658be",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/thera-commentary-locators.test.mjs",
    "before": "assert.equal(WIDGET_VERSION, 'v38');",
    "after": "assert.equal(WIDGET_VERSION, 'v39');",
    "occurrences": 1,
    "original104_sha256": "9979d804551ead425120d7abca76d81b5703f83a90c5f40d95654290cf8717da",
    "proposed_sha256": "777130ad2864ee6eac8c49f930c7a89945f0ed7cfe38f10b1887eb67650a2908",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/thera181-220-client.test.mjs",
    "before": "assert.equal(WIDGET_VERSION, 'v38');",
    "after": "assert.equal(WIDGET_VERSION, 'v39');",
    "occurrences": 1,
    "original104_sha256": "67e20701b08b0db00cc547d9119f2ee627768ce4bb45bd98509f25e55fa44962",
    "proposed_sha256": "d31e5dec8a4ea8c640ddf1e7128190fabda08b6f1e0ae82a56284e0ae9ab405a",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/helpers/thera-remaining-client.mjs",
    "before": "assert.equal(WIDGET_VERSION, 'v38');",
    "after": "assert.equal(WIDGET_VERSION, 'v39');",
    "occurrences": 1,
    "original104_sha256": "c1a0ef01b052e23ead65e7b799898d7dc11c0dae856fca98ff29cd8fc6f3adc5",
    "proposed_sha256": "7ef4f3f08ff2c9c1c1d748063994976c6908dfe0f06fa66653b873af0337901f",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/thera141-180-client.test.mjs",
    "before": "assert.equal(WIDGET_VERSION, 'v38');",
    "after": "assert.equal(WIDGET_VERSION, 'v39');",
    "occurrences": 1,
    "original104_sha256": "1095924003b2dcfa6bbe5fcf627cc930e0a0cff238c31cd9f42a57f09c316333",
    "proposed_sha256": "e155512d3ae5387daebb3dada44963fa6a1d1696379c656cd47343bda8f1ed7e",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/thera221-230-client.test.mjs",
    "before": "assert.equal(WIDGET_VERSION, 'v38');",
    "after": "assert.equal(WIDGET_VERSION, 'v39');",
    "occurrences": 1,
    "original104_sha256": "fe7000899d130e67634a844d00e8fb425f06cad5a0a52ce282d4dc9c7992e49b",
    "proposed_sha256": "b9c18d2b308a736e0dfc064d5ed6eff7ce4331e9d6456eb1602af35a9ca8ac77",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/thera241-250-client.test.mjs",
    "before": "assert.equal(WIDGET_VERSION, 'v38');",
    "after": "assert.equal(WIDGET_VERSION, 'v39');",
    "occurrences": 1,
    "original104_sha256": "47b7abdfe5bca22b352f55bcd5895f0bb318976e1e807b0ab6d0159de1c35185",
    "proposed_sha256": "6a19c229d26d30a5b000f644db3e721738a92a3ace16c6a3e6860acdfeaf3033",
    "inverse_to104_full_bytes": true
  },
  {
    "path": "tests/source-notes-compatibility.test.mjs",
    "before": "assert.equal(CURRENT_APADANA_IDS.length, 325);",
    "after": "assert.equal(CURRENT_APADANA_IDS.length, 333);",
    "occurrences": 1,
    "original104_sha256": "70c46a3194c4ccf9dad6e892d4f59d57a9286f258cf1dcf77bd18a55b6e3c65c",
    "proposed_sha256": "94a75db0445b6ee9b7c07738bb78b6f59ec42568d3524e1825d0a79e74b67f98",
    "inverse_to104_full_bytes": true
  }
];
function restore104(binding,source){
 assert.equal(source.split(binding.after).length-1,binding.occurrences,'Exact approved current assertion count '+binding.path);
 assert.equal(source.split(binding.before).length-1,0,'No stale current binding remains '+binding.path);
 const restored=source.split(binding.after).join(binding.before);
 assert.equal(sha(restored),binding.original104_sha256,'No other old assertion or fixture byte may differ '+binding.path);
 return restored;
}
for(const row of bindings)test('exact current binding and full104 inverse '+row.path,()=>{
 const source=readFileSync(row.path,'utf8');assert.equal(sha(source),row.proposed_sha256,'Exact independently assembled binding');assert.equal(sha(restore104(row,source)),row.original104_sha256);
 assert.throws(()=>restore104(row,source.replace(row.after,row.before)),'Missing current binding must refuse');
 assert.throws(()=>restore104(row,source+row.after),'Extra current assertion must refuse');
 assert.throws(()=>restore104(row,source.replace(row.after,row.after.replace(row.after.includes('v39')?'v39':'333',row.after.includes('v39')?'v40':'334'))),'Unapproved current version/count must refuse');
 assert.throws(()=>restore104(row,source+'\n// unrelated old assertion or fixture modification\n'),'Correct current counters cannot conceal any other delta');
});
