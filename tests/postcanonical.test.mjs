// Post-canonical books (#21): Ṭīkā and Añña, citations, search option, on-demand data with checksum.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as canon from '../src/canon.mjs';
import * as pc from '../src/postcanonical.mjs';
import { fetchBinary } from '../src/http.mjs';

const sha = (b) => createHash('sha256').update(b).digest('hex');

test('the bundled data is the pinned build: index of every book, extra part pinned by SHA-256, within budget', () => {
  const d = pc.load();
  assert.ok(d, 'server/data/postcanonical.json.gz is installed');
  assert.equal(d.source.commit, canon.source().commit, 'same pinned VRI commit as the canon');
  assert.equal(d.extra.sha256, pc.EXTRA.sha256, 'code pins the SHA-256 the build recorded');
  assert.equal(d.extra.bytes, pc.EXTRA.bytes);
  assert.ok(statSync(new URL('../server/data/postcanonical.json.gz', import.meta.url)).size < 12e6, 'ṭīkā + post-canonical bundle ≤ 12 MB gz');
  assert.ok(d.books.length >= 100);
  for (const b of d.books) {
    assert.equal(b.canonical, false, b.id);
    assert.ok(['Ṭīkā', 'Añña'].includes(b.section), b.id);
    assert.ok(!/^s05(18|20)m/.test(b.file), 'Peṭakopadesa and Milindapañha stay in the canon data only');
    assert.equal(!!b.blocks, b.part === 'core', b.id);
    assert.throws(() => canon.resolve(b.id), undefined, `${b.id} must not be a canon citation`);
  }
  assert.ok(d.books.filter((b) => b.section === 'Ṭīkā').every((b) => b.part === 'core'), 'the whole Ṭīkā section is bundled');
  for (const id of ['visuddhimagga-1', 'visuddhimagga-2', 'abhidhammatthasangaho']) assert.equal(d.byId.get(id).part, 'core', id);
});

test('Vism chapter, chapter.paragraph and VRI paragraph citations', async () => {
  const one = await pc.getText('Vism 1.1', { limit: 20 });
  assert.equal(one.canonical, false);
  assert.match(one.label, /Visuddhimagga/);
  assert.match(one.label, /not the canon/i);
  assert.equal(one.title, '1. Sīlaniddeso');
  assert.equal(one.approximate, undefined, 'paragraph 1 is the chapter start');
  assert.ok(one.segments.some((s) => s.text.startsWith('Sīle patiṭṭhāya naro sapañño')), 'opening verse of the Visuddhimagga');
  assert.equal(one.attribution, canon.source().attribution);

  const five = pc.describe('Vism I,5');
  assert.equal(five.approximate, true);
  assert.match(five.notes.join(' '), /Ñāṇamoli/);
  assert.equal(five.title, '1. Sīlaniddeso');

  for (const [ref, title] of [['Vism 3.1', '3. Kammaṭṭhānaggahaṇaniddeso'], ['Vism III', '3. Kammaṭṭhānaggahaṇaniddeso'], ['Vism ch. 12', '12. Iddhividhaniddeso'], ['Visuddhimagga XXIII', '23. Paññābhāvanānisaṃsaniddeso']]) {
    assert.equal(pc.describe(ref).title, title, ref);
  }
  const p19 = await pc.getText('Vism §19');
  assert.equal(p19.vri_paragraph, '19');
  assert.equal(p19.segments.find((s) => s.vri_paragraph)?.vri_paragraph, '19');
  assert.deepEqual(pc.describe('visuddhi. 1.19').citation, 'Vism §19', "VRI's own cross-reference form");
  assert.equal(pc.describe('visuddhi. 2.365').book.id, 'visuddhimagga-2');
  assert.throws(() => pc.describe('visuddhi. 2.19'), /volume 1/);
  assert.throws(() => pc.describe('Vism 24.1'), /23 chapters/);
  assert.throws(() => pc.describe('Vism §897'), /1–896/);
});

test('Vism PTS pages are recognised but never guessed', () => {
  for (const ref of ['Vism p. 3', 'Vism pp. 3-5', 'Vism 3', 'Vism 512']) {
    assert.ok(pc.isPostCanonical(ref), ref);
    assert.throws(() => pc.describe(ref), (e) => e.message === pc.PTS_UNAVAILABLE, ref);
  }
});

