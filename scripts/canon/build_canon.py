"""Build the bundled Pāli canon index from a VRI tipitaka-xml checkout.

Usage: python3 scripts/canon/build_canon.py <tipitaka-xml checkout> <commit sha> [out.json.gz]

Every text unit records:
  id        citation ID in the common scholarly scheme (mn10, sn56.11, an3.65, dhp1, thag1.1 …)
  file      VRI book file, blocks [start, end) inside it
  title     the VRI heading
  pts       PTS volume.page in effect where the unit starts (from VRI <pb ed="P">)
  vri       VRI paragraph number(s) covered
  members   for abbreviated (peyyāla) groups, the first and last sutta numbers covered
Numbering rules are per collection and are validated against independent
references (Access to Insight, dhammatalks.org) by scripts/canon/validate.py.
"""
import gzip
import json
import os
import re
import sys
from collections import OrderedDict

sys.path.insert(0, os.path.dirname(__file__))
import vri  # noqa: E402

BOOKS = OrderedDict([
    # file: (collection, pitaka)
    ('vin01m.mul.xml', ('vin-pj', 'vinaya')), ('vin02m1.mul.xml', ('vin-pc', 'vinaya')),
    ('vin02m2.mul.xml', ('vin-mv', 'vinaya')), ('vin02m3.mul.xml', ('vin-cv', 'vinaya')),
    ('vin02m4.mul.xml', ('vin-pvr', 'vinaya')),
    ('s0101m.mul.xml', ('dn', 'sutta')), ('s0102m.mul.xml', ('dn', 'sutta')), ('s0103m.mul.xml', ('dn', 'sutta')),
    ('s0201m.mul.xml', ('mn', 'sutta')), ('s0202m.mul.xml', ('mn', 'sutta')), ('s0203m.mul.xml', ('mn', 'sutta')),
    ('s0301m.mul.xml', ('sn', 'sutta')), ('s0302m.mul.xml', ('sn', 'sutta')), ('s0303m.mul.xml', ('sn', 'sutta')),
    ('s0304m.mul.xml', ('sn', 'sutta')), ('s0305m.mul.xml', ('sn', 'sutta')),
    ('s0401m.mul.xml', ('an', 'sutta')), ('s0402m1.mul.xml', ('an', 'sutta')), ('s0402m2.mul.xml', ('an', 'sutta')),
    ('s0402m3.mul.xml', ('an', 'sutta')), ('s0403m1.mul.xml', ('an', 'sutta')), ('s0403m2.mul.xml', ('an', 'sutta')),
    ('s0403m3.mul.xml', ('an', 'sutta')), ('s0404m1.mul.xml', ('an', 'sutta')), ('s0404m2.mul.xml', ('an', 'sutta')),
    ('s0404m3.mul.xml', ('an', 'sutta')), ('s0404m4.mul.xml', ('an', 'sutta')),
    ('s0501m.mul.xml', ('kp', 'sutta')), ('s0502m.mul.xml', ('dhp', 'sutta')), ('s0503m.mul.xml', ('ud', 'sutta')),
    ('s0504m.mul.xml', ('iti', 'sutta')), ('s0505m.mul.xml', ('snp', 'sutta')), ('s0506m.mul.xml', ('vv', 'sutta')),
    ('s0507m.mul.xml', ('pv', 'sutta')), ('s0508m.mul.xml', ('thag', 'sutta')), ('s0509m.mul.xml', ('thig', 'sutta')),
    ('s0510m1.mul.xml', ('ap', 'sutta')), ('s0510m2.mul.xml', ('ap', 'sutta')), ('s0511m.mul.xml', ('bv', 'sutta')),
    ('s0512m.mul.xml', ('cp', 'sutta')), ('s0513m.mul.xml', ('ja', 'sutta')), ('s0514m.mul.xml', ('ja', 'sutta')),
    ('s0515m.mul.xml', ('mnd', 'sutta')), ('s0516m.mul.xml', ('cnd', 'sutta')), ('s0517m.mul.xml', ('ps', 'sutta')),
    ('s0518m.nrf.xml', ('mil', 'sutta')), ('s0519m.mul.xml', ('ne', 'sutta')), ('s0520m.nrf.xml', ('pe', 'sutta')),
    ('abh01m.mul.xml', ('ds', 'abhidhamma')), ('abh02m.mul.xml', ('vb', 'abhidhamma')),
    ('abh03m1.mul.xml', ('dt', 'abhidhamma')), ('abh03m2.mul.xml', ('pp', 'abhidhamma')),
    ('abh03m3.mul.xml', ('kv', 'abhidhamma')),
    ('abh03m4.mul.xml', ('ya', 'abhidhamma')), ('abh03m5.mul.xml', ('ya', 'abhidhamma')), ('abh03m6.mul.xml', ('ya', 'abhidhamma')),
    ('abh03m7.mul.xml', ('patthana', 'abhidhamma')), ('abh03m8.mul.xml', ('patthana', 'abhidhamma')),
    ('abh03m9.mul.xml', ('patthana', 'abhidhamma')), ('abh03m10.mul.xml', ('patthana', 'abhidhamma')),
    ('abh03m11.mul.xml', ('patthana', 'abhidhamma')),
])

