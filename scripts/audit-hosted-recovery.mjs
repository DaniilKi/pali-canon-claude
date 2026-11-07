// Exercise real packaged HTTP envelopes, including an intentionally broken worker in a temporary copy.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cp,mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const option=name=>{const i=process.argv.indexOf(name);if(i<0)return;assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]);};
const serverDir=option('--server-dir')||resolve('server'),reportPath=option('--report'),cases=[];
let stage,child,client,timer;
try{
 stage=await mkdtemp(join(tmpdir(),'pali-hosted-recovery-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'no-network.cjs');await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('Network disabled')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['healthy','busy-worker','broken-worker']){
  if(mode==='busy-worker')await writeFile(join(stage,'server/http-worker.cjs'),`const {parentPort}=require('node:worker_threads'),fs=require('node:fs'),path=require('node:path');let released=false;const held=[];const reply=m=>{const body={fixture:true,uid:m.args.uid};parentPort.postMessage({id:m.id,result:{content:[{type:'text',text:JSON.stringify(body)}],structuredContent:body}})};parentPort.on('message',m=>released?reply(m):held.push(m));const timer=setInterval(()=>{if(fs.existsSync(path.join(__dirname,'release-fixture'))){released=true;clearInterval(timer);for(const m of held)reply(m);held.length=0}},10);timer.unref();\n`);
  if(mode==='broken-worker')await writeFile(join(stage,'server/http-worker.cjs'),`throw new Error('PRIVATE_WORKER_FAILURE_FIXTURE');\n`);
  let stderr='';child=spawn(process.execPath,['--require',guard,join(stage,'server/http.cjs')],{cwd:join(stage,'empty'),env:{...process.env,HOST:'127.0.0.1',PORT:'0',RATE_LIMIT_PER_MINUTE:'0'},stdio:['ignore','ignore','pipe']});
  const url=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('HTTP recovery readiness timed out')),30000);child.once('error',reject);child.once('exit',code=>reject(Error(`Server exited (${code})`)));child.stderr.on('data',value=>{stderr+=value;const m=stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
  client=new Client({name:'packaged-recovery-audit',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  if(mode==='busy-worker'){
   const healthUrl=url.replace('/mcp','/healthz'),initial=await(await fetch(healthUrl)).json(),limit=initial.tool_worker.limit,args={uid:'MN 10',limit:1};
   const held=Array.from({length:limit},()=>client.callTool({name:'get_text',arguments:args}).then(result=>({result}),error=>({error})));
   let status;const deadline=Date.now()+30000;
   do{status=await(await fetch(healthUrl)).json();if(status.tool_worker.pending===limit)break;await new Promise(resolve=>setTimeout(resolve,20));}while(Date.now()<deadline);
   assert.equal(status.tool_worker.pending,limit);
   const busy=await client.callTool({name:'get_text',arguments:args}),body=JSON.parse(busy.content[0].text);assert.equal(busy.isError,true);assert.deepEqual(body,busy.structuredContent);assert.equal(body.code,'HOSTED_TOOL_BUSY');assert.equal(body.retryable,true);assert.equal(body.retry_after_seconds,5);assert.match(body.recovery,/same read arguments/);assert.doesNotMatch(body.recovery,/resolve_reference|browse_canon/);
   await writeFile(join(stage,'server/release-fixture'),'release\n');
   for(const {result,error}of await Promise.all(held)){assert.equal(error,undefined);assert.ok(!result.isError);assert.equal(result.structuredContent.fixture,true);}
   const retry=await client.callTool({name:'get_text',arguments:args});assert.ok(!retry.isError);assert.equal(retry.structuredContent.uid,args.uid);assert.equal((await(await fetch(healthUrl)).json()).tool_worker.pending,0);
   cases.push({mode,admission_limit:limit,code:body.code,retryable:true,retry_after_seconds:5,unchanged_argument_retry:true,queue_drained:true});
   await client.close();client=null;if(child.exitCode===null&&child.signalCode===null){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill();await ended;}child=null;assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);continue;
  }
  const result=await client.callTool({name:'get_text',arguments:{uid:'MN 10',limit:1}});
  if(mode==='healthy'){
   assert.ok(!result.isError);assert.equal(result.structuredContent.text_id,'mn10');assert.deepEqual(JSON.parse(result.content[0].text),result.structuredContent);
   const invalid=await client.callTool({name:'get_text',arguments:{uid:'MN 153'}}),error=JSON.parse(invalid.content[0].text);assert.equal(invalid.isError,true);assert.equal(error.code,undefined);assert.equal(error.retryable,undefined);assert.match(error.recovery,/resolve_reference/);
   cases.push({mode,read_text_id:'mn10',source_error_contract_preserved:true});
  }else{
   const error=JSON.parse(result.content[0].text);assert.equal(result.isError,true);assert.deepEqual(error,result.structuredContent);assert.equal(error.code,'HOSTED_TOOL_UNAVAILABLE');assert.equal(error.retryable,false);assert.equal(error.requires_restart,true);assert.match(error.recovery,/operator.*restart/i);assert.doesNotMatch(JSON.stringify(error),/PRIVATE_WORKER_FAILURE_FIXTURE|resolve_reference|browse_canon/);
   const health=await fetch(url.replace('/mcp','/healthz'));assert.equal(health.status,503);assert.equal((await health.json()).tool_worker.pending,0);
   cases.push({mode,code:error.code,requires_restart:true,private_failure_not_exposed:true,health_status:503});
  }
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);await client.close();client=null;
  if(child.exitCode===null&&child.signalCode===null){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases,network_attempts:0,scope:'Isolated installed HTTP package with an intentionally corrupted worker only in a disposable copy. No deployment, real-host or live-provider acceptance.'};if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{
 clearTimeout(timer);if(client)await client.close().catch(()=>{});if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill();await ended;}if(stage)await rm(stage,{recursive:true,force:true});
}
