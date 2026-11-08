import {test,afterEach} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';import * as english from '../src/english.mjs';import {atiVerseExcerpt} from '../src/ati-excerpt.mjs';import {liveCache} from '../src/cache.mjs';import {verifyQuote} from '../src/verify.mjs';import {translationCoverage} from '../src/providers.mjs';import {dailyText} from '../src/daily.mjs';import {scopeDescriptor,validateEnglishPage} from '../web/translation-policy.mjs';import {atiPartial,html,verse,editorial} from './helpers/ati-partial.mjs';
const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json','utf8')),audit=JSON.parse(readFileSync('docs/data/thag-excerpt-review.json','utf8')),originalFetch=globalThis.fetch;
let saved;function install(owner,links){const d=canon.load();saved||=d.translations;d.translations={...d.translations,[owner]:links};return canon.resolve(owner).unit;}
function provider(body=html){let calls=[];globalThis.fetch=async input=>{calls.push(String(input));assert.equal(String(input),'https://accesstoinsight.org/tipitaka/kn/thag/synthetic-fixture.html');return new Response(body,{status:200});};return calls;}
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});

test('nine pinned verse-only sources are separately counted and Ananda has partial-only English rather than a fabricated whole version',()=>{
 assert.deepEqual(JSON.parse(readFileSync('server/data/reviewed-partial-pages.json','utf8')),manifest);assert.equal(manifest.links.length,9);
 for(const r of manifest.links){const u=canon.resolve(r.unit_id).unit,s=canon.describe(u).english.find(l=>l.translation_id==='ati:'+r.path).translation_scope;assert.equal(s.kind,'partial_unit');assert.equal(s.extractor,'ati-freeverse-v1');assert.equal(s.notice_sha256,r.partial_scope.notice_sha256);assert.equal(s.whole_unit_coverage,false);assert.deepEqual([s.first_ref,s.last_ref],[r.partial_scope.first_ref,r.partial_scope.last_ref]);assert.equal(createHash('sha256').update(JSON.stringify(canon.load().canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),r.root.root_blocks_sha256);}
 const a=canon.describe(canon.resolve('thag17.3').unit);assert.equal(a.english_available,0);assert.equal(a.partial_english_available,1);assert.equal(a.english.length,1);assert.equal(a.english[0].translation_scope.pali_segments,3);
 const b=canon.describe(canon.resolve('thag6.13').unit);assert.equal(b.english_available,2);assert.equal(b.partial_english_available,1);
 const t=translationCoverage({refresh:true}).total;assert.deepEqual([t.links,t.with_english,t.with_english_including_inherited,t.partial_links,t.with_partial_english,t.partial_only],[2566,1416,1839,9,9,3]);const d=dailyText({...canon},{date:'2026-11-01',kind:'sutta'});assert.equal(d.rotation.of,1265);assert.equal(d.text.id,'dn32');
});

test('known pilot sources cannot lose their entire partial container, acquire another owner or downgrade notice/extraction fields',async()=>{
 for(const row of manifest.links){const original=structuredClone(canon.load().translations[row.unit_id].find(l=>l.path===row.path));for(const mutate of [l=>{delete l.partial_scope;},l=>{delete l.partial_scope.notice_sha256;},l=>{delete l.partial_scope.extractor;},l=>{l.partial_scope.notice_sha256='0'.repeat(64);},l=>{l.url+='?bypass=1';},l=>{l.shared_scope={};delete l.partial_scope;},l=>{l.translator='Unreviewed';}]){const bad=structuredClone(original);mutate(bad);const u=install(row.unit_id,[bad]);let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No network');};assert.throws(()=>english.available(u),/Registered partial|Invalid/);await assert.rejects(english.translation(u,'ati:'+row.path,{allow_partial:true}),/Registered partial|Invalid/);assert.throws(()=>translationCoverage({refresh:true}),/Registered partial|Invalid/);assert.throws(()=>dailyText({...canon},{date:'2026-11-01',kind:'sutta'}),/Registered partial|Invalid/);assert.equal(calls,0);canon.load().translations=saved;}
 const wrongOwner=install('thag1.1',[original]);assert.throws(()=>english.available(wrongOwner),/Registered partial/);canon.load().translations=saved;}
});

test('ATI extraction rejects missing, duplicate, nested or malformed boundaries and excludes all editorial prose',()=>{
 assert.equal(atiVerseExcerpt(html),verse);assert.ok(!atiVerseExcerpt(html).includes(editorial));
 for(const body of [html.replace('<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',''),html.replace('<!-- BEGIN COPYRIGHTED TEXT CHUNK -->','<!-- BEGIN COPYRIGHTED TEXT CHUNK --><!-- BEGIN COPYRIGHTED TEXT CHUNK -->'),html.replace('<div class="freeverse">','<div data-class="freeverse">'),html.replace('<div class="freeverse">','<div class="freeverse"><div>Nested</div>'),html.replace('<div class="freeverse">','<div class="freeverse">Other</div><div class="freeverse">'),html.replace('<div class="freeverse">','<div class="freeverse"><script>bad</script>')])assert.throws(()=>atiVerseExcerpt(body),/structure changed/);
});

test('verse-only retrieval has exact consent, full notices, bounded restart and its own cache rather than an article cache',async()=>{
 const link=atiPartial(),u=install('patthana1.1',[link]),id=canon.translationId(link),calls=provider();
 // Synthetic unregistered page only: prime the ordinary article cache and then restore the partial declaration.
 const full={...link};delete full.partial_scope;install(u.id,[full]);const article=await english.translation(u,id);assert.ok(article.text.includes(editorial));install(u.id,[link]);
 for(const [which,options]of [[undefined,{}],[id,{}],[link.translator,{allow_partial:true}]])await assert.rejects(english.translation(u,which,options),/partial/);assert.equal(calls.length,1);
 const first=await english.translation(u,id,{allow_partial:true,limit:80});assert.equal(calls.length,2);assert.equal(first.text,verse.slice(0,80));assert.equal(first.license,english.atiNotice(html).licensing);assert.equal(first.attribution,english.atiNotice(html).citation);assert.ok(!first.text.includes(editorial));const next=await english.translation(u,id,first.continue_with.arguments);assert.equal(next.text,verse.slice(80,160));assert.equal(next.translation_scope.notice_sha256,first.translation_scope.notice_sha256);assert.equal(calls.length,2);
 const choice=canon.describe(u).english[0],descriptor=scopeDescriptor(choice,u.id);assert.equal(descriptor.kind,'partial_unit');const display=await english.translation(u,id,{allow_partial:true,limit:500});assert.ok(validateEnglishPage(display,{translation:id,offset:0,...descriptor.flags},{uid:u.id,choices:[choice],accepted:descriptor}));
});

test('editorial-only quotations cannot verify against the partial scripture while its synthetic verses can',async()=>{
 const l=atiPartial(),u=install('patthana1.1',[l]);provider();const args={language:'english',texts:[u.id],translation_ids:[canon.translationId(l)],include_partial:true};const found=await verifyQuote({...args,text:'Synthetic fixture only amber lantern copper window'});assert.equal(found.verdict,'found');assert.ok(found.matches.every(m=>m.translation_scope?.kind==='partial_unit'));const absent=await verifyQuote({...args,text:editorial});assert.equal(absent.verdict,'not_found_in_scope');assert.ok(absent.matches.every(m=>!m.matched_words.includes('purple zeppelins')));assert.equal(absent.scope.translations_checked.length,1);
});

test('notice/text pins are checked before wording, including cached and fresh continuations; failures never introduce fallback',async()=>{
 const l=atiPartial(),u=install('patthana1.1',[l]),id=canon.translationId(l);provider();const first=await english.translation(u,id,{allow_partial:true,limit:80});const cached=await liveCache.wrap('ati-verse-partial:'+l.path,()=>{throw Error('Expected cache');});cached.license+=' changed';await assert.rejects(english.translation(u,id,first.continue_with.arguments),/partial source notice changed/);
 liveCache.clear();provider(html.replace('Synthetic fixture author.','Changed fixture notice.'));await assert.rejects(english.translation(u,id,first.continue_with.arguments),/partial source notice changed/);
 liveCache.clear();provider(html.replace('amber','changed'));await assert.rejects(english.translation(u,id,{allow_partial:true}),/source text changed/);
 liveCache.clear();const calls=provider(html.replace('<div class="freeverse">','<div class="other">'));await assert.rejects(english.translation(u,id,{allow_partial:true}),/structure changed/);assert.equal(calls.length,1);
});

test('an ATI partial declaration cannot omit notice/extractor metadata or use an unreviewed URL',()=>{
 const l=atiPartial();for(const mutate of [x=>{delete x.partial_scope.notice_sha256;},x=>{delete x.partial_scope.extractor;},x=>{x.partial_scope.notice_sha256='bad';},x=>{x.url=x.url.replace('https:','http:');},x=>{x.url+='?query=1';},x=>{x.path='/tipitaka/../escape';}]){const bad=structuredClone(l);mutate(bad);const u=install('patthana1.1',[bad]);assert.throws(()=>english.available(u),/Invalid or unreviewed/);}
});

const expansion=JSON.parse(readFileSync('docs/data/olendzki-excerpt-expansion.json','utf8'));
test('four newly reviewed pages retain exact verse boundaries, full-root pins and all prior complete alternatives',()=>{
 assert.deepEqual(expansion.rows.map(r=>[r.owner,r.manifest.partial_scope.first_ref,r.manifest.partial_scope.last_ref]),[['thag10.1','thag10.1/3','thag10.1/5'],['thag15.2','thag15.2/13','thag15.2/14'],['thag16.8','thag16.8/7','thag16.8/9'],['thag2.13','thag2.13/2','thag2.13/2']]);
 const exclusions=JSON.parse(readFileSync('scripts/canon/reviewed_exclusions.json','utf8'));
 for(const r of expansion.rows){const row=manifest.links.find(l=>l.unit_id===r.owner);assert.deepEqual(row,r.manifest);const u=canon.resolve(r.owner).unit,choices=canon.describe(u).english,choice=choices.find(l=>l.translation_id==='ati:'+row.path);assert.equal(choice.translation_scope.kind,'partial_unit');assert.equal(choice.translation_scope.pali_segments,r.pali_segments);assert.equal(choice.translation_scope.whole_unit_coverage,false);assert.deepEqual(choices.filter(l=>!l.translation_scope).map(l=>l.translation_id),r.ordinary_alternatives_before);assert.ok(!exclusions.exclusions.some(e=>e.url===r.source_url));const selected=canon.segments(u).filter(s=>s.ref===row.partial_scope.first_ref||s.ref===row.partial_scope.last_ref);assert.deepEqual(selected.map(s=>s.vri_paragraph),r.owner==='thag2.13'?['145']:r.selected_vri_verses.split('–'));}
 assert.equal(expansion.rows.filter(r=>r.before_link).length,1);assert.equal(expansion.rows.find(r=>r.owner==='thag2.13').before_link.reference,'Thag 145');
});
