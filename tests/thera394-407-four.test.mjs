/** Actual pinned publisher inputs; independent source7 authority, never runtime-derived goldens. */
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
import {apadanaEditionNavigation} from '../web/apadana-edition-navigation.mjs';
import {currentContext} from './helpers/current-apadana.mjs';
import {intake382Authority} from './helpers/intake382-metadata.mjs';
import {readSixRegularRelative} from './helpers/six-regular-file.mjs';
import {view} from './helpers/widget-view.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IDS = ['tha-ap396','tha-ap399','tha-ap408','tha-ap409'];
const PUBLISHERS = [394,397,406,407];
const CANONICAL = '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a';
const checkout = process.env.APADANA_SOURCE_CHECKOUT;
// Optional only in ordinary local inventory. The dedicated source CI step must require2 pass/0 skip.
const source = {skip: !checkout, timeout: 30000};
const sha = value => createHash('sha256').update(value).digest('hex');
const objectSha = value => sha(JSON.stringify(value));
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const DIRECTORY = 'docs/evidence/apadana/english394-407-four/';
const PINS = {
  'APPROVAL.json':'40552a2b723037f0b63022e747bfa9c20077e4c26404ca6125473c412d722307',
  'LINKS.json':'116e8fbe5437a47c8226496a7f2bd4c7657ed2dbd47a0cf78094417edd2fa251',
  'NORMALIZATION_REVIEW.json':'2fb7a5df73246f98646540b7b40cb3f7a750f518bfd76402f3573dadb7f3a9c1',
  'PROFILES.json':'fef6e9e9af3c70dd5efdbec3e98a9d882165cde92337df022b1e49e4077415b1',
  'REQUIRED_NOTICES.json':'acff79613ecac0907c2d748f7c192088c174b51564edefb07f415e2322f41bed',
  'SOURCE_BINDINGS.json':'54119b17caeb16f4bec416b4698a67bbb8c3b5cb7e4cf07e5e7983028c524e89',
  'SOURCE_REVIEW.json':'f0b53867478e3fcdd7ecf049f9b57a1cfadfdf828bba2b269ba6873fec5a7d92'
};
function sourceDocuments() {
  const documents = Object.fromEntries(Object.entries(PINS).map(([name,pin]) => {
    const raw = readSixRegularRelative(ROOT,DIRECTORY+name); assert.equal(sha(raw),pin);
    return [name,JSON.parse(raw)];
  }));
  assert.equal(documents['APPROVAL.json'].status,'approved');
  assert.equal(documents['APPROVAL.json'].source_and_normalization_only,true);
  assert.equal(documents['APPROVAL.json'].runtime_approval,false);
  assert.equal(documents['APPROVAL.json'].release_approval,false);
  assert.equal(documents['SOURCE_REVIEW.json'].status,'GO_EXACT_FOUR_PUBLISHER_EDITION_SOURCE_SCOPES_ONLY');
  assert.equal(documents['SOURCE_REVIEW.json'].runtime_API_activation_or_release_approval,false);
  assert.deepEqual(documents['SOURCE_REVIEW.json'].approved_pairs,PUBLISHERS.map((n,i)=>[n,IDS[i]]));
  return documents;
}
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; liveCache.clear(); });
const translationId = publisher => 'ap:chapter-3/poem-'+publisher;

