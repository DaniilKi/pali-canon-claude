"""Negative integrity cases for the finite, independently approved test oracles."""
import copy
import hashlib
from contextlib import contextmanager
from types import MappingProxyType
from threading import Lock
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from web_reader_approved_acceptance import (approved_catalogue, approved_runtime,
    assert_catalogue, assert_profiles, assert_runtime, assert_runtime_records)


def provision_complete_current_runtime_fixture(destination):
    """Complete owned current-data fixture before a targeted old-authority tamper.

    The reviewed history helper copies all ACTUAL new27 data and keeps DD/six/four
    historical bytes separate. It validates physical sources before copying.
    Only the existing finite older runtime proof closure is added here.
    """
    import shutil
    from web_reader_four_boundary_history import copy_historical_fixture
    names = (
        'tests/fixtures/reviewed-runtime-2449.json',
        'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json',
        'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/canonical325/CANONICAL_RUNTIME_INVENTORY.json',
        'docs/evidence/apadana/canonical325/CANONICAL_BUILD_REVIEW.json',
        'docs/evidence/apadana/runtime333/INDEPENDENT333_RUNTIME_INVENTORY.json',
        'docs/evidence/apadana/runtime333/INDEPENDENT333_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/runtime339/INDEPENDENT339_RUNTIME_INVENTORY.json',
        'docs/evidence/apadana/runtime339/INDEPENDENT339_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/boundaries333-336/runtime/INDEPENDENT_FOUR_RUNTIME_INVENTORY.json',
        'docs/evidence/apadana/boundaries333-336/runtime/INDEPENDENT_FOUR_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_INVENTORY.json',
        'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/boundaries340-347/FUTURE_ORACLE.json',
        'docs/evidence/apadana/boundaries340-347/runtime/INDEPENDENT_SIX_RUNTIME_INVENTORY.json',
        'docs/evidence/apadana/boundaries340-347/runtime/INDEPENDENT_SIX_RUNTIME_REVIEW.json',
        'docs/evidence/apadana/boundaries340-347/C1_IMMUTABLE_EXPECTATIONS.json',
    )
    for name in names:
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
    copy_historical_fixture(ROOT, destination)


OWNED_TAMPER_TARGETS = {
    'test_curation_seal_tampering': 'docs/evidence/apadana/THERA_HELD234_APPROVAL.json',
    'test_inventory_seal_tampering': 'tests/fixtures/reviewed-runtime-2449.json',
    'test_current_runtime_review_tampering': 'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json',
    'test_latest_curation_seal_tampering_after_positive': 'docs/evidence/apadana/THERA_281_285_APPROVAL.json',
    'test_latest_runtime_inventory_seal_tampering': 'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json',
    'test_two_curation_seal_tampering_after_positive': 'docs/evidence/apadana/THERA_287_288_APPROVAL.json',
    'test_two_runtime_inventory_seal_tampering_after_positive': 'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json',
    'test_seven_curation_seal_tampering_after_positive': 'docs/evidence/apadana/THERA_292_299_APPROVAL.json',
    'test_seven_runtime_inventory_seal_tampering_after_positive': 'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json',
    'test_eight_curation_seal_tampering_after_positive': 'docs/evidence/apadana/THERA_301_310_APPROVAL.json',
    'test_eight_runtime_inventory_seal_tampering_after_positive': 'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json',
}


