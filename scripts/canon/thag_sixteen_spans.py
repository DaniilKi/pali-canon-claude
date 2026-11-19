"""Finite atomic ownership repair for the two ends of Thag 16.4.

Preserve original VRI blocks and all citation identities. Three locators move
as one revision; old saved segments must be explicitly reviewed, not rebased.
"""
REVISION = 'thag16-3-5-v1'
FILE = 's0508m.mul.xml'
TARGETS = ('thag16.3', 'thag16.4', 'thag16.5')
# legacy start/end, source-verified start/end, first/last VRI stanza, title
SPANS = {
    'thag16.3': (2973, 3045, 2973, 3041, 747, 768, 'Telakānittheragāthā'),
    'thag16.4': (3045, 3122, 3041, 3118, 769, 793, 'Raṭṭhapālattheragāthā'),
    'thag16.5': (3122, 3204, 3118, 3204, 794, 817, 'Mālukyaputtattheragāthā'),
}


def thag_sixteen_spans(books, units):
    indexes = [i for i, b in enumerate(books) if b['file'] == FILE]
    if not indexes:
        return []
    if len(indexes) != 1:
        raise ValueError('Duplicate Theragāthā source book')
    bi = indexes[0]
    blocks = books[bi]['blocks']
    selected = {}
    for key in ('thag16.2', *TARGETS, 'thag16.6'):
        found = [u for u in units if u['id'] == key]
        if (len(found) != 1 or found[0]['book'] != bi
                or found[0].get('collection') != 'thag'
                or any(found[0].get(k) for k in ('kind', 'approximate', 'shares_passage_with'))):
            raise ValueError(f'Unexpected Theragāthā identity: {key}')
        selected[key] = found[0]
    for u in units:
        if u.get('shares_passage_with') in TARGETS or set(u.get('members', [])) & set(TARGETS):
            raise ValueError('Theragāthā owner/group dependency requires review')
        if (u.get('book') == bi and u['id'] not in TARGETS
                and u['start'] < 3204 and u['end'] > 2973):
            raise ValueError('Unexpected overlapping Theragāthā owner')
    headings = {
        2908: '2. Pārāpariyattheragāthā',
        2973: '3. Telakānittheragāthā',
        3041: '4. Raṭṭhapālattheragāthā',
        3118: '5. Mālukyaputtattheragāthā',
        3204: '6. Selattheragāthā',
    }
    for at, text in headings.items():
        # Mālukyaputta also has the identically numbered heading in nipāta6.
        # Pin both authentic occurrences; do not confuse the two poems or
        # weaken the source check to an unconstrained title match.
        occurrences = [1795, 3118] if at == 3118 else [at]
        if [i for i, b in enumerate(blocks) if (b['rend'], b['text']) == ('subhead', text)] != occurrences:
            raise ValueError(f'Expected reviewed Theragāthā heading occurrences: {text}')
    if (blocks[2842]['rend'], blocks[2842]['text']) != ('chapter', '16. Vīsatinipāto'):
        raise ValueError('Unexpected Theragāthā nipāta owner')
    for key, (_, _, lo, hi, first, last, title) in SPANS.items():
        span = blocks[lo:hi]
        if (selected[key]['title'] != title
                or [b['n'] for b in span if b['n']] != [str(n) for n in range(first, last + 1)]
                or any(b['rend'] != 'hangnum' for b in span if b['n'])
                or [i for i in range(lo, hi) if blocks[i]['rend'] in ('subhead', 'chapter')] != [lo]):
            raise ValueError(f'Unexpected Theragāthā title, stanza sequence or interior heading: {key}')
    endings = {2972: '…Pārāpariyo thero….', 3040: '…Telakāni thero….',
               3117: '… Raṭṭhapālo thero….', 3203: '… Mālukyaputto thero….',
               3277: '… Selo thero….'}
    if any((blocks[i]['rend'], blocks[i]['text']) != ('centre', text) for i, text in endings.items()):
        raise ValueError('Unexpected Theragāthā identity colophon')
    for key, expected in {
        'thag16.2': (2908, 2973, 'Pārāpariyattheragāthā'),
        'thag16.6': (3204, 3278, 'Selattheragāthā'),
    }.items():
        u = selected[key]
        if (u['start'], u['end'], u['title']) != expected:
            raise ValueError('Unexpected Theragāthā outside neighbours')
        first, last = (726, 746) if key == 'thag16.2' else (818, 841)
        if [b['n'] for b in blocks[u['start']:u['end']] if b['n']] != [str(n) for n in range(first, last + 1)]:
            raise ValueError('Unexpected Theragāthā outside-neighbour stanza sequence')
    legacy = all((selected[k]['start'], selected[k]['end']) == SPANS[k][:2]
                 and 'index_revision' not in selected[k] for k in TARGETS)
    corrected = all((selected[k]['start'], selected[k]['end']) == SPANS[k][2:4]
                    and selected[k].get('index_revision') == REVISION for k in TARGETS)
    if not (legacy or corrected):
        raise ValueError('Unexpected Theragāthā index state; review required')
    if corrected:
        return []
    # Both cuts and all three saved-position revisions are one atomic change.
    for key in TARGETS:
        selected[key].update(start=SPANS[key][2], end=SPANS[key][3], index_revision=REVISION)
    return list(TARGETS)
