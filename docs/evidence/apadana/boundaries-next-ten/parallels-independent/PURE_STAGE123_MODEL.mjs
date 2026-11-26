
function modelCandidateStage123(corpus){
 const started=Date.now(),snapshot={canon:corpus},byId=new Map(corpus.units.map(u=>[u.id,u]));
 // Exact DD eligibility: truthy shared owner, then every resolvable range member.
 const docs=corpus.units.filter(u=>!u.shares_passage_with&&!(u.kind==='range'&&(u.members||[]).every(m=>byId.get(m)&&byId.get(m)!==u)));
 if(docs.length>=16384)throw Error('Frozen DF/doc packing bound exceeded');
 const K=PARAMS.shingle_words,S=PARAMS.stock_words,df=new Map(),df5=new Map(),wdf=new Map();let wordOccurrences=0,shingleOccurrences=0,fiveOccurrences=0;
 const perDoc=docs.map((u,di)=>{
  const shingles=[],g5=new Map(),seen=new Set();let pos=0,words=0,runs=0,segments=0;
  renderUnitSegments(u,snapshot).forEach(segment=>{
   if(segment.type==='heading')return;segments++;
   for(const piece of segment.text.split(/…\s*pe\s*…|\.\.\.\s*pe\s*\.\.\.|…|\bpe\b/)){
    const tokens=fold(piece).replace(/[^a-z]+/g,' ').trim().split(' ').filter(w=>w&&w!=='pe');if(!tokens.length)continue;runs++;words+=tokens.length;
    for(const w of tokens)if(!seen.has(w)){seen.add(w);wdf.set(w,(wdf.get(w)||0)+1);}
    for(let i=0;i+S<=tokens.length;i++){const key=hash(tokens.slice(i,i+S).join(' '));g5.set(pos+i,key);const v=df5.get(key);if(v===undefined)df5.set(key,16384+di);else if(v%16384!==di)df5.set(key,(Math.floor(v/16384)+1)*16384+di);fiveOccurrences++;}
    for(let i=0;i+K<=tokens.length;i++){const key=hash(tokens.slice(i,i+K).join(' '));shingles.push(key,pos+i);const v=df.get(key);if(v===undefined)df.set(key,16384+di);else if(v%16384!==di)df.set(key,(Math.floor(v/16384)+1)*16384+di);shingleOccurrences++;}
    pos+=tokens.length+K;
   }
  });wordOccurrences+=words;return {shingles,g5,words,runs,segments};
 });
 const stage1ms=Date.now()-started;
 // Position/segment sets are NOT used to decide candidate membership. Keep every
 // occurrence for stock-skipped count; retain unique accepted doc IDs per hash.
 const occ=new Map();let stockSkipped=0,rareOccurrences=0;
 perDoc.forEach((p,di)=>{for(let i=0;i<p.shingles.length;i+=2){const key=p.shingles[i],pos=p.shingles[i+1],n=Math.floor(df.get(key)/16384);if(n<2||n>PARAMS.max_texts_per_shingle)continue;let common=0;for(let j=pos;j+S<=pos+K;j++){if(!p.g5.has(j))throw Error('Unexpected absent stock window');if(Math.floor(df5.get(p.g5.get(j))/16384)>PARAMS.stock_texts)common++;}if(common*2>=K-S+1){stockSkipped++;continue;}let accepted=occ.get(key);if(!accepted)occ.set(key,accepted=new Set());accepted.add(di);rareOccurrences++;}});
 const stage2ms=Date.now()-started-stage1ms,pairs=new Set();
 for(const accepted of occ.values()){const ids=[...accepted].sort((a,b)=>a-b);for(let x=0;x<ids.length;x++)for(let y=x+1;y<ids.length;y++)pairs.add(ids[x]*16384+ids[y]);}
 const stage3ms=Date.now()-started-stage1ms-stage2ms;
 return {stats:{documents:docs.length,shingles:df.size,rare_shingles:occ.size,stock_shingles_skipped:stockSkipped,candidate_pairs:pairs.size},model_details:{word_occurrences:wordOccurrences,word_types:wdf.size,rare_word_types_le20:[...wdf.values()].filter(n=>n<=PARAMS.rare_word_texts).length,shingle_occurrences:shingleOccurrences,fivegram_types:df5.size,fivegram_occurrences:fiveOccurrences,stock_fivegram_types:[...df5.values()].filter(v=>Math.floor(v/16384)>PARAMS.stock_texts).length,accepted_rare_occurrences:rareOccurrences,stage1_ms:stage1ms,stage2_ms:stage2ms,stage3_ms:stage3ms},document_ids:docs.map(u=>u.id),per_uid:Object.fromEntries(docs.map((u,i)=>[u.id,{words:perDoc[i].words,runs:perDoc[i].runs,nonheading_segments:perDoc[i].segments,shingle_occurrences:perDoc[i].shingles.length/2,fivegram_positions:perDoc[i].g5.size}])),candidate_keys:[...pairs].sort((a,b)=>a-b)};
}

