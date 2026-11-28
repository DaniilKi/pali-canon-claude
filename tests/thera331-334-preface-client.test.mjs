// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority} from './helpers/intake380-metadata.mjs';
import {requireCurrentProfiles as requireProfiles380,requireCurrentMetadata as requireMetadata380} from './helpers/current-apadana.mjs';
import {assertCurrentSourceClosure as assertCurrent389390SourceClosure} from './helpers/current-apadana.mjs';
assertCurrent389390SourceClosure(new URL('../',import.meta.url));
const current380Source=intake380Authority();
assert.equal(current380Source.historical375.ids.length,375);assert.deepEqual(current380Source.ids.slice(0,375),current380Source.historical375.ids);
const HistoricalH368Profiles=current380Source.historical368.profiles;
const HistoricalH368Catalogue={version:1,source:current380Source.historical368.manifest_source,vri_commit:current380Source.manifest.vri_commit,held:current380Source.historical368.manifest_held,links:current380Source.historical368.links};
requireProfiles380(APADANA_PROFILES);
import {profilesForHistorical343,requireProfiles368} from './helpers/intake368-metadata.mjs';
/** Proposed root-owned test: run only after the four normalized profiles are independently sealed. */
import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createContext, runInContext} from 'node:vm';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES, APADANA_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana, quotationText, digest} from '../src/apadana.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {validatePublisherPreface, validateApadanaChoice, validateEnglishPage} from '../web/translation-policy.mjs';
import {comparisonChoices, validateComparisonPage} from '../web/translation-comparison.mjs';
import {view} from './helpers/widget-view.mjs';

const ids = ['tha-ap333', 'tha-ap334', 'tha-ap335', 'tha-ap336'];
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const originalFetch = globalThis.fetch, clone = value => structuredClone(value);
const tid = p => canon.translationId(p);
afterEach(() => { globalThis.fetch = originalFetch; });
function raw(p) {
  return readFileSync(join(checkout, 'src/_poems', p.publisher_chapter || 'chapter-4', 'poem-' + String(p.poem).padStart(3, '0') + '.md'), 'utf8');
}
function transport(calls) {
  globalThis.fetch = async url => {
    const p = Object.values(APADANA_PROFILES).find(p => p.raw_url === url.href && (ids.includes(p.id) || p.id === 'thi-ap31'));
    assert.ok(p, 'Only one of four approved artifacts or the exact legacy preface control may reach transport');
    calls.push(p.id); return new Response(raw(p));
  };
}
async function actual(uid) {
  const p = APADANA_PROFILES[uid]; assert.ok(p, 'A sealed finite profile is required');
  const unit = canon.resolve(uid).unit, args = {uid, translation: tid(p), translation_revision: APADANA_COMMIT, limit: 500};
  const context = {uid, choices: english.available(unit), accepted: null};
  const parsed = parseApadana(raw(p), p), first = await english.translation(unit, tid(p), args);
  const widget = await readPassage({uid, translation: tid(p), englishCharacters: 500, limit: 2});
  assert.ok(widget.english, widget.english_error);
  return {p, args, context, parsed, first, widget};
}
function shown(host, widget) {
  host.output(widget); const e = widget.english, text = host.elements.english.textContent;
  assert.ok(text.includes(e.text)); assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));
  for (const note of e.notes) assert.ok(text.includes(note));
  if (e.publisher_preface) {
    const flatten = node => [node, ...node.children.flatMap(flatten)];
    const regions = flatten(host.elements.english).filter(node => node.attributes['aria-label'] === 'Publisher preface · editorial, not poem text');
    assert.equal(regions.length, 1, 'One separate preface region');
    const nodes = flatten(regions[0]);
    assert.equal(nodes.filter(node => node.tagName === 'p' && node._text === e.publisher_paratext).length, 1, 'Preface wording occurs once');
    assert.equal(nodes.filter(node => node.tagName === 'li' && node._text === e.publisher_preface.translator_notes[0].text).length, 1, 'Complete note1 occurs once');
    assert.ok(text.includes(e.publisher_preface.label + ' · editorial, not poem text'));
    assert.ok(text.includes('Preface notes · editorial, not poem notes'));
  }
}
function refusesBothBridges(widget, bad) {
  for (const bridge of ['MCP Apps', 'Apps SDK']) {
    const host = view(bridge); shown(host, widget);
    host.output({...clone(widget), english: clone(bad)});
    assert.match(host.elements.english.textContent, /No English|No translation/);
    assert.ok(!host.elements.english.textContent.includes(widget.english.text));
    assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));
  }
}
function nativePrefaceOnce(data) {
  class Element {
    constructor(tag, text) { this.tag = tag; this.text = text; this.children = []; this.attributes = {}; }
    append(...nodes) { this.children.push(...nodes); }
    setAttribute(key, value) { this.attributes[key] = value; }
  }
  const source = readFileSync(new URL('../web/reader.js', import.meta.url), 'utf8');
  const code = source.slice(source.indexOf('function publisherParatext('), source.indexOf('function chapterSummary('));
  const context = createContext({el: (tag, text) => new Element(tag, text)});
  runInContext(code + ';globalThis.appendPreface=publisherParatext;', context);
  const target = new Element('main'); context.appendPreface(data, target, 4);
  const flatten = node => [node, ...node.children.flatMap(flatten)], nodes = flatten(target);
  assert.equal(nodes.filter(node => node.text === data.publisher_paratext).length, 1);
  assert.equal(nodes.filter(node => node.text === data.publisher_preface.translator_notes[0].text).length, 1);
  assert.equal(target.children[0].attributes['aria-label'], 'Publisher preface · editorial, not poem text');
}

