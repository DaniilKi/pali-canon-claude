import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as pc from '../src/postcanonical.mjs';
import * as commentarySearch from '../src/commentary-search.mjs';
import { searchWithInput } from '../src/english-search.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

import { searchTerms, hasSearchQuotes } from '../src/search-segments.mjs';

test('quote parsing preserves literal inner punctuation and Pāli apostrophes', () => {
  assert.deepEqual(searchTerms('"alpha “beta” gamma" delta', canon.fold), ['alpha “beta” gamma', 'delta']);
  assert.deepEqual(searchTerms('“alpha "beta" gamma” delta', canon.fold), ['alpha "beta" gamma', 'delta']);
  assert.deepEqual(searchTerms('“alpha\n beta” "gamma delta" epsilon', canon.fold), ['alpha beta', 'gamma delta', 'epsilon']);
  assert.deepEqual(searchTerms("evaṃ’pi 'bhikkhave'", canon.fold), ['evam', 'pi', 'bhikkhave']);
  assert.equal(hasSearchQuotes("evaṃ’pi"), false);
  for (const query of ['"alpha', '“alpha', 'alpha”']) assert.equal(hasSearchQuotes(query), true);
});

const straight = '"sati buddha"';
const curly = '“sati buddha”';

test('curly double quotes preserve canonical phrase order, counts and title selection', () => {
  const expected = canon.search(straight, { limit: 10000 });
  const actual = canon.search(curly, { limit: 10000 });
  assert.deepEqual(actual.results, expected.results);
  assert.deepEqual(actual.title_matches, expected.title_matches);
  assert.equal(actual.total_texts_matched, expected.total_texts_matched);
  assert.equal(actual.total_title_matches, expected.total_title_matches);
  assert.equal(actual.query, curly, 'echo the query as typed');
});

test('post-canonical and commentary phrase searches accept the same curly quote syntax', async () => {
  const a = await pc.search(straight, { books: ['vism'], limit: 50 });
  const b = await pc.search(curly, { books: ['vism'], limit: 50 });
  assert.deepEqual(b.results, a.results);
  assert.equal(b.total_matched, a.total_matched);
  const c = commentarySearch.search(straight, { books: ['s0201a.att.xml'], limit: 50 });
  const d = commentarySearch.search(curly, { books: ['s0201a.att.xml'], limit: 50 });
  assert.deepEqual(d.results, c.results);
  assert.equal(d.total_matched, c.total_matched);
});

test('a failed curly-quoted phrase is not retried as loose spelling variants or Pāli keywords', () => {
  for (const text of ['satipatana', 'How many jhanas are there']) {
    const a = searchWithInput(`"${text}"`, { english: 'off', limit: 50 });
    const b = searchWithInput(`“${text}”`, { english: 'off', limit: 50 });
    assert.equal(b.total_texts_matched, a.total_texts_matched, text);
    assert.deepEqual(b.results, a.results, text);
    assert.equal(b.spelling_note, undefined, text);
    assert.equal(b.english_words_ignored, undefined, text);
  }
});

test('MCP quote styles select the same source passages in all three corpora', async () => {
  const client = new Client({ name: 'curly-quotes-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    for (const [name, args] of [
      ['search_texts', { english: 'off' }],
      ['search_post_canonical', { books: ['vism'] }],
      ['search_commentary', { books: ['s0201a.att.xml'] }],
    ]) {
      const call = async (query) => {
        const result = await client.callTool({ name, arguments: { ...args, query, limit: 50 } });
        assert.ok(!result.isError);
        return JSON.parse(result.content[0].text);
      };
      const expected = await call(straight);
      const actual = await call(curly);
      assert.deepEqual(actual.results, expected.results, name);
      assert.equal(actual.total_matched ?? actual.total_texts_matched, expected.total_matched ?? expected.total_texts_matched, name);
    }
  } finally { await client.close(); }
});
