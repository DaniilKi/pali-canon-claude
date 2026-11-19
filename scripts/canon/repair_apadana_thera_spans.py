"""Pinned Therā ownership repair, with one source-verified false association removal.

Usage: repair_apadana_thera_spans.py CANON-IN COMMENTARY-IN VRI-DIR CANON-OUT COMMENTARY-OUT
Freshly unpack current branch inputs; provide complete original pinned root and
commentary XML. Both metadata outputs belong to one atomic reviewed migration.
"""
import copy
import gzip
import hashlib
import json
import os
import sys

from apadana_thera_spans import apadana_thera_spans, FILE, TARGETS
from build_canon import Builder
from build_commentary import RootBook
from shared_spans import write_gzip
import vri

COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
BLOB = 'f37368072aece065d2668f93a74c24b423939f1f'
ATT = 's0510a.att.xml'
ATT_BLOB = 'd5a3b791ac751f0a8e9c1e96c6877ea20a983917'
PASSAGE = 8918
PASSAGE_TUPLE = [28, 2237, 2294, 36, 97, 98, 10, 8, 'paragraph+lemma', 2050, 2509]


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def source(root, filename, expected_blob):
    path = os.path.join(root, 'romn', filename)
    with open(path, 'rb') as f:
        raw = f.read()
    blob = hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
    if blob != expected_blob:
        raise ValueError(f'Original pinned Apadāna XML blob differs: {filename}')
    return vri.parse(path), {'file': filename, 'git_blob_sha1': blob, 'xml_sha256': hashlib.sha256(raw).hexdigest(), 'xml_bytes': len(raw)}


def associations(canon, commentary, bi, units):
    roots, expected = {}, {}
    for pi, passage in enumerate(commentary['passages']):
        if passage[3] != bi:
            continue
        lo, hi = passage[9:11]
        if not (isinstance(lo, int) and isinstance(hi, int) and 0 <= lo < hi <= len(canon['books'][bi]['blocks'])):
            raise ValueError('Invalid Apadāna commentary root segment')
        if (lo, hi) not in roots:
            roots[lo, hi] = RootBook(bi, canon['books'][bi], units, set(), lo, hi)
        for u in roots[lo, hi].texts_for(passage[4], passage[5]):
            expected.setdefault(u['id'], []).append(pi)
    return expected, roots


def repair(canon, commentary, root):
    if canon['source'].get('commit') != COMMIT or commentary['source'].get('commit') != COMMIT:
        raise ValueError('Canon/commentary must both use the reviewed VRI commit')
    found = [i for i, b in enumerate(canon['books']) if b['file'] == FILE]
    att_found = [i for i, b in enumerate(commentary['books']) if b['file'] == ATT]
    if found != [36] or att_found != [28]:
        raise ValueError('Unexpected original Apadāna book identities')
    bi, ai = found[0], att_found[0]
    parsed, root_source = source(root, FILE, BLOB)
    att, att_source = source(root, ATT, ATT_BLOB)
    compact = [[b['rend'], b['n'], b['text'], b['notes'], {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}] for b in parsed]
    att_compact = [[b['rend'], b['n'], b['text'], [f'{v}.{p}' for v, p in b['pages'].get('P', [])]] for b in att]
    if compact != canon['books'][bi]['blocks'] or att_compact != commentary['books'][ai]['blocks']:
        raise ValueError('Pinned full Apadāna root/commentary blocks, notes or pages differ')
    if (commentary['passages'][PASSAGE] != PASSAGE_TUPLE
            or (att[2236]['rend'], att[2236]['text']) != ('centre', 'Upasenavaṅgantaputtattheraapadānavaṇṇanā samattā.')
            or (att[2237]['rend'], att[2237]['text']) != ('subhead', '8. Raṭṭhapālattheraapadānavaṇṇanā')
            or not att[2238]['text'].startswith('Padumuttarassa bhagavatotiādikaṃ āyasmato raṭṭhapālattherassa apadānaṃ.')
            or att[2293]['n'] != '97-8'):
        raise ValueError('Rattapala commentary identity or accepted paragraph evidence differs')
    original_units = [u for u in canon['units'] if u['book'] == bi]
    old_expected, roots = associations(canon, commentary, bi, original_units)
    for u in original_units:
        if commentary['units'].get(u['id'], []) != old_expected.get(u['id'], []):
            raise ValueError(f'Existing Apadāna commentary ownership requires review: {u["id"]}')
    units = copy.deepcopy(canon['units'])
    before = {u['id']: copy.deepcopy(u) for u in units if u['id'] in TARGETS}
    books = [dict(b, blocks=parsed) if i == bi else b for i, b in enumerate(canon['books'])]
    changed = apadana_thera_spans(books, units)
    new_expected, _ = associations(canon, commentary, bi, [u for u in units if u['book'] == bi])
    deltas = {u['id']: {'before': old_expected.get(u['id'], []), 'after': new_expected.get(u['id'], [])}
              for u in original_units if old_expected.get(u['id'], []) != new_expected.get(u['id'], [])}
    permitted = {'tha-ap19': {'before': [8915, 8916, 8917, 8918], 'after': [8915, 8916, 8917]}} if changed else {}
    if deltas != permitted or new_expected.get('tha-ap20') != [8918, 8919, 8920, 8921] or any(new_expected.get(k) for k in TARGETS[2:]):
        raise ValueError('Unexpected Apadāna commentary association change')
    unit_map = copy.deepcopy(commentary['units'])
    if changed:
        unit_map['tha-ap19'] = new_expected['tha-ap19']
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
              'changed_spans': changed, 'commentary_changes': deltas,
              'units': {key: {'before': before[key], 'after': by_id[key],
                              'root_blocks_sha256': digest(compact[by_id[key]['start']:by_id[key]['end']]),
                              'root_sha256': digest({'id': key, 'book': bi, 'start': by_id[key]['start'], 'end': by_id[key]['end'], 'blocks': compact[by_id[key]['start']:by_id[key]['end']]})} for key in TARGETS},
              'commentary': {'accepted_book_passages_checked': sum(p[3] == bi for p in commentary['passages']),
                             'root_segments_checked': [list(s) for s in sorted(roots)],
                             'removed_false_association': {'unit': 'tha-ap19', 'passage': PASSAGE} if changed else None,
                             'preserved_correct_owner': {'unit': 'tha-ap20', 'passages': new_expected['tha-ap20']},
                             'passage': PASSAGE_TUPLE, 'passage_blocks_sha256': digest(att_compact[2237:2294])},
              'preserved': ['all canon/commentary source books, blocks and wording', 'all passage identities and evidence', 'all unrelated canonical units and associations', 'all earlier Therī source locators', 'all coverage counters', 'private data (not accessed)']}
    # No input mutation until every source, identity and ownership check passes.
    canon['units'] = units
    commentary['units'] = unit_map
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
