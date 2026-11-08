import {test} from 'node:test';
import assert from 'node:assert/strict';
import {savedPage,savedScope,SAVED_PAGE_SIZE} from '../web/saved-passages.mjs';
const items=[{uid:'mn1',ref:'mn1/1',title:'Mūlapariyāya',note:'My first personal note'},{uid:'book:vin02m1',ref:'vri-book:vin02m1/7',title:'Root book',note:''},{uid:'commentary:mn01a.att.xml',ref:'commentary/1',title:'Commentary book',note:''},{uid:'commentary-ref:mn1',ref:'c1',title:'Aligned commentary',note:''},{uid:'post:Vism 1.1',ref:'Vism 1.1/5',title:'Visuddhimagga',note:'Test reflection'}];
test('saved sources distinguish root books, aligned/unaligned commentary and later works',()=>{
 assert.deepEqual(items.map(savedScope),['canon','books','commentary','commentary','post']);
 for(const [scope,total] of [['all',5],['canon',1],['books',1],['commentary',2],['post',1]])assert.equal(savedPage(items,new Map(),{scope}).total,total);
});
test('search matches saved metadata and notes without accent/case friction',()=>{
 for(const query of ['MULAPARIYAYA','mn1/1','personal first','mūlapariyāya note'])assert.equal(savedPage(items,new Map(),{query}).items[0],items[0]);
 assert.equal(savedPage(items,new Map(),{query:'Visuddhimagga',scope:'canon'}).total,0);
 assert.equal(savedPage(items,new Map(),{query:'NOT IN THESE NOTES'}).total,0);
});
test('current unsaved note draft replaces stored note only for searching and is not committed',()=>{
 const raw=JSON.stringify(items),key=JSON.stringify(['mn1','mn1/1']);const drafts=new Map([[key,'Uncommitted draft']]);
 assert.equal(savedPage(items,drafts,{query:'uncommitted'}).total,1);
 assert.equal(savedPage(items,drafts,{query:'personal first'}).total,0);
 assert.equal(JSON.stringify(items),raw);assert.equal(drafts.get(key),'Uncommitted draft');
});
test('paging bounds 500 saved entries to 25 visible editors and clamps after removal/filtering',()=>{
 const many=Array.from({length:500},(_,i)=>({uid:'mn1',ref:'ref'+i,title:'Saved '+i,note:''}));
 assert.equal(SAVED_PAGE_SIZE,25);let d=savedPage(many,new Map(),{page:19});assert.equal(d.pages,20);assert.equal(d.start,476);assert.equal(d.end,500);assert.equal(d.items.length,25);
 d=savedPage(many.slice(0,25),new Map(),{page:19});assert.equal(d.page,0);assert.equal(d.items.length,25);
 for(const page of [-1,NaN,Infinity,2.5,'1'])assert.equal(savedPage(many,new Map(),{page}).page,0);
});
test('empty results, unknown scope, punctuation and markup stay plain local filters',()=>{
 assert.deepEqual(savedPage([],new Map()),{items:[],total:0,all:0,pages:1,page:0,start:0,end:0});
 assert.equal(savedPage(items,new Map(),{scope:'unknown'}).total,5);
 assert.equal(savedPage(items,new Map(),{query:'<script>alert(1)</script>'}).total,0);
 assert.equal(savedPage(items,new Map(),{query:'  '}).total,5);
});
