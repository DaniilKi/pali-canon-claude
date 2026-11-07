import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';
import { getCommentary, load } from '../src/commentary.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';

function expectedText(segment, script) {
  if (segment.type !== 'verse') return transliterate(segment.text, 'roman', script);
  const lines = segment.text.split('\n');
  return lines.map((line, i) => transliterate(line, 'roman', script, { stanza: i === lines.length - 1 })).join('\n');
}
function assertPage(native, roman, script) {
  for (const key of ['text_id', 'citation', 'canonical', 'content_type', 'label', 'alignment', 'approximate', 'alignment_note', 'total_segments', 'offset', 'limit', 'returned', 'next_offset', 'source']) {
    assert.deepEqual(native[key], roman[key], `${script}: ${key}`);
  }
  assert.equal(native.script, script);
  assert.match(native.script_note, /transliterated/);
  assert.deepEqual(native.segments, roman.segments.map((segment) => ({ ...segment, text: expectedText(segment, script) })));
}

test('aligned commentary pages and exact anchors retain source identity in every supported script', () => {
  for (const uid of ['MN 10', 'Dhp 5', 'AN 2.1']) {
    const base = getCommentary(uid, { limit: 3 });
    for (const script of SCRIPTS.filter((s) => s !== 'roman')) {
      assertPage(getCommentary(uid, { script, limit: 3 }), base, script);
      const ref = base.segments[0].ref;
      assertPage(getCommentary(ref, { script }), getCommentary(ref), script);
    }
  }
});

test('all commentary source books retain direct unaligned identities, catalogue counts and page boundaries', () => {
  const catalogue = getCommentary('commentary', { limit: 200 });
  for (const script of SCRIPTS.filter((s) => s !== 'roman')) {
    const local = getCommentary('commentary', { script, limit: 200 });
    assert.equal(local.total_books, catalogue.total_books);
    assert.ok(!Object.hasOwn(local, 'segments'));
    assert.deepEqual(local.books.map((b) => b.uid), catalogue.books.map((b) => b.uid));
    for (const book of local.books) {
      const original = catalogue.books.find((b) => b.uid === book.uid);
      assert.equal(book.title_roman, original.title);
      assert.equal(book.title, transliterate(original.title, 'roman', script));
    }
    for (const book of load().books) {
      const uid = `commentary:${book.file}`;
      const base = getCommentary(uid, { offset: 1, limit: 2 });
      const local = getCommentary(uid, { offset: 1, limit: 2, script });
      assertPage(local, base, script);
      assert.equal(local.book.uid, base.book.uid);
      assert.equal(local.book.title_roman, base.book.title);
      assert.equal(local.book.title, transliterate(base.book.title, 'roman', script));
      assert.ok(local.segments.every((s) => !Object.hasOwn(s, 'comments_on_vri_paragraphs')));
      const ref = base.segments[0].ref;
      assertPage(getCommentary(ref, { script }), getCommentary(ref), script);
    }
  }
});

test('native canonical citation input is labelled independently from commentary output', () => {
  const native = transliterate('MN 10', 'roman', 'devanagari');
  const roman = getCommentary('MN 10', { limit: 2 });
  const result = getCommentary(native, { limit: 2 });
  assert.deepEqual(result.segments, roman.segments);
  assert.equal(result.input_script, 'devanagari');
  assert.equal(result.input_romanized, 'mn 10');
  assertPage(getCommentary(native, { limit: 2, script: 'thai' }), roman, 'thai');
  assert.throws(() => getCommentary('MN 10', { script: 'unknown' }), /Available/);
});

test('MCP commentary continuation follows the embedded script and rejects unsupported scripts', async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'commentary-script-continuation', version: '1' });
  await Promise.all([client.connect(a), createServer().connect(b)]);
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    assert.ok(!r.isError, JSON.stringify(r.content));
    return JSON.parse(r.content[0].text);
  };
  try {
    const first = await call('get_text', { uid: 'MN 10', commentary: true, script: 'sinh', limit: 1 });
    const { tool, ...args } = first.commentary.read_with;
    assert.equal(args.script, 'sinh');
    assert.ok(first.commentary.next_offset > 0);
    const next = await call(tool, { ...args, offset: first.commentary.next_offset, limit: 3 });
    const roman = getCommentary('MN 10', { offset: first.commentary.next_offset, limit: 3 });
    assertPage(next, roman, 'sinhala');
    assert.notEqual(next.segments[0].text, roman.segments[0].text);
    const plain = await call('get_text', { uid: 'MN 10', commentary: true, limit: 1 });
    assert.deepEqual(plain.commentary.read_with, { tool: 'get_commentary', uid: 'mn10' });
    const error = await client.callTool({ name: 'get_commentary', arguments: { uid: 'MN 10', script: 'unknown' } });
    assert.ok(error.isError);
  } finally { await client.close(); }
});
