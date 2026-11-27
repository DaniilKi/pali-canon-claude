// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority,requireProfiles380,requireMetadata380,assertCurrent380SourceClosure} from './helpers/intake380-metadata.mjs';
assertCurrent380SourceClosure(new URL('../',import.meta.url));
const current380Source=intake380Authority();
assert.equal(current380Source.historical375.ids.length,375);assert.deepEqual(current380Source.ids.slice(0,375),current380Source.historical375.ids);
const HistoricalH368Profiles=current380Source.historical368.profiles;
const HistoricalH368Catalogue={version:1,source:current380Source.historical368.manifest_source,vri_commit:current380Source.manifest.vri_commit,held:current380Source.historical368.manifest_held,links:current380Source.historical368.links};
requireProfiles380(APADANA_PROFILES);
/** Original fixture positives precede every capability/cache control. No invented positive notes. */
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
import {thera261280Evidence,digest} from './helpers/thera261-280-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const e=thera261280Evidence(),originalFetch=globalThis.fetch,cases=new Map(),clone=value=>JSON.parse(JSON.stringify(value));
const tid=p=>canon.translationId(p);
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only an exact independently approved immutable source reaches transport');calls.push(id);return new Response(e.artifact(id));};}
async function actual(id){
 if(!cases.has(id)){
  const profile=APADANA_PROFILES[id],unit=canon.resolve(id).unit,args={uid:id,translation:tid(profile),translation_revision:APADANA_COMMIT,limit:500},context={uid:id,choices:english.available(unit),accepted:null};
  const parsed=parseApadana(e.artifact(id),profile);e.assertNormalized(id,parsed);
  const first=await english.translation(unit,args.translation,args),widget=await readPassage({uid:id,translation:args.translation,englishCharacters:500,limit:2});assert.ok(widget.english,widget.english_error);assert.ok(first.continue_with,'Every real body exceeds500characters');
  cases.set(id,{profile,unit,args,context,parsed,first,widget});
 }
 return cases.get(id);
}
function shown(host,value,pali,id){
 assert.ok(host.elements.english.textContent.includes(value.text),id+' actual body visible');for(const note of value.translator_notes)assert.ok(host.elements.english.textContent.includes(note.text),id+' genuine note visible');
 for(const note of APADANA_PROFILES[id].mapping_notes)assert.ok(host.elements.english.textContent.includes(note),id+' mandatory edition/coverage notice visible');
 if(value.publisher_paratext)assert.ok(host.elements.english.textContent.includes(value.publisher_paratext));if(value.chapter_summary)assert.ok(host.elements.english.textContent.includes(value.chapter_summary.text));
 assert.ok(host.elements.pali.textContent.includes(pali),id+' Pāli retained');
}
function refusal(host,widget,bad,first,pali,id){
 host.output({...clone(widget),english:bad});assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(!host.elements.english.textContent.includes(first.text),id+' corrupt English not retained');assert.ok(host.elements.pali.textContent.includes(pali));
}

test('all18 capabilities retain exact303 identity order and immutable independently sealed metadata',()=>{
 assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);assert.equal(current380Source.historical368.ids.length,368);assert.equal(CURRENT_APADANA_IDS.length,380);
 assert.equal(e.approval.expected_profile_ids.length,303);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,303),e.approval.expected_profile_ids);
 assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,303),e.approval.expected_profile_ids);
 for(const id of e.approval.baseline_ids)assert.deepEqual(APADANA_PROFILES[id],e.baseline.profile_objects[id]);
 for(const id of e.ids){const p=APADANA_PROFILES[id],choices=english.available(canon.resolve(id).unit),choice=choices.find(row=>row.translation_id===tid(p));assert.ok(choice);validateApadanaChoice(choice,id);assert.deepEqual(p,e.peer.approved_profile_objects[id]);assert.deepEqual(p.mapping_notes,e.golden(id).mapping_notes);for(const key of ['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'])assert.equal(p[key],e.independent(id)[key]);assert.equal(choice.translation_revision,APADANA_COMMIT);}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282']){assert.equal(APADANA_PROFILES[id],undefined);assert.throws(()=>validateApadanaChoice({...e.profiles['tha-ap272'],translation_id:'ap:chapter-3/poem-280'},id));}
});

test('ALL18 genuine complete paged bodies and59notes pass individual comparison and both widgets before mutation controls',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);let notes=0,paragraphs=0;
 for(const id of e.ids){const selected=await actual(id),{profile,unit,parsed,context}=selected,b=e.independent(id);notes+=parsed.translator_notes.length;paragraphs+=parsed.text.split('\n\n').length;
  const hosts=['MCP Apps','Apps SDK'].map(bridge=>view(bridge));let args=selected.args,widget=selected.widget,body='',pages=0;
  while(args){const value=await english.translation(unit,args.translation,args);pages++;body+=value.text;assert.equal(value.fetched_url,profile.raw_url);assert.equal(value.url,profile.url);assert.equal(value.translation_revision,APADANA_COMMIT);assert.equal(value.license,'CC BY-NC-SA 4.0');assert.match(value.attribution,/Jonathan S\. Walters and Whitman College/);assert.deepEqual(value.mapping_notes,profile.mapping_notes);assert.deepEqual(value.translator_notes,parsed.translator_notes);assert.deepEqual(widget.english.translator_notes,parsed.translator_notes);assert.equal(value.publisher_paratext,parsed.publisher_paratext);assert.equal(widget.english.publisher_paratext,parsed.publisher_paratext);assert.equal(widget.english.text,value.text);
   if(parsed.chapter_summary){assert.deepEqual(value.chapter_summary,parsed.chapter_summary);assert.deepEqual(widget.english.chapter_summary,parsed.chapter_summary);}else assert.equal(Object.hasOwn(value,'chapter_summary'),false);
   const next=validateEnglishPage(value,args,context);assert.deepEqual(validateComparisonPage(value,args,context),next);for(const host of hosts){host.output(widget);shown(host,value,widget.pali.segments[0].text,id);}
   if(next){assert.equal(widget.english.continue_with.arguments.english_offset,next.offset);widget=await readPassage({...widget.english.continue_with.arguments,englishCharacters:500});}else assert.equal(widget.english.continue_with,null);args=next;
  }
  assert.ok(pages>1);assert.equal(digest(body),b.body_sha256);assert.equal(digest(JSON.stringify(parsed.translator_notes)),b.notes_sha256);
 }
 assert.equal(notes,59);assert.equal(paragraphs,129);assert.ok(calls.every(id=>e.ids.includes(id)));
});

