import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {atiPartialExcerpt} from '../src/ati-excerpt.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {liveCache} from '../src/cache.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {dailyText} from '../src/daily.mjs';
import {scopeDescriptor} from '../web/translation-policy.mjs';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const report=json('docs/data/dt-excerpts-and-potaliya.json'),manifest=json('scripts/canon/reviewed_partial_pages.json'),row=report.mn54.manifest;
const originalFetch=globalThis.fetch;let saved;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});
const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
const selected=('Synthetic dream fixture amber lantern copper window. '.repeat(20)).trim();
function fixture(){return `${begin}<div class="chapter">${Array.from({length:24},(_,i)=>`<p>${i===0?'...':i===13?selected:`Synthetic neighboring paragraph ${i+1}.`}</p>`).join('')}<div class="notes"><h1>Notes</h1><p>Excluded synthetic note.</p></div></div>${end}<div id="F_provenance">Synthetic source notice, not real rights.</div><div id="F_citation">Synthetic attribution.</div>`;}
function install(){const d=canon.load();saved||=d.translations;const link={...structuredClone(d.translations.mn54[0]),path:'/tipitaka/mn/synthetic-dream-fixture',url:'https://accesstoinsight.org/tipitaka/mn/synthetic-dream-fixture.html'};link.partial_scope.text_sha256=scopeHash(selected);link.partial_scope.notice_sha256=scopeHash(english.atiNotice(fixture()));d.translations={...d.translations,mn54:[link]};return {unit:canon.resolve('mn54').unit,link,id:canon.translationId(link)};}

test('three primary DT and one ATI whole bindings are held globally while complete Pali remains unchanged',async()=>{
 assert.equal(scopeHash(canon.load().canon),'1ba8593937abe0284f87e3d8b2a4abd1d732fcc1d6117c36d5a671e968b4d73c');
 assert.equal(report.rows.length,4);assert.equal(report.rows.filter(r=>r.source==='dhammatalks').length,3);
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No held fetch');};
 const key=x=>{const u=new URL(x);return u.hostname.replace(/^www\./,'')+u.pathname;};
 for(const r of report.rows){
  assert.equal(r.decision,'hold-whole-binding-partial-unit');
  for(const links of Object.values(canon.load().translations))assert.ok(!links.some(l=>key(l.url)===key(r.url)));
  for(const root of r.root_units){const u=canon.resolve(root.id).unit;assert.equal(scopeHash(canon.load().canon.books[u.book].blocks.slice(u.start,u.end)),root.root_blocks_sha256);}
  const unit=canon.resolve(r.owner).unit;assert.equal(canon.describe(unit).english_available,0);assert.ok(canon.segments(unit).length);
  for(const flags of [{},{allow_partial:true},{allow_shared:true},{allow_partial:true,allow_shared:true}])await assert.rejects(english.translation(unit,r.translation_id,flags),/not linked|not available|No English/);
  if(r.source==='dhammatalks')for(const k of ['source_html_sha256','text_sha256','notice_sha256'])assert.equal(r[k],undefined,'Rendered evidence must not fabricate '+k);
 }
 assert.equal(calls,0);
});

