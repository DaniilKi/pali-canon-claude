"""Finite reviewed368 QA authorities. No application loader or API projection.

Only metadata/hashes and the explicitly frozen359 test input are bundled.
Physical proofs are read on every public operation and private binding check.
"""
import hashlib
import json
from pathlib import Path
import re
from threading import get_ident
from types import MappingProxyType

BASE = '3cedb7b7a71a42db1601026cb6d995dafe43c9ce'
CANON = 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
DIRECTORY = 'docs/evidence/apadana/english351-360-nine'
IDS = ('tha-ap353','tha-ap354','tha-ap355','tha-ap356','tha-ap357','tha-ap358','tha-ap359','tha-ap361','tha-ap362')
PUBLISHERS = (351,352,353,354,355,356,357,359,360)
AP_PATH = 'server/data/apadana.json'
AP_FIXTURE = 'tests/fixtures/canon-before-intake368/apadana.json'
PINS = {'PROFILES.json': 'a9ce377c7ec5c75fff7315c45dbd0328b7164dd4120b83b3f7c8a6406df6a367',
 'SOURCE_REVIEW.json': '8a8d2f5f0e17d8cd409c0bc7bc8a84e162546a41a415af4e61bfe5c30566cd2a',
 'REQUIRED_NOTICES.json': 'c46e9a1514228f854ef7c885c3a601af94f47540e6f4c7c0830787a4c2c39aa1',
 'BASELINE_RUNTIME34.json': '71657c25dcfff1c0f62dc4b25587da625affee4706fc1cf39a5258214b258388',
 'BASELINE_DATA27.json': 'dd966b7c27ab362362afbb068678be795cdeb20f746c8f4bfd83d77a97dd05b5',
 'LINKS.json': '49c53fa616ac61c135705e97215c381426d344af3141c217eb8c72f9a48c566d',
 'SOURCE_BINDINGS.json': '172d9cf87739745c42b9de9cd701992d0ee4f6854138f5cadfafb8d3e3ce032f',
 'ORIGINAL_INDEPENDENT_REVIEW.json': '90918b7fde8ac9939750e794154f0143fb725e6a3d98d9fcda9f73c4727c935f',
 'BASELINE359.json': 'b7e7ffee7ef33471f129a5ad2b5b2c8a4098fc7d7ef37f71b319996fe62f858f',
 'EXPECTED_MANIFEST.json': '3d426b9b0e1e10a9b095bce495494c0564b25e9b4765be3277407788b8c312a3',
 'PROFILE_SCHEMA_REVIEW.json': '547c1600b8c40e6b17a9b3d04c25ce9f7c14158e5a7553f9528db76cd9cbfb51',
 'BASELINE359_FULL_OBJECTS.json': 'dbd15ba96431779a1f8e4951605b009ab920df7e01da9f5663a270a605fd2864',
 'SOURCE_CURATION.json': 'e63797167324aa310a3359a257e0c459c490b0c9cb636984542b706eb9c42e18',
 'APPROVAL.json': '77f0fe797f4b768e6d408d81080984b4c3ca803bd8fc7a23e776eb17a71bbb14'}

RUNTIME_NAME = 'RUNTIME_INVENTORY.json'
REVIEW_NAME = 'RUNTIME_REVIEW.json'
RUNTIME_SHA = 'a9043c14b7774d69d97e2327300cf437257cd71c12e3e39f8f5de68010941425'
REVIEW_SHA = '38fbf6b7de3cb7f06f03e28a41bf03b6a5402940b6d8b2ebb09d142365f1160e'
APPLICATION_COMMIT = 'aebbf84d8e008a2eb5d1a3cf88e0934cf84dc524'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()


def _regular(root, name):
    # Reuse only the finite physical-file primitive, never an old data capture.
    from web_reader_next_ten_boundary_history import regular
    return regular(root, name)


def _sealed_bytes(root, name, pin):
    if type(pin) is not str or re.fullmatch('[a-f0-9]{64}', pin) is None:
        raise ValueError('Pending independent368 authority; no fallback')
    raw = _regular(root, DIRECTORY + '/' + name)
    assert digest(raw) == pin, 'Changed independent368 authority: ' + name
    return raw


def _sealed(root, name, pin):
    return json.loads(_sealed_bytes(root, name, pin))


