import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPages, canonicalReadArguments } from '../scripts/installed-corpus.mjs';
import { checkPages as checkCorpusPages } from '../scripts/corpus-check.mjs';

const segments = Array.from({ length: 5 }, (_, i) => ({ ref: `test/${i + 1}`, text: `source text ${i}` }));
function source(_name, { offset, limit }) {
  const page = segments.slice(offset, offset + limit);
  return { total_segments: segments.length, offset, limit, returned: page.length,
    next_offset: offset + page.length < segments.length ? offset + page.length : null, segments: page };
}
test('installed corpus audit checks every page, including the final partial page', async () => {
  const offsets = [];
  const result = await checkPages(async (name, args) => { offsets.push(args.offset); return source(name, args); }, 'get_text', {}, segments, { limit: 2 });
  assert.deepEqual(offsets, [0, 2, 4]);
  assert.deepEqual(result, { segments: 5, pages: 3 });
});
for (const [name, mutate] of [
  ['dropped text', (result) => { result.segments = result.segments.slice(1); }],
  ['changed scripture', (result) => { result.segments = result.segments.map((s) => ({ ...s, text: 'invented' })); }],
  ['missing continuation', (result) => { result.next_offset = null; }],
  ['repeated page', (result) => { result.offset = 0; }],
  ['wrong total', (result) => { result.total_segments += 1; }],
]) test(`installed corpus audit rejects ${name}`, async () => {
  await assert.rejects(checkPages(async (tool, args) => {
    const result = source(tool, args);
    if (args.offset === 2) mutate(result);
    return result;
  }, 'get_text', {}, segments, { limit: 2 }), assert.AssertionError);
});

const originalSource = '2d134ff9ef60f70a1eb03c9370580228811a3070';
const readingSource = { commit: originalSource, attribution: 'Synthetic audit source metadata', locator_revision: `${originalSource}-apadana-thera105-106-v1` };
for (const id of ['tha-ap107', 'tha-ap108']) for (const pager of ['corpus', 'installed']) {
  test(`${pager} auditor freshly obtains ${id} mapping and pins explicit zero plus every continuation`, async () => {
    const calls = [];
    const call = async (name, args) => {
      calls.push({ name, args });
      assert.equal(name, 'get_text'); assert.equal(args.uid, id);
      if (Object.hasOwn(args, 'offset')) assert.equal(args.source_commit, readingSource.locator_revision, 'numeric positions require the returned mapping, not the raw VRI commit');
      else { assert.equal(args.limit, 1); assert.equal(args.source_commit, undefined); }
      return { ...source(name, { ...args, offset: args.offset ?? 0 }), text_id: id, source: { ...readingSource } };
    };
    const args = await canonicalReadArguments(call, { uid: id, id, source: readingSource });
    assert.deepEqual(args, { uid: id, source_commit: readingSource.locator_revision });
    const metadata = result => assert.deepEqual(result.source, readingSource);
    const checked = pager === 'corpus'
      ? await checkCorpusPages(call, { tool: 'get_text', args, expected: segments, validate: metadata, pageSize: 2 })
      : await checkPages(call, 'get_text', args, segments, { metadata, limit: 2 });
    assert.equal(checked.pages, 3); assert.equal(checked.segments, segments.length);
    assert.deepEqual(calls.map(({ args }) => args.offset), [undefined, 0, 2, 4]);
    assert.ok(calls.slice(1).every(({ args }) => args.source_commit !== originalSource));
  });
}

test('auditor pair discovery rejects missing, stale or foreign source metadata before numeric paging', async () => {
  for (const patch of [
    { text_id: 'tha-ap108' },
    { source: undefined },
    { source: { ...readingSource, commit: '0'.repeat(40) } },
    { source: { ...readingSource, locator_revision: originalSource } },
    { source: { ...readingSource, locator_revision: `${originalSource}-unreviewed` } },
  ]) {
    const calls = [];
    await assert.rejects(canonicalReadArguments(async (_name, args) => {
      calls.push(args); return { text_id: 'tha-ap107', source: { ...readingSource }, ...patch };
    }, { uid: 'tha-ap107', id: 'tha-ap107', source: readingSource }), assert.AssertionError);
    assert.equal(calls.length, 1); assert.equal(Object.hasOwn(calls[0], 'offset'), false);
  }
  for (const changed of [{ ...readingSource, locator_revision: undefined }, { ...readingSource, locator_revision: originalSource }]) {
    await assert.rejects(canonicalReadArguments(() => assert.fail('invalid expected metadata cannot fetch'), { uid: 'tha-ap107', id: 'tha-ap107', source: changed }), assert.AssertionError);
  }
  assert.deepEqual(await canonicalReadArguments(() => assert.fail('unchanged canonical units need no discovery read'), { uid: 'MN 1', id: 'mn1', source: { commit: originalSource } }), { uid: 'MN 1' });
});

test('both auditor page validators still reject a mapping change after fresh discovery', async () => {
  const args = await canonicalReadArguments(async () => ({ text_id: 'tha-ap107', source: readingSource }), { uid: 'tha-ap107', id: 'tha-ap107', source: readingSource });
  const changed = async (name, request) => ({ ...source(name, request), source: { ...readingSource, locator_revision: originalSource } });
  const metadata = result => assert.deepEqual(result.source, readingSource);
  await assert.rejects(checkPages(changed, 'get_text', args, segments, { metadata, limit: 2 }), assert.AssertionError);
  await assert.rejects(checkCorpusPages(changed, { tool: 'get_text', args, expected: segments, validate: metadata, pageSize: 2 }), assert.AssertionError);
});
