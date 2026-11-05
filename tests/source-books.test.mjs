import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';

let client;
before(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'source-book-test', version: '1' });
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
});
after(async () => { await client?.close(); });
async function call(name, args) {
  const response = await client.callTool({ name, arguments: args });
  const text = response.content.find((p) => p.type === 'text').text;
  let data;
  try { data = JSON.parse(text); } catch { data = { error: text }; }
  return { error: !!response.isError, data };
}

test('book catalogue exposes every bundled root file with a reading action', async () => {
  const { error, data } = await call('browse_canon', { node: 'books', limit: 200 });
  assert.equal(error, false);
  const books = canon.load().canon.books;
  assert.equal(data.total, books.length);
  assert.deepEqual(data.items.map((b) => b.vri_file), books.map((b) => b.file));
  assert.ok(data.items.every((b) => b.title && b.read_with.tool === 'get_text' && b.read_with.book === b.id));
  assert.equal(new Set(data.items.map((b) => b.id)).size, books.length);
  const next = await call('browse_canon', { node: 'books', offset: 3, limit: 3 });
  assert.deepEqual(next.data.items, data.items.slice(3, 6));
  assert.equal(next.data.next_offset, 6);
});

test('all seven uncited AN opening invocations can be read from their complete source book', async () => {
  const root = canon.load();
  let checked = 0;
  for (const [bi, book] of root.canon.books.entries()) {
    const block = book.blocks[0];
    if (book.collection !== 'an' || block[1] !== '0' || !block[2]) continue;
    if (root.canon.units.some((u) => u.book === bi && u.start === 0)) continue;
    const result = await call('get_text', { book: book.file.replace(/\.mul\.xml$/, ''), limit: 3 });
    assert.equal(result.error, false);
    assert.ok(result.data.segments.some((s) => s.text === block[2]), book.file);
    checked += 1;
  }
  assert.equal(checked, 7, 'pinned VRI front-matter regression fixtures');
});

test('whole-book continuations preserve source text, Vinaya PTS labels and exact termination', async () => {
  const root = canon.load();
  const bi = root.canon.books.findIndex((b) => b.file === 'vin02m1.mul.xml');
  const expected = canon.segments({ id: 'vri-book:vin02m1', book: bi, start: 0, end: root.canon.books[bi].blocks.length, collection: 'vinaya' });
  const page = await call('get_text', { book: 'vin02m1', offset: 13, limit: 7 });
  assert.equal(page.error, false);
  assert.deepEqual(page.data.segments, expected.slice(13, 20));
  assert.equal(page.data.next_offset, 20);
  const last = await call('get_text', { book: 'vin02m1.mul.xml', offset: expected.length - 3, limit: 7 });
  assert.deepEqual(last.data.segments, expected.slice(-3));
  assert.equal(last.data.next_offset, null);
  const past = await call('get_text', { book: 'vin02m1', offset: expected.length + 1 });
  assert.deepEqual(past.data.segments, []);
  assert.equal(past.data.next_offset, null);
  const first = await call('get_text', { book: 'vin02m1', limit: 200 });
  const pts = first.data.segments.flatMap((s) => s.pts_page_begins || []);
  assert.ok(pts.length > 0);
  assert.ok(pts.every((p) => /^Vin /.test(p)), 'source-file vin-pc collection must use canonical Vinaya PTS labels');
});

test('book readings support scripts and variants without changing source references', async () => {
  const book = canon.load().canon.books.find((b) => b.collection === 'dhp').file.replace(/\.mul\.xml$/, '');
  const plain = await call('get_text', { book, limit: 200 });
  const structured = await call('get_text', { book, limit: 200, variants: 'structured' });
  assert.equal(structured.error, false);
  assert.deepEqual(structured.data.segments.map((s) => s.text), plain.data.segments.map((s) => s.text));
  assert.ok(structured.data.segments.some((s) => s.variants?.length));
  assert.ok(structured.data.variant_note);
  const localized = await call('get_text', { book, limit: 5, script: 'sinh' });
  assert.equal(localized.error, false);
  assert.equal(localized.data.script, 'sinhala');
  assert.ok(localized.data.segments.some((s) => /[඀-෿]/.test(s.text)));
  assert.deepEqual(localized.data.segments.map((s) => s.ref), plain.data.segments.slice(0, 5).map((s) => s.ref));
  assert.equal(localized.data.source.terms, plain.data.source.terms);
});

test('reading selectors and per-citation translation/commentary options cannot be mixed', async () => {
  for (const args of [{}, { uid: 'MN 10', book: 'vin02m1' }]) {
    const result = await call('get_text', args);
    assert.equal(result.error, true);
    assert.match(result.data.error, /exactly one/);
  }
  for (const args of [{ book: 'vin02m1', translation: 'default' }, { book: 'vin02m1', commentary: true }]) {
    const result = await call('get_text', args);
    assert.equal(result.error, true);
    assert.match(result.data.error, /individual uid/);
  }
  const individual = await call('get_text', { uid: 'MN 10', limit: 2 });
  assert.equal(individual.error, false);
  assert.equal(individual.data.text_id, 'mn10');
  assert.equal(individual.data.book_id, undefined);
  assert.deepEqual(individual.data.segments, canon.segments(canon.resolve('MN 10').unit).slice(0, 2));
});

test('book IDs resolve only to bundled catalogue entries', async () => {
  for (const book of ['../private', '/tmp/private', 'https://example.com/book', 'vin02m1%2emul%2exml', 'not-a-book']) {
    const result = await call('get_text', { book });
    assert.equal(result.error, true);
    assert.match(result.data.error, /Unknown VRI source book.*browse_canon/);
  }
});

test('complete Pācittiya book includes the two introductory recitation lines outside citation spans', async () => {
  const root = canon.load();
  const bi = root.canon.books.findIndex((b) => b.file === 'vin02m1.mul.xml');
  const expected = root.canon.books[bi].blocks.slice(6, 8).map((b) => b[2]);
  assert.ok(root.canon.units.filter((u) => u.book === bi).every((u) => u.start > 7 || u.end <= 6), 'fixture must be outside all citation spans');
  const { error, data } = await call('get_text', { book: 'vin02m1', limit: 15 });
  assert.equal(error, false);
  assert.equal(data.selection, 'source_book');
  assert.equal(data.book_id, 'vin02m1');
  assert.equal(data.text_id, undefined, 'a whole book must not be presented as one standard citation');
  assert.equal(data.canonical, true);
  for (const text of expected) assert.ok(data.segments.some((s) => s.text === text));
  assert.equal(data.source.commit, root.canon.source.commit);
  assert.equal(data.source.terms, root.canon.source.terms);
  assert.ok(data.segments.every((s) => s.ref.startsWith('vri-book:vin02m1/')));
});
