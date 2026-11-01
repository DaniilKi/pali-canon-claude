"""Map English translations on dhammatalks.org and Access to Insight to canon text IDs.

Usage: python3 scripts/canon/build_translations.py <canon.json.gz> <dt-index.json> <ati-index.json> <out.json>

Both sites number SN and AN (and parts of KN) by the older PTS scheme, which differs
from the standard IDs in places, so pages are matched by content: the Pāli title,
the PTS page (ATI) and number proximity. Each mapping records how it was matched.
"""
import gzip
import json
import re
import sys
import unicodedata

ORDINALS = re.compile(r'(pathama|dutiya|tatiya|catuttha|pancama|chattha|sattama|atthama|navama|dasama)')


def fold(text):
    text = unicodedata.normalize('NFD', text or '').lower()
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    text = text.replace('ṁ', 'm').replace('ṃ', 'm')
    text = re.sub(r'\(.*?\)', '', text)
    text = re.sub(r'(suttam|sutta|suttani|gatha|theragatha|therigatha|vatthu|vaggo|vagga|pali)', '', text)
    return re.sub(r'[^a-z]', '', text)


def base(title):
    return ORDINALS.sub('', fold(title))


def similar(a, b):
    a, b = fold(a), fold(b)
    if not a or not b or len(a) < 3 or len(b) < 3:
        return 0
    if a == b:
        return 3
    if ORDINALS.sub('', a) == ORDINALS.sub('', b):
        return 2
    if a in b or b in a:
        return 1
    return 0


def number_of(uid):
    m = re.search(r'(\d+)(?:-(\d+))?$', uid)
    return (int(m.group(1)), int(m.group(2) or m.group(1))) if m else None


def section_of(uid):
    m = re.match(r'^([a-z-]+\d*\.)', uid)
    return m.group(1) if m else re.match(r'^[a-z-]+', uid).group(0)


