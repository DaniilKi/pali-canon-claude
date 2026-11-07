import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {vinayaRule,ruleKeys,AS_PASSAGE} from '../src/vinaya-bmc.mjs';
import {parseCitation} from '../src/citations.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const native=(text,script)=>transliterate(text,'roman',script);
function same(actual,expected,script,text){const {input_script,input_romanized,...source}=actual;assert.deepEqual(source,expected);if(script==='roman'){assert.equal(input_script,undefined);assert.equal(input_romanized,undefined);}else{assert.equal(input_script,script);assert.equal(input_romanized,text.toLowerCase());}}
test('handwritten Thai Vinaya names and mixed Roman abbreviations/native numerals keep the canonical rule and BMC link',()=>{
 for(const [rule,roman] of [['ปาจิตฺติย ๕','pācittiya 5'],['Pc ๕','Pc 5']]){const r=vinayaRule(rule,canon);assert.equal(r.rule,'Pc 5');assert.equal(r.canonical_text.id,'pli-tv-bu-vb-pc5');assert.equal(r.input_script,'thai');assert.equal(r.input_romanized,roman);assert.deepEqual(r.buddhist_monastic_code,vinayaRule('Pc 5',canon).buddhist_monastic_code);}
});
test('all 227 rules accept their abbreviation, displayed class name and canonical ID across eight scripts',()=>{
 for(const key of ruleKeys()){
  const expected=vinayaRule(`pli-tv-bu-vb-${key}`,canon);
  for(const selector of [expected.rule,`${expected.class} ${expected.number}`,expected.canonical_text.id])for(const script of SCRIPTS)same(vinayaRule(native(selector,script),canon),expected,script,selector);
 }
});
test('multiword and hyphenated class aliases resolve in the canonical parser without changing who or range validation',()=>{
 for(const [name,key] of [['Nissaggiya Pācittiya','np'],['Nissaggiya-Pācittiya','np'],['Adhikaraṇa samatha','as'],['Adhikaraṇa-samatha','as']]){
  for(const [prefix,who] of [['','bu'],['Bu ','bu'],['Bhikkhu ','bu'],['Bi ','bi'],['Bhikkhunī ','bi']]){
   const ref=`${prefix}${name} 1`;assert.equal(parseCitation(ref).uid,`pli-tv-${who}-vb-${key}1`);
  }
  assert.throws(()=>vinayaRule(`${name} 1-2`,canon));
 }
 for(const rule of ['Pj Pc 5','Nissaggiya Pācittiya Sekhiya 5','Pj 1 Pc 5','Pc 5/6','Pc -5','Pc +5','Pc 1.5'])assert.throws(()=>vinayaRule(rule,canon));
});
test('native ambiguous, grouped, out-of-scope, mixed and invalid selectors do not silently select a bhikkhu rule',()=>{
 for(const script of SCRIPTS){
  for(const rule of ['Pj Pc 5','Pj 1 Pc 5','Pc 5/6','Pc -5','Pc +5','Pc 1.5','Pj 5','Pc 0','MN 10'])assert.throws(()=>vinayaRule(native(rule,script),canon));
  assert.throws(()=>vinayaRule(native('As 1-7',script),canon),/group of rules/);
  assert.throws(()=>vinayaRule(native('Bi Pc 5',script),canon),/bhikkhunī rule/);
  assert.throws(()=>vinayaRule(native('Bi Nissaggiya Pācittiya 5',script),canon),/bhikkhunī rule/);
 }
 for(const rule of ['ปาจิตฺतिย ๕','ป่าจิตฺติย ๕','漢Pc 5字','ηPc 5'])assert.throws(()=>vinayaRule(rule,canon),/converted completely/);
});
test('ambiguous PTS pages cannot silently choose one canonical rule, while unique pages still resolve',()=>{
 for(const script of SCRIPTS)for(const ref of ['Vin iv 185','Vin iv 186'])assert.throws(()=>vinayaRule(native(ref,script),canon),/more than one canonical passage.*Candidates include.*exact bhikkhu rule/);
 const resolved=canon.resolve('Vin iii 46');assert.equal(resolved.alternatives.length,0);const r=vinayaRule('Vin iii 46',canon);assert.equal(r.canonical_text.id,resolved.unit.id);assert.deepEqual(r.buddhist_monastic_code,vinayaRule(resolved.unit.id,canon).buddhist_monastic_code);
});
test('MCP native Vinaya navigation retains shared sources, paired BMC links and executable source commands',async()=>{
 const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'native-vinaya-fixture',version:'1'}),server=createServer();
 const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
 try{await Promise.all([client.connect(a),server.connect(b)]);for(const script of SCRIPTS)for(const selector of ['Nissaggiya Pācittiya 5','Adhikaraṇa-samatha 7','Sk 62']){
  const r=await call('vinaya_rule',{rule:native(selector,script)});same(r,vinayaRule(selector,canon),script,selector);assert.match(r.buddhist_monastic_code.kind,/commentary.*linked only/);assert.equal(r.buddhist_monastic_code.text,undefined);
  const {tool,...args}=r.canonical_text.reading_command,page=await call(tool,args);assert.equal(page.text_id,args.uid);assert.deepEqual(page.source,r.canonical_text.source);assert.deepEqual(page.segments,canon.segments(canon.resolve(args.uid).unit).slice(0,page.limit));
  if(r.rule==='As 7'){assert.equal(page.text_id,AS_PASSAGE);assert.match(r.notes.join(' '),/one paragraph/);assert.doesNotMatch(page.segments.map(s=>s.text).join(' '),/Bhikkhunīvibhaṅg/);}
  if(r.rule==='Sk 62')assert.equal(r.buddhist_monastic_code.discussed_with,'Sk 61');
 }
 for(const rule of ['Pc -๕','ปาจิตฺติย ๕/๖','漢Pc 5字','Vin iv 185','Vin iv ๑๘๕'])assert.equal((await client.callTool({name:'vinaya_rule',arguments:{rule}})).isError,true);
 }finally{await client.close();await server.close();}
});
