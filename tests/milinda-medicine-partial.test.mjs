import { canonBeforeTheraPair } from './helpers/canon-before-thera-pair.mjs';
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {atiPartialExcerpt,ATI_SEGMENT_EXTRACTORS} from '../src/ati-excerpt.mjs';
import {partialScope,scopeHash} from '../src/translation-scope.mjs';
import {assertRegisteredPartial,reviewedPartialLink} from '../src/partial-source-registry.mjs';
import {translationCoverage,getAtiText} from '../src/providers.mjs';
import {dailyText} from '../src/daily.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {liveCache} from '../src/cache.mjs';

const owner='mil6.4.1',path='/tipitaka/kn/miln/miln.5x.olen',extractor='ati-milinda-medicine-two-verses-v1';
const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json','utf8'));
const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
const editorial='Synthetic editorial preface only purple zeppelins surround copper windows.';
const verse=Array.from({length:9},(_,i)=>`Synthetic fixture line ${i+1} amber lantern copper window.`).map((s,i)=>i===4?'\n'+s:s).join('\n');
const fixture=()=>`${begin}<div class='preface'><h1>Translator's note</h1><p>${editorial}</p><p>Synthetic second editorial paragraph.</p><p>Synthetic third paragraph <i>first</i> and <i>second</i> and <i>third</i> and <i>fourth</i>.</p></div><div class='chapter'><div class='freeverse'>\n${verse}\n<p class="cite">&mdash; Miln 335</p></div></div></div>${end}<div id="F_provenance">Synthetic fixture notice only; not publisher permission.</div><div id="F_citation">Synthetic fixture citation only.</div>`;
const unit=()=>canon.resolve(owner).unit;
const segments=()=>canon.segments(unit()).map(({ref,type,text})=>({ref,type,text}));
function row(){const u=unit();return{unit_id:owner,path,translator:'Andrew Olendzki',english_title:'The Healing Medicine of the Dhamma',license:'Olendzki-free-distribution-2005',source_reference:'Miln 5; publisher verse citation: — Miln 335',mapping_note:'Reviewed partial only: two stanzas, not the whole question; editorial preface and publisher citation excluded.',source_html_sha256:'7c117b838aef75fcc9c595b5b903b5769221bae6269492e1ed8d86811cf8c299',root:{id:u.id,title:u.title,vri:u.vri,book:u.book,start:u.start,end:u.end,root_blocks_sha256:'bc2d2e8c21c237a82455f4699e35c8ca2835a284f039f7ed49197cb9ce6fb7f0'},partial_scope:{version:1,status:'reviewed',unit_id:owner,first_ref:owner+'/20',last_ref:owner+'/21',source_commit:canon.source().commit,pali_sha256:'80466c44791d665fd9a7a5c7b6406e942f13d291d9571cd59a1f1d89f760cc37',text_sha256:'ac9407f40b48592e66e2247c3b5efe000c060bc91f8c6aa52aaf7b6fe36e885d',notice_sha256:'167c6e2428970354cb074b043e2c091c3f4c71aaeff997ea801cda00ae7d9e8f',extractor}};}
const originalFetch=globalThis.fetch;let saved;
function install(){const d=canon.load();saved||={translations:d.translations,registry:d.partialRegistry};const r=row();r.partial_scope.text_sha256=scopeHash(verse);r.partial_scope.notice_sha256=scopeHash(english.atiNotice(fixture()));const registry={...manifest,links:[...manifest.links.filter(r=>r.path!==path),r]},link=reviewedPartialLink(r,registry);d.partialRegistry=registry;d.translations={...d.translations,[owner]:[link]};return{link,id:canon.translationId(link)};}
afterEach(()=>{if(saved){canon.load().translations=saved.translations;canon.load().partialRegistry=saved.registry;}saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});

