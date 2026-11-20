import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR } from '../src/apadana-profiles.mjs';
import { parseApadana, plainMarkdown, quotationText, digest, validateLink } from '../src/apadana.mjs';
import { verifyQuote } from '../src/verify.mjs';
import { readPassage, WIDGET_HTML, WIDGET_URI } from '../src/chatgpt-widget.mjs';
import { apadanaId, validateApadanaChoice, validateChapterSummary, validatePublisherDivisions, scopeDescriptor, validateEnglishPage } from '../web/translation-policy.mjs';
import { comparisonChoices } from '../web/translation-comparison.mjs';
import { translatorNotes } from '../web/milinda-sources.mjs';

const gold = JSON.parse(readFileSync('docs/evidence/apadana/THIRD_CHAPTER_GOLDENS.json', 'utf8'));
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const clone = value => structuredClone(value);
const pins = ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'];
const emptySha = digest('');
const profile = n => APADANA_PROFILES['thi-ap' + n];
const rawSource = p => readFileSync(join(checkout, `src/_poems/chapter-4/poem-${String(p.poem).padStart(3, '0')}.md`), 'utf8');
const parsed = p => parseApadana(rawSource(p), p);
const owned = numbers => numbers.map(number => ({ number, text: 'Synthetic editorial note ' + number }));
const withContent = descriptor => ({ ...clone(descriptor), text: 'Synthetic separately owned apparatus', translator_notes: owned(descriptor.note_numbers) });
let actualSource = false;
function fixture(n) {
  const p = profile(n), uid = p.id;
  const choice = { translation_id: apadanaId(uid), translator: APADANA_TRANSLATOR, license: APADANA_LICENSE, translation_revision: APADANA_COMMIT, url: p.url };
  if (p.chapter_summary) choice.chapter_summary = clone(p.chapter_summary);
  if (p.publisher_divisions) choice.publisher_divisions = clone(p.publisher_divisions);
  const args = { uid, translation: choice.translation_id, translation_revision: APADANA_COMMIT, limit: 500 };
  const data = { ...clone(choice), ...Object.fromEntries(pins.map(key => [key, p[key]])), text_id: uid, source: 'apadana', offset: 0, limit: 500,
    text: 'Synthetic poem wording, not source evidence.', attribution: 'Synthetic attribution', changes: 'Synthetic extraction notice', fetched_url: p.raw_url,
    mapping_notes: [...p.mapping_notes], notes: [...p.mapping_notes],
    license_url: APADANA_LICENSE_URL, publisher_paratext: p.paratext_sha256 === emptySha ? '' : 'Synthetic publisher preface', translator_notes: owned(p.note_numbers), next_offset: null };
  if (p.chapter_summary) data.chapter_summary = withContent(p.chapter_summary);
  if (p.publisher_divisions) data.publisher_divisions = p.publisher_divisions.map(withContent);
  if (actualSource) { Object.assign(data, parsed(p)); args.limit = data.limit = 30000; assert.ok(data.text.length <= data.limit); }
  return { uid, choice, data, args, context: { uid, choices: [choice], accepted: null } };
}
function pinnedFetch(calls) {
  globalThis.fetch = async url => {
    const p = Object.values(APADANA_PROFILES).find(p => p.raw_url === url.href);
    assert.ok(p, 'Only an exact approved publisher artifact may be fetched');
    calls.push(p.id);
    return new Response(rawSource(p));
  };
}

