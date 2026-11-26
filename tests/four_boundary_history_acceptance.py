"""Owned-fixture controls for the additive four-boundary historical adapter."""
import contextlib
import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import web_reader_four_boundary_history as h

class HistoryControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='pali-four-history-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root=Path(cls.temp.name)
        names=[*h.CHANGED_DATA,'server/data/canon.json.gz.part-0001',h.PROOF_DIRECTORY+'/'+h.INVENTORY_NAME,h.PROOF_DIRECTORY+'/'+h.REVIEW_NAME]
        for name in names:
            target=cls.root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
        h.copy_historical_fixture(ROOT,cls.root)
        h.assert_current_canonical_data(cls.root)

    @contextlib.contextmanager
    def change(self,name):
        path=self.root/name;raw=path.read_bytes()
        try:
            path.write_bytes(bytes([raw[0]^1])+raw[1:]);yield
        finally:path.write_bytes(raw)

    def test_01_all26_historical_byte_pins_and_current_positive(self):
        h.assert_current_canonical_data(self.root)
        for name,row in h.OLD_DATA.items():
            raw=h.historical_data_bytes(ROOT,name)
            self.assertEqual({'bytes':len(raw),'sha256':h.digest(raw)},row)

    def test_02_positive_content_cache_does_not_hide_any_actual_data_mutation(self):
        for name in [*h.CHANGED_DATA,'server/data/canon.json.gz.part-0001']:
            h.assert_current_canonical_data(self.root)
            with self.change(name),self.assertRaises((AssertionError,ValueError)):
                h.assert_current_canonical_data(self.root)
            h.assert_current_canonical_data(self.root)

    def test_03_every_required_proof_refuses_tampering_after_positive(self):
        for name in [h.PROOF_DIRECTORY+'/'+h.INVENTORY_NAME,h.PROOF_DIRECTORY+'/'+h.REVIEW_NAME]:
            h.assert_current_canonical_data(self.root)
            with self.change(name),self.assertRaises((AssertionError,ValueError)):
                h.assert_current_canonical_data(self.root)

    def test_04_old_fixture_mutations_and_symlinks_are_not_hidden_by_cache(self):
        for name in h.CHANGED_DATA:
            self.assertEqual(h.digest(h.historical_data_bytes(self.root,name)),h.OLD_DATA[name]['sha256'])
            fixture='tests/fixtures/canon-before333/'+Path(name).name
            with self.change(fixture),self.assertRaises((AssertionError,ValueError)):
                h.historical_data_bytes(self.root,name)
        path=self.root/'tests/fixtures/canon-before333/parallels.json.gz';raw=path.read_bytes();target=self.root/'external-copy';target.write_bytes(raw);path.unlink();path.symlink_to(target)
        try:
            with self.assertRaisesRegex(ValueError,'symlink'):h.historical_data_bytes(self.root,'server/data/parallels.json.gz')
        finally:path.unlink();path.write_bytes(raw)

    def test_05_old_current_data_cannot_fall_back_to_approved_history(self):
        name='server/data/canon.json.gz.part-0002';path=self.root/name;raw=path.read_bytes();old=(self.root/'tests/fixtures/canon-before333'/Path(name).name).read_bytes()
        try:
            path.write_bytes(old)
            with self.assertRaises((AssertionError,ValueError)):h.historical_data_bytes(self.root,name)
        finally:path.write_bytes(raw)
        with self.assertRaisesRegex(ValueError,'outside'):h.historical_data_bytes(self.root,'server/data/unknown.json')

    def test_06_missing_new_seal_never_falls_back(self):
        for name in [h.PROOF_DIRECTORY+'/'+h.INVENTORY_NAME,h.PROOF_DIRECTORY+'/'+h.REVIEW_NAME]:
            path=self.root/name;raw=path.read_bytes();path.unlink()
            try:
                with self.assertRaisesRegex(ValueError,'Missing mandatory'):h.assert_current_canonical_data(self.root)
            finally:path.write_bytes(raw)

if __name__=='__main__':unittest.main()
