"""Finite NEXT-TEN -> DD historical TEST INPUTS; never a runtime loader.

PROPOSAL ONLY. New application/runtime seals intentionally remain invalid until
an independent inventory/review seals an actual build. No environment overrides,
mtime cache, virtual root, ambient operation state or public callback injection.
"""
from collections.abc import Mapping
import copy
import gzip
import hashlib
import json
from pathlib import Path
import re
from threading import get_ident
from types import MappingProxyType

BASELINE_COMMIT = 'dd7b697df2c54308084fffd934af38130d01f952'
SOURCE_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
DD_CANON_SHA = '0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
NEXT_CANON_SHA = 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
SOURCE_ORACLE_SHA = '78fd34efd9942bb363010123f4019cfa31df3b609fbd3736d2db7288c2036655'
DIRECTORY = 'docs/evidence/apadana/boundaries-next-ten'
ORACLE_NAME = 'FUTURE_ORACLE.json'
INVENTORY_NAME = 'INDEPENDENT_NEXT_TEN_RUNTIME_INVENTORY.json'
REVIEW_NAME = 'INDEPENDENT_NEXT_TEN_RUNTIME_REVIEW.json'
INVENTORY_SHA = 'ea2b5cfb7c7a6c9216e2f33a5d1950c128b1ef50cb6c32cf929cf555b942408f'
REVIEW_SHA = 'b3197bdcc429700dee09446abd01ff08c6009d4fcaedc3f2f542429c4f497f55'
APPLICATION_COMMIT = '6ab4a322108aec740c330e4afd974ee4da808886'
PRIOR_INVENTORY_SHA = 'ba913149e9d704e1b145d1a6a195f95ad20e0d2dbc73fa6da22f16f43f492c08'
PRIOR_REVIEW_SHA = 'b9b5c3761f65defd45103b3c70cbcac37a8dce4133d9991b18063bceefaa0be9'
IDS = ('tha-ap348', 'tha-ap349', 'tha-ap374', 'tha-ap375', 'tha-ap423',
       'tha-ap424', 'tha-ap426', 'tha-ap427', 'tha-ap428', 'tha-ap429')
REVISION = 'apadana-thera-next10-v1'
DD_DATA_PATHS = ('server/data/canon.json.gz.part-0001',
                 'server/data/canon.json.gz.part-0002',
                 'server/data/canon.json.gz.parts.json',
                 'server/data/parallels.json.gz')
FIXTURE_DIRECTORY = 'tests/fixtures/canon-before-next-ten'
ALLOWED_RUNTIME_DELTA = frozenset(name.removeprefix('server/') for name in DD_DATA_PATHS) | {
    'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js'}
# Only pure complete-frame inversion is memoized AFTER fresh proofs/all27 bytes.
_VALIDATED_FRAME = None


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def _freeze(value):
    if type(value) is dict:
        return MappingProxyType({k: _freeze(v) for k, v in value.items()})
    if type(value) is list:
        return tuple(_freeze(v) for v in value)
    return value


def _physical_root(root):
    # An internal C1 scope/binding is not a public root, even if __fspath__ works.
    if not isinstance(root, (str, Path)):
        raise ValueError('Public next-ten entry requires a physical root, never a scope')
    return Path(root).absolute()  # lexical; do not resolve an authority symlink


def regular(root, relative):
    root = _physical_root(root)
    if (type(relative) is not str or not relative or relative.startswith('/')
            or any(p in ('', '.', '..') for p in relative.split('/'))
            or re.fullmatch(r'[a-zA-Z0-9_./-]+', relative) is None):
        raise ValueError('Finite next-ten relative file path required')
    if root.is_symlink() or not root.is_dir():
        raise ValueError('Next-ten authority root missing or a symlink')
    path = root
    parts = relative.split('/')
    for i, part in enumerate(parts):
        path = path / part
        if path.is_symlink():
            raise ValueError('Next-ten authority symlink refused')
        if not (path.is_file() if i == len(parts) - 1 else path.is_dir()):
            raise ValueError('Missing regular next-ten authority: ' + relative)
    return path.read_bytes()


def sealed(root, relative, pin):
    if type(pin) is not str or re.fullmatch('[a-f0-9]{64}', pin) is None:
        raise ValueError('Pending independent next-ten seal; no historical fallback')
    raw = regular(root, relative)
    if digest(raw) != pin:
        raise ValueError('Changed next-ten authority: ' + relative)
    return json.loads(raw)


