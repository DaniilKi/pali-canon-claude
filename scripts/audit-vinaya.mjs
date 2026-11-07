// Audit packaged native Vinaya rule selectors and source-preserving BMC links; no real network access.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import * as canon from '../src/canon.mjs';
import {vinayaRule,ruleKeys,AS_PASSAGE} from '../src/vinaya-bmc.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-native-vinaya-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-native-vinaya',version:'1'});let stderr='';
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
  let requests=0,selections=0,sourceReadings=0,introductionReads=0;
  const call=async (name,args)=>{requests++;return client.callTool({name,arguments:args});};
  const read=async (name,args)=>{const r=await call(name,args);assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
  const native=(value,script)=>transliterate(value,'roman',script);
  function same(actual,expected,script,selector){
   const {input_script,input_romanized,...source}=actual;assert.deepEqual(source,expected);
   if(script==='roman'){assert.equal(input_script,undefined);assert.equal(input_romanized,undefined);}
   else{assert.equal(input_script,script);assert.equal(input_romanized,selector.toLowerCase());}
  }
  async function location(command,whole=false){
   const {tool,...args}=command;assert.equal(tool,'get_text');const r=await read(tool,whole?args:{...args,limit:1});
   const unit=canon.resolve(args.uid).unit;assert.equal(r.text_id,unit.id);assert.deepEqual(r.segments,canon.segments(unit).slice(0,whole?r.limit:1));assert.deepEqual(r.source,canon.source());sourceReadings++;
   return r;
  }
  for(const key of ruleKeys()){
   const expected=vinayaRule(`pli-tv-bu-vb-${key}`,canon);
   for(const script of SCRIPTS){let actual;
    for(const selector of [expected.rule,`${expected.class} ${expected.number}`,expected.canonical_text.id]){actual=await read('vinaya_rule',{rule:native(selector,script)});same(actual,expected,script,selector);selections++;}
    assert.match(actual.buddhist_monastic_code.kind,/commentary.*linked only/);assert.match(actual.buddhist_monastic_code.attribution.note,/not scripture/);assert.equal(actual.buddhist_monastic_code.text,undefined);
    const page=await location(actual.canonical_text.reading_command,key.startsWith('as'));
    if(key.startsWith('as')){assert.equal(page.text_id,AS_PASSAGE);assert.match(actual.notes.join(' '),/one paragraph/);assert.doesNotMatch(page.segments.map(s=>s.text).join(' '),/Bhikkhunīvibhaṅg/);await location(actual.canonical_text.introduction.read_with,true);introductionReads++;}
   }
  }
  for(const script of SCRIPTS){
   for(const rule of ['Pj Pc 5','Pj 1 Pc 5','Pc 5/6','Pc -5','Pc +5','Pc 1.5','Pj 5','Pc 0','MN 10','As 1-7','Bi Pc 5','Bi Nissaggiya Pācittiya 5','Vin iv 185','Vin iv 186']){const r=await call('vinaya_rule',{rule:native(rule,script)});assert.equal(r.isError,true,rule);const message=JSON.parse(r.content[0].text).error;assert.ok(message);if(rule.startsWith('Vin '))assert.match(message,/more than one canonical passage/);if(rule.startsWith('Bi '))assert.match(message,/bhikkhunī rule/);if(rule==='As 1-7')assert.match(message,/group of rules/);}
   const full=await read('get_text',{uid:native('Nissaggiya Pācittiya 5',script),limit:1});assert.equal(full.text_id,'pli-tv-bu-vb-np5');
  }
  for(const rule of ['ปาจิตฺติย ๕','Pc ๕']){const actual=await read('vinaya_rule',{rule});assert.equal(actual.rule,'Pc 5');assert.equal(actual.input_script,'thai');}
  for(const rule of ['ปาจิตฺतिย ๕','ป่าจิตฺติย ๕','漢Pc 5字','ηPc 5']){const r=await call('vinaya_rule',{rule});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);}
  const unique=await read('vinaya_rule',{rule:'Vin iii 46'});assert.equal(unique.canonical_text.id,canon.resolve('Vin iii 46').unit.id);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,rules:ruleKeys().length,selections,source_readings:sourceReadings,introduction_reads:introductionReads,source_parity:true,modern_commentary_link_only:true,shared_samatha_preserved:true,mixed_ambiguous_invalid_out_of_scope_refused:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged Vinaya selector parity across eight scripts with original source descriptions, shared/grouped-source cautions and linked-only BMC attribution. Not native-reader, community ruling or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
