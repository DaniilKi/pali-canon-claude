import {currentAuthority} from './helpers/current-apadana.mjs';
import {intake382Authority as historical382Authority} from './helpers/intake382-metadata.mjs';
const liveCurrentSource=currentAuthority(),historical382Source=historical382Authority();
import {INTAKE382_IDS} from './helpers/intake382-metadata.mjs';
// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority} from './helpers/intake380-metadata.mjs';
import {requireCurrentProfiles as requireProfiles380,requireCurrentMetadata as requireMetadata380} from './helpers/current-apadana.mjs';
import {assertCurrentSourceClosure as assertCurrent389390SourceClosure} from './helpers/current-apadana.mjs';
assertCurrent389390SourceClosure(new URL('../',import.meta.url));
const current380Source=intake380Authority();
assert.equal(current380Source.historical375.ids.length,375);assert.deepEqual(current380Source.ids.slice(0,375),current380Source.historical375.ids);
const HistoricalH368Profiles=current380Source.historical368.profiles;
const HistoricalH368Catalogue={version:1,source:current380Source.historical368.manifest_source,vri_commit:current380Source.manifest.vri_commit,held:current380Source.historical368.manifest_held,links:current380Source.historical368.links};
requireProfiles380(APADANA_PROFILES);
/** Actual original-source positives precede every client mutation. */
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
import {thera281285Evidence,digest} from './helpers/thera281-285-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const e=thera281285Evidence(),originalFetch=globalThis.fetch,cases=new Map(),clone=value=>JSON.parse(JSON.stringify(value)),tid=p=>canon.translationId(p);
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only one of exact five immutable source URLs may reach transport');calls.push(id);return new Response(e.artifact(id));};}
async function actual(id){
 if(!cases.has(id)){
  const profile=APADANA_PROFILES[id],unit=canon.resolve(id).unit,args={uid:id,translation:tid(profile),translation_revision:APADANA_COMMIT,limit:500},context={uid:id,choices:english.available(unit),accepted:null},parsed=parseApadana(e.artifact(id),profile);e.assertNormalized(id,parsed);
  const first=await english.translation(unit,args.translation,args),widget=await readPassage({uid:id,translation:args.translation,englishCharacters:500,limit:2});assert.ok(widget.english,widget.english_error);assert.ok(first.continue_with,'Actual publisher body exceeds500characters');cases.set(id,{profile,unit,args,context,parsed,first,widget});
 }
 return cases.get(id);
}
function shown(host,value,pali,id){
 assert.ok(host.elements.english.textContent.includes(value.text),id+' actual body visible');for(const note of value.translator_notes)assert.ok(host.elements.english.textContent.includes(note.text),id+' actual full note visible');for(const note of APADANA_PROFILES[id].mapping_notes)assert.ok(host.elements.english.textContent.includes(note),id+' mandatory edition/source notice visible');if(value.publisher_paratext)assert.ok(host.elements.english.textContent.includes(value.publisher_paratext));assert.ok(host.elements.pali.textContent.includes(pali),id+' authentic Pāli retained');
}
function refuse(host,widget,bad,first,pali,id){host.output({...clone(widget),english:bad});assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(!host.elements.english.textContent.includes(first.text),id+' corrupt English not retained');assert.ok(host.elements.pali.textContent.includes(pali));}

