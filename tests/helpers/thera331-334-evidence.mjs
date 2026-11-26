import {normalize343Metadata,profilesForHistorical343} from './intake359-metadata.mjs';
/** Expectations come from independently sealed originals, never parser output. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join,sep} from 'node:path';
import {createHash} from 'node:crypto';

export const sha=value=>createHash('sha256').update(value).digest('hex');
export const objectSha=value=>sha(JSON.stringify(value));
export const IDS=['tha-ap333','tha-ap334','tha-ap335','tha-ap336'];
export const NUMBERS=[331,332,333,334];
export const REV='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';
export const VRI='2d134ff9ef60f70a1eb03c9370580228811a3070';
export const APPROVAL_SHA='e68927dcca72d79196786d46ba19290bf0903396993c2fb62dbf2b02150793c8';
const DIRECTORY=new URL('../../docs/evidence/apadana/',import.meta.url);
export function decodeApproval(bytes){assert.equal(sha(bytes),APPROVAL_SHA,'Mandatory original/independent normalization approval');return JSON.parse(bytes);}
function sealed(record){
  assert.match(record.file,/^[A-Z0-9_]+\.json$/);
  const raw=readFileSync(new URL(record.file,DIRECTORY));assert.equal(sha(raw),record.sha256,record.file);return JSON.parse(raw);
}
export function fourEnglishEvidence(){
  const approval=decodeApproval(readFileSync(new URL('THERA_331_334_APPROVAL.json',DIRECTORY)));
  assert.equal(approval.status,'approved');assert.equal(approval.base_commit,'ac620911e349b089eedeb93906675c62c9523b24');
  assert.equal(approval.source_and_normalization_only,true);assert.equal(approval.runtime_approval,false);assert.equal(approval.release_approval,false);
  assert.deepEqual(approval.approved_ids,IDS);assert.deepEqual(approval.approved_records,IDS.map((id,i)=>({id,publisher_chapter:'chapter-3',poem:NUMBERS[i]})));
  assert.equal(approval.publisher_revision,REV);assert.equal(approval.vri_revision,VRI);
  assert.equal(approval.before_canon_sha256,approval.after_canon_sha256);assert.equal(approval.after_canon_sha256,'46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8');
  const compact=sealed(approval.baseline_freeze),profiles=sealed(approval.expected_profiles),links=sealed(approval.expected_links),goldens=sealed(approval.goldens),scopes=sealed(approval.source_scopes),peer=sealed(approval.independent_notice_review);
  assert.equal(approval.baseline_freeze.sha256,'038e2565ee0b7803e4a2d3a33bd0d8e4d832deea89962b2686a72d77d3d10b8a');
  assert.equal(approval.independent_notice_review.sha256,'bd1891106e99c3dacc5748618a87be913df20949a83f62a40d320d95c71d004d');
  assert.equal(peer.normalization_approval,true);assert.equal(peer.implementation_activation_approval,false);assert.equal(peer.behavioral_acceptance_approval,false);
  assert.deepEqual(Object.keys(profiles),IDS);assert.deepEqual(Object.keys(links),IDS);assert.deepEqual(approval.expected_profile_ids,[...compact.ids,...IDS]);assert.equal(compact.ids.length,339);
  assert.deepEqual(goldens.poems.map(p=>p.id),IDS);assert.equal(goldens.source_scope_sha256,approval.source_scopes.sha256);
  const rows=Object.fromEntries(goldens.poems.map(row=>[row.id,row]));
  const checkout=process.env.APADANA_SOURCE_CHECKOUT?resolve(process.env.APADANA_SOURCE_CHECKOUT):null;
  function artifact(id){
    assert.ok(checkout,'Explicit original-source fixture required');const row=rows[id];assert.ok(row);assert.match(row.source_path,/^src\/_poems\/chapter-3\/poem-(331|332|333|334)\.md$/);
    const path=resolve(checkout,row.source_path);assert.ok(path.startsWith(checkout+sep));const bytes=readFileSync(path);
    assert.equal(bytes.length,row.raw_bytes);assert.equal(sha(bytes),row.raw_sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.git_blob_sha1);return bytes.toString('utf8');
  }
  function assertProfiles(observed){
    observed=profilesForHistorical343(observed); // Strict full359 guard before old343-only test inputs.
    assert.deepEqual(Object.keys(observed),approval.expected_profile_ids);
    for(const id of compact.ids)assert.equal(objectSha(observed[id]),compact.profile_object_sha256[id],id);
    for(const id of IDS)assert.deepEqual(observed[id],profiles[id]);
  }
  function assertCatalogue(manifest,observed){
    ({profiles:observed,catalogue:manifest}=normalize343Metadata(observed,manifest));
    assertProfiles(observed);assert.deepEqual(Object.keys(manifest.links),approval.expected_profile_ids);
    for(const id of compact.ids)assert.equal(objectSha(manifest.links[id]),compact.translation_object_sha256[id],id);
    for(const id of IDS)assert.deepEqual(manifest.links[id],links[id]);
    const source=structuredClone(manifest.source);
    for(const[now,old]of [['343 finite complete publisher-edition poems','339 finite complete publisher-edition poems'],['303 explicitly mapped Therā','299 explicitly mapped Therā']]){assert.equal(source.policy.split(now).length-1,1);source.policy=source.policy.replace(now,old);}
    assert.deepEqual(source,compact.manifest_source);const envelope={...manifest,source};delete envelope.links;assert.equal(objectSha(envelope),compact.manifest_envelope_without_links_sha256);
  }
  function assertNormalized(id,value){
    const row=rows[id],profile=profiles[id],parts=value.text.split('\n\n');assert.equal(value.title,profile.title);
    assert.equal(sha(value.text),row.body_sha256);assert.equal(value.text.length,row.body_characters_utf16);
    assert.deepEqual(parts.map(sha),row.body_paragraphs.map(p=>p.sha256));assert.deepEqual(parts.map(p=>p.length),row.body_paragraphs.map(p=>p.characters_utf16));assert.deepEqual(parts.map(p=>p.split('\n').length),row.body_paragraphs.map(p=>p.lines));
    assert.equal(objectSha(value.translator_notes),row.notes_sha256);assert.deepEqual(value.translator_notes.map(p=>({number:p.number,sha256:sha(p.text),characters_utf16:p.text.length})),row.notes.map(p=>({number:p.number,sha256:p.sha256,characters_utf16:p.characters_utf16})));
    assert.equal(sha(value.publisher_paratext),row.paratext_sha256);
    assert.equal(Object.hasOwn(value,'publisher_preface'),Boolean(row.publisher_preface));
    if(row.publisher_preface){const{translator_notes,...descriptor}=value.publisher_preface;assert.deepEqual(descriptor,row.publisher_preface);assert.equal(objectSha(translator_notes),descriptor.notes_sha256);assert.equal(Object.hasOwn(value.publisher_preface,'text'),false);}
    for(const key of ['chapter_summary','collection_summary','publisher_divisions','editorial_gap'])assert.equal(Object.hasOwn(value,key),false);
  }
  return {approval,compact,profiles,links,goldens,scopes,peer,rows,checkout,artifact,assertProfiles,assertCatalogue,assertNormalized};
}
