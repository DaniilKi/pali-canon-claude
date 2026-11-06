import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { searchWithInput } from '../src/english-search.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

function titleIds(query, collection) {
  canon.search(query, { limit: 1 });
  return canon.load().search.titles.filter(({ u, text }) => (!collection || u.collection === collection) && text.includes(canon.fold(query))).map(({ u }) => u.id);
}

test('every title-only match can be paginated without repeating the first page', () => {
  const expected = titleIds('discourse');
  assert.ok(expected.length > 20);
  let offset = 0;
  const found = [];
  do {
    const page = canon.search('discourse', { limit: 7, offset });
    assert.equal(page.total_texts_matched, 0);
    assert.equal(page.next_offset, null, 'body continuation remains independent');
    assert.equal(page.total_title_matches, expected.length);
    assert.ok(page.title_matches.length <= 7);
    found.push(...page.title_matches.map((hit) => hit.id));
    offset = page.title_next_offset;
  } while (offset !== null);
  assert.deepEqual(found, expected);
  assert.equal(new Set(found).size, found.length);
});

test('title pagination preserves filters and handles exhausted pages without a false no-match tip', () => {
  const expected = titleIds('discourse', 'mn');
  const page = canon.search('discourse', { collection: 'mn', limit: 3, offset: 3 });
  assert.deepEqual(page.title_matches.map((hit) => hit.id), expected.slice(3, 6));
  assert.equal(page.total_title_matches, expected.length);
  const end = canon.search('discourse', { collection: 'mn', limit: 3, offset: expected.length });
  assert.deepEqual(end.title_matches, []);
  assert.equal(end.title_next_offset, null);
  assert.equal(end.tip, undefined);
});

test('body pagination continues independently after the shorter title stream ends', () => {
  const expected = titleIds('sati');
  const page = canon.search('sati', { limit: 5, offset: expected.length });
  assert.ok(page.total_texts_matched > expected.length + 5);
  assert.equal(page.results.length, 5);
  assert.deepEqual(page.title_matches, []);
  assert.equal(page.title_next_offset, null);
  assert.equal(page.next_offset, expected.length + 5);
});

test('English expansion keeps the same literal title stream on later pages', () => {
  const expected = titleIds('mindfulness');
  assert.ok(expected.length > 5);
  for (const offset of [0, 5, expected.length, expected.length + 5]) {
    const page = searchWithInput('mindfulness', { english: 'auto', limit: 5, offset });
    assert.ok(page.expanded_from_english);
    assert.equal(page.total_title_matches, expected.length);
    assert.deepEqual(page.title_matches.map((hit) => hit.id), expected.slice(offset, offset + 5));
    assert.equal(page.title_next_offset, offset + 5 < expected.length ? offset + 5 : null);
  }
});

test('English-only search without a glossary expansion exposes no literal title continuation', () => {
  assert.ok(titleIds('12.15').length);
  const result = searchWithInput('"12.15"', { english: 'only', limit: 5 });
  assert.equal(result.limit, 5);
  assert.equal(result.expanded_from_english.found, false);
  assert.deepEqual(result.title_matches, []);
  assert.equal(result.total_title_matches, 0);
  assert.equal(result.title_next_offset, null);
});

test('MCP exposes usable title continuation for a title-only search', async () => {
  const client = new Client({ name: 'title-pagination-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    const call = async (offset) => {
      const response = await client.callTool({ name: 'search_texts', arguments: { query: 'discourse', english: 'off', limit: 5, offset } });
      assert.ok(!response.isError);
      return JSON.parse(response.content[0].text);
    };
    const first = await call(0);
    assert.equal(first.title_matches.length, 5);
    assert.equal(first.title_next_offset, 5);
    const second = await call(first.title_next_offset);
    assert.equal(second.total_title_matches, first.total_title_matches);
    assert.ok(second.title_matches.every((hit) => !first.title_matches.some((previous) => previous.id === hit.id)));
  } finally { await client.close(); }
});


test('internal count-only search never advertises a non-advancing continuation', () => {
  const result = canon.search('dhamma', { limit: 0 });
  assert.ok(result.total_texts_matched > 0);
  assert.ok(result.total_title_matches > 0);
  assert.deepEqual(result.results, []);
  assert.deepEqual(result.title_matches, []);
  assert.equal(result.next_offset, null);
  assert.equal(result.title_next_offset, null);
});
