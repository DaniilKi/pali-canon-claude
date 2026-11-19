// Offline synthetic wording tests parser behavior; actual publisher wording is never bundled.
import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {atiPartialExcerpt} from '../src/ati-excerpt.mjs';
import {scopeHash,partialScope} from '../src/translation-scope.mjs';
import {reviewedPartialLink} from '../src/partial-source-registry.mjs';
import {scopeDescriptor,validateEnglishPage} from '../web/translation-policy.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {liveCache} from '../src/cache.mjs';

const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json','utf8'));
const rows=manifest.links.filter(r=>['pli-tv-kd6','pli-tv-kd8'].includes(r.unit_id));
const hash=s=>createHash('sha256').update(s).digest('hex');
const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
const total=row=>row.unit_id==='pli-tv-kd6'?5:22;
const paragraphs=row=>Array.from({length:total(row)},(_,i)=>`Synthetic fixture paragraph ${i+1}: amber lantern copper window. `.repeat(3).trim());
const fixture=row=>`${begin}<div class="chapter">${paragraphs(row).map((p,i)=>`<p>${total(row)===22&&i===0?'<a id="ananda">'+p+'</a>':p}</p>`).join('')}</div></div>${end}<div id="F_provenance">Synthetic notice only; no publisher rights approval.</div><div id="F_citation">Synthetic attribution only.</div>`;
const inlineNotes=[
 '<a class="noteTag">Unexpected note</a>',
 "<a class='other noteTag' id='changed'>Unexpected note</a>",
 '<a id="changed" class="noteTag other">Unexpected note</a>',
 '<a class=noteTag>Unexpected note</a>',
 '<a class = "noteTag">Unexpected note</a>',
 '<sup class="noteTag">Unexpected note</sup>',
 '<span class="notes">Unexpected note</span>',
 '<a id="ananda" class="noteTag">Unexpected note</a>',
];
const expected=row=>paragraphs(row).join('\n\n');
const originalFetch=globalThis.fetch;let saved;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});
function install(row){const d=canon.load();saved||=d.translations;const link=reviewedPartialLink(row,manifest);link.path='/tipitaka/vin/mv/synthetic-'+row.unit_id;link.url='https://accesstoinsight.org'+link.path+'.html';link.partial_scope=structuredClone(link.partial_scope);link.partial_scope.text_sha256=scopeHash(expected(row));link.partial_scope.notice_sha256=scopeHash(english.atiNotice(fixture(row)));d.translations={...d.translations,[row.unit_id]:[link]};return {link,unit:canon.resolve(row.unit_id).unit,id:canon.translationId(link)};}

test('two Vinaya partial declarations preserve the exact previous eighteen descriptors and original roots',()=>{
 assert.equal(manifest.links.length,22);assert.equal(rows.length,2);
 assert.equal(scopeHash(manifest.links.slice(0,18)),'d55eab78d8820f2b9ef8c4988c936eaa17e11b51298ccb29c2b015760ff7ad36');
 assert.deepEqual(rows.map(r=>[r.unit_id,r.partial_scope.first_ref,r.partial_scope.last_ref,r.partial_scope.extractor]),[
  ['pli-tv-kd6','pli-tv-kd6/195','pli-tv-kd6/195','ati-vinaya-mv6-p1to5-of5-v1'],
  ['pli-tv-kd8','pli-tv-kd8/174','pli-tv-kd8/178','ati-vinaya-mv8-p1to22-of22-v1'],
 ]);
 for(const row of rows){const u=canon.resolve(row.unit_id).unit,segments=canon.segments(u),scope=partialScope(reviewedPartialLink(row,manifest),u,segments,canon.source());
  assert.equal(scope.whole_unit_coverage,false);assert.equal(scope.version,1);assert.equal(scope.pali_segments,row.unit_id==='pli-tv-kd6'?1:5);
  assert.deepEqual(scope.read_with,{tool:'get_text',uid:row.unit_id,offset:row.unit_id==='pli-tv-kd6'?194:173,limit:scope.pali_segments});
  assert.equal(scopeHash(canon.load().canon.books[u.book].blocks.slice(u.start,u.end)),row.root.root_blocks_sha256);
  assert.equal(row.license,'CC-BY-NC');assert.equal(row.translator,'Thanissaro Bhikkhu');assert.match(row.mapping_note,/neither a whole Khandhaka nor word-level alignment/);assert.match(row.mapping_note,/CC BY-NC4.0/);
  const first=segments.findIndex(s=>s.ref===scope.first_ref),last=segments.findIndex(s=>s.ref===scope.last_ref);
  assert.ok(segments.slice(first,last+1).every(s=>s.type==='prose'));assert.ok(segments.slice(last+1).some(s=>s.type==='prose'));
  const choice={translation_id:'ati:'+row.path,translation_scope:scope};assert.equal(scopeDescriptor(choice,u.id).flags.allow_partial,true);
  for(const mutate of [s=>s.extractor='ati-vinaya-mv6-unreviewed',s=>s.version=2,s=>s.notice_sha256='bad',s=>s.whole_unit_coverage=true]){const bad=structuredClone(choice);mutate(bad.translation_scope);assert.throws(()=>scopeDescriptor(bad,u.id),/unsupported|incomplete/);}
 }
});

