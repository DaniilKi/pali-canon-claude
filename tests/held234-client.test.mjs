/** Real publisher234 and neighbor235 responses precede every cache/refusal control. */
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana,digest} from '../src/apadana.mjs';
import {readPassage,WIDGET_VERSION} from '../src/chatgpt-widget.mjs';
import {validateEnglishPage} from '../web/translation-policy.mjs';
import {validateComparisonPage} from '../web/translation-comparison.mjs';
import {view} from './helpers/widget-view.mjs';
import {held234Evidence} from './helpers/thera-held234-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const e=held234Evidence(),ids=['tha-ap236','tha-ap237'],cases=new Map(),originalFetch=globalThis.fetch;
const tid=p=>canon.translationId(p);
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=ids.find(id=>APADANA_PROFILES[id].raw_url===url.href);assert.ok(id,'Transport must retain234/235 exact immutable paths');calls.push(id);return new Response(e.artifact(id));};}
async function actual(id){
  if(!cases.has(id)){
    const profile=APADANA_PROFILES[id],unit=canon.resolve(id).unit,args={uid:id,translation:tid(profile),translation_revision:APADANA_COMMIT,limit:500};
    const first=await english.translation(unit,args.translation,args),widget=await readPassage({uid:id,translation:args.translation,englishCharacters:500,limit:2});
    assert.ok(widget.english,widget.english_error);
    cases.set(id,{profile,unit,args,first,widget,context:{uid:id,choices:english.available(unit),accepted:null},parsed:parseApadana(e.artifact(id),profile)});
  }
  return cases.get(id);
}
function displayed(host,value,pali,id){
  assert.ok(host.elements.english.textContent.includes(value.text),id+' actual body visible');
  for(const note of value.translator_notes)assert.ok(host.elements.english.textContent.includes(note.text),id+' authentic note visible');
  for(const note of APADANA_PROFILES[id].mapping_notes)assert.ok(host.elements.english.textContent.includes(note),id+' mandatory identity/edition notice visible');
  assert.ok(host.elements.pali.textContent.includes(pali));
}
function mutations(value,p){
 const changed=value.translator_notes.map((note,i)=>i?note:{...note,text:note.text+'\n'}),other=APADANA_PROFILES[p.id==='tha-ap236'?'tha-ap237':'tha-ap236'];
 const rows=[
  ['wrong version',{translation_revision:'0'.repeat(40)}],['wrong route',{url:other.url}],['wrong fetched path',{fetched_url:other.raw_url}],['raw pin',{raw_sha256:'0'.repeat(64)}],['body pin',{body_sha256:'0'.repeat(64)}],['root pin',{root_sha256:'0'.repeat(64)}],['note pin',{notes_sha256:'0'.repeat(64)}],['preface pin',{paratext_sha256:'0'.repeat(64)}],['rights',{license:'CC0'}],['mapping notices absent',{mapping_notes:[]}],['notes absent',{translator_notes:undefined}],['same-count changed actual note',{translator_notes:changed}],['forged changed-note hash',{translator_notes:changed,notes_sha256:digest(JSON.stringify(changed))}],['whitespace in authentic empty preface',{publisher_paratext:'\n'}],['foreign nonempty preface',{publisher_paratext:'Unapproved preface'}],['phantom preface owner',{publisher_preface:{}}],['phantom chapter summary',{chapter_summary:{}}],['phantom collection summary',{collection_summary:{}}],['foreign recitation',{publisher_divisions:[]}],['foreign editorial gap',{editorial_gap:{}}],
 ];
 p.mapping_notes.forEach((note,i)=>rows.push(['missing mandatory notice '+i,{notes:value.notes.filter(n=>n!==note)}]));
 for(const[label,patch]of rows)assert.ok(Object.keys(patch).some(k=>JSON.stringify(value[k])!==JSON.stringify(patch[k])),p.id+' control must mutate '+label);
 return rows;
}

test('new236 requires separate one-source authority while prior284 and neighbor235 source objects remain exact',()=>{
 assert.equal(WIDGET_VERSION,'v36');assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);assert.equal(CURRENT_APADANA_IDS.length,310);
 assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,284),e.previous.expected_profile_ids);
 for(const id of e.previous.expected_profile_ids)assert.deepEqual(APADANA_PROFILES[id],e.priorProfiles[id]);
 assert.deepEqual(APADANA_PROFILES['tha-ap236'],e.peer.approved_profile_objects['tha-ap236']);
 assert.deepEqual(APADANA_PROFILES['tha-ap237'],e.priorProfiles['tha-ap237']);assert.notEqual(tid(APADANA_PROFILES['tha-ap236']),tid(APADANA_PROFILES['tha-ap237']));
 assert.equal(APADANA_PROFILES['tha-ap262'],undefined);
});