test('two literal note-owning prefaces preserve all339 prior metadata contracts and refuse borrowed owners', () => {
  requireProfiles368(HistoricalH368Profiles);assert.equal(Object.keys(HistoricalH368Profiles).length, 368); for (const uid of ids) assert.ok(APADANA_PROFILES[uid]);
  const p = APADANA_PROFILES['tha-ap333']; assert.ok(p);
  assert.deepEqual(Object.keys(p.publisher_preface).sort(), ['body_sha256','kind','label','note_numbers','notes_sha256','parent_id']);
  assert.equal(p.publisher_preface.kind, 'publisher_preface');
  assert.equal(p.publisher_preface.parent_id, 'tha-ap333');
  assert.equal(p.publisher_preface.label, 'Thirty-fourth Therā chapter preface');
  assert.equal(p.publisher_preface.body_sha256, p.paratext_sha256);
  assert.deepEqual(p.publisher_preface.note_numbers, [1]); assert.deepEqual(p.note_numbers, [2,3,4]);
  const historical343=profilesForHistorical343(HistoricalH368Profiles);
  const prior = Object.keys(historical343).filter(uid => !ids.includes(uid)); assert.equal(prior.length, 339);
  for (const uid of prior) {
    const old = APADANA_PROFILES[uid], choice = english.available(canon.resolve(uid).unit).find(row => row.translation_id === tid(old));
    validatePublisherPreface(choice, uid); validateApadanaChoice(choice, uid);
    assert.throws(() => validatePublisherPreface({...choice, publisher_preface: clone(p.publisher_preface)}, uid), /publisher-preface/);
  }
  const choices = english.available(canon.resolve(p.id).unit), choice = choices.find(row => row.translation_id === tid(p));
  validatePublisherPreface(choice, p.id); assert.deepEqual(comparisonChoices([choice], p.id), [choice]);
  for (const publisher_preface of [undefined, null, {}, {...choice.publisher_preface, text: 'Duplicate wording'},
    {...choice.publisher_preface, parent_id: 'thi-ap31'}, {...choice.publisher_preface, label: 'Fourth Therī chapter preface'},
    {...choice.publisher_preface, note_numbers: [2]}, {...choice.publisher_preface, extra: true}]) {
    assert.throws(() => validatePublisherPreface({...choice, publisher_preface}, p.id), /publisher-preface/);
    assert.throws(() => comparisonChoices([{...choice, publisher_preface}], p.id), /publisher-preface/);
  }
  for (const uid of ['tha-ap334','tha-ap335','tha-ap336','tha-ap337','mn1']) {
    assert.throws(() => validatePublisherPreface({publisher_preface: clone(p.publisher_preface)}, uid), /publisher-preface/);
  }
});

