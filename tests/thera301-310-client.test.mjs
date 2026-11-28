// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority,requireProfiles380,requireMetadata380} from './helpers/intake380-metadata.mjs';
import {assertCurrent389390SourceClosure} from './helpers/current389390-metadata.mjs';
assertCurrent389390SourceClosure(new URL('../',import.meta.url));
const current380Source=intake380Authority();
assert.equal(current380Source.historical375.ids.length,375);assert.deepEqual(current380Source.ids.slice(0,375),current380Source.historical375.ids);
const HistoricalH368Profiles=current380Source.historical368.profiles;
const HistoricalH368Catalogue={version:1,source:current380Source.historical368.manifest_source,vri_commit:current380Source.manifest.vri_commit,held:current380Source.historical368.manifest_held,links:current380Source.historical368.links};
requireProfiles380(CURRENT_APADANA_PROFILES);
/** Authentic original-source body/note positives precede every client mutation. */
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES as CURRENT_APADANA_PROFILES,APADANA_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana} from '../src/apadana.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {validateApadanaChoice,validateEnglishPage} from '../web/translation-policy.mjs';
import {validateComparisonPage} from '../web/translation-comparison.mjs';
import {view} from './helpers/widget-view.mjs';
import {thera301310Evidence,digest} from './helpers/thera301-310-evidence.mjs';
import {readFileSync} from 'node:fs';
import {projectPublisher333To325} from './helpers/thera333-legacy-projection.mjs';
const APADANA_PROFILES=projectPublisher333To325(HistoricalH368Profiles,HistoricalH368Catalogue).profiles;
const e=thera301310Evidence(),originalFetch=globalThis.fetch,cases=new Map(),clone=value=>JSON.parse(JSON.stringify(value)),tid=p=>canon.translationId(p);
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only an exact eight-poem Markdown source URL may reach transport');assert.ok(url.href.endsWith('.md'));calls.push(id);return new Response(e.artifact(id));};}
async function actual(id){
 if(!cases.has(id)){
  const profile=APADANA_PROFILES[id],unit=canon.resolve(id).unit,args={uid:id,translation:tid(profile),translation_revision:APADANA_COMMIT,limit:500},context={uid:id,choices:english.available(unit),accepted:null},parsed=parseApadana(e.artifact(id),profile);e.assertNormalized(id,parsed);
  const first=await english.translation(unit,args.translation,args),widget=await readPassage({uid:id,translation:args.translation,englishCharacters:500,limit:2});assert.ok(widget.english,widget.english_error);assert.equal(Boolean(first.continue_with),e.bodyLength(id)>500);cases.set(id,{profile,unit,args,context,parsed,first,widget});
 }
 return cases.get(id);
}
function shown(host,value,pali,id){assert.ok(host.elements.english.textContent.includes(value.text),id+' genuine body visible');for(const note of value.translator_notes)assert.ok(host.elements.english.textContent.includes(note.text),id+' complete genuine note visible');for(const note of APADANA_PROFILES[id].mapping_notes)assert.ok(host.elements.english.textContent.includes(note),id+' mandatory source/edition caveat visible');if(value.chapter_summary){assert.ok(host.elements.english.textContent.includes(value.chapter_summary.text),id+' actual summary visible');for(const note of value.chapter_summary.translator_notes)assert.ok(host.elements.english.textContent.includes(note.text),id+' actual summary note visible');}assert.ok(host.elements.pali.textContent.includes(pali),id+' authentic Pāli retained');assert.ok(!host.elements.english.textContent.includes('.mp3'));}
function refuse(host,widget,bad,first,pali,id){host.output({...clone(widget),english:bad});assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(!host.elements.english.textContent.includes(first.text),id+' corrupt English not retained');assert.ok(host.elements.pali.textContent.includes(pali));}

