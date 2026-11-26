import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT,isApadanaRawUrl} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,rootDigest} from '../src/apadana.mjs';
import {parseTheraApadana} from '../src/apadana-thera.mjs';
import {fetchPublic} from '../src/http.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {liveCache} from '../src/cache.mjs';
import {thera312319Evidence,digest,blob,REV,VRI} from './helpers/thera312-319-evidence.mjs';

const e=thera312319Evidence(),originalFetch=globalThis.fetch;
const clone=value=>JSON.parse(JSON.stringify(value)),profile=id=>APADANA_PROFILES[id],tid=p=>canon.translationId(p);
const parsed=id=>parseApadana(e.artifact(id),profile(id));
const labelCount=label=>{const [first,last=first]=label.split('-').map(Number);return last-first+1;};
const definitions=raw=>[...raw.matchAll(/^\[\^(\d+)\]:[ \t]*([^]*?)(?=^\[\^\d+\]:|(?![^]))/gm)];
const display='<span class="diacritics" data-state="on">c</span><span class="no-diacritics" data-state="off">ch</span>';
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});
function transport(calls) {
  liveCache.clear();
  globalThis.fetch=async input=>{
    const url=typeof input==='string'?input:input.href;
    const id=e.ids.find(id=>e.profiles[id].raw_url===url);
    assert.ok(id,'Only exact eight approved Markdown URLs reach fixture transport');
    calls.push(id);return new Response(e.artifact(id));
  };
}

test('exact333 identities preserve all325 full ordered profile and link objects, rights policy and all canonical/non-Apadana data',()=>{
  const data=canon.load(),manifest=JSON.parse(readFileSync('server/data/apadana.json'));
  e.assertCatalogue(manifest,APADANA_PROFILES);
  assert.equal(APADANA_COMMIT,REV);
  assert.equal(Object.keys(APADANA_PROFILES).filter(id=>id.startsWith('thi-ap')).length,40);
  assert.equal(Object.keys(APADANA_PROFILES).filter(id=>id.startsWith('tha-ap')).length,299);
  assert.equal(digest(JSON.stringify(data.canon)),e.compact.canonical_logical_sha256);
  assert.equal(data.canon.units.length,8544);assert.equal(data.canon.books.length,61);
  for(const [path,sha] of Object.entries(e.compact.data_file_sha256)) assert.equal(digest(readFileSync(path)),sha,'Preserved original325 data '+path);
  for(const id of e.ids) {
    const p=profile(id),g=e.golden(id),unit=data.byId.get(id);
    assert.ok(Object.isFrozen(p));assert.deepEqual(p,e.profiles[id]);assert.deepEqual(manifest.links[id],e.links[id]);
    assert.equal(rootDigest(unit,data.canon.books[unit.book]),p.root_sha256);
    for(const key of ['id','book','start','end','title','vri']) assert.deepEqual(unit[key],g.root[key]);
  }
  for(const poem of e.heldPublishers) assert.equal(profile('tha-ap'+(poem+2)),undefined,'Held publisher '+poem);
});

test('all eight original raw/blob pins and six rights artifacts yield73 paragraphs34 complete notes with independent UTF16/layout hashes',{skip:!e.checkout},()=>{
  for(const item of e.rights) {
    const raw=readFileSync(join(e.checkout,item.path));assert.equal(raw.length,item.bytes);assert.equal(digest(raw),item.sha256);assert.equal(blob(raw),item.git_blob_sha1);
  }
  let paragraphs=0,notes=0,entries=0,labels=0;
  for(const id of e.ids) {
    const value=parsed(id),p=profile(id),b=e.independent(id);e.assertNormalized(id,value);
    assert.equal(value.title,p.title);assert.equal(value.text.length,b.body_characters_utf16);
    paragraphs+=value.text.split('\n\n').length;notes+=value.translator_notes.length;entries+=p.stanza_layout.length;
    labels+=p.stanza_layout.reduce((n,row)=>n+labelCount(row.local_label),0);
  }
  assert.deepEqual({paragraphs,notes,entries,labels},{paragraphs:73,notes:34,entries:49,labels:50});
});

