/** Eight pinned publisher editions. Oracles are reviewed source data, never SUT output. */
import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,rootDigest,validateLink} from '../src/apadana.mjs';
import {theraMultiLabelQuotation} from '../src/apadana-thera.mjs';
import {readPassage,WIDGET_VERSION} from '../src/chatgpt-widget.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {liveCache} from '../src/cache.mjs';
import {validateApadanaChoice,validateEnglishPage} from '../web/translation-policy.mjs';
import {apadanaEditionNavigation} from '../web/apadana-edition-navigation.mjs';
import {currentContext} from './helpers/current-apadana.mjs';
import {intake382Authority} from './helpers/intake382-metadata.mjs';
import {readSixRegularRelative} from './helpers/six-regular-file.mjs';
import {view} from './helpers/widget-view.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const IDS=['tha-ap413','tha-ap414','tha-ap416','tha-ap417','tha-ap418','tha-ap419','tha-ap420','tha-ap421'];
const PUBLISHERS=[411,412,414,415,416,417,418,419];
const CANONICAL='883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a';
const checkout=process.env.APADANA_SOURCE_CHECKOUT?resolve(ROOT,process.env.APADANA_SOURCE_CHECKOUT):null;
// Missing source is optional only in ordinary inventory; dedicated CI requires these two names,2pass/0skip.
const source={skip:!checkout,timeout:30000};
const sha=x=>createHash('sha256').update(x).digest('hex');
const objectSha=x=>sha(JSON.stringify(x));
const blob=x=>createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const tid=n=>'ap:chapter-3/poem-'+n;
const DIR='docs/evidence/apadana/english411-419-eight/';
const ORIGINAL={
  'INPUT_CONTRACT.json':'b80c6b5d5fb6ce829a70d4a934bf5d63159124d5b86273b15b6ad911f15caf3c',
  'NORMALIZED_EXPECTATIONS.json':'7496fcd17fb9f4576aee04108ffb32cb63a45ad1e37794822ce3edcc656db149',
  'RAW_NORMALIZATION_BINDINGS.json':'a3d6648bd39baaf2b047d2ffb6064a8795352692563b2cfc111c465a8c8eb4ff',
  'ORIGINAL_XML_REPLAY.json':'25c006242820761c647b0326330738d2120f1ef86c195540381208853f8ab0fa',
  'RAW_SOURCE_REVIEW.json':'d687e610431baf192b473f8b4f0d23be5ccad982bcd73021b962687762d07644',
  'NORMALIZATION_REVIEW.json':'9d555fbfa38c2f80bab6101a5c2e952a4b37471ad206f22c5df733a503a38992',
  'NORMALIZATION_COMPARISON_PROOF.json':'1b02c9d8e12614e86d7a91cccb2a9e9f0a0a71134e9e3e0b797143b088701089',
  'SOURCE_DOMAIN_MANIFEST.json':'af9d688c68ce8b9c92a2bbfbb77fe46dfeb91aafd0db4974037882f37f716513',
  'SOURCE_BINDINGS.json':'c2fd278d28188f159124d77d10cc58cccd2ffd921d12d412dcc96a79576344ef'
};
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});
function sealed(path,expected){const raw=readSixRegularRelative(ROOT,path);assert.equal(sha(raw),expected);return JSON.parse(raw);}
function authority(){
  const d=Object.fromEntries(Object.entries(ORIGINAL).map(([name,pin])=>[name,sealed(DIR+name,pin)]));
  const contract=d['INPUT_CONTRACT.json'],goldens=d['NORMALIZED_EXPECTATIONS.json'],bindings=d['SOURCE_BINDINGS.json'];
  assert.deepEqual(contract.literal_pairs,PUBLISHERS.map((n,i)=>[n,IDS[i]]));
  assert.equal(APADANA_COMMIT,contract.publisher_revision);
  assert.deepEqual(bindings.source_contract,contract);assert.deepEqual(bindings.source_derived_API_expected_metadata,{entries:goldens.entries});
  assert.equal(d['RAW_SOURCE_REVIEW.json'].status,'GO_EIGHT_RAW_EDITION_SCOPES_FOR_NEXT_NORMALIZATION_ONLY_KEEP_TWO_CONDITIONAL');
  assert.equal(d['NORMALIZATION_REVIEW.json'].status,'GO_EXACT_EIGHT_SOURCE_NORMALIZATION_DOMAINS_ONLY');
  assert.equal(d['NORMALIZATION_REVIEW.json'].runtime_or_activation_or_release_approval,false);
  assert.deepEqual(contract.conditional_publishers_unchanged,[413,420]);
  assert.equal(contract.canonical_logical_sha256,CANONICAL);
  return {contract,goldens:goldens.entries,bindings};
}
function actualContext(){
  const context=currentContext(ROOT),old382=intake382Authority(ROOT);
  const fourProfiles=sealed('docs/evidence/apadana/english394-407-four/PROFILES.json','fef6e9e9af3c70dd5efdbec3e98a9d882165cde92337df022b1e49e4077415b1');
  const fourLinks=sealed('docs/evidence/apadana/english394-407-four/LINKS.json','116e8fbe5437a47c8226496a7f2bd4c7657ed2dbd47a0cf78094417edd2fa251');
  const oldProfiles={...old382.profiles,...fourProfiles},oldLinks={...old382.links,...fourLinks};
  const oldIds=old382.ids.concat(Object.keys(fourProfiles));assert.equal(oldIds.length,386);
  const cohort=context.english.source_cohorts.eight411419;
  assert.deepEqual(cohort.ids,IDS);assert.deepEqual(cohort.records,PUBLISHERS.map((n,i)=>({id:IDS[i],publisher_chapter:'chapter-3',poem:n})));
  const cohortIds=oldIds.concat(IDS);assert.equal(cohortIds.length,394);
  const manifest=JSON.parse(readSixRegularRelative(ROOT,'server/data/apadana.json'));
  // Actual CURRENT is compared in full to the independently guarded live source role.
  assert.deepEqual(APADANA_PROFILES,context.english.profiles);assert.deepEqual(manifest,context.english.manifest);
  assert.deepEqual(Object.keys(APADANA_PROFILES),context.english.ids);assert.deepEqual(Object.keys(manifest.links),context.english.ids);
  // Fixed historical386 and this394 cohort are separate source declarations, never projected runtime.
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,394),cohortIds);assert.deepEqual(Object.keys(manifest.links).slice(0,394),cohortIds);
  for(const id of oldIds){assert.deepEqual(APADANA_PROFILES[id],oldProfiles[id]);assert.deepEqual(manifest.links[id],oldLinks[id]);}
  for(const id of IDS){assert.deepEqual(APADANA_PROFILES[id],cohort.profiles[id]);assert.deepEqual(manifest.links[id],cohort.links[id]);}
  assert.deepEqual(manifest.held,old382.manifest.held);assert.equal(context.canonical.new_canonical_logical_sha256,CANONICAL);
  assert.equal(WIDGET_VERSION,context.widget.version);assert.equal(context.widget.uri,'ui://pali-canon/reader-'+WIDGET_VERSION+'.html');
  const held=['tha-ap72','tha-ap142','tha-ap160','tha-ap161','tha-ap262','tha-ap268','tha-ap282','tha-ap308','tha-ap309','tha-ap360'];
  assert.deepEqual(old382.selection.held_ids,held);for(const id of held)assert.equal(Object.hasOwn(APADANA_PROFILES,id),false);
  for(const publisher of [391,392,393,403,404,405,408,409,410,413,420])assert.equal(Object.values(APADANA_PROFILES).some(p=>p.publisher_chapter==='chapter-3'&&p.poem===publisher),false);
  assert.equal(oldIds.filter(id=>id.startsWith('thi-ap')).length,40);assert.equal(oldIds.filter(id=>id.startsWith('tha-ap')).length,346);
  return {context,cohort,manifest,oldProfiles,cohortProfiles:{...oldProfiles,...cohort.profiles}};
}
function artifacts(contract){
  for(const row of contract.specific_rights_artifacts){const bytes=readSixRegularRelative(checkout,row.path);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),row.sha256);assert.equal(blob(bytes),row.git_blob_sha1);}
  return new Map(contract.entries.map(row=>{const bytes=readSixRegularRelative(checkout,row.raw.path);assert.equal(bytes.length,row.raw.bytes);assert.equal(sha(bytes),row.raw.sha256);assert.equal(blob(bytes),row.raw.git_blob_sha1);return[row.canonical_id,bytes.toString('utf8')];}));
}
function exactContent(value,g){
  assert.deepEqual(Object.keys(value),['title','text','translator_notes','publisher_paratext']);assert.equal(value.title,g.title);
  assert.equal(sha(value.text),g.body_sha256);assert.equal(value.text.length,g.body_characters_utf16);
  assert.equal(objectSha(value.translator_notes),g.notes_sha256_JSON_stringify);assert.deepEqual(value.translator_notes.map(n=>n.number),g.note_numbers);
  const paragraphs=value.text.split('\n\n');assert.equal(paragraphs.length,g.body_paragraphs.length);
  for(const row of g.body_paragraphs){const part=paragraphs[row.paragraph_index0];assert.equal(sha(part),row.text_sha256);assert.equal(part.length,row.characters_utf16);assert.equal(part.split('\n').length,row.lines);assert.equal(value.text.slice(...row.body_utf16),part);assert.deepEqual([...part.matchAll(/\[Note (\d+)\]/g)].map(m=>Number(m[1])),row.original_note_numbers);}
  for(const row of g.note_owners){const note=value.translator_notes[row.number-1];assert.equal(note.number,row.number);assert.equal(sha(note.text),row.text_sha256);assert.equal(note.text.length,row.characters_utf16);assert.deepEqual(paragraphs.flatMap((p,i)=>p.includes('[Note '+row.number+']')?[i]:[]),[row.owner_body_paragraph_index0]);}
  assert.equal(sha(value.publisher_paratext),g.paratext_sha256);assert.equal(value.publisher_paratext.length,g.paratext_characters_utf16);
}
function expectedLayout(g){return g.physical_stanzas.map(row=>row.numeric_markers.length===1?{local_label:String(row.numeric_markers[0].local_label),publisher_label:row.numeric_markers[0].publisher_global_label===null?null:String(row.numeric_markers[0].publisher_global_label),suffix:row.numeric_markers[0].suffix.trimStart(),lines:row.lines}:{paragraph:row.body_paragraph_index0,entries:row.numeric_markers.map(m=>({local_label:String(m.local_label),publisher_label:m.publisher_global_label===null?null:String(m.publisher_global_label),suffix:m.suffix.trimStart(),line:m.line1})),lines:row.lines,finite_multi_label:true});}
function parsedSources(model,profiles,raw){return new Map(IDS.map(id=>{const value=parseApadana(raw.get(id),profiles[id]);exactContent(value,model.goldens[id]);return[id,value];}));}
function exactQuotes(value,p,g){const parts=quotationText({...value,translation_id:tid(p.poem)}).split('\n\n');assert.equal(parts.length,g.physical_stanzas.length);for(const[i,row]of g.physical_stanzas.entries()){assert.equal(sha(parts[i]),row.physical_quote_all_original_numeric_suffixes_removed_sha256);assert.equal(parts[i].length,row.quote_characters_utf16);assert.equal(parts[i].split('\n').length,row.lines);assert.equal(parts[i].includes('[Note '),false);}return parts;}

