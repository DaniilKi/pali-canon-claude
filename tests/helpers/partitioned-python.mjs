// Windows wrappers call this explicitly. No platform or environment mode switch.
import {spawn, ChildProcess} from 'node:child_process';
import {lstatSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isAbsolute, join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {StringDecoder} from 'node:string_decoder';

const SCHEMA='ci-python-partition-record-v1';
const PREFIX='PARTITION_JSON:';
const DRIVER='scripts/ci-python-partition-driver.py';
const DRIVER_SHA='e8b89a5aed517be5c1303ca135f9a4964ee58d451444e2e83090a4f363b128f3';
const SUITES=deepFreeze({
  "six-history": {
    "script": "tests/six_boundary_history_acceptance.py",
    "class_name": "SixHistoryControls",
    "source_sha256": "1d360d565fc9f534fe27bca1dee6388f8faad516ff0ae57803aee6a23162aa55",
    "full_inventory": [
      "test_01_exact_positive_and_explicit_historical_logical_frame",
      "test_02_cached_positive_does_not_hide_any_current_data_mutation",
      "test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering",
      "test_04_original_C1_bytes_cannot_replace_actual_future_data",
      "test_05_C1_fixture_tampering_and_symlink_refuse_after_positive",
      "test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them",
      "test_07_runtime_parent_and_full343_objects_are_mandatory"
    ],
    "old_per_stream_output_cap_bytes": 1048576,
    "module_name": "ci_partition_six_history",
    "partitions": {
      "heavy": [
        "test_02_cached_positive_does_not_hide_any_current_data_mutation"
      ],
      "remaining": [
        "test_01_exact_positive_and_explicit_historical_logical_frame",
        "test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering",
        "test_04_original_C1_bytes_cannot_replace_actual_future_data",
        "test_05_C1_fixture_tampering_and_symlink_refuse_after_positive",
        "test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them",
        "test_07_runtime_parent_and_full343_objects_are_mandatory"
      ]
    }
  },
  "six-operation-scope": {
    "script": "tests/six_operation_scope_controls.py",
    "class_name": "SixOperationScopeControls",
    "source_sha256": "e4bc5488f629b6637a0adec4daf719134abe97ca123897f906da0ac8176ab570",
    "full_inventory": [
      "test_01_verified_immutable_original_bytes_within_one_operation",
      "test_02_public_gates_reject_active_and_closed_internal_scopes",
      "test_03_exception_closes_and_prevents_escaped_reuse",
      "test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime",
      "test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation",
      "test_06_every_original_fixture_is_verified_before_operation_use",
      "test_07_mutation_after_capture_never_survives_the_next_operation"
    ],
    "old_per_stream_output_cap_bytes": 262144,
    "module_name": "ci_partition_six_operation_scope",
    "partitions": {
      "heavy": [
        "test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime"
      ],
      "remaining": [
        "test_01_verified_immutable_original_bytes_within_one_operation",
        "test_02_public_gates_reject_active_and_closed_internal_scopes",
        "test_03_exception_closes_and_prevents_escaped_reuse",
        "test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation",
        "test_06_every_original_fixture_is_verified_before_operation_use",
        "test_07_mutation_after_capture_never_survives_the_next_operation"
      ]
    }
  }
});
function deepFreeze(value){for(const item of Object.values(value))if(item&&typeof item==='object')deepFreeze(item);return Object.freeze(value);}
const COMMON=['schema','event','suite','part','pid','sequence'];
const SUMMARY=['tests_run','started_ids','stopped_ids','terminal_results','failures','errors','skipped','expected_failures','unexpected_successes','was_successful','runner_returned'];
const EVENTS={phase:['phase'],discovery:['script','script_sha256','class_name','module_name','full_inventory','selected_ids','python_version','platform'],test_start:['test_id'],test_terminal:['test_id','outcome'],test_stop:['test_id'],summary:SUMMARY};
const OUTCOMES=new Set(['success','failure','error','skip','expected_failure','unexpected_success','subtest_failure']);
const CONFORMANCE_FILE='ci-python-partition-conformance.py';
const CONFORMANCE_SHA='497a0a682c563c0152667be174ee6c9959e64a7ee6a3bd478b3ed258c27df4da';
const CONFORMANCE_CASES=Object.freeze(["success","success-crlf","success-subtests","discovery-missing","discovery-extra","selected-missing","selected-duplicate","wrong-script","wrong-sha","wrong-class","wrong-module","wrong-pid","wrong-schema","wrong-sequence","unknown-event","missing-terminal","duplicate-terminal","wrong-terminal","invalid-outcome","missing-stop","early-summary","failure","subtest-failure","setup-error","cleanup-error","skip","expected-failure","unexpected-success","nonzero","signal","early-exit","malformed-json","unframed","truncated","stdout-overflow","stderr-overflow","child-timeout","peer-failure","parent-abort","spawn-error","cleanup-tool-failure"]);
const hash=raw=>createHash('sha256').update(raw).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const integer=value=>Number.isSafeInteger(value)&&value>=0;

function exact(value,fields,label){
 if(!value||typeof value!=='object'||Array.isArray(value)||!equal(Object.keys(value),fields))throw new Error(`Invalid ${label} fields/order`);
}
function options(value,fields){exact(value,fields,'controller options');}
function planFor(key){
 if(typeof key!=='string'||!Object.hasOwn(SUITES,key))throw new Error('Unknown closed Python suite');
 return SUITES[key];
}
function physicalFile(root,relative){
 if(typeof root!=='string'||!isAbsolute(root))throw new Error('Absolute owned root required');
 if(lstatSync(root).isSymbolicLink()||!lstatSync(root).isDirectory())throw new Error('Physical directory root required');
 let path=root;
 for(const part of relative.split('/')){
  if(!part||part==='.'||part==='..')throw new Error('Fixed relative file required');
  path=join(path,part);
  if(lstatSync(path).isSymbolicLink())throw new Error('Controller refuses symlink input');
 }
 if(!lstatSync(path).isFile())throw new Error('Regular controller input required');
 return path;
}
function absentFile(root,name){
 const path=join(root,name);
 try{lstatSync(path);}catch(error){if(error.code==='ENOENT')return path;throw error;}
 throw new Error('Fixed conformance missing-file target already exists');
}
function expectedIds(plan,part){return plan.partitions[part].map(name=>`${plan.module_name}.${plan.class_name}.${name}`);}

function parser(plan,suite,part,pid){
 const ids=expectedIds(plan,part);
 const state={sequence:0,phase:null,discovery:null,started:[],stopped:[],terminals:[],summary:null,records:0};
 function take(line){
  if(line.length>65536||!line.startsWith(PREFIX))throw new Error('Unknown/oversized partition stdout record');
  const text=line.slice(PREFIX.length);
  const row=JSON.parse(text);
  // Compact canonical form also rejects duplicate JSON keys and lost escapes.
  if(JSON.stringify(row)!==text)throw new Error('Noncanonical/duplicate partition JSON');
  if(!Object.hasOwn(EVENTS,row?.event))throw new Error('Unknown partition event');
  exact(row,[...COMMON,...EVENTS[row.event]],'partition record');
  if(row.schema!==SCHEMA||row.suite!==suite||row.part!==part||row.pid!==pid||!integer(row.sequence)||row.sequence!==state.sequence++)throw new Error('Foreign/duplicate partition record identity');
  if(++state.records>128||state.summary)throw new Error('Extra partition records');
  if(row.event==='phase'){
   const next=state.phase===null?'import':state.phase==='import'?'discovery':state.phase==='discovery'&&state.discovery?'runner_start':state.phase==='runner_start'?'runner_returned':null;
   if(row.phase!==next)throw new Error('Partition phase order changed');
   if(row.phase==='runner_returned'&&(!equal(state.started,ids)||!equal(state.stopped,ids)))throw new Error('Incomplete actual unittest execution');
   state.phase=row.phase;
  }else if(row.event==='discovery'){
   if(state.phase!=='discovery'||state.discovery)throw new Error('Duplicate/misordered discovery');
   if(row.script!==plan.script||row.script_sha256!==plan.source_sha256||row.class_name!==plan.class_name||row.module_name!==plan.module_name||!equal(row.full_inventory,plan.full_inventory)||!equal(row.selected_ids,ids))throw new Error('Complete/selected unittest inventory drift');
   if(!Array.isArray(row.python_version)||row.python_version.length!==3||!row.python_version.every(integer)||row.python_version[0]!==3||row.python_version[1]!==12||row.platform!==process.platform)throw new Error('Actual Python/platform metadata mismatch');
   state.discovery=row;
  }else if(row.event==='summary'){
   if(state.phase!=='runner_returned')throw new Error('Summary before actual runner/cleanup return');
   if(!integer(row.tests_run)||row.tests_run!==ids.length||!equal(row.started_ids,state.started)||!equal(row.stopped_ids,state.stopped)||!equal(row.terminal_results,state.terminals))throw new Error('Summary/actual terminal execution mismatch');
   for(const name of ['failures','errors','skipped','expected_failures','unexpected_successes'])if(!integer(row[name])||row[name]!==0)throw new Error(`Unsuccessful unittest result: ${name}`);
   if(row.was_successful!==true||row.runner_returned!==true||!equal(state.terminals,ids.map(test_id=>({test_id,outcome:'success'}))))throw new Error('Non-successful actual method outcomes');
   state.summary=row;
  }else{
   if(state.phase!=='runner_start'||typeof row.test_id!=='string'||!ids.includes(row.test_id))throw new Error('Foreign method/fixture error callback');
   if(row.event==='test_start'){
    if(state.started.length!==state.stopped.length||row.test_id!==ids[state.started.length])throw new Error('Duplicate/misordered test start');
    state.started.push(row.test_id);
   }else if(row.event==='test_terminal'){
    if(!OUTCOMES.has(row.outcome)||state.started.at(-1)!==row.test_id||state.stopped.length!==state.started.length-1||state.terminals.some(x=>x.test_id===row.test_id))throw new Error('Duplicate/foreign method terminal');
    state.terminals.push({test_id:row.test_id,outcome:row.outcome});
   }else{
    if(state.started.at(-1)!==row.test_id||state.stopped.length!==state.started.length-1||state.terminals.at(-1)?.test_id!==row.test_id)throw new Error('Missing/misordered terminal or stop');
    state.stopped.push(row.test_id);
   }
  }
 }
 return {state,take,finish(){
  if(!state.summary||!state.discovery||!equal(state.started,ids)||!equal(state.stopped,ids))throw new Error('Missing final partition receipt');
 }};
}

function ownedProcess(child){return child.process instanceof ChildProcess&&child.process===child.ownedProcess&&child.pid===child.process.pid&&Number.isSafeInteger(child.pid)&&child.pid>0;}
function live(child){return ownedProcess(child)&&!child.closed&&child.process.exitCode===null&&child.process.signalCode===null;}
function groupAbsent(pid){
 try{process.kill(-pid,0);return false;}catch(error){return error.code==='ESRCH';}
}

async function engine({root,suiteKey,signal,commands,childMs,globalMs,production,startedAt,syntheticCleanupFailure=false}){
 const plan=planFor(suiteKey);
 if(!(signal instanceof AbortSignal)||typeof signal.aborted!=='boolean')throw new Error('Actual AbortSignal required');
 const start=startedAt;
 // Reserve 250ms INSIDE the unchanged outer cap to surface a bounded failure.
 const deadline=start+globalMs-250;
 let reason=null,done=false,cleanupStarted=false,globalTimer;
 const children=[];
 const tools=new Set();
 let finishResolve;
 const finished=new Promise(resolve=>{finishResolve=resolve;});
 const remaining=()=>Math.max(0,Math.floor(deadline-performance.now()));
 function fail(error){
  if(!reason)reason=error instanceof Error?error:new Error(String(error));
  cleanup();
 }
 function maybeDone(){
  if(done)return;
  if(children.length===2&&children.every(c=>c.closed)&&tools.size===0){done=true;finishResolve();}
 }
 function directFallback(child,code){
  // Own process HANDLE only; no delayed PID lookup or new cleanup grace.
  child.cleanupVerified=false;child.cleanupError??=code;
  child.cleanupBasis='unverified';child.cleanupProof=null;child.exitRaceEligible=false;child.posixErrorEligible=false;child.posixAbsenceWitness=null;
  if(live(child)){
   try{child.process.kill('SIGKILL');}
   catch(error){child.cleanupError=error.code||error.name;}
  }
 }
 function verifyExitedTaskkillRace(child){
  if(!child.exitRaceEligible)return;
  // Eligibility was captured at tool close. Never promote a still-live fallback.
  if(done||!ownedProcess(child)||!child.exitObserved||child.cleanupToolDeadline||
     child.cleanupTool?.exit!==128||child.cleanupTool.signal!==null||child.cleanupTool.error!==null||
     !child.cleanupToolClosed||remaining()<=0){
   directFallback(child,'TASKKILL_EXIT_RACE_UNVERIFIED');return;
  }
  if(!child.closeObserved)return; // only within the existing global deadline
  if(child.exit!==child.observedExit||child.signal!==child.observedSignal){
   directFallback(child,'TASKKILL_EXIT_RACE_TERMINAL_DRIFT');return;
  }
  let probe;
  try{
   process.kill(child.pid,0); // read-only; a reused/present PID is NOT absence
   directFallback(child,'TASKKILL_EXIT_RACE_PID_PRESENT');return;
  }catch(error){
   if(error.code!=='ESRCH'){
    directFallback(child,'TASKKILL_EXIT_RACE_PID_'+(error.code||error.name));return;
   }
   probe={signal:0,outcome:'absent',error_code:'ESRCH'};
  }
  if(remaining()<=0){directFallback(child,'TASKKILL_EXIT_RACE_DEADLINE');return;}
  child.cleanupProof={schema:'owned-child-exit-pid-absence-proof-v1',kind:'owned-exit-pid-absence',pid:child.pid,
   owned_process_identity:true,terminal_observed_at_tool_close:true,close_observed:true,
   exit:child.exit,signal:child.signal,tool_close_observed:true,tool_exit:128,
   tool_signal:null,tool_error:null,tool_deadline:false,within_deadline:true,
   pid_probe:probe,descendants_verified:false};
  child.cleanupVerified=true;child.cleanupBasis='owned-exit-pid-absence';child.cleanupError=null;
 }
 function readonlyAbsent(target){
  try{process.kill(target,0);return {probe:null,error:'PRESENT'};}
  catch(error){return error.code==='ESRCH'
   ?{probe:Object.freeze({signal:0,outcome:'absent',error_code:'ESRCH'}),error:null}
   :{probe:null,error:error.code||error.name};}
 }
 function verifyPosixGroupError(child){
  if(!child.posixErrorEligible)return;
  const witness=child.posixAbsenceWitness;
  if(done||process.platform==='win32'||syntheticCleanupFailure||!ownedProcess(child)||
     !witness||witness.process!==child.ownedProcess||witness.pid!==child.pid||
     witness.group_error!=='EPERM'||child.cleanupGroupError!=='EPERM'||remaining()<=0){
   directFallback(child,'POSIX_EP_ERROR_WITNESS_UNVERIFIED');return;
  }
  // The kernel absence witness predates these authentic queued callbacks.
  if(!child.exitObserved||!child.closeObserved)return;
  if(child.exit!==child.observedExit||child.signal!==child.observedSignal||
     !((Number.isInteger(child.observedExit)&&child.observedSignal===null)||
       (child.observedExit===null&&typeof child.observedSignal==='string'))){
   directFallback(child,'POSIX_EP_TERMINAL_DRIFT');return;
  }
  const pid=readonlyAbsent(child.pid);
  if(!pid.probe){directFallback(child,'POSIX_EP_FINAL_PID_'+pid.error);return;}
  const group=readonlyAbsent(-child.pid);
  if(!group.probe){directFallback(child,'POSIX_EP_FINAL_GROUP_'+group.error);return;}
  if(done||remaining()<=0){directFallback(child,'POSIX_EP_FINAL_DEADLINE');return;}
  child.cleanupProof={schema:'owned-child-exit-pid-group-absence-proof-v1',kind:'owned-exit-pid-group-absence',
   pid:child.pid,pgid:child.pid,owned_process_identity:true,group_signal_attempt:'SIGKILL',
   group_signal_error:child.cleanupGroupError,absence_observed_at_group_error:true,
   at_error_pid_probe:witness.pid_probe,at_error_group_probe:witness.group_probe,
   terminal_observed:true,close_observed:true,exit:child.exit,signal:child.signal,
   within_deadline:true,pid_probe:pid.probe,group_probe:group.probe,descendants_verified:false};
  child.cleanupVerified=true;child.cleanupBasis='owned-exit-pid-group-absence';child.cleanupError=null;
 }
 function capturePosixErrorAbsence(child){
  // Only EPERM on this original owned group signal can enter this path.
  if(done||process.platform==='win32'||syntheticCleanupFailure||!ownedProcess(child)||
     child.cleanupGroupError!=='EPERM'||remaining()<=0){
   directFallback(child,child.cleanupGroupError||'POSIX_EP_UNVERIFIED');return;
  }
  const pid=readonlyAbsent(child.pid);
  if(!pid.probe){directFallback(child,'POSIX_EP_INITIAL_PID_'+pid.error);return;}
  const group=readonlyAbsent(-child.pid);
  if(!group.probe){directFallback(child,'POSIX_EP_INITIAL_GROUP_'+group.error);return;}
  if(done||remaining()<=0){directFallback(child,'POSIX_EP_INITIAL_DEADLINE');return;}
  child.posixAbsenceWitness=Object.freeze({process:child.ownedProcess,pid:child.pid,
   group_error:child.cleanupGroupError,pid_probe:pid.probe,group_probe:group.probe});
  child.posixErrorEligible=true;
  verifyPosixGroupError(child); // otherwise wait only for original exit/close
 }
 function cleanup(){
  if(cleanupStarted)return;
  cleanupStarted=true;
  for(const child of children){
   if(!live(child))continue;
   child.cleanupRequested=true;
   if(process.platform==='win32'||syntheticCleanupFailure){
    // No delayed PID retries: only this still-live owned ChildProcess PID.
    let tool;
    try{
     if(!live(child)||remaining()<=0){directFallback(child,'CLEANUP_DEADLINE');continue;}
     const executable=syntheticCleanupFailure?absentFile(root,'ci-conformance-missing-taskkill'): 'taskkill.exe';
     tool=spawn(executable,['/PID',String(child.process.pid),'/T','/F'],{shell:false,windowsHide:true,stdio:'ignore'});
    }catch(error){directFallback(child,error.code||error.name);continue;}
    const entry={process:tool,closed:false};tools.add(entry);
    let toolError=null;
    const timer=setTimeout(()=>{
     child.cleanupToolDeadline=true;
     child.cleanupError='TASKKILL_DEADLINE';
     directFallback(child,'TASKKILL_DEADLINE');
     if(tool.exitCode===null&&tool.signalCode===null)tool.kill('SIGKILL');
    },Math.max(1,remaining()));
    tool.on('error',error=>{toolError=error.code||error.name;directFallback(child,toolError);});
    tool.once('close',(code,signalCode)=>{
     clearTimeout(timer);entry.closed=true;tools.delete(entry);
     child.cleanupToolClosed=true;
     child.cleanupTool={exit:code,signal:signalCode,error:toolError};
     child.cleanupVerified=!done&&!toolError&&code===0&&signalCode===null&&!child.cleanupToolDeadline&&remaining()>0;
     if(child.cleanupVerified){child.cleanupBasis='windows-taskkill-complete';}
     else if(!done&&process.platform==='win32'&&!syntheticCleanupFailure&&code===128&&
             signalCode===null&&!toolError&&!child.cleanupToolDeadline&&remaining()>0&&
             ownedProcess(child)&&child.exitObserved&&
             ((Number.isInteger(child.observedExit)&&child.observedSignal===null)||
              (child.observedExit===null&&typeof child.observedSignal==='string'))&&
             child.process.exitCode===child.observedExit&&child.process.signalCode===child.observedSignal){
      // A distinct DIRECT-child proof, never a claim taskkill killed a tree.
      child.exitRaceEligible=true;verifyExitedTaskkillRace(child);
     }else directFallback(child,'TASKKILL_FAILED');
     maybeDone();
    });
   }else{
    try{process.kill(-child.process.pid,'SIGKILL');child.cleanupVerified=true;child.cleanupBasis='posix-group-absent';}
    catch(error){
     child.cleanupGroupError=error.code||error.name;
     child.cleanupVerified=error.code==='ESRCH';
     if(child.cleanupVerified)child.cleanupBasis='posix-group-absent';
     else if(error.code==='EPERM')capturePosixErrorAbsence(child);
     else directFallback(child,error.code||error.name);
    }
   }
  }
 }
 function onAbort(){fail(new Error('Parent aborted Python partitions'));}
 signal.addEventListener('abort',onAbort,{once:true});
 globalTimer=setTimeout(()=>{
  fail(new Error('Global partition/cleanup deadline reached'));
  for(const child of children)if(!child.closed)directFallback(child,'GLOBAL_CLEANUP_DEADLINE');
  for(const entry of tools)if(entry.process.exitCode===null&&entry.process.signalCode===null)entry.process.kill('SIGKILL');
  done=true;finishResolve();
 },Math.max(1,remaining()));
 try{
  if(remaining()<=0)fail(new Error('Partition preflight exhausted the global envelope'));
  for(const part of ['heavy','remaining']){
   const child={part,process:null,ownedProcess:null,pid:null,closed:false,closeObserved:false,exitObserved:false,observedExit:null,observedSignal:null,exit:null,signal:null,error:null,timedOut:false,overflow:false,protocolError:null,stdoutBytes:0,stderrBytes:0,stdout:[],stderr:[],cleanupRequested:false,cleanupVerified:null,cleanupBasis:null,cleanupProof:null,cleanupError:null,cleanupGroupError:null,cleanupTool:null,cleanupToolClosed:false,cleanupToolDeadline:false,exitRaceEligible:false,posixErrorEligible:false,posixAbsenceWitness:null,start:performance.now(),parser:null,timer:null};
   children.push(child);
   if(signal.aborted||reason){child.closed=true;child.error='NOT_STARTED_AFTER_FAILURE';continue;}
   const command=commands(part);
   child.argv=[command.executable,...command.args];
   try{
    child.process=spawn(command.executable,command.args,{cwd:root,env:process.env,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
    child.ownedProcess=child.process;
    child.pid=child.process.pid??null;
   }catch(error){child.closed=true;child.error=error.code||error.name;fail(error);continue;}
   const proc=child.process;
   child.parser=parser(plan,suiteKey,part,child.pid);
   let pending='';const decoder=new StringDecoder('utf8');
   function lines(text,final=false){
    pending+=text;
    let end;
    while((end=pending.indexOf('\n'))!==-1){
     const framedLine=pending.slice(0,end);pending=pending.slice(end+1);
     const line=framedLine.endsWith('\r')?framedLine.slice(0,-1):framedLine;
     try{child.parser.take(line);}catch(error){child.protocolError=error.message;fail(error);return;}
    }
    if(pending.length>65536||(final&&pending)){child.protocolError='Truncated/oversized JSONL';fail(new Error(child.protocolError));}
   }
   proc.stdout.on('data',raw=>{
    child.stdoutBytes+=raw.length;
    if(child.stdoutBytes>plan.old_per_stream_output_cap_bytes){child.overflow=true;fail(new Error('Partition stdout overflow'));return;}
    child.stdout.push(raw);
    if(!child.protocolError)lines(decoder.write(raw));
   });
   proc.stderr.on('data',raw=>{
    child.stderrBytes+=raw.length;
    if(child.stderrBytes>plan.old_per_stream_output_cap_bytes){child.overflow=true;fail(new Error('Partition stderr overflow'));return;}
    child.stderr.push(raw);
   });
   proc.stdout.on('error',error=>{child.error=error.code||error.name;fail(error);});
   proc.stderr.on('error',error=>{child.error=error.code||error.name;fail(error);});
   proc.on('error',error=>{child.error=error.code||error.name;fail(error);});
   proc.once('exit',(code,signalCode)=>{child.exitObserved=true;child.observedExit=code;child.observedSignal=signalCode;});
   child.timer=setTimeout(()=>{child.timedOut=true;fail(new Error(`Python ${part} exceeded ${childMs}ms`));},Math.max(1,childMs-(performance.now()-child.start)));
   proc.once('close',(code,signalCode)=>{
    clearTimeout(child.timer);child.closed=true;child.closeObserved=true;child.exit=code;child.signal=signalCode;child.seconds=(performance.now()-child.start)/1000;
    if(!child.protocolError)lines(decoder.end(),true);
    if(code!==0||signalCode!==null||child.error)fail(new Error(`Python ${part} did not complete successfully`));
    else if(!child.protocolError){try{child.parser.finish();}catch(error){child.protocolError=error.message;fail(error);}}
    verifyExitedTaskkillRace(child);
    verifyPosixGroupError(child);
    if(process.platform!=='win32'&&child.pid&&child.cleanupRequested&&!groupAbsent(child.pid)){directFallback(child,'POSIX_GROUP_REMAINS');fail(new Error('Owned POSIX group remains after close'));}
    maybeDone();
   });
  }
  if(signal.aborted)onAbort();
  maybeDone();
  await finished;
 }finally{
  clearTimeout(globalTimer);signal.removeEventListener('abort',onAbort);
  for(const child of children)clearTimeout(child.timer);
 }
 const diagnostics={schema:'ci-python-partitions-result-v1',suite:suiteKey,platform:process.platform,node:process.versions.node,production,cleanup_strategy:syntheticCleanupFailure?'synthetic-missing-tool':process.platform==='win32'?'owned-windows-taskkill':'owned-posix-group',seconds:(performance.now()-start)/1000,child_timeout_ms:childMs,global_outer_ms:globalMs,effective_cleanup_deadline_ms:globalMs-250,source_script:plan.script,source_sha256:plan.source_sha256,children:children.map(c=>({part:c.part,pid:c.pid,argv:c.argv??null,seconds:c.seconds??null,spawned:c.pid!==null,terminal_observed:c.exitObserved,closed:c.closeObserved,exit:c.exit,signal:c.signal,error:c.error,timed_out:c.timedOut,overflow:c.overflow,protocol_error:c.protocolError,stdout_bytes:c.stdoutBytes,stderr_bytes:c.stderrBytes,last_phase:c.parser?.state.phase??null,started_ids:c.parser?.state.started??[],stopped_ids:c.parser?.state.stopped??[],terminal_results:c.parser?.state.terminals??[],summary:c.parser?.state.summary??null,cleanup_requested:c.cleanupRequested,cleanup_verified:c.cleanupVerified,cleanup_basis:c.cleanupBasis,cleanup_proof:c.cleanupProof,cleanup_error:c.cleanupError,cleanup_group_error:c.cleanupGroupError,cleanup_tool:c.cleanupTool}))};
 if(!reason){
  const [a,b]=children.map(c=>c.parser?.state.discovery);
  if(!a||!b||!equal(a.full_inventory,b.full_inventory)||new Set([...a.selected_ids,...b.selected_ids]).size!==7||!equal([...a.selected_ids,...b.selected_ids].sort(),plan.full_inventory.map(n=>`${plan.module_name}.${plan.class_name}.${n}`).sort()))reason=new Error('Both partitions do not exactly cover the discovered seven');
 }
 if(children.some(c=>!c.closed||c.error||c.timedOut||c.overflow||c.protocolError||(c.cleanupRequested&&c.cleanupVerified!==true))||tools.size)reason??=new Error('Unverified child/cleanup completion');
 diagnostics.status=reason?'FAIL':'PASS';
 diagnostics.all_owned_children_closed=children.every(c=>!c.process||c.closeObserved);
 diagnostics.cleanup_tools_closed=tools.size===0;
 if(production)console.error('PYTHON_PARTITIONS_RESULT:'+JSON.stringify(diagnostics));
 if(reason){
  const error=new Error(`Python partitions failed: ${reason.message}`);error.code='ERR_PYTHON_PARTITIONS';error.diagnostics=diagnostics;
  error.childOutput=children.map(c=>({part:c.part,stdout:Buffer.concat(c.stdout).toString('utf8'),stderr:Buffer.concat(c.stderr).toString('utf8')}));
  throw error;
 }
 return diagnostics;
}

export async function runPythonPartitions(value){
 const startedAt=performance.now();
 options(value,['root','suiteKey','signal']);
 const {root,suiteKey,signal}=value;const plan=planFor(suiteKey);
 const driverBytes=readFileSync(physicalFile(root,DRIVER));
 if(hash(driverBytes)!==DRIVER_SHA)throw new Error('Production partition driver changed');
 if(hash(readFileSync(physicalFile(root,plan.script)))!==plan.source_sha256)throw new Error('Original Python test source changed');
 return engine({root,suiteKey,signal,startedAt,childMs:60000,globalMs:65000,production:true,commands:part=>({executable:process.env.PYTHON||'python3',args:['-B',DRIVER,'--suite',suiteKey,'--part',part]})});
}

export async function runPythonPartitionConformance(value){
 const startedAt=performance.now();
 options(value,['root','suiteKey','caseKey','signal']);
 const {root,suiteKey,caseKey,signal}=value;planFor(suiteKey);
 if(!CONFORMANCE_CASES.includes(caseKey)||!/^[a-f0-9]{64}$/.test(CONFORMANCE_SHA))throw new Error('Pending/unknown closed conformance fixture');
 if(hash(readFileSync(physicalFile(root,CONFORMANCE_FILE)))!==CONFORMANCE_SHA)throw new Error('Conformance fixture source changed');
 const missing=caseKey==='spawn-error'?absentFile(root,'ci-conformance-missing-executable'):null;
 return engine({root,suiteKey,signal,startedAt,childMs:3000,globalMs:5000,production:false,syntheticCleanupFailure:caseKey==='cleanup-tool-failure',commands:part=>({executable:missing&&part==='heavy'?missing:process.env.PYTHON||'python3',args:['-B',CONFORMANCE_FILE,'--suite',suiteKey,'--part',part,'--case',caseKey]})});
}
