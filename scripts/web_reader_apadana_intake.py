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


def read_287_288(root):
    previous=read_281_285(root)
    current=_sealed(root,{'file':'THERA_287_288_APPROVAL.json',
                         'sha256':'e159aefc7ad0f2a36a10dffa95fd5cf97650b95969820344f70aee0dd2c7e95e'})
    assert current['schema']=='reviewed-apadana-intake-v1' and current['status']=='approved'
    assert current['base_commit']=='0f572239fc459001f75cd5265d3eaeac66425b66'
    assert current['publisher_revision']==previous['publisher_revision']
    assert current['vri_revision']==previous['vri_revision']
    assert current['previous_intake']=={'file':'THERA_281_285_APPROVAL.json',
                                        'sha256':'52c1813c72685a7a78f4f29ed860035c06e61f1b209f601ed0b2e9a36de3206f'}
    assert _sealed(root,current['previous_intake'])==previous
    assert current['baseline_ids']==previous['expected_profile_ids'] and len(current['baseline_ids'])==308
    assert current['baseline_records']==previous['baseline_records']+previous['approved_records']
    ids=['tha-ap289','tha-ap290'];publishers=[287,288]
    records=[{'id':'tha-ap289','publisher_chapter':'chapter-3','poem':287},
             {'id':'tha-ap290','publisher_chapter':'chapter-3','poem':288}]
    assert current['approved_ids']==ids and current['approved_records']==records
    assert not set(ids)&set(current['baseline_ids'])
    assert current['expected_profile_ids']==current['baseline_ids']+ids
    assert len(current['expected_profile_ids'])==len(set(current['expected_profile_ids']))==310
    assert current['held_ids']==previous['held_ids']
    assert not set(current['held_ids'])&set(current['expected_profile_ids'])
    assert current['explicitly_not_activated_publishers']==[poem for poem in previous['explicitly_not_activated_publishers'] if poem not in publishers]
    assert current['before_canon_sha256']==current['after_canon_sha256']==previous['after_canon_sha256']
    assert current['source_and_normalization_only'] is True and current['media_approval'] is False
    assert current['runtime_approval'] is False and current['release_approval'] is False and current['external_activations']==0
    profiles=_sealed(root,current['expected_profiles']);links=_sealed(root,current['expected_links'])
    assert list(profiles)==list(links)==ids
    author=_sealed(root,current['source_approval']);peer=_sealed(root,current['independent_source_approval'])
    assert author['status']=='SOURCE_AND_FINITE_NORMALIZATION_APPROVED_TWO_REVIEW_A_ONLY'
    assert author['baseline']==current['base_commit']
    assert peer['status']=='APPROVE_TWO_EXACT_PUBLISHER287_288_SOURCE_FINITE_NORMALIZATION_AND_MAPS_ONLY'
    for packet in (author,peer):
        assert packet['publisher_revision']==current['publisher_revision'] and packet['vri_revision']==current['vri_revision']
        assert packet['canonical_logical_sha256']==current['after_canon_sha256']
        assert packet['approved_ids']==ids
        assert packet['source_approval_count']==packet['normalization_approval_count']==2
        assert packet['approved_profile_objects']==profiles and packet['approved_link_objects']==links
        assert packet['runtime_approval'] is False and packet['release_approval'] is False
        assert packet['push_approval'] is False and packet['activation_approval'] is False
    assert author['source_approval'] is True and author['normalization_approval'] is True
    assert author['approved_publisher_poems']==publishers and peer['approved_records']==records
    assert peer['B_independent_normalization_sha256']==current['independent_normalization']['sha256']
    normalized=_sealed(root,current['independent_normalization'])
    assert normalized['status']=='B_ORIGINAL_FIRST_TWO_NORMALIZED_METADATA_SEALED_BEFORE_A_COMPARISON'
    assert normalized['publisher_revision']==current['publisher_revision'] and normalized['vri_revision']==current['vri_revision']
    assert normalized['production_parser_or_A_outputs_used'] is False and normalized['runtime_or_release_approval'] is False
    assert [row['canonical_owner'] for row in normalized['poems']]==ids
    assert [row['publisher_poem'] for row in normalized['poems']]==publishers
    assert len(current['goldens'])==1
    golden=_sealed(root,current['goldens'][0])
    assert golden['baseline']==current['base_commit']
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
    assert compact['schema']=='reviewed-apadana-baseline-compact-v1' and compact['profiles']==308
    assert compact['baseline']==current['base_commit'] and compact['ordered_ids']==current['baseline_ids']
    assert list(compact['profile_object_sha256'])==list(compact['translation_object_sha256'])==current['baseline_ids']
    assert compact['prior308_authority']==current['previous_intake']
    assert compact['canon_logical_sha256']==current['before_canon_sha256']
    assert compact['canon_units']==8544 and compact['canon_books']==61
    replay=_sealed(root,current['baseline_reconstruction_review'])
    assert replay['full_objects_equal'] is True and replay['exact_ordered_ids']==308
    assert replay['prior308_approval_sha256']==current['previous_intake']['sha256']
    assert replay['compact_sha256']==current['baseline_freeze']['sha256']
    seals=_sealed(root,current['normalization_seals'])
    for original,descriptor in (('core/GOLDENS.json',current['goldens'][0]),('core/EXPECTED_PROFILES.json',current['expected_profiles']),('core/EXPECTED_LINKS.json',current['expected_links'])):
        assert seals['files'][original]==descriptor['sha256']
    assert seals['full_payload_files']==0 and seals['runtime_release_push_approval'] is False
    for field in ('normalization_replay','copy_policy'):_sealed(root,current[field])
    for family in ('source_reviews','rights'):
        assert current[family]
        for descriptor in current[family]:_sealed(root,descriptor)
    return current


