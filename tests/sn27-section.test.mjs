import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {getAtiText,translationCoverage} from '../src/providers.mjs';
import {liveCache} from '../src/cache.mjs';
import {extractAtiSection} from '../src/ati-sections.mjs';
import {validateSectionRegistry,sectionHash} from '../src/ati-section-registry.mjs';
import {buildIndex,toCsv} from '../scripts/export-index.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import {dailyText} from '../src/daily.mjs';

const registry=JSON.parse(readFileSync('scripts/canon/reviewed_ati_sections.json','utf8'));
const row=registry.links.find(row=>row.unit_id==='sn27.5');
const id=`ati:${row.path}#${row.anchor}`;
const sourceRoot=process.env.PALI_ATI_SECTIONS_SOURCE_DIR;
const html=()=>readFileSync(join(sourceRoot,row.path.slice(1)+'.html'),'utf8');
const copy=value=>structuredClone(value),snapshot=()=>canon.load(),unit=()=>snapshot().byId.get(row.unit_id);
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});

test('SN27.5 has one finite whole-discourse identity, unchanged root, honest title/PTS/ordinal limits and preserved neighbours',()=>{
 assert.equal(registry.links.length,45);
 assert.equal(sectionHash(registry.links.filter(row=>row.unit_id.startsWith('mil'))),'1895805a2ffc3518b590a000843a018b90f40694980094ba877940124d94ad16');
 assert.equal(sectionHash(JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json','utf8')).links.filter(row=>row.unit_id!=='mil6.4.1')),'a92f0cbbbe88958416bbb05c081656697d215a9812169e51c9b437f473dbae85');
 const d=snapshot(),segments=canon.segments(unit());
 assert.equal(unit().title,'Samphassajasuttaṃ');assert.equal(unit().pts.page,233);
 assert.equal(sectionHash(d.canon.books[unit().book].blocks.slice(unit().start,unit().end)),'7d4509cbcfbab32d0a52296149d2d13d455bf2bb4fc8cfa940f73f303a0bb703');
 assert.equal(segments.length,2);assert.match(segments[1].text,/…pe…/);assert.match(segments[1].text,/ Pañcamaṃ\.$/);
 assert.deepEqual(row.untranslated_paratext,[{ref:'sn27.5/2',text:'Pañcamaṃ.'}]);
 const [choice]=english.available(unit());assert.equal(choice.translation_id,id);assert.equal(choice.translator,'Thanissaro Bhikkhu');assert.equal(choice.license,'CC-BY-NC');
 assert.equal(choice.source_section.profile,'ati-sn27-feelings-v1');assert.equal(choice.source_section.note_count,0);assert.equal(choice.translation_scope,undefined);
 for(const term of ['Vedana','Samphassaja','peyyāla','Pañcamaṃ.','232','233','other nine'])assert.ok(choice.mapping_note.includes(term),term);
 for(const n of [1,2,3,4,6,7,8,9,10]){
  const links=d.translations['sn27.'+n];assert.equal(links.length,1);assert.equal(links[0].source,'dhammatalks');assert.equal(links[0].url,`https://www.dhammatalks.org/suttas/SN/SN27_${n}.html`);
 }
 assert.equal(canon.resolve(`https://www.accesstoinsight.org${row.path}.html#sn27.005`).unit.id,'sn27.5');
 for(const anchor of ['', '#sn27.004','#sn27.006','#sn27.5','#top','#sn27%2E005','#sn27.005#other'])assert.throws(()=>canon.resolve(`https://accesstoinsight.org${row.path}.html${anchor}`),/anthology page/);
 const coverage=translationCoverage({refresh:true});assert.equal(coverage.total.partial_links,22);assert.equal(coverage.total.partial_only,16);assert.equal(coverage.total.shared_links,12);
});

test('SN27 section registry refuses wrong collection, author, rights, selector, inline ordinal, scope downgrade and deleted binding',()=>{
 const d=snapshot(),mutations=[
  m=>m.links.pop(),m=>{m.links.find(r=>r.unit_id==='sn27.5').unit_id='sn27.4';},m=>{m.links.find(r=>r.unit_id==='sn27.5').translator='John Kelly';},m=>{m.links.find(r=>r.unit_id==='sn27.5').license='Kelly-free-distribution-2005';},
  m=>{m.links.find(r=>r.unit_id==='sn27.5').section.profile='ati-kelly-milinda-v1';},m=>{m.links.find(r=>r.unit_id==='sn27.5').anchor='sn27.004';},m=>{m.links.find(r=>r.unit_id==='sn27.5').section.last_ref='sn27.5/3';},
  m=>{m.links.find(r=>r.unit_id==='sn27.5').untranslated_paratext=[];},m=>{m.links.find(r=>r.unit_id==='sn27.5').untranslated_paratext=[{ref:'sn27.5/3',text:'Pañcamaṃ.'}];},m=>{m.links.find(r=>r.unit_id==='sn27.5').untranslated_paratext[0].text='Fourth';},
  m=>{m.links.find(r=>r.unit_id==='sn27.5').section.pali_sha256='0'.repeat(64);},m=>{m.links.find(r=>r.unit_id==='sn27.5').root.root_blocks_sha256='0'.repeat(64);},
 ];
 for(const mutate of mutations){const m=copy(registry);mutate(m);assert.throws(()=>validateSectionRegistry(m,d.canon,d.translations,canon.segments),/Registered ATI/);}
 for(const mutate of [links=>{delete links['sn27.5'];},links=>{delete links['sn27.5'][0].section;},links=>{links['sn27.5'][0].url=`https://accesstoinsight.org${row.path}.html`;},links=>{links['sn27.4'].push(copy(links['sn27.5'][0]));},links=>{links['sn27.5'][0].shared_scope={};}]){
  const links=copy(d.translations);mutate(links);assert.throws(()=>validateSectionRegistry(registry,d.canon,links,canon.segments),/Registered ATI/);
 }
});

test('whole-discourse exports keep only the fifth section address, CC rights and metadata rather than publisher bodies',()=>{
 const index=buildIndex(),record=index.texts.find(r=>r.id==='sn27.5');assert.equal(record.english_count,1);assert.equal(record.partial_english_count,0);assert.equal(record.shared_english_count,0);
 const [choice]=record.english;assert.equal(choice.translation_id,id);assert.equal(choice.url,`https://accesstoinsight.org${row.path}.html#sn27.005`);assert.equal(choice.license,'CC-BY-NC');
 assert.deepEqual(choice.source_section,row.section);assert.equal(choice.whole_unit_coverage,true);assert.equal(choice.text,undefined);assert.equal(choice.translator_notes,undefined);assert.ok(toCsv(index).includes(id));
});

test('daily SN27.5 suggestion preserves exact section identity, mapping limits and detached metadata',()=>{
 const args={kind:'sutta',date:'2028-07-15'},first=dailyText(canon,args);assert.equal(first.text.id,'sn27.5');assert.equal(first.rotation.of,1288);
 const [choice]=first.english;assert.equal(choice.translation_id,id);assert.deepEqual(choice.source_section,row.section);assert.equal(choice.mapping_note,row.mapping_note);assert.equal(choice.whole_unit_coverage,true);assert.equal(choice.translation_scope,undefined);
 choice.source_section.anchor='Caller mutation';assert.equal(dailyText(canon,args).english[0].source_section.anchor,'sn27.005');assert.equal(row.section.anchor,'sn27.005');
});

test('actual SN27 fifth chapter retains only its exact body, zero notes and full original CC notice; drift refuses', {skip:!sourceRoot},()=>{
 const raw=html(),selected=extractAtiSection(raw,row);
 assert.equal(selected.text.length,614);assert.equal(selected.title,'SN 27.5: Vedana Sutta — Feeling');assert.deepEqual(selected.translator_notes,[]);
 assert.equal(sectionHash(selected.text),row.section.text_sha256);assert.equal(sectionHash(english.atiNotice(raw)),row.section.notice_sha256);
 assert.match(selected.text,/feeling born of contact at the eye/);assert.doesNotMatch(selected.text,/perception \(naming|with regard to contact at the eye is|earth property/);
 assert.match(english.atiNotice(raw).licensing,/©1994 Thanissaro Bhikkhu/);assert.match(english.atiNotice(raw).licensing,/Attribution-NonCommercial 4\.0 International/);
 for(const key of ['profile','anchor','section_html_sha256','text_sha256','notes_sha256']){const bad=copy(row);bad.section[key]='changed';assert.throws(()=>extractAtiSection(raw,bad),/reviewed ATI/);}
 for(const bad of [raw.replace('sn27.005','sn27.004'),raw.replace('<p>At Savatthi.', '<p><i>At Savatthi.</i>'),raw.replace('©1994','©2094'),raw+'changed'])assert.throws(()=>extractAtiSection(bad,row),/reviewed ATI/);
});

test('actual MCP ordinary SN27.5 retrieval preserves finite identity, full notice, continuation, cache separation and root wording', {skip:!sourceRoot},async()=>{
 const fetched=[];globalThis.fetch=async url=>{fetched.push(String(url));assert.equal(new URL(url).pathname,row.path+'.html');return new Response(html(),{status:200});};
 for(const version of [`ati:${row.path}`,`ati:${row.path}#sn27.004`,`ati:${row.path}#unknown`])await assert.rejects(english.translation(unit(),version),/not linked/);
 await assert.rejects(english.translation(unit(),id,{allow_shared:true}),/no longer has a declared shared/);await assert.rejects(english.translation(unit(),id,{allow_partial:true}),/no longer has a declared partial/);assert.equal(fetched.length,0);
 const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'sn27-section-check',version:'1'});await Promise.all([client.connect(a),createServer().connect(b)]);
 const call=async(name,args)=>{const result=await client.callTool({name,arguments:args});assert.ok(!result.isError,JSON.stringify(result));return JSON.parse(result.content[0].text);};
 try{
  const rootBefore=JSON.stringify(canon.segments(unit())),expected=extractAtiSection(html(),row),notice=english.atiNotice(html());let args={uid:'sn27.5',translation:id,limit:500},text='',pages=0;
  while(args){const page=await call('get_translation',args);pages++;assert.equal(page.text_id,'sn27.5');assert.equal(page.translation_id,id);assert.deepEqual(page.source_section,row.section);assert.deepEqual(page.translator_notes,[]);assert.equal(page.translation_scope,undefined);assert.equal(page.attribution,notice.citation);assert.equal(page.license,notice.licensing);assert.equal(page.offset,text.length);text+=page.text;args=page.continue_with?.arguments;if(args){assert.equal(args.translation,id);assert.equal(args.uid,'sn27.5');assert.equal(args.allow_partial,undefined);assert.equal(args.allow_shared,undefined);}assert.ok(pages<4);}
  assert.equal(pages,2);assert.equal(text,expected.text);assert.equal(fetched.length,1);assert.equal(JSON.stringify(canon.segments(unit())),rootBefore);
  await assert.rejects(english.translation(unit(),id,{offset:500,limit:500,prefix_sha256:'0'.repeat(64)}),/prefix changed/);
  const cached=await call('get_translation',{uid:'sn27.5',translation:id,limit:1000});assert.equal(cached.text,text);assert.equal(fetched.length,1);
  const article=await getAtiText({path:row.path,limit:30000});assert.notEqual(article.text,text);assert.equal(article.canon_text_id,undefined);assert.equal(article.source_section,undefined);assert.equal(fetched.length,2);
  assert.equal((await call('get_translation',{uid:'sn27.5',translation:id,limit:1000})).text,text);assert.equal(fetched.length,2);
 }finally{await client.close();}
});

test('cached SN27 section cannot survive a removed or altered finite declaration', {skip:!sourceRoot},async()=>{
 globalThis.fetch=async()=>new Response(html(),{status:200});const d=snapshot(),saved=d.sectionRegistry;
 await english.translation(unit(),id);
 try{d.sectionRegistry={...saved,links:saved.links.filter(r=>r.unit_id!=='sn27.5')};await assert.rejects(english.translation(unit(),id),/Registered ATI/);}finally{d.sectionRegistry=saved;}
});

test('same-translator outage fallback uses the finite SN section, never the whole anthology', {skip:!sourceRoot},async()=>{
 const d=snapshot(),saved=d.translations['sn27.5'],dt={source:'dhammatalks',url:'https://www.dhammatalks.org/suttas/SYNTHETIC/SN27.html',translator:'Ṭhānissaro Bhikkhu',reference:'Synthetic test-only alternative',match:'synthetic-test-only'};
 // No new alternative is shipped. This tests the existing permitted fallback
 // contract against a future legitimate alternative without making real calls.
 d.translations['sn27.5']=[dt,...saved];let changed=false;
 globalThis.fetch=async url=>{if(new URL(url).hostname==='www.dhammatalks.org')throw Error('Synthetic provider outage');return new Response(changed?html()+'changed':html(),{status:200});};
 try{
  const page=await english.translation(unit(),'dt:SYNTHETIC/SN27',{limit:1000});assert.equal(page.text.length,614);assert.equal(page.text,extractAtiSection(html(),row).text);assert.equal(page.translation_id,id);assert.equal(page.text_id,'sn27.5');assert.deepEqual(page.source_section,row.section);assert.deepEqual(page.translator_notes,[]);assert.equal(page.license,english.atiNotice(html()).licensing);assert.match(page.notes.join('\n'),/earlier version from Access to Insight/);assert.ok(page.notes.includes(row.mapping_note));
  liveCache.clear();changed=true;await assert.rejects(english.translation(unit(),'dt:SYNTHETIC/SN27'),/Could not retrieve|unreachable/);
 }finally{d.translations['sn27.5']=saved;}
});
