import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {verifyQuote} from '../src/verify.mjs';
import {scopeScreen,mappingFingerprint} from '../scripts/source-scope-screen.mjs';
const audit=JSON.parse(readFileSync('docs/data/verse-scope-review.json','utf8'));
const held=audit.rows.filter(r=>r.decision==='withhold-partial-unit'),retained=audit.rows.filter(r=>r.decision==='retain');
const sha=v=>createHash('sha256').update(v).digest('hex');
const originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
const run=(code,input)=>spawnSync(python,['-c',code],{encoding:'utf8',input:JSON.stringify(input),env:{...process.env,PYTHONUTF8:'1'}});

test('fifteen primary reviews pin complete roots and source-specific notices without treating headers as content extent',()=>{
 assert.equal(audit.rows.length,15);assert.equal(held.length,10);assert.equal(retained.length,5);
 for(const r of audit.rows){const u=canon.resolve(r.owner).unit;assert.deepEqual([u.book,u.start,u.end,u.vri],[r.root.book,r.root.start,r.root.end,r.root.vri]);assert.equal(sha(JSON.stringify(canon.load().canon.books[u.book].blocks.slice(u.start,u.end))),r.root.root_blocks_sha256);for(const key of ['source_html_sha256','text_sha256','notice_sha256','link_metadata_sha256'])assert.match(r[key],/^[0-9a-f]{64}$/);assert.ok(r.notice_characters>100);}
 for(const r of retained){const l=canon.load().translations[r.owner].find(l=>canon.translationId(l)===r.translation_id);assert.ok(l);assert.equal(l.reference,r.publisher_reference);assert.equal(l.license,r.publisher_licence_label);assert.equal(mappingFingerprint(r.owner,l),r.link_metadata_sha256);}
 const dantika=retained.filter(r=>r.owner==='thig3.4');assert.equal(dantika.length,2);assert.ok(dantika.some(r=>r.publisher_licence_label==='BPS'));assert.ok(dantika.some(r=>r.publisher_licence_label==='CC-BY-NC'));
});

test('all ten excerpt versions refuse exact retrieval, URLs and quote verification before fetch while independent sources remain',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Must not fetch held source');};
 for(const r of held){const u=canon.resolve(r.owner).unit,choices=english.available(u);assert.equal(choices.some(l=>l.translation_id===r.translation_id),false);assert.ok(choices.some(l=>l.translation_id.startsWith('dt:')&&!l.translation_scope));assert.throws(()=>canon.resolve(r.url),/not linked/);await assert.rejects(english.translation(u,r.translation_id),/not linked|not available|No English/);await assert.rejects(verifyQuote({text:'Synthetic fixture only amber lantern copper window',language:'english',texts:[r.owner],translation_ids:[r.translation_id],include_partial:true,include_shared:true}),/not linked|not available|No English/);}
 assert.equal(calls,0);
 for(const id of ['snp3.12','thag6.13','thig10.1','snp4.15','thag16.8'])assert.ok(english.available(canon.resolve(id).unit).some(l=>l.translation_id.startsWith('ati:')&&/than/i.test(l.translation_id)&&!l.translation_scope));
});

test('Somamitta owns his opening verse and Herannakani remains a complete separate poem without source wording changes',async()=>{
 const d=canon.load(),left=canon.resolve('thag2.13').unit,right=canon.resolve('thag2.14').unit;
 assert.equal(sha(JSON.stringify(d.canon.books[34].blocks)),audit.root_repair.book_blocks_sha256);
 assert.deepEqual([left.start,left.end,left.vri],[807,815,'145–146']);assert.deepEqual([right.start,right.end,right.vri],[815,824,'147–148']);assert.equal(left.end,right.start);
 assert.equal(d.canon.books[34].blocks[left.end-1][2],'… Heraññakānitthero….');assert.equal(d.canon.books[34].blocks[right.start][2],'4. Somamittattheragāthā');
 const a=canon.segments(left),b=canon.segments(right);assert.deepEqual(a.filter(s=>s.vri_paragraph).map(s=>s.vri_paragraph),['145','146']);assert.deepEqual(b.filter(s=>s.vri_paragraph).map(s=>s.vri_paragraph),['147','148']);assert.ok(!a.some(s=>s.text.includes('Parittaṃ dārumāruyha')));assert.ok(b.some(s=>s.text.includes('Parittaṃ dārumāruyha')));
 const q=await verifyQuote({text:'Parittaṃ dārumāruyha, yathā sīde mahaṇṇave',language:'pali',texts:['thag2.14']});assert.equal(q.verdict,'found');assert.ok(q.matches.some(m=>m.text_id==='thag2.14'));assert.ok(!q.matches.some(m=>m.text_id==='thag2.13'));
 assert.ok(english.available(left).some(l=>l.translation_id==='ati:/tipitaka/kn/thag/thag.02.13.than'));
});

