#!/usr/bin/env node
// Standalone mandatory conformance gate, deliberately outside *.test.mjs.
// Synthetic fixtures exercise the SAME engine; they approve no original source.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {runPythonPartitions, runPythonPartitionConformance} from '../tests/helpers/partitioned-python.mjs';

const FIXTURE_NAME='ci-python-partition-conformance.py';
const FIXTURE_SHA='497a0a682c563c0152667be174ee6c9959e64a7ee6a3bd478b3ed258c27df4da';
const PRODUCTION_DRIVER_SHA='e8b89a5aed517be5c1303ca135f9a4964ee58d451444e2e83090a4f363b128f3';
const FIXTURE_SOURCE="#!/usr/bin/env python3\n\"\"\"Owned synthetic protocol fixture; NEVER an original-source acceptance test.\n\nThis exact source is embedded in check-python-partitions.mjs. The controller\npins its SHA256 and fixes argv, suite, case enum, and short fixture budgets.\nIt uses real unittest discovery, callbacks, subtests, and class cleanups.\n\"\"\"\nimport argparse\nimport json\nimport os\nfrom pathlib import Path\nimport signal\nimport sys\nimport time\nimport unittest\n\nSCHEMA = 'ci-python-partition-record-v1'\nPREFIX = 'PARTITION_JSON:'\nCASES = (\n    'success', 'success-crlf', 'success-subtests', 'discovery-missing', 'discovery-extra',\n    'selected-missing', 'selected-duplicate', 'wrong-script', 'wrong-sha',\n    'wrong-class', 'wrong-module', 'wrong-pid', 'wrong-schema',\n    'wrong-sequence', 'unknown-event', 'missing-terminal',\n    'duplicate-terminal', 'wrong-terminal', 'invalid-outcome', 'missing-stop',\n    'early-summary', 'failure', 'subtest-failure', 'setup-error',\n    'cleanup-error', 'skip', 'expected-failure', 'unexpected-success',\n    'nonzero', 'signal', 'early-exit', 'malformed-json', 'unframed',\n    'truncated', 'stdout-overflow', 'stderr-overflow', 'child-timeout',\n    'peer-failure', 'parent-abort', 'spawn-error', 'cleanup-tool-failure',\n)\nPLANS = {\n    'six-history': {\n        'script': 'tests/six_boundary_history_acceptance.py',\n        'sha256': '1d360d565fc9f534fe27bca1dee6388f8faad516ff0ae57803aee6a23162aa55',\n        'class_name': 'SixHistoryControls',\n        'module_name': 'ci_partition_six_history',\n        'methods': (\n            'test_01_exact_positive_and_explicit_historical_logical_frame',\n            'test_02_cached_positive_does_not_hide_any_current_data_mutation',\n            'test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering',\n            'test_04_original_C1_bytes_cannot_replace_actual_future_data',\n            'test_05_C1_fixture_tampering_and_symlink_refuse_after_positive',\n            'test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them',\n            'test_07_runtime_parent_and_full343_objects_are_mandatory',\n        ),\n        'heavy_index': 1,\n        'cap': 1048576,\n    },\n    'six-operation-scope': {\n        'script': 'tests/six_operation_scope_controls.py',\n        'sha256': 'e4bc5488f629b6637a0adec4daf719134abe97ca123897f906da0ac8176ab570',\n        'class_name': 'SixOperationScopeControls',\n        'module_name': 'ci_partition_six_operation_scope',\n        'methods': (\n            'test_01_verified_immutable_original_bytes_within_one_operation',\n            'test_02_public_gates_reject_active_and_closed_internal_scopes',\n            'test_03_exception_closes_and_prevents_escaped_reuse',\n            'test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime',\n            'test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation',\n            'test_06_every_original_fixture_is_verified_before_operation_use',\n            'test_07_mutation_after_capture_never_survives_the_next_operation',\n        ),\n        'heavy_index': 3,\n        'cap': 262144,\n    },\n}\n\n\ndef main():\n    parser = argparse.ArgumentParser()\n    parser.add_argument('--suite', choices=tuple(PLANS), required=True)\n    parser.add_argument('--part', choices=('heavy', 'remaining'), required=True)\n    parser.add_argument('--case', choices=CASES, required=True)\n    args = parser.parse_args()\n    plan = PLANS[args.suite]\n    pid = os.getpid()\n    heavy = args.part == 'heavy'\n    case = args.case if heavy or args.case == 'success-crlf' else 'success'\n    sequence = 0\n    cleanup_done = False\n    started, stopped, terminals = [], [], []\n    target = plan['methods'][plan['heavy_index']]\n    full_target = plan['module_name'] + '.' + plan['class_name'] + '.' + target\n\n    # Fresh exclusive markers are outside stdout and contain no source/user data.\n    marker = Path('ci-fixture-' + args.part + '.json')\n    pending_marker = marker.with_suffix('.json.tmp')\n    with pending_marker.open('x', encoding='ascii') as handle:\n        json.dump({'pid': pid, 'part': args.part, 'case': args.case,\n                   'platform': sys.platform}, handle, separators=(',', ':'))\n    os.replace(pending_marker, marker)\n\n    def raw(text):\n        if args.case == 'success-crlf':\n            # Actual UTF-8 CRLF bytes on every OS; bypass Windows text newline\n            # translation so this never becomes CRCRLF or a platform spoof.\n            if not text.endswith('\\n'):\n                raise RuntimeError('CRLF positive requires a complete record')\n            sys.stdout.buffer.write(text[:-1].encode('utf-8') + b'\\r\\n')\n            sys.stdout.buffer.flush()\n        else:\n            sys.stdout.write(text)\n            sys.stdout.flush()\n\n    def emit(event, **fields):\n        nonlocal sequence\n        row = {'schema': SCHEMA, 'event': event, 'suite': args.suite,\n               'part': args.part, 'pid': pid, 'sequence': sequence}\n        row.update(fields)\n        sequence += 1\n        if case == 'wrong-pid' and event == 'discovery':\n            row['pid'] += 1\n        if case == 'wrong-schema' and event == 'discovery':\n            row['schema'] = 'ci-python-partition-record-v0'\n        if case == 'wrong-sequence' and event == 'discovery':\n            row['sequence'] += 1\n        raw(PREFIX + json.dumps(row, ensure_ascii=False,\n                                separators=(',', ':')) + '\\n')\n\n    def wait_for_peer():\n        peer = Path('ci-fixture-' + ('remaining' if heavy else 'heavy') + '.json')\n        until = time.monotonic() + 1.5\n        while not peer.is_file():\n            if time.monotonic() >= until:\n                raise RuntimeError('Owned peer did not start within fixture bound')\n            time.sleep(0.005)\n\n    def hang():\n        while True:\n            time.sleep(0.05)\n\n    def actual_test(self):\n        is_target = self._testMethodName == target\n        if args.case in ('parent-abort', 'cleanup-tool-failure'):\n            hang()\n        if not heavy and args.case in ('peer-failure', 'spawn-error'):\n            hang()\n        if is_target and heavy:\n            if case == 'child-timeout':\n                hang()\n            if case == 'peer-failure':\n                wait_for_peer()\n                self.fail('Synthetic peer failure after both owned children start')\n            if case in ('failure', 'expected-failure'):\n                self.fail('Synthetic genuine unittest failure')\n            if case == 'skip':\n                self.skipTest('Synthetic genuine unittest skip')\n            if case in ('success-subtests', 'subtest-failure'):\n                with self.subTest(index=0):\n                    self.assertTrue(True)\n                with self.subTest(index=1):\n                    self.assertEqual(case, 'success-subtests')\n        self.assertTrue(True)\n\n    def final_cleanup():\n        nonlocal cleanup_done\n        cleanup_done = True\n        if case == 'cleanup-error':\n            raise RuntimeError('Synthetic genuine class cleanup error')\n\n    def set_up_class(cls):\n        cls.addClassCleanup(final_cleanup)\n        if case == 'setup-error':\n            raise RuntimeError('Synthetic genuine class setup error')\n\n    attrs = {'__module__': plan['module_name'],\n             'setUpClass': classmethod(set_up_class)}\n    for name in plan['methods']:\n        # Separate functions keep unittest decorators local to their real method.\n        def method(self):\n            return actual_test(self)\n        method.__name__ = name\n        if name == target and heavy and case in ('expected-failure', 'unexpected-success'):\n            method = unittest.expectedFailure(method)\n        attrs[name] = method\n    if case == 'discovery-missing':\n        del attrs[plan['methods'][-1]]\n    if case == 'discovery-extra':\n        attrs['test_08_unreviewed_new_method'] = actual_test\n    test_class = type(plan['class_name'], (unittest.TestCase,), attrs)\n\n    emit('phase', phase='import')\n    if case == 'malformed-json':\n        raw(PREFIX + '{not-json}\\n')\n        return\n    if case == 'unframed':\n        raw('unframed fixture record\\n')\n        return\n    if case == 'truncated':\n        raw(PREFIX + '{\"schema\":')\n        return\n    if case in ('stdout-overflow', 'stderr-overflow'):\n        # stdout may hit the stricter per-line bound before the total byte cap.\n        stream = sys.stdout.buffer if case == 'stdout-overflow' else sys.stderr.buffer\n        stream.write(b'X' * (plan['cap'] + 65536))\n        stream.flush()\n        hang()\n\n    emit('phase', phase='discovery')\n    loader = unittest.TestLoader()\n    full_suite = loader.loadTestsFromTestCase(test_class)\n    if loader.errors:\n        raise RuntimeError('Unexpected genuine unittest loader error')\n    discovered_tests = list(full_suite)\n    inventory = [test._testMethodName for test in discovered_tests]\n    selected_tests = [test for test in discovered_tests\n                      if (test._testMethodName == target) == heavy]\n    if case == 'selected-missing':\n        selected_tests = []\n    elif case == 'selected-duplicate':\n        selected_tests = selected_tests + selected_tests\n    selected = [test.id() for test in selected_tests]\n    fields = {\n        'script': plan['script'], 'script_sha256': plan['sha256'],\n        'class_name': plan['class_name'], 'module_name': plan['module_name'],\n        'full_inventory': inventory, 'selected_ids': selected,\n        'python_version': list(sys.version_info[:3]), 'platform': sys.platform,\n    }\n    for key, selected_case, value in (\n        ('script', 'wrong-script', 'tests/unreviewed.py'),\n        ('script_sha256', 'wrong-sha', '0' * 64),\n        ('class_name', 'wrong-class', 'UnreviewedClass'),\n        ('module_name', 'wrong-module', 'unreviewed_module'),\n    ):\n        if case == selected_case:\n            fields[key] = value\n    emit('discovery', **fields)\n    if case == 'early-exit':\n        os._exit(0)\n    if case == 'unknown-event':\n        emit('unreviewed_event')\n        return\n\n    def summary(result, returned):\n        emit('summary', tests_run=result.testsRun, started_ids=started,\n             stopped_ids=stopped, terminal_results=terminals,\n             failures=len(result.failures), errors=len(result.errors),\n             skipped=len(result.skipped),\n             expected_failures=len(result.expectedFailures),\n             unexpected_successes=len(result.unexpectedSuccesses),\n             was_successful=result.wasSuccessful(), runner_returned=returned)\n\n    if case == 'early-summary':\n        summary(unittest.TestResult(), False)\n        return\n    emit('phase', phase='runner_start')\n\n    class RecordedResult(unittest.TextTestResult):\n        def startTest(self, test):\n            super().startTest(test)\n            started.append(test.id())\n            emit('test_start', test_id=test.id())\n\n        def stopTest(self, test):\n            super().stopTest(test)\n            stopped.append(test.id())\n            if case != 'missing-stop':\n                emit('test_stop', test_id=test.id())\n\n        def terminal(self, test, outcome):\n            actual = {'test_id': test.id(), 'outcome': outcome}\n            terminals.append(actual)\n            if case == 'missing-terminal':\n                return\n            shown_id = full_target + '_foreign' if case == 'wrong-terminal' else test.id()\n            shown_outcome = 'passed' if case == 'invalid-outcome' else outcome\n            emit('test_terminal', test_id=shown_id, outcome=shown_outcome)\n            if case == 'duplicate-terminal':\n                emit('test_terminal', test_id=shown_id, outcome=shown_outcome)\n\n        def addSuccess(self, test):\n            super().addSuccess(test)\n            self.terminal(test, 'success')\n\n        def addFailure(self, test, err):\n            super().addFailure(test, err)\n            self.terminal(test, 'failure')\n\n        def addError(self, test, err):\n            super().addError(test, err)\n            self.terminal(test, 'error')\n\n        def addSkip(self, test, reason):\n            super().addSkip(test, reason)\n            self.terminal(test, 'skip')\n\n        def addExpectedFailure(self, test, err):\n            super().addExpectedFailure(test, err)\n            self.terminal(test, 'expected_failure')\n\n        def addUnexpectedSuccess(self, test):\n            super().addUnexpectedSuccess(test)\n            self.terminal(test, 'unexpected_success')\n\n        def addSubTest(self, test, subtest, err):\n            super().addSubTest(test, subtest, err)\n            if err is not None:\n                self.terminal(test, 'subtest_failure')\n\n    result = unittest.TextTestRunner(stream=sys.stderr, verbosity=2,\n                                     resultclass=RecordedResult).run(\n                                         unittest.TestSuite(selected_tests))\n    if not cleanup_done:\n        raise RuntimeError('Real runner returned without class cleanup')\n    finished = Path('ci-fixture-' + args.part + '-finished.json')\n    pending_finished = finished.with_suffix('.json.tmp')\n    with pending_finished.open('x', encoding='ascii') as handle:\n        json.dump({'pid': pid, 'cleanup_done': cleanup_done,\n                   'tests_run': result.testsRun, 'started_ids': started,\n                   'stopped_ids': stopped, 'terminal_results': terminals},\n                  handle, separators=(',', ':'))\n    os.replace(pending_finished, finished)\n    emit('phase', phase='runner_returned')\n    summary(result, True)\n    if case == 'nonzero':\n        sys.stdout.flush()\n        sys.stderr.flush()\n        os._exit(7)\n    if case == 'signal':\n        os.kill(pid, signal.SIGTERM)\n\n\nif __name__ == '__main__':\n    main()\n";
const PLANS={"six-history":{"script":"tests/six_boundary_history_acceptance.py","sha256":"1d360d565fc9f534fe27bca1dee6388f8faad516ff0ae57803aee6a23162aa55","class_name":"SixHistoryControls","module_name":"ci_partition_six_history","methods":["test_01_exact_positive_and_explicit_historical_logical_frame","test_02_cached_positive_does_not_hide_any_current_data_mutation","test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering","test_04_original_C1_bytes_cannot_replace_actual_future_data","test_05_C1_fixture_tampering_and_symlink_refuse_after_positive","test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them","test_07_runtime_parent_and_full343_objects_are_mandatory"],"heavy_index":1,"cap":1048576},"six-operation-scope":{"script":"tests/six_operation_scope_controls.py","sha256":"e4bc5488f629b6637a0adec4daf719134abe97ca123897f906da0ac8176ab570","class_name":"SixOperationScopeControls","module_name":"ci_partition_six_operation_scope","methods":["test_01_verified_immutable_original_bytes_within_one_operation","test_02_public_gates_reject_active_and_closed_internal_scopes","test_03_exception_closes_and_prevents_escaped_reuse","test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime","test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation","test_06_every_original_fixture_is_verified_before_operation_use","test_07_mutation_after_capture_never_survives_the_next_operation"],"heavy_index":3,"cap":262144}};
const CASES=["success","success-crlf","success-subtests","discovery-missing","discovery-extra","selected-missing","selected-duplicate","wrong-script","wrong-sha","wrong-class","wrong-module","wrong-pid","wrong-schema","wrong-sequence","unknown-event","missing-terminal","duplicate-terminal","wrong-terminal","invalid-outcome","missing-stop","early-summary","failure","subtest-failure","setup-error","cleanup-error","skip","expected-failure","unexpected-success","nonzero","signal","early-exit","malformed-json","unframed","truncated","stdout-overflow","stderr-overflow","child-timeout","peer-failure","parent-abort","spawn-error","cleanup-tool-failure"];
const PREFLIGHT_CASES=Object.freeze([
 'production-extra-deadline','production-extra-suite-table',
 'production-extra-executable','production-extra-conformance-case',
 'production-unknown-suite','production-driver-missing','production-driver-tampered',
 'production-changed-original',
 'conformance-extra-args','conformance-extra-budget',
 'conformance-unknown-case','conformance-tampered-fixture',
 'conformance-missing-fixture',
]);
const POSITIVES=new Set(['success','success-crlf','success-subtests']);
const GATE_MS=120000;
const ownedRoots=new Set();
const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(actual,expected,label)=>assert.deepEqual(actual,expected,label);
const scope={
 synthetic_protocol_conformance_only:true,
 original_python_test_execution:false,
 release_or_source_approval:false,
 platform_spoofed:false,
 descendant_tree_cleanup_tested:false,
 physical_device_or_human_assistive_acceptance:false,
 production_child_timeout_ms:60000,
 production_outer_timeout_ms:65000,
 conformance_child_timeout_ms:3000,
 conformance_outer_timeout_ms:5000,
 node_test_registrations_added:0,
};
let activeAbort=null;
let gateExpired=false;
let currentCase=null;
let lastControllerObservation=null;

