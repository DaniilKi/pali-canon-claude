import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCitation, CitationError } from '../src/citations.mjs';
import * as canon from '../src/canon.mjs';
import { cleanDpdText } from '../src/providers.mjs';
import { plainText } from '../src/http.mjs';

const id = (ref) => canon.resolve(ref).unit.id;

test('common citation forms resolve to the same text', () => {
  for (const ref of ['MN 10', 'mn10', 'M 10', 'MN10', 'MN 010', 'mn.010', 'Majjhima Nikāya 10', 'Majjhima 10', 'M i 55', 'M.i.55', 'M I 55']) {
    assert.equal(id(ref), 'mn10', ref);
  }
  for (const ref of ['SN 56.11', 'SN 56:11', 'S 56.11', 'sn56.11', 'sn56.11:5.1', 'Saṃyutta 56.11', 'Samyutta Nikaya 56.11', 'S v 420', 'S.V.420']) {
    assert.equal(id(ref), 'sn56.11', ref);
  }
  for (const ref of ['AN 3.65', 'AN 3:65', 'an03.065', 'A i 188', 'Aṅguttara 3.65']) assert.equal(id(ref), 'an3.65', ref);
});

test('Sutta Nipāta and Saṃyutta are told apart by case', () => {
  assert.equal(id('Sn 1.8'), 'snp1.8');
  assert.equal(id('Snp 1.8'), 'snp1.8');
  assert.equal(id('SN 1.8'), 'sn1.8');
  assert.equal(canon.resolve('Snp 1.8').unit.title, 'Mettasuttaṃ');
  assert.throws(() => canon.resolve('Sn 1032'), /verse number/);
});

test('Khuddaka collections', () => {
  assert.equal(id('Dhp 183'), 'dhp183');
  assert.equal(id('Dhp 1–20'), 'dhp1-20');
  assert.equal(id('Dhammapada 5'), 'dhp5');
  assert.equal(id('Iti 27'), 'iti27');
  assert.equal(id('It 27'), 'iti27');
  assert.equal(id('Kp 9'), 'kp9');
  assert.equal(id('Khp 9'), 'kp9');
  assert.equal(id('Ud 1.10'), 'ud1.10');
  assert.equal(canon.resolve('Ud 1.10').unit.title, 'Bāhiyasuttaṃ');
  assert.equal(id('Thag 1.1'), 'thag1.1');
  assert.equal(id('Thig 5.4'), 'thig5.4');
  assert.equal(id('Ja 1'), 'ja1');
  assert.equal(id('Thi Ap 1'), 'thi-ap1');
  assert.equal(canon.resolve('Thi Ap 1').unit.title, 'Sumedhātherīapadānaṃ');
});

test('texts printed together resolve by member number, with a note', () => {
  const r = canon.resolve('AN 10.208');
  assert.equal(r.unit.id, 'an10.199-210');
  assert.ok(r.notes.some((n) => /not printed separately/.test(n)));
  assert.match(id('AN 1.300'), /^an1\.\d+-\d+$/);
  assert.match(id('SN 46.150'), /^sn46\.\d+-\d+$/);
});

test('Vinaya rules, khandhakas and PTS volumes', () => {
  assert.equal(id('Pj 1'), 'pli-tv-bu-vb-pj1');
  assert.equal(id('Bu Pj 1'), 'pli-tv-bu-vb-pj1');
  assert.equal(id('Pārājika 1'), 'pli-tv-bu-vb-pj1');
  assert.equal(id('Bi Pc 5'), 'pli-tv-bi-vb-pc5');
  assert.equal(id('Bu As 1-7'), 'pli-tv-bu-vb-as1-7');
  assert.equal(id('Mv 1'), 'pli-tv-kd1');
  assert.equal(id('Cv 4'), 'pli-tv-kd14');
  assert.equal(id('Kd 11'), 'pli-tv-kd11');
  assert.equal(id('Vin i 1'), 'pli-tv-kd1');
  assert.equal(id('Vin ii 1'), 'pli-tv-kd11');
  assert.equal(id('Vin iii 1'), 'pli-tv-bu-vb-pj1');
  assert.equal(id('Vin iv 1'), 'pli-tv-bu-vb-pc1');
  assert.equal(id('Vin v 1'), 'pli-tv-pvr1.1');
});

test('PTS-numbered translations map to the standard text', () => {
  assert.equal(id('https://www.dhammatalks.org/suttas/AN/AN7_64.html'), 'an7.68');
  assert.equal(id('https://www.dhammatalks.org/suttas/AN/AN3_66.html'), 'an3.65');
  assert.equal(id('https://www.accesstoinsight.org/tipitaka/an/an03/an03.065.than.html'), 'an3.65');
  assert.ok(canon.resolve('AN 7.68').notes.some((n) => /AN 7\.64/.test(n)));
  assert.equal(id('https://suttacentral.net/mn10/en/sujato#3.1'), 'mn10');
});

test('bad input fails clearly, never silently', () => {
  for (const ref of ['MN 153', 'XYZ 1', 'Ja i 1', '', 'https://example.org/mn10', '../etc/passwd']) {
    assert.throws(() => canon.resolve(ref), CitationError, ref);
  }
  assert.throws(() => parseCitation('MN 1; rm -rf /'));
});

