"""Fixed CURRENT380 source extension and stateless actual-data validation.

The sealed375 source decoder is reused once. No375 runtime capture, H375
application, carried scope, caller callback, epoch dispatch or success cache.
PENDING literals deliberately refuse until independently reviewed bindings.
"""
from copy import deepcopy
import json
import re
import web_reader_intake375 as historical375
from web_reader_intake375 import (_physical_root, _relative, _regular,
    _sha, _require, _row, _records)

BASE_COMMIT = '9bacd4d7b98c53ed4ae53785b5213a35c2a93096'
H_COMMIT = historical375.H_COMMIT
CANON = historical375.CANON
PUBLISHER = historical375.PUBLISHER
VRI = historical375.VRI
BASELINE_DIRECTORY = historical375.DIRECTORY
BASELINE_PINS = dict(historical375.PINS)
BASELINE_RUNTIME_PINS = dict(historical375.RUNTIME_PINS)
DIRECTORY = 'docs/evidence/apadana/english381-386-five'
PAIRS = (('tha-ap383',381),('tha-ap385',383),('tha-ap386',384),
         ('tha-ap387',385),('tha-ap388',386))
IDS = tuple(uid for uid, _ in PAIRS)
PINS = {'APPROVAL.json': 'd98a487b97aaab17f226c5c5ba91c07648e5e81f73c95b94220b206a36cff519', 'PROFILES.json': 'd9b7e96c1816641cc681a1d3e6b3f7e8166e4b20013e3448cd0e733afb3029d8', 'LINKS.json': '9c0aaf84f58f8003a5acb20e225510da20d86b4efc370f4044e2e42a59f1c07d', 'SOURCE_BINDINGS.json': 'ebfa3fc813de3f2f8cbee39c38b5cbfbe11cf16e9d30d4b8fe78c60529264129', 'SOURCE_REVIEW.json': '9abaf9f6515d97d066dbb3862cfd498b491ec96d80f4ba24b49da9da42ca7449', 'NORMALIZATION_REVIEW.json': '63b9858798ca8571ebf919cc68b06bc7459dc1a5ba90042ec4c10c81a08745ad', 'REQUIRED_NOTICES.json': 'b4a06bc9236f17b6cf7198b1702a8cfcc1be223e8bee3fb3a6a6a147bde94346'}
RUNTIME_PINS = {'EXPECTED_MANIFEST.json':'787b60c3b1bc77188f625d5975b07cc603a17b4049a8adf3a75bc7e64d9fb4b9',
                'RUNTIME_INVENTORY.json':'1e3d92309fbc2aa9aba54516693c5e1908a6b8d5b6c941008c8d05cf5b54374f','RUNTIME_REVIEW.json':'6dc7de98893a655b94bb3afe36b1a961d8d376f6ed84aa5c8f4cdd0a5c0062af'}
ANCHORS = dict(historical375.ANCHORS)
SOURCE_REFS = {'profiles':'PROFILES.json','links':'LINKS.json',
    'source_bindings':'SOURCE_BINDINGS.json','independent_source_review':'SOURCE_REVIEW.json',
    'normalization_review':'NORMALIZATION_REVIEW.json','required_notices':'REQUIRED_NOTICES.json'}
APPROVAL_KEYS = ('schema','status','base_commit','canonical_logical_sha256',
    'publisher_revision','vri_revision','baseline_source','baseline_ids',
    'approved_ids','approved_records','expected_profile_ids','held_ids',
    'source_refs','required_visible_qualifications','source_and_normalization_only',
    'runtime_approval','release_approval')
RUNTIME_KEYS = ('schema','baseline_commit','candidate_commit','curation_sha256',
    'canonical_logical_sha256','runtime_files','files','allowed_changed_paths',
    'unchanged_paths','inventory_only','behavioral_or_release_approval')
REVIEW_KEYS = ('schema','status','inventory_sha256','application_commit',
    'curation_sha256','baseline_commit','expected_manifest_sha256','runtime_paths',
    'actual_data_paths','changed_paths','unchanged_paths','independent_manifest_composition',
    'physical_and_Git_blob_inventory_exact','canonical_data26_and_H_held_preserved',
    'behavioral_installed_browser_native_CI_or_release_approval','operations')