ACRONYM = {
    'dn': 'DN', 'mn': 'MN', 'sn': 'SN', 'an': 'AN', 'kp': 'Kp', 'dhp': 'Dhp', 'ud': 'Ud', 'iti': 'Iti', 'snp': 'Snp',
    'vv': 'Vv', 'pv': 'Pv', 'thag': 'Thag', 'thig': 'Thig', 'ap': 'Ap', 'bv': 'Bv', 'cp': 'Cp', 'ja': 'Ja',
    'mnd': 'Mnd', 'cnd': 'Cnd', 'ps': 'Ps', 'mil': 'Mil', 'ne': 'Ne', 'pe': 'Pe',
    'vin-pj': 'Vin Pj', 'vin-pc': 'Vin Pc', 'vin-mv': 'Vin Mv', 'vin-cv': 'Vin Cv', 'vin-pvr': 'Vin Pvr',
    'ds': 'Ds', 'vb': 'Vb', 'dt': 'Dt', 'pp': 'Pp', 'kv': 'Kv', 'ya': 'Ya', 'patthana': 'Paṭṭh',
}
NAME = {
    'dn': 'Dīgha Nikāya', 'mn': 'Majjhima Nikāya', 'sn': 'Saṃyutta Nikāya', 'an': 'Aṅguttara Nikāya',
    'kp': 'Khuddakapāṭha', 'dhp': 'Dhammapada', 'ud': 'Udāna', 'iti': 'Itivuttaka', 'snp': 'Suttanipāta',
    'vv': 'Vimānavatthu', 'pv': 'Petavatthu', 'thag': 'Theragāthā', 'thig': 'Therīgāthā', 'ap': 'Apadāna',
    'bv': 'Buddhavaṃsa', 'cp': 'Cariyāpiṭaka', 'ja': 'Jātaka', 'mnd': 'Mahāniddesa', 'cnd': 'Cūḷaniddesa',
    'ps': 'Paṭisambhidāmagga', 'mil': 'Milindapañha', 'ne': 'Nettippakaraṇa', 'pe': 'Peṭakopadesa',
    'vin-pj': 'Vinaya: Pārājikapāḷi', 'vin-pc': 'Vinaya: Pācittiyapāḷi', 'vin-mv': 'Vinaya: Mahāvagga',
    'vin-cv': 'Vinaya: Cūḷavagga', 'vin-pvr': 'Vinaya: Parivāra',
    'ds': 'Dhammasaṅgaṇī', 'vb': 'Vibhaṅga', 'dt': 'Dhātukathā', 'pp': 'Puggalapaññatti', 'kv': 'Kathāvatthu',
    'ya': 'Yamaka', 'patthana': 'Paṭṭhāna',
}
# PTS abbreviation used in "PTS: M i 55" style citations, per collection.
PTS_ABBR = {
    'dn': 'D', 'mn': 'M', 'sn': 'S', 'an': 'A', 'kp': 'Khp', 'dhp': 'Dhp', 'ud': 'Ud', 'iti': 'It', 'snp': 'Sn',
    'vv': 'Vv', 'pv': 'Pv', 'thag': 'Th', 'thig': 'Thī', 'ap': 'Ap', 'bv': 'Bv', 'cp': 'Cp', 'ja': 'Ja',
    'mnd': 'Nidd I', 'cnd': 'Nidd II', 'ps': 'Paṭis', 'mil': 'Mil', 'ne': 'Nett', 'pe': 'Peṭ',
    'vin-pj': 'Vin', 'vin-pc': 'Vin', 'vin-mv': 'Vin', 'vin-cv': 'Vin', 'vin-pvr': 'Vin',
    'ds': 'Dhs', 'vb': 'Vibh', 'dt': 'Dhātuk', 'pp': 'Pp', 'kv': 'Kv', 'ya': 'Yam', 'patthana': 'Paṭṭh',
}
# PTS Vinaya volumes: Mahāvagga I, Cūḷavagga II, Suttavibhaṅga III–IV, Parivāra V.
VIN_PTS_VOLUME = {'vin-mv': 1, 'vin-cv': 2, 'vin-pj': 3, 'vin-pc': 4, 'vin-pvr': 5}

