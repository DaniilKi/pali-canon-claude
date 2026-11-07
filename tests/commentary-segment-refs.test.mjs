import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import * as commentary from '../src/commentary.mjs';
import * as parallels from '../src/parallels.mjs';
import { createServer } from '../src/server.mjs';

test('a parallel evidence command reads its exact commentary segment beyond the opening page', () => {
  const link = parallels.getParallels('MN 10', { limit: 100 }).links.find((l) => l.text.id === 'an4.28');
  assert.equal(link.commentary.passage_ref, 'mn10/c66');
  assert.equal(link.commentary.read_with.uid, link.commentary.passage_ref);
  const result = commentary.getCommentary(link.commentary.read_with.uid);
  assert.equal(result.returned, 1);
  assert.equal(result.segments[0].ref, 'mn10/c66');
  assert.match(result.segments[0].text, /ariyavaṃsā[\s\S]*\(a\. ni\. 4\.28\)/);
  assert.equal(result.total_segments, 1);
  assert.equal(result.next_offset, null);
  assert.ok(result.parent_total_segments > 66);
  assert.ok(result.segments[0].comments_on_vri_paragraphs);
});

test('aligned commentary anchors preserve source text, including the last segment and grouped roots', () => {
  for (const uid of ['MN 10', 'Dhp 1-20', 'Kd 1']) {
    const all = commentary.getCommentary(uid, { limit: 100000 });
    for (const segment of [all.segments[0], all.segments.at(-1)]) {
      assert.deepEqual(commentary.getCommentary(segment.ref).segments, [segment]);
      assert.deepEqual(commentary.getCommentary(segment.ref, { offset: 1 }).segments, []);
    }
  }
  for (const uid of ['mn10/c0', 'mn10/c-1', 'mn10/c1.5', 'mn10/c999999', 'mn10/c9007199254740993', 'an1.9/c1', 'mn999/c1']) {
    assert.throws(() => commentary.getCommentary(uid), undefined, uid);
  }
});

test('get_commentary accepts an emitted evidence anchor over MCP', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'commentary-anchor-test', version: '1.0' });
  const server = createServer();
  try {
    await Promise.all([client.connect(a), server.connect(b)]);
    const good = await client.callTool({ name: 'get_commentary', arguments: { uid: 'mn10/c66' } });
    assert.ok(!good.isError);
    assert.equal(JSON.parse(good.content[0].text).segments[0].ref, 'mn10/c66');
    const bad = await client.callTool({ name: 'get_commentary', arguments: { uid: 'mn10/c999999' } });
    assert.equal(bad.isError, true);
  } finally { await client.close(); await server.close(); }
});
