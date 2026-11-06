import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import * as commentary from '../src/commentary.mjs';
import * as canon from '../src/canon.mjs';
import * as search from '../src/commentary-search.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const quote = (text) => `"${text.replace(/\s+/gu, ' ').trim()}"`;
const data = commentary.load();

test('full commentary books and exact segment references are readable without asserting alignment', () => {
  const listing = commentary.getCommentary('commentary', { limit: 200 });
  assert.equal(listing.total_books, data.books.length);
  assert.equal(listing.canonical, false);
  for (const book of data.books) {
    const uid = commentary.bookInfo(book).uid;
    const expected = commentary.bookSegments(book);
    for (const index of [0, expected.length - 1]) {
      const result = commentary.getCommentary(`${uid}/c${index + 1}`);
      assert.equal(result.total_segments, 1);
      assert.equal(result.canonical, false);
      assert.equal(result.segments[0].text, expected[index].text);
      assert.ok(!('comments_on_vri_paragraphs' in result.segments[0]));
      assert.match(result.label, /not the canon/);
      assert.match(result.source.terms, /non-commercial/);
    }
  }
});

test('search includes front matter outside verified aligned passages', () => {
  const book = data.books.find((item) => item.file === 's0201a.att.xml');
  assert.ok(book);
  const firstPassage = Math.min(...data.passages.filter((p) => data.books[p[0]] === book).map((p) => p[1]));
  assert.ok(firstPassage > 0);
  const text = commentary.bookSegments(book)[0].text;
  const result = search.search(quote(text), { books: [book.file], limit: 50 });
  assert.ok(result.results.length);
  assert.ok(result.results.some((hit) => hit.segment === 1));
  assert.equal(result.canonical, false);
  assert.match(result.source.attribution, /Vipassana Research Institute/);
  assert.match(result.source.terms, /non-commercial/);
  assert.equal(result.source.commit, canon.source().commit);
  assert.match(result.alignment_note, /does not establish/);
  for (const hit of result.results) {
    const read = commentary.getCommentary(hit.read_with.uid);
    assert.equal(read.segments.length, 1);
    assert.equal(read.segments[0].ref, hit.citation);
    assert.ok(canon.fold(read.segments[0].text.replace(/\s+/gu, ' ')).includes(canon.fold(text.replace(/\s+/gu, ' '))));
  }
});

test('quoted multi-line commentary stanzas search and read back verbatim', () => {
  const book = data.books.find((item) => commentary.bookSegments(item).some((segment) => segment.type === 'verse' && segment.text.includes('\n')));
  const stanza = commentary.bookSegments(book).find((segment) => segment.type === 'verse' && segment.text.includes('\n'));
  const result = search.search(quote(stanza.text), { books: [`commentary:${book.file}`], limit: 50 });
  assert.ok(result.results.length);
  for (const hit of result.results) {
    const read = commentary.getCommentary(hit.read_with.uid);
    assert.equal(read.segments[0].text, commentary.bookSegments(book)[hit.segment - 1].text);
    const context = commentary.getCommentary(hit.context_with.uid, hit.context_with);
    assert.ok(context.segments.some((segment) => segment.ref === hit.citation));
  }
});

test('search pagination, filters and unresolved references fail explicitly', () => {
  const a = search.search('dhamma', { limit: 2 });
  const b = search.search('dhamma', { limit: 2, offset: a.next_offset });
  assert.ok(a.total_matched > 4);
  assert.equal(a.total_matched, b.total_matched);
  assert.ok(!a.results.some((first) => b.results.some((next) => first.citation === next.citation)));
  assert.throws(() => search.search('dhamma', { books: ['missing.att.xml'] }), /Unknown commentary book/);
  assert.throws(() => search.search('"  "'), /at least one word/);
  assert.throws(() => commentary.getCommentary('commentary:../../etc/passwd'), /Unknown commentary book/);
  assert.throws(() => commentary.getCommentary(`commentary:${data.books[0].file}/c999999`), /does not exist/);
  const listed = commentary.getCommentary('commentary', { limit: 2, offset: 2 });
  assert.deepEqual(listed.books.map((book) => book.vri_file), data.books.slice(2, 4).map((book) => book.file));
});

test('search_commentary is registered and works over MCP as a read-only offline tool', async () => {
  const tools = [];
  search.register({ tool: (...args) => tools.push(args), z });
  assert.equal(tools[0][0], 'search_commentary');
  const client = new Client({ name: 'commentary-search-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    const list = await client.listTools();
    const tool = list.tools.find((item) => item.name === 'search_commentary');
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.openWorldHint, false);
    const response = await client.callTool({ name: 'search_commentary', arguments: { query: 'dhamma', limit: 1 } });
    assert.ok(!response.isError);
    const result = JSON.parse(response.content[0].text);
    const selected = await client.callTool({ name: 'get_commentary', arguments: { uid: result.results[0].read_with.uid } });
    assert.ok(!selected.isError);
  } finally { await client.close(); }
});
