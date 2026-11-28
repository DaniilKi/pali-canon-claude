/** Actual pinned publisher inputs; expectations derive from independently reverified source kit cc62a8ce. */
import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,rootDigest,validateLink} from '../src/apadana.mjs';
import {readPassage,WIDGET_VERSION} from '../src/chatgpt-widget.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {liveCache} from '../src/cache.mjs';
import {validateApadanaChoice,validateEnglishPage} from '../web/translation-policy.mjs';
import {intake380Authority} from './helpers/intake380-metadata.mjs';
import {readSixRegularRelative} from './helpers/six-regular-file.mjs';
import {view} from './helpers/widget-view.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IDS = ['tha-ap403', 'tha-ap404'];
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const source = {skip: !checkout, timeout: 30000};
const sha = value => createHash('sha256').update(value).digest('hex');
const objectSha = value => sha(JSON.stringify(value));
const tid = id => 'ap:chapter-3/poem-' + EXPECTED.poems[id].publisher_poem;
// Read the independently published hash-only source kit, never application output.
const SOURCE_KIT = new URL('../docs/source-preparation/thera401-402/proposal/derived-v1/public/', import.meta.url);
function sourceDocument(name, expectedSha) {
  const bytes = readFileSync(new URL(name, SOURCE_KIT)); assert.equal(sha(bytes), expectedSha);
  return JSON.parse(bytes);
}
const sourceGoldens = sourceDocument('SOURCE_DERIVED_GOLDENS.json', '6658c027a133048622bc1d3a6ac82a41d699594c3679b6c6effc01a3ccc1b718');
const sourceProfiles = sourceDocument('PROPOSED_PROFILES.json', 'e2bc9b358af5bf952ad3f97f7bdab567e4e057a2e66437e2d88cbb2e370f9133');
const sourceInputs = sourceDocument('INPUT_PINS.json', '5b55ca611f278b1e738a66b02e04df8616592989dabf2d3a5b59d4b562d72b12');
const EXPECTED = {
  rights: sourceInputs.files.filter(row => row.file.includes('/publisher-source/')).slice(0, 6).map(row => ({...row, path:row.file.split('/publisher-source/')[1]})),
  poems: Object.fromEntries(IDS.map(id => [id, {
    ...sourceGoldens.entries[id],
    link_sha256: objectSha({...sourceProfiles[id],english:sourceProfiles[id].title,match:'individually-reviewed-whole-poem'})
  }]))
};
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; liveCache.clear(); });

function artifacts() {
  for (const row of EXPECTED.rights) {
    const bytes = readSixRegularRelative(checkout, row.path);
    assert.equal(bytes.length, row.bytes); assert.equal(sha(bytes), row.sha256);
    assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), row.git_blob_sha1);
  }
  return new Map(IDS.map(id => {
    const p = APADANA_PROFILES[id];
    const raw = readSixRegularRelative(checkout, 'src/_poems/chapter-3/poem-' + EXPECTED.poems[id].publisher_poem + '.md').toString('utf8');
    assert.equal(sha(raw), p.raw_sha256);
    return [p.raw_url, raw];
  }));
}

function exactContent(id, value) {
  const g = EXPECTED.poems[id];
  assert.equal(sha(value.text), g.body_sha256); assert.equal(value.text.length, g.body_characters_utf16);
  assert.equal(objectSha(value.translator_notes), g.notes_sha256_JSON_stringify);
  assert.deepEqual(value.translator_notes.map(n => n.number), g.note_numbers);
  for (const row of g.note_owners) {
    const note = value.translator_notes.find(n => n.number === row.number);
    assert.equal(sha(note.text), row.text_sha256); assert.equal(note.text.length, row.characters_utf16);
    assert.deepEqual(value.text.split('\n\n').flatMap((text, i) => text.includes('[Note ' + row.number + ']') ? ['body:' + i] : []), [row.owner]);
  }
  assert.equal(sha(value.publisher_paratext), g.paratext_sha256);
  assert.equal(value.publisher_paratext.length, g.paratext_characters_utf16);
  for (const key of ['publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap']) assert.equal(Object.hasOwn(value, key), false);
}

