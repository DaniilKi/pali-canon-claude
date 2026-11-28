"""Stable current source authority and fresh actual-data acceptance.

The immutable pure382 decoder runs once. Current386 is its exact source prefix
plus four independently approved publisher editions; no old runtime is invoked.
"""
from copy import deepcopy
import json
import re
import web_reader_intake382 as historical382
from web_reader_intake375 import _physical_root, _relative, _regular, _sha, _require, _row
boundary=historical382.boundary
CANON=historical382.CANON
BASE_COMMIT='81c970094bcb1a539acf4e3856491ea9af9cc57f'
DIRECTORY='docs/evidence/apadana/english394-407-four'
PAIRS=(('tha-ap396',394),('tha-ap399',397),('tha-ap408',406),('tha-ap409',407))
IDS=tuple(uid for uid,_ in PAIRS)
PINS={'APPROVAL.json': '40552a2b723037f0b63022e747bfa9c20077e4c26404ca6125473c412d722307', 'LINKS.json': '116e8fbe5437a47c8226496a7f2bd4c7657ed2dbd47a0cf78094417edd2fa251', 'NORMALIZATION_REVIEW.json': '2fb7a5df73246f98646540b7b40cb3f7a750f518bfd76402f3573dadb7f3a9c1', 'PROFILES.json': 'fef6e9e9af3c70dd5efdbec3e98a9d882165cde92337df022b1e49e4077415b1', 'REQUIRED_NOTICES.json': 'acff79613ecac0907c2d748f7c192088c174b51564edefb07f415e2322f41bed', 'SOURCE_BINDINGS.json': '54119b17caeb16f4bec416b4698a67bbb8c3b5cb7e4cf07e5e7983028c524e89', 'SOURCE_REVIEW.json': 'f0b53867478e3fcdd7ecf049f9b57a1cfadfdf828bba2b269ba6873fec5a7d92'}
RUNTIME_PINS={'EXPECTED_MANIFEST.json': '29d22858a2a2cf541b9c4b81ef6ddc3c28ed84327580da99349c7a601d14c0b7', 'RUNTIME_INVENTORY.json': '532d80523591416519bea6cfe0cada68db7d0e80873d89fa4696844ce06faf45', 'RUNTIME_REVIEW.json': '6989e1ab154c515b4600f036e408ebda82aa1e5e33dcd5620e84ea3d6db51db1'}
_pin=historical382._pin
_keys=historical382._keys
_typed=historical382._typed


def _sealed(root,name,pin):
    _pin(pin);raw=_regular(root,name)
    _require(_sha(raw)==pin,'Changed independently sealed current authority: '+name)
    value=json.loads(raw);_require(type(value)is dict,'Exact sealed current object required')
    return value,raw