test('screen prioritizes narrow/discontinuous leads, normalizes abbreviated bibliography and expires stale review annotations',()=>{
 const d=canon.load(),review=structuredClone(audit),out=scopeScreen(d,{review});assert.equal(out.count,224);assert.equal(out.reviewed_retained_snapshots,5);assert.equal(out.unreviewed_leads,219);assert.ok(out.rows.filter(r=>r.review_status==='reviewed-retained-at-snapshot').every(r=>r.triage==='reviewed retained snapshot'));
 const abbreviated=out.rows.find(r=>r.translation_id==='ati:/tipitaka/kn/thag/thag.10.02.olen');assert.equal(abbreviated.triage,'inspect discontinuous verse-reference extent');assert.deepEqual(abbreviated.publisher_reference_extents.map(x=>[x.first,x.last]),[[537,541],[544,545]]);
 review.rows[0].root.root_blocks_sha256='0'.repeat(64);let stale=scopeScreen(d,{review}).rows.find(r=>r.translation_id===review.rows[0].translation_id);assert.equal(stale.review_status,'stale-reviewed-snapshot');assert.equal(stale.triage,'inspect wider verse-reference extent');
 review.rows[0].root.root_blocks_sha256=audit.rows[0].root.root_blocks_sha256;review.rows[0].link_metadata_sha256='0'.repeat(64);stale=scopeScreen(d,{review}).rows.find(r=>r.translation_id===review.rows[0].translation_id);assert.equal(stale.review_status,'stale-reviewed-snapshot');
 const synthetic={canon:{source:{commit:'fixture'}},byId:new Map([['x',{id:'x',collection:'thig',vri:'1–20',book:0,start:0,end:2}],['y',{id:'y',collection:'thig',vri:'1–20',book:0,start:2,end:4}]]),translations:{x:[{source:'ati',path:'/tipitaka/kn/thig/fixture',url:'https://accesstoinsight.org/tipitaka/kn/thig/fixture.html',reference:'Thig 3–5'}],y:[{source:'ati',path:'/tipitaka/kn/thig/fixture2',url:'https://accesstoinsight.org/tipitaka/kn/thig/fixture2.html',reference:'Thig 1–4, 9–12'}]}};
 const s=scopeScreen(synthetic);assert.equal(s.rows[0].triage,'inspect discontinuous verse-reference extent');assert.equal(s.rows[1].triage,'inspect narrower verse-reference extent');assert.equal(s.reviewed_retained_snapshots,0);
});

test('partial holds are narrowly validated, global and immutable and survive ordinary linker rebuilds',{skip:!python},()=>{
 const units=[...new Set(held.map(r=>r.owner))].map(id=>canon.resolve(id).unit);
 const r=run(`import json,sys,copy,tempfile,pathlib,gzip,subprocess
sys.path.insert(0,'scripts/canon')
from reviewed_exclusions import apply_reviewed_exclusions,MANIFEST
x=json.load(sys.stdin);held=x['held'];a={row['owner']:[{'source':'ati','url':row['url']+'?alternate=1','partial_scope':{}}] for row in held};a['unrelated']=[{'source':'ati','url':'https://accesstoinsight.org/tipitaka/kn/thig/thig.03.04.rhyc.html'}];before=copy.deepcopy(a);out,removed=apply_reviewed_exclusions(a);assert a==before and len(out)==1 and 'unrelated' in out;assert apply_reviewed_exclusions(out)==(out,[])
m=json.loads(MANIFEST.read_text(encoding='utf-8'));index=next(i for i,row in enumerate(m['exclusions']) if row['status']=='withheld-partial-unit')
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)
 for kind in ['source','status','subjects','root','notice']:
  bad=copy.deepcopy(m);row=bad['exclusions'][index]
  if kind=='source':row['source']='dhammatalks'
  if kind=='status':row['status']='approved-partial-unit'
  if kind=='subjects':row['subject_ids']+=['snp1.1']
  if kind=='root':row['review']['root_units'][0]['id']='wrong'
  if kind=='notice':row['review']['notice_sha256']=12
  (p/'manifest.json').write_text(json.dumps(bad),encoding='utf-8')
  try:apply_reviewed_exclusions(a,p/'manifest.json')
  except ValueError:pass
  else:raise AssertionError(kind)
  assert a==before
 with gzip.open(p/'canon.gz','wt',encoding='utf-8') as f:json.dump({'units':x['units']},f)
 pages=[dict(path=row['path'].lstrip('/')+'.html',html_title=row['link_title'],author='Fixture',license='BPS',pts=row['publisher_reference']) for row in held]
 (p/'ati.json').write_text(json.dumps(pages),encoding='utf-8');(p/'dt.json').write_text('[]')
 proc=subprocess.run([sys.executable,'scripts/canon/build_translations.py',str(p/'canon.gz'),str(p/'dt.json'),str(p/'ati.json'),str(p/'out.json')],capture_output=True,text=True,encoding='utf-8');assert proc.returncode==0,proc.stderr;assert json.loads((p/'out.json').read_text(encoding='utf-8'))=={}
 # Prove these fixtures exercise the post-linker guard, not an earlier non-match.
 code="import sys;sys.path.insert(0,'scripts/canon');import reviewed_exclusions;reviewed_exclusions.apply_reviewed_exclusions=lambda out:(out,[]);from build_translations import main;main()"
 proc=subprocess.run([sys.executable,'-c',code,str(p/'canon.gz'),str(p/'dt.json'),str(p/'ati.json'),str(p/'out.json')],capture_output=True,text=True,encoding='utf-8');assert proc.returncode==0,proc.stderr
 unheld=json.loads((p/'out.json').read_text(encoding='utf-8'));assert sum(len(v) for v in unheld.values())==10,unheld
print('passed')`,{units,held:held.map(r=>({...r,link_title:r.owner.startsWith('snp')?'Fixture Sutta: Fixture':'Fixture'}))});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/passed/);
});