def fresh_proofs(root):
    # Physical rereads; no mtime/inode/root-global cache. No repeated JSON parse.
    for name, pin in (*PINS.items(), (RUNTIME_NAME, RUNTIME_SHA), (REVIEW_NAME, REVIEW_SHA)):
        if re.fullmatch('[a-f0-9]{64}', pin) is None:
            raise ValueError('Pending independent368 authority; no fallback')
        assert digest(_regular(root, DIRECTORY + '/' + name)) == pin


def _authority_with_bytes(root):
    raw_proofs = {name: _sealed_bytes(root, name, pin) for name, pin in PINS.items()}
    proof = {name: json.loads(raw) for name, raw in raw_proofs.items()}
    a, old, compact_old = proof['APPROVAL.json'], proof['BASELINE359_FULL_OBJECTS.json'], proof['BASELINE359.json']
    assert a['schema'] == 'reviewed-thera351-360-nine-approval-v1' and a['status'] == 'approved'
    assert a['base_commit'] == old['commit'] == compact_old['commit'] == BASE
    assert a['canonical_logical_sha256'] == compact_old['canonical_logical_sha256'] == CANON
    assert a['source_and_normalization_only'] is True
    assert a['runtime_approval'] is a['release_approval'] is False
    assert a['publisher_revision'] == 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
    assert a['vri_revision'] == '2d134ff9ef60f70a1eb03c9370580228811a3070'
    assert a['approved_ids'] == list(IDS)
    assert a['approved_records'] == [{'id': uid, 'publisher_chapter': 'chapter-3', 'poem': p} for uid, p in zip(IDS, PUBLISHERS)]
    curation = proof['SOURCE_CURATION.json']
    assert curation['schema'] == 'english9-independent-source-curation-v1'
    assert curation['status'] == 'APPROVED_EXACT_SOURCE_AND_NORMALIZED_METADATA_SCOPES_NOT_RUNTIME'
    assert curation['canonical_logical_sha256'] == CANON
    assert curation['canonical_ids'] == list(IDS) and curation['publishers'] == list(PUBLISHERS)
    assert curation['runtime_reader_package_CI_activation_release_approval'] is False
    fields = {'source_curation':'SOURCE_CURATION.json','baseline_freeze':'BASELINE359.json','baseline_full_objects':'BASELINE359_FULL_OBJECTS.json', 'expected_profiles':'PROFILES.json','expected_links':'LINKS.json','expected_manifest':'EXPECTED_MANIFEST.json','independent_source_review':'SOURCE_REVIEW.json','profile_schema_review':'PROFILE_SCHEMA_REVIEW.json','source_bindings':'SOURCE_BINDINGS.json','required_notices':'REQUIRED_NOTICES.json'}
    for field, name in fields.items():
        assert a[field] == {'file': name, 'sha256': PINS[name]}
    ids = compact_old['ids']
    assert compact_old['schema'] == 'current359-freeze-before-english9-v1'
    assert old['schema'] == 'reviewed-current359-preservation-before-english9-v1'
    assert len(ids) == len(set(ids)) == 359 and a['baseline_ids'] == ids
    assert list(old['profiles']) == list(old['links']) == ids
    for uid in ids:
        assert digest(compact(old['profiles'][uid])) == compact_old['profile_object_sha256'][uid]
        assert digest(compact(old['links'][uid])) == compact_old['translation_object_sha256'][uid]
    assert old['manifest_source'] == compact_old['manifest_source']
    source, peer = proof['SOURCE_REVIEW.json'], proof['PROFILE_SCHEMA_REVIEW.json']
    original = proof['ORIGINAL_INDEPENDENT_REVIEW.json']
    assert original['schema'] == 'independent-next-nine-profile-link-source-review-v1'
    assert original['status'] == 'GO_EXACT_NINE_PROFILES_LINKS_AND_EXISTING_SCHEMA_SOURCE_METADATA_ONLY'
    assert original['baseline_commit'] == BASE
    assert original['profiles_sha256'] == PINS['PROFILES.json'] and original['links_sha256'] == PINS['LINKS.json']
    assert original['literal_selected_pairs'] == [[poem, uid] for uid, poem in zip(IDS, PUBLISHERS)]
    assert original['held_exclusion'] == {'publisher':358, 'id':'tha-ap360', 'remains_held':True}
    assert original['runtime_API_package_CI_activation_deployment_release_approval'] is False
    for wrapper in (source, peer):
        assert wrapper['original_independent_review'] == {'file':'ORIGINAL_INDEPENDENT_REVIEW.json', 'sha256':PINS['ORIGINAL_INDEPENDENT_REVIEW.json']}
        assert wrapper['transport_wrapper_only'] is True
    assert source['status'] == 'GO_NINE_EXACT_SOURCE_AND_NORMALIZED_METADATA_SCOPES_ONLY' and source['canonical_sha256'] == CANON
    assert source['schema'] == 'independent-reviewed-nine-source-metadata-approval-v1'
    assert source['baseline_commit'] == BASE
    assert source['publisher_revision'] == a['publisher_revision'] and source['vri_revision'] == a['vri_revision']
    assert source['approved_ids'] == list(IDS) and source['approved_records'] == a['approved_records']
    assert source['profiles_sha256'] == PINS['PROFILES.json'] and source['links_sha256'] == PINS['LINKS.json']
    assert source['runtime_API_activation_release_approval'] is False
    assert peer['schema'] == 'independent-nine-profile-schema-approval-v1'
    assert peer['approved_ids'] == list(IDS) and peer['approved_records'] == a['approved_records']
    assert peer['status'] == 'GO_EXACT_NINE_PROFILES_LINKS_AND_SEPARATE_SUMMARY_SOURCE_METADATA_ONLY'
    assert peer['package_CI_activation_release_approval'] is peer['parser_API_reader_behavior_verified'] is False
    assert peer['source_review_sha256'] == PINS['SOURCE_REVIEW.json']
    assert peer['final_profiles_sha256'] == PINS['PROFILES.json'] and peer['final_links_sha256'] == PINS['LINKS.json']
    profiles, links, manifest = (proof[name] for name in ('PROFILES.json','LINKS.json','EXPECTED_MANIFEST.json'))
    bindings, notices = proof['SOURCE_BINDINGS.json'], proof['REQUIRED_NOTICES.json']
    assert bindings['schema'] == 'next-nine-exact-source-normalization-canonical-bindings-v1'
    assert bindings['baseline_commit'] == BASE and bindings['canonical_logical_sha256'] == CANON
    assert bindings['publisher_revision'] == a['publisher_revision'] and bindings['vri_revision'] == a['vri_revision']
    assert bindings['literal_selected_pairs'] == [{'publisher':poem, 'id':uid} for uid, poem in zip(IDS, PUBLISHERS)]
    assert list(bindings['per_poem']) == list(IDS) and bindings['runtime_parser_API_activation_approval'] is False
    assert type(bindings['original_notes_poem_owned']) is int and bindings['original_notes_poem_owned'] == 38
    assert type(bindings['summary_notes']) is type(bindings['paratext_notes']) is int
    assert bindings['summary_notes'] == bindings['paratext_notes'] == 0
    assert curation['raw_input_source_bindings_sha256'] == PINS['SOURCE_BINDINGS.json']
    assert curation['required_notices_sha256'] == PINS['REQUIRED_NOTICES.json']
    assert notices['schema'] == 'next-nine-required-license-formatting-and-edition-notices-v1'
    assert notices['license'] == 'CC BY-NC-SA 4.0' and notices['translator'] == 'Jonathan S. Walters'
    assert notices['publisher'] == 'Jonathan S. Walters and Whitman College'
    assert notices['rights_or_runtime_activation_approval_granted_by_this_proposal'] is False
    assert notices['chapter36_scope_policy'] == {'held_publishers':[358], 'whole_chapter_translation_approved':False, 'descriptor_schema_unchanged':True}
    assert [{'path':row['path'], 'sha256':row['sha256']} for row in notices['exact_rights_artifacts']] == old['manifest_source']['rights_artifacts']
    assert list(profiles) == list(links) == list(IDS) and not set(IDS) & set(ids)
    for uid, poem in zip(IDS, PUBLISHERS):
        p = profiles[uid]
        assert (p['id'], p['poem'], p['publisher_chapter'], p['path']) == (uid, poem, 'chapter-3', '/text/chapter-3/poem-' + str(poem) + '/')
        assert p['translation_revision'] == a['publisher_revision'] and p['license'] == 'CC BY-NC-SA 4.0'
        assert not {'text','translator_notes','publisher_paratext','raw','body','notes'} & set(p)
        row = bindings['per_poem'][uid]
        assert row['publisher_poem'] == poem
        assert row['source_normalization_profile_hashes'] == {name:p[name] for name in ('raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256','publisher_heading_sha256')}
        assert row['source']['sha256'] == p['raw_sha256']
        assert [note['number'] for note in row['original_note_owners']] == p['note_numbers']
        assert p['note_count'] == len(p['note_numbers'])
        assert row['paratext']['note_numbers'] == [] and row['paratext']['body_sha256'] == p['paratext_sha256']
        assert row['chapter_summary'] == p.get('chapter_summary')
        assert row['normalization_hashes_are_not_runtime_API_acceptance'] is True
    all_ids = ids + list(IDS)
    assert a['expected_profile_ids'] == all_ids and len(all_ids) == 368
    assert list(manifest) == ['version','source','vri_commit','held','links'] and manifest['version'] == 1
    assert manifest['held'] == {} and manifest['vri_commit'] == a['vri_revision']
    assert list(manifest['links']) == all_ids and manifest['links'] == {**old['links'], **links}
    old_policy = old['manifest_source']['policy']
    assert old_policy.count('359 finite') == old_policy.count('319 explicitly mapped Therā') == 1
    expected_source = dict(old['manifest_source'])
    expected_source['policy'] = old_policy.replace('359 finite','368 finite').replace('319 explicitly mapped Therā','328 explicitly mapped Therā')
    assert manifest['source'] == expected_source
    assert a['previous_holds_remain_unchanged'] is True
    assert a['source_holds_within_publisher351_360'] == ['tha-ap360']
    assert 'tha-ap360' not in all_ids
    baseline_data, baseline_runtime = proof['BASELINE_DATA27.json'], proof['BASELINE_RUNTIME34.json']
    assert baseline_data['commit'] == baseline_runtime['commit'] == BASE
    assert len(baseline_data['files']) == 27 and len(baseline_runtime['files']) == 34
    for name, row in baseline_data['files'].items():
        assert name.startswith('server/data/') and baseline_runtime['files'][name.removeprefix('server/')] == row
    return proof, raw_proofs


