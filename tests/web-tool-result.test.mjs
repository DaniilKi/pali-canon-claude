import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createHttpServer } from '../src/http-server.mjs';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import { readingToolResult } from '../web/tool-result.mjs';

let client;
before(async()=>{const [a,b]=InMemoryTransport.createLinkedPair();client=new Client({name:'web-tool-error-contract',version:'1'});await Promise.all([client.connect(a),createServer().connect(b)]);});
after(async()=>{await client?.close();});
const call=args=>client.callTool({name:'get_text',arguments:args});

test('actual opaque saved web pins reach exact source comparison and retain generic deliberate-review recovery',async()=>{
 for(const source_commit of ['controlled-compat-old-revision','0'.repeat(40),'a'.repeat(100)]){
  const result=await call({uid:'dhp183',offset:0,limit:1,source_commit});assert.equal(result.isError,true);
  const body=JSON.parse(result.content.find(x=>x.type==='text').text);assert.equal(body.segments,undefined);assert.equal(body.code,'READING_SOURCE_CHANGED');
  assert.throws(()=>readingToolResult(result),error=>error.code==='READING_SOURCE_CHANGED'&&/source or citation mapping revision changed/.test(error.message)&&error.reopen===undefined);
 }
 const actual=readingToolResult(await call({uid:'dhp183',offset:0,limit:1,source_commit:canon.source().commit}));assert.equal(actual.segments[0].ref,'dhp183/1');
});

test('actual plain SDK argument errors remain readable errors rather than browser JSON parser exceptions',async()=>{
 for(const args of [{uid:'dhp183',offset:'0'},{uid:'dhp183',offset:0,source_commit:'<unsupported>'},{uid:'dhp183',offset:0,source_commit:'x'.repeat(101)}]){
  const result=await call(args);assert.equal(result.isError,true);assert.equal(result.structuredContent,undefined);const text=result.content.find(x=>x.type==='text').text;assert.throws(()=>JSON.parse(text));
  assert.throws(()=>readingToolResult(result),error=>!(error instanceof SyntaxError)&&/Input validation error/.test(error.message)&&!error.message.includes('JSON.parse'));
 }
});

test('structured and JSON failures preserve exact errors and only safe finite paired reopen metadata',()=>{
 const generic={error:'The source or citation mapping revision changed.',code:'READING_SOURCE_CHANGED'};
 for(const result of [{isError:true,structuredContent:generic},{isError:true,content:[{type:'text',text:JSON.stringify(generic)}]}])assert.throws(()=>readingToolResult(result),error=>error.code===generic.code&&error.message===generic.error);
 const paired={...generic,reopen:'#read?uid=tha-ap108'};assert.throws(()=>readingToolResult({isError:true,structuredContent:paired}),error=>error.reopen===paired.reopen);
 for(const reopen of ['https://outside.example/','#read?uid=mn10','#read?uid=tha-ap108&ref=tha-ap108/1'])assert.throws(()=>readingToolResult({isError:true,structuredContent:{...paired,reopen}}),error=>error.code===generic.code&&error.reopen===undefined);
 assert.throws(()=>readingToolResult({isError:true,structuredContent:{error:'Unsupported',code:'arbitrary-code',reopen:paired.reopen}}),error=>error.message==='Unsupported'&&error.code===undefined&&error.reopen===undefined);
});

test('successful payloads retain existing data; unreadable success is an explicit refusal without source substitution',()=>{
 const source={text_id:'dhp183',source:canon.source(),segments:canon.segments(canon.resolve('dhp183').unit)};
 assert.equal(readingToolResult({structuredContent:source}),source);assert.deepEqual(readingToolResult({content:[{type:'text',text:JSON.stringify(source)}]}),source);
 assert.throws(()=>readingToolResult({content:[{type:'text',text:'Not a JSON response'}]}),/unreadable response.*No passage was substituted/);
 assert.throws(()=>readingToolResult(undefined),/incomplete response/);
});

test('actual stateless HTTP returns an opaque-pin refusal and plain SDK validation failure with distinct readable recovery',async()=>{
 const server=createHttpServer({rateLimitPerMinute:0});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  async function request(arguments_){const response=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_text',arguments:arguments_}})});assert.equal(response.status,200);return (await response.json()).result;}
  const stale=await request({uid:'dhp183',offset:0,limit:1,source_commit:'controlled-compat-old-revision'});
  assert.throws(()=>readingToolResult(stale),error=>error.code==='READING_SOURCE_CHANGED'&&/source or citation mapping revision changed/.test(error.message));
  for(const uid of ['thi-ap4','thi-ap5','tha-ap19','tha-ap23','thag16.3','sn12.21']){const rejected=await request({uid,offset:0,limit:1,source_commit:canon.source().commit});const raw=JSON.parse(rejected.content.find(x=>x.type==='text').text);assert.equal(raw.code,'READING_SOURCE_CHANGED',uid);assert.equal(raw.reopen,undefined,uid);assert.throws(()=>readingToolResult(rejected),error=>error.code==='READING_SOURCE_CHANGED'&&error.reopen===undefined&&/source or citation mapping revision changed/.test(error.message));}
  const malformed=await request({uid:'dhp183',offset:'invalid'});assert.equal(malformed.isError,true);
  assert.throws(()=>readingToolResult(malformed),error=>!(error instanceof SyntaxError)&&/Input validation error/.test(error.message));
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
