"""One bounded, isolated Windows comparison; never a release/Windows acceptance gate."""
from pathlib import Path, PurePosixPath
import argparse, csv, hashlib, io, json, os, platform, re, shutil, signal, subprocess, sys, tarfile, time

COMMIT='c7e5939c3c479a78d3537e17deac6318162f3896'
HELPER='scripts/web_reader_next_ten_boundary_history.py'
BEFORE='ae549a7653f140cecc2f6209502d456abacf86f251def075e6559113d309f86e'
AFTER='baae776d4591951229a2a5cc10a608908e75f03d44699a1b11b3dd2de7b15fe9'
PATCH_SHA='004ed3e193a5b1efd2ca8221a638da45d542f91e9cc2230459670ba14e7fa9d1'
INNER=[('current3397','tests/approved-current339-authority-negatives.test.mjs',140,7),('nextten5','tests/next-ten-history.test.mjs',140,5),('sixhistory7','tests/six-boundary-history.test.mjs',80,7)]
METRICS_CODE='"""Instrument Python filesystem primitives around unmodified QA positive gates."""\nimport sys\nsys.dont_write_bytecode=True\nfrom pathlib import Path\nimport os,json,time,hashlib\nfrom collections import Counter\nfrom unittest import mock\nroot=Path(sys.argv[1]);out=Path(sys.argv[2]);sys.path.insert(0,str(root/\'scripts\'))\nimport web_reader_next_ten_boundary_history as ten\nimport web_reader_intake359 as intake\nfrom web_reader_approved_acceptance import approved_runtime\nstat0,lstat0,read0=os.stat,os.lstat,Path.read_bytes\nresults=[]\ndef measured(label,call):\n calls=Counter();reads=Counter();hashes={}\n def stat(path,*args,**kw):calls[\'os.stat_follow_\'+str(kw.get(\'follow_symlinks\',True))]+=1;return stat0(path,*args,**kw)\n def lstat(path,*args,**kw):calls[\'os.lstat\']+=1;return lstat0(path,*args,**kw)\n def read(path):\n  b=read0(path)\n  try:name=str(path.relative_to(root))\n  except ValueError:name=\'<outside-owned-root>\'\n  reads[name]+=1;h=hashlib.sha256(b).hexdigest();assert name not in hashes or hashes[name]==h;hashes[name]=h;return b\n started=time.perf_counter()\n with mock.patch.object(os,\'stat\',new=stat),mock.patch.object(os,\'lstat\',new=lstat),mock.patch.object(Path,\'read_bytes\',new=read):value=call()\n result={\'label\':label,\'instrumented_seconds\':time.perf_counter()-started,\'stat_family_calls\':dict(calls),\'stat_family_total\':sum(calls.values()),\'physical_read_bytes_calls\':dict(sorted(reads.items())),\'physical_read_bytes_hashes\':dict(sorted(hashes.items())),\'result_kind\':type(value).__name__}\n if type(value)is bytes:result[\'result\']={\'bytes\':len(value),\'sha256\':hashlib.sha256(value).hexdigest()}\n elif type(value)is dict:result[\'result_sha256\']=hashlib.sha256(json.dumps(value,sort_keys=True,separators=(\',\',\':\')).encode()).hexdigest();result[\'result_members\']=len(value)\n results.append(result)\nmeasured(\'regular-proof\',lambda:ten.regular(root,intake.DIRECTORY+\'/APPROVAL.json\'))\nmeasured(\'regular-data\',lambda:ten.regular(root,\'server/data/canon.json.gz.parts.json\'))\nmeasured(\'fresh-all13-proofs\',lambda:intake.fresh_proofs(root))\nmeasured(\'approved-runtime-public-current34\',lambda:approved_runtime(root))\nout.write_text(json.dumps({\'root\':str(root),\'instrumentation\':\'Wrapped real os.stat/os.lstat/Path.read_bytes, preserving args/return/errors; Python primitive counts, not kernel trace or Windows timing.\',\'results\':results},indent=2)+\'\\n\');print(json.dumps({\'out\':str(out),\'counts\':{x[\'label\']:x[\'stat_family_total\']for x in results}}),flush=True)\n'
REFUSALS_CODE='"""Owned temporary regular-file/refusal controls; no application imports."""\nfrom pathlib import Path\nimport sys, tempfile, importlib, hashlib, json\nroot=Path(sys.argv[1]);sys.path.insert(0,str(root/\'scripts\'))\nh=importlib.import_module(\'web_reader_next_ten_boundary_history\')\nwith tempfile.TemporaryDirectory(prefix=\'regular-controls-\') as tmp:\n base=Path(tmp); physical=base/\'physical\';physical.mkdir();(physical/\'directory\').mkdir();target=physical/\'directory\'/\'proof.json\';target.write_bytes(b\'{"fresh":1}\')\n (physical/\'file-link\').symlink_to(target);(physical/\'directory-link\').symlink_to(physical/\'directory\',target_is_directory=True);(physical/\'dangling\').symlink_to(physical/\'missing\');(base/\'root-link\').symlink_to(physical,target_is_directory=True)\n cases=[(\'regular\',physical,\'directory/proof.json\'),(\'missing-file\',physical,\'absent.json\'),(\'directory-as-file\',physical,\'directory\'),(\'file-as-directory\',physical,\'directory/proof.json/child\'),(\'file-link\',physical,\'file-link\'),(\'directory-link\',physical,\'directory-link/proof.json\'),(\'dangling-link\',physical,\'dangling\'),(\'root-link\',base/\'root-link\',\'directory/proof.json\'),(\'missing-root\',base/\'absent\',\'proof.json\'),(\'dotdot\',physical,\'directory/../proof.json\'),(\'absolute\',physical,\'/proof.json\'),(\'double-separator\',physical,\'directory//proof.json\'),(\'non-physical\',object(),\'proof.json\')]\n rows=[]\n for label,r,p in cases:\n  try:b=h.regular(r,p);rows.append({\'case\':label,\'bytes\':len(b),\'sha256\':hashlib.sha256(b).hexdigest()})\n  except Exception as e:rows.append({\'case\':label,\'exception\':type(e).__name__,\'message\':str(e)})\n target.write_bytes(b\'{"fresh":2}\');b=h.regular(physical,\'directory/proof.json\');rows.append({\'case\':\'fresh-overwrite\',\'bytes\':len(b),\'sha256\':hashlib.sha256(b).hexdigest()})\n assert rows[0][\'sha256\']!=rows[-1][\'sha256\']\nassert not base.exists()\nprint(json.dumps({\'cases\':rows,\'owned_fixture_removed\':True},indent=2))\n'
SOURCE_CODE="""import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{pathToFileURL}from'node:url';import{resolve}from'node:path';const[root,out,variant]=process.argv.slice(1);const{project3dSource}=await import(pathToFileURL(resolve(root,'tests/helpers/intake359-source-input.mjs')));let result;try{const old=project3dSource('scripts/web_reader_next_ten_boundary_history.py',readFileSync(resolve(root,'scripts/web_reader_next_ten_boundary_history.py'),'utf8'),{requireCurrent:true});if(variant!=='baseline')throw Error('Experimental changed source unexpectedly accepted');const sha=createHash('sha256').update(old).digest('hex');if(sha!=='6327f0a6ba14dc5de91aeb7c079bf6823d6ab5404620f87a1a9a7b0b302d8bbc')throw Error('Historical source mismatch');result={expected:'baseline accepted',projected_sha256:sha};}catch(e){if(variant!=='experiment'||e.code!=='ERR_ASSERTION'||!String(e.message).includes('Exact current359 source required'))throw e;result={expected:'experiment rejected by unchanged strict source pin',name:e.name,code:e.code};}writeFileSync(out,JSON.stringify(result,null,2)+'\\n');"""

