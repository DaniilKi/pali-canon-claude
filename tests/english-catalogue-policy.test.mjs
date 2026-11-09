import {test} from 'node:test';
import assert from 'node:assert/strict';
import {englishBrowseCandidate,englishSelection,englishRoute,englishCatalogue,englishBadges,ENGLISH_AVAILABILITY} from '../web/english-catalogue.mjs';
const request=(query='node=english')=>englishSelection(new URLSearchParams(query));
const item=(id='mn1',counts={english_available:1})=>({id,citation:id.toUpperCase(),title:'Synthetic canonical title',collection:'Middle Discourses',collection_id:'mn',...counts,read_with:{tool:'get_text',uid:id}});
const response=(selection,items=[item()],total=items.length)=>({catalogue:true,node:'english',name:'Find English sources',availability:selection.availability,collection:selection.collection,collections:[{id:'mn',name:'Middle Discourses'},{id:'sn',name:'Connected Discourses'},{id:'thag',name:'Elders verses'}],note:'Source links are metadata, not completeness guarantees.',total,offset:selection.offset,limit:selection.limit,next_offset:selection.offset+selection.limit<total?selection.offset+selection.limit:null,items});

test('finder hashes preserve exact filters through pagination/back and reject unknown or duplicate query values',()=>{
 assert.deepEqual(request(),{availability:'linked',collection:null,offset:0,limit:40});
 const selection=request('node=english&availability=scoped&collection=sn&offset=40');
 assert.equal(englishRoute(selection),'#browse?node=english&availability=scoped&collection=sn&offset=40');
 assert.deepEqual(request(englishRoute(selection).split('?')[1]),selection);
 assert.equal(englishRoute(selection,0),'#browse?node=english&availability=scoped&collection=sn');
 for(const query of ['node=english&availability=unknown','node=english&availability=','node=english&collection=','node=english&collection=SN','node=english&offset=-1','node=english&offset=1.5','node=english&offset=1e2','node=english&offset=9007199254740992','node=english&limit=3','node=english&availability=whole&availability=none','node=english&node=books','node=books'])assert.throws(()=>request(query),/does not match/);
 assert.deepEqual(Object.values(ENGLISH_AVAILABILITY),['All English links','Whole-unit or chapter links','Scoped English only','No English links']);
});

test('English aliases, reversed duplicate nodes and filters on other views cannot bypass strict selection guards',()=>{
 for(const query of ['node=English','node=%20english%20','node=eng%20lish','node=eng%09lish','node=%C3%89nglish','node=canon&node=english','node=english&node=canon','node=books&availability=none','node=post&collection=sn','availability=scoped']){
  const args=new URLSearchParams(query);assert.equal(englishBrowseCandidate(args),true);assert.throws(()=>englishSelection(args),/does not match/);
 }
 for(const query of ['node=canon','node=commentary','node=post','node=books','node=sn'])assert.equal(englishBrowseCandidate(new URLSearchParams(query)),false);
});

test('finder validates source-count filters and distinct scoped badges without fetching or mutating input',()=>{
 for(const [availability,counts]of[['linked',{english_available:1}],['whole',{english_available:1,partial_english_available:1}],['scoped',{english_available:0,partial_english_available:1,shared_english_available:1}],['none',{english_available:0}]]){
  const selection=request('node=english&availability='+availability),data=response(selection,[item('mn1',counts)]),before=structuredClone(data);
  assert.equal(englishCatalogue(data,selection),data);assert.deepEqual(data,before);
 }
 assert.deepEqual(englishBadges(item('mn1',{english_available:0,partial_english_available:1})),['Partial source · review required']);
 assert.deepEqual(englishBadges(item('mn1',{english_available:0,shared_english_available:1})),['Shared page · review required']);
 assert.deepEqual(englishBadges(item('mn1',{english_available:0,partial_english_available:1,shared_english_available:1})),['Partial and shared sources · review required']);
});

test('unknown echoed filters, unsafe commands, wrong collection scope and inconsistent pagination fail before presentation',()=>{
 const selection=request('node=english&collection=mn'),original=response(selection);
 const changes=[x=>{x.catalogue=false;},x=>{x.node='books';},x=>{x.availability='none';},x=>{x.collection=null;},x=>{x.offset=40;},x=>{x.limit=5;},x=>{x.total=2;},x=>{x.next_offset=1;},x=>{x.items[0].read_with.tool='get_translation';},x=>{x.items[0].read_with.uid='mn2';},x=>{x.items[0].read_with.allow_partial=true;},x=>{x.items[0].collection_id='sn';},x=>{x.items[0].id='sn1';x.items[0].read_with.uid='sn1';},x=>{x.items[0].approximate=true;},x=>{x.items[0].kind='range';},x=>{x.items[0].english_available=-1;},x=>{x.items[0].partial_english_available=true;},x=>{x.items[0].english_available=0;},x=>{x.collections.push(x.collections[0]);},x=>{x.collections=[];},x=>{x.note='';},x=>{x.items.push(x.items[0]);}];
 for(const change of changes){const bad=structuredClone(original);change(bad);assert.throws(()=>englishCatalogue(bad,selection),/does not match/);}
 assert.throws(()=>englishCatalogue(response(request('node=english&collection=missing'),[]),request('node=english&collection=missing')),/does not match/);
 for(const availability of ['none','scoped']){const s=request('node=english&availability='+availability);assert.throws(()=>englishCatalogue(response(s),s),/does not match/);}
});

test('empty index matches and pages past the end retain distinct validated totals rather than dropping filters',()=>{
 const empty=request('node=english&availability=none&collection=sn');assert.equal(englishCatalogue(response(empty,[],0),empty).total,0);
 const past=request('node=english&availability=whole&offset=80');assert.equal(englishCatalogue(response(past,[],3),past).total,3);
 assert.equal(englishRoute(past,0),'#browse?node=english&availability=whole');
 const first=request('node=english'),page=response(first,Array.from({length:40},(_,i)=>item('mn'+(i+1))),81);assert.equal(englishCatalogue(page,first).next_offset,40);
});

test('Apadana collection retains both legitimate elder-prefix families under the no-English filter',()=>{
 const s=request('node=english&availability=none&collection=ap');
 const items=['tha-ap1','thi-ap40'].map(uid=>({...item(uid,{english_available:0}),collection:'Apadāna',collection_id:'ap'}));
 const data=response(s,items);data.collections.push({id:'ap',name:'Apadāna'});assert.equal(englishCatalogue(data,s).items.length,2);
});

test('inherited chapter cue stays metadata for its exact Pali UID and cannot authorize a different read command',()=>{
 const selection=request('node=english&availability=whole&collection=thag'),entry={...item('thag2.1'),collection:'Elders verses',collection_id:'thag',source_context:{kind:'containing_group',id:'thag2',citation:'Thag2',title:'Synthetic source chapter'}};
 const data=response(selection,[entry]);assert.equal(englishCatalogue(data,selection).items[0].read_with.uid,'thag2.1');
 for(const change of [x=>{x.items[0].source_context.id='mn1';},x=>{x.items[0].source_context.read_with={tool:'get_translation'};},x=>{x.items[0].source_context.kind='translation';},x=>{x.items[0].english_available=0;x.items[0].shared_english_available=1;}]){const bad=structuredClone(data);change(bad);assert.throws(()=>englishCatalogue(bad,selection),/does not match/);}
});
