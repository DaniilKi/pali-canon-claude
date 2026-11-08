// Synthetic source text exercises the build contract; no publisher translation is copied here.
import {test} from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';import * as canon from '../src/canon.mjs';import {atiPartial,html} from './helpers/ati-partial.mjs';
const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
const run=(code,input)=>spawnSync(python,['-c',code],{input:JSON.stringify(input),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},maxBuffer:2*1024*1024});
test('partial source build verifies exact roots, actual extraction and full notices before changing output; repeated application is idempotent',{skip:!python},()=>{
 const d=canon.load(),u=canon.resolve('thag6.13').unit,scope=atiPartial(u.id,2,6).partial_scope,book=d.canon.books[u.book],hash=x=>createHash('sha256').update(x).digest('hex'),books=Array(u.book+1).fill(null);books[u.book]=book;
 const row={unit_id:u.id,path:'/tipitaka/kn/thag/synthetic-fixture',translator:'Andrew Olendzki',english_title:'Synthetic fixture only (schema author label is a test parameter)',license:'Olendzki-free-distribution-2005',source_reference:'Synthetic fixture only',mapping_note:'Synthetic fixture only, not publisher text or a new source approval.',source_html_sha256:hash(html),root:{id:u.id,title:u.title,vri:u.vri,book:u.book,start:u.start,end:u.end,root_blocks_sha256:hash(JSON.stringify(book.blocks.slice(u.start,u.end)))},partial_scope:scope};
 const m={version:1,ati_commit:'synthetic-test-only',vri_commit:canon.source().commit,links:[row]};
 const r=run(`import sys,json,pathlib,tempfile,copy,os
sys.path.insert(0,'scripts/canon')
from reviewed_partial_pages import apply_reviewed_partial_links,withhold_partial_page_proposals
x=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp);root=p/'source';source=root/'tipitaka/kn/thag/synthetic-fixture.html';source.parent.mkdir(parents=True);source.write_text(x['html'],encoding='utf-8');manifest=p/'manifest.json';manifest.write_text(json.dumps(x['manifest']),encoding='utf-8')
 original={'wrong-owner':[{'source':'ati','path':x['row']['path'],'url':'https://accesstoinsight.org'+x['row']['path']+'.html?bypass=1','shared_scope':{}}],'unrelated':[{'source':'ati','url':'https://accesstoinsight.org/tipitaka/kn/thag/unrelated.html'}]};before=copy.deepcopy(original)
 out,report=apply_reviewed_partial_links(original,x['canon'],root,manifest);assert original==before and set(out)==set(['unrelated','thag6.13']);assert apply_reviewed_partial_links(out,x['canon'],root,manifest)[0]==out
 withheld,removed=withhold_partial_page_proposals(out,manifest);assert list(withheld)==['unrelated'] and len(removed)==1
 for kind in ['root','pali','notice','extractor','entire-unit','traversal','duplicate','html','escape','collection','unsupported-collection','mn-owner-mismatch']:
  bad=copy.deepcopy(x['manifest']);row=bad['links'][0]
  if kind=='root':row['root']['title']='Wrong identity'
  if kind=='pali':row['partial_scope']['pali_sha256']='0'*64
  if kind=='notice':row['partial_scope']['notice_sha256']='0'*64
  if kind=='extractor':row['partial_scope']['extractor']='whole-page'
  if kind=='entire-unit':row['partial_scope']['first_ref']='thag6.13/1';row['partial_scope']['last_ref']='thag6.13/8'
  if kind=='traversal':row['path']='/tipitaka/kn/thag/../escape'
  if kind=='mn-owner-mismatch':row['path']='/tipitaka/mn/synthetic-fixture'
  if kind=='collection':row['path']='/tipitaka/kn/snp/synthetic-fixture'
  if kind=='unsupported-collection':row['path']='/tipitaka/kn/thig/synthetic-fixture'
  if kind=='duplicate':bad['links'].append(copy.deepcopy(row))
  if kind=='html':source.write_text(x['html']+' changed',encoding='utf-8')
  if kind=='escape':
   outside=p/'outside.html';outside.write_text(x['html'],encoding='utf-8');source.unlink()
   try:source.symlink_to(outside)
   except OSError as error:
    if os.name=='nt' and getattr(error,'winerror',None)==1314:
     source.write_text(x['html'],encoding='utf-8');print('symlink privilege unavailable');continue
    raise
  manifest.write_text(json.dumps(bad),encoding='utf-8')
  try:apply_reviewed_partial_links(original,x['canon'],root,manifest)
  except ValueError:pass
  else:raise AssertionError(kind)
  assert original==before
  if source.is_symlink():source.unlink()
  source.write_text(x['html'],encoding='utf-8')
print('passed')`,{html,row,manifest:m,canon:{source:canon.source(),units:[u],books}});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/passed/);
});

test('ordinary rebuilds cannot recreate any registered source as a whole source without approved content activation',{skip:!python},()=>{
 const rows=JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json','utf8')).links,units=rows.map(r=>canon.resolve(r.unit_id).unit);
 assert.equal(rows.length,15);assert.equal(new Set(rows.map(r=>r.path)).size,15);
 const r=run(`import sys,json,pathlib,tempfile,gzip,subprocess
x=json.load(sys.stdin)
with tempfile.TemporaryDirectory() as tmp:
 p=pathlib.Path(tmp)
 with gzip.open(p/'canon.gz','wt',encoding='utf-8') as f:json.dump({'units':x['units']},f)
 pages=[dict(path=row['path'].lstrip('/')+'.html',html_title=row['english_title'],author=row['translator'],license=row['license'],pts=row['source_reference']) for row in x['rows']]
 (p/'ati.json').write_text(json.dumps(pages),encoding='utf-8');(p/'dt.json').write_text('[]')
 args=[str(p/'canon.gz'),str(p/'dt.json'),str(p/'ati.json'),str(p/'out.json')]
 proc=subprocess.run([sys.executable,'scripts/canon/build_translations.py',*args],capture_output=True,text=True,encoding='utf-8');assert proc.returncode==0,proc.stderr;assert json.loads((p/'out.json').read_text(encoding='utf-8'))=={}
 # Disabling only the ordinary proposal guard must expose all13 otherwise matchable pages, including MN54; production output above stays empty for all15.
 code="import sys;sys.path.insert(0,'scripts/canon');import reviewed_partial_pages;reviewed_partial_pages.withhold_partial_page_proposals=lambda out:(out,[]);from build_translations import main;main()"
 proc=subprocess.run([sys.executable,'-c',code,*args],capture_output=True,text=True,encoding='utf-8');assert proc.returncode==0,proc.stderr
 out=json.loads((p/'out.json').read_text(encoding='utf-8'));expected={r['unit_id'] for r in x['rows'] if r['partial_scope']['extractor']=='ati-freeverse-v1'}|{'sn12.60','sn22.87','sn56.22','mn54'};assert set(out)==expected and sum(len(v) for v in out.values())==13,out;assert not set(out)&{'sn12.22','sn35.244'} # extended citation / publisher numbering alone cannot approve these roots
print('passed')`,{rows,units});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/passed/);
});
