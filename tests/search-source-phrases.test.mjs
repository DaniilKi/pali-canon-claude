import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import {sourceGrammarFixtures} from '../scripts/evidence/source-phrases.mjs';
import {sourceQuoteFixtures} from '../scripts/evidence/source-quotes.mjs';

test('all seven printed grammar phrases preserve source glyphs and exact reading commands',async()=>{
 const fixtures=sourceGrammarFixtures();assert.equal(fixtures.length,7);
 const [a,b]=InMemoryTransport.createLinkedPair(),s=createServer(),c=new Client({name:'grammar-source',version:'1'});await s.connect(a);await c.connect(b);
 try {
  for(const f of fixtures)for(const script of ['roman','thai']) {
   const r=await c.callTool({name:'search_post_canonical',arguments:{query:f.query,books:[f.book],script,limit:1}});assert.ok(!r.isError,JSON.stringify(r.content));const x=r.structuredContent;
   assert.equal(x.query,f.query);assert.equal(x.query_mode,'source_phrase');assert.equal(x.canonical,false);assert.equal(x.input_script,undefined);assert.equal(x.input_romanized,undefined);assert.equal(x.input_normalised,undefined);assert.ok(x.total_matched>0);assert.match(x.query_note,/without native-script conversion/);
   const hit=x.results[0],{tool,...args}=hit.read_with;assert.equal(hit.book_id,f.book);assert.equal(args.script,script);
   const read=await c.callTool({name:tool,arguments:args});assert.ok(!read.isError);assert.equal(read.structuredContent.canonical,false);const text=read.structuredContent.segments.map(s=>s.text).join('\n');for(const glyph of f.glyphs)assert.ok(text.includes(glyph));if(script==='roman')assert.ok(text.includes(f.phrase));
  }
  const canonical=sourceQuoteFixtures().find(f=>f.text.includes('ऋ')),canonicalQuery='"'+canonical.text+'"';
  const root=await c.callTool({name:'search_texts',arguments:{query:canonicalQuery,collection:'ne37',limit:1}});assert.ok(!root.isError,JSON.stringify(root.content));assert.equal(root.structuredContent.query_mode,'source_phrase');assert.equal(root.structuredContent.results[0].id,'ne37');const {tool:reader,...rootArgs}=root.structuredContent.results[0].read_with;const rootRead=await c.callTool({name:reader,arguments:rootArgs});assert.ok(!rootRead.isError);assert.ok(rootRead.structuredContent.segments.some(s=>s.text.includes(canonical.text)));
  const f=fixtures[0],curly='“'+f.phrase+'”';
  const combined=await c.callTool({name:'search_texts',arguments:{query:curly,include_post_canonical:true,limit:1}});assert.ok(!combined.isError,JSON.stringify(combined.content));assert.equal(combined.structuredContent.query,curly);assert.equal(combined.structuredContent.query_mode,'source_phrase');assert.equal(combined.structuredContent.post_canonical.canonical,false);assert.ok(combined.structuredContent.post_canonical.total_matched>0);assert.equal(combined.structuredContent.expanded_from_english,undefined);
 } finally {await c.close();await s.close();}
});
