// Boundary wording/root correctness has its
// separate independently pinned source suite; these tests exercise locator gates.
import {test,before,after} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildIndex,toCsv,CSV_COLUMNS} from '../scripts/export-index.mjs';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {analysePassage} from '../src/analyse.mjs';
import {assertCanonicalLocator,requiredCanonicalRevision,isCanonicalReopenRoute} from '../src/locator-policy.mjs';
import {validateCanonicalSearch,canonicalSearchSelection} from '../web/canonical-search.mjs';
import {validatePaliQuote} from '../web/quote-check.mjs';
import {readingToolResult} from '../web/tool-result.mjs';
import {view} from './helpers/widget-view.mjs';
import {parseBookmarks,bookmarkMerge} from '../web/bookmark-import.mjs';
import {bookmarkLocation} from '../web/bookmark-location.mjs';
import {passageNoteState,passageNoteKey} from '../web/passage-notes.mjs';
import {assertPositionPin} from '../web/reading-position.mjs';

const ORIGINAL='2d134ff9ef60f70a1eb03c9370580228811a3070';
const PAIR=ORIGINAL+'-apadana-thera105-106-v1';
const FOUR=ORIGINAL+'-apadana-thera333-336-v1';
const SIX=ORIGINAL+'-apadana-thera340-341-343-344-346-347-v1';
const TEN=ORIGINAL+'-apadana-thera-next10-v1';
const IDS=Object.freeze(['tha-ap348','tha-ap349','tha-ap374','tha-ap375','tha-ap423','tha-ap424','tha-ap426','tha-ap427','tha-ap428','tha-ap429']);
const EXPECTED=Object.freeze(Object.fromEntries(IDS.map(id=>[id,TEN])));
const OLD_EXPECTED=Object.freeze({'tha-ap107':PAIR,'tha-ap108':PAIR,'tha-ap333':FOUR,'tha-ap334':FOUR,'tha-ap335':FOUR,'tha-ap336':FOUR,'tha-ap340':SIX,'tha-ap341':SIX,'tha-ap343':SIX,'tha-ap344':SIX,'tha-ap346':SIX,'tha-ap347':SIX});
const ids=IDS,proofDir='docs/evidence/apadana/boundaries-next-ten/';
const hash=value=>createHash('sha256').update(value).digest('hex');
function sealed(file,pin){const bytes=readFileSync(proofDir+file);assert.equal(hash(bytes),pin,'Independent original-first '+file);return JSON.parse(bytes);}
const SOURCE=sealed('FUTURE_ORACLE.json','78fd34efd9942bb363010123f4019cfa31df3b609fbd3736d2db7288c2036655');
const RECORDS=sealed('NEW_TEN_RECORDS.json','c0a008965acd462b45dcf35eaf8e19abd6246f36a9c64fbb4cab5d4fd16962b0');
const RENDERED=sealed('ISOLATED_RENDER_POSITIONS.json','33e6e64703a26c03fc159887ae05248ed5bccec1c5196f29bf3801c176f6d2c1');
const CROSSWALK=sealed('POSITION_CROSSWALK144.json','223bc745f40774b50f41df41073f1b7f8c67b8eb4067ef28556dd4bb22ac439f');
assert.deepEqual(SOURCE.targets,ids);assert.deepEqual(Object.keys(RECORDS),ids);
assert.equal(SOURCE.future_canonical_logical_sha256,'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de');
assert.equal(RENDERED.source_preseal_before_renderer,'78fd34efd9942bb363010123f4019cfa31df3b609fbd3736d2db7288c2036655');
assert.equal(RENDERED.original_source_unchanged,true);assert.deepEqual(RENDERED.proposed.map(u=>u.id),ids);
assert.equal(SOURCE.app_Builder_or_proposed_repair_imports,false);assert.equal(SOURCE.coverage_gain,0);
const STALE=Object.freeze([undefined,ORIGINAL,PAIR,FOUR,SIX,ORIGINAL+'-foreign-review-v1']);
let client,originalFetch,fetches=0;
before(async()=>{
 originalFetch=globalThis.fetch;globalThis.fetch=async()=>{fetches++;throw Error('No provider transport is authorized by these offline canonical locator tests');};
 const[a,b]=InMemoryTransport.createLinkedPair();client=new Client({name:'finite-next-ten-canonical-locator-consumers',version:'1'});
 await Promise.all([client.connect(a),createServer().connect(b)]);
});
after(async()=>{try{await client?.close();}finally{globalThis.fetch=originalFetch;}assert.equal(fetches,0,'Canonical gates need no live English/provider transport');});
const call=(name,args)=>client.callTool({name,arguments:args});
function data(result){assert.notEqual(result.isError,true,'Registered tool unexpectedly refused the source-pinned positive');assert.ok(result.structuredContent);return result.structuredContent;}
function refusal(result){
 assert.equal(result.isError,true,'Expected actual registered MCP refusal');
 const raw=result.content?.find(item=>item.type==='text')?.text;assert.equal(typeof raw,'string');
 let body;try{body=JSON.parse(raw);}catch{body={error:raw};}
 assert.equal(typeof body.error,'string');assert.ok(body.error.length);
 for(const key of ['segments','pali','words','matches','results'])assert.equal(body[key],undefined,'No replacement '+key+' in failure');
 return body;
}
const unit=id=>canon.resolve(id).unit;
// This is query INPUT only. Expected ownership/pins/wording always come from the sealed source tables.
// Prefer a long source verse over the ubiquitous short closing formula; never skip a missing selected hit.
const QUERY_REF=Object.freeze({'tha-ap349':'tha-ap349/2','tha-ap375':'tha-ap375/2'});
const body=id=>{const candidates=canon.segments(unit(id)).filter(s=>s.type==='verse'&&s.text.trim().split(/\s+/).length>=8);return QUERY_REF[id]?candidates.find(s=>s.ref===QUERY_REF[id]):candidates.sort((a,b)=>b.text.length-a.text.length)[0];};
const quote=id=>{const segment=body(id);assert.ok(segment,'A genuine body segment is mandatory for '+id);const witness=RENDERED.proposed.find(u=>u.id===id).segments.find(s=>s.ref===segment.ref);assert.equal(hash(segment.text),witness.text_sha256);const text=segment.text.replace(/\s+/g,' ').trim().split(' ').slice(0,40).join(' ');assert.ok(text.length>=8&&text.length<=296,'Bounded source query');return text;};