def _authority(root):
    proof, _raw_proofs = _authority_with_bytes(root)
    return proof


def _runtime_with_bytes(root, previous, proof):
    assert previous == proof['BASELINE_RUNTIME34.json']['files']
    raw_proofs = {RUNTIME_NAME: _sealed_bytes(root, RUNTIME_NAME, RUNTIME_SHA),
                  REVIEW_NAME: _sealed_bytes(root, REVIEW_NAME, REVIEW_SHA)}
    inv, review = (json.loads(raw_proofs[name]) for name in (RUNTIME_NAME, REVIEW_NAME))
    assert re.fullmatch('[a-f0-9]{40}', APPLICATION_COMMIT)
    assert inv['schema'] == 'independent-reviewed-intake368-runtime-inventory-v1'
    assert review['schema'] == 'reviewed-intake368-runtime-approval-v1'
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
    assert delta == inv['allowed_changed_paths'] == review['allowed_changed_paths_from_3ced']
    assert inv['unchanged_paths'] == review['unchanged_runtime_paths'] == 34 - len(delta)
    assert 'data/apadana.json' in delta
    assert set(delta) <= {'data/apadana.json','http-worker.cjs','http.cjs','index.cjs','web/reader.js','THIRD_PARTY_LICENSES.txt'}
    for name, row in files.items():
        assert type(name) is str and not name.startswith('/') and all(p not in ('','.','..') for p in name.split('/'))
        assert set(row) == {'bytes','sha256'} and type(row['bytes']) is int and row['bytes'] > 0
        assert type(row['sha256']) is str and re.fullmatch('[a-f0-9]{64}', row['sha256'])
        if name.startswith('data/') and name != 'data/apadana.json':
            assert row == previous[name]
    return files, raw_proofs


