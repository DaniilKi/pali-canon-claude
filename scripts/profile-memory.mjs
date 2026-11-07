// Linux process-memory measurements for a real installed HTTP server, offline and without deployment.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {cp,mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function option(name) {const i=process.argv.indexOf(name);if(i<0)return;assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a value`);return process.argv[i+1];}
assert.equal(process.platform,'linux','This profiler needs Linux /proc; other platforms are not measured.');
const serverDir=resolve(option('--server-dir')||'server'),reportPath=option('--report'),budget=option('--budget-mb');
const budgetBytes=budget===undefined?null:Number(budget)*1024*1024;
assert.ok(budgetBytes===null||(Number.isFinite(budgetBytes)&&budgetBytes>0),'--budget-mb must be a positive finite MiB value');
let stage,child,client,timer,stderr='';const steps=[];
function record(step) {steps.push(step);console.error(JSON.stringify(step));}
function memory() {
 const status=readFileSync(`/proc/${child.pid}/status`,'utf8');
 const bytes=key=>{const match=status.match(new RegExp(`^${key}:\\s+(\\d+) kB$`,'m'));assert.ok(match,`Missing ${key} in process status`);return Number(match[1])*1024;};
 return {rss_bytes:bytes('VmRSS'),peak_rss_bytes:bytes('VmHWM')};
}
try {
 stage=await mkdtemp(join(tmpdir(),'pali-memory-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'offline.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 child=spawn(process.execPath,['--require',guard,join(stage,'server/http.cjs')],{cwd:join(stage,'empty'),env:{...process.env,HOST:'127.0.0.1',PORT:'0',RATE_LIMIT_PER_MINUTE:'0',CHATGPT_WIDGET:'1',PALI_CANON_CACHE_MB:'64'},stdio:['ignore','ignore','pipe']});
 const url=await new Promise((resolve,reject)=>{
  timer=setTimeout(()=>reject(Error('HTTP readiness timed out')),30000);child.once('error',reject);child.once('exit',code=>reject(Error(`HTTP server exited (${code})`)));
  child.stderr.on('data',value=>{stderr+=value;const match=stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/);if(match){clearTimeout(timer);resolve(match[1]);}});
 });
 client=new Client({name:'pali-memory-profile',version:'1'});await client.connect(new StreamableHTTPClientTransport(new URL(url)));
 record({operation:'initialized',...memory()});
 async function call(name,args) {
  const start=performance.now(),r=await client.callTool({name,arguments:args});assert.ok(!r.isError,`${name}: ${JSON.stringify(r.content)}`);assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);
  record({operation:name,milliseconds:Math.round(performance.now()-start),...memory()});return r.structuredContent;
 }
 const verse=await call('get_text',{uid:'Dhp 183',limit:5});
 await call('search_texts',{query:'sati',english:'off',limit:1});
 await call('analyse_passage',{uid:'MN 10',limit:8});
 await call('verify_quote',{text:verse.segments.find(s=>s.type==='verse').text,language:'pali',limit:1});
 await call('search_commentary',{query:'sati',limit:1});
 await call('search_post_canonical',{query:'sati',limit:1});
 await call('get_parallels',{uid:'MN 10',limit:1});
 await call('glossary',{term:'mindfulness',direction:'en-pa',limit:1});
 assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
 const peak=Math.max(...steps.map(s=>s.peak_rss_bytes)),within=budgetBytes===null?null:peak<=budgetBytes;
 const report={status:within===false?'exceeded_budget':'passed',platform:process.platform,node:process.version,operations_passed:true,network_attempts:0,peak_rss_bytes:peak,budget_bytes:budgetBytes,within_budget:within,steps,scope:'One sequential HTTP study session using an isolated installed server and bundled source only. Linux process RSS/high-water measurements; this script does not impose a container limit itself. Not concurrent load, a full live cache, or a guarantee of an upper memory bound.'};
 if(reportPath)await writeFile(resolve(reportPath),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(within===false)process.exitCode=1;
} catch(error) {
 if(reportPath)await writeFile(resolve(reportPath),JSON.stringify({status:'failed',platform:process.platform,node:process.version,error:error.message,steps,server_exit:child?{code:child.exitCode,signal:child.signalCode}:null,server_stderr_tail:stderr.slice(-2000)},null,2)+'\n');
 throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
