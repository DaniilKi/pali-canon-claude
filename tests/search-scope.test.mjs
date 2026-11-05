import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { searchWithInput } from '../src/english-search.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const within = (id, scope) => id === scope || id.startsWith(`${scope}.`);
for (const scope of ['sn1', 'an1', 'kv1']) test(`section search excludes similarly prefixed siblings: ${scope}`, () => {
  const all = canon.search('dhamma', { limit: 10000 });
  const expected = all.results.filter((hit) => within(hit.id, scope)).map((hit) => hit.id);
  assert.ok(expected.length);
  const result = canon.search('dhamma', { collection: scope, limit: 10000 });
  assert.deepEqual(result.results.map((hit) => hit.id), expected);
  assert.equal(result.total_texts_matched, expected.length);
  assert.ok(result.title_matches.every((hit) => within(hit.id, scope)));
});

test('exact text scopes do not admit texts with the same initial digits', () => {
  for (const scope of ['mn1', 'pli-tv-bu-vb-pc1']) {
    const result = canon.search('dhamma', { collection: scope, limit: 10000 });
    assert.ok(result.results.every((hit) => within(hit.id, scope)), scope);
    assert.ok(result.title_matches.every((hit) => within(hit.id, scope)), scope);
  }
});

test('unknown scope is an error, not a false empty search', () => {
  assert.throws(() => canon.search('dhamma', { collection: 'sn999' }), /Unknown canonical search/);
  assert.throws(() => canon.search('dhamma', { collection: '   ' }), /Unknown canonical search/);
  assert.throws(() => searchWithInput('suffering', { collection: 'an999' }), /Unknown canonical search/);
  const validButAbsent = canon.search('\"zzzzqvw-not-in-the-source\"', { collection: 'sn1' });
  assert.equal(validButAbsent.total_texts_matched, 0, 'a valid scope with no term match remains an ordinary empty result');
});

test('valid scopes keep case/space normalization, parent collections and stable pagination', () => {
  const base = canon.search('dhamma', { collection: 'sn1', limit: 10000 });
  assert.deepEqual(canon.search('dhamma', { collection: 'SN 1', limit: 10000 }).results, base.results);
  const seen = [];
  let offset = 0;
  do {
    const page = canon.search('dhamma', { collection: 'sn1', limit: 3, offset });
    assert.equal(page.total_texts_matched, base.total_texts_matched);
    seen.push(...page.results.map((hit) => hit.id));
    offset = page.next_offset;
  } while (offset !== null);
  assert.deepEqual(seen, base.results.map((hit) => hit.id));
  for (const scope of ['sn', 'an', 'vinaya', 'pli-tv-bu-vb-pc']) {
    assert.ok(canon.search('dhamma', { collection: scope }).total_texts_matched > 0, scope);
  }
});

test('input expansion and spelling retries respect section boundaries', () => {
  for (const query of ['suffering', 'sanyutta', 'dhamma']) {
    const result = searchWithInput(query, { collection: 'sn1', limit: 50 });
    assert.ok(result.results.every((hit) => within(hit.id, 'sn1')));
    assert.ok(result.title_matches.every((hit) => within(hit.id, 'sn1')));
    assert.ok((result.english_expansion_results?.results || []).every((hit) => within(hit.id, 'sn1')));
  }
});

test('MCP section filtering is precise and invalid scopes return errors', async () => {
  const client = new Client({ name: 'search-scope-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    const response = await client.callTool({ name: 'search_texts', arguments: { query: 'dhamma', collection: 'sn1', english: 'off', limit: 50, include_post_canonical: true } });
    assert.ok(!response.isError);
    const result = JSON.parse(response.content[0].text);
    assert.ok(result.results.length);
    assert.ok(result.results.every((hit) => within(hit.id, 'sn1')));
    assert.equal(result.post_canonical.searched, false);
    const invalid = await client.callTool({ name: 'search_texts', arguments: { query: 'dhamma', collection: 'sn999', english: 'off' } });
    assert.equal(invalid.isError, true);
    assert.match(invalid.content[0].text, /Unknown canonical search/);
  } finally { await client.close(); }
});

test('every numbered SN, AN and Kv section matches exactly its unfiltered members', () => {
  const all = canon.search('dhamma', { limit: 10000 });
  const scopes = new Set(canon.load().canon.units.flatMap((unit) => unit.id.match(/^(?:sn|an|kv)\d+(?=\.)/u)?.[0] || []));
  assert.ok(scopes.size > 80);
  for (const scope of scopes) {
    const expected = all.results.filter((hit) => within(hit.id, scope)).map((hit) => hit.id);
    const result = canon.search('dhamma', { collection: scope, limit: 10000 });
    assert.deepEqual(result.results.map((hit) => hit.id), expected, scope);
    assert.equal(result.total_texts_matched, expected.length, scope);
  }
});


test('existing grouped text scopes include their recorded members without prefix leaks', () => {
  const scope = 'dhp1-20';
  const unit = canon.load().byId.get(scope);
  assert.ok(unit?.members.length);
  const allowed = new Set([scope, ...unit.members]);
  const expected = canon.search('dhamma', { limit: 10000 }).results.filter((hit) => allowed.has(hit.id));
  assert.ok(expected.length);
  const result = canon.search('dhamma', { collection: scope, limit: 10000 });
  assert.deepEqual(result.results, expected);
  assert.ok(result.title_matches.every((hit) => allowed.has(hit.id)));
});
