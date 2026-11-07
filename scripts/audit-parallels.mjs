// Audit packaged parallel citation equivalence and ambiguity offline across both transports.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {getParallels} from '../src/parallels.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-native-parallels-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-native-parallels',version:'1'});let stderr='';
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
  const call=async args=>{requests++;return client.callTool({name:'get_parallels',arguments:args});};
  for(const script of SCRIPTS){
   for(const ref of ['MN 10','AN 3.65','Dhp 1-20','AN 1.296-305','A i 189','AN 3.65-65']) {
    const uid=transliterate(ref,'roman',script);
    for(const offset of [0,2]) {
     const args={uid,offset,limit:2},r=await call(args);
     assert.ok(!r.isError,JSON.stringify(r.content));
     assert.deepEqual(r.structuredContent,JSON.parse(JSON.stringify(getParallels(uid,args))));
     assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);
    }
   }
   for(const ref of ['AN 3.65-66','S i 57']) {
    const r=await call({uid:transliterate(ref,'roman',script)});
    assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/spans multiple texts|multiple canonical passages/);
   }
  }
  for(const uid of ['AN ๓.६५','漢AN 3.65字','ηAN 3.65','AN 3.65-9999']) assert.equal((await call({uid})).isError,true);
  for(const [uid,id] of [['AN ๓.๖๕','an3.65'],['MN ๑๐','mn10']]) { const r=await call({uid});assert.ok(!r.isError);assert.equal(r.structuredContent.text_id,id);assert.equal(r.structuredContent.input_script,'thai'); }
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,graph_and_pagination_parity:true,source_cautions_retained:true,ambiguous_scope_refused:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged parallel lookup parity across eight scripts. Recorded graph relations and source commands are unchanged; not exhaustive graph correctness, native-reader or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
