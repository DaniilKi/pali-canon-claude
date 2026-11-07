// Summarize Actions step outcomes without issue/comment writes or network access.
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function sourceDiagnosticsReport({expectedSha, actualSha, sourceTree, outcomes, observedAt = new Date().toISOString()}) {
  for (const [name,value] of Object.entries({expectedSha,actualSha,sourceTree})) if (!/^[a-f0-9]{40}$/.test(value || '')) throw Error(`Invalid ${name}: a full Git SHA is required.`);
  if (expectedSha !== actualSha) throw Error('Diagnostic checkout differs from the requested exact commit.');
  const commands = {smoke:'npm run smoke -- --live',outage:'npm run outage',linkcheck:'node scripts/linkcheck.mjs'};
  const known = new Set(['success','failure','cancelled','skipped','timed_out']);
  const checks = Object.entries(commands).map(([id,command]) => ({id,command,outcome:known.has(outcomes?.[id])?outcomes[id]:'unavailable',log:`${id}.log`}));
  return {schema:'pali-source-diagnostics-v1',head_sha:actualSha,source_data_tree:sourceTree,observed_at:observedAt,
    status:checks.every(check=>check.outcome==='success')?'passed':checks.some(check=>check.outcome==='failure')?'failed':'incomplete',
    checks,link_scope:{mode:'rotating daily sample',limit:250,delay_ms:1000},issue_writes:false,
    scope:'Point-in-time live smoke, source outage/mirror behavior and a rotating link sample; not all links, content alignment, signed-in clients or source permission approval.'};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const expectedSha=process.env.PALI_DIAGNOSTIC_EXPECTED_SHA;
  const actualSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const sourceTree=execFileSync('git',['rev-parse','HEAD:server/data'],{encoding:'utf8'}).trim();
  const report=sourceDiagnosticsReport({expectedSha,actualSha,sourceTree,outcomes:{smoke:process.env.SMOKE_OUTCOME,outage:process.env.OUTAGE_OUTCOME,linkcheck:process.env.LINKCHECK_OUTCOME}});
  await writeFile('source-diagnostics.report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  if (report.status!=='passed') process.exitCode=1;
}
