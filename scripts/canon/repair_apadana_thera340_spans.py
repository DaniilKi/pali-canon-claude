"""Atomically repair exactly six metadata records without altering source words.

Usage: repair_apadana_thera340_spans.py OLD-CANON.gz COMMENTARY.gz VRI-DIR NEW-CANON.gz
All four paths must differ; the output must be new. Exact corrected input is idempotent.
"""
import copy
import gzip
import hashlib
import json
import sys
from pathlib import Path
from apadana_thera340_spans import (
    TARGETS, COMMIT, FILE, PRE_SIX_SHA256, POST_SIX_SHA256, ROOT_BLOCKS_SHA256,
    digest, six_state, canon_before_thera340, apadana_thera340_spans,
)
from build_canon import Builder
from shared_spans import write_gzip
import vri

XML_BLOB = 'f37368072aece065d2668f93a74c24b423939f1f'
XML_SHA256 = 'ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
COMMENTARY_SHA256 = '8b9c055181913097bb37cbe0046e8c64efcabea884aad49d272a424cd1207461'
PAIRS = (('tha-ap340', 'tha-ap341', 10118), ('tha-ap343', 'tha-ap344', 10258),
         ('tha-ap346', 'tha-ap347', 10324))


def repair(canon, commentary, source_root):
    before = canon_before_thera340(canon)
    if digest(before) != PRE_SIX_SHA256 or digest(commentary) != COMMENTARY_SHA256:
        raise ValueError('Exact reviewed canonical and commentary inputs required')
    raw = (Path(source_root) / 'romn' / FILE).read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if blob != XML_BLOB or hashlib.sha256(raw).hexdigest() != XML_SHA256:
        raise ValueError('Pinned original six-poem XML bytes differ')
    parsed = vri.parse(str(Path(source_root) / 'romn' / FILE))
    compact = [[b['rend'], b['n'], b['text'], b['notes'],
                {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}]
               for b in parsed]
    if compact != canon['books'][36]['blocks'] or digest(compact) != ROOT_BLOCKS_SHA256:
        raise ValueError('Original complete source blocks, notes or pages differ')
    if sum(map(len, commentary['units'].values())) != 16473 or any(commentary['units'].get(k) for k in TARGETS):
        raise ValueError('Six-poem commentary ownership needs independent review')
    root_intervals = set()
    for passage in commentary['passages']:
        if passage[3] != 36:
            continue
        lo, hi = passage[9:11]
        if not (type(lo) is int and type(hi) is int and 0 <= lo < hi <= len(compact)):
            raise ValueError('Invalid accepted commentary source-root interval')
        if any(lo < cut + 4 and cut < hi for _, _, cut in PAIRS):
            raise ValueError('A moved source prefix intersects accepted commentary evidence')
        root_intervals.add((lo, hi))
    units = copy.deepcopy(canon['units'])
    books = [dict(b, blocks=parsed) if i == 36 else b for i, b in enumerate(canon['books'])]
    changed = apadana_thera340_spans(books, units)
    by_id = {u['id']: u for u in units}
    annotation = Builder.__new__(Builder)
    annotation.books = [dict(canon['books'][36], blocks=parsed)]
    annotation.units = [dict(by_id[key], book=0) for key in TARGETS]
    annotation.annotate_pages()
    for key, annotated in zip(TARGETS, annotation.units):
        if by_id[key]['pts'] != annotated.get('pts'):
            raise ValueError('PTS annotation differs from independently reviewed source')
    if six_state(units) != 'new':
        raise ValueError('Atomic six-poem state not reached')
    out = dict(canon, units=units)
    if digest(out) != POST_SIX_SHA256:
        raise ValueError('Output exceeds the exact independently reviewed six-record delta')
    report = {
        'schema': 'reviewed-six-poem-boundary-repair-v1',
        'input_sha256': digest(canon), 'output_sha256': digest(out),
        'historical_inverse_sha256': digest(before), 'changed_units': changed,
        'xml_git_blob': blob, 'xml_sha256': hashlib.sha256(raw).hexdigest(),
        'source_book_blocks_sha256': digest(compact),
        'commentary_sha256': digest(commentary), 'commentary_changes': 0,
        'accepted_book36_root_intervals_checked': [list(x) for x in sorted(root_intervals)],
        'accepted_commentary_intersections_with_moved_prefixes': 0,
        'preserved_unions': [{'ids': [left, right],
            'source_blocks': [by_id[left]['start'], by_id[right]['end']],
            'tuple_sha256': digest(compact[by_id[left]['start']:by_id[right]['end']])}
            for left, right, _ in PAIRS],
        'units': {key: {'before': next(u for u in canon['units'] if u['id'] == key),
                        'after': by_id[key], 'root_sha256': digest({'id': key, 'book': 36,
                        'start': by_id[key]['start'], 'end': by_id[key]['end'],
                        'blocks': compact[by_id[key]['start']:by_id[key]['end']]})} for key in TARGETS},
        'preserved_other_units': 8538, 'private_data_accessed': False,
        'english_activations': 0, 'rights_changes': 0,
    }
    canon['units'] = units  # Publish only after every input/output/source check succeeds.
    return report


if __name__ == '__main__':
    if len(sys.argv) != 5 or len(set(str(Path(s).resolve()) for s in sys.argv[1:])) != 4:
        raise SystemExit(__doc__)
    ci, ai, root, co = sys.argv[1:]
    if Path(co).exists() or Path(co).is_symlink():
        raise ValueError('Output must be a new file')
    with gzip.open(ci, 'rt', encoding='utf8') as f:
        canon = json.load(f)
    with gzip.open(ai, 'rt', encoding='utf8') as f:
        commentary = json.load(f)
    report = repair(canon, commentary, root)
    write_gzip(co, canon)
    print(json.dumps(report, ensure_ascii=False, indent=2))