function boundedCapturedUtf8(value,limit=8192){
 if(typeof value!=='string')return {unavailable:true,type:typeof value};
 const bytes=Buffer.from(value,'utf8'),prefix=bytes.subarray(0,limit);
 return {captured_utf8_bytes:bytes.length,captured_utf8_sha256:hash(bytes),
  retained_prefix_bytes:prefix.length,truncated:prefix.length<bytes.length,
  prefix_utf8:prefix.toString('utf8'),prefix_base64:prefix.toString('base64')};
}
function boundedJson(value,limit=262144){
 if(value===undefined)return {unavailable:true};
 const encoded=JSON.stringify(value),bytes=Buffer.from(encoded,'utf8');
 if(bytes.length<=limit)return {json_utf8_bytes:bytes.length,json_utf8_sha256:hash(bytes),
  truncated:false,value:JSON.parse(encoded)};
 const prefix=bytes.subarray(0,8192);
 return {json_utf8_bytes:bytes.length,json_utf8_sha256:hash(bytes),truncated:true,
  retained_prefix_bytes:prefix.length,prefix_utf8:prefix.toString('utf8'),
  prefix_base64:prefix.toString('base64')};
}
function errorFacts(error){
 if(!error)return null;
 const message=String(error.message??error),bytes=Buffer.from(message,'utf8');
 return {name:String(error.name??'Error'),code:error.code??null,
  message:bytes.subarray(0,4096).toString('utf8'),message_utf8_bytes:bytes.length,
  message_utf8_sha256:hash(bytes),message_truncated:bytes.length>4096};
}
function observeController(result,error){
 return {original_controller_error:errorFacts(error),diagnostics:boundedJson(result),
  // These are the helper's bounded CAPTURED UTF-8 strings, not whole emitted
  // stream hashes. Controller observed byte counts remain in diagnostics.
  captured_child_output:Array.isArray(error?.childOutput)?error.childOutput.map(child=>({
   part:child.part,stdout:boundedCapturedUtf8(child.stdout),
   stderr:boundedCapturedUtf8(child.stderr)})):null};
}

