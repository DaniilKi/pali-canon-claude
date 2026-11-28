import {currentAuthority} from './helpers/current-apadana.mjs';
import {intake382Authority as historical382Authority} from './helpers/intake382-metadata.mjs';
const liveCurrentSource=currentAuthority(),historical382Source=historical382Authority();
import {historicalF3SourceFixtureFromOwnedH} from './helpers/historical389390-source-canon.mjs';
// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority} from './helpers/intake380-metadata.mjs';
import {INTAKE382_IDS} from './helpers/intake382-metadata.mjs';
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
assert.equal(Object.keys(HistoricalH368Profiles).filter(id=>id.startsWith('tha-ap')).length,328);
import {after as closeOwnedHistoricalHInputs} from 'node:test';
import {prepareHistoricalHRuntimeInputs} from './helpers/historical-h-inputs.mjs';
import {resolve as resolveHistoricalHInput,isAbsolute as isAbsoluteHistoricalHInput} from 'node:path';
import {pathToFileURL as historicalHFileURL} from 'node:url';
const ownedHistoricalHInputs=prepareHistoricalHRuntimeInputs(new URL('../',import.meta.url));
const HistoricalHBase=historicalHFileURL(ownedHistoricalHInputs.root+'/');
closeOwnedHistoricalHInputs(()=>ownedHistoricalHInputs.close());
function readActualFileSync(path,...options){if(path==='server/data/apadana.json')return readOwnedHOrActualMetadataFile(path,...options);return readOwnedHOrActualMetadataFile(typeof path==='string'&&!isAbsoluteHistoricalHInput(path)?resolveHistoricalHInput(ownedHistoricalHInputs.root,path):path,...options);}
import {currentHeldPublishers} from './helpers/intake343-metadata.mjs';
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
import {liveCache} from '../src/cache.mjs';
import {thera321329Evidence,digest,blob,REV,VRI} from './helpers/thera321-329-evidence.mjs';
const e=thera321329Evidence(),originalFetch=globalThis.fetch,clone=x=>JSON.parse(JSON.stringify(x)),tid=p=>canon.translationId(p),parsed=id=>parseApadana(e.artifact(id),APADANA_PROFILES[id]);
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});
function transport(calls){globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.href,id=e.ids.find(id=>e.profiles[id].raw_url===url);assert.ok(id,'Exact six-source fixture only');calls.push(id);return new Response(e.artifact(id));};}

test('exact339 preserves all333 ordered fullobjects, canonical roots and all26 unrelated data files',()=>{
 const data=canon.load(),manifest=JSON.parse(readActualFileSync('server/data/apadana.json'));e.assertCatalogue(HistoricalH368Catalogue,HistoricalH368Profiles);assert.equal(APADANA_COMMIT,REV);assert.equal(Object.keys(APADANA_PROFILES).filter(id=>id.startsWith('thi-ap')).length,40);assert.equal(Object.keys(current380Source.historical375.profiles).filter(id=>id.startsWith('tha-ap')).length,335);const historicalTheraIds=Object.keys(current380Source.profiles).filter(id=>id.startsWith('tha-ap')),actualTheraIds=Object.keys(APADANA_PROFILES).filter(id=>id.startsWith('tha-ap'));
 assert.equal(historicalTheraIds.length,340);assert.deepEqual(actualTheraIds.slice(0,340),historicalTheraIds);assert.deepEqual(actualTheraIds.slice(340,342),INTAKE382_IDS);
 assert.deepEqual(actualTheraIds.slice(0,342),[...historicalTheraIds,...INTAKE382_IDS]);assert.deepEqual(actualTheraIds,liveCurrentSource.ids.filter(id=>id.startsWith('tha-ap')));assert.equal(historical382Source.ids.filter(id=>id.startsWith('tha-ap')).length,342);assert.equal(actualTheraIds.length,liveCurrentSource.ids.filter(id=>id.startsWith('tha-ap')).length);assert.equal(digest(JSON.stringify(canonBeforeFour(historicalF3SourceFixtureFromOwnedH(data.canon, HistoricalHBase)))),e.compact.canonical_logical_sha256);assert.equal(data.canon.units.length,8544);assert.equal(data.canon.books.length,61);
 for(const [path,sha] of Object.entries(e.compact.data_file_sha256))assert.equal(digest(readFileSync(path)),sha);
 for(const id of e.ids){const p=APADANA_PROFILES[id],u=data.byId.get(id),r=e.arows[id].root;assert.ok(Object.isFrozen(p));assert.equal(rootDigest(u,data.canon.books[u.book]),p.root_sha256);for(const key of ['id','book','title','start','end'])assert.deepEqual(u[key],r[key]);}
});

