// Current375 app/API inputs remain actual R. Named H metadata below is source-derived, never an API projection.
import {intake375Authority,requireProfiles375,requireMetadata375,assertCurrent375SourceClosure} from './helpers/intake375-metadata.mjs';
assertCurrent375SourceClosure(new URL('../',import.meta.url));
const current375Source=intake375Authority();
const HistoricalH368Profiles=current375Source.baseline.profiles;
const HistoricalH368Catalogue={version:1,source:current375Source.baseline.manifest_source,vri_commit:current375Source.manifest.vri_commit,held:current375Source.baseline.manifest_held,links:current375Source.baseline.links};
requireProfiles375(APADANA_PROFILES);
import {readFileSync as readCurrent375MetadataFile} from 'node:fs';
requireMetadata375(APADANA_PROFILES,JSON.parse(readCurrent375MetadataFile(new URL('../server/data/apadana.json',import.meta.url))));
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readActualFileSync(path,...options){if(path==='server/data/apadana.json')return readOwnedHOrActualMetadataFile(path,...options);return readOwnedHOrActualMetadataFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
import {canonBeforeFour} from './helpers/canon-before-four.mjs';
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readOwnedHOrActualMetadataFile} from 'node:fs';
const {historical440DataReader}=await import(new URL('tests/helpers/four-history-data.mjs',HistoricalHBase).href);
const readFileSync=historical440DataReader(readActualFileSync);
import {join} from 'node:path';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT,isApadanaRawUrl} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,rootDigest} from '../src/apadana.mjs';
import {parseTheraApadana} from '../src/apadana-thera.mjs';
import {fetchPublic} from '../src/http.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {thera292299Evidence,digest,blob} from './helpers/thera292-299-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
import {projectPublisher333To325} from './helpers/thera333-legacy-projection.mjs';
const e=thera292299Evidence(),originalFetch=globalThis.fetch,clone=value=>JSON.parse(JSON.stringify(value));
const tid=p=>canon.translationId(p),profile=id=>APADANA_PROFILES[id],parsed=id=>parseApadana(e.artifact(id),profile(id));
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only exact seven pinned Markdown fixture URLs may reach transport');assert.ok(url.href.endsWith('.md'));calls.push(id);return new Response(e.artifact(id));};}

test('seven V2 approved profiles extend every preserved310 object and link to317 with finite counter projection and unchanged canonical/data identities',()=>{
 const data=canon.load(),manifest=JSON.parse(readFileSync('server/data/apadana.json'));
 assert.equal(APADANA_COMMIT,e.approval.publisher_revision);assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);assert.equal(current375Source.baseline.ids.length,368);assert.equal(CURRENT_APADANA_IDS.length,375);
 assert.equal(e.approval.expected_profile_ids.length,317);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,317),e.approval.expected_profile_ids);
 assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,317),e.approval.expected_profile_ids);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(317,325),['tha-ap303','tha-ap304','tha-ap305','tha-ap306','tha-ap307','tha-ap310','tha-ap311','tha-ap312']);assert.deepEqual(Object.keys(manifest.links),CURRENT_APADANA_IDS);
 assert.deepEqual(Object.keys(manifest.links).slice(0,317),e.approval.expected_profile_ids);
 for(const id of e.approval.baseline_ids){assert.deepEqual(profile(id),e.baseline.profile_objects[id]);assert.deepEqual(manifest.links[id],e.baseline.translation_objects[id]);assert.equal(digest(JSON.stringify(profile(id))),e.compact.profile_object_sha256[id]);assert.equal(digest(JSON.stringify(manifest.links[id])),e.compact.translation_object_sha256[id]);}
 const priorSource=clone(projectPublisher333To325(HistoricalH368Profiles,HistoricalH368Catalogue).catalogue.source);
 for(const[current,previous]of [['325 finite complete publisher-edition poems','317 finite complete publisher-edition poems'],['285 explicitly mapped Therā','277 explicitly mapped Therā']]){
  assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved latest policy counter '+current);
  priorSource.policy=priorSource.policy.replace(current,previous);
 }
