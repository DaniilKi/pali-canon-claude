"""Finite ownership repair for Therī Apadāna 23/24 in the third vagga.

Move the Sakulā heading and opening stanza together. Do not alter source
wording, the older repairs, or the unresolved fourth-vagga boundaries.
"""
REVISION = 'apadana-theri21-30-v1'
FILE = 's0510m2.mul.xml'
TARGETS = ('thi-ap23', 'thi-ap24')
# id: legacy start/end, reviewed start/end, first/last actual VRI stanza, title
SPANS = {
    'thi-ap23': (8764, 8877, 8764, 8873, 95, 130, 'Dhammadinnātherīapadānaṃ'),
    'thi-ap24': (8877, 8978, 8873, 8978, 131, 165, 'Sakulātherīapadāna'),
}


def apadana_third_spans(books, units):
    indexes = [i for i, b in enumerate(books) if b['file'] == FILE]
    if not indexes:
        return []
    if len(indexes) != 1:
        raise ValueError('Duplicate Therī Apadāna source book')
    bi = indexes[0]
    blocks = books[bi]['blocks']
    selected = {}
    for key in ('thi-ap22', *TARGETS, 'thi-ap25'):
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
        8644: '2. Kisāgotamītherīapadānaṃ',
        8764: '3. Dhammadinnātherīapadānaṃ',
        8873: '4. Sakulātherīapadānaṃ',
        8978: '5. Nandātherīapadānaṃ',
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
        8871: ('bodytext', 'Itthaṃ sudaṃ dhammadinnā bhikkhunī imā gāthāyo abhāsitthāti.'),
        8872: ('centre', 'Dhammadinnātheriyāpadānaṃ tatiyaṃ.'),
        8976: ('bodytext', 'Itthaṃ sudaṃ sakulā bhikkhunī imā gāthāyo abhāsitthāti.'),
        8977: ('centre', 'Sakulātheriyāpadānaṃ catutthaṃ.'),
    }
    if any((blocks[i]['rend'], blocks[i]['text']) != expected for i, expected in terminals.items()):
        raise ValueError('Unexpected Therī Apadāna identity colophon')
    for key, expected in {
        'thi-ap22': (8644, 8764, 'Kisāgotamītherīapadānaṃ'),
        'thi-ap25': (8978, 9140, 'Nandātherīapadānaṃ'),
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
    # All source and ownership checks precede the paired mutation.
    for key in TARGETS:
        selected[key].update(start=SPANS[key][2], end=SPANS[key][3], index_revision=REVISION)
    return list(TARGETS)
