import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPublic } from '../src/http.mjs';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const url = 'https://www.dhammatalks.org/suttas/MN/MN10.html';

test('a connection failure after headers retries the complete page, discarding partial text', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls > 1) return new Response('complete fixture page');
    let reads = 0;
    return new Response(new ReadableStream({ pull(controller) {
      if (reads++ === 0) controller.enqueue(new TextEncoder().encode('incomplete fixture prefix'));
      else controller.error(new TypeError('terminated fixture connection'));
    } }));
  };
  assert.equal(await fetchPublic(url, { json: false, retries: 1 }), 'complete fixture page');
  assert.equal(calls, 2);
});

test('streaming size rejection cancels the download and never retries', async () => {
  let calls = 0;
  let cancelled = false;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(6 * 1024 * 1024 + 1)); },
      cancel() { cancelled = true; },
    }));
  };
  await assert.rejects(fetchPublic(url, { json: false, retries: 2 }), /6 MB limit/);
  assert.equal(cancelled, true, 'the unused stream must be cancelled');
  assert.equal(calls, 1, 'size errors remain permanent');
});

test('a stream failure exhausts only the configured retries and reports its provider', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('terminated')); } }));
  };
  await assert.rejects(fetchPublic(url, { json: false, retries: 1 }), /dhammatalks.*(?:stream|body|download)/i);
  assert.equal(calls, 2);
});

test('a cancellation failure does not hide the permanent size error or cause retries', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(6 * 1024 * 1024 + 1)); },
      cancel() { throw new Error('fixture cancellation failure'); },
    }));
  };
  await assert.rejects(fetchPublic(url, { json: false, retries: 1 }), /6 MB limit/);
  assert.equal(calls, 1);
});

test('a response within the limit keeps its complete decoded text', async () => {
  const text = 'Pāli fixture: ā ṭ ñ';
  globalThis.fetch = async () => new Response(text);
  assert.equal(await fetchPublic(url, { json: false, retries: 0 }), text);
});
