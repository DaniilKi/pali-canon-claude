"""Atomic next-ten Therā metadata repair; no source words or personal data move."""
import copy
import hashlib
import json
from apadana_thera_pair_spans import NEW_UNITS as PRIOR_PAIR_UNITS
from apadana_thera333_spans import NEW_UNITS as PRIOR_FOUR_UNITS
from apadana_thera340_spans import NEW_UNITS as PRIOR_SIX_UNITS

REVISION = 'apadana-thera-next10-v1'
COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
PRE_NEXT10_SHA256 = '0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
POST_NEXT10_SHA256 = 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
BOOKS = {36: 's0510m1.mul.xml', 37: 's0510m2.mul.xml'}
ROOT_BLOCKS_SHA256 = {36: 'bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44',
                      37: 'bd0177c2025298415abd2e90e1d576d2418127e08ce339699ad725960089f8cc'}
ROOT_BLOCK_COUNTS = {36: 14645, 37: 10672}
OLD_UNITS = {'tha-ap348': {'id': 'tha-ap348',
               'book': 36,
               'start': 10350,
               'end': 10371,
               'title': 'Campakapupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 348',
               'vri': '39–44',
               'pts': {'volume': 1, 'page': 279, 'end_page': 279}},
 'tha-ap349': {'id': 'tha-ap349',
               'book': 36,
               'start': 10371,
               'end': 10382,
               'title': 'Padumapūjakattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 349',
               'vri': '45–47',
               'pts': {'volume': 1, 'page': 279, 'end_page': 280}},
 'tha-ap374': {'id': 'tha-ap374',
               'book': 36,
               'start': 10763,
               'end': 10790,
               'title': 'Pāṭalipupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 374',
               'vri': '6–13',
               'pts': {'volume': 1, 'page': 290, 'end_page': 291}},
 'tha-ap375': {'id': 'tha-ap375',
               'book': 36,
               'start': 10790,
               'end': 10815,
               'title': 'Tīṇuppalamāliyattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 375',
               'vri': '14–21',
               'pts': {'volume': 1, 'page': 291, 'end_page': 291}},
 'tha-ap423': {'id': 'tha-ap423',
               'book': 37,
               'start': 1,
               'end': 55,
               'title': 'Sakiṃsammajjakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 423',
               'vri': '1–15',
               'pts': {'volume': 2, 'page': 379, 'end_page': 379}},
 'tha-ap424': {'id': 'tha-ap424',
               'book': 37,
               'start': 55,
               'end': 114,
               'title': 'Ekadussadāyakattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 424',
               'vri': '16–35',
               'pts': {'volume': 2, 'page': 379, 'end_page': 380}},
 'tha-ap426': {'id': 'tha-ap426',
               'book': 37,
               'start': 190,
               'end': 216,
               'title': 'Sattakadambapupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 426',
               'vri': '61–68',
               'pts': {'volume': 2, 'page': 382, 'end_page': 383}},
 'tha-ap427': {'id': 'tha-ap427',
               'book': 37,
               'start': 216,
               'end': 242,
               'title': 'Koraṇḍapupphiyattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 427',
               'vri': '69–77',
               'pts': {'volume': 2, 'page': 383, 'end_page': 383}},
 'tha-ap428': {'id': 'tha-ap428',
               'book': 37,
               'start': 242,
               'end': 277,
               'title': 'Ghatamaṇḍadāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 428',
               'vri': '78–88',
               'pts': {'volume': 2, 'page': 383, 'end_page': 384}},
 'tha-ap429': {'id': 'tha-ap429',
               'book': 37,
               'start': 277,
               'end': 333,
               'title': 'Ekadhammassavaniyattheraapadāna',
               'collection': 'ap',
               'acronym': 'Tha Ap 429',
               'vri': '89–106',
               'pts': {'volume': 2, 'page': 384, 'end_page': 385}}}
