#!/usr/bin/env python3
"""One diagnostic around unchanged npm test; no reporter/preload/concurrency flags."""
import errno,hashlib,json,os,platform,re,selectors,signal,stat,subprocess,sys,time
from pathlib import Path
ROOT=Path.cwd().resolve(); OUT=Path(os.environ['RUNNER_TEMP']).resolve()/'macos-test-completion'
WORK=1780.0; TERM_AT=1780.0; KILL_AT=1783.0; STOP=1788.0
INDEX='docs/evidence/qa/english381-386/BASELINE_380_TEST_FILES.json'
INDEX_SHA='0ec91929265aab1ec4b59cfad3ed8ed2c48db759c1413fffba5e9c661809199a'
PUBLIC_RUNNER_SHA='0693509f63143b63d4e2619884c4c12dd6333effc46124add4e2644c2d5287ad'
EXPECTED_TRACE='bdafdf2dd221ed9985c65d3fa26bb2fa7ff788224af9f41b1190e8a559042659'
EXPECTED_SUMMARY={'tests':2123,'suites':0,'pass':1833,'fail':0,'cancelled':0,'skipped':290,'todo':0}
sha=lambda b:hashlib.sha256(b).hexdigest()
def regular(name,max_bytes=4*1024*1024):
 p=ROOT
 for part in Path(name).parts:
  assert part not in ('.','..') and not Path(name).is_absolute();p=p/part;s=p.lstat();assert not stat.S_ISLNK(s.st_mode)
 assert stat.S_ISREG(s.st_mode) and s.st_size<=max_bytes
 b=p.read_bytes();assert len(b)<=max_bytes;return b
