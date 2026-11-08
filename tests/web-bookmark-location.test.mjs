import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bookmarkLocation} from '../web/bookmark-location.mjs';
import {assertPositionPin} from '../web/reading-position.mjs';
const mark={uid:'mn10',ref:'mn10/31',offset:30,source_commit:'saved-source'};
test('versioned bookmarks carry exact position/reference/revision across every reading kind',()=>{
 for(const context of [{uid:'mn10'},{book:'vin02m1'},{kind:'post',uid:'Vism 1.1'},{kind:'commentary',uid:'commentary:mn01a.att.xml'},{kind:'commentary',uid:'mn10/31'}]){
  const target=bookmarkLocation(mark,context),args=new URLSearchParams(target.href.slice(6));
  assert.equal(target.pinned,true);assert.equal(args.get('offset'),'30');assert.equal(args.get('ref'),mark.ref);assert.equal(args.get('source'),mark.source_commit);
  for(const [key,value]of Object.entries(context))assert.equal(args.get(key),value);
  assert.doesNotThrow(()=>assertPositionPin(args,{source:{commit:'saved-source'}}));
  assert.throws(()=>assertPositionPin(args,{source:{commit:'changed-source'}}),e=>e.code==='READING_SOURCE_CHANGED');
 }
});
test('versioned bookmarks never silently drop malformed pins or guess a missing offset',()=>{
 for(const delta of [{offset:undefined},{offset:-1},{offset:1.5},{offset:100001},{source_commit:''},{source_commit:null},{source_commit:'https://example.com'},{source_commit:'<bad>'},{ref:''}])assert.throws(()=>bookmarkLocation({...mark,...delta},{uid:'mn10'}));
});
test('legacy exports remain unpinned and explicitly warn that they open the current source',()=>{
 const target=bookmarkLocation({uid:'mn10',ref:'mn10/31'},{uid:'mn10'}),args=new URLSearchParams(target.href.slice(6));
 for (const offset of ['0', null, -1, 0.5, 100001]) assert.throws(() => bookmarkLocation({ref:'mn10/31',offset},{uid:'mn10'}));
 assert.equal(target.pinned,false);assert.equal(args.has('source'),false);assert.equal(args.get('offset'),'30');assert.equal(args.get('ref'),'mn10/31');assert.match(target.notice,/no source version/);
 assert.equal(new URLSearchParams(bookmarkLocation({ref:'mn10/32',offset:31},{uid:'mn10'}).href.slice(6)).get('offset'),'30');
});
test('constructing a link does not rebind or mutate personal metadata',()=>{
 const item={...mark,note:'Private reflection'},before=structuredClone(item);bookmarkLocation(item,{uid:'mn10'});assert.deepEqual(item,before);
 for(const context of [{uid:'https://evil.example'},{uid:'mn10',book:'other'},{uid:'mn10',note:'private'},{kind:'staff',uid:'mn10'}])assert.throws(()=>bookmarkLocation(item,context));
});
