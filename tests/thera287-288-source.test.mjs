import {INTAKE382_IDS} from './helpers/intake382-metadata.mjs';
import {historicalF3SourceFixtureFromOwnedH} from './helpers/historical389390-source-canon.mjs';
// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority} from './helpers/intake380-metadata.mjs';
import {requireProfiles382 as requireProfiles380,requireMetadata382 as requireMetadata380} from './helpers/intake382-metadata.mjs';
import {assertCurrent382SourceClosure as assertCurrent389390SourceClosure} from './helpers/intake382-metadata.mjs';
assertCurrent389390SourceClosure(new URL('../',import.meta.url));
const current380Source=intake380Authority();
assert.equal(current380Source.historical375.ids.length,375);assert.deepEqual(current380Source.ids.slice(0,375),current380Source.historical375.ids);
const HistoricalH368Profiles=current380Source.historical368.profiles;
const HistoricalH368Catalogue={version:1,source:current380Source.historical368.manifest_source,vri_commit:current380Source.manifest.vri_commit,held:current380Source.historical368.manifest_held,links:current380Source.historical368.links};
requireProfiles380(APADANA_PROFILES);
import {readFileSync as readCurrent380MetadataFile} from 'node:fs';
requireMetadata380(APADANA_PROFILES,JSON.parse(readCurrent380MetadataFile(new URL('../server/data/apadana.json',import.meta.url))));
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL,fileURLToPath as actualRFilePath} from 'node:url';
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
import {thera287288Evidence,digest,blob} from './helpers/thera287-288-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
import {projectPublisher333To325} from './helpers/thera333-legacy-projection.mjs';
// Keep only the declared publisher checkout at actual R before rights reads enter the owned-H metadata reader.
function publisherEvidenceAtActualR(value){return {...value,checkout:value.checkout?resolveHistoricalHInput(actualRFilePath(new URL('../',import.meta.url)),value.checkout):value.checkout};}
const e=publisherEvidenceAtActualR(thera287288Evidence()),originalFetch=globalThis.fetch,clone=value=>JSON.parse(JSON.stringify(value));
const tid=p=>canon.translationId(p),profile=id=>APADANA_PROFILES[id],parsed=id=>parseApadana(e.artifact(id),profile(id));
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only exact two immutable Markdown fixture URLs may reach transport');assert.ok(url.href.endsWith('.md'));calls.push(id);return new Response(e.artifact(id));};}

test('exact two approved profiles extend every preserved308 object and link to310 with finite counter projection and unchanged canonical/data identities',()=>{
 const data=canon.load(),manifest=JSON.parse(readFileSync('server/data/apadana.json'));
 assert.equal(APADANA_COMMIT,e.approval.publisher_revision);assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);assert.equal(current380Source.historical368.ids.length,368);assert.equal(current380Source.ids.length,380);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,380),current380Source.ids);assert.deepEqual(CURRENT_APADANA_IDS.slice(380),INTAKE382_IDS);assert.equal(CURRENT_APADANA_IDS.length,382);
 assert.equal(e.approval.expected_profile_ids.length,310);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,310),e.approval.expected_profile_ids);
 assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,310),e.approval.expected_profile_ids);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(310,317),['tha-ap294','tha-ap295','tha-ap296','tha-ap297','tha-ap298','tha-ap300','tha-ap301']);
 assert.deepEqual(CURRENT_APADANA_IDS.slice(317,325),['tha-ap303','tha-ap304','tha-ap305','tha-ap306','tha-ap307','tha-ap310','tha-ap311','tha-ap312']);assert.deepEqual(Object.keys(manifest.links),CURRENT_APADANA_IDS);
 assert.deepEqual(Object.keys(manifest.links).slice(0,310),e.approval.expected_profile_ids);
 for(const id of e.approval.baseline_ids){assert.deepEqual(profile(id),e.baseline.profile_objects[id]);assert.deepEqual(manifest.links[id],e.baseline.translation_objects[id]);assert.equal(digest(JSON.stringify(profile(id))),e.compact.profile_object_sha256[id]);assert.equal(digest(JSON.stringify(manifest.links[id])),e.compact.translation_object_sha256[id]);}
 const priorSource=clone(projectPublisher333To325(HistoricalH368Profiles,HistoricalH368Catalogue).catalogue.source);
 for(const[current,previous]of [['325 finite complete publisher-edition poems','317 finite complete publisher-edition poems'],['285 explicitly mapped Therā','277 explicitly mapped Therā']]){
  assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved latest policy counter '+current);
  priorSource.policy=priorSource.policy.replace(current,previous);
 }
 for(const[current,previous]of [['317 finite complete publisher-edition poems','310 finite complete publisher-edition poems'],['277 explicitly mapped Therā','270 explicitly mapped Therā']]){
  assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved latest policy counter '+current);
  priorSource.policy=priorSource.policy.replace(current,previous);
 }
