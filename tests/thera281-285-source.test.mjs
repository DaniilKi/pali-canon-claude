import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT,isApadanaRawUrl} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,rootDigest} from '../src/apadana.mjs';
import {parseTheraApadana} from '../src/apadana-thera.mjs';
import {fetchPublic} from '../src/http.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {thera281285Evidence,digest,blob} from './helpers/thera281-285-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const e=thera281285Evidence(),originalFetch=globalThis.fetch,clone=value=>JSON.parse(JSON.stringify(value));
const tid=p=>canon.translationId(p),profile=id=>APADANA_PROFILES[id],parsed=id=>parseApadana(e.artifact(id),profile(id));
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only exact five immutable fixture URLs may reach transport');calls.push(id);return new Response(e.artifact(id));};}

test('exact five independently reviewed profiles extend all preserved303 objects and links to308 without prior catalogue or canonical identity changes',()=>{
 const data=canon.load(),manifest=JSON.parse(readFileSync('server/data/apadana.json'));
 assert.equal(APADANA_COMMIT,e.approval.publisher_revision);assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);assert.equal(CURRENT_APADANA_IDS.length,325);
 assert.equal(e.approval.expected_profile_ids.length,308);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,308),e.approval.expected_profile_ids);
 assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,308),e.approval.expected_profile_ids);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(308,310),['tha-ap289','tha-ap290']);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(310,317),['tha-ap294','tha-ap295','tha-ap296','tha-ap297','tha-ap298','tha-ap300','tha-ap301']);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(317),['tha-ap303','tha-ap304','tha-ap305','tha-ap306','tha-ap307','tha-ap310','tha-ap311','tha-ap312']);assert.deepEqual(Object.keys(manifest.links),CURRENT_APADANA_IDS);
 assert.deepEqual(Object.keys(manifest.links).slice(0,308),e.approval.expected_profile_ids);
 for(const id of e.approval.baseline_ids){assert.deepEqual(profile(id),e.baseline.profile_objects[id]);assert.deepEqual(manifest.links[id],e.baseline.translation_objects[id]);assert.equal(digest(JSON.stringify(profile(id))),e.compact.profile_object_sha256[id]);assert.equal(digest(JSON.stringify(manifest.links[id])),e.compact.translation_object_sha256[id]);}
 const priorSource=clone(manifest.source);
 for(const[current,previous]of [['325 finite complete publisher-edition poems','317 finite complete publisher-edition poems'],['285 explicitly mapped Therā','277 explicitly mapped Therā']]){
  assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved latest policy counter '+current);
  priorSource.policy=priorSource.policy.replace(current,previous);
 }
 for(const[current,previous]of [['317 finite complete publisher-edition poems','310 finite complete publisher-edition poems'],['277 explicitly mapped Therā','270 explicitly mapped Therā']]){
  assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved latest policy counter '+current);
  priorSource.policy=priorSource.policy.replace(current,previous);
 }
 for(const[current,previous]of [['310 finite complete publisher-edition poems','308 finite complete publisher-edition poems'],['270 explicitly mapped Therā','268 explicitly mapped Therā']]){
  assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved latest policy counter '+current);
  priorSource.policy=priorSource.policy.replace(current,previous);
 }
 for(const[current,previous]of [['308 finite complete publisher-edition poems','303 finite complete publisher-edition poems'],['268 explicitly mapped Therā','263 explicitly mapped Therā']]){
  assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved current policy counter '+current);
  priorSource.policy=priorSource.policy.replace(current,previous);
 }
 assert.equal(digest(JSON.stringify(priorSource)),e.compact.manifest_source_sha256,'Only the two approved counters differ from the complete historical source object');for(const[path,sha]of Object.entries(e.compact.data_file_sha256))if(path!=='server/data/apadana.json')assert.equal(digest(readFileSync(path)),sha,'Unchanged prior data artifact '+path);
 assert.equal(digest(JSON.stringify(data.canon)),e.baseline.canon_logical_sha256);assert.equal(data.canon.units.length,8544);assert.equal(data.canon.books.length,61);
 for(const id of e.ids){const p=profile(id),b=e.independent(id),u=data.byId.get(id);assert.deepEqual(p,e.profiles[id]);assert.deepEqual(manifest.links[id],e.links[id]);assert.equal(rootDigest(u,data.canon.books[u.book]),b.root_sha256);assert.deepEqual({start:u.start,end:u.end,book:u.book},{start:b.canonical.start,end:b.canonical.end,book:b.canonical.book});assert.ok(Object.isFrozen(p));}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282'])assert.equal(profile(id),undefined);assert.ok(profile('tha-ap266'));assert.ok(profile('tha-ap280'));
});

