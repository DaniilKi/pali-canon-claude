/** Independently sealed one-source addition; never use runtime output as the intake oracle. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {remainingEvidence,sealed} from './thera-remaining-evidence.mjs';
export function held234Evidence(){
  const bytes=readFileSync('docs/evidence/apadana/THERA_HELD234_APPROVAL.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'14b739ffe5f3e6f01718ccd1c247dd35454d71abb6cf4d0de672295cef8f4aa7');
  const approval=JSON.parse(bytes),previous=sealed(approval.previous_intake);
  assert.equal(approval.schema,'reviewed-apadana-intake-v1');assert.equal(approval.status,'approved');
  assert.equal(approval.base_commit,'7d5ac90845402b322dabf2c5120d1485b15c0bda');
  assert.equal(approval.previous_intake.file,'THERA_REMAINING_APPROVAL.json');
  assert.equal(approval.previous_intake.sha256,'20d72ee82ce1a0e07c9b5f5b87c68266637462a91ab1a0d4ba38152ee7396d40');
  assert.equal(approval.runtime_approval,false);assert.equal(approval.release_approval,false);
  assert.deepEqual(approval.approved_ids,['tha-ap236']);
  assert.deepEqual(approval.approved_records,[{id:'tha-ap236',publisher_chapter:'chapter-3',poem:234}]);
  assert.deepEqual(approval.baseline_ids,previous.expected_profile_ids);assert.equal(approval.baseline_ids.length,284);
  assert.deepEqual(approval.baseline_records,[...previous.baseline_records,...previous.approved_records]);
  assert.deepEqual(approval.expected_profile_ids,[...previous.expected_profile_ids,'tha-ap236']);
  assert.equal(new Set(approval.expected_profile_ids).size,285);
  const peer=sealed(approval.independent_source_approval),normalized=sealed(approval.independent_normalization);
  const profiles=sealed(approval.expected_profiles),links=sealed(approval.expected_links),author=sealed(approval.source_approval);
  assert.equal(peer.status,'APPROVE_ONE_EXACT_PUBLISHER234_SOURCE_AND_FINITE_NORMALIZATION_IDENTITY_SCOPE_ONLY');
  assert.equal(peer.runtime_approval,false);assert.equal(normalized.runtime_approval,false);assert.equal(peer.release_approval,false);
  assert.deepEqual(profiles,peer.approved_profile_objects);assert.deepEqual(links,peer.approved_link_objects);
  assert.deepEqual(Object.keys(profiles),approval.approved_ids);assert.deepEqual(author.approved_ids,approval.approved_ids);
  assert.equal(peer.source_identity.frontmatter_order,235);assert.equal(peer.source_identity.printed_poem_number,234);
  const authorSeals=sealed(approval.normalization_seals);
  for(const [name,descriptor] of [['GOLDENS.json',approval.goldens[0]],['EXPECTED_PROFILES.json',approval.expected_profiles],['EXPECTED_LINKS.json',approval.expected_links]])assert.equal(authorSeals[name],descriptor.sha256);
  // Other manifest entries are external-only author evidence, not required repository files.
  const copyPolicy=sealed(approval.copy_policy);assert.equal(copyPolicy.external_activations,0);assert.equal(copyPolicy.runtime_release_approval,false);
  sealed(approval.normalization_replay);
  const packets=approval.goldens.map(sealed),golden=packets.flatMap(p=>p.poems).find(p=>p.id==='tha-ap236');
  assert.equal(packets.flatMap(p=>p.poems).length,1);assert.ok(golden);
  const peerGolden=normalized.poems.find(p=>p.id==='tha-ap236');assert.equal(normalized.poems.length,1);assert.ok(peerGolden);
  const oldA=remainingEvidence('A'),oldB=remainingEvidence('B');
  assert.deepEqual(previous.source_groups,oldA.combined.source_groups);
  const priorProfiles={...oldA.baseline.profile_objects,...oldA.expectedProfiles,...oldB.expectedProfiles};
  const priorLinks={...oldA.baseline.translation_objects,...oldA.expectedLinks,...oldB.expectedLinks};
  assert.deepEqual(Object.keys(priorProfiles),previous.expected_profile_ids);assert.equal(Object.keys(priorProfiles).length,284);
  assert.deepEqual(Object.keys(priorLinks),previous.expected_profile_ids);
  const neighborGolden=oldA.golden('tha-ap237'),neighborPeer=oldA.peerGolden('tha-ap237');
  const goldenFor=id=>{assert.ok(['tha-ap236','tha-ap237'].includes(id));return id==='tha-ap236'?golden:neighborGolden;};
  const peerFor=id=>{assert.ok(['tha-ap236','tha-ap237'].includes(id));return id==='tha-ap236'?peerGolden:neighborPeer;};
  const checkout=process.env.APADANA_SOURCE_CHECKOUT;
  const artifact=id=>{
    const g=goldenFor(id),raw=readFileSync(join(checkout,g.path));
    assert.equal(createHash('sha256').update(raw).digest('hex'),g.raw_sha256);
    assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),g.git_blob_sha1);
    return raw.toString('utf8');
  };
  return {approval,previous,peer,normalized,profiles,links,author,packets,golden,peerGolden,priorProfiles,priorLinks,neighborGolden,neighborPeer,goldenFor,peerFor,artifact,checkout,rights:approval.rights.map(sealed),reviews:approval.source_reviews.map(sealed)};
}
