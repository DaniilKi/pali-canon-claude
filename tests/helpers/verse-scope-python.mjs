// QA-only real Python processes. No application imports or caller-supplied command policy.
import {spawn} from 'node:child_process';
import {writeSync,mkdirSync,lstatSync,realpathSync,writeFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
export const PYTHON_PROBE_MS=10000, PYTHON_FIXTURE_MS=120000;
const OUTPUT_CAP=1024*1024, MAX_ROWS=128;
const abortGet=Object.getOwnPropertyDescriptor(AbortSignal.prototype,'aborted').get,abortAdd=EventTarget.prototype.addEventListener,abortRemove=EventTarget.prototype.removeEventListener;
let traceFile=null, rows=0;
function emit(value){
 const row={schema:'bounded-qa-python-stage-v1',platform:process.platform,node_pid:process.pid,at_ms:performance.now(),...value};
 const text=JSON.stringify(row)+'\n';if(++rows>MAX_ROWS)throw Error('Finite QA stage row cap');
 writeSync(2,'QA_PYTHON_PROCESS:'+text);
 if(process.env.RUNNER_TEMP){
  if(!traceFile){const base=realpathSync(process.env.RUNNER_TEMP),dir=resolve(base,'verse-scope-process');mkdirSync(dir,{recursive:true,mode:0o700});const st=lstatSync(dir);if(!st.isDirectory()||st.isSymbolicLink())throw Error('Physical QA trace directory required');traceFile=resolve(dir,'process-'+process.pid+'-'+randomUUID()+'.jsonl');writeFileSync(traceFile,'',{flag:'wx',mode:0o600});}
  appendFileSync(traceFile,text,'utf8');
 }
}
function absence(pid,group=false){try{process.kill(group?-pid:pid,0);return {absent:false,error:null};}catch(e){return {absent:e.code==='ESRCH',error:e.code??e.name};}}
class BoundedPythonError extends Error{constructor(message,diagnostics){super(message);this.name='BoundedPythonError';this.diagnostics=diagnostics;}}
function options(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Fixed QA Python options required');
 for(const key of Object.keys(value))if(!['stage','code','input','boundMs','signal'].includes(key))throw Error('Unknown QA Python option '+key);
 if(typeof value.stage!=='string'||!/^[a-z0-9-]{1,64}$/.test(value.stage))throw Error('Finite public QA stage name required');
 if(typeof value.code!=='string'||!value.code||Buffer.byteLength(value.code)>1024*1024)throw Error('Bounded source fixture required');
 if(value.signal!==undefined){try{if(!(value.signal instanceof AbortSignal)||typeof abortGet.call(value.signal)!=='boolean')throw Error('brand');}catch{throw Error('Genuine AbortSignal required before spawning');}}
 const bound=value.boundMs===undefined?PYTHON_FIXTURE_MS:value.boundMs;if(!Number.isSafeInteger(bound)||bound<1000||bound>PYTHON_FIXTURE_MS)throw Error('QA fixture bound must be1000..120000ms');return bound;
}
async function bounded(command,args,{stage,input,boundMs,signal,started=performance.now()}){
 const deadline=started+boundMs,reserve=Math.min(1000,Math.floor(boundMs/2)),killAt=deadline-reserve;
 const stdout=[],stderr=[];let outBytes=0,errBytes=0,child=null,pid=null,spawnError=null,exitCode=null,exitSignal=null,exitObserved=false,closed=false,timedOut=false,aborted=false,overflow=false,killError=null,directKill=null,groupAttempt=false,tool=null,toolClosed=true,toolCode=null,toolSignal=null,toolError=null,pending='';
 const live=()=>child&&child.pid===pid&&Number.isSafeInteger(pid)&&!exitObserved&&!closed&&child.exitCode===null&&child.signalCode===null;
 const diag=()=>{const p=pid?absence(pid):{absent:!pid,error:null},g=pid&&process.platform!=='win32'?absence(pid,true):null;return {stage,platform:process.platform,node:process.version,command,pid,bound_ms:boundMs,elapsed_ms:performance.now()-started,spawned:Number.isSafeInteger(pid),exit_observed:exitObserved,closed,exit_code:exitCode,signal:exitSignal,error:spawnError,timed_out:timedOut,aborted,overflow,stdout_bytes:outBytes,stderr_bytes:errBytes,group_signal_attempted:groupAttempt,kill_error:killError,direct_handle_kill:directKill,cleanup_tool:tool?{closed:toolClosed,exit_code:toolCode,signal:toolSignal,error:toolError}:null,pid_absence:p,same_group_absence:g,cleanup_verified:(!pid||closed&&p.absent&&(g===null||g.absent))&&toolClosed&&(!tool||toolCode===0&&toolSignal===null&&toolError===null),descendants_verified:false};};
 emit({stage,event:'start',bound_ms:boundMs});
 const result=await new Promise(resolveResult=>{
  let done=false,stopping=false,killTimer,hardTimer;
  const finish=()=>{if(done||!closed||!toolClosed)return;done=true;clearTimeout(killTimer);clearTimeout(hardTimer);if(signal!==undefined)abortRemove.call(signal,'abort',onAbort);const d=diag();emit({stage,event:'exit',...d});resolveResult({status:exitCode,signal:exitSignal,error:spawnError,stdout:Buffer.concat(stdout).toString('utf8'),stderr:Buffer.concat(stderr).toString('utf8'),diagnostics:d});};
  const ownedKill=()=>{if(!live()||directKill!==null)return;try{directKill=child.kill('SIGKILL');}catch(e){directKill=false;killError=killError??(e.code??e.name);}};
  const stop=reason=>{
   if(done)return;if(reason==='timeout')timedOut=true;if(reason==='abort')aborted=true;if(reason==='overflow')overflow=true;if(stopping)return;stopping=true;
   emit({stage,event:reason,pid,bound_ms:boundMs});if(!live())return;
   if(process.platform==='win32'){
    if(tool)return;toolClosed=false;
    try{tool=spawn('taskkill.exe',['/PID',String(pid),'/T','/F'],{stdio:'ignore',windowsHide:true});tool.once('error',e=>{toolError=e.code??e.name;ownedKill();});tool.once('close',(code,sig)=>{toolClosed=true;toolCode=code;toolSignal=sig;if(code!==0||sig||toolError)ownedKill();finish();});}
    catch(e){toolClosed=true;toolError=e.code??e.name;ownedKill();}
   }else{groupAttempt=true;try{process.kill(-pid,'SIGKILL');}catch(e){killError=e.code??e.name;ownedKill();}}
  };
  const onAbort=()=>stop('abort');
  // Hard stop includes cleanup. It fails this QA worker rather than allowing another unbounded file.
  hardTimer=setTimeout(()=>{if(done)return;if(tool&&!toolClosed&&tool.exitCode===null&&tool.signalCode===null)try{tool.kill('SIGKILL');}catch(e){toolError=toolError??(e.code??e.name);}ownedKill();const d=diag();try{emit({stage,event:'hard-stop-unverified',...d});}finally{process.exit(1);}},Math.max(1,deadline-performance.now()));
  killTimer=setTimeout(()=>stop('timeout'),Math.max(1,killAt-performance.now()));
  if(signal!==undefined&&abortGet.call(signal)){aborted=true;spawnError='ABORTED_BEFORE_SPAWN';closed=true;finish();return;}
  try{child=spawn(command,args,{cwd:process.cwd(),env:{...process.env,PYTHONUTF8:'1'},stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32',windowsHide:true});pid=child.pid??null;}
  catch(e){spawnError=e.code??e.name;closed=true;finish();return;}
  emit({stage,event:'spawn',pid});if(signal!==undefined)abortAdd.call(signal,'abort',onAbort,{once:true});
  child.once('error',e=>{spawnError=e.code??e.name;});child.once('exit',(code,sig)=>{exitObserved=true;exitCode=code;exitSignal=sig;});child.once('close',(code,sig)=>{closed=true;exitCode=code;exitSignal=sig;finish();});
  child.stdout.on('data',chunk=>{outBytes+=chunk.length;if(outBytes>OUTPUT_CAP){stop('overflow');return;}stdout.push(chunk);});
  child.stderr.on('data',chunk=>{errBytes+=chunk.length;if(errBytes>OUTPUT_CAP){stop('overflow');return;}stderr.push(chunk);pending+=chunk.toString('utf8');for(;;){const i=pending.indexOf('\n');if(i<0)break;const line=pending.slice(0,i).replace(/\r$/,'');pending=pending.slice(i+1);if(line.startsWith('QA_NESTED_STAGE:')){try{const r=JSON.parse(line.slice('QA_NESTED_STAGE:'.length));if(['linker-guard','linker-control'].includes(r.stage)&&['start','exit','timeout','cleanup-unverified'].includes(r.event))emit({stage,event:'nested',nested_stage:r.stage,nested_event:r.event,nested_pid:r.pid,nested_returncode:r.returncode,nested_error:r.error});}catch{emit({stage,event:'nested-diagnostic-invalid'});}}}});
  child.stdin.on('error',()=>{});child.stdin.end(input);
 });
 const d=result.diagnostics;
 if(d.timed_out||d.aborted||d.overflow||d.error||!d.cleanup_verified||d.elapsed_ms>boundMs||(d.cleanup_tool&&(d.cleanup_tool.exit_code!==0||d.cleanup_tool.signal||d.cleanup_tool.error))){const reason=d.timed_out?'PYTHON_TIMEOUT':d.aborted?'PYTHON_ABORTED':d.overflow?'PYTHON_OUTPUT_LIMIT':d.error??'PYTHON_CLEANUP_UNVERIFIED';throw new BoundedPythonError(reason,d);}
 return result;
}
export async function findPython(){
 const started=performance.now(); // Both aliases share one10-second total budget.
 for(const command of ['python3','python']){
  try{const r=await bounded(command,['--version'],{stage:'probe-'+command,input:'',boundMs:PYTHON_PROBE_MS,started});if(r.status!==0)throw new BoundedPythonError('Python version probe failed',r.diagnostics);emit({stage:'probe-'+command,event:'version',version:(r.stdout||r.stderr).trim().slice(0,120)});return command;}
  catch(e){const d=e instanceof BoundedPythonError?e.diagnostics:null;const missingOnly=d&&d.error==='ENOENT'&&d.spawned===false&&d.pid===null&&d.closed===true&&d.timed_out===false&&d.aborted===false&&d.overflow===false&&d.cleanup_verified===true&&d.elapsed_ms<=PYTHON_PROBE_MS&&d.stdout_bytes===0&&d.stderr_bytes===0&&d.pid_absence.absent===true&&d.same_group_absence===null&&d.cleanup_tool===null&&d.kill_error===null&&d.direct_handle_kill===null&&!d.group_signal_attempted;if(missingOnly)continue;throw e;}
 }
 return null; // Only two genuine ENOENT outcomes preserve the original optional-availability skip.
}
export async function runPythonFixture(python,value){
 const started=performance.now();if(!['python3','python'].includes(python))throw Error('Only probed QA Python commands accepted');const boundMs=options(value);const input=JSON.stringify(value.input??null);if(Buffer.byteLength(input)>16*1024*1024)throw Error('Finite QA input bound');return bounded(python,['-c',value.code],{stage:value.stage,input,boundMs,signal:value.signal,started});
}
