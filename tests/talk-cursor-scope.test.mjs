import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {findTalks,parseCursor} from '../src/talks.mjs';
import {liveCache} from '../src/cache.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const realFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=realFetch;liveCache.clear();});
function provider(){const calls=[];const fetchHtml=async url=>{calls.push(String(url));const u=new URL(url),q=u.searchParams.get('q'),cat=u.searchParams.get('cat');return '<ol>'+Array.from({length:3},(_,i)=>`<li class="li-audio search-result"><a href="/audio/${cat}/2026/fixture-${i}.html">Synthetic ${q} ${cat} result ${i}</a></li>`).join('')+'</ol>';};return {calls,fetchHtml};}
test('changed query, passage or category rejects a talk cursor before any new provider request',async()=>{
 const p=provider();const first=await findTalks({query:'metta',category:'evening',limit:1},{canon,...p});const count=p.calls.length;
 for(const args of [{query:'jhana',category:'evening'},{query:'metta',category:'all'},{query:'metta',category:'evening',passage:'AN 3.65'}])await assert.rejects(findTalks({...args,cursor:first.next_cursor},{canon,...p}),/cursor.*different/i);
 assert.equal(p.calls.length,count);
 const fresh=await findTalks({query:'jhana',category:'evening',limit:1},{canon,...p});assert.match(fresh.results[0].title,/result 0$/);
});
test('resolved passage aliases and normalized topic spelling retain the same cursor scope; limit and page do not change scope',async()=>{
 const p=provider();const first=await findTalks({passage:'AN 3.65',query:'jhāna',category:'morning',limit:1},{canon,...p});
 const next=await findTalks({passage:'an3.65',query:'jhana',category:'morning',limit:2,page:9,cursor:first.next_cursor},{canon,...p});
 assert.equal(next.results.length,2);assert.match(next.results[0].title,/result 1$/);assert.equal(next.has_more,false);
 assert.ok(next.notes.some(n=>/not that the talk is about this sutta/.test(n)));assert.match(next.notes[0],/Links only/);
});
test('a cursor cannot become an empty successful result by switching to a nonsearchable passage',async()=>{
 const p=provider();const first=await findTalks({query:'metta',category:'evening',limit:1},{canon,...p});
 const count=p.calls.length;await assert.rejects(findTalks({passage:'Dhp 183',cursor:first.next_cursor},{canon,...p}),/cursor.*no distinctive/i);assert.equal(p.calls.length,count);
});
test('legacy, empty and malformed cursor states require an explicit restart and valid cursors fit the existing API limit',async()=>{
 const p=provider();const first=await findTalks({query:'metta',limit:1},{canon,...p});assert.ok(first.next_cursor.length<=100);
 const prefix=first.next_cursor.split(':').slice(0,2).join(':')+':';
 const count=p.calls.length;
 for(const bad of ['',null,'evening:1:1','v1:bad:evening:1:0',prefix+'evening:0:0',prefix+'evening:1:0,evening:2:0',prefix+'unknown:1:0'])await assert.rejects(findTalks({query:'metta',cursor:bad},{canon,...p}),/cursor/i);
 assert.equal(p.calls.length,count);
 assert.ok((prefix+'evening:500:100,morning:500:100').length<=100);
 assert.equal(parseCursor('evening:500:100,morning:500:100',['evening','morning']).length,2);
});
test('MCP binds talk continuations and exposes explicit errors rather than skipping the new query',async()=>{
 const p=provider();globalThis.fetch=async url=>new Response(await p.fetchHtml(url));
 const [a,b]=InMemoryTransport.createLinkedPair();const client=new Client({name:'talk-cursor-fixture',version:'1'});await Promise.all([createServer().connect(b),client.connect(a)]);
 try{
  const first=await client.callTool({name:'find_talks',arguments:{query:'metta',category:'evening',limit:1}});assert.ok(!first.isError);
  const cursor=first.structuredContent.next_cursor,count=p.calls.length;
  const bad=await client.callTool({name:'find_talks',arguments:{query:'jhana',category:'evening',cursor}});assert.equal(bad.isError,true);assert.match(JSON.parse(bad.content[0].text).error,/cursor.*different/i);assert.equal(p.calls.length,count);
  const next=await client.callTool({name:'find_talks',arguments:{query:'metta',category:'evening',cursor,limit:1}});assert.ok(!next.isError);assert.match(next.structuredContent.results[0].title,/result 1$/);
 }finally{await client.close();}
});
test('one-result pages alternate both categories instead of exhausting evening before morning',async()=>{
 const p=provider();const titles=[];let cursor;
 for(let i=0;i<6;i++){
  const page=await findTalks({query:'single-page rotation fixture',limit:1,...(cursor?{cursor}:{})},{canon,...p});
  assert.equal(page.returned,1);titles.push(page.results[0].title);cursor=page.next_cursor;
  assert.equal(page.has_more,i<5);
 }
 assert.deepEqual(titles.map(t=>t.match(/(evening|morning) result (\d)$/).slice(1)),[['evening','0'],['morning','0'],['evening','1'],['morning','1'],['evening','2'],['morning','2']]);
 assert.equal(new Set(titles).size,6);assert.equal(cursor,undefined);
});
test('odd and changing page limits retain round-robin order without omissions or repetition',async()=>{
 const p=provider();let cursor;const results=[];
 for(const limit of [3,2,1]){
  const page=await findTalks({query:'variable-page rotation fixture',limit,...(cursor?{cursor}:{})},{canon,...p});
  results.push(...page.results);cursor=page.next_cursor;
 }
 assert.deepEqual(results.map(t=>t.category),['evening','morning','evening','morning','evening','morning']);
 assert.equal(new Set(results.map(t=>t.url)).size,6);assert.equal(cursor,undefined);
});
