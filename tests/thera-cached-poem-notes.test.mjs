/** Source-backed frozen94 cache-note regression; no positive translated wording is invented. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT } from '../src/apadana-profiles.mjs';
import { parseApadana, digest } from '../src/apadana.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { validateApadanaChoice, validateEnglishPage } from '../web/translation-policy.mjs';
import { validateComparisonPage } from '../web/translation-comparison.mjs';
import { view } from './helpers/widget-view.mjs';

// D252 is the already published source authority for this frozen206 cohort.
// A later intake may append reviewed profiles without rewriting this history.
const approval = JSON.parse(readFileSync('docs/evidence/apadana/THERA_141_180_APPROVAL.json', 'utf8'));
function sealed(descriptor) {
  const raw = readFileSync(join('docs/evidence/apadana', descriptor.file));
  assert.equal(digest(raw), descriptor.sha256, 'Frozen source evidence seal: ' + descriptor.file);
  return JSON.parse(raw);
}
const baseline = sealed(approval.baseline_freeze), independent = sealed(approval.independent_source_approval);
const cohort = approval.expected_profile_ids;
const frozen = Object.fromEntries(approval.baseline_ids.map(id => {
  const { english: _english, match: _match, ...profile } = baseline.profile_objects[id]; return [id, profile];
}));
Object.assign(frozen, independent.approved_profile_objects);
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const actual = new Map();
const rawCache = new Map();
const tid = profile => canon.translationId(profile);
function raw(profile) {
  if (!rawCache.has(profile.id)) {
    const path = profile.path.replace(/^\/text\//, '').replace(/\/$/, '.md');
    const value = readFileSync(join(checkout, 'src/_poems', path), 'utf8');
    assert.equal(digest(value), frozen[profile.id].raw_sha256, profile.id + ' exact immutable raw artifact');
    rawCache.set(profile.id, value);
  }
  return rawCache.get(profile.id);
}
function transport(calls) {
  globalThis.fetch = async url => {
    const profile = cohort.map(id => APADANA_PROFILES[id]).find(value => value.raw_url === url.href);
    assert.ok(profile, 'Only an exact frozen206 source reaches fixture transport');
    calls.push(profile.id); return new Response(raw(profile));
  };
}
async function selection(id) {
  if (!actual.has(id)) {
    const profile = APADANA_PROFILES[id], unit = canon.resolve(id).unit;
    const parsed = parseApadana(raw(profile), profile), choices = english.available(unit);
    const args = { uid: id, translation: tid(profile), translation_revision: APADANA_COMMIT, limit: 500 };
    const response = await english.translation(unit, args.translation, { translation_revision: APADANA_COMMIT, limit: 500 });
    const widget = await readPassage({ uid: id, translation: args.translation, limit: 2, englishCharacters: 500 });
    assert.ok(widget.english, widget.english_error);
    actual.set(id, { profile, unit, parsed, args, context: { uid: id, choices, accepted: null }, response, widget });
  }
  return actual.get(id);
}
const scopeKeys = ['publisher_preface', 'chapter_summary', 'collection_summary', 'publisher_divisions', 'editorial_gap'];
function apparatus(value) {
  return scopeKeys.flatMap(key => !value[key] ? [] : (Array.isArray(value[key]) ? value[key] : [value[key]]));
}
function assertPageNotes(page, selected) {
  assert.deepEqual(page.translator_notes, selected.parsed.translator_notes);
  assert.equal(digest(JSON.stringify(page.translator_notes)), selected.profile.notes_sha256);
  assert.equal(page.notes_sha256, selected.profile.notes_sha256);
  for (const key of scopeKeys) {
    assert.equal(Object.hasOwn(page, key), Object.hasOwn(selected.parsed, key), selected.profile.id + ' ' + key + ' ownership');
    if (selected.parsed[key]) assert.deepEqual(page[key], selected.parsed[key]);
  }
}
function assertVisibleNotes(host, page, selected) {
  assert.ok(host.elements.english.textContent.includes(page.text), selected.profile.id + ' original English body is displayed');
  for (const note of page.translator_notes) assert.ok(host.elements.english.textContent.includes(note.text), selected.profile.id + ' original poem note ' + note.number + ' is displayed');
  for (const owner of apparatus(page)) for (const note of owner.translator_notes || []) assert.ok(host.elements.english.textContent.includes(note.text), selected.profile.id + ' separately owned apparatus note ' + note.number + ' is displayed');
}

test('frozen206 source metadata remains exact and choice validation does not require private or translated content', () => {
  assert.equal(approval.status, 'approved'); assert.equal(cohort.length, 206);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0, 206), cohort);
  for (const id of cohort) {
    assert.deepEqual(APADANA_PROFILES[id], frozen[id], id + ' source object retained exactly');
    const choice = english.available(canon.resolve(id).unit).find(value => value.translation_id === tid(APADANA_PROFILES[id]));
    assert.ok(choice); assert.doesNotThrow(() => validateApadanaChoice(choice, id, false));
    assert.equal(Object.hasOwn(choice, 'translator_notes'), false);
  }
});

test('ALL206 original-source positives complete before corruption checks: every page retains1840poem notes and15separate apparatus notes in both hosts', { skip: !checkout }, async () => {
  const calls = []; transport(calls); let poemNotes = 0, apparatusNotes = 0; const empty = [];
  for (const id of cohort) {
    const selected = await selection(id), { profile, parsed, unit, context } = selected;
    poemNotes += parsed.translator_notes.length;
    apparatusNotes += apparatus(parsed).reduce((count, owner) => count + (owner.translator_notes?.length || 0), 0);
    if (!parsed.translator_notes.length) empty.push(id);
    const poemNumbers = new Set(parsed.translator_notes.map(note => note.number));
    for (const owner of apparatus(parsed)) for (const note of owner.translator_notes || []) assert.equal(poemNumbers.has(note.number), false, id + ' apparatus note is not reassigned to poem');
    const hosts = ['MCP Apps', 'Apps SDK'].map(bridge => ({ bridge, host: view(bridge) }));
    let args = selected.args, widget = selected.widget, body = '';
    while (args) {
      const { uid: _uid, translation, ...options } = args;
      const page = await english.translation(unit, translation, options); body += page.text;
      assertPageNotes(page, selected); assertPageNotes(widget.english, selected);
      assert.equal(widget.english.text, page.text); assert.equal(widget.english.offset, page.offset);
      const next = validateEnglishPage(page, args, context); assert.deepEqual(validateComparisonPage(page, args, context), next);
      for (const { bridge, host } of hosts) {
        host.output(widget); assertVisibleNotes(host, page, selected);
        assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text), id + ' Pāli is retained in ' + bridge);
      }
      if (next) {
        assert.ok(widget.english.continue_with); assert.equal(widget.english.continue_with.arguments.english_offset, next.offset);
        widget = await readPassage({ ...widget.english.continue_with.arguments, englishCharacters: 500 });
      } else assert.equal(widget.english.continue_with, null);
      args = next;
    }
    assert.equal(digest(body), profile.body_sha256, id + ' whole original poem reassembled without alteration');
  }
  assert.equal(poemNotes, 1840); assert.equal(apparatusNotes, 15);
  assert.deepEqual(empty, ['tha-ap30', 'tha-ap88']);
});

test('every one of1840poem notes refuses same-count changed text and forged cache hashes across standalone comparison and both hosts without replacing Pāli', { skip: !checkout }, async () => {
  const calls = []; transport(calls); let checked = 0;
  for (const id of cohort) {
    const selected = await selection(id), { response, args, context, widget } = selected;
    const hosts = ['MCP Apps', 'Apps SDK'].map(bridge => ({ bridge, host: view(bridge) }));
    for (const { host } of hosts) { host.output(widget); assertVisibleNotes(host, widget.english, selected); }
    const before = calls.length;
    for (let index = 0; index < response.translator_notes.length; index++) {
      const notes = structuredClone(response.translator_notes); notes[index].text += '\n';
      assert.equal(notes.length, response.translator_notes.length); assert.deepEqual(notes.map(note => note.number), response.translator_notes.map(note => note.number));
      for (const forged of [false, true]) {
        const bad = { ...structuredClone(response), translator_notes: notes, ...(forged ? { notes_sha256: digest(JSON.stringify(notes)) } : {}) };
        assert.throws(() => validateEnglishPage(bad, args, context), id + ' changed poem note ' + index);
        assert.throws(() => validateComparisonPage(bad, args, context), id + ' changed comparison note ' + index);
        for (const { bridge, host } of hosts) {
          host.output({ ...structuredClone(widget), english: bad });
          assert.ok(!host.elements.english.textContent.includes(response.text), id + ' cached English refused in ' + bridge);
          assert.match(host.elements.english.textContent, /No English|No translation/);
          assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text), id + ' Pāli kept after changed note in ' + bridge);
        }
      }
      checked++;
    }
    assert.equal(calls.length, before, id + ' pure cached-response guards made no source request');
  }
  assert.equal(checked, 1840);
});

test('all206 actual-source caveats remain mandatory while extra citation-resolution context is accepted', { skip: !checkout }, async () => {
  const calls = []; transport(calls);
  for (const id of cohort) {
    const selected = await selection(id), { response, profile, args, context, widget } = selected;
    const hosts = ['MCP Apps', 'Apps SDK'].map(bridge => ({ bridge, host: view(bridge) }));
    const extra = { ...structuredClone(response), notes: [...response.notes, 'Additional citation-resolution context from this request.'] };
    assert.deepEqual(validateEnglishPage(extra, args, context), validateEnglishPage(response, args, context));
    assert.deepEqual(validateComparisonPage(extra, args, context), validateComparisonPage(response, args, context));
    for (const { host } of hosts) {
      host.output(widget); assertVisibleNotes(host, widget.english, selected);
      host.output({ ...structuredClone(widget), english: extra }); assertVisibleNotes(host, extra, selected);
    }
    const negatives = [{ ...structuredClone(response), mapping_notes: [] }, ...profile.mapping_notes.map(note => ({ ...structuredClone(response), notes: response.notes.filter(value => value !== note) }))];
    for (const bad of negatives) {
      assert.throws(() => validateEnglishPage(bad, args, context), id + ' missing mandatory mapping notice');
      assert.throws(() => validateComparisonPage(bad, args, context), id + ' missing mandatory comparison notice');
      for (const { bridge, host } of hosts) {
        host.output({ ...structuredClone(widget), english: bad }); assert.match(host.elements.english.textContent, /No English|No translation/);
        assert.ok(!host.elements.english.textContent.includes(response.text), id + ' missing caveat refuses cached English in ' + bridge);
        assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text), id + ' missing caveat preserves Pāli in ' + bridge);
      }
    }
  }
});

test('the exact two note-free sources keep authentic empty arrays and reject a foreign poem note without another source request', { skip: !checkout }, async () => {
  const calls = []; transport(calls); const donor = await selection('thi-ap1');
  for (const id of ['tha-ap30', 'tha-ap88']) {
    const selected = await selection(id), { response, args, context, widget } = selected;
    assert.deepEqual(response.translator_notes, []); assert.deepEqual(widget.english.translator_notes, []);
    const before = calls.length;
    for (const notes_sha256 of [response.notes_sha256, digest(JSON.stringify([donor.response.translator_notes[0]]))]) {
      const bad = { ...structuredClone(response), translator_notes: [structuredClone(donor.response.translator_notes[0])], notes_sha256 };
      assert.throws(() => validateEnglishPage(bad, args, context)); assert.throws(() => validateComparisonPage(bad, args, context));
      for (const bridge of ['MCP Apps', 'Apps SDK']) {
        const host = view(bridge); host.output(widget); assert.ok(host.elements.english.textContent.includes(response.text));
        host.output({ ...structuredClone(widget), english: bad }); assert.match(host.elements.english.textContent, /No English|No translation/);
        assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));
      }
    }
    assert.equal(calls.length, before);
  }
});

test('all206 warm source caches still validate registered note metadata before transport or source display', { skip: !checkout }, async () => {
  const calls = []; transport(calls); const data = canon.load();
  for (const id of cohort) {
    const { unit, profile } = await selection(id); await english.translation(unit, tid(profile), { translation_revision: APADANA_COMMIT });
    const link = data.translations[id].find(value => canon.translationId(value) === tid(profile)), original = structuredClone(link), before = calls.length;
    Object.assign(link, { notes_sha256: '0'.repeat(64) });
    try { await assert.rejects(english.translation(unit, tid(profile), { translation_revision: APADANA_COMMIT })); assert.equal(calls.length, before, id + ' changed warm note metadata refused before another source fetch'); }
    finally { for (const key of Object.keys(link)) delete link[key]; Object.assign(link, original); }
  }
});
