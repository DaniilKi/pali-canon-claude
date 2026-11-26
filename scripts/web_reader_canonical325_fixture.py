"""Test-only exact104 snapshot for the four historical canonical325 cases.

No network, rebuild, current-runtime fallback or source execution is performed.
The caller retains the returned TemporaryDirectory for the test-module lifetime.
All runtime bytes come from the fixed Git commit and match the old sealed oracle.
"""
import atexit
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tempfile
import time

from web_reader_approved_acceptance import (
    reviewed_canonical325_runtime, assert_runtime_records)

PIN = '104b57a6891ddae645c51e39eb3d27b89b64ffdf'
INVENTORY = 'docs/evidence/apadana/canonical325/CANONICAL_RUNTIME_INVENTORY.json'
INVENTORY_SHA = '11b2d9865505b2cd09812deadb0bf77c891edde783054c4e2bd4fe34900d4b84'
FIXTURE_SECONDS = 20
GIT_CALL_SECONDS = 5
RUNTIME_PATHS = ('THIRD_PARTY_LICENSES.txt',
 'data/anandajoti.json',
 'data/apadana.json',
 'data/bmc.json',
 'data/canon.json.gz.part-0001',
 'data/canon.json.gz.part-0002',
 'data/canon.json.gz.parts.json',
 'data/commentary.json.gz.part-0001',
 'data/commentary.json.gz.part-0002',
 'data/commentary.json.gz.part-0003',
 'data/commentary.json.gz.parts.json',
 'data/dhamma_lists.json',
 'data/dpd.json.gz.part-0001',
 'data/dpd.json.gz.part-0002',
 'data/dpd.json.gz.parts.json',
 'data/dppn.json',
 'data/glossary.json.gz',
 'data/parallels.json.gz',
 'data/postcanonical.json.gz.part-0001',
 'data/postcanonical.json.gz.part-0002',
 'data/postcanonical.json.gz.part-0003',
 'data/postcanonical.json.gz.part-0004',
 'data/postcanonical.json.gz.parts.json',
 'data/reviewed-ati-sections.json',
 'data/reviewed-partial-pages.json',
 'data/source-notes.json',
 'data/topics.json',
 'data/translations.json',
 'http-worker.cjs',
 'http.cjs',
 'index.cjs',
 'web/index.html',
 'web/reader.css',
 'web/reader.js')
PROOF_FILES = {'tests/fixtures/reviewed-runtime-2449.json': 'cd6fd0af3f72c8e907130dd40aec4660e2ce8b8155ec7959a178e59517c53080',
 'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json': 'af30339018c4843e4da2599fcabf25797173c58398123dc365ad09f6a2ced00f',
 'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json': '42ccdcd9bfa168df83cfa13b4d0a4c7b121f726a117b31e1a15d7fba952b230c',
 'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json': '809efc477aec7bd16c6d5077114ba5932663ecf110076899f9dc5ef85917519f',
 'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json': '57c3b1c4efdc5b75b9718f77259c5ef4ee25a85e15b257f6f64b8235f3a71daf',
 'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json': '3d2a7460cf2a94f1acaa8fbdc49fc359139f574da04510fa6e460e8c1dab3765',
 'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json': 'bae09c75ce5bb5d90e62044b60f5ac468e0c3c0569484117e28f938720aabf09',
 'docs/evidence/apadana/canonical325/CANONICAL_RUNTIME_INVENTORY.json': '11b2d9865505b2cd09812deadb0bf77c891edde783054c4e2bd4fe34900d4b84',
 'docs/evidence/apadana/canonical325/CANONICAL_BUILD_REVIEW.json': 'fc062462c6c6c7e98a285cc833cc1bd59e0a0c47b851b8066f257efc95b85908'}


def _record(raw):
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def _relative(name):
    path = PurePosixPath(name)
    assert isinstance(name, str) and name and not path.is_absolute()
    assert str(path) == name and '..' not in path.parts and '\\' not in name
    assert ':' not in name and '\x00' not in name, 'Historical fixture path must be portable'
    return path


def _git(source_root, arguments, deadline, label):
    remaining = deadline - time.monotonic()
    assert remaining > 0, 'Historical canonical325 fixture deadline before ' + label
    # Object reads must never trigger a lazy fetch, credential prompt or replace ref.
    # Denying every Git transport also fails closed on Git versions without lazy-fetch control.
    environment = dict(os.environ)
    environment.update(GIT_NO_LAZY_FETCH='1', GIT_ALLOW_PROTOCOL='',
                       GIT_OPTIONAL_LOCKS='0', GIT_NO_REPLACE_OBJECTS='1',
                       GIT_TERMINAL_PROMPT='0')
    try:
        result = subprocess.run(['git', '--no-pager', *arguments], cwd=source_root,
            env=environment, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            timeout=min(GIT_CALL_SECONDS, remaining), check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise AssertionError('Historical canonical325 Git read failed or timed out: ' + label) from None
    assert result.returncode == 0, ('Historical canonical325 Git object unavailable: '
        + label + ' (exit ' + str(result.returncode) + ')')
    return result.stdout


def assert_historical_runtime(root, server_dir):
    root, server_dir = Path(root), Path(server_dir)
    assert server_dir == root / 'server', 'Historical runtime must use its explicit fixture root'
    expected = reviewed_canonical325_runtime(root)
    assert tuple(sorted(expected)) == RUNTIME_PATHS and len(expected) == 34
    assert server_dir.is_dir() and not server_dir.is_symlink()
    observed = {}
    for path in sorted(server_dir.rglob('*')):
        assert not path.is_symlink(), 'Historical runtime symlink refused'
        if path.is_file():
            observed[path.relative_to(server_dir).as_posix()] = _record(path.read_bytes())
        else:
            assert path.is_dir(), 'Historical runtime nonregular path refused'
    assert_runtime_records(observed, expected)
    return observed


def materialize_canonical325(source_root):
    """Materialize once per importing historical test module, or fail without fallback."""
    source_root = Path(source_root)
    deadline = time.monotonic() + FIXTURE_SECONDS
    expected = reviewed_canonical325_runtime(source_root)
    assert tuple(sorted(expected)) == RUNTIME_PATHS and len(expected) == 34
    inventory_raw = (source_root / INVENTORY).read_bytes()
    assert hashlib.sha256(inventory_raw).hexdigest() == INVENTORY_SHA
    assert json.loads(inventory_raw)['files'] == expected
    _git(source_root, ['cat-file', '-e', PIN + '^{commit}'], deadline, 'fixed104 commit')
    temporary = tempfile.TemporaryDirectory(prefix='pali-canonical325-104-')
    historical = Path(temporary.name)
    try:
        # Copy only the nine original proofs, each with its immutable expected seal.
        for name, digest in PROOF_FILES.items():
            relative = _relative(name)
            raw = (source_root / relative).read_bytes()
            assert hashlib.sha256(raw).hexdigest() == digest, 'Historical proof changed: ' + name
            target = historical / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
        assert reviewed_canonical325_runtime(historical) == expected
        # One bounded Git-show pass across34paths, not one pass per test method.
        for name in RUNTIME_PATHS:
            relative = _relative(name)
            raw = _git(source_root, ['show', PIN + ':server/' + name], deadline, name)
            assert _record(raw) == expected[name], 'Historical104 runtime bytes changed: ' + name
            target = historical / 'server' / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(raw)
        assert_historical_runtime(historical, historical / 'server')
        assert time.monotonic() < deadline, 'Historical canonical325 fixture deadline'
    except BaseException:
        temporary.cleanup()
        raise
    atexit.register(temporary.cleanup)
    return temporary
