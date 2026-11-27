import {CURRENT_WIDGET_URI} from './helpers/intake380-metadata.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,digest,validateLink} from '../src/apadana.mjs';
import {readPassage,WIDGET_HTML,WIDGET_URI} from '../src/chatgpt-widget.mjs';
const gold=JSON.parse(readFileSync('docs/evidence/apadana/NEXT_CHAPTER_GOLDENS.json','utf8'));
const repair=JSON.parse(readFileSync('docs/evidence/apadana/NEXT_CHAPTER_REPAIR.json','utf8'));
const checkout=process.env.APADANA_SOURCE_CHECKOUT;
const originalFetch=globalThis.fetch;afterEach(()=>{globalThis.fetch=originalFetch;});
const id=n=>'ap:chapter-4/poem-'+String(n).padStart(3,'0');
const source=n=>readFileSync(`${checkout}/src/_poems/chapter-4/poem-${String(n).padStart(3,'0')}.md`,'utf8');

test('current registry retains the second Therī chapter identities and only reviewed root repairs',()=>{
  const data=canon.load();assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);
  for(const [uid,entry]of Object.entries(repair.units))assert.deepEqual(data.byId.get(uid),entry.after);
  assert.equal(canon.linksFor(canon.resolve('thi-ap21').unit).links.length,1);
  for(let n=11;n<=20;n++){
    const p=APADANA_PROFILES['thi-ap'+n],u=canon.resolve(p.id).unit;
    validateLink(p,p.id,u,data.canon.books[u.book]);
    for(const key of ['note_numbers','root_verses','stanza_layout','publisher_divisions'])assert.throws(()=>validateLink({...p,[key]:null},p.id,u,data.canon.books[u.book]),/differs/);
    assert.ok(p.mapping_notes[0].includes('not a line-complete translation'));
    assert.equal(p.stanza_layout.length,gold.rows.find(g=>g.id===p.id).stanza_count);
  }
  assert.deepEqual(APADANA_PROFILES['thi-ap17'].note_numbers,[...Array.from({length:20},(_,i)=>i+1),...Array.from({length:99},(_,i)=>i+22)]);
  assert.deepEqual(APADANA_PROFILES['thi-ap20'].chapter_summary.note_numbers,[27]);
});

test('source-enabled parser reproduces all498 independent stanza entries and350 original note definitions',{skip:!checkout},()=>{
  let stanzas=0,notes=0,paragraphs=0;
  for(const g of gold.rows){
    const p=APADANA_PROFILES[g.id],raw=source(p.poem),value=parseApadana(raw,p),parts=value.text.split('\n\n');
    assert.equal(digest(raw),g.raw_sha256);assert.equal(digest(value.text),g.body_sha256);assert.equal(digest(JSON.stringify(value.translator_notes)),g.notes_sha256);assert.equal(digest(value.publisher_paratext),g.paratext_sha256);
    assert.deepEqual(value.translator_notes.map(n=>n.number),g.note_numbers);
    for(const row of g.paragraph_hashes){assert.equal(digest(parts[row.paragraph]),row.sha256,g.id+'/'+row.paragraph);assert.equal(parts[row.paragraph].split('\n').length,row.lines);paragraphs++;}
    const quoted=quotationText({...value,translation_id:id(p.poem)});assert.equal(quoted.split('\n\n').length,g.stanza_count);assert.ok(!quoted.includes('Thus indeed'));
    assert.ok(!quoted.includes(value.publisher_paratext)||!value.publisher_paratext);
    stanzas+=g.stanza_count;notes+=value.translator_notes.length;
    for(const division of value.publisher_divisions||[]){assert.equal(division.translator_notes[0].number,21);assert.equal(digest(division.text),g.publisher_divisions[0].body_sha256);assert.ok(!value.text.includes(division.text));assert.ok(!quoted.includes(division.text));notes+=division.translator_notes.length;}
    if(value.chapter_summary){assert.equal(digest(value.chapter_summary.text),g.summary_body_sha256);assert.deepEqual(value.chapter_summary.translator_notes.map(n=>n.number),[27]);assert.ok(!value.text.includes('The Summary:'));assert.ok(!quoted.includes(value.chapter_summary.text));notes++;}
    for(const changed of [raw+'\n',raw.replace('title:','title: Changed '),raw.replace('[^1]:','[^999]:')])assert.throws(()=>parseApadana(changed,p),/differs/);
    assert.throws(()=>parseApadana(raw,{...p,body_sha256:'0'.repeat(64)}),/differs/);
  }
  assert.deepEqual([stanzas,notes,paragraphs],[498,350,528]);
});

test('finite stanza labels preserve null globals, compound labels and original square-bracketed local59',()=>{
  const p16=APADANA_PROFILES['thi-ap16'];assert.deepEqual(p16.stanza_layout.map(s=>s.publisher_label),['215','216','217','218','219','220','221','223','224','225','222',null]);
  assert.equal(p16.stanza_layout.at(-1).suffix,'(12)');
  assert.ok(APADANA_PROFILES['thi-ap17'].stanza_layout.some(s=>s.local_label==='2e-f, 3a-b'));
  const special=APADANA_PROFILES['thi-ap19'].stanza_layout.find(s=>s.local_label==='59');assert.equal(special.suffix,'[59] [570]');
  assert.equal(APADANA_PROFILES['thi-ap19'].stanza_layout.find(s=>s.publisher_label==='534').local_label,null);
});