test('eight genuine V2 capabilities retain all317 prior profiles and exact325 identity without audio capability or exposed-choice pin assumptions',()=>{
 assert.deepEqual(Object.keys(APADANA_PROFILES),e.approval.expected_profile_ids);assert.equal(Object.keys(APADANA_PROFILES).length,325);for(const id of e.approval.baseline_ids)assert.deepEqual(APADANA_PROFILES[id],e.baseline.profile_objects[id]);
 for(const id of e.ids){const p=APADANA_PROFILES[id],choice=english.available(canon.resolve(id).unit).find(row=>row.translation_id===tid(p));assert.ok(choice);validateApadanaChoice(choice,id);assert.deepEqual(p,e.profiles[id]);for(const key of ['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'])assert.equal(p[key],e.independent(id)[key]);assert.equal(choice.translation_revision,APADANA_COMMIT);assert.equal(choice.translation_id,tid(p));for(const key of ['audio','media','reciter'])assert.equal(Object.hasOwn(choice,key),false);assert.ok(!JSON.stringify(choice).includes('.mp3'));}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282','tha-ap293','tha-ap299','tha-ap302','tha-ap308','tha-ap309']){assert.equal(APADANA_PROFILES[id],undefined);assert.throws(()=>validateApadanaChoice({...e.profiles['tha-ap303'],translation_id:'ap:chapter-3/poem-280'},id));}
});

test('all eight genuine complete paged bodies with31poem notes and separate summary note8 pass native comparison and both widget bridges with exact source-derived offsets',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);let notes=0,paragraphs=0,totalPages=0,summaryNotes=0;
 for(const id of e.ids){const selected=await actual(id),{profile,unit,parsed,context}=selected,b=e.independent(id),expectedLength=e.bodyLength(id);notes+=parsed.translator_notes.length;summaryNotes+=parsed.chapter_summary?.translator_notes.length||0;paragraphs+=parsed.text.split('\n\n').length;const hosts=['MCP Apps','Apps SDK'].map(bridge=>view(bridge));let args=selected.args,widget=selected.widget,body='',pages=0;
  while(args){const value=await english.translation(unit,args.translation,args),offset=args.offset||0;pages++;body+=value.text;assert.equal(value.text,parsed.text.slice(offset,offset+500));assert.equal(value.offset,offset);assert.equal(value.total_characters,expectedLength);assert.equal(value.prefix_sha256,digest(parsed.text.slice(0,offset)));assert.equal(value.next_offset,offset+500<expectedLength?offset+500:null);assert.equal(value.fetched_url,profile.raw_url);assert.equal(value.url,profile.url);assert.equal(value.translation_revision,APADANA_COMMIT);assert.equal(value.license,'CC BY-NC-SA 4.0');assert.match(value.attribution,/Jonathan S\. Walters and Whitman College/);assert.deepEqual(value.mapping_notes,profile.mapping_notes);assert.deepEqual(value.translator_notes,parsed.translator_notes);assert.deepEqual(widget.english.translator_notes,parsed.translator_notes);assert.equal(value.publisher_paratext,'');assert.equal(widget.english.publisher_paratext,'');assert.equal(widget.english.text,value.text);assert.equal(Object.hasOwn(value,'publisher_preface'),false);if(parsed.chapter_summary){assert.deepEqual(value.chapter_summary,parsed.chapter_summary);assert.deepEqual(widget.english.chapter_summary,parsed.chapter_summary);}else assert.equal(Object.hasOwn(value,'chapter_summary'),false);for(const key of ['audio','media','reciter'])assert.equal(Object.hasOwn(value,key),false);assert.ok(!JSON.stringify(value).includes('.mp3'));
   const next=validateEnglishPage(value,args,context);assert.deepEqual(validateComparisonPage(value,args,context),next);for(const host of hosts){host.output(widget);shown(host,value,widget.pali.segments[0].text,id);}if(next){assert.equal(next.offset,value.next_offset);assert.equal(widget.english.continue_with.arguments.english_offset,next.offset);widget=await readPassage({...widget.english.continue_with.arguments,englishCharacters:500});}else assert.equal(widget.english.continue_with,null);args=next;
  }
  assert.equal(pages,Math.ceil(expectedLength/500));totalPages+=pages;assert.equal(digest(body),b.body_sha256);assert.equal(digest(JSON.stringify(parsed.translator_notes)),b.notes_sha256);
  if(profile.stanza_layout.some(row=>row.lines===8)){const fullArgs={...selected.args,limit:6000},full=await english.translation(unit,fullArgs.translation,fullArgs),fullWidget=await readPassage({uid:id,translation:fullArgs.translation,englishCharacters:6000,limit:2});e.assertNormalized(id,full);assert.equal(validateEnglishPage(full,fullArgs,context),null);assert.equal(validateComparisonPage(full,fullArgs,context),null);for(const host of hosts){host.output(fullWidget);shown(host,full,fullWidget.pali.segments[0].text,id);for(const[index,row]of profile.stanza_layout.entries())if(row.lines===8)assert.ok(host.elements.english.textContent.includes(parsed.text.split('\n\n')[index+1]),'Complete genuine eight-line entry visible without page-boundary assumption');}}
 }
 assert.equal(notes,31);assert.equal(summaryNotes,1);assert.equal(paragraphs,58);assert.equal(totalPages,17);assert.ok(calls.every(id=>e.ids.includes(id)));
});

