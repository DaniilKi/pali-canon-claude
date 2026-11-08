import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyQuote} from '../src/verify.mjs';
import {validatePaliQuote} from '../web/quote-check.mjs';
const quote='Sabbapāpassa akaraṇaṃ kusalassa upasampadā sacittapariyodapanaṃ';
const actual=await verifyQuote({text:quote,language:'pali',limit:5});
test('browser guard accepts actual repeated source wording with ties and exact source links',()=>{
 assert.equal(validatePaliQuote(actual,quote),actual); assert.ok(actual.equally_similar_texts>1); assert.ok(actual.matches.some(m=>m.text_id==='dhp183'));
});
test('wrong request, language, verdict and missing scope never produce a browser verdict',()=>{
 for(const change of [{quote:'another quotation'},{language:'english'},{verdict:'authentic'},{scope:{}},{comparison:{}},{comparison:{...actual.comparison,verbatim:true}},{citation_note:''},{thresholds:{}},{matches:[]},{matches:Array(6).fill(actual.matches[0])}])assert.throws(()=>validatePaliQuote({...actual,...change},quote));
});
test('unsafe or mismatched reading commands and absent source spans are refused',()=>{
 const match=actual.matches[0];
 for(const change of [{text_id:'javascript:alert(1)'},{read_with:{...match.read_with,uid:'dhp183'}},{read_with:{...match.read_with,offset:-1}},{read_with:{...match.read_with,tool:'get_translation'}},{source_span:{}},{segment_ref:'wrong/1'},{similarity:Infinity},{matched_text:''},{edition:''}])assert.throws(()=>validatePaliQuote({...actual,matches:[{...match,...change}]},quote));
});
test('empty negative results remain scope-limited and malformed negative candidates are still refused',()=>{
 const d={...actual,verdict:'not_found_in_scope',matches:[]};assert.equal(validatePaliQuote(d,quote),d);
 assert.throws(()=>validatePaliQuote({...d,matches:[{...actual.matches[0],read_with:null}]},quote));
});
