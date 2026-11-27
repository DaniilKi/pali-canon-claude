"""Finite source-only CURRENT375 authority and stateless actual-data gates.

A proposal: PENDING literals deliberately refuse until independent metadata seals.
No application imports, historical runtime projection, provider access or cache.
"""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import re
import stat

H_COMMIT = '4e9287bd5ebc78aba4b185b017e63eac6547bfd7'
CANON = 'f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
PUBLISHER = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070'
DIRECTORY = 'docs/evidence/apadana/english371-378-seven'
PAIRS = (('tha-ap373',371),('tha-ap374',372),('tha-ap376',374),
         ('tha-ap377',375),('tha-ap378',376),('tha-ap379',377),('tha-ap380',378))
IDS = tuple(uid for uid, _ in PAIRS)
PINS = {'APPROVAL.json': 'b8c196e2332aa7ee169c5d20f3e6906ab458cdf7d569dd235211ed76443f38fb',
 'BASELINE368_FULL_OBJECTS.json': '8a81a69513ebdc3255da7cfafe8b890a5cc3c824017dfbe6d26dc53028f2b273',
 'BASELINE_DATA27.json': '8bac16952c046270894a5b4f3c50ca3a00031fbaf7d9ca0cc747043e6d45ecc5',
 'BASELINE_RUNTIME34.json': '7eb54d2eda2dd17847400bda4a31075156e3a9b976029cc88b8ac2df5ab54e92',
 'H_CURRENT_PROOF_INPUTS.json': '4d5bdf79d2cae116a46a98ae72254debbfe20199c945135393d299e1a2e64b05',
 'H_HISTORY_FIXTURE_INPUTS.json': '41487957b85db7daff4bc83e207414fe88d4be68f67f557a75d4b4c550ef5466',
 'LINKS.json': '6d4f5477b2b7c4ee1cf18a5599d6bd2870ed0fb75d61edd4d649391ad73d172c',
 'NORMALIZATION_REVIEW.json': '836fbd3679e9b04ab4ca924069bc69653d77b18a5515e679a0cc0268105a7c13',
 'PROFILES.json': '8ee04009c27bd089d006b1ca66abcc8087e14cca5d895e00b51a25b9b479884c',
 'REQUIRED_NOTICES.json': '3116297e16cb89ac6b5a99bb83b266c177921dfc802b3444e9a7add5f1248178',
 'SOURCE_BINDINGS.json': '14c8a8efcb230c81e86a7ab5cb34f8ccf183257934751d741dea15484dd6a7e8',
 'SOURCE_REVIEW.json': '4af1bfc1c8e675efb1bcd3eee2792eac634c035888989c72410b59e9c44ca71b'}
RUNTIME_PINS = {'EXPECTED_MANIFEST.json': '01b21e4f6c7823c2a2be2ea916a5b970faf889401ebdb4128599329fdeeb3278',
 'RUNTIME_INVENTORY.json': '29f78f77f1200b0988620f0f7766ceb7d090d9d5cf0fa4174c05f97b345cc840',
 'RUNTIME_REVIEW.json': 'a6697cbbfd6fd6b3738489cce02107927fe5e862b2b7a4487f8caf01eaf8d117'}
# These bind immutable H metadata, not actual CURRENT375 app/source bytes.
H_SOURCE_MANIFEST = '4d5bdf79d2cae116a46a98ae72254debbfe20199c945135393d299e1a2e64b05'
H_HISTORY_MANIFEST = '41487957b85db7daff4bc83e207414fe88d4be68f67f557a75d4b4c550ef5466'
# Source-code closure is sealed separately by V5. Exclude this module and all
# current index/review/workflow pointers from its own metadata graph.
ANCHORS = {'THERA_241_250_APPROVAL.json':256,'THERA_221_230_APPROVAL.json':266,
           'THERA_REMAINING_APPROVAL.json':284,'THERA_HELD234_APPROVAL.json':285,
           'THERA_321_329_APPROVAL.json':339}
