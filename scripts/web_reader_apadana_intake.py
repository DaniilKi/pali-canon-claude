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


def reviewed_intake(root):
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


def curated_additions(root,anchor_filename):
    current=reviewed_intake(root)
    anchors={'THERA_241_250_APPROVAL.json':_reviewed_241_250,
             'THERA_221_230_APPROVAL.json':_reviewed_221_230,
             'THERA_REMAINING_APPROVAL.json':reviewed_remaining_intake}
    assert anchor_filename in anchors
    anchor=anchors[anchor_filename](root)
    pieces=[]
    if anchor_filename=='THERA_241_250_APPROVAL.json':
        packet=_reviewed_221_230(root)
        pieces.append({'ids':packet['approved_ids'],'profiles':_sealed(root,packet['expected_profiles']),'links':_sealed(root,packet['expected_links'])})
    if anchor_filename!='THERA_REMAINING_APPROVAL.json':
        for group in remaining_groups(root,reviewed_remaining_intake(root)).values():
            pieces.append({'ids':group['approved_ids'],'profiles':group['profiles'],'links':group['links']})
    pieces.append({'ids':current['approved_ids'],'profiles':_sealed(root,current['expected_profiles']),'links':_sealed(root,current['expected_links'])})
    ids=[];profiles={};links={}
    for piece in pieces:
        assert set(piece['ids'])==set(piece['profiles'])==set(piece['links'])
        assert not set(piece['ids'])&set(ids) and not set(piece['ids'])&set(anchor['expected_profile_ids'])
        ids.extend(piece['ids']);profiles.update(piece['profiles']);links.update(piece['links'])
    assert current['expected_profile_ids']==anchor['expected_profile_ids']+ids
    return {'curation':current,'anchor':anchor,'ids':ids,'profiles':profiles,'links':links}


def current_apadana_ids(root):
    return reviewed_intake(root)['expected_profile_ids']


def current_family_ids(root,chapter):
    data=reviewed_intake(root)
    return [row['id'] for row in sorted(data['baseline_records']+data['approved_records'],key=lambda row:row['poem']) if row['publisher_chapter']==chapter]
