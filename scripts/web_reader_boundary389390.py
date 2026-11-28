"""Fixed current Kadalī/Panasa canonical-context/runtime adapter.

English380 authority stays pure and F3-historical. Each public capture calls its
source decoder once, reads the closed254 proof union and actual27 data once.
No historical runtime capture, inverse projection, callback or trust cache.
Named seal placeholders deliberately refuse until root binds reviewed bytes.
"""
from copy import deepcopy
import json
import re
import web_reader_intake380 as english380
from web_reader_intake375 import (_physical_root, _relative, _regular, _sha,
                                  _require, _row)

BASE_COMMIT = '40d27f3bc8af2386ee253c32174652a9bbad0153'
OLD_CANON = 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
CANON = '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'
SOURCE_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
NAMESPACE = 'apadana-thera389-390-v1'
DIRECTORY = 'docs/evidence/apadana/thera389-390'
PINS = {'CURRENT_CANON_BINDING.json':'3b9cf33ff529ec5e950cf07bdf1aec0ed1edcf41123d9c975958c2f66e2d31e9',
        'RUNTIME_INVENTORY.json':'fa46d776a08100d79117bd415f29a16f8fa4d2a37a8ef4918acccea88f30256b',
        'RUNTIME_REVIEW.json':'6601b6252c7734f5cc755c8b0c0de013dbbd26aaf0e9df070962317fd1de9f80'}
TARGETS = ('tha-ap389', 'tha-ap390')
CHANGED_PATHS = ('data/canon.json.gz.part-0002','data/canon.json.gz.parts.json',
                 'data/parallels.json.gz','http-worker.cjs','http.cjs','index.cjs','web/reader.js')
OLD_UNITS = {'tha-ap389': {'id': 'tha-ap389', 'book': 36, 'start': 11045, 'end': 11067, 'title': 'Kadaliphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 389', 'vri': '37–43', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}}, 'tha-ap390': {'id': 'tha-ap390', 'book': 36, 'start': 11067, 'end': 11081, 'title': 'Panasaphaladāyakattheraapadāna', 'collection': 'ap', 'acronym': 'Tha Ap 390', 'vri': '44–48', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}}}
NEW_UNITS = {'tha-ap389': {'id': 'tha-ap389', 'book': 36, 'start': 11045, 'end': 11063, 'title': 'Kadaliphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 389', 'vri': '37–42', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}, 'index_revision': 'apadana-thera389-390-v1'}, 'tha-ap390': {'id': 'tha-ap390', 'book': 36, 'start': 11063, 'end': 11081, 'title': 'Panasaphaladāyakattheraapadānaṃ', 'collection': 'ap', 'acronym': 'Tha Ap 390', 'vri': '43–48', 'pts': {'volume': 1, 'page': 297, 'end_page': 297}, 'index_revision': 'apadana-thera389-390-v1'}}
BINDING_KEYS = ('schema', 'status', 'base_commit', 'source_commit', 'old_canonical_logical_sha256', 'new_canonical_logical_sha256', 'namespace', 'targets', 'old_units', 'new_units', 'preservation', 'english_profiles_sha256_JSON_stringify', 'english_links_sha256_JSON_stringify', 'held_sha256_JSON_stringify', 'evidence', 'source_only', 'behavioral_or_release_approval')
RUNTIME_KEYS = ('schema', 'baseline_commit', 'candidate_commit', 'canonical_binding_sha256', 'canonical_logical_sha256', 'predecessor_inventory_sha256', 'runtime_files', 'files', 'allowed_changed_paths', 'unchanged_paths', 'inventory_only', 'behavioral_or_release_approval')
REVIEW_KEYS = ('schema', 'status', 'inventory_sha256', 'canonical_binding_sha256', 'application_commit', 'baseline_commit', 'predecessor_inventory_sha256', 'runtime_paths', 'actual_data_paths', 'changed_paths', 'unchanged_paths', 'canonical_logical_sha256', 'namespace', 'preservation', 'physical_and_Git_blob_inventory_exact', 'behavioral_installed_browser_native_CI_or_release_approval', 'operations')
PRESERVATION = {'source_books': 61, 'other_units': 8542, 'commentary_unchanged': True, 'english_profiles': 380, 'english_links': 380, 'held_unchanged': True, 'accepted_citations': 5327, 'shared_links': 1518}


def _pin(value):
    _require(type(value) is str and re.fullmatch('[a-f0-9]{64}',value) is not None,
             'Unsealed boundary389390 authority; no historical runtime fallback')


def _keys(value,names,message):
    _require(type(value) is dict and set(value)==set(names),message)


def _typed(value):
    return json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))


def _object_sha(value):
    # Same ordered compact JSON domain as the finite source metadata maps.
    return _sha(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode('utf-8'))