test('ten newly repaired owners registry rejects missing/bad current metadata and old expected pins; unrelated IDs remain outside',()=>{
 for(const id of ids){const current=EXPECTED[id];assert.equal(requiredCanonicalRevision(id),current);
  for(const observed of [...STALE,'bad'])assert.throws(()=>assertCanonicalLocator(id,observed),e=>e.code==='READING_SOURCE_CHANGED'&&e.reopen==='#read?uid='+id);
  assert.doesNotThrow(()=>assertCanonicalLocator(id,current));
  assert.throws(()=>assertCanonicalLocator(id,current,{positional:true}),e=>e.code==='READING_LOCATOR_AMBIGUOUS');
  assert.doesNotThrow(()=>assertCanonicalLocator(id,current,{expected:current,positional:true}));
  for(const expected of [ORIGINAL,PAIR,FOUR,SIX,'bad',ORIGINAL+'-apadana-thera-next10-v2'])assert.throws(()=>assertCanonicalLocator(id,current,{expected}),e=>e.code==='READING_SOURCE_CHANGED');
 }
 for(const [id,pin] of Object.entries(OLD_EXPECTED))assert.equal(requiredCanonicalRevision(id),pin);
 assert.equal(TEN.slice(ORIGINAL.length+1).length,23);assert.equal(TEN.length,64);
 for(const id of ['tha-ap350','tha-ap376','tha-ap425','tha-ap430','tha-ap3480','thi-ap348','mn10'])assert.equal(requiredCanonicalRevision(id),null);
});

