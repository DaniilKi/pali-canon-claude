import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, TOOL_TITLES } from '../src/server.mjs';
import { expectedToolNames } from '../scripts/expected-tools.mjs';

test('every tool has a human-readable title (connector directory requirement)', async () => {
  assert.deepEqual(Object.keys(TOOL_TITLES).sort(), expectedToolNames());
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'title-test', version: '1.0.0' });
  await Promise.all([createServer().connect(serverSide), client.connect(clientSide)]);
  const { tools } = await client.listTools();
  assert.equal(tools.length, expectedToolNames().length);
  for (const tool of tools) {
    assert.equal(tool.title, TOOL_TITLES[tool.name], tool.name);
    assert.equal(tool.annotations?.title, TOOL_TITLES[tool.name], tool.name);
    assert.ok(tool.title.length >= 3 && tool.title.length <= 40, tool.name);
  }
  await client.close();
});
