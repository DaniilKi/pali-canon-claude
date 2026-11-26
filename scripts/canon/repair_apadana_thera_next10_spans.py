"""Repair only the independently reviewed next ten Therā metadata records.

Usage: repair_apadana_thera_next10_spans.py CANON.gz COMMENTARY.gz VRI-DIR NEW-CANON.gz
All paths differ; input paths and all components must be regular, output is new
and outside VRI-DIR. Use physical resolved paths on systems with /tmp aliases.
"""
import copy
import gzip
import hashlib
import json
import re
import sys
from pathlib import Path
from apadana_thera_next10_spans import (
    TARGETS, COMMIT, BOOKS, ROOT_BLOCKS_SHA256, ROOT_BLOCK_COUNTS, PAIRS,
    PRE_NEXT10_SHA256, POST_NEXT10_SHA256, NEW_UNITS,
    digest, next10_state, canon_before_next10, compact_blocks, apadana_thera_next10_spans,
)
from build_canon import Builder
import vri

XML_SHA256 = {36:'ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1',
              37:'23e0721c8fe05a6105b56b627ac38291d10e0eab799a082c257466603f0839a1'}
XML_BLOB = {36:'f37368072aece065d2668f93a74c24b423939f1f',
            37:'c2a96aed52fb5de3e7fe66442633e5f045cf5bdf'}
COMMENTARY_SHA256 = '8b9c055181913097bb37cbe0046e8c64efcabea884aad49d272a424cd1207461'


def checked_path(value, directory=False, new=False):
    path = Path(value).absolute()  # Do not erase a supplied symlink before checking.
    for node in (path,*path.parents):
        if node.is_symlink():
            raise ValueError('Repair paths cannot contain symlinks; use physical paths')
    if new:
        if path.exists() or not path.parent.is_dir():
            raise ValueError('Output must be new with an existing regular parent directory')
    elif not (path.is_dir() if directory else path.is_file()):
        raise ValueError('Regular source directory/input file required')
    # Only normalize AFTER rejecting all supplied symlink components.
    # Containment checks must compare physical paths, including dot-dot spellings.
    return path.resolve(strict=not new)


