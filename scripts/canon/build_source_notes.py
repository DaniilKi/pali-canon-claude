#!/usr/bin/env python3
"""Reproduce one separately indexed original VRI edition note; standard library only.

Canonical source data is read and compared, never rewritten. Normal stdout is
one hash/count-only receipt, including under --verify; note wording stays in the
explicit registry artifact only.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

XML_SHA = 'ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
RECORD_SHA = '0d7ab15b095a5175742655a16b67fabf31ed47f73d10fe3de1c821eb1e2b11b7'
REGISTRY_SHA = '1cf2b14b514180ae5fffafdf44c2c19bd4c0e5a70ee0f02f0c4585ca3fc7493e'
REVISION = 'sariputta-note1130-v1'
SOURCE_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
RECORD_ID = 'vri:s0510m1:note-only:1130'


def sha(value):
    return hashlib.sha256(value.encode('utf8') if isinstance(value, str) else value).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def stable(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def artifact(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')


def strict_json(raw):
    def unique_object(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise ValueError('Duplicate JSON key in source-note input')
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=unique_object)


def visible(element):
    return (element.text or '') + ''.join(
        (visible(child) if child.tag not in ('note', 'pb') else '') + (child.tail or '')
        for child in element)


def old_book_blocks(root):
    """Independent replay of the unchanged five-field canonical book tuples."""
    norm = lambda value: re.sub(r'\s+', ' ', value).strip()
    elements = [e for e in root.iter() if e.tag in ('p', 'head', 'trailer')]
    blocks, skipped = [], []
    for physical, element in enumerate(elements):
        rend, number = element.get('rend'), element.get('n')
        body = '' if rend == 'hangnum' else norm(visible(element))
        if not body and rend != 'hangnum':
            skipped.append(physical)
            continue
        pages = {}
        for page in element.iter('pb'):
            pages.setdefault(page.get('ed'), []).append('.'.join(str(int(x)) for x in page.get('n').split('.')))
        blocks.append([rend, number, body, [norm(''.join(n.itertext())) for n in element.iter('note')], pages])
    assert len(elements) == 14646 and len(blocks) == 14645 and skipped == [1130], 'Original XML block inventory differs'
    return elements, blocks


def profile_for(record, manifest):
    location, commit = record['physical_location'], record['provenance']['commit']
    anchors = {}
    for name, selector in [('uid', {'uid': location['unit_id']}), ('book', {'book': location['book_id']})]:
        anchor = location[name + '_anchor']
        availability = {'total': 1, 'record_id': record['id'], 'anchor_ref': anchor['segment']['ref'],
                        'physical_location_only': True,
                        'read_with': {'tool': 'get_text', **selector, 'offset': anchor['offset'], 'limit': 1, 'source_commit': commit},
                        'widget_read_with': {'name': 'read_passage_widget', 'arguments': {**selector, 'segment': anchor['segment']['ref'], 'english': False, 'source_commit': commit}},
                        'scope': 'separately_indexed_original_edition_notes'}
        anchors[name] = {'selector': selector, 'segment': anchor['segment'], 'offset': anchor['offset'], 'availability': availability}
    return {'schema': manifest['envelope_schema'], 'extraction_revision': REVISION,
            'record_sha256': RECORD_SHA, 'registry_sha256': REGISTRY_SHA, 'record_id': RECORD_ID,
            'text_sha256': record['text_sha256'], 'source_commit': commit, 'record_keys': sorted(record),
            'max_record_characters': 8192, 'anchors': anchors}


def derive(xml_path, canon_path, manifest_path):
    manifest = strict_json(manifest_path.read_bytes())
    assert manifest['schema'] == 'vri-source-note-build-v1' and manifest['envelope_schema'] == 'vri-source-notes-v1'
    assert manifest['extraction_revision'] == REVISION and manifest['record_sha256'] == RECORD_SHA and manifest['registry_sha256'] == REGISTRY_SHA
    template = manifest['record_template']
    assert template['id'] == RECORD_ID and template['extraction_revision'] == REVISION and 'text' not in template
    raw = xml_path.read_bytes()
    assert sha(raw) == XML_SHA == manifest['xml_sha256'], 'Original XML bytes differ'
    elements, replayed = old_book_blocks(ET.fromstring(raw))
    origin = template['origin']; element = elements[origin['physical_element_zero_based']]
    assert origin['physical_element_zero_based'] == 1130 and element.tag == origin['element_tag'] == 'p'
    assert element.get('rend') == origin['element_rend'] == 'gatha1' and element.get('n') is None and origin['element_number'] is None
    assert not visible(element).strip() and not list(element.iter('pb')), 'This finite source element is not note-only'
    notes = list(element.iter('note'))
    assert len(notes) == 1 and origin['note_index_zero_based'] == 0
    note_text = ''.join(notes[0].itertext())
    assert sha(note_text) == template['text_sha256'], 'Original note wording differs'
    assert origin['raw_encoding'] == 'UTF-16LE' and raw[:2] == b'\xff\xfe'
    for proof in [{'raw_utf16le_byte_interval': origin['raw_byte_interval'], 'raw_element_sha256': origin['raw_element_sha256']}, *origin['raw_neighbors'].values()]:
        start, end = proof['raw_utf16le_byte_interval']
        assert sha(raw[start:end]) == proof['raw_element_sha256'], 'Original raw note/neighbor element differs'
    assert origin['raw_neighbors']['previous']['physical_element_zero_based'] == 1129
    assert origin['raw_neighbors']['following']['physical_element_zero_based'] == 1131
    record = {}
    for key, value in template.items():
        record[key] = value
        if key == 'label':
            record['text'] = note_text  # Restore the approved serialization position, not source wording.
    assert sha(stable(record)) == RECORD_SHA, 'Fixed source-note record differs'
    canon_bytes = canon_path.read_bytes()
    canon = strict_json(gzip.decompress(canon_bytes) if canon_bytes[:2] == b'\x1f\x8b' else canon_bytes)
    assert canon['source']['commit'] == SOURCE_COMMIT == manifest['vri_commit']
    assert {key: canon['source'][key] for key in record['provenance']} == record['provenance'], 'VRI provenance/terms differ'
    location = record['physical_location']
    books = [i for i, book in enumerate(canon['books']) if book['file'] == manifest['canonical_book_file'] == location['book_file']]
    assert len(books) == 1
    book_index = books[0]; blocks = canon['books'][book_index]['blocks']
    assert blocks == replayed and len(blocks) == manifest['canonical_book_blocks'] == 14645, 'Existing canonical book tuple differs'
    assert sha(compact(blocks)) == location['canonical_book_blocks_sha256']
    unit = next(u for u in canon['units'] if u['id'] == location['unit_id'])
    assert unit['id'] == 'tha-ap3' and unit['book'] == book_index and [unit['start'], unit['end']] == location['unit_block_span'] == [432, 1141]
    for side in ('previous', 'following'):
        assert sha(compact(blocks[location[side + '_block']])) == location[side + '_block_sha256']
    old = location['distinct_existing_373_note']
    assert sha(blocks[old['block']][3][old['note_index_zero_based']]) == old['text_sha256']
    for key in ('uid_anchor', 'book_anchor'):
        assert sha(compact(location[key]['segment'])) == location[key]['segment_sha256']
    registry = {'schema': 'vri-source-note-registry-v1', 'extraction_revision': REVISION, 'records': [record]}
    registry_bytes = artifact(registry)
    assert sha(registry_bytes) == REGISTRY_SHA, 'Registry artifact bytes differ'
    return registry_bytes, profile_for(record, manifest)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('xml', 'canon', 'manifest'):
        parser.add_argument('--' + name, type=Path, required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--output', type=Path)
    mode.add_argument('--verify', type=Path)
    parser.add_argument('--profile-output', type=Path, help='Optional generated browser-safe JS metadata, without duplicate note text')
    args = parser.parse_args()
    data, profile = derive(args.xml, args.canon, args.manifest)
    destination = args.output or args.verify
    inputs = {args.xml.resolve(), args.canon.resolve(), args.manifest.resolve()}
    assert destination.resolve() not in inputs, 'An input cannot be overwritten'
    if args.profile_output:
        assert args.profile_output.resolve() not in inputs, 'An input cannot be overwritten by generated metadata'
        assert args.profile_output.resolve() != destination.resolve(), 'Registry and generated metadata destinations must differ'
    if args.verify:
        assert args.verify.read_bytes() == data, 'Installed source-note artifact differs'
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(data)
    if args.profile_output:
        code = '/** One independently reviewed original-edition note. Metadata only; no duplicate note wording. */\n'
        code += 'const freeze = value => { if (value && typeof value === "object") { for (const child of Object.values(value)) freeze(child); Object.freeze(value); } return value; };\n'
        code += 'export const SOURCE_NOTES_PROFILE = freeze(' + json.dumps(profile, ensure_ascii=False, indent=2) + ');\n'
        args.profile_output.parent.mkdir(parents=True, exist_ok=True)
        args.profile_output.write_text(code, encoding='utf8')
    print(json.dumps({'status': 'SOURCE_NOTE_REPLAY_PASS', 'mode': 'verify' if args.verify else 'output',
                      'extraction_revision': REVISION, 'record_id': RECORD_ID, 'records': 1, 'note_count': 1,
                      'old_book_blocks_exact': 14645, 'xml_sha256': XML_SHA, 'record_sha256': RECORD_SHA,
                      'registry_sha256': REGISTRY_SHA, 'text_sha256': profile['text_sha256'],
                      'profile_metadata_sha256': sha(artifact(profile)), 'production_parser_imports': 0}, separators=(',', ':')))


if __name__ == '__main__':
    main()
