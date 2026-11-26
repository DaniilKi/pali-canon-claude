import {normalizeFrozen440SourceInput} from './boundary333-336-source-input.mjs';
/** Finite339 CI input adapter; never change old job or assertion bytes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
export const SOURCE_PATHS=["src/_poems/chapter-3/poem-321.md", "src/_poems/chapter-3/poem-323.md", "src/_poems/chapter-3/poem-324.md", "src/_poems/chapter-3/poem-325.md", "src/_poems/chapter-3/poem-326.md", "src/_poems/chapter-3/poem-329.md"];
export const SOURCE_BLOCK="            src/_poems/chapter-3/poem-321.md\n            src/_poems/chapter-3/poem-323.md\n            src/_poems/chapter-3/poem-324.md\n            src/_poems/chapter-3/poem-325.md\n            src/_poems/chapter-3/poem-326.md\n            src/_poems/chapter-3/poem-329.md\n";
export const STEP="      - name: Require all reviewed publisher321-329 six-scope source and client cases\n        if: matrix.group == 'apadana'\n        timeout-minutes: 10\n        shell: bash\n        env:\n          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned\n          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned\n        run: |\n          node --test --test-reporter=tap tests/thera321-329-source.test.mjs tests/thera321-329-client.test.mjs | tee reviewed-publisher321-329.tap\n          node --input-type=module -e 'import assert from \"node:assert/strict\"; import {readFileSync} from \"node:fs\"; const tap=readFileSync(\"reviewed-publisher321-329.tap\",\"utf8\"); for(const [key,value] of [[\"tests\",12],[\"pass\",12],[\"fail\",0],[\"cancelled\",0],[\"skipped\",0],[\"todo\",0]]) assert.match(tap,new RegExp(\"^# \"+key+\" \"+value+\"$\",\"m\"));'\n";
export const REPORT="            reviewed-publisher321-329.tap\n";
export const D4_WORKFLOW_SHA="5991bff3f46e3cca7ebf08605011f668e1f39a402f31db8124246aac222aeccc";
const count=(s,x)=>s.split(x).length-1;
function historicalProjectPublisher339Workflow(text,{requireCurrent=false}={}){
 const present=text.includes('reviewed-publisher321-329.tap')||SOURCE_PATHS.some(p=>text.includes(p));
 if(!present){assert.equal(requireCurrent,false,'Mandatory339 source gate is missing');return text;}
 for(const path of SOURCE_PATHS)assert.equal(count(text,path),1,'Exactly one approved339 original '+path);
 for(const part of [SOURCE_BLOCK,STEP,REPORT])assert.equal(count(text,part),1,'The complete finite339 gate/path/report block is required exactly once');
 const original=text.replace(SOURCE_BLOCK,'').replace(STEP,'').replace(REPORT,'');
 assert.equal(sha(original),D4_WORKFLOW_SHA,'All old workflow bytes, checks and budgets remain exact');return original;
}

export function projectPublisher339Workflow(text,options){
 return historicalProjectPublisher339Workflow(normalizeFrozen440SourceInput('.github/workflows/check.yml',text),options);
}
