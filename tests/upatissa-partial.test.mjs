// Synthetic prose and verse exercise structure; publisher translation stays outside the repository.
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
import {dailyText} from '../src/daily.mjs';
import {liveCache} from '../src/cache.mjs';

const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json','utf8'));
const row=manifest.links.find(r=>r.unit_id==='pli-tv-kd1'),extractor='ati-vinaya-mv1-mixed21p6v-v1';
const sequence=[...Array(8).fill('p'),'verse','p','verse','p','verse',...Array(9).fill('p'),'verse','p','verse','p','verse'];
const anchors=new Map([[1,['sanjaya','rajagaha','sariputta','moggallana']],[2,['assaji']],[10,['saristream']],[21,['moggstream']]]);
const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
let p=0,v=0;
const blocks=sequence.map(kind=>kind==='p'?{kind,text:`Synthetic prose paragraph ${++p}: amber lantern copper window. `.repeat(3).trim(),anchors:anchors.get(p)||[]}:{kind,text:`Synthetic stanza ${++v} line one\nSynthetic stanza ${v} line two`,anchors:[]});
const body=blocks.map(b=>b.kind==='p'?`<p>${b.anchors.map(id=>`<a id="${id}">Synthetic name</a> `).join('')}${b.text}</p>`:`<div class='freeverse'>\n${b.text}\n</div>`).join('\n');
const expected=blocks.map(b=>(b.anchors.length?'Synthetic name '.repeat(b.anchors.length):'')+b.text).join('\n\n');
const fixture=`${begin}<div class="chapter">${body}</div></div>${end}<div id="F_provenance">Synthetic notice only; no publisher rights approval.</div><div id="F_citation">Synthetic attribution only.</div>`;
const hash=s=>createHash('sha256').update(s).digest('hex');
const originalFetch=globalThis.fetch;let saved;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});
function install(){
 const d=canon.load();saved||=d.translations;
 const link=reviewedPartialLink(row,manifest);link.path='/tipitaka/vin/mv/synthetic-upatissa';link.url='https://accesstoinsight.org'+link.path+'.html';link.partial_scope=structuredClone(link.partial_scope);
 link.partial_scope.text_sha256=scopeHash(expected);link.partial_scope.notice_sha256=scopeHash(english.atiNotice(fixture));
 d.translations={...d.translations,[row.unit_id]:[link]};return{link,unit:canon.resolve(row.unit_id).unit,id:canon.translationId(link)};
}

