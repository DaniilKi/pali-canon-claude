"""Scoped history reuse must retain fresh public integrity and fail closed.

All mutations use one owned disposable fixture. No app/network/Git/subprocess.
"""
import contextlib
import hashlib
import json
import os
import shutil
import sys
import tempfile
import unittest
from unittest import mock
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import web_reader_six_boundary_history as h
import web_reader_intake359 as intake359
from web_reader_next_ten_boundary_history import assert_next_ten_current_canonical_data as assert_actual_next
from web_reader_four_boundary_history import copy_historical_fixture
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    historical_c1_approved_catalogue)


def independent_current34():
    raw=(ROOT/'docs/evidence/apadana/english335-350/RUNTIME_INVENTORY.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='839e675a31a1eae8329f4942b1b60f453ce860d1c89d85c78300762fcb00b186'
    value=json.loads(raw)
    assert value['candidate_commit']=='aec778d99aabccec6794a641072e463830e85542'
    assert len(value['files'])==34
    return value['files']


def historical343_input(root):
    # Explicit immutable TEST INPUT, never a projection of a current API result.
    raw=(root/'docs/evidence/apadana/english335-350/BASELINE343_FULL_OBJECTS.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='74c8c358e0bebec17f8679289f533975ee2e95270d3c7017aeb19594464d7a5e'
    value=json.loads(raw)
    assert value['commit']=='3d614795cf95e45280603e95f68846c52eba4818'
    assert list(value['profiles'])==list(value['links']) and len(value['profiles'])==343
    return {'ids':list(value['profiles']), 'profiles':value['profiles'],
            'links':value['links'], 'source':value['manifest_source']}


def verify_current_and_historical_closure(root,current359,current34):
    intake359.fresh_proofs(root)  # all13 physical proofs; never a real-root fallback
    assert assert_actual_next(root)==current34
    old=historical343_input(root)
    assert len(current359['ids'])==len(current359['profiles'])==len(current359['links'])==359
    for uid in old['ids']:
        assert current359['profiles'][uid]==old['profiles'][uid]
        assert current359['links'][uid]==old['links'][uid]
    raw=(root/intake359.AP_FIXTURE).read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='18ef986dccbc05cabf311ba44d553b0cf415893484428eecdd476bfe2e1f4bbf'
    assert len(json.loads(raw)['links'])==343
    actual=(root/'server/data/apadana.json').read_bytes()
    assert {'bytes':len(actual),'sha256':hashlib.sha256(actual).hexdigest()}==current34['data/apadana.json']
    assert len(json.loads(actual)['links'])==359
    h.assert_preserved_c1_catalogue(root,old)
    return old


class SixOperationScopeControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        expected34=independent_current34()
        assert assert_actual_next(ROOT)==expected34
        cls.temp = tempfile.TemporaryDirectory(prefix='pali-six-operation-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        shutil.copytree(ROOT / 'docs/evidence/apadana', cls.root / 'docs/evidence/apadana')
        copy_historical_fixture(ROOT, cls.root)
        for name in ('tests/fixtures/reviewed-runtime-2449.json',
                'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json'):
            target = cls.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        cls.parent = h.parent343_records(cls.root)
        cls.approved = approved_catalogue(cls.root)
        assert len(cls.approved['ids']) == 359
        cls.runtime = approved_runtime(cls.root)
        assert cls.runtime == expected34
        assert len(cls.runtime) == 34
        cls.historical343=verify_current_and_historical_closure(cls.root,cls.approved,cls.runtime)

    @contextlib.contextmanager
    def change(self, name, missing=False, preserve_mtime=False):
        path = self.root / name
        raw = path.read_bytes()
        stamp = path.stat()
        try:
            if missing:
                path.unlink()
            else:
                path.write_bytes(bytes([raw[0] ^ 1]) + raw[1:])
                if preserve_mtime:
                    os.utime(path, ns=(stamp.st_atime_ns, stamp.st_mtime_ns))
            yield
        finally:
            path.write_bytes(raw)
            os.utime(path, ns=(stamp.st_atime_ns, stamp.st_mtime_ns))

    def test_01_verified_immutable_original_bytes_within_one_operation(self):
        with h._c1_operation_scope(self.root) as scope:
            for name in h.C1_DATA_PATHS:
                raw = h._historical_c1_data_bytes(scope, name)
                self.assertIs(type(raw), bytes)
                self.assertEqual({'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()},
                    self.parent[name.removeprefix('server/')])
                self.assertEqual(h._historical_c1_data_bytes(scope, name), raw)
            with self.assertRaises((ValueError, AssertionError)):
                h._historical_c1_data_bytes(scope, '../unreviewed')
        with self.assertRaises(ValueError):
            h._historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])
        with mock.patch.object(h, '_capture_actual_data', wraps=h._capture_actual_data) as fresh:
            self.assertEqual(approved_catalogue(self.root), self.approved)
            self.assertEqual(fresh.call_count, 1,
                'One public catalogue operation must verify all27 once, not recursively rehash them')

    def test_02_public_gates_reject_active_and_closed_internal_scopes(self):
        with h._c1_operation_scope(self.root) as scope:
            for phase in ('active',):
                for gate in (h.assert_six_current_canonical_data, approved_catalogue,
                        approved_runtime, historical_c1_approved_catalogue):
                    with self.subTest(phase=phase, gate=gate.__name__), self.assertRaises(ValueError):
                        gate(scope)
                with self.assertRaises(ValueError):
                    h.historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])
                with self.assertRaises(ValueError):
                    with h._c1_operation_scope(scope):
                        self.fail('Internal scope must not reenter a public operation')
        for gate in (h.assert_six_current_canonical_data, approved_catalogue,
                approved_runtime, historical_c1_approved_catalogue):
            with self.subTest(phase='closed', gate=gate.__name__), self.assertRaises(ValueError):
                gate(scope)
        with self.assertRaises(ValueError):
            h.historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])
        with self.assertRaises(ValueError):
            Path(scope)

    def test_03_exception_closes_and_prevents_escaped_reuse(self):
        class DeliberateFailure(Exception):
            pass
        escaped = []
        with self.assertRaises(DeliberateFailure):
            with h._c1_operation_scope(self.root) as scope:
                escaped.append(scope)
                h._historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])
                raise DeliberateFailure()
        for scope in escaped:
            with self.assertRaises(ValueError):
                h._historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])
            with self.assertRaises(ValueError):
                with h._c1_operation_scope(scope):
                    self.fail('Escaped closed scope must not create a new operation')

    def test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime(self):
        # The original seven-case suite checks every27 actual file. These three
        # representative files additionally exercise separate public entry points.
        for name in ('server/data/source-notes.json', 'server/data/apadana.json',
                'server/data/canon.json.gz.part-0002'):
            with h._c1_operation_scope(self.root) as scope:
                h._historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])
            self.assertEqual(approved_catalogue(self.root), self.approved)
            with self.change(name, preserve_mtime=True):
                for gate in (h.assert_six_current_canonical_data, approved_catalogue):
                    with self.subTest(path=name, gate=gate.__name__), self.assertRaises((ValueError, AssertionError)):
                        gate(self.root)
                with self.assertRaises((ValueError, AssertionError)):
                    h.historical_c1_data_bytes(self.root, h.C1_DATA_PATHS[0])
                with self.assertRaises((ValueError, AssertionError)):
                    with h._c1_operation_scope(self.root):
                        self.fail('A new operation must verify new actual bytes')
            h.assert_six_current_canonical_data(self.root)
            self.assertEqual(approved_catalogue(self.root), self.approved)

    def test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation(self):
        names = (h.PROOF_DIRECTORY + '/' + h.ORACLE_NAME,
            h.PROOF_DIRECTORY + '/runtime/' + h.INVENTORY_NAME,
            h.PROOF_DIRECTORY + '/runtime/' + h.REVIEW_NAME,
            'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_INVENTORY.json',
            'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json',
            h.PROOF_DIRECTORY + '/C1_IMMUTABLE_EXPECTATIONS.json')
        for name in names:
            for missing in (False, True):
                with h._c1_operation_scope(self.root) as scope:
                    h._historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])
                    with self.change(name, missing=missing), self.subTest(path=name, missing=missing):
                        with self.assertRaises((ValueError, AssertionError)):
                            h._historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])
                    h._historical_c1_data_bytes(scope, h.C1_DATA_PATHS[0])

    def test_06_every_original_fixture_is_verified_before_operation_use(self):
        for name in h.C1_DATA_PATHS:
            fixture = 'tests/fixtures/canon-before-six/' + Path(name).name
            for missing in (False, True):
                with self.change(fixture, missing=missing), self.subTest(path=fixture, missing=missing):
                    with self.assertRaises((ValueError, AssertionError)):
                        with h._c1_operation_scope(self.root):
                            self.fail('Unverified old bytes must never enter an operation')

    def test_07_mutation_after_capture_never_survives_the_next_operation(self):
        # Snapshot use is coherent within one synchronous internal operation;
        # it cannot create a stale public approval for the next invocation.
        name = 'server/data/canon.json.gz.part-0002'
        with h._c1_operation_scope(self.root) as scope:
            old = h._historical_c1_data_bytes(scope, name)
            with self.change(name, preserve_mtime=True):
                self.assertEqual(h._historical_c1_data_bytes(scope, name), old)
                with self.assertRaises((ValueError, AssertionError)):
                    h.historical_c1_data_bytes(self.root, name)
        h.assert_six_current_canonical_data(self.root)


if __name__ == '__main__':
    unittest.main()
