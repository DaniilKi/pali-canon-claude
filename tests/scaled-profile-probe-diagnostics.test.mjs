import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const SCRIPT=fileURLToPath(new URL('./scaled_profile_probe_diagnostic_controls.py',import.meta.url));
const EXPECTED_IDS=Object.freeze(["__main__.DiagnosticControls.test_exact_original_probe_call_assertion_and_other_code","__main__.DiagnosticControls.test_large_private_capture_scans_bounded_window_and_output","__main__.DiagnosticControls.test_negative_returncode_is_signal_convention_not_cause","__main__.DiagnosticControls.test_no_completed_result_retains_unknown_streams","__main__.DiagnosticControls.test_nonzero_utf8_hashes_without_any_capture_content","__main__.DiagnosticControls.test_original_exception_identity_survives_logging_and_logger_failure","__main__.DiagnosticControls.test_receipt_json_shape_and_assertion_failures","__main__.DiagnosticControls.test_stubbed_success_does_not_log_or_launch_any_child","__main__.DiagnosticControls.test_unknown_or_ambiguous_node_hints_never_echo_messages","__main__.DiagnosticControls.test_unsupported_streams_and_foreign_results_do_not_stringify"]);
const FIELDS=Object.freeze(['schema','status','runner_completed','tests_run','discovered_ids','started_ids','stopped_ids','success_ids','errors','failures','skipped','expected_failures','unexpected_successes']);

test('profile-probe diagnostic privacy controls execute all ten exact synthetic unittest cases',{timeout:15000},()=>{
  const run=spawnSync(process.env.PYTHON||'python3',['-B',SCRIPT],{cwd:ROOT,encoding:'utf8',timeout:10000,killSignal:'SIGKILL',maxBuffer:1024*1024});
  // Assertions never forward captured text or exception messages into TAP.
  assert.ok(run.error===undefined,'Synthetic privacy controls did not start or finish within their bound');
  assert.ok(run.signal===null,'Synthetic privacy controls must exit normally');
  assert.ok(run.status===0,'Synthetic privacy controls reported failure');
  assert.ok(typeof run.stdout==='string'&&typeof run.stderr==='string','Expected bounded UTF8 capture representation');
  assert.ok(run.stderr==='','Synthetic controls must not emit stderr');
  assert.ok(!/PRIVATE_SCALED81_DIAGNOSTIC_|PRIVATE_MODULE|tha-ap62/.test(run.stdout),'Synthetic private capture escaped the metadata-only report');
  let report;
  try{report=JSON.parse(run.stdout);}catch{assert.fail('Synthetic controls must emit one valid metadata-only JSON report');}
  assert.ok(report&&typeof report==='object'&&!Array.isArray(report)&&Object.getPrototypeOf(report)===Object.prototype,'Expected a typed controls report');
  const keys=Object.keys(report).sort();
  assert.ok(keys.length===FIELDS.length&&keys.every((key,i)=>key===[...FIELDS].sort()[i]),'Unexpected controls report fields');
  assert.ok(report.schema==='scaled-profile-probe-diagnostic-controls-v1'&&report.status==='passed'&&report.runner_completed===true,'Incomplete synthetic controls result');
  assert.ok(report.tests_run===10,'All ten controls must actually run');
  for(const field of ['discovered_ids','started_ids','stopped_ids','success_ids']){
    const values=report[field];
    assert.ok(Array.isArray(values)&&values.length===10&&values.every((value,i)=>value===EXPECTED_IDS[i]),'Exact ten discovered and lifecycle IDs required');
  }
  for(const field of ['errors','failures','skipped','expected_failures','unexpected_successes'])assert.ok(report[field]===0,'Every synthetic control must complete successfully without conditional outcomes');
});
