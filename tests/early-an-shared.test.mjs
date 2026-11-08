import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import { scopeHash } from '../src/translation-scope.mjs';
import { verifyQuote } from '../src/verify.mjs';
import { translationCoverage } from '../src/providers.mjs';
import { liveCache } from '../src/cache.mjs';
const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json','utf8'));
const rows=manifest.links.filter(r=>['an1.21','an2.125'].includes(r.owner_id));
const originalFetch=globalThis.fetch;let saved;
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();if(saved)canon.load().translations=saved;saved=undefined;translationCoverage({refresh:true});});

test('early AN compilations pin exactly twenty mind passages and two voice passages, not individual translations',()=>{
 assert.equal(rows.length,2);
 assert.deepEqual(rows[0].text_ids,Array.from({length:20},(_,i)=>`an1.${i+21}`));
 assert.deepEqual(rows[1].text_ids,['an2.125','an2.126']);
 for(const row of rows){
  const selected=row.root_units.map(r=>{const u=canon.resolve(r.id).unit;assert.equal(u.title,r.title);assert.equal(u.vri,r.vri);assert.equal(createHash('sha256').update(JSON.stringify(canon.load().canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),r.root_blocks_sha256);return{id:r.id,segments:canon.segments(u).map(({ref,type,text})=>({ref,type,text}))};});
  assert.equal(scopeHash(selected),row.pali_segments_sha256);
  assert.equal(Object.values(canon.load().translations).flat().filter(l=>l.path===row.path).length,1);
  for(const uid of row.text_ids){const m=canon.describe(canon.resolve(uid).unit);assert.equal(m.english_available,0);assert.equal(m.shared_english_available,1);const scope=m.english[0].translation_scope;assert.deepEqual(scope.text_ids,row.text_ids);assert.equal(scope.whole_unit_coverage,false);assert.equal(scope.individual_alignment_verified,false);assert.equal(scope.presentation,'compilation');assert.equal(scope.notice_sha256,row.notice_sha256);}
 }
 assert.deepEqual(rows[1].root_units.map(r=>r.vri),['126','127']);
 for(const uid of ['an1.20','an1.41','an2.123','an2.124','an2.127'])assert.equal(canon.describe(canon.resolve(uid).unit).english.some(l=>rows.some(r=>l.translation_id===`ati:${r.path}`)),false);
 const before=translationCoverage({refresh:true}).total;saved=canon.load().translations;canon.load().translations={...saved};for(const row of rows)delete canon.load().translations[row.owner_id];const after=translationCoverage({refresh:true}).total;
 for(const key of ['links','with_english','with_english_including_inherited'])assert.equal(before[key],after[key]);
 assert.equal(before.shared_links,after.shared_links+2);assert.equal(before.with_shared_english,after.with_shared_english+22);assert.equal(before.shared_only,after.shared_only+22);
});

test('actual shared IDs reject implicit consent and neighboring misnumbered units without network',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 for(const row of rows){const id=`ati:${row.path}`;for(const uid of row.text_ids)await assert.rejects(english.translation(canon.resolve(uid).unit,id),/shared|scoped/i);assert.throws(()=>canon.resolve('https://accesstoinsight.org'+row.path+'.html'),/Shared-page URL/);await assert.rejects(verifyQuote({text:'Synthetic source phrase',language:'english',texts:[row.owner_id],translation_ids:[id]}),/include_shared/);}
 await assert.rejects(english.translation(canon.resolve('an2.123').unit,`ati:${rows[1].path}`,{allow_shared:true}),/not linked|not available|No English translation/i);assert.equal(calls,0);
});

test('both new compilations preserve page-only quotations, notices and pinned continuation with synthetic providers',async()=>{
 saved=canon.load().translations;canon.load().translations=structuredClone(saved);
 for(const row of rows){
  const text=('Synthetic violet compass copper lantern. '.repeat(40)).trim();
  const html=`<!-- BEGIN COPYRIGHTED TEXT CHUNK -->${text}<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic test notice, not a rights grant.</div><div id="F_citation">Synthetic citation.</div>`;
  const link=canon.load().translations[row.owner_id][0];link.shared_scope.text_sha256=scopeHash(text);link.shared_scope.notice_sha256=scopeHash(english.atiNotice(html));globalThis.fetch=async()=>new Response(html);liveCache.clear();
  const id=`ati:${row.path}`,uid=row.text_ids.at(-1),first=await english.translation(canon.resolve(uid).unit,id,{allow_shared:true,limit:500});
  assert.equal(first.text_id,null);assert.equal(first.whole_unit_coverage,false);assert.equal(first.requested_text_id,uid);assert.equal(first.text,text.slice(0,500));assert.match(first.license,/Synthetic test notice/);
  const {uid:nextUid,translation,...args}=first.continue_with.arguments;const next=await english.translation(canon.resolve(nextUid).unit,translation,args);assert.equal(next.text,text.slice(500,1000));
  const q={text:'violet compass copper lantern',language:'english',texts:[row.owner_id,uid],translation_ids:[id],include_shared:true};const found=await verifyQuote(q);assert.equal(found.verdict,'found');assert.equal(found.matches[0].text_id,null);assert.equal(found.matches[0].whole_unit_coverage,false);assert.match(found.explanation,/do not establish any individual/);
  const absent=await verifyQuote({...q,text:'Purple zeppelins carry velvet otters'});assert.equal(absent.verdict,'not_found_in_scope');assert.match(absent.explanation,/do not establish any individual/);
  liveCache.clear();globalThis.fetch=async()=>new Response(html.replace('Synthetic test notice','Changed notice'));await assert.rejects(english.translation(canon.resolve(uid).unit,id,{allow_shared:true}),/notice changed/);
 }
});