test('Abhidh-s chapter and section citations', async () => {
  const c1 = await pc.getText('Abhidh-s 1', { limit: 200 });
  assert.equal(c1.title, '1. Cittaparicchedo');
  assert.equal(c1.canonical, false);
  assert.match(c1.label, /Abhidhammatthasaṅgaha/);
  assert.ok(c1.segments.some((s) => s.text.startsWith('Sammāsambuddhamatulaṃ')), 'chapter 1 keeps the opening verses');
  assert.ok(!c1.segments.some((s) => /Cetasikaparicchedo/.test(s.text)), 'ends before chapter 2');
  const s4 = await pc.getText('Abhidh-s 1.4');
  assert.equal(s4.vri_paragraph, '4');
  assert.ok(s4.segments.some((s) => s.text.startsWith('Tattha katamaṃ kāmāvacaraṃ?')));
  assert.equal(pc.describe('Abhidh-s 2').title, '2. Cetasikaparicchedo');
  assert.equal(pc.describe('Abhidhammatthasaṅgaha IX').title, '9. Kammaṭṭhānaparicchedo');
  const nine = await pc.getText('Abhidh-s 9', { limit: 200 });
  assert.ok(!nine.segments.some((s) => /Vibhāvinī/.test(s.text)), 'chapter 9 stops before the Abhidhammatthavibhāvinī');
  assert.throws(() => pc.describe('Abhidh-s 10'), /9 chapters/);
  assert.throws(() => pc.describe('Abhidh-s 2.999'), /no section 999/);
});

test('other books by id, file stem or title; ambiguous paragraph numbers are refused', async () => {
  const t = await pc.getText('silakkhandhavagga-tika 2', { limit: 3 });
  assert.equal(t.title, '2. Sāmaññaphalasuttavaṇṇanā');
  assert.match(t.label, /Ṭīkā section/);
  assert.equal(pc.describe('s0201t').book.id, 'mulapannasa-tika');
  assert.equal(pc.describe('Mūlapaṇṇāsa-Ṭīkā').book.id, 'mulapannasa-tika');
  assert.throws(() => pc.describe('vibhanga-mulatika §1'), /restarts its paragraph numbers/);
  const m = pc.describe('mahavamsa 3');
  assert.equal(m.book.bundled, false);
  assert.match(m.book.on_demand, /SHA-256/);
});

test('canon citations are never shadowed', () => {
  for (const ref of ['MN 10', 'SN 56.11', 'Dhp 183', 'Pe 1', 'Mil 1', 'Ds 1.1', 'Kv 1']) {
    assert.equal(pc.isPostCanonical(ref), false, ref);
    assert.equal(pc.locate(ref), null, ref);
  }
  assert.equal(pc.isPostCanonical('Vism 1.1'), true);
  assert.equal(pc.isPostCanonical('Abhidh-s 1'), true);
});

test('search: post-canonical only when asked, separate and labelled', async () => {
  const r = await pc.search('"jaṭāya jaṭitā pajā"', { books: ['vism'] });
  assert.ok(r.total_matched >= 1);
  assert.equal(r.results[0].canonical, false);
  assert.match(r.results[0].citation, /^Vism §\d+$/);
  assert.match(r.not_searched || '', /^$|on-demand/);
  const abhs = await pc.search('kāmāvacaraṃ somanassasahagataṃ', { books: ['abhidh-s'], limit: 3 });
  assert.match(abhs.results[0].citation, /^Abhidh-s \d+\.\d+$/);
  const tika = await pc.search('satipatthana', { section: 'tika', limit: 2 });
  assert.ok(tika.results.every((h) => h.vri_section === 'Ṭīkā'));

  const base = canon.search('jatitā pajā', { limit: 3 });
  assert.equal(await pc.withPostCanonical(base, 'jatitā pajā'), base, 'excluded by default: canon result untouched');
  const both = await pc.withPostCanonical(base, 'jatitā pajā', { include: true, limit: 3 });
  assert.deepEqual(both.results, base.results, 'canon results unchanged');
  assert.equal(both.post_canonical.canonical, false);
  assert.ok(both.post_canonical.results.length >= 1);
});

