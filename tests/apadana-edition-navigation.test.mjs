import {CURRENT_THERA_IDS} from './helpers/apadana-intake-expectations.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {APADANA_COMMIT,APADANA_PROFILES,APADANA_VRI_COMMIT} from '../src/apadana-profiles.mjs';
import {apadanaEditionNavigation,apadanaEditionLink} from '../web/apadana-edition-navigation.mjs';
const clone=value=>structuredClone(value);
function fixture(uid){
 const p=APADANA_PROFILES[uid];assert.ok(p,uid);
 const choice={translation_id:'ap:'+p.path.replace(/^\/text\/|\/$/g,''),translation_revision:APADANA_COMMIT,translator:p.translator,license:p.license,url:p.url};
 for(const key of ['publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap'])if(p[key])choice[key]=clone(p[key]);
 return{text_id:uid,source:{commit:APADANA_VRI_COMMIT,repository:'https://github.com/VipassanaTech/tipitaka-xml',...(p.index_revision?{locator_revision:APADANA_VRI_COMMIT+'-'+p.index_revision}:{})},english_available:[choice]};
}
const profiles=Object.values(APADANA_PROFILES);
test('all forty reviewed Theri poems preserve publisher order, exact canonical links and existing locator revisions',()=>{
 const expected=profiles.filter(p=>p.path.startsWith('/text/chapter-4/')).sort((a,b)=>a.poem-b.poem);assert.equal(expected.length,40);
 for(const p of expected){
  const data=fixture(p.id),nav=apadanaEditionNavigation(data),items=nav.groups.flatMap(g=>g.poems);
  assert.equal(nav.family,'theri');assert.equal(nav.revision,APADANA_COMMIT);
  assert.deepEqual(items.map(row=>row.uid),expected.map(row=>row.id));assert.equal(nav.current.uid,p.id);
  assert.equal(nav.previous?.uid,expected[p.poem-2]?.id);assert.equal(nav.next?.uid,expected[p.poem]?.id);
  assert.deepEqual(nav.groups.map(g=>g.label),['Publisher poems 1–10','Publisher poems 11–20','Publisher poems 21–30','Publisher poems 31–40']);
  assert.equal(nav.summary.uid,expected[Math.ceil(p.poem/10)*10-1].id);
  for(const item of items){const target=APADANA_PROFILES[item.uid],args=new URLSearchParams(item.href.split('?')[1]);assert.deepEqual([...args.keys()],['uid','offset','page_source']);assert.equal(args.get('uid'),target.id);assert.equal(args.get('offset'),'0');assert.equal(args.get('page_source'),APADANA_VRI_COMMIT+(target.index_revision?'-'+target.index_revision:''));assert.equal(apadanaEditionLink(data,item.uid),item.href);}
  assert.match(nav.note,/not the whole Apadāna or line-complete VRI English/);
 }
});
test('reviewed Thera subset uses literal profile owners and stays separate from all forty Theri poems',()=>{
 const expected=profiles.filter(p=>p.publisher_chapter==='chapter-3').sort((a,b)=>a.poem-b.poem);
 const curated=JSON.parse(readFileSync(new URL('../docs/evidence/apadana/THERA_PAIR_INTAKE_APPROVAL.json',import.meta.url),'utf8'));
 const expectedIds=[...curated.baseline_records,...curated.approved_records].filter(row=>row.publisher_chapter==='chapter-3').sort((a,b)=>a.poem-b.poem).map(row=>row.id);
 assert.deepEqual(expected.map(p=>p.id),expectedIds);
 assert.equal(expected.length,CURRENT_THERA_IDS.length);
 for(const p of expected){
  const nav=apadanaEditionNavigation(fixture(p.id)),items=nav.groups.flatMap(g=>g.poems),at=expected.findIndex(row=>row.id===p.id);
  assert.equal(nav.family,'thera');assert.deepEqual(items.map(row=>row.uid),expected.map(row=>row.id));assert.equal(nav.previous?.uid,expected[at-1]?.id);assert.equal(nav.next?.uid,expected[at+1]?.id);
  assert.ok(items.every(row=>row.uid.startsWith('tha-ap')));assert.ok(items.every(row=>row.href.includes('uid='+row.uid)));
  assert.match(nav.note,/not complete Therā or line-complete VRI English/);
  const last=nav.groups.find(g=>g.poems.some(row=>row.uid===p.id)).poems.at(-1);
  assert.equal(nav.summary?.uid,APADANA_PROFILES[last.uid].chapter_summary?last.uid:undefined);
  for(const target of ['thi-ap1','tha-ap11','tha-ap12','tha-ap72','tha-ap999'])assert.throws(()=>apadanaEditionLink(fixture(p.id),target),/unavailable/);
 }
 const first=expected[0];assert.equal(first.poem,11);assert.equal(first.id,'tha-ap13');assert.notEqual(first.id,'tha-ap'+first.poem);
});
test('new reviewed Thera owners retain exact summary scope and refuse substituted editions before creating controls',()=>{
 for(const uid of ['tha-ap33','tha-ap34','tha-ap35','tha-ap36','tha-ap37','tha-ap38','tha-ap39','tha-ap40','tha-ap41','tha-ap42']){
  const good=fixture(uid),nav=apadanaEditionNavigation(good);assert.equal(nav.groups.find(g=>g.poems.some(item=>item.uid===uid)).label,'Publisher poems 31–40');assert.equal(nav.summary.uid,'tha-ap42');
  for(const mutate of [d=>d.canonical=false,d=>d.content_type='commentary',d=>d.source.commit='0'.repeat(40),d=>d.english_available[0].translation_revision='0'.repeat(40),d=>d.english_available[0].license='CC0',d=>d.english_available[0].translation_id='ap:chapter-3/poem-041',d=>d.english_available[0].publisher_preface={}]){const bad=clone(good);mutate(bad);assert.throws(()=>apadanaEditionNavigation(bad));assert.throws(()=>apadanaEditionLink(bad,'tha-ap42'));}
 }
 const data=fixture('tha-ap42');data.english_available[0].chapter_summary.root_start=3476;assert.throws(()=>apadanaEditionNavigation(data),/scope|summary/);
});
test('foreign owners, unknown targets, source/locator drift, missing choices and edition substitutions never create a destination',()=>{
 for(const uid of ['mn1','thi-ap41','tha-ap1','book:s0510m2.mul']){assert.equal(apadanaEditionNavigation({text_id:uid}),null);assert.throws(()=>apadanaEditionLink({text_id:uid},'thi-ap1'),/unavailable/);}
 for(const uid of ['thi-ap1','thi-ap4','thi-ap21','thi-ap33','thi-ap40']){
  const good=fixture(uid);for(const mutate of [d=>d.canonical=false,d=>d.content_type='commentary',d=>d.selection='source_book',d=>delete d.source,d=>d.source.commit='0'.repeat(40),d=>d.source.repository='https://foreign.invalid',d=>d.source.locator_revision='old',d=>delete d.english_available,d=>d.english_available=[],d=>d.english_available.push(clone(d.english_available[0])),d=>d.english_available[0].translation_revision='0'.repeat(40),d=>d.english_available[0].url+='?foreign',d=>d.english_available[0].license='CC0',d=>d.english_available[0].translation_id='ap:chapter-4/poem-999',d=>d.english_available.push(fixture(uid==='thi-ap1'?'thi-ap2':'thi-ap1').english_available[0])]){const bad=clone(good);mutate(bad);assert.throws(()=>apadanaEditionNavigation(bad));assert.throws(()=>apadanaEditionLink(bad,'thi-ap2'));}
  if(APADANA_PROFILES[uid].index_revision){const bad=clone(good);delete bad.source.locator_revision;assert.throws(()=>apadanaEditionNavigation(bad));}
  for(const target of ['mn1','thi-ap0','thi-ap41','tha-ap13','thi-ap1?source=old','https://foreign.invalid'])assert.throws(()=>apadanaEditionLink(good,target),/unavailable/);
 }
});

