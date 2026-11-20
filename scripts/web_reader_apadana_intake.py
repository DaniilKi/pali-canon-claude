"""Read the independent current intake whitelist while preserving historical cohorts."""
import hashlib,json
from pathlib import Path


def _read_intake(root, filename):
    data=json.loads((Path(root)/'docs/evidence/apadana'/filename).read_text(encoding='utf-8'))
    assert data['schema']=='reviewed-apadana-intake-v1' and data['status']=='approved'
    assert data['publisher_revision']=='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
    ids=data['expected_profile_ids']
    assert ids==data['baseline_ids']+data['approved_ids'] and len(ids)==len(set(ids))
    records=data['baseline_records']+data['approved_records']
    assert [row['id'] for row in records]==ids
    assert all(row['publisher_chapter'] in ('chapter-3','chapter-4') and isinstance(row['poem'],int) and row['poem']>0 for row in records)
    return data


def _reviewed_241_250(root):
    previous = _read_intake(root, 'THERA_181_220_APPROVAL.json')
    current = _read_intake(root, 'THERA_241_250_APPROVAL.json')
    previous_seal=current['previous_intake']
    assert previous_seal['file']=='THERA_181_220_APPROVAL.json'
    assert hashlib.sha256((Path(root)/'docs/evidence/apadana'/previous_seal['file']).read_bytes()).hexdigest()==previous_seal['sha256']
    assert current['base_commit'] == 'a9755d267c309ad930df0ef154e6c8a03f1f371e'
    assert current['baseline_ids'] == previous['expected_profile_ids'], 'Historical approved cohort changed'
    assert current['baseline_records'] == previous['baseline_records'] + previous['approved_records'], 'Historical source mapping changed'
    assert current['approved_ids'] == ['tha-ap'+str(n) for n in range(243,253)]
    assert [row['poem'] for row in current['approved_records']] == list(range(241,251))
    return current


def _reviewed_221_230(root):
    previous = _reviewed_241_250(root)
    current = _read_intake(root, 'THERA_221_230_APPROVAL.json')
    previous_seal=current['previous_intake']
    assert previous_seal['file']=='THERA_241_250_APPROVAL.json'
    assert hashlib.sha256((Path(root)/'docs/evidence/apadana'/previous_seal['file']).read_bytes()).hexdigest()==previous_seal['sha256']
    assert current['base_commit']=='9ceed785d30afdcdc1f09021d6098b5bb85f02fb'
    assert current['baseline_ids']==previous['expected_profile_ids'], 'Historical approved256 cohort changed'
    assert current['baseline_records']==previous['baseline_records']+previous['approved_records'], 'Historical256 source mapping changed'
    assert len(current['baseline_ids'])==256
    assert current['approved_ids']==['tha-ap'+str(n) for n in range(223,233)]
    assert [row['poem'] for row in current['approved_records']]==list(range(221,231))
    return current


REMAINING_PUBLISHERS={'A':(231,232,233,235,236,237,238,239,240),'B':tuple(range(251,260))}
REMAINING_IDS={name:tuple('tha-ap'+str(poem+2) for poem in poems) for name,poems in REMAINING_PUBLISHERS.items()}


def _sealed(root,seal):
    name=seal['file']
    assert isinstance(name,str) and Path(name).name==name
    raw=(Path(root)/'docs/evidence/apadana'/name).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==seal['sha256'], 'Curatorial evidence seal changed: '+name
    return json.loads(raw)


