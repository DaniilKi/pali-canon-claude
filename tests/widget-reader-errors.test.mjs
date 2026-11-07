import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createHttpServer } from '../src/http-server.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';

test('widget blank translation selectors fail before fetching and the hosted reader recovers', async () => {
  const previous = globalThis.fetch; let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw Error('Unexpected provider fetch'); };
  try { for (const translation of ['', ' ']) await assert.rejects(readPassage({ uid: 'MN 10', translation }), /empty or blank/); }
  finally { globalThis.fetch = previous; }
  assert.equal(attempts, 0);
  const server = createHttpServer({ rateLimitPerMinute: 0, chatgptWidget: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const client = new Client({ name: 'widget-reader-errors', version: '1' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/mcp`)));
    for (const translation of ['', ' ']) {
      const r = await client.callTool({ name: 'read_passage_widget', arguments: { uid: 'MN 10', translation } });
      assert.equal(r.isError, true);
    }
    const valid = await client.callTool({ name: 'read_passage_widget', arguments: { uid: 'MN 10', english: false, limit: 1 } });
    assert.ok(!valid.isError);
  } finally { await client.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
