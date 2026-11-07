import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';

async function session(run) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'abhidhamma-navigation', version: '1' }), server = createServer();
  const raw = (name, args) => client.callTool({ name, arguments: args });
  const call = async (name, args) => { const r = await raw(name, args); assert.ok(!r.isError, JSON.stringify(r.content)); return JSON.parse(r.content[0].text); };
  const follow = ({ tool, ...args }) => call(tool, args);
  try { await Promise.all([client.connect(a), server.connect(b)]); await run({ call, raw, follow }); }
  finally { await client.close(); await server.close(); }
}

test('MCP rejects malformed matika entry numbers instead of silently choosing another entry', async () => session(async ({ call, raw }) => {
  for (const section of ['tika -1', 'duka 1.5', 'duka 1/2', 'tika +2', 'tika 1-2', 'Ds -1.2', 'Ds 1/2']) {
    const r = await raw('abhidhamma_matika', { section });
    assert.equal(r.isError, true, section);
    assert.equal(JSON.parse(r.content[0].text).entries, undefined);
  }
  assert.equal((await call('abhidhamma_matika', { section: 'TiKa 5' })).entries[0].number, 5);
  assert.equal((await call('abhidhamma_matika', { section: 'Ds 1.2' })).entries.length, 100);
  assert.equal((await call('abhidhamma_matika', { section: 'duka 101' })).entries[0].text_id, 'ds1.3');
}));

test('matika catalogue and group commands open exact source windows with pinned provenance', async () => session(async ({ call, follow }) => {
  const catalogue = await call('abhidhamma_matika', {});
  assert.deepEqual(catalogue.source, canon.source());
  const section = await follow(catalogue.sections.find(s => s.section === 'duka').read_with);
  const group = await follow(catalogue.sections.find(s => s.section === 'duka').groups[0].read_with);
  assert.deepEqual(group.entries, section.entries.filter(e => e.group === group.group));
  const entry = group.entries[0], page = await follow(entry.read_with);
  const all = canon.segments(canon.resolve(entry.text_id).unit);
  assert.deepEqual(page.segments, all.slice(entry.get_text.offset, entry.get_text.offset + entry.get_text.limit));
  assert.equal(page.segments[0].ref, entry.segment_ref);
  assert.deepEqual(page.source, group.source);
}));

test('Patthana navigation keeps the complete multi-segment definition separate from dictionary glosses', async () => session(async ({ call, follow }) => {
  const catalogue = await call('patthana_condition', { name: 'all' });
  const row = catalogue.conditions.find(c => c.definition.get_text.limit > 1);
  assert.ok(row);
  const full = await follow(row.read_with), definition = full.condition.definition;
  const page = await follow(definition.read_with);
  assert.equal(page.returned, definition.text.length);
  assert.deepEqual(page.segments.map(s => s.text.replace(/<[^>]+>/g, '').trim()), definition.text);
  assert.deepEqual(page.source, full.source);
  const list = await follow(full.condition.listed_in.read_with);
  assert.ok(list.segments[0].text.includes(row.name));
  assert.equal(full.condition.dictionary.tool, 'lookup_pali');
  assert.match(full.condition.dictionary.note, /not scripture and not a translation/);
  assert.equal(full.condition.english, undefined);
  assert.equal(full.condition.gloss, undefined);
}));
