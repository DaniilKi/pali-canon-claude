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
const manifest=json('scripts/canon/reviewed_partial_pages.json'),row=manifest.links.find(r=>r.unit_id==='an2.47');
const extractor='ati-chapter-p5-of5-no-notes-v1',originalFetch=globalThis.fetch;let saved;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});
const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
const selected=('Synthetic cross-questioning fixture only amber lantern. '.repeat(22)).trim();
const fixture=()=>`${begin}<div class="chapter">${Array.from({length:5},(_,i)=>`<p>${i===4?selected:`Excluded synthetic paragraph ${i+1}.`}</p>`).join('')}</div></div>${end}<div id="F_provenance">Synthetic notice; not actual publisher rights.</div><div id="F_citation">Synthetic source only.</div>`;
function install(){const d=canon.load();saved||=d.translations;const link={...structuredClone(d.translations['an2.47'][0]),path:'/tipitaka/an/an02/synthetic-questioning-fixture',url:'https://accesstoinsight.org/tipitaka/an/an02/synthetic-questioning-fixture.html'};link.partial_scope.text_sha256=scopeHash(selected);link.partial_scope.notice_sha256=scopeHash(english.atiNotice(fixture()));d.translations={...d.translations,'an2.47':[link]};return{unit:canon.resolve('an2.47').unit,link,id:canon.translationId(link)};}

test('AN2.47 partial pins exact original substring and preserves fifteen prior sources and whole-unit eligibility',()=>{
 assert.equal(scopeHash(canon.load().canon),'1ba8593937abe0284f87e3d8b2a4abd1d732fcc1d6117c36d5a671e968b4d73c');
 assert.equal(manifest.links.length,16);
 assert.equal(scopeHash({...manifest,links:manifest.links.filter(r=>r.unit_id!=='an2.47')}),'7c590a66710c9ef8c53c26dae18fd54381f2f33403c7f32f56c685a17961357c');
 assert.deepEqual(json('server/data/reviewed-partial-pages.json'),manifest);
 const u=canon.resolve('an2.47').unit,meta=canon.describe(u),choice=meta.english[0],scope=choice.translation_scope;
 assert.deepEqual([u.vri,meta.english_available,meta.partial_english_available,meta.english.length],['48',0,1,1]);
 assert.equal(scope.version,2);assert.equal(scope.extractor,extractor);assert.equal(scope.whole_unit_coverage,false);
 assert.deepEqual([scope.first_ref,scope.last_ref],['an2.47/2','an2.47/2']);
 assert.deepEqual([scope.pali_excerpt.start_char,scope.pali_excerpt.end_char,scope.pali_excerpt.text.length],[66,827,761]);
 const seg=canon.segments(u)[1],part={ref:seg.ref,type:seg.type,text:seg.text.slice(66,827)};
 assert.equal(scope.pali_excerpt.text,part.text);assert.ok(part.text.startsWith('Idha,'));assert.ok(part.text.endsWith('nookkācitavinītā.'));
 assert.ok(!part.text.includes('Imā kho'));assert.equal(scope.read_with,undefined);assert.equal(scope.read_pages,undefined);
 assert.equal(scopeHash({ref:seg.ref,type:seg.type,text:seg.text}),'5bccbccfb20a424bce18386962f6a81878ea519f704a0efe1bd439215e7cf4de');
 assert.equal(scopeHash([part]),'82a7d160e7bf63bbee0b6bfec5697cf5e3aca10a8da453f8380cd5f49a1a55a0');
 assert.equal(row.source_html_sha256,'e24d1e08bc4a3400a0c3294fe871c388805ab11ba71ef1a7116080073067163b');
 assert.equal(scope.text_sha256,'7d4165eabc5efb9313f54131c026849d6ef6421956bd716fbb4ed54232e3c0e8');
 assert.equal(scope.notice_sha256,'b807df6c991234ca37c9e7304d2519adb29bba3b0b3c604ddde855c1679269e5');
 assert.equal(scopeHash(canon.load().canon.books[u.book].blocks.slice(u.start,u.end)),row.root.root_blocks_sha256);
 assert.match(row.mapping_note,/Publisher AN2.46/);assert.match(row.mapping_note,/©2010/);
 assert.equal(scopeDescriptor(choice,u.id).flags.allow_partial,true);
 const bad=structuredClone(choice);bad.translation_scope.version=1;delete bad.translation_scope.pali_excerpt;
 assert.throws(()=>scopeDescriptor(bad,u.id),/unsupported|incomplete/);
 const t=translationCoverage({refresh:true}).total;assert.deepEqual([t.links,t.with_english,t.with_english_including_inherited,t.partial_links,t.partial_only,t.shared_links,t.with_shared_english,t.shared_only],[2538,1408,1831,16,10,12,110,52]);
 const d=dailyText({...canon},{date:'2026-11-01',kind:'sutta'});assert.deepEqual([d.rotation.of,d.text.id],[1257,'sn12.31']);
});

test('real AN2.47 choice requires exact partial consent and rejects whole, shared or translator-only requests before fetching',async()=>{
 const unit=canon.resolve('an2.47').unit,id='ati:'+row.path;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No implicit provider request');};
 for(const [which,flags]of[[undefined,{}],[id,{}],[id,{allow_shared:true}],[row.translator,{allow_partial:true}]])await assert.rejects(english.translation(unit,which,flags),/partial|shared-page scope|not available/i);
 assert.equal(calls,0);
});

