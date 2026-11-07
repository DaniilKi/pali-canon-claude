// Offline guard for a research candidate. This does not download or approve a translation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as canon from '../src/canon.mjs';

export const candidateUrl = new URL('../docs/translations/candidates/paccayuddesaniddesa.json', import.meta.url);
export const loadCandidate = () => JSON.parse(readFileSync(candidateUrl, 'utf8'));
const normalized = value => canon.fold(value).replace(/[^a-z]/g, '');
const digest = value => createHash('sha256').update(value).digest('hex');

export function auditCandidate(candidate = loadCandidate()) {
  assert.equal(candidate.status, 'assessment_only');
  assert.equal(candidate.scope.relation, 'proper_subspan', 'The author page is not a whole-unit translation.');
  assert.equal(candidate.scope.whole_unit_translation, false);
  assert.equal(candidate.scope.whole_book_translation, false);
  assert.equal(candidate.scope.all_24_explanations_compared, false, 'Complete-page approval needs its own evidence.');
  const data = canon.load(), unit = canon.resolve(candidate.vri.unit).unit;
  assert.equal(data.canon.source.commit, candidate.vri.commit);
  assert.equal(data.canon.books[unit.book].file, candidate.vri.file);
  const segments = canon.segments(unit);
  assert.equal(segments.length, candidate.vri.unit_segments);
  const byRef = new Map(segments.map(s => [s.ref, s]));
  assert.equal(byRef.get(candidate.vri.candidate_span.first_ref)?.text, '(1) Paccayuddeso');
  const last = segments.findIndex(s => s.ref === candidate.vri.candidate_span.last_ref);
  assert.ok(last > 0 && last < segments.length - 2);
  assert.equal(segments[last + 1].ref, candidate.vri.after_span.ref);
  assert.equal(segments[last + 1].text, candidate.vri.after_span.text);
  assert.equal(segments[last + 2].ref, candidate.vri.following_section.ref);
  assert.equal(segments[last + 2].text, candidate.vri.following_section.title);
  assert.equal(canon.resolve(candidate.vri.next_unit).unit.id, 'patthana1.2');
  assert.notEqual(candidate.vri.next_unit, unit.id);
  const probes = candidate.probes.map(p => {
    const target = byRef.get(p.target_ref);
    assert.ok(target, `Probe ${p.source_section} must remain inside the candidate unit.`);
    const key = normalized(target.text);
    assert.equal(key.length, p.normalized_characters);
    assert.equal(digest(key), p.normalized_sha256, 'Target changed under the stated normalization.');
    return { ...p, key, actual: [] };
  });
  for (const u of data.canon.units) for (const segment of canon.segments(u)) {
    const text = normalized(segment.text);
    for (const probe of probes) if (text.includes(probe.key)) probe.actual.push(segment.ref);
  }
  for (const probe of probes) assert.deepEqual(probe.actual, probe.competing_containment_refs, 'Competing source matches changed; reassess rather than silently selecting.');
  const path = new URL(candidate.source.url).pathname;
  const active = Object.entries(data.translations).flatMap(([id, links]) => links
    .filter(l => l.source === 'anandajoti' && (l.path === path || l.parts?.includes(path)))
    .map(() => id));
  assert.deepEqual(active, [], 'An assessment-only candidate must not become a runtime link or count as English coverage.');
  const units = data.canon.units.filter(u => u.collection === 'patthana');
  return { status: 'passed', source_url: candidate.source.url, adoption: candidate.status,
    unit: unit.id, unit_segments: segments.length, candidate_span: candidate.vri.candidate_span,
    untranslated_following_segments: segments.length - last - 1,
    probes: probes.map(p => ({ source_section: p.source_section, normalized_sha256: p.normalized_sha256, competing_refs: p.actual })),
    canonical_units_checked: data.canon.units.length,
    patthana_units: units.length, patthana_units_with_english: units.filter(u => canon.linksFor(u).links.length).length,
    runtime_candidate_links: active.length, network_attempts: 0,
    scope: 'Local VRI boundary/digest and adoption-state guard only. No source HTML reacquired; no translation fidelity, complete-page mapping or rights approval is inferred.' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditCandidate();
  const i = process.argv.indexOf('--report');
  if (i >= 0) { assert.ok(process.argv[i + 1]); writeFileSync(process.argv[i + 1], JSON.stringify(result, null, 2) + '\n'); }
  console.log(JSON.stringify(result));
}
