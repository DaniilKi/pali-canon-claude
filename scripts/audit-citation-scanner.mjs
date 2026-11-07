// Audit packaged citation scanning and original offsets offline across both transports.
import assert from 'node:assert/strict';
import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {findCitations} from '../src/find-citations.mjs';
import * as canon from '../src/canon.mjs';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
function option(name) { const i=process.argv.indexOf(name); if(i<0)return; assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),`${name} requires a path`);return resolve(process.argv[i+1]); }
const serverDir=option('--server-dir')||resolve('server'), reportPath=option('--report');
let stage, child, timer, client;
const reports=[];
try {
 stage=await mkdtemp(join(tmpdir(),'pali-native-scanner-'));await cp(serverDir,join(stage,'server'),{recursive:true});await mkdir(join(stage,'empty'));
 const guard=join(stage,'synthetic-provider.cjs');
 await writeFile(guard,`const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
 for(const mode of ['stdio','http']) {
  client=new Client({name:'installed-native-scanner',version:'1'});let stderr='';
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
  const call=async text=>{requests++;const r=await client.callTool({name:'find_citations',arguments:{text}});assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(r.structuredContent,JSON.parse(JSON.stringify(findCitations(text,canon))));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
  for(const script of SCRIPTS){
   const n=value=>transliterate(value,'roman',script);
   const text=`😀 See AN ${n('3.65')}, MN ${n('10')}, Dhp ${n('1-20')} and S i ${n('57')}.`;
   const r=await call(text);
   assert.deepEqual(r.citations.map(c=>c.text_id),['an3.65','mn10','dhp1-20','sn2.22']);
   assert.ok(r.citations[3].also_on_that_page.length);
   for(const c of r.citations){assert.equal(text.slice(c.start,c.end),c.text);assert.equal(c.input_script,['roman','sinhala'].includes(script)?undefined:script);}
   for(const prose of [`Plan A ${n('3')} failed`,`MN ${n('10')}th edition`,`MN ${n('10')},${n('000')}`,`ηMN ${n('10')}`,`mn ${n('10')}`]) assert.equal((await call(prose)).found,0);
  }
  const mixed=await call('See AN ๓.६५; MN ๙๙๙.');assert.equal(mixed.found,2);assert.equal(mixed.resolved,0);
  const link=await call('https://suttacentral.net/mn๑๐');assert.equal(link.found,1);assert.equal(link.resolved,0);
  const units=canon.load().canon.units;
  for(let i=0;i<units.length;i+=250){
   const ids=units.slice(i,i+250).map(u=>u.id),text='References: '+ids.join('; ')+'.';
   const r=await call(text);assert.equal(r.found,ids.length);assert.equal(r.unresolved,0);
   assert.deepEqual(r.citations.map(c=>c.text),ids);
   for(const c of r.citations){assert.equal(text.slice(c.start,c.end),c.text);assert.equal(c.text_id,canon.resolve(c.text).unit.id);}
  }
  const ids=['cp1','ja526','ps3.2','ne3','pe1','dt1.1','pp1.1','ya1.1.1'];
  for(const script of SCRIPTS){
   const input=ids.map(id=>id.replace(/\d/g,d=>transliterate(d,'roman',script)));
   const text='😀 '+input.join('; ')+'.',r=await call(text);
   assert.deepEqual(r.citations.map(c=>c.text),input);assert.deepEqual(r.citations.map(c=>c.text_id),ids);
   for(const c of r.citations)assert.equal(text.slice(c.start,c.end),c.text);
  }
  assert.equal((await call('An mp3 or pp3 file. Ps 23, Pe 4, Ne 2, Pp 1, Ya 2, Dt 3. xja526 ja526x ja526@example.com /ja526/path /cp1. https://evil.example/ja526')).found,0);
  const invalid=await call('ja9999; cp9999; ps9999.1; ne9999; pe9999; dt9999.1; pp9999.1; ya9999.1');assert.equal(invalid.found,8);assert.equal(invalid.unresolved,8);
  assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
  reports.push({transport:mode,requests,scripts:SCRIPTS.length,canonical_ids_checked:units.length,all_reader_ids_recognised:true,original_offsets_preserved:true,conservative_prose_rules:true,mixed_numerals_unresolved:true,literal_urls:true,ambiguous_page_alternatives_retained:true,network_attempts:0});
  await client.close();client=null;
  if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}child=null;
 }
 const report={status:'passed',cases:reports,scope:'Isolated packaged citation-scanning parity across supported numeral scripts and all bundled canonical reader IDs. Original prose and offsets retained; native-script names remain outside scanner scope. Catalogue coverage is not exhaustive prose recognition, native-reader or signed-in-client acceptance.'};
 if(reportPath)await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 if(reportPath)await writeFile(reportPath,JSON.stringify({status:'failed',error:error.message})+'\n');throw error;
} finally {
 clearTimeout(timer);if(client)await client.close().catch(()=>{});
 if(child&&child.exitCode===null&&child.signalCode===null){const ended=new Promise(r=>child.once('exit',r));child.kill();await ended;}
 if(stage)await rm(stage,{recursive:true,force:true});
}
