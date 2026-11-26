#!/usr/bin/env python3
"""Reproduce metadata-only normalization for eight source-reviewed poems.

This producer is not an approval. Independent original-first normalization,
runtime and reader reviews are separate gates. English remains in memory only.
"""
import argparse
import gzip
import hashlib
import html
import json
import re
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SCOPE_SHA = '29eb74b6f831840adddbc215727fd35002d7909e6fc6a7e35d891667df4a25ae'
EMPTY_SHA = hashlib.sha256(b'').hexdigest()


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode('utf-8')).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')


def utf16(value):
    return len(value.encode('utf-16-le')) // 2


def normalized(value, *, html_pairs=0):
    token = '<span class="diacritics" data-state="on">c</span><span class="no-diacritics" data-state="off">ch</span>'
    assert value.count(token) == html_pairs, 'Only two note-owned c/ch pairs are approved'
    value = value.replace(token, 'c')
    value = re.sub(r'\[([^\[\]]*)\]\{\.diacritics data-state=on\}\[([^\[\]]*)\]\{\.no-diacritics data-state=off\}', r'\1', value)
    assert not re.search(r'\{\.(?:no-)?diacritics\b', value)
    value = re.sub(r'\[\^(\d+)\]', r'[Note \1]', value)
    value = re.sub(r'<abbr title="[^"]*">([^<>]*)</abbr>', r'\1', value)
    assert not re.search(r'[<>]', value), 'Unreviewed HTML is not a rendering rule'
    value = html.unescape(value)
    value = re.sub(r'\\([\\`*{}\[\]()#+.!_>\-])', r'\1', value)
    value = re.sub(r'^#{1,3}\s+', '', value, flags=re.M)
    value = re.sub(r'\*([^*\n]+)\*', r'\1', value)
    value = re.sub(r'[ \t]+\n', '\n', value)
    return re.sub(r'\n{3,}', '\n\n', value).strip()


def xml_inner(element):
    return (element.text or '') + ''.join(('' if child.tag in {'note', 'pb'} else xml_inner(child)) + (child.tail or '') for child in element)


def xml_tuple(element):
    text = ' '.join(xml_inner(element).split())
    kind, number = element.attrib.get('rend', ''), element.attrib.get('n')
    notes = [' '.join(''.join(n.itertext()).split()) for n in element.iter('note')]
    pages = {}
    for page in element.iter('pb'):
        number_string = '.'.join(str(int(n)) for n in page.attrib['n'].split('.'))
        pages.setdefault(page.attrib['ed'], []).append(number_string)
    if kind == 'hangnum':
        assert re.fullmatch(r'\d+\.', text)
        number, text = text[:-1], ''
    return [kind, number, text, notes, pages]


