import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import * as commentary from '../src/commentary.mjs';
import { readBook } from '../src/source-books.mjs';
import { readPassage, WIDGET_TOOL, registerChatgptWidget } from '../src/chatgpt-widget.mjs';
import { assertPositionPin, readingPosition, sourceRevision } from '../web/reading-position.mjs';
import { expectedSegments } from '../scripts/evidence/study-scripts.mjs';

const edition = '2d134ff9ef60f70a1eb03c9370580228811a3070';
const revision = edition + '-thag16-3-5-v1';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const wording = segments => segments.map(({ ref, type, text }) => ({ ref, type, text }));
// Historical consumer metadata/hashes recorded on authentic D247 a8c6e471.
// No external fixture path or source wording is needed to replay these checks.
const rows = {
  'thag16.3': { old: [2973, 3045], current: [2973, 3041], oldCount: 26, count: 24, vri: '747–768', association: [8210, 8211],
    oldWording: 'a13e695cc717d1dc1018c344ca6406406e0986fe0014ec509554503b5e7a6c50',
    currentWording: 'b87c94358009c0d296a4c05c586051c0437e3e8918c6c9bfce7026874b185ef1',
    identity: '53dbae017bde02a7745c2dd778341b9dd64d4c5528e7765e550fb868f7bd8385',
    commentary: 'cd37083d47fd9db8145bcda55fc7ad998fed7845c030e18fb1ec937b668d26fc',
    commentaryWording: '916932eb3d4535ec8dfc1b4f3496df4f6a397eafdcea3571b04b4b17efa90f16',
    tuples: '450f505a81f068049b8e3733cdd78984f9b88c8e2e7492e9794106e9ca204770' },
  'thag16.4': { old: [3045, 3122], current: [3041, 3118], oldCount: 27, count: 27, vri: '769–793', association: [8212, 8213],
    oldWording: '5ba315eeca5ae8612f04e6a9542f92a2641c14f8b24d81e43916afcb5f8ba0e7',
    currentWording: 'a9b36edd3faadd5f6413a3e187c1a639b04c03e1699d1fea82f0a141bc833c3a',
    identity: '576aa6ab74ec7c15f873951ecc20170470ffb33b4ace79da7850235d96e1f6bd',
    commentary: '3cb723926a1d1e9e82c26f10ee1eb0e0464798e207efefba74708191095fa0b1',
    commentaryWording: '5376f3a5040bb0aa82abed92e58ae81e62643daf62dba07a91cbeb7b0d6401db',
    tuples: '2d1b8121befcc74fc8201b5f1647d5201137403c2b838fb1165ba6914bdfa6f0' },
  'thag16.5': { old: [3122, 3204], current: [3118, 3204], oldCount: 24, count: 26, vri: '794–817', association: [8214],
    oldWording: '56c09fbf0c9cb5b7e036688447fb8f9519086f9e6773b9102a2e933fcb154e41',
    currentWording: 'bae74f38c8051af2ded694ae59b06c738f31daf3ac2cc7c65005f0a8cd0c49b2',
    identity: '85bc070774267ad1994b156df55a05d57cb4a83a3e5463bc1e386fe11e515b38',
    commentary: 'ac0940d1c3eaed2813be220a0613889342445691e6eaf1a6947ffa474fe0d2df',
    commentaryWording: '99ac744eb6add4edab01b0e070d769b89c7085561aa626e3f7b9c27a72b80cd0',
    tuples: '6c6eb804d8e1b925cb053336b8bd7f87b94bc44131283c0f837cbb1e98dfab44' },
};
let client, server;
before(async () => {
  server = createServer(); registerChatgptWidget(server);
  client = new Client({ name: 'thag-sixteen-consumers', version: '1' });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
});
after(async () => { await client?.close(); await server?.close(); });
async function invoke(name, args) {
  const result = await client.callTool({ name, arguments: args });
  assert.ok(!result.isError, JSON.stringify(result.content));
  return result.structuredContent || JSON.parse(result.content.find(item => item.type === 'text').text);
}
const widget = args => invoke(WIDGET_TOOL, args);
const unitFor = uid => canon.resolve(uid).unit;
const metadata = uid => ({ source: canon.readingSource(unitFor(uid)) });

// These deliberately reproduce old extraction boundaries only inside a
// historical regression fixture; the production unit must own the new bounds.
function historicalSegments(uid, row) {
  return canon.segments({ ...unitFor(uid), start: row.old[0], end: row.old[1] });
}