for(const[current,previous]of [['310 finite complete publisher-edition poems','308 finite complete publisher-edition poems'],['270 explicitly mapped Therā','268 explicitly mapped Therā']]){assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved current counter '+current);priorSource.policy=priorSource.policy.replace(current,previous);}
 assert.equal(digest(JSON.stringify(priorSource)),e.compact.manifest_source_sha256,'All source fields/rights/notices except exact two counters remain unchanged');let preserved=0;for(const[path,sha]of Object.entries(e.compact.data_file_sha256))if(path!=='server/data/apadana.json'){assert.equal(digest(readFileSync(path)),sha,'Unchanged prior data artifact '+path);preserved++;}assert.equal(preserved,26);
 assert.equal(digest(JSON.stringify(canonBeforeFour(historicalF3SourceFixtureFromOwnedH(data.canon, HistoricalHBase)))),e.baseline.canon_logical_sha256);assert.equal(data.canon.units.length,8544);assert.equal(data.canon.books.length,61);
 for(const id of e.ids){const p=profile(id),b=e.independent(id),u=data.byId.get(id);assert.deepEqual(p,e.profiles[id]);assert.deepEqual(manifest.links[id],e.links[id]);assert.equal(rootDigest(u,data.canon.books[u.book]),b.root_sha256);assert.deepEqual({start:u.start,end:u.end,book:u.book},{start:b.canonical.start,end:b.canonical.end,book:b.canonical.book});assert.ok(Object.isFrozen(p));}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282'])assert.equal(profile(id),undefined);assert.ok(profile('tha-ap266'));assert.ok(profile('tha-ap280'));
});

test('both complete original poems and all six rights/routing artifacts match independently sealed source body notes and paragraph pins before corruptions',{skip:!e.checkout},()=>{
 for(const item of e.bRights.rights_artifacts){const raw=readFileSync(join(e.checkout,item.path));assert.equal(raw.length,item.bytes);assert.equal(digest(raw),item.sha256);assert.equal(blob(raw),item.git_blob_sha1);}
 let paragraphs=0,entries=0,labels=0,notes=0;
 for(const id of e.ids){const value=parsed(id),b=e.independent(id);e.assertNormalized(id,value);paragraphs+=value.text.split('\n\n').length;entries+=b.stanza_layout.length;labels+=b.printed_local_labels.length;notes+=value.translator_notes.length;assert.equal(value.title,profile(id).title);assert.deepEqual(b.stanza_layout.map(row=>row.lines),Array(b.stanza_layout.length).fill(4));}
 assert.deepEqual({paragraphs,entries,labels,notes},{paragraphs:14,entries:8,labels:8,notes:8});
});

test('all eight four-line quotation entries preserve boundaries and exclude title notes colophons empty paratext and audio frontmatter',{skip:!e.checkout},()=>{
 for(const id of e.ids){const p=profile(id),b=e.independent(id),value=parsed(id);e.assertNormalized(id,value);const quote=quotationText({...value,translation_id:tid(p)}),entries=quote.split('\n\n');assert.equal(digest(quote),b.quotation_text_sha256);assert.deepEqual(entries.map(digest),b.quotation_entry_sha256s);assert.deepEqual(entries.map(row=>row.split('\n').length),Array(b.stanza_layout.length).fill(4));assert.ok(!/\[Note \d+\]/.test(quote));for(const paragraph of [value.text.split('\n\n')[0],...value.text.split('\n\n').slice(-2)])assert.ok(!quote.includes(paragraph));assert.equal(value.publisher_paratext,'');assert.ok(!/poem-287\.mp3|audio:|reciter:/.test(quote));}
});

test('audio metadata grants no media capability and all seven288 notes retain family-reference ambiguity and original source spellings',{skip:!e.checkout},()=>{
 for(const id of e.ids){const value=parsed(id);e.assertNormalized(id,value);assert.equal(value.publisher_paratext,'');assert.equal(Object.hasOwn(value,'publisher_preface'),false);assert.equal(Object.hasOwn(value,'chapter_summary'),false);}
 const raw=e.artifact('tha-ap289'),praise=parsed('tha-ap289');assert.match(raw,/audio:\n  file: poem-287\.mp3\n/);assert.equal(e.golden('tha-ap289').original_audio_frontmatter_present,true);assert.equal(e.golden('tha-ap289').audio_or_media_rights_approval,false);assert.equal(praise.translator_notes.length,1);assert.match(praise.text,/ninety-two/);assert.ok(!JSON.stringify(praise).includes('poem-287.mp3'));
 const renouncer=parsed('tha-ap290');assert.equal(renouncer.translator_notes.length,7);assert.match(renouncer.translator_notes[3].text,/might also/);assert.match(renouncer.translator_notes[3].text,/family/);assert.equal(digest(renouncer.translator_notes[3].text),e.independent('tha-ap290').note_text_sha256s[3].sha256);assert.match(renouncer.translator_notes[2].text,/vyasana/);assert.match(renouncer.text,/sixty-seventh/);assert.match(renouncer.text,/Sunikkhama/);
 const u=canon.resolve('tha-ap290').unit,blocks=canon.load().canon.books[u.book].blocks.slice(u.start,u.end);assert.ok(blocks.some(row=>row[2].includes('Byasanaṃ')));assert.ok(blocks.some(row=>row[2].includes('Sunikkhamāti')));assert.ok(blocks.every(row=>row[3].length===0));
});