SOURCE_REF_NAMES = {
    'baseline_full_objects':'BASELINE368_FULL_OBJECTS.json',
    'expected_profiles':'PROFILES.json','expected_links':'LINKS.json',
    'source_bindings':'SOURCE_BINDINGS.json','independent_source_review':'SOURCE_REVIEW.json',
    'normalization_review':'NORMALIZATION_REVIEW.json','required_notices':'REQUIRED_NOTICES.json',
    'baseline_data27':'BASELINE_DATA27.json','baseline_runtime34':'BASELINE_RUNTIME34.json',
    'h_current_proof_inputs':'H_CURRENT_PROOF_INPUTS.json',
    'h_history_fixture_inputs':'H_HISTORY_FIXTURE_INPUTS.json'}


def _sha(raw):
    return hashlib.sha256(raw).hexdigest()


def _require(ok, message):
    if not ok:
        raise ValueError(message)


def _physical_root(root):
    # Do not call __fspath__, str, isinstance(Path) or any filesystem function
    # before rejecting subclasses, custom protocols and historical scopes.
    if type(root) not in (str, type(Path('.'))):
        raise ValueError('CURRENT375 requires exact physical str/native Path root')
    root = Path(root)
    if '..' in root.parts:
        raise ValueError('Parent traversal in CURRENT375 root is refused before IO')
    root = root.absolute()
    for node in (*reversed(root.parents), root):
        status = node.lstat()
        _require(not stat.S_ISLNK(status.st_mode) and stat.S_ISDIR(status.st_mode),
                 'Physical nonsymlink directory required: '+str(node))
    return root


def _relative(name):
    _require(type(name) is str and bool(name) and '\\' not in name and ':' not in name and
             all(ord(c)>=32 for c in name) and
             not name.startswith('/') and all(p not in ('','.','..') for p in name.split('/')),
             'Finite relative file path required')
    return name


def _regular(root, name):
    root=_physical_root(root)
    _relative(name)
    node = root
    pieces = name.split('/')
    for index, piece in enumerate(pieces):
        node = node / piece
        status = node.lstat()
        _require(not stat.S_ISLNK(status.st_mode), 'Symlink proof/data refused: '+name)
        _require(stat.S_ISREG(status.st_mode) if index == len(pieces)-1 else
                 stat.S_ISDIR(status.st_mode), 'Regular proof/data and directory parents required: '+name)
    return node.read_bytes()


def _pin(pin):
    _require(type(pin) is str and re.fullmatch('[a-f0-9]{64}',pin) is not None,
             'Pending/unsealed CURRENT375 authority; no historical fallback')


def _sealed(root, name, pin):
    _pin(pin)
    raw = _regular(root, name)
    _require(_sha(raw) == pin, 'Changed CURRENT375 authority: '+name)
    try:
        value = json.loads(raw)
    except (ValueError, UnicodeError) as error:
        raise ValueError('Invalid sealed JSON: '+name) from error
    _require(type(value) is dict, 'Sealed authority must be an exact object: '+name)
    return value, raw


def _row(row):
    _require(type(row) is dict and type(row.get('bytes')) is int and row['bytes'] >= 0,
             'Exact nonnegative byte count required')
    _pin(row.get('sha256'))


def _read_row(root, name, row):
    _row(row)
    raw = _regular(root,name)
    _require(len(raw)==row['bytes'] and _sha(raw)==row['sha256'],
             'Physical pinned input changed: '+name)
    return raw


def _records(ids, profiles):
    result=[]
    for uid in ids:
        profile=profiles[uid]
        chapter='chapter-4' if uid.startswith('thi-ap') else 'chapter-3'
        _require(type(profile) is dict and profile.get('id')==uid and
                 type(profile.get('poem')) is int and profile['poem']>0 and
                 profile.get('publisher_chapter',chapter)==chapter and
                 profile.get('path')=='/text/'+chapter+'/poem-'+str(profile['poem']).zfill(3)+'/',
                 'Exact publisher chapter/path/poem identity required')
        result.append({'id':uid,'publisher_chapter':chapter,'poem':profile['poem']})
    return result


