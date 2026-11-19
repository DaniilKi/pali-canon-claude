import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sectionSourceUnit,milindaSourceUnit,isSectionPageId,translatorNotes,validateSectionDescriptor} from '../web/milinda-sources.mjs';
import {comparisonChoices,validateComparisonPage} from '../web/translation-comparison.mjs';
import {validateEnglishPage} from '../web/translation-policy.mjs';
const uid='sn27.5',id='ati:/tipitaka/sn/sn27/sn27.001-010.than#sn27.005',pin='a'.repeat(64);
// Synthetic metadata/wording fixture only; actual source and rights are checked separately.
const section=()=>({version:1,status:'reviewed',profile:'ati-sn27-feelings-v1',unit_id:uid,anchor:'sn27.005',note_count:0,text_sha256:pin,notes_sha256:pin,notice_sha256:pin,pali_sha256:pin});
const choice=()=>({translation_id:id,translator:'Thanissaro Bhikkhu',source_section:section(),whole_unit_coverage:true});
const page=()=>({translation_id:id,translator:'Thanissaro Bhikkhu',text_id:uid,source_section:section(),translator_notes:[],text:'Synthetic policy wording only.',attribution:'Synthetic attribution.',license:'Synthetic rights fixture.',offset:0,limit:500,prefix_sha256:pin,next_offset:null});
const args=()=>({uid,translation:id,limit:500});
const context=()=>({uid,choices:[choice()]});
test('the sole exact reviewed SN27.5 source is an ordinary discourse choice, independent of Milinda identities',()=>{
 assert.equal(sectionSourceUnit(id),uid);assert.equal(milindaSourceUnit(id),undefined);assert.equal(isSectionPageId(id.split('#')[0]),true);
 assert.deepEqual(comparisonChoices([choice()],uid),[choice()]);assert.equal(validateEnglishPage(page(),args(),context()),null);assert.equal(validateComparisonPage(page(),args(),context()),null);assert.deepEqual(translatorNotes(page()),[]);
 assert.equal(milindaSourceUnit('ati:/tipitaka/kn/miln/miln.3x.kell#miln-3-5-06'),'mil3.5.6');
});
test('bare compilation, sibling discourse, arbitrary/encoded fragments and cross-unit selection refuse',()=>{
 for(const translation_id of [id.split('#')[0],id.replace('sn27.005','sn27.004'),id+'-unknown',id+'#again',id+'?q=1',id.replace('#','%23'),id.replace('.than#','.than.html#'),'ati:/tipitaka/mn/mn.001.than#sn27.005','dt:SN/SN27_5#sn27.005'])assert.throws(()=>comparisonChoices([{...choice(),translation_id}],uid));
 assert.throws(()=>comparisonChoices([choice()],'sn27.4'));
 assert.throws(()=>validateEnglishPage({...page(),text_id:'sn27.4'},{...args(),uid:'sn27.4'},{...context(),uid:'sn27.4'}));
});
test('finite profile, anchor, status, owner and zero-note count cannot be forged together in chooser and response',()=>{
 for(const change of [{version:2},{status:'unreviewed'},{profile:'ati-kelly-milinda-v1'},{unit_id:'sn27.4'},{anchor:'sn27.004'},{note_count:1},{note_count:undefined}]){
  const source_section={...section(),...change},badChoice={...choice(),source_section};assert.throws(()=>validateSectionDescriptor(badChoice));assert.throws(()=>comparisonChoices([badChoice],uid));assert.throws(()=>validateEnglishPage({...page(),source_section},args(),{uid,choices:[badChoice]}));
 }
});
test('missing or extra owned notes and chooser-to-response pin drift refuse before wording',()=>{
 const missing=page();delete missing.translator_notes;assert.throws(()=>validateEnglishPage(missing,args(),context()),/missing/);
 for(const translator_notes of [null,{},[{number:1,text:'Synthetic unexpected note'}]])assert.throws(()=>validateEnglishPage({...page(),translator_notes},args(),context()),/translator-note/);
 for(const key of ['text_sha256','notes_sha256','notice_sha256','pali_sha256'])assert.throws(()=>validateEnglishPage({...page(),source_section:{...section(),[key]:'b'.repeat(64)}},args(),context()),/identity/);
 for(const change of [{text_id:'sn27.4'},{translation_scope:null},{whole_unit_coverage:false}])assert.throws(()=>validateEnglishPage({...page(),...change},args(),context()));
});
test('guarded continuation retains exact fragment version, owner, prefix and ordinary scope',()=>{
 const continued={...page(),text:'x'.repeat(500),next_offset:500,continue_with:{name:'get_translation',arguments:{...args(),offset:500,prefix_sha256:pin}}};
 assert.deepEqual(validateComparisonPage(continued,args(),context()),continued.continue_with.arguments);
 for(const change of [{translation:id.split('#')[0]},{translation:id.replace('sn27.005','sn27.004')},{uid:'sn27.4'},{allow_partial:true},{scope_sha256:pin}])assert.throws(()=>validateComparisonPage({...continued,continue_with:{name:'get_translation',arguments:{...continued.continue_with.arguments,...change}}},args(),context()));
});

test('single-source guards reject mutually downgraded bare, sibling and encoded chooser/response identities',()=>{
 for(const translation_id of [id.split('#')[0],id.replace('sn27.005','sn27.004'),id+'-unknown',id.replace('#','%23'),id.replace('/tipitaka/','%2Ftipitaka%2F'),id.split('#')[0]+'.html',id.split('#')[0]+'?x=1','ati:/tipitaka/mn/mn.001.than#arbitrary']){
  const downgradedChoice={translation_id,translator:'Thanissaro Bhikkhu'},downgraded={...page(),translation_id};delete downgraded.source_section;delete downgraded.translator_notes;
  assert.throws(()=>validateEnglishPage(downgraded,{...args(),translation:translation_id},{uid,choices:[downgradedChoice]}),/fragment identity/);
 }
 const translation_id='ati:/SYNTHETIC/FALLBACK',ordinary={...page(),translation_id};delete ordinary.source_section;delete ordinary.translator_notes;
 assert.equal(validateEnglishPage(ordinary,{...args(),translation:translation_id},{uid,choices:[{translation_id,translator:ordinary.translator}]}),null);
});