def _runtime(root, previous, proof):
    files, _raw_proofs = _runtime_with_bytes(root, previous, proof)
    return files


class _OperationProofBytes:
    """Immutable verified bytes, owned by exactly one live private operation."""
    __slots__ = ("_root", "_thread", "_active", "_claimant", "_raw", "_pins", "_directory")

    def __init__(self, root, raw):
        from web_reader_next_ten_boundary_history import _physical_root
        pins = {**PINS, RUNTIME_NAME: RUNTIME_SHA, REVIEW_NAME: REVIEW_SHA}
        if type(raw) is not dict or list(raw) != list(pins):
            raise ValueError("Exact closed368 proof bytes required")
        for name, pin in pins.items():
            if type(raw[name]) is not bytes or digest(raw[name]) != pin:
                raise ValueError("Unverified368 proof snapshot")
        object.__setattr__(self, "_directory", DIRECTORY)
        object.__setattr__(self, "_pins", tuple(pins.items()))
        object.__setattr__(self, "_root", _physical_root(root))
        object.__setattr__(self, "_thread", get_ident())
        object.__setattr__(self, "_active", True)
        object.__setattr__(self, "_claimant", None)
        object.__setattr__(self, "_raw", MappingProxyType(dict(raw)))

    def __setattr__(self, name, value):
        raise AttributeError("Operation proof bytes are immutable")

    def _claim(self, claimant):
        from web_reader_next_ten_boundary_history import _NextTenBinding
        if (type(claimant) is not _NextTenBinding or claimant._root != self._root or
                not self._active or self._thread != get_ident() or self._claimant is not None):
            raise ValueError("Closed, foreign-thread or already claimed368 proofs")
        object.__setattr__(self, "_claimant", claimant)

    def _check_owner(self, root, claimant):
        from web_reader_next_ten_boundary_history import _NextTenBinding
        if (not self._active or self._thread != get_ident() or self._claimant is None or
                type(claimant) is not _NextTenBinding or self._claimant is not claimant or
                root != self._root or claimant._proof368_identity is not self or
                type(self._raw) is not MappingProxyType or
                self._raw is not claimant._proof368_raw_identity):
            raise ValueError("Foreign, closed or substituted368 proof snapshot")
        pins = {**PINS, RUNTIME_NAME: RUNTIME_SHA, REVIEW_NAME: REVIEW_SHA}
        if (DIRECTORY != self._directory or self._pins != tuple(pins.items()) or
                tuple(self._raw) != tuple(pins) or
                any(type(raw) is not bytes for raw in self._raw.values())):
            raise ValueError("Changed closed368 proof configuration")

    def _fresh(self, root, claimant):
        from web_reader_next_ten_boundary_history import _physical_root
        self._check_owner(_physical_root(root), claimant)
        for name, expected in self._raw.items():
            # Every access still performs the same guarded physical read. Exact
            # bytes equal the SHA-verified immutable bytes from THIS operation.
            assert _regular(root, DIRECTORY + "/" + name) == expected

    def _close(self):
        object.__setattr__(self, "_active", False)
        object.__setattr__(self, "_claimant", None)
        object.__setattr__(self, "_raw", MappingProxyType({}))
        object.__setattr__(self, "_pins", ())


