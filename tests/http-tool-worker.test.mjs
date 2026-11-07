import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {HttpToolWorker,HOSTED_WORKER_HEAP_MB} from '../src/http-tool-worker.mjs';
import {createHttpServer} from '../src/http-server.mjs';
class FakeWorker extends EventEmitter {sent=[];terminated=0;postMessage(m){this.sent.push(m);}async terminate(){this.terminated++;}}
test('hosted reader shares core admission, preserves envelopes and reports restart failures',async()=>{
 const fake=new FakeWorker(),worker=new HttpToolWorker({maxPending:1,workerFactory:()=>fake}),server=createHttpServer({rateLimitPerMinute:0,chatgptWidget:true,toolExecutor:worker});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const call=async(name,args)=>{const r=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});assert.equal(r.status,200);return(await r.json()).result;};
 try{
  const held=call('get_text',{uid:'MN 10'});while(!fake.sent.length)await new Promise(resolve=>setImmediate(resolve));
  const busy=await call('read_passage_widget',{uid:'Vism 1.1',script:'thai',english:false});assert.equal(busy.structuredContent.code,'HOSTED_TOOL_BUSY');assert.equal(busy.structuredContent.retryable,true);assert.equal(busy.structuredContent.retry_after_seconds,5);assert.equal(fake.sent.length,1);
  fake.emit('message',{id:fake.sent[0].id,result:{content:[],structuredContent:{fixture:true}}});await held;
  const read=call('read_passage_widget',{commentary:'commentary:s0101a.att.xml/c1',script:'myanmar',english:false});while(fake.sent.length<2)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(fake.sent[1].name,'read_passage_widget');assert.equal(fake.sent[1].args.commentary,'commentary:s0101a.att.xml/c1');assert.equal(fake.sent[1].args.script,'myanmar');assert.equal(fake.sent[1].args.english,false);
  const result={content:[{type:'text',text:'{"fixture":true}'}],structuredContent:{fixture:true},_meta:{fixture:'preserved'}};fake.emit('message',{id:fake.sent[1].id,result});assert.deepEqual(await read,result);
  fake.emit('error',new Error('private fixture'));const failed=await call('read_passage_widget',{book:'s0101m',english:false});assert.equal(failed.structuredContent.code,'HOSTED_TOOL_UNAVAILABLE');assert.equal(failed.structuredContent.requires_restart,true);assert.deepEqual(JSON.parse(failed.content[0].text),failed.structuredContent);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
test('hosted worker preserves out-of-order source/error envelopes and bounds queued reads',async()=>{
 const fake=new FakeWorker();let options;const worker=new HttpToolWorker({maxPending:2,workerFactory:input=>{options=input;return fake;}});
 const first=worker.execute('get_text',{uid:'MN 10'}),second=worker.execute('get_text',{uid:'missing'});
 assert.equal(HOSTED_WORKER_HEAP_MB,1408);assert.deepEqual(options,{resourceLimits:{maxOldGenerationSizeMb:1408}});
 await assert.rejects(worker.execute('get_text',{uid:'Dhp 1'}),/queue is full/);assert.equal(fake.sent.length,2);
 const ok={content:[{type:'text',text:'{"source":"fixture"}'}],structuredContent:{source:'fixture'},_meta:{label:'retained'}},bad={isError:true,content:[{type:'text',text:'citation error'}]};
 fake.emit('message',{id:fake.sent[1].id,result:bad,cache:{hits:1}});fake.emit('message',{id:fake.sent[0].id,result:ok,cache:{hits:2}});
 assert.deepEqual(await first,ok);assert.deepEqual(await second,bad);assert.deepEqual(worker.cache,{hits:2});assert.equal(worker.status().pending,0);
 await worker.close();assert.equal(fake.terminated,1);await assert.rejects(worker.execute('get_text',{}),/closed/);
});
test('worker failure and deadline reject every pending read instead of leaving false healthy capacity',async()=>{
 for(const mode of ['error','exit','timeout']){
  const fake=new FakeWorker(),worker=new HttpToolWorker({timeoutMs:20,workerFactory:()=>fake});
  const a=assert.rejects(worker.execute('get_text',{}),/unavailable/),b=assert.rejects(worker.execute('get_text',{}),/unavailable/);
  if(mode!=='timeout')fake.emit(mode,mode==='error'?new Error('private input must not escape'):1);
  else await new Promise(resolve=>setTimeout(resolve,35));
  await Promise.all([a,b]);assert.deepEqual(worker.status(),{state:'failed',pending:0,limit:24});await assert.rejects(worker.execute('get_text',{}),/unavailable/);assert.equal(fake.sent.length,2);await worker.close();
 }
});
test('HTTP health serves while a tool is pending and becomes unavailable when its worker fails',async()=>{
 const fake=new FakeWorker(),worker=new HttpToolWorker({workerFactory:()=>fake}),server=createHttpServer({rateLimitPerMinute:0,chatgptWidget:false,toolExecutor:worker});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const request=fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_text',arguments:{uid:'MN 10'}}})});
 try{
  while(!fake.sent.length)await new Promise(resolve=>setImmediate(resolve));
  worker.cache={entries:1,bytes:10,max_bytes:100,ttl_seconds:360,hits:2,misses:1};
  const health=await fetch(base+'/healthz');assert.equal(health.status,200);const body=await health.json();assert.equal(body.tool_worker.pending,1);assert.deepEqual(body.cache,worker.cache);assert.equal(typeof body.frontend_cache.bytes,'number');assert.doesNotMatch(JSON.stringify(body),/MN 10/);
  fake.emit('error',new Error('fixture'));const response=await request,result=(await response.json()).result;assert.equal(result.isError,true);assert.equal(result.structuredContent.code,'HOSTED_TOOL_UNAVAILABLE');assert.equal(result.structuredContent.retryable,false);assert.equal(result.structuredContent.requires_restart,true);assert.match(result.structuredContent.recovery,/operator.*restart/i);assert.deepEqual(JSON.parse(result.content[0].text),result.structuredContent);
  const failed=await fetch(base+'/healthz');assert.equal(failed.status,503);assert.equal((await failed.json()).status,'unavailable');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 assert.equal(fake.terminated,1);
});