test('Milinda pins retain the complete original root and previous twenty-one source descriptors',()=>{
 assert.equal(scopeHash(canonBeforeTheraPair(canon.load().canon)),'49701605d61352898b3970143192e12b3509dbda966cfb42511e2af0e5f790a1');
 const previous={...manifest,links:manifest.links.filter(r=>r.unit_id!==owner)};
 assert.equal(previous.links.length,21);assert.equal(scopeHash(previous),'b5e86eae5f28169ac9a4fddc915742e27dd203cacd6cb95e6f17b40b1b0748e6');
 const r=row(),u=unit(),all=segments();assert.equal(all.length,96);assert.equal(scopeHash(all),'802aeb895d091f986a8c84041ceb491f17f04b9f201b5eda773b0c85198d9a90');
 assert.equal(scopeHash(canon.load().canon.books[u.book].blocks.slice(u.start,u.end)),r.root.root_blocks_sha256);
 assert.equal(scopeHash(all.slice(19,21)),r.partial_scope.pali_sha256);assert.deepEqual(all.slice(19,21).map(s=>s.type),['verse','verse']);
 const scope=partialScope(reviewedPartialLink(r,manifest),u,all,canon.source());
 assert.deepEqual([scope.version,scope.first_ref,scope.last_ref,scope.pali_segments,scope.whole_unit_coverage],[1,owner+'/20',owner+'/21',2,false]);
 assert.deepEqual(scope.read_with,{tool:'get_text',uid:owner,offset:19,limit:2});
 assert.ok(ATI_SEGMENT_EXTRACTORS.includes(extractor));
});

test('closed Milinda selector excludes all preface paragraphs and final citation, preserving exactly two stanzas and nine lines',()=>{
 assert.equal(atiPartialExcerpt(fixture(),extractor),verse);
 assert.ok(!atiPartialExcerpt(fixture(),extractor).includes(editorial));assert.ok(!atiPartialExcerpt(fixture(),extractor).includes('Miln 335'));
 const html=fixture(),variants=[
  html+html,html.replace(begin,''),html.replace(end,''),html.replace(begin,begin+'Outside text'),html.replace(end,'Outside text'+end),
  html.replace("<div class='preface'>","<div class='preface' id='extra'>"),html.replace("Translator's note",'Another heading'),html.replace('<h1>','<h2>').replace('</h1>','</h2>'),
  html.replace(`<p>${editorial}</p>`,''),html.replace(`<p>${editorial}</p>`,`<p>${editorial}</p><p>Extra editorial paragraph.</p>`),
  html.replace(editorial,'<i>Added first-paragraph markup</i>'),html.replace('<i>fourth</i>','fourth'),html.replace('<i>fourth</i>','<i>fourth'),
  html.replace('<i>fourth</i>','<i><i>nested</i></i>'),html.replace('<i>fourth</i>','<i id="extra">fourth</i>'),html.replace('<i>fourth</i>','<i></i>'),
  html.replace('<i>fourth</i>','<b>fourth</b>'),html.replace('<i>fourth</i>','<i>fourth</i><i>fifth</i>'),
  html.replace(verse,'<div>Nested body</div>'+verse),html.replace(verse,'<a id="extra"></a>'+verse),html.replace(verse,'<!-- Extra comment -->'+verse),
  html.replace(verse,'<script>extra</script>'+verse),html.replace(verse,'<p>Extra note</p>'+verse),html.replace(verse,verse+'\nExtra tenth line.'),
  html.replace(verse,verse.replace('\n\n','\n')),html.replace(verse,verse.replace('line 5','line 5\nExtra line')),
  html.replace('<p class="cite">&mdash; Miln 335</p>',''),html.replace('Miln 335','Miln 336'),html.replace('class="cite"','class="cite" id="extra"'),
  html.replace('<p class="cite">&mdash; Miln 335</p>','<p class="cite">&mdash; Miln 335</p><p class="cite">&mdash; Miln 335</p>'),
  html.replace(verse+'\n<p class="cite">&mdash; Miln 335</p>','<p class="cite">&mdash; Miln 335</p>\n'+verse),html.replace('</div></div></div>'+end,'</div></div>'+end),
  html.replace('</div></div></div>'+end,'</div></div></div></div>'+end),html.replace("<div class='chapter'>","<div class='chapter'><div class='notes'>Note</div>"),
 ];
 for(const [i,changed]of variants.entries())assert.throws(()=>atiPartialExcerpt(changed,extractor),/structure changed/,'structure mutation '+i);
});

