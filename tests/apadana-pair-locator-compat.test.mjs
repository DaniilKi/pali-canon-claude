import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { analysePassage } from '../src/analyse.mjs';
import { APADANA_PAIR_LOCATOR_REVISION as current, APADANA_PAIR_SOURCE_COMMIT as original } from '../src/locator-policy.mjs';
import { bookmarkLocation } from '../web/bookmark-location.mjs';
import { assertPositionPin } from '../web/reading-position.mjs';
import { passageNoteState, passageNoteTransaction, passageNoteKey } from '../web/passage-notes.mjs';
import { serializeNoteDraftJournal, parseNoteDraftJournal, stageNoteDraftEntry, removeNoteDraftEntry, reconcileNoteDraftJournal } from '../web/note-draft-recovery.mjs';
import { parseBookmarks } from '../web/bookmark-import.mjs';
import { validateCanonicalSearch, canonicalSearchSelection } from '../web/canonical-search.mjs';
import { view } from './helpers/widget-view.mjs';
import { transliterate } from '../src/script.mjs';

let client;
before(async () => { const [a,b] = InMemoryTransport.createLinkedPair(); client = new Client({name:'paired-locator-compatibility',version:'1'}); await Promise.all([client.connect(a),createServer().connect(b)]); });
after(async () => { await client?.close(); });
const call = (name, args) => client.callTool({name,arguments:args});
function data(result) { assert.ok(!result.isError,JSON.stringify(result.content)); return result.structuredContent; }
function refused(result, pattern = /revision|unversioned|ambiguous|repair/i) { assert.equal(result.isError,true); const body = JSON.parse(result.content.find(x=>x.type==='text').text); assert.match(body.error,pattern); assert.equal(body.segments,undefined); return body; }
const hash = value => createHash('sha256').update(value).digest('hex');
const unit = id => canon.resolve(id).unit;

// Exact hashes come from the independently reviewed original VRI block receipt:
// FUTURE_ATOMIC_PAIR_PLAN.json, receipt 7a48f5cb0acc94af3eb5ed5efe5e2aa2d163d8acc0844d1bc8809603629f0212.
const moved = [
 ['tha-ap108/1','3edf0256a0c1659eed65824e765125c2650568bae3845b0a9bab1f899d3749af'],
 ['tha-ap108/2','61c0b4d74a1a87133b24d760974b14b5e69de7cec2060a96d502d19389a167ca'],
 ['tha-ap108/3','5a882a6de150dc501164b7778fdd27b7c58dd7ce7384d33812f237fee257ebb2'],
];

test('paired source ownership uses a new locator namespace while original edition provenance and words survive',()=>{
 for(const [id,count]of [['tha-ap107',8],['tha-ap108',10]]) { assert.equal(canon.source().commit,original); assert.equal(canon.readingSource(unit(id)).locator_revision,current); assert.equal(canon.segments(unit(id)).length,count); }
 for(const [ref,expected]of moved){const segment=canon.segments(unit('tha-ap108')).find(x=>x.ref===ref);assert.equal(hash(segment.text),expected,ref);}
});

test('all eighteen old versioned and bare positions refuse before any replacement words, including unchanged and vanished tails',async()=>{
 for(const [id,count]of [['tha-ap107',10],['tha-ap108',8]])for(let offset=0;offset<count;offset++){
  const ref=id+'/'+(offset+1);
  for(const args of [{source_commit:original},{}]){
   const error=refused(await call('get_text',{uid:id,offset,limit:1,...args}));
   assert.equal(error.reopen,'#read?uid='+id);
   await assert.rejects(readPassage({uid:id,segment:ref,english:false,...args}),/revision|unversioned|ambiguous/i);
  }
 }
});

test('fresh whole-unit reads remain intentional; explicit offset zero, aliases and native input require current pins',async()=>{
 const aliases=['tha-ap108','Ap 108','Therā Apadāna 108',transliterate('Ap 108','roman','thai')];
 for(const uid of aliases){
  const fresh=data(await call('get_text',{uid,limit:1}));assert.equal(fresh.text_id,'tha-ap108');assert.equal(fresh.segments[0].type,'heading');
  refused(await call('get_text',{uid,offset:0,limit:1}));
  const exact=data(await call('get_text',{uid,offset:0,limit:1,source_commit:current}));assert.equal(exact.segments[0].ref,'tha-ap108/1');
 }
 for(const id of ['tha-ap107','tha-ap108']){
  assert.ok((await readPassage({uid:id,english:false})).pali.segments.length);
  await assert.rejects(readPassage({uid:id,offset:0,english:false}),/unversioned|ambiguous/i);
  for(const suffix of [':1',':2']){refused(await call('get_text',{uid:id+suffix,source_commit:current}),/unversioned|ambiguous/i);}
  for(const suffix of ['/1','/9']){assert.equal((await call('get_text',{uid:id+suffix})).isError,true);}
  for(const tail of ['#1','?offset=0','/1','/pli/ms/1','/%31','/%E0%B9%91'])assert.equal((await call('get_text',{uid:'https://suttacentral.net/'+id+tail})).isError,true);
 }
});

