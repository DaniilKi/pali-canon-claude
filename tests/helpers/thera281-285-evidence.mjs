/** Original-first B hash authority; no runtime or current-whitelist dependency. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {thera261280Evidence} from './thera261-280-evidence.mjs';
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const blob=raw=>createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
const REV='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4',BASE='929e5c83d4157a0339ab24bb7039e1441a348b2c';
const NUMBERS=[281,282,283,284,285],IDS=['tha-ap283','tha-ap284','tha-ap285','tha-ap286','tha-ap287'];
// Actual final A/B/curation seals; historical303 reconstruction remains independent.
const FINAL_SEALS={approval:'52c1813c72685a7a78f4f29ed860035c06e61f1b209f601ed0b2e9a36de3206f',author:'17f3c9b149c35c728c5668399dc0a599085b8e747d2ba650f9405dc00ae24e6d',peer:'bd0be2b38de251ad499d2237715790a1b14595493e233f1af9e144a266ed4640'};
function sealed(descriptor){
 assert.ok(descriptor&&/^[A-Z0-9_]+\.json$/.test(descriptor.file));assert.match(descriptor.sha256,/^[a-f0-9]{64}$/);
 const bytes=readFileSync(join('docs/evidence/apadana',descriptor.file));assert.equal(digest(bytes),descriptor.sha256,'Exact source metadata seal '+descriptor.file);return JSON.parse(bytes);
}
export function thera281285Evidence(){
 const bytes=readFileSync('docs/evidence/apadana/THERA_281_285_APPROVAL.json');assert.equal(digest(bytes),FINAL_SEALS.approval);
 const approval=JSON.parse(bytes),older=thera261280Evidence();
 assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');assert.equal(approval.base_commit,BASE);assert.equal(approval.publisher_revision,REV);
 assert.equal(approval.runtime_approval,false);assert.equal(approval.release_approval,false);assert.equal(approval.external_activations,0);assert.equal(approval.before_canon_sha256,approval.after_canon_sha256);assert.equal(approval.after_canon_sha256,'1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32');
 assert.deepEqual(approval.held_ids,['tha-ap72','tha-ap142','tha-ap160','tha-ap161','tha-ap262','tha-ap268','tha-ap282']);assert.ok(approval.approved_ids.every(id=>!approval.held_ids.includes(id)));
 assert.deepEqual(approval.previous_intake,{file:'THERA_261_280_APPROVAL.json',sha256:'e25da6522df6f88bfcbf5fade43c6a8972d050425f5a6af1e6043d60440f896b'});
 const previous=sealed(approval.previous_intake),compact=sealed(approval.baseline_freeze),profiles=sealed(approval.expected_profiles),links=sealed(approval.expected_links);
 assert.equal(approval.baseline_freeze.sha256,'58a3af1a6a9f817c57c9087551f901993fc47850f1b88a66c2c8b4c0d04e83d2');
 const baseline={profile_objects:{...older.baseline.profile_objects,...older.profiles},translation_objects:{...older.baseline.translation_objects,...older.links},canon_logical_sha256:older.baseline.canon_logical_sha256};
 const reconstruction=sealed(approval.baseline_reconstruction_review);assert.equal(approval.baseline_reconstruction_review.sha256,'c957ee9a7eea33439c1c55abe46780a3c804a2a92b1c906dee85b513b2831f01');assert.equal(reconstruction.profiles,303);assert.equal(reconstruction.links,303);assert.deepEqual(reconstruction.ordered_ids,compact.ordered_ids);
 assert.equal(compact.baseline,BASE);assert.equal(compact.profiles,303);assert.equal(compact.canon_logical_sha256,baseline.canon_logical_sha256);
 assert.deepEqual(compact.ordered_ids,previous.expected_profile_ids);assert.deepEqual(Object.keys(baseline.profile_objects),compact.ordered_ids);assert.deepEqual(Object.keys(baseline.translation_objects),compact.ordered_ids);
 for(const id of compact.ordered_ids){assert.equal(digest(JSON.stringify(baseline.profile_objects[id])),compact.profile_object_sha256[id]);assert.equal(digest(JSON.stringify(baseline.translation_objects[id])),compact.translation_object_sha256[id]);}
 assert.deepEqual(approval.baseline_ids,compact.ordered_ids);assert.deepEqual(approval.baseline_records,[...previous.baseline_records,...previous.approved_records]);
 assert.deepEqual(approval.approved_ids,IDS);assert.deepEqual(approval.approved_records,IDS.map((id,i)=>({id,publisher_chapter:'chapter-3',poem:NUMBERS[i]})));
 assert.deepEqual(approval.expected_profile_ids,[...compact.ordered_ids,...IDS]);assert.equal(new Set(approval.expected_profile_ids).size,308);
 assert.deepEqual(Object.keys(profiles),IDS);assert.deepEqual(Object.keys(links),IDS);
 const author=sealed(approval.source_approval),peer=sealed(approval.independent_source_approval),normalized=sealed(approval.independent_normalization);
 assert.equal(approval.source_approval.sha256,FINAL_SEALS.author);assert.equal(approval.independent_source_approval.sha256,FINAL_SEALS.peer);
 assert.equal(approval.independent_normalization.sha256,'cc41346f1d6d09aebadc52dcb2e28b47032b3df2ed06ccc11eaafe7116cb0360');
 assert.equal(normalized.status,'B_ORIGINAL_FIRST_FIVE_NORMALIZED_METADATA_SEALED_BEFORE_A_COMPARISON');assert.equal(normalized.production_parser_or_A_outputs_used,false);assert.equal(normalized.full_wording_files_written,false);assert.equal(normalized.runtime_or_release_approval,false);
 assert.deepEqual(normalized.totals,{poems:5,body_paragraphs:35,physical_stanza_entries:20,local_verse_labels:23,poem_notes:32,chapter_headings:1,chapter_summaries:0});
 assert.equal(author.status,'SOURCE_AND_FINITE_NORMALIZATION_APPROVED_FIVE_REVIEW_A_ONLY');assert.equal(peer.status,'APPROVE_FIVE_EXACT_PUBLISHER281_285_SOURCE_FINITE_NORMALIZATION_AND_MAPS_ONLY');
 for(const proof of [author,peer]){assert.deepEqual(proof.approved_ids,IDS);assert.equal(proof.source_approval_count,5);assert.equal(proof.normalization_approval_count,5);assert.equal(proof.runtime_approval,false);assert.equal(proof.release_approval,false);assert.deepEqual(proof.approved_profile_objects,profiles);assert.deepEqual(proof.approved_link_objects,links);}
 assert.equal(peer.B_independent_normalization_sha256,approval.independent_normalization.sha256);
 assert.equal(approval.expected_profiles.sha256,'50390be204501c1a82efb1f4b67c1a685ad702c2d60c39a6f88120b4c480ed30');assert.equal(approval.expected_links.sha256,'c4db039b0fb86065b4d9cae28c708d3cd0292a1477b1e41edcbce9310308859b');
 const packets=approval.goldens.map(sealed),rights=approval.rights.map(sealed),reviews=approval.source_reviews.map(sealed),copyPolicy=sealed(approval.copy_policy),normalizationSeals=sealed(approval.normalization_seals);
 const normalizationReplay=sealed(approval.normalization_replay);assert.equal(normalizationReplay.status,'PASS_FIVE_ORIGINAL_SOURCE_AND_FINITE_NORMALIZATION_METADATA_ONLY');assert.equal(normalizationReplay.poems,5);assert.equal(normalizationReplay.all_xml_tuple_count,14645);assert.equal(normalizationReplay.full_english_payload_files_written,0);assert.equal(normalizationReplay.full_pali_payload_files_written,0);
 assert.equal(copyPolicy.full_normalized_payload_files_created,0);assert.equal(normalizationSeals.full_payload_files,0);assert.equal(normalizationSeals.runtime_approval,false);assert.equal(normalizationSeals.release_approval,false);
 const B_RIGHTS='d2df7050f9dffea912d8ed3e5062c16195e234754fd0cdc5fe9f5817eef7916c';assert.ok(approval.rights.some(d=>d.sha256===B_RIGHTS));
 const bRights=rights[approval.rights.findIndex(d=>d.sha256===B_RIGHTS)];assert.equal(bRights.specific_translation_license,'CC BY-NC-SA4.0');assert.equal(bRights.generic_site_CC_BY_does_not_relax_translation_terms,true);assert.equal(bRights.rights_artifacts.length,6);
 const one=(rows,key,id)=>{const found=rows.filter(row=>row[key]===id);assert.equal(found.length,1,'One independent source proof '+id);return found[0];};
 const independent=id=>one(normalized.poems,'canonical_owner',id),golden=id=>one(packets.flatMap(packet=>packet.poems),'id',id);
 assert.equal(approval.goldens[0].sha256,'7c2083449977ac2de7cedb9df34dea6f5eee02449ec029dd6d6bb3cbca26f9ad');
 for(const id of IDS){const b=independent(id),p=profiles[id],g=golden(id);assert.deepEqual(p.mapping_notes,g.mapping_notes);assert.equal(g.root.root_sha256,b.root_sha256);assert.deepEqual(g.notes.map(n=>n.body_sha256),b.note_text_sha256s.map(n=>n.sha256));assert.equal(p.id,id);assert.equal(p.poem,b.publisher_poem);assert.equal(p.title,b.title);for(const key of ['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'])assert.equal(p[key],b[key]);assert.deepEqual(p.note_numbers,b.poem_note_numbers);assert.deepEqual(p.stanza_layout,b.stanza_layout);assert.equal(p.translation_revision,REV);assert.equal(p.license,'CC BY-NC-SA 4.0');assert.ok(p.mapping_notes.length);}
 for(const[name,descriptor]of [['GOLDENS.json',approval.goldens[0]],['EXPECTED_PROFILES.json',approval.expected_profiles],['EXPECTED_LINKS.json',approval.expected_links]]){assert.equal(author.core_seals[name],descriptor.sha256);assert.equal(normalizationReplay.files[name],descriptor.sha256);assert.equal(normalizationSeals.files['core/'+name],descriptor.sha256);}
 assert.equal(normalizationSeals.files['SOURCE_APPROVAL.json'],approval.source_approval.sha256);assert.equal(normalizationSeals.files['COPY_POLICY.json'],approval.copy_policy.sha256);
 const checkout=process.env.APADANA_SOURCE_CHECKOUT;
 const artifact=id=>{assert.ok(IDS.includes(id),'Only exact five reviewed source artifacts may be read');assert.ok(checkout,'APADANA_SOURCE_CHECKOUT is required');const b=independent(id),raw=readFileSync(join(checkout,b.source_path));assert.equal(raw.length,b.raw_bytes);assert.equal(digest(raw),b.raw_sha256);assert.equal(blob(raw),b.git_blob_sha1);return raw.toString('utf8');};
 function assertNormalized(id,value){
  const b=independent(id);assert.equal(digest(value.text),b.body_sha256);assert.equal(digest(JSON.stringify(value.translator_notes)),b.notes_sha256);assert.equal(digest(value.publisher_paratext),b.paratext_sha256);
  assert.deepEqual(value.text.split('\n\n').map(digest),b.body_paragraph_sha256s);assert.deepEqual(value.text.split('\n\n').map(p=>p.split('\n').length),b.body_paragraph_lines);
  assert.deepEqual(value.translator_notes.map(n=>n.number),b.poem_note_numbers);assert.deepEqual(value.translator_notes.map(n=>digest(n.text)),b.note_text_sha256s.map(n=>n.sha256));
  for(const [i,note]of value.translator_notes.entries()){assert.deepEqual(note.text.split('\n\n').map(digest),b.note_text_sha256s[i].paragraph_sha256s);assert.deepEqual(note.text.split('\n\n').map(p=>p.split('\n').length),b.note_text_sha256s[i].paragraph_lines);}
  assert.equal(Object.hasOwn(value,'chapter_summary'),false);assert.equal(Object.hasOwn(value,'publisher_preface'),false,'Bare chapter heading never becomes a prose-preface descriptor');
  assert.equal(Boolean(value.publisher_paratext),id==='tha-ap283');assert.ok(value.text.split('\n\n')[0].includes('[Note 1]'));assert.equal(value.translator_notes[0].number,1);
 }
 return {approval,previous,compact,baseline,author,peer,normalized,profiles,links,rights,bRights,reviews,packets,ids:IDS.slice(),golden,independent,artifact,assertNormalized,checkout};
}