test('runtime Milinda tuple rejects generic extractors, wrong owners, boundaries, paths, authors and rights',()=>{
 const original=reviewedPartialLink(row(),manifest),all=segments();
 for(const change of [l=>l.path='/tipitaka/kn/miln/another',l=>l.translator='John Kelly',l=>l.license='CC-BY-NC',l=>l.license='BPS-free-distribution-2005',l=>l.partial_scope.extractor='ati-freeverse-v1',l=>l.partial_scope.version=2,l=>l.partial_scope.first_ref=owner+'/19',l=>l.partial_scope.last_ref=owner+'/22',l=>l.partial_scope.first_ref=owner+'/1',l=>l.partial_scope.last_ref=owner+'/96',l=>delete l.partial_scope.notice_sha256,l=>l.partial_scope.status='unreviewed']){
  const bad=structuredClone(original);change(bad);if(bad.path!==path)bad.url='https://accesstoinsight.org'+bad.path+'.html';assert.throws(()=>partialScope(bad,unit(),all,canon.source()),/Invalid or unreviewed/);
 }
 const wrong=structuredClone(original);wrong.partial_scope.unit_id='mil6.4.2';assert.throws(()=>partialScope(wrong,{...unit(),id:'mil6.4.2'},all,canon.source()),/Invalid or unreviewed/);
});

test('reserved Milinda path cannot downgrade to whole or escape through a missing registry descriptor',()=>{
 const r=row(),registry={...manifest,links:[r]},link=reviewedPartialLink(r,registry);
 assert.doesNotThrow(()=>assertRegisteredPartial(link,unit(),registry));
 for(const change of [l=>delete l.partial_scope,l=>l.partial_scope=null,l=>l.partial_scope.extractor='ati-freeverse-v1',l=>l.translator='Unreviewed',l=>l.url+='?bypass=1']){
  const bad=structuredClone(link);change(bad);assert.throws(()=>assertRegisteredPartial(bad,unit(),registry),/Registered partial/);
 }
 for(const bad of [link,{source:'ati',path,url:link.url},{source:'ati',url:'https://www.accesstoinsight.org'+path+'.html?bypass=1'}])assert.throws(()=>assertRegisteredPartial(bad,unit(),{links:[]}),/Registered partial/);
 assert.throws(()=>assertRegisteredPartial(link,{id:'mil6.4.2'},registry),/Registered partial/);
});