def remaining_groups(root,curation=None):
    current=curation if curation is not None else _read_intake(root,'THERA_REMAINING_APPROVAL.json')
    descriptors=current['source_groups']
    assert [group['batch'] for group in descriptors]==['A','B'] and len(descriptors)==2
    statuses={'A':'SOURCE_AND_NORMALIZATION_APPROVED_9_ONLY_GROUP_A','B':'APPROVE_NINE_GROUP_B_SOURCE_AND_FINITE_NORMALIZATION_SCOPES_ONLY'}
    result={}
    for descriptor in descriptors:
        name=descriptor['batch'];ids=list(REMAINING_IDS[name]);publishers=list(REMAINING_PUBLISHERS[name])
        assert descriptor['approved_ids']==ids
        assert descriptor['approved_records']==[{'id':uid,'publisher_chapter':'chapter-3','poem':poem} for uid,poem in zip(ids,publishers,strict=True)]
        group={'descriptor':descriptor,'approved_ids':ids,'approved_records':descriptor['approved_records']}
        for field in ('goldens','expected_profiles','expected_links','source_approval','independent_source_approval','independent_normalization','normalization_replay','normalization_seals','copy_policy'):
            group[field]=_sealed(root,descriptor[field])
        for family in ('source_reviews','rights'):
            group[family]=[_sealed(root,seal) for seal in descriptor[family]]
        peer=group['independent_source_approval']
        assert peer['status']==statuses[name], 'Both separate formal group approvals are mandatory'
        assert peer['baseline']=='cdbefd514164a559bc5aaab631c267f3084e31a6'
        assert peer['publisher_revision']==current['publisher_revision']
        assert peer['approved_ids']==ids and peer['approved_publisher_poems']==publishers
        if name=='A':
            assert peer['source_approval_count']==peer['normalization_approval_count']==9
            assert peer['approved_profile_objects']==group['expected_profiles']
            assert peer['approved_link_objects']==group['expected_links']
            assert peer['runtime_approval'] is False and peer['final_release_approval'] is False
        else:
            assert peer['source_approval'] is True and peer['normalization_approval'] is True
            for field in ('goldens','expected_profiles','expected_links','independent_normalization'):
                assert descriptor[field]['sha256']==peer[field+'_sha256']
            assert peer['runtime_approval'] is False and peer['release_approval'] is False
        assert set(group['expected_profiles'])==set(group['expected_links'])==set(ids)
        assert [poem['id'] for poem in group['goldens']['poems']]==ids
        assert group['goldens']['baseline']==current['base_commit']
        assert group['goldens']['publisher_revision']==current['publisher_revision']
        group['profiles']=group['expected_profiles'];group['links']=group['expected_links']
        result[name]=group
    assert current['approved_ids']==result['A']['approved_ids']+result['B']['approved_ids']
    assert current['approved_records']==result['A']['approved_records']+result['B']['approved_records']
    return result


def reviewed_remaining_intake(root):
    previous=_reviewed_221_230(root)
    current=_read_intake(root,'THERA_REMAINING_APPROVAL.json')
    assert current['previous_intake']['file']=='THERA_221_230_APPROVAL.json'
    assert _sealed(root,current['previous_intake'])==previous
    assert current['base_commit']=='cdbefd514164a559bc5aaab631c267f3084e31a6'
    assert current['baseline_ids']==previous['expected_profile_ids'] and len(current['baseline_ids'])==266
    assert current['baseline_records']==previous['baseline_records']+previous['approved_records']
    assert current['approved_ids']==list(REMAINING_IDS['A']+REMAINING_IDS['B'])
    assert [row['poem'] for row in current['approved_records']]==list(REMAINING_PUBLISHERS['A']+REMAINING_PUBLISHERS['B'])
    assert len(current['expected_profile_ids'])==284
    remaining_groups(root,current)
    return current


