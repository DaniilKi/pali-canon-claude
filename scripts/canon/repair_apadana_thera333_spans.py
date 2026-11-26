"""Atomically repair four reviewed metadata records, not source wording.

Usage: repair_apadana_thera333_spans.py OLD-CANON.gz COMMENTARY.gz VRI-DIR NEW-CANON.gz
Inputs and output must be distinct. Replaying the exact corrected input is idempotent.
"""
import copy
import gzip
import hashlib
import json
import sys
from pathlib import Path
from apadana_thera333_spans import (
    TARGETS, COMMIT, FILE, OLD_UNITS, NEW_UNITS, PRE_FOUR_SHA256,
    ROOT_BLOCKS_SHA256, digest, four_state, canon_before_thera333,
    apadana_thera333_spans,
)
from build_canon import Builder
from shared_spans import write_gzip
import vri

XML_BLOB = 'f37368072aece065d2668f93a74c24b423939f1f'
COMMENTARY_SHA256 = '8b9c055181913097bb37cbe0046e8c64efcabea884aad49d272a424cd1207461'


def repair(canon, commentary, source_root):
    before = canon_before_thera333(canon)
    if (digest(before) != PRE_FOUR_SHA256 or canon['source']['commit'] != COMMIT
            or digest(commentary) != COMMENTARY_SHA256):
        raise ValueError('Exact reviewed canonical and commentary inputs required')
    raw = (Path(source_root) / 'romn' / FILE).read_bytes()
    blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if blob != XML_BLOB:
        raise ValueError('Pinned original four-poem XML Git blob differs')
    parsed = vri.parse(str(Path(source_root) / 'romn' / FILE))
    compact = [[b['rend'], b['n'], b['text'], b['notes'],
                {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}]
               for b in parsed]
    if compact != canon['books'][36]['blocks'] or digest(compact) != ROOT_BLOCKS_SHA256:
        raise ValueError('Original complete source blocks, notes or pages differ')
    if sum(map(len, commentary['units'].values())) != 16473 or any(commentary['units'].get(k) for k in TARGETS):
        raise ValueError('Four-poem commentary ownership needs independent review')
    units = copy.deepcopy(canon['units'])
    books = [dict(b, blocks=parsed) if i == 36 else b for i, b in enumerate(canon['books'])]
    changed = apadana_thera333_spans(books, units)
    by_id = {u['id']: u for u in units}
    annotation = Builder.__new__(Builder)
    annotation.books = [dict(canon['books'][36], blocks=parsed)]
    annotation.units = [dict(by_id[key], book=0) for key in TARGETS]
    annotation.annotate_pages()
    for key, annotated in zip(TARGETS, annotation.units):
        if by_id[key]['pts'] != annotated.get('pts'):
            raise ValueError('PTS annotation differs from the original source')
    if four_state(units) != 'new':
        raise ValueError('Atomic four-poem state not reached')
    out = dict(canon, units=units)
    report = {
        'schema': 'reviewed-four-poem-boundary-repair-v1',
        'input_sha256': digest(canon), 'output_sha256': digest(out),
        'historical_inverse_sha256': digest(before), 'changed_units': changed,
        'xml_git_blob': blob, 'xml_sha256': hashlib.sha256(raw).hexdigest(),
        'source_book_blocks_sha256': digest(compact),
        'commentary_sha256': digest(commentary), 'commentary_changes': 0,
        'preserved_union': [9767, 9890], 'union_blocks_sha256': digest(compact[9767:9890]),
        'units': {key: {'before': next(u for u in canon['units'] if u['id'] == key),
                        'after': by_id[key], 'root_sha256': digest({'id': key, 'book': 36,
                        'start': by_id[key]['start'], 'end': by_id[key]['end'],
                        'blocks': compact[by_id[key]['start']:by_id[key]['end']]})} for key in TARGETS},
        'preserved_other_units': 8540, 'private_data_accessed': False,
        'english_activations': 0,
    }
    canon['units'] = units
    return report


if __name__ == '__main__':
    if len(sys.argv) != 5 or len(set(map(lambda s: str(Path(s).resolve()), sys.argv[1:]))) != 4:
        raise SystemExit(__doc__)
    ci, ai, root, co = sys.argv[1:]
    if Path(co).exists():
        raise ValueError('Output must be a new file')
    with gzip.open(ci, 'rt', encoding='utf8') as f:
        canon = json.load(f)
    with gzip.open(ai, 'rt', encoding='utf8') as f:
        commentary = json.load(f)
    report = repair(canon, commentary, root)
    write_gzip(co, canon)
    print(json.dumps(report, ensure_ascii=False, indent=2))
