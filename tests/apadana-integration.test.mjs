import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { fetchPublic, ALLOWED_HOSTS } from '../src/http.mjs';
import { englishScope, verifyQuote } from '../src/verify.mjs';
import { APADANA_COMMIT, APADANA_LICENSE, APADANA_PROFILES, APADANA_TRANSLATOR } from '../src/apadana-profiles.mjs';
import { scopeDescriptor, validateEnglishPage } from '../web/translation-policy.mjs';
import { comparisonChoices } from '../web/translation-comparison.mjs';

const fetchOriginal = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchOriginal; });
const uid = 'thi-ap1', id = 'ap:chapter-4/poem-001', profile = APADANA_PROFILES[uid];
const unit = () => canon.resolve(uid).unit;
const choice = () => canon.describe(unit()).english[0];

test('per-poem edition disclosures identify the independently reviewed VRI differences', () => {
  const required = {
    'thi-ap1': [['verse 2', 'thi-ap1/7', 'note 6']],
    'thi-ap8': [['verse 83', 'thi-ap8/14', 'dubbaṇṇiyaṃ']],
    'thi-ap9': [['verse 101', 'thi-ap9/12', 'parammukhā nisīditvā'], ['verse 102', 'thi-ap9/13', 'note 11']],
  };
  for (const [owner, differences] of Object.entries(required)) {
    for (const terms of differences) assert.ok(APADANA_PROFILES[owner].mapping_notes.some(note => terms.every(term => note.includes(term))), owner + ': missing edition-specific disclosure');
  }
});

test('forty individually reviewed whole Apadāna mappings and exact publisher URLs', () => {
  const expected = Array.from({length:40},(_,i)=>i+1);
  const actual = Object.entries(canon.load().translations)
    .filter(([, links]) => links.some(l => l.source === 'apadana')).map(([key]) => key);
  assert.deepEqual(actual, expected.map(n => 'thi-ap' + n));
  for (const n of expected) {
    const owner = 'thi-ap' + n, url = APADANA_PROFILES[owner].url;
    assert.equal(canon.resolve(url).unit.id, owner);
    assert.equal(canon.describe(canon.resolve(owner).unit).english[0].translation_revision, APADANA_COMMIT);
  }
  for (const invalid of [profile.url.slice(0, -1), profile.url + '?v=1', profile.url + '#v1']) assert.throws(() => canon.resolve(invalid), /exact reviewed/);
  assert.equal(choice().license, APADANA_LICENSE);
  assert.equal(choice().translator, APADANA_TRANSLATOR);
  assert.equal(choice().translation_id, id);
  assert.equal(Object.hasOwn(choice(), 'translation_scope'), false);
  assert.ok(!ALLOWED_HOSTS.includes('apadanatranslation.com'));
});

test('Apadāna refuses unreviewed URLs, redirects, changed bytes and unpinned continuations', async () => {
  const request = [];
  globalThis.fetch = async (url) => { request.push(url.href); return new Response(null, {status: 302, headers: {location: 'https://www.dhammatalks.org/suttas/MN/MN10.html'}}); };
  for (const url of [profile.url, profile.raw_url.replace(APADANA_COMMIT, 'main'), profile.raw_url.replace('001', '041'), profile.raw_url + '?v=1']) {
    await assert.rejects(fetchPublic(url, { json: false }), /outside the supported/);
  }
  assert.deepEqual(request, []);
  await assert.rejects(english.translation(unit(), id), /must not redirect/);
  assert.deepEqual(request, [profile.raw_url]);
  await assert.rejects(english.translation(unit(), id, { offset: 1 }), /unchanged translation_revision/);
  await assert.rejects(english.translation(unit(), id, { translation_revision: '1'.repeat(40) }), /revision changed/);
  assert.deepEqual(request, [profile.raw_url]);
  globalThis.fetch = async (url) => { request.push(url.href); return new Response('Different content.'); };
  await assert.rejects(english.translation(unit(), id), /differs from the reviewed/);
  assert.deepEqual(request, [profile.raw_url, profile.raw_url]);
  request.length = 0;
  globalThis.fetch = async url => { request.push(url.href); return new Response(null, {status:302,headers:{location:profile.raw_url}}); };
  await assert.rejects(fetchPublic('https://accesstoinsight.org/tipitaka/mn/mn.010.than.html', {json:false}), /Redirect entry/);
  assert.deepEqual(request, ['https://accesstoinsight.org/tipitaka/mn/mn.010.than.html']);
});