NEW_UNITS = {'tha-ap348': {'id': 'tha-ap348',
               'book': 36,
               'start': 10350,
               'end': 10367,
               'title': 'Campakapupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 348',
               'vri': '39–43',
               'pts': {'volume': 1, 'page': 279, 'end_page': 279},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap349': {'id': 'tha-ap349',
               'book': 36,
               'start': 10367,
               'end': 10382,
               'title': 'Padumapūjakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 349',
               'vri': '44–47',
               'pts': {'volume': 1, 'page': 279, 'end_page': 280},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap374': {'id': 'tha-ap374',
               'book': 36,
               'start': 10763,
               'end': 10786,
               'title': 'Pāṭalipupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 374',
               'vri': '6–12',
               'pts': {'volume': 1, 'page': 290, 'end_page': 290},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap375': {'id': 'tha-ap375',
               'book': 36,
               'start': 10786,
               'end': 10815,
               'title': 'Tīṇuppalamāliyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 375',
               'vri': '13–21',
               'pts': {'volume': 1, 'page': 290, 'end_page': 291},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap423': {'id': 'tha-ap423',
               'book': 37,
               'start': 1,
               'end': 51,
               'title': 'Sakiṃsammajjakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 423',
               'vri': '1–14',
               'pts': {'volume': 2, 'page': 379, 'end_page': 379},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap424': {'id': 'tha-ap424',
               'book': 37,
               'start': 51,
               'end': 114,
               'title': 'Ekadussadāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 424',
               'vri': '15–35',
               'pts': {'volume': 2, 'page': 379, 'end_page': 380},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap426': {'id': 'tha-ap426',
               'book': 37,
               'start': 190,
               'end': 212,
               'title': 'Sattakadambapupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 426',
               'vri': '61–67',
               'pts': {'volume': 2, 'page': 382, 'end_page': 383},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap427': {'id': 'tha-ap427',
               'book': 37,
               'start': 212,
               'end': 242,
               'title': 'Koraṇḍapupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 427',
               'vri': '68–77',
               'pts': {'volume': 2, 'page': 383, 'end_page': 383},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap428': {'id': 'tha-ap428',
               'book': 37,
               'start': 242,
               'end': 273,
               'title': 'Ghatamaṇḍadāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 428',
               'vri': '78–87',
               'pts': {'volume': 2, 'page': 383, 'end_page': 384},
               'index_revision': 'apadana-thera-next10-v1'},
 'tha-ap429': {'id': 'tha-ap429',
               'book': 37,
               'start': 273,
               'end': 333,
               'title': 'Ekadhammassavaniyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 429',
               'vri': '88–106',
               'pts': {'volume': 2, 'page': 384, 'end_page': 385},
               'index_revision': 'apadana-thera-next10-v1'}}
NEIGHBOURS = {'tha-ap347': {'id': 'tha-ap347',
               'book': 36,
               'start': 10324,
               'end': 10350,
               'title': 'Naḷāgārikattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 347',
               'vri': '31–38',
               'pts': {'volume': 1, 'page': 278, 'end_page': 279},
               'index_revision': 'apadana-thera340-341-343-344-346-347-v1'},
 'tha-ap350': {'id': 'tha-ap350',
               'book': 36,
               'start': 10382,
               'end': 10417,
               'title': 'Tiṇamuṭṭhidāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 350',
               'vri': '48–58',
               'pts': {'volume': 1, 'page': 280, 'end_page': 280}},
 'tha-ap373': {'id': 'tha-ap373',
               'book': 36,
               'start': 10744,
               'end': 10763,
               'title': 'Bodhivandakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 373',
               'vri': '1–5',
               'pts': {'volume': 1, 'page': 289, 'end_page': 290}},
 'tha-ap376': {'id': 'tha-ap376',
               'book': 36,
               'start': 10815,
               'end': 10835,
               'title': 'Paṭṭipupphiyattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 376',
               'vri': '22–27',
               'pts': {'volume': 1, 'page': 291, 'end_page': 292}},
 'tha-ap422': {'id': 'tha-ap422',
               'book': 36,
               'start': 14599,
               'end': 14645,
               'title': 'Mañcadāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 422',
               'vri': '184–196',
               'pts': {'volume': 2, 'page': 377, 'end_page': 378}},
 'tha-ap425': {'id': 'tha-ap425',
               'book': 37,
               'start': 114,
               'end': 190,
               'title': 'Ekāsanadāyakattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 425',
               'vri': '36–60',
               'pts': {'volume': 2, 'page': 380, 'end_page': 382}},
 'tha-ap430': {'id': 'tha-ap430',
               'book': 37,
               'start': 333,
               'end': 437,
               'title': 'Sucintitattheraapadānaṃ',
               'collection': 'ap',
               'acronym': 'Tha Ap 430',
               'vri': '107–139',
               'pts': {'volume': 2, 'page': 385, 'end_page': 387}}}
PAIRS = ((36, 'tha-ap348', 'tha-ap349', 10367, 10371), (36, 'tha-ap374', 'tha-ap375', 10786, 10790), (37, 'tha-ap423', 'tha-ap424', 51, 55), (37, 'tha-ap426', 'tha-ap427', 212, 216), (37, 'tha-ap428', 'tha-ap429', 273, 277))

TARGETS = tuple(OLD_UNITS)


def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode('utf-8')).hexdigest()


def typed(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True)


def _selected(units):
    selected = {}
    for uid in TARGETS:
        rows = [u for u in units if isinstance(u,dict) and u.get('id') == uid]
        if len(rows) != 1:
            raise ValueError('Missing or duplicate reviewed next-ten unit')
        selected[uid] = rows[0]
    return selected


