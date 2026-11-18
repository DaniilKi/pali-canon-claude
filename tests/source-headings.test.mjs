import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { catalogue, readBook } from '../src/source-books.mjs';
import { search } from '../src/source-book-search.mjs';
import { transliterate } from '../src/script.mjs';

const NOTE = 'Printed headings from this VRI source file, including invocations and colophons. They are not a canonical chapter hierarchy or individual sutta/rule identities.';
let client;
before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'source-headings-test', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
});
after(async () => { await client?.close(); });
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result.content));
  return result.structuredContent ?? JSON.parse(result.content[0].text);
}

test('all 61 books expose exactly their actual printed heading segments in source order without deduplication', () => {
  const books = catalogue({ limit: 200 }).items;
  assert.equal(books.length, 61);
  let total = 0, maxLength = 0, maxRef;
  for (const book of books) {
    const original = readBook({ book: book.id, limit: Number.MAX_SAFE_INTEGER });
    const expected = original.segments.map((segment, index) => ({ segment, index })).filter(row => row.segment.type === 'heading');
    const result = search('', { book: book.id, headings_only: true, limit: Number.MAX_SAFE_INTEGER });
    assert.equal(result.headings_only, true); assert.equal(result.heading_note, NOTE);
    assert.equal(result.total_headings, expected.length); assert.equal(result.total_matched, expected.length);
    assert.equal(result.total_segments, original.total_segments); assert.equal(result.returned, expected.length); assert.equal(result.next_offset, null);
    assert.deepEqual(result.source, original.source); assert.equal(result.attribution, original.attribution);
    assert.deepEqual(result.results.map(hit => [hit.ref, hit.segment, hit.type, hit.excerpt]), expected.map(row => [row.segment.ref, row.index + 1, 'heading', row.segment.text]));
    for (const [index, hit] of result.results.entries()) {
      const expectedOffset = expected[index].index;
      assert.deepEqual(hit.read_with, { tool: 'get_text', book: book.id, offset: expectedOffset, limit: 1 });
      assert.deepEqual(hit.context_with, { tool: 'get_text', book: book.id, offset: Math.max(0, expectedOffset - 1), limit: 3 });
      assert.equal(Object.hasOwn(hit, 'text_id'), false);
      total++;
      if (hit.excerpt.length > maxLength) { maxLength = hit.excerpt.length; maxRef = hit.ref; }
    }
  }
  assert.equal(total, 20329); assert.equal(maxLength, 68); assert.equal(maxRef, 'vri-book:vin02m3/258');
});

test('heading pagination counts heading matches separately from real source positions, retaining repeated labels', () => {
  const book = 'abh03m10', all = search('', { book, headings_only: true, limit: Number.MAX_SAFE_INTEGER });
  assert.equal(all.total_headings, 2503); assert.equal(all.total_segments, 8046);
  const first = search('', { book, headings_only: true, limit: 15 });
  const second = search('', { book, headings_only: true, offset: first.next_offset, limit: 15 });
  const last = search('', { book, headings_only: true, offset: 2490, limit: 15 });
  assert.deepEqual([...first.results, ...second.results], all.results.slice(0, 30));
  assert.equal(first.next_offset, 15); assert.equal(second.next_offset, 30); assert.equal(last.returned, 13); assert.equal(last.next_offset, null);
  assert.deepEqual(last.results, all.results.slice(2490));
  assert.ok(new Set(all.results.map(hit => hit.excerpt)).size < all.results.length, 'Repeated printed headings remain distinct source references');
  const beyond = search('', { book, headings_only: true, offset: 1000000, limit: 15 });
  assert.equal(beyond.returned, 0); assert.equal(beyond.total_headings, 2503); assert.equal(beyond.next_offset, null);
});

test('ordinary omitted and explicit false modes have byte-identical results and no heading-mode fields', async () => {
  for (const [book, query] of [['vin02m1', 'namo tassa'], ['vin02m1', '"Ime kho"'], ['abh01m', 'dhamma']]) {
    assert.equal(JSON.stringify(search(query, { book, offset: 0, limit: 3 })), JSON.stringify(search(query, { book, offset: 0, limit: 3, headings_only: false })));
    const omitted = await call('search_source_book', { book, query, limit: 3 });
    const explicit = await call('search_source_book', { book, query, limit: 3, headings_only: false });
    assert.equal(JSON.stringify(omitted), JSON.stringify(explicit));
    for (const field of ['headings_only', 'total_headings', 'heading_note']) assert.equal(Object.hasOwn(omitted, field), false);
  }
});