test('browser and comparison reject phantom owners, revised metadata, changed paths and substituted providers', () => {
  const selected = choice();
  const context = { uid, choices: [selected], accepted: null };
  const args = { uid, translation: id, limit: 6000, translation_revision: APADANA_COMMIT };
  const pins = Object.fromEntries(['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'].map(key => [key, profile[key]]));
  const response = { ...selected, ...pins, text_id: uid, source: 'apadana', offset: 0, limit: 6000, text: 'Synthetic text, not the real source.', attribution: 'Jonathan S. Walters and Whitman College',
    changes: 'Synthetic extraction notice', fetched_url: profile.raw_url, license_url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/', publisher_paratext: 'Synthetic preface',
    translator_notes: Array.from({length: profile.note_count}, (_, i) => ({number: i + 1, text:'Synthetic note.'})), next_offset: null };
  assert.equal(scopeDescriptor(selected, uid), null);
  assert.deepEqual(comparisonChoices([selected], uid), [selected]);
  assert.equal(validateEnglishPage(response, args, context), null);
  assert.throws(() => scopeDescriptor(selected, 'thi-ap2'), /identity or terms changed/);
  assert.throws(() => scopeDescriptor({ ...selected, translation_scope: null }, uid), /identity or terms changed/);
  for (const patched of [
    { translation_revision: 'f'.repeat(40) }, { publisher_paratext: '' }, { translator_notes: [] },
    { license: 'CC BY 4.0' }, { notes_sha256: '0'.repeat(64) }, { fetched_url: profile.url }, { url: profile.url + '?changed' }, { source: 'dhammatalks.org' },
  ]) assert.throws(() => validateEnglishPage({ ...response, ...patched }, args, context), /pinned Apadāna/i);
  const substitute = { ...response, translation_id: 'dt:MN/MN10', source: 'dhammatalks.org' };
  delete substitute.translation_revision; delete substitute.publisher_paratext;
  assert.throws(() => validateEnglishPage(substitute, args, { ...context, choices: [selected, substitute] }), /pinned Apadāna/i);
});

test('quotation verification annotates exact publisher revision and rejects a revision mismatch', async () => {
  const options = { text: 'remarkably luminous extraordinary words', language: 'english', texts: [uid], translation_ids: [id] };
  assert.equal(englishScope([uid], { translationIds: [id] }).pages[0].translation_revision, APADANA_COMMIT);
  const response = { translation_id: id, translation_revision: APADANA_COMMIT, translator: APADANA_TRANSLATOR, url: profile.url, offset: 0, next_offset: null,
    text: 'remarkably luminous extraordinary words\n\nnot part of the poem heading\n\nquiet swift birds flying high (1) [1]\n\nremarkably luminous extraordinary words\n', attribution: 'Synthetic attribution', license: APADANA_LICENSE };
  const verify = async (text, fetchTranslation) => verifyQuote({ ...options, text }, { fetchTranslation });
  const scoped = await verify(options.text, async (_unit, version, request) => {
    assert.equal(version, id); assert.equal(request.translation_revision, APADANA_COMMIT); assert.equal(request.allow_fallback, false);
    return response;
  });
  assert.equal(scoped.scope.translations_checked[0].translation_revision, APADANA_COMMIT);
  assert.deepEqual(scoped.matches, []);
  await assert.rejects(verify(options.text, async () => ({...response, translation_revision: 'f'.repeat(40)})), /identity changed/);
});

const official = process.env.APADANA_OFFICIAL_CHECKOUT;
test('optional pinned publisher bytes reach reading, continuation and quotation paths', { skip: !official }, async () => {
  globalThis.fetch = async url => {
    assert.equal(url.href, profile.raw_url);
    return new Response(readFileSync(join(official, 'src/_poems/chapter-4/poem-001.md')));
  };
  const first = await english.translation(unit(), id, { limit: 500, translation_revision: APADANA_COMMIT });
  const next = await english.translation(unit(), id, first.continue_with.arguments);
  const whole = await english.translation(unit(), id);
  assert.equal(first.text + next.text, whole.text.slice(0, 1000));
  assert.equal(whole.translator_notes.length, 22);
  assert.ok(whole.publisher_paratext);
  const verified = await verifyQuote({text: whole.text.split('\n\n')[1].split('\n')[0], language: 'english', texts: [uid], translation_ids: [id]});
  assert.ok(verified.matches.length);
  globalThis.fetch = async url => {
    const selected = Object.values(APADANA_PROFILES).find(p => p.raw_url === url.href);
    assert.ok(selected, 'No unreviewed source fetch');
    return new Response(readFileSync(join(official, 'src/_poems/chapter-4/poem-' + String(selected.poem).padStart(3, '0') + '.md')));
  };
  for (const [owner, selected] of Object.entries(APADANA_PROFILES)) {
    const result = await english.translation(canon.resolve(owner).unit, canon.translationId(selected));
    assert.deepEqual(result.mapping_notes, selected.mapping_notes);
    for (const note of selected.mapping_notes) {
      assert.ok(result.notes.includes(note), owner + ': missing visible edition caveat');
      assert.ok(!result.text.includes(note), owner + ': editorial caveat entered poem wording');
    }
  }
});