test('Pāli text renders with paragraphs, verses and PTS page breaks', () => {
  const u = canon.resolve('MN 10').unit;
  const segs = canon.segments(u);
  assert.ok(segs.some((s) => s.text.startsWith('Evaṃ me sutaṃ')));
  assert.ok(segs.some((s) => (s.pts_page_begins || []).includes('M i 56')));
  const verse = canon.segments(canon.resolve('Dhp 183').unit).find((s) => s.type === 'verse');
  assert.match(verse.text, /Sabbapāpassa akaraṇaṃ[^]*\n/);
});

test('offline search finds Pāli without diacritics', () => {
  const r = canon.search('"sabbe sankhara anicca"', { collection: 'dhp' });
  assert.ok(r.results.some((x) => x.id === 'dhp277'));
  assert.ok(canon.search('anapanassati', { limit: 3 }).results.length);
});

test('dictionary and HTML cleaning', () => {
  const cleaned = cleanDpdText('<p>sati 1.1</p><p>fem.</p><p>Did you spot a mistake?</p><p>Correct it here.</p><p>memory</p><p>Frequency of</p><p>table</p>');
  assert.equal(cleaned.includes('mistake'), false);
  assert.equal(cleaned.includes('table'), false);
  assert.equal(plainText('<p><span class="ref">Nya 1</span>Thus I heard</p>'), 'Thus I heard');
  assert.equal(plainText('<i>dhamma</i>s'), 'dhammas');
});

test('#49 DPD declension and conjugation tables, tab buttons and frequency are stripped', () => {
  const html = `<div class="dpd"><p class="dpd summary">sati 1.1 fem. memory</p></div>
    <div class="button-box"><a class="dpd-button" data-target="grammar_sati_1_1">grammar</a><a class="dpd-button">declension</a></div>
    <div id="grammar_sati_1_1" class="dpd content hidden"><table class="grammar"><tr><th>Grammar</th><td>fem, abstr</td></tr></table></div>
    <div id="declension_sati_1_1" class="dpd content hidden"><p class='heading'><b>sati</b> is <b>i fem</b> declension</p>
      <table class='inflection'><tr><th>nom</th><td>sat<b>i</b></td></tr></table>
      <div><p>Inflections not found in any Pāḷi corpus are grayed out.</p></div></div>
    <div id="conjugation_gacchati_1" class="dpd content hidden"><table class='inflection'><tr><th>pr</th><td>gacchāmi</td></tr></table></div>
    <div id="family_root_sati_1_1" class="dpd content hidden"><p>words in the root family √sar</p></div>
    <div id="frequency_sati_1_1" class="dpd content hidden"><table class="freq"><tr><td>1644</td></tr></table></div>
    <div class="dpd"><p class="dpd summary">sati 1.2 fem. mindfulness</p></div>`;
  const cleaned = cleanDpdText(html);
  for (const noise of ['declension', 'conjugation', 'sati\nnom', 'gacchāmi', 'grayed out', '1644', 'grammar\n']) {
    assert.equal(cleaned.includes(noise), false, noise);
  }
  for (const kept of ['sati 1.1 fem. memory', 'fem, abstr', 'root family √sar', 'sati 1.2 fem. mindfulness']) {
    assert.ok(cleaned.includes(kept), kept);
  }
});

test('#49 browse_canon labels sections with the collection name, not its key', () => {
  for (const [node, name, collection] of [['sn56', 'Saṃyutta Nikāya', 'sn'], ['an4', 'Aṅguttara Nikāya', 'an'], ['kv1', 'Kathāvatthu', 'kv']]) {
    const r = canon.browse(node, { limit: 1 });
    assert.equal(r.name, name, node);
    assert.equal(r.collection, collection, node);
  }
  assert.equal(canon.browse('sn', { limit: 1 }).name, 'Saṃyutta Nikāya');
  assert.equal(canon.browse('mn', { limit: 1 }).collection, undefined);
  for (const c of canon.browse('canon', { limit: 100 }).items) assert.notEqual(c.name, undefined, c.id);
});

test('regressions from independent review: no silent wrong answers', () => {
  assert.equal(id('Bhikkhuni Ss 1'), 'pli-tv-bi-vb-ss1');
  assert.equal(id('bhikkhunī ss 1'), 'pli-tv-bi-vb-ss1');
  assert.equal(id('Bhikkhunī Pārājika 5'), 'pli-tv-bi-vb-pj5');
  for (const ref of ['Mv 11', 'Cv 0', 'Cv 13', 'Kd 23', 'Kd 1.2', 'Kd 1-3', 'MN 12-10', 'Th i 1', 'Sn i 25', 'Thi i 1']) {
    assert.throws(() => canon.resolve(ref), CitationError, ref);
  }
  assert.equal(id('S i 1'), 'sn1.1');
  assert.equal(id('Ds 1.1'), 'ds1.1');
  const snp = canon.describe(canon.resolve('Snp 1.8').unit);
  assert.doesNotMatch(String(snp.pts), /null/);
  assert.equal(canon.resolve('MN 1').unit.title.includes('vagg'), false);
  assert.equal(canon.resolve('SN 56.11').unit.title.includes('vagg'), false);
  assert.doesNotMatch(canon.resolve('Ss 1').unit.title, /^Ime kho/);
  assert.ok(!canon.resolve('S v 420').notes.some((n) => /PTS PTS/.test(n)));
});

