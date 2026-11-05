import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Agent, request } from 'node:http';
import { createHttpServer } from '../src/http-server.mjs';

async function withServer(work, options = {}) {
  const server = createHttpServer({ rateLimitPerMinute: 0, chatgptWidget: false, ...options });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try { return await work(base, server); }
  finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
async function rawCall(base, method, params, id = 1) {
  const response = await fetch(`${base}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });
  await response.text();
}

test('HTTP counters do not retain arbitrary method/tool names and remain bounded as invalid requests grow', async () => {
  await withServer(async (base, server) => {
    const count = 40;
    for (let i = 0; i < count; i += 1) {
      await rawCall(base, `private-method-fixture-${i}`, {}, i);
      await rawCall(base, 'tools/call', { name: `private-tool-fixture-${i}`, arguments: {} }, i + count);
    }
    const health = await (await fetch(`${base}/healthz`)).json();
    assert.doesNotMatch(JSON.stringify(health), /private-(?:method|tool)-fixture/);
    assert.deepEqual(health.counters.mcp_methods, { other: count, 'tools/call': count });
    assert.deepEqual(health.counters.tool_calls, { other: count });
    assert.equal(Object.keys(server.counters.mcp_methods).length, 2);
    assert.equal(Object.keys(server.counters.tool_calls).length, 1);
  });
});

test('HTTP counter names cannot collide with Object prototype properties', async () => {
  await withServer(async (base, server) => {
    assert.equal(Object.getPrototypeOf(server.counters.mcp_methods), null);
    assert.equal(Object.getPrototypeOf(server.counters.tool_calls), null);
    for (const name of ['__proto__', 'constructor', 'toString']) {
      await rawCall(base, name, {});
      await rawCall(base, 'tools/call', { name, arguments: {} });
    }
    const health = await (await fetch(`${base}/healthz`)).json();
    assert.deepEqual(health.counters.mcp_methods, { other: 3, 'tools/call': 3 });
    assert.deepEqual(health.counters.tool_calls, { other: 3 });
  });
});

test('the widget counter is a recognised label only when that tool is enabled', async () => {
  for (const enabled of [false, true]) {
    await withServer(async (base) => {
      // Missing uid fails validation before any translation fetch, while exercising actual tool dispatch.
      await rawCall(base, 'tools/call', { name: 'read_passage_widget', arguments: {} });
      const health = await (await fetch(`${base}/healthz`)).json();
      assert.deepEqual(health.counters.tool_calls, enabled ? { read_passage_widget: 1 } : { other: 1 });
    }, { chatgptWidget: enabled });
  }
});

test('an SDK HTTP client connects, reads both modes, continues and leaves recognised counters intact', async () => {
  await withServer(async (base) => {
    const client = new Client({ name: 'http-reading-fixture', version: '1' });
    const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
    const data = (response) => {
      assert.ok(!response.isError);
      return JSON.parse(response.content.find((p) => p.type === 'text').text);
    };
    try {
      await client.connect(transport);
      const tools = await client.listTools();
      assert.ok(tools.tools.some((tool) => tool.name === 'get_text'));
      const opening = data(await client.callTool({ name: 'get_text', arguments: { uid: 'MN 10', limit: 2 } }));
      const continuation = data(await client.callTool({ name: 'get_text', arguments: { uid: 'MN 10', offset: opening.next_offset, limit: 2 } }));
      assert.equal(opening.text_id, 'mn10');
      assert.notEqual(opening.segments.at(-1).ref, continuation.segments[0].ref);
      const book = data(await client.callTool({ name: 'get_text', arguments: { book: 'vin02m1', limit: 2 } }));
      const bookNext = data(await client.callTool({ name: 'get_text', arguments: { book: 'vin02m1', offset: book.next_offset, limit: 2 } }));
      assert.equal(book.selection, 'source_book');
      assert.notEqual(book.segments.at(-1).ref, bookNext.segments[0].ref);
      const health = await (await fetch(`${base}/healthz`)).json();
      assert.equal(health.counters.tool_calls.get_text, 4);
      assert.equal(health.counters.mcp_methods.initialize, 1);
      assert.equal(health.counters.mcp_methods['notifications/initialized'], 1);
      assert.equal(health.counters.mcp_methods['tools/list'], 1);
    } finally { await client.close(); }
  });
});

test('a pooled HTTP connection survives a delayed next request during a cold-work pause', async () => {
  await withServer(async (base) => {
    const agent = new Agent({ keepAlive: true, maxSockets: 1 });
    const ping = () => new Promise((resolve, reject) => {
      const req = request(`${base}/mcp`, { method: 'POST', agent, headers }, (res) => {
        res.resume();
        res.on('end', () => resolve({ status: res.statusCode, reused: req.reusedSocket }));
      });
      req.setTimeout(10000, () => req.destroy(new Error('HTTP ping timed out')));
      req.on('error', reject);
      req.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));
    });
    try {
      assert.equal((await ping()).status, 200);
      await new Promise((resolve) => setImmediate(resolve));
      // Reproduce the event-loop pause observed during first-use index loading, without invoking search.
      // With Node's default idle timeout the pooled request resets before it reaches the handler.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 6100);
      const next = await ping();
      assert.equal(next.status, 200);
      assert.equal(next.reused, true, 'the connection must stay usable rather than relying on a reconnect');
    } finally { agent.destroy(); }
  });
});