test('registered native whole reads stay fresh while every explicit zero/later position requires its exact current pin',async()=>{
 for(const id of ids){const current=EXPECTED[id];const fresh=data(await call('get_text',{uid:id,limit:1}));
  assert.equal(fresh.text_id,id);assert.equal(fresh.source.commit,ORIGINAL);assert.equal(fresh.source.locator_revision,current);assert.equal(fresh.offset,0);
  for(const offset of [0,1]){
   const missing=refusal(await call('get_text',{uid:id,offset,limit:1}));assert.equal(missing.code,'READING_LOCATOR_AMBIGUOUS');assert.equal(missing.reopen,'#read?uid='+id);
   for(const source_commit of [...STALE.filter(v=>v!==undefined),'bad','',null])refusal(await call('get_text',{uid:id,offset,limit:1,source_commit}));
   const actual=data(await call('get_text',{uid:id,offset,limit:1,source_commit:current}));assert.equal(actual.segments[0].ref,id+'/'+(offset+1));
  }
  refusal(await call('get_text',{uid:id,limit:1,source_commit:ORIGINAL}));
  for(const source_commit of [PAIR,FOUR,SIX])refusal(await call('get_text',{uid:id,offset:0,source_commit}));
 }
});

test('bare slash/colon and external positional URL tails cannot silently become fresh whole reads',async()=>{
 for(const id of ids){
  for(const suffix of ['/1','/0',':1',':0',':2','/-1'])refusal(await call('get_text',{uid:id+suffix,source_commit:EXPECTED[id]}));
  for(const tail of ['#1','?offset=0','/1','/pli/ms/1','/%31','/%E0%B9%91','/%ZZ'])refusal(await call('get_text',{uid:'https://suttacentral.net/'+id+tail}));
  assert.equal(data(await call('get_text',{uid:'https://suttacentral.net/'+id,limit:1})).text_id,id);
 }
});

test('word study segment/paragraph/word-offset gates precede replacement text and return current text-source provenance',()=>{
 for(const id of ids){const current=EXPECTED[id];
  for(const selector of [{segment:1},{segment:id+'/1'},{paragraph:'1'},{offset:0}]){
   assert.throws(()=>analysePassage({uid:id,...selector}),e=>e.code==='READING_LOCATOR_AMBIGUOUS');
   for(const source_commit of STALE.filter(v=>v!==undefined))assert.throws(()=>analysePassage({uid:id,...selector,source_commit}),e=>e.code==='READING_SOURCE_CHANGED');
  }
  const fresh=analysePassage({uid:id});assert.equal(fresh.text_source.commit,ORIGINAL);assert.equal(fresh.text_source.locator_revision,current);
  const exact=analysePassage({uid:id,segment:fresh.segment.ref,offset:0,source_commit:current});assert.equal(exact.segment.ref,fresh.segment.ref);assert.equal(exact.text_source.locator_revision,current);
 }
});

test('widget exact/context/continuation roundtrip preserves current pins; stale/missing zero positions refuse',async()=>{
 for(const id of ids){const current=EXPECTED[id];const first=await readPassage({uid:id,limit:1,english:false});
  assert.equal(first.source.locator_revision,current);assert.ok(first.pali.continue_with);
  assert.equal(first.pali.continue_with.arguments.source_commit,current);
  const next=await readPassage(first.pali.continue_with.arguments);assert.equal(next.pali.offset,1);assert.equal(next.source.locator_revision,current);
  for(const args of [{offset:0},{segment:id+'/1'},{offset:1,source_commit:ORIGINAL}])await assert.rejects(readPassage({uid:id,english:false,...args}),/revision|unversioned|ambiguous/i);
  const exact=await readPassage({uid:id,segment:id+'/1',context:1,source_commit:current,english:false});
  assert.equal(exact.source.locator_revision,current);assert.ok(exact.pali.segments.some(segment=>segment.ref===id+'/1'));
  if(exact.pali.exact_with)assert.equal(exact.pali.exact_with.arguments.source_commit,current);
 }
});