def repair(canon, commentary, source_root):
    if re.fullmatch('[a-f0-9]{64}',POST_NEXT10_SHA256 or '') is None:
        raise ValueError('Independent future canonical oracle is not bound')
    if digest(canon) not in (PRE_NEXT10_SHA256,POST_NEXT10_SHA256):
        raise ValueError('Exact old0f9 or presealed all-new canonical input required')
    before = canon_before_next10(canon)
    if digest(before) != PRE_NEXT10_SHA256 or digest(commentary) != COMMENTARY_SHA256:
        raise ValueError('Exact reviewed complete canonical/commentary inputs required')
    if len(canon['books']) != 61 or len(canon['units']) != 8544:
        raise ValueError('Exact full61-book/8544-record snapshot required')
    source_root = checked_path(source_root,directory=True)
    parsed, compact, source_proofs = {}, {}, {}
    for bi,file in BOOKS.items():
        path = checked_path(source_root/'romn'/file)
        raw = path.read_bytes()
        blob = hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
        if blob != XML_BLOB[bi] or hashlib.sha256(raw).hexdigest() != XML_SHA256[bi]:
            raise ValueError('Pinned original XML bytes differ for book'+str(bi))
        if canon['books'][bi].get('file') != file:
            raise ValueError('Unexpected original source book identity')
        parsed[bi] = vri.parse(str(path))
        compact[bi] = compact_blocks(parsed[bi])
        if (len(compact[bi]) != ROOT_BLOCK_COUNTS[bi]
                or compact[bi] != canon['books'][bi]['blocks']
                or digest(compact[bi]) != ROOT_BLOCKS_SHA256[bi]):
            raise ValueError('Entire original source words/notes/pages differ for book'+str(bi))
        source_proofs[bi] = {'file':file,'xml_git_blob':blob,'xml_sha256':XML_SHA256[bi],
                            'source_blocks':len(compact[bi]),'source_tuple_sha256':digest(compact[bi])}
    if sum(map(len,commentary['units'].values())) != 16473 or any(commentary['units'].get(k) for k in TARGETS):
        raise ValueError('Next-ten commentary associations require independent review')
    intervals = {bi:set() for bi in BOOKS}
    for passage in commentary['passages']:
        bi = passage[3]
        if bi not in BOOKS:
            continue
        lo,hi = passage[9:11]
        if (type(bi) is not int or type(lo) is not int or type(hi) is not int
                or not 0 <= lo < hi <= len(compact[bi])):
            raise ValueError('Invalid accepted commentary source-root interval')
        # Independent reports find no intersections in the five ENTIRE unions;
        # do not mistake the58 accepted book37 intervals elsewhere for a hold.
        if any(bi==book and lo < NEW_UNITS[right]['end'] and NEW_UNITS[left]['start'] < hi
               for book,left,right,cut,oldcut in PAIRS):
            raise ValueError('Accepted commentary evidence intersects next-ten source union')
        intervals[bi].add((lo,hi))
    units = copy.deepcopy(canon['units'])
    books = [dict(b,blocks=parsed[i]) if i in parsed else b for i,b in enumerate(canon['books'])]
    changed = apadana_thera_next10_spans(books,units)
    by_id = {u['id']:u for u in units}
    annotation = Builder.__new__(Builder)
    local_books = {36:0,37:1}
    annotation.books = [dict(canon['books'][bi],blocks=parsed[bi]) for bi in BOOKS]
    annotation.units = [dict(by_id[key],book=local_books[by_id[key]['book']]) for key in TARGETS]
    annotation.annotate_pages()
    for key,annotated in zip(TARGETS,annotation.units):
        if by_id[key]['pts'] != annotated.get('pts') or by_id[key]['pts'] != NEW_UNITS[key]['pts']:
            raise ValueError('PTS annotation differs from independently reviewed source: '+key)
    if next10_state(units) != 'new':
        raise ValueError('Atomic all-new ten-record state not reached')
    out = dict(canon,units=units)
    if digest(out) != POST_NEXT10_SHA256:
        raise ValueError('Output differs from independently presealed complete future oracle')
    if digest(canon_before_next10(out)) != PRE_NEXT10_SHA256:
        raise ValueError('Complete inverse no longer equals the original canonical input')
    report = {
        'schema':'reviewed-next-ten-thera-boundary-repair-v1',
        'input_sha256':digest(canon),'output_sha256':digest(out),
        'historical_inverse_sha256':digest(before),'changed_units':changed,
        'index_revision':'apadana-thera-next10-v1',
        'original_sources':source_proofs,'commentary_sha256':digest(commentary),
        'commentary_changes':0,'target_commentary_associations':0,
        'accepted_source_root_intervals_checked':{bi:[list(x) for x in sorted(v)] for bi,v in intervals.items()},
        'accepted_commentary_intersections_with_closed_unions':0,
        'preserved_unions':[{'book':bi,'ids':[left,right],
            'source_blocks':[by_id[left]['start'],by_id[right]['end']],
            'tuple_sha256':digest(compact[bi][by_id[left]['start']:by_id[right]['end']])}
            for bi,left,right,cut,oldcut in PAIRS],
        'units':{key:{'before':next(u for u in canon['units'] if u['id']==key),'after':by_id[key]}
                 for key in TARGETS},
        'preserved_other_units':8534,'preserved_source_books':61,
        'previous_namespaces_preserved':True,'private_data_accessed':False,
        'english_activations':0,'rights_changes':0,
    }
    canon['units'] = units  # The sole publish/mutation occurs after EVERY check.
    return report


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 4:
        raise ValueError(__doc__)
    ci,ai,root,co = argv
    ci,ai = checked_path(ci),checked_path(ai)
    root,co = checked_path(root,directory=True),checked_path(co,new=True)
    paths = [str(p.resolve()) for p in (ci,ai,root,co)]
    if len(set(paths)) != 4 or root in co.parents:
        raise ValueError('Distinct paths and output outside the original VRI checkout required')
    with gzip.open(ci,'rt',encoding='utf-8') as stream:
        canon = json.load(stream)
    with gzip.open(ai,'rt',encoding='utf-8') as stream:
        commentary = json.load(stream)
    report = repair(canon,commentary,root)
    # Exclusive creation also closes an output-creation race; no truncating wb.
    with co.open('xb') as output:
        with gzip.GzipFile(filename='',fileobj=output,mode='wb',compresslevel=9,mtime=0) as compressed:
            compressed.write(json.dumps(canon,ensure_ascii=False,separators=(',',':')).encode('utf-8'))
    print(json.dumps(report,ensure_ascii=False,indent=2))
    return report


if __name__ == '__main__':
    main()
