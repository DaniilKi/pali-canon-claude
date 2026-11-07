import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {sourceQuoteFixtures} from '../scripts/evidence/source-quotes.mjs';

test('all printed canonical conversion exceptions verify only as unchanged source substrings',async()=>{
 const fixtures=sourceQuoteFixtures();assert.equal(fixtures.length,19);let repeatedChecked=false;
 for(const fixture of fixtures) for(const language of ['pali','auto']) {
  const r=await verifyQuote({text:fixture.text,language,limit:1});assert.equal(r.quote,fixture.text);assert.equal(r.verdict,'found');assert.equal(r.language,'pali');
  assert.equal(r.comparison.method,'literal_source_substring');assert.equal(r.comparison.verbatim,'not_assessed');assert.equal(r.input_script,undefined);assert.equal(r.input_romanized,undefined);
  assert.equal(r.source_literal.query_preserved,true);assert.equal(r.source_literal.native_conversion,false);assert.ok(r.source_literal.matching_blocks>=1);assert.equal(r.source_literal.returned_blocks,1);
  assert.equal(r.thresholds.found,undefined);assert.match(r.explanation,/does not establish correct spelling/);
  const match=r.matches[0],{tool,uid,offset,limit}=match.read_with;assert.equal(tool,'get_text');assert.equal(limit,1);
  const {unit}=canon.resolve(uid),segments=canon.segments(unit);assert.equal(segments[offset].ref,match.segment_ref);assert.ok(segments[offset].text.includes(fixture.text));assert.equal(match.matched_text,fixture.text);
  if(!repeatedChecked&&r.source_literal.matching_blocks>1) {
   const repeated=await verifyQuote({text:fixture.text,language:'pali',limit:2});assert.equal(repeated.source_literal.matching_blocks,r.source_literal.matching_blocks);assert.equal(repeated.matches.length,2);assert.equal(new Set(repeated.matches.map(m=>m.segment_ref)).size,2);repeatedChecked=true;
  }
 }
 assert.equal(repeatedChecked,true);
});

test('source rescue cannot repair altered glyphs, cross scopes or fetch English',async()=>{
 let fetches=0;const options={fetchTranslation:async()=>{fetches++;throw Error('UNEXPECTED_FETCH')}};
 const fixture=sourceQuoteFixtures()[0];
 for(const text of ['漢'+fixture.text,'η'+fixture.text,'สति สติ สติ','Mrammaraṭṭhe mौṃjvānagare leḍītīaraññavihāravāsinā mahā therena katāyaṃ paccayuddesadīpanī.']) await assert.rejects(verifyQuote({text,language:'auto'},options),/converted completely/);
 await assert.rejects(verifyQuote({text:fixture.text,language:'english'},options),/converted completely/);
 const original=sourceQuoteFixtures().map(f=>canon.load().canon.books.find(b=>b.file===f.file).blocks[f.block][2]).find(text=>{const w=[...text.matchAll(/\S+/gu)];return w.length>120&&/[\u0900-\u097f]/u.test(text.slice(0,w[120].index+w[120][0].length));});assert.ok(original);const words=[...original.matchAll(/\S+/gu)];
 const long=original.slice(words[0].index,words[120].index+words[120][0].length);await assert.rejects(verifyQuote({text:long,language:'pali'},options),/at most 120 words/);
 assert.equal(fetches,0);
});
