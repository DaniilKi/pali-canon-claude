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
import {fetchPublic} from '../src/http.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {readPassage, WIDGET_URI} from '../src/chatgpt-widget.mjs';
import {validateApadanaChoice} from '../web/translation-policy.mjs';

const ids = ['tha-ap33','tha-ap34','tha-ap35','tha-ap36','tha-ap37','tha-ap38','tha-ap39','tha-ap40','tha-ap41','tha-ap42'];
const gold = JSON.parse(readFileSync('docs/evidence/apadana/THERA_NEXT_GOLDENS.json','utf8'));
const review = JSON.parse(readFileSync('docs/evidence/apadana/THERA_NEXT_SOURCE_REVIEW.json','utf8'));
const checkout = process.env.APADANA_SOURCE_CHECKOUT, originalFetch = globalThis.fetch;
afterEach(() => {globalThis.fetch = originalFetch;});
const profile = uid => APADANA_PROFILES[uid], tid = p => canon.translationId(p);
const source = p => readFileSync(join(checkout,'src/_poems',p.path.replace(/^\/text\//,'').replace(/\/$/,'.md')),'utf8');
const parsed = p => parseApadana(source(p),p);
const pins = ['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'];
function pinnedFetch(calls) {
 globalThis.fetch = async url => {const p = Object.values(APADANA_PROFILES).find(row => row.raw_url === url.href);assert.ok(p,'Only exact reviewed artifacts may be fetched');calls.push(p.id);return new Response(source(p));};
}
function quoteResult(p,value) {return {...value,translation_id:tid(p),translation_revision:APADANA_COMMIT,translator:p.translator,url:p.url,offset:0,next_offset:null,attribution:'Pinned source fixture',license:APADANA_LICENSE};}
function assertScopes(value,p,content) {
 for (const key of ['publisher_preface','publisher_divisions','collection_summary']) assert.equal(Object.hasOwn(value,key),false,`${p.id} has no ${key}`);
 assert.equal(Object.hasOwn(value,'chapter_summary'),p.id==='tha-ap42');
 if (p.chapter_summary) {
  const {text,translator_notes,...descriptor}=value.chapter_summary;assert.deepEqual(descriptor,p.chapter_summary);
  if(content){assert.equal(digest(text),p.chapter_summary.body_sha256);assert.deepEqual(translator_notes,[]);}else{assert.equal(text,undefined);assert.equal(translator_notes,undefined);}
 }
}

const laterApproved=['tha-ap43','tha-ap45','tha-ap46','tha-ap47','tha-ap48','tha-ap49','tha-ap50','tha-ap51','tha-ap52','tha-ap53','tha-ap54','tha-ap55','tha-ap56','tha-ap57','tha-ap58','tha-ap59','tha-ap60','tha-ap61','tha-ap62'];

test('current finite profiles preserve all sixty prior profiles, links and Pāli while adding ten literal mappings',()=>{
 const previous=Object.fromEntries(Object.entries(APADANA_PROFILES).filter(([id])=>!ids.includes(id)&&!laterApproved.includes(id)));
 assert.equal(Object.keys(APADANA_PROFILES).length,89);assert.equal(Object.keys(THERA_APADANA_PROFILES).length,49);
 assert.equal(digest(JSON.stringify(previous)),'a89428a9f4828f809469a4900d6b2d62bfa4a8a8056f0b263a5ffb24fce86c67');
 const data=canon.load(),pali=Object.fromEntries(Object.keys(previous).map(id=>[id,digest(JSON.stringify(canon.segments(data.byId.get(id))))]));
 assert.equal(digest(JSON.stringify(pali)),'fe325b12c2ed573d6f319e3e78a5519ae0530128401bfe8f49c74d4c7f79902f');
 const manifest=JSON.parse(readFileSync('server/data/apadana.json','utf8'));
 assert.equal(digest(JSON.stringify(Object.fromEntries(Object.entries(manifest.links).filter(([id])=>!ids.includes(id)&&!laterApproved.includes(id))))),'1ce034f4c1243f45371fed2c8e523e69171f444e339580418d25311704ec9a2c');
 assert.deepEqual(gold.poems.map(g=>g.id),ids);
 for(const g of gold.poems){const p=profile(g.id),u=data.byId.get(g.id),book=data.canon.books[u.book];assert.equal(p.id,g.id);assert.equal(p.poem,g.poem);assert.equal(p.publisher_chapter,'chapter-3');assert.ok(Object.isFrozen(p));validateLink(p,p.id,u,book);for(const key of pins)assert.equal(p[key],key==='root_sha256'?g.root.root_sha256:g[key]);assert.equal(rootDigest(u,book),g.root.root_sha256);assert.deepEqual(p.note_numbers,g.note_numbers);assert.deepEqual(p.stanza_layout,g.stanza_layout);assert.equal(u.index_revision,undefined);for(const finding of review.poems.find(row=>row.id===g.id).edition_findings)assert.ok(p.mapping_notes.includes(finding));}
 assert.deepEqual([profile('tha-ap33').poem,profile('tha-ap42').poem],[31,40]);assert.equal(profile('tha-ap44'),undefined);
 const scope=profile('tha-ap42').chapter_summary;assert.deepEqual([scope.root_start,scope.root_end,scope.first_ref,scope.last_ref],[3475,3480,'tha-ap42/10','tha-ap42/12']);assert.deepEqual(scope.note_numbers,[]);
});

test('source-enabled exact Git blobs reproduce 111 stanza entries, 141 paragraphs and 53 poem-owned notes', {skip:!checkout},()=>{
 let stanzas=0,paragraphs=0,notes=0;
 for(const artifact of [...gold.rights,gold.publisher_routing]){const raw=readFileSync(join(checkout,artifact.path));assert.equal(digest(raw),artifact.raw_sha256);assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),artifact.git_blob_sha1);}
 for(const g of gold.poems){const p=profile(g.id),raw=source(p),value=parsed(p),parts=value.text.split('\n\n');assert.equal(digest(raw),g.raw_sha256);assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(raw)+'\0').update(raw).digest('hex'),g.git_blob_sha1);assert.equal(digest(value.text),g.body_sha256);assert.equal(digest(JSON.stringify(value.translator_notes)),g.notes_sha256);assert.equal(digest(value.publisher_paratext),g.paratext_sha256);assert.equal(Boolean(value.publisher_paratext),p.id==='tha-ap33');assert.deepEqual(value.translator_notes.map(n=>n.number),g.note_numbers);assert.equal(parts.length,g.body_paragraphs.length);for(const row of g.body_paragraphs){assert.equal(digest(parts[row.paragraph]),row.sha256);assert.equal(parts[row.paragraph].split('\n').length,row.lines);paragraphs++;}for(const note of g.notes){assert.equal(note.owner,'poem');assert.equal(digest(value.translator_notes.find(n=>n.number===note.number).text),note.body_sha256);notes++;}assertScopes(value,p,true);if(value.chapter_summary)for(const row of g.chapter_summary.paragraphs)assert.equal(digest(value.chapter_summary.text.split('\n\n')[row.paragraph]),row.sha256);stanzas+=g.physical_stanza_count;}
 assert.deepEqual([stanzas,paragraphs,notes],[111,141,53]);
});