test('MN54 restores only one pinned partial dream paragraph, preserves fourteen prior descriptors and retires only its ATI hold',()=>{
 assert.equal(manifest.links.length,15);assert.deepEqual(manifest.links.find(r=>r.unit_id==='mn54'),row);
 assert.equal(scopeHash({...manifest,links:manifest.links.filter(r=>r.unit_id!=='mn54')}),'1386fcdcffbe94a4179c2ed04ecbb5f064ee2598d4f086872865aca74a3ad89e','Previous14 source declarations and manifest provenance are unchanged');
 assert.equal(report.mn54.previous_partial_descriptors.length,14);
 for(const old of report.mn54.previous_partial_descriptors)assert.equal(scopeHash(manifest.links.find(r=>r.unit_id===old.unit_id)),old.descriptor_sha256,old.unit_id);
 const u=canon.resolve('mn54').unit,meta=canon.describe(u),s=meta.english[0].translation_scope;
 assert.deepEqual([meta.english_available,meta.partial_english_available,meta.english.length],[0,1,1]);
 assert.deepEqual([s.version,s.first_ref,s.last_ref,s.pali_segments,s.extractor,s.whole_unit_coverage],[1,'mn54/29','mn54/29',1,'ati-chapter-p14-of24-v1',false]);
 assert.equal(scopeDescriptor(meta.english[0],u.id).flags.allow_partial,true);
 const seg=canon.segments(u).find(s=>s.ref==='mn54/29');assert.ok(seg.text.includes('…pe…'));
 assert.equal(scopeHash([{ref:seg.ref,type:seg.type,text:seg.text}]),row.partial_scope.pali_sha256);
 assert.equal(row.source_html_sha256,'edcde57d7f7920743608b1abb25b3ded7c4d33519bfea85986a9b776cd349e8a');
 assert.equal(row.partial_scope.text_sha256,'97f15d626ea59743f3fac2e56c85a34cfb59084157e5eed22ab14503140986f1');
 assert.equal(row.partial_scope.notice_sha256,'de93b79f4590c638218614b4c32bdce786225ce7a17a3f214cc78f6dc6e7dea0');
 assert.equal(scopeHash(canon.load().canon.books[u.book].blocks.slice(u.start,u.end)),row.root.root_blocks_sha256);
 assert.match(row.mapping_note,/…pe…/);assert.match(row.mapping_note,/no Pāli is expanded/);assert.match(row.mapping_note,/©2003/);
 const exclusions=json('scripts/canon/reviewed_exclusions.json').exclusions;
 assert.equal(exclusions.length,41);
 const newUrls=new Set(report.rows.map(r=>r.url));
 assert.equal(scopeHash(exclusions.filter(r=>!newUrls.has(r.url))),'26914ab6a797fd449213217d1f57ed8a2adf497bc2b9d7fdbd8cf6a44a9582f1','All37 previous holds other than exactly ATI54 remain unchanged');
 assert.ok(!exclusions.some(r=>r.url===report.retired_exclusion.url));
 assert.ok(exclusions.some(r=>r.url==='https://www.dhammatalks.org/suttas/MN/MN54.html'));
 const t=translationCoverage({refresh:true}).total;
 assert.deepEqual([t.links,t.with_english,t.with_english_including_inherited,t.partial_links,t.partial_only,t.shared_links,t.with_shared_english,t.shared_only],[2538,1408,1831,15,9,12,110,52]);
 const d=dailyText({...canon},{date:'2026-11-01',kind:'sutta'});assert.deepEqual([d.rotation.of,d.text.id],[1257,'sn12.31']);
});

test('finite P14 selector rejects structural changes and excludes all neighbors, leading ellipsis and notes',()=>{
 const html=fixture();assert.equal(atiPartialExcerpt(html,'ati-chapter-p14-of24-v1'),selected);
 for(const html2 of [html.replace('<p>...</p>',''),html.replace('<p>...</p>','<p>...</p><p>Extra.</p>'),html.replace('<div class="chapter">','<div class="chapter"><h4>Changed heading</h4>'),html.replace('<div class="chapter">','<div class="chapter"></div><div class="chapter">'),html.replace('<div class="notes">','<div class="notes"></div><div class="notes">'),html.replace('class="notes"','class="unknown"'),html.replace(selected,'<div>Nested</div>'+selected),html.replace(selected,'<script>bad</script>'+selected),html.replace(selected,'<p>Nested</p>'+selected),html+html])assert.throws(()=>atiPartialExcerpt(html2,'ati-chapter-p14-of24-v1'),/structure changed/);
});