def oracle(root):
    value = sealed(root, DIRECTORY + '/' + ORACLE_NAME, SOURCE_ORACLE_SHA)
    assert value['schema'] == 'independent-original-first-next-ten-source-oracle-v1'
    assert value['application_baseline_commit'] == BASELINE_COMMIT
    assert value['targets'] == list(IDS)
    assert value['index_revision'] == REVISION and value['index_revision_length'] == len(REVISION) == 23
    assert value['locator_revision'] == SOURCE_COMMIT + '-' + REVISION
    assert value['locator_revision_length'] == 64
    assert value['old_canonical_logical_sha256'] == DD_CANON_SHA
    assert value['future_canonical_logical_sha256'] == NEXT_CANON_SHA
    assert [row['id'] for row in value['records']] == list(IDS)
    for row in value['records']:
        for field in ('before', 'after'):
            assert digest(compact(row[field])) == row[field + '_object_sha256']
            assert row[field]['id'] == row['id']
        assert row['after']['index_revision'] == REVISION
    assert set(value['original_sources']) == {'36', '37'}
    for book in value['original_sources'].values():
        assert book['VRI_commit'] == SOURCE_COMMIT
        assert book['full_original_tuple_equality_current'] is True
    return value


def ten_state(canon, root):
    expected = oracle(root)
    if canon.get('source', {}).get('commit') != SOURCE_COMMIT:
        raise ValueError('Reviewed next-ten VRI source required')
    observed = {}
    for uid in IDS:
        rows = [u for u in canon['units'] if u.get('id') == uid]
        if len(rows) != 1:
            raise ValueError('Missing or duplicate next-ten record')
        observed[uid] = rows[0]
    typed = lambda x: json.dumps(x, ensure_ascii=False, sort_keys=True)
    for state, field in (('old', 'before'), ('new', 'after')):
        if typed(observed) == typed({r['id']: r[field] for r in expected['records']}):
            return state
    raise ValueError('Mixed or unreviewed next-ten record state')


def canon_before_next_ten(canon, root):
    """Pure finite inverse; unrelated mutations survive for negative assertions."""
    ten_state(canon, root)
    previous = {r['id']: r['before'] for r in oracle(root)['records']}
    return {**canon, 'units': [copy.deepcopy(previous[u['id']]) if u.get('id') in previous else u
                              for u in canon['units']]}


def exact_dd_canon_bytes(raw, root):
    oracle(root)  # physical independent source proof, including warm paths
    if type(raw) is not bytes or digest(raw) != NEXT_CANON_SHA:
        raise ValueError('Exact complete NEXT-TEN canonical bytes required')
    canon = json.loads(raw)
    assert ten_state(canon, root) == 'new'
    old = compact(canon_before_next_ten(canon, root))
    if digest(old) != DD_CANON_SHA:
        raise ValueError('Complete next-ten inverse differs from frozen DD canon')
    return old


def dd_logical_input(raw, root):
    """Explicit genuine DD logical test frame OR exact full next-ten input."""
    oracle(root)
    if type(raw) is bytes and digest(raw) == DD_CANON_SHA:
        return raw
    return exact_dd_canon_bytes(raw, root)


def prior_dd_records(root):
    # Lazy import only avoids an import cycle. This is the preserved prior proof
    # reader, never a supplied callback or the old physical data capture.
    from web_reader_six_boundary_history import proof_records
    return proof_records(_physical_root(root))


