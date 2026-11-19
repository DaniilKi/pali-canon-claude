"""Finite ownership repair for the second Therī Apadāna vagga and its neighbour.

Only four independently checked boundaries change. Source blocks, earlier
poems and other known future-candidate defects remain untouched. The seven
affected locators move atomically so old saved references require review.
"""
REVISION = 'apadana-theri11-20-v1'
FILE = 's0510m2.mul.xml'
TARGETS = tuple(f'thi-ap{n}' for n in range(15, 22))
# id: (legacy start/end, reviewed start/end, first/last actual VRI stanza, title)
SPANS = {
    'thi-ap15': (7117, 7196, 7117, 7192, 61, 85, 'Pañcadīpadāyikātherīapadānaṃ'),
    'thi-ap16': (7196, 7225, 7192, 7225, 86, 96, 'Naḷamālikātherīapadāna'),
    'thi-ap17': (7225, 7806, 7225, 7802, 97, 288, 'Mahāpajāpatigotamītherīapadānaṃ'),
    'thi-ap18': (7806, 8088, 7802, 8088, 289, 383, 'Khemātherīapadāna'),
    'thi-ap19': (8088, 8344, 8088, 8340, 384, 467, 'Uppalavaṇṇātherīapadānaṃ'),
    'thi-ap20': (8344, 8483, 8340, 8478, 468, 511, 'Paṭācārātherīapadāna'),
    'thi-ap21': (8483, 8644, 8478, 8644, 1, 54, 'Kuṇḍalakesātherīapadāna'),
}


def apadana_next_spans(books, units):
    indexes = [i for i, b in enumerate(books) if b['file'] == FILE]
    if not indexes:
        return []
    if len(indexes) != 1:
        raise ValueError('Duplicate Therī Apadāna source book')
    bi = indexes[0]
    blocks = books[bi]['blocks']
    selected = {}
    for key in ('thi-ap14', *TARGETS, 'thi-ap22'):
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
        7045: ('subhead', '4. Ekāsanadāyikātherīapadānaṃ'),
        7117: ('subhead', '5. Pañcadīpadāyikātherīapadānaṃ'),
        7192: ('subhead', '6. Naḷamālikātherīapadānaṃ'),
        7225: ('subhead', '7. Mahāpajāpatigotamītherīapadānaṃ'),
        7802: ('subhead', '8. Khemātherīapadānaṃ'),
        8088: ('subhead', '9. Uppalavaṇṇātherīapadānaṃ'),
        8340: ('subhead', '10. Paṭācārātherīapadānaṃ'),
        8478: ('chapter', '3. Kuṇḍalakesīvaggo'),
        8479: ('subhead', '1. Kuṇḍalakesātherīapadānaṃ'),
        8644: ('subhead', '2. Kisāgotamītherīapadānaṃ'),
    }
    for at, (rend, text) in headings.items():
        if [i for i, b in enumerate(blocks) if (b['rend'], b['text']) == (rend, text)] != [at]:
            raise ValueError(f'Expected unique Therī Apadāna heading: {text}')
    for key, (_, _, lo, hi, first, last, title) in SPANS.items():
        span = blocks[lo:hi]
        expected_headings = [i for i in headings if lo <= i < hi]
        if (selected[key]['title'] != title
                or [b['n'] for b in span if b['n']] != [str(n) for n in range(first, last + 1)]
                or any(b['rend'] != 'hangnum' for b in span if b['n'])
                or [i for i in range(lo, hi) if blocks[i]['rend'] in ('subhead', 'chapter')] != expected_headings):
            raise ValueError(f'Unexpected Therī Apadāna title, sequence or interior heading: {key}')
    terminals = {
        7190: ('bodytext', 'Itthaṃ sudaṃ pañcadīpadāyikā bhikkhunī imā gāthāyo abhāsitthāti.'),
        7191: ('centre', 'Pañcadīpadāyikātheriyāpadānaṃ pañcamaṃ.'),
        7223: ('bodytext', 'Itthaṃ sudaṃ naḷamālikā bhikkhunī imā gāthāyo abhāsitthāti.'),
        7224: ('centre', 'Naḷamālikātheriyāpadānaṃ chaṭṭhaṃ.'),
        7800: ('bodytext', 'Itthaṃ sudaṃ mahāpajāpatigotamī imā gāthāyo abhāsitthāti.'),
        7801: ('centre', 'Mahāpajāpatigotamītheriyāpadānaṃ sattamaṃ.'),
        8086: ('bodytext', 'Itthaṃ sudaṃ khemā bhikkhunī imā gāthāyo abhāsitthāti.'),
        8087: ('centre', 'Khemātheriyāpadānaṃ aṭṭhamaṃ.'),
        8338: ('bodytext', 'Itthaṃ sudaṃ uppalavaṇṇā bhikkhunī imā gāthāyo abhāsitthāti.'),
        8339: ('centre', 'Uppalavaṇṇātheriyāpadānaṃ navamaṃ.'),
        8470: ('bodytext', 'Itthaṃ sudaṃ paṭācārā bhikkhunī imā gāthāyo abhāsitthāti.'),
        8471: ('centre', 'Paṭācārātheriyāpadānaṃ dasamaṃ.'),
        8472: ('centre', 'Ekūposathikavaggo dutiyo.'),
        8473: ('bodytext', 'Tassuddānaṃ –'),
        8642: ('bodytext', 'Itthaṃ sudaṃ bhaddākuṇḍalakesā bhikkhunī imā gāthāyo abhāsitthāti.'),
        8643: ('centre', 'Kuṇḍalakesātheriyāpadānaṃ paṭhamaṃ.'),
    }
    if any((blocks[i]['rend'], blocks[i]['text']) != expected for i, expected in terminals.items()):
        raise ValueError('Unexpected Therī Apadāna identity colophon or chapter paratext')
    for key, expected in {
        'thi-ap14': (7045, 7117, 'Ekāsanadāyikātherīapadānaṃ'),
        'thi-ap22': (8644, 8764, 'Kisāgotamītherīapadānaṃ'),
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
    # No mutation precedes validation; all connected boundary pairs move together.
    for key in TARGETS:
        selected[key].update(start=SPANS[key][2], end=SPANS[key][3], index_revision=REVISION)
    return list(TARGETS)