test('current exact anchors, source-pinned context and continuation open the reviewed current words',async()=>{
 for(const id of ['tha-ap107','tha-ap108'])for(const segment of canon.segments(unit(id))){
  const offset=Number(segment.ref.split('/')[1])-1;
  const exact=data(await call('get_text',{uid:id,offset,limit:1,source_commit:current}));assert.equal(exact.segments[0].text,segment.text);
  const widget=await readPassage({uid:id,segment:segment.ref,source_commit:current,english:false});assert.equal(widget.pali.segments[0].text,segment.text);
  if(widget.pali.context_with){const context=await readPassage(widget.pali.context_with.arguments);assert.ok(context.pali.segments.some(x=>x.ref===segment.ref&&x.text===segment.text));assert.equal(context.pali.exact_with.arguments.source_commit,current);}
 }
 const first=await readPassage({uid:'tha-ap108',limit:1,english:false});assert.equal(first.pali.continue_with.arguments.source_commit,current);const next=await readPassage(first.pali.continue_with.arguments);assert.equal(next.pali.offset,1);assert.equal(next.pali.segments[0].ref,'tha-ap108/2');
});

test('word study requires the same finite current locator pin while keeping DPD edition provenance separate',()=>{
 for(const id of ['tha-ap107','tha-ap108']){
  for(const selector of [{segment:1},{segment:id+'/2'},{paragraph:id==='tha-ap107'?'24':'29'},{offset:0}]){
   assert.throws(()=>analysePassage({uid:id,...selector}),/unversioned|ambiguous/i);
   assert.throws(()=>analysePassage({uid:id,...selector,source_commit:original}),/revision/i);
   const actual=analysePassage({uid:id,...selector,source_commit:current});assert.equal(actual.text_source.commit,original);assert.equal(actual.text_source.locator_revision,current);
  }
  const fresh=analysePassage({uid:id});assert.ok(fresh.segment.text);const followup=analysePassage({uid:id,segment:fresh.segment.ref,source_commit:fresh.text_source.locator_revision,offset:1});assert.equal(followup.segment.text,fresh.segment.text);
 }
});

test('legacy and old saved notes and drafts remain byte-exact and cannot attach to current replacement references',()=>{
 const context={uid:'tha-ap108',ref:'tha-ap108/1',offset:0,title:'Public synthetic reference',source_commit:current};
 for(const source of [undefined,original]){
  const record={uid:context.uid,ref:context.ref,title:context.title,note:'Public synthetic saved note',...(source?{source_commit:source,offset:0}:{})};
  const saved=parseBookmarks(JSON.stringify({format:'pali-library-v1',saved:[record]})),drafts=new Map([[passageNoteKey(record),'Public synthetic unsaved draft']]);
  const bytes=JSON.stringify(saved),draftBytes=JSON.stringify([...drafts]);
  assert.equal(passageNoteState(saved,context).eligible,false);
  for(const type of ['ensure','save'])assert.throws(()=>passageNoteTransaction(saved,drafts,context,{type,note:'New public synthetic note'}));
  const route=bookmarkLocation(saved[0],{uid:context.uid});assert.throws(()=>assertPositionPin(new URLSearchParams(route.href.slice(6)),{text_id:context.uid,source:canon.readingSource(unit(context.uid))}),e=>e.reopen==='#read?uid=tha-ap108');
  const edited=passageNoteTransaction(saved,drafts,{uid:record.uid,ref:record.ref},{type:'save',mode:'saved',note:'Explicit Saved-only public edit'});assert.equal(edited.saved[0].source_commit,source);assert.equal(edited.saved[0].ref,record.ref);
  assert.equal(JSON.stringify(saved),bytes);assert.equal(JSON.stringify([...drafts]),draftBytes);
 }
 assert.equal(passageNoteState([{...context,note:'Public current note'}],context).eligible,true);
});

