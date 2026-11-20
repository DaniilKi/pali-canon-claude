import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR } from '../src/apadana-profiles.mjs';
import { parseApadana, quotationText, digest, validateLink } from '../src/apadana.mjs';
import { verifyQuote } from '../src/verify.mjs';
import { readPassage, WIDGET_URI } from '../src/chatgpt-widget.mjs';

const gold = JSON.parse(readFileSync('docs/evidence/apadana/FOURTH_CHAPTER_GOLDENS.json', 'utf8'));
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const pFor = n => APADANA_PROFILES['thi-ap' + n];
const idFor = n => 'ap:chapter-4/poem-' + String(n).padStart(3, '0');
const source = n => readFileSync(join(checkout, `src/_poems/chapter-4/poem-${String(n).padStart(3, '0')}.md`), 'utf8');
const parse = n => parseApadana(source(n), pFor(n));
const pins = ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'];
const apparatus = ['publisher_preface', 'chapter_summary', 'collection_summary'];
const clone = value => structuredClone(value);
function frozen(value) {
  if (value && typeof value === 'object') { Object.freeze(value); for (const v of Object.values(value)) frozen(v); }
  return value;
}
function onlyPinnedFetch(calls) {
  globalThis.fetch = async url => {
    const p = Object.values(APADANA_PROFILES).find(p => p.raw_url === url.href);
    assert.ok(p, 'No substitute path, publisher revision or provider is permitted');
    calls.push(p.id); return new Response(source(p.poem));
  };
}
function noteOwner(value, owner) {
  return owner === 'poem' ? value.translator_notes : value[owner].translator_notes;
}
function assertMetadata(value, p) {
  assert.equal(value.translation_revision, APADANA_COMMIT);
  assert.equal(value.translation_id, idFor(p.poem));
  for (const key of apparatus) {
    assert.equal(Object.hasOwn(value, key), Object.hasOwn(p, key), `${p.id} ${key} ownership`);
    if (p[key]) assert.deepEqual(value[key], p[key]);
  }
}

// These aggregate pins were computed independently from the clean 2e3d6c4
// thirty-profile snapshot and its source-rendered {ref,type,text}[] hashes.
test('all thirty prior profiles and Pāli sequences remain frozen while ten new roots match independent evidence', () => {
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  const prior = frozen(clone(Object.fromEntries(Object.entries(APADANA_PROFILES).filter(([, p]) => p.id.startsWith('thi-ap') && p.poem <= 30))));
  assert.equal(digest(JSON.stringify(prior)), '181858a10aa3eefa91af7edd7a4098ca41e1efce9f2312cc3683ecb5795ac55a');
  const d = canon.load(), pali = {};
  for (const [uid, expected] of Object.entries(prior)) {
    assert.deepEqual(APADANA_PROFILES[uid], expected);
    pali[uid] = digest(JSON.stringify(canon.segments(d.byId.get(uid)).map(({ ref, type, text }) => ({ ref, type, text }))));
  }
  assert.equal(digest(JSON.stringify(pali)), '4dffa7d8a6c1c1fb6e66215eb862528eeeb40517d7f3a40d7dadf41790c36028');
  for (const g of gold.poems) {
    const p = pFor(g.poem), u = d.byId.get(g.id), book = d.canon.books[u.book];
    validateLink(p, g.id, u, book);
    for (const key of pins.filter(key => key !== 'root_sha256')) assert.equal(p[key], g[key]);
    assert.equal(p.root_sha256, g.root.root_sha256);
    assert.deepEqual([u.start, u.end, u.vri, u.index_revision ?? null], [g.root.start, g.root.end, g.root.vri, g.root.index_revision]);
    assert.deepEqual(p.stanza_layout, g.stanza_layout); assert.deepEqual(p.note_numbers, g.note_numbers);
    for (const key of apparatus) if (p[key]) for (const [field, value] of Object.entries(p[key])) assert.deepEqual(value, g[key][field]);
    assert.match(p.mapping_notes.join(' '), /not a line-complete translation/);
    for (const key of [...pins, ...apparatus, 'stanza_layout', 'note_numbers', 'index_revision']) {
      assert.throws(() => validateLink({ ...p, [key]: null }, g.id, u, book), /differs/);
    }
    for (const field of ['partial_scope', 'shared_scope', 'section', 'parts']) assert.throws(() => validateLink({ ...p, [field]: null }, g.id, u, book), /differs/);
    if (g.poem >= 33 && g.poem <= 37) {
      assert.equal(u.index_revision, 'apadana-theri31-40-v1');
      assert.throws(() => validateLink(p, g.id, { ...u, index_revision: undefined }, book), /differs/);
    }
  }
  assert.deepEqual(Object.keys(pFor(31).publisher_preface).sort(), ['body_sha256', 'kind', 'label', 'note_numbers', 'notes_sha256', 'parent_id']);
  assert.deepEqual(pFor(31).note_numbers, Array.from({ length: 17 }, (_, i) => i + 2));
  assert.equal(Object.hasOwn(pFor(35), 'publisher_divisions'), false);
  assert.deepEqual(pFor(40).chapter_summary.note_numbers, [8, 9, 10]);
  assert.deepEqual(pFor(40).collection_summary.note_numbers, [11, 12]);
});

