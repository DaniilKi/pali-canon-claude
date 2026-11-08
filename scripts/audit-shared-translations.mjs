// Installed-package shared contracts: synthetic providers plus real declaration metadata, never live author requests.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { syntheticLink, syntheticHtml, syntheticText } from '../tests/helpers/partial-translation.mjs';
import { syntheticShared, sharedIds } from '../tests/helpers/shared-translation.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';
import { translationCoverage } from '../src/providers.mjs';
import { fetchRecorderSource, readFetchLedger } from '../tests/helpers/synthetic-fetch-ledger.mjs';
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
  const reviewedPages = Object.values(original).flat().filter(l => l.match === 'reviewed-shared-page');
  const modes = ['stdio', 'http', 'mixed_versions', 'changed_mapping', 'changed_source', 'removed_scope', 'aj_shared_metadata', 'aj_partial_metadata', 'aj_invalid_metadata'].map(mode=>[mode,null]);
  for(const page of reviewedPages) modes.push(['reviewed_metadata',page],['reviewed_notice_downgrade',page]);
  const originalAj = JSON.parse(await readFile(join(stage, 'server/data/anandajoti.json'), 'utf8'));
  for (const [mode, reviewed] of modes) {
    const fetchLog = join(stage, 'fixture-fetches.jsonl'); await writeFile(fetchLog, '');
    const link = syntheticShared(); if (mode === 'changed_mapping') link.reference += ' changed';
    const full = { ...link, url: link.url.replace('SHARED', 'FULL') }; delete full.shared_scope;
    const translations = { ...original };
    if (!mode.startsWith('reviewed_')) { for (const uid of sharedIds) delete translations[uid]; translations.iti10 = [link]; }
    if (mode === 'mixed_versions') translations.iti11 = [full];
    if (mode === 'reviewed_notice_downgrade') {
      const bad = structuredClone(reviewed); bad.shared_scope.presentation = 'condensed'; delete bad.shared_scope.notice_sha256;
      translations[reviewed.shared_scope.owner_id] = [bad];
    }
    if (mode === 'removed_scope') { delete translations.iti10; const removed = { ...link }; delete removed.shared_scope; translations.iti11 = [removed]; }
    const aj = { ...originalAj, links: { ...originalAj.links } };
    if (mode.startsWith('aj_')) {
      const partial = mode === 'aj_partial_metadata'; const scoped = partial ? syntheticLink() : link;
      delete translations.iti10;
      aj.links[partial ? 'patthana1.1' : 'iti10'] = { path: '/Texts-and-Translations/Short-Pieces/Synthetic-Scoped.htm', reference: scoped.reference, match: 'synthetic-test-only',
        ...(partial ? { partial_scope: scoped.partial_scope } : { shared_scope: mode === 'aj_invalid_metadata' ? null : scoped.shared_scope }) };
    }
    await writeFile(join(stage, 'server/data/translations.json'), JSON.stringify(translations));
    await writeFile(join(stage, 'server/data/anandajoti.json'), JSON.stringify(aj));
    const html = mode === 'changed_source' ? syntheticHtml.replace('amber', 'changed') : syntheticHtml;
    const allowed = mode.startsWith('reviewed_') ? [reviewed.url] : [link.url, full.url];
    await writeFile(preload, `${fetchRecorderSource(fetchLog)}globalThis.fetch=async input=>{const url=String(input);if(!${JSON.stringify(allowed)}.includes(url))return rejectUnexpectedNetwork();recordSyntheticFetch(url);return new Response(${JSON.stringify(html)},{status:200,headers:{'content-type':'text/html'}})};`);
    const env = { ...process.env, PALI_CANON_CACHE_MB: '0', HOST: '127.0.0.1', PORT: '0', RATE_LIMIT_PER_MINUTE: '0', CHATGPT_WIDGET: '1' };
    let stderr = ''; client = new Client({ name: 'installed-shared-fixture', version: '1' });
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
    const id = 'dt:SYNTHETIC/SHARED', uid = 'iti11';
    if (mode === 'reviewed_notice_downgrade') {
      await call('get_metadata', { uid: reviewed.shared_scope.owner_id }, /Invalid or unreviewed/);
      assert.equal((await readFetchLedger(fetchLog)).length, 0, 'Changing presentation cannot remove mandatory ATI notice protection');
    } else if (mode === 'reviewed_metadata') {
      const realId = 'ati:' + reviewed.path, members = reviewed.shared_scope.text_ids;
      for (const member of members) {
        const meta = await call('get_metadata', { uid: member });
        const scope = meta.english.find(l => l.translation_id === realId).translation_scope;
        assert.equal(meta.english_available, 0); assert.equal(meta.shared_english_available, 1);
        assert.ok(['compilation','condensed'].includes(reviewed.shared_scope.presentation));
        assert.equal(scope.presentation, reviewed.shared_scope.presentation); assert.equal(scope.condensed, reviewed.shared_scope.presentation === 'condensed');
        assert.equal(scope.whole_unit_coverage, false); assert.equal(scope.individual_alignment_verified, false);
        assert.deepEqual(scope.text_ids, members); assert.ok(scope.notice_sha256);
      }
      const member = members.at(-1);
      await call('resolve_reference', { reference: reviewed.url }, /Shared-page URL/);
      await call('get_translation', { uid: member }, /allow_shared/);
      await call('get_translation', { uid: member, translation: realId }, /allow_shared/);
      await call('verify_quote', { text: 'Synthetic fixture only amber lantern', language: 'english', texts: [member], translation_ids: [realId] }, /include_shared/);
      assert.equal((await readFetchLedger(fetchLog)).length, 0, 'Real metadata and missing consent must not fetch');
      const widget = await call('read_passage_widget', { uid: member, translation: realId, english: true, limit: 1 });
      assert.match(widget.english_error, /shared-page/); assert.equal(widget.english, null);
      assert.equal((await readFetchLedger(fetchLog)).length, 0);
      await call('get_translation', { uid: member, translation: realId, allow_shared: true }, /source text changed/);
      assert.equal((await readFetchLedger(fetchLog)).filter(e => e.kind === 'fetch').length, 1, 'Changed source comparison uses only the simulated provider');
      const totals = (await call('list_sources', {})).translation_coverage.total;
      for (const field of ['links', 'with_english', 'with_english_including_inherited', 'shared_links', 'with_shared_english', 'shared_only']) assert.equal(totals[field], baseline[field]);
    } else if (mode === 'aj_invalid_metadata') {
      await call('get_metadata', { uid }, /Invalid or unreviewed/);
    } else if (mode.startsWith('aj_')) {
      const target = mode === 'aj_partial_metadata' ? 'patthana1.1' : uid;
      const meta = await call('get_metadata', { uid: target });
      const scoped = meta.english.find(t => t.translation_id.startsWith('aj:') && t.translation_scope);
      assert.ok(scoped, 'Merged scoped AJ metadata must not become a whole-unit link');
      assert.equal(scoped.translation_scope.kind, mode === 'aj_partial_metadata' ? 'partial_unit' : 'shared_page');
      assert.equal(scoped.translation_scope.whole_unit_coverage, false);
      await call('get_translation', { uid: target, translation: scoped.translation_id }, /partial unit|shared-page/);
    } else if (mode === 'changed_mapping') {
      await call('get_translation', previous, /mapping changed/);
    } else if (mode === 'changed_source') {
      await call('get_translation', { uid, translation: id, allow_shared: true }, /source text changed/);
    } else if (mode === 'removed_scope') {
      await call('get_translation', previous, /no longer has a declared shared-page scope/);
    } else if (mode === 'mixed_versions') {
      const selected = await call('get_translation', { uid }); assert.equal(selected.translation_id, 'dt:SYNTHETIC/FULL');
      assert.equal((await call('get_translation', { uid, translation: link.translator })).translation_id, selected.translation_id);
      const totals = (await call('list_sources', {})).translation_coverage.total;
      assert.equal(totals.links, baseline.links); assert.equal(totals.with_english, baseline.with_english); assert.equal(totals.shared_links, (baseline.shared_links || 0) + 1); assert.equal(totals.with_shared_english, (baseline.with_shared_english || 0) + 4); assert.equal(totals.shared_only, (baseline.shared_only || 0) + 3);
      const args = { text: 'amber lantern copper window', language: 'english', texts: [uid] };
      const normal = await call('verify_quote', args); assert.equal(normal.scope.shared_translations_excluded.length, 1); assert.ok(normal.matches.every(m => m.text_id === uid));
      const inclusive = await call('verify_quote', { ...args, include_shared: true }); assert.equal(inclusive.scope.translations_checked.length, 2); assert.equal(inclusive.equally_similar_texts, undefined); assert.equal(inclusive.equally_similar_sources, 2);
      assert.ok(inclusive.scope.translations_checked.some(m => m.translation_scope?.kind === 'shared_page'));
      for (const shared of inclusive.matches.filter(m => m.translation_scope?.kind === 'shared_page')) assert.equal(shared.text_id, null);
    } else {
      for (const member of sharedIds) { const meta = await call('get_metadata', { uid: member }); assert.equal(meta.english_available, 0); assert.equal(meta.shared_english_available, 1); assert.deepEqual(meta.english[0].translation_scope.text_ids, sharedIds); }
      const totals = (await call('list_sources', {})).translation_coverage.total;
      for (const k of ['links', 'with_english', 'with_english_including_inherited']) assert.equal(totals[k], baseline[k] - 1, k);
      assert.equal(totals.shared_links, (baseline.shared_links || 0) + 1); assert.equal(totals.with_shared_english, (baseline.with_shared_english || 0) + 4); assert.equal(totals.shared_only, (baseline.shared_only || 0) + 4);
      await call('resolve_reference', { reference: link.url }, /Shared-page URL.*iti10, iti11, iti12, iti13/);
      await call('get_text', { uid: link.url }, /Shared-page URL/);
      await call('get_translation', { uid }, /allow_shared/);
      await call('get_translation', { uid, translation: id }, /allow_shared/);
      await call('get_translation', { uid, translation: id, allow_partial: true }, /shared-page/);
      const attached = await call('get_text', { uid, translation: id, limit: 1 }); assert.match(attached.english_error, /shared-page/); assert.equal(attached.english, undefined);
      if (mode === 'http') { const widget = await call('read_passage_widget', { uid, translation: id, english: true, limit: 1 }); assert.match(widget.english_error, /shared-page/); assert.equal(widget.english, null); }
      const first = await call('get_translation', { uid, translation: id, allow_shared: true, limit: 500 });
      assert.equal(first.text, syntheticText.slice(0, 500)); assert.equal(first.text_id, null); assert.equal(first.requested_text_id, uid); assert.equal(first.whole_unit_coverage, false);
      assert.deepEqual(first.translation_scope.text_ids, sharedIds); assert.equal(first.translation_scope.individual_alignment_verified, false);
      const next = await call('get_translation', first.continue_with.arguments); assert.equal(next.text, syntheticText.slice(500, 1000));
      await call('get_translation', { ...first.continue_with.arguments, scope_sha256: '0'.repeat(64) }, /mapping changed/);
      await call('get_translation', { ...first.continue_with.arguments, allow_shared: false }, /shared-page/);
      if (previous) { const resumed = await call('get_translation', previous); assert.equal(resumed.text, next.text); assert.deepEqual(resumed.translation_scope, next.translation_scope); }
      previous = first.continue_with.arguments;
      const args = { text: 'amber lantern copper window', language: 'english', texts: ['iti11', 'iti13'] };
      await call('verify_quote', args, /include_shared/);
      await call('verify_quote', { ...args, include_shared: true, texts: undefined }, /explicit texts/);
      const verified = await call('verify_quote', { ...args, include_shared: true }); assert.equal(verified.verdict, 'found'); assert.equal(verified.scope.translations_checked.length, 1); assert.equal(verified.scope.requested_texts[0].translation_scope.text_id, null);
      assert.equal(verified.matches[0].text_id, null); assert.deepEqual(verified.matches[0].unverified_requested_text_ids, ['iti11', 'iti13']);
      const negative = await call('verify_quote', { ...args, text: 'Purple zeppelin reaches distant synthetic harbor', include_shared: true }); assert.equal(negative.verdict, 'not_found_in_scope'); assert.match(negative.explanation, /do not establish any individual/);
      for (const script of SCRIPTS) { const read = await call('get_translation', { uid: transliterate(uid, 'roman', script), translation: id, allow_shared: true, limit: 500 }); assert.equal(read.text_id, null); assert.equal(read.requested_text_id, uid); assert.deepEqual(read.translation_scope, first.translation_scope); }
    }
    assert.doesNotMatch(stderr, /UNEXPECTED_NETWORK_ATTEMPT/);
    assert.equal((await readFetchLedger(fetchLog)).filter(e => e.kind === 'unexpected').length, 0);
    reports.push({ mode, ...(reviewed ? {source_path:reviewed.path} : {}), requests, status: 'passed', synthetic_provider_only: true, real_declaration_metadata: mode.startsWith('reviewed_'), real_network_attempts: 0 });
    await close();
  }
  const report = { status: 'passed', cases: reports, scope: 'Extracted-package synthetic shared-page contracts and real reviewed-page metadata with simulated providers only. One page, explicit opt-in, no individual/whole-unit alignment, bounded pinned restart, eight input scripts, HTTP/widget and merged AJ metadata without any author-host request. Real reviewed-page metadata/consent/widget refusal/source-drift checks contain no publisher text and make no author-host request.' };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  if (reportPath) await writeFile(reportPath, JSON.stringify({ status: 'failed', error: error.message }, null, 2) + '\n'); throw error;
} finally { await close(); if (stage) await rm(stage, { recursive: true, force: true }); }
