"""Reserved paired boundary CLI; unbound oracle/namespace deliberately refuse.
Usage: repair_apadana_thera389390_spans.py CANON.gz COMMENTARY.gz VRI-DIR NEW-CANON.gz
No input/private record is overwritten. Output is exclusive and outside VRI-DIR.
"""
import copy
import gzip
import hashlib
import json
import sys
from pathlib import Path
from apadana_thera389390_spans import (
    BOOK, FILE, TARGETS, COMMIT, PRE_PAIR_SHA256, POST_PAIR_SHA256,
    ROOT_BLOCK_COUNT, ROOT_BLOCK_SHA256, UNION, UNION_SHA256,
    digest, compact_blocks, _bound, pair_state, canon_before_389390,
    new_units, apadana_thera389390_spans,
)
from build_canon import Builder
import vri

XML_SHA256 = 'ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
XML_BLOB = 'f37368072aece065d2668f93a74c24b423939f1f'
COMMENTARY_SHA256 = '8b9c055181913097bb37cbe0046e8c64efcabea884aad49d272a424cd1207461'


def checked_path(value, directory=False, new=False):
    path = Path(value)
    if '..' in path.parts:
        raise ValueError('Repair paths cannot contain traversal components')
    path = path.absolute()
    for node in (path, *path.parents):
        if node.is_symlink():
            raise ValueError('Repair paths cannot contain symlinks; use physical paths')
    if new:
        if path.exists() or not path.parent.is_dir():
            raise ValueError('Output must be new with an existing regular directory')
    elif not (path.is_dir() if directory else path.is_file()):
        raise ValueError('Regular original source directory/input file required')
    return path.resolve(strict=not new)


def repair(canon, commentary, source_root):
    _bound()
    before = canon_before_389390(canon)
    if len(canon['books']) != 61 or len(canon['units']) != 8544 or digest(before) != PRE_PAIR_SHA256:
        raise ValueError('Exact full61-book/8544-record F3 inverse required')
    if digest(commentary) != COMMENTARY_SHA256:
        raise ValueError('Exact unchanged commentary required')
    source_root = checked_path(source_root, directory=True)
    path = checked_path(source_root / 'romn' / FILE)
    raw = path.read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if blob != XML_BLOB or hashlib.sha256(raw).hexdigest() != XML_SHA256:
        raise ValueError('Exact original VRI XML required')
    parsed = vri.parse(str(path))
    compact = compact_blocks(parsed)
    if (canon['books'][BOOK].get('file') != FILE or len(compact) != ROOT_BLOCK_COUNT
            or compact != canon['books'][BOOK]['blocks'] or digest(compact) != ROOT_BLOCK_SHA256
            or digest(compact[UNION[0]:UNION[1]]) != UNION_SHA256):
        raise ValueError('Full book/root source tuples changed')
    if any(commentary['units'].get(key) for key in TARGETS):
        raise ValueError('Pair commentary mapping requires separate review')
    for passage in commentary['passages']:
        bi = passage[3]
        if bi != BOOK:
            continue
        lo, hi = passage[9:11]
        if type(bi) is not int or type(lo) is not int or type(hi) is not int or not 0 <= lo < hi <= ROOT_BLOCK_COUNT:
            raise ValueError('Invalid accepted commentary source interval')
        if lo < UNION[1] and UNION[0] < hi:
            raise ValueError('Accepted commentary evidence intersects pair union')
    units = copy.deepcopy(canon['units'])
    books = [dict(book, blocks=parsed) if i == BOOK else book for i, book in enumerate(canon['books'])]
    changed = apadana_thera389390_spans(books, units)
    selected = {row['id']: row for row in units if row['id'] in TARGETS}
    annotation = Builder.__new__(Builder)
    annotation.books = [dict(canon['books'][BOOK], blocks=parsed)]
    annotation.units = [dict(selected[key], book=0) for key in TARGETS]
    annotation.annotate_pages()
    if any(row.get('pts') != new_units()[key]['pts'] for key, row in zip(TARGETS, annotation.units)):
        raise ValueError('PTS annotation differs from original source')
    output = dict(canon, units=units)
    if pair_state(units) != 'new' or digest(output) != POST_PAIR_SHA256:
        raise ValueError('Output differs from independent full future canon oracle')
    if digest(canon_before_389390(output)) != PRE_PAIR_SHA256:
        raise ValueError('Exact two-record inverse failed')
    report = {'schema': 'reserved-reviewed-thera389390-boundary-repair-v1',
              'input_sha256': digest(canon), 'output_sha256': digest(output),
              'historical_inverse_sha256': digest(before), 'changed_units': changed,
              'source_commit': COMMIT, 'xml_sha256': XML_SHA256, 'xml_git_blob': blob,
              'preserved_books': 61, 'preserved_other_units': 8542,
              'union36_tuple_sha256': UNION_SHA256, 'commentary_changes': 0,
              'english_activations': 0, 'personal_data_accessed': False}
    canon['units'] = units  # Sole in-memory publish occurs after every validation.
    return report


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 4:
        raise ValueError(__doc__)
    ci, ai = checked_path(argv[0]), checked_path(argv[1])
    root, co = checked_path(argv[2], directory=True), checked_path(argv[3], new=True)
    if len({ci, ai, root, co}) != 4 or co.is_relative_to(root):
        raise ValueError('Distinct paths/output outside original VRI directory required')
    with gzip.open(ci, 'rt', encoding='utf-8') as stream:
        canon = json.load(stream)
    with gzip.open(ai, 'rt', encoding='utf-8') as stream:
        commentary = json.load(stream)
    report = repair(canon, commentary, root)
    with co.open('xb') as output:
        with gzip.GzipFile(filename='', fileobj=output, mode='wb', compresslevel=9, mtime=0) as zipped:
            zipped.write(json.dumps(canon, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return report


if __name__ == '__main__':
    main()
