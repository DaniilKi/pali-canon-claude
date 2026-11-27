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

    def _assert_old359_operation_proof_bytes(self):
        # Additive historical13 proof controls; all original seven cases remain.
        from threading import Thread
        from types import MappingProxyType
        import web_reader_next_ten_boundary_history as ten
        with h._c1_operation_scope(self.root) as scope:
            binding = scope._next_ten_binding
            snapshot = binding._proof359
            names = [*intake359.PINS, intake359.RUNTIME_NAME, intake359.REVIEW_NAME]
            self.assertEqual(list(snapshot._raw), names)
            self.assertEqual(len(names), 13)
            with self.assertRaises(AttributeError):
                snapshot._active = False
            for claimant in (None, object(), binding):
                with self.assertRaises(ValueError):
                    snapshot._claim(claimant)
            for claimant in (None, object()):
                with self.assertRaises(ValueError):
                    snapshot._fresh(self.root, claimant)
            with tempfile.TemporaryDirectory(prefix='pali-old359-wrong-root-') as temp:
                with self.assertRaises(ValueError):
                    snapshot._fresh(Path(temp), binding)
            refused = []
            def foreign_fresh():
                try:
                    snapshot._fresh(self.root, binding)
                except ValueError:
                    refused.append(True)
            thread = Thread(target=foreign_fresh)
            thread.start(); thread.join(timeout=5)
            self.assertFalse(thread.is_alive())
            self.assertEqual(refused, [True])
            forged = object.__new__(ten._Old359OperationProofBytes)
            with self.assertRaises((ValueError, AttributeError)):
                forged._fresh(self.root, binding)
            with self.assertRaises(TypeError):
                ten._Old359OperationProofBytes(self.root, dict(snapshot._raw))
            with mock.patch.object(intake359, '_regular', return_value=bytearray(b'not immutable bytes')):
                with self.assertRaises(ValueError):
                    ten._Old359OperationProofBytes(self.root)
            other = ten._Old359OperationProofBytes(self.root)
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
            thread = Thread(target=foreign_claim)
            thread.start(); thread.join(timeout=5)
            self.assertFalse(thread.is_alive())
            self.assertEqual(claim_refused, [True])
            with tempfile.TemporaryDirectory(prefix='pali-old359-wrong-claim-root-') as temp:
                wrong = object.__new__(ten._NextTenBinding)
                object.__setattr__(wrong, '_root', Path(temp))
                with self.assertRaises(ValueError):
                    other._claim(wrong)
            other._claim(binding)
            with self.assertRaises(ValueError):
                other._claim(binding)
            object.__setattr__(binding, '_proof359', other)
            try:
                with self.assertRaises(ValueError):
                    ten._binding_records(binding, self.root)
            finally:
                object.__setattr__(binding, '_proof359', snapshot)
                other._close()
            class EqualAnything:
                def __eq__(self, other):
                    return True
            original_raw = snapshot._raw
            for raw in (dict(original_raw), MappingProxyType(dict(original_raw)),
                    MappingProxyType({name: EqualAnything() for name in names})):
                object.__setattr__(snapshot, '_raw', raw)
                try:
                    with self.assertRaises(ValueError):
                        snapshot._fresh(self.root, binding)
                    with self.assertRaises(ValueError):
                        binding._check()
                finally:
                    object.__setattr__(snapshot, '_raw', original_raw)
            original_pin = intake359.PINS['APPROVAL.json']
            intake359.PINS['APPROVAL.json'] = '0' * 64
            try:
                with self.assertRaises(ValueError):
                    ten._binding_records(binding, self.root)
                with self.assertRaises(ValueError):
                    ten._Old359OperationProofBytes(self.root)
            finally:
                intake359.PINS['APPROVAL.json'] = original_pin
            directory = intake359.DIRECTORY
            alternate = self.root / 'owned-old359-alternate'
            alternate.mkdir()
            try:
                for name, raw in snapshot._raw.items():
                    (alternate / name).write_bytes(raw)
                intake359.DIRECTORY = alternate.name
                with self.assertRaises(ValueError):
                    ten._binding_records(binding, self.root)
                with self.assertRaises(ValueError):
                    ten._Old359OperationProofBytes(self.root)
            finally:
                intake359.DIRECTORY = directory
                shutil.rmtree(alternate)
            for name in names:
                relative = directory + '/' + name
                for missing in (False, True):
                    ten._binding_records(binding, self.root)
                    with self.change(relative, missing=missing), self.subTest(old359=name, missing=missing):
                        with self.assertRaises((ValueError, AssertionError)):
                            ten._binding_records(binding, self.root)
                    ten._binding_records(binding, self.root)
                path = self.root / relative
                raw = path.read_bytes()
                target = path.with_name(path.name + '.owned-old359-link')
                target.write_bytes(raw)
                path.unlink(); path.symlink_to(target)
                try:
                    with self.subTest(old359=name, authentic_symlink=True):
                        with self.assertRaisesRegex(ValueError, 'symlink'):
                            ten._binding_records(binding, self.root)
                finally:
                    path.unlink(); path.write_bytes(raw); target.unlink()
                ten._binding_records(binding, self.root)
        self.assertFalse(snapshot._active)
        self.assertIsNone(snapshot._claimant)
        self.assertEqual(dict(snapshot._raw), {})
        for _ in range(2):
            snapshot._close(); binding._close()
        with self.assertRaises(ValueError):
            snapshot._fresh(self.root, binding)
        with self.assertRaises(ValueError):
            snapshot._claim(binding)
        # A current368 capture failure must release its already-created old13.
        created = []
        original_constructor = ten._Old359OperationProofBytes
        def record_old(root):
            value = original_constructor(root)
            created.append(value)
            return value
        with mock.patch.object(ten, '_Old359OperationProofBytes', side_effect=record_old):
            with mock.patch.object(intake368, '_capture_authority_with_proof_bytes',
                    side_effect=ValueError('Owned current368 capture failure')) as failed:
                with self.assertRaisesRegex(ValueError, 'Owned current368 capture failure'):
                    ten._capture_six_test_input(self.root)
                self.assertEqual(failed.call_count, 1)
        self.assertEqual(len(created), 1)
        self.assertFalse(created[0]._active)
        self.assertEqual(dict(created[0]._raw), {})
        with self.assertRaisesRegex(ValueError, 'Owned consumer old13 failure'):
            with h._c1_operation_scope(self.root) as consumer:
                owned = consumer._next_ten_binding
                old_snapshot = owned._proof359
                new_snapshot = owned._proof368
                raise ValueError('Owned consumer old13 failure')
        self.assertFalse(owned._active)
        self.assertEqual(dict(old_snapshot._raw), {})
        self.assertEqual(dict(new_snapshot._raw), {})
        h.assert_six_current_canonical_data(self.root)

    def _assert_current368_operation_proof_bytes(self):
        # Additive current368 controls within the original physical-proof case.
        # The seven original method names and every original assertion remain.
        from threading import Thread
        import web_reader_next_ten_boundary_history as ten
        self._assert_single_lstat_node_guards(ten)
        graph_closes = []
        original_graph_close = ten._OperationRecordGraph._close
        def record_graph_close(graph):
            graph_closes.append(graph)
            return original_graph_close(graph)
        with mock.patch.object(ten._OperationRecordGraph, '_close', record_graph_close):
            with h._c1_operation_scope(self.root) as scope:
                binding = scope._next_ten_binding
                snapshot = binding._proof368
                graph9 = binding._graph9
                closed_other_graph = self._assert_owned_record_graph(ten, binding, scope)
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
                graph_close_marker = len(graph_closes)
                object.__setattr__(binding, '_graph9', closed_other_graph)
        self.assertEqual(graph_closes[graph_close_marker:], [graph9])
        object.__setattr__(binding, '_graph9', graph9)
        binding._close()  # normal cleanup remains idempotent
        self._assert_record_graph_closed(graph9)
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
        self._assert_record_graph_closed(consumer_binding._graph9)
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
            with self._observe_record_graph_construction(ten) as preclaim_graphs:
                with mock.patch.object(intake368, '_capture_authority_with_proof_bytes', capture_then_fail):
                    with self.assertRaisesRegex(ValueError, 'Owned failure before binding claim'):
                        ten._capture_six_test_input(self.root)
        finally:
            failer.stop()
        self.assertEqual(len(preclaim_graphs), 1)
        self._assert_record_graph_closed(preclaim_graphs[0])
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
            with self._observe_valid_record_graph_claim(ten) as claimed_graphs:
                with mock.patch.object(h, '_capture_actual_data', actual_then_fail):
                    with self.assertRaisesRegex(ValueError, 'Owned failure before scope yield'):
                        with h._c1_operation_scope(self.root):
                            self.fail('Failed pre-yield validation cannot expose a scope')
        finally:
            parent_failer.stop()
        self.assertEqual(len(returned), 1)
        self.assertEqual(len(claimed_graphs), 1)
        self.assertIs(claimed_graphs[0][0], returned[0]._graph9)
        self.assertIs(claimed_graphs[0][1], returned[0])
        self._assert_record_graph_closed(returned[0]._graph9)
        self.assertFalse(returned[0]._active)
        self.assertEqual(dict(returned[0]._proof368._raw), {})
        self.assertFalse(returned[0]._proof359._active)
        self.assertEqual(dict(returned[0]._proof359._raw), {})
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

        self._assert_old359_operation_proof_bytes()

    def _assert_record_graph_closed(self, graph):
        self.assertFalse(graph._active)
        self.assertIsNone(graph._claimant)
        self.assertEqual(dict(graph._raw), {})
        self.assertEqual(dict(graph._records), {})
        self.assertEqual(dict(graph._dd_records), {})
        self.assertEqual(graph._configuration, ())
        self.assertEqual(graph._rows, ())
        graph._close(); graph._close()
        self.assertFalse(graph._active)
        original_read, original_stat = Path.read_bytes, Path.stat
        with mock.patch.object(Path, 'read_bytes', autospec=True, side_effect=original_read) as reads, \
                mock.patch.object(Path, 'stat', autospec=True, side_effect=original_stat) as stats:
            for operation in (lambda: graph._fresh_detached_records(self.root, None),
                              lambda: graph._initial_records(self.root),
                              lambda: graph._initial_dd_records(self.root),
                              lambda: graph._claim(None)):
                with self.assertRaises(ValueError):
                    operation()
            self.assertEqual((reads.call_count, stats.call_count), (0, 0))

    @contextlib.contextmanager
    def _observe_record_graph_construction(self, ten):
        created = []
        original = ten._OperationRecordGraph.__init__
        def recorded(instance, root):
            created.append(instance)  # includes a constructor that raises partway
            return original(instance, root)
        with mock.patch.object(ten._OperationRecordGraph, '__init__', recorded):
            yield created

    @contextlib.contextmanager
    def _observe_valid_record_graph_claim(self, ten):
        # Reuse the existing real pre-yield capture; no synthetic binding or27 pass.
        from threading import Thread
        claimed = []
        original = ten._OperationRecordGraph._claim
        original_read, original_stat = Path.read_bytes, Path.stat
        def checked(graph, claimant):
            self.assertIsNone(graph._claimant)
            self.assertIs(type(claimant), ten._NextTenBinding)
            self.assertIs(claimant._graph9, graph)
            self.assertEqual(claimant._root, graph._root)
            with tempfile.TemporaryDirectory(prefix='pali-unclaimed-graph-root-') as temp:
                with mock.patch.object(Path, 'read_bytes', autospec=True, side_effect=original_read) as reads, \
                        mock.patch.object(Path, 'stat', autospec=True, side_effect=original_stat) as stats:
                    with self.assertRaises(ValueError):
                        graph._fresh_detached_records(self.root, claimant)
                    for foreign in (None, object()):
                        with self.assertRaises(ValueError):
                            original(graph, foreign)
                    root = claimant._root
                    object.__setattr__(claimant, '_root', Path(temp))
                    try:
                        with self.assertRaises(ValueError):
                            original(graph, claimant)
                    finally:
                        object.__setattr__(claimant, '_root', root)
                    refused, errors = [], []
                    def foreign_thread():
                        try:
                            with self.assertRaises(ValueError):
                                original(graph, claimant)
                            refused.append(True)
                        except BaseException as error:
                            errors.append(type(error).__name__)
                    thread = Thread(target=foreign_thread)
                    thread.start(); thread.join(timeout=5)
                    self.assertFalse(thread.is_alive())
                    self.assertEqual((refused, errors), ([True], []))
                    self.assertIsNone(graph._claimant)
                    original(graph, claimant)  # exact real constructor claim succeeds
                    self.assertIs(graph._claimant, claimant)
                    with self.assertRaises(ValueError):
                        original(graph, claimant)
                    with self.assertRaises(ValueError):
                        graph._initial_records(self.root)
                    with self.assertRaises(ValueError):
                        graph._initial_dd_records(self.root)
                    self.assertEqual((reads.call_count, stats.call_count), (0, 0))
            claimed.append((graph, claimant))
        with mock.patch.object(ten._OperationRecordGraph, '_claim', checked):
            yield claimed

    def _assert_record_graph_creation_rollback(self, ten):
        # Failure before any graph bytes are retained.
        with self._observe_record_graph_construction(ten) as early:
            with mock.patch.object(ten, 'proof_records',
                    side_effect=ValueError('Owned record semantic failure')) as semantic:
                with self.assertRaisesRegex(ValueError, '^Owned record semantic failure$'):
                    ten._OperationRecordGraph(self.root)
                self.assertEqual(semantic.call_count, 1)
        self.assertEqual(len(early), 1)
        self._assert_record_graph_closed(early[0])
        # Real delegated reads return genuine bytes with only the container type
        # changed. Original JSON/SHA accepts bytearray; the new immutable boundary
        # must refuse each original reader kind, including a partial raw capture.
        for owner, message in ((ten, 'Immutable next-ten record proof bytes required'),
                               (h, 'Immutable six-boundary record proof bytes required')):
            original = owner.regular
            def mutable_read(root, name):
                return bytearray(original(root, name))
            with self._observe_record_graph_construction(ten) as mutable:
                with mock.patch.object(owner, 'regular', side_effect=mutable_read):
                    with self.assertRaisesRegex(ValueError, '^' + message + '$'):
                        ten._OperationRecordGraph(self.root)
            self.assertEqual(len(mutable), 1)
            self._assert_record_graph_closed(mutable[0])
        # A complete graph exists, but old359 capture has not returned or made an
        # old13/current16 owner. Reuse the real capture's unchanged failure boundary.
        with self._observe_record_graph_construction(ten) as before_old:
            with mock.patch.object(intake359, '_capture_authority_with_manifest',
                    side_effect=ValueError('Owned failure before old359 capture')) as old:
                with self.assertRaisesRegex(ValueError, '^Owned failure before old359 capture$'):
                    ten._capture_six_test_input(self.root)
                self.assertEqual(old.call_count, 1)
        self.assertEqual(len(before_old), 1)
        self._assert_record_graph_closed(before_old[0])

    def _assert_owned_record_graph(self, ten, binding, scope):
        from types import MappingProxyType
        from threading import Thread
        graph = binding._graph9
        rows = graph._rows
        self._assert_scoped_dd_records(ten, scope, binding)
        next_regular, six_regular = ten.regular, h.regular
        next_digest, six_digest = ten.digest, h.digest
        visited = []
        def read_next(root, name):
            visited.append(('next', name))
            return next_regular(root, name)
        def read_six(root, name):
            visited.append(('six', name))
            return six_regular(root, name)
        with mock.patch.object(ten, 'regular', side_effect=read_next), \
                mock.patch.object(h, 'regular', side_effect=read_six), \
                mock.patch.object(ten, 'digest', wraps=next_digest) as next_sha, \
                mock.patch.object(h, 'digest', wraps=six_digest) as six_sha, \
                mock.patch.object(ten, 'proof_records', wraps=ten.proof_records) as semantic:
            observed = graph._fresh_detached_records(self.root, binding)
            self.assertEqual(visited, [(kind, name) for kind, name, _ in rows])
            self.assertEqual((next_sha.call_count, six_sha.call_count), (3, 6))
            self.assertEqual(semantic.call_count, 0)
        self.assertEqual(observed, binding._records)  # historicalNEXT34, not actual368
        self.assertEqual(list(observed), list(binding._records))
        self.assertIsNot(observed, graph._records)
        self.assertIsNot(observed, binding._records)
        for name, record in observed.items():
            self.assertIsNot(record, graph._records[name])
            self.assertEqual(list(record), list(graph._records[name]))
        first = next(iter(observed))
        observed[first]['bytes'] += 1
        self.assertEqual(graph._fresh_detached_records(self.root, binding), binding._records)
        with self.assertRaises(AttributeError):
            graph._active = False
        with self.assertRaises(TypeError):
            graph._records[first]['bytes'] += 1
        with self.assertRaises(TypeError):
            graph._raw[rows[0][1]] = b'foreign'

        original_read, original_stat = Path.read_bytes, Path.stat
        def refuses_without_io(operation, errors=ValueError):
            with mock.patch.object(Path, 'read_bytes', autospec=True, side_effect=original_read) as reads, \
                    mock.patch.object(Path, 'stat', autospec=True, side_effect=original_stat) as stats:
                with self.assertRaises(errors):
                    operation()
                self.assertEqual((reads.call_count, stats.call_count), (0, 0))
        class EqualAnything:
            def __eq__(self, other):
                return True
        originals = (('_raw', graph._raw), ('_records', graph._records),
                     ('_dd_records', graph._dd_records))
        for field, original in originals:
            candidates = (dict(original), MappingProxyType(dict(original)),
                          MappingProxyType({name: EqualAnything() for name in original}))
            for substitute in candidates:
                object.__setattr__(graph, field, substitute)
                try:
                    refuses_without_io(lambda: graph._fresh_detached_records(self.root, binding))
                    refuses_without_io(binding._check)
                finally:
                    object.__setattr__(graph, field, original)
        for field in ('_configuration', '_rows'):
            original = getattr(graph, field)
            for substitute in ((), tuple(list(original))):
                self.assertIsNot(substitute, original)
                object.__setattr__(graph, field, substitute)
                try:
                    refuses_without_io(lambda: graph._fresh_detached_records(self.root, binding))
                finally:
                    object.__setattr__(graph, field, original)
        class StringSubclass(str):
            pass
        for module, name, kind, expected in ten._RECORD_GRAPH_EXPECTED_CONFIGURATION:
            owner = ten if module == 'next' else h
            changed = (expected + ' UNREVIEWED' if kind == 'str' else
                       tuple(reversed(expected)) if kind == 'tuple' else
                       expected | frozenset({'data/unreviewed.json'}))
            changed_type = (StringSubclass(expected) if kind == 'str' else
                            list(expected) if kind == 'tuple' else set(expected))
            for substitute in (changed, changed_type):
                with mock.patch.object(owner, name, substitute):
                    refuses_without_io(lambda: graph._fresh_detached_records(self.root, binding))
        # These table labels are closed exact strings, not equality/hash callbacks.
        # V1 lacks this guard; this control set explicitly requires the V2 addendum.
        class ForeignLabel:
            def __eq__(self, other):
                raise AssertionError('A foreign record-graph label must not be compared')
            def __hash__(self):
                raise AssertionError('A foreign record-graph label must not be hashed')
        original_table = ten._RECORD_GRAPH_EXPECTED_CONFIGURATION
        for index in (0, 2):  # module and kind label, retaining all37 rows/values
            for substitute in (StringSubclass(original_table[0][index]), ForeignLabel()):
                first_row = list(original_table[0])
                first_row[index] = substitute
                changed_table = (tuple(first_row),) + original_table[1:]
                with mock.patch.object(ten, '_RECORD_GRAPH_EXPECTED_CONFIGURATION', changed_table):
                    refuses_without_io(lambda: graph._fresh_detached_records(self.root, binding))
        self.assertEqual(graph._fresh_detached_records(self.root, binding), binding._records)
        for field in ('_graph9_identity', '_graph9_raw_identity', '_graph9_records_identity',
                      '_graph9_dd_records_identity',
                      '_graph9_config_identity', '_graph9_rows_identity'):
            original = getattr(binding, field)
            object.__setattr__(binding, field, None)
            try:
                refuses_without_io(binding._check)
            finally:
                object.__setattr__(binding, field, original)
        with tempfile.TemporaryDirectory(prefix='pali-graph-wrong-root-') as temp:
            refuses_without_io(lambda: graph._fresh_detached_records(Path(temp), binding))
        for claimant in (None, object()):
            refuses_without_io(lambda: graph._fresh_detached_records(self.root, claimant))
        errors = []
        def foreign_thread():
            try:
                refuses_without_io(lambda: graph._fresh_detached_records(self.root, binding))
            except BaseException as error:
                errors.append(type(error).__name__)
        thread = Thread(target=foreign_thread)
        thread.start(); thread.join(timeout=5)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors, [])
        with self.assertRaises(TypeError):
            ten._OperationRecordGraph(self.root, dict(observed))
        class ForeignPathlike:
            def __fspath__(inner):
                self.fail('A carried graph token must not be converted to a path')
        refuses_without_io(lambda: ten._OperationRecordGraph(ForeignPathlike()))
        refuses_without_io(lambda: graph._claim(binding))
        refuses_without_io(lambda: graph._initial_records(self.root))
        forged = object.__new__(ten._OperationRecordGraph)
        refuses_without_io(lambda: forged._fresh_detached_records(self.root, binding),
                           (ValueError, AttributeError))
        class ForeignGraph(ten._OperationRecordGraph):
            pass
        original_graph = binding._graph9
        object.__setattr__(binding, '_graph9', object.__new__(ForeignGraph))
        try:
            refuses_without_io(binding._check)
        finally:
            object.__setattr__(binding, '_graph9', original_graph)

        # One genuine second graph reuses no caller-provided records. It validates
        # original semantics once, cannot steal this occupied owner, and cannot
        # replace its original graph by changing only the primary field.
        with mock.patch.object(ten, 'proof_records', wraps=ten.proof_records) as semantic:
            other = ten._OperationRecordGraph(self.root)
            self.assertEqual(semantic.call_count, 1)
        try:
            initial = other._initial_records(self.root)
            self.assertEqual(initial, binding._records)
            initial[first]['bytes'] += 1
            self.assertEqual(other._initial_records(self.root), binding._records)
            refuses_without_io(lambda: other._fresh_detached_records(self.root, binding))
            for claimant in (None, object(), binding):
                refuses_without_io(lambda: other._claim(claimant))
            object.__setattr__(binding, '_graph9', other)
            try:
                refuses_without_io(binding._check)
                refuses_without_io(lambda: ten._binding_records(binding, self.root))
            finally:
                object.__setattr__(binding, '_graph9', original_graph)
        finally:
            other._close()
        self._assert_record_graph_closed(other)
        refuses_without_io(lambda: other._fresh_detached_records(self.root, binding))
        refuses_without_io(lambda: other._claim(binding))
        refuses_without_io(lambda: other._initial_records(self.root))

        for _kind, name, _pin in rows:
            for missing in (False, True):
                graph._fresh_detached_records(self.root, binding)
                with self.change(name, missing=missing):
                    with self.assertRaises((ValueError, AssertionError)):
                        graph._fresh_detached_records(self.root, binding)
                    if _kind == 'six':
                        with self.assertRaises((ValueError, AssertionError)):
                            ten._scope_dd_records(scope)
                graph._fresh_detached_records(self.root, binding)
            path = self.root / name
            raw = path.read_bytes()
            authentic = path.with_name(path.name + '.owned-graph-authentic')
            authentic.write_bytes(raw)
            path.unlink()
            try:
                path.symlink_to(authentic)
                with self.assertRaisesRegex(ValueError, 'symlink'):
                    graph._fresh_detached_records(self.root, binding)
                if _kind == 'six':
                    with self.assertRaisesRegex(ValueError, 'symlink'):
                        ten._scope_dd_records(scope)
            finally:
                if path.is_symlink() or path.exists():
                    path.unlink()
                path.write_bytes(raw); authentic.unlink()
            graph._fresh_detached_records(self.root, binding)
        self._assert_record_graph_creation_rollback(ten)
        self._assert_dd_constructor_parse_rollback(ten)
        self.assertEqual(ten._scope_dd_records(scope), scope._records)
        return other  # authentic, already closed; reused for close-recipient control

    def _assert_scoped_dd_records(self, ten, scope, binding):
        # Reuse the existing active capture. No extra operation or proof-mutation loop.
        graph = binding._graph9
        rows = graph._rows[1:7]
        original_regular, original_sha = h.regular, h.digest
        original_fspath = h._C1OperationScope.__fspath__
        original_check = h._C1OperationScope._check
        seen, fspaths, checks = [], [], []
        def regular(root, name):
            self.assertIs(root, scope)
            seen.append(name)
            return original_regular(root, name)
        def fspath(current):
            if current is scope:
                fspaths.append(current)
            return original_fspath(current)
        def check(current):
            if current is scope:
                checks.append(current)
            return original_check(current)
        with mock.patch.object(h, 'regular', side_effect=regular), \
                mock.patch.object(h, 'digest', wraps=original_sha) as six_sha, \
                mock.patch.object(ten, 'digest', wraps=ten.digest) as next_sha, \
                mock.patch.object(h._C1OperationScope, '__fspath__', fspath), \
                mock.patch.object(h._C1OperationScope, '_check', check):
            observed = ten._scope_dd_records(scope)
            self.assertEqual(seen, [name for _kind, name, _pin in rows])
            self.assertEqual((len(fspaths), len(checks)), (6, 7))
            self.assertEqual((six_sha.call_count, next_sha.call_count), (6, 0))
        self.assertEqual(observed, scope._records)  # independent LIVE prior-DD capture
        self.assertNotEqual(observed, binding._records)  # NEXT34 is a different layer
        self.assertNotEqual(observed, binding._current368)
        self.assertEqual(list(observed), list(scope._records))
        self.assertIsNot(observed, scope._records)
        self.assertIsNot(observed, graph._dd_records)
        for name, record in observed.items():
            self.assertIsNot(record, graph._dd_records[name])
            self.assertEqual(list(record), list(graph._dd_records[name]))
        first = next(iter(observed))
        observed[first]['bytes'] += 1
        self.assertEqual(ten._scope_dd_records(scope), scope._records)

        # The independent expected-DD comparison must occur AFTER all six reads.
        from types import MappingProxyType
        expected = scope._records
        forged = {name: dict(row) for name, row in expected.items()}
        forged[first]['bytes'] += 1
        object.__setattr__(scope, '_records', MappingProxyType(forged))
        seen.clear()
        try:
            with mock.patch.object(h, 'regular', side_effect=regular):
                with self.assertRaises(AssertionError):
                    ten._scope_dd_records(scope)
            self.assertEqual(seen, [name for _kind, name, _pin in rows])
        finally:
            object.__setattr__(scope, '_records', expected)

        # The *next* original __fspath__ guard must detect drift after row1. Passing
        # a preconverted Path could falsely pass a file-only readset comparison.
        original_read = Path.read_bytes
        with tempfile.TemporaryDirectory(prefix='pali-dd-midrow-') as temp:
            linked = Path(temp) / 'linked-root'
            linked.symlink_to(self.root, target_is_directory=True)
            for field, replacement in (('_active', False), ('_owner', -1), ('_root', linked)):
                original = getattr(scope, field)
                seen.clear()
                def drift(root, name):
                    raw = regular(root, name)
                    if len(seen) == 1:
                        object.__setattr__(scope, field, replacement)
                    return raw
                try:
                    with mock.patch.object(h, 'regular', side_effect=drift), \
                            mock.patch.object(Path, 'read_bytes', autospec=True, side_effect=original_read) as reads:
                        with self.assertRaises(ValueError):
                            ten._scope_dd_records(scope)
                        self.assertEqual(seen, [rows[0][1], rows[1][1]])
                        self.assertEqual(reads.call_count, 1)
                finally:
                    object.__setattr__(scope, field, original)
        self.assertEqual(ten._scope_dd_records(scope), scope._records)

        # Direct private DD entry must reject invalid COMPLETE binding ownership
        # without relying on the later full NEXT9/13/16 pass to catch it.
        original_stat = Path.stat
        for field, replacement in (('_active', False), ('_owner', -1)):
            original = getattr(binding, field)
            object.__setattr__(binding, field, replacement)
            try:
                with mock.patch.object(Path, 'read_bytes', autospec=True, side_effect=original_read) as reads, \
                        mock.patch.object(Path, 'stat', autospec=True, side_effect=original_stat) as stats:
                    with self.assertRaises(ValueError):
                        graph._fresh_scoped_dd_records(scope, binding)
                    self.assertEqual((reads.call_count, stats.call_count), (0, 0))
            finally:
                object.__setattr__(binding, field, original)

    def _assert_dd_constructor_parse_rollback(self, ten):
        # One new constructor-only failure, no operation/data capture. Delegate the
        # original decoder except its second decode of this genuine pinned buffer:
        # original SIX semantics first, newly introduced captured-DD parse second.
        expected = (self.root / h.PROOF_DIRECTORY / 'runtime' / h.INVENTORY_NAME).read_bytes()
        original_loads = ten.json.loads
        decodes = []
        def reject_captured_dd(raw, *args, **kwargs):
            if type(raw) is bytes and raw == expected:
                decodes.append(True)
                if len(decodes) == 2:
                    raise ValueError('Owned captured DD parse failure')
            return original_loads(raw, *args, **kwargs)
        with self._observe_record_graph_construction(ten) as created:
            with mock.patch.object(ten.json, 'loads', side_effect=reject_captured_dd):
                with self.assertRaisesRegex(ValueError, '^Owned captured DD parse failure$'):
                    ten._OperationRecordGraph(self.root)
        self.assertEqual(len(decodes), 2)
        self.assertEqual(len(created), 1)
        self._assert_record_graph_closed(created[0])

    def _assert_single_lstat_node_guards(self, ten):
        # Called only from the existing case05 helper; no registered test is added.
        # Portable synthetic reparse/error checks are not native Windows acceptance.
        import errno
        import stat
        from types import SimpleNamespace
        original_stat, original_read = Path.stat, Path.read_bytes
        with tempfile.TemporaryDirectory(prefix='pali-lstat-control-') as directory:
            root = Path(directory)
            target = root / 'proof.json'
            target.write_bytes(b'owned lstat control')
            link = root / 'link.json'
            link.symlink_to(target)
            link_info = original_stat(link, follow_symlinks=False)
            self.assertTrue(stat.S_ISLNK(link_info.st_mode))
            ordinary_link_stats = [False, False] if getattr(link_info, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT else [False]
            state = {'kind': 'ordinary', 'stats': [], 'reads': []}

            def current_stat(path, *, follow_symlinks=True):
                state['stats'].append((path, follow_symlinks))
                if path == target and not follow_symlinks:
                    if state['kind'] in ('ignored', 'denied'):
                        raise OSError(state['ignored_errno'] if state['kind'] == 'ignored' else errno.EACCES,
                                      'synthetic metadata error')
                info = original_stat(path, follow_symlinks=follow_symlinks)
                if path in (target, link) and not follow_symlinks and state['kind'] == 'reparse':
                    return SimpleNamespace(st_mode=info.st_mode,
                        st_file_attributes=stat.FILE_ATTRIBUTE_REPARSE_POINT)
                return info

            def current_read(path):
                state['reads'].append(path)
                return original_read(path)

            with mock.patch.object(Path, 'stat', current_stat), mock.patch.object(Path, 'read_bytes', current_read):
                for kind, code, expected_leaf_stats in (('ordinary', None, [False]),
                        *((('ignored', code, [False, True]) for code in
                           (errno.ENOENT, errno.ENOTDIR, errno.EBADF, errno.ELOOP))),
                        ('reparse', None, [False, False, True])):
                    state.update(kind=kind, ignored_errno=code, stats=[], reads=[])
                    self.assertEqual(ten.regular(root, 'proof.json'), b'owned lstat control')
                    self.assertEqual([follow for path, follow in state['stats'] if path == target],
                                     expected_leaf_stats)
                    self.assertEqual([follow for path, follow in state['stats'] if path == root],
                                     [False, True])
                    self.assertEqual(state['reads'], [target])
                state.update(kind='denied', stats=[], reads=[])
                with self.assertRaises(PermissionError):
                    ten.regular(root, 'proof.json')
                self.assertEqual(state['reads'], [])
                for kind, expected_link_stats in (('ordinary', ordinary_link_stats),
                                                  ('reparse', [False, False])):
                    state.update(kind=kind, stats=[], reads=[])
                    with self.assertRaisesRegex(ValueError, '^Next-ten authority symlink refused$'):
                        ten.regular(root, 'link.json')
                    self.assertEqual([follow for path, follow in state['stats'] if path == link],
                                     expected_link_stats)
                    self.assertEqual(state['reads'], [])
            target.write_bytes(b'fresh replacement')
            self.assertEqual(ten.regular(root, 'proof.json'), b'fresh replacement')
        self.assertFalse(root.exists())
        # One-node snapshot deliberately removes the ordinary following-stat syscall.
        # An error injected ONLY into that removed syscall is not an equal-outcome
        # oracle; the external failed checkpoint records this boundary explicitly.

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
