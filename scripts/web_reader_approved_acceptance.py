"""Finite acceptance oracles from sealed independent reviews, never runtime output.

Historical evidence stays untouched. Current catalogue gates preserve all 325
prior objects and add exactly eight independently reviewed publisher scopes.
Current runtime acceptance requires the separate sealed333 inventory; historical
canonical325 tests use their immutable104 snapshot without a current fallback.
"""
import hashlib
import json
import subprocess
from pathlib import Path

from web_reader_apadana_intake import curated_303_additions, read_281_285, read_287_288, read_292_299, read_301_310, read_312_319

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


def approved308_catalogue(root):
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


def approved310_catalogue(root):
    previous = approved308_catalogue(root)
    current = read_287_288(root)
    evidence = Path(root) / 'docs/evidence/apadana'
    compact = sealed(evidence / current['baseline_freeze']['file'], current['baseline_freeze']['sha256'])
    assert compact['schema'] == 'reviewed-apadana-baseline-compact-v1'
    assert compact['baseline'] == current['base_commit'] == '0f572239fc459001f75cd5265d3eaeac66425b66'
    assert compact['profiles'] == 308 and compact['ordered_ids'] == previous['ids'] == current['baseline_ids']
    assert compact['prior308_authority'] == current['previous_intake']
    assert compact['object_hash_domain'] == 'SHA256 UTF8 compact JSON with preserved insertion order, equivalent to JSON.stringify for these source objects; independently compared for all308.'
    object_sha = lambda value: hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
    assert list(compact['profile_object_sha256']) == list(compact['translation_object_sha256']) == previous['ids']
    for uid in previous['ids']:
        assert object_sha(previous['profiles'][uid]) == compact['profile_object_sha256'][uid], 'Prior308 profile differs from independently reconstructed object: ' + uid
        assert object_sha(previous['links'][uid]) == compact['translation_object_sha256'][uid], 'Prior308 link differs from independently reconstructed object: ' + uid
    assert object_sha(previous['source']) == compact['manifest_source_sha256']
    assert compact['canon_logical_sha256'] == current['before_canon_sha256'] == current['after_canon_sha256']
    assert compact['canon_units'] == 8544 and compact['canon_books'] == 61
    runtime308 = sealed(evidence / 'THERA_281_285_RUNTIME_REVIEW.json', CURRENT_308_RUNTIME_REVIEW_SHA)
    for name, expected in compact['data_file_sha256'].items():
        assert name.startswith('server/data/') and '..' not in Path(name).parts
        assert runtime308['files'][name.removeprefix('server/')]['sha256'] == expected
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
    assert len(ids) == len(set(ids)) == 310 and ids == previous['ids'] + current['approved_ids']
    assert list(profiles) == list(links) == ids
    assert {uid: profiles[uid] for uid in previous['ids']} == previous['profiles'], 'All308 prior full profile objects retained'
    assert {uid: links[uid] for uid in previous['ids']} == previous['links'], 'All308 prior full link objects retained'
    assert len([uid for uid in ids if uid.startswith('thi-ap')]) == 40
    assert len([uid for uid in ids if uid.startswith('tha-ap')]) == 270
    source = dict(previous['source'])
    policy = source['policy']
    assert policy.count('308 finite') == policy.count('268 explicitly mapped Therā') == 1
    source['policy'] = policy.replace('308 finite', '310 finite').replace('268 explicitly mapped Therā', '270 explicitly mapped Therā')
    return {'ids': ids, 'links': links, 'profiles': profiles, 'source': source}


