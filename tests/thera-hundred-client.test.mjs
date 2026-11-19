import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {APADANA_PROFILES,APADANA_COMMIT,APADANA_TRANSLATOR,APADANA_LICENSE,APADANA_LICENSE_URL} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,digest,translation as fetchApadana} from '../src/apadana.mjs';
import {apadanaId,scopeDescriptor,validateEnglishPage,validateCollectionSummary} from '../web/translation-policy.mjs';
import {validateComparisonPage,comparisonChoices} from '../web/translation-comparison.mjs';
import {WIDGET_HTML} from '../src/chatgpt-widget.mjs';
import {Element} from './helpers/widget-view.mjs';

const uid='tha-ap102',checkout=process.env.APADANA_SOURCE_CHECKOUT,rawPath=checkout&&join(checkout,'src/_poems/chapter-3/poem-100.md');
const sourceEnabled=rawPath&&existsSync(rawPath),clone=value=>structuredClone(value);
function fixture(owner=uid){
 const p=APADANA_PROFILES[owner];assert.ok(p,'Independently approved publisher100 profile must be active.');
 const raw=readFileSync(join(checkout,'src/_poems/chapter-3/poem-'+String(p.poem).padStart(3,'0')+'.md'),'utf8'),parsed=parseApadana(raw,p);
 const choice={translation_id:apadanaId(owner),translation_revision:APADANA_COMMIT,translator:APADANA_TRANSLATOR,license:APADANA_LICENSE,url:p.url};
 for(const field of ['chapter_summary','collection_summary','publisher_divisions','editorial_gap'])if(p[field])choice[field]=clone(p[field]);
 const args={uid:owner,translation:choice.translation_id,translation_revision:APADANA_COMMIT,limit:30000};
 const data={...choice,...parsed,...Object.fromEntries(['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'].map(key=>[key,p[key]])),
 source:'apadana',text_id:owner,offset:0,limit:30000,next_offset:null,prefix_sha256:'a'.repeat(64),fetched_url:p.raw_url,license_url:APADANA_LICENSE_URL,
 attribution:'Synthetic transport attribution',changes:'Synthetic extraction notice',mapping_notes:[...p.mapping_notes],notes:[...p.mapping_notes]};
 return{p,raw,parsed,choice,args,data,context:{uid:owner,choices:[choice],accepted:null}};
}
const check=()=>runInNewContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('),WIDGET_HTML.indexOf('  function render(d) {'))+';checkedApadana;',{TextEncoder});
const payload=english=>({text_id:english.text_id,citation:'Synthetic transport citation',title:'Synthetic transport title',source:{commit:'a'.repeat(40)},notes:[],links:{},pali:{segments:[{ref:english.text_id+'/1',text:'SYNTHETIC_PALI_REMAINS'}],offset:0,returned:1,total_segments:1,next_offset:null},english});
const all=node=>[node,...node.children.flatMap(all)];
// Full scripts and both actual host message paths, with the browser's real
// TextEncoder supplied explicitly to this isolated Node VM.
function view(bridge,{integritySupport=true}={}){
 const elements=Object.fromEntries(['title','meta','pali','english','footer','status','navigation','context-status','link-status'].map(id=>[id,new Element()]));
 const handlers={},parent={postMessage(){}},window={parent,addEventListener(name,handler){handlers[name]=handler;}};
 if(bridge==='Apps SDK')window.openai={};
 const document={documentElement:new Element(),getElementById:id=>elements[id],createElement:tag=>new Element(tag),createTextNode:text=>{const node=new Element();node.textContent=text;return node;}};
 runInNewContext(WIDGET_HTML.match(/<script>([^]*?)<\/script>/)[1],{window,document,Date,TextEncoder:integritySupport?TextEncoder:undefined,setTimeout(){return 1;},clearTimeout(){}});
 return{elements,output(data){if(bridge==='Apps SDK'){window.openai.toolOutput=data;handlers['openai:set_globals']();}else handlers.message({source:parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:data}}});}};
}

