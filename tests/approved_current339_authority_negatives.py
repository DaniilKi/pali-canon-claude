"""Separate current339 integrity controls; preserves the existing 33-case suite.

Expected objects come only from sealed independent catalogue/runtime authorities.
All proof mutations are confined to owned temporary copies. No build, fetch,
Git command, runtime launch or subprocess is used by this Python test module.
"""
import copy
import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from web_reader_four_boundary_history import historical_data_bytes, copy_historical_fixture
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    reviewed_canonical325_runtime, reviewed339_runtime, assert_catalogue, assert_runtime,
    assert_runtime_records)

NEW_IDS = ('tha-ap323','tha-ap325','tha-ap326','tha-ap327','tha-ap328','tha-ap331')
PROOFS = (
    ('docs/evidence/apadana/runtime339/INDEPENDENT339_RUNTIME_INVENTORY.json',
        '234fe7d26de0af3777f6b67d2e812aff896218b690bdfea098d7918410346970'),
    ('docs/evidence/apadana/runtime339/INDEPENDENT339_RUNTIME_REVIEW.json',
        'ecfda89f9c3d877e6cffc151a8bdf0aa3594f8a2d9744aaed5d6d26cbbf8c653'),
)
CURATION = 'docs/evidence/apadana/THERA_321_329_APPROVAL.json'
COMPACT = 'docs/evidence/apadana/THERA_321_329_BASELINE333_COMPACT.json'
CURATION_SHA = '39a344a026373f8a902ecb5857414daf12fc4a8ae942132050529844aa602810'
COMPACT_SHA = '084180e7967985cf375a71554234405de977f6f6945c41c202a9b467dcb3ba8e'
DELTA = ['data/apadana.json', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def flipped(value):
    """Change one character while preserving exact field length and type."""
    assert isinstance(value, str) and value
    return ('0' if value[0] != '0' else '1') + value[1:]


class Current339AuthorityNegatives(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Do not hardlink: every mutation must own its bytes, even on failure.
        cls.temporary = tempfile.TemporaryDirectory(prefix='pali-current339-authority-')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.fixture = Path(cls.temporary.name)
        evidence = cls.fixture / 'docs/evidence/apadana'
        shutil.copytree(ROOT / 'docs/evidence/apadana', evidence)
        copy_historical_fixture(ROOT, cls.fixture)
        for name in ('tests/fixtures/reviewed-runtime-2449.json',
                'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json'):
            target = cls.fixture / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / name, target)
        # Independent compact paths identify public canonical data needed to
        # reconstruct the sealed catalogue; current output supplies no oracle.
        compact_raw = (cls.fixture / COMPACT).read_bytes()
        assert sha(compact_raw) == COMPACT_SHA
        compact = json.loads(compact_raw)
        assert len(compact['data_file_sha256']) == 26
        for name, expected in compact['data_file_sha256'].items():
            assert name.startswith('server/data/') and '..' not in Path(name).parts
            assert name != 'server/data/apadana.json'
            source = ROOT / name
            assert source.is_file() and not source.is_symlink()
            raw = source.read_bytes()
            assert sha(historical_data_bytes(ROOT, name)) == expected, 'Pinned independent public data changed: ' + name
            target = cls.fixture / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
        assert sha((cls.fixture / CURATION).read_bytes()) == CURATION_SHA
        for name, expected in PROOFS:
            assert sha((cls.fixture / name).read_bytes()) == expected
        cls.approved = approved_catalogue(cls.fixture)
        cls.inventory = approved_runtime(cls.fixture)
        cls.manifest = json.loads((ROOT / 'server/data/apadana.json').read_text(encoding='utf-8'))
        # Both the owned proof fixture and actual current output must be valid
        # before a deliberately changed proof can count as a negative result.
        assert_catalogue(cls.manifest, cls.approved)
        actual = assert_runtime(ROOT, ROOT / 'server')
        assert actual == {name: row['sha256'] for name, row in cls.inventory.items()}
        assert len(cls.approved['ids']) == len(cls.approved['links']) == len(cls.approved['profiles']) == 343
        assert tuple(cls.approved['ids'][:339][-6:]) == NEW_IDS
        assert len(cls.inventory) == 34

    def current_positive(self):
        approved = approved_catalogue(self.fixture)
        inventory = approved_runtime(self.fixture)
        self.assertTrue(approved == self.approved, 'Owned current339 catalogue positive must stay exact')
        self.assertTrue(inventory == self.inventory, 'Owned current339 runtime positive must stay exact')
        assert_catalogue(self.manifest, approved)
        return approved, inventory

    @contextmanager
    def changed_proof(self, name, change):
        path = self.fixture / name
        self.assertTrue(path.is_relative_to(self.fixture))
        raw = path.read_bytes()
        self.current_positive()
        try:
            if change is None:
                path.unlink()
            else:
                value = json.loads(raw)
                change(value)
                path.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')
            yield path
        finally:
            path.write_bytes(raw)

    def test_01_exact_current339_catalogue_and_actual_runtime_positive(self):
        approved, inventory = self.current_positive()
        self.assertEqual(tuple(approved['ids'][:339][-6:]), NEW_IDS)
        self.assertEqual(len(approved['ids']), 343)
        self.assertEqual(len(inventory), 34)
        self.assertTrue(set(NEW_IDS).issubset(approved['profiles']))
        self.assertFalse({'tha-ap313', 'tha-ap322'} & set(approved['links']))

    def test_02_each_required339_runtime_proof_missing_after_valid_positive(self):
        for name, _ in PROOFS:
            with self.subTest(proof=Path(name).name), self.changed_proof(name, None) as path:
                with self.assertRaises(FileNotFoundError) as missing:
                    approved_runtime(self.fixture)
                self.assertEqual(missing.exception.filename, str(path))

    def test_03_each_required339_runtime_proof_tampered_after_valid_positive(self):
        def change(value):
            # Still valid JSON, same34 paths, same-length digest: exact seal fails.
            self.assertEqual(len(value['files']), 34)
            value['files']['index.cjs']['sha256'] = flipped(value['files']['index.cjs']['sha256'])
        for name, _ in PROOFS:
            with self.subTest(proof=Path(name).name), self.changed_proof(name, change):
                with self.assertRaisesRegex(AssertionError,
                        'Independent acceptance seal changed: ' + Path(name).name):
                    approved_runtime(self.fixture)

    def test_04_each_new_identity_refuses_same_count_held_or_unknown_substitution(self):
        self.current_positive()
        for uid in NEW_IDS:
            for replacement in ('tha-ap313', 'tha-ap322', 'tha-ap9999'):
                with self.subTest(owner=uid, replacement=replacement):
                    observed = copy.deepcopy(self.manifest)
                    observed['links'][replacement] = observed['links'].pop(uid)
                    self.assertEqual(len(observed['links']), 343)
                    with self.assertRaises(AssertionError):
                        assert_catalogue(observed, self.approved)

    def test_05_each_new_body_notes_title_and_rights_refuse_same_length_same_count_tamper(self):
        self.current_positive()
        for uid in NEW_IDS:
            for field in ('body_sha256', 'notes_sha256', 'title', 'license'):
                with self.subTest(owner=uid, field=field):
                    observed = copy.deepcopy(self.manifest)
                    prior = observed['links'][uid][field]
                    observed['links'][uid][field] = flipped(prior)
                    self.assertEqual(len(observed['links']), 343)
                    self.assertEqual(len(observed['links'][uid][field]), len(prior))
                    self.assertEqual(observed['links'][uid]['note_count'], self.manifest['links'][uid]['note_count'])
                    with self.assertRaises(AssertionError):
                        assert_catalogue(observed, self.approved)

    def test_06_new_curation_and_independent_compact_tampering_after_full_positive(self):
        def curation(value):
            self.assertEqual(tuple(value['approved_ids']), NEW_IDS)
            value['approved_ids'][0] = 'tha-ap313'
        def compact(value):
            self.assertEqual(value['profile_count'], 333)
            uid = value['ids'][0]
            value['profile_object_sha256'][uid] = flipped(value['profile_object_sha256'][uid])
        for name, mutate in ((CURATION, curation), (COMPACT, compact)):
            with self.subTest(proof=Path(name).name), self.changed_proof(name, mutate):
                with self.assertRaisesRegex(AssertionError,
                        'Curatorial evidence seal changed: ' + Path(name).name):
                    approved_catalogue(self.fixture)

    def test_07_missing339_proof_cannot_fall_back_to_valid_historical325_inventory(self):
        for name, _ in PROOFS:
            with self.subTest(proof=Path(name).name):
                _, current = self.current_positive()
                # Explicitly inspect the immutable339 leg after proving the current leg.
                current = reviewed339_runtime(self.fixture)
                # This is inventory-chain verification, not a repeat of the
                # historical four-case behavior fixture or old runtime execution.
                prior = reviewed_canonical325_runtime(self.fixture)
                self.assertEqual(len(prior), 34)
                self.assertEqual(set(prior), set(current))
                self.assertEqual([path for path in sorted(current) if current[path] != prior[path]], DELTA)
                with self.assertRaises(AssertionError):
                    assert_runtime_records(prior, current)
                with self.changed_proof(name, None):
                    self.assertTrue(reviewed_canonical325_runtime(self.fixture) == prior,
                        'Historical325 proof chain remains genuinely valid')
                    with self.assertRaises(FileNotFoundError):
                        approved_runtime(self.fixture)


if __name__ == '__main__':
    unittest.main()
