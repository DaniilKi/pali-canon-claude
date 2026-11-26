/** Authentic original-source body/note positives precede every client mutation. */
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana} from '../src/apadana.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {validateApadanaChoice,validateEnglishPage} from '../web/translation-policy.mjs';
import {validateComparisonPage} from '../web/translation-comparison.mjs';
import {view} from './helpers/widget-view.mjs';
import {thera292299Evidence,digest} from './helpers/thera292-299-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const e=thera292299Evidence(),originalFetch=globalThis.fetch,cases=new Map(),clone=value=>JSON.parse(JSON.stringify(value)),tid=p=>canon.translationId(p);
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only an exact seven-poem Markdown source URL may reach transport');assert.ok(url.href.endsWith('.md'));calls.push(id);return new Response(e.artifact(id));};}
async function actual(id){
 if(!cases.has(id)){
  const profile=APADANA_PROFILES[id],unit=canon.resolve(id).unit,args={uid:id,translation:tid(profile),translation_revision:APADANA_COMMIT,limit:500},context={uid:id,choices:english.available(unit),accepted:null},parsed=parseApadana(e.artifact(id),profile);e.assertNormalized(id,parsed);
  const first=await english.translation(unit,args.translation,args),widget=await readPassage({uid:id,translation:args.translation,englishCharacters:500,limit:2});assert.ok(widget.english,widget.english_error);assert.equal(Boolean(first.continue_with),e.bodyLength(id)>500);cases.set(id,{profile,unit,args,context,parsed,first,widget});
 }
 return cases.get(id);
}
function shown(host,value,pali,id){assert.ok(host.elements.english.textContent.includes(value.text),id+' genuine body visible');for(const note of value.translator_notes)assert.ok(host.elements.english.textContent.includes(note.text),id+' complete genuine note visible');for(const note of APADANA_PROFILES[id].mapping_notes)assert.ok(host.elements.english.textContent.includes(note),id+' mandatory source/edition caveat visible');assert.ok(host.elements.pali.textContent.includes(pali),id+' authentic Pāli retained');assert.ok(!host.elements.english.textContent.includes('.mp3'));}
function refuse(host,widget,bad,first,pali,id){host.output({...clone(widget),english:bad});assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(!host.elements.english.textContent.includes(first.text),id+' corrupt English not retained');assert.ok(host.elements.pali.textContent.includes(pali));}

test('seven genuine V2 capabilities retain all310 prior profiles and exact317 identity without audio capability or exposed-choice pin assumptions',()=>{
 assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);assert.equal(CURRENT_APADANA_IDS.length,339);
 assert.equal(e.approval.expected_profile_ids.length,317);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,317),e.approval.expected_profile_ids);
 assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,317),e.approval.expected_profile_ids);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(317,325),['tha-ap303','tha-ap304','tha-ap305','tha-ap306','tha-ap307','tha-ap310','tha-ap311','tha-ap312']);for(const id of e.approval.baseline_ids)assert.deepEqual(APADANA_PROFILES[id],e.baseline.profile_objects[id]);
 for(const id of e.ids){const p=APADANA_PROFILES[id],choice=english.available(canon.resolve(id).unit).find(row=>row.translation_id===tid(p));assert.ok(choice);validateApadanaChoice(choice,id);assert.deepEqual(p,e.profiles[id]);for(const key of ['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'])assert.equal(p[key],e.independent(id)[key]);assert.equal(choice.translation_revision,APADANA_COMMIT);assert.equal(choice.translation_id,tid(p));for(const key of ['audio','media','reciter'])assert.equal(Object.hasOwn(choice,key),false);assert.ok(!JSON.stringify(choice).includes('.mp3'));}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282','tha-ap293','tha-ap299','tha-ap302']){assert.equal(APADANA_PROFILES[id],undefined);assert.throws(()=>validateApadanaChoice({...e.profiles['tha-ap294'],translation_id:'ap:chapter-3/poem-280'},id));}
});