test('actual changed raw identity order notes ownership empty paratext and forged raw hashes refuse after both authentic positives',{skip:!e.checkout},()=>{
 for(const id of e.ids){const p=profile(id),raw=e.artifact(id);e.assertNormalized(id,parsed(id));const definition=raw.match(/\[\^1\]: [\s\S]*?(?=\n\n\[\^2\]: |$)/)[0],other=e.ids.find(other=>other!==id);
  const changes=[raw+'\n',raw.replace('### ','### x'),raw.replace('order: '+p.poem,'order: 280'),raw.replace('category: chapter-3','category: chapter-4'),raw.replace('[^1]: ','[^1]: x'),raw.replace('[^1]: ','[^2]: '),raw.replace(definition,'').replace('### ',definition+'\n\n### '),raw.replace('[^1]','').replace('(1','[^1] (1'),raw.replace('\\['+p.stanza_layout[0].publisher_label+'\\]','\\[9999\\]'),raw.replace('### ','## Foreign chapter heading\n\n### ')];
  if(p.poem===287)changes.push(raw.replace('file: poem-287.mp3','file: changed.mp3'));else changes.push(raw.replace('might also','must only'),raw.replace('Sunikkhama','Sunikkhamā'));
  for(const changed of changes){assert.notEqual(changed,raw,id+' meaningful source mutation');assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:digest(changed)}));}
  for(const patch of [{id:other},{poem:280},{path:'/text/chapter-3/poem-280/'},{translation_revision:'0'.repeat(40)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{root_sha256:'0'.repeat(64)},{note_numbers:[999]},{stanza_layout:[]},{publisher_preface:{}},{chapter_summary:{}}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));
 }
});

test('held260/266/280 and unapproved media refuse before transport while authentic Pāli remains readable',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No held source or audio request');};
 for(const poem of [260,266,280]){const raw=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`,id='tha-ap'+(poem+2),u=canon.resolve(id).unit;assert.equal(isApadanaRawUrl(raw),false);await assert.rejects(fetchPublic(raw,{json:false}),/outside the supported public sources/);assert.equal(profile(id),undefined);await assert.rejects(english.translation(u,`ap:chapter-3/poem-${poem}`));const page=await readPassage({uid:id,translation:tid(profile('tha-ap289')),english:true,limit:2});assert.equal(page.english,null);assert.ok(page.pali.segments.length);}
 const audio=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-287.mp3`;assert.equal(isApadanaRawUrl(audio),false);await assert.rejects(fetchPublic(audio,{json:false}),/outside the supported public sources/);assert.equal(calls,0);
});

test('cold and warmed source metadata and genuine continuations refuse drift without extra fetches or fallback',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);const data=canon.load();
 for(const id of e.ids){const p=profile(id),u=data.byId.get(id),link=data.translations[id].find(row=>canon.translationId(row)===tid(p)),original=clone(link),restore=()=>{for(const key of Object.keys(link))delete link[key];Object.assign(link,clone(original));};
  link.license='CC0';const cold=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500}));assert.equal(calls.length,cold);}finally{restore();}
  const first=await english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500});assert.equal(first.body_sha256,e.independent(id).body_sha256);assert.equal(first.total_characters,e.bodyLength(id));assert.equal(Boolean(first.continue_with),e.bodyLength(id)>500);
  for(const patch of [{license:'CC0'},{path:'/text/chapter-3/poem-280/'},{raw_url:p.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))},{root_sha256:'0'.repeat(64)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{paratext_sha256:'0'.repeat(64)},{translation_revision:'0'.repeat(40)},{note_numbers:[999]},{mapping_notes:[]},{publisher_preface:{}},{chapter_summary:{}}]){Object.assign(link,patch);const count=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,count);}finally{restore();}}
  if(first.continue_with){const next=first.continue_with.arguments,count=calls.length;await assert.rejects(english.translation(u,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,count);await assert.rejects(english.translation(u,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);assert.ok(calls.length-count<=1);assert.ok(calls.slice(count).every(uid=>uid===id));}else assert.equal(digest(first.text),e.independent(id).body_sha256);
 }
});
