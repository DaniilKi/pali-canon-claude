// Genuine, source-derived quotation windows at repeated blocks; no scripture is reconstructed.
import * as canon from '../../src/canon.mjs';
const dense=text=>canon.fold(text).replace(/[^a-z0-9]/gu,'');
const TARGETS=new Set(['dn1','dn9','dn16','dn23','dn30','mn9','mn22','mn26','mn56','mn98','mn143']);
export function verificationSpanFixtures() {
 const d=canon.load(),out=[];
 for(const u of d.canon.units.filter(u=>TARGETS.has(u.id))) {
  const blocks=d.canon.books[u.book].blocks,segs=canon.segments(u,{includeSourcePositions:true}),seen=new Map(),full=dense(blocks.slice(u.start,u.end).map(b=>b[2]).join(' '));let found=0;
  for(let i=u.start;i<u.end-1;i++) {
   const text=blocks[i][2],words=text.trim().split(/\s+/u);if(text.length<20||words.length<4)continue;
   if(!seen.has(text)){seen.set(text,i);continue;}
   const expected=segs.find(s=>s.source_blocks[0]<=i&&i<s.source_blocks[1]),earlier=segs.find(s=>s.text.includes(text));if(!expected||!earlier||expected.ref===earlier.ref)continue;
   const tail=words.slice(-6).join(' '),next=blocks.slice(i+1,Math.min(i+4,u.end)).map(b=>b[2]).join(' ').trim().split(/\s+/u).slice(0,14).join(' '),quote=tail+' '+next,key=dense(quote),at=full.indexOf(key);
   if(at<0||full.indexOf(key,at+1)>=0)continue;
   out.push({uid:u.id,quote,expected_ref:expected.ref,earlier_ref:earlier.ref});if(++found===(u.id==='dn1'?3:1))break;
  }
 }
 return out;
}
export function longVerificationQuote() {
 const seg=[...canon.segments(canon.resolve('MN 10').unit)].filter(s=>s.type!=='heading').sort((a,b)=>b.text.length-a.text.length)[0],words=[...seg.text.matchAll(/[\p{L}\p{N}]+/gu)],start=words.at(-100),last=words.at(-1);
 return seg.text.slice(start.index,last.index+last[0].length);
}
