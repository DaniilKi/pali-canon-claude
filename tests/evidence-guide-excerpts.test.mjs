import{test}from'node:test';import assert from'node:assert/strict';
import*as canon from'../src/canon.mjs';import{readingPlan,GUIDE_DATA}from'../src/daily.mjs';
import{checkGuideLink}from'../scripts/evidence/study.mjs';
const name='ati-into-the-stream';
test('independent evidence audit verifies all87 guide references, including exactly two reviewed external excerpts',()=>{
 const kinds=[];
 for(const[n,g]of Object.entries(GUIDE_DATA))for(const[path,id]of g.entries){const day=g.entries.findIndex(e=>e[0]===path)+1,r=readingPlan(canon,{name:n,day}).readings[0];kinds.push(checkGuideLink(r,path,id));}
 assert.equal(kinds.length,87);assert.equal(kinds.filter(k=>k==='external-excerpt').length,2);
});
test('guide evidence oracle rejects lost scope, invented assignments, source substitution and unreviewed exceptions',()=>{
 const r=readingPlan(canon,{name,day:2}).readings[0],path='mn/mn.095x.than';
 for(const field of ['scope','whole_unit_coverage','individual_alignment_verified','translator']){const bad=structuredClone(r);delete bad.guide_link[field];assert.throws(()=>checkGuideLink(bad,path,'mn95'),undefined,field);}
 const wrong=structuredClone(r);wrong.id='mn75';assert.throws(()=>checkGuideLink(wrong,path,'mn95'));
 const missing=structuredClone(r);missing.notes=[];assert.throws(()=>checkGuideLink(missing,path,'mn95'));
 const swapped=structuredClone(r);swapped.guide_link.url='https://www.dhammatalks.org/suttas/MN/MN95.html';assert.throws(()=>checkGuideLink(swapped,path,'mn95'));
 const unknown=structuredClone(r);unknown.id='mn21';unknown.guide_link.url='https://www.accesstoinsight.org/tipitaka/mn/mn.021x.than.html';assert.throws(()=>checkGuideLink(unknown,'mn/mn.021x.than','mn21'));
});