test('all five genuine originals and six rights/routing artifacts match independent body notes paragraph and source pins before mutations',{skip:!e.checkout},()=>{
 for(const item of e.bRights.rights_artifacts){const raw=readFileSync(join(e.checkout,item.path));assert.equal(raw.length,item.bytes);assert.equal(digest(raw),item.sha256);assert.equal(blob(raw),item.git_blob_sha1);}
 let paragraphs=0,entries=0,labels=0,notes=0;
 for(const id of e.ids){const value=parsed(id),b=e.independent(id);e.assertNormalized(id,value);paragraphs+=value.text.split('\n\n').length;entries+=b.stanza_layout.length;labels+=b.printed_local_labels.length;notes+=value.translator_notes.length;assert.equal(value.title,profile(id).title);}
 assert.deepEqual({paragraphs,entries,labels,notes},{paragraphs:35,entries:20,labels:23,notes:32});
});

test('three authentic combined entries retain eight lines and verse quotations exclude title colophons notes and chapter heading',{skip:!e.checkout},()=>{
 let paired=0;
 for(const id of e.ids){const p=profile(id),b=e.independent(id),value=parsed(id);e.assertNormalized(id,value);const quote=quotationText({...value,translation_id:tid(p)}),entries=quote.split('\n\n');assert.equal(digest(quote),b.quotation_text_sha256);assert.deepEqual(entries.map(digest),b.quotation_entry_sha256s);assert.ok(!/\[Note \d+\]/.test(quote));
  for(const paragraph of [value.text.split('\n\n')[0],...value.text.split('\n\n').slice(-2)])assert.ok(!quote.includes(paragraph));if(value.publisher_paratext)assert.ok(!quote.includes(value.publisher_paratext));
  for(const [i,row]of b.stanza_layout.entries())if(row.lines===8){paired++;assert.equal(value.text.split('\n\n')[i+1].split('\n').length,8);assert.equal(entries[i].split('\n').length,8);}
 }
 assert.equal(paired,3);assert.deepEqual(profile('tha-ap283').stanza_layout[0],{local_label:'1-2',publisher_label:'2623-2624',suffix:'(1-2) [2623-2624]',lines:8});assert.deepEqual(profile('tha-ap284').stanza_layout[1],{local_label:'2-3',publisher_label:'2628-2629',suffix:'(2-3) [2628-2629]',lines:8});assert.deepEqual(profile('tha-ap285').stanza_layout[0],{local_label:'1-2',publisher_label:'2633-2634',suffix:'(1-2) [2633-2634]',lines:8});
});

test('bare chapter29 heading is note-free apparatus; xxx Suddhattha ŋ 27/37 variant epithets and unnamed Buddha remain literal',{skip:!e.checkout},()=>{
 for(const id of e.ids){const value=parsed(id);e.assertNormalized(id,value);assert.equal(Object.hasOwn(value,'publisher_preface'),false);assert.equal(Object.hasOwn(value,'chapter_summary'),false);assert.equal(Boolean(value.publisher_paratext),id==='tha-ap283');assert.ok(!value.publisher_paratext.includes('[Note '));}
 const leaf=parsed('tha-ap283');assert.equal(digest(leaf.publisher_paratext),e.independent('tha-ap283').paratext_sha256);assert.equal(leaf.publisher_paratext.split('\n').length,1);assert.ok(leaf.text.split('\n\n')[0].includes('[Note 1]'));
 const fruit=parsed('tha-ap284');assert.equal(fruit.translator_notes.length,17);assert.match(fruit.translator_notes[0].text,/xxx/);assert.match(fruit.translator_notes[2].text,/Suddhattha Buddha/);assert.match(fruit.translator_notes[12].text,/\u014b/);
 const greeting=parsed('tha-ap285'),u=canon.resolve('tha-ap285').unit,blocks=canon.load().canon.books[u.book].blocks.slice(u.start,u.end);assert.match(greeting.text,/twenty-seventh/);assert.match(greeting.text,/Suparivāra/);assert.ok(blocks.some(row=>row[2].includes('Sattatiṃse')));assert.ok(blocks.some(row=>row[3].includes('sattavīse (sī. syā.)')));assert.match(greeting.translator_notes[1].text,/\u014b/);assert.match(greeting.translator_notes[2].text,/\u014b/);
 const flower=parsed('tha-ap286');assert.match(flower.translator_notes[2].text,/xxx/);assert.match(flower.text,/Vipassi/);
 const unnamed=parsed('tha-ap287');assert.ok(!/Vipassi|Siddhattha|Suddhattha/.test(unnamed.text));assert.match(unnamed.translator_notes[1].text,/pūja/);
});

