/** Registered source pages can never be downgraded into unscoped whole-unit links. */
const stable=value=>JSON.stringify(Array.isArray(value)?value.map(v=>JSON.parse(stable(v))):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(stable(value[k]))])):value);
export function reviewedPartialLink(row,registry){
  return{source:'ati',path:row.path,url:'https://accesstoinsight.org'+row.path+'.html',english:row.english_title,translator:row.translator,license:row.license,
    reference:row.source_reference,match:'reviewed-partial-page',mapping_note:row.mapping_note,
    review:{ati_commit:registry.ati_commit,vri_commit:registry.vri_commit,source_html_sha256:row.source_html_sha256},partial_scope:row.partial_scope};
}
export function assertRegisteredPartial(link,unit,registry){
  let key;try{const u=new URL(link.url);key=u.hostname.replace(/^www\./,'')+u.pathname;}catch{}
  const row=registry.links.find(r=>link.path===r.path||key==='accesstoinsight.org'+r.path+'.html');
  if(!row)return;
  const expected=reviewedPartialLink(row,registry);
  if(unit.id!==row.unit_id||stable(link)!==stable(expected))throw Error('Registered partial source lost or changed its reviewed mapping. No whole-unit source or retrieval is inferred.');
}
