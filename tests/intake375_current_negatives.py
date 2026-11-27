"""Original375 method lineage; direct CURRENT380 SUT plus strict375 source prefix."""
from contextlib import contextmanager
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path, PurePath
import sys
import tempfile
from threading import Thread
import unittest
from unittest.mock import patch

ROOT=Path(__file__).absolute().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import web_reader_intake380 as current
from owned_intake380_proofs import (copy_current380_source_inputs,
    copy_current380_data_inputs,copy_current380_runtime_inputs)
from materialize_h_history import materialize_h_runtime_fixture
from web_reader_approved_acceptance import assert_runtime


# Closed TEST-ONLY groups. No arbitrary test-name/path or authority input.
_FULL_METHODS = ('test_01_exact_flat375_and_source_only_domains_and_one_actual27_read', 'test_02_every_actual27_warm_mutation_and_missing_file_refuse', 'test_03_same_size_mtime_does_not_reuse_a_success', 'test_04_all_closed_proofs_missing_tamper_and_authentic_symlink_refuse', 'test_05_exact_roots_and_genuine_H_tokens_reject_before_any_path_IO', 'test_06_returns_are_detached_and_failure_restoration_is_fresh', 'test_07_full_old368_plus_literal7_and_no_history_fallback', 'test_08_actual34_runtime_guards_keep_nondata_extras_and_path_identity', 'test_09_copiers_refuse_nonempty_alias_and_changed_source')
_PROOF_METHOD = 'test_04_all_closed_proofs_missing_tamper_and_authentic_symlink_refuse'
_GROUPS = {
    'behavior-a': ('test_01_exact_flat375_and_source_only_domains_and_one_actual27_read', 'test_02_every_actual27_warm_mutation_and_missing_file_refuse', 'test_03_same_size_mtime_does_not_reuse_a_success'),
    'behavior-b': ('test_05_exact_roots_and_genuine_H_tokens_reject_before_any_path_IO', 'test_06_returns_are_detached_and_failure_restoration_is_fresh', 'test_07_full_old368_plus_literal7_and_no_history_fallback', 'test_08_actual34_runtime_guards_keep_nondata_extras_and_path_identity', 'test_09_copiers_refuse_nonempty_alias_and_changed_source'),
    'proof-a': ('test_04_all_closed_proofs_missing_tamper_and_authentic_symlink_refuse',),
    'proof-b': ('test_04_all_closed_proofs_missing_tamper_and_authentic_symlink_refuse',),
    'proof-c': ('test_04_all_closed_proofs_missing_tamper_and_authentic_symlink_refuse',),
}
_PROOF_BATCHES = {'proof-a':0,'proof-b':1,'proof-c':2}

