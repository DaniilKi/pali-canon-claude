// Synthetic transport/render fixtures use real finite profile metadata, never source wording.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext, runInContext, runInNewContext} from 'node:vm';
import {APADANA_COMMIT, APADANA_LICENSE, APADANA_LICENSE_URL, APADANA_TRANSLATOR, APADANA_PROFILES} from '../src/apadana-profiles.mjs';
import {parseApadana, digest} from '../src/apadana.mjs';
import {apadanaId, validateApadanaChoice, validateChapterSummary, scopeDescriptor, validateEnglishPage, validatePublisherPreface, validateCollectionSummary} from '../web/translation-policy.mjs';
import {comparisonChoices, validateComparisonPage} from '../web/translation-comparison.mjs';
import {translatorNotes} from '../web/milinda-sources.mjs';
import {WIDGET_HTML, WIDGET_VERSION} from '../src/chatgpt-widget.mjs';

const clone = value => structuredClone(value);
const emptySha = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const apparatus = ['publisher_preface', 'collection_summary', 'chapter_summary', 'publisher_divisions'];
const owned = numbers => numbers.map(number => ({number, text: 'SYNTHETIC_EDITORIAL_NOTE_' + number}));
const content = scope => ({...clone(scope), text: 'SYNTHETIC_SEPARATE_' + scope.kind, translator_notes: owned(scope.note_numbers)});
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
let actualSource = false;
function sourceTest(name, fn) { test('source-backed ' + name, {skip: !checkout}, async () => { actualSource = true; try { await fn(); } finally { actualSource = false; } }); }
function fixture(n) {
  const uid = 'thi-ap' + n, p = APADANA_PROFILES[uid];
  assert.ok(p, 'The independently approved finite profile must exist: ' + uid);
  const choice = {translation_id: apadanaId(uid), translator: APADANA_TRANSLATOR, license: APADANA_LICENSE, translation_revision: APADANA_COMMIT, url: p.url};
  for (const field of apparatus) if (p[field]) choice[field] = clone(p[field]);
  const args = {uid, translation: choice.translation_id, translation_revision: APADANA_COMMIT, limit: 500};
  const data = {...clone(choice), ...Object.fromEntries(['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'].map(key => [key, p[key]])),
    text_id: uid, source: 'apadana', offset: 0, limit: 500, text: 'SYNTHETIC_POEM_' + n, attribution: 'Synthetic attribution', changes: 'Synthetic extraction notice',
    fetched_url: p.raw_url, license_url: APADANA_LICENSE_URL, publisher_paratext: p.paratext_sha256 === emptySha ? '' : 'SYNTHETIC_PREFACE_WORDING_' + n,
    translator_notes: owned(p.note_numbers || Array.from({length: p.note_count}, (_, i) => i + 1)), mapping_notes: [...p.mapping_notes], notes: [...p.mapping_notes], prefix_sha256: 'a'.repeat(64), next_offset: null};
  for (const field of ['chapter_summary', 'collection_summary']) if (p[field]) data[field] = content(p[field]);
  if (p.publisher_preface) data.publisher_preface = {...clone(p.publisher_preface), translator_notes: owned(p.publisher_preface.note_numbers)};
  if (p.publisher_divisions) data.publisher_divisions = p.publisher_divisions.map(content);
  if (actualSource) {
    Object.assign(data, parseApadana(readFileSync(`${checkout}/src/_poems/chapter-4/poem-${String(p.poem).padStart(3, '0')}.md`, 'utf8'), p));
    // These complete source poems fit the API's largest permitted page.
    args.limit = data.limit = 30000; data.prefix_sha256 = digest('');
    assert.ok(data.text.length <= data.limit);
  }
  return {uid, choice, data, args, context: {uid, choices: [choice], accepted: null}};
}
const checked = () => {
  const sandbox = createContext({TextEncoder});
  runInContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('), WIDGET_HTML.indexOf('  function render(d) {')) + ';globalThis.check=checkedApadana;', sandbox);
  return data => sandbox.check(data);
};

test('all forty finite choices preserve exact apparatus in individual, comparison and embedded validation', () => {
  assert.equal(WIDGET_VERSION, 'v29');
  const check = checked();
  for (let n = 1; n <= 40; n++) {
    const f = fixture(n);
    assert.equal(scopeDescriptor(f.choice, f.uid), null);
    assert.deepEqual(comparisonChoices([f.choice], f.uid), [f.choice]);
    assert.doesNotThrow(() => validateApadanaChoice(f.choice, f.uid, false));
    assert.throws(() => validateEnglishPage(f.data, f.args, f.context), /poem-note content/);
    assert.throws(() => validateComparisonPage(f.data, f.args, f.context), /poem-note content/);
    assert.deepEqual(translatorNotes(f.data), f.data.translator_notes);
    const value = {text_id: f.uid, english: f.data};
    assert.equal(check(value).english, null, f.uid);
  }
});

test('poem31 preface is six metadata fields plus only its separately owned note1 at runtime', () => {
  const f = fixture(31), p = APADANA_PROFILES[f.uid];
  assert.deepEqual(Object.keys(p.publisher_preface).sort(), ['body_sha256', 'kind', 'label', 'note_numbers', 'notes_sha256', 'parent_id']);
  assert.equal(p.publisher_preface.body_sha256, p.paratext_sha256);
  assert.equal(p.publisher_preface.parent_id, f.uid);
  assert.deepEqual(p.publisher_preface.note_numbers, [1]);
  assert.deepEqual(f.data.translator_notes.map(note => note.number), Array.from({length: 17}, (_, i) => i + 2));
  validatePublisherPreface(f.choice, f.uid);
  validatePublisherPreface(f.data, f.uid, true);
  assert.equal(Object.hasOwn(f.data.publisher_preface, 'text'), false);
  const patches = [undefined, null, [], {...f.choice.publisher_preface, text: f.data.publisher_paratext}, {...f.choice.publisher_preface, translator_notes: []},
    {...f.choice.publisher_preface, parent_id: 'thi-ap21'}, {...f.choice.publisher_preface, kind: 'canonical_chapter_summary'},
    {...f.choice.publisher_preface, body_sha256: '0'.repeat(64)}, {...f.choice.publisher_preface, notes_sha256: '0'.repeat(64)},
    {...f.choice.publisher_preface, label: 'Invented preface'}, {...f.choice.publisher_preface, note_numbers: [2]}, {...f.choice.publisher_preface, extra: true}];
  for (const publisher_preface of patches) {
    assert.throws(() => scopeDescriptor({...f.choice, publisher_preface}, f.uid), /publisher-preface/);
    assert.throws(() => comparisonChoices([{...f.choice, publisher_preface}], f.uid), /publisher-preface/);
  }
  const check = checked();
  for (const patch of [{text: f.data.publisher_paratext}, {translator_notes: undefined}, {translator_notes: []}, {translator_notes: owned([2])},
    {translator_notes: owned([1, 2])}, {translator_notes: [{number: 1, text: ' '}]}, {translator_notes: [{number: 1, text: 'x'.repeat(50001)}]},
    {translator_notes: [{number: 1, text: 'Synthetic', extra: true}]}, {body_sha256: '0'.repeat(64)}, {parent_id: 'thi-ap32'}, {note_numbers: [2]}, {extra: true}]) {
    const data = {...f.data, publisher_preface: {...f.data.publisher_preface, ...patch}};
    assert.throws(() => validatePublisherPreface(data, f.uid, true), /publisher-preface/);
    assert.equal(check({text_id: f.uid, english: data}).english, null);
  }
  for (const publisher_paratext of ['', 'x'.repeat(50001)]) assert.throws(() => validateEnglishPage({...f.data, publisher_paratext}, f.args, f.context), /pinned Apadāna/);
  assert.throws(() => validateEnglishPage({...f.data, translator_notes: owned(Array.from({length: 18}, (_, i) => i + 1))}, f.args, f.context), /translator-note/);
});

test('poem40 poem, chapter and collection notes stay three distinct finite owners', () => {
  const f = fixture(40);
  assert.deepEqual(f.data.translator_notes.map(note => note.number), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(f.data.chapter_summary.translator_notes.map(note => note.number), [8, 9, 10]);
  assert.deepEqual(f.data.collection_summary.translator_notes.map(note => note.number), [11, 12]);
  validateCollectionSummary(f.choice, f.uid); validateCollectionSummary(f.data, f.uid, true);
  const check = checked();
  for (const patch of [{parent_id: 'thi-ap30'}, {kind: 'canonical_chapter_summary'}, {label: 'Invented summary'}, {first_ref: 'thi-ap40/1'},
    {last_ref: 'thi-ap40/1'}, {root_start: 0}, {root_end: 1}, {root_sha256: '0'.repeat(64)}, {body_sha256: '0'.repeat(64)},
    {notes_sha256: '0'.repeat(64)}, {note_numbers: [8, 9]}, {text: ''}, {text: 'x'.repeat(50001)}, {translator_notes: owned([12, 11])},
    {translator_notes: owned([11])}, {translator_notes: owned([8, 9, 10])}, {translator_notes: [{number: 11, text: 'x'.repeat(50001)}, {number: 12, text: 'Synthetic'}]}, {extra: true}]) {
    const data = {...f.data, collection_summary: {...f.data.collection_summary, ...patch}};
    assert.throws(() => validateCollectionSummary(data, f.uid, true), /collection-summary/);
    assert.equal(check({text_id: f.uid, english: data}).english, null);
  }
  for (const collection_summary of [undefined, null, [], {...f.choice.collection_summary, text: 'Runtime text in metadata'}]) {
    assert.throws(() => scopeDescriptor({...f.choice, collection_summary}, f.uid), /collection-summary/);
    assert.throws(() => comparisonChoices([{...f.choice, collection_summary}], f.uid), /collection-summary/);
  }
  assert.throws(() => validateChapterSummary({...f.data, chapter_summary: f.data.collection_summary}, f.uid, true), /chapter-summary/);
  assert.throws(() => validateEnglishPage({...f.data, translator_notes: [...f.data.translator_notes, ...f.data.collection_summary.translator_notes]}, f.args, f.context), /translator-note/);
});

test('new apparatus fields reject every old/foreign owner and even empty ordinary-provider declarations', () => {
  const preface = fixture(31), collection = fixture(40), check = checked();
  for (let n = 1; n <= 40; n++) {
    const f = fixture(n);
    for (const [field, descriptor, owner] of [['publisher_preface', preface.choice.publisher_preface, 31], ['collection_summary', collection.choice.collection_summary, 40]]) {
      if (n === owner) continue;
      assert.equal(Object.hasOwn(f.choice, field), false);
      for (const value of [undefined, null, descriptor]) {
        assert.throws(() => scopeDescriptor({...f.choice, [field]: value}, f.uid), /owner changed/);
        assert.throws(() => comparisonChoices([{...f.choice, [field]: value}], f.uid), /owner changed/);
        const data = {...f.data, [field]: value};
        assert.throws(() => (field === 'publisher_preface' ? validatePublisherPreface : validateCollectionSummary)(data, f.uid, true), /owner changed/);
        assert.equal(check({text_id: f.uid, english: data}).english, null);
      }
    }
  }
  const ordinary = {translation_id: 'dt:MN/MN1', translator: 'Synthetic translator', license: 'Synthetic terms', url: 'https://www.dhammatalks.org/suttas/MN/MN1.html'};
  for (const field of ['publisher_preface', 'collection_summary']) for (const value of [undefined, null, {}]) {
    const choice = {...ordinary, [field]: value}, data = {...choice, text_id: 'mn1', offset: 0, text: 'Synthetic ordinary source', attribution: 'Synthetic attribution'};
    assert.throws(() => scopeDescriptor(choice, 'mn1'), /pinned Apadāna/);
    assert.throws(() => comparisonChoices([choice], 'mn1'), /pinned Apadāna/);
    assert.throws(() => validateEnglishPage(data, {uid: 'mn1', translation: ordinary.translation_id}, {uid: 'mn1', choices: [ordinary], accepted: null}), /pinned Apadāna/);
    assert.equal(check({text_id: 'mn1', english: data}).english, null);
  }
  assert.equal(Object.hasOwn(APADANA_PROFILES['thi-ap35'], 'publisher_divisions'), false, 'No publisher recitation division is invented for omitted VRI paratext');
});

test('continuation owners retain unconditional pinned metadata identity', () => {
  for (const n of [31, 40]) {
    const f = fixture(n);
    assert.doesNotThrow(() => validateApadanaChoice(f.choice, f.uid, false));
    assert.throws(() => validateApadanaChoice({...f.choice, translation_revision: 'f'.repeat(40)}, f.uid, false), /pinned Apadāna/);
    const field = n === 31 ? 'publisher_preface' : 'collection_summary';
    assert.throws(() => scopeDescriptor({...f.choice, [field]: undefined}, f.uid), /scope or note ownership/);
  }
});

class Element {
  constructor(tag = '') { this.tagName = tag; this.children = []; this._text = ''; this.value = ''; this.attributes = {}; this.listeners = {}; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  get firstChild() { return this.children[0]; } get lastChild() { return this.children.at(-1); }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  removeChild(child) { this.children.splice(this.children.indexOf(child), 1); return child; }
  insertBefore(child, before) { this.children.splice(this.children.indexOf(before), 0, child); return child; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
}
const elements = node => [node, ...node.children.flatMap(elements)];
function embedded(data) {
  const nodes = Object.fromEntries(['title', 'meta', 'pali', 'english', 'footer', 'status', 'navigation', 'context-status', 'link-status'].map(id => [id, new Element()]));
  const parent = {postMessage() {}};
  const window = {parent, openai: {toolOutput: {text_id: data.text_id, citation: 'Synthetic passage', title: 'Synthetic title', notes: [], links: {}, pali: {segments: [{type: 'prose', text: 'Synthetic Pāli fixture'}], offset: 0, total_segments: 1, returned: 1, next_offset: null}, english: data}, theme: 'light'}, addEventListener() {}};
  const document = {documentElement: new Element('html'), getElementById: id => nodes[id], createElement: tag => new Element(tag), createTextNode: text => {const node = new Element(); node.textContent = text; return node;}};
  runInNewContext(WIDGET_HTML.match(/<script>([^]*?)<\/script>/)[1], {window, document, Date, TextEncoder}, {timeout: 1000});
  return nodes.english;
}
function standalone(data) {
  const source = readFileSync(new URL('../web/reader.js', import.meta.url), 'utf8');
  const code = source.slice(source.indexOf('function publisherParatext('), source.indexOf('function publisherDivisions('));
  const sandbox = createContext({el(tag, text, className) {const node = new Element(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node;}});
  runInContext(code + ';globalThis.appendScopes=(data,target)=>{publisherParatext(data,target,4);chapterSummary(data,target,4);collectionSummary(data,target,4);};', sandbox);
  const target = new Element('div'); sandbox.appendScopes(data, target); return target;
}

test('standalone and complete embedded scripts render preface wording once and keep collection/chapter notes in sibling accessible sections', () => {
  for (const render of [standalone]) {
    const first = fixture(31), preface = render(first.data), scopes = elements(preface);
    const prefaceScope = scopes.find(node => node.attributes['aria-label'] === 'Publisher preface · editorial, not poem text');
    assert.ok(prefaceScope);
    assert.match(prefaceScope.textContent, /Fourth Therī chapter preface · editorial, not poem text/);
    assert.match(prefaceScope.textContent, /Preface notes · editorial, not poem notes/);
    assert.equal(scopes.filter(node => node.tagName === 'p' && node.textContent === first.data.publisher_paratext).length, 1);
    assert.deepEqual(elements(prefaceScope).filter(node => node.tagName === 'li').map(node => node.value), [1]);
    const last = fixture(40), summary = render(last.data), chapter = summary.children.find(node => node.attributes['aria-label'] === 'Canonical chapter summary · not poem text'), collection = summary.children.find(node => node.attributes['aria-label'] === 'Canonical collection summary · not poem text');
    assert.ok(chapter); assert.ok(collection);
    assert.match(chapter.textContent, /Original summary counts and titles are preserved; they are not a measure of indexed translation coverage\./);
    assert.doesNotMatch(chapter.textContent, /ordering and stanza count differ from VRI/);
    assert.deepEqual(elements(chapter).filter(node => node.tagName === 'li').map(node => node.value), [8, 9, 10]);
    assert.deepEqual(elements(collection).filter(node => node.tagName === 'li').map(node => node.value), [11, 12]);
    assert.match(collection.textContent, /Collection summary notes · editorial, not poem notes/);
    assert.ok(!elements(chapter).includes(collection)); assert.ok(!elements(collection).includes(chapter));
    assert.equal(elements(summary).filter(node => node.tagName === 'p' && node.textContent === last.data.collection_summary.text).length, 1);
    assert.equal(last.data.text.includes(last.data.collection_summary.text), false);
  }
});

// Original full-page, comparison and embedded assertions replay unchanged only
// after parsing the exact registered raw artifact; synthetic notes never pass.
sourceTest('all forty finite choices preserve exact apparatus in individual, comparison and embedded validation', () => {
  assert.equal(WIDGET_VERSION, 'v29');
  const check = checked();
  for (let n = 1; n <= 40; n++) {
    const f = fixture(n);
    assert.equal(scopeDescriptor(f.choice, f.uid), null);
    assert.deepEqual(comparisonChoices([f.choice], f.uid), [f.choice]);
    assert.equal(validateEnglishPage(f.data, f.args, f.context), null);
    assert.equal(validateComparisonPage(f.data, f.args, f.context), null);
    assert.deepEqual(translatorNotes(f.data), f.data.translator_notes);
    const value = {text_id: f.uid, english: f.data};
    assert.equal(check(value), value, f.uid);
  }
});

sourceTest('poem31 preface is six metadata fields plus only its separately owned note1 at runtime', () => {
  const f = fixture(31), p = APADANA_PROFILES[f.uid];
  assert.deepEqual(Object.keys(p.publisher_preface).sort(), ['body_sha256', 'kind', 'label', 'note_numbers', 'notes_sha256', 'parent_id']);
  assert.equal(p.publisher_preface.body_sha256, p.paratext_sha256);
  assert.equal(p.publisher_preface.parent_id, f.uid);
  assert.deepEqual(p.publisher_preface.note_numbers, [1]);
  assert.deepEqual(f.data.translator_notes.map(note => note.number), Array.from({length: 17}, (_, i) => i + 2));
  validatePublisherPreface(f.choice, f.uid);
  validatePublisherPreface(f.data, f.uid, true);
  assert.equal(Object.hasOwn(f.data.publisher_preface, 'text'), false);
  const patches = [undefined, null, [], {...f.choice.publisher_preface, text: f.data.publisher_paratext}, {...f.choice.publisher_preface, translator_notes: []},
    {...f.choice.publisher_preface, parent_id: 'thi-ap21'}, {...f.choice.publisher_preface, kind: 'canonical_chapter_summary'},
    {...f.choice.publisher_preface, body_sha256: '0'.repeat(64)}, {...f.choice.publisher_preface, notes_sha256: '0'.repeat(64)},
    {...f.choice.publisher_preface, label: 'Invented preface'}, {...f.choice.publisher_preface, note_numbers: [2]}, {...f.choice.publisher_preface, extra: true}];
  for (const publisher_preface of patches) {
    assert.throws(() => scopeDescriptor({...f.choice, publisher_preface}, f.uid), /publisher-preface/);
    assert.throws(() => comparisonChoices([{...f.choice, publisher_preface}], f.uid), /publisher-preface/);
  }
  const check = checked();
  for (const patch of [{text: f.data.publisher_paratext}, {translator_notes: undefined}, {translator_notes: []}, {translator_notes: owned([2])},
    {translator_notes: owned([1, 2])}, {translator_notes: [{number: 1, text: ' '}]}, {translator_notes: [{number: 1, text: 'x'.repeat(50001)}]},
    {translator_notes: [{number: 1, text: 'Synthetic', extra: true}]}, {body_sha256: '0'.repeat(64)}, {parent_id: 'thi-ap32'}, {note_numbers: [2]}, {extra: true}]) {
    const data = {...f.data, publisher_preface: {...f.data.publisher_preface, ...patch}};
    assert.throws(() => validateEnglishPage(data, f.args, f.context), /publisher-preface/);
    assert.throws(() => validateComparisonPage(data, f.args, f.context), /publisher-preface/);
    assert.equal(check({text_id: f.uid, english: data}).english, null);
  }
  for (const publisher_paratext of ['', 'x'.repeat(50001)]) assert.throws(() => validateEnglishPage({...f.data, publisher_paratext}, f.args, f.context), /pinned Apadāna/);
  assert.throws(() => validateEnglishPage({...f.data, translator_notes: owned(Array.from({length: 18}, (_, i) => i + 1))}, f.args, f.context), /translator-note/);
});

sourceTest('poem40 poem, chapter and collection notes stay three distinct finite owners', () => {
  const f = fixture(40);
  assert.deepEqual(f.data.translator_notes.map(note => note.number), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(f.data.chapter_summary.translator_notes.map(note => note.number), [8, 9, 10]);
  assert.deepEqual(f.data.collection_summary.translator_notes.map(note => note.number), [11, 12]);
  validateCollectionSummary(f.choice, f.uid); validateCollectionSummary(f.data, f.uid, true);
  const check = checked();
  for (const patch of [{parent_id: 'thi-ap30'}, {kind: 'canonical_chapter_summary'}, {label: 'Invented summary'}, {first_ref: 'thi-ap40/1'},
    {last_ref: 'thi-ap40/1'}, {root_start: 0}, {root_end: 1}, {root_sha256: '0'.repeat(64)}, {body_sha256: '0'.repeat(64)},
    {notes_sha256: '0'.repeat(64)}, {note_numbers: [8, 9]}, {text: ''}, {text: 'x'.repeat(50001)}, {translator_notes: owned([12, 11])},
    {translator_notes: owned([11])}, {translator_notes: owned([8, 9, 10])}, {translator_notes: [{number: 11, text: 'x'.repeat(50001)}, {number: 12, text: 'Synthetic'}]}, {extra: true}]) {
    const data = {...f.data, collection_summary: {...f.data.collection_summary, ...patch}};
    assert.throws(() => validateEnglishPage(data, f.args, f.context), /collection-summary/);
    assert.throws(() => validateComparisonPage(data, f.args, f.context), /collection-summary/);
    assert.equal(check({text_id: f.uid, english: data}).english, null);
  }
  for (const collection_summary of [undefined, null, [], {...f.choice.collection_summary, text: 'Runtime text in metadata'}]) {
    assert.throws(() => scopeDescriptor({...f.choice, collection_summary}, f.uid), /collection-summary/);
    assert.throws(() => comparisonChoices([{...f.choice, collection_summary}], f.uid), /collection-summary/);
  }
  assert.throws(() => validateEnglishPage({...f.data, chapter_summary: f.data.collection_summary}, f.args, f.context), /chapter-summary/);
  assert.throws(() => validateEnglishPage({...f.data, translator_notes: [...f.data.translator_notes, ...f.data.collection_summary.translator_notes]}, f.args, f.context), /translator-note/);
});

sourceTest('new apparatus fields reject every old/foreign owner and even empty ordinary-provider declarations', () => {
  const preface = fixture(31), collection = fixture(40), check = checked();
  for (let n = 1; n <= 40; n++) {
    const f = fixture(n);
    for (const [field, descriptor, owner] of [['publisher_preface', preface.choice.publisher_preface, 31], ['collection_summary', collection.choice.collection_summary, 40]]) {
      if (n === owner) continue;
      assert.equal(Object.hasOwn(f.choice, field), false);
      for (const value of [undefined, null, descriptor]) {
        assert.throws(() => scopeDescriptor({...f.choice, [field]: value}, f.uid), /owner changed/);
        assert.throws(() => comparisonChoices([{...f.choice, [field]: value}], f.uid), /owner changed/);
        const data = {...f.data, [field]: value};
        assert.throws(() => validateEnglishPage(data, f.args, f.context), /owner changed/);
        assert.equal(check({text_id: f.uid, english: data}).english, null);
      }
    }
  }
  const ordinary = {translation_id: 'dt:MN/MN1', translator: 'Synthetic translator', license: 'Synthetic terms', url: 'https://www.dhammatalks.org/suttas/MN/MN1.html'};
  for (const field of ['publisher_preface', 'collection_summary']) for (const value of [undefined, null, {}]) {
    const choice = {...ordinary, [field]: value}, data = {...choice, text_id: 'mn1', offset: 0, text: 'Synthetic ordinary source', attribution: 'Synthetic attribution'};
    assert.throws(() => scopeDescriptor(choice, 'mn1'), /pinned Apadāna/);
    assert.throws(() => comparisonChoices([choice], 'mn1'), /pinned Apadāna/);
    assert.throws(() => validateEnglishPage(data, {uid: 'mn1', translation: ordinary.translation_id}, {uid: 'mn1', choices: [ordinary], accepted: null}), /pinned Apadāna/);
    assert.equal(check({text_id: 'mn1', english: data}).english, null);
  }
  assert.equal(Object.hasOwn(APADANA_PROFILES['thi-ap35'], 'publisher_divisions'), false, 'No publisher recitation division is invented for omitted VRI paratext');
});

sourceTest('continuations revalidate separately owned apparatus and preserve the exact pinned version', () => {
  for (const n of [31, 40]) {
    const f = fixture(n), next = {...f.args, offset: 500, prefix_sha256: 'b'.repeat(64)};
    assert.deepEqual(validateEnglishPage({...f.data, next_offset: 500, continue_with: {name: 'get_translation', arguments: next}}, f.args, f.context), next);
    const data = {...f.data, offset: 500, prefix_sha256: next.prefix_sha256};
    assert.equal(validateEnglishPage(data, next, f.context), null);
    const field = n === 31 ? 'publisher_preface' : 'collection_summary';
    assert.throws(() => validateEnglishPage({...data, [field]: undefined}, next, f.context), /scope or note ownership/);
    assert.throws(() => validateEnglishPage({...data, prefix_sha256: 'f'.repeat(64)}, next, f.context), /pinned Apadāna/);
  }
});

sourceTest('standalone and complete embedded scripts render preface wording once and keep collection/chapter notes in sibling accessible sections', () => {
  for (const render of [standalone, embedded]) {
    const first = fixture(31), preface = render(first.data), scopes = elements(preface);
    const prefaceScope = scopes.find(node => node.attributes['aria-label'] === 'Publisher preface · editorial, not poem text');
    assert.ok(prefaceScope);
    assert.match(prefaceScope.textContent, /Fourth Therī chapter preface · editorial, not poem text/);
    assert.match(prefaceScope.textContent, /Preface notes · editorial, not poem notes/);
    assert.equal(scopes.filter(node => node.tagName === 'p' && node.textContent === first.data.publisher_paratext).length, 1);
    assert.deepEqual(elements(prefaceScope).filter(node => node.tagName === 'li').map(node => node.value), [1]);
    const last = fixture(40), summary = render(last.data), chapter = summary.children.find(node => node.attributes['aria-label'] === 'Canonical chapter summary · not poem text'), collection = summary.children.find(node => node.attributes['aria-label'] === 'Canonical collection summary · not poem text');
    assert.ok(chapter); assert.ok(collection);
    assert.match(chapter.textContent, /Original summary counts and titles are preserved; they are not a measure of indexed translation coverage\./);
    assert.doesNotMatch(chapter.textContent, /ordering and stanza count differ from VRI/);
    assert.deepEqual(elements(chapter).filter(node => node.tagName === 'li').map(node => node.value), [8, 9, 10]);
    assert.deepEqual(elements(collection).filter(node => node.tagName === 'li').map(node => node.value), [11, 12]);
    assert.match(collection.textContent, /Collection summary notes · editorial, not poem notes/);
    assert.ok(!elements(chapter).includes(collection)); assert.ok(!elements(collection).includes(chapter));
    assert.equal(elements(summary).filter(node => node.tagName === 'p' && node.textContent === last.data.collection_summary.text).length, 1);
    assert.equal(last.data.text.includes(last.data.collection_summary.text), false);
  }
});