test('source-enabled ten pinned artifacts reproduce 230 stanzas, 260 paragraphs and all 224 separately owned notes', { skip: !checkout }, () => {
  let stanzas = 0, paragraphs = 0;
  const counts = { poem: 0, publisher_preface: 0, chapter_summary: 0, collection_summary: 0 };
  for (const artifact of gold.rights) assert.equal(digest(readFileSync(join(checkout, artifact.path))), artifact.raw_sha256);
  for (const g of gold.poems) {
    const raw = source(g.poem), value = parseApadana(raw, pFor(g.poem)), parts = value.text.split('\n\n');
    assert.equal(digest(raw), g.raw_sha256);
    assert.equal(createHash('sha1').update('blob ' + Buffer.byteLength(raw) + '\0').update(raw).digest('hex'), g.git_blob_sha1);
    assert.equal(value.title, g.title); assert.equal(digest(value.text), g.body_sha256);
    assert.equal(digest(JSON.stringify(value.translator_notes)), g.notes_sha256);
    assert.equal(digest(value.publisher_paratext), g.paratext_sha256);
    assert.equal(parts.length, g.body_paragraphs.length);
    for (const row of g.body_paragraphs) {
      assert.equal(digest(parts[row.paragraph]), row.sha256, `${g.id} paragraph ${row.paragraph}`);
      assert.equal(parts[row.paragraph].split('\n').length, row.lines); paragraphs++;
    }
    assert.deepEqual(value.translator_notes.map(note => note.number), g.note_numbers);
    for (const note of g.notes) {
      const actual = noteOwner(value, note.owner).find(n => n.number === note.number);
      assert.ok(actual, `${g.id} ${note.owner} note ${note.number}`);
      assert.equal(digest(actual.text), note.body_sha256); counts[note.owner]++;
    }
    if (value.publisher_preface) {
      assert.deepEqual(Object.keys(value.publisher_preface).sort(), [...Object.keys(pFor(g.poem).publisher_preface), 'translator_notes'].sort());
      assert.equal(Object.hasOwn(value.publisher_preface, 'text'), false);
      assert.equal(digest(JSON.stringify(value.publisher_preface.translator_notes)), g.publisher_preface.notes_sha256);
    }
    for (const key of ['chapter_summary', 'collection_summary']) if (value[key]) {
      assert.equal(digest(value[key].text), g[key].body_sha256);
      assert.equal(digest(JSON.stringify(value[key].translator_notes)), g[key].notes_sha256);
      assert.equal(value[key].text.split('\n\n').length, g[key].paragraph_count);
      for (const row of g[key].paragraphs) assert.equal(digest(value[key].text.split('\n\n')[row.paragraph]), row.sha256);
    }
    assert.equal(Object.hasOwn(value, 'publisher_divisions'), false);
    stanzas += g.physical_stanza_count;
  }
  assert.deepEqual([stanzas, paragraphs, counts], [230, 260, { poem: 218, publisher_preface: 1, chapter_summary: 3, collection_summary: 2 }]);
});

