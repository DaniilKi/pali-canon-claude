// Read-only metadata leads. This never approves, withholds, fetches or changes a source.
import {pathToFileURL} from 'node:url';
import * as canon from '../src/canon.mjs';
import {isScoped} from '../src/translation-scope.mjs';
export function scopeScreen(data=canon.load()) {
  const rows=[];
  for(const [owner,links] of Object.entries(data.translations))for(const link of links){
    if(isScoped(link)||link.match==='reviewed-story')continue;
    const reasons=[];
    if(/\d\s*[-–—]\s*\d/u.test(link.reference||''))reasons.push('publisher-reference range');
    if(/\d+-\d+x?\./.test(link.path||''))reasons.push('publisher-filename range');
    if(/whole-samyutta|whole-collection/.test(link.match||''))reasons.push('collection-level match');
    if(!reasons.length)continue;
    const u=data.byId.get(owner);
    const range=s=>{const m=String(s||'').match(/(\d+)\s*[-–—]\s*(\d+)/u);return m?{first:Number(m[1]),last:Number(m[2]),width:Number(m[2])-Number(m[1])+1}:null;};
    const publisherExtent=range(link.reference),rootExtent=range(u?.vri);
    const widerVerseReference=['thag','thig','snp','pv','vv'].includes(u?.collection)&&publisherExtent&&rootExtent&&publisherExtent.width>rootExtent.width*2&&publisherExtent.width>rootExtent.width+4;
    rows.push({owner,translation_id:canon.translationId(link),source:link.source,url:link.url,reference:link.reference||null,match:link.match||null,reasons,triage:widerVerseReference?'inspect wider verse-reference extent':'metadata lead',
      ...(widerVerseReference?{publisher_reference_extent:publisherExtent,indexed_vri_extent:rootExtent,extent_warning:'Verse numbering can differ by edition; width differences alone do not prove an error.'}:{}),
      indexed_root:u?{id:u.id,title:u.title,vri:u.vri||null,book:u.book,start:u.start,end:u.end,kind:u.kind||null,members:u.members||[],approximate:!!u.approximate}:null});
  }
  rows.sort((a,b)=>Number(b.triage.startsWith('inspect'))-Number(a.triage.startsWith('inspect'))||a.source.localeCompare(b.source)||a.owner.localeCompare(b.owner)||a.translation_id.localeCompare(b.translation_id));
  return{version:1,screening_only:true,source_commit:data.canon.source.commit,count:rows.length,
    warning:'Metadata leads only. Publisher numbering can differ from indexed IDs; a primary record may contain several VRI sections, and chapter/range sources may be legitimate. Read complete publisher content and root boundaries before any change. No body, licence or individual alignment approval is inferred.',rows};
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href)console.log(JSON.stringify(scopeScreen(),null,2));
