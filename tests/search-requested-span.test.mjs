import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';

const opening = (unit) => canon.segments(unit).find((s) => s.type !== 'heading' && s.text.length > 60);
for (const id of ['sn12.21', 'an1.82', 'pli-tv-bu-vb-as3']) {
  test(`an explicitly requested approximate span is searchable with its caution: ${id}`, () => {
    const { unit } = canon.resolve(id);
    assert.ok(unit.approximate);
    const segment = opening(unit);
    const query = `"${segment.text.split(/\s+/).slice(0, 6).join(' ')}"`;
    const result = canon.search(query, { collection: id, limit: 1 });
    assert.equal(result.total_texts_matched, 1);
    assert.equal(result.results[0].id, id);
    assert.equal(result.results[0].approximate, true);
    assert.deepEqual(result.results[0].alignment, canon.alignmentInfo(unit));
    assert.deepEqual(result.scope_alignment, canon.alignmentInfo(unit));
    assert.equal(result.scope_source_span.text_id, id);
    assert.match(result.scope_source_span.note, /does not verify/i);
    assert.equal(result.next_offset, null);
    const after = canon.search(query, { collection: id, offset: 1, limit: 1 });
    assert.equal(after.total_texts_matched, 1);
    assert.deepEqual(after.results, []);
    assert.equal(after.next_offset, null);
    assert.equal(canon.search('"zzzzabsentsourcephrase"', { collection: id }).total_texts_matched, 0);
    assert.ok(!canon.search(query, { limit: 10000 }).results.some((r) => r.id === id), 'broad search still excludes uncertain identities');
  });
}

test('exact source scope supports a whole rendered stanza and retains title pagination', () => {
  const { unit } = canon.resolve('dhp183');
  const stanza = canon.segments(unit).find((s) => s.type === 'verse');
  const r = canon.search(`"${stanza.text}"`, { collection: unit.id, limit: 1 });
  assert.equal(r.results[0].id, unit.id);
  assert.equal(r.total_texts_matched, 1);
  assert.equal(canon.search('dhamma', { collection: 'sn12.21' }).scope_source_span.text_id, 'sn12.21');
  const titles = canon.search(unit.acronym, { collection: unit.id, limit: 1 });
  assert.equal(titles.title_matches[0].id, unit.id);
  assert.equal(titles.title_next_offset, null);
});