BASELINE_SOURCE_ROWS = {'APPROVAL.json': {'bytes': 15604, 'sha256': '3112dff5eb6a26dcd357fc0ac02ee08019bb1e894172192a55aa4c0ef9d52ebd'}, 'BASELINE368_FULL_OBJECTS.json': {'bytes': 2989112, 'sha256': '8a81a69513ebdc3255da7cfafe8b890a5cc3c824017dfbe6d26dc53028f2b273'}, 'BASELINE_DATA27.json': {'bytes': 4352, 'sha256': '8bac16952c046270894a5b4f3c50ca3a00031fbaf7d9ca0cc747043e6d45ecc5'}, 'BASELINE_RUNTIME34.json': {'bytes': 5124, 'sha256': '7eb54d2eda2dd17847400bda4a31075156e3a9b976029cc88b8ac2df5ab54e92'}, 'H_CURRENT_PROOF_INPUTS.json': {'bytes': 126637, 'sha256': '4d5bdf79d2cae116a46a98ae72254debbfe20199c945135393d299e1a2e64b05'}, 'H_HISTORY_FIXTURE_INPUTS.json': {'bytes': 478093, 'sha256': '0166698d9fa535b693be6b7b5462253952d67a1c105e2324a46b88dd6444be5e'}, 'LINKS.json': {'bytes': 24216, 'sha256': '6d4f5477b2b7c4ee1cf18a5599d6bd2870ed0fb75d61edd4d649391ad73d172c'}, 'NORMALIZATION_REVIEW.json': {'bytes': 35972, 'sha256': '836fbd3679e9b04ab4ca924069bc69653d77b18a5515e679a0cc0268105a7c13'}, 'PROFILES.json': {'bytes': 23627, 'sha256': '8ee04009c27bd089d006b1ca66abcc8087e14cca5d895e00b51a25b9b479884c'}, 'REQUIRED_NOTICES.json': {'bytes': 9967, 'sha256': '3116297e16cb89ac6b5a99bb83b266c177921dfc802b3444e9a7add5f1248178'}, 'SOURCE_BINDINGS.json': {'bytes': 126416, 'sha256': '14c8a8efcb230c81e86a7ab5cb34f8ccf183257934751d741dea15484dd6a7e8'}, 'SOURCE_REVIEW.json': {'bytes': 16711, 'sha256': '4af1bfc1c8e675efb1bcd3eee2792eac634c035888989c72410b59e9c44ca71b'}}


def _pin(pin):
    _require(type(pin) is str and re.fullmatch('[a-f0-9]{64}',pin) is not None,
             'Pending/unsealed CURRENT380 authority; no historical fallback')


def _keys(value, names, message):
    _require(type(value) is dict and set(value)==set(names), message)


def _sealed(root, name, pin):
    _pin(pin)
    raw=_regular(root,name)
    _require(_sha(raw)==pin,'Changed fixed380 authority: '+name)
    try:value=json.loads(raw)
    except (ValueError,UnicodeError) as error:
        raise ValueError('Invalid fixed380 authority JSON: '+name) from error
    _require(type(value) is dict,'Sealed exact380 object required')
    return value,raw


def _read_row(root, name, row):
    _row(row)
    raw=_regular(root,name)
    _require(len(raw)==row['bytes'] and _sha(raw)==row['sha256'],
             'Physical pinned380 input changed: '+name)
    return raw


def _source_metadata_pins():
    names={BASELINE_DIRECTORY+'/'+leaf:pin for leaf,pin in BASELINE_PINS.items()}
    names.update({DIRECTORY+'/'+leaf:pin for leaf,pin in PINS.items()})
    _require(len(names)==19,'Disjoint old12 plus new7 source documents required')
    return names


def _all_metadata_pins():
    names=_source_metadata_pins()
    names.update({BASELINE_DIRECTORY+'/'+leaf:pin for leaf,pin in BASELINE_RUNTIME_PINS.items()})
    names.update({DIRECTORY+'/'+leaf:pin for leaf,pin in RUNTIME_PINS.items()})
    _require(len(names)==25,'Disjoint old15 plus new10 physical metadata required')
    return names


def _proof_rows(authority):
    return historical375._closure(authority['historical375']['documents'])