function expectedIds(plan,part){
 return plan.methods.filter((_,index)=>(index===plan.heavy_index)===(part==='heavy'))
  .map(name=>`${plan.module_name}.${plan.class_name}.${name}`);
}
async function freshRoot(){
 const root=await realpath(await mkdtemp(join(tmpdir(),'pali-python-partition-conformance-')));
 ownedRoots.add(root);
 if(process.platform!=='win32')await chmod(root,0o700);
 assert.equal(await realpath(root),root,'fresh conformance root must be physical');
 assert.equal((await lstat(root)).isSymbolicLink(),false);
 await writeFile(join(root,FIXTURE_NAME),FIXTURE_SOURCE,{flag:'wx',mode:0o600});
 assert.equal(hash(await readFile(join(root,FIXTURE_NAME))),FIXTURE_SHA);
 return root;
}
async function ownJson(root,name){
 assert.ok(ownedRoots.has(root));
 const path=join(root,name);
 try{
  const info=await lstat(path);
  assert.ok(info.isFile()&&!info.isSymbolicLink(),'fixture marker must be a regular owned file');
  assert.ok(info.size<=65536,'bounded fixture marker');
  return JSON.parse(await readFile(path,'utf8'));
 }catch(error){if(error.code==='ENOENT')return null;throw error;}
}
async function marker(root,part){return ownJson(root,`ci-fixture-${part}.json`);}
async function waitForBothMarkers(root,signal){
 const end=performance.now()+2000;
 while(performance.now()<end){
  if(signal.aborted)throw new Error('Gate aborted while waiting for fixture start');
  const markers=await Promise.all(['heavy','remaining'].map(part=>marker(root,part)));
  if(markers.every(Boolean))return markers;
  await delay(5);
 }
 throw new Error('Both real fixture children did not start before bounded parent-abort control');
}
function pidAbsent(pid,group=false){
 assert.ok(Number.isSafeInteger(pid)&&pid>0,'only measured owned child PID');
 try{process.kill(group?-pid:pid,0);return false;}
 catch(error){if(error.code==='ESRCH')return true;throw error;}
}
function checkInitialProbeDiagnostic(probe){
 assert.ok(probe,'initial kernel observations must remain available as diagnostics');
 same(Object.keys(probe),['signal','outcome','error_code']);assert.equal(probe.signal,0);
 if(probe.outcome==='absent')assert.equal(probe.error_code,'ESRCH');
 else if(probe.outcome==='present')assert.equal(probe.error_code,null);
 else{
  assert.equal(probe.outcome,'unknown');
  assert.ok(typeof probe.error_code==='string'&&probe.error_code.length>0);
 }
}
function checkFallbackHistory(history){
 assert.ok(Array.isArray(history),'actual fallback action history must be retained');
 for(const row of history){
  same(Object.keys(row),['reason','operation','signal','attempted','return_value','error']);
  assert.ok(typeof row.reason==='string'&&row.reason.length>0);
  assert.equal(row.operation,'owned-ChildProcess.kill');assert.equal(row.signal,'SIGKILL');
  assert.equal(typeof row.attempted,'boolean');
  if(!row.attempted){assert.equal(row.return_value,null);assert.equal(row.error,null);}
  else assert.ok((typeof row.return_value==='boolean'&&row.error===null)||
   (row.return_value===null&&typeof row.error==='string'&&row.error.length>0),
  'fallback result must report the actual signal API return or synchronous error');
 }
}
function checkVerifiedCleanupBasis(child,result){
 assert.equal(child.cleanup_verified,true,'close alone does not verify requested cleanup');
 assert.equal(child.cleanup_error,null,'verified cleanup cannot retain an unresolved tool error');
 assert.equal(child.terminal_observed,true,'actual owned ChildProcess exit event is required');
 if(child.cleanup_basis==='owned-exit-pid-absence'){
  assert.equal(result.platform,'win32');
  assert.equal(result.cleanup_strategy,'owned-windows-taskkill');
  assert.equal(child.cleanup_group_error,null);
  same(child.cleanup_tool,{exit:128,signal:null,error:null},'actual not-found tool result must be retained');
  const proof=child.cleanup_proof;
  assert.ok(proof,'direct-child absence requires a complete composite proof');
  same(Object.keys(proof),['schema','kind','pid','owned_process_identity',
   'terminal_observed_at_tool_close','close_observed','exit','signal',
   'tool_close_observed','tool_exit','tool_signal','tool_error','tool_deadline',
   'within_deadline','pid_probe','descendants_verified']);
  assert.ok(Number.isInteger(child.exit)||typeof child.signal==='string',
   'already-terminal evidence cannot be inferred from close alone');
  same(proof,{schema:'owned-child-exit-pid-absence-proof-v1',kind:'owned-exit-pid-absence',
   pid:child.pid,owned_process_identity:true,terminal_observed_at_tool_close:true,
   close_observed:true,exit:child.exit,signal:child.signal,tool_close_observed:true,
   tool_exit:128,tool_signal:null,tool_error:null,tool_deadline:false,
   within_deadline:true,pid_probe:{signal:0,outcome:'absent',error_code:'ESRCH'},
   descendants_verified:false},'tool128 is not success without the exact already-exited proof');
 }else if(child.cleanup_basis==='owned-final-pid-group-absence'){
  assert.notEqual(result.platform,'win32');
  assert.equal(result.cleanup_strategy,'owned-posix-group');
  assert.equal(child.cleanup_tool,null);assert.equal(child.cleanup_group_error,'EPERM');
  assert.ok((Number.isInteger(child.exit)&&child.signal===null)||
   (child.exit===null&&typeof child.signal==='string'),'actual terminal exit/signal pair required');
  const proof=child.cleanup_proof;
  assert.ok(proof,'EPERM requires independent final owned resource-absence evidence');
  same(Object.keys(proof),['schema','kind','pid','pgid','owned_process_identity',
   'group_signal_attempt','group_signal_error','group_signal_reported_success',
   'initial_pid_probe','initial_group_probe','initial_probes_are_diagnostic','fallback_history',
   'terminal_observed','close_observed',
   'exit','signal','within_deadline','pid_probe','group_probe','descendants_verified']);
  checkInitialProbeDiagnostic(proof.initial_pid_probe);
  checkInitialProbeDiagnostic(proof.initial_group_probe);
  same(proof.initial_pid_probe,child.cleanup_initial_pid_probe);
  same(proof.initial_group_probe,child.cleanup_initial_group_probe);
  checkFallbackHistory(child.cleanup_fallback_history);
  same(proof,{schema:'owned-child-final-pid-group-absence-proof-v1',
   kind:'owned-final-pid-group-absence',pid:child.pid,pgid:child.pid,
   owned_process_identity:true,group_signal_attempt:'SIGKILL',group_signal_error:'EPERM',
   group_signal_reported_success:false,initial_pid_probe:child.cleanup_initial_pid_probe,
   initial_group_probe:child.cleanup_initial_group_probe,initial_probes_are_diagnostic:true,
   fallback_history:child.cleanup_fallback_history,
   terminal_observed:true,close_observed:true,exit:child.exit,signal:child.signal,
   within_deadline:true,pid_probe:{signal:0,outcome:'absent',error_code:'ESRCH'},
   group_probe:{signal:0,outcome:'absent',error_code:'ESRCH'},descendants_verified:false},
  'raw EPERM and initial observations cannot replace the exact final owned PID/group proof');
 }else if(child.cleanup_basis==='windows-taskkill-complete'){
  assert.equal(result.platform,'win32');
  assert.equal(result.cleanup_strategy,'owned-windows-taskkill');
  assert.equal(child.cleanup_group_error,null);
  same(child.cleanup_tool,{exit:0,signal:null,error:null});
  assert.equal(child.cleanup_proof,null);
 }else{
  assert.equal(child.cleanup_basis,'posix-group-absent','unknown cleanup evidence cannot pass');
  assert.notEqual(result.platform,'win32');
  assert.equal(result.cleanup_strategy,'owned-posix-group');
  assert.ok(child.cleanup_group_error===null||child.cleanup_group_error==='ESRCH',
   'ordinary group absence cannot silently absorb EPERM or an unknown error');
  assert.equal(child.cleanup_tool,null);assert.equal(child.cleanup_proof,null);
 }
}
async function checkClosed(root,suiteKey,caseKey,result){
 const plan=PLANS[suiteKey];
 assert.equal(result.schema,'ci-python-partitions-result-v1');
 assert.equal(result.suite,suiteKey);
 assert.equal(result.platform,process.platform,'actual OS must be reported');
 assert.equal(result.node,process.versions.node);
 assert.equal(result.production,false,'synthetic mode cannot approve production');
 assert.equal(result.status,POSITIVES.has(caseKey)?'PASS':'FAIL');
 assert.equal(result.all_owned_children_closed,true,'all owned ChildProcess close events required');
 assert.equal(result.cleanup_tools_closed,true,'owned cleanup tools must also have closed');
 assert.equal(result.child_timeout_ms,3000);
 assert.equal(result.global_outer_ms,5000);
 assert.equal(result.effective_cleanup_deadline_ms,4750);
 assert.equal(result.source_script,plan.script);
 assert.equal(result.source_sha256,plan.sha256);
 assert.ok(Number.isFinite(result.seconds)&&result.seconds>=0&&result.seconds<=5,
  'controller returned inside its fixed conformance cap');
 same(result.children.map(child=>child.part),['heavy','remaining']);
 const pids=[];
 for(const child of result.children){
  assert.equal(child.closed,true,'both close events are mandatory even on failure');
  const executable=caseKey==='spawn-error'&&child.part==='heavy'
   ?join(root,'ci-conformance-missing-executable'):process.env.PYTHON||'python3';
  same(child.argv,[executable,'-B',FIXTURE_NAME,'--suite',suiteKey,
   '--part',child.part,'--case',caseKey],'closed conformance command and argv');
  const actual=await marker(root,child.part);
  if(child.pid!==null){
   assert.equal(child.spawned,true);
   assert.ok(Number.isSafeInteger(child.pid)&&child.pid>0);
   pids.push(child.pid);
   assert.equal(pidAbsent(child.pid),true,'owned child PID still exists after close');
   if(process.platform!=='win32')
    assert.equal(pidAbsent(child.pid,true),true,'owned POSIX process group remains');
  }else assert.equal(child.spawned,false,'a failed spawn cannot invent a child');
  if(actual){
   same(actual,{pid:child.pid,part:child.part,case:caseKey,platform:process.platform});
  }
  if(['parent-abort','peer-failure','cleanup-tool-failure'].includes(caseKey))
   assert.ok(actual,'both real fixture programs started for cleanup control');
  if(child.cleanup_requested){
   if(caseKey==='cleanup-tool-failure'){
    assert.equal(child.cleanup_verified,false,'synthetic cleanup failure must stay fatal');
    assert.equal(child.cleanup_basis,'unverified');assert.equal(child.cleanup_proof,null);
    assert.equal(child.cleanup_group_error,null);
    assert.ok(child.cleanup_error,'cleanup failure diagnostic required');
   }else checkVerifiedCleanupBasis(child,result);
  }else{
   assert.equal(child.cleanup_basis,null);assert.equal(child.cleanup_proof,null);
   assert.equal(child.cleanup_group_error,null);
  }
 }
 assert.equal(new Set(pids).size,pids.length,'owned child PIDs are distinct');
 return pids;
}
function assertCaseFailure(caseKey,result,error){
 const heavy=result.children[0],remaining=result.children[1];
 assert.equal(error.code,'ERR_PYTHON_PARTITIONS');
 const protocol=heavy.protocol_error;
 const malformed=new Set([
  'discovery-missing','discovery-extra','selected-missing','selected-duplicate',
  'wrong-script','wrong-sha','wrong-class','wrong-module','wrong-pid','wrong-schema',
  'wrong-sequence','unknown-event','missing-terminal','duplicate-terminal',
  'wrong-terminal','invalid-outcome','missing-stop','early-summary',
  'setup-error','cleanup-error','malformed-json','unframed','truncated',
 ]);
 if(malformed.has(caseKey))assert.ok(protocol,'intended protocol/metadata refusal must be observed');
 const beforeRunner=new Set(['discovery-missing','discovery-extra','selected-missing',
  'selected-duplicate','wrong-script','wrong-sha','wrong-class','wrong-module',
  'wrong-pid','wrong-schema','wrong-sequence','unknown-event','early-summary']);
 if(beforeRunner.has(caseKey))assert.equal(heavy.last_phase,'discovery',
  'bad inventory/metadata must refuse before the real runner starts');
 if(['missing-terminal','duplicate-terminal','wrong-terminal','invalid-outcome',
  'missing-stop','setup-error','cleanup-error'].includes(caseKey))
  assert.equal(heavy.last_phase,'runner_start','callback defect must refuse before runner_returned');
 if(['malformed-json','unframed','truncated'].includes(caseKey))
  assert.equal(heavy.last_phase,'import','framing defect must refuse before discovery');
 if(caseKey==='setup-error'||caseKey==='cleanup-error'){
  assert.equal(protocol,'Foreign method/fixture error callback');
  assert.ok(Array.isArray(error.childOutput),'bounded captured child output is required');
  same(error.childOutput.map(child=>child.part),['heavy','remaining']);
  const output=error.childOutput[0].stdout,plan=PLANS[result.suite];
  assert.equal(typeof output,'string');
  assert.ok(Buffer.byteLength(output)<=plan.cap,'captured stdout must remain bounded');
  // Inspect complete captured records only; an interrupted trailing record is
  // never evidence for the rejected class-fixture callback.
  const records=output.split('\n').slice(0,-1).map(rawLine=>{
   const line=rawLine.endsWith('\r')?rawLine.slice(0,-1):rawLine;
   assert.ok(line.startsWith('PARTITION_JSON:'));
   const payload=line.slice('PARTITION_JSON:'.length),row=JSON.parse(payload);
   assert.equal(JSON.stringify(row),payload,'captured records must be canonical');
   return row;
  });
  const selected=expectedIds(plan,'heavy');
  const foreign=records.filter(row=>row.event==='test_terminal'&&!selected.includes(row.test_id));
  assert.equal(foreign.length,1,'an unrelated foreign callback cannot cover this control');
  const row=foreign[0],method=caseKey==='setup-error'?'setUpClass':'tearDownClass';
  same(Object.keys(row),['schema','event','suite','part','pid','sequence','test_id','outcome']);
  assert.equal(row.schema,'ci-python-partition-record-v1');
  assert.equal(row.event,'test_terminal');assert.equal(row.suite,result.suite);
  assert.equal(row.part,'heavy');assert.equal(row.pid,heavy.pid);
  assert.equal(row.sequence,records.indexOf(row));
  assert.equal(row.test_id,`${method} (${plan.module_name}.${plan.class_name})`);
  assert.equal(row.outcome,'error','genuine class-fixture error callback required');
 }
 const outcomes={failure:'failure','subtest-failure':'subtest_failure',skip:'skip',
  'expected-failure':'expected_failure','unexpected-success':'unexpected_success',
  'peer-failure':'failure'};
 if(Object.hasOwn(outcomes,caseKey)){
  assert.ok(heavy.terminal_results.some(row=>row.outcome===outcomes[caseKey]),
   'genuine unittest outcome must reach the controller');
  assert.ok(heavy.protocol_error,'non-success cannot become a passing summary');
 }
 if(caseKey==='nonzero')assert.equal(heavy.exit,7,'real nonzero exit required');
 if(caseKey==='signal')assert.ok(heavy.signal!==null||heavy.exit!==0,'real abnormal termination required');
 if(caseKey==='early-exit'){
  assert.equal(heavy.exit,0,'early exit is genuinely clean at OS level');
  assert.match(heavy.protocol_error??'',/Missing|Incomplete/,'missing receipt must still reject');
 }
 if(caseKey==='stdout-overflow'){
  assert.ok(heavy.stdout_bytes>65536,'actual excessive stdout was consumed');
  assert.ok(heavy.overflow||heavy.protocol_error,
   'stdout must fail a byte or stricter line/framing bound; isolated stream-cap coverage is not claimed');
 }
 if(caseKey==='stderr-overflow'){
  assert.equal(heavy.overflow,true,'actual stderr byte cap required');
  assert.ok(heavy.stderr_bytes>PLANS[result.suite].cap);
 }
 if(caseKey==='child-timeout')assert.equal(heavy.timed_out,true,'real short child deadline required');
 if(caseKey==='peer-failure')assert.equal(remaining.cleanup_requested,true,'failing peer must cancel live sibling');
 if(caseKey==='parent-abort'){
  assert.match(error.message,/aborted/i);
  assert.ok(result.children.every(child=>child.cleanup_requested),'abort must own both live children');
 }
 if(caseKey==='spawn-error'){
  assert.equal(heavy.error,'ENOENT','real fixed missing executable must fail');
  assert.equal(heavy.pid,null,'spawn failure has no invented PID');
 }
 if(caseKey==='cleanup-tool-failure'){
  assert.equal(result.cleanup_strategy,'synthetic-missing-tool');
  assert.ok(result.children.every(child=>child.cleanup_requested));
  assert.ok(result.children.some(child=>child.timed_out));
 }
}
async function runtimeCase(suiteKey,caseKey){
 currentCase={suite:suiteKey,case:caseKey,kind:'runtime',stage:'provisioning',root:null};
 lastControllerObservation=null;
 assert.equal(gateExpired,false,'standalone gate deadline expired');
 const root=await freshRoot(),abort=new AbortController();
 currentCase.root=root;currentCase.stage='controller-running';
 activeAbort=abort;
 let returned=null,error=null,setupError=null;
 const begin=performance.now();
 const invocation=runPythonPartitionConformance({root,suiteKey,caseKey,signal:abort.signal})
  .then(value=>{returned=value;},failure=>{error=failure;});
 if(caseKey==='parent-abort'){
  try{await waitForBothMarkers(root,abort.signal);}
  catch(failure){setupError=failure;}
  finally{abort.abort();}
 }
 await invocation;
 activeAbort=null;
 const result=error?.diagnostics??returned;
 lastControllerObservation=observeController(result,error);
 currentCase.stage='validating-controller-result';
 if(setupError)throw setupError;
 assert.ok(result,'runtime cases must reach same-engine child diagnostics');
 const pids=await checkClosed(root,suiteKey,caseKey,result);
 if(POSITIVES.has(caseKey)){
  assert.equal(error,null,'genuine successful unittest fixtures must pass');
  for(const child of result.children){
   const ids=expectedIds(PLANS[suiteKey],child.part);
   assert.equal(child.exit,0);assert.equal(child.signal,null);
   assert.equal(child.error,null);assert.equal(child.protocol_error,null);
   assert.equal(child.timed_out,false);assert.equal(child.overflow,false);
   assert.equal(child.last_phase,'runner_returned');
   same(child.started_ids,ids);same(child.stopped_ids,ids);
   same(child.terminal_results,ids.map(test_id=>({test_id,outcome:'success'})));
   assert.equal(child.summary.tests_run,ids.length);
   assert.equal(child.summary.was_successful,true);
   assert.equal(child.summary.runner_returned,true);
   const finished=await ownJson(root,`ci-fixture-${child.part}-finished.json`);
   same(finished,{pid:child.pid,cleanup_done:true,tests_run:ids.length,
    started_ids:ids,stopped_ids:ids,
    terminal_results:ids.map(test_id=>({test_id,outcome:'success'}))},
   'genuine runner and class cleanup must have returned');
  }
 }else{
  assert.ok(error,'an intended faulty fixture must never pass');
  assert.equal(returned,null);
  assertCaseFailure(caseKey,result,error);
  const completedOutcomes={failure:'failure','subtest-failure':'subtest_failure',
   skip:'skip','expected-failure':'expected_failure','unexpected-success':'unexpected_success',
   'peer-failure':'failure',nonzero:'success',signal:'success'};
  if(Object.hasOwn(completedOutcomes,caseKey)){
   const heavy=result.children[0],ids=expectedIds(PLANS[suiteKey],'heavy');
   assert.equal(heavy.last_phase,'runner_returned',
    'ordinary result callbacks must finish the real runner/class cleanup before rejection');
   same(await ownJson(root,'ci-fixture-heavy-finished.json'),{
    pid:heavy.pid,cleanup_done:true,tests_run:1,started_ids:ids,stopped_ids:ids,
    terminal_results:ids.map(test_id=>({test_id,outcome:completedOutcomes[caseKey]}))});
  }
 }
 const row={suite:suiteKey,case:caseKey,expected:POSITIVES.has(caseKey)?'accept':'reject',
  passed:true,actual_platform:process.platform,seconds:(performance.now()-begin)/1000,
  both_close:true,owned_pids:pids,owned_pids_absent:true,
  POSIX_groups_absent:process.platform==='win32'?null:true,
  child_timeout_observed:result.children.some(child=>child.timed_out),
  protocol_or_output_refusal_observed:result.children.some(child=>child.overflow||child.protocol_error),
  cleanup_strategy:result.cleanup_strategy??'actual-platform',
  cleanup_evidence:result.children.map(child=>({part:child.part,basis:child.cleanup_basis,
   verified:child.cleanup_verified,tool_exit:child.cleanup_tool?.exit??null,
   group_signal_error:child.cleanup_group_error,
   direct_absence_proof_checked:['owned-exit-pid-absence','owned-final-pid-group-absence'].includes(child.cleanup_basis),
   fallback_history:child.cleanup_fallback_history,
   descendants_verified:child.cleanup_proof?.descendants_verified??null})),
  cleanup_failure_remained_fatal:caseKey==='cleanup-tool-failure'?true:null};
 // Remove only our exact fresh tree, after both closes and measured PID absence.
 assert.ok(ownedRoots.has(root));
 await rm(root,{recursive:true,force:false});ownedRoots.delete(root);
 return row;
}
async function preflightCase(suiteKey,caseKey){
 currentCase={suite:suiteKey,case:caseKey,kind:'prelaunch',stage:'provisioning',root:null};
 lastControllerObservation=null;
 const root=await freshRoot(),abort=new AbortController();
 currentCase.root=root;currentCase.stage='prelaunch-control';
 const signal=abort.signal,plan=PLANS[suiteKey];
 let invocation,expected;
 const production={root,suiteKey,signal};
 const conformance={root,suiteKey,caseKey:'success',signal};
 switch(caseKey){
  case 'production-extra-deadline':
   invocation=()=>runPythonPartitions({...production,childTimeoutMs:0});expected=/options/;break;
  case 'production-extra-suite-table':
   invocation=()=>runPythonPartitions({...production,suites:{}});expected=/options/;break;
  case 'production-extra-executable':
   invocation=()=>runPythonPartitions({...production,executable:join(root,'unowned')});expected=/options/;break;
  case 'production-extra-conformance-case':
   invocation=()=>runPythonPartitions({...production,caseKey:'success'});expected=/options/;break;
  case 'production-unknown-suite':
   invocation=()=>runPythonPartitions({root,suiteKey:'unknown-suite',signal});expected=/Unknown closed/;break;
  case 'production-driver-missing':
   await mkdir(join(root,'scripts'));
   invocation=()=>runPythonPartitions(production);expected=/ENOENT.*ci-python-partition-driver/;break;
  case 'production-driver-tampered':
   await mkdir(join(root,'scripts'));
   await writeFile(join(root,'scripts','ci-python-partition-driver.py'),'# Owned tampered driver\n',{flag:'wx'});
   invocation=()=>runPythonPartitions(production);expected=/driver.*changed/i;break;
  case 'production-changed-original':
   await mkdir(join(root,'scripts'));await mkdir(join(root,'tests'));
   const driver=await readFile(new URL('./ci-python-partition-driver.py',import.meta.url));
   assert.equal(hash(driver),PRODUCTION_DRIVER_SHA,'provision exact reviewed production driver before testing original-source guard');
   await writeFile(join(root,'scripts','ci-python-partition-driver.py'),driver,{flag:'wx'});
   await writeFile(join(root,plan.script),'# Synthetic data cannot override the closed original SHA\n',{flag:'wx'});
   invocation=()=>runPythonPartitions(production);expected=/Original Python test source changed/;break;
  case 'conformance-extra-args':
   invocation=()=>runPythonPartitionConformance({...conformance,argsByPart:{}});expected=/options/;break;
  case 'conformance-extra-budget':
   invocation=()=>runPythonPartitionConformance({...conformance,globalTimeoutMs:0});expected=/options/;break;
  case 'conformance-unknown-case':
   invocation=()=>runPythonPartitionConformance({root,suiteKey,caseKey:'unknown-case',signal});expected=/unknown closed/i;break;
  case 'conformance-tampered-fixture':
   await writeFile(join(root,FIXTURE_NAME),FIXTURE_SOURCE+'# tampered\n');
   invocation=()=>runPythonPartitionConformance(conformance);expected=/fixture source changed/i;break;
  case 'conformance-missing-fixture':
   await rm(join(root,FIXTURE_NAME));
   invocation=()=>runPythonPartitionConformance(conformance);expected=/ENOENT/;break;
  default:throw new Error('Unknown gate-owned preflight case');
 }
 let error=null;
 try{await invocation();}catch(failure){error=failure;}
 assert.ok(error,'closed prelaunch control must reject');
 assert.match(error.message,expected);
 assert.equal(error.diagnostics,undefined,'preflight cannot silently spawn a child');
 for(const part of ['heavy','remaining'])assert.equal(await marker(root,part),null);
 await rm(root,{recursive:true,force:false});ownedRoots.delete(root);
 return {suite:suiteKey,case:caseKey,expected:'reject-before-spawn',passed:true};
}
async function main(){
 assert.equal(process.argv.length,2,'closed standalone gate accepts no injection arguments');
 assert.equal(hash(FIXTURE_SOURCE),FIXTURE_SHA,'embedded fixture bytes must match independent frozen SHA');
 assert.equal(CASES.length,41);assert.equal(new Set(CASES).size,41);
 assert.equal(PREFLIGHT_CASES.length,13);
 const started=performance.now(),results=[],preflight=[];
 const deadline=setTimeout(()=>{gateExpired=true;activeAbort?.abort();},GATE_MS);
 const report={schema:'python-partition-conformance-gate-v1',status:'RUNNING',
  actual_platform:process.platform,node:process.versions.node,
  fixture_sha256:FIXTURE_SHA,fixture_bytes:Buffer.byteLength(FIXTURE_SOURCE),
  production_driver_sha256:PRODUCTION_DRIVER_SHA,
  helper_source_sha256:hash(await readFile(new URL('../tests/helpers/partitioned-python.mjs',import.meta.url))),
  scope,runtime_case_count:82,prelaunch_case_count:26,results,preflight};
 try{
  // Three genuine positives precede every negative category in BOTH suites.
  for(const suiteKey of Object.keys(PLANS)){
   for(const caseKey of CASES)results.push(await runtimeCase(suiteKey,caseKey));
   for(const caseKey of PREFLIGHT_CASES)preflight.push(await preflightCase(suiteKey,caseKey));
  }
  assert.equal(gateExpired,false);
  assert.equal(results.length,82);assert.equal(preflight.length,26);
  assert.equal(ownedRoots.size,0,'no live fixture tree may be abandoned on PASS');
  report.status='PASS';
 }catch(error){
  activeAbort?.abort();report.status='FAIL';
  report.failure={...errorFacts(error),case_context:currentCase,
   controller_observation:lastControllerObservation,
   retained_owned_roots:[...ownedRoots]};
  process.exitCode=1;
 }finally{
  clearTimeout(deadline);report.seconds=(performance.now()-started)/1000;
  // No private state/source words, no unbounded child stdout/stderr in this report.
  console.log('PYTHON_PARTITIONS_CONFORMANCE:'+JSON.stringify(report));
 }
}
await main();
