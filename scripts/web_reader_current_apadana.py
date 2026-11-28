"""Stable current source authority and fresh actual-data acceptance.

The immutable pure382 decoder runs once, followed by the fixed four and eight
source declarations. Cohort views never invoke or project an older runtime.
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



FOUR_BASE_COMMIT=BASE_COMMIT
FOUR_DIRECTORY=DIRECTORY
FOUR_PAIRS=PAIRS
FOUR_IDS=IDS
FOUR_PINS=PINS
FOUR_RUNTIME_PINS=RUNTIME_PINS
BASE_COMMIT='68dc2aafdfe8194dd40c78c00c62616ff0b18aea'
DIRECTORY='docs/evidence/apadana/english411-419-eight'
PAIRS=(('tha-ap413',411),('tha-ap414',412),('tha-ap416',414),('tha-ap417',415),('tha-ap418',416),('tha-ap419',417),('tha-ap420',418),('tha-ap421',419))
IDS=tuple(uid for uid,_ in PAIRS)
PINS={'APPROVAL.json': 'f29b48b27895947b26a66f95841ca8514cbcaf7d3de3fc3642849cab9dbc7b8b', 'LINKS.json': '828fca68e112e4cb31816de084569f5e55517314a548085698f83a17505ca33e', 'NORMALIZATION_REVIEW.json': '9d555fbfa38c2f80bab6101a5c2e952a4b37471ad206f22c5df733a503a38992', 'PROFILES.json': '332c658097eec4b05cca3ab5bee1e5cb1b341923559a9ab198cecb0f6cf5b67c', 'REQUIRED_NOTICES.json': '54df7eded75336ae018bf2056b0eb3d105cac1b0ce0c55a320e353bc8cb1bf93', 'SOURCE_BINDINGS.json': 'c2fd278d28188f159124d77d10cc58cccd2ffd921d12d412dcc96a79576344ef', 'SOURCE_REVIEW.json': 'e93ae65a9cf27031d989c40f1dd89f9fd16f36b8e0da92b1cba5ae01f4f15aee'}
RUNTIME_PINS={'EXPECTED_MANIFEST.json':'8cf5b7ca6476c90c813e47d3eafdf77a4837ae878ba1153288e71e4a6f2aa171','RUNTIME_INVENTORY.json':'364339616b495e56c1d4973b691e0334334fc44fcfb975a653be0fd3c4cc35c4','RUNTIME_REVIEW.json':'bc150098594fb75d45fd185f9aa94d1ea9b67630edd83df0b3de5931bcb34de8'}

def _source_four(root):
    root=_physical_root(root)
    prior=historical382._source382(root)  # PURE fixed382 source exactly ONCE
    old=prior['english']
    captured={leaf:_sealed(root,FOUR_DIRECTORY+'/'+leaf,pin)for leaf,pin in FOUR_PINS.items()}
    documents={leaf:row[0]for leaf,row in captured.items()};approval=documents['APPROVAL.json']
    _keys(approval,historical382.APPROVAL_KEYS,'Closed current source approval fields required')
    _require(approval['schema']=='reviewed-thera394-407-four-approval-v1'and
        approval['status']=='approved'and approval['base_commit']==FOUR_BASE_COMMIT and
        approval['canonical_logical_sha256']==CANON and
        approval['publisher_revision']==boundary.english380.PUBLISHER and
        approval['vri_revision']==boundary.SOURCE_COMMIT and
        approval['source_and_normalization_only']is True and approval['runtime_approval']is False and
        approval['release_approval']is False,'Exact independently reviewed current source scope required')
    _require(approval['baseline_source']=={'directory':historical382.DIRECTORY+'/',
        'approval_sha256':historical382.PINS['APPROVAL.json'],
        'canonical_binding_sha256':boundary.PINS['CURRENT_CANON_BINDING.json']},
        'Immutable382 source and883d canonical binding required')
    records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem}for uid,poem in FOUR_PAIRS]
    ids=old['ids']+list(FOUR_IDS)
    _require(len(old['ids'])==382 and len(ids)==len(set(ids))==386 and
        approval['baseline_ids']==old['ids']and approval['approved_ids']==list(FOUR_IDS)and
        approval['approved_records']==records and approval['expected_profile_ids']==ids and
        approval['held_ids']==old['selection']['held_ids']and len(approval['held_ids'])==10 and
        not set(ids)&set(approval['held_ids']),'Exact old382 prefix, four literal sources and ten holds required')
    _keys(approval['source_refs'],historical382.SOURCE_REFS,'Closed source references required')
    for role,leaf in historical382.SOURCE_REFS.items():
        _require(approval['source_refs'][role]=={'file':leaf,'bytes':len(captured[leaf][1]),'sha256':FOUR_PINS[leaf]},
                 'Every source/rights/review leaf must be independently pinned')
    added=documents['PROFILES.json'];links_added=documents['LINKS.json']
    _require(list(added)==list(links_added)==list(FOUR_IDS),'Exact four source profile/link identities required')
    _keys(approval['required_visible_qualifications'],FOUR_IDS,'Exact four mandatory qualifications required')
    for uid,poem in FOUR_PAIRS:
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
    pairs=[[poem,uid]for uid,poem in FOUR_PAIRS]
    _require(peer['schema']=='reviewed-thera394-407-four-independent-source-approval-v1'and
        peer['status']=='GO_EXACT_FOUR_PUBLISHER_EDITION_SOURCE_SCOPES_ONLY'and peer['base_commit']==FOUR_BASE_COMMIT and
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
        _require(peer['source_documents'][role]=={'file':leaf,'bytes':len(captured[leaf][1]),'sha256':FOUR_PINS[leaf]},
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
    _require(peer['producer_evidence']['additive_author81_reverification']['sha256']==FOUR_PINS['NORMALIZATION_REVIEW.json'],
        'Author normalization is separately authenticated by the independent peer')
    bindings=documents['SOURCE_BINDINGS.json'];normalization=documents['NORMALIZATION_REVIEW.json']
    _require(bindings['literal_pairs']==pairs and bindings['canonical_logical_sha256']==CANON and
        bindings['source_preparation_only']is True and bindings['runtime_API_activation_or_release_approval']is False and
        set(bindings['source_derived_API_expected_metadata'])=={'entries'}and
        list(bindings['source_derived_API_expected_metadata']['entries'])==list(FOUR_IDS)and
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
        'current_source_approval':{'file':FOUR_DIRECTORY+'/APPROVAL.json','sha256':FOUR_PINS['APPROVAL.json']},
        'historical382_source_approval':deepcopy(old['selection']['current_source_approval']),
        **{key:deepcopy(old['selection'][key])for key in ('historical380_source_approval','historical375_source_approval',
            'historical368_source_approval','historical359_source_approval','historical343_source_approval')}}
    manifest={'version':1,'source':source,'vri_commit':boundary.SOURCE_COMMIT,'held':deepcopy(old['manifest']['held']),'links':links}
    return {'english':{'ids':ids,'profiles':profiles,'links':links,'source':source,'selection':selection,'approval':approval,
        'historical368':old['historical368'],'historical375':old['historical375'],'historical380':old['historical380'],
        'historical382':old,'source_cohorts':{'four394407':{'directory':FOUR_DIRECTORY+'/',
            'ids':list(FOUR_IDS),'records':deepcopy(records),'profiles':added,'links':links_added,
            'documents':documents,'approval':approval}},'documents':documents,'manifest':manifest},'canonical':prior['canonical'],'widget':widget_contract()}


def _append_eight(root):
    root=_physical_root(root)
    prior=_source_four(root)  # pure382 once, then immutable four source cohort
    old=prior['english']
    captured={leaf:_sealed(root,DIRECTORY+'/'+leaf,pin)for leaf,pin in PINS.items()}
    documents={leaf:row[0]for leaf,row in captured.items()};approval=documents['APPROVAL.json']
    _keys(approval,historical382.APPROVAL_KEYS,'Closed current source approval fields required')
    _require(approval['schema']=='reviewed-thera411-419-eight-approval-v1'and
        approval['status']=='approved'and approval['base_commit']==BASE_COMMIT and
        approval['canonical_logical_sha256']==CANON and
        approval['publisher_revision']==boundary.english380.PUBLISHER and
        approval['vri_revision']==boundary.SOURCE_COMMIT and
        approval['source_and_normalization_only']is True and approval['runtime_approval']is False and
        approval['release_approval']is False,'Exact independently reviewed current source scope required')
    _require(approval['baseline_source']=={'directory':FOUR_DIRECTORY+'/',
        'approval_sha256':FOUR_PINS['APPROVAL.json'],
        'canonical_binding_sha256':boundary.PINS['CURRENT_CANON_BINDING.json']},
        'Immutable four source cohort and883d binding required')
    records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem}for uid,poem in PAIRS]
    ids=old['ids']+list(IDS)
    _require(len(old['ids'])==386 and len(ids)==len(set(ids))==394 and
        approval['baseline_ids']==old['ids']and approval['approved_ids']==list(IDS)and
        approval['approved_records']==records and approval['expected_profile_ids']==ids and
        approval['held_ids']==old['selection']['held_ids']and len(approval['held_ids'])==10 and
        not set(ids)&set(approval['held_ids']),'Exact source386 prefix, eight literal sources and ten holds required')
    _keys(approval['source_refs'],historical382.SOURCE_REFS,'Closed source references required')
    for role,leaf in historical382.SOURCE_REFS.items():
        _require(approval['source_refs'][role]=={'file':leaf,'bytes':len(captured[leaf][1]),'sha256':PINS[leaf]},
                 'Every source/rights/review leaf must be independently pinned')
    added=documents['PROFILES.json'];links_added=documents['LINKS.json']
    _require(list(added)==list(links_added)==list(IDS),'Exact eight source profile/link identities required')
    _keys(approval['required_visible_qualifications'],IDS,'Exact eight mandatory qualifications required')
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
        'Closed independent eight-source review required')
    pairs=[[poem,uid]for uid,poem in PAIRS]
    _require(peer['schema']=='reviewed-thera411-419-eight-independent-source-approval-v1'and
        peer['status']=='GO_EXACT_EIGHT_PUBLISHER_EDITION_SOURCE_SCOPES_AND_NORMALIZATION_ONLY'and
        peer['base_commit']==BASE_COMMIT and peer['canonical_logical_sha256']==CANON and
        peer['publisher_revision']==boundary.english380.PUBLISHER and peer['vri_revision']==boundary.SOURCE_COMMIT and
        peer['approved_pairs']==pairs and all(peer[k]is True for k in ('all_nine_publisher_holds_unchanged',
            'all_ten_historical_canonical_held_ids_unchanged','complete_publisher_editions_only','source_and_normalization_only'))and
        peer['runtime_API_activation_or_release_approval']is False and type(peer['operations'])is str and
        0<len(peer['operations'])<=20000,'Independent eight-source/normalization approval required')
    roles={'profiles':'PROFILES.json','approved_links':'LINKS.json','source_bindings':'SOURCE_BINDINGS.json',
        'normalization_review':'NORMALIZATION_REVIEW.json','required_notices':'REQUIRED_NOTICES.json'}
    _keys(peer['source_documents'],roles,'Closed independent five source-document roles required')
    for role,leaf in roles.items():
        _require(peer['source_documents'][role]=={'file':leaf,'bytes':len(captured[leaf][1]),'sha256':PINS[leaf]},
            'Exact peer-authenticated eight source bytes required')
    evidence=('original_raw_scope_review','original_lossless_normalization_packet','normalization_source_peer',
        'profile_field_and_decoder_comparison','five_app_source_review','immutable_source_domain_manifest','accepted386_source_approval')
    _keys(peer['producer_evidence'],evidence,'Closed eight-source provenance roles required')
    for row in peer['producer_evidence'].values():
        _keys(row,('file','bytes','sha256'),'Closed provenance descriptor required');_row(row)
        _require(type(row['file'])is str and bool(row['file']),'Nonempty provenance name required; no extraIO')
    _require(peer['producer_evidence']['normalization_source_peer']['sha256']==PINS['NORMALIZATION_REVIEW.json']and
        peer['producer_evidence']['accepted386_source_approval']['sha256']==FOUR_PINS['APPROVAL.json'],
        'Exact normalization and prior four authority links required')
    bindings=documents['SOURCE_BINDINGS.json'];normalization=documents['NORMALIZATION_REVIEW.json'];contract=bindings['source_contract']
    _require(bindings['schema']=='reviewed-thera411-419-eight-source-bindings-v1'and
        bindings['new_profiles_derived_from_application']is False and bindings['runtime_or_activation_or_release_approval']is False and
        contract['literal_pairs']==pairs and contract['canonical_logical_sha256']==CANON and
        contract['publisher_revision']==boundary.english380.PUBLISHER and contract['VRI_revision']==boundary.SOURCE_COMMIT and
        contract['source_only']is True and contract['normalization_API_runtime_activation_or_release_approval']is False and
        contract['conditional_publishers_unchanged']==[413,420]and
        set(bindings['source_derived_API_expected_metadata'])=={'entries'}and
        list(bindings['source_derived_API_expected_metadata']['entries'])==list(IDS)and
        normalization['schema']=='independent-eight411420-lossless-normalization-source-review-v1'and
        normalization['status']=='GO_EXACT_EIGHT_SOURCE_NORMALIZATION_DOMAINS_ONLY'and
        normalization['runtime_or_activation_or_release_approval']is False,
        'Exact embedded independent contract/goldens and normalization-only domains required')
    _require(bindings['source_domain_manifest']==peer['producer_evidence']['immutable_source_domain_manifest'],
        'Provenance-only domain manifest is hash-linked; no extra authority reads')
    profiles={**old['profiles'],**added};links={**old['links'],**links_added};source=deepcopy(old['source'])
    _require(source['policy'].count('386 finite')==source['policy'].count('346 explicitly mapped Therā')==1,
        'Exact inherited policy declaration required')
    source['policy']=source['policy'].replace('386 finite','394 finite').replace('346 explicitly mapped Therā','354 explicitly mapped Therā')
    baseline_records=old['selection']['baseline_records']+old['selection']['approved_records']
    _require([row['id']for row in baseline_records]==old['ids'],'Exact preceding four-cohort source record order required')
    selection={**deepcopy(approval),'baseline_records':deepcopy(baseline_records),
        'current_source_approval':{'file':DIRECTORY+'/APPROVAL.json','sha256':PINS['APPROVAL.json']},
        **{key:deepcopy(old['selection'][key])for key in ('historical382_source_approval','historical380_source_approval',
            'historical375_source_approval','historical368_source_approval','historical359_source_approval','historical343_source_approval')}}
    manifest={'version':1,'source':source,'vri_commit':boundary.SOURCE_COMMIT,'held':deepcopy(old['manifest']['held']),'links':links}
    cohort={'directory':DIRECTORY+'/','ids':list(IDS),'records':deepcopy(records),'profiles':added,'links':links_added,
        'documents':documents,'approval':approval}
    return {'english':{'ids':ids,'profiles':profiles,'links':links,'source':source,'selection':selection,'approval':approval,
        'historical368':old['historical368'],'historical375':old['historical375'],'historical380':old['historical380'],
        'historical382':old['historical382'],'source_cohorts':{**old['source_cohorts'],'eight411419':cohort},
        'documents':documents,'manifest':manifest},'canonical':prior['canonical'],'widget':widget_contract()}


def _source(root):
    # One pure historical382 decode and two fixed source-only addition steps.
    return _append_eight(root)


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
    for directory,pins in ((FOUR_DIRECTORY,FOUR_PINS),(DIRECTORY,PINS)):
        for leaf,pin in pins.items():
            name=directory+'/'+leaf;_require(name not in names,'Overlapping canonical source prerequisites');names[name]=pin
    _require(len(names)==41,'Exact27 legacy plus seven four and seven eight authority documents required')
    return names


def all_metadata_pins():
    names=historical382._all_metadata_pins()
    for directory,pins in ((FOUR_DIRECTORY,{**FOUR_PINS,**FOUR_RUNTIME_PINS}),(DIRECTORY,{**PINS,**RUNTIME_PINS})):
        for leaf,pin in pins.items():
            name=directory+'/'+leaf;_require(name not in names,'Overlapping canonical authority/runtime prerequisites');names[name]=pin
    _require(len(names)==58,'Exact38 legacy plus ten four and ten eight authority/runtime documents required')
    return names


def source_views(context):
    return {'current':context,'historical382':{'english':context['english']['historical382'],
        'canonical':deepcopy(context['canonical']),'widget':{'version':'v50','uri':'ui://pali-canon/reader-v50.html',
        'skybridge':'ui://pali-canon/reader-v50.skybridge.html'}}}


def widget_contract():
    return {'version':'v52','uri':'ui://pali-canon/reader-v52.html','skybridge':'ui://pali-canon/reader-v52.skybridge.html'}


def capture_current(root):
    root=_physical_root(root)
    for pin in RUNTIME_PINS.values():_pin(pin)
    context=_source(root)
    old=context['english']['historical380']
    proof=boundary.english380._proof_rows(old)
    old_metadata=historical382._all_metadata_pins()
    for leaf,pin in {**FOUR_PINS,**FOUR_RUNTIME_PINS}.items():
        name=FOUR_DIRECTORY+'/'+leaf;_require(name not in old_metadata,'Disjoint four prerequisite');old_metadata[name]=pin
    _require(len(proof)==226 and len(old_metadata)==48 and not set(proof)&set(old_metadata),
             'Original254 plus pair10 and four10 remain mandatory')
    for name,row in proof.items():
        if row['domain']=='H_runtime_prerequisite':boundary.english380._read_row(root,name,row)
    # Historical SOURCE decoder checked the other source proofs. Authenticate
    # every old runtime document separately; none is actual current394 acceptance.
    old_source=historical382._source_metadata_pins()
    old_source.update({FOUR_DIRECTORY+'/'+leaf:pin for leaf,pin in FOUR_PINS.items()});old_runtime={}
    for name,pin in old_metadata.items():
        if name not in old_source:old_runtime[name]=boundary._sealed(root,name,pin)
    _require(len(old_runtime)==14,'Exact eleven legacy plus three four runtime prerequisites required')
    predecessor=old_runtime[FOUR_DIRECTORY+'/RUNTIME_INVENTORY.json']
    _require(predecessor['canonical_logical_sha256']==CANON and predecessor['runtime_files']==34,
             'Immutable883d/four-cohort runtime metadata predecessor required')
    runtime={leaf:_sealed(root,DIRECTORY+'/'+leaf,pin)[0]for leaf,pin in RUNTIME_PINS.items()}
    inventory=runtime['RUNTIME_INVENTORY.json'];review=runtime['RUNTIME_REVIEW.json']
    _keys(inventory,historical382.RUNTIME_KEYS,'Closed actual current394 inventory fields required');_keys(review,historical382.REVIEW_KEYS,'Closed independent current394 runtime review required')
    prior_pin=FOUR_RUNTIME_PINS['RUNTIME_INVENTORY.json']
    _require(inventory['schema']=='independent-reviewed-current-apadana-runtime-inventory-v1' and
             inventory['baseline_commit']==BASE_COMMIT and inventory['curation_sha256']==PINS['APPROVAL.json'] and
             inventory['canonical_logical_sha256']==CANON and inventory['predecessor_inventory_sha256']==prior_pin and
             type(inventory['runtime_files']) is int and inventory['runtime_files']==34 and
             type(inventory['candidate_commit']) is str and re.fullmatch('[a-f0-9]{40}',inventory['candidate_commit']) is not None and
             inventory['inventory_only'] is True and inventory['behavioral_or_release_approval'] is False,
             'Independent actual current394 runtime inventory required')
    files=inventory['files'];before=predecessor['files']
    _require(type(files) is dict and len(files)==34 and list(files)==sorted(files)==list(before),
             'Exact unchanged sorted34 runtime pathnames required')
    changed=[name for name in files if files[name]!=before[name]];unchanged=[name for name in files if name not in changed]
    _require(changed==list(historical382.CHANGED_PATHS)==inventory['allowed_changed_paths'] and unchanged==inventory['unchanged_paths'],
             'Only reviewed AP catalogue and four app bundles may change')
    _require(review['schema']=='reviewed-current-apadana-runtime-approval-v1' and review['status']=='GO_RUNTIME_INVENTORY_ONLY' and
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
             'Exact independent current394 runtime approval binding required')
    raw_data={}
    for name,row in files.items():
        _relative(name);_keys(row,('bytes','sha256'),'Exact runtime row required');_row(row)
        if name.startswith('data/'):
            if name!='data/apadana.json':_require(row==before[name],'All26 unrelated data remain unchanged')
            raw_data[name]=boundary._read_row(root,'server/'+name,row)
    _require(len(raw_data)==27 and 'data/apadana.json'in raw_data,'Exactly once-read actual27 data required')
    expected=runtime['EXPECTED_MANIFEST.json'];_keys(expected,('version','source','vri_commit','held','links'),'Exact independent current394 manifest required')
    _require(_typed(expected)==_typed(context['english']['manifest']) and list(expected['links'])==context['english']['ids'] and
             _typed(json.loads(raw_data['data/apadana.json']))==_typed(expected),
             'Actual current catalogue must equal independent source386 prefix plus exact eight source objects')
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
