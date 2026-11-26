#!/usr/bin/env python3
"""Reproduce six already-reviewed source metadata objects with the stdlib only.

This is a reproducer, never a new approval. Text is derived from exact original
Markdown, not expected runtime/profile output. Full English bodies and notes
remain in memory; output contains only metadata, hashes and the chapter title.
"""
import argparse
import collections
import gzip
import hashlib
import json
import re
import time
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCOPE_SHA = '1312b094e9b7457c075c8cd082e3d69d53c5bf768be2052c93da77dc5211c4a3'
NORMAL_SHA = '0e0a929ff81f66dd2e6f86ae31953ca5451163c6581f260d4e4af6daa5b1b28f'
PRIOR_APPROVAL_SHA = '1b6f9cbbfb73855bdbee35e589530aaa69c0e2e0caebc61b3ace353ee02a0943'
SELECTED = [321, 323, 324, 325, 326, 329]
PAIR = re.compile(r'\[([^\[\]]+)\]\{\.diacritics data-state=on\}\[([^\[\]]+)\]\{\.no-diacritics data-state=off\}')
ESC = set('\\`*{}[]()#+.!_>-')


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode('utf-8')).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def utf16(value):
    return len(value.encode('utf-16-le')) // 2


def sealed(name, expected):
    data = (ROOT / 'docs/evidence/apadana' / name).read_bytes()
    assert sha(data) == expected, 'Pinned independent metadata changed: ' + name
    return json.loads(data)


def source_bytes(source, record):
    path = (source / record['path']).resolve()
    assert path.is_relative_to(source), 'Source path leaves its explicit external root'
    raw = path.read_bytes()
    assert len(raw) == record['bytes'] and sha(raw) == record['sha256']
    assert hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == record['git_blob_sha1']
    return raw


def xml_tuple(element):
    pages = {}
    def inner(node):
        text = node.text or ''
        for child in node:
            if child.tag == 'pb':
                number = '.'.join(str(int(v)) if v.isdigit() else v for v in child.attrib['n'].split('.'))
                pages.setdefault(child.attrib['ed'], []).append(number)
            elif child.tag != 'note':
                text += inner(child)
            text += child.tail or ''
        return text
    text = ' '.join(inner(element).split())
    kind, number = element.attrib.get('rend', element.tag), element.attrib.get('n')
    notes = [' '.join(''.join(note.itertext()).split()) for note in element.iter('note')]
    if kind == 'hangnum':
        assert re.fullmatch(r'\d+\.', text)
        number, text = text[:-1], ''
    return [kind, number, text, notes, pages]


def render(value, publisher, owner, allowed, observed):
    operations = collections.Counter()
    matches = list(PAIR.finditer(value))
    expected = allowed.get((publisher, owner))
    assert [(m[1], m[2]) for m in matches] == ([] if expected is None else
        [(p['on'], p['off']) for p in expected['exact_on_off_pairs']]), 'Unapproved state-pair owner'
    if expected is not None:
        assert len(matches) == expected['count']
        assert [sha(m[0]) for m in matches] == expected['source_token_sha256']
        observed.append((publisher, owner))
    value = PAIR.sub(lambda m: m[1], value)
    operations['finite_state_on_pairs'] = len(matches)
    assert not re.search(r'\{\.(?:no-)?diacritics\b', value)
    def abbreviation(match):
        operations['abbreviation_wrapper'] += 1
        return match[2]
    value = re.sub(r'<abbr title="(Buddha Jayanthi Tripitaka Series|Pali Text Society)">([^<>]+)</abbr>', abbreviation, value)
    assert '<' not in value and '>' not in value
    assert not re.search(r'&\S+;', value), 'These six sources do not require an entity grammar'
    def note(match):
        operations['source_note_marker'] += 1
        return '[Note ' + match[1] + ']'
    value = re.sub(r'\[\^(\d+)\]', note, value)
    characters, index = [], 0
    while index < len(value):
        if value[index] == '\\' and index + 1 < len(value) and value[index + 1] in ESC:
            characters.append(value[index + 1]); index += 2
            operations['markdown_escape'] += 1
        else:
            characters.append(value[index]); index += 1
    lines = []
    for line in ''.join(characters).splitlines():
        heading = re.match(r'^#{1,3}\s+', line)
        if heading:
            line = line[heading.end():]
            operations['heading_prefix'] += 1
        result, index = [], 0
        while index < len(line):
            if line[index] == '*':
                end = line.find('*', index + 1)
                assert end > index + 1, 'Unbalanced emphasis is not repaired'
                result.append(line[index + 1:end]); index = end + 1
                operations['balanced_emphasis_pair'] += 1
            else:
                result.append(line[index]); index += 1
        lines.append(''.join(result).rstrip(' \t'))
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip(), dict(operations)


