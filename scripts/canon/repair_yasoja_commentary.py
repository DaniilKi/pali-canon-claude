"""Integrate only the source-verified Yasoja opening from a Thag-a1 rebuild.

Usage: repair_yasoja_commentary.py COMMENTARY-IN REBUILT-THAG-A1 OUTPUT
The rebuild must use build_commentary.py, corrected canon, and pinned VRI XML.
No alignment algorithm or source text is modified here.
"""
import copy
import gzip
import json
import sys
from shared_spans import write_gzip

FILE = 's0508a1.att.xml'
COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
OPENING = (4941, 4962, 34, 243, 243, 11, 8, 'paragraph+lemma', 0, 4393)


def repair(original, rebuilt):
    if original['source'] != rebuilt['source'] or original['source']['commit'] != COMMIT:
        raise ValueError('Pinned commentary provenance differs')
    if len(rebuilt['books']) != 1 or rebuilt['books'][0]['file'] != FILE:
        raise ValueError('Expected exactly the rebuilt Thag-a1 source book')
    bi = next(i for i, b in enumerate(original['books']) if b['file'] == FILE)
    if original['books'][bi] != rebuilt['books'][0]:
        raise ValueError('Complete commentary source blocks differ')
    old = {tuple(p[1:]) for p in original['passages'] if p[0] == bi}
    fresh = {tuple(p[1:]) for p in rebuilt['passages']}
    if any(p[0] != 0 for p in rebuilt['passages']) or len(fresh) != len(rebuilt['passages']):
        raise ValueError('Invalid or duplicate rebuilt passage')
    if rebuilt['passages'] != sorted(rebuilt['passages'], key=lambda p: (p[1], p[2])):
        raise ValueError('Rebuilt passages are not in source order')
    if old - fresh or fresh - old not in (set(), {OPENING}) or OPENING not in fresh:
        raise ValueError('Rebuild changes more than the reviewed opening')
    # Compare ownership by passage identity, never by shifted global indexes.
    for uid in set(original['units']) | set(rebuilt['units']):
        before = {tuple(original['passages'][i][1:]) for i in original['units'].get(uid, [])
                  if original['passages'][i][0] == bi}
        after = {tuple(rebuilt['passages'][i][1:]) for i in rebuilt['units'].get(uid, [])}
        expected = before | ({OPENING} if uid == 'thag3.9' else set())
        if after != expected:
            raise ValueError(f'Unexpected commentary ownership change: {uid}')
    out = copy.deepcopy(original)
    # Insert in source order, remapping every existing numeric reference.
    passages = []
    inserted = False
    for p in original['passages']:
        if p[0] == bi:
            if not inserted:
                passages.extend([[bi, *p[1:]] for p in rebuilt['passages']])
                inserted = True
        else:
            passages.append(p)
    indexes = {tuple(p): i for i, p in enumerate(passages)}
    if len(indexes) != len(passages):
        raise ValueError('Duplicate global passage identity')
    out['passages'] = passages
    out['units'] = {uid: [indexes[tuple(original['passages'][i])] for i in refs]
                    for uid, refs in original['units'].items()}
    for uid, refs in rebuilt['units'].items():
        target = out['units'].setdefault(uid, [])
        target[:] = sorted(set(target) | {indexes[(bi, *rebuilt['passages'][i][1:])] for i in refs})
    return out


if __name__ == '__main__':
    if len(sys.argv) != 4 or len(set(sys.argv[1:])) != 3:
        raise SystemExit(__doc__)
    before, rebuilt = [json.load(gzip.open(p, 'rt', encoding='utf-8')) for p in sys.argv[1:3]]
    out = repair(before, rebuilt)
    write_gzip(sys.argv[3], out)
    print(json.dumps({'added_passages': len(out['passages']) - len(before['passages']),
                      'source_blocks_unchanged': out['books'] == before['books'],
                      'coverage_unchanged': out['coverage'] == before['coverage']}))