def _source_four(root):
    root=_physical_root(root)
    prior=historical382._source382(root)  # PURE fixed382 source exactly ONCE
    old=prior['english']
    captured={leaf:_sealed(root,DIRECTORY+'/'+leaf,pin)for leaf,pin in PINS.items()}
    documents={leaf:row[0]for leaf,row in captured.items()};approval=documents['APPROVAL.json']
    _keys(approval,historical382.APPROVAL_KEYS,'Closed current source approval fields required')
    _require(approval['schema']=='reviewed-thera394-407-four-approval-v1'and
        approval['status']=='approved'and approval['base_commit']==BASE_COMMIT and
        approval['canonical_logical_sha256']==CANON and
        approval['publisher_revision']==boundary.english380.PUBLISHER and
        approval['vri_revision']==boundary.SOURCE_COMMIT and
        approval['source_and_normalization_only']is True and approval['runtime_approval']is False and
        approval['release_approval']is False,'Exact independently reviewed current source scope required')
    _require(approval['baseline_source']=={'directory':historical382.DIRECTORY+'/',
        'approval_sha256':historical382.PINS['APPROVAL.json'],
        'canonical_binding_sha256':boundary.PINS['CURRENT_CANON_BINDING.json']},
        'Immutable382 source and883d canonical binding required')
    records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem}for uid,poem in PAIRS]
    ids=old['ids']+list(IDS)
    _require(len(old['ids'])==382 and len(ids)==len(set(ids))==386 and
        approval['baseline_ids']==old['ids']and approval['approved_ids']==list(IDS)and
        approval['approved_records']==records and approval['expected_profile_ids']==ids and
        approval['held_ids']==old['selection']['held_ids']and len(approval['held_ids'])==10 and
        not set(ids)&set(approval['held_ids']),'Exact old382 prefix, four literal sources and ten holds required')
    _keys(approval['source_refs'],historical382.SOURCE_REFS,'Closed source references required')
    for role,leaf in historical382.SOURCE_REFS.items():
        _require(approval['source_refs'][role]=={'file':leaf,'bytes':len(captured[leaf][1]),'sha256':PINS[leaf]},
                 'Every source/rights/review leaf must be independently pinned')
    added=documents['PROFILES.json'];links_added=documents['LINKS.json']
    _require(list(added)==list(links_added)==list(IDS),'Exact four source profile/link identities required')
    _keys(approval['required_visible_qualifications'],IDS,'Exact four mandatory qualifications required')
    for uid,poem in PAIRS:
        profile=added[uid]
        _require(profile['id']==uid and profile['publisher_chapter']=='chapter-3'and profile['poem']==poem and
            profile['path']=='/text/chapter-3/poem-'+str(poem)+'/'and profile['source']=='apadana'and
            profile['license']=='CC BY-NC-SA 4.0'and profile['translation_revision']==boundary.english380.PUBLISHER and
            profile['translator']=='Jonathan S. Walters'and
            links_added[uid]=={**profile,'english':profile['title'],'match':'individually-reviewed-whole-poem'}and
            approval['required_visible_qualifications'][uid]==profile['mapping_notes']and
            not set(profile)&{'text','body','notes','translator_notes','publisher_paratext','raw'},
            'Exact source edition, ownership, rights and qualifications required')
    peer=documents['SOURCE_REVIEW.json']
    _keys(peer,('schema','status','base_commit','canonical_logical_sha256','publisher_revision','vri_revision',
        'approved_pairs','source_documents','producer_evidence','all_nine_publisher_holds_unchanged',
        'all_ten_historical_canonical_held_ids_unchanged','complete_publisher_editions_only',
        'source_and_normalization_only','runtime_API_activation_or_release_approval','operations'),
        'Closed independent four-source review required')
    pairs=[[poem,uid]for uid,poem in PAIRS]
    _require(peer['schema']=='reviewed-thera394-407-four-independent-source-approval-v1'and
        peer['status']=='GO_EXACT_FOUR_PUBLISHER_EDITION_SOURCE_SCOPES_ONLY'and peer['base_commit']==BASE_COMMIT and
        peer['canonical_logical_sha256']==CANON and peer['publisher_revision']==boundary.english380.PUBLISHER and
        peer['vri_revision']==boundary.SOURCE_COMMIT and peer['approved_pairs']==pairs and
        all(peer[k]is True for k in ('all_nine_publisher_holds_unchanged','all_ten_historical_canonical_held_ids_unchanged',
            'complete_publisher_editions_only','source_and_normalization_only'))and
        peer['runtime_API_activation_or_release_approval']is False and
        type(peer['operations'])is str and 0<len(peer['operations'])<=20000,
        'Independent source-only review, separate nine/ten holds and literal identities required')
    roles={'profiles':'PROFILES.json','approved_links':'LINKS.json','source_bindings':'SOURCE_BINDINGS.json',
        'normalization_review':'NORMALIZATION_REVIEW.json','required_notices':'REQUIRED_NOTICES.json'}
    _keys(peer['source_documents'],(*roles,'producer_pending_links'),'Closed peer source document roles required')
    for role,leaf in roles.items():
        _require(peer['source_documents'][role]=={'file':leaf,'bytes':len(captured[leaf][1]),'sha256':PINS[leaf]},
                 'Exact peer-authenticated source bytes required')
    _require(peer['source_documents']['producer_pending_links']=={'file':'PROPOSED_LINKS.json','bytes':29727,
        'sha256':'d0c8cb4a974ea95ad1dd8da269a4addf56ace4bd52a3417f7e43d74316b837f3'},
        'Approved links retain independently checked inverse to original pending links')
    _keys(peer['producer_evidence'],('original_source_packet','original_independent_source_review',
        'additive_author81_reverification','current382_prefix_evidence','source_goldens'),
        'Closed independent producer provenance required')
    for row in peer['producer_evidence'].values():
        _keys(row,('file','bytes','sha256'),'Closed external evidence descriptor required');_row(row)
        _require(type(row['file'])is str and row['file'].startswith('/tmp/'),'External provenance descriptor only')
    _require(peer['producer_evidence']['additive_author81_reverification']['sha256']==PINS['NORMALIZATION_REVIEW.json'],
        'Author normalization is separately authenticated by the independent peer')
    bindings=documents['SOURCE_BINDINGS.json'];normalization=documents['NORMALIZATION_REVIEW.json']
    _require(bindings['literal_pairs']==pairs and bindings['canonical_logical_sha256']==CANON and
        bindings['source_preparation_only']is True and bindings['runtime_API_activation_or_release_approval']is False and
        set(bindings['source_derived_API_expected_metadata'])=={'entries'}and
        list(bindings['source_derived_API_expected_metadata']['entries'])==list(IDS)and
        normalization['status']=='GO_UNCHANGED_FOUR_PUBLISHER_EDITION_SOURCE_SCOPES_AGAINST_ACCEPTED81_ONLY'and
        normalization['canonical_logical_sha256']==CANON and normalization['source_reverification_only']is True and
        normalization['new_independent_review_claim']is False and
        normalization['runtime_API_browser_CI_activation_release_or_push_approval']is False,
        'Pinned source-derived expectations and original normalization qualifications required')
    profiles={**old['profiles'],**added};links={**old['links'],**links_added};source=deepcopy(old['source'])
    _require(source['policy'].count('382 finite')==source['policy'].count('342 explicitly mapped Therā')==1,
        'Exact inherited policy declaration required')
    source['policy']=source['policy'].replace('382 finite','386 finite').replace('342 explicitly mapped Therā','346 explicitly mapped Therā')
    baseline_records=old['selection']['baseline_records']+old['selection']['approved_records']
    _require([row['id']for row in baseline_records]==old['ids'],'Exact old382 source record order required')
    selection={**deepcopy(approval),'baseline_records':deepcopy(baseline_records),
        'current_source_approval':{'file':DIRECTORY+'/APPROVAL.json','sha256':PINS['APPROVAL.json']},
        'historical382_source_approval':deepcopy(old['selection']['current_source_approval']),
        **{key:deepcopy(old['selection'][key])for key in ('historical380_source_approval','historical375_source_approval',
            'historical368_source_approval','historical359_source_approval','historical343_source_approval')}}
    manifest={'version':1,'source':source,'vri_commit':boundary.SOURCE_COMMIT,'held':deepcopy(old['manifest']['held']),'links':links}
    return {'english':{'ids':ids,'profiles':profiles,'links':links,'source':source,'selection':selection,'approval':approval,
        'historical368':old['historical368'],'historical375':old['historical375'],'historical380':old['historical380'],
        'historical382':old,'source_cohorts':{'four394407':{'directory':DIRECTORY+'/',
            'ids':list(IDS),'records':deepcopy(records),'profiles':added,'links':links_added,
            'documents':documents,'approval':approval}},'documents':documents,'manifest':manifest},'canonical':prior['canonical'],'widget':widget_contract()}