test('publisher401/402 exact sources retain382 choices, all speaker lines,36 notes and combined4–5 stanza', source, () => {
  const baseline = intake380Authority(ROOT), manifest = JSON.parse(readFileSync(resolve(ROOT, 'server/data/apadana.json')));
  assert.equal(baseline.ids.length, 380);
  assert.deepEqual(Object.keys(APADANA_PROFILES), baseline.ids.concat(IDS));
  assert.deepEqual(Object.keys(manifest.links), baseline.ids.concat(IDS));
  for (const id of baseline.ids) { assert.deepEqual(APADANA_PROFILES[id], baseline.profiles[id]); assert.deepEqual(manifest.links[id], baseline.links[id]); }
  assert.deepEqual(manifest.held, baseline.manifest.held);
  for (const publisher of [391,392,393,403,404,405,408,409,410]) assert.equal(Object.values(APADANA_PROFILES).some(p => p.publisher_chapter === 'chapter-3' && p.poem === publisher), false);
  const raw = artifacts(), corpus = canon.load(); let paragraphs = 0, notes = 0, quotes = 0;
  for (const id of IDS) {
    const p = APADANA_PROFILES[id], g = EXPECTED.poems[id], text = raw.get(p.raw_url), value = parseApadana(text, p);
    assert.equal(objectSha(p), g.full_proposed_profile_sha256_JSON_stringify); assert.equal(objectSha(manifest.links[id]), g.link_sha256);
    assert.deepEqual(Object.keys(value), ['title','text','translator_notes','publisher_paratext']); assert.equal(value.title, g.title); exactContent(id, value);
    const parts = value.text.split('\n\n'); assert.equal(parts.length, g.body_paragraphs.length);
    for (const row of g.body_paragraphs) {
      const part = parts[row.paragraph_index0]; assert.equal(sha(part), row.text_sha256); assert.equal(part.length, row.characters_utf16);
      assert.equal(part.split('\n').length, row.lines); assert.equal(value.text.slice(row.body_start_utf16, row.body_end_utf16), part);
      assert.deepEqual([...part.matchAll(/\[Note (\d+)\]/g)].map(m => Number(m[1])), row.original_note_numbers);
    }
    const stanzaQuotes = quotationText({...value, translation_id: tid(id)}).split('\n\n'); assert.equal(stanzaQuotes.length, g.quotation_proofs.length);
    for (const [i, row] of g.quotation_proofs.entries()) { assert.equal(sha(stanzaQuotes[i]), row.text_sha256); assert.equal(stanzaQuotes[i].length, row.characters_utf16); assert.equal(stanzaQuotes[i].split('\n').length, row.lines); }
    const unit = corpus.byId.get(id); assert.equal(rootDigest(unit, corpus.canon.books[unit.book]), g.root_wrapper_sha256_JSON_stringify);
    assert.equal(validateLink(manifest.links[id], id, unit, corpus.canon.books[unit.book]), p);
    // Removing/relabelling a speaker line or changing source notes/paratext must fail, even with the same byte length.
    assert.throws(() => parseApadana(text.replace('### ', '### X'), p));
    assert.throws(() => parseApadana(text.replace('[^3]', '[^4]'), p));
    const speaker = id === 'tha-ap403' ? p.stanza_layout.findIndex(s => s.lines === 5) : -1;
    if (speaker >= 0) {
      const label = parts[speaker + 1].split('\n')[0].replace(/[\[\]]/g, '\\$&');
      assert.ok(label); assert.ok(text.includes(label));
      const changed = text.replace(label, 'X'.repeat(label.length)); assert.notEqual(changed, text);
      assert.throws(() => parseApadana(changed, p));
    }
    if (id === 'tha-ap404') { assert.equal(p.stanza_layout[3].lines, 8); assert.equal(p.stanza_layout[3].local_label, '4-5'); assert.equal(p.stanza_layout[3].publisher_label, '3922-3923'); }
    paragraphs += parts.length; notes += value.translator_notes.length; quotes += stanzaQuotes.length;
  }
  assert.deepEqual({paragraphs, notes, quotes}, {paragraphs:49, notes:36, quotes:43});
});

