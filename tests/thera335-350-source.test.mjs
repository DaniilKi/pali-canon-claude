// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority,requireProfiles380,requireMetadata380} from './helpers/intake380-metadata.mjs';
import {assertCurrent389390SourceClosure} from './helpers/current389390-metadata.mjs';
assertCurrent389390SourceClosure(new URL('../',import.meta.url));
const current380Source=intake380Authority();
assert.equal(current380Source.historical375.ids.length,375);assert.deepEqual(current380Source.ids.slice(0,375),current380Source.historical375.ids);
const HistoricalH368Profiles=current380Source.historical368.profiles;
const HistoricalH368Catalogue={version:1,source:current380Source.historical368.manifest_source,vri_commit:current380Source.manifest.vri_commit,held:current380Source.historical368.manifest_held,links:current380Source.historical368.links};
requireProfiles380(ACTUAL_APADANA_PROFILES);
import {readFileSync as readCurrent380MetadataFile} from 'node:fs';
requireMetadata380(ACTUAL_APADANA_PROFILES,JSON.parse(readCurrent380MetadataFile(new URL('../server/data/apadana.json',import.meta.url))));
/** Focused original-source/API checks. Expected content is independently sealed, never parser output. */
import test,{afterEach}from'node:test';
import assert from'node:assert/strict';
import {readFileSync}from'node:fs';
import {join}from'node:path';
import*as canon from'../src/canon.mjs';
import*as english from'../src/english.mjs';
import{APADANA_PROFILES as ACTUAL_APADANA_PROFILES,isApadanaRawUrl}from'../src/apadana-profiles.mjs';
import{parseApadana,quotationText}from'../src/apadana.mjs';
import{parseTheraApadana}from'../src/apadana-thera.mjs';
import{fetchPublic}from'../src/http.mjs';
import{liveCache}from'../src/cache.mjs';
import{requiredCanonicalRevision}from'../src/locator-policy.mjs';
import{sixteenEnglishEvidence,decodeApproval,IDS,REV,VRI,sha,objectSha,gitBlob}from'./helpers/thera335-350-evidence.mjs';
import {profilesForHistorical359,project368To359} from './helpers/intake368-metadata.mjs';
const e=sixteenEnglishEvidence(),originalFetch=globalThis.fetch,clone=structuredClone,tid=p=>canon.translationId(p);
// Explicit TEST inputs only: actual APIs/provider guards retain unprojected current375 data; only sealed H metadata supplies named359 fixture inputs.
const APADANA_PROFILES=profilesForHistorical359(HistoricalH368Profiles);
const historical359Manifest=()=>project368To359(HistoricalH368Profiles,HistoricalH368Catalogue).catalogue;
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});
function transport(calls,mutate){liveCache.clear();globalThis.fetch=async(input,init={})=>{const url=typeof input==='string'?input:input.href,id=IDS.find(id=>e.profiles[id].raw_url===url);assert.ok(id,'Only16 exact pinned official raw URLs reach the offline fixture transport');assert.ok(!url.includes('SYNTHETIC_PRIVATE_359')&&!JSON.stringify(init).includes('SYNTHETIC_PRIVATE_359'));calls.push(id);return new Response(mutate?mutate(e.artifact(id),id):e.artifact(id));};}
const currentPins=Object.freeze({'tha-ap340':VRI+'-apadana-thera340-341-343-344-346-347-v1','tha-ap341':VRI+'-apadana-thera340-341-343-344-346-347-v1','tha-ap343':VRI+'-apadana-thera340-341-343-344-346-347-v1','tha-ap344':VRI+'-apadana-thera340-341-343-344-346-347-v1','tha-ap346':VRI+'-apadana-thera340-341-343-344-346-347-v1','tha-ap347':VRI+'-apadana-thera340-341-343-344-346-347-v1','tha-ap348':VRI+'-apadana-thera-next10-v1','tha-ap349':VRI+'-apadana-thera-next10-v1'});

