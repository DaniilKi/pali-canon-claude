// Remove only the independently reviewed eight-source CI325 extension.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const PUBLISHER325_ORIGINAL_WORKFLOW_SHA='483078f599f7e7297f226cd4230961012350c107b909bd0ac812617ea60ef02c';
export const PUBLISHER325_SOURCE_PATHS=Object.freeze([301,302,303,304,305,308,309,310].map(number=>'src/_poems/chapter-3/poem-'+number+'.md'));
export const PUBLISHER325_SOURCE_BLOCK=PUBLISHER325_SOURCE_PATHS.map(path=>'            '+path+'\n').join('');
export const PUBLISHER325_STEP_NAME='Require all reviewed publisher301-310 source and client cases';
export const PUBLISHER325_STEP=`      - name: Require all reviewed publisher301-310 source and client cases
        if: matrix.group == 'apadana'
        timeout-minutes: 10
        shell: bash
        env:
          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned
          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned
        run: |
          node --test --test-reporter=tap tests/thera301-310-source.test.mjs tests/thera301-310-client.test.mjs | tee reviewed-publisher301-310.tap
          node --input-type=module -e 'import assert from "node:assert/strict"; import {readFileSync} from "node:fs"; const tap=readFileSync("reviewed-publisher301-310.tap","utf8"); for(const [key,value] of [["tests",14],["pass",14],["fail",0],["cancelled",0],["skipped",0],["todo",0]]) assert.match(tap,new RegExp("^# "+key+" "+value+"$","m"));'
`;
export const PUBLISHER325_REPORT_LINE='            reviewed-publisher301-310.tap\n';
const count=(text,part)=>text.split(part).length-1;
const sha=text=>createHash('sha256').update(text).digest('hex');

// Runs BEFORE the diagnostic-stage and317 projections. Every retained byte of
// the final317 workflow, including its49-case gate and bounds, is authoritative.
export function projectPublisher325Workflow(text){
  const present=text.includes(PUBLISHER325_STEP_NAME)||text.includes('reviewed-publisher301-310.tap')||PUBLISHER325_SOURCE_PATHS.some(path=>text.includes(path));
  if(!present)return text;
  for(const path of PUBLISHER325_SOURCE_PATHS)assert.equal(count(text,path),1,'Each approved325 original occurs exactly once: '+path);
  assert.equal(count(text,PUBLISHER325_SOURCE_BLOCK),1,'Only the exact ordered eight approved fixture lines may be projected');
  assert.equal(count(text,PUBLISHER325_STEP_NAME),1,'The reviewed325 gate occurs exactly once');
  assert.equal(count(text,PUBLISHER325_STEP),1,'The exact14-pass/zero-skip source and client gate is required');
  assert.equal(count(text,PUBLISHER325_REPORT_LINE),1,'The325 TAP evidence is retained exactly once');
  const original=text.replace(PUBLISHER325_SOURCE_BLOCK,'').replace(PUBLISHER325_STEP,'').replace(PUBLISHER325_REPORT_LINE,'');
  assert.equal(sha(original),PUBLISHER325_ORIGINAL_WORKFLOW_SHA,'Only eight approved fixtures, the14-case gate and its TAP artifact may differ from the complete final317 workflow');
  return original;
}
