"""Three bounded controls for actual359 versus explicit historical343 QA inputs."""
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
import web_reader_intake359 as intake
from web_reader_four_boundary_history import copy_historical_fixture
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    approved_next_ten_catalogue, approved_next_ten_runtime)

D = 'docs/evidence/apadana/english335-350/'
IDS = ['tha-ap337','tha-ap338','tha-ap339','tha-ap340','tha-ap341','tha-ap342','tha-ap343','tha-ap344','tha-ap345','tha-ap346','tha-ap347','tha-ap348','tha-ap349','tha-ap350','tha-ap351','tha-ap352']
PINS = {'RUNTIME_INVENTORY.json':'839e675a31a1eae8329f4942b1b60f453ce860d1c89d85c78300762fcb00b186',
        'BASELINE_RUNTIME34.json':'6becdfab6b8e948a6d2df9af1a37131c4c0c727d77db79cf4bb4b93973512f23',
        'BASELINE343_FULL_OBJECTS.json':'74c8c358e0bebec17f8679289f533975ee2e95270d3c7017aeb19594464d7a5e'}
sha = lambda raw: hashlib.sha256(raw).hexdigest()


def sealed(name):
    raw = (ROOT / (D + name)).read_bytes()
    assert sha(raw) == PINS[name]
    return json.loads(raw)


class Intake359Controls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # A genuine current positive precedes every owned fixture and negative.
        cls.approved = approved_catalogue(ROOT)
        assert len(cls.approved['ids']) == len(cls.approved['profiles']) == len(cls.approved['links']) == 359
        assert cls.approved['ids'][-16:] == IDS
        cls.current = sealed('RUNTIME_INVENTORY.json')['files']
        cls.prior_runtime = sealed('BASELINE_RUNTIME34.json')['files']
        cls.old = sealed('BASELINE343_FULL_OBJECTS.json')
        assert approved_runtime(ROOT) == cls.current
        for uid in cls.old['profiles']:
            assert cls.approved['profiles'][uid] == cls.old['profiles'][uid]
            assert cls.approved['links'][uid] == cls.old['links'][uid]
        cls.temp = tempfile.TemporaryDirectory(prefix='pali359-history-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        shutil.copytree(ROOT / 'docs/evidence/apadana', cls.root / 'docs/evidence/apadana')
        copy_historical_fixture(ROOT, cls.root)
        for name in ('tests/fixtures/reviewed-runtime-2449.json',
                     'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json'):
            target = cls.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
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

    def test_01_current359_and_actual34_do_not_replace_explicit_historical343(self):
        historical = approved_next_ten_catalogue(self.root)
        self.assertEqual(historical, {'ids':list(self.old['profiles']), 'profiles':self.old['profiles'],
                                     'links':self.old['links'], 'source':self.old['manifest_source']})
        self.assertEqual(approved_next_ten_runtime(self.root), self.prior_runtime)
        self.assertEqual(approved_runtime(self.root), self.current)
        self.assertNotEqual(self.prior_runtime, self.current)
        self.assertEqual(len(json.loads((self.root / intake.AP_FIXTURE).read_bytes())['links']),343)
        self.assertEqual(len(json.loads((self.root / intake.AP_PATH).read_bytes())['links']),359)
        # Returned metadata is a fresh ordinary object, not an alias into a seal.
        with six._c1_operation_scope(self.root) as scope:
            first = ten._current359_catalogue(scope._next_ten_binding, scope._root, historical)
            first['profiles']['tha-ap13']['title'] = 'SYNTHETIC_CALLER_MUTATION'
            second = ten._current359_catalogue(scope._next_ten_binding, scope._root, historical)
            self.assertEqual(second, self.approved)
            runtime = ten._current359_records(scope._next_ten_binding, scope._root)
            runtime['data/apadana.json']['sha256'] = '0' * 64
            self.assertEqual(ten._current359_records(scope._next_ten_binding, scope._root),self.current)

    def test_02_warm_new_proof_data_and_historical_fixture_controls_never_become_current_positive(self):
        for name in ('APPROVAL.json','PROFILES.json','RUNTIME_REVIEW.json'):
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
                ten._current359_records(binding,self.root)
                six._historical_c1_data_bytes(scope,intake.AP_PATH)
                self.assertEqual({p:reads[p] for p in expected},{p:1 for p in expected})
                self.assertGreater(reads[D+'RUNTIME_REVIEW.json'],count)
                with self.changed(D+'APPROVAL.json',missing=True):
                    with self.assertRaises((AssertionError,ValueError,FileNotFoundError)):
                        ten._current359_records(binding,self.root)
                with self.assertRaises(ValueError):
                    ten._binding_records(binding,self.root/'foreign-root')
                for gate in (approved_catalogue,approved_runtime,ten.assert_next_ten_current_canonical_data):
                    with self.assertRaises(ValueError):gate(scope)
                with self.assertRaises(AttributeError):binding._current359 = {}
                with self.assertRaises(TypeError):binding._current359['data/apadana.json'] = {}
                object.__setattr__(scope,'_next_ten_binding',None)
                try:
                    with self.assertRaises(ValueError):six._historical_c1_data_bytes(scope,intake.AP_PATH)
                finally:
                    object.__setattr__(scope,'_next_ten_binding',binding)
                with ThreadPoolExecutor(max_workers=1) as executor:
                    result=executor.submit(ten._current359_records,binding,self.root)
                    with self.assertRaises(ValueError):result.result(timeout=5)
                self.assertEqual(ten._current359_records(binding,self.root),self.current)
        self.assertEqual(binding._catalogue359,b'')
        self.assertEqual(dict(binding._current359),{})
        with self.assertRaises(ValueError):ten._current359_records(binding,self.root)
        with self.assertRaises(ValueError):six._historical_c1_data_bytes(scope,intake.AP_PATH)


if __name__ == '__main__':
    unittest.main(verbosity=2)