test('changed actual raw identity notes pair members ordering and forged hashes refuse after authentic five positives',{skip:!e.checkout},()=>{
 for(const id of e.ids){const p=profile(id),raw=e.artifact(id);e.assertNormalized(id,parsed(id));
  const definition=raw.match(/\[\^1\]: [\s\S]*?(?=\n\n\[\^2\]: |$)/)[0],number=String(p.poem),other=e.ids.find(other=>other!==id);
  const changes=[raw+'\n',raw.replace('### ','### x'),raw.replace('order: '+number,'order: 280'),raw.replace('category: chapter-3','category: chapter-4'),raw.replace('[^1]: ','[^1]: x'),raw.replace('[^1]: ','[^2]: '),raw.replace(definition,'').replace('### ',definition+'\n\n### '),raw.replace('[^1]','').replace('(1','[^1] (1'),raw.replace('\\['+p.stanza_layout[0].publisher_label+'\\]','\\[9999\\]')];
  if(/data-state=on/.test(raw))changes.push(raw.replace('data-state=on','data-state=off'));if(p.poem===281)changes.push(raw.replace('## Paṇṇadāyaka Chapter','## Phaladāyaka Chapter'));if(p.poem===282)changes.push(raw.replace('Suddhattha','Siddhattha'));if(p.poem===283)changes.push(raw.replace('twenty-seventh','thirty-seventh'));if(p.poem===284)changes.push(raw.replace('xxx',''));
  for(const changed of changes){assert.notEqual(changed,raw,id+' actual negative');assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:digest(changed)}));}
  for(const patch of [{id:other},{poem:280},{path:'/text/chapter-3/poem-280/'},{translation_revision:'0'.repeat(40)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{root_sha256:'0'.repeat(64)},{note_numbers:[999]},{stanza_layout:[]},{publisher_preface:{}},{chapter_summary:{}}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));
 }
});

test('held260/266/280 and foreign ownership refuse before transport while authentic Pāli remains readable',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No held or foreign source request');};
 for(const poem of [260,266,280]){const raw=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`,id='tha-ap'+(poem+2),u=canon.resolve(id).unit;assert.equal(isApadanaRawUrl(raw),false);await assert.rejects(fetchPublic(raw,{json:false}),/outside the supported public sources/);assert.equal(profile(id),undefined);await assert.rejects(english.translation(u,`ap:chapter-3/poem-${poem}`));const page=await readPassage({uid:id,translation:tid(profile('tha-ap283')),english:true,limit:2});assert.equal(page.english,null);assert.ok(page.pali.segments.length);}
 assert.equal(calls,0);
});

test('cold and warmed real source metadata continuations refuse drift without extra source requests or fallback',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);const data=canon.load();
 for(const id of e.ids){const p=profile(id),u=data.byId.get(id),link=data.translations[id].find(row=>canon.translationId(row)===tid(p)),original=clone(link),restore=()=>{for(const key of Object.keys(link))delete link[key];Object.assign(link,clone(original));};
  link.license='CC0';const cold=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500}));assert.equal(calls.length,cold);}finally{restore();}
  const first=await english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500});assert.ok(first.continue_with);assert.equal(first.body_sha256,e.independent(id).body_sha256);
  for(const patch of [{license:'CC0'},{path:'/text/chapter-3/poem-280/'},{raw_url:p.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))},{root_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{note_numbers:[999]},{mapping_notes:[]},{publisher_preface:{}},{chapter_summary:{}}]){Object.assign(link,patch);const count=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,count);}finally{restore();}}
  const next=first.continue_with.arguments,count=calls.length;await assert.rejects(english.translation(u,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,count);await assert.rejects(english.translation(u,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);assert.ok(calls.length-count<=1);assert.ok(calls.slice(count).every(uid=>uid===id));
 }
});
