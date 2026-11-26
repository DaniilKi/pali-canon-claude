"""Owned-fixture controls for the canonical-only six-record history extension."""
import contextlib
import copy
import gzip
import hashlib
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import web_reader_six_boundary_history as h
from web_reader_approved_acceptance import approved_catalogue, approved_runtime

class SixHistoryControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory(prefix='pali-six-history-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root=Path(cls.temp.name)
        for name in h.C1_DATA_PATHS:
            target=cls.root/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,target)
        h.copy_six_historical_fixture(ROOT,cls.root)
        h.assert_six_current_canonical_data(cls.root)
        cls.approved=approved_catalogue(ROOT)
        cls.inventory=approved_runtime(ROOT)
        manifest=json.loads((ROOT/'server/data/canon.json.gz.parts.json').read_bytes())
        cls.future=gzip.decompress(b''.join((ROOT/'server/data'/p['file']).read_bytes() for p in manifest['parts']))
        cls.c1=h.exact_c1_canon_bytes(cls.future,ROOT)

    @contextlib.contextmanager
    def change(self,name,missing=False):
        path=self.root/name;raw=path.read_bytes()
        try:
            if missing:path.unlink()
            else:path.write_bytes(bytes([raw[0]^1])+raw[1:])
            yield
        finally:path.write_bytes(raw)

    def test_01_exact_positive_and_explicit_historical_logical_frame(self):
        h.assert_six_current_canonical_data(self.root)
        self.assertEqual(h.digest(self.c1),h.C1_CANON_SHA)
        self.assertEqual(h.c1_logical_input(self.c1,self.root),self.c1)
        self.assertEqual(h.c1_logical_input(self.future,self.root),self.c1)
        with self.assertRaises((AssertionError,ValueError)):h.exact_c1_canon_bytes(self.c1,self.root)
        h.assert_preserved_c1_catalogue(self.root,self.approved)
        for name in h.C1_DATA_PATHS:
            raw=h.historical_c1_data_bytes(self.root,name)
            self.assertEqual({'bytes':len(raw),'sha256':h.digest(raw)},h.parent343_records(self.root)[name.removeprefix('server/')])

    def test_02_cached_positive_does_not_hide_any_current_data_mutation(self):
        data = ['server/'+name for name in h.proof_records(self.root) if name.startswith('data/')]
        self.assertEqual(len(data),27)
        for name in data:
            h.assert_six_current_canonical_data(self.root)
            with self.change(name),self.assertRaises((AssertionError,ValueError)):
                h.assert_six_current_canonical_data(self.root)
            h.assert_six_current_canonical_data(self.root)

    def test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering(self):
        names=[h.PROOF_DIRECTORY+'/'+h.ORACLE_NAME,
               h.PROOF_DIRECTORY+'/runtime/'+h.INVENTORY_NAME,
               h.PROOF_DIRECTORY+'/runtime/'+h.REVIEW_NAME,
               'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_INVENTORY.json',
               'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json']
        for name in names:
            for missing in (False,True):
                h.assert_six_current_canonical_data(self.root)
                with self.change(name,missing),self.assertRaises((AssertionError,ValueError)):
                    h.assert_six_current_canonical_data(self.root)
        name=h.PROOF_DIRECTORY+'/C1_IMMUTABLE_EXPECTATIONS.json'
        with self.change(name),self.assertRaises((AssertionError,ValueError)):
            h.assert_preserved_c1_catalogue(self.root,self.approved)

    def test_04_original_C1_bytes_cannot_replace_actual_future_data(self):
        name='server/data/canon.json.gz.part-0002';path=self.root/name;raw=path.read_bytes()
        try:
            path.write_bytes(h.historical_c1_data_bytes(self.root,name))
            with self.assertRaises((AssertionError,ValueError)):
                h.assert_six_current_canonical_data(self.root)
        finally:path.write_bytes(raw)
        h.assert_six_current_canonical_data(self.root)

    def test_05_C1_fixture_tampering_and_symlink_refuse_after_positive(self):
        for name in h.C1_DATA_PATHS:
            h.historical_c1_data_bytes(self.root,name)
            fixture='tests/fixtures/canon-before-six/'+Path(name).name
            with self.change(fixture),self.assertRaises((AssertionError,ValueError)):
                h.historical_c1_data_bytes(self.root,name)
        name='server/data/parallels.json.gz';path=self.root/'tests/fixtures/canon-before-six/parallels.json.gz';raw=path.read_bytes();target=self.root/'outside-copy';target.write_bytes(raw);path.unlink();path.symlink_to(target)
        try:
            with self.assertRaisesRegex(ValueError,'symlink'):h.historical_c1_data_bytes(self.root,name)
        finally:path.unlink();path.write_bytes(raw)

        # Authentically pinned source/data symlinks must refuse before hashing.
        for name in [h.PROOF_DIRECTORY+'/'+h.ORACLE_NAME,'server/data/source-notes.json']:
            path=self.root/name;raw=path.read_bytes();target=self.root/('authentic-'+Path(name).name);target.write_bytes(raw);path.unlink();path.symlink_to(target)
            try:
                with self.assertRaisesRegex(ValueError,'symlink'):h.assert_six_current_canonical_data(self.root)
            finally:path.unlink();path.write_bytes(raw)
        with tempfile.TemporaryDirectory(prefix='pali-six-linked-root-') as temp:
            linked=Path(temp)/'linked';linked.symlink_to(self.root,target_is_directory=True)
            with self.assertRaisesRegex(ValueError,'symlink'):h.assert_six_current_canonical_data(linked)
        # A destination parent link cannot create any output outside owned root.
        with tempfile.TemporaryDirectory(prefix='pali-six-copy-') as temp:
            owned=Path(temp)/'owned';outside=Path(temp)/'outside';owned.mkdir();outside.mkdir()
            (owned/'server').symlink_to(outside,target_is_directory=True)
            with self.assertRaisesRegex(ValueError,'symlink'):h.copy_six_historical_fixture(ROOT,owned)
            self.assertEqual(list(outside.iterdir()),[])

    def test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them(self):
        current=json.loads(self.future);prior=json.loads(self.c1)
        self.assertEqual(h.six_state(current,self.root),'new');self.assertEqual(h.six_state(prior,self.root),'old')
        bad=copy.deepcopy(current);other=next(u for u in bad['units'] if u['id'] not in h.IDS);other['title']+=' UNREVIEWED'
        inverse=h.canon_before_six(bad,self.root)
        self.assertEqual(next(u for u in inverse['units'] if u['id']==other['id']),other)
        with self.assertRaises((AssertionError,ValueError)):h.exact_c1_canon_bytes(h.compact(bad),self.root)
        for mutate in (lambda c:c['units'].append(copy.deepcopy(next(u for u in c['units'] if u['id']==h.IDS[0]))),
                       lambda c:c.__setitem__('units',[u for u in c['units'] if u['id']!=h.IDS[0]]),
                       lambda c:next(u for u in c['units'] if u['id']==h.IDS[0]).__setitem__('start',True),
                       lambda c:next(u for u in c['units'] if u['id']==h.IDS[0]).__setitem__('index_revision','foreign')):
            changed=copy.deepcopy(current);mutate(changed)
            with self.assertRaises((AssertionError,ValueError)):h.canon_before_six(changed,self.root)

    def test_07_runtime_parent_and_full343_objects_are_mandatory(self):
        parent=h.parent343_records(self.root)
        self.assertEqual(h.six_runtime_records(self.root,parent),self.inventory)
        changed=copy.deepcopy(parent);changed['data/apadana.json']['sha256']='0'*64
        with self.assertRaises((AssertionError,ValueError)):h.six_runtime_records(self.root,changed)
        for id in (self.approved['ids'][0],self.approved['ids'][-1]):
            changed=copy.deepcopy(self.approved);changed['profiles'][id]['id']='tha-ap999'
            with self.assertRaises((AssertionError,ValueError)):h.assert_preserved_c1_catalogue(self.root,changed)
            changed=copy.deepcopy(self.approved);changed['links'][id]['license']='CC0'
            with self.assertRaises((AssertionError,ValueError)):h.assert_preserved_c1_catalogue(self.root,changed)

if __name__=='__main__':unittest.main()
