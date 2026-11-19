"""Exact whole-question selections on reviewed multi-question ATI pages.

Only metadata is bundled. A source page is never inferred to be a translation
of any one question; each reviewed question has its own finite anchor identity.
All validation precedes output changes. Source revisions require fresh review.
"""
import gzip
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlsplit

MANIFEST = Path(__file__).with_suffix('.json')
ATI_COMMIT = '45fedca341497120651efa20e756b04a13e61089'
VRI_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
PROFILE = 'ati-kelly-milinda-v1'
PAGES = {
    '/tipitaka/kn/miln/miln.2x.kell': '44c59b3954ea8dd2b1966d5cd22f0836080b65fd351e474440a3b28dc1535dfd',
    '/tipitaka/kn/miln/miln.3x.kell': '5e0d563f4e3403167dbb73ec80190bdeb1592895d4af2e5141675692fec42fe5',
}
# Source/body identities were reviewed bilingually, including adjacent roots.
# The publisher's numbering is not the VRI numbering (notably II.1.14).
IDENTITIES = {
    'mil3.1.8': ('2', 'miln-2-1-08', 9, 0, 2, 5),
    'mil3.1.15': ('2', 'miln-2-1-14', 7, 0, 2, 4),
    'mil3.3.8': ('2', 'miln-2-3-08', 11, 0, 2, 7),
    'mil3.3.9': ('2', 'miln-2-3-9', 6, 0, 2, 5),
    'mil3.3.10': ('2', 'miln-2-3-10', 5, 0, 2, 4),
    'mil3.3.11': ('2', 'miln-2-3-11', 6, 0, 2, 5),
    'mil3.3.12': ('2', 'miln-2-3-12', 5, 0, 2, 4),
    'mil3.3.13': ('2', 'miln-2-3-13', 5, 0, 2, 4),
    'mil3.3.14': ('2', 'miln-2-3-14', 5, 0, 2, 4),
    'mil3.5.5': ('3', 'miln-3-5-05', 13, 2, 2, 4),
    'mil3.5.6': ('3', 'miln-3-5-06', 3, 1, 2, 3),
    'mil3.5.7': ('3', 'miln-3-5-07', 11, 0, 2, 4),
    'mil3.7.5': ('3', 'miln-3-7-05', 21, 1, 2, 5),
    'mil3.7.8': ('3', 'miln-3-7-08', 7, 0, 2, 3),
}
SECTION_FIELDS = {
    'version', 'status', 'unit_id', 'profile', 'anchor', 'heading',
    'paragraph_count', 'note_count', 'section_html_sha256', 'text_sha256',
    'notes_sha256', 'notice_sha256', 'pali_sha256', 'first_ref', 'last_ref',
    'source_commit',
}