test('each finite Vinaya extractor returns every declared paragraph and rejects changed body structure',()=>{
 for(const row of rows){const html=fixture(row),extractor=row.partial_scope.extractor;assert.equal(atiPartialExcerpt(html,extractor),expected(row));
  for(const mutate of [
   s=>s.replace('<div class="chapter">','<div class="chapter"><p>Unexpected added paragraph.</p>'),
   s=>s.replace(/<p>[^]*?<\/p>/,''),
   s=>s.replace('<div class="chapter">','<div class="chapter"><div class="chapter">'),
   s=>s.replace('<div class="chapter">','<div class="chapter"><div class="notes">Unexpected notes.</div>'),
   s=>s.replace('<div class="chapter">','<div class="chapter"><ol><li>Unexpected list.</li></ol>'),
   s=>s.replace('<div class="chapter">','<div class="chapter"><pre>Unexpected verse.</pre>'),
   s=>s.replace('<div class="chapter">','<div class="chapter"><script>Unexpected script.</script>'),
   s=>s.replace('<div class="chapter">','<div class="chapter">Unexpected outside wording.'),
   s=>s.replace('<p>','<p><p>'),s=>s.replace(/<p>[^]*?<\/p>/,'<p> </p>'),
   s=>s+begin,s=>s.replace('</div></div>'+end,'</div>Unexpected tail.</div>'+end),
  ])assert.throws(()=>atiPartialExcerpt(mutate(html),extractor),/structure changed/);
  for(const marker of inlineNotes)assert.throws(()=>atiPartialExcerpt(html.replace('<p>','<p>'+marker),extractor),/structure changed/);
  assert.throws(()=>atiPartialExcerpt(html,extractor.replace('-v1','-v2')),/Unsupported/);
 }
});

test('Vinaya synthetic retrieval requires exact consent, bounded unchanged continuation and complete notice pins',async()=>{
 for(const row of rows){const {unit,id}=install(row),html=fixture(row);let calls=0;globalThis.fetch=async()=>{calls++;return new Response(html,{status:200});};
  for(const [which,opts]of [[undefined,{}],[id,{}],['Thanissaro Bhikkhu',{allow_partial:true}]])await assert.rejects(english.translation(unit,which,opts),/partial/i);
  assert.equal(calls,0);const choice=english.available(unit)[0],accepted=scopeDescriptor(choice,unit.id),args={uid:unit.id,translation:id,allow_partial:true,scope_sha256:accepted.scope.scope_sha256,limit:500};
  const first=await english.translation(unit,id,args);assert.equal(first.text,expected(row).slice(0,500));assert.equal(first.license,english.atiNotice(html).licensing);assert.equal(first.attribution,english.atiNotice(html).citation);assert.equal(first.whole_unit_coverage,false);
  const next=validateEnglishPage(first,args,{uid:unit.id,choices:[choice],accepted});assert.ok(next);assert.equal(next.translation,id);assert.equal(next.allow_partial,true);
  const page=await english.translation(unit,id,next);assert.equal(page.text,expected(row).slice(500,1000));assert.deepEqual(page.translation_scope,first.translation_scope);
  for(const pin of ['scope_sha256','prefix_sha256'])await assert.rejects(english.translation(unit,id,{...next,[pin]:undefined}),/requires unchanged scope/);
  for(const replacement of [html.replace('amber','changed'),html.replace('Synthetic notice only','Changed notice')]){liveCache.clear();globalThis.fetch=async()=>new Response(replacement,{status:200});await assert.rejects(english.translation(unit,id,args),/changed/);}
  canon.load().translations=saved;liveCache.clear();
 }
});

const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
test('Vinaya build profiles reserve exact paths, owners, versions, authors and rights',{skip:!python},()=>{
 const result=spawnSync(python,['-c',`import sys,json,tempfile,pathlib,copy
sys.path.insert(0,'scripts/canon')
from reviewed_partial_pages import manifest_rows,withhold_partial_page_proposals
m=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)/'manifest.json'
 p.write_text(json.dumps(m),encoding='utf-8');assert len(manifest_rows(p)['links'])==22
 for row in [r for r in m['links'] if r['unit_id'] in ['pli-tv-kd6','pli-tv-kd8']]:
  original={'wrong-owner':[{'source':'ati','path':row['path'],'url':'https://accesstoinsight.org'+row['path']+'.html'}]}
  out,removed=withhold_partial_page_proposals(original,p);assert out=={} and len(removed)==1
  for field,value in [('unit_id','pli-tv-kd1'),('path','/tipitaka/vin/mv/unreviewed'),('translator','Unreviewed'),('license','unreviewed'),('extractor','ati-freeverse-v1'),('version',2)]:
   bad=copy.deepcopy(m);r=next(r for r in bad['links'] if r['unit_id']==row['unit_id'])
   if field in ['extractor','version']:r['partial_scope'][field]=value
   else:r[field]=value
   p.write_text(json.dumps(bad),encoding='utf-8')
   try:manifest_rows(p)
   except ValueError:pass
   else:raise AssertionError(field)
  p.write_text(json.dumps(m),encoding='utf-8')
print('finite Vinaya profiles retained')`],{input:JSON.stringify(manifest),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/finite Vinaya profiles retained/);
});

const sourceDir=process.env.PALI_VINAYA_PARTIALS_SOURCE_DIR;
test('optional frozen official ATI snapshot verifies both complete English bodies and notices',{skip:!sourceDir},()=>{
 for(const row of rows){const file=join(sourceDir,row.path+'.html');assert.ok(existsSync(file),'Required pinned official source file: '+file);const raw=readFileSync(file),html=raw.toString('utf8');assert.equal(hash(raw),row.source_html_sha256);const text=atiPartialExcerpt(html,row.partial_scope.extractor);assert.equal(scopeHash(text),row.partial_scope.text_sha256);assert.equal(scopeHash(english.atiNotice(html)),row.partial_scope.notice_sha256);assert.equal(text.length,row.unit_id==='pli-tv-kd6'?914:5165);for(const marker of inlineNotes)assert.throws(()=>atiPartialExcerpt(html.replace('<p>','<p>'+marker),row.partial_scope.extractor),/structure changed/);}
});
