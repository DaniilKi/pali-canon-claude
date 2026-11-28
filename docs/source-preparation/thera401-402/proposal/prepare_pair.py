"""Own stdlib-only source preparation for literal publisher401/402; no SUT imports."""
import argparse
import collections
import gzip
import hashlib
import html
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

REV = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070'
CANON = '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'
XML_SHA = 'ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
PAIRS = [
    {'poem': 401, 'id': 'tha-ap403', 'title': 'Tissametteyya', 'PTS': 398,
     'printed': [3891, 3918], 'VRI': [1, 28], 'physical_stanzas': 28, 'notes': 19,
     'raw_bytes': 6387, 'raw_sha256': 'acd65e79f98f11239870504f054002cc440339a375e77033800649d99bf91bc9',
     'raw_git_blob': 'b90907423af09928dd3c661d1c1b60a08ff46a47',
     'bounds': [12892, 12980], 'chapter': '41. Metteyyavaggo',
     'subhead': '1. Tissametteyyattheraapadānaṃ', 'next': '2. Puṇṇakattheraapadānaṃ'},
    {'poem': 402, 'id': 'tha-ap404', 'title': 'Puṇṇaka', 'PTS': 399,
     'printed': [3919, 3934], 'VRI': [29, 44], 'physical_stanzas': 15, 'notes': 17,
     'raw_bytes': 5073, 'raw_sha256': '36ab4b64da98ca50626ff3f9c9d86fc34f53b1405b47ba2e9d60dda6a5d99740',
     'raw_git_blob': 'e536bf5a9f1691564458da49bc94023b2d0a6dbd',
     'bounds': [12980, 13028], 'chapter': None,
     'subhead': '2. Puṇṇakattheraapadānaṃ', 'next': '3. Mettaguttheraapadānaṃ'},
]
RIGHTS = {
    'LICENSE.md': [19093, '66eea18fe8cb99e0d178d838a4932be0d3af8a6f844e933a8bbb0054e22f2592'],
    'src/_pages/about.md': [12404, '17d8029419cd7b4c7f9e7f88d0127141d2425b3fe30516888b389ce7521f1352'],
    'src/_includes/site/footer.njk': [555, '08a7d4a0c3a9841afa38a8d98aa563e0ddedc6228f66e86b9a49d564aba26fd4'],
    'src/_includes/layouts/epub-metadata.xml': [603, '1a6320b1580b76112c63bd557e419d5816b410197da666444e9d412327430b2f'],
    'src/_data/site.json': [659, '6b4b5b5661b1bfb35cee0f207066fd6941aa042d6377993b02c77db677319efa'],
    'src/_poems/_poems.json': [135, '7c0d9a568ff9c495c89fb3ae13397ff71e8e1d678c221cca5966c9adc886cf22'],
}
H = lambda b: hashlib.sha256(b if isinstance(b, bytes) else b.encode('utf-8')).hexdigest()
J = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
U16 = lambda x: len(x.encode('utf-16-le')) // 2
BLOB = lambda x: hashlib.sha1(b'blob ' + str(len(x)).encode() + b'\0' + x).hexdigest()

GENERAL = ('Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. '
           'Whole-poem correspondence does not imply segment, line or word equivalence. Preserve independent '
           'VRI wording, variant notes and edition differences; do not invent missing words or transfer another poem’s refrain.')
