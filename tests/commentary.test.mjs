import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import * as commentary from '../src/commentary.mjs';
import * as canon from '../src/canon.mjs';
import { createServer } from '../src/server.mjs';

const headings = (r) => r.segments.filter((s) => s.type === 'heading').map((s) => s.text).join(' | ');
const all = (ref) => commentary.getCommentary(ref, { limit: 200 });

test('commentary resolves for DN, MN, SN, AN and Dhp texts, under the right heading', () => {
  const cases = {
    'DN 1': 'Brahmajālasuttavaṇṇanā', 'DN 22': 'Mahāsatipaṭṭhānasuttavaṇṇanā', 'MN 10': 'Satipaṭṭhānasuttavaṇṇanā',
    'SN 56.11': 'Dhammacakkappavattanasuttavaṇṇanā', 'SN 1.14': 'Khattiyasuttavaṇṇanā', 'AN 3.65': 'Kesamuttisuttavaṇṇanā',
    'Dhp 183': 'Ānandattherapañhavatthu', 'Dhp 1': 'Cakkhupālattheravatthu',
  };
  for (const [ref, heading] of Object.entries(cases)) {
    const r = all(ref);
    assert.equal(r.available, true, ref);
    assert.ok(headings(r).includes(heading), `${ref}: ${headings(r).slice(0, 200)}`);
  }
  assert.equal(all('MN 10').commentary, 'Papañcasūdanī');
  assert.equal(all('AN 3.65').commentary, 'Manorathapūraṇī');
});

test('commentary is labelled as commentary, attributed to VRI and pinned', () => {
  const r = commentary.getCommentary('MN 10');
  assert.match(r.label, /not the canon/);
  assert.match(r.source.attribution, /Vipassana Research Institute/);
  assert.match(r.source.terms, /non-commercial/);
  assert.equal(r.source.commit, canon.source().commit);
  for (const p of r.passages) assert.ok(Object.keys(r.evidence_types).includes(p.alignment));
  assert.equal(r.passages[0].comments_on.vri_file, 's0201m.mul.xml');
});

test('segments carry the root paragraph they explain and commentary PTS pages', () => {
  const r = all('MN 10');
  assert.ok(r.segments.every((s) => s.comments_on_vri_paragraphs && s.ref.startsWith('mn10/c')));
  const paras = new Set(r.segments.map((s) => Number(s.comments_on_vri_paragraphs.split('–')[0])));
  const [from, to] = canon.resolve('MN 10').unit.vri.split('–').map(Number);
  for (const p of paras) assert.ok(p >= from && p <= to, `paragraph ${p} outside MN 10 (${from}-${to})`);
  assert.ok(r.segments.some((s) => s.commentary_pts_page_begins?.some((x) => /^Ps i \d+$/.test(x))));
});

test('pagination by segment', () => {
  const first = commentary.getCommentary('DN 1', { offset: 0, limit: 5 });
  assert.equal(first.returned, 5);
  assert.equal(first.next_offset, 5);
  const second = commentary.getCommentary('DN 1', { offset: 5, limit: 5 });
  assert.equal(second.segments[0].ref, 'dn1/c6');
  const last = commentary.getCommentary('DN 1', { offset: first.total_segments - 1, limit: 5 });
  assert.equal(last.next_offset, null);
});

test('a range gets its members\' commentary; a text the commentary passes over gets none', () => {
  const range = all('Dhp 1-20');
  assert.equal(range.available, true);
  assert.ok(headings(range).includes('Yamakavaggo'));
  // The Aṅguttara commentary goes from AN 1.8 to 1.11: it has nothing on AN 1.9.
  const none = commentary.getCommentary('AN 1.9');
  assert.equal(none.available, false);
  assert.equal(none.segments.length, 0);
  assert.match(none.notes.join(' '), /No commentary passage is aligned/);
});

