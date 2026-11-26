import {CURRENT_APADANA_IDS, CURRENT_THERA_IDS, historicalApadanaIds} from './helpers/apadana-intake-expectations.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { APADANA_PROFILES, THERI_APADANA_PROFILES, APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, isApadanaRawUrl } from '../src/apadana-profiles.mjs';
import { THERA_APADANA_PROFILES } from '../src/apadana-thera-profiles.mjs';
import { parseApadana, quotationText, digest, rootDigest, validateLink } from '../src/apadana.mjs';
import { parseTheraApadana } from '../src/apadana-thera.mjs';
import { fetchPublic } from '../src/http.mjs';
import { verifyQuote } from '../src/verify.mjs';
import { readPassage, WIDGET_URI } from '../src/chatgpt-widget.mjs';

const gold = JSON.parse(readFileSync('docs/evidence/apadana/THERA_GOLDENS.json', 'utf8'));
const review = JSON.parse(readFileSync('docs/evidence/apadana/THERA_SOURCE_REVIEW.json', 'utf8'));
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const clone = value => structuredClone(value);
const pins = ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'];
const source = p => readFileSync(join(checkout, 'src/_poems', p.path.replace(/^\/text\//, '').replace(/\/$/, '.md')), 'utf8');
const parse = p => parseApadana(source(p), p);
const tid = p => canon.translationId(p);
const thera = uid => THERA_APADANA_PROFILES[uid];
const stanzaWords = (value, p) => quotationText({ ...value, translation_id: tid(p) });
function deeplyFrozen(value) {
  if (value && typeof value === 'object') { assert.ok(Object.isFrozen(value)); for (const child of Object.values(value)) deeplyFrozen(child); }
}
function onlyPinnedFetch(calls) {
  globalThis.fetch = async url => {
    const p = Object.values(APADANA_PROFILES).find(p => p.raw_url === url.href);
    assert.ok(p, 'Only a literal approved source artifact may be fetched');
    calls.push(p.id); return new Response(source(p));
  };
}
function assertApparatus(value, p, content) {
  for (const key of ['chapter_summary', 'publisher_divisions']) {
    assert.equal(Object.hasOwn(value, key), Object.hasOwn(p, key), `${p.id} ${key} ownership`);
    if (!p[key]) continue;
    const descriptors = key === 'publisher_divisions' ? p[key] : [p[key]];
    const actual = key === 'publisher_divisions' ? value[key] : [value[key]];
    assert.equal(actual.length, descriptors.length);
    actual.forEach((scope, i) => {
      const { text, translator_notes, ...descriptor } = scope;
      assert.deepEqual(descriptor, descriptors[i]);
      if (content) { assert.ok(text.trim()); assert.deepEqual(translator_notes, []); }
      else { assert.equal(Object.hasOwn(scope, 'text'), false); assert.equal(Object.hasOwn(scope, 'translator_notes'), false); }
    });
  }
  assert.equal(Object.hasOwn(value, 'publisher_preface'), false);
  assert.equal(Object.hasOwn(value, 'collection_summary'), false);
}

// Aggregate hashes were computed from the clean a29607d old40 snapshot;
// these pins do not derive canonical identities from publisher numbering.
test('current registry preserves frozen old forty and the original twenty reviewed Therā identities', () => {
  deeplyFrozen(APADANA_PROFILES); deeplyFrozen(THERI_APADANA_PROFILES); deeplyFrozen(THERA_APADANA_PROFILES);
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  assert.equal(Object.keys(THERI_APADANA_PROFILES).length, 40);
  assert.deepEqual(Object.keys(THERA_APADANA_PROFILES), CURRENT_THERA_IDS);
  const laterApproved = ['tha-ap33','tha-ap34','tha-ap35','tha-ap36','tha-ap37','tha-ap38','tha-ap39','tha-ap40','tha-ap41','tha-ap42','tha-ap43','tha-ap45','tha-ap46','tha-ap47','tha-ap48','tha-ap49','tha-ap50','tha-ap51','tha-ap52','tha-ap53','tha-ap54','tha-ap55','tha-ap56','tha-ap57','tha-ap58','tha-ap59','tha-ap60','tha-ap61','tha-ap62'];
  assert.deepEqual(historicalApadanaIds(60).filter(id => id.startsWith('tha-')).sort(), [...gold.poems.map(g => g.id), ...laterApproved].sort());
  assert.deepEqual(historicalApadanaIds(60).sort(), [...Object.keys(THERI_APADANA_PROFILES), ...gold.poems.map(g => g.id), ...laterApproved].sort());
  assert.equal(digest(JSON.stringify(THERI_APADANA_PROFILES)), '65845a2e7f348b2a6616c06be156885ee3078ce5c588b7cd0575702f5b2d2910');
  const d = canon.load(), pali = {};
  for (const p of Object.values(THERI_APADANA_PROFILES)) {
    assert.equal(Object.hasOwn(p, 'publisher_chapter'), false);
    pali[p.id] = digest(JSON.stringify(canon.segments(d.byId.get(p.id)).map(({ ref, type, text }) => ({ ref, type, text }))));
    assert.throws(() => validateLink({ ...p, publisher_chapter: 'chapter-3' }, p.id, d.byId.get(p.id), d.canon.books[d.byId.get(p.id).book]), /differs/);
  }
  assert.equal(digest(JSON.stringify(pali)), 'ba388ca037d85d80c9ac3706b98429572240be70f5b5e134e7f63410672e1ef2');
  for (const g of gold.poems) {
    const p = thera(g.id), u = d.byId.get(g.id), book = d.canon.books[u.book];
    assert.equal(APADANA_PROFILES[g.id], p);
    assert.equal(p.id, g.id); assert.equal(p.poem, g.poem); assert.equal(p.publisher_chapter, g.publisher_chapter);
    validateLink(p, g.id, u, book);
    for (const key of pins.filter(key => key !== 'root_sha256')) assert.equal(p[key], g[key]);
    assert.equal(p.root_sha256, g.root.root_sha256);
    assert.deepEqual([u.start, u.end, u.vri, u.index_revision ?? null], [g.root.start, g.root.end, g.root.vri, g.root.index_revision]);
    assert.deepEqual(p.stanza_layout, g.stanza_layout); assert.deepEqual(p.note_numbers, g.note_numbers);
    for (const finding of review.poems.find(row => row.id === g.id).edition_findings) assert.ok(p.mapping_notes.includes(finding), `${g.id} edition finding retained verbatim`);
    if (p.chapter_summary) {
      for (const [key, value] of Object.entries(p.chapter_summary)) assert.deepEqual(value, g.chapter_summary[key]);
      const s = p.chapter_summary; assert.equal(rootDigest({ ...u, start: s.root_start, end: s.root_end }, book), s.root_sha256);
    }
    for (const [i, division] of (p.publisher_divisions || []).entries()) {
      assert.deepEqual(Object.keys(division).sort(), ['body_sha256', 'kind', 'label', 'note_numbers', 'notes_sha256', 'parent_id', 'placement']);
      for (const [key, value] of Object.entries(division)) assert.deepEqual(value, g.publisher_divisions[i][key]);
      assert.deepEqual(division.note_numbers, []);
    }
  }
  assert.equal(thera('tha-ap19').publisher_divisions[0].placement, 'after_poem');
  assert.equal(thera('tha-ap32').publisher_divisions[0].placement, 'after_chapter_summary');
  for (const uid of ['tha-ap1', 'tha-ap2', 'tha-ap12', 'tha-ap72', 'tha-ap999']) assert.equal(APADANA_PROFILES[uid], undefined);
});

test('source-enabled twenty exact Git artifacts reproduce 327 stanzas, 387 paragraphs, 153 notes and note-free apparatus', { skip: !checkout }, () => {
  let paragraphs = 0, stanzas = 0, notes = 0, apparatusNotes = 0;
  for (const artifact of [...gold.rights, gold.publisher_routing]) {
    const bytes = readFileSync(join(checkout, artifact.path)); assert.equal(digest(bytes), artifact.raw_sha256);
  }
  for (const g of gold.poems) {
    const p = thera(g.id), raw = source(p), value = parseApadana(raw, p), parts = value.text.split('\n\n');
    assert.equal(digest(raw), g.raw_sha256);
    assert.equal(createHash('sha1').update('blob ' + Buffer.byteLength(raw) + '\0').update(raw).digest('hex'), g.git_blob_sha1);
    assert.equal(value.title, g.title); assert.equal(digest(value.text), g.body_sha256);
    assert.equal(digest(JSON.stringify(value.translator_notes)), g.notes_sha256);
    assert.equal(digest(value.publisher_paratext), g.paratext_sha256);
    assert.equal(Boolean(value.publisher_paratext), g.id === 'tha-ap13' || g.id === 'tha-ap23');
    assert.deepEqual(value.translator_notes.map(note => note.number), g.note_numbers);
    assert.equal(parts.length, g.body_paragraphs.length);
    for (const row of g.body_paragraphs) {
      assert.equal(digest(parts[row.paragraph]), row.sha256, `${g.id} paragraph ${row.paragraph}`);
      assert.equal(parts[row.paragraph].split('\n').length, row.lines); paragraphs++;
    }
    for (const note of g.notes) {
      assert.equal(note.owner, 'poem'); assert.equal(digest(value.translator_notes.find(n => n.number === note.number).text), note.body_sha256); notes++;
    }
    assertApparatus(value, p, true);
    if (value.chapter_summary) {
      const s = value.chapter_summary; assert.equal(digest(s.text), g.chapter_summary.body_sha256);
      assert.equal(digest(JSON.stringify(s.translator_notes)), g.chapter_summary.notes_sha256);
      assert.equal(s.text.split('\n\n').length, g.id === 'tha-ap22' ? 3 : 2);
      for (const row of g.chapter_summary.paragraphs) assert.equal(digest(s.text.split('\n\n')[row.paragraph]), row.sha256);
      apparatusNotes += s.translator_notes.length;
    }
    for (const [i, division] of (value.publisher_divisions || []).entries()) {
      assert.equal(digest(division.text), g.publisher_divisions[i].body_sha256);
      assert.equal(digest(JSON.stringify(division.translator_notes)), g.publisher_divisions[i].notes_sha256);
      apparatusNotes += division.translator_notes.length;
    }
    stanzas += g.physical_stanza_count;
  }
  assert.deepEqual([stanzas, paragraphs, notes, apparatusNotes], [327, 387, 153, 0]);
});

test('source-enabled quotation extraction retains every original stanza word and every irregular printed label', { skip: !checkout }, async () => {
  let count = 0;
  for (const g of gold.poems) {
    const p = thera(g.id), value = parse(p), parts = value.text.split('\n\n'), quoted = stanzaWords(value, p), entries = quoted.split('\n\n');
    assert.equal(entries.length, g.physical_stanza_count);
    for (const [i, label] of g.stanza_layout.entries()) {
      const marked = parts[i + 1].replace(/\[Note \d+\]/g, '').trim();
      assert.ok(marked.endsWith(label.suffix)); assert.equal(entries[i], marked.slice(0, -label.suffix.length).trim());
      assert.equal(entries[i].split('\n').length, label.lines); count++;
    }
    for (const excluded of [parts[0], parts.at(-2), parts.at(-1), value.publisher_paratext, value.chapter_summary?.text, ...(value.publisher_divisions || []).map(s => s.text)].filter(Boolean)) assert.ok(!quoted.includes(excluded));
    assert.equal(stanzaWords({ ...value, translator_notes: [{ number: 999, text: 'Unique synthetic editorial material outside all stanza wording.' }] }, p), quoted);
    assert.throws(() => stanzaWords({ ...value, text: value.text + 'Changed' }, p), /differs/);
  }
  assert.equal(count, 327);
  const malformed = thera('tha-ap21').stanza_layout.find(s => s.publisher_label === '793'); assert.equal(malformed.suffix, '(10 [793]');
  assert.deepEqual(thera('tha-ap24').stanza_layout.filter(s => s.local_label === null).map(s => s.publisher_label), ['882', '883', '884', '885']);
  assert.deepEqual(thera('tha-ap30').stanza_layout.filter(s => s.local_label === '6').map(s => s.publisher_label), ['988', '989']);
  assert.equal(thera('tha-ap30').stanza_layout.find(s => s.publisher_label === '992').local_label, null);
  const samples = [['tha-ap21','793'], ['tha-ap24','882'], ['tha-ap30','989'], ['tha-ap30','992'], ['tha-ap27','969-970'], ['tha-ap31','994-995']];
  for (const [uid, label] of samples) {
    const p = thera(uid), value = parse(p), index = p.stanza_layout.findIndex(s => s.publisher_label === label);
    const query = stanzaWords(value, p).split('\n\n')[index].split('\n')[0];
    const result = await scopedVerify(p, value, query); assert.equal(result.verdict, 'found');
    assert.equal(result.comparison.verbatim, 'not_assessed'); assert.equal(result.scope.translations_checked[0].translation_revision, APADANA_COMMIT);
  }
  for (const [uid, kind] of [['tha-ap13','preface'], ['tha-ap19','division'], ['tha-ap22','summary'], ['tha-ap32','summary'], ['tha-ap23','note'], ['tha-ap24','note']]) {
    const p = thera(uid), value = parse(p);
    const query = kind === 'preface' ? value.publisher_paratext : kind === 'division' ? value.publisher_divisions[0].text : kind === 'summary' ? value.chapter_summary.text : value.translator_notes.at(-1).text.split(/\s+/).slice(0, 20).join(' ');
    assert.equal((await scopedVerify(p, value, query)).verdict, 'not_found_in_scope', `${uid} ${kind} excluded from stanza comparison`);
  }
});

async function scopedVerify(p, value, text) {
  return verifyQuote({ text, language: 'english', texts: [p.id], translation_ids: [tid(p)] }, {
    fetchTranslation: async (_unit, version, request) => {
      assert.equal(version, tid(p)); assert.equal(request.translation_revision, APADANA_COMMIT); assert.equal(request.allow_fallback, false);
      return { ...value, translation_id: tid(p), translation_revision: APADANA_COMMIT, translator: p.translator, url: p.url, offset: 0, next_offset: null, attribution: 'Pinned publisher source fixture', license: APADANA_LICENSE };
    },
  });
}

test('source-enabled family dispatch, exact profiles and raw pins refuse foreign identities and editorial repair', { skip: !checkout }, () => {
  const d = canon.load();
  for (const g of gold.poems) {
    const p = thera(g.id), raw = source(p), u = d.byId.get(g.id), book = d.canon.books[u.book];
    for (const changed of [raw + '\n', raw.replace('title:', 'title: Changed '), raw.replace('category: chapter-3', 'category: chapter-4'), raw.replace('### ', '## ')]) {
      assert.notEqual(changed, raw); assert.throws(() => parseApadana(changed, p), /differs/);
    }
    const collision = Object.values(THERI_APADANA_PROFILES).find(old => old.poem === p.poem);
    for (const patch of [{ id: collision.id }, { poem: p.poem + 1 }, { publisher_chapter: 'chapter-4' }, { path: collision.path }, { raw_url: collision.raw_url }, { url: collision.url }, { body_sha256: '0'.repeat(64) }, { publisher_preface: null }, { collection_summary: null }]) {
      const changed = { ...p, ...patch };
      assert.throws(() => parseApadana(raw, changed), /differs/);
      assert.throws(() => validateLink(changed, p.id, u, book), /differs/);
    }
    assert.throws(() => parseApadana(source(collision), p), /differs/);
    assert.throws(() => parseTheraApadana(source(collision), collision), /differs/);
  }
  const zero = thera('tha-ap30'), raw = source(zero), value = parse(zero);
  assert.equal(zero.note_count, 0); assert.deepEqual(zero.note_numbers, []); assert.deepEqual(value.translator_notes, []);
  assert.ok(!/^\[\^\d+\]:/m.test(raw));
  assert.throws(() => parseApadana(raw + '\n\n[^1]: Synthetic unowned note.\n', zero), /differs/);
  for (const [uid, from, to] of [['tha-ap21','(10 \\[793\\]','(10) \\[793\\]'], ['tha-ap30','(6) \\[989\\]','(7) \\[989\\]']]) {
    const p = thera(uid), raw = source(p), changed = raw.replace(from, to);
    assert.notEqual(changed, raw); assert.throws(() => parseApadana(changed, p), /differs/);
  }
  const upavana = thera('tha-ap24'), v = parse(upavana), paragraph = v.text.split('\n\n').find(s => s.includes('[890]'));
  assert.ok(paragraph.includes('*'), 'Original unmatched emphasis remains literal');
  const subhuti = thera('tha-ap23'), noteText = JSON.stringify(parse(subhuti).translator_notes);
  assert.ok(!noteText.includes('<dfn') && !noteText.includes('<a ') && !noteText.includes('<span'));
});

test('unsupported chapter-three artifacts and foreign metadata fail before any source request', async () => {
  const d = canon.load(), p = thera('tha-ap13'), u = d.byId.get(p.id), book = d.canon.books[u.book];
  for (const key of [...pins, 'id', 'poem', 'publisher_chapter', 'note_numbers', 'stanza_layout', 'chapter_summary', 'publisher_divisions']) assert.throws(() => validateLink({ ...p, [key]: null }, p.id, u, book), /differs/);
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('No request should be sent'); };
  for (const basename of ['poem-010', 'poem-070', 'poem-999']) {
    const url = p.raw_url.replace('poem-011', basename), selector = tid(p).replace('poem-011', basename);
    assert.equal(isApadanaRawUrl(url), false);
    await assert.rejects(fetchPublic(url, { json: false }), /outside the supported public sources/);
    await assert.rejects(english.translation(u, selector), /not linked/);
  }
  await assert.rejects(english.translation(u, canon.translationId(THERI_APADANA_PROFILES['thi-ap11'])), /not linked/);
  assert.equal(calls, 0);
});

test('backend catalogues publish exact copied source and apparatus descriptors', () => {
  for (const g of gold.poems) {
    const p = thera(g.id), u = canon.resolve(g.id).unit;
    const choices = [canon.describe(u).english.find(v => v.translation_id === tid(p)), english.available(u).find(v => v.translation_id === tid(p))];
    for (const choice of choices) {
      assert.ok(choice); assert.equal(choice.translation_revision, APADANA_COMMIT); assert.equal(choice.url, p.url);
      assertApparatus(choice, p, false); assert.deepEqual(choice.note_numbers, p.note_numbers);
      assert.equal(Object.hasOwn(choice, 'text'), false); assert.equal(Object.hasOwn(choice, 'translator_notes'), false);
      choice.note_numbers.push(999);
      if (choice.chapter_summary) choice.chapter_summary.note_numbers.push(999);
      for (const division of choice.publisher_divisions || []) division.note_numbers.push(999);
    }
    const fresh = english.available(u).find(v => v.translation_id === tid(p));
    assert.deepEqual(fresh.note_numbers, p.note_numbers); assertApparatus(fresh, p, false);
  }
});

test('source-enabled all twenty APIs retain 500-character continuations, edition caveats and empty note arrays', { skip: !checkout }, async () => {
  const calls = []; onlyPinnedFetch(calls);
  for (const g of gold.poems) {
    const p = thera(g.id), u = canon.resolve(g.id).unit; let args = { limit: 500, translation_revision: APADANA_COMMIT }, text = '', pageCount = 0;
    while (args) {
      const value = await english.translation(u, tid(p), args); text += value.text; pageCount++;
      assert.equal(value.translation_revision, APADANA_COMMIT); assert.equal(value.license, APADANA_LICENSE); assert.equal(value.license_url, APADANA_LICENSE_URL);
      for (const key of pins) assert.equal(value[key], p[key]);
      assert.deepEqual(value.translator_notes.map(n => n.number), p.note_numbers); assertApparatus(value, p, true);
      for (const finding of review.poems.find(row => row.id === g.id).edition_findings) assert.ok(value.mapping_notes.includes(finding));
      args = value.continue_with?.arguments;
    }
    assert.ok(pageCount > 1); assert.equal(digest(text), p.body_sha256);
    const before = calls.length;
    for (const options of [{ offset: 500 }, { translation_revision: 'f'.repeat(40) }, { allow_partial: true }, { allow_shared: true }]) await assert.rejects(english.translation(u, tid(p), options));
    assert.equal(calls.length, before);
  }
  const p = thera('tha-ap30'), first = await english.translation(canon.resolve(p.id).unit, tid(p), { limit: 500 });
  await assert.rejects(english.translation(canon.resolve(p.id).unit, tid(p), { ...first.continue_with.arguments, prefix_sha256: '0'.repeat(64) }), /prefix|changed/);
});

test('source-enabled current reading API returns the new family and note-free apparatus without old-family collisions', { skip: !checkout }, async () => {
  assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v39.html'); onlyPinnedFetch([]);
  for (const uid of ['tha-ap13', 'tha-ap19', 'tha-ap22', 'tha-ap23', 'tha-ap24', 'tha-ap30', 'tha-ap32']) {
    const p = thera(uid), value = await readPassage({ uid, translation: tid(p), englishCharacters: 500 });
    assert.ok(!value.english_error, value.english_error); assert.equal(value.text_id, uid);
    assert.equal(value.english.translation_id, tid(p)); assert.deepEqual(value.english.translator_notes.map(n => n.number), p.note_numbers);
    assertApparatus(value.english, p, true);
    assert.equal(typeof value.english.publisher_paratext, 'string');
    assert.equal(Boolean(value.english.publisher_paratext), uid === 'tha-ap13' || uid === 'tha-ap23');
    if (uid === 'tha-ap30') assert.deepEqual(value.english.translator_notes, []);
    if (value.english.continue_with) assert.equal(value.english.continue_with.arguments.english_translation_revision, APADANA_COMMIT);
  }
});
