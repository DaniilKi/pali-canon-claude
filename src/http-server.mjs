/**
 * Remote MCP endpoint (Streamable HTTP, stateless) for Claude web/mobile custom connectors and other
 * clients that cannot run a local process. Same tools as the stdio server, all read-only.
 *
 *   POST /mcp      MCP JSON-RPC (stateless: every request gets a fresh server and transport)
 *   GET  /healthz  liveness plus aggregate counters
 *
 * Privacy: request bodies, tool arguments, IP addresses and user agents are never logged or stored.
 * Only aggregate counters are kept in memory (request totals, status classes, MCP method and tool
 * names). IP addresses are held in memory only for rate limiting and forgotten after a minute.
 */
import { createServer as createHttp } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer as createMcpServer, VERSION } from './server.mjs';
import { liveCache } from './cache.mjs';
import { load } from './canon.mjs';
import { registerChatgptWidget } from './chatgpt-widget.mjs';

const MAX_BODY = 1024 * 1024;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, Mcp-Protocol-Version, Retry-After',
  'Access-Control-Max-Age': '86400',
};

const intEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return process.env[name] !== undefined && process.env[name] !== '' && Number.isFinite(value) ? value : fallback;
};

/** Fixed-window limiter per client IP. Keeps at most `maxClients` addresses, oldest dropped first. */
export class RateLimiter {
  constructor({ perMinute = 120, windowMs = 60000, maxClients = 50000, now = () => Date.now() } = {}) {
    Object.assign(this, { perMinute, windowMs, maxClients, now });
    this.clients = new Map();
  }

  /** Returns 0 when allowed, otherwise the seconds to wait. */
  take(ip) {
    if (!this.perMinute || this.perMinute <= 0) return 0;
    const t = this.now();
    let entry = this.clients.get(ip);
    if (!entry || t - entry.start >= this.windowMs) {
      this.clients.delete(ip);
      entry = { start: t, count: 0 };
      this.clients.set(ip, entry);
      if (this.clients.size > this.maxClients) this.clients.delete(this.clients.keys().next().value);
    }
    entry.count += 1;
    if (entry.count <= this.perMinute) return 0;
    return Math.max(1, Math.ceil((entry.start + this.windowMs - t) / 1000));
  }

  sweep() {
    const t = this.now();
    for (const [ip, entry] of this.clients) if (t - entry.start >= this.windowMs) this.clients.delete(ip);
  }
}

/**
 * Client address for the rate limit. With `trustProxyHops` = 0 the socket address is used. Behind N trusted
 * proxies (Fly.io and Render each add one) the address is the Nth entry from the RIGHT of X-Forwarded-For:
 * entries further left are written by the client and can be forged, so they are never used.
 */
export function clientIp(req, trustProxyHops = 0) {
  if (trustProxyHops > 0) {
    const header = req.headers['x-forwarded-for'];
    const raw = Array.isArray(header) ? header.join(',') : header;
    if (typeof raw === 'string' && raw) {
      const hops = raw.split(',').map((part) => part.trim()).filter(Boolean);
      if (hops.length) return hops[Math.max(0, hops.length - trustProxyHops)];
    }
  }
  return req.socket.remoteAddress || 'unknown';
}

