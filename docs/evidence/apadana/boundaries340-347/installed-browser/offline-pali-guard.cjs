'use strict';
// External verifier preload only. Never forwards a fetch or a socket request.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const configPath = process.env.PALI_INTAKE_GATE_CONFIG;
if (!configPath || !path.isAbsolute(configPath)) throw Error('Missing absolute offline gate configuration');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (!['fixture', 'deny-all'].includes(config.mode) || !path.isAbsolute(config.ledger)
  || !Array.isArray(config.files) || config.files.length !== 0) throw Error('Invalid finite offline gate configuration');
const allowed = new Map();
for (const item of config.files) {
  if (!item || typeof item.id !== 'string' || !/^tha-ap\d+$/.test(item.id)
    || !/^https:\/\/raw\.githubusercontent\.com\/apadana-translation\/apadana-site\/fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4\/src\/_poems\/chapter-3\/poem-\d+\.md$/.test(item.url)
    || !path.isAbsolute(item.path) || !/^[a-f0-9]{64}$/.test(item.sha256) || allowed.has(item.url)) throw Error('Invalid finite fixture mapping');
  if (hash(fs.readFileSync(item.path)) !== item.sha256) throw Error('Fixture raw pin differs');
  allowed.set(item.url, Object.freeze({ ...item }));
}
let events = 0;
function record(event) {
  if (++events > 4096) throw Error('Offline gate event bound exceeded');
  // Record no headers, request/response text, arbitrary URL query, or error text.
  fs.appendFileSync(config.ledger, JSON.stringify({ sequence: events, ...event }) + '\n');
}
function urlOf(input) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input && typeof input.url === 'string' ? input.url : '';
}
globalThis.fetch = async (input, options = {}) => {
  const url = urlOf(input), item = allowed.get(url);
  const method = options.method || (input && typeof input.method === 'string' ? input.method : 'GET');
  if (config.mode !== 'fixture' || !item || method !== 'GET' || options.body != null) {
    record({ kind: 'fetch-denied', mode: config.mode, id: item?.id || null, url_sha256: hash(url), known_url: Boolean(item) });
    const error = Error('Offline source verification denies this request');
    error.code = 'OFFLINE_SOURCE_DENIED';
    throw error;
  }
  const bytes = fs.readFileSync(item.path);
  if (hash(bytes) !== item.sha256) throw Error('Fixture changed after launch');
  record({ kind: 'fixture-read', mode: config.mode, id: item.id, url: item.url, raw_sha256: item.sha256 });
  return new Response(bytes, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
const deny = label => function () {
  record({ kind: 'socket-denied', api: label });
  const error = Error('Low-level network disabled by installed verifier');
  error.code = 'OFFLINE_SOCKET_DENIED';
  throw error;
};
for (const name of ['node:http', 'node:https']) {
  const mod = require(name); mod.request = deny(name + '.request'); mod.get = deny(name + '.get');
  if (mod.Agent?.prototype?.createConnection) mod.Agent.prototype.createConnection = deny(name + '.Agent.createConnection');
}
const net = require('node:net');
net.connect = deny('net.connect'); net.createConnection = deny('net.createConnection');
net.Socket.prototype.connect = deny('net.Socket.connect');
require('node:tls').connect = deny('tls.connect');
const dns = require('node:dns');
for (const key of Object.keys(dns)) if (key.startsWith('resolve')) dns[key] = deny('dns.' + key);
// Node's Server.listen(…, '127.0.0.1') still calls dns.lookup. Supply only
// this literal IPv4 address asynchronously, without invoking any DNS resolver.
// Outgoing Socket.connect, http/https agents and tls.connect remain denied.
dns.lookup = function (hostname, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'number' ? { family: options }
    : options && typeof options === 'object' ? options : {};
  if (hostname !== '127.0.0.1' || typeof cb !== 'function'
    || ![undefined, 0, 4].includes(opts.family)
    || opts.all !== undefined && typeof opts.all !== 'boolean') return deny('dns.lookup')();
  record({ kind: 'literal-loopback-resolution', hostname: '127.0.0.1', family: 4, all: opts.all === true });
  process.nextTick(() => opts.all === true
    ? cb(null, [{ address: '127.0.0.1', family: 4 }])
    : cb(null, '127.0.0.1', 4));
};
for (const key of Object.keys(dns.promises)) if (key === 'lookup' || key.startsWith('resolve')) dns.promises[key] = deny('dns.promises.' + key);
require('node:dgram').createSocket = deny('dgram.createSocket');
if (typeof globalThis.WebSocket === 'function') globalThis.WebSocket = deny('WebSocket');
require('node:module').syncBuiltinESMExports();
record({ kind: 'guard-ready', mode: config.mode, allowlisted: allowed.size, actual_network_forwarded: 0 });
