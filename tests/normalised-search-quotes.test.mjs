import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput } from '../src/input.mjs';
import { searchWithInput } from '../src/english-search.mjs';
import * as canon from '../src/canon.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

test('paired phrase quotes before n are delimiters, not Velthuis letter markers', () => {
  for (const query of ['"namo tassa"', '"nibbana buddha"', '"Namo tassa"', '"namo\ntassa"']) {
    const result = normalizeInput(query);
    assert.equal(result.text, query);
    assert.equal(result.changed, false);
  }
});

test('normalization preserves phrase delimiters while converting words and internal Velthuis markers', () => {
  for (const [query, expected] of [
    ['"nibbaana"', '"nibbāna"'],
    ['"nibbaana sa"nkhaara"', '"nibbāna saṅkhāra"'],
    ['"namo tassa" "nibbaana"', '"namo tassa" "nibbāna"'],
    ['sati "nibbaana" paññā', 'sati "nibbāna" paññā'],
  ]) {
    const result = normalizeInput(query);
    assert.equal(result.text, expected, query);
    assert.equal(result.changed, true);
    assert.ok(result.changes.every((change) => !change.from.startsWith('"nibbaana')), 'do not label the phrase opener as a letter');
  }
  assert.equal(normalizeInput('sa"nkhaara').text, 'saṅkhāra');
  assert.equal(normalizeInput('"naana').text, 'ṅāna', 'an unpaired word-initial Velthuis marker retains its encoding role');
  assert.equal(normalizeInput('"naana "sati buddha"').text, 'ṅāna "sati buddha"');
});

test('canonical input search preserves the literal phrase result and does not broaden a miss', () => {
  for (const query of ['"namo tassa"', '"nibbana buddha"']) {
    const expected = canon.search(query, { limit: 10000 });
    const result = searchWithInput(query, { english: 'off', limit: 10000 });
    assert.equal(result.total_texts_matched, expected.total_texts_matched, query);
    assert.deepEqual(result.results, expected.results, query);
    assert.equal(result.spelling_note, undefined);
    assert.equal(result.input_normalised, undefined);
  }
});

test('MCP search treats straight and curly n-initial phrases identically across all three corpora', async () => {
  const client = new Client({ name: 'normalised-phrase-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    for (const [name, extra] of [['search_texts', { english: 'off' }],
      ['search_post_canonical', { books: ['vism'] }], ['search_commentary', { books: ['s0201a.att.xml'] }]]) {
      const call = async (query) => {
        const response = await client.callTool({ name, arguments: { query, ...extra, limit: 50 } });
        assert.ok(!response.isError);
        return JSON.parse(response.content[0].text);
      };
      const expected = await call('“namo tassa”');
      const actual = await call('"namo tassa"');
      assert.deepEqual(actual.results, expected.results, name);
      assert.equal(actual.total_matched ?? actual.total_texts_matched, expected.total_matched ?? expected.total_texts_matched, name);
      assert.equal(actual.input_normalised, undefined, name);
    }
  } finally { await client.close(); }
});
