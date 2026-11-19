import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sectionSourceUnit,numberedSourceUnit,milindaSourceUnit,isSectionPageId,translatorNotes,validateSectionDescriptor,validateSectionIdentity} from '../web/milinda-sources.mjs';
import {comparisonChoices,validateComparisonPage} from '../web/translation-comparison.mjs';
import {validateEnglishPage,scopeDescriptor} from '../web/translation-policy.mjs';
const bare='ati:/tipitaka/an/an01/an01.021-040.than',pin='a'.repeat(64);
// Synthetic metadata/wording exercises display policy, not source or rights approval.
const section=n=>({version:1,status:'reviewed',profile:'ati-an1-ekadhamma-numbered-paragraph-v1',unit_id:'an1.'+n,anchor:'sutta-'+n,heading:n+'.',paragraph_count:1,note_count:0,text_sha256:pin,notes_sha256:pin,notice_sha256:pin,pali_sha256:pin});
const choice=n=>({translation_id:bare+'#sutta-'+n,translator:'Thanissaro Bhikkhu',source_section:section(n)});
const args=n=>({uid:'an1.'+n,translation:choice(n).translation_id,limit:500});
const context=n=>({uid:'an1.'+n,choices:[choice(n)]});
const page=n=>({...choice(n),text_id:'an1.'+n,translator_notes:[],text:'Synthetic numbered treatment wording.',attribution:'Synthetic attribution.',license:'Synthetic rights fixture.',offset:0,limit:500,prefix_sha256:pin,next_offset:null});
const sharedScope=()=>({kind:'shared_page',version:1,owner_id:'an1.21',text_ids:Array.from({length:20},(_,i)=>'an1.'+(21+i)),presentation:'compilation',individual_alignment_verified:false,whole_unit_coverage:false,scope_sha256:'97589116d588b361438b6ea5db4d27ca2b45d8a77199be466cd6722b7c987ea6',text_sha256:'4ea2069bc8a4bdaf2021f5f9729af8c06362053595841c77cf59b75e395d8145',pali_sha256:'7c78c04fa2d6b1bf493043ad460002aa08cd83186e679229ab75850cd972f9cf',notice_sha256:'4153685976f9d98f9a61ca223a5f71d2ce2c9281fd0b0c043859d133c45a1238',source_commit:'2d134ff9ef60f70a1eb03c9370580228811a3070',note:'Synthetic shared scope warning.',source_reference:'AN 1.21–40 (shared publisher page)'});
const sharedChoice=()=>({translation_id:bare,translator:'Thanissaro Bhikkhu',translation_scope:sharedScope()});
const sharedPage=()=>({...sharedChoice(),text_id:null,requested_text_id:'an1.21',whole_unit_coverage:false,citation:sharedScope().source_reference,text:'Synthetic whole compilation wording.',attribution:'Synthetic attribution.',license:'Synthetic rights fixture.',offset:0,next_offset:null});
test('all twenty finite printed-number treatments are distinct ordinary choices, independent of old registries',()=>{
 assert.equal(isSectionPageId(bare),true);
 for(let n=21;n<=40;n++){
  assert.equal(sectionSourceUnit(choice(n).translation_id),'an1.'+n);assert.equal(numberedSourceUnit(choice(n).translation_id),'an1.'+n);assert.equal(milindaSourceUnit(choice(n).translation_id),undefined);
  assert.deepEqual(comparisonChoices([choice(n),sharedChoice()],'an1.'+n),[choice(n)]);assert.equal(validateEnglishPage(page(n),args(n),context(n)),null);assert.equal(validateComparisonPage(page(n),args(n),context(n)),null);assert.deepEqual(translatorNotes(page(n)),[]);
 }
 assert.equal(sectionSourceUnit('ati:/tipitaka/sn/sn27/sn27.001-010.than#sn27.005'),'sn27.5');assert.equal(milindaSourceUnit('ati:/tipitaka/kn/miln/miln.3x.kell#miln-3-5-06'),'mil3.5.6');
});
test('reserved compilation cannot become an ordinary bare, encoded, wrong-owner or unknown treatment',()=>{
 const n=21,id=choice(n).translation_id;
 for(const translation_id of [bare,bare+'.html',bare+'?q=1',bare+'#sutta-20',bare+'#sutta-41',id+'-unknown',id+'#again',id+'?q=1',id.replace('#','%23'),id.replace('/tipitaka/','%2Ftipitaka%2F'),id.replace('.than#','.than.html#'),'ati:/tipitaka/an/an01/an01.001-020.than#sutta-21']){
  const downgraded={...page(n),translation_id};delete downgraded.source_section;delete downgraded.translator_notes;
  assert.throws(()=>validateEnglishPage(downgraded,{...args(n),translation:translation_id},{uid:'an1.21',choices:[{translation_id,translator:'Thanissaro Bhikkhu'}]}));
  assert.throws(()=>comparisonChoices([{...choice(n),translation_id}],'an1.21'));
 }
 assert.throws(()=>comparisonChoices([choice(22)],'an1.21'));assert.throws(()=>validateEnglishPage(page(22),args(22),{...context(22),uid:'an1.21'}));
});
test('every profile, printed number, owner, anchor, note count and section pin remains exact',()=>{
 for(let n=21;n<=40;n++){
  for(const change of [{paragraph_count:2},{paragraph_count:undefined},{version:2},{status:'unreviewed'},{profile:'ati-sn27-feelings-v1'},{heading:'Ekadhamma Suttas'},{heading:String(n)},{heading:(n+1)+'.'},{unit_id:'an1.20'},{anchor:'sutta-20'},{note_count:1},{note_count:undefined}]){
   const source_section={...section(n),...change},bad={...choice(n),source_section};assert.throws(()=>validateSectionDescriptor(bad));assert.throws(()=>comparisonChoices([bad],'an1.'+n));assert.throws(()=>validateEnglishPage({...page(n),source_section},args(n),{uid:'an1.'+n,choices:[bad]}));
  }
  const missing=page(n);delete missing.translator_notes;assert.throws(()=>validateEnglishPage(missing,args(n),context(n)),/missing/);
  for(const translator_notes of [null,{},[{number:1,text:'Synthetic extra note'}]])assert.throws(()=>validateEnglishPage({...page(n),translator_notes},args(n),context(n)),/translator-note/);
  for(const key of ['text_sha256','notes_sha256','notice_sha256','pali_sha256'])assert.throws(()=>validateEnglishPage({...page(n),source_section:{...section(n),[key]:'b'.repeat(64)}},args(n),context(n)),/identity/);
  for(const change of [{text_id:'an1.20'},{translation_scope:null},{whole_unit_coverage:false}])assert.throws(()=>validateEnglishPage({...page(n),...change},args(n),context(n)));
 }
});
test('legacy bare compilation keeps fresh consent, exact pins and page-level semantics; unknown partial or whole downgrades refuse',()=>{
 const c=sharedChoice(),accepted=scopeDescriptor(c,'an1.21'),request={uid:'an1.21',translation:bare,limit:500,...accepted.flags},ctx={uid:'an1.21',choices:[c],accepted};
 assert.doesNotThrow(()=>validateSectionIdentity(c));assert.equal(validateEnglishPage(sharedPage(),request,ctx),null);assert.deepEqual(comparisonChoices([c],'an1.21'),[]);
 assert.throws(()=>validateEnglishPage(sharedPage(),{uid:'an1.21',translation:bare,limit:500},{...ctx,accepted:null}));
 for(const change of [{allow_shared:false},{allow_partial:true},{scope_sha256:'b'.repeat(64)}])assert.throws(()=>validateEnglishPage(sharedPage(),{...request,...change},ctx));
 for(const change of [{text_id:'an1.21'},{requested_text_id:'an1.22'},{citation:'AN 1.21'},{whole_unit_coverage:true},{translation_scope:{...sharedScope(),text_sha256:'b'.repeat(64)}}])assert.throws(()=>validateEnglishPage({...sharedPage(),...change},request,ctx));
 for(const change of [{translation_scope:null},{translation_scope:{...sharedScope(),kind:'partial_unit'}},{translation_scope:{...sharedScope(),whole_unit_coverage:true}},{whole_unit_coverage:true},{source_section:section(21)}])assert.throws(()=>validateSectionIdentity({...c,...change}));
 assert.throws(()=>validateSectionIdentity({...c,translation_id:bare.replace('#','%23')+'#unknown'}));
 for(const key of ['source_commit','pali_sha256','text_sha256','notice_sha256','scope_sha256','owner_id','presentation'])assert.throws(()=>validateSectionIdentity({...c,translation_scope:{...sharedScope(),[key]:'synthetic-drift'}}));
 for(const text_ids of [sharedScope().text_ids.slice(1),[...sharedScope().text_ids].reverse()])assert.throws(()=>validateSectionIdentity({...c,translation_scope:{...sharedScope(),text_ids}}));
 assert.throws(()=>validateSectionIdentity({...c,whole_unit_coverage:'false'}));
 const invalid={...c,translation_scope:{...sharedScope(),scope_sha256:undefined}};assert.throws(()=>scopeDescriptor(invalid,'an1.21'));
 const unknown={...c,translation_scope:{...sharedScope(),kind:'unknown'}};assert.throws(()=>scopeDescriptor(unknown,'an1.21'));
});
test('guarded ordinary continuation retains exact anchored treatment, scope and prefix',()=>{
 const n=21,continued={...page(n),text:'x'.repeat(500),next_offset:500,continue_with:{name:'get_translation',arguments:{...args(n),offset:500,prefix_sha256:pin}}};
 assert.deepEqual(validateComparisonPage(continued,args(n),context(n)),continued.continue_with.arguments);
 for(const change of [{translation:bare},{translation:choice(22).translation_id},{uid:'an1.22'},{allow_shared:true},{allow_partial:true},{scope_sha256:pin}])assert.throws(()=>validateComparisonPage({...continued,continue_with:{name:'get_translation',arguments:{...continued.continue_with.arguments,...change}}},args(n),context(n)));
});
