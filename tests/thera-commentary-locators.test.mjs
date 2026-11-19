import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import { load, getCommentary, commentaryReadingSource } from '../src/commentary.mjs';
import { readPassage, WIDGET_VERSION, WIDGET_TOOL, registerChatgptWidget } from '../src/chatgpt-widget.mjs';
import { APADANA_PROFILES, APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR } from '../src/apadana-profiles.mjs';
import { assertPositionPin, sourceRevision } from '../web/reading-position.mjs';
import { SCRIPTS } from '../src/script.mjs';
import { expectedSegments } from '../scripts/evidence/study-scripts.mjs';
import { fixture, view } from './helpers/widget-view.mjs';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const edition = '2d134ff9ef60f70a1eb03c9370580228811a3070';
const revision = () => edition + '-tha19-c-' + digest(load().units['tha-ap19'].map(i => load().passages[i])).slice(0, 24);
const sourcePin = source => source.locator_revision || source.commit;

test('Thera19 aligned commentary owns only its three genuine passages and pins their actual tuples', () => {
  const d = load(), page = getCommentary('tha-ap19', { limit: 200 });
  assert.deepEqual(d.units['tha-ap19'], [8915, 8916, 8917]);
  assert.deepEqual(d.units['tha-ap20'], [8918, 8919, 8920, 8921]);
  assert.equal(page.source.commit, edition); assert.equal(page.source.locator_revision, revision());
  assert.equal(page.source.locator_revision, edition + '-tha19-c-958128ac779edd92f7ab7ff8');
  assert.equal(page.total_segments, 7); assert.equal(page.returned, 7);
  assert.deepEqual(page.segments.map(s => s.ref), Array.from({ length: 7 }, (_, i) => 'tha-ap19/c' + (i + 1)));
  assert.deepEqual(page.passages.map(p => p.comments_on.vri_paragraphs), ['86', '87', '88']);
  assert.deepEqual([...new Set(page.segments.map(s => s.comments_on_vri_paragraphs))], ['86', '87', '88']);
  assert.equal(page.segments.at(-1).type, 'heading');
  for (const segment of page.segments) assert.deepEqual(getCommentary(segment.ref, { limit: 1 }).segments, [segment]);
  const old = new URLSearchParams({ source: edition, ref: 'tha-ap19/c1', offset: '0' });
  assert.throws(() => assertPositionPin(old, page), /mapping revision changed/);
  old.set('source', revision()); assert.doesNotThrow(() => assertPositionPin(old, page));
  assert.equal(sourceRevision(getCommentary('tha-ap19/c7')), revision());
});

test('commentary preflight resolves canonical/book metadata without touching source words or exact-anchor bounds', () => {
  const d = load(), descriptors = d.books.map(book => Object.getOwnPropertyDescriptor(book, 'blocks'));
  // A source-word read would throw: preflight must inspect metadata and tuples only.
  d.books.forEach(book => Object.defineProperty(book, 'blocks', { configurable: true, get() { throw Error('Preflight rendered commentary words'); } }));
  try {
    for (const uid of ['tha-ap19', 'tha-ap19/c1', 'tha-ap19/c39', 'tha-ap19/c999999999999999999999999999']) assert.equal(commentaryReadingSource(uid).locator_revision, revision());
    assert.equal(commentaryReadingSource('SN 12.21/c999999').locator_revision, edition + '-sn21-commentary-5d4a1ce27e404e2952cf4dcc');
    for (const book of d.books) {
      const source = commentaryReadingSource('commentary:' + book.file + '/c999999');
      assert.equal(source.commit, edition); assert.equal(source.locator_revision, undefined); assert.equal(Object.hasOwn(source, 'segments'), false);
    }
    assert.equal(commentaryReadingSource('commentary').commit, edition);
    assert.throws(() => commentaryReadingSource('commentary:unknown.att.xml/c1'), /Unknown commentary book/);
    assert.throws(() => commentaryReadingSource('unknown-canon-reference/c1'));
  } finally { d.books.forEach((book, i) => Object.defineProperty(book, 'blocks', descriptors[i])); }
});

