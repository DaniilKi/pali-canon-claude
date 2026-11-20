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
import {thera261280Evidence,digest,blob} from './helpers/thera261-280-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const e=thera261280Evidence(),originalFetch=globalThis.fetch,clone=value=>JSON.parse(JSON.stringify(value));
const tid=p=>canon.translationId(p),profile=id=>APADANA_PROFILES[id],parsed=id=>parseApadana(e.artifact(id),profile(id));
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only exact18 immutable fixture URLs may reach transport');calls.push(id);return new Response(e.artifact(id));};}

test('exact independently approved18 extend the preserved285 to303 with unchanged canonical identities and rights',()=>{
 assert.equal(APADANA_COMMIT,e.approval.publisher_revision);assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);assert.equal(CURRENT_APADANA_IDS.length,308);
 assert.equal(e.approval.expected_profile_ids.length,303);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,303),e.approval.expected_profile_ids);
 assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,303),e.approval.expected_profile_ids);
 const data=canon.load(),manifest=JSON.parse(readFileSync('server/data/apadana.json'));
 assert.deepEqual(Object.keys(manifest.links),CURRENT_APADANA_IDS);
 assert.deepEqual(Object.keys(manifest.links).slice(0,303),e.approval.expected_profile_ids);
 for(const id of e.approval.baseline_ids){assert.deepEqual(profile(id),e.baseline.profile_objects[id]);assert.deepEqual(manifest.links[id],e.baseline.translation_objects[id]);}
 assert.equal(digest(JSON.stringify(data.canon)),e.baseline.canon_logical_sha256);assert.equal(data.canon.units.length,8544);assert.equal(data.canon.books.length,61);
 for(const id of e.ids){const p=profile(id),b=e.independent(id),u=data.byId.get(id);assert.deepEqual(p,e.profiles[id]);assert.deepEqual(manifest.links[id],e.links[id]);assert.equal(rootDigest(u,data.canon.books[u.book]),b.root_sha256);assert.equal(u.index_revision,undefined);assert.ok(Object.isFrozen(p));}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282'])assert.equal(profile(id),undefined);
 assert.ok(profile('tha-ap266'));assert.ok(profile('tha-ap280'));
 assert.match(e.rights[0].application_policy,/live-only/);assert.equal(e.rights[0].specific_grant_over_generic_siteCCBY,true);assert.equal(e.rights[0].media_audio_fonts_images_rights_approved,false);
});

test('all18 actual pinned originals and notices match both independent normalization authorities before mutations',{skip:!e.checkout},()=>{
 const artifacts=new Map();for(const packet of e.packets)for(const item of [...packet.rights,packet.publisher_routing]){if(artifacts.has(item.path))assert.deepEqual(artifacts.get(item.path),item);artifacts.set(item.path,item);}
 assert.equal(artifacts.size,6);for(const item of artifacts.values()){const raw=readFileSync(join(e.checkout,item.path));assert.equal(raw.length,item.bytes);assert.equal(digest(raw),item.raw_sha256);assert.equal(blob(raw),item.git_blob_sha1);}
 let paragraphs=0,entries=0,labels=0,notes=0;
 for(const id of e.ids){const value=parsed(id),b=e.independent(id),g=e.golden(id);e.assertNormalized(id,value);paragraphs+=value.text.split('\n\n').length;entries+=b.stanza_layout.length;labels+=b.printed_local_labels.length;notes+=value.translator_notes.length;assert.equal(value.text.split('\n\n').length,g.normalized_body_paragraph_count);assert.equal(value.translator_notes.length,g.original_note_count);assert.deepEqual(b.note_text_sha256s.map(row=>row.number),g.notes.map(row=>row.number));}
 assert.deepEqual({paragraphs,entries,labels,notes},{paragraphs:129,entries:75,labels:76,notes:59});
});