function actualContext(documents) {
  // The facade is the actual live source role. The immutable382 decoder is SOURCE-only history.
  const context = currentContext(ROOT), baseline = intake382Authority(ROOT);
  const profiles = documents['PROFILES.json'], links = documents['LINKS.json'];
  assert.equal(baseline.ids.length,382); assert.deepEqual(Object.keys(profiles),IDS);
  assert.deepEqual(Object.keys(links),IDS);
  const cohortProfiles = {...baseline.profiles,...profiles}, cohortLinks = {...baseline.links,...links};
  const cohortIds=baseline.ids.concat(IDS); assert.equal(cohortIds.length,386);
  const manifest = JSON.parse(readSixRegularRelative(ROOT,'server/data/apadana.json'));
  // Whole actual CURRENT is independently source-composed by the stable facade; no minimum/count bypass.
  assert.deepEqual(APADANA_PROFILES,context.english.profiles); assert.deepEqual(manifest,context.english.manifest);
  assert.deepEqual(Object.keys(APADANA_PROFILES),context.english.ids); assert.deepEqual(Object.keys(manifest.links),context.english.ids);
  // This historical source cohort is fixed. Routine future approved additions keep its exact prefix and objects.
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,cohortIds.length),cohortIds);
  assert.deepEqual(Object.keys(manifest.links).slice(0,cohortIds.length),cohortIds);
  for (const id of cohortIds) { assert.deepEqual(APADANA_PROFILES[id],cohortProfiles[id]); assert.deepEqual(manifest.links[id],cohortLinks[id]); }
  assert.deepEqual(manifest.held,baseline.manifest.held);
  assert.equal(context.canonical.new_canonical_logical_sha256,CANONICAL);
  assert.equal(WIDGET_VERSION,context.widget.version);
  assert.equal(context.widget.uri,'ui://pali-canon/reader-'+context.widget.version+'.html');
  assert.deepEqual(baseline.selection.held_ids,['tha-ap72','tha-ap142','tha-ap160','tha-ap161','tha-ap262','tha-ap268','tha-ap282','tha-ap308','tha-ap309','tha-ap360']);
  for (const id of baseline.selection.held_ids) assert.equal(Object.hasOwn(APADANA_PROFILES,id),false);
  for (const publisher of [391,392,393,403,404,405,408,409,410,395,396,400]) {
    assert.equal(Object.values(APADANA_PROFILES).some(p=>p.publisher_chapter==='chapter-3'&&p.poem===publisher),false);
  }
  assert.equal(cohortIds.filter(id=>id.startsWith('thi-ap')).length,40);
  assert.equal(cohortIds.filter(id=>id.startsWith('tha-ap')).length,346);
  return {context,baseline,manifest,profiles,links,cohortProfiles};
}
function artifacts(documents) {
  const notices = documents['REQUIRED_NOTICES.json'], bindings = documents['SOURCE_BINDINGS.json'];
  assert.equal(notices.license,'CC BY-NC-SA 4.0'); assert.equal(Object.keys(notices.specific_rights_artifacts).length,6);
  for (const [name,row] of Object.entries(notices.specific_rights_artifacts)) {
    const bytes = readSixRegularRelative(checkout,name);
    assert.equal(bytes.length,row.bytes); assert.equal(sha(bytes),row.sha256); assert.equal(blob(bytes),row.git_blob_sha1);
  }
  return new Map(IDS.map((id,i)=>{
    const p=documents['PROFILES.json'][id], row=bindings.entries[id].raw;
    assert.equal(p.poem,PUBLISHERS[i]); const bytes=readSixRegularRelative(checkout,'src/_poems/chapter-3/poem-'+PUBLISHERS[i]+'.md');
    assert.equal(bytes.length,row.bytes); assert.equal(sha(bytes),row.sha256); assert.equal(blob(bytes),row.git_blob_sha1);
    assert.equal(sha(bytes),p.raw_sha256); return [p.raw_url,bytes.toString('utf8')];
  }));
}
function exactContent(value,g) {
  assert.equal(sha(value.text),g.body_sha256); assert.equal(value.text.length,g.body_characters_utf16);
  assert.equal(objectSha(value.translator_notes),g.notes_sha256_JSON_stringify);
  assert.deepEqual(value.translator_notes.map(n=>n.number),g.note_numbers);
  const paragraphs=value.text.split('\n\n'); assert.equal(paragraphs.length,g.body_paragraphs.length);
  for (const row of g.body_paragraphs) {
    const part=paragraphs[row.paragraph_index0]; assert.equal(sha(part),row.text_sha256);
    assert.equal(part.length,row.characters_utf16); assert.equal(part.split('\n').length,row.lines);
    assert.equal(value.text.slice(row.body_start_utf16,row.body_end_utf16),part);
    assert.deepEqual([...part.matchAll(/\[Note (\d+)\]/g)].map(m=>Number(m[1])),row.original_note_numbers);
  }
  for (const row of g.note_owners) {
    const note=value.translator_notes.find(n=>n.number===row.number); assert.equal(sha(note.text),row.text_sha256);
    assert.equal(note.text.length,row.characters_utf16);
    assert.deepEqual(paragraphs.flatMap((text,i)=>text.includes('[Note '+row.number+']')?['body:'+i]:[]),[row.owner]);
  }
  assert.equal(sha(value.publisher_paratext),g.paratext_sha256); assert.equal(value.publisher_paratext.length,g.paratext_characters_utf16);
  for (const key of ['publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap']) assert.equal(Object.hasOwn(value,key),false);
}
function labelWidth(label) { assert.match(label,/^\d+(?:-\d+)?$/); const [first,last=first]=label.split('-').map(Number); assert.ok(last>=first); return last-first+1; }
function parseSources(documents,raw) {
  const goldens=documents['SOURCE_BINDINGS.json'].source_derived_API_expected_metadata.entries;
  return new Map(IDS.map(id=>{
    const p=documents['PROFILES.json'][id], value=parseApadana(raw.get(p.raw_url),p);
    assert.deepEqual(Object.keys(value),['title','text','translator_notes','publisher_paratext']);
    assert.equal(value.title,goldens[id].title); exactContent(value,goldens[id]); return [id,value];
  }));
}

