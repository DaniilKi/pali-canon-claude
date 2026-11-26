"""Finite TEST-INPUT history only; production/runtime responses are never rewritten."""
import copy
from contextlib import contextmanager
from types import MappingProxyType
from threading import get_ident
import gzip
import hashlib
import json
import re
from pathlib import Path

BASELINE_COMMIT = 'c1b2433481399b2125f6645a75bf4105cb212440'
SOURCE_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
C1_CANON_SHA = '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8'
SOURCE_ORACLE_SHA = '01bc011f958165274ce1a09850dd5cbe4f495a14242c7b96e3fd4ab0e152c397'
FUTURE_CANON_SHA = '0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
INDEPENDENT_SIX_INVENTORY_SHA = 'ba913149e9d704e1b145d1a6a195f95ad20e0d2dbc73fa6da22f16f43f492c08'
INDEPENDENT_SIX_REVIEW_SHA = 'b9b5c3761f65defd45103b3c70cbcac37a8dce4133d9991b18063bceefaa0be9'
APPLICATION_COMMIT = 'd2462e46b1a7b5cb2a1085d9bcffd25b7576c8b6'
RUNTIME_DELTA = ('data/canon.json.gz.part-0002', 'data/canon.json.gz.parts.json', 'data/parallels.json.gz', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js')
PRIOR343_INVENTORY_SHA = '5ca203134b2a4b553f84fe0c97487698f687eaa4ac3cd839c2378ab35d9b2405'
PRIOR343_REVIEW_SHA = 'd6bb630dd6939f5688f041695d6ef61d15ea694c95c27198ac6881f17e02539e'
C1_METADATA_SHA = 'ff3f60a460fe1648558e095adf0ceab5865dd6d1c2e1b00f1515aa80ed5bf076'
PROOF_DIRECTORY = 'docs/evidence/apadana/boundaries340-347'
ORACLE_NAME = 'FUTURE_ORACLE.json'
INVENTORY_NAME = 'INDEPENDENT_SIX_RUNTIME_INVENTORY.json'
REVIEW_NAME = 'INDEPENDENT_SIX_RUNTIME_REVIEW.json'
IDS = ('tha-ap340','tha-ap341','tha-ap343','tha-ap344','tha-ap346','tha-ap347')
REVISION = 'apadana-thera340-341-343-344-346-347-v1'
C1_DATA_PATHS = ('server/data/canon.json.gz.part-0001','server/data/canon.json.gz.part-0002',
                 'server/data/canon.json.gz.parts.json','server/data/parallels.json.gz')
_VALIDATED_CONTENT = None


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def regular(root, relative):
    parts = Path(relative).parts
    if not parts or Path(relative).is_absolute() or any(p in ('..','.') for p in parts):
        raise ValueError('Finite regular-file path required')
    path = Path(root)
    if path.is_symlink():
        raise ValueError('Six-history acceptance refuses symlink root')
    if not path.is_dir():
        raise ValueError('Missing mandatory six-history root directory')
    for part in parts:
        path = path / part
        if path.is_symlink():
            raise ValueError('Six-history acceptance refuses symlink inputs')
    if not path.is_file():
        raise ValueError('Missing mandatory six-history input: ' + relative)
    return path.read_bytes()


def sealed(root, relative, pin):
    if not isinstance(pin, str) or re.fullmatch('[a-f0-9]{64}', pin) is None:
        raise ValueError('Pending independent six-boundary seal; no fallback')
    raw = regular(root, relative)
    if digest(raw) != pin:
        raise ValueError('Six-boundary authority changed: ' + relative)
    return json.loads(raw)


def oracle(root):
    value = sealed(root, PROOF_DIRECTORY + '/' + ORACLE_NAME, SOURCE_ORACLE_SHA)
    assert value['schema'] == 'independent-original-first-six-boundary-future-oracle-v1'
    assert value['targets'] == list(IDS)
    assert value['index_revision'] == REVISION and len(REVISION) == value['index_revision_length'] == 39
    assert value['old_canonical_logical_sha256'] == C1_CANON_SHA
    assert re.fullmatch('[a-f0-9]{64}', FUTURE_CANON_SHA or '')
    assert value['future_canonical_logical_sha256'] == FUTURE_CANON_SHA
    assert value['original_xml']['VRI_commit'] == SOURCE_COMMIT
    assert value['original_xml']['retained_tuples'] == 14645
    assert value['original_xml']['all_original_tuples_equal_C1_book'] is True
    assert [r['id'] for r in value['records']] == list(IDS)
    for row in value['records']:
        assert digest(compact(row['before'])) == row['before_object_sha256']
        assert digest(compact(row['future'])) == row['future_object_sha256']
        assert row['future']['index_revision'] == REVISION
    return value


def six_state(canon, root=None):
    root = Path(root) if root is not None else Path(__file__).resolve().parents[1]
    expected = oracle(root)
    if canon.get('source',{}).get('commit') != SOURCE_COMMIT:
        raise ValueError('Reviewed VRI source required')
    observed = {}
    for uid in IDS:
        rows = [u for u in canon['units'] if u.get('id') == uid]
        if len(rows) != 1:
            raise ValueError('Missing or duplicate reviewed six-poem unit')
        observed[uid] = rows[0]
    typed = lambda x: json.dumps(x, ensure_ascii=False, sort_keys=True)
    for state, field in (('old','before'),('new','future')):
        if typed(observed) == typed({r['id']:r[field] for r in expected['records']}):
            return state
    raise ValueError('Mixed or unreviewed six-poem metadata')


def canon_before_six(canon, root=None):
    """Pure inverse retains unrelated mutations; never migrates saved locators."""
    root = Path(root) if root is not None else Path(__file__).resolve().parents[1]
    six_state(canon, root)
    previous = {row['id']:row['before'] for row in oracle(root)['records']}
    return {**canon, 'units':[copy.deepcopy(previous[u['id']]) if u.get('id') in previous else u
                             for u in canon['units']]}


def exact_c1_canon_bytes(raw, root=None):
    root = Path(root) if root is not None else Path(__file__).resolve().parents[1]
    expected = oracle(root)
    if digest(raw) != expected['future_canonical_logical_sha256']:
        raise ValueError('Exact complete future canonical bytes required')
    current = json.loads(raw)
    if six_state(current, root) != 'new':
        raise ValueError('Exact all-new six-poem state required')
    old = compact(canon_before_six(current, root))
    if digest(old) != C1_CANON_SHA:
        raise ValueError('Six-record inverse differs from immutable C1 canon')
    return old


def c1_logical_input(raw, root=None):
    """Explicit genuine C1 frame OR strict complete future input, never mutation fallback."""
    if digest(raw) == C1_CANON_SHA:
        return raw
    return exact_c1_canon_bytes(raw, root)


def parent343_records(root):
    inv = sealed(root, 'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_INVENTORY.json', PRIOR343_INVENTORY_SHA)
    rev = sealed(root, 'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json', PRIOR343_REVIEW_SHA)
    assert inv['files'] == rev['files'] and len(inv['files']) == 34
    assert inv['candidate_commit'] == rev['candidate_commit'] == 'b09de6af4787792e55e8dc706d0aa7b0ebdd26fa'
    return inv['files']


def proof_records(root):
    expected = oracle(root)
    previous = parent343_records(root)
    baseline = sealed(root, PROOF_DIRECTORY + '/C1_IMMUTABLE_EXPECTATIONS.json', C1_METADATA_SHA)
    assert baseline['base_commit'] == BASELINE_COMMIT
    assert baseline['logical_canonical_sha256'] == C1_CANON_SHA
    assert baseline['runtime34_original_c1_records'] == previous
    assert len(baseline['ids']) == len(set(baseline['ids'])) == 343
    inv = sealed(root, PROOF_DIRECTORY + '/runtime/' + INVENTORY_NAME, INDEPENDENT_SIX_INVENTORY_SHA)
    rev = sealed(root, PROOF_DIRECTORY + '/runtime/' + REVIEW_NAME, INDEPENDENT_SIX_REVIEW_SHA)
    assert inv['schema'] == 'independent-reviewed-six-boundary-runtime-inventory-v1'
    assert rev['schema'] == 'reviewed-six-boundary-runtime-approval-v1'
    assert rev['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_SOURCE_SCOPE_ONLY'
    assert re.fullmatch('[a-f0-9]{40}', APPLICATION_COMMIT or '')
    assert inv['baseline_commit'] == rev['baseline'] == BASELINE_COMMIT
    assert inv['candidate_commit'] == rev['candidate_commit'] == APPLICATION_COMMIT
    assert inv['prior343_inventory_sha256'] == rev['prior343_inventory_sha256'] == PRIOR343_INVENTORY_SHA
    assert rev['prior343_review_sha256'] == PRIOR343_REVIEW_SHA
    assert rev['independent_inventory'] == {'file':INVENTORY_NAME,'sha256':INDEPENDENT_SIX_INVENTORY_SHA}
    assert inv['old_canon_logical_sha256'] == rev['old_canon_logical_sha256'] == C1_CANON_SHA
    assert inv['new_canon_logical_sha256'] == rev['new_canon_logical_sha256'] == expected['future_canonical_logical_sha256']
    assert inv['source_oracle_sha256'] == rev['source_oracle_sha256'] == SOURCE_ORACLE_SHA
    assert rev['inventory_only'] is rev['runtime_inventory_approval'] is rev['finite_source_diff_approval'] is True
    assert inv['behavioral_or_release_approval'] is rev['behavioral_harness_approval'] is rev['release_or_push_approval'] is False
    files = inv['files']
    assert set(files) == set(previous) and files == rev['files']
    assert len(files) == inv['runtime_files'] == rev['runtime_files'] == 34
    delta = [k for k in sorted(files) if files[k] != previous[k]]
    assert delta == list(RUNTIME_DELTA) == inv['allowed_changed_paths'] == rev['allowed_changed_paths_from_c1']
    assert inv['unchanged_paths'] == rev['unchanged_runtime_paths'] == 34 - len(delta)
    assert [k for k in delta if k.startswith('data/')] == [p.removeprefix('server/') for p in C1_DATA_PATHS if files[p.removeprefix('server/')] != previous[p.removeprefix('server/')]]
    for k,row in files.items():
        assert not Path(k).is_absolute() and '..' not in Path(k).parts
        assert set(row) == {'bytes','sha256'} and type(row['bytes']) is int and row['bytes'] > 0
        assert re.fullmatch('[a-f0-9]{64}',row['sha256'])
    for k in ('data/apadana.json','data/source-notes.json',*[k for k in previous if k.startswith('data/commentary.')]):
        assert files[k] == previous[k]
    return files


def six_runtime_records(root, previous):
    # Caller evaluates preserved approved343_runtime, including all older seals.
    assert previous == parent343_records(root)
    return proof_records(root)


def _capture_actual_data(root):
    global _VALIDATED_CONTENT
    _reject_c1_scope(root)
    records = proof_records(root)
    actual = {}
    keys = []
    data = sorted(name for name in records if name.startswith('data/'))
    assert len(data) == 27, 'All26 nonAP data plus preservedAP data before history'
    for name in data:
        raw = regular(root,'server/'+name)
        checksum = digest(raw)
        assert {'bytes':len(raw),'sha256':checksum} == records[name]
        keys.append(checksum)
        actual['server/'+name] = raw
    manifest = json.loads(actual['server/data/canon.json.gz.parts.json'])
    assert manifest['version'] == 1
    assert [p['file'] for p in manifest['parts']] == ['canon.json.gz.part-0001','canon.json.gz.part-0002']
    chunks = []
    for part in manifest['parts']:
        raw = actual['server/data/'+part['file']]
        assert type(part['size']) is int and len(raw) == part['size'] and digest(raw) == part['sha256']
        chunks.append(raw)
    packed = b''.join(chunks)
    assert len(packed) == manifest['size'] and digest(packed) == manifest['sha256']
    key = (SOURCE_ORACLE_SHA,INDEPENDENT_SIX_INVENTORY_SHA,INDEPENDENT_SIX_REVIEW_SHA,*keys)
    if key != _VALIDATED_CONTENT:
        exact_c1_canon_bytes(gzip.decompress(packed),root)
        _VALIDATED_CONTENT = key
    return records, actual


def assert_six_current_canonical_data(root):
    """Every genuine public call validates fresh proofs and all27 actual data."""
    _reject_c1_scope(root)
    return _capture_actual_data(root)[0]


def _assert_six_current_canonical_data(root):
    if isinstance(root, _C1OperationScope):
        return _scope_records(root)
    return assert_six_current_canonical_data(root)


def historical_c1_data_bytes(root, name):
    """Public getter never accepts a carried/escaped operation scope."""
    _reject_c1_scope(root)
    if name not in C1_DATA_PATHS:
        return regular(root,name)
    with _c1_operation_scope(root) as scoped:
        return _historical_c1_data_bytes(scoped,name)


def _historical_c1_data_bytes(root, name):
    """Private old-chain input reader; not a public token/callback API."""
    if not isinstance(root, _C1OperationScope):
        return historical_c1_data_bytes(root,name)
    _scope_records(root)  # source/runtime/C1 proof files are ALWAYS reread.
    if name in root._fixtures:
        return root._fixtures[name]
    if name in root._actual:
        # Unchanged data retains its original guarded physical read semantics.
        raw = regular(root,name)
        assert raw == root._actual[name], 'Actual data changed inside operation'
        return raw
    raise ValueError('Path outside the finite operation data snapshot')


class _C1OperationScope:
    __slots__ = ('_root','_records','_actual','_fixtures','_active','_owner')

    def __init__(self, root, records, actual, fixtures):
        object.__setattr__(self,'_root',Path(root).absolute())  # lexical, never resolve symlinks
        object.__setattr__(self,'_records',MappingProxyType({k:MappingProxyType(dict(v)) for k,v in records.items()}))
        object.__setattr__(self,'_actual',MappingProxyType(dict(actual)))
        object.__setattr__(self,'_fixtures',MappingProxyType(dict(fixtures)))
        object.__setattr__(self,'_active',True)
        object.__setattr__(self,'_owner',get_ident())

    def __setattr__(self, name, value):
        raise AttributeError('Operation scope is immutable')

    def _check(self):
        if not self._active or self._owner != get_ident():
            raise ValueError('Closed or foreign-thread operation scope')
        if self._root.is_symlink() or not self._root.is_dir():
            raise ValueError('Operation source root changed or is a symlink')

    def __fspath__(self):
        self._check()
        return str(self._root)

    def _close(self):
        object.__setattr__(self,'_active',False)
        object.__setattr__(self,'_records',MappingProxyType({}))
        object.__setattr__(self,'_actual',MappingProxyType({}))
        object.__setattr__(self,'_fixtures',MappingProxyType({}))


def _reject_c1_scope(root):
    if isinstance(root,_C1OperationScope):
        raise ValueError('Public entry requires a root, never a carried operation scope')


def _scope_records(scoped):
    if type(scoped) is not _C1OperationScope:
        raise ValueError('Exact private operation scope required')
    scoped._check()
    records = proof_records(scoped)  # physical guarded proof reread, no snapshot fallback
    assert records == scoped._records
    return records


@contextmanager
def _c1_operation_scope(root):
    """One synchronous private operation. No scope survives return or exception."""
    _reject_c1_scope(root)
    records, actual = _capture_actual_data(root)
    assert len(actual) == 27 and all(type(raw) is bytes for raw in actual.values())
    previous = parent343_records(root)
    fixtures = {}
    for name in C1_DATA_PATHS:
        raw = regular(root,'tests/fixtures/canon-before-six/'+Path(name).name)
        assert {'bytes':len(raw),'sha256':digest(raw)} == previous[name.removeprefix('server/')]
        fixtures[name] = raw
    scoped = _C1OperationScope(root,records,actual,fixtures)
    del records, actual, fixtures
    try:
        yield scoped
    finally:
        scoped._close()


def safe_destination(root, relative):
    path = Path(root)
    if path.is_symlink():
        raise ValueError('Owned fixture refuses symlink destination root')
    if not path.exists():
        raise ValueError('Owned fixture destination root must already exist')
    if not path.is_dir():
        raise ValueError('Owned fixture destination root directory required')
    parts = Path(relative).parts
    if not parts or Path(relative).is_absolute() or any(p in ('..','.') for p in parts):
        raise ValueError('Finite owned fixture path required')
    for part in parts[:-1]:
        path = path / part
        if path.is_symlink():
            raise ValueError('Owned fixture refuses symlink destination parent')
        if path.exists():
            if not path.is_dir():
                raise ValueError('Owned fixture destination parent directory required')
        else:
            path.mkdir()
    target = path / parts[-1]
    if target.is_symlink():
        raise ValueError('Owned fixture refuses symlink destination file')
    if target.exists() and not target.is_file():
        raise ValueError('Owned fixture regular destination file required')
    return target


def copy_six_historical_fixture(source_root, destination_root):
    _reject_c1_scope(source_root)
    _reject_c1_scope(destination_root)
    names = [PROOF_DIRECTORY+'/'+ORACLE_NAME,
             PROOF_DIRECTORY+'/C1_IMMUTABLE_EXPECTATIONS.json',
             PROOF_DIRECTORY+'/runtime/'+INVENTORY_NAME,PROOF_DIRECTORY+'/runtime/'+REVIEW_NAME,
             'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_INVENTORY.json',
             'docs/evidence/apadana/runtime343/INDEPENDENT343_RUNTIME_REVIEW.json',
             *['tests/fixtures/canon-before-six/'+Path(p).name for p in C1_DATA_PATHS]]
    # Validate every independent proof/data authority BEFORE copying fixture bytes.
    records = assert_six_current_canonical_data(source_root)
    names += ['server/'+name for name in sorted(records) if name.startswith('data/')]
    for p in C1_DATA_PATHS:
        historical_c1_data_bytes(source_root,p)
    for name in names:
        raw = regular(source_root,name)
        target = safe_destination(destination_root,name)
        if target.exists():
            if target.is_symlink() or target.read_bytes() != raw:
                raise ValueError('Existing owned fixture differs: '+name)
        else:
            with target.open('xb') as stream:
                stream.write(raw)


def assert_preserved_c1_catalogue(root, approved):
    authority = sealed(root,PROOF_DIRECTORY+'/C1_IMMUTABLE_EXPECTATIONS.json',C1_METADATA_SHA)
    assert authority['base_commit'] == BASELINE_COMMIT
    assert approved['ids'] == authority['ids'] and len(approved['ids']) == 343
    assert list(approved['profiles']) == list(approved['links']) == authority['ids']
    for uid in approved['ids']:
        assert digest(compact(approved['profiles'][uid])) == authority['whole343_profile_object_sha256'][uid]
        assert digest(compact(approved['links'][uid])) == authority['whole343_link_object_sha256'][uid]
