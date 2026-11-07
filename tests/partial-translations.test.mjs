import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { translationCoverage } from '../src/providers.mjs';
import { verifyQuote, englishScope } from '../src/verify.mjs';
import { liveCache } from '../src/cache.mjs';
import { translationTitle } from '../src/translation-titles.mjs';
import { findTalks } from '../src/talks.mjs';
import { scopeHash } from '../src/translation-scope.mjs';
import { syntheticLink, syntheticHtml, syntheticText } from './helpers/partial-translation.mjs';
const originalFetch = globalThis.fetch;
let saved;
function install(id = 'patthana1.1', links = [syntheticLink(id)]) {
  const d = canon.load(); saved ||= d.translations;
  d.translations = { ...d.translations, [id]: links }; return canon.resolve(id).unit;
}
function provider(html = syntheticHtml) {
  const calls = []; globalThis.fetch = async url => { calls.push(String(url)); return new Response(html, { status: 200 }); }; return calls;
}
afterEach(() => {
  if (saved) canon.load().translations = saved;
  saved = undefined; globalThis.fetch = originalFetch; liveCache.clear(); translationCoverage({ refresh: true });
});

test('partial retrieval is explicit, pinned, bounded to its declared source and recoverable', async () => {
  const unit = install(), calls = provider();
  const meta = canon.describe(unit), id = meta.english[0].translation_id;
  assert.equal(meta.english_available, 0); assert.equal(meta.partial_english_available, 1);
  assert.equal(meta.english[0].translation_scope.whole_unit_coverage, false);
  for (const [which, options] of [[undefined, {}], [id, {}], ['Synthetic fixture translator', { allow_partial: true }]]) {
    await assert.rejects(english.translation(unit, which, options), /partial/i);
  }
  assert.equal(calls.length, 0);
  const first = await english.translation(unit, id, { allow_partial: true, limit: 500 });
  assert.equal(first.text, syntheticText.slice(0, 500)); assert.equal(first.whole_unit_coverage, false);
  assert.deepEqual(first.translation_scope.read_with, { tool: 'get_text', uid: unit.id, offset: 5, limit: 4 });
  const args = first.continue_with.arguments;
  const { uid, translation, ...options } = args;
  const next = await english.translation(unit, translation, options);
  assert.equal(uid, unit.id); assert.equal(next.text, syntheticText.slice(500, 1000));
  assert.deepEqual(next.translation_scope, first.translation_scope);
  await assert.rejects(english.translation(unit, id, { ...options, scope_sha256: undefined }), /requires unchanged scope/);
  await assert.rejects(english.translation(unit, id, { ...options, prefix_sha256: undefined }), /requires unchanged scope/);
  canon.load().translations[unit.id][0].partial_scope = syntheticLink(unit.id, 5, 9).partial_scope;
  await assert.rejects(english.translation(unit, id, options), /mapping changed/);
});

test('changed reviewed source text, unreviewed mappings and whole-body declarations fail closed', async () => {
  const unit = install(), calls = provider(syntheticHtml.replace('amber', 'changed'));
  const id = canon.translationId(canon.load().translations[unit.id][0]);
  await assert.rejects(english.translation(unit, id, { allow_partial: true }), /source text changed/);
  for (const mutate of [
    l => { l.partial_scope.status = 'assessment_only'; },
    l => { l.partial_scope.ranges = ['unsupported']; },
    l => { l.partial_scope.version = 2; },
    l => { l.partial_scope = null; },
    l => { l.partial_scope.unit_id = 'patthana1.2'; },
    l => { l.partial_scope.pali_sha256 = '0'.repeat(64); },
    l => { l.partial_scope.source_commit = 'changed'; },
    l => { l.parts = Array(33).fill('/synthetic.htm'); },
  ]) { const link = syntheticLink(); mutate(link); install(unit.id, [link]); assert.throws(() => english.available(unit), /Invalid or unreviewed/); }
  const all = syntheticLink(unit.id, 0, canon.segments(unit).length - 1); install(unit.id, [all]);
  assert.throws(() => english.available(unit), /Invalid or unreviewed/);
  assert.equal(calls.length, 1);
});

