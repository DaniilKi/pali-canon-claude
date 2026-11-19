/** Reusable per-poem gates driven by separately approved source-review goldens. */
import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES, APADANA_COMMIT, isApadanaRawUrl} from '../src/apadana-profiles.mjs';
import {THERA_APADANA_PROFILES} from '../src/apadana-thera-profiles.mjs';
import {parseApadana, quotationText, digest, rootDigest, validateLink} from '../src/apadana.mjs';
import {parseTheraApadana} from '../src/apadana-thera.mjs';
import {fetchPublic} from '../src/http.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {validateApadanaChoice, validateEnglishPage} from '../web/translation-policy.mjs';

const evidence = 'docs/evidence/apadana';
// This explicit curation record is authored from independent approvals, never generated from profiles.
const approval = JSON.parse(readFileSync(join(evidence, 'THERA_SCALED_APPROVAL.json'), 'utf8'));
assert.equal(approval.status, 'approved', 'Independent curation must authorize the exact intake subset');
const inputs = approval.goldens.map(input => {
  const raw = readFileSync(join(evidence, input.file));
  assert.equal(digest(raw), input.sha256, `Independent golden input ${input.file}`);
  return JSON.parse(raw);
});
const reviews = approval.source_reviews.map(input => {
  const raw = readFileSync(join(evidence, input.file));
  assert.equal(digest(raw), input.sha256, `Independent semantic source review ${input.file}`);
  const review = JSON.parse(raw);
  assert.equal(review.publisher_revision, approval.publisher_revision);
  assert.equal(review.baseline, approval.base_commit);
  return review;
});
const approved = approval.approved_ids;
const golden = uid => {
  const matches = inputs.flatMap(input => input.poems).filter(row => row.id === uid);
  assert.equal(matches.length, 1, `One independent golden for ${uid}`);
  return matches[0];
};
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const originalFetch = globalThis.fetch;
afterEach(() => {globalThis.fetch = originalFetch;});
const profile = uid => APADANA_PROFILES[uid];
const tid = p => canon.translationId(p);
const source = p => readFileSync(join(checkout, 'src/_poems', p.path.replace(/^\/text\//, '').replace(/\/$/, '.md')), 'utf8');
const parse = p => parseApadana(source(p), p);
const blob = raw => createHash('sha1').update('blob ' + raw.length + '\0').update(raw).digest('hex');
const scopeKeys = ['publisher_preface', 'chapter_summary', 'collection_summary', 'publisher_divisions', 'editorial_gap'];
function scopes(value, p, content) {
  for (const key of scopeKeys) {
    assert.equal(Object.hasOwn(value, key), Object.hasOwn(p, key), `${p.id} ${key} presence`);
    if (!Object.hasOwn(p, key)) continue;
    const expected = key === 'publisher_divisions' ? p[key] : [p[key]];
    const actual = key === 'publisher_divisions' ? value[key] : [value[key]];
    assert.equal(actual.length, expected.length);
    for (const [i, row] of actual.entries()) {
      const {text, translator_notes, ...descriptor} = row;
      assert.deepEqual(descriptor, expected[i]);
      if (content) {
        const body = key === 'publisher_preface' ? value.publisher_paratext : text;
        assert.equal(digest(body), descriptor.body_sha256);
        assert.equal(digest(JSON.stringify(translator_notes)), descriptor.notes_sha256);
        assert.deepEqual(translator_notes.map(note => note.number), descriptor.note_numbers);
      } else {
        assert.equal(text, undefined);
        assert.equal(translator_notes, undefined);
      }
    }
  }
}
function pinnedFetch(calls) {
  globalThis.fetch = async url => {
    const p = Object.values(APADANA_PROFILES).find(row => row.raw_url === url.href);
    assert.ok(p, 'Transport permits only a literal reviewed artifact');
    calls.push(p.id);
    return new Response(source(p));
  };
}

test('scaled intake keeps the explicit curation whitelist and all previous eighty-nine objects exact', () => {
  assert.equal(approval.schema, 'reviewed-apadana-intake-v1');
  assert.equal(approval.status, 'approved', 'Independent curation must authorize the exact intake subset');
  assert.equal(approval.base_commit, '64a336789ab5f4f02964ff3023ea6b26b330e406');
  assert.equal(approval.publisher_revision, APADANA_COMMIT);
  assert.equal(approval.baseline_ids.length, 89);
  assert.equal(new Set(approval.expected_profile_ids).size, approval.expected_profile_ids.length);
  assert.deepEqual(approval.expected_profile_ids, [...approval.baseline_ids, ...approved]);
  assert.deepEqual(Object.keys(APADANA_PROFILES), approval.expected_profile_ids);
  assert.equal(digest(JSON.stringify(Object.fromEntries(approval.baseline_ids.map(uid => [uid, profile(uid)])))), '9df8b7b5dafbbcfe4bb291e8c04f93bd51e95ec6ec24e71f8ca6c4a25e580263');
  assert.equal(digest(JSON.stringify(Object.fromEntries(approval.baseline_ids.filter(uid => uid.startsWith('tha-')).map(uid => [uid, THERA_APADANA_PROFILES[uid]])))), 'c6e4788c276823a80bf4ac624e87a415502ed57efe6b5bf2f2312c18e104f933');
  const manifest = JSON.parse(readFileSync('server/data/apadana.json', 'utf8'));
  // Baseline manifest591889ee… was independently bound to64a3367 before this intake.
  const oldLinks = Object.fromEntries(approval.baseline_ids.map(uid => [uid, manifest.links[uid]]));
  assert.equal(digest(JSON.stringify(oldLinks)), '342dbd656afb96fdd8ed95fdf92f116129a78204ab530addd3c80ec7501b157c');
  const data = canon.load();
  for (const uid of approved) {
    const p = profile(uid), g = golden(uid), u = data.byId.get(uid), book = data.canon.books[u.book];
    assert.equal(p, THERA_APADANA_PROFILES[uid]);
    assert.ok(Object.isFrozen(p)); assert.ok(Object.isFrozen(p.stanza_layout));
    assert.equal(p.id, g.id); assert.equal(p.poem, g.poem); assert.equal(p.title, g.title);
    assert.equal(p.publisher_chapter, 'chapter-3'); assert.equal(p.translation_revision, APADANA_COMMIT);
    assert.equal(p.license, 'CC BY-NC-SA 4.0'); assert.equal(p.translator, 'Jonathan S. Walters');
    assert.match(p.reference, /complete publisher-edition poem/);
    assert.match(p.mapping_notes.join(' '), /not a line-complete (?:VRI )?translation/);
    if (g.mapping_notes) assert.deepEqual(p.mapping_notes, g.mapping_notes, `${uid} independently recorded mandatory edition findings`);
    if (uid !== 'tha-ap44') {
      const findings = reviews.flatMap(review => review.poems).filter(row => row.id === uid);
      assert.equal(findings.length, 1, `${uid} independent full-source semantic review`);
      assert.equal(findings[0].poem, p.poem); assert.equal(findings[0].title, p.title);
      const mandatory = findings[0].mapping_notes || findings[0].edition_findings;
      assert.ok(Array.isArray(mandatory) && mandatory.length);
      for (const finding of mandatory) assert.ok(p.mapping_notes.includes(finding), `${uid} retains mandatory source finding`);
    }
    for (const key of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256']) assert.equal(p[key], g[key]);
    assert.equal(p.root_sha256, g.root.root_sha256); assert.equal(rootDigest(u, book), g.root.root_sha256);
    assert.deepEqual(p.note_numbers, g.note_numbers); assert.deepEqual(p.stanza_layout, g.stanza_layout);
    for (const key of ['chapter_summary', 'collection_summary', 'editorial_gap', 'publisher_divisions']) {
      const actual = p[key] ? (key === 'publisher_divisions' ? p[key] : [p[key]]) : [];
      const expected = g[key] ? (key === 'publisher_divisions' ? g[key] : [g[key]]) : [];
      assert.equal(actual.length, expected.length, `${uid} independently recorded ${key}`);
      for (const [i, descriptor] of actual.entries()) for (const field of ['body_sha256', 'notes_sha256', 'note_numbers', 'root_start', 'root_end', 'root_sha256', 'first_ref', 'last_ref', 'before_local_label', 'before_publisher_label', 'after_local_label', 'after_publisher_label']) {
        if (Object.hasOwn(expected[i], field) && (Object.hasOwn(descriptor, field) || ['body_sha256', 'notes_sha256', 'note_numbers'].includes(field))) assert.deepEqual(descriptor[field], expected[i][field], `${uid} ${key} ${field}`);
      }
      for (const row of expected) if (Number.isInteger(row.root_start)) assert.equal(rootDigest({...u, start: row.root_start, end: row.root_end}, book), row.root_sha256, `${uid} independent ${key} root context`);
    }
    validateLink(p, uid, u, book);
    assert.equal(u.index_revision, undefined, 'This source intake must not migrate saved canonical locators');
  }
  for (const uid of approval.held_ids) assert.equal(profile(uid), undefined, `${uid} remains held`);
});

test('source-enabled scaled intake replays each exact raw blob, paragraph, note and separately owned apparatus', {skip: !checkout}, () => {
  for (const input of inputs) for (const artifact of [...input.rights, input.publisher_routing]) {
    const raw = readFileSync(join(checkout, artifact.path));
    assert.equal(raw.length, artifact.bytes); assert.equal(digest(raw), artifact.raw_sha256); assert.equal(blob(raw), artifact.git_blob_sha1);
  }
  for (const uid of approved) {
    const p = profile(uid), g = golden(uid), raw = readFileSync(join(checkout, g.path)), value = parse(p), paragraphs = value.text.split('\n\n');
    assert.equal(digest(raw), g.raw_sha256); assert.equal(blob(raw), g.git_blob_sha1);
    assert.equal(digest(value.text), g.body_sha256); assert.equal(digest(JSON.stringify(value.translator_notes)), g.notes_sha256);
    assert.equal(digest(value.publisher_paratext), g.paratext_sha256); assert.deepEqual(value.translator_notes.map(note => note.number), g.note_numbers);
    assert.equal(paragraphs.length, g.body_paragraphs.length);
    for (const row of g.body_paragraphs) {assert.equal(digest(paragraphs[row.paragraph]), row.sha256); assert.equal(paragraphs[row.paragraph].split('\n').length, row.lines);}
    for (const row of g.notes.filter(note => note.owner === 'poem')) assert.equal(digest(value.translator_notes.find(note => note.number === row.number).text), row.body_sha256);
    scopes(value, p, true);
    for (const key of ['chapter_summary', 'collection_summary', 'editorial_gap']) if (g[key] && value[key]) {
      assert.equal(digest(value[key].text), g[key].body_sha256);
      for (const row of g[key].body_paragraphs || []) assert.equal(digest(value[key].text.split('\n\n')[row.paragraph]), row.sha256);
    }
  }
});

test('source-enabled scaled quotations contain exactly substantive printed stanza words', {skip: !checkout}, () => {
  for (const uid of approved) {
    const p = profile(uid), value = parse(p), full = {...value, translation_id: tid(p), translation_revision: APADANA_COMMIT};
    const quotation = quotationText(full), entries = quotation.split('\n\n'), paragraphs = value.text.split('\n\n');
    assert.equal(entries.length, p.stanza_layout.length);
    for (const [i, stanza] of p.stanza_layout.entries()) {
      const marked = paragraphs[i + 1].replace(/\[Note \d+\]/g, '').trim();
      assert.ok(marked.endsWith(stanza.suffix)); assert.equal(entries[i], marked.slice(0, -stanza.suffix.length).trim());
      assert.equal(entries[i].split('\n').length, stanza.lines);
    }
    for (const excluded of [paragraphs[0], paragraphs.at(-2), paragraphs.at(-1), value.publisher_paratext, value.chapter_summary?.text, value.collection_summary?.text, value.editorial_gap?.text, ...(value.publisher_divisions || []).map(row => row.text)].filter(Boolean)) assert.ok(!quotation.includes(excluded));
    for (const patch of [{translation_scope: {}}, {source_section: {}}, {partial_scope: {}}, {shared_scope: {}}, {section: {}}, {parts: []}, {whole_unit_coverage: false}, {translation_id: 'ap:chapter-3/poem-570'}, {text: value.text + 'Changed'}]) assert.throws(() => quotationText({...full, ...patch}), /differs/);
  }
});

test('source-enabled scaled source/profile mutations refuse and held or foreign URLs never reach transport', {skip: !checkout}, async () => {
  for (const uid of approved) {
    const p = profile(uid), raw = source(p);
    for (const changed of [raw + '\n', raw.replace('category: chapter-3', 'category: chapter-4'), raw.replace(/^order: \d+$/m, 'order: 570')]) {assert.notEqual(changed, raw); assert.throws(() => parseApadana(changed, p), /differs/);}
    for (const patch of [{id: 'tha-ap572'}, {poem: 570}, {publisher_chapter: 'chapter-4'}, {raw_sha256: digest(raw + '\n')}, {stanza_layout: []}, {note_numbers: [999]}, {chapter_summary: null}, {publisher_preface: {}}, {collection_summary: {}}, {publisher_divisions: []}, {editorial_gap: {}}]) assert.throws(() => parseTheraApadana(raw, {...p, ...patch}), /differs/);
  }
  let calls = 0;
  globalThis.fetch = async () => {calls++; throw Error('Unapproved transport');};
  for (const poem of ['010', '070', '101', '570']) {
    const url = `https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`;
    assert.equal(isApadanaRawUrl(url), false); await assert.rejects(fetchPublic(url, {json: false}), /outside the supported public sources/);
  }
  assert.equal(calls, 0);
});

test('source-enabled scaled APIs retain exact source ownership, notes, mandatory caveats and continuation pins', {skip: !checkout}, async () => {
  const calls = []; pinnedFetch(calls); const data = canon.load();
  for (const uid of approved) {
    const p = profile(uid), u = data.byId.get(uid), context = {uid, choices: english.available(u), accepted: null};
    const choice = english.available(u).find(row => row.translation_id === tid(p));
    scopes(choice, p, false); validateApadanaChoice(choice, uid);
    let args = {limit: 500, translation_revision: APADANA_COMMIT}, text = '', first;
    while (args) {
      const value = await english.translation(u, tid(p), args); first ??= value; text += value.text;
      scopes(value, p, true); validateApadanaChoice(value, uid, true);
      assert.deepEqual(value.translator_notes.map(note => note.number), p.note_numbers);
      assert.deepEqual(value.mapping_notes, p.mapping_notes);
      for (const finding of p.mapping_notes) assert.ok(value.notes.includes(finding));
      assert.deepEqual(validateEnglishPage(value, {uid, translation: tid(p), ...args}, context), value.continue_with?.arguments || null);
      for (const patch of [{mapping_notes: []}, {notes: []}, {translator_notes: undefined}, {translator_notes: [{number: 999, text: 'Foreign'}]}, {editorial_gap: p.editorial_gap ? null : {}}]) assert.throws(() => validateEnglishPage({...value, ...patch}, {uid, translation: tid(p), ...args}, context), `${uid} rejects ${Object.keys(patch).join(',')}`);
      args = value.continue_with?.arguments;
    }
    assert.equal(digest(text), p.body_sha256);
    for (const options of [{offset: 500}, {translation_revision: '0'.repeat(40)}, {allow_partial: true}, {allow_shared: true}]) await assert.rejects(english.translation(u, tid(p), options));
    if (first.continue_with) await assert.rejects(english.translation(u, tid(p), {...first.continue_with.arguments, prefix_sha256: '0'.repeat(64)}), /prefix changed/);
    const native = await readPassage({uid, translation: tid(p), englishCharacters: 500});
    assert.ok(!native.english_error, native.english_error); scopes(native.english, p, true); validateApadanaChoice(native.english, uid, true);
    const link = data.translations[uid].find(row => canon.translationId(row) === tid(p)), old = structuredClone(link);
    for (const patch of [{translation_revision: '0'.repeat(40)}, {license: 'CC0'}, {root_sha256: '0'.repeat(64)}, {note_numbers: [999]}, {chapter_summary: null}, {collection_summary: {}}, {publisher_divisions: []}, {editorial_gap: {}}]) {
      Object.assign(link, patch); const before = calls.length;
      try {await assert.rejects(english.translation(u, tid(p), {translation_revision: APADANA_COMMIT})); assert.equal(calls.length, before, 'Cached invalid ownership refuses before transport');}
      finally {for (const key of Object.keys(link)) delete link[key]; Object.assign(link, structuredClone(old));}
    }
  }
});