def read_292_299(root):
    previous=read_287_288(root)
    current=_sealed(root,{'file':'THERA_292_299_APPROVAL.json',
                         'sha256':'a39e811b09749e399b7faea74a4559c159de9a6180867aaa94977c3daba0ba3e'})
    assert current['schema']=='reviewed-apadana-intake-v1' and current['status']=='approved'
    assert current['base_commit']=='3da5b3831af6396447dcc5d23f24cd03c34fdd9c'
    assert current['publisher_revision']==previous['publisher_revision']
    assert current['vri_revision']==previous['vri_revision']
    assert current['previous_intake']=={'file':'THERA_287_288_APPROVAL.json',
                                        'sha256':'e159aefc7ad0f2a36a10dffa95fd5cf97650b95969820344f70aee0dd2c7e95e'}
    assert _sealed(root,current['previous_intake'])==previous
    assert current['baseline_ids']==previous['expected_profile_ids'] and len(current['baseline_ids'])==310
    assert current['baseline_records']==previous['baseline_records']+previous['approved_records']
    ids=['tha-ap294','tha-ap295','tha-ap296','tha-ap297','tha-ap298','tha-ap300','tha-ap301']
    publishers=[292,293,294,295,296,298,299]
    records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem} for uid,poem in zip(ids,publishers,strict=True)]
    assert current['approved_ids']==ids and current['approved_records']==records
    assert not set(ids)&set(current['baseline_ids'])
    assert current['expected_profile_ids']==current['baseline_ids']+ids
    assert len(current['expected_profile_ids'])==len(set(current['expected_profile_ids']))==317
    assert current['held_ids']==previous['held_ids']
    assert not set(current['held_ids'])&set(current['expected_profile_ids'])
    assert current['explicitly_not_activated_publishers']==[poem for poem in previous['explicitly_not_activated_publishers'] if poem not in publishers]
    assert current['before_canon_sha256']==current['after_canon_sha256']==previous['after_canon_sha256']
    assert current['source_and_normalization_only'] is True and current['media_approval'] is False
    assert current['runtime_approval'] is False and current['release_approval'] is False and current['external_activations']==0
    profiles=_sealed(root,current['expected_profiles']);links=_sealed(root,current['expected_links'])
    assert list(profiles)==list(links)==ids
    author=_sealed(root,current['source_approval']);peer=_sealed(root,current['independent_source_approval'])
    assert author['status']=='SOURCE_AND_FINITE_NORMALIZATION_APPROVED_SEVEN_REVIEW_A_ONLY'
    assert author['baseline']==current['base_commit']
    assert peer['status']=='APPROVE_SEVEN_EXACT_PUBLISHER292_299_V2_SOURCE_FINITE_NORMALIZATION_AND_MAPS_ONLY'
    for packet in (author,peer):
        assert packet['publisher_revision']==current['publisher_revision'] and packet['vri_revision']==current['vri_revision']
        assert packet['canonical_logical_sha256']==current['after_canon_sha256']
        assert packet['approved_ids']==ids
        assert packet['source_approval_count']==packet['normalization_approval_count']==7
        assert packet['approved_profile_objects']==profiles and packet['approved_link_objects']==links
        assert packet['runtime_approval'] is False and packet['release_approval'] is False
        assert packet['push_approval'] is False and packet['activation_approval'] is False
    assert author['source_approval'] is True and author['normalization_approval'] is True
    assert author['approved_publisher_poems']==publishers and peer['approved_records']==records
    assert peer['B_independent_normalization_sha256']==current['independent_normalization']['sha256']
    normalized=_sealed(root,current['independent_normalization'])
    assert normalized['status']=='B_ORIGINAL_FIRST_SEVEN_NORMALIZED_METADATA_SEALED_BEFORE_A_COMPARISON'
    assert normalized['publisher_revision']==current['publisher_revision'] and normalized['vri_revision']==current['vri_revision']
    assert normalized['production_parser_or_A_outputs_used'] is False and normalized['runtime_or_release_approval'] is False
    assert [row['canonical_owner'] for row in normalized['poems']]==ids
    assert [row['publisher_poem'] for row in normalized['poems']]==publishers
    assert len(current['goldens'])==1
    golden=_sealed(root,current['goldens'][0])
    assert golden['baseline']==current['base_commit']
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
    assert compact['schema']=='reviewed-apadana-baseline-compact-v1' and compact['profiles']==310
    assert compact['baseline']==current['base_commit'] and compact['ordered_ids']==current['baseline_ids']
    assert list(compact['profile_object_sha256'])==list(compact['translation_object_sha256'])==current['baseline_ids']
    assert compact['prior310_authority']==current['previous_intake']
    assert compact['canon_logical_sha256']==current['before_canon_sha256']
    assert compact['canon_units']==8544 and compact['canon_books']==61
    replay=_sealed(root,current['baseline_reconstruction_review'])
    assert replay['full_objects_equal'] is True and replay['exact_ordered_ids']==310
    assert replay['prior310_approval_sha256']==current['previous_intake']['sha256']
    assert replay['compact_sha256']==current['baseline_freeze']['sha256']
    seals=_sealed(root,current['normalization_seals'])
    for original,descriptor in (('core/GOLDENS.json',current['goldens'][0]),('core/EXPECTED_PROFILES.json',current['expected_profiles']),('core/EXPECTED_LINKS.json',current['expected_links'])):
        assert seals['files'][original]==descriptor['sha256']
    assert seals['full_wording_files']==0 and seals['runtime_release_push_approval'] is False
    for field in ('normalization_replay','copy_policy'):_sealed(root,current[field])
    for family in ('source_reviews','rights'):
        assert current[family]
        for descriptor in current[family]:_sealed(root,descriptor)
    assert author['review_version']==peer['review_version']==2
    assert author['notice_only_amendment'] is True and peer['notice_only_amendment'] is True
    assert peer['A_v2_source_approval_sha256']==current['source_approval']['sha256']
    assert peer['v2_notice_comparison_sha256']==current['peer_notice_review']['sha256']
    initial=_sealed(root,current['initial_source_approval'])
    initial_seals=_sealed(root,current['initial_normalization_seals'])
    amendment=_sealed(root,current['notice_amendment'])
    inverse=_sealed(root,current['notice_inverse_proof'])
    additions=_sealed(root,current['notice_additions'])
    notice_peer=_sealed(root,current['peer_notice_review'])
    formal_peer=_sealed(root,current['peer_formal_review'])
    assert amendment['status']=='NOTICE_ONLY_V2_REPLACES_MAP_NOTICE_AUTHORITY_NOT_RAW_NORMALIZATION'
    assert inverse['status']=='V2_EXACT_TWO_NOTICE_ADDITIONS_INVERSE_PROVED'
    assert notice_peer['status']=='B_APPROVES_EXACT_V2_TWO_NOTICE_ADDITIONS_RESOLVES_PRIOR_MAP_HOLD'
    assert formal_peer['status']=='B_VERIFIED_EXACT_V2_FORMAL_A_EMBEDDED_MAP_RIGHTS_COPY_BINDINGS'
    assert amendment['proof_sha256']==author['notice_only_inverse_proof_sha256']==current['notice_inverse_proof']['sha256']
    assert author['amendment_sha256']==current['notice_amendment']['sha256']
    assert amendment['v1_immutable']['source_approval_sha256']==current['initial_source_approval']['sha256']
    assert amendment['v1_immutable']['seals_sha256']==current['initial_normalization_seals']['sha256']
    assert seals['immutable_v1_source_approval_sha256']==current['initial_source_approval']['sha256']
    assert seals['immutable_v1_SEALS_sha256']==current['initial_normalization_seals']['sha256']
    assert amendment['B_independent_normalization_unchanged_sha256']==current['independent_normalization']['sha256']
    assert amendment['all_source_wording_and_pins_unchanged'] is True
    assert inverse['raw_body_notes_root_paragraph_stanza_quote_hashes_all_unchanged'] is True
    assert inverse['all_old_mapping_notices_retained_in_original_order'] is True
    assert notice_peer['body_notes_paragraphs_quotes_root_source_rights_unchanged'] is True
    assert formal_peer['A_source_approval_sha256']==current['source_approval']['sha256']
    assert formal_peer['A_embedded_profiles_links_match_exact_v2_pure_maps'] is True
    assert additions['by_publisher']==author['added_mandatory_notices']==amendment['additions']
    assert set(additions['by_publisher'])=={'293','296'}
    for objects,old_objects in ((profiles,initial['approved_profile_objects']),(links,initial['approved_link_objects'])):
        restored=json.loads(json.dumps(objects))
        for uid,publisher in (('tha-ap295','293'),('tha-ap298','296')):
            notice=additions['by_publisher'][publisher]
            notes=restored[uid]['mapping_notes']
            assert notes.count(notice)==1 and notes[-2]==notice
            notes.remove(notice)
        assert restored==old_objects, 'Only the two independently reviewed metadata notices may differ from V1'
    for item in inverse['core_files']:
        assert item['only_mapping_notes_changed'] is True
        assert item['inverse_removes_exact_one_notice_each_for293_296_and_restores_v1_bytes'] is True
        assert item['v1_sha256']==initial['core_seals'][item['file']]
        assert item['v2_sha256']==author['core_seals'][item['file']]
    assert initial_seals['files']['SOURCE_APPROVAL.json']==current['initial_source_approval']['sha256']
    return current


