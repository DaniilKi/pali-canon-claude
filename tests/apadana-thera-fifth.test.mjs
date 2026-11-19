import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES, APADANA_COMMIT, APADANA_LICENSE, isApadanaRawUrl} from '../src/apadana-profiles.mjs';
import {THERA_APADANA_PROFILES} from '../src/apadana-thera-profiles.mjs';
import {parseApadana, quotationText, digest, rootDigest, validateLink} from '../src/apadana.mjs';
import {parseTheraApadana} from '../src/apadana-thera.mjs';
import {fetchPublic} from '../src/http.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {validateApadanaChoice,validateEnglishPage} from '../web/translation-policy.mjs';

const ids = ["tha-ap43", "tha-ap45", "tha-ap46", "tha-ap47", "tha-ap48", "tha-ap49", "tha-ap50", "tha-ap51", "tha-ap52"];
const gold = JSON.parse(readFileSync('docs/evidence/apadana/THERA_FIFTH_GOLDENS.json','utf8'));
const review = JSON.parse(readFileSync('docs/evidence/apadana/THERA_FIFTH_SOURCE_REVIEW.json','utf8'));
const checkout = process.env.APADANA_SOURCE_CHECKOUT, originalFetch = globalThis.fetch;
afterEach(() => {globalThis.fetch = originalFetch;});
const profile = uid => APADANA_PROFILES[uid], tid = p => canon.translationId(p);
const source = p => readFileSync(join(checkout,'src/_poems',p.path.replace(/^\/text\//,'').replace(/\/$/,'.md')),'utf8');
const parsed = p => parseApadana(source(p),p);
const pins = ['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'];
function pinnedFetch(calls) {
 globalThis.fetch = async url => {const p = Object.values(APADANA_PROFILES).find(row => row.raw_url === url.href);assert.ok(p,'Only exact reviewed artifacts may be fetched');calls.push(p.id);return new Response(source(p));};
}
function assertScopes(value,p,content) {
 for(const key of ['publisher_preface','collection_summary'])assert.equal(Object.hasOwn(value,key),false,`${p.id} has no ${key}`);
 for(const key of ['chapter_summary','publisher_divisions']){
  assert.equal(Object.hasOwn(value,key),Object.hasOwn(p,key),`${p.id} ${key} presence`);
  if(!p[key])continue;
  const expected=key==='publisher_divisions'?p[key]:[p[key]], actual=key==='publisher_divisions'?value[key]:[value[key]];
  assert.equal(actual.length,expected.length);
  for(const [i,s]of actual.entries()){const {text,translator_notes,...descriptor}=s;assert.deepEqual(descriptor,expected[i]);if(content){assert.equal(digest(text),s.body_sha256);assert.equal(digest(JSON.stringify(translator_notes)),s.notes_sha256);assert.deepEqual(translator_notes,[]);}else{assert.equal(text,undefined);assert.equal(translator_notes,undefined);}}
 }
}

test('fifth Therā activation uses explicit reviewed identities and preserves all prior seventy profiles and Pāli',()=>{
 assert.equal(Object.keys(APADANA_PROFILES).length,89);assert.equal(Object.keys(THERA_APADANA_PROFILES).length,49);
 const previous=Object.fromEntries(Object.entries(APADANA_PROFILES).filter(([id])=>id.startsWith('thi-')||Number(id.slice(6))<=42));
 assert.equal(digest(JSON.stringify(previous)),'f7c29ca909d614c1e23fd7f03b171c3e28c6b67f99d365ae63dad49c01d87a5b');
 const data=canon.load(), pali=Object.fromEntries(Object.keys(previous).map(id=>[id,digest(JSON.stringify(canon.segments(data.byId.get(id))))]));
 assert.equal(digest(JSON.stringify(pali)),'dfb55686f564a18c1474342061fb63a09a3749fe459bae88c410a136844d4e83');
 const oldLinks=Object.fromEntries(Object.entries(JSON.parse(readFileSync('server/data/apadana.json','utf8')).links).filter(([id])=>Object.hasOwn(previous,id)));
 assert.equal(digest(JSON.stringify(oldLinks)),'a2c4de10faef804b6ffaf75b296e4f676d7841a10bcaa907e8c1e0204b28cc3d');
 assert.deepEqual(gold.poems.filter(g=>ids.includes(g.id)).map(g=>g.id),ids);
 assert.equal(profile('tha-ap44'),undefined,'Publisher42 omission apparatus remains held');assert.equal(profile('tha-ap63'),undefined);
 for(const uid of ids){const p=profile(uid),g=gold.poems.find(g=>g.id===uid),u=data.byId.get(uid),book=data.canon.books[u.book];assert.equal(p.id,g.id);assert.equal(p.poem,g.poem);assert.equal(p.title,g.title);assert.equal(p.publisher_chapter,'chapter-3');assert.ok(Object.isFrozen(p));assert.ok(Object.isFrozen(p.stanza_layout));validateLink(p,p.id,u,book);for(const key of pins)assert.equal(p[key],key==='root_sha256'?g.root.root_sha256:g[key]);assert.equal(rootDigest(u,book),g.root.root_sha256);assert.deepEqual(p.note_numbers,g.note_numbers);assert.deepEqual(p.stanza_layout,g.stanza_layout);assert.equal(u.index_revision,undefined);assert.equal(p.license,'CC BY-NC-SA 4.0');assert.equal(p.translation_revision,APADANA_COMMIT);assert.match(p.reference,/complete publisher-edition poem/);assert.match(p.mapping_notes.join(' '),/not a line-complete translation/);for(const finding of review.poems.find(r=>r.id===uid).edition_findings)assert.ok(p.mapping_notes.includes(finding));}
});

test('source-enabled fifth exact Git blobs reproduce every reviewed paragraph, original note and separate scope',{skip:!checkout},()=>{
 for(const artifact of [...gold.rights,gold.publisher_routing]){const raw=readFileSync(join(checkout,artifact.path));assert.equal(digest(raw),artifact.raw_sha256);assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),artifact.git_blob_sha1);}
 let stanzas=0,paragraphs=0,notes=0;
 for(const uid of ids){const g=gold.poems.find(g=>g.id===uid),p=profile(uid),raw=source(p),value=parsed(p),parts=value.text.split('\n\n');assert.equal(digest(raw),g.raw_sha256);assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex'),g.git_blob_sha1);assert.equal(digest(value.text),g.body_sha256);assert.equal(digest(JSON.stringify(value.translator_notes)),g.notes_sha256);assert.equal(digest(value.publisher_paratext),g.paratext_sha256);assert.deepEqual(value.translator_notes.map(n=>n.number),g.note_numbers);assert.equal(parts.length,g.body_paragraphs.length);for(const row of g.body_paragraphs){assert.equal(digest(parts[row.paragraph]),row.sha256);assert.equal(parts[row.paragraph].split('\n').length,row.lines);paragraphs++;}for(const note of g.notes.filter(n=>n.owner==='poem')){assert.equal(digest(value.translator_notes.find(n=>n.number===note.number).text),note.body_sha256);notes++;}assertScopes(value,p,true);if(value.chapter_summary)for(const row of g.chapter_summary.body_paragraphs)assert.equal(digest(value.chapter_summary.text.split('\n\n')[row.paragraph]),row.sha256);stanzas+=g.physical_stanza_count;}
 assert.deepEqual([stanzas,paragraphs,notes],[114, 141, 67]);
});

test('source-enabled fifth quotation evidence contains only substantive original stanza words',{skip:!checkout},()=>{
 let count=0;
 for(const uid of ids){const p=profile(uid),value=parsed(p),full={...value,translation_id:tid(p),translation_revision:APADANA_COMMIT},quoted=quotationText(full),parts=value.text.split('\n\n'),entries=quoted.split('\n\n');assert.equal(entries.length,p.stanza_layout.length);for(const [i,stanza]of p.stanza_layout.entries()){const marked=parts[i+1].replace(/\[Note \d+\]/g,'').trim();assert.ok(marked.endsWith(stanza.suffix));assert.equal(entries[i],marked.slice(0,-stanza.suffix.length).trim());assert.equal(entries[i].split('\n').length,stanza.lines);count++;}for(const excluded of [parts[0],parts.at(-2),parts.at(-1),value.publisher_paratext,value.chapter_summary?.text,...(value.publisher_divisions||[]).map(s=>s.text)].filter(Boolean))assert.ok(!quoted.includes(excluded));for(const patch of [{translation_scope:{}},{source_section:{}},{partial_scope:{}},{shared_scope:{}},{section:{}},{parts:[]},{whole_unit_coverage:false},{translation_id:'ap:chapter-3/poem-042'},{text:value.text+'Changed'}])assert.throws(()=>quotationText({...full,...patch}),/differs/);}
 assert.equal(count,[114, 141, 67][0]);
});

test('source-enabled fifth raw and profile mutations refuse; held artifacts cannot enter transport',{skip:!checkout},async()=>{
 for(const uid of ids){const p=profile(uid),raw=source(p);for(const changed of [raw+'\n',raw.replace('category: chapter-3','category: chapter-4'),raw.replace(/^order: \d+$/m,'order: 42'),raw.replace(/\[\^1\]:/,'[^999]:')]){assert.notEqual(changed,raw);assert.throws(()=>parseApadana(changed,p),/differs/);}for(const patch of [{id:'tha-ap44'},{poem:p.poem+1},{publisher_chapter:'chapter-4'},{raw_sha256:digest(raw+'\n')},{stanza_layout:[]},{note_numbers:[]},{chapter_summary:null},{publisher_preface:{}},{publisher_divisions:[]}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}),/differs/);}
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Unapproved transport');};
 for(const poem of ['042','061']){const url=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`;assert.equal(isApadanaRawUrl(url),false);await assert.rejects(fetchPublic(url,{json:false}),/outside the supported public sources/);}assert.equal(calls,0);
});

test('source-enabled fifth owner, revision, note and cached disclosure mutations refuse before English transport',{skip:!checkout},async()=>{
 const calls=[];pinnedFetch(calls);const data=canon.load();
 for(const uid of ids){const p=profile(uid),u=data.byId.get(uid),link=data.translations[uid].find(l=>canon.translationId(l)===tid(p)),original=structuredClone(link);assert.ok(link);const refuse=async()=>{for(const patch of [{id:'tha-ap44'},{poem:42},{publisher_chapter:'chapter-4'},{translation_revision:'0'.repeat(40)},{license:'CC0'},{root_sha256:'0'.repeat(64)},{note_numbers:[]},{chapter_summary:null},{publisher_preface:{}},{collection_summary:{}},{publisher_divisions:[]},{partial_scope:{}},{shared_scope:{}}]){Object.assign(link,patch);const before=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,before);}finally{for(const key of Object.keys(link))delete link[key];Object.assign(link,structuredClone(original));}}};await refuse();const valid=await english.translation(u,tid(p),{limit:500,translation_revision:APADANA_COMMIT});await refuse();for(const patch of [{mapping_notes:[]},{notes:[]},{mapping_notes:[],notes:[]},{chapter_summary:null},{publisher_preface:{}},{collection_summary:{}},{publisher_divisions:[]}])assert.throws(()=>validateApadanaChoice({...valid,...patch},uid,true));}
});

test('source-enabled fifth APIs retain pinned continuations and exact note-free apparatus',{skip:!checkout},async()=>{
 pinnedFetch([]);
 for(const uid of ids){const p=profile(uid),u=canon.resolve(uid).unit;const context={uid,choices:english.available(u),accepted:null};for(const choice of [canon.describe(u).english.find(v=>v.translation_id===tid(p)),english.available(u).find(v=>v.translation_id===tid(p))]){assertScopes(choice,p,false);validateApadanaChoice(choice,uid);assert.deepEqual(choice.note_numbers,p.note_numbers);}
  let args={limit:500,translation_revision:APADANA_COMMIT},text='',count=0,first;
  while(args){const value=await english.translation(u,tid(p),args);first??=value;text+=value.text;count++;assertScopes(value,p,true);validateApadanaChoice(value,uid,true);assert.deepEqual(validateEnglishPage(value,{uid,translation:tid(p),...args},context),value.continue_with?.arguments||null);const missing=structuredClone(value);delete missing.translator_notes;assert.throws(()=>validateEnglishPage(missing,{uid,translation:tid(p),...args},context),/translator-note/);for(const translator_notes of [[],value.translator_notes.slice(1),[{...value.translator_notes[0],number:999},...value.translator_notes.slice(1)],[{...value.translator_notes[0],extra:true},...value.translator_notes.slice(1)]])assert.throws(()=>validateEnglishPage({...value,translator_notes},{uid,translation:tid(p),...args},context),/translator-note/);assert.deepEqual(value.mapping_notes,p.mapping_notes);for(const finding of p.mapping_notes)assert.ok(value.notes.includes(finding));assert.deepEqual(value.translator_notes.map(n=>n.number),p.note_numbers);args=value.continue_with?.arguments;}
  assert.ok(count>1);assert.equal(digest(text),p.body_sha256);for(const options of [{offset:500},{translation_revision:'0'.repeat(40)},{allow_partial:true},{allow_shared:true}])await assert.rejects(english.translation(u,tid(p),options));await assert.rejects(english.translation(u,tid(p),{...first.continue_with.arguments,prefix_sha256:'0'.repeat(64)}),/prefix changed/);
  const native=await readPassage({uid,translation:tid(p),englishCharacters:500});assert.ok(!native.english_error,native.english_error);assert.equal(native.text_id,uid);assertScopes(native.english,p,true);validateApadanaChoice(native.english,uid,true);assert.deepEqual(native.english.translator_notes.map(n=>n.number),p.note_numbers);
 }
});

test('source-enabled fifth finite recipes retain original editorial forms and isolate the recitation before stanza15',{skip:!checkout},()=>{
 const upali=parsed(profile('tha-ap43'));assert.ok(upali.publisher_paratext);assert.deepEqual(upali.translator_notes.map(n=>n.number),Array.from({length:14},(_,i)=>i+1));
 const bhaddiya=parsed(profile('tha-ap45')),layout=profile('tha-ap45').stanza_layout;
 assert.match(bhaddiya.text.split('\n\n').at(-1),/^The Legend of /);
 assert.equal(layout[4].lines,6);assert.equal(layout[12].lines,6);assert.equal(layout[12].suffix,'(13) [[1180]');assert.ok(bhaddiya.text.includes('(13) [[1180]'));
 const sannidhapaka=parsed(profile('tha-ap46')),closing=sannidhapaka.text.split('\n\n').slice(-2).join('\n');assert.match(closing,/\[Note 8\]/);assert.match(closing,/\[Note 9\]/);assert.deepEqual(sannidhapaka.translator_notes.slice(-2).map(n=>n.number),[8,9]);
 const padumu=parsed(profile('tha-ap48'));assert.match(padumu.text.split('\n\n').at(-2),/^Thus indeed, /);assert.match(padumu.text.split('\n\n').slice(-2).join('\n'),/Padumu/);
 const walkway=parsed(profile('tha-ap50'));assert.match(walkway.text,/Cankamadāyaka/);assert.doesNotMatch(walkway.text,/\.diacritics|\.no-diacritics/);
 const p=profile('tha-ap51'),subhadda=parsed(p),division=subhadda.publisher_divisions[0];
 assert.deepEqual(Object.keys(p.publisher_divisions[0]),['kind','label','before_local_label','before_publisher_label','body_sha256','notes_sha256','note_numbers']);
 assert.deepEqual([division.before_local_label,division.before_publisher_label],['15','1229']);assert.equal(division.text,'The Fifth Recitation Portion.');assert.deepEqual(division.translator_notes,[]);assert.doesNotMatch(subhadda.text,/Recitation Portion/);assert.equal(subhadda.text.split('\n\n')[15].split('\n').length,4);assert.ok(subhadda.text.split('\n\n')[15].endsWith('(15) [1229]'));
 const fifty=parsed(profile('tha-ap52'));assert.deepEqual(fifty.chapter_summary.text.split('\n\n').map(s=>s.split('\n').length),[1,6,1]);assert.deepEqual([fifty.chapter_summary.root_start,fifty.chapter_summary.root_end,fifty.chapter_summary.first_ref,fifty.chapter_summary.last_ref],[3935,3940,'tha-ap52/23','tha-ap52/25']);assert.deepEqual(fifty.chapter_summary.translator_notes,[]);
 for(const [uid,from,to]of [['tha-ap45','The Legend of','The legend of'],['tha-ap45','\\[\\[1180\\]','\\[1180\\]'],['tha-ap48','Thus indeed,','Thus indeed'],['tha-ap51','The Fifth Recitation Portion.  \n','The Fifth Recitation Portion.\n']]){const p=profile(uid),raw=source(p),changed=raw.replace(from,to);assert.notEqual(raw,changed);assert.throws(()=>parseApadana(changed,p),/differs/);}
});
