import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {partialScope,scopeHash} from '../src/translation-scope.mjs';
import {atiPartialExcerpt} from '../src/ati-excerpt.mjs';
import {liveCache} from '../src/cache.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {dailyText} from '../src/daily.mjs';
import {scopeDescriptor} from '../web/translation-policy.mjs';

const json=p=>JSON.parse(readFileSync(p,'utf8'));
const manifest=json('scripts/canon/reviewed_partial_pages.json');
const extractor='ati-chapter-p1to4-of5-notes-v1';
const row=manifest.links.find(r=>r.unit_id==='sn36.15');
const originalFetch=globalThis.fetch;let saved;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});
const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
const paragraphs=Array.from({length:4},(_,i)=>(`Synthetic prefix paragraph ${i+1} amber lantern copper window. `.repeat(7)).trim());
const selected=paragraphs.join('\n\n');
const fixture=()=>`${begin}<div class="chapter">${paragraphs.map(p=>`<p>${p}</p>`).join('')}<p>Excluded synthetic fifth paragraph.<a class="noteTag">[1]</a> More excluded wording.<a class="noteTag">[2]</a></p><div class="notes"><h1>Notes</h1><dl><dt>1.</dt><dd>Excluded synthetic note one.</dd><dt>2.</dt><dd>Excluded synthetic note two.</dd></dl></div></div></div>${end}<div id="F_provenance">Synthetic complete notice only: free distribution, no more than 50 printed copies, identify derivatives and retain all terms. This is not an actual publisher grant.</div><div id="F_citation">Synthetic complete attribution only.</div>`;

function synthetic({heading=false,text='Synthetic chosen prefix. Synthetic excluded tail.',start=0,endChar=text.indexOf(' Synthetic excluded')}={}){
  const unit={id:'sn36.999',collection:'sn',acronym:'Synthetic SN fixture'},ref=unit.id+(heading?'/2':'/1');
  const seg={ref,type:'prose',text},segments=[...(heading?[{ref:unit.id+'/1',type:'heading',text:'Synthetic heading'}]:[]),seg];
  const link={source:'ati',path:'/tipitaka/sn/sn36/synthetic-prefix-unit',url:'https://accesstoinsight.org/tipitaka/sn/sn36/synthetic-prefix-unit.html',translator:'Synthetic fixture only',partial_scope:{version:2,status:'reviewed',unit_id:unit.id,first_ref:ref,last_ref:ref,source_commit:canon.source().commit,pali_sha256:scopeHash([{...seg,text:text.slice(start,endChar)}]),text_sha256:scopeHash(selected),notice_sha256:scopeHash(english.atiNotice(fixture())),extractor,subparagraph:{start_char:start,end_char:endChar,offset_unit:'utf16_code_units',segment_sha256:scopeHash(seg)}}};
  return {unit,segments,seg,link};
}
function inspect(f){return partialScope(f.link,f.unit,f.segments,canon.source());}
function install(){
  const d=canon.load();saved||=d.translations;
  const link={...structuredClone(d.translations['sn36.15'][0]),path:'/tipitaka/sn/sn36/synthetic-prefix-retrieval',url:'https://accesstoinsight.org/tipitaka/sn/sn36/synthetic-prefix-retrieval.html'};
  link.partial_scope.text_sha256=scopeHash(selected);link.partial_scope.notice_sha256=scopeHash(english.atiNotice(fixture()));
  d.translations={...d.translations,'sn36.15':[link]};return {unit:canon.resolve('sn36.15').unit,link,id:canon.translationId(link)};
}