test('two chapter headings remain note-free paratext while title-note1 and literal edition typography remain poem-owned',{skip:!e.checkout},()=>{
 for(const id of e.ids){const value=parsed(id),g=e.golden(id),b=e.independent(id);e.assertNormalized(id,value);assert.equal(g.publisher_preface.kind,'publisher_chapter_heading_audit_only');assert.equal(g.publisher_preface.runtime_publisher_preface_descriptor,false);assert.equal(Object.hasOwn(value,'publisher_preface'),false);assert.deepEqual(g.publisher_preface.note_numbers,[]);assert.equal(Boolean(value.publisher_paratext),['tha-ap263','tha-ap273'].includes(id));assert.equal(b.preface.runtime_prose_preface_descriptor,false);}
 const first=parsed('tha-ap263');assert.ok(first.text.split('\n\n')[0].includes('[Note 1]'));assert.ok(!first.publisher_paratext.includes('[Note '));assert.equal(first.translator_notes[0].number,1);
 assert.equal(digest(first.publisher_paratext),e.independent('tha-ap263').preface.body_sha256);assert.equal(first.publisher_paratext.split('\n').length,1);
 assert.ok(parsed('tha-ap266').text.includes('no know'));assert.ok(parsed('tha-ap269').text.includes('\u014b'));assert.ok(profile('tha-ap269').title.includes('\u014b'));
});

test('combined274 local1–2 stays one eight-line entry and quotations exclude all headings colophons notes and apparatus',{skip:!e.checkout},()=>{
 for(const id of e.ids){const value=parsed(id),b=e.independent(id),p=profile(id),quote=quotationText({...value,translation_id:tid(p)});e.assertNormalized(id,value);assert.equal(digest(quote),b.quotation_text_sha256);assert.equal(quote.split('\n\n').length,p.stanza_layout.length);assert.ok(!/\[Note \d+\]/.test(quote));const paragraphs=value.text.split('\n\n');assert.ok(!quote.includes(paragraphs[0]));for(const end of paragraphs.slice(-2))assert.ok(!quote.includes(end));if(value.chapter_summary)assert.ok(!quote.includes(value.chapter_summary.text));if(value.publisher_paratext)assert.ok(!quote.includes(value.publisher_paratext));}
 const p=profile('tha-ap276'),value=parsed(p.id);assert.deepEqual(p.stanza_layout[0],{local_label:'1-2',publisher_label:'2595-2596',suffix:'(1-2) [2595-2596]',lines:8});assert.equal(value.text.split('\n\n')[1].split('\n').length,8);assert.equal(p.stanza_layout.length,4);
});

test('270 summary keeps original41 versus42 and held266 scope outside poem words and complete-chapter claims',{skip:!e.checkout},()=>{
 const id='tha-ap272',p=profile(id),value=parsed(id),g=e.golden(id),b=e.independent(id);e.assertNormalized(id,value);
 assert.equal(g.chapter_summary.publisher_stated_total,41);assert.equal(g.chapter_summary.vri_stated_total,41);assert.equal(g.chapter_summary.actual_vri_numbered_stanzas,42);assert.equal(g.chapter_summary.full_publisher_local_label_occurrences,42);assert.equal(g.chapter_summary.approved_subset_entries,39);assert.equal(g.chapter_summary.held_publisher_poem,266);
 assert.equal(b.chapter_summary.whole_chapter_english_approval,false);assert.equal(b.chapter_summary.approved_chapter_subset_labels,39);
 assert.deepEqual([p.chapter_summary.root_start,p.chapter_summary.root_end],[8545,8550]);assert.deepEqual([p.chapter_summary.first_ref,p.chapter_summary.last_ref],['tha-ap272/8','tha-ap272/10']);
 assert.deepEqual(value.chapter_summary.text.split('\n\n').map(digest),b.chapter_summary.paragraph_sha256s);assert.deepEqual(value.chapter_summary.text.split('\n\n').map(s=>s.split('\n').length),[1,6,1]);assert.deepEqual(value.chapter_summary.translator_notes,[]);assert.match(p.mapping_notes.join(' '),/41/);assert.match(p.mapping_notes.join(' '),/42/);assert.match(p.mapping_notes.join(' '),/excluded publisher266/);
});