def _source(root):
    root=_physical_root(root)
    # Refuse authoring placeholders before expensive source validation. No
    # runtime pin is needed by this source-only route.
    for pin in PINS.values():_pin(pin)
    prefix,old_documents,h_raw=historical375._source(root)  # pure375 ONCE
    documents={};raws={}
    for leaf,pin in PINS.items():
        documents[leaf],raws[leaf]=_sealed(root,DIRECTORY+'/'+leaf,pin)
    approval=documents['APPROVAL.json']
    _keys(approval,APPROVAL_KEYS,'Exact finite380 approval fields required')
    baseline_source={'commit':BASE_COMMIT,'directory':BASELINE_DIRECTORY+'/',
                     'files':BASELINE_SOURCE_ROWS}
    _require(approval['schema']=='reviewed-thera381-386-five-approval-v1' and
             approval['status']=='approved' and approval['base_commit']==BASE_COMMIT and
             approval['canonical_logical_sha256']==CANON and
             approval['publisher_revision']==PUBLISHER and approval['vri_revision']==VRI and
             approval['baseline_source']==baseline_source and
             approval['source_and_normalization_only'] is True and
             approval['runtime_approval'] is False and approval['release_approval'] is False,
             'Unapproved or changed fixed five-source curation')
    _require(set(BASELINE_SOURCE_ROWS)==set(BASELINE_PINS) and all(
        BASELINE_SOURCE_ROWS[leaf]['sha256']==pin for leaf,pin in BASELINE_PINS.items()),
        'Historical375 source descriptor/hash constants disagree')
    # Historical375 is a SOURCE view, not an old runtime/API response. Keep its
    # baseline exactly368; never retarget .baseline to375.
    old_baseline=old_documents['BASELINE368_FULL_OBJECTS.json']
    old_manifest={'version':1,'source':prefix['source'],'vri_commit':VRI,
                  'held':old_baseline['manifest_held'],'links':prefix['links']}
    historical={**prefix,'baseline':old_baseline,'documents':old_documents,'manifest':old_manifest}
    old_ids=prefix['ids']
    _require(len(old_ids)==375 and len(set(old_ids))==375 and
             list(prefix['profiles'])==list(prefix['links'])==old_ids and
             old_ids==old_baseline['ids']+list(historical375.IDS),
             'Complete ordered source-derived375 prefix required')
    new_records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem}for uid,poem in PAIRS]
    ids=old_ids+list(IDS)
    _require(len(ids)==380 and len(set(ids))==380 and
             approval['baseline_ids']==old_ids and approval['approved_ids']==list(IDS) and
             approval['approved_records']==new_records and approval['expected_profile_ids']==ids and
             approval['held_ids']==prefix['selection']['held_ids'] and
             not set(approval['held_ids'])&set(ids),
             'Literal375 prefix plus five exact disjoint380 owners required')
    _keys(approval['source_refs'],SOURCE_REFS,'Closed six source references required')
    for key,leaf in SOURCE_REFS.items():
        _require(approval['source_refs'][key]=={'file':leaf,'bytes':len(raws[leaf]),'sha256':PINS[leaf]},
                 'Exact finite source descriptor required: '+key)
    added=documents['PROFILES.json'];new_links=documents['LINKS.json']
    _require(list(added)==list(new_links)==list(IDS) and _records(list(IDS),added)==new_records,
             'Exactly five source-derived full objects required')
    profiles={**prefix['profiles'],**added};links={**prefix['links'],**new_links}
    _require(list(profiles)==list(links)==ids,'Complete380 profile/link order required')
    for uid in IDS:
        for obj in (profiles[uid],links[uid]):
            _require(type(obj) is dict and obj.get('source')=='apadana' and
                     obj.get('license')=='CC BY-NC-SA 4.0','Specific translation rights required')
        _require(not set(('text','translator_notes','publisher_paratext','raw','body','notes'))&set(profiles[uid]),
                 'No bundled English body or note wording')
    qualification=approval['required_visible_qualifications']
    _require(type(qualification) is list and len(qualification)==1,'Exactly one source384 defect qualification required')
    q=qualification[0]
    _keys(q,('id','publisher_poem','note_number','source_issue','verbatim_note_sha256','mapping_notice'),
          'Exact qualification ownership required')
    _require(q['id']=='tha-ap386' and q['publisher_poem']==384 and q['note_number']==4 and
             q['source_issue']=='unfinished_parenthesis_at_original_eof' and
             q['verbatim_note_sha256']=='f05875673e20155d7db9717238d066cbb595f88618d4ac4a7672caec8854fc29' and
             type(q['mapping_notice']) is str and q['mapping_notice'] in profiles['tha-ap386']['mapping_notes'],
             'Original unfinished384 note4 and its exact visible notice must remain')
    bindings=documents['SOURCE_BINDINGS.json']
    _require(bindings['required_visible_qualifications']==qualification,
             'Source bindings must retain the exact curation qualification')
    expected=bindings['source_derived_API_expected_metadata']['entries']
    _require(list(expected)==list(IDS) and
             next(n for n in expected['tha-ap386']['note_owners'] if n['number']==4)['text_sha256']==q['verbatim_note_sha256'],
             'Source-derived rendered note4 hash must match its own domain')
    source=deepcopy(prefix['source']);policy=source['policy']
    _require(policy.count('375 finite')==1 and policy.count('335 explicitly mapped Therā')==1,
             'Exact historical375 source-policy operands required')
    source['policy']=policy.replace('375 finite','380 finite').replace('335 explicitly mapped Therā','340 explicitly mapped Therā')
    _require(bindings['expected_current380_source']==source and
             bindings['expected_current380_manifest_held']==old_manifest['held'],
             'Independent380 source policy/held metadata mismatch')
    records=_records(old_ids,prefix['profiles'])
    _require(records==prefix['selection']['baseline_records']+prefix['selection']['approved_records'] and
             sum(row['publisher_chapter']=='chapter-4' for row in records)==40 and
             sum(row['publisher_chapter']=='chapter-3' for row in records)==335,
             'Exact full375 source selection must be preserved')
    old_selection=prefix['selection']
    selection={**deepcopy(approval),'baseline_records':records,'approved_records':new_records,
        'current_source_approval':{'file':DIRECTORY+'/APPROVAL.json','sha256':PINS['APPROVAL.json']},
        'historical375_source_approval':deepcopy(old_selection['current_source_approval']),
        'historical368_source_approval':deepcopy(old_selection['historical368_source_approval']),
        'historical359_source_approval':deepcopy(old_selection['historical359_source_approval']),
        'historical343_source_approval':deepcopy(old_selection['historical343_source_approval'])}
    manifest={'version':1,'source':source,'vri_commit':VRI,'held':deepcopy(old_manifest['held']),'links':links}
    authority={'ids':ids,'profiles':profiles,'links':links,'source':source,'selection':selection,
        'approval':approval,'historical368':old_baseline,'historical375':historical,
        'documents':documents,'manifest':manifest}
    rows=_proof_rows(authority);metadata=_all_metadata_pins()
    _require(len(rows)==226 and not set(rows)&set(metadata) and len(set(rows)|set(metadata))==251,
             'Closed disjoint H226 plus old15 plus new10 proof family required')
    return authority,documents,h_raw


