import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { findCitations } from '../src/find-citations.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const links = Object.entries(canon.load().translations).flatMap(([id, entries]) => entries
  .filter((link) => link.source === 'anandajoti').map((link) => ({ id, ...link })));
const landings = links.map((link) => ({ id: link.id, url: new URL(link.url).href }));
const parts = links.flatMap((link) => (link.parts || []).map((path) => ({ id: link.id, url: new URL(path, canon.ANANDAJOTI_BASE).href })));
function checkPages(pages) {
  const text = pages.map((page) => page.url).join('; ');
  const result = findCitations(text, canon);
  assert.equal(result.found, pages.length);
  assert.equal(result.unresolved, 0);
  assert.deepEqual(result.citations.map((hit) => [hit.text, hit.text_id]), pages.map((page) => [page.url, page.id]));
  for (const hit of result.citations) {
    assert.equal(hit.scheme, 'link');
    assert.equal(text.slice(hit.start, hit.end), hit.text);
  }
}

test('every bundled ABT landing link is discovered with its existing canonical mapping', () => {
  assert.ok(landings.length);
  checkPages(landings);
});

test('every bundled ABT part link is discovered, including an encoded space in its path', () => {
  assert.ok(parts.length);
  assert.ok(parts.some((page) => /%20/u.test(page.url)), 'exercise URL-encoded source path');
  checkPages(parts);
});

test('ABT links retain URL boundaries, host checks and unresolved-path reporting', () => {
  const known = landings[0];
  const www = known.url.replace('https://', 'https://www.');
  const text = `📚 (${www}?view=1#passage), ${known.url}; https://ancient-buddhist-texts.net/Texts-and-Translations/Unknown-Page.htm.`;
  const result = findCitations(text, canon);
  assert.deepEqual(result.citations.map((hit) => hit.status), ['resolved', 'resolved', 'unresolved']);
  assert.equal(result.citations[0].text_id, known.id);
  assert.equal(result.citations[1].text_id, known.id);
  for (const hit of result.citations) assert.equal(text.slice(hit.start, hit.end), hit.text);
  assert.match(result.citations[2].reason, /not linked/);
  const spoofed = [known.url.replace('ancient-buddhist-texts.net', 'ancient-buddhist-texts.net.evil.example'),
    known.url.replace('ancient-buddhist-texts.net', 'ancient-buddhist-texts.net@evil.example')];
  assert.deepEqual(findCitations(spoofed.join(' '), canon).citations, []);
  const wrongCase = known.url.replace('/Texts-and-Translations/', '/texts-and-translations/');
  assert.equal(findCitations(wrongCase, canon).citations[0].status, 'unresolved', 'never repair a case-sensitive source path');
});

test('MCP citation scanning recognises ABT landing and encoded part links offline', async () => {
  const client = new Client({ name: 'abt-citation-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    const pages = [landings[0], parts.find((page) => /%20/u.test(page.url))];
    const response = await client.callTool({ name: 'find_citations', arguments: { text: pages.map((page) => page.url).join('; ') } });
    assert.ok(!response.isError);
    const result = JSON.parse(response.content[0].text);
    assert.deepEqual(result.citations.map((hit) => [hit.text, hit.text_id]), pages.map((page) => [page.url, page.id]));
  } finally { await client.close(); }
});
