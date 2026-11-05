import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as english from '../src/english.mjs';
import * as canon from '../src/canon.mjs';
import { liveCache } from '../src/cache.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; liveCache.clear(); });
const unit = canon.resolve('MN 10').unit;
const atiText = 'ATI earlier-version fixture. '.repeat(600);
const dtText = 'Dhammatalks revised-version fixture. '.repeat(600);
function sources(dtStatus = 200, atiStatus = 200) {
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    const dt = new URL(url).hostname.includes('dhammatalks');
    return new Response(dt ? `<div id="sutta">${dtText}</div>` : `<body>${atiText}</body>`, { status: dt ? dtStatus : atiStatus });
  };
  return requests;
}

test('translation continuation rejects a default or translator-name offset before fetching', async () => {
  const requests = sources();
  for (const which of [undefined, 'Thanissaro', 'default']) {
    await assert.rejects(english.translation(unit, which, { offset: 500 }), /continu.*translation_id/i);
  }
  assert.equal(requests.length, 0);
});

test('a primary outage cannot apply a pinned offset to the earlier ATI version', async () => {
  sources();
  const first = await english.translation(unit, undefined, { limit: 500 });
  liveCache.clear();
  const requests = sources(503);
  await assert.rejects(english.translation(unit, first.translation_id, { offset: first.next_offset, limit: 500 }), /continu.*version|version.*continu/i);
  assert.ok(requests.every((url) => new URL(url).hostname.includes('dhammatalks')), 'no different version is fetched for continuation');
});

test('first-page fallback remains labelled and offers an exact continuation after primary recovery', async () => {
  sources(503);
  const first = await english.translation(unit, undefined, { limit: 500 });
  assert.match(first.translation_id, /^ati:/);
  assert.match(first.notes.join(' '), /earlier version/);
  assert.deepEqual(first.continue_with, { name: 'get_translation', arguments: { uid: unit.id, translation: first.translation_id, offset: 500, limit: 500 } });
  sources();
  const args = first.continue_with.arguments;
  const next = await english.translation(canon.resolve(args.uid).unit, args.translation, args);
  assert.equal(next.translation_id, first.translation_id);
  assert.equal(next.text, atiText.slice(500, 1000));
  assert.equal(next.offset, first.next_offset);
});

test('pinned ATI continuation can use an archive mirror of the same version', async () => {
  const id = english.available(unit).find((item) => item.translation_id.startsWith('ati:')).translation_id;
  globalThis.fetch = async (url) => new Response(`<body>${atiText}</body>`, { status: new URL(url).hostname === 'accesstoinsight.org' ? 503 : 200 });
  const next = await english.translation(unit, id, { offset: 500, limit: 500 });
  assert.equal(next.translation_id, id);
  assert.equal(next.text, atiText.slice(500, 1000));
  assert.match(next.fetched_from, /GitHub/);
});

test('terminal translation pages offer no continuation', async () => {
  sources();
  const last = await english.translation(unit, undefined, { limit: dtText.length + 1 });
  assert.equal(last.next_offset, null);
  assert.equal(last.continue_with, null);
});

test('MCP clients can continue attached English and receive explicit errors for unsafe offsets', async () => {
  sources();
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'translation-continuation-fixture', version: '1' });
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
  try {
    const first = await client.callTool({ name: 'get_text', arguments: { uid: 'MN 10', limit: 1, translation: 'default' } });
    const englishPage = first.structuredContent.english;
    assert.ok(englishPage.continue_with);
    const next = await client.callTool(englishPage.continue_with);
    assert.ok(!next.isError);
    assert.equal(next.structuredContent.translation_id, englishPage.translation_id);
    assert.equal(next.structuredContent.offset, englishPage.next_offset);
    const invalid = await client.callTool({ name: 'get_translation', arguments: { uid: 'MN 10', offset: 500 } });
    assert.equal(invalid.isError, true);
    assert.match(JSON.parse(invalid.content[0].text).error, /continu.*translation_id/i);
  } finally { await client.close(); }
});
