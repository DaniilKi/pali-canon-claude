import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPages, toolData, options, sourceCoverage } from '../scripts/corpus-check.mjs';

// Synthetic transport fixtures, not scripture. Catch truncation and page corruption independently of the implementation.
const expected = [1, 2, 3, 4, 5].map((n) => ({ ref: `fixture/${n}`, type: 'prose', text: `Fixture ${n}`, vri_paragraph: String(n) }));
function reader(change = (page) => page) {
  const calls = [];
  const call = async (tool, args) => {
    calls.push({ tool, args });
    const segments = expected.slice(args.offset, args.offset + args.limit);
    return change({
      total_segments: expected.length, offset: args.offset, limit: args.limit,
      returned: segments.length, next_offset: args.offset + segments.length < expected.length ? args.offset + segments.length : null,
      segments,
    });
  };
  return { call, calls };
}

test('full reading follows exact page boundaries and has a page-size independent digest', async () => {
  const a = reader();
  const b = reader();
  const first = await checkPages(a.call, { tool: 'get_text', args: { uid: 'fixture' }, expected, pageSize: 2 });
  const second = await checkPages(b.call, { tool: 'get_text', args: { uid: 'fixture' }, expected, pageSize: 3 });
  assert.deepEqual(a.calls.map((c) => c.args.offset), [0, 2, 4]);
  assert.ok(a.calls.every((c) => c.tool === 'get_text' && c.args.uid === 'fixture'));
  assert.equal(first.pages, 3);
  assert.equal(first.segments, 5);
  assert.equal(first.sha256, second.sha256);
});

for (const [name, change] of [
  ['premature termination', (page) => ({ ...page, next_offset: null })],
  ['repeated page', (page) => ({ ...page, next_offset: page.offset })],
  ['skipped page', (page) => ({ ...page, next_offset: page.next_offset === null ? null : page.next_offset + 1 })],
  ['truncated page', (page) => ({ ...page, segments: page.segments.slice(1) })],
  ['wrong text with valid references', (page) => ({ ...page, segments: page.segments.map((s) => ({ ...s, text: 'Changed fixture' })) })],
  ['incorrect total', (page) => ({ ...page, total_segments: page.total_segments + 1 })],
  ['incorrect count', (page) => ({ ...page, returned: 0 })],
  ['wrong offset', (page) => ({ ...page, offset: page.offset + 1 })],
]) {
  test(`full reading rejects ${name}`, async () => {
    await assert.rejects(checkPages(reader(change).call, { tool: 'get_text', args: {}, expected, pageSize: 2 }));
  });
}

test('full reading rejects a bad source label even when every segment matches', async () => {
  await assert.rejects(checkPages(reader().call, {
    tool: 'get_post_canonical', args: {}, expected,
    validate: (page) => assert.equal(page.canonical, false),
  }));
});

test('tool decoding rejects errors and inconsistent structured content', () => {
  const data = { segments: expected };
  const content = [{ type: 'text', text: JSON.stringify(data) }];
  assert.deepEqual(toolData({ content, structuredContent: data }), data);
  assert.throws(() => toolData({ content, structuredContent: { segments: [] } }), /disagree/);
  assert.throws(() => toolData({ isError: true, content }), /Fixture/);
});

test('corpus options reject accidental partial or invalid checks', () => {
  assert.deepEqual(options([]), { server: 'server/index.cjs', pageSize: 60, scope: 'all' });
  assert.equal(options(['--scope', 'canon', '--page-size', '17']).pageSize, 17);
  for (const args of [['--scope', 'unknown'], ['--page-size', '0'], ['--page-size', '201'], ['--page-size', 'NaN'], ['--server'], ['--unknown'], ['--limit', '1']]) {
    assert.throws(() => options(args));
  }
});

test('source coverage exposes unreachable body blocks without counting titles as missing scripture', () => {
  const data = {
    books: [{ file: 'fixture.xml', blocks: [
      ['title', null, 'Fixture title'], ['centre', '0', 'Fixture front matter'],
      ['bodytext', '1', 'Fixture body'], ['gatha1', '2', 'Fixture verse'],
    ] }],
    units: [{ book: 0, start: 2, end: 3 }],
  };
  assert.deepEqual(sourceCoverage(data), {
    body_blocks: 3,
    uncovered: [
      { file: 'fixture.xml', block: 1, rend: 'centre', paragraph: '0' },
      { file: 'fixture.xml', block: 3, rend: 'gatha1', paragraph: '2' },
    ],
    uncovered_numbered: 1,
  });
});
