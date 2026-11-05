import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { analysePassage } from '../src/analyse.mjs';

test('a paragraph cannot bypass a conflicting segment reference from another text', () => {
  assert.throws(() => analysePassage({ uid: 'MN 10', segment: 'mn11/2', paragraph: 105, limit: 1 }), /either segment or paragraph.*not both/i);
});

test('two passage selectors are rejected even if they happen to identify the same segment', () => {
  assert.throws(() => analysePassage({ uid: 'MN 10', segment: 'mn10/2', paragraph: 105, limit: 1 }), /either segment or paragraph.*not both/i);
});

test('a supplied blank or null selector never silently selects the first body segment', () => {
  for (const value of ['', ' ', null]) {
    assert.throws(() => analysePassage({ uid: 'MN 10', segment: value, limit: 1 }), /segment.*empty|segment.*blank/i);
    assert.throws(() => analysePassage({ uid: 'MN 10', paragraph: value, limit: 1 }), /paragraph.*empty|paragraph.*blank/i);
  }
});

test('a missing source paragraph field cannot match a literal undefined selector', () => {
  for (const paragraph of ['undefined', 'null']) {
    assert.throws(() => analysePassage({ uid: 'MN 10', paragraph, limit: 1 }), /no VRI paragraph/);
  }
});

test('explicit selections preserve their source passage and word continuation', () => {
  for (const selector of [{ segment: 2 }, { segment: 'mn10/2' }, { paragraph: 105 }]) {
    const first = analysePassage({ uid: 'MN 10', ...selector, limit: 2 });
    const next = analysePassage({ uid: 'MN 10', ...selector, offset: first.next_offset, limit: 2 });
    assert.equal(first.segment.ref, 'mn10/2');
    assert.equal(next.segment.ref, first.segment.ref);
    assert.equal(next.segment.text, first.segment.text);
    assert.equal(next.offset, 2);
    assert.notEqual(next.words[0].surface, first.words[0].surface);
  }
});

test('MCP rejects ambiguous and blank selectors and allows an intentional default read', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'analysis-selection-fixture', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try {
    for (const selector of [{ segment: 'mn11/2', paragraph: 105 }, { segment: '' }, { paragraph: ' ' }, { paragraph: 'undefined' }]) {
      const result = await client.callTool({ name: 'analyse_passage', arguments: { uid: 'MN 10', ...selector, limit: 1 } });
      assert.equal(result.isError, true, JSON.stringify(selector));
    }
    const result = await client.callTool({ name: 'analyse_passage', arguments: { uid: 'MN 10', limit: 1 } });
    assert.ok(!result.isError);
    assert.equal(result.structuredContent.segment.ref, 'mn10/2');
    assert.match(result.structuredContent.notes.join(' '), /No segment given/);
    assert.equal(result.structuredContent.license.name, 'CC BY-NC-SA 4.0');
  } finally { await client.close(); }
});
