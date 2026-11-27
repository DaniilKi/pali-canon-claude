"""Closed CI-only unittest partitions; original scripts and defaults are untouched."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import unittest

SCHEMA = 'ci-python-partition-record-v1'
PREFIX = 'PARTITION_JSON:'
PLANS = {'six-history': {'script': 'tests/six_boundary_history_acceptance.py',
                 'class_name': 'SixHistoryControls',
                 'source_sha256': '1d360d565fc9f534fe27bca1dee6388f8faad516ff0ae57803aee6a23162aa55',
                 'full_inventory': ['test_01_exact_positive_and_explicit_historical_logical_frame',
                                    'test_02_cached_positive_does_not_hide_any_current_data_mutation',
                                    'test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering',
                                    'test_04_original_C1_bytes_cannot_replace_actual_future_data',
                                    'test_05_C1_fixture_tampering_and_symlink_refuse_after_positive',
                                    'test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them',
                                    'test_07_runtime_parent_and_full343_objects_are_mandatory'],
                 'old_per_stream_output_cap_bytes': 1048576,
                 'module_name': 'ci_partition_six_history',
                 'partitions': {'heavy': ['test_02_cached_positive_does_not_hide_any_current_data_mutation'],
                                'remaining': ['test_01_exact_positive_and_explicit_historical_logical_frame',
                                              'test_03_every_source_runtime_and_parent_proof_refuses_loss_and_tampering',
                                              'test_04_original_C1_bytes_cannot_replace_actual_future_data',
                                              'test_05_C1_fixture_tampering_and_symlink_refuse_after_positive',
                                              'test_06_pure_inverse_preserves_unrelated_mutations_but_complete_gate_refuses_them',
                                              'test_07_runtime_parent_and_full343_objects_are_mandatory']}},
 'six-operation-scope': {'script': 'tests/six_operation_scope_controls.py',
                         'class_name': 'SixOperationScopeControls',
                         'source_sha256': 'e4bc5488f629b6637a0adec4daf719134abe97ca123897f906da0ac8176ab570',
                         'full_inventory': ['test_01_verified_immutable_original_bytes_within_one_operation',
                                            'test_02_public_gates_reject_active_and_closed_internal_scopes',
                                            'test_03_exception_closes_and_prevents_escaped_reuse',
                                            'test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime',
                                            'test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation',
                                            'test_06_every_original_fixture_is_verified_before_operation_use',
                                            'test_07_mutation_after_capture_never_survives_the_next_operation'],
                         'old_per_stream_output_cap_bytes': 262144,
                         'module_name': 'ci_partition_six_operation_scope',
                         'partitions': {'heavy': ['test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime'],
                                        'remaining': ['test_01_verified_immutable_original_bytes_within_one_operation',
                                                      'test_02_public_gates_reject_active_and_closed_internal_scopes',
                                                      'test_03_exception_closes_and_prevents_escaped_reuse',
                                                      'test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation',
                                                      'test_06_every_original_fixture_is_verified_before_operation_use',
                                                      'test_07_mutation_after_capture_never_survives_the_next_operation']}}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--suite', required=True, choices=tuple(PLANS))
    parser.add_argument('--part', required=True, choices=('heavy', 'remaining'))
    args = parser.parse_args()
    if sys.version_info[:2] != (3, 12):
        raise RuntimeError('Fixture partitions require explicit Python 3.12')
    plan = PLANS[args.suite]
    root = Path(__file__).absolute().parents[1]
    script = root / plan['script']
    if root.is_symlink() or script.is_symlink() or not script.is_file():
        raise ValueError('Physical original unittest source required')
    before = script.read_bytes()
    if hashlib.sha256(before).hexdigest() != plan['source_sha256']:
        raise ValueError('Original unittest source SHA changed')
    sequence = 0

    def emit(event, **fields):
        nonlocal sequence
        row = {'schema': SCHEMA, 'event': event, 'suite': args.suite,
               'part': args.part, 'pid': os.getpid(), 'sequence': sequence}
        row.update(fields)
        sys.stdout.write(PREFIX + json.dumps(row, ensure_ascii=False,
                                           allow_nan=False, separators=(',', ':')) + '\n')
        sys.stdout.flush()
        sequence += 1

    emit('phase', phase='import')
    sys.path.insert(0, str(root / 'tests'))
    # A fixed non-main identity preserves the direct script's ordinary main.
    spec = importlib.util.spec_from_file_location(plan['module_name'], script)
    if spec is None or spec.loader is None or plan['module_name'] in sys.modules:
        raise ValueError('Unique fixed unittest module identity required')
    module = importlib.util.module_from_spec(spec)
    sys.modules[plan['module_name']] = module
    exec(compile(before, str(script), 'exec'), module.__dict__)
    cls = getattr(module, plan['class_name'], None)
    if not isinstance(cls, type) or not issubclass(cls, unittest.TestCase):
        raise ValueError('Named original unittest class is missing')
    if cls.__module__ != plan['module_name']:
        raise ValueError('Foreign unittest class module')
    emit('phase', phase='discovery')
    loader = unittest.TestLoader()
    complete_suite = loader.loadTestsFromTestCase(cls)
    if loader.errors:
        raise ValueError('Unittest loader errors cannot be partitioned')
    complete = list(complete_suite)
    if any(type(test) is not cls for test in complete):
        raise ValueError('Synthetic or foreign discovered unittest object')
    methods = [test._testMethodName for test in complete]
    if methods != plan['full_inventory'] or len(complete) != 7:
        raise ValueError('Complete original seven-method inventory changed')
    method_map = dict(zip(methods, complete))
    chosen = plan['partitions'][args.part]
    selected = [method_map[name] for name in chosen]
    expected_ids = [plan['module_name'] + '.' + plan['class_name'] + '.' + name
                    for name in chosen]
    if [test.id() for test in selected] != expected_ids:
        raise ValueError('Actual selected unittest IDs changed')
    if len(set(expected_ids)) != len(selected) or len(selected) not in (1, 6):
        raise ValueError('Invalid closed partition selection')
    emit('discovery', script=plan['script'], script_sha256=plan['source_sha256'],
         class_name=plan['class_name'], module_name=plan['module_name'],
         full_inventory=methods, selected_ids=expected_ids,
         python_version=list(sys.version_info[:3]), platform=sys.platform)

    started, stopped, terminals, identity_errors = [], [], [], []
    selected_by_identity = {id(test): test for test in selected}

    def actual_id(test):
        value = test.id()
        if not isinstance(value, str):
            raise ValueError('Unittest identity must be a string')
        return value

    def check_identity(test):
        # _ErrorHolder fixture errors must still reach the real result and log.
        if selected_by_identity.get(id(test)) is not test:
            identity_errors.append(actual_id(test))

    class PartitionResult(unittest.TextTestResult):
        def startTest(self, test):
            super().startTest(test)
            check_identity(test)
            started.append(actual_id(test))
            emit('test_start', test_id=actual_id(test))

        def stopTest(self, test):
            super().stopTest(test)
            check_identity(test)
            stopped.append(actual_id(test))
            emit('test_stop', test_id=actual_id(test))

        def terminal(self, test, outcome):
            check_identity(test)
            row = {'test_id': actual_id(test), 'outcome': outcome}
            terminals.append(row)
            emit('test_terminal', **row)

        def addSuccess(self, test):
            super().addSuccess(test)
            self.terminal(test, 'success')

        def addFailure(self, test, err):
            super().addFailure(test, err)
            self.terminal(test, 'failure')

        def addError(self, test, err):
            super().addError(test, err)
            self.terminal(test, 'error')

        def addSkip(self, test, reason):
            super().addSkip(test, reason)
            self.terminal(test, 'skip')

        def addExpectedFailure(self, test, err):
            super().addExpectedFailure(test, err)
            self.terminal(test, 'expected_failure')

        def addUnexpectedSuccess(self, test):
            super().addUnexpectedSuccess(test)
            self.terminal(test, 'unexpected_success')

        def addSubTest(self, test, subtest, outcome):
            super().addSubTest(test, subtest, outcome)
            check_identity(test)
            if outcome is not None:
                self.terminal(test, 'subtest_failure')

    emit('phase', phase='runner_start')
    runner = unittest.TextTestRunner(stream=sys.stderr, verbosity=2,
                                     resultclass=PartitionResult, failfast=False,
                                     buffer=False, tb_locals=False)
    result = runner.run(unittest.TestSuite(selected))
    # Includes real suite/class cleanup; no success summary before return.
    emit('phase', phase='runner_returned')
    summary = {'tests_run': result.testsRun, 'started_ids': started,
               'stopped_ids': stopped, 'terminal_results': terminals,
               'failures': len(result.failures), 'errors': len(result.errors),
               'skipped': len(result.skipped), 'expected_failures': len(result.expectedFailures),
               'unexpected_successes': len(result.unexpectedSuccesses),
               'was_successful': result.wasSuccessful(), 'runner_returned': True}
    emit('summary', **summary)
    expected_terminals = [{'test_id': name, 'outcome': 'success'} for name in expected_ids]
    good = (not identity_errors and result.testsRun == len(selected) and
            started == stopped == expected_ids and terminals == expected_terminals and
            not any((result.failures, result.errors, result.skipped,
                     result.expectedFailures, result.unexpectedSuccesses)) and
            result.wasSuccessful() and script.read_bytes() == before)
    return 0 if good else 1


if __name__ == '__main__':
    sys.exit(main())