test('real raw body note numbering pair and scope corruptions refuse even with forged raw hashes',{skip:!e.checkout},()=>{
 for(const id of e.ids){const p=profile(id),raw=e.artifact(id);e.assertNormalized(id,parsed(id));
  const definition=raw.match(/\[\^1\]: [\s\S]*?(?=\n\n\[\^2\]: |$)/)[0];
  const changes=[raw+'\n',raw.replace('### ','### x'),raw.replace('[^1]: ','[^1]: x'),raw.replace('[^1]: ','[^2]: '),raw.replace('category: chapter-3','category: chapter-4'),raw.replace(definition,'').replace('### ',definition+'\n\n### '),raw.replace('\\['+p.stanza_layout[0].publisher_label+'\\]','\\[9999\\]')];
  if(/data-state=on/.test(raw))changes.push(raw.replace('data-state=on','data-state=off'));if(/data-state="on"/.test(raw))changes.push(raw.replace('data-state="on"','data-state="off"'));
  if(id==='tha-ap272')changes.push(raw.replace('The Summary:','The summary:'),raw.replace('forty plus one','forty plus two'));
  for(const changed of changes){assert.notEqual(changed,raw,id+' negative actually changes source');assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:digest(changed)}));}
  for(const patch of [{id:'tha-ap282'},{poem:280},{path:'/text/chapter-3/poem-280/'},{translation_revision:'0'.repeat(40)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{root_sha256:'0'.repeat(64)},{note_numbers:[999]},{stanza_layout:[]},{publisher_preface:{}},{chapter_summary:p.chapter_summary?undefined:{}}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));
 }
});

test('held260 266 and280 refuse before transport and same-title280 never borrows270 English',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No held or foreign source request');};
 for(const poem of [260,266,280]){const raw=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`;assert.equal(isApadanaRawUrl(raw),false);await assert.rejects(fetchPublic(raw,{json:false}),/outside the supported public sources/);const id='tha-ap'+(poem+2),u=canon.resolve(id).unit;assert.equal(profile(id),undefined);await assert.rejects(english.translation(u,`ap:chapter-3/poem-${poem}`));}
 const bridge=canon.resolve('tha-ap282').unit,river=profile('tha-ap272');await assert.rejects(english.translation(bridge,tid(river)));
 const page=await readPassage({uid:'tha-ap282',translation:tid(river),english:true,limit:2});assert.equal(page.english,null);assert.ok(page.pali.segments.length);assert.ok(page.english_error||page.english_available.length===0);assert.equal(calls,0);
});

test('cold and warmed metadata plus source-bound continuations refuse drift without extra fetch or fallback',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);const data=canon.load();
 for(const id of e.ids){const p=profile(id),u=data.byId.get(id),link=data.translations[id].find(row=>canon.translationId(row)===tid(p)),original=clone(link);
  link.license='CC0';const cold=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500}));assert.equal(calls.length,cold);}finally{for(const key of Object.keys(link))delete link[key];Object.assign(link,clone(original));}
  const first=await english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500});assert.ok(first.continue_with);assert.equal(first.body_sha256,e.independent(id).body_sha256);
  for(const patch of [{license:'CC0'},{path:'/text/chapter-3/poem-280/'},{raw_url:p.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))},{root_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{note_numbers:[999]},{mapping_notes:[]},{chapter_summary:p.chapter_summary?null:{}}]){Object.assign(link,patch);const count=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,count);}finally{for(const key of Object.keys(link))delete link[key];Object.assign(link,clone(original));}}
  const next=first.continue_with.arguments,count=calls.length;await assert.rejects(english.translation(u,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,count);await assert.rejects(english.translation(u,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);assert.ok(calls.length-count<=1);assert.ok(calls.slice(count).every(uid=>uid===id));
 }
});
