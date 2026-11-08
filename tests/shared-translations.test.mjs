import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { verifyQuote, englishScope } from '../src/verify.mjs';
import { translationCoverage } from '../src/providers.mjs';
import { buildCoverage } from '../scripts/coverage.mjs';
import { buildIndex, toCsv } from '../scripts/export-index.mjs';
import { liveCache } from '../src/cache.mjs';
import { resolveName } from '../src/sutta-names.mjs';
import { translationTitle } from '../src/translation-titles.mjs';
import { dailyText, readingPlan } from '../src/daily.mjs';
import { paritta } from '../src/paritta.mjs';
import { findTalks } from '../src/talks.mjs';
import { syntheticShared, sharedIds } from './helpers/shared-translation.mjs';
import { syntheticHtml, syntheticText, syntheticLink } from './helpers/partial-translation.mjs';
const originalFetch = globalThis.fetch; let saved, savedUrls;
function install(link = syntheticShared()) {
  const d = canon.load(); saved ||= d.translations;
  d.translations = Object.fromEntries(Object.entries(d.translations).map(([id, links]) => [id, links.filter(l => !Object.hasOwn(l, 'shared_scope'))]).filter(([, links]) => links.length));
  for (const id of sharedIds) delete d.translations[id];
  if (link) d.translations[sharedIds[0]] = [link];
  return canon.resolve('iti11').unit;
}
function provider(html = syntheticHtml) { const calls = []; globalThis.fetch = async url => { calls.push(String(url)); return new Response(html); }; return calls; }
afterEach(() => { if (saved) canon.load().translations = saved; if (savedUrls) canon.load().urlIndex = savedUrls; saved = savedUrls = undefined; globalThis.fetch = originalFetch; liveCache.clear(); translationCoverage({ refresh: true }); });

test('one shared declaration reaches exactly the declared members and counts one page separately', () => {
  install(null); const before = translationCoverage({ refresh: true }).total, cliBefore = buildCoverage();
  const unit = install(); const after = translationCoverage({ refresh: true }).total, cli = buildCoverage();
  for (const key of ['links', 'with_english', 'with_english_including_inherited']) assert.equal(after[key], before[key], key);
  assert.equal(after.shared_links, 1); assert.equal(after.with_shared_english, 4); assert.equal(after.shared_only, 4);
  for (const key of ['direct', 'english', 'dhammatalks']) assert.equal(cli[key], cliBefore[key], key);
  assert.equal(cli.shared_texts, 4); assert.equal(cli.shared_links, 1); assert.equal(cli.shared_dhammatalks, 1);
  for (const id of sharedIds) { const meta = canon.describe(canon.resolve(id).unit); assert.equal(meta.english_available, 0); assert.equal(meta.shared_english_available, 1); assert.deepEqual(meta.english[0].translation_scope.text_ids, sharedIds); }
  assert.equal(canon.linksFor(canon.resolve('iti14').unit).links.some(l => l.shared_scope), false);
  assert.equal(english.available(unit)[0].translation_scope.individual_alignment_verified, false);
});

test('shared reads require exact version opt-in and keep source identity through bounded continuation', async () => {
  const unit = install(), calls = provider(), id = canon.translationId(syntheticShared());
  for (const [which, opts] of [[undefined, {}], [id, {}], ['Synthetic fixture translator', { allow_shared: true }], [id, { allow_partial: true }]]) await assert.rejects(english.translation(unit, which, opts), /scoped|shared|partial/i);
  assert.equal(calls.length, 0);
  const first = await english.translation(unit, id, { allow_shared: true, limit: 500 });
  assert.equal(first.text_id, null); assert.equal(first.requested_text_id, 'iti11'); assert.equal(first.citation, 'Synthetic condensed shared page');
  assert.equal(first.whole_unit_coverage, false); assert.deepEqual(first.translation_scope.text_ids, sharedIds);
  assert.equal(first.continue_with.arguments.allow_shared, true); assert.equal(first.continue_with.arguments.allow_partial, undefined);
  const { uid, translation, ...opts } = first.continue_with.arguments;
  const next = await english.translation(canon.resolve(uid).unit, translation, opts); assert.equal(next.text, syntheticText.slice(500, 1000));
  await assert.rejects(english.translation(unit, id, { ...opts, scope_sha256: undefined }), /requires unchanged scope/);
  const changed = syntheticShared(); changed.reference += ' changed'; install(changed);
  await assert.rejects(english.translation(unit, id, opts), /mapping changed/);
});