test('translation links agree with Pāli ordinals and never point at a sibling sutta', () => {
  const d = canon.load();
  const ord = { pathama: 1, dutiya: 2, tatiya: 3, catuttha: 4, pancama: 5 };
  for (const [tid, links] of Object.entries(d.translations)) {
    const t = canon.fold(d.byId.get(tid).title || '');
    const p = Object.entries(ord).find(([w]) => t.startsWith(w))?.[1];
    for (const l of links) {
      const e = (l.reference || '').match(/\((\d)\)/);
      if (p && e) assert.equal(Number(e[1]), p, `${tid} ↔ ${l.reference}`);
    }
    const dt = new Set(links.filter((l) => l.source === 'dhammatalks').map((l) => l.url));
    assert.ok(dt.size <= 1, `${tid} has several dhammatalks pages`);
  }
  // Cases found by review: wrong links must be gone.
  const urls = (x) => (d.translations[x] || []).map((l) => l.url).join(' ');
  assert.doesNotMatch(urls('an10.100'), /AN10_76/);
  assert.doesNotMatch(urls('an10.48'), /AN10_59/);
  assert.doesNotMatch(urls('sn3.12'), /SN3_3\./);
  assert.doesNotMatch(urls('ud6.6'), /ud6_4/);
  assert.match(urls('an3.65'), /AN3_66/);
  assert.match(urls('an7.68'), /AN7_64/);
});

test('a verse inherits its chapter translations, with a note', () => {
  const u = canon.resolve('Dhp 183').unit;
  const desc = canon.describe(u);
  assert.ok(desc.english.length > 0);
  assert.ok(desc.notes.some((n) => /whole Dhp 179/.test(n)));
});

test('CI runs the full matrix and the nightly job reports source health', async () => {
  const { readFile } = await import('node:fs/promises');
  const check = await readFile(new URL('../.github/workflows/check.yml', import.meta.url), 'utf8');
  // Loose checks, so reordering or reformatting the YAML does not break this test.
  const matrixLine = (key) => check.match(new RegExp(`^\\s*${key}:\\s*\\[([^\\]]*)\\]`, 'm'))?.[1].split(',').map((v) => v.trim()) ?? [];
  for (const os of ['ubuntu-latest', 'macos-latest', 'windows-latest']) assert.ok(matrixLine('os').includes(os), os);
  for (const node of ['20', '22']) assert.ok(matrixLine('node').includes(node), `node ${node}`);
  assert.match(check, /git diff --exit-code -- server\//);
  const nightly = await readFile(new URL('../.github/workflows/nightly.yml', import.meta.url), 'utf8');
  assert.match(nightly, /^\s*schedule:/m);
  assert.match(nightly, /^\s*workflow_dispatch:/m);
  assert.match(nightly, /issues:\s*write/);
  for (const run of [/npm run smoke -- --live/, /npm run outage/, /scripts\/linkcheck\.mjs/]) assert.match(nightly, run);
  for (const step of ['smoke', 'outage', 'linkcheck']) {
    assert.match(nightly, new RegExp(`id:\\s*${step}\\b`), `step ${step}`);
    assert.match(nightly, new RegExp(`steps\\.${step}\\.outcome`), `issue and fail conditions use ${step}`);
  }
  assert.match(nightly, /Source health/);
  const outage = await readFile(new URL('../scripts/outage.mjs', import.meta.url), 'utf8');
  assert.match(outage, /process\.exitCode = 1/, 'outage script must fail the nightly run on unexpected results');
  assert.match(outage, /ALLOWED_HOSTS/, 'total outage must block every allowlisted host');
});

test('total-outage hosts cover the whole allowlist, www and bare variants included', async () => {
  const { ALLOWED_HOSTS } = await import('../src/http.mjs');
  for (const host of ['accesstoinsight.org', 'www.accesstoinsight.org', 'dhammatalks.org', 'www.dhammatalks.org', 'dpdict.net', 'www.dpdict.net', 'raw.githubusercontent.com', 'cdn.jsdelivr.net']) {
    assert.ok(ALLOWED_HOSTS.includes(host), host);
  }
});

test('link check covers every translation link over a rotation of daily samples', async () => {
  const { collectLinks, dailySample } = await import('../scripts/linkcheck.mjs');
  const links = collectLinks({
    a: [{ url: 'https://www.dhammatalks.org/x.html' }, { url: 'https://www.accesstoinsight.org/y.html', path: '/y', source: 'ati' }],
    b: [{ url: 'https://www.dhammatalks.org/x.html' }, { source: 'none' }],
  });
  assert.equal(links.length, 2, 'duplicates merged, entries without a URL skipped');
  assert.deepEqual(links.find((l) => l.url.endsWith('x.html')).uids, ['a', 'b']);
  const items = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(dailySample(items, 4, 0), [0, 1, 2, 3]);
  assert.deepEqual(dailySample(items, 4, 2), [8, 9, 0, 1], 'wraps around');
  assert.equal(dailySample(items, 0, 5).length, 10, 'no limit means all');
  const seen = new Set();
  for (let day = 0; day < 3; day += 1) dailySample(items, 4, day).forEach((i) => seen.add(i));
  assert.equal(seen.size, 10, 'three days cover all ten');
  const { readFile } = await import('node:fs/promises');
  const real = collectLinks(JSON.parse(await readFile(new URL('../server/data/translations.json', import.meta.url), 'utf8')));
  assert.ok(real.length > 1000);
  for (const link of real) assert.ok(/^https:\/\/(www\.)?(dhammatalks|accesstoinsight)\.org\//.test(link.url), link.url);
});

test('legal and community documents exist and are linked from the manifest', async () => {
  const { readFile } = await import('node:fs/promises');
  const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
  const privacy = await read('PRIVACY.md');
  assert.match(privacy, /collect nothing/i);
  assert.match(privacy, /aggregate counts/i);
  assert.match(privacy, /No request content is logged/);
  assert.match(await read('TERMS.md'), /non-commercial/i);
  assert.match(await read('SECURITY.md'), /Report a vulnerability/);
  assert.match(await read('CODE_OF_CONDUCT.md'), /Contributor Covenant, version 2\.1/);
  const manifest = JSON.parse(await read('manifest.json'));
  assert.deepEqual(manifest.privacy_policies, ['https://github.com/DaniilKi/pali-canon-claude/blob/main/PRIVACY.md']);
  assert.match(manifest.support, /github\.com\/DaniilKi\/pali-canon-claude\/issues/);
  const ids = (yml) => [...yml.matchAll(/^\s+id: ([\w-]+)$/gm)].map((m) => m[1]);
  assert.deepEqual(ids(await read('.github/ISSUE_TEMPLATE/wrong-citation.yml')).slice(0, 4), ['citation', 'expected', 'pts-page', 'actual']);
  assert.deepEqual(ids(await read('.github/ISSUE_TEMPLATE/source-proposal.yml')).slice(2),
    ['standing', 'permission', 'respect', 'durability', 'verifiability']);
  assert.match(await read('.github/ISSUE_TEMPLATE/bug.yml'), /^name: Bug report$/m);
  assert.match(await read('.github/ISSUE_TEMPLATE/config.yml'), /security\/advisories\/new/);
});

test('npm package: bin starts the bundled server with a portable shebang', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.bin['pali-canon-mcp'], 'server/index.cjs');
  const server = read('server/index.cjs');
  // LF only: a CRLF shebang ("node\r") fails on macOS and Linux.
  assert.ok(server.startsWith('#!/usr/bin/env node\n'), 'server/index.cjs must start with an LF shebang');
  for (const file of ['server/data/canon.json.gz', 'server/data/translations.json']) {
    assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), file);
  }
  assert.ok(pkg.files.includes('server'), 'package files must ship server/ (bundle and data)');
});

