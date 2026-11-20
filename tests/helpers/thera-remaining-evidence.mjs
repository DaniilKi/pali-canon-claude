/** Two separately sealed source authorities; no runtime-derived intake whitelist. */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
export function sealed(descriptor){
  assert.ok(descriptor && typeof descriptor.file==='string' && /^[A-Z0-9_]+\.json$/.test(descriptor.file));
  const bytes=readFileSync(join('docs/evidence/apadana',descriptor.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),descriptor.sha256,'Independent evidence seal '+descriptor.file);
  return JSON.parse(bytes);
}
export function remainingEvidence(batch){
  assert.ok(['A','B'].includes(batch));
  const combined=JSON.parse(readFileSync('docs/evidence/apadana/THERA_REMAINING_APPROVAL.json','utf8'));
  assert.equal(combined.status,'approved');assert.equal(combined.base_commit,'cdbefd514164a559bc5aaab631c267f3084e31a6');
  assert.equal(combined.runtime_approval,false);assert.equal(combined.release_approval,false);
  const previous=sealed(combined.previous_intake),baseline=sealed(combined.baseline_freeze);
  assert.equal(previous.expected_profile_ids.length,266);assert.deepEqual(combined.baseline_ids,previous.expected_profile_ids);
  assert.deepEqual(combined.source_groups.map(g=>g.batch),['A','B']);
  const allIds=[];const allRecords=[];
  for(const group of combined.source_groups){
    const peer=sealed(group.independent_source_approval),profiles=sealed(group.expected_profiles),links=sealed(group.expected_links);
    const normalized=sealed(group.independent_normalization),gold=sealed(group.goldens),author=sealed(group.source_approval);
    assert.equal(group.approved_ids.length,9);assert.deepEqual(group.approved_ids,peer.approved_ids);assert.deepEqual(group.approved_ids,author.approved_ids);
    assert.deepEqual(group.approved_records,Object.values(profiles).map(({id,publisher_chapter,poem})=>({id,publisher_chapter,poem})));
    assert.deepEqual(Object.keys(profiles),group.approved_ids);assert.deepEqual(Object.keys(links),group.approved_ids);
    assert.equal(peer.runtime_approval,false);assert.equal(author.runtime_release_approval,false);assert.equal(normalized.runtime_approval,false);
    assert.equal(gold.baseline,combined.base_commit);assert.equal(peer.baseline,combined.base_commit);
    if(group.batch==='A'){
      assert.equal(peer.status,'SOURCE_AND_NORMALIZATION_APPROVED_9_ONLY_GROUP_A');
      assert.deepEqual(profiles,peer.approved_profile_objects);assert.deepEqual(links,peer.approved_link_objects);
    }else{
      assert.equal(peer.status,'APPROVE_NINE_GROUP_B_SOURCE_AND_FINITE_NORMALIZATION_SCOPES_ONLY');
      for(const [field,descriptor] of [['goldens_sha256',group.goldens],['expected_profiles_sha256',group.expected_profiles],['expected_links_sha256',group.expected_links],['independent_normalization_sha256',group.independent_normalization]])assert.equal(peer[field],descriptor.sha256);
    }
    allIds.push(...group.approved_ids);allRecords.push(...group.approved_records);
  }
  assert.deepEqual(combined.approved_ids,allIds);assert.deepEqual(combined.approved_records,allRecords);
  assert.deepEqual(combined.expected_profile_ids,[...combined.baseline_ids,...allIds]);assert.equal(new Set(combined.expected_profile_ids).size,284);
  const group=combined.source_groups.find(g=>g.batch===batch);
  const inputs=[sealed(group.goldens)],independentlyNormalized=sealed(group.independent_normalization);
  const golden=uid=>{const rows=inputs[0].poems.filter(row=>row.id===uid);assert.equal(rows.length,1);return rows[0];};
  const peerGolden=uid=>{const rows=independentlyNormalized.poems.filter(row=>(batch==='A'?row.canonical_owner:row.id)===uid);assert.equal(rows.length,1);return rows[0];};
  return {combined,group,approval:{...combined,...group,goldens:[group.goldens],baseline_freeze:combined.baseline_freeze,previous_intake:combined.previous_intake},baseline,previous,inputs,independent:sealed(group.independent_source_approval),independentlyNormalized,expectedProfiles:sealed(group.expected_profiles),expectedLinks:sealed(group.expected_links),reviews:group.source_reviews.map(sealed),rights:group.rights.map(sealed),sourceApproval:sealed(group.source_approval),approved:group.approved_ids,golden,peerGolden};
}
