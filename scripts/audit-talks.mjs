// Audit packaged talk-search scope and pagination using synthetic titles; all real outbound access is blocked.
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
 stage=await mkdtemp(join(tmpdir(),'pali-talk-pagination-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`globalThis.fetch=async url=>{const u=new URL(url);if(!['www.dhammatalks.org','dhammatalks.org'].includes(u.hostname)||u.pathname!=='/search/')throw Error('UNEXPECTED_NETWORK_ATTEMPT');const c=u.searchParams.get('cat'),q=u.searchParams.get('q');let body='<ol>';for(let i=0;i<3;i++)body+='<li class="li-audio search-result"><a href="/audio/'+c+'/2026/fixture-'+i+'.html">Synthetic '+q+' '+c+' result '+i+'</a></li>';return new Response(body+'</ol>')};const fail=()=>{throw Error('UNEXPECTED_NETWORK_ATTEMPT')};for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-talk-pagination',version:'1'});let stderr='';
  const env={...process.env,PALI_CANON_CACHE_MB:'64',HOST:'127.0.0.1',PORT:'0',CHATGPT_WIDGET:'1',RATE_LIMIT_PER_MINUTE:'0'};
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
  const call=async args=>{requests++;return client.callTool({name:'find_talks',arguments:args});};
  const read=async args=>{const r=await call(args);assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
  let page=await read({query:'metta',limit:1});const cursor=page.next_cursor,results=[...page.results];
  assert.ok(cursor.length<=100);
  while(page.has_more){page=await read({query:'metta',limit:1,cursor:page.next_cursor});results.push(...page.results);assert.ok(requests<=6);}
  assert.deepEqual(results.map(r=>r.category),['evening','morning','evening','morning','evening','morning']);
  assert.equal(new Set(results.map(r=>r.url)).size,6);assert.match(page.notes[0],/Links only/);assert.match(page.notes[1],/not scripture/);
  for(const changed of [{query:'jhana'},{query:'metta',category:'evening'},{query:'metta',passage:'AN 3.65'}]){
   const r=await call({...changed,cursor});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/cursor.*different/i);
  }
  for(const legacy of ['evening:1:1','']){const r=await call({query:'metta',cursor:legacy});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/cursor/i);}
  const mixed=[];let next;
  for(const limit of [3,2,1]){const p=await read({query:'jhana',limit,...(next?{cursor:next}:{})});mixed.push(...p.results);next=p.next_cursor;}
  assert.equal(next,undefined);assert.equal(new Set(mixed.map(r=>r.url)).size,6);assert.deepEqual(mixed.map(r=>r.category),['evening','morning','evening','morning','evening','morning']);
  const passage=await read({passage:'AN 3.65',query:'jhāna',category:'morning',limit:1});
  const alias=await read({passage:'an3.65',query:'jhana',category:'morning',limit:2,page:9,cursor:passage.next_cursor});
  assert.equal(alias.returned,2);assert.equal(alias.has_more,false);assert.match(alias.notes.join(' '),/not that the talk is about this sutta/);
  const generic=await call({passage:'Dhp 183',cursor});assert.equal(generic.isError,true);assert.match(JSON.parse(generic.content[0].text).error,/no distinctive/);
  const native=(value,script)=>transliterate(value,'roman',script);
  function provenance(result,script,text,prefix=''){assert.equal(result[prefix+'input_script'],script==='roman'?undefined:script);assert.equal(result[prefix+'input_romanized'],script==='roman'?undefined:text.toLowerCase());}
  const nativeFirst=await read({query:'jhāna',passage:'AN 3.65',limit:1});
  const nextSource=await read({query:'jhana',passage:'an3.65',limit:3,cursor:nativeFirst.next_cursor});
  for(const script of SCRIPTS){
   const r=await read({query:native('jhāna',script),passage:native('AN 3.65',script),limit:3,cursor:nativeFirst.next_cursor});
   const {input_script,input_romanized,passage_input_script,passage_input_romanized,...source}=r;assert.deepEqual(source,nextSource);provenance(r,script,'jhāna');provenance(r,script,'AN 3.65','passage_');
   const stopped=await read({passage:native('SN 48.42',script)});assert.equal(stopped.searched_for,null);assert.equal(stopped.results.length,0);provenance(stopped,script,'SN 48.42','passage_');
   for(const args of [{query:native('sati',script),passage:native('AN 3.65',script)},{query:native('jhāna',script),passage:native('AN 3.66',script)}]){const bad=await call({...args,cursor:nativeFirst.next_cursor});assert.equal(bad.isError,true);assert.match(JSON.parse(bad.content[0].text).error,/cursor.*different|no distinctive/i);}
  }
  const cross=[];let crossCursor;
  for(const script of SCRIPTS.slice(0,6)){const r=await read({query:native('sati',script),limit:1,...(crossCursor?{cursor:crossCursor}:{})});cross.push(...r.results);crossCursor=r.next_cursor;assert.equal(r.searched_for,'sati');}
  assert.equal(crossCursor,undefined);assert.equal(new Set(cross.map(r=>r.url)).size,6);assert.deepEqual(cross.map(r=>r.category),['evening','morning','evening','morning','evening','morning']);
  const separate=await read({query:'ඣාන',passage:'AN ๓.๖๕',limit:1});assert.equal(separate.input_script,'sinhala');assert.equal(separate.passage_input_script,'thai');assert.equal(separate.passage_input_romanized,'AN 3.65');
  const handwritten=await read({query:'สติ',category:'evening'});assert.equal(handwritten.searched_for,'sati');assert.equal(handwritten.input_romanized,'sati');
  const quoted=await read({query:'“สติ สมาธิ”',category:'evening'});assert.equal(quoted.searched_for,'"sati samadhi"');
  for(const value of ['สति','ส่ติ','漢sati字','ηsati'])for(const args of [{query:value},{passage:value}]){const bad=await call(args);assert.equal(bad.isError,true);assert.match(JSON.parse(bad.content[0].text).error,/converted completely/);}
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,changed_scope_refused:true,legacy_cursor_refused:true,round_robin_retained:true,normalized_passage_and_query:true,native_scripts:SCRIPTS.length,separate_input_provenance:true,cross_script_cursor_scope:true,native_no_search_safeguards:true,link_only_labels:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged talk search against synthetic HTML; no live-provider, signed-in-client or immutable search-result acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
