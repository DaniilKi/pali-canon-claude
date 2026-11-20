"""Negative integrity cases for the finite, independently approved test oracles."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    assert_catalogue, assert_profiles, assert_runtime, assert_runtime_records)


class ApprovedAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.approved = approved_catalogue(ROOT)
        cls.manifest = json.loads((ROOT / 'server/data/apadana.json').read_text())
        cls.inventory = approved_runtime(ROOT)

    def rejects_catalogue(self, change):
        observed = copy.deepcopy(self.manifest)
        change(observed)
        with self.assertRaises(AssertionError):
            assert_catalogue(observed, self.approved)

    def test_current_full_objects_and_profiles(self):
        assert_catalogue(self.manifest, self.approved)
        assert_profiles(ROOT, self.approved)
        self.assertEqual(len(self.approved['links']), 285)
        self.assertNotIn('tha-ap262', self.approved['links'])

    def test_missing_old_identity(self):
        self.rejects_catalogue(lambda m: m['links'].pop('tha-ap13'))

    def test_missing_later_identity(self):
        self.rejects_catalogue(lambda m: m['links'].pop('tha-ap236'))

    def test_same_count_id_substitution_and_held_activation(self):
        self.rejects_catalogue(lambda m: m['links'].__setitem__('tha-ap262',m['links'].pop('tha-ap236')))

    def test_original_cohort_object_changed(self):
        self.rejects_catalogue(lambda m: m['links']['tha-ap183'].__setitem__('title','Substituted'))

    def test_later_object_changed(self):
        self.rejects_catalogue(lambda m: m['links']['tha-ap236'].__setitem__('body_sha256','0'*64))

    def test_rights_policy_changed(self):
        self.rejects_catalogue(lambda m: m['source'].__setitem__('policy','At least 246 entries'))

    def test_curation_seal_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);dest=root/'docs/evidence/apadana';dest.mkdir(parents=True)
            data=json.loads((ROOT/'docs/evidence/apadana/THERA_HELD234_APPROVAL.json').read_text())
            data['approved_ids']=['tha-ap262']
            (dest/'THERA_HELD234_APPROVAL.json').write_text(json.dumps(data))
            with self.assertRaises(AssertionError): approved_catalogue(root)

    def test_current_runtime_exact_paths_and_bytes(self):
        actual=assert_runtime(ROOT,ROOT/'server')
        self.assertEqual(set(actual),set(self.inventory))

    def test_missing_sidecar(self):
        actual=copy.deepcopy(self.inventory);del actual['data/source-notes.json']
        with self.assertRaises(AssertionError): assert_runtime_records(actual,self.inventory)

    def test_same_count_path_substitution(self):
        actual=copy.deepcopy(self.inventory);actual['data/substituted.json']=actual.pop('data/source-notes.json')
        with self.assertRaises(AssertionError): assert_runtime_records(actual,self.inventory)

    def test_same_length_bytes_changed(self):
        actual=copy.deepcopy(self.inventory);actual['data/source-notes.json']['sha256']='0'*64
        with self.assertRaises(AssertionError): assert_runtime_records(actual,self.inventory)

    def test_unapproved_extra_file(self):
        actual=copy.deepcopy(self.inventory);actual['unapproved.txt']={'bytes':0,'sha256':'0'*64}
        with self.assertRaises(AssertionError): assert_runtime_records(actual,self.inventory)

    def test_inventory_seal_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);dest=root/'tests/fixtures';dest.mkdir(parents=True)
            data=json.loads((ROOT/'tests/fixtures/reviewed-runtime-2449.json').read_text())
            data['files']['data/source-notes.json']['sha256']='0'*64
            (dest/'reviewed-runtime-2449.json').write_text(json.dumps(data))
            with self.assertRaises(AssertionError): approved_runtime(root)


if __name__ == '__main__': unittest.main()
