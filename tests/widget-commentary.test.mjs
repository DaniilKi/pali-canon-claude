import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPassage } from '../src/chatgpt-widget.mjs';
import * as commentary from '../src/commentary.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';
import { expectedSegments } from '../scripts/evidence/study-scripts.mjs';

test('commentary widget preserves source, scripts and cursor selection without fetching English', async () => {
  const previous = globalThis.fetch; let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw Error('Unexpected provider fetch'); };
  try {
    for (const script of SCRIPTS) for (const reference of ['MN 10', 'commentary:s0101a.att.xml']) {
      const input = reference === 'MN 10' ? transliterate(reference, 'roman', script) : reference;
      const page = await readPassage({ commentary: input, script, limit: 2 });
      const expected = commentary.getCommentary(reference, { limit: 4 });
      assert.equal(page.canonical, false); assert.equal(page.content_type, 'commentary');
      assert.equal(page.text_id, undefined); assert.equal(page.available, true);
      assert.deepEqual(page.pali.segments, expectedSegments(expected.segments.slice(0, 2), script));
      assert.deepEqual(page.source, expected.source); assert.equal(page.pali.license, expected.source.terms);
      assert.equal(page.links.suttacentral, undefined); assert.equal(page.english, null);
      assert.match(page.english_error, /No English commentary translation/);
      const args = page.pali.continue_with.arguments;
      assert.equal(args.uid, undefined); assert.equal(args.book, undefined); assert.equal(args.script, script);
      const next = await readPassage(args);
      assert.deepEqual(next.pali.segments, expectedSegments(expected.segments.slice(2, 4), script));
      if (reference.startsWith('commentary:')) { assert.equal(page.requested_on, undefined); assert.equal(page.alignment_note, expected.alignment_note); }
      else assert.equal(page.requested_on.id, 'mn10');
    }
    assert.equal(attempts, 0);
  } finally { globalThis.fetch = previous; }
});

test('commentary widget preserves exact refs, absent alignment and uncertainty without substituting source text', async () => {
  for (const reference of ['mn10/c66', 'commentary:s0101a.att.xml/c2']) {
    const page = await readPassage({ commentary: reference, limit: 3, english: false });
    assert.equal(page.pali.returned, 1); assert.equal(page.pali.continue_with, null);
    assert.equal(page.pali.segments[0].ref, reference);
    const alias = await readPassage({ uid: reference, english: false, limit: 3 });
    assert.equal(alias.content_type, 'commentary'); assert.deepEqual(alias.pali.segments, page.pali.segments);
  }
  const absent = await readPassage({ commentary: 'AN 1.9' });
  assert.equal(absent.available, false); assert.deepEqual(absent.pali.segments, []);
  assert.equal(absent.pali.continue_with, null); assert.match(absent.availability_note, /No verified commentary alignment/);
  assert.deepEqual(absent.notes, commentary.getCommentary('AN 1.9').notes);
  const approximate = await readPassage({ commentary: 'AN 2.1', english: false, script: 'thai', limit: 1 });
  const original = commentary.getCommentary('AN 2.1', { limit: 1 });
  assert.equal(approximate.approximate, original.approximate); assert.deepEqual(approximate.alignment, original.alignment);
  assert.deepEqual(approximate.notes, original.notes);
  for (const args of [{ commentary: 'commentary' }, { commentary: 'MN 10', uid: 'MN 10' }, { commentary: 'MN 10', book: 'vin02m1' }, { commentary: 'mn10/c999999' }, { commentary: 'commentary:unknown' }]) await assert.rejects(readPassage(args));
});

test('all 47 commentary source books have a faithful unaligned widget opening', async () => {
  for (const book of commentary.load().books) {
    const uid = `commentary:${book.file}`;
    const page = await readPassage({ commentary: uid, english: false, limit: 1 });
    const expected = commentary.getCommentary(uid, { limit: 1 });
    assert.equal(page.content_type, 'commentary'); assert.equal(page.canonical, false);
    assert.deepEqual(page.pali.segments, expected.segments); assert.equal(page.alignment_note, expected.alignment_note);
  }
});

test('exact commentary context and return retain aligned or complete-book scope across scripts', async () => {
  for (const script of SCRIPTS) for (const reference of ['mn10/c66', 'commentary:s0101a.att.xml/c2']) {
    const exact = await readPassage({ commentary: reference, english: false, script });
    const args = exact.pali.context_with.arguments;
    assert.equal(args.commentary, reference); assert.equal(args.script, script);
    assert.equal(args.source_commit, exact.source.commit); assert.match(args.anchor_sha256, /^[a-f0-9]{64}$/);
    const context = await readPassage(args);
    assert.match((await readPassage({ ...args, english: true })).english_error, /No English commentary translation/);
    const parent = reference.replace(/\/c\d+$/, '');
    const index = Number(reference.match(/\/c(\d+)$/)[1]) - 1, offset = Math.max(0, index - 2);
    const expected = commentary.getCommentary(parent, { offset, limit: index - offset + 3 });
    assert.deepEqual(context.pali.segments, expectedSegments(expected.segments, script));
    assert.equal(context.context_for, reference); assert.equal(context.content_type, 'commentary');
    assert.equal(context.text_id, undefined); assert.deepEqual(context.source, exact.source);
    assert.equal(context.selection, exact.selection); assert.equal(context.approximate, expected.approximate);
    assert.deepEqual(context.notes, expected.notes || []);
    if (reference.startsWith('commentary:')) { assert.equal(context.requested_on, undefined); assert.equal(context.alignment_note, exact.alignment_note); }
    else assert.equal(context.requested_on.id, 'mn10');
    const returned = await readPassage(context.pali.exact_with.arguments);
    assert.deepEqual(returned.pali.segments, exact.pali.segments); assert.equal(returned.citation, exact.citation);
  }
});

test('commentary context checks source/anchor pins and clips complete-book boundaries', async () => {
  for (const book of commentary.load().books) {
    const parent = `commentary:${book.file}`;
    const exact = await readPassage({ commentary: parent + '/c1', english: false });
    if (!exact.pali.context_with) continue;
    const context = await readPassage(exact.pali.context_with.arguments);
    assert.deepEqual(context.pali.segments, commentary.getCommentary(parent, { limit: 3 }).segments);
    assert.equal(context.pali.offset, 0); assert.equal(context.requested_on, undefined);
  }
  const exact = await readPassage({ commentary: 'mn10/c66', english: false });
  for (const args of [
    { ...exact.pali.context_with.arguments, source_commit: '0'.repeat(40) },
    { ...exact.pali.context_with.arguments, anchor_sha256: '0'.repeat(64) },
    { ...exact.pali.context_with.arguments, offset: 1 },
    { ...exact.pali.context_with.arguments, english_offset: 1 },
    { commentary: 'mn10', context: 2 },
  ]) await assert.rejects(readPassage(args));
  const parent = commentary.getCommentary('mn10', { limit: 1 });
  const end = await readPassage({ commentary: `mn10/c${parent.total_segments}`, english: false });
  const context = await readPassage(end.pali.context_with.arguments);
  assert.equal(context.pali.next_offset, null); assert.equal(context.pali.segments.at(-1).ref, end.pali.segments[0].ref);
});
