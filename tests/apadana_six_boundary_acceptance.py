"""Six-record source/migration regression proposal; independent sealed expectations.

No private records are read or migrated. The Node wrapper supplies hard deadlines;
OriginalSource additionally requires the exact public VRI source checkout.
"""
import ast
import base64
import copy
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts/canon'))
import apadana_thera340_spans as six
sys.path.insert(0, str(ROOT / 'scripts'))
from web_reader_next_ten_boundary_history import dd_logical_input
from web_reader_approved_acceptance import approved_catalogue, approved_runtime, assert_catalogue, assert_runtime
from web_reader_intake359 import AP_FIXTURE

OLD_SHA = '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8'
NEW_SHA = '0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
REV = 'apadana-thera340-341-343-344-346-347-v1'
PINS = {
    'FUTURE_ORACLE.json': '01bc011f958165274ce1a09850dd5cbe4f495a14242c7b96e3fd4ab0e152c397',
    'ALL89_CROSSWALK.json': '44a8271cab60fd3fdc5e11580252f6e4ab518a39b3c76924c01a56416e232834',
    'READER_ORACLES.json': '69e6f7c66480e5b40ddc554ab863d5fb8ac0341b8c7f280ebd9f64bbd4a84516',
    'PRESERVATION_ORACLES.json': '51f9042cd3054bfdb03299fa2ff4909b85d4cb4b97a75d102a3b2045d8b384b6',
    'POSITIONAL_POLICY_ORACLES.json': '3611e202e54b1470342e7755680adf72b0c7e6c7288fed0487990c2ab1e09571',
}
def compact(v): return json.dumps(v, ensure_ascii=False, separators=(',', ':')).encode()
def sha(v): return hashlib.sha256(v).hexdigest()
def digest(v): return sha(compact(v))
def typed(v): return json.dumps(v, ensure_ascii=False, sort_keys=True)
def records(c, ids): return {k: next(u for u in c['units'] if u['id'] == k) for k in ids}
def bundled(name):
    path = ROOT / 'server/data' / name
    if path.exists():
        packed = path.read_bytes()
    else:
        manifest = json.loads(Path(str(path) + '.parts.json').read_bytes())
        pieces = []
        for p in manifest['parts']:
            b = (path.parent / p['file']).read_bytes()
            assert len(b) == p['size'] and sha(b) == p['sha256']
            pieces.append(b)
        packed = b''.join(pieces)
        assert len(packed) == manifest['size'] and sha(packed) == manifest['sha256']
    return gzip.decompress(packed)
def parsed_books(c):
    blocks = [dict(rend=r, n=n, text=t, notes=copy.deepcopy(ns),
                   pages={k: [tuple(map(int, p.split('.'))) for p in ps] for k, ps in pages.items()})
              for r, n, t, ns, pages in c['books'][36]['blocks']]
    return [dict(b, blocks=blocks if i == 36 else []) for i, b in enumerate(c['books'])]

