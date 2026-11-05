import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { verifyQuote, englishScope } from '../src/verify.mjs';
import { liveCache } from '../src/cache.mjs';

// Synthetic English, never represented as scripture outside these fixtures.
const quote = 'This fixture phrase has enough distinctive words to identify the earlier translation clearly';
const args = { text: quote, language: 'english', texts: ['MN 10'] };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; liveCache.clear(); });
const page = (id, extra = {}) => ({ text: quote, translation_id: id, translator: 'Fixture translator', url: 'https://accesstoinsight.org/fixture.html', attribution: 'Fixture attribution', license: 'Fixture licence', notes: [], ...extra });

test('verification names the returned fallback version and retains the requested ID and fallback note', async () => {
  const requested = englishScope(args.texts).pages[0].translation_id;
  const actual = 'ati:/fixture/earlier-version';
  const note = 'Fixture primary unavailable; showing the earlier version from Access to Insight instead.';
  const result = await verifyQuote(args, { fetchTranslation: async (_unit, id) => {
    if (id !== requested) throw new Error('fixture unavailable');
    return page(actual, { notes: [note] });
  } });
  assert.equal(result.verdict, 'found');
  for (const record of [result.matches[0], result.scope.translations_checked[0]]) {
    assert.equal(record.translation_id, actual);
    assert.equal(record.requested_translation_id, requested);
    assert.deepEqual(record.notes, [note]);
  }
  assert.equal(result.matches[0].attribution, 'Fixture attribution');
  assert.equal(result.matches[0].license, 'Fixture licence');
});

test('the same version retains its identity without a false substitution label', async () => {
  const requested = englishScope(args.texts).pages[0].translation_id;
  const note = 'Fixture numbering and archive notice.';
  const result = await verifyQuote(args, { fetchTranslation: async (_unit, id) => {
    if (id !== requested) throw new Error('fixture unavailable');
    return page(id, { notes: [note] });
  } });
  for (const record of [result.matches[0], result.scope.translations_checked[0]]) {
    assert.equal(record.translation_id, requested);
    assert.ok(!Object.hasOwn(record, 'requested_translation_id'));
    assert.deepEqual(record.notes, [note]);
  }
});

test('unretrieved sources retain the requested translation ID for an exact retry', async () => {
  const plan = englishScope(args.texts);
  const requested = plan.pages[0].translation_id;
  const result = await verifyQuote(args, { fetchTranslation: async (_unit, id) => {
    if (id !== requested) throw new Error('fixture unavailable');
    return page(id);
  } });
  assert.ok(result.scope.not_retrieved.length);
  assert.deepEqual(result.scope.not_retrieved.map((p) => p.translation_id), plan.pages.slice(1).map((p) => p.translation_id));
});

test('a total retrieval failure still produces an error rather than a not-found verdict', async () => {
  await assert.rejects(verifyQuote(args, { fetchTranslation: async () => { throw new Error('fixture outage'); } }), /None of the translations.*retrieved/);
});

test('the MCP verifier preserves real provider fallback provenance during an outage', async () => {
  globalThis.fetch = async (url) => new Response(`<body>${quote}</body>`, { status: new URL(url).hostname.includes('dhammatalks') ? 503 : 200 });
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'verify-provenance-fixture', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try {
    const result = await client.callTool({ name: 'verify_quote', arguments: args });
    assert.ok(!result.isError);
    const fallback = result.structuredContent.scope.translations_checked.find((p) => p.requested_translation_id?.startsWith('dt:'));
    assert.ok(fallback, 'scope must declare the substitution');
    assert.match(fallback.translation_id, /^ati:/);
    assert.match(fallback.url, /accesstoinsight/);
    assert.match(fallback.notes.join(' '), /earlier version/);
    const match = result.structuredContent.matches.find((p) => p.translation_id === fallback.translation_id);
    assert.ok(match, 'the matching record must retain the actual version ID too');
    assert.deepEqual(match.notes, fallback.notes);
  } finally { await client.close(); }
});