test('bundled server finds its data when started from an unrelated folder', async () => {
  const { spawnSync } = await import('node:child_process');
  const { tmpdir } = await import('node:os');
  const { fileURLToPath } = await import('node:url');
  const check = fileURLToPath(new URL('../scripts/npx-check.mjs', import.meta.url));
  const server = fileURLToPath(new URL('../server/index.cjs', import.meta.url));
  // initialize, tools/list and an offline resolve_reference with the cwd outside the repo,
  // so the data must be found next to the bundle, not in the current folder.
  const run = spawnSync(process.execPath, [check, process.execPath, server], { cwd: tmpdir(), encoding: 'utf8', timeout: 120000 });
  assert.equal(run.status, 0, `npx-check failed:\n${run.stdout}\n${run.stderr}`);
  assert.match(run.stdout, /bundled data found/);
});

test('version is the same in package.json, manifest.json, plugin.json and the server', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const version = JSON.parse(read('package.json')).version;
  assert.equal(JSON.parse(read('manifest.json')).version, version, 'manifest.json');
  assert.equal(JSON.parse(read('.claude-plugin/plugin.json')).version, version, '.claude-plugin/plugin.json');
  assert.ok(read('src/server.mjs').includes(`export const VERSION = '${version}'`), 'src/server.mjs VERSION');
});

test('live-response cache: LRU order, TTL, byte budget, shared in-flight fetch, failures not cached', async () => {
  const { LruCache } = await import('../src/cache.mjs');
  let clock = 0;
  const cache = new LruCache({ maxBytes: 250, ttlMs: 1000, now: () => clock });
  cache.set('a', 'x'.repeat(30)); cache.set('b', 'y'.repeat(30));
  assert.equal(cache.get('a'), 'x'.repeat(30));
  cache.set('c', 'z'.repeat(30));
  cache.set('d', 'w'.repeat(30));
  cache.set('e', 'v'.repeat(30));
  assert.ok(cache.bytes <= 250);
  assert.equal(cache.get('b'), undefined, 'least recently used entry is evicted first');
  assert.ok(cache.get('a'));
  clock = 2000;
  assert.equal(cache.get('a'), undefined, 'entries expire');
  let calls = 0;
  const load = async () => { calls += 1; await new Promise((r) => setTimeout(r, 10)); return 'page'; };
  const [x, y] = await Promise.all([cache.wrap('k', load), cache.wrap('k', load)]);
  assert.equal(x, 'page'); assert.equal(y, 'page'); assert.equal(calls, 1, 'concurrent requests share one fetch');
  await assert.rejects(cache.wrap('bad', async () => { throw new Error('down'); }));
  assert.equal(await cache.wrap('bad', async () => 'ok'), 'ok', 'a failure is never cached');
  const off = new LruCache({ maxBytes: 0 });
  let n = 0;
  await off.wrap('k', async () => { n += 1; }); await off.wrap('k', async () => { n += 1; });
  assert.equal(n, 2, 'cache can be switched off');
});

test('rate limiter: per-IP fixed window', async () => {
  const { RateLimiter } = await import('../src/http-server.mjs');
  let clock = 0;
  const limiter = new RateLimiter({ perMinute: 2, now: () => clock });
  assert.equal(limiter.take('1.1.1.1'), 0);
  assert.equal(limiter.take('1.1.1.1'), 0);
  assert.ok(limiter.take('1.1.1.1') > 0);
  assert.equal(limiter.take('2.2.2.2'), 0, 'other clients are unaffected');
  clock = 60000;
  assert.equal(limiter.take('1.1.1.1'), 0, 'window resets');
  assert.equal(new RateLimiter({ perMinute: 0 }).take('x'), 0, '0 disables the limit');
});