# Independent source grouping contract, not the metadata repair implementation.
def source_preview(u, tuples):
    headings = {'subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead'}
    verse_kinds = {'gatha1', 'gatha2', 'gatha3', 'gathalast'}
    centre = re.compile(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$', re.I)
    out, stanza = [], None
    def flush():
        nonlocal stanza
        if stanza is not None:
            out.append(stanza)
            stanza = None
    for i in range(u['start'], u['end']):
        rend, n, text, notes, pages = tuples[i]
        if rend == 'hangnum':
            flush()
            stanza = dict(type='verse', vri_paragraph=n, text='', source_blocks=[i, i + 1], notes=[])
        elif rend in verse_kinds:
            if stanza is None:
                stanza = dict(type='verse', vri_paragraph=n, text='', source_blocks=[i, i + 1], notes=[])
            stanza['text'] += ('\n' if stanza['text'] else '') + text
            stanza['source_blocks'][1] = i + 1
            stanza['notes'].extend(notes)
            if rend == 'gathalast': flush()
        else:
            flush()
            if text:
                out.append(dict(type='heading' if rend in headings or rend == 'centre' and centre.search(text) else 'prose',
                    vri_paragraph=n, text=text, source_blocks=[i, i + 1], notes=notes))
    flush()
    return [dict(ref=u['id'] + '/' + str(i + 1), uid=u['id'], offset=i, segment_index0=i,
        type=s['type'], vri_paragraph=s['vri_paragraph'], source_blocks=s['source_blocks'],
        text_sha256=sha(s['text'].encode()), text_utf16_length=len(s['text'].encode('utf-16-le')) // 2,
        source_note_sha256=[sha(n.encode()) for n in s['notes']], source_notes_sha256=digest(s['notes']),
        variant_reading_count=len(s['notes'])) for i, s in enumerate(out)]

# Closed, original343 source-code inputs. These are not application/API reads.
HISTORICAL_PROFILE_SOURCE_PATHS = (
    'src/apadana-profiles.mjs', 'src/apadana-thera-profiles.mjs',
    'src/apadana-thera261-280-profiles.mjs', 'src/apadana-thera281-285-profiles.mjs',
    'src/apadana-thera287-288-profiles.mjs', 'src/apadana-thera292-299-profiles.mjs',
    'src/apadana-thera301-310-profiles.mjs', 'src/apadana-thera312-319-profiles.mjs',
    'src/apadana-thera321-329-profiles.mjs', 'src/apadana-thera331-334-profiles.mjs',
)


def historical_profile_source_inputs():
    """One bounded Node source-only inverse; unknown bytes meet old SHA checks.

    The reviewed JS decoder physically verifies its independent map/index and
    performs unique literal hunks plus complete3d SHA checks. No unchecked
    Python reimplementation or historical runtime response projection is used.
    """
    program = r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {current3dSourceInput} = await import(pathToFileURL(resolve('tests/helpers/intake359-source-input.mjs')));
const names = JSON.parse(process.argv[1]);
const expected = ['src/apadana-profiles.mjs','src/apadana-thera-profiles.mjs','src/apadana-thera261-280-profiles.mjs','src/apadana-thera281-285-profiles.mjs','src/apadana-thera287-288-profiles.mjs','src/apadana-thera292-299-profiles.mjs','src/apadana-thera301-310-profiles.mjs','src/apadana-thera312-319-profiles.mjs','src/apadana-thera321-329-profiles.mjs','src/apadana-thera331-334-profiles.mjs'];
assert.deepEqual(names,expected,'Exact original343 source-file closure');
let total = 0;
const result = {};
for (const name of names) {
    const raw = readFileSync(resolve(name));
    assert.ok(raw.length <= 2 * 1024 * 1024,'Bounded public source file');
    const before = Buffer.from(current3dSourceInput(name,raw.toString('utf8')),'utf8');
    total += before.length;
    assert.ok(total <= 3 * 1024 * 1024,'Bounded closed source-file output');
    result[name] = before.toString('base64');
}
process.stdout.write(JSON.stringify(result));
"""
    result = subprocess.run(['node', '--input-type=module', '-e', program,
        json.dumps(HISTORICAL_PROFILE_SOURCE_PATHS)], cwd=ROOT, capture_output=True,
        encoding='utf-8', timeout=20,
        env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
    assert result.returncode == 0, 'Bounded source-only inverse failed: ' + result.stderr
    assert not result.stderr and len(result.stdout.encode('utf-8')) <= 5 * 1024 * 1024
    decoded = json.loads(result.stdout)
    assert list(decoded) == list(HISTORICAL_PROFILE_SOURCE_PATHS)
    return {name: base64.b64decode(value, validate=True) for name, value in decoded.items()}


class Fixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proofs = {}
        for name, pin in PINS.items():
            b = (ROOT / 'docs/evidence/apadana/boundaries340-347' / name).read_bytes()
            assert sha(b) == pin, 'Independent six-boundary proof changed: ' + name
            cls.proofs[name] = json.loads(b)
        cls.proof = cls.proofs['FUTURE_ORACLE.json']
        cls.map = cls.proofs['ALL89_CROSSWALK.json']
        cls.reader = cls.proofs['READER_ORACLES.json']
        cls.preserve = cls.proofs['PRESERVATION_ORACLES.json']['preservation']
        cls.ids = tuple(cls.proof['targets'])
        # Verify genuine current359 metadata and physical current34 first.
        # Only afterwards obtain the separate pinned historical343 QA inputs.
        current359 = approved_catalogue(ROOT)
        assert len(current359['ids']) == len(current359['profiles']) == len(current359['links']) == 359
        assert_catalogue(json.loads((ROOT / 'server/data/apadana.json').read_bytes()), current359)
        runtime359 = approved_runtime(ROOT)
        assert len(runtime359) == 34
        assert assert_runtime(ROOT, ROOT / 'server') == {name: row['sha256'] for name, row in runtime359.items()}
        cls.historical_ap343 = (ROOT / AP_FIXTURE).read_bytes()
        assert sha(cls.historical_ap343) == cls.preserve['apadana_metadata_file_sha256']
        assert tuple(cls.preserve['all10_profile_source_files_exact']) == HISTORICAL_PROFILE_SOURCE_PATHS
        cls.historical_profile_sources = historical_profile_source_inputs()
        assert cls.ids == ('tha-ap340', 'tha-ap341', 'tha-ap343', 'tha-ap344', 'tha-ap346', 'tha-ap347')
        cls.old_records = {r['id']: r['before'] for r in cls.proof['records']}
        cls.new_records = {r['id']: r['future'] for r in cls.proof['records']}
        # This preserved six-repair suite owns the exact DD stage. The outer
        # gate first verifies the complete new snapshot before returning DD
        # test-input bytes; current ten-reader tests use the actual new data.
        raw = dd_logical_input(bundled('canon.json.gz'), ROOT)
        assert sha(raw) == NEW_SHA, 'Exact actual six-record current canon required'
        cls.current = json.loads(raw)
        assert typed(records(cls.current, cls.ids)) == typed(cls.new_records)
        # Old expectation comes from independent literals, never the inverse under test.
        cls.old = dict(cls.current, units=[copy.deepcopy(cls.old_records[u['id']]) if u['id'] in cls.ids else u
                                         for u in cls.current['units']])
        assert digest(cls.old) == OLD_SHA
        cls.books = parsed_books(cls.old)
    def small(self, new=False):
        wanted = set(self.ids) | set(six.NEIGHBOUR_SPANS)
        return copy.deepcopy([u for u in (self.current if new else self.old)['units'] if u['id'] in wanted])
    def reject_gate(self, books, units):
        before_books, before_units = digest(books), digest(units)
        with self.assertRaises(ValueError): six.apadana_thera340_spans(books, units)
        self.assertEqual(digest(books), before_books)
        self.assertEqual(digest(units), before_units)

class SixBoundaryData(Fixture):
    def test_01_independent_exact_six_records_inverse_and_preservation(self):
        self.assertEqual(typed(six.OLD_UNITS), typed(self.old_records))
        self.assertEqual(typed(six.NEW_UNITS), typed(self.new_records))
        self.assertEqual(six.TARGETS, self.ids)
        self.assertEqual((six.REVISION, len(six.REVISION)), (REV, 39))
        self.assertEqual(six.PRE_SIX_SHA256, OLD_SHA)
        self.assertEqual(six.POST_SIX_SHA256, NEW_SHA)
        snapshot = digest(self.current)
        inverse = six.canon_before_thera340(self.current)
        self.assertEqual(digest(inverse), OLD_SHA)
        self.assertEqual(inverse, self.old)
        self.assertEqual(digest(self.current), snapshot)
        self.assertEqual(digest(self.current['books']), self.preserve['all61_books_sha256'])
        self.assertEqual(len(self.current['books']), 61)
        other = [u for u in self.current['units'] if u['id'] not in self.ids]
        self.assertEqual(len(other), 8538)
        self.assertEqual(digest(other), self.preserve['other8538_unit_records_ordered_sha256'])
        self.assertEqual(digest(self.current['source']), self.preserve['source_policy_sha256'])
        self.assertEqual(digest(self.current['books'][36]['blocks']), six.ROOT_BLOCKS_SHA256)
        cat = self.historical_ap343
        self.assertEqual(sha(cat), self.preserve['apadana_metadata_file_sha256'])
        self.assertEqual(len(json.loads(cat)['links']), 343)
        for name, r in self.preserve['all10_profile_source_files_exact'].items():
            b = self.historical_profile_sources[name]
            self.assertEqual((len(b), sha(b)), (r['bytes'], r['sha256']))

    def test_02_atomic_all_six_output_idempotence_and_three_source_unions(self):
        units = copy.deepcopy(self.old['units'])
        before_books = digest(self.books)
        self.assertEqual(six.apadana_thera340_spans(self.books, units), list(self.ids))
        self.assertEqual(digest(dict(self.old, units=units)), NEW_SHA)
        self.assertEqual(six.apadana_thera340_spans(self.books, units), [])
        self.assertEqual(digest(dict(self.old, units=units)), NEW_SHA)
        self.assertEqual(digest(self.books), before_books)
        for left, right in zip(self.ids[::2], self.ids[1::2]):
            a, b = self.new_records[left], self.new_records[right]
            self.assertEqual(a['end'], b['start'])
            self.assertEqual(list(range(a['start'], a['end'])) + list(range(b['start'], b['end'])),
                             list(range(self.old_records[left]['start'], self.old_records[right]['end'])))
        for uid in self.ids[1::2]:
            self.assertEqual(self.new_records[uid]['title'], self.old_records[uid]['title'] + 'ṃ')

    def test_03_all89_source_segments_notes_and_crosswalk_categories(self):
        tuples = self.current['books'][36]['blocks']
        old = [s for uid in self.ids for s in source_preview(self.old_records[uid], tuples)]
        new = [s for uid in self.ids for s in source_preview(self.new_records[uid], tuples)]
        self.assertEqual((len(old), len(new)), (89, 89))
        actual_map = self.map['records']
        self.assertEqual(len(actual_map), 89)
        by_span = {tuple(s['source_blocks']): s for s in new}
        self.assertEqual(len(by_span), 89)
        by_ref = {s['ref']: s for s in new}
        counts = {}
        for s, sealed in zip(old, actual_map):
            dest = by_span[tuple(s['source_blocks'])]
            for k in s:
                self.assertEqual(s[k], sealed['old'][k])
                self.assertEqual(dest[k], sealed['future_exact_source_owner'][k])
            for k in ('type', 'vri_paragraph', 'source_blocks', 'text_sha256', 'source_notes_sha256', 'source_note_sha256'):
                self.assertEqual(s[k], dest[k])
            current = by_ref.get(s['ref'])
            category = ('VANISHED_OLD_OWNER_REF' if current is None else
                'SAME_NUMERIC_REF_DIFFERENT_SOURCE' if current['source_blocks'] != s['source_blocks'] else
                'SAME_NUMERIC_REF_AND_SOURCE_STILL_REQUIRES_NEW_PIN')
            self.assertEqual(category, sealed['category'])
            self.assertIs(sealed['require_new_pin_for_old_position'], True)
            self.assertIs(sealed['automatic_private_data_or_export_migration_authorized'], False)
            counts[category] = counts.get(category, 0) + 1
        self.assertEqual(counts, self.map['category_counts'])
        self.assertEqual(sorted(counts.values()), [6, 38, 45])
        self.assertEqual(sum(s['variant_reading_count'] for s in old), 17)

    def test_04_all62_mixed_closed_states_reject_before_mutation(self):
        for mask in range(1, 63):
            rows = self.small()
            for i, uid in enumerate(self.ids):
                if mask & (1 << i):
                    rows[rows.index(next(u for u in rows if u['id'] == uid))] = copy.deepcopy(self.new_records[uid])
            with self.subTest(mask=mask): self.reject_gate(self.books, rows)

    def test_05_exact_types_fields_missing_duplicate_and_foreign_revisions(self):
        mutations = [lambda rows, u: rows.remove(u), lambda rows, u: rows.append(copy.deepcopy(u)),
            lambda rows, u: u.update(title=u['title'] + 'x'), lambda rows, u: u.update(vri='foreign'),
            lambda rows, u: u.update(start=float(u['start'])), lambda rows, u: u.update(book=True),
            lambda rows, u: u.update(start=True), lambda rows, u: u.update(end=u['end'] + 1),
            lambda rows, u: u['pts'].update(volume=True), lambda rows, u: u['pts'].update(page=float(u['pts']['page'])),
            lambda rows, u: u.pop('pts'), lambda rows, u: u.update(index_revision='foreign'),
            lambda rows, u: u.update(unreviewed=False)]
        for new in (False, True):
            for uid in self.ids:
                for index, mutate in enumerate(mutations):
                    with self.subTest(new=new, uid=uid, mutation=index):
                        rows = self.small(new);mutate(rows, next(u for u in rows if u['id'] == uid))
                        self.reject_gate(self.books, rows)
                        c = dict(source=self.current['source'], units=rows)
                        before = digest(c)
                        with self.assertRaises(ValueError): six.canon_before_thera340(c)
                        self.assertEqual(digest(c), before)

    def test_06_fullbook_neighbours_and_dependency_refusals(self):
        for label in ('word', 'note', 'page', 'wrong_book', 'duplicate_book', 'neighbour', 'range', 'shared', 'member'):
            with self.subTest(mutation=label):
                books, rows = copy.deepcopy(self.books), self.small()
                if label == 'word': books[36]['blocks'][-1]['text'] += 'x'
                elif label == 'note': books[36]['blocks'][-1]['notes'].append('SYNTHETIC')
                elif label == 'page': books[36]['blocks'][-1]['pages']['P'] = [(99, 999)]
                elif label == 'wrong_book': books[35], books[36] = books[36], books[35]
                elif label == 'duplicate_book': books.append(copy.deepcopy(books[36]))
                elif label == 'neighbour': next(u for u in rows if u['id'] == 'tha-ap342')['end'] += 1
                elif label == 'range': next(u for u in rows if u['id'] == 'tha-ap345')['kind'] = 'range'
                elif label == 'shared': rows.append(dict(id='synthetic', shares_passage_with=self.ids[0]))
                elif label == 'member': rows.append(dict(id='synthetic', members=[self.ids[-1]]))
                self.reject_gate(books, rows)

    def test_07_explicit_inverse_retains_unrelated_mutations_and_old_namespaces(self):
        c = dict(self.current, units=self.small(True), synthetic={'local': True})
        next(u for u in c['units'] if u['id'] == 'tha-ap342')['end'] += 1
        before = digest(c)
        out = six.canon_before_thera340(c)
        self.assertEqual(next(u for u in out['units'] if u['id'] == 'tha-ap342'),
                         next(u for u in c['units'] if u['id'] == 'tha-ap342'))
        self.assertEqual(out['synthetic'], c['synthetic'])
        self.assertEqual(digest(c), before)
        self.assertNotEqual(digest(out), OLD_SHA)
        c = dict(self.current, source=dict(self.current['source'], commit='foreign'))
        with self.assertRaises(ValueError): six.canon_before_thera340(c)
        current = records(self.current, ('tha-ap107', 'tha-ap108', 'tha-ap333', 'tha-ap334', 'tha-ap335', 'tha-ap336'))
        self.assertTrue(all(u['index_revision'] == ('apadana-thera105-106-v1' if k in ('tha-ap107', 'tha-ap108') else 'apadana-thera333-336-v1') for k, u in current.items()))

    def test_08_preannotation_all_or_no_pts_and_omitted_source_book(self):
        rows = self.small()
        for u in rows:
            if u['id'] in self.ids: u.pop('pts')
        self.assertEqual(six.six_state(rows, before_annotation=True), 'old')
        with self.assertRaises(ValueError): six.six_state(rows)
        self.assertEqual(six.apadana_thera340_spans(self.books, rows), list(self.ids))
        self.assertEqual(six.six_state(rows, before_annotation=True), 'new')
        self.assertTrue(all('pts' not in u for u in rows if u['id'] in self.ids))
        self.assertEqual(six.apadana_thera340_spans(self.books, rows), [])
        partial = self.small();next(u for u in partial if u['id'] == self.ids[0]).pop('pts')
        self.reject_gate(self.books, partial)
        untouched = self.small();pin = digest(untouched)
        self.assertEqual(six.apadana_thera340_spans([dict(file='other.xml', blocks=[])], untouched), [])
        self.assertEqual(digest(untouched), pin)

    def test_09_build_hook_unique_after_prior_repairs_before_annotation(self):
        tree = ast.parse((ROOT / 'scripts/canon/build_canon.py').read_text(encoding='utf-8'))
        imports = [n for n in tree.body if isinstance(n, ast.ImportFrom) and n.module == 'apadana_thera340_spans']
        self.assertEqual(len(imports), 1)
        self.assertEqual([x.name for x in imports[0].names], ['apadana_thera340_spans'])
        main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
        calls = [n for n in ast.walk(main) if isinstance(n, ast.Call)]
        named = lambda name: [n for n in calls if isinstance(n.func, ast.Name) and n.func.id == name]
        self.assertEqual(len(named('apadana_thera340_spans')), 1)
        hook = named('apadana_thera340_spans')[0]
        self.assertEqual(ast.unparse(hook), 'apadana_thera340_spans(b.books, b.units)')
        self.assertLess(named('apadana_thera333_spans')[0].lineno, hook.lineno)
        self.assertLess(hook.lineno, named('thag_sixteen_spans')[0].lineno)
        numbering = [n for n in ast.walk(main) if isinstance(n, ast.Assign) and any(isinstance(t, ast.Subscript) and isinstance(t.slice, ast.Constant) and t.slice.value == 'vri' for t in n.targets)]
        self.assertEqual(len(numbering), 1);self.assertLess(hook.lineno, numbering[0].lineno)
        pages = [n for n in calls if isinstance(n.func, ast.Attribute) and n.func.attr == 'annotate_pages']
        self.assertEqual(len(pages), 1);self.assertLess(hook.lineno, pages[0].lineno)

    def test_10_all_old89_positions_require_pin_and_synthetic_export_stays_raw(self):
        policy = self.proofs['POSITIONAL_POLICY_ORACLES.json']
        rows = policy['policy_for_all_old89_positions']
        self.assertEqual([r['old_ref'] for r in rows], [r['old']['ref'] for r in self.map['records']])
        self.assertEqual(len(rows), 89)
        self.assertTrue(all(r['all_old_positions_require_current_pin'] and r['same_number_does_not_authorize_rebinding'] and not r['migration_authorized'] for r in rows))
        self.assertTrue(all(r['future_locator_revision'] == six.COMMIT + '-' + REV for r in rows))
        vector = policy['synthetic_export_vector']
        self.assertIs(vector['before_after_required_exact_bytes'], True)
        self.assertIs(vector['does_not_define_or_change_application_export_schema'], True)
        self.assertIs(policy['no_automatic_personal_data_or_export_migration'], True)

class OriginalSource(Fixture):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.source = Path(os.environ['VRI_SOURCE_CHECKOUT'])
        cls.xml = (cls.source / 'romn/s0510m1.mul.xml').read_bytes()
        pin = cls.proof['original_xml']
        assert sha(cls.xml) == pin['sha256']
        assert hashlib.sha1(b'blob ' + str(len(cls.xml)).encode() + b'\0' + cls.xml).hexdigest() == pin['git_blob_sha1']
        b = bundled('commentary.json.gz')
        assert sha(b) == cls.preserve['commentary_raw_logical_sha256']
        cls.commentary = json.loads(b)
        import repair_apadana_thera340_spans
        cls.wrapper = repair_apadana_thera340_spans

    def test_11_real_original_wrapper_preserves_everything_and_is_idempotent(self):
        c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
        notes_pin, books_pin = digest(commentary), digest(c['books'])
        report = self.wrapper.repair(c, commentary, self.source)
        self.assertEqual(digest(c), NEW_SHA)
        self.assertEqual(report['changed_units'], list(self.ids))
        self.assertEqual((report['input_sha256'], report['historical_inverse_sha256'], report['output_sha256']), (OLD_SHA, OLD_SHA, NEW_SHA))
        self.assertEqual(report['preserved_other_units'], 8538)
        self.assertEqual((report['commentary_changes'], report['english_activations'], report['rights_changes']), (0, 0, 0))
        self.assertIs(report['private_data_accessed'], False)
        self.assertEqual(report['accepted_commentary_intersections_with_moved_prefixes'], 0)
        for r in self.proof['records']:
            actual = report['units'][r['id']]
            self.assertEqual(actual['before'], r['before']);self.assertEqual(actual['after'], r['future'])
            self.assertEqual(actual['root_sha256'], r['future_root_sha256'])
            self.assertEqual(actual['after']['pts'], r['future']['pts'])
        self.assertEqual(digest(commentary), notes_pin);self.assertEqual(digest(c['books']), books_pin)
        again = self.wrapper.repair(c, commentary, self.source)
        self.assertEqual(again['changed_units'], [])
        self.assertEqual((again['input_sha256'], again['output_sha256']), (NEW_SHA, NEW_SHA))
        self.assertEqual(digest(c), NEW_SHA);self.assertEqual(digest(commentary), notes_pin)

    def test_12_global_source_rights_commentary_raw_and_pts_refusals_are_atomic(self):
        for label in ('unrelated_unit', 'book_word', 'rights', 'commit', 'mixed', 'commentary'):
            c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
            if label == 'unrelated_unit': c['units'][0]['title'] += 'x'
            elif label == 'book_word': c['books'][0]['blocks'][0][2] += 'x'
            elif label == 'rights': c['source']['terms'] += 'x'
            elif label == 'commit': c['source']['commit'] = 'foreign'
            elif label == 'mixed': c['units'] = [copy.deepcopy(self.new_records[u['id']]) if u['id'] == self.ids[0] else u for u in c['units']]
            elif label == 'commentary': commentary['synthetic'] = True
            with self.subTest(label=label):
                before, notes = digest(c), digest(commentary)
                with self.assertRaises(ValueError): self.wrapper.repair(c, commentary, self.source)
                self.assertEqual(digest(c), before);self.assertEqual(digest(commentary), notes)
        with tempfile.TemporaryDirectory(prefix='pali-six-original-') as temp:
            source = Path(temp);(source / 'romn').mkdir()
            (source / 'romn/s0510m1.mul.xml').write_bytes(self.xml + b'\x20\x00')
            c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
            before, notes = digest(c), digest(commentary)
            with mock.patch.object(self.wrapper.vri, 'parse', side_effect=AssertionError('parser must not run')):
                with self.assertRaises(ValueError): self.wrapper.repair(c, commentary, source)
            self.assertEqual((digest(c), digest(commentary)), (before, notes))
        c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
        before = digest(c)
        def wrong_pts(builder):
            for u in builder.units: u['pts'] = dict(volume=99, page=999, end_page=999)
        with mock.patch.object(self.wrapper.Builder, 'annotate_pages', wrong_pts):
            with self.assertRaises(ValueError): self.wrapper.repair(c, commentary, self.source)
        self.assertEqual(digest(c), before)

    def test_13_cli_refuses_existing_or_aliased_output_without_overwrite(self):
        script = ROOT / 'scripts/canon/repair_apadana_thera340_spans.py'
        with tempfile.TemporaryDirectory(prefix='pali-six-cli-') as temp:
            d = Path(temp);out = d / 'out.gz';out.write_bytes(b'SYNTHETIC_KEEP_EXACT')
            args = [str(d / 'old.gz'), str(d / 'commentary.gz'), str(self.source), str(out)]
            result = subprocess.run([sys.executable, '-B', str(script), *args], cwd=ROOT,
                capture_output=True, encoding='utf-8', timeout=20,
                env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(out.read_bytes(), b'SYNTHETIC_KEEP_EXACT')
            self.assertIn('Output must be a new file', result.stderr)
            args[-1] = args[0]
            result = subprocess.run([sys.executable, '-B', str(script), *args], cwd=ROOT,
                capture_output=True, encoding='utf-8', timeout=20,
                env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1'})
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((d / 'old.gz').exists())

if __name__ == '__main__':
    unittest.main()