def put(name,value):
 raw=(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n').encode();assert len(raw)<=2*1024*1024
 with (OUT/name).open('xb')as f:f.write(raw)
def group_absent(pgid):
 try:os.killpg(pgid,0);return False
 except ProcessLookupError:return True
 except PermissionError:return None
class Observer:
 def __init__(self,p,started,requested):
  self.p=p;self.started=started;self.records=[];self.summary={};self.trace=[];self.pending={1:b'',2:b''};self.overflow=False;self.eof=set();self.bytes={1:0,2:0};self.hashes={1:hashlib.sha256(),2:hashlib.sha256()};self.events=[];self.samples=[];self.abort=None;self.signalled=False;self.killed=False;self.exit_observed=None;self.summary_at=None;self.term_at=None;self.requested=requested;self.plans=[];self.completion_at=None;self.checkpoint_bytes=0;self.checkpoint_truncated=False;self.console_bytes=0;self.console_truncated=False
  for name in ['events.jsonl','process-samples.jsonl']:
   with (OUT/name).open('xb'):pass
 def now(self):return time.monotonic()-self.started
 def checkpoint(self,name,row):
  raw=(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n').encode()
  if self.checkpoint_bytes+len(raw)>2*1024*1024:self.checkpoint_truncated=True;return
  with (OUT/name).open('ab')as f:f.write(raw);f.flush()
  self.checkpoint_bytes+=len(raw)
 def console(self,kind,row):
  raw=('MACOS_COMPLETION:'+json.dumps({'kind':kind,**row},ensure_ascii=False,separators=(',',':'))+'\n').encode()
  limit=2*1024*1024 if kind=='final'else 2*1024*1024-8192
  if self.console_bytes+len(raw)>limit:self.console_truncated=True;return
  offset=0
  while offset<len(raw):sent=os.write(2,memoryview(raw)[offset:]);assert sent>0;offset+=sent
  self.console_bytes+=len(raw)
 def event(self,kind,**fields):
  row={'seconds':self.now(),'kind':kind,**fields};self.events.append(row);self.checkpoint('events.jsonl',row);self.console('event',row)
 def sample_record(self,row):
  self.samples.append(row);self.checkpoint('process-samples.jsonl',row)
  compact={k:v for k,v in row.items()if k!='processes'}
  compact['process_fields']=['pid','ppid','pgid','state','cpu_time','rss_kib','elapsed','comm_basename','same_owned_group']
  compact['process_rows']=[[p[k]for k in compact['process_fields']]for p in row.get('processes',[])]
  self.console('process_sample',compact)
 def signal(self,sig,frame):self.abort=signal.Signals(sig).name;self.event('external_signal_received',signal=self.abort)
 def sample(self):
  try:
   r=subprocess.run(['/bin/ps','-axo','pid=,ppid=,pgid=,state=,time=,rss=,etime=,comm='],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=2,check=False)
   assert r.returncode==0 and len(r.stdout)<=4*1024*1024
   rows=[]
   for line in r.stdout.decode('utf8','replace').splitlines():
    cells=line.strip().split(None,7)
    if len(cells)!=8:continue
    pid,ppid,pgid=map(int,cells[:3]);rows.append((pid,ppid,pgid,cells[3:]))
   owned={self.p.pid};changed=True
   while changed:
    extra={pid for pid,ppid,pgid,_ in rows if ppid in owned or pgid==self.p.pid};changed=not extra<=owned;owned|=extra
   safe=[]
   for pid,ppid,pgid,c in rows:
    if pid not in owned:continue
    state,cpu,rss,elapsed,comm=c
    assert re.fullmatch(r'[A-Za-z+<>NsEWLX?-]+',state)and re.fullmatch(r'[0-9:.+-]+',cpu)and rss.isdigit()and re.fullmatch(r'[0-9:-]+',elapsed)
    safe.append({'pid':pid,'ppid':ppid,'pgid':pgid,'state':state,'cpu_time':cpu,'rss_kib':int(rss),'elapsed':elapsed,'comm_basename':Path(comm).name[:80],'same_owned_group':pgid==self.p.pid})
   self.sample_record({'seconds':self.now(),'processes':sorted(safe,key=lambda p:p['pid'])[:32],'owned_process_count':len(safe),'retained_process_limit':32,'truncated':len(safe)>32,'npm_group_absent':group_absent(self.p.pid),'scope':'Current descendants/same owned PGID only; escaped/reparented processes may be missed; no argv/env/open-file data'})
  except Exception:self.sample_record({'seconds':self.now(),'sample_error':'PS_FAILED_TIMED_OUT_OR_UNEXPECTED_METADATA'})
 def consume(self,fd,chunk):
  self.bytes[fd]+=len(chunk);self.hashes[fd].update(chunk)
  offset=0
  while offset<len(chunk):
   sent=os.write(fd,memoryview(chunk)[offset:]);assert sent>0;offset+=sent # forward every console byte; no raw-log artifact
  buf=self.pending[fd]+chunk
  if len(buf)>2*1024*1024:self.overflow=True;buf=b''
  lines=buf.split(b'\n');self.pending[fd]=lines.pop()
  if fd!=1:return
  for raw in lines:
   try:text=raw.decode('utf8').rstrip('\r')
   except UnicodeError:self.overflow=True;continue
   m=re.match(r'^(ok|not ok) ([0-9]+) - (.*)$',text)
   if m:
    row=[int(m[2]),m[1],m[3]];self.trace.append(row);self.records.append({'seconds':self.now(),'case':row[0],'status':row[1],'name_sha256':sha(row[2].encode())})
    if len(self.trace)%100==0 or len(self.trace)==2123:self.event('case_progress',terminal_rows=len(self.trace),last_case=row[0])
   plan=re.match(r'^1\.\.([0-9]+)$',text)
   if plan:self.plans.append(int(plan[1]));self.event('terminal_root_plan',tests=int(plan[1]))
   m=re.match(r'^# (tests|suites|pass|fail|cancelled|skipped|todo) ([0-9]+)$',text)
   if m:
    if m[1]in self.summary:self.overflow=True
    self.summary[m[1]]=int(m[2]);self.event('terminal_summary_field',field=m[1],value=int(m[2]))
   m=re.match(r'^# duration_ms ([0-9.]+)$',text)
   if m:self.summary_at=self.now();self.event('terminal_summary_duration',reported_duration_ms=float(m[1]),complete_summary=self.summary==EXPECTED_SUMMARY)
 def send(self,sig,reason):
  if sig in (signal.SIGTERM,signal.SIGINT)and self.term_at is None:self.term_at=self.now()
  self.event('owned_group_signal_request',signal=signal.Signals(sig).name,reason=reason,group_absent_before=group_absent(self.p.pid))
  try:os.killpg(self.p.pid,sig);self.event('owned_group_signal_returned',signal=signal.Signals(sig).name)
  except ProcessLookupError:self.event('owned_group_already_absent')
  except OSError as e:self.event('owned_group_signal_error',errno=e.errno)
 def run(self):
  sel=selectors.DefaultSelector()
  for fd,stream in [(1,self.p.stdout),(2,self.p.stderr)]:os.set_blocking(stream.fileno(),False);sel.register(stream,selectors.EVENT_READ,fd)
  for sig in [signal.SIGINT,signal.SIGTERM]:signal.signal(sig,self.signal)
  self.events.append({'seconds':self.requested-self.started,'kind':'spawn_requested','command':['npm','test']});self.event('spawn_returned',pid=self.p.pid,pgid=os.getpgid(self.p.pid));assert os.getpgid(self.p.pid)==self.p.pid
  next_sample=0
  while self.now()<min(STOP,self.term_at+7 if self.abort and self.term_at is not None else STOP):
   if self.now()>=next_sample:self.sample();next_sample=self.now()+10
   code=self.p.poll()
   if code is not None and self.exit_observed is None:self.exit_observed=self.now();self.event('npm_exit_observed',returncode=code)
   if code is not None and not sel.get_map():self.completion_at=self.now();self.event('direct_exit_and_both_pipes_observed');break
   if (self.now()>=TERM_AT or self.abort)and not self.signalled:self.signalled=True;self.send(getattr(signal,self.abort)if self.abort else signal.SIGTERM,self.abort or 'DIAGNOSTIC_SHORTER_WORK_DEADLINE')
   if (self.now()>=KILL_AT or self.signalled and self.term_at is not None and self.now()>=self.term_at+3)and not self.killed:self.killed=True;self.send(signal.SIGKILL,'OWNED_GROUP_CLEANUP')
   for key,_ in sel.select(.1):
    try:chunk=os.read(key.fileobj.fileno(),65536)
    except BlockingIOError:continue
    if chunk:self.consume(key.data,chunk)
    else:self.eof.add(key.data);self.event('pipe_EOF',stream='stdout'if key.data==1 else'stderr');sel.unregister(key.fileobj);key.fileobj.close()
  if self.p.poll()is None or sel.get_map():
   if not self.killed:self.killed=True;self.send(signal.SIGKILL,'FINAL_OWNED_GROUP_CLEANUP')
   self.event('incomplete_direct_exit_or_pipe_close',direct_exit=self.p.poll(),open_pipes=len(sel.get_map()))
  for key in list(sel.get_map().values()):sel.unregister(key.fileobj);key.fileobj.close()
  sel.close();self.sample();code=self.p.poll();trace_sha=sha(json.dumps(self.trace,ensure_ascii=False,separators=(',',':')).encode())
  natural=not self.signalled and not self.abort and code==0 and self.eof=={1,2}
  within_work=self.completion_at is not None and self.completion_at<=WORK
  complete=self.plans==[2123] and len(self.trace)==2123 and trace_sha==EXPECTED_TRACE and self.summary==EXPECTED_SUMMARY and not self.overflow
  result={'schema':'macos-original-npm-test-lifecycle-diagnostic-v1','diagnostic_only':True,'work_deadline_seconds':WORK,'cleanup_stop_seconds':STOP,'original_workflow_step_seconds':1800,'shorter_observation_work_budget_disclosed':True,'elapsed_seconds':self.now(),'npm_returncode':code,'npm_exit_observed_seconds':self.exit_observed,'stdout_stderr_EOF':sorted(self.eof),'summary_received_seconds':self.summary_at,'summary_before_observer_signal':self.summary_at is not None and (not self.signalled or self.summary_at<next((e['seconds']for e in self.events if e['kind']=='owned_group_signal_request'),float('inf'))),'observed_summary':self.summary,'root_plans':self.plans,'case_count':len(self.trace),'case_trace_sha256':trace_sha,'exact_pass_reference_case_status_trace':complete,'natural_completion':natural,'completion_observed_seconds':self.completion_at,'within_work_deadline':within_work,'checkpoint_bytes':self.checkpoint_bytes,'checkpoint_truncated':self.checkpoint_truncated,'console_metadata_bytes':self.console_bytes,'console_metadata_truncated':self.console_truncated,'owned_group_absent':group_absent(self.p.pid),'events':self.events,'samples':self.samples,'case_receipt_timeline':self.records,'streams':{str(fd):{'bytes':self.bytes[fd],'sha256':self.hashes[fd].hexdigest()}for fd in [1,2]},'limits':['Signals/kill only the exact newly owned npm session group; no arbitrary PID kills or universal descendants/escaped-group absence claim.','ps metadata is not JavaScript handle/resource proof; comm excludes argv; no file-owner attribution.','Pipe capture/observer timing differs from original inheritedstdio; target npm test/scripts/test.mjs and all test argv/assertions remain unchanged.','Node/OS blocking and GitHub cancellation can delay observer; actual timestamps and missing closure stay explicit.','Diagnostic complete inventory is not required75/release acceptance.']}
  compact={k:result[k]for k in ['elapsed_seconds','npm_returncode','npm_exit_observed_seconds','stdout_stderr_EOF','summary_received_seconds','summary_before_observer_signal','observed_summary','root_plans','case_count','case_trace_sha256','exact_pass_reference_case_status_trace','natural_completion','completion_observed_seconds','within_work_deadline','owned_group_absent','checkpoint_truncated','console_metadata_truncated']}
  compact['diagnostic_only']=True;self.console('final',compact)
  put('RESULT.json',result);return 0 if natural and within_work and complete and result['owned_group_absent']is True else 1

def main():
 started=time.monotonic()
 assert sys.platform=='darwin' and len(sys.argv)==1 and sys.version_info[:2]==(3,12);OUT.mkdir();assert not OUT.is_symlink()
 index_raw=regular(INDEX);assert sha(index_raw)==INDEX_SHA;index=json.loads(index_raw);assert len(index['files'])==359
 assert sorted(p.name for p in (ROOT/'tests').iterdir()if p.name.endswith('.test.mjs'))==[Path(p).name for p in index['files']]
 for name,pin in index['files'].items():assert sha(regular(name))==pin
 assert sha(regular('scripts/test.mjs'))==PUBLIC_RUNNER_SHA;assert json.loads(regular('package.json'))['scripts']['test']=='node scripts/test.mjs'
 put('SOURCE.json',{'index_sha256':INDEX_SHA,'public_runner_sha256':PUBLIC_RUNNER_SHA,'actual359_test_source_hashes_exact':True,'case_reference_log_sha256':'fed5ccd90b4db130848798bdf11eb8e50f12df9cb914b5a1ffdacde41077fd3b','expected_trace_sha256':EXPECTED_TRACE,'command':['npm','test'],'extra_flags':[],'platform':platform.platform(),'python':platform.python_version(),'commit':os.environ.get('GITHUB_SHA'),'no_reporter_preload_concurrency_override':True})
 requested=time.monotonic();p=subprocess.Popen(['npm','test'],cwd=ROOT,env=os.environ.copy(),stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True)
 try:return Observer(p,started,requested).run()
 finally:
  # Emergency cleanup is limited to the one newly owned session group.
  if p.poll()is None or group_absent(p.pid)is False:
   try:os.killpg(p.pid,signal.SIGKILL)
   except OSError:pass
  try:p.wait(timeout=1)
  except subprocess.TimeoutExpired:pass
  for stream in [p.stdout,p.stderr]:
   if not stream.closed:stream.close()
if __name__=='__main__':
 try:raise SystemExit(main())
 except Exception:
  print('MACOS_COMPLETION:'+json.dumps({'kind':'observer_error','private_exception_text_or_stack':False}),file=sys.stderr);raise SystemExit(1)
