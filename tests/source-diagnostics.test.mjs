import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceDiagnosticsReport} from '../scripts/source-diagnostics-report.mjs';
const sha='a'.repeat(40), tree='b'.repeat(40);
const base={expectedSha:sha,actualSha:sha,sourceTree:tree,observedAt:'2026-11-07T12:00:00.000Z'};
test('all three explicit outcomes are required for a passing exact-head diagnostic',()=>{
 const r=sourceDiagnosticsReport({...base,outcomes:{smoke:'success',outage:'success',linkcheck:'success'}});
 assert.equal(r.status,'passed');assert.equal(r.head_sha,sha);assert.equal(r.source_data_tree,tree);assert.equal(r.issue_writes,false);
 assert.equal(r.checks.length,3);assert.equal(r.link_scope.limit,250);assert.match(r.scope,/not all links/);
 for(const id of ['smoke','outage','linkcheck']){
  for(const outcome of ['failure','skipped','cancelled','timed_out',undefined,'unknown']){
   const outcomes={smoke:'success',outage:'success',linkcheck:'success',[id]:outcome};
   const failed=sourceDiagnosticsReport({...base,outcomes});assert.notEqual(failed.status,'passed');
   assert.equal(failed.checks.find(c=>c.id===id).outcome,outcome===undefined||outcome==='unknown'?'unavailable':outcome);
  }
 }
});
test('missing and mismatched commit identity cannot be reported as current source health',()=>{
 const outcomes={smoke:'success',outage:'success',linkcheck:'success'};
 for(const bad of [{expectedSha:'main'},{actualSha:'c'.repeat(40)},{sourceTree:undefined},{expectedSha:'a'.repeat(39)}])assert.throws(()=>sourceDiagnosticsReport({...base,...bad,outcomes}),/Invalid|differs/);
 assert.equal(sourceDiagnosticsReport({...base}).status,'incomplete');
});
test('the diagnostic workflow isolates exact-head read-only checks from public issue reporting',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/source-diagnostics.yml',import.meta.url),'utf8');
 assert.match(workflow,/permissions:\n  contents: read\n/);assert.doesNotMatch(workflow,/issues:\s*write|gh api|secrets\.|pull_request_target|schedule:/);
 assert.match(workflow,/\.github\/source-diagnostics-request\.json/);
 assert.match(workflow,/persist-credentials: false/);assert.match(workflow,/ref: \$\{\{ github.sha \}\}/);
 assert.match(workflow,/test "\$\(git rev-parse HEAD\)" = "\$PALI_DIAGNOSTIC_EXPECTED_SHA"/);
 assert.match(workflow,/paths:\n\s+- '\.github\/workflows\/source-diagnostics.yml'/);
 for(const id of ['smoke','outage','linkcheck']){
  assert.match(workflow,new RegExp(`id: ${id}\\n\\s+continue-on-error: true`));
  assert.match(workflow,new RegExp(`steps\\.${id}\\.outcome`));
 }
 assert.equal((workflow.match(/set -o pipefail/g)||[]).length,3);assert.match(workflow,/if: always\(\)/);
 assert.match(workflow,/run: node scripts\/source-diagnostics-report.mjs/);
});
