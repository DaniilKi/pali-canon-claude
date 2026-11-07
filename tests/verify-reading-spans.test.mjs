import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {verificationSpanFixtures,longVerificationQuote} from '../scripts/evidence/verification-spans.mjs';
const dense=text=>canon.fold(text).replace(/[^a-z0-9]/gu,'');
const squash=text=>text.replace(/\s+/gu,' ').trim();
function readMatch(hit) {
 const all=canon.segments(canon.resolve(hit.text_id).unit),span=hit.source_span,commands=hit.reading_commands;
 assert.equal(hit.segment_ref,span.first_segment_ref);assert.equal(all[span.offset].ref,span.first_segment_ref);assert.equal(all[span.end_offset-1].ref,span.last_segment_ref);assert.equal(span.segments,span.end_offset-span.offset);
 assert.deepEqual(hit.read_with,commands[0]);let next=span.offset;const read=[];
 for(const {tool,uid,offset,limit}of commands){assert.equal(tool,'get_text');assert.equal(uid,hit.text_id);assert.equal(offset,next);assert.ok(limit>=1&&limit<=200);read.push(...all.slice(offset,offset+limit));next+=limit;}
 assert.equal(next,span.end_offset);assert.deepEqual(read,all.slice(span.offset,span.end_offset));
 const text=read.map(s=>s.text).join('\n');assert.ok(squash(text).includes(squash(hit.matched_text.replace(/…$/u,''))));return text;
}
test('source positions distinguish repeated paragraphs and expose complete reading spans',async()=>{
 const fixtures=verificationSpanFixtures();assert.equal(fixtures.length,13);assert.deepEqual(fixtures.filter(f=>f.uid==='dn1').map(f=>f.expected_ref),['dn1/92','dn1/97','dn1/109']);let targetHits=0;
 for(const f of fixtures){const r=await verifyQuote({text:f.quote,language:'pali',limit:10});assert.equal(r.verdict,'found');for(const hit of r.matches)readMatch(hit);const target=r.matches.find(m=>m.text_id===f.uid&&m.similarity===1);if(target){targetHits++;assert.equal(target.segment_ref,f.expected_ref);assert.notEqual(target.segment_ref,f.earlier_ref);assert.equal(dense(target.matched_text),dense(f.quote));assert.ok(dense(readMatch(target)).includes(dense(f.quote)));}}
 assert.ok(targetHits>=10,`Only ${targetHits} fixture texts were returned`);
});
test('long previews truncate at source word boundaries and commands retain the full quotation',async()=>{
 const quote=longVerificationQuote();assert.ok(quote.length>600&&quote.length<=2000);const r=await verifyQuote({text:quote,language:'pali',limit:5});const hit=r.matches.find(m=>m.similarity===1);assert.ok(hit);assert.equal(hit.matched_text_truncated,true);assert.ok(hit.matched_text.endsWith('…'));assert.ok(dense(quote).startsWith(dense(hit.matched_text)));assert.ok(dense(readMatch(hit)).includes(dense(quote)));
});
test('fuzzy source snippets retain a trailing source combining mark',async()=>{
 const block=canon.load().canon.books.find(b=>b.file==='s0504m.mul.xml').blocks[1164][2],quote=block.split('ः')[0];
 const r=await verifyQuote({text:quote,language:'pali',limit:10}),hit=r.matches.find(m=>m.text_id==='iti112');assert.ok(hit);assert.equal(r.comparison.method,'normalized_fuzzy');assert.ok(hit.matched_text.endsWith('ः'));readMatch(hit);
});
