import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {auditSelectedTranslationLink} from '../scripts/evidence/selected-translation-link.mjs';
const selected=Object.entries(canon.load().translations).flatMap(([id,links])=>links.filter(link=>link.section?.selection_id).map(link=>({id,link})));

test('all ten internal selection IDs audit without inventing nine missing publisher anchors',()=>{
  assert.equal(selected.length,10);
  const results=selected.map(({id,link})=>auditSelectedTranslationLink(canon,id,link));
  assert.equal(new Set(results.map(row=>row.translation_id)).size,10);
  assert.equal(results.filter(row=>row.publisher_url_ambiguous).length,9);
  assert.deepEqual(results.filter(row=>row.publisher_anchor).map(row=>[row.translation_id,row.publisher_anchor]),[['ati:/tipitaka/an/an02/an02.031.than::selection:an2.33','s32']]);
});

test('audit refuses changed selector/owner/URL metadata and does not generalize the old anchored contract',()=>{
  for(const {id,link} of selected){
    for(const mutate of [row=>row.url+='#invented',row=>row.section.selection_id='an1.999',row=>row.section.anchor='invented',row=>delete row.section.selection_id]){
      const bad=structuredClone(link);mutate(bad);assert.throws(()=>auditSelectedTranslationLink(canon,id,bad),/Registered ATI|finite reviewed owner/);
    }
    assert.throws(()=>auditSelectedTranslationLink(canon,'mn1',link),/finite reviewed owner/);
  }
  const old=canon.load().translations['sn27.5'].find(link=>link.section);
  assert.throws(()=>auditSelectedTranslationLink(canon,'sn27.5',old),/finite reviewed owner/);
});

test('audit detects false URL ownership, unrelated failures and wrong internal IDs rather than treating them as successful checks',()=>{
  const bare=selected.find(({link})=>link.section.anchor===null),anchored=selected.find(({link})=>link.section.anchor==='s32');
  assert.throws(()=>auditSelectedTranslationLink({...canon,resolve:()=>({unit:{id:bare.id}})},bare.id,bare.link),/must remain explicitly ambiguous/);
  assert.throws(()=>auditSelectedTranslationLink({...canon,resolve:()=>{throw Error('Unrelated data failure');}},bare.id,bare.link),/must remain explicitly ambiguous/);
  assert.throws(()=>auditSelectedTranslationLink({...canon,resolve:()=>({unit:{id:'an2.32'}})},anchored.id,anchored.link),/different selection owner/);
  assert.throws(()=>auditSelectedTranslationLink({...canon,translationId:()=>bare.link.url},bare.id,bare.link),/Internal selection identity/);
});
