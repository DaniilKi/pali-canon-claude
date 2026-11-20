/** Exact source-scope curation, separate from production profile derivation. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as canon from '../../src/canon.mjs';
import * as english from '../../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT, isApadanaRawUrl } from '../../src/apadana-profiles.mjs';
import { THERA_APADANA_PROFILES } from '../../src/apadana-thera-profiles.mjs';
import { parseTheraApadana } from '../../src/apadana-thera.mjs';
import { parseApadana, quotationText, digest, rootDigest, validateLink } from '../../src/apadana.mjs';
import { fetchPublic } from '../../src/http.mjs';
import { CURRENT_APADANA_IDS } from './apadana-intake-expectations.mjs';
import { readPassage } from '../../src/chatgpt-widget.mjs';
import { validateApadanaChoice, validateEnglishPage } from '../../web/translation-policy.mjs';

import {remainingEvidence} from './thera-remaining-evidence.mjs';

export function registerRemainingSourceTests(batch){
const {approval,group,combined,independent,baseline,inputs,reviews,rights,sourceApproval,previous,expectedProfiles,expectedLinks,independentlyNormalized,approved,golden,peerGolden}=remainingEvidence(batch);
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

test('group '+batch+' intake is exactly independently approved9 and preserves all266 prior profiles and links', () => {
  assert.equal(approval.status, 'approved');
  assert.equal(approval.base_commit, 'cdbefd514164a559bc5aaab631c267f3084e31a6');
  assert.equal(independent.baseline, approval.base_commit);
  assert.equal(independent.status, batch==='A'?'SOURCE_AND_NORMALIZATION_APPROVED_9_ONLY_GROUP_A':'APPROVE_NINE_GROUP_B_SOURCE_AND_FINITE_NORMALIZATION_SCOPES_ONLY');
  assert.equal(independent.runtime_approval, false);
  assert.equal((batch==='A'?independent.external_activation_count:independent.external_activations), 0);
  assert.deepEqual(sourceApproval.approved_ids, approved);
  assert.equal(sourceApproval.normalization_approval_count, 9);
  assert.equal(sourceApproval.external_activations, 0);
  assert.equal(independent.publisher_revision, APADANA_COMMIT);
  assert.deepEqual(approved, independent.approved_ids);
  assert.equal(approved.length, 9);
  assert.deepEqual(approved, approval.approved_records.map(row => row.id));
  assert.equal(approval.baseline_ids.length, 266);
  assert.deepEqual(approval.baseline_ids, previous.expected_profile_ids, 'Exact preceding266 curation chain');
  assert.deepEqual(approval.baseline_records, [...previous.baseline_records, ...previous.approved_records]);
  assert.equal(baseline.baseline, approval.base_commit);
  for (const [group, entries] of Object.entries({ canonical_and_source_data: baseline.canonical_and_source_data, privacy_storage_files: baseline.privacy_storage_files, helper_builder_auditor_files: baseline.helper_builder_auditor_files, historical_evidence_files: baseline.historical_evidence_files })) {
    for (const [path, hash] of Object.entries(entries)) {
      if (path === 'server/data/apadana.json' || path === 'tests/helpers/apadana-intake-expectations.mjs') continue;
      assert.equal(digest(readFileSync(path)), hash, `${group}: existing ${path} is byte-exact`);
    }
  }
  const current284 = combined.expected_profile_ids;
  assert.equal(current284.length, 284);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0, 284), current284);
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  const data = canon.load(), manifest = JSON.parse(readFileSync('server/data/apadana.json', 'utf8'));
  for (const uid of approval.baseline_ids) {
    const oldLink = baseline.translation_objects[uid], oldProfile = baseline.profile_objects[uid];
    assert.deepEqual(APADANA_PROFILES[uid], oldProfile, `${uid} previous profile exact`);
    assert.deepEqual(manifest.links[uid], oldLink, `${uid} previous source link exact`);
  }
  assert.equal(digest(JSON.stringify(data.canon)), baseline.canon_logical_sha256, 'This intake cannot change canonical words, boundaries or locator revisions');
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], g = golden(uid), u = data.byId.get(uid), book = data.canon.books[u.book];
    assert.equal(p, THERA_APADANA_PROFILES[uid]);
    assert.deepEqual(p, expectedProfiles[uid], `${uid} source-author pure profile seal`);
    assert.deepEqual(manifest.links[uid], expectedLinks[uid], `${uid} exact source-author pure link seal`);
    assert.deepEqual(p, (batch==='A'?independent.approved_profile_objects[uid]:expectedProfiles[uid]), `${uid} exact independently approved literal profile`);
    assert.equal(p.path, `/text/chapter-3/poem-${String(g.poem).padStart(3, '0')}/`);
    assert.equal(p.raw_url, `https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/${g.path}`);
    assert.equal(p.poem, g.poem); assert.equal(p.title, g.title); assert.equal(p.translation_revision, APADANA_COMMIT);
    assert.equal(p.license, 'CC BY-NC-SA 4.0'); assert.equal(p.translator, 'Jonathan S. Walters');
    assert.match(p.reference, /complete publisher-edition poem/);
    assert.match(p.mapping_notes.join(' '), /not a line-complete/);
    assert.deepEqual(p.mapping_notes, g.mapping_notes);
    const review = reviews.flatMap(row => row.per_poem).filter(row => row.id === uid);
    assert.equal(review.length, 1, `${uid} source-author complete original-to-display comparison`);
    assert.equal(review[0].poem, p.poem);
    assert.equal(review[0].all_stanzas_notes_and_colophons_compared, true);
    assert.equal(review[0].body_paragraph_count, g.body_paragraphs.length);
    assert.equal(review[0].physical_stanza_count, g.physical_stanza_count);
    if(batch==='A')assert.equal(review[0].local_labels, g.printed_local_verse_label_count);
    assert.equal(review[0].poem_notes, g.note_count);
    const sourceRecord = sourceApproval.approved_records.filter(row => row.id === uid);
    assert.equal(sourceRecord.length, 1); assert.equal(sourceRecord[0].publisher_poem, p.poem);
    assert.equal(sourceRecord[0].source_approval, true); assert.equal(sourceRecord[0].normalization_approval, true);
    assert.deepEqual(sourceRecord[0].edition_caveats, p.mapping_notes);
    for (const key of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256']) assert.equal(sourceRecord[0][key], p[key]);
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
  for (const uid of ['tha-ap72', 'tha-ap142', 'tha-ap160', 'tha-ap161', 'tha-ap12', 'tha-ap236', 'tha-ap262']) assert.equal(APADANA_PROFILES[uid], undefined);
  for (const row of rights) { assert.equal(row.license, 'CC BY-NC-SA 4.0'); assert.equal(row.english_bodies_notes_and_apparatus_live_only, true); assert.equal(row.no_audio_or_media_rights, true); assert.equal(row.normalized_wording_changes, false); }
});

test('group '+batch+' source-enabled group remaining intake verifies own9raw Gitblobs, complete paragraphs/entries/labels and separate note owners', { skip: !checkout }, () => {
  let paragraphs = 0, entries = 0, labels = 0, poemNotes = 0, summaryNotes = 0, collectionNotes = 0;
  for (const input of inputs) for (const artifact of [...input.rights, input.publisher_routing]) {
    const raw = readFileSync(join(checkout, artifact.path));
    assert.equal(raw.length, artifact.bytes); assert.equal(digest(raw), artifact.raw_sha256); assert.equal(blob(raw), artifact.git_blob_sha1);
  }
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], g = golden(uid), peer = peerGolden(uid), raw = Buffer.from(source(p)), value = parseApadana(raw.toString(), p);
    assert.equal(peer.publisher_poem, p.poem); if(batch==='A')assert.equal(peer.source_path, g.path);
    for (const field of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256']) assert.equal(p[field], peer[field], uid + ' separate independent ' + field);
    assert.deepEqual(p.stanza_layout, peer.stanza_layout);
    assert.deepEqual(value.text.split('\n\n').map(digest), peer.body_paragraph_sha256s);
    assert.deepEqual(value.translator_notes.map(note => digest(note.text)), (batch==='A'?peer.note_text_sha256s:peer.note_text_sha256s.map(row=>row.sha256)));
    if(batch==='A')assert.equal(digest(quotationText({ ...value, translation_id: tid(p) })), peer.quotation_text_sha256);
    assert.equal(digest(value.publisher_paratext), peer.preface.body_sha256);
    assert.deepEqual(peer.preface.note_numbers, []);
    assert.equal(raw.length, g.bytes); assert.equal(digest(raw), g.raw_sha256); assert.equal(blob(raw), g.git_blob_sha1);
    assert.equal(digest(value.text), g.body_sha256); assert.equal(digest(JSON.stringify(value.translator_notes)), g.notes_sha256);
    assert.equal(digest(value.publisher_paratext), g.paratext_sha256);
    const body = value.text.split('\n\n'); assert.equal(body.length, g.body_paragraphs.length); paragraphs += body.length;
    for (const row of g.body_paragraphs) {
      assert.equal(digest(body[row.paragraph]), row.sha256); assert.equal(body[row.paragraph].split('\n').length, row.lines);
    }
    assert.deepEqual(value.translator_notes.map(note => note.number), g.note_numbers); poemNotes += value.translator_notes.length;
    for (const note of g.notes.filter(row => row.owner === 'poem')) assert.equal(digest(value.translator_notes.find(row => row.number === note.number).text), note.body_sha256);
    entries += p.stanza_layout.length;
    for (const stanza of p.stanza_layout) {
      const bounds = stanza.local_label.split('-').map(Number);
      assert.ok(bounds.length <= 2 && bounds.every(Number.isInteger));
      labels += bounds.length === 2 ? bounds[1] - bounds[0] + 1 : 1;
    }
    summaryNotes += value.chapter_summary?.translator_notes.length || 0;
    collectionNotes += value.collection_summary?.translator_notes.length || 0;
    assertScopes(value, p, true);
  }
  assert.deepEqual({ paragraphs, entries, labels, poemNotes, summaryNotes, collectionNotes },
    { paragraphs: batch==='A'?60:63, entries: batch==='A'?33:36, labels: batch==='A'?33:36, poemNotes: batch==='A'?26:34, summaryNotes: 0, collectionNotes: 0 });
  for (const uid of approved.filter(uid=>APADANA_PROFILES[uid].chapter_summary)) assert.deepEqual(parseApadana(source(APADANA_PROFILES[uid]), APADANA_PROFILES[uid]).chapter_summary.translator_notes, []);
});

test('group '+batch+' finite literal paired displays, chapter ownership and note-free prefaces retain original boundaries', { skip: !checkout }, () => {
  let pairCount=0,prefaces=0,summaries=0;
  for(const uid of approved){
    const profile=APADANA_PROFILES[uid],record=golden(uid),raw=source(profile),parsed=parseApadana(raw,profile);
    const spans=[...raw.matchAll(/\[([^\[\]\n]+)\]\{\.diacritics data-state=on\}\[([^\[\]\n]+)\]\{\.no-diacritics data-state=off\}/g)];
    const inventory=record.presentation_recipe.paired_markdown_display_inventory;
    assert.equal(spans.length,inventory.reduce((n,row)=>n+row.occurrences,0));pairCount+=spans.length;
    for(const row of inventory){
      const token=`[${row.diacritic}]{.diacritics data-state=on}[${row.alternate}]{.no-diacritics data-state=off}`;
      assert.equal(digest(token),row.raw_sha256);assert.equal(digest(row.diacritic),row.rendered_sha256);
      assert.ok(['poem','note1','note2','note3'].includes(row.owner));
    }
    const shapeChanges=spans.length?[
      raw.replace('.diacritics data-state=on','.diacritics data-state=off'),
      raw.replace('.no-diacritics data-state=off','.foreign data-state=off'),
      raw.replace(spans[0][0],spans[0][1]),
      raw.replace(spans[0][0],spans[0][0]+spans[0][0]),
    ]:[];
    for(const changed of shapeChanges){
      assert.notEqual(changed,raw);assert.throws(()=>parseApadana(changed,profile),/differs/);
      assert.throws(()=>parseTheraApadana(changed,{...profile,raw_sha256:digest(changed)}),/differs/,'A forged artifact hash cannot authorize another literal display shape');
    }
    if(parsed.publisher_paratext){prefaces++;assert.equal(uid,batch==='A'?'tha-ap233':'tha-ap253');}
    else assert.equal(parsed.publisher_paratext,'',uid+' authentic empty preface');
    assert.deepEqual(record.publisher_preface.note_numbers,[]);
    if(parsed.chapter_summary){
      summaries++;assert.equal(batch,'A');assert.equal(uid,'tha-ap242');
      const parts=parsed.chapter_summary.text.split('\n\n');assert.equal(parts.length,3);
      for(const row of record.chapter_summary.paragraphs){assert.equal(digest(parts[row.paragraph]),row.sha256);assert.equal(parts[row.paragraph].split('\n').length,row.lines);}
      assert.deepEqual(parsed.chapter_summary.translator_notes,[]);
      assert.equal(record.chapter_summary.publisher_stated_total,38);assert.equal(record.chapter_summary.approved_subset_entries,33);
      assert.equal(record.chapter_summary.publisher_stated_total-record.chapter_summary.approved_subset_entries,5,'Original38 includes the held five-stanza source234');
      assert.equal(record.chapter_summary.held_publisher_poem,234);assert.equal(record.chapter_summary.held_canonical_id,'tha-ap236');
      assert.equal(APADANA_PROFILES['tha-ap236'],undefined);
      const warning=profile.mapping_notes.find(note=>note.includes('38')&&note.includes('33')&&note.includes('234'));
      assert.ok(warning,'The original full chapter count cannot imply approval of held poem234');
    }
  }
  assert.equal(pairCount,batch==='A'?4:14);assert.equal(prefaces,1);assert.equal(summaries,batch==='A'?1:0);
});

test('group '+batch+' all284 reviewed source links bind optional citation and joined-colophon fields by presence as well as value', () => {
  const data = canon.load();
  for (const p of Object.values(APADANA_PROFILES)) {
    const u = data.byId.get(p.id), book = data.canon.books[u.book];
    for (const key of ['exact_ref_url', 'colophons_share_physical_paragraph']) {
      const changed = { ...p };
      if (Object.hasOwn(p, key)) delete changed[key];
      else changed[key] = undefined;
      assert.throws(() => validateLink(changed, p.id, u, book), /differs/, `${p.id} ${key} presence`);
      const replacement = key === 'exact_ref_url' ? 'https://example.invalid/foreign' : !p[key];
      assert.throws(() => validateLink({ ...p, [key]: replacement }, p.id, u, book), /differs/, `${p.id} ${key} value`);
    }
  }
});

test('group '+batch+' source-enabled finite labels and physical paragraphs remain intact while quotations exclude every apparatus owner', { skip: !checkout }, () => {
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], value = parseApadana(source(p), p), body = value.text.split('\n\n');
    const quote = quotationText({ ...value, translation_id: tid(p), translation_revision: APADANA_COMMIT });
    const chunks = quote.split('\n\n'); assert.equal(chunks.length, p.stanza_layout.length);
    for (const [i, layout] of p.stanza_layout.entries()) {
      assert.equal(chunks[i].split('\n').length, layout.lines);
      const labels = layout.entries || [layout];
      for (const entry of labels) assert.ok(!chunks[i].includes(entry.suffix), `${uid} excludes exact label ${entry.suffix}`);
    }
    for (const excluded of [body[0], body.at(-2), body.at(-1), value.publisher_paratext, value.chapter_summary?.text, value.collection_summary?.text].filter(Boolean)) assert.ok(!quote.includes(excluded));
    for (const note of value.translator_notes) assert.ok(!quote.includes(note.text), `${uid} note wording excluded`);
    const expectedQuote = p.stanza_layout.map((layout, index) => body[index + 1].replace(/\[Note \d+\]/g, '').trim().slice(0, -layout.suffix.length).trim()).join('\n\n');
    assert.equal(quote, expectedQuote, `${uid} only source stanza wording is quotation evidence`);
    for (const patch of [{ text: value.text + ' changed' }, { translation_scope: {} }, { whole_unit_coverage: false }, { translation_id: 'ap:chapter-3/poem-158' }]) {
      assert.throws(() => quotationText({ ...value, translation_id: tid(p), ...patch }), /differs/);
    }
  }

});

test('group '+batch+' source-enabled unreviewed wording, profile fields, layout shapes and held transport refuse', { skip: !checkout }, async () => {
  for (const uid of approved) {
    const p = APADANA_PROFILES[uid], raw = source(p);
    for (const changed of [raw + '\n', raw.replace('category: chapter-3', 'category: chapter-4'), raw.replace(/^order: \d+$/m, 'order: 158')]) assert.throws(() => parseApadana(changed, p), /differs/);
    for (const patch of [{ id: 'tha-ap160' }, { poem: 158 }, { path: '/text/chapter-3/poem-234/' }, { raw_url: p.raw_url.replace(APADANA_COMMIT, '0'.repeat(40)) }, { translation_revision: '0'.repeat(40) }, { root_sha256: '0'.repeat(64) }, { body_sha256: '0'.repeat(64) }, { notes_sha256: '0'.repeat(64) }, { paratext_sha256: '0'.repeat(64) }, { stanza_layout: [] }, { note_numbers: [999] }, { raw_sha256: digest(raw + '\n') }, { publisher_preface: {} }, { chapter_summary: {} }, { publisher_divisions: [] }, { editorial_gap: {} }]) assert.throws(() => parseTheraApadana(raw, { ...p, ...patch }), /differs/);
  }
  let calls = 0; globalThis.fetch = async () => { calls++; throw Error('Held source transport'); };
  for (const poem of ['010', '070', '140', '158', '159', '234', '260', '570']) {
    const url = `https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-${poem}.md`;
    assert.equal(isApadanaRawUrl(url), false); await assert.rejects(fetchPublic(url, { json: false }), /outside the supported public sources/);
  }
  assert.equal(calls, 0);
});

test('group '+batch+' source-enabled own9API pages retain rights, scopes, exact continuation and refuse stale cached metadata', { skip: !checkout }, async () => {
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
    for (const patch of [{ license: 'CC0' }, { path: '/text/chapter-3/poem-234/' }, { raw_url: p.raw_url.replace(APADANA_COMMIT, '0'.repeat(40)) }, { translation_revision: '0'.repeat(40) }, { raw_sha256: '0'.repeat(64) }, { body_sha256: '0'.repeat(64) }, { notes_sha256: '0'.repeat(64) }, { paratext_sha256: '0'.repeat(64) }, { root_sha256: '0'.repeat(64) }, { stanza_layout: [] }, { note_numbers: [999] }, { chapter_summary: null }, { index_revision: 'unreviewed' }, { publisher_preface: {} }, { exact_ref_url: 'https://example.invalid/foreign' }, { colophons_share_physical_paragraph: !p.colophons_share_physical_paragraph }]) {
      Object.assign(link, patch); const before = calls.length;
      try { await assert.rejects(english.translation(u, tid(p), { translation_revision: APADANA_COMMIT })); assert.equal(calls.length, before, 'Warmed source metadata refuses before another fetch'); }
      finally { for (const key of Object.keys(link)) delete link[key]; Object.assign(link, structuredClone(original)); }
    }
  }
});

}