for(const[current,previous]of [['317 finite complete publisher-edition poems','310 finite complete publisher-edition poems'],['277 explicitly mapped Therā','270 explicitly mapped Therā']]){assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved current counter '+current);priorSource.policy=priorSource.policy.replace(current,previous);}
 assert.equal(digest(JSON.stringify(priorSource)),e.compact.manifest_source_sha256,'Only the exact two approved counters may differ');let preserved=0;for(const[path,sha]of Object.entries(e.compact.data_file_sha256))if(path!=='server/data/apadana.json'){assert.equal(digest(readFileSync(path)),sha,'Unchanged prior data artifact '+path);preserved++;}assert.equal(preserved,26);
 assert.equal(digest(JSON.stringify(canonBeforeFour(data.canon))),e.baseline.canon_logical_sha256);assert.equal(data.canon.units.length,8544);assert.equal(data.canon.books.length,61);
 for(const id of e.ids){const p=profile(id),b=e.independent(id),u=data.byId.get(id);assert.deepEqual(p,e.profiles[id]);assert.deepEqual(manifest.links[id],e.links[id]);assert.equal(rootDigest(u,data.canon.books[u.book]),b.root_sha256);assert.deepEqual({start:u.start,end:u.end,book:u.book},{start:b.canonical.start,end:b.canonical.end,book:b.canonical.book});assert.ok(Object.isFrozen(p));}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282','tha-ap293','tha-ap299','tha-ap302'])assert.equal(profile(id),undefined);
 for(const[poem,notice]of Object.entries(e.noticeAdditions.by_publisher)){const p=profile('tha-ap'+(Number(poem)+2));assert.equal(p.mapping_notes.filter(row=>row===notice).length,1);assert.deepEqual(p.mapping_notes,e.profiles[p.id].mapping_notes);}
});

test('all seven complete originals and six rights/routing artifacts match independent source body notes paragraphs and UTF16 lengths before corruptions',{skip:!e.checkout},()=>{
 for(const item of e.bRights.rights_artifacts){const raw=readFileSync(join(e.checkout,item.path));assert.equal(raw.length,item.bytes);assert.equal(digest(raw),item.sha256);assert.equal(blob(raw),item.git_blob_sha1);}
 let paragraphs=0,entries=0,labels=0,notes=0;
 for(const id of e.ids){const value=parsed(id),b=e.independent(id);e.assertNormalized(id,value);paragraphs+=value.text.split('\n\n').length;entries+=b.stanza_layout.length;labels+=b.printed_local_labels.length;notes+=value.translator_notes.length;assert.equal(value.title,profile(id).title);assert.equal(value.publisher_paratext,'');}
 assert.deepEqual({paragraphs,entries,labels,notes},{paragraphs:52,entries:31,labels:32,notes:22});assert.deepEqual(e.ids.map(e.bodyLength),[874,1003,742,1014,702,693,569]);
});

test('all31 genuine quotation entries preserve compound296 and source punctuation while excluding headings notes colophons and chapter apparatus',{skip:!e.checkout},()=>{
 let eight=0;
 for(const id of e.ids){const p=profile(id),b=e.independent(id),value=parsed(id);e.assertNormalized(id,value);const quote=quotationText({...value,translation_id:tid(p)}),entries=quote.split('\n\n');assert.equal(digest(quote),b.quotation_text_sha256);assert.deepEqual(entries.map(digest),b.quotation_entry_sha256s);assert.deepEqual(entries.map(row=>row.length),b.quotation_entry_characters_utf16);assert.deepEqual(entries.map(row=>row.split('\n').length),b.stanza_layout.map(row=>row.lines));assert.ok(!/\[Note \d+\]/.test(quote));for(const paragraph of [value.text.split('\n\n')[0],...value.text.split('\n\n').slice(-2)])assert.ok(!quote.includes(paragraph));assert.equal(value.publisher_paratext,'');eight+=b.stanza_layout.filter(row=>row.lines===8).length;}
 assert.equal(eight,1);assert.deepEqual(profile('tha-ap298').stanza_layout[0],{local_label:'1-2',publisher_label:'2697-2698',suffix:'(1-2) [2697-2698]',lines:8});assert.equal(parsed('tha-ap298').text.split('\n\n')[1].split('\n').length,8);
});

