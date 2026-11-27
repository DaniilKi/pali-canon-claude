from pathlib import Path
import importlib.util,sys,json,hashlib,time,functools
from unittest import mock
R=Path('/tmp/pali-curation-prefix-cost-nov27');E=Path(__file__).parent;sys.path.insert(0,str(R/'scripts'))
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
old=load('held_curated_baseline',E/'web_reader_apadana_intake.before.py');new=load('held_curated_candidate',R/'scripts/web_reader_apadana_intake.py')
ANCHORS=['THERA_241_250_APPROVAL.json','THERA_221_230_APPROVAL.json','THERA_REMAINING_APPROVAL.json','THERA_HELD234_APPROVAL.json','THERA_261_280_APPROVAL.json','THERA_281_285_APPROVAL.json','THERA_287_288_APPROVAL.json','THERA_292_299_APPROVAL.json','THERA_301_310_APPROVAL.json','THERA_312_319_APPROVAL.json','THERA_321_329_APPROVAL.json'];HELD=ANCHORS[3]
sha=lambda b:hashlib.sha256(b).hexdigest();compact=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
def equal(a,b):
 assert type(a)is type(b)
 if type(a)is dict:
  assert list(a)==list(b)
  for k in a:equal(a[k],b[k])
 elif type(a)in(list,tuple):
  assert len(a)==len(b)
  for x,y in zip(a,b):equal(x,y)
 else:assert a==b
read0,text0=Path.read_bytes,Path.read_text

def observed(fn,anchor):
 seen={}
 def record(path,raw,method):
  name=Path(path).absolute().relative_to(R).as_posix();pin=sha(raw);row=seen.setdefault(name,{'sha256':pin,'bytes':len(raw),'reads':0,'methods':{}});assert row['sha256']==pin;row['reads']+=1;row['methods'][method]=row['methods'].get(method,0)+1
 def rb(path):
  raw=read0(path);record(path,raw,'read_bytes');return raw
 def rt(path,*a,**k):
  value=text0(path,*a,**k);record(path,value.encode('utf-8'),'read_text');return value
 started=time.perf_counter();cpu=time.process_time()
 with mock.patch.object(Path,'read_bytes',new=rb),mock.patch.object(Path,'read_text',new=rt):result=fn(R,anchor)
 return result,seen,{'elapsed_seconds':time.perf_counter()-started,'cpu_seconds':time.process_time()-cpu}
results=[];old_held=new_held=None
for anchor in ANCHORS:
 before,old_reads,old_time=observed(old.curated_additions,anchor);after,new_reads,new_time=observed(new.curated_additions,anchor);equal(before,after);assert compact(before)==compact(after)
 missing=set(old_reads)-set(new_reads)
 if anchor==HELD:
  (E/'OLD_HELD_READSET.json').write_text(json.dumps(old_reads,indent=2)+'\n');(E/'NEW_HELD_READSET.json').write_text(json.dumps(new_reads,indent=2)+'\n');assert not missing,sorted(missing);old_held=before;new_held=after
 row={'anchor':anchor,'ordered_whole_output_sha256':sha(compact(before)),'output_bytes':len(compact(before)),'old_unique_files':len(old_reads),'new_unique_files':len(new_reads),'missing_old_paths':sorted(missing),'extra_new_paths':sorted(set(new_reads)-set(old_reads)),'old_read_calls':sum(r['reads']for r in old_reads.values()),'new_read_calls':sum(r['reads']for r in new_reads.values()),'old':old_time,'new':new_time,'ordered_value_and_exact_type_equality':True};results.append(row);print(json.dumps(row),flush=True)

def identities(v):
 stack=[v];ids=set()
 while stack:
  x=stack.pop()
  if type(x)is dict:ids.add(id(x));stack.extend(x.values())
  elif type(x)in(list,tuple):
   if type(x)is list:ids.add(id(x))
   stack.extend(x)
 return ids
again=new.curated_additions(R,HELD);equal(new_held,again);assert not identities(new_held)&identities(again)
original=compact(again);new_held['profiles'][new_held['ids'][0]]['title']='OWNED_RESULT_ALIAS_SENTINEL';new_held['curation']['baseline_ids'].append('OWNED_RESULT_ALIAS_SENTINEL');assert compact(again)==original;third=new.curated_additions(R,HELD);assert compact(third)==original
for anchor in ['unknown.json','../THERA_HELD234_APPROVAL.json','THERA_331_334_APPROVAL.json']:
 for fn in (old.curated_additions,new.curated_additions):
  try:fn(R,anchor)
  except (AssertionError,ValueError,KeyError):pass
  else:raise AssertionError('Unknown anchor accepted')
value={'schema':'closed-held234-current-suffix-equivalence-v1','all11anchors_exact_order_types_values':True,'all_original_held_proof_paths_retained':True,'held_old58_plus_new16':len(old_held['ids'])==74,'results':results,'independent_returns_no_shared_mutable_dict_or_list':True,'mutation_of_one_result_cannot_change_another_or_next_return':True,'unknown_anchors_refused':True};(E/'EQUIVALENCE.json').write_text(json.dumps(value,indent=2)+'\n');print('EQUIVALENCE_COMPLETE',flush=True)
