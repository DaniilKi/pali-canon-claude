import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { verifyQuote, englishScope } from '../src/verify.mjs';
import { SCRIPTS, transliterate } from '../src/script.mjs';
import { syntheticLink } from './helpers/partial-translation.mjs';
import { syntheticShared } from './helpers/shared-translation.mjs';
import { liveCache } from '../src/cache.mjs';
import { earlierQuote, currentQuote, earlierVersion, currentVersion, versionHtml } from './helpers/translation-versions.mjs';
const originalFetch = globalThis.fetch; let saved;
const uid = 'patthana1.1', currentId = canon.translationId(currentVersion), earlierId = canon.translationId(earlierVersion);
function install({ outage = false, mirror = false } = {}) {
  const d = canon.load(); saved ||= d.translations; d.translations = { ...d.translations, [uid]: [currentVersion, earlierVersion] };
  const calls = []; globalThis.fetch = async value => {
    const url = new URL(value); calls.push(url.href);
    if (url.href === currentVersion.url) return new Response(outage ? 'Synthetic outage' : versionHtml(currentQuote), { status: outage ? 503 : 200 });
    if (url.hostname === 'accesstoinsight.org' && url.pathname === earlierVersion.path + '.html') return new Response(mirror ? 'Synthetic primary outage' : versionHtml(earlierQuote), { status: mirror ? 503 : 200 });
    if (mirror && url.hostname === 'raw.githubusercontent.com' && url.pathname === '/bcbsit/ati/main' + earlierVersion.path + '.html') return new Response(versionHtml(earlierQuote));
    throw Error('UNEXPECTED_NETWORK_ATTEMPT');
  }; return calls;
}
afterEach(() => { if (saved) canon.load().translations = saved; saved = undefined; globalThis.fetch = originalFetch; liveCache.clear(); });

test('a linked earlier version can be verified explicitly while the current version is reachable', async () => {
  install(); const args = { text: earlierQuote, language: 'english', texts: [uid] };
  const preferred = await verifyQuote(args); assert.equal(preferred.verdict, 'not_found_in_scope');
  const available = await english.translation(canon.resolve(uid).unit, earlierId); assert.ok(available.text.includes(earlierQuote));
  const selected = await verifyQuote({ ...args, translation_ids: [earlierId] });
  assert.equal(selected.verdict, 'found'); assert.equal(selected.matches[0].translation_id, earlierId);
  assert.ok(selected.scope.translations_checked.every(p => p.translation_id === earlierId));
});


test('exact selection checks multiple versions of one translator and normalizes only surrounding whitespace/duplicates', async () => {
  install(); const result = await verifyQuote({ text: earlierQuote, language: 'english', texts: [uid], translation_ids: [' ' + earlierId + ' ', currentId, earlierId] });
  assert.deepEqual(result.scope.translation_selection, { mode: 'exact_ids', translation_ids: [earlierId, currentId], fallback_allowed: false });
  assert.deepEqual(new Set(result.scope.translations_checked.map(p => p.translation_id)), new Set([currentId, earlierId]));
  assert.equal(result.scope.complete_source_versions_compared, 2); assert.equal(result.matches[0].translation_id, earlierId);
  assert.equal(result.matches[0].license, 'Synthetic fixture terms only'); assert.equal(result.matches[0].attribution, 'Synthetic fixture publisher');
});

test('invalid, unknown, wrong-text and incomplete selections fail before fetching', async () => {
  const calls = install(), args = { text: earlierQuote, language: 'english', texts: [uid] };
  for (const ids of [[], null, earlierId, [''], [' '], ['Thanissaro'], [earlierVersion.url], ['dt:MN/MN10'], [earlierId, 'ati:/unknown'], Array(81).fill(earlierId), [earlierId.toUpperCase()]]) await assert.rejects(verifyQuote({ ...args, translation_ids: ids }), /translation_ids|not linked/);
  for (const texts of [undefined, []]) await assert.rejects(verifyQuote({ ...args, texts, translation_ids: [earlierId] }), /explicit texts/);
  await assert.rejects(verifyQuote({ ...args, texts: [uid, 'MN 10'], translation_ids: [earlierId] }), /every requested text/);
  await assert.rejects(verifyQuote({ text: 'sabbe sankhara anicca', language: 'pali', translation_ids: [earlierId] }), /English quotation/);
  assert.equal(calls.length, 0);
});

test('unavailable exact versions are not replaced while the preferred default retains labelled outage fallback', async () => {
  const calls = install({ outage: true }); const args = { text: earlierQuote, language: 'english', texts: [uid] };
  await assert.rejects(verifyQuote({ ...args, translation_ids: [currentId] }), /could be retrieved/); assert.ok(calls.length); assert.ok(calls.every(url => url === currentVersion.url));
  calls.length = 0; liveCache.clear(); const preferred = await verifyQuote(args);
  assert.equal(preferred.verdict, 'found'); assert.equal(preferred.matches[0].translation_id, earlierId); assert.equal(preferred.matches[0].requested_translation_id, currentId); assert.match(preferred.matches[0].notes.join(' '), /earlier version/);
  calls.length = 0; liveCache.clear(); const both = await verifyQuote({ ...args, translation_ids: [currentId, earlierId] });
  assert.equal(both.verdict, 'found'); assert.equal(both.scope.complete_source_versions_compared, 1); assert.equal(both.scope.source_versions_not_compared, 1); assert.equal(both.scope.not_retrieved[0].translation_id, currentId);
});

