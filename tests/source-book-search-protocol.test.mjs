import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';

test('MCP source-book hits read precisely in every supported script', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'source-book-search-acceptance', version: '1' });
  await Promise.all([client.connect(a), createServer().connect(b)]);
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    assert.ok(!r.isError, JSON.stringify(r.content));
    return JSON.parse(r.content.find((p) => p.type === 'text').text);
  };
  try {
    const text = 'Ime kho panāyasmanto dvenavuti pācittiyā';
    for (const script of SCRIPTS) {
      const query = `"${transliterate(text, 'roman', script)}"`;
      const r = await call('search_source_book', { book: 'vin02m1', query, script });
      assert.equal(r.total_matched, 1, script);
      assert.equal(r.results[0].ref, 'vri-book:vin02m1/7');
      assert.equal(r.results[0].read_with.script, script);
      const { tool, ...args } = r.results[0].read_with;
      const read = await call(tool, args);
      assert.equal(read.segments.length, 1);
      assert.equal(read.segments[0].ref, r.results[0].ref);
      assert.equal(read.segments[0].text, transliterate(text, 'roman', script));
    }
    const invalid = await client.callTool({ name: 'search_source_book', arguments: { book: 'MN 10', query: 'dhamma' } });
    assert.ok(invalid.isError);
    const keyboard = await call('search_source_book', { book: 'vin02m1', query: '"Ime kho panāyasmanto dvenavuti paacittiyaa"' });
    assert.equal(keyboard.total_matched, 1);
    assert.ok(keyboard.input_normalised);
    const end = await call('search_source_book', { book: 'vin02m1', query: `"${text}"`, offset: 1, limit: 1 });
    assert.equal(end.total_matched, 1);
    assert.deepEqual(end.results, []);
    assert.equal(end.next_offset, null);
  } finally { await client.close(); }
});