test('reviewed adjacent-pair repair is idempotent and refuses drift before any pending span edits',{skip:!python},()=>{
 const d=canon.load(),book=d.canon.books[34];const input={books:[{file:book.file,blocks:book.blocks.map(b=>({rend:b[0],n:b[1],text:b[2]}))}],units:d.canon.units.filter(u=>u.book===34).map(u=>({...u,book:0}))};
 const r=run(`import json,sys,copy
sys.path.insert(0,'scripts/canon')
from story_spans import story_spans
x=json.load(sys.stdin);assert story_spans(x['books'],x['units'])==[]
by={u['id']:u for u in x['units']};by['thag2.13']['end']=820;by['thag2.14']['start']=820
assert story_spans(x['books'],x['units'])==['thag2.13','thag2.14'];assert story_spans(x['books'],x['units'])==[]
for kind in ['title','verse','adjacency','approximate','missing']:
 z=copy.deepcopy(x);u={q['id']:q for q in z['units']}
 # An earlier valid repair must remain unapplied when this later pair fails.
 u['thag3.8']['end']+=1;u['thag3.9']['start']+=1
 if kind=='title':u['thag2.14']['title']='Wrong person'
 if kind=='verse':z['books'][0]['blocks'][816]['n']='999'
 if kind=='adjacency':u['thag2.13']['end']+=1
 if kind=='approximate':u['thag2.14']['approximate']=True
 if kind=='missing':z['units'].remove(u['thag2.14'])
 before=copy.deepcopy(z['units'])
 try:story_spans(z['books'],z['units'])
 except ValueError:pass
 else:raise AssertionError(kind)
 assert z['units']==before
print('passed')`,input);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/passed/);
});

test('changed unit mappings invalidate authentic old positions without falsifying the VRI edition or altering unrelated pins',async()=>{
 const {sourceRevision,readingPosition,assertPositionPin}=await import('../web/reading-position.mjs');
 const original=structuredClone(canon.source()),u=canon.resolve('thag2.14').unit,data={source:canon.readingSource(u)};
 assert.equal(u.index_revision,'thag-pair-v1');assert.equal(data.source.commit,original.commit);assert.equal(sourceRevision(data),original.commit+'-thag-pair-v1');assert.deepEqual(canon.source(),original);
 for(const [index,ref] of [[0,'thag2.14/1'],[1,'thag2.14/2']]){const pin=new URLSearchParams(readingPosition({uid:u.id},index,ref,original.commit).split('?')[1]);assert.throws(()=>assertPositionPin(pin,data),e=>e.code==='READING_SOURCE_CHANGED');assert.equal(pin.get('source'),original.commit);assert.equal(pin.get('ref'),ref);}
 for(const id of ['thag2.13','thag2.14']){const current={source:canon.readingSource(canon.resolve(id).unit)},pin=new URLSearchParams(readingPosition({uid:id},0,id+'/1',sourceRevision(current)).split('?')[1]);assert.doesNotThrow(()=>assertPositionPin(pin,current));assert.equal(current.source.commit,original.commit);}
 const other={source:canon.readingSource(canon.resolve('dhp183').unit)};assert.equal(sourceRevision(other),original.commit);assert.equal(other.source.locator_revision,undefined);assert.doesNotThrow(()=>assertPositionPin(new URLSearchParams(readingPosition({uid:'dhp183'},0,'dhp183/1',original.commit).split('?')[1]),other));
 for(const locator_revision of [null,undefined,12,'bad revision'])assert.throws(()=>sourceRevision({source:{commit:original.commit,locator_revision}}),/invalid/);
 assert.throws(()=>canon.readingSource({...u,index_revision:null}),/Invalid/);assert.throws(()=>canon.readingSource({...u,index_revision:'bad revision'}),/Invalid/);
});
