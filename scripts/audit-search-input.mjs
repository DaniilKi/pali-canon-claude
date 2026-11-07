// Audit packaged search input integrity offline across both transports.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-search-integrity-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-search-integrity',version:'1'});let stderr='';
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
  let requests=0;
  const call=async (name,args)=>{requests++;return client.callTool({name,arguments:args});};
  const scopes=[['search_texts',{collection:'mn10',english:'off'}],['search_commentary',{books:['s0201a.att.xml']}],['search_post_canonical',{books:['vism']}],['search_source_book',{book:'s0201m'}]];
  for(const [name,options] of scopes) {
   for(const query of ['漢sati字','ηsati','สति','"sati" 漢']) {
    const r=await call(name,{query,limit:1,...options});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);
   }
   const baselines=new Map();
   for(const script of SCRIPTS) for(const phrase of ['sati','"sati"']) for(const offset of [0,1]) {
    const query=transliterate(phrase,'roman',script),r=await call(name,{query,offset,limit:1,...options});assert.ok(!r.isError,JSON.stringify(r.content));
    assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);
    const {input_script,input_romanized,...result}=r.structuredContent,key=phrase+offset;
    if(script==='roman') baselines.set(key,result);else {assert.deepEqual(result,baselines.get(key));assert.equal(input_script,script);assert.equal(input_romanized,phrase);}
    assert.ok((result.total_matched??result.total_texts_matched)>0);
   }
  }
  for(const english of ['auto','off','only']) {const r=await call('search_texts',{query:'漢mindfulness字',english,limit:1});assert.equal(r.isError,true);}
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,search_tools:4,unsupported_letters_not_discarded:true,complete_native_conversion:true,phrase_and_pagination_parity:true,source_commands_and_cautions_retained:true,english_modes_guarded:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged query integrity across four source search tools and eight scripts, including phrases and pagination. Existing reading commands and cautions retain parity. Not model-driven client acceptance, new source coverage or native-reader review.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
