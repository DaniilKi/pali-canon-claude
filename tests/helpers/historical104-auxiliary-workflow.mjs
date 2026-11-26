// Exact old auxiliary workflow bytes plus one mandatory historical104 setup.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const HISTORICAL104_AUX_FETCH=`      - name: Fetch exact104 canonical artifacts for historical inverse checks
        timeout-minutes: 2
        shell: bash
        run: |
          git fetch --no-tags --depth=1 origin 104b57a6891ddae645c51e39eb3d27b89b64ffdf
          git cat-file -e '104b57a6891ddae645c51e39eb3d27b89b64ffdf^{commit}'
`;
export const HISTORICAL104_AUX_NAME='Fetch exact104 canonical artifacts for historical inverse checks';
export const HISTORICAL104_AUX_BASELINES=Object.freeze([
  {
    "path": ".github/workflows/release.yml",
    "old_sha256": "5a1b913463cf595c95bd13602e585f84395abd719c6482b048cf61d111d09234",
    "anchor": "      - run: npm run check\n"
  },
  {
    "path": ".github/workflows/dasabala-diagnostic.yml",
    "old_sha256": "61c262ada533dfe51fc841f70975ad025810937d0fbac684ded7ca276f1a25b2",
    "anchor": "      - name: Run complete test inventory under normal concurrency\n"
  },
  {
    "path": ".github/workflows/data-refresh.yml",
    "old_sha256": "0e09422781bc75e6f11ca4ff52521a43a256fc608152d4a00e1001e5a80a59a4",
    "anchor": "      - name: Tests (npm test)\n"
  }
]);
const sha=value=>createHash('sha256').update(value).digest('hex');
const count=(value,part)=>value.split(part).length-1;
export const fullInventoryCalls=source=>[...source.matchAll(/^\s+(?:-\s+)?(?:run:\s*)?npm (?:test|run check)(?:[ \t]|$)/gm)];
export function restoreHistorical104Auxiliary(path,source){
 const row=HISTORICAL104_AUX_BASELINES.find(item=>item.path===path);
 assert.ok(row,'Only the three independently named auxiliary workflows are projected');
 assert.equal(count(source,HISTORICAL104_AUX_NAME),1,'Historical104 setup name occurs exactly once');
 assert.equal(count(source,HISTORICAL104_AUX_FETCH),1,'Only the exact bounded pinned104 Git setup may be projected');
 const calls=fullInventoryCalls(source);assert.equal(calls.length,1,'Each reviewed auxiliary workflow retains its exact one full inventory command');
 assert.ok(source.indexOf(HISTORICAL104_AUX_FETCH)<calls[0].index,'Historical104 object setup must complete before full tests');
 const original=source.replace(HISTORICAL104_AUX_FETCH,'');
 assert.equal(sha(original),row.old_sha256,'No triggers,permissions,job behavior or old step bytes may change');
 return original;
}
