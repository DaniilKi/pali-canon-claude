import { requiredCanonicalRevision } from '../src/locator-policy.mjs';
// Compare paginated MCP output with the source corpus. Kept separate for negative regression fixtures.
import assert from 'node:assert/strict';

/** Freshly reopen the finite repaired pair, then pin every audited position.
 * The raw VRI source commit is provenance; it is not the ownership revision.
 * No saved citation, note or position is supplied to this auditor discovery read.
 */
export async function canonicalReadArguments(call, { uid, id, source }) {
  const args = { uid };
  if (!requiredCanonicalRevision(id)) return args;
  assert.match(source?.commit || '', /^[a-f0-9]{40}$/, 'reviewed canonical source commit');
  assert.equal(source?.locator_revision, requiredCanonicalRevision(id), 'current repaired pair locator revision');
  const reopened = await call('get_text', { uid, limit: 1 });
  assert.equal(reopened.text_id, id, 'fresh auditor reopening selected a different canonical owner');
  assert.deepEqual(reopened.source, source, 'auditor source or mapping differs from the reviewed corpus');
  return { ...args, source_commit: reopened.source.locator_revision };
}

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
