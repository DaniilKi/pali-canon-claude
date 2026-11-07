// Check a returned cross-tool command against independently selected source segments.
import assert from 'node:assert/strict';
export async function checkReading(call, command, expected) {
  assert.ok(command && ['get_text', 'get_commentary'].includes(command.tool), 'Missing or unsupported evidence-reading command');
  const { tool, ...args } = command;
  const result = await call(tool, args);
  assert.equal(result.returned, 1, `${tool}: evidence must select exactly one segment`);
  assert.deepEqual(result.segments, [expected], `${tool}: command does not read the cited source segment`);
  if (tool === 'get_commentary') {
    assert.equal(result.available, true);
    assert.match(result.label, /Commentary/);
    assert.equal(result.next_offset, null);
  }
  return result;
}
export async function parallelPages(call, uid) {
  const links = [];
  let offset = 0;
  let total;
  for (;;) {
    const result = await call('get_parallels', { uid, offset, limit: 100 });
    total ??= result.total;
    assert.equal(result.total, total, `${uid}: parallel count changed while paging`);
    assert.equal(result.offset, offset);
    assert.equal(result.returned, result.links.length);
    links.push(...result.links);
    assert.ok(links.length <= total);
    if (result.next_offset === null) break;
    assert.equal(result.next_offset, offset + result.returned);
    assert.ok(result.next_offset > offset, `${uid}: parallel continuation does not advance`);
    offset = result.next_offset;
  }
  assert.equal(links.length, total, `${uid}: missing parallel evidence`);
  return links;
}