def produce(source, canon_path, xml_path):
    scope_file = ROOT / 'docs/evidence/apadana/THERA_312_319_SOURCE_SCOPES_V2.json'
    assert sha(scope_file.read_bytes()) == SCOPE_SHA
    scopes = json.loads(scope_file.read_text())
    raw = Path(canon_path).read_bytes()
    if raw.startswith(b'\x1f\x8b'):
        raw = gzip.decompress(raw)
    assert sha(raw) == scopes['canonical_logical_sha256']
    canon = json.loads(raw)
    blocks = canon['books'][36]['blocks']
    xml = Path(xml_path).read_bytes()
    assert sha(xml) == scopes['original_xml_sha256']
    nodes = [n for n in ET.fromstring(xml).iter() if n.tag in {'p', 'head', 'trailer'}]
    assert len(nodes) == 14646 and xml_tuple(nodes[1130]) == ['gatha1', None, '', ['imā dve gāthāyo syāmapotthake na santi'], {}]
    assert [xml_tuple(n) for i, n in enumerate(nodes) if i != 1130] == blocks
    for artifact in scopes['rights']:
        data = (Path(source) / artifact['path']).read_bytes()
        assert sha(data) == artifact['sha256'] and len(data) == artifact['bytes']
        assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == artifact['git_blob_sha1']
    profiles, links, goldens = {}, {}, []
    for expected in scopes['poems']:
        pub, uid = expected['publisher'], expected['canonical_candidate']
        artifact = expected['raw_artifact']
        data = (Path(source) / artifact['path']).read_bytes()
        assert sha(data) == artifact['sha256'] and len(data) == artifact['bytes']
        assert hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest() == artifact['git_blob_sha1']
        raw = data.decode('utf-8')
        front = re.match(r'^---\ntitle: ([^\n]+)\norder: (\d+)\ncategory: chapter-3\n---\n', raw)
        assert front and front[1] == expected['publisher_title'] and int(front[2]) == pub
        rest = raw[front.end():].strip()
        cut = re.search(r'^\[\^\d+\]:', rest, re.M)
        assert cut
        body_raw, definitions = rest[:cut.start()].strip(), rest[cut.start():]
        paragraphs = [normalized(part) for part in re.split(r'\n\s*\n', body_raw)]
        assert len(paragraphs) == expected['body_paragraphs'] == expected['physical_entries'] + 3
        assert paragraphs[0].startswith(f'[{pub}. ') and len(paragraphs[-1].splitlines()) == len(paragraphs[-2].splitlines()) == 1
        notes, note_proofs = [], []
        for match in re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)', definitions, re.M | re.S):
            number = int(match[1])
            text = normalized(match[2], html_pairs=2 if pub == 312 and number == 3 else 0)
            notes.append({'number': number, 'text': text})
            note_proofs.append({'number': number, 'sha256': sha(text), 'characters_utf16': utf16(text), 'raw_sha256': sha(match[2].strip()), 'owner': 'poem_title' if number == 1 else 'poem'})
        assert [n['number'] for n in notes] == expected['poem_note_numbers']
        assert sorted(int(n) for n in re.findall(r'\[\^(\d+)\]', body_raw)) == expected['poem_note_numbers']
        layout, quotation_proofs = [], []
        for i, paragraph in enumerate(paragraphs[1:-2], 1):
            suffix = re.search(r'\((\d+)(?:-(\d+))?\) \[(\d+)(?:-(\d+))?\]$', paragraph)
            assert suffix
            lo, hi = int(suffix[1]), int(suffix[2] or suffix[1])
            first, last = int(suffix[3]), int(suffix[4] or suffix[3])
            assert hi - lo == last - first and len(paragraph.splitlines()) == 4 * (hi - lo + 1)
            row = {'local_label': str(lo) if hi == lo else f'{lo}-{hi}', 'publisher_label': str(first) if last == first else f'{first}-{last}', 'suffix': suffix[0], 'lines': len(paragraph.splitlines())}
            layout.append(row)
            quotation = re.sub(r'\[Note \d+\]', '', paragraph[:-len(suffix[0])]).rstrip()
            quotation_proofs.append({'physical_entry': i, 'sha256': sha(quotation), 'characters_utf16': utf16(quotation), 'body_paragraph': i})
        labels = [n for row in layout for n in range(int(row['local_label'].split('-')[0]), int(row['local_label'].split('-')[-1]) + 1)]
        assert labels == list(range(1, expected['printed_labels'] + 1))
        assert [int(layout[0]['publisher_label'].split('-')[0]), int(layout[-1]['publisher_label'].split('-')[-1])] == expected['global_labels']
        unit = next(u for u in canon['units'] if u['id'] == uid)
        assert [unit['start'], unit['end']] == expected['root_span'] and unit['book'] == 36
        root_sha = sha(compact({'id': uid, 'book': 36, 'start': unit['start'], 'end': unit['end'], 'blocks': blocks[unit['start']:unit['end']]}))
        assert root_sha == expected['root_sha256']
        numbers = [int(b[1]) for b in blocks[unit['start']:unit['end']] if b[0] == 'hangnum']
        assert numbers == expected['vri_numbered_labels'] and len(numbers) == len(labels)
        body = '\n\n'.join(paragraphs)
        mapping = ['Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Preserve independent VRI wording and explicit edition differences; matching ordinal labels are scope evidence, not word/line equivalence.', f'Full original publisher chapter-3 poem {pub} narrative, title and both colophons, compared with original VRI XML and both canonical neighbors, identify {uid}; title and numbering alone do not establish the mapping.'] + expected['edition_and_notes_caveats']
        url = artifact['url']
        profile = {'exact_ref_url': url, 'id': uid, 'publisher_chapter': 'chapter-3', 'poem': pub, 'verses': expected['global_labels'], 'root_verses': [numbers[0], numbers[-1]], 'note_count': len(notes), 'note_numbers': [n['number'] for n in notes], 'source': 'apadana', 'path': f'/text/chapter-3/poem-{pub}/', 'url': f'https://apadanatranslation.com/text/chapter-3/poem-{pub}/', 'raw_url': url, 'translator': 'Jonathan S. Walters', 'license': 'CC BY-NC-SA 4.0', 'translation_revision': scopes['publisher_revision'], 'title': front[1], 'reference': f'Therā Apadāna publisher poem {pub}; complete publisher-edition poem; original numbering retained', 'raw_sha256': sha(data), 'body_sha256': sha(body), 'notes_sha256': sha(compact(notes)), 'paratext_sha256': EMPTY_SHA, 'root_sha256': root_sha, 'stanza_layout': layout, 'mapping_notes': mapping}
        profiles[uid] = profile
        links[uid] = {**profile, 'english': front[1], 'match': 'individually-reviewed-whole-poem'}
        goldens.append({'id': uid, 'publisher_poem': pub, 'source_path': artifact['path'], 'raw_sha256': sha(data), 'raw_bytes': len(data), 'git_blob_sha1': artifact['git_blob_sha1'], 'title': front[1], 'body_sha256': sha(body), 'body_characters_utf16': utf16(body), 'body_paragraphs': [{'sha256': sha(p), 'characters_utf16': utf16(p), 'lines': len(p.splitlines())} for p in paragraphs], 'notes_sha256': sha(compact(notes)), 'notes': note_proofs, 'note_numbers': [n['number'] for n in notes], 'paratext_sha256': EMPTY_SHA, 'stanza_layout': layout, 'quotation_proofs': quotation_proofs, 'root': {**unit, 'root_sha256': root_sha}, 'mapping_notes': mapping, 'chapter_summary': None, 'publisher_preface': None, 'source_only_rights': 'Specific CC BY-NC-SA 4.0 textual terms; no media approval.'})
    assert len(profiles) == 8
    assert sum(len(p['body_paragraphs']) for p in goldens) == 73
    assert sum(len(p['stanza_layout']) for p in goldens) == 49
    assert sum(len(p['notes']) for p in goldens) == 34
    return {'EXPECTED_PROFILES.json': profiles, 'EXPECTED_LINKS.json': links, 'GOLDENS.json': {'schema': 'candidate-eight-source-normalization312-319-v1', 'base_commit': scopes['base_commit'], 'publisher_revision': scopes['publisher_revision'], 'vri_revision': scopes['vri_revision'], 'canonical_logical_sha256': scopes['canonical_logical_sha256'], 'original_xml_sha256': scopes['original_xml_sha256'], 'source_scope_sha256': SCOPE_SHA, 'all_original_xml_tuples': 14645, 'rights': scopes['rights'], 'poems': goldens, 'normalization_approval': False, 'runtime_approval': False, 'release_approval': False}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ['source', 'canon', 'xml', 'out']:
        parser.add_argument('--' + flag, required=True)
    args = parser.parse_args()
    out = Path(args.out).resolve()
    assert not out.exists(), 'Use a fresh output directory; preserve earlier receipts'
    assert out != ROOT and ROOT not in out.parents
    objects = produce(args.source, args.canon, args.xml)
    out.mkdir(parents=True)
    hashes = {}
    for name, obj in objects.items():
        data = (json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        (out / name).write_bytes(data)
        hashes[name] = sha(data)
    print(json.dumps({'status': 'CANDIDATE_METADATA_ONLY', 'files': hashes, 'full_English_payload_files': 0, 'full_Pali_payload_files': 0, 'independent_normalization_approval': False}))


if __name__ == '__main__':
    main()
