import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import {resolveName,resolveReference} from '../src/sutta-names.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';

test('name matching cannot erase unsupported letters into a valid canonical name',()=>{
 for(const name of ['漢Satipatthana Sutta字','ηSatipatthana Sutta','Satipatthana Suttaส']) {
  assert.throws(()=>resolveName(name),/unsupported or unconverted/);
  assert.throws(()=>resolveReference(name),/unsupported or unconverted/);
 }
 assert.equal(resolveReference('Satipatthana Sutta').unit.id,'mn10');
});

test('MCP resolution and analysis reject incomplete input but retain all supported script names',async()=>{
 const [a,b]=InMemoryTransport.createLinkedPair(),server=createServer(),client=new Client({name:'reference-integrity',version:'1'});
 await server.connect(a);await client.connect(b);
 try {
  for(const name of ['漢Satipatthana Sutta字','ηSatipatthana Sutta','สति']) {
   for(const [tool,args] of [['resolve_reference',{reference:name}],['analyse_passage',{uid:name,limit:1}]]) {
    const r=await client.callTool({name:tool,arguments:args});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);
   }
  }
  for(const script of SCRIPTS) {
   const name=transliterate('Satipaṭṭhāna Sutta','roman',script);
   const r=await client.callTool({name:'resolve_reference',arguments:{reference:name}});
   assert.ok(!r.isError,JSON.stringify(r.content));assert.equal(r.structuredContent.id,'mn10');
   assert.equal(r.structuredContent.input_script,script==='roman'?undefined:script);
   assert.ok(r.structuredContent.also_named.length);
   const analysis=await client.callTool({name:'analyse_passage',arguments:{uid:name,limit:1}});
   assert.ok(!analysis.isError,JSON.stringify(analysis.content));assert.equal(analysis.structuredContent.text_id,'mn10');
  }
 } finally {await client.close();await server.close();}
});
