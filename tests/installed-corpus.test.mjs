import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPages } from '../scripts/installed-corpus.mjs';

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