/** TRUST_PROXY: off/0 = no proxy; 1/true/yes = one proxy hop; a number = that many hops. */
export function parseTrustProxy(value) {
  const text = String(value ?? '').trim();
  if (/^(true|yes|on)$/i.test(text)) return 1;
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function send(res, status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { ...CORS, 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json', 'Cache-Control': 'no-store', ...headers });
  res.end(text);
}

const rpcError = (code, message) => ({ jsonrpc: '2.0', error: { code, message }, id: null });

const tooLarge = () => Object.assign(new Error('too large'), { status: 413 });
// An over-limit body up to this size is read to the end and discarded before the 413 is sent, so the
// client has finished uploading and reliably receives the response. Anything bigger is cut off at once.
const MAX_DRAIN = 8 * MAX_BODY;

/**
 * Read the request body up to MAX_BODY. Over the limit, the data is discarded (never kept in memory)
 * and the promise rejects with status 413 once the upload ends, or as soon as MAX_DRAIN is passed.
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > MAX_DRAIN) { req.resume(); reject(tooLarge()); return; }
    const chunks = [];
    let bytes = 0;
    let settled = false;
    const fail = (error) => { if (!settled) { settled = true; reject(error); } };
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_DRAIN) { chunks.length = 0; fail(tooLarge()); return; }
      if (bytes <= MAX_BODY) chunks.push(chunk); else chunks.length = 0;
    });
    req.on('end', () => {
      if (bytes > MAX_BODY) fail(tooLarge());
      else if (!settled) { settled = true; resolve(Buffer.concat(chunks).toString('utf8')); }
    });
    req.on('error', fail);
  });
}

/**
 * Create (but do not start) the HTTP server. Options default to environment variables:
 * RATE_LIMIT_PER_MINUTE (120; 0 disables), TRUST_PROXY (number of trusted proxy hops; 1 behind Fly.io/Render),
 * CHATGPT_WIDGET (1/true/yes/on adds the ChatGPT reading widget: tool read_passage_widget and its UI templates).
 */
export function createHttpServer({
  rateLimitPerMinute = intEnv('RATE_LIMIT_PER_MINUTE', 120),
  trustProxy = parseTrustProxy(process.env.TRUST_PROXY),
  chatgptWidget = /^(1|true|yes|on)$/i.test(String(process.env.CHATGPT_WIDGET ?? '').trim()),
} = {}) {
  const limiter = new RateLimiter({ perMinute: rateLimitPerMinute });
  const started = Date.now();
  const counters = { requests: 0, mcp_requests: 0, rate_limited: 0, errors: 0, by_status: {}, mcp_methods: {}, tool_calls: {} };
  const bump = (bucket, key) => { bucket[key] = (bucket[key] || 0) + 1; };

  const sweeper = setInterval(() => limiter.sweep(), 60000);
  sweeper.unref();

  const http = createHttp(async (req, res) => {
    counters.requests += 1;
    res.on('finish', () => bump(counters.by_status, `${Math.floor(res.statusCode / 100)}xx`));
    const path = (req.url || '/').split('?')[0];
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }

      if (path === '/healthz' || path === '/health') {
        if (req.method !== 'GET' && req.method !== 'HEAD') { send(res, 405, 'Method not allowed', { Allow: 'GET, HEAD' }); return; }
        send(res, 200, {
          status: 'ok', name: 'pali-canon', version: VERSION, transport: 'streamable-http (stateless)',
          uptime_seconds: Math.round((Date.now() - started) / 1000),
          counters, cache: liveCache.stats(),
          rate_limit_per_minute: rateLimitPerMinute || null,
          chatgpt_widget: Boolean(chatgptWidget),
          privacy: 'No request content, tool arguments, IP addresses or user agents are logged; only these aggregate counts are kept in memory.',
        });
        return;
      }

      if (path === '/' && (req.method === 'GET' || req.method === 'HEAD')) {
        send(res, 200, `Pāli Canon MCP server ${VERSION}. Connect an MCP client to /mcp (Streamable HTTP). Health: /healthz. Source: https://github.com/DaniilKi/pali-canon-claude\n`);
        return;
      }

      if (path !== '/mcp') { send(res, 404, 'Not found. The MCP endpoint is /mcp.'); return; }

      counters.mcp_requests += 1;
      const wait = limiter.take(clientIp(req, trustProxy === true ? 1 : Number(trustProxy) || 0));
      if (wait) {
        counters.rate_limited += 1;
        send(res, 429, rpcError(-32000, `Rate limit reached (${rateLimitPerMinute} requests per minute). Try again in ${wait} s.`), { 'Retry-After': String(wait) });
        return;
      }

      // Stateless server: no sessions, so no server-sent event stream to resume and nothing to delete.
      if (req.method !== 'POST') {
        send(res, 405, rpcError(-32000, 'Method not allowed. This server is stateless: send JSON-RPC with POST.'), { Allow: 'POST, OPTIONS' });
        return;
      }

      let body;
      try {
        const raw = await readBody(req);
        body = JSON.parse(raw);
      } catch (error) {
        if (error.status === 413) { send(res, 413, rpcError(-32600, 'Request body too large (1 MB limit).'), { Connection: 'close' }); return; }
        send(res, 400, rpcError(-32700, 'Parse error: body must be JSON-RPC.'));
        return;
      }
      for (const message of Array.isArray(body) ? body : [body]) {
        if (!message || typeof message.method !== 'string') continue;
        bump(counters.mcp_methods, message.method.slice(0, 40));
        if (message.method === 'tools/call' && typeof message.params?.name === 'string') bump(counters.tool_calls, message.params.name.slice(0, 40));
      }

      for (const [key, value] of Object.entries(CORS)) res.setHeader(key, value);
      const server = createMcpServer();
      if (chatgptWidget) registerChatgptWidget(server);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on('close', () => { transport.close().catch(() => {}); server.close().catch(() => {}); });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      counters.errors += 1;
      // Log the error kind only, never the request.
      console.error(`HTTP handler error: ${error?.message || 'unknown'}`);
      if (!res.headersSent) send(res, 500, rpcError(-32603, 'Internal server error.'));
      else res.end();
    }
  });
  http.on('close', () => clearInterval(sweeper));
  http.counters = counters;
  return http;
}

/** Start listening on $PORT (default 8080) and $HOST (default 0.0.0.0). Used by server/http.cjs. */
export function startHttpServer({ port = intEnv('PORT', 8080), host = process.env.HOST || '0.0.0.0' } = {}) {
  load(); // read the bundled canon once at startup, not on the first request
  const http = createHttpServer();
  http.listen(port, host, () => {
    const address = http.address();
    console.error(`Pali Canon MCP ${VERSION} listening on http://${host}:${address.port}/mcp`);
  });
  const stop = () => http.close(() => process.exit(0));
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  return http;
}
