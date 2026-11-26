"""Finite reviewed359 QA authorities. No application loader or API projection.

Only metadata/hashes and the explicitly frozen343 test input are bundled.
Physical proofs are read on every public operation and private binding check.
"""
import hashlib
import json
from pathlib import Path
import re

BASE = '3d614795cf95e45280603e95f68846c52eba4818'
CANON = 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
DIRECTORY = 'docs/evidence/apadana/english335-350'
IDS = ('tha-ap337','tha-ap338','tha-ap339','tha-ap340','tha-ap341','tha-ap342','tha-ap343','tha-ap344','tha-ap345','tha-ap346','tha-ap347','tha-ap348','tha-ap349','tha-ap350','tha-ap351','tha-ap352')
PUBLISHERS = (335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350)
AP_PATH = 'server/data/apadana.json'
AP_FIXTURE = 'tests/fixtures/canon-before-intake359/apadana.json'
PINS = {
    'BASELINE343.json': '4c122fff1283b3ee5904f1f6ea781572347d6e42140dcdd25d7765e8ab00e138',
    'BASELINE343_FULL_OBJECTS.json': '74c8c358e0bebec17f8679289f533975ee2e95270d3c7017aeb19594464d7a5e',
    'BASELINE_DATA27.json': '8631b90104e01329b74d22cc7632df265e9b9072efd6ba17b5478450b026a99f',
    'BASELINE_RUNTIME34.json': '6becdfab6b8e948a6d2df9af1a37131c4c0c727d77db79cf4bb4b93973512f23',
    'SOURCE_REVIEW.json': '61e8d843e61cbbab04c3dc4f1546c8725d0ad883d194d8e5b567c4e3d681385a',
    'SOURCE_CURATION.json': 'e777f4dc3b154a448162b8d0c274d44995722903ebef59e133172ee46ecac5da',
    'APPROVAL.json': '9232fdeec1b93618b5019b1aeb2c706b2a6b423a62bbb5dae86ea39b520e4bf6',
    'PROFILES.json': '4d1ba58af7d5918ae18d68eab63d5e4e1258925d90c46d8d889fe5a74977a59d',
    'LINKS.json': 'f284bc4dcbb415a55aa025f654018448ce3578772dea010f12d8e7cfd536da0a',
    'EXPECTED_MANIFEST.json': '57b6fd43f4b8273e9542b8a22a6bd84b2042914113d53c94fe727386c5ec0194',
    'PROFILE_SCHEMA_REVIEW.json': '7af2686040b00e89730568771ff8d35e64b676b383f014981eb809d4f63203e5',
}
RUNTIME_NAME = 'RUNTIME_INVENTORY.json'
REVIEW_NAME = 'RUNTIME_REVIEW.json'
RUNTIME_SHA = '62ccc6bacf3e0926939cb38e9903aa23e6db491b04cb445b0f1226659c6e8e7e'
REVIEW_SHA = 'b7aa44b6d9822a4508ac4fbc392da8ae76c0ab259469e3c61dc75cac260182bc'
APPLICATION_COMMIT = '51e0b7dd98e19f8d633da266e2093b53eb436c53'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()


def _regular(root, name):
    # Reuse only the finite physical-file primitive, never an old data capture.
    from web_reader_next_ten_boundary_history import regular
    return regular(root, name)


def _sealed(root, name, pin):
    if type(pin) is not str or re.fullmatch('[a-f0-9]{64}', pin) is None:
        raise ValueError('Pending independent359 authority; no fallback')
    raw = _regular(root, DIRECTORY + '/' + name)
    assert digest(raw) == pin, 'Changed independent359 authority: ' + name
    return json.loads(raw)


def fresh_proofs(root):
    # Physical rereads; no mtime/inode/root-global cache. No repeated JSON parse.
    for name, pin in (*PINS.items(), (RUNTIME_NAME, RUNTIME_SHA), (REVIEW_NAME, REVIEW_SHA)):
        if re.fullmatch('[a-f0-9]{64}', pin) is None:
            raise ValueError('Pending independent359 authority; no fallback')
        assert digest(_regular(root, DIRECTORY + '/' + name)) == pin