test('synthetic P14 retrieval proves exact consent, notices, prefix/scope continuation pins and absence of fallback',async()=>{
 const {unit,link,id}=install();let calls=0;globalThis.fetch=async()=>{calls++;return new Response(fixture());};
 await assert.rejects(english.translation(unit),/Only partial/);await assert.rejects(english.translation(unit,id),/partial/);assert.equal(calls,0);
 const first=await english.translation(unit,id,{allow_partial:true,limit:80});
 assert.equal(first.text,selected.slice(0,80));assert.equal(first.whole_unit_coverage,false);
 assert.equal(first.license,english.atiNotice(fixture()).licensing);assert.equal(first.attribution,english.atiNotice(fixture()).citation);
 const args=first.continue_with.arguments,next=await english.translation(unit,id,args);assert.equal(next.text,selected.slice(80,160));assert.equal(calls,1);
 for(const pin of ['prefix_sha256','scope_sha256'])await assert.rejects(english.translation(unit,id,{...args,[pin]:undefined}),/requires unchanged scope/);
 await assert.rejects(english.translation(unit,id,{...args,prefix_sha256:'0'.repeat(64)}),/changed|prefix/);
 link.partial_scope={...link.partial_scope,last_ref:'mn54/30'};await assert.rejects(english.translation(unit,id,args),/changed|Invalid/);
});

test('new selector checks source/notice drift before initial or continued wording and never fetches another provider',async()=>{
 const {unit,id}=install();let requests=[];globalThis.fetch=async url=>{requests.push(String(url));return new Response(fixture());};
 const first=await english.translation(unit,id,{allow_partial:true,limit:80});
 for(const [html,pattern] of [[fixture().replace('Synthetic source notice','Changed source notice'),/notice changed/],[fixture().replace(selected,selected+' Changed.'),/text changed/],[fixture().replace('<p>...</p>',''),/structure changed/]]){
  for(const options of [{allow_partial:true},first.continue_with.arguments]){
   liveCache.clear();requests=[];globalThis.fetch=async url=>{requests.push(String(url));return new Response(html);};
   await assert.rejects(english.translation(unit,id,options),pattern);
   assert.deepEqual(requests,['https://accesstoinsight.org/tipitaka/mn/synthetic-dream-fixture.html']);
  }
 }
});

const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
test('Python MN54 profile rejects wrong subject, path, version, extractor and swapped translator/licence families', {skip:!python},()=>{
 const r=spawnSync(python,['-c',`
import json,sys,tempfile,copy
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
 mutations=[lambda r:r.update(unit_id='mn55'),lambda r:r.update(path='/tipitaka/mn/mn.055.than'),lambda r:r.update(license='BPS-free-distribution-1985'),lambda r:r.update(translator="Maurice O'Connell Walshe"),lambda r:r.update(license='BPS-free-distribution-1985',translator="Maurice O'Connell Walshe"),lambda r:r['partial_scope'].update(version=2),lambda r:r['partial_scope'].update(extractor='ati-chapter-p1-of4-v1'),lambda r:r.update(license='Olendzki-free-distribution-2005',translator='Andrew Olendzki')]
 for mutate in mutations:
  bad=copy.deepcopy(m);mutate(next(r for r in bad['links'] if r['unit_id']=='mn54'))
  try:check(bad)
  except ValueError:pass
  else:raise AssertionError('Wrong source-specific profile accepted')
 # A known finite page must not escape into the generic Olendzki family by
 # changing every related field together.
 bad=copy.deepcopy(m);r=next(r for r in bad['links'] if r['unit_id']=='mn54')
 r.update(license='Olendzki-free-distribution-2005',translator='Andrew Olendzki');r['partial_scope']['extractor']='ati-freeverse-v1'
 try:check(bad)
 except ValueError:pass
 else:raise AssertionError('Known MN54 page downgraded into generic extractor family')
 r.update(unit_id='mn55');r['root']['id']='mn55';r['partial_scope'].update(unit_id='mn55',first_ref='mn55/2',last_ref='mn55/2')
 try:check(bad)
 except ValueError:pass
 else:raise AssertionError('Known MN54 path rebound to wrong owner through generic family')
 print('10 wrong MN54 profiles rejected')
`],{input:JSON.stringify(manifest),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/10 wrong MN54 profiles rejected/);
});
