"""Independent historical byte authority for the portable 325 build correction."""
import hashlib
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from web_reader_approved_acceptance import reviewed_canonical325_runtime as approved_runtime, reviewed_325_runtime
from web_reader_canonical325_fixture import materialize_canonical325, assert_historical_runtime as assert_runtime
_HISTORICAL_CANONICAL325 = materialize_canonical325(ROOT)
ROOT = Path(_HISTORICAL_CANONICAL325.name)


class CanonicalBuildAcceptance(unittest.TestCase):
    def fixture(self, root):
        names = ('tests/fixtures/reviewed-runtime-2449.json',
            'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json',
            'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json',
            'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json',
            'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json',
            'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json',
            'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json',
            'docs/evidence/apadana/canonical325/CANONICAL_RUNTIME_INVENTORY.json',
            'docs/evidence/apadana/canonical325/CANONICAL_BUILD_REVIEW.json')
        for name in names:
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((ROOT / name).read_bytes())
        return root / 'docs/evidence/apadana/canonical325'

    def test_current_complete_runtime_retains_all_other_paths(self):
        assert_runtime(ROOT, ROOT / 'server')
        old, new = reviewed_325_runtime(ROOT), approved_runtime(ROOT)
        self.assertEqual(sorted(k for k in old if old[k] != new[k]),
                         ['http-worker.cjs', 'http.cjs', 'index.cjs'])
        self.assertEqual(new['data/source-notes.json'], old['data/source-notes.json'])

    def test_inverse_restores_entire_independently_approved_original_bundles(self):
        old = reviewed_325_runtime(ROOT)
        for name, count in [('http-worker.cjs', 222), ('http.cjs', 230), ('index.cjs', 222)]:
            original, changed = [], 0
            for line in (ROOT / 'server' / name).read_text(encoding='utf-8').splitlines(keepends=True):
                if line.startswith('// node_modules/') or re.match(r'^  "node_modules/[^"]+"\([^)]*\) \{', line):
                    line = line.replace('node_modules/', '../pali-thera292-299-local/node_modules/', 1)
                    changed += 1
                original.append(line)
            self.assertEqual(changed, count)
            restored = ''.join(original).encode('utf-8')
            self.assertEqual(len(restored), old[name]['bytes'])
            self.assertEqual(hashlib.sha256(restored).hexdigest(), old[name]['sha256'])
            self.assertNotEqual(hashlib.sha256(restored + b'\n// unapproved extra bytes').hexdigest(), old[name]['sha256'])

    def test_missing_new_inventory_cannot_restore_old_acceptance(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = self.fixture(root)
            self.assertEqual(len(approved_runtime(root)), 34)
            (directory / 'CANONICAL_RUNTIME_INVENTORY.json').unlink()
            with self.assertRaises(FileNotFoundError):
                approved_runtime(root)

    def test_new_inventory_and_review_tampering_fail_after_positive(self):
        for filename in ['CANONICAL_RUNTIME_INVENTORY.json', 'CANONICAL_BUILD_REVIEW.json']:
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                path = self.fixture(root) / filename
                self.assertEqual(len(approved_runtime(root)), 34)
                data = json.loads(path.read_text(encoding='utf-8'))
                if filename.startswith('CANONICAL_RUNTIME'):
                    data['files']['index.cjs']['sha256'] = '0' * 64
                else:
                    data['unchanged_paths'] = 32
                path.write_text(json.dumps(data), encoding='utf-8')
                with self.assertRaises(AssertionError):
                    approved_runtime(root)


if __name__ == '__main__':
    unittest.main()
