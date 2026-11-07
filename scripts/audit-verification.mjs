// Audit packaged native Pāli quotation verification with normalized-match/source cautions; no real network access.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import * as canon from '../src/canon.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {sourceQuoteFixtures} from './evidence/source-quotes.mjs';
import {verificationSpanFixtures,longVerificationQuote} from './evidence/verification-spans.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-native-verification-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-native-verification',version:'1'});let stderr='';
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
  let requests=0,comparisons=0;
  const json=value=>JSON.parse(JSON.stringify(value));
  const call=async args=>{requests++;return client.callTool({name:'verify_quote',arguments:args});};
  const read=async args=>{const r=await call(args);assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
  const native=(value,script)=>transliterate(value,'roman',script);
  const quoteFrom=ref=>canon.segments(canon.resolve(ref).unit).find(s=>s.type!=='heading').text.replace(/<[^>]+>/g,'').split(/\s+/).filter(w=>/\p{L}/u.test(w)).slice(0,12).join(' ');
  function source(r){const {quote,input_script,input_romanized,...rest}=r;return json(rest);}
  function cautious(r){assert.equal(r.comparison.method,'normalized_fuzzy');assert.equal(r.comparison.verbatim,'not_assessed');assert.match(r.comparison.note,/similarity of 1.*verbatim wording.*unique source or authorship/);assert.match(r.guidance,/not a judgement about who/);assert.equal(r.scope.attribution,canon.source().attribution);assert.equal(r.scope.terms,canon.source().terms);}
  for(const ref of ['Dhp 183','MN 10','SN 56.11']){
   const quote=quoteFrom(ref),expected=await verifyQuote({text:quote,language:'pali'});assert.equal(expected.verdict,'found');
   for(const script of SCRIPTS)for(const language of ['pali','auto']){
    const text=native(quote,script),r=await read({text,language});assert.deepEqual(source(r),source(expected));assert.equal(r.quote,text);assert.equal(r.input_script,script==='roman'?undefined:script);if(script!=='roman')assert.ok(r.input_romanized);cautious(r);comparisons++;
    if(ref==='Dhp 183'){assert.ok(r.matches.some(m=>m.text_id==='dhp183'));assert.ok(r.equally_similar_texts>1);assert.match(r.citation_note,/not a unique source/);}
   }
  }
  const normalized=await read({text:canon.fold(quoteFrom('Dhp 183')).toUpperCase().replace(/\s+/g,' , '),language:'pali'});assert.equal(normalized.best_similarity,1);cautious(normalized);assert.match(normalized.explanation,/normalized similarity/);
  for(const script of SCRIPTS)for(const language of ['pali','auto']){const r=await call({text:native(Array(121).fill('sati').join(' '),script),language});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/120 words.*no partial comparison/);}
  for(const text of ['สति สติ สติ','ส่ติ สติ สติ','漢sati sati sati字','ηsati sati sati'])for(const language of ['pali','auto','english']){const r=await call({text,language});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);}
  let sourceReadings=0;
  const squash=text=>text.replace(/\s+/gu,' ').trim(),dense=text=>canon.fold(text).replace(/[^a-z0-9]/gu,'');
  async function followSpan(hit) {
   const span=hit.source_span;assert.ok(span);assert.equal(hit.segment_ref,span.first_segment_ref);assert.deepEqual(hit.read_with,hit.reading_commands[0]);let next=span.offset;const segments=[];
   for(const {tool,...args}of hit.reading_commands){assert.equal(tool,'get_text');assert.equal(args.uid,hit.text_id);assert.equal(args.offset,next);assert.ok(args.limit>=1&&args.limit<=200);requests++;sourceReadings++;const r=await client.callTool({name:tool,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));assert.equal(r.structuredContent.text_id,hit.text_id);assert.equal(r.structuredContent.returned,args.limit);segments.push(...r.structuredContent.segments);next+=args.limit;}
   assert.equal(next,span.end_offset);assert.equal(segments.length,span.segments);assert.equal(segments[0].ref,span.first_segment_ref);assert.equal(segments.at(-1).ref,span.last_segment_ref);const text=segments.map(s=>s.text).join('\n');assert.ok(squash(text).includes(squash(hit.matched_text.replace(/…$/u,''))));return text;
  }
  const anchorFixtures=verificationSpanFixtures();assert.equal(anchorFixtures.length,13);let targetHits=0;
  for(const f of anchorFixtures){const r=await read({text:f.quote,language:'pali',limit:10});assert.equal(r.verdict,'found');for(const hit of r.matches)await followSpan(hit);const target=r.matches.find(m=>m.text_id===f.uid&&m.similarity===1);if(target){targetHits++;assert.equal(target.segment_ref,f.expected_ref);assert.notEqual(target.segment_ref,f.earlier_ref);assert.equal(dense(target.matched_text),dense(f.quote));}}
  assert.ok(targetHits>=10);
  for(const script of SCRIPTS){const f=anchorFixtures[0],r=await read({text:native(f.quote,script),language:'pali',limit:10}),target=r.matches.find(m=>m.text_id===f.uid&&m.similarity===1);assert.ok(target);assert.equal(target.segment_ref,f.expected_ref);assert.ok(dense(await followSpan(target)).includes(dense(f.quote)));}
  const longQuote=longVerificationQuote(),longResult=await read({text:longQuote,language:'pali',limit:5}),longHit=longResult.matches.find(m=>m.similarity===1);assert.ok(longHit);assert.equal(longHit.matched_text_truncated,true);assert.ok(dense(longQuote).startsWith(dense(longHit.matched_text)));assert.ok(dense(await followSpan(longHit)).includes(dense(longQuote)));
  const marked=canon.load().canon.books.find(b=>b.file==='s0504m.mul.xml').blocks[1164][2].split('ः')[0],markedResult=await read({text:marked,language:'pali',limit:10}),markedHit=markedResult.matches.find(m=>m.text_id==='iti112');assert.ok(markedHit);assert.ok(markedHit.matched_text.endsWith('ः'));await followSpan(markedHit);
  const literalFixtures=sourceQuoteFixtures();assert.equal(literalFixtures.length,19);let repeatedSourceChecked=false;
  for(const fixture of literalFixtures)for(const language of ['pali','auto']) {
   const r=await read({text:fixture.text,language,limit:1});assert.equal(r.quote,fixture.text);assert.equal(r.verdict,'found');assert.equal(r.comparison.method,'literal_source_substring');assert.equal(r.comparison.verbatim,'not_assessed');assert.equal(r.input_script,undefined);assert.equal(r.input_romanized,undefined);assert.equal(r.source_literal.native_conversion,false);assert.ok(r.source_literal.matching_blocks>=1);assert.equal(r.source_literal.returned_blocks,1);assert.equal(r.thresholds.found,undefined);
   const m=r.matches[0],{tool,...args}=m.read_with;requests++;const sourceRead=await client.callTool({name:tool,arguments:args});assert.ok(!sourceRead.isError);assert.equal(sourceRead.structuredContent.segments[0].ref,m.segment_ref);assert.ok(sourceRead.structuredContent.segments[0].text.includes(fixture.text));assert.equal(m.matched_text,fixture.text);
   if(!repeatedSourceChecked&&r.source_literal.matching_blocks>1) {const repeated=await read({text:fixture.text,language:'pali',limit:2});assert.equal(repeated.source_literal.matching_blocks,r.source_literal.matching_blocks);assert.equal(repeated.matches.length,2);assert.equal(new Set(repeated.matches.map(m=>m.segment_ref)).size,2);repeatedSourceChecked=true;}
  }
  assert.equal(repeatedSourceChecked,true);
  for(const args of [{text:'漢'+literalFixtures[0].text,language:'pali'},{text:literalFixtures[0].text,language:'english'},{text:'Mrammaraṭṭhe mौṃjvānagare leḍītīaraññavihāravāsinā mahā therena katāyaṃ paccayuddesadīpanī.',language:'pali'}]) assert.equal((await call(args)).isError,true);
  const badMode=await call({text:native(quoteFrom('Dhp 183'),'thai'),language:'english'});assert.equal(badMode.isError,true);assert.match(JSON.parse(badMode.content[0].text).error,/English mode requires/);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,source_comparisons:comparisons,source_window_cases:anchorFixtures.length,source_reading_commands:sourceReadings,source_position_anchors:true,complete_spans_and_safe_previews:true,literal_canonical_fixtures:literalFixtures.length,literal_source_identity_and_commands:true,repeated_literal_sources_preserved:repeatedSourceChecked,original_input_preserved:true,normalized_not_verbatim:true,repeated_sources_preserved:true,word_limits_and_invalid_modes_refused:true,source_parity:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged native Pāli verification across eight scripts using bundled-source quotations; normalized fuzzy comparison is not verbatim proof, unique attribution or authorship. Not live-English, native-reader or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
