"""UNEXECUTED: one exclusive external invocation,360s outer fail-closed bound."""
import argparse,datetime,hashlib,json,os,signal,stat,subprocess,sys,tempfile,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True,type=Path);p.add_argument('--name',required=True);p.add_argument('command',nargs=argparse.REMAINDER);a=p.parse_args()
if not a.command or not a.name or not all(x.isalnum() or x in '-_' for x in a.name):raise SystemExit('Invalid bounded command')
a.output_dir.mkdir(parents=True,exist_ok=True);log=a.output_dir/(a.name+'.log');receipt=a.output_dir/(a.name+'-command.json')
if log.exists() or receipt.exists():raise SystemExit('Preserve previous receipts')
scratch=Path(tempfile.mkdtemp(prefix='en16o-',dir='/tmp'));st=scratch.lstat()
if stat.S_IMODE(st.st_mode)!=0o700 or st.st_uid!=os.geteuid() or len(str(scratch))>32:raise SystemExit('Owned short TMPDIR required')
env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','TMPDIR':str(scratch)};argv=a.command[1:] if a.command[0]=='--' else a.command;start=time.monotonic();started=datetime.datetime.now(datetime.timezone.utc).isoformat()
with log.open('x') as stream:
 child=subprocess.Popen(argv,cwd=scratch,env=env,stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
 try:code=child.wait(timeout=360);timed_out=False
 except subprocess.TimeoutExpired:
  timed_out=True;os.killpg(child.pid,signal.SIGTERM)
  try:code=child.wait(timeout=10)
  except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);code=child.wait(timeout=5)
r={'argv':argv,'cwd':str(scratch),'started_utc':started,'elapsed_seconds':round(time.monotonic()-start,3),'exit_code':code,'timed_out':timed_out,'log':str(log),'log_sha256':hashlib.sha256(log.read_bytes()).hexdigest(),'separate_HTTP_groups':'Outer exit does not prove HTTP groups absent; require explicit inner owned-group cleanup evidence.'}
with receipt.open('x') as stream:stream.write(json.dumps(r,indent=2)+'\n')
print(json.dumps(r));sys.exit(0 if code==0 and not timed_out else 1)