test('all five capabilities retain exact308 identity and every original303 profile without mistaking API choices for private pins',()=>{
 assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);assert.equal(current380Source.historical368.ids.length,368);assert.equal(current380Source.ids.length,380);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,380),current380Source.ids);assert.deepEqual(CURRENT_APADANA_IDS.slice(380,382),INTAKE382_IDS);assert.equal(historical382Source.ids.length,382);assert.deepEqual(CURRENT_APADANA_IDS,liveCurrentSource.ids);
 assert.equal(e.approval.expected_profile_ids.length,308);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,308),e.approval.expected_profile_ids);
 assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,308),e.approval.expected_profile_ids);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(308,310),['tha-ap289','tha-ap290']);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(310,317),['tha-ap294','tha-ap295','tha-ap296','tha-ap297','tha-ap298','tha-ap300','tha-ap301']);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(317,325),['tha-ap303','tha-ap304','tha-ap305','tha-ap306','tha-ap307','tha-ap310','tha-ap311','tha-ap312']);for(const id of e.approval.baseline_ids)assert.deepEqual(APADANA_PROFILES[id],e.baseline.profile_objects[id]);
 for(const id of e.ids){const p=APADANA_PROFILES[id],choice=english.available(canon.resolve(id).unit).find(row=>row.translation_id===tid(p));assert.ok(choice);validateApadanaChoice(choice,id);assert.deepEqual(p,e.profiles[id]);for(const key of ['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'])assert.equal(p[key],e.independent(id)[key]);assert.equal(choice.translation_revision,APADANA_COMMIT);assert.equal(choice.translation_id,tid(p));}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282']){assert.equal(APADANA_PROFILES[id],undefined);assert.throws(()=>validateApadanaChoice({...e.profiles['tha-ap283'],translation_id:'ap:chapter-3/poem-280'},id));}
});

test('all five genuine complete paged bodies and32notes pass individual comparison and both widget bridges before mutations',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);let notes=0,paragraphs=0;
 for(const id of e.ids){const selected=await actual(id),{profile,unit,parsed,context}=selected,b=e.independent(id);notes+=parsed.translator_notes.length;paragraphs+=parsed.text.split('\n\n').length;const hosts=['MCP Apps','Apps SDK'].map(bridge=>view(bridge));let args=selected.args,widget=selected.widget,body='',pages=0;
  while(args){const value=await english.translation(unit,args.translation,args);pages++;body+=value.text;assert.equal(value.fetched_url,profile.raw_url);assert.equal(value.url,profile.url);assert.equal(value.translation_revision,APADANA_COMMIT);assert.equal(value.license,'CC BY-NC-SA 4.0');assert.match(value.attribution,/Jonathan S\. Walters and Whitman College/);assert.deepEqual(value.mapping_notes,profile.mapping_notes);assert.deepEqual(value.translator_notes,parsed.translator_notes);assert.deepEqual(widget.english.translator_notes,parsed.translator_notes);assert.equal(value.publisher_paratext,parsed.publisher_paratext);assert.equal(widget.english.publisher_paratext,parsed.publisher_paratext);assert.equal(widget.english.text,value.text);assert.equal(Object.hasOwn(value,'chapter_summary'),false);assert.equal(Object.hasOwn(value,'publisher_preface'),false);
   const next=validateEnglishPage(value,args,context);assert.deepEqual(validateComparisonPage(value,args,context),next);for(const host of hosts){host.output(widget);shown(host,value,widget.pali.segments[0].text,id);}if(next){assert.equal(widget.english.continue_with.arguments.english_offset,next.offset);widget=await readPassage({...widget.english.continue_with.arguments,englishCharacters:500});}else assert.equal(widget.english.continue_with,null);args=next;
  }
  assert.ok(pages>1);assert.equal(digest(body),b.body_sha256);assert.equal(digest(JSON.stringify(parsed.translator_notes)),b.notes_sha256);
 }
 assert.equal(notes,32);assert.equal(paragraphs,35);assert.ok(calls.every(id=>e.ids.includes(id)));
});

