import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';
import {APADANA_PROFILES,APADANA_COMMIT,APADANA_TRANSLATOR,APADANA_LICENSE,APADANA_LICENSE_URL} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,digest,validateLink,translation as fetchApadana} from '../src/apadana.mjs';
import {apadanaId,scopeDescriptor,validateEditorialGap,validateEnglishPage} from '../web/translation-policy.mjs';
import {comparisonChoices,validateComparisonPage} from '../web/translation-comparison.mjs';
import {WIDGET_HTML} from '../src/chatgpt-widget.mjs';
import {Element} from './helpers/widget-view.mjs';

const uid='tha-ap44', checkout=process.env.APADANA_SOURCE_CHECKOUT;
const clone=value=>structuredClone(value);
function checked() {
  return runInNewContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('),WIDGET_HTML.indexOf('  function render(d) {'))+';checkedApadana;', {TextEncoder});
}
function embedded(bridge,data) {
  const nodes=Object.fromEntries(['title','meta','pali','english','footer','status','navigation','context-status','link-status'].map(id=>[id,new Element()]));
  const handlers={},parent={postMessage(){}},window={parent,addEventListener(name,handler){handlers[name]=handler;}};
  if(bridge==='Apps SDK')window.openai={};
  const document={documentElement:new Element(),getElementById:id=>nodes[id],createElement:tag=>new Element(tag),createTextNode:text=>{const node=new Element();node.textContent=text;return node;}};
  runInNewContext(WIDGET_HTML.match(/<script>([^]*?)<\/script>/)[1],{window,document,Date,TextEncoder,setTimeout(){return 1;},clearTimeout(){}});
  const output=english=>{
    const payload={text_id:english.text_id,citation:'Synthetic transport citation',title:'Synthetic transport title',source:{commit:'a'.repeat(40)},notes:[],links:{},
      pali:{segments:[{ref:english.text_id+'/1',text:'SYNTHETIC_PALI_REMAINS'}],offset:0,returned:1,total_segments:1,next_offset:null},english};
    if(bridge==='Apps SDK'){window.openai.toolOutput=payload;handlers['openai:set_globals']();}
    else handlers.message({source:parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:payload}}});
  };
  output(data);return {nodes,output};
}
function fixture() {
  const p=APADANA_PROFILES[uid]; assert.ok(p,'Source42 must have its independently approved finite profile.');
  const raw=readFileSync(join(checkout,'src/_poems/chapter-3/poem-042.md'),'utf8');
  const parsed=parseApadana(raw,p);
  const choice={translation_id:apadanaId(uid),translation_revision:APADANA_COMMIT,translator:APADANA_TRANSLATOR,license:APADANA_LICENSE,url:p.url,editorial_gap:clone(p.editorial_gap)};
  const args={uid,translation:choice.translation_id,translation_revision:APADANA_COMMIT,limit:30000};
  const data={...clone(choice),...parsed,...Object.fromEntries(['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'].map(key=>[key,p[key]])),
    source:'apadana',text_id:uid,offset:0,limit:30000,next_offset:null,prefix_sha256:'a'.repeat(64),attribution:'Synthetic transport attribution',changes:'Synthetic transport extraction notice',
    fetched_url:p.raw_url,license_url:APADANA_LICENSE_URL,mapping_notes:[...p.mapping_notes],notes:[...p.mapping_notes]};
  return {p,raw,parsed,choice,args,data,context:{uid,choices:[choice],accepted:null}};
}

test('only the exact held42 owner can declare an editorial gap in source metadata',()=>{
  for(const id of ['thi-ap1','thi-ap40','tha-ap43','tha-ap45','sn1.1']) {
    const p=APADANA_PROFILES[id];
    const choice=p?{translation_id:apadanaId(id),translation_revision:APADANA_COMMIT,translator:APADANA_TRANSLATOR,license:APADANA_LICENSE,url:p.url}:{translation_id:'dt:example',source:'dhammatalks.org'};
    const fake={...choice,editorial_gap:{kind:'publisher_editorial_gap',parent_id:uid}};
    assert.throws(()=>scopeDescriptor(fake,id),/Apadāna/);
    assert.throws(()=>comparisonChoices([fake],id),/Apadāna|comparison/);
    assert.throws(()=>quotationText({translation_id:fake.translation_id,text:'',editorial_gap:fake.editorial_gap}),/differs/);
  }
});

