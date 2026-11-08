import {test} from 'node:test';import assert from 'node:assert/strict';
import {guardedStorageWrite,guardedPositionWrite,readingPointerOnlyChange} from '../web/local-storage-write.mjs';
import {readingPosition,isReadingLocator} from '../web/reading-position.mjs';
const locator=(uid='mn10',offset=0)=>readingPosition({uid},offset,uid+'/'+(offset+1),'source-revision');
const base={saved:[{uid:'dhp183',ref:'dhp183/1',note:'old'}],reading_progress:[],theme:'light',last:locator()};const raw=x=>JSON.stringify(x);
test('an unrelated save adopts the observed locator without merging any personal-data change',()=>{
 const current={...base,last:locator('mn11')};let stored=raw(current);const incoming={...base,saved:[{...base.saved[0],note:'my new note'}]};
 stored=guardedStorageWrite({expected:raw(base),value:raw(incoming),read:()=>stored,write:x=>{stored=x}});assert.equal(JSON.parse(stored).last,current.last);assert.equal(JSON.parse(stored).saved[0].note,'my new note');
});
test('only a known locator is exempt; notes, marks, preferences and unknown fields still conflict',()=>{
 for(const change of [{saved:[{...base.saved[0],note:'new elsewhere'}]},{reading_progress:[{day:1}]},{theme:'dark'},{remember_position:false},{new_private_field:'other'},{last:'#read?uid=mn10&allow_shared=true'},{last:'https://evil.example'}]){
  let called=false;const actual=raw({...base,...change});assert.throws(()=>guardedStorageWrite({expected:raw(base),value:raw(base),read:()=>actual,write:()=>{called=true}}),e=>e.code==='BROWSER_DATA_CHANGED');assert.equal(called,false);
 }
});
test('reading-only writes preserve current private data without falsely rebasing the stale private snapshot',()=>{
 let stored=raw({...base,saved:[{...base.saved[0],note:'new elsewhere'}],reading_progress:[{day:2}]});const result=guardedPositionWrite({expected:raw(base),locator:locator('mn12'),read:()=>stored,write:x=>{stored=x}});
 assert.equal(JSON.parse(stored).saved[0].note,'new elsewhere');assert.deepEqual(JSON.parse(stored).reading_progress,[{day:2}]);assert.equal(JSON.parse(result.snapshot).saved[0].note,'old');assert.equal(JSON.parse(result.snapshot).last,locator('mn12'));
 assert.throws(()=>guardedStorageWrite({expected:result.snapshot,value:raw({...base,last:locator('mn12')}),read:()=>stored,write:()=>assert.fail('stale notes cannot be written')}),e=>e.code==='BROWSER_DATA_CHANGED');
});
test('a current cross-tab opt-out is honored without a write or resurrection of the locator',()=>{
 const current={...base,remember_position:false};delete current.last;let called=false;const r=guardedPositionWrite({expected:raw(base),locator:locator('mn12'),read:()=>raw(current),write:()=>{called=true}});assert.equal(r.disabled,true);assert.equal(called,false);assert.equal(JSON.parse(r.snapshot).remember_position,false);assert.equal(Object.hasOwn(JSON.parse(r.snapshot),'last'),false);
});
test('the final pre-write check refuses a change observed while serialization was prepared',()=>{
 let calls=0,wrote=false;assert.throws(()=>guardedPositionWrite({expected:raw(base),locator:locator('mn12'),read:()=>++calls===1?raw(base):raw({...base,theme:'dark'}),write:()=>{wrote=true}}),e=>e.code==='BROWSER_DATA_CHANGED');assert.equal(wrote,false);
});
test('locator recognition accepts understood legacy/scoped forms and rejects consent, extra fields and incomplete pins',()=>{
 for(const value of ['#read?uid=mn10',locator(),readingPosition({book:'vin02m1'},6,'vri-book:vin02m1/7','pin'),readingPosition({kind:'post',uid:'Vism 1.1'},0,'post:vism/1','pin'),readingPosition({uid:'mn10',plan:'mn-year',day:26},103,'mn10/104','pin')])assert.equal(isReadingLocator(value),true);
 for(const value of ['#read?uid=mn10&uid=mn11','#read?uid=mn10&note=private','#read?uid=mn10&allow_shared=true','#read?uid=mn10&source=pin','javascript:alert(1)','#read?uid=mn10&offset=-1'])assert.equal(isReadingLocator(value),false);
 assert.equal(readingPointerOnlyChange(raw(base),raw({...base,last:locator('mn13')})),true);assert.equal(readingPointerOnlyChange(raw(base),'{'),false);
});
