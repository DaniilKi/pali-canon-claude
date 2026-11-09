import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {comparisonChoices,comparisonSelection,validateComparisonPage} from '../web/translation-comparison.mjs';

const uid='mn10',choices=canon.describe(canon.resolve(uid).unit).english;
const [first,second]=choices,id=first.translation_id,other=second.translation_id;
const pin='a'.repeat(64),nextPin='b'.repeat(64),initialPin='e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const context=()=>({uid,choices,accepted:null});
const args=()=>({uid,translation:id,limit:500});
function page({offset=0,continued=false}={}){
  const text=continued?'x'.repeat(500):'Synthetic comparison wording only.';
  return {text_id:uid,citation:'MN 10',translation_id:id,translator:first.translator,source:first.source,
    attribution:'Synthetic full attribution.',license:'Synthetic licence for testing only.',
    text,offset,limit:500,prefix_sha256:offset?pin:initialPin,total_characters:continued?offset+1000:offset+text.length,
    next_offset:continued?offset+500:null,
    continue_with:continued?{name:'get_translation',arguments:{uid,translation:id,offset:offset+500,limit:500,prefix_sha256:nextPin}}:null};
}

test('actual MN10 metadata offers four distinct exact ordinary choices without changing source metadata',()=>{
  const before=structuredClone(choices),ordinary=comparisonChoices(choices,uid);
  assert.equal(ordinary.length,4);assert.deepEqual(ordinary.map(c=>c.translation_id),choices.map(c=>c.translation_id));
  assert.deepEqual(comparisonSelection(ordinary.slice(0,2).map(c=>c.translation_id),choices,uid),[id,other]);
  assert.deepEqual(comparisonSelection(ordinary.map(c=>c.translation_id),choices,uid),ordinary.map(c=>c.translation_id));
  ordinary[0].translator='Changed local display label';assert.deepEqual(choices,before);
});

test('any scope presence or explicit non-whole claim is excluded while the original picker list stays intact',()=>{
  const inputs=[first,{...second,translation_scope:null},{...choices[2],translation_scope:undefined},{...choices[3],whole_unit_coverage:false}],before=structuredClone(inputs);
  assert.deepEqual(comparisonChoices(inputs,uid),[first]);assert.deepEqual(inputs,before);
  for(const scope of [{kind:'partial_unit'},{kind:'shared_page'},null,undefined])assert.deepEqual(comparisonChoices([{...first,translation_scope:scope}],uid),[]);
  const inherited=Object.assign(Object.create({translation_scope:null}),first);assert.deepEqual(comparisonChoices([inherited],uid),[]);
  assert.deepEqual(comparisonChoices([{...first,whole_unit_coverage:true}],uid),[{...first,whole_unit_coverage:true}]);
});

test('malformed, ambiguous and unsupported ordinary choices fail without promoting a scope',()=>{
  for(const input of [null,{},[null],[first,first],[first,{...first,translation_scope:null}],[{...first,translation_id:'default'}],[{...first,translation_id:'https://www.dhammatalks.org/suttas/MN/MN10.html'}],[{...first,translation_id:'sc:mn10'}],[{...first,translation_id:'dt:MN/../MN10'}],[{...first,translation_id:'ati:/unapproved/path'}],[{...first,translation_id:'dt:MN/MN10.html'}],[{...first,translator:''}],[{...first,whole_unit_coverage:null}]])assert.throws(()=>comparisonChoices(input,uid));
  assert.throws(()=>comparisonChoices([{...first,translation_id:id+'\n'}],uid));
  for(const wrong of ['MN 10','mn10/2','mn10\n','',null])assert.throws(()=>comparisonChoices(choices,wrong));
});

test('comparison selection requires two through four unique exact ordinary IDs, never names, defaults or scoped pages',()=>{
  const invalid=[undefined,null,[],[id],[id,id],[id,other,'default'],[id,first.translator],[id,'dt:NOT_LISTED'],[id,other,...choices.map(c=>c.translation_id)]];
  for(const ids of invalid)assert.throws(()=>comparisonSelection(ids,choices,uid));
  const scoped=[first,{...second,translation_scope:null}];assert.throws(()=>comparisonSelection([id,other],scoped,uid));
  const ids=[id,other],selected=comparisonSelection(ids,choices,uid);selected.reverse();assert.deepEqual(ids,[id,other]);
});

