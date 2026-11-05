import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readPassage, REDIRECT_DOMAINS } from '../src/chatgpt-widget.mjs';
import * as canon from '../src/canon.mjs';
import { liveCache } from '../src/cache.mjs';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; liveCache.clear(); });
const atiText = 'ATI fixture content. '.repeat(600);
const dtText = 'Dhammatalks fixture content. '.repeat(600);
function sources(dtAvailable) {
  globalThis.fetch = async (url) => {
    const host = new URL(url).hostname;
    if (host.includes('dhammatalks')) return new Response(`<div id="sutta">${dtText}</div>`, { status: dtAvailable ? 200 : 503 });
    return new Response(`<body>${atiText}</body>`, { status: 200 });
  };
}

test('the reader declares every supported translation source as a trusted link destination', () => {
  const origins = new Set(Object.values(canon.load().translations).flat().map((link) => new URL(link.url).origin));
  for (const origin of origins) assert.ok(REDIRECT_DOMAINS.includes(origin), `Missing source origin ${origin}`);
});

test('English continuation requires an exact translation ID and offers pinned continuation arguments', async () => {
  sources(false);
  const first = await readPassage({ uid: 'MN 10', englishCharacters: 100 });
  assert.match(first.english.translation_id, /^ati:/, 'fixture starts on the outage fallback');
  sources(true);
  const unpinned = await readPassage({ uid: 'MN 10', english_offset: first.english.next_offset, englishCharacters: 100 });
  assert.equal(unpinned.english, null, 'a recovered primary must not silently take the fallback offset');
  assert.match(unpinned.english_error, /translation_id/);
  assert.equal(first.english.continue_with.arguments.translation, first.english.translation_id);
  const next = await readPassage(first.english.continue_with.arguments);
  assert.equal(next.english.translation_id, first.english.translation_id);
  assert.equal(next.english.offset, first.english.next_offset);
  assert.ok(next.english.text.startsWith(atiText.slice(first.english.next_offset, first.english.next_offset + 50)));
});

test('a pinned English continuation refuses an outage fallback to another version', async () => {
  sources(true);
  const first = await readPassage({ uid: 'MN 10', englishCharacters: 100 });
  assert.match(first.english.translation_id, /^dt:/);
  liveCache.clear(); // Equivalent to another stateless host or an evicted response.
  sources(false);
  const next = await readPassage({ uid: 'MN 10', translation: first.english.translation_id, english_offset: first.english.next_offset, englishCharacters: 100 });
  assert.equal(next.english, null);
  assert.match(next.english_error, /continu|version|offset/i);
});
