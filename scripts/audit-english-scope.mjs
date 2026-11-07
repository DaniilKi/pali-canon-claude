// Audit packaged English verification scope and actual-source provenance with synthetic English; no real network access.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import * as canon from '../src/canon.mjs';
import {englishScope} from '../src/verify.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-english-scope-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 const quote='This synthetic English review quotation has distinctive ordered tokens for checking scope without claiming correspondence to a particular verse';
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=async url=>{const u=new URL(url);if(!['www.dhammatalks.org','dhammatalks.org','www.accesstoinsight.org','accesstoinsight.org','ancient-buddhist-texts.net','www.ancient-buddhist-texts.net'].includes(u.hostname))return fail();console.error('SYNTHETIC_FETCH');if(u.hostname.includes('dhammatalks')&&u.pathname==='/suttas/AN/AN3_66.html')return new Response('Synthetic outage',{status:503});return new Response('<html><body><p>'+${JSON.stringify(quote)}+'</p></body></html>')};for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-english-scope',version:'1'});let stderr='';
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
  const call=async texts=>{requests++;return client.callTool({name:'verify_quote',arguments:{text:quote,language:'english',texts}});};
  const read=async texts=>{const r=await call(texts);assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);assert.equal(r.structuredContent.comparison.verbatim,'not_assessed');return r.structuredContent;};
  const native=(text,script)=>transliterate(text,'roman',script);
  for(const script of SCRIPTS){
   for(const ref of ['AN 3.65-66','S i 57']){const r=await call(['MN 10',native(ref,script)]);assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/spans multiple texts|multiple canonical passages/);}
   const ref=native('AN 3.65',script),r=await read([ref]),record=r.scope.requested_texts[0];assert.equal(r.input_script,undefined);assert.equal(record.reference,ref);assert.equal(record.text_id,'an3.65');assert.equal(record.input_script,script==='roman'?undefined:script);assert.match(record.notes.join(' '),/Also numbered AN 3.66/);
   const fallback=r.scope.translations_checked.find(p=>p.requested_translation_id?.startsWith('dt:'));assert.ok(fallback);assert.match(fallback.translation_id,/^ati:/);assert.match(fallback.notes.join(' '),/earlier version/);assert.match(fallback.scope_notes.join(' '),/Also numbered AN 3.66/);const match=r.matches.find(p=>p.translation_id===fallback.translation_id);assert.ok(match);assert.deepEqual(match.notes,fallback.notes);assert.equal(match.requested_translation_id,fallback.requested_translation_id);
  }
  const scoped=await read(['A i 189']);assert.match(scoped.scope.requested_texts[0].notes.join(' '),/PTS A i 189/);assert.match(scoped.scope.translations_checked[0].scope_notes.join(' '),/Also numbered AN 3.66/);
  const inherited=await read(['Dhp ๑๘๓']);assert.equal(inherited.verdict,'found');assert.match(inherited.explanation,/narrower requested text is not verified/);assert.equal(inherited.scope.requested_texts[0].input_script,'thai');for(const m of [...inherited.matches,...inherited.scope.translations_checked]){assert.deepEqual(m.unverified_requested_text_ids,['dhp183']);assert.deepEqual(m.requested_text_ids,['dhp183']);assert.match(m.scope_notes.join(' '),/does not verify correspondence/);assert.equal(m.text_id||canon.resolve(m.citation).unit.id,'dhp179-196');}
  const exact=await read(['Dhp 179-196']);assert.equal(exact.scope.requested_texts[0].translation_scope.kind,'direct');assert.ok(exact.matches.every(m=>m.unverified_requested_text_ids===undefined));
  const merged=await read(['Dhp 183','Dhp 184','Dhp 179-196']);assert.equal(merged.scope.translations_checked.length,englishScope(['Dhp 179-196']).pages.length);for(const m of merged.scope.translations_checked){assert.deepEqual(m.requested_text_ids,['dhp183','dhp184','dhp179-196']);assert.deepEqual(m.unverified_requested_text_ids,['dhp183','dhp184']);}
  const single=await read(['AN 3.65-65']);assert.match(single.scope.requested_texts[0].notes.join(' '),/identical endpoints/);
  for(const ref of ['AN ๓.६५','漢AN 3.65字','ηAN 3.65','AN 3.65-9999'])assert.equal((await call([ref])).isError,true);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,multi_text_and_ambiguous_scope_refused:true,native_citation_provenance:true,inherited_container_not_verse_proof:true,deduplicated_sources_keep_context:true,actual_fallback_identity_preserved:true,resolution_and_provider_notes_separate:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged English verification with synthetic HTML and a simulated primary outage; containing-source matches do not establish correspondence to narrower requested texts. Not live-provider, verbatim/authorship, native-reader or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
