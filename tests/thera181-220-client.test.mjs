import {CURRENT_WIDGET_VERSION} from './helpers/current-apadana.mjs';
/** Client capabilities exercise original pinned source responses, never invented positive wording. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { APADANA_PROFILES, APADANA_COMMIT } from '../src/apadana-profiles.mjs';
import { digest, parseApadana } from '../src/apadana.mjs';
import { readPassage, WIDGET_VERSION } from '../src/chatgpt-widget.mjs';
import { validateEnglishPage } from '../web/translation-policy.mjs';
import { validateComparisonPage } from '../web/translation-comparison.mjs';
import { view } from './helpers/widget-view.mjs';
import { CURRENT_APADANA_IDS } from './helpers/apadana-intake-expectations.mjs';

const approval = JSON.parse(readFileSync('docs/evidence/apadana/THERA_181_220_APPROVAL.json', 'utf8'));
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
  if (profile.chapter_summary?.note_numbers.length) {
    const notes = value.chapter_summary.translator_notes.map((note, i) => i ? note : { ...note, text: note.text + '\n' });
    rows.push(['same-count chapter note', { chapter_summary: { ...value.chapter_summary, translator_notes: notes } }]);
  }
  if (profile.collection_summary) {
    const summary = value.collection_summary;
    const notes = summary.translator_notes.map((note, i) => i ? note : { ...note, text: note.text + '\n' });
    rows.push(['second-hundred text', { collection_summary: { ...summary, text: summary.text + '\n' } }]);
    rows.push(['same-count second-hundred note', { collection_summary: { ...summary, translator_notes: notes } }]);
    rows.push(['forged second-hundred note hash', { collection_summary: { ...summary, translator_notes: notes, notes_sha256: digest(JSON.stringify(notes)) } }]);
    rows.push(['foreign first-hundred owner', { collection_summary: { ...summary, parent_id: 'tha-ap102' } }]);
    rows.push(['untruthful collection caption', { collection_summary: { ...summary, label: 'Canonical collection end' } }]);
    rows.push(['foreign first-hundred bounds', { collection_summary: { ...summary, first_ref: 'tha-ap102/12' } }]);
  } else rows.push(['foreign collection summary', { collection_summary: {} }]);

  for (const [label, patch] of rows) assert.ok(Object.keys(patch).some(key => JSON.stringify(value[key]) !== JSON.stringify(patch[key])), profile.id + ' nonempty negative control: ' + label);
  return rows;
}

test('new client capabilities preserve the independently frozen206 source contracts and exact approved scope', () => {
  assert.equal(approval.status, 'approved'); assert.equal(approval.base_commit, '94c607310845b84dc3cd51ba3a19ce6fecd28683');
  assert.equal(independent.baseline, approval.base_commit); assert.equal(independent.publisher_revision, APADANA_COMMIT);
  assert.deepEqual(approved, independent.approved_ids); assert.equal(approved.length, 40);
  assert.equal(approval.baseline_ids.length, 206);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0, 206), approval.baseline_ids);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0, 246), [...approval.baseline_ids, ...approved]);
  assert.deepEqual(Object.keys(APADANA_PROFILES), CURRENT_APADANA_IDS);
  for (const id of approval.baseline_ids) {
    const { english: _english, match: _match, ...profile } = baseline.profile_objects[id];
    assert.deepEqual(APADANA_PROFILES[id], profile, id + ' previous source contract unchanged');
  }
  assert.equal(WIDGET_VERSION, CURRENT_WIDGET_VERSION);
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

test('ALL40 actual source positives complete before mutations: original paged bodies207poemnotes4apparatusnotes and both hosts', { skip: !checkout }, async () => {
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
  assert.equal(poemNotes,207);assert.equal(apparatusNotes,4);assert.equal(bodyParagraphs,336);
});

test('all40 actual cached source mutations refuse individual comparison and both host English while preserving Pāli', { skip: !checkout }, async () => {
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

test('all40 warmed source choices refuse changed metadata before another source request', { skip: !checkout }, async () => {
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

test('second-hundred scope keeps its own notes6–7 and truthful caption while preceding collection captions remain exact', { skip: !checkout }, async()=>{
  const calls=[];sourceTransport(calls);const selected=await actualCase('tha-ap202'),{first,widget}=selected;
  assert.deepEqual(first.translator_notes.map(note=>note.number),[1,2,3,4]);assert.deepEqual(first.chapter_summary.translator_notes.map(note=>note.number),[5]);assert.deepEqual(first.collection_summary.translator_notes.map(note=>note.number),[6,7]);
  assert.equal(first.collection_summary.label,'Therā Apadāna second-hundred chapter summary and colophons');assert.equal(first.collection_summary.root_start,7417);assert.equal(first.collection_summary.root_end,7424);assert.equal(first.collection_summary.first_ref,'tha-ap202/11');assert.equal(first.collection_summary.last_ref,'tha-ap202/15');
  for(const bridge of ['MCP Apps','Apps SDK']){
    const host=view(bridge);host.output(widget);const text=host.elements.english.textContent;
    assert.ok(text.includes('Therā Apadāna second-hundred chapter summary and colophons · not poem text'));
    assert.ok(text.includes('chapters eleven to twenty'));assert.ok(text.includes('666'));assert.ok(text.includes('not a validated corpus total'));assert.ok(text.includes('does not mark the end of all Therā poems'));
    assert.ok(!text.includes('Therā Apadāna first-hundred chapter summary and colophons · not poem text'));
  }
  const oldCaptions={
    'tha-ap102':'Therā Apadāna first-hundred chapter summary and colophons · not poem text',
    'thi-ap40':'Canonical collection summary · not poem text',
  };
  globalThis.fetch=async url=>{
    const profile=[...approved,...Object.keys(oldCaptions)].map(id=>APADANA_PROFILES[id]).find(value=>value.raw_url===url.href);assert.ok(profile);
    if(approved.includes(profile.id))return new Response(artifact(profile));
    const path=profile.path.replace(/^\/text\//,'').replace(/\/$/,'.md'),raw=readFileSync(join(checkout,'src/_poems',path),'utf8');assert.equal(digest(raw),baseline.profile_objects[profile.id].raw_sha256);return new Response(raw);
  };
  const firstHundredDisclaimer='This summary covers the publisher’s first hundred Therā poems and first ten chapters. It does not mark the end of the Therā Apadāna. Original counts and titles are preserved; they are not a measure of indexed translation coverage. It is separate from the poem and chapter summary, and is not poem quotation evidence.';
  for(const[id,caption]of Object.entries(oldCaptions)){
    const old=await readPassage({uid:id,translation:tid(APADANA_PROFILES[id]),englishCharacters:500,limit:2});assert.ok(old.english,old.english_error);
    for(const bridge of ['MCP Apps','Apps SDK']){
      const host=view(bridge);host.output(old);const text=host.elements.english.textContent;assert.ok(text.includes(caption));assert.ok(!text.includes('Therā Apadāna second-hundred chapter summary and colophons · not poem text'));
      if(id==='tha-ap102')assert.ok(text.includes(firstHundredDisclaimer));
    }
  }
});
