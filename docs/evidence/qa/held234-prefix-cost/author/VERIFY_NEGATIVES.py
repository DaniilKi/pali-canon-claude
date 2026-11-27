from pathlib import Path
import importlib.util,sys,json,hashlib,tempfile,time
R=Path('/tmp/pali-curation-prefix-cost-nov27');E=Path(__file__).parent;sys.path.insert(0,str(R/'scripts'))
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
old=load('held_curated_old_negative',E/'web_reader_apadana_intake.before.py');new=load('held_curated_new_negative',E/'web_reader_apadana_intake.candidate.py');anchor='THERA_HELD234_APPROVAL.json';sha=lambda b:hashlib.sha256(b).hexdigest();compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
reads=json.loads((E/'OLD_HELD_READSET.json').read_text());new_reads=json.loads((E/'NEW_HELD_READSET.json').read_text());assert set(reads)==set(new_reads) and len(reads)==179
expected=next(r['ordered_whole_output_sha256']for r in json.loads((E/'EQUIVALENCE.json').read_text())['results']if r['anchor']==anchor)
rows=[];started=time.perf_counter();cpu=time.process_time();report={'schema':'held234-owned-exhaustive-proof-refusal-v1','proof_count':179,'completed':False,'results':rows}
def save():
 report['elapsed_seconds']=time.perf_counter()-started;report['cpu_seconds']=time.process_time()-cpu;(E/'NEGATIVE_CONTROLS.json').write_text(json.dumps(report,indent=2)+'\n')
def positive(fn,root):assert sha(compact(fn(root,anchor)))==expected
with tempfile.TemporaryDirectory(prefix='owned-held-proof-',dir=E) as temp:
 owned=Path(temp);report['owned_root']=str(owned)
 for name,row in reads.items():
  assert not Path(name).is_absolute() and all(x not in ('','.','..')for x in name.split('/'));raw=(R/name).read_bytes();assert sha(raw)==row['sha256'];p=owned/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
 positive(old.curated_additions,owned);positive(new.curated_additions,owned)
 for index,(name,record) in enumerate(sorted(reads.items())):
  path=owned/name;raw=path.read_bytes();assert sha(raw)==record['sha256'];positive(old.curated_additions,owned)
  tests=[]
  for mode in ('missing','valid-json-tamper'):
   positive(new.curated_additions,owned)
   try:
    if mode=='missing':path.unlink()
    else:
     value=json.loads(raw)
     if type(value)is dict:value['__owned_proof_integrity_control__']=True
     elif type(value)is list:value.append({'__owned_proof_integrity_control__':True})
     elif type(value)is str:value+=' OWNED_PROOF_CONTROL'
     elif type(value)is bool:value=not value
     elif value is None:value=True
     else:value+=1
     changed=json.dumps(value,ensure_ascii=False,separators=(',',':')).encode();assert changed!=raw and sha(changed)!=record['sha256'];path.write_bytes(changed)
    failures=[]
    for label,fn in [('old',old.curated_additions),('candidate',new.curated_additions)]:
     try:fn(owned,anchor)
     except (AssertionError,ValueError,OSError,KeyError,TypeError) as error:failures.append({'implementation':label,'error_type':type(error).__name__})
     else:raise AssertionError('Proof accepted: '+label+' '+name+' '+mode)
    tests.append({'state':mode,'both_refused':True,'failures':failures})
   finally:path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw);assert sha(path.read_bytes())==record['sha256']
  rows.append({'path':name,'original_sha256':record['sha256'],'controls':tests,'restored_exact':True});save()
  if (index+1)%10==0:print(json.dumps({'proofs_completed':index+1,'total':179,'seconds':time.perf_counter()-started}),flush=True)
 positive(old.curated_additions,owned);positive(new.curated_additions,owned)
 assert len(rows)==179;report['completed']=True
assert not owned.exists();report['owned_root_removed']=True;report['all358_states_refused_by_old_and_candidate']=True;report['positive_after_restoration']=True;save();print('EXHAUSTIVE_NEGATIVES_COMPLETE',flush=True)
