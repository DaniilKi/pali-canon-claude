// Diagnostic only: unchanged 33+7+7 controls, same-host ABBA, no release acceptance.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,openSync,closeSync,mkdirSync,readdirSync,realpathSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
let outputForError=null,activePhase='preflight';
async function main(){
const options={};
for(let i=2;i<process.argv.length;i+=2){assert.match(process.argv[i],/^--[a-z-]+$/);assert.ok(!options[process.argv[i]]);assert.ok(process.argv[i+1]);options[process.argv[i]]=process.argv[i+1];}
assert.deepEqual(Object.keys(options).sort(),['--baseline','--candidate','--expected-candidate','--output']);
assert.equal(process.platform,'win32','This probe requires native hosted Windows');
assert.equal(Number(process.versions.node.split('.')[0]),20);
const baseline=realpathSync(options['--baseline']),candidate=realpathSync(options['--candidate']),output=resolve(options['--output']);
assert.equal(output,resolve(process.env.RUNNER_TEMP,'fixture-cost'),'Owned job temp output required');
outputForError=output;
assert.notEqual(baseline,candidate);mkdirSync(output,{recursive:true});
const baselineCommit='1e1c7b13ba4f02ede75e87fca66032e6e8966f8a',candidateCommit=options['--expected-candidate'];
assert.match(candidateCommit,/^[a-f0-9]{40}$/);
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:10000}).trim();
const probeRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const assertPhysicalClean=()=>{for(const root of [baseline,candidate,probeRoot])git(root,['diff','--quiet','HEAD','--']);};
assertPhysicalClean();
const probeHead=git(probeRoot,['rev-parse','HEAD']);assert.equal(probeHead,process.env.GITHUB_SHA);
assert.match(process.env.GITHUB_RUN_ID??'',/^[1-9][0-9]*$/);assert.match(process.env.GITHUB_RUN_ATTEMPT??'',/^[1-9][0-9]*$/);
assert.equal(git(baseline,['rev-parse','HEAD']),baselineCommit);assert.equal(git(candidate,['rev-parse','HEAD']),candidateCommit);
const sha=b=>createHash('sha256').update(b).digest('hex');
const appNames=['src','web','server','package.json','package-lock.json'];
const appTrees=Object.fromEntries(appNames.map(name=>{const a=git(baseline,['rev-parse','HEAD:'+name]);assert.equal(git(candidate,['rev-parse','HEAD:'+name]),a);return[name,a];}));
for(const name of ['README.md','LICENSE','THIRD_PARTY.md','PRIVACY.md'])assert.deepEqual(readFileSync(resolve(candidate,name)),readFileSync(resolve(baseline,name)),name+' changed');
const oldFiles=readdirSync(resolve(baseline,'tests')).filter(n=>n.endsWith('.test.mjs')).sort();
assert.equal(oldFiles.length,340);assert.deepEqual(readdirSync(resolve(candidate,'tests')).filter(n=>n.endsWith('.test.mjs')).sort(),oldFiles);
for(const file of ['scripts/test.mjs',...oldFiles.map(n=>'tests/'+n)])assert.deepEqual(readFileSync(resolve(candidate,file)),readFileSync(resolve(baseline,file)),file+' changed');
const files=['tests/approved-acceptance.test.mjs','tests/six-operation-scope.test.mjs','tests/six-boundary-history.test.mjs'];
const wrapperHashes=Object.fromEntries(files.map(p=>[p,sha(readFileSync(resolve(baseline,p)))]));
const python=JSON.parse(execFileSync('python3',['-c','import json,sys; assert sys.version_info[:2] == (3,12); print(json.dumps({"executable":sys.executable,"version":sys.version}))'],{encoding:'utf8',timeout:10000}));
const probeIdentity={commit:probeHead,controller_sha256:sha(readFileSync(fileURLToPath(import.meta.url))),run_id:process.env.GITHUB_RUN_ID,run_attempt:process.env.GITHUB_RUN_ATTEMPT};
const results=[];
for(const [phase,label,root]of [['A1','baseline',baseline],['B1','candidate',candidate],['B2','candidate',candidate],['A2','baseline',baseline]]){
 activePhase=phase;assertPhysicalClean();
 const path=resolve(output,phase+'.tap'),fd=openSync(path,'wx'),started=Date.now();let timedOut=false,cleanupError=null,spawnError=null;
 const env={...process.env,CI:'true'};delete env.NODE_TEST_CONTEXT;
 const childArgv=['--test','--test-concurrency=1','--test-reporter=tap',...files];
 const child=spawn(process.execPath,childArgv,{cwd:root,env,stdio:['ignore',fd,fd],windowsHide:true});
 const timer=setTimeout(()=>{timedOut=true;try{execFileSync('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{timeout:5000,stdio:'ignore'});}catch(e){cleanupError=e.code??'TASKKILL_FAILED';child.kill('SIGKILL');}},180000);
 child.once('error',e=>{spawnError=e.code??'SPAWN_ERROR';});
 const terminal=await new Promise(done=>child.once('close',(exit_code,signal)=>done({exit_code,signal})));
 clearTimeout(timer);closeSync(fd);assertPhysicalClean();
 const tap=readFileSync(path,'utf8'),summary={};for(const match of tap.matchAll(/^# (tests|suites|pass|fail|cancelled|skipped|todo|duration_ms) ([0-9.]+)$/gm))summary[match[1]]=Number(match[2]);
 const approved=[];for(const match of tap.matchAll(/^# \[approved-acceptance-subprocess\] (.+)$/gm))approved.push(JSON.parse(match[1]));
 const cases=[];let name=null;for(const line of tap.split(/\r?\n/)){if(line.startsWith('# Subtest: '))name=line.slice(11);const m=/^  duration_ms: ([0-9.]+)$/.exec(line);if(m&&name){cases.push({name,duration_ms:Number(m[1])});name=null;}}
 const complete=terminal.exit_code===0&&terminal.signal===null&&!timedOut&&!spawnError&&!cleanupError&&summary.tests===3&&summary.pass===3&&summary.fail===0&&summary.skipped===0&&summary.cancelled===0&&summary.todo===0;
 const row={phase,label,cwd:root,child_argv:[process.execPath,...childArgv],...terminal,spawn_error:spawnError,timed_out:timedOut,cleanup_error:cleanupError,outer_bound_ms:180000,elapsed_ms:Date.now()-started,summary,approved_acceptance_child:approved,cases,tap_sha256:sha(readFileSync(path)),all_three_original_wrappers_passed:complete,underlying_python_cases_if_complete:complete?47:null};
 results.push(row);writeFileSync(resolve(output,phase+'.json'),JSON.stringify(row,null,2)+'\n');console.log(JSON.stringify(row));
}
const bothCandidatesPass=results.filter(r=>r.label==='candidate').length===2&&results.filter(r=>r.label==='candidate').every(r=>r.all_three_original_wrappers_passed);
const allBaselinesPass=results.filter(r=>r.label==='baseline').every(r=>r.all_three_original_wrappers_passed);
const allPhaseProcessBoundsVerified=results.every(r=>!r.timed_out&&!r.cleanup_error&&!r.spawn_error&&r.signal===null);
const mean=label=>results.filter(r=>r.label===label).reduce((a,r)=>a+r.elapsed_ms,0)/2;
activePhase='report';assertPhysicalClean();
const report={schema:'native-windows-fixture-cost-abba-diagnostic-v1',probe_identity:probeIdentity,baseline_commit:baselineCommit,candidate_commit:candidateCommit,node:process.version,platform:process.platform,python,app_git_objects_identical:appTrees,all340_JS_test_files_and_public_driver_identical:true,wrapper_hashes:wrapperHashes,unchanged_child_bounds_ms:[30000,60000,60000],phase_bound_ms:180000,results,candidate_both_phases_passed:bothCandidatesPass,baseline_both_phases_passed:allBaselinesPass,all_phase_process_bounds_verified:allPhaseProcessBoundsVerified,phase_speed_comparison_if_all_complete:bothCandidatesPass&&allBaselinesPass?{baseline_mean_ms:mean('baseline'),candidate_mean_ms:mean('candidate'),fraction_saved:1-mean('candidate')/mean('baseline')}:null,scope:'Diagnostic only. Baseline failures remain failures in results. Candidate failure makes this job fail. This cannot replace required full source/installed/browser/OS CI or justify dev promotion.',release_acceptance:false};
writeFileSync(resolve(output,'REPORT.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({candidate_both_phases_passed:bothCandidatesPass,baseline_both_phases_passed:allBaselinesPass,release_acceptance:false}));process.exitCode=bothCandidatesPass&&allPhaseProcessBoundsVerified?0:1;

}
main().catch(error=>{
 const code=typeof error.code==='string'&&/^[A-Z0-9_]+$/.test(error.code)?error.code:'CHECK_FAILED';
 const report={schema:'native-fixture-probe-sanitized-error-v1',stage:activePhase,error_name:error.name,error_code:code,status:Number.isInteger(error.status)?error.status:null,release_acceptance:false};
 try{
  const output=outputForError??(process.platform==='win32'&&process.env.RUNNER_TEMP?resolve(process.env.RUNNER_TEMP,'fixture-cost'):null);
  if(output){mkdirSync(output,{recursive:true});writeFileSync(resolve(output,'ERROR.json'),JSON.stringify(report,null,2)+'\n');}
 }catch{report.error_artifact_write_failed=true;}
 console.error(JSON.stringify(report));process.exitCode=1;
});
