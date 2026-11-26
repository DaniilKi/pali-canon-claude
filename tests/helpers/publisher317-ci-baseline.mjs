// Exact additive publisher intake only; historical workflows remain unchanged.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const PUBLISHER317_ORIGINAL_WORKFLOW_SHA='138d776923eabc71e91042461cd7f21d394a543a09886f6d46eb45486c07710c';
export const PUBLISHER317_SOURCE_PATHS=Object.freeze(
[
  "src/_poems/chapter-3/poem-261.md",
  "src/_poems/chapter-3/poem-262.md",
  "src/_poems/chapter-3/poem-263.md",
  "src/_poems/chapter-3/poem-264.md",
  "src/_poems/chapter-3/poem-265.md",
  "src/_poems/chapter-3/poem-267.md",
  "src/_poems/chapter-3/poem-268.md",
  "src/_poems/chapter-3/poem-269.md",
  "src/_poems/chapter-3/poem-270.md",
  "src/_poems/chapter-3/poem-271.md",
  "src/_poems/chapter-3/poem-272.md",
  "src/_poems/chapter-3/poem-273.md",
  "src/_poems/chapter-3/poem-274.md",
  "src/_poems/chapter-3/poem-275.md",
  "src/_poems/chapter-3/poem-276.md",
  "src/_poems/chapter-3/poem-277.md",
  "src/_poems/chapter-3/poem-278.md",
  "src/_poems/chapter-3/poem-279.md",
  "src/_poems/chapter-3/poem-281.md",
  "src/_poems/chapter-3/poem-282.md",
  "src/_poems/chapter-3/poem-283.md",
  "src/_poems/chapter-3/poem-284.md",
  "src/_poems/chapter-3/poem-285.md",
  "src/_poems/chapter-3/poem-287.md",
  "src/_poems/chapter-3/poem-288.md",
  "src/_poems/chapter-3/poem-292.md",
  "src/_poems/chapter-3/poem-293.md",
  "src/_poems/chapter-3/poem-294.md",
  "src/_poems/chapter-3/poem-295.md",
  "src/_poems/chapter-3/poem-296.md",
  "src/_poems/chapter-3/poem-298.md",
  "src/_poems/chapter-3/poem-299.md"
]);
export const PUBLISHER317_SOURCE_BLOCK=PUBLISHER317_SOURCE_PATHS.map(path=>'            '+path+'\n').join('');
export const PUBLISHER317_STEP_NAME='Require all reviewed publisher261-299 source and client cases';
export const PUBLISHER317_STEP=`      - name: Require all reviewed publisher261-299 source and client cases
        if: matrix.group == 'apadana'
        timeout-minutes: 10
        shell: bash
        env:
          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned
          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned
        run: |
          node --test --test-reporter=tap tests/thera261-280-source.test.mjs tests/thera261-280-client.test.mjs tests/thera281-285-source.test.mjs tests/thera281-285-client.test.mjs tests/thera287-288-source.test.mjs tests/thera287-288-client.test.mjs tests/thera292-299-source.test.mjs tests/thera292-299-client.test.mjs | tee reviewed-publisher261-299.tap
          node --input-type=module -e 'import assert from "node:assert/strict"; import {readFileSync} from "node:fs"; const tap=readFileSync("reviewed-publisher261-299.tap","utf8"); for(const [key,value] of [["tests",49],["pass",49],["fail",0],["cancelled",0],["skipped",0],["todo",0]]) assert.match(tap,new RegExp("^# "+key+" "+value+"$","m"));'
`;
export const PUBLISHER317_REPORT_LINE='            reviewed-publisher261-299.tap\n';
const count=(text,part)=>text.split(part).length-1;
const sha=text=>createHash('sha256').update(text).digest('hex');

// The Node stage projector runs first. Remove only this exact reviewed intake
// and require every byte of the complete restored historical workflow.
export function projectPublisher317Workflow(text){
  const present=text.includes(PUBLISHER317_STEP_NAME)||text.includes('reviewed-publisher261-299.tap')||PUBLISHER317_SOURCE_PATHS.some(path=>text.includes(path));
  if(!present)return text;
  for(const path of PUBLISHER317_SOURCE_PATHS)assert.equal(count(text,path),1,'Each approved publisher317 fixture occurs exactly once: '+path);
  assert.equal(count(text,PUBLISHER317_SOURCE_BLOCK),1,'Only the exact ordered32 approved fixture lines may be projected');
  assert.equal(count(text,PUBLISHER317_STEP_NAME),1,'The reviewed publisher317 gate occurs exactly once');
  assert.equal(count(text,PUBLISHER317_STEP),1,'The exact49-pass/zero-skip source and client gate is required');
  assert.equal(count(text,PUBLISHER317_REPORT_LINE),1,'The publisher317 TAP evidence is retained exactly once');
  const original=text.replace(PUBLISHER317_SOURCE_BLOCK,'').replace(PUBLISHER317_STEP,'').replace(PUBLISHER317_REPORT_LINE,'');
  assert.equal(sha(original),PUBLISHER317_ORIGINAL_WORKFLOW_SHA,'Only the reviewed32 fixtures,49-case gate and TAP artifact may differ from the complete historical workflow');
  return original;
}