test('synthetic Milinda translation requires exact consent, retains complete notices and bounded prefixes, and never raises whole eligibility',async()=>{
 const d=canon.load();saved={translations:d.translations,registry:d.partialRegistry};d.translations={...d.translations};delete d.translations[owner];
 const before=translationCoverage({refresh:true}).total,rotation=dailyText({...canon},{date:'2026-11-01',kind:'sutta'}).rotation;
 const {link,id}=install();let calls=0;globalThis.fetch=async input=>{assert.equal(String(input),link.url);calls++;return new Response(fixture());};
 const after=translationCoverage({refresh:true}).total;
 for(const key of ['with_english','with_english_including_inherited','shared_links','with_shared_english'])assert.equal(after[key],before[key]);
 assert.equal(after.partial_links,before.partial_links+1);assert.equal(after.partial_only,before.partial_only+1);
 assert.deepEqual(dailyText({...canon},{date:'2026-11-01',kind:'sutta'}).rotation,rotation);
 const meta=canon.describe(unit());assert.deepEqual([meta.english_available,meta.partial_english_available],[0,1]);
 for(const [which,options]of [[undefined,{}],[undefined,{allow_partial:true}],[id,{}],[id,{allow_shared:true}],[link.translator,{allow_partial:true}],['',{allow_partial:true}]])await assert.rejects(english.translation(unit(),which,options),/partial|shared-page|empty|blank/i);
 assert.equal(calls,0);
 await liveCache.wrap('ati:'+path,async()=>({text:editorial,license:'Wrong whole article cache',attribution:'Wrong article'}));
 const first=await english.translation(unit(),id,{allow_partial:true,limit:80});assert.equal(first.text,verse.slice(0,80));assert.equal(first.license,english.atiNotice(fixture()).licensing);assert.equal(first.attribution,english.atiNotice(fixture()).citation);assert.equal(first.whole_unit_coverage,false);
 const args=first.continue_with.arguments;assert.equal((await english.translation(unit(),id,args)).text,verse.slice(80,160));assert.equal(calls,1);
 for(const key of ['scope_sha256','prefix_sha256'])await assert.rejects(english.translation(unit(),id,{...args,[key]:undefined}),/requires unchanged scope/);
 await assert.rejects(english.translation(unit(),id,{...args,prefix_sha256:'0'.repeat(64)}),/prefix changed/);
 await assert.rejects(english.translation(unit(),id,{...args,scope_sha256:'0'.repeat(64)}),/mapping changed/);
 let joined=first.text,page=first;
 while(page.continue_with){page=await english.translation(unit(),id,page.continue_with.arguments);joined+=page.text;assert.equal(page.translation_scope.last_ref,owner+'/21');}
 assert.equal(joined,verse);assert.equal(page.next_offset,null);assert.equal(page.total_characters,verse.length);assert.equal(calls,1);
 const quotation=await verifyQuote({language:'english',texts:[owner],translation_ids:[id],include_partial:true,text:editorial});assert.equal(quotation.verdict,'not_found_in_scope');
});

test('synthetic Milinda text, notice and structure drift fail initial and continued retrieval without fallback',async()=>{
 const {id}=install();globalThis.fetch=async()=>new Response(fixture());const first=await english.translation(unit(),id,{allow_partial:true,limit:80});
 const cached=await liveCache.wrap('ati-partial:'+extractor+':'+path,()=>{throw Error('Expected partial cache');});
 cached.license+=' Changed cached notice.';await assert.rejects(english.translation(unit(),id,first.continue_with.arguments),/notice changed/);
 for(const [html,pattern]of [[fixture().replace('lantern','changed'),/source text changed/],[fixture().replace('Synthetic fixture notice','Changed fixture notice'),/notice changed/],[fixture().replace('Miln 335','Miln 336'),/structure changed/]])for(const options of [{allow_partial:true},first.continue_with.arguments]){
  liveCache.clear();const calls=[];globalThis.fetch=async input=>{calls.push(String(input));return new Response(html);};await assert.rejects(english.translation(unit(),id,options),pattern);assert.deepEqual(calls,['https://accesstoinsight.org'+path+'.html']);
 }
});

