import {CURRENT_APADANA_IDS,BASELINE_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
// Contract regressions for the reproduced loss of edition caveats in cached responses.
// Synthetic wording exercises rendering guards; it is not source or rights evidence.
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
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
  const sandbox = createContext({TextEncoder});
  runInContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('), WIDGET_HTML.indexOf('  function render(d) {')) + ';globalThis.check=checkedApadana;', sandbox);
  return data => sandbox.check(data);
}

test('all152 historical metadata and caveat contracts remain unconditional while invented poem-note content refuses', () => {
  assert.equal(WIDGET_VERSION, 'v42');
  const checked = embeddedGuard();
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  // Preserve the exact historical metadata cohort. Content must now contain
  // original poem notes; fabricated note arrays are explicit negative controls.
  // Actual source positives and cached caveat-removal cases for all206 preceding
  // owners live in thera-cached-poem-notes.test.mjs, without synthetic hybrids.
  const oldExactContentIds=['tha-ap44','tha-ap63','tha-ap73','tha-ap76','tha-ap82','tha-ap83','tha-ap92','tha-ap93','tha-ap102','tha-ap103','tha-ap112','tha-ap113','tha-ap122','tha-ap123','tha-ap132','tha-ap133'];
  const newExactContentIds=['tha-ap143','tha-ap153','tha-ap163','tha-ap173','tha-ap152','tha-ap162','tha-ap172','tha-ap182'];
  const current=JSON.parse(readFileSync(new URL('../docs/evidence/apadana/THERA_141_180_APPROVAL.json',import.meta.url),'utf8'));
  assert.equal(current.status,'approved');
  const newSourceOnlyIds=current.approved_ids;
  assert.equal(newSourceOnlyIds.length,38);
  assert.ok(newExactContentIds.every(uid=>newSourceOnlyIds.includes(uid)),'All 8 new preface/summary owners remain source-backed');
  const historical=JSON.parse(readFileSync(new URL('../docs/evidence/apadana/THERA_PAIR_INTAKE_APPROVAL.json',import.meta.url),'utf8'));
  const oldIds=historical.expected_profile_ids;
  assert.equal(oldIds.length,168);assert.deepEqual(CURRENT_APADANA_IDS.slice(0,168),oldIds);
  const oldSyntheticIds=oldIds.filter(uid=>!oldExactContentIds.includes(uid));
  assert.equal(oldExactContentIds.length,16);assert.equal(oldSyntheticIds.length,152);
  const syntheticIds = oldSyntheticIds;
  assert.deepEqual(syntheticIds.filter(uid=>oldIds.includes(uid)),oldSyntheticIds,'Every prior 152 positive fixture retains its exact identity and order');
  assert.ok(newSourceOnlyIds.every(uid=>!oldIds.includes(uid)&&CURRENT_APADANA_IDS.includes(uid)),'Exactly 38 new owners require source-backed positive fixtures');
  assert.equal(syntheticIds.filter(uid=>!oldIds.includes(uid)).length,0);
  assert.equal(syntheticIds.length,152);
  assert.deepEqual(CURRENT_APADANA_IDS.slice(0,206),current.expected_profile_ids);
  assert.equal(BASELINE_APADANA_IDS.length,89);
  assert.ok(BASELINE_APADANA_IDS.every(uid=>syntheticIds.includes(uid)),'all89 preceding positive fixtures retain their original coverage');
  for (const uid of syntheticIds) {
    const f = response(uid);
    assert.ok(f.data.mapping_notes.length, uid);
    // Choice metadata need not duplicate content-level caveats: the finite local profile owns them.
    assert.equal(Object.hasOwn(f.choice, 'mapping_notes'), false);
    assert.doesNotThrow(() => validateApadanaChoice(f.choice, uid));
    if (f.data.translator_notes.length) {
      assert.throws(() => validateEnglishPage(f.data, f.args, f.context), /poem-note content/);
      assert.throws(() => validateComparisonPage(f.data, f.args, f.context), /poem-note content/);
      assert.equal(checked({text_id: uid, english: f.data}).english, null);
    } else {
      // Correct [] is the original empty note set, not fabricated source notes.
      assert.equal(validateEnglishPage(f.data, f.args, f.context), null);
      assert.equal(validateComparisonPage(f.data, f.args, f.context), null);
      const widget={text_id: uid, english:f.data};assert.equal(checked(widget),widget);
    }
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
    if(f.data.translator_notes.length){
      assert.throws(()=>validateEnglishPage(extra,f.args,f.context),/poem-note content/);
      assert.equal(checked({text_id:uid,english:extra}).english,null);
    }else{
      assert.equal(validateEnglishPage(extra,f.args,f.context),null);
      assert.equal(checked({text_id:uid,english:extra}).english,extra);
    }
  }
});

test('invented cached poem-note content never renders, while empty-note scopes retain caveat refusal and Pāli', () => {
  for (const bridge of ['Apps SDK', 'MCP Apps']) for (const uid of ['thi-ap1', 'tha-ap13', 'tha-ap30']) {
    const {data} = response(uid), candidate = {...ordinaryFixture(), text_id: uid, english: data};
    const widget = view(bridge); widget.output(candidate);
    if (data.translator_notes.length) {
      assert.doesNotMatch(widget.elements.english.textContent, /SYNTHETIC_POEM_CONTENT/);
      assert.match(widget.elements.english.textContent, /No English was displayed/);
    } else {
      assert.match(widget.elements.english.textContent, /SYNTHETIC_POEM_CONTENT/);
      for (const note of APADANA_PROFILES[uid].mapping_notes) assert.ok(widget.elements.english.textContent.includes(note));
    }
    for (const patch of [{mapping_notes: []}, {notes: []}, {mapping_notes: [], notes: []}]) {
      widget.output({...candidate, english: {...data, ...patch}});
      assert.doesNotMatch(widget.elements.english.textContent, /SYNTHETIC_POEM_CONTENT/);
      assert.match(widget.elements.english.textContent, /No English was displayed/);
      assert.ok(widget.elements.pali.textContent.includes(candidate.pali.segments[0].text));
      widget.output({...candidate, english: structuredClone(data)});
      assert.equal(widget.elements.english.textContent.includes('SYNTHETIC_POEM_CONTENT'), data.translator_notes.length === 0);
    }
  }
});
