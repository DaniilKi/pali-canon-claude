import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import * as canon from '../src/canon.mjs';
import {verifyQuote,detectLanguage} from '../src/verify.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const originalFetch=globalThis.fetch;afterEach(()=>{globalThis.fetch=originalFetch;});
const native=(text,script)=>transliterate(text,'roman',script),tokens=text=>canon.fold(text).split(/[^a-z0-9]+/).filter(Boolean);
const quoteFrom=(ref,count=12)=>canon.segments(canon.resolve(ref).unit).find(s=>s.type!=='heading').text.replace(/<[^>]+>/g,'').split(/\s+/).filter(w=>/\p{L}/u.test(w)).slice(0,count).join(' ');
function source(r){const {quote,input_script,input_romanized,...rest}=r;return rest;}
function cautious(r){assert.equal(r.comparison.method,'normalized_fuzzy');assert.equal(r.comparison.verbatim,'not_assessed');assert.match(r.comparison.note,/similarity of 1.*verbatim wording.*unique source or authorship/);assert.match(r.guidance,/not a judgement about who/);}
const noEnglish=async()=>{throw Error('UNEXPECTED_TRANSLATION_FETCH');};
test('native Pali quotation verification preserves full source matches, repeated-source cautions and original input across eight scripts',async()=>{
 const quote=quoteFrom('Dhp 183'),expected=await verifyQuote({text:quote,language:'pali'},{fetchTranslation:noEnglish});assert.equal(expected.verdict,'found');assert.ok(expected.matches.some(m=>m.text_id==='dhp183'));assert.ok(expected.equally_similar_texts>1);assert.match(expected.citation_note,/not a unique source/);
 for(const script of SCRIPTS)for(const language of ['pali','auto']){const text=native(quote,script),r=await verifyQuote({text,language},{fetchTranslation:noEnglish});assert.deepEqual(source(r),source(expected));assert.equal(r.quote,text);cautious(r);assert.equal(detectLanguage(text),'pali');if(script==='roman')assert.equal(r.input_script,undefined);else{assert.equal(r.input_script,script);assert.deepEqual(tokens(r.input_romanized),tokens(quote));}}
});
test('actual pinned VRI script-edition quotation prefixes match the Roman fixture without claiming native-edition collation',async()=>{
 const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/scripts/vri-pairs.json.gz',import.meta.url))));
 const item=fixture.paragraphs.find(p=>p.rend==='bodytext'&&p.romn.split(/\s+/).length>=20&&!/^Namo tassa/.test(p.romn));assert.ok(item);assert.equal(fixture.source.commit,canon.source().commit);
 const prefix=text=>text.split(/\s+/).filter(w=>/\p{L}/u.test(w)).slice(0,12).join(' '),base=await verifyQuote({text:prefix(item.romn),language:'pali'},{fetchTranslation:noEnglish});assert.equal(base.verdict,'found');
 for(const [code,script]of [['deva','devanagari'],['sinh','sinhala'],['thai','thai'],['mymr','myanmar'],['khmr','khmer']]){const r=await verifyQuote({text:prefix(item[code]),language:'auto'},{fetchTranslation:noEnglish});assert.equal(r.input_script,script);assert.deepEqual(source(r),source(base));cautious(r);}
});
test('punctuation, case and diacritic normalization cannot be described as verbatim proof even at score one',async()=>{
 const quote=quoteFrom('Dhp 183'),changed=canon.fold(quote).toUpperCase().replace(/\s+/g,' , ');assert.notEqual(changed,quote);
 const r=await verifyQuote({text:changed,language:'pali'},{fetchTranslation:noEnglish});assert.equal(r.best_similarity,1);cautious(r);assert.match(r.explanation,/normalized similarity threshold/);assert.doesNotMatch(r.explanation,/exact match|verbatim match/);
 const unknown=await verifyQuote({text:native('papapapapapapa papapapapapapa papapapapapapa','thai'),language:'pali'},{fetchTranslation:noEnglish});assert.equal(unknown.verdict,'not_found_in_scope');cautious(unknown);
});
test('native overlong, incomplete or unsupported quotations fail before matching/fetching and explicit English mode is never reinterpreted',async()=>{
 let fetches=0;const fetchTranslation=async()=>{fetches++;throw Error('unexpected fetch');};
 for(const script of SCRIPTS)for(const language of ['pali','auto'])await assert.rejects(verifyQuote({text:native(Array(121).fill('dhamma').join(' '),script),language},{fetchTranslation}),/120 words.*no partial comparison/);
 for(const text of ['สति สติ สติ','ส่ติ สติ สติ','漢sati sati sati字','ηsati sati sati'])for(const language of ['pali','auto','english'])await assert.rejects(verifyQuote({text,language},{fetchTranslation}),/converted completely/);
 await assert.rejects(verifyQuote({text:native(quoteFrom('Dhp 183'),'thai'),language:'english'},{fetchTranslation}),/Native-script quotation input.*English mode requires/);assert.equal(fetches,0);
});
test('native input retains independent-source boundaries and does not join two texts into an exact source',async()=>{
 const a=canon.resolve('mn1').unit,b=canon.resolve('mn2').unit;assert.equal(a.end,b.start);
 const body=u=>canon.load().canon.books[u.book].blocks.slice(u.start,u.end).map(x=>x[2]).join(' ');
 // Deliberately juxtaposed negative fixture, never presented as a quotation from scripture.
 const query=[...tokens(body(a)).slice(-10),...tokens(body(b)).slice(0,10)].join(' '),expected=await verifyQuote({text:query,language:'pali'},{fetchTranslation:noEnglish});assert.ok(expected.best_similarity<1);
 for(const script of SCRIPTS){const r=await verifyQuote({text:native(query,script),language:'pali'},{fetchTranslation:noEnglish});assert.deepEqual(source(r),source(expected));for(const hit of r.matches){const full=tokens(body(canon.resolve(hit.text_id).unit)).join(' '),excerpt=tokens(hit.matched_text.replace(/…$/,'')).join(' ');assert.ok(full.includes(excerpt));}cautious(r);}
});
test('Roman English verification retains requested source identity and makes normalized comparison explicit',async()=>{
 // Synthetic English review fixture, not scripture or a translation.
 const text='This synthetic review quotation checks that normalized matching preserves the requested source identity and comparison limits.';
 const r=await verifyQuote({text,language:'english',texts:['MN 10']},{fetchTranslation:async(_unit,id)=>({text,translation_id:id,translator:'Synthetic review fixture',url:'https://accesstoinsight.org/fixture.html',attribution:'Synthetic fixture',license:'Fixture',notes:[]})});
 assert.equal(r.language,'english');assert.equal(r.input_script,undefined);assert.equal(r.best_similarity,1);assert.ok(r.scope.translations_checked.every(x=>x.translation_id));cautious(r);
});
test('MCP native Pali returns labelled normalized matches offline and rejects false-mode or partial-comparison requests',async()=>{
 let fetches=0;globalThis.fetch=async()=>{fetches++;throw Error('UNEXPECTED_NETWORK');};const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'native-verify-fixture',version:'1'}),server=createServer();
 try{await Promise.all([client.connect(a),server.connect(b)]);const quote=quoteFrom('Dhp 183');for(const script of SCRIPTS){const text=native(quote,script),r=await client.callTool({name:'verify_quote',arguments:{text,language:'auto'}});assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),JSON.parse(JSON.stringify(r.structuredContent)));assert.equal(r.structuredContent.quote,text);assert.equal(r.structuredContent.language,'pali');assert.ok(r.structuredContent.matches.some(m=>m.text_id==='dhp183'));cautious(r.structuredContent);}
 for(const args of [{text:native(quote,'thai'),language:'english'},{text:native(Array(121).fill('sati').join(' '),'thai'),language:'pali'},{text:'สति สติ สติ'}]){const r=await client.callTool({name:'verify_quote',arguments:args});assert.equal(r.isError,true);assert.ok(JSON.parse(r.content[0].text).error);}assert.equal(fetches,0);
 }finally{await client.close();await server.close();}
});
