"""Quoted, unexecuted tests. Require independently bound namespace/future oracle.
The old fixture is only for helper/history tests; actual application tests use NEW.
"""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import sys
import unittest
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/canon'))
import apadana_thera389390_spans as pair


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def bundled_canon():
    directory = ROOT / 'server/data'
    manifest = json.loads((directory / 'canon.json.gz.parts.json').read_bytes())
    pieces = []
    for row in manifest['parts']:
        raw = (directory / row['file']).read_bytes()
        assert (len(raw), hashlib.sha256(raw).hexdigest()) == (row['size'], row['sha256'])
        pieces.append(raw)
    packed = b''.join(pieces)
    assert (len(packed), hashlib.sha256(packed).hexdigest()) == (manifest['size'], manifest['sha256'])
    return json.loads(gzip.decompress(packed))


def parsed_books(canon):
    books = copy.deepcopy(canon['books'])
    books[36]['blocks'] = [dict(rend=r, n=n, text=t, notes=copy.deepcopy(notes),
        pages={ed: [tuple(map(int, p.split('.'))) for p in pages] for ed, pages in markers.items()})
        for r, n, t, notes, markers in books[36]['blocks']]
    return books


class Pair389390(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pair._bound()  # Never skip a missing future authority.
        assert pair.REVISION == 'apadana-thera389-390-v1'
        assert pair.POST_PAIR_SHA256 == '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'
        cls.current = bundled_canon()
        assert digest(cls.current) == pair.POST_PAIR_SHA256
        assert pair.pair_state(cls.current['units']) == 'new'
        cls.old = pair.canon_before_389390(cls.current)
        assert digest(cls.old) == 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
        cls.books = parsed_books(cls.old)

    def test01_atomic_positive_annotation_and_idempotence(self):
        for annotated in (True, False):
            units = copy.deepcopy(self.old['units'])
            if not annotated:
                for row in units:
                    row.pop('pts', None)
            before = copy.deepcopy(units)
            self.assertEqual(pair.apadana_thera389390_spans(self.books, units), list(pair.TARGETS))
            actual = {row['id']: row for row in units}
            self.assertEqual((actual['tha-ap389']['start'], actual['tha-ap389']['end'], actual['tha-ap389']['vri']), (11045, 11063, '37–42'))
            self.assertEqual((actual['tha-ap390']['start'], actual['tha-ap390']['end'], actual['tha-ap390']['vri'], actual['tha-ap390']['title']), (11063, 11081, '43–48', 'Panasaphaladāyakattheraapadānaṃ'))
            self.assertEqual([row for row in before if row['id'] not in pair.TARGETS], [row for row in units if row['id'] not in pair.TARGETS])
            after = copy.deepcopy(units)
            self.assertEqual(pair.apadana_thera389390_spans(self.books, units), [])
            self.assertEqual(units, after)
            self.assertEqual(parsed_books(self.old), self.books)

    def test02_mixed_missing_duplicate_types_and_namespace_are_atomic(self):
        for mutation in ('mixed', 'missing', 'duplicate', 'bool', 'float', 'foreign_namespace', 'one_pts'):
            units = copy.deepcopy(self.old['units'])
            selected = {row['id']: row for row in units}
            if mutation == 'mixed':
                selected['tha-ap389'].update(pair.new_units()['tha-ap389'])
            elif mutation == 'missing':
                units.remove(selected['tha-ap390'])
            elif mutation == 'duplicate':
                units.append(copy.deepcopy(selected['tha-ap390']))
            elif mutation == 'bool':
                selected['tha-ap390']['book'] = True
            elif mutation == 'float':
                selected['tha-ap390']['start'] = 11067.0
            elif mutation == 'foreign_namespace':
                selected['tha-ap390']['index_revision'] = 'foreign'
            else:
                del selected['tha-ap390']['pts']
            before = copy.deepcopy(units)
            with self.assertRaises(ValueError, msg=mutation):
                pair.apadana_thera389390_spans(self.books, units)
            self.assertEqual(units, before)

    def test03_every_source_word_note_page_is_pinned(self):
        for field, value in (('text', 'Synthetic changed source'), ('notes', ['Synthetic note drift']), ('pages', {'M': [(1, 346)]})):
            books = copy.deepcopy(self.books)
            books[36]['blocks'][11065][field] = value
            units = copy.deepcopy(self.old['units'])
            before = copy.deepcopy(units)
            with self.assertRaises(ValueError):
                pair.apadana_thera389390_spans(books, units)
            self.assertEqual(units, before)

    def test04_prior_namespaces_neighbours_groups_and_overlap_refuse(self):
        for key in tuple(pair.PRIOR_UNITS) + ('group', 'overlap'):
            units = copy.deepcopy(self.old['units'])
            selected = {row['id']: row for row in units}
            if key == 'group':
                selected['mn1']['members'] = ['tha-ap389']
            elif key == 'overlap':
                selected['mn1'].update(book=36, start=11045, end=11046)
            else:
                selected[key]['title'] += ' synthetic drift'
            before = copy.deepcopy(units)
            with self.assertRaises(ValueError):
                pair.apadana_thera389390_spans(self.books, units)
            self.assertEqual(units, before)

    def test05_inverse_is_exact_and_rejects_unrelated_drift(self):
        original = copy.deepcopy(self.current)
        inverse = pair.canon_before_389390(self.current)
        self.assertEqual(digest(inverse), pair.PRE_PAIR_SHA256)
        self.assertEqual(self.current, original)
        self.assertEqual(len(inverse['books']), 61)
        self.assertEqual(len(inverse['units']), 8544)
        drift = copy.deepcopy(self.current)
        next(row for row in drift['units'] if row['id'] == 'mn1')['title'] += ' drift'
        with self.assertRaises(ValueError):
            pair.canon_before_389390(drift)


if __name__ == '__main__':
    unittest.main()
