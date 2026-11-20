"""Finite acceptance oracles from sealed independent reviews, never runtime output.

Historical evidence stays untouched. Catalogue gates retain all 303 old objects
and add exactly five separately reviewed sources. Runtime acceptance remains the
separately reviewed303-choice authority until a new inventory is approved.
"""
import hashlib
import json
import subprocess
from pathlib import Path

from web_reader_apadana_intake import curated_303_additions, read_281_285

CURATION_SHA = '14b739ffe5f3e6f01718ccd1c247dd35454d71abb6cf4d0de672295cef8f4aa7'
FREEZE_SHA = '24e63f5fb14ec74946d20349d78ae2b405e1636ca561f757660113226d6537dc'
RUNTIME_SHA = 'cd6fd0af3f72c8e907130dd40aec4660e2ce8b8155ec7959a178e59517c53080'
IMPLEMENTATION_SHA = 'af30339018c4843e4da2599fcabf25797173c58398123dc365ad09f6a2ced00f'
CURRENT_RUNTIME_REVIEW_SHA = '42ccdcd9bfa168df83cfa13b4d0a4c7b121f726a117b31e1a15d7fba952b230c'


def sealed(path, expected):
    raw = Path(path).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == expected, 'Independent acceptance seal changed: ' + Path(path).name
    return json.loads(raw)


def approved303_catalogue(root):
    evidence = Path(root) / 'docs/evidence/apadana'
    sealed(evidence / 'THERA_HELD234_APPROVAL.json', CURATION_SHA)
    additions = curated_303_additions(root, 'THERA_241_250_APPROVAL.json')
    anchor = additions['anchor']
    assert anchor['baseline_freeze'] == {'file': 'THERA_241_250_BASELINE_FREEZE.json', 'sha256': FREEZE_SHA}
    frozen = sealed(evidence / anchor['baseline_freeze']['file'], FREEZE_SHA)
    assert frozen['baseline'] == 'a9755d267c309ad930df0ef154e6c8a03f1f371e'
    links, profiles = dict(frozen['translation_objects']), dict(frozen['profile_objects'])
    assert len(links) == len(profiles) == 246
    assert set(links) == set(profiles) == set(anchor['baseline_ids'])
    first_links = sealed(evidence / anchor['expected_links']['file'], anchor['expected_links']['sha256'])
    first_profiles = sealed(evidence / anchor['expected_profiles']['file'], anchor['expected_profiles']['sha256'])
    for ids, extra_links, extra_profiles in (
            (anchor['approved_ids'], first_links, first_profiles),
            (additions['ids'], additions['links'], additions['profiles'])):
        assert set(ids) == set(extra_links) == set(extra_profiles)
        assert not set(ids) & set(links), 'Approved intakes overlap the historical cohort'
        links.update(extra_links)
        profiles.update(extra_profiles)
    ids = additions['curation']['expected_profile_ids']
    assert len(ids) == len(set(ids)) == 303
    assert set(links) == set(profiles) == set(ids)
    current = additions['curation']
    prior = sealed(evidence / current['baseline_freeze']['file'], current['baseline_freeze']['sha256'])
    assert prior['schema'] == 'prior285-intake-baseline-v1' and prior['profiles'] == 285
    assert prior['baseline'] == current['base_commit'] == 'd31757b922fe2fa1fcf7bd903469e608f4eef6fb'
    old_ids = current['baseline_ids']
    assert len(old_ids) == 285 and ids[:285] == old_ids and ids[285:] == current['approved_ids']
    assert list(prior['translation_objects']) == list(prior['profile_objects']) == old_ids
    assert {uid: links[uid] for uid in old_ids} == prior['translation_objects'], 'Old285 link objects changed'
    assert {uid: profiles[uid] for uid in old_ids} == prior['profile_objects'], 'Old285 profile objects changed'
    assert current['before_canon_sha256'] == current['after_canon_sha256'] == prior['canon_logical_sha256']
    assert len([uid for uid in ids if uid.startswith('thi-ap')]) == 40
    assert len([uid for uid in ids if uid.startswith('tha-ap')]) == 263
    assert not {'tha-ap262', 'tha-ap268', 'tha-ap282'} & set(links), 'Held publishers260/266/280 must remain excluded'
    source = dict(frozen['manifest_source'])
    policy = source['policy']
    assert policy.count('246 finite') == policy.count('206 explicitly mapped Therā') == 1
    source['policy'] = policy.replace('246 finite', '285 finite').replace('206 explicitly mapped Therā', '245 explicitly mapped Therā')
    assert source == prior['manifest_source'], 'Prior285 source rights or finite policy changed'
    source['policy'] = policy.replace('246 finite', '303 finite').replace('206 explicitly mapped Therā', '263 explicitly mapped Therā')
    return {'ids': ids, 'links': links, 'profiles': profiles, 'source': source}