def _hash(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def manifest_rows(manifest=MANIFEST):
    m = json.loads(Path(manifest).read_text(encoding='utf-8'))
    if (not isinstance(m, dict) or set(m) != {'version', 'ati_commit', 'vri_commit', 'links'}
            or type(m.get('version')) is not int or m['version'] != 1 or m.get('ati_commit') != ATI_COMMIT
            or m.get('vri_commit') != VRI_COMMIT or not isinstance(m.get('links'), list)
            or len(m['links']) != len(IDENTITIES)):
        raise ValueError('Invalid reviewed ATI section manifest')
    seen = set()
    for row in m['links']:
        if (not isinstance(row, dict) or set(row) != {
                'unit_id', 'path', 'anchor', 'english_title', 'source_reference',
                'translator', 'license', 'mapping_note', 'root',
                'source_html_sha256', 'untranslated_paratext', 'section'}):
            raise ValueError('Invalid reviewed ATI section row')
        uid = row.get('unit_id')
        identity = IDENTITIES.get(uid)
        section, root = row.get('section'), row.get('root')
        if not identity or uid in seen or not isinstance(section, dict) or not isinstance(root, dict):
            raise ValueError('Invalid or duplicate reviewed ATI section owner')
        page, anchor, paragraphs, notes, first, last = identity
        path = '/tipitaka/kn/miln/miln.' + page + 'x.kell'
        if (row.get('path') != path or row.get('anchor') != anchor
                or row.get('source_html_sha256') != PAGES[path]
                or row.get('translator') != 'John Kelly'
                or row.get('license') != 'Kelly-free-distribution-2005'
                or not all(isinstance(row.get(k), str) and row[k].strip() for k in ['mapping_note', 'source_reference', 'english_title'])
                or root.get('id') != uid or set(root) != {'id', 'title', 'vri', 'book', 'start', 'end', 'root_blocks_sha256'}
                or set(section) != SECTION_FIELDS or type(section.get('version')) is not int or section['version'] != 1
                or section.get('status') != 'reviewed' or section.get('unit_id') != uid
                or section.get('profile') != PROFILE or section.get('anchor') != anchor
                or section.get('source_commit') != VRI_COMMIT
                or section.get('heading') != row['source_reference']
                or type(section.get('paragraph_count')) is not int or section['paragraph_count'] != paragraphs
                or type(section.get('note_count')) is not int or section['note_count'] != notes
                or section.get('first_ref') != f'{uid}/{first}' or section.get('last_ref') != f'{uid}/{last}'
                or any(not isinstance(v, str) or not re.fullmatch(r'[a-f0-9]{64}', v) for v in
                       [root.get('root_blocks_sha256')] + [section.get(k) for k in ['section_html_sha256', 'text_sha256', 'notes_sha256', 'notice_sha256', 'pali_sha256']])):
            raise ValueError('Invalid finite reviewed ATI question profile')
        paratext = row.get('untranslated_paratext')
        expected_refs = ([f'{uid}/{last+1}', f'{uid}/{last+2}', f'{uid}/{last+3}']
                         if uid == 'mil3.3.14' else [f'{uid}/{last+1}'])
        if (not isinstance(paratext, list) or [p.get('ref') for p in paratext if isinstance(p, dict)] != expected_refs
                or any(not isinstance(p, dict) or set(p) != {'ref', 'text'} or not isinstance(p.get('text'), str) or not p['text'].strip() for p in paratext)):
            raise ValueError('Missing exact untranslated root paratext declaration')
        seen.add(uid)
    return m


def withhold_section_page_proposals(out, manifest=MANIFEST):
    paths = {r['path'] for r in manifest_rows(manifest)['links']}
    result, removed = {}, []
    for owner, links in out.items():
        kept = []
        for link in links:
            url = urlsplit(link.get('url', ''))
            known = ((link.get('source') == 'ati' and link.get('path') in paths)
                     or (url.hostname and url.hostname.removeprefix('www.') == 'accesstoinsight.org'
                         and url.path.removesuffix('.html') in paths))
            if known:
                removed.append({'unit_id': owner, 'url': link.get('url')})
            else:
                kept.append(link)
        if kept:
            result[owner] = kept
    return result, removed


def reviewed_section_links(canon, ati_root, manifest=MANIFEST):
    m = manifest_rows(manifest)
    if canon.get('source', {}).get('commit') != m['vri_commit']:
        raise ValueError('Reviewed ATI section canonical revision changed')
    units = {u['id']: u for u in canon['units']}
    accepted = {}
    for row in m['links']:
        unit, root = units.get(row['unit_id']), row['root']
        if (not unit or unit.get('approximate') or unit.get('kind') or unit.get('members')
                or unit.get('collection') != 'mil'
                or any(unit.get(k) != root.get(k) for k in ['id', 'title', 'vri', 'book', 'start', 'end'])):
            raise ValueError('Reviewed ATI section exact root identity changed')
        blocks = canon['books'][unit['book']]['blocks'][unit['start']:unit['end']]
        if _hash(blocks) != root['root_blocks_sha256']:
            raise ValueError('Reviewed ATI section complete root changed')
        accepted[unit['id']] = {
            'source': 'ati', 'path': row['path'],
            'url': 'https://accesstoinsight.org' + row['path'] + '.html#' + row['anchor'],
            'english': row['english_title'], 'translator': row['translator'], 'license': row['license'],
            'reference': row['source_reference'], 'match': 'reviewed-ati-section', 'mapping_note': row['mapping_note'],
            'review': {'ati_commit': m['ati_commit'], 'vri_commit': m['vri_commit'], 'source_html_sha256': row['source_html_sha256']},
            'section': row['section'],
        }
    verifier = Path(__file__).with_name('verify_section_html.mjs')
    result = subprocess.run(['node', str(verifier), str(manifest), str(ati_root)], capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        raise ValueError('Reviewed ATI section source/body/notes/notice/root verification failed: ' + result.stderr[-2000:])
    return accepted


def apply_reviewed_section_links(out, canon, ati_root, manifest=MANIFEST):
    accepted = reviewed_section_links(canon, ati_root, manifest)
    result, removed = withhold_section_page_proposals(out, manifest)
    for owner, link in accepted.items():
        result.setdefault(owner, []).append(link)
    return result, {'owners': list(accepted), 'page_bindings_replaced': removed}


if __name__ == '__main__':
    if len(sys.argv) != 5 or Path(sys.argv[2]).resolve() == Path(sys.argv[4]).resolve():
        raise SystemExit('Usage: reviewed_ati_sections.py CANON.gz TRANSLATIONS.json ATI-CHECKOUT OUTPUT.json')
    ci, ti, source, output = sys.argv[1:]
    canon = json.load(gzip.open(ci, 'rt', encoding='utf-8'))
    out, report = apply_reviewed_section_links(json.loads(Path(ti).read_text(encoding='utf-8')), canon, source)
    Path(output).write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(json.dumps(report))
