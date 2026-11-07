// Audit packaged native topic and numbered-list selectors with source-preserving navigation; no real network access.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import * as canon from '../src/canon.mjs';
import {topic,listTopics,dhammaList,listsIndex} from '../src/topics.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-native-topics-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-native-topics',version:'1'});let stderr='';
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
  let requests=0,topicSelections=0,catalogueQueries=0,listSelections=0,sourceReadings=0,alternativeReads=0;
  const call=async (name,args)=>{requests++;return client.callTool({name,arguments:args});};
  const read=async (name,args)=>{const r=await call(name,args);assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
  const native=(value,script)=>transliterate(value,'roman',script);
  function same(actual,expected,script,selector){
   const {input_script,input_romanized,...source}=actual;assert.deepEqual(source,expected);
   if(script==='roman'){assert.equal(input_script,undefined);assert.equal(input_romanized,undefined);}
   else{assert.equal(input_script,script);assert.equal(input_romanized,selector.toLowerCase());}
  }
  async function location(command){
   const {tool,...args}=command;assert.equal(tool,'get_text');const r=await read(tool,{...args,limit:1});
   const unit=canon.resolve(args.uid).unit;assert.equal(r.text_id,unit.id);assert.deepEqual(r.segments,canon.segments(unit).slice(0,1));assert.deepEqual(r.source,canon.source());sourceReadings++;
  }
  for(const selector of ['sati','kamma','upekkhā','jhāna','brahma','paṭiccasamuppāda','satipaṭṭhāna'])for(const script of SCRIPTS){
   const name=native(selector,script),actual=await read('topic',{name});same(actual,topic(canon,selector),script,selector);topicSelections++;await location(actual.texts[0].read_with);
   for(const index of ['all','subject','numerical'])for(const offset of [0,1]){same(await read('list_topics',{query:name,index,offset,limit:1}),listTopics({query:selector,index,offset,limit:1}),script,selector);catalogueQueries++;}
   if(actual.other_matches?.length){const next=actual.other_matches[0],{tool,...args}=next.read_with;assert.equal((await read(tool,args)).topic.slug,next.slug);alternativeReads++;}
  }
  for(const entry of listsIndex().lists)for(const script of SCRIPTS){
   const actual=await read('dhamma_list',{name:native(entry.pali,script)});same(actual,dhammaList(canon,entry.pali),script,entry.pali);assert.equal(actual.slug,entry.slug);listSelections++;await location(actual.defined_in[0].read_with);
  }
  for(const script of SCRIPTS){const actual=await read('dhamma_list',{name:native('jhāna',script)});same(actual,dhammaList(canon,'jhāna'),script,'jhāna');assert.ok(actual.other_matches.length);const next=actual.other_matches[0],{tool,...args}=next.read_with;assert.equal((await read(tool,args)).slug,next.slug);alternativeReads++;}
  for(const selector of ['สติ','กมฺม'])for(const tool of ['topic','list_topics','dhamma_list']){const r=await read(tool,tool==='list_topics'?{query:selector}:{name:selector});assert.equal(r.input_script,'thai');}
  const numbered=await read('topic',{name:'๕ hindrances'});assert.equal(numbered.topic.slug,'n5-hindrances');assert.equal(numbered.input_romanized,'5 hindrances');
  for(const value of ['สति','ส่ติ','漢sati字','ηsati'])for(const tool of ['topic','list_topics','dhamma_list']){const r=await call(tool,tool==='list_topics'?{query:value}:{name:value});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);}
  for(const script of SCRIPTS){const name=native('papapapapapapa',script);assert.equal((await call('topic',{name})).isError,true);assert.equal((await call('dhamma_list',{name})).isError,true);assert.equal((await read('list_topics',{query:name})).total,0);}
  assert.equal((await read('dhamma_list',{})).lists.length,listsIndex().lists.length);assert.equal((await read('list_topics',{})).total,listTopics().total);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,curated_lists:listsIndex().lists.length,topic_selections:topicSelections,catalogue_queries:catalogueQueries,list_selections:listSelections,source_readings:sourceReadings,alternative_reads:alternativeReads,source_parity:true,ranked_alternatives_preserved:true,mixed_unknown_refused_or_empty:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged topic/list selector parity across eight scripts with unchanged index ranking and explicit alternatives; original labels/glosses and source policy retained. Not native-reader, index interpretation or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