def approved_catalogue(root):
    previous = approved303_catalogue(root)
    current = read_281_285(root)
    evidence = Path(root) / 'docs/evidence/apadana'
    compact = sealed(evidence / current['baseline_freeze']['file'], current['baseline_freeze']['sha256'])
    assert compact['schema'] == 'prior303-intake-compact-v1'
    assert compact['baseline'] == current['base_commit'] == '929e5c83d4157a0339ab24bb7039e1441a348b2c'
    assert compact['profiles'] == 303 and compact['ordered_ids'] == previous['ids'] == current['baseline_ids']
    assert compact['prior303_authority'] == current['previous_intake']
    assert compact['object_hash_domain'] == 'SHA256 UTF8 compact JSON with preserved insertion order, equivalent to JSON.stringify for these source objects; independently compared for all303.'
    object_sha = lambda value: hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
    assert list(compact['profile_object_sha256']) == list(compact['translation_object_sha256']) == previous['ids']
    for uid in previous['ids']:
        assert object_sha(previous['profiles'][uid]) == compact['profile_object_sha256'][uid], 'Prior303 profile differs from independently reconstructed object: ' + uid
        assert object_sha(previous['links'][uid]) == compact['translation_object_sha256'][uid], 'Prior303 link differs from independently reconstructed object: ' + uid
    assert object_sha(previous['source']) == compact['manifest_source_sha256']
    assert compact['canon_logical_sha256'] == current['before_canon_sha256'] == current['after_canon_sha256']
    assert compact['canon_units'] == 8544 and compact['canon_books'] == 61
    runtime303 = sealed(evidence / 'THERA_261_280_RUNTIME_REVIEW.json', CURRENT_RUNTIME_REVIEW_SHA)
    for name, expected in compact['data_file_sha256'].items():
        assert name.startswith('server/data/') and '..' not in Path(name).parts
        assert runtime303['files'][name.removeprefix('server/')]['sha256'] == expected
        if name != 'server/data/apadana.json':
            assert hashlib.sha256((Path(root) / name).read_bytes()).hexdigest() == expected, 'Unrelated data changed: ' + name
    profiles = dict(previous['profiles'])
    links = dict(previous['links'])
    extra_profiles = sealed(evidence / current['expected_profiles']['file'], current['expected_profiles']['sha256'])
    extra_links = sealed(evidence / current['expected_links']['file'], current['expected_links']['sha256'])
    assert list(extra_profiles) == list(extra_links) == current['approved_ids']
    assert not set(extra_profiles) & set(profiles)
    profiles.update(extra_profiles)
    links.update(extra_links)
    ids = current['expected_profile_ids']
    assert len(ids) == len(set(ids)) == 308 and ids == previous['ids'] + current['approved_ids']
    assert list(profiles) == list(links) == ids
    assert {uid: profiles[uid] for uid in previous['ids']} == previous['profiles'], 'All303 prior full profile objects retained'
    assert {uid: links[uid] for uid in previous['ids']} == previous['links'], 'All303 prior full link objects retained'
    assert len([uid for uid in ids if uid.startswith('thi-ap')]) == 40
    assert len([uid for uid in ids if uid.startswith('tha-ap')]) == 268
    source = dict(previous['source'])
    policy = source['policy']
    assert policy.count('303 finite') == policy.count('263 explicitly mapped Therā') == 1
    source['policy'] = policy.replace('303 finite', '308 finite').replace('263 explicitly mapped Therā', '268 explicitly mapped Therā')
    return {'ids': ids, 'links': links, 'profiles': profiles, 'source': source}


def assert_catalogue(manifest, approved):
    assert manifest['links'] == approved['links'], 'Exact independently reviewed 308 link objects changed'
    assert manifest['source'] == approved['source'], 'Reviewed source rights or finite policy changed'


def assert_profiles(root, approved):
    probe = "import{APADANA_PROFILES}from'./src/apadana-profiles.mjs';console.log(JSON.stringify(APADANA_PROFILES));"
    observed = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', probe], cwd=root, encoding='utf-8'))
    assert observed == approved['profiles'], 'Exact independently reviewed 308 profile objects changed'


