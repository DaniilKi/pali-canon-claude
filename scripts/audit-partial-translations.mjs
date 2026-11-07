// Install-only synthetic declarations and provider responses; no source is activated in the repository.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { syntheticLink, syntheticHtml, syntheticText } from '../tests/helpers/partial-translation.mjs';
import { translationCoverage } from '../src/providers.mjs';
function option(name) { const i = process.argv.indexOf(name); if (i < 0) return; assert.ok(process.argv[i + 1]); return resolve(process.argv[i + 1]); }
const serverDir = option('--server-dir') || resolve('server'), reportPath = option('--report');
let stage, child, client, timer;
const reports = []; let previous;
const baseline = translationCoverage().total;
async function close() {
  if (client) await client.close(); client = null;
  if (child && child.exitCode === null && child.signalCode === null) { const ended = new Promise(r => child.once('exit', r)); child.kill(); await ended; }
  child = null; clearTimeout(timer);
}
try {
  stage = await mkdtemp(join(tmpdir(), 'pali-partial-fixture-'));
  await cp(serverDir, join(stage, 'server'), { recursive: true }); await mkdir(join(stage, 'empty'));
  const original = JSON.parse(await readFile(join(stage, 'server/data/translations.json'), 'utf8'));
  const preload = join(stage, 'synthetic-provider.cjs');
  for (const mode of ['stdio', 'http', 'mixed_versions', 'changed_mapping', 'changed_source']) {
    const link = mode === 'changed_mapping' ? syntheticLink('patthana1.1', 5, 9) : syntheticLink();
    const full = { ...link, url: link.url.replace('PARTIAL', 'FULL') }; delete full.partial_scope;
    await writeFile(join(stage, 'server/data/translations.json'), JSON.stringify({ ...original, 'patthana1.1': mode === 'mixed_versions' ? [link, full] : [link] }));
    const html = mode === 'changed_source' ? syntheticHtml.replace('amber', 'changed') : syntheticHtml;
    await writeFile(preload, `globalThis.fetch=async input=>{const url=String(input);if(!${JSON.stringify([link.url, full.url])}.includes(url)){console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')}return new Response(${JSON.stringify(html)},{status:200,headers:{'content-type':'text/html'}})};`);
    const env = { ...process.env, PALI_CANON_CACHE_MB: '0', HOST: '127.0.0.1', PORT: '0', RATE_LIMIT_PER_MINUTE: '0' };
    let stderr = ''; client = new Client({ name: 'installed-partial-fixture', version: '1' });
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
    const id = 'dt:SYNTHETIC/PARTIAL', uid = 'patthana1.1';
    if (mode === 'mixed_versions') {
      const selected = await call('get_translation', { uid }); assert.equal(selected.translation_id, 'dt:SYNTHETIC/FULL');
      const named = await call('get_translation', { uid, translation: 'Synthetic fixture translator' }); assert.equal(named.translation_id, selected.translation_id);
      const totals = (await call('list_sources', {})).translation_coverage.total;
      assert.equal(totals.with_english, baseline.with_english + 1); assert.equal(totals.partial_links, baseline.partial_links + 1);
      assert.equal(totals.partial_only, baseline.partial_only);
      const quote = { text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [uid] };
      const normal = await call('verify_quote', quote); assert.equal(normal.scope.partial_translations_excluded.length, 1);
      assert.ok(normal.scope.translations_checked.every(t => !t.translation_scope));
      const inclusive = await call('verify_quote', { ...quote, include_partial: true });
      assert.equal(inclusive.scope.translations_checked.length, 2);
      assert.equal(inclusive.scope.translations_checked.filter(t => t.translation_scope?.kind === 'partial_unit').length, 1);
    } else if (mode === 'changed_mapping') {
      await call('get_translation', previous, /mapping changed/);
    } else if (mode === 'changed_source') {
      await call('get_translation', { uid, translation: id, allow_partial: true }, /source text changed/);
    } else {
      const meta = await call('get_metadata', { uid });
      const resolved = await call('resolve_reference', { reference: link.url });
      assert.equal(resolved.id, uid); assert.match(resolved.notes.join(' '), /partial translation source/);
      assert.equal(meta.english_available, 0); assert.equal(meta.partial_english_available, 1);
      assert.equal(meta.english[0].translation_scope.whole_unit_coverage, false);
      const coverage = (await call('list_sources', {})).translation_coverage;
      for (const key of ['links', 'with_english', 'with_english_including_inherited', 'percent_with_english']) assert.equal(coverage.total[key], baseline[key]);
      assert.equal(coverage.total.partial_links, baseline.partial_links + 1);
      const row = coverage.collections.find(c => c.collection === 'patthana');
      assert.equal(row.with_english, 0); assert.equal(row.partial_only, 1);
      const attached = await call('get_text', { uid, translation: id, limit: 1 }); assert.match(attached.english_error, /partial unit/);
      await call('get_translation', { uid }, /Only partial/);
      await call('get_translation', { uid, translation: id }, /partial unit/);
      const first = await call('get_translation', { uid, translation: id, allow_partial: true, limit: 500 });
      assert.equal(first.text, syntheticText.slice(0, 500)); assert.equal(first.whole_unit_coverage, false);
      assert.deepEqual(first.translation_scope.read_with, { tool: 'get_text', uid, offset: 5, limit: 4 });
      const next = await call('get_translation', first.continue_with.arguments);
      assert.equal(next.text, syntheticText.slice(500, 1000)); assert.deepEqual(next.translation_scope, first.translation_scope);
      await call('get_translation', { ...first.continue_with.arguments, scope_sha256: '0'.repeat(64) }, /mapping changed/);
      await call('get_translation', { ...first.continue_with.arguments, allow_partial: false }, /partial unit/);
      if (previous) { const resumed = await call('get_translation', previous); assert.equal(resumed.text, next.text); assert.deepEqual(resumed.translation_scope, next.translation_scope); }
      previous = first.continue_with.arguments;
      const args = { text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [uid] };
      await call('verify_quote', args, /Only partial/);
      const verified = await call('verify_quote', { ...args, include_partial: true });
      assert.equal(verified.verdict, 'found'); assert.equal(verified.matches[0].whole_unit_coverage, false);
      assert.equal(verified.matches[0].translation_scope.first_ref, 'patthana1.1/6');
      const negative = await call('verify_quote', { ...args, text: 'Purple zeppelin reaches distant synthetic harbor', include_partial: true });
      assert.equal(negative.verdict, 'not_found_in_scope'); assert.match(negative.explanation, /Partial translation.*negative result/);
    }
    assert.doesNotMatch(stderr, /UNEXPECTED_NETWORK_ATTEMPT/);
    reports.push({ mode, requests, status: 'passed', synthetic_fixture_only: true, real_network_attempts: 0 });
    await close();
  }
  const report = { status: 'passed', cases: reports, scope: 'Extracted-package synthetic metadata/provider fixtures only. Explicit partial retrieval, source/mapping pins, verification, coverage and restart guards. No real translation adopted, fetched or approved.' };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  if (reportPath) await writeFile(reportPath, JSON.stringify({ status: 'failed', error: error.message }, null, 2) + '\n'); throw error;
} finally { await close(); if (stage) await rm(stage, { recursive: true, force: true }); }