test('publisher394/397/406/407 exact sources preserve382 objects,121 paragraphs,141 notes and both label domains', source, () => {
  const documents=sourceDocuments(), {manifest,profiles,links}=actualContext(documents), raw=artifacts(documents), parsed=parseSources(documents,raw);
  const goldens=documents['SOURCE_BINDINGS.json'].source_derived_API_expected_metadata.entries, corpus=canon.load();
  assert.equal(objectSha(corpus.canon),CANONICAL); assert.equal(corpus.canon.books.length,61);
  // Immutable independent382 runtime inventory binds the26 unrelated physical data files, including citations.
  const inventoryRaw=readSixRegularRelative(ROOT,'docs/evidence/apadana/english401-402-pair/RUNTIME_INVENTORY.json');
  assert.equal(sha(inventoryRaw),'d96c2bfcdd6ec0802f6e36dec6a792ee35e1cc05751b2579c57d6ad5871cf8b2');
  const inventory=JSON.parse(inventoryRaw), unchanged=Object.entries(inventory.files).filter(([p])=>p.startsWith('data/')&&p!=='data/apadana.json');
  assert.equal(unchanged.length,26);
  for (const [path,row] of unchanged) { const bytes=readSixRegularRelative(ROOT,'server/'+path); assert.equal(bytes.length,row.bytes); assert.equal(sha(bytes),row.sha256); }
  let paragraphs=0,notes=0,quotes=0,globalLabels=0,localLabels=0;
  for (const id of IDS) {
    const p=profiles[id],g=goldens[id],value=parsed.get(id),text=raw.get(p.raw_url),unit=corpus.byId.get(id);
    assert.deepEqual(APADANA_PROFILES[id],p); assert.deepEqual(manifest.links[id],links[id]);
    assert.equal(objectSha(p),g.full_proposed_profile_sha256_JSON_stringify);
    assert.deepEqual(links[id],{...p,english:p.title,match:'individually-reviewed-whole-poem'});
    assert.deepEqual(p.mapping_notes,documents['APPROVAL.json'].required_visible_qualifications[id]);
    assert.deepEqual(p.mapping_notes,documents['REQUIRED_NOTICES.json'].per_poem[id]);
    assert.equal(rootDigest(unit,corpus.canon.books[unit.book]),g.root_wrapper_sha256_JSON_stringify);
    assert.equal(validateLink(manifest.links[id],id,unit,corpus.canon.books[unit.book]),APADANA_PROFILES[id]);
    const stanzas=quotationText({...value,translation_id:translationId(p.poem)}).split('\n\n');
    assert.equal(stanzas.length,g.quotation_proofs.length);
    for (const [i,row] of g.quotation_proofs.entries()) { assert.equal(sha(stanzas[i]),row.text_sha256); assert.equal(stanzas[i].length,row.characters_utf16); assert.equal(stanzas[i].split('\n').length,row.lines); }
    paragraphs+=value.text.split('\n\n').length; notes+=value.translator_notes.length; quotes+=stanzas.length;
    globalLabels+=p.stanza_layout.reduce((n,row)=>n+labelWidth(row.publisher_label),0);
    localLabels+=p.stanza_layout.reduce((n,row)=>n+labelWidth(row.local_label),0);
    // Authentic positives above precede source, note-owner, profile and root mutation refusals.
    for (const changed of [text.replace('### ','### X'),text.replace('[^3]','[^4]')]) { assert.notEqual(changed,text); assert.throws(()=>parseApadana(changed,p)); }
    const wrongOwner=structuredClone(p); wrongOwner.stanza_layout[0].local_label='999'; assert.throws(()=>parseApadana(text,wrongOwner));
    const wrongLink=structuredClone(links[id]); wrongLink.poem=391; assert.throws(()=>validateLink(wrongLink,id,unit,corpus.canon.books[unit.book]));
    assert.throws(()=>validateLink(links[id],id,{...unit,start:unit.start+1},corpus.canon.books[unit.book]));
  }
  assert.deepEqual({paragraphs,notes,quotes,globalLabels,localLabels},{paragraphs:121,notes:141,quotes:109,globalLabels:113,localLabels:114});
  const madhu=parsed.get('tha-ap396'); assert.ok(madhu.text.split('\n\n')[15].endsWith('(15-16) [3720][Note 21]'));
  assert.ok(madhu.translator_notes.find(n=>n.number===16).text.includes('Sikhi'));
  const hemaka=profiles['tha-ap409']; assert.deepEqual(hemaka.stanza_layout.flatMap((s,i)=>s.lines===8?[i+1]:[]),[25,26,27,29]);
  assert.deepEqual(hemaka.stanza_layout.filter(s=>s.lines===8).map(s=>[s.local_label,s.publisher_label]),[['25-26','4096-4097'],['27-28','4098-4099'],['29-30','4100-4101'],['32-33','4103-4104']]);
  assert.ok(canon.segments(corpus.byId.get('tha-ap409')).at(-1).text.includes('Sattarasamaṃ bhāṇavāraṃ'));
  assert.equal(parsed.get('tha-ap409').text.includes('bhāṇavāra'),false);
});