test('commentary introductions are not aligned to the first text', () => {
  // MN commentary opens with a general introduction numbered "1." before MN 1 paragraph 1.
  const r = all('MN 1');
  assert.ok(!r.segments.some((s) => s.text.startsWith('Tattha majjhimasaṅgīti')));
  // The Dhammapada commentary's opening verses (numbered 1-10) are not verses 1-10.
  const d = all('Dhp 1');
  assert.ok(!d.segments.some((s) => s.text.startsWith('Mahāmohatamonaddhe')));
});

test('unknown citations throw like get_text', () => {
  assert.throws(() => commentary.getCommentary('MN 999'), /not in the canon index/);
});

test('commentaryFor serves get_text { commentary: true }', () => {
  const unit = canon.resolve('SN 56.11').unit;
  const r = commentary.commentaryFor(unit, { limit: 3 });
  assert.equal(r.text_id, 'sn56.11');
  assert.equal(r.returned, 3);
});

test('register() adds a read-only, offline get_commentary tool', () => {
  const tools = [];
  const tool = (name, description, schema, fn, opts) => tools.push({ name, description, schema, fn, opts });
  commentary.register({ tool, z, citation: z.string() });
  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, 'get_commentary');
  assert.equal(tools[0].opts, undefined); // network: false -> openWorldHint false
  assert.match(tools[0].description, /not the canon/);
  assert.deepEqual(Object.keys(tools[0].schema), ['uid', 'script', 'offset', 'limit']);
});