test('current359 preserves all full343 objects and actual26 data files including every8544 record and61books',()=>{
 const manifest=historical359Manifest();e.assertCatalogue(manifest,APADANA_PROFILES);const corpus=e.assertUnchangedSourceData();assert.equal(corpus.source.commit,VRI);
 for(const id of IDS){assert.equal(requiredCanonicalRevision(id),currentPins[id]||null);assert.equal(APADANA_PROFILES[id].index_revision,currentPins[id]?.slice(VRI.length+1));}
 for(const id of ['tha-ap107','tha-ap108'])assert.equal(requiredCanonicalRevision(id),VRI+'-apadana-thera105-106-v1');for(const id of ['tha-ap333','tha-ap334','tha-ap335','tha-ap336'])assert.equal(requiredCanonicalRevision(id),VRI+'-apadana-thera333-336-v1');
});

test('all16 exact raw artifacts and six specific rights witnesses reproduce213 paragraphs and191owned notes',{skip:!e.checkout},()=>{
 assert.equal(e.review.rights_artifacts.length,6);for(const right of e.review.rights_artifacts){const bytes=readFileSync(join(e.checkout,right.path));assert.equal(bytes.length,right.bytes);assert.equal(sha(bytes),right.sha256);assert.equal(gitBlob(bytes),right.git_blob_sha1);}
 let paragraphs=0,notes=0,pairs=0,chars=0;
 for(const id of IDS){const p=e.profiles[id],row=e.rows[id],value=parseApadana(e.artifact(id),p);e.assertNormalized(id,value);assert.equal(p.license,'CC BY-NC-SA 4.0');assert.equal(p.translator,'Jonathan S. Walters');paragraphs+=value.text.split('\n\n').length;notes+=value.translator_notes.length;chars+=value.text.length;pairs+=row.display_pairs.length;
  assert.ok(![value.text,...value.translator_notes.map(n=>n.text)].join('\n').match(/data-state|no-diacritics|<span\b|\{\.diacritics/),'Only the approved state-on presentation remains');}
 assert.deepEqual({paragraphs,notes,pairs,chars},{paragraphs:213,notes:191,pairs:25,chars:28105});
});

test('all165 physical quotations preserve171 printed global labels,25 paired displays and duplicate347local3',{skip:!e.checkout},()=>{
 let entries=0,labels=0;
 for(const id of IDS){const p=e.profiles[id],row=e.rows[id],value=parseApadana(e.artifact(id),p);e.assertNormalized(id,value);const text=quotationText({...value,translation_id:tid(p)}),quoted=text.split('\n\n');assert.equal(sha(text),row.quotation_text_sha256);assert.deepEqual(quoted.map(sha),row.quotes.map(q=>q.sha256));assert.deepEqual(quoted.map(v=>v.length),row.quotes.map(q=>q.characters_utf16));assert.ok(!text.includes('[Note '));
  const paragraphs=value.text.split('\n\n');for(const[i,q]of row.quotes.entries()){const stanza=p.stanza_layout[i],marked=paragraphs[q.body_paragraph].replace(/\[Note \d+\]/g,'').trim();assert.ok(marked.endsWith(stanza.suffix));assert.equal(quoted[i],marked.slice(0,-stanza.suffix.length).trim());assert.equal(quoted[i].split('\n').length,stanza.lines);}
  entries+=quoted.length;labels+=row.domain==='A'?row.printed_global_labels:row.printed_global_labels.length;
  if(value.chapter_summary)assert.ok(!text.includes(value.chapter_summary.text));if(value.publisher_paratext)assert.ok(!text.includes(value.publisher_paratext));
 }
 assert.equal(entries,165);assert.equal(labels,171);assert.deepEqual(e.profiles['tha-ap349'].stanza_layout.map(s=>String(s.local_label)),['1','2','3','3']);
 for(const id of ['tha-ap342','tha-ap352']){const value=parseApadana(e.artifact(id),e.profiles[id]);assert.equal(sha(value.chapter_summary.text),e.rows[id].chapter_summary.body_sha256);assert.deepEqual(value.chapter_summary.translator_notes,[]);assert.deepEqual(e.profiles[id].chapter_summary.note_numbers,[]);}
 const heading=parseApadana(e.artifact('tha-ap343'),e.profiles['tha-ap343']);assert.ok(heading.publisher_paratext.length>0);assert.equal(sha(heading.publisher_paratext),e.rows['tha-ap343'].paratext_sha256);assert.equal(Object.hasOwn(heading,'publisher_preface'),false);
});

test('genuine positives precede raw heading marker note order display and forged-profile integrity refusals',{skip:!e.checkout},()=>{
 for(const id of IDS){const p=e.profiles[id],raw=e.artifact(id);e.assertNormalized(id,parseApadana(raw,p));const candidates=[raw+'\n',raw.replace(/^title: .+$/m,'title: Substituted'),raw.replace(/^order: \d+$/m,'order: 999'),raw.replace('category: chapter-3','category: chapter-4'),raw.replace(/^### /m,'### Substituted '),raw.replace(/^\[\^1\]:/m,'[^1]: Changed'),raw.replace('[^1]','[^999]')];
  if(raw.includes('data-state=off'))candidates.push(raw.replace('data-state=off','data-state=on'));if(raw.includes('data-state="off"'))candidates.push(raw.replace('data-state="off"','data-state="on"'));
  for(const changed of candidates){assert.notEqual(sha(changed),sha(raw),'Meaningful source mutation');assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:sha(changed)}));}
  for(const patch of [{license:'CC0'},{translation_revision:'0'.repeat(40)},{root_sha256:'0'.repeat(64)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{paratext_sha256:'0'.repeat(64)},{note_numbers:[999]},{stanza_layout:[]},{publisher_heading_sha256:'0'.repeat(64)},{publisher_preface:{}},{mapping_notes:[]}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));
 }
 for(const id of ['tha-ap342','tha-ap352']){const p=e.profiles[id],raw=e.artifact(id);assert.throws(()=>parseTheraApadana(raw,{...p,chapter_summary:undefined}));assert.throws(()=>parseTheraApadana(raw,{...p,chapter_summary:{...p.chapter_summary,note_numbers:[1]}}));}
});

test('actual source API returns all63 exact500-character pages with full ordered notes prefix and separate apparatus',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);let pages=0;
 for(const id of IDS){const p=e.profiles[id],row=e.rows[id],unit=canon.resolve(id).unit;let options={translation_revision:REV,limit:500},body='';
  for(const page of row.pages){const value=await english.translation(unit,tid(p),options);assert.equal(value.text_id,id);assert.equal(value.translation_id,tid(p));assert.equal(value.translation_revision,REV);assert.equal(value.offset,page.offset);assert.equal(value.text.length,page.characters_utf16);assert.equal(sha(value.text),page.text_sha256);assert.equal(value.prefix_sha256,page.start_prefix_sha256);assert.equal(objectSha(value.translator_notes),row.notes_sha256);assert.equal(sha(value.publisher_paratext),row.paratext_sha256);assert.equal(value.license,'CC BY-NC-SA 4.0');assert.match(value.attribution,/Jonathan S\. Walters and Whitman College/);assert.ok(value.changes.length>0);body+=value.text;pages++;
   if(row.chapter_summary){assert.equal(sha(value.chapter_summary.text),row.chapter_summary.body_sha256);assert.deepEqual(value.chapter_summary.translator_notes,[]);}else assert.equal(Object.hasOwn(value,'chapter_summary'),false);
   if(page.next_offset===null)assert.equal(value.continue_with,null);else{assert.equal(value.continue_with.arguments.offset,page.next_offset);assert.equal(value.continue_with.arguments.prefix_sha256,page.continuation_prefix_sha256);assert.equal(value.continue_with.arguments.translation,tid(p));assert.equal(value.continue_with.arguments.translation_revision,REV);options=value.continue_with.arguments;}
  }
  assert.equal(body.length,row.body_characters_utf16);assert.equal(sha(body),row.body_sha256);
 }
 assert.equal(pages,63);assert.deepEqual([...new Set(calls)],IDS);
});