test('actual notes empty paratext forged hashes missing provenance and source metadata drift refuse in both validators and bridges',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{profile,first,widget,args,context}=await actual(id),pali=widget.pali.segments[0].text,rows=[
  ['revision',{translation_revision:'0'.repeat(40)}],['rights',{license:'CC0'}],['foreign route',{url:e.profiles[e.ids.find(other=>other!==id)].url}],['raw route',{fetched_url:profile.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))}],...['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'].map(key=>[key,{[key]:'0'.repeat(64)}]),['missing notes',{translator_notes:undefined}],['missing caveat metadata',{mapping_notes:[]}],['changed empty paratext',{publisher_paratext:'\n'}],['forged paratext hash',{publisher_paratext:first.text.split('\n\n')[0],paratext_sha256:digest(first.text.split('\n\n')[0])}],['foreign preface owner',{publisher_preface:{}}],['foreign summary owner',{chapter_summary:{}}],['foreign division owner',{publisher_divisions:[]}],['foreign collection owner',{collection_summary:{}}],['foreign editorial owner',{editorial_gap:{}}],
 ];for(const[index,note]of first.translator_notes.entries()){const changed=first.translator_notes.map((n,i)=>i===index?{...n,text:n.text+'\n'}:n);rows.push(['same-count changed authentic note '+note.number,{translator_notes:changed}],['forged hash for authentic note '+note.number,{translator_notes:changed,notes_sha256:digest(JSON.stringify(changed))}]);}profile.mapping_notes.forEach((note,i)=>rows.push(['missing displayed mandatory caveat '+i,{notes:first.notes.filter(value=>value!==note)}]));for(const[label,patch]of rows)assert.ok(Object.keys(patch).some(k=>JSON.stringify(first[k])!==JSON.stringify(patch[k])),id+' meaningful negative '+label);
 for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);for(const[label,patch]of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context),id+' individual '+label);assert.throws(()=>validateComparisonPage(bad,args,context),id+' comparison '+label);refuse(host,widget,bad,first,pali,id);}}
 }
});

test('poem notes keep authentic owners and V2 order notice cannot disappear or become phantom apparatus',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{first,widget,args,context,profile}=await actual(id),pali=widget.pali.segments[0].text,other=await actual(e.ids.find(other=>other!==id)),foreign=clone(first.translator_notes);foreign[0]={...foreign[0],text:other.parsed.translator_notes[0].text};assert.notEqual(foreign[0].text,first.translator_notes[0].text);
  const rows=[{translator_notes:first.translator_notes.slice(1)},{translator_notes:[...clone(first.translator_notes),clone(first.translator_notes[0])]},{translator_notes:first.translator_notes.map((n,i)=>i?n:{...n,number:99})},{translator_notes:foreign},{translator_notes:foreign,notes_sha256:digest(JSON.stringify(foreign))},{translator_notes:first.translator_notes.slice(1),publisher_preface:{kind:'publisher_preface',parent_id:id,text:first.translator_notes[0].text,translator_notes:[first.translator_notes[0]]}},{publisher_paratext:first.translator_notes[0].text}];
  if(first.translator_notes.length>1){const swapped=clone(first.translator_notes);[swapped[0],swapped[1]]=[swapped[1],swapped[0]];rows.push({translator_notes:swapped});}
  if(id==='tha-ap312'){assert.ok(profile.mapping_notes.includes(e.notice));assert.ok(first.notes.includes(e.notice));rows.push({notes:first.notes.filter(row=>row!==e.notice)},{mapping_notes:first.mapping_notes.filter(row=>row!==e.notice)});}
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);for(const patch of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));refuse(host,widget,bad,first,pali,id);}}
 }
});

