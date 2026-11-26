// Boundary wording/root correctness has its
// separate independently pinned source suite; these tests exercise locator gates.
import {test,before,after} from 'node:test';
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

const ORIGINAL='2d134ff9ef60f70a1eb03c9370580228811a3070';
const PAIR=ORIGINAL+'-apadana-thera105-106-v1';
const FOUR=ORIGINAL+'-apadana-thera333-336-v1';
const EXPECTED=Object.freeze({'tha-ap107':PAIR,'tha-ap108':PAIR,'tha-ap333':FOUR,'tha-ap334':FOUR,'tha-ap335':FOUR,'tha-ap336':FOUR});
const FOUR_IDS=['tha-ap333','tha-ap334','tha-ap335','tha-ap336'];
const ids=Object.keys(EXPECTED);
let client,originalFetch,fetches=0;
before(async()=>{
 originalFetch=globalThis.fetch;globalThis.fetch=async()=>{fetches++;throw Error('No provider transport is authorized by these offline canonical locator tests');};
 const[a,b]=InMemoryTransport.createLinkedPair();client=new Client({name:'finite-six-canonical-locator-consumers',version:'1'});
 await Promise.all([client.connect(a),createServer().connect(b)]);
});
after(async()=>{try{await client?.close();}finally{globalThis.fetch=originalFetch;}assert.equal(fetches,0,'Canonical gates need no live English/provider transport');});
const call=(name,args)=>client.callTool({name,arguments:args});
function data(result){assert.notEqual(result.isError,true,JSON.stringify(result.content));assert.ok(result.structuredContent);return result.structuredContent;}
function refusal(result){
 assert.equal(result.isError,true,'Expected actual registered MCP refusal');
 const raw=result.content?.find(item=>item.type==='text')?.text;assert.equal(typeof raw,'string');
 let body;try{body=JSON.parse(raw);}catch{body={error:raw};}
 assert.equal(typeof body.error,'string');assert.ok(body.error.length);
 for(const key of ['segments','pali','words','matches','results'])assert.equal(body[key],undefined,'No replacement '+key+' in failure');
 return body;
}
const unit=id=>canon.resolve(id).unit;
const body=id=>canon.segments(unit(id)).find(segment=>segment.type==='verse'&&segment.text.split(/\s+/).length>=8);
const quote=id=>{const segment=body(id);assert.ok(segment,'A genuine body segment is mandatory for '+id);return segment.text.replace(/\s+/g,' ').trim().split(' ').slice(0,24).join(' ');};

test('exact six-owner registry rejects missing/bad current metadata and old expected pins; unrelated IDs remain outside',()=>{
 for(const id of ids){const current=EXPECTED[id];assert.equal(requiredCanonicalRevision(id),current);
  for(const observed of [undefined,ORIGINAL,'bad',ORIGINAL+'-unknown-v1'])assert.throws(()=>assertCanonicalLocator(id,observed),e=>e.code==='READING_SOURCE_CHANGED'&&e.reopen==='#read?uid='+id);
  assert.doesNotThrow(()=>assertCanonicalLocator(id,current));
  assert.throws(()=>assertCanonicalLocator(id,current,{positional:true}),e=>e.code==='READING_LOCATOR_AMBIGUOUS');
  assert.doesNotThrow(()=>assertCanonicalLocator(id,current,{expected:current,positional:true}));
  for(const expected of [ORIGINAL,'bad',ORIGINAL+'-apadana-thera333-336-v2'])assert.throws(()=>assertCanonicalLocator(id,current,{expected}),e=>e.code==='READING_SOURCE_CHANGED');
 }
 for(const id of ['tha-ap332','tha-ap337','tha-ap3330','thi-ap333','mn10'])assert.equal(requiredCanonicalRevision(id),null);
});

