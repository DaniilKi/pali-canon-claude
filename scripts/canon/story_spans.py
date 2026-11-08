"""Use title-verified VRI story headings and the reviewed Yasoja boundary.

Verse anchors can select the second verse of a dialogue. Restrict this repair to
the two complete story books and separately reviewed adjacent Thag pairs.
Never guess by a paragraph or story number (the headings restart by chapter).
"""
import re

# Existing citation titles differ from the pinned VRI headings in these three
# documented cases. Keep the public titles; require the exact pair, not a fuzzy
# match that could silently move a citation to a different story.
TITLE_PAIRS = {
    'vv33': ('Guttilavimānavatthu', 'Guttilavimānaṃ'),
    'pv13': ('Saṁsāramocakapetivatthu', 'Saṃsāramocakapetivatthu'),
    'pv31': ('Seriṇīpetivatthu', 'Seriṇīpetavatthu'),
}


def story_spans(books, units):
    changed = []
    plans = []
    mapping_revisions = {}
    for collection, filename in [('vv', 's0506m.mul.xml'), ('pv', 's0507m.mul.xml')]:
        indexes = [i for i, book in enumerate(books) if book['file'] == filename]
        if not indexes:
            continue
        if len(indexes) != 1:
            raise ValueError(f'Duplicate story book: {filename}')
        bi = indexes[0]
        blocks = books[bi]['blocks']
        stories = sorted((u for u in units if u['book'] == bi),
                         key=lambda u: int(u['id'][len(collection):]))
        heads = [(i, re.sub(r'^\d+\.\s*', '', b['text']))
                 for i, b in enumerate(blocks) if b['rend'] == 'subhead']
        if len(stories) != len(heads):
            raise ValueError(f'Story/heading count differs: {filename}')
        for n, (u, (start, title)) in enumerate(zip(stories, heads), 1):
            if u['id'] != f'{collection}{n}' or u.get('approximate') or u.get('kind'):
                raise ValueError(f'Unexpected story identity: {u["id"]}')
            if u.get('title') != title and TITLE_PAIRS.get(u['id']) != (u.get('title'), title):
                raise ValueError(f'Story title differs: {u["id"]}: {title}')
            end = heads[n][0] if n < len(heads) else len(blocks)
            if not any(b['n'] and b['rend'] == 'hangnum' for b in blocks[start:end]):
                raise ValueError(f'No numbered verse in {u["id"]}')
            plans.append((u, start, end))
    thag = [i for i, book in enumerate(books) if book['file'] == 's0508m.mul.xml']
    if thag:
        if len(thag) != 1:
            raise ValueError('Duplicate Theragāthā book')
        bi = thag[0]
        blocks = books[bi]['blocks']
        by_id = {u['id']: u for u in units if u['book'] == bi}
        left, right = by_id.get('thag3.8'), by_id.get('thag3.9')
        if (not left or not right or left.get('approximate') or right.get('approximate')
                or left.get('kind') or right.get('kind')):
            raise ValueError('Missing or approximate Vassika/Yasoja identity')
        def head(title):
            found = [i for i, b in enumerate(blocks) if b['rend'] == 'subhead' and b['text'] == title]
            if len(found) != 1:
                raise ValueError(f'Expected unique heading: {title}')
            return found[0]
        start = head('8. Vassikattheragāthā')
        split = head('9. Yasojattheragāthā')
        end = head('10. Sāṭimattiyattheragāthā')
        if (left['title'] != 'Vassikattheragāthā' or right['title'] != 'Yasojattheragāthā'
                or left['start'] != start or right['end'] != end
                or left['end'] != right['start'] or not start < split <= right['start'] < end):
            raise ValueError('Unexpected Vassika/Yasoja bounds; review required')
        if [b['n'] for b in blocks[start:split] if b['rend'] == 'hangnum'] != ['240', '241', '242']:
            raise ValueError('Unexpected Vassika verse scope')
        if [b['n'] for b in blocks[split:end] if b['rend'] == 'hangnum'] != ['243', '244', '245']:
            raise ValueError('Unexpected Yasoja verse scope')
        plans.extend([(left, start, split), (right, split, end)])
        # Heraññakāni ends before Somamitta's heading, not at his second verse.
        left, right = by_id.get('thag2.13'), by_id.get('thag2.14')
        if left or right:
            if (not left or not right or left.get('approximate') or right.get('approximate')
                    or left.get('kind') or right.get('kind')):
                raise ValueError('Missing or approximate Herannakani/Somamitta identity')
            start = head('3. Heraññakānittheragāthā')
            split = head('4. Somamittattheragāthā')
            end = head('5. Sabbamittattheragāthā')
            if (left['title'] != 'Heraññakānittheragāthā' or right['title'] != 'Somamittattheragāthā'
                    or left['start'] != start or right['end'] != end
                    or left['end'] != right['start'] or not start < split <= right['start'] < end):
                raise ValueError('Unexpected Herannakani/Somamitta bounds; review required')
            if [b['n'] for b in blocks[start:split] if b['rend'] == 'hangnum'] != ['145', '146']:
                raise ValueError('Unexpected Herannakani verse scope')
            if [b['n'] for b in blocks[split:end] if b['rend'] == 'hangnum'] != ['147', '148']:
                raise ValueError('Unexpected Somamitta verse scope')
            plans.extend([(left, start, split), (right, split, end)])
            mapping_revisions.update({left['id']: 'thag-pair-v1', right['id']: 'thag-pair-v1'})
    # Validate all reviewed books before mutating anything.
    for u, start, end in plans:
        revision = mapping_revisions.get(u['id'])
        if (u['start'], u['end']) != (start, end) or (revision and u.get('index_revision') != revision):
            changed.append(u['id'])
            u.update(start=start, end=end)
            if revision:
                u['index_revision'] = revision
    return changed
