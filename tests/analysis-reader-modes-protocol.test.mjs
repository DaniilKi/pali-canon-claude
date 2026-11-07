import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';

test('MCP analysis follows post-canonical and source-book readers with exact source identity', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'extended-analysis-readers', version: '1' });
  await Promise.all([client.connect(a), createServer().connect(b)]);
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    assert.ok(!r.isError, JSON.stringify(r.content));
    return JSON.parse(r.content.find((p) => p.type === 'text').text);
  };
  try {
    const read = await call('get_post_canonical', { citation: 'Vism 1.1', limit: 10 });
    const segment = read.segments.find((s) => s.type !== 'heading');
    const base = await call('analyse_passage', { uid: 'Vism 1.1', segment: segment.ref });
    assert.deepEqual(base.segment, segment);
    assert.equal(base.canonical, false);
    assert.ok(!base.text_id);
    assert.deepEqual(base.text_source, read.source);
    for (const script of SCRIPTS) {
      const uid = transliterate('Vism 1.1', 'roman', script);
      const r = await call('analyse_passage', { uid, segment: segment.ref });
      assert.deepEqual(r.segment, base.segment, script);
      assert.deepEqual(r.words, base.words, script);
      assert.equal(r.canonical, false);
      if (script !== 'roman') assert.equal(r.input_script, script);
    }
    const source = await call('get_text', { book: 'vin02m1', offset: 6, limit: 1 });
    const result = await call('analyse_passage', { book: 'vin02m1', segment: source.segments[0].ref });
    assert.deepEqual(result.segment, source.segments[0]);
    assert.equal(result.selection, 'source_book');
    assert.ok(!result.text_id && !result.citation);
    for (const args of [
      { uid: 'Vism 1.1', book: 'vin02m1' }, {},
      { uid: 'Vism 1.1', segment: 'Vism ch. 4/5' },
      { uid: 'niruttidipani 2', paragraph: '63' },
    ]) {
      const error = await client.callTool({ name: 'analyse_passage', arguments: args });
      assert.ok(error.isError, JSON.stringify(args));
      assert.ok(!JSON.parse(error.content[0].text).segment);
    }
  } finally { await client.close(); }
});
