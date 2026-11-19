"""Pinned atomic canonical 107/108 metadata repair; never repair source words.

Usage: repair_apadana_thera_pair_spans.py CANON-IN COMMENTARY-IN VRI-DIR CANON-OUT COMMENTARY-OUT
Freshly unpack current branch inputs. Supply complete original pinned root and
commentary XML in VRI-DIR/romn. Replaying corrected data is idempotent.
"""
import copy
import gzip
import hashlib
import json
import os
import sys

from apadana_thera_pair_spans import (
    apadana_thera_pair_spans, canon_before_thera_pair, paired_state,
    digest, COMMIT, FILE, TARGETS, PRE_PAIR_SHA256, ROOT_BLOCKS_SHA256,
)
from build_canon import Builder
from shared_spans import write_gzip
import vri

BLOB = 'f37368072aece065d2668f93a74c24b423939f1f'
ATT = 's0510a.att.xml'
ATT_BLOB = 'd5a3b791ac751f0a8e9c1e96c6877ea20a983917'
COMMENTARY_SHA256 = '8b9c055181913097bb37cbe0046e8c64efcabea884aad49d272a424cd1207461'
COMMENTARY_BLOCKS_SHA256 = '4c775abede5fee87eced40a0a93b20e80127cf61822d0292814ddd88fe7f4acc'
ROOT_PINS = {
    'tha-ap107': '8265ed1495f66976c336c8a934d76c90641245b6969e4513bc2503d80ce3a479',
    'tha-ap108': 'c114e65895bb8f43a8c7f774856ab295bc9ce5f80f6fd41d0e6ebefc9e65bb36',
}


def source(root, filename, expected_blob):
    path = os.path.join(root, 'romn', filename)
    with open(path, 'rb') as f:
        raw = f.read()
    blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if blob != expected_blob:
        raise ValueError(f'Original reviewed Therā XML Git blob differs: {filename}')
    return vri.parse(path), {'file': filename, 'git_blob_sha1': blob,
                             'xml_sha256': hashlib.sha256(raw).hexdigest(), 'xml_bytes': len(raw)}


def repair(canon, commentary, root):
    # Reject stale/rebased inputs before touching either dataset. The inverse
    # validates its two exact records, not merely a hash or mapping-revision tag.
    if (canon['source'].get('commit') != COMMIT or commentary['source'].get('commit') != COMMIT
            or digest(canon_before_thera_pair(canon)) != PRE_PAIR_SHA256
            or digest(commentary) != COMMENTARY_SHA256):
        raise ValueError('Fresh reviewed pre-pair canonical/commentary inputs required')
    if ([i for i, b in enumerate(canon['books']) if b['file'] == FILE] != [36]
            or [i for i, b in enumerate(commentary['books']) if b['file'] == ATT] != [28]):
        raise ValueError('Unexpected original Therā book identities')
    parsed, root_source = source(root, FILE, BLOB)
    att, commentary_source = source(root, ATT, ATT_BLOB)
    compact = [[b['rend'], b['n'], b['text'], b['notes'],
                {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}]
               for b in parsed]
    att_compact = [[b['rend'], b['n'], b['text'], [f'{v}.{p}' for v, p in b['pages'].get('P', [])]]
                   for b in att]
    if (compact != canon['books'][36]['blocks'] or digest(compact) != ROOT_BLOCKS_SHA256
            or att_compact != commentary['books'][28]['blocks']
            or digest(att_compact) != COMMENTARY_BLOCKS_SHA256):
        raise ValueError('Full original Therā root/commentary blocks, notes or pages differ')
    associations = sum(len(v) for v in commentary['units'].values())
    if associations != 16473 or any(commentary['units'].get(k, []) for k in TARGETS):
        raise ValueError('Therā pair commentary edges require separate independent review')
    original = {u['id']: copy.deepcopy(u) for u in canon['units'] if u['id'] in TARGETS}
    units = copy.deepcopy(canon['units'])
    books = [dict(b, blocks=parsed) if i == 36 else b for i, b in enumerate(canon['books'])]
    changed = apadana_thera_pair_spans(books, units)
    by_id = {u['id']: u for u in units}
    annotation = Builder.__new__(Builder)
    annotation.books = [dict(canon['books'][36], blocks=parsed)]
    annotation.units = [dict(by_id[key], book=0) for key in TARGETS]
    annotation.annotate_pages()
    for key, annotated in zip(TARGETS, annotation.units):
        if by_id[key]['pts'] != annotated.get('pts'):
            raise ValueError('Reviewed Therā PTS limits no longer agree with original XML')
        u = by_id[key]
        root_pin = digest({'id': key, 'book': 36, 'start': u['start'], 'end': u['end'],
                           'blocks': compact[u['start']:u['end']]})
        if root_pin != ROOT_PINS[key]:
            raise ValueError('Reviewed Therā paired source alignment differs')
    if paired_state(units) != 'new':
        raise ValueError('Atomic Therā paired repair did not reach exact reviewed state')
    report = {
        'source_commit': COMMIT, 'root_source': root_source, 'commentary_source': commentary_source,
        'root_book_blocks_sha256': digest(compact), 'commentary_book_blocks_sha256': digest(att_compact),
        'input_canon_sha256': digest(canon), 'historical_pre_pair_canon_sha256': PRE_PAIR_SHA256,
        'input_commentary_sha256': digest(commentary), 'changed_spans': changed,
        'commentary_changes': {}, 'commentary_associations': associations,
        'units': {key: {'before': original[key], 'after': by_id[key],
                        'root_blocks_sha256': digest(compact[by_id[key]['start']:by_id[key]['end']]),
                        'root_sha256': ROOT_PINS[key]} for key in TARGETS},
        'preserved_union': {'start': 5231, 'end': 5271, 'original_blocks': 40,
                            'sha256': digest(compact[5231:5271]), 'each_block_occurs_once': True},
        'preserved': ['all61canonical source books/wording/notes/pages', 'all8542other canonical units',
                      'complete commentary, unaligned original passages and all16473associations',
                      'original citation titles and unchanged PTS limits', 'all unrelated locator revisions',
                      'source rights holds; boundary repair adds no English coverage', 'private data (not accessed)'],
    }
    # All validation precedes the sole mutation. Commentary is never assigned.
    canon['units'] = units
    report['output_canon_sha256'] = digest(canon)
    report['output_commentary_sha256'] = digest(commentary)
    return report


if __name__ == '__main__':
    if len(sys.argv) != 6 or len(set(map(os.path.realpath, sys.argv[1:]))) != 5:
        raise SystemExit(__doc__)
    ci, ai, root, co, ao = sys.argv[1:]
    with gzip.open(ci, 'rt', encoding='utf-8') as f:
        canon = json.load(f)
    with gzip.open(ai, 'rt', encoding='utf-8') as f:
        commentary = json.load(f)
    report = repair(canon, commentary, root)
    write_gzip(co, canon)
    write_gzip(ao, commentary)
    print(json.dumps(report, ensure_ascii=False, indent=2))
