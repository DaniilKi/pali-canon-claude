import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { lookupPali } from '../src/providers.mjs';
import { liveCache } from '../src/cache.mjs';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; liveCache.clear(); });
const valid = { summary_html: '<p class="summary">Fixture dictionary entry</p>', dpd_html: '<p>Fixture dictionary detail</p>' };
const serve = (value) => { globalThis.fetch = async () => Response.json(value); };

test('malformed successful JSON responses use the labelled offline dictionary rather than crashing or implying no entry', async () => {
  for (const value of [null, [], true, 42, 'unavailable', {}, { error: 'busy' }, { ...valid, summary_html: [] }, { ...valid, dpd_html: {} }]) {
    serve(value);
    const result = await lookupPali({ word: 'dhammo', limit: 2 });
    assert.equal(result.offline, true, JSON.stringify(value));
    assert.equal(result.entries.length, 2);
    assert.match(result.note, /unusable.*response/i);
    assert.equal(result.license.name, 'CC BY-NC-SA 4.0');
  }
});

test('a bad response is never cached and the next live lookup can recover', async () => {
  let calls = 0;
  globalThis.fetch = async () => Response.json(++calls === 1 ? null : valid);
  const first = await lookupPali({ word: 'dhammo' });
  assert.equal(first.offline, true);
  const recovered = await lookupPali({ word: 'dhammo' });
  assert.ok(!recovered.offline);
  assert.deepEqual(recovered.entries, ['Fixture dictionary entry']);
  await lookupPali({ word: 'dhammo' });
  assert.equal(calls, 2, 'only the valid response may be reused');
});

test('valid empty results remain live empty results and retain the existing licence fallback', async () => {
  serve({ summary_html: '', dpd_html: '' });
  const result = await lookupPali({ word: 'qqqxyz' });
  assert.ok(!result.offline);
  assert.deepEqual(result.entries, []);
  assert.equal(result.total_summary_entries, 0);
  assert.equal(result.license.name, 'CC BY-NC-SA 4.0');
});

test('malformed supplied licence metadata cannot produce an unattributed live result', async () => {
  for (const license of ['terms', [], {}, { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' }]) {
    serve({ ...valid, license });
    const result = await lookupPali({ word: 'dhammo', limit: 1 });
    assert.equal(result.offline, true);
    assert.match(result.note, /unusable.*response/i);
    assert.ok(result.license.attribution);
  }
});

test('a valid live entry preserves the source licence and attribution exactly', async () => {
  const license = { name: 'CC BY-NC-SA 4.0', url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', attribution: 'Fixture DPD attribution', note: 'Fixture licence notice' };
  serve({ ...valid, license });
  const result = await lookupPali({ word: 'dhammo' });
  assert.ok(!result.offline);
  assert.deepEqual(result.entries, ['Fixture dictionary entry']);
  assert.deepEqual(result.license, license);
  assert.equal(result.attribution, license.attribution);
});

test('the MCP lookup distinguishes fallback success from an unavailable unknown entry', async () => {
  serve(null);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'dictionary-response-fixture', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
  try {
    const known = await client.callTool({ name: 'lookup_pali', arguments: { word: 'dhammo', limit: 1 } });
    assert.ok(!known.isError);
    assert.equal(known.structuredContent.offline, true);
    const missing = await client.callTool({ name: 'lookup_pali', arguments: { word: 'qqqxyz' } });
    assert.equal(missing.isError, true);
    const error = JSON.parse(missing.content[0].text).error;
    assert.match(error, /unusable.*response/i);
    assert.match(error, /not in the bundled offline subset/);
    assert.doesNotMatch(error, /Cannot read properties|TypeError/);
  } finally { await client.close(); }
});