test('all49 whole-verse quotation entries match independent pins, including the single319 eight-line4-5 entry and excluded title/colophons/notes',{skip:!e.checkout},()=>{
  let entries=0,combined=0;
  for(const id of e.ids) {
    const value=parsed(id),p=profile(id),b=e.independent(id);e.assertNormalized(id,value);
    const quote=quotationText({...value,translation_id:tid(p)}),rows=quote.split('\n\n');
    assert.equal(digest(quote),b.quotation_text_sha256);
    assert.deepEqual(rows.map(digest),b.quotation_entries_sha256);
    assert.deepEqual(rows.map(row=>row.length),b.quotation_entries_characters_utf16);
    assert.deepEqual(rows.map(row=>row.split('\n').length),b.quotation_entries_lines);
    assert.ok(!/\[Note \d+\]/.test(quote));
    for(const paragraph of [value.text.split('\n\n')[0],...value.text.split('\n\n').slice(-2)]) assert.ok(!quote.includes(paragraph),'No title/colophon in verse quote '+id);
    for(const note of value.translator_notes) if(note.text.length>40) assert.ok(!quote.includes(note.text),'No note body in verse quote '+id);
    entries+=rows.length;combined+=rows.filter(row=>row.split('\n').length===8).length;
  }
  assert.equal(entries,49);assert.equal(combined,1);
  assert.deepEqual(profile('tha-ap321').stanza_layout[3],{local_label:'4-5',publisher_label:'2817-2818',suffix:'(4-5) [2817-2818]',lines:8});
});

test('all approved edition caveats and exact publisher titles remain literal beside unchanged independent VRI titles',{skip:!e.checkout},()=>{
  for(const id of e.ids) {
    const value=parsed(id),p=profile(id),s=e.scope(id);e.assertNormalized(id,value);
    assert.equal(value.title,p.title);assert.deepEqual(p.mapping_notes,e.golden(id).mapping_notes);
    for(const notice of s.edition_and_notes_caveats) assert.ok(p.mapping_notes.includes(notice),id+' full original edition limitation');
    assert.ok(p.mapping_notes.some(note=>note.includes('not a line-complete')));
    assert.equal(canon.resolve(id).unit.title,e.golden(id).root.title);
  }
  assert.equal(parsed('tha-ap317').title,'Pupphâsaniya');assert.equal(parsed('tha-ap320').title,'Tiraŋsiya');
  assert.equal(parsed('tha-ap318').title,'Āsanatthavika');assert.equal(parsed('tha-ap321').title,'Kandalīpupphiya');
  assert.ok(e.profiles['tha-ap314'].mapping_notes.some(note=>note.includes('Amittabhā')&&note.includes('Amittaka')));
});

test('all34 numbered notes keep independently recorded owners;312 two c/ch displays stay solely in note3 and no chapter apparatus is invented',{skip:!e.checkout},()=>{
  let count=0;
  for(const id of e.ids) {
    const raw=e.artifact(id),value=parsed(id),b=e.independent(id),parts=value.text.split('\n\n');e.assertNormalized(id,value);
    for(const note of b.notes) {
      const locations=parts.flatMap((text,index)=>[...text.matchAll(/\[Note (\d+)\]/g)].filter(match=>Number(match[1])===note.number).map(()=>index));
      assert.deepEqual([...new Set(locations)],[note.owner.paragraph_index],'Exact note-reference owner '+id+' note'+note.number);
    }
    assert.deepEqual([...new Set([...value.text.matchAll(/\[Note (\d+)\]/g)].map(match=>Number(match[1])))].sort((a,b)=>a-b),profile(id).note_numbers);
    assert.equal(definitions(raw).length,profile(id).note_count);count+=value.translator_notes.length;
    for(const field of ['publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap']) assert.equal(Object.hasOwn(value,field),false);
  }
  assert.equal(count,34);
  const raw=e.artifact('tha-ap314'),notes=definitions(raw),note3=notes.find(row=>row[1]==='3')[2],body=raw.slice(0,raw.search(/^\[\^\d+\]:/m));
  assert.equal(note3.split(display).length-1,2);assert.equal(body.includes(display),false);
  for(const note of notes.filter(row=>row[1]!=='3')) assert.equal(note[2].includes(display),false);
  const value=parsed('tha-ap314');assert.equal(digest(value.translator_notes[2].text),e.independent('tha-ap314').notes[2].text_sha256);
  assert.ok(!/<span|data-state/.test(value.translator_notes[2].text));
});