test('source-enabled every printed stanza retains its words and irregular labels without importing apparatus into quotes', { skip: !checkout }, async () => {
  let stanzas = 0;
  for (const g of gold.poems) {
    const value = parse(g.poem), paragraphs = value.text.split('\n\n');
    const quoted = quotationText({ ...value, translation_id: idFor(g.poem) }), entries = quoted.split('\n\n');
    assert.equal(entries.length, g.physical_stanza_count);
    for (const [i, label] of g.stanza_layout.entries()) {
      const marked = paragraphs[i + 1].replace(/\[Note \d+\]/g, '').trim();
      assert.ok(marked.endsWith(label.suffix));
      assert.equal(entries[i], marked.slice(0, -label.suffix.length).trim(), `${g.id} exact words ${label.suffix}`);
      assert.equal(entries[i].split('\n').length, label.lines);
      assert.ok(!/\[Note \d+\]/.test(entries[i])); stanzas++;
    }
    for (const excluded of [paragraphs[0], paragraphs.at(-2), paragraphs.at(-1), value.publisher_paratext, value.chapter_summary?.text, value.collection_summary?.text].filter(Boolean)) assert.ok(!quoted.includes(excluded));
    if (g.poem === 40) {
      assert.equal(value.chapter_summary.text.split('\n\n').length, 3);
      assert.equal(value.collection_summary.text.split('\n\n').length, 4);
      for (const closing of value.collection_summary.text.split('\n\n').slice(2)) assert.ok(!quoted.includes(closing));
    }
    assert.throws(() => quotationText({ ...value, translation_id: idFor(g.poem), text: value.text + 'Changed' }), /differs/);
  }
  assert.equal(stanzas, 230);
  assert.deepEqual(pFor(31).stanza_layout.filter(s => s.local_label === '11').map(s => s.publisher_label), ['1114', '1115']);
  assert.equal(pFor(34).stanza_layout.filter(s => s.local_label.includes(',')).length, 6);
  for (const n of [37, 38, 39]) assert.equal(pFor(n).stanza_layout.filter(s => /^\d+-\d+$/.test(s.local_label)).length, 1);
  // Real verifier scope retains edition identity for duplicate, compound and
  // combined entries; every source stanza's exact wording is checked above.
  for (const [n, select] of [[31, s => s.publisher_label === '1115'], [34, s => s.local_label.includes(',')], [37, s => s.local_label.includes('-')], [38, s => s.local_label.includes('-')], [39, s => s.local_label.includes('-')], [40, s => s.local_label.includes(',')]]) {
    const p = pFor(n), value = parse(n), index = p.stanza_layout.findIndex(select);
    assert.ok(index >= 0);
    const stanza = quotationText({ ...value, translation_id: idFor(n) }).split('\n\n')[index];
    const result = await verifyQuote({ text: stanza.split('\n')[0], language: 'english', texts: [p.id], translation_ids: [idFor(n)] }, {
      fetchTranslation: async (_unit, version, request) => {
        assert.equal(version, idFor(n)); assert.equal(request.translation_revision, APADANA_COMMIT); assert.equal(request.allow_fallback, false);
        return { ...value, translation_id: idFor(n), translation_revision: APADANA_COMMIT, translator: APADANA_TRANSLATOR, url: p.url, offset: 0, next_offset: null, attribution: 'Pinned publisher source fixture', license: APADANA_LICENSE };
      },
    });
    assert.equal(result.verdict, 'found'); assert.equal(result.comparison.verbatim, 'not_assessed');
    assert.equal(result.scope.translations_checked[0].translation_revision, APADANA_COMMIT);
  }
});

