"""Actual382 copy domains; immutable380 source proofs, no historical capture."""
from pathlib import Path
from web_reader_intake380 import (_physical_root, _regular, _sha, _require, _proof_rows)
from web_reader_intake382 import (source_authority382 as source_authority389390,
    _capture382_current as _capture389390_current, _source_metadata_pins, _all_metadata_pins)
# Reuse the exact old physical guard/write primitives, never its old capture.
from owned_intake375_proofs import _empty, _exclusive


def _copy(source_root,destination,kind):
    _require(type(source_root) in (str,type(Path('.'))) and type(destination) in (str,type(Path('.'))),
             'Exact physical source/destination roots required before IO')
    root=_physical_root(source_root);destination=_empty(destination)
    _require(root!=destination and not destination.is_relative_to(root) and
             not root.is_relative_to(destination),'Separate external owned fixture required')
    if kind=='source':
        context=source_authority389390(root)
        authority=context['english']
        runtime=None
    else:
        context,runtime=_capture389390_current(root)
        authority=context['english']
    names=_source_metadata_pins() if kind=='source' else _all_metadata_pins()
    for name,row in _proof_rows(authority).items():
        if kind!='source' or row['domain']=='H_source_prerequisite':
            _require(name not in names,'Overlapping source/proof copy domains')
            names[name]=row['sha256']
    if kind!='source':
        for name,row in runtime.items():
            if kind=='runtime' or name.startswith('data/'):
                _require('server/'+name not in names,'Overlapping runtime/proof copy domains')
                names['server/'+name]=row['sha256']
    _require(len(names)==(225 if kind=='source' else 291 if kind=='data' else 298),
             'Exact finite source/data/runtime copy set required')
    written=[]
    try:
        for name,pin in sorted(names.items()):
            raw=_regular(root,name)
            _require(_sha(raw)==pin,'Changed input while copying: '+name)
            _exclusive(destination,name,raw)
            written.append(name)
    except BaseException:
        # Only this invocation's exclusive outputs may be removed. Caller
        # sentinels/aliased parents never become recursive cleanup targets.
        for name in reversed(written):
            leaf=destination/name
            if leaf.is_file() and not leaf.is_symlink():leaf.unlink()
        raise
    if kind=='source':source_authority389390(destination)
    else:_capture389390_current(destination)
    return frozenset(written)


def copy_current380_source_inputs(source_root,destination):
    return _copy(source_root,destination,'source')


def copy_current380_data_inputs(source_root,destination):
    return _copy(source_root,destination,'data')


def copy_current380_runtime_inputs(source_root,destination):
    return _copy(source_root,destination,'runtime')
