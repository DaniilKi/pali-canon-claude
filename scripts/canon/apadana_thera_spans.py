"""Finite, atomic Therā Apadāna ownership corrections for two source splits.

Only 19/20 and 23/24 move. Preserve all original blocks, citation titles,
chapter headings, recitation colophons and earlier Therī locator revisions.
"""
REVISION = 'apadana-thera11-30-v1'
FILE = 's0510m1.mul.xml'
TARGETS = ('tha-ap19', 'tha-ap20', 'tha-ap23', 'tha-ap24')
# legacy start/end, verified start/end, first/last VRI stanza, citation title
SPANS = {
    'tha-ap19': (2322, 2364, 2322, 2360, 86, 96, 'Upasenavaṅgantaputtattheraapadānaṃ'),
    'tha-ap20': (2364, 2408, 2360, 2408, 97, 111, 'Raṭṭhapālattheraapadāna'),
    'tha-ap23': (2507, 2671, 2507, 2667, 1, 51, 'Subhūtittheraapadānaṃ'),
    'tha-ap24': (2671, 2834, 2667, 2834, 52, 105, 'Upavānattheraapadāna'),
}


def apadana_thera_spans(books, units):
    indexes = [i for i, b in enumerate(books) if b['file'] == FILE]
    if not indexes:
        return []
    if len(indexes) != 1:
        raise ValueError('Duplicate Therā Apadāna source book')
    bi = indexes[0]
    blocks = books[bi]['blocks']
    selected = {}
    for key in ('tha-ap18', *TARGETS, 'tha-ap21', 'tha-ap22', 'tha-ap25'):
        found = [u for u in units if u['id'] == key]
        if (len(found) != 1 or found[0]['book'] != bi
                or found[0].get('collection') != 'ap'
                or any(found[0].get(k) for k in ('kind', 'approximate', 'shares_passage_with'))):
            raise ValueError(f'Unexpected Therā Apadāna identity: {key}')
        selected[key] = found[0]
    for u in units:
        if u.get('shares_passage_with') in TARGETS or set(u.get('members', [])) & set(TARGETS):
            raise ValueError('Therā Apadāna owner/group dependency requires review')
    headings = {
        2265: ('subhead', '6. Rāhulattheraapadānaṃ'),
        2322: ('subhead', '7. Upasenavaṅgantaputtattheraapadānaṃ'),
        2360: ('subhead', '8. Raṭṭhapālattheraapadānaṃ'),
        2408: ('subhead', '9. Sopākattheraapadānaṃ'),
        2447: ('subhead', '10. Sumaṅgalattheraapadānaṃ'),
        2507: ('chapter', '3. Subhūtivaggo'),
        2508: ('subhead', '1. Subhūtittheraapadānaṃ'),
        2667: ('subhead', '2. Upavānattheraapadānaṃ'),
        2834: ('subhead', '3. Tisaraṇagamaniyattheraapadānaṃ'),
    }
    for at, expected in headings.items():
        if [i for i, b in enumerate(blocks) if (b['rend'], b['text']) == expected] != [at]:
            raise ValueError(f'Expected unique Therā Apadāna heading: {expected[1]}')
    for key, (_, _, lo, hi, first, last, title) in SPANS.items():
        span = blocks[lo:hi]
        if (selected[key]['title'] != title
                or [b['n'] for b in span if b['n']] != [str(n) for n in range(first, last + 1)]
                or any(b['rend'] != 'hangnum' for b in span if b['n'])
                or [i for i in range(lo, hi) if blocks[i]['rend'] in ('subhead', 'chapter')] != [i for i in headings if lo <= i < hi]):
            raise ValueError(f'Unexpected Therā Apadāna title, sequence or interior heading: {key}')
    terminals = {
        2357: ('bodytext', 'Itthaṃ sudaṃ āyasmā upaseno vaṅgantaputto thero imā gāthāyo abhāsitthāti.'),
        2358: ('centre', 'Upasenavaṅgantaputtattherassāpadānaṃ sattamaṃ.'),
        2359: ('centre', 'Tatiyabhāṇavāraṃ.'),
        2406: ('bodytext', 'Itthaṃ sudaṃ āyasmā raṭṭhapālo thero imā gāthāyo abhāsitthāti.'),
        2407: ('centre', 'Raṭṭhapālattherassāpadānaṃ aṭṭhamaṃ.'),
        2665: ('bodytext', 'Itthaṃ sudaṃ āyasmā subhūti thero imā gāthāyo abhāsitthāti.'),
        2666: ('centre', 'Subhūtittherassāpadānaṃ paṭhamaṃ.'),
        2832: ('bodytext', 'Itthaṃ sudaṃ āyasmā upavāno thero imā gāthāyo abhāsitthāti.'),
        2833: ('centre', 'Upavānattherassāpadānaṃ dutiyaṃ.'),
    }
    if any((blocks[i]['rend'], blocks[i]['text']) != expected for i, expected in terminals.items()):
        raise ValueError('Unexpected Therā Apadāna colophon or recitation owner')
    for key, expected in {
        'tha-ap18': (2265, 2322, 'Rāhulattheraapadānaṃ'),
        'tha-ap21': (2408, 2447, 'Sopākattheraapadānaṃ'),
        'tha-ap22': (2447, 2507, 'Sumaṅgalattheraapadānaṃ'),
        'tha-ap25': (2834, 2921, 'Tisaraṇagamaniyattheraapadānaṃ'),
    }.items():
        u = selected[key]
        if (u['start'], u['end'], u['title']) != expected:
            raise ValueError('Unexpected Therā Apadāna neighbours')
    legacy = all((selected[k]['start'], selected[k]['end']) == SPANS[k][:2]
                 and 'index_revision' not in selected[k] for k in TARGETS)
    corrected = all((selected[k]['start'], selected[k]['end']) == SPANS[k][2:4]
                    and selected[k].get('index_revision') == REVISION for k in TARGETS)
    if not (legacy or corrected):
        raise ValueError('Unexpected Therā Apadāna index state; review required')
    if corrected:
        return []
    for key in TARGETS:
        selected[key].update(start=SPANS[key][2], end=SPANS[key][3], index_revision=REVISION)
    return list(TARGETS)