def reviewed_held234_intake(root):
    previous=reviewed_remaining_intake(root)
    current=_read_intake(root,'THERA_HELD234_APPROVAL.json')
    assert current['previous_intake']['file']=='THERA_REMAINING_APPROVAL.json'
    assert _sealed(root,current['previous_intake'])==previous
    assert current['base_commit']=='7d5ac90845402b322dabf2c5120d1485b15c0bda'
    assert current['baseline_ids']==previous['expected_profile_ids'] and len(current['baseline_ids'])==284
    assert current['baseline_records']==previous['baseline_records']+previous['approved_records']
    assert current['approved_ids']==['tha-ap236']
    assert current['approved_records']==[{'id':'tha-ap236','publisher_chapter':'chapter-3','poem':234}]
    assert len(current['expected_profile_ids'])==285
    profiles=_sealed(root,current['expected_profiles']);links=_sealed(root,current['expected_links'])
    assert set(profiles)==set(links)=={'tha-ap236'}
    peer=_sealed(root,current['independent_source_approval'])
    assert peer['status']=='APPROVE_ONE_EXACT_PUBLISHER234_SOURCE_AND_FINITE_NORMALIZATION_IDENTITY_SCOPE_ONLY'
    assert peer['baseline']==current['base_commit'] and peer['publisher_revision']==current['publisher_revision']
    assert peer['approved_ids']==current['approved_ids'] and peer['approved_publisher_poems']==[234]
    assert peer['source_approval'] is True and peer['normalization_approval'] is True
    assert peer['source_approval_count']==peer['normalization_approval_count']==1
    assert peer['runtime_approval'] is False and peer['release_approval'] is False
    assert peer['approved_profile_objects']==profiles and peer['approved_link_objects']==links
    assert current['independent_source_approval']['sha256']=='9b7b6cf1d4efe45ee06330551651e1baaf76f20226a35c47a07224592d1cfb8d'
    assert len(current['goldens'])==1
    golden=_sealed(root,current['goldens'][0])
    assert golden['baseline']==current['base_commit'] and golden['publisher_revision']==current['publisher_revision']
    assert [row['id'] for row in golden['poems']]==current['approved_ids']
    for field in ('source_approval','independent_normalization','normalization_replay','normalization_seals','copy_policy'):
        _sealed(root,current[field])
    for family in ('source_reviews','rights'):
        assert current[family]
        for descriptor in current[family]:_sealed(root,descriptor)
    assert current['before_canon_sha256']==current['after_canon_sha256']==previous['after_canon_sha256']
    assert current['runtime_approval'] is False and current['release_approval'] is False
    assert 'tha-ap236' not in current['held_ids'] and 'tha-ap262' in current['held_ids']
    return current


# Finite source-reviewed pairs: do not infer future mappings from an offset.
INTAKE_261_280_PAIRS=((263,261),(264,262),(265,263),(266,264),(267,265),
                     (269,267),(270,268),(271,269),(272,270),(273,271),
                     (274,272),(275,273),(276,274),(277,275),(278,276),
                     (279,277),(280,278),(281,279))


