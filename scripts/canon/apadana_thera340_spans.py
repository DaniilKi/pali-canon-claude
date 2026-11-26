"""Finite atomic metadata repair for three independently reviewed Therā pairs.

Only these six ownership records/titles/locator revisions may change. The source
book, old namespaces, English approvals and personal data remain unchanged.
"""
import copy
import hashlib
import json

REVISION = 'apadana-thera340-341-343-344-346-347-v1'
COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
FILE = 's0510m1.mul.xml'
PRE_SIX_SHA256 = '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8'
POST_SIX_SHA256 = '0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
ROOT_BLOCKS_SHA256 = 'bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44'
OLD_UNITS = {'tha-ap340': {'id': 'tha-ap340',
               'book': 36,
               'start': 10053,
               'end': 10122,
               'title': 'Uttareyyadāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 340',
               'vri': '90–111',
               'pts': {'volume': 1, 'page': 271, 'end_page': 273}},
 'tha-ap341': {'id': 'tha-ap341',
               'book': 36,
               'start': 10122,
               'end': 10174,
               'title': 'Dhammasavaniyattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 341',
               'vri': '112–128',
               'pts': {'volume': 1, 'page': 273, 'end_page': 274}},
 'tha-ap343': {'id': 'tha-ap343',
               'book': 36,
               'start': 10224,
               'end': 10262,
               'title': 'Ekapadumiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 343',
               'vri': '1–11',
               'pts': {'volume': 1, 'page': 276, 'end_page': 277}},
 'tha-ap344': {'id': 'tha-ap344',
               'book': 36,
               'start': 10262,
               'end': 10287,
               'title': 'Tīṇuppalamāliyattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 344',
               'vri': '12–19',
               'pts': {'volume': 1, 'page': 277, 'end_page': 278}},
 'tha-ap346': {'id': 'tha-ap346',
               'book': 36,
               'start': 10310,
               'end': 10328,
               'title': 'Tikiṅkaṇipūjakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 346',
               'vri': '27–31',
               'pts': {'volume': 1, 'page': 278, 'end_page': 278}},
 'tha-ap347': {'id': 'tha-ap347',
               'book': 36,
               'start': 10328,
               'end': 10350,
               'title': 'Naḷāgārikattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 347',
               'vri': '32–38',
               'pts': {'volume': 1, 'page': 278, 'end_page': 279}}}
NEW_UNITS = {'tha-ap340': {'id': 'tha-ap340',
               'book': 36,
               'start': 10053,
               'end': 10118,
               'title': 'Uttareyyadāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 340',
               'vri': '90–110',
               'pts': {'volume': 1, 'page': 271, 'end_page': 273},
               'index_revision': 'apadana-thera340-341-343-344-346-347-v1'},
 'tha-ap341': {'id': 'tha-ap341',
               'book': 36,
               'start': 10118,
               'end': 10174,
               'title': 'Dhammasavaniyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 341',
               'vri': '111–128',
               'pts': {'volume': 1, 'page': 273, 'end_page': 274},
               'index_revision': 'apadana-thera340-341-343-344-346-347-v1'},
 'tha-ap343': {'id': 'tha-ap343',
               'book': 36,
               'start': 10224,
               'end': 10258,
               'title': 'Ekapadumiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 343',
               'vri': '1–10',
               'pts': {'volume': 1, 'page': 276, 'end_page': 277},
               'index_revision': 'apadana-thera340-341-343-344-346-347-v1'},
 'tha-ap344': {'id': 'tha-ap344',
               'book': 36,
               'start': 10258,
               'end': 10287,
               'title': 'Tīṇuppalamāliyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 344',
               'vri': '11–19',
               'pts': {'volume': 1, 'page': 277, 'end_page': 278},
               'index_revision': 'apadana-thera340-341-343-344-346-347-v1'},
 'tha-ap346': {'id': 'tha-ap346',
               'book': 36,
               'start': 10310,
               'end': 10324,
               'title': 'Tikiṅkaṇipūjakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 346',
               'vri': '27–30',
               'pts': {'volume': 1, 'page': 278, 'end_page': 278},
               'index_revision': 'apadana-thera340-341-343-344-346-347-v1'},
 'tha-ap347': {'id': 'tha-ap347',
               'book': 36,
               'start': 10324,
               'end': 10350,
               'title': 'Naḷāgārikattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 347',
               'vri': '31–38',
               'pts': {'volume': 1, 'page': 278, 'end_page': 279},
               'index_revision': 'apadana-thera340-341-343-344-346-347-v1'}}
NEIGHBOUR_SPANS = {'tha-ap339': (10003, 10053),
 'tha-ap342': (10174, 10224),
 'tha-ap345': (10287, 10310),
 'tha-ap348': (10350, 10371)}
TARGETS = tuple(OLD_UNITS)


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def six_state(units, before_annotation=False):
    selected = {}
    for key in TARGETS:
        rows = [u for u in units if u.get('id') == key]
        if len(rows) != 1:
            raise ValueError('Missing or duplicate reviewed six-poem unit')
        selected[key] = rows[0]
    for state, expected in (('old', OLD_UNITS), ('new', NEW_UNITS)):
        match = copy.deepcopy(expected)
        if before_annotation and all('pts' not in u for u in selected.values()):
            for u in match.values():
                del u['pts']
        # JSON preserves numeric types: True/1 and 1.0/1 are not interchangeable.
        if json.dumps(selected, ensure_ascii=False, sort_keys=True) == json.dumps(match, ensure_ascii=False, sort_keys=True):
            return state
    raise ValueError('Unreviewed, mixed or partial six-poem metadata state')


def canon_before_thera340(canon):
    """Explicit historical-data inverse; never rebase a tool result or saved locator."""
    if canon.get('source', {}).get('commit') != COMMIT:
        raise ValueError('Six-poem inverse requires the reviewed VRI source')
    six_state(canon['units'])
    return dict(canon, units=[copy.deepcopy(OLD_UNITS[u['id']]) if u.get('id') in TARGETS else u
                             for u in canon['units']])


def apadana_thera340_spans(books, units):
    indexes = [i for i, b in enumerate(books) if b['file'] == FILE]
    if not indexes:
        return []  # A builder may explicitly omit this entire source book.
    if indexes != [36]:
        raise ValueError('Unexpected reviewed six-poem source book identity')
    blocks = books[36]['blocks']
    compact = [[b['rend'], b['n'], b['text'], b['notes'],
                {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}]
               for b in blocks]
    if digest(compact) != ROOT_BLOCKS_SHA256:
        raise ValueError('Complete reviewed source words, notes or pages differ')
    state = six_state(units, before_annotation=True)
    for u in units:
        if u.get('shares_passage_with') in TARGETS or set(u.get('members', [])) & set(TARGETS):
            raise ValueError('Six-poem group dependency needs independent review')
    for key, span in NEIGHBOUR_SPANS.items():
        rows = [u for u in units if u.get('id') == key]
        if (len(rows) != 1 or rows[0]['book'] != 36
                or (rows[0]['start'], rows[0]['end']) != span
                or any(rows[0].get(k) for k in ('kind', 'approximate', 'shares_passage_with'))):
            raise ValueError('Unexpected reviewed six-poem neighbour')
    if state == 'new':
        return []
    # Every check precedes mutation, including all three disconnected pairs.
    for u in units:
        if u['id'] in TARGETS:
            t = NEW_UNITS[u['id']]
            u.update(start=t['start'], end=t['end'], title=t['title'], vri=t['vri'], index_revision=REVISION)
    return list(TARGETS)
