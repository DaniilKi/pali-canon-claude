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
        cls.manifest = json.loads((ROOT / 'server/data/apadana.json').read_text(encoding='utf-8'))
        cls.inventory = approved_runtime(ROOT)

    def rejects_catalogue(self, change):
        observed = copy.deepcopy(self.manifest)
        change(observed)
        with self.assertRaises(AssertionError):
            assert_catalogue(observed, self.approved)

    def test_current_full_objects_and_profiles(self):
        assert_catalogue(self.manifest, self.approved)
        assert_profiles(ROOT, self.approved)
        self.assertEqual(len(self.approved['links']), 325)
        for uid in ('tha-ap262', 'tha-ap268', 'tha-ap282'):
            self.assertNotIn(uid, self.approved['links'])

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

    def test_missing_new_source_identity(self):
        self.rejects_catalogue(lambda m: m['links'].pop('tha-ap263'))

    def test_new_source_pin_changed(self):
        self.rejects_catalogue(lambda m: m['links']['tha-ap265'].__setitem__('raw_sha256','0'*64))

    def test_rights_policy_changed(self):
        self.rejects_catalogue(lambda m: m['source'].__setitem__('policy','At least 246 entries'))

    def test_curation_seal_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);dest=root/'docs/evidence/apadana';dest.mkdir(parents=True)
            data=json.loads((ROOT/'docs/evidence/apadana/THERA_HELD234_APPROVAL.json').read_text(encoding='utf-8'))
            data['approved_ids']=['tha-ap262']
            (dest/'THERA_HELD234_APPROVAL.json').write_text(json.dumps(data),encoding='utf-8')
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
            data=json.loads((ROOT/'tests/fixtures/reviewed-runtime-2449.json').read_text(encoding='utf-8'))
            data['files']['data/source-notes.json']['sha256']='0'*64
            (dest/'reviewed-runtime-2449.json').write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): approved_runtime(root)


    def test_current_runtime_review_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            for name in ('tests/fixtures/reviewed-runtime-2449.json',
                    'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json'):
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes((ROOT/name).read_bytes())
            name='docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json'
            target=root/name;target.parent.mkdir(parents=True,exist_ok=True)
            data=json.loads((ROOT/name).read_text(encoding='utf-8'))
            data['files']['index.cjs']['sha256']='0'*64
            target.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): approved_runtime(root)


    def test_missing_latest_five_identity(self):
        self.rejects_catalogue(lambda m: m['links'].pop('tha-ap283'))

    def test_latest_five_pin_changed(self):
        self.rejects_catalogue(lambda m: m['links']['tha-ap285'].__setitem__('raw_sha256','0'*64))

    def test_latest_curation_seal_tampering_after_positive(self):
        import shutil
        from web_reader_apadana_intake import read_281_285
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);dest=root/'docs/evidence/apadana'
            shutil.copytree(ROOT/'docs/evidence/apadana',dest)
            self.assertEqual(len(read_281_285(root)['expected_profile_ids']),308)
            path=dest/'THERA_281_285_APPROVAL.json'
            data=json.loads(path.read_text(encoding='utf-8'));data['approved_ids'][0]='tha-ap282'
            path.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): read_281_285(root)

    def test_latest_runtime_inventory_seal_tampering(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            names=('tests/fixtures/reviewed-runtime-2449.json',
                'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json',
                'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/canonical325/CANONICAL_RUNTIME_INVENTORY.json',
                'docs/evidence/apadana/canonical325/CANONICAL_BUILD_REVIEW.json')
            for name in names:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/name).read_bytes())
            self.assertEqual(len(approved_runtime(root)),34)
            target=root/'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json';data=json.loads(target.read_text(encoding='utf-8'))
            data['files']['index.cjs']['sha256']='0'*64;target.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): approved_runtime(root)



    def test_missing_two_source_identity(self):
        self.rejects_catalogue(lambda m: m['links'].pop('tha-ap289'))

    def test_two_source_notes_pin_changed(self):
        self.rejects_catalogue(lambda m: m['links']['tha-ap290'].__setitem__('notes_sha256','0'*64))

    def test_two_curation_seal_tampering_after_positive(self):
        import shutil
        from web_reader_apadana_intake import read_287_288
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);dest=root/'docs/evidence/apadana'
            shutil.copytree(ROOT/'docs/evidence/apadana',dest)
            self.assertEqual(len(read_287_288(root)['expected_profile_ids']),310)
            path=dest/'THERA_287_288_APPROVAL.json'
            data=json.loads(path.read_text(encoding='utf-8'));data['approved_ids'][0]='tha-ap282'
            path.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): read_287_288(root)

    def test_two_runtime_inventory_seal_tampering_after_positive(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            names=('tests/fixtures/reviewed-runtime-2449.json',
                'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json',
                'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/canonical325/CANONICAL_RUNTIME_INVENTORY.json',
                'docs/evidence/apadana/canonical325/CANONICAL_BUILD_REVIEW.json')
            for name in names:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/name).read_bytes())
            self.assertEqual(len(approved_runtime(root)),34)
            target=root/'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json';data=json.loads(target.read_text(encoding='utf-8'))
            data['files']['index.cjs']['sha256']='0'*64;target.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): approved_runtime(root)


    def test_missing_seven_source_identity(self):
        self.rejects_catalogue(lambda m: m['links'].pop('tha-ap294'))

    def test_seven_source_notes_pin_changed(self):
        self.rejects_catalogue(lambda m: m['links']['tha-ap296'].__setitem__('notes_sha256','0'*64))

    def test_seven_curation_seal_tampering_after_positive(self):
        import shutil
        from web_reader_apadana_intake import read_292_299
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);dest=root/'docs/evidence/apadana'
            shutil.copytree(ROOT/'docs/evidence/apadana',dest)
            self.assertEqual(len(read_292_299(root)['expected_profile_ids']),317)
            path=dest/'THERA_292_299_APPROVAL.json'
            data=json.loads(path.read_text(encoding='utf-8'));data['approved_ids'][0]='tha-ap299'
            path.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): read_292_299(root)

    def test_seven_runtime_inventory_seal_tampering_after_positive(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            names=('tests/fixtures/reviewed-runtime-2449.json',
                'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json',
                'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/canonical325/CANONICAL_RUNTIME_INVENTORY.json',
                'docs/evidence/apadana/canonical325/CANONICAL_BUILD_REVIEW.json')
            for name in names:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/name).read_bytes())
            self.assertEqual(len(approved_runtime(root)),34)
            target=root/'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json'
            data=json.loads(target.read_text(encoding='utf-8'));data['files']['index.cjs']['sha256']='0'*64
            target.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): approved_runtime(root)


    def test_missing_eight_source_identity(self):
        self.rejects_catalogue(lambda m: m['links'].pop('tha-ap303'))

    def test_eight_summary_note_pin_changed(self):
        self.rejects_catalogue(lambda m: m['links']['tha-ap312']['chapter_summary'].__setitem__('notes_sha256','0'*64))

    def test_eight_curation_seal_tampering_after_positive(self):
        import shutil
        from web_reader_apadana_intake import read_301_310
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary);dest=root/'docs/evidence/apadana'
            shutil.copytree(ROOT/'docs/evidence/apadana',dest)
            self.assertEqual(len(read_301_310(root)['expected_profile_ids']),325)
            path=dest/'THERA_301_310_APPROVAL.json'
            data=json.loads(path.read_text(encoding='utf-8'));data['approved_ids'][0]='tha-ap308'
            path.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): read_301_310(root)

    def test_eight_runtime_inventory_seal_tampering_after_positive(self):
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary)
            names=('tests/fixtures/reviewed-runtime-2449.json',
                'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json',
                'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json',
                'docs/evidence/apadana/canonical325/CANONICAL_RUNTIME_INVENTORY.json',
                'docs/evidence/apadana/canonical325/CANONICAL_BUILD_REVIEW.json')
            for name in names:
                target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/name).read_bytes())
            self.assertEqual(len(approved_runtime(root)),34)
            target=root/'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json'
            data=json.loads(target.read_text(encoding='utf-8'));data['files']['index.cjs']['sha256']='0'*64
            target.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): approved_runtime(root)

if __name__ == '__main__': unittest.main()
