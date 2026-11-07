import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { liveCache } from '../src/cache.mjs';
import { verifyQuote, englishScope } from '../src/verify.mjs';
import { largeText, completeText, prefix, tailQuote, verificationLimit, html, fullLink } from './helpers/large-translation.mjs';
const originalFetch = globalThis.fetch; let saved;
const args = { text: tailQuote, language: 'english', texts: ['patthana1.1'] };
function install(text = largeText) {
  const d = canon.load(); saved ||= d.translations; d.translations = { ...d.translations, 'patthana1.1': [fullLink()] };
  globalThis.fetch = async url => { assert.equal(String(url), fullLink().url); return new Response(html(text)); };
  return canon.resolve('patthana1.1').unit;
}
afterEach(() => { if (saved) canon.load().translations = saved; saved = undefined; globalThis.fetch = originalFetch; liveCache.clear(); });

test('a quotation beyond the verification cap cannot become a negative verdict from its source prefix', async () => {
  const unit = install();
  const source = await english.translation(unit, canon.translationId(fullLink()), { limit: verificationLimit });
  assert.equal(source.text.length, verificationLimit); assert.equal(source.next_offset, verificationLimit); assert.ok(!source.text.includes(tailQuote));
  const tail = await english.translation(unit, source.translation_id, { offset: source.next_offset, limit: 500, prefix_sha256: createHash('sha256').update(source.text).digest('hex') });
  assert.ok(tail.text.includes(tailQuote)); assert.equal(tail.next_offset, null);
  await assert.rejects(verifyQuote(args), /Incomplete English source.*no quotation was compared/i);
});


test('an incomplete source cannot contribute even a positive prefix match', async () => {
  install();
  await assert.rejects(verifyQuote({ ...args, text: 'Synthetic fixture prefix amber lantern' }), /Incomplete English source/);
});

test('a complete source at the character limit still verifies its final quotation', async () => {
  const n = verificationLimit - completeText.length - 1;
  const text = prefix.slice(0, n - 1) + 'x ' + completeText; install(text);
  const source = await english.translation(canon.resolve('patthana1.1').unit, canon.translationId(fullLink()), { limit: verificationLimit });
  assert.equal(source.text.length, verificationLimit); assert.equal(source.total_characters, verificationLimit); assert.equal(source.next_offset, null);
  const result = await verifyQuote(args); assert.equal(result.verdict, 'found'); assert.equal(result.scope.complete_source_versions_compared, 1); assert.equal(result.scope.source_versions_not_compared, 0);
});

test('mixed complete/incomplete sources retain the unexamined version and restrict the verdict', async () => {
  const query = { text: tailQuote, language: 'english', texts: ['MN 10'] };
  const plan = englishScope(query.texts), incomplete = plan.pages[0].translation_id;
  for (const positive of [false, true]) {
    const result = await verifyQuote(query, { fetchTranslation: async (_unit, id) => id === incomplete
      ? { text: completeText, offset: 0, next_offset: completeText.length, total_characters: completeText.length + 100, translation_id: id }
      : { text: positive ? completeText : 'Synthetic unrelated complete source, turquoise mountains.', offset: 0, next_offset: null, translation_id: id } });
    assert.equal(result.verdict, positive ? 'found' : 'not_found_in_scope');
    assert.ok(result.matches.every(m => m.translation_id !== incomplete));
    assert.equal(result.scope.complete_source_versions_compared, plan.pages.length - 1); assert.equal(result.scope.source_versions_not_compared, 1);
    const omitted = result.scope.not_retrieved[0]; assert.equal(omitted.translation_id, incomplete); assert.equal(omitted.compared, false); assert.equal(omitted.error_code, 'INCOMPLETE_ENGLISH_SOURCE');
    assert.match(result.explanation, /does not establish their wording or absence/);
  }
});

test('inconsistent or unknown pagination cannot describe a complete comparison source', async () => {
  install();
  for (const changed of [{ offset: 1 }, { next_offset: 0 }, { next_offset: -1 }, { next_offset: 30 }, { total_characters: null }, { total_characters: completeText.length + 1 }, { total_characters: 1 }, { total_characters: 0.5 }, { text: undefined }, { text: largeText }]) {
    await assert.rejects(verifyQuote(args, { fetchTranslation: async () => ({ text: completeText, offset: 0, next_offset: null, ...changed }) }), /Incomplete English source/);
  }
  const legacy = await verifyQuote(args, { fetchTranslation: async () => ({ text: completeText }) }); assert.equal(legacy.verdict, 'found');
});

test('a fresh complete source can be compared after an earlier incomplete response', async () => {
  install(); await assert.rejects(verifyQuote(args), /Incomplete English source/); liveCache.clear(); install(completeText);
  const result = await verifyQuote(args); assert.equal(result.verdict, 'found'); assert.equal(result.scope.not_retrieved, undefined);
});


test('a rejected incomplete fallback retains actual version, requested version and provider notes', async () => {
  const query = { text: tailQuote, language: 'english', texts: ['AN 3.65'] }, first = englishScope(query.texts).pages[0].translation_id;
  const actual = 'ati:/synthetic/earlier-version', url = 'https://accesstoinsight.org/tipitaka/synthetic/earlier-version.html', note = 'Synthetic outage: showing an earlier version.';
  const result = await verifyQuote(query, { fetchTranslation: async (_unit, id) => id === first
    ? { text: completeText, translation_id: actual, url, notes: [note], total_characters: null, next_offset: completeText.length }
    : { text: completeText, translation_id: id } });
  const failed = result.scope.not_retrieved.find(s => s.translation_id === actual); assert.ok(failed); assert.equal(failed.requested_translation_id, first); assert.equal(failed.url, url); assert.deepEqual(failed.notes, [note]); assert.equal(failed.compared, false);
  assert.match(failed.scope_notes.join(' '), /Also numbered AN 3.66/); assert.ok(result.matches.every(m => m.translation_id !== actual));
});