test('all seven genuine complete paged bodies and22full notes pass native comparison and both widget bridges with exact source-derived offsets',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);let notes=0,paragraphs=0,totalPages=0;
 for(const id of e.ids){const selected=await actual(id),{profile,unit,parsed,context}=selected,b=e.independent(id),expectedLength=e.bodyLength(id);notes+=parsed.translator_notes.length;paragraphs+=parsed.text.split('\n\n').length;const hosts=['MCP Apps','Apps SDK'].map(bridge=>view(bridge));let args=selected.args,widget=selected.widget,body='',pages=0;
  while(args){const value=await english.translation(unit,args.translation,args),offset=args.offset||0;pages++;body+=value.text;assert.equal(value.text,parsed.text.slice(offset,offset+500));assert.equal(value.offset,offset);assert.equal(value.total_characters,expectedLength);assert.equal(value.prefix_sha256,digest(parsed.text.slice(0,offset)));assert.equal(value.next_offset,offset+500<expectedLength?offset+500:null);assert.equal(value.fetched_url,profile.raw_url);assert.equal(value.url,profile.url);assert.equal(value.translation_revision,APADANA_COMMIT);assert.equal(value.license,'CC BY-NC-SA 4.0');assert.match(value.attribution,/Jonathan S\. Walters and Whitman College/);assert.deepEqual(value.mapping_notes,profile.mapping_notes);assert.deepEqual(value.translator_notes,parsed.translator_notes);assert.deepEqual(widget.english.translator_notes,parsed.translator_notes);assert.equal(value.publisher_paratext,'');assert.equal(widget.english.publisher_paratext,'');assert.equal(widget.english.text,value.text);assert.equal(Object.hasOwn(value,'publisher_preface'),false);assert.equal(Object.hasOwn(value,'chapter_summary'),false);for(const key of ['audio','media','reciter'])assert.equal(Object.hasOwn(value,key),false);assert.ok(!JSON.stringify(value).includes('.mp3'));
   const next=validateEnglishPage(value,args,context);assert.deepEqual(validateComparisonPage(value,args,context),next);for(const host of hosts){host.output(widget);shown(host,value,widget.pali.segments[0].text,id);if(id==='tha-ap298'&&offset===0)assert.ok(host.elements.english.textContent.includes(parsed.text.split('\n\n')[1]),'Complete authentic eight-line entry remains visible');}if(next){assert.equal(next.offset,value.next_offset);assert.equal(widget.english.continue_with.arguments.english_offset,next.offset);widget=await readPassage({...widget.english.continue_with.arguments,englishCharacters:500});}else assert.equal(widget.english.continue_with,null);args=next;
  }
  assert.equal(pages,Math.ceil(expectedLength/500));totalPages+=pages;assert.equal(digest(body),b.body_sha256);assert.equal(digest(JSON.stringify(parsed.translator_notes)),b.notes_sha256);
 }
 assert.equal(notes,22);assert.equal(paragraphs,52);assert.equal(totalPages,16);assert.ok(calls.every(id=>e.ids.includes(id)));
});

test('actual notes empty paratext forged hashes missing provenance and source metadata drift refuse in both validators and bridges',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{profile,first,widget,args,context}=await actual(id),pali=widget.pali.segments[0].text,rows=[
  ['revision',{translation_revision:'0'.repeat(40)}],['rights',{license:'CC0'}],['foreign route',{url:e.profiles[e.ids.find(other=>other!==id)].url}],['raw route',{fetched_url:profile.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))}],...['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'].map(key=>[key,{[key]:'0'.repeat(64)}]),['missing notes',{translator_notes:undefined}],['missing caveat metadata',{mapping_notes:[]}],['changed empty paratext',{publisher_paratext:'\n'}],['forged paratext hash',{publisher_paratext:first.text.split('\n\n')[0],paratext_sha256:digest(first.text.split('\n\n')[0])}],['foreign preface owner',{publisher_preface:{}}],['foreign summary owner',{chapter_summary:{}}],['foreign division owner',{publisher_divisions:[]}],['foreign collection owner',{collection_summary:{}}],['foreign editorial owner',{editorial_gap:{}}],
 ];for(const[index,note]of first.translator_notes.entries()){const changed=first.translator_notes.map((n,i)=>i===index?{...n,text:n.text+'\n'}:n);rows.push(['same-count changed authentic note '+note.number,{translator_notes:changed}],['forged hash for authentic note '+note.number,{translator_notes:changed,notes_sha256:digest(JSON.stringify(changed))}]);}profile.mapping_notes.forEach((note,i)=>rows.push(['missing displayed mandatory caveat '+i,{notes:first.notes.filter(value=>value!==note)}]));for(const[label,patch]of rows)assert.ok(Object.keys(patch).some(k=>JSON.stringify(first[k])!==JSON.stringify(patch[k])),id+' meaningful negative '+label);
 for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);for(const[label,patch]of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context),id+' individual '+label);assert.throws(()=>validateComparisonPage(bad,args,context),id+' comparison '+label);refuse(host,widget,bad,first,pali,id);}}
 }
});