def _authority(root):
    proof = {name: _sealed(root, name, pin) for name, pin in PINS.items()}
    a, old, compact_old = proof['APPROVAL.json'], proof['BASELINE343_FULL_OBJECTS.json'], proof['BASELINE343.json']
    assert a['schema'] == 'reviewed-thera335-350-approval-v1' and a['status'] == 'approved'
    assert a['base_commit'] == old['commit'] == compact_old['commit'] == BASE
    assert a['canonical_logical_sha256'] == compact_old['canonical_logical_sha256'] == CANON
    assert a['source_and_normalization_only'] is True
    assert a['runtime_approval'] is a['release_approval'] is False
    assert a['publisher_revision'] == 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
    assert a['vri_revision'] == '2d134ff9ef60f70a1eb03c9370580228811a3070'
    assert a['approved_ids'] == list(IDS)
    assert a['approved_records'] == [{'id': uid, 'publisher_chapter': 'chapter-3', 'poem': p} for uid, p in zip(IDS, PUBLISHERS)]
    curation = proof['SOURCE_CURATION.json']
    assert curation['schema'] == 'english16-independent-source-curation-v1'
    assert curation['status'] == 'APPROVED_EXACT_SOURCE_AND_NORMALIZED_METADATA_SCOPES_NOT_RUNTIME'
    assert curation['canonical_logical_sha256'] == CANON
    assert curation['canonical_ids'] == list(IDS) and curation['publishers'] == list(PUBLISHERS)
    assert curation['runtime_reader_package_CI_activation_release_approval'] is False
    fields = {'source_curation':'SOURCE_CURATION.json','baseline_freeze':'BASELINE343.json','baseline_full_objects':'BASELINE343_FULL_OBJECTS.json', 'expected_profiles':'PROFILES.json','expected_links':'LINKS.json','expected_manifest':'EXPECTED_MANIFEST.json','independent_source_review':'SOURCE_REVIEW.json','profile_schema_review':'PROFILE_SCHEMA_REVIEW.json'}
    for field, name in fields.items():
        assert a[field] == {'file': name, 'sha256': PINS[name]}
    ids = compact_old['ids']
    assert len(ids) == len(set(ids)) == 343 and a['baseline_ids'] == ids
    assert list(old['profiles']) == list(old['links']) == ids
    for uid in ids:
        assert digest(compact(old['profiles'][uid])) == compact_old['profile_object_sha256'][uid]
        assert digest(compact(old['links'][uid])) == compact_old['translation_object_sha256'][uid]
    assert old['manifest_source'] == compact_old['manifest_source']
    source, peer = proof['SOURCE_REVIEW.json'], proof['PROFILE_SCHEMA_REVIEW.json']
    assert source['status'] == 'GO_SIXTEEN_EXACT_SOURCE_AND_NORMALIZED_CONTENT_SCOPES_ONLY' and source['canonical_sha256'] == CANON
    assert peer['status'] == 'GO_EXACT_SIXTEEN_PROFILES_LINKS_AND_TWO_SUMMARIES_SOURCE_METADATA_ONLY'
    assert peer['package_CI_activation_release_approval'] is peer['parser_API_reader_behavior_verified'] is False
    assert peer['source_review_sha256'] == PINS['SOURCE_REVIEW.json']
    assert peer['final_profiles_sha256'] == PINS['PROFILES.json'] and peer['final_links_sha256'] == PINS['LINKS.json']
    profiles, links, manifest = (proof[name] for name in ('PROFILES.json','LINKS.json','EXPECTED_MANIFEST.json'))
    assert list(profiles) == list(links) == list(IDS) and not set(IDS) & set(ids)
    for uid, poem in zip(IDS, PUBLISHERS):
        p = profiles[uid]
        assert (p['id'], p['poem'], p['publisher_chapter'], p['path']) == (uid, poem, 'chapter-3', '/text/chapter-3/poem-' + str(poem) + '/')
        assert p['translation_revision'] == a['publisher_revision'] and p['license'] == 'CC BY-NC-SA 4.0'
        assert not {'text','translator_notes','publisher_paratext','raw','body','notes'} & set(p)
    all_ids = ids + list(IDS)
    assert a['expected_profile_ids'] == all_ids and len(all_ids) == 359
    assert list(manifest) == ['version','source','vri_commit','held','links'] and manifest['version'] == 1
    assert manifest['held'] == {} and manifest['vri_commit'] == a['vri_revision']
    assert list(manifest['links']) == all_ids and manifest['links'] == {**old['links'], **links}
    baseline_data, baseline_runtime = proof['BASELINE_DATA27.json'], proof['BASELINE_RUNTIME34.json']
    assert baseline_data['commit'] == baseline_runtime['commit'] == BASE
    assert len(baseline_data['files']) == 27 and len(baseline_runtime['files']) == 34
    for name, row in baseline_data['files'].items():
        assert name.startswith('server/data/') and baseline_runtime['files'][name.removeprefix('server/')] == row
    return proof


