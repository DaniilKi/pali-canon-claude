// Audit packaged search input integrity offline across both transports.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {sourceGrammarFixtures} from './evidence/source-phrases.mjs';
import {sourceQuoteFixtures} from './evidence/source-quotes.mjs';
import {auditQuotedWording} from './evidence/quoted-wording.mjs';
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
   for(const query of ['漢sati字','ηsati','สति','"sati" 漢','sati١','sati²','สติ١']) {
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
  for(const [name,options] of scopes) {
   const r=await call(name,{query:'"saौti"',limit:1,...options});assert.ok(!r.isError,JSON.stringify(r.content));assert.ok((r.structuredContent.total_matched??r.structuredContent.total_texts_matched)>0);assert.equal(r.structuredContent.input_script,undefined);assert.match(r.structuredContent.query_note,/kept as entered.*diacritic-insensitive/);
   for(const query of ['saौti','"ส่ติ"']) assert.equal((await call(name,{query,limit:1,...options})).isError,true);
  }
  const actual=await call('search_post_canonical',{query:'"Mrammaraṭṭhe mौṃjvānagare leḍītīaraññavihāravāsinā mahā therena katāyaṃ paccayuddesadīpanī."',books:['patthanuddesa-dipanipatha'],limit:1});assert.ok(!actual.isError,JSON.stringify(actual.content));assert.ok(actual.structuredContent.total_matched>0);
  const {tool,...args}=actual.structuredContent.results[0].read_with,read=await call(tool,args);assert.ok(!read.isError);assert.ok(read.structuredContent.segments.some(s=>s.text.includes('mौṃjvānagare')));
  for(const english of ['auto','off','only']) {const r=await call('search_texts',{query:'漢mindfulness字',english,limit:1});assert.equal(r.isError,true);}
  for(const [name,options]of scopes)for(const query of ['"漢sati字"','"sati١"','"sati²"']) {const r=await call(name,{query,limit:1,...options});assert.ok(!r.isError);const x=r.structuredContent;assert.equal(x.query,query);assert.equal(x.query_mode,'source_phrase');assert.equal(x.total_matched??x.total_texts_matched,0);assert.equal(x.input_normalised,undefined);assert.equal(x.expanded_from_english,undefined);assert.equal(x.spelling_note,undefined);}
  for(const english of ['auto','off']) {const r=await call('search_texts',{query:'"漢mindfulness字"',english,limit:1});assert.ok(!r.isError);assert.equal(r.structuredContent.total_texts_matched,0);assert.equal(r.structuredContent.expanded_from_english,undefined);}
  assert.equal((await call('search_texts',{query:'"漢mindfulness字"',english:'only',limit:1})).isError,true);
  const fixtures=sourceGrammarFixtures();assert.equal(fixtures.length,7);
  for(const f of fixtures)for(const script of SCRIPTS) {
   const r=await call('search_post_canonical',{query:f.query,books:[f.book],script,limit:1});assert.ok(!r.isError,JSON.stringify(r.content));const x=r.structuredContent;assert.equal(x.query,f.query);assert.equal(x.query_mode,'source_phrase');assert.equal(x.canonical,false);assert.equal(x.input_script,undefined);assert.equal(x.input_normalised,undefined);assert.ok(x.total_matched>0);
   const hit=x.results[0];assert.equal(hit.book_id,f.book);
   for(const command of [hit.read_with,hit.context_with]) {const {tool,...args}=command;assert.equal(args.script,script);const read=await call(tool,args);assert.ok(!read.isError);assert.equal(read.structuredContent.canonical,false);const text=read.structuredContent.segments.map(s=>s.text).join('\n');for(const glyph of f.glyphs)assert.ok(text.includes(glyph));if(script==='roman')assert.ok(text.includes(f.phrase));}
  }
  const canonical=sourceQuoteFixtures().find(f=>f.text.includes('ऋ')),root=await call('search_texts',{query:'"'+canonical.text+'"',collection:'ne37',limit:1});assert.ok(!root.isError);assert.equal(root.structuredContent.query_mode,'source_phrase');assert.equal(root.structuredContent.results[0].id,'ne37');const {tool:rootTool,...rootArgs}=root.structuredContent.results[0].read_with,rootRead=await call(rootTool,rootArgs);assert.ok(!rootRead.isError);assert.ok(rootRead.structuredContent.segments.some(s=>s.text.includes(canonical.text)));
  const combined=await call('search_texts',{query:'“'+fixtures[0].phrase+'”',include_post_canonical:true,limit:1});assert.ok(!combined.isError);assert.equal(combined.structuredContent.query_mode,'source_phrase');assert.ok(combined.structuredContent.post_canonical.total_matched>0);assert.equal(combined.structuredContent.post_canonical.canonical,false);

  const quotedWording=await auditQuotedWording({callTool:params=>call(params.name,params.arguments)});
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,search_tools:4,unsupported_letters_not_discarded:true,complete_native_conversion:true,phrase_and_pagination_parity:true,source_commands_and_cautions_retained:true,english_modes_guarded:true,quoted_roman_source_marks_preserved:true,grammar_source_cases:fixtures.length,source_glyphs_and_context_preserved:true,unsupported_numerals_not_discarded:true,quoted_wording:quotedWording,network_attempts:0});
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
