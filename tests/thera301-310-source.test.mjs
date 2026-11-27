// Current375 app/API inputs remain actual R. Named H metadata below is source-derived, never an API projection.
import {intake375Authority,requireProfiles375,requireMetadata375,assertCurrent375SourceClosure} from './helpers/intake375-metadata.mjs';
assertCurrent375SourceClosure(new URL('../',import.meta.url));
const current375Source=intake375Authority();
const HistoricalH368Profiles=current375Source.baseline.profiles;
const HistoricalH368Catalogue={version:1,source:current375Source.baseline.manifest_source,vri_commit:current375Source.manifest.vri_commit,held:current375Source.baseline.manifest_held,links:current375Source.baseline.links};
requireProfiles375(CURRENT_APADANA_PROFILES);
import {readFileSync as readCurrent375MetadataFile} from 'node:fs';
requireMetadata375(CURRENT_APADANA_PROFILES,JSON.parse(readCurrent375MetadataFile(new URL('../server/data/apadana.json',import.meta.url))));
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL,fileURLToPath as actualRFilePath} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readCurrentFileSync(path,...options){return readOwnedHOrActualMetadataFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
const {historical440DataReader}=await import(new URL('tests/helpers/four-history-data.mjs',HistoricalHBase).href);
import {canonBeforeFour} from './helpers/canon-before-four.mjs';
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync as readOwnedHOrActualMetadataFile} from 'node:fs';
import {join} from 'node:path';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES as CURRENT_APADANA_PROFILES,APADANA_COMMIT,isApadanaRawUrl} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,rootDigest} from '../src/apadana.mjs';
import {parseTheraApadana} from '../src/apadana-thera.mjs';
import {fetchPublic} from '../src/http.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {thera301310Evidence,digest,blob} from './helpers/thera301-310-evidence.mjs';
import {projectPublisher333To325,historical325FileReader} from './helpers/thera333-legacy-projection.mjs';
const APADANA_PROFILES=projectPublisher333To325(HistoricalH368Profiles,HistoricalH368Catalogue).profiles;
const readFileSync=historical325FileReader(HistoricalH368Profiles,historical440DataReader(readCurrentFileSync));
// Anchor only the declared publisher checkout at actual R before rights paths enter the owned-H reader.
function publisherEvidenceAtActualR(value){return {...value,checkout:value.checkout?resolveHistoricalHInput(actualRFilePath(new URL('../',import.meta.url)),value.checkout):value.checkout};}
const e=publisherEvidenceAtActualR(thera301310Evidence()),originalFetch=globalThis.fetch,clone=value=>JSON.parse(JSON.stringify(value));
const tid=p=>canon.translationId(p),profile=id=>APADANA_PROFILES[id],parsed=id=>parseApadana(e.artifact(id),profile(id));
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=e.ids.find(id=>e.profiles[id].raw_url===url.href);assert.ok(id,'Only exact eight pinned Markdown fixture URLs may reach transport');assert.ok(url.href.endsWith('.md'));calls.push(id);return new Response(e.artifact(id));};}

