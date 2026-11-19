"""Pinned Thag 16.3–16.5 source-boundary repair; preserve all accepted commentary.

Usage: repair_thag_sixteen_spans.py CANON-IN COMMENTARY-IN VRI-DIR CANON-OUT
Freshly unpack current inputs. Supply complete original root/commentary XML.
No passage, source wording, translation binding or private locator is rewritten.
"""
import copy
import gzip
import hashlib
import json
import os
import sys

from thag_sixteen_spans import thag_sixteen_spans, FILE, TARGETS
from build_canon import Builder
from build_commentary import RootBook
from shared_spans import write_gzip
import vri

COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
BLOB = '78b42eb2d2cd521f00cddd856e4c731cfe57ba33'
ATT = 's0508a2.att.xml'
ATT_BLOB = 'c7e6ceea879676f4e2ce5c8d28ec38d18b49edb1'
PASSAGES = {
    8210: [26, 3318, 3323, 34, 747, 747, 2, 1, 'paragraph+lemma', 0, 4393],
    8211: [26, 3323, 3405, 34, 748, 768, 98, 91, 'paragraph+lemma', 0, 4393],
    8212: [26, 3443, 3468, 34, 770, 775, 23, 17, 'paragraph+lemma', 0, 4393],
    8213: [26, 3468, 3538, 34, 776, 793, 59, 58, 'paragraph+lemma', 0, 4393],
    8214: [26, 3543, 3631, 34, 795, 817, 22, 20, 'paragraph+lemma', 0, 4393],
}
BINDINGS = {'thag16.3': [8210, 8211], 'thag16.4': [8212, 8213], 'thag16.5': [8214]}


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def source(root, filename, expected_blob):
    path = os.path.join(root, 'romn', filename)
    with open(path, 'rb') as f:
        raw = f.read()
    blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if blob != expected_blob:
        raise ValueError(f'Original pinned Theragāthā XML blob differs: {filename}')
    return vri.parse(path), {'file': filename, 'git_blob_sha1': blob, 'xml_sha256': hashlib.sha256(raw).hexdigest(), 'xml_bytes': len(raw)}