test('all fresh Thera19 widget anchors/context/continuations use the mapping revision across scripts', async () => {
  const previous = globalThis.fetch; let attempts = 0;
  globalThis.fetch = async () => { attempts++; throw Error('Unexpected source fetch'); };
  try {
    const parent = getCommentary('tha-ap19', { limit: 200 }); assert.equal(parent.total_segments, 7, 'Only the independently repaired mapping is acceptable');
    for (const script of SCRIPTS) {
      let page = await readPassage({ commentary: 'tha-ap19', english: false, limit: 2, script }), all = [];
      for (;;) {
        assert.equal(page.source.commit, edition); assert.equal(page.source.locator_revision, revision());
        all.push(...page.pali.segments);
        if (!page.pali.continue_with) break;
        const args = page.pali.continue_with.arguments;
        assert.equal(args.source_commit, revision()); assert.equal(args.commentary, 'tha-ap19');
        page = await readPassage(args);
      }
      assert.deepEqual(all, expectedSegments(parent.segments, script));
      for (const segment of parent.segments) {
        const exact = await readPassage({ commentary: segment.ref, english: false, script, source_commit: revision() });
        assert.equal(exact.pali.read_with.arguments.source_commit, revision());
        assert.deepEqual(exact.pali.segments, expectedSegments([segment], script));
        assert.equal(exact.pali.context_with.arguments.source_commit, revision());
        const context = await readPassage(exact.pali.context_with.arguments);
        assert.equal(context.context_for, segment.ref); assert.equal(context.source.locator_revision, revision());
        for (const command of [context.pali.read_with, context.pali.exact_with, context.pali.continue_with].filter(Boolean)) assert.equal(command.arguments.source_commit, revision());
        const returned = await readPassage(context.pali.exact_with.arguments);
        assert.deepEqual(returned.pali.segments, exact.pali.segments);
        const alias = await readPassage({ uid: segment.ref, english: false, script, source_commit: revision() });
        assert.deepEqual(alias.pali.segments, exact.pali.segments);
      }
    }
    assert.equal(attempts, 0);
  } finally { globalThis.fetch = previous; }
});