test('source-enabled finite presentation preserves original capitalization, typo, combined entries and scoped paired displays',{skip:!checkout},()=>{
 assert.match(parsed(profile('tha-ap33')).text.split('\n\n').at(-1),/^The Legend of /);
 assert.match(parsed(profile('tha-ap34')).text.split('\n\n').at(-2),/^This indeed /);
 assert.match(parsed(profile('tha-ap35')).text.split('\n\n').at(-1),/is finshed\.$/);
 const combined=profile('tha-ap36').stanza_layout.filter(s=>s.lines===8);assert.deepEqual(combined.map(s=>s.local_label),['1-2','6-7']);assert.deepEqual(combined.map(s=>s.publisher_label),['1050-1051','1055-1056']);
 const forty=parsed(profile('tha-ap42'));assert.match(forty.text,/Sucela/);assert.match(forty.chapter_summary.text,/Kaccāna/);assert.match(forty.chapter_summary.text,/Dhammacakkhika/);assert.doesNotMatch(forty.text+forty.chapter_summary.text,/<span|chch/);assert.deepEqual(forty.chapter_summary.translator_notes,[]);assert.deepEqual(forty.chapter_summary.text.split('\n\n').map(s=>s.split('\n').length),[1,6,1]);
 const audio=parsed(profile('tha-ap37'));assert.equal(Object.keys(audio).some(key=>/audio|record|media/i.test(key)),false);assert.doesNotMatch(audio.text,/https?:\/\/|<audio/);
 for(const [uid,from,to] of [['tha-ap33','The Legend of','The legend of'],['tha-ap34','This indeed','Thus indeed'],['tha-ap35','finshed.','finished.'],['tha-ap42','>cc</span>','>chch</span>']]){const p=profile(uid),raw=source(p),changed=raw.replace(from,to);assert.notEqual(changed,raw);assert.throws(()=>parseApadana(changed,p),/differs/);}
});

