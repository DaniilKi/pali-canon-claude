"""Read the independent current intake whitelist while preserving historical cohorts."""
import json
from pathlib import Path


def reviewed_intake(root):
    data=json.loads((Path(root)/'docs/evidence/apadana/THERA_141_180_APPROVAL.json').read_text(encoding='utf-8'))
    assert data['schema']=='reviewed-apadana-intake-v1' and data['status']=='approved'
    assert data['publisher_revision']=='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
    ids=data['expected_profile_ids']
    assert ids==data['baseline_ids']+data['approved_ids'] and len(ids)==len(set(ids))
    records=data['baseline_records']+data['approved_records']
    assert [row['id'] for row in records]==ids
    assert all(row['publisher_chapter'] in ('chapter-3','chapter-4') and isinstance(row['poem'],int) and row['poem']>0 for row in records)
    return data


def current_apadana_ids(root):
    return reviewed_intake(root)['expected_profile_ids']


def current_family_ids(root,chapter):
    data=reviewed_intake(root)
    return [row['id'] for row in sorted(data['baseline_records']+data['approved_records'],key=lambda row:row['poem']) if row['publisher_chapter']==chapter]
