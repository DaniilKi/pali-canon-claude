"""Read-only pinned-ATI metadata leads for existing ordinary links; never approvals.

Usage: ordinary_excerpt_packet.py CANON.gz TRANSLATIONS.json ATI-CHECKOUT
English scripture bodies are neither returned nor written. Extent/filename/title
clues can describe a collection excerpt that fully translates one indexed poem.
"""
import gzip
import hashlib
import html
import json
import re
import sys
from pathlib import Path
from collections import Counter
from ati_review_packet import require_checkout
from reviewed_partial_pages import manifest_rows


def packet(canon, translations, root, expected, prior_reviews=None):
    if canon['source']['commit'] != expected['vri_commit']:
        raise ValueError('Canonical source changed')
    root = Path(root).resolve()
    by_id = {u['id']: u for u in canon['units']}
    rows = []
    checked = 0
    for owner, links in translations.items():
        for link in links:
            if link.get('source') != 'ati' or 'partial_scope' in link or 'shared_scope' in link:
                continue
            path = link.get('path', '')
            if not re.fullmatch(r'/tipitaka/[a-z0-9_./-]+', path) or '..' in path:
                raise ValueError('Invalid ATI path')
            target = (root / (path.lstrip('/') + '.html')).resolve()
            if not target.is_relative_to(root):
                raise ValueError('ATI source escapes checkout')
            raw = target.read_bytes()  # Missing sources fail; never silently skip.
            text = raw.decode('utf-8')
            checked += 1
            def meta(key):
                match = re.search(r'\[' + re.escape(key) + r'\]\s*=\s*\{(.*?)\}', text, re.S)
                return html.unescape(match[1]).strip() if match else ''
            extent, subtitle, subtitle2 = meta('EXTENT'), meta('SUBTITLE'), meta('SUBTITLE2')
            reasons = []
            if extent.casefold() == 'excerpt': reasons.append('publisher extent excerpt')
            if re.search(r'\bexcerpt\b', ' '.join([subtitle, subtitle2, meta('MY_TITLE'), link.get('english', '')]), re.I):
                reasons.append('publisher excerpt title or subtitle')
            if re.search(r'\d+x\.', path): reasons.append('publisher excerpt filename marker')
            if not reasons:
                continue
            unit = by_id.get(owner)
            if not unit:
                raise ValueError('Unknown ordinary owner')
            prior = next((r for r in (prior_reviews or {}).get('rows', [])
                          if r.get('owner') == owner and r.get('path') == path and r.get('decision') == 'retain'), None)
            def digest(value):
                return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
            retained = False
            if prior and prior_reviews.get('ati_commit') == expected['ati_commit'] and prior_reviews.get('vri_commit') == expected['vri_commit']:
                r = prior.get('root', {})
                retained = (all(unit.get(k) == r.get(k) for k in ['id', 'title', 'vri', 'book', 'start', 'end'])
                            and prior.get('source_html_sha256') == hashlib.sha256(raw).hexdigest()
                            and prior.get('link_metadata_sha256') == digest({'owner': owner, 'link': link})
                            and r.get('root_blocks_sha256') == digest(canon['books'][unit['book']]['blocks'][unit['start']:unit['end']]))
            rows.append({'owner': owner, 'path': path, 'url': link.get('url'),
                         'translator': link.get('translator'), 'reference': link.get('reference'),
                         'publisher_extent': extent, 'publisher_subtitle': subtitle,
                         'publisher_secondary_subtitle': subtitle2,
                         'source_html_sha256': hashlib.sha256(raw).hexdigest(),
                         'indexed_root': {k: unit.get(k) for k in ['id', 'title', 'vri', 'book', 'start', 'end', 'kind', 'approximate']},
                         'other_versions_in_supplied_index': [l.get('url') for l in links if l is not link and 'partial_scope' not in l and 'shared_scope' not in l],
                         'reasons': reasons, 'approved': False,
                         'review_status': 'reviewed-retained-at-snapshot' if retained else 'unreviewed',
                         'review_required': ['complete body and indexed boundaries', 'page-specific full licence', 'independent alternatives and source scope']})
    rows.sort(key=lambda r: (r['owner'], r['path']))
    return {'review_packet_only': True, 'approvals_changed': False,
            'ati_commit': expected['ati_commit'], 'vri_commit': expected['vri_commit'],
            'ordinary_ati_bindings_checked': checked, 'candidate_bindings': len(rows),
            'reviewed_retained_snapshots': sum(r['review_status'] == 'reviewed-retained-at-snapshot' for r in rows),
            'unreviewed_bindings': sum(r['review_status'] == 'unreviewed' for r in rows),
            'reason_counts': dict(sorted(Counter(reason for r in rows for reason in r['reasons']).items())),
            'warning': 'Metadata clues only, not errors or approvals. A collection excerpt can fully cover one indexed poem. EXTENT=complete is not evidence of completeness. Other-version counts concern only the supplied index, not every external provider. Frozen source hashes do not prove upstream freshness.',
            'rows': rows}


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit('Usage: ordinary_excerpt_packet.py CANON.gz TRANSLATIONS.json ATI-CHECKOUT')
    ci, ti, source = sys.argv[1:]
    expected = manifest_rows()
    require_checkout(source, expected['ati_commit'])
    canon = json.load(gzip.open(ci, 'rt', encoding='utf-8'))
    prior_file = Path(__file__).resolve().parents[2] / 'docs/data/verse-scope-review.json'
    prior = json.loads(prior_file.read_text(encoding='utf-8'))
    print(json.dumps(packet(canon, json.loads(Path(ti).read_text(encoding='utf-8')), source, expected, prior), ensure_ascii=False, indent=2))
