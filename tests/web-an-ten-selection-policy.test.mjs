import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import {available} from '../src/english.mjs';
import {AN_TEN_PROFILE,anTenSourceUnit,sectionSourceUnit,translatorNotes} from '../web/milinda-sources.mjs';
import {comparisonChoices,validateComparisonPage} from '../web/translation-comparison.mjs';
import {scopeDescriptor,validateEnglishPage} from '../web/translation-policy.mjs';
const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_ati_sections.json'));
const rows=manifest.links.filter(row=>row.section.profile===AN_TEN_PROFILE);
const finite=[['an1.45','an01/an01.045-046.than',1,0,null],['an1.46','an01/an01.045-046.than',1,0,null],['an1.49','an01/an01.049.than',1,1,null],['an1.50','an01/an01.049.than',1,0,null],['an1.51','an01/an01.049.than',1,0,null],['an1.52','an01/an01.049.than',1,0,null],['an2.32','an02/an02.031.than',3,0,null],['an2.33','an02/an02.031.than',1,0,'s32'],['an2.125','an02/an02.125-126.than',1,1,null],['an2.126','an02/an02.125-126.than',1,0,null]];
const id=row=>'ati:'+row.path+'::selection:'+row.unit_id;
const choice=row=>({translation_id:id(row),source_section:row.section,translator:row.translator,whole_unit_coverage:true});
const page=row=>({translation_id:id(row),source_section:row.section,translator:row.translator,text_id:row.unit_id,text:'Synthetic browser policy fixture only.',attribution:'Synthetic attribution.',license:'Synthetic policy licence.',offset:0,limit:500,prefix_sha256:'a'.repeat(64),next_offset:null,translator_notes:Array.from({length:row.section.note_count},(_,i)=>({number:i+1,text:'Synthetic owned editorial note.'}))});
const context=row=>({uid:row.unit_id,choices:[choice(row)],accepted:null});
const args=row=>({uid:row.unit_id,translation:id(row),limit:500});

test('exact finite ten selections use internal selectors, actual null headings and finite owned notes',()=>{
 assert.equal(manifest.links.length,45);assert.equal(rows.length,10);
 assert.deepEqual(rows.map(row=>[row.unit_id,row.path.slice('/tipitaka/an/'.length),row.section.paragraph_count,row.section.note_count,row.section.anchor]),finite);
 for(const row of rows){assert.equal(row.section.selection_id,row.unit_id);assert.equal(row.section.heading,null);assert.equal(anTenSourceUnit(id(row)),row.unit_id);assert.equal(sectionSourceUnit(id(row)),row.unit_id);assert.equal(scopeDescriptor(choice(row),row.unit_id),null);assert.deepEqual(comparisonChoices([choice(row)],row.unit_id),[choice(row)]);assert.equal(validateEnglishPage(page(row),args(row),context(row)),null);assert.equal(validateComparisonPage(page(row),args(row),context(row)),null);}
});

test('new selector families cannot fall back to bare, encoded, malformed or unknown ordinary sources',()=>{
 for(const row of rows){const base='ati:'+row.path;
  for(const translation_id of [base,base+'#'+row.unit_id,base+'?selection='+row.unit_id,base+'::selection:an9.999',id(row)+'#extra',id(row)+'?query=1',id(row).replace('::selection:', '%3A%3Aselection%3A'),id(row).replace('::selection:', '%253A%253Aselection%253A'),base+'.html::selection:'+row.unit_id,'ATI:'+row.path+'::selection:'+row.unit_id,base.toUpperCase(),base+'::selection:',base+'::selection:'+row.unit_id+'::extra','ati:/tipitaka/an/unknown::selection:'+row.unit_id,'dt:'+row.path+'::selection:'+row.unit_id,'aj:'+row.path+'::selection:'+row.unit_id]){
   const altered={...choice(row),translation_id};assert.throws(()=>scopeDescriptor(altered,row.unit_id));assert.throws(()=>comparisonChoices([altered],row.unit_id));assert.throws(()=>validateEnglishPage({...page(row),translation_id},args(row),{...context(row),choices:[altered]}));
  }
 }
});

test('null heading/anchor and selector are exact fields, with no invented per-discourse publisher title',()=>{
 for(const row of rows){
  for(const patch of [{selection_id:undefined},{selection_id:'an9.999'},{heading:'Invented individual heading'},{heading:undefined},{anchor:row.section.anchor===null?'an-'+row.unit_id:null},{profile:'ati-an1-ekadhamma-numbered-paragraph-v1'},{paragraph_count:99},{note_count:99},{status:'unreviewed'},{source_commit:'new revision'},{first_ref:'other/1'},{first_ref:row.unit_id+'/99'},{last_ref:row.unit_id+'/99'},{last_ref:row.unit_id+'/0'},{extra:'unexpected'}]){
   const section={...row.section,...patch};assert.throws(()=>scopeDescriptor({...choice(row),source_section:section},row.unit_id));assert.throws(()=>validateEnglishPage({...page(row),source_section:section},args(row),context(row)));
  }
  for(const key of ['text_sha256','notes_sha256','notice_sha256','section_html_sha256','pali_sha256'])assert.throws(()=>validateEnglishPage({...page(row),source_section:{...row.section,[key]:'0'.repeat(64)}},args(row),context(row)),/identity|descriptor/);
  assert.throws(()=>scopeDescriptor(choice(row),'an9.999'));
  assert.throws(()=>validateEnglishPage(page(row),args(row),{...context(row),uid:'an9.999'}));
  for(const patch of [{whole_unit_coverage:false},{translation_scope:undefined},{translation_scope:{kind:'shared_page'}}])assert.throws(()=>scopeDescriptor({...choice(row),...patch},row.unit_id));
 }
});

