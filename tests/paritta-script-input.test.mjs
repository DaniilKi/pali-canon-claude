import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {PARITTA,paritta} from '../src/paritta.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const label=(r,s,t)=>{if(s==='roman')assert.equal(r.input_script,undefined);else{assert.equal(r.input_script,s);assert.equal(r.input_romanized,t.toLowerCase());}};
test('Thai paritta name and independent native source selector reproduce the Roman selection without changing source text',()=>{
 const root=paritta(canon,{name:'ratana',limit:2});const native=paritta(canon,{name:'รตน',limit:2});
 label(native,'thai','ratana');assert.deepEqual(native.segments,root.segments);assert.equal(native.text_id,'kp6');
 const alternative=paritta(canon,{name:'รตน',text:'Snp ๒.๑',limit:2});
 assert.equal(alternative.text_id,'snp2.1');assert.equal(alternative.text_input_script,'thai');assert.equal(alternative.text_input_romanized,'Snp 2.1');
 assert.deepEqual(alternative.source,root.source);assert.deepEqual(alternative.chanting_books,root.chanting_books);
});
test('every paritta display name and canonical source resolves identically across eight supported input scripts',()=>{
 for(const entry of PARITTA)for(const source of entry.texts){
  const baseline=paritta(canon,{name:entry.name,text:source,limit:1});
  for(const script of SCRIPTS){const name=transliterate(entry.name,'roman',script),text=transliterate(source,'roman',script),r=paritta(canon,{name,text,limit:1});
   assert.equal(r.key,baseline.key);assert.equal(r.text_id,baseline.text_id);assert.deepEqual(r.segments,baseline.segments);assert.deepEqual(r.notes,baseline.notes);assert.deepEqual(r.english,baseline.english);assert.deepEqual(r.chanting_books,baseline.chanting_books);assert.deepEqual(r.continue_with,baseline.continue_with);label(r,script,entry.name);
   if(script==='roman')assert.equal(r.text_input_script,undefined);else{assert.equal(r.text_input_script,script);assert.equal(r.text_input_romanized,source.toLowerCase());}
  }
 }
});
test('native name aliases retain exact/ambiguous matching, source alternatives and excerpt-relative continuation',()=>{
 for(const script of SCRIPTS){
  assert.throws(()=>paritta(canon,{name:transliterate('jataka','roman',script)}),/more than one paritta/);
  for(const name of ['ratana','Ratana Sutta','karaniyametta','karaniya metta','metta sutta','angulimala']){
   const base=paritta(canon,{name,limit:1});const r=paritta(canon,{name:transliterate(name,'roman',script),limit:1});assert.equal(r.key,base.key);assert.deepEqual(r.segments,base.segments);
   if(r.continue_with){const next=paritta(canon,r.continue_with);const exact=paritta(canon,{name:base.key,text:base.text_id,offset:r.next_offset,limit:1});assert.deepEqual(next.segments,exact.segments);assert.equal(next.text_id,base.text_id);}
  }
 }
});
test('name and source conversion provenance stay distinct when different scripts are mixed across fields',()=>{
 const r=paritta(canon,{name:'රතන',text:'Snp ๒.๑',limit:1});label(r,'sinhala','ratana');assert.equal(r.text_input_script,'thai');assert.equal(r.text_input_romanized,'Snp 2.1');assert.equal(r.text_id,'snp2.1');
 const sourceOnly=paritta(canon,{name:'ratana',text:'Snp ๒.๑',limit:1});assert.equal(sourceOnly.input_script,undefined);assert.equal(sourceOnly.text_input_script,'thai');
});
test('native unknown, mixed/incomplete and cross-source selectors cannot silently choose another chant or a catalogue',()=>{
 assert.throws(()=>paritta(canon,{name:'รตน',text:'MN ๑๐'}),/not a source/);
 for(const value of ['สति','รต่น']){assert.throws(()=>paritta(canon,{name:value}),/converted completely/);assert.throws(()=>paritta(canon,{name:'ratana',text:value}),/converted completely/);}
 assert.throws(()=>paritta(canon,{name:transliterate('papapapapapapa','roman','thai')}),/No paritta/);
 assert.throws(()=>paritta(canon,{text:'Snp ๒.๑'}),/Choose a paritta name/);
 assert.equal(paritta(canon).paritta.length,PARITTA.length);
});
test('MCP accepts native/equivalent paritta selectors and returns the same source-faithful pages and labels',async()=>{
 const [a,b]=InMemoryTransport.createLinkedPair();const client=new Client({name:'native-paritta-fixture',version:'1'});await Promise.all([createServer().connect(b),client.connect(a)]);
 try{for(const script of SCRIPTS){for(const alias of ['ratana','Ratana Sutta']){
  const r=await client.callTool({name:'paritta',arguments:{name:transliterate(alias,'roman',script),text:transliterate('Snp 2.1','roman',script),limit:1}});assert.ok(!r.isError,JSON.stringify(r.content));const d=r.structuredContent;assert.equal(d.text_id,'snp2.1');assert.deepEqual(d.segments,paritta(canon,{name:'ratana',text:'Snp 2.1',limit:1}).segments);label(d,script,alias);
  assert.deepEqual(JSON.parse(r.content[0].text),d);const cursor=d.continue_with;assert.ok(cursor);const {tool,...args}=cursor;const next=await client.callTool({name:tool,arguments:args});assert.ok(!next.isError);assert.equal(next.structuredContent.text_id,'snp2.1');
 }}const bad=await client.callTool({name:'paritta',arguments:{name:'สति'}});assert.equal(bad.isError,true);assert.match(JSON.parse(bad.content[0].text).error,/converted completely/);
 }finally{await client.close();}
});
