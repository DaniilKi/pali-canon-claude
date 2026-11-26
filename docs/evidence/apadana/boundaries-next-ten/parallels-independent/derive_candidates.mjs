/** Independent stage1–3 model. Frozen DD declarations only; no app imports/final filter. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const E='/tmp/pali-next-ten-evidence-nov26',out=E+'/parallels-independent',frozen=E+'/dd7-originals';
const sha=x=>createHash('sha256').update(x).digest('hex'),read=p=>readFileSync(p),json=p=>JSON.parse(read(p));
const manifest=json(frozen+'/ORIGINAL_MANIFEST.json');if(manifest.base_commit!=='dd7b697df2c54308084fffd934af38130d01f952')throw Error('Wrong frozenDD source');
const sources={};for(const name of ['src/canon.mjs','src/editions.mjs','scripts/parallels/shared.mjs']){const raw=read(frozen+'/'+name);if(sha(raw)!==manifest.files[name].sha256)throw Error('Frozen source hash drift: '+name);sources[name]=raw.toString('utf8');}
const oldPacked=read(E+'/input/canon.json.gz'),oldRaw=gunzipSync(oldPacked),canon=JSON.parse(oldRaw);
if(sha(oldRaw)!=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b')throw Error('Wrong old canonical');
const oldMetaRaw=read(E+'/source-oracle/OLD_TEN_RECORDS.json'),newMetaRaw=read(E+'/source-oracle/NEW_TEN_RECORDS.json');
if(sha(oldMetaRaw)!=='cce5323b93fc6be3a415e9fb75146d8f1e1696ce7530d2634286d00bebff6255'||sha(newMetaRaw)!=='c0a008965acd462b45dcf35eaf8e19abd6246f36a9c64fbb4cab5d4fd16962b0')throw Error('Unsealed original-first metadata');
const oldMeta=JSON.parse(oldMetaRaw),newMeta=JSON.parse(newMetaRaw);for(const[id,expected]of Object.entries(oldMeta)){const rows=canon.units.filter(u=>u.id===id);if(rows.length!==1||JSON.stringify(rows[0])!==JSON.stringify(expected))throw Error('Old full object mismatch: '+id);}
const future={...canon,units:canon.units.map(u=>newMeta[u.id]||u)};if(sha(JSON.stringify(future))!=='f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de')throw Error('Future does not equal independent complete oracle');
const bookHash=sha(JSON.stringify(canon.books));if(bookHash!=='ad8c7cbfa8249d4f21eb94bd59b556e8823e5870dcf0a657bfaedee5a0fd4883'||future.books!==canon.books)throw Error('Source book mutation');
const declaration=(source,name)=>{const regex=new RegExp(`(?:export )?const ${name} = [\\s\\S]*?;`),m=source.match(regex);if(!m)throw Error('Missing exact declaration '+name);return m[0].replace(/^export /,'');};
const fn=(source,name)=>{const marker='function '+name+'(',start=source.indexOf(marker);if(start<0||source.indexOf(marker,start+1)>=0)throw Error('Exact unique function missing: '+name);const end=source.indexOf('\n}',start);if(end<0)throw Error('Function end absent: '+name);return source.slice(start,end+2);};
const c=sources['src/canon.mjs'],ed=sources['src/editions.mjs'],shared=sources['scripts/parallels/shared.mjs'];
const pieces=[...['ROMAN','HEADING','CENTRE_HEADING','VERSE','VERSE_CITED','PTS_ABBR','fold'].map(n=>declaration(c,n)),...['EDITIONS','SCOPE_LABEL'].map(n=>declaration(ed,n)),fn(c,'ptsLabel'),fn(ed,'editionIndex'),fn(ed,'editionLabel'),fn(c,'renderUnitSegments'),fn(shared,'hash'),declaration(shared,'PARAMS')];
const model=String.raw`
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
`;
const extracted=pieces.join('\n\n');writeFileSync(out+'/EXTRACTED_FROZEN_DECLARATIONS.mjs',extracted+'\n',{flag:'wx'});writeFileSync(out+'/PURE_STAGE123_MODEL.mjs',model+'\n',{flag:'wx'});
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){for(const item of Object.values(v))freeze(item);Object.freeze(v);}return v;};freeze(canon);freeze(future);
const pureCode=extracted+'\n'+model+'\nexport {modelCandidateStage123,PARAMS};\n';
if(/\b(?:process|fetch|require|readFileSync|writeFileSync|setTimeout|globalThis)\b/.test(pureCode)||/^\s*import\b/m.test(pureCode))throw Error('Unexpected I/O or loader dependency in finite pure replay');
writeFileSync(out+'/PURE_NATIVE_REPLAY.mjs',pureCode,{flag:'wx'});
const {modelCandidateStage123,PARAMS}=await import(pathToFileURL(out+'/PURE_NATIVE_REPLAY.mjs'));
const phases={};for(const[name,corpus]of [['old',canon],['new',future]]){const at=Date.now();phases[name]=modelCandidateStage123(corpus);global.gc?.();process.stderr.write(JSON.stringify({phase:name,seconds:(Date.now()-at)/1000,stats:phases[name].stats,rss:process.memoryUsage().rss})+'\n');}
if(JSON.stringify(phases.old.document_ids)!==JSON.stringify(phases.new.document_ids))throw Error('Unexpected eligibility change');
const oldSet=new Set(phases.old.candidate_keys),newSet=new Set(phases.new.candidate_keys),pair=(k,ids)=>[ids[Math.floor(k/16384)],ids[k%16384]],removed=[...oldSet].filter(k=>!newSet.has(k)).map(k=>pair(k,phases.old.document_ids)),added=[...newSet].filter(k=>!oldSet.has(k)).map(k=>pair(k,phases.new.document_ids));
const perUid={};for(const[k,list]of [['removed',removed],['added',added]])for(const[a,b]of list){(perUid[a]||={removed:[],added:[]})[k].push(b);(perUid[b]||={removed:[],added:[]})[k].push(a);}
const changedDocStats=Object.keys(phases.old.per_uid).filter(id=>JSON.stringify(phases.old.per_uid[id])!==JSON.stringify(phases.new.per_uid[id])).map(id=>({id,old:phases.old.per_uid[id],new:phases.new.per_uid[id]}));
const outputs={};for(const phase of ['old','new']){const pairs=phases[phase].candidate_keys.map(k=>pair(k,phases[phase].document_ids)),text=JSON.stringify(pairs,null,2)+'\n',name=phase.toUpperCase()+'_CANDIDATE_PAIRS.json';writeFileSync(out+'/'+name,text,{flag:'wx'});outputs[name]={bytes:Buffer.byteLength(text),sha256:sha(text),pairset_compact_sha256:sha(JSON.stringify(pairs))};delete phases[phase].candidate_keys;delete phases[phase].per_uid;delete phases[phase].document_ids;}
const report={schema:'independent-frozen-dd-shared-stage123-model-v1',status:'DERIVED_FROM_FROZEN_OLD_CANON_AND_PRESEALED_TEN_METADATA_ONLY',baseline_commit:manifest.base_commit,old_canon_logical_sha256:sha(oldRaw),new_canon_logical_sha256:sha(JSON.stringify(future)),old_canon_packed_sha256:sha(oldPacked),all61_books_sha256:bookHash,source_books_unchanged:true,metadata_pins:{old_ten_sha256:sha(oldMetaRaw),new_ten_sha256:sha(newMetaRaw)},frozen_sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,sha(v)])),extracted_declarations_sha256:sha(extracted+'\n'),pure_model_sha256:sha(model+'\n'),params:JSON.parse(JSON.stringify(PARAMS)),phases,delta:{removed_pairs:removed,added_pairs:added,per_uid:perUid,changed_document_stats:changedDocStats},candidate_files:outputs,facade:'Only exact finite frozen renderer/edition/hash/fold declarations plus independent eligibility/DF/stock/pair-membership model; no load(), application imports, builder, final filtering or candidate output read.',membership_equivalence:'Frozen Pass3 adds a pair iff two distinct documents have at least one accepted rare-shingle occurrence in common. Deduplicating documentIDs within an occurrence list preserves EXACT candidate-key membership, although final position sets are intentionally not modeled.',final_edge_scope:'No final edges computed or consumed. Candidate deltas precede overlap/same-method/coverage/run/rare-word filtering and do not imply published edge changes.',bounds:{outer_seconds:120,node_old_space_MB:768,pure_module_no_IO_or_app_imports:true},no_network_Git_tests_or_app_imports:true};writeFileSync(out+'/MODEL_REPORT.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});process.stdout.write(JSON.stringify({status:report.status,old:report.phases.old.stats,new:report.phases.new.stats,delta:report.delta,report_sha256:sha(read(out+'/MODEL_REPORT.json'))})+'\n');