test('299body-owned notes never become title apparatus; V2 spelling botanical notices and authentic note ownership stay intact',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{first,widget,args,context,parsed,profile}=await actual(id),pali=widget.pali.segments[0].text,other=await actual(e.ids.find(other=>other!==id)),foreign=clone(first.translator_notes);foreign[0]={...foreign[0],text:other.parsed.translator_notes[0].text};assert.notEqual(foreign[0].text,first.translator_notes[0].text);
  const rows=[{translator_notes:first.translator_notes.slice(1)},{translator_notes:[...clone(first.translator_notes),clone(first.translator_notes[0])]},{translator_notes:first.translator_notes.map((n,i)=>i?n:{...n,number:99})},{translator_notes:foreign},{translator_notes:foreign,notes_sha256:digest(JSON.stringify(foreign))},{translator_notes:first.translator_notes.slice(1),publisher_preface:{kind:'publisher_preface',parent_id:id,text:first.translator_notes[0].text,translator_notes:[first.translator_notes[0]]}},{publisher_paratext:first.translator_notes[0].text}];
  if(first.translator_notes.length>1){const swapped=clone(first.translator_notes);[swapped[0],swapped[1]]=[swapped[1],swapped[0]];rows.push({translator_notes:swapped});}
  if(id==='tha-ap301'){assert.ok(!parsed.text.split('\n\n')[0].includes('[Note '));assert.ok(parsed.text.split('\n\n')[1].includes('[Note 1]'));assert.ok(parsed.text.split('\n\n')[1].includes('[Note 2]'));}
  if(id==='tha-ap295'||id==='tha-ap298'){const notice=e.noticeAdditions.by_publisher[String(profile.poem)];assert.ok(profile.mapping_notes.includes(notice));assert.ok(first.notes.includes(notice));rows.push({notes:first.notes.filter(row=>row!==notice)},{mapping_notes:first.mapping_notes.filter(row=>row!==notice)});}
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);for(const patch of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));refuse(host,widget,bad,first,pali,id);}}
 }
});

test('genuine source-bound continuations reject owner revision prefix and cursor drift while preserving authentic Pāli',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{first,widget,args,context}=await actual(id);if(!first.continue_with){assert.ok(e.bodyLength(id)<=500);assert.equal(digest(first.text),e.independent(id).body_sha256);continue;}assert.ok(e.bodyLength(id)>500);const next=first.continue_with.arguments,other=e.ids.find(other=>other!==id);
  for(const patch of [{uid:other},{translation:tid(APADANA_PROFILES[other])},{offset:next.offset+1},{translation_revision:'0'.repeat(40)},{prefix_sha256:'invalid'},{allow_partial:true},{allow_shared:true}]){const bad={...clone(first),continue_with:{...clone(first.continue_with),arguments:{...next,...patch}}};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));}
  const before=calls.length,bad=await readPassage({...widget.english.continue_with.arguments,english_translation_revision:'0'.repeat(40),englishCharacters:500});assert.equal(calls.length,before);assert.equal(bad.english,null);assert.ok(bad.english_error);assert.equal(bad.pali.segments[0].text,widget.pali.segments[0].text);
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(bad);assert.ok(!host.elements.english.textContent.includes(first.text));assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));}
 }
});
