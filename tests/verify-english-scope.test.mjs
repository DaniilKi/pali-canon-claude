import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {englishScope,verifyQuote} from '../src/verify.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {liveCache} from '../src/cache.mjs';
const oldFetch=globalThis.fetch;afterEach(()=>{globalThis.fetch=oldFetch;liveCache.clear();});
// Synthetic review English, not scripture or a translation.
const quote='This synthetic review quotation has distinctive ordered tokens for testing the actual English source scope safely';
const page=(id,extra={})=>({text:quote,translation_id:id,translator:'Synthetic fixture',url:'https://accesstoinsight.org/fixture.html',attribution:'Synthetic fixture',license:'Fixture',notes:[],...extra});
const native=(s,script)=>transliterate(s,'roman',script);
test('English scope rejects synthetic multi-text spans, ambiguous pages and invalid boundaries before any translation fetch',async()=>{
 let fetches=0;const fetchTranslation=async(_u,id)=>{fetches++;return page(id);};
 for(const script of SCRIPTS)for(const ref of ['AN 3.65-66','S i 57','AN 3.65-9999','AN 3.65-3.64'])await assert.rejects(verifyQuote({text:quote,language:'english',texts:['MN 10',native(ref,script)]},{fetchTranslation}),/spans multiple texts|multiple canonical passages|endpoint|reversed range/);
 assert.equal(fetches,0);
});
test('exact indexed groups, identical endpoints, default scope and unique page aliases retain correct planned source versions',()=>{
 const direct=englishScope(['AN 3.65']),unique=englishScope(['A i 189']),same=englishScope(['AN 3.65-65']);
 assert.deepEqual(unique.pages.map(p=>p.translation_id),direct.pages.map(p=>p.translation_id));assert.deepEqual(same.pages.map(p=>p.translation_id),direct.pages.map(p=>p.translation_id));
 assert.equal(englishScope(['AN 1.296-305']).requested_texts[0].text_id,'an1.296-305');assert.equal(englishScope(['Dhp 179-196']).requested_texts[0].translation_scope.kind,'direct');
 assert.match(same.requested_texts[0].notes.join(' '),/identical endpoints/);assert.match(unique.requested_texts[0].notes.join(' '),/PTS A i 189/);assert.match(unique.requested_texts[0].notes.join(' '),/Also numbered AN 3.66/);
 const def=englishScope();assert.ok(def.pages.length>=26&&def.pages.length<=80);assert.equal(def.requested_texts,undefined);assert.equal(new Set(def.pages.map(p=>p.url)).size,def.pages.length);
});
test('native English-scope citations have independent per-reference provenance and unchanged returned-version plans across eight scripts',async()=>{
 const baseline=englishScope(['AN 3.65']);for(const script of SCRIPTS){const ref=native('AN 3.65',script),r=await verifyQuote({text:quote,language:'english',texts:[ref]},{fetchTranslation:async(_u,id)=>page(id)}),record=r.scope.requested_texts[0];
  assert.equal(r.quote,quote);assert.equal(r.language,'english');assert.equal(r.input_script,undefined);assert.equal(record.reference,ref);assert.equal(record.text_id,'an3.65');assert.equal(record.input_script,script==='roman'?undefined:script);assert.deepEqual(r.scope.translations_checked.map(p=>p.translation_id),baseline.pages.map(p=>p.translation_id));assert.match(record.notes.join(' '),/Also numbered AN 3.66/);
 }
 const handwritten=englishScope(['AN ๓.๖๕']);assert.equal(handwritten.requested_texts[0].input_romanized,'AN 3.65');
 for(const ref of ['AN ๓.६५','漢AN 3.65字','ηAN 3.65'])assert.throws(()=>englishScope([ref]),/converted completely/);
});
test('a containing-chapter match cannot be labelled as verified correspondence to a requested verse',async()=>{
 const inherited=await verifyQuote({text:quote,language:'english',texts:['Dhp 183']},{fetchTranslation:async(_u,id)=>page(id)});
 assert.equal(inherited.verdict,'found');assert.equal(inherited.best_similarity,1);assert.equal(inherited.comparison.verbatim,'not_assessed');assert.match(inherited.explanation,/containing source.*narrower requested text is not verified/);
 const request=inherited.scope.requested_texts[0];assert.equal(request.text_id,'dhp183');assert.equal(request.translation_scope.kind,'inherited_container');assert.equal(request.translation_scope.text_id,'dhp179-196');
 for(const m of [...inherited.matches,...inherited.scope.translations_checked]){assert.equal(m.text_id||canon.resolve(m.citation).unit.id,'dhp179-196');assert.deepEqual(m.unverified_requested_text_ids,['dhp183']);assert.deepEqual(m.requested_text_ids,['dhp183']);assert.match(m.scope_notes.join(' '),/does not verify correspondence/);}
 const exact=await verifyQuote({text:quote,language:'english',texts:['Dhp 179-196']},{fetchTranslation:async(_u,id)=>page(id)});assert.equal(exact.matches[0].text_id,'dhp179-196');assert.equal(exact.matches[0].unverified_requested_text_ids,undefined);assert.doesNotMatch(exact.explanation,/narrower requested text/);
});
test('duplicate aliases and shared containers retain every request context without duplicate source fetches or false unverified flags',async()=>{
 const plan=englishScope(['Dhp 183','Dhp 184','Dhp 179-196']);assert.equal(new Set(plan.pages.map(p=>p.url)).size,plan.pages.length);assert.deepEqual(plan.pages[0].requested_text_ids,['dhp183','dhp184','dhp179-196']);assert.deepEqual(plan.pages[0].unverified_requested_text_ids,['dhp183','dhp184']);assert.equal(plan.requested_texts[2].translation_scope.kind,'direct');
 let fetched=0;const r=await verifyQuote({text:quote,language:'english',texts:['AN 3.65','A i 189','AN ๓.๖๕']},{fetchTranslation:async(_u,id)=>{fetched++;return page(id);}});assert.equal(r.scope.requested_texts.length,3);assert.equal(fetched,englishScope(['AN 3.65']).pages.length);for(const p of r.scope.translations_checked){assert.deepEqual(p.requested_text_ids,['an3.65']);assert.equal(p.unverified_requested_text_ids,undefined);assert.match(p.scope_notes.join(' '),/PTS A i 189/);assert.match(p.scope_notes.join(' '),/Also numbered AN 3.66/);assert.equal(new Set(p.scope_notes).size,p.scope_notes.length);}
});
test('resolution context remains separate from actual fallback identity, provider notes and unavailable requested versions',async()=>{
 const requested=englishScope(['A i 189']).pages[0].translation_id,actual='ati:/fixture/earlier-version',note='Synthetic primary outage; earlier version returned.';
 const r=await verifyQuote({text:quote,language:'english',texts:['A i 189']},{fetchTranslation:async(_u,id)=>{if(id!==requested)throw Error('Synthetic unavailable source');return page(actual,{notes:[note]});}});
 for(const m of [r.matches[0],r.scope.translations_checked[0]]){assert.equal(m.translation_id,actual);assert.equal(m.requested_translation_id,requested);assert.deepEqual(m.notes,[note]);assert.match(m.scope_notes.join(' '),/PTS A i 189/);assert.match(m.scope_notes.join(' '),/Also numbered AN 3.66/);}
 assert.ok(r.scope.not_retrieved.length);for(const p of r.scope.not_retrieved){assert.ok(p.translation_id);assert.match(p.scope_notes.join(' '),/PTS A i 189/);}
 const unlinked=englishScope(['Pj 1','AN 3.65']);assert.equal(unlinked.requested_texts[0].translation_scope.kind,'unavailable');assert.ok(unlinked.withoutEnglish.includes('Bu Pj 1'));
});
test('MCP native scope and inherited matches are labelled, while broad requests fail without partial fetching',async()=>{
 let fetched=0;globalThis.fetch=async()=>{fetched++;return new Response(`<body>${quote}</body>`);};const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'english-scope-contract',version:'1'}),server=createServer();
 try{await Promise.all([client.connect(a),server.connect(b)]);
  const call=args=>client.callTool({name:'verify_quote',arguments:{text:quote,language:'english',...args}});
  for(const texts of [['MN 10','AN 3.65-66'],['S i 57'],['AN ๓.६५']]){const r=await call({texts});assert.equal(r.isError,true);assert.ok(JSON.parse(r.content[0].text).error);}assert.equal(fetched,0);
  const r=await call({texts:['Dhp ๑๘๓']});assert.ok(!r.isError,JSON.stringify(r.content));const d=r.structuredContent;assert.equal(d.scope.requested_texts[0].input_script,'thai');assert.equal(d.scope.requested_texts[0].text_id,'dhp183');assert.ok(d.matches.every(p=>p.text_id==='dhp179-196'));assert.match(d.explanation,/not verified/);assert.deepEqual(JSON.parse(r.content[0].text),JSON.parse(JSON.stringify(d)));
 }finally{await client.close();await server.close();}
});