test('partial links do not count as whole-unit coverage or inherit into grouped members', () => {
  const before = translationCoverage({ refresh: true }).total;
  install(); const after = translationCoverage({ refresh: true }).total;
  for (const key of ['links', 'with_english', 'with_english_including_inherited', 'percent_with_english']) assert.equal(after[key], before[key], key);
  assert.equal(after.partial_links, before.partial_links + 1); assert.equal(after.partial_only, before.partial_only + 1);
  install('dhp1-20', [syntheticLink('dhp1-20', 1, 2)]);
  assert.equal(canon.linksFor(canon.resolve('dhp1').unit).links.length, 0);
});

test('whole-unit defaults cannot select or fall back into partial mappings', async () => {
  const unit = install(); const partial = canon.load().translations[unit.id][0];
  const full = { ...partial, url: partial.url.replace('PARTIAL', 'FULL') }; delete full.partial_scope;
  install(unit.id, [partial, full]); provider();
  const result = await english.translation(unit);
  assert.equal(result.translation_id, 'dt:SYNTHETIC/FULL'); assert.equal(result.translation_scope, undefined);
  assert.equal((await english.translation(unit, 'Synthetic fixture translator')).translation_id, 'dt:SYNTHETIC/FULL');
  install(unit.id, [partial, { source: 'ati', path: '/tipitaka/synthetic', url: 'https://accesstoinsight.org/tipitaka/synthetic.html', translator: 'Thanissaro', match: 'synthetic' }]);
  const urls = []; globalThis.fetch = async url => { urls.push(String(url)); throw Error('synthetic outage'); }; liveCache.clear();
  await assert.rejects(english.translation(unit, canon.translationId(partial), { allow_partial: true }), /Could not retrieve/);
  assert.ok(urls.every(url => url.includes('/SYNTHETIC/PARTIAL.html')));
});

test('English verification excludes partials by default and preserves their scope after explicit opt-in', async () => {
  const unit = install(); provider();
  assert.equal(englishScope([unit.id]).pages.length, 0);
  await assert.rejects(verifyQuote({ text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [unit.id] }), /Only partial/);
  await assert.rejects(verifyQuote({ text: 'Synthetic fixture only amber lantern copper window', language: 'english', include_partial: true }), /requires explicit texts/);
  const result = await verifyQuote({ text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [unit.id], include_partial: true });
  assert.equal(result.verdict, 'found'); assert.equal(result.matches[0].whole_unit_coverage, false);
  assert.equal(result.matches[0].translation_scope.first_ref, 'patthana1.1/6');
  assert.match(result.explanation, /partial translation/i);
  assert.equal(result.scope.translations_checked[0].translation_scope.last_ref, 'patthana1.1/9');
  await assert.rejects(verifyQuote({ text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [unit.id], include_partial: true },
    { fetchTranslation: async () => ({ text: syntheticText, translation_id: 'synthetic', url: 'synthetic' }) }), /scope differs/);
});


test('large declared root spans emit complete bounded reading pages instead of an invalid oversized call', () => {
  const unit = install('patthana1.2', [syntheticLink('patthana1.2', 5, 250)]);
  const scope = english.available(unit)[0].translation_scope;
  assert.equal(scope.pali_segments, 246);
  assert.deepEqual(scope.read_pages.map(p => [p.offset, p.limit]), [[5, 200], [205, 46]]);
  assert.equal(scope.read_pages.reduce((n, p) => n + p.limit, 0), 246);
});

test('negative partial verification never rules out the unsearched remainder', async () => {
  const unit = install(); provider();
  const result = await verifyQuote({ text: 'Purple zeppelin reaches distant synthetic harbor', language: 'english', texts: [unit.id], include_partial: true });
  assert.equal(result.verdict, 'not_found_in_scope');
  assert.match(result.explanation, /Partial translation.*negative result/);
  assert.equal(result.scope.translations_checked[0].whole_unit_coverage, false);
});

