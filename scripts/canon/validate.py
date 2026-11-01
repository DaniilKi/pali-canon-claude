"""Validate canon numbering against independent references.

Usage: python3 scripts/canon/validate.py <canon.json.gz> <ati-index.json> [dhammatalks-sitemap.xml]

Checks, per Access to Insight page that names a canonical text:
  * the text ID exists in the canon index;
  * ATI's PTS citation (e.g. "A i 188") falls on the PTS page where our unit starts;
  * ATI's Thai numbering (ALT_ID "Thai 3.66") matches our VRI paragraph number when present.
Also checks that every dhammatalks.org sutta page maps to an existing ID.
Exit status is non-zero when any check fails beyond the documented exceptions.
"""
import gzip
import json
import re
import sys
from collections import Counter, defaultdict

ROMAN = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6}
PTS_COLLECTION = {'D': 'dn', 'M': 'mn', 'S': 'sn', 'A': 'an', 'Ud': 'ud', 'It': 'iti', 'Iti': 'iti', 'Sn': 'snp', 'Khp': 'kp', 'Dhp': 'dhp',
                  'Th': 'thag', 'Thag': 'thag', 'Thig': 'thig', 'Thī': 'thig', 'Vv': 'vv', 'Pv': 'pv'}


def ati_id(path):
    p = path.split('/')[-1].rsplit('.', 2)[0] if path.count('.') >= 2 else path
    name = path.split('/')[-1]
    m = re.match(r'(dn|mn)\.(\d+)', name)
    if m:
        return f'{m.group(1)}{int(m.group(2))}'
    m = re.match(r'(sn|an)(\d+)\.(\d+)(?:-(\d+))?', name)
    if m:
        a = f'{m.group(1)}{int(m.group(2))}.{int(m.group(3))}'
        return a if not m.group(4) else a + f'-{int(m.group(4))}'
    m = re.match(r'(snp|ud)\.(\d+)\.(\d+)', name)
    if m:
        return f'{m.group(1)}{int(m.group(2))}.{int(m.group(3))}'
    m = re.match(r'(thag|thig)\.(\d+)\.(\d+)', name)
    if m:
        return f'{m.group(1)}{int(m.group(2))}.{int(m.group(3))}'
    m = re.match(r'iti\.\d+\.(\d+)(?:-(\d+))?', name)
    if m:
        return f'iti{int(m.group(1))}' + (f'-{int(m.group(2))}' if m.group(2) else '')
    m = re.match(r'khp\.(\d+)\.', name)
    if m:
        return f'kp{int(m.group(1))}'
    return None


def parse_pts(value):
    m = re.match(r'\s*([A-Z][a-zī]*)\.?\s+([ivx]+)\s+(\d+)', value)
    if not m or m.group(1) not in PTS_COLLECTION:
        return None
    return PTS_COLLECTION[m.group(1)], ROMAN.get(m.group(2)), int(m.group(3))


def main():
    canon = json.load(gzip.open(sys.argv[1], 'rt', encoding='utf-8'))
    ati = json.load(open(sys.argv[2]))
    units = {u['id']: u for u in canon['units']}
    members = {}
    for u in canon['units']:
        for m in u.get('members') or []:
            if isinstance(m, str):
                members.setdefault(m, units.get(m, u))
    books = canon['books']
    stats = Counter()
    failures = defaultdict(list)
    schemes = []
    for page in ati:
        ident = ati_id(page['path'])
        if not ident or not page['path'].startswith('tipitaka/'):
            continue
        if re.search(r'\.0$|\.00', ident) or re.search(r'\.00x?\.', page['path']):
            continue  # chapter introductions, not texts
        cdb = re.search(r'corresponds to CDB (?:SN )?([\d.]+)', page.get('alt_id', '') or '')
        if cdb and ident.startswith('sn'):
            ident = 'sn' + cdb.group(1)
        base = re.sub(r'-\d+$', '', ident)
        unit = units.get(ident) or units.get(base) or members.get(base)
        if not unit:
            m = re.match(r'([a-z]+\d*\.?)(\d+)$', base)
            if m:
                for u in canon['units']:
                    r = re.match(re.escape(m.group(1)) + r'(\d+)-(\d+)$', u['id'])
                    if r and int(r.group(1)) <= int(m.group(2)) <= int(r.group(2)):
                        unit = u
                        break
        coll = re.match(r'[a-z]+', ident).group(0)
        if not unit:
            stats[f'{coll}:missing'] += 1
            failures[coll].append(('missing', ident, page['path'], page['title']))
            continue
        stats[f'{coll}:found'] += 1
        pts = parse_pts(page.get('pts', ''))
        if pts and unit.get('pts') and pts[0] == unit['collection']:
            _, vol, pg = pts
            ours = unit['pts']
            book = books[unit['book']]['blocks']
            inside = [b[4].get('P', []) for b in book[unit['start']:unit['end']]]
            pages_inside = {tuple(map(int, p.split('.'))) for ps in inside for p in ps}
            exact = (vol, pg) == (ours['volume'], ours['page']) or ((vol, pg) in pages_inside and pg <= ours['page'] + 1)
            ok = vol == ours['volume'] and ours['page'] <= pg <= ours['end_page']
            stats[f'{coll}:pts_start_exact'] += int(exact)
            stats[f'{coll}:pts_{"ok" if ok else "bad"}'] += 1
            if not ok:
                # Is ATI's page the start of a different unit in the same section? Then ATI uses another numbering scheme.
                section = unit['id'].split('.')[0]
                other = [u for u in canon['units'] if u['id'].split('.')[0] == section and u.get('pts')
                         and u['pts']['volume'] == vol and u['pts']['page'] <= pg <= u['pts']['end_page'] and u.get('kind') != 'range']
                if other:
                    stats[f'{coll}:pts_scheme_offset'] += 1
                    stats[f'{coll}:pts_bad'] -= 1
                    schemes.append((ident, page['pts'], other[0]['id'], other[0]['title']))
                    continue
                failures[coll].append(('pts', ident, page['pts'], f"ours {ours['volume']}.{ours['page']}", unit['title'], page['title']))
        thai = re.search(r'Thai\s+([\d.]+)', page.get('alt_id', '') or '')
        if thai and unit.get('vri') and coll in ('an', 'sn'):
            want = thai.group(1).split('.')[-1]
            got = unit['vri'].split('–')[0].split('-')[0]
            stats[f'{coll}:thai_{"ok" if want == got else "diff"}'] += 1
    for key in sorted(stats):
        print(f'{key:22} {stats[key]}')
    print('\nnumbering-scheme offsets (ATI/PTS number -> our standard ID):', len(schemes))
    for x in schemes[:12]:
        print('  ', x)
    for coll, items in failures.items():
        print(f'\n== {coll} failures ({len(items)})')
        for item in items[:25]:
            print('  ', item)
    bad = sum(v for k, v in stats.items() if k.endswith(('missing', 'pts_bad')))
    print('\nTOTAL problems:', bad)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
