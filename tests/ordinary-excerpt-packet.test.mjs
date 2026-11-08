import{test}from'node:test';import assert from'node:assert/strict';import{spawnSync}from'node:child_process';
const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
test('local excerpt packet emits metadata hypotheses, checks every ordinary source, and leaves scoped sources and inputs alone',{skip:!python},()=>{const p=spawnSync(python,['-c',`import sys,json,tempfile,pathlib,copy,os
sys.path.insert(0,'scripts/canon')
from ordinary_excerpt_packet import packet
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);base=root/'tipitaka/mn';base.mkdir(parents=True)
 for name,meta in [('mn.001x.than','[EXTENT]={complete}'),('mn.002.than','[EXTENT]={excerpt}'),('mn.003.than','[EXTENT]={complete}\\n[SUBTITLE2]={Excerpt from a collection}')]:
  (base/(name+'.html')).write_text(meta+'\\n<!-- SECRET BODY MUST NEVER LEAVE THE CHECKOUT -->',encoding='utf-8')
 links=[{'source':'ati','path':'/tipitaka/mn/'+name,'url':'https://accesstoinsight.org/tipitaka/mn/'+name+'.html'} for name in ['mn.001x.than','mn.002.than','mn.003.than']]
 links.append({'source':'ati','path':'/tipitaka/mn/missing-scoped','partial_scope':{}});links.append({'source':'ati','path':'/tipitaka/mn/missing-shared','shared_scope':{}})
 c={'source':{'commit':'root-pin'},'units':[{'id':'mn1','title':'Synthetic fixture','vri':'1–3'}]};t={'mn1':links};before=copy.deepcopy(t);expected={'ati_commit':'source-pin','vri_commit':'root-pin'};r=packet(c,t,root,expected)
 assert r['candidate_bindings']==3 and r['ordinary_ati_bindings_checked']==3 and t==before and r['approvals_changed'] is False
 assert all(row['approved'] is False for row in r['rows']) and 'SECRET BODY' not in json.dumps(r)
 assert r['reason_counts']=={'publisher extent excerpt':1,'publisher excerpt filename marker':1,'publisher excerpt title or subtitle':1}
 for path in ['/tipitaka/mn/missing','/tipitaka/mn/../escape']:
  bad={'mn1':[dict(links[0],path=path)]}
  try:packet(c,bad,root,expected)
  except (ValueError,FileNotFoundError):pass
  else:raise AssertionError(path)
 try:packet(c,t,root,dict(expected,vri_commit='changed'))
 except ValueError:pass
 else:raise AssertionError('stale source')
print('passed')`],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(p.status,0,p.stderr);assert.match(p.stdout,/passed/);});

test('packet annotates only exact frozen reviews and expires source, root and link drift without approving anything',{skip:!python},()=>{const p=spawnSync(python,['-c',`import sys,json,tempfile,pathlib,copy,hashlib
sys.path.insert(0,'scripts/canon')
from ordinary_excerpt_packet import packet
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);source=root/'tipitaka/mn/fixture.html';source.parent.mkdir(parents=True);source.write_text('[EXTENT]={excerpt}',encoding='utf-8')
 unit={'id':'mn1','title':'Synthetic fixture','vri':'1–3','book':0,'start':0,'end':1};blocks=[['prose','synthetic']];c={'source':{'commit':'root-pin'},'units':[unit],'books':[{'blocks':blocks}]};link={'source':'ati','path':'/tipitaka/mn/fixture','url':'https://accesstoinsight.org/tipitaka/mn/fixture.html'};t={'mn1':[link]};e={'ati_commit':'source-pin','vri_commit':'root-pin'}
 r={**e,'rows':[{'owner':'mn1','path':link['path'],'decision':'retain','root':{**unit,'root_blocks_sha256':digest(blocks)},'source_html_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'link_metadata_sha256':digest({'owner':'mn1','link':link})}]}
 x=packet(c,t,root,e,r);assert x['reviewed_retained_snapshots']==1 and x['unreviewed_bindings']==0 and x['rows'][0]['approved'] is False
 for kind in ['source','root','link','commit']:
  cc=copy.deepcopy(c);tt=copy.deepcopy(t);rr=copy.deepcopy(r)
  if kind=='source':rr['rows'][0]['source_html_sha256']='0'*64
  if kind=='root':cc['books'][0]['blocks'][0][1]='changed'
  if kind=='link':tt['mn1'][0]['reference']='changed'
  if kind=='commit':rr['ati_commit']='changed'
  x=packet(cc,tt,root,e,rr);assert x['reviewed_retained_snapshots']==0 and x['unreviewed_bindings']==1 and x['rows'][0]['approved'] is False,kind
print('passed')`],{encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'}});assert.equal(p.status,0,p.stderr);assert.match(p.stdout,/passed/);});
