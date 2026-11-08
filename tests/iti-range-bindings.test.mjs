import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {translationCoverage} from '../src/providers.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {buildIndex} from '../scripts/export-index.mjs';
import {liveCache} from '../src/cache.mjs';
const audit=JSON.parse(readFileSync('docs/data/iti-range-binding-audit.json'));
const manifest=JSON.parse(readFileSync('scripts/canon/reviewed_shared_pages.json'));
const rows=manifest.links.filter(r=>audit.rows.some(a=>a.path===r.path));
let saved;const oldFetch=globalThis.fetch;
afterEach(()=>{if(saved)canon.load().translations=saved;saved=undefined;globalThis.fetch=oldFetch;liveCache.clear();translationCoverage({refresh:true});});
const sha=s=>createHash('sha256').update(s).digest('hex');

test('all seven misbound ordinary versions are removed while each independent DT owner stays',()=>{
 assert.equal(audit.rows.length,7);assert.equal(rows.length,4);
 for(const a of audit.rows){const u=canon.resolve(a.owner).unit,all=english.available(u);assert.ok(all.some(l=>l.translation_id==='dt:KN/Iti/'+a.owner));assert.equal(all.some(l=>l.translation_id==='ati:'+a.path&&!l.translation_scope),false);assert.equal(sha(JSON.stringify(canon.load().canon.books[u.book].blocks.slice(u.start,u.end))),a.withdrawn_owner_root_blocks_sha256);
  const links=Object.values(canon.load().translations).flat().filter(l=>l.path===a.path);assert.equal(links.length,a.decision==='shared_page'?1:0);
  assert.throws(()=>canon.resolve('https://www.accesstoinsight.org'+a.path+'.html'),a.decision==='shared_page'?/Shared-page URL/:/not linked/);
 }
});

test('four exact primary scopes retain complete root pins, overlapping versions and distinct BPS rights',()=>{
 assert.deepEqual(rows.map(r=>r.text_ids.length),[27,4,22,13]);assert.equal(rows.reduce((n,r)=>n+r.text_ids.length,0),66);const ids=new Set(rows.flatMap(r=>r.text_ids));assert.equal(ids.size,62);
 for(const row of rows){const selected=row.root_units.map(p=>{const u=canon.resolve(p.id).unit;assert.equal(u.id,p.id);assert.equal(u.kind,undefined);assert.equal(u.members,undefined);assert.equal(u.approximate,undefined);assert.equal(u.title,p.title);assert.equal(u.vri,p.vri);assert.equal(sha(JSON.stringify(canon.load().canon.books[u.book].blocks.slice(u.start,u.end))),p.root_blocks_sha256);return{id:u.id,segments:canon.segments(u).map(({ref,type,text})=>({ref,type,text}))};});assert.equal(scopeHash(selected),row.pali_segments_sha256);assert.equal(row.notice_sha256,audit.rows.find(a=>a.path===row.path).notice_sha256);}
 const ones=rows.find(r=>r.owner_id==='iti1');assert.equal(ones.presentation,'condensed');assert.ok(['iti10','iti11','iti12','iti13'].every(id=>ones.text_ids.includes(id)));assert.match(ones.mapping_note,/not omitted/);
 assert.equal(rows.find(r=>r.owner_id==='iti24').license,'BPS');
 for(const id of ids){const m=canon.describe(canon.resolve(id).unit),expected=rows.filter(r=>r.text_ids.includes(id));assert.equal(m.shared_english_available,expected.length);assert.equal(m.english_available,['iti10','iti11','iti12','iti13'].includes(id)?0:1);for(const row of expected){const s=m.english.find(l=>l.translation_id==='ati:'+row.path).translation_scope;assert.equal(s.whole_unit_coverage,false);assert.equal(s.individual_alignment_verified,false);assert.deepEqual(s.text_ids,row.text_ids);assert.equal(s.condensed,row.presentation==='condensed');assert.ok(s.notice_sha256);}}
 for(const id of ['iti50','iti99'])assert.equal(canon.describe(canon.resolve(id).unit).shared_english_available||0,0);
});

test('source pages add 62 distinct shared subjects and four current shared-only records after the DT collection hold; whole coverage is not inflated',()=>{
 const d=canon.load();saved=d.translations;const before=translationCoverage({refresh:true}).total,paths=new Set(rows.map(r=>r.path));d.translations=Object.fromEntries(Object.entries(saved).map(([uid,ls])=>[uid,ls.filter(l=>!paths.has(l.path))]).filter(([,ls])=>ls.length));const after=translationCoverage({refresh:true}).total;
 for(const key of ['links','with_english','with_english_including_inherited'])assert.equal(before[key],after[key]);assert.equal(before.shared_links,after.shared_links+4);assert.equal(before.with_shared_english,after.with_shared_english+62);assert.equal(before.shared_only,after.shared_only+4);assert.equal(before.links,2569);assert.equal(before.shared_links,12);assert.equal(before.with_shared_english,110);assert.equal(before.shared_only,52);
 d.translations=saved;const exp=buildIndex();for(const id of ['iti11','iti12','iti13'])assert.equal(exp.texts.find(t=>t.id===id).english_count,0);
});

