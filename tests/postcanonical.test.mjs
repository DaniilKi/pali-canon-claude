// Post-canonical books (#21): Ṭīkā and Añña, citations, search option, citation round trips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync, readFileSync } from 'node:fs';
import * as canon from '../src/canon.mjs';
import * as pc from '../src/postcanonical.mjs';

test('every book is bundled from the pinned VRI commit, within the size budget (decision D-21a)', () => {
  const d = pc.load();
  assert.ok(d, 'server/data/postcanonical.json.gz is installed');
  assert.equal(d.source.commit, canon.source().commit, 'same pinned VRI commit as the canon');
  assert.ok(statSync(new URL('../server/data/postcanonical.json.gz', import.meta.url)).size < 16e6, 'ṭīkā + post-canonical bundle < 16 MB gz');
  assert.equal(d.books.length, 109);
  for (const b of d.books) {
    assert.equal(b.canonical, false, b.id);
    assert.ok(['Ṭīkā', 'Añña'].includes(b.section), b.id);
    assert.ok(!/^s05(18|20)m/.test(b.file), 'Peṭakopadesa and Milindapañha stay in the canon data only');
    assert.ok(Array.isArray(b.blocks) && b.blocks.length === b.block_count, `${b.id} is bundled with its text`);
    assert.throws(() => canon.resolve(b.id), undefined, `${b.id} must not be a canon citation`);
  }
});

test('no download path: the module imports nothing from the network client and writes no files', () => {
  const src = readFileSync(new URL('../src/postcanonical.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /from '\.\/http\.mjs'|writeFileSync|mkdirSync|githubusercontent/);
  const http = readFileSync(new URL('../src/http.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(http, /releases\/download|release-assets|objects\.githubusercontent|host: 'github\.com'/, 'no GitHub release hosts in ALLOWED');
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
  assert.match(one.notes.join(' '), /four heading lines come first/, 'the note says what precedes paragraph 1');
  assert.ok(one.segments.slice(0, 4).every((s) => s.type === 'heading') && one.segments[4].text.startsWith('Sīle patiṭṭhāya'));
  assert.match(pc.describe('Vism 2.1').notes.join(' '), /heading .*comes first, then paragraph 1/);
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
  const m = await pc.getText('mahavamsa 3', { limit: 2 });
  assert.equal(m.book.id, 'mahavamsa');
  assert.equal(m.canonical, false);
  assert.match(m.label, /Añña/);
  assert.ok(m.segments.length > 0, 'Añña books are bundled and read offline');
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
  assert.equal(r.not_searched, undefined);
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

const segmentText = (t) => pc.fold(t.segments.map((s) => s.text).join(' '));
async function readAll(citation) {
  let offset = 0;
  let text = '';
  for (;;) {
    const page = await pc.getText(citation, { offset, limit: 200 });
    text += ' ' + segmentText(page);
    if (page.next_offset === null) return text;
    offset = page.next_offset;
  }
}

test('search hits round-trip: every cited passage resolves and contains the hit', async () => {
  // The reviewer's probe: common words across all books; each hit's citation fed back through getText.
  const words = ['dhamma', 'citta', 'rupa', 'vedana', 'kamma', 'nibbana', 'sila', 'samadhi', 'panna', 'loka'];
  let checked = 0;
  for (const w of words) {
    const r = await pc.search(w, { limit: 50 });
    for (const hit of r.results) {
      const text = await readAll(hit.citation);
      const probe = pc.fold(hit.excerpt.replace(/^…|…$/g, '')).slice(0, 60);
      assert.ok(text.includes(probe), `${hit.citation} does not contain the hit "${probe}"`);
      checked += 1;
    }
  }
  assert.ok(checked >= 400, `checked ${checked}`);
  // The cases the review found: no ambiguous §N, no chapter mixed with an earlier chapter's paragraph, trailing
  // subheads cited with the paragraph that contains them.
  const d = pc.load();
  for (const id of ['abhidhammatthasangaho', 'dhammasangani-mulatika', 'pancapakarana-mulatika']) {
    const book = d.byId.get(id);
    for (let i = 0; i < book.blocks.length; i += 1) {
      const sel = pc.select(pc.citationFor(book, i));
      assert.ok(sel.book === book && sel.start <= i && i < sel.end, `${id} block ${i}`);
    }
  }
  const abhs = d.byId.get('abhidhammatthasangaho');
  const sub = abhs.blocks.findIndex(([, , t]) => t === 'Ahetukacittaṃ');
  assert.ok(sub > 0);
  const c = pc.citationFor(abhs, sub);
  assert.match(c, /^Abhidh-s 1\.\d+$/);
  assert.ok(segmentText(await pc.getText(c, { limit: 50 })).includes('ahetukacittam'), c);
});

test('tool registration: read-only tools, labelled results', async () => {
  const tools = {};
  const z = (await import('zod')).z;
  pc.register({ tool: (name, description, schema, fn, opts) => { tools[name] = { description, schema, fn, opts }; }, z });
  assert.deepEqual(Object.keys(tools).sort(), ['get_post_canonical', 'search_post_canonical']);
  for (const t of Object.values(tools)) { assert.equal(t.opts?.network ?? false, false, 'offline: no openWorldHint'); assert.match(t.description, /not the canon/i); }
  const list = await tools.get_post_canonical.fn({ citation: '', offset: 0, limit: 200, includeVariants: false });
  assert.ok(list.items.some((b) => b.id === 'abhidhammatthasangaho'));
  assert.equal(list.canonical, false);
  const v = await tools.get_post_canonical.fn({ citation: 'Vism 1.1', offset: 0, limit: 5, includeVariants: false });
  assert.equal(v.citation, 'Vism 1.1');
  const s = await tools.search_post_canonical.fn({ query: 'sīle patiṭṭhāya', books: ['vism'], limit: 2, offset: 0 });
  assert.ok(s.results.length);
});

test('page markers and variant notes are VRI\'s', async () => {
  const t = await pc.getText('Vism 1.1', { limit: 40, includeVariants: true });
  assert.ok(t.segments.some((s) => s.myanmar_page_begins?.includes('1.1')));
  assert.ok(t.segments.some((s) => s.vri_page_begins?.includes('1.2')));
  assert.ok(!t.segments.some((s) => s.pts_page_begins), 'no PTS pages in the VRI Visuddhimagga');
  assert.ok(existsSync(new URL('../scripts/canon/build_postcanonical.py', import.meta.url)));
});
