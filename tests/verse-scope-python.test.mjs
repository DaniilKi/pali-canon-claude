import test from 'node:test';
import assert from 'node:assert/strict';
import {findPython,runPythonFixture,PYTHON_FIXTURE_MS} from './helpers/verse-scope-python.mjs';
const python=await findPython();
function absent(pid,group=false){try{process.kill(group?-pid:pid,0);return false;}catch(e){return e.code==='ESRCH';}}
test('bounded Python preserves real Unicode input output and owned natural close',{skip:!python,timeout:15000},async()=>{
 const r=await runPythonFixture(python,{stage:'control-success',boundMs:10000,code:"import json,sys;v=json.load(sys.stdin);print(v['value']);print('owned stderr',file=sys.stderr)",input:{value:'λ lantern'}});
 assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,null);assert.equal(r.stdout.trim(),'λ lantern');assert.equal(r.stderr.trim(),'owned stderr');assert.equal(r.diagnostics.platform,process.platform);assert.equal(r.diagnostics.node,process.version);assert.equal(r.diagnostics.closed,true);assert.equal(r.diagnostics.exit_observed,true);assert.equal(r.diagnostics.cleanup_verified,true);assert.equal(r.diagnostics.timed_out,false);assert.equal(r.diagnostics.descendants_verified,false);assert.equal(absent(r.diagnostics.pid),true);if(process.platform!=='win32')assert.equal(absent(r.diagnostics.pid,true),true);
});
test('a real Python sleep times out fails closed and leaves no owned direct child or same POSIX group',{skip:!python,timeout:10000},async()=>{
 let observed;await assert.rejects(runPythonFixture(python,{stage:'control-timeout',boundMs:5000,code:'import time;time.sleep(30)',input:null}),e=>{observed=e.diagnostics;return e.name==='BoundedPythonError'&&e.message==='PYTHON_TIMEOUT';});
 assert.equal(observed.timed_out,true);assert.equal(observed.closed,true);assert.equal(observed.cleanup_verified,true);assert.notEqual(observed.exit_code,0);assert.ok(observed.elapsed_ms<=observed.bound_ms);assert.equal(observed.descendants_verified,false);assert.equal(absent(observed.pid),true);if(process.platform!=='win32'){assert.equal(absent(observed.pid,true),true);assert.equal(observed.signal,'SIGKILL');assert.equal(observed.group_signal_attempted,true);}else{assert.equal(observed.cleanup_tool.closed,true);assert.equal(observed.cleanup_tool.exit_code,0);assert.equal(observed.cleanup_tool.signal,null);assert.equal(observed.cleanup_tool.error,null);}
});
test('QA Python bounds cannot be disabled raised or replaced by arbitrary command options',async()=>{
 assert.equal(PYTHON_FIXTURE_MS,120000);
 for(const boundMs of [0,-1,null,NaN,Infinity,'1000',120001])await assert.rejects(runPythonFixture('python3',{stage:'control-bounds',code:"print('never executed')",input:null,boundMs}),/bound/);
 await assert.rejects(runPythonFixture('sh',{stage:'control-bounds',code:'exit',input:null}),/probed QA Python/);
 await assert.rejects(runPythonFixture('python3',{stage:'control-bounds',code:'exit',input:null,timeout:0}),/Unknown QA Python option/);
 for(const signal of [{},null,0,'abort',Object.create(AbortSignal.prototype)])await assert.rejects(runPythonFixture('python3',{stage:'control-signal',code:"print('never executed')",input:null,signal}),/Genuine AbortSignal/);
 const controller=new AbortController();controller.abort();await assert.rejects(runPythonFixture('python3',{stage:'control-aborted',code:"print('never executed')",input:null,boundMs:1000,signal:controller.signal}),e=>e.name==='BoundedPythonError'&&e.diagnostics.aborted===true&&e.diagnostics.spawned===false&&e.diagnostics.closed===true&&e.diagnostics.cleanup_verified===true);
});
