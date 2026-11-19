"""Pinned fourth-vagga Therī Apadāna ownership repair; no wording/commentary changes.

Usage: repair_apadana_fourth_spans.py CANON-IN COMMENTARY-IN VRI-DIR CANON-OUT
Unpack current branch inputs first. Supply the complete original pinned XML.
Receipt hashes identify the actual input and output; never install stale inputs.
"""
import copy
import gzip
import hashlib
import json
import os
import sys

from apadana_fourth_spans import apadana_fourth_spans, FILE, TARGETS
from build_canon import Builder
from build_commentary import RootBook
from shared_spans import write_gzip
import vri

COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
BLOB = 'c2a96aed52fb5de3e7fe66442633e5f045cf5bdf'


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def repair(canon, commentary, root):
    if canon['source'].get('commit') != COMMIT or commentary['source'].get('commit') != COMMIT:
        raise ValueError('Canon/commentary must both use the reviewed VRI commit')
    found = [i for i, b in enumerate(canon['books']) if b['file'] == FILE]
    if len(found) != 1:
        raise ValueError('Expected one Therī Apadāna source book')
    bi = found[0]
    source_path = os.path.join(root, 'romn', FILE)
    with open(source_path, 'rb') as f:
        raw = f.read()
    blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if blob != BLOB:
        raise ValueError('Original pinned Therī Apadāna XML blob differs')
    parsed = vri.parse(source_path)
    compact = [[b['rend'], b['n'], b['text'], b['notes'],
                {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}] for b in parsed]
    if compact != canon['books'][bi]['blocks']:
        raise ValueError('Pinned VRI full-book blocks, notes or pages differ')
    units = copy.deepcopy(canon['units'])
    before = {u['id']: copy.deepcopy(u) for u in units if u['id'] in TARGETS}
    books = [dict(b, blocks=parsed) if i == bi else b for i, b in enumerate(canon['books'])]
    changed = apadana_fourth_spans(books, units)
    # Reuse accepted paragraph evidence only. Numbering restarts elsewhere in
    # this book; no alignment may be invented from a bare stanza number.
    book_units = [u for u in units if u['book'] == bi]
    roots, expected = {}, {}
    for pi, passage in enumerate(commentary['passages']):
        if passage[3] != bi:
            continue
        lo, hi = passage[9:11]
        if not (isinstance(lo, int) and isinstance(hi, int) and 0 <= lo < hi <= len(compact)):
            raise ValueError('Invalid Apadāna commentary root segment')
        if (lo, hi) not in roots:
            roots[lo, hi] = RootBook(bi, canon['books'][bi], book_units, set(), lo, hi)
        for u in roots[lo, hi].texts_for(passage[4], passage[5]):
            expected.setdefault(u['id'], []).append(pi)
    for u in book_units:
        if commentary['units'].get(u['id'], []) != expected.get(u['id'], []):
            raise ValueError(f'Apadāna commentary ownership requires review: {u["id"]}')
    if any(expected.get(key) for key in TARGETS):
        raise ValueError('New Therī Apadāna commentary evidence requires independent review')
    by_id = {u['id']: u for u in units}
    annotation = Builder.__new__(Builder)
    annotation.books = [dict(canon['books'][bi], blocks=parsed)]
    annotation.units = [dict(by_id[key], book=0) for key in TARGETS]
    annotation.annotate_pages()
    for key, annotated in zip(TARGETS, annotation.units):
        u = by_id[key]
        u['pts'] = annotated['pts']
        ns = [b['n'] for b in parsed[u['start']:u['end']] if b['n']]
        u['vri'] = f'{ns[0]}–{ns[-1]}'
    report = {'source_commit': COMMIT, 'source_file': FILE, 'source_git_blob_sha1': blob,
              'source_xml_sha256': hashlib.sha256(raw).hexdigest(), 'source_xml_bytes': len(raw),
              'book_blocks_sha256': digest(compact),
              'input_canon_sha256': digest(canon), 'input_commentary_sha256': digest(commentary),
              'changed_spans': changed,
              'units': {key: {'before': before[key], 'after': by_id[key],
                              'root_blocks_sha256': digest(compact[by_id[key]['start']:by_id[key]['end']]),
                              'root_sha256': digest({'id': key, 'book': bi, 'start': by_id[key]['start'],
                                                     'end': by_id[key]['end'],
                                                     'blocks': compact[by_id[key]['start']:by_id[key]['end']]})}
                        for key in TARGETS},
              'commentary': {'changed': False, 'accepted_book_passages_checked': sum(p[3] == bi for p in commentary['passages']),
                             'root_segments_checked': [list(s) for s in sorted(roots)],
                             'target_associations': {key: commentary['units'].get(key, []) for key in TARGETS}},
              'preserved': ['all source books/blocks/notes/pages', 'all unrelated units',
                            'all commentary metadata/wording/associations', 'public IDs/titles',
                            'private data (not accessed)']}
    # Publish the in-memory change only after every validation succeeds.
    canon['units'] = units
    report['output_canon_sha256'] = digest(canon)
    report['output_commentary_sha256'] = digest(commentary)
    return report


if __name__ == '__main__':
    if len(sys.argv) != 5 or len(set(sys.argv[1:])) != 4:
        raise SystemExit(__doc__)
    ci, ai, root, co = sys.argv[1:]
    with gzip.open(ci, 'rt', encoding='utf-8') as f:
        canon = json.load(f)
    with gzip.open(ai, 'rt', encoding='utf-8') as f:
        commentary = json.load(f)
    report = repair(canon, commentary, root)
    write_gzip(co, canon)
    print(json.dumps(report, ensure_ascii=False, indent=2))