// This digest was calculated from the complete 20-profile object at dev 3854b43.
test('current registry preserves the prior twenty and exact third-chapter source/root contracts', () => {
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  const prior = Object.fromEntries(Object.entries(APADANA_PROFILES).filter(([, p]) => p.id.startsWith('thi-ap') && p.poem <= 20));
  assert.equal(digest(JSON.stringify(prior)), '7255eabd3ced9329c39ede0cafa535583a5e3109db3d1cb6beda6b8836e61b25');
  const d = canon.load();
  for (const g of gold.poems) {
    const p = profile(g.poem), u = d.byId.get(g.id);
    validateLink(p, g.id, u, d.canon.books[u.book]);
    for (const key of pins.filter(k => k !== 'root_sha256')) assert.equal(p[key], g[key], `${g.id} ${key}`);
    assert.equal(p.root_sha256, g.root.root_sha256);
    assert.deepEqual(p.stanza_layout, g.stanza_layout);
    assert.deepEqual(p.note_numbers, g.note_numbers);
    assert.equal(p.stanza_layout.length, g.physical_stanza_count);
    if (p.chapter_summary) for (const [key, value] of Object.entries(p.chapter_summary)) {
      assert.deepEqual(value, g.chapter_summary[key], `${g.id} independently pinned summary ${key}`);
    }
    for (const [i, division] of (p.publisher_divisions || []).entries()) for (const [key, value] of Object.entries(division)) {
      assert.deepEqual(value, g.publisher_divisions[i][key], `${g.id} independently pinned division ${key}`);
    }
    assert.deepEqual([u.start, u.end, u.vri, u.index_revision ?? null],
      [g.root.start, g.root.end, g.root.vri, g.root.index_revision]);
    // Separately pin the reviewed pair repair; the independent source receipt
    // must agree with both the installed data and these exact stanza limits.
    const pair = { 23: '95–130', 24: '131–165' }[g.poem];
    if (pair) assert.deepEqual([u.vri, u.index_revision], [pair, 'apadana-theri21-30-v1']);
    assert.match(p.mapping_notes.join(' '), /not a line-complete translation/);
    for (const key of ['stanza_layout', 'note_numbers', 'root_verses', 'publisher_divisions', 'chapter_summary']) {
      assert.throws(() => validateLink({ ...p, [key]: null }, g.id, u, d.canon.books[u.book]), /differs/);
    }
  }
  assert.equal(profile(21).index_revision, 'apadana-theri11-20-v1');
  assert.equal(profile(23).index_revision, 'apadana-theri21-30-v1');
  assert.equal(profile(24).index_revision, 'apadana-theri21-30-v1');
  assert.equal(APADANA_PROFILES['thi-ap41'], undefined);
});

test('source-enabled extraction reproduces all ten artifacts, 505 paragraphs, 475 stanzas and 379+2 owned notes', { skip: !checkout }, () => {
  let stanzas = 0, paragraphs = 0, poemNotes = 0, summaryNotes = 0;
  for (const artifact of gold.rights) assert.equal(digest(readFileSync(join(checkout, artifact.path))), artifact.raw_sha256);
  for (const g of gold.poems) {
    const p = profile(g.poem), raw = rawSource(p), value = parseApadana(raw, p), parts = value.text.split('\n\n');
    assert.equal(digest(raw), g.raw_sha256);
    assert.equal(createHash('sha1').update('blob ' + Buffer.byteLength(raw) + '\0').update(raw).digest('hex'), g.git_blob_sha1);
    assert.equal(digest(value.text), g.body_sha256);
    assert.equal(digest(JSON.stringify(value.translator_notes)), g.notes_sha256);
    assert.equal(digest(value.publisher_paratext), g.paratext_sha256);
    assert.equal(Boolean(value.publisher_paratext), g.poem === 21);
    assert.deepEqual(value.translator_notes.map(n => n.number), g.note_numbers);
    assert.equal(parts.length, g.body_paragraphs.length);
    for (const row of g.body_paragraphs) {
      assert.equal(digest(parts[row.paragraph]), row.sha256, `${g.id} paragraph ${row.paragraph}`);
      assert.equal(parts[row.paragraph].split('\n').length, row.lines);
      paragraphs++;
    }
    for (const note of g.notes) {
      const actual = note.owner === 'poem' ? value.translator_notes : value.chapter_summary?.translator_notes;
      assert.equal(digest(actual.find(n => n.number === note.number).text), note.body_sha256, `${g.id} note ${note.number}`);
    }
    stanzas += g.physical_stanza_count; poemNotes += value.translator_notes.length;
    if (value.publisher_divisions) {
      const division = value.publisher_divisions[0];
      assert.equal(digest(division.text), g.publisher_divisions[0].body_sha256);
      assert.deepEqual(division.translator_notes, []);
      assert.ok(!value.text.includes(division.text));
    }
    if (value.chapter_summary) {
      const summary = value.chapter_summary;
      assert.equal(digest(summary.text), g.chapter_summary.body_sha256);
      assert.equal(digest(JSON.stringify(summary.translator_notes)), g.chapter_summary.notes_sha256);
      assert.deepEqual(summary.translator_notes.map(n => n.number), [43, 44]);
      assert.deepEqual(value.translator_notes.map(n => n.number), Array.from({ length: 42 }, (_, i) => i + 1));
      for (const row of g.chapter_summary.paragraphs) assert.equal(digest(summary.text.split('\n\n')[row.paragraph]), row.sha256);
      assert.ok(!value.text.includes('The Summary:'));
      summaryNotes += summary.translator_notes.length;
    }
    for (const changed of [raw + '\n', raw.replace('title:', 'title: Changed '), raw.replace('[^1]:', '[^999]:'), raw.replace('### ', '## ')]) {
      assert.notEqual(changed, raw);
      assert.throws(() => parseApadana(changed, p), /differs/);
    }
    assert.throws(() => parseApadana(raw, { ...p, body_sha256: '0'.repeat(64) }), /differs/);
  }
  assert.deepEqual([stanzas, paragraphs, poemNotes, summaryNotes], [475, 505, 379, 2]);
});

