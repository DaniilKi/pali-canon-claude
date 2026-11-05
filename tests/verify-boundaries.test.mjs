import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import { verifyQuote } from '../src/verify.mjs';

const tokens = (text) => canon.fold(text).split(/[^a-z0-9]+/u).filter(Boolean);
const sourceBlocks = (unit) => canon.load().canon.books[unit.book].blocks.slice(unit.start, unit.end);
// Deliberately juxtaposed source fragments are negative boundary fixtures, not quotations attributed to scripture.
const across = (a, b) => {
  const left = canon.resolve(a).unit, right = canon.resolve(b).unit;
  assert.equal(left.book, right.book);
  assert.equal(left.end, right.start);
  return [...tokens(sourceBlocks(left).map((block) => block[2]).join(' ')).slice(-10),
    ...tokens(sourceBlocks(right).map((block) => block[2]).join(' ')).slice(0, 10)].join(' ');
};
function assertContained(result) {
  for (const hit of result.matches) {
    const unit = canon.resolve(hit.text_id).unit;
    const full = tokens(sourceBlocks(unit).map((block) => block[2]).join(' ')).join(' ');
    const excerpt = tokens(hit.matched_text.replace(/…$/u, '')).join(' ');
    assert.ok(full.includes(excerpt), `${hit.text_id}: excerpt must belong entirely to its citation`);
  }
}

test('quote verification cannot score adjacent independent texts as one exact passage', async () => {
  for (const pair of [['mn1', 'mn2'], ['sn1.1', 'sn1.2']]) {
    const result = await verifyQuote({ text: across(...pair), language: 'pali', limit: 10 });
    assert.ok(result.best_similarity < 1, pair.join('/'));
    assertContained(result);
  }
});

test('a passage spanning grouped verses uses a citation containing every matched block', async () => {
  const result = await verifyQuote({ text: across('dhp183', 'dhp184'), language: 'pali', limit: 5 });
  assert.equal(result.verdict, 'found');
  assert.equal(result.best_similarity, 1);
  assert.equal(result.matches[0].text_id, 'dhp179-196');
  assertContained(result);
});

test('ordinary within-text passages retain exact matches and source containment', async () => {
  for (const citation of ['MN 10', 'Dhp 183', 'SN 1.1', 'Bu Pj 1', 'Ds 1.1', 'Vb 6', 'Kv 1.1']) {
    const unit = canon.resolve(citation).unit;
    const body = canon.segments(unit).filter((segment) => segment.type !== 'heading');
    const text = [...body].sort((a, b) => b.text.length - a.text.length)[0].text;
    const query = tokens(text).slice(0, 16).join(' ');
    const result = await verifyQuote({ text: query, language: 'pali', limit: 5 });
    assert.equal(result.verdict, 'found', citation);
    assert.equal(result.best_similarity, 1, citation);
    assertContained(result);
  }
});
