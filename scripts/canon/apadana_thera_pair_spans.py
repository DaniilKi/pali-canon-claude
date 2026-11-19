"""Finite atomic repair of the publisher 105/106 canonical ownership split.

The independent original-XML review approves cut 5248 only. Citation titles and
all source blocks remain unchanged; both canonical owners get a new locator
revision. The inverse is explicit historical-test machinery, never user-data
migration or permission to accept an unreviewed source state.
"""
import copy
import hashlib
import json

REVISION = 'apadana-thera105-106-v1'
COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
FILE = 's0510m1.mul.xml'
TARGETS = ('tha-ap107', 'tha-ap108')
PRE_PAIR_SHA256 = '49701605d61352898b3970143192e12b3509dbda966cfb42511e2af0e5f790a1'
ROOT_BLOCKS_SHA256 = 'bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44'
# Independently reviewed old records, not copied from installed/current data.
OLD_UNITS = {
    'tha-ap107': {'id': 'tha-ap107', 'book': 36, 'start': 5231, 'end': 5252,
                  'title': 'Muṭṭhipupphiyattheraapadānaṃ', 'collection': 'ap',
                  'acronym': 'Tha Ap 107', 'vri': '24–29',
                  'pts': {'volume': 1, 'page': 142, 'end_page': 142}},
    'tha-ap108': {'id': 'tha-ap108', 'book': 36, 'start': 5252, 'end': 5271,
                  'title': 'Udakapūjakattheraapadāna', 'collection': 'ap',
                  'acronym': 'Tha Ap 108', 'vri': '30–35',
                  'pts': {'volume': 1, 'page': 142, 'end_page': 143}},
}
NEW_UNITS = copy.deepcopy(OLD_UNITS)
NEW_UNITS['tha-ap107'].update(end=5248, vri='24–28', index_revision=REVISION)
NEW_UNITS['tha-ap108'].update(start=5248, vri='29–35', index_revision=REVISION)


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def paired_state(units, before_annotation=False):
    """Accept exactly one complete old or new pair, including all metadata."""
    selected = {}
    for key in TARGETS:
        rows = [u for u in units if u.get('id') == key]
        if len(rows) != 1:
            raise ValueError('Missing or duplicate reviewed Therā paired unit')
        selected[key] = rows[0]
    for state, expected in (('old', OLD_UNITS), ('new', NEW_UNITS)):
        match = copy.deepcopy(expected)
        if before_annotation and all('pts' not in u for u in selected.values()):
            for u in match.values():
                del u['pts']
        # Python equality alone treats true == 1. Canonical metadata must keep
        # the reviewed JSON values/types, independent of object key ordering.
        if json.dumps(selected, ensure_ascii=False, sort_keys=True) == json.dumps(match, ensure_ascii=False, sort_keys=True):
            return state
    raise ValueError('Unreviewed, mixed or partial Therā paired metadata state')


def canon_before_thera_pair(canon):
    """Return a historical snapshot changing only the two reviewed records.

    Unrelated intentional test mutations survive. Whole-canon historical hash
    gates remain the caller's responsibility; target metadata is always strict.
    """
    if canon.get('source', {}).get('commit') != COMMIT:
        raise ValueError('Historical Therā pair snapshot requires reviewed VRI source')
    paired_state(canon['units'])
    out = dict(canon)
    out['units'] = [copy.deepcopy(OLD_UNITS[u['id']]) if u.get('id') in TARGETS else u
                    for u in canon['units']]
    return out


def apadana_thera_pair_spans(books, units):
    indexes = [i for i, b in enumerate(books) if b['file'] == FILE]
    if not indexes:
        return []
    if indexes != [36]:
        raise ValueError('Unexpected original Therā paired book identity')
    blocks = books[36]['blocks']
    compact = [[b['rend'], b['n'], b['text'], b['notes'],
                {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}]
               for b in blocks]
    if digest(compact) != ROOT_BLOCKS_SHA256:
        raise ValueError('Reviewed complete Therā root blocks, notes or pages differ')
    state = paired_state(units, before_annotation=True)
    for u in units:
        if u.get('shares_passage_with') in TARGETS or set(u.get('members', [])) & set(TARGETS):
            raise ValueError('Therā pair owner/group dependency requires separate review')
    for key, span in {'tha-ap106': (5214, 5231), 'tha-ap109': (5271, 5307)}.items():
        rows = [u for u in units if u.get('id') == key]
        if (len(rows) != 1 or rows[0]['book'] != 36
                or (rows[0]['start'], rows[0]['end']) != span
                or any(rows[0].get(k) for k in ('kind', 'approximate', 'shares_passage_with'))):
            raise ValueError('Unexpected reviewed Therā pair neighbour')
    if state == 'new':
        return []
    for u in units:
        if u['id'] in TARGETS:
            # Preserve its key order, title and existing page metadata.
            target = NEW_UNITS[u['id']]
            u.update(start=target['start'], end=target['end'], vri=target['vri'], index_revision=REVISION)
    return list(TARGETS)