test('source-enabled finite paragraph breaks and paired HTML retain every reviewed word', { skip: !checkout }, () => {
  for (const n of [21, 28]) {
    const g = gold.poems.find(g => g.poem === n), p = profile(n), parts = parsed(p).text.split('\n\n');
    for (const rule of g.presentation_recipe.paragraph_splits) {
      const left = parts.findIndex(part => digest(part) === rule.left_presentation_sha256);
      assert.ok(left > 0);
      assert.equal(digest(parts[left + 1]), rule.right_presentation_sha256);
      // Removing only the newly inserted paragraph break recovers the exact
      // display wording of the publisher's single original paragraph.
      const raw = rawSource(p), sourceParagraph = raw.split(/\n\n+/).find(part => digest(part) === rule.raw_paragraph_sha256);
      assert.ok(sourceParagraph, `${p.id} exact joined source paragraph`);
      assert.equal([parts[left], parts[left + 1]].join('\n'), plainMarkdown(sourceParagraph));
    }
  }
  for (const n of [24, 27]) {
    const p = profile(n), g = gold.poems.find(g => g.poem === n), raw = rawSource(p), value = parsed(p);
    assert.ok(g.presentation_recipe.html_display_pairs.length > 0);
    const pairs = [...raw.matchAll(/<span class="diacritics" data-state="on">(c|cc)<\/span><span class="no-diacritics" data-state="off">(ch|chch)<\/span>/g)];
    assert.equal(pairs.length, g.presentation_recipe.html_display_pairs.length);
    pairs.forEach((pair, i) => {
      assert.equal(digest(pair[0]), g.presentation_recipe.html_display_pairs[i].pair_sha256);
      assert.equal(pair[1], g.presentation_recipe.html_display_pairs[i].diacritics);
    });
    assert.ok(!/[<>]/.test(value.text + JSON.stringify(value.translator_notes)));
    assert.throws(() => parseApadana(raw.replace(pairs[0][0], pairs[0][0].replace('>ch<', '>c<')), p), /differs/);
  }
});

