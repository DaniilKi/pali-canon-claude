"""Synthetic privacy controls for the current scaled reader diagnostic only.

Parses the current source without importing it. Only an exact reviewed helper
and a closed probe try AST are compiled, with a stubbed subprocess child.
No application, Node, Git or browser process is ever launched by these controls.
"""
import ast
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'scripts/web-reader-apadana-thera-scaled-check.py'
EXPECTED_HELPER_SHA = 'dea0f56c38a7be9a99abeb4176b0cd63317504bbf6d4d0115477e99f384180d7'
EXPECTED_PROBE_CALL_AST_SHA = '85d12f777f8fab61c36e4267ea4442d73694f6e1e65df2496ac9ac85ca2b56f7'
EXPECTED_PROBE_ASSERT_AST_SHA = '25ff7546444aeab7a27d5ad482f599fd3ad1bc5fbab9c33d61ed7bf9eaed2609'
EXPECTED_PROBE_JS_SOURCE_SHA = 'ec350b48b3f5d9ffade7780f407b2c62ddd701c5e32805780e6ee3b79cece535'
PRIVATE = 'PRIVATE_SCALED81_DIAGNOSTIC_ā😀'
SCRIPT = 'import hidden from "PRIVATE_MODULE"; console.log("'+PRIVATE+'");'

# Only the reviewed diagnostic handler may accompany the two original pinned
# statements. This closes the extracted execution surface before any compile.
_HANDLER_SOURCE = r"""try:
    pass
except Exception as profile_probe_error:
    try:
        diagnostic = _baseline_profile_probe_diagnostic(profile_run, (time.monotonic() - profile_probe_started) * 1000, profile_probe_error)
        encoded = json.dumps(diagnostic, ensure_ascii=True, separators=(',', ':'))
        if len(encoded.encode('utf-8')) <= 2048:
            sys.stderr.write('BASELINE_PROFILE_PROBE_DIAGNOSTIC:' + encoded + '\n')
            sys.stderr.flush()
    except Exception:
        pass
    raise
"""


def _ast_sha(node):
    return hashlib.sha256(ast.dump(node,include_attributes=False).encode('utf-8')).hexdigest()


def _assigned(body,name):
    found=[n for n in body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in n.targets)]
    assert len(found)==1, 'One exact original probe assignment required'
    return found[0]


def extraction():
    new = SOURCE.read_text(encoding='utf-8')
    tree = ast.parse(new)
    helpers=[x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name=='_baseline_profile_probe_diagnostic']
    mains=[x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name=='main']
    assert len(helpers)==len(mains)==1, 'One reviewed diagnostic helper and main required'
    helper=helpers[0]
    assert not helper.decorator_list, 'Diagnostic helper decorators are not executable inputs'
    helper_text = ''.join(new.splitlines(True)[helper.lineno-1:helper.end_lineno])
    assert hashlib.sha256(helper_text.encode('utf-8')).hexdigest() == EXPECTED_HELPER_SHA
    main=mains[0]
    matches=[x for x in main.body if isinstance(x,ast.Try) and x.body and isinstance(x.body[0],ast.Assign) and any(isinstance(t,ast.Name) and t.id=='profile_run' for t in x.body[0].targets)]
    assert len(matches)==1, 'One closed profile probe try required'
    wrapped=matches[0]
    assert len(wrapped.body)==2, 'Only the original child call and assertion may execute'
    assert _ast_sha(wrapped.body[0])==EXPECTED_PROBE_CALL_AST_SHA
    assert _ast_sha(wrapped.body[1])==EXPECTED_PROBE_ASSERT_AST_SHA
    probe=_assigned(main.body,'profile_probe')
    assert hashlib.sha256(ast.get_source_segment(new,probe).encode('utf-8')).hexdigest()==EXPECTED_PROBE_JS_SOURCE_SHA
    guard=ast.parse(_HANDLER_SOURCE).body[0]
    assert [ast.dump(n,include_attributes=False)for n in wrapped.handlers]==[ast.dump(n,include_attributes=False)for n in guard.handlers]
    assert not wrapped.orelse and not wrapped.finalbody
    namespace = {'subprocess':subprocess,'hashlib':hashlib,'re':re}
    exec(compile(ast.Module(body=[helper],type_ignores=[]),'<exact-diagnostic-helper>','exec'),namespace)
    return None, new, namespace['_baseline_profile_probe_diagnostic'], wrapped


