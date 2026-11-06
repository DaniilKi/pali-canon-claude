import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as pc from '../src/postcanonical.mjs';

test('Abhidh-s search excludes the separate appended Vibhavini work', async () => {
  const work = pc.select('Abhidh-s');
  const book = work.book;
  assert.equal(book.works[1][0], 'Abhidhammatthavibhāvinīṭīkā');
  assert.equal(work.end, book.works[1][1], 'use the same source boundary as the work reader');
  const block = book.blocks.find((b, i) => i > work.end && b[0] === 'bodytext' && b[2].length > 60);
  const query = `"${block[2].split(/\s+/).slice(0, 9).join(' ')}"`;
  for (const alias of ['abhidh-s', 'Abhidhammatthasaṅgaha', 'Abh-s']) {
    const r = await pc.search(query, { books: [alias] });
    assert.equal(r.total_matched, 0, alias);
  }
  for (const filters of [[book.id], [book.file.replace(/\..*$/, '')], ['abhidh-s', book.id], [book.id, 'abhidh-s']]) {
    const r = await pc.search(query, { books: filters });
    assert.ok(r.total_matched > 0, JSON.stringify(filters));
    assert.ok(r.results.some((hit) => hit.excerpt.includes(block[2].slice(0, 80))));
  }
});

test('Abhidh-s work search retains the manual and combines with other source filters', async () => {
  const work = pc.select('Abhidh-s');
  const block = work.book.blocks.find((b, i) => i < work.end && b[0] === 'bodytext' && b[2].length > 60);
  const query = `"${block[2].split(/\s+/).slice(0, 9).join(' ')}"`;
  const r = await pc.search(query, { books: ['abhidh-s'] });
  assert.ok(r.results.length);
  for (const hit of r.results) {
    const selected = pc.select(hit.citation);
    assert.equal(selected.book, work.book);
    assert.ok(selected.start < work.end);
  }
  const vism = await pc.search('"jaṭāya jaṭitā pajā"', { books: ['abhidh-s', 'vism'] });
  assert.ok(vism.results.some((hit) => hit.book_id === 'visuddhimagga-1'));
  const duplicate = await pc.search(query, { books: ['abhidh-s', 'abhidh-s'] });
  assert.deepEqual(duplicate.results, r.results);
});
