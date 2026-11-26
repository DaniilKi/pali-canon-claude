"""Test-only history adapter; missing independent seals MUST refuse execution.

No production loader imports this helper. No ambient switch or current fallback.
The pure logical inverse is separate from exact complete-input acceptance.
"""
from web_reader_six_boundary_history import (canon_before_six, c1_logical_input, _historical_c1_data_bytes as historical_c1_data_bytes, copy_six_historical_fixture, C1_DATA_PATHS)

import copy
import gzip
import hashlib
import json
import re
from pathlib import Path

OLD_CANON_SHA = '1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
NEW_CANON_SHA = '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8'
SOURCE_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
BASELINE_COMMIT = '4408f24bddee66ef7b4bcf1e532ba70d46f57a3d'
PRIOR339_INVENTORY_SHA = '234fe7d26de0af3777f6b67d2e812aff896218b690bdfea098d7918410346970'
PRIOR339_REVIEW_SHA = 'ecfda89f9c3d877e6cffc151a8bdf0aa3594f8a2d9744aaed5d6d26cbbf8c653'
# Intentionally pending. Never derive these from current output, accept env input,
# use zero hashes, or make a historical fallback when these are absent.
INDEPENDENT_FOUR_INVENTORY_SHA = 'c8fc751e3f00c986c315400f229561659268ee21f5e8d161be8e4edd9c3a75d7'
INDEPENDENT_FOUR_REVIEW_SHA = '6006126f8de46b565a9e194ed0fa4426ce512c9f27e67ee4ce4fcd4bc14d3056'
APPLICATION_COMMIT = 'bf0d6ee639435e160285ccbb984d8fbb8dc6fc1b'
# Only the expensive decompression/inverse is memoized. Every call re-reads and
# validates all mandatory proofs and actual data bytes before consulting this key.
_VALIDATED_CANON_CONTENT = None
PROOF_DIRECTORY = 'docs/evidence/apadana/boundaries333-336/runtime'
INVENTORY_NAME = 'INDEPENDENT_FOUR_RUNTIME_INVENTORY.json'
REVIEW_NAME = 'INDEPENDENT_FOUR_RUNTIME_REVIEW.json'
CHANGED_DATA = (
    'server/data/canon.json.gz.part-0002',
    'server/data/canon.json.gz.parts.json',
    'server/data/parallels.json.gz',
)
RUNTIME_DELTA = [
    'data/canon.json.gz.part-0002', 'data/canon.json.gz.parts.json',
    'data/parallels.json.gz', 'http-worker.cjs', 'http.cjs',
    'index.cjs', 'web/reader.js',
]