def _sealed(root,name,pin):
    _pin(pin)
    raw=_regular(root,name)
    _require(_sha(raw)==pin,'Changed boundary389390 authority: '+name)
    try:value=json.loads(raw)
    except (ValueError,UnicodeError) as error:
        raise ValueError('Invalid sealed boundary389390 JSON: '+name) from error
    _require(type(value) is dict,'Sealed boundary389390 object required')
    return value


def _read_row(root,name,row):
    _keys(row,('bytes','sha256'),'Exact runtime byte/hash row required')
    _row(row)
    raw=_regular(root,name)
    _require(len(raw)==row['bytes'] and _sha(raw)==row['sha256'],
             'Changed actual current boundary runtime: '+name)
    return raw


def _source_metadata_pins():
    names=english380._source_metadata_pins()
    name=DIRECTORY+'/CURRENT_CANON_BINDING.json'
    _require(name not in names,'Overlapping current source metadata')
    names[name]=PINS['CURRENT_CANON_BINDING.json']
    _require(len(names)==20,'Preserved19 English source documents plus canonical binding required')
    return names


def _all_metadata_pins():
    names=english380._all_metadata_pins()
    for leaf,pin in PINS.items():
        name=DIRECTORY+'/'+leaf
        _require(name not in names,'Overlapping old/new metadata')
        names[name]=pin
    _require(len(names)==28,'Exact old25 plus new3 metadata required')
    return names


def _binding(root,english):
    binding=_sealed(root,DIRECTORY+'/CURRENT_CANON_BINDING.json',PINS['CURRENT_CANON_BINDING.json'])
    _keys(binding,BINDING_KEYS,'Exact current canonical binding fields required')
    _require(binding['schema']=='reviewed-boundary389390-current-canon-binding-v1' and
             binding['status']=='APPROVED_SOURCE_BOUNDARY_AND_PARALLELS_BINDING_ONLY' and
             binding['base_commit']==BASE_COMMIT and binding['source_commit']==SOURCE_COMMIT and
             binding['old_canonical_logical_sha256']==OLD_CANON and
             binding['new_canonical_logical_sha256']==CANON and binding['namespace']==NAMESPACE and
             type(binding['targets']) is list and binding['targets']==list(TARGETS) and
             binding['source_only'] is True and binding['behavioral_or_release_approval'] is False,
             'Exact reviewed F3 to883d canonical source transition required')
    _require(_typed(binding['old_units'])==_typed(OLD_UNITS) and
             _typed(binding['new_units'])==_typed(NEW_UNITS) and
             _typed(binding['preservation'])==_typed(PRESERVATION),
             'Complete typed pair/preservation metadata changed')
    _require(binding['english_profiles_sha256_JSON_stringify']==_object_sha(english['profiles']) and
             binding['english_links_sha256_JSON_stringify']==_object_sha(english['links']) and
             binding['held_sha256_JSON_stringify']==_object_sha(english['selection']['held_ids']),
             'All380 ordered English objects and explicit ordered held IDs must stay unchanged')
    _keys(binding['evidence'],('source_review','namespace_oracle_review','full_canon_audit','parallels_diff_review'),
          'Closed independent source evidence descriptors required')
    for name,row in binding['evidence'].items():
        _keys(row,('artifact','bytes','sha256'),'Exact external audit provenance descriptor required')
        _relative(row['artifact']);_row(row)
        # Artifact labels are provenance, never dynamic reads/callback paths.
        if name=='source_review':
            _require(row['sha256']=='af81a110c7f555898f5513a51a23e6f88270c03f0112aeca73db4b0b54f10eed',
                     'Exact independently reviewed implementation source required')
        elif name=='namespace_oracle_review':
            _require(row['sha256']=='db2d9a49f1587d548801343c0e5bc4f35da5746ea654c7fc4d4881f1e79162ef',
                     'Exact independent indexed883d namespace oracle required')
    return binding


def _source389390(root):
    root=_physical_root(root)
    _pin(PINS['CURRENT_CANON_BINDING.json'])
    english,_,_=english380._source(root)  # pure decoder exactly ONCE, no runtime
    canonical=_binding(root,english)
    return {'english':english,'canonical':canonical}


def source_authority389390(root):
    return deepcopy(_source389390(root))


