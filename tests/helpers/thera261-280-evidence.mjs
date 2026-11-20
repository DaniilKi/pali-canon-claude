/** Sealed original-first A/B authority. No runtime imports or derived whitelist. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const blob=raw=>createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
const BASE='d31757b922fe2fa1fcf7bd903469e608f4eef6fb',REVISION='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';
const NUMBERS=[261,262,263,264,265,267,268,269,270,271,272,273,274,275,276,277,278,279];
const IDS=['tha-ap263','tha-ap264','tha-ap265','tha-ap266','tha-ap267','tha-ap269','tha-ap270','tha-ap271','tha-ap272','tha-ap273','tha-ap274','tha-ap275','tha-ap276','tha-ap277','tha-ap278','tha-ap279','tha-ap280','tha-ap281'];
function sealed(descriptor){
 assert.ok(descriptor&&/^[A-Z0-9_]+\.json$/.test(descriptor.file));assert.match(descriptor.sha256,/^[a-f0-9]{64}$/);
 const bytes=readFileSync(join('docs/evidence/apadana',descriptor.file));assert.equal(digest(bytes),descriptor.sha256,'Exact independent metadata seal '+descriptor.file);return JSON.parse(bytes);
}
export function thera261280Evidence(){
 const bytes=readFileSync('docs/evidence/apadana/THERA_261_280_APPROVAL.json');assert.equal(digest(bytes),'e25da6522df6f88bfcbf5fade43c6a8972d050425f5a6af1e6043d60440f896b');
 const approval=JSON.parse(bytes);assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');assert.equal(approval.base_commit,BASE);assert.equal(approval.publisher_revision,REVISION);
 assert.equal(approval.runtime_approval,false);assert.equal(approval.release_approval,false);assert.equal(approval.external_activations,0);
 assert.equal(approval.previous_intake.file,'THERA_HELD234_APPROVAL.json');assert.equal(approval.previous_intake.sha256,'14b739ffe5f3e6f01718ccd1c247dd35454d71abb6cf4d0de672295cef8f4aa7');
 const previous=sealed(approval.previous_intake),baseline=sealed(approval.baseline_freeze),profiles=sealed(approval.expected_profiles),links=sealed(approval.expected_links);
 const author=sealed(approval.source_approval),peer=sealed(approval.independent_source_approval),normalized=sealed(approval.independent_normalization),addendum=sealed(approval.source_approval_addendum);
 assert.equal(approval.source_approval.sha256,'dee7e7fa8e55cb539fbb7f4c9d09413eef931ad323f674ec8fd8ac8d31fd6ae5');assert.equal(approval.independent_source_approval.sha256,'8ce46b4cca025f55c61e10b8cd8c81fd154dbe7b811f433e7f33e2b29d95dae6');assert.equal(approval.independent_normalization.sha256,'e1c5d8d61de785a15b912269840c79793a259c39fa89ddcdba5bc30528df497c');
 assert.equal(approval.baseline_freeze.sha256,'dabf5d711fa8be38196e5de7b3b1c7b24462407ef4f50769a447e3c3c609ef44');
 assert.equal(baseline.baseline,BASE);assert.equal(baseline.profiles,285);assert.equal(baseline.canon_logical_sha256,'1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32');
 assert.deepEqual(approval.approved_ids,IDS);assert.deepEqual(approval.approved_records,IDS.map((id,i)=>({id,publisher_chapter:'chapter-3',poem:NUMBERS[i]})));
 assert.deepEqual(approval.baseline_ids,previous.expected_profile_ids);assert.equal(approval.baseline_ids.length,285);assert.deepEqual(approval.baseline_records,[...previous.baseline_records,...previous.approved_records]);
 assert.deepEqual(Object.keys(baseline.profile_objects),approval.baseline_ids);assert.deepEqual(Object.keys(baseline.translation_objects),approval.baseline_ids);
 assert.deepEqual(approval.expected_profile_ids,[...approval.baseline_ids,...IDS]);assert.equal(new Set(approval.expected_profile_ids).size,303);
 for(const proof of [author,peer]){
  assert.deepEqual(proof.approved_ids,IDS);assert.equal(proof.source_approval_count,18);assert.equal(proof.normalization_approval_count,18);assert.equal(proof.runtime_approval,false);assert.equal(proof.release_approval,false);
  assert.deepEqual(proof.approved_profile_objects,profiles);assert.deepEqual(proof.approved_link_objects,links);
 }
 assert.deepEqual(Object.keys(profiles),IDS);assert.deepEqual(Object.keys(links),IDS);assert.deepEqual(normalized.approved_ids,IDS);
 assert.equal(addendum.source_approval.sha256,approval.independent_source_approval.sha256);assert.equal(addendum.recommended_copyable_normalization.sha256,approval.independent_normalization.sha256);
 assert.equal(normalized.runtime_approval,false);assert.equal(normalized.release_approval,false);assert.equal(normalized.counts.poem_owned_notes,59);
 const packets=approval.goldens.map(sealed),rights=approval.rights.map(sealed),reviews=approval.source_reviews.map(sealed),seals=sealed(approval.normalization_seals),copyPolicy=sealed(approval.copy_policy);
 for(const [name,descriptor]of [['GOLDENS.json',approval.goldens[0]],['EXPECTED_PROFILES.json',approval.expected_profiles],['EXPECTED_LINKS.json',approval.expected_links],['SOURCE_APPROVAL.json',approval.source_approval],['RIGHTS_REVIEW.json',approval.rights[0]]])assert.equal(seals.files[name],descriptor.sha256);
 assert.equal(copyPolicy.source_and_runtime_approval_are_separate,true);assert.equal(seals.full_English_and_Pali_payloads_external_only,true);
 assert.equal(rights[0].translation_license,'CC BY-NC-SA 4.0');assert.equal(rights[0].specific_grant_over_generic_siteCCBY,true);assert.equal(rights[0].media_audio_fonts_images_rights_approved,false);assert.equal(rights[0].English_payloads_external_only,true);
 assert.equal(rights[1].license,'CC BY-NC-SA 4.0');assert.equal(rights[1].english_bodies_notes_and_apparatus_live_only,true);assert.equal(rights[1].no_audio_or_media_rights,true);
 assert.equal(rights[2].no_runtime_or_activation_or_release_approval,true);
 const one=(rows,key,id)=>{const found=rows.filter(row=>row[key]===id);assert.equal(found.length,1,'One sealed source proof '+id);return found[0];};
 const golden=id=>one(packets.flatMap(packet=>packet.poems),'id',id),independent=id=>one(normalized.poems,'canonical_owner',id);
 for(const id of IDS){const g=golden(id),b=independent(id),p=profiles[id];assert.equal(g.poem,b.publisher_poem);assert.equal(p.title,b.title);for(const key of ['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'])assert.equal(p[key],b[key]);assert.deepEqual(p.note_numbers,b.poem_note_numbers);assert.deepEqual(p.stanza_layout,b.stanza_layout);assert.deepEqual(p.mapping_notes,g.mapping_notes);}
 const checkout=process.env.APADANA_SOURCE_CHECKOUT;
 const artifact=id=>{assert.ok(IDS.includes(id),'Only exact18 approved source artifacts may be read');assert.ok(checkout,'APADANA_SOURCE_CHECKOUT is required');const g=golden(id),raw=readFileSync(join(checkout,g.path));assert.equal(raw.length,g.bytes);assert.equal(digest(raw),g.raw_sha256);assert.equal(blob(raw),g.git_blob_sha1);return raw.toString('utf8');};
 let externalPayloads=null;
 if(process.env.APADANA_261_280_PAYLOADS){const raw=readFileSync(process.env.APADANA_261_280_PAYLOADS);assert.equal(digest(raw),peer.B_original_first_payload_external_only.sha256);externalPayloads=JSON.parse(raw);assert.deepEqual(Object.keys(externalPayloads),IDS);}
 function assertNormalized(id,value){
  const b=independent(id),g=golden(id);assert.equal(digest(value.text),b.body_sha256);assert.equal(digest(JSON.stringify(value.translator_notes)),b.notes_sha256);assert.equal(digest(value.publisher_paratext),b.paratext_sha256);
  assert.deepEqual(value.text.split('\n\n').map(digest),b.body_paragraph_sha256s);assert.deepEqual(value.text.split('\n\n').map(p=>p.split('\n').length),b.body_paragraph_lines);
  assert.deepEqual(value.translator_notes.map(n=>n.number),b.poem_note_numbers);assert.deepEqual(value.translator_notes.map(n=>digest(n.text)),b.note_text_sha256s.map(n=>n.sha256));
  assert.equal(Object.hasOwn(value,'chapter_summary'),Boolean(b.chapter_summary));assert.equal(Object.hasOwn(value,'publisher_preface'),false,'Chapter headings never become prose-preface scopes');
  if(b.chapter_summary){for(const key of ['kind','label','parent_id','first_ref','last_ref','root_start','root_end','root_sha256','body_sha256','notes_sha256','note_numbers'])assert.deepEqual(value.chapter_summary[key],profiles[id].chapter_summary[key]);assert.equal(digest(value.chapter_summary.text),b.chapter_summary.body_sha256);assert.deepEqual(value.chapter_summary.translator_notes,[]);}
  if(externalPayloads){for(const key of ['text','translator_notes','publisher_paratext'])assert.deepEqual(value[key],externalPayloads[id][key]);if(b.chapter_summary)assert.equal(value.chapter_summary.text,externalPayloads[id].chapter_summary.text);}
  assert.equal(g.note_count,value.translator_notes.length);
 }
 return {approval,previous,baseline,author,peer,normalized,profiles,links,rights,reviews,packets,ids:IDS.slice(),golden,independent,artifact,assertNormalized,checkout,externalPayloads};
}
