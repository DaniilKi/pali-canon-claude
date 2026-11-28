/** Seven exact publisher editions; expected words come only from sealed independent source metadata. */
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT,APADANA_VRI_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,rootDigest,validateLink} from '../src/apadana.mjs';
import {readPassage,WIDGET_VERSION} from '../src/chatgpt-widget.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {liveCache} from '../src/cache.mjs';
import {validateApadanaChoice,validateEnglishPage} from '../web/translation-policy.mjs';
import {apadanaEditionNavigation} from '../web/apadana-edition-navigation.mjs';
import {currentContext,sourceCohort} from './helpers/current-apadana.mjs';
import {readSixRegularRelative} from './helpers/six-regular-file.mjs';
import {view} from './helpers/widget-view.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const PAIRS=[[421,'tha-ap423'],[423,'tha-ap425'],[424,'tha-ap426'],[425,'tha-ap427'],[426,'tha-ap428'],[427,'tha-ap429'],[429,'tha-ap431']];
const IDS=PAIRS.map(r=>r[1]),PUBLISHERS=PAIRS.map(r=>r[0]);
const CANONICAL='883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a';
const BINDINGS_SCHEMA='reviewed-thera421-429-seven-source-bindings-v1';
const GOLDEN_SHA='044e528e0ee4757e4835e070e0ba941f19941398923c91e43b812c7da96b0a1d';
const CONTRACT_SHA='bb5cf58e00e8ecf7f3b66905b8283971cf119ce11d1048551c7e0bbfe5a8e2e5';
const checkout=process.env.APADANA_SOURCE_CHECKOUT?resolve(ROOT,process.env.APADANA_SOURCE_CHECKOUT):null;
// Only ordinary source-free inventory may skip; the dedicated source-enabled gate requires these exact two cases with0skip.
const source={skip:!checkout,timeout:30000};
const sha=x=>createHash('sha256').update(x).digest('hex');
const objectSha=x=>sha(JSON.stringify(x));
const blob=x=>createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const tid=n=>'ap:chapter-3/poem-'+n;
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});
function sealed(path,pin){const raw=readSixRegularRelative(ROOT,path);assert.equal(sha(raw),pin);return JSON.parse(raw);}
function authority(){
  const context=currentContext(ROOT),four=sourceCohort(context,'four394407'),eight=sourceCohort(context,'eight411419'),cohort=sourceCohort(context,'seven421429');
  assert.deepEqual(new Set(Object.keys(context)),new Set(['english','canonical','widget']));
  assert.deepEqual(new Set(Object.keys(context.english.source_cohorts)),new Set(['four394407','eight411419','seven421429']));
  assert.deepEqual(new Set(Object.keys(cohort.documents)),new Set(['APPROVAL.json','PROFILES.json','LINKS.json','REQUIRED_NOTICES.json','SOURCE_BINDINGS.json','SOURCE_REVIEW.json','NORMALIZATION_REVIEW.json']));
  const bindings=cohort.documents['SOURCE_BINDINGS.json'];assert.equal(bindings.schema,BINDINGS_SCHEMA);
  assert.deepEqual(Object.keys(bindings.source_derived_API_expected_metadata),['entries']);
  const contract=bindings.source_contract,goldens=bindings.source_derived_API_expected_metadata.entries;
  assert.equal(objectSha(contract),CONTRACT_SHA);assert.equal(objectSha(goldens),GOLDEN_SHA);
  assert.deepEqual(contract.literal_pairs,PAIRS);assert.equal(contract.publisher_revision,APADANA_COMMIT);assert.equal(contract.canonical_logical_sha256,CANONICAL);
  assert.deepEqual(contract.excluded_current_batch_publishers,[422,428,430]);assert.deepEqual(contract.conditional_publishers_unchanged,[413,420]);
  assert.equal(cohort.documents['NORMALIZATION_REVIEW.json'].schema,'independent-seven421429-source-normalization-review-v1');
  assert.equal(cohort.documents['NORMALIZATION_REVIEW.json'].status,'GO_EXACT_SEVEN_SOURCE_PRESENTATION_AND_LOSSLESS_NORMALIZATION_ONLY');
  const old=context.english.historical382,oldProfiles={...old.profiles,...four.profiles,...eight.profiles},oldLinks={...old.links,...four.links,...eight.links},oldIds=old.ids.concat(four.ids,eight.ids);
  assert.equal(oldIds.length,394);assert.deepEqual(cohort.ids,IDS);assert.deepEqual(cohort.records,PAIRS.map(([poem,id])=>({id,publisher_chapter:'chapter-3',poem})));
  assert.deepEqual(context.english.ids,oldIds.concat(IDS));assert.equal(context.english.ids.length,401);
  const manifest=JSON.parse(readSixRegularRelative(ROOT,'server/data/apadana.json'));
  assert.deepEqual(APADANA_PROFILES,context.english.profiles);assert.deepEqual(manifest,context.english.manifest);
  assert.deepEqual(Object.keys(APADANA_PROFILES),oldIds.concat(IDS));assert.deepEqual(Object.keys(manifest.links),oldIds.concat(IDS));
  for(const id of oldIds){assert.deepEqual(APADANA_PROFILES[id],oldProfiles[id]);assert.deepEqual(manifest.links[id],oldLinks[id]);}
  for(const id of IDS){assert.deepEqual(APADANA_PROFILES[id],cohort.profiles[id]);assert.deepEqual(manifest.links[id],cohort.links[id]);}
  assert.deepEqual(manifest.held,old.manifest.held);assert.equal(context.canonical.new_canonical_logical_sha256,CANONICAL);
  assert.deepEqual(context.widget,{version:'v53',uri:'ui://pali-canon/reader-v53.html',skybridge:'ui://pali-canon/reader-v53.skybridge.html'});assert.equal(WIDGET_VERSION,context.widget.version);
  for(const publisher of [391,392,393,403,404,405,408,409,410,413,420,422,428,430])assert.equal(Object.values(APADANA_PROFILES).some(p=>p.publisher_chapter==='chapter-3'&&p.poem===publisher),false);
  for(const id of old.selection.held_ids)assert.equal(Object.hasOwn(APADANA_PROFILES,id),false);
  return {context,cohort,profiles:cohort.profiles,manifest,contract,goldens,bindings,oldIds};
}
function artifacts(contract){
  assert.equal(contract.specific_rights_artifacts.length,6);
  for(const row of contract.specific_rights_artifacts){const bytes=readSixRegularRelative(checkout,row.path);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);assert.equal(blob(bytes),row.git_blob_sha1);}
  return new Map(contract.entries.map(row=>{const bytes=readSixRegularRelative(checkout,row.raw.path);assert.equal(row.raw.path,'src/_poems/chapter-3/poem-'+row.publisher_poem+'.md');assert.equal(bytes.length,row.raw.bytes);assert.equal(sha(bytes),row.raw.sha256);assert.equal(blob(bytes),row.raw.git_blob_sha1);return[row.canonical_id,bytes.toString('utf8')];}));
}
function exactContent(value,g){
  assert.deepEqual(new Set(Object.keys(value)),new Set(['title','text','translator_notes','publisher_paratext']));assert.equal(value.title,g.title);
  assert.equal(sha(value.text),g.body_sha256);assert.equal(value.text.length,g.body_characters_utf16);assert.ok(value.text.length<6000);
  const paragraphs=value.text.split('\n\n');assert.equal(paragraphs.length,g.body_paragraphs.length);
  for(const row of g.body_paragraphs){const part=paragraphs[row.paragraph_index0];assert.equal(sha(part),row.text_sha256);assert.equal(part.length,row.characters_utf16);assert.equal(part.split('\n').length,row.lines);assert.equal(sha(value.text.slice(...row.body_utf16)),row.text_sha256);assert.deepEqual([...part.matchAll(/\[Note (\d+)\]/g)].map(m=>Number(m[1])),row.original_note_numbers);}
  assert.equal(objectSha(value.translator_notes),g.notes_sha256_JSON_stringify);assert.deepEqual(value.translator_notes.map(n=>n.number),g.note_numbers);
  for(const row of g.note_owners){const note=value.translator_notes[row.number-1];assert.equal(note.number,row.number);assert.equal(sha(note.text),row.text_sha256);assert.equal(note.text.length,row.characters_utf16);assert.deepEqual(paragraphs.flatMap((p,i)=>p.includes('[Note '+row.number+']')?[i]:[]),[row.owner_body_paragraph_index0]);}
  assert.equal(sha(value.publisher_paratext),g.paratext_sha256);assert.equal(value.publisher_paratext.length,g.paratext_characters_utf16);
}
function expectedLayout(g){return g.physical_stanzas.map(row=>{assert.equal(row.numeric_markers.length,1);const m=row.numeric_markers[0];return{local_label:String(m.local_label),publisher_label:m.publisher_global_label===null?null:String(m.publisher_global_label),suffix:m.suffix.trimStart(),lines:row.lines};});}
function exactQuotes(value,p,g){const parts=quotationText({...value,translation_id:tid(p.poem)}).split('\n\n');assert.equal(parts.length,g.physical_stanzas.length);for(const[i,row]of g.physical_stanzas.entries()){assert.equal(sha(parts[i]),row.physical_quote_all_original_numeric_suffixes_removed_sha256);assert.equal(parts[i].length,row.quote_characters_utf16);assert.equal(parts[i].split('\n').length,row.lines);assert.equal(parts[i].includes('[Note '),false);}return parts;}
function parsedSources(model,raw){return new Map(IDS.map(id=>{const value=parseApadana(raw.get(id),model.profiles[id]);exactContent(value,model.goldens[id]);return[id,value];}));}

