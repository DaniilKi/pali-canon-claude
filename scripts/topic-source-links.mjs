// Reviewed held SN/AN pages, partial MN pages and four exact DN pages remain
// external human links. Other legacy DN/Iti/Snp policy is outside this repair.
import{readFileSync}from'node:fs';
const exclusions=JSON.parse(readFileSync(new URL('./canon/reviewed_exclusions.json',import.meta.url),'utf8')).exclusions;
const partialRegistry=JSON.parse(readFileSync(new URL('./canon/reviewed_partial_pages.json',import.meta.url),'utf8'));
const key=value=>{try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port)return null;return u.hostname.replace(/^www\./,'')+u.pathname;}catch{return null;}};
const reviewedDn=new Map([
 ['accesstoinsight.org/tipitaka/dn/dn.21.2x.than.html','dn21'],
 ['accesstoinsight.org/tipitaka/dn/dn.26.0.than.html','dn26'],
 ['dhammatalks.org/suttas/DN/DN21.html','dn21'],
 ['dhammatalks.org/suttas/DN/DN26.html','dn26'],
]);
export function heldTopicReference(url,label,rows=exclusions,registry=partialRegistry){
 const k=key(url);if(!k)return null;
 // Retiring the MN54 whole-page hold into one approved paragraph does not give
 // a topic authority to map the publisher's entire page as English for MN54.
 if(k==='accesstoinsight.org/tipitaka/mn/mn.054x.than.html'&&registry.links?.some(p=>p.unit_id==='mn54'&&p.path==='/tipitaka/mn/mn.054x.than'&&p.partial_scope?.unit_id==='mn54'&&p.partial_scope.status==='reviewed'&&p.partial_scope.source_commit===registry.vri_commit))return{title:label,url:'https://www.accesstoinsight.org/tipitaka/mn/mn.054x.than.html',scope:'withheld-publisher-page'};
 const row=rows.find(r=>['ati','dhammatalks'].includes(r.source)&&key(r.url)===k&&/^withheld-(partial-unit|shared-page)$/.test(r.status)&&r.subject_ids?.some(id=>/^(sn|an)\d/.test(id)||(r.status==='withheld-partial-unit'&&(/^mn\d/.test(id)||reviewedDn.get(k)===id))));
 return row?{title:label,url:row.url,scope:'withheld-publisher-page'}:null;
}
export function reconcileTopicReferences(index,rows=exclusions){
 const output=structuredClone(index),removed=[];
 for(const t of output.topics){const keep=[];for(const x of t.texts){const external=heldTopicReference(x.ati_url,x.ati_reference,rows);if(!external){keep.push(x);continue;}const reading=t.further_reading||=[];if(!reading.some(r=>r.url===external.url&&r.scope===external.scope))reading.push(external);removed.push({topic:t.slug,id:x.id,url:x.ati_url});}t.texts=keep;}
 return{index:output,removed};
}
