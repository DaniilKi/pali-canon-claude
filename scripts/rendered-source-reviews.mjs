// Offline triage memory only. Rendered observations are not runtime source pins.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail=message=>{throw Error(`Invalid rendered review memory: ${message}`);};
function keys(value,required,optional=[]) {
  if(!object(value)||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>![...required,...optional].includes(k)))fail('unsupported or missing fields');
}
function text(value,max=1000) {if(typeof value!=='string'||!value.trim()||value.length>max||/[\r\n]/.test(value))fail('invalid metadata text');}
function date(value) {if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)fail('invalid observation date');}
function root(value) {
  keys(value,['id','book','start','end','title','collection','acronym','vri','pts','root_blocks_sha256'],['kind','members','approximate','shares_passage_with']);
  for(const k of ['id','title','collection','acronym','vri'])text(value[k],256);
  if(!Number.isInteger(value.book)||value.book<0||!Number.isInteger(value.start)||value.start<0||!Number.isInteger(value.end)||value.end<=value.start||!hash(value.root_blocks_sha256))fail('invalid complete-root identity');
  keys(value.pts,['volume','page','end_page']);
  if(!['volume','page','end_page'].every(k=>Number.isInteger(value.pts[k])&&value.pts[k]>0)||value.pts.end_page<value.pts.page)fail('invalid root PTS metadata');
  if(Object.hasOwn(value,'kind'))text(value.kind,64);
  if(Object.hasOwn(value,'members')&&(!Array.isArray(value.members)||value.members.some(x=>typeof x!=='string')))fail('invalid root members');
  if(Object.hasOwn(value,'approximate')&&typeof value.approximate!=='boolean')fail('invalid approximate marker');
  if(Object.hasOwn(value,'shares_passage_with'))text(value.shares_passage_with,256);
}
function bounds(value,total) {if(!Array.isArray(value)||value.length!==2||!value.every(Number.isInteger)||value[0]<0||value[1]<value[0]||value[1]>=total)fail('invalid rendered bounds');}
const canonicalUrl=value=>typeof value==='string'&&/^https:\/\/www\.dhammatalks\.org\/suttas\/[A-Z]+\/[A-Za-z0-9_]+\.html$/.test(value);

