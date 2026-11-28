"""Fixed current382 source authority and actual883d data capture.

The pure boundary389390 decoder runs once. Its English380 objects and all254
proof prerequisites remain immutable historical inputs, never an old runtime
capture or projected API. Unreviewed source/runtime seal placeholders refuse.
"""
from copy import deepcopy
import json
import re
import web_reader_boundary389390 as boundary
from web_reader_intake375 import _physical_root, _relative, _regular, _sha, _require, _row

BASE_COMMIT='f03150ff03f75e20abfb735836093cf3a0bfe5c2'
CANON=boundary.CANON
DIRECTORY='docs/evidence/apadana/english401-402-pair'
PAIRS=(('tha-ap403',401),('tha-ap404',402))
IDS=tuple(uid for uid,_ in PAIRS)
PINS={'APPROVAL.json': '9d6efabf44deb7b51b65125f62dedf2cca4ec46ce7f1344c79923d42dee5ec2d', 'LINKS.json': 'a42e583e2907cf09c7ed3e2fbe9272d856020317baa6860977d2989d52e9d7bb', 'NORMALIZATION_REVIEW.json': 'e0ea63010169b44884cfd32e0af6b204ca003d5f1d65df3561c3f195afe6b437', 'PROFILES.json': 'e2bc9b358af5bf952ad3f97f7bdab567e4e057a2e66437e2d88cbb2e370f9133', 'REQUIRED_NOTICES.json': 'f6ce9f3073fe8464e7cde6e7d5f34bcc4cbdd6db84bfb576d7d8f7c6567c9aa9', 'SOURCE_BINDINGS.json': '5a0b036055a1aa8269db1a7db0c3efa6defe89c7d350c737aceadf38d04259e6', 'SOURCE_REVIEW.json': 'a6400bd389b0df73c1d625cf5eddea9d5267c709f51ba120d11c4b853891a52c'}
RUNTIME_PINS={'EXPECTED_MANIFEST.json': '0bdd61300073bdf55631709f0152707a9fa4039c5de55b31681260d5b74f43ae', 'RUNTIME_INVENTORY.json': 'd96c2bfcdd6ec0802f6e36dec6a792ee35e1cc05751b2579c57d6ad5871cf8b2', 'RUNTIME_REVIEW.json': 'f11c1576e2da95b250c8ba9e04d4f32db5d5f7a4ce8017ed1cd7e405245ae6ab'}
SOURCE_REFS={'profiles':'PROFILES.json','links':'LINKS.json','source_bindings':'SOURCE_BINDINGS.json','independent_source_review':'SOURCE_REVIEW.json','normalization_review':'NORMALIZATION_REVIEW.json','required_notices':'REQUIRED_NOTICES.json'}
APPROVAL_KEYS=('schema','status','base_commit','canonical_logical_sha256','publisher_revision','vri_revision','baseline_source','baseline_ids','approved_ids','approved_records','expected_profile_ids','held_ids','source_refs','required_visible_qualifications','source_and_normalization_only','runtime_approval','release_approval')
PEER_KEYS=('schema','status','base_commit','canonical_logical_sha256','publisher_revision','vri_revision','approved_pairs','source_documents','producer_evidence','all_nine_holds_unchanged','complete_publisher_editions_only','source_and_normalization_only','runtime_API_activation_or_release_approval','operations')
RUNTIME_KEYS=('schema','baseline_commit','candidate_commit','curation_sha256','canonical_logical_sha256','predecessor_inventory_sha256','runtime_files','files','allowed_changed_paths','unchanged_paths','inventory_only','behavioral_or_release_approval')
REVIEW_KEYS=('schema','status','inventory_sha256','application_commit','curation_sha256','baseline_commit','predecessor_inventory_sha256','expected_manifest_sha256','runtime_paths','actual_data_paths','changed_paths','unchanged_paths','independent_manifest_composition','physical_and_Git_blob_inventory_exact','canonical_data26_and_H_held_preserved','behavioral_installed_browser_native_CI_or_release_approval','operations')
CHANGED_PATHS=('data/apadana.json','http-worker.cjs','http.cjs','index.cjs','web/reader.js')
_pin=boundary._pin
_keys=boundary._keys
_typed=boundary._typed


def _sealed(root,name,pin):
    _pin(pin)
    raw=_regular(root,name)
    _require(_sha(raw)==pin,'Changed fixed382 authority: '+name)
    value=json.loads(raw)
    _require(type(value) is dict,'Exact sealed382 object required')
    return value,raw


