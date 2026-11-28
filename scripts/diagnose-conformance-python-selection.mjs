#!/usr/bin/env node
// DIAGNOSTIC ONLY: builtin metadata collector; never imports the conformance gate.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {appendFileSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,realpathSync,writeFileSync} from 'node:fs';
import {basename,delimiter,dirname,isAbsolute,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {performance} from 'node:perf_hooks';
const PHASE=process.argv[2],LANE=process.env.DIAGNOSTIC_LANE;
assert.equal(process.argv.length,3);assert.ok(['prepare','after'].includes(PHASE));assert.ok(['default','setup-absolute'].includes(LANE));assert.equal(process.platform,'win32');
const hash=b=>createHash('sha256').update(b).digest('hex'),plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const PINS={
 'scripts/check-python-partitions.mjs':'4ef5df2648ef909b4270413b9162a802db20d71d8f6e2b34d90f9d336980e2a0',
 'tests/helpers/partitioned-python.mjs':'31b57009d667c0d88dfd73b849f0e9506e39ae9e26ab11b27b01cf0a3f9066f3',
 'scripts/ci-python-partition-driver.py':'e8b89a5aed517be5c1303ca135f9a4964ee58d451444e2e83090a4f363b128f3',
 'tests/six_boundary_history_acceptance.py':'1d360d565fc9f534fe27bca1dee6388f8faad516ff0ae57803aee6a23162aa55',
 'tests/six_operation_scope_controls.py':'e4bc5488f629b6637a0adec4daf719134abe97ca123897f906da0ac8176ab570',
};
const FIXTURE_SHA='497a0a682c563c0152667be174ee6c9959e64a7ee6a3bd478b3ed258c27df4da',PREFIX='pali-python-partition-conformance-',FIXTURE='ci-python-partition-conformance.py';
const ROOT=realpathSync(process.cwd()),TEMP=realpathSync(tmpdir()),RUNNER=realpathSync(process.env.RUNNER_TEMP),OUT=join(RUNNER,'conformance-python-selection');
const regular=(root,name,max=4*1024*1024)=>{assert.ok(typeof name==='string'&&!isAbsolute(name)&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'));let p=root;const parts=name.split('/');for(const[i,part]of parts.entries()){p=join(p,part);const s=lstatSync(p);assert.ok(!s.isSymbolicLink()&&(i===parts.length-1?s.isFile():s.isDirectory()));}const s=lstatSync(p);assert.ok(s.size<=max);const raw=readFileSync(p);assert.ok(raw.length<=max);return raw;};
const roles=Object.entries({WORKSPACE:ROOT,RUNNER_TEMP:RUNNER,TEMP,HOSTED_TOOL_CACHE:process.env.RUNNER_TOOL_CACHE,USERPROFILE:process.env.USERPROFILE,WINDIR:process.env.WINDIR}).filter(([,p])=>typeof p==='string'&&p).sort((a,b)=>b[1].length-a[1].length);
function safePath(p){if(typeof p!=='string')return null;for(const[role,prefix]of roles)if(p.toLowerCase()===prefix.toLowerCase()||p.toLowerCase().startsWith(prefix.toLowerCase()+'\\'))return '%'+role+'%'+p.slice(prefix.length);return {basename:basename(p),path_sha256:hash(p)};}
function exclusive(name,value){const raw=Buffer.from(JSON.stringify(value,null,2)+'\n');assert.ok(raw.length<=1024*1024);writeFileSync(join(OUT,name),raw,{flag:'wx'});}
function sourcePins(){const rows={};for(const[name,pin]of Object.entries(PINS)){const raw=regular(ROOT,name);assert.equal(hash(raw),pin);rows[name]={bytes:raw.length,sha256:pin};}return rows;}
const VERSION="import sys; assert sys.version_info[:2] == (3, 12); print(\"fixture-python\", sys.executable, sys.version.split()[0])";
const IMPORTS="import argparse\nimport json\nimport os\nfrom pathlib import Path\nimport signal\nimport sys\nimport time\nimport unittest\nassert sys.version_info[:2] == (3,12)\nprint(json.dumps({'executable':sys.executable,'version':list(sys.version_info[:3]),'platform':sys.platform,'fixture_import_set_ready':True},separators=(',',':')))";
// Each probe has one10s envelope; kill begins at9s, at most1s remains for direct close.
async function probe(command,deadline,kind='imports'){
 const start=performance.now(),remaining=deadline-start;if(remaining<=100)return {launched:false,reason:'PHASE_DEADLINE'};
 let child,closed=false,exit=null,signal=null,error=null,timed=false,killReturned=null,stdout=[],stderr=[],out=0,err=0,first=null,spawnAt=null,killAt=null;const stdoutHash=createHash('sha256'),stderrHash=createHash('sha256');
 return await new Promise(resolveProbe=>{
  let finished=false,workTimer,hardTimer;const terminate=()=>{killAt=performance.now()-start;try{killReturned=child.kill('SIGKILL');}catch(e){error=typeof e.code==='string'?e.code:'KILL_ERROR';}};
  const done=()=>{if(finished)return;finished=true;clearTimeout(workTimer);clearTimeout(hardTimer);child?.stdout?.destroy();child?.stderr?.destroy();if(!closed)child?.unref();const completedAt=performance.now(),withinEnvelope=completedAt<=deadline,raw=Buffer.concat(stdout);let identity=null;try{const text=raw.toString('utf8');let j;if(kind==='version'){const match=/^fixture-python (.+) (3\.12\.[0-9]+)\r?\n$/.exec(text);assert.ok(match);j={executable:match[1],version:match[2].split('.').map(Number),platform:'win32'};}else{j=JSON.parse(text);assert.deepEqual(Object.keys(j),['executable','version','platform','fixture_import_set_ready']);assert.equal(j.fixture_import_set_ready,true);}assert.ok(typeof j.executable==='string'&&isAbsolute(j.executable)&&!/[\r\n]/.test(j.executable));assert.ok(Array.isArray(j.version)&&j.version.length===3&&j.version[0]===3&&j.version[1]===12&&j.version.every(Number.isInteger));assert.equal(j.platform,'win32');identity=j;}catch{}resolveProbe({launched:true,requested_command:safePath(command),elapsed_ms:completedAt-start,within_original_envelope:withinEnvelope,spawn_event_ms:spawnAt,first_bytes_ms:first,exit,signal,error,timed_out:timed,direct_kill_returned:killReturned,direct_close_observed:closed,stdout_bytes:out,stdout_sha256:stdoutHash.digest('hex'),stderr_bytes:err,stderr_sha256:stderrHash.digest('hex'),kill_requested_ms:killAt,phase_envelope_ms:remaining,identity,verified:withinEnvelope&&closed&&!timed&&error===null&&exit===0&&signal===null&&err===0&&identity!==null,cleanup_scope:'owned direct ChildProcess only; no descendant claim'});};
  try{child=spawn(command,['-c',kind==='version'?VERSION:IMPORTS],{cwd:ROOT,env:process.env,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});}catch(e){error=typeof e.code==='string'?e.code:'SPAWN_THROW';done();return;}
  child.once('spawn',()=>{spawnAt=performance.now()-start;});child.once('error',e=>{error=typeof e.code==='string'?e.code:'PROCESS_ERROR';});
  for(const[stream,chunks,isOut]of [[child.stdout,stdout,true],[child.stderr,stderr,false]])stream.on('data',chunk=>{if(first===null)first=performance.now()-start;if(isOut){out+=chunk.length;stdoutHash.update(chunk);}else{err+=chunk.length;stderrHash.update(chunk);}if(out+err<=8192)chunks.push(chunk);else{error='PROBE_OUTPUT_BOUND';terminate();}});
  child.once('close',(code,sig)=>{closed=true;exit=code;signal=sig;done();});
  workTimer=setTimeout(()=>{timed=true;terminate();},Math.max(1,deadline-performance.now()-1000));
  hardTimer=setTimeout(()=>{timed=true;terminate();done();},Math.max(1,deadline-performance.now()));
 });
}
function publicProbe(p){const q={...p};if(q.identity)q.identity={...q.identity,executable:safePath(q.identity.executable)};return q;}
function tempNames(){return readdirSync(TEMP).filter(n=>new RegExp('^'+PREFIX+'[A-Za-z0-9]{6}$').test(n)).sort();}
function pathResolution(){const found=[];const dirs=(process.env.PATH??'').split(delimiter);for(let i=0;i<Math.min(dirs.length,256);i++)for(const ext of ['.exe','.com','.cmd','.bat']){const p=join(dirs[i],'python3'+ext);try{const s=lstatSync(p);if(s.isFile()&&!s.isSymbolicLink())found.push({path_order:i,path:safePath(realpathSync(p)),bytes:s.size,extension:ext});}catch{}}return {PATH_sha256:hash(process.env.PATH??''),PATH_entry_count:dirs.length,candidates:found.slice(0,32),candidate_count:found.length,not_Node_resolution_proof:true};}
function marker(raw,name,plans,cases){
 const j=JSON.parse(raw.toString('utf8'));assert.ok(plain(j));const part=name.includes('remaining')?'remaining':'heavy';
 if(!name.includes('-finished')){assert.deepEqual(Object.keys(j),['pid','part','case','platform']);assert.ok(Number.isSafeInteger(j.pid)&&j.pid>0);assert.equal(j.part,part);assert.ok(cases.includes(j.case));assert.equal(j.platform,'win32');return j;}
 assert.deepEqual(Object.keys(j),['pid','cleanup_done','tests_run','started_ids','stopped_ids','terminal_results']);assert.ok(Number.isSafeInteger(j.pid)&&j.pid>0);assert.equal(j.cleanup_done,true);assert.ok(Number.isSafeInteger(j.tests_run)&&j.tests_run>=0&&j.tests_run<=7);
 const ids=Object.values(plans).flatMap(p=>p.methods.map(n=>p.module_name+'.'+p.class_name+'.'+n));
 for(const rows of [j.started_ids,j.stopped_ids])assert.ok(Array.isArray(rows)&&rows.length<=7&&rows.every(id=>ids.includes(id)));
 assert.ok(Array.isArray(j.terminal_results)&&j.terminal_results.length<=14);for(const row of j.terminal_results){assert.deepEqual(Object.keys(row),['test_id','outcome']);assert.ok(ids.includes(row.test_id)&&['success','failure','error','skip','expected_failure','unexpected_success','subtest_failure'].includes(row.outcome));}return j;
}
function retainedMetadata(report,state,gateSource){
 const roots=report?.failure?.retained_owned_roots??[];assert.ok(Array.isArray(roots)&&roots.length<=4);
 const plans=JSON.parse(/^const PLANS=(\{[^\n]+\});$/m.exec(gateSource)[1]),cases=JSON.parse(/^const CASES=(\[[^\n]+\]);$/m.exec(gateSource)[1]);
 return roots.map(root=>{const row={root_basename:basename(root),ownership_validated:false,markers:[]};try{assert.ok(typeof root==='string'&&isAbsolute(root)&&dirname(root)===TEMP);assert.match(basename(root),/^pali-python-partition-conformance-[A-Za-z0-9]{6}$/);assert.ok(!state.temp_before.includes(basename(root)));const s=lstatSync(root);assert.ok(s.isDirectory()&&!s.isSymbolicLink());assert.equal(realpathSync(root),root);assert.equal(hash(regular(root,FIXTURE,16384)),FIXTURE_SHA);row.ownership_validated=true;for(const name of ['ci-fixture-heavy.json','ci-fixture-remaining.json','ci-fixture-heavy-finished.json','ci-fixture-remaining-finished.json','ci-fixture-heavy.json.tmp','ci-fixture-remaining.json.tmp','ci-fixture-heavy-finished.json.tmp','ci-fixture-remaining-finished.json.tmp']){const p=join(root,name);if(!existsSync(p)){row.markers.push({name,present:false});continue;}try{const raw=regular(root,name,65536),s=lstatSync(p),m={name,present:true,bytes:raw.length,sha256:hash(raw),regular:true,mtime_ms:s.mtimeMs};try{m.value=marker(raw,name,plans,cases);}catch{m.value_refused='INVALID_OR_PARTIAL_FIXED_MARKER_JSON';}row.markers.push(m);}catch{row.markers.push({name,present:true,refused:'NONREGULAR_OR_OVERSIZED'});}}}catch{row.refused='NOT_NEW_OWNED_PHYSICAL_GATE_ROOT_WITH_EXACT_FIXTURE';}return row;});
}
async function main(){
 assert.equal(Number(process.versions.node.split('.')[0]),22);const pins=sourcePins();
 if(PHASE==='prepare'){
  assert.ok(isAbsolute(process.env.SETUP_PYTHON_PATH)&&!/[\r\n]/.test(process.env.SETUP_PYTHON_PATH));assert.ok(!process.env.PYTHON,'Both lanes begin without PYTHON override');
  mkdirSync(OUT);const preparedAt=Date.now(),deadline=performance.now()+10000;
  // Exactly the existing ordinary python3 version program, once in BOTH lanes; no new pre-gate import probe.
  const named=await probe('python3',deadline,'version');
  exclusive('version-probe.json',publicProbe(named));
  assert.ok(named.verified,'Existing Python3.12 version probe must close within10s before gate');assert.equal(dirname(realpathSync(named.identity.executable)),dirname(realpathSync(process.env.SETUP_PYTHON_PATH)),'Verified executable belongs to setup-python directory');
  const selected=LANE==='setup-absolute'?named.identity.executable:null,state={schema:'conformance-python-selection-state-v1',lane:LANE,prepared_at_ms:preparedAt,temp:TEMP,temp_before:tempNames(),selected_executable:selected,setup_executable:named.identity.executable,pins};
  exclusive('state.json',state);exclusive('prepare.json',{schema:'conformance-python-selection-prepare-v1',lane:LANE,python3:publicProbe(named),selected:LANE==='default'?'PYTHON absent; engine fallback python3':safePath(selected),same_original_one_version_probe_both_lanes:true,no_extra_pre_gate_python_invocation_or_unittest_import:true,pins});
  assert.ok(!selected||!/[\r\n]/.test(selected));appendFileSync(process.env.GITHUB_OUTPUT,'python_command='+(selected??'')+'\n');console.log('CONFORMANCE_PYTHON_DIAGNOSTIC:'+JSON.stringify({phase:'prepare',lane:LANE,status:'PASS',selected:LANE==='default'?'python3':safePath(selected)}));
 }else{
  assert.ok(lstatSync(OUT).isDirectory()&&!lstatSync(OUT).isSymbolicLink());const state=JSON.parse(regular(OUT,'state.json',65536));assert.equal(state.lane,LANE);assert.equal(state.temp,TEMP);assert.deepEqual(state.pins,pins);
  let report=null,gateExit=null;const metadata={schema:'conformance-python-selection-after-v1',lane:LANE,node:process.version,platform:process.platform,source_pins:pins,diagnostic_only:true,conformance_gate_unmodified:true};
  try{if(existsSync(join(OUT,'gate.log'))){const raw=regular(OUT,'gate.log',4*1024*1024);metadata.gate_log={bytes:raw.length,sha256:hash(raw)};const lines=raw.toString('utf8').split(/\r?\n/).filter(x=>x.startsWith('PYTHON_PARTITIONS_CONFORMANCE:'));assert.equal(lines.length,1);report=JSON.parse(lines[0].slice('PYTHON_PARTITIONS_CONFORMANCE:'.length));metadata.gate={status:['PASS','FAIL'].includes(report.status)?report.status:'UNRECOGNIZED',seconds:report.seconds,runtime_completed:Array.isArray(report.results)?report.results.length:null,prelaunch_completed:Array.isArray(report.preflight)?report.preflight.length:null,fixture_sha256:report.fixture_sha256,case:report.failure?.case_context?{suite:report.failure.case_context.suite,case:report.failure.case_context.case,stage:report.failure.case_context.stage}:null};metadata.retained_roots=retainedMetadata(report,state,regular(ROOT,'scripts/check-python-partitions.mjs').toString('utf8'));}}catch{metadata.gate_report_refused='MISSING_TRUNCATED_OR_INVALID_SINGLE_GATE_JSON';}
  if(existsSync(join(OUT,'gate-exit.json'))){gateExit=JSON.parse(regular(OUT,'gate-exit.json',1024));assert.ok(Number.isInteger(gateExit.exit_code));metadata.gate_exit_code=gateExit.exit_code;}
  const setup=await probe(state.setup_executable,performance.now()+10000),named=await probe('python3',performance.now()+10000);metadata.post_gate_setup=publicProbe(setup);metadata.post_gate_python3=publicProbe(named);metadata.path_resolution=pathResolution();metadata.interpretation_limits=['Fresh hosted lanes are separate machines; neither path nor host-variability causality established by one comparison.','Both lanes preserve the same single ordinary python3 version program before gate; no extra pre-gate Python/import warming.','Gate unchanged120s/108controls/3000mschildren/4750mscleanup; production60000/65000ms unchanged.','Fixture markers begin only after Python imports/argparse; missing markers do not distinguish process startup, imports or first-file IO.','Post-gate probe spawn/first-byte/close timings are probes, not retroactive timing of gate children.','No process tree, app corpus/runtime, release or native-required75 acceptance claim.'];exclusive('after.json',metadata);console.log('CONFORMANCE_PYTHON_DIAGNOSTIC:'+JSON.stringify({phase:'after',lane:LANE,gate_status:metadata.gate?.status??'NOT_OBSERVED',gate_exit:gateExit?.exit_code??null,post_probes_verified:setup.verified&&named.verified}));assert.ok(setup.verified&&named.verified,'Post-gate probes failed; retain diagnostic failure');
 }
}
try{await main();}catch(error){console.error('CONFORMANCE_PYTHON_DIAGNOSTIC:'+JSON.stringify({phase:PHASE,lane:LANE,status:'COLLECTOR_FAIL',code:typeof error.code==='string'?error.code:'DIAGNOSTIC_ASSERTION_OR_JSON',no_private_message_or_stack:true}));process.exitCode=1;}
