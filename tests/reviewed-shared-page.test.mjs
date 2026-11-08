import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { plainText } from '../src/http.mjs';
import { scopeHash } from '../src/translation-scope.mjs';
import { verifyQuote } from '../src/verify.mjs';
import { translationCoverage } from '../src/providers.mjs';
import { buildCoverage } from '../scripts/coverage.mjs';
import { buildIndex, toCsv } from '../scripts/export-index.mjs';
import { liveCache } from '../src/cache.mjs';
const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json','utf8')),row=manifest.links[0];
const ids=row.text_ids,id=`ati:${row.path}`,owner=ids[0];
let saved;const originalFetch=globalThis.fetch;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=originalFetch;liveCache.clear();translationCoverage({refresh:true});});
const fixtureText=('Synthetic fixture only: amber lantern copper window. '.repeat(45)+'Synthetic ending.').trim();
const fixtureHtml=`<body><!-- BEGIN COPYRIGHTED TEXT CHUNK -->${fixtureText}<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic test-only notice, no actual licence grant.</div><div id="F_citation">Synthetic test-only attribution.</div></body>`;
function syntheticSnapshot(){const d=canon.load();saved=d.translations;const link=structuredClone(d.translations[owner][0]);link.shared_scope.text_sha256=scopeHash(fixtureText);link.shared_scope.notice_sha256=scopeHash(english.atiNotice(fixtureHtml));d.translations={...d.translations,[owner]:[link]};return link;}

test('reviewed compilation exposes one owner and four subjects while whole-unit counts stay unchanged',()=>{
 const d=canon.load();saved=d.translations;
 assert.equal(Object.values(d.translations).flat().filter(l=>l.path===row.path).length,1);
 const withShared=translationCoverage({refresh:true}).total,cli=buildCoverage();
 for(const uid of ids){const m=canon.describe(canon.resolve(uid).unit);assert.equal(m.english_available,0);assert.equal(m.shared_english_available,1);const s=m.english[0].translation_scope;assert.equal(s.presentation,'compilation');assert.equal(s.condensed,false);assert.equal(s.whole_unit_coverage,false);assert.equal(s.individual_alignment_verified,false);assert.deepEqual(s.text_ids,ids);assert.equal(s.text_sha256,row.text_sha256);assert.equal(s.notice_sha256,row.notice_sha256);}
 const selected=row.root_units.map(r=>{const u=canon.resolve(r.id).unit;assert.equal(u.title,r.title);assert.equal(u.vri,r.vri);assert.equal(createHash('sha256').update(JSON.stringify(d.canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),r.root_blocks_sha256);return{id:r.id,segments:canon.segments(u).map(({ref,type,text})=>({ref,type,text}))};});
 assert.equal(scopeHash(selected),row.pali_segments_sha256);
 d.translations={...d.translations};delete d.translations[owner];const without=translationCoverage({refresh:true}).total;
 for(const k of ['links','with_english','with_english_including_inherited'])assert.equal(withShared[k],without[k]);
 assert.equal(withShared.shared_links,(without.shared_links||0)+1);assert.equal(withShared.with_shared_english,(without.with_shared_english||0)+4);assert.equal(withShared.shared_only,(without.shared_only||0)+4);
 assert.equal(cli.shared_links,1);assert.equal(cli.shared_texts,4);assert.equal(cli.shared_ati,1);
});

test('actual compilation metadata requires exact consent and refuses URL attribution or adjacent-unit selection before fetch',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 assert.throws(()=>canon.resolve('https://accesstoinsight.org'+row.path+'.html'),/Shared-page URL.*an1.49.*an1.52/);
 for(const uid of ids){const u=canon.resolve(uid).unit;for(const[which,opts]of[[undefined,{}],[id,{}],[row.translator,{allow_shared:true}],[id,{allow_partial:true}]])await assert.rejects(english.translation(u,which,opts),/shared|scoped/i);}
 await assert.rejects(english.translation(canon.resolve('an1.48').unit,id,{allow_shared:true}),/not linked|not available/i);
 await assert.rejects(verifyQuote({text:'Synthetic fixture only amber lantern',language:'english',texts:['an1.51'],translation_ids:[id]}),/include_shared/);
 assert.equal(calls,0);
});

test('compiled page synthetic provider preserves page-level verification and pinned independent continuation',async()=>{
 syntheticSnapshot();globalThis.fetch=async()=>new Response(fixtureHtml);
 const first=await english.translation(canon.resolve('an1.51').unit,id,{allow_shared:true,limit:500});
 assert.equal(first.text_id,null);assert.equal(first.requested_text_id,'an1.51');assert.equal(first.translation_scope.presentation,'compilation');assert.equal(first.translation_scope.condensed,false);assert.equal(first.text,fixtureText.slice(0,500));
 const {uid,translation,...args}=first.continue_with.arguments;
 const next=await english.translation(canon.resolve(uid).unit,translation,args);assert.equal(next.text,fixtureText.slice(500,1000));
 const query={text:'amber lantern copper window',language:'english',texts:['an1.49','an1.52'],translation_ids:[id],include_shared:true};
 const positive=await verifyQuote(query);assert.equal(positive.verdict,'found');assert.equal(positive.matches[0].text_id,null);assert.equal(positive.matches[0].whole_unit_coverage,false);assert.deepEqual(positive.matches[0].unverified_requested_text_ids,['an1.49','an1.52']);assert.match(positive.explanation,/declared multi-discourse source pages only/);
 const negative=await verifyQuote({...query,text:'Purple zeppelins carry velvet otters'});assert.equal(negative.verdict,'not_found_in_scope');assert.match(negative.explanation,/do not establish any individual/);
 liveCache.clear();globalThis.fetch=async()=>new Response(fixtureHtml.replace('test-only notice','changed test-only notice'));
 await assert.rejects(english.translation(canon.resolve(owner).unit,id,{allow_shared:true}),/notice changed/);
 const changed=structuredClone(canon.load().translations[owner][0]);changed.shared_scope.notice_sha256='0'.repeat(64);canon.load().translations={...canon.load().translations,[owner]:[changed]};
 await assert.rejects(english.translation(canon.resolve(uid).unit,translation,args),/mapping changed/);
});