test('the verifier independently refuses a substituted or unidentified exact version', async () => {
  install(); const options = []; const args = { text: earlierQuote, language: 'english', texts: [uid] };
  const result = await verifyQuote({ ...args, translation_ids: [currentId, earlierId] }, { fetchTranslation: async (_u, id, opts) => { options.push(opts); return { text: earlierQuote, translation_id: earlierId, url: earlierVersion.url, notes: id === currentId ? ['Synthetic disallowed substitution'] : [] }; } });
  assert.ok(options.every(o => o.allow_fallback === false)); assert.equal(result.scope.translations_checked.length, 1);
  const refused = result.scope.not_retrieved[0]; assert.equal(refused.translation_id, earlierId); assert.equal(refused.requested_translation_id, currentId); assert.equal(refused.error_code, 'UNEXPECTED_TRANSLATION_VERSION'); assert.equal(refused.compared, false); assert.deepEqual(refused.notes, ['Synthetic disallowed substitution']);
  await assert.rejects(verifyQuote({ ...args, translation_ids: [currentId] }, { fetchTranslation: async () => ({ text: earlierQuote }) }), /exact translation version was not returned/);
});

test('same-version ATI mirrors remain usable for an exact selection', async () => {
  const calls = install({ mirror: true }); const result = await verifyQuote({ text: earlierQuote, language: 'english', texts: [uid], translation_ids: [earlierId] });
  assert.equal(result.verdict, 'found'); assert.equal(result.matches[0].translation_id, earlierId); assert.equal(result.matches[0].requested_translation_id, undefined); assert.match(result.matches[0].notes.join(' '), /BCBS official repository/);
  assert.ok(calls.some(url => url.startsWith('https://raw.githubusercontent.com/bcbsit/ati/main/'))); assert.ok(!calls.includes(currentVersion.url));
});

test('inherited source identity and native reference context survive exact-version selection', async () => {
  const id = canon.translationId(canon.linksFor(canon.resolve('Dhp 183').unit).links.find(l => l.source === 'dhammatalks'));
  for (const script of SCRIPTS) {
    let calls = 0; const refs = ['Dhp 183', 'Dhp 184'].map(ref => transliterate(ref, 'roman', script));
    const result = await verifyQuote({ text: earlierQuote, language: 'english', texts: refs, translation_ids: [id] }, { fetchTranslation: async (_u, actual) => { calls++; return { text: earlierQuote, translation_id: actual }; } });
    assert.equal(calls, 1); assert.equal(result.matches[0].text_id, 'dhp179-196'); assert.deepEqual(result.matches[0].unverified_requested_text_ids, ['dhp183', 'dhp184']);
    assert.deepEqual(result.scope.requested_texts[0].requested_translation_ids, [id]); assert.equal(result.scope.requested_texts[0].input_script, script === 'roman' ? undefined : script);
  }
});

test('exact IDs do not grant partial/shared consent or borrow an unselected containing source', () => {
  install(); const d = canon.load(), partial = syntheticLink(); d.translations = { ...d.translations, [uid]: [...d.translations[uid], partial] };
  const partialId = canon.translationId(partial); assert.throws(() => englishScope([uid], { translationIds: [partialId] }), /include_partial/);
  const selected = englishScope([uid], { translationIds: [partialId], includePartial: true }); assert.equal(selected.pages.length, 1); assert.equal(selected.pages[0].translation_scope.kind, 'partial_unit');
  const shared = syntheticShared(['dhp1', 'dhp2']); d.translations = { ...d.translations, dhp1: [shared] }; const sharedId = canon.translationId(shared);
  assert.throws(() => englishScope(['Dhp 2'], { translationIds: [sharedId] }), /include_shared/);
  const group = englishScope(['Dhp 2'], { translationIds: [sharedId], includeShared: true }); assert.equal(group.pages.length, 1); assert.equal(group.requested_texts[0].translation_scope.text_id, null); assert.doesNotMatch(group.requested_texts[0].notes.join(' '), /uses its linked containing source/);
});

test('two selected versions of one translator cannot supply the two halves of a quotation', async () => {
  install(); const words = earlierQuote.split(' ');
  globalThis.fetch = async value => new Response(versionHtml(new URL(value).hostname.includes('dhammatalks') ? words.slice(0, 4).join(' ') : words.slice(4).join(' ')));
  const result = await verifyQuote({ text: earlierQuote, language: 'english', texts: [uid], translation_ids: [currentId, earlierId] });
  assert.notEqual(result.verdict, 'found'); assert.equal(result.scope.translations_checked.length, 2);
  assert.ok(result.matches.every(m => !words.every(w => m.matched_words.split(' ').includes(w))));
});
