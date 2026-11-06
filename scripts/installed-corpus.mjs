// Compare paginated MCP output with the source corpus. Kept separate for negative regression fixtures.
import assert from 'node:assert/strict';

export async function checkPages(call, name, args, expected, { metadata = () => {}, limit = 200 } = {}) {
  const segments = JSON.parse(JSON.stringify(expected)); // Compare the actual JSON wire representation.
  let offset = 0;
  let pages = 0;
  do {
    const result = await call(name, { ...args, offset, limit });
    metadata(result);
    assert.equal(result.total_segments, segments.length, `${name}: total segment count`);
    assert.equal(result.offset, offset, `${name}: requested offset`);
    assert.equal(result.limit, limit, `${name}: requested limit`);
    const page = segments.slice(offset, offset + limit);
    assert.equal(result.returned, page.length, `${name}: returned segment count`);
    assert.deepEqual(result.segments, page, `${name}: source text and citation at offset ${offset}`);
    offset += page.length;
    assert.equal(result.next_offset, offset < segments.length ? offset : null, `${name}: continuation offset`);
    pages += 1;
  } while (offset < segments.length);
  return { segments: segments.length, pages };
}
