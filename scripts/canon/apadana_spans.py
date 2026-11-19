"""Finite, title-verified ownership repair for Therī Apadāna 4 and 5 only.

Keep public IDs/titles and all source blocks. Both locators change together;
old saved locations must be reviewed rather than silently renumbered.
"""
REVISION = 'apadana-theri45-v1'
FILE = 's0510m2.mul.xml'
TARGETS = ('thi-ap4', 'thi-ap5')


def apadana_spans(books, units):
    indexes = [i for i, book in enumerate(books) if book['file'] == FILE]
    if not indexes:
        return []
    if len(indexes) != 1:
        raise ValueError('Duplicate Therī Apadāna source book')
    bi = indexes[0]
    blocks = books[bi]['blocks']
    selected = {}
    for key in ('thi-ap3', *TARGETS, 'thi-ap6'):
        found = [u for u in units if u['id'] == key]
        if (len(found) != 1 or found[0]['book'] != bi
                or found[0].get('collection') != 'ap'
                or any(found[0].get(k) for k in ('kind', 'approximate', 'shares_passage_with'))):
            raise ValueError(f'Unexpected Therī Apadāna identity: {key}')
        selected[key] = found[0]
    for u in units:
        if u.get('shares_passage_with') in TARGETS or set(u.get('members', [])) & set(TARGETS):
            raise ValueError('Therī Apadāna owner/group dependency requires review')
    headings = {6614: '3. Maṇḍapadāyikātherīapadānaṃ',
                6629: '4. Saṅkamanatthātherīapadānaṃ',
                6647: '5. Naḷamālikātherīapadānaṃ',
                6675: '6. Ekapiṇḍapātadāyikātherīapadānaṃ'}
    for at, text in headings.items():
        if [i for i, b in enumerate(blocks) if b['rend'] == 'subhead' and b['text'] == text] != [at]:
            raise ValueError(f'Expected unique Therī Apadāna heading: {text}')
    for lo, hi, first, last in ((6629, 6647, 31, 36), (6647, 6675, 37, 45)):
        span = blocks[lo:hi]
        if ([b['n'] for b in span if b['n']] != [str(n) for n in range(first, last + 1)]
                or any(b['rend'] != 'hangnum' for b in span if b['n'])
                or [i for i in range(lo, hi) if blocks[i]['rend'] == 'subhead'] != [lo]):
            raise ValueError('Unexpected Therī Apadāna verse sequence or interior heading')
    terminals = {6645: ('bodytext', 'Itthaṃ sudaṃ saṅkamanatthā bhikkhunī imā gāthāyo abhāsitthāti.'),
                 6646: ('centre', 'Saṅkamanatthātheriyāpadānaṃ catutthaṃ.'),
                 6673: ('bodytext', 'Itthaṃ sudaṃ naḷamālikā therī imā gāthāyo abhāsitthāti.'),
                 6674: ('centre', 'Naḷamālikātheriyāpadānaṃ pañcamaṃ.')}
    if any((blocks[i]['rend'], blocks[i]['text']) != expected for i, expected in terminals.items()):
        raise ValueError('Unexpected Therī Apadāna identity colophon')
    prev, left, right, after = [selected[k] for k in ('thi-ap3', *TARGETS, 'thi-ap6')]
    if ((prev['start'], prev['end'], prev['title']) != (6614, 6629, 'Maṇḍapadāyikātherīapadānaṃ')
            or (after['start'], after['end'], after['title']) != (6675, 6717, 'Ekapiṇḍapātadāyikātherīapadānaṃ')
            or left['title'] != 'Saṅkamanatthātherīapadānaṃ'
            or right['title'] != 'Naḷamālikātherīapadāna'):
        raise ValueError('Unexpected Therī Apadāna neighbours or citation titles')
    legacy = ((left['start'], left['end'], right['start'], right['end']) == (6629, 6651, 6651, 6675)
              and all('index_revision' not in u for u in (left, right)))
    corrected = ((left['start'], left['end'], right['start'], right['end']) == (6629, 6647, 6647, 6675)
                 and all(u.get('index_revision') == REVISION for u in (left, right)))
    if not (legacy or corrected):
        raise ValueError('Unexpected Therī Apadāna index state; review required')
    if corrected:
        return []
    # Every validation precedes mutation; the boundary and locator pair is atomic.
    left.update(end=6647, index_revision=REVISION)
    right.update(start=6647, index_revision=REVISION)
    return list(TARGETS)