test('eight V2 approved profiles extend every preserved317 object and link to325 with finite counter projection and unchanged canonical/data identities',()=>{
 const data=canon.load(),manifest=JSON.parse(readFileSync('server/data/apadana.json'));
 assert.equal(APADANA_COMMIT,e.approval.publisher_revision);assert.deepEqual(Object.keys(APADANA_PROFILES),e.approval.expected_profile_ids);assert.equal(Object.keys(APADANA_PROFILES).length,325);assert.deepEqual(Object.keys(manifest.links),e.approval.expected_profile_ids);
 for(const id of e.approval.baseline_ids){assert.deepEqual(profile(id),e.baseline.profile_objects[id]);assert.deepEqual(manifest.links[id],e.baseline.translation_objects[id]);assert.equal(digest(JSON.stringify(profile(id))),e.compact.profile_object_sha256[id]);assert.equal(digest(JSON.stringify(manifest.links[id])),e.compact.translation_object_sha256[id]);}
 const priorSource=clone(manifest.source);for(const[current,previous]of [['325 finite complete publisher-edition poems','317 finite complete publisher-edition poems'],['285 explicitly mapped Therā','277 explicitly mapped Therā']]){assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved current counter '+current);priorSource.policy=priorSource.policy.replace(current,previous);}
 assert.equal(digest(JSON.stringify(priorSource)),e.compact.manifest_source_sha256,'Only the exact two approved counters may differ');let preserved=0;for(const[path,sha]of Object.entries(e.compact.data_file_sha256))if(path!=='server/data/apadana.json'){assert.equal(digest(readFileSync(path)),sha,'Unchanged prior data artifact '+path);preserved++;}assert.equal(preserved,26);
 assert.equal(digest(JSON.stringify(canonBeforeFour(data.canon))),e.baseline.canon_logical_sha256);assert.equal(data.canon.units.length,8544);assert.equal(data.canon.books.length,61);
 for(const id of e.ids){const p=profile(id),b=e.independent(id),u=data.byId.get(id);assert.deepEqual(p,e.profiles[id]);assert.deepEqual(manifest.links[id],e.links[id]);assert.equal(rootDigest(u,data.canon.books[u.book]),b.root_sha256);assert.deepEqual({start:u.start,end:u.end,book:u.book},{start:b.canonical.start,end:b.canonical.end,book:b.canonical.book});assert.ok(Object.isFrozen(p));}
 for(const id of ['tha-ap262','tha-ap268','tha-ap282','tha-ap293','tha-ap299','tha-ap302','tha-ap308','tha-ap309'])assert.equal(profile(id),undefined);
 e.assertClientProjection(HistoricalHBase);assert.equal(profile('tha-ap312').mapping_notes.filter(row=>row===e.notice).length,1);
});

test('all eight complete originals and six rights/routing artifacts match independent source body notes paragraphs and UTF16 lengths before corruptions',{skip:!e.checkout},()=>{
 for(const item of e.rights.artifacts){const raw=readFileSync(join(e.checkout,item.path));assert.equal(raw.length,item.bytes);assert.equal(digest(raw),item.sha256);assert.equal(blob(raw),item.git_blob_sha1);}
 let paragraphs=0,entries=0,labels=0,notes=0,summaryNotes=0;
 for(const id of e.ids){const value=parsed(id),b=e.independent(id);e.assertNormalized(id,value);paragraphs+=value.text.split('\n\n').length;entries+=b.stanza_layout.length;labels+=b.printed_local_labels.length;notes+=value.translator_notes.length;summaryNotes+=value.chapter_summary?.translator_notes.length||0;assert.equal(value.title,profile(id).title);assert.equal(value.publisher_paratext,'');}
 assert.deepEqual({paragraphs,entries,labels,notes,summaryNotes},{paragraphs:58,entries:34,labels:36,notes:31,summaryNotes:1});assert.deepEqual(e.ids.map(e.bodyLength),[744,722,749,1188,717,714,726,891]);
});

test('all34 genuine quotation entries preserve compounds309/310 and source punctuation while excluding headings notes colophons and chapter apparatus',{skip:!e.checkout},()=>{
 let eight=0;
 for(const id of e.ids){const p=profile(id),b=e.independent(id),value=parsed(id);e.assertNormalized(id,value);const quote=quotationText({...value,translation_id:tid(p)}),entries=quote.split('\n\n');assert.equal(digest(quote),b.quotation_text_sha256);assert.deepEqual(entries.map(digest),b.quotation_entry_sha256s);assert.deepEqual(entries.map(row=>row.length),b.quotation_entry_characters_utf16);assert.deepEqual(entries.map(row=>row.split('\n').length),b.stanza_layout.map(row=>row.lines));assert.ok(!/\[Note \d+\]/.test(quote));for(const paragraph of [value.text.split('\n\n')[0],...value.text.split('\n\n').slice(-2)])assert.ok(!quote.includes(paragraph));assert.equal(value.publisher_paratext,'');if(value.chapter_summary)assert.ok(!quote.includes(value.chapter_summary.text));eight+=b.stanza_layout.filter(row=>row.lines===8).length;}
 assert.equal(eight,2);assert.deepEqual(profile('tha-ap311').stanza_layout[0],{local_label:'1-2',publisher_label:'2759-2760',suffix:'(1-2) [2759-2760]',lines:8});assert.deepEqual(profile('tha-ap312').stanza_layout[1],{local_label:'2-3',publisher_label:'2764-2765',suffix:'(2-3) [2764-2765]',lines:8});
});

test('all eight source lexical and translator uncertainties remain literal without invented chapter301 text or renamed recipients',{skip:!e.checkout},()=>{
 for(const id of e.ids)e.assertNormalized(id,parsed(id));
 const elephant=parsed('tha-ap303');assert.equal(elephant.publisher_paratext,'');assert.match(elephant.translator_notes[3].text,/Or glossary\?/);assert.match(elephant.translator_notes[4].text,/xxx/);assert.match(elephant.translator_notes[4].text,/\u014b/);
 const cloth=parsed('tha-ap304');assert.match(cloth.text,/Sucela/);assert.ok(!cloth.text.includes('Suceḷa'));assert.match(cloth.text,/perfumes/);
 const food=parsed('tha-ap305');assert.equal(food.translator_notes.length,3);assert.notEqual(food.translator_notes[0].text,food.translator_notes[2].text);assert.match(food.text,/Vipassi/);
 const teaching=parsed('tha-ap306');assert.ok(teaching.translator_notes[2].text.includes('>'));assert.ok(!teaching.translator_notes[2].text.includes('&gt;'));assert.match(teaching.translator_notes[5].text,/dhamma-saññā/);assert.match(teaching.translator_notes[5].text,/dhamma-dāna/);assert.match(teaching.text,/Sutava/);
 const fruit=parsed('tha-ap307');assert.match(fruit.translator_notes[0].text,/xxx/);assert.match(fruit.translator_notes[1].text,/Bhāgīrasī/);assert.match(fruit.text,/Bhāgīrathī/);assert.match(fruit.text,/rayless sun/);
 const ointment=parsed('tha-ap310');assert.match(ointment.text,/follower/);assert.match(ointment.text,/Atthadassi/);assert.match(ointment.text,/boundary/);assert.match(ointment.text,/eighteen-hundred/);
 const dream=parsed('tha-ap311');assert.match(dream.text,/In a dream/);assert.match(dream.text,/Siddhattha/);assert.match(dream.text,/Well-Gone/);assert.equal(dream.text.split('\n\n')[1].split('\n').length,8);
});

test('310summary preserves note8 count49 versus VRI51 and differing original order outside poem refs body and quotations',{skip:!e.checkout},()=>{
 const id='tha-ap312',value=parsed(id),p=profile(id),b=e.independent(id),g=e.golden(id).chapter_summary;e.assertNormalized(id,value);assert.deepEqual(value.translator_notes.map(n=>n.number),[1,2,3,4,5,6,7]);assert.deepEqual(value.chapter_summary.translator_notes.map(n=>n.number),[8]);assert.equal(value.chapter_summary.text.length,226);assert.deepEqual(value.chapter_summary.text.split('\n\n').map(p=>p.split('\n').length),[1,6,1]);assert.ok(!value.text.includes('The Summary:'));assert.ok(!value.text.includes('[Note 8]'));
 assert.deepEqual([p.chapter_summary.root_start,p.chapter_summary.root_end],[9221,9226]);assert.deepEqual([p.chapter_summary.first_ref,p.chapter_summary.last_ref],['tha-ap312/9','tha-ap312/11']);assert.equal(b.poem_root_end,9221);assert.equal(g.publisher_stated_total,49);assert.equal(g.vri_stated_total,51);assert.equal(g.actual_vri_numbered_stanzas,51);assert.equal(g.full_publisher_local_label_occurrences,51);assert.equal(g.approved_subset_entries,34);assert.equal(g.approved_subset_printed_labels,36);assert.deepEqual(g.held_publisher_poems,[306,307]);assert.equal(b.chapter_summary.whole_chapter_english_approval,false);assert.deepEqual(b.chapter_summary.publisher_order,['marker','verse','chapter_heading']);assert.deepEqual(b.chapter_summary.VRI_order,['chapter_colophon','marker','verse']);assert.match(value.chapter_summary.text,/Lomaka/);assert.match(value.chapter_summary.text,/one less than fifty/);assert.ok(p.mapping_notes.includes(e.notice));assert.equal(value.text.split('\n\n')[2].split('\n').length,8);
});

test('changed actual raw notes chapter apparatus paired entry entity and forged source-hash controls refuse after authentic eight positives',{skip:!e.checkout},()=>{
 for(const id of e.ids){const p=profile(id),raw=e.artifact(id);e.assertNormalized(id,parsed(id));const definition=raw.match(/\[\^1\]: [\s\S]*?(?=\n\n\[\^2\]: |$)/)[0],other=e.ids.find(other=>other!==id),changes=[raw+'\n',raw.replace('### ','### x'),raw.replace('order: '+p.poem,'order: 306'),raw.replace('category: chapter-3','category: chapter-4'),raw.replace('[^1]: ','[^1]: x'),raw.replace('[^1]: ','[^2]: '),raw.replace(definition,'').replace('### ',definition+'\n\n### '),raw.replace('[^1]','').replace('(1','[^1] (1'),raw.replace('\\['+p.stanza_layout[0].publisher_label+'\\]','\\[9999\\]'),raw.replace('### ','## Foreign chapter heading\n\n### ')];
  if(/data-state=on/.test(raw))changes.push(raw.replace('data-state=on','data-state=off'));if(p.poem===304)changes.push(raw.replace('&gt;','&lt;'));if(p.poem===301||p.poem===305)changes.push(raw.replace('xxx',''));if(p.poem===302)changes.push(raw.replace('Su[c]','Su[x]'));
  if(p.poem===309||p.poem===310){const entry=raw.split('\n\n').find(row=>row.includes(p.poem===309?'(1-2)':'(2-3)')),lines=entry.split('\n');changes.push(raw.replace(entry,lines.slice(0,4).join('\n')+'\n\n'+lines.slice(4).join('\n')));}
  if(p.poem===310)changes.push(raw.replace('[^8]: ','[^8]: x'),raw.replace('[^8]: ','[^9]: '),raw.replace('The Summary:','The summary:'),raw.replace('one less than fifty','fifty-one'));
  for(const changed of changes){assert.notEqual(changed,raw,id+' meaningful actual-source corruption');assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:digest(changed)}));}
  for(const patch of [{id:other},{poem:306},{path:'/text/chapter-3/poem-306/'},{translation_revision:'0'.repeat(40)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{root_sha256:'0'.repeat(64)},{note_numbers:[999]},{stanza_layout:[]},{publisher_preface:{}},{chapter_summary:p.chapter_summary?{...p.chapter_summary,parent_id:'tha-ap308'}:{}}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));
 }
});