test('294inline colon and anchored note coexist; original names punctuation display pair botanical caveats repeated identity and299body-note owners remain exact',{skip:!e.checkout},()=>{
 for(const id of e.ids)e.assertNormalized(id,parsed(id));
 const adjacent=parsed('tha-ap295');assert.match(adjacent.text,/\[Note 2\]\(2\) \[2682\]/);assert.match(adjacent.text,/Mahārahā/);assert.ok(profile('tha-ap295').mapping_notes.includes(e.noticeAdditions.by_publisher['293']));
 const sound=parsed('tha-ap296'),raw=e.artifact('tha-ap296');assert.match(sound.text,/\[Note 2\]:/);assert.equal((raw.match(/^\[\^2\]: /gm)||[]).length,1);assert.equal(sound.translator_notes.length,3);assert.equal(sound.translator_notes[2].text,'lit., “and,” ca');assert.ok(!sound.translator_notes[2].text.includes('data-state'));assert.equal(e.independent('tha-ap296').source_specials.inline_note_colon.inline_is_definition,false);
 const wood=parsed('tha-ap297');assert.ok(wood.translator_notes[4].text.startsWith('“'));assert.ok(wood.translator_notes[4].text.endsWith('"'));assert.match(wood.translator_notes[2].text,/\u014b/);assert.ok(!/[.!?] \(3\) \[2693\]/.test(wood.text));
 const feet=parsed('tha-ap298');assert.match(feet.translator_notes[2].text,/xxx/);assert.match(feet.translator_notes[3].text,/tuvaralā/);assert.match(feet.translator_notes[3].text,/frankincense/);assert.ok(profile('tha-ap298').mapping_notes.includes(e.noticeAdditions.by_publisher['296']));const u=canon.resolve('tha-ap298').unit,blocks=canon.load().canon.books[u.book].blocks.slice(u.start,u.end);assert.ok(blocks.some(row=>row[2].includes('pītaraṃsiṃva')));assert.ok(blocks.some(row=>row[2].includes('tagarañcāpi')));
 const refuge=e.independent('tha-ap300').source_specials.repeated_title_context;assert.deepEqual(refuge.filter(row=>row.all_narrative_anchors).map(row=>row.id),['tha-ap300']);assert.ok(refuge.length>1);
 const mango=parsed('tha-ap301'),paragraphs=mango.text.split('\n\n');assert.ok(!paragraphs[0].includes('[Note '));assert.ok(paragraphs[1].includes('[Note 1]'));assert.ok(paragraphs[1].includes('[Note 2]'));assert.match(mango.translator_notes[1].text,/uncertain meaning/);assert.deepEqual(e.independent('tha-ap301').title_note_numbers,[]);assert.deepEqual(e.independent('tha-ap301').note_text_sha256s.map(row=>row.owner.physical_stanza_entry),[1,1]);
});

