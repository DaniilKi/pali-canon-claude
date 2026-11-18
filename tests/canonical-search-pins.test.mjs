import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import { transliterate } from '../src/script.mjs';
import { sourceQuoteFixtures } from '../scripts/evidence/source-quotes.mjs';

let client;
before(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: 'canonical-search-pins-test', version: '1' });
  await Promise.all([createServer().connect(b), client.connect(a)]);
});
after(async () => { await client?.close(); });
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result.content));
  return result.structuredContent;
}
const phrase = segment => '"' + segment.text.split(/\s+/u).slice(0, 8).join(' ') + '"';
const selection = (query, extra = {}) => ({ query, offset: 0, limit: 10, collection: null, script: 'roman', english: 'auto', include_post_canonical: false, ...extra });
async function assertReadingSources(data) {
  assert.deepEqual(data.source, canon.source());
  for (const hit of [...data.title_matches, ...data.results, ...(data.english_expansion_results?.results || [])]) {
    const { tool, ...args } = hit.read_with;
    assert.equal(tool, 'get_text'); assert.equal(args.uid, hit.id);
    const reading = await call(tool, { ...args, limit: args.limit ?? 1 });
    assert.deepEqual(hit.source, reading.source, hit.id);
    assert.equal(reading.text_id, hit.id);
    if (hit.segment_ref) {
      assert.equal(reading.segments[0].ref, hit.segment_ref);
      assert.equal(reading.offset, args.offset);
      const { tool: contextTool, ...contextArgs } = hit.context_with;
      const context = await call(contextTool, contextArgs);
      assert.deepEqual(context.source, hit.source);
      assert.ok(context.segments.some(segment => segment.ref === hit.segment_ref));
    } else {
      assert.equal(Object.hasOwn(hit, 'segment_ref'), false, 'A title has no invented paragraph reference');
      assert.deepEqual(Object.keys(args).sort(), args.script ? ['script', 'uid'] : ['uid']);
    }
  }
}

test('canonical search adds actual edition provenance without changing title/body commands or pagination', async () => {
  const full = canon.search('metta', { limit: 50 });
  assert.deepEqual(full.source, canon.source());
  const first = canon.search('metta', { limit: 15 }), second = canon.search('metta', { limit: 15, offset: 15 });
  assert.deepEqual([...first.title_matches, ...second.title_matches].map(hit => hit.id), full.title_matches.map(hit => hit.id));
  assert.deepEqual([...first.results, ...second.results].map(hit => hit.id), full.results.slice(0, 30).map(hit => hit.id));
  assert.equal(first.total_title_matches, full.total_title_matches); assert.equal(first.total_texts_matched, full.total_texts_matched);
  assert.equal(first.title_next_offset, 15); assert.equal(second.title_next_offset, null); assert.equal(second.next_offset, 30);
  const actual = await call('search_texts', { query: 'satipaṭṭhāna', english: 'off', limit: 3 });
  await assertReadingSources(actual);
  assert.deepEqual(actual.selection, selection('satipaṭṭhāna', { limit: 3, english: 'off' }));
});

test('repaired SN 12.21 title and exact body hits carry mapping revision matching get_text', async () => {
  const unit = canon.resolve('sn12.21').unit;
  const title = await call('search_texts', { query: 'dasabala', collection: 'sn12.21', english: 'off', limit: 1 });
  assert.equal(title.title_matches[0].id, unit.id);
  assert.match(title.title_matches[0].source.locator_revision, /-sn-dasabala-v1$/);
  assert.equal(Object.hasOwn(title.source, 'locator_revision'), false, 'Global provenance is not one hit’s citation mapping');
  await assertReadingSources(title);
  const query = phrase(canon.segments(unit).find(segment => segment.type !== 'heading'));
  const found = await call('search_texts', { query, english: 'off', limit: 10 });
  const hit = found.results.find(row => row.id === unit.id);
  assert.ok(hit); assert.equal(hit.segment_ref, 'sn12.21/3'); assert.equal(hit.read_with.offset, 2);
  assert.deepEqual(hit.source, canon.readingSource(unit));
  assert.notEqual(hit.source.locator_revision, hit.source.commit);
  await assertReadingSources(found);
});