test('all18 cached note content empty/nonempty headings metadata and missing edition notices refuse while preserving Pāli',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{profile,first,widget,args,context}=await actual(id),pali=widget.pali.segments[0].text;
  const changed=first.translator_notes.map((n,i)=>i?n:{...n,text:n.text+'\n'}),rows=[
   ['revision',{translation_revision:'0'.repeat(40)}],['rights',{license:'CC0'}],['route',{url:e.profiles[e.ids.find(other=>other!==id)].url}],['raw route',{fetched_url:profile.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))}],
   ...['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'].map(key=>[key,{[key]:'0'.repeat(64)}]),
   ['mapping metadata',{mapping_notes:[]}],['absent poem notes',{translator_notes:undefined}],['same count changed actual notes',{translator_notes:changed}],['forged note hash',{translator_notes:changed,notes_sha256:digest(JSON.stringify(changed))}],
   ['changed authentic heading or empty paratext',{publisher_paratext:first.publisher_paratext+'\n'}],['forged paratext hash',{publisher_paratext:first.publisher_paratext+'x',paratext_sha256:digest(first.publisher_paratext+'x')}],
   ['phantom prose-preface descriptor',{publisher_preface:{}}],['phantom collection owner',{collection_summary:{}}],['phantom recitation owner',{publisher_divisions:[]}],['phantom editorial owner',{editorial_gap:{}}],
  ];
  if(!profile.chapter_summary)rows.push(['foreign chapter owner',{chapter_summary:{}}]);
  profile.mapping_notes.forEach((note,index)=>rows.push(['missing displayed mandatory caveat '+index,{notes:first.notes.filter(value=>value!==note)}]));
  for(const[label,patch]of rows)assert.ok(Object.keys(patch).some(k=>JSON.stringify(first[k])!==JSON.stringify(patch[k])),id+' meaningful negative '+label);
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);
   for(const[label,patch]of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context),id+' individual '+label);assert.throws(()=>validateComparisonPage(bad,args,context),id+' comparison '+label);refusal(host,widget,bad,first,pali,id);}
  }
 }
});

test('real title-note1 cannot migrate into heading apparatus and270summary cannot be corrected reassigned or given notes',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of ['tha-ap263','tha-ap273','tha-ap272']){const{first,widget,args,context,profile}=await actual(id),pali=widget.pali.segments[0].text,rows=[];
  if(id==='tha-ap263')rows.push({translator_notes:first.translator_notes.slice(1),publisher_preface:{kind:'publisher_preface',parent_id:id,text:first.translator_notes[0].text,translator_notes:[first.translator_notes[0]]}});
  if(!profile.chapter_summary)rows.push({publisher_paratext:''},{chapter_summary:{}});
  else{
   const summary=first.chapter_summary,changed=summary.text.replace('forty plus one','forty plus two');assert.notEqual(changed,summary.text);
   rows.push({chapter_summary:undefined},{chapter_summary:{...summary,text:changed}},{chapter_summary:{...summary,text:changed,body_sha256:digest(changed)}},{chapter_summary:{...summary,parent_id:'tha-ap282'}},{chapter_summary:{...summary,first_ref:'tha-ap272/7'}},{chapter_summary:{...summary,root_start:summary.root_start-1}},{chapter_summary:{...summary,translator_notes:[{number:1,text:first.translator_notes[0].text}]}},{chapter_summary:{...summary,translator_notes:undefined}});
  }
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);for(const patch of rows){const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));refusal(host,widget,bad,first,pali,id);}}
 }
});

test('real continuations keep exact owner and revision;280cannot inherit270 and stale cursors preserve authentic Pāli',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of e.ids){const{first,widget,args,context}=await actual(id),next=first.continue_with.arguments,other=e.ids.find(other=>other!==id);
  for(const patch of [{uid:other},{translation:tid(APADANA_PROFILES[other])},{offset:next.offset+1},{translation_revision:'0'.repeat(40)},{prefix_sha256:'invalid'},{allow_partial:true},{allow_shared:true}]){const bad={...clone(first),continue_with:{...clone(first.continue_with),arguments:{...next,...patch}}};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));}
  const before=calls.length,bad=await readPassage({...widget.english.continue_with.arguments,english_translation_revision:'0'.repeat(40),englishCharacters:500});assert.equal(calls.length,before);assert.equal(bad.english,null);assert.ok(bad.english_error);assert.equal(bad.pali.segments[0].text,widget.pali.segments[0].text);
  for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(bad);assert.ok(!host.elements.english.textContent.includes(first.text));assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));}
 }
 const river=await actual('tha-ap272'),pali=(await readPassage({uid:'tha-ap282',english:false,limit:2})).pali.segments;
 const foreign={...clone(river.widget),text_id:'tha-ap282',pali:{...clone(river.widget.pali),segments:pali}};
 for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(foreign);assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(host.elements.pali.textContent.includes(pali[0].text));}
});
