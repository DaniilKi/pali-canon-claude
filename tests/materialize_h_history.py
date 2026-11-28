"""Two closed H materializers; fixed cached GitH objects, no network or old tests.

Invoked at fixture PREPARATION, never from an original Python method. Source
fixtures contain no server runtime files. Runtime fixtures explicitly add H34.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import time

# Closed CLI-only preparation diagnostics. Imported helper behavior is unchanged.
# Stderr carries metadata only; stdout remains the original success receipt.
_PREP_PHASES=frozenset(('bootstrap', 'qa-imports-ready', 'materialize-start', 'actual380-start', 'actual380-complete', 'source-authority-start', 'source-authority-complete', 'git-mode-start', 'git-mode-returned', 'git-mode-verified', 'git-blobs-start', 'git-blobs-returned', 'git-objects-verified', 'dependency-start', 'dependency-complete', 'write-start', 'write-progress', 'write-complete', 'final-descriptors-start', 'final-descriptors-complete', 'terminal-receipt-ready'))
_PREP_DIAGNOSTICS=(__name__=='__main__')
_PREP_STARTED=time.monotonic()
_PREP_SEQUENCE=0
_PREP_BYTES=0


def _prep_phase(phase,count=None):
    global _PREP_SEQUENCE,_PREP_BYTES
    if not _PREP_DIAGNOSTICS:return
    if phase not in _PREP_PHASES or _PREP_SEQUENCE>=24:
        raise RuntimeError('Closed H preparation diagnostic bound exceeded')
    if count is not None and (type(count) is not int or not 0<=count<=1100):
        raise RuntimeError('Closed H preparation diagnostic count required')
    _PREP_SEQUENCE+=1
    record={'schema':'owned-H-preparation-phase-v1','sequence':_PREP_SEQUENCE,
            'phase':phase,'elapsed_ms':round((time.monotonic()-_PREP_STARTED)*1000,3),
            'pid':os.getpid()}
    if count is not None:record['count']=count
    line='H_PREP_PHASE:'+json.dumps(record,separators=(',',':'))+'\n'
    size=len(line.encode('utf-8'))
    if size>512 or _PREP_BYTES+size>8192:
        raise RuntimeError('Closed H preparation diagnostic byte bound exceeded')
    _PREP_BYTES+=size
    sys.stderr.write(line);sys.stderr.flush()


_prep_phase('bootstrap')

sys.path.insert(0,str(Path(__file__).absolute().parents[1]/'scripts'))
from web_reader_intake375 import (DIRECTORY,H_COMMIT,_physical_root,_require,
    _relative,_regular,_row,_sha)
from web_reader_boundary389390 import source_authority389390,_capture389390_current,CANON
from owned_intake375_proofs import _empty,_exclusive

_prep_phase('qa-imports-ready')


def _git_objects(root,rows):
    """One fixed tree-name query and bounded selected blob batch; no fetch.

    The constant-length ls-tree argv avoids the Windows32K command-line limit;
    only the explicitly pinned rows are selected from its bounded metadata."""
    names=sorted(rows)
    _require(0<len(names)<=1100 and sum(row['bytes'] for row in rows.values())<=160*1024*1024,
             'Bounded finite H object closure required')
    for name,row in rows.items():
        _relative(name);_row(row)
        _require(row.get('mode') in ('100644','100755') and
                 type(row.get('git_blob')) is str and
                 re.fullmatch('[a-f0-9]{40}',row['git_blob']) is not None,
                 'Exact H mode/blob required')
    environment={**os.environ,'GIT_NO_LAZY_FETCH':'1','GIT_ALLOW_PROTOCOL':'',
                 'GIT_TERMINAL_PROMPT':'0','GIT_CONFIG_NOSYSTEM':'1'}
    common=['git','--no-optional-locks','-c','core.fsmonitor=false','-C',str(root)]
    _prep_phase('git-mode-start',len(rows))
    mode_process=subprocess.run(common+['ls-tree','-rz','--full-tree',H_COMMIT],
                                env=environment,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
                                timeout=20,check=False)
    _prep_phase('git-mode-returned',len(rows))
    _require(mode_process.returncode==0 and len(mode_process.stdout)<=1024*1024,
             'Fixed cached H mode query failed; no fallback')
    modes={}
    for raw in mode_process.stdout.split(b'\0'):
        if not raw:continue
        header,name=raw.split(b'\t',1);mode,kind,oid=header.decode('ascii').split(' ')
        name=name.decode('utf-8')
        if name not in rows:
            continue  # fixedH tree names only; never copied or trusted as inputs
        _require(name not in modes and kind=='blob','Unexpected selected H tree member')
        modes[name]=(mode,oid)
    _require(set(modes)==set(names),'Missing cached H tree member')
    for name,row in rows.items():
        _require(modes[name]==(row['mode'],row['git_blob']),'H mode/blob mismatch: '+name)
    _prep_phase('git-mode-verified',len(rows))
    requested=''.join(H_COMMIT+':'+name+'\n' for name in names).encode('utf-8')
    _prep_phase('git-blobs-start',len(rows))
    blobs=subprocess.run(common+['cat-file','--batch'],input=requested,env=environment,
                         stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30,check=False)
    _prep_phase('git-blobs-returned',len(rows))
    _require(blobs.returncode==0,'Fixed cached H blob batch failed; no fallback')
    payload=blobs.stdout
    _require(len(payload)<=sum(row['bytes'] for row in rows.values())+100*len(rows),
             'Unexpected H batch output size')
    output={};offset=0
    for name in names:
        end=payload.find(b'\n',offset)
        _require(end>=0,'Incomplete H batch header')
        header=payload[offset:end].decode('ascii').split(' ')
        _require(len(header)==3 and header[1]=='blob' and header[0]==rows[name]['git_blob'] and
                 header[2]==str(rows[name]['bytes']),'Unexpected H batch identity/length')
        size=rows[name]['bytes'];offset=end+1
        raw=payload[offset:offset+size];offset+=size
        _require(payload[offset:offset+1]==b'\n','Incomplete H blob terminator');offset+=1
        _require(len(raw)==size and _sha(raw)==rows[name]['sha256'] and
                 hashlib.sha1(b'blob '+str(size).encode()+b'\0'+raw).hexdigest()==header[0],
                 'Unverified H object bytes: '+name)
        output[name]=raw
    _require(offset==len(payload),'Unexpected trailing H batch bytes')
    _prep_phase('git-objects-verified',len(rows))
    return output


def _materialize(source_root,destination,kind):
    _prep_phase('materialize-start')
    _require(type(source_root) in (str,type(Path('.'))) and type(destination) in (str,type(Path('.'))),
             'Exact physical source/destination roots required before IO')
    source_root=_physical_root(source_root);destination=_empty(destination)
    _require(source_root!=destination and not destination.is_relative_to(source_root) and
             not source_root.is_relative_to(destination),'Separate owned H fixture required')
    if kind=='runtime':
        _prep_phase('actual380-start')
        context,_=_capture389390_current(source_root)  # actual883d/current380 positive before H
        _prep_phase('actual380-complete')
    else:
        context=source_authority389390(source_root)  # source-only new canonical context before H
    _prep_phase('source-authority-start')
    documents=context['english']['historical375']['documents']
    _prep_phase('source-authority-complete')
    manifest=documents['H_HISTORY_FIXTURE_INPUTS.json']
    _require(manifest.get('schema')=='H-history-fixture-inputs-v1' and
             manifest.get('commit')==H_COMMIT and manifest.get('status')=='approved',
             'Unsealed fixed H fixture closure')
    files=manifest.get('source_files');runtime=manifest.get('runtime_extension')
    _require(type(files) is dict and list(files)==sorted(files) and
             type(runtime) is dict and len(runtime)==34 and
             manifest.get('source_file_count')==len(files) and
             manifest.get('runtime_file_count')==34 and
             all(not name.startswith('server/') for name in files) and
             all(name.startswith('server/') for name in runtime),
             'Exact separate H source/runtime domains required')
    rows={**files,**runtime} if kind=='runtime' else files
    _require(len(rows)==len(files)+(34 if kind=='runtime' else 0),'Overlapping H fixture domains')
    dependencies=manifest.get('dependency_inputs')
    _require(type(dependencies) is dict and list(dependencies)==['node_modules/axe-core/axe.min.js'],
             'Exactly one declared installed H dependency input required')
    dependency=dependencies['node_modules/axe-core/axe.min.js'];_row(dependency)
    lock=dependency.get('lockfile')
    _require(type(lock) is dict and lock.get('path')=='package-lock.json' and
             dependency.get('package')=='axe-core' and dependency.get('version')=='4.14.0',
             'Exact H locked dependency contract required')
    object_rows={**rows,lock['path']:lock}
    if lock['path'] in rows:
        _require(all(lock[k]==rows[lock['path']][k] for k in ('bytes','sha256','git_blob','mode')),
                 'Conflicting H dependency lock descriptor')
    raw=_git_objects(source_root,object_rows)
    _prep_phase('dependency-start')
    actual_lock=_regular(source_root,lock['path'])
    _require(actual_lock==raw[lock['path']], 'Actual dependency lock changed from H')
    locked=json.loads(actual_lock)['packages']['node_modules/axe-core']
    _require(locked['version']==dependency['version'] and locked['integrity']==dependency['integrity'],
             'Locked dependency version/integrity changed')
    dependency_raw=_regular(source_root,'node_modules/axe-core/axe.min.js')
    _require(len(dependency_raw)==dependency['bytes'] and _sha(dependency_raw)==dependency['sha256'],
             'Only exact individually reviewed installed dependency bytes allowed')
    _prep_phase('dependency-complete')
    # Exclusive writes and source hash are checked again after all cached Git
    # objects are available; no alias to actual380 bytes or generated oracle.
    written=[]
    _prep_phase('write-start',len(rows)+1)
    try:
        for name in sorted(rows):
            _exclusive(destination,name,raw[name])
            if os.name=='nt':
                status=(destination/name).lstat()
                if not (status.st_mode & stat.S_IWRITE):
                    os.chmod(destination/name,int(rows[name]['mode'],8)&0o777)
                    status=(destination/name).lstat()
            else:
                os.chmod(destination/name,int(rows[name]['mode'],8)&0o777)
                status=(destination/name).lstat()
            _require(stat.S_ISREG(status.st_mode) and not stat.S_ISLNK(status.st_mode) and
                     (os.name=='nt' or bool(status.st_mode&0o111)==(rows[name]['mode']=='100755')) and
                     _regular(destination,name)==raw[name],'H copy/mode/readback mismatch')
            written.append(name)
            if len(written) in (250,500,750,980):
                _prep_phase('write-progress',len(written))
        name='node_modules/axe-core/axe.min.js'
        _exclusive(destination,name,dependency_raw);written.append(name)
    except BaseException:
        for name in reversed(written):
            path=destination/name
            if path.is_file() and not path.is_symlink():path.unlink()
        raise
    _prep_phase('write-complete',len(written))
    _prep_phase('final-descriptors-start')
    index=manifest['index'];workflow=manifest['workflow']
    for item in (index,workflow):
        _require(item['path'] in rows and all(item[k]==rows[item['path']][k] for k in ('bytes','sha256')),
                 'H index/workflow descriptor differs from copied object')
    _prep_phase('final-descriptors-complete')
    return {'schema':'owned-H-history-fixture-v3','kind':kind,'commit':H_COMMIT,
            'root':str(destination),'files':sorted(written),'current380_checked':True,
            'current_canonical_logical_sha256':CANON,
            'index':index,'workflow':workflow}


def materialize_h_source_fixture(source_root,destination):
    return _materialize(source_root,destination,'source')


def materialize_h_runtime_fixture(source_root,destination):
    return _materialize(source_root,destination,'runtime')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('kind',choices=('source','runtime'))
    parser.add_argument('--source-root',required=True)
    parser.add_argument('--destination',required=True)
    args=parser.parse_args()
    function=materialize_h_source_fixture if args.kind=='source' else materialize_h_runtime_fixture
    receipt=function(args.source_root,args.destination)
    _prep_phase('terminal-receipt-ready',len(receipt['files']))
    sys.stdout.write(json.dumps(receipt,ensure_ascii=False,separators=(',',':'))+'\n')


if __name__=='__main__':
    main()