def reviewed_2449_runtime(root):
    root = Path(root)
    proof = sealed(root / 'tests/fixtures/reviewed-runtime-2449.json', RUNTIME_SHA)
    review = sealed(root / 'docs/evidence/source-notes/SARIPUTTA_LOCAL_IMPLEMENTATION_APPROVAL.json', IMPLEMENTATION_SHA)
    assert proof['schema'] == 'independently-reviewed-runtime-v1'
    assert proof['approved_commit'] == '2449c43da05030e4069aa09c1f1f515ece599c6a'
    assert proof['prior_implementation_approval_sha256'] == IMPLEMENTATION_SHA
    assert proof['prior_package_review_sha256'] == review['package_review']['sha256']
    files = proof['files']
    assert len(files) == 34 and files['data/source-notes.json']['sha256'] == '1cf2b14b514180ae5fffafdf44c2c19bd4c0e5a70ee0f02f0c4585ca3fc7493e'
    assert all(not Path(name).is_absolute() and '..' not in Path(name).parts for name in files)
    return files


def reviewed_303_runtime(root):
    # Old34 paths remain independently bound; only five explicitly reviewed
    # source303/v34 byte changes may replace the corresponding old records.
    previous = reviewed_2449_runtime(root)
    proof = sealed(Path(root) / 'docs/evidence/apadana/THERA_261_280_RUNTIME_REVIEW.json', CURRENT_RUNTIME_REVIEW_SHA)
    assert proof['status'] == 'APPROVE_EXACT_34_RUNTIME_BYTES_LOCAL_UNPUBLISHED_ONLY'
    assert proof['baseline'] == 'd31757b922fe2fa1fcf7bd903469e608f4eef6fb'
    assert proof['runtime_inventory_approval'] is True and proof['release_approval'] is False
    assert proof['prior_immutable_authority']['sha256'] == RUNTIME_SHA
    assert proof['prior_implementation_approval_sha256'] == IMPLEMENTATION_SHA
    assert proof['source_authorities']['THERA_261_280_APPROVAL.json']['sha256'] == 'e25da6522df6f88bfcbf5fade43c6a8972d050425f5a6af1e6043d60440f896b'
    files = proof['files']
    expected_delta = ['data/apadana.json', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js']
    assert len(files) == 34 and set(files) == set(previous), 'No current runtime path substitution'
    assert sorted(name for name in files if files[name] != previous[name]) == expected_delta
    assert proof['changed_paths_from_preserved2449'] == expected_delta
    assert files['data/source-notes.json'] == previous['data/source-notes.json']
    assert all(not Path(name).is_absolute() and '..' not in Path(name).parts for name in files)
    return files


CURRENT_308_RUNTIME_REVIEW_SHA = '809efc477aec7bd16c6d5077114ba5932663ecf110076899f9dc5ef85917519f'


def approved_runtime(root):
    # Preserve every previous runtime authority; admit only this exact reviewed
    # inventory with the five finite source308/v35 byte changes.
    previous = reviewed_303_runtime(root)
    proof = sealed(Path(root) / 'docs/evidence/apadana/THERA_281_285_RUNTIME_REVIEW.json', CURRENT_308_RUNTIME_REVIEW_SHA)
    assert proof['schema'] == 'reviewed-current308-runtime-approval-v1'
    assert proof['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_LOCAL_UNPUBLISHED_ONLY'
    assert proof['baseline'] == '929e5c83d4157a0339ab24bb7039e1441a348b2c'
    assert proof['runtime_inventory_approval'] is True and proof['release_or_push_approval'] is False
    assert proof['prior_immutable_authorities'][0]['sha256'] == CURRENT_RUNTIME_REVIEW_SHA
    assert proof['curation']['sha256'] == '52c1813c72685a7a78f4f29ed860035c06e61f1b209f601ed0b2e9a36de3206f'
    assert proof['baseline_compact']['sha256'] == '58a3af1a6a9f817c57c9087551f901993fc47850f1b88a66c2c8b4c0d04e83d2'
    files = proof['files']
    delta = ['data/apadana.json', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js']
    assert len(files) == proof['runtime_files'] == 34 and set(files) == set(previous)
    assert sorted(name for name in files if files[name] != previous[name]) == delta
    assert proof['allowed_changed_paths_from_prior303'] == delta and proof['unchanged_runtime_paths'] == 29
    assert files['data/source-notes.json'] == previous['data/source-notes.json']
    assert all(not Path(name).is_absolute() and '..' not in Path(name).parts for name in files)
    return files


def assert_runtime_records(observed, approved):
    assert observed == approved, 'Exact approved runtime paths, lengths or bytes changed'


def assert_runtime(root, server_dir):
    directory = Path(server_dir)
    observed = {}
    for path in sorted(directory.rglob('*')):
        assert not path.is_symlink(), 'Runtime inventory must contain regular reviewed files'
        if path.is_file():
            raw = path.read_bytes()
            observed[str(path.relative_to(directory)).replace('\\', '/')] = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    assert_runtime_records(observed, approved_runtime(root))
    return {name: item['sha256'] for name, item in observed.items()}