export function validateRenderedReview(memory) {
  // The public screen API intentionally has no implicit review memory.
  if(object(memory)&&Object.keys(memory).length===1&&Array.isArray(memory.rows)&&memory.rows.length===0)return memory;
  keys(memory,['version','evidence_kind','reviewed_on','vri_commit','purpose','runtime_authority','current_upstream_freshness_verified','new_coverage','rows']);
  if(memory.version!==1||memory.evidence_kind!=='publisher-rendered-web'||memory.runtime_authority!==false||memory.current_upstream_freshness_verified!==false||memory.new_coverage!==0)fail('unsupported evidence or authority');
  date(memory.reviewed_on);text(memory.purpose);
  if(typeof memory.vri_commit!=='string'||!/^[a-f0-9]{40}$/.test(memory.vri_commit)||!Array.isArray(memory.rows)||memory.rows.length>32)fail('invalid review header');
  const seen=new Set();
  for(const row of memory.rows) {
    keys(row,['owner','translation_id','source','url','decision','original_link','link_metadata_sha256','root','boundary_control','rendered_view','observations','rights','historical_review','limits']);
    if(row.source!=='dhammatalks'||row.decision!=='retain'||!canonicalUrl(row.url)||row.translation_id!==`dt:${row.url.split('/suttas/')[1].replace(/\.html$/,'')}`)fail('unsupported source identity');
    text(row.owner,128);root(row.root);
    if(row.root.id!==row.owner||seen.has(row.owner)||seen.has(row.translation_id))fail('ambiguous reviewed owner');
    seen.add(row.owner);seen.add(row.translation_id);
    keys(row.original_link,['source','url','translator','reference','match']);
    for(const k of ['translator','reference','match'])text(row.original_link[k],256);
    if(row.original_link.source!==row.source||row.original_link.url!==row.url||!hash(row.link_metadata_sha256)||sha({owner:row.owner,link:row.original_link})!==row.link_metadata_sha256)fail('inconsistent original binding fingerprint');
    keys(row.boundary_control,['role','relation','root']);root(row.boundary_control.root);
    const control=row.boundary_control.root;
    if(row.boundary_control.role!=='adjacent-boundary-control'||row.boundary_control.relation!=='immediately-after'||control.id===row.owner||control.book!==row.root.book||control.start!==row.root.end)fail('invalid adjacent control');
    const view=row.rendered_view;
    keys(view,['evidence_kind','source_url','observed_on','total_lines','first_line','last_line','scripture_lines','primary_rendering_lines','alternative_rendering_lines','alternative_label_line','crawl_observation']);
    if(view.evidence_kind!=='publisher-rendered-web'||view.source_url!==row.url||view.observed_on!==memory.reviewed_on||!Number.isInteger(view.total_lines)||view.total_lines<1||view.total_lines>1000000||view.first_line!==0||view.last_line!==view.total_lines-1)fail('incomplete or mismatched primary view');
    date(view.observed_on);text(view.crawl_observation);
    for(const k of ['scripture_lines','primary_rendering_lines','alternative_rendering_lines'])bounds(view[k],view.total_lines);
    if(view.primary_rendering_lines[0]!==view.scripture_lines[0]||view.alternative_rendering_lines[1]!==view.scripture_lines[1]||!Number.isInteger(view.alternative_label_line)||view.alternative_label_line<=view.primary_rendering_lines[1]||view.alternative_label_line>=view.alternative_rendering_lines[0])fail('inconsistent rendering boundaries');
    for(const k of ['observations','limits'])if(!Array.isArray(row[k])||!row[k].length||row[k].length>16)fail('missing review limitations');else row[k].forEach(x=>text(x));
    keys(row.rights,['notice_url','notice_lines','license_url','observation','individual_notice_limit']);
    if(row.rights.notice_url!=='https://www.dhammatalks.org/'||row.rights.license_url!=='https://creativecommons.org/licenses/by-nc/4.0/')fail('unsupported rights evidence');
    bounds(row.rights.notice_lines,1000000);text(row.rights.observation);text(row.rights.individual_notice_limit);
    keys(row.historical_review,['decision','reviewed_on','evidence_json','evidence_markdown','regression_test','observation']);
    text(row.historical_review.decision,64);date(row.historical_review.reviewed_on);
    for(const k of ['evidence_json','evidence_markdown','regression_test','observation'])text(row.historical_review[k]);
  }
  return memory;
}

function rootMatches(data,proof) {
  const unit=data.byId.get(proof.id),{root_blocks_sha256,...identity}=proof,blocks=data.canon.books?.[unit?.book]?.blocks;
  return !!unit&&isDeepStrictEqual(unit,identity)&&Array.isArray(blocks)&&unit.start>=0&&unit.end<=blocks.length&&sha(blocks.slice(unit.start,unit.end))===root_blocks_sha256;
}

// Call after validateRenderedReview. This function never reads publisher content.
export function renderedReviewFor(data,owner,link,memory) {
  if(link.source!=='dhammatalks')return null;
  const id=`dt:${String(link.url).split('/suttas/')[1]?.replace(/\.html$/,'')}`;
  const prior=memory.rows.find(row=>row.owner===owner||row.translation_id===id);
  if(!prior)return null;
  const control=prior.boundary_control.root,unit=data.byId.get(owner),next=data.byId.get(control.id);
  const current=owner===prior.owner&&id===prior.translation_id&&data.canon.source.commit===memory.vri_commit&&sha({owner,link})===prior.link_metadata_sha256&&rootMatches(data,prior.root)&&rootMatches(data,control)&&unit.book===next.book&&unit.end===next.start;
  return {status:current?'reviewed-retained-at-snapshot':'stale-reviewed-snapshot',
    ...(current?{reviewed_on:memory.reviewed_on,review_evidence_kind:memory.evidence_kind,review_rendered_view:structuredClone(prior.rendered_view),review_note:'Historical rendered observation only; no raw source pins, current-upstream freshness, runtime authority, scope activation or new rights approval.'}:{})};
}
