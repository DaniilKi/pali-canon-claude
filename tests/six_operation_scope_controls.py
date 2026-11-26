"""Scoped history reuse must retain fresh public integrity and fail closed.

All mutations use one owned disposable fixture. No app/network/Git/subprocess.
"""
import contextlib
import hashlib
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
from web_reader_four_boundary_history import copy_historical_fixture
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    historical_c1_approved_catalogue)


class SixOperationScopeControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
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
        h.assert_preserved_c1_catalogue(cls.root, cls.approved)
        assert len(cls.approved['ids']) == 343
        cls.runtime = approved_runtime(cls.root)
        assert len(cls.runtime) == 34

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
