"""Three bounded controls for actual368 versus explicit historical359 QA inputs."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import web_reader_next_ten_boundary_history as ten
import web_reader_six_boundary_history as six
import web_reader_intake368 as intake
from owned_intake368_proofs import copy_owned_intake368_proof_inputs
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    approved359_catalogue, approved359_runtime)

D = 'docs/evidence/apadana/english351-360-nine/'
IDS = ['tha-ap353','tha-ap354','tha-ap355','tha-ap356','tha-ap357','tha-ap358','tha-ap359','tha-ap361','tha-ap362']
PINS = {'RUNTIME_INVENTORY.json':intake.RUNTIME_SHA,
        'BASELINE_RUNTIME34.json':intake.PINS['BASELINE_RUNTIME34.json'],
        'BASELINE359_FULL_OBJECTS.json':intake.PINS['BASELINE359_FULL_OBJECTS.json']}
sha = lambda raw: hashlib.sha256(raw).hexdigest()


def sealed(name):
    raw = (ROOT / (D + name)).read_bytes()
    assert sha(raw) == PINS[name]
    return json.loads(raw)


class Intake368Controls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # A genuine current positive precedes every owned fixture and negative.
        cls.approved = approved_catalogue(ROOT)
        assert len(cls.approved['ids']) == len(cls.approved['profiles']) == len(cls.approved['links']) == 368
        assert cls.approved['ids'][-9:] == IDS
        cls.current = sealed('RUNTIME_INVENTORY.json')['files']
        cls.prior_runtime = sealed('BASELINE_RUNTIME34.json')['files']
        cls.old = sealed('BASELINE359_FULL_OBJECTS.json')
        assert approved_runtime(ROOT) == cls.current
        for uid in cls.old['profiles']:
            assert cls.approved['profiles'][uid] == cls.old['profiles'][uid]
            assert cls.approved['links'][uid] == cls.old['links'][uid]
        cls.temp = tempfile.TemporaryDirectory(prefix='pali368-history-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        copy_owned_intake368_proof_inputs(ROOT, cls.root)
        assert ten.assert_next_ten_current_canonical_data(cls.root) == cls.current

    @contextmanager
    def changed(self, relative, *, missing=False, replacement=None):
        path = self.root / relative
        raw, stamp = path.read_bytes(), path.stat()
        try:
            if missing:
                path.unlink()
            else:
                path.write_bytes(replacement if replacement is not None else bytes([raw[0] ^ 1]) + raw[1:])
                os.utime(path, ns=(stamp.st_atime_ns, stamp.st_mtime_ns))
                self.assertEqual(path.stat().st_mtime_ns, stamp.st_mtime_ns)
            yield
        finally:
            path.write_bytes(raw)
            os.utime(path, ns=(stamp.st_atime_ns, stamp.st_mtime_ns))

    def test_01_current368_and_actual34_do_not_replace_explicit_historical359(self):
        historical = approved359_catalogue(self.root)
        self.assertEqual(historical, {'ids':list(self.old['profiles']), 'profiles':self.old['profiles'],
                                     'links':self.old['links'], 'source':self.old['manifest_source']})
        self.assertEqual(approved359_runtime(self.root), self.prior_runtime)
        self.assertEqual(approved_runtime(self.root), self.current)
        self.assertNotEqual(self.prior_runtime, self.current)
        self.assertEqual(len(json.loads((self.root / intake.AP_FIXTURE).read_bytes())['links']),359)
        self.assertEqual(len(json.loads((self.root / intake.AP_PATH).read_bytes())['links']),368)
        # Returned metadata is a fresh ordinary object, not an alias into a seal.
        with six._c1_operation_scope(self.root) as scope:
            first = ten._current368_catalogue(scope._next_ten_binding, scope._root, historical)
            first['profiles']['tha-ap13']['title'] = 'SYNTHETIC_CALLER_MUTATION'
            second = ten._current368_catalogue(scope._next_ten_binding, scope._root, historical)
            self.assertEqual(second, self.approved)
            runtime = ten._current368_records(scope._next_ten_binding, scope._root)
            runtime['data/apadana.json']['sha256'] = '0' * 64
            self.assertEqual(ten._current368_records(scope._next_ten_binding, scope._root),self.current)

    def test_02_warm_new_proof_data_and_historical_fixture_controls_never_become_current_positive(self):
        for name in ('APPROVAL.json','PROFILES.json','RUNTIME_INVENTORY.json','RUNTIME_REVIEW.json'):
            for missing in (False,True):
                self.assertEqual(ten.assert_next_ten_current_canonical_data(self.root),self.current)
                with self.changed(D + name, missing=missing):
                    with self.assertRaises((AssertionError, ValueError, FileNotFoundError)):
                        ten.assert_next_ten_current_canonical_data(self.root)
                self.assertEqual(ten.assert_next_ten_current_canonical_data(self.root),self.current)
        old = (self.root / intake.AP_FIXTURE).read_bytes()
        self.assertNotEqual(sha(old),self.current['data/apadana.json']['sha256'])
        for replacement in (old,None):
            self.assertEqual(ten.assert_next_ten_current_canonical_data(self.root),self.current)
            with self.changed(intake.AP_PATH,replacement=replacement):
                with self.assertRaises((AssertionError,ValueError)):
                    ten.assert_next_ten_current_canonical_data(self.root)
        with self.changed(intake.AP_FIXTURE):
            with self.assertRaises((AssertionError,ValueError)):
                ten.assert_next_ten_current_canonical_data(self.root)
        self.assertEqual(ten.assert_next_ten_current_canonical_data(self.root),self.current)

    def test_03_private_binding_stays_fresh_root_thread_owned_and_closed_without_recapturing27(self):
        expected = {'server/'+p for p in self.current if p.startswith('data/')}
        self.assertEqual(len(expected),27)
        reads = Counter()
        original = ten.regular
        def observed(root,relative):
            reads[relative] += 1
            return original(root,relative)
        with mock.patch.object(ten,'regular',side_effect=observed):
            with six._c1_operation_scope(self.root) as scope:
                binding = scope._next_ten_binding
                self.assertEqual({p:reads[p] for p in expected},{p:1 for p in expected})
                count = reads[D+'RUNTIME_REVIEW.json']
                ten._current368_records(binding,self.root)
                six._historical_c1_data_bytes(scope,intake.AP_PATH)
                self.assertEqual({p:reads[p] for p in expected},{p:1 for p in expected})
                self.assertGreater(reads[D+'RUNTIME_REVIEW.json'],count)
                with self.changed(D+'APPROVAL.json',missing=True):
                    with self.assertRaises((AssertionError,ValueError,FileNotFoundError)):
                        ten._current368_records(binding,self.root)
                with self.assertRaises(ValueError):
                    ten._binding_records(binding,self.root/'foreign-root')
                for gate in (approved_catalogue,approved_runtime,ten.assert_next_ten_current_canonical_data):
                    with self.assertRaises(ValueError):gate(scope)
                with self.assertRaises(AttributeError):binding._current368 = {}
                with self.assertRaises(TypeError):binding._current368['data/apadana.json'] = {}
                object.__setattr__(scope,'_next_ten_binding',None)
                try:
                    with self.assertRaises(ValueError):six._historical_c1_data_bytes(scope,intake.AP_PATH)
                finally:
                    object.__setattr__(scope,'_next_ten_binding',binding)
                with ThreadPoolExecutor(max_workers=1) as executor:
                    result=executor.submit(ten._current368_records,binding,self.root)
                    with self.assertRaises(ValueError):result.result(timeout=5)
                self.assertEqual(ten._current368_records(binding,self.root),self.current)
        self.assertEqual(binding._catalogue368,b'')
        self.assertEqual(dict(binding._current368),{})
        with self.assertRaises(ValueError):ten._current368_records(binding,self.root)
        with self.assertRaises(ValueError):six._historical_c1_data_bytes(scope,intake.AP_PATH)


if __name__ == '__main__':
    unittest.main(verbosity=2)
