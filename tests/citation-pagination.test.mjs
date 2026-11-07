import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { findCitations } from '../src/find-citations.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { auditCitationPagination } from '../scripts/evidence/citation-pagination.mjs';

test('MCP citation continuation exhausts large reports with source offsets and bounded replies', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'citation-pagination', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try { await auditCitationPagination(args => client.callTool({ name: 'find_citations', arguments: args })); }
  finally { await client.close(); }
});

test('citation cursor rejects a changed index and exact UTF-16 input changes', () => {
  const text = '\ud800 MN 10; MN 11';
  const page = findCitations(text, canon, { limit: 1 });
  assert.throws(() => findCitations(text.replace('\ud800', '\ud801'), canon, { cursor: page.next_cursor }), /changed text/);
  const data = canon.load().canon;
  const loaded = canon.load();
  const changedBook = { ...data.books[0], blocks: [...data.books[0].blocks] };
  changedBook.blocks[0] = [...changedBook.blocks[0]];
  changedBook.blocks[0][2] += ' altered fixture';
  const urlIndex = new Map(loaded.urlIndex); urlIndex.set('example.test/mn10', 'mn10');
  for (const snapshot of [
    { ...loaded, canon: { ...data, source: { ...data.source, commit: 'different-source-pin' } } },
    { ...loaded, canon: { ...data, books: [changedBook, ...data.books.slice(1)] } },
    { ...loaded, canon: { ...data, units: [{ ...data.units[0], start: data.units[0].start + 1 }, ...data.units.slice(1)] } },
    { ...loaded, urlIndex },
  ]) {
    const other = { ...canon, load: () => snapshot };
    assert.throws(() => findCitations(text, other, { cursor: page.next_cursor }), /bundled index/);
  }
  const same = findCitations(text, canon, { cursor: page.next_cursor });
  assert.equal(same.citations[0].text_id, 'mn11'); assert.equal(same.next_cursor, null);
});
