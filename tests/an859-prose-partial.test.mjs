import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {atiPartialExcerpt} from '../src/ati-excerpt.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {liveCache} from '../src/cache.mjs';
import {scopeDescriptor} from '../web/translation-policy.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {dailyText} from '../src/daily.mjs';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const manifest=json('scripts/canon/reviewed_partial_pages.json'),row=manifest.links.find(r=>r.unit_id==='an8.59');
const extractor='ati-chapter-p1to3-of4-ellipsis-v1',originalFetch=globalThis.fetch;let saved;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});
const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
const parts=[1,2,3].map(i=>`Synthetic paragraph ${i} only: amber lantern copper window. `.repeat(7).trim());
const fixture=()=>`${begin}<div class="chapter">${parts.map(p=>`<p>${p}</p>`).join('')}<p>...</p></div></div>${end}<div id="F_provenance">Synthetic fixture licence only; not actual publisher rights.</div><div id="F_citation">Synthetic fixture attribution.</div>`;
const selected=parts.join('\n\n');
function install(){const d=canon.load();saved||=d.translations;const link={...structuredClone(d.translations['an8.59'][0]),path:'/tipitaka/an/an08/synthetic-eight-fixture',url:'https://accesstoinsight.org/tipitaka/an/an08/synthetic-eight-fixture.html'};link.partial_scope.text_sha256=scopeHash(selected);link.partial_scope.notice_sha256=scopeHash(english.atiNotice(fixture()));d.translations={...d.translations,'an8.59':[link]};return{unit:canon.resolve('an8.59').unit,link,id:canon.translationId(link)};}

test('AN8.59 preserves exact original prose, omitted stanzas and its own rights with no changes to sixteen older declarations',()=>{
 assert.ok(row,'Reviewed source activation must exist');assert.equal(manifest.links.length,18);
 assert.equal(scopeHash({...manifest,links:manifest.links.filter(r=>!['an8.59','sn36.15'].includes(r.unit_id))}),'0026bf4c52b68dd0e5f4e749902d9530ccc4c8fd5579c848e2263b65c584d006');
 assert.deepEqual(json('server/data/reviewed-partial-pages.json'),manifest);
 assert.equal(scopeHash(canon.load().canon),'1ba8593937abe0284f87e3d8b2a4abd1d732fcc1d6117c36d5a671e968b4d73c');
 const unit=canon.resolve('an8.59').unit,segs=canon.segments(unit),meta=canon.describe(unit),choice=meta.english[0],scope=choice.translation_scope;
 assert.deepEqual([meta.english_available,meta.partial_english_available,meta.english.length],[0,1,1]);
 assert.deepEqual([scope.version,scope.first_ref,scope.last_ref,scope.pali_segments,scope.extractor,scope.whole_unit_coverage],[1,'an8.59/2','an8.59/2',1,extractor,false]);
 assert.equal(segs[1].text.length,385);assert.ok(segs[1].text.includes('…pe…'));assert.deepEqual(segs.slice(2).map(s=>s.type),['verse','verse']);
 assert.equal(scope.pali_excerpt,undefined);assert.deepEqual(scope.read_with,{tool:'get_text',uid:'an8.59',offset:1,limit:1});
 assert.equal(row.license,'Kumara-free-distribution-2010');assert.equal(row.translator,'Kumara Bhikkhu');
 assert.equal(row.source_html_sha256,'1f4d40c00f3077695f7cddeaa5d4011e8fdadac3ef05e4bcf4f040c444801c53');
 assert.equal(scope.text_sha256,'83ed330bbffd61cc88ef8dfc68955adb56438d693e7021e0c099bd1dee7d000b');
 assert.equal(scope.notice_sha256,'0955a1bdc92e7af801df3ba8f471ff4f59c41ad575f63b515ae6a176124b45c5');
 assert.equal(scope.pali_sha256,'5c7dd9ab1438bbf37bf86689a1dec9454ef6d3be8613cc6862b8df3947e21873');
 assert.equal(scopeHash(canon.load().canon.books[unit.book].blocks.slice(unit.start,unit.end)),'12e423bc7720d85776e75648d9d6cb9080e591a6505fa5ee119d7d96ce574871');
 assert.equal(scopeDescriptor(choice,unit.id).flags.allow_partial,true);
 const bad=structuredClone(choice);bad.translation_scope.version=2;
 assert.throws(()=>scopeDescriptor(bad,unit.id),/unsupported|incomplete/);
 const t=translationCoverage({refresh:true}).total;assert.deepEqual([t.links,t.with_english,t.with_english_including_inherited,t.partial_links,t.partial_only,t.shared_links,t.with_shared_english,t.shared_only],[2538,1408,1831,18,12,12,110,52]);
 const d=dailyText({...canon},{date:'2026-11-01',kind:'sutta'});assert.deepEqual([d.rotation.of,d.text.id],[1257,'sn12.31']);
});

test('AN8.59 remains explicit partial-only access; default, shared and translator requests never fetch',async()=>{
 const unit=canon.resolve('an8.59').unit,id='ati:'+row.path;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No implicit provider request');};
 for(const[which,flags]of[[undefined,{}],[id,{}],[id,{allow_shared:true}],[row.translator,{allow_partial:true}]])await assert.rejects(english.translation(unit,which,flags),/partial|shared-page scope|not available/i);
 assert.equal(calls,0);
});

