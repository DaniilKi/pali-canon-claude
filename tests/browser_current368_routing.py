"""Current368 source routing only; no application imports or runtime capture."""
from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import web_reader_apadana_intake as intake
import web_reader_intake368 as current
import web_reader_next_ten_boundary_history as ten
from owned_intake368_proofs import copy_owned_intake368_source_proof_inputs

PAIRS = (('tha-ap353',351),('tha-ap354',352),('tha-ap355',353),
         ('tha-ap356',354),('tha-ap357',355),('tha-ap358',356),
         ('tha-ap359',357),('tha-ap361',359),('tha-ap362',360))


class Current368SourceRouting(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.previous = intake.read_335_350(ROOT)
        cls.proof = current._authority(ROOT)
        cls.current = intake.reviewed_intake(ROOT)
        assert cls.current['expected_profile_ids'] == cls.proof['APPROVAL.json']['expected_profile_ids']
        assert len(cls.current['expected_profile_ids']) == 368

    def test_01_exact_public_ids_families_holds_and_detached_returns_are_source_only(self):
        self.assertNotIn('web_reader_approved_acceptance', sys.modules)
        with mock.patch.object(ten, '_capture_six_test_input', side_effect=AssertionError('No runtime capture for source routing')):
            actual = intake.reviewed_intake(ROOT)
            self.assertEqual(actual, self.current)
            self.assertEqual(intake.current_apadana_ids(ROOT), self.proof['BASELINE359.json']['ids'] + [uid for uid, _ in PAIRS])
            self.assertEqual(actual['baseline_records'], self.previous['baseline_records'] + self.previous['approved_records'])
            self.assertEqual(actual['approved_records'], [{'id':uid,'publisher_chapter':'chapter-3','poem':poem} for uid,poem in PAIRS])
            self.assertEqual(actual['held_ids'], self.previous['held_ids'] + ['tha-ap360'])
            self.assertNotIn('tha-ap360', actual['expected_profile_ids'])
            self.assertFalse(set(actual['held_ids']) & set(actual['expected_profile_ids']))
            records = actual['baseline_records'] + actual['approved_records']
            for chapter, count in (('chapter-4',40),('chapter-3',328)):
                expected = [row['id'] for row in sorted(records,key=lambda row:row['poem']) if row['publisher_chapter']==chapter]
                self.assertEqual(intake.current_family_ids(ROOT,chapter), expected)
                self.assertEqual(len(expected), count)
            self.assertEqual(actual['current_source_approval'], {'file':current.DIRECTORY+'/APPROVAL.json','sha256':current.PINS['APPROVAL.json']})
            self.assertEqual(actual['historical359_source_approval'], self.previous['current_source_approval'])
            self.assertEqual(actual['historical343_source_approval'], self.previous['historical343_source_approval'])
            actual['expected_profile_ids'].reverse()
            actual['baseline_records'][0]['poem'] = 999
            actual['held_ids'].append('owned-synthetic-hold')
            self.assertEqual(intake.reviewed_intake(ROOT), self.current)
        self.assertNotIn('web_reader_approved_acceptance', sys.modules)

    def test_02_five_current_suffixes_preserve_full359_objects_and_append_exact_nine(self):
        full = self.proof['BASELINE359_FULL_OBJECTS.json']
        for anchor, count in (('THERA_241_250_APPROVAL.json',112),('THERA_221_230_APPROVAL.json',102),
                              ('THERA_REMAINING_APPROVAL.json',84),('THERA_HELD234_APPROVAL.json',83),
                              ('THERA_321_329_APPROVAL.json',29)):
            with self.subTest(anchor=anchor):
                old = intake.historical359_curated_additions(ROOT,anchor)
                actual = intake.curated_additions(ROOT,anchor)
                self.assertEqual(actual['anchor'], old['anchor'])
                self.assertEqual(actual['curation'], self.current)
                self.assertEqual(actual['ids'], old['ids'] + [uid for uid,_ in PAIRS])
                self.assertEqual(len(actual['ids']), count)
                self.assertEqual(actual['anchor']['expected_profile_ids'] + actual['ids'], self.current['expected_profile_ids'])
                for field in ('profiles','links'):
                    self.assertEqual(list(actual[field]), actual['ids'])
                    for uid in old['ids']:
                        self.assertEqual(old[field][uid], full[field][uid])
                        self.assertEqual(actual[field][uid], full[field][uid])
                    self.assertEqual({uid:actual[field][uid] for uid,_ in PAIRS}, self.proof['PROFILES.json' if field=='profiles' else 'LINKS.json'])

    def test_03_missing_reordered_substituted_mistyped_and_held_selections_refuse(self):
        self.assertEqual(intake._compose_reviewed_current368(self.previous,self.proof), self.current)
        old_changes = (lambda p:p['baseline_records'].pop(0), lambda p:p['baseline_records'].reverse(),
                       lambda p:p['approved_records'].reverse(), lambda p:p['baseline_records'][0].__setitem__('poem',True))
        for change in old_changes:
            previous = deepcopy(self.previous); change(previous)
            with self.assertRaises(AssertionError):intake._compose_reviewed_current368(previous,self.proof)
        new_changes = (lambda a:a['approved_records'].pop(0), lambda a:a['approved_records'].reverse(),
                       lambda a:a['approved_records'][0].__setitem__('id','tha-ap360'),
                       lambda a:a['approved_records'][0].__setitem__('poem',True),
                       lambda a:a['approved_ids'].reverse(), lambda a:a['expected_profile_ids'].reverse(),
                       lambda a:a.__setitem__('source_holds_within_publisher351_360',[]))
        for change in new_changes:
            proof = deepcopy(self.proof); change(proof['APPROVAL.json'])
            with self.assertRaises(AssertionError):intake._compose_reviewed_current368(self.previous,proof)
        self.assertEqual(intake._compose_reviewed_current368(self.previous,self.proof), self.current)

    def test_04_every_new_source_proof_is_mandatory_after_genuine_owned_positive(self):
        with tempfile.TemporaryDirectory(prefix='pali368-source-owned-') as temporary:
            root = Path(temporary)
            copied = copy_owned_intake368_source_proof_inputs(ROOT,root)
            self.assertFalse((root/'server').exists())
            self.assertEqual(intake.reviewed_intake(root), self.current)
            names = [current.DIRECTORY+'/'+name for name in current.PINS]
            names.append('docs/evidence/apadana/english335-350/APPROVAL.json')
            for relative in names:
                self.assertIn(relative,copied)
                path = root/relative; raw = path.read_bytes()
                for missing in (False,True):
                    self.assertEqual(intake.reviewed_intake(root), self.current)
                    try:
                        if missing:path.unlink()
                        else:
                            value=json.loads(raw); value['owned_synthetic_control']=True
                            path.write_bytes(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode())
                        with self.assertRaises((AssertionError,ValueError,FileNotFoundError)):
                            intake.reviewed_intake(root)
                    finally:path.write_bytes(raw)
            self.assertEqual(intake.reviewed_intake(root), self.current)


if __name__=='__main__':unittest.main(verbosity=2)
