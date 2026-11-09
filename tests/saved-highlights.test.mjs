import test from 'node:test';
import assert from 'node:assert/strict';
import { savedPassageHighlighted } from '../web/saved-highlights.mjs';
import { passageNoteState } from '../web/passage-notes.mjs';

const context = (uid = 'mn10', offset = 0) => ({ uid, ref: uid + '/1', title: 'Synthetic personal bookmark title', offset, source_commit: 'reviewed-locator-revision' });
const bookmark = current => ({ ...current, note: 'Private reflection, not scripture' });
const identities = [
  ['canonical discourse', 'mn10'],
  ['complete root book', 'book:0'],
  ['named root source book', 'book:abh01m.mul.xml'],
  ['direct commentary book', 'commentary:abh01a.att.xml'],
  ['commentary for a root text', 'commentary-ref:dn1'],
  ['later Pāli citation', 'post:Vism 1.1'],
  ['later Pāli book', 'post:postcanonical:vism']
];

test('default-on highlights require the exact saved selector/reference/offset/revision in every reading kind', () => {
  for (const [label, uid] of identities) {
    for (const offset of [0, 17]) {
      const current = context(uid, offset), saved = [bookmark(current)];
      assert.equal(savedPassageHighlighted(saved, current), true, label + ' at offset ' + offset);
      assert.equal(savedPassageHighlighted(saved, current, true), true);
      assert.equal(savedPassageHighlighted(saved, current, false), false);
      assert.equal(savedPassageHighlighted([], current), false);
      assert.equal(savedPassageHighlighted(saved, { ...current, ref: current.ref + '-other' }), false);
      assert.equal(savedPassageHighlighted(saved, { ...current, uid: uid === 'mn10' ? 'commentary-ref:mn10' : 'mn10' }), false);
      assert.equal(savedPassageHighlighted(saved, { ...current, source_commit: 'newer-locator-revision' }), false);
    }
  }
});

test('offset equality is stricter than personal-note eligibility and never treats zero as missing', () => {
  const current = context(), saved = [bookmark(current)];
  assert.equal(savedPassageHighlighted(saved, current), true);
  const otherPosition = { ...current, offset: 1 };
  assert.equal(passageNoteState(saved, otherPosition).eligible, true);
  assert.equal(savedPassageHighlighted(saved, otherPosition), false);
  assert.equal(savedPassageHighlighted([{ ...saved[0], offset: 1 }], current), false);
  for (const offset of [undefined, null, -1, 0.5, 100001, '0']) {
    assert.equal(savedPassageHighlighted([{ ...saved[0], offset }], current), false);
    assert.equal(savedPassageHighlighted(saved, { ...current, offset }), false);
  }
});

test('legacy and stale pins, duplicates and malformed records never gain verified styling', () => {
  const current = context(), item = bookmark(current), legacy = { ...item }; delete legacy.source_commit;
  assert.equal(passageNoteState([legacy], current).eligible, true);
  assert.equal(savedPassageHighlighted([legacy], current), false);
  const minimal = { uid: current.uid, ref: current.ref, title: current.title, note: '' };
  assert.equal(savedPassageHighlighted([minimal], current), false);
  for (const source_commit of [undefined, null, '', 'stale-pin', 'https://example.com', '<bad>']) assert.equal(savedPassageHighlighted([{ ...item, source_commit }], current), false);
  assert.equal(savedPassageHighlighted([item, { ...item }], current), false);
  assert.equal(savedPassageHighlighted([item, { uid: item.uid, ref: item.ref }], current), false);
  for (const delta of [{ title: '' }, { note: 42 }, { note: 'x'.repeat(4001) }, { text: 'Unsupported source-body field' }, { translation_scope: null }]) assert.equal(savedPassageHighlighted([{ ...item, ...delta }], current), false);
});

test('invalid current context and deeply nested unsupported metadata fail closed without throwing or mutation', () => {
  const current = context(), item = bookmark(current);
  for (const invalid of [null, undefined, {}, { ...current, source_commit: undefined }, { ...current, source_commit: '' }, { ...current, ref: '' }, { ...current, uid: 'javascript:alert(1)' }, { ...current, text: 'No source-body input' }]) assert.equal(savedPassageHighlighted([item], invalid), false);
  for (const invalid of [null, undefined, {}, 'not an array']) assert.equal(savedPassageHighlighted(invalid, current), false);
  let extra = { value: 'Retained private metadata' };
  for (let depth = 0; depth < 45; depth++) extra = { nested: extra };
  const saved = [{ ...item, extra }], before = JSON.stringify(saved);
  assert.doesNotThrow(() => assert.equal(savedPassageHighlighted(saved, current), false));
  assert.equal(JSON.stringify(saved), before);
});

test('display scripts and titles do not rebind the exact stored source reference', () => {
  const current = context(), item = bookmark(current);
  for (const title of ['धम्म · personal display title', 'ධම්ම', 'ဓမ္မ', 'ธรรม']) assert.equal(savedPassageHighlighted([item], { ...current, title }), true);
  assert.equal(savedPassageHighlighted([item], { ...current, ref: 'mn१०/१' }), false);
  assert.equal(savedPassageHighlighted([item], { ...current, uid: 'mn१०' }), false);
  assert.equal(savedPassageHighlighted([{ ...item, title: 'Different saved title', note: '' }], current), true);
});

test('predicate is offline and returns only a boolean without changing personal records or copying source bodies', () => {
  const current = Object.freeze(context()), item = Object.freeze(bookmark(current)), saved = Object.freeze([item]);
  const before = JSON.stringify({ current, saved }), originalFetch = globalThis.fetch;
  const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), originalClone = globalThis.structuredClone;
  globalThis.fetch = () => { throw Error('No network'); }; globalThis.structuredClone = undefined;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('No storage'); } });
  try {
    const result = savedPassageHighlighted(saved, current);
    assert.equal(typeof result, 'boolean'); assert.equal(result, true);
    assert.equal(savedPassageHighlighted(saved, current, false), false);
    assert.equal(JSON.stringify({ current, saved }), before);
  } finally {
    globalThis.fetch = originalFetch; globalThis.structuredClone = originalClone;
    if (storage) Object.defineProperty(globalThis, 'localStorage', storage); else delete globalThis.localStorage;
  }
});
