import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRequestPool,REQUEST_TIMEOUT_MS} from '../web/request-lifecycle.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
function setup(){let entries=[];const timers=new Map();let serial=0;const pool=createRequestPool({onChange:x=>{entries=x;},setTimer:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},clearTimer:id=>timers.delete(id)});return {pool,timers,entries:()=>entries};}
test('successful and failed requests release controls and deadline timers',async()=>{
 const s=setup();assert.equal(await s.pool.run(async()=>42,{label:'Pāli reading'}),42);assert.equal(s.pool.size,0);assert.equal(s.entries().length,0);assert.equal(s.timers.size,0);
 await assert.rejects(s.pool.run(async()=>{throw Error('controlled failure');}),/controlled failure/);assert.equal(s.timers.size,0);
});
test('user stop settles even an abort-ignoring transport; late response or stale stop cannot affect a new request',async()=>{
 const s=setup();let finish,signal;const first=s.pool.run(sig=>{signal=sig;return new Promise(r=>{finish=r;});},{label:'English source'});await tick();const stop=s.entries()[0].stop;assert.equal(stop(),true);await assert.rejects(first,e=>e.code==='REQUEST_STOPPED');assert.equal(signal.aborted,true);assert.equal(s.timers.size,0);
 let secondFinish;const second=s.pool.run(()=>new Promise(r=>{secondFinish=r;}));await tick();finish('late source');assert.equal(stop(),false);assert.equal(s.pool.size,1);secondFinish('current');assert.equal(await second,'current');
});
test('deadline remains finite and independent of transport abort support',async()=>{
 assert.equal(REQUEST_TIMEOUT_MS,180000);const s=setup();const waiting=s.pool.run(()=>new Promise(()=>{}));await tick();const timeout=[...s.timers.values()][0];assert.equal(timeout.ms,180000);timeout.fn();await assert.rejects(waiting,e=>e.code==='REQUEST_DEADLINE');assert.equal(s.pool.size,0);assert.equal(s.timers.size,0);
});
test('stopping one request keeps independent controls and scope cancellation cannot stop a page request',async()=>{
 const s=setup();let finish;const page=s.pool.run(()=>new Promise(r=>{finish=r;}),{group:'page',label:'Pāli reading'});const a=s.pool.run(()=>new Promise(()=>{}),{group:'study',label:'Word study'});const b=s.pool.run(()=>new Promise(()=>{}),{group:'study',label:'English source'});await tick();s.entries().find(x=>x.label==='Word study').stop();await assert.rejects(a,e=>e.code==='REQUEST_STOPPED');assert.equal(s.pool.size,2);s.pool.cancelGroup('study');await assert.rejects(b,e=>e.code==='REQUEST_SUPERSEDED');assert.equal(s.pool.size,1);finish('Pāli');assert.equal(await page,'Pāli');
});
test('new navigation invalidates every pending request and immediate stop prevents transport dispatch',async()=>{
 const s=setup();const waiting=s.pool.run(()=>new Promise(()=>{}));s.pool.cancelAll();await assert.rejects(waiting,e=>e.code==='REQUEST_SUPERSEDED');assert.equal(s.pool.size,0);
 let dispatched=false;const another=s.pool.run(()=>{dispatched=true;return 'unused';});s.entries()[0].stop();await assert.rejects(another,e=>e.code==='REQUEST_STOPPED');assert.equal(dispatched,false);
});
