from pathlib import Path
import subprocess,os,sys,time,signal,json,resource,hashlib
E=Path(__file__).parent;R=Path('/tmp/pali-curation-prefix-cost-nov27');argv=['/tmp/pali-english335-350-evidence-nov26/node22-linux/node','--test','--test-reporter=tap','tests/held234-current333-chain.test.mjs'];started=time.perf_counter();usage=resource.getrusage(resource.RUSAGE_CHILDREN);p=subprocess.Popen(argv,cwd=R,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1'},stdout=subprocess.PIPE,stderr=subprocess.PIPE,start_new_session=True);timed=False
try:out,err=p.communicate(timeout=35)
except subprocess.TimeoutExpired:timed=True;os.killpg(p.pid,signal.SIGKILL);out,err=p.communicate(timeout=5)
clock=resource.getrusage(resource.RUSAGE_CHILDREN);gone=False
try:os.killpg(p.pid,0)
except ProcessLookupError:gone=True
(E/'original-wrapper.tap').write_bytes(out);(E/'original-wrapper.stderr').write_bytes(err);value={'argv':argv,'cwd':str(R),'original_python_child_seconds':30,'outer_bound_seconds':35,'exit_code':p.returncode,'outer_timeout':timed,'elapsed_seconds':time.perf_counter()-started,'child_cpu_seconds':clock.ru_utime+clock.ru_stime-usage.ru_utime-usage.ru_stime,'owned_group_observed_absent':gone,'wrapper_sha256':hashlib.sha256((R/'tests/held234-current333-chain.test.mjs').read_bytes()).hexdigest()};(E/'ORIGINAL_COMMAND.json').write_text(json.dumps(value,indent=2)+'\n');print(json.dumps(value));sys.exit(0 if p.returncode==0 and not timed and gone else 1)