test('SN36.15 prefix preserves full root/context/notice pins and the previous sixteen source declarations',()=>{
  assert.ok(row,'The reviewed SN36.15 prefix is explicitly registered');
  assert.equal(manifest.links.length,18);
  const previous={...manifest,links:manifest.links.filter(r=>!['an8.59','sn36.15'].includes(r.unit_id))};
  assert.equal(previous.links.length,16);
  assert.equal(scopeHash(previous),'0026bf4c52b68dd0e5f4e749902d9530ccc4c8fd5579c848e2263b65c584d006');
  assert.deepEqual(json('server/data/reviewed-partial-pages.json'),manifest);
  const unit=canon.resolve('sn36.15').unit,segments=canon.segments(unit),context=segments[1],meta=canon.describe(unit),choice=meta.english.find(l=>l.translation_id==='ati:'+row.path),scope=choice.translation_scope;
  assert.deepEqual([segments.length,context.text.length,meta.english_available,meta.partial_english_available],[2,1940,0,1]);
  assert.deepEqual([scope.version,scope.first_ref,scope.last_ref,scope.extractor,scope.whole_unit_coverage],[2,'sn36.15/2','sn36.15/2',extractor,false]);
  assert.deepEqual([scope.pali_excerpt.start_char,scope.pali_excerpt.end_char,scope.pali_excerpt.text.length],[0,794,794]);
  assert.equal(scope.pali_excerpt.text,context.text.slice(0,794));assert.ok(scope.pali_excerpt.text.includes('…pe…'));
  assert.ok(!scope.pali_excerpt.text.includes('anupubbasaṅkhārānaṃ'));
  assert.equal(scopeHash({ref:context.ref,type:context.type,text:context.text}),'39f3172013f8571b82c6c89edd7d55780eeaeb480d477917b8174c25c83a88c2');
  assert.equal(scope.pali_sha256,'5a4376f9ef8b063db4161a0619b9dcc5090e2721ec8448b9e51c55b4cae88530');
  assert.equal(scopeHash([{ref:context.ref,type:context.type,text:context.text.slice(0,794)}]),scope.pali_sha256);
  assert.equal(row.source_html_sha256,'300433ba256941343ae0891202c139dd57c3456b881476fe48a2e6c879933438');
  assert.equal(scope.text_sha256,'176cc221edb6bed91497483d6990e8120583062822f74754176b4545af7ba9fa');
  assert.equal(scope.notice_sha256,'b58cc58a86a64f10454468d11fa9fc3391ad43fac20e9728f6ec18903d0ad4ac');
  assert.equal(scopeHash(canon.load().canon.books[unit.book].blocks.slice(unit.start,unit.end)),'2fdc1b9ac79dfe7f89becfa83822551cfd41aadb37ef7ee2b135e8aecc5ada55');
  assert.equal(row.license,'BPS-free-distribution-1983');assert.equal(row.translator,'Nyanaponika Thera');
  assert.match(row.mapping_note,/©1983/);assert.match(row.mapping_note,/50 copies/);assert.match(row.mapping_note,/complete licence/);assert.match(row.mapping_note,/1998.*1983/s);
  assert.equal(scope.read_with,undefined);assert.equal(scope.read_pages,undefined);assert.equal(scopeDescriptor(choice,unit.id).flags.allow_partial,true);
  const totals=translationCoverage({refresh:true}).total;
  assert.deepEqual([totals.links,totals.with_english,totals.with_english_including_inherited,totals.partial_links,totals.partial_only],[2538,1408,1831,18,12]);
  const daily=dailyText({...canon},{date:'2026-11-01',kind:'sutta'});assert.deepEqual([daily.rotation.of,daily.text.id],[1257,'sn12.31']);
});

