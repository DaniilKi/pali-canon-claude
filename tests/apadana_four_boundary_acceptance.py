"""Finite four-record migration gates. Source expectations are independently sealed.

Executed only by the Node wrapper; source class requires VRI_SOURCE_CHECKOUT.
No personal study data is read or migrated. Crosswalks prove source identity only.
"""
import ast
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/canon'))
import apadana_thera333_spans as four

OLD_SHA = '1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
NEW_SHA = '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8'
REV = 'apadana-thera333-336-v1'
PINS = {
    'SOURCE_REVIEW.json': '0287b0529ac82d7a72a5653283e1ed52fcb495ef6aec885d3c59c100a101696d',
    'OLD_SEGMENT_SOURCE_NEW_OWNER_MAP.json': 'fbf5190392d0285254932a907ee794ddea3db828e8158061bb4aff1c53f0cf8b',
    'SOURCE_REVIEW_SEAL.json': '74dcf29840b6e578d0ca10c5b4c167a85ff17fa155bb03a46be07414ff0a4a7d',
}
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
def digest(value):
    return sha(compact(value))
def same_types(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True)
def bundled(name):
    p = ROOT / 'server/data' / name
    if p.exists():
        raw = p.read_bytes()
    else:
        manifest = json.loads(Path(str(p) + '.parts.json').read_bytes())
        pieces = []
        for part in manifest['parts']:
            b = (p.parent / part['file']).read_bytes()
            assert len(b) == part['size'] and sha(b) == part['sha256']
            pieces.append(b)
        raw = b''.join(pieces)
        assert len(raw) == manifest['size'] and sha(raw) == manifest['sha256']
    return gzip.decompress(raw)
def records(canon, ids):
    return {uid: next(u for u in canon['units'] if u['id'] == uid) for uid in ids}
def parsed_books(canon):
    blocks = [dict(rend=r, n=n, text=t, notes=copy.deepcopy(ns),
                   pages={k: [tuple(map(int, p.split('.'))) for p in ps] for k, ps in pages.items()})
              for r, n, t, ns, pages in canon['books'][36]['blocks']]
    return [dict(b, blocks=blocks if i == 36 else []) for i, b in enumerate(canon['books'])]