test('actual raw identity note-colon ownership punctuation compound boundary and forged source-hash corruptions refuse after genuine seven positives',{skip:!e.checkout},()=>{
 for(const id of e.ids){const p=profile(id),raw=e.artifact(id);e.assertNormalized(id,parsed(id));const definition=raw.match(/\[\^1\]: [\s\S]*?(?=\n\n\[\^2\]: |$)/)[0],other=e.ids.find(other=>other!==id),heading=raw.match(/^### .*$/m)[0];
  const changes=[raw+'\n',raw.replace('### ','### x'),raw.replace('order: '+p.poem,'order: 280'),raw.replace('category: chapter-3','category: chapter-4'),raw.replace('[^1]: ','[^1]: x'),raw.replace('[^1]: ','[^2]: '),raw.replace(definition,'').replace('### ',definition+'\n\n### '),raw.replace('\\['+p.stanza_layout[0].publisher_label+'\\]','\\[9999\\]'),raw.replace('### ','## Foreign chapter heading\n\n### ')];
  if(p.poem===299)changes.push(raw.replace('[^1]','').replace(heading,heading.replace('Ambapiṇḍiya','Ambapiṇḍiya[^1]')));else changes.push(raw.replace('[^1]','').replace('(1','[^1] (1'));
  if(p.poem===293)changes.push(raw.replace('[^2](2)','[^2] (2)'),raw.replace('Mahārahā','Mahāraha'));
  if(p.poem===294)changes.push(raw.replace('[^2]:','[^2]'),raw.replace('data-state=on','data-state=off'));
  if(p.poem===295){const d5=raw.match(/^\[\^5\]:.*$/m)[0];changes.push(raw.replace(d5,d5.replace(/"$/,'”')));}
  if(p.poem===296){const entry=raw.split('\n\n').find(row=>row.includes('(1-2)')),lines=entry.split('\n');changes.push(raw.replace(entry,lines.slice(0,4).join('\n')+'\n\n'+lines.slice(4).join('\n')),raw.replace('xxx',''),raw.replace('frankincense','incense'));}
  for(const changed of changes){assert.notEqual(changed,raw,id+' meaningful source mutation');assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:digest(changed)}));}
  for(const patch of [{id:other},{poem:291},{path:'/text/chapter-3/poem-291/'},{translation_revision:'0'.repeat(40)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{root_sha256:'0'.repeat(64)},{note_numbers:[999]},{stanza_layout:[]},{publisher_preface:{}},{chapter_summary:{}}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));
 }
});

test('held291/297/300 and earlier260/266/280 plus media refuse before transport while authentic Pāli remains readable',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No held source or media request');};
 for(const poem of [260,266,280,291,297,300]){const raw=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`,id='tha-ap'+(poem+2),u=canon.resolve(id).unit;assert.equal(isApadanaRawUrl(raw),false);await assert.rejects(fetchPublic(raw,{json:false}),/outside the supported public sources/);assert.equal(profile(id),undefined);await assert.rejects(english.translation(u,`ap:chapter-3/poem-${poem}`));const page=await readPassage({uid:id,translation:tid(profile('tha-ap294')),english:true,limit:2});assert.equal(page.english,null);assert.ok(page.pali.segments.length);}
 const media=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-296.mp3`;assert.equal(isApadanaRawUrl(media),false);await assert.rejects(fetchPublic(media,{json:false}),/outside the supported public sources/);assert.equal(calls,0);
});

test('cold and warmed metadata and genuine source-bound continuations refuse drift without extra source requests or fallback',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);const data=canon.load();
 for(const id of e.ids){const p=profile(id),u=data.byId.get(id),link=data.translations[id].find(row=>canon.translationId(row)===tid(p)),original=clone(link),restore=()=>{for(const key of Object.keys(link))delete link[key];Object.assign(link,clone(original));};
  link.license='CC0';const cold=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500}));assert.equal(calls.length,cold);}finally{restore();}
  const first=await english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500});assert.equal(first.body_sha256,e.independent(id).body_sha256);assert.equal(first.total_characters,e.bodyLength(id));assert.equal(Boolean(first.continue_with),e.bodyLength(id)>500);
  for(const patch of [{license:'CC0'},{path:'/text/chapter-3/poem-291/'},{raw_url:p.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))},{root_sha256:'0'.repeat(64)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{paratext_sha256:'0'.repeat(64)},{translation_revision:'0'.repeat(40)},{note_numbers:[999]},{mapping_notes:[]},{publisher_preface:{}},{chapter_summary:{}}]){Object.assign(link,patch);const count=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,count);}finally{restore();}}
  if(first.continue_with){const next=first.continue_with.arguments,count=calls.length;await assert.rejects(english.translation(u,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,count);await assert.rejects(english.translation(u,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);assert.ok(calls.length-count<=1);assert.ok(calls.slice(count).every(uid=>uid===id));}else assert.equal(digest(first.text),e.independent(id).body_sha256);
 }
});