test('get_commentary over MCP', async () => {
  const server = createServer();
  const client = new Client({ name: 'test', version: '0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const { tools } = await client.listTools();
  const t = tools.find((x) => x.name === 'get_commentary');
  assert.ok(t, 'get_commentary is registered');
  assert.equal(t.annotations.readOnlyHint, true);
  assert.equal(t.annotations.openWorldHint, false);
  const res = await client.callTool({ name: 'get_commentary', arguments: { uid: 'AN 3.65', limit: 2 } });
  assert.equal(res.structuredContent.text_id, 'an3.65');
  assert.equal(res.structuredContent.available, true);
  await client.close();
});

test('list_sources names the bundled commentary with VRI terms', async () => {
  const { listSources } = await import('../src/providers.mjs');
  const s = listSources().sources.find((x) => x.id === 'vri-atthakatha');
  assert.ok(s);
  assert.match(s.role, /not scripture/);
  assert.equal(s.version, canon.source().commit);
  assert.match(s.terms, /non-commercial/);
});

// Review of #94: a text's story or introduction had moved to the text before it.
const OPENING = /^\d+(?:\s*[-–]\s*\d+)?\.\s*\S.*(?:vaṇṇanā|vatthu)$/;
const HEADINGS = new Set(['subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead', 'centre']);

test('no aligned passage carries the next text\'s opening heading', () => {
  const d = commentary.load();
  const bad = [];
  for (const [i, [bi, start, end]] of d.passages.entries()) {
    const blocks = d.books[bi].blocks.slice(start, end);
    const first = blocks.findIndex((x) => commentary.paraRange(x[1]));
    const late = blocks.slice(first + 1).find((x) => (HEADINGS.has(x[0]) || x[2].length <= 80) && OPENING.test(x[2]));
    if (late) bad.push(`#${i} ${d.books[bi].file}: ${late[2]}`);
  }
  assert.deepEqual(bad.slice(0, 5), []);
});

test('each Dhammapada verse and Theragāthā text keeps its own story or introduction', () => {
  const own = {
    'Dhp 277': 'Aniccalakkhaṇavatthu', 'Dhp 278': 'Dukkhalakkhaṇavatthu', 'Dhp 279': 'Anattalakkhaṇavatthu',
    'Dhp 54': 'Ānandattherapañhāvatthu', 'Dhp 153': 'Udānavatthu', 'Thag 1.2': 'Mahākoṭṭhikattheragāthāvaṇṇanā',
    'Thag 1.3': 'Kaṅkhārevatattheragāthāvaṇṇanā', 'Thig 1.3': 'Puṇṇātherīgāthāvaṇṇanā', 'Ja 2': 'Vaṇṇupathajātakavaṇṇanā',
  };
  const notOwn = {
    'Dhp 277': 'Dukkhalakkhaṇavatthu', 'Dhp 278': 'Anattalakkhaṇavatthu', 'Dhp 53': 'Ānandattherapañhāvatthu',
    'Dhp 152': 'Udānavatthu', 'Thag 1.2': 'Kaṅkhārevata', 'Thag 1.3': 'Puṇṇattheragāthāvaṇṇanā', 'Ja 1': 'Vaṇṇupathajātakavaṇṇanā',
  };
  const text = (ref) => all(ref).segments.map((s) => s.text).join('\n');
  for (const [ref, h] of Object.entries(own)) assert.ok(text(ref).includes(h), `${ref} should show ${h}`);
  for (const [ref, h] of Object.entries(notOwn)) assert.ok(!text(ref).includes(h), `${ref} must not show ${h}`);
  // Thag 1.3 begins with Revata's own introduction, not mid-explanation.
  assert.match(all('Thag 1.3').segments[0].text, /Kaṅkhārevatattheragāthāvaṇṇanā/);
});

test('Dhp 208 has its commentary; the Suttanipāta verse numbered one higher is not moved to the next sutta', () => {
  const r = all('Dhp 208');
  assert.equal(r.available, true);
  assert.ok(r.segments.some((s) => s.text.includes('Sakkavatthu')));
  assert.ok(!r.segments.some((s) => s.text.includes('Piyavaggo')));
  assert.ok(!all('Snp 3.8').segments.some((s) => s.text.includes('Bhikkhavo tisatā')));
});

test('no root paragraph 0 and no book front matter in the first text of a nipāta', () => {
  for (const ref of ['AN 2.1', 'AN 3.1', 'AN 4.1']) {
    const r = all(ref);
    assert.equal(r.available, true, ref);
    assert.ok(r.segments.every((s) => !s.comments_on_vri_paragraphs.startsWith('0')), ref);
    assert.ok(!r.segments.some((s) => /Namo tassa|^\. /.test(s.text)), ref);
  }
  const d = commentary.load();
  assert.ok(d.passages.every((p) => p[4] >= 1));
});

test('books that restart their paragraph numbers: each passage goes to one place only', () => {
  // The Jātaka root restarts its numbers at each nipāta: Ja 1 gets the Ekanipāta commentary only.
  const r = all('Ja 1');
  assert.ok(r.passages.every((p) => p.vri_file === 's0513a1.att.xml'), JSON.stringify(r.passages.map((p) => p.vri_file)));
  assert.match(r.segments[0].text, /Apaṇṇakajātakavaṇṇanā/);
  assert.ok(!all('Ja 151').segments.some((s) => s.text.includes('Apaṇṇaka')));
});

test('paraRange reads VRI paragraph numbers like the build does', () => {
  assert.deepEqual(commentary.paraRange('12'), [12, 12]);
  assert.deepEqual(commentary.paraRange('105-106'), [105, 106]);
  assert.deepEqual(commentary.paraRange('105–106'), [105, 106]);
  assert.deepEqual(commentary.paraRange('105-6'), [105, 106]);
  assert.deepEqual(commentary.paraRange(' 92 - 95 '), [92, 95]);
  assert.equal(commentary.paraRange('0'), null);
  assert.equal(commentary.paraRange('7-3'), null);
  assert.equal(commentary.paraRange(null), null);
});

test('texts the commentary numbers but that stay unaligned are listed, and few', () => {
  const d = commentary.load();
  assert.ok(Array.isArray(d.cited_unaligned));
  for (const coll of ['dn', 'mn', 'sn', 'dhp']) assert.equal(d.coverage[coll].cited_aligned, d.coverage[coll].cited, coll);
  assert.ok(!d.cited_unaligned.includes('sn12.21'));
  assert.deepEqual(d.units['sn12.21'],[14338]);
  assert.ok(d.coverage.an.cited_aligned >= d.coverage.an.cited - 1);
});