class Element{constructor(tag=''){this.tagName=tag;this.children=[];this.attributes={};this._text='';}set textContent(value){this._text=String(value);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}append(...nodes){this.children.push(...nodes);}setAttribute(key,value){this.attributes[key]=value;}}
const flatten=node=>[node,...node.children.flatMap(flatten)];
test('new Thera after-poem divisions and note-free summaries render honestly while prior Theri captions stay unchanged',()=>{
 const source=readFileSync(new URL('../web/reader.js',import.meta.url),'utf8');const code=source.slice(source.indexOf('function chapterSummary('),source.indexOf('function provenance('));
 const sandbox=createContext({el(tag,text){const node=new Element(tag);if(text!==undefined)node.textContent=text;return node;}});runInContext(code+';globalThis.show=(data,target)=>{chapterSummary(data,target,4);publisherDivisions(data,target,4);};',sandbox);
 const root=new Element('div');sandbox.show({chapter_summary:{parent_id:'tha-ap22',text:'Synthetic summary',translator_notes:[]},publisher_divisions:[{placement:'after_poem',label:'Synthetic recitation',text:'Synthetic separate division',translator_notes:[]}]},root);
 assert.match(root.textContent,/Original summary counts and titles are preserved/);assert.match(root.textContent,/after the poem’s closing colophons/);assert.doesNotMatch(root.textContent,/undefined|Chapter summary notes|Recitation notes|ordering and stanza count differ/);assert.equal(flatten(root).filter(node=>node.tagName==='ol').length,0);
 const afterSummary=new Element('div');sandbox.show({publisher_divisions:[{placement:'after_chapter_summary',label:'Synthetic fourth recitation',text:'Synthetic division',translator_notes:[]}]},afterSummary);assert.match(afterSummary.textContent,/after the chapter summary/);assert.doesNotMatch(afterSummary.textContent,/undefined|closing colophons/);
 const prior=new Element('div');sandbox.show({chapter_summary:{parent_id:'thi-ap30',text:'Synthetic prior summary',translator_notes:[{number:43,text:'Synthetic note'}]}},prior);assert.match(prior.textContent,/ordering and stanza count differ from VRI/);assert.match(prior.textContent,/Chapter summary notes/);
});


test('edition controls start in a native closed disclosure without collapsing source text',()=>{
 const source=readFileSync(new URL('../web/reader.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('function attachApadanaEditionNavigation('),source.indexOf('async function read('));
 const sandbox=createContext({epoch:1,apadanaEditionNavigation,apadanaEditionLink,el(tag,text){const node=new Element(tag);if(text!==undefined)node.textContent=text;node.addEventListener=()=>{};return node;},link(text,href){const node=new Element('a');node.textContent=text;node.href=href;return node;}});
 runInContext(code+';globalThis.attach=attachApadanaEditionNavigation;',sandbox);
 const target=new Element('div');sandbox.attach(fixture('thi-ap31'),target,1);
 const region=target.children[0],details=region.children[0];assert.equal(details.tagName,'details');assert.ok(!details.open);assert.equal(details.children[0].tagName,'summary');assert.equal(details.children[0].textContent,'Reviewed publisher edition order');assert.match(details.textContent,/not the whole Apadāna or line-complete VRI English/);assert.equal(flatten(region).filter(node=>node.tagName==='select').length,1);
});