class DiagnosticControls(unittest.TestCase):
    def check_private(self,row):
        encoded=json.dumps(row,ensure_ascii=False)
        for secret in (PRIVATE,SCRIPT,'PRIVATE_MODULE','tha-ap62'):
            self.assertNotIn(secret,encoded)
        self.assertNotIn('uid',row)
        self.assertEqual(set(row),{'schema','phase','failure_kind','returncode','signal_number','elapsed_ms','stdout_utf8_bytes','stdout_sha256','stderr_utf8_bytes','stderr_sha256','python_exception_class','node_error_class_hint','node_error_code_hint','node_error_hint_ambiguous','node_hint_scan_truncated'})
        self.assertLessEqual(len(json.dumps(row,ensure_ascii=True,separators=(',',':')).encode()),2048)
        self.assertEqual(row['phase'],'baseline-profile-probe')
        return encoded

    def test_nonzero_utf8_hashes_without_any_capture_content(self):
        _,_,helper,_=extraction()
        stdout=PRIVATE+'\n'+SCRIPT
        stderr='AssertionError [ERR_ASSERTION]: tha-ap62\n'+PRIVATE+'\n'+SCRIPT
        row=helper(subprocess.CompletedProcess(['NEVER_LAUNCHED'],1,stdout,stderr),123.4567,AssertionError(PRIVATE))
        self.check_private(row)
        self.assertEqual(row['returncode'],1)
        self.assertIsNone(row['signal_number'])
        self.assertEqual(row['failure_kind'],'node-nonzero-returncode')
        self.assertEqual(row['node_error_class_hint'],'AssertionError')
        self.assertEqual(row['node_error_code_hint'],'ERR_ASSERTION')
        for key,text in [('stdout',stdout),('stderr',stderr)]:
            self.assertEqual(row[key+'_utf8_bytes'],len(text.encode('utf-8')))
            self.assertEqual(row[key+'_sha256'],hashlib.sha256(text.encode('utf-8')).hexdigest())

    def test_receipt_json_shape_and_assertion_failures(self):
        _,_,helper,_=extraction()
        cases=[(json.JSONDecodeError(PRIVATE,PRIVATE,0),'probe-receipt-json'),(KeyError(PRIVATE),'probe-receipt-shape'),(TypeError(PRIVATE),'probe-receipt-shape'),(AssertionError(PRIVATE),'probe-receipt-assertion')]
        for error,kind in cases:
            row=helper(subprocess.CompletedProcess([],0,PRIVATE,''),1,error)
            self.check_private(row)
            self.assertEqual(row['failure_kind'],kind)
            self.assertEqual(row['stderr_utf8_bytes'],0)
            self.assertEqual(row['stderr_sha256'],hashlib.sha256(b'').hexdigest())

    def test_negative_returncode_is_signal_convention_not_cause(self):
        _,_,helper,_=extraction()
        row=helper(subprocess.CompletedProcess([],-9,'',''),1,AssertionError(PRIVATE))
        self.check_private(row)
        self.assertEqual(row['returncode'],-9)
        self.assertEqual(row['signal_number'],9)
        self.assertIsNone(row['node_error_class_hint'])
        self.assertIsNone(row['node_error_code_hint'])

    def test_no_completed_result_retains_unknown_streams(self):
        _,_,helper,_=extraction()
        row=helper(None,2,FileNotFoundError(PRIVATE))
        self.check_private(row)
        self.assertEqual(row['failure_kind'],'probe-no-completed-result')
        self.assertEqual(row['python_exception_class'],'FileNotFoundError')
        for key in ('returncode','signal_number','stdout_utf8_bytes','stdout_sha256','stderr_utf8_bytes','stderr_sha256'):
            self.assertIsNone(row[key])

    def test_unknown_or_ambiguous_node_hints_never_echo_messages(self):
        _,_,helper,_=extraction()
        class PrivateException(Exception):
            def __str__(self): raise AssertionError('message must not be read')
        for stderr in [PRIVATE+'\n'+SCRIPT,'PrivateThingError [PRIVATE_CODE]: '+PRIVATE,'TypeError: '+PRIVATE+'\nSyntaxError: '+PRIVATE+"\n  code: 'ENOENT',\n  code: 'EACCES',"]:
            row=helper(subprocess.CompletedProcess([],1,SCRIPT,stderr),3,PrivateException())
            self.check_private(row)
            self.assertEqual(row['python_exception_class'],'other')
            self.assertIsNone(row['node_error_class_hint'])
            self.assertIsNone(row['node_error_code_hint'])
        row=helper(subprocess.CompletedProcess([],1,SCRIPT,'Error [ERR_MODULE_NOT_FOUND]: '+PRIVATE),3,AssertionError(PRIVATE))
        self.check_private(row)
        self.assertEqual(row['node_error_class_hint'],'Error')
        self.assertEqual(row['node_error_code_hint'],'ERR_MODULE_NOT_FOUND')

    def test_large_private_capture_scans_bounded_window_and_output(self):
        _,_,helper,_=extraction()
        stderr=PRIVATE*40000
        row=helper(subprocess.CompletedProcess([],1,SCRIPT,stderr),4,AssertionError(PRIVATE))
        self.check_private(row)
        self.assertTrue(row['node_hint_scan_truncated'])
        self.assertEqual(row['stderr_sha256'],hashlib.sha256(stderr.encode()).hexdigest())

    def test_unsupported_streams_and_foreign_results_do_not_stringify(self):
        _,_,helper,_=extraction()
        class Poison:
            def __str__(self): raise AssertionError('string conversion forbidden')
            def __repr__(self): raise AssertionError('representation forbidden')
        for value in [subprocess.CompletedProcess([],1,Poison(),Poison()),Poison()]:
            row=helper(value,float('nan'),ValueError(PRIVATE))
            self.check_private(row)
            self.assertIsNone(row['stdout_sha256'])
            self.assertIsNone(row['stderr_sha256'])
            self.assertIsNone(row['elapsed_ms'])

    def test_exact_original_probe_call_assertion_and_other_code(self):
        _,new,_,wrapped=extraction()
        newmain=next(x for x in ast.parse(new).body if isinstance(x,ast.FunctionDef) and x.name=='main')
        def assigned(body,name):
            return next(x for x in body if isinstance(x,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in x.targets))
        self.assertEqual(_ast_sha(wrapped.body[0]),EXPECTED_PROBE_CALL_AST_SHA)
        self.assertEqual(_ast_sha(wrapped.body[1]),EXPECTED_PROBE_ASSERT_AST_SHA)
        self.assertEqual(hashlib.sha256(ast.get_source_segment(new,assigned(newmain.body,'profile_probe')).encode('utf-8')).hexdigest(),EXPECTED_PROBE_JS_SOURCE_SHA)
        self.assertIsInstance(wrapped.handlers[0].body[-1],ast.Raise)
        self.assertIsNone(wrapped.handlers[0].body[-1].exc)
        self.assertNotIn('timeout', [k.arg for k in wrapped.body[0].value.keywords])

    def invoke_wrapped(self,runner,helper_override=None,stderr_override=None):
        _,_,helper,wrapped=extraction()
        sink=io.StringIO() if stderr_override is None else stderr_override
        ns={'subprocess':SimpleNamespace(run=runner,CompletedProcess=subprocess.CompletedProcess),'ROOT':'SYNTHETIC_NOT_A_PATH','profile_probe':SCRIPT,'compact':lambda x:'{}','git_bytes':lambda _:b'','json':json,'time':SimpleNamespace(monotonic=lambda:1.0),'sys':SimpleNamespace(stderr=sink),'_baseline_profile_probe_diagnostic':helper if helper_override is None else helper_override}
        statements=ast.parse('profile_probe_started=1.0\nprofile_run=None').body+[wrapped]
        function=ast.FunctionDef(name='subject',args=ast.arguments(posonlyargs=[],args=[],kwonlyargs=[],kw_defaults=[],defaults=[]),body=statements,decorator_list=[])
        module=ast.fix_missing_locations(ast.Module(body=[function],type_ignores=[]))
        exec(compile(module,'<exact-original-probe-try-with-stubbed-child>','exec'),ns)
        return ns['subject'],sink

    def test_stubbed_success_does_not_log_or_launch_any_child(self):
        calls=[]
        def run(*args,**kwargs):
            calls.append((args,kwargs))
            return subprocess.CompletedProcess([],0,'{"preserved":89}\n','')
        subject,sink=self.invoke_wrapped(run)
        subject()
        self.assertEqual(len(calls),1)
        self.assertEqual(sink.getvalue(),'')

    def test_original_exception_identity_survives_logging_and_logger_failure(self):
        error=FileNotFoundError(PRIVATE)
        def run(*args,**kwargs): raise error
        for helper_override in [None,lambda *_:(_ for _ in ()).throw(ValueError(PRIVATE))]:
            subject,sink=self.invoke_wrapped(run,helper_override)
            with self.assertRaises(FileNotFoundError) as caught: subject()
            self.assertIs(caught.exception,error)
            self.assertNotIn(PRIVATE,sink.getvalue())
        interrupt=KeyboardInterrupt(PRIVATE)
        def interrupted(*args,**kwargs): raise interrupt
        subject,sink=self.invoke_wrapped(interrupted)
        with self.assertRaises(KeyboardInterrupt) as caught: subject()
        self.assertIs(caught.exception,interrupt)
        self.assertEqual(sink.getvalue(),'')


