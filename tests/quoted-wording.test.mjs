import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import {auditQuotedWording} from '../scripts/evidence/quoted-wording.mjs';

async function session(fn){const server=createServer(),client=new Client({name:'quoted-wording',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();try{await server.connect(a);await client.connect(b);await fn(client);}finally{await client.close();await server.close();}}

test('copied quoted wording remains reachable across all scripts and combined source scopes',()=>session(async c=>{
 const result=await auditQuotedWording(c);assert.equal(result.searches,64);assert.equal(result.reads,96);assert.equal(result.commentary_searches,16);assert.equal(result.canonical_searches,8);assert.equal(result.source_book_searches,8);assert.equal(result.combined,8);assert.equal(result.native_combined,8);
}));
test('source preference uses total matches across pages and retains invalid-scope errors',()=>session(async c=>{
 for(const query of ['"abalaabalo"','“abalaabalo”']){
  const r=await c.callTool({name:'search_post_canonical',arguments:{query,books:['niruttidipani'],offset:10,limit:1}});assert.ok(!r.isError);assert.equal(r.structuredContent.total_matched,1);assert.equal(r.structuredContent.query,query);assert.equal(r.structuredContent.query_mode,'as_typed_phrase');assert.deepEqual(r.structuredContent.results,[]);assert.equal(r.structuredContent.next_offset,null);
 }
 const bad=await c.callTool({name:'search_post_canonical',arguments:{query:'"abalaabalo"',books:['niruttidipani','missing-book']}});assert.equal(bad.isError,true);assert.match(bad.content[0].text,/Unknown post-canonical book filter/);
}));
test('keyboard inference remains labelled when a quoted source spelling is absent or input is unquoted',()=>session(async c=>{
 for(const [name,args]of [['search_texts',{query:'"nibbaana"',english:'off'}],['search_post_canonical',{query:'"sa.myutta"',books:['vism']}],['search_commentary',{query:'"sa.myutta"'}],['search_source_book',{query:'"sa.myutta"',book:'s0201m'}],['search_post_canonical',{query:'abalaabalo',books:['niruttidipani']}]]){
  const r=await c.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));assert.ok(r.structuredContent.input_normalised,name);assert.notEqual(r.structuredContent.query_mode,'as_typed_phrase');
 }
}));