test('source-enabled quotation extraction covers every qualified label without dropping words or including apparatus', { skip: !checkout }, async () => {
  let count = 0, globalOnly = 0, localOnly = 0;
  for (const g of gold.poems) {
    const p = profile(g.poem), value = parsed(p), paragraphs = value.text.split('\n\n'), quote = quotationText({ ...value, translation_id: apadanaId(p.id) }), entries = quote.split('\n\n');
    assert.equal(entries.length, g.physical_stanza_count);
    for (const [i, label] of g.stanza_layout.entries()) {
      const marked = paragraphs[i + 1].replace(/\[Note \d+\]/g, '').trim();
      assert.ok(marked.endsWith(label.suffix), `${p.id} stanza ${i}`);
      assert.equal(entries[i] + ' ' + label.suffix, marked.replace(/\s+(?=\S*$)/, ' '));
      assert.ok(!/\[Note \d+\]/.test(entries[i]));
      count++;
      if (label.local_label === null) globalOnly++;
      if (label.publisher_label === null) localOnly++;
    }
    assert.ok(!quote.includes(paragraphs[0]));
    assert.ok(!quote.includes(paragraphs.at(-2)));
    assert.ok(!quote.includes(paragraphs.at(-1)));
    if (value.publisher_paratext) assert.ok(!quote.includes(value.publisher_paratext));
    for (const division of value.publisher_divisions || []) assert.ok(!quote.includes(division.text));
    if (value.chapter_summary) assert.ok(!quote.includes(value.chapter_summary.text));
    assert.throws(() => quotationText({ ...value, translation_id: apadanaId(p.id), text: value.text + 'Changed' }), /differs/);
  }
  assert.deepEqual([count, globalOnly, localOnly], [475, 12, 22]);
  // Exercise the real scoped verifier for irregular global-only/local-only and
  // combined labels; full extraction above checks all 475 physical entries.
  for (const [n, pick] of [[21, s => s.local_label === '38-39'], [28, s => s.local_label === null], [28, s => s.publisher_label === null]]) {
    const p = profile(n), value = parsed(p), i = p.stanza_layout.findIndex(pick);
    assert.ok(i >= 0);
    const text = quotationText({ ...value, translation_id: apadanaId(p.id) }).split('\n\n')[i].split('\n')[0];
    const result = await verifyQuote({ text, language: 'english', texts: [p.id], translation_ids: [apadanaId(p.id)] }, {
      fetchTranslation: async (_unit, version, request) => {
        assert.equal(version, apadanaId(p.id)); assert.equal(request.translation_revision, APADANA_COMMIT); assert.equal(request.allow_fallback, false);
        return { ...fixture(n).data, ...value };
      },
    });
    assert.equal(result.verdict, 'found');
    assert.equal(result.scope.translations_checked[0].translation_revision, APADANA_COMMIT);
    assert.equal(result.comparison.verbatim, 'not_assessed');
  }
});

test('source-enabled API continuations preserve edition and apparatus while refusing changed scope before retrieval', { skip: !checkout }, async () => {
  const calls = []; pinnedFetch(calls);
  for (const n of [21, 24, 27, 28, 30]) {
    const p = profile(n), unit = canon.resolve(p.id).unit; let args = { limit: 500, translation_revision: APADANA_COMMIT }, text = '', pages = 0;
    while (args) {
      const page = await english.translation(unit, apadanaId(p.id), args);
      text += page.text; pages++;
      assert.deepEqual(page.translator_notes.map(note => note.number), p.note_numbers);
      if (n === 28) assert.deepEqual(page.publisher_divisions[0].translator_notes, []);
      if (n === 30) assert.deepEqual(page.chapter_summary.translator_notes.map(note => note.number), [43, 44]);
      args = page.continue_with?.arguments;
    }
    assert.equal(digest(text), p.body_sha256); assert.ok(pages > 1);
    const before = calls.length;
    for (const options of [{ offset: 500 }, { translation_revision: 'f'.repeat(40) }, { allow_partial: true }, { allow_shared: true }]) {
      await assert.rejects(english.translation(unit, apadanaId(p.id), options));
    }
    assert.equal(calls.length, before);
    const first = await english.translation(unit, apadanaId(p.id), { limit: 500 });
    await assert.rejects(english.translation(unit, apadanaId(p.id), { ...first.continue_with.arguments, prefix_sha256: '0'.repeat(64) }), /prefix|changed/);
  }
  const before = calls.length;
  await assert.rejects(english.translation(canon.resolve('thi-ap22').unit, apadanaId('thi-ap28')), /not linked/);
  assert.equal(calls.length, before);
});