test('source-enabled held42 retains all28 printed entries and13 original notes in disjoint scopes',{skip:!checkout},()=>{
  const f=fixture(),g=f.parsed.editorial_gap,notes=f.parsed.translator_notes;
  assert.equal(Object.keys(f.p.editorial_gap).length,10);
  assert.equal(digest(f.raw),f.p.raw_sha256); assert.equal(digest(f.parsed.text),f.p.body_sha256);
  assert.equal(f.parsed.text.split('\n\n').length,31); assert.equal(f.p.stanza_layout.length,28);
  assert.deepEqual(notes.map(n=>n.number),[1,2,3,4,5,6,7,8,9,10,11,13]);
  assert.deepEqual(g.translator_notes.map(n=>n.number),[12]);
  assert.equal(digest(JSON.stringify(notes)),f.p.notes_sha256); assert.equal(digest(g.text),g.body_sha256);
  assert.equal(digest(JSON.stringify(g.translator_notes)),g.notes_sha256);
  assert.equal(notes.length+g.translator_notes.length,13);
  assert.deepEqual([g.after_local_label,g.after_publisher_label,g.before_local_label,g.before_publisher_label],['25','1164','26','1165']);
  assert.equal(Object.hasOwn(g,'root_start'),false); assert.equal(Object.hasOwn(g,'first_ref'),false);
  assert.doesNotMatch(f.parsed.text,/hiatus|\[Note 12\]/);
  const q=quotationText({...f.parsed,translation_id:f.choice.translation_id});
  assert.equal(q.split('\n\n').length,28); assert.ok(!q.includes(g.text)); assert.ok(!q.includes(g.translator_notes[0].text));
  assert.ok(q.includes(f.parsed.text.split('\n\n')[26].replace(/\[Note \d+\]/g,'').replace(/\s*\(26\) \[1165\]$/,'')));
  validateEditorialGap(f.choice,uid);validateEditorialGap(f.data,uid,true);
  assert.equal(validateEnglishPage(f.data,f.args,f.context),null);assert.equal(validateComparisonPage(f.data,f.args,f.context),null);
  assert.equal(comparisonChoices([f.choice],uid).length,1); assert.equal(checked()({text_id:uid,english:f.data}).english,f.data);
});