test('publisher401/402 actual API, citations and both widget hosts preserve source and edition guards', source, async () => {
  const raw = artifacts(), calls = [];
  globalThis.fetch = async input => { const url = typeof input === 'string' ? input : input.href; assert.ok(raw.has(url), 'Only the two pinned publisher artifacts'); calls.push(url); return new Response(raw.get(url), {headers:{'content-type':'text/plain; charset=utf-8'}}); };
  let pages = 0; assert.equal(WIDGET_VERSION, 'v50');
  for (const id of IDS) {
    const p = APADANA_PROFILES[id], g = EXPECTED.poems[id], unit = canon.resolve(id).unit, translation = tid(id);
    const choices = english.available(unit); assert.ok(choices.some(c => c.translation_id === translation));
    let args = {translation_revision: APADANA_COMMIT, limit: 500}, assembled = '';
    for (const expected of g.pages500) {
      const page = await english.translation(unit, translation, args);
      assert.equal(page.text_id, id); assert.equal(page.translation_id, translation); assert.equal(page.translation_revision, APADANA_COMMIT);
      assert.equal(page.offset, expected.offset); assert.equal(page.text.length, expected.characters_utf16); assert.equal(sha(page.text), expected.text_sha256);
      assert.equal(page.prefix_sha256, expected.start_prefix_sha256); assert.equal(page.next_offset, expected.next_offset);
      assert.equal(objectSha(page.translator_notes), g.notes_sha256_JSON_stringify);
      validateEnglishPage(page, {uid:id,translation,...args}, {uid:id,choices,accepted:null}); assembled += page.text; pages++;
      if (expected.next_offset === null) assert.equal(page.continue_with, null);
      else { assert.equal(page.continue_with.arguments.prefix_sha256, expected.continuation_prefix_sha256); args = page.continue_with.arguments; }
    }
    assert.equal(sha(assembled), g.body_sha256);
    await assert.rejects(english.translation(unit, translation, {offset:500,limit:500,prefix_sha256:'0'.repeat(64),translation_revision:APADANA_COMMIT}));
    await assert.rejects(english.translation(unit, translation, {offset:500,limit:500,prefix_sha256:g.pages500[1].start_prefix_sha256}));
    const full = await readPassage({uid:id, translation, english_translation_revision:APADANA_COMMIT, englishCharacters:12000});
    assert.ok(full.english, full.english_error); exactContent(id, full.english); validateApadanaChoice(full.english, id, true);
    assert.equal(full.english.license, 'CC BY-NC-SA 4.0'); assert.deepEqual(full.english.mapping_notes, p.mapping_notes);
    const pali = await readPassage({uid:id,english:false}); assert.deepEqual(pali.pali.segments, full.pali.segments); assert.deepEqual(pali.source, full.source); assert.equal(pali.english, null);
    const back = await readPassage({uid:id,translation,english_translation_revision:APADANA_COMMIT,englishCharacters:12000}); exactContent(id, back.english);
    const firstQuote = quotationText({...parseApadana(raw.get(p.raw_url), p),translation_id:translation}).split('\n\n')[0];
    const verified = await verifyQuote({text:firstQuote,language:'english',texts:[id],translation_ids:[translation],limit:1});
    assert.equal(verified.scope.complete_source_versions_compared,1); assert.ok(verified.matches.some(m => m.text_id === id && m.translation_id === translation && m.translation_revision === APADANA_COMMIT));
    assert.equal(canon.resolve(unit.acronym).unit.id, id);
    for (const bridge of ['Apps SDK','MCP Apps']) {
      const host = view(bridge); host.output(structuredClone(full)); assert.ok(host.elements.english.textContent.includes(full.english.text));
      for (const notice of p.mapping_notes) assert.ok(host.elements.english.textContent.includes(notice));
      for (const change of [v => {v.text = 'X' + v.text.slice(1);}, v => {v.translator_notes[0].text += 'X';}, v => {v.publisher_paratext = v.publisher_paratext ? 'X' + v.publisher_paratext.slice(1) : ' ';}, v => {v.mapping_notes = [];}, v => {v.license = 'CC0';}]) {
        const changed = structuredClone(full); change(changed.english); assert.throws(() => validateApadanaChoice(changed.english,id,true));
        host.output(changed); assert.match(host.elements.english.textContent, /No English|No translation/); assert.ok(host.elements.pali.textContent.includes(full.pali.segments[0].text));
        host.output(structuredClone(full)); assert.ok(host.elements.english.textContent.includes(full.english.text));
      }
    }
    assert.equal(sha(pali.pali.segments.map(s => s.text).join('\n')), sha(full.pali.segments.map(s => s.text).join('\n')));
  }
  assert.equal(pages,16); assert.deepEqual([...new Set(calls)], IDS.map(id => APADANA_PROFILES[id].raw_url));
  const before = calls.length; const held = canon.resolve('tha-ap405').unit;
  await assert.rejects(english.translation(held,'ap:chapter-3/poem-403')); assert.equal(calls.length,before);
});