def read_301_310(root):
    previous=read_292_299(root)
    current=_sealed(root,{'file':'THERA_301_310_APPROVAL.json',
                         'sha256':'5b6ee312e81f422e464922a53354800f492c571ec98f837fa119ba01de6c7042'})
    assert current['schema']=='reviewed-apadana-intake-v1' and current['status']=='approved'
    assert current['base_commit']=='4c69f023c9fe1093ad8aadf0ac7f3caf766d92f0'
    assert current['previous_intake']=={'file':'THERA_292_299_APPROVAL.json',
                                        'sha256':'a39e811b09749e399b7faea74a4559c159de9a6180867aaa94977c3daba0ba3e'}
    assert _sealed(root,current['previous_intake'])==previous
    assert current['publisher_revision']==previous['publisher_revision'] and current['vri_revision']==previous['vri_revision']
    assert current['baseline_ids']==previous['expected_profile_ids'] and len(current['baseline_ids'])==317
    assert current['baseline_records']==previous['baseline_records']+previous['approved_records']
    ids=['tha-ap303','tha-ap304','tha-ap305','tha-ap306','tha-ap307','tha-ap310','tha-ap311','tha-ap312']
    publishers=[301,302,303,304,305,308,309,310]
    records=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem} for uid,poem in zip(ids,publishers,strict=True)]
    assert current['approved_ids']==ids and current['approved_records']==records
    assert not set(ids)&set(current['baseline_ids'])
    assert current['expected_profile_ids']==current['baseline_ids']+ids
    assert len(current['expected_profile_ids'])==len(set(current['expected_profile_ids']))==325
    assert current['held_ids']==previous['held_ids']+['tha-ap308','tha-ap309']
    assert not set(current['held_ids'])&set(current['expected_profile_ids'])
    assert current['explicitly_not_activated_publishers']==[poem for poem in previous['explicitly_not_activated_publishers'] if poem not in publishers]
    assert current['before_canon_sha256']==current['after_canon_sha256']==previous['after_canon_sha256']
    assert current['source_and_normalization_only'] is True and current['media_approval'] is False
    assert current['runtime_approval'] is False and current['release_approval'] is False and current['external_activations']==0
    profiles=_sealed(root,current['expected_profiles']);links=_sealed(root,current['expected_links'])
    golden=_sealed(root,current['goldens']);author=_sealed(root,current['source_approval'])
    peer=_sealed(root,current['independent_source_approval']);normalized=_sealed(root,current['independent_normalization'])
    assert list(profiles)==list(links)==ids
    assert author['status']=='SOURCE_AND_FINITE_NORMALIZATION_APPROVED_EIGHT_REVIEW_A_V2_DISPLAY_NOTICE_ONLY'
    assert author['baseline']==current['base_commit']
    assert peer['status']=='APPROVE_EIGHT_EXACT_PUBLISHER301_310_V2_SOURCE_FINITE_NORMALIZATION_AND_MAPS_ONLY'
    for packet in (author,peer):
        assert packet['publisher_revision']==current['publisher_revision'] and packet['vri_revision']==current['vri_revision']
        assert packet['canonical_logical_sha256']==current['after_canon_sha256']
        assert packet['approved_ids']==ids and packet['source_approval_count']==packet['normalization_approval_count']==8
        assert packet['approved_profile_objects']==profiles and packet['approved_link_objects']==links
        assert packet['runtime_approval'] is False and packet['release_approval'] is False and packet['push_approval'] is False
    assert author['source_approval'] is True and author['normalization_approval'] is True and author['activation'] is False
    assert peer['activation_approval'] is False and peer['review_version']==2 and peer['notice_only_amendment'] is True
    assert author['approved_publisher_poems']==publishers and peer['approved_records']==records
    assert peer['A_v2_source_approval_sha256']==current['source_approval']['sha256']
    assert peer['B_independent_normalization_sha256']==current['independent_normalization']['sha256']
    assert normalized['status']=='B_ORIGINAL_FIRST_EIGHT_NORMALIZED_METADATA_SEALED_BEFORE_A_COMPARISON'
    assert normalized['publisher_revision']==current['publisher_revision'] and normalized['vri_revision']==current['vri_revision']
    assert normalized['production_parser_or_A_outputs_used'] is False and normalized['runtime_or_release_approval'] is False
    assert [row['canonical_owner'] for row in normalized['poems']]==ids
    assert [row['publisher_poem'] for row in normalized['poems']]==publishers
    assert golden['baseline']==current['base_commit'] and golden['canonical_logical_sha256']==current['after_canon_sha256']
    assert golden['publisher_revision']==current['publisher_revision'] and golden['vri_revision']==current['vri_revision']
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
        if uid!='tha-ap312':
            assert 'chapter_summary' not in profiles[uid] and not row.get('chapter_summary') and proof['chapter_summary'] is None
    row=golden['poems'][-1];proof=normalized['poems'][-1]
    summary=profiles['tha-ap312']['chapter_summary'];a_summary=row['chapter_summary'];b_summary=proof['chapter_summary']
    assert summary['kind']=='canonical_chapter_summary' and summary['parent_id']=='tha-ap312'
    assert summary['first_ref']=='tha-ap312/9' and summary['last_ref']=='tha-ap312/11'
    for field in summary:assert summary[field]==a_summary[field]
    for field in ('root_start','root_end','root_sha256','body_sha256','notes_sha256','note_numbers'):
        assert summary[field]==b_summary[field]
    assert summary['root_start']==9221 and summary['root_end']==9226 and summary['note_numbers']==[8]
    assert row['note_numbers']==proof['poem_note_numbers']==list(range(1,8))
    assert row['note_count']==7 and row['original_note_count']==8 and proof['poem_root_end']==9221
    assert row['poem_only_root_sha256']==proof['poem_root_sha256']
    assert [part['sha256'] for part in a_summary['paragraphs']]==b_summary['paragraph_sha256s']
    assert [part['lines'] for part in a_summary['paragraphs']]==b_summary['paragraph_lines']==[1,6,1]
    assert a_summary['note_text_sha256s']==[{'number':part['number'],'sha256':part['sha256']} for part in b_summary['note_text_sha256s']]
    assert a_summary['publisher_stated_total']==b_summary['publisher_stated_verse_count']==49
    assert a_summary['vri_stated_total']==b_summary['VRI_stated_verse_count']==b_summary['VRI_numbered_stanzas_in_chapter']==51
    assert a_summary['held_publisher_poems']==b_summary['contains_held_publisher_poems']==[306,307]
    assert b_summary['whole_chapter_english_approval'] is False
    assert b_summary['publisher_order']==['marker','verse','chapter_heading']
    assert b_summary['VRI_order']==['chapter_colophon','marker','verse']
    assert peer['summary_scope']['poem_notes']==author['summary_scope']['poem_notes']==list(range(1,8))
    assert peer['summary_scope']['summary_notes']==author['summary_scope']['summary_notes']==[8]
    assert peer['summary_scope']['publisher_stated_total']==author['summary_scope']['publisher_stated_total']==49
    assert peer['summary_scope']['VRI_stated_and_actual_total']==author['summary_scope']['actual_publisher_global_and_VRI_total']==51
    assert peer['summary_scope']['whole_chapter_English_approval'] is False and author['summary_scope']['fullchapter_approval'] is False
    assert peer['summary_scope']['held_publishers']==author['summary_scope']['held_publishers']==[306,307]
    seals=_sealed(root,current['normalization_seals']);replay=_sealed(root,current['normalization_replay'])
    assert seals['status']=='SEALED_V2_EIGHT_SOURCE_AND_FINITE_NORMALIZATION_REVIEW_A_ONLY'
    assert seals['runtime_approval'] is False and seals['release_approval'] is False
    for original,field,author_field in (('GOLDENS.json','goldens','goldens_sha256'),('EXPECTED_PROFILES.json','expected_profiles','profiles_sha256'),('EXPECTED_LINKS.json','expected_links','links_sha256')):
        sha=current[field]['sha256']
        assert author[author_field]==peer['A_reviewed_core_artifacts'][original]==sha
        assert seals['files']['core/'+original]['sha256']==replay['files'][original]==sha
    assert replay['status']=='PASS_EIGHT_ORIGINAL_SOURCE_AND_FINITE_NORMALIZATION_METADATA_ONLY' and replay['all_xml_tuple_count']==14645
    assert replay['full_english_payload_files_written']==replay['full_pali_payload_files_written']==0
    assert replay['runtime_approval'] is False and replay['release_approval'] is False
    compact=_sealed(root,current['baseline_freeze']);review=_sealed(root,current['baseline_reconstruction_review'])
    assert compact['schema']=='reviewed-apadana-baseline-compact-v1' and compact['profiles']==317
    assert compact['baseline']==current['base_commit'] and compact['ordered_ids']==current['baseline_ids']
    assert compact['prior317_authority']==current['previous_intake']
    assert list(compact['profile_object_sha256'])==list(compact['translation_object_sha256'])==current['baseline_ids']
    assert compact['canon_logical_sha256']==current['before_canon_sha256'] and compact['canon_units']==8544 and compact['canon_books']==61
    assert review['status']=='APPROVE_EXACT_BASELINE317_COMPACT_ONLY' and review['baseline']==current['base_commit']
    assert review['compact']['sha256']==current['baseline_freeze']['sha256']
    reconstruction=review['independent_reconstruction']
    for field in ('profiles','ordered_link_objects_exact','profile_object_compact_json_hashes_exact','translation_object_compact_json_hashes_exact'):assert reconstruction[field]==317
    assert reconstruction['Theri']==40 and reconstruction['Thera']==reconstruction['Thera_full_objects_exact']==277
    assert reconstruction['data_files_hash_exact']==27 and reconstruction['prior317_runtime_files_exact']==34
    assert reconstruction['source_object_sha256']==compact['manifest_source_sha256']
    initial=_sealed(root,current['initial_source_approval']);initial_seals=_sealed(root,current['initial_normalization_seals'])
    precompare=_sealed(root,current['initial_precompare_seals']);amendment=_sealed(root,current['notice_amendment'])
    inverse=_sealed(root,current['notice_inverse_proof']);additions=_sealed(root,current['notice_additions'])
    notice_peer=_sealed(root,current['peer_notice_review'])
    assert amendment['status']=='DISPLAY_NOTICE_ONLY' and amendment['owner']=='tha-ap312'
    assert amendment['old_approval_sha256']==author['v1_formal_approval_sha256']==current['initial_source_approval']['sha256']
    assert amendment['new_approval_sha256']==current['source_approval']['sha256']
    assert amendment['inverse_sha256']==author['notice_only_inverse_review_sha256']==current['notice_inverse_proof']['sha256']
    assert amendment['notice_additions_sha256']==current['notice_additions']['sha256']
    assert amendment['source_body_notes_root_quotes_changed'] is False and amendment['other_profile_fields_changed'] is False
    assert inverse['status']=='PASS_EXACT_ONE_DISPLAY_NOTICE_ONLY' and inverse['owner']=='tha-ap312'
    assert inverse['v1_core_seal_sha256']==author['precompare_seal_sha256']==current['initial_precompare_seals']['sha256']
    assert inverse['v1_formal_seal_sha256']==author['v1_seals_sha256']==seals['v1_seals_sha256']==current['initial_normalization_seals']['sha256']
    assert set(additions)=={'tha-ap312'} and additions['tha-ap312']==[inverse['notice']]
    assert notice_peer['status']=='B_APPROVES_V2_EXACT_ONE_DISPLAY_ORDER_NOTICE_RESOLVES_PRIOR_MAP_HOLD'
    assert notice_peer['added_notice']==inverse['notice'] and notice_peer['all_other_fields_and_old_notices_byte_exact'] is True
    assert notice_peer['source_body_notes_root_layout_quotes_rights_unchanged'] is True
    assert peer['v2_notice_comparison_sha256']==current['peer_notice_review']['sha256']
    assert inverse['formatter_inverse_recovers_v1_bytes'] is True and inverse['portable_inverse_recovers_v1_bytes'] is True
    assert inverse['source_body_note_summary_wording_root_quote_changes'] is False and inverse['other_profile_fields_changed'] is False
    for objects,old_objects,original,descriptor in ((profiles,initial['approved_profile_objects'],'EXPECTED_PROFILES.json',current['expected_profiles']),(links,initial['approved_link_objects'],'EXPECTED_LINKS.json',current['expected_links']),(golden,None,'GOLDENS.json',current['goldens'])):
        restored=json.loads(json.dumps(objects))
        owner=restored['poems'][-1] if original=='GOLDENS.json' else restored['tha-ap312']
        notices=owner['mapping_notes'];notice=inverse['notice']
        assert notices.count(notice)==1 and notices[-1]==notice
        notices.pop()
        if old_objects is not None:assert restored==old_objects, 'Only one summary-order display notice may differ from sealed V1'
        item=inverse['files'][original]
        assert item['inverse_recovers_v1_bytes'] is True and item['v2_sha256']==descriptor['sha256']
        assert item['v1_sha256']==initial_seals['files']['core/'+original]['sha256']==precompare['files']['core/'+original]
        assert hashlib.sha256((json.dumps(restored,ensure_ascii=False,indent=2)+'\n').encode('utf-8')).hexdigest()==item['v1_sha256']
    assert initial_seals['files']['SOURCE_APPROVAL.json']['sha256']==current['initial_source_approval']['sha256']
    assert author['rights_review_sha256']==current['rights']['sha256'] and author['copy_policy_sha256']==current['copy_policy']['sha256']
    rights=_sealed(root,current['rights']);_sealed(root,current['copy_policy'])
    assert rights['applicable_license']=='CC BY-NC-SA 4.0' and rights['full_original_artifacts_read'] is True
    assert rights['runtime_or_redistribution_acceptance'] is False
    assert list(rights['per_poem_scope'])==ids and all(row['media_approved'] is False for row in rights['per_poem_scope'].values())
    assert current['source_reviews']
    for descriptor in current['source_reviews']:_sealed(root,descriptor)
    return current


