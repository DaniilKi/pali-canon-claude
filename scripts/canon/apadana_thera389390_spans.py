"""Reserved two-record Kadalī/Panasa boundary proposal. No English activation.
Unbound namespace/future oracle deliberately refuse all repair execution.
"""
import copy
import hashlib
import json
import re

COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
REVISION = 'apadana-thera389-390-v1'  # ROOT_BIND_RESERVED_NAMESPACE_AFTER_INDEPENDENT_REVIEW
POST_PAIR_SHA256 = '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'  # ROOT_BIND_INDEPENDENT_FULL_FUTURE_CANON_ORACLE
PRE_PAIR_SHA256 = 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
BOOK = 36
FILE = 's0510m1.mul.xml'
ROOT_BLOCK_COUNT = 14645
ROOT_BLOCK_SHA256 = 'bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44'
UNION = (11045, 11081)
UNION_SHA256 = '5c5bcfd63761c614ba3ec9a63de82405b091244a5baf7edb40b4585e14968e20'
TARGETS = ('tha-ap389', 'tha-ap390')
OLD_UNITS = {'tha-ap389': {'id': 'tha-ap389', 'book': 36, 'start': 11045, 'end': 11067, 'title': 'Kadaliphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 389', 'vri': '37–43', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}}, 'tha-ap390': {'id': 'tha-ap390', 'book': 36, 'start': 11067, 'end': 11081, 'title': 'Panasaphaladāyakattheraapadāna', 'collection': 'ap', 'acronym': 'Tha Ap 390', 'vri': '44–48', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}}}
PROPOSED_UNITS = {'tha-ap389': {'id': 'tha-ap389', 'book': 36, 'start': 11045, 'end': 11063, 'title': 'Kadaliphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 389', 'vri': '37–42', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}}, 'tha-ap390': {'id': 'tha-ap390', 'book': 36, 'start': 11063, 'end': 11081, 'title': 'Panasaphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 390', 'vri': '43–48', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}}}
PRIOR_UNITS = {'tha-ap107': {'id': 'tha-ap107', 'book': 36, 'start': 5231, 'end': 5248, 'title': 'Muṭṭhipupphiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 107', 'vri': '24–28', 'pts': {'volume': 1, 'page': 142, 'end_page': 142}, 'index_revision': 'apadana-thera105-106-v1'}, 'tha-ap108': {'id': 'tha-ap108', 'book': 36, 'start': 5248, 'end': 5271, 'title': 'Udakapūjakattheraapadāna', 'collection': 'ap', 'acronym': 'Tha Ap 108', 'vri': '29–35', 'pts': {'volume': 1, 'page': 142, 'end_page': 143}, 'index_revision': 'apadana-thera105-106-v1'}, 'tha-ap333': {'id': 'tha-ap333', 'book': 36, 'start': 9767, 'end': 9789, 'title': 'Gandhadhūpiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 333', 'vri': '1–6', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}, 'index_revision': 'apadana-thera333-336-v1'}, 'tha-ap334': {'id': 'tha-ap334', 'book': 36, 'start': 9789, 'end': 9812, 'title': 'Udakapūjakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 334', 'vri': '7–13', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}, 'index_revision': 'apadana-thera333-336-v1'}, 'tha-ap335': {'id': 'tha-ap335', 'book': 36, 'start': 9812, 'end': 9829, 'title': 'Punnāgapupphiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 335', 'vri': '14–18', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}, 'index_revision': 'apadana-thera333-336-v1'}, 'tha-ap336': {'id': 'tha-ap336', 'book': 36, 'start': 9829, 'end': 9890, 'title': 'Ekadussadāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 336', 'vri': '19–37', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}, 'index_revision': 'apadana-thera333-336-v1'}, 'tha-ap340': {'id': 'tha-ap340', 'book': 36, 'start': 10053, 'end': 10118, 'title': 'Uttareyyadāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 340', 'vri': '90–110', 'pts': {'volume': 1, 'page': 271, 'end_page': 273}, 'index_revision': 'apadana-thera340-341-343-344-346-347-v1'}, 'tha-ap341': {'id': 'tha-ap341', 'book': 36, 'start': 10118, 'end': 10174, 'title': 'Dhammasavaniyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 341', 'vri': '111–128', 'pts': {'volume': 1, 'page': 273, 'end_page': 274}, 'index_revision': 'apadana-thera340-341-343-344-346-347-v1'}, 'tha-ap343': {'id': 'tha-ap343', 'book': 36, 'start': 10224, 'end': 10258, 'title': 'Ekapadumiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 343', 'vri': '1–10', 'pts': {'volume': 1, 'page': 276, 'end_page': 277}, 'index_revision': 'apadana-thera340-341-343-344-346-347-v1'}, 'tha-ap344': {'id': 'tha-ap344', 'book': 36, 'start': 10258, 'end': 10287, 'title': 'Tīṇuppalamāliyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 344', 'vri': '11–19', 'pts': {'volume': 1, 'page': 277, 'end_page': 278}, 'index_revision': 'apadana-thera340-341-343-344-346-347-v1'}, 'tha-ap346': {'id': 'tha-ap346', 'book': 36, 'start': 10310, 'end': 10324, 'title': 'Tikiṅkaṇipūjakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 346', 'vri': '27–30', 'pts': {'volume': 1, 'page': 278, 'end_page': 278}, 'index_revision': 'apadana-thera340-341-343-344-346-347-v1'}, 'tha-ap347': {'id': 'tha-ap347', 'book': 36, 'start': 10324, 'end': 10350, 'title': 'Naḷāgārikattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 347', 'vri': '31–38', 'pts': {'volume': 1, 'page': 278, 'end_page': 279}, 'index_revision': 'apadana-thera340-341-343-344-346-347-v1'}, 'tha-ap348': {'id': 'tha-ap348', 'book': 36, 'start': 10350, 'end': 10367, 'title': 'Campakapupphiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 348', 'vri': '39–43', 'pts': {'volume': 1, 'page': 279, 'end_page': 279}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap349': {'id': 'tha-ap349', 'book': 36, 'start': 10367, 'end': 10382, 'title': 'Padumapūjakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 349', 'vri': '44–47', 'pts': {'volume': 1, 'page': 279, 'end_page': 280}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap374': {'id': 'tha-ap374', 'book': 36, 'start': 10763, 'end': 10786, 'title': 'Pāṭalipupphiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 374', 'vri': '6–12', 'pts': {'volume': 1, 'page': 290, 'end_page': 290}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap375': {'id': 'tha-ap375', 'book': 36, 'start': 10786, 'end': 10815, 'title': 'Tīṇuppalamāliyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 375', 'vri': '13–21', 'pts': {'volume': 1, 'page': 290, 'end_page': 291}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap388': {'id': 'tha-ap388', 'book': 36, 'start': 11027, 'end': 11045, 'title': 'Valliphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 388', 'vri': '31–36', 'pts': {'volume': 1, 'page': 296, 'end_page': 297}}, 'tha-ap391': {'id': 'tha-ap391', 'book': 36, 'start': 11081, 'end': 11126, 'title': 'Soṇakoṭivīsattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 391', 'vri': '49–63', 'pts': {'volume': 1, 'page': 297, 'end_page': 298}}, 'tha-ap423': {'id': 'tha-ap423', 'book': 37, 'start': 1, 'end': 51, 'title': 'Sakiṃsammajjakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 423', 'vri': '1–14', 'pts': {'volume': 2, 'page': 379, 'end_page': 379}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap424': {'id': 'tha-ap424', 'book': 37, 'start': 51, 'end': 114, 'title': 'Ekadussadāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 424', 'vri': '15–35', 'pts': {'volume': 2, 'page': 379, 'end_page': 380}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap426': {'id': 'tha-ap426', 'book': 37, 'start': 190, 'end': 212, 'title': 'Sattakadambapupphiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 426', 'vri': '61–67', 'pts': {'volume': 2, 'page': 382, 'end_page': 383}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap427': {'id': 'tha-ap427', 'book': 37, 'start': 212, 'end': 242, 'title': 'Koraṇḍapupphiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 427', 'vri': '68–77', 'pts': {'volume': 2, 'page': 383, 'end_page': 383}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap428': {'id': 'tha-ap428', 'book': 37, 'start': 242, 'end': 273, 'title': 'Ghatamaṇḍadāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 428', 'vri': '78–87', 'pts': {'volume': 2, 'page': 383, 'end_page': 384}, 'index_revision': 'apadana-thera-next10-v1'}, 'tha-ap429': {'id': 'tha-ap429', 'book': 37, 'start': 273, 'end': 333, 'title': 'Ekadhammassavaniyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 429', 'vri': '88–106', 'pts': {'volume': 2, 'page': 384, 'end_page': 385}, 'index_revision': 'apadana-thera-next10-v1'}}


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()


def _typed(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def _bound():
    if (type(REVISION) is not str or not re.fullmatch(r'apadana-[a-z0-9-]{1,32}', REVISION)
            or type(POST_PAIR_SHA256) is not str or not re.fullmatch('[a-f0-9]{64}', POST_PAIR_SHA256)
            or POST_PAIR_SHA256 == PRE_PAIR_SHA256):
        raise ValueError('Reserved boundary namespace and independent future canon oracle are not bound')


def new_units():
    _bound()
    return {key: dict(copy.deepcopy(value), index_revision=REVISION) for key, value in PROPOSED_UNITS.items()}


def _selected(units):
    if type(units) is not list or any(type(row) is not dict for row in units):
        raise ValueError('Canonical metadata must be an exact list of objects')
    ids = [row.get('id') for row in units]
    if any(type(key) is not str for key in ids) or len(ids) != len(set(ids)):
        raise ValueError('Canonical IDs must be unique exact strings')
    selected = {row['id']: row for row in units if row['id'] in TARGETS}
    if set(selected) != set(TARGETS):
        raise ValueError('Both exact reviewed targets required atomically')
    return selected


def pair_state(units, before_annotation=False):
    selected = _selected(units)
    present = ['pts' in selected[key] for key in TARGETS]
    if any(present) != all(present):
        raise ValueError('Mixed PTS annotation state')
    for state, expected in (('old', OLD_UNITS), ('new', new_units())):
        match = copy.deepcopy(expected)
        if before_annotation and not any(present):
            for row in match.values():
                del row['pts']
        if _typed(selected) == _typed(match):
            return state
    raise ValueError('Unreviewed mixed/partial pair metadata, types or namespace')


def compact_blocks(blocks):
    return [[b['rend'], b['n'], b['text'], b['notes'],
             {key: [f'{volume}.{page}' for volume, page in pages]
              for key, pages in b['pages'].items()}] for b in blocks]


def _target_dependency(value):
    if type(value) is str:
        return value in TARGETS
    if type(value) is dict:
        return any(_target_dependency(k) or _target_dependency(v) for k, v in value.items())
    if type(value) in (list, tuple):
        return any(_target_dependency(v) for v in value)
    return False


def apadana_thera389390_spans(books, units):
    _bound()
    found = [i for i, book in enumerate(books) if book.get('file') == FILE]
    if not found:
        if any(type(row) is dict and row.get('id') in TARGETS for row in units):
            raise ValueError('Pair cannot exist without its reviewed source book')
        return []
    if found != [BOOK]:
        raise ValueError('Exact reviewed source book required at index36')
    blocks = compact_blocks(books[BOOK]['blocks'])
    if len(blocks) != ROOT_BLOCK_COUNT or digest(blocks) != ROOT_BLOCK_SHA256:
        raise ValueError('Full original book words/notes/pages changed')
    if digest(blocks[UNION[0]:UNION[1]]) != UNION_SHA256:
        raise ValueError('Complete36-tuple union changed')
    state = pair_state(units, before_annotation=True)
    annotated = all('pts' in row for row in _selected(units).values())
    by_id = {row['id']: row for row in units}
    for key, expected in PRIOR_UNITS.items():
        match = copy.deepcopy(expected)
        if not annotated:
            match.pop('pts', None)
        if key not in by_id or _typed(by_id[key]) != _typed(match):
            raise ValueError('Earlier22 repaired records or immediate neighbour changed: ' + key)
    for row in units:
        if any(_target_dependency(row.get(key)) for key in ('shares_passage_with', 'members', 'group', 'parent')):
            raise ValueError('Target group/shared dependency requires separate review')
        if row.get('book') == BOOK:
            if type(row['book']) is not int or type(row.get('start')) is not int or type(row.get('end')) is not int:
                raise ValueError('Exact integer source bounds required')
            if not 0 <= row['start'] < row['end'] <= ROOT_BLOCK_COUNT:
                raise ValueError('Invalid source bounds')
            if row['id'] not in TARGETS and row['start'] < UNION[1] and UNION[0] < row['end']:
                raise ValueError('Other unit overlaps closed pair union')
    if state == 'new':
        return []
    # No input mutation occurs until every source/dependency/state check passed.
    replacements = new_units()
    for key in TARGETS:
        value = replacements[key]
        if not annotated:
            value.pop('pts')
        by_id[key].clear()
        by_id[key].update(value)
    return list(TARGETS)


def canon_before_389390(canon):
    """Strict finite historical input bridge; never an API/data projection."""
    _bound()
    if canon.get('source', {}).get('commit') != COMMIT or digest(canon) not in (PRE_PAIR_SHA256, POST_PAIR_SHA256):
        raise ValueError('Exact independently pinned old/new full canonical inputs required')
    pair_state(canon['units'])
    inverse = dict(canon, units=[copy.deepcopy(OLD_UNITS[row['id']]) if row['id'] in TARGETS else row
                               for row in canon['units']])
    if digest(inverse) != PRE_PAIR_SHA256:
        raise ValueError('Two-record inverse does not reproduce exact F3')
    return inverse