test('actual oldThi31 and newTha333 body plus separately owned note1 pass native comparison and both unchanged renderers', {skip: !checkout}, async () => {
  transport([]);
  for (const uid of ['thi-ap31', 'tha-ap333']) {
    const f = await actual(uid); validatePublisherPreface(f.first, uid, true);
    validateEnglishPage(f.first, f.args, f.context); validateComparisonPage(f.first, f.args, f.context);
    assert.equal(Object.hasOwn(f.first.publisher_preface, 'text'), false);
    assert.deepEqual(f.first.publisher_preface.translator_notes.map(n => n.number), [1]);
    nativePrefaceOnce(f.first);
    if (uid === 'tha-ap333') {
      assert.deepEqual(f.first.translator_notes.map(n => n.number), [2,3,4]);
      assert.equal(digest(f.first.publisher_paratext), f.p.publisher_preface.body_sha256);
      assert.equal(digest(JSON.stringify(f.first.publisher_preface.translator_notes)), f.p.publisher_preface.notes_sha256);
    }
    for (const bridge of ['MCP Apps', 'Apps SDK']) shown(view(bridge), f.widget);
  }
});

test('new genuine preface cannot change or move notes even with same-count text and forged metadata hashes', {skip: !checkout}, async () => {
  transport([]); const f = await actual('tha-ap333'), s = f.first.publisher_preface;
  const changedNotes = s.translator_notes.map(n => ({...n, text: n.text + '\n'}));
  const changedText = f.first.publisher_paratext + '\n';
  const rows = [
    {publisher_preface: undefined}, {publisher_preface: null}, {publisher_preface: {...s, text: f.first.publisher_paratext}},
    {publisher_preface: {...s, parent_id: 'thi-ap31'}}, {publisher_preface: {...s, label: 'Fourth Therī chapter preface'}},
    {publisher_preface: {...s, kind: 'canonical_chapter_summary'}}, {publisher_preface: {...s, extra: true}},
    {publisher_preface: {...s, translator_notes: []}}, {publisher_preface: {...s, translator_notes: [...s.translator_notes, ...s.translator_notes]}},
    {publisher_preface: {...s, note_numbers: [2]}}, {publisher_preface: {...s, translator_notes: [{number: 2, text: s.translator_notes[0].text}]}},
    {publisher_preface: {...s, translator_notes: changedNotes}},
    {publisher_preface: {...s, translator_notes: changedNotes, notes_sha256: digest(JSON.stringify(changedNotes))}},
    {publisher_paratext: changedText}, {publisher_paratext: changedText, paratext_sha256: digest(changedText), publisher_preface: {...s, body_sha256: digest(changedText)}},
    {publisher_paratext: ''}, {publisher_paratext: 'x'.repeat(50001)},
    {publisher_preface: {...s, translator_notes: [{number: 1, text: 'x'.repeat(50001)}]}},
    {translator_notes: [clone(s.translator_notes[0]), ...f.first.translator_notes.slice(1)], publisher_preface: {...s, translator_notes: []}},
  ];
  for (const patch of rows) {
    const bad = {...clone(f.first), ...clone(patch)};
    assert.ok(Object.keys(patch).some(key => JSON.stringify(bad[key]) !== JSON.stringify(f.first[key])), 'Meaningful mutation');
    assert.throws(() => validateEnglishPage(bad, f.args, f.context));
    assert.throws(() => validateComparisonPage(bad, f.args, f.context));
    refusesBothBridges(f.widget, {...clone(f.widget.english), ...clone(patch)});
  }
});

test('BJTS-only headers, absent local labels and physical quote boundaries retain four original scopes without new UI grammar', {skip: !checkout}, async () => {
  transport([]); const physical = [5,7,5,19];
  for (const [index, uid] of ids.entries()) {
    const f = await actual(uid), p = f.p, quote = quotationText({...f.parsed, translation_id: tid(p)});
    assert.ok(p.mapping_notes.length > 0, 'Source and edition findings remain mandatory');
    const entries = quote.split('\n\n'); assert.equal(entries.length, physical[index]);
    const paragraphs = f.parsed.text.split('\n\n');
    for (const [i, stanza] of p.stanza_layout.entries()) {
      const marked = paragraphs[i + 1].replace(/\[Note \d+\]/g, '').trim();
      assert.ok(marked.endsWith(stanza.suffix));
      assert.equal(entries[i], marked.slice(0, -stanza.suffix.length).trim());
      assert.equal(entries[i].split('\n').length, stanza.lines);
    }
    assert.ok(!quote.includes(paragraphs[0]));
    if (uid === 'tha-ap333') { assert.ok(!quote.includes(f.parsed.publisher_paratext)); assert.ok(!quote.includes(f.parsed.publisher_preface.translator_notes[0].text)); }
    else {
      assert.ok(paragraphs[0].startsWith('{*' + p.poem + ',')); assert.ok(paragraphs[0].includes('BJTS only:'));
      assert.ok(p.stanza_layout.every(s => s.local_label === null));
    }
    validateEnglishPage(f.first, f.args, f.context); validateComparisonPage(f.first, f.args, f.context);
    for (const bridge of ['MCP Apps','Apps SDK']) shown(view(bridge), f.widget);
    for (const patch of [{mapping_notes: []}, ...p.mapping_notes.map(note => ({notes: f.first.notes.filter(n => n !== note)}))]) {
      const bad = {...clone(f.first), ...patch};
      assert.throws(() => validateEnglishPage(bad, f.args, f.context));
      assert.throws(() => validateComparisonPage(bad, f.args, f.context));
      refusesBothBridges(f.widget, {...clone(f.widget.english), ...clone(patch)});
    }
  }
});

