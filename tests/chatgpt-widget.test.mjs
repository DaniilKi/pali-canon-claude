import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {
  readPassage, WIDGET_HTML, WIDGET_TOOL, WIDGET_URI, SKYBRIDGE_URI, MCP_APP_MIME, SKYBRIDGE_MIME, TOOL_META,
  RESOURCE_META, REDIRECT_DOMAINS,
} from '../src/chatgpt-widget.mjs';
import { ALLOWED_HOSTS } from '../src/http.mjs';
import { expectedToolNames } from '../scripts/expected-tools.mjs';

test('widget citations used here resolve with the bundled canon', () => {
  assert.equal(canon.resolve('MN 10').unit.id, 'mn10');
  assert.equal(canon.resolve('Dhp 183').unit.id, 'dhp183');
  assert.equal(canon.resolve('Pj 1').unit.id, 'pli-tv-bu-vb-pj1');
  // Citations used in docs/listings/chatgpt.md.
  assert.equal(canon.resolve('S v 420').unit.id, 'sn56.11');
  assert.equal(canon.resolve('SN 56:11').unit.id, 'sn56.11');
  assert.equal(canon.resolve('AN 3.65').unit.id, 'an3.65');
  assert.equal(canon.resolve('Snp 1.8').unit.id, 'snp1.8');
  assert.equal(canon.resolve('M i 55').unit.id, 'mn10');
});

test('readPassage returns retrieved Pāli with citation, PTS page and VRI attribution (offline)', async () => {
  const r = await readPassage({ uid: 'MN 10', english: false, limit: 5 });
  assert.equal(r.text_id, 'mn10');
  assert.equal(r.citation, 'MN 10');
  assert.match(r.pts, /^M i 55/);
  assert.equal(r.pali.returned, 5);
  assert.equal(r.pali.next_offset, 5);
  assert.ok(r.pali.attribution && r.pali.license, 'VRI attribution and licence travel with the text');
  // Every segment is the bundled text, byte for byte.
  assert.deepEqual(r.pali.segments, canon.segments(canon.resolve('MN 10').unit).slice(0, 5));
  assert.equal(r.english, null);
  assert.equal(r.english_error, undefined, 'no English requested, no error');
  assert.ok(r.english_available.length > 0, 'still lists the translations that exist');
  assert.equal(r.links.suttacentral, 'https://suttacentral.net/mn10', 'links only, no SuttaCentral content');
});

test('readPassage never substitutes: a text without English reports it, Pāli only', async () => {
  const r = await readPassage({ uid: 'Pj 1', limit: 3 });
  assert.equal(r.text_id, 'pli-tv-bu-vb-pj1');
  assert.equal(r.english, null);
  assert.match(r.english_error, /No English translation is linked for/);
  assert.equal(r.pali.returned, 3);
});

test('readPassage rejects an unknown citation instead of inventing text', async () => {
  await assert.rejects(() => readPassage({ uid: 'MN 999', english: false }));
});

test('widget HTML is self-contained and renders data as text only', () => {
  assert.ok(!/<(script|link|img|iframe)\b[^>]*\b(src|href)=/i.test(WIDGET_HTML), 'no external resources');
  assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/.test(WIDGET_HTML), 'no HTML injection paths');
  assert.ok(!/suttacentral\.net\/[a-z]/.test(WIDGET_HTML), 'no hard-coded content links');
  assert.match(WIDGET_HTML, /ui\/notifications\/tool-result/);
  assert.match(WIDGET_HTML, /window\.openai/);
  assert.match(WIDGET_HTML, /\^https:\\\/\\\/'?/, 'only https links are made clickable');
});

test('stdio server does not expose the widget tool', async () => {
  const { createServer } = await import('../src/server.mjs');
  const server = createServer();
  assert.ok(!Object.keys(server._registeredTools).includes(WIDGET_TOOL));
  assert.ok(!Object.keys(server._registeredResources).includes(WIDGET_URI));
});