def _closure(documents):
    closure=documents['H_CURRENT_PROOF_INPUTS.json']
    _require(closure.get('schema')=='H-current375-proof-inputs-v1' and
             closure.get('commit')==H_COMMIT and closure.get('status')=='approved' and closure.get('file_count')==226 and
             closure.get('source_count')==198 and closure.get('runtime_count')==28,
             'Exact independently reviewed flat H proof union required')
    rows=closure.get('files')
    _require(type(rows) is dict and len(rows)==226 and list(rows)==sorted(rows),
             'Exact ordered closed H proof rows required')
    counts={'H_source_prerequisite':0,'H_runtime_prerequisite':0}
    for name,row in rows.items():
        _relative(name);_row(row)
        _require(row.get('path')==name and row.get('domain') in counts and
                 not name.startswith('server/') and name!=DIRECTORY+'/APPROVAL.json',
                 'Historical proof metadata only; no actual runtime or self-cycle')
        counts[row['domain']]+=1
    _require(list(counts.values())==[198,28], 'Changed proof domain membership')
    return rows


def _source(root):
    """Fresh source files exactly once; never reads current runtime/data leaves."""
    documents={};raws={}
    for name,pin in PINS.items():
        documents[name],raws[name]=_sealed(root,DIRECTORY+'/'+name,pin)
    _require(PINS['H_CURRENT_PROOF_INPUTS.json']==H_SOURCE_MANIFEST and
             PINS['H_HISTORY_FIXTURE_INPUTS.json']==H_HISTORY_MANIFEST,
             'Independent fixture/proof seal mismatch')
    rows=_closure(documents)
    history=documents['H_HISTORY_FIXTURE_INPUTS.json']
    _require(history.get('schema')=='H-history-fixture-inputs-v1' and
             history.get('status')=='approved' and history.get('commit')==H_COMMIT and
             type(history.get('source_files')) is dict and
             type(history.get('dependency_inputs')) is dict,
             'Unapproved H fixture/source-closure authority')
    h_raw={}
    for name,row in rows.items():
        if row['domain']=='H_source_prerequisite':
            h_raw[name]=_read_row(root,name,row)
    baseline=documents['BASELINE368_FULL_OBJECTS.json'];approval=documents['APPROVAL.json']
    _require(list(baseline)==['schema','commit','canonical_logical_sha256','ids','profiles','links',
                             'manifest_source','manifest_held','selection_records','held_ids',
                             'historical_source_approvals'] and
             baseline['schema']=='current368-full-objects-before-seven-v1' and
             baseline['commit']==H_COMMIT and baseline['canonical_logical_sha256']==CANON,
             'Exact independent H368 full metadata authority required')
    old=baseline['ids'];profiles=baseline['profiles'];links=baseline['links']
    _require(type(old) is list and len(old)==368 and all(type(uid) is str for uid in old) and
             len(set(old))==368 and type(profiles) is dict and type(links) is dict and
             list(profiles)==list(links)==old, 'Exact complete ordered H368 metadata required')
    records=_records(old,profiles)
    _require(records==baseline['selection_records'] and
             sum(r['publisher_chapter']=='chapter-4' for r in records)==40,
             'H selection identities changed')
    expected_records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem} for uid,poem in PAIRS]
    ids=old+list(IDS)
    _require(approval.get('schema')=='reviewed-thera371-378-seven-approval-v1' and
             approval.get('status')=='approved' and approval.get('base_commit')==H_COMMIT and
             approval.get('canonical_logical_sha256')==CANON and
             approval.get('publisher_revision')==PUBLISHER and approval.get('vri_revision')==VRI and
             approval.get('baseline_ids')==old and approval.get('approved_ids')==list(IDS) and
             approval.get('approved_records')==expected_records and
             approval.get('expected_profile_ids')==ids and
             approval.get('source_and_normalization_only') is True and
             approval.get('runtime_approval') is False and approval.get('release_approval') is False,
             'Unapproved or changed finite seven-source curation')
    for key,leaf in SOURCE_REF_NAMES.items():
        _require(approval.get(key)=={'file':leaf,'sha256':PINS[leaf]},
                 'Exact named source authority descriptor required: '+key)
    new_profiles=documents['PROFILES.json'];new_links=documents['LINKS.json']
    _require(list(new_profiles)==list(new_links)==list(IDS), 'Exactly seven reviewed object owners required')
    _require(_records(list(IDS),new_profiles)==expected_records, 'Literal seven mapping required')
    # Exact pinned objects carry all note/layout/edition/rights fields; do not
    # rebuild their contents from parser/runtime output or infer any +2 map.
    complete_profiles={**profiles,**new_profiles};complete_links={**links,**new_links}
    for uid in ids:
        for obj in (complete_profiles[uid],complete_links[uid]):
            _require(obj.get('source')=='apadana' and obj.get('license')=='CC BY-NC-SA 4.0',
                     'Specific translation source/rights required')
    holds=baseline['held_ids']
    _require(type(holds) is list and len(set(holds))==len(holds) and
             all(type(uid) is str for uid in holds) and 'tha-ap360' in holds and not set(holds)&set(ids),
             'Exact preserved H held identities required')
    source=deepcopy(baseline['manifest_source'])
    policy=source.get('policy')
    _require(type(policy) is str and policy.count('368 finite')==1 and
             policy.count('328 explicitly mapped Therā')==1,'Exact historical source-policy operands required')
    source['policy']=policy.replace('368 finite','375 finite').replace('328 explicitly mapped Therā','335 explicitly mapped Therā')
    oldrefs=baseline['historical_source_approvals']
    _require(type(oldrefs) is dict and set(oldrefs)=={'current_source_approval',
             'historical359_source_approval','historical343_source_approval'},
             'Exact previous named approval descriptors required')
    selection=deepcopy(approval)
    selection.update({'baseline_records':records,'approved_records':expected_records,'held_ids':deepcopy(holds),
                      'current_source_approval':{'file':DIRECTORY+'/APPROVAL.json','sha256':PINS['APPROVAL.json']},
                      'historical368_source_approval':deepcopy(oldrefs['current_source_approval']),
                      'historical359_source_approval':deepcopy(oldrefs['historical359_source_approval']),
                      'historical343_source_approval':deepcopy(oldrefs['historical343_source_approval'])})
    authority={'ids':ids,'profiles':complete_profiles,'links':complete_links,
               'source':source,'selection':selection,'approval':approval}
    return authority,documents,h_raw