test('three-of-four selector preserves paragraph separation and rejects missing ellipsis, notes, extra content and malformed containers',()=>{
 const html=fixture();assert.equal(atiPartialExcerpt(html,extractor),selected);
 const variants=[html.replace('<p>...</p>',''),html.replace('<p>...</p>','<p>Changed ending.</p>'),html.replace('<p>...</p>','<p>...</p><p>Extra.</p>'),html.replace('<div class="chapter">','<div class="chapter"><h4>Heading</h4>'),html.replace('<div class="chapter">','<div class="chapter"><div class="notes">Notes</div>'),html.replace('<div class="chapter">','<div class="chapter"><div class="freeverse">Verse</div>'),html.replace('<div class="chapter">','<div class="chapter"></div><div class="chapter">'),html.replace(parts[0],'<div>Nested</div>'+parts[0]),html.replace(parts[1],'<script>bad</script>'+parts[1]),html.replace(parts[2],'<p>Nested</p>'+parts[2]),html.replace(begin,begin+'Outside'),html.replace(end,'Outside'+end),html.replace('</div></div>'+end,'</div>'+end),html.replace('</div></div>'+end,'</div></div></div>'+end),html+html];
 for(const[i,changed]of variants.entries())assert.throws(()=>atiPartialExcerpt(changed,extractor),/structure changed/,'structure mutation '+i);
});

test('synthetic Kumara-profile retrieval keeps full notices, exact consent and guarded continuation without publisher body or ellipsis',async()=>{
 const {unit,id}=install();let calls=0;globalThis.fetch=async()=>{calls++;return new Response(fixture());};
 await assert.rejects(english.translation(unit,id),/partial/);assert.equal(calls,0);
 const first=await english.translation(unit,id,{allow_partial:true,limit:80});assert.equal(first.text,selected.slice(0,80));assert.equal(first.whole_unit_coverage,false);
 assert.equal(first.license,english.atiNotice(fixture()).licensing);assert.equal(first.attribution,english.atiNotice(fixture()).citation);
 const args=first.continue_with.arguments;assert.equal((await english.translation(unit,id,args)).text,selected.slice(80,160));assert.equal(calls,1);
 for(const pin of ['prefix_sha256','scope_sha256'])await assert.rejects(english.translation(unit,id,{...args,[pin]:undefined}),/requires unchanged scope/);
 await assert.rejects(english.translation(unit,id,{...args,prefix_sha256:'0'.repeat(64)}),/prefix|changed/);
});

test('selected wording, full notice and source structure drift fail before initial and continued output without fallback',async()=>{
 const {unit,id}=install();globalThis.fetch=async()=>new Response(fixture());const first=await english.translation(unit,id,{allow_partial:true,limit:80});
 for(const[html,pattern]of[[fixture().replace('Synthetic fixture licence','Changed licence'),/notice changed/],[fixture().replace(parts[0],parts[0]+' Changed.'),/text changed/],[fixture().replace('<p>...</p>','<p>Changed ending.</p>'),/structure changed/]])for(const options of[{allow_partial:true},first.continue_with.arguments]){
  liveCache.clear();const calls=[];globalThis.fetch=async url=>{calls.push(String(url));return new Response(html);};await assert.rejects(english.translation(unit,id,options),pattern);assert.deepEqual(calls,['https://accesstoinsight.org/tipitaka/an/an08/synthetic-eight-fixture.html']);
 }
});

const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
test('Kumara reserved source family rejects wrong owner/path, CC or BPS inference, translator swaps and generic-family downgrade',{skip:!python},()=>{
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
 changes=[lambda r:r.update(unit_id='an8.60'),lambda r:r.update(path='/tipitaka/an/an08/an08.060.kuma'),lambda r:r.update(translator='Thanissaro Bhikkhu'),lambda r:r.update(license='CC-BY-NC'),lambda r:r.update(license='BPS-free-distribution-1985'),lambda r:r['partial_scope'].update(version=2),lambda r:r['partial_scope'].update(extractor='ati-freeverse-v1'),lambda r:r.update(license='Olendzki-free-distribution-2005',translator='Andrew Olendzki')]
 for change in changes:
  bad=copy.deepcopy(m);change(next(r for r in bad['links'] if r['unit_id']=='an8.59'))
  try:check(bad)
  except ValueError:pass
  else:raise AssertionError('Invalid Kumara exact source profile accepted')
 bad=copy.deepcopy(m);r=next(r for r in bad['links'] if r['unit_id']=='an8.59');r.update(license='Olendzki-free-distribution-2005',translator='Andrew Olendzki');r['partial_scope'].update(extractor='ati-freeverse-v1')
 for owner in ['an8.59','mn55']:
  r['unit_id']=owner;r['root']['id']=owner;r['partial_scope'].update(unit_id=owner,first_ref=owner+'/2',last_ref=owner+'/2')
  try:check(bad)
  except ValueError:pass
  else:raise AssertionError('Reserved Kumara path escaped into generic family')
 print('10 malformed Kumara source profiles rejected')
`],{input:JSON.stringify(manifest),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/10 malformed Kumara source profiles rejected/);
});
