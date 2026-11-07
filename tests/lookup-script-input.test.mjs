import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {glossary} from '../src/glossary.mjs';
import {lookupName} from '../src/dppn.mjs';
import {lookupPaliInput} from '../src/lookup-input.mjs';
import {liveCache} from '../src/cache.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const realFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=realFetch;liveCache.clear();});
const response={summary_html:'<p class="summary">Synthetic dictionary entry</p>',dpd_html:'<p>Synthetic dictionary detail</p>'};
function live(){const calls=[];globalThis.fetch=async url=>{calls.push(new URL(url).searchParams.get('q'));return Response.json(response);};return calls;}
function labelled(result,script,word){if(script==='roman'){assert.equal(result.input_script,undefined);assert.equal(result.input_romanized,undefined);}else{assert.equal(result.input_script,script);assert.equal(result.input_romanized,word);}}
test('handwritten native Pāli glossary inputs reach the Roman source entries (not a native-reader certification)',()=>{
 const expected=glossary({term:'sati',direction:'pa-en'});
 const samples={thai:'สติ',myanmar:'သတိ',sinhala:'සති',devanagari:'सति',khmer:'សតិ',lao:'ສຕິ'};
 for(const [script,term] of Object.entries(samples)){const r=glossary({term,direction:'pa-en'});assert.equal(r.term,term);labelled(r,script,'sati');assert.deepEqual(r.pali_to_english,expected.pali_to_english);assert.deepEqual(r.sources,expected.sources);}
});
test('all supported input scripts preserve glossary source senses and avoid interpreting native Pāli as English',()=>{
 const expected=glossary({term:'sati',direction:'pa-en'});
 for(const script of SCRIPTS){const term=transliterate('sati','roman',script),r=glossary({term,direction:'auto'});assert.deepEqual(r.pali_to_english,expected.pali_to_english);labelled(r,script,'sati');if(script!=='roman'){assert.deepEqual(r.english_to_pali,[]);assert.equal(r.input_normalised,undefined);}}
 const englishOnly=glossary({term:'สติ',direction:'en-pa'});assert.equal(englishOnly.found,0);assert.equal(englishOnly.input_script,undefined);
});
test('dictionary lookup sends Roman spelling for all eight scripts and preserves dictionary attribution',async()=>{
 const calls=live();const expected=await lookupPaliInput({word:'sati',limit:1});assert.ok(expected.entries.length);
 for(const script of SCRIPTS){liveCache.clear();const r=await lookupPaliInput({word:transliterate('sati','roman',script),limit:1});assert.equal(r.word,'sati');assert.deepEqual(r.entries,expected.entries);assert.deepEqual(r.license,expected.license);assert.equal(r.attribution,expected.attribution);labelled(r,script,'sati');if(script!=='roman')assert.equal(r.inferred_spelling,undefined,'native letter choices are not English-keyboard guesses');}
 assert.ok(calls.every(q=>q==='sati'));
});
test('native dictionary fallback remains explicitly offline/licensed and unknown native words are not invented',async()=>{
 globalThis.fetch=async()=>new Response('Synthetic unavailable service',{status:503});
 const r=await lookupPaliInput({word:'สติ',limit:1});assert.equal(r.offline,true);assert.ok(r.entries.length);assert.equal(r.license.name,'CC BY-NC-SA 4.0');assert.ok(r.dictionary.version);labelled(r,'thai','sati');
 const unknown=transliterate('papapapapapapapapapa','roman','thai');assert.equal(glossary({term:unknown,direction:'pa-en'}).found,0);
 globalThis.fetch=async()=>Response.json({summary_html:'',dpd_html:''});liveCache.clear();const missing=await lookupPaliInput({word:unknown});assert.deepEqual(missing.entries,[]);assert.equal(missing.inferred_spelling,undefined);
});
test('native proper names preserve exact canon-match evidence and the unbundled DPPN gate across eight scripts',()=>{
 const expected=lookupName({name:'sāriputta',textLimit:2});assert.ok(expected.appears_in.texts.length);
 for(const script of SCRIPTS){const name=transliterate('sāriputta','roman',script),r=lookupName({name,textLimit:2});assert.deepEqual(r.appears_in,expected.appears_in);assert.deepEqual(r.dictionary,expected.dictionary);assert.deepEqual(r.entries,expected.entries);assert.equal(r.note,expected.note);labelled(r,script,'sāriputta');}
 const explicit=lookupName({name:'สารีปุตฺต',textLimit:2});assert.deepEqual(explicit.appears_in,expected.appears_in);
});
test('incomplete mixed-script conversions fail before folded matching or provider access; Roman keyboard behavior remains',async()=>{
 const calls=live();
 for(const value of ['สति','ส่ติ','漢sati字','ηsati']){
  assert.throws(()=>glossary({term:value,direction:'pa-en'}),/converted completely/);
  assert.throws(()=>lookupName({name:value}),/converted completely/);
  await assert.rejects(lookupPaliInput({word:value}),/converted completely/);
 }
 assert.equal(calls.length,0);
 const keyboard=await lookupPaliInput({word:'nibbaana'});assert.equal(keyboard.word,'nibbāna');assert.ok(keyboard.input_normalised);assert.equal(keyboard.input_script,undefined);
 assert.ok(glossary({term:'mindfulness',direction:'en-pa'}).found>0);
});
test('MCP exposes native lookup parity and script provenance for all three tools across eight scripts',async()=>{
 live();const [a,b]=InMemoryTransport.createLinkedPair();const client=new Client({name:'native-word-fixture',version:'1'});await Promise.all([createServer().connect(b),client.connect(a)]);
 try{for(const script of SCRIPTS){
  const word=transliterate('sati','roman',script),name=transliterate('sāriputta','roman',script);
  for(const [tool,args,roman] of [['glossary',{term:word,direction:'pa-en'},'sati'],['lookup_pali',{word,limit:1},'sati'],['lookup_name',{name,textLimit:1},'sāriputta']]){
   const r=await client.callTool({name:tool,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));const d=r.structuredContent;labelled(d,script,roman);assert.deepEqual(JSON.parse(r.content[0].text),d);
   if(tool==='glossary')assert.ok(d.found);if(tool==='lookup_pali')assert.ok(d.entries.length);if(tool==='lookup_name'){assert.ok(d.appears_in.texts.length);assert.deepEqual(d.entries,[]);}
  }
 }}finally{await client.close();}
});