test('HTTP transport: /mcp serves the same read-only tools, with CORS, health, limits and no sessions', async () => {
  const { createHttpServer } = await import('../src/http-server.mjs');
  const http = createHttpServer({ rateLimitPerMinute: 5, trustProxy: false, chatgptWidget: false });
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${http.address().port}`;
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  const rpc = (method, params, id = 1) => fetch(`${base}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });
  try {
    const health = await (await fetch(`${base}/healthz`)).json();
    assert.equal(health.status, 'ok');
    assert.match(health.privacy, /No request content/);
    const pre = await fetch(`${base}/mcp`, { method: 'OPTIONS' });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), '*');
    assert.match(pre.headers.get('access-control-allow-headers'), /Mcp-Protocol-Version/);
    const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
    assert.equal(init.status, 200);
    assert.equal(init.headers.get('mcp-session-id'), null, 'stateless: no session id');
    assert.equal((await init.json()).result.serverInfo.name, 'pali-canon');
    const tools = (await (await rpc('tools/list', {}, 2)).json()).result.tools;
    const { expectedToolNames } = await import('../scripts/expected-tools.mjs');
    assert.deepEqual(tools.map((t) => t.name).sort(), expectedToolNames(), 'core tools plus every feature module (src/features)');
    assert.ok(tools.every((t) => t.annotations.readOnlyHint && t.annotations.destructiveHint === false));
    assert.equal(tools.find((t) => t.name === 'get_translation').annotations.openWorldHint, true);
    const call = await (await rpc('tools/call', { name: 'resolve_reference', arguments: { reference: 'SN 56:11' } }, 3)).json();
    assert.equal(JSON.parse(call.result.content[0].text).id, 'sn56.11');
    assert.equal((await fetch(`${base}/mcp`)).status, 405, 'GET (SSE) is not offered by a stateless server');
    assert.equal((await fetch(`${base}/mcp`, { method: 'POST', headers, body: '{not json' })).status, 400);
    const limited = await rpc('tools/list', {}, 4);
    assert.equal(limited.status, 429, 'sixth request in a minute is rate limited');
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await fetch(`${base}/nope`)).status, 404);
    const after = await (await fetch(`${base}/healthz`)).json();
    assert.equal(after.counters.tool_calls.resolve_reference, 1);
    assert.equal(after.counters.rate_limited, 1);
    assert.ok(!JSON.stringify(after).includes('SN 56:11'), 'counters never contain request content');
  } finally {
    http.closeAllConnections?.();
    await new Promise((r) => http.close(r));
  }
});

test('HTTP transport rejects oversized bodies', async () => {
  const { createHttpServer } = await import('../src/http-server.mjs');
  const http = createHttpServer({ rateLimitPerMinute: 0 });
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  try {
    const url = `http://127.0.0.1:${http.address().port}/mcp`;
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(1024 * 1024 + 10) });
    assert.equal(res.status, 413, 'declared oversized body gets a 413, not a reset');
    assert.match((await res.json()).error.message, /too large/);
    // Chunked body with no Content-Length: the limit is enforced while reading.
    const big = new Uint8Array(1024 * 1024 + 10).fill(120);
    const stream = new ReadableStream({ start(c) { for (let i = 0; i < big.length; i += 65536) c.enqueue(big.slice(i, i + 65536)); c.close(); } });
    const chunked = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: stream, duplex: 'half' });
    assert.equal(chunked.status, 413, 'streamed oversized body gets a 413');
    await chunked.text();
  } finally {
    http.closeAllConnections?.();
    await new Promise((r) => http.close(r));
  }
});

test('rate limit: client IP comes from the trusted proxy hop, not a forged X-Forwarded-For', async () => {
  const { clientIp, parseTrustProxy, createHttpServer } = await import('../src/http-server.mjs');
  const req = (xff, remote = '10.0.0.1') => ({ headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, socket: { remoteAddress: remote } });
  assert.equal(clientIp(req('6.6.6.6, 1.2.3.4'), 0), '10.0.0.1', 'proxy headers ignored unless trusted');
  assert.equal(clientIp(req('6.6.6.6, 1.2.3.4'), 1), '1.2.3.4', 'one hop: rightmost entry (added by the proxy)');
  assert.equal(clientIp(req('6.6.6.6, 1.2.3.4, 10.1.1.1'), 2), '1.2.3.4', 'two hops');
  assert.equal(clientIp(req('1.2.3.4'), 3), '1.2.3.4', 'fewer entries than hops: leftmost');
  assert.equal(clientIp(req(undefined), 1), '10.0.0.1');
  assert.equal(parseTrustProxy('1'), 1); assert.equal(parseTrustProxy('true'), 1); assert.equal(parseTrustProxy('2'), 2);
  assert.equal(parseTrustProxy(''), 0); assert.equal(parseTrustProxy('0'), 0); assert.equal(parseTrustProxy(undefined), 0);

  const http = createHttpServer({ rateLimitPerMinute: 2, trustProxy: 1 });
  await new Promise((r) => http.listen(0, '127.0.0.1', r));
  try {
    const url = `http://127.0.0.1:${http.address().port}/mcp`;
    const hit = (spoof) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'x-forwarded-for': `${spoof}, 203.0.113.7` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }) });
    assert.equal((await hit('1.1.1.1')).status, 200);
    assert.equal((await hit('2.2.2.2')).status, 200);
    assert.equal((await hit('3.3.3.3')).status, 429, 'a new forged leftmost entry does not reset the limit');
  } finally {
    http.closeAllConnections?.();
    await new Promise((r) => http.close(r));
  }
});