const heldPath='/tipitaka/an/an01/an01.031-040x.wood',heldUrl='https://www.accesstoinsight.org'+heldPath+'.html';
test('Woodward excerpt cannot masquerade as individual AN1.31 through metadata, URL, translation or quote',async()=>{
 assert.equal(Object.values(canon.load().translations).flat().some(l=>l.path===heldPath),false);assert.throws(()=>canon.resolve(heldUrl),/not linked/);let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch');};
 await assert.rejects(english.translation(canon.resolve('an1.31').unit,`ati:${heldPath}`),/not linked|not available|No English translation/i);
 await assert.rejects(verifyQuote({text:'Synthetic test source phrase',language:'english',texts:['an1.31'],translation_ids:[`ati:${heldPath}`],include_shared:true}),/not linked|not available|No English translation/i);assert.equal(calls,0);
});

test('post-linker ATI hold is global, idempotent and validates source-specific host/path before mutation',()=>{
 const run=spawnSync('python',['-c',`import json,sys,copy,tempfile,pathlib
sys.path.insert(0,'scripts/canon')
from reviewed_exclusions import apply_reviewed_exclusions,MANIFEST
url='https://www.accesstoinsight.org/tipitaka/an/an01/an01.031-040x.wood.html'
a={'an1.31':[{'source':'ati','url':url}],'wrong':[{'source':'dhammatalks','url':url.replace('https://www.','http://')+'?bypass=1','shared_scope':{}}],'safe':[{'source':'ati','url':'https://accesstoinsight.org/tipitaka/an/an01/an01.021-040.than.html'}]}
old=copy.deepcopy(a);out,removed=apply_reviewed_exclusions(a);assert a==old and len(removed)==2 and list(out)==['safe'];assert apply_reviewed_exclusions(out)==(out,[])
m=json.loads(MANIFEST.read_text());index=next(i for i,r in enumerate(m['exclusions']) if r['source']=='ati')
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)/'manifest.json'
 for fields in [{'source':'dhammatalks'},{'url':url.replace('/tipitaka/','/lib/')},{'url':url+'?x=1'},{'url':'https://unreviewed.invalid/page.html'}]:
  x=copy.deepcopy(m);x['exclusions'][index].update(fields);p.write_text(json.dumps(x))
  try:apply_reviewed_exclusions(a,p)
  except ValueError:pass
  else:raise AssertionError('Invalid hold accepted')
  assert a==old
print('passed')`],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/passed/);
});

test('ordinary translation rebuild cannot recreate the Woodward number/title match',()=>{
 const u=canon.resolve('an1.31').unit,control=canon.resolve('an1.21').unit;
 const result=spawnSync('python',['-c',`import sys,json,tempfile,pathlib,gzip,subprocess
x=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)
 with gzip.open(p/'canon.gz','wt',encoding='utf-8') as f:json.dump({'units':x},f)
 pages=[{'path':'tipitaka/an/an01/an01.031-040x.wood.html','html_title':'Adanta Suttas: Untamed','pts':'A i 5','author':'F.L. Woodward','license':'BPS'},{'path':'tipitaka/an/an01/an01.021.synthetic.html','html_title':x[1]['title']+': Synthetic control','author':'Synthetic only','license':'Synthetic only'}]
 (p/'ati.json').write_text(json.dumps(pages));(p/'dt.json').write_text('[]')
 a=subprocess.run([sys.executable,'scripts/canon/build_translations.py',str(p/'canon.gz'),str(p/'dt.json'),str(p/'ati.json'),str(p/'out.json')],capture_output=True,text=True,encoding='utf-8')
 assert a.returncode==0,a.stderr
 out=json.loads((p/'out.json').read_text());assert list(out)==['an1.21'],out
 assert 'an01.031-040x.wood.html' in a.stdout and 'reviewed_exclusions' in a.stdout,a.stdout
print('passed')`],{encoding:'utf8',input:JSON.stringify([u,control])});assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/passed/);
});