test('first-hundred source apparatus remains a finite additional owner, preserving old Therī40 notes',()=>{
 const p=APADANA_PROFILES['thi-ap40'];assert.deepEqual(p.collection_summary.note_numbers,[11,12]);
 assert.equal(p.collection_summary.parent_id,'thi-ap40');validateCollectionSummary({collection_summary:clone(p.collection_summary)},'thi-ap40');
 for(const other of ['thi-ap1','tha-ap43','tha-ap101','sn1.1'])assert.throws(()=>validateCollectionSummary({collection_summary:clone(p.collection_summary)},other),/owner/);
});

test('source-enabled publisher100 separates poem1–2, chapter3 and first-hundred4 notes in every reader',{skip:!sourceEnabled},async()=>{
 const f=fixture();assert.deepEqual(f.parsed.translator_notes.map(n=>n.number),[1,2]);
 assert.deepEqual(f.parsed.chapter_summary.translator_notes.map(n=>n.number),[3]);assert.deepEqual(f.parsed.collection_summary.translator_notes.map(n=>n.number),[4]);
 assert.deepEqual([f.p.collection_summary.root_start,f.p.collection_summary.root_end,f.p.collection_summary.first_ref,f.p.collection_summary.last_ref],[5145,5152,uid+'/12',uid+'/15']);
 const q=quotationText({...f.parsed,translation_id:f.choice.translation_id});assert.equal(q.split('\n\n').length,5);
 for(const scope of [f.parsed.chapter_summary,f.parsed.collection_summary]){assert.ok(!q.includes(scope.text));assert.ok(!q.includes(scope.translator_notes[0].text));assert.ok(!f.parsed.text.includes(scope.text));}
 assert.equal(validateEnglishPage(f.data,f.args,f.context),null);assert.equal(validateComparisonPage(f.data,f.args,f.context),null);assert.equal(check()({text_id:uid,english:f.data}).english,f.data);
 const originalFetch=globalThis.fetch;try{globalThis.fetch=async url=>{assert.equal(url.href,f.p.raw_url);return new Response(f.raw);};const fetched=await fetchApadana(f.p);assert.deepEqual(fetched.collection_summary,f.parsed.collection_summary);assert.ok(fetched.changes.length<=2000);}finally{globalThis.fetch=originalFetch;}
 for(const bridge of ['Apps SDK','MCP Apps']){
  const h=view(bridge);h.output(payload(f.data));
  const nodes=all(h.elements.english),chapter=nodes.find(n=>n.attributes['aria-label']==='Canonical chapter summary · not poem text');
  const collection=nodes.find(n=>n.attributes['aria-label']==='Therā Apadāna first-hundred chapter summary and colophons · not poem text');
  assert.ok(chapter);assert.ok(collection);assert.deepEqual(all(chapter).filter(n=>n.tagName==='li').map(n=>n.value),[3]);assert.deepEqual(all(collection).filter(n=>n.tagName==='li').map(n=>n.value),[4]);
  assert.match(collection.textContent,/does not mark the end of the Therā Apadāna/);assert.match(collection.textContent,/not a measure of indexed translation coverage/);
  assert.ok(!chapter.textContent.includes(f.parsed.collection_summary.text));
 }
});

test('source-enabled first-hundred wrong owner, scope, keys, note order and cached missing fields refuse before English',{skip:!sourceEnabled},()=>{
 const f=fixture(),checked=check();
 for(const field of ['chapter_summary','collection_summary']){
  const expected=f.data[field],wrong=f.data[field==='chapter_summary'?'collection_summary':'chapter_summary'];
  const patches=[undefined,null,[],{},wrong,{...clone(expected),extra:true},{...clone(expected),translator_notes:[]},
    {...clone(expected),text:'invalid'}, {...clone(expected),translator_notes:[{...expected.translator_notes[0],text:'invalid'}]},
    {...clone(expected),translator_notes:clone(wrong.translator_notes)}, {...clone(expected),translator_notes:[{...expected.translator_notes[0],extra:true}]}];
  for(const key of Object.keys(f.p[field])){
   const modified=clone(expected);modified[key]=Array.isArray(modified[key])?[99]:typeof modified[key]==='number'?modified[key]+1:'changed';patches.push(modified);
   const choice=clone(f.choice);delete choice[field][key];assert.throws(()=>scopeDescriptor(choice,uid),/summary/);assert.throws(()=>comparisonChoices([choice],uid),/summary/);
  }
  for(const scope of patches){
   const forged={...f.data,[field]:scope};assert.throws(()=>validateEnglishPage(forged,f.args,f.context),/summary/);assert.throws(()=>validateComparisonPage(forged,f.args,f.context),/summary/);assert.equal(checked({text_id:uid,english:forged}).english,null);
   for(const bridge of ['Apps SDK','MCP Apps']){const h=view(bridge);h.output(payload(f.data));assert.ok(h.elements.english.textContent.includes(f.data.text));h.output(payload(forged));assert.ok(!h.elements.english.textContent.includes(f.data.text));assert.match(h.elements.pali.textContent,/SYNTHETIC_PALI_REMAINS/);}
  }
 }
});

