import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveReference } from '../src/references.mjs';

test('common citations normalize without losing collection numbering', () => {
  assert.equal(resolveReference('MN 1').uid, 'mn1');
  assert.equal(resolveReference('SN 56.11').uid, 'sn56.11');
  assert.equal(resolveReference('AN 3:65').uid, 'an3.65');
  assert.equal(resolveReference('dhp1-20').uid, 'dhp1-20');
  assert.equal(resolveReference('pli-tv-bu-vb-pj1').uid, 'pli-tv-bu-vb-pj1');
});
test('URL anchors remain distinct from discourse IDs', () => {
  const ref = resolveReference('https://suttacentral.net/mn1/en/sujato#1.2');
  assert.equal(ref.uid, 'mn1');
  assert.equal(ref.segment, '1.2');
  assert.equal(ref.author, 'sujato');
  assert.equal(ref.language, 'en');
  assert.equal(resolveReference('https://suttacentral.net/mn1/en/bodhi').author, 'bodhi');
});
test('untrusted URLs and title guesses do not become references', () => {
  for (const ref of ['https://example.org/mn1', 'https://suttacentral.net.evil.test/mn1', '../mn1', 'MN 1; whoami', 'PTS M i 1']) {
    assert.throws(() => resolveReference(ref));
  }
});