test('a partial source URL resolves its containing unit with an explicit scope caution', () => {
  const unit = install(), link = canon.load().translations[unit.id][0];
  const key = link.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\.html$/, '');
  canon.load().urlIndex.set(key, unit.id);
  try {
    const result = canon.resolve(link.url);
    assert.equal(result.unit.id, unit.id);
    assert.match(result.notes.join(' '), /partial translation source covering patthana1.1\/6 through patthana1.1\/9/);
  } finally { canon.load().urlIndex.delete(key); }
});


test('verification checks the complete partial source snapshot and actual version independently', async () => {
  const unit = install(), link = canon.load().translations[unit.id][0];
  const id = canon.translationId(link), scope = english.available(unit)[0].translation_scope;
  const args = { text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [unit.id], include_partial: true };
  for (const overrides of [
    { text: 'Unreviewed synthetic replacement' },
    { translation_id: 'ati:other-version' },
    { url: 'https://www.dhammatalks.org/suttas/SYNTHETIC/OTHER.html' },
    { next_offset: 20 },
    { translation_scope: { ...scope, first_ref: 'patthana1.1/10' } },
  ]) {
    await assert.rejects(verifyQuote(args, { fetchTranslation: async () => ({ text: syntheticText, translation_id: id, url: link.url, translation_scope: scope, ...overrides }) }), /scope|snapshot|version/);
  }
});


test('partial continuations cannot become whole-unit reads when the declaration is removed', async () => {
  const unit = install(); provider();
  const id = canon.translationId(canon.load().translations[unit.id][0]);
  const first = await english.translation(unit, id, { allow_partial: true, limit: 500 });
  delete canon.load().translations[unit.id][0].partial_scope;
  const { uid, translation, scope_sha256, ...args } = first.continue_with.arguments;
  await assert.rejects(english.translation(unit, translation, args), /no longer has a declared partial scope/);
});

test('an oversized partial source is rejected rather than hashing or comparing a truncated prefix', async () => {
  const unit = install(); provider('<div id="sutta">' + 'x'.repeat(2000001) + '</div>');
  const id = canon.translationId(canon.load().translations[unit.id][0]);
  await assert.rejects(english.translation(unit, id, { allow_partial: true }), /exceeds the bounded complete-text check/);
});


test('duplicate partial version declarations or cross-unit reuse cannot silently select a range', async () => {
  const link = syntheticLink(), unit = install('patthana1.1', [link, syntheticLink('patthana1.1', 5, 9)]);
  const calls = provider();
  await assert.rejects(english.translation(unit, canon.translationId(link), { allow_partial: true }), /ambiguous declarations/);
  install(unit.id, [link]);
  const other = syntheticLink('patthana1.2'); other.url = link.url;
  install('patthana1.2', [other]);
  assert.throws(() => english.available(unit), /ambiguous declarations/);
  assert.equal(calls.length, 0);
});


test('partial publication titles do not identify whole units or target whole-passage talks', async () => {
  const link = syntheticLink();
  link.english = 'Synthetic Scoped Excerpt Title';
  link.reference = 'MN 10 Synthetic Scoped Excerpt Title';
  const unit = install('patthana1.1', [link]);
  assert.equal(translationTitle(link), null);
  assert.equal(translationTitle({ ...link, english: undefined }), null);
  const result = canon.search('Synthetic Scoped Excerpt Title', { collection: unit.id });
  assert.equal(result.title_matches.length, 0);
  const calls = [];
  const talks = await findTalks({ passage: unit.id }, { canon, fetchHtml: async url => { calls.push(url); return ''; } });
  assert.equal(talks.passage.translation_url, null);
  assert.equal(talks.passage.translation_title, null);
  assert.equal(calls.length, 0);
});