def read_261_280(root):
    previous=reviewed_held234_intake(root)
    current=_sealed(root,{'file':'THERA_261_280_APPROVAL.json',
                         'sha256':'e25da6522df6f88bfcbf5fade43c6a8972d050425f5a6af1e6043d60440f896b'})
    assert current['schema']=='reviewed-apadana-intake-v1' and current['status']=='approved'
    assert current['base_commit']=='d31757b922fe2fa1fcf7bd903469e608f4eef6fb'
    assert current['publisher_revision']==previous['publisher_revision']=='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
    assert current['vri_revision']==previous['vri_revision']=='2d134ff9ef60f70a1eb03c9370580228811a3070'
    assert current['previous_intake']=={'file':'THERA_HELD234_APPROVAL.json','sha256':'14b739ffe5f3e6f01718ccd1c247dd35454d71abb6cf4d0de672295cef8f4aa7'}
    assert _sealed(root,current['previous_intake'])==previous
    assert current['baseline_ids']==previous['expected_profile_ids'] and len(current['baseline_ids'])==285
    assert current['baseline_records']==previous['baseline_records']+previous['approved_records']
    ids=['tha-ap'+str(canonical) for canonical,_ in INTAKE_261_280_PAIRS]
    publishers=[poem for _,poem in INTAKE_261_280_PAIRS]
    records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem} for uid,poem in zip(ids,publishers,strict=True)]
    assert current['approved_ids']==ids and current['approved_records']==records
    assert current['expected_profile_ids']==current['baseline_ids']+ids
    assert len(current['expected_profile_ids'])==len(set(current['expected_profile_ids']))==303
    assert not set(ids)&set(current['baseline_ids'])
    for uid in ('tha-ap262','tha-ap268','tha-ap282'):
        assert uid in current['held_ids'] and uid not in current['expected_profile_ids']
    assert current['held_ids']==previous['held_ids']+['tha-ap268','tha-ap282']
    assert current['before_canon_sha256']==current['after_canon_sha256']==previous['after_canon_sha256']
    assert current['runtime_approval'] is False and current['release_approval'] is False and current['external_activations']==0
    profiles=_sealed(root,current['expected_profiles']);links=_sealed(root,current['expected_links'])
    assert list(profiles)==list(links)==ids
    author=_sealed(root,current['source_approval']);peer=_sealed(root,current['independent_source_approval'])
    for packet,status in ((author,'SOURCE_AND_FINITE_NORMALIZATION_APPROVED_18_REVIEW_A_ONLY'),
                          (peer,'SOURCE_AND_FINITE_NORMALIZATION_AND_EXACT_PROFILE_LINK_APPROVED_18_REVIEW_B_ONLY')):
        assert packet['status']==status and packet['baseline']==current['base_commit']
        assert packet['publisher_revision']==current['publisher_revision'] and packet['vri_revision']==current['vri_revision']
        assert packet['canonical_logical_sha256']==current['after_canon_sha256']
        assert packet['approved_ids']==ids and packet['approved_publisher_poems']==publishers
        assert packet['source_approval'] is True and packet['normalization_approval'] is True
        assert packet['source_approval_count']==packet['normalization_approval_count']==18
        assert packet['approved_profile_objects']==profiles and packet['approved_link_objects']==links
        assert packet['runtime_approval'] is False and packet['release_approval'] is False
        assert packet['excluded_canonical_ids']==['tha-ap262','tha-ap268','tha-ap282']
    assert peer['approved_profile_file']['sha256']==current['expected_profiles']['sha256']
    assert peer['approved_link_file']['sha256']==current['expected_links']['sha256']
    normalized=_sealed(root,current['independent_normalization'])
    assert normalized['status']=='B_APPROVED_NORMALIZATION_METADATA_EXPORT_AFTER_SEPARATE_CORE_AND_PROFILE_REVIEW'
    assert normalized['approved_ids']==ids and normalized['eligible_publishers']==publishers
    assert normalized['runtime_approval'] is False and normalized['release_approval'] is False
    assert [row['canonical_owner'] for row in normalized['poems']]==ids
    assert len(current['goldens'])==1
    golden=_sealed(root,current['goldens'][0])
    assert golden['baseline']==current['base_commit'] and golden['publisher_revision']==current['publisher_revision']
    assert [row['id'] for row in golden['poems']]==ids
    for row,proof in zip(golden['poems'],normalized['poems'],strict=True):
        assert row['poem']==proof['publisher_poem'] and row['path']==proof['source_path']
        for field in ('raw_sha256','body_sha256','notes_sha256','paratext_sha256'):
            assert profiles[row['id']][field]==row[field]==proof[field]
        assert profiles[row['id']]['root_sha256']==row['root']['root_sha256']==proof['root_sha256']
        assert [part['sha256'] for part in row['body_paragraphs']]==proof['body_paragraph_sha256s']
        assert links[row['id']]==dict(profiles[row['id']],english=profiles[row['id']]['title'],match='individually-reviewed-whole-poem')
    addendum=_sealed(root,current['source_approval_addendum'])
    assert addendum['source_approval']['sha256']==current['independent_source_approval']['sha256']
    assert addendum['recommended_copyable_normalization']['sha256']==current['independent_normalization']['sha256']
    assert addendum['source_and_normalization_approval_count']==18
    assert addendum['runtime_approval'] is False and addendum['release_approval'] is False
    freeze=_sealed(root,current['baseline_freeze'])
    assert freeze['baseline']==current['base_commit']
    assert list(freeze['profile_objects'])==list(freeze['translation_objects'])==current['baseline_ids']
    seals=_sealed(root,current['normalization_seals'])
    for original,descriptor in (('GOLDENS.json',current['goldens'][0]),('EXPECTED_PROFILES.json',current['expected_profiles']),('EXPECTED_LINKS.json',current['expected_links'])):
        assert seals['files'][original]==author['core_seals'][original]==descriptor['sha256']
    _sealed(root,current['copy_policy'])
    for family in ('source_reviews','rights'):
        assert current[family]
        for descriptor in current[family]:_sealed(root,descriptor)
    return current