test('Upatissa adds one exact partial while preserving all twenty previous descriptors and canonical boundaries',()=>{
 assert.equal(manifest.links.length,22);
 assert.equal(scopeHash(manifest.links.slice(0,20)),'65c4a2780a628e8cd17f21c91bdb2dbde8525841832ec50b37d85a99535904cf');
 assert.equal(scopeHash(manifest.links.slice(0,18)),'d55eab78d8820f2b9ef8c4988c936eaa17e11b51298ccb29c2b015760ff7ad36');
 assert.equal(row.partial_scope.extractor,extractor);assert.equal(row.path,'/tipitaka/vin/mv/mv.01.23.01-10.than');assert.equal(row.translator,'Thanissaro Bhikkhu');assert.equal(row.license,'CC-BY-NC');
 const unit=canon.resolve(row.unit_id).unit,all=canon.segments(unit),scope=partialScope(reviewedPartialLink(row,manifest),unit,all,canon.source());
 assert.deepEqual([scope.first_ref,scope.last_ref,scope.pali_segments,scope.version,scope.whole_unit_coverage],['pli-tv-kd1/190','pli-tv-kd1/201',12,1,false]);
 assert.deepEqual(scope.read_with,{tool:'get_text',uid:unit.id,offset:189,limit:12});
 assert.equal(scopeHash(canon.load().canon.books[unit.book].blocks.slice(unit.start,unit.end)),row.root.root_blocks_sha256);
 assert.deepEqual(all.slice(189,201).map(s=>s.type),Array.from({length:12},(_,i)=>i%2?'verse':'prose'));
 assert.equal(all[188].type,'heading');assert.equal(all[201].vri_paragraph,'62');assert.match(all[201].text,/gacchāma mayaṃ/);
 for(const mutate of [s=>s[189].text+=' changed',s=>s[189].ref='pli-tv-kd1/189',s=>s[200].type='prose']){const bad=structuredClone(all);mutate(bad);assert.throws(()=>partialScope(reviewedPartialLink(row,manifest),unit,bad,canon.source()),/Invalid or unreviewed/);}
 assert.throws(()=>partialScope(reviewedPartialLink(row,manifest),unit,all,{...canon.source(),commit:'changed'}),/Invalid or unreviewed/);
 const choice=canon.describe(unit).english.find(c=>c.translation_id==='ati:'+row.path),accepted=scopeDescriptor(choice,unit.id);assert.equal(accepted.flags.allow_partial,true);
 for(const field of ['extractor','notice_sha256','pali_sha256']){const bad=structuredClone(choice);bad.translation_scope[field]='changed';assert.throws(()=>scopeDescriptor(bad,unit.id),/unsupported|incomplete/);}
 const t=translationCoverage({refresh:true}).total;assert.deepEqual([t.links,t.with_english,t.with_english_including_inherited,t.partial_links,t.partial_only,t.shared_links],[2653,1523,1946,22,16,12]);
 const daily=dailyText({...canon},{date:'2026-11-01',kind:'sutta'});assert.deepEqual([daily.rotation.of,daily.text.id],[1288,'sn11.22']);
 assert.deepEqual(canon.browse('english',{collection:'vinaya',availability:'linked'}).items.map(i=>i.id),['pli-tv-kd1','pli-tv-kd6','pli-tv-kd8']);assert.equal(canon.browse('english',{collection:'vinaya',availability:'whole'}).total,0);
});

test('mixed extraction preserves every prose/verse boundary and stanza newline',()=>{
 const text=atiPartialExcerpt(fixture,extractor);assert.equal(text,expected);assert.equal(text.split('\n\n').length,27);
 assert.equal(text.split('\n\n').filter(b=>b.includes('\n')).length,6);
 assert.ok(text.includes('Synthetic stanza 1 line one\nSynthetic stanza 1 line two\n\nSynthetic prose paragraph 9'));
 assert.throws(()=>atiPartialExcerpt(fixture,extractor.replace('-v1','-v2')),/Unsupported/);
});

