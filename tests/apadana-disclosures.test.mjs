// Contract regressions for the reproduced loss of edition caveats in cached responses.
// Synthetic wording exercises rendering guards; it is not source or rights evidence.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createContext, runInContext} from 'node:vm';
import {APADANA_PROFILES, APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR} from '../src/apadana-profiles.mjs';
import {apadanaId, validateApadanaChoice, validateEnglishPage} from '../web/translation-policy.mjs';
import {validateComparisonPage} from '../web/translation-comparison.mjs';
import {WIDGET_HTML, WIDGET_VERSION} from '../src/chatgpt-widget.mjs';
import {fixture as ordinaryFixture, view} from './helpers/widget-view.mjs';

const empty = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const ownNotes = numbers => numbers.map(number => ({number, text: 'Synthetic editorial note ' + number}));
const apparatus = descriptor => ({...structuredClone(descriptor), text: 'Synthetic separately owned apparatus.', translator_notes: ownNotes(descriptor.note_numbers)});
function response(uid) {
  const p = APADANA_PROFILES[uid], choice = {
    translation_id: apadanaId(uid), translator: APADANA_TRANSLATOR, license: APADANA_LICENSE,
    translation_revision: APADANA_COMMIT, url: p.url,
  };
  for (const field of ['chapter_summary', 'collection_summary', 'publisher_preface', 'publisher_divisions']) if (p[field]) choice[field] = structuredClone(p[field]);
  const data = {
    ...structuredClone(choice), text_id: uid, source: 'apadana', fetched_url: p.raw_url, license_url: APADANA_LICENSE_URL,
    attribution: 'Synthetic attributed transport fixture', changes: 'Synthetic extraction notice',
    offset: 0, limit: 500, prefix_sha256: 'a'.repeat(64), next_offset: null, text: 'SYNTHETIC_POEM_CONTENT', publisher_paratext: p.paratext_sha256 === empty ? '' : 'SYNTHETIC_PREFACE',
    mapping_notes: [...p.mapping_notes], notes: [...p.mapping_notes],
    translator_notes: ownNotes(p.note_numbers || Array.from({length: p.note_count}, (_, i) => i + 1)),
    ...Object.fromEntries(['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'].map(key => [key, p[key]])),
  };
  for (const field of ['chapter_summary', 'collection_summary']) if (p[field]) data[field] = apparatus(p[field]);
  if (p.publisher_preface) data.publisher_preface = {...structuredClone(p.publisher_preface), translator_notes: ownNotes(p.publisher_preface.note_numbers)};
  if (p.publisher_divisions) data.publisher_divisions = p.publisher_divisions.map(apparatus);
  return {data, choice, args: {uid, translation: choice.translation_id, translation_revision: APADANA_COMMIT, limit: 500}, context: {uid, choices: [choice], accepted: null}};
}
function embeddedGuard() {
  const sandbox = createContext({});
  runInContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('), WIDGET_HTML.indexOf('  function render(d) {')) + ';globalThis.check=checkedApadana;', sandbox);
  return data => sandbox.check(data);
}

test('every reviewed profile retains all mandatory edition caveats in standalone, comparison and embedded readers', () => {
  assert.equal(WIDGET_VERSION, 'v23');
  const checked = embeddedGuard();
  for (const uid of Object.keys(APADANA_PROFILES)) {
    const f = response(uid);
    assert.ok(f.data.mapping_notes.length, uid);
    // Choice metadata need not duplicate content-level caveats: the finite local profile owns them.
    assert.equal(Object.hasOwn(f.choice, 'mapping_notes'), false);
    assert.doesNotThrow(() => validateApadanaChoice(f.choice, uid));
    assert.equal(validateEnglishPage(f.data, f.args, f.context), null);
    assert.equal(validateComparisonPage(f.data, f.args, f.context), null);
    const widget = {text_id: uid, english: f.data}; assert.equal(checked(widget), widget);
    for (const note of APADANA_PROFILES[uid].mapping_notes) {
      const data = {...f.data, notes: f.data.notes.filter(value => value !== note)};
      assert.throws(() => validateEnglishPage(data, f.args, f.context), /edition or mapping notices/);
      assert.throws(() => validateComparisonPage(data, f.args, f.context), /edition or mapping notices/);
      assert.equal(checked({text_id: uid, english: data}).english, null);
    }
    const changed = [
      {...f.data, mapping_notes: undefined}, {...f.data, mapping_notes: []},
      {...f.data, mapping_notes: ['An invented edition statement.']},
      {...f.data, mapping_notes: [...f.data.mapping_notes, 'An invented extra mapping statement.']},
      {...f.data, notes: undefined}, {...f.data, notes: []},
      {...f.data, notes: 'A non-array notice'}, {...f.data, mapping_notes: [], notes: []},
    ];
    for (const data of changed) {
      assert.throws(() => validateEnglishPage(data, f.args, f.context), /edition or mapping notices/);
      assert.throws(() => validateComparisonPage(data, f.args, f.context), /edition or mapping notices/);
      assert.equal(checked({text_id: uid, english: data}).english, null);
    }
    const extra = {...f.data, notes: ['An additional canonical citation-resolution note.', ...f.data.notes]};
    assert.equal(validateEnglishPage(extra, f.args, f.context), null);
    assert.equal(checked({text_id: uid, english: extra}).english, extra);
  }
});

test('after a valid cached display, removing either notice field clears English while keeping the Pāli in both widget bridges', () => {
  for (const bridge of ['Apps SDK', 'MCP Apps']) for (const uid of ['thi-ap1', 'tha-ap13', 'tha-ap30']) {
    const {data} = response(uid), good = {...ordinaryFixture(), text_id: uid, english: data};
    const widget = view(bridge); widget.output(good);
    assert.match(widget.elements.english.textContent, /SYNTHETIC_POEM_CONTENT/);
    for (const note of APADANA_PROFILES[uid].mapping_notes) assert.ok(widget.elements.english.textContent.includes(note));
    for (const patch of [{mapping_notes: []}, {notes: []}, {mapping_notes: [], notes: []}]) {
      widget.output({...good, english: {...data, ...patch}});
      assert.ok(!widget.elements.english.textContent.includes('SYNTHETIC_POEM_CONTENT'));
      assert.match(widget.elements.english.textContent, /No English was displayed/);
      assert.ok(widget.elements.pali.textContent.includes(good.pali.segments[0].text));
      widget.output({...good, english: structuredClone(data)});
      assert.match(widget.elements.english.textContent, /SYNTHETIC_POEM_CONTENT/);
    }
  }
});