def _source_metadata_pins():
    names=boundary._source_metadata_pins()
    for leaf,pin in PINS.items():
        name=DIRECTORY+'/'+leaf
        _require(name not in names,'Overlapping382 source prerequisites')
        names[name]=pin
    _require(len(names)==27,'Exact20 historical plus7 new source documents required')
    return names


def _all_metadata_pins():
    names=boundary._all_metadata_pins()
    for leaf,pin in {**PINS,**RUNTIME_PINS}.items():
        name=DIRECTORY+'/'+leaf
        _require(name not in names,'Overlapping382 metadata prerequisites')
        names[name]=pin
    _require(len(names)==38,'Exact28 historical plus10 new metadata required')
    return names


def _source382(root):
    root=_physical_root(root)
    for pin in PINS.values():_pin(pin)
    prior=boundary._source389390(root)  # pure source decoder exactly ONCE
    old=prior['english']
    captured={leaf:_sealed(root,DIRECTORY+'/'+leaf,pin)for leaf,pin in PINS.items()}
    documents={leaf:row[0]for leaf,row in captured.items()}
    approval=documents['APPROVAL.json']
    _keys(approval,APPROVAL_KEYS,'Closed382 source approval fields required')
    _require(approval['schema']=='reviewed-thera401-402-pair-approval-v1' and
             approval['status']=='approved' and approval['base_commit']==BASE_COMMIT and
             approval['canonical_logical_sha256']==CANON and
             approval['publisher_revision']==boundary.english380.PUBLISHER and
             approval['vri_revision']==boundary.SOURCE_COMMIT and
             approval['source_and_normalization_only'] is True and
             approval['runtime_approval'] is False and approval['release_approval'] is False,
             'Exact independently reviewed two-source authority required')
    _require(approval['baseline_source']=={'directory':boundary.english380.DIRECTORY+'/',
             'approval_sha256':boundary.english380.PINS['APPROVAL.json'],
             'canonical_binding_sha256':boundary.PINS['CURRENT_CANON_BINDING.json']},
             'Immutable380 source and883d canonical prefix required')
    records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem}for uid,poem in PAIRS]
    ids=old['ids']+list(IDS)
    _require(len(old['ids'])==380 and len(ids)==len(set(ids))==382 and
             approval['baseline_ids']==old['ids'] and approval['approved_ids']==list(IDS) and
             approval['approved_records']==records and approval['expected_profile_ids']==ids and
             approval['held_ids']==old['selection']['held_ids'] and len(approval['held_ids'])==10 and
             not set(ids)&set(approval['held_ids']),'Exact ordered380 plus2 owners and ten unchanged canonical hold IDs required')
    _keys(approval['source_refs'],SOURCE_REFS,'Closed six source references required')
    for key,leaf in SOURCE_REFS.items():
        _require(approval['source_refs'][key]=={'file':leaf,'bytes':len(captured[leaf][1]),'sha256':PINS[leaf]},
                 'Exact new source descriptor required: '+key)
    added=documents['PROFILES.json'];links=documents['LINKS.json']
    _require(list(added)==list(links)==list(IDS),'Exactly two source-derived objects required')
    _keys(approval['required_visible_qualifications'],IDS,'Exact notice owners required')
    for uid,poem in PAIRS:
        p=added[uid]
        _require(type(p) is dict and p.get('id')==uid and type(p.get('poem')) is int and p['poem']==poem and
                 p.get('publisher_chapter')=='chapter-3' and p.get('source')=='apadana' and
                 p.get('path')=='/text/chapter-3/poem-'+str(poem)+'/' and p.get('license')=='CC BY-NC-SA 4.0' and
                 p.get('translation_revision')==boundary.english380.PUBLISHER and
                 p.get('translator')=='Jonathan S. Walters' and
                 links[uid]=={**p,'english':p['title'],'match':'individually-reviewed-whole-poem'} and
                 not set(('text','body','notes','translator_notes','publisher_paratext','raw'))&set(p) and
                 approval['required_visible_qualifications'][uid]==p['mapping_notes'],
                 'Exact individually reviewed source ownership/rights/notices required')
    peer=documents['SOURCE_REVIEW.json'];_keys(peer,PEER_KEYS,'Closed independent source review required')
    _require(peer['schema']=='reviewed-thera401-402-independent-source-approval-v1' and
             peer['status']=='GO_EXACT_TWO_PUBLISHER_EDITION_SOURCE_SCOPES_ONLY' and
             peer['base_commit']==BASE_COMMIT and peer['canonical_logical_sha256']==CANON and
             peer['publisher_revision']==approval['publisher_revision'] and peer['vri_revision']==approval['vri_revision'] and
             peer['approved_pairs']==[[poem,uid]for uid,poem in PAIRS] and
             peer['all_nine_holds_unchanged'] is True and peer['complete_publisher_editions_only'] is True and
             peer['source_and_normalization_only'] is True and peer['runtime_API_activation_or_release_approval'] is False,
             'Independent publisher-edition-only source permission required')
    _keys(peer['source_documents'],('profiles','approved_links','producer_pending_links','source_bindings','required_notices'),
          'Closed source-review object domains required')
    for key,leaf in {'profiles':'PROFILES.json','approved_links':'LINKS.json','source_bindings':'SOURCE_BINDINGS.json','required_notices':'REQUIRED_NOTICES.json'}.items():
        _require(peer['source_documents'][key]=={'bytes':len(captured[leaf][1]),'sha256':PINS[leaf]},
                 'Independent source document binding changed')
    _row(peer['source_documents']['producer_pending_links'])
    _require(peer['source_documents']['producer_pending_links']['sha256']=='8b57b6d84525a9b251a39aca931425dfbf589537888c92d92ab553662b3adf2b',
             'Original producer pending-link inverse domain required')
    _keys(peer['producer_evidence'],('source_packet','fresh_normalization','consumer_contract','independent_blind_manifest','independent_prior_source_review','independent_fresh_reverification'),'Closed producer/peer evidence descriptors required')
    for row in peer['producer_evidence'].values():_keys(row,('bytes','sha256'),'Exact source provenance row required');_row(row)
    _require(peer['producer_evidence']['fresh_normalization']['sha256']==PINS['NORMALIZATION_REVIEW.json'],
             'Actual independent normalization provenance required')
    source=deepcopy(old['source']);policy=source['policy']
    _require(policy.count('380 finite')==policy.count('340 explicitly mapped Therā')==1,'Exact380 source policy operands required')
    source['policy']=policy.replace('380 finite','382 finite').replace('340 explicitly mapped Therā','342 explicitly mapped Therā')
    profiles={**old['profiles'],**added};all_links={**old['links'],**links}
    baseline_records=old['selection']['baseline_records']+old['selection']['approved_records']
    _require([r['id']for r in baseline_records]==old['ids'],'Complete ordered380 source records required')
    selection={**deepcopy(approval),'baseline_records':deepcopy(baseline_records),
               'current_source_approval':{'file':DIRECTORY+'/APPROVAL.json','sha256':PINS['APPROVAL.json']},
               'historical380_source_approval':deepcopy(old['selection']['current_source_approval']),
               **{field:deepcopy(old['selection'][field])for field in ('historical375_source_approval','historical368_source_approval','historical359_source_approval','historical343_source_approval')}}
    manifest={'version':1,'source':source,'vri_commit':boundary.SOURCE_COMMIT,'held':deepcopy(old['manifest']['held']),'links':all_links}
    english={'ids':ids,'profiles':profiles,'links':all_links,'source':source,'selection':selection,'approval':approval,
             'historical368':old['historical368'],'historical375':old['historical375'],'historical380':old,
             'documents':documents,'manifest':manifest}
    return {'english':english,'canonical':prior['canonical'],'widget':{'version':'v50','uri':'ui://pali-canon/reader-v50.html','skybridge':'ui://pali-canon/reader-v50.skybridge.html'}}


