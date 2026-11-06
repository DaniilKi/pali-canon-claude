import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as pc from '../src/postcanonical.mjs';

test('every unique catalogue title identifies its own source book', () => {
  for (const books of pc.load().byTitle.values()) {
    if (books.length !== 1) continue;
    const book = books[0];
    assert.equal(pc.select(book.title).book.id, book.id, book.title);
  }
});

test('the Nidanakatha title and chapter references read the same source as its exact ID', async () => {
  const book = pc.load().byId.get('visuddhimagga-nidanakatha');
  for (const suffix of ['', ' 1', ' 2']) {
    const expected = pc.select(book.id + suffix);
    const selected = pc.select(book.title + suffix);
    assert.deepEqual([selected.book.id, selected.start, selected.end], [expected.book.id, expected.start, expected.end]);
    assert.deepEqual((await pc.getText(book.title + suffix, { limit: 2 })).segments,
      (await pc.getText(book.id + suffix, { limit: 2 })).segments);
  }
  assert.throws(() => pc.select('Visuddhimagga 3'), /PTS page/);
  assert.equal(pc.select('Vism IV.1').chapter, 4);
  assert.equal(pc.select('Vism §51').paragraph, '51');
});

test('MCP resolution and reading honor the full catalogue title before a work-name prefix', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'postcanonical-title-priority', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  const call = async (name, arguments_) => {
    const result = await client.callTool({ name, arguments: arguments_ });
    assert.ok(!result.isError, JSON.stringify(result.content));
    return JSON.parse(result.content.find((p) => p.type === 'text').text);
  };
  try {
    for (const [tool, field] of [['resolve_reference', 'reference'], ['get_post_canonical', 'citation']]) {
      const byTitle = await call(tool, { [field]: 'Visuddhimagga Nidānakathā 1' });
      const byId = await call(tool, { [field]: 'visuddhimagga-nidanakatha 1' });
      assert.equal(byTitle.canonical, false);
      assert.deepEqual(byTitle.book, byId.book);
      if (byId.segments) assert.deepEqual(byTitle.segments, byId.segments);
    }
  } finally { await client.close(); }
});
