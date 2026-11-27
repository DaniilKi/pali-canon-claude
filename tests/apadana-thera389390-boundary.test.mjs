// QUOTED UNEXECUTED SOURCE. Root must independently bind namespace/future oracle.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {APADANA_FRUIT_INDEX_REVISION,APADANA_FRUIT_LOCATOR_REVISION as current,APADANA_PAIR_SOURCE_COMMIT as original,REPAIRED_CANONICAL_LOCATORS} from '../src/locator-policy.mjs';
import {bookmarkLocation} from '../web/bookmark-location.mjs';
import {assertPositionPin} from '../web/reading-position.mjs';
import {passageNoteKey,passageNoteState,passageNoteTransaction} from '../web/passage-notes.mjs';
import {parseBookmarks} from '../web/bookmark-import.mjs';
import {buildIndex,toCsv} from '../scripts/export-index.mjs';
import {view} from './helpers/widget-view.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const crosswalk=[
  {
    "old_ref": "tha-ap389/1",
    "old_offset": 0,
    "new_ref": "tha-ap389/1",
    "new_offset": 0,
    "type": "heading",
    "text_sha256": "1f491eb325dd22db48921d895e0c1fd8a8b59199d41a9d3bebebec4072601800",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/2",
    "old_offset": 1,
    "new_ref": "tha-ap389/2",
    "new_offset": 1,
    "type": "verse",
    "text_sha256": "927cecb5ea73ef1c2f3e8be5eaae8236ffca420ed1271143a80711f03a451a8d",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/3",
    "old_offset": 2,
    "new_ref": "tha-ap389/3",
    "new_offset": 2,
    "type": "verse",
    "text_sha256": "9416416a6618ed2d95de92591d583dbf68695db260d432d25fbdf6312d6de3fc",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/4",
    "old_offset": 3,
    "new_ref": "tha-ap389/4",
    "new_offset": 3,
    "type": "verse",
    "text_sha256": "8c1eccf14ead62ed9b70fc605084a1b2d182903d46f0bfac8c7f77d067651132",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/5",
    "old_offset": 4,
    "new_ref": "tha-ap389/5",
    "new_offset": 4,
    "type": "verse",
    "text_sha256": "973737cdee9bb2b47d01247b7f972a6b49201abe9ae1b4eb7bd7d64e52f53109",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/6",
    "old_offset": 5,
    "new_ref": "tha-ap389/6",
    "new_offset": 5,
    "type": "verse",
    "text_sha256": "4c147ebc1108058943588d79f24dd50931b5bc593454c79886b8126293ca40ce",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/7",
    "old_offset": 6,
    "new_ref": "tha-ap389/7",
    "new_offset": 6,
    "type": "verse",
    "text_sha256": "7e580c9eaabe19dc0612e854cbd200782d78fd0a7fb8e30cede8cd01a2a8cd5f",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/8",
    "old_offset": 7,
    "new_ref": "tha-ap389/8",
    "new_offset": 7,
    "type": "prose",
    "text_sha256": "e9f1566f892dec804638c6e57afbbfa0538f077c393316981dc47224c87a2471",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/9",
    "old_offset": 8,
    "new_ref": "tha-ap389/9",
    "new_offset": 8,
    "type": "prose",
    "text_sha256": "da5de03fe2767ce878e9840ad8e532c5636a8ce2e822524121dcceb9d8bfaac5",
    "numeric_ref_status": "same_ref_same_source"
  },
  {
    "old_ref": "tha-ap389/10",
    "old_offset": 9,
    "new_ref": "tha-ap390/1",
    "new_offset": 0,
    "type": "heading",
    "text_sha256": "dd772277cfc8cebbf52475d0fd2b5a781c6dd694542dfa255e307350654c72c3",
    "numeric_ref_status": "absent_old_ref"
  },
  {
    "old_ref": "tha-ap389/11",
    "old_offset": 10,
    "new_ref": "tha-ap390/2",
    "new_offset": 1,
    "type": "verse",
    "text_sha256": "049d209e96c566c346e798cab68bcb607ffaa15de3fd5cd9eb3b30d6f9ff7a07",
    "numeric_ref_status": "absent_old_ref"
  },
  {
    "old_ref": "tha-ap390/1",
    "old_offset": 0,
    "new_ref": "tha-ap390/3",
    "new_offset": 2,
    "type": "verse",
    "text_sha256": "57d3fea7a1d802bf26dadc0de3812e5d81f5836945f7f0f451ec391b09a67c9a",
    "numeric_ref_status": "numeric_ref_collision"
  },
  {
    "old_ref": "tha-ap390/2",
    "old_offset": 1,
    "new_ref": "tha-ap390/4",
    "new_offset": 3,
    "type": "verse",
    "text_sha256": "8c1eccf14ead62ed9b70fc605084a1b2d182903d46f0bfac8c7f77d067651132",
    "numeric_ref_status": "numeric_ref_collision"
  },
  {
    "old_ref": "tha-ap390/3",
    "old_offset": 2,
    "new_ref": "tha-ap390/5",
    "new_offset": 4,
    "type": "verse",
    "text_sha256": "973737cdee9bb2b47d01247b7f972a6b49201abe9ae1b4eb7bd7d64e52f53109",
    "numeric_ref_status": "numeric_ref_collision"
  },
  {
    "old_ref": "tha-ap390/4",
    "old_offset": 3,
    "new_ref": "tha-ap390/6",
    "new_offset": 5,
    "type": "verse",
    "text_sha256": "4c147ebc1108058943588d79f24dd50931b5bc593454c79886b8126293ca40ce",
    "numeric_ref_status": "numeric_ref_collision"
  },
  {
    "old_ref": "tha-ap390/5",
    "old_offset": 4,
    "new_ref": "tha-ap390/7",
    "new_offset": 6,
    "type": "verse",
    "text_sha256": "7e580c9eaabe19dc0612e854cbd200782d78fd0a7fb8e30cede8cd01a2a8cd5f",
    "numeric_ref_status": "numeric_ref_collision"
  },
  {
    "old_ref": "tha-ap390/6",
    "old_offset": 5,
    "new_ref": "tha-ap390/8",
    "new_offset": 7,
    "type": "prose",
    "text_sha256": "99efbf43da3779d7bce7f4fa73d3c88576776d41be400a3466b3b4ad4bcd6132",
    "numeric_ref_status": "numeric_ref_collision"
  },
  {
    "old_ref": "tha-ap390/7",
    "old_offset": 6,
    "new_ref": "tha-ap390/9",
    "new_offset": 8,
    "type": "prose",
    "text_sha256": "c004c826cd79af7d5e2dbfca0a3ef4349c94d0e8de81519cca9f3faa12caa36d",
    "numeric_ref_status": "numeric_ref_collision"
  }
];
let client;
before(async()=>{
 assert.ok(!APADANA_FRUIT_INDEX_REVISION.startsWith('PENDING_'),'Unassigned future namespace must not run');
 assert.equal(APADANA_FRUIT_INDEX_REVISION,'apadana-thera389-390-v1');
 assert.equal(current,'2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera389-390-v1');
 const [a,b]=InMemoryTransport.createLinkedPair();client=new Client({name:'reserved-fruit-boundary',version:'1'});
 await Promise.all([client.connect(a),createServer().connect(b)]);
});
after(async()=>{await client?.close();});
const call=(name,args)=>client.callTool({name,arguments:args});
function data(r){assert.ok(!r.isError,JSON.stringify(r.content));return r.structuredContent;}
function refused(r){assert.equal(r.isError,true);assert.equal(r.structuredContent?.segments,undefined);assert.match(JSON.stringify(r.content),/revision|ambiguous|unversioned|mapping/i);}