test('a matching ordinary column passes the existing provenance guard and refuses fallback to another listed version',()=>{
  assert.equal(validateComparisonPage(page(),args(),context()),null);
  assert.equal(validateComparisonPage(page(),args(),{uid,choices:[first],accepted:null}),null);
  for(const changed of [{translation_id:other,translator:second.translator},{translation_id:'ati:/tipitaka/mn/unknown',translator:first.translator}])assert.throws(()=>validateComparisonPage({...page(),...changed},args(),context()),/different English source/);
  for(const changed of [{translator:'Unreviewed translator'},{text_id:'mn11'},{attribution:''},{license:undefined},{text:''},{translation_scope:null},{whole_unit_coverage:false},{limit:501},{offset:1},{prefix_sha256:'bad'},{next_offset:undefined}])assert.throws(()=>validateComparisonPage({...page(),...changed},args(),context()));
  assert.throws(()=>validateComparisonPage(page(),args(),{...context(),accepted:{kind:'partial_unit'}}));
});

test('request guards require the exact requested unit, edition and bounded limit with no hidden flags or scope pins',()=>{
  const invalid=[{uid:'mn11'},{translation:'default'},{translation:first.translator},{translation:other},{limit:undefined},{limit:499},{limit:30001},{limit:500.5},{offset:-1},{offset:0.5},{offset:2000001},{offset:null},{prefix_sha256:pin},{allow_partial:false},{allow_shared:false},{allow_fallback:false},{scope_sha256:pin},{translation_scope:null},{unknown_parameter:true}];
  for(const change of invalid)assert.throws(()=>validateComparisonPage(page(),{...args(),...change},context()),JSON.stringify(change));
  const continued=page({offset:500});
  assert.equal(validateComparisonPage(continued,{...args(),offset:500,prefix_sha256:pin},context()),null);
  for(const prefix_sha256 of [undefined,'wrong','c'.repeat(64)])assert.throws(()=>validateComparisonPage(continued,{...args(),offset:500,prefix_sha256},context()));
});

test('checked continuations preserve exact column identity and limit and are isolated from caller mutations',()=>{
  const data=page({continued:true}),request=args(),ctx=context(),before=structuredClone({data,request,ctx});
  const next=validateComparisonPage(data,request,ctx);assert.deepEqual(next,data.continue_with.arguments);
  next.uid='mn11';assert.deepEqual({data,request,ctx},before);
  const follow=page({offset:500,continued:true});follow.prefix_sha256=nextPin;
  assert.deepEqual(validateComparisonPage(follow,data.continue_with.arguments,ctx),follow.continue_with.arguments);
});

test('malformed or widened continuations cannot issue a request or change scopes, pins or pagination',()=>{
  const original=page({continued:true});
  const changes=[{uid:'mn11'},{translation:other},{translation:'default'},{limit:501},{limit:30001},{limit:499},{offset:0},{offset:499},{offset:501},{offset:2000001},{prefix_sha256:undefined},{prefix_sha256:'wrong'},{allow_partial:false},{allow_shared:true},{allow_fallback:false},{scope_sha256:pin},{unexpected:true}];
  for(const change of changes){const changed=structuredClone(original);Object.assign(changed.continue_with.arguments,change);assert.throws(()=>validateComparisonPage(changed,args(),context()),JSON.stringify(change));}
  for(const change of [{next_offset:501},{next_offset:0},{next_offset:2000001},{next_offset:null},{continue_with:{name:'get_text',arguments:original.continue_with.arguments}},{continue_with:{...original.continue_with,unexpected:true}},{text:'Short page despite a continuation.'}])assert.throws(()=>validateComparisonPage({...original,...change},args(),context()));
  const terminal=page();terminal.continue_with=original.continue_with;assert.throws(()=>validateComparisonPage(terminal,args(),context()));
  const overflow=page({offset:1999900});overflow.text='x'.repeat(101);assert.throws(()=>validateComparisonPage(overflow,{...args(),offset:1999900,prefix_sha256:pin},context()));
});

test('policy helpers are pure and cannot fetch, alter source bindings or change translation caches',()=>{
  const saved=globalThis.fetch,before=structuredClone(choices);let requests=0;
  globalThis.fetch=()=>{requests++;throw Error('Comparison policy cannot retrieve sources');};
  try{comparisonChoices(choices,uid);comparisonSelection([id,other],choices,uid);validateComparisonPage(page(),args(),context());assert.equal(requests,0);assert.deepEqual(choices,before);}finally{globalThis.fetch=saved;}
});
