"""Pinned SN 12.21/22 index repair, without new commentary alignments.

Usage: repair_dasabala_spans.py CANON-IN COMMENTARY-IN VRI-DIR CANON-OUT COMMENTARY-OUT
The complete source book must match the bundled compact blocks. The existing
short commentary on 21 is cited but unaligned; remove only its false Paccaya20
association. Retain all commentary books/passages and every other association.
"""
import copy
import gzip
import hashlib
import json
import os
import sys

from build_canon import Builder
from dasabala_spans import dasabala_spans, FILE
from shared_spans import write_gzip
import vri


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'


def repair(canon, commentary, root):
    if canon['source'].get('commit') != COMMIT or commentary['source'].get('commit') != COMMIT:
        raise ValueError('Canon/commentary must both use the reviewed VRI commit')
    input_canon_sha256 = digest(canon)
    input_commentary_sha256 = digest(commentary)
    found = [i for i, b in enumerate(canon['books']) if b['file'] == FILE]
    if len(found) != 1:
        raise ValueError('Expected one Dasabala source book')
    bi = found[0]
    source_path = os.path.join(root, 'romn', FILE)
    parsed = vri.parse(source_path)
    compact = [[b['rend'], b['n'], b['text'], b['notes'],
                {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}] for b in parsed]
    if compact != canon['books'][bi]['blocks']:
        raise ValueError('Pinned VRI full-book blocks differ')
    units = copy.deepcopy(canon['units'])
    before = {u['id']: copy.deepcopy(u) for u in units if u['id'] in ('sn12.21', 'sn12.22')}
    changed = dasabala_spans([dict(b, blocks=parsed) if i == bi else b for i, b in enumerate(canon['books'])], units)
    by_id = {u['id']: u for u in units}
    mapping = copy.deepcopy(commentary['units'])
    if mapping.get('sn12.20') != [3333] or mapping.get('sn12.21', []) not in ([], [3333]):
        raise ValueError('Unexpected Paccaya/Dasabala commentary association')
    if len(commentary['passages']) <= 3333:
        raise ValueError('Missing Paccaya commentary passage')
    passage = commentary['passages'][3333]
    if (passage[3:6] != [bi, 20, 20] or passage[9:11] != [0, len(compact)]):
        raise ValueError('Passage 3333 is not exclusively root paragraph20')
    comment_books = [b for b in commentary['books'] if FILE in b.get('root_files', [])]
    # Actual paragraph21 exists in the source commentary. Do not label it absent
    # merely because the existing aligner has no accepted passage for it.
    if len(comment_books) != 1 or not any(b[1] == '21' and b[2] == 'Dasabalavaggassa paṭhamaṃ dutiyasseva saṅkhepo.' for b in comment_books[0]['blocks']):
        raise ValueError('Missing reviewed short Dasabala commentary evidence')
    sn_units = [u for u in units if u['collection'] == 'sn']
    sn_ids = {u['id'] for u in sn_units}
    unaligned = list(commentary['cited_unaligned'])
    cited = (set(mapping) | set(unaligned)) & sn_ids
    cited.add('sn12.21')
    old_expected = {'texts': len(sn_units), 'with_commentary': sum(u['id'] in mapping for u in sn_units),
                    'cited': len(cited), 'cited_aligned': len(cited & set(mapping))}
    if commentary['coverage']['sn'] != old_expected:
        raise ValueError('Unexpected SN commentary coverage baseline')
    old_links = mapping.pop('sn12.21', None)
    if 'sn12.21' not in unaligned:
        unaligned.append('sn12.21')
    coverage = copy.deepcopy(commentary['coverage'])
    coverage['sn'] = {'texts': len(sn_units), 'with_commentary': sum(u['id'] in mapping for u in sn_units),
                      'cited': len(cited), 'cited_aligned': len(cited & set(mapping))}
    # Reannotate only the two reviewed records, using the existing PTS policy.
    annotation = Builder.__new__(Builder)
    annotation.books = [dict(canon['books'][bi], blocks=parsed)]
    annotation.units = [dict(by_id[k], book=0) for k in ('sn12.21', 'sn12.22')]
    annotation.annotate_pages()
    for key, annotated in zip(('sn12.21', 'sn12.22'), annotation.units):
        u = by_id[key]
        u['pts'] = annotated['pts']
        u['vri'] = next(b['n'] for b in parsed[u['start']:u['end']] if b['n'])
    report = {'source_commit': canon['source']['commit'],
              'input_canon_sha256': input_canon_sha256,
              'input_commentary_sha256': input_commentary_sha256,
              'source_xml_sha256': hashlib.sha256(open(source_path, 'rb').read()).hexdigest(),
              'book_blocks_sha256': digest(compact), 'changed_spans': changed,
              'units': {k: {'before': before[k], 'after': by_id[k],
                             'root_sha256': digest(compact[by_id[k]['start']:by_id[k]['end']])}
                        for k in ('sn12.21', 'sn12.22')},
              'commentary_link_removed': old_links, 'sn_coverage': coverage['sn']}
    # Atomic with respect to validation failures: commit only after every check.
    canon['units'] = units
    commentary.update(units=mapping, coverage=coverage, cited_unaligned=unaligned)
    report['output_canon_sha256'] = digest(canon)
    report['output_commentary_sha256'] = digest(commentary)
    return report


if __name__ == '__main__':
    if len(sys.argv) != 6 or len(set(sys.argv[1:])) != 5:
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
