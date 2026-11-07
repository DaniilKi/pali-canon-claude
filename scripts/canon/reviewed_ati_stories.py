"""Apply three source-reviewed ATI whole-story links; never infer verse offsets.

Only link metadata is bundled. Complete upstream HTML is verified locally at
build time, including its notice. Revisions require a fresh scope/rights review.
Usage: reviewed_ati_stories.py CANON.gz TRANSLATIONS.json ATI-CHECKOUT OUTPUT.json
"""
import gzip
import hashlib
import json
import sys
from pathlib import Path

MANIFEST = Path(__file__).with_suffix('.json')


def reviewed_links(canon, ati_root):
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    units = {u['id']: u for u in canon['units']}
    links = {}
    for row in manifest['links']:
        u = units.get(row['unit_id'])
        if not u or u.get('approximate') or u.get('kind') or u['title'] != row['pali_title'] or u['vri'] != row['vri_verses']:
            raise ValueError(f'Story identity changed: {row["unit_id"]}')
        blocks = canon['books'][u['book']]['blocks'][u['start']:u['end']]
        pali = '\n'.join(b[2] for b in blocks if b[0] in ('gatha1', 'gatha2', 'gatha3', 'gathalast'))
        if hashlib.sha256(pali.encode()).hexdigest() != row['pali_sha256']:
            raise ValueError(f'Story wording/scope changed: {u["id"]}')
        path = row['path']
        if '..' in path or not path.startswith('/tipitaka/kn/'):
            raise ValueError('Invalid reviewed ATI path')
        raw = Path(ati_root, path.lstrip('/') + '.html').read_bytes()
        if hashlib.sha256(raw).hexdigest() != row['source_html_sha256']:
            raise ValueError(f'ATI page changed; review scope and rights: {path}')
        links[u['id']] = {
            'source': 'ati', 'english': row['english_title'], 'path': path,
            'url': 'https://www.accesstoinsight.org' + path + '.html',
            'translator': row['translator'], 'license': row['license'],
            'reference': row['source_reference'], 'match': 'reviewed-story',
            'mapping_note': row['mapping_note'],
            'review': {'ati_commit': manifest['ati_commit'], 'vri_commit': manifest['vri_commit'],
                       'source_html_sha256': row['source_html_sha256'], 'pali_sha256': row['pali_sha256']},
        }
    return links


def apply_reviewed_links(out, canon, ati_root):
    accepted = reviewed_links(canon, ati_root)  # Validate everything before modifying output.
    for uid, link in accepted.items():
        existing = out.get(uid, [])
        if any(l['source'] == 'ati' and l['url'] != link['url'] for l in existing):
            raise ValueError(f'Conflicting ATI story link: {uid}')
    for uid, link in accepted.items():
        out[uid] = [l for l in out.get(uid, []) if l['url'] != link['url']] + [link]
    return list(accepted)


if __name__ == '__main__':
    if len(sys.argv) != 5 or sys.argv[2] == sys.argv[4]:
        raise SystemExit(__doc__)
    ci, ti, root, output = sys.argv[1:]
    with gzip.open(ci, 'rt', encoding='utf-8') as f:
        canon = json.load(f)
    with open(ti, encoding='utf-8') as f:
        links = json.load(f)
    print(json.dumps({'accepted': apply_reviewed_links(links, canon, root)}))
    Path(output).write_text(json.dumps(links, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
