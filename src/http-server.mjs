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

function clientIp(req, trustProxy) {
  if (trustProxy) {
    const fly = req.headers['fly-client-ip'];
    if (typeof fly === 'string' && fly) return fly.trim();
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function send(res, status, body, headers = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { ...CORS, 'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json', 'Cache-Control': 'no-store', ...headers });
  res.end(text);
}

const rpcError = (code, message) => ({ jsonrpc: '2.0', error: { code, message }, id: null });

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY) { reject(Object.assign(new Error('too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Create (but do not start) the HTTP server. Options default to environment variables:
 * RATE_LIMIT_PER_MINUTE (120; 0 disables), TRUST_PROXY (1 behind Fly.io/Render so the real client IP is used).
 */
export function createHttpServer({
  rateLimitPerMinute = intEnv('RATE_LIMIT_PER_MINUTE', 120),
  trustProxy = /^(1|true|yes)$/i.test(process.env.TRUST_PROXY || ''),
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
      const wait = limiter.take(clientIp(req, trustProxy));
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
        if (error.status === 413) { send(res, 413, rpcError(-32600, 'Request body too large (1 MB limit).')); return; }
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
