import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createHttpServer } from '../src/http-server.mjs';
import { WIDGET_TOOL, WIDGET_URI, SKYBRIDGE_URI } from '../src/chatgpt-widget.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';

test('hosted MCP widget accepts labelled post-canonical/file selections and script-preserving cursors', async () => {
  const server = createHttpServer({ rateLimitPerMinute: 0, chatgptWidget: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const client = new Client({ name: 'hosted-source-selections', version: '1' });
  const call = async args => {
    const response = await client.callTool({ name: WIDGET_TOOL, arguments: args });
    assert.ok(!response.isError, JSON.stringify(response.content)); return response.structuredContent;
  };
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.address().port}/mcp`)));
    const tool = (await client.listTools()).tools.find(t => t.name === WIDGET_TOOL);
    assert.equal(tool._meta.ui.resourceUri, WIDGET_URI); assert.equal(tool._meta['openai/outputTemplate'], SKYBRIDGE_URI);
    assert.match(WIDGET_URI, /reader-v4/);
    for (const script of SCRIPTS) {
      const post = await call({ uid: transliterate('Vism 1.1', 'roman', script), script, limit: 2 });
      assert.equal(post.canonical, false); assert.equal(post.text_id, undefined); assert.equal(post.english, null);
      const next = await call(post.pali.continue_with.arguments);
      assert.equal(next.pali.offset, 2); assert.equal(next.citation, post.citation); assert.equal(next.canonical, false);
      const file = await call({ book: 'vin02m1', script, offset: 6, limit: 1 });
      assert.equal(file.selection, 'source_book'); assert.equal(file.text_id, undefined);
      assert.equal(file.pali.segments[0].ref, 'vri-book:vin02m1/7');
    }
    for (const args of [{}, { uid: 'Vism 1.1', book: 'vin02m1' }, { book: 'unknown-book' }, { uid: 'Vism p. 3' }, { uid: 'Mahāvagga-Ṭīkā' }, { uid: 'Vism 1.1', script: 'unknown' }]) {
      assert.equal((await client.callTool({ name: WIDGET_TOOL, arguments: args })).isError, true);
    }
    assert.equal((await call({ uid: 'MN 10', english: false, limit: 1 })).text_id, 'mn10');
  } finally { await client.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