def proof_records(root):
    root = _physical_root(root)
    expected = oracle(root)
    previous = prior_dd_records(root)
    inv = sealed(root, DIRECTORY + '/runtime/' + INVENTORY_NAME, INVENTORY_SHA)
    rev = sealed(root, DIRECTORY + '/runtime/' + REVIEW_NAME, REVIEW_SHA)
    assert inv['schema'] == 'independent-reviewed-next-ten-runtime-inventory-v1'
    assert rev['schema'] == 'reviewed-next-ten-runtime-approval-v1'
    assert rev['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_SOURCE_SCOPE_ONLY'
    if re.fullmatch('[a-f0-9]{40}', APPLICATION_COMMIT) is None:
        raise ValueError('Pending independently reviewed next-ten application commit')
    assert inv['baseline_commit'] == rev['baseline'] == BASELINE_COMMIT
    assert inv['candidate_commit'] == rev['candidate_commit'] == APPLICATION_COMMIT
    assert inv['prior_six_inventory_sha256'] == rev['prior_six_inventory_sha256'] == PRIOR_INVENTORY_SHA
    assert rev['prior_six_review_sha256'] == PRIOR_REVIEW_SHA
    assert rev['independent_inventory'] == {'file': INVENTORY_NAME, 'sha256': INVENTORY_SHA}
    assert inv['old_canon_logical_sha256'] == rev['old_canon_logical_sha256'] == DD_CANON_SHA
    assert inv['new_canon_logical_sha256'] == rev['new_canon_logical_sha256'] == NEXT_CANON_SHA
    assert inv['new_canon_logical_sha256'] == expected['future_canonical_logical_sha256']
    assert inv['source_oracle_sha256'] == rev['source_oracle_sha256'] == SOURCE_ORACLE_SHA
    assert inv['behavioral_or_release_approval'] is False
    for flag in ('inventory_only', 'runtime_inventory_approval', 'finite_source_diff_approval'):
        assert rev[flag] is True
    assert rev['behavioral_harness_approval'] is rev['release_or_push_approval'] is False
    files = inv['files']
    assert files == rev['files'] and set(files) == set(previous)
    assert len(files) == inv['runtime_files'] == rev['runtime_files'] == 34
    for name, record in files.items():
        assert type(name) is str and not name.startswith('/') and '..' not in name.split('/')
        assert set(record) == {'bytes', 'sha256'}
        assert type(record['bytes']) is int and record['bytes'] > 0
        assert type(record['sha256']) is str and re.fullmatch('[a-f0-9]{64}', record['sha256'])
    delta = [name for name in sorted(files) if files[name] != previous[name]]
    assert delta == inv['allowed_changed_paths'] == rev['allowed_changed_paths_from_dd']
    assert set(delta) <= ALLOWED_RUNTIME_DELTA
    assert len(delta) == len(set(delta))
    assert inv['unchanged_paths'] == rev['unchanged_runtime_paths'] == 34 - len(delta)
    assert 'data/canon.json.gz.parts.json' in delta
    assert any(name.startswith('data/canon.json.gz.part-') for name in delta)
    assert {'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js'} <= set(delta)
    data = sorted(name for name in files if name.startswith('data/'))
    assert len(data) == 27
    assert {name for name in delta if name.startswith('data/')} <= {p.removeprefix('server/') for p in DD_DATA_PATHS}
    # Everything except the finite canonical/parallel inputs remains byte-exact.
    for name in data:
        if 'server/' + name not in DD_DATA_PATHS:
            assert files[name] == previous[name]
    return files


def _packed(data, records):
    manifest = json.loads(data['server/data/canon.json.gz.parts.json'])
    assert manifest['version'] == 1
    assert [p['file'] for p in manifest['parts']] == ['canon.json.gz.part-0001', 'canon.json.gz.part-0002']
    chunks = []
    for part in manifest['parts']:
        raw = data['server/data/' + part['file']]
        assert type(part['size']) is int and len(raw) == part['size']
        assert {'bytes': len(raw), 'sha256': part['sha256']} == records['data/' + part['file']]
        chunks.append(raw)
    packed = b''.join(chunks)
    assert len(packed) == manifest['size'] and digest(packed) == manifest['sha256']
    return packed


class _NextTenBinding:
    """Owned by exactly one private operation; not a path or public root token."""
    __slots__ = ('_root', '_records', '_actual', '_owner', '_active')

    def __init__(self, root, records, actual):
        object.__setattr__(self, '_root', _physical_root(root))
        object.__setattr__(self, '_records', _freeze(records))
        object.__setattr__(self, '_actual', MappingProxyType(dict(actual)))
        object.__setattr__(self, '_owner', get_ident())
        object.__setattr__(self, '_active', True)

    def __setattr__(self, name, value):
        raise AttributeError('Next-ten operation binding is immutable')

    def _check(self):
        if not self._active or self._owner != get_ident():
            raise ValueError('Closed or foreign-thread next-ten binding')

    def _close(self):
        object.__setattr__(self, '_active', False)
        object.__setattr__(self, '_records', MappingProxyType({}))
        object.__setattr__(self, '_actual', MappingProxyType({}))


class _CapturedDDData(Mapping):
    """Finite immutable DD buffers plus explicit non-path new-source binding."""
    __slots__ = ('_data', '_binding')

    def __init__(self, data, binding):
        object.__setattr__(self, '_data', MappingProxyType(dict(data)))
        object.__setattr__(self, '_binding', binding)

    def __setattr__(self, name, value):
        raise AttributeError('Captured DD input is immutable')

    def __len__(self):
        return len(self._data)

    def __iter__(self):
        return iter(self._data)

    def __getitem__(self, key):
        return self._data[key]


def _binding_records(binding, root):
    if type(binding) is not _NextTenBinding:
        raise ValueError('Exact private next-ten binding required')
    binding._check()
    if _physical_root(root) != binding._root:
        raise ValueError('Next-ten operation root identity changed')
    observed = proof_records(binding._root)  # physical proofs; NEVER rescan27
    assert observed == binding._records
    return observed


def _capture_six_test_input(root):
    """One physical all27 read/hash, then exact finite DD test-input buffers."""
    global _VALIDATED_FRAME
    root = _physical_root(root)
    current = proof_records(root)
    previous = prior_dd_records(root)
    actual = {}
    identity = []
    for name in sorted(n for n in current if n.startswith('data/')):
        raw = regular(root, 'server/' + name)
        checksum = digest(raw)
        assert {'bytes': len(raw), 'sha256': checksum} == current[name]
        identity.append(checksum)
        actual['server/' + name] = raw
    assert len(actual) == 27 and all(type(raw) is bytes for raw in actual.values())
    # No old-actual fallback: every actual data byte must match the new inventory.
    dd = dict(actual)
    for name in DD_DATA_PATHS:
        raw = regular(root, FIXTURE_DIRECTORY + '/' + Path(name).name)
        checksum = digest(raw)
        assert {'bytes': len(raw), 'sha256': checksum} == previous[name.removeprefix('server/')]
        identity.append(checksum)
        dd[name] = raw
    key = (SOURCE_ORACLE_SHA, INVENTORY_SHA, REVIEW_SHA, *identity)
    if key != _VALIDATED_FRAME:
        exact_dd_canon_bytes(gzip.decompress(_packed(actual, current)), root)
        dd_logical = gzip.decompress(_packed(dd, previous))
        assert digest(dd_logical) == DD_CANON_SHA
        # Run the preserved exact DD -> C1 logical authority, never its old
        # physical capture (which would read actual next files against DD pins).
        from web_reader_six_boundary_history import _historical_dd_exact_c1_canon_bytes
        _historical_dd_exact_c1_canon_bytes(dd_logical, root)
        _VALIDATED_FRAME = key
    # Non-core records equal previous and were already physically hashed above;
    # four frozen DD fixtures were independently hashed once at their read.
    binding = _NextTenBinding(root, current, actual)
    return previous, _CapturedDDData(dd, binding)


def _capture_binding(actual, root):
    if type(actual) is not _CapturedDDData:
        raise ValueError('Exact next-ten captured DD input required')
    _binding_records(actual._binding, root)
    return actual._binding


def _release_binding(binding):
    if type(binding) is not _NextTenBinding:
        raise ValueError('Exact private next-ten binding required')
    binding._close()


def _runtime_records(binding, root, previous):
    # The preserved older chain is evaluated first; only then expose ACTUAL new34.
    assert previous == prior_dd_records(root)
    return _binding_records(binding, root)


def _fixture_names(root):
    proof_records(root)  # all runtime placeholders fail closed before fixture copy
    return (DIRECTORY + '/' + ORACLE_NAME,
            DIRECTORY + '/runtime/' + INVENTORY_NAME,
            DIRECTORY + '/runtime/' + REVIEW_NAME,
            *(FIXTURE_DIRECTORY + '/' + Path(name).name for name in DD_DATA_PATHS))


def _actual_copy_input(binding, root, name):
    _binding_records(binding, root)
    if name not in binding._actual:
        raise ValueError('Copy input outside captured actual27')
    return binding._actual[name]


def assert_next_ten_current_canonical_data(root):
    """Public gate: fresh real27 capture on every call, no old-actual fallback."""
    _, actual = _capture_six_test_input(root)
    try:
        return _binding_records(actual._binding, root)
    finally:
        _release_binding(actual._binding)
