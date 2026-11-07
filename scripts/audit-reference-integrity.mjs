// Audit packaged reference input integrity offline across both transports.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {resolveReference} from '../src/sutta-names.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-reference-integrity-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-reference-integrity',version:'1'});let stderr='';
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
  for(const script of SCRIPTS){
   const reference=transliterate('Satipaṭṭhāna Sutta','roman',script);
   const resolved=await call('resolve_reference',{reference});assert.ok(!resolved.isError,JSON.stringify(resolved.content));
   const r=resolved.structuredContent;assert.equal(r.id,'mn10');assert.equal(r.input_script,script==='roman'?undefined:script);assert.ok(r.also_named.length);assert.match(r.notes.join(' '),/other text/);
   const analysed=await call('analyse_passage',{uid:reference,limit:1});assert.ok(!analysed.isError,JSON.stringify(analysed.content));assert.equal(analysed.structuredContent.text_id,'mn10');assert.equal(analysed.structuredContent.input_script,script==='roman'?undefined:script);assert.match(analysed.structuredContent.segment.ref,/^mn10\//);
   const post=await call('resolve_reference',{reference:transliterate('Vism 1.1','roman',script)});assert.ok(!post.isError,JSON.stringify(post.content));assert.equal(post.structuredContent.canonical,false);assert.equal(post.structuredContent.read_with.tool,'get_post_canonical');
  }
  for(const reference of ['漢Satipatthana Sutta字','ηSatipatthana Sutta','สति']) {
   for(const [name,args] of [['resolve_reference',{reference}],['analyse_passage',{uid:reference,limit:1}]]) {const r=await call(name,args);assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);}
  }
  const ambiguous=await call('resolve_reference',{reference:'Metta sutta'});assert.equal(ambiguous.isError,true);
  const page=await call('resolve_reference',{reference:'S i 57'});assert.ok(!page.isError);assert.equal(page.structuredContent.id,'sn2.22');assert.ok(page.structuredContent.also_on_that_page.length);
  const roman=await call('resolve_reference',{reference:'Satipatthana Sutta'});assert.equal(roman.structuredContent.id,resolveReference('Satipatthana Sutta').unit.id);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,unsupported_letters_not_discarded:true,native_resolution_and_analysis:true,shared_name_cautions_retained:true,ambiguous_page_alternatives_retained:true,postcanonical_fallback_preserved:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged reference and analysis input integrity. Supported script names retain canonical and post-canonical identity; unsupported letters cannot disappear into a valid name. Not model-driven or signed-in-client acceptance, new source coverage or native-reader review.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