test('all ten third-chapter metadata identities, apparatus mutants and invented-content refusal stay unconditional', () => {
  actualSource = false;
  for (let n = 21; n <= 30; n++) {
    const f = fixture(n);
    assert.equal(scopeDescriptor(f.choice, f.uid), null);
    assert.deepEqual(comparisonChoices([f.choice], f.uid), [f.choice]);
    assert.doesNotThrow(() => validateApadanaChoice(f.choice, f.uid, false));
    assert.deepEqual(translatorNotes(f.data).map(note => note.number), profile(n).note_numbers);
    assert.throws(() => validateEnglishPage(f.data, f.args, f.context), /poem-note content/);
    for (const patch of [{translation_revision: 'f'.repeat(40)}, {license: 'CC BY 4.0'}, {translation_scope: null}])
      assert.throws(() => validateApadanaChoice({...f.choice, ...patch}, f.uid, false), /pinned Apadāna/);
  }
  const f28 = fixture(28), f30 = fixture(30);
  assert.deepEqual(f28.data.publisher_divisions[0].translator_notes, []);
  validatePublisherDivisions(f28.choice, f28.uid); validatePublisherDivisions(f28.data, f28.uid, true);
  for (const division of [undefined, [], [{...f28.data.publisher_divisions[0], note_numbers: [1], translator_notes: owned([1])}], [{...f28.data.publisher_divisions[0], before_local_label: '49'}]])
    assert.throws(() => validatePublisherDivisions({...f28.data, publisher_divisions: division}, f28.uid, true), /publisher-division/);
  validateChapterSummary(f30.choice, f30.uid); validateChapterSummary(f30.data, f30.uid, true);
  for (const patch of [{parent_id: 'thi-ap20'}, {first_ref: 'thi-ap30/1'}, {root_start: 9760}, {note_numbers: [1, 2]}, {translator_notes: owned([44, 43])}, {translator_notes: owned([43])}]) {
    const changed = clone(f30.data); Object.assign(changed.chapter_summary, patch);
    assert.throws(() => validateChapterSummary(changed, f30.uid, true), /chapter-summary/);
  }
  assert.throws(() => translatorNotes({...f30.data, translator_notes: [...f30.data.translator_notes, ...f30.data.chapter_summary.translator_notes]}), /translator-note/);
  for (const [from, to, field] of [[f28, f30, 'publisher_divisions'], [f30, f28, 'chapter_summary']])
    assert.throws(() => scopeDescriptor({...to.choice, [field]: from.choice[field]}, to.uid), /owner changed/);
  const sandbox = vm.createContext({TextEncoder});
  vm.runInContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('), WIDGET_HTML.indexOf('  function render(d) {')) + ';globalThis.check=checkedApadana;', sandbox);
  for (const n of [21, 28, 30]) { const f = fixture(n); assert.equal(sandbox.check({text_id: f.uid, english: f.data}).english, null); }
});

test('source-enabled reader and comparison guards preserve all ten identities, zero-note division, summary ownership and pinned continuation', {skip: !checkout}, () => {
  actualSource = true;
  for (let n = 21; n <= 30; n++) {
    const { uid, choice, data, args, context } = fixture(n);
    assert.equal(scopeDescriptor(choice, uid), null);
    assert.deepEqual(comparisonChoices([choice], uid), [choice]);
    assert.equal(validateEnglishPage(data, args, context), null);
    assert.deepEqual(translatorNotes(data).map(note => note.number), profile(n).note_numbers);
    for (const patch of [{ translation_revision: 'f'.repeat(40) }, { license: 'CC BY 4.0' }, { publisher_paratext: n === 21 ? '' : 'Unowned preface' }, { raw_sha256: '0'.repeat(64) }, { translation_scope: null }, { source: 'ati' }]) {
      assert.throws(() => validateEnglishPage({ ...data, ...patch }, args, context), /pinned Apadāna/);
    }
    const next = { ...args, offset: 500, prefix_sha256: 'a'.repeat(64) };
    assert.deepEqual(validateEnglishPage({ ...data, next_offset: 500, continue_with: { name: 'get_translation', arguments: next } }, args, context), next);
    assert.equal(validateEnglishPage({ ...data, offset: 500, prefix_sha256: next.prefix_sha256 }, next, context), null);
    assert.throws(() => validateEnglishPage({ ...data, offset: 500, prefix_sha256: 'b'.repeat(64) }, next, context), /pinned Apadāna/);
  }
  const f28 = fixture(28), f30 = fixture(30);
  assert.deepEqual(f28.data.publisher_divisions[0].translator_notes, []);
  for (const division of [undefined, [], [{ ...f28.data.publisher_divisions[0], note_numbers: [1], translator_notes: owned([1]) }], [{ ...f28.data.publisher_divisions[0], before_local_label: '49' }]]) {
    assert.throws(() => validateEnglishPage({ ...f28.data, publisher_divisions: division }, f28.args, f28.context), /publisher-division/);
  }
  for (const patch of [{ parent_id: 'thi-ap20' }, { first_ref: 'thi-ap30/1' }, { root_start: 9760 }, { note_numbers: [1, 2] }, { translator_notes: owned([44, 43]) }, { translator_notes: owned([43]) }]) {
    const changed = clone(f30.data); Object.assign(changed.chapter_summary, patch);
    assert.throws(() => validateEnglishPage(changed, f30.args, f30.context), /chapter-summary/);
  }
  assert.throws(() => validateEnglishPage({ ...f30.data, translator_notes: [...f30.data.translator_notes, ...f30.data.chapter_summary.translator_notes] }, f30.args, f30.context), /translator-note/);
  for (const [from, to, field] of [[f28, f30, 'publisher_divisions'], [f30, f28, 'chapter_summary']]) {
    assert.throws(() => scopeDescriptor({ ...to.choice, [field]: from.choice[field] }, to.uid), /owner changed/);
  }
});

test('source-enabled current embedded reader executes third-chapter apparatus guards before rendering', {skip: !checkout}, () => {
  actualSource = true;
  assert.equal(WIDGET_URI, 'ui://pali-canon/reader-v32.html');
  const sandbox = vm.createContext({TextEncoder});
  vm.runInContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('), WIDGET_HTML.indexOf('  function render(d) {')) + ';globalThis.check=checkedApadana;', sandbox);
  for (const n of [21, 28, 30]) {
    const f = fixture(n), value = { text_id: f.uid, english: f.data };
    assert.equal(sandbox.check(value), value);
    const mutations = [{ translation_revision: 'f'.repeat(40) }, { publisher_paratext: n === 21 ? '' : 'Unowned preface' }];
    if (n === 28) mutations.push({ publisher_divisions: [] }, { publisher_divisions: [{ ...f.data.publisher_divisions[0], translator_notes: owned([1]) }] });
    if (n === 30) mutations.push({ chapter_summary: undefined }, { chapter_summary: { ...f.data.chapter_summary, translator_notes: owned([44, 43]) } });
    for (const patch of mutations) assert.equal(sandbox.check({ ...value, english: { ...f.data, ...patch } }).english, null);
  }
});

test('source-enabled widget preserves separate third-chapter apparatus and revised canonical locators', { skip: !checkout }, async () => {
  pinnedFetch([]);
  for (const n of [21, 28, 30]) {
    const p = profile(n), result = await readPassage({ uid: p.id, translation: apadanaId(p.id) });
    assert.ok(!result.english_error, result.english_error);
    assert.deepEqual(result.english.translator_notes.map(note => note.number), p.note_numbers);
    if (n === 21) assert.ok(result.english.publisher_paratext);
    if (n === 28) assert.deepEqual(result.english.publisher_divisions[0].translator_notes, []);
    if (n === 30) assert.deepEqual(result.english.chapter_summary.translator_notes.map(note => note.number), [43, 44]);
  }
  for (const n of [23, 24]) {
    const p = profile(n);
    await assert.rejects(readPassage({ uid: p.id, english: false, source_commit: canon.source().commit }), /locator revision changed/);
    const result = await readPassage({ uid: p.id, english: false, limit: 1 });
    assert.equal(result.source.locator_revision, canon.source().commit + '-apadana-theri21-30-v1');
  }
});
