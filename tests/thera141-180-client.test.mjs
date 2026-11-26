/** Client capabilities exercise original pinned source responses, never invented positive wording. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT } from '../src/apadana-profiles.mjs';
import { digest } from '../src/apadana.mjs';
import { readPassage, WIDGET_VERSION } from '../src/chatgpt-widget.mjs';
import { validateEnglishPage } from '../web/translation-policy.mjs';
import { validateComparisonPage } from '../web/translation-comparison.mjs';
import { view } from './helpers/widget-view.mjs';
import { CURRENT_APADANA_IDS } from './helpers/apadana-intake-expectations.mjs';

const approval = JSON.parse(readFileSync('docs/evidence/apadana/THERA_141_180_APPROVAL.json', 'utf8'));
function sealed(descriptor) {
  const raw = readFileSync(join('docs/evidence/apadana', descriptor.file));
  assert.equal(digest(raw), descriptor.sha256, 'Independent source evidence seal: ' + descriptor.file);
  return JSON.parse(raw);
}
const independent = sealed(approval.independent_source_approval), baseline = sealed(approval.baseline_freeze);
const goldens = approval.goldens.map(sealed), approved = approval.approved_ids;
const golden = id => { const found = goldens.flatMap(input => input.poems).filter(row => row.id === id); assert.equal(found.length, 1); return found[0]; };
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const previousFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = previousFetch; });
const tid = profile => canon.translationId(profile);
function artifact(profile) {
  const record = golden(profile.id), raw = readFileSync(join(checkout, record.path));
  assert.equal(digest(raw), record.raw_sha256);
  assert.equal(createHash('sha1').update('blob ' + raw.length + '\0').update(raw).digest('hex'), record.git_blob_sha1);
  return raw.toString();
}
function sourceTransport(calls) {
  globalThis.fetch = async url => {
    const profile = approved.map(id => APADANA_PROFILES[id]).find(row => row.raw_url === url.href);
    assert.ok(profile, 'Transport is confined to the exact approved immutable poem artifacts');
    calls.push(profile.id); return new Response(artifact(profile));
  };
}
function mutations(value, profile) {
  const changedNotes = value.translator_notes.map((note, i) => i ? note : { ...note, text: note.text + '\n' });
  const rows = [
    ['revision', { translation_revision: '0'.repeat(40) }],
    ['rights', { license: 'CC0' }],
    ['mandatory mapping notices', { mapping_notes: [] }],
    ['mandatory displayed caveat', { notes: value.notes.filter(note => note !== profile.mapping_notes[0]) }],
    ['raw artifact', { raw_sha256: '0'.repeat(64) }],
    ['root artifact', { root_sha256: '0'.repeat(64) }],
    ['poem-note artifact', { notes_sha256: '0'.repeat(64) }],
    // Trailing whitespace preserves the old nonempty check, exercising exact content pins.
    ['publisher preface content', { publisher_paratext: value.publisher_paratext + '\n' }],
    ['poem notes absent', { translator_notes: undefined }],
    ['same-count changed poem note', { translator_notes: changedNotes }],
    ['forged changed-poem-note hash', { translator_notes: changedNotes, notes_sha256: digest(JSON.stringify(changedNotes)) }],
    ['foreign preface descriptor', { publisher_preface: {} }],
    ['foreign division descriptor', { publisher_divisions: [] }],
    ['foreign editorial gap', { editorial_gap: {} }],
  ];
  if (profile.chapter_summary) {
    rows.push(['chapter summary content', { chapter_summary: { ...value.chapter_summary, text: value.chapter_summary.text + '\n' } }]);
    rows.push(['chapter notes absent', { chapter_summary: { ...value.chapter_summary, translator_notes: undefined } }]);
    rows.push(['chapter owner', { chapter_summary: { ...value.chapter_summary, parent_id: approved.find(id => id !== profile.id) } }]);
  } else rows.push(['foreign chapter summary', { chapter_summary: {} }]);
  for (const [label, patch] of rows) assert.ok(Object.keys(patch).some(key => JSON.stringify(value[key]) !== JSON.stringify(patch[key])), profile.id + ' nonempty negative control: ' + label);
  return rows;
}

test('new client capabilities preserve the independently frozen168 source contracts and exact approved scope', () => {
  assert.equal(approval.status, 'approved'); assert.equal(approval.base_commit, '05fc4e29540fc0799145dc28838bedb7d964b2c7');
  assert.equal(independent.baseline, approval.base_commit); assert.equal(independent.publisher_revision, APADANA_COMMIT);
  assert.deepEqual(approved, independent.approved_ids); assert.equal(approved.length, 38);
  assert.equal(approval.baseline_ids.length, 168);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0, 206), [...approval.baseline_ids, ...approved]);
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  for (const id of approval.baseline_ids) {
    const { english: _english, match: _match, ...profile } = baseline.profile_objects[id];
    assert.deepEqual(APADANA_PROFILES[id], profile, id + ' previous source contract unchanged');
  }
  assert.equal(WIDGET_VERSION, 'v44');
  for (const id of approved) {
    const profile = APADANA_PROFILES[id], record = golden(id);
    assert.deepEqual(profile.mapping_notes, record.mapping_notes);
    for (const field of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256']) assert.equal(profile[field], field === 'root_sha256' ? record.root.root_sha256 : record[field]);
  }
});

test('all38 actual source pages and both embedded hosts retain original bodies, rights, notes and exact source continuation', { skip: !checkout }, async () => {
  const calls = []; sourceTransport(calls); const data = canon.load();
  for (const id of approved) {
    const profile = APADANA_PROFILES[id], unit = data.byId.get(id), record = golden(id), choices = english.available(unit), context = { uid: id, choices, accepted: null };
    let request = { uid: id, translation: tid(profile), translation_revision: APADANA_COMMIT, limit: 500 }, body = '', first;
    while (request) {
      const { uid: _uid, translation, ...options } = request;
      const result = await english.translation(unit, translation, options); first ??= result; body += result.text;
      assert.equal(result.license, 'CC BY-NC-SA 4.0'); assert.match(result.attribution, /Jonathan S\. Walters and Whitman College/);
      assert.equal(result.raw_sha256, record.raw_sha256); assert.deepEqual(result.mapping_notes, record.mapping_notes);
      for (const notice of record.mapping_notes) assert.ok(result.notes.includes(notice));
      assert.equal(digest(JSON.stringify(result.translator_notes)), record.notes_sha256);
      const next = validateEnglishPage(result, request, context);
      assert.deepEqual(validateComparisonPage(result, request, context), next); request = next;
    }
    assert.equal(digest(body), record.body_sha256);
    const widget = await readPassage({ uid: id, translation: tid(profile), englishCharacters: 500 });
    assert.ok(widget.english, widget.english_error);
    const actualPali = widget.pali.segments[0].text;
    for (const bridge of ['MCP Apps', 'Apps SDK']) {
      const embedded = view(bridge); embedded.output(widget);
      assert.ok(embedded.elements.english.textContent.includes(widget.english.text), id + ' actual source English in ' + bridge);
      assert.ok(embedded.elements.pali.textContent.includes(actualPali));
      embedded.output({ ...structuredClone(widget), english: structuredClone(first) });
      assert.ok(embedded.elements.english.textContent.includes(first.text), id + ' original cached API response accepted before mutations in ' + bridge);
      for (const [label, patch] of mutations(first, profile)) {
        const changed = { ...structuredClone(first), ...structuredClone(patch) };
        const args = { uid: id, translation: tid(profile), translation_revision: APADANA_COMMIT, limit: 500 };
        assert.throws(() => validateEnglishPage(changed, args, context), id + ' individual ' + label);
        assert.throws(() => validateComparisonPage(changed, args, context), id + ' comparison ' + label);
        embedded.output({ ...structuredClone(widget), english: changed });
        assert.ok(!embedded.elements.english.textContent.includes(first.text), id + ' no changed cached English in ' + bridge + ': ' + label);
        assert.match(embedded.elements.english.textContent, /No English|No translation/);
        assert.ok(embedded.elements.pali.textContent.includes(actualPali), id + ' preserves Pāli in ' + bridge + ': ' + label);
      }
    }
  }
});

test('all38 warmed source choices refuse changed metadata before another source request', { skip: !checkout }, async () => {
  const calls = []; sourceTransport(calls); const data = canon.load();
  for (const id of approved) {
    const profile = APADANA_PROFILES[id], unit = data.byId.get(id);
    await english.translation(unit, tid(profile), { limit: 500, translation_revision: APADANA_COMMIT });
    const link = data.translations[id].find(row => canon.translationId(row) === tid(profile)), original = structuredClone(link);
    for (const patch of [{ raw_sha256: '0'.repeat(64) }, { mapping_notes: [] }, { chapter_summary: profile.chapter_summary ? null : {} }]) {
      const before = calls.length; Object.assign(link, structuredClone(patch));
      try { await assert.rejects(english.translation(unit, tid(profile), { translation_revision: APADANA_COMMIT })); assert.equal(calls.length, before, id + ' warmed metadata stops before transport'); }
      finally { for (const key of Object.keys(link)) delete link[key]; Object.assign(link, structuredClone(original)); }
    }
  }
});