test('source-enabled finite extraction preserves separate preface and summary owners, literal editorial symbols and exact source failures', { skip: !checkout }, () => {
  const v31 = parse(31), v33 = parse(33), v35 = parse(35), v40 = parse(40);
  assert.deepEqual(v31.publisher_preface.translator_notes.map(n => n.number), [1]);
  assert.deepEqual(v31.translator_notes.map(n => n.number), Array.from({ length: 17 }, (_, i) => i + 2));
  assert.ok(v31.publisher_paratext.includes('[Note 1]'));
  assert.ok(!v31.text.includes('[Note 1]'));
  assert.deepEqual(v40.translator_notes.map(n => n.number), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(v40.chapter_summary.translator_notes.map(n => n.number), [8, 9, 10]);
  assert.deepEqual(v40.collection_summary.translator_notes.map(n => n.number), [11, 12]);
  assert.ok(!v40.text.includes('The Summary:') && !v40.text.includes('Summary of Chapters:'));
  assert.ok(v35.translator_notes.find(n => n.number === 33).text.includes('<'));
  assert.equal(Object.hasOwn(v35, 'publisher_divisions'), false);
  const html = source(33).match(/<span class="diacritics"[^]*?<\/span><span class="no-diacritics"[^]*?<\/span>/g);
  assert.equal(html.length, 2);
  assert.ok(!source(33).slice(0, source(33).search(/^\[\^\d+\]:/m)).includes('<span'));
  assert.ok(!v33.text.includes('<span') && !JSON.stringify(v33.translator_notes).includes('<span'));
  for (const g of gold.poems) {
    const raw = source(g.poem), p = pFor(g.poem);
    for (const changed of [raw + '\n', raw.replace('title:', 'title: Changed '), raw.replace('[^1]:', '[^999]:'), raw.replace('### ', '## ')]) {
      assert.notEqual(changed, raw); assert.throws(() => parseApadana(changed, p), /differs/);
    }
    for (const key of ['raw_sha256', 'body_sha256', 'notes_sha256', 'stanza_layout', ...apparatus]) assert.throws(() => parseApadana(raw, { ...p, [key]: null }), /differs/);
  }
  for (const [n, replacements] of [[31, [['[^1]', '[^2]'], ['(11) \\[1115\\]', '(12) \\[1115\\]']]], [40, [['[^8]', '[^7]'], ['[^11]', '[^10]'], ['The Summary:', 'Changed summary:'], ['And then there is the Summary of Chapters:', 'Changed collection summary:']]]]) {
    for (const [from, to] of replacements) {
      const raw = source(n), changed = raw.replace(from, to);
      assert.notEqual(changed, raw); assert.throws(() => parseApadana(changed, pFor(n)), /differs/);
    }
  }
});

test('backend source catalogues expose exact new owners as copied metadata, never translated bodies', () => {
  for (let n = 31; n <= 40; n++) {
    const p = pFor(n), unit = canon.resolve(p.id).unit;
    const choices = [canon.describe(unit).english.find(v => v.translation_id === idFor(n)), english.available(unit).find(v => v.translation_id === idFor(n))];
    for (const value of choices) {
      assert.ok(value); assertMetadata(value, p);
      assert.equal(Object.hasOwn(value, 'text'), false); assert.equal(Object.hasOwn(value, 'translator_notes'), false);
      for (const key of apparatus) if (value[key]) {
        assert.equal(Object.hasOwn(value[key], 'text'), false); assert.equal(Object.hasOwn(value[key], 'translator_notes'), false);
        value[key].note_numbers.push(999);
      }
    }
    assertMetadata(canon.describe(unit).english.find(v => v.translation_id === idFor(n)), p);
    assertMetadata(english.available(unit).find(v => v.translation_id === idFor(n)), p);
  }
});

test('source-enabled API pages preserve all ten bodies and apparatus across pinned continuations and refuse changed identities', { skip: !checkout }, async () => {
  const calls = []; onlyPinnedFetch(calls);
  for (let n = 31; n <= 40; n++) {
    const p = pFor(n), unit = canon.resolve(p.id).unit;
    let args = { limit: n === 31 || n === 40 ? 500 : 12000, translation_revision: APADANA_COMMIT }, text = '', pageCount = 0;
    while (args) {
      const value = await english.translation(unit, idFor(n), args);
      text += value.text; pageCount++;
      assert.equal(value.translation_revision, APADANA_COMMIT);
      for (const key of pins) assert.equal(value[key], p[key]);
      assert.equal(value.license, APADANA_LICENSE); assert.equal(value.license_url, APADANA_LICENSE_URL);
      assert.deepEqual(value.translator_notes.map(note => note.number), p.note_numbers);
      if (n === 31) { assert.deepEqual(value.publisher_preface.translator_notes.map(note => note.number), [1]); assert.equal(Object.hasOwn(value.publisher_preface, 'text'), false); }
      if (n === 40) { assert.deepEqual(value.chapter_summary.translator_notes.map(note => note.number), [8, 9, 10]); assert.deepEqual(value.collection_summary.translator_notes.map(note => note.number), [11, 12]); }
      args = value.continue_with?.arguments;
    }
    assert.equal(digest(text), p.body_sha256);
    if (n === 31 || n === 40) assert.ok(pageCount > 1);
    const before = calls.length;
    for (const options of [{ offset: 500 }, { translation_revision: 'f'.repeat(40) }, { allow_partial: true }, { allow_shared: true }]) await assert.rejects(english.translation(unit, idFor(n), options));
    await assert.rejects(english.translation(unit, idFor(n === 31 ? 40 : 31)), /not linked/);
    assert.equal(calls.length, before);
  }
  const unit = canon.resolve('thi-ap31').unit, first = await english.translation(unit, idFor(31), { limit: 500 });
  await assert.rejects(english.translation(unit, idFor(31), { ...first.continue_with.arguments, prefix_sha256: '0'.repeat(64) }), /prefix|changed/);
});

test('source-enabled current reading API exposes preface notes once and separates both summaries from poem and notes', { skip: !checkout }, async () => {
  assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v30.html'); onlyPinnedFetch([]);
  for (const n of [31, 33, 35, 40]) {
    const value = await readPassage({ uid: pFor(n).id, translation: idFor(n) });
    assert.ok(!value.english_error, value.english_error);
    assert.deepEqual(value.english.translator_notes.map(note => note.number), pFor(n).note_numbers);
    if (n === 31) {
      assert.deepEqual(Object.keys(value.english.publisher_preface).sort(), [...Object.keys(pFor(31).publisher_preface), 'translator_notes'].sort());
      assert.equal(Object.hasOwn(value.english.publisher_preface, 'text'), false);
      assert.ok(value.english.publisher_paratext); assert.deepEqual(value.english.publisher_preface.translator_notes.map(note => note.number), [1]);
    }
    if (n === 35) assert.equal(Object.hasOwn(value.english, 'publisher_divisions'), false);
    if (n === 40) {
      assert.equal(value.english.chapter_summary.text.split('\n\n').length, 3);
      assert.equal(value.english.collection_summary.text.split('\n\n').length, 4);
      assert.deepEqual(value.english.chapter_summary.translator_notes.map(note => note.number), [8, 9, 10]);
      assert.deepEqual(value.english.collection_summary.translator_notes.map(note => note.number), [11, 12]);
    }
  }
});
