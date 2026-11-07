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
function provider(){const calls=[];return {calls,fetchHtml:async url=>{calls.push(String(url));const u=new URL(url),q=u.searchParams.get('q'),category=u.searchParams.get('cat');assert.equal(u.pathname,'/search/');return '<ol>'+Array.from({length:3},(_,i)=>`<li class="li-audio search-result"><a href="/audio/${category}/2026/native-fixture-${i}.html">Synthetic ${q} ${category} ${i}</a></li>`).join('')+'</ol>';}};}
function source(r){const {input_script,input_romanized,passage_input_script,passage_input_romanized,...rest}=r;return rest;}
function label(r,script,text,prefix=''){assert.equal(r[prefix+'input_script'],script==='roman'?undefined:script);assert.equal(r[prefix+'input_romanized'],script==='roman'?undefined:text.toLowerCase());}
test('handwritten Thai query conversion precedes mark stripping and preserves quoted Pali phrases',async()=>{
 const p=provider();const r=await findTalks({query:'สติ',category:'evening'},{canon,...p});assert.equal(r.input_script,'thai');assert.equal(r.input_romanized,'sati');assert.equal(r.searched_for,'sati');assert.equal(new URL(p.calls[0]).searchParams.get('q'),'sati');
 const quoted=await findTalks({query:'“สติ สมาธิ”',category:'evening'},{canon,...p});assert.equal(quoted.input_romanized,'“sati samādhi”');assert.equal(quoted.searched_for,'"sati samadhi"');
});
test('all supported scripts retain query, passage, source-title safeguards and separate input provenance',async()=>{
 const p=provider();const expected=await findTalks({query:'jhāna',passage:'AN 3.65',limit:1},{canon,...p});
 for(const script of SCRIPTS){const r=await findTalks({query:native('jhāna',script),passage:native('AN 3.65',script),limit:1},{canon,...p});assert.deepEqual(source(r),expected);label(r,script,'jhāna');label(r,script,'AN 3.65','passage_');assert.equal(r.passage.id,'an3.65');assert.match(r.notes.join(' '),/not that the talk is about this sutta/);assert.match(r.notes[0],/Links only/);assert.match(r.notes[1],/not scripture/);}
 const separate=await findTalks({query:'ඣාන',passage:'AN ๓.๖๕',limit:1},{canon,...p});assert.equal(separate.input_script,'sinhala');assert.equal(separate.input_romanized,'jhāna');assert.equal(separate.passage_input_script,'thai');assert.equal(separate.passage_input_romanized,'AN 3.65');
 const only=await findTalks({passage:'AN ๓.๖๕',category:'evening'},{canon,...p});assert.equal(only.input_script,undefined);assert.equal(only.passage_input_script,'thai');
});
test('equivalent scripts resume a Roman cursor without changing source scope or cross-page interleaving',async()=>{
 const p=provider();const first=await findTalks({query:'jhāna',passage:'AN 3.65',limit:1},{canon,...p});
 const expected=await findTalks({query:'jhana',passage:'an3.65',limit:3,cursor:first.next_cursor},{canon,...p});
 for(const script of SCRIPTS){const r=await findTalks({query:native('jhāna',script),passage:native('AN 3.65',script),limit:3,cursor:first.next_cursor},{canon,...p});assert.deepEqual(source(r),expected);assert.deepEqual(r.results.map(x=>x.category),['morning','evening','morning']);}
 let cursor;const results=[];for(const script of SCRIPTS.slice(0,6)){const r=await findTalks({query:native('sati',script),limit:1,...(cursor?{cursor}:{})},{canon,...p});results.push(...r.results);cursor=r.next_cursor;}assert.equal(cursor,undefined);assert.equal(new Set(results.map(x=>x.url)).size,6);assert.deepEqual(results.map(x=>x.category),['evening','morning','evening','morning','evening','morning']);
});
test('mixed unsupported input and changed native cursor scopes fail before provider access',async()=>{
 const p=provider();const first=await findTalks({query:'sati',category:'evening',limit:1},{canon,...p});const before=p.calls.length;
 for(const value of ['สति','ส่ติ','漢sati字','ηsati']){await assert.rejects(findTalks({query:value},{canon,...p}),/converted completely/);await assert.rejects(findTalks({passage:value},{canon,...p}),/converted completely/);}
 for(const script of SCRIPTS)await assert.rejects(findTalks({query:native('jhāna',script),category:'evening',cursor:first.next_cursor},{canon,...p}),/cursor.*different/i);
 await assert.rejects(findTalks({passage:'AN ๓.๙๙๙๙'},{canon,...p}));assert.equal(p.calls.length,before);
});
test('native generic, shared-title and unlinked passages retain labelled no-search results and reject foreign cursors',async()=>{
 const p=provider();for(const passage of ['MN 118','SN 48.42','Dhp 183','Pj 1']){const expected=await findTalks({passage},{canon,...p});assert.equal(expected.searched_for,null);for(const script of SCRIPTS){const r=await findTalks({passage:native(passage,script)},{canon,...p});assert.deepEqual(source(r),expected);label(r,script,passage,'passage_');await assert.rejects(findTalks({passage:native(passage,script),cursor:'unrelated'},{canon,...p}),/no distinctive/);}}assert.equal(p.calls.length,0);
});
test('MCP native talk search exposes separate provenance and compatible continuations without transcripts',async()=>{
 const p=provider();globalThis.fetch=async url=>new Response(await p.fetchHtml(url));const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'native-talk-fixture',version:'1'}),server=createServer();
 const read=async args=>{const r=await client.callTool({name:'find_talks',arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
 try{await Promise.all([client.connect(a),server.connect(b)]);const first=await read({query:'jhāna',passage:'AN 3.65',category:'evening',limit:1});
 for(const script of SCRIPTS){const r=await read({query:native('jhāna',script),passage:native('AN 3.65',script),category:'evening',limit:1,cursor:first.next_cursor});assert.equal(r.results.length,1);assert.match(r.results[0].title,/evening 1$/);assert.equal(r.results[0].text,undefined);label(r,script,'jhāna');label(r,script,'AN 3.65','passage_');}
 const bad=await client.callTool({name:'find_talks',arguments:{query:'สति'}});assert.equal(bad.isError,true);assert.match(JSON.parse(bad.content[0].text).error,/converted completely/);
 }finally{await client.close();await server.close();}
});
