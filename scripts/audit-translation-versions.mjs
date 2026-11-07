// Install-only synthetic declarations and provider responses; no source is activated in the repository.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { earlierQuote, currentQuote, earlierVersion, currentVersion, versionHtml } from '../tests/helpers/translation-versions.mjs';
import { syntheticShared } from '../tests/helpers/shared-translation.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';
import { syntheticLink, syntheticHtml, syntheticText } from '../tests/helpers/partial-translation.mjs';
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
  stage = await mkdtemp(join(tmpdir(), 'pali-exact-versions-'));
  await cp(serverDir, join(stage, 'server'), { recursive: true }); await mkdir(join(stage, 'empty'));
  const original = JSON.parse(await readFile(join(stage, 'server/data/translations.json'), 'utf8'));
  const preload = join(stage, 'synthetic-provider.cjs');
  const canonicalEarlierUrl = earlierVersion.url.replace('www.', '');
  const mirrorUrl = 'https://raw.githubusercontent.com/bcbsit/ati/main' + earlierVersion.path + '.html';
  for (const mode of ['stdio', 'http', 'primary_outage', 'ati_mirror', 'partial', 'shared']) {
    const translations = { ...original, 'patthana1.1': [currentVersion, earlierVersion] };
    const partial = syntheticLink(), shared = syntheticShared(['dhp1', 'dhp2']);
    if (mode === 'partial') translations['patthana1.1'].push(partial);
    if (mode === 'shared') translations.dhp1 = [shared];
    await writeFile(join(stage, 'server/data/translations.json'), JSON.stringify(translations));
    const bodies = { [currentVersion.url]: versionHtml(currentQuote), [canonicalEarlierUrl]: versionHtml(earlierQuote), [mirrorUrl]: versionHtml(earlierQuote), [partial.url]: syntheticHtml, [shared.url]: syntheticHtml };
    await writeFile(preload, `const bodies=${JSON.stringify(bodies)};const fail=()=>{console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')};globalThis.fetch=async input=>{const url=String(input);if(!Object.hasOwn(bodies,url))return fail();console.error('SYNTHETIC_FETCH '+url);if((${JSON.stringify(mode)}==='primary_outage'&&url===${JSON.stringify(currentVersion.url)})||(${JSON.stringify(mode)}==='ati_mirror'&&url===${JSON.stringify(canonicalEarlierUrl)}))return new Response('Synthetic outage',{status:503});return new Response(bodies[url],{status:200,headers:{'content-type':'text/html'}})};for(const name of ['node:http','node:https']){const m=require(name);m.request=fail;m.get=fail}const net=require('node:net');net.connect=fail;net.createConnection=fail;require('node:module').syncBuiltinESMExports();`);
    const env = { ...process.env, PALI_CANON_CACHE_MB: '0', HOST: '127.0.0.1', PORT: '0', RATE_LIMIT_PER_MINUTE: '0' };
    let stderr = ''; client = new Client({ name: 'installed-exact-translation-versions', version: '1' });
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
    const uid = 'patthana1.1', currentId = 'dt:SYNTHETIC/CURRENT', earlierId = 'ati:/tipitaka/synthetic/earlier';
    const args = { text: earlierQuote, language: 'english', texts: [uid] };
    if (mode === 'primary_outage') {
      await call('verify_quote', { ...args, translation_ids: [currentId] }, /could be retrieved/);
      assert.ok(!stderr.includes('SYNTHETIC_FETCH ' + canonicalEarlierUrl), 'Exact current selection must not fetch its earlier fallback');
      const normal = await call('verify_quote', args); assert.equal(normal.verdict, 'found'); assert.equal(normal.matches[0].translation_id, earlierId); assert.equal(normal.matches[0].requested_translation_id, currentId); assert.match(normal.matches[0].notes.join(' '), /earlier version/);
      const both = await call('verify_quote', { ...args, translation_ids: [currentId, earlierId] }); assert.equal(both.verdict, 'found'); assert.equal(both.scope.translations_checked.length, 1); assert.equal(both.scope.not_retrieved[0].translation_id, currentId); assert.equal(both.scope.not_retrieved[0].compared, false);
    } else if (mode === 'ati_mirror') {
      const selected = await call('verify_quote', { ...args, translation_ids: [earlierId] }); assert.equal(selected.verdict, 'found'); assert.equal(selected.matches[0].translation_id, earlierId); assert.match(selected.matches[0].notes.join(' '), /BCBS official repository/); assert.ok(!stderr.includes('SYNTHETIC_FETCH ' + currentVersion.url));
    } else if (mode === 'partial' || mode === 'shared') {
      const isPartial = mode === 'partial', target = isPartial ? uid : 'dhp2', id = isPartial ? 'dt:SYNTHETIC/PARTIAL' : 'dt:SYNTHETIC/SHARED';
      const scoped = { text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [target], translation_ids: [id] };
      const count = (stderr.match(/SYNTHETIC_FETCH /g) || []).length;
      await call('verify_quote', scoped, isPartial ? /include_partial/ : /include_shared/); assert.equal((stderr.match(/SYNTHETIC_FETCH /g) || []).length, count);
      const found = await call('verify_quote', { ...scoped, [isPartial ? 'include_partial' : 'include_shared']: true });
      assert.equal(found.verdict, 'found'); assert.equal(found.scope.translations_checked.length, 1); assert.equal(found.matches[0].translation_id, id); assert.equal(found.matches[0].translation_scope.kind, isPartial ? 'partial_unit' : 'shared_page'); assert.equal(found.matches[0].whole_unit_coverage, false);
      if (!isPartial) { assert.equal(found.matches[0].text_id, null); assert.equal(found.scope.requested_texts[0].translation_scope.text_id, null); assert.deepEqual(found.matches[0].unverified_requested_text_ids, ['dhp2']); }
    } else {
      const meta = await call('get_metadata', { uid }); assert.ok(meta.english.some(t => t.translation_id === earlierId));
      const normal = await call('verify_quote', args); assert.equal(normal.verdict, 'not_found_in_scope'); assert.equal(normal.scope.translations_checked.length, 1); assert.equal(normal.scope.translations_checked[0].translation_id, currentId); assert.equal(normal.scope.translation_selection.mode, 'preferred_per_translator');
      const reader = await call('get_translation', { uid, translation: earlierId }); assert.ok(reader.text.includes(earlierQuote));
      const selected = await call('verify_quote', { ...args, translation_ids: [earlierId] }); assert.equal(selected.verdict, 'found'); assert.equal(selected.matches[0].translation_id, earlierId); assert.equal(selected.matches[0].license, 'Synthetic fixture terms only'); assert.equal(selected.scope.translation_selection.fallback_allowed, false);
      const both = await call('verify_quote', { ...args, translation_ids: [currentId, earlierId] }); assert.equal(both.verdict, 'found'); assert.deepEqual(new Set(both.scope.translations_checked.map(t => t.translation_id)), new Set([currentId, earlierId]));
      const current = await call('verify_quote', { ...args, translation_ids: [currentId] }); assert.equal(current.verdict, 'not_found_in_scope'); assert.equal(current.scope.translations_checked[0].translation_id, currentId);
      const fetches = (stderr.match(/SYNTHETIC_FETCH /g) || []).length;
      await call('verify_quote', { ...args, translation_ids: ['ati:/unknown'] }, /not linked/);
      await call('verify_quote', { ...args, translation_ids: ['dt:MN/MN10'] }, /not linked/);
      await call('verify_quote', { ...args, texts: undefined, translation_ids: [earlierId] }, /explicit texts/);
      await call('verify_quote', { ...args, texts: [uid, 'MN 10'], translation_ids: [earlierId] }, /every requested text/);
      await call('verify_quote', { ...args, translation_ids: ['Thanissaro'] }, /exact translation IDs/);
      assert.equal((stderr.match(/SYNTHETIC_FETCH /g) || []).length, fetches);
      const duplicates = await call('verify_quote', { ...args, translation_ids: [' ' + earlierId + ' ', earlierId] }); assert.equal(duplicates.scope.translations_checked.length, 1); assert.deepEqual(duplicates.scope.translation_selection.translation_ids, [earlierId]);
      for (const script of SCRIPTS) { const native = await call('verify_quote', { ...args, texts: [transliterate(uid, 'roman', script)], translation_ids: [earlierId] }); assert.equal(native.verdict, 'found'); assert.equal(native.matches[0].translation_id, earlierId); assert.equal(native.scope.requested_texts[0].input_script, script === 'roman' ? undefined : script); }
    }
    assert.doesNotMatch(stderr, /UNEXPECTED_NETWORK_ATTEMPT/);
    reports.push({ mode, transport: mode === 'stdio' ? 'stdio' : 'http', requests, status: 'passed', synthetic_fixture_only: true, real_network_attempts: 0 });
    await close();
  }
  const report = { status: 'passed', cases: reports, scope: 'Extracted-package synthetic current/earlier translation versions only. Exact linked IDs, no different-version fallback, same-version ATI mirror provenance, atomic scope rejection, native references and scoped-source consent through stdio/HTTP. No real translation imported or publisher requested.' };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  if (reportPath) await writeFile(reportPath, JSON.stringify({ status: 'failed', error: error.message }, null, 2) + '\n'); throw error;
} finally { await close(); if (stage) await rm(stage, { recursive: true, force: true }); }