test('authentic positives precede raw/title/order/rights/note/layout/HTML corruption and forged-profile refusal controls',{skip:!e.checkout},()=>{
  for(const id of e.ids) {
    const raw=e.artifact(id),p=profile(id);e.assertNormalized(id,parsed(id));
    const first=definitions(raw)[0],other=e.ids.find(other=>other!==id),changes=[raw+'\n',raw.replace('title: '+p.title,'title: Altered'),raw.replace('order: '+p.poem,'order: 311'),raw.replace('category: chapter-3','category: chapter-4'),raw.replace('[^1]: ','[^1]: x'),raw.replace('[^1]: ','[^2]: '),raw.replace(first[0],''),raw.replace('[^1]','').replace('(1','[^1] (1'),raw.replace('### ','## Invented chapter heading\n\n### '),raw.replace('\\['+p.stanza_layout[0].publisher_label+'\\]','\\[9999\\]')];
    if(id==='tha-ap314') {
      assert.equal(raw.split(display).length-1,2);
      changes.push(raw.replace('data-state="on"','data-state="off"'),raw.replace(display,display+display));
      const moved=raw.replace(display,'');changes.push(moved.replace('[^2]: ','[^2]: '+display));
    }
    if(id==='tha-ap321') {
      const entry=raw.split('\n\n').find(row=>row.includes('(4-5)')),lines=entry.split('\n');assert.equal(lines.length,8);
      changes.push(raw.replace(entry,lines.slice(0,4).join('\n')+'\n\n'+lines.slice(4).join('\n')));
      const note3=definitions(raw).find(row=>row[1]==='3');changes.push(raw.replace(note3[0],note3[0]+'”'));
    }
    for(const changed of changes) {
      assert.notEqual(digest(changed),digest(raw),'Meaningful actual-source corruption '+id);
      assert.throws(()=>parseApadana(changed,p));assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:digest(changed)}));
    }
    for(const patch of [{id:other},{poem:311},{path:'/text/chapter-3/poem-311/'},{translation_revision:'0'.repeat(40)},{license:'CC0'},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{root_sha256:'0'.repeat(64)},{note_numbers:[999]},{stanza_layout:[]},{mapping_notes:[]},{publisher_preface:{}},{chapter_summary:{}}]) assert.throws(()=>parseTheraApadana(raw,{...p,...patch}));
  }
});

test('all existing held publishers plus311/320 and media refuse before transport while genuine canonical Pali remains available',async()=>{
  liveCache.clear();let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No held or media transport allowed');};
  for(const poem of e.heldPublishers) {
    const id='tha-ap'+(poem+2),url=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${REV}/src/_poems/chapter-3/poem-${poem}.md`;
    assert.equal(profile(id),undefined);assert.equal(isApadanaRawUrl(url),false);
    await assert.rejects(fetchPublic(url,{json:false}),/outside the supported public sources/);
    await assert.rejects(english.translation(canon.resolve(id).unit,`ap:chapter-3/poem-${poem}`));
    const page=await readPassage({uid:id,translation:tid(profile(e.ids[0])),english:true,limit:2});assert.equal(page.english,null);assert.ok(page.english_error);assert.ok(page.pali.segments.length);
  }
  const media=`https://raw.githubusercontent.com/apadana-translation/apadana-site/${REV}/src/_poems/chapter-3/poem-312.mp3`;
  assert.equal(isApadanaRawUrl(media),false);await assert.rejects(fetchPublic(media,{json:false}),/outside the supported public sources/);assert.equal(calls,0);
});

test('cold and warm link-rights guards and authentic source-bound continuations reject revision/prefix/owner drift without fallback',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);const data=canon.load();
  for(const id of e.ids) {
    liveCache.clear();const p=profile(id),unit=data.byId.get(id),link=data.translations[id].find(row=>canon.translationId(row)===tid(p)),original=clone(link);
    const restore=()=>{for(const key of Object.keys(link)) delete link[key];Object.assign(link,clone(original));};
    link.license='CC0';const cold=calls.length;
    try{await assert.rejects(english.translation(unit,tid(p),{translation_revision:REV,limit:500}));assert.equal(calls.length,cold);}finally{restore();}
    const first=await english.translation(unit,tid(p),{translation_revision:REV,limit:500});assert.equal(first.body_sha256,p.body_sha256);assert.equal(first.total_characters,e.bodyLength(id));
    for(const patch of [{license:'CC0'},{path:'/text/chapter-3/poem-311/'},{raw_url:p.raw_url.replace(REV,'0'.repeat(40))},{root_sha256:'0'.repeat(64)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{paratext_sha256:'0'.repeat(64)},{translation_revision:'0'.repeat(40)},{note_numbers:[999]},{mapping_notes:[]},{publisher_preface:{}},{chapter_summary:{}}]) {
      Object.assign(link,patch);const before=calls.length;
      try{await assert.rejects(english.translation(unit,tid(p),{translation_revision:REV}));assert.equal(calls.length,before);}finally{restore();}
    }
    assert.ok(first.continue_with);const next=first.continue_with.arguments,before=calls.length;
    await assert.rejects(english.translation(unit,tid(p),{...next,translation_revision:'0'.repeat(40)}));assert.equal(calls.length,before);
    await assert.rejects(english.translation(unit,tid(p),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);
    await assert.rejects(english.translation(unit,tid(p),{...next,offset:next.offset+1}),/prefix changed/);
    await assert.rejects(english.translation(unit,tid(profile(e.ids.find(other=>other!==id))),next));
    assert.ok(calls.slice(before).every(requested=>requested===id),'No foreign-source fallback');
    const continued=await english.translation(unit,tid(p),next);assert.equal(continued.text_id,id);assert.equal(continued.translation_id,tid(p));assert.equal(continued.offset,500);assert.equal(continued.prefix_sha256,digest(parsed(id).text.slice(0,500)));
  }
});
