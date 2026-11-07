"""Repair an existing canon/commentary pair using its pinned VRI source files.

Usage: repair_story_spans.py CANON-IN COMMENTARY-IN VRI-DIR CANON-OUT COMMENTARY-OUT
Run after unpacking the bundled data. The two source XML files must come from
canon.source.commit. Their complete compact content is checked before editing.
"""
import copy
import gzip
import json
import os
import sys

from build_canon import Builder
from build_commentary import RootBook
from shared_spans import write_gzip
from story_spans import story_spans
import vri


def repair(canon, commentary, root):
    if canon['source']['commit'] != commentary['source']['commit']:
        raise ValueError('Canon/commentary source commits differ')
    books = copy.deepcopy(canon['books'])
    targets = []
    for bi, book in enumerate(books):
        if book['file'] not in ('s0506m.mul.xml', 's0507m.mul.xml'):
            continue
        parsed = vri.parse(os.path.join(root, 'romn', book['file']))
        compact = [[b['rend'], b['n'], b['text'], b['notes'],
                    {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}]
                   for b in parsed]
        if compact != book['blocks']:
            raise ValueError(f'Pinned VRI blocks differ: {book["file"]}')
        book['blocks'] = parsed
        targets.append(bi)
    if len(targets) != 2:
        raise ValueError('Expected both story books')
    changed = story_spans(books, canon['units'])
    for bi in targets:
        units = [u for u in canon['units'] if u['book'] == bi]
        b = Builder.__new__(Builder)
        b.books = [books[bi]]
        b.units = [dict(u, book=0) for u in units]
        b.annotate_pages()
        for u, annotated in zip(units, b.units):
            u['pts'] = annotated['pts']
            ns = [p['n'] for p in books[bi]['blocks'][u['start']:u['end']] if p['n']]
            u['vri'] = ns[0] if len(ns) == 1 else f'{ns[0]}–{ns[-1]}'
    # Reuse already accepted commentary-to-root-paragraph evidence. Only refresh
    # which story contains each of those root paragraphs; no new alignments.
    remapped = {}
    for bi in targets:
        units = [u for u in canon['units'] if u['book'] == bi]
        rootbook = RootBook(bi, canon['books'][bi], units, set())
        expected = {}
        for pi, passage in enumerate(commentary['passages']):
            if passage[3] != bi:
                continue
            if passage[9:11] != [0, len(rootbook.blocks)]:
                raise ValueError('Unexpected segmented story commentary')
            for u in rootbook.texts_for(passage[4], passage[5]):
                expected.setdefault(u['id'], []).append(pi)
        for u in units:
            key = u['id']
            old, new = commentary['units'].get(key, []), expected.get(key, [])
            if bool(old) != bool(new):
                raise ValueError(f'Commentary coverage would change: {key}')
            if old != new:
                remapped[key] = {'before': old, 'after': new}
                commentary['units'][key] = new
    return {'source_commit': canon['source']['commit'], 'changed_spans': changed,
            'commentary_links': remapped}


if __name__ == '__main__':
    if len(sys.argv) != 6 or len(set(sys.argv[1:])) != 5:
        raise SystemExit(__doc__)
    ci, ai, root, co, ao = sys.argv[1:]
    with gzip.open(ci, 'rt') as f:
        canon = json.load(f)
    with gzip.open(ai, 'rt') as f:
        commentary = json.load(f)
    report = repair(canon, commentary, root)
    write_gzip(co, canon)
    write_gzip(ao, commentary)
    print(json.dumps(report, indent=2))