test('actual changed note content empty/nonempty heading forged hashes and missing caveats refuse in both native validators and bridges',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{profile,first,widget,args,context}=await actual(id),pali=widget.pali.segments[0].text,changed=first.translator_notes.map((n,i)=>i?n:{...n,text:n.text+'\n'}),rows=[
  ['revision',{translation_revision:'0'.repeat(40)}],['rights',{license:'CC0'}],['foreign route',{url:e.profiles[e.ids.find(other=>other!==id)].url}],['raw route',{fetched_url:profile.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))}],...['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'].map(key=>[key,{[key]:'0'.repeat(64)}]),
  ['missing notes',{translator_notes:undefined}],['same-count changed original notes',{translator_notes:changed}],['forged note hash',{translator_notes:changed,notes_sha256:digest(JSON.stringify(changed))}],['missing metadata caveats',{mapping_notes:[]}],['changed actual empty or heading text',{publisher_paratext:first.publisher_paratext+'\n'}],['forged paratext hash',{publisher_paratext:first.publisher_paratext+'x',paratext_sha256:digest(first.publisher_paratext+'x')}],['foreign prose-preface owner',{publisher_preface:{}}],['foreign summary owner',{chapter_summary:{}}],['foreign division owner',{publisher_divisions:[]}],['foreign collection owner',{collection_summary:{}}],['foreign editorial owner',{editorial_gap:{}}],
 ];
 profile.mapping_notes.forEach((note,i)=>rows.push(['missing displayed mandatory caveat '+i,{notes:first.notes.filter(value=>value!==note)}]));for(const[label,patch]of rows)assert.ok(Object.keys(patch).some(k=>JSON.stringify(first[k])!==JSON.stringify(patch[k])),id+' meaningful negative '+label);
 for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);for(const[label,patch]of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context),id+' individual '+label);assert.throws(()=>validateComparisonPage(bad,args,context),id+' comparison '+label);refuse(host,widget,bad,first,pali,id);}}
 }
});

test('title-note1 cannot migrate into bare chapter heading and all32 actual notes keep original numbering and owners',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{first,widget,args,context,parsed}=await actual(id),pali=widget.pali.segments[0].text,other=await actual(e.ids.find(other=>other!==id)),foreign=clone(first.translator_notes);foreign[0]={...foreign[0],text:other.parsed.translator_notes[0].text};assert.notEqual(foreign[0].text,first.translator_notes[0].text);
  const swapped=clone(first.translator_notes);[swapped[0],swapped[1]]=[swapped[1],swapped[0]];const rows=[{translator_notes:first.translator_notes.slice(1)},{translator_notes:swapped},{translator_notes:foreign},{translator_notes:foreign,notes_sha256:digest(JSON.stringify(foreign))},{translator_notes:first.translator_notes.slice(1),publisher_preface:{kind:'publisher_preface',parent_id:id,text:first.translator_notes[0].text,translator_notes:[first.translator_notes[0]]}}];
  if(id==='tha-ap283')rows.push({publisher_paratext:''},{publisher_paratext:first.publisher_paratext+'\n'+parsed.translator_notes[0].text});else rows.push({publisher_paratext:(await actual('tha-ap283')).first.publisher_paratext});
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);for(const patch of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));refuse(host,widget,bad,first,pali,id);}}
 }
});

test('source-bound real continuations reject owner revision prefix and cursor drift while retaining authentic Pāli',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{first,widget,args,context}=await actual(id),next=first.continue_with.arguments,other=e.ids.find(other=>other!==id);
  for(const patch of [{uid:other},{translation:tid(APADANA_PROFILES[other])},{offset:next.offset+1},{translation_revision:'0'.repeat(40)},{prefix_sha256:'invalid'},{allow_partial:true},{allow_shared:true}]){const bad={...clone(first),continue_with:{...clone(first.continue_with),arguments:{...next,...patch}}};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));}
  const before=calls.length,bad=await readPassage({...widget.english.continue_with.arguments,english_translation_revision:'0'.repeat(40),englishCharacters:500});assert.equal(calls.length,before);assert.equal(bad.english,null);assert.ok(bad.english_error);assert.equal(bad.pali.segments[0].text,widget.pali.segments[0].text);
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(bad);assert.ok(!host.elements.english.textContent.includes(first.text));assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));}
 }
});