const inlineMutations=[
 '<a class="noteTag">Unexpected note</a>','<a class=noteTag>Unexpected note</a>','<a id="sanjaya" class="noteTag">Unexpected note</a>',
 '<sup>Unexpected note</sup>','<span class="notes">Unexpected note</span>','<em>Added markup</em>','<script>Added script</script>','<!-- Added comment -->',
 '<a id="other">Unexpected anchor</a>','<a id="assaji">Moved allowed anchor</a>','<a href="https://example.com">Added link</a>',
];
test('mixed source rejects missing, extra, reordered or nested children and all unreviewed markup',()=>{
 for(const mutate of [
  s=>s.replace(begin,''),s=>s+begin,s=>s+end,s=>s.replace('<div class="chapter">','<div class="chapter" id="changed">'),
  s=>s.replace('<div class="chapter">','<div class="chapter"><div class="chapter">'),
  s=>s.replace('<div class="chapter">','<div class="chapter">Unexpected outside wording.'),
  s=>s.replace('<div class="chapter">','<div class="chapter"><p>Added paragraph</p>'),s=>s.replace(/<p>[^]*?<\/p>/,''),
  s=>s.replace("<div class='freeverse'>","<div class='freeverse'><p>Nested paragraph</p>"),
  s=>s.replace("<div class='freeverse'>","<div class='freeverse' id='changed'>"),
  s=>s.replace(/<div class='freeverse'>[^]*?<\/div>/,''),
  s=>s.replace(/(<p>[^]*?<\/p>)\s*(<div class='freeverse'>[^]*?<\/div>)/,'$2$1'),
  s=>s.replace('<p>','<p id="changed">'),s=>s.replace('<p>','<p><p>'),
  s=>s.replace('<a id="assaji">','<a id="assaji"><a id="assaji">'),
  s=>s.replace('<a id="assaji">Synthetic name</a>',''),s=>s.replace('<a id="assaji">Synthetic name</a>','<a id="assaji">Synthetic name'),
  s=>s.replace('</div></div>'+end,'</div>Unexpected tail.</div>'+end),
  s=>s.replace(/<div class='freeverse'>[^]*?<\/div>/,"<div class='freeverse'> </div>"),
  s=>s.replace('Synthetic stanza 1','< Unclosed tag Synthetic stanza 1'),
 ])assert.throws(()=>atiPartialExcerpt(mutate(fixture),extractor),/structure changed/);
 for(const marker of inlineMutations)assert.throws(()=>atiPartialExcerpt(fixture.replace('<p>','<p>'+marker),extractor),/structure changed/);
 for(const marker of inlineMutations)assert.throws(()=>atiPartialExcerpt(fixture.replace("<div class='freeverse'>","<div class='freeverse'>"+marker),extractor),/structure changed/);
});

test('mixed retrieval requires exact consent and keeps finite continuation, source identity and complete notices',async()=>{
 const {unit,id}=install();let calls=0;globalThis.fetch=async()=>{calls++;return new Response(fixture,{status:200});};
 for(const [which,opts]of [[undefined,{}],[id,{}],['Thanissaro Bhikkhu',{allow_partial:true}]])await assert.rejects(english.translation(unit,which,opts),/partial/i);
 assert.equal(calls,0);const choice=english.available(unit)[0],accepted=scopeDescriptor(choice,unit.id),args={uid:unit.id,translation:id,allow_partial:true,scope_sha256:accepted.scope.scope_sha256,limit:500};
 let page=await english.translation(unit,id,args),text=page.text;assert.equal(page.license,english.atiNotice(fixture).licensing);assert.equal(page.attribution,english.atiNotice(fixture).citation);assert.equal(page.whole_unit_coverage,false);
 const first=page,next=validateEnglishPage(page,args,{uid:unit.id,choices:[choice],accepted});assert.ok(next);
 for(const pin of ['scope_sha256','prefix_sha256'])await assert.rejects(english.translation(unit,id,{...next,[pin]:undefined}),/requires unchanged scope/);
 for(const pin of ['scope_sha256','prefix_sha256'])await assert.rejects(english.translation(unit,id,{...next,[pin]:'0'.repeat(64)}),/changed|restart/i);
 while(page.continue_with){page=await english.translation(unit,id,page.continue_with.arguments);assert.equal(page.translation_id,id);assert.deepEqual(page.translation_scope,first.translation_scope);text+=page.text;}
 assert.equal(text,expected);assert.equal(page.total_characters,expected.length);assert.equal(page.next_offset,null);assert.equal(page.continue_with,null);assert.equal(calls,1);
 for(const replacement of [fixture.replace('amber','changed'),fixture.replace('Synthetic notice only','Changed notice'),fixture.replace('Synthetic attribution only','Changed attribution')]){liveCache.clear();globalThis.fetch=async()=>new Response(replacement,{status:200});await assert.rejects(english.translation(unit,id,args),/changed/);}
});

