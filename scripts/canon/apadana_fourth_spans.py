"""Finite ownership repair for three fourth-vagga Therī Apadāna splits.

All five affected locators move together. Keep every source block, original
citation title and earlier repair; no translation or Pāli wording is changed.
"""
REVISION = 'apadana-theri31-40-v1'
FILE = 's0510m2.mul.xml'
TARGETS = tuple(f'thi-ap{n}' for n in range(33, 38))
# id: legacy start/end, reviewed start/end, first/last actual VRI stanza, title
SPANS = {
    'thi-ap33': (10121, 10200, 10121, 10196, 57, 81, 'Uppaladāyikātherīapadānaṃ'),
    'thi-ap34': (10200, 10289, 10196, 10285, 82, 110, 'Siṅgālamātutherīapadāna'),
    'thi-ap35': (10289, 10382, 10285, 10382, 111, 142, 'Sukkātherīapadāna'),
    'thi-ap36': (10382, 10461, 10382, 10457, 143, 167, 'Abhirūpanandātherīapadānaṃ'),
    'thi-ap37': (10461, 10505, 10457, 10505, 168, 183, 'Aḍḍhakāsitherīapadāna'),
}


def apadana_fourth_spans(books, units):
    indexes = [i for i, b in enumerate(books) if b['file'] == FILE]
    if not indexes:
        return []
    if len(indexes) != 1:
        raise ValueError('Duplicate Therī Apadāna source book')
    bi = indexes[0]
    blocks = books[bi]['blocks']
    selected = {}
    for key in ('thi-ap32', *TARGETS, 'thi-ap38'):
        found = [u for u in units if u['id'] == key]
        if (len(found) != 1 or found[0]['book'] != bi
                or found[0].get('collection') != 'ap'
                or any(found[0].get(k) for k in ('kind', 'approximate', 'shares_passage_with'))):
            raise ValueError(f'Unexpected Therī Apadāna identity: {key}')
        selected[key] = found[0]
    for u in units:
        if u.get('shares_passage_with') in TARGETS or set(u.get('members', [])) & set(TARGETS):
            raise ValueError('Therī Apadāna owner/group dependency requires review')
    headings = {
        9989: '2. Caturāsītibhikkhunīsahassaapadānaṃ',
        10121: '3. Uppaladāyikātherīapadānaṃ',
        10196: '4. Siṅgālamātutherīapadānaṃ',
        10285: '5. Sukkātherīapadānaṃ',
        10382: '6. Abhirūpanandātherīapadānaṃ',
        10457: '7. Aḍḍhakāsitherīapadānaṃ',
        10505: '8. Puṇṇikātherīapadānaṃ',
    }
    for at, text in headings.items():
        if [i for i, b in enumerate(blocks) if (b['rend'], b['text']) == ('subhead', text)] != [at]:
            raise ValueError(f'Expected unique Therī Apadāna heading: {text}')
    for key, (_, _, lo, hi, first, last, title) in SPANS.items():
        span = blocks[lo:hi]
        if (selected[key]['title'] != title
                or [b['n'] for b in span if b['n']] != [str(n) for n in range(first, last + 1)]
                or any(b['rend'] != 'hangnum' for b in span if b['n'])
                or [i for i in range(lo, hi) if blocks[i]['rend'] in ('subhead', 'chapter')] != [lo]):
            raise ValueError(f'Unexpected Therī Apadāna title, sequence or interior heading: {key}')
    terminals = {
        10194: ('bodytext', 'Itthaṃ sudaṃ uppaladāyikā bhikkhunī bhagavato sammukhā imā gāthāyo abhāsitthāti.'),
        10195: ('centre', 'Uppaladāyikātheriyāpadānaṃ tatiyaṃ.'),
        10283: ('bodytext', 'Itthaṃ sudaṃ siṅgālamātā bhikkhunī imā gāthāyo abhāsitthāti.'),
        10284: ('centre', 'Siṅgālamātutheriyāpadānaṃ catutthaṃ.'),
        10379: ('bodytext', 'Itthaṃ sudaṃ sukkā bhikkhunī imā gāthāyo abhāsitthāti.'),
        10380: ('centre', 'Sukkātheriyāpadānaṃ pañcamaṃ.'),
        10381: ('centre', 'Pañcamaṃ bhāṇavāraṃ.'),
        10455: ('bodytext', 'Itthaṃ sudaṃ abhirūpanandā bhikkhunī imā gāthāyo abhāsitthāti.'),
        10456: ('centre', 'Abhirūpanandātheriyāpadānaṃ chaṭṭhaṃ.'),
        10503: ('bodytext', 'Itthaṃ sudaṃ aḍḍhakāsi bhikkhunī imā gāthāyo abhāsitthāti.'),
        10504: ('centre', 'Aḍḍhakāsitheriyāpadānaṃ sattamaṃ.'),
    }
    if any((blocks[i]['rend'], blocks[i]['text']) != expected for i, expected in terminals.items()):
        raise ValueError('Unexpected Therī Apadāna identity colophon or recitation marker')
    for key, expected in {
        'thi-ap32': (9989, 10121, 'Caturāsītibhikkhunīsahassaapadānaṃ'),
        'thi-ap38': (10505, 10565, 'Puṇṇikātherīapadānaṃ'),
    }.items():
        u = selected[key]
        if (u['start'], u['end'], u['title']) != expected:
            raise ValueError('Unexpected Therī Apadāna neighbours')
    legacy = all((selected[k]['start'], selected[k]['end']) == SPANS[k][:2]
                 and 'index_revision' not in selected[k] for k in TARGETS)
    corrected = all((selected[k]['start'], selected[k]['end']) == SPANS[k][2:4]
                    and selected[k].get('index_revision') == REVISION for k in TARGETS)
    if not (legacy or corrected):
        raise ValueError('Unexpected Therī Apadāna index state; review required')
    if corrected:
        return []
    # No mutation precedes validation, even for disconnected boundary pairs.
    for key in TARGETS:
        selected[key].update(start=SPANS[key][2], end=SPANS[key][3], index_revision=REVISION)
    return list(TARGETS)