def produce(source, canon_path, xml_path):
    started = time.monotonic()
    scope = sealed('THERA_321_329_SOURCE_SCOPES.json', SCOPE_SHA)
    independent = sealed('THERA_321_329_INDEPENDENT_NORMALIZATION.json', NORMAL_SHA)
    prior = sealed('THERA_321_329_INDEPENDENT_NOTICE_REVIEW.json', PRIOR_APPROVAL_SHA)
    assert prior['source_approval'] is prior['normalization_approval'] is True
    assert prior['runtime_reader_parser_approval'] is prior['activation_approval'] is False
    assert [p['publisher'] for p in scope['poems']] == SELECTED
    expectations = {r['canonical_owner']: r for r in independent['rows']}
    assert len(expectations) == 6 and independent['no_candidate_metadata_read_or_used'] is True
    packed = Path(canon_path).read_bytes()
    canon_raw = gzip.decompress(packed) if packed.startswith(b'\x1f\x8b') else packed
    assert sha(canon_raw) == scope['canonical_logical_sha256'] == '1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
    canon = json.loads(canon_raw)
    blocks, units = canon['books'][36]['blocks'], {u['id']: u for u in canon['units']}
    xml_raw = Path(xml_path).read_bytes()
    assert sha(xml_raw) == scope['original_xml_sha256'] == 'ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
    nodes = [n for n in ET.fromstring(xml_raw).iter() if n.tag in {'p', 'head', 'trailer'}]
    assert len(nodes) == 14646
    assert xml_tuple(nodes[1130]) == ['gatha1', None, '', ['imā dve gāthāyo syāmapotthake na santi'], {}]
    assert [xml_tuple(n) for i, n in enumerate(nodes) if i != 1130] == blocks
    assert len(blocks) == 14645
    assert len(scope['rights']) == 6
    for record in scope['rights']:
        source_bytes(source, record)
    inventory = scope['finite_pair_owner_inventory']
    allowed = {(r['publisher'], r['owner']): r for r in inventory}
    assert len(allowed) == 6 and sum(r['count'] for r in inventory) == 6
    observed, profiles, links, poems, combined = [], {}, {}, [], []
    for item in scope['poems']:
        assert time.monotonic() - started < 90, 'Bounded source derivation deadline'
        publisher, uid = item['publisher'], item['canonical_candidate']
        expected = expectations[uid]
        data = source_bytes(source, item['raw_artifact'])
        raw = data.decode('utf-8')
        assert not any(ord(c) > 0xFFFF for c in raw), 'The sealed pagination proofs use this BMP-only source domain'
        front = re.match(r'^---\ntitle: ([^\n]+)\norder: (\d+)\ncategory: chapter-3\n---\n', raw)
        assert front and front[1] == item['publisher_title'] and int(front[2]) == publisher
        definitions = list(re.finditer(r'^\[\^(\d+)\]:[ \t]*', raw, re.M))
        assert [int(m[1]) for m in definitions] == item['poem_note_numbers']
        original_paragraphs = re.split(r'\n[ \t]*\n', raw[front.end():definitions[0].start()].strip())
        paratext, paratext_proof = '', None
        if publisher == 321:
            heading = original_paragraphs.pop(0)
            assert heading == '## Ummāpupphiya Chapter, the Thirty-Third' and '[^' not in heading
            paratext, operations = render(heading, publisher, 'chapter-heading', allowed, observed)
            paratext_proof = {'role': 'publisher_chapter_heading', 'normalized_text': paratext,
                'sha256': sha(paratext), 'characters_utf16': utf16(paratext), 'raw_sha256': sha(heading),
                'note_numbers': [], 'presentation_operations': operations}
            assert paratext_proof == item['publisher_paratext'] == expected['publisher_paratext']
        else:
            assert item['publisher_paratext'] is None
            assert not any(p.startswith('## ') for p in original_paragraphs)
        assert original_paragraphs[0].startswith(f'### \\[{publisher}. ')
        assert original_paragraphs[-2].startswith('Thus indeed ') and original_paragraphs[-1].startswith('The legend of ')
        paragraphs = [render(p, publisher, 'body:' + str(i), allowed, observed)[0] for i, p in enumerate(original_paragraphs)]
        assert len(paragraphs) == item['body_paragraphs'] == item['physical_entries'] + 3
        text = '\n\n'.join(paragraphs)
        notes, note_proofs, note_owners = [], [], []
        for index, match in enumerate(definitions):
            number = int(match[1])
            end = definitions[index + 1].start() if index + 1 < len(definitions) else len(raw)
            original_note = raw[match.end():end]
            note_text = render(original_note, publisher, 'note:' + str(number), allowed, observed)[0]
            owners = [i for i, paragraph in enumerate(original_paragraphs) if '[^' + str(number) + ']' in paragraph]
            assert len(owners) == 1
            owner = {'kind': 'poem_title' if owners[0] == 0 else 'poem', 'paragraph_index': owners[0],
                'physical_entry': owners[0] if owners[0] > 0 else None}
            notes.append({'number': number, 'text': note_text})
            note_proofs.append({'number': number, 'sha256': sha(note_text), 'characters_utf16': utf16(note_text),
                'raw_sha256': sha(original_note.strip()), 'owner': owner})
            note_owners.append({'number': number, 'definition_line': raw[:match.start()].count('\n') + 1, 'owner': owner})
        assert note_owners == item['note_owners']
        assert sorted(int(n) for n in re.findall(r'\[\^(\d+)\]', '\n\n'.join(original_paragraphs))) == item['poem_note_numbers']
        layout, quotations, quotation_proofs, labels = [], [], [], []
        for i, paragraph in enumerate(paragraphs[1:-2], 1):
            clean = re.sub(r'\[Note \d+\]', '', paragraph).strip()
            suffix = re.search(r'\((\d+(?:-\d+)?)\) \[(\d+(?:-\d+)?)\]$', clean)
            assert suffix
            local, global_label = suffix[1], suffix[2]
            lo, hi = int(local.split('-')[0]), int(local.split('-')[-1])
            first, last = int(global_label.split('-')[0]), int(global_label.split('-')[-1])
            assert hi - lo == last - first and len(paragraph.splitlines()) == 4 * (hi - lo + 1)
            labels.extend(range(lo, hi + 1))
            if hi > lo:
                combined.append((publisher, i, local, global_label, len(paragraph.splitlines())))
            layout.append({'local_label': local, 'publisher_label': global_label, 'suffix': suffix[0], 'lines': len(paragraph.splitlines())})
            quotation = clean[:suffix.start()].strip()
            quotations.append(quotation)
            quotation_proofs.append({'physical_entry': i, 'sha256': sha(quotation), 'characters_utf16': utf16(quotation), 'body_paragraph': i})
        assert labels == list(range(1, item['printed_labels'] + 1))
        assert [int(layout[0]['publisher_label'].split('-')[0]), int(layout[-1]['publisher_label'].split('-')[-1])] == item['global_labels']
        unit = units[uid]
        assert unit['book'] == 36 and [unit['start'], unit['end']] == item['root_span']
        root_blocks = blocks[unit['start']:unit['end']]
        numbered = [int(b[1]) for b in root_blocks if b[0] == 'hangnum']
        assert numbered == item['vri_numbered_labels'] and len(numbered) == len(labels)
        root_sha = sha(compact({'id': uid, 'book': 36, 'start': unit['start'], 'end': unit['end'], 'blocks': root_blocks}))
        assert root_sha == item['root_sha256']
        mapping = ['Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Preserve independent VRI wording and explicit edition differences; matching ordinal labels are scope evidence, not word/line equivalence.',
            f'Full original publisher chapter-3 poem {publisher} narrative, title and both colophons, compared with original VRI XML and both canonical neighbors, identify {uid}; title and numbering alone do not establish the mapping.'] + item['edition_and_notes_caveats']
        url = item['raw_artifact']['url']
        profile = {'exact_ref_url': url, 'id': uid, 'publisher_chapter': 'chapter-3', 'poem': publisher,
            'verses': item['global_labels'], 'root_verses': [numbered[0], numbered[-1]],
            'note_count': len(notes), 'note_numbers': [n['number'] for n in notes], 'source': 'apadana',
            'path': f'/text/chapter-3/poem-{publisher}/', 'url': f'https://apadanatranslation.com/text/chapter-3/poem-{publisher}/',
            'raw_url': url, 'translator': 'Jonathan S. Walters', 'license': 'CC BY-NC-SA 4.0',
            'translation_revision': scope['publisher_revision'], 'title': front[1],
            'reference': f'Therā Apadāna publisher poem {publisher}; complete publisher-edition poem; original numbering retained',
            'raw_sha256': sha(data), 'body_sha256': sha(text), 'notes_sha256': sha(compact(notes)),
            'paratext_sha256': sha(paratext), 'root_sha256': root_sha, 'stanza_layout': layout}
        # Check independent original-first proofs only AFTER deriving every field.
        assert profile == expected['expected_profile_fields_except_mapping_notes']
        assert utf16(text) == expected['body_characters_utf16']
        assert [sha(p) for p in paragraphs] == expected['body_paragraph_sha256s']
        assert [utf16(p) for p in paragraphs] == expected['body_paragraph_characters_utf16']
        assert [len(p.splitlines()) for p in paragraphs] == expected['body_paragraph_lines']
        assert [{'number': p['number'], 'text_sha256': p['sha256'], 'characters_utf16': p['characters_utf16'], 'owner': p['owner']} for p in note_proofs] == expected['notes']
        assert [sha(q) for q in quotations] == expected['quotation_entries_sha256']
        assert [utf16(q) for q in quotations] == expected['quotation_entries_characters_utf16']
        assert [len(q.splitlines()) for q in quotations] == expected['quotation_entries_lines']
        assert sha('\n\n'.join(quotations)) == expected['quotation_text_sha256']
        assert mapping == expected['mandatory_editorial_scope_notices']
        profile['mapping_notes'] = mapping
        profiles[uid] = profile
        links[uid] = {**profile, 'english': front[1], 'match': 'individually-reviewed-whole-poem'}
        pages = [{'offset': offset, 'characters_utf16': utf16(text[offset:offset + 500]),
            'text_sha256': sha(text[offset:offset + 500]), 'prefix_sha256': sha(text[:offset + len(text[offset:offset + 500])])}
            for offset in range(0, len(text), 500)]
        poems.append({'id': uid, 'publisher_poem': publisher, 'source_path': item['raw_artifact']['path'],
            'raw_sha256': sha(data), 'raw_bytes': len(data), 'git_blob_sha1': item['raw_artifact']['git_blob_sha1'],
            'title': front[1], 'body_sha256': sha(text), 'body_characters_utf16': utf16(text),
            'body_paragraphs': [{'sha256': sha(p), 'characters_utf16': utf16(p), 'lines': len(p.splitlines())} for p in paragraphs],
            'notes_sha256': sha(compact(notes)), 'notes': note_proofs, 'note_numbers': profile['note_numbers'],
            'paratext_sha256': sha(paratext), 'publisher_paratext': paratext_proof, 'publisher_paratext_notes': [],
            'stanza_layout': layout, 'quotation_proofs': quotation_proofs, 'quotation_text_sha256': sha('\n\n'.join(quotations)),
            'pages500': pages, 'root': {'id': uid, 'book': 36, 'start': unit['start'], 'end': unit['end'],
                'title': unit['title'], 'vri': str(numbered[0]) + '–' + str(numbered[-1]), 'root_sha256': root_sha},
            'mapping_notes': mapping, 'chapter_summary': None, 'publisher_preface': None,
            'source_only_rights': 'Specific CC BY-NC-SA4.0 textual terms; no media approval.'})
    assert set(observed) == set(allowed) and len(observed) == len(allowed) == 6
    assert combined == [(324, 3, '3-4', '2843-2844', 8), (326, 1, '1-2', '2858-2859', 8), (329, 1, '1-2', '2898-2899', 8)]
    assert len(profiles) == 6 and sum(len(p['body_paragraphs']) for p in poems) == 56
    assert sum(len(p['stanza_layout']) for p in poems) == 38 and sum(len(p['notes']) for p in poems) == 28
    assert sum(len(p['pages500']) for p in poems) == 17
    goldens = {'schema': 'sourceA-six-normalization-goldens-v1', 'base_commit': scope['base_commit'],
        'publisher_revision': scope['publisher_revision'], 'vri_revision': scope['vri_revision'],
        'canonical_logical_sha256': scope['canonical_logical_sha256'], 'original_xml_sha256': scope['original_xml_sha256'],
        'all_original_xml_tuples': 14645, 'source_scope_sha256': SCOPE_SHA,
        'source_scope_binding_note': 'This binds SOURCE_A source scopes. Root may create an additive binding to independently approved B source facts; do not silently replace this authority.',
        'rights': scope['rights'], 'poems': poems,
        # Carried prior approval fact, verified by immutable notice above. This
        # reproducer neither issues nor broadens that prior source-only approval.
        'normalization_approval': prior['normalization_approval'], 'runtime_reader_activation_release_approval': False}
    return {'EXPECTED_PROFILES.json': profiles, 'EXPECTED_LINKS.json': links, 'GOLDENS.json': goldens}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'canon', 'xml', 'out'):
        parser.add_argument('--' + name, required=True, type=Path)
    args = parser.parse_args()
    source, out = args.source.resolve(), args.out.resolve()
    assert source.is_dir() and not out.exists(), 'Use an explicit source and a fresh output directory'
    assert ROOT != out and ROOT not in out.parents and source != out and source not in out.parents
    objects = produce(source, args.canon, args.xml)
    out.mkdir(parents=True)
    hashes = {}
    for name, value in objects.items():
        raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        (out / name).write_bytes(raw)
        hashes[name] = {'bytes': len(raw), 'sha256': sha(raw)}
    receipt = {'schema': 'six-source-metadata-reproduction-receipt-v1', 'producer_is_approval': False,
        'source_scope_sha256': SCOPE_SHA, 'independent_normalization_sha256': NORMAL_SHA,
        'prior_source_approval_sha256': PRIOR_APPROVAL_SHA, 'output': hashes,
        'runtime_reader_activation_release_approval': False, 'English_bodies_or_notes_written': False,
        'app_import_build_tests_Git_network': False}
    (out / 'REPRODUCTION_RECEIPT.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt))


if __name__ == '__main__':
    main()