test('source-enabled every new finite apparatus and preface rejects actual content drift with approved metadata unchanged',{skip:!sourceEnabled},()=>{
 const owners=['tha-ap63','tha-ap73','tha-ap76','tha-ap82','tha-ap83','tha-ap92','tha-ap93','tha-ap102'],checked=check();
 let sidecars=0,prefaces=0,noteBodies=0;
 for(const owner of owners){
  const f=fixture(owner),forged=[];
  assert.equal(validateEnglishPage(f.data,f.args,f.context),null);assert.equal(validateComparisonPage(f.data,f.args,f.context),null);assert.equal(checked({text_id:owner,english:f.data}).english,f.data);
  for(const key of ['chapter_summary','collection_summary','publisher_divisions']){
   if(!f.data[key])continue;
   const scopes=Array.isArray(f.data[key])?f.data[key]:[f.data[key]];
   for(const [i,scope]of scopes.entries()){
    sidecars++;
    for(const text of ['invalid',scope.text+' changed','X'+scope.text.slice(1)]){
     const data=clone(f.data),target=Array.isArray(data[key])?data[key][i]:data[key];target.text=text;assert.notEqual(target.text,scope.text);
     assert.equal(target.body_sha256,scope.body_sha256);assert.equal(target.notes_sha256,scope.notes_sha256);forged.push(data);
    }
    for(let n=0;n<scope.translator_notes.length;n++){
     const data=clone(f.data),target=Array.isArray(data[key])?data[key][i]:data[key];target.translator_notes[n].text='invalid';
     assert.equal(target.translator_notes[n].number,scope.translator_notes[n].number);assert.equal(target.translator_notes.length,scope.translator_notes.length);assert.equal(target.notes_sha256,scope.notes_sha256);
     noteBodies++;forged.push(data);
    }
   }
  }
  if(f.data.publisher_paratext){
   prefaces++;
   for(const publisher_paratext of ['invalid',f.data.publisher_paratext+' changed','X'+f.data.publisher_paratext.slice(1)]){
    const data={...clone(f.data),publisher_paratext};assert.notEqual(data.publisher_paratext,f.data.publisher_paratext);assert.equal(data.paratext_sha256,f.data.paratext_sha256);forged.push(data);
   }
  }
  for(const data of forged){
   assert.throws(()=>validateEnglishPage(data,f.args,f.context),/Apadāna/);assert.throws(()=>validateComparisonPage(data,f.args,f.context),/Apadāna/);assert.equal(checked({text_id:owner,english:data}).english,null);
   for(const bridge of ['Apps SDK','MCP Apps']){
    const host=view(bridge);host.output(payload(f.data));assert.ok(host.elements.english.textContent.includes(f.data.text),'valid original source first renders');
    host.output(payload(data));assert.ok(!host.elements.english.textContent.includes(f.data.text));assert.match(host.elements.english.textContent,/No English was displayed/);assert.match(host.elements.pali.textContent,/SYNTHETIC_PALI_REMAINS/);
   }
  }
  for(const bridge of ['Apps SDK','MCP Apps']){
   const host=view(bridge,{integritySupport:false});host.output(payload(f.data));assert.ok(!host.elements.english.textContent.includes(f.data.text));assert.match(host.elements.pali.textContent,/SYNTHETIC_PALI_REMAINS/);
  }
 }
 assert.deepEqual([sidecars,prefaces,noteBodies],[5,4,2],'all five newly approved structured scopes, four nonempty prefaces and both owned note bodies receive actual-content checks');
});