test('validated proper version2 substrings work in sole-prose units with and without a heading while whole scopes remain invalid',()=>{
  for(const heading of [false,true]){
    const f=synthetic({heading}),scope=inspect(f);
    assert.equal(scope.pali_excerpt.text,f.seg.text.slice(0,f.link.partial_scope.subparagraph.end_char));
    assert.equal(scope.whole_unit_coverage,false);assert.equal(scope.read_with,undefined);
    const wholeV1=structuredClone(f);wholeV1.link.partial_scope.version=1;wholeV1.link.partial_scope.extractor='ati-chapter-p2-of2-v1';delete wholeV1.link.partial_scope.subparagraph;
    wholeV1.link.partial_scope.pali_sha256=scopeHash([f.seg]);assert.throws(()=>inspect(wholeV1),/Invalid or unreviewed/);
    const fullV2=synthetic({heading,endChar:f.seg.text.length});assert.throws(()=>inspect(fullV2),/Invalid or unreviewed/);
    for(const mutate of [p=>{delete p.subparagraph;},p=>{p.subparagraph.segment_sha256='0'.repeat(64);},p=>{p.pali_sha256='0'.repeat(64);},p=>{p.subparagraph.start_char=-1;},p=>{p.subparagraph.end_char=9999;},p=>{p.subparagraph.start_char=0.5;},p=>{p.subparagraph.offset_unit='bytes';}]){
      const bad=structuredClone(f);mutate(bad.link.partial_scope);assert.throws(()=>inspect(bad),/Invalid or unreviewed/);
    }
    const wrongType=structuredClone(f);wrongType.segments.at(-1).type='verse';
    wrongType.link.partial_scope.subparagraph.segment_sha256=scopeHash(wrongType.segments.at(-1));
    wrongType.link.partial_scope.pali_sha256=scopeHash([{...wrongType.segments.at(-1),text:wrongType.seg.text.slice(0,wrongType.link.partial_scope.subparagraph.end_char)}]);
    assert.throws(()=>inspect(wrongType),/Invalid or unreviewed/);
  }
  for(const f of [synthetic({text:'Synthetic selected prefix.   ',endChar:26}),synthetic({text:'   Synthetic excluded tail.',endChar:3})])assert.throws(()=>inspect(f),/Invalid or unreviewed/);
  const text='Synthetic😀tail',at='Synthetic'.length,valid=synthetic({text,start:at,endChar:at+2});assert.equal(inspect(valid).pali_excerpt.text,'😀');
  for(const [start,endChar] of [[at+1,at+2],[at,at+1]])assert.throws(()=>inspect(synthetic({text,start,endChar})),/Invalid or unreviewed/);
});

test('finite five-paragraph prefix selector excludes P5 and both notes and refuses source structure drift',()=>{
  const html=fixture();assert.equal(atiPartialExcerpt(html,extractor),selected);
  assert.ok(!selected.includes('Excluded'));
  const changes=[html.replace(`<p>${paragraphs[0]}</p>`,''),html.replace('<p>','<p>Extra synthetic paragraph.</p><p>'),html.replace('<div class="chapter">','<div class="chapter"><h4>Unexpected heading</h4>'),html.replace('<div class="chapter">','<div class="chapter"></div><div class="chapter">'),html.replace('<div class="notes">','<div class="notes"></div><div class="notes">'),html.replace('class="notes"','class="unknown"'),html.replace(paragraphs[0],'<div>Nested source block.</div>'),html.replace(paragraphs[0],'<p>Nested paragraph.</p>'),html.replace(paragraphs[0],'<script>unsafe</script>'),html.replace(paragraphs[0],'<style>unsafe{}</style>'),html.replace(paragraphs[0],'<pre>Unexpected pre.</pre>'),html.replace(begin,begin+'Outside synthetic material.'),html.replace(end,'Outside synthetic material.'+end),html+html];
  for(const [i,changed] of changes.entries())assert.throws(()=>atiPartialExcerpt(changed,extractor),/structure changed/,'structure mutation '+i);
});

test('real SN36.15 partial rejects defaults, shared consent and translator-only requests before any fetch',async()=>{
  assert.ok(row);let requests=0;globalThis.fetch=async()=>{requests++;throw Error('No implicit source request');};
  const unit=canon.resolve('sn36.15').unit,id='ati:'+row.path;
  for(const [which,flags] of [[undefined,{}],[id,{}],[id,{allow_shared:true}],[row.translator,{allow_partial:true}]])await assert.rejects(english.translation(unit,which,flags),/partial|shared-page scope|not linked/i);
  assert.equal(requests,0);
});

