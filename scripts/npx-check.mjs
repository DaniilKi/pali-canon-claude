// Starts an installed copy of the server and speaks raw MCP JSON-RPC to it over stdio:
// initialize, then tools/list. No dependencies, so it can check an npm-installed package
// from any directory. Usage: node scripts/npx-check.mjs <command> [args...]
// Example: node scripts/npx-check.mjs npx --offline --no pali-canon-mcp
import { spawn } from 'node:child_process';
import { expectedToolNames } from './expected-tools.mjs';

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('Usage: node scripts/npx-check.mjs <command> [args...]');
  process.exit(2);
}
const EXPECTED_TOOLS = 11; // at least: the core tools; optional features (src/features) add more
const TIMEOUT_MS = 120000;

// npx and .bin shims are .cmd files on Windows, which need a shell to start.
const quote = (part) => (/^[\w@./:=+-]+$/.test(part) ? part : `"${part.replace(/"/g, '\\"')}"`);
const child = process.platform === 'win32'
  ? spawn([command, ...args].map(quote).join(' '), { stdio: ['pipe', 'pipe', 'inherit'], shell: true })
  : spawn(command, args, { stdio: ['pipe', 'pipe', 'inherit'] });
const pending = new Map();
let buffer = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    let message;
    try { message = JSON.parse(line); } catch { fail(`Server wrote a non-JSON line to stdout: ${line.slice(0, 200)}`); }
    const waiter = pending.get(message.id);
    if (waiter) { pending.delete(message.id); waiter(message); }
  }
});
child.on('exit', (code) => { if (pending.size) fail(`Server exited (code ${code}) before answering`); });
child.on('error', (error) => fail(`Could not start ${command}: ${error.message}`));
const timer = setTimeout(() => fail(`No answer within ${TIMEOUT_MS / 1000}s`), TIMEOUT_MS);

function fail(reason) {
  console.error(`FAIL ${reason}`);
  child.kill();
  process.exit(1);
}
let nextId = 1;
function request(method, params) {
  const id = nextId++;
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  return new Promise((resolve) => pending.set(id, resolve));
}

const init = await request('initialize', {
  protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'pali-canon-npx-check', version: '1.0.0' },
});
if (init.error) fail(`initialize: ${JSON.stringify(init.error)}`);
if (init.result?.serverInfo?.name !== 'pali-canon') fail(`unexpected serverInfo ${JSON.stringify(init.result?.serverInfo)}`);
console.log(`PASS initialize: ${init.result.serverInfo.name} ${init.result.serverInfo.version}`);
child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);

const list = await request('tools/list', {});
if (list.error) fail(`tools/list: ${JSON.stringify(list.error)}`);
const tools = list.result?.tools ?? [];
if (tools.length < EXPECTED_TOOLS) fail(`expected at least ${EXPECTED_TOOLS} tools, got ${tools.length}`);
if (!tools.every((tool) => tool.annotations?.readOnlyHint)) fail('every tool must be annotated read-only');
console.log(`PASS tools/list: ${tools.length} tools`);

// One offline call proves the bundled data was found next to the installed server.
const call = await request('tools/call', { name: 'resolve_reference', arguments: { reference: 'MN 10' } });
const text = call.result?.content?.find((part) => part.type === 'text')?.text ?? '';
if (call.error || call.result?.isError || !text.includes('"mn10"')) fail(`resolve_reference MN 10: ${JSON.stringify(call.error ?? text.slice(0, 300))}`);
console.log('PASS tools/call resolve_reference MN 10 (bundled data found)');

clearTimeout(timer);
child.stdin.end();
child.kill();
process.exit(0);
