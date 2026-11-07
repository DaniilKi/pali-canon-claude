"""Use explicit, title-verified VRI story headings in Vv/Pv, not verse anchors.

Verse anchors can select the second verse of a dialogue. Restrict this repair to
the two books whose complete story headings match the existing citation titles.
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
    # Validate both books before mutating anything.
    for u, start, end in plans:
        if (u['start'], u['end']) != (start, end):
            changed.append(u['id'])
            u.update(start=start, end=end)
    return changed
