"""Owned-fixture adversarial controls; no server/app launch or real private data."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import gzip
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
from web_reader_four_boundary_history import copy_historical_fixture
from web_reader_approved_acceptance import approved_catalogue, approved_runtime

DIRECTORY = 'docs/evidence/apadana/boundaries-next-ten/'
CURRENT_INVENTORY = DIRECTORY + 'runtime/INDEPENDENT_NEXT_TEN_RUNTIME_INVENTORY.json'
CURRENT_REVIEW = DIRECTORY + 'runtime/INDEPENDENT_NEXT_TEN_RUNTIME_REVIEW.json'
DD_INVENTORY = 'docs/evidence/apadana/boundaries340-347/runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json'
PINS = {CURRENT_INVENTORY:'ea2b5cfb7c7a6c9216e2f33a5d1950c128b1ef50cb6c32cf929cf555b942408f',
        CURRENT_REVIEW:'b3197bdcc429700dee09446abd01ff08c6009d4fcaedc3f2f542429c4f497f55',
        DIRECTORY+'FUTURE_ORACLE.json':'78fd34efd9942bb363010123f4019cfa31df3b609fbd3736d2db7288c2036655',
        DD_INVENTORY:'ba913149e9d704e1b145d1a6a195f95ad20e0d2dbc73fa6da22f16f43f492c08'}
CORE = ('server/data/canon.json.gz.part-0001', 'server/data/canon.json.gz.part-0002',
        'server/data/canon.json.gz.parts.json', 'server/data/parallels.json.gz')
CHANGED_DATA = CORE[1:]
sha = lambda raw: hashlib.sha256(raw).hexdigest()


def sealed(relative):
    raw = (ROOT / relative).read_bytes()
    assert sha(raw) == PINS[relative], 'Independent expected fixture changed: ' + relative
    return json.loads(raw)


class NextTenHistoryControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # FIRST actual-data operation is a genuine positive on the current root.
        # A refusal/PENDING pin aborts; it can never count as a negative success.
        first = ten.assert_next_ten_current_canonical_data(ROOT)
        cls.current = sealed(CURRENT_INVENTORY)['files']
        cls.previous = sealed(DD_INVENTORY)['files']
        assert first == cls.current and len(first) == 34
        assert approved_runtime(ROOT) == cls.current
        assert len(approved_catalogue(ROOT)['ids']) == 343
        cls.temp = tempfile.TemporaryDirectory(prefix='pali-next-ten-history-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        # Keep the existing historical catalogue authority closure, including the
        # two separately owned older proofs; the narrow copy helper is additive.
        shutil.copytree(ROOT / 'docs/evidence/apadana', cls.root / 'docs/evidence/apadana')
        copy_historical_fixture(ROOT, cls.root)
        for name in ('tests/fixtures/reviewed-runtime-2449.json',
                     'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json'):
            target = cls.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        assert ten.assert_next_ten_current_canonical_data(cls.root) == cls.current

    @contextmanager
    def changed(self, relative, *, replacement=None, missing=False):
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

    def test_01_actual_runtime_is_new34_and_explicit_historical_six_stays_dd34(self):
        current = approved_runtime(self.root)
        historical = six.six_runtime_records(self.root, six.parent343_records(self.root))
        self.assertEqual(current, self.current)
        self.assertEqual(historical, self.previous)
        self.assertNotEqual(current, historical)
        self.assertEqual(len(approved_catalogue(self.root)['ids']), 343)
        # Fixture provisioning must leave actual NEW data present and keep each
        # frozen DD input separate; no historical bytes may replace the corpus.
        for name in CORE:
            actual = (self.root / name).read_bytes()
            old = self.root / 'tests/fixtures/canon-before-next-ten' / Path(name).name
            self.assertEqual({'bytes':len(actual),'sha256':sha(actual)}, self.current[name[7:]])
            self.assertEqual({'bytes':old.stat().st_size,'sha256':sha(old.read_bytes())}, self.previous[name[7:]])
            self.assertTrue((self.root / 'tests/fixtures/canon-before-six' / Path(name).name).is_file())
        for name in (DIRECTORY+'FUTURE_ORACLE.json', CURRENT_INVENTORY, CURRENT_REVIEW):
            self.assertEqual(sha((self.root / name).read_bytes()), PINS[name])
        manifest = json.loads((self.root / CORE[2]).read_bytes())
        packed = b''.join((self.root / 'server/data' / part['file']).read_bytes() for part in manifest['parts'])
        self.assertEqual(sha(gzip.decompress(packed)), 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de')

    def test_02_each_public_catalogue_and_runtime_call_captures_new27_once(self):
        expected = {'server/'+name for name in self.current if name.startswith('data/')}
        self.assertEqual(len(expected), 27)
        original = ten.regular
        for gate in (approved_catalogue, approved_runtime):
            for _warm in range(2):
                reads = Counter()
                def observed(root, relative):
                    reads[relative] += 1
                    return original(root, relative)
                with mock.patch.object(ten, 'regular', side_effect=observed), mock.patch.object(six, '_capture_actual_data', wraps=six._capture_actual_data) as capture:
                    gate(self.root)
                self.assertEqual(capture.call_count, 1)
                self.assertEqual({p:n for p,n in reads.items() if p.startswith('server/data/')}, {p:1 for p in expected})
        reads = Counter()
        def observed(root, relative):
            reads[relative] += 1
            return original(root, relative)
        with mock.patch.object(ten, 'regular', side_effect=observed):
            with six._c1_operation_scope(self.root) as scope:
                captured = sum(reads[p] for p in expected)
                proof_reads = reads[CURRENT_REVIEW]
                for _ in range(3):
                    six._historical_c1_data_bytes(scope, CORE[1])
                self.assertEqual(sum(reads[p] for p in expected), captured)
                self.assertEqual(captured, 27)
                self.assertGreater(reads[CURRENT_REVIEW], proof_reads, 'Private reuse still rereads current physical proofs')

    def test_03_warm_current_and_prior_proof_loss_never_falls_back(self):
        names = (DIRECTORY+'FUTURE_ORACLE.json', CURRENT_INVENTORY, CURRENT_REVIEW,
                 'docs/evidence/apadana/boundaries340-347/FUTURE_ORACLE.json',
                 'docs/evidence/apadana/boundaries340-347/C1_IMMUTABLE_EXPECTATIONS.json',
                 'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json')
        for name in names:
            for missing in (False, True):
                with self.subTest(name=name, missing=missing):
                    self.assertEqual(len(approved_catalogue(self.root)['ids']), 343)
                    with self.changed(name, missing=missing):
                        with self.assertRaises((AssertionError, ValueError, FileNotFoundError)):
                            approved_catalogue(self.root)
                    self.assertEqual(approved_runtime(self.root), self.current)
        with six._c1_operation_scope(self.root) as scope:
            six._historical_c1_data_bytes(scope, CORE[1])
            with self.changed(CURRENT_REVIEW, missing=True), self.assertRaises((AssertionError, ValueError, FileNotFoundError)):
                six._historical_c1_data_bytes(scope, CORE[1])

    def test_04_warm_corpus_dd_substitutions_and_old_fixture_tampering_refuse(self):
        for name in (CORE[1], 'server/data/source-notes.json'):
            ten.assert_next_ten_current_canonical_data(self.root)
            with self.changed(name), self.assertRaises((AssertionError, ValueError)):
                approved_runtime(self.root)
            self.assertEqual(ten.assert_next_ten_current_canonical_data(self.root), self.current)
        for name in CHANGED_DATA:
            dd = (self.root / 'tests/fixtures/canon-before-next-ten' / Path(name).name).read_bytes()
            self.assertNotEqual(sha(dd), self.current[name[7:]]['sha256'])
            ten.assert_next_ten_current_canonical_data(self.root)
            with self.changed(name, replacement=dd), self.assertRaises((AssertionError, ValueError)):
                ten.assert_next_ten_current_canonical_data(self.root)
            self.assertEqual(approved_runtime(self.root), self.current)
        for name in CORE:
            fixture = 'tests/fixtures/canon-before-next-ten/' + Path(name).name
            ten.assert_next_ten_current_canonical_data(self.root)
            with self.changed(fixture), self.assertRaises((AssertionError, ValueError)):
                ten.assert_next_ten_current_canonical_data(self.root)

    def test_05_binding_loss_closed_foreign_thread_and_exception_escape_refuse(self):
        with six._c1_operation_scope(self.root) as scope:
            binding = scope._next_ten_binding
            six._historical_c1_data_bytes(scope, CORE[1])
            with self.assertRaises(AttributeError):
                scope._next_ten_binding = None
            with self.assertRaises(TypeError):
                binding._records['data/source-notes.json'] = {}
            for gate in (ten.assert_next_ten_current_canonical_data, six.assert_six_current_canonical_data,
                         approved_catalogue, approved_runtime):
                with self.assertRaises(ValueError):
                    gate(scope)
            # Fault injection tests binding-loss detection independently of the
            # ordinary assignment guard, restoring it before owner cleanup.
            object.__setattr__(scope, '_next_ten_binding', None)
            try:
                with self.assertRaises(ValueError):
                    six._historical_c1_data_bytes(scope, CORE[1])
            finally:
                object.__setattr__(scope, '_next_ten_binding', binding)
            with ThreadPoolExecutor(max_workers=1) as executor:
                foreign = executor.submit(six._historical_c1_data_bytes, scope, CORE[1])
                with self.assertRaises(ValueError):
                    foreign.result(timeout=5)
            six._historical_c1_data_bytes(scope, CORE[1])
        self.assertIsNone(scope._next_ten_binding)
        self.assertEqual(dict(binding._actual), {})
        with self.assertRaises(ValueError):
            ten._binding_records(binding, self.root)
        with self.assertRaises(ValueError):
            six._historical_c1_data_bytes(scope, CORE[1])
        with self.assertRaisesRegex(RuntimeError, 'synthetic owner exception'):
            with six._c1_operation_scope(self.root) as escaped:
                raise RuntimeError('synthetic owner exception')
        with self.assertRaises(ValueError):
            six._historical_c1_data_bytes(escaped, CORE[1])
        self.assertEqual(approved_runtime(self.root), self.current)


if __name__ == '__main__':
    unittest.main(verbosity=2)
