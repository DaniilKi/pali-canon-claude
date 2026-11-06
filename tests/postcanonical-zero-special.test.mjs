import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as pc from '../src/postcanonical.mjs';

test('Visuddhimagga chapter paragraph zero cannot become a whole-chapter approximation', async () => {
  for (let chapter = 1; chapter <= 23; chapter += 1) {
    const citation = `Vism ${chapter}.0`;
    assert.throws(() => pc.select(citation), /positive.*paragraph|paragraph 0/i, citation);
    await assert.rejects(pc.getText(citation), /positive.*paragraph|paragraph 0/i, citation);
  }
  for (const citation of ['Vism IV.0', 'Visuddhimagga 4:00', 'Vsm 4,0']) {
    assert.throws(() => pc.select(citation), /positive.*paragraph|paragraph 0/i, citation);
  }
});

test('valid Visuddhimagga first paragraphs and labelled unresolved numbering retain their behavior', () => {
  for (let chapter = 1; chapter <= 23; chapter += 1) {
    const whole = pc.select(`Vism ch. ${chapter}`);
    const first = pc.select(`Vism ${chapter}.1`);
    assert.deepEqual([first.book.id, first.start, first.end], [whole.book.id, whole.start, whole.end]);
    assert.equal(first.kind, 'chapter-start');
    const unresolved = pc.select(`Vism ${chapter}.2`);
    assert.equal(unresolved.approximate, true);
    assert.match(unresolved.notes.join(' '), /cannot be located exactly/);
  }
  assert.equal(pc.select('Vism §51').kind, 'paragraph');
});

test('MCP resolution and post-canonical reading refuse paragraph zero', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'special-paragraph-zero-regression', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try {
    for (const [name, arguments_] of [
      ['resolve_reference', { reference: 'Vism IV.0' }],
      ['get_post_canonical', { citation: 'Vism 4.0', limit: 1 }],
    ]) {
      const result = await client.callTool({ name, arguments: arguments_ });
      assert.equal(result.isError, true, name);
      const data = JSON.parse(result.content.find((part) => part.type === 'text').text);
      assert.match(data.error, /positive.*paragraph|paragraph 0/i);
      assert.ok(!data.segments, 'invalid citations cannot carry a substituted chapter');
    }
  } finally { await client.close(); }
});