test('server.json for the MCP Registry is consistent and refuses placeholders at publish time', async () => {
  const { checkServerJson, REGISTRY_NAME, NPM_PACKAGE, PLACEHOLDER } = await import('../scripts/check-server-json.mjs');
  assert.deepEqual(checkServerJson(), []);
  // Registry namespaces are compared case-sensitively against the GitHub login (registry#689).
  assert.equal(REGISTRY_NAME, 'io.github.DaniilKi/pali-canon');
  assert.equal(NPM_PACKAGE, 'pali-canon-mcp');
  // The hosted endpoint is not live yet (#5): server.json must not carry a placeholder remote,
  // so publish mode reports no placeholder problem (it may still report mcpName/name until #4).
  assert.ok(!checkServerJson({ publish: true }).some((p) => /placeholder/i.test(p)));
  // The guard itself still recognises the placeholder address.
  assert.ok(PLACEHOLDER.test('https://PLACEHOLDER-hosted-endpoint-issue-5.invalid/mcp'));
});

test('Claude Code plugin and marketplace manifests follow the documented schema', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const root = new URL('../', import.meta.url);
  const json = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
  const plugin = json('.claude-plugin/plugin.json');
  const market = json('.claude-plugin/marketplace.json');
  const pkg = json('package.json');
  const id = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/; // kebab-case, valid in a plugin@marketplace id

  // marketplace.json: name, owner.name and plugins are required; description avoids a validator warning.
  assert.match(market.name, id);
  assert.ok(!/^(claude|anthropic|cc-plugin-|claudeai-)/.test(market.name), 'reserved marketplace name prefix');
  assert.ok(market.owner?.name, 'owner.name is required');
  assert.ok(market.description, 'top-level description');
  assert.equal(market.plugins.length, 1);
  const entry = market.plugins[0];
  // The entry name is the install id and must equal the manifest name, or `/plugin install` fails.
  assert.equal(entry.name, plugin.name);
  assert.equal(entry.source, './', 'plugin lives at the marketplace root');
  assert.equal(entry.description, plugin.description, 'entry description overrides plugin.json in listings; keep them identical');
  assert.equal(entry.version, undefined, 'version belongs in plugin.json only');
  for (const k of ['commands', 'agents', 'skills', 'hooks', 'mcpServers']) assert.equal(entry[k], undefined, `entry must not declare ${k}`);

  // plugin.json: only documented keys, kebab-case name, version kept in step with package.json.
  const known = new Set(['$schema', 'name', 'displayName', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords',
    'metadata', 'icon', 'documentationUrl', 'supportUrl', 'privacyPolicyUrl', 'termsOfServiceUrl', 'defaultEnabled', 'dependencies',
    'settings', 'userConfig', 'channels', 'skills', 'commands', 'agents', 'hooks', 'mcpServers', 'lspServers', 'outputStyles']);
  for (const k of Object.keys(plugin)) assert.ok(known.has(k), `unknown plugin.json key ${k}`);
  assert.match(plugin.name, id);
  assert.ok(!/(^|-)(claude|anthropic)(-|$)/.test(plugin.name), 'plugin name must not read as an Anthropic plugin');
  assert.equal(plugin.version, pkg.version);
  assert.ok(plugin.author?.name && plugin.description && plugin.license);
  for (const k of ['homepage', 'documentationUrl', 'supportUrl']) assert.match(plugin[k], /^https:\/\/github\.com\/DaniilKi\/pali-canon-claude/, k);

  // .mcp.json starts the committed bundle from the plugin root with plain arguments.
  const server = json('.mcp.json').mcpServers['pali-canon'];
  assert.equal(server.command, 'node');
  assert.deepEqual(server.args, ['${CLAUDE_PLUGIN_ROOT}/server/index.cjs']);
  assert.ok(existsSync(new URL('server/index.cjs', root)));

  // Each skill has front matter with a single-line text description.
  for (const s of ['study', 'compare', 'pali-word', 'method', 'memorise']) {
    const md = readFileSync(new URL(`skills/${s}/SKILL.md`, root), 'utf8');
    assert.ok(md.startsWith(`---\nname: ${s}\ndescription: `) && /^description: \S.*$/m.test(md), s);
  }
  // A top-level bin/ folder stops claude.ai and Cowork from installing the plugin.
  assert.ok(!existsSync(new URL('bin', root)), 'no top-level bin/ directory');
});