test('HTTP endpoint with CHATGPT_WIDGET: tool _meta, UI templates and an offline call', async () => {
  const { createHttpServer } = await import('../src/http-server.mjs');
  const http = createHttpServer({ rateLimitPerMinute: 0, chatgptWidget: true });
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${http.address().port}`;
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const rpc = async (method, params, id = 1) => (await fetch(`${base}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) })).json();
  try {
    assert.equal((await (await fetch(`${base}/healthz`)).json()).chatgpt_widget, true);
    const tools = (await rpc('tools/list', {})).result.tools;
    assert.deepEqual(tools.map((x) => x.name).sort(), [...expectedToolNames(), WIDGET_TOOL].sort(), 'every server tool plus the widget tool');
    const t = tools.find((x) => x.name === WIDGET_TOOL);
    assert.deepEqual(t._meta, TOOL_META);
    assert.equal(t._meta.ui.resourceUri, WIDGET_URI);
    assert.equal(t._meta['openai/outputTemplate'], SKYBRIDGE_URI);
    assert.equal(t.annotations.readOnlyHint, true);
    assert.equal(t.annotations.destructiveHint, false);
    assert.equal(t.annotations.openWorldHint, true, 'fetches English live');
    assert.ok(t.inputSchema.properties.english_offset, 'English continuation input');
    for (const name of ['resolve_reference', 'get_text', 'get_translation', 'list_sources']) {
      assert.equal(tools.find((x) => x.name === name)._meta, undefined, `${name} unchanged`);
    }

    const resources = (await rpc('resources/list', {}, 2)).result.resources;
    for (const [uri, mime] of [[WIDGET_URI, MCP_APP_MIME], [SKYBRIDGE_URI, SKYBRIDGE_MIME]]) {
      const listed = resources.find((r) => r.uri === uri);
      assert.equal(listed.mimeType, mime);
      assert.deepEqual(listed._meta.ui.csp.connectDomains, []);
      const read = (await rpc('resources/read', { uri }, 3)).result.contents[0];
      assert.equal(read.mimeType, mime);
      assert.equal(read.text, WIDGET_HTML);
      assert.ok(read._meta['openai/widgetDescription']);
      assert.deepEqual(read._meta['openai/widgetCSP'].redirect_domains, REDIRECT_DOMAINS);
    }

    const call = (await rpc('tools/call', { name: WIDGET_TOOL, arguments: { uid: 'Dhp 183', english: false } }, 4)).result;
    assert.ok(!call.isError);
    assert.equal(call.structuredContent.text_id, 'dhp183');
    assert.equal(call.structuredContent.citation, 'Dhp 183');
    assert.ok(call.structuredContent.pali.segments.length > 0);
    const bad = (await rpc('tools/call', { name: WIDGET_TOOL, arguments: { uid: 'MN 999', english: false } }, 5)).result;
    assert.equal(bad.isError, true);
    assert.match(JSON.parse(bad.content[0].text).recovery, /Never invent/);
  } finally {
    http.closeAllConnections?.();
    await new Promise((r) => http.close(r));
  }
});

test('HTTP endpoint without CHATGPT_WIDGET keeps exactly the server tools', async () => {
  const { createHttpServer } = await import('../src/http-server.mjs');
  const http = createHttpServer({ rateLimitPerMinute: 0, chatgptWidget: false });
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${http.address().port}`;
  try {
    const res = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }) });
    const tools = (await res.json()).result.tools;
    assert.deepEqual(tools.map((t) => t.name).sort(), expectedToolNames());
    assert.ok(!tools.some((t) => t.name === WIDGET_TOOL));
  } finally {
    http.closeAllConnections?.();
    await new Promise((r) => http.close(r));
  }
});

test('redirect_domains lists only allowlisted English sources and link-only suttacentral.net; no new fetch hosts', () => {
  assert.deepEqual(RESOURCE_META['openai/widgetCSP'].connect_domains, []);
  assert.deepEqual(RESOURCE_META['openai/widgetCSP'].resource_domains, []);
  for (const origin of REDIRECT_DOMAINS) {
    const u = new URL(origin);
    assert.equal(u.protocol, 'https:');
    assert.equal(u.pathname, '/');
    assert.ok(ALLOWED_HOSTS.includes(u.hostname) || u.hostname === 'suttacentral.net', `${origin} is an allowlisted or link-only host`);
  }
  assert.ok(!ALLOWED_HOSTS.includes('suttacentral.net'), 'SuttaCentral stays link-only');
});
