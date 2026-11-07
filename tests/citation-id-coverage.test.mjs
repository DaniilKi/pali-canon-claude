import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { findCitations } from '../src/find-citations.mjs';

test('every canonical reader ID is found whole and resolves through citation scanning', () => {
  const units = canon.load().canon.units;
  for (let i = 0; i < units.length; i += 250) {
    const ids = units.slice(i, i + 250).map(u => u.id);
    const text = 'References: ' + ids.join('; ') + '.';
    const result = findCitations(text, canon);
    assert.deepEqual(result.citations.map(c => c.text), ids);
    assert.equal(result.unresolved, 0);
    for (const c of result.citations) {
      assert.equal(text.slice(c.start, c.end), c.text);
      assert.equal(c.text_id, canon.resolve(c.text).unit.id);
    }
  }
});

test('new machine ID families retain prose, identifier and URL boundaries', () => {
  const text = 'An mp3 or pp3 file. Ps 23, Pe 4, Ne 2, Pp 1, Ya 2, Dt 3. '
    + 'xja526 ja526x ja526@example.com /ja526/path /cp1. '
    + 'https://evil.example/ja526 https://suttacentral.net.evil.example/ne3';
  assert.equal(findCitations(text, canon).found, 0);
  const missing = findCitations('ja9999; cp9999; ps9999.1; ne9999; pe9999; dt9999.1; pp9999.1; ya9999.1', canon);
  assert.equal(missing.found, 8);
  assert.equal(missing.resolved, 0);
  assert.equal(missing.unresolved, 8);
});
