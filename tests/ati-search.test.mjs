// Deterministic coverage of the index failover path behind source-health issue #107.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchMirrors } from '../src/http.mjs';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
let instance = 0;
const freshSearch = async () => (await import(`../src/providers.mjs?ati-test=${++instance}`)).searchAti;
const sutta = '<body><li>Metta <a href="/tipitaka/kn/snp/snp.1.08.than.html">Good Will</a></li></body>';
const subject = '<body><dt>Metta</dt><dd><a href="/tipitaka/kn/khp/khp.9.budd.html">Good Will</a></dd></body>';

function stub(statusFor) {
  const calls = [];
  globalThis.fetch = async (value) => {
    const url = new URL(value);
    calls.push(url.href);
    const status = statusFor(url, calls);
    return new Response(url.pathname.endsWith('index-sutta.html') ? sutta : subject, { status });
  };
  return calls;
}

test('ATI search retries a transient CDN failure when the site and GitHub raw are unavailable', async () => {
  const attempts = new Map();
  const calls = stub((url) => {
    if (url.hostname !== 'cdn.jsdelivr.net') return 404;
    const count = (attempts.get(url.pathname) || 0) + 1;
    attempts.set(url.pathname, count);
    return count === 1 ? 503 : 200;
  });
  const search = await freshSearch();
  const result = await search({ query: 'metta' });
  assert.equal(result.total_index_matches, 2);
  assert.ok(result.results.every((r) => r.canon_text_id));
  assert.equal(result.index_sources.sutta, 'https://cdn.jsdelivr.net/gh/bcbsit/ati@main/index-sutta.html');
  assert.equal(result.index_sources.subject, 'https://cdn.jsdelivr.net/gh/bcbsit/ati@main/index-subject.html');
  assert.match(result.note, /mirror/);
  assert.doesNotMatch(result.note, /official GitHub mirror/);
  assert.deepEqual([...attempts.values()], [2, 2]);
  const count = calls.length;
  await search({ query: 'metta', limit: 1 });
  assert.equal(calls.length, count, 'successful indexes are cached');
});

test('ATI search reports each exhausted index and every mirror failure, then allows recovery', async () => {
  const calls = stub(() => 404);
  const search = await freshSearch();
  await assert.rejects(search({ query: 'metta' }), (error) => {
    for (const path of ['/index-sutta', '/index-subject']) assert.ok(error.message.includes(path));
    assert.match(error.message, /cdn\.jsdelivr\.net.*HTTP 404/);
    assert.match(error.message, /raw\.githubusercontent\.com.*HTTP 404/);
    return true;
  });
  assert.equal(calls.length, 8, 'permanent HTTP errors are not retried');
  stub(() => 200);
  const result = await search({ query: 'metta' });
  assert.equal(result.total_index_matches, 2, 'failed index loads are not cached');
  assert.equal(result.note, undefined);
});

test('ATI search identifies the failing index without claiming both indexes failed', async () => {
  stub((url) => url.pathname.endsWith('index-sutta.html') ? 200 : 404);
  const search = await freshSearch();
  await assert.rejects(search({ query: 'metta' }), (error) => {
    assert.match(error.message, /\/index-subject/);
    assert.doesNotMatch(error.message, /\/index-sutta/);
    return true;
  });
});

test('ATI search records provenance independently when indexes come from different hosts', async () => {
  stub((url) => url.hostname === 'cdn.jsdelivr.net' || url.pathname.endsWith('index-sutta.html') ? 200 : 404);
  const search = await freshSearch();
  const result = await search({ query: 'metta' });
  assert.equal(result.index_sources.sutta, 'https://accesstoinsight.org/index-sutta.html');
  assert.equal(result.index_sources.subject, 'https://cdn.jsdelivr.net/gh/bcbsit/ati@main/index-subject.html');
  assert.match(result.note, /Some.*indexes.*mirrors/);
});

test('ATI index retries are bounded if the CDN stays unavailable', async () => {
  const calls = stub((url) => url.hostname === 'cdn.jsdelivr.net' ? 503 : 404);
  const search = await freshSearch();
  await assert.rejects(search({ query: 'metta' }), /HTTP 503/);
  assert.equal(calls.filter((url) => new URL(url).hostname === 'cdn.jsdelivr.net').length, 4);
});

test('fetchMirrors retains one attempt per backup unless retries are requested', async () => {
  const urls = ['https://accesstoinsight.org/index-sutta.html', 'https://cdn.jsdelivr.net/gh/bcbsit/ati@main/index-sutta.html'];
  const calls = stub((url) => url.hostname === 'cdn.jsdelivr.net' ? 503 : 404);
  await assert.rejects(fetchMirrors(urls), /HTTP 503/);
  assert.deepEqual(calls, urls);
});
