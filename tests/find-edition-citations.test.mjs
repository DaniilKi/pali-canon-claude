import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { findCitations } from '../src/find-citations.mjs';
import { editionIndex, editionLabel } from '../src/editions.mjs';

const refs = ['Thai MN 1.103', 'Myanmar Dhp 15', 'VRI SN 1.20 (Nidānavaggo)',
  'VRI SN 1.20 (Nidanavagga)', 'Thai Pj 1.10', 'Thai ed. MN vol. 1 p. 103',
  'thai mn 1:103', 'Thai Pp 150'];

test('scanned edition references preserve the page scheme and agree with direct resolution', () => {
  const text = refs.join('; ');
  const result = findCitations(text, canon);
  assert.deepEqual(result.citations.map((hit) => hit.text), refs);
  for (const hit of result.citations) {
    assert.equal(hit.scheme, 'edition');
    assert.equal(hit.status, 'resolved', hit.text);
    assert.equal(hit.text_id, canon.resolve(hit.text).unit.id, hit.text);
    assert.equal(text.slice(hit.start, hit.end), hit.text);
  }
});

test('ambiguous or missing edition pages remain unresolved instead of becoming text numbers', () => {
  const refs = ['VRI SN 1.20', 'Thai MN 99.999', 'Myanmar Dhp 99999', 'Thai MN i 55', 'Thai Dhp 15-20', 'Thai MN 1.103.4'];
  const result = findCitations(refs.join('; '), canon);
  assert.deepEqual(result.citations.map((hit) => hit.text), refs);
  assert.ok(result.citations.every((hit) => hit.scheme === 'edition' && hit.status === 'unresolved' && !hit.text_id));
  assert.match(result.citations[0].reason, /ambiguous/);
});

test('edition spans keep original Unicode offsets and do not swallow following prose or citations', () => {
  const ref = 'VRI SN 1.20 (Nidānavaggo)'.normalize('NFD');
  const text = `📚 See ${ref}; Thai MN 1.103 (compare MN 10). Myanmar Dhp 15 (discussion). MN 10.`;
  const result = findCitations(text, canon);
  assert.deepEqual(result.citations.map((hit) => hit.text), [ref, 'Thai MN 1.103', 'MN 10', 'Myanmar Dhp 15', 'MN 10']);
  for (const hit of result.citations) assert.equal(text.slice(hit.start, hit.end), hit.text);
});

test('every displayed marked edition label scans as one complete page reference', () => {
  const d = canon.load(), index = editionIndex(d);
  const labels = new Set();
  for (const [key, occurrences] of index.markers) {
    const [edition, , at] = key.split('|');
    for (const occurrence of occurrences) labels.add(editionLabel(d, edition, occurrence.book, at));
  }
  assert.ok(labels.size > 50000);
  // Stay below the public result cap and retain normal scanner punctuation boundaries.
  const all = [...labels];
  for (let start = 0; start < all.length; start += 100) {
    const batch = all.slice(start, start + 100);
    const result = findCitations(batch.join('; '), canon);
    assert.deepEqual(result.citations.map((hit) => hit.text), batch);
    for (const hit of result.citations) {
      assert.equal(hit.scheme, 'edition');
      // Some source page markers deliberately cannot identify a text; preserve that unresolved result too.
      let expected;
      try { expected = canon.resolve(hit.text).unit.id; } catch { expected = null; }
      assert.equal(hit.text_id ?? null, expected, hit.text);
    }
  }
});