def reviewed_intake(root):
    return _reviewed_current368(root)


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


def curated_308_additions(root,anchor_filename):
    current=read_281_285(root)
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


def curated_310_additions(root,anchor_filename):
    current=read_287_288(root)
    if anchor_filename=='THERA_281_285_APPROVAL.json':
        anchor=read_281_285(root)
        ids=[];profiles={};links={}
    else:
        historical=curated_308_additions(root,anchor_filename)
        anchor=historical['anchor']
        ids=list(historical['ids']);profiles=dict(historical['profiles']);links=dict(historical['links'])
        assert historical['curation']==read_281_285(root)
    extra_profiles=_sealed(root,current['expected_profiles']);extra_links=_sealed(root,current['expected_links'])
    assert list(extra_profiles)==list(extra_links)==current['approved_ids']
    assert not set(extra_profiles)&(set(anchor['expected_profile_ids'])|set(ids))
    ids.extend(current['approved_ids']);profiles.update(extra_profiles);links.update(extra_links)
    assert current['expected_profile_ids']==anchor['expected_profile_ids']+ids
    assert list(profiles)==list(links)==ids
    return {'curation':current,'anchor':anchor,'ids':ids,'profiles':profiles,'links':links}


def curated_317_additions(root,anchor_filename):
    current=read_292_299(root)
    if anchor_filename=='THERA_287_288_APPROVAL.json':
        anchor=read_287_288(root)
        ids=[];profiles={};links={}
    else:
        historical=curated_310_additions(root,anchor_filename)
        anchor=historical['anchor']
        ids=list(historical['ids']);profiles=dict(historical['profiles']);links=dict(historical['links'])
        assert historical['curation']==read_287_288(root)
    extra_profiles=_sealed(root,current['expected_profiles']);extra_links=_sealed(root,current['expected_links'])
    assert list(extra_profiles)==list(extra_links)==current['approved_ids']
    assert not set(extra_profiles)&(set(anchor['expected_profile_ids'])|set(ids))
    ids.extend(current['approved_ids']);profiles.update(extra_profiles);links.update(extra_links)
    assert current['expected_profile_ids']==anchor['expected_profile_ids']+ids
    assert list(profiles)==list(links)==ids
    return {'curation':current,'anchor':anchor,'ids':ids,'profiles':profiles,'links':links}


def curated325_additions(root,anchor_filename):
    current=read_301_310(root)
    if anchor_filename=='THERA_292_299_APPROVAL.json':
        anchor=read_292_299(root)
        ids=[];profiles={};links={}
    else:
        historical=curated_317_additions(root,anchor_filename)
        anchor=historical['anchor']
        ids=list(historical['ids']);profiles=dict(historical['profiles']);links=dict(historical['links'])
        assert historical['curation']==read_292_299(root)
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


def read_312_319(root):
    """Add eight independently normalized scopes after the intact 325 authority."""
    previous = read_301_310(root)
    current = _sealed(root, {'file': 'THERA_312_319_APPROVAL.json',
        'sha256': 'cc8480e22bb9a1615af86cee2e153c77695f4d20c21fd8f147e31f8658ca610d'})
    assert current['schema'] == 'reviewed-apadana-intake-v1' and current['status'] == 'approved'
    assert current['base_commit'] == '104b57a6891ddae645c51e39eb3d27b89b64ffdf'
    assert _sealed(root, current['previous_intake']) == previous
    assert current['publisher_revision'] == previous['publisher_revision'] and current['vri_revision'] == previous['vri_revision']
    assert current['baseline_ids'] == previous['expected_profile_ids'] and len(current['baseline_ids']) == 325
    assert current['baseline_records'] == previous['baseline_records'] + previous['approved_records']
    ids = ['tha-ap' + str(n) for n in range(314, 322)]
    records = [{'id': uid, 'publisher_chapter': 'chapter-3', 'poem': pub} for uid, pub in zip(ids, range(312, 320), strict=True)]
    assert current['approved_ids'] == ids and current['approved_records'] == records
    assert current['expected_profile_ids'] == current['baseline_ids'] + ids
    assert len(current['expected_profile_ids']) == len(set(current['expected_profile_ids'])) == 333
    assert current['held_ids'] == previous['held_ids'] and not set(ids) & (set(current['held_ids']) | set(current['baseline_ids']))
    assert current['explicitly_not_activated_publishers'] == [p for p in previous['explicitly_not_activated_publishers'] if p not in range(312, 320)]
    assert 311 in current['explicitly_not_activated_publishers'] and 320 in current['explicitly_not_activated_publishers']
    assert current['before_canon_sha256'] == current['after_canon_sha256'] == previous['after_canon_sha256']
    assert current['source_and_normalization_only'] is True and current['runtime_approval'] is False
    assert current['release_approval'] is False and current['external_activations'] == 0 and current['media_approval'] is False
    parts = {name: _sealed(root, current[name]) for name in ('expected_profiles', 'expected_links', 'goldens',
        'baseline_freeze', 'baseline_reconstruction_review', 'independent_normalization',
        'independent_notice_review', 'source_scopes', 'source_approval', 'notice_inverse')}
    profiles, links, golden = parts['expected_profiles'], parts['expected_links'], parts['goldens']
    compact, baseline_review = parts['baseline_freeze'], parts['baseline_reconstruction_review']
    independent, peer = parts['independent_normalization'], parts['independent_notice_review']
    assert compact['schema'] == 'independent-pinned104-baseline325-preservation-v1'
    assert compact['base_commit'] == current['base_commit'] and compact['profile_count'] == compact['translation_count'] == 325
    assert compact['ids'] == current['baseline_ids']
    assert baseline_review['compact_sha256'] == current['baseline_freeze']['sha256']
    assert baseline_review['all325_full_profiles_equal'] is True and baseline_review['all325_full_translation_objects_equal'] is True
    assert baseline_review['all325_ordered_ids_exact'] is True and baseline_review['manifest_source_exact'] is True
    assert independent['no_candidate_metadata_read_or_used'] is True
    assert peer['status'] == 'APPROVE_EIGHT_EXACT_PUBLISHER312_319_V2_NORMALIZATION_PROFILE_METADATA_ONLY'
    assert peer['source_approval'] is True and peer['normalization_approval'] is True
    assert peer['source_approval_count'] == peer['normalization_approval_count'] == 8 and peer['approved_ids'] == ids
    assert peer['runtime_approval'] is peer['reader_approval'] is peer['activation_approval'] is False
    assert peer['approved_profile_objects'] == profiles and peer['approved_link_objects'] == links
    assert list(profiles) == list(links) == ids
    assert [p['id'] for p in golden['poems']] == ids
    assert golden['source_scope_sha256'] == current['source_scopes']['sha256']
    assert golden['all_original_xml_tuples'] == 14645
    assert parts['source_scopes']['canonical_logical_sha256'] == compact['canonical_logical_sha256'] == current['after_canon_sha256']
    rows = {row['canonical_owner']: row for row in independent['rows']}
    assert list(rows) == ids
    for g in golden['poems']:
        uid = g['id']
        p, b = profiles[uid], rows[uid]
        assert {k: v for k, v in p.items() if k != 'mapping_notes'} == b['expected_profile_fields_except_mapping_notes']
        assert p['mapping_notes'] == g['mapping_notes']
        assert links[uid] == dict(p, english=p['title'], match='individually-reviewed-whole-poem')
        assert [v['sha256'] for v in g['body_paragraphs']] == b['body_paragraph_sha256s']
        assert [v['characters_utf16'] for v in g['body_paragraphs']] == b['body_paragraph_characters_utf16']
        assert [v['lines'] for v in g['body_paragraphs']] == b['body_paragraph_lines']
        assert g['body_characters_utf16'] == b['body_characters_utf16']
        assert [v['sha256'] for v in g['notes']] == [v['text_sha256'] for v in b['notes']]
        assert [v['characters_utf16'] for v in g['notes']] == [v['characters_utf16'] for v in b['notes']]
        assert [v['sha256'] for v in g['quotation_proofs']] == b['quotation_entries_sha256']
        assert [v['characters_utf16'] for v in g['quotation_proofs']] == b['quotation_entries_characters_utf16']
        assert g['chapter_summary'] is None and g['publisher_preface'] is None
        assert not any(k in p for k in b['forbidden_profile_fields'])
    assert sum(len(g['body_paragraphs']) for g in golden['poems']) == 73
    assert sum(len(g['notes']) for g in golden['poems']) == 34
    assert sum(len(g['quotation_proofs']) for g in golden['poems']) == 49
    amendment = parts['source_scopes']['notice_only_amendment']
    inverse = parts['notice_inverse']
    assert amendment['owner'] == inverse['owner'] == 'tha-ap321'
    assert inverse['normalized_source_words_notes_quotes_layout_root_rights_changed'] is False
    for name, original in [('EXPECTED_PROFILES.json', profiles), ('EXPECTED_LINKS.json', links), ('GOLDENS.json', golden)]:
        restored = json.loads(json.dumps(original))
        owner = restored['poems'][-1] if name == 'GOLDENS.json' else restored['tha-ap321']
        assert owner['mapping_notes'].count(amendment['after']) == 1
        owner['mapping_notes'][owner['mapping_notes'].index(amendment['after'])] = amendment['before']
        if name == 'GOLDENS.json':
            restored['source_scope_sha256'] = amendment['previous_scope_sha256']
        assert hashlib.sha256((json.dumps(restored, ensure_ascii=False, indent=2) + '\n').encode()).hexdigest() == inverse['files'][name]['old_sha256']
    return current