test('all four genuine poem-note and complete-or-empty preface hashes reject actual content drift at their declared boundaries', {skip: !checkout}, async () => {
  transport([]);
  for (const uid of ids) {
    const f = await actual(uid), original = f.first;
    validateEnglishPage(original, f.args, f.context); validateComparisonPage(original, f.args, f.context);
    for (const bridge of ['MCP Apps','Apps SDK']) shown(view(bridge), f.widget);
    const changedNotes = original.translator_notes.map((n, i) => i === 0 ? {...n, text: n.text + '\n'} : n);
    const changedParatext = original.publisher_paratext + '\n';
    if (uid !== 'tha-ap333') assert.equal(original.publisher_paratext, '');
    const patches = [
      {translator_notes: changedNotes},
      {translator_notes: changedNotes, notes_sha256: digest(JSON.stringify(changedNotes))},
      {publisher_paratext: changedParatext},
      {publisher_paratext: changedParatext, paratext_sha256: digest(changedParatext)},
      {body_sha256: '0'.repeat(64)}, {root_sha256: '0'.repeat(64)}, {translation_revision: '0'.repeat(40)},
    ];
    if (uid !== 'tha-ap333') patches.push({publisher_preface: clone(APADANA_PROFILES['tha-ap333'].publisher_preface)});
    for (const patch of patches) {
      const bad = {...clone(original), ...clone(patch)};
      assert.ok(Object.keys(patch).some(key => JSON.stringify(bad[key]) !== JSON.stringify(original[key])), 'Meaningful mutation');
      assert.throws(() => validateEnglishPage(bad, f.args, f.context));
      assert.throws(() => validateComparisonPage(bad, f.args, f.context));
      refusesBothBridges(f.widget, {...clone(f.widget.english), ...clone(patch)});
    }
    const fullArgs = {...f.args, limit: 6000};
    const fullPage = await english.translation(canon.resolve(uid).unit, tid(f.p), fullArgs);
    const fullWidget = await readPassage({uid, translation: tid(f.p), englishCharacters: 6000, limit: 2});
    assert.equal(fullPage.offset, 0); assert.equal(fullPage.next_offset, null);
    validateEnglishPage(fullPage, fullArgs, f.context); validateComparisonPage(fullPage, fullArgs, f.context);
    for (const bridge of ['MCP Apps','Apps SDK']) shown(view(bridge), fullWidget);
    for (const patch of [{text: 'X' + fullPage.text.slice(1)}, {text: fullPage.text + ' '},
      {text: fullPage.text.slice(0, -1)}, {total_characters: fullPage.total_characters + 1}]) {
      assert.throws(() => validateEnglishPage({...clone(fullPage), ...patch}, fullArgs, f.context), /complete pinned/);
      assert.throws(() => validateComparisonPage({...clone(fullPage), ...patch}, fullArgs, f.context), /complete pinned/);
      refusesBothBridges(fullWidget, {...clone(fullWidget.english), ...patch});
    }
    // Arbitrary 500-character pages still rely on the authenticated server-page contract.
    const full = {...f.parsed, translation_id: tid(f.p)};
    assert.ok(quotationText(full));
    assert.throws(() => quotationText({...full, text: full.text + '\n'}), /pinned publication/);
    assert.throws(() => parseApadana(raw(f.p) + '\n', f.p), /pinned publication/);
  }
});