test('shared verification deduplicates the page and never attributes a match to one member', async () => {
  install(); provider(); const args = { text: 'amber lantern copper window', language: 'english', texts: ['Iti 11', 'Iti 13'] };
  await assert.rejects(verifyQuote(args), /include_shared/); await assert.rejects(verifyQuote({ ...args, texts: undefined, include_shared: true }), /explicit texts/);
  const plan = englishScope(args.texts, { includeShared: true }); assert.equal(plan.pages.length, 1); assert.equal(plan.requested_texts[0].translation_scope.text_id, null);
  assert.deepEqual(plan.pages[0].unverified_requested_text_ids, ['iti11', 'iti13']);
  const result = await verifyQuote({ ...args, include_shared: true }); assert.equal(result.verdict, 'found');
  for (const item of [result.matches[0], result.scope.translations_checked[0]]) { assert.equal(item.citation, 'Synthetic condensed shared page'); assert.deepEqual(item.translation_scope.text_ids, sharedIds); assert.deepEqual(item.unverified_requested_text_ids, ['iti11', 'iti13']); assert.equal(item.whole_unit_coverage, false); }
  assert.equal(result.matches[0].text_id, null); assert.match(result.explanation, /declared multi-discourse source pages only/);
  const negative = await verifyQuote({ ...args, text: 'velvet otters weave purple hammocks', include_shared: true }); assert.equal(negative.verdict, 'not_found_in_scope'); assert.match(negative.explanation, /do not establish any individual/);
  const fetched = await english.translation(canon.resolve('iti11').unit, canon.translationId(syntheticShared()), { allow_shared: true, limit: 2000000 });
  for (const override of [{ text_id: 'iti11' }, { whole_unit_coverage: true }, { translation_scope: undefined }, { text: fetched.text + ' changed' }]) await assert.rejects(verifyQuote({ ...args, include_shared: true }, { fetchTranslation: async () => ({ ...fetched, ...override }) }), /alignment|scope|snapshot/);
});

test('shared sources cannot replace full defaults, become whole-unit aliases or target talks', async () => {
  const unit = install(), link = syntheticShared(), full = { ...link, url: link.url.replace('SHARED', 'FULL') }; delete full.shared_scope;
  canon.load().translations = { ...canon.load().translations, iti11: [full] }; provider();
  const ordinary = await english.translation(unit); assert.equal(ordinary.translation_id, canon.translationId(full)); assert.equal(ordinary.translation_scope, undefined);
  assert.equal((await english.translation(unit, link.translator)).translation_id, canon.translationId(full));
  link.english = 'Synthetic Scoped Excerpt Title'; link.pali_title = 'Zebralanterncapstonesutta'; assert.equal(translationTitle(link), null);
  install(link); assert.equal(resolveName(link.pali_title), null); assert.equal(canon.search(link.english, { collection: 'iti10' }).total_title_matches, 0);
  const talks = await findTalks({ passage: 'iti11' }, { canon, fetchHtml: async () => { throw Error('Unexpected network'); } }); assert.equal(talks.passage.translation_url, null);
});

test('reviewed source/mapping constraints, competing owners and changed snapshots fail closed', async () => {
  const unit = install(); provider(syntheticHtml.replace('amber', 'changed'));
  await assert.rejects(english.translation(unit, canon.translationId(syntheticShared()), { allow_shared: true }), /source text changed/);
  const mutations = [
    l => l.url = 'https://accesstoinsight.org/suttas/SYNTHETIC/SHARED.html', l => l.url += '#pretend-member',
    l => l.shared_scope.status = 'assessment_only', l => l.shared_scope.alignment = 'verified', l => l.shared_scope.presentation = 'complete',
    l => l.shared_scope.text_ids = ['iti10'], l => l.shared_scope.text_ids = ['iti10', 'iti12'], l => l.shared_scope.text_ids.reverse(),
    l => l.shared_scope.text_ids.push('iti13'), l => l.shared_scope.owner_id = 'iti11', l => l.shared_scope.extra = true,
    l => l.shared_scope.source_commit = 'changed', l => l.shared_scope.pali_sha256 = '0'.repeat(64),
    l => l.partial_scope = syntheticLink().partial_scope, l => l.parts = Array(33).fill('/fake.htm'),
  ];
  for (const mutate of mutations) { const link = syntheticShared(); mutate(link); install(link); assert.throws(() => english.available(unit), /Invalid or unreviewed|first member/); }
  const link = syntheticShared(); install(link); canon.load().translations = { ...canon.load().translations, iti11: [{ ...link, shared_scope: undefined }] };
  assert.throws(() => english.available(unit), /Invalid or unreviewed|ambiguous/);
  install(link); canon.load().translations = { ...canon.load().translations, iti14: [{ ...link, shared_scope: link.shared_scope }] };
  assert.throws(() => english.available(unit), /Invalid or unreviewed|ambiguous/);
});

