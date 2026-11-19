import test from 'node:test';
import assert from 'node:assert/strict';
import { APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR, APADANA_PROFILES } from '../src/apadana-profiles.mjs';
import { translatorNotes } from '../web/milinda-sources.mjs';
import { apadanaId, scopeDescriptor, validateChapterSummary, validatePublisherDivisions, validateEnglishPage } from '../web/translation-policy.mjs';
import { comparisonChoices } from '../web/translation-comparison.mjs';

const clone = value => structuredClone(value);
const emptySha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const owned = numbers => numbers.map(number => ({number, text: 'Synthetic editorial note ' + number}));
const withContent = descriptor => ({...clone(descriptor), text: 'Synthetic separately owned text', translator_notes: owned(descriptor.note_numbers)});
function fixture(n) {
  const uid = 'thi-ap' + n, p = APADANA_PROFILES[uid];
  const choice = {translation_id: apadanaId(uid), translator: APADANA_TRANSLATOR, license: APADANA_LICENSE, translation_revision: APADANA_COMMIT, url: p.url};
  if (p.chapter_summary) choice.chapter_summary = clone(p.chapter_summary);
  if (p.publisher_divisions) choice.publisher_divisions = clone(p.publisher_divisions);
  const args = {uid, translation: choice.translation_id, translation_revision: APADANA_COMMIT, limit: 500};
  const data = {...clone(choice), ...Object.fromEntries(['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'].map(key => [key, p[key]])),
    text_id: uid, source: 'apadana', offset: 0, limit: 500, text: 'Synthetic poem text, never a source artifact.', attribution: 'Synthetic attribution', changes: 'Synthetic extraction notice',
    fetched_url: p.raw_url, license_url: APADANA_LICENSE_URL, publisher_paratext: p.paratext_sha256 === emptySha ? '' : 'Synthetic publisher preface',
    translator_notes: owned(p.note_numbers || Array.from({length: p.note_count}, (_, i) => i + 1)), next_offset: null};
  if (p.chapter_summary) data.chapter_summary = withContent(p.chapter_summary);
  if (p.publisher_divisions) data.publisher_divisions = p.publisher_divisions.map(withContent);
  return {uid, choice, args, data, context: {uid, choices: [choice], accepted: null}};
}

test('all twenty exact poem choices and pages retain finite metadata in individual and comparison access', () => {
  for (let n = 1; n <= 20; n++) {
    const {uid, choice, args, data, context} = fixture(n);
    assert.equal(scopeDescriptor(choice, uid), null, uid);
    assert.deepEqual(comparisonChoices([choice], uid), [choice]);
    assert.equal(validateEnglishPage(data, args, context), null, uid);
    assert.deepEqual(translatorNotes(data), data.translator_notes);
  }
});

test('publisher prefaces follow pinned presence for poems1 and11 only', () => {
  for (let n = 1; n <= 20; n++) {
    const {data, args, context} = fixture(n);
    const expected = n === 1 || n === 11;
    assert.equal(Boolean(data.publisher_paratext), expected);
    assert.throws(() => validateEnglishPage({...data, publisher_paratext: expected ? '' : 'Unowned preface'}, args, context), /pinned Apadāna/);
  }
});

test('large poem notes preserve finite sparse source numbering and exclude recitation note21', () => {
  for (const [n, count] of [[17, 119], [18, 82], [19, 85]]) {
    const {data, args, context} = fixture(n);
    assert.equal(translatorNotes(data).length, count);
    for (const mutate of [
      notes => notes.pop(), notes => notes.push({number: 121, text: 'Foreign note'}),
      notes => notes.reverse(), notes => { notes[0].number = 2; },
      notes => { notes[0].text = ' '; }, notes => { notes[0].text = 'x'.repeat(50001); },
      notes => { notes[0].extra = true; }, notes => { notes[0] = ['Synthetic']; },
    ]) {
      const changed = clone(data); mutate(changed.translator_notes);
      assert.throws(() => validateEnglishPage(changed, args, context), /translator-note/);
    }
  }
  const {data} = fixture(17), notes = translatorNotes(data);
  assert.equal(notes[19].number, 20); assert.equal(notes[20].number, 22); assert.equal(notes.at(-1).number, 120);
  assert.equal(notes.some(n => n.number === 21), false);
  const changed = clone(data); changed.translator_notes[20].number = 21;
  assert.throws(() => translatorNotes(changed), /translator-note/);
});