const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
test('Upatissa build reserves exact owner/path/author/rights/version and rejects raw, root, Pali, extracted-text or notice drift',{skip:!python},()=>{
 const unit=canon.resolve(row.unit_id).unit,books=Array(unit.book+1).fill(null);books[unit.book]=canon.load().canon.books[unit.book];
 const synthetic=structuredClone(row);synthetic.source_html_sha256=hash(fixture);synthetic.partial_scope.text_sha256=scopeHash(expected);synthetic.partial_scope.notice_sha256=scopeHash(english.atiNotice(fixture));
 const single={...manifest,links:[synthetic]};
 const result=spawnSync(python,['-c',`import sys,json,tempfile,pathlib,copy
sys.path.insert(0,'scripts/canon')
from reviewed_partial_pages import manifest_rows,reviewed_partial_links,withhold_partial_page_proposals
x=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp);m=p/'manifest.json';source=p/('source'+x['manifest']['links'][0]['path']+'.html');source.parent.mkdir(parents=True)
 source.write_bytes(x['html'].encode('utf-8'));m.write_text(json.dumps(x['manifest']),encoding='utf-8')
 assert list(reviewed_partial_links(x['canon'],p/'source',m))==['pli-tv-kd1']
 original={'wrong-owner':[{'source':'ati','path':x['manifest']['links'][0]['path']}]};out,removed=withhold_partial_page_proposals(original,m);assert out=={} and len(removed)==1
 for field,value in [('unit_id','pli-tv-kd2'),('path','/tipitaka/vin/mv/unreviewed'),('translator','Unreviewed'),('license','Olendzki-free-distribution-2005'),('extractor','ati-freeverse-v1'),('version',2)]:
  bad=copy.deepcopy(x['manifest']);r=bad['links'][0]
  if field in ['extractor','version']:r['partial_scope'][field]=value
  else:r[field]=value
  m.write_text(json.dumps(bad),encoding='utf-8')
  try:manifest_rows(m)
  except ValueError:pass
  else:raise AssertionError(field)
 for kind in ['html','root','pali','text','notice','first-ref','last-ref']:
  bad=copy.deepcopy(x['manifest']);r=bad['links'][0]
  if kind=='html':source.write_bytes((x['html']+'changed').encode('utf-8'))
  elif kind=='root':r['root']['root_blocks_sha256']='0'*64
  elif kind=='first-ref':r['partial_scope']['first_ref']='pli-tv-kd1/189'
  elif kind=='last-ref':r['partial_scope']['last_ref']='pli-tv-kd1/202'
  else:r['partial_scope'][kind+'_sha256']='0'*64
  m.write_text(json.dumps(bad),encoding='utf-8')
  try:reviewed_partial_links(x['canon'],p/'source',m)
  except ValueError:pass
  else:raise AssertionError(kind)
  source.write_bytes(x['html'].encode('utf-8'))
print('Upatissa build gates verified')`],{input:JSON.stringify({manifest:single,html:fixture,canon:{source:canon.source(),units:[unit],books}}),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},maxBuffer:2*1024*1024});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/Upatissa build gates verified/);
});

const sourceDir=process.env.PALI_UPATISSA_SOURCE_ROOT||process.env.PALI_VINAYA_PARTIALS_SOURCE_DIR;
test('optional pinned official Upatissa artifact verifies all mixed body, full notice and root pins',{skip:!sourceDir},()=>{
 const file=join(sourceDir,row.path+'.html');assert.ok(existsSync(file),'Required pinned official source file: '+file);
 const raw=readFileSync(file),html=raw.toString('utf8');assert.equal(hash(raw),row.source_html_sha256);
 const text=atiPartialExcerpt(html,extractor);assert.equal(text.length,5452);assert.equal(scopeHash(text),row.partial_scope.text_sha256);assert.equal(scopeHash(english.atiNotice(html)),row.partial_scope.notice_sha256);
 assert.equal(text.split('\n\n').length,27);assert.equal(text.split('\n\n').filter(b=>b.includes('\n')).length,6);
 for(const marker of inlineMutations)assert.throws(()=>atiPartialExcerpt(html.replace('<p>','<p>'+marker),extractor),/structure changed/);
});
