// Reviewed held SN/AN pages and partial MN pages remain external human links.
// Keep older DN/Iti/Snp by-number topic policy outside this bounded repair.
import{readFileSync}from'node:fs';
const exclusions=JSON.parse(readFileSync(new URL('./canon/reviewed_exclusions.json',import.meta.url),'utf8')).exclusions;
const key=value=>{try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;return u.hostname.replace(/^www\./,'')+u.pathname;}catch{return null;}};
export function heldTopicReference(url,label,rows=exclusions){
 const k=key(url);if(!k)return null;
 const row=rows.find(r=>['ati','dhammatalks'].includes(r.source)&&key(r.url)===k&&/^withheld-(partial-unit|shared-page)$/.test(r.status)&&r.subject_ids?.some(id=>/^(sn|an)\d/.test(id)||(r.status==='withheld-partial-unit'&&/^mn\d/.test(id))));
 return row?{title:label,url:row.url,scope:'withheld-publisher-page'}:null;
}
export function reconcileTopicReferences(index,rows=exclusions){
 const output=structuredClone(index),removed=[];
 for(const t of output.topics){const keep=[];for(const x of t.texts){const external=heldTopicReference(x.ati_url,x.ati_reference,rows);if(!external){keep.push(x);continue;}const reading=t.further_reading||=[];if(!reading.some(r=>r.url===external.url&&r.scope===external.scope))reading.push(external);removed.push({topic:t.slug,id:x.id,url:x.ati_url});}t.texts=keep;}
 return{index:output,removed};
}