test('five-paragraph no-notes selector refuses malformed boundaries, outside material and nested source structures',()=>{
 const html=fixture();assert.equal(atiPartialExcerpt(html,extractor),selected);
 const variants=[html.replace('<p>Excluded synthetic paragraph 1.</p>',''),html.replace('<p>','<p>Extra.</p><p>'),html.replace('<div class="chapter">','<div class="chapter"><h4>Heading</h4>'),html.replace('</div></div>'+end,'<div class="notes"><p>Note</p></div></div></div>'+end),html.replace('<div class="chapter">','<div class="chapter"></div><div class="chapter">'),html.replace(selected,'<div>Nested</div>'+selected),html.replace(selected,'<script>bad</script>'+selected),html.replace(selected,'<p>Nested</p>'+selected),html.replace(begin,begin+'Outside text'),html.replace(end,'Extra text'+end),html.replace('</div></div>'+end,'</div>'+end),html.replace('</div></div>'+end,'</div></div></div>'+end),html+html];
 for(const [i,changed]of variants.entries())assert.throws(()=>atiPartialExcerpt(changed,extractor),/structure changed/,'structure mutation '+i);
});

test('synthetic AN2.47 source proves exact substring output and guarded continuations without neighboring context',async()=>{
 const {unit,link,id}=install();let calls=0;globalThis.fetch=async()=>{calls++;return new Response(fixture());};
 const first=await english.translation(unit,id,{allow_partial:true,limit:80});assert.equal(first.text,selected.slice(0,80));assert.equal(first.translation_scope.pali_excerpt.text.length,761);assert.equal(first.translation_scope.read_with,undefined);
 assert.equal(first.license,english.atiNotice(fixture()).licensing);assert.equal(first.attribution,english.atiNotice(fixture()).citation);
 const args=first.continue_with.arguments;assert.equal((await english.translation(unit,id,args)).text,selected.slice(80,160));assert.equal(calls,1);
 for(const pin of ['prefix_sha256','scope_sha256'])await assert.rejects(english.translation(unit,id,{...args,[pin]:undefined}),/requires unchanged scope/);
 await assert.rejects(english.translation(unit,id,{...args,prefix_sha256:'0'.repeat(64)}),/prefix|changed/);
 link.partial_scope.subparagraph.end_char++;await assert.rejects(english.translation(unit,id,args),/Invalid|changed/);
});

test('English text, notice and structure drift refuse initial and continued output with no provider fallback',async()=>{
 const {unit,id}=install();globalThis.fetch=async()=>new Response(fixture());const first=await english.translation(unit,id,{allow_partial:true,limit:80});
 for(const [html,pattern]of[[fixture().replace('Synthetic notice','Changed notice'),/notice changed/],[fixture().replace(selected,selected+' Changed.'),/text changed/],[fixture().replace('<p>Excluded synthetic paragraph 1.</p>',''),/structure changed/]])for(const options of[{allow_partial:true},first.continue_with.arguments]){
  liveCache.clear();const calls=[];globalThis.fetch=async url=>{calls.push(String(url));return new Response(html);};await assert.rejects(english.translation(unit,id,options),pattern);assert.deepEqual(calls,['https://accesstoinsight.org/tipitaka/an/an02/synthetic-questioning-fixture.html']);
 }
});

const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
test('reserved AN2.47 profile refuses wrong owners and paths, versions, rights families and generic extractor downgrades',{skip:!python},()=>{
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
 changes=[lambda r:r.update(unit_id='an2.46'),lambda r:r.update(path='/tipitaka/an/an02/an02.047.than'),lambda r:r.update(translator='Andrew Olendzki'),lambda r:r.update(license='BPS-free-distribution-1985'),lambda r:r['partial_scope'].update(version=1),lambda r:r['partial_scope'].update(extractor='ati-chapter-prose-v1'),lambda r:r.update(license='BPS-free-distribution-1985',translator="Maurice O'Connell Walshe")]
 for change in changes:
  bad=copy.deepcopy(m);change(next(r for r in bad['links'] if r['unit_id']=='an2.47'))
  try:check(bad)
  except ValueError:pass
  else:raise AssertionError('Invalid exact AN profile accepted')
 bad=copy.deepcopy(m);r=next(r for r in bad['links'] if r['unit_id']=='an2.47');r.update(license='Olendzki-free-distribution-2005',translator='Andrew Olendzki');r['partial_scope'].update(version=1,extractor='ati-freeverse-v1');r['partial_scope'].pop('subparagraph')
 for owner in ['an2.47','mn55']:
  r['unit_id']=owner;r['root']['id']=owner;r['partial_scope'].update(unit_id=owner,first_ref=owner+'/2',last_ref=owner+'/2')
  try:check(bad)
  except ValueError:pass
  else:raise AssertionError('Reserved path escaped through generic family')
 print('9 malformed source profiles refused')
`],{input:JSON.stringify(manifest),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr||r.stdout);assert.match(r.stdout,/9 malformed source profiles refused/);
});
