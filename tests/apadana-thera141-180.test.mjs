import {canonBeforeFour} from './helpers/canon-before-four.mjs';
/** Exact source-scope curation, separate from production profile derivation. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT, isApadanaRawUrl } from '../src/apadana-profiles.mjs';
import { THERA_APADANA_PROFILES } from '../src/apadana-thera-profiles.mjs';
import { parseTheraApadana } from '../src/apadana-thera.mjs';
import { parseApadana, quotationText, digest, rootDigest, validateLink } from '../src/apadana.mjs';
import { fetchPublic } from '../src/http.mjs';
import { CURRENT_APADANA_IDS } from './helpers/apadana-intake-expectations.mjs';
import { readPassage } from '../src/chatgpt-widget.mjs';
import { validateApadanaChoice, validateEnglishPage } from '../web/translation-policy.mjs';

const approval = JSON.parse(readFileSync('docs/evidence/apadana/THERA_141_180_APPROVAL.json', 'utf8'));
const sealed = descriptor => {
  const raw = readFileSync(join('docs/evidence/apadana', descriptor.file));
  assert.equal(digest(raw), descriptor.sha256, `Independent evidence seal: ${descriptor.file}`);
  return JSON.parse(raw);
};
const inputs = approval.goldens.map(sealed), reviews = approval.source_reviews.map(sealed);
const rights = approval.rights.map(sealed), independent = sealed(approval.independent_source_approval);
const baseline = sealed(approval.baseline_freeze);
const approved = approval.approved_ids;
const golden = uid => {
  const rows = inputs.flatMap(input => input.poems).filter(row => row.id === uid);
  assert.equal(rows.length, 1, `One independently sealed source record for ${uid}`);
  return rows[0];
};
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const source = p => readFileSync(join(checkout, golden(p.id).path), 'utf8');
const tid = p => canon.translationId(p);
const blob = raw => createHash('sha1').update('blob ' + raw.length + '\0').update(raw).digest('hex');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const scopes = ['publisher_preface', 'chapter_summary', 'collection_summary', 'publisher_divisions', 'editorial_gap'];
function assertScopes(value, p, content) {
  for (const key of scopes) {
    assert.equal(Object.hasOwn(value, key), Object.hasOwn(p, key), `${p.id} ${key} presence`);
    if (!p[key]) continue;
    const actual = key === 'publisher_divisions' ? value[key] : [value[key]];
    const expected = key === 'publisher_divisions' ? p[key] : [p[key]];
    assert.equal(actual.length, expected.length);
    for (const [i, row] of actual.entries()) {
      const { text, translator_notes, ...descriptor } = row;
      assert.deepEqual(descriptor, expected[i]);
      if (content) {
        assert.equal(digest(text), descriptor.body_sha256);
        assert.equal(digest(JSON.stringify(translator_notes)), descriptor.notes_sha256);
        assert.deepEqual(translator_notes.map(note => note.number), descriptor.note_numbers);
      } else { assert.equal(text, undefined); assert.equal(translator_notes, undefined); }
    }
  }
}
function pinnedFetch(calls) {
  globalThis.fetch = async url => {
    const p = approved.map(uid => APADANA_PROFILES[uid]).find(row => row.raw_url === url.href);
    assert.ok(p, 'Only an exact independently approved source reaches transport');
    calls.push(p.id);
    return new Response(source(p));
  };
}

test('141–180 intake is exactly independently approved38 and preserves all168 prior profiles and links', () => {
  assert.equal(approval.status, 'approved');
  assert.equal(approval.base_commit, '05fc4e29540fc0799145dc28838bedb7d964b2c7');
  assert.equal(independent.baseline, approval.base_commit);
  assert.equal(independent.status, 'SOURCE_SCOPE_APPROVED_38_ONLY');
  assert.equal(independent.canonical_changes_authorized, false);
  assert.equal(independent.publisher_revision, APADANA_COMMIT);
  assert.deepEqual(approved, independent.approved_ids);
  assert.equal(approved.length, 38);
  assert.deepEqual(approved, approval.approved_records.map(row => row.id));
  assert.equal(approval.baseline_ids.length, 168);
  const historical206 = [...approval.baseline_ids, ...approved];
  assert.equal(historical206.length, 206);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0, 206), historical206);
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  const data = canon.load(), manifest = JSON.parse(readFileSync('server/data/apadana.json', 'utf8'));
  for (const uid of approval.baseline_ids) {
    const oldLink = baseline.profile_objects[uid], { english: _english, match: _match, ...oldProfile } = oldLink;
    assert.deepEqual(APADANA_PROFILES[uid], oldProfile, `${uid} previous profile exact`);
    assert.deepEqual(manifest.links[uid], oldLink, `${uid} previous source link exact`);
  }
  assert.equal(digest(JSON.stringify(canonBeforeFour(data.canon))), baseline.canon_logical_sha256, 'This intake cannot change canonical words, boundaries or locator revisions');
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], g = golden(uid), u = data.byId.get(uid), book = data.canon.books[u.book];
    assert.equal(p, THERA_APADANA_PROFILES[uid]);
    assert.deepEqual(p, independent.approved_profile_objects[uid], `${uid} exact independently approved literal profile`);
    assert.equal(p.poem, g.poem); assert.equal(p.title, g.title); assert.equal(p.translation_revision, APADANA_COMMIT);
    assert.equal(p.license, 'CC BY-NC-SA 4.0'); assert.equal(p.translator, 'Jonathan S. Walters');
    assert.match(p.reference, /complete publisher-edition poem/);
    assert.match(p.mapping_notes.join(' '), /not a line-complete/);
    assert.deepEqual(p.mapping_notes, g.mapping_notes);
    const review = reviews.flatMap(row => row.poems).filter(row => row.id === uid);
    assert.equal(review.length, 1, `${uid} independent complete semantic review`);
    assert.equal(review[0].poem, p.poem);
    for (const key of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256']) assert.equal(p[key], g[key]);
    assert.equal(rootDigest(u, book), g.root.root_sha256); assert.equal(p.root_sha256, g.root.root_sha256);
    assert.deepEqual(p.stanza_layout, g.stanza_layout); assert.deepEqual(p.note_numbers, g.note_numbers);
    assert.equal(u.index_revision, undefined, 'This source intake cannot add any mapping revision');
    for (const key of scopes) {
      if (p[key]) for (const field of ['body_sha256', 'notes_sha256', 'note_numbers', 'root_start', 'root_end', 'root_sha256', 'first_ref', 'last_ref']) assert.deepEqual(p[key][field], g[key][field]);
      else if (key === 'publisher_preface') {
        // Golden preface audit metadata is not a runtime note-owned descriptor.
        assert.equal(g.publisher_preface.body_sha256, p.paratext_sha256);
        assert.deepEqual(g.publisher_preface.note_numbers, []);
      } else assert.ok(!g[key] || Array.isArray(g[key]) && g[key].length === 0);
    }
    validateLink(p, uid, u, book);
    assert.ok(Object.isFrozen(p) && Object.isFrozen(p.stanza_layout));
  }
  assert.equal(approval.expected_profile_ids.includes('tha-ap223'), false, 'Publisher221 remains outside this frozen historical source cohort');
  assert.equal(approval.expected_profile_ids.includes('tha-ap233'), false, 'Publisher231 remains outside this frozen historical cohort');
  for (const uid of ['tha-ap72', 'tha-ap142', 'tha-ap160', 'tha-ap161', 'tha-ap12', 'tha-ap262']) assert.equal(APADANA_PROFILES[uid], undefined);
  for (const row of rights) { assert.equal(row.license, 'CC BY-NC-SA 4.0'); assert.equal(row.live_only, true); assert.equal(row.media_fetches, 0); }
});

test('source-enabled 141–180 intake verifies all38raw Gitblobs,312paragraphs,198entries and144poem notes', { skip: !checkout }, () => {
  let paragraphs = 0, entries = 0, poemNotes = 0;
  for (const input of inputs) for (const artifact of [...input.rights, input.publisher_routing]) {
    const raw = readFileSync(join(checkout, artifact.path));
    assert.equal(raw.length, artifact.bytes); assert.equal(digest(raw), artifact.raw_sha256); assert.equal(blob(raw), artifact.git_blob_sha1);
  }
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], g = golden(uid), raw = Buffer.from(source(p)), value = parseApadana(raw.toString(), p);
    assert.equal(raw.length, g.bytes); assert.equal(digest(raw), g.raw_sha256); assert.equal(blob(raw), g.git_blob_sha1);
    assert.equal(digest(value.text), g.body_sha256); assert.equal(digest(JSON.stringify(value.translator_notes)), g.notes_sha256);
    assert.equal(digest(value.publisher_paratext), g.paratext_sha256);
    const body = value.text.split('\n\n'); assert.equal(body.length, g.body_paragraphs.length); paragraphs += body.length;
    for (const row of g.body_paragraphs) {
      assert.equal(digest(body[row.paragraph]), row.sha256); assert.equal(body[row.paragraph].split('\n').length, row.lines);
    }
    assert.deepEqual(value.translator_notes.map(note => note.number), g.note_numbers); poemNotes += value.translator_notes.length;
    for (const note of g.notes.filter(row => row.owner === 'poem')) assert.equal(digest(value.translator_notes.find(row => row.number === note.number).text), note.body_sha256);
    entries += p.stanza_layout.length; assertScopes(value, p, true);
  }
  assert.deepEqual({ paragraphs, entries, poemNotes }, { paragraphs: 312, entries: 198, poemNotes: 144 });
  for (const uid of ['tha-ap152', 'tha-ap162', 'tha-ap172', 'tha-ap182']) assert.deepEqual(parseApadana(source(APADANA_PROFILES[uid]), APADANA_PROFILES[uid]).chapter_summary.translator_notes, []);
});

test('source-enabled finite labels and physical paragraphs remain intact while quotations exclude every apparatus owner', { skip: !checkout }, () => {
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], value = parseApadana(source(p), p), body = value.text.split('\n\n');
    const quote = quotationText({ ...value, translation_id: tid(p), translation_revision: APADANA_COMMIT });
    const chunks = quote.split('\n\n'); assert.equal(chunks.length, p.stanza_layout.length);
    for (const [i, layout] of p.stanza_layout.entries()) {
      assert.equal(chunks[i].split('\n').length, layout.lines);
      const labels = layout.entries || [layout];
      for (const entry of labels) assert.ok(!chunks[i].includes(entry.suffix), `${uid} excludes exact label ${entry.suffix}`);
    }
    for (const excluded of [body[0], body.at(-1), value.publisher_paratext, value.chapter_summary?.text, value.collection_summary?.text].filter(Boolean)) assert.ok(!quote.includes(excluded));
    for (const patch of [{ text: value.text + ' changed' }, { translation_scope: {} }, { whole_unit_coverage: false }, { translation_id: 'ap:chapter-3/poem-158' }]) {
      assert.throws(() => quotationText({ ...value, translation_id: tid(p), ...patch }), /differs/);
    }
  }
  const text = uid => parseApadana(source(APADANA_PROFILES[uid]), APADANA_PROFILES[uid]).text;
  assert.match(text('tha-ap147'), /\[then\n/, 'Original unclosed interpolation stays open');
  const compound = text('tha-ap153').split('\n\n')[1];
  assert.equal(compound.split('\n').length, 8);
  assert.match(compound, /\(1-2\) \[1993-1994\]$/);
  assert.match(text('tha-ap155'), /\[Note 3\]\(1\) \[2007\]/, 'No space inserted between the note and original local label');
  const data = canon.load(), u = data.byId.get('tha-ap158'), book = data.canon.books[u.book];
  const colophons = book.blocks.slice(u.start, u.end).filter(b => b[0] === 'gathalast' && !b[1] && b[2].endsWith('abhāsitthāti;'));
  assert.equal(colophons.length, 1, 'Original unnumbered VRI speech colophon retains gathalast rendering');
  assert.ok(canon.segments(u).some(segment => segment.type === 'verse' && segment.text.includes(colophons[0][2])), 'Existing source segment grouping is retained without fabricating a stanza');
});

test('source-enabled unreviewed wording, profile fields, layout shapes and held transport refuse', { skip: !checkout }, async () => {
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], raw = source(p);
    for (const changed of [raw + '\n', raw.replace('category: chapter-3', 'category: chapter-4'), raw.replace(/^order: \d+$/m, 'order: 158')]) assert.throws(() => parseApadana(changed, p), /differs/);
    for (const patch of [{ id: 'tha-ap160' }, { poem: 158 }, { stanza_layout: [] }, { note_numbers: [999] }, { raw_sha256: digest(raw + '\n') }, { chapter_summary: {} }, { publisher_divisions: [] }, { editorial_gap: {} }]) assert.throws(() => parseTheraApadana(raw, { ...p, ...patch }), /differs/);
  }
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('Held source transport'); };
  for (const poem of ['010', '070', '140', '158', '159', '260', '570']) {
    const url = `https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`;
    assert.equal(isApadanaRawUrl(url), false); await assert.rejects(fetchPublic(url, { json: false }), /outside the supported public sources/);
  }
  assert.equal(calls, 0);
});

test('source-enabled all38API pages retain rights, scopes, exact continuation and refuse stale cached metadata', { skip: !checkout }, async () => {
  const calls = []; pinnedFetch(calls); const data = canon.load();
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], u = data.byId.get(uid), choice = english.available(u).find(row => row.translation_id === tid(p));
    assert.ok(choice); assertScopes(choice, p, false); validateApadanaChoice(choice, uid);
    const context = { uid, choices: english.available(u), accepted: null };
    let args = { limit: 500, translation_revision: APADANA_COMMIT }, body = '', first;
    while (args) {
      const value = await english.translation(u, tid(p), args); first ??= value; body += value.text;
      assert.equal(value.license, 'CC BY-NC-SA 4.0'); assert.match(value.attribution, /Jonathan S\. Walters and Whitman College/);
      assert.deepEqual(value.mapping_notes, p.mapping_notes); for (const note of p.mapping_notes) assert.ok(value.notes.includes(note));
      assertScopes(value, p, true); validateApadanaChoice(value, uid, true);
      assert.deepEqual(validateEnglishPage(value, { uid, translation: tid(p), ...args }, context), value.continue_with?.arguments || null);
      const changedNotes = value.translator_notes.map(note => ({ ...note, text: note.text + ' changed' }));
      for (const patch of [{ mapping_notes: [] }, { notes: [] }, { translator_notes: [] }, { translator_notes: changedNotes }, { translator_notes: changedNotes, notes_sha256: digest(JSON.stringify(changedNotes)) }, { chapter_summary: p.chapter_summary ? null : {} }, { editorial_gap: {} }, { publisher_divisions: [] }]) assert.throws(() => validateEnglishPage({ ...value, ...patch }, { uid, translation: tid(p), ...args }, context), `${uid} ${Object.keys(patch)}`);
      args = value.continue_with?.arguments;
    }
    assert.equal(digest(body), p.body_sha256);
    for (const options of [{ offset: 500 }, { translation_revision: '0'.repeat(40) }, { allow_partial: true }, { allow_shared: true }]) await assert.rejects(english.translation(u, tid(p), options));
    if (first.continue_with) await assert.rejects(english.translation(u, tid(p), { ...first.continue_with.arguments, prefix_sha256: '0'.repeat(64) }), /prefix changed/);
    const widget = await readPassage({ uid, translation: tid(p), englishCharacters: 500 });
    assert.ok(!widget.english_error, widget.english_error); assertScopes(widget.english, p, true);
    const start = u.start, beforeRootMutation = calls.length;
    try {
      u.start += 1;
      await assert.rejects(english.translation(u, tid(p), { translation_revision: APADANA_COMMIT }));
      assert.equal(calls.length, beforeRootMutation, 'A changed canonical source span refuses before transport');
    } finally { u.start = start; }
    const link = data.translations[uid].find(row => canon.translationId(row) === tid(p)), original = structuredClone(link);
    for (const patch of [{ license: 'CC0' }, { root_sha256: '0'.repeat(64) }, { stanza_layout: [] }, { note_numbers: [999] }, { chapter_summary: null }, { index_revision: 'unreviewed' }, { publisher_preface: {} }]) {
      Object.assign(link, patch); const before = calls.length;
      try { await assert.rejects(english.translation(u, tid(p), { translation_revision: APADANA_COMMIT })); assert.equal(calls.length, before, 'Warmed source metadata refuses before another fetch'); }
      finally { for (const key of Object.keys(link)) delete link[key]; Object.assign(link, structuredClone(original)); }
    }
  }
});
