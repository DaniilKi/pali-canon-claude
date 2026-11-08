"""Withhold reviewed unsafe whole-text bindings after every linking pass.

Exclusions cannot authorize retrieval or scope. A future source-specific partial/shared
integration must deliberately retire the hold; adding a scope field cannot bypass it.
"""
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

MANIFEST = Path(__file__).with_suffix('.json')


def source_key(url):
    p = urlsplit(url)
    return (p.hostname.removeprefix('www.'), p.path) if p.hostname else None


def valid_sha(value):
    return isinstance(value, str) and re.fullmatch(r'[0-9a-f]{64}', value) is not None


def apply_reviewed_exclusions(out, manifest=MANIFEST):
    data = json.loads(Path(manifest).read_text(encoding='utf-8'))
    if data.get('version') != 1 or not isinstance(data.get('exclusions'), list) or not data['exclusions']:
        raise ValueError('Missing or invalid reviewed exclusion manifest')
    blocked = {}
    for row in data['exclusions']:
        p = urlsplit(row.get('url', ''))
        key = source_key(row.get('url', ''))
        source = row.get('source')
        hosts, pattern = {
            'dhammatalks': (('www.dhammatalks.org', 'dhammatalks.org'), r'/suttas/[A-Za-z0-9_/.-]+\.html'),
            'ati': (('www.accesstoinsight.org', 'accesstoinsight.org'), r'/tipitaka/[a-z0-9_/.-]+\.html'),
        }.get(source, ((), r'(?!)'))
        if (source not in ('dhammatalks', 'ati') or row.get('status') not in ('withheld-shared-page', 'withheld-partial-unit')
                or p.scheme != 'https' or p.hostname not in hosts
                or p.username or p.password or p.port or p.query or p.fragment
                or not re.fullmatch(pattern, p.path)
                or key in blocked or not row.get('reason') or not row.get('review')
                or not isinstance(row.get('subject_ids'), list) or len(row['subject_ids']) < 1
                or len(set(row['subject_ids'])) != len(row['subject_ids'])):
            raise ValueError('Invalid or duplicate reviewed exclusion')
        if row['status'] == 'withheld-partial-unit':
            review = row['review']
            roots = review.get('root_units') if isinstance(review, dict) else None
            if (source != 'ati' or len(row['subject_ids']) != 1
                    or not isinstance(roots, list) or len(roots) != 1
                    or not isinstance(roots[0], dict) or roots[0].get('id') != row['subject_ids'][0]
                    or not valid_sha(roots[0].get('root_blocks_sha256'))
                    or any(not valid_sha(review.get(pin))
                           for pin in ('source_html_sha256', 'text_sha256', 'notice_sha256'))):
                raise ValueError('Invalid reviewed partial-unit exclusion')
        blocked[key] = row
    # Validate the complete manifest before constructing a fresh output. Inputs stay intact.
    result, removed = {}, []
    for uid, links in out.items():
        kept = []
        for link in links:
            row = blocked.get(source_key(link.get('url', '')))
            if row:
                removed.append({'unit_id': uid, 'url': link['url'], 'reason': row['reason']})
            else:
                kept.append(link)
        if kept:
            result[uid] = kept
    return result, removed