test('ALL authentic234 and235 pages, real six notes and empty prefaces display before mutations in both hosts',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);let notes=0,paragraphs=0;
 for(const id of ids){
  const selected=await actual(id),{profile,unit,parsed,context}=selected,peer=e.peerFor(id);notes+=parsed.translator_notes.length;paragraphs+=parsed.text.split('\n\n').length;
  assert.equal(parsed.publisher_paratext,'');assert.equal(digest(parsed.text),peer.body_sha256);assert.equal(digest(JSON.stringify(parsed.translator_notes)),peer.notes_sha256);
  const hashes=id==='tha-ap236'?peer.note_text_sha256s.map(n=>n.sha256):peer.note_text_sha256s;assert.deepEqual(parsed.translator_notes.map(n=>digest(n.text)),hashes);
  const hosts=['MCP Apps','Apps SDK'].map(bridge=>view(bridge));let args=selected.args,widget=selected.widget,body='',pages=0;
  while(args){
   const value=await english.translation(unit,args.translation,args);pages++;body+=value.text;
   assert.equal(value.fetched_url,profile.raw_url);assert.equal(value.url,profile.url);assert.equal(value.translation_revision,APADANA_COMMIT);assert.equal(value.license,'CC BY-NC-SA 4.0');assert.match(value.attribution,/Jonathan S\. Walters and Whitman College/);
   assert.deepEqual(value.translator_notes,parsed.translator_notes);assert.deepEqual(widget.english.translator_notes,parsed.translator_notes);assert.equal(value.publisher_paratext,'');assert.equal(widget.english.publisher_paratext,'');
   assert.equal(widget.english.text,value.text);const next=validateEnglishPage(value,args,context);assert.deepEqual(validateComparisonPage(value,args,context),next);
   for(const host of hosts){host.output(widget);displayed(host,value,widget.pali.segments[0].text,id);}
   if(next){assert.equal(widget.english.continue_with.arguments.english_offset,next.offset);widget=await readPassage({...widget.english.continue_with.arguments,englishCharacters:500});}else assert.equal(widget.english.continue_with,null);
   args=next;
  }
  assert.ok(pages>1);assert.equal(digest(body),peer.body_sha256);
 }
 assert.equal(notes,6);assert.equal(paragraphs,15);
});

test('same-order foreign source and corrupted actual cache refuse in individual comparison and both widgets while retaining Pāli',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of ids){
  const selected=await actual(id),other=await actual(ids.find(other=>other!==id)),{first,widget,args,context,profile}=selected,pali=widget.pali.segments[0].text;
  for(const bridge of ['MCP Apps','Apps SDK']){
   const host=view(bridge);host.output(widget);displayed(host,widget.english,pali,id);
   const corruptions=[['authentic foreign235/234 source',structuredClone(other.first)],...mutations(first,profile).map(([label,patch])=>[label,{...structuredClone(first),...structuredClone(patch)}])];
   for(const[label,bad]of corruptions){
    assert.throws(()=>validateEnglishPage(bad,args,context),id+' individual '+label);assert.throws(()=>validateComparisonPage(bad,args,context),id+' comparison '+label);
    host.output({...structuredClone(widget),english:bad});assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(!host.elements.english.textContent.includes(first.text),id+' corrupt cached source unavailable: '+label);assert.ok(host.elements.pali.textContent.includes(pali));
   }
  }
 }
});

test('source-bound real continuations reject owner revision and prefix drift without substituting neighbor235',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of ids){
  const{first,widget,args,context,unit}=await actual(id);assert.ok(first.continue_with);assert.ok(widget.english.continue_with);const next=first.continue_with.arguments;
  for(const patch of [{uid:ids.find(other=>other!==id)},{translation:tid(APADANA_PROFILES[ids.find(other=>other!==id)])},{offset:next.offset+1},{prefix_sha256:'invalid'},{translation_revision:'0'.repeat(40)},{allow_partial:true},{allow_shared:true}]){
   const bad={...structuredClone(first),continue_with:{...structuredClone(first.continue_with),arguments:{...next,...patch}}};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));
  }
  for(const patch of [{prefix_sha256:'invalid'},{translation_revision:'0'.repeat(40)}]){const before=calls.length;await assert.rejects(english.translation(unit,args.translation,{...next,...patch}));assert.equal(calls.length,before);}
  for(const patch of [{english_translation_revision:'0'.repeat(40)},{translation:tid(APADANA_PROFILES[ids.find(other=>other!==id)])}]){
   const before=calls.length,bad=await readPassage({...widget.english.continue_with.arguments,...patch,englishCharacters:500});assert.equal(calls.length,before);assert.ok(!bad.english);assert.ok(bad.english_error);
   for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(bad);assert.ok(!host.elements.english.textContent.includes(first.text));assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));}
  }
  const before=calls.length,stale=await readPassage({...widget.english.continue_with.arguments,english_prefix_sha256:'0'.repeat(64),englishCharacters:500});assert.ok(calls.length-before<=1);assert.ok(calls.slice(before).every(uid=>uid===id));assert.ok(!stale.english);assert.match(stale.english_error,/prefix changed/);assert.equal(stale.pali.segments[0].text,widget.pali.segments[0].text);
 }
});