test('synthetic prefix retrieval returns full notice and citation with exact source/prefix/scope continuation pins',async()=>{
  const {unit,link,id}=install();let requests=0;globalThis.fetch=async()=>{requests++;return new Response(fixture());};
  const first=await english.translation(unit,id,{allow_partial:true,limit:80});assert.equal(first.text,selected.slice(0,80));assert.equal(first.whole_unit_coverage,false);
  assert.equal(first.license,english.atiNotice(fixture()).licensing);assert.match(first.license,/no more than 50/);assert.equal(first.attribution,english.atiNotice(fixture()).citation);
  const args=first.continue_with.arguments,next=await english.translation(unit,id,args);assert.equal(next.text,selected.slice(80,160));assert.equal(next.license,first.license);assert.equal(next.attribution,first.attribution);assert.equal(requests,1);
  for(const pin of ['prefix_sha256','scope_sha256'])await assert.rejects(english.translation(unit,id,{...args,[pin]:undefined}),/requires unchanged scope/);
  await assert.rejects(english.translation(unit,id,{...args,prefix_sha256:'0'.repeat(64)}),/prefix|changed/);
  await assert.rejects(english.translation(unit,id,{...args,scope_sha256:'0'.repeat(64)}),/mapping changed/);
  link.partial_scope.subparagraph.end_char++;await assert.rejects(english.translation(unit,id,args),/Invalid|changed/);
});

test('synthetic text, complete-notice and structure drift refuse initial and continued prefix output without fallback',async()=>{
  const {unit,id}=install();globalThis.fetch=async()=>new Response(fixture());const first=await english.translation(unit,id,{allow_partial:true,limit:80});
  for(const [html,pattern] of [[fixture().replace(paragraphs[0],paragraphs[0]+' Changed.'),/text changed/],[fixture().replace('Synthetic complete notice','Changed complete notice'),/notice changed/],[fixture().replace(`<p>${paragraphs[0]}</p>`,''),/structure changed/]])for(const options of [{allow_partial:true},first.continue_with.arguments]){
    liveCache.clear();const requests=[];globalThis.fetch=async url=>{requests.push(String(url));return new Response(html);};
    await assert.rejects(english.translation(unit,id,options),pattern);assert.deepEqual(requests,['https://accesstoinsight.org/tipitaka/sn/sn36/synthetic-prefix-retrieval.html']);
  }
});

test('Python reserved Nyanaponika profile rejects wrong copyright families, translators, owners, paths and generic downgrades',()=>{
  const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);assert.ok(python,'Python is required for the source-profile validator');
  const result=spawnSync(python,['-c',`
import copy,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'scripts/canon')
from reviewed_partial_pages import manifest_rows
sys.stdin.reconfigure(encoding='utf-8')
m=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'manifest.json'
 def check(x):
  p.write_text(json.dumps(x,ensure_ascii=False),encoding='utf-8');return manifest_rows(p)
 assert check(m)==m
 changes=[lambda r:r.update(license='BPS-free-distribution-1985'),lambda r:r.update(license='CC-BY-NC'),lambda r:r.update(translator="Maurice O'Connell Walshe"),lambda r:r.update(unit_id='sn36.14'),lambda r:r.update(path='/tipitaka/sn/sn36/sn36.014.nypo'),lambda r:r['partial_scope'].update(version=1),lambda r:r['partial_scope'].update(extractor='ati-chapter-prose-v1'),lambda r:r.update(license='BPS-free-distribution-1985',translator="Maurice O'Connell Walshe")]
 for change in changes:
  bad=copy.deepcopy(m);change(next(r for r in bad['links'] if r['unit_id']=='sn36.15'))
  try:check(bad)
  except ValueError:pass
  else:raise AssertionError('Malformed exact Nyanaponika profile accepted')
 for owner in ['sn36.15','mn55']:
  bad=copy.deepcopy(m);r=next(r for r in bad['links'] if r['unit_id']=='sn36.15');r.update(unit_id=owner,translator='Andrew Olendzki',license='Olendzki-free-distribution-2005');r['root']['id']=owner;r['partial_scope'].update(unit_id=owner,version=1,extractor='ati-freeverse-v1',first_ref=owner+'/2',last_ref=owner+'/2');r['partial_scope'].pop('subparagraph')
  try:check(bad)
  except ValueError:pass
  else:raise AssertionError('Reserved path escaped through generic profile')
 print('10 malformed Nyanaponika profiles refused')
`],{input:JSON.stringify(manifest),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);assert.match(result.stdout,/10 malformed Nyanaponika profiles refused/);
});
