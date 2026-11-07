import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import * as post from '../src/postcanonical.mjs';
import * as commentary from '../src/commentary.mjs';
import * as english from '../src/english.mjs';
import { transliterate } from '../src/script.mjs';
import { auditReaderErrors } from '../scripts/evidence/reader-contracts.mjs';
import { auditStudyScripts, expectedSegments } from '../scripts/evidence/study-scripts.mjs';

async function session(run) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'study-reader-contracts', version: '1' }), server = createServer();
  const call = async (name, args) => { const r = await client.callTool({ name, arguments: args }); assert.ok(!r.isError, JSON.stringify(r.content)); return JSON.parse(r.content[0].text); };
  try { await Promise.all([client.connect(a), server.connect(b)]); await run(client, call); }
  finally { await client.close(); await server.close(); }
}

test('blank translation selectors never silently select or fetch another version', async () => {
  const previous = globalThis.fetch; let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw Error('Unexpected fetch'); };
  try {
    for (const value of ['', ' ', '\n\t']) await assert.rejects(english.translation(canon.resolve('MN 10').unit, value), /empty or blank/);
    assert.equal(attempts, 0);
  } finally { globalThis.fetch = previous; }
});

test('reader/search error contracts reject invalid selectors and recover on valid calls', async () => session(async (client, call) => {
  const counts = await auditReaderErrors(client, call);
  assert.equal(counts.tools, 10); assert.equal(counts.rejected_requests, 54); assert.equal(counts.recovery_reads, 8);
}));

test('native study readers and search commands retain exact source spans across all scripts', async () => session(async (_client, call) => {
  const counts = await auditStudyScripts(call);
  assert.equal(counts.scripts, 8); assert.equal(counts.search_cases, 24); assert.equal(counts.exact_reads, 40);
}));

test('all 109 post-canonical first pages keep source identity in Thai output', async () => session(async (_client, call) => {
  for (const book of post.load().books) {
    const expected = await post.getText(book.id, { limit: 1 });
    const page = await call('get_post_canonical', { citation: book.id, limit: 1, script: 'thai' });
    assert.deepEqual(page.segments, expectedSegments(expected.segments, 'thai'));
    assert.deepEqual(page.source, expected.source); assert.equal(page.book.id, book.id); assert.equal(page.canonical, false);
  }
}));

test('native script queries preserve source-book scope across all 47 commentary books', async () => session(async (_client, call) => {
  for (const book of commentary.load().books) {
    const word = commentary.bookSegments(book).map(s => s.text.match(/[a-zāīūṅñṭḍṇḷṃ]{4,}/iu)?.[0]).find(Boolean);
    const args = { query: word, books: [book.file], limit: 1 };
    const base = await call('search_commentary', args);
    const native = await call('search_commentary', { ...args, query: transliterate(word, 'roman', 'thai'), script: 'thai' });
    assert.ok(base.results.length, book.file); assert.equal(native.total_matched, base.total_matched);
    assert.equal(native.results[0].citation, base.results[0].citation);
    assert.deepEqual(native.source, base.source);
  }
}));

test('post-canonical scripts retain raw variants, uncertain numbering and catalogue continuation', async () => session(async (_client, call) => {
  const input = transliterate('Vism 1.1', 'roman', 'sinhala');
  const roman = await call('get_post_canonical', { citation: input, limit: 2 });
  assert.deepEqual(roman.segments, (await post.getText('Vism 1.1', { limit: 2 })).segments);
  assert.equal(roman.input_script, 'sinhala'); assert.equal(roman.continue_with.script, undefined);
  const approximate = await call('get_post_canonical', { citation: 'Vism 1.2', script: 'thai', limit: 2 });
  const original = await post.getText('Vism 1.2', { limit: 2 });
  assert.equal(approximate.approximate, true); assert.deepEqual(approximate.notes, original.notes);
  assert.deepEqual(approximate.segments, expectedSegments(original.segments, 'thai'));
  const all = await post.getText('visuddhimagga-nidanakatha', { limit: 100000, includeVariants: true });
  const index = all.segments.findIndex(s => s.variant_readings?.length);
  assert.ok(index >= 0);
  const variant = await call('get_post_canonical', { citation: 'visuddhimagga-nidanakatha', offset: index, limit: 1, includeVariants: true, script: 'thai' });
  assert.deepEqual(variant.segments, expectedSegments(all.segments.slice(index, index + 1), 'thai'));
  assert.equal(variant.continue_with.includeVariants, true); assert.equal(variant.continue_with.script, 'thai');
  const first = await call('get_post_canonical', { script: 'sinh', limit: 60 });
  const { tool, ...args } = first.continue_with;
  const second = await call(tool, args);
  assert.equal(args.script, 'sinhala'); assert.equal(second.offset, 60); assert.equal(second.continue_with, null);
  assert.deepEqual([...first.items, ...second.items].map(i => i.id), post.load().books.map(b => b.id));
  const grouped = await call('search_texts', { query: 'dhamma', collection: 'AN 1.300', script: 'thai', limit: 1 });
  assert.equal(grouped.scope_resolution.read_with.script, 'thai');
  const { tool: reader, ...sourceArgs } = grouped.scope_resolution.read_with;
  assert.equal((await call(reader, { ...sourceArgs, limit: 1 })).text_id, grouped.scope_resolution.resolved_id);
}));