test('shared URL resolution discloses ambiguity and export preserves one page scope separately', () => {
  install(); const d = canon.load(); savedUrls = d.urlIndex; d.urlIndex = new Map(d.urlIndex); d.urlIndex.set('dhammatalks.org/suttas/SYNTHETIC/SHARED', 'iti10');
  assert.throws(() => canon.resolve(syntheticShared().url), /Shared-page URL concerns iti10, iti11, iti12, iti13/);
  const index = buildIndex(), members = index.texts.filter(t => sharedIds.includes(t.id)); assert.equal(members.length, 4);
  for (const t of members) { assert.equal(t.english_count, 0); assert.equal(t.partial_english_count, 0); assert.equal(t.shared_english_count, 1); assert.equal(t.english[0].translation_scope.individual_alignment_verified, false); }
  const csv = toCsv({ texts: [members[0]] }); assert.match(csv, /shared_english_count,shared_english/); assert.match(csv, /shared_page/);
});


test('shared continuation cannot become an ordinary source and outages cannot introduce a fallback', async () => {
  const unit = install(), link = syntheticShared(), id = canon.translationId(link); provider();
  const first = await english.translation(unit, id, { allow_shared: true, limit: 500 });
  const full = { ...link }; delete full.shared_scope; install(null); canon.load().translations = { ...canon.load().translations, iti11: [full] };
  const { uid, translation, ...options } = first.continue_with.arguments;
  await assert.rejects(english.translation(unit, translation, options), /no longer has a declared shared-page scope/);
  install(link); const calls = []; liveCache.clear(); globalThis.fetch = async url => { calls.push(String(url)); return new Response('Synthetic outage', { status: 503 }); };
  const ati = { source: 'ati', path: '/tipitaka/kn/iti/iti.synthetic.than', url: 'https://accesstoinsight.org/tipitaka/kn/iti/iti.synthetic.than.html', translator: 'Thanissaro Bhikkhu' };
  canon.load().translations = { ...canon.load().translations, iti11: [ati] };
  await assert.rejects(english.translation(unit, id, { allow_shared: true }), /Could not retrieve/); assert.ok(calls.every(url => url === link.url));
  liveCache.clear(); provider(syntheticHtml.replace('amber', 'x'.repeat(2000001)));
  await assert.rejects(english.translation(unit, id, { allow_shared: true }), /bounded complete-text check/);
});


test('daily and reading-plan metadata retain scope while daily selection still requires a whole-unit source', () => {
  install(null); const d = canon.load(), base = d.translations;
  const dailyShared = syntheticShared(['mn9', 'mn10']); d.translations = { ...base, mn9: [dailyShared] };
  const selected = ['mn9', 'mn10'].map(id => canon.resolve(id).unit);
  const fixtureCanon = { ...canon, load: () => ({ ...d, canon: { ...d.canon, units: selected } }) };
  const daily = dailyText(fixtureCanon, { kind: 'sutta', date: '2026-11-07' });
  assert.equal(daily.text.id, 'mn10'); const scoped = daily.english.find(e => e.translation_scope); assert.ok(scoped); assert.equal(scoped.whole_unit_coverage, false); assert.deepEqual(scoped.translation_scope.text_ids, ['mn9', 'mn10']);
  const planShared = syntheticShared(['mn1', 'mn2']); d.translations = { ...base, mn1: [planShared] };
  const day = readingPlan(canon, { name: 'mn-year', day: 1 });
  assert.equal(day.readings[0].english.find(e => e.translation_scope).translation_scope.individual_alignment_verified, false);
});

test('paritta link metadata does not strip scope from a shared source', () => {
  install(null); const d = canon.load(), link = syntheticShared(['dn31', 'dn32']); d.translations = { ...d.translations, dn31: [link] };
  const selected = paritta(canon, { name: 'atanatiya', limit: 1 });
  const scoped = selected.english.find(e => e.translation_scope); assert.ok(scoped); assert.equal(scoped.whole_unit_coverage, false); assert.deepEqual(scoped.translation_scope.text_ids, ['dn31', 'dn32']);
});

test('shared-page ties count source versions rather than independently aligned canonical texts', async () => {
  install(); const full = { ...syntheticShared(), url: syntheticShared().url.replace('SHARED', 'FULL') }; delete full.shared_scope;
  canon.load().translations = { ...canon.load().translations, iti14: [full] }; provider();
  const result = await verifyQuote({ text: 'amber lantern copper window', language: 'english', texts: ['iti11', 'iti14'], include_shared: true });
  assert.equal(result.equally_similar_texts, undefined);
  assert.equal(result.equally_similar_sources, 2);
  assert.match(result.citation_note, /source versions.*not.*individually aligned canonical texts/);
});