def approved317_catalogue(root):
    previous = approved310_catalogue(root)
    current = read_292_299(root)
    evidence = Path(root) / 'docs/evidence/apadana'
    compact = sealed(evidence / current['baseline_freeze']['file'], current['baseline_freeze']['sha256'])
    assert compact['schema'] == 'reviewed-apadana-baseline-compact-v1'
    assert compact['baseline'] == current['base_commit'] == '3da5b3831af6396447dcc5d23f24cd03c34fdd9c'
    assert compact['profiles'] == 310 and compact['ordered_ids'] == previous['ids'] == current['baseline_ids']
    assert compact['prior310_authority'] == current['previous_intake']
    assert compact['object_hash_domain'] == 'SHA256 UTF8 compact JSON with preserved insertion order, equivalent to JSON.stringify for these source objects; independently compared for all310.'
    object_sha = lambda value: hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
    assert list(compact['profile_object_sha256']) == list(compact['translation_object_sha256']) == previous['ids']
    for uid in previous['ids']:
        assert object_sha(previous['profiles'][uid]) == compact['profile_object_sha256'][uid], 'Prior310 profile differs from independently reconstructed object: ' + uid
        assert object_sha(previous['links'][uid]) == compact['translation_object_sha256'][uid], 'Prior310 link differs from independently reconstructed object: ' + uid
    assert object_sha(previous['source']) == compact['manifest_source_sha256']
    assert compact['canon_logical_sha256'] == current['before_canon_sha256'] == current['after_canon_sha256']
    assert compact['canon_units'] == 8544 and compact['canon_books'] == 61
    runtime310 = sealed(evidence / 'THERA_287_288_RUNTIME_REVIEW.json', CURRENT_310_RUNTIME_REVIEW_SHA)
    for name, expected in compact['data_file_sha256'].items():
        assert name.startswith('server/data/') and '..' not in Path(name).parts
        assert runtime310['files'][name.removeprefix('server/')]['sha256'] == expected
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
    assert len(ids) == len(set(ids)) == 317 and ids == previous['ids'] + current['approved_ids']
    assert list(profiles) == list(links) == ids
    assert {uid: profiles[uid] for uid in previous['ids']} == previous['profiles'], 'All310 prior full profile objects retained'
    assert {uid: links[uid] for uid in previous['ids']} == previous['links'], 'All310 prior full link objects retained'
    assert len([uid for uid in ids if uid.startswith('thi-ap')]) == 40
    assert len([uid for uid in ids if uid.startswith('tha-ap')]) == 277
    source = dict(previous['source'])
    policy = source['policy']
    assert policy.count('310 finite') == policy.count('270 explicitly mapped Therā') == 1
    source['policy'] = policy.replace('310 finite', '317 finite').replace('270 explicitly mapped Therā', '277 explicitly mapped Therā')
    return {'ids': ids, 'links': links, 'profiles': profiles, 'source': source}


def approved325_catalogue(root):
    previous = approved317_catalogue(root)
    current = read_301_310(root)
    evidence = Path(root) / 'docs/evidence/apadana'
    compact = sealed(evidence / current['baseline_freeze']['file'], current['baseline_freeze']['sha256'])
    assert compact['schema'] == 'reviewed-apadana-baseline-compact-v1'
    assert compact['baseline'] == current['base_commit'] == '4c69f023c9fe1093ad8aadf0ac7f3caf766d92f0'
    assert compact['profiles'] == 317 and compact['ordered_ids'] == previous['ids'] == current['baseline_ids']
    assert compact['prior317_authority'] == current['previous_intake']
    assert compact['object_hash_domain'] == 'SHA256 UTF8 compact JSON with preserved insertion order, equivalent to JSON.stringify for these source objects; independently compared for all317.'
    object_sha = lambda value: hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
    assert list(compact['profile_object_sha256']) == list(compact['translation_object_sha256']) == previous['ids']
    for uid in previous['ids']:
        assert object_sha(previous['profiles'][uid]) == compact['profile_object_sha256'][uid], 'Prior317 profile differs from independently reconstructed object: ' + uid
        assert object_sha(previous['links'][uid]) == compact['translation_object_sha256'][uid], 'Prior317 link differs from independently reconstructed object: ' + uid
    assert object_sha(previous['source']) == compact['manifest_source_sha256']
    assert compact['canon_logical_sha256'] == current['before_canon_sha256'] == current['after_canon_sha256']
    assert compact['canon_units'] == 8544 and compact['canon_books'] == 61
    runtime317 = sealed(evidence / 'THERA_292_299_RUNTIME_REVIEW.json', CURRENT_317_RUNTIME_REVIEW_SHA)
    for name, expected in compact['data_file_sha256'].items():
        assert name.startswith('server/data/') and '..' not in Path(name).parts
        assert runtime317['files'][name.removeprefix('server/')]['sha256'] == expected
        if name != 'server/data/apadana.json':
            assert hashlib.sha256((Path(root) / name).read_bytes()).hexdigest() == expected, 'Unrelated data changed: ' + name
    profiles = dict(previous['profiles'])
    links = dict(previous['links'])
    extra_profiles = sealed(evidence / current['expected_profiles']['file'], current['expected_profiles']['sha256'])
    extra_links = sealed(evidence / current['expected_links']['file'], current['expected_links']['sha256'])
    assert list(extra_profiles) == list(extra_links) == current['approved_ids']
    assert not set(extra_profiles) & set(profiles)
    assert not set(extra_profiles) & set(current['held_ids'])
    profiles.update(extra_profiles)
    links.update(extra_links)
    ids = current['expected_profile_ids']
    assert len(ids) == len(set(ids)) == 325 and ids == previous['ids'] + current['approved_ids']
    assert list(profiles) == list(links) == ids
    assert {uid: profiles[uid] for uid in previous['ids']} == previous['profiles'], 'All317 prior full profile objects retained'
    assert {uid: links[uid] for uid in previous['ids']} == previous['links'], 'All317 prior full link objects retained'
    assert len([uid for uid in ids if uid.startswith('thi-ap')]) == 40
    assert len([uid for uid in ids if uid.startswith('tha-ap')]) == 285
    source = dict(previous['source'])
    policy = source['policy']
    assert policy.count('317 finite') == policy.count('277 explicitly mapped Therā') == 1
    source['policy'] = policy.replace('317 finite', '325 finite').replace('277 explicitly mapped Therā', '285 explicitly mapped Therā')
    return {'ids': ids, 'links': links, 'profiles': profiles, 'source': source}