test('reserved pair uses eighteen independently source-pinned fresh positions and no English activation',()=>{
 assert.equal(canon.source().commit,original);
 for(const [id,start,end,vri] of [['tha-ap389',11045,11063,'37–42'],['tha-ap390',11063,11081,'43–48']]){
  const u=canon.resolve(id).unit;assert.deepEqual([u.start,u.end,u.vri],[start,end,vri]);
  assert.equal(canon.readingSource(u).locator_revision,current);assert.equal(canon.segments(u).length,9);
  assert.deepEqual(canon.describe(u).english,[]);
 }
 for(const row of crosswalk){
  const id=row.new_ref.split('/')[0],segment=canon.segments(canon.resolve(id).unit)[row.new_offset];
  assert.equal(segment.ref,row.new_ref);assert.equal(segment.type,row.type);assert.equal(hash(segment.text),row.text_sha256);
 }
 assert.equal(crosswalk.filter(r=>r.numeric_ref_status==='same_ref_same_source').length,9);
 assert.equal(crosswalk.filter(r=>r.numeric_ref_status==='numeric_ref_collision').length,7);
 assert.equal(crosswalk.filter(r=>r.numeric_ref_status==='absent_old_ref').length,2);
});

test('all eighteen old positions including stable zero and vanished tails refuse before replacement words',async()=>{
 for(const row of crosswalk){
  const id=row.old_ref.split('/')[0];
  for(const pin of [undefined,original,original+'-apadana-thera-next10-v1']){
   const source=pin===undefined?{}:{source_commit:pin};
   refused(await call('get_text',{uid:id,offset:row.old_offset,limit:1,...source}));
   await assert.rejects(readPassage({uid:id,segment:row.old_ref,english:false,...source}),/revision|ambiguous|unversioned/i);
  }
 }
 for(const id of ['tha-ap389','tha-ap390']){
  const first=data(await call('get_text',{uid:id,limit:1}));assert.equal(first.source.locator_revision,current);
  for(let offset=0;offset<9;offset++){
   const exact=data(await call('get_text',{uid:id,offset,limit:1,source_commit:current}));
   assert.equal(exact.segments[0].ref,id+'/'+(offset+1));
  }
 }
});