test('blank heading mode bypasses inference and exposes actual headings and surrounding source over MCP', async () => {
  const empty = await call('search_source_book', { book: 'vin02m1', query: '   ', headings_only: true, limit: 2 });
  assert.equal(empty.query, ''); assert.equal(empty.headings_only, true); assert.equal(empty.total_headings, 480); assert.equal(empty.total_segments, 3671);
  assert.equal(empty.heading_note, NOTE);
  for (const key of ['input_normalised', 'input_script', 'input_romanized', 'query_mode', 'spelling_note', 'expanded_from_english']) assert.equal(Object.hasOwn(empty, key), false);
  const filtered = await call('search_source_book', { book: 'vin02m1.mul.xml', query: 'senāvāsasikkhāpadaṃ', headings_only: true, limit: 15 });
  assert.equal(filtered.total_headings, 480); assert.equal(filtered.total_matched, 1); assert.equal(filtered.results[0].ref, 'vri-book:vin02m1/1006');
  assert.equal(filtered.results[0].excerpt, '9. Senāvāsasikkhāpadaṃ');
  for (const hit of [...empty.results, ...filtered.results]) {
    const { tool, ...args } = hit.read_with;
    const actual = await call(tool, args);
    assert.equal(actual.canonical, true); assert.equal(actual.selection, 'source_book'); assert.equal(actual.book_id, 'vin02m1');
    assert.equal(actual.text_id, undefined); assert.equal(actual.segments[0].type, 'heading'); assert.equal(actual.segments[0].ref, hit.ref);
    assert.equal(actual.segments[0].text, hit.excerpt); assert.deepEqual(actual.source, empty.source);
    const { tool: surrounding, ...contextArgs } = hit.context_with;
    const context = await call(surrounding, contextArgs);
    assert.deepEqual(context.source, empty.source); assert.ok(context.segments.some(segment => segment.ref === hit.ref));
  }
  assert.ok(filtered.citation_note.includes('not standard sutta or rule citations'));
});

test('nonempty heading filters retain existing phrase, native-input, keyboard and native-output paths', async () => {
  const query = 'senāvāsasikkhāpadaṃ';
  const roman = await call('search_source_book', { book: 'vin02m1', query, headings_only: true, limit: 15 });
  const nativeQuery = transliterate(query, 'roman', 'sinhala');
  const native = await call('search_source_book', { book: 'vin02m1', query: nativeQuery, headings_only: true, script: 'thai', limit: 15 });
  assert.equal(native.total_matched, roman.total_matched); assert.equal(native.total_headings, roman.total_headings);
  assert.equal(native.input_script, 'sinhala'); assert.equal(native.input_romanized, query); assert.equal(native.script, 'thai');
  assert.equal(native.results[0].ref, roman.results[0].ref);
  const { tool, ...args } = native.results[0].read_with;
  assert.equal(args.script, 'thai');
  const actual = await call(tool, args); assert.equal(native.results[0].excerpt, actual.segments[0].text); assert.deepEqual(native.source, actual.source);
  const keyboard = await call('search_source_book', { book: 'vin02m1', query: 'senaavaasasikkhaapada.m', headings_only: true, limit: 15 });
  assert.ok(keyboard.input_normalised); assert.deepEqual(keyboard.results.map(hit => hit.ref), roman.results.map(hit => hit.ref));
  const phrase = await call('search_source_book', { book: 'vin02m1', query: '"9. Senāvāsasikkhāpadaṃ"', headings_only: true, limit: 15 });
  assert.deepEqual(phrase.results.map(hit => hit.ref), roman.results.map(hit => hit.ref));
  const blankNative = await call('search_source_book', { book: 'vin02m1', query: '', headings_only: true, script: 'thai', limit: 1 });
  assert.equal(blankNative.script, 'thai'); assert.equal(blankNative.input_normalised, undefined); assert.equal(blankNative.input_script, undefined);
  const noEnglish = await call('search_source_book', { book: 'vin02m1', query: 'mindfulness', headings_only: true, limit: 1 });
  assert.equal(noEnglish.expanded_from_english, undefined); assert.equal(noEnglish.total_matched, 0);
});

test('blank ordinary searches, unusable filters, malformed booleans and noncatalogue paths fail', async () => {
  for (const query of ['', '  ', 'a', '.', '""']) {
    assert.throws(() => search(query, { book: 'vin02m1' }), /at least one word/);
    const result = await client.callTool({ name: 'search_source_book', arguments: { book: 'vin02m1', query } });
    assert.equal(result.isError, true, query);
  }
  for (const query of ['a', '.', '""']) {
    assert.throws(() => search(query, { book: 'vin02m1', headings_only: true }), /at least one word/);
    const result = await client.callTool({ name: 'search_source_book', arguments: { book: 'vin02m1', query, headings_only: true } });
    assert.equal(result.isError, true, query);
  }
  for (const headings_only of ['true', 1, null, {}, []]) {
    assert.throws(() => search('', { book: 'vin02m1', headings_only }), /must be a boolean/);
    const result = await client.callTool({ name: 'search_source_book', arguments: { book: 'vin02m1', query: '', headings_only } });
    assert.equal(result.isError, true);
  }
  for (const book of ['../vin02m1', '/tmp/vin02m1', 'https://example.com/vin02m1', 'not-a-book']) {
    assert.throws(() => search('', { book, headings_only: true }), /Unknown VRI source book/);
    const result = await client.callTool({ name: 'search_source_book', arguments: { book, query: '', headings_only: true } });
    assert.equal(result.isError, true);
  }
  assert.equal(search('  ', { book: 'vin02m1', headings_only: true, limit: 1 }).returned, 1);
});