test('publisher421/423-427/429 exact sources retain394 objects,119 paragraphs,101 notes and98 physical quotes',source,()=>{
  const model=authority(),raw=artifacts(model.contract),parsed=parsedSources(model,raw),corpus=canon.load();
  assert.equal(objectSha(corpus.canon),CANONICAL);assert.equal(corpus.canon.units.length,8544);assert.equal(corpus.canon.books.length,61);
  // This is an authenticated historical source witness for unchanged26 datafiles, never a current runtime projection.
  const previous=sealed('docs/evidence/apadana/english411-419-eight/RUNTIME_INVENTORY.json','364339616b495e56c1d4973b691e0334334fc44fcfb975a653be0fd3c4cc35c4');
  const data26=Object.entries(previous.files).filter(([path])=>path.startsWith('data/')&&path!=='data/apadana.json');assert.equal(data26.length,26);
  for(const[path,pin]of data26){const bytes=readSixRegularRelative(ROOT,'server/'+path);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
  let paragraphs=0,notes=0,quotes=0,local=0,global=0;
  for(const id of IDS){
    const p=model.profiles[id],g=model.goldens[id],value=parsed.get(id),unit=corpus.byId.get(id),r=model.contract.entries.find(r=>r.canonical_id===id);
    assert.deepEqual(unit,r.canonical_unit);assert.equal(p.id,id);assert.equal(p.poem,r.publisher_poem);assert.equal(p.publisher_chapter,'chapter-3');
    assert.equal(p.raw_sha256,r.raw.sha256);assert.equal(p.body_sha256,g.body_sha256);assert.equal(p.notes_sha256,g.notes_sha256_JSON_stringify);assert.equal(p.paratext_sha256,g.paratext_sha256);assert.equal(p.publisher_heading_sha256,g.body_paragraphs[0].text_sha256);
    assert.equal(p.translation_revision,APADANA_COMMIT);assert.equal(p.license,'CC BY-NC-SA 4.0');assert.equal(p.translator,'Jonathan S. Walters');assert.deepEqual(p.note_numbers,g.note_numbers);assert.equal(p.note_count,g.note_count);assert.deepEqual(p.stanza_layout,expectedLayout(g));
    assert.equal(Object.hasOwn(p,'index_revision'),Object.hasOwn(unit,'index_revision'));assert.equal(p.index_revision,unit.index_revision);
    assert.equal(rootDigest(unit,corpus.canon.books[unit.book]),g.root_wrapper_sha256_JSON_stringify);assert.equal(validateLink(model.manifest.links[id],id,unit,corpus.canon.books[unit.book]),APADANA_PROFILES[id]);
    const parts=exactQuotes(value,p,g);paragraphs+=g.body_paragraphs.length;notes+=g.note_count;quotes+=parts.length;local+=g.expanded_local_stanza_count;global+=g.publisher_global_label_count;
    for(const changed of [raw.get(id).replace('### ','### X'),raw.get(id).replace('[^3]','[^4]')]){assert.notEqual(sha(changed),sha(raw.get(id)));assert.throws(()=>parseApadana(changed,p));}
    const wrong=structuredClone(p);wrong.stanza_layout[0].local_label='999';assert.throws(()=>parseApadana(raw.get(id),wrong));
    assert.throws(()=>validateLink({...model.manifest.links[id],poem:428},id,unit,corpus.canon.books[unit.book]));assert.throws(()=>validateLink(model.manifest.links[id],id,{...unit,start:unit.start+1},corpus.canon.books[unit.book]));
    assert.throws(()=>quotationText({...value,text:value.text+'X',translation_id:tid(p.poem)}));
  }
  assert.deepEqual({paragraphs,notes,quotes,local,global},{paragraphs:119,notes:101,quotes:98,local:101,global:101});
  assert.equal(parsed.get('tha-ap423').publisher_paratext.length,40);assert.equal(parsed.get('tha-ap423').text.includes('ŋ'),true);assert.equal(model.profiles['tha-ap425'].title.includes('â'),true);
  assert.equal(model.goldens['tha-ap428'].physical_stanzas.length,9);const vriRange=model.contract.entries.find(r=>r.canonical_id==='tha-ap428').canonical_unit.vri.match(/^(\d+)–(\d+)$/);assert.ok(vriRange);assert.equal(Number(vriRange[2])-Number(vriRange[1])+1,10);
  for(const[id,labels]of [['tha-ap429',['5-6']],['tha-ap431',['3-4','9-10']]])for(const label of labels){const at=model.profiles[id].stanza_layout.findIndex(s=>s.local_label===label);assert.ok(at>=0);assert.equal(model.profiles[id].stanza_layout[at].lines,8);const wrong=structuredClone(model.profiles[id]);wrong.stanza_layout[at].local_label=label.split('-')[0];assert.throws(()=>parseApadana(raw.get(id),wrong));}
  const pairs=model.contract.entries.flatMap(r=>r.source_display_pair_vector);assert.equal(pairs.length,9);assert.equal(pairs.some(p=>p.owner==='note:15'&&p.on==='cc'&&p.off==='chch'),true);
});

test('publisher421/423-427/429 actual API preserves37 cursors,98 quotes,complete native pages andNEXT10 source pins',source,async()=>{
  const model=authority(),raw=artifacts(model.contract),parsed=parsedSources(model,raw),byURL=new Map(IDS.map(id=>[model.profiles[id].raw_url,raw.get(id)])),calls=[];
  let corrupt=false;globalThis.fetch=async(input,options={})=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input?.url||'';calls.push(sha(url));assert.equal(options.method||input?.method||'GET','GET');assert.equal(options.body==null,true);assert.ok(byURL.has(url),'Only seven exact pinned official source originals');const text=byURL.get(url);return new Response(corrupt?text.replace('### ','### X'):text,{headers:{'content-type':'text/plain; charset=utf-8'}});};
  let pages=0,nativePages=0,hostViews=0,verifiedQuotes=0,repairedPins=0;
  for(const id of IDS){
    const p=model.profiles[id],g=model.goldens[id],unit=canon.resolve(id).unit,translation=tid(p.poem),choices=english.available(unit),pin=APADANA_VRI_COMMIT+(unit.index_revision?'-'+unit.index_revision:'');assert.ok(choices.some(c=>c.translation_id===translation));
    let args={translation_revision:APADANA_COMMIT,limit:500},assembled='';
    for(const expected of g.pages500){const page=await english.translation(unit,translation,args);assert.equal(page.text_id,id);assert.equal(page.translation_id,translation);assert.equal(page.translation_revision,APADANA_COMMIT);assert.equal(page.offset,expected.offset);assert.equal(page.text.length,expected.characters_utf16);assert.equal(sha(page.text),expected.text_sha256);assert.equal(page.prefix_sha256,expected.start_prefix_sha256);assert.equal(page.next_offset,expected.next_offset);assert.equal(objectSha(page.translator_notes),g.notes_sha256_JSON_stringify);assert.equal(page.license,'CC BY-NC-SA 4.0');assert.deepEqual(page.mapping_notes,p.mapping_notes);validateEnglishPage(page,{uid:id,translation,...args},{uid:id,choices,accepted:null});assembled+=page.text;pages++;if(expected.next_offset===null)assert.equal(page.continue_with,null);else{assert.equal(page.continue_with.arguments.prefix_sha256,expected.continuation_prefix_sha256);args=page.continue_with.arguments;}}
    assert.equal(sha(assembled),g.body_sha256);
    await assert.rejects(english.translation(unit,translation,{offset:500,limit:500,prefix_sha256:'0'.repeat(64),translation_revision:APADANA_COMMIT}));await assert.rejects(english.translation(unit,translation,{offset:500,limit:500,prefix_sha256:g.pages500[1].start_prefix_sha256}));await assert.rejects(english.translation(unit,translation,{translation_revision:'0'.repeat(40),limit:500}));
    const before=calls.length,pali=await readPassage({uid:id,english:false});assert.equal(pali.english,null);assert.equal(calls.length,before);assert.equal(pali.source.locator_revision||pali.source.commit,pin);
    if(unit.index_revision){const beforeStale=calls.length;await assert.rejects(readPassage({uid:id,offset:0,source_commit:APADANA_VRI_COMMIT,english:false}));assert.equal(calls.length,beforeStale);repairedPins++;}
    const navigation=apadanaEditionNavigation(pali),observed=navigation.groups.flatMap(g=>g.poems),ordered=Object.values(model.context.english.profiles).filter(p=>p.publisher_chapter==='chapter-3').sort((a,b)=>a.poem-b.poem);
    assert.equal(ordered.length,361);assert.deepEqual(observed.map(p=>({uid:p.uid,label:p.label})),ordered.map(p=>({uid:p.id,label:'Publisher poem '+p.poem+' · '+p.title+' · '+p.id})));assert.equal(navigation.current.uid,id);
    const result=await readPassage({uid:id,source_commit:pin,translation,english_translation_revision:APADANA_COMMIT,englishCharacters:6000});assert.ok(result.english,result.english_error);const value=result.english;
    assert.equal(value.offset,0);assert.equal(value.text.length,g.body_characters_utf16);assert.ok(value.text.length<6000);assert.equal(sha(value.text),g.body_sha256);assert.equal(value.prefix_sha256,sha(''));assert.equal(value.next_offset,null);assert.equal(value.continue_with,null);assert.equal(value.truncated,false);assert.equal(objectSha(value.translator_notes),g.notes_sha256_JSON_stringify);assert.equal(sha(value.publisher_paratext),g.paratext_sha256);assert.equal(value.translation_id,translation);assert.equal(value.translation_revision,APADANA_COMMIT);assert.deepEqual(value.mapping_notes,p.mapping_notes);assert.deepEqual(result.pali.segments,pali.pali.segments);assert.deepEqual(result.source,pali.source);assert.equal(value.read_with.arguments.source_commit,pin);validateApadanaChoice(value,id,true);nativePages++;
    for(const bridge of ['Apps SDK','MCP Apps']){const host=view(bridge);host.output(structuredClone(result));assert.ok(host.elements.english.textContent.includes(value.text));for(const n of p.mapping_notes)assert.ok(host.elements.english.textContent.includes(n));
      for(const change of [e=>{e.text='X'+e.text.slice(1);},e=>{e.translator_notes[0].text+='X';},e=>{e.translator_notes.pop();},e=>{e.publisher_paratext=id==='tha-ap423'?'X'+e.publisher_paratext.slice(1):' ';},e=>{e.mapping_notes=[];},e=>{e.translation_revision='0'.repeat(40);},e=>{e.translation_id=tid(428);},e=>{e.license='CC0';}]){const bad=structuredClone(result);change(bad.english);assert.throws(()=>validateApadanaChoice(bad.english,id,true));host.output(bad);assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(host.elements.pali.textContent.includes(result.pali.segments[0].text));host.output(structuredClone(result));assert.ok(host.elements.english.textContent.includes(value.text));}hostViews++;}
    for(const text of exactQuotes(parsed.get(id),p,g)){const checked=await verifyQuote({text,language:'english',texts:[id],translation_ids:[translation],limit:1});assert.equal(checked.verdict,'found');assert.equal(checked.best_similarity,1);assert.equal(checked.scope.complete_source_versions_compared,1);assert.equal(checked.scope.source_versions_not_compared,0);assert.ok(checked.matches.some(m=>m.text_id===id&&m.translation_id===translation&&m.translation_revision===APADANA_COMMIT&&m.citation===unit.acronym&&m.similarity===1));verifiedQuotes++;}
    assert.equal(canon.resolve(unit.acronym).unit.id,id);
    corrupt=true;liveCache.clear();await assert.rejects(english.translation(unit,translation,{limit:500,translation_revision:APADANA_COMMIT}));corrupt=false;liveCache.clear();assert.equal(sha((await english.translation(unit,translation,{limit:500,translation_revision:APADANA_COMMIT})).text),g.pages500[0].text_sha256);
  }
  assert.deepEqual({pages,nativePages,hostViews,verifiedQuotes,repairedPins},{pages:37,nativePages:7,hostViews:14,verifiedQuotes:98,repairedPins:5});assert.deepEqual([...new Set(calls)],IDS.map(id=>sha(model.profiles[id].raw_url)));
  for(const[publisher,id]of [[422,'tha-ap424'],[428,'tha-ap430'],[430,'tha-ap432'],[413,'tha-ap415'],[420,'tha-ap422']]){const before=calls.length;await assert.rejects(english.translation(canon.resolve(id).unit,tid(publisher)));assert.equal(calls.length,before);}
});
