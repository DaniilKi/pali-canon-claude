import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { SCRIPTS } from '../src/script.mjs';

test('exact widget segments retain source scope, script and uncertainty without English fetches', async () => {
  const previous = globalThis.fetch; let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw Error('Unexpected provider fetch'); };
  try {
    for (const script of SCRIPTS) for (const args of [{ uid: 'MN 10' }, { uid: 'Vism 1.1' }, { book: 'vin02m1' }, { uid: 'AN 2.1' }]) {
      const source = await readPassage({ ...args, offset: 1, limit: 1, english: false, script });
      const segment = source.pali.segments[0].ref;
      const exact = await readPassage({ ...args, segment, script });
      assert.deepEqual(exact.pali.segments, source.pali.segments);
      assert.deepEqual(exact.source, source.source); assert.equal(exact.canonical, source.canonical);
      assert.equal(exact.text_id, source.text_id); assert.equal(exact.selection, source.selection);
      assert.equal(exact.approximate, source.approximate); assert.equal(exact.script, source.script);
      assert.equal(exact.segment_ref, segment); assert.equal(exact.pali.offset, 1);
      assert.equal(exact.pali.returned, 1); assert.equal(exact.pali.next_offset, null); assert.equal(exact.pali.continue_with, null);
      assert.equal(exact.english, null); assert.match(exact.english_error, /no verified segment-level English alignment/);
      assert.ok(source.notes.every(note => exact.notes.includes(note)));
    }
    assert.equal(attempts, 0);
  } finally { globalThis.fetch = previous; }
});

test('exact widget segments refuse cross-source refs, malformed selectors and conflicting cursors', async () => {
  for (const args of [
    { uid: 'MN 10', segment: 'mn1/2' }, { uid: 'MN 10', segment: 'MN 10/2' },
    { uid: 'Vism 1.1', segment: 'Vism 1.2/2' }, { book: 'vin02m1', segment: 'mn10/7' },
    { uid: 'MN 10', segment: 'mn10/99999' }, { uid: 'MN 10', segment: 'mn10/0' },
    { uid: 'MN 10', segment: 'mn10/01' }, { uid: 'MN 10', segment: '' },
    { uid: 'MN 10', segment: 'mn10/2', offset: 1 }, { uid: 'MN 10', segment: 'mn10/2', english_offset: 1 },
    { commentary: 'MN 10', segment: 'mn10/c66' },
  ]) await assert.rejects(readPassage({ ...args, english: false }));
  const final = await readPassage({ uid: 'MN 10', offset: 0, limit: 100000, english: false });
  const last = final.pali.segments.at(-1);
  const exact = await readPassage({ uid: 'MN 10', segment: last.ref, english: false });
  assert.deepEqual(exact.pali.segments, [last]); assert.equal(exact.pali.continue_with, null);
});
