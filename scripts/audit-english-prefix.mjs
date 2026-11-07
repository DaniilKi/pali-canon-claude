// Exercise packaged English continuation with synthetic provider text; all real outbound access is blocked.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-english-prefix-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`let calls=0;const text='Synthetic packaged English fixture. '.repeat(2000);globalThis.fetch=async url=>{if(!['www.dhammatalks.org','dhammatalks.org'].includes(new URL(url).hostname))throw Error('UNEXPECTED_NETWORK_ATTEMPT');calls++;return new Response('<div id="sutta">'+(calls>=3?'Inserted synthetic prefix. ':'')+text+'</div>')};const fail=()=>{throw Error('UNEXPECTED_NETWORK_ATTEMPT')};for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-english-prefix',version:'1'});let stderr='';
  const env={...process.env,PALI_CANON_CACHE_MB:'0',HOST:'127.0.0.1',PORT:'0',CHATGPT_WIDGET:'1',RATE_LIMIT_PER_MINUTE:'0'};
  if(mode==='stdio') {
   const t=new StdioClientTransport({command:process.execPath,args:['--require',guard,join(stage,'server/index.cjs')],cwd:join(stage,'empty'),env,stderr:'pipe'});
   t.stderr?.on('data',value=>{stderr+=value;});await client.connect(t);
  } else {
   child=spawn(process.execPath,['--require',guard,join(stage,'server/http.cjs')],{cwd:join(stage,'empty'),env,stdio:['ignore','ignore','pipe']});
   const url=await new Promise((resolve,reject)=>{
    timer=setTimeout(()=>reject(Error('Packaged HTTP server readiness timed out')),30000);
    child.once('error',reject);child.once('exit',code=>reject(Error(`Packaged HTTP server exited (${code})`)));
    child.stderr.on('data',value=>{stderr+=value;const m=stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/);if(m){clearTimeout(timer);resolve(m[1]);}});
   });await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  }
  const read=async call=>{const r=await client.callTool(call);assert.ok(!r.isError,JSON.stringify(r.content));return r.structuredContent;};
  const name=mode==='stdio'?'get_translation':'read_passage_widget';
  const first=await read({name,arguments:{uid:'MN 10',limit:mode==='stdio'?500:1}});
  const a=mode==='stdio'?first:first.english;assert.match(a.continue_with.arguments[mode==='stdio'?'prefix_sha256':'english_prefix_sha256'],/^[a-f0-9]{64}$/);
  const next=await read(a.continue_with);const b=mode==='stdio'?next:next.english;
  assert.equal(b.translation_id,a.translation_id);assert.equal(b.offset,a.next_offset);assert.ok(b.text.length);assert.equal(b.license,a.license);assert.equal(b.attribution,a.attribution);
  const changed=await client.callTool(a.continue_with);
  if(mode==='stdio'){assert.equal(changed.isError,true);assert.match(JSON.parse(changed.content[0].text).error,/prefix changed/);}
  else {assert.equal(changed.structuredContent.english,null);assert.match(changed.structuredContent.english_error,/prefix changed/);assert.deepEqual(changed.structuredContent.pali.segments,first.pali.segments);}
  const attached=await read({name:'get_text',arguments:{uid:'MN 10',limit:1,translation:'default'}});
  assert.match(attached.english.continue_with.arguments.prefix_sha256,/^[a-f0-9]{64}$/);await read(attached.english.continue_with);
  const compared=await read({name:'compare_translations',arguments:{uid:'MN 10',translations:['Thanissaro'],limit:500}});
  assert.match(compared.editions[0].continue_with.arguments.prefix_sha256,/^[a-f0-9]{64}$/);await read(compared.editions[0].continue_with);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,cases:7,stable_continuation:true,changed_prefix_refused:true,attached_and_compared_commands:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged MCP against synthetic English; no live source, signed-in host or immutable-edition acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
