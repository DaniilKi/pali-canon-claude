"""UNEXECUTED, diagnostic-only phase observer; no fixture values are recorded."""
import os
import sys

if (os.environ.get('PALI_SCOPE_PHASE_ENABLED') == '1'
        and os.path.basename(sys.argv[0]) == 'six_operation_scope_controls.py'):
    import atexit, functools, json, threading, time, unittest
    _dir = os.environ.get('PALI_SCOPE_PHASE_DIRECTORY', '')
    _file = os.path.join(_dir, 'phase.raw.jsonl')
    _origin = time.perf_counter_ns()
    _lock = threading.Lock()
    _seq, _broken, _seen = 0, False, False
    _proof = [0, 0]
    _cases = {
        'test_01_verified_immutable_original_bytes_within_one_operation': 'test_01',
        'test_02_public_gates_reject_active_and_closed_internal_scopes': 'test_02',
        'test_03_exception_closes_and_prevents_escaped_reuse': 'test_03',
        'test_04_new_public_calls_recheck_actual_data_despite_same_size_and_mtime': 'test_04',
        'test_05_mandatory_proofs_are_physical_even_inside_a_valid_operation': 'test_05',
        'test_06_every_original_fixture_is_verified_before_operation_use': 'test_06',
        'test_07_mutation_after_capture_never_survives_the_next_operation': 'test_07',
    }
    _phases = {'observer', 'class_setup', 'class_teardown',
               'helper_current368', 'helper_old359', *_cases.values()}

    def _error():
        global _broken
        _broken = True
        try:
            with open(os.path.join(_dir, 'observer-error.marker'), 'xb') as marker:
                marker.write(b'observer_failed\n')
        except Exception:
            pass

    def _emit(event, phase, duration=None, returned=None):
        global _seq
        try:
            with _lock:
                if _broken:
                    return
                if (_seq >= 128 or phase not in _phases or not os.path.isabs(_dir)
                        or not os.path.isdir(_dir) or os.path.islink(_dir) or os.path.islink(_file)):
                    raise ValueError('Unavailable bounded observer')
                row = {'schema':'scope-phase-v1', 'seq':_seq, 'event':event, 'phase':phase,
                       'elapsed_ns':time.perf_counter_ns()-_origin, 'duration_ns':duration,
                       'returned':returned, 'proof_calls':_proof[0], 'proof_ns':_proof[1]}
                raw = (json.dumps(row, separators=(',', ':'))+'\n').encode('ascii')
                if len(raw) > 1024:
                    raise ValueError('Row bound')
                fd = os.open(_file, os.O_WRONLY|os.O_CREAT|os.O_APPEND|getattr(os,'O_BINARY',0), 0o600)
                try:
                    if os.fstat(fd).st_size+len(raw) > 131072:
                        raise ValueError('File bound')
                    pending = memoryview(raw)
                    while pending:
                        written = os.write(fd, pending)
                        if written <= 0:
                            raise OSError('Incomplete observer write')
                        pending = pending[written:]
                finally:
                    os.close(fd)
                _seq += 1
        except Exception:
            _error()

    def _timed(phase, operation):
        _emit('start', phase)
        start, returned = time.perf_counter_ns(), False
        try:
            value = operation()
            returned = True
            return value
        finally:
            _emit('end', phase, time.perf_counter_ns()-start, returned)

    def _target(cls):
        return getattr(cls,'__name__',None)=='SixOperationScopeControls' and getattr(cls,'__module__',None)=='__main__'

    def _helper(original, phase):
        @functools.wraps(original)
        def observed(*args, **kwargs):
            return _timed(phase, lambda: original(*args, **kwargs))
        return observed

    def _aggregate(original):
        @functools.wraps(original)
        def observed(*args, **kwargs):
            with _lock:
                _proof[0] += 1
            start = time.perf_counter_ns()
            try:
                return original(*args, **kwargs)
            finally:
                with _lock:
                    _proof[1] += time.perf_counter_ns()-start
        return observed

    _setup_original = unittest.TestSuite._handleClassSetUp
    _teardown_original = unittest.TestSuite._tearDownPreviousClass
    _run_original = unittest.TestCase.run

    def _setup(suite, test, result):
        global _seen
        cls = type(test)
        if not _target(cls) or _seen:
            return _setup_original(suite, test, result)
        _seen = True
        try:
            for name, phase in (('_assert_current368_operation_proof_bytes','helper_current368'),
                                ('_assert_old359_operation_proof_bytes','helper_old359')):
                setattr(cls, name, _helper(cls.__dict__[name], phase))
            module = sys.modules['web_reader_next_ten_boundary_history']
            module.proof_records = _aggregate(module.proof_records)
        except Exception:
            _error()
        return _timed('class_setup', lambda: _setup_original(suite, test, result))

    def _teardown(suite, test, result):
        previous = getattr(result, '_previousTestClass', None)
        if _target(previous) and type(test) is not previous:
            return _timed('class_teardown', lambda: _teardown_original(suite, test, result))
        return _teardown_original(suite, test, result)

    def _run(case, result=None):
        if not _target(type(case)):
            return _run_original(case, result)
        phase = _cases.get(case._testMethodName)
        if phase is None:
            _error()
            return _run_original(case, result)
        return _timed(phase, lambda: _run_original(case, result))

    unittest.TestSuite._handleClassSetUp = _setup
    unittest.TestSuite._tearDownPreviousClass = _teardown
    unittest.TestCase.run = _run
    atexit.register(lambda: _emit('exit', 'observer'))
    _emit('ready', 'observer')