OLD_UNITS = {'tha-ap333': {'id': 'tha-ap333', 'book': 36, 'start': 9767, 'end': 9793, 'title': 'Gandhadhūpiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 333', 'vri': '1–7', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}}, 'tha-ap334': {'id': 'tha-ap334', 'book': 36, 'start': 9793, 'end': 9816, 'title': 'Udakapūjakattheraapadāna', 'collection': 'ap', 'acronym': 'Tha Ap 334', 'vri': '8–14', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}}, 'tha-ap335': {'id': 'tha-ap335', 'book': 36, 'start': 9816, 'end': 9833, 'title': 'Punnāgapupphiyattheraapadāna', 'collection': 'ap', 'acronym': 'Tha Ap 335', 'vri': '15–19', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}}, 'tha-ap336': {'id': 'tha-ap336', 'book': 36, 'start': 9833, 'end': 9890, 'title': 'Ekadussadāyakattheraapadāna', 'collection': 'ap', 'acronym': 'Tha Ap 336', 'vri': '20–37', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}}}
NEW_UNITS = {'tha-ap333': {'id': 'tha-ap333', 'book': 36, 'start': 9767, 'end': 9789, 'title': 'Gandhadhūpiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 333', 'vri': '1–6', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}, 'index_revision': 'apadana-thera333-336-v1'}, 'tha-ap334': {'id': 'tha-ap334', 'book': 36, 'start': 9789, 'end': 9812, 'title': 'Udakapūjakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 334', 'vri': '7–13', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}, 'index_revision': 'apadana-thera333-336-v1'}, 'tha-ap335': {'id': 'tha-ap335', 'book': 36, 'start': 9812, 'end': 9829, 'title': 'Punnāgapupphiyattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 335', 'vri': '14–18', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}, 'index_revision': 'apadana-thera333-336-v1'}, 'tha-ap336': {'id': 'tha-ap336', 'book': 36, 'start': 9829, 'end': 9890, 'title': 'Ekadussadāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 336', 'vri': '19–37', 'pts': {'volume': 1, 'page': 267, 'end_page': 267}, 'index_revision': 'apadana-thera333-336-v1'}}
OLD_DATA = {'server/data/anandajoti.json': {'bytes': 47765, 'sha256': '7ff6df1b2d91418aef2ceacca43dc652cbf1d8363b70fccfb4106e23fd0af669'}, 'server/data/bmc.json': {'bytes': 40743, 'sha256': '01f68a8a0c4aa1a9c21f7743c5172beccd3cce9133037830f8ee7836c4810a63'}, 'server/data/canon.json.gz.part-0001': {'bytes': 4194304, 'sha256': '526ba969d0fc3ce62fde7d11764313de43b91a2f71375d602cd647a43b601632'}, 'server/data/canon.json.gz.part-0002': {'bytes': 1367632, 'sha256': '24169740dd71b5ee86767ef72daea44759201987ffb72975afaca5d31b4c0832'}, 'server/data/canon.json.gz.parts.json': {'bytes': 455, 'sha256': '639a938e11a230acbf0a87a18c180c820013d95795b7f951439a8cae674b91a7'}, 'server/data/commentary.json.gz.part-0001': {'bytes': 4194304, 'sha256': '581fb24ed95f5ba4a30f7ca02be4dced03f81315f34d3aa6e8a8601a97f2d946'}, 'server/data/commentary.json.gz.part-0002': {'bytes': 4194304, 'sha256': '40d18b97cd9859a80eced012436e84cecad1654a78a33a98b7e3ed8f9700bf98'}, 'server/data/commentary.json.gz.part-0003': {'bytes': 2443283, 'sha256': '905cc7de1186d860c0fd4902c11610cf38d2c3d05fe47ce987b3f22b7d68f06b'}, 'server/data/commentary.json.gz.parts.json': {'bytes': 631, 'sha256': '763a8001662cb9666e549074959a023367fa56822e7293beebd45312846a7156'}, 'server/data/dhamma_lists.json': {'bytes': 37147, 'sha256': '6e14b77fd25d8b524da9ce9a3405220c3fbc9286c82d2096d8f0ca7cdd56b33c'}, 'server/data/dpd.json.gz.part-0001': {'bytes': 4194304, 'sha256': '7f6790cfaca70ad2d5d9dc829420b491288a23d666b3a5ba2f9e0046cc165081'}, 'server/data/dpd.json.gz.part-0002': {'bytes': 1294765, 'sha256': '25e831647c47c1f97b6d325cf285f2ec761ba1b2ee64f516d3c036c5b2b5af12'}, 'server/data/dpd.json.gz.parts.json': {'bytes': 451, 'sha256': '5c530a5afef657ceac06a484bfea0e6ecc725c18a38a0f7e3bc687b6028b5854'}, 'server/data/dppn.json': {'bytes': 1207, 'sha256': 'e3d1bb4af928e8cda64bfd92fe2254569043ee97d9d124583b48eca0201cf959'}, 'server/data/glossary.json.gz': {'bytes': 1523979, 'sha256': 'a47a735d7a376882609cd6cb56804403adbf10c21e136c36a4c277e09d746d64'}, 'server/data/parallels.json.gz': {'bytes': 487205, 'sha256': 'a5c99363bdec68bdaea8ea111eaea74a1c1bc0755235e1c2e49493d86414b385'}, 'server/data/postcanonical.json.gz.part-0001': {'bytes': 4194304, 'sha256': '3b21aeb1467103dda9b7bdff1a8a06b134df11454003a623ae617d6c452efbd9'}, 'server/data/postcanonical.json.gz.part-0002': {'bytes': 4194304, 'sha256': '7943baafd6927bdedd408058f75f5a28c7934dddef660932355692976c297147'}, 'server/data/postcanonical.json.gz.part-0003': {'bytes': 4194304, 'sha256': 'a67a0f4c851845de4d519f86f4f5aaae8a86ade22a4a0e7559160b8056073d2e'}, 'server/data/postcanonical.json.gz.part-0004': {'bytes': 1927665, 'sha256': '13b966525a2d9b312c79c368ba43cfa9cda545124f5692097966aaf0c0d6c82b'}, 'server/data/postcanonical.json.gz.parts.json': {'bytes': 808, 'sha256': '310a3db600ad23af025d6f62cfe6f37d56a7fb48f0cda7eaa55a7035bf2e0080'}, 'server/data/reviewed-ati-sections.json': {'bytes': 102044, 'sha256': '91fde828f07be060a616127e0920b41935a25e180757418036b145a9cfc5214a'}, 'server/data/reviewed-partial-pages.json': {'bytes': 40136, 'sha256': '55495a36fb429de09b3c7c07bae68da87cd76115df7342647babeeba31afbd76'}, 'server/data/source-notes.json': {'bytes': 4218, 'sha256': '1cf2b14b514180ae5fffafdf44c2c19bd4c0e5a70ee0f02f0c4585ca3fc7493e'}, 'server/data/topics.json': {'bytes': 339961, 'sha256': 'b1d022643419d6b122138999eb6813db615654cb625a827ea64c256e74facbfb'}, 'server/data/translations.json': {'bytes': 748991, 'sha256': '5d97eaf26bd0bdd09fc08c5569da542d50a3096785142848ad3d9b73ab0748e6'}}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def historical_c1_regular(root, relative):
    path = Path(root)
    parts = Path(relative).parts
    if not parts or Path(relative).is_absolute() or any(p in ('..', '.') for p in parts):
        raise ValueError('Finite regular-file path required')
    for part in parts:
        path = path / part
        if path.is_symlink():
            raise ValueError('Historical acceptance refuses symlink inputs')
    if not path.is_file():
        raise ValueError('Missing mandatory acceptance input: ' + relative)
    return path.read_bytes()


