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


def reviewed_intake(root):
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


def current_apadana_ids(root):
    return reviewed_intake(root)['expected_profile_ids']


def current_family_ids(root,chapter):
    data=reviewed_intake(root)
    return [row['id'] for row in sorted(data['baseline_records']+data['approved_records'],key=lambda row:row['poem']) if row['publisher_chapter']==chapter]