test('publisher394/397/406/407 actual API and widget guards retain source rights, citations and6000+439 continuation', source, async () => {
  const documents=sourceDocuments(), {context,cohortProfiles}=actualContext(documents);
  const raw=artifacts(documents),parsed=parseSources(documents,raw),profiles=documents['PROFILES.json'];
  const goldens=documents['SOURCE_BINDINGS.json'].source_derived_API_expected_metadata.entries,calls=[];
  let corruptSource=false;
  globalThis.fetch=async input=>{
    const url=typeof input==='string'?input:input.href; assert.ok(raw.has(url),'Only four pinned official source transports'); calls.push(url);
    const text=raw.get(url); return new Response(corruptSource?text.replace('### ','### X'):text,{headers:{'content-type':'text/plain; charset=utf-8'}});
  };
  let pages=0,nativePages=0,hostViews=0;
  for (const id of IDS) {
    const p=profiles[id],g=goldens[id],unit=canon.resolve(id).unit,translation=translationId(p.poem),choices=english.available(unit);
    assert.ok(choices.some(choice=>choice.translation_id===translation));
    let args={translation_revision:APADANA_COMMIT,limit:500},assembled='';
    for (const expected of g.pages500) {
      const page=await english.translation(unit,translation,args);
      assert.equal(page.text_id,id); assert.equal(page.translation_id,translation); assert.equal(page.translation_revision,APADANA_COMMIT);
      assert.equal(page.offset,expected.offset); assert.equal(page.text.length,expected.characters_utf16); assert.equal(sha(page.text),expected.text_sha256);
      assert.equal(page.prefix_sha256,expected.start_prefix_sha256); assert.equal(page.next_offset,expected.next_offset);
      assert.equal(objectSha(page.translator_notes),g.notes_sha256_JSON_stringify);
      assert.equal(page.license,'CC BY-NC-SA 4.0'); assert.deepEqual(page.mapping_notes,p.mapping_notes);
      validateEnglishPage(page,{uid:id,translation,...args},{uid:id,choices,accepted:null}); assembled+=page.text; pages++;
      if (expected.next_offset===null) assert.equal(page.continue_with,null);
      else { assert.equal(page.continue_with.arguments.prefix_sha256,expected.continuation_prefix_sha256); args=page.continue_with.arguments; }
    }
    assert.equal(sha(assembled),g.body_sha256); assert.equal(assembled,parsed.get(id).text);
    // Real backend source hashes and revision/prefix guards authenticate all chunks, including partial bodies.
    await assert.rejects(english.translation(unit,translation,{offset:500,limit:500,prefix_sha256:'0'.repeat(64),translation_revision:APADANA_COMMIT}));
    await assert.rejects(english.translation(unit,translation,{offset:500,limit:500,prefix_sha256:g.pages500[1].start_prefix_sha256}));
    await assert.rejects(english.translation(unit,translation,{translation_revision:'0'.repeat(40),limit:500}));
    const pali=await readPassage({uid:id,english:false}); assert.equal(pali.english,null);
    const navigation=apadanaEditionNavigation(pali),observed=navigation.groups.flatMap(group=>group.poems);
    const currentOrdered=Object.values(context.english.profiles).filter(p=>p.publisher_chapter==='chapter-3').sort((a,b)=>a.poem-b.poem);
    assert.deepEqual(observed.map(row=>({uid:row.uid,label:row.label})),currentOrdered.map(p=>({uid:p.id,label:'Publisher poem '+p.poem+' · '+p.title+' · '+p.id})));
    assert.equal(navigation.revision,APADANA_COMMIT); assert.equal(navigation.current.uid,id);
    const cohortOrdered=Object.values(cohortProfiles).filter(p=>p.publisher_chapter==='chapter-3').sort((a,b)=>a.poem-b.poem),cohortSet=new Set(cohortOrdered.map(p=>p.id));
    assert.deepEqual(observed.filter(row=>cohortSet.has(row.uid)).map(row=>row.uid),cohortOrdered.map(p=>p.id));
    assert.deepEqual(observed.filter(row=>['tha-ap388','tha-ap396','tha-ap399','tha-ap403','tha-ap404','tha-ap408','tha-ap409'].includes(row.uid)).map(row=>row.uid),['tha-ap388','tha-ap396','tha-ap399','tha-ap403','tha-ap404','tha-ap408','tha-ap409']);
    let current={uid:id,translation,english_translation_revision:APADANA_COMMIT,englishCharacters:6000},nativeBody=''; const lengths=[];
    do {
      const result=await readPassage(current); assert.ok(result.english,result.english_error); const value=result.english;
      assert.equal(value.translation_id,translation); assert.equal(value.translation_revision,APADANA_COMMIT);
      assert.equal(value.license,'CC BY-NC-SA 4.0'); assert.deepEqual(value.mapping_notes,p.mapping_notes);
      assert.equal(objectSha(value.translator_notes),g.notes_sha256_JSON_stringify); assert.equal(sha(value.publisher_paratext),g.paratext_sha256);
      // Parser source bytes were independently authenticated paragraph-by-paragraph, not expected from this API output.
      assert.equal(value.text,parsed.get(id).text.slice(value.offset,value.offset+6000));
      assert.deepEqual(result.pali.segments,pali.pali.segments); assert.deepEqual(result.source,pali.source);
      validateApadanaChoice(value,id,true); nativeBody+=value.text; lengths.push(value.text.length); nativePages++;
      // These are actual embedded-script guard tests, not DOM/Saved/focus/browser acceptance.
      for (const bridge of ['Apps SDK','MCP Apps']) {
        const host=view(bridge); host.output(structuredClone(result)); assert.ok(host.elements.english.textContent.includes(value.text));
        for (const notice of p.mapping_notes) assert.ok(host.elements.english.textContent.includes(notice));
        const corruptions=[v=>{v.translator_notes[0].text+='X';},v=>{v.translator_notes.pop();},v=>{v.publisher_paratext=' ';},v=>{v.mapping_notes=[];},v=>{v.notes=[];},v=>{v.license='CC0';},v=>{v.translation_revision='0'.repeat(40);},v=>{v.translation_id=translationId(391);},v=>{v.url='https://example.invalid/';}];
        // Whole-body client hashing applies only when the server declares a complete single-page body.
        if (value.offset===0&&value.next_offset===null) corruptions.push(v=>{v.text='X'+v.text.slice(1);});
        for (const change of corruptions) {
          const bad=structuredClone(result); change(bad.english); assert.throws(()=>validateApadanaChoice(bad.english,id,true));
          host.output(bad); assert.match(host.elements.english.textContent,/No English|No translation/);
          assert.ok(host.elements.pali.textContent.includes(result.pali.segments[0].text));
          host.output(structuredClone(result)); assert.ok(host.elements.english.textContent.includes(value.text));
        }
        hostViews++;
      }
      current=value.continue_with?{...value.continue_with.arguments,englishCharacters:6000}:null;
    } while (current);
    assert.equal(sha(nativeBody),g.body_sha256);
    assert.deepEqual(lengths,id==='tha-ap409'?[6000,439]:[g.body_characters_utf16]);
    const firstQuote=quotationText({...parsed.get(id),translation_id:translation}).split('\n\n')[0];
    const verified=await verifyQuote({text:firstQuote,language:'english',texts:[id],translation_ids:[translation],limit:1});
    assert.equal(verified.scope.complete_source_versions_compared,1);
    assert.ok(verified.matches.some(m=>m.text_id===id&&m.translation_id===translation&&m.translation_revision===APADANA_COMMIT));
    assert.equal(verified.verdict,'found'); assert.equal(verified.best_similarity,1);
    assert.equal(verified.scope.source_versions_not_compared,0);
    assert.ok(verified.matches.some(m=>m.text_id===id&&m.translation_id===translation&&m.translation_revision===APADANA_COMMIT&&m.citation===unit.acronym&&m.similarity===1));
    assert.equal(canon.resolve(unit.acronym).unit.id,id);
    // An altered raw publisher file must fail before returning any source page, then recover with the authentic file.
    corruptSource=true; liveCache.clear(); await assert.rejects(english.translation(unit,translation,{limit:500,translation_revision:APADANA_COMMIT}));
    corruptSource=false; liveCache.clear(); const recovered=await english.translation(unit,translation,{limit:500,translation_revision:APADANA_COMMIT});
    assert.equal(sha(recovered.text),g.pages500[0].text_sha256);
  }
  assert.deepEqual({pages,nativePages,hostViews},{pages:37,nativePages:5,hostViews:10});
  assert.deepEqual([...new Set(calls)],IDS.map(id=>profiles[id].raw_url));
  const before=calls.length,held=canon.resolve('tha-ap410').unit;
  await assert.rejects(english.translation(held,translationId(408))); assert.equal(calls.length,before);
});