test('held306/307 and earlier291/297/300/260/266/280 plus media refuse before transport while authentic Pāli remains readable',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No held source or media request');};
 for(const poem of [260,266,280,291,297,300,306,307]){const raw=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`,id='tha-ap'+(poem+2),u=canon.resolve(id).unit;assert.equal(isApadanaRawUrl(raw),false);await assert.rejects(fetchPublic(raw,{json:false}),/outside the supported public sources/);assert.equal(profile(id),undefined);await assert.rejects(english.translation(u,`ap:chapter-3/poem-${poem}`));const page=await readPassage({uid:id,translation:tid(profile('tha-ap303')),english:true,limit:2});assert.equal(page.english,null);assert.ok(page.pali.segments.length);}
 const media=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-310.mp3`;assert.equal(isApadanaRawUrl(media),false);await assert.rejects(fetchPublic(media,{json:false}),/outside the supported public sources/);assert.equal(calls,0);
});

test('cold and warmed metadata and genuine source-bound continuations refuse drift without extra source requests or fallback',{skip:!e.checkout},async()=>{
 const calls=[];transport(calls);const data=canon.load();
 for(const id of e.ids){const p=profile(id),u=data.byId.get(id),link=data.translations[id].find(row=>canon.translationId(row)===tid(p)),original=clone(link),restore=()=>{for(const key of Object.keys(link))delete link[key];Object.assign(link,clone(original));};
  link.license='CC0';const cold=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500}));assert.equal(calls.length,cold);}finally{restore();}
  const first=await english.translation(u,tid(p),{translation_revision:APADANA_COMMIT,limit:500});assert.equal(first.body_sha256,e.independent(id).body_sha256);assert.equal(first.total_characters,e.bodyLength(id));assert.equal(Boolean(first.continue_with),e.bodyLength(id)>500);
  for(const patch of [{license:'CC0'},{path:'/text/chapter-3/poem-306/'},{raw_url:p.raw_url.replace(APADANA_COMMIT,'0'.repeat(40))},{root_sha256:'0'.repeat(64)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{paratext_sha256:'0'.repeat(64)},{translation_revision:'0'.repeat(40)},{note_numbers:[999]},{mapping_notes:[]},{publisher_preface:{}},{chapter_summary:p.chapter_summary?{...p.chapter_summary,notes_sha256:'0'.repeat(64)}:{}}]){Object.assign(link,patch);const count=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,count);}finally{restore();}}
  if(first.continue_with){const next=first.continue_with.arguments,count=calls.length;await assert.rejects(english.translation(u,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,count);await assert.rejects(english.translation(u,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);assert.ok(calls.length-count<=1);assert.ok(calls.slice(count).every(uid=>uid===id));}else assert.equal(digest(first.text),e.independent(id).body_sha256);
 }
});