test('fresh canonical search pins exact paired hits and refuses a cached command with a missing or old pin',async()=>{
 const phrase='"'+canon.segments(unit('tha-ap108'))[1].text.split(/\s+/).slice(0,8).join(' ')+'"';
 const raw=data(await call('search_texts',{query:phrase,collection:'tha-ap108',english:'off'}));
 const selected=canonicalSearchSelection(new URLSearchParams({q:phrase,scope:'canon'}));
 // Search page limits are a UI request identity, so request its literal limit.
 const response=data(await call('search_texts',{query:phrase,english:'auto',limit:selected.limit}));
 assert.ok(raw.results.length);assert.ok(response.results.length);
 for(const hit of response.results.filter(x=>x.id==='tha-ap108')){assert.equal(hit.read_with.source_commit,current);assert.equal(hit.context_with.source_commit,current);data(await call('get_text',(({tool,...args})=>args)(hit.read_with)));}
 const args=selected;validateCanonicalSearch(response,args);
 for(const value of [undefined,original]){const bad=structuredClone(response),hit=bad.results.find(x=>x.id==='tha-ap108');assert.ok(hit);if(value===undefined)delete hit.read_with.source_commit;else hit.read_with.source_commit=value;assert.throws(()=>validateCanonicalSearch(bad,args));}
 const old=structuredClone(response),hit=old.results.find(x=>x.id==='tha-ap108');delete hit.source.locator_revision;delete hit.read_with.source_commit;delete hit.context_with.source_commit;assert.throws(()=>validateCanonicalSearch(old,args));
});

test('unrepaired canonical and direct original source-book reads keep existing unversioned offset contracts',async()=>{
 const normal=data(await call('get_text',{uid:'mn10',offset:0,limit:1}));assert.equal(normal.text_id,'mn10');
 const book=canon.load().canon.books[unit('tha-ap108').book];
 const id=book.file.replace(/\.mul\.xml$/,'');
 const raw=data(await call('get_text',{book:id,offset:0,limit:1}));assert.equal(raw.source.commit,original);assert.equal(raw.source.locator_revision,undefined);
});

test('both embedded hosts refuse stale initial paired payloads before words and accept the current source',async()=>{
 for(const bridge of ['MCP Apps','Apps SDK'])for(const id of ['tha-ap107','tha-ap108']){
  const actual=await readPassage({uid:id,limit:1,english:false});
  const widget=view(bridge);widget.output(actual);assert.ok(widget.elements.pali.textContent.includes(actual.pali.segments[0].text));
  for(const revision of [undefined,original]){const bad=structuredClone(actual);if(revision===undefined)delete bad.source.locator_revision;else bad.source.locator_revision=revision;widget.output(bad);assert.match(widget.elements.status.textContent,/mapping revision changed/);assert.ok(!widget.elements.pali.textContent.includes(actual.pali.segments[0].text));assert.equal(widget.elements.english.textContent.includes(actual.pali.segments[0].text),false);}
 }
});

test('duplicate legacy and versioned identities quarantine drafts without loss while unrelated current notes are saved',()=>{
 const originalMark={uid:'tha-ap107',ref:'tha-ap107/2',offset:1,title:'Public synthetic old source',note:'Public synthetic saved old note',source_commit:original};
 const draft='Public synthetic independent unsaved draft ā😀';
 for(const ambiguous of [true,false]){
  const legacy={...originalMark,ref:ambiguous?originalMark.ref:'tha-ap107/4',offset:ambiguous?1:3};delete legacy.source_commit;
  const saved=[originalMark,legacy],drafts=new Map([[passageNoteKey(originalMark),draft]]);
  const journal=stageNoteDraftEntry([],originalMark,draft),raw=serializeNoteDraftJournal(journal),before=JSON.stringify(saved);
  const context={uid:'tha-ap108',ref:'tha-ap108/3',offset:2,title:'Public synthetic current source',source_commit:current};
  const ensured=passageNoteTransaction(saved,drafts,context,{type:'ensure'});assert.equal(ensured.drafts.get(passageNoteKey(originalMark)),draft);
  const newEntry={bookmark:ensured.item,draft:'Public synthetic current saved note'};
  const staged=stageNoteDraftEntry(journal,newEntry.bookmark,newEntry.draft),newDrafts=new Map(ensured.drafts);newDrafts.set(passageNoteKey(context),newEntry.draft);
  const savedNew=passageNoteTransaction(ensured.saved,newDrafts,context,{type:'save',note:newEntry.draft});
  assert.equal(savedNew.drafts.get(passageNoteKey(originalMark)),draft);assert.equal(savedNew.drafts.has(passageNoteKey(context)),false);
  const retained=removeNoteDraftEntry(staged,newEntry);assert.equal(serializeNoteDraftJournal(retained),raw);assert.equal(JSON.stringify(saved),before);
  const restored=reconcileNoteDraftJournal(parseNoteDraftJournal(raw),savedNew.saved);
  if(ambiguous){assert.equal(restored.drafts.size,0);assert.equal(restored.pending.length,1);assert.equal(restored.pending[0].reason,'ambiguous-bookmark');assert.deepEqual(restored.pending[0].entry,{bookmark:originalMark,draft});assert.equal(serializeNoteDraftJournal(retained),raw);}
  else{assert.equal(restored.pending.length,0);assert.equal(restored.drafts.get(passageNoteKey(originalMark)),draft);}
  assert.deepEqual(savedNew.saved.slice(0,2),saved);assert.equal(savedNew.saved[2].source_commit,current);
 }
});
