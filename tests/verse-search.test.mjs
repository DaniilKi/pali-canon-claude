import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as pc from '../src/postcanonical.mjs';

const phrase = (text) => `"${text.replace(/\s+/gu, ' ').trim()}"`;
for (const reference of ['Dhp 5', 'Dhp 183']) test(`canonical search finds a retrieved whole stanza: ${reference}`, () => {
  const { unit } = canon.resolve(reference);
  const verse = canon.segments(unit).find((segment) => segment.type === 'verse' && segment.text.includes('\n'));
  assert.ok(verse);
  for (const query of [phrase(verse.text), `"${verse.text}"`, phrase(canon.fold(verse.text))]) {
    const results = canon.search(query, { collection: 'dhp', limit: 50 });
    assert.ok(results.results.some((hit) => hit.id === unit.id), `${reference}: ${query}`);
  }
});

test('post-canonical search finds a retrieved whole stanza and returns a containing citation', async () => {
  const text = await pc.getText('Vism §1', { limit: 50 });
  const verse = text.segments.find((segment) => segment.type === 'verse' && segment.text.includes('\n'));
  assert.ok(verse);
  for (const query of [phrase(verse.text), `"${verse.text}"`, phrase(pc.fold(verse.text))]) {
    const results = await pc.search(query, { books: ['vism'], limit: 50 });
    assert.ok(results.results.length, query);
    for (const hit of results.results) {
      const page = await pc.getText(hit.citation, { limit: 200 });
      const returned = pc.fold(page.segments.map((segment) => segment.text).join(' ').replace(/\s+/gu, ' '));
      assert.ok(returned.includes(pc.fold(verse.text.replace(/\s+/gu, ' '))), hit.citation);
    }
  }
});

test('search does not combine the end of one canonical verse with the next text', () => {
  const a = canon.segments(canon.resolve('Dhp 5').unit).find((s) => s.type === 'verse').text.split('\n').at(-1);
  const b = canon.segments(canon.resolve('Dhp 6').unit).find((s) => s.type === 'verse').text.split('\n')[0];
  assert.equal(canon.search(phrase(`${a} ${b}`), { collection: 'dhp' }).total_texts_matched, 0);
});

import { searchSegments, searchFold, searchExcerpt } from '../src/search-segments.mjs';
test('stanza matching respects ownership, stanza endings and prose boundaries', () => {
  const blocks = [
    ['hangnum', '1', ''], ['gatha1', '', 'first line'], ['gathalast', '', 'second line'],
    ['gatha1', '2', 'another stanza'], ['gathalast', '', 'last line'],
    ['bodytext', '3', 'separate paragraph'], ['bodytext', '4', 'another paragraph'],
  ];
  assert.deepEqual(searchSegments(blocks).map((s) => s.text), [
    'first line\nsecond line', 'another stanza\nlast line', 'separate paragraph', 'another paragraph',
  ]);
  const boundary = [['gatha1', '', 'end of text'], ['gathalast', '', 'new text']];
  assert.deepEqual(searchSegments(boundary, (i) => i).map((s) => s.text), ['end of text', 'new text']);
  assert.equal(searchFold('line\n \tsecond', canon.fold), 'line second');
  assert.equal(searchExcerpt('before [line]\n second after', '[line] second', canon.fold), 'before [line]\n second after');
});

test('a post-canonical citation covers the entire returned multi-block stanza', () => {
  let checked = 0;
  for (const book of pc.load().books) {
    const stanza = searchSegments(book.blocks).find((s) => s.end - s.start > 1 && s.text.includes('\n'));
    if (!stanza) continue;
    const citation = pc.citationFor(book, stanza.start, stanza.end);
    const selection = pc.select(citation);
    assert.equal(selection.book, book, citation);
    assert.ok(selection.start <= stanza.start && selection.end >= stanza.end, citation);
    checked += 1;
  }
  assert.ok(checked > 50, 'checks every post-canonical book with a multi-line stanza');
});
