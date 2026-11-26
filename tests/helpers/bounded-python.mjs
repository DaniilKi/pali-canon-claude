// Test-only subprocess limits. No source fixture, corpus or app behavior changes.
import {spawnSync} from 'node:child_process';
import {basename} from 'node:path';

export const PYTHON_PROBE_TIMEOUT_MS = 10_000;
export const PYTHON_FIXTURE_TIMEOUT_MS = 120_000;
const OUTPUT_TAIL = 2_048;
const report = message => process.stderr.write(message + '\n');
const tail = value => String(value ?? '').slice(-OUTPUT_TAIL);

export function fixtureStage(label, stage, log = report) {
  log(`[python-fixture:${label}] ${stage}`);
}

function bounded(executable, args, options, label, {timeoutMs, maximumMs, spawn = spawnSync, log = report}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > maximumMs) {
    throw new Error(`Invalid subprocess deadline for ${label}`);
  }
  const started = Date.now();
  fixtureStage(label, `start interpreter=${basename(executable)} worker_pid=${process.pid} timeout_ms=${timeoutMs}`, log);
  const result = spawn(executable, args, {
    ...options, encoding: 'utf8', shell: false, windowsHide: true,
    // Caller options cannot disable or enlarge the independently bounded wait.
    timeout: timeoutMs, killSignal: 'SIGKILL',
  });
  const elapsed = Date.now() - started;
  fixtureStage(label, `end status=${result.status ?? 'null'} signal=${result.signal ?? 'none'} code=${result.error?.code ?? 'none'} child_pid=${result.pid ?? 'unknown'} elapsed_ms=${elapsed}`, log);
  return result;
}

function failure(label, result) {
  // Error.message can contain the command or inline script. Never print it or input.
  const error = new Error(`${label} failed: status=${result.status ?? 'null'} signal=${result.signal ?? 'none'} code=${result.error?.code ?? 'none'}\nstdout tail:\n${tail(result.stdout)}\nstderr tail:\n${tail(result.stderr)}`);
  error.code = result.error?.code ?? 'PYTHON_FIXTURE_FAILED';
  return error;
}

export function findPython({label, candidates = ['python3', 'python'], required = Boolean(process.env.CI), spawn = spawnSync, log = report} = {}) {
  for (const command of candidates) {
    const result = bounded(command, ['--version'], {maxBuffer: 64 * 1024}, `${label}:version`, {
      timeoutMs: PYTHON_PROBE_TIMEOUT_MS, maximumMs: PYTHON_PROBE_TIMEOUT_MS, spawn, log,
    });
    if (result.error?.code === 'ENOENT') continue;
    if (result.error || result.signal || result.status !== 0) throw failure(`${label}:version`, result);
    const version = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    if (!/^Python 3\.\d+\.\d+(?:[\w.+-]*)?$/.test(version)) {
      throw new Error(`${label}: a Python 3 interpreter is required`);
    }
    fixtureStage(label, `interpreter=${basename(command)} version=${version}`, log);
    return command;
  }
  if (required) throw new Error(`${label}: Python 3 is required for CI fixture validation`);
  return undefined; // Only genuinely absent commands preserve the local optional skip.
}

export function runPython(executable, args, options, label, {timeoutMs = PYTHON_FIXTURE_TIMEOUT_MS, spawn = spawnSync, log = report} = {}) {
  const result = bounded(executable, args, options, label, {
    timeoutMs, maximumMs: PYTHON_FIXTURE_TIMEOUT_MS, spawn, log,
  });
  if (result.error || result.signal || result.status !== 0) throw failure(label, result);
  return result;
}
