import {projectPublisher339Workflow} from './publisher339-ci-baseline.mjs';
// Exact CI333 delta only; all historical workflow bytes remain authoritative.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const PUBLISHER333_ORIGINAL_WORKFLOW_SHA='03b8abbf4b8c5001726efaecdca8f737e27b06ab80fb0e777f04d17e36ee83ba';
export const PUBLISHER333_SOURCE_PATHS=Object.freeze([312,313,314,315,316,317,318,319].map(number=>'src/_poems/chapter-3/poem-'+number+'.md'));
export const PUBLISHER333_SOURCE_BLOCK=PUBLISHER333_SOURCE_PATHS.map(path=>'            '+path+'\n').join('');
export const PUBLISHER333_STEP_NAME='Require all reviewed publisher312-319 source and client cases';
export const PUBLISHER333_STEP=`      - name: Require all reviewed publisher312-319 source and client cases
        if: matrix.group == 'apadana'
        timeout-minutes: 10
        shell: bash
        env:
          APADANA_SOURCE_CHECKOUT: .fixtures/apadana-pinned
          APADANA_OFFICIAL_CHECKOUT: .fixtures/apadana-pinned
        run: |
          node --test --test-reporter=tap tests/thera312-319-source.test.mjs tests/thera312-319-client.test.mjs | tee reviewed-publisher312-319.tap
          node --input-type=module -e 'import assert from "node:assert/strict"; import {readFileSync} from "node:fs"; const tap=readFileSync("reviewed-publisher312-319.tap","utf8"); for(const [key,value] of [["tests",14],["pass",14],["fail",0],["cancelled",0],["skipped",0],["todo",0]]) assert.match(tap,new RegExp("^# "+key+" "+value+"$","m"));'
`;
export const HISTORICAL104_FETCH_NAME='Fetch exact104 canonical artifacts for historical inverse checks';
export const HISTORICAL104_FETCH=`      - name: Fetch exact104 canonical artifacts for historical inverse checks
        timeout-minutes: 2
        shell: bash
        run: |
          git fetch --no-tags --depth=1 origin 104b57a6891ddae645c51e39eb3d27b89b64ffdf
          git cat-file -e '104b57a6891ddae645c51e39eb3d27b89b64ffdf^{commit}'
`;
export const PUBLISHER333_REPORT_LINE='            reviewed-publisher312-319.tap\n';
const count=(text,part)=>text.split(part).length-1;
const sha=text=>createHash('sha256').update(text).digest('hex');

// Runs BEFORE325,diagnostic-stage and317 projections. Provisioning is explicit
// CI setup; historical tests themselves must not fetch or build their oracle.
export function projectPublisher333Workflow(text){
  text=projectPublisher339Workflow(text);
  const present=text.includes(PUBLISHER333_STEP_NAME)||text.includes('reviewed-publisher312-319.tap')||text.includes(HISTORICAL104_FETCH_NAME)||PUBLISHER333_SOURCE_PATHS.some(path=>text.includes(path));
  if(!present)return text;
  for(const path of PUBLISHER333_SOURCE_PATHS)assert.equal(count(text,path),1,'Each approved333 original occurs exactly once: '+path);
  assert.equal(count(text,PUBLISHER333_SOURCE_BLOCK),1,'Only the exact ordered8 source paths may be projected');
  assert.equal(count(text,PUBLISHER333_STEP_NAME),1,'The exact333 source gate occurs once');
  assert.equal(count(text,PUBLISHER333_STEP),1,'All14 cases,zero skips,Bash pipeline and finite10minute bound are required');
  assert.equal(count(text,PUBLISHER333_REPORT_LINE),1,'New333 TAP evidence is retained once');
  assert.equal(count(text,HISTORICAL104_FETCH_NAME),1,'Historical104 object provisioning occurs once');
  assert.equal(count(text,HISTORICAL104_FETCH),1,'Only the exact pinned104 fetch and object check may be projected');
  const original=text.replace(PUBLISHER333_SOURCE_BLOCK,'').replace(PUBLISHER333_STEP,'').replace(PUBLISHER333_REPORT_LINE,'').replace(HISTORICAL104_FETCH,'');
  assert.equal(sha(original),PUBLISHER333_ORIGINAL_WORKFLOW_SHA,'Only8paths,new14case gate,TAP artifact and pinned104 provisioning may differ from complete104 workflow');
  return original;
}

// The old325 source-preservation case inspects the317 test module itself.
// Expose only its exact pre333 source to that unchanged historical assertion.
export function projectPublisher333TestSource(name,text){
  if(name!=='tests/publisher317-ci.test.mjs')return text;
  const expected='6822aa41e30bca4eb1b7fffb8d27d9c5de6027ba215d42b5881931728f6f6839';
  const imported="import {projectPublisher333Workflow} from './helpers/publisher333-ci-baseline.mjs';\n";
  const current="\nconst current=projectPublisher325Workflow(projectPublisher333Workflow(read('.github/workflows/check.yml')));\n";
  const previous="\nconst current=projectPublisher325Workflow(read('.github/workflows/check.yml'));\n";
  if(!text.includes(imported)){
    assert.equal(sha(text),expected,'Only the exact historical post325 test source may pass without333 adapter');
    return text;
  }
  assert.equal(count(text,imported),1,'Exactly one333 test-source import is admitted');
  assert.equal(count(text,current),1,'Exactly one333 test-source input binding is admitted');
  const original=text.replace(imported,'').replace(current,previous);
  assert.equal(sha(original),expected,'Only the exact333 input adapter may differ from historical317 test source');
  return original;
}
