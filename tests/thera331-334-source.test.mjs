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
import {readFileSync as readCurrent380MetadataFile} from 'node:fs';
requireMetadata380(APADANA_PROFILES,JSON.parse(readCurrent380MetadataFile(new URL('../server/data/apadana.json',import.meta.url))));
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readActualFileSync(path,...options){if(path==='server/data/apadana.json')return readOwnedHOrActualMetadataFile(path,...options);return readOwnedHOrActualMetadataFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
import {requireProfiles359,INTAKE359_PUBLISHERS} from './helpers/intake359-metadata.mjs';
import {normalize343Metadata,requireProfiles368,profilesForHistorical359,intake368Authority,INTAKE368_PUBLISHERS} from './helpers/intake368-metadata.mjs';
import test,{afterEach}from'node:test';
import assert from'node:assert/strict';
import {readFileSync as readOwnedHOrActualMetadataFile} from 'node:fs';
const {c1DataFileReader}=await import(new URL('tests/helpers/six-history-data.mjs',HistoricalHBase).href);
const readFileSync=c1DataFileReader(readActualFileSync);
import{join}from'node:path';
import*as canon from'../src/canon.mjs';
import*as english from'../src/english.mjs';
import{APADANA_PROFILES}from'../src/apadana-profiles.mjs';
import{parseApadana,quotationText}from'../src/apadana.mjs';
import{parseTheraApadana}from'../src/apadana-thera.mjs';
import{fetchPublic}from'../src/http.mjs';
import{isApadanaRawUrl}from'../src/apadana-profiles.mjs';
import{liveCache}from'../src/cache.mjs';
import{requiredCanonicalRevision}from'../src/locator-policy.mjs';
import{fourEnglishEvidence,decodeApproval,IDS,NUMBERS,REV,VRI,sha,objectSha}from'./helpers/thera331-334-evidence.mjs';
const e=fourEnglishEvidence(),originalFetch=globalThis.fetch,clone=structuredClone,tid=p=>canon.translationId(p);
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});
function transport(calls,mutate){
  liveCache.clear();globalThis.fetch=async(input,init={})=>{const url=typeof input==='string'?input:input.href,id=IDS.find(id=>e.profiles[id].raw_url===url);assert.ok(id,'Only the four exact official source URLs reach transport');assert.ok(!url.includes('SYNTHETIC_PRIVATE_343')&&!JSON.stringify(init).includes('SYNTHETIC_PRIVATE_343'));calls.push(id);return new Response(mutate?mutate(e.artifact(id),id):e.artifact(id));};
}
test('current359 preserves the complete343 metadata cohort and its historical339/source/locator assertions',()=>{
  const manifest=JSON.parse(readActualFileSync('server/data/apadana.json'));e.assertCatalogue(HistoricalH368Catalogue,HistoricalH368Profiles);
  for(const[path,pin]of Object.entries(e.compact.data_file_sha256))assert.equal(sha(readFileSync(path)),pin,path);
  assert.equal(Object.keys(e.compact.data_file_sha256).length,26);
  for(const id of IDS){assert.equal(APADANA_PROFILES[id].index_revision,'apadana-thera333-336-v1');assert.equal(requiredCanonicalRevision(id),VRI+'-apadana-thera333-336-v1');assert.ok(!e.approval.held_ids.includes(id));}
  for(const id of ['tha-ap107','tha-ap108'])assert.equal(requiredCanonicalRevision(id),VRI+'-apadana-thera105-106-v1');
});
test('all four pinned originals and six textual-rights records reproduce exact body paragraphs and note ownership',{skip:!e.checkout},()=>{
  for(const right of e.goldens.rights){const bytes=readFileSync(join(e.checkout,right.path));assert.equal(sha(bytes),right.sha256);assert.equal(bytes.length,right.bytes);}
  let bodyParagraphs=0,notes=0;
  for(const id of IDS){const value=parseApadana(e.artifact(id),e.profiles[id]);e.assertNormalized(id,value);bodyParagraphs+=value.text.split('\n\n').length;notes+=value.translator_notes.length+(value.publisher_preface?.translator_notes.length||0);}
  assert.deepEqual({bodyParagraphs,notes},{bodyParagraphs:48,notes:23});
});
test('all36 physical quotations retain words and combined entries without inventing31 absent local labels',{skip:!e.checkout},()=>{
  let entries=0,absent=0,combined=0;
  for(const id of IDS){const p=e.profiles[id],row=e.rows[id],value=parseApadana(e.artifact(id),p);e.assertNormalized(id,value);const quote=quotationText({...value,translation_id:tid(p)});assert.equal(sha(quote),row.quotation_text_sha256);assert.deepEqual(quote.split('\n\n').map(sha),row.quotation_proofs.map(q=>q.sha256));assert.ok(!quote.includes('[Note '));entries+=p.stanza_layout.length;absent+=p.stanza_layout.filter(s=>s.local_label===null).length;combined+=p.stanza_layout.filter(s=>s.lines===8).length;if(p.poem>=332){assert.ok(value.text.startsWith('{*'+p.poem+', BJTS only: '));assert.equal(sha(value.text.split('\n\n')[0]),p.publisher_heading_sha256);}}
  assert.deepEqual({entries,absent,combined},{entries:36,absent:31,combined:2});
});
test('genuine positives precede raw heading note boundary and forged profile corruption refusals',{skip:!e.checkout},()=>{
  for(const id of IDS){const p=e.profiles[id],raw=e.artifact(id);e.assertNormalized(id,parseApadana(raw,p));
    for(const changed of [raw+'\n',raw.replace('title: '+p.title,'title: Altered'),raw.replace('[^1]:','[^1]: Altered'),raw.replace('### ','### Invented\n\n'),raw.replace('category: chapter-3','category: chapter-4')]){assert.notEqual(sha(changed),sha(raw));assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:sha(changed)}));}
    for(const patch of [{license:'CC0'},{translation_revision:'0'.repeat(40)},{root_sha256:'0'.repeat(64)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{note_numbers:[1]},{stanza_layout:[]},{publisher_heading_sha256:'0'.repeat(64)},{index_revision:'unreviewed'},{publisher_preface:{}}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));
  }
});
test('actual source API follows14 exact500-character pages including the legitimate one-character final page',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);let pages=0;
  for(const id of IDS){const p=e.profiles[id],row=e.rows[id],unit=canon.resolve(id).unit;let options={translation_revision:REV,limit:500},body='',previousPrefix=sha('');
    for(const page of row.pages500){const value=await english.translation(unit,tid(p),options);assert.equal(value.text_id,id);assert.equal(value.translation_id,tid(p));assert.equal(value.translation_revision,REV);assert.equal(value.offset,page.offset);assert.equal(value.text.length,page.characters_utf16);assert.equal(sha(value.text),page.text_sha256);assert.equal(value.prefix_sha256,previousPrefix);assert.equal(objectSha(value.translator_notes),p.notes_sha256);assert.equal(sha(value.publisher_paratext),p.paratext_sha256);body+=value.text;pages++;
      if(page.next_offset===null)assert.equal(value.continue_with,null);else{assert.equal(value.continue_with.arguments.offset,page.next_offset);assert.equal(value.continue_with.arguments.prefix_sha256,page.prefix_sha256);assert.equal(value.continue_with.arguments.translation,tid(p));options=value.continue_with.arguments;}
      previousPrefix=page.prefix_sha256;
    }
    assert.equal(body.length,row.body_characters_utf16);assert.equal(sha(body),row.body_sha256);assert.equal(row.pages500.at(-1).characters_utf16,id==='tha-ap333'?1:row.pages500.at(-1).characters_utf16);
  }
  assert.equal(pages,14);assert.deepEqual([...new Set(calls)],IDS);
});
test('source and prefix drift never substitutes another version and altered rights refuse before transport',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);
  for(const id of IDS){const p=e.profiles[id],unit=canon.resolve(id).unit,first=await english.translation(unit,tid(p),{translation_revision:REV,limit:500}),next=first.continue_with.arguments;const before=calls.length;await assert.rejects(english.translation(unit,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,before);await assert.rejects(english.translation(unit,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);assert.equal(calls.at(-1),id);const value=await english.translation(unit,tid(p),next);assert.equal(value.offset,500);assert.equal(value.translation_id,tid(p));const link=canon.load().translations[id].find(v=>tid(v)===tid(p)),old=clone(link);try{link.license='CC0';const count=calls.length;await assert.rejects(english.translation(unit,tid(p),{translation_revision:REV}));assert.equal(calls.length,count);}finally{for(const key of Object.keys(link))delete link[key];Object.assign(link,old);}}
  transport([],raw=>raw+'\n');for(const id of IDS)await assert.rejects(english.translation(canon.resolve(id).unit,tid(e.profiles[id]),{translation_revision:REV,limit:500}));
});
test('prior source holds and unreviewed witness351 remain inactive outside the exact newly approved16',async()=>{
  requireProfiles368(HistoricalH368Profiles);
  const historical359Profiles=profilesForHistorical359(HistoricalH368Profiles);requireProfiles359(historical359Profiles);
  const currentNine=intake368Authority();
  for(const[id,profile]of Object.entries(currentNine.profiles)){assert.deepEqual(APADANA_PROFILES[id],profile);assert.equal(isApadanaRawUrl(profile.raw_url),true);}
  const historicalHeld=[70,140,158,159,...e.approval.explicitly_not_activated_publishers];
  assert.deepEqual(historicalHeld.filter(poem=>INTAKE359_PUBLISHERS.includes(poem)),[335]);
  const held=historicalHeld.map(poem=>poem===335?351:poem);
  assert.deepEqual(held.filter(poem=>poem!==351),historicalHeld.filter(poem=>poem!==335));
  assert.ok(!INTAKE359_PUBLISHERS.includes(351));
  assert.equal(historical359Profiles['tha-ap353'],undefined,'Publisher351 remains absent from the named359 stage');
  assert.deepEqual(held.filter(poem=>INTAKE368_PUBLISHERS.includes(poem)),[351]);
  // The original359 witness remains historically held, while current source
  // transport tests the independently unapproved358; all other holds persist.
  const currentHeld=held.map(poem=>poem===351?358:poem);
  assert.deepEqual(currentHeld.filter(poem=>poem!==358),held.filter(poem=>poem!==351));
  assert.deepEqual(currentNine.approval.source_holds_within_publisher351_360,['tha-ap360']);
  assert.ok(currentHeld.includes(358));assert.ok(!currentHeld.includes(351));
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unapproved source must not fetch');};assert.ok(!held.includes(331));assert.ok(held.includes(351));
  for(const n of currentHeld){const id=n===358?'tha-ap360':'tha-ap'+(n+2),url=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${REV}/src/_poems/chapter-3/poem-${n}.md`;assert.equal(APADANA_PROFILES[id],undefined);assert.equal(isApadanaRawUrl(url),false);await assert.rejects(fetchPublic(url,{json:false}));await assert.rejects(english.translation(canon.resolve(id).unit,`ap:chapter-3/poem-${n}`));}
  for(const id of IDS)assert.equal(isApadanaRawUrl(e.profiles[id].raw_url),true);const media=e.profiles[IDS[0]].raw_url.replace('.md','.mp3');assert.equal(isApadanaRawUrl(media),false);await assert.rejects(fetchPublic(media,{json:false}));assert.equal(calls,0);
});
test('immutable approval and full343 metadata reject same-count substitutions and missing previous objects',()=>{
  const bytes=readFileSync('docs/evidence/apadana/THERA_331_334_APPROVAL.json');decodeApproval(bytes);assert.throws(()=>decodeApproval(Buffer.concat([bytes,Buffer.from(' ')])));
  const currentProfiles=clone(HistoricalH368Profiles),currentManifest=clone(HistoricalH368Catalogue);e.assertCatalogue(currentManifest,currentProfiles);
  // Only the already guarded368→359 metadata is converted into this historical343
  // mutation fixture. Actual source/API responses above retain current data.
  const {profiles,catalogue:manifest}=normalize343Metadata(currentProfiles,currentManifest);
  e.assertCatalogue(manifest,profiles);
  const bad=clone(profiles);bad['tha-ap337']=bad['tha-ap336'];delete bad['tha-ap336'];assert.equal(Object.keys(bad).length,343);assert.throws(()=>e.assertProfiles(bad));
  const changed=clone(manifest);changed.links['tha-ap333'].license='CC0';assert.throws(()=>e.assertCatalogue(changed,profiles));delete profiles[e.compact.ids[0]];assert.throws(()=>e.assertProfiles(profiles));
});
