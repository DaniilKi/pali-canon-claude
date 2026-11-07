// Install-only synthetic declarations and provider responses; no source is activated in the repository.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { largeText, completeText, prefix as sourcePrefix, tailQuote, verificationLimit, html, fullLink } from '../tests/helpers/large-translation.mjs';
import { createHash } from 'node:crypto';
function option(name) { const i = process.argv.indexOf(name); if (i < 0) return; assert.ok(process.argv[i + 1]); return resolve(process.argv[i + 1]); }
const serverDir = option('--server-dir') || resolve('server'), reportPath = option('--report');
let stage, child, client, timer;
const reports = [];
async function close() {
  if (client) await client.close(); client = null;
  if (child && child.exitCode === null && child.signalCode === null) { const ended = new Promise(r => child.once('exit', r)); child.kill(); await ended; }
  child = null; clearTimeout(timer);
}
try {
  stage = await mkdtemp(join(tmpdir(), 'pali-english-completeness-'));
  await cp(serverDir, join(stage, 'server'), { recursive: true }); await mkdir(join(stage, 'empty'));
  const original = JSON.parse(await readFile(join(stage, 'server/data/translations.json'), 'utf8'));
  const preload = join(stage, 'synthetic-provider.cjs');
  for (const mode of ['stdio', 'http', 'mixed_negative', 'mixed_positive', 'complete_recovery', 'exact_limit']) {
    const link = fullLink(), small = fullLink('SMALL', 'Second synthetic fixture translator');
    const mixed = mode.startsWith('mixed_');
    await writeFile(join(stage, 'server/data/translations.json'), JSON.stringify({ ...original, 'patthana1.1': mixed ? [link, small] : [link] }));
    let sourceText = mode === 'complete_recovery' ? completeText : largeText;
    if (mode === 'exact_limit') { const n = verificationLimit - completeText.length - 1; sourceText = sourcePrefix.slice(0, n - 1) + 'x ' + completeText; }
    const smallText = mode === 'mixed_positive' ? completeText : 'Synthetic complete source: turquoise mountains.';
    const bodies = { [link.url]: html(sourceText), [small.url]: html(smallText) };
    await writeFile(preload, `const bodies=${JSON.stringify(bodies)};const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=async input=>{const url=String(input);if(!Object.hasOwn(bodies,url))return fail();return new Response(bodies[url],{status:200,headers:{'content-type':'text/html'}})};for(const name of ['node:http','node:https']){const m=require(name);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
    const env = { ...process.env, PALI_CANON_CACHE_MB: '0', HOST: '127.0.0.1', PORT: '0', RATE_LIMIT_PER_MINUTE: '0' };
    let stderr = ''; client = new Client({ name: 'installed-english-completeness', version: '1' });
    if (mode === 'stdio') {
      const transport = new StdioClientTransport({ command: process.execPath, args: ['--require', preload, join(stage, 'server/index.cjs')], cwd: join(stage, 'empty'), env, stderr: 'pipe' });
      transport.stderr?.on('data', b => { stderr += b; }); await client.connect(transport);
    } else {
      child = spawn(process.execPath, ['--require', preload, join(stage, 'server/http.cjs')], { cwd: join(stage, 'empty'), env, stdio: ['ignore', 'ignore', 'pipe'] });
      const url = await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(Error('Fixture HTTP readiness timed out')), 30000);
        child.once('error', reject); child.once('exit', code => reject(Error(`Fixture server exited ${code}`)));
        child.stderr.on('data', b => { stderr += b; const m = stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
      });
      await client.connect(new StreamableHTTPClientTransport(new URL(url)));
    }
    let requests = 0;
    const call = async (name, args, error) => {
      requests++; const r = await client.callTool({ name, arguments: args });
      if (error) { assert.equal(r.isError, true); assert.match(r.content[0].text, error); return; }
      assert.ok(!r.isError, JSON.stringify(r.content)); assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent); return r.structuredContent;
    };
    const uid = 'patthana1.1', id = 'dt:SYNTHETIC/LARGE';
    const query = { text: tailQuote, language: 'english', texts: [uid] };
    if (mode === 'stdio' || mode === 'http') {
      const first = await call('get_translation', { uid, translation: id, limit: 500 });
      assert.equal(first.text.length, 500); assert.ok(!first.text.includes(tailQuote)); assert.equal(first.total_characters, largeText.length);
      const tail = await call('get_translation', { uid, translation: id, offset: verificationLimit, limit: 500, prefix_sha256: createHash('sha256').update(sourcePrefix).digest('hex') });
      assert.ok(tail.text.includes(tailQuote)); assert.equal(tail.next_offset, null);
      await call('verify_quote', query, /Incomplete English source.*no quotation was compared/i);
      await call('verify_quote', { ...query, text: 'Synthetic fixture prefix amber lantern' }, /Incomplete English source/);
    } else if (mixed) {
      const result = await call('verify_quote', query);
      assert.equal(result.verdict, mode === 'mixed_positive' ? 'found' : 'not_found_in_scope');
      assert.equal(result.scope.complete_source_versions_compared, 1); assert.equal(result.scope.source_versions_not_compared, 1);
      assert.equal(result.scope.translations_checked[0].translation_id, 'dt:SYNTHETIC/SMALL');
      assert.ok(result.matches.every(m => m.translation_id !== id));
      const failed = result.scope.not_retrieved[0]; assert.equal(failed.translation_id, id); assert.equal(failed.error_code, 'INCOMPLETE_ENGLISH_SOURCE'); assert.equal(failed.compared, false);
      assert.match(result.explanation, /does not establish their wording or absence/);
    } else {
      const result = await call('verify_quote', query); assert.equal(result.verdict, 'found');
      assert.equal(result.scope.complete_source_versions_compared, 1); assert.equal(result.scope.source_versions_not_compared, 0); assert.equal(result.scope.not_retrieved, undefined);
    }
    assert.doesNotMatch(stderr, /UNEXPECTED_NETWORK_ATTEMPT/);
    reports.push({ mode, requests, status: 'passed', synthetic_fixture_only: true, real_network_attempts: 0 });
    await close();
  }
  const report = { status: 'passed', cases: reports, scope: 'Extracted-package synthetic English sources only. The synthetic unread tail is reachable through the reader but is never compared as a complete verification source. Mixed-version results retain omitted sources, bounded exact-limit sources pass, and fresh complete responses recover. No real translation imported or fetched.' };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  if (reportPath) await writeFile(reportPath, JSON.stringify({ status: 'failed', error: error.message }, null, 2) + '\n'); throw error;
} finally { await close(); if (stage) await rm(stage, { recursive: true, force: true }); }