EXPECTED_TEST_IDS = ('__main__.DiagnosticControls.test_exact_original_probe_call_assertion_and_other_code', '__main__.DiagnosticControls.test_large_private_capture_scans_bounded_window_and_output', '__main__.DiagnosticControls.test_negative_returncode_is_signal_convention_not_cause', '__main__.DiagnosticControls.test_no_completed_result_retains_unknown_streams', '__main__.DiagnosticControls.test_nonzero_utf8_hashes_without_any_capture_content', '__main__.DiagnosticControls.test_original_exception_identity_survives_logging_and_logger_failure', '__main__.DiagnosticControls.test_receipt_json_shape_and_assertion_failures', '__main__.DiagnosticControls.test_stubbed_success_does_not_log_or_launch_any_child', '__main__.DiagnosticControls.test_unknown_or_ambiguous_node_hints_never_echo_messages', '__main__.DiagnosticControls.test_unsupported_streams_and_foreign_results_do_not_stringify')


class _TrackingResult(unittest.TestResult):
    """Actual unittest lifecycle/outcome hooks; never format private tracebacks."""
    def __init__(self):
        super().__init__()
        self.started_ids=[]
        self.stopped_ids=[]
        self.success_ids=[]

    def startTest(self,test):
        super().startTest(test)
        self.started_ids.append(test.id())

    def stopTest(self,test):
        super().stopTest(test)
        self.stopped_ids.append(test.id())

    def addSuccess(self,test):
        super().addSuccess(test)
        self.success_ids.append(test.id())

    def addError(self,test,error):
        self.errors.append((test,None))

    def addFailure(self,test,error):
        self.failures.append((test,None))

    def addSkip(self,test,reason):
        self.skipped.append((test,None))

    def addExpectedFailure(self,test,error):
        self.expectedFailures.append((test,None))

    def addUnexpectedSuccess(self,test):
        self.unexpectedSuccesses.append(test)


