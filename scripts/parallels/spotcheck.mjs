// Draws a seeded random sample of 30 parallels links for a hand check (D59), printing the evidence and the
// cited text side by side. Usage: node scripts/parallels/spotcheck.mjs c|s   (c: commentary citations, s: shared
// passages); SEED=<n> picks another sample.
import * as par from '../../src/parallels.mjs'; import * as canon from '../../src/canon.mjs';
import { paragraphWindow } from './citations.mjs';
const d=par.load(); const c=canon.load();
let s=+(process.env.SEED||20261101);const rnd=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648};
const pick=(arr,n)=>{const out=new Set();while(out.size<n)out.add(Math.floor(rnd()*arr.length));return [...out].map(i=>arr[i])};
const kind=process.argv[2];
if(kind==='c'){ for(const [i,l] of pick(d.citations,30).entries()){const u=c.byId.get(l.to);
  console.log(`\n#${i+1} ${l.from} -> ${l.to} (${u.title}) [${l.match}] ${l.commentary_ref}`);
  console.log('  EV:',l.evidence.slice(-300).replace(/\n/g,' / '));
  if(l.cited){const bi=c.canon.books.findIndex(b=>b.file===l.cited.vri_file);const [a,b]=l.cited.reference_paragraphs.split('-').map(Number);console.log('  CITED ¶',l.cited.reference_paragraphs,':',paragraphWindow(bi,a,b||a).slice(0,600).replace(/\n/g,' / '))}
}}
else { const words=t=>canon.fold(t).replace(/[^a-z]+/g,' ').trim().split(' ');
 for(const [i,l] of pick(d.shared,30).entries()){const A=c.byId.get(l.a),B=c.byId.get(l.b);
  const sa=new Map(canon.segments(A).map(x=>[x.ref,x.text])),sb=new Map(canon.segments(B).map(x=>[x.ref,x.text]));
  const ta=l.a_segments.map(r=>sa.get(r)).join(' '),tb=l.b_segments.map(r=>sb.get(r)).join(' ');
  // longest common word run
  const wa=words(ta),wb=words(tb);let best=[0,0,0];const pos=new Map();wb.forEach((w,j)=>(pos.get(w)||pos.set(w,[]).get(w)).push(j));
  for(let x=0;x<wa.length;x++)for(const j of pos.get(wa[x])||[]){let k=0;while(x+k<wa.length&&j+k<wb.length&&wa[x+k]===wb[j+k])k++;if(k>best[0])best=[k,x,j]}
  console.log(`\n#${i+1} ${l.a} (${A.title}) <-> ${l.b} (${B.title}) words=${l.shared_words} run=${l.longest_run_words} score=${l.score} cov=${l.a_coverage}/${l.b_coverage}`);
  console.log('  LONGEST COMMON RUN',best[0],':',wa.slice(best[1],best[1]+best[0]).join(' ').slice(0,400));
  console.log('  A:',ta.slice(0,260).replace(/\n/g,' / '));console.log('  B:',tb.slice(0,260).replace(/\n/g,' / '));
}}