test('all6 original raw and six rights blobs match both independent fullbody56paragraphs28notes and one separately owned heading',{skip:!e.checkout},()=>{
 for(const r of e.rights){const raw=readFileSync(join(e.checkout,r.path));assert.equal(raw.length,r.bytes);assert.equal(digest(raw),r.sha256);assert.equal(blob(raw),r.git_blob_sha1);}
 let paragraphs=0,notes=0,headings=0;for(const id of e.ids){const v=parsed(id);e.assertNormalized(id,v);paragraphs+=v.text.split('\n\n').length;notes+=v.translator_notes.length;if(v.publisher_paratext){headings++;assert.equal(id,'tha-ap323');assert.equal(digest(v.publisher_paratext),e.arows[id].publisher_paratext.sha256);assert.ok(!v.text.includes(v.publisher_paratext));}}
 assert.deepEqual({paragraphs,notes,headings},{paragraphs:56,notes:28,headings:1});
});

test('all38 exact wholeverse quotations preserve41printed labels and three combined eightline entries excluding title notes heading and colophons',{skip:!e.checkout},()=>{
 let physical=0,labels=0,combined=0;for(const id of e.ids){const v=parsed(id),p=e.profiles[id],b=e.independent(id);e.assertNormalized(id,v);const q=quotationText({...v,translation_id:tid(p)}),rows=q.split('\n\n');assert.equal(digest(q),b.quotation_text_sha256);assert.deepEqual(rows.map(digest),b.quotation_entries_sha256);assert.deepEqual(rows.map(x=>x.length),b.quotation_entries_characters_utf16);assert.deepEqual(rows.map(x=>x.split('\n').length),b.quotation_entries_lines);assert.ok(!/\[Note \d+\]/.test(q));for(const x of [v.text.split('\n\n')[0],...v.text.split('\n\n').slice(-2),v.publisher_paratext].filter(Boolean))assert.ok(!q.includes(x));physical+=rows.length;combined+=rows.filter(x=>x.split('\n').length===8).length;labels+=p.stanza_layout.reduce((n,r)=>{const [a,b=a]=r.local_label.split('-').map(Number);return n+b-a+1;},0);}
 assert.deepEqual({physical,labels,combined},{physical:38,labels:41,combined:3});
});

test('six finite on/off pairs and all28 note owners remain exact including329 literalxxx and terminalellipsis',{skip:!e.checkout},()=>{
 let owners=0;for(const id of e.ids){const v=parsed(id),a=e.arows[id],parts=v.text.split('\n\n');e.assertNormalized(id,v);for(const n of a.notes){const positions=parts.flatMap((p,i)=>[...p.matchAll(/\[Note (\d+)\]/g)].filter(m=>Number(m[1])===n.number).map(()=>i));assert.deepEqual(positions,[n.owner_body_paragraph]);assert.equal(digest(v.translator_notes.find(x=>x.number===n.number).text),n.text_sha256);}}
 for(const row of e.A.finite_pair_owner_inventory){const id='tha-ap'+(row.publisher+2),raw=e.artifact(id),v=parsed(id),a=e.arows[id];assert.equal(row.count,1);const match=row.owner.match(/^(body|note):(\d+)$/);assert.ok(match);const i=Number(match[2]),ops=match[1]==='body'?a.body_paragraphs[i].presentation_operations:a.notes.find(n=>n.number===i).presentation_operations;assert.equal(ops.finite_state_on_pairs,1);assert.ok(raw.includes('data-state=on'));assert.ok(!/<span|data-state/.test(v.text+v.translator_notes.map(n=>n.text).join('')));owners++;}
 assert.equal(owners,6);const note=parsed('tha-ap331').translator_notes.find(n=>n.number===2).text;assert.ok(note.includes('xxx'));assert.ok(note.endsWith('…'));assert.equal(digest(note),e.arows['tha-ap331'].notes[1].text_sha256);
});

