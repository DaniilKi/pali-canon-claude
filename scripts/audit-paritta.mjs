// Audit packaged paritta native selectors and source-pinned continuations; no real network access.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import * as canon from '../src/canon.mjs';
import {PARITTA,paritta} from '../src/paritta.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-native-paritta-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-native-paritta',version:'1'});let stderr='';
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
  let requests=0,selections=0,continuations=0;
  const call=async args=>{requests++;return client.callTool({name:'paritta',arguments:args});};
  const read=async args=>{const r=await call(args);assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
  for(const entry of PARITTA)for(const source of entry.texts){
   const baseline=paritta(canon,{name:entry.name,text:source,limit:1});
   for(const script of SCRIPTS){
    const actual=await read({name:transliterate(entry.name,'roman',script),text:transliterate(source,'roman',script),limit:1});
    for(const key of ['key','text_id','citation','segments','source','terms','attribution','notes','english','chanting_books','continue_with','canonical_read_with'])assert.deepEqual(actual[key],baseline[key],`${entry.key}/${source}/${script}/${key}`);
    if(script==='roman'){assert.equal(actual.input_script,undefined);assert.equal(actual.text_input_script,undefined);}
    else{assert.equal(actual.input_script,script);assert.equal(actual.input_romanized,entry.name.toLowerCase());assert.equal(actual.text_input_script,script);assert.equal(actual.text_input_romanized,source.toLowerCase());}
    if(actual.continue_with){
     const {tool,...args}=actual.continue_with;assert.equal(tool,'paritta');const next=await read(args),expected=paritta(canon,args);
     assert.equal(next.text_id,actual.text_id);assert.deepEqual(next.segments,expected.segments);assert.deepEqual(next.continue_with,expected.continue_with);continuations++;
    }
    selections++;
   }
  }
  const handwritten=await read({name:'රතන',text:'Snp ๒.๑',limit:1});assert.equal(handwritten.text_id,'snp2.1');assert.equal(handwritten.input_script,'sinhala');assert.equal(handwritten.text_input_script,'thai');
  for(const args of [{name:'สति'},{name:'รต่น'},{name:'รตน',text:'MN ๑๐'},{text:'Snp ๒.๑'},{name:transliterate('papapapapapapa','roman','thai')}]){
   const r=await call(args);assert.equal(r.isError,true,JSON.stringify(args));assert.ok(JSON.parse(r.content[0].text).error);
  }
  assert.equal((await read({})).paritta.length,PARITTA.length);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,parittas:PARITTA.length,selections,continuations,source_parity:true,separate_selector_provenance:true,mixed_unknown_cross_source_refused:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged paritta selector parity across eight scripts; output remains Roman source text. Not chanting-book permissions, native-reader or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