# Original-first preview copied from the sealed independent analysis, not app code.
def segments(unit, tuples):
    headings = {'subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead'}
    verses = {'gatha1', 'gatha2', 'gatha3', 'gathalast'}
    centre = re.compile(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$', re.I)
    out, stanza = [], None
    def flush():
        nonlocal stanza
        if stanza is not None:
            out.append(stanza)
            stanza = None
    for index in range(unit['start'], unit['end']):
        rend, n, text, notes, pages = tuples[index]
        if rend == 'hangnum':
            flush()
            stanza = dict(type='verse', vri=n, text='', source_blocks=[index, index + 1])
            continue
        if rend in verses:
            if stanza is None:
                stanza = dict(type='verse', vri=n, text='', source_blocks=[index, index + 1])
            stanza['source_blocks'][1] = index + 1
            stanza['text'] += ('\n' if stanza['text'] else '') + text
            if rend == 'gathalast':
                flush()
        else:
            flush()
            if text:
                out.append(dict(type='heading' if rend in headings or rend == 'centre' and centre.search(text) else 'prose',
                                vri=n, text=text, source_blocks=[index, index + 1]))
    flush()
    return [dict(ref=unit['id'] + '/' + str(i + 1), uid=unit['id'], segment_index0=i,
                 type=s['type'], vri_paragraph=s['vri'], source_blocks=s['source_blocks'],
                 text_sha256=sha(s['text'].encode())) for i, s in enumerate(out)]

class Fixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        evidence = ROOT / 'docs/evidence/apadana/boundaries333-336'
        loaded = {}
        for name, pin in PINS.items():
            raw = (evidence / name).read_bytes()
            assert sha(raw) == pin, name + ' independent authority changed'
            loaded[name] = json.loads(raw)
        cls.proof = loaded['SOURCE_REVIEW.json']
        cls.crosswalk = loaded['OLD_SEGMENT_SOURCE_NEW_OWNER_MAP.json']
        cls.ids = tuple(r['id'] for r in cls.proof['records'])
        assert cls.ids == ('tha-ap333', 'tha-ap334', 'tha-ap335', 'tha-ap336')
        cls.old_records = {r['id']: r['old_record'] for r in cls.proof['records']}
        cls.new_records = {r['id']: r['proposed_new_record'] for r in cls.proof['records']}
        raw = bundled('canon.json.gz')
        assert sha(raw) == NEW_SHA, 'exact current four-record canon required'
        cls.current = json.loads(raw)
        assert same_types(records(cls.current, cls.ids)) == same_types(cls.new_records)
        # Construct the historical authority from independent records, never the inverse under test.
        cls.old = copy.deepcopy(cls.current)
        cls.old['units'] = [copy.deepcopy(cls.old_records[u['id']]) if u['id'] in cls.ids else u
                            for u in cls.old['units']]
        assert digest(cls.old) == OLD_SHA
        cls.books = parsed_books(cls.old)
    def small(self, new=False):
        wanted = set(self.ids) | {'tha-ap332', 'tha-ap337'}
        return copy.deepcopy([u for u in (self.current if new else self.old)['units'] if u['id'] in wanted])
    def reject_gate(self, books, units):
        before_books, before_units = digest(books), digest(units)
        with self.assertRaises(ValueError):
            four.apadana_thera333_spans(books, units)
        self.assertEqual(digest(books), before_books)
        self.assertEqual(digest(units), before_units)

class FourBoundaryData(Fixture):
    def test_01_exact_records_inverse_and_complete_source_preservation(self):
        self.assertEqual(same_types(four.OLD_UNITS), same_types(self.old_records))
        self.assertEqual(same_types(four.NEW_UNITS), same_types(self.new_records))
        self.assertEqual(four.TARGETS, self.ids)
        self.assertEqual(four.REVISION, REV)
        self.assertEqual(four.COMMIT, self.proof['source_pins']['XML']['VRI_commit'])
        self.assertEqual(four.FILE, self.proof['full_source_replay']['source_file'])
        self.assertEqual(four.PRE_FOUR_SHA256, OLD_SHA)
        self.assertEqual(four.ROOT_BLOCKS_SHA256, self.proof['full_source_replay']['full_book_blocks_sha256'])
        before = digest(self.current)
        inverse = four.canon_before_thera333(self.current)
        self.assertEqual(digest(inverse), OLD_SHA)
        self.assertEqual(inverse, self.old)
        self.assertEqual(digest(self.current), before)
        preserved = self.proof['preservation_targets']
        self.assertEqual(len(self.current['books']), 61)
        self.assertEqual(digest(self.current['books']), preserved['all61_books_sha256'])
        other = [u for u in self.current['units'] if u['id'] not in self.ids]
        self.assertEqual(len(other), 8540)
        self.assertEqual(digest(other), preserved['other_unit_records_ordered_sha256'])
        self.assertEqual(self.current['books'], self.old['books'])
        self.assertEqual(digest(self.current['books'][36]['blocks']), four.ROOT_BLOCKS_SHA256)
        self.assertEqual(digest(self.current['books'][36]['blocks'][9767:9890]), self.proof['union']['sha256'])

    def test_02_atomic_gate_exact_output_idempotence_and_full_partition(self):
        units = copy.deepcopy(self.old['units'])
        book_pin = digest(self.books)
        self.assertEqual(four.apadana_thera333_spans(self.books, units), list(self.ids))
        self.assertEqual(digest(dict(self.old, units=units)), NEW_SHA)
        self.assertEqual(same_types(records(dict(units=units), self.ids)), same_types(self.new_records))
        self.assertEqual([i for uid in self.ids for i in range(self.new_records[uid]['start'], self.new_records[uid]['end'])],
                         list(range(9767, 9890)))
        self.assertEqual(four.apadana_thera333_spans(self.books, units), [])
        self.assertEqual(digest(dict(self.old, units=units)), NEW_SHA)
        self.assertEqual(digest(self.books), book_pin)

    def test_03_every_sealed_crosswalk_entry_and_numeric_collision(self):
        tuples = self.current['books'][36]['blocks']
        old = [s for uid in self.ids for s in segments(self.old_records[uid], tuples)]
        new = [s for uid in self.ids for s in segments(self.new_records[uid], tuples)]
        self.assertEqual(len(old), 50)
        self.assertEqual(len(new), 50)
        by_span = {tuple(s['source_blocks']): s for s in new}
        self.assertEqual(len(by_span), 50)
        by_ref = {s['ref']: s for s in new}
        actual = []
        for before in old:
            after = by_span[tuple(before['source_blocks'])]
            for key in ('source_blocks', 'text_sha256', 'type', 'vri_paragraph'):
                self.assertEqual(before[key], after[key])
            numeric = by_ref.get(before['ref'])
            stable = numeric is not None and numeric['source_blocks'] == before['source_blocks'] and numeric['text_sha256'] == before['text_sha256']
            actual.append(dict(old=before, proposed_exact_source_match=after,
                owner_changes=before['uid'] != after['uid'], ref_changes=before['ref'] != after['ref'],
                same_numeric_ref_after_repair=numeric, same_numeric_ref_remains_same_source=stable,
                automatic_user_data_migration_authorized=False))
        self.assertEqual(actual, self.crosswalk['mapping'])
        summary = dict(old_segments=50, proposed_segments=50, exact_source_match_for_every_old_segment=50,
            cross_owner_moves=sum(x['owner_changes'] for x in actual),
            changed_numeric_ref_collisions=sum(x['same_numeric_ref_after_repair'] is not None and not x['same_numeric_ref_remains_same_source'] for x in actual),
            old_numeric_refs_no_longer_present=sum(x['same_numeric_ref_after_repair'] is None for x in actual),
            same_ref_and_source=sum(x['same_numeric_ref_remains_same_source'] for x in actual))
        self.assertEqual(summary, self.crosswalk['summary'])
        self.assertEqual(list(summary.values()), [50, 50, 50, 6, 38, 2, 10])
        self.assertIs(self.crosswalk['automatic_migration_approval'], False)

    def test_04_strict_mixed_duplicate_types_titles_pts_revision(self):
        for mask in range(1, 15):
            units = self.small()
            for i, uid in enumerate(self.ids):
                if mask & (1 << i):
                    units[units.index(next(u for u in units if u['id'] == uid))] = copy.deepcopy(self.new_records[uid])
            with self.subTest(mixed=mask):
                self.reject_gate(self.books, units)
        mutations = [('missing', lambda rows, u: rows.remove(u)),
            ('duplicate', lambda rows, u: rows.append(copy.deepcopy(u))),
            ('title', lambda rows, u: u.update(title=u['title'] + 'x')),
            ('vri', lambda rows, u: u.update(vri='1–37')),
            ('float_start', lambda rows, u: u.update(start=float(u['start']))),
            ('bool_book', lambda rows, u: u.update(book=True)),
            ('bool_start', lambda rows, u: u.update(start=True)),
            ('end', lambda rows, u: u.update(end=u['end'] + 1)),
            ('bool_pts', lambda rows, u: u['pts'].update(volume=True)),
            ('float_pts', lambda rows, u: u['pts'].update(page=267.0)),
            ('end_pts', lambda rows, u: u['pts'].update(end_page=268)),
            ('partial_pts', lambda rows, u: u.pop('pts')),
            ('revision', lambda rows, u: u.update(index_revision='unreviewed')),
            ('extra', lambda rows, u: u.update(unreviewed=False))]
        for is_new in (False, True):
            for uid in self.ids:
                for label, mutate in mutations:
                    with self.subTest(new=is_new, uid=uid, mutation=label):
                        rows = self.small(is_new)
                        mutate(rows, next(u for u in rows if u['id'] == uid))
                        self.reject_gate(self.books, rows)
                        c = dict(source=self.current['source'], units=rows)
                        snapshot = digest(c)
                        with self.assertRaises(ValueError):
                            four.canon_before_thera333(c)
                        self.assertEqual(digest(c), snapshot)
            if is_new:
                rows = self.small(True)
                next(u for u in rows if u['id'] == self.ids[0]).pop('index_revision', None)
                self.reject_gate(self.books, rows)

    def test_05_whole_book_neighbours_groups_reject_before_mutation(self):
        for label in ('word', 'note', 'page', 'wrong_book', 'duplicate_book', 'neighbour', 'neighbour_kind', 'shared', 'member'):
            with self.subTest(mutation=label):
                books, units = copy.deepcopy(self.books), self.small()
                if label == 'word': books[36]['blocks'][-1]['text'] += 'x'
                elif label == 'note': books[36]['blocks'][-1]['notes'].append('synthetic corruption')
                elif label == 'page': books[36]['blocks'][-1]['pages']['P'] = [(99, 999)]
                elif label == 'wrong_book': books[35], books[36] = books[36], books[35]
                elif label == 'duplicate_book': books.append(copy.deepcopy(books[36]))
                elif label == 'neighbour': next(u for u in units if u['id'] == 'tha-ap332')['end'] += 1
                elif label == 'neighbour_kind': next(u for u in units if u['id'] == 'tha-ap337')['kind'] = 'group'
                elif label == 'shared': units.append(dict(id='synthetic', shares_passage_with=self.ids[0]))
                elif label == 'member': units.append(dict(id='synthetic', members=[self.ids[1]]))
                self.reject_gate(books, units)

    def test_06_historical_inverse_preserves_unrelated_mutation_but_not_source_drift(self):
        c = dict(source=copy.deepcopy(self.current['source']), units=self.small(True), sentinel={'local': 'synthetic'})
        other = next(u for u in c['units'] if u['id'] == 'tha-ap332')
        other['end'] += 1
        before = digest(c)
        inverse = four.canon_before_thera333(c)
        self.assertEqual(next(u for u in inverse['units'] if u['id'] == 'tha-ap332'), other)
        self.assertEqual(inverse['sentinel'], c['sentinel'])
        self.assertEqual(digest(c), before)
        self.assertNotEqual(digest(inverse), OLD_SHA)
        c['source']['commit'] = 'unreviewed'
        with self.assertRaises(ValueError): four.canon_before_thera333(c)

    def test_07_preannotation_requires_all_pts_present_or_all_absent(self):
        units = self.small()
        for u in units:
            if u['id'] in self.ids: u.pop('pts')
        self.assertEqual(four.four_state(units, before_annotation=True), 'old')
        with self.assertRaises(ValueError): four.four_state(units)
        self.assertEqual(four.apadana_thera333_spans(self.books, units), list(self.ids))
        self.assertEqual(four.four_state(units, before_annotation=True), 'new')
        self.assertTrue(all('pts' not in u for u in units if u['id'] in self.ids))
        self.assertEqual(four.apadana_thera333_spans(self.books, units), [])
        partial = self.small()
        next(u for u in partial if u['id'] == self.ids[0]).pop('pts')
        self.reject_gate(self.books, partial)
        # Builder may legitimately omit this entire source book.
        missing_books = [dict(file='different.xml', blocks=[])]
        untouched = self.small()
        pin = digest(untouched)
        self.assertEqual(four.apadana_thera333_spans(missing_books, untouched), [])
        self.assertEqual(digest(untouched), pin)

    def test_08_build_hook_is_unique_and_before_numbering_and_pts_annotation(self):
        tree = ast.parse((ROOT / 'scripts/canon/build_canon.py').read_text())
        imports = [n for n in tree.body if isinstance(n, ast.ImportFrom) and n.module == 'apadana_thera333_spans']
        self.assertEqual(len(imports), 1)
        self.assertEqual([a.name for a in imports[0].names], ['apadana_thera333_spans'])
        main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
        calls = [n for n in ast.walk(main) if isinstance(n, ast.Call)]
        names = lambda name: [n for n in calls if isinstance(n.func, ast.Name) and n.func.id == name]
        self.assertEqual(len(names('apadana_thera333_spans')), 1)
        hook = names('apadana_thera333_spans')[0]
        self.assertEqual(ast.unparse(hook), 'apadana_thera333_spans(b.books, b.units)')
        self.assertLess(names('apadana_thera_pair_spans')[0].lineno, hook.lineno)
        self.assertLess(hook.lineno, names('thag_sixteen_spans')[0].lineno)
        numbering = [n for n in ast.walk(main) if isinstance(n, ast.Assign) and any(isinstance(t, ast.Subscript) and isinstance(t.slice, ast.Constant) and t.slice.value == 'vri' for t in n.targets)]
        self.assertEqual(len(numbering), 1)
        self.assertLess(hook.lineno, numbering[0].lineno)
        pages = [n for n in calls if isinstance(n.func, ast.Attribute) and n.func.attr == 'annotate_pages']
        self.assertEqual(len(pages), 1)
        self.assertLess(hook.lineno, pages[0].lineno)

class OriginalSource(Fixture):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.source = Path(os.environ['VRI_SOURCE_CHECKOUT'])
        cls.raw = (cls.source / 'romn' / 's0510m1.mul.xml').read_bytes()
        pin = cls.proof['source_pins']['XML']
        assert sha(cls.raw) == pin['sha256']
        assert hashlib.sha1(b'blob ' + str(len(cls.raw)).encode() + b'\0' + cls.raw).hexdigest() == pin['git_blob_sha1']
        raw = bundled('commentary.json.gz')
        assert sha(raw) == cls.proof['preservation_targets']['commentary_raw_logical_sha256']
        cls.commentary = json.loads(raw)
        import repair_apadana_thera333_spans
        cls.wrapper = repair_apadana_thera333_spans

    def test_09_real_xml_wrapper_preserves_all_data_and_is_idempotent(self):
        c, notes = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
        notes_pin, books_pin = digest(notes), digest(c['books'])
        report = self.wrapper.repair(c, notes, self.source)
        self.assertEqual(digest(c), NEW_SHA)
        self.assertEqual(report['changed_units'], list(self.ids))
        self.assertEqual(report['historical_inverse_sha256'], OLD_SHA)
        self.assertEqual(report['output_sha256'], NEW_SHA)
        self.assertEqual(report['input_sha256'], OLD_SHA)
        self.assertEqual(report['preserved_other_units'], 8540)
        self.assertEqual(report['english_activations'], 0)
        self.assertEqual(report['commentary_changes'], 0)
        self.assertIs(report['private_data_accessed'], False)
        self.assertEqual(report['preserved_union'], [9767, 9890])
        self.assertEqual(report['union_blocks_sha256'], self.proof['union']['sha256'])
        for r in self.proof['records']:
            u = report['units'][r['id']]
            self.assertEqual(u['before'], r['old_record'])
            self.assertEqual(u['after'], r['proposed_new_record'])
            self.assertEqual(u['root_sha256'], r['proposed_new_root_sha256'])
            self.assertEqual(u['after']['pts'], r['PTS_independently_derived_from_XML'])
        self.assertEqual(digest(c['books']), books_pin)
        self.assertEqual(digest(notes), notes_pin)
        second = self.wrapper.repair(c, notes, self.source)
        self.assertEqual(second['changed_units'], [])
        self.assertEqual(second['input_sha256'], NEW_SHA)
        self.assertEqual(second['output_sha256'], NEW_SHA)
        self.assertEqual(digest(c), NEW_SHA)
        self.assertEqual(digest(notes), notes_pin)

    def test_10_wrapper_global_and_raw_pin_refusals_are_atomic(self):
        for label in ('unrelated_unit', 'book_word', 'commentary', 'commit', 'mixed'):
            c, notes = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
            if label == 'unrelated_unit': c['units'][0]['title'] += 'x'
            elif label == 'book_word': c['books'][0]['blocks'][0][2] += 'x'
            elif label == 'commentary': notes['synthetic_corruption'] = True
            elif label == 'commit': c['source']['commit'] = 'unreviewed'
            elif label == 'mixed':
                i = next(i for i, u in enumerate(c['units']) if u['id'] == self.ids[0])
                c['units'][i] = copy.deepcopy(self.new_records[self.ids[0]])
            with self.subTest(mutation=label):
                before, before_notes = digest(c), digest(notes)
                with self.assertRaises(ValueError): self.wrapper.repair(c, notes, self.source)
                self.assertEqual(digest(c), before)
                self.assertEqual(digest(notes), before_notes)
        with tempfile.TemporaryDirectory(prefix='pali-four-xml-') as temp:
            p = Path(temp) / 'romn'
            p.mkdir()
            (p / 's0510m1.mul.xml').write_bytes(self.raw + b'\x20\x00')
            c, notes = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
            before, before_notes = digest(c), digest(notes)
            # Pin failure must happen before any XML parser is invoked.
            with mock.patch.object(self.wrapper.vri, 'parse', side_effect=AssertionError('parser invoked before raw pin refusal')):
                with self.assertRaisesRegex(ValueError, 'XML Git blob differs'):
                    self.wrapper.repair(c, notes, temp)
            self.assertEqual(digest(c), before)
            self.assertEqual(digest(notes), before_notes)

if __name__ == '__main__':
    unittest.main()
