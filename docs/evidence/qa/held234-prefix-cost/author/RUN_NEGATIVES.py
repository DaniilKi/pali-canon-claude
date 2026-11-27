from pathlib import Path
import subprocess,os,sys,time,signal,json
E=Path(__file__).parent;argv=[sys.executable,'-B',str(E/'VERIFY_NEGATIVES.py')];start=time.perf_counter();p=subprocess.Popen(argv,stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'})
try:out,err=p.communicate(timeout=600);timed=False
except subprocess.TimeoutExpired:timed=True;os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate(timeout=5)
(E/'negatives.stdout').write_bytes(out);(E/'negatives.stderr').write_bytes(err);r={'argv':argv,'bound_seconds':600,'exit_code':p.returncode,'timeout':timed,'elapsed_seconds':time.perf_counter()-start};(E/'NEGATIVE_COMMAND.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r));print(out.decode()[-1800:]);print(err.decode()[-1000:]);sys.exit(0 if p.returncode==0 and not timed else 1)
