import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as canon from '../src/canon.mjs';
import {parseApadana,validateLink,quotationText,digest} from '../src/apadana.mjs';
import {APADANA_PROFILES} from '../src/apadana-profiles.mjs';
import {validateChapterSummary,scopeDescriptor} from '../web/translation-policy.mjs';
const summary=APADANA_PROFILES['thi-ap10'].chapter_summary;

test('chapter summary identity and note8 cannot be omitted, reassigned or downgraded',()=>{
  const choice=canon.describe(canon.resolve('thi-ap10').unit).english[0];
  assert.equal(scopeDescriptor(choice,'thi-ap10'),null);
  validateChapterSummary(choice,'thi-ap10');
  const runtime={chapter_summary:{...summary,text:'Synthetic chapter text',translator_notes:[{number:8,text:'Synthetic chapter note'}]}};
  validateChapterSummary(runtime,'thi-ap10',true);
  for(const patch of [undefined,null,{...summary,parent_id:'thi-ap5'},{...summary,first_ref:'thi-ap10/18'},{...summary,root_start:6929},{...summary,body_sha256:'f'.repeat(64)},{...summary,note_numbers:[1]},{...summary,unexpected:true}]){
    assert.throws(()=>validateChapterSummary({chapter_summary:patch},'thi-ap10'),/Apadāna/);
  }
  for(const patch of [{text:''},{translator_notes:[]},{translator_notes:[{number:1,text:'renumbered'}]},{translator_notes:[{number:8,text:'note',extra:true}]}]){
    assert.throws(()=>validateChapterSummary({chapter_summary:{...runtime.chapter_summary,...patch}},'thi-ap10',true),/Apadāna/);
  }
  assert.throws(()=>validateChapterSummary({},'thi-ap10',true),/Apadāna/);
  assert.throws(()=>validateChapterSummary(runtime,'thi-ap4',true),/owner changed/);
  assert.throws(()=>validateChapterSummary(runtime,'thi-ap10'),/Apadāna/);
});

test('metadata-only summary binds exact canonical paratext and preserves both whole roots',()=>{
  const snapshot=canon.load(),unit=canon.resolve('thi-ap10').unit;
  const selected=canon.segments(unit,{includeSourcePositions:true}).filter(s=>s.source_blocks[0]>=summary.root_start);
  assert.deepEqual(selected.map(s=>s.ref),['thi-ap10/19','thi-ap10/20','thi-ap10/21','thi-ap10/22']);
  assert.deepEqual(selected.at(-1).source_blocks,[6934,6936]);
  for(const uid of ['thi-ap4','thi-ap5','thi-ap10']){
    const u=canon.resolve(uid).unit,link=APADANA_PROFILES[uid],book=snapshot.canon.books[u.book];
    validateLink(link,uid,u,book);
    for(const key of ['index_revision','publisher_verse_labels','chapter_summary']){
      assert.throws(()=>validateLink({...link,[key]:null},uid,u,book),/differs/);
    }
    if(uid!=='thi-ap10')assert.throws(()=>validateLink(link,uid,{...u,index_revision:'old'},book),/differs/);
  }
  for(const key of ['text','translator_notes'])assert.equal(Object.hasOwn(summary,key),false);
});

test('only the reviewed combined39-40 label enters stanza quotation evidence',()=>{
  const value={text:'Synthetic chapter summary\n\nInvented numbered stanza (3) [39-40]\n\nNot an approved range (4) [40-41]',chapter_summary:{text:'Forbidden chapter summary'}};
  assert.equal(quotationText(value),'Invented numbered stanza');
});