def source_authority382(root):
    return deepcopy(_source382(root))


def _capture382_current(root):
    root=_physical_root(root)
    for pin in RUNTIME_PINS.values():_pin(pin)
    context=_source382(root)
    old=context['english']['historical380']
    proof=boundary.english380._proof_rows(old)
    old_metadata=boundary._all_metadata_pins()
    _require(len(proof)==226 and len(old_metadata)==28 and not set(proof)&set(old_metadata),
             'All254 immutable historical proofs remain mandatory')
    for name,row in proof.items():
        if row['domain']=='H_runtime_prerequisite':boundary.english380._read_row(root,name,row)
    # Historical SOURCE decoder checked the other source proofs. Authenticate
    # every old runtime document separately; none is actual382 acceptance.
    old_source=boundary._source_metadata_pins();old_runtime={}
    for name,pin in old_metadata.items():
        if name not in old_source:old_runtime[name]=boundary._sealed(root,name,pin)
    _require(len(old_runtime)==8,'Exact six old plus two boundary runtime prerequisites required')
    predecessor=old_runtime[boundary.DIRECTORY+'/RUNTIME_INVENTORY.json']
    _require(predecessor['canonical_logical_sha256']==CANON and predecessor['runtime_files']==34,
             'Immutable883d/runtime380 predecessor required')
    runtime={leaf:_sealed(root,DIRECTORY+'/'+leaf,pin)[0]for leaf,pin in RUNTIME_PINS.items()}
    inventory=runtime['RUNTIME_INVENTORY.json'];review=runtime['RUNTIME_REVIEW.json']
    _keys(inventory,RUNTIME_KEYS,'Closed actual382 inventory fields required');_keys(review,REVIEW_KEYS,'Closed independent382 runtime review required')
    prior_pin=boundary.PINS['RUNTIME_INVENTORY.json']
    _require(inventory['schema']=='independent-reviewed-intake382-runtime-inventory-v1' and
             inventory['baseline_commit']==BASE_COMMIT and inventory['curation_sha256']==PINS['APPROVAL.json'] and
             inventory['canonical_logical_sha256']==CANON and inventory['predecessor_inventory_sha256']==prior_pin and
             type(inventory['runtime_files']) is int and inventory['runtime_files']==34 and
             type(inventory['candidate_commit']) is str and re.fullmatch('[a-f0-9]{40}',inventory['candidate_commit']) is not None and
             inventory['inventory_only'] is True and inventory['behavioral_or_release_approval'] is False,
             'Independent actual382 runtime inventory required')
    files=inventory['files'];before=predecessor['files']
    _require(type(files) is dict and len(files)==34 and list(files)==sorted(files)==list(before),
             'Exact unchanged sorted34 runtime pathnames required')
    changed=[name for name in files if files[name]!=before[name]];unchanged=[name for name in files if name not in changed]
    _require(changed==list(CHANGED_PATHS)==inventory['allowed_changed_paths'] and unchanged==inventory['unchanged_paths'],
             'Only reviewed AP catalogue and four app bundles may change')
    _require(review['schema']=='reviewed-intake382-runtime-approval-v1' and review['status']=='GO_RUNTIME_INVENTORY_ONLY' and
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
             'Exact independent382 runtime approval binding required')
    raw_data={}
    for name,row in files.items():
        _relative(name);_keys(row,('bytes','sha256'),'Exact runtime row required');_row(row)
        if name.startswith('data/'):
            if name!='data/apadana.json':_require(row==before[name],'All26 unrelated data remain unchanged')
            raw_data[name]=boundary._read_row(root,'server/'+name,row)
    _require(len(raw_data)==27 and 'data/apadana.json'in raw_data,'Exactly once-read actual27 data required')
    expected=runtime['EXPECTED_MANIFEST.json'];_keys(expected,('version','source','vri_commit','held','links'),'Exact independent382 manifest required')
    _require(_typed(expected)==_typed(context['english']['manifest']) and list(expected['links'])==context['english']['ids'] and
             _typed(json.loads(raw_data['data/apadana.json']))==_typed(expected),
             'Actual382 catalogue must equal independent full380 prefix plus exact two source objects')
    return deepcopy(context),deepcopy(files)


