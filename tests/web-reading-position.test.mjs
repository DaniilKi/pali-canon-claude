import {test} from 'node:test';import assert from 'node:assert/strict';
import {readingPosition,assertPositionPin} from '../web/reading-position.mjs';
test('source-pinned locators preserve canonical, source-book, later-work, commentary and plan identity',()=>{
 for(const context of [{uid:'mn10'},{book:'s0201m'},{kind:'post',uid:'Vism 1.1'},{kind:'commentary',uid:'commentary:abh01a.att.xml'},{kind:'commentary',uid:'mn10/31'},{uid:'mn10',plan:'mn-year',day:26}]){
  const link=readingPosition(context,30,'mn10/31','source-revision');const q=new URLSearchParams(link.split('?')[1]);for(const [key,value]of Object.entries(context))assert.equal(q.get(key),String(value));assert.equal(q.get('offset'),'30');assert.equal(q.get('ref'),'mn10/31');assert.equal(q.get('source'),'source-revision');assertPositionPin(q,{source:{commit:'source-revision'}});
 }
});
test('pins never silently accept changed or missing source revisions',()=>{
 const q=new URLSearchParams(readingPosition({uid:'mn10'},30,'mn10/31','old-revision').split('?')[1]);
 for(const data of [{source:{commit:'new-revision'}},{}])assert.throws(()=>assertPositionPin(q,data),e=>e.code==='READING_SOURCE_CHANGED');
 assert.doesNotThrow(()=>assertPositionPin(new URLSearchParams('uid=mn10'),{}));
 for(const bad of ['source=old','source=old&ref=mn10%2F31&offset=-1','source=old&ref=mn10%2F31&offset=1.5','source=old&source=new&ref=mn10%2F31&offset=30'])assert.throws(()=>assertPositionPin(new URLSearchParams(bad),{}));
});
test('position metadata is bounded, never a URL proxy or persistent notes/consent container',()=>{
 for(const context of [{uid:'https://evil.example'},{uid:'javascript:alert(1)'},{uid:'mn10',book:'s0201m'},{uid:'mn10',note:'private'},{uid:'mn10',allow_shared:true},{uid:'mn10',day:2},{kind:'post',uid:'Vism 1.1',plan:'mn-year',day:1}])assert.throws(()=>readingPosition(context,0,'mn10/1','pin'));
 for(const [offset,ref,source]of [[-1,'mn10/1','pin'],[1.5,'mn10/1','pin'],[0,'','pin'],[0,'mn10/1','<bad>']])assert.throws(()=>readingPosition({uid:'mn10'},offset,ref,source));
});