def read_281_285(root):
    previous=read_261_280(root)
    current=_sealed(root,{'file':'THERA_281_285_APPROVAL.json',
                         'sha256':'52c1813c72685a7a78f4f29ed860035c06e61f1b209f601ed0b2e9a36de3206f'})
    assert current['schema']=='reviewed-apadana-intake-v1' and current['status']=='approved'
    assert current['base_commit']=='929e5c83d4157a0339ab24bb7039e1441a348b2c'
    assert current['publisher_revision']==previous['publisher_revision']
    assert current['vri_revision']==previous['vri_revision']
    assert current['previous_intake']=={'file':'THERA_261_280_APPROVAL.json',
                                        'sha256':'e25da6522df6f88bfcbf5fade43c6a8972d050425f5a6af1e6043d60440f896b'}
    assert _sealed(root,current['previous_intake'])==previous
    assert current['baseline_ids']==previous['expected_profile_ids'] and len(current['baseline_ids'])==303
    assert current['baseline_records']==previous['baseline_records']+previous['approved_records']
    pairs=((283,281),(284,282),(285,283),(286,284),(287,285))
    ids=['tha-ap'+str(canonical) for canonical,_ in pairs]
    publishers=[poem for _,poem in pairs]
    records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem} for uid,poem in zip(ids,publishers,strict=True)]
    assert current['approved_ids']==ids and current['approved_records']==records
    assert not set(ids)&set(current['baseline_ids'])
    assert current['expected_profile_ids']==current['baseline_ids']+ids
    assert len(current['expected_profile_ids'])==len(set(current['expected_profile_ids']))==308
    assert current['held_ids']==previous['held_ids']
    assert not set(current['held_ids'])&set(current['expected_profile_ids'])
    assert current['explicitly_not_activated_publishers']==[260,266,280]+list(range(286,321))
    assert current['before_canon_sha256']==current['after_canon_sha256']==previous['after_canon_sha256']
    assert current['source_and_normalization_only'] is True
    assert current['runtime_approval'] is False and current['release_approval'] is False and current['external_activations']==0
    profiles=_sealed(root,current['expected_profiles']);links=_sealed(root,current['expected_links'])
    assert list(profiles)==list(links)==ids
    author=_sealed(root,current['source_approval']);peer=_sealed(root,current['independent_source_approval'])
    assert author['status']=='SOURCE_AND_FINITE_NORMALIZATION_APPROVED_FIVE_REVIEW_A_ONLY'
    assert author['baseline']=='929e5c8 (parent-provided clean preserved 303-choice baseline)'
    assert peer['status']=='APPROVE_FIVE_EXACT_PUBLISHER281_285_SOURCE_FINITE_NORMALIZATION_AND_MAPS_ONLY'
    for packet in (author,peer):
        assert packet['publisher_revision']==current['publisher_revision'] and packet['vri_revision']==current['vri_revision']
        assert packet['canonical_logical_sha256']==current['after_canon_sha256']
        assert packet['approved_ids']==ids
        assert packet['source_approval_count']==packet['normalization_approval_count']==5
        assert packet['approved_profile_objects']==profiles and packet['approved_link_objects']==links
        assert packet['runtime_approval'] is False and packet['release_approval'] is False and packet['push_approval'] is False
    assert author['source_approval'] is True and author['normalization_approval'] is True
    assert author['approved_publisher_poems']==publishers and peer['approved_records']==records
    assert peer['activation_approval'] is False
    assert peer['B_independent_normalization_sha256']==current['independent_normalization']['sha256']
    normalized=_sealed(root,current['independent_normalization'])
    assert normalized['status']=='B_ORIGINAL_FIRST_FIVE_NORMALIZED_METADATA_SEALED_BEFORE_A_COMPARISON'
    assert normalized['publisher_revision']==current['publisher_revision'] and normalized['vri_revision']==current['vri_revision']
    assert normalized['production_parser_or_A_outputs_used'] is False and normalized['runtime_or_release_approval'] is False
    assert [row['canonical_owner'] for row in normalized['poems']]==ids
    assert [row['publisher_poem'] for row in normalized['poems']]==publishers
    assert len(current['goldens'])==1
    golden=_sealed(root,current['goldens'][0])
    assert golden['baseline']=='929e5c8 (parent-provided preserved 303-choice baseline)'
    assert golden['publisher_revision']==current['publisher_revision'] and golden['vri_revision']==current['vri_revision']
    assert golden['canonical_logical_sha256']==current['after_canon_sha256']
    assert [row['id'] for row in golden['poems']]==ids
    for row,proof in zip(golden['poems'],normalized['poems'],strict=True):
        uid=row['id']
        assert row['poem']==proof['publisher_poem'] and row['path']==proof['source_path']
        for field in ('raw_sha256','body_sha256','notes_sha256','paratext_sha256'):
            assert profiles[uid][field]==row[field]==proof[field]
        assert profiles[uid]['root_sha256']==row['root']['root_sha256']==proof['root_sha256']
        assert profiles[uid]['stanza_layout']==row['stanza_layout']==proof['stanza_layout']
        assert [part['sha256'] for part in row['body_paragraphs']]==proof['body_paragraph_sha256s']
        assert row['note_numbers']==proof['poem_note_numbers']==profiles[uid]['note_numbers']
        assert links[uid]==dict(profiles[uid],english=profiles[uid]['title'],match='individually-reviewed-whole-poem')
    for original,descriptor in (('GOLDENS.json',current['goldens'][0]),('EXPECTED_PROFILES.json',current['expected_profiles']),('EXPECTED_LINKS.json',current['expected_links'])):
        assert author['core_seals'][original]==peer['A_reviewed_artifacts'][original]['sha256']==descriptor['sha256']
    compact=_sealed(root,current['baseline_freeze'])
    assert compact['schema']=='prior303-intake-compact-v1' and compact['profiles']==303
    assert compact['baseline']==current['base_commit'] and compact['ordered_ids']==current['baseline_ids']
    assert list(compact['profile_object_sha256'])==list(compact['translation_object_sha256'])==current['baseline_ids']
    assert compact['prior303_authority']==current['previous_intake']
    assert compact['canon_logical_sha256']==current['before_canon_sha256']
    assert compact['canon_units']==8544 and compact['canon_books']==61
    _sealed(root,compact['prior303_implementation_approval'])
    replay=_sealed(root,current['baseline_reconstruction_review'])
    assert replay['deep_full_object_equality'] is True and replay['ordered_ids']==current['baseline_ids']
    seals=_sealed(root,current['normalization_seals'])
    for original,descriptor in (('core/GOLDENS.json',current['goldens'][0]),('core/EXPECTED_PROFILES.json',current['expected_profiles']),('core/EXPECTED_LINKS.json',current['expected_links'])):
        assert seals['files'][original]==descriptor['sha256']
    for field in ('normalization_replay','copy_policy'):_sealed(root,current[field])
    for family in ('source_reviews','rights'):
        assert current[family]
        for descriptor in current[family]:_sealed(root,descriptor)
    return current