def sha(raw): return hashlib.sha256(raw).hexdigest()
def write(path,value): path.write_text(json.dumps(value,indent=2)+'\n',encoding='utf-8')
def safe(name):
    p=PurePosixPath(name)
    if not name or '\\' in name or ':' in name or p.is_absolute() or any(x in ('','.','..') for x in name.rstrip('/').split('/')):
        raise ValueError('Unsafe archive member')
    return p

def patch_once(source,patch):
    lines=source.splitlines(keepends=True); diff=patch.splitlines(keepends=True)
    assert diff[:2]==['--- a/'+HELPER+'\n','+++ b/'+HELPER+'\n']
    output=[];position=0;i=2;hunks=0
    while i<len(diff):
        m=re.fullmatch(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@\n',diff[i]);assert m
        old_start=int(m[1])-1;old_count=int(m[2] or 1);new_count=int(m[4] or 1)
        assert old_start>=position;output+=lines[position:old_start];position=old_start;i+=1;old=[];new=[]
        while i<len(diff) and not diff[i].startswith('@@ '):
            mark=diff[i][0];body=diff[i][1:];assert mark in ' +-'
            if mark in ' -':old.append(body)
            if mark in ' +':new.append(body)
            i+=1
        assert len(old)==old_count and len(new)==new_count and lines[position:position+old_count]==old
        output+=new;position+=old_count;hunks+=1
    assert hunks==2
    return ''.join(output+lines[position:])

def prepare(archive,owned,patch,out):
    assert not owned.exists();owned.mkdir();roots=[owned/'baseline',owned/'experiment']
    for root in roots:root.mkdir()
    inventory={};total=0
    with tarfile.open(archive,'r:') as tar:
        members=tar.getmembers();assert len(members)<15000
        for m in members:
            name=str(safe(m.name))
            if m.isdir():continue
            assert m.isfile() and not m.issym() and not m.islnk() and name not in inventory
            total+=m.size;assert total<1_500_000_000
            raw=tar.extractfile(m).read();assert len(raw)==m.size
            inventory[name]={'bytes':len(raw),'sha256':sha(raw)}
            for root in roots:
                target=root.joinpath(*PurePosixPath(name).parts);target.parent.mkdir(parents=True,exist_ok=True)
                with target.open('xb') as stream:stream.write(raw)
                assert not target.is_symlink() and target.is_file() and sha(target.read_bytes())==inventory[name]['sha256']
    assert inventory[HELPER]['sha256']==BEFORE and len(inventory)==1964
    raw_patch=patch.read_bytes();assert sha(raw_patch)==PATCH_SHA
    original=(roots[1]/HELPER).read_bytes();changed=patch_once(original.decode('utf-8'),raw_patch.decode('utf-8')).encode('utf-8')
    assert sha(original)==BEFORE and sha(changed)==AFTER
    (roots[1]/HELPER).write_bytes(changed)
    differences=[]
    for name,row in inventory.items():
        for index,root in enumerate(roots):
            actual=root.joinpath(*PurePosixPath(name).parts).read_bytes()
            expected=AFTER if index==1 and name==HELPER else row['sha256']
            assert sha(actual)==expected and (len(actual)==row['bytes'] or name==HELPER)
        if (roots[0]/name).read_bytes()!=(roots[1]/name).read_bytes():differences.append(name)
    assert differences==[HELPER]
    write(out,{'commit':COMMIT,'archive_sha256':sha(archive.read_bytes()),'files':inventory,'only_delta':differences,'before_sha256':BEFORE,'after_sha256':AFTER,'patch_sha256':PATCH_SHA})

def process_snapshot():
    # PID/parent metadata only; never query command lines/environment/secrets.
    p=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-Command','Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress'],capture_output=True,text=True,timeout=10)
    if p.returncode:return None
    try:value=json.loads(p.stdout);return value if isinstance(value,list) else [value]
    except (ValueError,TypeError):return None

def kill_owned_tree(proc):
    before=process_snapshot();result={'owned_root_pid':proc.pid,'verified_absent':False}
    if before is None:return result
    ids={proc.pid}
    while True:
        more={int(row['ProcessId']) for row in before if int(row['ParentProcessId']) in ids}
        if more<=ids:break
        ids|=more
    result['observed_owned_ids']=sorted(ids)
    if proc.poll() is not None:
        # A raced parent exit cannot establish absence of every old descendant.
        after=process_snapshot()
        result['verified_absent']=after is not None and not ids&{int(row['ProcessId']) for row in after}
        return result
    try:
        killed=subprocess.run(['taskkill.exe','/PID',str(proc.pid),'/T','/F'],capture_output=True,text=True,timeout=10)
        result['taskkill_exit']=killed.returncode;proc.wait(timeout=5)
        after=process_snapshot();result['verified_absent']=killed.returncode==0 and after is not None and not ids&{int(row['ProcessId']) for row in after}
    except (subprocess.SubprocessError,OSError):pass
    return result

class StopDiagnostic(Exception):pass

def run_parent(args):
    assert platform.system()=='Windows','Diagnostic requires real Windows'
    assert sys.version_info[:2]==(3,12),'Diagnostic requires Python3.12'
    artifact=args.artifacts.absolute();assert not artifact.exists();artifact.mkdir(parents=True)
    started=time.monotonic();deadline=started+720
    results={'schema':'isolated-metadata-io-windows-diagnostic-v1','candidate_commit':COMMIT,'release_approval':False,'platform':platform.platform(),'python':platform.python_version(),'cpu_count':os.cpu_count(),'driver_sha256':sha(Path(__file__).read_bytes()),'patch_sha256':sha(args.patch.read_bytes()),'stages':[],'completed':False,'cleanup':{'owned_copies_removed':False},'limits':'Python stat-family counts, not kernel syscall trace; fixed baseline-first order; no release/device/provider inference.'}
    assert results['patch_sha256']==PATCH_SHA
    owned=args.owned.absolute();assert not owned.exists()
    env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONUNBUFFERED':'1'}
    def seal():write(artifact/'RESULT.json',results)
    def stage(label,argv,cwd,bound):
        if time.monotonic()+bound+65>deadline:
            results['stages'].append({'label':label,'not_started':'Insufficient remaining diagnostic budget','bound_seconds':bound});seal();raise StopDiagnostic(label)
        begin=time.monotonic();row={'label':label,'argv':argv,'cwd':str(cwd),'bound_seconds':bound,'timeout':False,'cleanup_unverified':False};results['stages'].append(row);seal()
        try:
            proc=subprocess.Popen(argv,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
            row['owned_pid']=proc.pid
            try:stdout,stderr=proc.communicate(timeout=bound)
            except subprocess.TimeoutExpired as error:
                row['timeout']=True;row['seconds']=time.monotonic()-begin
                # Preserve partial public logs even if owned-tree cleanup is uncertain.
                (artifact/(label+'.stdout.log')).write_bytes(error.output or b'')
                (artifact/(label+'.stderr.log')).write_bytes(error.stderr or b'')
                row['owned_tree_cleanup']=kill_owned_tree(proc);row['cleanup_unverified']=not row['owned_tree_cleanup']['verified_absent']
                if row['cleanup_unverified']:
                    seal();raise StopDiagnostic('Timeout cleanup unverified')
                stdout,stderr=proc.communicate(timeout=5)
            row['exit_code']=proc.returncode
            (artifact/(label+'.stdout.log')).write_bytes(stdout);(artifact/(label+'.stderr.log')).write_bytes(stderr)
            row['stdout_sha256']=sha(stdout);row['stderr_sha256']=sha(stderr);row['seconds']=time.monotonic()-begin
        except (OSError,subprocess.SubprocessError) as error:
            row['launch_or_wait_error']=type(error).__name__;row['cleanup_unverified']=True;seal();raise StopDiagnostic(label)
        finally:seal()
        print(json.dumps({k:row[k] for k in ('label','exit_code','timeout','cleanup_unverified','seconds') if k in row}),flush=True)
        if row['timeout'] or row.get('exit_code')!=0:raise StopDiagnostic(label)
        return stdout,stderr
    success=False
    try:
        stage('prepare',[sys.executable,'-B',str(Path(__file__).absolute()),'prepare','--archive',str(args.archive.absolute()),'--owned',str(owned),'--patch',str(args.patch.absolute()),'--output',str(artifact/'ARCHIVE_AND_PATCH.json')],artifact,90)
        nv,_=stage('node-metadata',['node','-e',"process.stdout.write(JSON.stringify({node:process.version,platform:process.platform,availableParallelism:require('node:os').availableParallelism()}))"],artifact,10)
        results['node_metadata']=json.loads(nv);assert re.fullmatch(r'v20\.\d+\.\d+',results['node_metadata']['node']) and results['node_metadata']['platform']=='win32'
        for variant in ('baseline','experiment'):
            root=owned/variant
            for kind,bound in [('metrics',45),('refusals',15)]:
                stage(variant+'-'+kind,[sys.executable,'-B',str(Path(__file__).absolute()),kind,'--root',str(root),'--output',str(artifact/(variant+'-'+kind+'.json'))],root,bound)
            stage(variant+'-source-pin',['node','--input-type=module','-e',SOURCE_CODE,str(root),str(artifact/(variant+'-source-pin.json')),variant],root,15)
            for label,path,bound,count in INNER:
                stdout,stderr=stage(variant+'-'+label,['node','--test','--test-reporter=tap',path],root,bound)
                text=stdout.decode('utf-8',errors='strict')
                for expression in [r'^# tests 1\r?$',r'^# pass 1\r?$',r'^# fail 0\r?$',r'^# skipped 0\r?$',r'^# cancelled 0\r?$']:
                    assert re.search(expression,text,re.M),('TAP count/refusal',label)
                results['stages'][-1]['original_python_case_count']=count;seal()
        a=json.loads((artifact/'baseline-metrics.json').read_text());b=json.loads((artifact/'experiment-metrics.json').read_text());comparison=[]
        for x,y in zip(a['results'],b['results']):
            assert x['label']==y['label']
            for k in ('physical_read_bytes_calls','physical_read_bytes_hashes','result_kind','result','result_sha256','result_members'):assert x.get(k)==y.get(k),(x['label'],k)
            comparison.append({'case':x['label'],'baseline_metadata_calls':x['stat_family_total'],'experiment_metadata_calls':y['stat_family_total'],'physical_read_calls':sum(x['physical_read_bytes_calls'].values()),'distinct_read_paths':len(x['physical_read_bytes_calls']),'byte_reads_and_results_equal':True})
        assert len(comparison)==4
        ar=json.loads((artifact/'baseline-refusals.json').read_text());br=json.loads((artifact/'experiment-refusals.json').read_text());assert ar==br and len(ar['cases'])==14 and ar['owned_fixture_removed']
        baseline_pin=json.loads((artifact/'baseline-source-pin.json').read_text());experiment_pin=json.loads((artifact/'experiment-source-pin.json').read_text())
        assert baseline_pin['projected_sha256']=='6327f0a6ba14dc5de91aeb7c079bf6823d6ab5404620f87a1a9a7b0b302d8bbc'
        assert experiment_pin['expected']=='experiment rejected by unchanged strict source pin' and experiment_pin['code']=='ERR_ASSERTION'
        results['source_pin_results']={'baseline_accepted':True,'experiment_strict_refusal_preserved':True}
        results['comparison']=comparison;results['refusal_controls_exact']=14;results['completed']=True;success=True
    except Exception as error:
        results['failure_category']=type(error).__name__ # Do not print data values/errors.
    finally:
        # Never delete fixtures while an uncertain owned child may still use them.
        uncertain=any(row.get('cleanup_unverified') for row in results['stages'])
        if owned.exists() and not uncertain:
            try:
                # This cleanup child cannot spawn descendants; subprocess.run kills
                # its exact process handle if its20s bound expires.
                cleaned=subprocess.run([sys.executable,'-B','-c','import shutil,sys;shutil.rmtree(sys.argv[1])',str(owned)],capture_output=True,timeout=20)
                results['cleanup']['owned_copy_cleanup_exit']=cleaned.returncode
                results['cleanup']['owned_copies_removed']=cleaned.returncode==0 and not owned.exists()
                if not results['cleanup']['owned_copies_removed']:success=False
            except (OSError,subprocess.SubprocessError):results['cleanup']['owned_copy_cleanup_failed']=True;success=False
        results['seconds']=time.monotonic()-started;results['success']=success and results['cleanup']['owned_copies_removed'];seal()
        print(json.dumps({'completed':results['completed'],'success':results['success'],'seconds':results['seconds'],'cleanup':results['cleanup'],'node_metadata':results.get('node_metadata'),'python':results['python'],'comparison':results.get('comparison'),'refusal_controls_exact':results.get('refusal_controls_exact'),'source_pin_results':results.get('source_pin_results'),'failure_category':results.get('failure_category'),'release_approval':False}),flush=True)
    return 0 if results['success'] else 1

def main():
    p=argparse.ArgumentParser();p.add_argument('stage',choices=['run','prepare','metrics','refusals']);p.add_argument('--archive',type=Path);p.add_argument('--owned',type=Path);p.add_argument('--patch',type=Path);p.add_argument('--artifacts',type=Path);p.add_argument('--root',type=Path);p.add_argument('--output',type=Path);a=p.parse_args()
    if a.stage=='run':return run_parent(a)
    if a.stage=='prepare':prepare(a.archive,a.owned,a.patch,a.output);return 0
    if a.stage=='metrics':
        sys.argv=[str(Path(__file__)),str(a.root),str(a.output)];exec(compile(METRICS_CODE,'fixed-metrics-stage','exec'),{'__name__':'__main__'});return 0
    if a.stage=='refusals':
        from contextlib import redirect_stdout
        stream=io.StringIO();sys.argv=[str(Path(__file__)),str(a.root)]
        with redirect_stdout(stream):exec(compile(REFUSALS_CODE,'fixed-refusal-stage','exec'),{'__name__':'__main__'})
        value=json.loads(stream.getvalue());assert len(value['cases'])==14 and value['owned_fixture_removed'];write(a.output,value);return 0
if __name__=='__main__':sys.exit(main())