test('genuine positives precede raw note statepair boundary and forgedprofile corruption refusals',{skip:!e.checkout},()=>{
 for(const id of e.ids){const raw=e.artifact(id),p=e.profiles[id];e.assertNormalized(id,parsed(id));const changes=[raw+'\n',raw.replace('[^1]:','[^1]: altered'),raw.replace('title: '+p.title,'title: Changed'),raw.replace('category: chapter-3','category: chapter-4'),raw.replace('[^1]',''),raw.replace('### ','### Invented heading\n\n')];if(raw.includes('data-state=on'))changes.push(raw.replace('data-state=on','data-state=off'));for(const changed of changes){assert.notEqual(digest(changed),digest(raw));assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:digest(changed)}));}for(const patch of [{license:'CC0'},{translation_revision:'0'.repeat(40)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{paratext_sha256:'0'.repeat(64)},{root_sha256:'0'.repeat(64)},{note_numbers:[99]},{mapping_notes:[]},{stanza_layout:[]},{chapter_summary:{}}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));}
});

test('held322327328330331 and previousholds media and alteredrights refuse beforetransport while actualsource prefix checks refetch exactsameversion',{skip:!e.checkout},async()=>{
 let denied=0;globalThis.fetch=async()=>{denied++;throw Error('Held source must not fetch');};for(const n of currentHeldPublishers(e.heldPublishers)){const id='tha-ap'+(n+2),url=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${REV}/src/_poems/chapter-3/poem-${n}.md`;assert.equal(APADANA_PROFILES[id],undefined);assert.equal(isApadanaRawUrl(url),false);await assert.rejects(fetchPublic(url,{json:false}));await assert.rejects(english.translation(canon.resolve(id).unit,`ap:chapter-3/poem-${n}`));}assert.equal(denied,0);
 const media=e.profiles[e.ids[0]].raw_url.replace('.md','.mp3');assert.equal(isApadanaRawUrl(media),false);await assert.rejects(fetchPublic(media,{json:false}));assert.equal(denied,0);
 const calls=[];transport(calls);for(const id of e.ids){const p=e.profiles[id],unit=canon.resolve(id).unit,link=canon.load().translations[id].find(x=>tid(x)===tid(p)),old=clone(link);const restore=()=>{for(const k of Object.keys(link))delete link[k];Object.assign(link,clone(old));};link.license='CC0';const before=calls.length;try{await assert.rejects(english.translation(unit,tid(p),{translation_revision:REV}));assert.equal(calls.length,before);}finally{restore();}const first=await english.translation(unit,tid(p),{translation_revision:REV,limit:500});assert.equal(first.body_sha256,p.body_sha256);assert.ok(first.continue_with);const next=first.continue_with.arguments,prior=calls.length;await assert.rejects(english.translation(unit,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,prior);await assert.rejects(english.translation(unit,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);assert.equal(calls.length,prior+1);assert.equal(calls.at(-1),id);const good=await english.translation(unit,tid(p),next);assert.equal(good.offset,500);assert.equal(good.translation_id,tid(p));assert.equal(good.prefix_sha256,e.pages[id].pages500[0].prefix_sha256);}
});