def next10_state(units, before_annotation=False):
    selected = _selected(units)
    no_pts = all('pts' not in u for u in selected.values())
    if not no_pts and not all('pts' in u for u in selected.values()):
        raise ValueError('Mixed annotation state in next-ten records')
    for state, expected in (('old',OLD_UNITS),('new',NEW_UNITS)):
        match = copy.deepcopy(expected)
        if before_annotation and no_pts:
            for u in match.values():
                del u['pts']
        if typed(selected) == typed(match):
            return state
    raise ValueError('Unreviewed, mixed or partial next-ten metadata state')


def canon_before_next10(canon):
    """Pure historical inverse retains unrelated mutations for strict later callers."""
    if canon.get('source',{}).get('commit') != COMMIT:
        raise ValueError('Next-ten inverse requires reviewed VRI source')
    next10_state(canon['units'])
    return dict(canon,units=[copy.deepcopy(OLD_UNITS[u['id']]) if u.get('id') in OLD_UNITS else u
                            for u in canon['units']])


def compact_blocks(blocks):
    return [[b['rend'],b['n'],b['text'],b['notes'],
             {k:[f'{v}.{p}' for v,p in pages] for k,pages in b['pages'].items()}]
            for b in blocks]


def _contains_target(value):
    if isinstance(value,str):
        return value in OLD_UNITS
    if isinstance(value,dict):
        return any(_contains_target(k) or _contains_target(v) for k,v in value.items())
    if isinstance(value,(list,tuple)):
        return any(_contains_target(v) for v in value)
    return False


def apadana_thera_next10_spans(books, units):
    found = {bi:[i for i,b in enumerate(books) if b.get('file') == file] for bi,file in BOOKS.items()}
    if not any(found.values()):
        if any(isinstance(u,dict) and u.get('id') in OLD_UNITS for u in units):
            raise ValueError('Next-ten records cannot exist without both source books')
        return []
    if any(found[bi] != [bi] for bi in BOOKS):
        raise ValueError('Both exact reviewed source books required atomically at36/37')
    for bi in BOOKS:
        blocks = compact_blocks(books[bi]['blocks'])
        if len(blocks) != ROOT_BLOCK_COUNTS[bi] or digest(blocks) != ROOT_BLOCKS_SHA256[bi]:
            raise ValueError('Complete next-ten source words, notes or pages differ')
    if any(not isinstance(u,dict) for u in units):
        raise ValueError('Canonical units must be metadata objects')
    ids = [u.get('id') for u in units]
    if any(not isinstance(uid,str) for uid in ids) or len(ids) != len(set(ids)):
        raise ValueError('Canonical IDs must be unique strings')
    state = next10_state(units,before_annotation=True)
    selected = _selected(units)
    annotated = all('pts' in u for u in selected.values())
    # Earlier namespaces are mandatory; never call or weaken oldsix neighbour348.
    prior = {**PRIOR_PAIR_UNITS,**PRIOR_FOUR_UNITS,**PRIOR_SIX_UNITS,**NEIGHBOURS}
    for uid,expected in prior.items():
        rows = [u for u in units if u.get('id') == uid]
        match = copy.deepcopy(expected)
        if not annotated:
            match.pop('pts',None)
        if len(rows) != 1 or typed(rows[0]) != typed(match):
            raise ValueError('Earlier repaired state or next-ten neighbour changed: '+uid)
    for u in units:
        if any(_contains_target(u.get(k)) for k in ('shares_passage_with','members','group','parent')):
            raise ValueError('Next-ten shared/group dependency needs independent review')
        if u.get('book') in BOOKS:
            if type(u['book']) is not int or type(u.get('start')) is not int or type(u.get('end')) is not int:
                raise ValueError('Exact integer source spans required')
            if not 0 <= u['start'] < u['end'] <= ROOT_BLOCK_COUNTS[u['book']]:
                raise ValueError('Invalid source span in reviewed books')
            if u['id'] not in OLD_UNITS and any(u['book']==bi and u['start'] < NEW_UNITS[right]['end'] and OLD_UNITS[left]['start'] < u['end']
                                               for bi,left,right,cut,oldcut in PAIRS):
                raise ValueError('Unreviewed overlap with next-ten closed source unions')
    if state == 'new':
        return []
    # Both books, all ten records and dependencies were checked before mutation.
    for u in units:
        if u['id'] in NEW_UNITS:
            t = NEW_UNITS[u['id']]
            u.update(start=t['start'],end=t['end'],title=t['title'],vri=t['vri'],index_revision=REVISION)
            if annotated:
                u['pts'] = copy.deepcopy(t['pts'])  #374/375 need source-backed PTS repair
    return list(TARGETS)
