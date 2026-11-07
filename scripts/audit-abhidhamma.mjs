// Audit packaged Abhidhamma native selectors and exact source-definition commands; no real network access.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import * as canon from '../src/canon.mjs';
import {condition,matika,buildConditions,buildMatika} from '../src/abhidhamma.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-native-abhidhamma-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-native-abhidhamma',version:'1'});let stderr='';
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
  let requests=0,conditionSelections=0,matikaSelections=0,sourceReadings=0;
  const call=async (name,args)=>{requests++;return client.callTool({name,arguments:args});};
  const read=async (name,args)=>{const r=await call(name,args);assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
  const native=(value,script)=>transliterate(value,'roman',script);
  function same(actual,expected,script,selector){
   const {input_script,input_romanized,...source}=actual;
   assert.deepEqual(source,expected);
   if(script==='roman'||native(selector,script)===selector.toLowerCase()){assert.equal(input_script,undefined);assert.equal(input_romanized,undefined);}
   else{assert.equal(input_script,script);assert.equal(input_romanized,selector.toLowerCase());}
  }
  async function location(where){
   const {tool,...args}=where.read_with;const r=await read(tool,args);
   const all=canon.segments(canon.resolve(where.text_id).unit),expected=all.slice(args.offset,args.offset+args.limit);
   assert.deepEqual(r.segments,expected);assert.equal(r.text_id,where.text_id);assert.equal(r.returned,expected.length);assert.deepEqual(r.source,canon.source());sourceReadings++;
  }
  for(const row of buildConditions())for(const script of SCRIPTS){
   const baseline=condition(String(row.number)),root=row.name.replace(/paccayo$/i,'');
   for(const selector of [row.name,root,`${root} paccaya`,String(row.number)]){
    const actual=await read('patthana_condition',{name:native(selector,script)});same(actual,baseline,script,selector);conditionSelections++;
   }
   await location(baseline.condition.definition);await location(baseline.condition.listed_in);
  }
  for(const section of buildMatika()){
   const selectors=[section.key,section.text_id,...section.entries.map(e=>`${e.kind} ${e.number}`),...new Set(section.entries.map(e=>e.group).filter(Boolean))];
   for(const selector of selectors)for(const script of SCRIPTS){same(await read('abhidhamma_matika',{section:native(selector,script)}),matika(selector),script,selector);matikaSelections++;}
  }
  for(const script of SCRIPTS){
   for(const selector of ['all','list'])same(await read('patthana_condition',{name:native(selector,script)}),condition(selector),script,selector);
   same(await read('abhidhamma_matika',{section:native('all',script)}),matika(),script,'all');
   for(const selector of ['hetu ārammaṇa','anantara samanantara','0','25','-1','+1','1.5','1/2','all!','papapapapapa']){
    const r=await call('patthana_condition',{name:native(selector,script)});assert.equal(r.isError,true,selector);assert.ok(JSON.parse(r.content[0].text).error);
   }
   for(const selector of ['tika -1','duka 1.5','duka 1/2','tika +2','tika 1-2','tika duka','all!']){const r=await call('abhidhamma_matika',{section:native(selector,script)});assert.equal(r.isError,true,selector);}
  }
  for(const name of ['เหตุ','๑'])assert.equal((await read('patthana_condition',{name})).condition.number,1);
  assert.equal((await read('abhidhamma_matika',{section:'ติก ๕'})).entries[0].number,5);
  for(const name of ['漢字','漢hetu字','ηhetu','!!!','สति','เห่ตุ'])assert.equal((await call('patthana_condition',{name})).isError,true);
  for(const section of ['漢hetu字','ηhetu'])assert.equal((await call('abhidhamma_matika',{section})).isError,true);
  for(const [tool,args] of [['lookup_pali',{word:'漢sati字'}],['glossary',{term:'漢sati字',direction:'pa-en'}],['lookup_name',{name:'漢sāriputta字'}],['paritta',{name:'漢ratana字'}]]){
   const r=await call(tool,args);assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);
  }
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,conditions:24,condition_selections:conditionSelections,matika_entries:164,matika_selections:matikaSelections,source_readings:sourceReadings,source_parity:true,unknown_ambiguous_malformed_refused:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged Abhidhamma selector parity across eight scripts; original Roman definitions and dictionary pointers retained. Not native-reader, doctrinal interpretation or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