def source_authority375(root):
    root=_physical_root(root)
    authority,_,_=_source(root)
    return deepcopy(authority)


def reviewed_intake375(root):
    return source_authority375(root)['selection']


def curated_additions375(root, anchor_filename):
    root=_physical_root(root)
    _require(type(anchor_filename) is str and anchor_filename in ANCHORS,
             'Closed literal historical anchor required')
    authority,documents,h_raw=_source(root)
    name='docs/evidence/apadana/'+anchor_filename
    _require(name in h_raw,'Anchor is not a mandatory source prerequisite')
    anchor=json.loads(h_raw[name]);anchor_ids=anchor['expected_profile_ids']
    _require(type(anchor_ids) is list and len(anchor_ids)==ANCHORS[anchor_filename] and
             authority['ids'][:len(anchor_ids)]==anchor_ids,'Historical anchor order changed')
    suffix=authority['ids'][len(anchor_ids):]
    return deepcopy({'curation':authority['selection'],'anchor':anchor,'ids':suffix,
                     'profiles':{uid:authority['profiles'][uid] for uid in suffix},
                     'links':{uid:authority['links'][uid] for uid in suffix}})


def _capture375_current(root):
    root=_physical_root(root)
    authority,documents,_=_source(root)
    for name,row in _closure(documents).items():
        if row['domain']=='H_runtime_prerequisite':
            _read_row(root,name,row)
    runtime={}
    for leaf,pin in RUNTIME_PINS.items():
        runtime[leaf],_= _sealed(root,DIRECTORY+'/'+leaf,pin)
    inventory=runtime['RUNTIME_INVENTORY.json'];review=runtime['RUNTIME_REVIEW.json']
    _require(inventory.get('schema')=='independent-reviewed-intake375-runtime-inventory-v1' and
             inventory.get('baseline_commit')==H_COMMIT and inventory.get('curation_sha256')==PINS['APPROVAL.json'] and
             inventory.get('canonical_logical_sha256')==CANON and inventory.get('runtime_files')==34 and
             inventory.get('inventory_only') is True and inventory.get('behavioral_or_release_approval') is False,
             'Current375 independently reviewed runtime metadata required')
    _require(review.get('schema')=='reviewed-intake375-runtime-approval-v1' and
             review.get('status')=='GO_RUNTIME_INVENTORY_ONLY' and
             review.get('inventory_sha256')==RUNTIME_PINS['RUNTIME_INVENTORY.json'] and
             review.get('application_commit')==inventory.get('candidate_commit') and
             review.get('curation_sha256')==PINS['APPROVAL.json'],
             'Exact current runtime peer binding required')
    _require(type(inventory.get('candidate_commit')) is str and
             re.fullmatch('[a-f0-9]{40}',inventory['candidate_commit']) is not None,
             'Exact application component commit required')
    files=inventory.get('files')
    _require(type(files) is dict and len(files)==34 and list(files)==sorted(files),
             'Exact independent ordered34 runtime paths required')
    data={name:row for name,row in files.items() if name.startswith('data/')}
    _require(len(data)==27 and 'data/apadana.json' in data,'Exactly actual27 data inputs required')
    baseline=documents['BASELINE_RUNTIME34.json'];base_data=documents['BASELINE_DATA27.json']
    _require(baseline.get('schema')=='H368-runtime34-before-seven-v1' and baseline.get('commit')==H_COMMIT and
             base_data.get('schema')=='H368-data27-before-seven-v1' and base_data.get('commit')==H_COMMIT and
             type(baseline.get('files')) is dict and type(base_data.get('files')) is dict and
             len(baseline['files'])==34 and len(base_data['files'])==27 and
             list(files)==list(baseline['files']), 'Exact H runtime/data path preservation required')
    changed=[name for name in files if files[name]!=baseline['files'][name]]
    _require(changed==inventory.get('allowed_changed_paths') and
             [name for name in files if name not in changed]==inventory.get('unchanged_paths'),
             'Exact reviewed runtime delta partition required')
    raw_data={}
    for name,row in files.items():
        _relative(name);_row(row)
        if name.startswith('data/'):
            if name!='data/apadana.json':
                _require(row==baseline['files'][name]==base_data['files']['server/'+name],
                         'Unrelated data changed: '+name)
            raw_data[name]=_read_row(root,'server/'+name,row)
    observed=json.loads(raw_data['data/apadana.json'])
    expected=runtime['EXPECTED_MANIFEST.json']
    _require(type(expected) is dict and set(expected)=={'version','source','vri_commit','held','links'} and
             type(expected['version']) is int and expected['version']==1 and expected['vri_commit']==VRI and
             expected['source']==authority['source'] and
             expected['held']==documents['BASELINE368_FULL_OBJECTS.json']['manifest_held'] and
             expected['links']==authority['links'] and list(expected['links'])==authority['ids'] and
             observed==expected,'Actual375 manifest differs from independent full source objects')
    return deepcopy(authority),deepcopy(files)


def approved375_catalogue(root):
    authority,_=_capture375_current(root)
    return {key:authority[key] for key in ('ids','profiles','links','source')}


def approved375_runtime(root):
    _,files=_capture375_current(root)
    return files