def sealed(root, relative, pin):
    if not isinstance(pin, str) or re.fullmatch('[a-f0-9]{64}', pin) is None:
        raise ValueError('Pending independent boundary runtime seal; no fallback')
    raw = regular(root, relative)
    if digest(raw) != pin:
        raise ValueError('Independent boundary authority changed: ' + relative)
    return json.loads(raw)


def four_state(canon):
    if canon.get('source', {}).get('commit') != SOURCE_COMMIT:
        raise ValueError('Reviewed VRI source required')
    selected = {}
    for uid in OLD_UNITS:
        rows = [u for u in canon['units'] if u.get('id') == uid]
        if len(rows) != 1:
            raise ValueError('Missing or duplicate reviewed four-poem unit')
        selected[uid] = rows[0]
    # Typed JSON comparison avoids Python bool == int accepting malformed metadata.
    selected = json.dumps(selected, ensure_ascii=False, sort_keys=True)
    for state, units in (('old', OLD_UNITS), ('new', NEW_UNITS)):
        if selected == json.dumps(units, ensure_ascii=False, sort_keys=True):
            return state
    raise ValueError('Mixed or unreviewed four-poem metadata')


def historical_c1_canon_before_four(canon):
    """Pure strict inverse: retain unrelated mutations for negative tests.

    This is not a saved-locator migration and does not assert a whole-input SHA.
    Complete-snapshot consumers must instead call historical_canon_bytes.
    """
    four_state(canon)
    out = dict(canon)
    out['units'] = [copy.deepcopy(OLD_UNITS[u['id']]) if u.get('id') in OLD_UNITS else u
                    for u in canon['units']]
    return out


def historical_c1_historical_canon_bytes(raw):
    """Exact complete new snapshot -> exact old logical JSON, without file writes."""
    if digest(raw) != NEW_CANON_SHA:
        raise ValueError('Exact complete current canonical bytes required')
    current = json.loads(raw)
    if four_state(current) != 'new':
        raise ValueError('Exact current four-poem state required')
    old = compact(canon_before_four(current))
    if digest(old) != OLD_CANON_SHA:
        raise ValueError('Four-record inverse differs from immutable historical canon')
    return old