test('real source and notice drift refuse output, and compilation presentation cannot lose its notice pin',async()=>{
 globalThis.fetch=async()=>new Response(fixtureHtml);
 await assert.rejects(english.translation(canon.resolve(owner).unit,id,{allow_shared:true}),/source text changed/);
 const d=canon.load();saved=d.translations;
 for(const change of [p=>delete p.notice_sha256,p=>p.notice_sha256='bad',p=>p.presentation='complete',p=>{p.presentation='condensed';delete p.notice_sha256;}]){const link=structuredClone(saved[owner][0]);change(link.shared_scope);d.translations={...saved,[owner]:[link]};assert.throws(()=>english.available(canon.resolve(owner).unit),/Invalid or unreviewed/);}
});

test('export retains complete compilation scope and leaves legacy whole-unit CSV columns empty',()=>{
 const index=buildIndex();for(const t of index.texts.filter(t=>ids.includes(t.id))){assert.equal(t.english_count,0);assert.equal(t.shared_english_count,1);assert.equal(t.english[0].translation_scope.presentation,'compilation');assert.equal(t.english[0].translation_scope.condensed,false);}
 const csv=toCsv(index);assert.ok(csv.includes('""presentation"":""compilation""'));assert.ok(csv.includes(row.path));
});

const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
test('reviewed shared builder verifies complete root, HTML, extracted text and notice before changing any binding',{skip:!python},()=>{
 const d=canon.load(),units=ids.map(uid=>({...canon.resolve(uid).unit,book:0,start:canon.resolve(uid).unit.start-61,end:canon.resolve(uid).unit.end-61}));
 const book={blocks:d.canon.books[canon.resolve(owner).unit.book].blocks.slice(61,67)};
 const m=structuredClone(manifest);m.links[0].source_html_sha256=createHash('sha256').update(fixtureHtml).digest('hex');m.links[0].text_sha256=scopeHash(fixtureText);m.links[0].notice_sha256=scopeHash(english.atiNotice(fixtureHtml));
 const payload={canon:{source:d.canon.source,units,books:[book]},manifest:m,html:fixtureHtml};
 const code=`import sys,json,tempfile,pathlib,copy,hashlib
sys.path.insert(0,'scripts/canon')
from reviewed_shared_pages import apply_reviewed_shared_links,withhold_shared_page_proposals
x=json.load(sys.stdin);c=x['canon'];m=x['manifest'];r=m['links'][0]
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);path=root/(r['path'].lstrip('/')+'.html');path.parent.mkdir(parents=True);path.write_text(x['html'],encoding='utf-8');mp=root/'manifest.json';mp.write_text(json.dumps(m),encoding='utf-8')
 old={'wrong':[{'source':'ati','path':r['path'],'url':'https://www.accesstoinsight.org'+r['path']+'.html'}],'safe':[{'source':'ati','path':'/tipitaka/an/other','url':'https://accesstoinsight.org/tipitaka/an/other.html'}]};original=copy.deepcopy(old)
 out,report=apply_reviewed_shared_links(old,c,root,mp);assert old==original and list(out)==['safe',r['owner_id']] and len(report['page_bindings_replaced'])==1
 again,_=apply_reviewed_shared_links(out,c,root,mp);assert again==out
 withheld,_=withhold_shared_page_proposals(old,mp);assert list(withheld)==['safe']
 bad=copy.deepcopy(c);bad['books'][0]['blocks'][0][2]+=' changed'
 try:apply_reviewed_shared_links(old,bad,root,mp)
 except ValueError as e:assert 'root wording' in str(e)
 else:raise AssertionError('Root drift accepted')
 for field,word in [('text_sha256','extracted text'),('notice_sha256','notice')]:
  changed=copy.deepcopy(m);changed['links'][0][field]='0'*64;mp.write_text(json.dumps(changed),encoding='utf-8')
  try:apply_reviewed_shared_links(old,c,root,mp)
  except ValueError as e:assert word in str(e),str(e)
  else:raise AssertionError('Changed source evidence accepted')
  assert old==original
 changed=copy.deepcopy(m);changed['links']*=2;mp.write_text(json.dumps(changed),encoding='utf-8')
 try:apply_reviewed_shared_links(old,c,root,mp)
 except ValueError:pass
 else:raise AssertionError('Duplicate page accepted')
print('passed')`;
 const r=spawnSync(python,['-c',code],{input:JSON.stringify(payload),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/passed/);
});