test('source-enabled original stanza words alone enter quotation evidence; forged AP scopes and unknown selectors refuse',{skip:!checkout},async()=>{
 let count=0;
 for(const uid of ids){const p=profile(uid),value=parsed(p),full=quoteResult(p,value),quoted=quotationText(full),parts=value.text.split('\n\n'),entries=quoted.split('\n\n');assert.equal(entries.length,p.stanza_layout.length);for(const [i,stanza]of p.stanza_layout.entries()){const marked=parts[i+1].replace(/\[Note \d+\]/g,'').trim();assert.ok(marked.endsWith(stanza.suffix));assert.equal(entries[i],marked.slice(0,-stanza.suffix.length).trim());assert.equal(entries[i].split('\n').length,stanza.lines);count++;}for(const excluded of [parts[0],parts.at(-2),parts.at(-1),value.publisher_paratext,value.chapter_summary?.text].filter(Boolean))assert.ok(!quoted.includes(excluded));for(const patch of [{translation_scope:{}},{source_section:{}},{partial_scope:{}},{shared_scope:{}},{section:{}},{parts:[]},{whole_unit_coverage:false},{translation_id:'ap:chapter-3/poem-999'},{text:value.text+'Changed'}])assert.throws(()=>quotationText({...full,...patch}),/differs/);}
 assert.equal(count,111);
 for(const translation_id of [' ap:chapter-3/poem-999 ',' AP:chapter-3/poem-999 ',' ap:chapter-4/poem-001 '])assert.throws(()=>quotationText({translation_id,text:'Synthetic unreviewed stanza (1) [1]'}),/differs/);
 // The first ten legacy Therī poems use the older range-based extractor and must remain usable.
 const legacy=profile('thi-ap1'),old=quoteResult(legacy,parsed(legacy));assert.ok(quotationText(old));assert.throws(()=>quotationText({...old,translation_scope:{}}),/differs/);
 const p=profile('tha-ap42'),value=parsed(p),full=quoteResult(p,value),query=quotationText(full).split('\n\n')[0];
 const verify=patch=>verifyQuote({text:query,language:'english',texts:[p.id],translation_ids:[tid(p)]},{fetchTranslation:async()=>({...full,...patch})});
 assert.equal((await verify({})).verdict,'found');for(const patch of [{translation_scope:{}},{source_section:{}},{translation_id:'ap:chapter-3/poem-999'},{translation_revision:'0'.repeat(40)}])await assert.rejects(verify(patch),/None of the translations in scope could be retrieved completely/);
 const summary=await verifyQuote({text:value.chapter_summary.text,language:'english',texts:[p.id],translation_ids:[tid(p)]},{fetchTranslation:async()=>full});assert.equal(summary.verdict,'not_found_in_scope');
});

