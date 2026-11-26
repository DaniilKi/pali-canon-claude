"""Source-whitelist regressions only: no browser/server/network/runtime capture."""
from contextlib import contextmanager
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest import mock

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import web_reader_apadana_intake as intake
import web_reader_next_ten_boundary_history as ten
from web_reader_intake359 import _authority

PAIRS=(('tha-ap337',335),('tha-ap338',336),('tha-ap339',337),('tha-ap340',338),
       ('tha-ap341',339),('tha-ap342',340),('tha-ap343',341),('tha-ap344',342),
       ('tha-ap345',343),('tha-ap346',344),('tha-ap347',345),('tha-ap348',346),
       ('tha-ap349',347),('tha-ap350',348),('tha-ap351',349),('tha-ap352',350))
D='docs/evidence/apadana/english335-350/'


class Current359SourceRouting(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Genuine actual-source metadata positive FIRST; never accept a refusal
        # due to an incomplete fixture as evidence of a working negative.
        cls.current=intake.reviewed_intake(ROOT)
        assert len(cls.current['expected_profile_ids'])==359
        cls.previous=intake.read_331_334(ROOT)
        assert len(cls.previous['expected_profile_ids'])==343
        cls.proof=_authority(ROOT)

    def test_01_public_source_membership_and_families_are_exact_without_importcycle_or_runtime_capture(self):
        self.assertNotIn('web_reader_approved_acceptance',sys.modules)
        with mock.patch.object(ten,'_capture_six_test_input',side_effect=AssertionError('Source membership must not capture runtime data')):
            current=intake.reviewed_intake(ROOT)
            self.assertEqual(intake.current_apadana_ids(ROOT),current['expected_profile_ids'])
            records=current['baseline_records']+current['approved_records']
            self.assertEqual(current['baseline_records'],self.previous['baseline_records']+self.previous['approved_records'])
            self.assertEqual(current['approved_records'],[{'id':uid,'publisher_chapter':'chapter-3','poem':p}for uid,p in PAIRS])
            self.assertEqual([r['id']for r in records],current['expected_profile_ids'])
            self.assertEqual(current['expected_profile_ids'],self.previous['expected_profile_ids']+[uid for uid,_ in PAIRS])
            self.assertEqual(current['held_ids'],self.previous['held_ids'])
            self.assertFalse(set(current['held_ids'])&set(current['expected_profile_ids']))
            for chapter,count in [('chapter-4',40),('chapter-3',319)]:
                expected=[r['id']for r in sorted(records,key=lambda r:r['poem'])if r['publisher_chapter']==chapter]
                self.assertEqual(intake.current_family_ids(ROOT,chapter),expected)
                self.assertEqual(len(expected),count)
            self.assertEqual(current['current_source_approval'],{'file':D+'APPROVAL.json','sha256':'9232fdeec1b93618b5019b1aeb2c706b2a6b423a62bbb5dae86ea39b520e4bf6'})
            current['expected_profile_ids'].reverse();current['baseline_records'][0]['poem']=999
            self.assertEqual(intake.reviewed_intake(ROOT),self.current)
        self.assertNotIn('web_reader_approved_acceptance',sys.modules)

    def test_02_current_curated_suffixes_preserve_every_old_object_and_add_only_sixteen(self):
        for anchor,count in [('THERA_241_250_APPROVAL.json',103),('THERA_221_230_APPROVAL.json',93),
                             ('THERA_REMAINING_APPROVAL.json',75),('THERA_HELD234_APPROVAL.json',74),
                             ('THERA_321_329_APPROVAL.json',20)]:
            with self.subTest(anchor=anchor):
                old=intake._historical343_curated_additions(ROOT,anchor)
                current=intake.curated_additions(ROOT,anchor)
                self.assertEqual(current['anchor'],old['anchor'])
                self.assertEqual(current['curation'],self.current)
                self.assertEqual(current['ids'],old['ids']+[uid for uid,_ in PAIRS])
                self.assertEqual(len(current['ids']),count)
                self.assertEqual(current['anchor']['expected_profile_ids']+current['ids'],self.current['expected_profile_ids'])
                for field in ('profiles','links'):
                    self.assertEqual(list(current[field]),current['ids'])
                    for uid,row in old[field].items():self.assertEqual(current[field][uid],row)
                self.assertEqual({uid:current['profiles'][uid]for uid,_ in PAIRS},self.proof['PROFILES.json'])
                self.assertEqual({uid:current['links'][uid]for uid,_ in PAIRS},self.proof['LINKS.json'])

    def test_03_missing_substituted_reordered_or_mistyped_old_and_new_selections_fail(self):
        self.assertEqual(intake._compose_reviewed_current359(self.previous,self.proof),self.current)
        old_mutations=[lambda p:p['baseline_records'].pop(0),
            lambda p:p['baseline_records'][0].__setitem__('id','tha-ap999'),
            lambda p:p['baseline_records'].reverse(),
            lambda p:p['approved_records'].reverse(),
            lambda p:p['baseline_records'][0].__setitem__('poem',True)]
        for change in old_mutations:
            previous=deepcopy(self.previous);change(previous)
            with self.assertRaises(AssertionError):intake._compose_reviewed_current359(previous,self.proof)
        new_mutations=[lambda a:a['approved_records'].pop(0),
            lambda a:a['approved_records'][0].__setitem__('id','tha-ap353'),
            lambda a:a['approved_records'].reverse(),
            lambda a:a['approved_records'][0].__setitem__('poem',336),
            lambda a:a['expected_profile_ids'].reverse(),
            lambda a:a['approved_ids'].reverse()]
        for change in new_mutations:
            proof=deepcopy(self.proof);change(proof['APPROVAL.json'])
            with self.assertRaises(AssertionError):intake._compose_reviewed_current359(self.previous,proof)
        self.assertEqual(intake._compose_reviewed_current359(self.previous,self.proof),self.current)

    def test_04_current_and_old_source_proof_loss_or_tampering_has_no_historical_fallback(self):
        with tempfile.TemporaryDirectory(prefix='pali-current359-source-') as temporary:
            root=Path(temporary)
            shutil.copytree(ROOT/'docs/evidence/apadana',root/'docs/evidence/apadana')
            # Source-only metadata works without server binaries/data, private
            # notes, source bodies, environment-selected roots or API outputs.
            self.assertFalse((root/'server').exists())
            self.assertEqual(intake.reviewed_intake(root),self.current)
            for name in [D+'APPROVAL.json',D+'BASELINE343_FULL_OBJECTS.json',
                         'docs/evidence/apadana/THERA_331_334_APPROVAL.json']:
                path=root/name;original=path.read_bytes()
                for missing in (False,True):
                    self.assertEqual(intake.reviewed_intake(root),self.current)
                    try:
                        if missing:path.unlink()
                        else:path.write_bytes(original+b'\n')
                        with self.assertRaises((AssertionError,ValueError,FileNotFoundError)):intake.reviewed_intake(root)
                    finally:path.write_bytes(original)
                    self.assertEqual(intake.reviewed_intake(root),self.current)


if __name__=='__main__':unittest.main(verbosity=2)