test('actual canonical search commands carry the ten exact pins and cached source/command corruption refuses',async()=>{
 for(const id of ids){const q='"'+quote(id)+'"';const selected=canonicalSearchSelection(new URLSearchParams({q,scope:'canon'}));
  const actual=data(await call('search_texts',{query:q,english:'auto',limit:selected.limit}));validateCanonicalSearch(actual,selected);
  const hit=actual.results.find(hit=>hit.id===id);assert.ok(hit,'Actual source hit must be present, no skip for '+id);
  assert.equal(hit.source.locator_revision,EXPECTED[id]);assert.equal(hit.read_with.source_commit,EXPECTED[id]);assert.equal(hit.context_with.source_commit,EXPECTED[id]);
  data(await call('get_text',(({tool,...args})=>args)(hit.read_with)));
  for(const field of ['source','read_with','context_with'])for(const pin of STALE){
   const bad=structuredClone(actual),target=bad.results.find(hit=>hit.id===id),key=field==='source'?'locator_revision':'source_commit';
   if(pin===undefined)delete target[field][key];else target[field][key]=pin;
   assert.throws(()=>validateCanonicalSearch(bad,selected),field+' stale/missing pin '+id);
  }
 }
});

test('actual Pali quotation source commands reject stale newly repaired owner pins before UI verdict display',async()=>{
 for(const id of ids){const text=quote(id);const actual=data(await call('verify_quote',{text,language:'pali',limit:5}));validatePaliQuote(actual,text);
  const match=actual.matches.find(match=>match.text_id===id);assert.ok(match,'Actual quoted owner must be present, no skip for '+id);
  assert.equal(match.read_with.source_commit,EXPECTED[id]);data(await call('get_text',(({tool,...args})=>args)(match.read_with)));
  for(const pin of STALE){
   const bad=structuredClone(actual),target=bad.matches.find(match=>match.text_id===id);
   if(pin===undefined)delete target.read_with.source_commit;else target.read_with.source_commit=pin;
   assert.throws(()=>validatePaliQuote(bad,text));
  }
 }
});

test('both embedded host render paths reject stale/missing newly repaired owner payloads before Pali/English display',async()=>{
 for(const bridge of ['MCP Apps','Apps SDK'])for(const id of ids){const actual=await readPassage({uid:id,limit:1,english:false});const widget=view(bridge);
  widget.output(actual);assert.ok(widget.elements.pali.textContent.includes(actual.pali.segments[0].text));
  for(const pin of STALE){const bad=structuredClone(actual);
   if(pin===undefined)delete bad.source.locator_revision;else bad.source.locator_revision=pin;
   widget.output(bad);assert.ok(!widget.elements.pali.textContent.includes(actual.pali.segments[0].text));assert.ok(!widget.elements.english.textContent.includes(actual.pali.segments[0].text));
   assert.match(widget.elements.status.textContent,/mapping|revision|changed|reopen/i);
  }
 }
});

test('wire recovery admits only newly repaired whole-unit routes and untouched raw-book/unaffected positions keep provenance',async()=>{
 for(const id of ids){const route='#read?uid='+id;assert.equal(isCanonicalReopenRoute(route),true);
  const result=await call('get_text',{uid:id,offset:0,source_commit:ORIGINAL});refusal(result);
  assert.throws(()=>readingToolResult(result),error=>error.reopen===route&&error.code==='READING_SOURCE_CHANGED');
  for(const bad of [route+'&offset=0',route+'&source='+EXPECTED[id],route+'&ref='+id+'/1',route+'#x','#read?uid=tha-ap337','https://example.invalid','javascript:alert(1)']){
   assert.equal(isCanonicalReopenRoute(bad),false);
   assert.throws(()=>readingToolResult({isError:true,content:[{type:'text',text:JSON.stringify({error:'Synthetic stale position',code:'READING_SOURCE_CHANGED',reopen:bad})}]}),error=>error.reopen===undefined);
  }
 }
 for(const id of ['tha-ap332','tha-ap337','mn10']){const actual=data(await call('get_text',{uid:id,offset:0,limit:1}));assert.equal(actual.source.commit,ORIGINAL);assert.equal(actual.source.locator_revision,undefined);}
 for(const [bookNumber,bookId] of [[36,'s0510m1'],[37,'s0510m2']]){
  const book=canon.load().canon.books[bookNumber];assert.equal(hash(JSON.stringify(book.blocks)),SOURCE.original_sources[String(bookNumber)].full_tuple_sha256);
  const raw=data(await call('get_text',{book:bookId,offset:0,limit:1}));assert.equal(raw.source.commit,ORIGINAL);assert.equal(raw.source.locator_revision,undefined);
  assert.ok(raw.segments.every(segment=>segment.ref.startsWith('vri-book:'+bookId+'/')),'Source-book namespace remains distinct');
 }
});


