import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditCandidate, loadCandidate } from '../scripts/audit-patthana-candidate.mjs';

test('Paṭṭhāna candidate keeps complete-section probes, competing matches and partial-unit boundaries explicit', () => {
  const report = auditCandidate();
  assert.equal(report.unit, 'patthana1.1');
  assert.equal(report.unit_segments, 139);
  assert.equal(report.untranslated_following_segments, 76);
  assert.deepEqual(report.probes.map(p => p.competing_refs), [['patthana1.1/7'], ['patthana1.1/9']]);
  assert.equal(report.runtime_candidate_links, 0);
});

test('metadata cannot turn author sections 1 and 2 into repository text IDs or whole-unit coverage', () => {
  for (const change of [
    c => { c.scope.whole_unit_translation = true; },
    c => { c.scope.relation = 'whole_unit'; },
    c => { c.vri.unit = 'patthana1.2'; },
    c => { c.probes[0].target_ref = 'patthana1.2/7'; },
    c => { c.probes[0].normalized_sha256 = '0'.repeat(64); },
    c => { c.vri.candidate_span.last_ref = 'patthana1.1/139'; },
  ]) {
    const candidate = loadCandidate(); change(candidate);
    assert.throws(() => auditCandidate(candidate));
  }
});