def curated333_additions(root, anchor_filename):
    current = read_312_319(root)
    if anchor_filename == 'THERA_301_310_APPROVAL.json':
        anchor = read_301_310(root)
        ids, profiles, links = [], {}, {}
    else:
        historical = curated325_additions(root, anchor_filename)
        anchor = historical['anchor']
        ids, profiles, links = list(historical['ids']), dict(historical['profiles']), dict(historical['links'])
        assert historical['curation'] == read_301_310(root)
    extra_profiles = _sealed(root, current['expected_profiles'])
    extra_links = _sealed(root, current['expected_links'])
    assert list(extra_profiles) == list(extra_links) == current['approved_ids']
    assert not set(extra_profiles) & (set(anchor['expected_profile_ids']) | set(ids))
    ids.extend(current['approved_ids'])
    profiles.update(extra_profiles)
    links.update(extra_links)
    assert current['expected_profile_ids'] == anchor['expected_profile_ids'] + ids
    return {'curation': current, 'anchor': anchor, 'ids': ids, 'profiles': profiles, 'links': links}


# EXTERNAL PROPOSAL: replace only after root independently approves exact artifacts.
# An invalid non-hex placeholder cannot equal a SHA256 digest; no fallback exists.
APPROVAL_339_SHA = '39a344a026373f8a902ecb5857414daf12fc4a8ae942132050529844aa602810'
BASELINE_333_COMPACT_SHA = '084180e7967985cf375a71554234405de977f6f6945c41c202a9b467dcb3ba8e'
BASELINE_333_REVIEW_SHA = 'ca8d20dd715f281bbe25ade77bd3baed1312e674d920b83237ea26d7946d89d0'
PUBLISHERS_339 = (321, 323, 324, 325, 326, 329)
IDS_339 = tuple('tha-ap' + str(p + 2) for p in PUBLISHERS_339)


def read_321_329(root):
    """Require the sealed finite six-scope source/normalization contract after333.

    New source-review field names/status below are proposed interfaces, not a
    claim that unavailable source approval has already adopted this schema.
    """
    previous = read_312_319(root)
    current = _sealed(root, {'file': 'THERA_321_329_APPROVAL.json', 'sha256': APPROVAL_339_SHA})
    assert current['schema'] == 'reviewed-apadana-intake-v1' and current['status'] == 'approved'
    assert current['base_commit'] == 'd4dac33e76b449412d7e0cb7a6b93d6189549337'
    assert _sealed(root, current['previous_intake']) == previous
    assert current['previous_intake'] == {'file': 'THERA_312_319_APPROVAL.json',
        'sha256': 'cc8480e22bb9a1615af86cee2e153c77695f4d20c21fd8f147e31f8658ca610d'}
    assert current['publisher_revision'] == previous['publisher_revision'] and current['vri_revision'] == previous['vri_revision']
    assert current['baseline_ids'] == previous['expected_profile_ids'] and len(current['baseline_ids']) == 333
    assert current['baseline_records'] == previous['baseline_records'] + previous['approved_records']
    ids = list(IDS_339)
    records = [{'id': uid, 'publisher_chapter': 'chapter-3', 'poem': pub}
        for uid, pub in zip(ids, PUBLISHERS_339, strict=True)]
    assert current['approved_ids'] == ids and current['approved_records'] == records
    assert current['expected_profile_ids'] == current['baseline_ids'] + ids
    assert len(current['expected_profile_ids']) == len(set(current['expected_profile_ids'])) == 339
    assert current['held_ids'] == previous['held_ids'] and not set(ids) & (set(current['held_ids']) | set(current['baseline_ids']))
    assert current['explicitly_not_activated_publishers'] == sorted(set(previous['explicitly_not_activated_publishers']) | {322, 327, 328, 330, 331})
    for held in (291, 297, 300, 306, 307, 311, 320, 322, 327, 328, 330):
        assert held in current['explicitly_not_activated_publishers']
    assert not any(row['poem'] == 331 and row['publisher_chapter'] == 'chapter-3' for row in current['approved_records'])
    assert current['before_canon_sha256'] == current['after_canon_sha256'] == previous['after_canon_sha256']
    assert current['source_and_normalization_only'] is True and current['runtime_approval'] is False
    assert current['release_approval'] is False and current['external_activations'] == 0 and current['media_approval'] is False
    assert current['baseline_freeze']['sha256'] == BASELINE_333_COMPACT_SHA
    assert current['baseline_reconstruction_review']['sha256'] == BASELINE_333_REVIEW_SHA
    parts = {name: _sealed(root, current[name]) for name in ('expected_profiles', 'expected_links', 'goldens',
        'baseline_freeze', 'baseline_reconstruction_review', 'independent_normalization',
        'independent_notice_review', 'source_scopes', 'source_approval')}
    compact, review = parts['baseline_freeze'], parts['baseline_reconstruction_review']
    assert compact['schema'] == 'independent-pinnedD4-baseline333-preservation-v1'
    assert compact['base_commit'] == current['base_commit'] and compact['profile_count'] == compact['translation_count'] == 333
    assert compact['ids'] == current['baseline_ids']
    assert review['status'] == 'GO_BASELINE333_PRESERVATION_AUTHORITY_ONLY'
    assert review['compact_sha256'] == BASELINE_333_COMPACT_SHA
    assert review['all333_from_finite_pinned_source_literals'] is True
    assert review['all333_links_independently_projected_from_fullprofiles'] is True
    assert review['all325_prior_fullobjects_order_exact'] is True
    assert review['all26_prior_data_hashes_exact'] is True
    profiles, links, golden = parts['expected_profiles'], parts['expected_links'], parts['goldens']
    peer, independent = parts['independent_notice_review'], parts['independent_normalization']
    assert peer['status'] == 'GO_EXACT_SIX_SOURCE_AND_NORMALIZATION_ONLY'
    assert peer['source_approval'] is True and peer['normalization_approval'] is True
    assert peer['approved_ids'] == ids and len(peer['approved_profile_objects']) == len(peer['approved_link_objects']) == 6
    assert peer['runtime_reader_parser_approval'] is peer['activation_approval'] is peer['full_check_CI_release_push_approval'] is False
    assert peer['approved_profile_objects'] == profiles and peer['approved_link_objects'] == links
    assert independent['no_candidate_metadata_read_or_used'] is True
    assert list(profiles) == list(links) == ids
    assert [g['id'] for g in golden['poems']] == ids
    assert golden['source_scope_sha256'] == current['source_scopes']['sha256']
    assert parts['source_scopes']['canonical_logical_sha256'] == compact['canonical_logical_sha256'] == current['after_canon_sha256']
    rows = {row['canonical_owner']: row for row in independent['rows']}
    assert list(rows) == ids
    for g in golden['poems']:
        uid = g['id']; p, b = profiles[uid], rows[uid]
        assert {k: v for k, v in p.items() if k != 'mapping_notes'} == b['expected_profile_fields_except_mapping_notes']
        assert p['mapping_notes'] == g['mapping_notes']
        assert links[uid] == dict(p, english=p['title'], match='individually-reviewed-whole-poem')
        assert [v['sha256'] for v in g['body_paragraphs']] == b['body_paragraph_sha256s']
        assert [v['characters_utf16'] for v in g['body_paragraphs']] == b['body_paragraph_characters_utf16']
        assert [v['lines'] for v in g['body_paragraphs']] == b['body_paragraph_lines']
        assert g['body_characters_utf16'] == b['body_characters_utf16']
        assert [v['sha256'] for v in g['notes']] == [v['text_sha256'] for v in b['notes']]
        assert [v['characters_utf16'] for v in g['notes']] == [v['characters_utf16'] for v in b['notes']]
        assert [v['sha256'] for v in g['quotation_proofs']] == b['quotation_entries_sha256']
        assert [v['characters_utf16'] for v in g['quotation_proofs']] == b['quotation_entries_characters_utf16']
        assert g['chapter_summary'] is None
        assert not any(k in p for k in b['forbidden_profile_fields'])
    return current


