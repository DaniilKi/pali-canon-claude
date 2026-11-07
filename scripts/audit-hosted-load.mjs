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
const fullCache=process.argv.includes('--full-cache'),allowOverload=process.argv.includes('--allow-overload'),readerCaches=process.argv.includes('--reader-caches');
assert.ok(!readerCaches||fullCache,'--reader-caches requires --full-cache');
assert.ok(Number.isInteger(count)&&count>=1&&count<=100);assert.ok(Number.isInteger(rounds)&&rounds>=1&&rounds<=10);assert.ok(Number.isFinite(healthMs)&&healthMs>0);
let stage,child,timer,stderr='',running=false,phase='startup',probes,cacheFill=null,readerFill=null;const clients=[],health=[],calls=[];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const memory=()=>{if(process.platform!=='linux')return null;const s=readFileSync(`/proc/${child.pid}/status`,'utf8');return Object.fromEntries(['VmRSS','VmHWM'].map(k=>[k,Number(s.match(new RegExp(`^${k}:\\s+(\\d+) kB$`,'m'))?.[1])*1024]));};
try {
 stage=await mkdtemp(join(tmpdir(),'pali-hosted-load-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const synthetic=`async url=>{const u=new URL(url);if(u.hostname!=='www.dhammatalks.org'||!u.pathname.startsWith('/suttas/'))return fail();console.error('SYNTHETIC_CACHE_FETCH');const label='Synthetic cache pressure fixture, not scripture. '+u.pathname+' ';const text=(label+'☃ fixture ').repeat(Math.ceil(2093056/(label.length+10))).slice(0,2093056);return new Response('<html><title>Synthetic cache pressure fixture</title><div id="sutta"><p>'+text+'</p></div><div class="footer">Synthetic fixture</div></html>')}`;
 const guard=join(stage,'offline.cjs');await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=${fullCache?synthetic:'fail'};for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 child=spawn(process.execPath,['--require',guard,join(stage,'server/http.cjs')],{cwd:join(stage,'empty'),env:{...process.env,HOST:'127.0.0.1',PORT:'0',RATE_LIMIT_PER_MINUTE:'0',CHATGPT_WIDGET:'1',PALI_CANON_CACHE_MB:'64'},stdio:['ignore','ignore','pipe']});
 const url=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('HTTP readiness timed out')),30000);child.once('error',reject);child.once('exit',code=>reject(Error(`HTTP server exited (${code})`)));child.stderr.on('data',value=>{stderr+=value;const m=stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
 for(let i=0;i<count;i++){const c=new Client({name:'pali-hosted-load',version:'1'});clients.push(c);await c.connect(new StreamableHTTPClientTransport(new URL(url)));}
 const verse=await clients[0].callTool({name:'get_text',arguments:{uid:'Dhp 183',limit:5}});assert.ok(!verse.isError);
 running=true;phase=fullCache?'cache-fill':'cold';
 probes=(async()=>{while(running){const started=performance.now(),p=phase;try{const response=await fetch(url.replace('/mcp','/healthz'),{signal:AbortSignal.timeout(healthMs)});assert.equal(response.status,200);assert.equal((await response.json()).status,'ok');health.push({phase:p,milliseconds:Math.round(performance.now()-started),ok:true});}catch(error){health.push({phase:p,milliseconds:Math.round(performance.now()-started),ok:false,error:error.message});}await wait(100);}})();
 const tasks=[['search_texts',{query:'sati',english:'off',limit:5}],['analyse_passage',{uid:'MN 10',limit:8}],['verify_quote',{text:verse.structuredContent.segments.find(s=>s.type==='verse').text,language:'pali',limit:1}],['search_commentary',{query:'sati',limit:3}],['search_post_canonical',{query:'sati',limit:3}],['get_parallels',{uid:'MN 10',limit:3}],['glossary',{term:'mindfulness',direction:'en-pa',limit:3}],['get_text',{uid:'MN 10',limit:20}]];
 if(fullCache){
  const selected=[],seen=new Set();
  const candidates=[...Array.from({length:34},(_,i)=>`DN ${i+1}`),...Array.from({length:152},(_,i)=>`MN ${i+1}`)];
  for(const uid of candidates){if(selected.length===16)break;const r=await clients[0].callTool({name:'get_metadata',arguments:{uid}});assert.ok(!r.isError);const translation=r.structuredContent.english.find(t=>t.translation_id.startsWith('dt:'));if(translation&&!seen.has(translation.translation_id)){selected.push({uid:r.structuredContent.id,translation:translation.translation_id});seen.add(translation.translation_id);}}
  assert.equal(selected.length,16,'Need 16 distinct linked sources for cache pressure');
  for(const ref of selected)for(const name of ['get_translation','read_passage_widget']){const r=await clients[0].callTool({name,arguments:{...ref,limit:name==='get_translation'?500:1,...(name==='read_passage_widget'?{english:true}:{})}});assert.ok(!r.isError,JSON.stringify(r.content));const text=name==='get_translation'?r.structuredContent.text:r.structuredContent.english.text;assert.match(text,/Synthetic cache pressure fixture, not scripture/);}
  const h=await(await fetch(url.replace('/mcp','/healthz'))).json();cacheFill={worker:h.cache,frontend:h.frontend_cache,synthetic_pages:selected.length};
  for(const cache of [h.cache,h.frontend_cache]){assert.equal(cache.max_bytes,64*1024*1024,'Full-cache mode requires both configured caches to be enabled');assert.ok(cache.bytes>=cache.max_bytes*.99,'Each live cache must reach at least 99% occupancy');assert.ok(cache.bytes<=cache.max_bytes);}
  const ref=selected.at(-1);tasks.push(['get_translation',{...ref,limit:30000}],['read_passage_widget',{...ref,english:true,limit:1}]);
 }
 if(readerCaches){
  phase='reader-cache-fill';
  const read=async(name,args)=>{const r=await clients[0].callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));return r.structuredContent;};
  const post=await read('get_post_canonical',{limit:200}),roots=await read('browse_canon',{node:'books',limit:200}),commentary=await read('get_commentary',{uid:'commentary',limit:200});
  readerFill={postcanonical_books:0,root_files:0,commentary_books:0};
  for(const book of post.items){const r=await read('read_passage_widget',{uid:book.id,english:false,limit:1});assert.equal(r.canonical,false);assert.ok(r.pali.returned>0);readerFill.postcanonical_books++;}
  for(const book of roots.items){const r=await read('read_passage_widget',{book:book.id,english:false,limit:1});assert.equal(r.selection,'source_book');assert.ok(r.pali.returned>0);readerFill.root_files++;}
  for(const book of commentary.books){const r=await read('read_passage_widget',{commentary:book.uid,english:false,limit:1});assert.equal(r.canonical,false);assert.ok(r.pali.returned>0);readerFill.commentary_books++;}
  assert.deepEqual(readerFill,{postcanonical_books:109,root_files:61,commentary_books:47});
 }
 for(let round=0;round<rounds;round++){
  phase=round===0?'cold':'warm';
  await Promise.all(clients.map(async(client,i)=>{const [name,args]=tasks[(i+round)%tasks.length],started=performance.now();try{const r=await client.callTool({name,arguments:args});if(r.isError&&JSON.parse(r.content[0].text).error==='Hosted tool queue is full; retry this read shortly.'){calls.push({round,tool:name,milliseconds:Math.round(performance.now()-started),ok:false,overloaded:true});return;}assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);calls.push({round,tool:name,milliseconds:Math.round(performance.now()-started),ok:true});}catch(error){calls.push({round,tool:name,milliseconds:Math.round(performance.now()-started),ok:false,error:error.message});}}));
 }
 running=false;await probes;assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
 const recovered=await clients[0].callTool({name:'get_text',arguments:{uid:'MN 10',limit:1}});assert.ok(!recovered.isError,'Server must recover after the burst');assert.equal(recovered.structuredContent.text_id,'mn10');
 const finalHealth=await(await fetch(url.replace('/mcp','/healthz'))).json();assert.equal(finalHealth.status,'ok');
 assert.equal(finalHealth.tool_worker.pending,0,'Worker queue must drain after recovery');
 if(fullCache)for(const cache of [finalHealth.cache,finalHealth.frontend_cache]){assert.equal(cache.max_bytes,64*1024*1024);assert.ok(cache.bytes>=cache.max_bytes*.99,'Cache pressure must remain after the workload');assert.ok(cache.bytes<=cache.max_bytes);}
 const overloaded=calls.filter(c=>c.overloaded).length,passed=calls.every(c=>c.ok||(allowOverload&&c.overloaded))&&health.every(h=>h.ok);
 const report={status:passed?(overloaded?'passed_with_overload':'passed'):'failed',node:process.version,clients:count,rounds,rate_limit_disabled:true,health_deadline_ms:healthMs,calls,health,cache_fill:cacheFill,reader_cache_fill:readerFill,final_cache:{worker:finalHealth.cache,frontend:finalHealth.frontend_cache},tool_worker:finalHealth.tool_worker,controlled_overload:overloaded,recovery_read:true,memory:memory(),network_attempts:0,synthetic_provider_fetches:(stderr.match(/SYNTHETIC_CACHE_FETCH/g)||[]).length,scope:'Cold and warm simultaneous tool calls through independent HTTP MCP clients, with separate health probes and the per-IP rate limiter disabled. Optional full caches use labelled synthetic non-scripture pages, never real provider requests. Does not impose CPU/memory limits itself or establish actual-host, live-provider or signed-in-client acceptance.'};
 if(reportPath)await writeFile(resolve(reportPath),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,clients:count,rounds,tool_calls:calls.length,tool_failures:calls.filter(c=>!c.ok&&!c.overloaded).length,controlled_overload:overloaded,health_checks:health.length,health_failures:health.filter(h=>!h.ok).length,max_health_ms:Math.max(...health.map(h=>h.milliseconds)),cache_fill:cacheFill,memory:report.memory,network_attempts:0}));if(!passed)process.exitCode=1;
}catch(error){if(reportPath)await writeFile(resolve(reportPath),JSON.stringify({status:'failed',error:error.message,calls,health,server_stderr_tail:stderr.slice(-2000)},null,2)+'\n');throw error;
}finally{
 running=false;clearTimeout(timer);if(probes)await probes;
 await Promise.allSettled(clients.map(c=>c.close()));if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(resolve=>child.once('exit',resolve));child.kill();await ended;}if(stage)await rm(stage,{recursive:true,force:true});
}
