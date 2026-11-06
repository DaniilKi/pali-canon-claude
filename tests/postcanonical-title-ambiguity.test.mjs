import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as pc from '../src/postcanonical.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const ids = ['dighanikaya-tika-mahavagga-tika', 'samyuttanikaya-tika-mahavagga-tika'];
const ambiguous = (error) => {
  assert.match(error.message, /ambiguous/i);
  for (const id of ids) assert.ok(error.message.includes(id), id);
  return true;
};

test('duplicate post-canonical titles cannot silently choose one source book', async () => {
  assert.deepEqual(pc.load().books.filter((b) => pc.fold(b.title) === 'mahavagga-tika').map((b) => b.id), ids);
  for (const title of ['Mahāvagga-Ṭīkā', 'mahavagga tika', 'mahavagga-tika 1', 'Mahāvagga-Ṭīkā §1']) {
    assert.throws(() => pc.select(title), ambiguous, title);
    await assert.rejects(pc.getText(title), ambiguous, title);
  }
  await assert.rejects(pc.search('dhamma', { books: ['Mahāvagga-Ṭīkā'] }), ambiguous);
  await assert.rejects(pc.search('dhamma', { books: [ids[0], 'mahavagga tika'] }), ambiguous);
});

test('each exact catalogue ID and VRI filename remains an independent readable source', async () => {
  for (const id of ids) {
    const book = pc.load().byId.get(id);
    for (const ref of [id, book.file.replace(/\..*$/, '')]) {
      assert.equal(pc.select(ref).book.id, id, ref);
      assert.equal(pc.select(`${ref} 1`).book.id, id, ref);
      assert.equal((await pc.getText(ref, { limit: 5 })).book.id, id, ref);
    }
    const search = await pc.search('dhamma', { books: [id], limit: 2 });
    assert.ok(search.results.length);
    assert.ok(search.results.every((hit) => hit.book_id === id));
  }
  assert.equal(pc.select('Mūlapaṇṇāsa-Ṭīkā').book.id, 'mulapannasa-tika', 'unique title still resolves');
});

test('MCP resolution, reading and search report title ambiguity with both source choices', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'postcanonical-title-review', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try {
    for (const [name, arguments_] of [
      ['resolve_reference', { reference: 'Mahāvagga-Ṭīkā 1' }],
      ['get_post_canonical', { citation: 'Mahāvagga-Ṭīkā', limit: 1 }],
      ['search_post_canonical', { query: 'dhamma', books: ['mahavagga tika'] }],
    ]) {
      const result = await client.callTool({ name, arguments: arguments_ });
      assert.ok(result.isError, name);
      const error = JSON.parse(result.content.find((p) => p.type === 'text').text);
      ambiguous(new Error(error.error));
      assert.ok(!error.segments && !error.results, 'no silently chosen content');
    }
  } finally { await client.close(); }
});
