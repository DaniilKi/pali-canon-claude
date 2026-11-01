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
  for (const p of r.passages) assert.ok(['paragraph', 'paragraph+lemma'].includes(p.alignment));
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
  assert.deepEqual(Object.keys(tools[0].schema), ['uid', 'offset', 'limit']);
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