def _runtime(root, previous, proof):
    assert previous == proof['BASELINE_RUNTIME34.json']['files']
    inv, review = _sealed(root, RUNTIME_NAME, RUNTIME_SHA), _sealed(root, REVIEW_NAME, REVIEW_SHA)
    assert re.fullmatch('[a-f0-9]{40}', APPLICATION_COMMIT)
    assert inv['schema'] == 'independent-reviewed-intake359-runtime-inventory-v1'
    assert review['schema'] == 'reviewed-intake359-runtime-approval-v1'
    assert review['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_SOURCE_SCOPE_ONLY'
    assert inv['baseline_commit'] == review['baseline'] == BASE
    assert inv['candidate_commit'] == review['candidate_commit'] == APPLICATION_COMMIT
    assert review['independent_inventory'] == {'file': RUNTIME_NAME, 'sha256': RUNTIME_SHA}
    for value in (inv, review):
        assert value['curation_sha256'] == PINS['APPROVAL.json'] and value['canonical_logical_sha256'] == CANON
        assert value['runtime_files'] == 34 and value['baseline_runtime_sha256'] == PINS['BASELINE_RUNTIME34.json']
    assert inv['behavioral_or_release_approval'] is False
    assert review['inventory_only'] is review['runtime_inventory_approval'] is review['finite_source_diff_approval'] is True
    assert review['behavioral_harness_approval'] is review['release_or_push_approval'] is False
    files = inv['files']
    assert files == review['files'] and set(files) == set(previous) and len(files) == 34
    delta = [name for name in sorted(files) if files[name] != previous[name]]
    assert delta == inv['allowed_changed_paths'] == review['allowed_changed_paths_from_3d']
    assert inv['unchanged_paths'] == review['unchanged_runtime_paths'] == 34 - len(delta)
    assert 'data/apadana.json' in delta
    assert set(delta) <= {'data/apadana.json','http-worker.cjs','http.cjs','index.cjs','web/reader.js','THIRD_PARTY_LICENSES.txt'}
    for name, row in files.items():
        assert type(name) is str and not name.startswith('/') and all(p not in ('','.','..') for p in name.split('/'))
        assert set(row) == {'bytes','sha256'} and type(row['bytes']) is int and row['bytes'] > 0
        assert type(row['sha256']) is str and re.fullmatch('[a-f0-9]{64}', row['sha256'])
        if name.startswith('data/') and name != 'data/apadana.json':
            assert row == previous[name]
    return files


def capture_authority(root, previous):
    """One parsed immutable source graph per operation; no current corpus read here."""
    proof = _authority(root)
    files = _runtime(root, previous, proof)
    raw = _regular(root, AP_FIXTURE)
    assert {'bytes':len(raw), 'sha256':digest(raw)} == proof['BASELINE_DATA27.json']['files'][AP_PATH]
    frozen = json.loads(raw)
    assert frozen['links'] == proof['BASELINE343_FULL_OBJECTS.json']['links']
    assert frozen['source'] == proof['BASELINE343_FULL_OBJECTS.json']['manifest_source']
    old = proof['BASELINE343_FULL_OBJECTS.json']
    previous_catalogue = {'ids':list(old['profiles']), 'profiles':old['profiles'], 'links':old['links'], 'source':old['manifest_source']}
    manifest = proof['EXPECTED_MANIFEST.json']
    profiles = {**old['profiles'], **proof['PROFILES.json']}
    current_catalogue = {'ids':list(profiles), 'profiles':profiles, 'links':manifest['links'], 'source':manifest['source']}
    return files, raw, compact({'previous':previous_catalogue, 'current':current_catalogue, 'manifest':manifest})


def fixture_names():
    return tuple(DIRECTORY + '/' + name for name in (*PINS, RUNTIME_NAME, REVIEW_NAME)) + (AP_FIXTURE,)
