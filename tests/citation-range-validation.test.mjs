import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { parseCitation, CitationError } from '../src/citations.mjs';
import { findCitations } from '../src/find-citations.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const invalid = ['MN 10-9999', 'SN 1.1-9999', 'Dhp 1-99999', 'SN 2.1-1.1', 'SN 1.1-999.1', 'MN 10-12.1'];

test('ranges cannot resolve by ignoring a missing or malformed final endpoint', () => {
  for (const reference of invalid) assert.throws(() => canon.resolve(reference), CitationError, reference);
});

test('multi-level range ordering compares the whole path', () => {
  assert.throws(() => parseCitation('SN 2.1-1.1'), /reversed range/);
  assert.throws(() => parseCitation('SN 1.20-1.10'), /reversed range/);
  assert.throws(() => parseCitation('MN 10-12.1'), /same number of levels/);
  assert.deepEqual(parseCitation('SN 1.10-2.1').end, [2, 1]);
});

test('valid spans keep first-text notes and recorded groups keep their identities', () => {
  for (const [reference, id] of [['MN 10-12', 'mn10'], ['SN 1.1-3', 'sn1.1'], ['SN 1.10-2.1', 'sn1.10']]) {
    const result = canon.resolve(reference);
    assert.equal(result.unit.id, id);
    assert.ok(result.notes.some((note) => /showing the first/.test(note)));
  }
  for (const [reference, id] of [['AN 1.296-305', 'an1.296-305'], ['Dhp 1-20', 'dhp1-20'], ['Bu As 1-7', 'pli-tv-bu-vb-as1-7']]) {
    assert.equal(canon.resolve(reference).unit.id, id);
  }
  assert.equal(canon.resolve('SN 46.145-150').unit.id, canon.resolve('SN 46.145').unit.id, 'grouped endpoints remain resolvable');
  const single = canon.resolve('MN 10-10');
  assert.equal(single.unit.id, 'mn10');
  assert.ok(!single.notes.some((note) => /spans several texts/.test(note)));
});

test('free-text citation checking reports bad ranges as unresolved', () => {
  const result = findCitations(invalid.join('; '), canon);
  assert.deepEqual(result.citations.map((hit) => hit.text), invalid);
  assert.ok(result.citations.every((hit) => hit.status === 'unresolved' && !hit.text_id));
});

test('MCP resolve and retrieval reject invalid range endpoints', async () => {
  const client = new Client({ name: 'citation-range-validation', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    for (const reference of ['MN 10-9999', 'SN 2.1-1.1']) {
      for (const [name, args] of [['resolve_reference', { reference }], ['get_text', { uid: reference }]]) {
        const result = await client.callTool({ name, arguments: args });
        assert.equal(result.isError, true, `${name}: ${reference}`);
      }
    }
  } finally { await client.close(); }
});