test('all144 historical positions refuse before replacement; synthetic saved notes drafts exports never rebind',async()=>{
 assert.equal(CROSSWALK.records.length,144);assert.equal(CROSSWALK.old_positions,144);assert.equal(CROSSWALK.new_positions,144);
 assert.deepEqual(CROSSWALK.classification_counts,{'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY':65,'OLD_REF_ABSENT':10,'SAME_REF_DIFFERENT_SOURCE':69});
 const seen=new Set();
 for(const row of CROSSWALK.records){
  assert.equal(row.requires_current_revision_before_any_positional_read,true);assert.equal(row.automatic_private_data_migration,false);
  assert.ok(ids.includes(row.old.uid));assert.equal(row.old_locator,ORIGINAL);assert.equal(row.new_locator,TEN);
  assert.ok(!seen.has(row.old.ref));seen.add(row.old.ref);
  for(const pin of STALE){
   const args={uid:row.old.uid,offset:row.old.offset,limit:1,...(pin===undefined?{}:{source_commit:pin})};
   const error=refusal(await call('get_text',args));assert.equal(error.reopen,'#read?uid='+row.old.uid);
   assert.equal(error.code,pin===undefined?'READING_LOCATOR_AMBIGUOUS':'READING_SOURCE_CHANGED');
  }
  const saved={uid:row.old.uid,ref:row.old.ref,title:'Synthetic local historical citation',note:'Synthetic private local note',offset:row.old.offset,source_commit:ORIGINAL};
  const exportBefore=JSON.stringify({format:'pali-library-v1',saved:[saved]}),drafts=new Map([[passageNoteKey(saved),'Synthetic unsaved local draft']]);
  const draftBefore=JSON.stringify([...drafts]);const imported=parseBookmarks(exportBefore);assert.equal(JSON.stringify({format:'pali-library-v1',saved:imported}),exportBefore);
  assert.deepEqual(bookmarkMerge([saved],imported),{added:[],skipped:1,saved:[saved]});
  const current=data(await call('get_text',{uid:row.old.uid,limit:1}));assert.equal(current.source.locator_revision,TEN);
  const location=bookmarkLocation(saved,{uid:row.old.uid});
  assert.throws(()=>assertPositionPin(new URLSearchParams(location.href.slice(6)),current),e=>e.code==='READING_SOURCE_CHANGED');
  const context={uid:saved.uid,ref:saved.ref,title:saved.title,offset:saved.offset,source_commit:TEN};
  assert.equal(passageNoteState([saved],context).eligible,false,'An old note cannot be attached to a new pinned context');
  assert.equal(JSON.stringify({format:'pali-library-v1',saved:[saved]}),exportBefore);assert.equal(JSON.stringify([...drafts]),draftBefore);
 }
 assert.equal(seen.size,144);
});

