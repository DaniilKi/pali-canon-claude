"""Finite next-ten source/metadata gates against independently sealed expectations.

This file does not project public tool output into an expected dataset. The installed
canon must be the exact independently sealed new snapshot; the historical input
uses only the independently sealed ten old records. No private data is opened.
"""
import ast
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
import apadana_thera_next10_spans as ten
sys.path.insert(0, str(ROOT / 'scripts'))
import web_reader_intake359 as intake359

OLD_SHA = '0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
NEW_SHA = 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
REV = 'apadana-thera-next10-v1'
COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
IDS = ('tha-ap348', 'tha-ap349', 'tha-ap374', 'tha-ap375', 'tha-ap423',
       'tha-ap424', 'tha-ap426', 'tha-ap427', 'tha-ap428', 'tha-ap429')
FILES = {36: 's0510m1.mul.xml', 37: 's0510m2.mul.xml'}
PROOFDIR = ROOT / 'docs/evidence/apadana/boundaries-next-ten'
PINS = {
    'FUTURE_ORACLE.json': '78fd34efd9942bb363010123f4019cfa31df3b609fbd3736d2db7288c2036655',
    'OLD_TEN_RECORDS.json': 'cce5323b93fc6be3a415e9fb75146d8f1e1696ce7530d2634286d00bebff6255',
    'NEW_TEN_RECORDS.json': 'c0a008965acd462b45dcf35eaf8e19abd6246f36a9c64fbb4cab5d4fd16962b0',
    'POSITION_CROSSWALK144.json': '223bc745f40774b50f41df41073f1b7f8c67b8eb4067ef28556dd4bb22ac439f',
    'SOURCE340_BLOCKS.json': '74900c763c50311ce6a6c9d1b9fbfca46c19b2c1bd42bfbe3f9624db7ed874f0',
    'ORACLE_COMPLETION.json': '180d5f87e280ef773a5043d85b00c4f94fe89a02bbe3f040dde0658b7ae30648',
    'FINAL_ORACLE_SEAL.json': 'fb1e29730c4208ea866ab23cd1eb35d5c85d1658a33037933be756bfdef841d9',
}
SIX_HELPER_SHA = '1ffaf4393d7e20d675eaa29494ce5a45c4e5ea55902ef3a18c84639fe8e52f92'
PARALLELS_ORACLE_PIN = '4084bbdef09f0ed32476f4375efbbd7eeb1b03156ce040ef0fe2e31737624530'
PARALLELS_BINDING_PIN = '01306700c035b59cfde2d856b3f62f9c9a2a2276ad711b9a288a271d39019a79'
PARALLELS_PROOFDIR = PROOFDIR / 'parallels-independent'


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def digest(value):
    return sha(compact(value))


