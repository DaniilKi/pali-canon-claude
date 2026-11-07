import {test} from 'node:test';
import assert from 'node:assert/strict';
import {condition,matika,buildConditions,buildMatika} from '../src/abhidhamma.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const native=(text,script)=>transliterate(text,'roman',script);
function same(actual,expected,script,text){
 const {input_script,input_romanized,...source}=actual;
 assert.deepEqual(source,expected);
 if(script==='roman'||native(text,script)===text.toLowerCase()){assert.equal(input_script,undefined);assert.equal(input_romanized,undefined);}
 else{assert.equal(input_script,script);assert.equal(input_romanized,text.toLowerCase());}
}
test('handwritten Thai condition names and native numbers select the definition instead of the catalogue',()=>{
 for(const name of ['เหตุ','๑']){const r=condition(name);assert.equal(r.condition.number,1);assert.equal(r.count,undefined);assert.equal(r.input_script,'thai');assert.deepEqual(r.condition,condition('hetu').condition);}
 const r=matika('ติก ๕');assert.equal(r.entries[0].number,5);assert.equal(r.input_script,'thai');assert.deepEqual(r.entries,matika('tika 5').entries);
});
test('all 24 conditions keep exact names, roots, suffix aliases and numeric selection across eight scripts',()=>{
 for(const row of buildConditions()){
  const expected=condition(String(row.number));
  const root=row.name.replace(/paccayo$/i,'');
  for(const alias of [row.name,root,`${root} paccaya`,String(row.number)])for(const script of SCRIPTS)same(condition(native(alias,script)),expected,script,alias);
 }
});
test('all matika entries, sections and source-derived groups retain source windows across scripts',()=>{
 for(const section of buildMatika()){
  const selectors=[section.key,section.text_id,...section.entries.map(e=>`${e.kind} ${e.number}`),...new Set(section.entries.map(e=>e.group).filter(Boolean))];
  for(const selector of selectors)for(const script of SCRIPTS)same(matika(native(selector,script)),matika(selector),script,selector);
 }
});
test('explicit catalogues remain available but unknown, incomplete and multi-condition input cannot become an overview',()=>{
 for(const script of SCRIPTS){
  for(const selector of ['all','list'])same(condition(native(selector,script)),condition(selector),script,selector);
  same(matika(native('all',script)),matika(),script,'all');
  for(const value of ['papapapapapa','hetu ārammaṇa','anantara samanantara','0','25','-1','+1','1.5','1/2','all!','list!'])assert.throws(()=>condition(native(value,script)),/Unknown Paṭṭhāna condition/);
  for(const value of ['tika -1','duka 1.5','duka 1/2','tika +2','tika 1-2','tika duka','all!'])assert.throws(()=>matika(native(value,script)),/Invalid mātikā entry|Unknown mātikā section/);
 }
 for(const value of ['!!!','漢字','漢hetu字','ηhetu','สति','เห่ตุ'])assert.throws(()=>condition(value),/Unknown Paṭṭhāna condition|converted completely/);
 for(const value of ['สति','ติก่ ๕','漢hetu字','ηhetu'])assert.throws(()=>matika(value),/converted completely/);
 assert.equal(condition().count,24);assert.equal(matika().sections.length,3);
});
test('MCP native conditions return full definitions and executable source commands, with explicit errors',async()=>{
 const [a,b]=InMemoryTransport.createLinkedPair();const client=new Client({name:'native-abhidhamma-fixture',version:'1'}),server=createServer();
 try{await Promise.all([server.connect(b),client.connect(a)]);
  for(const script of SCRIPTS){
   const r=await client.callTool({name:'patthana_condition',arguments:{name:native('samanantara',script)}});assert.ok(!r.isError,JSON.stringify(r.content));same(r.structuredContent,condition('samanantara'),script,'samanantara');assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);
   const {tool,...args}=r.structuredContent.condition.definition.read_with;
   const page=await client.callTool({name:tool,arguments:args});assert.ok(!page.isError);assert.deepEqual(page.structuredContent.segments.map(s=>s.text.replace(/<[^>]+>/g,'').trim()),r.structuredContent.condition.definition.text);
   const m=await client.callTool({name:'abhidhamma_matika',arguments:{section:native('duka 101',script)}});assert.ok(!m.isError);same(m.structuredContent,matika('duka 101'),script,'duka 101');
  }
  for(const name of ['漢字','漢hetu字','!!!','สति',native('hetu ārammaṇa','thai')]){const r=await client.callTool({name:'patthana_condition',arguments:{name}});assert.equal(r.isError,true);assert.ok(JSON.parse(r.content[0].text).error);}
 }finally{await client.close();await server.close();}
});
