"""Build the post-canonical Pāli data: the VRI Ṭīkā (sub-commentaries, romn/*.tik.xml and the
Ṭīkā-section *.nrf.xml books) and the Añña books (romn/e*.nrf.xml, the Visuddhimagga and its
Mahāṭīkā). None of it is the canon: every book is flagged canonical: false.

Usage:
    python scripts/canon/build_postcanonical.py <vri-dir> <vri-commit> <out .json.gz>

<vri-dir> is a sparse clone of VipassanaTech/tipitaka-xml at <vri-commit> with these paths checked out:
    /romn/*.tik.xml  /romn/*.nrf.xml  /romn/e0101n.mul.xml  /romn/e0102n.mul.xml
    /romn/e0103n.att.xml  /romn/e0104n.att.xml  /tipitaka.org/romn/tree.json

Size (decision D-21a): every book is bundled in one file, server/data/postcanonical.json.gz
(about 14.5 MB gz, over the 12 MB target but well inside the 60 MB package budget), so the
server needs no download, no extra allowed host and no disk cache for these books.

Excluded: s0518m.nrf.xml (Peṭakopadesa) and s0520m.nrf.xml (Milindapañha), already in the canon
data as part of the Khuddaka Nikāya.

Nothing is generated or normalised beyond markup removal: the text is VRI's (scripts/canon/vri.py).
Titles and sections come from VRI's own table of contents (tipitaka.org/romn/tree.json).
The output is gzip with mtime 0 (the bytes can still differ between zlib builds; nothing pins them).
"""
import glob
import gzip
import hashlib
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vri  # noqa: E402

IN_CANON = {'s0518m', 's0520m'}
# Root and commentary-type files of the Añña section that are not *.nrf.xml.
EXTRA_FILES = ['e0101n.mul.xml', 'e0102n.mul.xml', 'e0103n.att.xml', 'e0104n.att.xml']
FILE = re.compile(r'^(\w+?)\.(tik|nrf|mul|att)\.xml$')


def fold(value):
    value = unicodedata.normalize('NFD', value or '')
    return ''.join(ch for ch in value if not unicodedata.combining(ch)).lower()


def slug(title):
    return re.sub(r'[^a-z0-9]+', '-', fold(title).replace('ṁ', 'm')).strip('-')


def tree_titles(vri_dir):
    """VRI's table of contents: file stem -> path of titles, e.g. ['Añña', 'Visuddhimagga', 'Visuddhimagga-1']."""
    raw = open(os.path.join(vri_dir, 'tipitaka.org', 'romn', 'tree.json'), 'rb').read()
    tree = json.loads(raw.decode('utf-16') if raw[:2] in (b'\xff\xfe', b'\xfe\xff') else raw.decode('utf-8-sig'))
    out = {}

    def walk(node, path):
        here = path + [node.get('text', '').strip()]
        href = (node.get('a_attr') or {}).get('href') or node.get('href')
        if href:
            m = re.search(r'cscd/(\w+?)\.(?:mul|att|tik|nrf)\d*\.xml', href)
            if m and m.group(1) not in out:
                out[m.group(1)] = path[1:]  # drop the root 'Tipiṭaka'; the leaf is the first section, not the book
        for child in node.get('children') or []:
            walk(child, here)

    for node in tree:
        walk(node, [])
    return out


def page_list(pages):
    return {ed: [f'{v}.{p}' for v, p in values] for ed, values in pages.items() if ed in ('P', 'M', 'V', 'T')}


def block(b):
    row = [b['rend'], b['n'], b['text']]
    pages = page_list(b['pages'])
    if b['notes'] or pages:
        row.append(b['notes'])
    if pages:
        row.append(pages)
    return row


def main(vri_dir, commit, out_path):
    titles = tree_titles(vri_dir)
    romn = os.path.join(vri_dir, 'romn')
    files = sorted(os.path.basename(p) for p in glob.glob(os.path.join(romn, '*.tik.xml')) + glob.glob(os.path.join(romn, '*.nrf.xml')))
    files = [f for f in files if FILE.match(f).group(1) not in IN_CANON] + EXTRA_FILES
    files.sort()
    # Ids are the slug of VRI's title; a title used twice (the Mahāvagga-ṭīkā of DN and of SN) is prefixed with its group.
    def stem_of(name):
        return FILE.match(name).group(1)
    plain = [slug(titles.get(stem_of(n), ['', ''])[-1]) for n in files]
    books, ids = [], set()
    for name in files:
        stem = FILE.match(name).group(1)
        path = titles.get(stem)
        if not path or len(path) < 2:
            raise SystemExit(f'{name}: not in VRI tree.json')
        section = path[0]  # 'Ṭīkā' or 'Añña'
        if section not in ('Ṭīkā', 'Añña'):
            raise SystemExit(f'{name}: unexpected VRI section {section!r}')
        title = path[-1]
        bid = slug(title)
        if plain.count(bid) > 1:
            bid = slug(path[-2] + ' ' + title)
        if bid in ids:
            raise SystemExit(f'duplicate id {bid}')
        ids.add(bid)
        parsed = vri.parse(os.path.join(romn, name))
        if not parsed:
            raise SystemExit(f'{name}: no blocks')
        rows = [block(b) for b in parsed]
        chapters = [[b['text'], i] for i, b in enumerate(parsed) if b['rend'] == 'chapter' and b['text']]
        works = [[b['text'], i] for i, b in enumerate(parsed) if b['rend'] == 'book' and b['text']]
        books.append({'id': bid, 'file': name, 'title': title, 'section': section, 'group': path[1:-1],
                      'chapters': chapters, 'works': works, 'block_count': len(rows),
                      'paragraphs': sum(1 for b in parsed if b['n']), 'blocks': rows})

    source = {
        'name': 'Chaṭṭha Saṅgāyana Tipiṭaka (VRI): Ṭīkā and Añña (post-canonical) books',
        'repository': 'https://github.com/VipassanaTech/tipitaka-xml', 'commit': commit,
        'files': 'romn/*.tik.xml, romn/*.nrf.xml (except s0518m, s0520m), romn/e0101n.mul.xml, e0102n.mul.xml, e0103n.att.xml, e0104n.att.xml; titles from tipitaka.org/romn/tree.json',
        'attribution': 'Vipassana Research Institute (VRI), Chaṭṭha Saṅgāyana Tipiṭaka, www.tipitaka.org',
        'terms': 'Made freely available by VRI for non-commercial use with attribution.',
    }
    data = {'source': source, 'books': books}
    out_bytes = gzip.compress(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8'), 9, mtime=0)
    with open(out_path, 'wb') as fh:
        fh.write(out_bytes)
    report = {
        'commit': commit, 'books': len(books), 'bytes': len(out_bytes), 'sha256': hashlib.sha256(out_bytes).hexdigest(),
        'sections': {s: sum(1 for b in books if b['section'] == s) for s in ('Ṭīkā', 'Añña')},
        'blocks': sum(b['block_count'] for b in books), 'paragraphs': sum(b['paragraphs'] for b in books),
    }
    with open(out_path + '.report.json', 'w', encoding='utf-8') as fh:
        json.dump(report, fh, ensure_ascii=False, indent=1)
    print(json.dumps(report))


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    main(*sys.argv[1:])