class ApprovedAcceptance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.approved = approved_catalogue(ROOT)
        cls.manifest = json.loads((ROOT / 'server/data/apadana.json').read_text(encoding='utf-8'))
        cls.inventory = approved_runtime(ROOT)

        # Provision one entirely owned complete current fixture. No hardlinks or
        # external-directory mutation; original runtime integrity checks stay live.
        import shutil
        cls._owned_temporary = tempfile.TemporaryDirectory(prefix='pali-approved33-owned-')
        cls.addClassCleanup(cls._owned_temporary.cleanup)
        cls._owned_root = Path(cls._owned_temporary.name).resolve()
        shutil.copytree(ROOT / 'docs/evidence/apadana', cls._owned_root / 'docs/evidence/apadana')
        provision_complete_current_runtime_fixture(cls._owned_root)
        assert approved_runtime(cls._owned_root) == cls.inventory
        cls._owned_originals = MappingProxyType({name: (cls._owned_root / name).read_bytes()
                                                for name in OWNED_TAMPER_TARGETS.values()})
        cls._owned_hashes = MappingProxyType({name: hashlib.sha256(value).hexdigest()
                                             for name, value in cls._owned_originals.items()})
        cls._owned_fixture_active = False
        cls._owned_fixture_lock = Lock()


    @contextmanager
    def owned_tamper_fixture(self):
        """Reuse only this class's owned fixture, restoring its declared JSON target.

        All original public positive and negative calls still reread proofs/data.
        Only repeated provisioning is removed; this is not an integrity cache.
        """
        cls = type(self)
        self.assertTrue(cls._owned_fixture_lock.acquire(blocking=False),
                        'Concurrent/nested shared fixture use refused')
        try:
            self.assertFalse(cls._owned_fixture_active, 'Concurrent/nested shared fixture use refused')
            self.assertIn(self._testMethodName, OWNED_TAMPER_TARGETS)
            relative = OWNED_TAMPER_TARGETS[self._testMethodName]
            target = cls._owned_root / relative
            pristine = cls._owned_originals[relative]
            self.assertFalse(target.is_symlink())
            self.assertTrue(target.is_file())
            self.assertEqual(target.read_bytes(), pristine, 'Exact proof restoration required before reuse')
            cls._owned_fixture_active = True
            try:
                yield cls._owned_root
            finally:
                try:
                    self.assertFalse(target.is_symlink(), 'Owned proof may not be replaced by a symlink')
                    target.write_bytes(pristine)
                    restored = target.read_bytes()
                    self.assertEqual(restored, pristine, 'Target restored byte-for-byte after tamper')
                    self.assertEqual(hashlib.sha256(restored).hexdigest(), cls._owned_hashes[relative])
                    self.assertEqual(json.loads(restored), json.loads(pristine))
                finally:
                    cls._owned_fixture_active = False
        finally:
            cls._owned_fixture_lock.release()

    def rejects_catalogue(self, change):
        observed = copy.deepcopy(self.manifest)
        change(observed)
        with self.assertRaises(AssertionError):
            assert_catalogue(observed, self.approved)

    def test_current_full_objects_and_profiles(self):
        assert_catalogue(self.manifest, self.approved)
        assert_profiles(ROOT, self.approved)
        self.assertEqual(len(self.approved['links']), 359)
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
        with self.owned_tamper_fixture() as root:
            dest=root/'docs/evidence/apadana'
            self.assertEqual(len(approved_catalogue(root)['ids']),359)
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
        with self.owned_tamper_fixture() as root:
            dest=root/'tests/fixtures'
            self.assertEqual(approved_runtime(root), self.inventory)
            data=json.loads((ROOT/'tests/fixtures/reviewed-runtime-2449.json').read_text(encoding='utf-8'))
            data['files']['data/source-notes.json']['sha256']='0'*64
            (dest/'reviewed-runtime-2449.json').write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): approved_runtime(root)


    def test_current_runtime_review_tampering(self):
        with self.owned_tamper_fixture() as root:
            self.assertEqual(approved_runtime(root), self.inventory)
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
        with self.owned_tamper_fixture() as root:
            dest=root/'docs/evidence/apadana'
            self.assertEqual(len(read_281_285(root)['expected_profile_ids']),308)
            path=dest/'THERA_281_285_APPROVAL.json'
            data=json.loads(path.read_text(encoding='utf-8'));data['approved_ids'][0]='tha-ap282'
            path.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): read_281_285(root)

    def test_latest_runtime_inventory_seal_tampering(self):
        with self.owned_tamper_fixture() as root:
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
        with self.owned_tamper_fixture() as root:
            dest=root/'docs/evidence/apadana'
            self.assertEqual(len(read_287_288(root)['expected_profile_ids']),310)
            path=dest/'THERA_287_288_APPROVAL.json'
            data=json.loads(path.read_text(encoding='utf-8'));data['approved_ids'][0]='tha-ap282'
            path.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): read_287_288(root)

    def test_two_runtime_inventory_seal_tampering_after_positive(self):
        with self.owned_tamper_fixture() as root:
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
        with self.owned_tamper_fixture() as root:
            dest=root/'docs/evidence/apadana'
            self.assertEqual(len(read_292_299(root)['expected_profile_ids']),317)
            path=dest/'THERA_292_299_APPROVAL.json'
            data=json.loads(path.read_text(encoding='utf-8'));data['approved_ids'][0]='tha-ap299'
            path.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): read_292_299(root)

    def test_seven_runtime_inventory_seal_tampering_after_positive(self):
        with self.owned_tamper_fixture() as root:
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
        with self.owned_tamper_fixture() as root:
            dest=root/'docs/evidence/apadana'
            self.assertEqual(len(read_301_310(root)['expected_profile_ids']),325)
            path=dest/'THERA_301_310_APPROVAL.json'
            data=json.loads(path.read_text(encoding='utf-8'));data['approved_ids'][0]='tha-ap308'
            path.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): read_301_310(root)

    def test_eight_runtime_inventory_seal_tampering_after_positive(self):
        with self.owned_tamper_fixture() as root:
            self.assertEqual(len(approved_runtime(root)),34)
            target=root/'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json'
            data=json.loads(target.read_text(encoding='utf-8'));data['files']['index.cjs']['sha256']='0'*64
            target.write_text(json.dumps(data),encoding='utf-8')
            with self.assertRaises(AssertionError): approved_runtime(root)

if __name__ == '__main__': unittest.main()