test('bulk citation exports disclose effective locator namespaces without changing edition provenance or exporting words',()=>{
 const index=buildIndex();assert.equal(index.source.commit,ORIGINAL);assert.equal(index.count,8544);
 const legacy=["id","citation","title","pitaka","collection","kind","approximate","vri_book","vri_file","vri_paragraphs","pts","pts_volume","pts_page","pts_end_page","members","english_inherited_from","english_count","english_urls","english_translators","english_references","english_translation_ids","english_licenses","partial_english_count","partial_english","shared_english_count","shared_english"];
 const header=toCsv(index).split("\r\n")[0].split(",");assert.deepEqual(header.slice(0,26),legacy);assert.deepEqual(header.slice(26),["index_revision","locator_revision"]);
 for(const id of ids){
  const row=index.texts.find(t=>t.id===id);assert.equal(row.locator_revision,EXPECTED[id]);
  assert.equal(row.index_revision,EXPECTED[id].slice(ORIGINAL.length+1));assert.equal(row.segments,undefined);
  const csv=toCsv({texts:[row]}),lines=csv.trim().split('\r\n');assert.equal(lines.length,2);
  assert.ok(csv.includes(EXPECTED[id]));assert.ok(CSV_COLUMNS.includes('locator_revision'));
 }
 const json=JSON.parse(JSON.stringify(index));for(const [id,pin] of Object.entries({...OLD_EXPECTED,...EXPECTED})){const row=json.texts.find(t=>t.id===id);assert.equal(row.locator_revision,pin);assert.equal(row.index_revision,pin.slice(ORIGINAL.length+1));assert.equal(row.segments,undefined);assert.equal(row.pali,undefined);assert.equal(row.words,undefined);assert.equal(row.source_commit,undefined);assert.ok(toCsv({texts:[row]}).includes(pin));}
 assert.equal(index.texts.find(t=>t.id==='mn10').locator_revision,undefined);
});


// Tables were sealed from original XML before application changes; never generated from this canon.load().
test('all144 current segments and word-study source passages match sealed notes pages types and coordinates',async()=>{
 let total=0,noteCount=0;
 for(const expected of RENDERED.proposed){
  assert.deepEqual(unit(expected.id),RECORDS[expected.id]);
  const actual=canon.segments(unit(expected.id),{includeNotes:true,includeSourcePositions:true});assert.equal(actual.length,expected.segments.length);
  for(const [i,row] of expected.segments.entries()){
   const segment=actual[i];total++;assert.equal(segment.ref,row.ref);assert.equal(segment.type,row.type);assert.equal(segment.vri_paragraph??null,row.vri_paragraph??null);
   assert.equal(hash(segment.text),row.text_sha256);assert.equal(segment.text.length,row.text_utf16_length);assert.deepEqual(segment.source_blocks,row.source_blocks);
   const notes=segment.variant_readings||[];noteCount+=notes.length;assert.equal(notes.length,row.note_count);assert.equal(hash(JSON.stringify(notes)),row.notes_sha256);assert.deepEqual(notes.map(hash),row.note_text_sha256||[]);
   for(const key of ['pts_page_begins','thai_page_begins','myanmar_page_begins','vri_page_begins'])assert.deepEqual(segment[key]||[],row[key]||[]);
   const page=data(await call('get_text',{uid:expected.id,offset:i,limit:1,includeVariants:true,source_commit:TEN}));
   assert.equal(page.source.commit,ORIGINAL);assert.equal(page.source.locator_revision,TEN);assert.equal(page.segments.length,1);
   const shown=page.segments[0];assert.equal(shown.ref,row.ref);assert.equal(shown.type,row.type);assert.equal(shown.vri_paragraph??null,row.vri_paragraph??null);assert.equal(hash(shown.text),row.text_sha256);assert.equal(shown.text.length,row.text_utf16_length);
   assert.equal(hash(JSON.stringify(shown.variant_readings||[])),row.notes_sha256);
   for(const key of ['pts_page_begins','thai_page_begins','myanmar_page_begins','vri_page_begins'])assert.deepEqual(shown[key]||[],row[key]||[]);
   const words=analysePassage({uid:expected.id,segment:row.ref,offset:0,limit:60,source_commit:TEN});
   assert.equal(words.segment.ref,row.ref);assert.equal(words.segment.type,row.type);assert.equal(hash(words.segment.text),row.text_sha256);assert.equal(words.text_source.commit,ORIGINAL);assert.equal(words.text_source.locator_revision,TEN);
  }
 }
 assert.equal(total,144);assert.equal(noteCount,17);
 for(const [id,pin] of Object.entries(OLD_EXPECTED)){
  const page=data(await call('get_text',{uid:id,offset:0,limit:1,source_commit:pin}));assert.equal(page.source.locator_revision,pin);assert.equal(page.source.commit,ORIGINAL);
 }
});