test('exact approximate and grouped scopes preserve their existing alignment cautions and source pins', async () => {
  for (const id of ['sn35.34', 'an1.296-305']) {
    const unit = canon.resolve(id).unit;
    const query = phrase(canon.segments(unit).find(segment => segment.type !== 'heading'));
    const direct = canon.search(query, { collection: id, limit: 3 });
    const actual = await call('search_texts', { query, collection: id, english: 'off', limit: 3 });
    for (const key of ['scope_alignment', 'scope_resolution', 'scope_source_span']) assert.deepEqual(actual[key], direct[key]);
    assert.deepEqual(actual.results.map(hit => [hit.id, hit.approximate, hit.alignment, hit.read_with, hit.context_with, hit.segment_ref]), direct.results.map(hit => [hit.id, hit.approximate, hit.alignment, hit.read_with, hit.context_with, hit.segment_ref]));
    assert.ok(actual.results.length); await assertReadingSources(actual);
  }
});

test('selection echoes schema-validated native input and canonical output-script aliases before conversion', async () => {
  const native = transliterate('mettā', 'roman', 'sinhala');
  const data = await call('search_texts', { query: '  ' + native + '  ', collection: 'mn', script: 'mymr', english: 'off', offset: 1, limit: 2 });
  assert.deepEqual(data.selection, selection(native, { collection: 'mn', script: 'myanmar', english: 'off', offset: 1, limit: 2 }));
  assert.equal(data.input_script, 'sinhala'); assert.equal(data.input_romanized, 'mettā'); assert.equal(data.script, 'myanmar');
  assert.notEqual(data.selection.query, data.query); await assertReadingSources(data);
  for (const hit of [...data.title_matches, ...data.results]) assert.equal(hit.read_with.script, 'myanmar');
});

test('English expansion, keyboard inference and quoted source wrappers keep input selection and source evidence', async () => {
  const english = await call('search_texts', { query: 'mindfulness of breathing', english: 'only', limit: 2 });
  assert.deepEqual(english.selection, selection('mindfulness of breathing', { english: 'only', limit: 2 }));
  assert.ok(english.expanded_from_english); assert.ok(english.results.length); await assertReadingSources(english);
  const keyboard = await call('search_texts', { query: 'satipatthaana', english: 'off', limit: 2 });
  assert.equal(keyboard.selection.query, 'satipatthaana'); assert.ok(keyboard.input_normalised); await assertReadingSources(keyboard);
  const source = sourceQuoteFixtures().find(fixture => fixture.text.includes('ऋ'));
  const query = '"' + source.text + '"';
  const quoted = await call('search_texts', { query, collection: 'ne37', limit: 1 });
  assert.deepEqual(quoted.selection, selection(query, { collection: 'ne37', limit: 1 }));
  assert.equal(quoted.query_mode, 'source_phrase'); assert.equal(quoted.expanded_from_english, undefined); await assertReadingSources(quoted);
});

test('post-canonical option paths preserve canonical selection and provenance without labelling later results as canon', async () => {
  const scoped = await call('search_texts', { query: 'dhamma', collection: 'sn1', include_post_canonical: true, limit: 1 });
  assert.deepEqual(scoped.selection, selection('dhamma', { collection: 'sn1', include_post_canonical: true, limit: 1 }));
  assert.equal(scoped.post_canonical.searched, false); assert.equal(scoped.post_canonical.canonical, false); await assertReadingSources(scoped);
  const mixed = await call('search_texts', { query: 'Namo tassa', include_post_canonical: true, limit: 1 });
  assert.deepEqual(mixed.selection, selection('Namo tassa', { include_post_canonical: true, limit: 1 }));
  assert.equal(mixed.post_canonical.canonical, false); assert.ok(mixed.post_canonical.results.length); assert.notEqual(mixed.post_canonical.source.name, mixed.source.name);
  await assertReadingSources(mixed);
});