def curated339_additions(root, anchor_filename):
    current = read_321_329(root)
    if anchor_filename == 'THERA_312_319_APPROVAL.json':
        anchor = read_312_319(root)
        ids, profiles, links = [], {}, {}
    else:
        historical = curated333_additions(root, anchor_filename)
        anchor = historical['anchor']
        ids, profiles, links = list(historical['ids']), dict(historical['profiles']), dict(historical['links'])
        assert historical['curation'] == read_312_319(root)
    extra_profiles = _sealed(root, current['expected_profiles'])
    extra_links = _sealed(root, current['expected_links'])
    assert list(extra_profiles) == list(extra_links) == current['approved_ids']
    assert not set(extra_profiles) & (set(anchor['expected_profile_ids']) | set(ids))
    ids.extend(current['approved_ids']); profiles.update(extra_profiles); links.update(extra_links)
    assert current['expected_profile_ids'] == anchor['expected_profile_ids'] + ids
    return {'curation': current, 'anchor': anchor, 'ids': ids, 'profiles': profiles, 'links': links}


# D267 four source-normalization scopes over the preserved corrected ac baseline.
APPROVAL343_SHA = 'e68927dcca72d79196786d46ba19290bf0903396993c2fb62dbf2b02150793c8'
INDEPENDENT343_REVIEW_SHA = 'bd1891106e99c3dacc5748618a87be913df20949a83f62a40d320d95c71d004d'
BASELINE339_SHA = '038e2565ee0b7803e4a2d3a33bd0d8e4d832deea89962b2686a72d77d3d10b8a'
NEW_CANON343 = '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8'
HISTORICAL_CANON339 = '1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
IDS343_NEW = ['tha-ap333', 'tha-ap334', 'tha-ap335', 'tha-ap336']

def read_331_334(root):
    previous = read_321_329(root)  # existing historical source reader, body retained
    current = _sealed(root, {'file': 'THERA_331_334_APPROVAL.json', 'sha256': APPROVAL343_SHA})
    assert current['schema'] == 'reviewed-apadana-intake-v1' and current['status'] == 'approved'
    assert current['base_commit'] == 'ac620911e349b089eedeb93906675c62c9523b24'
    assert current['previous_intake'] == {'file': 'THERA_321_329_APPROVAL.json',
        'sha256': '39a344a026373f8a902ecb5857414daf12fc4a8ae942132050529844aa602810'}
    assert _sealed(root, current['previous_intake']) == previous
    assert current['baseline_ids'] == previous['expected_profile_ids'] and len(current['baseline_ids']) == 339
    assert current['baseline_records'] == previous['baseline_records'] + previous['approved_records']
    assert current['approved_ids'] == IDS343_NEW
    assert current['approved_records'] == [{'id': uid, 'publisher_chapter': 'chapter-3', 'poem': pub}
        for uid, pub in zip(IDS343_NEW, (331, 332, 333, 334), strict=True)]
    assert current['expected_profile_ids'] == current['baseline_ids'] + IDS343_NEW
    assert len(current['expected_profile_ids']) == len(set(current['expected_profile_ids'])) == 343
    assert not set(IDS343_NEW) & (set(current['baseline_ids']) | set(previous['held_ids']))
    assert current['held_ids'] == previous['held_ids']
    assert current['explicitly_not_activated_publishers'] == sorted((set(previous['explicitly_not_activated_publishers']) - {331}) | {335})
    assert current['publisher_revision'] == previous['publisher_revision'] and current['vri_revision'] == previous['vri_revision']
    # The historical source intake predates the now-preserved four-unit repair.
    assert previous['after_canon_sha256'] == HISTORICAL_CANON339
    assert current['before_canon_sha256'] == current['after_canon_sha256'] == NEW_CANON343
    assert current['historical_canonical_bridge'] == {
        'previous_intake_after_canon_sha256': HISTORICAL_CANON339, 'current_canon_sha256': NEW_CANON343,
        'prior_four_runtime_inventory_sha256': 'c8fc751e3f00c986c315400f229561659268ee21f5e8d161be8e4edd9c3a75d7',
        'prior_four_runtime_review_sha256': '6006126f8de46b565a9e194ed0fa4426ce512c9f27e67ee4ce4fcd4bc14d3056'}
    assert current['source_and_normalization_only'] is True
    for key in ('runtime_approval', 'release_approval', 'media_approval'):
        assert current[key] is False
    assert current['external_activations'] == 0
    assert current['baseline_freeze']['sha256'] == BASELINE339_SHA
    baseline = _sealed(root, current['baseline_freeze'])
    assert baseline['base_commit'] == current['base_commit'] and baseline['ids'] == current['baseline_ids']
    assert baseline['profile_count'] == baseline['translation_count'] == 339
    assert baseline['canonical_logical_sha256'] == NEW_CANON343
    assert current['baseline_reconstruction_review']['sha256'] == '1bbbc653da24cb1caf0cb92f05b56bd950505f81a0c398819095b0fc0bc7f5e2'
    parity = _sealed(root, current['baseline_reconstruction_review'])
    assert parity['source_authority_compact_sha256'] == BASELINE339_SHA
    for key in ('all339_profile_objects_exact', 'all339_translation_objects_exact', 'all26_non_apadana_data_pins_exact'):
        assert parity[key] is True
    profiles, links, golden = (_sealed(root, current[key]) for key in ('expected_profiles', 'expected_links', 'goldens'))
    assert list(profiles) == list(links) == [g['id'] for g in golden['poems']] == IDS343_NEW
    assert golden['canonical_logical_sha256'] == NEW_CANON343
    assert current['source_approval']['sha256'] == 'dace9bc63059c211f0ae090dc69a2bd4487b2fbeaee9fdce0579eae40c0c65a2'
    original = _sealed(root, current['source_approval'])
    assert original['status'] == 'GO_FOUR_EXACT_ORIGINAL_PUBLISHER_SCOPES_IMPLEMENTATION_HELD'
    assert original['scope']['candidates'] == [331, 332, 333, 334] and original['scope']['boundary_only'] == [335]
    assert original['scope']['canonical_metadata_sha256'] == NEW_CANON343
    assert current['independent_notice_review']['sha256'] == INDEPENDENT343_REVIEW_SHA
    peer = _sealed(root, current['independent_notice_review'])
    # Proposed interface. Root replaces this invalid status only after reading
    # actual independent review; it must bind all four exact profile/link/golden
    # artifacts and explicitly approve normalization, not infer it from producer.
    assert peer['schema'] == 'independent-four-english-normalization-approval-v1'
    assert peer['status'] == 'GO_EXACT_FOUR_PUBLISHER_EDITION_NORMALIZATIONS_ONLY'
    assert peer['normalization_approval'] is True
    assert peer['approved_ids'] == IDS343_NEW and peer['approved_publishers'] == [331, 332, 333, 334]
    for key in ('runtime_inventory_approval', 'implementation_activation_approval', 'behavioral_acceptance_approval', 'CI_or_release_approval'):
        assert peer[key] is False
    assert peer['source_only_review']['sha256'] == current['source_approval']['sha256']
    assert peer['required_schema_adapter'] == {'file': 'NORMALIZATION_SCHEMA_ADAPTER.json',
        'sha256': 'a3ac33cf868c3ecd7f6480457f6eb905013d88556787d30950472cd479f3af4a'}
    _sealed(root, {'file': 'THERA_331_334_NORMALIZATION_SCHEMA_ADAPTER.json',
        'sha256': peer['required_schema_adapter']['sha256']})
    for filename, key in [('EXPECTED_PROFILES.json', 'expected_profiles'), ('EXPECTED_LINKS.json', 'expected_links'),
            ('GOLDENS.json', 'goldens'), ('SOURCE_SCOPES.json', 'source_scopes'), ('DERIVATION_RECEIPT.json', 'normalization_derivation')]:
        assert peer['approved_producer_files'][filename] == current[key]['sha256']
        _sealed(root, current[key])
    assert peer['canonical_logical_sha256'] == NEW_CANON343
    assert current['source_totals'] == golden['totals']
    total_keys = {'poems': 'complete_publisher_edition_choices', 'body_paragraphs': 'body_paragraphs',
        'physical_stanza_entries': 'physical_stanza_entries', 'printed_global_labels': 'printed_global_labels',
        'printed_local_labels': 'printed_local_labels', 'entries_with_absent_local_label': 'absent_local_label_entries',
        'combined_eight_line_entries': 'combined_eight_line_entries', 'poem_notes': 'poem_notes',
        'preface_notes': 'separate_preface_notes', 'preface_scopes': 'preface_scopes', 'pages500': 'pages500',
        'body_characters_utf16': 'body_characters_utf16', 'poem_note_characters_utf16': 'poem_note_characters_utf16',
        'preface_note_characters_utf16': 'preface_note_characters_utf16'}
    for original_key, independent_key in total_keys.items():
        assert golden['totals'][original_key] == peer['totals'][independent_key]
    assert golden['totals']['original_notes'] == peer['totals']['poem_notes'] + peer['totals']['separate_preface_notes']
    assert peer['totals']['stanza_quotation_entries'] == golden['totals']['physical_stanza_entries']
    peer_rows = {row['id']: row for row in peer['per_source']}
    assert list(peer_rows) == IDS343_NEW
    object_sha = lambda value: hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
    for uid in IDS343_NEW:
        assert object_sha(profiles[uid]) == peer_rows[uid]['whole_profile_object_sha256']
        assert object_sha(links[uid]) == peer_rows[uid]['whole_link_object_sha256']
    for uid, g in zip(IDS343_NEW, golden['poems'], strict=True):
        profile = profiles[uid]
        assert profile['index_revision'] == 'apadana-thera333-336-v1'
        assert links[uid] == dict(profile, english=profile['title'], match='individually-reviewed-whole-poem')
        assert profile['body_sha256'] == g['body_sha256'] and profile['notes_sha256'] == g['notes_sha256']
        assert profile['note_numbers'] == g['note_numbers'] and profile['stanza_layout'] == g['stanza_layout']
    assert profiles['tha-ap333']['publisher_preface'] == golden['poems'][0]['publisher_preface']
    assert profiles['tha-ap333']['publisher_preface']['note_numbers'] == [1]
    assert profiles['tha-ap333']['note_numbers'] == [2, 3, 4]
    return current


