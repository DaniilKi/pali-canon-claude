import test from 'node:test';
import assert from 'node:assert/strict';
import {findPython, runPython, PYTHON_PROBE_TIMEOUT_MS, PYTHON_FIXTURE_TIMEOUT_MS} from './helpers/bounded-python.mjs';

const silent = () => {};
const missing = {status: null, error: {code: 'ENOENT'}};

test('Python discovery bounds version probes and falls back only for absent commands', () => {
  const calls = [];
  const found = findPython({label: 'probe-control', required: true, log: silent,
    spawn(command, args, options) {
      calls.push({command, args, options});
      return command === 'python3' ? missing : {status: 0, stdout: 'Python 3.12.10\n'};
    }});
  assert.equal(found, 'python');
  assert.deepEqual(calls.map(c => c.command), ['python3', 'python']);
  for (const call of calls) {
    assert.deepEqual(call.args, ['--version']);
    assert.equal(call.options.timeout, PYTHON_PROBE_TIMEOUT_MS);
    assert.equal(call.options.killSignal, 'SIGKILL');
    assert.equal(call.options.shell, false);
  }
});

test('a timed-out or failed version probe cannot become a missing-Python skip', () => {
  for (const result of [
    {status: null, error: {code: 'ETIMEDOUT'}},
    {status: null, signal: 'SIGKILL'},
    {status: null, error: {code: 'EACCES'}},
    {status: 1, stderr: 'probe failed'},
  ]) {
    let calls = 0;
    assert.throws(() => findPython({label: 'failed-probe', required: false, log: silent,
      spawn() { calls++; return result; }}), /failed-probe:version failed/);
    assert.equal(calls, 1);
  }
  assert.throws(() => findPython({label: 'wrong-version', log: silent,
    spawn: () => ({status: 0, stdout: 'Python 2.7.18'})}), /Python 3 interpreter/);
});

test('only local absence may skip; CI absence fails', () => {
  assert.equal(findPython({label: 'local-absence', required: false, spawn: () => missing, log: silent}), undefined);
  assert.throws(() => findPython({label: 'CI-absence', required: true, spawn: () => missing, log: silent}), /required for CI/);
});

test('migration calls preserve payload/buffer settings and cannot override their hard limit', () => {
  const input = 'SYNTHETIC_PRIVATE_INPUT';
  let observed;
  const result = runPython('python3', ['-c', 'SYNTHETIC_INLINE_SCRIPT'], {
    input, maxBuffer: 8 * 1024 * 1024, timeout: 0, killSignal: 'SIGTERM', shell: true,
  }, 'migration-control', {log: silent, spawn(command, args, options) {
    observed = {command, args, options};
    return {status: 0, stdout: 'all original assertions passed'};
  }});
  assert.equal(result.status, 0);
  assert.equal(observed.options.input, input);
  assert.equal(observed.options.maxBuffer, 8 * 1024 * 1024);
  assert.equal(observed.options.timeout, PYTHON_FIXTURE_TIMEOUT_MS);
  assert.equal(observed.options.killSignal, 'SIGKILL');
  assert.equal(observed.options.shell, false);
  assert.equal(observed.options.encoding, 'utf8');
});

test('migration failure output is bounded and omits input, inline script and native error message', () => {
  const secret = 'SYNTHETIC_PRIVATE_INPUT';
  const inline = 'SYNTHETIC_INLINE_SCRIPT';
  const logs = [];
  assert.throws(() => runPython('python3', ['-c', inline], {input: secret}, 'bounded-error', {
    log: line => logs.push(line), spawn: () => ({status: null, signal: 'SIGKILL', pid: 123,
      error: {code: 'ETIMEDOUT', message: secret + inline}, stdout: 'x'.repeat(20_000), stderr: 'y'.repeat(20_000)}),
  }), error => {
    assert.match(error.message, /bounded-error failed/);
    assert.match(error.message, /ETIMEDOUT/);
    assert.ok(error.message.length < 4_500);
    assert.ok(!error.message.includes(secret) && !error.message.includes(inline));
    return true;
  });
  assert.equal(logs.length, 2);
  assert.ok(logs.every(line => !line.includes(secret) && !line.includes(inline)));
});

test('a real blocked child terminates with failure within its selected bounded wait', () => {
  const started = Date.now();
  assert.throws(() => runPython(process.execPath, ['-e', 'setInterval(()=>{},1000)'], {}, 'real-timeout', {
    timeoutMs: 100, log: silent,
  }), error => error.code === 'ETIMEDOUT');
  assert.ok(Date.now() - started < 10_000);
});

test('a deadline cannot be disabled or enlarged beyond the fixture maximum', () => {
  for (const timeoutMs of [0, -1, Infinity, PYTHON_FIXTURE_TIMEOUT_MS + 1]) {
    assert.throws(() => runPython('unused', [], {}, 'invalid-limit', {timeoutMs, log: silent}), /Invalid subprocess deadline/);
  }
});
