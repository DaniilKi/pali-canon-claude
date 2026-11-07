// Produce real MCP widget responses offline. English is conspicuously synthetic test data;
// Pāli comes only from the bundled VRI edition. No publisher is contacted.
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { registerChatgptWidget, WIDGET_HTML, WIDGET_TOOL } from '../src/chatgpt-widget.mjs';
import { liveCache } from '../src/cache.mjs';
import { transliterate } from '../src/script.mjs';

const [a, b] = InMemoryTransport.createLinkedPair();
const server = createServer();
registerChatgptWidget(server);
const client = new Client({ name: 'offline-browser-fixtures', version: '1.0' });
const originalFetch = globalThis.fetch;
const atiText = Array.from({ length: 650 }, (_, i) => `Synthetic browser ATI fixture item ${i}.`).join(' ');
const dtText = Array.from({ length: 650 }, (_, i) => `Synthetic browser primary fixture item ${i}.`).join(' ');
let primaryAvailable = false;
let fetches = 0;
globalThis.fetch = async (url) => {
  fetches += 1;
  const host = new URL(url).hostname;
  if (host === 'www.dhammatalks.org' || host === 'dhammatalks.org') return new Response(`<div id="sutta">${dtText}</div>`, { status: primaryAvailable ? 200 : 503 });
  if (host === 'www.accesstoinsight.org' || host === 'accesstoinsight.org') return new Response(`<body>${atiText}</body>`);
  throw new Error(`Unexpected fixture fetch: ${host}`);
};
const read = async (args) => {
  const response = await client.callTool({ name: WIDGET_TOOL, arguments: args });
  assert.ok(!response.isError, JSON.stringify(response));
  return response.structuredContent;
};
try {
  await Promise.all([client.connect(a), server.connect(b)]);
  const first = await read({ uid: 'MN 10', english: false, limit: 3 });
  const next = await read({ uid: first.text_id, english: false, limit: 3, offset: first.pali.next_offset });
  assert.notEqual(next.pali.segments[0].ref, first.pali.segments[0].ref);
  const fallback = await read({ uid: 'MN 10', limit: 3 });
  assert.ok(fallback.english, fallback.english_error);
  assert.match(fallback.english.translation_id, /^ati:/);
  assert.ok(fallback.english.continue_with);
  primaryAvailable = true;
  const pinned = await read(fallback.english.continue_with.arguments);
  assert.equal(pinned.english.translation_id, fallback.english.translation_id);
  assert.equal(pinned.english.offset, fallback.english.next_offset);
  assert.equal(pinned.english.text, atiText.slice(pinned.english.offset, pinned.english.offset + 6000));
  const unpinned = await read({ uid: 'MN 10', limit: 3, english_offset: fallback.english.next_offset });
  assert.equal(unpinned.english, null);
  assert.match(unpinned.english_error, /translation_id/);
  liveCache.clear();
  const primary = await read({ uid: 'MN 10', limit: 3 });
  assert.match(primary.english.translation_id, /^dt:/);
  liveCache.clear();
  primaryAvailable = false;
  const refused = await read(primary.english.continue_with.arguments);
  assert.equal(refused.english, null);
  assert.match(refused.english_error, /offset|version|continu/i);
  assert.ok(refused.pali.segments.length);
  const sourceFile = await read({ book: 'vin02m1', offset: 6, limit: 1 });
  const sourceNext = await read(sourceFile.pali.continue_with.arguments);
  const exact = await read({ uid: 'MN 10', segment: 'mn10/66' });
  const commentaryFirst = await read({ commentary: 'MN 10', limit: 2 });
  const commentaryNext = await read(commentaryFirst.pali.continue_with.arguments);
  const commentaryDirect = await read({ commentary: 'commentary:s0101a.att.xml', script: 'thai', limit: 2 });
  const commentaryAbsent = await read({ commentary: 'AN 1.9', limit: 2 });
  const commentaryUncertain = await read({ commentary: 'AN 2.1', limit: 2 });
  const beforePostFetches = fetches;
  const postFirst = await read({ uid: 'Vism 1.1', limit: 2 });
  const postNext = await read(postFirst.pali.continue_with.arguments);
  const postNative = await read({ uid: transliterate('Vism 1.1', 'roman', 'sinhala'), script: 'sinh', limit: 2 });
  const postUncertain = await read({ uid: 'Vism 1.2', limit: 2 });
  assert.equal(fetches, beforePostFetches, 'post-canonical widget must not fetch or invent English');
  process.stdout.write(JSON.stringify({ exact, commentary: { first: commentaryFirst, next: commentaryNext, direct: commentaryDirect, absent: commentaryAbsent, uncertain: commentaryUncertain }, source_file: { first: sourceFile, next: sourceNext }, postcanonical: { first: postFirst, next: postNext, native: postNative, uncertain: postUncertain }, html: WIDGET_HTML, fixture: first,
    continuation: { next, fallback, pinned, unpinned, primary, refused }, fixture_fetches: fetches }));
} finally {
  globalThis.fetch = originalFetch;
  liveCache.clear();
  await client.close();
  await server.close();
}
