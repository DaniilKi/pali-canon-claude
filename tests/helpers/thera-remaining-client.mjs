/** Client capabilities exercise original pinned source responses, never invented positive wording. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as canon from '../../src/canon.mjs';
import * as english from '../../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT } from '../../src/apadana-profiles.mjs';
import { digest, parseApadana } from '../../src/apadana.mjs';
import { readPassage, WIDGET_VERSION } from '../../src/chatgpt-widget.mjs';
import { validateEnglishPage } from '../../web/translation-policy.mjs';
import { validateComparisonPage } from '../../web/translation-comparison.mjs';
import { view } from './widget-view.mjs';

import {remainingEvidence} from './thera-remaining-evidence.mjs';
import {CURRENT_APADANA_IDS} from './apadana-intake-expectations.mjs';
import {held234Evidence} from './thera-held234-evidence.mjs';

export function registerRemainingClientTests(batch){
const {approval,combined,independent,baseline,inputs:goldens,approved,golden}=remainingEvidence(batch);
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
const previousFetch = globalThis.fetch;
const cases = new Map();
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
    ['body artifact', { body_sha256: '0'.repeat(64) }],
    ['preface artifact', { paratext_sha256: '0'.repeat(64) }],
    ['foreign fetched path', { fetched_url: profile.raw_url.replace('poem-', 'foreign-') }],
    ['foreign publisher path', { url: 'https://apadanatranslation.com/text/chapter-3/poem-234/' }],
    ['root artifact', { root_sha256: '0'.repeat(64) }],
    ['poem-note artifact', { notes_sha256: '0'.repeat(64) }],
    // Trailing whitespace preserves the old nonempty check, exercising exact content pins.
    ['phantom nonempty preface', { publisher_paratext: value.publisher_paratext + 'Unapproved preface' }],
    ['publisher preface content', { publisher_paratext: value.publisher_paratext + '\n' }],
    ['poem notes absent', { translator_notes: undefined }],
    ['same-count changed poem note', { translator_notes: changedNotes }],
    ['forged changed-poem-note hash', { translator_notes: changedNotes, notes_sha256: digest(JSON.stringify(changedNotes)) }],
    ['foreign preface descriptor', { publisher_preface: {} }],
    ['foreign division descriptor', { publisher_divisions: [] }],
    ['foreign editorial gap', { editorial_gap: {} }],
  ];
  profile.mapping_notes.forEach((note,index)=>rows.push(['mandatory displayed notice '+index,{notes:value.notes.filter(value=>value!==note)}]));
  if (profile.chapter_summary) {
    rows.push(['chapter summary content', { chapter_summary: { ...value.chapter_summary, text: value.chapter_summary.text + '\n' } }]);
    rows.push(['chapter summary absent', { chapter_summary: undefined }]);
    rows.push(['phantom chapter note', { chapter_summary: { ...value.chapter_summary, translator_notes: [{ number: 1, text: 'Unapproved chapter note' }] } }]);
    rows.push(['forged changed chapter hash', { chapter_summary: { ...value.chapter_summary, text: value.chapter_summary.text + '\n', body_sha256: digest(value.chapter_summary.text + '\n') } }]);
    rows.push(['chapter notes absent', { chapter_summary: { ...value.chapter_summary, translator_notes: undefined } }]);
    rows.push(['chapter owner', { chapter_summary: { ...value.chapter_summary, parent_id: approved.find(id => id !== profile.id) } }]);
  } else rows.push(['foreign chapter summary', { chapter_summary: {} }]);
  rows.push(['foreign collection summary', { collection_summary: {} }]);

  for (const [label, patch] of rows) assert.ok(Object.keys(patch).some(key => JSON.stringify(value[key]) !== JSON.stringify(patch[key])), profile.id + ' nonempty negative control: ' + label);
  return rows;
}

test('group '+batch+' new client capabilities preserve the independently frozen266 source contracts and exact approved scope', () => {
  assert.equal(approval.status, 'approved'); assert.equal(approval.base_commit, 'cdbefd514164a559bc5aaab631c267f3084e31a6');
  assert.equal(independent.baseline, approval.base_commit); assert.equal(independent.publisher_revision, APADANA_COMMIT);
  assert.deepEqual(approved, independent.approved_ids); assert.equal(approved.length, 9);
  assert.equal(approval.baseline_ids.length, 266);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0, 266), approval.baseline_ids);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,284), combined.expected_profile_ids);
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  assert.deepEqual(APADANA_PROFILES['tha-ap236'],held234Evidence().profiles['tha-ap236']);
  for (const id of approval.baseline_ids) {
    const profile = baseline.profile_objects[id];
    assert.deepEqual(APADANA_PROFILES[id], profile, id + ' previous source contract unchanged');
  }
  assert.equal(WIDGET_VERSION, 'v37');
  for (const id of approved) {
    const profile = APADANA_PROFILES[id], record = golden(id);
    assert.deepEqual(profile.mapping_notes, record.mapping_notes);
    for (const field of ['raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256']) assert.equal(profile[field], field === 'root_sha256' ? record.root.root_sha256 : record[field]);
  }
});

async function actualCase(id) {
  if (!cases.has(id)) {
    const profile = APADANA_PROFILES[id], unit = canon.resolve(id).unit, record = golden(id);
    const context = { uid: id, choices: english.available(unit), accepted: null };
    const args = { uid: id, translation: tid(profile), translation_revision: APADANA_COMMIT, limit: 500 };
    const first = await english.translation(unit, args.translation, { translation_revision: APADANA_COMMIT, limit: 500 });
    const widget = await readPassage({ uid: id, translation: tid(profile), englishCharacters: 500, limit: 2 });
    assert.ok(widget.english, widget.english_error);
    const parsed = parseApadana(artifact(profile), profile);
    cases.set(id, { profile, unit, record, context, args, first, widget, parsed });
  }
  return cases.get(id);
}
const scopeKeys = ['publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap'];
function scopedNotes(value) { return scopeKeys.flatMap(key => !value[key] ? [] : (Array.isArray(value[key]) ? value[key] : [value[key]])).flatMap(owner => owner.translator_notes || []); }
function assertSourceNotes(value, selected) {
  assert.deepEqual(value.translator_notes, selected.parsed.translator_notes);
  for (const key of scopeKeys) { assert.equal(Object.hasOwn(value,key),Object.hasOwn(selected.parsed,key)); if(selected.parsed[key])assert.deepEqual(value[key],selected.parsed[key]); }
}
function assertDisplayed(host, value, pali, id) {
  assert.ok(host.elements.english.textContent.includes(value.text), id+' actual source body displayed');
  for(const note of [...value.translator_notes,...scopedNotes(value)])assert.ok(host.elements.english.textContent.includes(note.text),id+' actual editorial note displayed');
  assert.ok(host.elements.pali.textContent.includes(pali),id+' Pāli retained');
}

test('group '+batch+' ALL9 actual source positives complete before mutations: original paged complete bodies/poemnotes/separate apparatus and both hosts', { skip: !checkout }, async () => {
  const calls=[];sourceTransport(calls);let poemNotes=0,apparatusNotes=0,bodyParagraphs=0;
  for(const id of approved){
    const selected=await actualCase(id),{profile,unit,context,record,parsed}=selected;
    poemNotes+=parsed.translator_notes.length;apparatusNotes+=scopedNotes(parsed).length;bodyParagraphs+=parsed.text.split('\n\n').length;
    const hosts=['MCP Apps','Apps SDK'].map(bridge=>({bridge,host:view(bridge)}));
    let request=selected.args,widget=selected.widget,body='';
    while(request){
      const{uid:_uid,translation,...options}=request;const value=await english.translation(unit,translation,options);body+=value.text;
      assert.equal(value.license,'CC BY-NC-SA 4.0');assert.match(value.attribution,/Jonathan S\. Walters and Whitman College/);assert.deepEqual(value.mapping_notes,record.mapping_notes);
      for(const note of record.mapping_notes)assert.ok(value.notes.includes(note));
      assertSourceNotes(value,selected);assertSourceNotes(widget.english,selected);assert.equal(digest(JSON.stringify(value.translator_notes)),record.notes_sha256);assert.equal(widget.english.text,value.text);
      const next=validateEnglishPage(value,request,context);assert.deepEqual(validateComparisonPage(value,request,context),next);
      for(const{host}of hosts){host.output(widget);assertDisplayed(host,value,widget.pali.segments[0].text,id);}
      if(next){assert.equal(widget.english.continue_with.arguments.english_offset,next.offset);widget=await readPassage({...widget.english.continue_with.arguments,englishCharacters:500});}else assert.equal(widget.english.continue_with,null);
      request=next;
    }
    assert.equal(digest(body),record.body_sha256);assert.equal(profile.body_sha256,record.body_sha256);
  }
  assert.equal(poemNotes,batch==='A'?26:34);assert.equal(apparatusNotes,0);assert.equal(bodyParagraphs,batch==='A'?60:63);
});

test('group '+batch+' all9 actual cached source mutations refuse individual comparison and both host English while preserving Pāli', { skip: !checkout }, async () => {
  const calls=[];sourceTransport(calls);
  for(const id of approved){
    const{profile,first,widget,args,context}=await actualCase(id),pali=widget.pali.segments[0].text;
    for(const bridge of ['MCP Apps','Apps SDK']){
      const host=view(bridge);host.output(widget);assertDisplayed(host,widget.english,pali,id);
      host.output({...structuredClone(widget),english:structuredClone(first)});assertDisplayed(host,first,pali,id);
      for(const[label,patch]of mutations(first,profile)){
        const bad={...structuredClone(first),...structuredClone(patch)};
        assert.throws(()=>validateEnglishPage(bad,args,context),id+' individual '+label);assert.throws(()=>validateComparisonPage(bad,args,context),id+' comparison '+label);
        host.output({...structuredClone(widget),english:bad});assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(!host.elements.english.textContent.includes(first.text),id+' cached English refused in '+bridge+': '+label);assert.ok(host.elements.pali.textContent.includes(pali));
      }
    }
  }
});

test('group '+batch+' all9 warmed source choices refuse changed metadata before another source request', { skip: !checkout }, async () => {
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


test('group '+batch+' actual paging refuses invalid identity before transport and verifies stale prefixes only against its own pinned source', { skip: !checkout }, async () => {
  const calls = []; sourceTransport(calls);
  for (const id of approved) {
    const { first, widget, args, context, unit, profile } = await actualCase(id);
    assert.ok(first.continue_with, id + ' actual source has a second English page');
    assert.ok(widget.english.continue_with, id + ' actual widget has a second English page');
    const next = first.continue_with.arguments;
    const second = await english.translation(unit, args.translation, next);
    validateEnglishPage(second, next, context);
    validateComparisonPage(second, next, context);
    for (const patch of [
      { uid: 'tha-ap236' }, { translation: 'ap:chapter-3/poem-234' },
      { offset: first.offset }, { offset: next.offset + 1 },
      { prefix_sha256: 'invalid' }, { translation_revision: '0'.repeat(40) },
      { allow_partial: true }, { allow_shared: true },
    ]) {
      const bad = { ...structuredClone(first), continue_with: { ...structuredClone(first.continue_with), arguments: { ...next, ...patch } } };
      assert.throws(() => validateEnglishPage(bad, args, context), id + ' individual unsafe ' + Object.keys(patch));
      assert.throws(() => validateComparisonPage(bad, args, context), id + ' comparison unsafe ' + Object.keys(patch));
    }
    for (const patch of [{ prefix_sha256: 'invalid' }, { translation_revision: '0'.repeat(40) }]) {
      const before = calls.length;
      await assert.rejects(english.translation(unit, args.translation, { ...next, ...patch }));
      assert.equal(calls.length, before, id + ' invalid API page refuses before an extra request');
    }
    const beforeStalePrefix = calls.length;
    await assert.rejects(english.translation(unit, args.translation, { ...next, prefix_sha256: '0'.repeat(64) }), /prefix changed/);
    assert.ok(calls.length - beforeStalePrefix <= 1, id + ' stale prefix needs at most its one pinned artifact');
    assert.ok(calls.slice(beforeStalePrefix).every(uid => uid === id), id + ' stale prefix never requests another source');
    const beforeMalformedWidget = calls.length;
    await assert.rejects(readPassage({ ...widget.english.continue_with.arguments, english_prefix_sha256: 'invalid', englishCharacters: 500 }), /english_prefix_sha256/);
    assert.equal(calls.length, beforeMalformedWidget, id + ' malformed widget arguments stop before transport');
    for (const patch of [{ english_translation_revision: '0'.repeat(40) }, { translation: 'ap:chapter-3/poem-234' }]) {
      const before = calls.length;
      const bad = await readPassage({ ...widget.english.continue_with.arguments, ...patch, englishCharacters: 500 });
      assert.equal(calls.length, before, id + ' invalid widget page refuses before an extra request');
      assert.ok(!bad.english, id + ' poisoned English must be unavailable');
      assert.ok(bad.english_error, id + ' explicit English failure');
      assert.equal(bad.pali.segments[0].text, widget.pali.segments[0].text, id + ' source Pāli remains unchanged');
      for (const bridge of ['MCP Apps', 'Apps SDK']) {
        const host = view(bridge); host.output(widget); assertDisplayed(host, widget.english, widget.pali.segments[0].text, id);
        host.output(bad); assert.ok(!host.elements.english.textContent.includes(first.text));
        assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));
      }
    }
    const beforeWidgetStalePrefix = calls.length;
    const stale = await readPassage({ ...widget.english.continue_with.arguments, english_prefix_sha256: '0'.repeat(64), englishCharacters: 500 });
    assert.ok(calls.length - beforeWidgetStalePrefix <= 1, id + ' widget stale prefix needs at most its one pinned artifact');
    assert.ok(calls.slice(beforeWidgetStalePrefix).every(uid => uid === id));
    assert.ok(!stale.english); assert.match(stale.english_error, /prefix changed/);
    for (const bridge of ['MCP Apps', 'Apps SDK']) {
      const host = view(bridge); host.output(stale);
      assert.ok(!host.elements.english.textContent.includes(first.text));
      assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));
    }
    assert.equal(profile.translation_revision, APADANA_COMMIT);
  }
});

}