def typed(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def selected(canon, ids=IDS):
    return {uid: next(u for u in canon['units'] if u['id'] == uid) for uid in ids}


def packed_bundle(name):
    path = ROOT / 'server/data' / name
    if path.exists():
        packed = path.read_bytes()
    else:
        manifest = json.loads(Path(str(path) + '.parts.json').read_bytes())
        pieces = []
        for part in manifest['parts']:
            raw = (path.parent / part['file']).read_bytes()
            assert (len(raw), sha(raw)) == (part['size'], part['sha256'])
            pieces.append(raw)
        packed = b''.join(pieces)
        assert (len(packed), sha(packed)) == (manifest['size'], manifest['sha256'])
    return packed


def bundled(name):
    return gzip.decompress(packed_bundle(name))


def parsed_books(canon):
    result = []
    for bi, book in enumerate(canon['books']):
        blocks = []
        if bi in FILES:
            blocks = [dict(rend=r, n=n, text=t, notes=copy.deepcopy(notes),
                           pages={ed: [tuple(map(int, p.split('.'))) for p in pages]
                                  for ed, pages in markers.items()})
                      for r, n, t, notes, markers in book['blocks']]
        result.append(dict(book, blocks=blocks))
    return result


def profiles_from_compiled_metadata():
    """Decode data literals, never import/run the compiled server or its output."""
    code = (ROOT / 'server/index.cjs').read_text(encoding='utf-8')
    decoder, profiles = json.JSONDecoder(), {}

    def decode(tail):
        return decoder.raw_decode(re.sub(r'\\x([0-9a-fA-F]{2})', r'\\u00\1', tail))[0]

    for name in ('THERI_APADANA_PROFILES', 'THERA_APADANA_PROFILES'):
        match = re.search(r'var ' + name + r'\s*=\s*deepFreeze\d*\(', code)
        assert match, 'Missing exact metadata literal: ' + name
        tail = code[match.end():]
        if name == 'THERI_APADANA_PROFILES':
            value = decode(tail)
        else:
            spread = re.search(r'\n\s*\.\.\.(THERA_[A-Z0-9_]+)', tail)
            assert spread
            value = decode(tail[:spread.start()].rstrip().removesuffix(',') + '\n}')
            end = re.search(r'\n\s*}\);', tail[spread.start():])
            assert end
            names = re.findall(r'\.\.\.(THERA_[A-Z0-9_]+)',
                               tail[spread.start():spread.start() + end.start()])
            assert names == ['THERA_261_280_PROFILES', 'THERA_281_285_PROFILES',
                'THERA_287_288_PROFILES', 'THERA_292_299_PROFILES', 'THERA_301_310_PROFILES',
                'THERA_312_319_PROFILES', 'THERA_321_329_PROFILES', 'THERA_331_334_PROFILES',
                'THERA_335_350_PROFILES']
            for nested in names:
                match = re.search(r'var ' + nested + r'\s*=\s*(?:deepFreeze\d*\()?\s*', code)
                assert match
                rows = decode(code[match.end():])
                assert not set(value).intersection(rows)
                value.update(rows)
        assert not set(profiles).intersection(value)
        profiles.update(value)
    return profiles


def source_positions(unit, tuples):
    """Independent finite grouping; expectations come from the sealed crosswalk."""
    heading = {'subhead', 'title', 'chapter', 'book', 'nikaya', 'subsubhead'}
    verse = {'gatha1', 'gatha2', 'gatha3', 'gathalast'}
    centre = re.compile(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$', re.I)
    out, stanza = [], None

    def flush():
        nonlocal stanza
        if stanza is not None:
            out.append(stanza)
            stanza = None

    for i in range(unit['start'], unit['end']):
        rend, n, text, notes, _pages = tuples[i]
        if rend == 'hangnum':
            flush()
            stanza = dict(type='verse', n=n, text='', span=[i, i + 1], notes=[])
        elif rend in verse:
            if stanza is None:
                stanza = dict(type='verse', n=n, text='', span=[i, i + 1], notes=[])
            stanza['text'] += ('\n' if stanza['text'] else '') + text
            stanza['span'][1] = i + 1
            stanza['notes'].extend(notes)
            if rend == 'gathalast':
                flush()
        else:
            flush()
            if text:
                kind = 'heading' if rend in heading or rend == 'centre' and centre.search(text) else 'prose'
                out.append(dict(type=kind, n=n, text=text, span=[i, i + 1], notes=notes))
    flush()
    result = []
    for offset, row in enumerate(out):
        s = dict(uid=unit['id'], offset=offset, ref=unit['id'] + '/' + str(offset + 1),
            type=row['type'], source_blocks=row['span'], text_sha256=sha(row['text'].encode()),
            text_utf16_length=len(row['text'].encode('utf-16-le')) // 2,
            notes_sha256=digest(row['notes']), note_count=len(row['notes']))
        if row['n']:
            s['vri_paragraph'] = row['n']
        if row['notes']:
            s['note_text_sha256'] = [sha(n.encode()) for n in row['notes']]
        result.append(s)
    return result


class Fixture(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proofs = {}
        for name, pin in PINS.items():
            raw = (PROOFDIR / name).read_bytes()
            assert sha(raw) == pin, 'Independent next-ten proof changed: ' + name
            cls.proofs[name] = json.loads(raw)
        cls.proof = cls.proofs['FUTURE_ORACLE.json']
        cls.preserve = cls.proof['preservation']
        cls.crosswalk = cls.proofs['POSITION_CROSSWALK144.json']
        cls.old_records = cls.proofs['OLD_TEN_RECORDS.json']
        cls.new_records = cls.proofs['NEW_TEN_RECORDS.json']
        assert tuple(cls.proof['targets']) == IDS
        assert tuple(cls.old_records) == tuple(cls.new_records) == IDS
        raw = bundled('canon.json.gz')
        assert sha(raw) == NEW_SHA, 'Require exact independently sealed actual new canon'
        cls.current = json.loads(raw)
        assert typed(selected(cls.current)) == typed(cls.new_records)
        # Historical fixtures are independent old literals, never the SUT inverse.
        cls.old = dict(cls.current, units=[copy.deepcopy(cls.old_records[u['id']])
            if u['id'] in cls.old_records else u for u in cls.current['units']])
        assert digest(cls.old) == OLD_SHA
        cls.books = parsed_books(cls.old)
        prior = set(cls.preserve['all_prior_namespaces'])
        neighbours = {'tha-ap347', 'tha-ap350', 'tha-ap373', 'tha-ap376',
                      'tha-ap422', 'tha-ap425', 'tha-ap430'}
        cls.small_ids = set(IDS) | prior | neighbours

    def rows(self, new=False):
        return copy.deepcopy([u for u in (self.current if new else self.old)['units']
                              if u['id'] in self.small_ids])

    def reject(self, books, rows, reason=None):
        before = digest(rows)
        with self.assertRaisesRegex(ValueError, reason or '.'):
            ten.apadana_thera_next10_spans(books, rows)
        self.assertEqual(digest(rows), before, 'A rejected repair changed canonical metadata')


class NextTenBoundaryData(Fixture):
    def test_01_exact_sealed_before_after_pure_inverse(self):
        self.assertEqual(typed(ten.OLD_UNITS), typed(self.old_records))
        self.assertEqual(typed(ten.NEW_UNITS), typed(self.new_records))
        self.assertEqual(ten.TARGETS, IDS)
        self.assertEqual((ten.PRE_NEXT10_SHA256, ten.POST_NEXT10_SHA256), (OLD_SHA, NEW_SHA))
        self.assertEqual((ten.REVISION, len(ten.REVISION)), (REV, 23))
        self.assertEqual((ten.COMMIT, len(ten.COMMIT + '-' + REV)), (COMMIT, 64))
        before = digest(self.current)
        inverse = ten.canon_before_next10(self.current)
        self.assertEqual(inverse, self.old)
        self.assertEqual(digest(inverse), OLD_SHA)
        self.assertEqual(digest(self.current), before)
        self.assertEqual(ten.next10_state(self.old['units']), 'old')
        self.assertEqual(ten.next10_state(self.current['units']), 'new')

    def test_02_full_books_other8534_source_and_all_prior_namespaces_unchanged(self):
        self.assertEqual((len(self.current['books']), len(self.current['units'])), (61, 8544))
        self.assertEqual(digest(self.current['books']), self.preserve['all61_books_sha256'])
        other = [u for u in self.current['units'] if u['id'] not in IDS]
        self.assertEqual(len(other), 8534)
        self.assertEqual(digest(other), self.preserve['full_other8534_records_sha256'])
        self.assertEqual(digest(self.current['source']), self.preserve['canonical_source_object_sha256'])
        namespaces = {u['id']: u['index_revision'] for u in self.current['units']
                      if 'index_revision' in u and u['id'] not in IDS}
        self.assertEqual(namespaces, self.preserve['all_prior_namespaces'])
        self.assertEqual(digest(namespaces), self.preserve['all_prior_namespaces_sha256'])
        self.assertEqual([u['id'] for u in self.current['units'] if u.get('index_revision') == REV], list(IDS))
        for bi in FILES:
            source = self.proof['original_sources'][str(bi)]
            self.assertEqual((len(self.current['books'][bi]['blocks']), digest(self.current['books'][bi]['blocks'])),
                             (source['retained_tuples'], source['full_tuple_sha256']))

    def test_03_atomic_all_ten_idempotent_five_closed_source_unions(self):
        rows = copy.deepcopy(self.old['units'])
        before_books = digest(self.books)
        self.assertEqual(ten.apadana_thera_next10_spans(self.books, rows), list(IDS))
        self.assertEqual(digest(dict(self.old, units=rows)), NEW_SHA)
        self.assertEqual(ten.apadana_thera_next10_spans(self.books, rows), [])
        self.assertEqual(digest(dict(self.old, units=rows)), NEW_SHA)
        self.assertEqual(digest(self.books), before_books)
        self.assertEqual([p['new_cut'] for p in self.proof['pair_proofs']], [10367, 10786, 51, 212, 273])
        for p in self.proof['pair_proofs']:
            left, right = p['ids'];lo, hi = p['union']
            a, b = self.new_records[left], self.new_records[right]
            self.assertEqual((a['start'], a['end'], b['start'], b['end']), (lo, p['new_cut'], p['new_cut'], hi))
            self.assertEqual((self.old_records[left]['start'], self.old_records[right]['end']), (lo, hi))
            tuples = self.current['books'][p['book']]['blocks']
            self.assertEqual(digest(tuples[lo:hi]), p['union_tuple_sha256'])
            self.assertEqual(digest(tuples[p['new_cut']:p['old_cut']]), p['moved_prefix_tuple_sha256'])
        for r in self.proof['records']:
            u = self.new_records[r['id']];blocks = self.current['books'][u['book']]['blocks']
            self.assertEqual(digest(dict(id=u['id'], book=u['book'], start=u['start'], end=u['end'],
                                        blocks=blocks[u['start']:u['end']])), r['after_root_tuple_sha256'])

    def test_04_all340_source_tuples_17_owned_notes_pts_and_nonstanza_recitation(self):
        source_rows = self.proofs['SOURCE340_BLOCKS.json']['rows']
        self.assertEqual(len(source_rows), 340)
        self.assertEqual(len({(r['book'], r['block']) for r in source_rows}), 340)
        for r in source_rows:
            self.assertEqual(digest(self.current['books'][r['book']]['blocks'][r['block']]), r['tuple_sha256'])
            owners = [u['id'] for u in self.new_records.values() if u['book'] == r['book']
                      and u['start'] <= r['block'] < u['end']]
            self.assertEqual(owners, [r['new_owner']])
        notes = self.proof['notes_and_pages']['all17_original_note_occurrences']
        self.assertEqual(len(notes), 17)
        for n in notes:
            text = self.current['books'][n['book']]['blocks'][n['block']][3][n['note_index']]
            self.assertEqual(sha(text.encode()), n['text_sha256'])
            owners = [u['id'] for u in self.new_records.values() if u['book'] == n['book']
                      and u['start'] <= n['block'] < u['end']]
            self.assertEqual(owners, [n['new_owner']])
        note214 = next(n for n in notes if (n['book'], n['block']) == (37, 214))
        self.assertEqual((note214['old_owner'], note214['new_owner']), ('tha-ap426', 'tha-ap427'))
        self.assertEqual({k: self.new_records[k]['pts'] for k in ('tha-ap374', 'tha-ap375')},
                         self.proof['notes_and_pages']['PTS374_375_new'])
        marker = self.current['books'][36]['blocks'][10788]
        self.assertIn('1.291', marker[4]['P'])
        self.assertEqual(sha(marker[2][:20].encode()),
                         self.proof['notes_and_pages']['PTS10788_inline'][1]['visible_prefix_sha256'])
        recitation = self.current['books'][36]['blocks'][10381]
        self.assertEqual(recitation[0], 'centre')
        self.assertEqual(digest(recitation), self.proof['notes_and_pages']['recitation10381']['tuple_sha256'])
        current_positions = [s for u in self.new_records.values()
            for s in source_positions(u, self.current['books'][u['book']]['blocks'])]
        self.assertEqual(next(s for s in current_positions if s['source_blocks'] == [10381, 10382])['type'], 'prose')
        for block, uid in ((112, 'tha-ap424'), (240, 'tha-ap427'), (292, 'tha-ap429')):
            span = next(s for s in current_positions if s['uid'] == uid
                        and s['source_blocks'][0] <= block < s['source_blocks'][1])
            self.assertEqual(span['type'], 'verse', 'Split speaker/unlabelled stanza became prose')

    def test_05_all144_old_positions_and_source_owners_match_presealed_crosswalk(self):
        old = [s for u in self.old_records.values() for s in source_positions(u, self.old['books'][u['book']]['blocks'])]
        new = [s for u in self.new_records.values() for s in source_positions(u, self.current['books'][u['book']]['blocks'])]
        self.assertEqual((len(old), len(new), len(self.crosswalk['records'])), (144, 144, 144))
        by_source = {(self.new_records[s['uid']]['book'], tuple(s['source_blocks'])): s for s in new}
        self.assertEqual(len(by_source), 144)
        by_ref = {s['ref']: s for s in new};counts = {}
        for actual_old, expected in zip(old, self.crosswalk['records']):
            actual_new = by_source[(self.old_records[actual_old['uid']]['book'], tuple(actual_old['source_blocks']))]
            self.assertEqual(actual_old, {k: expected['old'][k] for k in actual_old})
            self.assertEqual(actual_new, {k: expected['exact_source_new'][k] for k in actual_new})
            for key in ('type', 'source_blocks', 'text_sha256', 'notes_sha256', 'note_count'):
                self.assertEqual(actual_old[key], actual_new[key])
            at_same = by_ref.get(actual_old['ref'])
            category = ('OLD_REF_ABSENT' if at_same is None else 'SAME_REF_DIFFERENT_SOURCE'
                        if at_same['source_blocks'] != actual_old['source_blocks']
                        else 'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY')
            self.assertEqual(category, expected['classification'])
            self.assertIs(expected['requires_current_revision_before_any_positional_read'], True)
            self.assertIs(expected['automatic_private_data_migration'], False)
            self.assertEqual((expected['old_locator'], expected['new_locator']), (COMMIT, COMMIT + '-' + REV))
            counts[category] = counts.get(category, 0) + 1
        self.assertEqual(counts, {'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY': 65,
                                 'OLD_REF_ABSENT': 10, 'SAME_REF_DIFFERENT_SOURCE': 69})
        self.assertEqual(sum(s['note_count'] for s in new), 17)

    def test_06_exact343_profiles_links_rights_and_finite_derived_parallels_delta(self):
        profiles = profiles_from_compiled_metadata()
        raw = (ROOT / 'server/data/apadana.json').read_bytes();cat = json.loads(raw)
        # Validate every actual359 compiled profile and the physical AP359 bytes
        # before selecting the explicit immutable343 historical metadata input.
        prior_runtime = json.loads((ROOT / 'docs/evidence/apadana/english335-350/BASELINE_RUNTIME34.json').read_bytes())['files']
        current_runtime, historical343_raw, payload = intake359.capture_authority(ROOT, prior_runtime)
        approved359 = json.loads(payload)
        self.assertEqual(len(profiles), 359)
        self.assertEqual(profiles, approved359['current']['profiles'])
        self.assertEqual(cat, approved359['manifest'])
        self.assertEqual({'bytes':len(raw), 'sha256':sha(raw)}, current_runtime['data/apadana.json'])
        profiles = {uid:profiles[uid] for uid in approved359['previous']['ids']}
        raw = historical343_raw;cat = json.loads(raw)
        self.assertEqual(len(profiles), 343)
        self.assertEqual(set(profiles), set(cat['links']))
        self.assertFalse(set(profiles).intersection(IDS))
        self.assertEqual(digest(profiles), self.preserve['343_full_profiles_sha256'])
        self.assertEqual(digest(cat['links']), self.preserve['343_full_links_sha256'])
        self.assertEqual(sha(raw), self.preserve['343_manifest_sha256'])
        for name, pin in self.preserve['current_data_file_inventory'].items():
            if name.startswith('canon.json.gz') or name == 'parallels.json.gz':
                continue
            content = raw if name == 'apadana.json' else (ROOT / 'server/data' / name).read_bytes()
            self.assertEqual((len(content), sha(content)), (pin['bytes'], pin['sha256']), name)
        # Never use the candidate's observed count as its own expectation.
        # The source-only counter seal is separately produced from frozen DD
        # algorithm plus sealed old/new canonical records, without new edges.
        oracle_raw = (PARALLELS_PROOFDIR / 'MODEL_SEAL.json').read_bytes()
        self.assertEqual(sha(oracle_raw), PARALLELS_ORACLE_PIN)
        parallels_oracle = json.loads(oracle_raw)
        self.assertEqual(parallels_oracle['schema'], 'independent-frozen-dd-parallels-model-seal-v1')
        self.assertEqual(parallels_oracle['status'], 'SOURCE_ONLY_INDEPENDENT_CANDIDATE_PAIR_DELTA_DERIVED')
        self.assertEqual(parallels_oracle['baseline_commit'], self.proof['application_baseline_commit'])
        self.assertEqual(parallels_oracle['old_canonical_logical_sha256'], OLD_SHA)
        self.assertEqual(parallels_oracle['future_canonical_logical_sha256'], NEW_SHA)
        self.assertIs(parallels_oracle['current_candidate_parallels_or_observed_counter_used_as_input'], False)
        self.assertIs(parallels_oracle['final_filter_or_final_edges_computed'], False)
        self.assertIs(parallels_oracle['old_all_stage123_stats_match_frozen_parallels'], True)
        self.assertEqual(len(parallels_oracle['files']), 15)
        for name, pin in parallels_oracle['files'].items():
            content = (PARALLELS_PROOFDIR / name).read_bytes()
            self.assertEqual((len(content), sha(content)), (pin['bytes'], pin['sha256']), name)
        binding_raw = (PARALLELS_PROOFDIR / 'PACKED_AND_PARALLELS_BINDINGS.json').read_bytes()
        self.assertEqual(sha(binding_raw), PARALLELS_BINDING_PIN)
        bindings = json.loads(binding_raw)
        self.assertEqual(bindings['schema'], 'source-only-canonical-packed-and-parallels-two-field-binding-v1')
        self.assertEqual(bindings['status'], 'INDEPENDENT_DERIVED_EXPECTATION_NOT_CANDIDATE_OUTPUT')
        permitted = [['source', 'inputs', 'canon.json.gz', 'sha256'],
                     ['counts', 'shared_stats', 'candidate_pairs']]
        self.assertEqual(parallels_oracle['exact_two_permitted_field_paths'], permitted)
        self.assertEqual(bindings['only_allowed_changes'], permitted)
        self.assertEqual(bindings['old_canon']['logical_sha256'], OLD_SHA)
        self.assertEqual(bindings['new_canon']['logical_sha256'], NEW_SHA)
        self.assertEqual(len(compact(self.old)), bindings['old_canon']['logical_bytes'])
        self.assertEqual(len(compact(self.current)), bindings['new_canon']['logical_bytes'])
        packed_canon = packed_bundle('canon.json.gz')
        self.assertEqual((len(packed_canon), sha(packed_canon)),
                         (bindings['new_canon']['packed_bytes'], bindings['new_canon']['packed_sha256']))
        self.assertEqual(sha(packed_canon), parallels_oracle['new_canon_packed_input_sha256'])
        old_packed = (ROOT / 'tests/fixtures/canon-before-next-ten/parallels.json.gz').read_bytes()
        old_pin = self.preserve['current_data_file_inventory']['parallels.json.gz']
        self.assertEqual((len(old_packed), sha(old_packed)), (old_pin['bytes'], old_pin['sha256']))
        self.assertEqual(parallels_oracle['old_parallels'], bindings['old_parallels'])
        self.assertEqual((len(old_packed), sha(old_packed)),
                         (parallels_oracle['old_parallels']['bytes'], parallels_oracle['old_parallels']['sha256']))
        old_logical = gzip.decompress(old_packed)
        self.assertEqual((len(old_logical), sha(old_logical)),
                         (parallels_oracle['old_parallels']['logical_bytes'],
                          parallels_oracle['old_parallels']['logical_sha256']))
        old_parallels = json.loads(old_logical)
        self.assertEqual(old_parallels['source']['inputs']['canon.json.gz']['sha256'],
                         bindings['old_canon']['packed_sha256'])
        old_count = parallels_oracle['before_candidate_pairs']
        new_count = parallels_oracle['after_candidate_pairs']
        self.assertIs(type(old_count), int)
        self.assertIs(type(new_count), int)
        self.assertEqual((old_count, new_count), (bindings['candidate_pairs']['old'], bindings['candidate_pairs']['new']))
        self.assertEqual(old_parallels['counts']['shared_stats']['candidate_pairs'], old_count)
        expected_parallels = copy.deepcopy(old_parallels)
        expected_parallels['source']['inputs']['canon.json.gz']['sha256'] = bindings['new_canon']['packed_sha256']
        expected_parallels['counts']['shared_stats']['candidate_pairs'] = new_count
        expected_pin = parallels_oracle['expected_new_parallels_logical_sha256']
        self.assertEqual(expected_pin, bindings['expected_new_parallels']['logical_sha256'])
        self.assertEqual((len(compact(expected_parallels)), digest(expected_parallels)),
                         (bindings['expected_new_parallels']['logical_bytes'], expected_pin))
        # Exact equality retains all final edges, citations, remaining counts,
        # source notices, source identities and methods. Only these two finite
        # fields are updated, one from the proven input bytes, one from oracle.
        actual_raw = bundled('parallels.json.gz')
        self.assertEqual((len(actual_raw), sha(actual_raw)),
                         (bindings['expected_new_parallels']['logical_bytes'], expected_pin))
        actual_parallels = json.loads(actual_raw)
        self.assertEqual(actual_parallels, expected_parallels)

    def test_07_mixed_partial_and_wrong_typed_closed_states_refuse(self):
        # Both book-wise half repairs, each one-record repair, each one-record
        # rollback and an alternating state exercise the atomic ten-record gate.
        masks = {15, 1008, 341, 682} | {1 << i for i in range(10)} | {1023 ^ (1 << i) for i in range(10)}
        for mask in sorted(masks):
            rows = self.rows()
            for i, uid in enumerate(IDS):
                if mask & (1 << i):
                    rows[rows.index(next(u for u in rows if u['id'] == uid))] = copy.deepcopy(self.new_records[uid])
            with self.subTest(mask=mask):
                self.reject(self.books, rows, 'Unreviewed, mixed or partial')
        mutations = [lambda u: u.update(book=float(u['book'])), lambda u: u.update(start=True),
            lambda u: u.update(end=float(u['end'])), lambda u: u.update(title=u['title'] + 'x'),
            lambda u: u.update(vri='foreign'), lambda u: u['pts'].update(volume=True),
            lambda u: u['pts'].update(page=float(u['pts']['page'])),
            lambda u: u.update(index_revision='foreign'), lambda u: u.update(unreviewed=False)]
        for new in (False, True):
            for uid in IDS:
                for i, mutate in enumerate(mutations):
                    with self.subTest(new=new, uid=uid, mutation=i):
                        rows = self.rows(new);mutate(next(u for u in rows if u['id'] == uid))
                        before = digest(rows)
                        with self.assertRaises(ValueError): ten.next10_state(rows)
                        c = dict(source=self.current['source'], units=rows)
                        with self.assertRaises(ValueError): ten.canon_before_next10(c)
                        self.assertEqual(digest(rows), before)
        for uid in IDS:
            with self.subTest(helper_typed_gate=uid):
                rows = self.rows();next(u for u in rows if u['id'] == uid)['end'] = True
                self.reject(self.books, rows)

    def test_08_missing_duplicate_dependencies_neighbours_and_invalid_source_spans(self):
        self.assertEqual(ten.apadana_thera_next10_spans(self.books, self.rows()), list(IDS))
        for label in ('missing', 'duplicate_target', 'duplicate_other', 'nonobject', 'nonstring_id',
                      'neighbour', 'shared', 'members', 'group', 'parent', 'overlap', 'outside', 'wrong_type'):
            rows = self.rows()
            if label == 'missing': rows.remove(next(u for u in rows if u['id'] == IDS[-1]))
            elif label == 'duplicate_target': rows.append(copy.deepcopy(next(u for u in rows if u['id'] == IDS[-1])))
            elif label == 'duplicate_other': rows.append(copy.deepcopy(next(u for u in rows if u['id'] == 'tha-ap430')))
            elif label == 'nonobject': rows.append('synthetic')
            elif label == 'nonstring_id': rows.append(dict(id=7))
            elif label == 'neighbour': next(u for u in rows if u['id'] == 'tha-ap430')['title'] += 'x'
            elif label in ('shared', 'members', 'group', 'parent'):
                field = 'shares_passage_with' if label == 'shared' else label
                rows.append(dict(id='synthetic', **{field: [IDS[-1]]}))
            elif label == 'overlap': rows.append(dict(id='synthetic', book=37, start=213, end=215))
            elif label == 'outside': rows.append(dict(id='synthetic', book=37, start=10671, end=10673))
            elif label == 'wrong_type': rows.append(dict(id='synthetic', book=37.0, start=400, end=401))
            with self.subTest(label=label): self.reject(self.books, rows)

    def test_09_uniform_preannotation_pts_absence_supported_and_full_pts_corrected(self):
        rows = self.rows()
        for u in rows: u.pop('pts', None)
        self.assertEqual(ten.next10_state(rows, before_annotation=True), 'old')
        with self.assertRaises(ValueError): ten.next10_state(rows)
        self.assertEqual(ten.apadana_thera_next10_spans(self.books, rows), list(IDS))
        self.assertEqual(ten.next10_state(rows, before_annotation=True), 'new')
        self.assertTrue(all('pts' not in u for u in rows if u['id'] in IDS))
        self.assertEqual(ten.apadana_thera_next10_spans(self.books, rows), [])
        rows = self.rows();next(u for u in rows if u['id'] == IDS[0]).pop('pts')
        self.reject(self.books, rows, 'Mixed annotation state')
        rows = self.rows();ten.apadana_thera_next10_spans(self.books, rows)
        self.assertEqual({k: next(u for u in rows if u['id'] == k)['pts'] for k in IDS},
                         {k: self.new_records[k]['pts'] for k in IDS})

    def test_10_both_books_required_source_tamper_and_late_book37_atomicity(self):
        no_books = [dict(file='synthetic.xml', blocks=[])]
        self.assertEqual(ten.apadana_thera_next10_spans(no_books, []), [])
        self.reject(no_books, self.rows(), 'cannot exist without both')
        before = digest(self.books)
        for label in ('only36', 'only37', 'swapped', 'duplicate37', 'word36', 'note37', 'page37'):
            books = list(self.books)
            if label == 'only36': books[37] = dict(file='synthetic.xml', blocks=[])
            elif label == 'only37': books[36] = dict(file='synthetic.xml', blocks=[])
            elif label == 'swapped': books[36], books[37] = books[37], books[36]
            elif label == 'duplicate37': books.append(copy.deepcopy(books[37]))
            else:
                bi = 36 if label == 'word36' else 37
                books[bi] = copy.deepcopy(books[bi])
                if label == 'word36': books[bi]['blocks'][10368]['text'] += 'x'
                elif label == 'note37': books[bi]['blocks'][214]['notes'][0] += 'x'
                else: books[bi]['blocks'][214]['pages']['P'] = [(2, 999)]
            with self.subTest(label=label):
                books_pin = digest(books)
                self.reject(books, self.rows())
                self.assertEqual(digest(books), books_pin)
        # A failure after book36 was accepted cannot publish its first four edits.
        rows = self.rows();next(u for u in rows if u['id'] == IDS[-1])['title'] += 'x'
        self.reject(self.books, rows, 'Unreviewed, mixed or partial')
        self.assertEqual(digest(self.books), before)

    def test_11_inverse_keeps_unrelated_changes_and_previous_six_gate_is_strict(self):
        c = dict(self.current, units=self.rows(True), synthetic={'local': True})
        next(u for u in c['units'] if u['id'] == 'tha-ap430')['end'] += 1
        before = digest(c);out = ten.canon_before_next10(c)
        self.assertEqual(next(u for u in out['units'] if u['id'] == 'tha-ap430'),
                         next(u for u in c['units'] if u['id'] == 'tha-ap430'))
        self.assertEqual(out['synthetic'], c['synthetic'])
        self.assertEqual(digest(c), before)
        self.assertNotEqual(digest(out), OLD_SHA)
        c = dict(self.current, source=dict(self.current['source'], commit='foreign'))
        with self.assertRaises(ValueError): ten.canon_before_next10(c)
        self.assertEqual(sha((ROOT / 'scripts/canon/apadana_thera340_spans.py').read_bytes()), SIX_HELPER_SHA)
        import apadana_thera340_spans as six
        with self.assertRaises(ValueError):
            six.apadana_thera340_spans(self.books, copy.deepcopy(self.current['units']))
        # The explicit outer inverse returns the prior gate's original neighbour348.
        historical = ten.canon_before_next10(self.current)
        self.assertEqual(six.apadana_thera340_spans(self.books, copy.deepcopy(historical['units'])), [])

    def test_12_unique_build_hook_after_six_before_numbering_and_annotation(self):
        tree = ast.parse((ROOT / 'scripts/canon/build_canon.py').read_text(encoding='utf-8'))
        imports = [n for n in tree.body if isinstance(n, ast.ImportFrom)
                   and n.module == 'apadana_thera_next10_spans']
        self.assertEqual(len(imports), 1)
        self.assertEqual([x.name for x in imports[0].names], ['apadana_thera_next10_spans'])
        main = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'main')
        calls = [n for n in ast.walk(main) if isinstance(n, ast.Call)]
        def named(name):
            return [n for n in calls if isinstance(n.func, ast.Name) and n.func.id == name]
        self.assertEqual(len(named('apadana_thera_next10_spans')), 1)
        hook = named('apadana_thera_next10_spans')[0]
        self.assertEqual(ast.unparse(hook), 'apadana_thera_next10_spans(b.books, b.units)')
        self.assertLess(named('apadana_thera340_spans')[0].lineno, hook.lineno)
        self.assertLess(hook.lineno, named('thag_sixteen_spans')[0].lineno)
        numbering = [n for n in ast.walk(main) if isinstance(n, ast.Assign) and any(
            isinstance(t, ast.Subscript) and isinstance(t.slice, ast.Constant) and t.slice.value == 'vri'
            for t in n.targets)]
        self.assertEqual(len(numbering), 1)
        self.assertLess(hook.lineno, numbering[0].lineno)
        annotation = [n for n in calls if isinstance(n.func, ast.Attribute) and n.func.attr == 'annotate_pages']
        self.assertEqual(len(annotation), 1)
        self.assertLess(hook.lineno, annotation[0].lineno)


class OriginalSource(Fixture):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.source = Path(os.environ['VRI_SOURCE_CHECKOUT']).resolve()
        cls.xml = {}
        for bi, file in FILES.items():
            raw = (cls.source / 'romn' / file).read_bytes()
            pin = cls.proof['original_sources'][str(bi)]
            assert (len(raw), sha(raw)) == (pin['bytes'], pin['sha256'])
            assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == pin['git_blob_sha1']
            cls.xml[bi] = raw
        raw = bundled('commentary.json.gz')
        assert sha(raw) == cls.preserve['commentary']['logical_sha256']
        cls.commentary = json.loads(raw)
        import repair_apadana_thera_next10_spans
        cls.wrapper = repair_apadana_thera_next10_spans

    def test_13_original_two_book_repair_complete_report_and_idempotence(self):
        c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
        books_pin, notes_pin = digest(c['books']), digest(commentary)
        report = self.wrapper.repair(c, commentary, self.source)
        self.assertEqual(digest(c), NEW_SHA)
        self.assertEqual(report['changed_units'], list(IDS))
        self.assertEqual((report['input_sha256'], report['historical_inverse_sha256'], report['output_sha256']),
                         (OLD_SHA, OLD_SHA, NEW_SHA))
        self.assertEqual((report['preserved_other_units'], report['preserved_source_books']), (8534, 61))
        self.assertEqual((report['commentary_changes'], report['english_activations'], report['rights_changes']), (0, 0, 0))
        self.assertIs(report['private_data_accessed'], False)
        self.assertIs(report['previous_namespaces_preserved'], True)
        self.assertEqual(report['accepted_commentary_intersections_with_closed_unions'], 0)
        self.assertEqual(report['target_commentary_associations'], 0)
        for bi in FILES:
            proof, actual = self.proof['original_sources'][str(bi)], report['original_sources'][bi]
            self.assertEqual((actual['file'], actual['xml_git_blob'], actual['xml_sha256'],
                              actual['source_blocks'], actual['source_tuple_sha256']),
                             (FILES[bi], proof['git_blob_sha1'], proof['sha256'],
                              proof['retained_tuples'], proof['full_tuple_sha256']))
        self.assertEqual(len(report['preserved_unions']), len(self.proof['pair_proofs']))
        self.assertEqual(len(report['preserved_unions']), 5)
        for p, actual in zip(self.proof['pair_proofs'], report['preserved_unions']):
            self.assertEqual(actual, dict(book=p['book'], ids=p['ids'], source_blocks=p['union'],
                                          tuple_sha256=p['union_tuple_sha256']))
        for uid in IDS:
            self.assertEqual(report['units'][uid], dict(before=self.old_records[uid], after=self.new_records[uid]))
        self.assertEqual((digest(c['books']), digest(commentary)), (books_pin, notes_pin))
        again = self.wrapper.repair(c, commentary, self.source)
        self.assertEqual(again['changed_units'], [])
        self.assertEqual((again['input_sha256'], again['output_sha256']), (NEW_SHA, NEW_SHA))
        self.assertEqual((digest(c), digest(commentary)), (NEW_SHA, notes_pin))

    def test_14_global_source_rights_commentary_and_wrong_pts_are_atomic(self):
        for label in ('unrelated_unit', 'book_word', 'rights', 'commit', 'mixed', 'commentary'):
            c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
            if label == 'unrelated_unit': c['units'][0]['title'] += 'x'
            elif label == 'book_word': c['books'][0]['blocks'][0][2] += 'x'
            elif label == 'rights': c['source']['terms'] += 'x'
            elif label == 'commit': c['source']['commit'] = 'foreign'
            elif label == 'mixed': c['units'] = [copy.deepcopy(self.new_records[u['id']])
                if u['id'] == IDS[0] else u for u in c['units']]
            elif label == 'commentary': commentary['synthetic'] = True
            with self.subTest(label=label):
                before, notes = digest(c), digest(commentary)
                with self.assertRaises(ValueError): self.wrapper.repair(c, commentary, self.source)
                self.assertEqual((digest(c), digest(commentary)), (before, notes))
        c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
        before, notes = digest(c), digest(commentary)
        def wrong_pts(builder):
            for u in builder.units: u['pts'] = dict(volume=99, page=999, end_page=999)
        with mock.patch.object(self.wrapper.Builder, 'annotate_pages', wrong_pts):
            with self.assertRaisesRegex(ValueError, 'PTS annotation differs'):
                self.wrapper.repair(c, commentary, self.source)
        self.assertEqual((digest(c), digest(commentary)), (before, notes))

    def test_15_raw_second_xml_and_late_parsed_note_page_tamper_fail_before_publish(self):
        # First book is exact. A bad second original must fail before parsing it,
        # even though first-book parsing has succeeded and metadata is writable.
        with tempfile.TemporaryDirectory(prefix='pali-next10-raw-') as temp:
            source = Path(temp).resolve();(source / 'romn').mkdir()
            for bi, file in FILES.items():
                (source / 'romn' / file).write_bytes(self.xml[bi] + (b'\x20\x00' if bi == 37 else b''))
            c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
            before, notes = digest(c), digest(commentary)
            parse = self.wrapper.vri.parse
            seen = []
            def observed_parse(path):
                seen.append(Path(path).name)
                if Path(path).name == FILES[37]:
                    raise AssertionError('Altered raw second XML must be rejected before parser')
                return parse(path)
            with mock.patch.object(self.wrapper.vri, 'parse', observed_parse):
                with self.assertRaisesRegex(ValueError, 'Pinned original XML bytes differ for book37'):
                    self.wrapper.repair(c, commentary, source)
            self.assertEqual(seen, [FILES[36]])
            self.assertEqual((digest(c), digest(commentary)), (before, notes))
        for mutation in ('note', 'page'):
            c, commentary = copy.deepcopy(self.old), copy.deepcopy(self.commentary)
            before, notes = digest(c), digest(commentary)
            parse = self.wrapper.vri.parse
            def altered_parse(path):
                rows = parse(path)
                if Path(path).name == FILES[37]:
                    if mutation == 'note': rows[214]['notes'][0] += 'x'
                    else: rows[214]['pages']['P'] = [(2, 999)]
                return rows
            with self.subTest(mutation=mutation), mock.patch.object(self.wrapper.vri, 'parse', altered_parse):
                with self.assertRaisesRegex(ValueError, 'Entire original source words/notes/pages differ for book37'):
                    self.wrapper.repair(c, commentary, self.source)
                self.assertEqual((digest(c), digest(commentary)), (before, notes))

    def test_16_bounded_full_cli_idempotent_distinct_new_output_and_no_overwrite(self):
        script = ROOT / 'scripts/canon/repair_apadana_thera_next10_spans.py'
        def invoke(args):
            return subprocess.run([sys.executable, '-B', str(script), *map(str, args)], cwd=ROOT,
                capture_output=True, encoding='utf-8', timeout=30,
                env={**os.environ, 'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONUNBUFFERED': '1'})
        with tempfile.TemporaryDirectory(prefix='pali-next10-cli-') as temp:
            d = Path(temp).resolve()  # macOS /tmp alias must not poison a valid case.
            ci, ai, co, again = [d / n for n in ('old.gz', 'commentary.gz', 'new.gz', 'again.gz')]
            for path, data in ((ci, self.old), (ai, self.commentary)):
                path.write_bytes(gzip.compress(compact(data), mtime=0))
            input_pins = (sha(ci.read_bytes()), sha(ai.read_bytes()))
            result = invoke([ci, ai, self.source, co])
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(sha(gzip.decompress(co.read_bytes())), NEW_SHA)
            self.assertEqual(json.loads(result.stdout)['changed_units'], list(IDS))
            result = invoke([co, ai, self.source, again])
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertEqual(sha(gzip.decompress(again.read_bytes())), NEW_SHA)
            self.assertEqual(json.loads(result.stdout)['changed_units'], [])
            self.assertEqual(co.read_bytes(), again.read_bytes())
            sentinel = d / 'sentinel.gz';sentinel.write_bytes(b'SYNTHETIC_KEEP_EXACT')
            # Negative containment controls must own their entire source tree:
            # a regression may never write into the pinned external checkout.
            owned_vri = d / 'vri';(owned_vri / 'romn').mkdir(parents=True)
            for bi, file in FILES.items():
                (owned_vri / 'romn' / file).write_bytes(self.xml[bi])
            out_inside_source = owned_vri / 'SYNTHETIC_NEVER_WRITE_NEXT10.gz'
            self.assertFalse(out_inside_source.exists())
            for args, reason in (([ci, ai, self.source, sentinel], 'Output must be new'),
                                 ([ci, ai, self.source, ci], 'Output must be new'),
                                 ([ci, ci, self.source, d / 'alias.gz'], 'Distinct paths'),
                                 ([ci, ai, owned_vri, out_inside_source], 'output outside')):
                with self.subTest(args=[p.name for p in args]):
                    result = invoke(args)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn(reason, result.stderr)
            self.assertEqual(sentinel.read_bytes(), b'SYNTHETIC_KEEP_EXACT')
            self.assertFalse(out_inside_source.exists())
            self.assertFalse((d / 'alias.gz').exists())
            # Own all components of the negative symlink fixture.
            physical = d / 'physical';physical.mkdir()
            shortcut = d / 'shortcut'
            shortcut.symlink_to(physical, target_is_directory=True)
            result = invoke([ci, ai, self.source, shortcut / 'symlink-output.gz'])
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('cannot contain symlinks', result.stderr)
            self.assertFalse((physical / 'symlink-output.gz').exists())
            # A lexical '..' root still denotes the same physical VRI tree.
            # Give it both exact originals: rejection must be containment,
            # rather than an incidental missing-source failure farther on.
            placeholder = d / 'placeholder';placeholder.mkdir()
            lexical_root = placeholder / '..' / 'vri'
            contained = owned_vri / 'contained-output.gz'
            result = invoke([ci, ai, lexical_root, contained])
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('output outside the original VRI checkout', result.stderr)
            self.assertFalse(contained.exists())
            self.assertEqual((sha(ci.read_bytes()), sha(ai.read_bytes())), input_pins)


if __name__ == '__main__':
    unittest.main()