NOTICES = {
    401: [
        GENERAL,
        'Publisher main PTS heading398, BJTS brace/file401 and canonical tha-ap403 are distinct literal identities. Chapter41, its first poem title, the Sobhita/fire/Padumuttara/fruit narrative and both colophons establish this particular correspondence; no general numbering rule is approved.',
        'The unnoted Metteyya chapter41 heading remains separate publisher paratext. Notes1–2 belong to the poem heading, notes3–19 remain poem-owned, and no chapter-summary or note-owning preface is invented.',
        'Retain all ten bracketed speaker-label lines and their original single-newline separators in local4,5,7,8,9,10,11,12,18,24. Those physical five-line entries contain a speaker label plus four translated verse lines; the labels are not numbering-only or missing-verse text.',
        'Retain Tissametteyya in the file title and Tissa-metteyya in the colophons and note2. Preserve the attributed SN reference, note4 hehi, note5 PTS/BJTS manuja/manuje and note6 deva te/devate alternatives; the independent VRI hohiti/hehiti variant and its other original note remain separate.',
        'This publisher poem prints28 stanzas with full final attainment refrains; this VRI unit also has28 numbered stanzas and full refrains. Equal counts do not prove word equivalence. Preserve the translator’s speaker assignments, bracketed supplements, lexical choices and note16 botanical spelling without harmonization.',
    ],
    402: [
        GENERAL,
        'Publisher main PTS heading399, BJTS brace/file402 and canonical tha-ap404 are distinct literal identities. Chapter41’s second title, the self-become Buddha’s illness/death, cremation and yakkha naming narrative,91-aeon statement and both colophons establish this particular correspondence; no general numbering rule is approved.',
        'Keep local4–5/global3922–3923 as one physical eight-line paragraph with its one original terminal range suffix. Both printed stanzas remain present; do not split, drop or silently renumber the paragraph.',
        'All17 original notes stay poem-owned: notes1–2 are attached to the poem heading and notes3–17 to their original stanzas. There is no chapter heading, chapter summary or transferred editorial note in this file.',
        'Retain source-note6’s BJTS wolf/compound qualification and its mixed quotation punctuation, note7 vyaggha/vālā alternatives, note13 yaṃ/taŋ variants and note15 divyamayo/dibbamayo wording. All six VRI variant-note records remain independent; no edition is silently selected to repair another.',
        'The publisher prints16 complete stanzas, including three full attainment refrains at local14–16, whereas VRI42–44 abbreviates those refrains with peyyāla. Do not expand VRI from the publisher, substitute a different refrain, or equate whole publisher coverage with line-complete VRI coverage.',
    ],
}
RULES = [
    ('Pandoc_diacritics_on', re.compile(r'\[([^\[\]]*)\]\{\.diacritics data-state=on\}\[([^\[\]]*)\]\{\.no-diacritics data-state=off\}'), lambda m: m[1]),
    ('abbreviation_display_label', re.compile(r'<abbr title="([^"]*)">([^<>]*)</abbr>'), lambda m: m[2]),
    ('numbered_note_call', re.compile(r'\[\^(\d+)\]'), lambda m: '[Note ' + m[1] + ']'),
    ('Markdown_heading_marker', re.compile(r'^#{2,3} ', re.M), lambda m: ''),
    ('Markdown_punctuation_escape', re.compile(r'\\([\\\x60*{}\[\]()#+.!_>\-])'), lambda m: m[1]),
    ('Markdown_single_emphasis', re.compile(r'\*([^*\n]+)\*'), lambda m: m[1]),
    ('Markdown_hardbreak_spaces', re.compile(r'[ \t]+(?=\n|$)'), lambda m: ''),
]

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--publisher-root', type=Path, required=True)
    ap.add_argument('--canon-data', type=Path, required=True)
    ap.add_argument('--vri-xml', type=Path, required=True)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args()
    assert not args.out.exists(), 'Fresh external output directory required'
    args.out.mkdir(parents=True)
    public, private = args.out / 'public', args.out / 'PRIVATE_DO_NOT_COMMIT'
    public.mkdir(); private.mkdir()
    reads = {}
    def read(path):
        path = path.absolute()
        assert path.is_file() and all(not p.is_symlink() for p in (path, *path.parents))
        path = path.resolve(strict=True)
        value = path.read_bytes()
        descriptor = {'file': str(path), 'bytes': len(value), 'sha256': H(value), 'git_blob_sha1': BLOB(value)}
        assert str(path) not in reads or reads[str(path)] == descriptor
        reads[str(path)] = descriptor
        return value
    def put(directory, name, value):
        raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
        path = directory / name
        with path.open('xb') as f:
            f.write(raw)
        path.chmod(0o600)
        return {'file': name, 'bytes': len(raw), 'sha256': H(raw)}
    rights = {}
    for name, (size, checksum) in RIGHTS.items():
        b = read(args.publisher_root / name)
        assert len(b) == size and H(b) == checksum, name
        rights[name] = reads[str((args.publisher_root / name).resolve())]
    assert b'Attribution-NonCommercial-ShareAlike 4.0' in read(args.publisher_root / 'LICENSE.md')
    for name in ['src/_pages/about.md', 'src/_includes/site/footer.njk', 'src/_includes/layouts/epub-metadata.xml']:
        assert b'creativecommons.org/licenses/by-nc-sa/4.0/' in read(args.publisher_root / name)
    manifest = json.loads(read(args.canon_data / 'canon.json.gz.parts.json'))
    assert manifest['version'] == 1
    packed = []
    for i, p in enumerate(manifest['parts'], 1):
        assert p['file'] == 'canon.json.gz.part-' + str(i).zfill(4)
        b = read(args.canon_data / p['file'])
        assert len(b) == p['size'] and H(b) == p['sha256']
        packed.append(b)
    packed = b''.join(packed)
    assert len(packed) == manifest['size'] and H(packed) == manifest['sha256']
    logical = gzip.decompress(packed)
    assert H(logical) == CANON
    canon = json.loads(logical)
    assert len(canon['books']) == 61 and len(canon['units']) == 8544 and canon['source']['commit'] == VRI
    xmlraw = read(args.vri_xml)
    assert H(xmlraw) == XML_SHA
    tree = ET.fromstring(xmlraw)
    events = [e for e in tree.iter() if e.tag in ('p', 'head', 'trailer')]
    assert len(events) == 14646
    def xml_tuple(e):
        notes, pages = [], {}
        def walk(n):
            text = n.text or ''
            for child in n:
                if child.tag == 'note':
                    notes.append(' '.join(''.join(child.itertext()).split()))
                elif child.tag == 'pb':
                    pages.setdefault(child.attrib['ed'], []).append('.'.join(str(int(x)) if x.isdigit() else x for x in child.attrib['n'].split('.')))
                else:
                    assert child.tag == 'hi', child.tag
                    text += walk(child)
                text += child.tail or ''
            return text
        kind, n = e.attrib.get('rend', e.tag), e.get('n')
        text = ' '.join(walk(e).split())
        if kind == 'hangnum':
            assert re.fullmatch(r'\d+\.', text)
            n, text = text[:-1], ''
        return [kind, n, text, notes, pages]
    original = [xml_tuple(e) for e in events]
    assert original[1130] == ['gatha1', None, '', ['imā dve gāthāyo syāmapotthake na santi'], {}]
    original.pop(1130)
    assert len(original) == 14645 and original == canon['books'][36]['blocks']
    def present(raw, owner):
        value, ledger, pairs = raw, [], []
        for rule, pattern, replace in RULES:
            before = value; chunks = []; changes = []; prev = 0; after_position = 0
            for m in pattern.finditer(before):
                if rule == 'Pandoc_diacritics_on':
                    assert m.groups() == ('c', 'ch')
                    pairs.append({'owner': owner, 'source_stage_start0': m.start(), 'source_stage_end_exclusive': m.end(),
                                  'state_on': m[1], 'state_off': m[2], 'raw_sha256': H(m[0])})
                if rule == 'abbreviation_display_label':
                    assert (m[1], m[2]) in [('Buddha Jayanthi Tripitaka Series', 'BJTS'), ('Pali Text Society', 'PTS')]
                shown = replace(m); unchanged = before[prev:m.start()]
                chunks.extend([unchanged, shown]); after_position += len(unchanged)
                changes.append((m.start(), m.end(), after_position, m[0], shown))
                after_position += len(shown); prev = m.end()
            chunks.append(before[prev:]); value = ''.join(chunks)
            replay = value
            for start, end, pos, raw_token, shown in reversed(changes):
                assert replay[pos:pos + len(shown)] == shown
                replay = replay[:pos] + raw_token + replay[pos + len(shown):]
            assert replay == before
            if changes:
                ledger.append({'rule': rule, 'count': len(changes), 'before_sha256': H(before), 'after_sha256': H(value),
                               'matched_replacement_pairs_sha256': H(J([[x[3], x[4]] for x in changes])),
                               'stage_positions': [[x[0], x[1]] for x in changes]})
        assert html.unescape(value) == value
        assert not re.search(r'<[^>]+>|\{\.(?:no-)?diacritics|\[\^\d+\]|\*|\\', value), owner
        assert all(ord(c) <= 65535 for c in value)
        return value, ledger, pairs
    profiles, links, bindings, golden, xml_checks, private_files = {}, {}, {}, {}, [], []
    totals = collections.Counter()
    for p in PAIRS:
        pub, uid = p['poem'], p['id']
        raw = read(args.publisher_root / f'src/_poems/chapter-3/poem-{pub}.md')
        assert (len(raw), H(raw), BLOB(raw)) == (p['raw_bytes'], p['raw_sha256'], p['raw_git_blob'])
        text = raw.decode('utf-8')
        assert '\r' not in text
        fm = re.match(r'^---\ntitle: ([^\n]+)\norder: (\d+)\ncategory: chapter-3\n---\n\n', text)
        assert fm and fm[1] == p['title'] and int(fm[2]) == pub
        first_def = re.search(r'^\[\^1\]: ', text, re.M)
        assert first_def
        rawmain = text[fm.end():first_def.start()].rstrip('\n')
        start_body = rawmain.index('### ')
        rawparatext = rawmain[:start_body].rstrip('\n')
        rawbody = rawmain[start_body:]
        assert (bool(rawparatext)) == (pub == 401)
        if rawparatext:
            assert rawparatext == '## Metteyya Chapter, the Forty-First' and '[^' not in rawparatext
        rawparas = rawbody.split('\n\n')
        assert len(rawparas) == p['physical_stanzas'] + 3
        assert rawparas[0].startswith('### ')
        colophon_name = 'Tissa-metteyya' if pub == 401 else 'Puṇṇaka'
        assert rawparas[-2:] == [f'Thus indeed Venerable {colophon_name} Thera spoke these verses.', f'The legend of {colophon_name} Thera is finished.']
        definitions = list(re.finditer(r'^\[\^(\d+)\]: ', text, re.M))
        assert [int(m[1]) for m in definitions] == list(range(1, p['notes'] + 1))
        assert collections.Counter(map(int, re.findall(r'\[\^(\d+)\]', rawbody))) == collections.Counter(range(1, p['notes'] + 1))
        body, body_ledger, pairs = present(rawbody, 'body')
        paratext, paratext_ledger, paratext_pairs = present(rawparatext, 'paratext')
        assert not paratext_pairs
        bodyparas = body.split('\n\n')
        notes, notes_meta, all_pairs = [], [], pairs[:]
        source_slices = [{'kind': 'frontmatter_and_separator', 'start': 0, 'end': fm.end(), 'raw': text[:fm.end()]}]
        if start_body:
            source_slices.append({'kind': 'paratext_with_separator', 'start': fm.end(), 'end': fm.end() + start_body, 'raw': text[fm.end():fm.end() + start_body]})
        source_slices.append({'kind': 'body_with_note_separator', 'start': fm.end() + start_body, 'end': first_def.start(), 'raw': text[fm.end() + start_body:first_def.start()]})
        for i, m in enumerate(definitions):
            end = definitions[i + 1].start() if i + 1 < len(definitions) else len(text)
            number = int(m[1]); content = text[m.end():end].rstrip('\n')
            shown, ledger, pair_rows = present(content, 'note:' + str(number))
            all_pairs.extend(pair_rows)
            owners = [j for j, paragraph in enumerate(rawparas) if f'[^{number}]' in paragraph]
            assert len(owners) == 1
            assert content.count('(') == content.count(')'), (pub, number)
            notes.append({'number': number, 'text': shown})
            notes_meta.append({'number': number, 'owner': 'body:' + str(owners[0]), 'owner_kind': 'poem_heading' if owners[0] == 0 else 'poem_stanza',
                               'raw_content_sha256': H(content), 'text_sha256': H(shown), 'characters_utf16': U16(shown),
                               'raw_definition_lines_inclusive': [text[:m.start()].count('\n') + 1, text[:end].rstrip('\n').count('\n') + 1],
                               'presentation_operations': ledger})
            source_slices.append({'kind': 'note_definition_with_separator', 'number': number, 'start': m.start(), 'end': end, 'raw': text[m.start():end]})
        assert ''.join(s['raw'] for s in source_slices) == text
        expected_pair_owners = collections.Counter({'note:7': 1}) if pub == 401 else collections.Counter({'note:4': 1, 'note:6': 3, 'note:17': 1})
        assert collections.Counter(row['owner'] for row in all_pairs) == expected_pair_owners
        layouts, quote_meta, quote_private, labels, local_labels, speakers = [], [], [], [], [], []
        for i, paragraph in enumerate(bodyparas[1:-2], 1):
            m = re.search(r'(\((\d+(?:-\d+)?)\) \[(\d+(?:-\d+)?)\])$', paragraph)
            assert m
            suffix, local, global_label = m[1], m[2], m[3]
            def expand(label):
                ends = list(map(int, label.split('-')))
                return list(range(ends[0], ends[-1] + 1))
            local_labels.extend(expand(local)); labels.extend(expand(global_label))
            quote = re.sub(r'\[Note \d+\]', '', paragraph[:-len(suffix)]).rstrip()
            lines = quote.splitlines()
            if pub == 401 and i in [4, 5, 7, 8, 9, 10, 11, 12, 18, 24]:
                assert len(lines) == 5
                assert lines[0] in ['[Padumuttara Buddha]:', '[Protagonist]:']
                speakers.append({'body_paragraph_index0': i, 'label_sha256': H(lines[0]), 'label_characters_utf16': U16(lines[0]),
                                 'following_separator': 'single_original_newline', 'physical_lines_with_label': 5})
            else:
                assert len(lines) == (8 if pub == 402 and i == 4 else 4)
            layouts.append({'local_label': local, 'publisher_label': global_label, 'suffix': suffix, 'lines': len(lines)})
            quote_meta.append({'physical_entry1': i, 'body_paragraph_index0': i, 'local_label': local, 'publisher_label': global_label,
                               'text_sha256': H(quote), 'characters_utf16': U16(quote), 'lines': len(lines), 'suffix_sha256': H(suffix),
                               'domain': 'Original physical paragraph, note-call markers and one terminal numeric suffix excluded; speaker labels, all other bracketed words and internal newlines retained.'})
            quote_private.append(quote)
        assert local_labels == list(range(1, p['printed'][1] - p['printed'][0] + 2))
        assert labels == list(range(p['printed'][0], p['printed'][1] + 1))
        assert len(speakers) == (10 if pub == 401 else 0)
        unit = next(u for u in canon['units'] if u['id'] == uid)
        assert unit['book'] == 36 and [unit['start'], unit['end']] == p['bounds']
        blocks = canon['books'][36]['blocks'][unit['start']:unit['end']]
        assert blocks[0][2] == (p['chapter'] or p['subhead'])
        assert blocks[1 if p['chapter'] else 0][2] == p['subhead']
        assert canon['books'][36]['blocks'][unit['end']][2] == p['next']
        assert [int(b[1]) for b in blocks if b[0] == 'hangnum'] == list(range(p['VRI'][0], p['VRI'][1] + 1))
        expected_title_piece = 'tissametteyyo' if pub == 401 else 'puṇṇako'
        assert expected_title_piece in blocks[-2][2]
        wrapper = {k: unit[k] for k in ['id', 'book', 'start', 'end']}; wrapper['blocks'] = blocks
        assert sum('…pe…' in row[2] for row in blocks) == (0 if pub == 401 else 3)
        url = f'https://raw.githubusercontent.com/apadana-translation/apadana-site/{REV}/src/_poems/chapter-3/poem-{pub}.md'
        profile = {'exact_ref_url': url, 'id': uid, 'publisher_chapter': 'chapter-3', 'poem': pub,
                   'verses': p['printed'], 'root_verses': p['VRI'], 'note_count': p['notes'],
                   'note_numbers': list(range(1, p['notes'] + 1)), 'source': 'apadana',
                   'path': f'/text/chapter-3/poem-{pub}/', 'url': f'https://apadanatranslation.com/text/chapter-3/poem-{pub}/',
                   'raw_url': url, 'translator': 'Jonathan S. Walters', 'license': 'CC BY-NC-SA 4.0',
                   'translation_revision': REV, 'title': p['title'],
                   'reference': f'Therā Apadāna publisher poem {pub}; complete publisher-edition poem; original numbering retained',
                   'raw_sha256': H(raw), 'body_sha256': H(body), 'notes_sha256': H(J(notes)),
                   'paratext_sha256': H(paratext), 'root_sha256': H(J(wrapper)), 'stanza_layout': layouts,
                   'mapping_notes': NOTICES[pub], 'publisher_verse_labels': [x['publisher_label'] for x in layouts],
                   'publisher_heading_sha256': H(bodyparas[0])}
        profiles[uid] = profile
        links[uid] = dict(profile, english=p['title'], match='PENDING_INDEPENDENT_SOURCE_REVIEW')
        prefix = ''; offset = 0; pages = []
        for start in range(0, U16(body), 500):
            page = body.encode('utf-16-le')[start * 2:(start + 500) * 2].decode('utf-16-le')
            assert offset == start
            pages.append({'offset': start, 'characters_utf16': U16(page), 'text_sha256': H(page), 'start_prefix_sha256': H(prefix),
                          'continuation_prefix_sha256': H(prefix + page), 'next_offset': start + U16(page) if start + U16(page) < U16(body) else None})
            prefix += page; offset += U16(page)
        assert prefix == body
        paragraph_meta = []; position = 0
        for i, (rawparagraph, paragraph) in enumerate(zip(rawparas, bodyparas)):
            paragraph_meta.append({'paragraph_index0': i, 'raw_sha256': H(rawparagraph), 'text_sha256': H(paragraph),
                                   'characters_utf16': U16(paragraph), 'lines': len(paragraph.splitlines()),
                                   'body_start_utf16': position, 'body_end_utf16': position + U16(paragraph),
                                   'original_note_numbers': list(map(int, re.findall(r'\[\^(\d+)\]', rawparagraph)))})
            position += U16(paragraph) + 2
        assert position - 2 == U16(body)
        private_lossless = put(private, f'poem-{pub}.lossless.json', {'DO_NOT_COMMIT': True, 'raw_sha256': H(raw), 'segments': source_slices,
                                    'exact_reconstruction_utf8_sha256': H(''.join(s['raw'] for s in source_slices))})
        private_rendered = put(private, f'poem-{pub}.presentation.json', {'DO_NOT_COMMIT': True, 'source_only_not_API_or_runtime_approval': True,
                                    'title': p['title'], 'text': body, 'translator_notes': notes, 'publisher_paratext': paratext, 'quotes': quote_private})
        private_files.extend([private_lossless, private_rendered])
        raw_pin = reads[str((args.publisher_root / f'src/_poems/chapter-3/poem-{pub}.md').resolve())]
        bindings[uid] = {'publisher_poem': pub, 'raw': raw_pin, 'root_record': unit, 'root_wrapper_sha256_JSON_stringify': H(J(wrapper)),
                         'physical_root_tuple_array_sha256_JSON_stringify': H(J(blocks)), 'physical_root_tuple_count': len(blocks),
                         'body_presentation_operations': body_ledger, 'paratext_presentation_operations': paratext_ledger,
                         'all_note_calls_and_definitions_owned_exactly_once': True, 'note_owners': notes_meta,
                         'display_pairs': all_pairs, 'speaker_labels': speakers, 'separate_summary': None,
                         'private_lossless_fixture': private_lossless, 'private_presentation_fixture': private_rendered}
        golden[uid] = {'publisher_poem': pub, 'title': p['title'], 'body_sha256': H(body), 'body_characters_utf16': U16(body),
                       'notes_sha256_JSON_stringify': H(J(notes)), 'note_numbers': profile['note_numbers'],
                       'note_owners': notes_meta, 'paratext_sha256': H(paratext), 'paratext_characters_utf16': U16(paratext),
                       'paratext_note_numbers': [], 'body_paragraphs': paragraph_meta, 'quotation_proofs': quote_meta,
                       'pages500': pages, 'root_wrapper_sha256_JSON_stringify': H(J(wrapper)),
                       'full_proposed_profile_sha256_JSON_stringify': H(J(profile)),
                       'full_pending_link_sha256_JSON_stringify': H(J(links[uid]))}
        xml_checks.append({'id': uid, 'canonical_block_range_half_open': p['bounds'], 'selected_XML_tuples_equal_all_five_fields': True,
                           'tuples': len(blocks), 'wrapper_sha256_JSON_stringify': H(J(wrapper)),
                           'original_note_rows': [{'relative_block': i, 'count': len(row[3]), 'sha256_JSON_stringify': H(J(row[3]))}
                                                  for i, row in enumerate(blocks) if row[3]], 'peyyala_stanza_count': sum('…pe…' in row[2] for row in blocks)})
        totals.update(poems=1, physical_stanzas=p['physical_stanzas'], numbered_stanzas=len(labels), notes=p['notes'],
                      body_paragraphs=len(bodyparas), hard500_pages=len(pages), display_pairs=len(all_pairs), speaker_labels=len(speakers))
    assert len(profiles) == 2 and totals['physical_stanzas'] == 43 and totals['numbered_stanzas'] == 44 and totals['notes'] == 36
    assert totals['body_paragraphs'] == 49 and totals['display_pairs'] == 6 and totals['speaker_labels'] == 10
    for name, obj in [('PROPOSED_PROFILES.json', profiles), ('PROPOSED_LINKS.json', links),
                      ('SOURCE_BINDINGS.json', {'schema': 'publisher401402-source-preparation-bindings-v1', 'status': 'PENDING_INDEPENDENT_REVIEW',
                       'publisher_revision_parent_authority': REV, 'VRI_revision_parent_authority': VRI,
                       'canonical_logical_sha256': CANON, 'literal_pairs': [[401, 'tha-ap403'], [402, 'tha-ap404']],
                       'entries': bindings, 'totals': dict(totals), 'source_preparation_only': True, 'runtime_API_activation_or_release_approval': False}),
                      ('SOURCE_DERIVED_GOLDENS.json', {'schema': 'source-derived401402-presentation-expectations-v1', 'status': 'PENDING_INDEPENDENT_REVIEW',
                       'hash_domain': 'UTF8 SHA256; *_JSON_stringify uses compact insertion-order JSON, literal Unicode; no normalization.',
                       'body_domain': 'Poem heading, original marked body and colophons; unnoted chapter heading is separate.',
                       'quote_domain': 'Physical entry with Note markers and terminal numeric suffix removed; speaker labels remain.',
                       'page_domain': 'Hard500 UTF16 body slices; no hidden trim or word boundary adjustment.', 'entries': golden, 'totals': dict(totals),
                       'proposed_API_hashes_not_API_approval': True}),
                      ('ORIGINAL_XML_REPLAY.json', {'schema': 'original-Book36-plus-selected-pair-replay-v1', 'XML_sha256': XML_SHA,
                       'all14645_retained_tuples_match_current_Book36': True, 'note_only_source_event1130_excluded_exactly': True,
                       'book_block_sha256_JSON_stringify': H(J(original)), 'rows': xml_checks, 'no_Pali_word_note_or_page_changes': True}),
                      ('REQUIRED_NOTICES.json', {'schema': 'publisher401402-required-notices-proposal-v1', 'status': 'PENDING_INDEPENDENT_REVIEW',
                       'translator': 'Jonathan S. Walters', 'publisher': 'Jonathan S. Walters and Whitman College',
                       'license': 'CC BY-NC-SA 4.0', 'license_url': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
                       'specific_rights_artifacts': rights, 'per_poem': {p['id']: NOTICES[p['poem']] for p in PAIRS},
                       'rights_scope': 'Retain attribution, source edition/revision, specific BY-NC-SA4 licence, change and warranty notices. Generic site BY4 metadata and public availability do not broaden translation reuse. No new commercial/media/publication approval.',
                       'presentation_changes': 'Only explicitly reverse-checked formatting conversions; words, punctuation, spelling, original note labels/ownership, line/stanza breaks, speaker assignments and colophons retained. No Unicode normalization or invented completion.'}),
                      ('INPUT_PINS.json', {'schema': 'publisher401402-physical-input-pins-v1', 'files': list(reads.values()),
                       'parent_pinned_revision_membership_inherited_not_queried': True, 'source_revision': REV, 'VRI_revision': VRI,
                       'actual_current_canonical_sha256': CANON, 'source_only': True}),
                      ('PRIVATE_INPUTS.json', {'DO_NOT_COMMIT': True, 'directory': '../PRIVATE_DO_NOT_COMMIT', 'files': private_files})]:
        put(public, name, obj)
    for record in reads.values():
        raw = Path(record['file']).read_bytes()
        assert len(raw) == record['bytes'] and H(raw) == record['sha256']
    put(public, 'REPLAY_RESULT.json', {'status': 'AUTHOR_STDLIB_SOURCE_DERIVATION_PASS_PENDING_INDEPENDENT_REVIEW',
        'totals': dict(totals), 'physical_inputs_unchanged_at_end': True, 'all14645_XML_tuples_equal': True,
        'reverse_checked_finite_presentation_only': True, 'app_parser_test_Git_network_or_proposed_module_execution': False,
        'no_checkout_or_runtime_writes': True, 'runtime_or_release_approval': False})
    print(json.dumps({'out': str(args.out), 'status': 'SOURCE_PREPARATION_PROPOSAL_ONLY', 'totals': dict(totals)}, sort_keys=True))

if __name__ == '__main__':
    main()

