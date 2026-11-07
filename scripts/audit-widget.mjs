// Verify an isolated installed HTTP widget with publisher access disabled.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { WIDGET_URI, SKYBRIDGE_URI, WIDGET_HTML } from '../src/chatgpt-widget.mjs';
import { auditWidget } from './evidence/widget.mjs';

function option(name) { const index = process.argv.indexOf(name); if (index < 0) return; assert.ok(process.argv[index + 1] && !process.argv[index + 1].startsWith('--'), `${name} requires a path`); return resolve(process.argv[index + 1]); }
const serverDir = option('--server-dir') || resolve('server');
const reportPath = option('--report');
const client = new Client({ name: 'installed-widget-audit', version: '1' });
let stage, child, stderr = '', timer;
try {
  if (reportPath) await writeFile(reportPath, '{"status":"running"}\n');
  stage = await mkdtemp(join(tmpdir(), 'pali-widget-'));
  await cp(serverDir, join(stage, 'server'), { recursive: true }); await mkdir(join(stage, 'empty'));
  const guard = join(stage, 'no-network.cjs');
  await writeFile(guard, `const fail=()=>{process.stderr.write('UNEXPECTED_NETWORK_ATTEMPT\\n');throw Error('Network disabled')};globalThis.fetch=fail;for(const n of ['node:http','node:https']){const m=require(n);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
  child = spawn(process.execPath, ['--require', guard, join(stage, 'server/http.cjs')], { cwd: join(stage, 'empty'), env: { ...process.env, HOST: '127.0.0.1', PORT: '0', CHATGPT_WIDGET: '1', RATE_LIMIT_PER_MINUTE: '0' }, stdio: ['ignore', 'ignore', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(Error('Installed widget server readiness timed out')), 30000);
    child.once('error', reject); child.once('exit', code => reject(Error(`Installed widget server exited (${code})`)));
    child.stderr.on('data', value => { stderr += value; const match = stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  await client.connect(new StreamableHTTPClientTransport(new URL(url)));
  const widget = (await client.listTools()).tools.find(tool => tool.name === 'read_passage_widget');
  assert.deepEqual(widget._meta.ui.visibility, ['model', 'app']); assert.equal(widget._meta['openai/widgetAccessible'], true);
  for (const uri of [WIDGET_URI, SKYBRIDGE_URI]) assert.equal((await client.readResource({ uri })).contents[0].text, WIDGET_HTML);
  const counts = await auditWidget(client, { exhaustAligned: process.argv.includes('--exhaust-aligned') });
  assert.doesNotMatch(stderr, /UNEXPECTED_NETWORK_ATTEMPT/);
  const report = { status: 'passed', counts, resources: [WIDGET_URI, SKYBRIDGE_URI], network_attempts: 0, scope: 'Isolated installed HTTP package, retrieved widget resources and source-faithful selections/cursors; no signed-in host, LLM execution or native-reader review.' };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} catch (error) {
  if (reportPath) await writeFile(reportPath, JSON.stringify({ status: 'failed', error: error.message }) + '\n');
  throw error;
} finally {
  clearTimeout(timer); await client.close().catch(() => {});
  if (child && child.exitCode === null && child.signalCode === null) { const stopped = new Promise(resolve => child.once('exit', resolve)); child.kill(); await stopped; }
  if (stage) await rm(stage, { recursive: true, force: true });
}
