import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import {searchWithInput} from '../src/english-search.mjs';
import {searchTerms} from '../src/search-segments.mjs';
import {search as commentary} from '../src/commentary-search.mjs';
import {search as postcanonical} from '../src/postcanonical.mjs';
import {search as sourceBook} from '../src/source-book-search.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';

const scopes=[['search_texts',{collection:'mn10',english:'off'}],['search_commentary',{books:['s0201a.att.xml']}],['search_post_canonical',{books:['vism']}],['search_source_book',{book:'s0201m'}]];
const invalid=['漢sati字','ηsati','สति','"sati" 漢'];

test('search tokenization and direct search APIs cannot discard unsupported query letters',async()=>{
 for(const query of invalid) {
  for(const fn of [()=>searchTerms(query,canon.fold),()=>canon.search(query,{collection:'mn10'}),()=>canon.search(query,{collection:'mn10',groups:[['sati']]}),()=>commentary(query,{books:['s0201a.att.xml']}),()=>sourceBook(query,{book:'s0201m'})]) assert.throws(fn,/unsupported or unconverted/);
  await assert.rejects(postcanonical(query,{books:['vism']}),/unsupported or unconverted/);
  for(const english of ['auto','off','only']) assert.throws(()=>searchWithInput(query,{english,collection:'mn10'}),/unsupported or unconverted/);
 }
});

test('all four MCP search tools reject incomplete conversion and preserve native query evidence',async()=>{
 const [a,b]=InMemoryTransport.createLinkedPair(),s=createServer(),c=new Client({name:'search-integrity',version:'1'});await s.connect(a);await c.connect(b);
 try {
  for(const [name,options] of scopes) {
   for(const query of invalid) {const r=await c.callTool({name,arguments:{query,limit:1,...options}});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);}
   let baseline;
   for(const script of SCRIPTS) {
    const r=await c.callTool({name,arguments:{query:transliterate('sati','roman',script),limit:1,...options}});assert.ok(!r.isError,JSON.stringify(r.content));
    const {input_script,input_romanized,...result}=r.structuredContent;
    if(script==='roman') baseline=result;else {assert.deepEqual(result,baseline);assert.equal(input_script,script);assert.equal(input_romanized,'sati');}
    assert.ok((result.total_matched??result.total_texts_matched)>0);
   }
  }
 } finally {await c.close();await s.close();}
});


test('quoted Roman source marks remain searchable without claiming native conversion or repaired spelling',async()=>{
 const [a,b]=InMemoryTransport.createLinkedPair(),s=createServer(),c=new Client({name:'source-query',version:'1'});await s.connect(a);await c.connect(b);
 try {
  for(const [name,options] of scopes) {
   const r=await c.callTool({name,arguments:{query:'"saौti"',limit:1,...options}});
   assert.ok(!r.isError,JSON.stringify(r.content));assert.ok((r.structuredContent.total_matched??r.structuredContent.total_texts_matched)>0);
   assert.equal(r.structuredContent.input_script,undefined);assert.equal(r.structuredContent.query,'"saौti"');assert.match(r.structuredContent.query_note,/kept as entered.*diacritic-insensitive/);
   for(const query of ['saौti','"ส่ติ"','"漢sati字"']) assert.equal((await c.callTool({name,arguments:{query,limit:1,...options}})).isError,true);
  }
  const query='"Mrammaraṭṭhe mौṃjvānagare leḍītīaraññavihāravāsinā mahā therena katāyaṃ paccayuddesadīpanī."';
  const r=await c.callTool({name:'search_post_canonical',arguments:{query,books:['patthanuddesa-dipanipatha'],limit:1}});
  assert.ok(!r.isError,JSON.stringify(r.content));assert.ok(r.structuredContent.total_matched>0);
  const hit=r.structuredContent.results[0],{tool,...args}=hit.read_with;
  const read=await c.callTool({name:tool,arguments:args});assert.ok(!read.isError);assert.ok(read.structuredContent.segments.some(s=>s.text.includes('mौṃjvānagare')));
 } finally {await c.close();await s.close();}
});
