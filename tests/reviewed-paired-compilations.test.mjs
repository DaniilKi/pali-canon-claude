import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {liveCache} from '../src/cache.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {buildIndex} from '../scripts/export-index.mjs';
const rows=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json')).links.filter(r=>['an1.45','an2.32'].includes(r.owner_id));
test('paired-page fixture retains both reviewed Water and Gratitude owners',()=>assert.deepEqual(rows.map(r=>r.owner_id),['an1.45','an2.32']));
const fetchOriginal=globalThis.fetch;let saved;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=fetchOriginal;liveCache.clear();translationCoverage({refresh:true});});
for(const row of rows){
 const id='ati:'+row.path;
 test(`${row.english_title}: complete root and segment pins, exact members and separate counts`,()=>{
  const d=canon.load();saved=d.translations;
  const selected=row.text_ids.map(uid=>{const u=canon.resolve(uid).unit,proof=row.root_units.find(x=>x.id===uid);assert.equal(u.title,proof.title);assert.equal(u.vri,proof.vri);assert.equal(createHash('sha256').update(JSON.stringify(d.canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),proof.root_blocks_sha256);const m=canon.describe(u);assert.equal(m.english_available,0);assert.equal(m.shared_english_available,1);const s=m.english.find(x=>x.translation_id===id).translation_scope;assert.deepEqual(s.text_ids,row.text_ids);assert.equal(s.presentation,'compilation');assert.equal(s.condensed,false);assert.equal(s.individual_alignment_verified,false);assert.equal(s.whole_unit_coverage,false);return{id:uid,segments:canon.segments(u).map(({ref,type,text})=>({ref,type,text}))};});
  assert.equal(scopeHash(selected),row.pali_segments_sha256);
  const before=translationCoverage({refresh:true}).total;
  d.translations={...saved};delete d.translations[row.owner_id];const after=translationCoverage({refresh:true}).total;
  for(const k of ['links','with_english','with_english_including_inherited'])assert.equal(before[k],after[k]);
  assert.equal(before.shared_links,after.shared_links+1);assert.equal(before.shared_only,after.shared_only+2);
  for(const record of buildIndex().texts.filter(x=>row.text_ids.includes(x.id))){assert.equal(record.english_count,0);}
 });
 test(`${row.english_title}: no default, no nearby attribution, explicit consent, independent continuation and page-level quotation`,async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No fetch before consent');};
  for(const uid of row.text_ids){await assert.rejects(english.translation(canon.resolve(uid).unit),/shared|scoped/i);await assert.rejects(english.translation(canon.resolve(uid).unit,id),/allow_shared/);}
  const wrong=row.owner_id==='an2.32'?'an2.31':'an1.44';await assert.rejects(english.translation(canon.resolve(wrong).unit,id,{allow_shared:true}),/not linked|not available|No English translation is linked/);assert.equal(calls,0);
  const text=('Synthetic fixture only. Amber lantern by the copper pool. '.repeat(30)).trim(),html=`<!-- BEGIN COPYRIGHTED TEXT CHUNK -->${text}<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic test-only notice, no licence grant.</div><div id="F_citation">Synthetic attribution.</div>`;
  const d=canon.load();saved=d.translations;const link=structuredClone(saved[row.owner_id].find(l=>l.path===row.path));link.shared_scope.text_sha256=scopeHash(text);link.shared_scope.notice_sha256=scopeHash(english.atiNotice(html));d.translations={...saved,[row.owner_id]:[link]};globalThis.fetch=async()=>new Response(html);
  const first=await english.translation(canon.resolve(row.text_ids[1]).unit,id,{allow_shared:true,limit:500});assert.equal(first.text_id,null);assert.equal(first.requested_text_id,row.text_ids[1]);assert.equal(first.text,text.slice(0,500));const{uid,translation,...args}=first.continue_with.arguments;const next=await english.translation(canon.resolve(uid).unit,translation,args);assert.equal(next.text,text.slice(500,1000));
  const query={text:'Amber lantern by the copper pool',language:'english',texts:row.text_ids,translation_ids:[id]};await assert.rejects(verifyQuote(query),/include_shared/);const positive=await verifyQuote({...query,include_shared:true});assert.equal(positive.verdict,'found');assert.equal(positive.matches[0].text_id,null);assert.deepEqual(positive.matches[0].unverified_requested_text_ids,row.text_ids);const negative=await verifyQuote({...query,text:'Purple zeppelins carry velvet otters',include_shared:true});assert.equal(negative.verdict,'not_found_in_scope');
 });
}
test('Gratitude retains publisher numbering separate from indexed subjects and adjacent calm/insight',()=>{
 const row=rows.find(r=>r.owner_id==='an2.32');assert.deepEqual(row.text_ids,['an2.32','an2.33']);assert.deepEqual(row.root_units.map(r=>r.vri),['33','34']);assert.match(row.source_reference,/ATI AN 2.31–32; indexed AN 2.32–33/);assert.ok(!english.available(canon.resolve('an2.31').unit).some(l=>l.path===row.path));
});
test('all reviewed shared pages keep distinct source identities and deduplicate each scope during mixed verification',async()=>{
 const all=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json')).links,d=canon.load();saved=d.translations;d.translations={...saved};
 const text='Synthetic fixture only. Amber lantern by the copper pool.',html=`<!-- BEGIN COPYRIGHTED TEXT CHUNK -->${text}<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic test-only notice, no licence grant.</div><div id="F_citation">Synthetic attribution.</div>`;
 for(const row of all){const link=structuredClone(saved[row.owner_id].find(l=>l.path===row.path));link.shared_scope.text_sha256=scopeHash(text);link.shared_scope.notice_sha256=scopeHash(english.atiNotice(html));d.translations[row.owner_id]=[link];}
 const fetched=[];globalThis.fetch=async url=>{fetched.push(String(url));return new Response(html);};
 for(let offset=0;offset<all.length;offset+=4){
  const batch=all.slice(offset,offset+4),requested=[...new Set(batch.flatMap(r=>[r.text_ids[0],r.text_ids.at(-1)]))],before=fetched.length;assert.ok(requested.length<=12);
  const result=await verifyQuote({text:'Amber lantern by the copper pool',language:'english',texts:requested,translation_ids:batch.map(r=>'ati:'+r.path),include_shared:true,limit:10});
  assert.equal(result.verdict,'found');assert.equal(result.matches.length,batch.length);assert.equal(result.scope.translations_checked.length,batch.length);assert.equal(fetched.length-before,batch.length);assert.equal(new Set(fetched.slice(before)).size,batch.length);
  assert.deepEqual(new Set(result.matches.map(m=>m.translation_id)),new Set(batch.map(r=>'ati:'+r.path)));
  for(const match of result.matches){const row=batch.find(r=>'ati:'+r.path===match.translation_id);assert.equal(match.text_id,null);assert.deepEqual(match.translation_scope.text_ids,row.text_ids);assert.deepEqual(new Set(match.unverified_requested_text_ids),new Set(requested.filter(id=>row.text_ids.includes(id))));assert.equal(match.whole_unit_coverage,false);}
 }
 assert.equal(fetched.length,all.length);

});