test('Codex plugin packaging is consistent with the Claude plugin', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const root = new URL('../', import.meta.url);
  const json = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
  const pkg = json('package.json');
  const codex = json('.codex-plugin/plugin.json');
  const claude = json('.claude-plugin/plugin.json');
  assert.equal(codex.name, claude.name);
  assert.equal(codex.version, pkg.version, 'Codex plugin version must match package.json');
  assert.equal(codex.skills, './skills/');
  assert.equal(codex.mcpServers, './.mcp.codex.json');
  assert.equal(codex.interface.displayName, 'Pali Canon');
  assert.ok(codex.interface.category && codex.interface.defaultPrompt.length >= 1);
  assert.deepEqual(codex.interface.capabilities, ['Read'], 'the plugin is read-only');
  for (const asset of [codex.interface.logo, codex.interface.composerIcon]) {
    assert.match(asset, /^\.\//);
    assert.ok(existsSync(new URL(asset, root)), asset);
  }
  // Server map keyed by name (Codex accepts this or an mcpServers wrapper).
  const servers = json('.mcp.codex.json');
  assert.deepEqual(Object.keys(servers), ['pali-canon']);
  // Runs the bundled server, never an npm name that is not yet published (supply-chain risk via npx -y).
  assert.equal(servers['pali-canon'].command, 'node');
  assert.deepEqual(servers['pali-canon'].args, ['./server/index.cjs']);
  // Codex's local host does not default a plugin server's cwd to the plugin root; a relative cwd is resolved against it.
  assert.equal(servers['pali-canon'].cwd, '.');
  assert.ok(existsSync(new URL('server/index.cjs', root)), 'bundled server must exist');
  assert.ok(!JSON.stringify(servers).includes('npx'), 'no npx in the plugin server until the npm name is published');
  const market = json('.agents/plugins/marketplace.json');
  const entry = market.plugins.find((p) => p.name === codex.name);
  assert.deepEqual(entry.source, { source: 'local', path: './' });
  assert.ok(entry.policy.installation && entry.policy.authentication && entry.category);
  for (const skill of ['study', 'compare', 'pali-word', 'method', 'memorise']) {
    assert.ok(existsSync(new URL(`skills/${skill}/SKILL.md`, root)), skill);
    const yaml = readFileSync(new URL(`skills/${skill}/agents/openai.yaml`, root), 'utf8');
    assert.match(yaml, /type: "mcp"/, skill);
    assert.match(yaml, /value: "pali-canon"/, skill);
    // A stdio dependency must name the same command as the plugin's server, or Codex treats it as missing.
    assert.match(yaml, /transport: "stdio"/, skill);
    assert.match(yaml, new RegExp(`command: "${servers['pali-canon'].command}"`), skill);
    assert.match(yaml, /command: "node"/, skill);
  }
});

test('Gemini extension stays in step with the package and the skills', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const root = new URL('../', import.meta.url);
  const read = (p) => readFileSync(new URL(p, root), 'utf8');
  const ext = JSON.parse(read('gemini-extension.json'));
  const pkg = JSON.parse(read('package.json'));
  assert.equal(ext.version, pkg.version);
  assert.match(ext.name, /^[a-z0-9-]+$/);
  assert.equal(ext.contextFileName, 'GEMINI.md');
  assert.ok(existsSync(new URL('GEMINI.md', root)));
  const server = ext.mcpServers['pali-canon'];
  // The extension runs the server from the cloned repo (like manifest.json's ${__dirname}),
  // so it needs no npm package and works offline.
  assert.equal(server.command, 'node');
  assert.equal(server.args.length, 1);
  assert.equal(server.args[0], '${extensionPath}${/}server${/}index.cjs');
  assert.ok(server.args[0].endsWith('server${/}index.cjs'));
  assert.ok(existsSync(new URL('server/index.cjs', root)), 'server/index.cjs must be committed');
  assert.ok(existsSync(new URL('server/data/canon.json.gz', root)), 'server/data must be committed');
  const tools = [...read('src/server.mjs').matchAll(/tool\('([a-z_]+)'/g)].map((m) => m[1]);
  for (const skill of ['study', 'compare', 'pali-word', 'method', 'memorise']) {
    const toml = read(`commands/${skill}.toml`);
    assert.match(toml, /^description = "[^"\n]+"$/m, skill);
    assert.match(toml, /^prompt = '''\n[\s\S]*\{\{args\}\}[\s\S]*\n'''\n?$/m, skill);
    for (const [, name] of toml.matchAll(/`([a-z]+_[a-z_]+)`/g)) {
      if (!['next_offset', 'translation_id'].includes(name)) assert.ok(tools.includes(name), `${skill}: unknown tool ${name}`);
    }
    assert.ok(existsSync(new URL(`skills/${skill}/SKILL.md`, root)), skill);
  }
});