def repair(canon, commentary, root):
    if canon['source'].get('commit') != COMMIT or commentary['source'].get('commit') != COMMIT:
        raise ValueError('Canon/commentary must both use the reviewed VRI commit')
    found = [i for i, b in enumerate(canon['books']) if b['file'] == FILE]
    att_found = [i for i, b in enumerate(commentary['books']) if b['file'] == ATT]
    if found != [34] or att_found != [26]:
        raise ValueError('Unexpected original Theragāthā book identities')
    bi, ai = found[0], att_found[0]
    parsed, root_source = source(root, FILE, BLOB)
    att, att_source = source(root, ATT, ATT_BLOB)
    compact = [[b['rend'], b['n'], b['text'], b['notes'], {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}] for b in parsed]
    att_compact = [[b['rend'], b['n'], b['text'], [f'{v}.{p}' for v, p in b['pages'].get('P', [])]] for b in att]
    if compact != canon['books'][bi]['blocks'] or att_compact != commentary['books'][ai]['blocks']:
        raise ValueError('Pinned full Theragāthā root/commentary blocks, notes or pages differ')
    if any(commentary['passages'][pi] != expected for pi, expected in PASSAGES.items()):
        raise ValueError('Accepted Theragāthā commentary passage identity differs')
    for at, text in {3318: '3. Telakānittheragāthāvaṇṇanā', 3405: '4. Raṭṭhapālattheragāthāvaṇṇanā',
                     3538: '5. Mālukyaputtattheragāthāvaṇṇanā', 3631: '6. Selattheragāthāvaṇṇanā'}.items():
        if (att[at]['rend'], att[at]['text']) != ('subhead', text):
            raise ValueError('Unexpected Theragāthā commentary owner heading')
    if any(commentary['units'].get(key, []) != expected for key, expected in BINDINGS.items()):
        raise ValueError('Accepted Theragāthā commentary owner list differs')
    units = copy.deepcopy(canon['units'])
    before = {u['id']: copy.deepcopy(u) for u in units if u['id'] in TARGETS}
    if set(before) != set(TARGETS):
        raise ValueError('Missing reviewed Theragāthā unit')
    original_annotation = Builder.__new__(Builder)
    original_annotation.books = [dict(canon['books'][bi], blocks=parsed)]
    original_annotation.units = [dict(before[key], book=0) for key in TARGETS]
    original_annotation.annotate_pages()
    for key, annotated in zip(TARGETS, original_annotation.units):
        unit = before[key]
        numbers = [b['n'] for b in parsed[unit['start']:unit['end']] if b['n']]
        if (not numbers or unit.get('vri') != f'{numbers[0]}–{numbers[-1]}'
                or unit.get('pts') != annotated['pts']):
            raise ValueError('Existing Theragāthā VRI/PTS scope metadata requires review')
    books = [dict(b, blocks=parsed) if i == bi else b for i, b in enumerate(canon['books'])]
    changed = thag_sixteen_spans(books, units)
    roots, expected = {}, {}
    for pi, passage in enumerate(commentary['passages']):
        if passage[3] != bi:
            continue
        lo, hi = passage[9:11]
        if not (isinstance(lo, int) and isinstance(hi, int) and 0 <= lo < hi <= len(compact)):
            raise ValueError('Invalid Theragāthā commentary root segment')
        if (lo, hi) not in roots:
            roots[lo, hi] = RootBook(bi, canon['books'][bi], [u for u in units if u['book'] == bi], set(), lo, hi)
        for u in roots[lo, hi].texts_for(passage[4], passage[5]):
            expected.setdefault(u['id'], []).append(pi)
    for u in units:
        if u['book'] == bi and commentary['units'].get(u['id'], []) != expected.get(u['id'], []):
            raise ValueError(f'Theragāthā commentary ownership requires independent review: {u["id"]}')
    by_id = {u['id']: u for u in units}
    annotation = Builder.__new__(Builder)
    annotation.books = [dict(canon['books'][bi], blocks=parsed)]
    annotation.units = [dict(by_id[key], book=0) for key in TARGETS]
    annotation.annotate_pages()
    for key, annotated in zip(TARGETS, annotation.units):
        u = by_id[key]; u['pts'] = annotated['pts']
        numbers = [b['n'] for b in parsed[u['start']:u['end']] if b['n']]
        u['vri'] = f'{numbers[0]}–{numbers[-1]}'
    report = {'source_commit': COMMIT, 'root_source': root_source, 'commentary_source': att_source,
              'root_book_blocks_sha256': digest(compact), 'commentary_book_blocks_sha256': digest(att_compact),
              'input_canon_sha256': digest(canon), 'input_commentary_sha256': digest(commentary),
              'changed_spans': changed,
              'units': {key: {'before': before[key], 'after': by_id[key],
                              'root_blocks_sha256': digest(compact[by_id[key]['start']:by_id[key]['end']]),
                              'root_sha256': digest({'id': key, 'book': bi, 'start': by_id[key]['start'], 'end': by_id[key]['end'], 'blocks': compact[by_id[key]['start']:by_id[key]['end']]})} for key in TARGETS},
              'commentary': {'changed': False, 'accepted_book_passages_checked': sum(p[3] == bi for p in commentary['passages']),
                             'root_segments_checked': [list(s) for s in sorted(roots)], 'target_associations': BINDINGS,
                             'unindexed_opening_quotes_not_activated': [{'vri': 769, 'original_att_blocks': [3405, 3443]}, {'vri': 794, 'original_att_blocks': [3538, 3543]}]},
              'preserved': ['all 61 root source books/blocks/notes/pages', 'all unrelated canonical units',
                            'all commentary books/passages/associations/coverage', 'all existing English source choices',
                            'private saved data (not accessed or rebased)']}
    # Commit only after complete source, ownership and page validation succeeds.
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
