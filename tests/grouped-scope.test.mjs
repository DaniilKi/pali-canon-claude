import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { searchWithInput } from '../src/english-search.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const aliases = new Set();
for (const r of canon.load().ranges) for (let n = r.from; n <= r.to; n += 1) {
  if (!canon.load().byId.has(r.prefix + n)) aliases.add(r.prefix + n);
}

for (const alias of ['an1.300', 'sn46.150', 'an10.208', 'sn46.121']) test(`grouped member search preserves source scope: ${alias}`, () => {
  const { unit } = canon.resolve(alias);
  for (const options of [{}, { limit: 1, offset: 1 }]) {
    const { scope_resolution: resolution, ...result } = canon.search('bhikkhave', { collection: alias, ...options });
    assert.deepEqual(result, canon.search('bhikkhave', { collection: unit.id, ...options }));
    assert.equal(resolution.requested, alias);
    assert.equal(resolution.resolved_id, unit.id);
    assert.equal(resolution.approximate, !!unit.approximate);
    assert.deepEqual(resolution.read_with, { tool: 'get_text', uid: unit.id });
    assert.match(resolution.note, /not separately indexed/);
    if (unit.approximate) assert.match(resolution.note, /excluded from the full-text search index/);
  }
});

test('every unprinted numeric member browses its authoritative source group', () => {
  assert.equal(aliases.size, 7397);
  for (const alias of aliases) {
    const { unit } = canon.resolve(alias);
    const result = canon.browse(alias);
    assert.equal(result.total, 1, alias);
    assert.equal(result.items[0].id, unit.id, alias);
    assert.equal(!!result.items[0].approximate, !!unit.approximate, alias);
    assert.equal(result.scope_resolution.resolved_id, unit.id, alias);
    assert.equal(result.scope_resolution.approximate, !!unit.approximate, alias);
    const empty = canon.browse(alias, { offset: 1, limit: 1 });
    assert.deepEqual(empty.items, []);
    assert.equal(empty.next_offset, null);
  }
});

test('group substitution remains explicit through input expansion and normalization', () => {
  for (const query of ['suffering', 'sanyutta', 'bhikkhave']) {
    const { scope_resolution, ...result } = searchWithInput(query, { collection: 'AN 1.300' });
    assert.equal(scope_resolution.requested, 'AN 1.300');
    assert.equal(scope_resolution.resolved_id, 'an1.297-305');
    assert.deepEqual(result, searchWithInput(query, { collection: 'an1.297-305' }));
  }
});

test('ordinary scopes remain ordinary and unknown members still fail', () => {
  for (const scope of ['mn1', 'sn1', 'dhp1-20']) {
    assert.equal(canon.search('dhamma', { collection: scope }).scope_resolution, undefined);
    assert.equal(canon.browse(scope).scope_resolution, undefined);
  }
  for (const scope of ['an1.99999', 'sn46.99999', 'mn99999']) {
    assert.throws(() => canon.search('dhamma', { collection: scope }), /Unknown canonical search scope/);
    assert.throws(() => canon.browse(scope), /Unknown browse node/);
  }
});

test('MCP exposes grouped source substitutions without searching later literature', async () => {
  const client = new Client({ name: 'grouped-scope-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    for (const [name, args] of [
      ['search_texts', { query: 'bhikkhave', collection: 'an1.300', english: 'off', include_post_canonical: true }],
      ['browse_canon', { node: 'an1.300' }],
    ]) {
      const response = await client.callTool({ name, arguments: args });
      assert.ok(!response.isError, JSON.stringify(response));
      const result = JSON.parse(response.content[0].text);
      assert.equal(result.scope_resolution.resolved_id, 'an1.297-305');
      if (name === 'search_texts') {
        assert.ok(result.results.length);
        assert.equal(result.post_canonical.searched, false);
      } else assert.equal(result.items[0].id, 'an1.297-305');
    }
  } finally { await client.close(); }
});
