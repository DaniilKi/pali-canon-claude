"""Separate current333 integrity controls; preserves the existing 33-case suite.

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
import web_reader_intake359 as intake359
import web_reader_intake368 as intake368
from owned_intake368_proofs import copy_owned_intake368_proof_inputs
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    reviewed_canonical325_runtime, reviewed339_runtime, assert_catalogue, assert_runtime,
    assert_runtime_records)

NEW_IDS = tuple('tha-ap' + str(n) for n in range(314, 322))
PROOFS = (
    ('docs/evidence/apadana/runtime333/INDEPENDENT333_RUNTIME_INVENTORY.json',
        '2d6c97ba2ff5728324c487ee3244bd86d016b77a3761ad89c61a0a9ac4a2b8a7'),
    ('docs/evidence/apadana/runtime333/INDEPENDENT333_RUNTIME_REVIEW.json',
        'a0174f27978b598aca0b7a674b571dc731833861cdd90f9a7358004c68295b6f'),
)
CURATION = 'docs/evidence/apadana/THERA_312_319_APPROVAL.json'
COMPACT = 'docs/evidence/apadana/THERA_312_319_BASELINE325_COMPACT.json'
CURATION_SHA = 'cc8480e22bb9a1615af86cee2e153c77695f4d20c21fd8f147e31f8658ca610d'
COMPACT_SHA = '918dd529acab9d88e88812f7eb9841181eaa534e19705e4ce5f66c9fe52ecf3f'
DELTA = ['data/apadana.json', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def flipped(value):
    """Change one character while preserving exact field length and type."""
    assert isinstance(value, str) and value
    return ('0' if value[0] != '0' else '1') + value[1:]


class Current333AuthorityNegatives(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Current368 is genuine before an owned historical proof fixture exists.
        # These public gates retain fresh actual27/source/old authority checks.
        cls.root_current368 = approved_catalogue(ROOT)
        cls.root_runtime368 = approved_runtime(ROOT)
        assert len(cls.root_current368['ids']) == len(cls.root_current368['profiles']) == len(cls.root_current368['links']) == 368
        assert len(cls.root_runtime368) == 34
        # Do not hardlink: every mutation must own its bytes, even on failure.
        cls.temporary = tempfile.TemporaryDirectory(prefix='pali-current333-authority-')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.fixture = Path(cls.temporary.name)
        evidence = cls.fixture / 'docs/evidence/apadana'
        copy_owned_intake368_proof_inputs(ROOT, cls.fixture)
        # The additive reviewed copy retains all13 current proof members and
        # the separate immutable AP343 input; actual server/data remains368.
        intake359.fresh_proofs(cls.fixture)
        intake368.fresh_proofs(cls.fixture)
        historical_ap343 = (cls.fixture / intake359.AP_FIXTURE).read_bytes()
        assert sha(historical_ap343) == '18ef986dccbc05cabf311ba44d553b0cf415893484428eecdd476bfe2e1f4bbf'
        assert len(json.loads(historical_ap343)['links']) == 343
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
        assert cls.approved == cls.root_current368
        assert cls.inventory == cls.root_runtime368
        cls.manifest = json.loads((ROOT / 'server/data/apadana.json').read_text(encoding='utf-8'))
        # Both the owned proof fixture and actual current output must be valid
        # before a deliberately changed proof can count as a negative result.
        assert_catalogue(cls.manifest, cls.approved)
        actual = assert_runtime(ROOT, ROOT / 'server')
        assert actual == {name: row['sha256'] for name, row in cls.inventory.items()}
        assert len(cls.approved['ids']) == len(cls.approved['links']) == len(cls.approved['profiles']) == 368
        assert tuple(cls.approved['ids'][:333][-8:]) == NEW_IDS
        assert len(cls.inventory) == 34

    def current_positive(self):
        approved = approved_catalogue(self.fixture)
        inventory = approved_runtime(self.fixture)
        self.assertTrue(approved == self.approved, 'Owned current333 catalogue positive must stay exact')
        self.assertTrue(inventory == self.inventory, 'Owned current333 runtime positive must stay exact')
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

    def test_01_exact_current333_catalogue_and_actual_runtime_positive(self):
        approved, inventory = self.current_positive()
        self.assertEqual(tuple(approved['ids'][:333][-8:]), NEW_IDS)
        self.assertEqual(len(approved['ids']), 368)
        self.assertEqual(len(inventory), 34)
        self.assertTrue(set(NEW_IDS).issubset(approved['profiles']))
        self.assertFalse({'tha-ap313', 'tha-ap322'} & set(approved['links']))

    def test_02_each_required333_runtime_proof_missing_after_valid_positive(self):
        for name, _ in PROOFS:
            with self.subTest(proof=Path(name).name), self.changed_proof(name, None) as path:
                with self.assertRaises(FileNotFoundError) as missing:
                    approved_runtime(self.fixture)
                self.assertEqual(missing.exception.filename, str(path))

    def test_03_each_required333_runtime_proof_tampered_after_valid_positive(self):
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
                    self.assertEqual(len(observed['links']), 368)
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
                    self.assertEqual(len(observed['links']), 368)
                    self.assertEqual(len(observed['links'][uid][field]), len(prior))
                    self.assertEqual(observed['links'][uid]['note_count'], self.manifest['links'][uid]['note_count'])
                    with self.assertRaises(AssertionError):
                        assert_catalogue(observed, self.approved)

    def test_06_new_curation_and_independent_compact_tampering_after_full_positive(self):
        def curation(value):
            self.assertEqual(tuple(value['approved_ids']), NEW_IDS)
            value['approved_ids'][0] = 'tha-ap313'
        def compact(value):
            self.assertEqual(value['profile_count'], 325)
            uid = value['ids'][0]
            value['profile_object_sha256'][uid] = flipped(value['profile_object_sha256'][uid])
        for name, mutate in ((CURATION, curation), (COMPACT, compact)):
            with self.subTest(proof=Path(name).name), self.changed_proof(name, mutate):
                with self.assertRaisesRegex(AssertionError,
                        'Curatorial evidence seal changed: ' + Path(name).name):
                    approved_catalogue(self.fixture)

    def test_07_missing333_proof_cannot_fall_back_to_valid_historical325_inventory(self):
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
