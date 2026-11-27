"""Three fixed, stateless owned-fixture domains. Full wording is never copied."""
from pathlib import Path
import os
import stat
import sys

# Original tests import from an explicitly selected owned __file__ root.
sys.path.insert(0,str(Path(__file__).absolute().parents[1]/'scripts'))
from web_reader_intake375 import (DIRECTORY,PINS,RUNTIME_PINS,_physical_root,
    _relative,_regular,_read_row,_require,_source,_closure,_capture375_current,
    _sha,source_authority375)


def _empty(destination):
    destination=_physical_root(destination)
    _require(not any(destination.iterdir()),'Fresh EMPTY owned destination required')
    return destination


def _exclusive(destination,name,raw):
    destination=_physical_root(destination)
    _relative(name)
    node=destination
    pieces=name.split('/')
    for part in pieces[:-1]:
        node=node/part
        if not node.exists() and not node.is_symlink():
            node.mkdir()
        status=node.lstat()
        _require(stat.S_ISDIR(status.st_mode) and not stat.S_ISLNK(status.st_mode),
                 'Owned nonsymlink directory parent required')
    leaf=node/pieces[-1]
    _require(not leaf.exists() and not leaf.is_symlink(),'Exclusive owned file required: '+name)
    with leaf.open('xb') as stream:
        stream.write(raw)
    _require(_regular(destination,name)==raw,'Owned copy readback differs: '+name)


def _copy(source_root,destination,kind):
    # No source/destination callbacks, carried scopes, old copier or old capture.
    _require(type(source_root) in (str,type(Path('.'))) and type(destination) in (str,type(Path('.'))),
             'Exact physical source/destination roots required before IO')
    root=_physical_root(source_root);destination=_empty(destination)
    _require(root!=destination and not destination.is_relative_to(root) and
             not root.is_relative_to(destination),'Separate external owned fixture required')
    if kind=='source':
        _,documents,_=_source(root)
        runtime=None
    else:
        _,runtime=_capture375_current(root)
        # These are separately pinned source documents, never current output
        # expected data. A repeated source metadata read is disclosed; actual27
        # capture above still occurs exactly once and all copies read back.
        _,documents,_=_source(root)
    names={DIRECTORY+'/'+leaf:pin for leaf,pin in PINS.items()}
    rows=_closure(documents)
    for name,row in rows.items():
        if kind!='source' or row['domain']=='H_source_prerequisite':
            names[name]=row['sha256']
    if kind!='source':
        names.update({DIRECTORY+'/'+leaf:pin for leaf,pin in RUNTIME_PINS.items()})
        for name,row in runtime.items():
            if kind=='runtime' or name.startswith('data/'):
                names['server/'+name]=row['sha256']
    _require(len(names)==len(set(names)),'Finite owned input paths must be unique')
    written=[]
    try:
        for name,pin in sorted(names.items()):
            raw=_regular(root,name)
            _require(_sha(raw)==pin,'Changed input while copying: '+name)
            _exclusive(destination,name,raw)
            written.append(name)
    except BaseException:
        # Do not delete arbitrary caller trees. Only this invocation's exclusive
        # files are removed; partial destinations remain unusable/nonempty.
        for name in reversed(written):
            leaf=destination/name
            if leaf.is_file() and not leaf.is_symlink():
                leaf.unlink()
        raise
    # Verify the completed positive against the same physical public authority.
    if kind=='source':
        source_authority375(destination)
    else:
        _capture375_current(destination)
    return frozenset(written)


def copy_current375_source_inputs(source_root,destination):
    return _copy(source_root,destination,'source')


def copy_current375_data_inputs(source_root,destination):
    return _copy(source_root,destination,'data')


def copy_current375_runtime_inputs(source_root,destination):
    return _copy(source_root,destination,'runtime')
