import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as pc from '../src/postcanonical.mjs';

test('unknown post-canonical book filters fail explicitly, including a mixed valid/invalid selection', async () => {
  for (const books of [['not-a-book'], ['vism', 'not-a-book'], [' ']]) {
    await assert.rejects(pc.search('satipaṭṭhāna', { books, limit: 1 }), /book filter.*get_post_canonical/i);
  }
});

test('a passage citation is not silently broadened into a whole-book filter', async () => {
  await assert.rejects(pc.search('sati', { books: ['mahavamsa 3'], limit: 1 }), /book filter/i);
});

test('all catalogue book IDs and existing whole-work aliases remain valid filters', async () => {
  for (const book of pc.load().books) {
    const result = await pc.search('zzzzscopefixturezzzz', { books: [book.id], limit: 1 });
    assert.equal(result.searched, '1 post-canonical books', book.id);
    assert.equal(result.total_matched, 0);
  }
  const vism = await pc.search('"jaṭāya jaṭitā pajā"', { books: [' Vism ', 'visuddhimagga-1'], limit: 2 });
  assert.equal(vism.searched, '2 post-canonical books', 'alias volumes are deduplicated');
  assert.ok(vism.results.length);
  const abhs = await pc.search('sati', { books: ['Abhidh-s'], limit: 1 });
  assert.equal(abhs.searched, '1 post-canonical books');
});

test('a valid filter with no matching text remains an honest empty result', async () => {
  const result = await pc.search('zzzzscopefixturezzzz', { books: ['vism'], limit: 1 });
  assert.equal(result.searched, '2 post-canonical books');
  assert.equal(result.total_matched, 0);
  assert.deepEqual(result.results, []);
});

test('an empty book list retains the existing unrestricted meaning', async () => {
  const result = await pc.search('zzzzscopefixturezzzz', { books: [], limit: 1 });
  assert.equal(result.searched, `${pc.load().books.length} post-canonical books`);
  assert.equal(result.total_matched, 0);
});

let client;
before(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'postcanonical-scope-fixture', version: '1' });
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
});
after(async () => { await client?.close(); });

test('the MCP search tool distinguishes an invalid book filter from an empty valid result', async () => {
  const invalid = await client.callTool({ name: 'search_post_canonical', arguments: { query: 'sati', books: ['not-a-book'] } });
  assert.equal(invalid.isError, true);
  assert.match(JSON.parse(invalid.content[0].text).error, /get_post_canonical/);
  const valid = await client.callTool({ name: 'search_post_canonical', arguments: { query: 'zzzzscopefixturezzzz', books: ['vism'], limit: 1 } });
  assert.ok(!valid.isError);
  assert.equal(valid.structuredContent.total_matched, 0);
});
