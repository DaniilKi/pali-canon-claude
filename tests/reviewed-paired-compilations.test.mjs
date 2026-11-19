import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {validateSectionRegistry} from '../src/ati-section-registry.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {liveCache} from '../src/cache.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {buildIndex} from '../scripts/export-index.mjs';
import {ATI_RETAINED_SHARED_BINDINGS} from '../src/ati-section-profiles.mjs';
const rows=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json')).links.filter(r=>['an1.45','an2.32'].includes(r.owner_id));
test('paired-page fixture retains both reviewed Water and Gratitude owners',()=>assert.deepEqual(rows.map(r=>r.owner_id),['an1.45','an2.32']));
const fetchOriginal=globalThis.fetch;let saved;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=fetchOriginal;liveCache.clear();translationCoverage({refresh:true});});
for(const row of rows){
 const id='ati:'+row.path;
 test(`${row.english_title}: complete root and segment pins, exact members and separate counts`,()=>{
  const d=canon.load();saved=d.translations;
  const selected=row.text_ids.map(uid=>{const u=canon.resolve(uid).unit,proof=row.root_units.find(x=>x.id===uid);assert.equal(u.title,proof.title);assert.equal(u.vri,proof.vri);assert.equal(createHash('sha256').update(JSON.stringify(d.canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),proof.root_blocks_sha256);const m=canon.describe(u);assert.equal(m.english_available,1);assert.equal(m.shared_english_available,1);const s=m.english.find(x=>x.translation_id===id).translation_scope;assert.deepEqual(s.text_ids,row.text_ids);assert.equal(s.presentation,'compilation');assert.equal(s.condensed,false);assert.equal(s.individual_alignment_verified,false);assert.equal(s.whole_unit_coverage,false);return{id:uid,segments:canon.segments(u).map(({ref,type,text})=>({ref,type,text}))};});
  assert.equal(scopeHash(selected),row.pali_segments_sha256);
  const before=translationCoverage({refresh:true}).total;
  d.translations={...saved,[row.owner_id]:saved[row.owner_id].filter(l=>!l.shared_scope)};assert.throws(()=>validateSectionRegistry(canon.load().sectionRegistry,canon.load().canon,canon.load().translations,canon.segments),/Registered ATI/);d.translations=saved;
  assert.deepEqual(translationCoverage({refresh:true}).total,before);
  for(const record of buildIndex().texts.filter(x=>row.text_ids.includes(x.id))){assert.equal(record.english_count,1);}
 });
 test(`${row.english_title}: separate whole defaults, no nearby attribution, exact shared consent and immutable historical pins`,async()=>{
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No fetch before consent');};
  for(const uid of row.text_ids){const choices=english.available(canon.resolve(uid).unit);assert.equal(choices.find(c=>c.source_section).translation_id,id+'::selection:'+uid);await assert.rejects(english.translation(canon.resolve(uid).unit,id),/allow_shared/);}
  const wrong=row.owner_id==='an2.32'?'an2.31':'an1.44';await assert.rejects(english.translation(canon.resolve(wrong).unit,id,{allow_shared:true}),/not linked|not available|No English translation is linked/);assert.equal(calls,0);
  const d=canon.load();saved=d.translations;const original=structuredClone(saved[row.owner_id]);
  for(const mutate of [link=>link.shared_scope.text_sha256=scopeHash('Synthetic substituted wording'),link=>link.shared_scope.notice_sha256=scopeHash('Synthetic substituted notice')]){
   d.translations=structuredClone(saved);mutate(d.translations[row.owner_id].find(l=>l.shared_scope));
   assert.deepEqual(d.translations[row.owner_id].filter(l=>l.section),original.filter(l=>l.section));
   await assert.rejects(english.translation(canon.resolve(row.text_ids[1]).unit,id,{allow_shared:true}),/Registered ATI/);
   await assert.rejects(verifyQuote({text:'Amber lantern by the copper pool',language:'english',texts:row.text_ids,translation_ids:[id],include_shared:true}),/Registered ATI/);
  }
  assert.equal(calls,0);
 });
}
test('Gratitude retains publisher numbering separate from indexed subjects and adjacent calm/insight',()=>{
 const row=rows.find(r=>r.owner_id==='an2.32');assert.deepEqual(row.text_ids,['an2.32','an2.33']);assert.deepEqual(row.root_units.map(r=>r.vri),['33','34']);assert.match(row.source_reference,/ATI AN 2.31–32; indexed AN 2.32–33/);assert.ok(!english.available(canon.resolve('an2.31').unit).some(l=>l.path===row.path));
});
test('seven ordinary shared-page fixtures deduplicate each scope while all five mandatory AN editions stay untouched',async()=>{
 const declared=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json')).links,all=declared.filter(row=>!ATI_RETAINED_SHARED_BINDINGS.some(binding=>binding.path===row.path)),d=canon.load();saved=d.translations;d.translations={...saved};
 assert.equal(declared.length,12);assert.equal(all.length,7);
 const reservedPaths=new Set(ATI_RETAINED_SHARED_BINDINGS.map(binding=>binding.path));
 const reserved=t=>Object.entries(t).flatMap(([owner,links])=>links.filter(link=>reservedPaths.has(link.path)).map(link=>({owner,link})));
 const preserved=structuredClone(reserved(saved));assert.equal(preserved.filter(({link})=>link.shared_scope).length,5);assert.equal(preserved.filter(({link})=>link.section).length,30);
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
 assert.deepEqual(reserved(d.translations),preserved,'Synthetic ordinary fixtures preserve all mandatory shared and whole choices');
 for(const binding of ATI_RETAINED_SHARED_BINDINGS){
  const original=structuredClone(d.translations[binding.owner]);
  const forged=structuredClone(original),link=forged.find(link=>link.path===binding.path&&link.shared_scope);
  link.shared_scope.text_sha256=scopeHash(text);link.shared_scope.notice_sha256=scopeHash(english.atiNotice(html));
  d.translations[binding.owner]=forged;const before=fetched.length;
  await assert.rejects(english.translation(canon.resolve(binding.owner).unit,'ati:'+binding.path,{allow_shared:true}),/Registered ATI/);
  assert.equal(fetched.length,before,'Forged mandatory page pins reject before synthetic source access');
  d.translations[binding.owner]=original;
 }
 assert.deepEqual(reserved(d.translations),preserved);

});

test('mandatory shared editions reject warmed-index pin, scope, path and declaration drift for owner and non-owner requests',async()=>{
 const d=canon.load();saved=d.translations;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No provider request after immutable metadata drift');};
 const mutations={
  pin:(link)=>{link.shared_scope.text_sha256=scopeHash('Substituted wording after the shared index was warmed');},
  scope:(link)=>{delete link.shared_scope;},
  path:(link)=>{link.path='/tipitaka/an/synthetic-unreviewed';link.url='https://accesstoinsight.org'+link.path+'.html';},
  scope_and_path:(link)=>{delete link.shared_scope;link.path='/tipitaka/an/synthetic-unreviewed';link.url='https://accesstoinsight.org'+link.path+'.html';},
  removed:(link,binding)=>{d.translations[binding.owner]=d.translations[binding.owner].filter(value=>value!==link);},
  duplicate:(link,binding)=>{d.translations[binding.owner].push(link);},
  duplicate_clone:(link,binding)=>{d.translations[binding.owner].push(structuredClone(link));},
  replaced_clone:(link,binding)=>{d.translations[binding.owner]=d.translations[binding.owner].map(value=>value===link?structuredClone(link):value);},
  moved_owner:(link,binding)=>{d.translations[binding.owner]=d.translations[binding.owner].filter(value=>value!==link);d.translations.dn1.push(link);},
  foreign_copy:(link)=>{d.translations.dn1.push(link);},
  foreign_clone:(link)=>{d.translations.dn1.push(structuredClone(link));},
 };
 for(const binding of ATI_RETAINED_SHARED_BINDINGS)for(const [kind,mutate] of Object.entries(mutations)){
  d.translations=structuredClone(saved);
  const link=d.translations[binding.owner].find(link=>link.path===binding.path&&link.shared_scope),member=link.shared_scope.text_ids.at(-1),id='ati:'+binding.path;
  const memberUnit=canon.resolve(member).unit,ownerUnit=canon.resolve(binding.owner).unit;
  assert.notEqual(member,binding.owner);assert.ok(english.available(memberUnit).some(choice=>choice.translation_id===id));
  // Reuse the exact table/index object, including when its declaration is removed.
  mutate(link,binding);
  for(const unit of [memberUnit,ownerUnit])await assert.rejects(english.translation(unit,id,{allow_shared:true}),/Registered ATI|Shared-page|shared-page/i,`${binding.owner}: ${kind} via ${unit.id}`);
 }
 assert.equal(calls,0);
});
