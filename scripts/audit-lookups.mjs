// Audit packaged word/name lookups in eight scripts with a simulated dictionary outage; no real network access.
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
 stage=await mkdtemp(join(tmpdir(),'pali-native-lookups-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-native-lookups',version:'1'});let stderr='';
  const env={...process.env,PALI_CANON_CACHE_MB:'0',PALI_CANON_SIMULATE_OUTAGE:'www.dpdict.net,dpdict.net',HOST:'127.0.0.1',PORT:'0',CHATGPT_WIDGET:'1',RATE_LIMIT_PER_MINUTE:'0'};
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
  let requests=0,baseline;
  const call=async (name,args)=>{requests++;return client.callTool({name,arguments:args});};
  const read=async (name,args)=>{const r=await call(name,args);assert.ok(!r.isError,JSON.stringify(r.content));return r.structuredContent;};
  for(const script of SCRIPTS){
   const word=transliterate('sati','roman',script),name=transliterate('sāriputta','roman',script);
   const g=await read('glossary',{term:word,direction:'pa-en'}),d=await read('lookup_pali',{word,limit:1}),n=await read('lookup_name',{name,textLimit:2});
   assert.ok(g.found);assert.ok(d.entries.length);assert.equal(d.offline,true);assert.equal(d.license.name,'CC BY-NC-SA 4.0');assert.ok(d.dictionary.version);assert.ok(n.appears_in.texts.length);
   if(script==='roman'){baseline={g,d,n};for(const r of [g,d,n])assert.equal(r.input_script,undefined);}
   else{
    for(const [r,roman] of [[g,'sati'],[d,'sati'],[n,'sāriputta']]){assert.equal(r.input_script,script);assert.equal(r.input_romanized,roman);}
    assert.deepEqual(g.pali_to_english,baseline.g.pali_to_english);assert.deepEqual(g.sources,baseline.g.sources);
    assert.deepEqual(d.entries,baseline.d.entries);assert.deepEqual(d.license,baseline.d.license);assert.equal(d.inferred_spelling,undefined);
    assert.deepEqual(n.appears_in,baseline.n.appears_in);assert.deepEqual(n.dictionary,baseline.n.dictionary);assert.deepEqual(n.entries,baseline.n.entries);
   }
  }
  for(const [tool,args] of [['glossary',{term:'สति',direction:'pa-en'}],['lookup_pali',{word:'สति'}],['lookup_name',{name:'สति'}]]){
   const r=await call(tool,args);assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);
  }
  const unknown=transliterate('papapapapapapapapapa','roman','thai');
  assert.equal((await read('glossary',{term:unknown,direction:'pa-en'})).found,0);
  const missing=await call('lookup_pali',{word:unknown});assert.equal(missing.isError,true);assert.match(JSON.parse(missing.content[0].text).error,/not in the bundled/);
  assert.ok((await read('glossary',{term:'mindfulness',direction:'en-pa'})).found);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,lookup_tools:3,source_parity:true,dictionary_fallback_labelled:true,mixed_script_refused:true,unknown_not_invented:true,dppn_status:baseline.n.dictionary.status,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged lookup parity with simulated DPD outage across eight scripts; not live-provider, native-reader, new dictionary-rights or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