test('editor install guide: one-click links and configs all start npx -y pali-canon-mcp', async () => {
  const { readFileSync } = await import('node:fs');
  const { installLinks, ARGS } = await import('../scripts/install-links.mjs');
  const doc = readFileSync(new URL('../docs/install/ide.md', import.meta.url), 'utf8');
  const links = installLinks();
  for (const key of ['cursor', 'cursorWeb', 'vscode', 'vscodeInsiders', 'vscodeWeb', 'vscodeInsidersWeb', 'vscodeCli', 'goose']) {
    assert.ok(doc.includes(links[key]), `docs/install/ide.md is missing the generated ${key} link`);
  }
  // Every deep link in the page must be one we generate (no hand-edited stale copies).
  const generated = new Set(Object.values(links));
  for (const m of doc.matchAll(/(?:cursor:\/\/|vscode(?:-insiders)?:mcp|goose:\/\/|https:\/\/cursor\.com\/en\/install-mcp|https:\/\/vscode\.dev\/redirect)[^\s)`"]*/g)) {
    assert.ok(generated.has(m[0]), `unexpected install link: ${m[0]}`);
  }
  // The links decode to the documented server.
  const cursorConfig = JSON.parse(Buffer.from(new URL(links.cursor).searchParams.get('config'), 'base64').toString());
  assert.deepEqual(cursorConfig, { command: 'npx', args: ['-y', 'pali-canon-mcp'] });
  const vscodeConfig = JSON.parse(decodeURIComponent(links.vscode.split('?')[1]));
  assert.deepEqual(vscodeConfig, { name: 'pali-canon', type: 'stdio', command: 'npx', args: ['-y', 'pali-canon-mcp'] });
  assert.equal(new URL(links.vscodeWeb).searchParams.get('url'), links.vscode);
  assert.deepEqual(new URL(links.goose).searchParams.getAll('arg'), ARGS);
  // Every JSON config block parses and defines exactly one pali-canon server in the client's own key.
  const blocks = [...doc.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));
  assert.ok(blocks.length >= 6);
  for (const block of blocks) {
    const [key] = Object.keys(block);
    assert.ok(['mcpServers', 'servers', 'context_servers'].includes(key), key);
    const server = block[key]['pali-canon'];
    assert.ok(server, `${key} has no pali-canon entry`);
    if (server.command === 'npx') assert.deepEqual(server.args, ['-y', 'pali-canon-mcp']);
    else assert.equal(server.command, 'node');
  }
  assert.match(doc, /```yaml\nextensions:\n  pali-canon:\n[\s\S]*?cmd: npx\n    args: \["-y", "pali-canon-mcp"\]/);
});

test('local-clients guide lists every tool, with offline tools marked correctly', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const source = read('../src/server.mjs');
  const guide = read('../docs/install/local-clients.md');
  const starts = [...source.matchAll(/^\s*tool\('([a-z_]+)', '([^']*)'/gm)];
  const tools = starts.map((m, i) => ({
    name: m[1],
    description: m[2],
    network: /network: true/.test(source.slice(m.index, starts[i + 1]?.index ?? source.length)),
  }));
  assert.ok(tools.length >= 11);
  for (const { name, description, network } of tools) {
    const row = guide.split('\n').find((line) => line.startsWith(`| \`${name}\` |`));
    assert.ok(row, `${name} missing from docs/install/local-clients.md`);
    const internet = row.split('|').at(-2).trim();
    if (!network) assert.equal(internet, 'No', name);
    else if (/works offline/i.test(description)) assert.match(internet, /^No, unless/, name);
    else assert.equal(internet, 'Yes', name);
  }
  const jsonBlocks = [...guide.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]);
  assert.ok(jsonBlocks.length >= 2, 'expected JSON examples for LM Studio and oterm');
  for (const block of jsonBlocks) assert.doesNotThrow(() => JSON.parse(block));
});

test('skills follow the Agent Skills spec and declare the MCP server dependency', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../skills/', import.meta.url);
  const names = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  assert.ok(names.length >= 3);
  // Field list from https://agentskills.io/specification (skills-ref rejects any other top-level key).
  // Plus argument-hint: a Claude Code extension it reads only at the top level (slash-menu hint); hubs do not run skills-ref.
  const ALLOWED = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools', 'argument-hint']);
  const unquote = (v) => (/^".*"$/.test(v) ? JSON.parse(v) : v);
  for (const name of names) {
    const text = readFileSync(new URL(`${name}/SKILL.md`, dir), 'utf8').replace(/\r\n/g, '\n');
    const m = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(m, `${name}: frontmatter`);
    const fm = {};
    let map = null;
    for (const line of m[1].split('\n')) {
      const nested = line.match(/^ {2}([\w-]+): (.+)$/);
      if (nested && map) { map[nested[1]] = unquote(nested[2]); continue; }
      const top = line.match(/^([\w-]+):(?: (.*))?$/);
      assert.ok(top, `${name}: unparsed frontmatter line ${line}`);
      if (top[2] === undefined) { fm[top[1]] = map = {}; continue; }
      map = null;
      // A plain YAML scalar may not contain ": " or start with a quote/indicator; quote it instead.
      if (!/^"/.test(top[2])) assert.ok(!/: |^[\[{&*!|>'%@`]/.test(top[2]), `${name}: ${top[1]} must be quoted`);
      fm[top[1]] = unquote(top[2]);
    }
    for (const key of Object.keys(fm)) assert.ok(ALLOWED.has(key), `${name}: field ${key} is not in the Agent Skills spec`);
    assert.equal(fm.name, name, 'name must match the directory');
    assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(fm.name.length <= 64);
    assert.ok(fm.description.length > 0 && fm.description.length <= 1024);
    assert.ok(fm.compatibility.length > 0 && fm.compatibility.length <= 500);
    for (const v of Object.values(fm.metadata)) assert.equal(typeof v, 'string');
    assert.match(fm.description, /Requires the Pali Canon MCP server/);
    assert.match(fm.compatibility, /Pali Canon MCP server/);
    assert.equal(fm.metadata['requires-mcp-server'], 'pali-canon');
    assert.ok(fm['argument-hint'], `${name}: top-level argument-hint for the Claude Code slash menu`);
    assert.equal(fm['argument-hint'], fm.metadata['argument-hint']);
    assert.match(text.slice(m[0].length), /needs the Pali Canon MCP server/);
  }
});

test('expected tool list matches what the feature modules register', async () => {
  const { coreToolNames, featureFiles, expectedToolNames } = await import('../scripts/expected-tools.mjs');
  const features = await import('../src/features/index.mjs');
  const { z } = await import('zod');
  const registered = [];
  const stub = { tool: (name) => registered.push(name), prompt: () => {}, resource: () => {}, z, citation: z.string(), canon, english: {}, providers: {} };
  for (const feature of Object.values(features)) feature.register?.(stub);
  assert.equal(featureFiles().length, Object.keys(features).length, 'every feature line is read');
  assert.deepEqual([...coreToolNames(), ...registered].sort(), expectedToolNames());
});