test('the three citations keep their identities but expose only the corrected pinned root spans', () => {
  for (const [uid, row] of Object.entries(rows)) {
    const unit = unitFor(uid), segments = canon.segments(unit);
    assert.deepEqual([unit.start, unit.end], row.current); assert.equal(unit.vri, row.vri);
    assert.equal(unit.index_revision, 'thag16-3-5-v1'); assert.equal(segments.length, row.count);
    const { id, book, title, collection, acronym } = unit;
    assert.equal(digest({ id, book, title, collection, acronym }), row.identity);
    assert.equal(digest(wording(segments)), row.currentWording);
    const historical = historicalSegments(uid, row);
    assert.equal(historical.length, row.oldCount); assert.equal(digest(wording(historical)), row.oldWording);
    assert.equal(canon.readingSource(unit).commit, edition); assert.equal(canon.readingSource(unit).locator_revision, revision);
    assert.equal(canon.resolve(unit.acronym).unit.id, uid);
  }
  assert.equal(Object.values(rows).reduce((n, row) => n + row.oldCount, 0), 77);
  assert.equal(Object.values(rows).reduce((n, row) => n + row.count, 0), 77);
});

test('all 77 authentic old source/ref/offset bindings refuse before any source words, including vanished Thag16.3 tails', async () => {
  const book = canon.load().canon.books[34], original = Object.getOwnPropertyDescriptor(book, 'blocks');
  const originals = Object.entries(rows).map(([uid, row]) => [uid, row, historicalSegments(uid, row)]);
  let sourceWordReads = 0, checked = 0;
  Object.defineProperty(book, 'blocks', { configurable: true, get() { sourceWordReads++; throw Error('Stale consumer read source words'); } });
  try {
    for (const [uid, row, oldSegments] of originals) for (let offset = 0; offset < row.oldCount; offset++) {
      const segment = oldSegments[offset], args = new URLSearchParams({ source: edition, ref: segment.ref, offset: String(offset) });
      assert.throws(() => assertPositionPin(args, metadata(uid)), error => error.code === 'READING_SOURCE_CHANGED');
      await assert.rejects(readPassage({ uid, offset, limit: 1, source_commit: edition, english: false }), /source version or locator revision changed/);
      await assert.rejects(readPassage({ uid, segment: segment.ref, source_commit: edition, anchor_sha256: digest(segment), english: false }), /source version or locator revision changed/);
      checked++;
    }
    assert.equal(checked, 77); assert.equal(sourceWordReads, 0);
    for (const segment of ['thag16.3/25', 'thag16.3/26']) await assert.rejects(readPassage({ uid: 'thag16.3', segment, source_commit: edition, english: false }), /source version or locator revision changed/);
    assert.equal(sourceWordReads, 0);
  } finally { Object.defineProperty(book, 'blocks', original); }
});

test('native get_text is an unversioned current reading, not automatic migration of an old bare offset', async () => {
  const tools = (await client.listTools()).tools, schema = tools.find(t => t.name === 'get_text').inputSchema;
  assert.equal(schema.properties.source_commit.type, 'string');
  assert.equal(schema.required?.includes('source_commit') ?? false, false);
  for (const [uid, row] of Object.entries(rows)) {
    const page = await invoke('get_text', { uid, limit: 80 });
    assert.equal(page.source.commit, edition); assert.equal(page.source.locator_revision, revision); assert.equal(page.total_segments, row.count);
    assert.deepEqual(page.segments, canon.segments(unitFor(uid)));
    // Without an old locator pin the API reads today's offset in today's unit.
    // A caller must review the new pin; offset equality is not migration evidence.
    for (const offset of [0, row.oldCount - 1]) {
      const unversioned = await invoke('get_text', { uid, offset, limit: 1 });
      assert.equal(unversioned.source.locator_revision, revision);
      assert.deepEqual(unversioned.segments, page.segments.slice(offset, offset + 1));
    }
  }
  for (const offset of [24, 25]) assert.deepEqual((await invoke('get_text', { uid: 'thag16.3', offset, limit: 1 })).segments, []);
});