test('large/sparse note permission belongs only to exact known poem IDs; generic max32 remains', () => {
  const {data} = fixture(17);
  for (const translation_id of ['ap:chapter-4/poem-017/', 'AP:chapter-4/poem-017', 'ap:chapter-4/poem-017?copy', 'ap:chapter-4/poem-999', 'dt:MN/MN1', 'ati:/tipitaka/kn/miln/example']) {
    assert.throws(() => translatorNotes({...data, translation_id}), /translator-note/);
  }
  assert.equal(translatorNotes({translation_id: 'dt:MN/MN1', translator_notes: owned(Array.from({length: 32}, (_, i) => i + 1))}).length, 32);
  assert.throws(() => translatorNotes({translation_id: 'dt:MN/MN1', translator_notes: owned(Array.from({length: 33}, (_, i) => i + 1))}), /translator-note/);
  assert.throws(() => translatorNotes({translation_id: data.translation_id}), /missing/);
  assert.throws(() => translatorNotes({...fixture(1).data, translator_notes: []}), /translator-note/);
});

test('poem17 publisher division has exact descriptor and separately owned note21', () => {
  const {uid, choice, data, args, context} = fixture(17);
  validatePublisherDivisions(choice, uid); validatePublisherDivisions(data, uid, true);
  assert.deepEqual(data.publisher_divisions[0].translator_notes.map(n => n.number), [21]);
  for (const mutate of [
    value => { delete value.publisher_divisions; }, value => { value.publisher_divisions = null; },
    value => { value.publisher_divisions = []; }, value => { value.publisher_divisions.push(clone(value.publisher_divisions[0])); },
    value => { value.publisher_divisions[0].before_local_label = '21'; },
    value => { value.publisher_divisions[0].before_publisher_label = '247'; },
    value => { value.publisher_divisions[0].body_sha256 = 'f'.repeat(64); },
    value => { value.publisher_divisions[0].notes_sha256 = 'f'.repeat(64); },
    value => { value.publisher_divisions[0].note_numbers = [22]; },
    value => { value.publisher_divisions[0].kind = 'canonical_chapter_summary'; },
    value => { value.publisher_divisions[0].extra = true; },
  ]) {
    const page = clone(data); mutate(page);
    assert.throws(() => validateEnglishPage(page, args, context), /publisher-division/);
    const source = clone(choice); mutate(source);
    assert.throws(() => scopeDescriptor(source, uid), /publisher-division/);
  }
  for (const patch of [{text: ''}, {text: 'x'.repeat(50001)}, {translator_notes: []}, {translator_notes: [{number: 22, text: 'Foreign poem note'}]}, {translator_notes: [{number: 21, text: 'Note', extra: true}]}, {translator_notes: [{number: 21, text: 'x'.repeat(50001)}]}]) {
    const changed = clone(data); Object.assign(changed.publisher_divisions[0], patch);
    assert.throws(() => validateEnglishPage(changed, args, context), /publisher-division/);
  }
  assert.throws(() => scopeDescriptor({...choice, publisher_divisions: data.publisher_divisions}, uid), /publisher-division/);
  for (const n of [1, 10, 11, 18, 20]) {
    const other = fixture(n);
    assert.throws(() => scopeDescriptor({...other.choice, publisher_divisions: choice.publisher_divisions}, other.uid), /owner changed/);
    assert.throws(() => validateEnglishPage({...other.data, publisher_divisions: data.publisher_divisions}, other.args, other.context), /owner changed/);
  }
});

