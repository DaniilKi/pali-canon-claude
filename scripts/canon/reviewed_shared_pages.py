"""Build reviewed ATI shared-page declarations; never whole-unit translations.

Usage: reviewed_shared_pages.py CANON.gz TRANSLATIONS.json ATI-CHECKOUT OUTPUT.json
Node 20+ verifies exact runtime extraction and complete notice; no network is used.
"""
import gzip
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

MANIFEST = Path(__file__).with_suffix('.json')
SHA = re.compile(r'[a-f0-9]{64}')


def manifest_rows(manifest=MANIFEST):
    m = json.loads(Path(manifest).read_text(encoding='utf-8'))
    if m.get('version') != 1 or not isinstance(m.get('links'), list) or not m['links']:
        raise ValueError('Invalid reviewed shared-page manifest')
    paths, owners = set(), set()
    for r in m['links']:
        ids = r.get('text_ids', [])
        if (not re.fullmatch(r'/tipitaka/(?:an|sn|kn)/[a-z0-9_./-]+', r.get('path', '')) or '..' in r['path']
                or r['path'] in paths or r.get('owner_id') in owners
                or not 2 <= len(ids) <= 32 or len(set(ids)) != len(ids) or ids[0] != r.get('owner_id')
                or r.get('presentation') not in ('compilation', 'condensed')
                or r.get('license') != 'CC-BY-NC' or not r.get('translator') or not r.get('mapping_note')
                or not r.get('source_reference') or len(r['source_reference']) > 200
                or any(not SHA.fullmatch(r.get(k, '')) for k in ('source_html_sha256','text_sha256','notice_sha256','pali_segments_sha256'))):
            raise ValueError('Invalid or duplicate reviewed shared page')
        paths.add(r['path']); owners.add(r['owner_id'])
    return m


def withhold_shared_page_proposals(out, manifest=MANIFEST):
    paths = {r['path'] for r in manifest_rows(manifest)['links']}
    def known(l):
        return l.get('source') == 'ati' and (l.get('path') in paths or any(l.get('url') in ('https://accesstoinsight.org'+p+'.html','https://www.accesstoinsight.org'+p+'.html') for p in paths))
    removed, result = [], {}
    for uid, links in out.items():
        kept = []
        for link in links:
            if known(link): removed.append({'unit_id':uid,'url':link.get('url')})
            else: kept.append(link)
        if kept: result[uid] = kept
    return result, removed


def reviewed_shared_links(canon, ati_root, manifest=MANIFEST):
    m = manifest_rows(manifest)
    if canon['source']['commit'] != m['vri_commit']:
        raise ValueError('Shared source canonical commit changed; review required')
    units = {u['id']:u for u in canon['units']}
    accepted = {}
    for r in m['links']:
        selected = [units.get(uid) for uid in r['text_ids']]
        if any(not u or u.get('approximate') or u.get('kind') or u.get('members')
               or u['book'] != selected[0]['book'] or u['collection'] != selected[0]['collection']
               or (i and selected[i-1]['end'] != u['start']) for i,u in enumerate(selected)):
            raise ValueError('Shared source members changed or are not independent/contiguous')
        if [x['id'] for x in r['root_units']] != r['text_ids']:
            raise ValueError('Shared root evidence does not cover exact members')
        for u, evidence in zip(selected, r['root_units']):
            blocks = canon['books'][u['book']]['blocks'][u['start']:u['end']]
            digest = hashlib.sha256(json.dumps(blocks,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
            if u['title'] != evidence['title'] or u['vri'] != evidence['vri'] or digest != evidence['root_blocks_sha256']:
                raise ValueError('Shared complete root wording/scope changed: '+u['id'])
        accepted[r['owner_id']] = {'source':'ati','path':r['path'],'url':'https://accesstoinsight.org'+r['path']+'.html',
            'english':r['english_title'],'translator':r['translator'],'license':r['license'],
            'reference':r['source_reference'],'match':'reviewed-shared-page','mapping_note':r['mapping_note'],
            'review':{'ati_commit':m['ati_commit'],'vri_commit':m['vri_commit'],'source_html_sha256':r['source_html_sha256']},
            'shared_scope':{'version':1,'status':'reviewed','owner_id':r['owner_id'],'text_ids':r['text_ids'],
                'presentation':r['presentation'],'alignment':'unverified','source_commit':m['vri_commit'],
                'pali_sha256':r['pali_segments_sha256'],'text_sha256':r['text_sha256'],'notice_sha256':r['notice_sha256']}}
    verifier = Path(__file__).with_name('verify_shared_html.mjs')
    result = subprocess.run(['node',str(verifier),str(manifest),str(ati_root)],capture_output=True,text=True,encoding='utf-8')
    if result.returncode:
        raise ValueError('Shared source extraction/notice verification failed: '+result.stderr[-2000:])
    if len(json.loads(result.stdout)['verified']) != len(accepted):
        raise ValueError('Incomplete shared source verification')
    return accepted


def apply_reviewed_shared_links(out, canon, ati_root, manifest=MANIFEST):
    accepted = reviewed_shared_links(canon, ati_root, manifest)  # All validation before any output change.
    result, removed = withhold_shared_page_proposals(out, manifest)
    for owner, link in accepted.items(): result.setdefault(owner, []).append(link)
    return result, {'owners':list(accepted),'page_bindings_replaced':removed}


if __name__ == '__main__':
    if len(sys.argv) != 5 or sys.argv[2] == sys.argv[4]: raise SystemExit(__doc__)
    ci, ti, root, output = sys.argv[1:]
    canon = json.load(gzip.open(ci,'rt',encoding='utf-8'))
    out, report = apply_reviewed_shared_links(json.loads(Path(ti).read_text(encoding='utf-8')),canon,root)
    Path(output).write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(json.dumps(report))