test('native widget schema replays all fresh current anchors, bookmarks, fingerprints and contexts in Roman and Sinhala', async () => {
  const tool = (await client.listTools()).tools.find(t => t.name === WIDGET_TOOL), sourcePattern = new RegExp(tool.inputSchema.properties.source_commit.pattern);
  assert.ok(sourcePattern.test(revision));
  let freshAnchors = 0;
  for (const script of ['roman', 'sinhala']) for (const [uid, row] of Object.entries(rows)) {
    const root = await invoke('get_text', { uid, script, limit: 80 });
    const roman = canon.segments(unitFor(uid)); assert.deepEqual(root.segments, expectedSegments(roman, script));
    let page = await widget({ uid, script, english: false, limit: 7, source_commit: revision }), segments = [];
    for (;;) {
      assert.equal(page.source.commit, edition); assert.equal(page.source.locator_revision, revision);
      assert.equal(page.pali.read_with.arguments.source_commit, revision); segments.push(...page.pali.segments);
      if (!page.pali.continue_with) break;
      assert.equal(page.pali.continue_with.arguments.source_commit, revision); page = await widget(page.pali.continue_with.arguments);
    }
    assert.deepEqual(segments, root.segments); assert.equal(segments.length, row.count);
    for (const [offset, segment] of root.segments.entries()) {
      const href = readingPosition({ uid }, offset, segment.ref, revision), args = new URLSearchParams(href.slice(6));
      assert.doesNotThrow(() => assertPositionPin(args, root)); assert.equal(sourceRevision(root), revision);
      const saved = await invoke('get_text', { uid, offset, limit: 1, script });
      assert.doesNotThrow(() => assertPositionPin(args, saved)); assert.deepEqual(saved.segments, [segment]);
      const exact = await widget({ uid, segment: segment.ref, script, english: false, source_commit: revision });
      assert.deepEqual(exact.pali.segments, [segment]); assert.equal(exact.pali.read_with.arguments.anchor_sha256, digest(segment));
      assert.equal(exact.pali.context_with.arguments.source_commit, revision);
      const context = await widget(exact.pali.context_with.arguments), returned = await widget(context.pali.exact_with.arguments);
      const first = Math.max(0, offset - 2), last = Math.min(root.segments.length, offset + 3);
      assert.deepEqual(context.pali.segments, root.segments.slice(first, last)); assert.deepEqual(returned.pali.segments, [segment]);
      for (const command of [exact.pali.read_with, exact.pali.context_with, context.pali.read_with, context.pali.exact_with, context.pali.continue_with].filter(Boolean)) assert.equal(command.arguments.source_commit, revision);
      freshAnchors++;
    }
  }
  assert.equal(freshAnchors, 154);
});

test('fresh source pins do not authorize wrong fingerprints, sibling refs or stale native widget bindings', async () => {
  for (const uid of Object.keys(rows)) {
    const exact = await widget({ uid, segment: uid + '/2', english: false, source_commit: revision });
    for (const args of [
      { ...exact.pali.context_with.arguments, anchor_sha256: '0'.repeat(64) },
      { ...exact.pali.context_with.arguments, source_commit: edition },
      { ...exact.pali.context_with.arguments, source_commit: edition + '-thag16-3-5-unreviewed' },
      { uid, segment: (uid === 'thag16.3' ? 'thag16.4' : 'thag16.3') + '/2', english: false, source_commit: revision },
    ]) assert.equal((await client.callTool({ name: WIDGET_TOOL, arguments: args })).isError, true);
  }
  for (const segment of ['thag16.3/25', 'thag16.3/26']) {
    const result = await client.callTool({ name: WIDGET_TOOL, arguments: { uid: 'thag16.3', segment, english: false, source_commit: edition } });
    assert.equal(result.isError, true); assert.match(JSON.stringify(result.content), /source version or locator revision changed/);
  }
});

test('all original aligned commentary associations, words, metadata and edition pins remain unchanged', async () => {
  const d = commentary.load();
  for (const [uid, row] of Object.entries(rows)) {
    assert.deepEqual(d.units[uid], row.association); assert.equal(digest(d.units[uid].map(i => d.passages[i])), row.tuples);
    const page = commentary.getCommentary(uid, { limit: 5000 });
    assert.equal(digest(page), row.commentary); assert.equal(digest(page.segments), row.commentaryWording);
    assert.equal(page.source.commit, edition); assert.equal(page.source.locator_revision, undefined);
    assert.deepEqual(commentary.commentaryReadingSource(uid), page.source);
    const exact = await widget({ commentary: uid + '/c1', english: false, source_commit: edition });
    assert.deepEqual(exact.pali.segments, page.segments.slice(0, 1)); assert.equal(exact.source.locator_revision, undefined);
    const context = await widget(exact.pali.context_with.arguments);
    assert.equal(context.source.commit, edition); assert.equal(context.pali.exact_with.arguments.source_commit, edition);
    assert.deepEqual((await widget(context.pali.exact_with.arguments)).pali.segments, exact.pali.segments);
  }
});

