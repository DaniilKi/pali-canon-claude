"""Single root-owned bounded command; exclusive outputs, no raw source logs."""
import argparse,datetime,hashlib,json,os,signal,stat,subprocess,sys,tempfile,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--output-dir',required=True,type=Path);p.add_argument('--name',required=True);p.add_argument('command',nargs=argparse.REMAINDER);a=p.parse_args();assert a.command and all(x.isalnum() or x in '-_' for x in a.name)
a.output_dir.mkdir(parents=True,exist_ok=True);log=a.output_dir/(a.name+'.log');receipt=a.output_dir/(a.name+'-command.json');assert not log.exists() and not receipt.exists()
scratch=Path(tempfile.mkdtemp(prefix='s634o-',dir='/tmp'));info=scratch.lstat();assert stat.S_IMODE(info.st_mode)==0o700 and info.st_uid==os.geteuid() and len(str(scratch))<=32
env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','TMPDIR':str(scratch),'PALI_BROWSER':'/usr/bin/chromium'};argv=a.command[1:] if a.command[0]=='--' else a.command;t=time.monotonic();started=datetime.datetime.now(datetime.timezone.utc).isoformat()
with log.open('x') as stream:
 child=subprocess.Popen(argv,cwd=scratch,env=env,stdout=stream,stderr=subprocess.STDOUT,start_new_session=True)
 try:code=child.wait(timeout=700);timed_out=False
 except subprocess.TimeoutExpired:
  timed_out=True;os.killpg(child.pid,signal.SIGTERM)
  try:code=child.wait(timeout=10)
  except subprocess.TimeoutExpired:os.killpg(child.pid,signal.SIGKILL);code=child.wait(timeout=5)
record={'argv':argv,'cwd':str(scratch),'started_utc':started,'completed_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':round(time.monotonic()-t,3),'exit_code':code,'timed_out':timed_out,'owned_short_tmpdir':str(scratch),'environment':{k:env[k] for k in ['PYTHONDONTWRITEBYTECODE','TMPDIR','PALI_BROWSER']},'log':str(log),'log_sha256':hashlib.sha256(log.read_bytes()).hexdigest(),'http_cleanup_limit':'HTTP child owns a separate session. Outer deadline/exit does not prove HTTP group absent; require explicit inner cleanup or independently observed owned-group absence.'};
with receipt.open('x') as stream:stream.write(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));sys.exit(0 if code==0 and not timed_out else 1)