def _capture389390_current(root):
    root=_physical_root(root)
    for pin in PINS.values():_pin(pin)
    context=_source389390(root)
    english=context['english'];canonical=context['canonical']
    proof=english380._proof_rows(english)
    metadata=_all_metadata_pins()
    _require(len(proof)==226 and not set(proof)&set(metadata) and len(set(proof)|set(metadata))==254,
             'Disjoint old251 plus exactly3 transition/runtime prerequisites required')
    for name,row in proof.items():
        if row['domain']=='H_runtime_prerequisite':
            raw=_regular(root,name);_row(row)
            _require(len(raw)==row['bytes'] and _sha(raw)==row['sha256'],'Changed historical proof prerequisite: '+name)
    # The six immutable old runtime documents remain metadata prerequisites.
    # Their application captures are never called and no old actual data is read.
    old_runtime={}
    for directory,pins in ((english380.BASELINE_DIRECTORY,english380.BASELINE_RUNTIME_PINS),
                           (english380.DIRECTORY,english380.RUNTIME_PINS)):
        for leaf,pin in pins.items():
            old_runtime[(directory,leaf)]=_sealed(root,directory+'/'+leaf,pin)
    before=old_runtime[(english380.DIRECTORY,'RUNTIME_INVENTORY.json')]
    _require(before['schema']=='independent-reviewed-intake380-runtime-inventory-v1' and
             before['canonical_logical_sha256']==OLD_CANON and before['runtime_files']==34 and
             before['curation_sha256']==english380.PINS['APPROVAL.json'],
             'Exact immutable380 predecessor runtime metadata required')
    _require(old_runtime[(english380.DIRECTORY,'EXPECTED_MANIFEST.json')]==english['manifest'],
             'Independent unchanged380 AP manifest prerequisite required')
    inventory=_sealed(root,DIRECTORY+'/RUNTIME_INVENTORY.json',PINS['RUNTIME_INVENTORY.json'])
    review=_sealed(root,DIRECTORY+'/RUNTIME_REVIEW.json',PINS['RUNTIME_REVIEW.json'])
    _keys(inventory,RUNTIME_KEYS,'Closed new-canon runtime inventory fields required')
    _keys(review,REVIEW_KEYS,'Closed new-canon independent runtime review required')
    predecessor=english380.RUNTIME_PINS['RUNTIME_INVENTORY.json']
    _require(inventory['schema']=='independent-reviewed-boundary389390-runtime-inventory-v1' and
             inventory['baseline_commit']==BASE_COMMIT and
             inventory['canonical_binding_sha256']==PINS['CURRENT_CANON_BINDING.json'] and
             inventory['canonical_logical_sha256']==CANON and
             inventory['predecessor_inventory_sha256']==predecessor and
             type(inventory['runtime_files']) is int and inventory['runtime_files']==34 and
             inventory['inventory_only'] is True and inventory['behavioral_or_release_approval'] is False and
             type(inventory['candidate_commit']) is str and re.fullmatch('[a-f0-9]{40}',inventory['candidate_commit']) is not None,
             'Independent actual new-canon inventory binding required')
    files=inventory['files'];previous=before['files']
    _require(type(files) is dict and len(files)==34 and list(files)==sorted(files) and
             list(files)==list(previous),'Exact unchanged sorted34 pathnames required')
    for name,row in files.items():_relative(name);_keys(row,('bytes','sha256'),'Exact runtime row required');_row(row)
    changed=[name for name in files if files[name]!=previous[name]]
    unchanged=[name for name in files if name not in changed]
    _require(changed==list(CHANGED_PATHS)==inventory['allowed_changed_paths'] and
             unchanged==inventory['unchanged_paths'] and len(unchanged)==27,
             'Exactly reviewed seven changed paths and27 unchanged required')
    _require(review['schema']=='reviewed-boundary389390-runtime-approval-v1' and
             review['status']=='GO_EXACT_NEW_CANON_RUNTIME_INVENTORY_ONLY' and
             review['inventory_sha256']==PINS['RUNTIME_INVENTORY.json'] and
             review['canonical_binding_sha256']==PINS['CURRENT_CANON_BINDING.json'] and
             review['application_commit']==inventory['candidate_commit'] and
             review['baseline_commit']==BASE_COMMIT and review['predecessor_inventory_sha256']==predecessor and
             type(review['runtime_paths']) is int and review['runtime_paths']==34 and
             type(review['actual_data_paths']) is int and review['actual_data_paths']==27 and
             review['changed_paths']==changed and type(review['unchanged_paths']) is int and review['unchanged_paths']==27 and
             review['canonical_logical_sha256']==CANON and review['namespace']==NAMESPACE and
             _typed(review['preservation'])==_typed(canonical['preservation']) and
             review['physical_and_Git_blob_inventory_exact'] is True and
             review['behavioral_installed_browser_native_CI_or_release_approval'] is False and
             type(review['operations']) is str and 0<len(review['operations'])<=20000,
             'Exact independently reviewed new-canon split invariants required')
    raw_data={}
    for name,row in files.items():
        if name.startswith('data/'):
            raw_data[name]=_read_row(root,'server/'+name,row)
    _require(len(raw_data)==27 and 'data/apadana.json' in raw_data,
             'Exactly once-read actual27 current data paths required')
    _require(json.loads(raw_data['data/apadana.json'])==english['manifest'],
             'Actual380 English catalogue differs from unchanged independently composed source objects')
    # Sealed raw canon/parallels hashes above bind the independently audited
    # logical objects; no old decompression/capture followed by new capture.
    return deepcopy(context),deepcopy(files)


def approved389390_catalogue(root):
    from web_reader_intake382 import approved382_catalogue
    return approved382_catalogue(root)


def approved389390_runtime(root):
    from web_reader_intake382 import approved382_runtime
    return approved382_runtime(root)
