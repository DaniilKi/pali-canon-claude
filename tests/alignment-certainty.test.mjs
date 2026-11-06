import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

test('AN fallback alignment is not presented as evidence of a source abbreviation', () => {
  for (const id of ['an1.82', 'an1.83']) {
    const { unit, notes } = canon.resolve(id);
    assert.ok(unit.approximate);
    assert.deepEqual([unit.book, unit.start, unit.end], [16, 100, 104], 'uncertain coordinates are preserved');
    assert.equal(canon.describe(unit).alignment.kind, 'unverified_alignment');
    assert.match(notes.join(' '), /no confirmed independent location/);
    assert.doesNotMatch(notes.join(' '), /is abbreviated|where the abbreviation occurs/);
    const explained = commentary.commentaryFor(unit);
    assert.equal(explained.alignment.kind, 'unverified_alignment');
    assert.ok(explained.approximate);
    assert.doesNotMatch(explained.notes.join(' '), /is abbreviated|where the abbreviation occurs/);
  }
});

test('AN group exposes its uncertain members without changing its span or source', () => {
  const { unit, notes } = canon.resolve('an1.82-97');
  assert.deepEqual([unit.start, unit.end], [100, 119]);
  assert.equal(unit.approximate, undefined);
  const expected = ['an1.82', 'an1.83', 'an1.95', 'an1.97'];
  assert.deepEqual(canon.describe(unit).alignment.unverified_members, expected);
  assert.match(notes.join(' '), /neighbouring passages/);
  assert.deepEqual(canon.search('dhamma', { collection: unit.id }).scope_alignment.unverified_members, expected);
  assert.deepEqual(canon.browse(unit.id).alignment.unverified_members, expected);
});

test('all approximate records distinguish explicit sharing from unverified alignment', () => {
  const data = canon.load();
  const kinds = { shared_passage: 0, unverified_alignment: 0 };
  for (const unit of data.canon.units.filter((u) => u.approximate)) {
    const summary = canon.describe(unit);
    const expected = unit.shares_passage_with ? 'shared_passage' : 'unverified_alignment';
    assert.equal(summary.alignment.kind, expected, unit.id);
    if (unit.shares_passage_with) assert.equal(summary.alignment.shared_with, unit.shares_passage_with);
    const { notes } = canon.resolve(unit.id);
    assert.ok(notes.includes(summary.alignment.note), unit.id);
    kinds[expected] += 1;
  }
  assert.deepEqual(kinds, { shared_passage: 199, unverified_alignment: 67 });
  assert.equal(canon.describe(canon.resolve('mn1').unit).alignment, undefined);
});

test('MCP carries alignment caution through metadata, reading, search and commentary', async () => {
  const client = new Client({ name: 'alignment-certainty', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    for (const [name, args] of [
      ['get_metadata', { uid: 'an1.82' }],
      ['get_text', { uid: 'an1.82' }],
      ['get_commentary', { uid: 'an1.82' }],
      ['analyse_passage', { uid: 'an1.82', limit: 1 }],
      ['get_parallels', { uid: 'an1.82', limit: 1 }],
      ['search_texts', { query: 'dhamma', collection: 'an1.82', english: 'off' }],
      ['resolve_reference', { reference: 'an1.82-97' }],
    ]) {
      const response = await client.callTool({ name, arguments: args });
      assert.ok(!response.isError, name);
      const result = JSON.parse(response.content[0].text);
      if (name === 'search_texts') assert.equal(result.scope_alignment.kind, 'unverified_alignment');
      else {
        assert.match(result.notes.join(' '), /no confirmed independent location|unverified member mappings/);
        assert.doesNotMatch(result.notes.join(' '), /is abbreviated|where the abbreviation occurs/);
      }
    }
  } finally { await client.close(); }
});
