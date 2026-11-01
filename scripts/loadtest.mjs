// Load test for the HTTP endpoint: N concurrent MCP sessions, each doing a realistic study sequence.
//
//   node scripts/loadtest.mjs                       # starts server/http.cjs locally, 50 sessions
//   node scripts/loadtest.mjs --url https://example.org/mcp --sessions 50 --rounds 2
//   node scripts/loadtest.mjs --live                # also fetch an English translation and a dictionary entry
//
// Reports p50/p95/max latency per operation and every error. Exits 1 if any request failed.
// Against a public deployment, keep --sessions modest: the per-IP rate limit (default 120 requests a minute)
// applies to you too. The locally started server runs with the limit switched off.
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { spawn } from 'node:child_process';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const sessions = Number(arg('sessions', 50));
const rounds = Number(arg('rounds', 1));
const live = process.argv.includes('--live');
let url = arg('url');
let child;

async function waitFor(healthUrl, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(healthUrl)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Server did not become healthy at ${healthUrl}`);
}

if (!url) {
  const port = Number(arg('port', 18080));
  child = spawn(process.execPath, ['server/http.cjs'], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', RATE_LIMIT_PER_MINUTE: '0' }, stdio: ['ignore', 'inherit', 'inherit'] });
  url = `http://127.0.0.1:${port}/mcp`;
  await waitFor(url.replace(/\/mcp$/, '/healthz'));
}

const timings = new Map();
const errors = [];
const record = (op, ms) => { if (!timings.has(op)) timings.set(op, []); timings.get(op).push(ms); };

async function timed(op, fn) {
  const t = performance.now();
  try {
    const result = await fn();
    if (result?.isError) throw new Error(result.content?.[0]?.text?.slice(0, 160) || 'tool error');
    record(op, performance.now() - t);
    return result;
  } catch (error) {
    record(op, performance.now() - t);
    errors.push(`${op}: ${error.message}`);
    return null;
  }
}

async function session(n) {
  const client = new Client({ name: 'pali-canon-loadtest', version: '1' });
  const transport = new StreamableHTTPClientTransport(new URL(url));
  if (!await timed('initialize', () => client.connect(transport).then(() => ({})))) return;
  await timed('tools/list', () => client.listTools());
  const refs = ['MN 10', 'SN 56.11', 'AN 3.65', 'Dhp 183', 'Snp 1.8'];
  const ref = refs[n % refs.length];
  await timed('resolve_reference', () => client.callTool({ name: 'resolve_reference', arguments: { reference: ref } }));
  await timed('get_text', () => client.callTool({ name: 'get_text', arguments: { uid: ref, limit: 20 } }));
  await timed('search_texts', () => client.callTool({ name: 'search_texts', arguments: { query: ['nibbana', 'metta', '"cattāro satipaṭṭhānā"'][n % 3], limit: 5 } }));
  await timed('browse_canon', () => client.callTool({ name: 'browse_canon', arguments: { node: 'sn56' } }));
  if (live) {
    await timed('get_translation (live)', () => client.callTool({ name: 'get_translation', arguments: { uid: 'MN 10', limit: 2000 } }));
    await timed('lookup_pali (live)', () => client.callTool({ name: 'lookup_pali', arguments: { word: 'metta' } }));
  }
  await client.close().catch(() => {});
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
const started = performance.now();
try {
  for (let r = 0; r < rounds; r += 1) await Promise.all(Array.from({ length: sessions }, (_, i) => session(i)));
} finally {
  const wall = (performance.now() - started) / 1000;
  const all = [...timings.values()].flat().sort((a, b) => a - b);
  console.log(`\nLoad test: ${sessions} concurrent sessions x ${rounds} round(s) against ${url}${live ? ' (with live sources)' : ''}`);
  console.log(`${all.length} requests in ${wall.toFixed(1)} s (${(all.length / wall).toFixed(1)} req/s), ${errors.length} errors\n`);
  console.log('operation                  count    p50 ms    p95 ms    max ms');
  for (const [op, list] of [...timings, ['ALL', all]]) {
    const s = [...list].sort((a, b) => a - b);
    console.log(`${op.padEnd(25)} ${String(s.length).padStart(6)} ${pct(s, 50).toFixed(0).padStart(9)} ${pct(s, 95).toFixed(0).padStart(9)} ${s[s.length - 1].toFixed(0).padStart(9)}`);
  }
  if (errors.length) {
    const grouped = new Map();
    for (const e of errors) grouped.set(e, (grouped.get(e) || 0) + 1);
    console.log('\nErrors:');
    for (const [e, count] of grouped) console.log(`  ${count} x ${e}`);
  }
  try { console.log(`\nServer counters: ${JSON.stringify((await (await fetch(url.replace(/\/mcp$/, '/healthz'))).json()).counters)}`); } catch { /* optional */ }
  child?.kill();
  process.exitCode = errors.length ? 1 : 0;
}
