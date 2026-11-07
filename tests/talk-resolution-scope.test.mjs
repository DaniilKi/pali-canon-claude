import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {findTalks} from '../src/talks.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {liveCache} from '../src/cache.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const realFetch=globalThis.fetch;afterEach(()=>{globalThis.fetch=realFetch;liveCache.clear();});
const native=(text,script)=>transliterate(text,'roman',script);
function provider(){const calls=[];return {calls,fetchHtml:async url=>{calls.push(String(url));const category=new URL(url).searchParams.get('cat');return '<ol>'+Array.from({length:3},(_,i)=>`<li class="li-audio search-result"><a href="/audio/${category}/2026/scope-${i}.html">Synthetic ${category} ${i}</a></li>`).join('')+'</ol>';}};}
test('a synthetic multi-text span cannot silently search for only its first translation title',async()=>{
 const p=provider();for(const script of SCRIPTS)for(const ref of ['AN 3.65-66','MN 10-12','Dhp 5-7'])await assert.rejects(findTalks({passage:native(ref,script)},{canon,...p}),/spans multiple texts.*one recorded source group.*one exact passage/);
 assert.equal(p.calls.length,0);
});
test('recorded groups retain their scope and identical range endpoints remain an explicit one-text request',async()=>{
 const p=provider();for(const script of SCRIPTS){
  const group=await findTalks({passage:native('AN 1.296-305',script)},{canon,...p});assert.equal(group.passage.id,'an1.296-305');
  const single=await findTalks({passage:native('AN 3.65-65',script),category:'evening'},{canon,...p});assert.equal(single.passage.id,'an3.65');assert.equal(single.searched_for,'"To the Kalamas"');assert.match(single.notes.join(' '),/identical endpoints/);
 }
});
test('ambiguous PTS pages cannot select the first distinctive source title, while unique page notes survive',async()=>{
 const p=provider();const candidates=canon.resolve('S i 57');assert.ok(candidates.alternatives.length);assert.equal(candidates.unit.id,'sn2.22');
 for(const script of SCRIPTS)await assert.rejects(findTalks({passage:native('S i 57',script)},{canon,...p}),/multiple canonical passages.*SN 2.22.*SN 2.23.*one exact passage/);
 assert.equal(p.calls.length,0);
 const unique=await findTalks({passage:'A i 189',category:'evening'},{canon,...p});assert.equal(unique.passage.id,'an3.65');for(const note of [...canon.resolve('A i 189').notes,...canon.resolve(unique.passage.id).notes])assert.ok(unique.notes.includes(note));assert.equal(new Set(unique.notes).size,unique.notes.length);
});
test('numbering and resolution cautions survive searched and no-search replies without replacing link-only labels',async()=>{
 const p=provider();for(const passage of ['AN 3.65','AN 7.64','M i 1','SN 12.21','an3.65:1.1','https://www.dhammatalks.org/suttas/AN/AN3_66.html']){
  const r=await findTalks({passage,category:'evening'},{canon,...p});for(const note of [...canon.resolve(passage).notes,...canon.resolve(r.passage.id).notes])assert.ok(r.notes.includes(note),`${passage}: ${note}`);assert.match(r.notes[0],/Links only/);assert.match(r.notes[1],/not scripture/);
 }
 const r=await findTalks({passage:'AN 3.65',category:'evening'},{canon,...p});assert.match(r.notes.join(' '),/Also numbered AN 3.66/);assert.match(r.passage.translation_url,/AN3_66/);assert.equal(r.passage.id,'an3.65');
});
test('a valid cursor cannot acquire broader range or ambiguous page scope before provider access',async()=>{
 const p=provider();const first=await findTalks({passage:'AN 3.65',category:'evening',limit:1},{canon,...p});liveCache.clear();const count=p.calls.length;
 for(const script of SCRIPTS)await assert.rejects(findTalks({passage:native('AN 3.65-66',script),category:'evening',cursor:first.next_cursor},{canon,...p}),/spans multiple texts/);
 await assert.rejects(findTalks({passage:'S i 57',category:'evening',cursor:first.next_cursor},{canon,...p}),/multiple canonical passages/);assert.equal(p.calls.length,count);
 const alias=await findTalks({passage:'A i 189',category:'evening',cursor:first.next_cursor,limit:1},{canon,...p});assert.match(alias.results[0].title,/evening 1$/);assert.match(alias.notes.join(' '),/PTS A i 189/);
});
test('malformed or missing range endpoints stay errors rather than shrinking to valid first passages',async()=>{
 const p=provider();for(const ref of ['AN 3.65-9999','AN 3.65-3.64','AN 3.65-0','AN 3.65-3.66.1'])await assert.rejects(findTalks({passage:ref},{canon,...p}));assert.equal(p.calls.length,0);
});
test('MCP retains numbering notes and refuses broad scope without returning an arbitrary passage or talks',async()=>{
 const p=provider();globalThis.fetch=async url=>new Response(await p.fetchHtml(url));const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'talk-resolution-scope',version:'1'}),server=createServer();
 try{await Promise.all([client.connect(a),server.connect(b)]);
  const first=await client.callTool({name:'find_talks',arguments:{passage:'AN ๓.๖๕',category:'evening',limit:1}});assert.ok(!first.isError);assert.deepEqual(JSON.parse(first.content[0].text),first.structuredContent);assert.match(first.structuredContent.notes.join(' '),/Also numbered AN 3.66/);
  for(const passage of ['AN 3.65-66','AN ๓.๖๕-๖๖','S i 57']){const r=await client.callTool({name:'find_talks',arguments:{passage,category:'evening',cursor:first.structuredContent.next_cursor}});assert.equal(r.isError,true);const d=JSON.parse(r.content[0].text);assert.match(d.error,/spans multiple texts|multiple canonical passages/);assert.equal(d.passage,undefined);assert.equal(d.results,undefined);}
 }finally{await client.close();await server.close();}
});
