"""Apply source-reviewed ATI whole-text links; never infer verse offsets.

Only link metadata is bundled. Complete upstream HTML is verified locally at
build time, including its notice. Revisions require a fresh scope/rights review.
Usage: reviewed_ati_stories.py CANON.gz TRANSLATIONS.json ATI-CHECKOUT OUTPUT.json
"""
import gzip
import hashlib
import json
import re
import sys
from pathlib import Path

MANIFEST = Path(__file__).with_suffix('.json')


def check_numbered_verses(raw, first, last):
    """Check an explicitly reviewed labelled source range, not a VRI alignment."""
    match = re.search(r'<!-- BEGIN COPYRIGHTED TEXT CHUNK -->(.*?)<!-- #COPYRIGHTED_TEXT_CHUNK', raw.decode('utf-8'), re.S)
    if not match:
        raise ValueError('Missing source text chunk')
    markers = re.findall(r'<small><a id="verse-([0-9]+)">[0-9]+</a>(?:-([0-9]+))?\.</small>', match[1])
    expanded = []
    for start, end in markers:
        start = int(start)
        end = int(end) if end else start
        if end < start:
            end += start // 100 * 100
        if not first <= start <= end <= last:
            raise ValueError('Source verse marker outside reviewed range')
        expanded.extend(range(start, end + 1))
    if expanded != list(range(first, last + 1)):
        raise ValueError('Incomplete, duplicate or reordered source verse markers')


def reviewed_links(canon, ati_root):
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    units = {u['id']: u for u in canon['units']}
    links = {}
    owners = {}
    for row in manifest['links']:
        u = units.get(row['unit_id'])
        if not u or u.get('approximate') or u.get('kind') or u['title'] != row['pali_title'] or u['vri'] != row['vri_verses']:
            raise ValueError(f'Story identity changed: {row["unit_id"]}')
        blocks = canon['books'][u['book']]['blocks'][u['start']:u['end']]
        pali = '\n'.join(b[2] for b in blocks if b[0] in ('gatha1', 'gatha2', 'gatha3', 'gathalast'))
        if hashlib.sha256(pali.encode()).hexdigest() != row['pali_sha256']:
            raise ValueError(f'Story wording/scope changed: {u["id"]}')
        if row.get('root_blocks_sha256') and hashlib.sha256(json.dumps(blocks, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest() != row['root_blocks_sha256']:
            raise ValueError(f'Complete root scope changed: {u["id"]}')
        path = row['path']
        if '..' in path or not re.fullmatch(r'/tipitaka/(?:kn|sn)/[a-z0-9_./-]+', path):
            raise ValueError('Invalid reviewed ATI path')
        if path in owners and owners[path] != u['id']:
            raise ValueError(f'Reviewed whole-text page has multiple owners: {path}')
        owners[path] = u['id']
        raw = Path(ati_root, path.lstrip('/') + '.html').read_bytes()
        if hashlib.sha256(raw).hexdigest() != row['source_html_sha256']:
            raise ValueError(f'ATI page changed; review scope and rights: {path}')
        if row.get('evidence', {}).get('numbered_source_range'):
            check_numbered_verses(raw, *row['evidence']['numbered_source_range'])
        links.setdefault(u['id'], []).append({
            'source': 'ati', 'english': row['english_title'], 'path': path,
            'url': 'https://www.accesstoinsight.org' + path + '.html',
            'translator': row['translator'], 'license': row['license'],
            'reference': row['source_reference'], 'match': 'reviewed-story',
            'mapping_note': row['mapping_note'],
            'review': {'ati_commit': manifest['ati_commit'], 'vri_commit': manifest['vri_commit'],
                       'source_html_sha256': row['source_html_sha256'], 'pali_sha256': row['pali_sha256']},
        })
    return links


def apply_reviewed_links(out, canon, ati_root):
    accepted = reviewed_links(canon, ati_root)  # Validate everything before modifying output.
    owners = {link['url']: uid for uid, links in accepted.items() for link in links}
    for uid, links in out.items():
        if any(link.get('url') in owners and owners[link['url']] != uid for link in links):
            raise ValueError(f'Reviewed whole-text page already belongs to another unit: {uid}')
    for uid, links in accepted.items():
        existing = out.get(uid, [])
        urls = {link['url'] for link in links}
        if len(urls) != len(links):
            raise ValueError(f'Duplicate reviewed ATI page: {uid}')
        if any(l['source'] == 'ati' and l['url'] not in urls for l in existing):
            raise ValueError(f'Conflicting ATI story link: {uid}')
    for uid, links in accepted.items():
        urls = {link['url'] for link in links}
        out[uid] = [l for l in out.get(uid, []) if l['url'] not in urls] + links
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
