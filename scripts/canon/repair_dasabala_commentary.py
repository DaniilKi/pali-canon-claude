"""Restore only the source-verified short SN12.21 commentary (no SN22 prose).

Usage: repair_dasabala_commentary.py CANON-IN COMMENTARY-IN VRI-DIR CANON-OUT COMMENTARY-OUT
Use freshly unpacked current datasets and verify the input/output receipt hashes.
A normal source build already derives this passage after the D208 root repair;
this bounded migration does not override build_commentary's alignment policy.
"""
import copy
import gzip
import hashlib
import json
import os
import re
import sys

from build_commentary import (RootBook, passages_of, decide, heading_names,
                              heading_elsewhere, stanza_off)
from repair_dasabala_spans import COMMIT, digest
from shared_spans import write_gzip
import vri

FILE = 's0302a.att.xml'
ROOT_FILE = 's0302m.mul.xml'
COMMENTARY_HASH = 'ecbe2f1817ae3c588bdc3400d397d9f903d16d639b6fd3d8fa797d9a3c6ec9d7'
ROOT_HASH = '9874d3c4d8ba58f777bce5a8e722b497d85ae682690b6743f8dbf7450e3a99d7'
TUPLE = [10, 152, 155, 12, 21, 21, 0, 0, 'paragraph', 0, 1427]


