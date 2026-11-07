import {test, afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as english from '../src/english.mjs';
import * as canon from '../src/canon.mjs';
import {liveCache} from '../src/cache.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import {view, fixture, command, settle} from './helpers/widget-view.mjs';
const realFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=realFetch;liveCache.clear();});
const unit=canon.resolve('MN 10').unit;
const original='Synthetic translation prefix fixture. '.repeat(100);
const digest=s=>createHash('sha256').update(s).digest('hex');
function serve(text) {globalThis.fetch=async()=>new Response(`<div id="sutta">${text}</div>`);}
async function follow(page, opts={}) {const a=page.continue_with.arguments;return english.translation(canon.resolve(a.uid).unit,a.translation,{...a,...opts});}
test('emitted continuation checks the exact preceding text and permits later text edits without claiming an immutable edition',async()=>{
 serve(original);const first=await english.translation(unit,undefined,{limit:500});
 assert.equal(first.continue_with.arguments.prefix_sha256,digest(original.slice(0,500)));
 assert.equal(first.prefix_sha256,digest(''));
 liveCache.clear();serve(original.slice(0,500)+'Changed unread suffix fixture. '.repeat(100));
 const next=await follow(first);assert.equal(next.prefix_sha256,first.continue_with.arguments.prefix_sha256);
 assert.match(next.text,/Changed unread suffix/);assert.equal(next.translation_id,first.translation_id);
 assert.equal(next.license,first.license);assert.equal(next.attribution,first.attribution);
});
test('same-URL insertion, deletion and same-length edits before the offset refuse continuation after cache eviction',async()=>{
 for(const edited of ['Inserted fixture. '+original,original.slice(10),'Replaced!'+original.slice(9)]){
  liveCache.clear();serve(original);const first=await english.translation(unit,undefined,{limit:500});
  liveCache.clear();serve(edited);await assert.rejects(follow(first),/prefix changed.*restart at offset 0/i);
 }
});
test('invalid or misplaced prefix guards fail before provider access; legacy offsets explicitly disclose their missing guard',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response(`<div id="sutta">${original}</div>`);};
 const id=english.available(unit).find(x=>x.translation_id.startsWith('dt:')).translation_id;
 for(const opts of [{offset:500,prefix_sha256:'bad'},{offset:0,prefix_sha256:'a'.repeat(64)},{offset:500,prefix_sha256:42}])await assert.rejects(english.translation(unit,id,opts),/prefix_sha256/);
 assert.equal(calls,0);
 const page=await english.translation(unit,id,{offset:500,limit:500});assert.match(page.notes.join(' '),/not guarded against upstream text edits/);
 assert.match(page.continue_with.arguments.prefix_sha256,/^[a-f0-9]{64}$/);
});
test('a changed archive copy under the same ATI version cannot take an old prefix offset',async()=>{
 const id=english.available(unit).find(x=>x.translation_id.startsWith('ati:')).translation_id;
 globalThis.fetch=async()=>new Response(`<body>${original}</body>`);
 const first=await english.translation(unit,id,{limit:500});liveCache.clear();
 globalThis.fetch=async url=>new URL(url).hostname==='accesstoinsight.org'?new Response('Unavailable',{status:503}):new Response(`<body>${original}</body>`);
 const mirrored=await follow(first);assert.equal(mirrored.prefix_sha256,first.continue_with.arguments.prefix_sha256);
 liveCache.clear();globalThis.fetch=async url=>new URL(url).hostname==='accesstoinsight.org'?new Response('Unavailable',{status:503}):new Response(`<body>Changed archive fixture. ${original}</body>`);
 await assert.rejects(follow(first),/prefix changed/);
});
test('multi-page Ānandajoti prefix checking crosses page boundaries without fetching the whole work',async()=>{
 const [id,links]=Object.entries(canon.load().translations).find(([,ls])=>ls.some(l=>l.source==='anandajoti'&&l.parts?.length>=3));
 const link=links.find(l=>l.source==='anandajoti'&&l.parts?.length>=3);const u=canon.resolve(id).unit;
 let edited=false;const calls=[];
 globalThis.fetch=async url=>{const path=decodeURI(new URL(url).pathname);const n=link.parts.indexOf(path);assert.ok(n>=0);calls.push(n);return new Response(`<body><p>${edited&&n===0?'Edited prefix. ':''}${('Synthetic part '+n+' fixture. ').repeat(60)}</p></body>`);};
 const first=await english.translation(u,canon.translationId(link),{limit:500});assert.deepEqual(calls,[0]);
 const next=await follow(first,{limit:2000});assert.match(next.text,/Synthetic part 1 fixture/);assert.ok(calls.length<link.parts.length);
 liveCache.clear();edited=true;await assert.rejects(follow(next),/prefix changed/);
});
test('attached, compared and direct English commands preserve prefix checks through MCP',async()=>{
 serve(original.repeat(10));const [a,b]=InMemoryTransport.createLinkedPair();const client=new Client({name:'prefix-fixture',version:'1'});
 await Promise.all([createServer().connect(b),client.connect(a)]);
 try{
  for(const name of ['get_text','get_translation','compare_translations']){
   liveCache.clear();serve(original.repeat(10));const r=await client.callTool({name,arguments:{uid:'MN 10',...(name==='get_text'?{translation:'default',limit:1}:name==='compare_translations'?{translations:['Thanissaro'],limit:500}:{limit:500})}});
   assert.ok(!r.isError);const t=name==='get_text'?r.structuredContent.english:name==='compare_translations'?r.structuredContent.editions[0]:r.structuredContent;
   assert.match(t.continue_with.arguments.prefix_sha256,/^[a-f0-9]{64}$/);
   const ok=await client.callTool(t.continue_with);assert.ok(!ok.isError);
   liveCache.clear();serve('Inserted fixture. '+original.repeat(10));const bad=await client.callTool(t.continue_with);
   assert.equal(bad.isError,true);assert.match(JSON.parse(bad.content[0].text).error,/prefix changed/);
  }
 }finally{await client.close();}
});
test('hosted English continuation and replay retain prefix guards; a changed prefix leaves Pāli available and reports unavailable English',async()=>{
 serve(original);const first=await readPassage({uid:'MN 10',englishCharacters:500,script:'thai',limit:1});
 const args=first.english.continue_with.arguments;assert.match(args.english_prefix_sha256,/^[a-f0-9]{64}$/);
 const next=await readPassage(args);assert.equal(next.english.read_with.arguments.english_prefix_sha256,next.english.prefix_sha256);
 liveCache.clear();serve('Inserted fixture. '+original);const bad=await readPassage(args);
 assert.equal(bad.english,null);assert.match(bad.english_error,/prefix changed/);assert.deepEqual(bad.pali.segments,first.pali.segments);
});
for(const bridge of ['MCP Apps','Apps SDK'])test(`${bridge}: wrong prefix reply cannot overwrite guarded English navigation`,async()=>{
 const ui=view(bridge);const data=fixture();data.english={text:'Synthetic English fixture',continue_with:command({english:true,english_offset:500,translation:'dt:fixture',english_prefix_sha256:'a'.repeat(64)})};
 ui.output(data);ui.click('Continue English');const reply=fixture('unsafe');reply.english={text:'Wrong prefix fixture',translation_id:'dt:fixture',prefix_sha256:'b'.repeat(64)};
 ui.reply(0,{structuredContent:reply});await settle();assert.equal(ui.elements.title.textContent,'Could not open the passage');assert.doesNotMatch(ui.elements.english.textContent,/Wrong prefix fixture/);
});