ROMAN = {1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v', 6: 'vi'}


def numbered_subhead(block):
    return block['rend'] == 'subhead' and vri.label(block['text'])


def div_of(block, kind):
    for d in reversed(block['divs']):
        if d['type'] == kind:
            return d
    return None


class Builder:
    def __init__(self, root):
        self.root = root
        self.books = []      # {file, collection, pitaka, title, blocks}
        self.units = []

    def load(self):
        for file, (collection, pitaka) in BOOKS.items():
            blocks = vri.parse(os.path.join(self.root, 'romn', file))
            book_title = next((b['text'] for b in blocks if b['rend'] == 'book'), NAME.get(collection, file))
            self.books.append({'file': file, 'collection': collection, 'pitaka': pitaka, 'title': book_title, 'blocks': blocks})

    # -- shared helpers -------------------------------------------------
    def add(self, book_index, collection, number, start, end, title, members=None, extra=None):
        book = self.books[book_index]
        blocks = book['blocks'][start:end]
        paras = [b['n'] for b in blocks if b['n']]
        unit = OrderedDict(
            id=f'{collection}{number}', collection=collection, number=str(number),
            acronym=f"{ACRONYM[collection]} {number}", title=title, book=book_index,
            start=start, end=end,
            vri=(paras[0] if len(paras) == 1 else f"{paras[0].split('-')[0]}–{paras[-1].split('-')[-1]}") if paras else None,
        )
        if members:
            unit['members'] = members
        if extra:
            unit.update(extra)
        self.units.append(unit)
        return unit

    def split_at(self, blocks, starts):
        """Turn sorted start indexes into (start, end) spans bounded by the next start or a parent boundary."""
        spans = []
        for i, s in enumerate(starts):
            e = starts[i + 1] if i + 1 < len(starts) else len(blocks)
            spans.append((s, e))
        return spans

    def heading_runs(self, book_index, predicate, boundary=None):
        """Indexes of numbered subheads matching predicate; spans end at the next subhead or boundary block."""
        blocks = self.books[book_index]['blocks']
        starts = [i for i, b in enumerate(blocks) if numbered_subhead(b) and predicate(i, b)]
        stops = set(boundary or [])
        spans = []
        for k, s in enumerate(starts):
            e = starts[k + 1] if k + 1 < len(starts) else len(blocks)
            for j in range(s + 1, e):
                if j in stops:
                    e = j
                    break
            spans.append((s, e))
        return spans

    def container_starts(self, book_index, kind):
        blocks = self.books[book_index]['blocks']
        out, last = [], None
        for i, b in enumerate(blocks):
            d = div_of(b, kind)
            ident = d['id'] if d else None
            if ident and ident != last:
                out.append(i)
            last = ident
        return out

    # -- collections ------------------------------------------------------
    def build(self):
        by_collection = OrderedDict()
        for i, book in enumerate(self.books):
            by_collection.setdefault(book['collection'], []).append(i)
        for collection, indexes in by_collection.items():
            getattr(self, f'build_{collection.replace("-", "_")}', self.build_chapters)(collection, indexes)

    def build_dn(self, collection, indexes):
        n = 0
        for bi in indexes:
            blocks = self.books[bi]['blocks']
            starts = self.container_starts(bi, 'sutta')
            for s, e in self.split_at(blocks, starts):
                n += 1
                d = div_of(blocks[s], 'sutta')
                self.add(bi, collection, n, s, e, d['title'] if d else blocks[s]['text'])

    def sequential_subheads(self, collection, indexes, restart=None, number_format=None):
        """Number every numbered subhead cumulatively; restart(block) names a container that resets the count."""
        counter, current = 0, None
        for bi in indexes:
            blocks = self.books[bi]['blocks']
            for s, e in self.heading_runs(bi, lambda i, b: True):
                key = restart(blocks[s]) if restart else None
                if key != current:
                    counter, current = 0, key
                a, z, title = vri.label(blocks[s]['text'])
                first, last = counter + 1, counter + (z - a + 1)
                counter = last
                number = number_format(key, first, last) if number_format else (f'{first}' if first == last else f'{first}-{last}')
                members = [first, last] if last > first else None
                self.add(bi, collection, number, s, e, title, members, {'group': key} if key is not None else None)

    def build_mn(self, collection, indexes):
        self.sequential_subheads(collection, indexes)

    def build_sn(self, collection, indexes):
        samyutta = {'n': 0, 'id': None}

        def key(block):
            d = div_of(block, 'samyutta')
            return d['id'] if d else None
        order = {}
        for bi in indexes:
            for b in self.books[bi]['blocks']:
                k = key(b)
                if k and k not in order:
                    order[k] = len(order) + 1

        def fmt(k, first, last):
            s = order[k]
            return f'{s}.{first}' if first == last else f'{s}.{first}-{last}'
        self.sequential_subheads(collection, indexes, restart=key, number_format=fmt)

    def build_an(self, collection, indexes):
        for bi in indexes:
            blocks = self.books[bi]['blocks']
            nipata = int(re.sub(r'\D', '', next(d['id'] for b in blocks for d in b['divs'] if d['type'] == 'book')))
            runs = self.heading_runs(bi, lambda i, b: not re.search(r'vaggo$', vri.label(b['text'])[2]))
            if nipata == 1 or not runs:
                # Ekakanipāta has no sutta headings: VRI numbers each sutta as a paragraph.
                starts = [i for i, b in enumerate(blocks) if b['n'] and b['rend'] in ('bodytext', 'hangnum')]
                for s, e in self.split_at(blocks, starts):
                    a, _, z = blocks[s]['n'].partition('-')
                    number = f'{nipata}.{a}' if not z else f'{nipata}.{a}-{z}'
                    v = div_of(blocks[s], 'vagga') or div_of(blocks[s], 'peyyala')
                    self.add(bi, collection, number, s, e, v['title'] if v else '', [int(a), int(z)] if z else None,
                             {'numbering': 'vri-paragraph'})
                continue
            counter = 0
            for s, e in runs:
                a, z, title = vri.label(blocks[s]['text'])
                # Peyyāla paragraphs with a range number and no heading belong to the same run.
                first, last = counter + 1, counter + (z - a + 1)
                para_ranges = [b['n'] for b in blocks[s:e] if b['n'] and '-' in b['n']]
                counter = last
                number = f'{nipata}.{first}' if first == last else f'{nipata}.{first}-{last}'
                self.add(bi, collection, number, s, e, title, [first, last] if last > first else None)
                # Abbreviated sections after the last heading: VRI paragraph ranges such as 304-783.
            tail_start = runs[-1][1]
            starts = [i for i in range(tail_start, len(blocks)) if blocks[i]['n']]
            for s, e in self.split_at(blocks[:len(blocks)], starts):
                a, _, z = blocks[s]['n'].partition('-')
                number = f'{nipata}.{a}' if not z else f'{nipata}.{a}-{z}'
                p = div_of(blocks[s], 'peyyala') or div_of(blocks[s], 'vagga')
                self.add(bi, collection, number, s, e, p['title'] if p else '', [int(a), int(z or a)] if z else None,
                         {'numbering': 'vri-paragraph'})

    def build_kp(self, collection, indexes):
        for bi in indexes:
            blocks = self.books[bi]['blocks']
            for k, (s, e) in enumerate(self.split_at(blocks, self.container_starts(bi, 'chapter')), 1):
                self.add(bi, collection, k, s, e, re.sub(r'^\d+\.\s*', '', div_of(blocks[s], 'chapter')['title']))

    def build_dhp(self, collection, indexes):
        for bi in indexes:
            blocks = self.books[bi]['blocks']
            starts = [i for i, b in enumerate(blocks) if b['rend'] == 'hangnum' and b['n']]
            for s, e in self.split_at(blocks, starts):
                v = div_of(blocks[s], 'vagga')
                self.add(bi, collection, blocks[s]['n'], s, e, v['title'] if v else '')
            # Chapter ranges such as dhp1-20 for the 26 vaggas.
            for vs, ve in self.split_at(blocks, self.container_starts(bi, 'vagga')):
                ns = [int(b['n']) for b in blocks[vs:ve] if b['rend'] == 'hangnum' and b['n']]
                self.add(bi, collection, f'{ns[0]}-{ns[-1]}', vs, ve, div_of(blocks[vs], 'vagga')['title'],
                         [ns[0], ns[-1]], {'kind': 'chapter'})

    def vagga_dot_sutta(self, collection, indexes, kind):
        for bi in indexes:
            blocks = self.books[bi]['blocks']
            containers = {}
            for s, e in self.heading_runs(bi, lambda i, b: True):
                d = div_of(blocks[s], kind)
                if not d:
                    continue
                v = containers.setdefault(d['id'], {'n': len(containers) + 1, 'count': 0})
                a, z, title = vri.label(blocks[s]['text'])
                first, last = v['count'] + 1, v['count'] + (z - a + 1)
                v['count'] = last
                number = f"{v['n']}.{first}" if first == last else f"{v['n']}.{first}-{last}"
                self.add(bi, collection, number, s, e, title, [first, last] if last > first else None)

    def build_ud(self, collection, indexes):
        self.vagga_dot_sutta(collection, indexes, 'vagga')

    def build_snp(self, collection, indexes):
        self.vagga_dot_sutta(collection, indexes, 'vagga')

    def build_thag(self, collection, indexes):
        self.vagga_dot_sutta(collection, indexes, 'nipata')

    def build_thig(self, collection, indexes):
        self.vagga_dot_sutta(collection, indexes, 'nipata')

    def build_iti(self, collection, indexes):
        self.sequential_subheads(collection, indexes)

    def build_vv(self, collection, indexes):
        self.sequential_subheads(collection, indexes)

    def build_pv(self, collection, indexes):
        self.sequential_subheads(collection, indexes)

    def build_ja(self, collection, indexes):
        self.sequential_subheads(collection, indexes)

    def build_chapters(self, collection, indexes):
        """Books without a common sutta numbering: number top-level divisions, then numbered sections within them."""
        k = 0
        for bi in indexes:
            blocks = self.books[bi]['blocks']
            top = None
            for kind in ('kanda', 'khandaka', 'chapter', 'vagga', 'nipata', 'vimana', 'pannasaka', 'book'):
                if self.container_starts(bi, kind):
                    top = kind
                    break
            starts = self.container_starts(bi, top) if top and top != 'book' else [0]
            for s, e in self.split_at(blocks, starts):
                k += 1
                d = div_of(blocks[s], top) if top else None
                title = d['title'] if d else self.books[bi]['title']
                self.add(bi, collection, k, s, e, title, extra={'kind': 'division', 'division_type': top or 'book'})

    # -- page references ----------------------------------------------------
    def annotate_pages(self):
        for bi, book in enumerate(self.books):
            current = {}
            at = []
            for b in book['blocks']:
                at.append(dict(current))
                for ed, pages in b['pages'].items():
                    current[ed] = pages[-1]
            book['page_at_start'] = at
        for u in self.units:
            book = self.books[u['book']]
            blocks = book['blocks'][u['start']:u['end']]
            carried = book['page_at_start'][u['start']].get('P')
            first_body = next((b for b in blocks if b['rend'] not in HEADINGS), None)
            opening = first_body['pages'].get('P') if first_body else None
            first_inside = next((b['pages']['P'][0] for b in blocks if b['pages'].get('P')), None)
            opening_offset = first_body['page_offsets'].get('P', [10 ** 6])[0] if opening else 10 ** 6
            if opening and (opening_offset <= 12 or not carried):
                start_page = opening[0]          # page break within the opening words: the text starts on that page
            elif carried and (not first_inside or carried[0] == first_inside[0]):
                start_page = carried
            else:
                start_page = first_inside
            last_page = None
            for b in blocks:
                if b['pages'].get('P'):
                    last_page = b['pages']['P'][-1]
            if start_page:
                u['pts'] = {'volume': start_page[0], 'page': start_page[1], 'end_page': (last_page or start_page)[1]}


HEADINGS = ('subhead', 'title', 'chapter', 'book', 'nikaya', 'centre', 'subsubhead')
SC_GROUPS = [
    # (bilara root subdirectory, VRI collections forming the search region)
    ('sutta/dn', ['dn']), ('sutta/mn', ['mn']),
    ('sutta/kn/kp', ['kp']), ('sutta/kn/dhp', ['dhp']), ('sutta/kn/ud', ['ud']), ('sutta/kn/iti', ['iti']),
    ('sutta/kn/snp', ['snp']), ('sutta/kn/vv', ['vv']), ('sutta/kn/pv', ['pv']), ('sutta/kn/thag', ['thag']),
    ('sutta/kn/thig', ['thig']), ('sutta/kn/tha-ap', ['ap']), ('sutta/kn/thi-ap', ['ap']), ('sutta/kn/bv', ['bv']),
    ('sutta/kn/cp', ['cp']), ('sutta/kn/ja', ['ja']), ('sutta/kn/mnd', ['mnd']), ('sutta/kn/cnd', ['cnd']),
    ('sutta/kn/ps', ['ps']), ('sutta/kn/mil', ['mil']), ('sutta/kn/ne', ['ne']), ('sutta/kn/pe', ['pe']),
    ('vinaya/pli-tv-bu-vb', ['vin-pj', 'vin-pc']), ('vinaya/pli-tv-bi-vb', ['vin-pj', 'vin-pc']),
    ('vinaya/pli-tv-kd', ['vin-mv', 'vin-cv']), ('vinaya/pli-tv-pvr', ['vin-pvr']),
    ('abhidhamma/ds', ['ds']), ('abhidhamma/vb', ['vb']), ('abhidhamma/dt', ['dt']), ('abhidhamma/pp', ['pp']),
    ('abhidhamma/kv', ['kv']), ('abhidhamma/ya', ['ya']), ('abhidhamma/patthana', ['patthana']),
]
SC_COLLECTION = {'tha-ap': 'ap', 'thi-ap': 'ap'}


def sc_collection(uid):
    if uid.startswith('pli-tv-'):
        return 'vinaya'
    head = re.match(r'[a-z-]+?(?=\d|$)', uid).group(0)
    return SC_COLLECTION.get(head, head)


def acronym_for(uid):
    m = re.match(r'^(pli-tv-(?:bu|bi)-vb-|pli-tv-|tha-ap|thi-ap|[a-z]+)(.*)$', uid)
    head, rest = m.group(1), m.group(2)
    names = {'pli-tv-bu-vb-': 'Bu', 'pli-tv-bi-vb-': 'Bi', 'pli-tv-': '', 'tha-ap': 'Tha Ap', 'thi-ap': 'Thī Ap'}
    if head in names:
        sub = re.match(r'([a-z]+)(.*)', rest)
        label = (names[head] + ' ' + (sub.group(1).capitalize() if sub else '')).strip()
        number = sub.group(2) if sub else rest
        return f'{label} {number}'.replace('-', '–').strip()
    abbr = {'kp': 'Kp', 'patthana': 'Paṭṭh', 'ps': 'Paṭis'}.get(head, ACRONYM.get(head, head.capitalize()))
    return f'{abbr} {rest}'.replace('-', '–').strip()


STRUCTURE = ('subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead')
COLOPHON = re.compile(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|uddānaṃ$|^Namo tassa', re.I)


def opening_heading(blocks, start, floor):
    """Move a text's start back over its own headings (not over the previous text's colophon)."""
    while start - 1 >= floor:
        prev = blocks[start - 1]
        if prev['rend'] == 'hangnum' and not prev['text']:
            start -= 1
            continue
        if prev['rend'] in STRUCTURE and not COLOPHON.search(prev['text']):
            start -= 1
            continue
        # Short stock openings ("Sāvatthinidānaṃ. Tatra kho bhagavā…") directly under the text's heading.
        k = start - 1
        while k >= floor and k >= start - 2 and blocks[k]['rend'] == 'bodytext' and len(blocks[k]['text']) < 160:
            k -= 1
        if k >= floor and k < start - 1 and blocks[k]['rend'] == 'subhead' and vri.label(blocks[k]['text']) and not COLOPHON.search(blocks[k]['text']):
            start = k
            continue
        break
    return start


def unit_title(blocks, u):
    window = blocks[u['start']:min(u['end'], u['start'] + 8)]
    numbered = [b for b in window if b['rend'] in ('subhead', 'chapter', 'title') and vri.label(b['text']) and not COLOPHON.search(b['text'])]
    if numbered:
        # the innermost numbered heading just before the text is its own title
        return vri.label(numbered[-1]['text'])[2]
    for b in window:
        if b['rend'] == 'subhead' and not COLOPHON.search(b['text']):
            lab = vri.label(b['text'])
            return lab[2] if lab else b['text']
    for b in blocks[u['start']:min(u['end'], u['start'] + 6)]:
        if b['rend'] in ('chapter', 'title') and not COLOPHON.search(b['text']):
            lab = vri.label(b['text'])
            return lab[2] if lab else b['text']
    divs = blocks[min(u['start'] + 1, u['end'] - 1)]['divs']
    for d in reversed(divs):
        if d['title']:
            lab = vri.label(d['title'])
            return lab[2] if lab else d['title']
    return ''


def aligned_units(builder, bilara):
    import align
    canon = {'books': [{'collection': b['collection'], 'blocks': [[x['rend'], x['n'], x['text']] for x in b['blocks']]}
                       for b in builder.books]}
    files_by_name = {b['file']: i for i, b in enumerate(builder.books)}
    regions = []  # (group name, members, spans)

    def members_of(sub):
        out = []
        for path in align.root_files(bilara, sub):
            for key, segs in align.read_root(path).items():
                out.append((key, segs, os.path.basename(path).split('_')[0]))
        out.sort(key=lambda m: align.sort_key(m[0]))
        return out

    special = {
        'sutta/kn/tha-ap': [('s0510m1.mul.xml', None), ('s0510m2.mul.xml', None)],
        'sutta/kn/thi-ap': [('s0510m2.mul.xml', None)],
        'vinaya/pli-tv-bu-vb': [('vin01m.mul.xml', None), ('vin02m1.mul.xml', None)],
        'vinaya/pli-tv-bi-vb': [('vin02m1.mul.xml', 'Bhikkhunīvibhaṅgo')],
    }
    for sub, colls in SC_GROUPS:
        if sub in special:
            spans = []
            for file, marker in special[sub]:
                bi = files_by_name[file]
                blocks = builder.books[bi]['blocks']
                start = 0
                if marker:
                    start = next((i for i, x in enumerate(blocks) if x['text'] == marker), 0)
                spans.append((bi, start, len(blocks)))
        else:
            spans = [(bi, 0, len(b['blocks'])) for bi, b in enumerate(builder.books) if b['collection'] in colls]
        regions.append((sub, members_of(sub), spans))
    for coll in ('sn', 'an'):
        groups = {}
        for m in members_of(f'sutta/{coll}'):
            groups.setdefault(m[0].split('.')[0], []).append(m)
        for g, members in groups.items():
            span = [None, 10 ** 9, -1]
            for u in builder.units:
                if u['collection'] == coll and u['id'].split('.')[0] == g:
                    span = [u['book'], min(span[1], u['start']), max(span[2], u['end'])]
            # widen by a few blocks: the heuristic span may start after the saṃyutta heading
            span[1] = max(0, span[1] - 5)
            regions.append((g, members, [tuple(span)]))
    units, misses, files, titles = [], [], {}, {}
    for name, members, spans in regions:
        if not members or not spans or spans[0][0] is None:
            continue
        stream = align.RegionStream(canon, spans)
        found, miss = align.align_unique(stream, [(k, s) for k, s, _ in members])
        misses.extend((name, k) for k, _ in miss)
        for k, segs, _ in members:
            titles[k] = align.root_title(segs)
        placed = sorted(((v[2], k) for k, v in found.items()))
        starts = []
        for _, key in placed:
            bi, block, _, anchor_block = found[key]
            blocks_ = builder.books[bi]['blocks']
            # Texts begin at numbered boundaries. If the estimated start is not on one (editions' wording
            # drifts slightly, so it can land in the previous text's last lines), move forward to the first
            # verse number, numbered paragraph or numbered heading at or before the anchor.
            def boundary(b_):
                return (b_['rend'] == 'hangnum' and b_['n']) or (b_['n'] and b_['rend'] == 'bodytext') or numbered_subhead(b_)
            if not boundary(blocks_[block]):
                for k in range(block + 1, anchor_block + 1):
                    if boundary(blocks_[k]):
                        block = k
                        break
            blocks = builder.books[bi]['blocks']
            floor = starts[-1][2] + 1 if starts and starts[-1][1] == bi else 0
            # Never start a text on the previous text's colophon ("… niṭṭhitaṃ").
            while block + 1 < len(blocks) and COLOPHON.search(blocks[block]['text'] or '') and blocks[block]['rend'] in ('centre', 'subhead', 'title', 'bodytext'):
                block += 1
            starts.append((key, bi, opening_heading(blocks, block, floor), block))
        # Structural placement for texts whose wording could not be anchored.
        order = [k for k, _, _ in members]
        placed_keys = {s[0] for s in starts}
        start_of = {s[0]: s for s in starts}
        structural = []
        for idx, key in enumerate(order):
            if key in placed_keys:
                continue
            m = re.match(r'^dhp(\d+)$', key)
            if m:
                # Dhammapada verse numbers are the same in every edition: use VRI's verse marker.
                for bi_, _, e_ in spans:
                    blocks_ = builder.books[bi_]['blocks']
                    k = next((i for i, b_ in enumerate(blocks_) if b_['rend'] == 'hangnum' and b_['n'] == m.group(1)), None)
                    if k is not None:
                        structural.append((key, bi_, k, k))
                        break
                continue
            prev_key = next((order[j] for j in range(idx - 1, -1, -1) if order[j] in start_of), None)
            next_key = next((order[j] for j in range(idx + 1, len(order)) if order[j] in start_of), None)
            if not prev_key or not next_key or start_of[prev_key][1] != start_of[next_key][1]:
                continue
            bi_ = start_of[prev_key][1]
            blocks_ = builder.books[bi_]['blocks']
            lo, hi = start_of[prev_key][3], start_of[next_key][2]
            gap_heads = [i for i in range(lo + 1, hi) if numbered_subhead(blocks_[i]) and not COLOPHON.search(blocks_[i]['text'])]
            missing_between = [k for k in order[order.index(prev_key) + 1:order.index(next_key)] if k not in placed_keys]
            if gap_heads and len(gap_heads) == len(missing_between):
                pos = missing_between.index(key)
                structural.append((key, bi_, gap_heads[pos], gap_heads[pos]))
        for s in structural:
            starts.append(s)
            placed_keys.add(s[0])
        misses[:] = [(n, k) for n, k in misses if k not in placed_keys]
        starts.sort(key=lambda s: (s[1], s[2]))
        span_end = {bi: e for bi, _, e in spans}
        shared = {}
        for i, (key, bi, start, block) in enumerate(starts):
            prev = starts[i - 1] if i else None
            if prev and prev[1] == bi and prev[3] == block:
                # Several texts recited in one VRI paragraph (e.g. the seven adhikaraṇasamathas): they share it.
                shared[key] = starts[i - 1][0] if starts[i - 1][0] not in shared else shared[starts[i - 1][0]]
                continue
            nxt = next((s for s in starts[i + 1:] if not (s[1] == bi and s[3] == block)), None)
            end = nxt[2] if nxt and nxt[1] == bi else span_end.get(bi, len(builder.books[bi]['blocks']))
            units.append({'id': key, 'book': bi, 'start': start, 'end': max(end, block + 1)})
        unit_by_id = {u['id']: u for u in units}
        for key, owner in shared.items():
            u = dict(unit_by_id[owner], id=key, approximate=True, shares_passage_with=owner)
            units.append(u)
            unit_by_id[key] = u
        previous = None
        for key, _, _ in members:
            if key in unit_by_id:
                previous = unit_by_id[key]
            elif previous:
                u = dict(previous, id=key, approximate=True)
                units.append(u)
                unit_by_id[key] = u
        for key, _, file_uid in members:
            files.setdefault(file_uid, []).append(key)
    # Global pass: a text ends no later than where the next distinct text in the same book begins
    # (search regions can overrun their section, e.g. at the end of a saṃyutta or a Vibhaṅga).
    primary = sorted([u for u in units if not u.get('approximate')], key=lambda u: (u['book'], u['start']))
    for a, b in zip(primary, primary[1:]):
        if a['book'] == b['book'] and b['start'] > a['start'] and a['end'] > b['start']:
            a['end'] = b['start']
    # Texts left with headings only were folded by VRI into the following passage
    # ("1-7. Paṭiccavārādi"): they share that passage and are marked approximate.
    BODY_RENDS = ('bodytext', 'gatha1', 'gatha2', 'gatha3', 'gathalast', 'unindented', 'indent', 'centre')
    for i, a in enumerate(primary):
        blocks_ = builder.books[a['book']]['blocks']
        has_body = any(b['rend'] in BODY_RENDS and b['text'] and not COLOPHON.search(b['text']) for b in blocks_[a['start']:a['end']])
        nxt = next((b for b in primary[i + 1:] if b['book'] == a['book'] and not b.get('approximate')), None)
        same_start = nxt is not None and nxt['start'] == a['start']
        if (not has_body or same_start) and nxt is not None:
            target = nxt
            a.update(start=target['start'], end=target['end'], approximate=True, shares_passage_with=target['id'])
    for u in units:
        if u.get('approximate') and not u.get('shares_passage_with'):
            owner = next((p for p in primary if p['book'] == u['book'] and p['start'] == u['start'] and not p.get('approximate')), None)
            if owner:
                u['end'] = owner['end']
    by_id = {u['id']: u for u in units}
    for file_uid, keys in files.items():
        if file_uid in by_id or len(keys) < 2:
            continue
        located = [by_id[k] for k in keys if k in by_id]
        if not located:
            continue
        same_book = [u for u in located if u['book'] == located[0]['book']]
        units.append({'id': file_uid, 'book': located[0]['book'], 'start': min(u['start'] for u in same_book),
                      'end': max(u['end'] for u in same_book), 'members': keys, 'kind': 'range'})
    disagreements = []
    for u in units:
        blocks = builder.books[u['book']]['blocks']
        u['title'] = unit_title(blocks, u)
        ref_title = re.sub(r'^[\d.–-]+\s*', '', (titles.get(u['id']) or '')).strip()
        window = blocks[u['start']:min(u['end'], u['start'] + 8)]
        has_numbered = any(b['rend'] in ('subhead', 'chapter', 'title') and vri.label(b['text']) for b in window)
        container = re.search(r'(saṃyuttaṃ|vaggo|kaṇḍaṃ|nipāto|pāḷi|bhāgo\)|paṇṇāsakaṃ)$', u['title'] or '')
        if re.match(r'^(Ime kho|Namo tassa)', ref_title or ''):
            ref_title = ''   # a recitation line or invocation, not a title
        if re.match(r'^(Ime kho|Namo tassa)', u['title'] or ''):
            heads = [vri.label(b['text'])[2] for b in blocks[u['start']:u['end']]
                     if b['rend'] in ('subhead', 'chapter', 'title') and vri.label(b['text']) and not COLOPHON.search(b['text'])]
            u['title'] = ref_title or (heads[0] if heads else u['title'])
        elif sc_collection(u['id']) == 'dhp':
            pass  # Dhammapada verses are titled by their vagga; the root's story names are commentary.
        elif ref_title and (not has_numbered or container or not u['title']):
            u['title'] = ref_title
        elif ref_title:
            # Several nested numbered headings (e.g. Paṭṭhāna): prefer the one naming this text.
            want = align.norm(ref_title)[:10]
            for b in reversed(window):
                if re.search(r'(vaggo|saṃyuttaṃ|nipāto|paṇṇāsakaṃ|pāḷi)$', b['text'] or ''):
                    continue
                lab = vri.label(b['text']) if b['rend'] in ('subhead', 'chapter', 'title') else None
                if lab and align.norm(lab[2])[:10] == want:
                    u['title'] = lab[2]
                    break
            else:
                if align.norm(u['title'])[:10] != want:
                    u['title'] = ref_title
        u['collection'] = sc_collection(u['id'])
        u['acronym'] = acronym_for(u['id'])
        paras = [b['n'] for b in blocks[u['start']:u['end']] if b['n']]
        u['vri'] = (paras[0] if len(paras) == 1 else f"{paras[0].split('-')[0]}–{paras[-1].split('-')[-1]}") if paras else None
        ref = titles.get(u['id'])
        if ref and u.get('kind') != 'range' and not u.get('approximate'):
            a, b = align.norm(ref), align.norm(u['title'])
            a, b = re.sub(r'(suttaṃ|sutta|vaggo|vagga)$', '', a), re.sub(r'(suttaṃ|sutta|vaggo|vagga)$', '', b)
            if a and b and a[:6] != b[:6] and a not in b and b not in a:
                disagreements.append((u['id'], ref, u['title']))
    return units, misses, disagreements


def compact(builder, commit):
    books = []
    for book in builder.books:
        books.append({
            'file': book['file'], 'collection': book['collection'], 'pitaka': book['pitaka'], 'title': book['title'],
            'blocks': [[b['rend'], b['n'], b['text'], b['notes'], {k: [f'{v}.{p}' for v, p in pages] for k, pages in b['pages'].items()}]
                       for b in book['blocks']],
        })
    return {
        'source': {
            'name': 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI)', 'repository': 'https://github.com/VipassanaTech/tipitaka-xml',
            'commit': commit, 'attribution': 'Vipassana Research Institute (VRI), Chaṭṭha Saṅgāyana Tipiṭaka, www.tipitaka.org',
            'terms': 'Made freely available by VRI for non-commercial use with attribution.',
        },
        'collections': {k: {'acronym': ACRONYM[k], 'name': NAME[k], 'pts': PTS_ABBR[k]} for k in ACRONYM},
        'books': books,
        'units': builder.units,
    }


def main():
    root, commit, bilara = sys.argv[1], sys.argv[2], sys.argv[3]
    out = sys.argv[4] if len(sys.argv) > 4 else 'data/canon.json.gz'
    b = Builder(root)
    b.load()
    b.build()
    heuristic_units = b.units
    units, misses, disagreements = aligned_units(b, bilara)
    b.units = units
    b.annotate_pages()
    print('alignment misses (mapped to nearest preceding passage):', len(misses))
    print('title disagreements (root title vs VRI heading):', len(disagreements))
    json.dump({'misses': misses, 'title_disagreements': disagreements}, open(out + '.report.json', 'w'), ensure_ascii=False, indent=0)
    data = compact(b, commit)
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    with gzip.open(out, 'wt', encoding='utf-8', compresslevel=9) as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
    counts = OrderedDict()
    for u in b.units:
        counts[u['collection']] = counts.get(u['collection'], 0) + 1
    print(json.dumps(counts))
    print('units', len(b.units), 'size', os.path.getsize(out))


if __name__ == '__main__':
    main()
