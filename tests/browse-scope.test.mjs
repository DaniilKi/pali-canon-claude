import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

const ids = (result) => result.items.map((item) => item.id);

test('browsing a text identifier excludes similarly numbered siblings', () => {
  for (const node of ['mn1', 'mn15', 'sn1.1', 'pli-tv-bu-vb-pc1']) {
    assert.deepEqual(ids(canon.browse(node, { limit: 10000 })), [node], node);
  }
});

test('browsing a recorded range lists exactly its source members', () => {
  const d = canon.load();
  const groups = d.canon.units.filter((unit) => unit.members?.length);
  assert.ok(groups.length > 90);
  for (const unit of groups) {
    const node = unit.id;
    const allowed = unit.members.filter((id) => !d.byId.get(id)?.approximate);
    const result = canon.browse(node, { limit: 10000 });
    assert.deepEqual(ids(result), allowed, node);
    assert.ok(result.name, node);
    if (node.startsWith('dhp')) {
      assert.equal(result.collection, 'dhp');
      assert.equal(result.name, 'Dhammapada');
    }
  }
});

test('canonical browse validates boundaries and preserves real named parent nodes', () => {
  for (const node of ['s', 'm', 'sn1.100000', 'dhp1-999', 'pli-tv-bu-vb-pc999']) {
    assert.throws(() => canon.browse(node), /Unknown browse node/, node);
  }
  for (const node of ['sn1', 'an1', 'kv1', 'pli-tv-bu-vb-pc', 'pli-tv-bu', 'pli-tv']) {
    const result = canon.browse(node, { limit: 10000 });
    assert.ok(result.total > 0, node);
    assert.ok(ids(result).every((id) => id === node || id.startsWith(`${node}.`) || (!/\d$/u.test(node) && (id.startsWith(`${node}-`) || new RegExp(`^${node}\\d`).test(id)))), node);
  }
  assert.deepEqual(canon.browse('MN 1'), canon.browse('mn1'));
});

test('browse pagination reaches every group member exactly once', () => {
  const expected = ids(canon.browse('dhp1-20', { limit: 10000 }));
  const actual = [];
  let offset = 0;
  do {
    const result = canon.browse('dhp1-20', { offset, limit: 3 });
    assert.equal(result.total, expected.length);
    actual.push(...ids(result));
    offset = result.next_offset;
  } while (offset !== null);
  assert.deepEqual(actual, expected);
});

test('every complete canonical text can be browsed without sibling leakage', () => {
  for (const unit of canon.load().canon.units.filter((u) => !u.approximate && u.kind !== 'range')) {
    const result = canon.browse(unit.id, { limit: 10000 });
    const descendants = result.items.filter((item) => item.id !== unit.id);
    assert.ok(descendants.every((item) => item.id.startsWith(`${unit.id}.`)), unit.id);
    assert.ok(ids(result).includes(unit.id), unit.id);
  }
});

test('MCP browse returns exact text and group membership, and rejects partial prefixes', async () => {
  const client = new Client({ name: 'browse-scope-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(a), createServer().connect(b)]);
  try {
    for (const node of ['mn1', 'sn1.1', 'dhp1-20']) {
      const response = await client.callTool({ name: 'browse_canon', arguments: { node, limit: 100 } });
      assert.ok(!response.isError, node);
      assert.deepEqual(JSON.parse(response.content[0].text), canon.browse(node, { limit: 100 }));
    }
    const invalid = await client.callTool({ name: 'browse_canon', arguments: { node: 's' } });
    assert.equal(invalid.isError, true);
  } finally { await client.close(); }
});