def approved382_catalogue(root):
    context,_=_capture382_current(root)
    return deepcopy({key:context['english'][key]for key in ('ids','profiles','links','source')})


def approved382_runtime(root):
    _,files=_capture382_current(root)
    return deepcopy(files)


def reviewed_intake382(root):
    return source_authority382(root)['english']['selection']


def curated_additions382(root,anchor_filename):
    root=_physical_root(root)
    _require(type(anchor_filename) is str and anchor_filename in boundary.english380.ANCHORS,
             'Closed literal historical anchor required')
    context=_source382(root);authority=context['english']
    name='docs/evidence/apadana/'+anchor_filename
    rows=boundary.english380._proof_rows(authority['historical380'])
    _require(name in rows and rows[name]['domain']=='H_source_prerequisite','Mandatory historical source anchor required')
    raw=boundary.english380._read_row(root,name,rows[name]);anchor=json.loads(raw);size=boundary.english380.ANCHORS[anchor_filename]
    _require(type(anchor['expected_profile_ids']) is list and len(anchor['expected_profile_ids'])==size and
             authority['ids'][:size]==anchor['expected_profile_ids'],'Exact historical anchor prefix required')
    ids=authority['ids'][size:]
    return deepcopy({'curation':authority['selection'],'anchor':anchor,'ids':ids,
                     'profiles':{uid:authority['profiles'][uid]for uid in ids},
                     'links':{uid:authority['links'][uid]for uid in ids}})
