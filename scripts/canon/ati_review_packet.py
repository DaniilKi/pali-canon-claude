"""Read-only evidence packets for unreviewed ATI ledger pages; never approve links.

Usage: ati_review_packet.py CANON.gz TRANSLATIONS.json ATI-CHECKOUT LEDGER.json
Writes metadata-only JSON to stdout. Requires the pinned clean ATI checkout.
PTS candidates are possible matches, not evidence of equivalence or permission.
"""
import gzip
import hashlib
import html
import json
import re
import subprocess
import sys
from pathlib import Path
from collections import Counter
from validate import parse_pts
from reviewed_ati_stories import MANIFEST, reviewed_links


def packet(canon, translations, root, ledger, manifest):
    if canon['source']['commit'] != manifest['vri_commit']:
        raise ValueError('Canon is not the reviewed VRI version')
    root = Path(root).resolve()
    approved = {r['path'].lstrip('/') + '.html' for r in manifest['links']}
    current = {l.get('path', '').lstrip('/') + '.html' for links in translations.values()
               for l in links if l.get('source') == 'ati'}
    prior_holds = {}
    for review in ledger.get('followup_reviews', []):
        for held in review.get('deferred', []):
            prior_holds.setdefault(held['path'], []).append({'decision': review['decision'], 'reason': held['reason']})
    rows, seen = [], set()
    for entry in ledger['rows']:
        path = entry['path']
        if path in seen:
            raise ValueError(f'Duplicate ledger path: {path}')
        seen.add(path)
        if path in approved or path in current:
            continue
        if not re.fullmatch(r'tipitaka/[a-z0-9_./-]+\.html', path) or '..' in path:
            raise ValueError('Invalid ledger source path')
        target = (root / path).resolve()
        if not target.is_relative_to(root):
            raise ValueError('Source path escapes checkout')
        raw = target.read_bytes()  # Fail on missing pages rather than emit a complete-looking packet.
        text = raw.decode('utf-8')
        def meta(key):
            m = re.search(r'\[' + re.escape(key) + r'\]=\{(.*?)\}', text, re.S)
            return html.unescape(m[1]).strip() if m else ''
        pts = parse_pts(meta('PTS_ID'))
        candidates = []
        if pts:
            coll, volume, page = pts
            for u in canon['units']:
                p = u.get('pts', {})
                if (u['collection'] == coll and p.get('volume') == volume
                        and p.get('page', 0) <= page <= p.get('end_page', p.get('page', 0))):
                    candidates.append({'unit_id': u['id'], 'pali_title': u['title'],
                        'pts_start_matches': p['page'] == page,
                        'has_english': bool(translations.get(u['id'])),
                        'approximate': bool(u.get('approximate')), 'kind': u.get('kind')})
        candidates.sort(key=lambda u: (u['has_english'], not u['pts_start_matches'], u['unit_id']))
        extent = meta('EXTENT')
        rows.append({'path': path, 'source_html_sha256': hashlib.sha256(raw).hexdigest(),
            'publisher_title': meta('MY_TITLE'), 'subtitle': meta('SUBTITLE'),
            'publisher_reference': meta('PTS_ID'), 'translator': meta('AUTHOR'),
            'license_label': meta('LICENSE'), 'publisher_extent': extent,
            'copyrighted_chunk_present': '<!-- BEGIN COPYRIGHTED TEXT CHUNK -->' in text
                and '<!-- #COPYRIGHTED_TEXT_CHUNK' in text,
            'rights_notice_container_present': bool(re.search(r'id=[\"\']F_provenance[\"\']', text)),
            'possible_pts_matches': candidates,
            'first_english_possibilities': sum(not u['has_english'] for u in candidates),
            'review_required': ['identity and complete boundaries', 'edition/editorial/excerpt scope',
                                'page-specific rights and complete notice'],
            'prior_review_holds': prior_holds.get(path, []),
            'approved': False})
    rows.sort(key=lambda r: (-bool(r['first_english_possibilities']),
                             r['publisher_extent'] != 'complete', r['path']))
    return {'review_packet_only': True, 'approvals_changed': False,
            'ati_commit': manifest['ati_commit'], 'vri_commit': manifest['vri_commit'],
            'summary': {'ledger_pages': len(seen), 'pending_pages': len(rows),
                'pages_with_first_english_possibilities': sum(bool(r['first_english_possibilities']) for r in rows),
                'publisher_extents': dict(sorted(Counter(r['publisher_extent'] or 'unspecified' for r in rows).items()))},
            'warning': 'PTS overlap, extent and licence labels are screening clues only. No content, scope or permission is approved. No English body is included.',
            'rows': rows}


def require_checkout(root, commit):
    head = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
    dirty = subprocess.check_output(['git', '-C', str(root), 'status', '--porcelain', '--untracked-files=all'], text=True).strip()
    if head != commit or dirty:
        raise ValueError('ATI checkout must be clean and pinned to the reviewed commit')


def require_ledger_sources(root, ledger):
    paths = {r['path'] for r in ledger['rows']}
    if not paths:
        return
    tracked = set(subprocess.check_output(['git', '-C', str(root), 'ls-files', '-z', '--', *sorted(paths)], text=True).split(chr(0))) - {''}
    if tracked != paths:
        raise ValueError('Every ledger page must be tracked in the pinned ATI checkout')


if __name__ == '__main__':
    if len(sys.argv) != 5:
        raise SystemExit(__doc__)
    ci, ti, root, li = sys.argv[1:]
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    require_checkout(root, manifest['ati_commit'])
    canon = json.load(gzip.open(ci, 'rt', encoding='utf-8'))
    reviewed_links(canon, root)  # Existing accepted evidence must still validate.
    ledger = json.loads(Path(li).read_text(encoding='utf-8'))
    require_ledger_sources(root, ledger)
    report = packet(canon, json.loads(Path(ti).read_text(encoding='utf-8')), root, ledger, manifest)
    print(json.dumps(report, ensure_ascii=False, indent=2))