test('source-enabled held42 malformed metadata, note ownership and content fail all three readers before English',{skip:!checkout},()=>{
  const f=fixture(),check=checked();
  const patches=[undefined,null,[],{}, {...clone(f.data.editorial_gap),kind:'canonical_chapter_summary'},
    {...clone(f.data.editorial_gap),parent_id:'tha-ap43'}, {...clone(f.data.editorial_gap),placement:'after_poem'},
    {...clone(f.data.editorial_gap),after_local_label:'26'}, {...clone(f.data.editorial_gap),after_publisher_label:'1165'},
    {...clone(f.data.editorial_gap),before_local_label:'25'}, {...clone(f.data.editorial_gap),before_publisher_label:'1164'},
    {...clone(f.data.editorial_gap),body_sha256:'0'.repeat(64)}, {...clone(f.data.editorial_gap),notes_sha256:'0'.repeat(64)},
    {...clone(f.data.editorial_gap),note_numbers:[13]}, {...clone(f.data.editorial_gap),text:''},
    {...clone(f.data.editorial_gap),text:f.data.editorial_gap.text+' altered'},
    {...clone(f.data.editorial_gap),text:'x'.repeat(50001)}, {...clone(f.data.editorial_gap),translator_notes:[]},
    {...clone(f.data.editorial_gap),translator_notes:[{...f.data.editorial_gap.translator_notes[0],number:13}]},
    {...clone(f.data.editorial_gap),translator_notes:[{number:12,text:'Altered note'}]},
    {...clone(f.data.editorial_gap),translator_notes:[{...f.data.editorial_gap.translator_notes[0],extra:true}]},
    {...clone(f.data.editorial_gap),first_ref:uid+'/26'}, {...clone(f.data.editorial_gap),extra:true}];
  for(const editorial_gap of patches) {
    const data={...f.data,editorial_gap};
    assert.throws(()=>validateEnglishPage(data,f.args,f.context),/editorial-gap/);
    assert.throws(()=>validateComparisonPage(data,f.args,f.context),/editorial-gap/);
    assert.equal(check({text_id:uid,english:data}).english,null);
    assert.throws(()=>quotationText({...f.parsed,translation_id:f.choice.translation_id,editorial_gap}),/differs/);
  }
  const missing=clone(f.data);delete missing.editorial_gap;
  assert.throws(()=>validateEnglishPage(missing,f.args,f.context),/editorial-gap/); assert.equal(check({text_id:uid,english:missing}).english,null);
  const unavailable=runInNewContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('),WIDGET_HTML.indexOf('  function render(d) {'))+';checkedApadana;',{TextEncoder:undefined});
  assert.equal(unavailable({text_id:uid,english:f.data}).english,null);
  const forged=clone(f.p);forged.editorial_gap.extra=true;assert.throws(()=>validateLink(forged),/differs/);
  for(const key of Object.keys(f.p.editorial_gap)) {
    const choice=clone(f.choice);delete choice.editorial_gap[key];
    assert.throws(()=>scopeDescriptor(choice,uid),/editorial-gap/);assert.throws(()=>comparisonChoices([choice],uid),/editorial-gap/);
  }
});

test('source-enabled gap transport and every English continuation keep apparatus outside poem character positions',{skip:!checkout},async()=>{
  const f=fixture(),originalFetch=globalThis.fetch;
  try {
    globalThis.fetch=async url=>{assert.equal(url.href,f.p.raw_url);return new Response(f.raw);};
    const fetched=await fetchApadana(f.p);
    assert.deepEqual(fetched.editorial_gap,f.parsed.editorial_gap);assert.equal(fetched.text,f.parsed.text);
    assert.ok(fetched.changes.length<=2000);assert.match(fetched.changes,/original note 12/);
  } finally {globalThis.fetch=originalFetch;}
  const check=checked(),limit=500;
  let args={...f.args,limit};
  for(let offset=0;offset<f.parsed.text.length;offset+=limit) {
    const nextOffset=offset+limit<f.parsed.text.length?offset+limit:null;
    const next=nextOffset===null?null:{uid,translation:f.choice.translation_id,translation_revision:APADANA_COMMIT,offset:nextOffset,limit,prefix_sha256:digest(f.parsed.text.slice(0,nextOffset))};
    const data={...f.data,offset,limit,text:f.parsed.text.slice(offset,offset+limit),prefix_sha256:digest(f.parsed.text.slice(0,offset)),next_offset:nextOffset,continue_with:next&&{name:'get_translation',arguments:next}};
    assert.deepEqual(validateEnglishPage(data,args,f.context),next); assert.deepEqual(validateComparisonPage(data,args,f.context),next);
    assert.equal(check({text_id:uid,english:data}).english,data);
    assert.deepEqual(data.editorial_gap,f.parsed.editorial_gap);
    const changed=clone(data);changed.editorial_gap.translator_notes[0].text+=' altered after first page';
    assert.throws(()=>validateEnglishPage(changed,args,f.context),/editorial-gap/); assert.throws(()=>validateComparisonPage(changed,args,f.context),/editorial-gap/);
    assert.equal(check({text_id:uid,english:changed}).english,null);
    args=next;
  }
});

test('source-enabled foreign editorial-gap injection clears cached English in both hosts while retaining Pāli',{skip:!checkout},()=>{
  const f=fixture(),id='tha-ap43',p=APADANA_PROFILES[id],parsed=parseApadana(readFileSync(join(checkout,'src/_poems/chapter-3/poem-041.md'),'utf8'),p);
  const ap={...f.data,...parsed,text_id:id,translation_id:apadanaId(id),url:p.url,fetched_url:p.raw_url,mapping_notes:[...p.mapping_notes],notes:[...p.mapping_notes],
    ...Object.fromEntries(['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'].map(key=>[key,p[key]]))};
  delete ap.editorial_gap;
  const ordinary={translation_id:'dt:MN/MN1',text_id:'mn1',translator:'Synthetic translator',source:'dhammatalks.org',license:'Synthetic terms',url:'https://www.dhammatalks.org/suttas/MN/MN1.html',
    text:'SYNTHETIC_ORDINARY_ENGLISH',attribution:'Synthetic attribution',offset:0,limit:30000,prefix_sha256:'a'.repeat(64),next_offset:null};
  for(const valid of [ap,ordinary])for(const editorial_gap of [undefined,null,{},clone(f.data.editorial_gap)]) {
    const choice={translation_id:valid.translation_id,translator:valid.translator,license:valid.license,url:valid.url,...(valid.translation_revision?{translation_revision:valid.translation_revision}:{})};
    const args={uid:valid.text_id,translation:valid.translation_id,limit:30000,...(valid.translation_revision?{translation_revision:valid.translation_revision}:{})};
    const context={uid:valid.text_id,choices:[choice],accepted:null},forged={...valid,editorial_gap};
    assert.equal(validateEnglishPage(valid,args,context),null);assert.equal(validateComparisonPage(valid,args,context),null);
    assert.throws(()=>validateEnglishPage(forged,args,context),/Apadāna/);assert.throws(()=>validateComparisonPage(forged,args,context),/Apadāna/);
    for(const bridge of ['Apps SDK','MCP Apps']) {
      const h=embedded(bridge,valid);assert.ok(h.nodes.english.textContent.includes(valid.text));
      h.output(forged);assert.ok(!h.nodes.english.textContent.includes(valid.text));assert.match(h.nodes.english.textContent,/No English was displayed/);assert.match(h.nodes.pali.textContent,/SYNTHETIC_PALI_REMAINS/);
    }
  }
});
