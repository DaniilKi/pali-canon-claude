import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {buildIndex} from '../scripts/export-index.mjs';
import {liveCache} from '../src/cache.mjs';
const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json'));
const rows=manifest.links.filter(r=>['an5.254','sn56.102'].includes(r.owner_id));
const originals={fetch:globalThis.fetch};let saved;
afterEach(()=>{globalThis.fetch=originals.fetch;liveCache.clear();if(saved)canon.load().translations=saved;saved=undefined;translationCoverage({refresh:true});});
const sets=[['an5.254','an5.255','an5.256','an5.257-263','an5.264','an5.265-271'],['sn56.102','sn56.103','sn56.104','sn56.105-107','sn56.108-110','sn56.111-113']];

test('condensed pages bind twelve actual source records, including five primary peyyala ranges, not thirty individual translations',()=>{
 assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.text_ids),sets);
 const d=canon.load();
 for(const row of rows){
  assert.equal(row.presentation,'condensed');
  const selected=row.root_units.map(proof=>{const u=d.byId.get(proof.id);assert.ok(u);assert.equal(u.approximate,undefined);assert.equal(u.kind,undefined);assert.equal(u.members,undefined);assert.equal(u.title,proof.title);assert.equal(u.vri,proof.vri);assert.equal(createHash('sha256').update(JSON.stringify(d.canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),proof.root_blocks_sha256);return{id:u.id,segments:canon.segments(u).map(({ref,type,text})=>({ref,type,text}))};});assert.equal(scopeHash(selected),row.pali_segments_sha256);
  for(const uid of row.text_ids){const m=canon.describe(d.byId.get(uid));assert.equal(m.english_available,0);assert.equal(m.shared_english_available,1);const scope=m.english.find(l=>l.translation_id==='ati:'+row.path).translation_scope;assert.equal(scope.presentation,'condensed');assert.equal(scope.condensed,true);assert.equal(scope.whole_unit_coverage,false);assert.equal(scope.individual_alignment_verified,false);assert.deepEqual(scope.text_ids,row.text_ids);assert.deepEqual(scope.pali_readings.map(r=>r.uid),row.text_ids);assert.match(scope.note,/Do not expand/);}
 }
 saved=d.translations;const before=translationCoverage({refresh:true}).total;d.translations={...saved};for(const row of rows)delete d.translations[row.owner_id];const after=translationCoverage({refresh:true}).total;for(const k of ['links','with_english','with_english_including_inherited'])assert.equal(before[k],after[k]);assert.equal(before.shared_links,after.shared_links+2);assert.equal(before.with_shared_english,after.with_shared_english+12);assert.equal(before.shared_only,after.shared_only+12);
});

test('range child citations resolve to primary grouped records without invented separate English members',()=>{
 for(const[child,group]of [['an5.257','an5.257-263'],['an5.263','an5.257-263'],['an5.265','an5.265-271'],['an5.271','an5.265-271'],['sn56.105','sn56.105-107'],['sn56.107','sn56.105-107'],['sn56.108','sn56.108-110'],['sn56.110','sn56.108-110'],['sn56.111','sn56.111-113'],['sn56.113','sn56.111-113']]){const u=canon.resolve(child).unit;assert.equal(u.id,group);assert.notEqual(u.id,child);const s=canon.describe(u).english[0].translation_scope;assert.ok(s.text_ids.includes(group));assert.equal(s.text_ids.includes(child),false);assert.equal(s.individual_alignment_verified,false);}
 for(const uid of ['an5.253','an5.272','sn56.101','sn56.114-116']){const m=canon.describe(canon.resolve(uid).unit);assert.equal(m.english.some(l=>rows.some(r=>l.translation_id==='ati:'+r.path)),false);}
 const exported=buildIndex();for(const row of rows)for(const t of exported.texts.filter(t=>row.text_ids.includes(t.id)))assert.equal(t.english_count,0);
});

test('condensed sources require exact consent before fetching and reject complete-notice drift',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No implicit network');};
 for(const row of rows){const id='ati:'+row.path;for(const uid of row.text_ids){await assert.rejects(english.translation(canon.resolve(uid).unit,id),/allow_shared/);await assert.rejects(english.translation(canon.resolve(uid).unit),/shared|scoped/);}assert.throws(()=>canon.resolve('https://accesstoinsight.org'+row.path+'.html'),/Shared-page URL/);await assert.rejects(verifyQuote({text:'Synthetic quoted phrase',language:'english',texts:[row.owner_id],translation_ids:[id]}),/include_shared/);}
 assert.equal(calls,0);
});

test('group-child requests retain page-only quotation identity, abbreviated scope and pinned continuation using synthetic providers',async()=>{
 saved=canon.load().translations;canon.load().translations=structuredClone(saved);
 for(const row of rows){
  const id='ati:'+row.path,text=('Synthetic source only: copper lantern by the purple window. '.repeat(35)).trim(),html=`<!-- BEGIN COPYRIGHTED TEXT CHUNK -->${text}<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic test notice, not an actual licence.</div><div id="F_citation">Synthetic attribution.</div>`;
  const link=canon.load().translations[row.owner_id].find(l=>l.path===row.path);link.shared_scope.text_sha256=scopeHash(text);link.shared_scope.notice_sha256=scopeHash(english.atiNotice(html));globalThis.fetch=async()=>new Response(html);liveCache.clear();
  const child=row.owner_id==='an5.254'?'an5.263':'sn56.113',u=canon.resolve(child).unit;
  const r=await english.translation(u,id,{allow_shared:true,limit:500});assert.equal(r.text_id,null);assert.equal(r.requested_text_id,u.id);assert.notEqual(r.requested_text_id,child);assert.equal(r.translation_scope.condensed,true);assert.equal(r.whole_unit_coverage,false);assert.equal(r.text,text.slice(0,500));
  const{uid,translation,...args}=r.continue_with.arguments;assert.equal(uid,u.id);const next=await english.translation(canon.resolve(uid).unit,translation,args);assert.equal(next.text,text.slice(500,1000));
  const q={text:'copper lantern by the purple window',language:'english',texts:[child],translation_ids:[id],include_shared:true};const yes=await verifyQuote(q);assert.equal(yes.verdict,'found');assert.equal(yes.matches[0].text_id,null);assert.equal(yes.matches[0].whole_unit_coverage,false);assert.deepEqual(yes.matches[0].translation_scope.text_ids,row.text_ids);assert.match(yes.explanation,/do not establish any individual/);
  const no=await verifyQuote({...q,text:'Green otters juggle invisible zeppelins'});assert.equal(no.verdict,'not_found_in_scope');assert.match(no.explanation,/do not establish any individual/);
  liveCache.clear();globalThis.fetch=async()=>new Response(html.replace('Synthetic test notice','Changed notice'));await assert.rejects(english.translation(u,id,{allow_shared:true}),/notice changed/);
 }
});