test('publisher411/412/414-419 exact sources retain386 objects,179 paragraphs,183 notes and156 local labels',source,()=>{
  const model=authority(),{cohort,manifest,oldProfiles}=actualContext(),profiles=cohort.profiles,raw=artifacts(model.contract),parsed=parsedSources(model,profiles,raw),corpus=canon.load();
  assert.equal(objectSha(corpus.canon),CANONICAL);assert.equal(corpus.canon.books.length,61);assert.equal(corpus.canon.units.length,8544);
  const oldInventory=sealed('docs/evidence/apadana/english394-407-four/RUNTIME_INVENTORY.json','532d80523591416519bea6cfe0cada68db7d0e80873d89fa4696844ce06faf45');
  const data26=Object.entries(oldInventory.files).filter(([p])=>p.startsWith('data/')&&p!=='data/apadana.json');assert.equal(data26.length,26);
  for(const[path,pin]of data26){const bytes=readSixRegularRelative(ROOT,'server/'+path);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);}
  let paragraphs=0,notes=0,quotes=0,local=0,global=0;
  for(const id of IDS){
    const p=profiles[id],g=model.goldens[id],value=parsed.get(id),unit=corpus.byId.get(id),r=model.contract.entries.find(r=>r.canonical_id===id);
    assert.equal(p.id,id);assert.equal(p.poem,r.publisher_poem);assert.equal(p.publisher_chapter,'chapter-3');assert.equal(p.raw_sha256,r.raw.sha256);
    assert.equal(p.body_sha256,g.body_sha256);assert.equal(p.notes_sha256,g.notes_sha256_JSON_stringify);assert.equal(p.paratext_sha256,g.paratext_sha256);assert.equal(p.publisher_heading_sha256,g.body_paragraphs[0].text_sha256);
    assert.equal(p.translation_revision,APADANA_COMMIT);assert.equal(p.license,'CC BY-NC-SA 4.0');assert.equal(p.translator,'Jonathan S. Walters');
    assert.deepEqual(p.note_numbers,g.note_numbers);assert.equal(p.note_count,g.note_count);assert.deepEqual(p.stanza_layout,expectedLayout(g));
    assert.deepEqual(manifest.links[id],{...p,english:p.title,match:'individually-reviewed-whole-poem'});assert.equal(rootDigest(unit,corpus.canon.books[unit.book]),g.root_wrapper_sha256_JSON_stringify);assert.equal(validateLink(manifest.links[id],id,unit,corpus.canon.books[unit.book]),APADANA_PROFILES[id]);
    const parts=exactQuotes(value,p,g);paragraphs+=g.body_paragraphs.length;notes+=g.note_count;quotes+=parts.length;local+=g.expanded_local_stanza_count;global+=g.publisher_global_label_count;
    // Genuine source/quote positives precede source/owner/root drift refusals.
    for(const changed of [raw.get(id).replace('### ','### X'),raw.get(id).replace('[^3]','[^4]')]){assert.notEqual(changed,raw.get(id));assert.throws(()=>parseApadana(changed,p));}
    const wrong=structuredClone(p);wrong.stanza_layout[0].local_label='999';assert.throws(()=>parseApadana(raw.get(id),wrong));
    assert.throws(()=>validateLink({...manifest.links[id],poem:413},id,unit,corpus.canon.books[unit.book]));assert.throws(()=>validateLink(manifest.links[id],id,{...unit,start:unit.start+1},corpus.canon.books[unit.book]));
    assert.throws(()=>quotationText({...value,text:value.text+'X',translation_id:tid(p.poem)}));
  }
  assert.deepEqual({paragraphs,notes,quotes,local,global},{paragraphs:179,notes:183,quotes:155,local:156,global:154});
  const p=profiles['tha-ap413'],body=parsed.get(p.id).text.split('\n\n'),stanza=p.stanza_layout[17],gold=model.goldens[p.id].physical_stanzas[17];
  assert.equal(body[13].split('\n').length,6);assert.equal(body[18].split('\n').length,10);assert.deepEqual(stanza.entries.map(e=>e.line),[6,10]);assert.equal(parsed.get(p.id).publisher_paratext.length,34);
  assert.equal(sha(theraMultiLabelQuotation(body[18],stanza,p,17)),gold.physical_quote_all_original_numeric_suffixes_removed_sha256);
  const badParagraphs=[body[18].replace('(18) [4285]','(18) [4286]'),body[18].replace('(18) [4285]',''), 'X'+body[18].slice(1),body[18].split('\n').reverse().join('\n')];
  for(const text of badParagraphs){assert.notEqual(text,body[18]);assert.throws(()=>theraMultiLabelQuotation(text,stanza,p,17));}
  for(const change of [s=>{s.entries[0].line=4;},s=>{s.entries[1].line=6;},s=>{s.entries.reverse();},s=>{s.entries.pop();},s=>{s.extra=true;}]){const changed=structuredClone(stanza);change(changed);assert.throws(()=>theraMultiLabelQuotation(body[18],changed,p,17));}
  for(const wrong of [{...p,id:'tha-ap133'},{...p,raw_sha256:'0'.repeat(64)},{...p,body_sha256:'0'.repeat(64)}]){let touched=false;const inaccessible={replace(){touched=true;throw Error('untrusted source words touched');}};assert.throws(()=>theraMultiLabelQuotation(inaccessible,stanza,wrong,17),/differs/);assert.equal(touched,false);}
  const localOnly=profiles['tha-ap420'].stanza_layout;assert.deepEqual([localOnly[15],localOnly[16]].map(s=>[s.local_label,s.publisher_label,s.suffix]),[['16',null,'(16)'],['17',null,'(17)']]);
  for(const i of [15,16]){const wrong=structuredClone(profiles['tha-ap420']);wrong.stanza_layout[i].publisher_label='4431';wrong.stanza_layout[i].suffix+=' [4431]';assert.throws(()=>parseApadana(raw.get('tha-ap420'),wrong));}
  // Existing Sobhita12/8-line branch uses its genuine, independently pinned old source.
  const old=model.bindings.historical_multilabel_branch.entry,oldp=oldProfiles[old.id],oldraw=readSixRegularRelative(checkout,old.path);assert.equal(oldraw.length,old.bytes);assert.equal(sha(oldraw),old.raw_sha256);assert.equal(blob(oldraw),old.git_blob_sha1);
  const oldvalue=parseApadana(oldraw.toString('utf8'),oldp);assert.equal(sha(oldvalue.text),old.body_sha256);assert.deepEqual(oldp.stanza_layout,old.stanza_layout);
  for(const index of [2,5]){const paragraph=oldvalue.text.split('\n\n')[index+1],s=old.stanza_layout[index],lines=paragraph.replace(/\[Note \d+\]/g,'').trim().split('\n');for(const e of s.entries){assert.ok(lines[e.line-1].endsWith(e.suffix));lines[e.line-1]=lines[e.line-1].slice(0,-e.suffix.length).trimEnd();}assert.equal(theraMultiLabelQuotation(paragraph,s,oldp,index),lines.join('\n'));assert.throws(()=>theraMultiLabelQuotation(paragraph,s,p,index));}
});