def _historical343_curated_additions(root, anchor_filename):
    current = read_331_334(root)
    if anchor_filename == 'THERA_321_329_APPROVAL.json':
        anchor = read_321_329(root)
        ids, profiles, links = [], {}, {}
    else:
        historical = curated339_additions(root, anchor_filename)
        assert historical['curation'] == read_321_329(root)
        anchor = historical['anchor']
        ids, profiles, links = list(historical['ids']), dict(historical['profiles']), dict(historical['links'])
    extra_profiles, extra_links = (_sealed(root, current[key]) for key in ('expected_profiles', 'expected_links'))
    assert list(extra_profiles) == list(extra_links) == current['approved_ids']
    assert not set(extra_profiles) & (set(anchor['expected_profile_ids']) | set(ids))
    ids.extend(current['approved_ids']); profiles.update(extra_profiles); links.update(extra_links)
    assert current['expected_profile_ids'] == anchor['expected_profile_ids'] + ids
    return {'curation': current, 'anchor': anchor, 'ids': ids, 'profiles': profiles, 'links': links}


# Source-only CURRENT whitelist. Historical read_* / curated_* bodies above
# retain their exact independent scopes; no runtime/API output is normalized.
CURRENT_335_350_PAIRS = (
    ('tha-ap337',335), ('tha-ap338',336), ('tha-ap339',337), ('tha-ap340',338),
    ('tha-ap341',339), ('tha-ap342',340), ('tha-ap343',341), ('tha-ap344',342),
    ('tha-ap345',343), ('tha-ap346',344), ('tha-ap347',345), ('tha-ap348',346),
    ('tha-ap349',347), ('tha-ap350',348), ('tha-ap351',349), ('tha-ap352',350),
)


def _selection_records(records):
    assert type(records) is list
    for row in records:
        assert type(row) is dict and set(row)=={'id','publisher_chapter','poem'}
        assert type(row['id']) is str and type(row['publisher_chapter']) is str
        assert row['publisher_chapter'] in ('chapter-3','chapter-4')
        assert type(row['poem']) is int and row['poem']>0
    return records


def _compose_reviewed_current359(previous,proof):
    """Assemble only independently pinned source metadata, never observed output.

    This pure seam is separately exercised with synthetic inconsistent selections.
    The public entry supplies proof ONLY from the sealed359 source authority.
    """
    from copy import deepcopy
    approval=proof['APPROVAL.json']
    compact=proof['BASELINE343.json']
    full=proof['BASELINE343_FULL_OBJECTS.json']
    old_ids=compact['ids']
    assert len(old_ids)==len(set(old_ids))==343
    assert previous['expected_profile_ids']==old_ids==list(full['profiles'])==list(full['links'])
    baseline=[]
    for uid in old_ids:
        profile=full['profiles'][uid]
        assert profile['id']==uid and type(profile['poem']) is int and profile['poem']>0
        # Original forty Therī profiles lack publisher_chapter. Their exact
        # sealed profile paths/raw URLs supply the same chapter-4 identity;
        # no canonical number or unreviewed publisher offset is inferred.
        chapter='chapter-4' if uid.startswith('thi-ap') else 'chapter-3'
        assert profile.get('publisher_chapter',chapter)==chapter
        assert profile['path']=='/text/'+chapter+'/poem-'+str(profile['poem']).zfill(3)+'/'
        assert profile['raw_url']=='https://raw.githubusercontent.com/apadana-translation/apadana-site/'+approval['publisher_revision']+'/src/_poems/'+chapter+'/poem-'+str(profile['poem']).zfill(3)+'.md'
        baseline.append({'id':uid,'publisher_chapter':chapter,'poem':profile['poem']})
    historical=_selection_records(previous['baseline_records']+previous['approved_records'])
    assert historical==baseline
    assert sum(row['publisher_chapter']=='chapter-4' for row in baseline)==40
    extra=[{'id':uid,'publisher_chapter':'chapter-3','poem':poem} for uid,poem in CURRENT_335_350_PAIRS]
    assert _selection_records(approval['approved_records'])==extra
    extra_ids=[row['id'] for row in extra]
    assert approval['approved_ids']==extra_ids==list(proof['PROFILES.json'])==list(proof['LINKS.json'])
    assert approval['baseline_ids']==previous['expected_profile_ids']==old_ids
    assert approval['expected_profile_ids']==old_ids+extra_ids
    assert len(approval['expected_profile_ids'])==len(set(approval['expected_profile_ids']))==359
    assert list(proof['EXPECTED_MANIFEST.json']['links'])==approval['expected_profile_ids']
    for row in extra:
        p=proof['PROFILES.json'][row['id']]
        assert (p['id'],p['publisher_chapter'],p['poem'])==(row['id'],row['publisher_chapter'],row['poem'])
    assert type(previous['held_ids']) is list and len(previous['held_ids'])==len(set(previous['held_ids']))
    assert not set(previous['held_ids'])&set(approval['expected_profile_ids'])
    assert approval['previous_holds_remain_unchanged'] is True
    assert approval['source_holds_within_this_exact_sixteen']==[]
    assert approval['source_and_normalization_only'] is True
    assert approval['runtime_approval'] is approval['release_approval'] is False
    result=deepcopy(approval)
    result['baseline_records']=deepcopy(baseline)
    result['approved_records']=deepcopy(extra)
    result['held_ids']=list(previous['held_ids'])
    result['current_source_approval']={'file':'docs/evidence/apadana/english335-350/APPROVAL.json','sha256':'9232fdeec1b93618b5019b1aeb2c706b2a6b423a62bbb5dae86ea39b520e4bf6'}
    result['historical343_source_approval']={'file':'docs/evidence/apadana/THERA_331_334_APPROVAL.json','sha256':APPROVAL343_SHA}
    return result


def _reviewed_current359(root):
    # Lazy source-only import avoids approved_catalogue -> historical reader ->
    # current whitelist recursion and avoids a full actual27 runtime capture for
    # each browser family query. _authority reads every source seal physically;
    # its file primitive lazily imports next-ten.regular without calling capture.
    previous=read_331_334(root)
    from web_reader_intake359 import _authority
    return _compose_reviewed_current359(previous,_authority(root))



