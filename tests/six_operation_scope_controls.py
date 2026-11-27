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
from owned_apadana_proofs import copy_owned_apadana_proof_inputs
import web_reader_six_boundary_history as h
import web_reader_intake359 as intake359
import web_reader_intake368 as intake368
from web_reader_next_ten_boundary_history import assert_next_ten_current_canonical_data as assert_actual_next
from web_reader_four_boundary_history import copy_historical_fixture
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    historical_c1_approved_catalogue)


def independent_historical359_runtime():
    raw=(ROOT/'docs/evidence/apadana/english335-350/RUNTIME_INVENTORY.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='839e675a31a1eae8329f4942b1b60f453ce860d1c89d85c78300762fcb00b186'
    value=json.loads(raw)
    assert value['candidate_commit']=='aec778d99aabccec6794a641072e463830e85542'
    assert len(value['files'])==34
    return value['files']


def independent_current34():
    previous = independent_historical359_runtime()
    return intake368._runtime(ROOT,previous,intake368._authority(ROOT))


def historical343_input(root):
    # Explicit immutable TEST INPUT, never a projection of a current API result.
    raw=(root/'docs/evidence/apadana/english335-350/BASELINE343_FULL_OBJECTS.json').read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='74c8c358e0bebec17f8679289f533975ee2e95270d3c7017aeb19594464d7a5e'
    value=json.loads(raw)
    assert value['commit']=='3d614795cf95e45280603e95f68846c52eba4818'
    assert list(value['profiles'])==list(value['links']) and len(value['profiles'])==343
    return {'ids':list(value['profiles']), 'profiles':value['profiles'],
            'links':value['links'], 'source':value['manifest_source']}


def verify_current_and_historical_closure(root,current368,current34):
    intake359.fresh_proofs(root)  # all13 physical historical proofs remain mandatory
    intake368.fresh_proofs(root)
    assert assert_actual_next(root)==current34
    old=historical343_input(root)
    assert len(current368['ids'])==len(current368['profiles'])==len(current368['links'])==368
    for uid in old['ids']:
        assert current368['profiles'][uid]==old['profiles'][uid]
        assert current368['links'][uid]==old['links'][uid]
    raw=(root/intake359.AP_FIXTURE).read_bytes()
    assert hashlib.sha256(raw).hexdigest()=='18ef986dccbc05cabf311ba44d553b0cf415893484428eecdd476bfe2e1f4bbf'
    assert len(json.loads(raw)['links'])==343
    actual=(root/'server/data/apadana.json').read_bytes()
    assert {'bytes':len(actual),'sha256':hashlib.sha256(actual).hexdigest()}==current34['data/apadana.json']
    assert len(json.loads(actual)['links'])==368
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
        copy_owned_apadana_proof_inputs(ROOT, cls.root)
        copy_historical_fixture(ROOT, cls.root)
        for name in ('tests/fixtures/reviewed-runtime-2449.json',
                'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json'):
            target = cls.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        cls.parent = h.parent343_records(cls.root)
        cls.approved = approved_catalogue(cls.root)
        assert len(cls.approved['ids']) == 368
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

        self._assert_current368_operation_proof_bytes()

    def _assert_current368_operation_proof_bytes(self):
        # Additive current368 controls within the original physical-proof case.
        # The seven original method names and every original assertion remain.
        from threading import Thread
        import web_reader_next_ten_boundary_history as ten
        with h._c1_operation_scope(self.root) as scope:
            binding = scope._next_ten_binding
            snapshot = binding._proof368
            self.assertEqual(list(snapshot._raw),
                [*intake368.PINS, intake368.RUNTIME_NAME, intake368.REVIEW_NAME])
            self.assertEqual(len(snapshot._raw), 16)
            with self.assertRaises(AttributeError):
                snapshot._active = False
            with self.assertRaises(ValueError):
                snapshot._claim(object())
            with self.assertRaises(ValueError):
                snapshot._claim(binding)  # second valid claimant still refuses
            with self.assertRaises(ValueError):
                snapshot._fresh(self.root, object())
            with tempfile.TemporaryDirectory(prefix='pali-proof-wrong-root-') as temp:
                with self.assertRaises(ValueError):
                    snapshot._fresh(Path(temp), binding)
            refused = []
            def foreign_thread():
                try:
                    snapshot._fresh(self.root, binding)
                except ValueError:
                    refused.append(True)
            thread = Thread(target=foreign_thread)
            thread.start(); thread.join(timeout=5)
            self.assertFalse(thread.is_alive())
            self.assertEqual(refused, [True])
            forged = object.__new__(intake368._OperationProofBytes)
            with self.assertRaises((AttributeError, ValueError)):
                forged._fresh(self.root, binding)
            from types import MappingProxyType
            original_raw = snapshot._raw
            class EqualAnything:
                def __eq__(self, other):
                    return True
            for forged_raw in (dict(original_raw), MappingProxyType(dict(original_raw)),
                    MappingProxyType({name: EqualAnything() for name in original_raw})):
                object.__setattr__(snapshot, '_raw', forged_raw)
                try:
                    with self.assertRaises(ValueError):
                        snapshot._fresh(self.root, binding)
                    with self.assertRaises(ValueError):
                        binding._check()
                finally:
                    object.__setattr__(snapshot, '_raw', original_raw)
            invalid = dict(snapshot._raw)
            invalid['APPROVAL.json'] += b' '
            with self.assertRaises(ValueError):
                intake368._OperationProofBytes(self.root, invalid)
            # Even another authentically sealed snapshot cannot replace this
            # binding's original one; identity is not a caller-selectable scope.
            other = intake368._OperationProofBytes(self.root, dict(snapshot._raw))
            with self.assertRaises(ValueError):
                other._fresh(self.root, None)
            for _ in range(2):
                with self.assertRaises(ValueError):
                    other._claim(None)
            claim_refused = []
            def foreign_claim():
                try:
                    other._claim(binding)
                except ValueError:
                    claim_refused.append(True)
            claim_thread = Thread(target=foreign_claim)
            claim_thread.start(); claim_thread.join(timeout=5)
            self.assertFalse(claim_thread.is_alive())
            self.assertEqual(claim_refused, [True])
            with tempfile.TemporaryDirectory(prefix='pali-proof-wrong-claim-root-') as temp:
                wrong_root_binding = object.__new__(ten._NextTenBinding)
                object.__setattr__(wrong_root_binding, '_root', Path(temp))
                with self.assertRaises(ValueError):
                    other._claim(wrong_root_binding)
            other._claim(binding)
            with self.assertRaises(ValueError):
                other._claim(binding)
            object.__setattr__(binding, '_proof368', other)
            try:
                with self.assertRaises(ValueError):
                    ten._binding_records(binding, self.root)
            finally:
                object.__setattr__(binding, '_proof368', snapshot)
                other._close()
            original_pin = intake368.PINS['APPROVAL.json']
            intake368.PINS['APPROVAL.json'] = '0' * 64
            try:
                with self.assertRaises(ValueError):
                    ten._binding_records(binding, self.root)
            finally:
                intake368.PINS['APPROVAL.json'] = original_pin
            original_directory = intake368.DIRECTORY
            with tempfile.TemporaryDirectory(prefix="pali-proof-authentic-directory-") as temp:
                alternate = self.root / ("owned-alternate-" + Path(temp).name)
                alternate.mkdir()
                try:
                    for name, raw in snapshot._raw.items():
                        (alternate / name).write_bytes(raw)
                    intake368.DIRECTORY = alternate.name
                    with self.assertRaises(ValueError):
                        ten._binding_records(binding, self.root)
                finally:
                    intake368.DIRECTORY = original_directory
                    shutil.rmtree(alternate)
            for name in (*intake368.PINS, intake368.RUNTIME_NAME, intake368.REVIEW_NAME):
                relative = intake368.DIRECTORY + '/' + name
                for missing in (False, True):
                    ten._binding_records(binding, self.root)
                    with self.change(relative, missing=missing), self.subTest(current368=name, missing=missing):
                        with self.assertRaises((ValueError, AssertionError)):
                            ten._binding_records(binding, self.root)
                    ten._binding_records(binding, self.root)
                path = self.root / relative
                raw = path.read_bytes()
                target = path.with_name(path.name + '.owned-snapshot-target')
                target.write_bytes(raw)
                path.unlink(); path.symlink_to(target)
                try:
                    with self.subTest(current368=name, authentic_symlink=True):
                        with self.assertRaisesRegex(ValueError, 'symlink'):
                            ten._binding_records(binding, self.root)
                finally:
                    path.unlink(); path.write_bytes(raw); target.unlink()
                ten._binding_records(binding, self.root)
        binding._close()  # normal cleanup remains idempotent
        self.assertFalse(snapshot._active)
        self.assertEqual(dict(snapshot._raw), {})
        self.assertIsNone(snapshot._claimant)
        with self.assertRaises(ValueError):
            snapshot._fresh(self.root, binding)
        with self.assertRaises(ValueError):
            snapshot._claim(object())
        with self.assertRaises(ValueError):
            ten._binding_records(binding, self.root)
        # A consumer failure immediately after construction/yield clears both
        # existing scope state and the new immutable proof buffers.
        with self.assertRaisesRegex(ValueError, 'Owned consumer failure'):
            with h._c1_operation_scope(self.root) as consumer_scope:
                consumer_binding = consumer_scope._next_ten_binding
                consumer_snapshot = consumer_binding._proof368
                raise ValueError('Owned consumer failure')
        self.assertFalse(consumer_scope._active)
        self.assertFalse(consumer_binding._active)
        self.assertFalse(consumer_snapshot._active)
        self.assertEqual(dict(consumer_snapshot._raw), {})
        consumer_scope._close()
        consumer_binding._close()
        consumer_snapshot._close()
        # A failure after capture but before binding claim also clears ownership.
        created = []
        original_capture = intake368._capture_authority_with_proof_bytes
        def capture_then_fail(*args):
            values = original_capture(*args)
            created.append(values[4])
            failer.start()
            return values
        failer = mock.patch.object(ten, 'prior_dd_records',
            side_effect=ValueError('Owned failure before binding claim'))
        try:
            with mock.patch.object(intake368, '_capture_authority_with_proof_bytes', capture_then_fail):
                with self.assertRaisesRegex(ValueError, 'Owned failure before binding claim'):
                    ten._capture_six_test_input(self.root)
        finally:
            failer.stop()
        self.assertEqual(len(created), 1)
        self.assertFalse(created[0]._active)
        self.assertEqual(dict(created[0]._raw), {})
        # The outer context can fail after a valid capture but before yield.
        returned = []
        original_actual = h._capture_actual_data
        def actual_then_fail(*args):
            values = original_actual(*args)
            returned.append(values[1]._binding)
            parent_failer.start()
            return values
        parent_failer = mock.patch.object(h, 'parent343_records',
            side_effect=ValueError('Owned failure before scope yield'))
        try:
            with mock.patch.object(h, '_capture_actual_data', actual_then_fail):
                with self.assertRaisesRegex(ValueError, 'Owned failure before scope yield'):
                    with h._c1_operation_scope(self.root):
                        self.fail('Failed pre-yield validation cannot expose a scope')
        finally:
            parent_failer.stop()
        self.assertEqual(len(returned), 1)
        self.assertFalse(returned[0]._active)
        self.assertEqual(dict(returned[0]._proof368._raw), {})
        h.assert_six_current_canonical_data(self.root)
        # Combined FOUR gates borrow this same private machinery but expose no
        # public carried-scope or Pathlike token API, even for ordinary reads.
        import web_reader_four_boundary_history as four
        original_read_bytes, original_stat = Path.read_bytes, Path.stat
        def four_refuses_before_io(operation):
            with mock.patch.object(Path, 'read_bytes', autospec=True,
                    side_effect=original_read_bytes) as reads, \
                    mock.patch.object(Path, 'stat', autospec=True,
                    side_effect=original_stat) as stats:
                with self.assertRaises(ValueError):
                    operation()
                self.assertEqual(reads.call_count, 0)
                self.assertEqual(stats.call_count, 0)
        with h._c1_operation_scope(self.root) as four_scope:
            for gate, args in ((four.assert_current_canonical_data, ()),
                    (four.historical_data_bytes, (four.CHANGED_DATA[0],)),
                    (four.historical_data_bytes, ('server/data/topics.json',))):
                four_refuses_before_io(lambda gate=gate, args=args: gate(four_scope, *args))
            class FourPathlikeToken:
                calls = 0
                def __fspath__(self):
                    self.calls += 1
                    return str(self_root)
            self_root = self.root
            token = FourPathlikeToken()
            four_refuses_before_io(lambda: four.assert_current_canonical_data(token))
            four_refuses_before_io(lambda: four.historical_data_bytes(token, 'server/data/topics.json'))
            self.assertEqual(token.calls, 0)
            with mock.patch.object(ten, '_capture_six_test_input',
                    wraps=ten._capture_six_test_input) as fresh:
                four._assert_four_current_canonical_data(four_scope)
                self.assertEqual(hashlib.sha256(four._historical_four_data_bytes(
                    four_scope, four.CHANGED_DATA[0])).hexdigest(),
                    four.OLD_DATA[four.CHANGED_DATA[0]]['sha256'])
                self.assertEqual(fresh.call_count, 0)
            original_root = four_scope._root
            with tempfile.TemporaryDirectory(prefix='pali-four-wrong-owner-root-') as temp:
                object.__setattr__(four_scope, '_root', Path(temp))
                try:
                    four_refuses_before_io(lambda: four._assert_four_current_canonical_data(four_scope))
                    four_refuses_before_io(lambda: four._historical_four_data_bytes(four_scope, 'server/data/topics.json'))
                finally:
                    object.__setattr__(four_scope, '_root', original_root)
            four_thread_errors = []
            def four_foreign_thread():
                try:
                    four_refuses_before_io(lambda: four._assert_four_current_canonical_data(four_scope))
                    four_refuses_before_io(lambda: four._historical_four_data_bytes(four_scope, 'server/data/topics.json'))
                except BaseException as error:
                    four_thread_errors.append(type(error).__name__)
            four_thread = Thread(target=four_foreign_thread)
            four_thread.start(); four_thread.join(timeout=5)
            self.assertFalse(four_thread.is_alive())
            self.assertEqual(four_thread_errors, [])
            class ForeignFourScope(h._C1OperationScope):
                pass
            wrong_type = object.__new__(ForeignFourScope)
            four_refuses_before_io(lambda: four._assert_four_current_canonical_data(wrong_type))
            four_refuses_before_io(lambda: four._historical_four_data_bytes(wrong_type, 'server/data/topics.json'))
        for gate, args in ((four.assert_current_canonical_data, ()),
                (four.historical_data_bytes, ('server/data/topics.json',)),
                (four._assert_four_current_canonical_data, ()),
                (four._historical_four_data_bytes, ('server/data/topics.json',))):
            four_refuses_before_io(lambda gate=gate, args=args: gate(four_scope, *args))

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
