"""Reviewed SN 12.21/22 ownership only; never modify VRI source blocks.

Accept the known legacy index or this repair's exact corrected state. Source
rebuilds invoke this after story_spans; existing compact datasets must use the
pinned-source repair wrapper, which also checks commentary associations.
"""
REVISION = 'sn-dasabala-v1'
FILE = 's0302m.mul.xml'


def dasabala_spans(books, units):
    indexes = [i for i, book in enumerate(books) if book['file'] == FILE]
    if not indexes:
        return []
    if len(indexes) != 1:
        raise ValueError('Duplicate Dasabala source book')
    bi = indexes[0]
    blocks = books[bi]['blocks']
    targets = ('sn12.21', 'sn12.22')
    selected = {}
    for key in ('sn12.20', *targets, 'sn12.23'):
        found = [u for u in units if u['id'] == key]
        if len(found) != 1 or found[0]['book'] != bi or found[0].get('collection') != 'sn' or found[0].get('kind'):
            raise ValueError(f'Unexpected Dasabala identity: {key}')
        selected[key] = found[0]
    for u in units:
        if u.get('shares_passage_with') in targets or set(u.get('members', [])) & set(targets):
            raise ValueError('Dasabala owner/group dependency requires review')
    expected_heads = {132: ('subhead', '10. Paccayasuttaṃ'),
                      143: ('title', '3. Dasabalavaggo'),
                      144: ('subhead', '1. Dasabalasuttaṃ'),
                      146: ('subhead', '2. Dutiyadasabalasuttaṃ'),
                      150: ('subhead', '3. Upanisasuttaṃ')}
    for at, (rend, text) in expected_heads.items():
        found = [i for i, b in enumerate(blocks) if b['rend'] == rend and b['text'] == text]
        if found != [at]:
            raise ValueError(f'Expected unique Dasabala heading: {text}')
    if ([b['n'] for b in blocks[143:146] if b['n']] != ['21']
            or [b['n'] for b in blocks[146:150] if b['n']] != ['22']
            or not blocks[145]['text'].endswith('Paṭhamaṃ.')
            or not blocks[149]['text'].endswith('Dutiyaṃ.')
            or blocks[145]['rend'] != 'bodytext'
            or any(b['rend'] != 'bodytext' for b in blocks[147:150])):
        raise ValueError('Unexpected Dasabala numbered bodies or terminals')
    prev, left, right, after = [selected[k] for k in ('sn12.20', *targets, 'sn12.23')]
    if ((prev['start'], prev['end'], prev['title']) != (132, 143, 'Paccayasuttaṃ')
            or (after['start'], after['end'], after['title']) != (150, 159, 'Upanisasuttaṃ')
            or right['title'] != 'Dutiyadasabalasuttaṃ' or right.get('approximate')
            or any(u.get('shares_passage_with') for u in selected.values())):
        raise ValueError('Unexpected Dasabala neighbours or titles')
    legacy = ((left['start'], left['end'], left['title'], left.get('approximate')) ==
              (132, 143, 'Dasabalasutta', True)
              and (right['start'], right['end']) == (143, 150)
              and not any('index_revision' in u for u in (left, right)))
    corrected = ((left['start'], left['end'], left['title']) == (143, 146, 'Dasabalasuttaṃ')
                 and (right['start'], right['end']) == (146, 150)
                 and 'approximate' not in left
                 and all(u.get('index_revision') == REVISION for u in (left, right)))
    if not (legacy or corrected):
        raise ValueError('Unexpected Dasabala index state; review required')
    if corrected:
        return []
    # All source, identity and state checks precede mutation.
    left.update(start=143, end=146, title='Dasabalasuttaṃ', index_revision=REVISION)
    left.pop('approximate', None)
    right.update(start=146, end=150, index_revision=REVISION)
    return list(targets)
