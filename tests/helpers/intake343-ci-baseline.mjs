/** Exact additive CI inverse; all preceding historical workflow bodies survive. */
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
export const AC_WORKFLOW_SHA='645ad6c605b5ebd15e35051b8b3107616c6b3ed56848bfdeb2af7fc8219fb2be';
export const SOURCE_PATHS=["src/_poems/chapter-3/poem-331.md", "src/_poems/chapter-3/poem-332.md", "src/_poems/chapter-3/poem-333.md", "src/_poems/chapter-3/poem-334.md"];
export const SOURCE_BLOCK="            src/_poems/chapter-3/poem-331.md\n            src/_poems/chapter-3/poem-332.md\n            src/_poems/chapter-3/poem-333.md\n            src/_poems/chapter-3/poem-334.md\n";
export const REQUIRED_STEP="      - name: Require all reviewed publisher331-334 source and preface client cases\n        if: matrix.group == 'apadana'\n        timeout-minutes: 10\n        shell: bash\n        env:\n          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned\n          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned\n        run: |\n          node --test --test-reporter=tap tests/thera331-334-source.test.mjs tests/thera331-334-preface-client.test.mjs | tee reviewed-publisher331-334.tap\n          node --input-type=module -e 'import assert from \"node:assert/strict\"; import {readFileSync} from \"node:fs\"; const tap=readFileSync(\"reviewed-publisher331-334.tap\",\"utf8\"); for(const [key,value] of [[\"tests\",13],[\"pass\",13],[\"fail\",0],[\"cancelled\",0],[\"skipped\",0],[\"todo\",0]]) assert.match(tap,new RegExp(\"^# \"+key+\" \"+value+\"$\",\"m\"));'\n";
export const REPORT_LINE="            reviewed-publisher331-334.tap\n";
export function projectIntake343Workflow(text,{requireCurrent=false}={}){
 assert.equal(typeof text,'string');
 const present=text.includes('publisher331-334')||text.includes('reviewed-publisher331-334')||SOURCE_PATHS.some(p=>text.includes(p));
 if(!present){assert.equal(requireCurrent,false,'Current343 CI gate required');assert.equal(sha(text),AC_WORKFLOW_SHA,'Explicit complete ac workflow only');return text;}
 for(const p of SOURCE_PATHS)assert.equal(text.split(p).length-1,1,'Exactly one approved source path');
 let old=text;for(const delta of [SOURCE_BLOCK,REQUIRED_STEP,REPORT_LINE]){assert.equal(old.split(delta).length-1,1,'Exact finite CI addition once');old=old.replace(delta,'');}
 assert.equal(sha(old),AC_WORKFLOW_SHA,'All ac gates, jobs, assertions and bounds remain byte-exact');return old;
}
