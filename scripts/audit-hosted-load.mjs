// Offline mixed-tool concurrency and independent health probes against an isolated installed HTTP server.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {cp,mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const option=name=>{const i=process.argv.indexOf(name);if(i<0)return;assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a value`);return process.argv[i+1];};
const serverDir=resolve(option('--server-dir')||'server'),reportPath=option('--report'),count=Number(option('--clients')||8),rounds=Number(option('--rounds')||2),healthMs=Number(option('--health-ms')||5000);
assert.ok(Number.isInteger(count)&&count>=1&&count<=100);assert.ok(Number.isInteger(rounds)&&rounds>=1&&rounds<=10);assert.ok(Number.isFinite(healthMs)&&healthMs>0);
let stage,child,timer,stderr='',running=false,phase='startup',probes;const clients=[],health=[],calls=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const memory=()=>{if(process.platform!=='linux')return null;const s=readFileSync(`/proc/${child.pid}/status`,'utf8');return Object.fromEntries(['VmRSS','VmHWM'].map(k=>[k,Number(s.match(new RegExp(`^${k}:\\s+(\\d+) kB$`,'m'))?.[1])*1024]));};
try {
 stage=await mkdtemp(join(tmpdir(),'pali-hosted-load-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'offline.cjs');await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 child=spawn(process.execPath,['--require',guard,join(stage,'server/http.cjs')],{cwd:join(stage,'empty'),env:{...process.env,HOST:'127.0.0.1',PORT:'0',RATE_LIMIT_PER_MINUTE:'0',CHATGPT_WIDGET:'1',PALI_CANON_CACHE_MB:'64'},stdio:['ignore','ignore','pipe']});
 const url=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('HTTP readiness timed out')),30000);child.once('error',reject);child.once('exit',code=>reject(Error(`HTTP server exited (${code})`)));child.stderr.on('data',value=>{stderr+=value;const m=stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
 for(let i=0;i<count;i++){const c=new Client({name:'pali-hosted-load',version:'1'});clients.push(c);await c.connect(new StreamableHTTPClientTransport(new URL(url)));}
 const verse=await clients[0].callTool({name:'get_text',arguments:{uid:'Dhp 183',limit:5}});assert.ok(!verse.isError);
 const tasks=[['search_texts',{query:'sati',english:'off',limit:5}],['analyse_passage',{uid:'MN 10',limit:8}],['verify_quote',{text:verse.structuredContent.segments.find(s=>s.type==='verse').text,language:'pali',limit:1}],['search_commentary',{query:'sati',limit:3}],['search_post_canonical',{query:'sati',limit:3}],['get_parallels',{uid:'MN 10',limit:3}],['glossary',{term:'mindfulness',direction:'en-pa',limit:3}],['get_text',{uid:'MN 10',limit:20}]];
 running=true;phase='cold';
 probes=(async()=>{while(running){const started=performance.now(),p=phase;try{const response=await fetch(url.replace('/mcp','/healthz'),{signal:AbortSignal.timeout(healthMs)});assert.equal(response.status,200);assert.equal((await response.json()).status,'ok');health.push({phase:p,milliseconds:Math.round(performance.now()-started),ok:true});}catch(error){health.push({phase:p,milliseconds:Math.round(performance.now()-started),ok:false,error:error.message});}await wait(100);}})();
 for(let round=0;round<rounds;round++){
  phase=round===0?'cold':'warm';
  await Promise.all(clients.map(async(client,i)=>{const [name,args]=tasks[(i+round)%tasks.length],started=performance.now();try{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);calls.push({round,tool:name,milliseconds:Math.round(performance.now()-started),ok:true});}catch(error){calls.push({round,tool:name,milliseconds:Math.round(performance.now()-started),ok:false,error:error.message});}}));
 }
 running=false;await probes;assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
 const report={status:calls.every(c=>c.ok)&&health.every(h=>h.ok)?'passed':'failed',node:process.version,clients:count,rounds,health_deadline_ms:healthMs,calls,health,memory:memory(),network_attempts:0,scope:'Cold and warm simultaneous offline tool calls through independent HTTP MCP clients, with a separate health poller. Does not impose CPU/memory limits itself or establish live-provider, actual-host or signed-in-client acceptance.'};
 if(reportPath)await writeFile(resolve(reportPath),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,clients:count,rounds,tool_calls:calls.length,tool_failures:calls.filter(c=>!c.ok).length,health_checks:health.length,health_failures:health.filter(h=>!h.ok).length,max_health_ms:Math.max(...health.map(h=>h.milliseconds)),memory:report.memory,network_attempts:0}));if(report.status!=='passed')process.exitCode=1;
}catch(error){if(reportPath)await writeFile(resolve(reportPath),JSON.stringify({status:'failed',error:error.message,calls,health,server_stderr_tail:stderr.slice(-2000)},null,2)+'\n');throw error;
}finally{
 running=false;clearTimeout(timer);if(probes)await probes;
 await Promise.allSettled(clients.map(c=>c.close()));if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill();await ended;}if(stage)await rm(stage,{recursive:true,force:true});
}