test('source-enabled all forty new sources preserve exact empty or nonempty publisher paratext before any English display',{skip:!sourceEnabled},()=>{
 const intake=JSON.parse(readFileSync(new URL('../docs/evidence/apadana/THERA_SCALED_APPROVAL.json',import.meta.url),'utf8'));
 assert.equal(intake.status,'approved');assert.equal(intake.approved_ids.length,40);
 const checked=check();let empty=0,nonempty=0;
 for(const owner of intake.approved_ids){
  const f=fixture(owner);assert.equal(digest(f.data.publisher_paratext),f.p.paratext_sha256);
  assert.equal(validateEnglishPage(f.data,f.args,f.context),null);assert.equal(validateComparisonPage(f.data,f.args,f.context),null);assert.equal(checked({text_id:owner,english:f.data}).english,f.data);
  if(f.data.publisher_paratext){nonempty++;continue;}
  empty++;assert.equal(f.data.publisher_paratext,'');
  for(const publisher_paratext of ['SYNTHETIC_INJECTED_PREFACE',' ','\n']){
   const forged={...clone(f.data),publisher_paratext};assert.equal(forged.paratext_sha256,f.p.paratext_sha256);
   assert.throws(()=>validateEnglishPage(forged,f.args,f.context),/publisher-preface content/);assert.throws(()=>validateComparisonPage(forged,f.args,f.context),/publisher-preface content/);assert.equal(checked({text_id:owner,english:forged}).english,null);
   for(const bridge of ['Apps SDK','MCP Apps']){
    const host=view(bridge);host.output(payload(f.data));assert.ok(host.elements.english.textContent.includes(f.data.text));
    host.output(payload(forged));assert.ok(!host.elements.english.textContent.includes(f.data.text));assert.match(host.elements.english.textContent,/No English was displayed/);assert.match(host.elements.pali.textContent,/SYNTHETIC_PALI_REMAINS/);
   }
  }
 }
 assert.deepEqual([empty,nonempty],[36,4]);
});

test('source-enabled each poem100 continuation revalidates both separate original apparatus scopes',{skip:!sourceEnabled},()=>{
 const f=fixture(),checked=check(),limit=500;let args={...f.args,limit};
 for(let offset=0;offset<f.parsed.text.length;offset+=limit){
  const nextOffset=offset+limit<f.parsed.text.length?offset+limit:null;
  const next=nextOffset===null?null:{uid,translation:f.choice.translation_id,translation_revision:APADANA_COMMIT,offset:nextOffset,limit,prefix_sha256:digest(f.parsed.text.slice(0,nextOffset))};
  const data={...f.data,offset,limit,text:f.parsed.text.slice(offset,offset+limit),prefix_sha256:digest(f.parsed.text.slice(0,offset)),next_offset:nextOffset,continue_with:next&&{name:'get_translation',arguments:next}};
  assert.deepEqual(validateEnglishPage(data,args,f.context),next);assert.deepEqual(validateComparisonPage(data,args,f.context),next);assert.equal(checked({text_id:uid,english:data}).english,data);
  for(const field of ['chapter_summary','collection_summary']){
   const missing=clone(data);delete missing[field];assert.throws(()=>validateEnglishPage(missing,args,f.context),/summary/);assert.throws(()=>validateComparisonPage(missing,args,f.context),/summary/);assert.equal(checked({text_id:uid,english:missing}).english,null);
   for(const bridge of ['Apps SDK','MCP Apps']){const h=view(bridge);h.output(payload(data));assert.ok(h.elements.english.textContent.includes(data.text));h.output(payload(missing));assert.ok(!h.elements.english.textContent.includes(data.text));assert.match(h.elements.pali.textContent,/SYNTHETIC_PALI_REMAINS/);}
  }
  args=next;
 }
});