test('actual API long continuations and widget preserve sparse notes and source-owned divisions',{skip:!checkout},async()=>{
  const fetches=[];globalThis.fetch=async url=>{const p=Object.values(APADANA_PROFILES).find(p=>p.raw_url===url.href);assert.ok(p,'only finite approved URLs');fetches.push(p.id);return new Response(source(p.poem));};
  for(const n of [11,16,17,18,19,20]){
    const u=canon.resolve('thi-ap'+n).unit,p=APADANA_PROFILES[u.id];let args={limit:500,translation_revision:APADANA_COMMIT},text='',pages=0;
    while(args){const page=await english.translation(u,id(n),args);text+=page.text;pages++;assert.deepEqual(page.translator_notes.map(x=>x.number),p.note_numbers);if(n===17){assert.equal(page.publisher_divisions[0].translator_notes[0].number,21);assert.match(page.changes,/recitation division/);}if(n===20)assert.equal(page.chapter_summary.translator_notes[0].number,27);args=page.continue_with?.arguments;}
    assert.equal(digest(text),p.body_sha256);if(n===17)assert.ok(pages>50);
    const widget=await readPassage({uid:u.id,translation:id(n)});assert.ok(!widget.english_error);assert.deepEqual(widget.english.translator_notes.map(x=>x.number),p.note_numbers);
    if(n===17)assert.equal(widget.english.publisher_divisions[0].translator_notes[0].number,21);
  }
  const before=fetches.length;await assert.rejects(english.translation(canon.resolve('thi-ap12').unit,id(17)),/not linked/);assert.equal(fetches.length,before);
  assert.equal(WIDGET_URI,CURRENT_WIDGET_URI);
});

test('source-enabled embedded reader executes sparse note and publisher division ownership guards',{skip:!checkout},async()=>{
  const vm=await import('node:vm');const sandbox=vm.createContext({TextEncoder});vm.runInContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('),WIDGET_HTML.indexOf('  function render(d) {'))+';globalThis.check=checkedApadana;',sandbox);
  const p=APADANA_PROFILES['thi-ap17'],english={...p,translation_id:id(17),fetched_url:p.raw_url,license_url:'https://creativecommons.org/licenses/by-nc-sa/4.0/',text:'Synthetic poem',attribution:'Synthetic attribution',changes:'Synthetic extraction',notes:[...p.mapping_notes],publisher_paratext:'',translator_notes:p.note_numbers.map(number=>({number,text:'Synthetic note'})),publisher_divisions:p.publisher_divisions.map(d=>({...d,text:'Synthetic division',translator_notes:[{number:21,text:'Synthetic division note'}]}))};
  const invented={text_id:p.id,english};assert.equal(sandbox.check(invented).english,null);
  Object.assign(english,parseApadana(source(p.poem),p));
  const value={text_id:p.id,english};assert.equal(sandbox.check(value),value);
  for(const patch of [{publisher_divisions:undefined},{publisher_divisions:[{...english.publisher_divisions[0],before_local_label:'23'}]},{publisher_divisions:[{...english.publisher_divisions[0],translator_notes:[{number:1,text:'Renumbered'}]}]},{translator_notes:Array.from({length:119},(_,i)=>({number:i+1,text:'Renumbered'}))}])assert.equal(sandbox.check({...value,english:{...english,...patch}}).english,null);
  assert.equal(sandbox.check({text_id:'mn1',english:{source:'dhammatalks.org',translation_id:'dt:MN/MN1',publisher_divisions:[]}}).english,null);
});

test('embedded sparse poem metadata remains finite and invented poem-note content refuses offline',async()=>{
  const vm=await import('node:vm'),sandbox=vm.createContext({TextEncoder});
  vm.runInContext(WIDGET_HTML.slice(WIDGET_HTML.indexOf('  function checkedChapterSummary('),WIDGET_HTML.indexOf('  function render(d) {'))+';globalThis.check=checkedApadana;',sandbox);
  const p=APADANA_PROFILES['thi-ap17'];
  assert.deepEqual(p.note_numbers,[...Array.from({length:20},(_,i)=>i+1),...Array.from({length:99},(_,i)=>i+22)]);
  assert.deepEqual(p.publisher_divisions[0].note_numbers,[21]);
  const english={...p,translation_id:id(17),fetched_url:p.raw_url,license_url:'https://creativecommons.org/licenses/by-nc-sa/4.0/',text:'Synthetic poem',attribution:'Synthetic attribution',changes:'Synthetic extraction',notes:[...p.mapping_notes],publisher_paratext:'',translator_notes:p.note_numbers.map(number=>({number,text:'Synthetic note'}))};
  assert.equal(sandbox.check({text_id:p.id,english}).english,null);
  assert.equal(sandbox.check({text_id:'mn1',english:{source:'dhammatalks.org',translation_id:'dt:MN/MN1',publisher_divisions:[]}}).english,null);
});