test('source-enabled owner and scope mutations refuse before transport both before and after a successful English retrieval',{skip:!checkout},async()=>{
 const calls=[];pinnedFetch(calls);const data=canon.load();
 for(const uid of ids){const p=profile(uid),u=data.byId.get(uid),link=data.translations[uid].find(l=>canon.translationId(l)===tid(p)),original=structuredClone(link);assert.ok(link);const patches=[{id:'tha-ap32'},{poem:p.poem+1},{publisher_chapter:'chapter-4'},{path:profile('thi-ap1').path},{translation_revision:'0'.repeat(40)},{license:'CC0'},{root_sha256:'0'.repeat(64)},{chapter_summary:null},{publisher_preface:{}},{collection_summary:{}},{partial_scope:{}},{shared_scope:{}}];const refuse=async()=>{for(const patch of patches){Object.assign(link,patch);const before=calls.length;try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,before);}finally{for(const key of Object.keys(link))delete link[key];Object.assign(link,structuredClone(original));}}};await refuse();const valid=await english.translation(u,tid(p),{limit:500,translation_revision:APADANA_COMMIT});assert.equal(valid.translation_id,tid(p));await refuse();}
 const p=profile(ids[0]),foreign=p.raw_url.replace('poem-031','poem-042'),before=calls.length;assert.equal(isApadanaRawUrl(foreign),false);await assert.rejects(fetchPublic(foreign,{json:false}),/outside the supported public sources/);assert.equal(calls.length,before);
});

test('source-enabled APIs retain complete continuations, mandatory caveats and exact copied apparatus',{skip:!checkout},async()=>{
 const calls=[];pinnedFetch(calls);
 for(const uid of ids){const p=profile(uid),u=canon.resolve(uid).unit;for(const choice of [canon.describe(u).english.find(v=>v.translation_id===tid(p)),english.available(u).find(v=>v.translation_id===tid(p))]){assertScopes(choice,p,false);validateApadanaChoice(choice,uid);assert.deepEqual(choice.note_numbers,p.note_numbers);}
  let args={limit:500,translation_revision:APADANA_COMMIT},text='',count=0,first;
  while(args){const value=await english.translation(u,tid(p),args);first??=value;text+=value.text;count++;assertScopes(value,p,true);validateApadanaChoice(value,uid,true);assert.deepEqual(value.mapping_notes,p.mapping_notes);for(const finding of p.mapping_notes)assert.ok(value.notes.includes(finding));assert.deepEqual(value.translator_notes.map(n=>n.number),p.note_numbers);args=value.continue_with?.arguments;}
  assert.ok(count>1);assert.equal(digest(text),p.body_sha256);const before=calls.length;for(const options of [{offset:500},{translation_revision:'0'.repeat(40)},{allow_partial:true},{allow_shared:true}])await assert.rejects(english.translation(u,tid(p),options));assert.equal(calls.length,before);await assert.rejects(english.translation(u,tid(p),{...first.continue_with.arguments,prefix_sha256:'0'.repeat(64)}),/prefix changed/);
  for(const patch of [{mapping_notes:[]},{notes:[]},{mapping_notes:[],notes:[]},{chapter_summary:null},{publisher_preface:{}},{collection_summary:{}}])assert.throws(()=>validateApadanaChoice({...first,...patch},uid,true));
 }
});

test('source-enabled native reading API carries the finite new owners and separate note-free summary',{skip:!checkout},async()=>{
 pinnedFetch([]);assert.match(WIDGET_URI,/reader-v\d+\.html$/);
 for(const uid of ids){const p=profile(uid),value=await readPassage({uid,translation:tid(p),englishCharacters:500});assert.ok(!value.english_error,value.english_error);assert.equal(value.text_id,uid);assert.equal(value.english.translation_id,tid(p));assertScopes(value.english,p,true);validateApadanaChoice(value.english,uid,true);assert.deepEqual(value.english.translator_notes.map(n=>n.number),p.note_numbers);assert.equal(Boolean(value.english.publisher_paratext),uid==='tha-ap33');if(value.english.continue_with)assert.equal(value.english.continue_with.arguments.english_translation_revision,APADANA_COMMIT);}
});
