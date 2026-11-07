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
      const command = exact.pali.context_with;
      assert.equal(command.arguments.source_commit, exact.source.commit); assert.equal(command.arguments.script, script);
      assert.match(command.arguments.anchor_sha256, /^[a-f0-9]{64}$/);
      const context = await readPassage(command.arguments);
      const expected = await readPassage({ ...args, offset: 0, limit: 4, english: false, script });
      assert.deepEqual(context.pali.segments, expected.pali.segments);
      assert.equal(context.context_for, segment); assert.equal(context.canonical, exact.canonical);
      assert.deepEqual(context.source, exact.source); assert.equal(context.text_id, exact.text_id);
      const returned = await readPassage(context.pali.exact_with.arguments);
      assert.deepEqual(returned.pali.segments, exact.pali.segments);
      if (context.pali.continue_with) assert.equal(context.pali.continue_with.arguments.source_commit, exact.source.commit);
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
  const context = await readPassage(exact.pali.context_with.arguments);
  assert.deepEqual(context.pali.segments, final.pali.segments.slice(-3));
  assert.equal(context.pali.continue_with, null);
});

test('widget context and continuation refuse changed source/anchor before fetching English', async () => {
  const previous = globalThis.fetch; let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw Error('Unexpected provider fetch'); };
  try {
    const exact = await readPassage({ uid: 'MN 10', segment: 'mn10/1', english: false });
    const context = await readPassage(exact.pali.context_with.arguments);
    assert.equal(context.pali.offset, 0); assert.equal(context.pali.returned, 3);
    for (const args of [
      { ...exact.pali.context_with.arguments, source_commit: '0'.repeat(40) },
      { ...exact.pali.context_with.arguments, anchor_sha256: '0'.repeat(64) },
      { uid: 'MN 10', context: 2 }, { uid: 'MN 10', anchor_sha256: '0'.repeat(64) },
      { uid: 'MN 10', segment: 'mn10/1', context: 21 },
      { uid: 'MN 10', source_commit: '0'.repeat(40), english_offset: 20, translation: 'dt:mn010' },
    ]) await assert.rejects(readPassage(args));
    assert.equal(attempts, 0);
  } finally { globalThis.fetch = previous; }
});
