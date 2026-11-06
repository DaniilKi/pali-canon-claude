"""Offline, metadata-only assessment of one pinned CBETA artifact. Never imports translations.

python3 scripts/translations/inspect_cbeta_khp.py /path/to/N26n0008.xml --report candidate.report.json
The source XML is deliberately not included in this repository. A successful structural check
does not approve rights, a translation, or an alignment; it never enables runtime retrieval.
"""
import argparse
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

SPEC = json.loads(Path(__file__).with_name('cbeta-khp-candidate.json').read_text(encoding='utf-8'))
NS = {'t': 'http://www.tei-c.org/ns/1.0', 'cb': 'http://www.cbeta.org/ns/1.0'}
XML_ID = '{http://www.w3.org/XML/1998/namespace}id'
CB_TYPE = '{http://www.cbeta.org/ns/1.0}type'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def label(element):
    return ' '.join(''.join(element.itertext()).split()) if element is not None else ''


def inspect_tree(root):
    """Check structure using headings/IDs, never a PTS page number as a canonical text ID."""
    require(root.get(XML_ID) == SPEC['source']['document_id'], 'Unexpected CBETA document ID')
    ids = [element.get(XML_ID) for element in root.iter() if element.get(XML_ID)]
    require(len(ids) == len(set(ids)), 'Ambiguous duplicate XML IDs')
    header = root.find('t:teiHeader', NS)
    require(header is not None, 'Missing original TEI header')
    require(label(header.find('.//t:author', NS)) == SPEC['source']['translator_as_printed'], 'Unexpected translator')
    require(label(header.find('.//t:sourceDesc/t:bibl', NS)) == SPEC['source']['edition'], 'Unexpected base edition')
    require(label(header.find('.//t:availability/t:p', NS)) == SPEC['rights']['artifact_condition'], 'Missing or changed header condition')
    require(label(header.find('.//t:publicationStmt/t:date', NS)) == SPEC['source']['header_publication_date'], 'Unexpected header date')
    sections = root.findall('./t:text/t:body/cb:div', NS)
    headings = [label(section.find('cb:mulu', NS)) for section in sections]
    require(headings == SPEC['section_headings'], 'Missing, duplicate, or reordered section headings')
    require(len(headings) == len(set(headings)), 'Ambiguous section headings')
    pts_three = [i for i, section in enumerate(sections, 1)
                 if any(ref.get('cRef') == 'PTS.Khp.3' for ref in section.findall('.//t:ref', NS))]
    require(pts_three == [5], 'PTS.Khp.3 must be a page reference in section 5, never text ID 3')
    notes = root.findall('./t:text/t:back//t:note', NS)
    candidates = []
    for spec in SPEC['candidates']:
        i = spec['section'] - 1
        section = sections[i]
        text_nodes = [node for node in section if node.tag in (f"{{{NS['t']}}}p", f"{{{NS['t']}}}lg")]
        if spec.get('heading_id'):
            marked = [j for j, node in enumerate(text_nodes) if node.get(XML_ID) == spec['heading_id']]
            require(len(marked) == 1, 'Missing or ambiguous first-section heading')
            start = marked[0]
            require(text_nodes[start].get(CB_TYPE) == 'head1' and label(text_nodes[start]) == headings[i], 'First-section heading does not match its contents entry')
            require([node.get(XML_ID) for node in text_nodes[:start]] == spec['excluded_preface_ids'], 'Unexpected material before the first section')
            selected = text_nodes[start + 1:]
        else:
            require(label(section.find('t:head', NS)) == headings[i], 'Section heading does not match its contents entry')
            selected = text_nodes
        require([node.get(XML_ID) for node in selected] == spec['content_ids'], 'Incomplete or changed section content boundaries')
        require(all(''.join(node.itertext()).strip() for node in selected), 'Empty selected source paragraph')
        anchors = [anchor for node in selected for anchor in node.findall('.//t:anchor', NS)]
        require([anchor.get(XML_ID) for anchor in anchors] == spec['note_anchor_ids'], 'Missing or changed source-note anchors')
        linked = []
        for anchor in anchors:
            target = '#' + anchor.get(XML_ID)
            matches = [note for note in notes if target in (note.get('target') or '').split()]
            require(len(matches) == 1, 'Missing or ambiguous linked source note')
            note = matches[0]
            require(note.get('n') == anchor.get('n') and note.get('type') == 'orig', 'Source-note identity changed')
            require(''.join(note.itertext()).strip(), 'Empty linked source note')
            linked.append({'target': target, 'number': note.get('n'), 'responsibility': note.get('resp'), 'type': note.get('type')})
        candidates.append({
            'canonical_id': spec['canonical_id'], 'citation': spec['citation'],
            'source_section': spec['section'], 'source_heading': headings[i],
            'content_xml_ids': spec['content_ids'], 'excluded_preface_xml_ids': spec['excluded_preface_ids'],
            'boundary': 'complete selected source paragraphs through the containing division end',
            'next_section_heading': headings[i + 1], 'linked_note_metadata': linked,
        })
    return {'document_id': root.get(XML_ID), 'candidate_boundaries': candidates, 'pts_khp_3_source_section': pts_three[0]}


def inspect_file(path):
    require(Path(path).stat().st_size == SPEC['source']['bytes'], 'Pinned CBETA artifact size mismatch')
    data = Path(path).read_bytes()
    require(len(data) == SPEC['source']['bytes'], 'Pinned CBETA artifact size mismatch')
    git_hash = hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\0' + data).hexdigest()
    require(git_hash == SPEC['source']['git_blob_sha1'] and hashlib.sha256(data).hexdigest() == SPEC['source']['sha256'], 'Pinned CBETA artifact hash mismatch')
    result = inspect_tree(ET.fromstring(data))
    start = data.index(b'<teiHeader>')
    end = data.index(b'</teiHeader>', start) + len(b'</teiHeader>')
    return {
        'status': 'structural_assessment_only_not_approved', 'source': SPEC['source'],
        'original_header_sha256': hashlib.sha256(data[start:end]).hexdigest(),
        'rights': SPEC['rights'], 'gates': SPEC['gates'], **result,
        'translation_text_exported': False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('xml', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if args.report and (args.report.resolve() == args.xml.resolve() or
                        (args.report.exists() and args.xml.exists() and args.report.samefile(args.xml))):
        parser.error('The report must use a different file from the original source XML')
    if args.report:
        args.report.write_text(json.dumps({'status': 'running'}) + '\n', encoding='utf-8')
    try:
        result = inspect_file(args.xml)
    except Exception as error:
        if args.report:
            args.report.write_text(json.dumps({'status': 'rejected', 'error': str(error)}) + '\n', encoding='utf-8')
        raise
    output = json.dumps(result, ensure_ascii=True, indent=2) + '\n'
    if args.report:
        args.report.write_text(output, encoding='utf-8')
    print(output, end='')


if __name__ == '__main__':
    main()
