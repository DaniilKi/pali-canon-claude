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