test('both chapter summaries preserve their original parent refs and own note8 or27', () => {
  for (const [n, number] of [[10, 8], [20, 27]]) {
    const {uid, choice, data, args, context} = fixture(n);
    validateChapterSummary(choice, uid); validateChapterSummary(data, uid, true);
    assert.deepEqual(data.chapter_summary.translator_notes.map(n => n.number), [number]);
    for (const patch of [
      {parent_id: 'thi-ap' + (n === 10 ? 20 : 10)}, {first_ref: uid + '/1'}, {root_start: 0}, {root_end: 1},
      {note_numbers: [number === 8 ? 27 : 8]}, {translator_notes: [{number: number === 8 ? 27 : 8, text: 'Reassigned'}]},
      {translator_notes: [{number, text: 'Note', extra: true}]}, {translator_notes: [{number, text: ''}]}, {unexpected: true},
    ]) {
      const changed = clone(data); Object.assign(changed.chapter_summary, patch);
      assert.throws(() => validateEnglishPage(changed, args, context), /chapter-summary/);
    }
    assert.throws(() => scopeDescriptor({...choice, chapter_summary: data.chapter_summary}, uid), /chapter-summary/);
    assert.throws(() => validateEnglishPage({...data, chapter_summary: undefined}, args, context), /chapter-summary/);
  }
});

test('ordinary providers cannot introduce even empty Apadāna division metadata', () => {
  const ordinary = {translation_id: 'dt:MN/MN1', translator: 'Synthetic translator', license: 'Synthetic terms', url: 'https://www.dhammatalks.org/suttas/MN/MN1.html'};
  for (const publisher_divisions of [undefined, null, [], fixture(17).choice.publisher_divisions]) {
    assert.throws(() => scopeDescriptor({...ordinary, publisher_divisions}, 'mn1'), /pinned Apadāna/);
    const response = {...ordinary, text_id: 'mn1', offset: 0, text: 'Synthetic text', attribution: 'Synthetic attribution', publisher_divisions};
    assert.throws(() => validateEnglishPage(response, {uid: 'mn1', translation: ordinary.translation_id}, {uid: 'mn1', choices: [ordinary], accepted: null}), /pinned Apadāna/);
  }
});

test('continuation keeps exact edition identity and revalidates summary/division ownership', () => {
  for (const n of [1, 10, 11, 17, 18, 19, 20]) {
    const {data, args, context} = fixture(n);
    const next = {...args, offset: 500, prefix_sha256: 'a'.repeat(64)};
    const first = {...data, next_offset: 500, continue_with: {name: 'get_translation', arguments: next}};
    assert.deepEqual(validateEnglishPage(first, args, context), next);
    assert.equal(validateEnglishPage({...data, offset: 500, prefix_sha256: next.prefix_sha256}, next, context), null);
    for (const patch of [{translation_revision: undefined}, {translation_revision: 'f'.repeat(40)}, {translation: fixture(n === 17 ? 18 : 17).data.translation_id}, {prefix_sha256: ''}]) {
      assert.throws(() => validateEnglishPage({...first, continue_with: {name: 'get_translation', arguments: {...next, ...patch}}}, args, context));
    }
    assert.throws(() => validateEnglishPage({...data, offset: 500, prefix_sha256: 'b'.repeat(64)}, next, context), /pinned Apadāna/);
    if (data.publisher_divisions) assert.throws(() => validateEnglishPage({...data, offset: 500, prefix_sha256: next.prefix_sha256, publisher_divisions: []}, next, context), /publisher-division/);
    if (data.chapter_summary) assert.throws(() => validateEnglishPage({...data, offset: 500, prefix_sha256: next.prefix_sha256, chapter_summary: fixture(n === 10 ? 20 : 10).data.chapter_summary}, next, context), /chapter-summary/);
  }
});