test('native MCP schema accepts compact Thera19 and established SN21 locator pins for exact/context/continuation replay', async () => {
  const server = createServer(); registerChatgptWidget(server);
  const client = new Client({ name: 'thera-commentary-locator-regression', version: '1' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const invoke = async arguments_ => {
    const result = await client.callTool({ name: WIDGET_TOOL, arguments: arguments_ });
    assert.ok(!result.isError, JSON.stringify(result.content)); return result.structuredContent;
  };
  try {
    await server.connect(serverSide); await client.connect(clientSide);
    const tool = (await client.listTools()).tools.find(t => t.name === WIDGET_TOOL), pattern = new RegExp(tool.inputSchema.properties.source_commit.pattern);
    assert.ok(pattern.test(revision())); assert.ok(pattern.test(edition + '-sn21-commentary-5d4a1ce27e404e2952cf4dcc'));
    for (const [uid, expectedRevision] of [['tha-ap19', revision()], ['sn12.21', edition + '-sn21-commentary-5d4a1ce27e404e2952cf4dcc']]) {
      const first = await invoke({ commentary: uid, english: false, limit: 1, source_commit: expectedRevision });
      const next = await invoke(first.pali.continue_with.arguments); assert.equal(next.pali.offset, 1); assert.equal(next.source.locator_revision, expectedRevision);
      const exact = await invoke({ commentary: uid + '/c1', english: false, source_commit: expectedRevision });
      const context = await invoke(exact.pali.context_with.arguments), returned = await invoke(context.pali.exact_with.arguments);
      assert.deepEqual(returned.pali.segments, exact.pali.segments);
      for (const command of [first.pali.read_with, first.pali.continue_with, exact.pali.read_with, exact.pali.context_with, context.pali.read_with, context.pali.exact_with]) {
        assert.equal(command.arguments.source_commit, expectedRevision); assert.ok(pattern.test(command.arguments.source_commit));
      }
      const stale = await client.callTool({ name: WIDGET_TOOL, arguments: { commentary: uid + '/c999', english: false, source_commit: edition } });
      assert.equal(stale.isError, true); assert.match(JSON.stringify(stale.content), /source version or locator revision changed/);
    }
  } finally { await client.close(); await server.close(); }
});

test('stale revision refuses before vanished-tail lookup; fresh bounds and changed anchor fingerprints still refuse', async () => {
  const d = load(), descriptors = d.books.map(book => Object.getOwnPropertyDescriptor(book, 'blocks'));
  d.books.forEach(book => Object.defineProperty(book, 'blocks', { configurable: true, get() { throw Error('Stale widget request accessed commentary words'); } }));
  try {
    for (const source_commit of [edition, edition + '-tha19-c-' + '0'.repeat(24)]) {
      for (const commentary of ['tha-ap19', 'tha-ap19/c1', 'tha-ap19/c8', 'tha-ap19/c39', 'tha-ap19/c999999999999999999999999999']) {
        await assert.rejects(readPassage({ commentary, source_commit, english: false }), /source version or locator revision changed/);
        await assert.rejects(readPassage({ uid: commentary + (commentary === 'tha-ap19' ? '/c1' : ''), source_commit, english: false }), /source version or locator revision changed/);
      }
      await assert.rejects(readPassage({ commentary: 'tha-ap19', offset: 2, limit: 2, source_commit, english: false }), /source version or locator revision changed/);
    }
  } finally { d.books.forEach((book, i) => Object.defineProperty(book, 'blocks', descriptors[i])); }
  await assert.rejects(readPassage({ commentary: 'tha-ap19/c8', source_commit: revision(), english: false }), /segment does not exist/);
  const exact = await readPassage({ commentary: 'tha-ap19/c1', english: false });
  await assert.rejects(readPassage({ ...exact.pali.context_with.arguments, anchor_sha256: '0'.repeat(64) }), /exact commentary segment has changed/);
  await assert.rejects(readPassage({ ...exact.pali.context_with.arguments, source_commit: edition }), /source version or locator revision changed/);
});

test('SN21 keeps its exact established revision and now accepts fresh widget cursors; all unrelated sources remain unchanged', async () => {
  const sn = getCommentary('sn12.21', { limit: 200 }), snRevision = edition + '-sn21-commentary-5d4a1ce27e404e2952cf4dcc';
  assert.equal(sn.source.locator_revision, snRevision);
  const first = await readPassage({ commentary: 'SN 12.21', english: false, limit: 1, source_commit: snRevision });
  assert.equal(first.pali.continue_with.arguments.source_commit, snRevision);
  assert.deepEqual((await readPassage(first.pali.continue_with.arguments)).pali.segments, [sn.segments[1]]);
  const exact = await readPassage({ commentary: 'sn12.21/c3', english: false, source_commit: snRevision });
  const context = await readPassage(exact.pali.context_with.arguments);
  assert.equal(context.pali.read_with.arguments.source_commit, snRevision); assert.equal(context.pali.exact_with.arguments.source_commit, snRevision);
  assert.deepEqual((await readPassage(context.pali.exact_with.arguments)).pali.segments, exact.pali.segments);
  for (const commentary of ['SN 12.21', 'sn12.21/c3', 'sn12.21/c999']) await assert.rejects(readPassage({ commentary, source_commit: edition, english: false }), /source version or locator revision changed/);
  for (const [uid, count, hash] of [
    ['tha-ap20', 36, '730cd97f512e84d1b6a534d6f19abbf3e4330db7ce9e53068df6ffd3611359f8'],
    ['thi-ap19', 0, '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945'],
    ['commentary:s0510a.att.xml', 3166, '2ed4b993f0085daf825ea174b99d6d29ed9cd7b13326a5e9555009e18598997f'],
  ]) {
    const page = getCommentary(uid, { limit: 99999 }); assert.equal(page.total_segments, count); assert.equal(digest(page.segments), hash);
    assert.equal(page.source.locator_revision, undefined); assert.deepEqual(commentaryReadingSource(uid), page.source);
    const displayed = await readPassage({ commentary: uid, english: false, limit: 1, source_commit: edition });
    assert.equal(displayed.source.commit, edition); assert.equal(displayed.source.locator_revision, undefined);
    if (displayed.pali.continue_with) assert.equal(displayed.pali.continue_with.arguments.source_commit, edition);
  }
  for (const book of load().books) assert.equal(commentaryReadingSource('commentary:' + book.file).locator_revision, undefined);
  for (const uid of Object.keys(load().units)) if (!['tha-ap19', 'sn12.21'].includes(uid)) {
    const source = commentaryReadingSource(uid); assert.equal(source.commit, edition); assert.equal(source.locator_revision, undefined, uid);
  }
  for (let n = 1; n <= 40; n++) assert.equal(commentaryReadingSource('thi-ap' + n).locator_revision, undefined);
});

const pins = ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'];
const notes = numbers => numbers.map(number => ({ number, text: 'Synthetic editorial note ' + number }));
const apparatus = descriptor => ({ ...structuredClone(descriptor), text: 'Synthetic separately owned apparatus.', translator_notes: notes(descriptor.note_numbers) });
function apadanaFixture(uid) {
  const p = APADANA_PROFILES[uid]; assert.ok(p, 'The finite approved profile must be installed');
  const english = { source: 'apadana', translation_id: canon.translationId(p), url: p.url, fetched_url: p.raw_url, translation_revision: APADANA_COMMIT,
    translator: APADANA_TRANSLATOR, license: APADANA_LICENSE, license_url: APADANA_LICENSE_URL, attribution: 'Synthetic attribution', changes: 'Synthetic extraction notice',
    text: 'Synthetic poem wording, not source evidence.', publisher_paratext: p.paratext_sha256 === createHash('sha256').update('').digest('hex') ? '' : 'Synthetic separately owned publisher preface.',
    translator_notes: notes(p.note_numbers || Array.from({ length: p.note_count }, (_, i) => i + 1)), mapping_notes: [...p.mapping_notes], notes: [...p.mapping_notes], ...Object.fromEntries(pins.map(key => [key, p[key]])) };
  if (p.chapter_summary) english.chapter_summary = apparatus(p.chapter_summary);
  if (p.publisher_divisions) english.publisher_divisions = p.publisher_divisions.map(apparatus);
  if (p.publisher_preface) english.publisher_preface = { ...structuredClone(p.publisher_preface), translator_notes: notes(p.publisher_preface.note_numbers) };
  if (p.collection_summary) english.collection_summary = apparatus(p.collection_summary);
  return { ...fixture(), text_id: uid, english };
}

test('current widget displays the two finite post-poem/summary recitation placements without invented before labels or empty summary notes', () => {
  assert.equal(WIDGET_VERSION, 'v25');
  for (const bridge of ['Apps SDK', 'MCP Apps']) for (const [uid, placement, caption] of [
    ['tha-ap19', 'after_poem', 'After the publisher poem.'], ['tha-ap32', 'after_chapter_summary', 'After the chapter summary.'],
  ]) {
    const p = APADANA_PROFILES[uid]; assert.ok(p); assert.equal(p.publisher_divisions.length, 1);
    const division = p.publisher_divisions[0];
    assert.deepEqual(Object.keys(division).sort(), ['body_sha256', 'kind', 'label', 'note_numbers', 'notes_sha256', 'parent_id', 'placement']);
    assert.equal(division.kind, 'publisher_recitation'); assert.equal(division.parent_id, uid); assert.equal(division.placement, placement); assert.deepEqual(division.note_numbers, []);
    const widget = view(bridge); widget.output(apadanaFixture(uid));
    const english = widget.elements.english.textContent;
    assert.match(english, /Synthetic poem wording/); assert.ok(english.includes(caption)); assert.ok(!english.includes('undefined')); assert.ok(!english.includes('Before publisher local stanza'));
    assert.ok(!english.includes('Recitation notes ·')); assert.ok(!english.includes('Chapter summary notes ·'));
  }
});

test('widget preserves old Theri before-stanza and nonempty summary-note UI and shares locator metadata without source words', async () => {
  for (const uid of ['thi-ap10', 'thi-ap20', 'thi-ap28', 'thi-ap30', 'thi-ap31', 'thi-ap40']) {
    const widget = view('Apps SDK'); widget.output(apadanaFixture(uid)); const p = APADANA_PROFILES[uid], english = widget.elements.english.textContent;
    assert.match(english, /Synthetic poem wording/);
    if (p.chapter_summary) assert.ok(english.includes('Chapter summary notes · editorial, not poem notes'));
    for (const division of p.publisher_divisions || []) assert.ok(english.includes('Before publisher local stanza ' + division.before_local_label + ', printed global label ' + division.before_publisher_label + '.'));
    if (p.publisher_preface) assert.ok(english.includes('Preface notes · editorial, not poem notes'));
    if (p.collection_summary) assert.ok(english.includes('Collection summary notes · editorial, not poem notes'));
  }
  const widget = view('Apps SDK', { stateWriter: () => {} }), page = await readPassage({ commentary: 'tha-ap19/c1', english: false });
  widget.output(page); const metadata = JSON.parse(widget.stateUpdates.at(-1).modelContent).pali_reader;
  assert.equal(metadata.source.commit, edition); assert.equal(metadata.source.locator_revision, revision());
  assert.equal(metadata.pali.read_with.arguments.source_commit, revision());
  const serialized = JSON.stringify(metadata); assert.ok(!serialized.includes(page.pali.segments[0].text));
});