const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
test('Python activation allows only the exact Milinda tuple and withholds its ordinary proposals even before activation',{skip:!python},()=>{
 const m={...manifest,links:[row()]};
 const result=spawnSync(python,['-c',`
import copy,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'scripts/canon')
from reviewed_partial_pages import manifest_rows,withhold_partial_page_proposals
m=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as tmp:
 p=Path(tmp)/'manifest.json'
 def check(x):
  p.write_text(json.dumps(x),encoding='utf-8');return manifest_rows(p)
 assert check(m)==m
 mutations=[lambda r:r.update(unit_id='mil6.4.2'),lambda r:r.update(path='/tipitaka/kn/miln/miln.5x.horn'),lambda r:r.update(translator='John Kelly'),lambda r:r.update(license='CC-BY-NC'),lambda r:r.update(license='BPS-free-distribution-2005'),lambda r:r['partial_scope'].update(version=2),lambda r:r['partial_scope'].update(extractor='ati-freeverse-v1'),lambda r:r['partial_scope'].update(first_ref='mil6.4.1/19'),lambda r:r['partial_scope'].update(last_ref='mil6.4.1/22')]
 for mutate in mutations:
  bad=copy.deepcopy(m);mutate(bad['links'][0])
  try:check(bad)
  except ValueError:pass
  else:raise AssertionError('Invalid finite Milinda tuple accepted')
 check(m)
 links={'wrong-owner':[{'source':'ati','path':m['links'][0]['path'],'url':'https://accesstoinsight.org'+m['links'][0]['path']+'.html'}]}
 assert withhold_partial_page_proposals(links,p)[0]=={}
 # A manifest without this source still reserves its exact path.
 other=json.loads(Path('scripts/canon/reviewed_partial_pages.json').read_text(encoding='utf-8'));other['links']=[r for r in other['links'] if r['unit_id']!='mil6.4.1'];check(other)
 assert withhold_partial_page_proposals(links,p)[0]=={}
 print('9 invalid tuples refused; exact ordinary path held with and without activation')
`],{input:JSON.stringify(m),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr||result.stdout);assert.match(result.stdout,/9 invalid tuples refused/);
});

test('optional independently acquired Milinda artifact reproduces approved body/notice/raw pins without bundling its body',{skip:!process.env.MILINDA_MEDICINE_HTML},()=>{
 const raw=readFileSync(process.env.MILINDA_MEDICINE_HTML),html=raw.toString('utf8'),r=row(),text=atiPartialExcerpt(html,extractor),notice=english.atiNotice(html);
 assert.equal(createHash('sha256').update(raw).digest('hex'),r.source_html_sha256);assert.equal(text.length,265);assert.equal(scopeHash(text),r.partial_scope.text_sha256);assert.equal(scopeHash(notice),r.partial_scope.notice_sha256);
 assert.match(notice.licensing,/©2005 Andrew Olendzki/);assert.match(notice.licensing,/free of charge/);assert.match(notice.licensing,/full text of this license/);assert.doesNotMatch(notice.licensing,/Creative Commons|50 copies/);
 assert.deepEqual(text.split('\n\n').map(s=>s.split('\n').length),[4,5]);assert.ok(!text.includes('Miln 335'));assert.ok(!text.includes("Translator's note"));
});

// Generic article retrieval is distinct from consent-scoped verse translation.
test('generic Milinda article and search retain article access without falsely identifying a whole canonical translation',async()=>{
 const d=canon.load(),control=d.translations.mn1.find(link=>link.source==='ati'&&link.path),section='/tipitaka/an/an01/an01.021-040.than';
 assert.ok(control);assert.equal(d.urlIndex.get('accesstoinsight.org'+path),owner);
 const list=`<li>Synthetic <a href="${path}.html">Milinda article</a></li><li>Synthetic <a href="${section}.html">AN collection</a></li><li>Synthetic <a href="${control.path}.html">Ordinary control</a></li>`;
 globalThis.fetch=async input=>new Response(String(input).includes('index-')?begin+list+end:fixture());
 const article=await getAtiText({path});assert.ok(article.text.includes(editorial));assert.ok(article.text.includes('Miln 335'));assert.equal(article.path,path);
 assert.equal(Object.hasOwn(article,'canon_text_id'),false);assert.equal(Object.hasOwn(article,'translation_scope'),false);assert.match(article.licensing,/Synthetic fixture notice/);
 const fresh=await import('../src/providers.mjs?milinda-article-regression');
 const result=await fresh.searchAti({query:'Synthetic',limit:10});assert.equal(result.results.length,3);
 for(const p of [path,section])assert.equal(Object.hasOwn(result.results.find(r=>r.path===p),'canon_text_id'),false);
 assert.equal(result.results.find(r=>r.path===control.path).canon_text_id,'mn1');
});
