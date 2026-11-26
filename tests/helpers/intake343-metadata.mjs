/** Strict TEST-METADATA bridge. Never import from src/web or transform a tool payload. */
import assert from 'node:assert/strict';
import {normalize343Metadata,profilesForHistorical343} from './intake359-metadata.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=value=>createHash('sha256').update(value).digest('hex');
const objectSha=value=>sha(JSON.stringify(value));
function sealed(file,pin){assert.match(file,/^[A-Z0-9_]+\.json$/);const bytes=readFileSync(new URL('../../docs/evidence/apadana/'+file,import.meta.url));assert.equal(sha(bytes),pin,'Mandatory exact343 metadata authority');return JSON.parse(bytes);}
// Root binds this only after independent source/normalization approval.
const approval=sealed('THERA_331_334_APPROVAL.json','e68927dcca72d79196786d46ba19290bf0903396993c2fb62dbf2b02150793c8');
assert.equal(approval.status,'approved');
assert.equal(approval.base_commit,'ac620911e349b089eedeb93906675c62c9523b24');
const compact=sealed(approval.baseline_freeze.file,approval.baseline_freeze.sha256);
assert.equal(approval.baseline_freeze.sha256,'038e2565ee0b7803e4a2d3a33bd0d8e4d832deea89962b2686a72d77d3d10b8a');
const profiles=sealed(approval.expected_profiles.file,approval.expected_profiles.sha256),links=sealed(approval.expected_links.file,approval.expected_links.sha256);
const previous=sealed('THERA_321_329_APPROVAL.json','39a344a026373f8a902ecb5857414daf12fc4a8ae942132050529844aa602810');
const parity=sealed(approval.baseline_reconstruction_review.file,approval.baseline_reconstruction_review.sha256);
assert.equal(approval.baseline_reconstruction_review.sha256,'1bbbc653da24cb1caf0cb92f05b56bd950505f81a0c398819095b0fc0bc7f5e2');
assert.equal(parity.source_authority_compact_sha256,approval.baseline_freeze.sha256);
assert.equal(parity.all339_profile_objects_exact,true);assert.equal(parity.all339_translation_objects_exact,true);
const peer=sealed(approval.independent_notice_review.file,approval.independent_notice_review.sha256);
// Keep callers from mutating the sealed objects used as later expectations.
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
for(const value of [approval,compact,profiles,links,previous,parity,peer])freeze(value);
assert.equal(approval.independent_notice_review.sha256,'bd1891106e99c3dacc5748618a87be913df20949a83f62a40d320d95c71d004d');
assert.equal(peer.status,'GO_EXACT_FOUR_PUBLISHER_EDITION_NORMALIZATIONS_ONLY');assert.equal(peer.normalization_approval,true);
sealed('THERA_331_334_NORMALIZATION_SCHEMA_ADAPTER.json','a3ac33cf868c3ecd7f6480457f6eb905013d88556787d30950472cd479f3af4a');
const NEW_IDS=['tha-ap333','tha-ap334','tha-ap335','tha-ap336'];
assert.deepEqual(approval.approved_ids,NEW_IDS);assert.deepEqual(Object.keys(profiles),NEW_IDS);assert.deepEqual(Object.keys(links),NEW_IDS);
assert.deepEqual(approval.baseline_ids,compact.ids);assert.equal(compact.ids.length,339);assert.deepEqual(compact.ids,previous.expected_profile_ids);
assert.deepEqual(approval.expected_profile_ids,[...compact.ids,...NEW_IDS]);assert.equal(new Set(approval.expected_profile_ids).size,343);
assert.deepEqual(approval.approved_records,NEW_IDS.map((id,i)=>({id,publisher_chapter:'chapter-3',poem:331+i})));
assert.equal(compact.canonical_logical_sha256,'46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8');
assert.deepEqual(approval.held_ids,previous.held_ids);for(const id of approval.held_ids)assert.ok(!approval.expected_profile_ids.includes(id));
function oldMaps(p,l){assert.deepEqual(Object.keys(p),compact.ids);assert.deepEqual(Object.keys(l),compact.ids);for(const id of compact.ids){assert.equal(objectSha(p[id]),compact.profile_object_sha256[id]);assert.equal(objectSha(l[id]),compact.translation_object_sha256[id]);}}
export function requireProfiles343(observed){observed=profilesForHistorical343(observed);assert.deepEqual(Object.keys(observed),approval.expected_profile_ids);for(const id of compact.ids)assert.equal(objectSha(observed[id]),compact.profile_object_sha256[id]);for(const id of NEW_IDS){assert.deepEqual(observed[id],profiles[id]);assert.equal(objectSha(observed[id]),objectSha(profiles[id]));}}
export function project343To339(observed,catalogue){
 ({profiles:observed,catalogue}=normalize343Metadata(observed,catalogue));
 requireProfiles343(observed);assert.deepEqual(Object.keys(catalogue),['version','source','vri_commit','held','links']);assert.equal(catalogue.version,1);assert.equal(catalogue.vri_commit,'2d134ff9ef60f70a1eb03c9370580228811a3070');assert.deepEqual(catalogue.held,{});
 assert.deepEqual(Object.keys(catalogue.links),approval.expected_profile_ids);
 for(const id of compact.ids)assert.equal(objectSha(catalogue.links[id]),compact.translation_object_sha256[id]);
 for(const id of NEW_IDS){assert.deepEqual(catalogue.links[id],links[id]);assert.equal(objectSha(catalogue.links[id]),objectSha(links[id]));}
 const source=structuredClone(catalogue.source);
 for(const[now,old]of [['343 finite complete publisher-edition poems','339 finite complete publisher-edition poems'],['303 explicitly mapped Therā','299 explicitly mapped Therā']]){assert.equal(source.policy.split(now).length-1,1);source.policy=source.policy.replace(now,old);}
 assert.equal(objectSha(source),compact.manifest_source_sha256);
 const priorProfiles=Object.fromEntries(compact.ids.map(id=>[id,observed[id]])),priorLinks=Object.fromEntries(compact.ids.map(id=>[id,catalogue.links[id]]));oldMaps(priorProfiles,priorLinks);
 const prior={...catalogue,source,links:priorLinks},envelope={...prior};delete envelope.links;assert.equal(objectSha(envelope),compact.manifest_envelope_without_links_sha256);
 return {profiles:Object.freeze(priorProfiles),catalogue:prior};
}
/** Historical test inputs only; strict343 positives must call project343To339. */
export function historical339Metadata(observed,catalogue){
 ({profiles:observed,catalogue}=normalize343Metadata(observed,catalogue));
 if(Object.keys(observed).length===343)return project343To339(observed,catalogue);
 oldMaps(observed,catalogue.links);assert.equal(objectSha(catalogue.source),compact.manifest_source_sha256);
 const envelope={...catalogue};delete envelope.links;assert.equal(objectSha(envelope),compact.manifest_envelope_without_links_sha256);return {profiles:observed,catalogue};
}
/** Actual current eligibility changes ONLY source331; preserve every other refusal. */
export function currentHeldPublishers(historical){
 const expected=[70,140,158,159,...previous.explicitly_not_activated_publishers];
 assert.deepEqual(historical,expected,'Full historical held-source pool must remain explicit');
 assert.deepEqual(approval.approved_records.find(row=>row.poem===331),{id:'tha-ap333',publisher_chapter:'chapter-3',poem:331});
 const remaining=historical.filter(poem=>poem!==331);
 assert.equal(remaining.length,historical.length-1);assert.ok(!remaining.includes(331));
 assert.deepEqual(remaining.filter(poem=>!historical.includes(poem)),[]);
 return Object.freeze(remaining);
}
export function publisher343Authority(){return {approval,compact,profiles,links,newIds:[...NEW_IDS],newRecords:approval.approved_records};}

export function profilesForHistorical339(observed){
 observed=profilesForHistorical343(observed);
 if(Object.keys(observed).length===343){requireProfiles343(observed);return Object.freeze(Object.fromEntries(compact.ids.map(id=>[id,observed[id]])));}
 assert.deepEqual(Object.keys(observed),compact.ids);for(const id of compact.ids)assert.equal(objectSha(observed[id]),compact.profile_object_sha256[id]);return observed;
}