def _source(root):
    # One pure historical382 decode inside the fixed four source declaration.
    return _source_four(root)


def source_cohort(context,key):
    """Select one closed source-only addition cohort; never capture or read IO."""
    _require(type(key)is str and key in ('four394407','eight411419'),
        'Closed named source cohort required')
    _require(type(context)is dict and set(context)=={'english','canonical','widget'},
        'Closed validated current source context required')
    cohorts=context['english']['source_cohorts']
    _require(type(cohorts)is dict and key in cohorts,'Named source cohort is not declared')
    cohort=cohorts[key]
    _keys(cohort,('directory','ids','records','profiles','links','documents','approval'),
        'Closed source-only addition cohort required')
    return deepcopy(cohort)


def source_authority(root):
    return deepcopy(_source(root))


def source_metadata_pins():
    names=historical382._source_metadata_pins()
    for leaf,pin in PINS.items():
        name=DIRECTORY+'/'+leaf;_require(name not in names,'Overlapping current source prerequisites');names[name]=pin
    _require(len(names)==34,'Exact27 historical plus7 current source documents required')
    return names


def all_metadata_pins():
    names=historical382._all_metadata_pins()
    for leaf,pin in {**PINS,**RUNTIME_PINS}.items():
        name=DIRECTORY+'/'+leaf;_require(name not in names,'Overlapping current metadata prerequisites');names[name]=pin
    _require(len(names)==48,'Exact38 historical plus10 current metadata documents required')
    return names