def historical359_curated_additions(root,anchor_filename):
    # This closed current-only path avoids recursive suffix assembly. Every
    # historical reader above and every other anchor below remains unchanged.
    if type(anchor_filename) is str and anchor_filename == 'THERA_HELD234_APPROVAL.json':
        from copy import deepcopy
        from web_reader_intake359 import _authority
        previous = read_331_334(root)
        anchor = reviewed_held234_intake(root)
        proof = _authority(root)
        current = _compose_reviewed_current359(previous, proof)
        anchor_ids = anchor['expected_profile_ids']
        full = proof['BASELINE343_FULL_OBJECTS.json']
        assert len(anchor_ids) == 285
        assert previous['expected_profile_ids'][:len(anchor_ids)] == anchor_ids
        # Read every suffix cohort's own pinned objects, not just the full343
        # snapshot. The reader above still validates all historical authorities.
        backwards = (
            ('THERA_331_334_APPROVAL.json', 343), ('THERA_321_329_APPROVAL.json', 339),
            ('THERA_312_319_APPROVAL.json', 333), ('THERA_301_310_APPROVAL.json', 325),
            ('THERA_292_299_APPROVAL.json', 317), ('THERA_287_288_APPROVAL.json', 310),
            ('THERA_281_285_APPROVAL.json', 308), ('THERA_261_280_APPROVAL.json', 303),
        )
        packet = previous
        pieces = []
        for index, (filename, count) in enumerate(backwards):
            assert len(packet['expected_profile_ids']) == count
            profiles = _sealed(root, packet['expected_profiles'])
            links = _sealed(root, packet['expected_links'])
            assert list(profiles) == list(links) == packet['approved_ids']
            pieces.append((packet, profiles, links))
            expected_previous = backwards[index + 1][0] if index + 1 < len(backwards) else anchor_filename
            assert packet['previous_intake']['file'] == expected_previous
            packet = _sealed(root, packet['previous_intake'])
        assert packet == anchor
        ids, profiles, links = [], {}, {}
        for packet, cohort_profiles, cohort_links in reversed(pieces):
            assert packet['baseline_ids'] == anchor_ids + ids
            assert not set(packet['approved_ids']) & (set(anchor_ids) | set(ids))
            ids.extend(packet['approved_ids'])
            profiles.update(cohort_profiles); links.update(cohort_links)
            assert packet['expected_profile_ids'] == anchor_ids + ids
        assert len(ids) == 58 and previous['expected_profile_ids'] == anchor_ids + ids
        assert list(profiles) == list(links) == ids
        for uid in ids:
            assert profiles[uid] == full['profiles'][uid]
            assert links[uid] == full['links'][uid]
        extra = current['approved_ids']
        assert not set(extra) & (set(anchor_ids) | set(ids))
        ids = ids + list(extra)
        profiles = {**deepcopy(profiles), **deepcopy(proof['PROFILES.json'])}
        links = {**deepcopy(links), **deepcopy(proof['LINKS.json'])}
        assert len(ids) == 74 and current['expected_profile_ids'] == anchor_ids + ids
        assert list(profiles) == list(links) == ids
        return {'curation':current, 'anchor':anchor, 'ids':ids, 'profiles':profiles, 'links':links}
    # Public CURRENT additions preserve the exact requested historical anchor.
    # The old generic343 builder remains an explicit named historical body.
    from copy import deepcopy
    historical=_historical343_curated_additions(root,anchor_filename)
    from web_reader_intake359 import _authority
    proof=_authority(root)
    current=_compose_reviewed_current359(historical['curation'],proof)
    full=proof['BASELINE343_FULL_OBJECTS.json']
    anchor_ids=historical['anchor']['expected_profile_ids']
    old_ids=historical['ids']
    assert historical['curation']['expected_profile_ids']==anchor_ids+old_ids
    assert list(historical['profiles'])==list(historical['links'])==old_ids
    for uid in old_ids:
        assert historical['profiles'][uid]==full['profiles'][uid]
        assert historical['links'][uid]==full['links'][uid]
    extra=current['approved_ids']
    assert not set(extra)&(set(anchor_ids)|set(old_ids))
    ids=list(old_ids)+list(extra)
    profiles={**deepcopy(historical['profiles']),**deepcopy(proof['PROFILES.json'])}
    links={**deepcopy(historical['links']),**deepcopy(proof['LINKS.json'])}
    assert current['expected_profile_ids']==anchor_ids+ids
    assert list(profiles)==list(links)==ids
    return {'curation':current,'anchor':historical['anchor'],'ids':ids,'profiles':profiles,'links':links}


# Explicit named historical359 reader: source-only and byte-exact old composer.
def read_335_350(root):
    return _reviewed_current359(root)


CURRENT_351_360_NINE_PAIRS = (
    ('tha-ap353',351), ('tha-ap354',352), ('tha-ap355',353),
    ('tha-ap356',354), ('tha-ap357',355), ('tha-ap358',356),
    ('tha-ap359',357), ('tha-ap361',359), ('tha-ap362',360),
)


def _compose_reviewed_current368(previous, proof):
    """One finite source-only append, independent of runtime/corpus capture."""
    from copy import deepcopy
    from web_reader_intake368 import DIRECTORY, PINS
    approval = proof['APPROVAL.json']
    full = proof['BASELINE359_FULL_OBJECTS.json']
    baseline = proof['BASELINE359.json']['ids']
    assert previous['expected_profile_ids'] == baseline == list(full['profiles']) == list(full['links'])
    assert len(baseline) == len(set(baseline)) == 359
    records = _selection_records(previous['baseline_records'] + previous['approved_records'])
    assert [row['id'] for row in records] == baseline
    for row in records:
        p = full['profiles'][row['id']]
        chapter = 'chapter-4' if row['id'].startswith('thi-ap') else 'chapter-3'
        assert row == {'id':p['id'], 'publisher_chapter':chapter, 'poem':p['poem']}
        assert p.get('publisher_chapter', chapter) == chapter
        assert p['path'] == '/text/' + chapter + '/poem-' + str(p['poem']).zfill(3) + '/'
    extra = [{'id':uid, 'publisher_chapter':'chapter-3', 'poem':poem}
             for uid, poem in CURRENT_351_360_NINE_PAIRS]
    assert _selection_records(approval['approved_records']) == extra
    ids = [row['id'] for row in extra]
    assert approval['approved_ids'] == ids == list(proof['PROFILES.json']) == list(proof['LINKS.json'])
    assert approval['baseline_ids'] == baseline
    assert approval['expected_profile_ids'] == baseline + ids
    assert len(approval['expected_profile_ids']) == len(set(approval['expected_profile_ids'])) == 368
    assert list(proof['EXPECTED_MANIFEST.json']['links']) == approval['expected_profile_ids']
    for row in extra:
        p = proof['PROFILES.json'][row['id']]
        assert (p['id'],p['publisher_chapter'],p['poem']) == (row['id'],row['publisher_chapter'],row['poem'])
    assert type(previous['held_ids']) is list and len(previous['held_ids']) == len(set(previous['held_ids']))
    assert 'tha-ap360' not in previous['held_ids']
    holds = previous['held_ids'] + ['tha-ap360']
    assert not set(holds) & set(approval['expected_profile_ids'])
    assert approval['previous_holds_remain_unchanged'] is True
    assert approval['source_holds_within_publisher351_360'] == ['tha-ap360']
    assert approval['source_and_normalization_only'] is True
    assert approval['runtime_approval'] is approval['release_approval'] is False
    result = deepcopy(approval)
    result['baseline_records'] = deepcopy(records)
    result['approved_records'] = deepcopy(extra)
    result['held_ids'] = holds
    result['current_source_approval'] = {'file':DIRECTORY+'/APPROVAL.json', 'sha256':PINS['APPROVAL.json']}
    result['historical359_source_approval'] = deepcopy(previous['current_source_approval'])
    result['historical343_source_approval'] = deepcopy(previous['historical343_source_approval'])
    return result


def _reviewed_current368(root):
    previous = _reviewed_current359(root)
    from web_reader_intake368 import _authority
    return _compose_reviewed_current368(previous, _authority(root))


def curated_additions(root, anchor_filename):
    """Advance current suffixes; retain all optimized359 source checks intact."""
    from copy import deepcopy
    from web_reader_intake368 import _authority
    historical = historical359_curated_additions(root, anchor_filename)
    proof = _authority(root)
    current = _compose_reviewed_current368(historical['curation'], proof)
    full = proof['BASELINE359_FULL_OBJECTS.json']
    anchor_ids = historical['anchor']['expected_profile_ids']
    old_ids = historical['ids']
    assert historical['curation']['expected_profile_ids'] == anchor_ids + old_ids
    assert list(historical['profiles']) == list(historical['links']) == old_ids
    for uid in old_ids:
        assert historical['profiles'][uid] == full['profiles'][uid]
        assert historical['links'][uid] == full['links'][uid]
    extra = current['approved_ids']
    assert not set(extra) & (set(anchor_ids) | set(old_ids))
    ids = list(old_ids) + list(extra)
    profiles = {**deepcopy(historical['profiles']), **deepcopy(proof['PROFILES.json'])}
    links = {**deepcopy(historical['links']), **deepcopy(proof['LINKS.json'])}
    assert current['expected_profile_ids'] == anchor_ids + ids
    assert list(profiles) == list(links) == ids
    return {'curation':current, 'anchor':historical['anchor'], 'ids':ids, 'profiles':profiles, 'links':links}