test('publisher411/412/414-419 actual API and embedded guards preserve54 cursors,155 quotes and6000+1546 continuation',source,async()=>{
  const model=authority(),{context,cohort,cohortProfiles}=actualContext(),profiles=cohort.profiles,raw=artifacts(model.contract),parsed=parsedSources(model,profiles,raw),byURL=new Map(IDS.map(id=>[profiles[id].raw_url,raw.get(id)])),calls=[];
  let corrupt=false;
  globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.href;assert.ok(byURL.has(url),'Only the eight pinned official originals');calls.push(url);const text=byURL.get(url);return new Response(corrupt?text.replace('### ','### X'):text,{headers:{'content-type':'text/plain; charset=utf-8'}});};
  let pages=0,nativePages=0,hostViews=0,verifiedQuotes=0;
  for(const id of IDS){
    const p=profiles[id],g=model.goldens[id],unit=canon.resolve(id).unit,translation=tid(p.poem),choices=english.available(unit);assert.ok(choices.some(c=>c.translation_id===translation));
    let args={translation_revision:APADANA_COMMIT,limit:500},assembled='';
    for(const expected of g.pages500){const page=await english.translation(unit,translation,args);assert.equal(page.text_id,id);assert.equal(page.translation_id,translation);assert.equal(page.translation_revision,APADANA_COMMIT);assert.equal(page.offset,expected.offset);assert.equal(page.text.length,expected.characters_utf16);assert.equal(sha(page.text),expected.text_sha256);assert.equal(page.prefix_sha256,expected.start_prefix_sha256);assert.equal(page.next_offset,expected.next_offset);assert.equal(objectSha(page.translator_notes),g.notes_sha256_JSON_stringify);assert.equal(page.license,'CC BY-NC-SA 4.0');assert.deepEqual(page.mapping_notes,p.mapping_notes);validateEnglishPage(page,{uid:id,translation,...args},{uid:id,choices,accepted:null});assembled+=page.text;pages++;if(expected.next_offset===null)assert.equal(page.continue_with,null);else{assert.equal(page.continue_with.arguments.prefix_sha256,expected.continuation_prefix_sha256);args=page.continue_with.arguments;}}
    assert.equal(sha(assembled),g.body_sha256);assert.equal(assembled,parsed.get(id).text);
    await assert.rejects(english.translation(unit,translation,{offset:500,limit:500,prefix_sha256:'0'.repeat(64),translation_revision:APADANA_COMMIT}));
    await assert.rejects(english.translation(unit,translation,{offset:500,limit:500,prefix_sha256:g.pages500[1].start_prefix_sha256}));
    await assert.rejects(english.translation(unit,translation,{translation_revision:'0'.repeat(40),limit:500}));
    const before=calls.length,pali=await readPassage({uid:id,english:false});assert.equal(pali.english,null);assert.equal(calls.length,before);
    const navigation=apadanaEditionNavigation(pali),observed=navigation.groups.flatMap(g=>g.poems),ordered=Object.values(context.english.profiles).filter(p=>p.publisher_chapter==='chapter-3').sort((a,b)=>a.poem-b.poem);
    assert.deepEqual(observed.map(p=>({uid:p.uid,label:p.label})),ordered.map(p=>({uid:p.id,label:'Publisher poem '+p.poem+' · '+p.title+' · '+p.id})));assert.equal(navigation.current.uid,id);assert.equal(navigation.revision,APADANA_COMMIT);
    const historicalOrdered=Object.values(cohortProfiles).filter(p=>p.publisher_chapter==='chapter-3').sort((a,b)=>a.poem-b.poem),cohortSet=new Set(historicalOrdered.map(p=>p.id));assert.deepEqual(observed.filter(p=>cohortSet.has(p.uid)).map(p=>p.uid),historicalOrdered.map(p=>p.id));
    let current={uid:id,translation,english_translation_revision:APADANA_COMMIT,englishCharacters:6000},nativeBody='';const lengths=[];
    for(const expected of model.bindings.native6000_page_expectations[id]){
      const result=await readPassage(current);assert.ok(result.english,result.english_error);const value=result.english;assert.equal(value.offset,expected.offset);assert.equal(sha(value.text),expected.text_sha256);assert.equal(value.text.length,expected.characters_utf16);assert.equal(value.prefix_sha256,expected.start_prefix_sha256);assert.equal(value.next_offset,expected.next_offset);if(value.continue_with)assert.equal(value.continue_with.arguments.english_prefix_sha256,expected.continuation_prefix_sha256);assert.equal(value.text,parsed.get(id).text.slice(value.offset,value.offset+6000));assert.equal(value.translation_id,translation);assert.equal(value.translation_revision,APADANA_COMMIT);assert.equal(value.license,'CC BY-NC-SA 4.0');assert.deepEqual(value.mapping_notes,p.mapping_notes);assert.equal(objectSha(value.translator_notes),g.notes_sha256_JSON_stringify);assert.equal(sha(value.publisher_paratext),g.paratext_sha256);assert.deepEqual(result.pali.segments,pali.pali.segments);assert.deepEqual(result.source,pali.source);validateApadanaChoice(value,id,true);lengths.push(value.text.length);nativeBody+=value.text;nativePages++;
      for(const bridge of ['Apps SDK','MCP Apps']){
        const host=view(bridge);host.output(structuredClone(result));assert.ok(host.elements.english.textContent.includes(value.text));for(const note of p.mapping_notes)assert.ok(host.elements.english.textContent.includes(note));
        const changes=[e=>{e.translator_notes[0].text+='X';},e=>{e.translator_notes.pop();},e=>{e.publisher_paratext=id==='tha-ap413'?'X'+e.publisher_paratext.slice(1):' ';},e=>{e.mapping_notes=[];},e=>{e.license='CC0';},e=>{e.translation_revision='0'.repeat(40);},e=>{e.translation_id=tid(413);},e=>{e.url='https://example.invalid/';}];
        // Whole-body client hashing only applies to complete single-page results. Partial-page trust remains server-authenticated.
        if(value.offset===0&&value.next_offset===null)changes.push(e=>{e.text='X'+e.text.slice(1);});
        for(const change of changes){const bad=structuredClone(result);change(bad.english);assert.throws(()=>validateApadanaChoice(bad.english,id,true));host.output(bad);assert.match(host.elements.english.textContent,/No English|No translation/);assert.ok(host.elements.pali.textContent.includes(result.pali.segments[0].text));host.output(structuredClone(result));assert.ok(host.elements.english.textContent.includes(value.text));}
        hostViews++;
      }
      current=value.continue_with?{...value.continue_with.arguments,englishCharacters:6000}:null;
    }
    assert.equal(current,null);assert.equal(sha(nativeBody),g.body_sha256);assert.deepEqual(lengths,id==='tha-ap414'?[6000,1546]:[g.body_characters_utf16]);
    for(const text of exactQuotes(parsed.get(id),p,g)){
      const checked=await verifyQuote({text,language:'english',texts:[id],translation_ids:[translation],limit:1});assert.equal(checked.verdict,'found');assert.equal(checked.best_similarity,1);assert.equal(checked.scope.complete_source_versions_compared,1);assert.equal(checked.scope.source_versions_not_compared,0);assert.ok(checked.matches.some(m=>m.text_id===id&&m.translation_id===translation&&m.translation_revision===APADANA_COMMIT&&m.citation===unit.acronym&&m.similarity===1));verifiedQuotes++;
    }
    assert.equal(canon.resolve(unit.acronym).unit.id,id);
    corrupt=true;liveCache.clear();await assert.rejects(english.translation(unit,translation,{limit:500,translation_revision:APADANA_COMMIT}));corrupt=false;liveCache.clear();assert.equal(sha((await english.translation(unit,translation,{limit:500,translation_revision:APADANA_COMMIT})).text),g.pages500[0].text_sha256);
  }
  assert.deepEqual({pages,nativePages,hostViews,verifiedQuotes},{pages:54,nativePages:9,hostViews:18,verifiedQuotes:155});assert.deepEqual([...new Set(calls)],IDS.map(id=>profiles[id].raw_url));
  for(const[publisher,id]of [[413,'tha-ap415'],[420,'tha-ap422']]){const before=calls.length;await assert.rejects(english.translation(canon.resolve(id).unit,tid(publisher)));assert.equal(calls.length,before);}
});