test('registered native whole reads stay fresh while every explicit zero/later position requires its exact current pin',async()=>{
 for(const id of ids){const current=EXPECTED[id];const fresh=data(await call('get_text',{uid:id,limit:1}));
  assert.equal(fresh.text_id,id);assert.equal(fresh.source.commit,ORIGINAL);assert.equal(fresh.source.locator_revision,current);assert.equal(fresh.offset,0);
  for(const offset of [0,1]){
   const missing=refusal(await call('get_text',{uid:id,offset,limit:1}));assert.equal(missing.code,'READING_LOCATOR_AMBIGUOUS');assert.equal(missing.reopen,'#read?uid='+id);
   for(const source_commit of [ORIGINAL,'bad','',null,ORIGINAL+'-unknown-v1'])refusal(await call('get_text',{uid:id,offset,limit:1,source_commit}));
   const actual=data(await call('get_text',{uid:id,offset,limit:1,source_commit:current}));assert.equal(actual.segments[0].ref,id+'/'+(offset+1));
  }
  refusal(await call('get_text',{uid:id,limit:1,source_commit:ORIGINAL}));
  if(FOUR_IDS.includes(id))refusal(await call('get_text',{uid:id,offset:0,source_commit:PAIR}));
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
   assert.throws(()=>analysePassage({uid:id,...selector,source_commit:ORIGINAL}),e=>e.code==='READING_SOURCE_CHANGED');
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

test('actual canonical search commands carry the six exact pins and cached source/command corruption refuses',async()=>{
 for(const id of ids){const q='"'+quote(id)+'"';const selected=canonicalSearchSelection(new URLSearchParams({q,scope:'canon'}));
  const actual=data(await call('search_texts',{query:q,english:'auto',limit:selected.limit}));validateCanonicalSearch(actual,selected);
  const hit=actual.results.find(hit=>hit.id===id);assert.ok(hit,'Actual source hit must be present, no skip for '+id);
  assert.equal(hit.source.locator_revision,EXPECTED[id]);assert.equal(hit.read_with.source_commit,EXPECTED[id]);assert.equal(hit.context_with.source_commit,EXPECTED[id]);
  data(await call('get_text',(({tool,...args})=>args)(hit.read_with)));
  for(const field of ['source','read_with','context_with'])for(const pin of [undefined,ORIGINAL,ORIGINAL+'-unknown-v1']){
   const bad=structuredClone(actual),target=bad.results.find(hit=>hit.id===id),key=field==='source'?'locator_revision':'source_commit';
   if(pin===undefined)delete target[field][key];else target[field][key]=pin;
   assert.throws(()=>validateCanonicalSearch(bad,selected),field+' stale/missing pin '+id);
  }
 }
});

test('actual Pali quotation source commands reject stale six-owner pins before UI verdict display',async()=>{
 for(const id of ids){const text=quote(id);const actual=data(await call('verify_quote',{text,language:'pali',limit:5}));validatePaliQuote(actual,text);
  const match=actual.matches.find(match=>match.text_id===id);assert.ok(match,'Actual quoted owner must be present, no skip for '+id);
  assert.equal(match.read_with.source_commit,EXPECTED[id]);data(await call('get_text',(({tool,...args})=>args)(match.read_with)));
  for(const pin of [undefined,ORIGINAL,ORIGINAL+'-unknown-v1']){
   const bad=structuredClone(actual),target=bad.matches.find(match=>match.text_id===id);
   if(pin===undefined)delete target.read_with.source_commit;else target.read_with.source_commit=pin;
   assert.throws(()=>validatePaliQuote(bad,text));
  }
 }
});

test('both embedded host render paths reject stale/missing six-owner payloads before Pali/English display',async()=>{
 for(const bridge of ['MCP Apps','Apps SDK'])for(const id of ids){const actual=await readPassage({uid:id,limit:1,english:false});const widget=view(bridge);
  widget.output(actual);assert.ok(widget.elements.pali.textContent.includes(actual.pali.segments[0].text));
  for(const pin of [undefined,ORIGINAL,ORIGINAL+'-unknown-v1']){const bad=structuredClone(actual);
   if(pin===undefined)delete bad.source.locator_revision;else bad.source.locator_revision=pin;
   widget.output(bad);assert.ok(!widget.elements.pali.textContent.includes(actual.pali.segments[0].text));assert.ok(!widget.elements.english.textContent.includes(actual.pali.segments[0].text));
   assert.match(widget.elements.status.textContent,/mapping|revision|changed|reopen/i);
  }
 }
});

test('wire recovery admits only six exact whole-unit routes and untouched raw-book/unaffected positions keep provenance',async()=>{
 for(const id of ids){const route='#read?uid='+id;assert.equal(isCanonicalReopenRoute(route),true);
  const result=await call('get_text',{uid:id,offset:0,source_commit:ORIGINAL});refusal(result);
  assert.throws(()=>readingToolResult(result),error=>error.reopen===route&&error.code==='READING_SOURCE_CHANGED');
  for(const bad of [route+'&offset=0',route+'&source='+EXPECTED[id],route+'&ref='+id+'/1',route+'#x','#read?uid=tha-ap337','https://example.invalid','javascript:alert(1)']){
   assert.equal(isCanonicalReopenRoute(bad),false);
   assert.throws(()=>readingToolResult({isError:true,content:[{type:'text',text:JSON.stringify({error:'Synthetic stale position',code:'READING_SOURCE_CHANGED',reopen:bad})}]}),error=>error.reopen===undefined);
  }
 }
 for(const id of ['tha-ap332','tha-ap337','mn10']){const actual=data(await call('get_text',{uid:id,offset:0,limit:1}));assert.equal(actual.source.commit,ORIGINAL);assert.equal(actual.source.locator_revision,undefined);}
 const book=canon.load().canon.books[unit('tha-ap334').book],bookId=book.file.replace(/\.mul\.xml$/,'');
 const raw=data(await call('get_text',{book:bookId,offset:0,limit:1}));assert.equal(raw.source.commit,ORIGINAL);assert.equal(raw.source.locator_revision,undefined);
});