def reviewed_intake(root):
    return read_281_285(root)


def curated_303_additions(root,anchor_filename):
    current=read_261_280(root)
    anchors={'THERA_241_250_APPROVAL.json':_reviewed_241_250,
             'THERA_221_230_APPROVAL.json':_reviewed_221_230,
             'THERA_REMAINING_APPROVAL.json':reviewed_remaining_intake,
             'THERA_HELD234_APPROVAL.json':reviewed_held234_intake}
    assert anchor_filename in anchors
    anchor=anchors[anchor_filename](root)
    pieces=[]
    if anchor_filename=='THERA_241_250_APPROVAL.json':
        packet=_reviewed_221_230(root)
        pieces.append({'ids':packet['approved_ids'],'profiles':_sealed(root,packet['expected_profiles']),'links':_sealed(root,packet['expected_links'])})
    if anchor_filename in ('THERA_241_250_APPROVAL.json','THERA_221_230_APPROVAL.json'):
        for group in remaining_groups(root,reviewed_remaining_intake(root)).values():
            pieces.append({'ids':group['approved_ids'],'profiles':group['profiles'],'links':group['links']})
    if anchor_filename!='THERA_HELD234_APPROVAL.json':
        packet=reviewed_held234_intake(root)
        pieces.append({'ids':packet['approved_ids'],'profiles':_sealed(root,packet['expected_profiles']),'links':_sealed(root,packet['expected_links'])})
    pieces.append({'ids':current['approved_ids'],'profiles':_sealed(root,current['expected_profiles']),'links':_sealed(root,current['expected_links'])})
    ids=[];profiles={};links={}
    for piece in pieces:
        assert set(piece['ids'])==set(piece['profiles'])==set(piece['links'])
        assert not set(piece['ids'])&set(ids) and not set(piece['ids'])&set(anchor['expected_profile_ids'])
        ids.extend(piece['ids']);profiles.update(piece['profiles']);links.update(piece['links'])
    assert current['expected_profile_ids']==anchor['expected_profile_ids']+ids
    return {'curation':current,'anchor':anchor,'ids':ids,'profiles':profiles,'links':links}