const checkout=process.env.APADANA_SOURCE_CHECKOUT;
test('actual three artifacts preserve irregular publisher order, scoped summary and every note',{skip:!checkout},()=>{
  for(const n of [4,5,10]){
    const p=APADANA_PROFILES['thi-ap'+n],raw=readFileSync(`${checkout}/src/_poems/chapter-4/poem-${String(n).padStart(3,'0')}.md`,'utf8'),v=parseApadana(raw,p);
    assert.equal(digest(v.text),p.body_sha256);assert.equal(digest(JSON.stringify(v.translator_notes)),p.notes_sha256);
    if(n===5){
      assert.deepEqual(v.text.split('\n\n').flatMap(s=>s.match(/\(\d+\) \[([\d-]+)\](?:\[Note \d+\])*$/)?.[1]||[]),p.publisher_verse_labels);
      assert.throws(()=>parseApadana(raw.replace('\\[39-40\\]','\\[39\\]'),p),/differs/);
      assert.throws(()=>parseApadana(raw,{...p,publisher_verse_labels:['37','38','39','40','41','42','43','44','45']}),/differs/);
    }
    if(n===10){
      assert.equal(v.text.split('\n\n').length,18);assert.equal(v.chapter_summary.text.split('\n\n').length,3);
      assert.deepEqual(v.translator_notes.map(n=>n.number),[1,2,3,4,5,6,7]);assert.deepEqual(v.chapter_summary.translator_notes.map(n=>n.number),[8]);
      assert.equal(digest(v.chapter_summary.text),summary.body_sha256);assert.equal(digest(JSON.stringify(v.chapter_summary.translator_notes)),summary.notes_sha256);
      assert.equal(v.text.includes('The Summary:'),false);assert.equal(quotationText(v).includes(v.chapter_summary.text),false);
      for(const changed of [raw.replace('The Summary:','Changed summary:'),raw.replace('[^8]','[^7]'),raw.replace('[^8]:','[^9]:')])assert.throws(()=>parseApadana(changed,p),/differs/);
    }
  }
});

test('widget cursors pin the paired mapping and reject historical4/5 offsets before wording',async()=>{
  const {readPassage}=await import('../src/chatgpt-widget.mjs');
  for(const uid of ['thi-ap4','thi-ap5']){
    const original=canon.source().commit,current=original+'-apadana-theri45-v1';
    for(const request of [{offset:1},{segment:uid+'/1'},{offset:0}])await assert.rejects(readPassage({uid,english:false,source_commit:original,...request}),/locator revision changed/);
    const result=await readPassage({uid,english:false,limit:1});
    assert.equal(result.source.commit,original);assert.equal(result.source.locator_revision,current);
    assert.equal(result.pali.read_with.arguments.source_commit,current);assert.equal(result.pali.continue_with.arguments.source_commit,current);
    const next=await readPassage(result.pali.continue_with.arguments);assert.equal(next.pali.offset,1);
    const exact=await readPassage({uid,english:false,segment:uid+'/1'});assert.equal(exact.pali.context_with.arguments.source_commit,current);
    assert.equal((await readPassage(exact.pali.context_with.arguments)).context_for,uid+'/1');
  }
});

test('embedded reader executes finite chapter ownership guards before rendering any source',async()=>{
  const vm=await import('node:vm'),{WIDGET_HTML}=await import('../src/chatgpt-widget.mjs');
  const code=WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('),WIDGET_HTML.indexOf('  function render(d) {'));
  const sandbox=vm.createContext({});vm.runInContext(code+';globalThis.check=checkedApadana;',sandbox);
  const p=APADANA_PROFILES['thi-ap10'];
  const english={...p,translation_id:'ap:chapter-4/poem-010',fetched_url:p.raw_url,license_url:'https://creativecommons.org/licenses/by-nc-sa/4.0/',text:'Synthetic poem text',attribution:'Synthetic attribution',changes:'Synthetic extraction',notes:[...p.mapping_notes],publisher_paratext:'',translator_notes:Array.from({length:7},(_,i)=>({number:i+1,text:'Synthetic note'})),chapter_summary:{...summary,text:'Synthetic chapter',translator_notes:[{number:8,text:'Synthetic chapter note'}]}};
  const original={text_id:'thi-ap10',english};assert.equal(sandbox.check(original),original);
  for(const chapter_summary of [undefined,{...english.chapter_summary,parent_id:'thi-ap9'},{...english.chapter_summary,translator_notes:[{number:1,text:'Misnumbered'}]},{...english.chapter_summary,extra:true}])assert.equal(sandbox.check({...original,english:{...english,chapter_summary}}).english,null);
  assert.equal(sandbox.check({text_id:'mn1',english:{source:'dhammatalks.org',translation_id:'dt:MN/MN1',chapter_summary:{text:'Unowned chapter'}}}).english,null);
});
