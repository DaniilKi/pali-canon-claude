import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { canonicalSearchSelection, canonicalSearchRoute, validateCanonicalSearch, canonicalSearchLink } from '../web/canonical-search.mjs';
import { assertPositionPin, sourceRevision } from '../web/reading-position.mjs';
import { assertPagePin } from '../web/reading-navigation.mjs';
const copy = x => JSON.parse(JSON.stringify(x));
let client;
before(async () => { const [a,b] = InMemoryTransport.createLinkedPair(); client = new Client({ name:'web-search-test', version:'1' }); await Promise.all([createServer().connect(b),client.connect(a)]); });
after(async () => { await client?.close(); });
async function tool(name, args) { const r = await client.callTool({ name, arguments:args }); assert.ok(!r.isError, JSON.stringify(r.content)); return r.structuredContent; }
const select = (q, offset = 0, script = 'roman') => canonicalSearchSelection(new URLSearchParams({ q, scope:'canon', offset }), script);
const search = (s) => tool('search_texts',{query:s.query,offset:s.offset,limit:s.limit,script:s.script});
const params = href => new URLSearchParams(href.slice(href.indexOf('?')+1));

test('canonical search route accepts only bounded public search fields and exact pagination', () => {
 const s=select('  mettā  '); assert.equal(s.query,'mettā'); assert.equal(params(canonicalSearchRoute(s,15)).get('offset'),'15');
 for (const raw of ['q=','q=metta&q=foo','q=metta&scope=canon&scope=post','q=metta&scope=post','q=metta&offset=-1','q=metta&offset=01','q=metta&offset=100001','q=metta&source=old','q=metta&ref=mn1/1','q=metta&note=private','q=metta&offset=0&unknown=1','q=metta&book=vin02m1']) assert.throws(()=>canonicalSearchSelection(new URLSearchParams(raw)),raw);
 for (const raw of ['q=%ZZ','q=%C3%28']) assert.throws(()=>canonicalSearchSelection(new URLSearchParams(raw),'roman',raw));
 assert.throws(()=>select('x'.repeat(301))); assert.throws(()=>canonicalSearchRoute(s,1.5));
});

test('actual canonical body and title hits retain distinct exact reading/source-page links', async () => {
 const selected=select('dasabala'), data=validateCanonicalSearch(await search(selected),selected);
 const bodySelection=select('"dasabalasamannāgato, bhikkhave, tathāgato catūhi ca vesārajjehi"'), bodyData=validateCanonicalSearch(await search(bodySelection),bodySelection);
 for (const [rows,body] of [[data.title_matches,false],[bodyData.results,true]]) {
  const hit=rows.find(x=>x.id==='sn12.21');assert.ok(hit);const p=params(canonicalSearchLink(hit,body));
  assert.equal(p.get('uid'),'sn12.21');assert.match(sourceRevision(hit),/-sn-dasabala-v1$/);
  const read=await tool('get_text',{uid:hit.id,offset:Number(p.get('offset')),limit:1,script:'roman'});
  assert.equal(sourceRevision(read),sourceRevision(hit));
  if(body){assert.equal(p.get('source'),sourceRevision(read));assert.equal(p.get('ref'),read.segments[0].ref);assert.equal(p.get('ref'),'sn12.21/3');assertPositionPin(p,read);}
  else{assert.equal(p.get('page_source'),sourceRevision(read));assert.equal(p.has('ref'),false);assert.equal(p.has('source'),false);assert.equal(p.get('offset'),'0');assertPagePin(p,read);}
  const changed={...read,source:{...read.source,locator_revision:'changed-search-source'}};
  assert.throws(()=>body?assertPositionPin(p,changed):assertPagePin(p,changed),/changed/);
 }
});

test('overlapping title/body identities remain available and their pagination stays independent', async () => {
 const s=select('satipatthana'),d=validateCanonicalSearch(await search(s),s);assert.ok(d.title_matches.some(x=>x.id==='mn10'));assert.ok(d.results.some(x=>x.id==='mn10'));
 for(const offset of [0,15,30]){const selected=select('metta',offset),raw=await search(selected),d=validateCanonicalSearch(raw,selected);assert.equal(d.next_offset,raw.next_offset);assert.equal(d.title_next_offset,raw.title_next_offset);assert.equal(d.results.length,raw.results.length);assert.equal(d.title_matches.length,raw.title_matches.length);if(offset===30){assert.equal(d.title_matches.length,0);assert.ok(d.results.length>0);}}
});

test('original query selection survives native, keyboard, English and quoted-source inference', async () => {
 for(const [q,script] of [['saṁyutta','roman'],['SAṀYUTTA','roman'],['"saṁyutta"','roman'],['sam\u0323yutta','roman'],['සතිපට්ඨාන','sinhala'],['sa.myutta','roman'],['mindfulness of breathing','roman'],['how many jhanas are there','roman'],['"anussati कर्म"','devanagari']]) {
  const s=select(q,0,script),raw=await search(s),d=validateCanonicalSearch(raw,s);assert.equal(d.selection.query,q);assert.equal(d.selection.script,script);assert.equal(d.query,raw.query);
  for(const k of ['input_romanized','input_script','input_normalised','expanded_from_english','query_mode','query_note','english_words_ignored','spelling_note']) if(Object.hasOwn(raw,k))assert.deepEqual(d[k],raw[k]);
 }
});

test('mismatched request/counts/source/identity/commands fail before presenting excerpts', async () => {
 const s=select('dasabala'),raw=await search(s),bad=[];
 for(const patch of [{query:'unreported query substitution'},{selection:{...raw.selection,query:'metta'}},{selection:{...raw.selection,collection:'sn12.21'}},{selection:{...raw.selection,include_post_canonical:true}},{canonical:false},{offset:15},{limit:14},{total_texts_matched:0},{next_offset:1},{title_next_offset:1},{post_canonical:{}},{scope_alignment:{note:'wrong scope'}}])bad.push({...copy(raw),...patch});
 for(const patch of [{commit:'different-edition'},{repository:'https://example.com'},{attribution:''},{terms:''},{locator_revision:'bad<source>'}]){const d=copy(raw);d.results[0].source={...d.results[0].source,...patch};bad.push(d);}
 for(const patch of [{id:'mn10'},{citation:'MN 10'},{segment_ref:'sn12.21/999'},{read_with:{tool:'get_translation',uid:'sn12.21'}},{read_with:{tool:'get_text',uid:'sn12.21',offset:0,limit:30}},{context_with:{tool:'get_text',uid:'mn10',offset:0,limit:3}},{source:null},{alignment:{note:''}}]){const d=copy(raw);d.results[0]={...d.results[0],...patch};bad.push(d);}
 {const d=copy(raw);d.title_matches[0].read_with.offset=0;bad.push(d);}
 {const d=copy(raw);d.results[1]=copy(d.results[0]);bad.push(d);}
 for(const d of bad)assert.throws(()=>validateCanonicalSearch(d,s),/incomplete or inconsistent/);
});

test('validated views omit unrelated private/source-body fields without mutating the response', async()=>{
 const s=select('dasabala'),raw=await search(s);raw.private_note='private fixture';raw.results[0].private_note='private fixture';raw.results[0].source_body='unrelated body';const d=validateCanonicalSearch(raw,s);
 assert.equal(d.private_note,undefined);assert.equal(d.results[0].private_note,undefined);assert.equal(d.results[0].source_body,undefined);d.results[0].source.terms='changed';assert.notEqual(raw.results[0].source.terms,d.results[0].source.terms);
});
