"""Finite atomic metadata repair for four independently reviewed VRI poems.

Only canonical ownership, titles and citation namespaces change. No source words,
English approvals or personal-data migrations are supplied by this module.
"""
import copy
import hashlib
import json

REVISION = 'apadana-thera333-336-v1'
COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
FILE = 's0510m1.mul.xml'
PRE_FOUR_SHA256 = '1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
ROOT_BLOCKS_SHA256 = 'bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44'
OLD_UNITS = {'tha-ap333': {'id': 'tha-ap333',
               'book': 36,
               'start': 9767,
               'end': 9793,
               'title': 'Gandhadhūpiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 333',
               'vri': '1–7',
               'pts': {'volume': 1, 'page': 267, 'end_page': 267}},
 'tha-ap334': {'id': 'tha-ap334',
               'book': 36,
               'start': 9793,
               'end': 9816,
               'title': 'Udakapūjakattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 334',
               'vri': '8–14',
               'pts': {'volume': 1, 'page': 267, 'end_page': 267}},
 'tha-ap335': {'id': 'tha-ap335',
               'book': 36,
               'start': 9816,
               'end': 9833,
               'title': 'Punnāgapupphiyattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 335',
               'vri': '15–19',
               'pts': {'volume': 1, 'page': 267, 'end_page': 267}},
 'tha-ap336': {'id': 'tha-ap336',
               'book': 36,
               'start': 9833,
               'end': 9890,
               'title': 'Ekadussadāyakattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 336',
               'vri': '20–37',
               'pts': {'volume': 1, 'page': 267, 'end_page': 267}}}
NEW_UNITS = {'tha-ap333': {'id': 'tha-ap333',
               'book': 36,
               'start': 9767,
               'end': 9789,
               'title': 'Gandhadhūpiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 333',
               'vri': '1–6',
               'pts': {'volume': 1, 'page': 267, 'end_page': 267},
               'index_revision': 'apadana-thera333-336-v1'},
 'tha-ap334': {'id': 'tha-ap334',
               'book': 36,
               'start': 9789,
               'end': 9812,
               'title': 'Udakapūjakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 334',
               'vri': '7–13',
               'pts': {'volume': 1, 'page': 267, 'end_page': 267},
               'index_revision': 'apadana-thera333-336-v1'},
 'tha-ap335': {'id': 'tha-ap335',
               'book': 36,
               'start': 9812,
               'end': 9829,
               'title': 'Punnāgapupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 335',
               'vri': '14–18',
               'pts': {'volume': 1, 'page': 267, 'end_page': 267},
               'index_revision': 'apadana-thera333-336-v1'},
 'tha-ap336': {'id': 'tha-ap336',
               'book': 36,
               'start': 9829,
               'end': 9890,
               'title': 'Ekadussadāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 336',
               'vri': '19–37',
               'pts': {'volume': 1, 'page': 267, 'end_page': 267},
               'index_revision': 'apadana-thera333-336-v1'}}
TARGETS = tuple(OLD_UNITS)


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def four_state(units, before_annotation=False):
    selected = {}
    for key in TARGETS:
        rows = [u for u in units if u.get('id') == key]
        if len(rows) != 1:
            raise ValueError('Missing or duplicate reviewed four-poem unit')
        selected[key] = rows[0]
    for state, expected in (('old', OLD_UNITS), ('new', NEW_UNITS)):
        match = copy.deepcopy(expected)
        if before_annotation and all('pts' not in u for u in selected.values()):
            for u in match.values():
                del u['pts']
        if json.dumps(selected, ensure_ascii=False, sort_keys=True) == json.dumps(match, ensure_ascii=False, sort_keys=True):
            return state
    raise ValueError('Unreviewed, mixed or partial four-poem metadata state')


def canon_before_thera333(canon):
    """Explicit historical-test inverse; never use to rebase a saved locator."""
    if canon.get('source', {}).get('commit') != COMMIT:
        raise ValueError('Four-poem inverse requires the reviewed VRI source')
    four_state(canon['units'])
    out = dict(canon)
    out['units'] = [copy.deepcopy(OLD_UNITS[u['id']]) if u.get('id') in TARGETS else u
                    for u in canon['units']]
    return out


def apadana_thera333_spans(books, units):
    indexes = [i for i, b in enumerate(books) if b['file'] == FILE]
    if not indexes:
        return []
    if indexes != [36]:
        raise ValueError('Unexpected reviewed four-poem source book identity')
    blocks = books[36]['blocks']
    compact = [[b['rend'], b['n'], b['text'], b['notes'],
                {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}]
               for b in blocks]
    if digest(compact) != ROOT_BLOCKS_SHA256:
        raise ValueError('Complete reviewed source words, notes or pages differ')
    state = four_state(units, before_annotation=True)
    for u in units:
        if u.get('shares_passage_with') in TARGETS or set(u.get('members', [])) & set(TARGETS):
            raise ValueError('Four-poem group dependency needs independent review')
    for key, span in {'tha-ap332': (9688, 9767), 'tha-ap337': (9890, 9938)}.items():
        rows = [u for u in units if u.get('id') == key]
        if (len(rows) != 1 or rows[0]['book'] != 36
                or (rows[0]['start'], rows[0]['end']) != span
                or any(rows[0].get(k) for k in ('kind', 'approximate', 'shares_passage_with'))):
            raise ValueError('Unexpected reviewed four-poem neighbour')
    if state == 'new':
        return []
    for u in units:
        if u['id'] in TARGETS:
            t = NEW_UNITS[u['id']]
            u.update(start=t['start'], end=t['end'], title=t['title'], vri=t['vri'], index_revision=REVISION)
    return list(TARGETS)
