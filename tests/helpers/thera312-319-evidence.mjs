import {profilesForHistorical339} from './intake343-metadata.mjs';
import {requireProfiles339,normalize339InputTo333,publisher339Authority} from './thera339-legacy-projection.mjs';
/** Pure sealed metadata readers; no production parser, runtime output or current catalogue is an oracle. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const blob = raw => createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
export const BASE = '104b57a6891ddae645c51e39eb3d27b89b64ffdf';
export const REV = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';
export const VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070';
export const IDS = Object.freeze(Array.from({length:8},(_,i)=>'tha-ap'+(314+i)));
export const NUMBERS = Object.freeze(Array.from({length:8},(_,i)=>312+i));
const APPROVAL_SHA = 'cc8480e22bb9a1615af86cee2e153c77695f4d20c21fd8f147e31f8658ca610d';
const DIRECTORY = 'docs/evidence/apadana';
const one = (rows,key,id) => {const found=rows.filter(row=>row[key]===id);assert.equal(found.length,1,'One sealed independent row '+id);return found[0];};
const hashObject = value => digest(JSON.stringify(value));
const clone = value => JSON.parse(JSON.stringify(value));

export function sealed(descriptor) {
  assert.ok(descriptor && /^[A-Z0-9_]+\.json$/.test(descriptor.file),'Finite metadata filename required');
  assert.match(descriptor.sha256,/^[a-f0-9]{64}$/);
  const raw=readFileSync(join(DIRECTORY,descriptor.file));
  assert.equal(digest(raw),descriptor.sha256,'Sealed metadata changed: '+descriptor.file);
  return JSON.parse(raw);
}

export function thera312319Evidence() {
  const raw=readFileSync(join(DIRECTORY,'THERA_312_319_APPROVAL.json'));
  assert.equal(digest(raw),APPROVAL_SHA,'Final independently approved source/normalization curation');
  const approval=JSON.parse(raw);
  assert.equal(approval.schema,'reviewed-apadana-intake-v1');
  assert.equal(approval.status,'approved');
  assert.equal(approval.base_commit,BASE);assert.equal(approval.publisher_revision,REV);assert.equal(approval.vri_revision,VRI);
  assert.equal(approval.source_and_normalization_only,true);
  for(const key of ['runtime_approval','release_approval','media_approval']) assert.equal(approval[key],false);
  assert.equal(approval.external_activations,0);
  assert.deepEqual(approval.approved_ids,IDS);
  assert.deepEqual(approval.approved_records,IDS.map((id,i)=>({id,publisher_chapter:'chapter-3',poem:NUMBERS[i]})));
  assert.deepEqual(approval.source_totals,{poems:8,body_paragraphs:73,physical_entries:49,printed_labels:50,poem_notes:34,headings:0,summaries:0});
  assert.equal(approval.before_canon_sha256,approval.after_canon_sha256);

  const compact=sealed(approval.baseline_freeze),baselineReview=sealed(approval.baseline_reconstruction_review);
  assert.equal(compact.schema,'independent-pinned104-baseline325-preservation-v1');assert.equal(compact.base_commit,BASE);
  assert.equal(compact.profile_count,325);assert.equal(compact.translation_count,325);
  assert.equal(compact.ids.length,325);assert.equal(new Set(compact.ids).size,325);
  assert.deepEqual(Object.keys(compact.profile_object_sha256),compact.ids);assert.deepEqual(Object.keys(compact.translation_object_sha256),compact.ids);
  assert.equal(baselineReview.schema,'independent-pinned104-baseline325-compact-review-v1');assert.equal(baselineReview.status,'PASS');assert.equal(baselineReview.base_commit,BASE);
  assert.equal(baselineReview.compact_sha256,approval.baseline_freeze.sha256);
  for(const key of ['all325_full_profiles_equal','all325_full_translation_objects_equal','all325_ordered_ids_exact','manifest_source_exact','all26_non_apadana_data_files_sha256_pinned','canonical_bytes_independently_reconstructed_and_hashed']) assert.equal(baselineReview[key],true,key);
  assert.equal(baselineReview.numeric_property_keys,0);
  assert.deepEqual(approval.baseline_ids,compact.ids);
  assert.deepEqual(approval.expected_profile_ids,[...compact.ids,...IDS]);
  assert.equal(approval.expected_profile_ids.length,333);assert.equal(new Set(approval.expected_profile_ids).size,333);
  assert.ok(IDS.every(id=>!compact.ids.includes(id)));
  assert.equal(compact.canonical_logical_sha256,approval.after_canon_sha256);
  assert.equal(Object.keys(compact.data_file_sha256).length,26);
  assert.equal(Object.hasOwn(compact.data_file_sha256,'server/data/apadana.json'),false);

  const profiles=sealed(approval.expected_profiles),links=sealed(approval.expected_links),packet=sealed(approval.goldens);
  const normalized=sealed(approval.independent_normalization),peer=sealed(approval.independent_notice_review),scopes=sealed(approval.source_scopes),source=sealed(approval.source_approval),inverse=sealed(approval.notice_inverse);
  assert.deepEqual(Object.keys(profiles),IDS);assert.deepEqual(Object.keys(links),IDS);
  assert.equal(packet.source_scope_sha256,approval.source_scopes.sha256);
  assert.equal(packet.base_commit,BASE);assert.equal(packet.publisher_revision,REV);assert.equal(packet.vri_revision,VRI);
  assert.equal(packet.canonical_logical_sha256,compact.canonical_logical_sha256);assert.equal(packet.all_original_xml_tuples,14645);
  assert.equal(normalized.schema,'independent-original-first-normalization312-319-oracles-v1');assert.equal(normalized.no_candidate_metadata_read_or_used,true);
  assert.equal(normalized.source_only_review.sha256,approval.source_approval.sha256);
  assert.equal(peer.status,'APPROVE_EIGHT_EXACT_PUBLISHER312_319_V2_NORMALIZATION_PROFILE_METADATA_ONLY');
  assert.equal(peer.source_approval,true);assert.equal(peer.normalization_approval,true);
  assert.equal(peer.source_approval_count,8);assert.equal(peer.normalization_approval_count,8);
  assert.deepEqual(peer.approved_ids,IDS);assert.deepEqual(peer.approved_publishers,NUMBERS);
  assert.deepEqual(peer.approved_profile_objects,profiles);assert.deepEqual(peer.approved_link_objects,links);
  assert.equal(peer.all_paragraph_note_quote_hashes_UTF16_lengths_layouts_source_root_rights_exact,true);
  assert.equal(peer.old325_full_objects_preserved_in_proposed_additive_metadata_union,true);
  for(const key of ['runtime_approval','reader_approval','activation_approval','implementation_acceptance','remote_ci_approval','release_approval','push_approval']) assert.equal(peer[key],false,key);
  for(const [name,descriptor] of [['EXPECTED_PROFILES.json',approval.expected_profiles],['EXPECTED_LINKS.json',approval.expected_links],['GOLDENS.json',approval.goldens],['NOTICE_INVERSE.json',approval.notice_inverse]]) assert.equal(peer.candidate_artifacts[name].sha256,descriptor.sha256);
  assert.equal(peer.original_first_oracles.sha256,approval.independent_normalization.sha256);
  assert.equal(peer.source_scopes.sha256,approval.source_scopes.sha256);
  assert.equal(peer.portable_baseline325.manifest_sha256,approval.baseline_freeze.sha256);
  assert.equal(peer.portable_baseline325.review_sha256,approval.baseline_reconstruction_review.sha256);
  assert.equal(source.status,'ORIGINAL_SOURCE_ONLY_GO');assert.equal(scopes.original_source_review_sha256,approval.source_approval.sha256);
  assert.equal(source.rights.specific_terms,'CC BY-NC-SA 4.0');assert.equal(source.rights.generic_site_CC_BY_not_used_to_relax_translation_terms,true);
  assert.equal(source.rights.no_audio_media_or_commercial_rights_approval,true);
  assert.deepEqual(packet.rights,scopes.rights);assert.equal(packet.rights.length,6);
  assert.deepEqual(packet.rights.map(a=>({path:a.path,bytes:a.bytes,sha256:a.sha256,git_blob_sha1:a.git_blob_sha1})),source.rights.artifacts);

  const independent=id=>one(normalized.rows,'canonical_owner',id),golden=id=>one(packet.poems,'id',id),scope=id=>one(scopes.poems,'canonical_candidate',id);
  for(const [i,id] of IDS.entries()) {
    const b=independent(id),g=golden(id),p=profiles[id],s=scope(id),withoutNotices=clone(p);delete withoutNotices.mapping_notes;
    assert.deepEqual(withoutNotices,b.expected_profile_fields_except_mapping_notes,'Independent original-first profile fields '+id);
    assert.deepEqual(links[id],{...p,english:p.title,match:'individually-reviewed-whole-poem'});
    assert.equal(b.publisher_poem,NUMBERS[i]);assert.equal(g.publisher_poem,NUMBERS[i]);assert.equal(s.publisher,NUMBERS[i]);
    assert.equal(g.raw_sha256,p.raw_sha256);assert.equal(g.raw_sha256,s.raw_artifact.sha256);assert.equal(g.raw_bytes,s.raw_artifact.bytes);assert.equal(g.git_blob_sha1,s.raw_artifact.git_blob_sha1);
    assert.equal(g.source_path,s.raw_artifact.path);assert.equal(g.root.root_sha256,p.root_sha256);assert.equal(g.root.root_sha256,s.root_sha256);
    assert.deepEqual(p.mapping_notes,g.mapping_notes);assert.ok(p.mapping_notes.length>=s.edition_and_notes_caveats.length);
    for(const notice of s.edition_and_notes_caveats) assert.ok(p.mapping_notes.includes(notice),'Full separately approved source caveat '+id);
    assert.deepEqual(g.body_paragraphs.map(p=>p.sha256),b.body_paragraph_sha256s);
    assert.deepEqual(g.body_paragraphs.map(p=>p.characters_utf16),b.body_paragraph_characters_utf16);
    assert.deepEqual(g.body_paragraphs.map(p=>p.lines),b.body_paragraph_lines);
    assert.deepEqual(g.notes.map(n=>n.sha256),b.notes.map(n=>n.text_sha256));
    assert.deepEqual(g.notes.map(n=>n.characters_utf16),b.notes.map(n=>n.characters_utf16));
    assert.deepEqual(g.quotation_proofs.map(q=>q.sha256),b.quotation_entries_sha256);
    assert.deepEqual(g.quotation_proofs.map(q=>q.characters_utf16),b.quotation_entries_characters_utf16);
    assert.deepEqual(p.stanza_layout.map(row=>row.lines),b.quotation_entries_lines);
    assert.deepEqual(g.stanza_layout,p.stanza_layout);assert.deepEqual(g.note_numbers,p.note_numbers);
    assert.equal(g.chapter_summary,null);assert.equal(g.publisher_preface,null);
    for(const field of b.forbidden_profile_fields) assert.equal(Object.hasOwn(p,field),false,id+' no invented '+field);
  }
  assert.deepEqual(normalized.totals,{poems:8,body_paragraphs:73,physical_verse_entries:49,printed_labels:50,notes:34});
  assert.equal(inverse.owner,'tha-ap321');assert.equal(inverse.normalized_source_words_notes_quotes_layout_root_rights_changed,false);
  for(const [name,current] of [['EXPECTED_PROFILES.json',profiles],['EXPECTED_LINKS.json',links],['GOLDENS.json',packet]]) {
    const projected=clone(current),row=name==='GOLDENS.json'?projected.poems.find(p=>p.id==='tha-ap321'):projected['tha-ap321'];
    assert.equal(row.mapping_notes.filter(n=>n===inverse.scope_amendment.after).length,1);
    row.mapping_notes=row.mapping_notes.map(n=>n===inverse.scope_amendment.after?inverse.scope_amendment.before:n);
    if(name==='GOLDENS.json') projected.source_scope_sha256=inverse.scope_amendment.previous_scope_sha256;
    assert.equal(digest(JSON.stringify(current,null,2)+'\n'),inverse.files[name].new_sha256);
    assert.equal(digest(JSON.stringify(projected,null,2)+'\n'),inverse.files[name].old_sha256,'Notice-only full-byte inverse '+name);
  }

  const previous=sealed(approval.previous_intake);assert.equal(approval.previous_intake.sha256,'5b6ee312e81f422e464922a53354800f492c571ec98f837fa119ba01de6c7042');
  const oldProfiles=sealed(previous.expected_profiles),oldNormalized=sealed(previous.independent_normalization);
  const baselineSummary={id:'tha-ap312',profile:oldProfiles['tha-ap312'],proof:one(oldNormalized.poems,'canonical_owner','tha-ap312')};
  assert.equal(hashObject(baselineSummary.profile),compact.profile_object_sha256['tha-ap312']);
  const checkout=process.env.APADANA_SOURCE_CHECKOUT;
  function readArtifact(id,old=false) {
    assert.ok(checkout,'APADANA_SOURCE_CHECKOUT required for exact original fixtures');
    assert.ok(old?id===baselineSummary.id:IDS.includes(id),'Only exact reviewed fixture IDs');
    const g=old?baselineSummary.proof:golden(id),relativePath=g.source_path;
    const full=resolve(checkout,relativePath);assert.ok(!relative(resolve(checkout),full).startsWith('..'));
    const bytes=readFileSync(full);assert.equal(bytes.length,g.raw_bytes);assert.equal(digest(bytes),g.raw_sha256);assert.equal(blob(bytes),g.git_blob_sha1);return bytes.toString('utf8');
  }
  function assertNormalized(id,value) {
    const b=independent(id),p=profiles[id],parts=value.text.split('\n\n');
    assert.equal(digest(value.text),p.body_sha256);assert.equal(value.text.length,b.body_characters_utf16);
    assert.deepEqual(parts.map(digest),b.body_paragraph_sha256s);assert.deepEqual(parts.map(p=>p.length),b.body_paragraph_characters_utf16);assert.deepEqual(parts.map(p=>p.split('\n').length),b.body_paragraph_lines);
    assert.equal(hashObject(value.translator_notes),p.notes_sha256);
    assert.deepEqual(value.translator_notes.map(n=>n.number),p.note_numbers);
    assert.deepEqual(value.translator_notes.map(n=>digest(n.text)),b.notes.map(n=>n.text_sha256));
    assert.deepEqual(value.translator_notes.map(n=>n.text.length),b.notes.map(n=>n.characters_utf16));
    assert.equal(value.publisher_paratext,'');assert.equal(digest(value.publisher_paratext),p.paratext_sha256);
    for(const field of ['publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap','audio','media','reciter']) assert.equal(Object.hasOwn(value,field),false,id+' no '+field);
  }
  function historicalAssertProfiles(observed) {
    assert.deepEqual(Object.keys(observed),approval.expected_profile_ids);
    for(const id of compact.ids) assert.equal(hashObject(observed[id]),compact.profile_object_sha256[id],'Exact original325 full profile '+id);
    for(const id of IDS) assert.deepEqual(observed[id],profiles[id]);
  }
  function historicalAssertCatalogue(manifest,observedProfiles) {
    assertProfiles(observedProfiles);assert.deepEqual(Object.keys(manifest.links),approval.expected_profile_ids);
    for(const id of compact.ids) assert.equal(hashObject(manifest.links[id]),compact.translation_object_sha256[id],'Exact original325 full translation object '+id);
    for(const id of IDS) assert.deepEqual(manifest.links[id],links[id]);
    const priorSource=clone(manifest.source);
    for(const [current,old] of [['333 finite complete publisher-edition poems','325 finite complete publisher-edition poems'],['293 explicitly mapped Therā','285 explicitly mapped Therā']]) {
      assert.equal(priorSource.policy.split(current).length-1,1,'Exactly one approved finite count '+current);priorSource.policy=priorSource.policy.replace(current,old);
    }
    assert.equal(hashObject(priorSource),compact.manifest_source_sha256,'Full prior source/rights object with only two reviewed count changes');
  }
  function assertProfiles(observed) {
    if(Object.keys(observed).length===343)observed=profilesForHistorical339(observed);
    if(Object.keys(observed).length===339){
      requireProfiles339(observed);
      const ids=publisher339Authority().compact.ids;
      return historicalAssertProfiles(Object.fromEntries(ids.map(id=>[id,observed[id]])));
    }
    return historicalAssertProfiles(observed);
  }
  function assertCatalogue(manifest,observedProfiles) {
    const historical=normalize339InputTo333(observedProfiles,manifest);
    return historicalAssertCatalogue(historical.catalogue,historical.profiles);
  }
  const heldPublishers=[...new Set([70,140,158,159,...approval.explicitly_not_activated_publishers])];
  assert.ok(heldPublishers.includes(311)&&heldPublishers.includes(320));
  return {approval,compact,baselineReview,profiles,links,packet,normalized,peer,scopes,source,inverse,rights:packet.rights,ids:[...IDS],numbers:[...NUMBERS],independent,golden,scope,checkout,baselineSummary,heldPublishers,
    bodyLength:id=>independent(id).body_characters_utf16,expectedPages:IDS.reduce((n,id)=>n+Math.ceil(independent(id).body_characters_utf16/500),0),
    artifact:id=>readArtifact(id),baselineArtifact:()=>readArtifact(baselineSummary.id,true),assertNormalized,assertProfiles,assertCatalogue};
}
