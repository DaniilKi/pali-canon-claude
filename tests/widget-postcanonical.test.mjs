import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPassage } from '../src/chatgpt-widget.mjs';
import * as post from '../src/postcanonical.mjs';
import * as canon from '../src/canon.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';
import { expectedSegments } from '../scripts/evidence/study-scripts.mjs';

test('Vism widget reading keeps post-canonical identity, exact source and unavailable English without fetching', async () => {
  const previous = globalThis.fetch; let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw Error('Unexpected provider request'); };
  try {
    const page = await readPassage({ uid: 'Vism 1.1', limit: 2 });
    const source = await post.getText('Vism 1.1', { limit: 2 });
    assert.equal(page.canonical, false); assert.equal(page.text_id, undefined);
    assert.equal(page.label, source.label); assert.deepEqual(page.source, source.source);
    assert.deepEqual(page.pali.segments, source.segments); assert.equal(page.pali.license, source.source.terms);
    assert.match(page.english_error, /No English translation.*post-canonical/);
    assert.equal(page.english, null); assert.deepEqual(page.english_available, []);
    assert.equal(page.links.suttacentral, undefined);
    const next = await readPassage(page.pali.continue_with.arguments);
    assert.deepEqual(next.pali.segments, (await post.getText('Vism 1.1', { offset: 2, limit: 2 })).segments);
    assert.equal(attempts, 0);
  } finally { globalThis.fetch = previous; }
});

test('widget native input/display and Pali continuation retain canonical and post-canonical choices', async () => {
  for (const script of SCRIPTS) for (const uid of ['MN 10', 'Vism 1.1']) {
    const input = transliterate(uid, 'roman', script);
    const page = await readPassage({ uid: input, script, english: false, limit: 2 });
    const expected = uid === 'MN 10' ? canon.segments(canon.resolve(uid).unit) : (await post.getText(uid, { limit: 4 })).segments;
    assert.deepEqual(page.pali.segments, expectedSegments(expected.slice(0, 2), script));
    assert.equal(page.pali.continue_with.arguments.script, script);
    const next = await readPassage(page.pali.continue_with.arguments);
    assert.deepEqual(next.pali.segments, expectedSegments(expected.slice(2, 4), script));
    assert.equal(next.canonical, page.canonical);
    if (script !== 'roman') assert.equal(page.input_script, script);
  }
});

test('post-canonical widget selection retains uncertainty and refuses unsupported or ambiguous references', async () => {
  const page = await readPassage({ uid: 'Vism 1.2', english: false, limit: 2 });
  assert.equal(page.approximate, true);
  assert.deepEqual(page.notes, (await post.getText('Vism 1.2', { limit: 2 })).notes);
  for (const uid of ['Vism p. 3', 'Vism 1.0', 'Mahāvagga-Ṭīkā', 'MN 999']) await assert.rejects(readPassage({ uid, english: false }));
  await assert.rejects(readPassage({ uid: 'Vism 1.1', script: 'unknown' }), /Available/);
  const continuation = await readPassage({ uid: 'Vism 1.1', translation: 'dt:MN/MN10', english_offset: 500, limit: 1 });
  assert.equal(continuation.english, null); assert.match(continuation.english_error, /character-offset continuation/);
});

test('all 109 post-canonical books have a source-faithful widget opening', async () => {
  for (const book of post.load().books) {
    const page = await readPassage({ uid: book.id, english: false, limit: 1 });
    const expected = await post.getText(book.id, { limit: 1 });
    assert.equal(page.canonical, false); assert.equal(page.book.id, book.id);
    assert.deepEqual(page.pali.segments, expected.segments); assert.deepEqual(page.source, expected.source);
  }
});