def assert_catalogue(manifest, approved):
    assert manifest['links'] == approved['links'], 'Exact independently reviewed 325 link objects changed'
    assert manifest['source'] == approved['source'], 'Reviewed source rights or finite policy changed'
    assert manifest['held'] == {}, 'Exact frozen317 manifest held metadata changed'


def assert_profiles(root, approved):
    probe = "import{APADANA_PROFILES}from'./src/apadana-profiles.mjs';console.log(JSON.stringify(APADANA_PROFILES));"
    observed = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', probe], cwd=root, encoding='utf-8'))
    assert observed == approved['profiles'], 'Exact independently reviewed 325 profile objects changed'


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


def reviewed_308_runtime(root):
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



CURRENT_310_RUNTIME_REVIEW_SHA = '57c3b1c4efdc5b75b9718f77259c5ef4ee25a85e15b257f6f64b8235f3a71daf'


def reviewed_310_runtime(root):
    # Preserve the exact 308/303/2449 authorities; only these independently
    # reviewed two-source/v36 bytes may replace the five allowed records.
    previous = reviewed_308_runtime(root)
    proof = sealed(Path(root) / 'docs/evidence/apadana/THERA_287_288_RUNTIME_REVIEW.json', CURRENT_310_RUNTIME_REVIEW_SHA)
    assert proof['schema'] == 'reviewed-current310-runtime-approval-v1'
    assert proof['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_LOCAL_UNPUBLISHED_ONLY'
    assert proof['baseline'] == '0f572239fc459001f75cd5265d3eaeac66425b66'
    assert proof['runtime_inventory_approval'] is True and proof['release_or_push_approval'] is False
    assert proof['curation']['sha256'] == 'e159aefc7ad0f2a36a10dffa95fd5cf97650b95969820344f70aee0dd2c7e95e'
    assert proof['baseline_compact']['sha256'] == 'ab925be47a5bbfe8a021443c4e779b7ec56a68ef802fdb2e752f759aa9858c9e'
    assert proof['source_authorities']['expected_profiles']['sha256'] == '469448bac323d2e64f12ed16b5ce8e72439ee2a5471ee58106d3a4e47416df7a'
    assert proof['source_authorities']['expected_links']['sha256'] == 'f56c00dc91c62cad541a57181ca035524939bdcfbff4b89b5263128a3a522848'
    files = proof['files']
    delta = ['data/apadana.json', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js']
    assert len(files) == proof['runtime_files'] == 34 and set(files) == set(previous)
    assert sorted(name for name in files if files[name] != previous[name]) == delta
    assert proof['allowed_changed_paths_from_prior308'] == delta and proof['unchanged_runtime_paths'] == 29
    assert files['data/source-notes.json'] == previous['data/source-notes.json']
    assert all(not Path(name).is_absolute() and '..' not in Path(name).parts for name in files)
    return files



CURRENT_317_RUNTIME_REVIEW_SHA = '3d2a7460cf2a94f1acaa8fbdc49fc359139f574da04510fa6e460e8c1dab3765'


def reviewed_317_runtime(root):
    # Keep every historical 310/308/303/2449 authority intact; admit only this
    # exact independently reviewed seven-source/v37 runtime inventory.
    previous = reviewed_310_runtime(root)
    proof = sealed(Path(root) / 'docs/evidence/apadana/THERA_292_299_RUNTIME_REVIEW.json', CURRENT_317_RUNTIME_REVIEW_SHA)
    assert proof['schema'] == 'reviewed-current317-runtime-approval-v1'
    assert proof['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_LOCAL_UNPUBLISHED_ONLY'
    assert proof['baseline'] == '3da5b3831af6396447dcc5d23f24cd03c34fdd9c'
    assert proof['runtime_inventory_approval'] is True and proof['release_or_push_approval'] is False
    assert proof['curation']['sha256'] == 'a39e811b09749e399b7faea74a4559c159de9a6180867aaa94977c3daba0ba3e'
    assert proof['baseline_compact']['sha256'] == '88c87437c64f70da86d107053d956f8a30a83a0f8f0d3e3e2cd0653014da0f50'
    assert proof['source_authorities']['expected_profiles']['sha256'] == '8942f873599882e63ff182e80fd82ccb89be8a25b04e502dfd1a6f3b0083b340'
    assert proof['source_authorities']['expected_links']['sha256'] == '01889f99c347ba4be1ca32c97f53997f13d8cbbea1a8f31c92271be71da6a736'
    files = proof['files']
    delta = ['data/apadana.json', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js']
    assert len(files) == proof['runtime_files'] == 34 and set(files) == set(previous)
    assert sorted(name for name in files if files[name] != previous[name]) == delta
    assert proof['allowed_changed_paths_from_prior310'] == delta and proof['unchanged_runtime_paths'] == 29
    assert files['data/source-notes.json'] == previous['data/source-notes.json']
    assert all(not Path(name).is_absolute() and '..' not in Path(name).parts for name in files)
    return files


CURRENT_325_RUNTIME_REVIEW_SHA = 'bae09c75ce5bb5d90e62044b60f5ac468e0c3c0569484117e28f938720aabf09'


def reviewed_325_runtime(root):
    # Preserve every historical authority and add this independently reviewed
    # exact eight-source/v38 inventory; metadata approval is not behavior proof.
    previous = reviewed_317_runtime(root)
    proof = sealed(Path(root) / 'docs/evidence/apadana/THERA_301_310_RUNTIME_REVIEW.json', CURRENT_325_RUNTIME_REVIEW_SHA)
    assert proof['schema'] == 'reviewed-current325-runtime-approval-v1'
    assert proof['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_LOCAL_UNPUBLISHED_ONLY'
    assert proof['baseline'] == '4c69f023c9fe1093ad8aadf0ac7f3caf766d92f0'
    assert proof['inventory_only'] is True and proof['runtime_inventory_approval'] is True
    assert proof['behavioral_harness_approval'] is False and proof['full_check_approval'] is False
    assert proof['final_archive_package_approval'] is False and proof['implementation_acceptance'] is False
    assert proof['remote_ci_approval'] is False and proof['release_or_push_approval'] is False
    assert proof['source_authorities']['expected_profiles']['sha256'] == 'e2c5c83e4a9062bd68bb56728e0e536c8a549810fff1071aaa087b7d32bcbaf7'
    assert proof['source_authorities']['expected_links']['sha256'] == '422f6790a7b3866704091d2c70814b600458e61918035966a4746c5ac345f034'
    assert proof['source_authorities']['source_approval']['sha256'] == '276fcc2b31713b8e1553f7a6b05ff6a0d5089d9d71f3f23d2efb6bd00bf598a3'
    assert proof['source_authorities']['independent_source_approval']['sha256'] == 'dc85d778b6d8569cb4231b7e493ff60338de0fc0013744ea37909135f1a253da'
    assert proof['source_authorities']['independent_normalization']['sha256'] == 'e676ddea79a40ef1d6b6c9ed035159ce6f7bff8df317c058c4f77804b0a1f4c3'
    assert proof['curation']['sha256'] == '5b6ee312e81f422e464922a53354800f492c571ec98f837fa119ba01de6c7042'
    assert proof['baseline_full']['sha256'] == 'a1da899a978257b82433f9965e5edb89fcbb6db27a1d6ba28bc35e0da4accd0e'
    assert proof['baseline_compact']['sha256'] == '411a72c6ebc991bc2e2cb9038e415666749954bdad9dc2b14f4b41f5f8f11d43'
    files = proof['files']
    assert len(files) == proof['runtime_files'] == 34 and set(files) == set(previous)
    delta = ['data/apadana.json', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js']
    assert proof['allowed_changed_paths_from_prior317'] == delta and proof['unchanged_runtime_paths'] == 29
    assert [name for name in sorted(files) if files[name] != previous[name]] == delta
    return files


CANONICAL_325_INVENTORY_SHA = '11b2d9865505b2cd09812deadb0bf77c891edde783054c4e2bd4fe34900d4b84'
CANONICAL_325_REVIEW_SHA = 'fc062462c6c6c7e98a285cc833cc1bd59e0a0c47b851b8066f257efc95b85908'


def reviewed_canonical325_runtime(root):
    # Preserve every earlier sealed inventory. The new independent authority
    # admits only the three portable dependency-label rebuilds, not new logic.
    previous = reviewed_325_runtime(root)
    directory = Path(root) / 'docs/evidence/apadana/canonical325'
    proof = sealed(directory / 'CANONICAL_RUNTIME_INVENTORY.json', CANONICAL_325_INVENTORY_SHA)
    review = sealed(directory / 'CANONICAL_BUILD_REVIEW.json', CANONICAL_325_REVIEW_SHA)
    assert proof['schema'] == 'reviewed-current325-canonical-runtime-inventory-v1'
    assert proof['baseline_commit'] == '6555a21f7290a28a893a8dfb3aa37117ff13afd6'
    assert proof['old_runtime_authority_sha256'] == CURRENT_325_RUNTIME_REVIEW_SHA
    assert review['status'] == 'GO_EXACT_RESTRICTED_THREE_CJS_PATH_CANONICALIZATION_ONLY'
    assert review['old_commit'] == proof['baseline_commit']
    assert review['old_runtime_authority_sha256'] == CURRENT_325_RUNTIME_REVIEW_SHA
    assert review['expected_inventory_derived_from_old_sealed_git_bytes'] is True
    assert review['current_runtime_not_used_as_expectation'] is True
    assert review['new_inventory']['sha256'] == CANONICAL_325_INVENTORY_SHA
    files = proof['files']
    delta = ['http-worker.cjs', 'http.cjs', 'index.cjs']
    assert len(files) == review['runtime_paths'] == 34 and set(files) == set(previous)
    assert review['changed_paths'] == 3 and review['unchanged_paths'] == 31
    assert [name for name in sorted(files) if files[name] != previous[name]] == delta
    assert [change['path'] for change in review['changes']] == delta
    for change, count in zip(review['changes'], [222, 230, 222]):
        assert change['old'] == previous[change['path']]
        assert change['derived_new'] == files[change['path']]
        assert change['actual_matches_derived'] is True and change['prefix_occurrences'] == count
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


def approved_catalogue(root):
    """Extend the exact historical catalogue with eight independently sealed objects."""
    previous = approved325_catalogue(root)
    current = read_312_319(root)
    directory = Path(root) / 'docs/evidence/apadana'
    compact = sealed(directory / current['baseline_freeze']['file'], current['baseline_freeze']['sha256'])
    assert compact['ids'] == previous['ids'] == current['baseline_ids']
    assert compact['profile_count'] == compact['translation_count'] == 325
    object_sha = lambda value: hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')).hexdigest()
    assert list(compact['profile_object_sha256']) == list(compact['translation_object_sha256']) == previous['ids']
    for uid in previous['ids']:
        assert object_sha(previous['profiles'][uid]) == compact['profile_object_sha256'][uid], 'Full pinned104 profile changed: ' + uid
        assert object_sha(previous['links'][uid]) == compact['translation_object_sha256'][uid], 'Full pinned104 link changed: ' + uid
    assert object_sha(previous['source']) == compact['manifest_source_sha256']
    assert compact['canonical_logical_sha256'] == current['before_canon_sha256'] == current['after_canon_sha256']
    assert len(compact['data_file_sha256']) == 26
    for name, expected in compact['data_file_sha256'].items():
        assert name.startswith('server/data/') and '..' not in Path(name).parts and name != 'server/data/apadana.json'
        assert hashlib.sha256((Path(root) / name).read_bytes()).hexdigest() == expected, 'Unrelated pinned104 data changed: ' + name
    profiles, links = dict(previous['profiles']), dict(previous['links'])
    extra_profiles = sealed(directory / current['expected_profiles']['file'], current['expected_profiles']['sha256'])
    extra_links = sealed(directory / current['expected_links']['file'], current['expected_links']['sha256'])
    assert list(extra_profiles) == list(extra_links) == current['approved_ids']
    assert not set(extra_profiles) & (set(profiles) | set(current['held_ids']))
    profiles.update(extra_profiles)
    links.update(extra_links)
    ids = current['expected_profile_ids']
    assert list(profiles) == list(links) == ids == previous['ids'] + current['approved_ids']
    assert len(ids) == len(set(ids)) == 333
    assert sum(uid.startswith('thi-ap') for uid in ids) == 40
    assert sum(uid.startswith('tha-ap') for uid in ids) == 293
    assert {uid: profiles[uid] for uid in previous['ids']} == previous['profiles']
    assert {uid: links[uid] for uid in previous['ids']} == previous['links']
    source = dict(previous['source'])
    policy = source['policy']
    assert policy.count('325 finite') == policy.count('285 explicitly mapped Therā') == 1
    source['policy'] = policy.replace('325 finite', '333 finite').replace('285 explicitly mapped Therā', '293 explicitly mapped Therā')
    return {'ids': ids, 'links': links, 'profiles': profiles, 'source': source}


INDEPENDENT_333_INVENTORY_SHA = '2d6c97ba2ff5728324c487ee3244bd86d016b77a3761ad89c61a0a9ac4a2b8a7'
INDEPENDENT_333_REVIEW_SHA = 'a0174f27978b598aca0b7a674b571dc731833861cdd90f9a7358004c68295b6f'


def approved_runtime(root):
    """Require the intact canonical325 chain before the independent333 authority."""
    previous = reviewed_canonical325_runtime(root)
    directory = Path(root) / 'docs/evidence/apadana/runtime333'
    inventory = sealed(directory / 'INDEPENDENT333_RUNTIME_INVENTORY.json', INDEPENDENT_333_INVENTORY_SHA)
    review = sealed(directory / 'INDEPENDENT333_RUNTIME_REVIEW.json', INDEPENDENT_333_REVIEW_SHA)
    assert inventory['schema'] == 'independent-reviewed-current333-runtime-inventory-v1'
    assert review['schema'] == 'reviewed-current333-runtime-approval-v1'
    assert review['status'] == 'APPROVE_EXACT_CURRENT34_RUNTIME_INVENTORY_SOURCE_SCOPE_ONLY'
    assert inventory['baseline_commit'] == review['baseline'] == '104b57a6891ddae645c51e39eb3d27b89b64ffdf'
    assert inventory['candidate_commit'] == review['candidate_commit'] == '446bdb361da0926bc02d6d70b0e8de32d053be7a'
    assert inventory['prior_canonical325_inventory_sha256'] == CANONICAL_325_INVENTORY_SHA
    assert review['independent_inventory']['sha256'] == INDEPENDENT_333_INVENTORY_SHA
    assert review['curation'] == {'file': 'THERA_312_319_APPROVAL.json',
        'sha256': 'cc8480e22bb9a1615af86cee2e153c77695f4d20c21fd8f147e31f8658ca610d'}
    assert review['prior_immutable_authorities']['precanonical325_runtime'] == CURRENT_325_RUNTIME_REVIEW_SHA
    assert review['prior_immutable_authorities']['canonical325_inventory'] == CANONICAL_325_INVENTORY_SHA
    assert review['prior_immutable_authorities']['canonical325_review'] == CANONICAL_325_REVIEW_SHA
    assert review['inventory_only'] is True and review['runtime_inventory_approval'] is True
    assert review['finite_source_diff_approval'] is True and review['behavioral_harness_approval'] is False
    assert review['release_or_push_approval'] is False and inventory['behavioral_or_release_approval'] is False
    files = inventory['files']
    delta = ['data/apadana.json', 'http-worker.cjs', 'http.cjs', 'index.cjs', 'web/reader.js']
    assert len(files) == inventory['runtime_files'] == review['runtime_files'] == 34
    assert set(files) == set(previous) and review['files'] == files
    assert inventory['allowed_changed_paths'] == review['allowed_changed_paths_from_prior_canonical325'] == delta
    assert [name for name in sorted(files) if files[name] != previous[name]] == delta
    assert inventory['unchanged_paths'] == review['unchanged_runtime_paths'] == 29
    assert files['data/source-notes.json'] == previous['data/source-notes.json']
    assert all(not Path(name).is_absolute() and '..' not in Path(name).parts for name in files)
    return files