def _run_controls():
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(DiagnosticControls)
    discovered_ids=[case.id()for case in suite]
    result=_TrackingResult()
    completed=False
    if tuple(discovered_ids)==EXPECTED_TEST_IDS and len(sys.argv)==1:
        try:
            suite.run(result)
            completed=True
        except BaseException:
            # No exception message, captured stream or source text is emitted.
            pass
    valid=(completed and result.testsRun==10 and
           tuple(result.started_ids)==EXPECTED_TEST_IDS and
           tuple(result.stopped_ids)==EXPECTED_TEST_IDS and
           tuple(result.success_ids)==EXPECTED_TEST_IDS and
           not result.errors and not result.failures and not result.skipped and
           not result.expectedFailures and not result.unexpectedSuccesses and
           result.wasSuccessful())
    report={'schema':'scaled-profile-probe-diagnostic-controls-v1',
            'status':'passed'if valid else'failed',
            'runner_completed':completed,
            'tests_run':result.testsRun,
            'discovered_ids':discovered_ids,
            'started_ids':result.started_ids,
            'stopped_ids':result.stopped_ids,
            'success_ids':result.success_ids,
            'errors':len(result.errors),'failures':len(result.failures),
            'skipped':len(result.skipped),
            'expected_failures':len(result.expectedFailures),
            'unexpected_successes':len(result.unexpectedSuccesses)}
    sys.stdout.write(json.dumps(report,ensure_ascii=True,separators=(',',':'))+'\n')
    return 0 if valid else 1


if __name__=='__main__':
    raise SystemExit(_run_controls())