class Current375Negatives(unittest.TestCase):
    _proof_batch = None
    _proof_protocol = None
    @classmethod
    def setUpClass(cls):
        # Genuine current source + actual current-data/runtime gates BEFORE
        # any mutation or owned historical fixture. No generated expected data.
        cls.source=current.source_authority380(ROOT)
        cls.approved=current.approved380_catalogue(ROOT)
        cls.inventory=current.approved380_runtime(ROOT)
        assert_runtime(ROOT,ROOT/'server')
        cls.temp=tempfile.TemporaryDirectory(prefix='pali-current375-owned-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root=Path(cls.temp.name).resolve(strict=True)
        copy_current380_runtime_inputs(ROOT,cls.root)
        assert current.approved380_catalogue(cls.root)==cls.approved
        assert current.approved380_runtime(cls.root)==cls.inventory
        cls.proof_rows=json.loads((cls.root/current.BASELINE_DIRECTORY/'H_CURRENT_PROOF_INPUTS.json').read_bytes())['files']
        cls.legacy_names={current.BASELINE_DIRECTORY+'/'+n for n in (*current.BASELINE_PINS,*current.BASELINE_RUNTIME_PINS)}
        cls.extension_names={current.DIRECTORY+'/'+n for n in (*current.PINS,*current.RUNTIME_PINS)}
        cls.current_names=cls.legacy_names|cls.extension_names
        cls.data_names=['server/'+n for n in cls.inventory if n.startswith('data/')]
        assert len(cls.data_names)==27 and len(cls.proof_rows)==226

    @contextmanager
    def change(self,name,raw=None,missing=False,preserve_mtime=False):
        path=self.root/name;before=path.read_bytes();stamp=path.stat()
        try:
            if missing:path.unlink()
            else:path.write_bytes(raw if raw is not None else bytes([before[0]^1])+before[1:])
            if preserve_mtime and not missing:os.utime(path,ns=(stamp.st_atime_ns,stamp.st_mtime_ns))
            yield path
        finally:
            if path.is_symlink():path.unlink()
            path.write_bytes(before);os.utime(path,ns=(stamp.st_atime_ns,stamp.st_mtime_ns))

    def positive(self):
        self.assertEqual(current.approved380_catalogue(self.root),self.approved)
        self.assertEqual(current.approved380_runtime(self.root),self.inventory)

    def refused(self,function,root=None):
        with self.assertRaises((ValueError,FileNotFoundError,NotADirectoryError,AssertionError)):
            function(self.root if root is None else root)

    def test_01_exact_flat375_and_source_only_domains_and_one_actual27_read(self):
        prefix=self.source['historical375']
        self.assertEqual(len(prefix['ids']),375)
        self.assertEqual(prefix['ids'][-7:],list(current.historical375.IDS))
        self.assertEqual(prefix['selection']['baseline_ids'],prefix['ids'][:368])
        self.assertEqual(len(self.source['ids']),380)
        self.assertEqual(self.source['ids'][:375],prefix['ids'])
        self.assertEqual(self.source['ids'][-5:],list(current.IDS))
        self.assertEqual(self.source['selection']['baseline_ids'],prefix['ids'])
        self.assertEqual(len([uid for uid in prefix['ids'] if uid.startswith('tha-ap')]),335)
        self.assertEqual(self.source['selection']['held_ids'][-1],'tha-ap360')
        import web_reader_apadana_intake as public_source
        from web_reader_approved_acceptance import approved_catalogue,approved_runtime
        with patch.object(current,'_capture380_current',side_effect=AssertionError('Source-only route attempted current-data capture')):
            self.assertEqual(public_source.reviewed_intake(self.root),self.source['selection'])
            self.assertEqual(public_source.current_apadana_ids(self.root),self.source['ids'])
            for chapter,count in (('chapter-4',40),('chapter-3',340)):
                family=public_source.current_family_ids(self.root,chapter)
                expected=[record['id'] for record in sorted(self.source['selection']['baseline_records']+self.source['selection']['approved_records'],key=lambda row:row['poem']) if record['publisher_chapter']==chapter]
                self.assertEqual(family,expected);self.assertEqual(len(family),count)
        self.assertEqual(approved_catalogue(self.root),self.approved)
        self.assertEqual(approved_runtime(self.root),self.inventory)
        original=current._regular;seen=[]
        def delegated(root,name):
            seen.append(name);return original(root,name)
        for function in (current.approved380_catalogue,current.approved380_runtime):
            seen.clear()
            with patch.object(current,'_regular',side_effect=delegated):function(self.root)
            self.assertEqual(sorted(n for n in seen if n.startswith('server/')),sorted(self.data_names))
        # Registry/source path must work without any CURRENT runtime leaf or
        # server data access; historical baseline-runtime metadata is distinct.
        with self.change(current.DIRECTORY+'/RUNTIME_REVIEW.json',missing=True):
            with self.change('server/data/apadana.json',missing=True):
                seen.clear()
                with patch.object(current,'_regular',side_effect=delegated):
                    self.assertEqual(current.source_authority380(self.root),self.source)
                self.assertFalse(any(n.startswith('server/') or n==current.DIRECTORY+'/RUNTIME_REVIEW.json' for n in seen))
        self.positive()
        for anchor,size in current.ANCHORS.items():
            extra=current.curated_additions380(self.root,anchor)
            self.assertEqual(list(extra),['curation','anchor','ids','profiles','links'])
            self.assertEqual(extra['ids'],self.source['ids'][size:])
            self.assertEqual(list(extra['profiles']),extra['ids'])
            self.assertEqual(list(extra['links']),extra['ids'])
            self.assertEqual(public_source.curated_additions(self.root,anchor),extra)

    def test_02_every_actual27_warm_mutation_and_missing_file_refuse(self):
        for name in self.data_names:
            with self.subTest(path=name):
                self.positive()
                with self.change(name):self.refused(current.approved380_catalogue)
                with self.change(name,missing=True):self.refused(current.approved380_runtime)
                self.positive()

    def test_03_same_size_mtime_does_not_reuse_a_success(self):
        for name in ('server/data/apadana.json','server/data/source-notes.json','server/data/canon.json.gz.part-0002'):
            with self.subTest(path=name):
                self.positive();before=(self.root/name).stat()
                with self.change(name,preserve_mtime=True):
                    after=(self.root/name).stat()
                    self.assertEqual((before.st_size,before.st_mtime_ns),(after.st_size,after.st_mtime_ns))
                    self.refused(current.approved380_catalogue);self.refused(current.approved380_runtime)
                self.positive()

    def _closed_proof_names(self,names):
        legacy=sorted(set(self.proof_rows)|self.legacy_names)
        extension=sorted(self.extension_names)
        expected=sorted(legacy+extension)
        if (type(names) is not list or names!=expected or len(names)!=251 or
                len(self.proof_rows)!=226 or len(self.legacy_names)!=15 or
                len(self.extension_names)!=10 or set(legacy)&set(extension) or
                len(legacy)!=241 or len(extension)!=10):
            raise ValueError('Exact legacy241 plus new10 disjoint proof paths required')
        batch=type(self)._proof_batch
        if batch is not None and (type(batch) is not int or batch not in (0,1,2)):
            raise ValueError('Unknown closed proof batch')
        selected_legacy=legacy if batch is None else legacy[batch::3]
        selected_extension=extension if batch is None else extension[batch::3]
        selected=sorted(selected_legacy+selected_extension)
        if (len(selected_legacy)!=(241 if batch is None else (81,80,80)[batch]) or
                len(selected_extension)!=(10 if batch is None else (4,3,3)[batch]) or
                len(selected)!=(251 if batch is None else (85,83,83)[batch])):
            raise ValueError('Incomplete fixed proof batch')
        protocol={'batch':batch,'all_paths':list(names),'selected_paths':list(selected),
                  'completed_paths':[],'controls_per_path':['positive','missing','valid-json-tamper',
                                                           'authentic-symlink','restored-positive'],
                  'legacy':{'all_paths':legacy,'selected_paths':selected_legacy,'completed_paths':[]},
                  'extension':{'all_paths':extension,'selected_paths':selected_extension,'completed_paths':[]}}
        type(self)._proof_protocol=protocol
        def completed_iterations():
            for name in selected:
                yield name
                # Reached only after the unchanged original iteration returns.
                # Any subtest failure still makes the genuine result fail below.
                protocol['completed_paths'].append(name)
                protocol['legacy' if name in self.legacy_names or name in self.proof_rows
                         else 'extension']['completed_paths'].append(name)
        return completed_iterations()

    def test_04_all_closed_proofs_missing_tamper_and_authentic_symlink_refuse(self):
        names=self._closed_proof_names(sorted(set(self.proof_rows)|self.current_names))
        for name in names:
            source_domain=(name in self.proof_rows and self.proof_rows[name]['domain']=='H_source_prerequisite') or name in current._source_metadata_pins()
            function=current.source_authority380 if source_domain else current.approved380_runtime
            with self.subTest(proof=name):
                self.assertEqual(function(self.root),self.source if source_domain else self.inventory)
                with self.change(name,missing=True):self.refused(function)
                # JSON stays syntactically valid, rather than relying on parse failure.
                before=(self.root/name).read_bytes()
                altered=json.loads(before);altered['independent_negative_witness']=True
                with self.change(name,raw=json.dumps(altered,ensure_ascii=False).encode()):self.refused(function)
                with tempfile.TemporaryDirectory(prefix='pali-proof-symlink-target-') as d:
                    target=Path(d).resolve(strict=True)/'authentic.json';target.write_bytes(before)
                    with self.change(name) as path:
                        path.unlink();path.symlink_to(target);self.refused(function)
                self.assertEqual(function(self.root),self.source if source_domain else self.inventory)
        self.positive()

    def test_05_exact_roots_and_genuine_H_tokens_reject_before_any_path_IO(self):
        for function in (current.source_authority380,current.reviewed_intake380,
                         current.approved380_catalogue,current.approved380_runtime):
            self.assertEqual(function(str(self.root)),function(self.root))
        class PathProtocol:
            def __fspath__(self):raise AssertionError('Custom path protocol was called')
        class StringSubclass(str):pass
        class NativePathSubclass(type(Path('.'))):pass
        bad=[None,True,object(),PurePath(self.root),PathProtocol(),StringSubclass(str(self.root)),NativePathSubclass(self.root)]
        # Exact native Path and str aliases still resolve to the real positive
        # root, but parent components must refuse before any path IO.
        traversal=self.root/'docs'/'..'
        self.assertEqual(traversal.resolve(strict=True),self.root)
        self._assert_before_IO([traversal,str(traversal)])
        with tempfile.TemporaryDirectory(prefix='pali-H375-token-fixture-') as temporary:
            hroot=Path(temporary).resolve(strict=True);materialize_h_runtime_fixture(ROOT,hroot)
            # Exact H module bodies are unchanged; explicit H root never375.
            import web_reader_six_boundary_history as historical
            with historical._c1_operation_scope(hroot) as scope:
                bad.append(scope)
                self._assert_before_IO(bad)
                errors=[]
                def foreign_thread():
                    try:self._assert_before_IO([scope])
                    except BaseException as error:errors.append(error)
                thread=Thread(target=foreign_thread);thread.start();thread.join(5)
                self.assertFalse(thread.is_alive());self.assertEqual(errors,[])
            self._assert_before_IO([scope])
        with tempfile.TemporaryDirectory(prefix='pali375-root-alias-') as d:
            alias=Path(d).resolve(strict=True)/'alias';alias.symlink_to(self.root,target_is_directory=True)
            self.refused(current.source_authority380,alias)
        # Authentic same-content intermediate directory alias still refuses.
        with tempfile.TemporaryDirectory(prefix='pali375-source-parent-') as d:
            parent=self.root/'docs/evidence/apadana';target=Path(d).resolve(strict=True)/'authentic-apadana'
            parent.rename(target)
            try:
                parent.symlink_to(target,target_is_directory=True)
                self.refused(current.source_authority380)
            finally:
                if parent.is_symlink():parent.unlink()
                target.rename(parent)
        name=current.DIRECTORY+'/APPROVAL.json';path=self.root/name;raw=path.read_bytes()
        path.unlink();path.mkdir()
        try:self.refused(current.source_authority380)
        finally:path.rmdir();path.write_bytes(raw)
        self.positive()

    def _assert_before_IO(self,roots):
        count=[];original_stat=Path.stat;original_read=Path.read_bytes
        def delegated_stat(path,*args,**kwargs):count.append('stat');return original_stat(path,*args,**kwargs)
        def delegated_read(path,*args,**kwargs):count.append('read');return original_read(path,*args,**kwargs)
        with patch.object(Path,'stat',delegated_stat),patch.object(Path,'read_bytes',delegated_read):
            for root in roots:
                for function in (current.source_authority380,current.reviewed_intake380,
                                 current.approved380_catalogue,current.approved380_runtime):
                    with self.assertRaises(ValueError):function(root)
        self.assertEqual(count,[])

    def test_06_returns_are_detached_and_failure_restoration_is_fresh(self):
        first=current.source_authority380(self.root);second=current.source_authority380(self.root)
        uid=current.IDS[0]
        first['ids'].reverse();first['profiles'][uid]['title']='owned mutation'
        first['links'][uid]['license']='CC0';first['source']['policy']='owned mutation'
        first['selection']['approved_records'][0]['poem']=-1
        self.assertEqual(second,self.source)
        self.assertEqual(current.source_authority380(self.root),self.source)
        runtime=current.approved380_runtime(self.root)
        runtime[next(iter(runtime))]['sha256']='0'*64
        self.assertEqual(current.approved380_runtime(self.root),self.inventory)
        with self.change(current.DIRECTORY+'/APPROVAL.json',missing=True):
            self.refused(current.source_authority380);self.refused(current.approved380_catalogue)
        self.positive()

    def test_07_full_old368_plus_literal7_and_no_history_fallback(self):
        # Independent source metadata supplies expected objects, never parser output.
        baseline=json.loads((self.root/current.BASELINE_DIRECTORY/'BASELINE368_FULL_OBJECTS.json').read_bytes())
        for uid in baseline['ids']:
            self.assertEqual(self.approved['profiles'][uid],baseline['profiles'][uid])
            self.assertEqual(self.approved['links'][uid],baseline['links'][uid])
        prefix=self.source['historical375']
        self.assertEqual(list(prefix['profiles']),prefix['ids'])
        self.assertEqual(prefix['ids'],baseline['ids']+list(current.historical375.IDS))
        for uid in prefix['ids']:
            self.assertEqual(self.approved['profiles'][uid],prefix['profiles'][uid])
            self.assertEqual(self.approved['links'][uid],prefix['links'][uid])
        original=json.loads((self.root/'server/data/apadana.json').read_bytes())
        for uid in (*current.historical375.IDS,*current.IDS):
            for field in ('body_sha256','notes_sha256','title','license','root_sha256'):
                changed=deepcopy(original);value=changed['links'][uid][field]
                changed['links'][uid][field]=('0' if value[0]!='0' else '1')+value[1:]
                with self.change('server/data/apadana.json',raw=json.dumps(changed,ensure_ascii=False).encode()):
                    self.refused(current.approved380_catalogue)
        for bad_uid in ('tha-ap360','tha-ap999999'):
            changed=deepcopy(original);uid=current.IDS[-1]
            changed['links'][bad_uid]=changed['links'].pop(uid)
            self.assertEqual(len(changed['links']),380)
            with self.change('server/data/apadana.json',raw=json.dumps(changed,ensure_ascii=False).encode()):
                self.refused(current.approved380_catalogue)
        old=deepcopy(original);old['source']=baseline['manifest_source'];old['held']=baseline['manifest_held'];old['links']=baseline['links']
        with self.change('server/data/apadana.json',raw=json.dumps(old,ensure_ascii=False).encode()):
            self.refused(current.approved380_catalogue);self.refused(current.approved380_runtime)
        old375=deepcopy(prefix['manifest'])
        self.assertEqual(len(old375['links']),375)
        with self.change('server/data/apadana.json',raw=json.dumps(old375,ensure_ascii=False).encode()):
            self.refused(current.approved380_catalogue);self.refused(current.approved380_runtime)
        with self.change(current.DIRECTORY+'/RUNTIME_REVIEW.json',missing=True):
            self.refused(current.approved380_runtime)
        self.positive()

    def test_08_actual34_runtime_guards_keep_nondata_extras_and_path_identity(self):
        self.assertEqual(len(assert_runtime(self.root,self.root/'server')),34)
        for name in self.inventory:
            with self.subTest(runtime=name),self.change('server/'+name):
                with self.assertRaises((AssertionError,ValueError)):assert_runtime(self.root,self.root/'server')
        extra=self.root/'server/unapproved-extra.json'
        try:
            extra.write_text('{}')
            with self.assertRaises(AssertionError):assert_runtime(self.root,self.root/'server')
        finally:extra.unlink()
        name=next(n for n in self.inventory if not n.startswith('data/'))
        path=self.root/'server'/name;substitute=path.with_name(path.name+'.unknown');path.rename(substitute)
        try:
            with self.assertRaises(AssertionError):assert_runtime(self.root,self.root/'server')
        finally:substitute.rename(path)
        self.assertEqual(len(assert_runtime(self.root,self.root/'server')),34)

    def test_09_copiers_refuse_nonempty_alias_and_changed_source(self):
        for function in (copy_current380_source_inputs,copy_current380_data_inputs,copy_current380_runtime_inputs):
            with tempfile.TemporaryDirectory(prefix='pali375-nonempty-') as d:
                destination=Path(d).resolve(strict=True);(destination/'sentinel').write_text('owned')
                with self.assertRaises(ValueError):function(self.root,destination)
                self.assertEqual((destination/'sentinel').read_text(),'owned')
            with tempfile.TemporaryDirectory(prefix='pali375-dest-alias-') as d:
                parent=Path(d).resolve(strict=True);outside=parent/'outside';outside.mkdir();alias=parent/'alias'
                alias.symlink_to(outside,target_is_directory=True)
                with self.assertRaises(ValueError):function(self.root,alias)
                self.assertEqual(list(outside.iterdir()),[])
            # This existing physical destination is inside the source, while
            # its sibling/../ spelling evades a merely lexical containment test.
            with tempfile.TemporaryDirectory(prefix='pali375-traversal-child-',dir=str(self.root)) as owned:
                child=Path(owned).resolve(strict=True)
                with tempfile.TemporaryDirectory(prefix='pali375-traversal-sibling-',dir=str(self.root.parent)) as sibling:
                    traversal=Path(sibling).resolve(strict=True)/'..'/self.root.name/child.name
                    self.assertEqual(traversal.resolve(strict=True),child)
                    self.assertFalse(traversal.is_relative_to(self.root))
                    reads=[];original_read=Path.read_bytes
                    def delegated_read(path,*args,**kwargs):
                        reads.append(path);return original_read(path,*args,**kwargs)
                    with patch.object(Path,'read_bytes',delegated_read):
                        with self.assertRaisesRegex(ValueError,'Parent traversal'):
                            function(self.root,traversal)
                    self.assertEqual(reads,[])
                    self.assertEqual(list(child.iterdir()),[])
        with tempfile.TemporaryDirectory(prefix='pali375-copy-mutant-') as d:
            with self.change(current.DIRECTORY+'/PROFILES.json'):
                with self.assertRaises(ValueError):copy_current380_source_inputs(self.root,Path(d).resolve(strict=True))
            self.assertEqual(list(Path(d).iterdir()),[])
        with tempfile.TemporaryDirectory(prefix='pali375-parent-alias-') as d:
            parent=Path(d).resolve(strict=True);destination=parent/'destination';destination.mkdir()
            outside=parent/'outside';outside.mkdir()
            import owned_intake380_proofs as copier
            original=copier._exclusive;injected=[]
            def alias_then_delegate(root,name,raw):
                if not injected:
                    (root/name.split('/')[0]).symlink_to(outside,target_is_directory=True)
                    injected.append(name)
                return original(root,name,raw)
            with patch.object(copier,'_exclusive',side_effect=alias_then_delegate):
                with self.assertRaises(ValueError):copy_current380_source_inputs(self.root,destination)
            self.assertEqual(len(injected),1);self.assertEqual(list(outside.iterdir()),[])
        self.positive()


def _run_closed_group():
    import argparse
    parser=argparse.ArgumentParser(description='Fixed CURRENT380 negative groups; original375 method lineage',allow_abbrev=False)
    parser.add_argument('--group',required=True,choices=tuple(_GROUPS))
    group=parser.parse_args().group
    loader=unittest.TestLoader()
    complete=loader.getTestCaseNames(Current375Negatives)
    if loader.errors or tuple(complete)!=_FULL_METHODS:
        raise ValueError('Complete genuine original9 inventory changed; no omission')
    selected=_GROUPS[group]
    if (len(set(selected))!=len(selected) or any(name not in complete for name in selected) or
            (_PROOF_METHOD in selected)!=(group in _PROOF_BATCHES)):
        raise ValueError('Unknown fixed method selection')
    Current375Negatives._proof_batch=_PROOF_BATCHES.get(group)
    Current375Negatives._proof_protocol=None
    cases=[Current375Negatives(name) for name in selected]
    if (any(type(case) is not Current375Negatives for case in cases) or
            tuple(case._testMethodName for case in cases)!=selected):
        raise ValueError('Foreign or substituted unittest selection')
    # The stdlib runner emits actual method identities and terminal outcomes to
    # stderr. Node independently checks those lines against the literal group.
    result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(cases))
    success=(result.wasSuccessful() and result.testsRun==len(selected) and
             not result.failures and not result.errors and not result.skipped and
             not result.expectedFailures and not result.unexpectedSuccesses)
    receipt={'schema':'current380-closed-negative-group-v1','group':group,
             'full_methods':list(complete),'selected_methods':list(selected),
             'tests_run':result.testsRun,'failures':len(result.failures),'errors':len(result.errors),
             'skipped':len(result.skipped),'expected_failures':len(result.expectedFailures),
             'unexpected_successes':len(result.unexpectedSuccesses),'successful':success,
             'proof':Current375Negatives._proof_protocol}
    sys.stdout.write(json.dumps(receipt,ensure_ascii=False,separators=(',',':'))+'\n')
    raise SystemExit(0 if success else 1)


if __name__=='__main__':
    if any(arg=='--group' or arg.startswith('--group=') for arg in sys.argv[1:]):
        _run_closed_group()
    else:
        unittest.main()  # Original direct invocation and ordinary unittest CLI.