test('complete source-book, neighbouring citations and existing AP/Thi/SN locator identities remain independent', async () => {
  const root = canon.load().canon, book = root.books[34]; assert.equal(book.file, 's0508m.mul.xml');
  assert.equal(digest(book), 'b0b90484c28900df58af24661aa54dd482186e0d61cff04da9f420dbb713c4c1');
  const direct = readBook({ book: 's0508m', limit: 99999 });
  assert.equal(direct.total_segments, 1990); assert.equal(digest(direct.segments), 'bf9e0e43b7a4e10f5cceef2122b74cb0c4606049f001a919deb22c6eef777004');
  assert.equal(direct.source.commit, edition); assert.equal(direct.source.locator_revision, undefined);
  const widgetBook = await widget({ book: 's0508m', english: false, limit: 2, source_commit: edition });
  assert.equal(widgetBook.pali.continue_with.arguments.source_commit, edition); assert.deepEqual(widgetBook.pali.segments, direct.segments.slice(0, 2));
  for (const [uid, identity, words, fullUnit] of [
    ['thag16.2', '4c9af385ff2d8cb639f8b38c376f16bb8475fbb751722557bbc06d51fa10f885', 'f8f99548872f3a74ef4b0d2a08f9e41c026fba29b8a7e6d3a7845026550b0895', '1fdfd3fe57e505c80f68e16e1fd13d7907badb31129180f1ff893410ceb4c17d'],
    ['thag16.6', '60f5a94ca036d5dac7028316a6077a67a0826163aa5cd8767d57f05228f17ff3', 'e0d1afe84256a87ad2f61cd722d2a0c246be0af8d081f60922b3376379a43d02', 'f9d4924fd7c865c8ef25ba1f1422922f9bd5da6a742adac2c87db843defaec89'],
  ]) {
    const unit = unitFor(uid), { id, book, title, collection, acronym } = unit;
    assert.equal(digest({ id, book, title, collection, acronym }), identity); assert.equal(digest(wording(canon.segments(unit))), words); assert.equal(digest(unit), fullUnit);
    assert.equal(canon.readingSource(unit).commit, edition); assert.equal(canon.readingSource(unit).locator_revision, undefined);
    const fresh = await invoke('get_text', { uid, limit: 1 }); assert.equal(fresh.source.locator_revision, undefined);
  }
  for (const [uid, suffix] of [['thi-ap23', 'apadana-theri21-30-v1'], ['thi-ap33', 'apadana-theri31-40-v1'], ['tha-ap19', 'apadana-thera11-30-v1'], ['sn12.21', 'sn-dasabala-v1']]) assert.equal(canon.readingSource(unitFor(uid)).locator_revision, edition + '-' + suffix);
  assert.equal(canon.readingSource(unitFor('mn1')).locator_revision, undefined);
  assert.equal(commentary.commentaryReadingSource('sn12.21').locator_revision, edition + '-sn21-commentary-5d4a1ce27e404e2952cf4dcc');
  assert.equal(commentary.commentaryReadingSource('tha-ap19').locator_revision, edition + '-tha19-c-958128ac779edd92f7ab7ff8');
});

test('search returns the restored 769/794 openings under their correct citations and never the former neighbouring owner', async () => {
  for (const [uid, previous, stanza] of [['thag16.4', 'thag16.3', '769'], ['thag16.5', 'thag16.4', '794']]) {
    const page = await invoke('get_text', { uid, limit: 80 }), opening = page.segments.find(segment => segment.vri_paragraph === stanza);
    assert.ok(opening); assert.equal(page.segments[1].ref, opening.ref);
    // Query existing source wording rather than copying or reconstructing it.
    const query = '"' + opening.text.split('\n')[0].replaceAll('"', '') + '"';
    const result = await invoke('search_texts', { query, collection: 'thag', limit: 50 });
    assert.ok(result.results.some(hit => hit.id === uid)); assert.ok(!result.results.some(hit => hit.id === previous));
    const hit = result.results.find(hit => hit.id === uid); assert.equal(hit.match_vri_paragraph, stanza); assert.equal(hit.source.locator_revision, revision);
    const { tool, ...args } = hit.read_with, selected = await invoke(tool, args);
    assert.equal(selected.text_id, uid); assert.ok(selected.segments.some(segment => segment.ref === opening.ref));
    const oldScope = await invoke('search_texts', { query, collection: previous, limit: 50 }); assert.equal(oldScope.total_texts_matched, 0);
  }
});