def proof_records(root):
    inventory = sealed(root, PROOF_DIRECTORY + '/' + INVENTORY_NAME, INDEPENDENT_FOUR_INVENTORY_SHA)
    review = sealed(root, PROOF_DIRECTORY + '/' + REVIEW_NAME, INDEPENDENT_FOUR_REVIEW_SHA)
    if not isinstance(APPLICATION_COMMIT, str) or re.fullmatch('[a-f0-9]{40}', APPLICATION_COMMIT) is None:
        raise ValueError('Pending independently reviewed application commit')
    assert inventory['schema'] == 'independent-reviewed-four-boundary-runtime-inventory-v1'
    assert review['schema'] == 'reviewed-four-boundary-runtime-approval-v1'
    assert review['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_SOURCE_SCOPE_ONLY'
    assert inventory['baseline_commit'] == review['baseline'] == BASELINE_COMMIT
    assert inventory['candidate_commit'] == review['candidate_commit'] == APPLICATION_COMMIT
    assert inventory['prior339_inventory_sha256'] == review['prior339_inventory_sha256'] == PRIOR339_INVENTORY_SHA
    assert review['prior339_review_sha256'] == PRIOR339_REVIEW_SHA
    assert review['independent_inventory'] == {'file': INVENTORY_NAME, 'sha256': INDEPENDENT_FOUR_INVENTORY_SHA}
    assert inventory['old_canon_logical_sha256'] == review['old_canon_logical_sha256'] == OLD_CANON_SHA
    assert inventory['new_canon_logical_sha256'] == review['new_canon_logical_sha256'] == NEW_CANON_SHA
    assert review['inventory_only'] is True and review['runtime_inventory_approval'] is True
    assert review['finite_source_diff_approval'] is True
    assert review['behavioral_harness_approval'] is False and review['release_or_push_approval'] is False
    assert inventory['behavioral_or_release_approval'] is False
    files = inventory['files']
    assert len(files) == inventory['runtime_files'] == review['runtime_files'] == 34
    assert review['files'] == files
    assert inventory['allowed_changed_paths'] == review['allowed_changed_paths_from_prior339'] == RUNTIME_DELTA
    assert inventory['unchanged_paths'] == review['unchanged_runtime_paths'] == 27
    for name, row in files.items():
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
        assert set(row) == {'bytes', 'sha256'} and type(row['bytes']) is int and row['bytes'] > 0
        assert re.fullmatch('[a-f0-9]{64}', row['sha256'])
    return files


def boundary_runtime_records(root, previous):
    """Additive proof-only layer; assert_runtime still reads every ACTUAL file."""
    files = proof_records(root)
    assert set(files) == set(previous)
    assert [name for name in sorted(files) if files[name] != previous[name]] == RUNTIME_DELTA
    for name in ('data/apadana.json', 'data/source-notes.json', 'data/canon.json.gz.part-0001'):
        assert files[name] == previous[name]
    return files


def assert_current_canonical_data(root):
    """Validate current changed data BEFORE allowing historical byte substitution.

    Unchanged paths are intentionally checked by the preserved historical assertions,
    not substituted. No persistent cache may hide later fixture mutations.
    """
    global _VALIDATED_CANON_CONTENT
    records = proof_records(root)
    changed_hashes = []
    for name in CHANGED_DATA:
        raw = regular(root, name)
        assert {'bytes': len(raw), 'sha256': digest(raw)} == records[name.removeprefix('server/')]
        changed_hashes.append(digest(raw))
    manifest = json.loads(regular(root, 'server/data/canon.json.gz.parts.json'))
    assert manifest['version'] == 1
    assert [p['file'] for p in manifest['parts']] == ['canon.json.gz.part-0001', 'canon.json.gz.part-0002']
    chunks = []
    for part in manifest['parts']:
        name = 'server/data/' + part['file']
        raw = regular(root, name)
        assert type(part['size']) is int and len(raw) == part['size']
        assert digest(raw) == part['sha256']
        assert {'bytes': len(raw), 'sha256': digest(raw)} == records[name.removeprefix('server/')]
        chunks.append(raw)
    packed = b''.join(chunks)
    assert len(packed) == manifest['size'] and digest(packed) == manifest['sha256']
    key = (INDEPENDENT_FOUR_INVENTORY_SHA, INDEPENDENT_FOUR_REVIEW_SHA,
           manifest['sha256'], *changed_hashes)
    if key != _VALIDATED_CANON_CONTENT:
        historical_canon_bytes(gzip.decompress(packed))
        _VALIDATED_CANON_CONTENT = key


def historical_data_bytes(root, name):
    """Only three historical byte-read callsites may substitute sealed old bytes.

    Other paths, including apadana.json, always return actual current bytes.
    """
    if name not in OLD_DATA:
        raise ValueError('Path outside the exact historical26-data set')
    if name not in CHANGED_DATA:
        return regular(root, name)
    assert_current_canonical_data(root)
    raw = regular(root, 'tests/fixtures/canon-before333/' + Path(name).name)
    assert {'bytes': len(raw), 'sha256': digest(raw)} == OLD_DATA[name]
    return raw


def historical_c1_copy_historical_fixture(source_root, destination_root):
    """Provision only the three sealed old byte inputs in an owned test fixture."""
    for name in CHANGED_DATA:
        relative = 'tests/fixtures/canon-before333/' + Path(name).name
        raw = regular(source_root, relative)
        assert {'bytes': len(raw), 'sha256': digest(raw)} == OLD_DATA[name]
        target = Path(destination_root) / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('xb') as stream:
            stream.write(raw)


# Explicit future→C1 input frames before the unchanged historical four bodies.
def regular(root, relative):
    if relative in C1_DATA_PATHS:
        return historical_c1_data_bytes(root, relative)
    return historical_c1_regular(root, relative)

def canon_before_four(canon):
    return historical_c1_canon_before_four(canon_before_six(canon))

def historical_canon_bytes(raw):
    return historical_c1_historical_canon_bytes(c1_logical_input(raw))

def copy_historical_fixture(source_root, destination_root):
    copy_six_historical_fixture(source_root, destination_root)
    return historical_c1_copy_historical_fixture(source_root, destination_root)