def source_views(context):
    return {'current':context,'historical382':{'english':context['english']['historical382'],
        'canonical':deepcopy(context['canonical']),'widget':{'version':'v50','uri':'ui://pali-canon/reader-v50.html',
        'skybridge':'ui://pali-canon/reader-v50.skybridge.html'}}}


def widget_contract():
    return {'version':'v51','uri':'ui://pali-canon/reader-v51.html','skybridge':'ui://pali-canon/reader-v51.skybridge.html'}


def capture_current(root):
    root=_physical_root(root)
    for pin in RUNTIME_PINS.values():_pin(pin)
    context=_source(root)
    old=context['english']['historical380']
    proof=boundary.english380._proof_rows(old)
    old_metadata=historical382._all_metadata_pins()
    _require(len(proof)==226 and len(old_metadata)==38 and not set(proof)&set(old_metadata),
             'Old254 plus exact pair10 immutable prerequisites remain mandatory')
    for name,row in proof.items():
        if row['domain']=='H_runtime_prerequisite':boundary.english380._read_row(root,name,row)
    # Historical SOURCE decoder checked the other source proofs. Authenticate
    # every old runtime document separately; none is actual386 acceptance.
    old_source=historical382._source_metadata_pins();old_runtime={}
    for name,pin in old_metadata.items():
        if name not in old_source:old_runtime[name]=boundary._sealed(root,name,pin)
    _require(len(old_runtime)==11,'Exact eight old plus three pair runtime prerequisites required')
    predecessor=old_runtime[historical382.DIRECTORY+'/RUNTIME_INVENTORY.json']
    _require(predecessor['canonical_logical_sha256']==CANON and predecessor['runtime_files']==34,
             'Immutable883d/runtime382 predecessor required')
    runtime={leaf:_sealed(root,DIRECTORY+'/'+leaf,pin)[0]for leaf,pin in RUNTIME_PINS.items()}
    inventory=runtime['RUNTIME_INVENTORY.json'];review=runtime['RUNTIME_REVIEW.json']
    _keys(inventory,historical382.RUNTIME_KEYS,'Closed actual386 inventory fields required');_keys(review,historical382.REVIEW_KEYS,'Closed independent386 runtime review required')
    prior_pin=historical382.RUNTIME_PINS['RUNTIME_INVENTORY.json']
    _require(inventory['schema']=='independent-reviewed-intake386-runtime-inventory-v1' and
             inventory['baseline_commit']==BASE_COMMIT and inventory['curation_sha256']==PINS['APPROVAL.json'] and
             inventory['canonical_logical_sha256']==CANON and inventory['predecessor_inventory_sha256']==prior_pin and
             type(inventory['runtime_files']) is int and inventory['runtime_files']==34 and
             type(inventory['candidate_commit']) is str and re.fullmatch('[a-f0-9]{40}',inventory['candidate_commit']) is not None and
             inventory['inventory_only'] is True and inventory['behavioral_or_release_approval'] is False,
             'Independent actual386 runtime inventory required')
    files=inventory['files'];before=predecessor['files']
    _require(type(files) is dict and len(files)==34 and list(files)==sorted(files)==list(before),
             'Exact unchanged sorted34 runtime pathnames required')
    changed=[name for name in files if files[name]!=before[name]];unchanged=[name for name in files if name not in changed]
    _require(changed==list(historical382.CHANGED_PATHS)==inventory['allowed_changed_paths'] and unchanged==inventory['unchanged_paths'],
             'Only reviewed AP catalogue and four app bundles may change')
    _require(review['schema']=='reviewed-intake386-runtime-approval-v1' and review['status']=='GO_RUNTIME_INVENTORY_ONLY' and
             review['inventory_sha256']==RUNTIME_PINS['RUNTIME_INVENTORY.json'] and
             review['application_commit']==inventory['candidate_commit'] and review['curation_sha256']==PINS['APPROVAL.json'] and
             review['baseline_commit']==BASE_COMMIT and review['predecessor_inventory_sha256']==prior_pin and
             review['expected_manifest_sha256']==RUNTIME_PINS['EXPECTED_MANIFEST.json'] and
             type(review['runtime_paths']) is int and review['runtime_paths']==34 and
             type(review['actual_data_paths']) is int and review['actual_data_paths']==27 and
             review['changed_paths']==changed and type(review['unchanged_paths']) is int and review['unchanged_paths']==len(unchanged) and
             review['independent_manifest_composition'] is True and review['physical_and_Git_blob_inventory_exact'] is True and
             review['canonical_data26_and_H_held_preserved'] is True and
             review['behavioral_installed_browser_native_CI_or_release_approval'] is False and
             type(review['operations']) is str and 0<len(review['operations'])<=20000,
             'Exact independent386 runtime approval binding required')
    raw_data={}
    for name,row in files.items():
        _relative(name);_keys(row,('bytes','sha256'),'Exact runtime row required');_row(row)
        if name.startswith('data/'):
            if name!='data/apadana.json':_require(row==before[name],'All26 unrelated data remain unchanged')
            raw_data[name]=boundary._read_row(root,'server/'+name,row)
    _require(len(raw_data)==27 and 'data/apadana.json'in raw_data,'Exactly once-read actual27 data required')
    expected=runtime['EXPECTED_MANIFEST.json'];_keys(expected,('version','source','vri_commit','held','links'),'Exact independent386 manifest required')
    _require(_typed(expected)==_typed(context['english']['manifest']) and list(expected['links'])==context['english']['ids'] and
             _typed(json.loads(raw_data['data/apadana.json']))==_typed(expected),
             'Actual current catalogue must equal independent full382 prefix plus exact four source objects')
    return deepcopy(context),deepcopy(files)



