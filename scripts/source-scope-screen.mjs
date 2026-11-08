import {assertRegisteredPartial} from '../src/partial-source-registry.mjs';
// Offline metadata leads. This never approves, withholds, fetches or changes a source.
import {pathToFileURL} from 'node:url';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import {isScoped} from '../src/translation-scope.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
export const mappingFingerprint=(owner,link)=>sha(JSON.stringify({owner,link}));
const ranges=value=>[...String(value||'').matchAll(/(\d+)\s*[-–—]\s*(\d+)/gu)].map(m=>{
  const first=Number(m[1]);let last=Number(m[2]);
  // Bibliographic 537–41 means 537–541; this is extent triage, never ID alignment.
  if(m[2].length<m[1].length){const base=10**m[2].length;last=Math.floor(first/base)*base+last;if(last<first)last+=base;}
  return{first,last,width:last-first+1};
});
export function scopeScreen(data=canon.load(),{review={rows:[]}}={}) {
  const rows=[];
  for(const [owner,links] of Object.entries(data.translations))for(const link of links){
    assertRegisteredPartial(link,data.byId.get(owner),data.partialRegistry||{links:[]});
    if(isScoped(link)||link.match==='reviewed-story')continue;
    const reasons=[];
    const u=data.byId.get(owner),rootExtent=ranges(u?.vri)[0];
    const extents=ranges(link.reference);
    // Only explicit verse-collection references: never interpret PTS pages,
    // chapter:poem citations or bare numbers as individually aligned verses.
    const single=['thag','thig','snp','pv','vv'].includes(u?.collection)
      ? String(link.reference||'').match(/^\s*(Thag|Thig|Sn|Snp|Pv|Vv)\s+(\d+)\s*$/i) : null;
    const prefix={thag:'thag',thig:'thig',sn:'snp',snp:'snp',pv:'pv',vv:'vv'};
    const singleVerse=single&&prefix[single[1].toLowerCase()]===u.collection;
    if(singleVerse)extents.push({first:Number(single[2]),last:Number(single[2]),width:1});
    const publisherExtent=extents[0];
    if(extents.length&&!singleVerse)reasons.push('publisher-reference range');
    if(/\d+-\d+x?\./.test(link.path||''))reasons.push('publisher-filename range');
    if(/whole-samyutta|whole-collection/.test(link.match||''))reasons.push('collection-level match');
    if(singleVerse)reasons.push('explicit single-verse reference');
    if(/\bexcerpt\b/i.test([link.english,link.reference].filter(Boolean).join(' ')))reasons.push('publisher excerpt label');
    if(!reasons.length)continue;
    const malformed=extents.some(r=>r.width<=0);
    const verse=['thag','thig','snp','pv','vv'].includes(u?.collection)&&publisherExtent&&rootExtent;
    const discontinuous=verse&&/\d\s*[,;]\s*\d/u.test(link.reference||'');
    const narrower=verse&&extents.length===1&&publisherExtent.width<rootExtent.width*0.9;
    const wider=verse&&publisherExtent.width>rootExtent.width*2&&publisherExtent.width>rootExtent.width+4;
    let triage=malformed?'inspect malformed publisher-reference range':discontinuous?'inspect discontinuous verse-reference extent':narrower?'inspect narrower verse-reference extent':wider?'inspect wider verse-reference extent':'metadata lead';
    if(malformed)reasons.push('malformed publisher-reference range');
    if(discontinuous)reasons.push('discontinuous publisher-reference ranges');
    if(narrower)reasons.push('narrower verse-reference extent');
    const id=canon.translationId(link),prior=review.rows?.find(r=>r.owner===owner&&r.translation_id===id&&r.decision==='retain');
    let reviewStatus='unreviewed';
    if(prior){
      // A snapshot annotation is never evidence that the current upstream remains unchanged.
      const book=data.canon.books?.[u?.book];
      const current=review.vri_commit===data.canon.source.commit&&prior.link_metadata_sha256===mappingFingerprint(owner,link)&&book&&['id','title','vri','book','start','end'].every(k=>prior.root?.[k]===u?.[k])&&prior.root?.root_blocks_sha256===sha(JSON.stringify(book.blocks.slice(u.start,u.end)));
      reviewStatus=current?'reviewed-retained-at-snapshot':'stale-reviewed-snapshot';
      if(current)triage='reviewed retained snapshot';
    }
    rows.push({owner,translation_id:id,source:link.source,url:link.url,reference:link.reference||null,match:link.match||null,reasons,triage,review_status:reviewStatus,
      ...(reviewStatus==='reviewed-retained-at-snapshot'?{reviewed_on:review.reviewed_on,review_source_commit:review.ati_commit,review_note:'Frozen source review only; no current-upstream freshness, runtime scope or new rights approval.'}:{}),
      ...(verse&&(wider||narrower||discontinuous)?{publisher_reference_extents:extents,indexed_vri_extent:rootExtent,extent_warning:'Verse numbering, headers and editions can differ; extent differences alone do not prove an error.'}:{}),
      indexed_root:u?{id:u.id,title:u.title,vri:u.vri||null,book:u.book,start:u.start,end:u.end,kind:u.kind||null,members:u.members||[],approximate:!!u.approximate}:null});
  }
  const rank=row=>row.review_status==='reviewed-retained-at-snapshot'?5:row.triage.includes('malformed')?-1:row.triage.includes('discontinuous')?0:row.triage.includes('narrower')?1:row.triage.includes('wider')?2:3;
  rows.sort((a,b)=>rank(a)-rank(b)||a.source.localeCompare(b.source)||a.owner.localeCompare(b.owner)||a.translation_id.localeCompare(b.translation_id));
  const reviewed=rows.filter(r=>r.review_status==='reviewed-retained-at-snapshot').length;
  return{version:2,screening_only:true,source_commit:data.canon.source.commit,count:rows.length,reviewed_retained_snapshots:reviewed,unreviewed_leads:rows.length-reviewed,
    warning:'Metadata leads only. Publisher numbering can differ from indexed IDs; a primary record may contain several VRI sections, and chapter/range sources may be legitimate. Read complete publisher content and root boundaries before any change. No body, licence or individual alignment approval is inferred. Review annotations describe frozen snapshots, not current upstream freshness.',rows};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const flag=process.argv.indexOf('--review'),file=flag<0?new URL('./canon/retained_ordinary_pages.json',import.meta.url):process.argv[flag+1];
  if(flag>=0&&!file)throw Error('--review requires a JSON review file');
  const review=flag>=0||existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{rows:[]};
  console.log(JSON.stringify(scopeScreen(canon.load(),{review}),null,2));
}
