import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {HttpToolWorker} from '../src/http-tool-worker.mjs';
import {createHttpServer} from '../src/http-server.mjs';
class FakeWorker extends EventEmitter {sent=[];terminated=0;postMessage(m){this.sent.push(m);}async terminate(){this.terminated++;}}
test('hosted worker preserves out-of-order source/error envelopes and bounds queued reads',async()=>{
 const fake=new FakeWorker(),worker=new HttpToolWorker({maxPending:2,workerFactory:()=>fake});
 const first=worker.execute('get_text',{uid:'MN 10'}),second=worker.execute('get_text',{uid:'missing'});
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
  await Promise.all([a,b]);assert.deepEqual(worker.status(),{state:'failed',pending:0,limit:64});await assert.rejects(worker.execute('get_text',{}),/unavailable/);assert.equal(fake.sent.length,2);await worker.close();
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
  fake.emit('error',new Error('fixture'));const response=await request;assert.equal((await response.json()).result.isError,true);
  const failed=await fetch(base+'/healthz');assert.equal(failed.status,503);assert.equal((await failed.json()).status,'unavailable');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 assert.equal(fake.terminated,1);
});