def _capture_authority_with_proof_bytes(root, previous):
    """One parsed immutable source graph per operation; no current corpus read here."""
    proof, source_bytes = _authority_with_bytes(root)
    files, runtime_bytes = _runtime_with_bytes(root, previous, proof)
    raw = _regular(root, AP_FIXTURE)
    assert {'bytes':len(raw), 'sha256':digest(raw)} == proof['BASELINE_DATA27.json']['files'][AP_PATH]
    frozen = json.loads(raw)
    assert frozen['links'] == proof['BASELINE359_FULL_OBJECTS.json']['links']
    assert frozen['source'] == proof['BASELINE359_FULL_OBJECTS.json']['manifest_source']
    old = proof['BASELINE359_FULL_OBJECTS.json']
    previous_catalogue = {'ids':list(old['profiles']), 'profiles':old['profiles'], 'links':old['links'], 'source':old['manifest_source']}
    manifest = proof['EXPECTED_MANIFEST.json']
    profiles = {**old['profiles'], **proof['PROFILES.json']}
    current_catalogue = {'ids':list(profiles), 'profiles':profiles, 'links':manifest['links'], 'source':manifest['source']}
    catalogue = compact({'previous':previous_catalogue, 'current':current_catalogue, 'manifest':manifest})
    snapshot = _OperationProofBytes(root, {**source_bytes, **runtime_bytes})
    return files, raw, catalogue, manifest, snapshot


def _capture_authority_with_manifest(root, previous):
    files, raw, catalogue, manifest, snapshot = _capture_authority_with_proof_bytes(root, previous)
    try:
        return files, raw, catalogue, manifest
    finally:
        snapshot._close()


def capture_authority(root, previous):
    # Preserve the public three-value QA interface; the manifest is local only.
    files, raw, catalogue, _manifest = _capture_authority_with_manifest(root, previous)
    return files, raw, catalogue


def fixture_names():
    return tuple(DIRECTORY + '/' + name for name in (*PINS, RUNTIME_NAME, REVIEW_NAME)) + (AP_FIXTURE,)