def repair(canon, commentary, root):
    if canon['source'].get('commit') != COMMIT or commentary['source'].get('commit') != COMMIT:
        raise ValueError('Both datasets must use the reviewed VRI source commit')
    input_canon, input_commentary = digest(canon), digest(commentary)
    if (len(canon['books']) <= 12 or canon['books'][12]['file'] != ROOT_FILE
            or digest(canon['books'][12]['blocks']) != ROOT_HASH):
        raise ValueError('Reviewed full root source book differs')
    units = canon['units']
    selected = {}
    for key, expected in [('sn12.21', (143, 146, 'Dasabalasuttaṃ', '21')),
                          ('sn12.22', (146, 150, 'Dutiyadasabalasuttaṃ', '22'))]:
        found = [u for u in units if u['id'] == key]
        if (len(found) != 1 or found[0]['book'] != 12 or found[0].get('collection') != 'sn'
                or found[0].get('kind') or found[0].get('approximate')
                or found[0].get('shares_passage_with')
                or found[0].get('index_revision') != 'sn-dasabala-v1'
                or tuple(found[0].get(f) for f in ('start', 'end', 'title', 'vri')) != expected):
            raise ValueError(f'Unexpected corrected root identity: {key}')
        selected[key] = found[0]
    if (len(commentary['books']) <= 10 or commentary['books'][10]['file'] != FILE
            or commentary['books'][10].get('root_files') != [ROOT_FILE]):
        raise ValueError('Unexpected commentary book identity')
    path = os.path.join(root, 'romn', FILE)
    parsed = vri.parse(path)
    for b in parsed:
        # Same numbered-dot cleanup as build_commentary; no other normalization.
        if b['n'] is not None:
            b['text'] = re.sub(r'^\.\s+', '', b['text'])
    compact = [[b['rend'], b['n'], b['text'], ['%d.%d' % p for p in b['pages'].get('P', [])]] for b in parsed]
    if len(compact) != 978 or digest(compact) != COMMENTARY_HASH or compact != commentary['books'][10]['blocks']:
        raise ValueError('Pinned full commentary book differs')
    exact = [('title', None, '3. Dasabalavaggo'),
             ('subhead', None, '1. Dasabalasuttavaṇṇanā'),
             ('bodytext', '21', 'Dasabalavaggassa paṭhamaṃ dutiyasseva saṅkhepo.'),
             ('subhead', None, '2. Dutiyadasabalasuttavaṇṇanā')]
    for i, (rend, n, text) in enumerate(exact, 152):
        matches = [j for j, b in enumerate(parsed) if (b['rend'], b['n'], b['text']) == (rend, n, text)]
        if matches != [i]:
            raise ValueError('Short commentary heading/body identity differs')
    candidates = [p for p in passages_of(parsed) if p['num'] == 154]
    if len(candidates) != 1:
        raise ValueError('No unique natural commentary passage')
    p = candidates[0]
    if ((p['start'], p['end'], p['para']) != (152, 155, (21, 21))
            or p['front'] or p['anomaly']):
        raise ValueError('Natural short commentary scope differs')
    rootbook = RootBook(12, canon['books'][12], [u for u in units if u['book'] == 12], set())
    roots = [r for r in rootbook.segments() if r.has(21, 21)]
    if len(roots) != 1:
        raise ValueError('Ambiguous root paragraph21')
    r = roots[0]
    lemmas = [x for b in parsed[152:155] for x in b['bold']]
    evidence, checked, hits = decide(lemmas, r, 21, 21)
    natural = [10, p['start'], p['end'], 12, 21, 21, checked, hits, evidence, r.lo, r.hi]
    if (natural != TUPLE or lemmas or not heading_names(parsed, p, r, 21)
            or heading_elsewhere(parsed, p, r, 21, 21) or stanza_off(parsed, p, r, 21, 21)
            or [u['id'] for u in r.texts_for(21, 21)] != ['sn12.21']):
        raise ValueError('Natural builder alignment evidence differs')
    passages = commentary['passages']
    matches = [i for i, row in enumerate(passages) if row == natural]
    overlapping = [i for i, row in enumerate(passages)
                   if row[0] == 10 and row[1] < 155 and row[2] > 152]
    if overlapping != matches:
        raise ValueError('Existing passage overlaps the reviewed short commentary')
    mapping = commentary['units']
    unaligned = commentary['cited_unaligned']
    if len(set(unaligned)) != len(unaligned):
        raise ValueError('Duplicate cited-unaligned entries')
    legacy = not matches and 'sn12.21' not in mapping and unaligned.count('sn12.21') == 1
    repaired = (len(matches) == 1 and mapping.get('sn12.21') == matches
                and 'sn12.21' not in unaligned)
    if not (legacy or repaired):
        raise ValueError('Unexpected prior short commentary binding')
    if repaired and any(matches[0] in v for k, v in mapping.items() if k != 'sn12.21'):
        raise ValueError('Short commentary assigned to another root unit')
    # Preserve existing Paccaya and second Dasabala associations. Neither may
    # be replaced by the short paragraph or borrowed for the first Dasabala.
    if mapping.get('sn12.20') != [3333] or mapping.get('sn12.22') != [3334]:
        raise ValueError('Neighbour commentary associations differ')
    if (len(passages) <= 3334 or passages[3333][3:6] != [12, 20, 20]
            or passages[3334] != [10, 155, 188, 12, 22, 22, 39, 34, 'paragraph+lemma', 0, 1427]):
        raise ValueError('Neighbour commentary passage evidence differs')
    sn = {u['id'] for u in units if u['collection'] == 'sn'}
    cited = (set(mapping) | set(unaligned)) & sn
    expected = {'texts': len(sn), 'with_commentary': len(sn & set(mapping)),
                'cited': len(cited), 'cited_aligned': len(cited & set(mapping))}
    exact_coverage = {'texts': 1954, 'with_commentary': 1800 if repaired else 1799,
                      'cited': 1800, 'cited_aligned': 1800 if repaired else 1799}
    if expected != exact_coverage or commentary['coverage']['sn'] != expected:
        raise ValueError('Unexpected SN commentary coverage baseline')
    out = dict(commentary)
    if legacy:
        out['passages'] = passages + [natural]
        out['units'] = dict(mapping, **{'sn12.21': [len(passages)]})
        out['cited_unaligned'] = [k for k in unaligned if k != 'sn12.21']
        out['coverage'] = copy.deepcopy(commentary['coverage'])
        out['coverage']['sn'] = dict(exact_coverage, with_commentary=1800, cited_aligned=1800)
    report = {'source_commit': COMMIT, 'source_xml_sha256': hashlib.sha256(open(path, 'rb').read()).hexdigest(),
              'commentary_book_sha256': digest(compact), 'short_commentary_sha256': digest(compact[152:155]),
              'root_book_sha256': ROOT_HASH, 'passage': natural, 'changed': legacy,
              'passage_index': out['units']['sn12.21'][0],
              'input_canon_sha256': input_canon, 'input_commentary_sha256': input_commentary,
              'output_canon_sha256': digest(canon), 'output_commentary_sha256': digest(out),
              'sn_coverage': out['coverage']['sn']}
    # All validation and receipt serialization precedes mutation.
    commentary.update(out)
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