test('source revision prefix and licence drift refuse without silently changing versions or sending synthetic private data',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);
 for(const id of IDS){const p=e.profiles[id],unit=canon.resolve(id).unit,first=await english.translation(unit,tid(p),{translation_revision:REV,limit:500});assert.ok(first.continue_with,'Each independent source has at least two pages');const next=first.continue_with.arguments,count=calls.length;
  await assert.rejects(english.translation(unit,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,count);
  await assert.rejects(english.translation(unit,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);assert.equal(calls.at(-1),id);
  const exact=await english.translation(unit,tid(p),next);assert.equal(exact.offset,500);assert.equal(exact.translation_id,tid(p));
  const link=canon.load().translations[id].find(v=>tid(v)===tid(p)),old=clone(link);try{link.license='CC0';const before=calls.length;await assert.rejects(english.translation(unit,tid(p),{translation_revision:REV}));assert.equal(calls.length,before);}finally{for(const key of Object.keys(link))delete link[key];Object.assign(link,old);}
 }
 transport([],raw=>raw+'\n');for(const id of IDS)await assert.rejects(english.translation(canon.resolve(id).unit,tid(e.profiles[id]),{translation_revision:REV,limit:500}));
});

test('the sixteen literal approved URLs do not open neighbouring held sources media or alternate revisions',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unapproved source transport must not run');};
 for(const n of [70,140,158,159,260,266,280,306,307,311,320,358]){const url=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${REV}/src/_poems/chapter-3/poem-${n}.md`;assert.equal(isApadanaRawUrl(url),false);await assert.rejects(fetchPublic(url,{json:false}));}
 for(const id of IDS){const url=e.profiles[id].raw_url;assert.equal(isApadanaRawUrl(url),true);for(const changed of [url.replace('.md','.mp3'),url.replace(REV,'0'.repeat(40))]){assert.equal(isApadanaRawUrl(changed),false);await assert.rejects(fetchPublic(changed,{json:false}));}}
 assert.equal(calls,0);
});

test('sealed full359 metadata rejects omissions substitutions extra bodies and licence drift; package policy excludes raw sources',()=>{
 const curation=readFileSync('docs/evidence/apadana/english335-350/APPROVAL.json');decodeApproval(curation);assert.throws(()=>decodeApproval(Buffer.concat([curation,Buffer.from(' ')])));
 const profiles=clone(APADANA_PROFILES),manifest=historical359Manifest();e.assertCatalogue(manifest,profiles);
 const substituted=clone(profiles);substituted['tha-ap353']=substituted['tha-ap352'];delete substituted['tha-ap352'];assert.equal(Object.keys(substituted).length,359);assert.throws(()=>e.assertProfiles(substituted));
 const missing=clone(profiles);delete missing[e.compact.ids[0]];assert.throws(()=>e.assertProfiles(missing));const bad=clone(manifest);bad.links['tha-ap337'].license='CC0';assert.throws(()=>e.assertCatalogue(bad,profiles));
 function metadataOnly(value){if(Array.isArray(value)){for(const v of value)metadataOnly(v);}else if(value&&typeof value==='object'){for(const[k,v]of Object.entries(value)){assert.ok(!['text','translator_notes','publisher_paratext','body_paragraphs','paragraphs'].includes(k),'No bundled English body/note payload key: '+k);metadataOnly(v);}}}
 metadataOnly(manifest);metadataOnly(profiles);const injected=clone(profiles);injected['tha-ap337'].text='SYNTHETIC_PRIVATE_359';assert.throws(()=>e.assertProfiles(injected));assert.throws(()=>metadataOnly(injected));
 assert.deepEqual(JSON.parse(readFileSync('package.json')).files,['server','README.md','LICENSE','THIRD_PARTY.md','PRIVACY.md']);
});
