import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {HttpToolWorker} from '../src/http-tool-worker.mjs';
import {createHttpServer} from '../src/http-server.mjs';
import {createServer} from '../src/server.mjs';

class FakeWorker extends EventEmitter {sent=[];postMessage(message){this.sent.push(message);}async terminate(){}}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('busy reads receive structured retry instructions and can retry unchanged after the queue drains',async()=>{
 const fake=new FakeWorker(),executor=new HttpToolWorker({maxPending:1,workerFactory:()=>fake}),server=createHttpServer({rateLimitPerMinute:0,chatgptWidget:false,toolExecutor:executor});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const args={uid:'DN 1'};
 const call=async arguments_=>{const r=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_text',arguments:arguments_}})});assert.equal(r.status,200);return(await r.json()).result;};
 const reply=(id,text_id)=>{const body={text_id,source:'test fixture'};fake.emit('message',{id,result:{content:[{type:'text',text:JSON.stringify(body)}],structuredContent:body}});};
 try{
  const held=call({uid:'MN 10'});while(fake.sent.length<1)await tick();
  const busy=await call(args),body=busy.structuredContent;assert.equal(busy.isError,true);assert.deepEqual(JSON.parse(busy.content[0].text),body);
  assert.equal(body.error,'Hosted tool queue is full; retry this read shortly.');assert.equal(body.code,'HOSTED_TOOL_BUSY');assert.equal(body.retryable,true);assert.equal(body.retry_after_seconds,5);assert.match(body.recovery,/same read arguments/);assert.doesNotMatch(body.recovery,/resolve_reference|browse_canon/);assert.equal(fake.sent.length,1);
  reply(fake.sent[0].id,'mn10');assert.equal((await held).structuredContent.text_id,'mn10');
  const retried=call(args);while(fake.sent.length<2)await tick();assert.equal(fake.sent[1].args.uid,args.uid);reply(fake.sent[1].id,'dn1');assert.equal((await retried).structuredContent.text_id,'dn1');assert.equal(executor.status().pending,0);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('ordinary errors cannot gain infrastructure retry semantics by supplying a matching code',async()=>{
 const server=createServer({executeTool:async()=>{throw Object.assign(new Error('ordinary fixture error'),{code:'HOSTED_TOOL_BUSY'});}}),client=new Client({name:'retry-trust-test',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
 try{await server.connect(a);await client.connect(b);const r=await client.callTool({name:'get_text',arguments:{uid:'MN 10'}}),body=JSON.parse(r.content[0].text);assert.equal(r.isError,true);assert.equal(body.error,'ordinary fixture error');assert.equal(body.code,undefined);assert.equal(body.retryable,undefined);assert.match(body.recovery,/resolve_reference/);assert.equal(r.structuredContent,undefined);}
 finally{await client.close();await server.close();}
});
