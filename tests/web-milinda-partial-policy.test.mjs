import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scopeDescriptor,validateEnglishPage} from '../web/translation-policy.mjs';
const uid='mil6.4.1',id='ati:/tipitaka/kn/miln/miln.5x.olen',sha='a'.repeat(64),pin='b'.repeat(64);
const scope=()=>({kind:'partial_unit',version:1,unit_id:uid,first_ref:uid+'/20',last_ref:uid+'/21',source_commit:'synthetic-source-pin',pali_sha256:sha,text_sha256:sha,notice_sha256:sha,scope_sha256:pin,extractor:'ati-milinda-medicine-two-verses-v1',whole_unit_coverage:false,pali_segments:2,read_with:{tool:'get_text',uid,offset:19,limit:2},note:'Synthetic selection disclosure.'});
const choice=()=>({translation_id:id,translator:'Andrew Olendzki',translation_scope:scope()});
const args=()=>({uid,translation:id,allow_partial:true,scope_sha256:pin,limit:500});
const page=()=>({text_id:uid,translation_id:id,translator:'Andrew Olendzki',text:'Synthetic English policy fixture only.',attribution:'Synthetic attribution.',license:'Synthetic licence.',offset:0,next_offset:null,translation_scope:scope(),whole_unit_coverage:false});
const context=()=>({uid,choices:[choice()],accepted:scopeDescriptor(choice(),uid)});
test('only the exact two-stanza selection offers partial consent and a finite two-segment Pāli command',()=>{
 const descriptor=scopeDescriptor(choice(),uid);assert.equal(descriptor.kind,'partial_unit');assert.deepEqual(descriptor.flags,{allow_partial:true,scope_sha256:pin});assert.deepEqual(descriptor.scope.read_with,{tool:'get_text',uid,offset:19,limit:2});assert.equal(validateEnglishPage(page(),args(),context()),null);
});
test('the reserved publisher page cannot become an ordinary whole source or a generic freeverse selection',()=>{
 assert.throws(()=>scopeDescriptor({translation_id:id,translator:'Andrew Olendzki'},uid));
 for(const change of [{extractor:'ati-freeverse-v1'},{extractor:'ati-excerpt-verse-pre-v1'},{version:2},{kind:'shared_page'},{unit_id:'mil6.4.2'},{first_ref:uid+'/19'},{last_ref:uid+'/22'},{pali_segments:1},{pali_segments:3},{whole_unit_coverage:true}])assert.throws(()=>scopeDescriptor({...choice(),translation_scope:{...scope(),...change}},uid));
 assert.throws(()=>scopeDescriptor({...choice(),whole_unit_coverage:true},uid));assert.throws(()=>scopeDescriptor(choice(),'mil6.4.2'));
 for(const translation_id of [id+'.html',id+'#verse',id.replace('/tipitaka/','%2Ftipitaka%2F')])assert.throws(()=>scopeDescriptor({...choice(),translation_id},uid));
 const ordinary={...page()};delete ordinary.translation_scope;delete ordinary.whole_unit_coverage;
 assert.throws(()=>validateEnglishPage(ordinary,{uid,translation:id},{uid,choices:[{translation_id:id,translator:'Andrew Olendzki'}]}));
});
test('the finite selector cannot be reused on another publisher page or unit',()=>{
 for(const translation_id of ['ati:/tipitaka/kn/miln/miln.5x.horn','ati:/tipitaka/sn/sn27/sn27.001-010.than'])assert.throws(()=>scopeDescriptor({...choice(),translation_id},uid));
});
test('the bounded Pāli command and all text/notice/consent pins are mandatory',()=>{
 for(const change of [{read_with:undefined},{read_with:{tool:'get_text',uid,offset:18,limit:2}},{read_with:{tool:'get_text',uid,offset:19,limit:3}},{read_with:{tool:'get_text',uid:'mil6.4.2',offset:19,limit:2}},{read_with:{tool:'get_text',uid,offset:19,limit:2,script:'roman'}},{read_pages:[]},{pali_excerpt:{}},{source_commit:''},{pali_sha256:undefined},{text_sha256:undefined},{notice_sha256:undefined},{scope_sha256:undefined}])assert.throws(()=>scopeDescriptor({...choice(),translation_scope:{...scope(),...change}},uid));
});
test('response and chooser cannot jointly lose consent or broaden the declared scope',()=>{
 for(const change of [{allow_partial:undefined},{allow_partial:false},{allow_shared:true},{scope_sha256:undefined},{scope_sha256:'c'.repeat(64)}])assert.throws(()=>validateEnglishPage(page(),{...args(),...change},context()));
 for(const change of [{text_id:'mil6.4.2'},{whole_unit_coverage:true},{translation_scope:undefined},{translation_scope:{...scope(),extractor:'ati-freeverse-v1'}},{translation_scope:{...scope(),scope_sha256:'c'.repeat(64)}}])assert.throws(()=>validateEnglishPage({...page(),...change},args(),context()));
 const downgraded={...choice()};delete downgraded.translation_scope;assert.throws(()=>validateEnglishPage(page(),args(),{...context(),choices:[downgraded]}));
});
test('source-specific continuation keeps exact consent, prefix and selection boundaries',()=>{
 // Synthetic long response only: the real approved poem is265 characters and terminal at minimum500.
 const next={...args(),offset:500,prefix_sha256:sha},continued={...page(),text:'x'.repeat(500),next_offset:500,continue_with:{name:'get_translation',arguments:next}};
 assert.deepEqual(validateEnglishPage(continued,args(),context()),next);
 for(const change of [{uid:'mil6.4.2'},{translation:'ati:/tipitaka/kn/miln/miln.5x.horn'},{allow_partial:false},{scope_sha256:undefined},{prefix_sha256:undefined}])assert.throws(()=>validateEnglishPage({...continued,continue_with:{name:'get_translation',arguments:{...next,...change}}},args(),context()));
});
