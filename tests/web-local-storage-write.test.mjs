import {test} from 'node:test';import assert from 'node:assert/strict';import {guardedStorageWrite} from '../web/local-storage-write.mjs';
test('a current snapshot can create/update its own data and returns the committed raw value',()=>{
 let raw=null;const read=()=>raw,write=v=>{raw=v};assert.equal(guardedStorageWrite({expected:null,value:'{"note":"one"}',read,write}),raw);const expected=raw;assert.equal(guardedStorageWrite({expected,value:'{"note":"two"}',read,write}),raw);
});
test('a stale or unobserved snapshot never invokes the write callback or changes newer data',()=>{
 for(const expected of [null,'older',undefined]){let called=false;assert.throws(()=>guardedStorageWrite({expected,value:'stale',read:()=> 'newer',write:()=>{called=true}}),e=>e.code==='BROWSER_DATA_CHANGED');assert.equal(called,false);}
});
test('read/write denials propagate without fabricating success or updating the expected snapshot',()=>{
 let count=0;assert.throws(()=>guardedStorageWrite({expected:null,value:'new',read:()=>{throw Error('read denied')},write:()=>count++}),/read denied/);assert.equal(count,0);
 assert.throws(()=>guardedStorageWrite({expected:null,value:'new',read:()=>null,write:()=>{throw Error('quota denied')}}),/quota denied/);
});
