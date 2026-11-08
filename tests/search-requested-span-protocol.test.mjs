import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';
import * as canon from '../src/canon.mjs';

test('MCP requested-span search retains IDs, cautions and continuation across every supported script', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'requested-span-script-acceptance', version: '1' });
  await Promise.all([client.connect(a), createServer().connect(b)]);
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    assert.ok(!r.isError, JSON.stringify(r.content));
    return JSON.parse(r.content.find((p) => p.type === 'text').text);
  };
  try {
    for (const script of SCRIPTS) {
      const query = transliterate('jātidhammaṃ', 'roman', script);
      assert.equal(canon.fold(transliterate(query, script, 'roman')), canon.fold('jātidhammaṃ'));
      for (const offset of [0, 1]) {
        const r = await call('search_texts', { query, collection: 'sn35.34', english: 'off', script, offset, limit: 1 });
        assert.equal(r.total_texts_matched, 1, script);
        assert.equal(r.next_offset, null);
        assert.equal(r.scope_source_span.text_id, 'sn35.34');
        assert.equal(r.scope_alignment.kind, 'unverified_alignment');
        assert.deepEqual(r.results.map((hit) => hit.id), offset ? [] : ['sn35.34']);
        if (!offset) assert.equal(r.results[0].approximate, true);
      }
    }
    const expected = canon.segments(canon.resolve('sn35.34').unit);
    for (const limit of [1, 3, 7, 200]) {
      let offset = 0;
      const segments = [];
      do {
        const r = await call('get_text', { uid: 'sn35.34', offset, limit });
        assert.equal(r.total_segments, expected.length);
        assert.ok(r.notes.includes(canon.alignmentInfo(canon.resolve('sn35.34').unit).note));
        segments.push(...r.segments);
        assert.ok(r.next_offset === null || r.next_offset === offset + r.returned);
        offset = r.next_offset;
      } while (offset !== null);
      assert.deepEqual(segments, expected, `limit ${limit}`);
    }
  } finally { await client.close(); }
});