test('310complete summary and note8 cannot be omitted corrected reordered reassigned or merged into poem notes even with forged hashes',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);const id='tha-ap312',{first,widget,args,context,parsed}=await actual(id),s=first.chapter_summary,pali=widget.pali.segments[0].text;e.assertNormalized(id,parsed);assert.deepEqual(s.translator_notes.map(n=>n.number),[8]);assert.deepEqual(first.translator_notes.map(n=>n.number),[1,2,3,4,5,6,7]);
 const corrected=s.text.replace('one less than fifty','fifty-one'),parts=s.text.split('\n\n'),reordered=[parts[2],parts[0],parts[1]].join('\n\n'),changedNotes=s.translator_notes.map(n=>({...n,text:n.text+'\n'}));assert.notEqual(corrected,s.text);assert.notEqual(reordered,s.text);
 const rows=[{chapter_summary:undefined},{chapter_summary:{...s,text:corrected}},{chapter_summary:{...s,text:corrected,body_sha256:digest(corrected)}},{chapter_summary:{...s,text:reordered,body_sha256:digest(reordered)}},{chapter_summary:{...s,parent_id:'tha-ap308'}},{chapter_summary:{...s,first_ref:'tha-ap312/8'}},{chapter_summary:{...s,last_ref:'tha-ap312/12'}},{chapter_summary:{...s,root_start:9220}},{chapter_summary:{...s,root_end:9227}},{chapter_summary:{...s,translator_notes:undefined}},{chapter_summary:{...s,translator_notes:[]}},{chapter_summary:{...s,translator_notes:changedNotes}},{chapter_summary:{...s,translator_notes:changedNotes,notes_sha256:digest(JSON.stringify(changedNotes))}},{chapter_summary:{...s,note_numbers:[7]}},{chapter_summary:{...s,translator_notes:s.translator_notes.map(n=>({...n,number:7}))}},{translator_notes:[...clone(first.translator_notes),...clone(s.translator_notes)],chapter_summary:{...s,translator_notes:[]}}];
 for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);assert.ok(host.elements.english.textContent.includes(s.translator_notes[0].text));for(const patch of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));refuse(host,widget,bad,first,pali,id);}}
});

test('genuine source-bound continuations reject owner revision prefix and cursor drift while preserving authentic Pāli',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{first,widget,args,context}=await actual(id);if(!first.continue_with){assert.ok(e.bodyLength(id)<=500);assert.equal(digest(first.text),e.independent(id).body_sha256);continue;}assert.ok(e.bodyLength(id)>500);const next=first.continue_with.arguments,other=e.ids.find(other=>other!==id);
  for(const patch of [{uid:other},{translation:tid(APADANA_PROFILES[other])},{offset:next.offset+1},{translation_revision:'0'.repeat(40)},{prefix_sha256:'invalid'},{allow_partial:true},{allow_shared:true}]){const bad={...clone(first),continue_with:{...clone(first.continue_with),arguments:{...next,...patch}}};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));}
  const before=calls.length,bad=await readPassage({...widget.english.continue_with.arguments,english_translation_revision:'0'.repeat(40),englishCharacters:500});assert.equal(calls.length,before);assert.equal(bad.english,null);assert.ok(bad.english_error);assert.equal(bad.pali.segments[0].text,widget.pali.segments[0].text);
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(bad);assert.ok(!host.elements.english.textContent.includes(first.text));assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));}
 }
});