def source_authority380(root):
    authority,_,_=_source(_physical_root(root))
    return deepcopy(authority)


def reviewed_intake380(root):
    return source_authority380(root)['selection']


def curated_additions380(root,anchor_filename):
    root=_physical_root(root)
    _require(type(anchor_filename) is str and anchor_filename in ANCHORS,
             'Closed literal historical anchor required')
    authority,_,h_raw=_source(root)
    name='docs/evidence/apadana/'+anchor_filename
    _require(name in h_raw,'Anchor is not a mandatory source prerequisite')
    anchor=json.loads(h_raw[name]);anchor_ids=anchor['expected_profile_ids']
    _require(type(anchor_ids) is list and len(anchor_ids)==ANCHORS[anchor_filename] and
             authority['ids'][:len(anchor_ids)]==anchor_ids,'Historical anchor order changed')
    suffix=authority['ids'][len(anchor_ids):]
    return deepcopy({'curation':authority['selection'],'anchor':anchor,'ids':suffix,
        'profiles':{uid:authority['profiles'][uid]for uid in suffix},
        'links':{uid:authority['links'][uid]for uid in suffix}})


def _capture380_current(root):
    root=_physical_root(root)
    for pin in RUNTIME_PINS.values():_pin(pin)
    authority,_,_=_source(root)
    for name,row in _proof_rows(authority).items():
        if row['domain']=='H_runtime_prerequisite':_read_row(root,name,row)
    # Keep the original three375 runtime METADATA loss/tamper prerequisites,
    # without interpreting them as current380 application/data acceptance.
    old_runtime={leaf:_sealed(root,BASELINE_DIRECTORY+'/'+leaf,pin)[0]
                 for leaf,pin in BASELINE_RUNTIME_PINS.items()}
    baseline=old_runtime['RUNTIME_INVENTORY.json']
    _require(baseline['schema']=='independent-reviewed-intake375-runtime-inventory-v1' and
             baseline['curation_sha256']==BASELINE_PINS['APPROVAL.json'] and
             baseline['canonical_logical_sha256']==CANON and baseline['runtime_files']==34,
             'Exact immutable375 baseline inventory metadata required')
    runtime={leaf:_sealed(root,DIRECTORY+'/'+leaf,pin)[0]for leaf,pin in RUNTIME_PINS.items()}
    inventory=runtime['RUNTIME_INVENTORY.json'];review=runtime['RUNTIME_REVIEW.json']
    _keys(inventory,RUNTIME_KEYS,'Exact380 runtime inventory fields required')
    _keys(review,REVIEW_KEYS,'Exact380 runtime review fields required')
    _require(inventory['schema']=='independent-reviewed-intake380-runtime-inventory-v1' and
             inventory['baseline_commit']==BASE_COMMIT and inventory['curation_sha256']==PINS['APPROVAL.json'] and
             inventory['canonical_logical_sha256']==CANON and inventory['runtime_files']==34 and
             inventory['inventory_only'] is True and inventory['behavioral_or_release_approval'] is False,
             'Independent current380 runtime metadata required')
    _require(type(inventory['candidate_commit']) is str and re.fullmatch('[a-f0-9]{40}',inventory['candidate_commit']) is not None and
             review['schema']=='reviewed-intake380-runtime-approval-v1' and review['status']=='GO_RUNTIME_INVENTORY_ONLY' and
             review['inventory_sha256']==RUNTIME_PINS['RUNTIME_INVENTORY.json'] and
             review['application_commit']==inventory['candidate_commit'] and review['baseline_commit']==BASE_COMMIT and
             review['curation_sha256']==PINS['APPROVAL.json'] and
             review['expected_manifest_sha256']==RUNTIME_PINS['EXPECTED_MANIFEST.json'] and
             review['runtime_paths']==34 and review['actual_data_paths']==27 and
             review['physical_and_Git_blob_inventory_exact'] is True and
             review['canonical_data26_and_H_held_preserved'] is True and
             review['behavioral_installed_browser_native_CI_or_release_approval'] is False,
             'Exact independently reviewed380 runtime binding required')
    files=inventory['files'];before=baseline['files']
    _require(type(files) is dict and len(files)==34 and list(files)==sorted(files) and
             list(files)==list(before),'Exact preserved sorted34 runtime paths required')
    changed=[name for name in files if files[name]!=before[name]]
    unchanged=[name for name in files if name not in changed]
    _require(changed==inventory['allowed_changed_paths'] and unchanged==inventory['unchanged_paths'] and
             review['changed_paths']==changed and review['unchanged_paths']==len(unchanged),
             'Exact measured375-to380 runtime delta required')
    raw_data={}
    for name,row in files.items():
        _relative(name);_keys(row,('bytes','sha256'),'Exact runtime byte/hash row required');_row(row)
        if name.startswith('data/'):
            if name!='data/apadana.json':
                _require(row==before[name],'Unrelated canonical/data path changed: '+name)
            raw_data[name]=_read_row(root,'server/'+name,row)
    _require(len(raw_data)==27 and 'data/apadana.json' in raw_data,
             'Exactly actual27 current data inputs required')
    expected=runtime['EXPECTED_MANIFEST.json']
    _keys(expected,('version','source','vri_commit','held','links'),'Exact expected380 manifest fields required')
    _require(type(expected['version']) is int and expected['version']==1 and
             expected==authority['manifest'] and list(expected['links'])==authority['ids'] and
             json.loads(raw_data['data/apadana.json'])==expected,
             'Actual380 differs from independent full375-prefix plus five source objects')
    return deepcopy(authority),deepcopy(files)


def approved380_catalogue(root):
    authority,_=_capture380_current(root)
    return {key:authority[key]for key in ('ids','profiles','links','source')}


def approved380_runtime(root):
    _,files=_capture380_current(root)
    return files
