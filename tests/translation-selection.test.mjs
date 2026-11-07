import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as english from '../src/english.mjs';
import * as canon from '../src/canon.mjs';
import {liveCache} from '../src/cache.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
const realFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=realFetch;liveCache.clear();});
const key=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
function sources({down=false}={}) {const calls=[];globalThis.fetch=async url=>{calls.push(String(url));const dt=new URL(url).hostname.includes('dhammatalks');return new Response('<body><div id="sutta">Synthetic translator selection fixture.</div></body>',{status:down&&dt?503:200});};return calls;}
test('ambiguous names and provider fragments fail before fetching instead of guessing a translator',async()=>{
 const calls=sources();
 for(const [ref,selector] of [['Dhp 1','Bhikkhu'],['MN 10','Thera'],['MN 10','ati'],['Dhp 1','a']]){
  await assert.rejects(english.translation(canon.resolve(ref).unit,selector),e=>{
   assert.match(e.message,/Ambiguous translation selector/);assert.match(e.message,/different translators/);assert.match(e.message,/exact translation_id/);return true;
  });
 }
 assert.equal(calls.length,0);
});
test('all indexed exact IDs and author labels stay selectable offline',()=>{
 let versions=0;
 for(const [id,links] of Object.entries(canon.load().translations))for(const link of links){
  const exact=english.selectTranslation(links,canon.translationId(link),id);assert.equal(exact.link,link);versions++;
  const name=english.selectTranslation(links,link.translator,id);assert.equal(key(name.link.translator),key(link.translator));
 }
 assert.ok(versions>=2500);
});
test('an exact author label wins over a partial jointly credited label without conflating authors (synthetic metadata)',()=>{
 const joint={source:'ati',path:'/tipitaka/fixture.joint',translator:'Fixture Translator and Coauthor'};
 const single={source:'ati',path:'/tipitaka/fixture.single',translator:'Fixture Translator'};
 assert.equal(english.selectTranslation([joint,single],'Fixture Translator','fixture').link,single);
 assert.throws(()=>english.selectTranslation([joint,single],'Fixture','fixture'),/Ambiguous/);
});
test('unambiguous folded names and a single-author source selector preserve the requested translator and notices',async()=>{
 const calls=sources();
 for(const [ref,selector,translator] of [['Dhp 1','Anandajoti','Ānandajoti Bhikkhu'],['MN 10','Soma','Soma Thera'],['MN 10','dhammatalks','Ṭhānissaro Bhikkhu']]){
  const page=await english.translation(canon.resolve(ref).unit,selector);assert.equal(page.translator,translator);assert.ok(page.license);assert.ok(page.attribution);
 }
 assert.ok(calls.length>=3);
});
test('same-translator versions retain existing order and disclose the actual fetched edition even on fallback',async()=>{
 const unit=canon.resolve('MN 10').unit;sources();
 const normal=await english.translation(unit,'Thanissaro');assert.equal(normal.translation_id,'dt:MN/MN10');
 assert.match(normal.notes.join(' '),/Several linked versions/);assert.ok(normal.notes.some(n=>n.includes('selected '+normal.translation_id)));
 assert.equal(normal.continue_with,null);
 liveCache.clear();sources({down:true});
 const fallback=await english.translation(unit,'Ṭhānissaro Bhikkhu');assert.match(fallback.translation_id,/^ati:/);
 assert.ok(fallback.notes.some(n=>n.includes('selected '+fallback.translation_id)));assert.ok(!fallback.notes.some(n=>n.includes('selected dt:')));
 assert.match(fallback.notes.join(' '),/earlier version/);
});
test('exact version IDs and default selection retain their identity without a selector ambiguity notice',async()=>{
 sources();const unit=canon.resolve('Dhp 1').unit;
 const first=await english.translation(unit);assert.match(first.translation_id,/^dt:/);
 const aj=english.available(unit).find(t=>t.translation_id.startsWith('aj:'));const exact=await english.translation(unit,aj.translation_id);
 assert.equal(exact.translation_id,aj.translation_id);assert.ok(!exact.notes.some(n=>/Several linked versions/.test(n)));
 await assert.rejects(english.translation(unit,'Missing translator fixture'),/not linked.*Available:/);
});
test('MCP ambiguity is explicit for direct, attached and compared English while Pāli stays available',async()=>{
 const calls=sources();const [a,b]=InMemoryTransport.createLinkedPair();const client=new Client({name:'translator-selection-fixture',version:'1'});
 await Promise.all([createServer().connect(b),client.connect(a)]);
 try{
  const direct=await client.callTool({name:'get_translation',arguments:{uid:'Dhp 1',translation:'Bhikkhu'}});assert.equal(direct.isError,true);assert.match(JSON.parse(direct.content[0].text).error,/Ambiguous translation selector/);
  const attached=await client.callTool({name:'get_text',arguments:{uid:'Dhp 1',translation:'Bhikkhu',limit:1}});assert.ok(!attached.isError);assert.match(attached.structuredContent.english_error,/Ambiguous/);assert.ok(attached.structuredContent.segments.length);
  const compared=await client.callTool({name:'compare_translations',arguments:{uid:'Dhp 1',translations:['Bhikkhu'],limit:500}});assert.match(compared.structuredContent.editions[0].error,/Ambiguous/);
  assert.equal(calls.length,0);
  const known=await client.callTool({name:'get_translation',arguments:{uid:'MN 10',translation:'Soma'}});assert.ok(!known.isError);assert.equal(known.structuredContent.translator,'Soma Thera');
 }finally{await client.close();}
});
test('hosted ambiguous English does not choose another translator or hide the canonical source',async()=>{
 const calls=sources();const page=await readPassage({uid:'Dhp 1',translation:'Bhikkhu',english:true,script:'thai',limit:1});
 assert.equal(page.english,null);assert.match(page.english_error,/Ambiguous translation selector/);assert.ok(page.pali.segments.length);assert.equal(page.script,'thai');assert.equal(calls.length,0);
});