def curated_additions(root,anchor_filename):
    current=reviewed_intake(root)
    if anchor_filename=='THERA_261_280_APPROVAL.json':
        anchor=read_261_280(root)
        ids=[];profiles={};links={}
    else:
        historical=curated_303_additions(root,anchor_filename)
        anchor=historical['anchor']
        ids=list(historical['ids']);profiles=dict(historical['profiles']);links=dict(historical['links'])
        assert historical['curation']==read_261_280(root)
    extra_profiles=_sealed(root,current['expected_profiles']);extra_links=_sealed(root,current['expected_links'])
    assert list(extra_profiles)==list(extra_links)==current['approved_ids']
    assert not set(extra_profiles)&(set(anchor['expected_profile_ids'])|set(ids))
    ids.extend(current['approved_ids']);profiles.update(extra_profiles);links.update(extra_links)
    assert current['expected_profile_ids']==anchor['expected_profile_ids']+ids
    assert list(profiles)==list(links)==ids
    return {'curation':current,'anchor':anchor,'ids':ids,'profiles':profiles,'links':links}


def current_apadana_ids(root):
    return reviewed_intake(root)['expected_profile_ids']


def current_family_ids(root,chapter):
    data=reviewed_intake(root)
    return [row['id'] for row in sorted(data['baseline_records']+data['approved_records'],key=lambda row:row['poem']) if row['publisher_chapter']==chapter]