def main():
    canon = json.load(gzip.open(sys.argv[1], 'rt', encoding='utf-8'))
    dt = json.load(open(sys.argv[2]))
    ati = json.load(open(sys.argv[3]))
    units = [u for u in canon['units'] if not u.get('approximate')]
    by_id = {u['id']: u for u in canon['units']}
    by_section = {}
    for u in units:
        by_section.setdefault(section_of(u['id']), []).append(u)
    out = {}
    report = {'dhammatalks': {}, 'ati': {}}

    STABLE = ('dn', 'mn', 'iti', 'kp', 'ud', 'snp', 'thag', 'thig')   # numbering identical across these schemes

    def number_ok(section):
        return re.match(r'[a-z]+', section).group(0) in STABLE

    def near(section, n, window=40):
        return [u for u in by_section.get(section, []) if u.get('kind') != 'range'
                and number_of(u['id']) and abs(number_of(u['id'])[0] - n) <= window]

    def choose(section, n, title, pts=None, bridge=None):
        exact = by_id.get(f'{section}{n}')
        if exact is not None and exact.get('kind') == 'range':
            exact = None
        if exact is not None and title and similar(title, exact.get('title', '')):
            return exact, 'number+title'
        if pts:
            vol, pg = pts
            starts = [u for u in near(section, n, 60) if u.get('pts') and u['pts']['volume'] == vol and u['pts']['page'] == pg]
            inside = [u for u in near(section, n, 60) if u.get('pts') and u['pts']['volume'] == vol and u['pts']['page'] <= pg <= u['pts']['end_page']]
            for pool, why in ((starts, 'pts-start'), (inside, 'pts')):
                if not pool:
                    continue
                titled = [u for u in pool if title and similar(title, u.get('title', ''))]
                if titled:
                    return min(titled, key=lambda u: abs(number_of(u['id'])[0] - n)), why + '+title'
                if exact in pool:
                    return exact, why + '+number'
                if len(pool) == 1:
                    return pool[0], why
        if bridge and title:
            for uid, other_title in bridge.get(section, []):
                if similar(title, other_title) >= 2 and abs(number_of(uid)[0] - n) <= 6:
                    return by_id[uid], 'ati-title'
        if title:
            scored = [(-similar(title, u.get('title', '')), abs(number_of(u['id'])[0] - n), u) for u in near(section, n)]
            scored = [x for x in scored if x[0] < 0]
            if scored:
                scored.sort(key=lambda x: (x[0], x[1]))
                return scored[0][2], 'title'
        if exact is not None and number_ok(section):
            return exact, 'number'
        return None, None

    def offset_fill(pending, matched):
        """For unmatched SN/AN pages, infer the numbering offset from matched neighbours on both sides."""
        filled = []
        for section, n, entry in pending:
            lower = [(m, k) for (sec, m, k) in matched if sec == section and m < n]
            upper = [(m, k) for (sec, m, k) in matched if sec == section and m > n]
            if not lower or not upper:
                continue
            lo, hi = max(lower), min(upper)
            if lo[1] == hi[1] and hi[0] - lo[0] <= 12:
                uid = f'{section}{n + lo[1]}'
                if uid in by_id and by_id[uid].get('kind') != 'range':
                    filled.append((uid, dict(entry, match='neighbour-offset')))
        return filled

    def add(uid, entry):
        out.setdefault(uid, []).append(entry)

    bridge, ati_matched, ati_pending, dt_matched, dt_pending = {}, [], [], [], []
    # ---- Access to Insight ----
    roman = {'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5, 'vi': 6}
    for page in ati:
        path = page['path']
        name = path.split('/')[-1]
        if not path.startswith('tipitaka/') or re.search(r'\.00x?\.', name) or '/sltp/' in path:
            continue
        m = (re.match(r'(dn|mn)\.(\d+)', name) or re.match(r'(sn|an)(\d+)\.(\d+)', name) or re.match(r'(ud|snp)\.(\d+)\.(\d+)', name)
             or re.match(r'(thag|thig)\.(\d+)\.(\d+)', name) or re.match(r'(iti)\.\d+\.(\d+)', name) or re.match(r'(khp)\.(\d+)\.', name)
             or re.match(r'(dhp)\.(\d+)\.', name))
        if not m:
            continue
        coll = {'khp': 'kp'}.get(m.group(1), m.group(1))
        title = (page.get('html_title') or '').split(':')[0]
        pts = None
        pm = re.match(r'\s*[A-Z][a-zī]*\.?\s+([ivx]+)\s+(\d+)', page.get('pts') or '')
        if pm and pm.group(1) in roman:
            pts = (roman[pm.group(1)], int(pm.group(2)))
        entry = {'source': 'ati', 'path': '/' + path.rsplit('.html', 1)[0], 'url': 'https://www.accesstoinsight.org/' + path,
                 'translator': page.get('author') or page.get('author_short') or '', 'license': page.get('license', ''),
                 'reference': page.get('pts', '')}
        if coll == 'dhp':
            vaggas = sorted([u for u in canon['units'] if u['collection'] == 'dhp' and u.get('kind') == 'range'],
                            key=lambda u: number_of(u['id'])[0])
            k = int(m.group(2))
            if 1 <= k <= len(vaggas):
                add(vaggas[k - 1]['id'], dict(entry, match='chapter'))
            continue
        if m.lastindex == 3:
            section, n = f'{coll}{int(m.group(2))}.', int(m.group(3))
        else:
            section, n = coll, int(m.group(2))
        cdb = re.search(r'corresponds to CDB (?:SN )?([\d.]+)', page.get('alt_id') or '')
        if cdb and coll == 'sn':
            s, _, k = cdb.group(1).partition('.')
            section, n = f'sn{int(s)}.', int(k)
        unit, why = choose(section, n, title, pts)
        report['ati'][why or 'unmatched'] = report['ati'].get(why or 'unmatched', 0) + 1
        if unit:
            add(unit['id'], dict(entry, match=why))
            bridge.setdefault(section, []).append((unit['id'], title))
            if section.endswith('.'):
                ati_matched.append((section, n, number_of(unit['id'])[0] - n))
        elif section.endswith('.'):
            ati_pending.append((section, n, entry))
    # ---- dhammatalks.org (Ṭhānissaro Bhikkhu) ----
    for page in dt:
        if 'error' in page:
            continue
        path = page['url'].split('/suttas/')[1]
        parts = page['title'].split(' | ')
        ref = parts[0]
        pali = parts[1] if len(parts) > 2 else ''
        m = (re.match(r'(DN|MN)/\1(\d+)\.html', path) or re.match(r'(SN|AN)/\1(\d+)_(\d+)\.html', path)
             or re.match(r'KN/(Ud)/ud(\d+)_(\d+)\.html', path) or re.match(r'KN/(StNp)/StNp(\d+)_(\d+)\.html', path)
             or re.match(r'KN/(Thag|Thig)/\w+?(\d+)_(\d+)\.html', path) or re.match(r'KN/(Thag|Thig)/\w+?(\d+)\.html', path)
             or re.match(r'KN/(Iti)/iti(\d+)\.html', path) or re.match(r'KN/(Khp)/khp(\d+)\.html', path)
             or re.match(r'KN/(Dhp)/Ch(\d+)\.html', path) or re.match(r'(SN)/SN(\d+)\.html', path))
        if not m:
            continue
        coll = {'StNp': 'snp', 'Khp': 'kp'}.get(m.group(1), m.group(1).lower())
        if coll in ('thag', 'thig') and m.lastindex == 2:
            # thag11.html: a single-poem nipāta → thag11.1
            section, n, title = f'{coll}{m.group(2)}.', 1, re.sub(r'^\w+ [\d:]+ ', '', ref)
        elif coll == 'dhp':
            vaggas = sorted([u for u in canon['units'] if u['collection'] == 'dhp' and u.get('kind') == 'range'],
                            key=lambda u: number_of(u['id'])[0])
            k = int(m.group(2))
            if 1 <= k <= len(vaggas):
                add(vaggas[k - 1]['id'], {'source': 'dhammatalks', 'url': page['url'], 'translator': 'Ṭhānissaro Bhikkhu', 'reference': ref, 'match': 'chapter'})
                report['dhammatalks']['chapter'] = report['dhammatalks'].get('chapter', 0) + 1
            continue
        elif coll == 'sn' and m.lastindex == 2:
            section, n, title = 'sn', int(m.group(2)), pali   # whole-saṃyutta page (SN 43, 44)
            uid = f'sn{n}.1'
            if uid in by_id:
                add(uid, {'source': 'dhammatalks', 'url': page['url'], 'translator': 'Ṭhānissaro Bhikkhu', 'reference': ref,
                          'match': 'whole-samyutta', 'covers': f'SN {n}'})
            continue
        elif m.lastindex == 3:
            section, n, title = f'{coll}{int(m.group(2))}.', int(m.group(3)), pali
        else:
            section, n, title = coll, int(m.group(2)), pali
        if coll in ('thag', 'thig') and not title:
            title = re.sub(r'^\w+ [\d:]+ ', '', ref)
        unit, why = choose(section, n, title, bridge=bridge)
        entry = {'source': 'dhammatalks', 'url': page['url'], 'translator': 'Ṭhānissaro Bhikkhu', 'reference': ref}
        report['dhammatalks'][why or 'unmatched'] = report['dhammatalks'].get(why or 'unmatched', 0) + 1
        if unit:
            add(unit['id'], dict(entry, match=why))
            if section.endswith('.'):
                dt_matched.append((section, n, number_of(unit['id'])[0] - n))
        elif section.endswith('.'):
            dt_pending.append((section, n, entry))

    for uid, entry in offset_fill(ati_pending, ati_matched) + offset_fill(dt_pending, dt_matched):
        add(uid, entry)
        report[entry['source']]['neighbour-offset'] = report[entry['source']].get('neighbour-offset', 0) + 1
    json.dump(out, open(sys.argv[4], 'w'), ensure_ascii=False, separators=(',', ':'))
    print(json.dumps(report, indent=1))
    print('texts with translations:', len(out), 'links:', sum(len(v) for v in out.values()))


if __name__ == '__main__':
    main()
