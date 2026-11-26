/** Actual source pages first; corruptions must never replace their Pāli context. */
import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {liveCache} from '../src/cache.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {validateApadanaChoice, validateEnglishPage} from '../web/translation-policy.mjs';
import {view} from './helpers/widget-view.mjs';
import {sixteenEnglishEvidence, IDS, REV, sha} from './helpers/thera335-350-evidence.mjs';

const e = sixteenEnglishEvidence(), originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; liveCache.clear(); });
function transport() {
  liveCache.clear();
  globalThis.fetch = async input => {
    const url = typeof input === 'string' ? input : input.href;
    const id = IDS.find(id => e.profiles[id].raw_url === url);
    assert.ok(id, 'Only the sixteen pinned official originals may reach the fixture');
    return new Response(e.artifact(id));
  };
}
async function actual(id) {
  const p = e.profiles[id], unit = canon.resolve(id).unit, translation = canon.translationId(p);
  const page = await english.translation(unit, translation, {translation_revision: REV, limit: 6000});
  assert.equal(page.next_offset, null);
  assert.equal(sha(page.text), p.body_sha256);
  const context = {uid: id, choices: english.available(unit), accepted: null};
  const args = {uid: id, translation, translation_revision: REV, limit: 6000};
  const widget = await readPassage({uid: id, translation, englishCharacters: 6000, limit: 2});
  assert.ok(widget.english, widget.english_error);
  assert.equal(sha(widget.english.text), p.body_sha256);
  return {p, page, context, args, widget};
}
function positiveHost(bridge, widget) {
  const host = view(bridge); host.output(structuredClone(widget));
  assert.ok(host.elements.english.textContent.includes(widget.english.text));
  assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));
  return host;
}
function corruptions(value) {
  const text = structuredClone(value); text.text += '\nSYNTHETIC_PRIVATE_359';
  text.total_characters = text.text.length;
  const notes = structuredClone(value);
  notes.translator_notes[0].text += '\nSYNTHETIC_PRIVATE_359';
  const rights = {...structuredClone(value), license: 'CC0'};
  const variants = [text, notes, rights];
  if (value.chapter_summary) {
    const summary = structuredClone(value); summary.chapter_summary.text += '\nSYNTHETIC_FOREIGN_SUMMARY';
    variants.push(summary);
    const owner = structuredClone(value); owner.chapter_summary.parent_id = 'tha-ap13';
    variants.push(owner);
  }
  return variants;
}

test('all16 complete source pages and choices pass native guards before body note rights and summary corruptions', {skip: !e.checkout}, async () => {
  transport();
  for (const id of IDS) {
    const {p, page, context, args} = await actual(id);
    validateApadanaChoice(context.choices.find(v => v.translation_id === canon.translationId(p)), id);
    validateEnglishPage(page, args, context);
    for (const bad of corruptions(page)) assert.throws(() => validateEnglishPage(bad, args, context));
    validateEnglishPage(page, args, context);
  }
});

test('both actual widget bridges preserve source wording and Pāli while refusing same-count cached English corruption', {skip: !e.checkout}, async () => {
  transport();
  for (const id of IDS) {
    const {widget} = await actual(id);
    for (const bridge of ['MCP Apps', 'Apps SDK']) {
      const host = positiveHost(bridge, widget);
      for (const bad of corruptions(widget.english)) {
        host.output({...structuredClone(widget), english: bad});
        assert.match(host.elements.english.textContent, /No English|No translation/);
        assert.ok(!host.elements.english.textContent.includes('SYNTHETIC_PRIVATE_359'));
        assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));
        host.output(structuredClone(widget));
        assert.ok(host.elements.english.textContent.includes(widget.english.text));
      }
    }
  }
});

test('the note-free chapter heading and two summaries retain their declared owners in both bridges', {skip: !e.checkout}, async () => {
  transport();
  for (const id of ['tha-ap342', 'tha-ap343', 'tha-ap352']) {
    const {widget} = await actual(id);
    for (const bridge of ['MCP Apps', 'Apps SDK']) {
      const host = positiveHost(bridge, widget);
      if (id === 'tha-ap343') {
        assert.ok(host.elements.english.textContent.includes(widget.english.publisher_paratext));
        assert.equal(Object.hasOwn(widget.english, 'publisher_preface'), false);
      } else {
        assert.equal(widget.english.chapter_summary.parent_id, id);
        assert.deepEqual(widget.english.chapter_summary.translator_notes, []);
        assert.ok(host.elements.english.textContent.includes(widget.english.chapter_summary.text));
      }
    }
  }
});
