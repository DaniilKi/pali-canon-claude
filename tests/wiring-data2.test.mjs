// Integration of the data-lane features into the live server (#20, #21, #22): get_text commentary, the
// resolve_reference post-canonical fallback, search_texts include_post_canonical and analyse_passage, all
// exercised through the MCP protocol as a client sees them.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { expectedToolNames } from '../scripts/expected-tools.mjs';

let client;
before(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'wiring-data2-test', version: '1.0.0' });
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
});
after(async () => { await client?.close(); });

const call = async (name, args) => {
  const r = await client.callTool({ name, arguments: args });
  return { error: !!r.isError, body: JSON.parse(r.content[0].text) };
};

test('the new tools are live, read-only and offline', async () => {
  const { tools } = await client.listTools();
  const byName = new Map(tools.map((t) => [t.name, t]));
  assert.deepEqual([...byName.keys()].sort(), expectedToolNames());
  for (const name of ['get_commentary', 'get_post_canonical', 'search_post_canonical', 'analyse_passage']) {
    const t = byName.get(name);
    assert.ok(t, `${name} is listed`);
    assert.equal(t.annotations.readOnlyHint, true, name);
    assert.equal(t.annotations.destructiveHint, false, name);
    assert.equal(t.annotations.openWorldHint, false, name);
  }
  assert.ok(byName.get('get_text').inputSchema.properties.commentary, 'get_text has commentary');
  assert.ok(byName.get('search_texts').inputSchema.properties.include_post_canonical, 'search_texts has include_post_canonical');
});

test('get_text commentary: true adds the labelled commentary; default leaves it out', async () => {
  const plain = await call('get_text', { uid: 'MN 10', limit: 2 });
  assert.equal(plain.error, false);
  assert.equal(plain.body.commentary, undefined);
  const { error, body } = await call('get_text', { uid: 'MN 10', limit: 2, commentary: true });
  assert.equal(error, false);
  assert.equal(body.text_id, 'mn10');
  assert.equal(body.returned, 2, 'the Pāli page is unchanged');
  const c = body.commentary;
  assert.equal(c.available, true);
  assert.match(c.label, /Commentary \(Aṭṭhakathā\), not the canon/);
  assert.match(c.commentary, /Papañcasūdanī/);
  assert.ok(c.segments.length > 0 && c.segments.length <= 20);
  assert.ok(c.segments.some((s) => /Satipaṭṭhānasuttavaṇṇanā/.test(s.text)));
  assert.equal(c.text_id, 'mn10');
});

test('get_text commentary: true on a text the commentary passes over says so instead of guessing', async () => {
  const { error, body } = await call('get_text', { uid: 'AN 1.9', limit: 1, commentary: true });
  assert.equal(error, false);
  assert.equal(body.commentary.available, false);
  assert.deepEqual(body.commentary.segments, []);
});

test('resolve_reference falls back to the post-canonical books only when the canon fails', async () => {
  for (const ref of ['Vism 1.1', 'mahavamsa 3', 'Abhidh-s 1']) {
    const { error, body } = await call('resolve_reference', { reference: ref });
    assert.equal(error, false, ref);
    assert.equal(body.canonical, false, ref);
    assert.equal(body.read_with.tool, 'get_post_canonical', ref);
  }
  // Canon citations are never shadowed.
  const mn = await call('resolve_reference', { reference: 'MN 10' });
  assert.equal(mn.body.text_id ?? mn.body.id, 'mn10');
  assert.notEqual(mn.body.canonical, false);
  // An unknown citation is still an error, not a post-canonical guess.
  const bad = await call('resolve_reference', { reference: 'MN 999' });
  assert.equal(bad.error, true);
  // Vism PTS pages are recognised and refused (no concordance), never located by guessing.
  const pts = await call('resolve_reference', { reference: 'Vism p. 3' });
  assert.equal(pts.error, true);
  assert.match(pts.body.error, /PTS/);
});

test('search_texts include_post_canonical adds a separate, labelled result list', async () => {
  const plain = await call('search_texts', { query: 'kasiṇa', limit: 3 });
  assert.equal(plain.error, false);
  assert.equal(plain.body.post_canonical, undefined);
  const { error, body } = await call('search_texts', { query: 'kasiṇa', limit: 3, include_post_canonical: true });
  assert.equal(error, false);
  assert.deepEqual(body.results, plain.body.results, 'the canon results are unchanged');
  assert.ok(body.post_canonical, 'post_canonical present');
  assert.equal(body.post_canonical.error, undefined);
  const hits = body.post_canonical.results;
  assert.ok(Array.isArray(hits) && hits.length > 0);
  for (const h of hits) assert.equal(h.canonical, false);
});

test('analyse_passage answers word by word over the protocol, with the DPD licence', async () => {
  const { error, body } = await call('analyse_passage', { uid: 'Dhp 183', limit: 5 });
  assert.equal(error, false);
  assert.ok(Array.isArray(body.words) && body.words.length > 0 && body.words.length <= 5);
  assert.match(JSON.stringify(body), /CC BY-NC-SA 4\.0/);
});