test('all seven exact versions refuse implicit scope or withheld selection before any network',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No source request permitted');};
 for(const a of audit.rows){const u=canon.resolve(a.owner).unit,id='ati:'+a.path;await assert.rejects(english.translation(u,id),a.decision==='shared_page'?/allow_shared/:/not linked|not available/);await assert.rejects(verifyQuote({text:'Synthetic distinct neighbouring discourse wording',language:'english',texts:[a.owner],translation_ids:[id]}),a.decision==='shared_page'?/include_shared/:/not linked|not available/);}
 assert.equal(calls,0);
});

test('reviewed scopes return neighbouring-section witnesses only as pages with pinned continuation and complete notice',async()=>{
 saved=canon.load().translations;canon.load().translations=structuredClone(saved);
 const text=('Synthetic owner and neighbouring discourse fixture. Violet copper lantern by the window. '.repeat(120)).trim(),html=`<!-- BEGIN COPYRIGHTED TEXT CHUNK -->${text}<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic complete notice, not an actual grant.</div><div id="F_citation">Synthetic attribution.</div>`;
 for(const row of rows){const id='ati:'+row.path,l=canon.load().translations[row.owner_id].find(l=>l.path===row.path);l.shared_scope.text_sha256=scopeHash(text);l.shared_scope.notice_sha256=scopeHash(english.atiNotice(html));liveCache.clear();globalThis.fetch=async()=>new Response(html);const first=await english.translation(canon.resolve(row.owner_id).unit,id,{allow_shared:true,limit:500});assert.equal(first.text_id,null);assert.equal(first.whole_unit_coverage,false);assert.deepEqual(first.translation_scope.text_ids,row.text_ids);const{uid,translation,...next}=first.continue_with.arguments;assert.equal((await english.translation(canon.resolve(uid).unit,translation,next)).text,text.slice(500,1000));
  const args={text:'Violet copper lantern by the window',language:'english',texts:[row.owner_id],translation_ids:[id],include_shared:true};const yes=await verifyQuote(args);assert.equal(yes.verdict,'found');assert.equal(yes.matches[0].text_id,null);assert.match(yes.explanation,/do not establish any individual/);const no=await verifyQuote({...args,text:'Green zeppelins juggle invisible otters'});assert.equal(no.verdict,'not_found_in_scope');assert.match(no.explanation,/do not establish any individual/);liveCache.clear();globalThis.fetch=async()=>new Response(html.replace('Synthetic complete notice','Changed notice'));await assert.rejects(english.translation(canon.resolve(row.owner_id).unit,id,{allow_shared:true}),/notice changed/);
 }
});

test('narrow BPS manifest support retains member cap, exact scope checks and unsupported licence rejection',()=>{
 const run=spawnSync('python',['-c',`import json,sys,tempfile,pathlib,copy
sys.path.insert(0,'scripts/canon')
from reviewed_shared_pages import manifest_rows,withhold_shared_page_proposals
m=json.load(open('scripts/canon/reviewed_shared_pages.json',encoding='utf-8'));assert manifest_rows()['links'][-3]['license']=='BPS'
a={'wrong':[{'source':'ati','path':r['path'],'url':'https://accesstoinsight.org'+r['path']+'.html'} for r in m['links'] if r['owner_id'] in ('iti1','iti24','iti28','iti100')]};old=copy.deepcopy(a);out,removed=withhold_shared_page_proposals(a);assert out=={} and len(removed)==4 and old==a
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)/'manifest.json'
 for mode in ('licence','cap','duplicate'):
  x=copy.deepcopy(m);r=x['links'][-3]
  if mode=='licence':r['license']='CC0'
  if mode=='cap':r['text_ids']=['iti'+str(i) for i in range(24,57)]
  if mode=='duplicate':r['text_ids'].append(r['text_ids'][0])
  p.write_text(json.dumps(x),encoding='utf-8')
  try:manifest_rows(p)
  except ValueError:pass
  else:raise AssertionError('Invalid '+mode+' accepted')
print('passed')`],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(run.status,0,run.stderr);assert.match(run.stdout,/passed/);
});
