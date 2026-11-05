import { test, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { liveCache } from '../src/cache.mjs';

// Handwritten citations exercise native digits and letters independently of the transliterator.
const examples = [
  ['thai', 'MN ๑๐', 'mn10', 'MN 10'],
  ['myanmar', 'MN ၁၀', 'mn10', 'MN 10'],
  ['devanagari', 'MN १०', 'mn10', 'MN 10'],
  ['khmer', 'MN ១០', 'mn10', 'MN 10'],
  ['lao', 'MN ໑໐', 'mn10', 'MN 10'],
  ['lanna', 'MN ᪑᪐', 'mn10', 'MN 10'],
  ['sinhala', 'ධම්මපද 183', 'dhp183', 'dhammapada 183'],
];
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; liveCache.clear(); });
function sources() {
  globalThis.fetch = async () => new Response(`<div id="sutta">${'English fixture content. '.repeat(800)}</div>`);
}
let client;
before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'reader-script-input-fixture', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
});
after(async () => { await client?.close(); });
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result.content));
  return result.structuredContent;
}
function checkInput(result, [script, , id, roman]) {
  assert.equal(result.text_id ?? result.id, id);
  assert.equal(result.input_script, script);
  assert.equal(result.input_romanized, roman);
}

test('metadata accepts the same seven-script citations as the Pāli reader and labels normalization', async () => {
  for (const example of examples) {
    const pali = await call('get_text', { uid: example[1], limit: 1 });
    checkInput(pali, example);
    checkInput(await call('get_metadata', { uid: example[1] }), example);
  }
});

test('English reading accepts native citations without transliterating the English', async () => {
  sources();
  for (const example of examples) {
    const result = await call('get_translation', { uid: example[1], limit: 500 });
    checkInput(result, example);
    assert.match(result.text, /^English fixture content/);
    assert.equal(result.continue_with.arguments.uid, example[2]);
    assert.equal(result.continue_with.arguments.translation, result.translation_id);
  }
});

test('translation comparison accepts native citations and preserves English and translation IDs', async () => {
  sources();
  for (const example of examples) {
    const metadata = await call('get_metadata', { uid: example[2] });
    const id = metadata.english[0].translation_id;
    const result = await call('compare_translations', { uid: example[1], translations: [id], limit: 500 });
    checkInput(result, example);
    assert.equal(result.editions[0].translation_id, id);
    assert.match(result.editions[0].text, /^English fixture content/);
  }
});

test('the hosted reader accepts native citations with the same canonical identity', async () => {
  for (const example of examples) checkInput(await readPassage({ uid: example[1], english: false, limit: 1 }), example);
});

test('Roman reading input stays unlabelled and malformed native citations remain errors', async () => {
  sources();
  for (const name of ['get_metadata', 'get_translation', 'compare_translations']) {
    const result = await call(name, { uid: 'MN 10' });
    assert.ok(!Object.hasOwn(result, 'input_script'));
    const invalid = await client.callTool({ name, arguments: { uid: 'MN ๙๙๙' } });
    assert.equal(invalid.isError, true);
  }
  const widget = await readPassage({ uid: 'MN 10', english: false });
  assert.ok(!Object.hasOwn(widget, 'input_script'));
});