def approved_catalogue(root):
    context,_=capture_current(root)
    return deepcopy({key:context['english'][key]for key in ('ids','profiles','links','source')})


def approved_runtime(root):
    _,files=capture_current(root)
    return deepcopy(files)


def reviewed_intake(root):
    return source_authority(root)['english']['selection']


def curated_additions(root,anchor_filename):
    root=_physical_root(root)
    _require(type(anchor_filename)is str and anchor_filename in boundary.english380.ANCHORS,
        'Closed literal historical anchor required')
    authority=_source(root)['english'];name='docs/evidence/apadana/'+anchor_filename
    rows=boundary.english380._proof_rows(authority['historical380'])
    _require(name in rows and rows[name]['domain']=='H_source_prerequisite','Mandatory historical source anchor required')
    raw=boundary.english380._read_row(root,name,rows[name]);anchor=json.loads(raw);size=boundary.english380.ANCHORS[anchor_filename]
    _require(type(anchor['expected_profile_ids'])is list and len(anchor['expected_profile_ids'])==size and
        authority['ids'][:size]==anchor['expected_profile_ids'],'Exact historical anchor prefix required')
    ids=authority['ids'][size:]
    return deepcopy({'curation':authority['selection'],'anchor':anchor,'ids':ids,
        'profiles':{uid:authority['profiles'][uid]for uid in ids},'links':{uid:authority['links'][uid]for uid in ids}})
