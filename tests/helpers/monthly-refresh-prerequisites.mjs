// Current monthly prerequisite counterpart; the historical104 witness remains unchanged.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const MONTHLY_HISTORICAL104_FETCH=`      - name: Fetch exact104 canonical artifacts for historical inverse checks
        timeout-minutes: 2
        shell: bash
        run: |
          git fetch --no-tags --depth=1 origin 104b57a6891ddae645c51e39eb3d27b89b64ffdf
          git cat-file -e '104b57a6891ddae645c51e39eb3d27b89b64ffdf^{commit}'
`;

export const MONTHLY_PATH='.github/workflows/data-refresh.yml';
export const MONTHLY_FIXED_H='4e9287bd5ebc78aba4b185b017e63eac6547bfd7';
export const MONTHLY_H_COMMANDS=`          git fetch --no-tags --depth=1 origin 4e9287bd5ebc78aba4b185b017e63eac6547bfd7
          git cat-file -e '4e9287bd5ebc78aba4b185b017e63eac6547bfd7^{commit}'
`;
export const MONTHLY_CURRENT_FETCH=MONTHLY_HISTORICAL104_FETCH+MONTHLY_H_COMMANDS;
const historical104WorkflowSHA='4b6e014d8a458c4fc2780b165d96b999b8e3229de7fcebdb1595a06fbbbd45bf';
const anchor='      - name: Tests (npm test)\n';
const sha=value=>createHash('sha256').update(value).digest('hex');
const count=(source,part)=>source.split(part).length-1;

export function restoreCurrentMonthlyPrerequisites(source){
 assert.equal(typeof source,'string','Exact current monthly workflow source required');
 assert.equal(count(source,MONTHLY_CURRENT_FETCH),1,'One exact104+fixedH block with unchanged two-minute bound required');
 assert.equal(count(source,MONTHLY_FIXED_H),2,'Only the two explicit fixedH provisioning references are allowed');
 assert.equal(count(source,anchor),1,'One original monthly full-test step required');
 assert.equal(count(source,MONTHLY_CURRENT_FETCH+anchor),1,'Exact104+fixedH provisioning must immediately precede the original monthly test step');
 const historical=source.replace(MONTHLY_CURRENT_FETCH,MONTHLY_HISTORICAL104_FETCH);
 assert.equal(sha(historical),historical104WorkflowSHA,'All unrelated monthly bytes including schedule, permissions, rebuild, reports and PR behavior remain historical');
 assert.equal(sha(historical.replace(MONTHLY_HISTORICAL104_FETCH,'')),'0e09422781bc75e6f11ca4ff52521a43a256fc608152d4a00e1001e5a80a59a4','Original historical104 whole-workflow witness remains exact');
 return historical;
}

export function checkCurrentMonthlyPrerequisiteControls(source){
 const historical=restoreCurrentMonthlyPrerequisites(source); // genuine current positive before any negatives
 assert.equal(historical.includes(MONTHLY_FIXED_H),false);
 const reject=value=>assert.throws(()=>restoreCurrentMonthlyPrerequisites(value));
 reject(historical);
 reject(source.replace(MONTHLY_CURRENT_FETCH,''));
 reject(source.replace(MONTHLY_CURRENT_FETCH,MONTHLY_CURRENT_FETCH+MONTHLY_CURRENT_FETCH));
 reject(source.replace(MONTHLY_CURRENT_FETCH,'')+MONTHLY_CURRENT_FETCH);
 reject(source.replace(MONTHLY_CURRENT_FETCH,MONTHLY_HISTORICAL104_FETCH).replace(anchor,anchor+MONTHLY_H_COMMANDS));
 reject(source.replace(MONTHLY_CURRENT_FETCH,MONTHLY_H_COMMANDS+MONTHLY_HISTORICAL104_FETCH));
 const changes=[
  [MONTHLY_H_COMMANDS,MONTHLY_H_COMMANDS+MONTHLY_H_COMMANDS],
  ["          git cat-file -e '4e9287bd5ebc78aba4b185b017e63eac6547bfd7^{commit}'\n",''],
  [MONTHLY_FIXED_H,'HEAD'],
  ['104b57a6891ddae645c51e39eb3d27b89b64ffdf','HEAD'],
  ['git fetch --no-tags --depth=1 origin 4e9287','git fetch --depth=1 origin 4e9287'],
  ['git fetch --no-tags --depth=1 origin 4e9287','git fetch --no-tags --depth=2 origin 4e9287'],
  ['git fetch --no-tags --depth=1 origin 4e9287','git fetch --unshallow origin 4e9287'],
  ['        timeout-minutes: 2\n','        timeout-minutes: 20\n'],
  ['        shell: bash\n','        shell: sh\n'],
  ['        run: |\n','        if: always()\n        run: |\n'],
  ['        run: |\n','        continue-on-error: true\n        run: |\n'],
  ['          git cat-file -e','          git cat-file -t'],
 ];
 for(const [before,after] of changes){
  assert.ok(MONTHLY_CURRENT_FETCH.includes(before),'Closed mutation must actually change provisioning');
  reject(source.replace(MONTHLY_CURRENT_FETCH,MONTHLY_CURRENT_FETCH.replace(before,after)));
 }
 for(const [before,after] of [
  ["    - cron: '23 5 3 * *'","    - cron: '24 5 3 * *'"],
  ['permissions:\n','permissions: # drift\n'],
  ['  cancel-in-progress: false\n','  cancel-in-progress: true\n'],
  ['          npm test 2>&1','          npm --ignore-scripts test 2>&1'],
  ['    timeout-minutes: 180\n','    timeout-minutes: 181\n'],
  ['          draft=false\n','          draft=true\n'],
 ]){
  assert.ok(source.includes(before),'Closed mutation must actually change original monthly source');
  reject(source.replace(before,after));
 }
 reject(source+'\n# unrelated monthly modification\n');
 reject(source.replace(MONTHLY_CURRENT_FETCH,MONTHLY_CURRENT_FETCH+'          echo unreviewed\n'));
 return Object.freeze({historical104_inverse:true,refusals:26});
}