test('editorial notes belong only to AN1.49 and AN2.125, never their sibling selections',()=>{
 assert.deepEqual(rows.filter(r=>r.section.note_count).map(r=>r.unit_id),['an1.49','an2.125']);
 for(const row of rows){assert.equal(translatorNotes(page(row)).length,row.section.note_count);const missing=page(row);delete missing.translator_notes;assert.throws(()=>validateEnglishPage(missing,args(row),context(row)),/missing/);
  const wrong=page(row);wrong.translator_notes=row.section.note_count?[]:[{number:1,text:'Synthetic cloned sibling note.'}];assert.throws(()=>validateEnglishPage(wrong,args(row),context(row)),/translator-note count/);
 }
});

test('ten-selection continuation keeps exact internal identity, owner and source pins',()=>{
 for(const row of rows){const next={uid:row.unit_id,translation:id(row),offset:500,limit:500,prefix_sha256:'b'.repeat(64)};const data={...page(row),next_offset:500,continue_with:{name:'get_translation',arguments:next}};assert.deepEqual(validateEnglishPage(data,args(row),context(row)),next);
  for(const patch of [{translation:'ati:'+row.path},{translation:id(row)+'#fake'},{uid:'an9.999'},{allow_shared:true},{allow_partial:true},{scope_sha256:'a'.repeat(64)},{prefix_sha256:undefined},{offset:0}])assert.throws(()=>validateEnglishPage({...data,continue_with:{name:'get_translation',arguments:{...next,...patch}}},args(row),context(row)));
 }
});

const stable=value=>JSON.stringify(Array.isArray(value)?value.map(v=>JSON.parse(stable(v))):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(stable(value[k]))])):value);
const digest=value=>createHash('sha256').update(stable(value)).digest('hex');
const legacyPins=[{"owner":"an1.49","id":"ati:/tipitaka/an/an01/an01.049.than","link_sha256":"a2c2cc60601e1452e1a2c4e1d2559e840d9af81971bf8cbc1c0c39d3f97c1788","choice_sha256":"1191560e24456e3caf3c706a68bccad10032218562da83f95478885940fba7d3"},{"owner":"an1.45","id":"ati:/tipitaka/an/an01/an01.045-046.than","link_sha256":"6bf4ee03645107957dead77ee90db44b0da9774562243ff22a4e34c2b54c1a0a","choice_sha256":"44b8efd2cf94d08c3b7edbc0e17a48d8b2345b2864cc28f9a59f617903a19b61"},{"owner":"an2.32","id":"ati:/tipitaka/an/an02/an02.031.than","link_sha256":"838054ead5fcd616b8da512e9cc9094987bc92a9539b897dd4265ab255f3c895","choice_sha256":"51063f16fa4e193812e7bd92847597831d177441a626abae6302a3c25133a0e3"},{"owner":"an2.125","id":"ati:/tipitaka/an/an02/an02.125-126.than","link_sha256":"5a3ef438de5d3288a3e4239ec1838c69a45fd94003642faf3262e060e0cd4e3c","choice_sha256":"15fc4d685c4fe52c12bdbe6b5bbc842dab1907684d1d4503b07a1616f456ffc6"}];
test('all35 former whole descriptors and four complete legacy shared link/choice objects stay byte-for-byte equivalent',()=>{
 assert.equal(digest(manifest.links.filter(r=>r.section.profile!==AN_TEN_PROFILE)),"5445cc945d6c9247a0676ddf4413b551e13cf9b9b9aa5b324bfd9f070d20ce9f");
 for(const pin of legacyPins){
  const linked=canon.load().translations[pin.owner].find(link=>link.shared_scope&&'ati:'+link.path===pin.id);assert.equal(digest(linked),pin.link_sha256);
  const c=available(canon.load().byId.get(pin.owner)).find(choice=>choice.translation_id===pin.id);assert.equal(digest(c),pin.choice_sha256);
  for(const uid of c.translation_scope.text_ids){
   const accepted=scopeDescriptor(c,uid),request={uid,translation:pin.id,...accepted.flags},ctx={uid,choices:[c],accepted};
   const data={...c,text_id:null,requested_text_id:uid,whole_unit_coverage:false,citation:c.translation_scope.source_reference,text:'Synthetic entire legacy page policy fixture.',attribution:'Synthetic attribution.',license:'Synthetic policy licence.',offset:0,next_offset:null};
   assert.equal(validateEnglishPage(data,request,ctx),null);assert.throws(()=>validateEnglishPage(data,{uid,translation:pin.id},{...ctx,accepted:null}));assert.throws(()=>validateEnglishPage({...data,text_id:uid},request,ctx));assert.throws(()=>validateEnglishPage(data,{...request,scope_sha256:'0'.repeat(64)},ctx));
   assert.throws(()=>scopeDescriptor({...c,source_section:rows.find(row=>row.unit_id===uid).section},uid));
  }
 }
});