test('on-demand data: SHA-256 checked, cached on disk, failures explained', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pc-cache-'));
  try {
    const bytes = gzipSync(Buffer.from(JSON.stringify({ books: { mahavamsa: [['chapter', null, 'Test chapter'], ['bodytext', '1', 'Test text']] } })));
    const pin = { ...pc.EXTRA, sha256: sha(bytes), bytes: bytes.length };
    let calls = 0;
    const fetcher = async (url) => { calls += 1; assert.equal(url, pc.EXTRA.url); return bytes; };
    pc._reset();
    const t = await pc.getText('mahavamsa', { fetcher, dir, pin });
    assert.equal(t.book.bundled, false);
    assert.equal(t.segments[1].text, 'Test text');
    assert.equal(calls, 1);
    assert.equal(readdirSync(dir).length, 1, 'written to the cache');
    pc._reset();
    const again = await pc.loadExtra({ fetcher: async () => { throw new Error('offline'); }, dir, pin });
    assert.equal(again.from, 'cache');

    pc._reset();
    const empty = mkdtempSync(join(tmpdir(), 'pc-cache-'));
    await assert.rejects(pc.loadExtra({ fetcher: async () => Buffer.from('tampered'), dir: empty, pin }), /failed its checksum/);
    assert.ok(!readdirSync(empty).length, 'a failed download is never cached');
    await assert.rejects(pc.loadExtra({ fetcher: async () => { throw new Error('unreachable'); }, dir: empty, pin }), /could not be downloaded \(unreachable\)/);
    rmSync(empty, { recursive: true, force: true });
  } finally {
    pc._reset();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('release assets: only this repository through the allowlist', async () => {
  for (const url of [
    'https://github.com/someone/else/releases/download/v1/x.json.gz',
    'https://github.com/DaniilKi/pali-canon-claude/archive/main.zip',
    'https://release-assets.githubusercontent.com/github-production-release-asset/999/abc',
    'http://github.com/DaniilKi/pali-canon-claude/releases/download/v1/x',
  ]) await assert.rejects(fetchBinary(url, { retries: 0 }), /outside the supported/, url);
});

test('cache directory follows the OS', () => {
  assert.equal(pc.cacheDir({ PALI_CANON_CACHE_DIR: '/x' }, 'linux'), '/x');
  assert.match(pc.cacheDir({ XDG_CACHE_HOME: '/c' }, 'linux'), /[\\/]c[\\/]pali-canon-mcp$/);
  assert.match(pc.cacheDir({ LOCALAPPDATA: 'C:\\L' }, 'win32'), /pali-canon-mcp[\\/]Cache$/);
  assert.match(pc.cacheDir({}, 'darwin'), /Library[\\/]Caches[\\/]pali-canon-mcp$/);
});

test('tool registration: read-only tools, labelled results', async () => {
  const tools = {};
  const z = (await import('zod')).z;
  pc.register({ tool: (name, description, schema, fn, opts) => { tools[name] = { description, schema, fn, opts }; }, z });
  assert.deepEqual(Object.keys(tools).sort(), ['get_post_canonical', 'search_post_canonical']);
  for (const t of Object.values(tools)) { assert.equal(t.opts.network, true); assert.match(t.description, /not the canon/i); }
  const list = await tools.get_post_canonical.fn({ citation: '', offset: 0, limit: 200, includeVariants: false });
  assert.ok(list.items.some((b) => b.id === 'abhidhammatthasangaho'));
  assert.equal(list.canonical, false);
  const v = await tools.get_post_canonical.fn({ citation: 'Vism 1.1', offset: 0, limit: 5, includeVariants: false });
  assert.equal(v.citation, 'Vism 1.1');
  const s = await tools.search_post_canonical.fn({ query: 'sīle patiṭṭhāya', books: ['vism'], include_on_demand: false, limit: 2, offset: 0 });
  assert.ok(s.results.length);
});

test('page markers and variant notes are VRI\'s', async () => {
  const t = await pc.getText('Vism 1.1', { limit: 40, includeVariants: true });
  assert.ok(t.segments.some((s) => s.myanmar_page_begins?.includes('1.1')));
  assert.ok(t.segments.some((s) => s.vri_page_begins?.includes('1.2')));
  assert.ok(!t.segments.some((s) => s.pts_page_begins), 'no PTS pages in the VRI Visuddhimagga');
  assert.ok(existsSync(new URL('../scripts/canon/build_postcanonical.py', import.meta.url)));
});