test('both widget hosts refuse missing stale and same-object source pins after genuine positives',async()=>{
 for(const bridge of ['MCP Apps','Apps SDK'])for(const id of ['tha-ap389','tha-ap390']){
  const fresh=await readPassage({uid:id,english:false,limit:1});
  for(const pin of [undefined,original]){
   const widget=view(bridge),payload=structuredClone(fresh);widget.output(payload);
   assert.ok(widget.elements.pali.textContent.includes(fresh.pali.segments[0].text));
   if(pin===undefined)delete payload.source.locator_revision;else payload.source.locator_revision=pin;
   widget.output(payload);assert.match(widget.elements.status.textContent,/mapping revision changed/);
   assert.ok(!widget.elements.pali.textContent.includes(fresh.pali.segments[0].text));
  }
 }
});

test('old and unversioned saved positions notes drafts and exports remain unchanged with no crosswalk migration',()=>{
 for(const row of crosswalk)for(const pin of [undefined,original]){
  const uid=row.old_ref.split('/')[0],record={uid,ref:row.old_ref,title:'Synthetic old citation',note:'Synthetic saved note',...(pin?{offset:row.old_offset,source_commit:pin}:{})};
  const saved=parseBookmarks(JSON.stringify({format:'pali-library-v1',saved:[record]}));
  const drafts=new Map([[passageNoteKey(record),'Synthetic unsaved draft']]);
  const before=JSON.stringify(saved),draftBefore=JSON.stringify([...drafts]);
  const context={uid,ref:record.ref,title:'Synthetic fresh citation',offset:row.old_offset,source_commit:current};
  assert.equal(passageNoteState(saved,context).eligible,false);
  for(const type of ['ensure','save'])assert.throws(()=>passageNoteTransaction(saved,drafts,context,{type,note:'Do not transfer'}));
  const route=bookmarkLocation(saved[0],{uid});
  assert.throws(()=>assertPositionPin(new URLSearchParams(route.href.slice(6)),{text_id:uid,source:canon.readingSource(canon.resolve(uid).unit)}));
  const edited=passageNoteTransaction(saved,drafts,{uid,ref:record.ref},{type:'save',mode:'saved',note:'Explicit Saved edit'});
  assert.equal(edited.saved[0].ref,record.ref);assert.equal(edited.saved[0].source_commit,pin);
  assert.equal(JSON.stringify(saved),before);assert.equal(JSON.stringify([...drafts]),draftBefore);
 }
});

test('citation JSON and CSV add exact two locator fields without changing earlier twenty-two registry pins',()=>{
 const prior={
  "tha-ap107": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera105-106-v1",
  "tha-ap108": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera105-106-v1",
  "tha-ap333": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera333-336-v1",
  "tha-ap334": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera333-336-v1",
  "tha-ap335": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera333-336-v1",
  "tha-ap336": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera333-336-v1",
  "tha-ap340": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera340-341-343-344-346-347-v1",
  "tha-ap341": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera340-341-343-344-346-347-v1",
  "tha-ap343": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera340-341-343-344-346-347-v1",
  "tha-ap344": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera340-341-343-344-346-347-v1",
  "tha-ap346": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera340-341-343-344-346-347-v1",
  "tha-ap347": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera340-341-343-344-346-347-v1",
  "tha-ap348": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap349": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap374": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap375": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap423": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap424": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap426": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap427": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap428": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1",
  "tha-ap429": "2d134ff9ef60f70a1eb03c9370580228811a3070-apadana-thera-next10-v1"
};
 assert.equal(Object.keys(REPAIRED_CANONICAL_LOCATORS).length,24);
 for(const [id,pin] of Object.entries(prior))assert.equal(REPAIRED_CANONICAL_LOCATORS[id],pin);
 const index=buildIndex();
 const rows=Array.isArray(index)?index:index.texts;
 assert.ok(Array.isArray(rows));
 for(const id of ['tha-ap389','tha-ap390']){
  const row=rows.find(r=>r.id===id);assert.equal(row.index_revision,APADANA_FRUIT_INDEX_REVISION);assert.equal(row.locator_revision,current);
 }
 assert.ok(toCsv(index).includes(current));
});

test('paired source atomicity strict inverse and refusal controls run five genuine Python methods',{timeout:65000},()=>{
 const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version'],{timeout:1000,maxBuffer:64*1024,killSignal:'SIGKILL'}).status===0);assert.ok(python);
 const result=spawnSync(python,['tests/apadana_thera389390_acceptance.py','-v'],{encoding:'utf8',timeout:60000,killSignal:'SIGKILL',maxBuffer:2*1024*1024});
 assert.ifError(result.error);assert.equal(result.signal,null);assert.equal(result.status,0,result.stderr);
 assert.match(result.stderr,/Ran 5 tests/);assert.match(result.stderr,/\bOK\s*$/);
 assert.doesNotMatch(result.stderr,/skipped|expected failures|unexpected successes/);
});
