"""Independent stdlib original-source parity and finite 141-record screen.

No project imports, app execution, network, repair, or translation activation.
Only this script's directory receives new evidence artifacts (exclusive writes).
"""
import collections
import gzip
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

D = Path(__file__).resolve().parent
BASE = D.parent / 'baseline-input/canon.json.gz'
PRIOR = Path('/tmp/pali-four-english-evidence-nov26/next-boundary-systemic-screen')
H = lambda raw: hashlib.sha256(raw if isinstance(raw, bytes) else raw.encode('utf8')).hexdigest()
C = lambda obj: json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
J = lambda obj: H(C(obj))
B = lambda raw: hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest()
prior_files = sorted(p for p in PRIOR.iterdir() if p.is_file())
prior_hashes = {p.name: H(p.read_bytes()) for p in prior_files}
assert prior_hashes['SCREEN_REPORT.json'] == '87795d9eb1abfbcf8403b3e3487c6aa5ea13d6ff2d7095ceac279d0ddd364f50'
assert prior_hashes['screen_boundaries.py'] == 'd0825ca811d2833c802c3af0ab94655afc1dfa31246345192cfa048cc9f5faf1'
raw = (D / 's0510m2.mul.xml').read_bytes()
assert len(raw) == 1779576
assert H(raw) == '23e0721c8fe05a6105b56b627ac38291d10e0eab799a082c257466603f0839a1'
assert B(raw) == 'c2a96aed52fb5de3e7fe66442633e5f045cf5bdf'
packed = BASE.read_bytes()
canonical_raw = gzip.decompress(packed)
assert H(canonical_raw) == '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8'
canon = json.loads(canonical_raw)
assert canon['source']['commit'] == '2d134ff9ef60f70a1eb03c9370580228811a3070'
assert canon['books'][37]['file'] == 's0510m2.mul.xml'

# ElementTree, independently of the application's regex parser. Visible text
# excludes notes/page breaks/printed ordinal markup but retains element tails.
def visible(element):
    text = element.text or ''
    for child in element:
        if child.tag not in ('note', 'pb') and not (child.tag == 'hi' and child.get('rend') in ('paranum', 'dot')):
            text += visible(child)
        text += child.tail or ''
    return text

collapse = lambda text: re.sub(r'\s+', ' ', text).strip()
physical = [e for e in ET.fromstring(raw).iter() if e.tag in ('p', 'head', 'trailer')]
blocks, omitted = [], []
for physical_index, element in enumerate(physical):
    text, number = collapse(visible(element)), element.get('n')
    if not text and not number:
        omitted.append(physical_index)
        continue
    pages = {}
    for pb in element.iter('pb'):
        pages.setdefault(pb.get('ed'), []).append('.'.join(str(int(part)) for part in pb.get('n').split('.')))
    blocks.append([element.get('rend') or ('centre' if element.tag == 'trailer' else 'bodytext'), number, text,
                   [collapse(''.join(note.itertext())) for note in element.iter('note')], pages])
assert len(physical) == 10673 and omitted == [8858] and len(blocks) == 10672
assert J(blocks) == 'bd0177c2025298415abd2e90e1d576d2418127e08ce339699ad725960089f8cc'
assert blocks == canon['books'][37]['blocks']

all_thera = [u for u in canon['units'] if re.fullmatch(r'tha-ap\d+', u['id'])]
units = sorted([u for u in all_thera if u['book'] == 37], key=lambda u: u['start'])
assert len(all_thera) == 563 and len(units) == 141
assert {u['id'] for u in units} == {'tha-ap' + str(n) for n in range(423, 564)}
assert all(a['end'] == b['start'] for a, b in zip(units, units[1:]))
assert (units[0]['start'], units[-1]['end']) == (1, 6532)
heading_re = re.compile(r'^(\d+(?:-\d+)?)\.\s*(.+[aā]padānaṃ?)$')
all_headings = []
for i, row in enumerate(blocks):
    match = heading_re.fullmatch(row[2]) if row[0] == 'subhead' else None
    if match:
        all_headings.append({'block': i, 'label': match[1], 'title': match[2]})
headings = [h for h in all_headings if units[0]['start'] <= h['block'] < units[-1]['end']]
assert len(all_headings) == 181 and len(headings) == 141
# The other forty source poem headings are outside the Therā metadata range.
# They are not screened or assigned identities by this task.
norm = lambda s: s.removesuffix('ṃ')
def info(h):
    return {'block': h['block'], 'printed_label': h['label'], 'title_sha256': H(h['title']),
            'source_tuple_sha256': J(blocks[h['block']])}

records, flags = [], []
for k, unit in enumerate(units):
    inside = [h for h in headings if unit['start'] <= h['block'] < unit['end']]
    matches = [h for h in inside if norm(h['title']) == norm(unit['title'])]
    previous = next((h for h in reversed(headings) if h['block'] < unit['start']), None)
    record = {'id': unit['id'], 'book': 37, 'current_start': unit['start'], 'current_end': unit['end'],
              'current_vri': unit.get('vri'), 'record_sha256': J(unit), 'metadata_title_sha256': H(unit['title']),
              'index_revision': unit.get('index_revision'), 'numbered_headings_inside': [info(h) for h in inside]}
    record['has_additional_numbered_heading'] = len(inside) > 1
    if len(matches) == 1:
        record.update(classification='OWN_HEADING_INSIDE', own_heading=info(matches[0]))
    elif not matches and previous and norm(previous['title']) == norm(unit['title']):
        left = units[k - 1] if k else None
        cut = previous['block']
        prefix = blocks[cut:unit['start']]
        checks = {
            'neighbor_end_equals_current_start': bool(left and left['end'] == unit['start']),
            'heading_owned_by_immediate_left': bool(left and left['start'] <= cut < left['end']),
            'four_blocks_before_current_start': unit['start'] - cut == 4,
            'prefix_exact_subhead_hangnum_gatha1_gathalast': [b[0] for b in prefix] == ['subhead', 'hangnum', 'gatha1', 'gathalast'],
            'previous_speaker_and_closing_colophon_kinds': cut >= 2 and [b[0] for b in blocks[cut - 2:cut]] == ['bodytext', 'centre'],
            'previous_speaker_formula': cut >= 2 and blocks[cut - 2][2].endswith('imā gāthāyo abhāsitthāti.'),
            'previous_closing_colophon_apadana': cut >= 1 and 'padānaṃ ' in blocks[cut - 1][2],
            'first_marker_empty_and_numbered': bool(len(prefix) > 1 and prefix[1][1] and not prefix[1][2]),
            'current_start_is_next_hangnum': blocks[unit['start']][0] == 'hangnum' and bool(blocks[unit['start']][1]),
            'consecutive_first_two_printed_stanzas': bool(len(prefix) > 1 and str(prefix[1][1]).isdigit() and str(blocks[unit['start']][1]).isdigit() and int(blocks[unit['start']][1]) == int(prefix[1][1]) + 1),
        }
        record.update(classification='OWN_MATCHING_HEADING_BEFORE_CURRENT_START', previous_heading=info(previous),
                      left_neighbor=left['id'] if left else None, candidate_source_heading=cut,
                      strong_four_block_signature=all(checks.values()), signature_checks=checks,
                      source_prefix_sha256=J(prefix),
                      first_printed_stanza={'vri': prefix[1][1] if len(prefix) > 1 else None,
                                            'source_blocks': [cut + 1, unit['start']],
                                            'body_sha256': H('\n'.join(b[2] for b in prefix[2:]))},
                      current_first_printed_stanza=blocks[unit['start']][1],
                      preceding_speaker_sha256=H(blocks[cut - 2][2]), preceding_colophon_sha256=H(blocks[cut - 1][2]))
        flags.append(record)
    else:
        record.update(classification='UNMATCHED_OR_AMBIGUOUS_LOCAL_TITLE',
                      heading_exactly_at_start=next((info(h) for h in inside if h['block'] == unit['start']), None))
    records.append(record)
counts = dict(collections.Counter(r['classification'] for r in records))
assert counts == {'OWN_HEADING_INSIDE': 113, 'OWN_MATCHING_HEADING_BEFORE_CURRENT_START': 27, 'UNMATCHED_OR_AMBIGUOUS_LOCAL_TITLE': 1}
lexical = [r for r in records if r['classification'] == 'UNMATCHED_OR_AMBIGUOUS_LOCAL_TITLE']
assert [r['id'] for r in lexical] == ['tha-ap471'] and lexical[0]['heading_exactly_at_start']
# Adjacent chains may each contain only the NEXT unit's heading. Cross-check
# heading ownership directly, rather than relying only on extra-heading count.
owners = []
for flag in flags:
    actual = [u['id'] for u in units if u['start'] <= flag['candidate_source_heading'] < u['end']]
    assert actual == [flag['left_neighbor']]
    owners.append({'id': flag['id'], 'heading_owned_by': actual[0]})
clusters = []
for flag in flags:
    pair = [flag['left_neighbor'], flag['id']]
    if clusters and clusters[-1][-1] == pair[0]:
        clusters[-1].append(pair[1])
    else:
        clusters.append(pair)
duplicate_titles = collections.defaultdict(list)
for heading in headings:
    duplicate_titles[norm(heading['title'])].append(heading['block'])
duplicates = [{'title_sha256': H(title), 'heading_blocks': coords} for title, coords in duplicate_titles.items() if len(coords) > 1]
queue = [{'ids': [f['left_neighbor'], f['id']], 'status': 'STRUCTURAL_SCREEN_ONLY_REQUIRES_INDEPENDENT_SOURCE_REVIEW',
          'current_cut': f['current_start'], 'source_heading_coordinate_to_review': f['candidate_source_heading'],
          'delta_source_blocks': f['current_start'] - f['candidate_source_heading'],
          'first_printed_vri': f['first_printed_stanza']['vri'], 'current_first_printed_vri': f['current_first_printed_stanza'],
          'source_evidence': {key: f[key] for key in ('strong_four_block_signature', 'signature_checks', 'source_prefix_sha256', 'first_printed_stanza', 'preceding_speaker_sha256', 'preceding_colophon_sha256')},
          'no_English_identity_or_number_offset_inferred': True, 'no_repair_or_namespace_approval': True} for f in flags]
scope = {'all_thera_records_counted': 563, 'screened_book': 37, 'screened_records': 141,
         'screened_ids': ['tha-ap423', 'tha-ap563'], 'screened_source_coordinates_half_open': [1, 6532],
         'whole_book_blocks_parity_checked': 10672, 'whole_book_numbered_poem_headings': 181,
         'scoped_numbered_poem_headings': 141, 'out_of_scope_poem_headings': 40,
         'classification_counts': counts, 'structural_flags': len(flags),
         'strong_signature_flags': sum(f['strong_four_block_signature'] for f in flags),
         'connected_candidate_clusters': len(clusters), 'lexical_heading_at_start_cases': 1}
report = {'schema': 'independent-book37-thera-structural-source-screen-v1',
          'status': 'SCREEN_QUEUE_ONLY_NO_NEW_REPAIR_APPROVAL', 'scope': scope,
          'source': {'XML_path': str(D / 's0510m2.mul.xml'), 'XML_bytes': len(raw), 'XML_sha256': H(raw), 'XML_git_blob_sha1': B(raw),
                     'VRI_commit': canon['source']['commit'], 'physical_elements': len(physical), 'omitted_note_only_physical_indices': omitted,
                     'whole_book_tuple_sha256': J(blocks), 'all_10672_tuples_equal': True,
                     'compared_tuple_fields': ['rend', 'paragraph_number', 'visible_Pali', 'notes', 'edition_page_markers'],
                     'baseline_gzip_sha256': H(packed), 'baseline_logical_sha256': H(canonical_raw),
                     'all_563_thera_records_ordered_sha256': J(all_thera), 'screened_141_records_coordinate_order_sha256': J(units),
                     'raw_fetch_receipt_sha256': H((D / 'RAW_FETCH_RECEIPT.json').read_bytes())},
          'method': ['Reused the prior conservative local heading rule; final niggahita omission is the only permitted metadata-title normalization.',
                     'No ordinal zip, inferred publisher-number offset, fuzzy title matching, or English match establishes identity.',
                     'Nearest preceding matching heading is flagged only locally; the full ten-check four-block signature is reported individually.',
                     'Direct source-coordinate ownership cross-check handles connected chains, where a late unit can contain the next unit heading but not its own.'],
          'queue': queue, 'connected_candidate_clusters': clusters, 'lexical_cases_manual_only': lexical,
          'per_unit_classifications': records, 'duplicate_source_title_groups': duplicates,
          'controls': {'one_to_one_heading_owner_checks': owners,
                       'first_scoped_unit_heading_inside': records[0]['classification'] == 'OWN_HEADING_INSIDE',
                       'one_lexical_at_start_not_in_boundary_queue': True,
                       'all_40_out_of_scope_headings_excluded_from_thera_detector': True,
                       'prior_422_artifact_hashes_unchanged': prior_hashes},
          'limitations': ['Source structural screening is not semantic identity, translation alignment, rights clearance, repair approval, or locator migration approval.',
                         'The 27 flags and any connected chains require independent original-first narrative, closing-colophon, neighboring-boundary, and consumer compatibility review before a repair proposal.',
                         'This finite detector does not establish absence of other source/metadata problems. The one lexical title difference needs specialist review, not an automatic boundary change.',
                         'The forty non-Thera source headings were excluded. No new English original, note, source mapping, or translation coverage was assessed.',
                         'All previous source holds and the exact six-record book36 repair scope remain unchanged.',
                         'No app imports, app tests, builds, Git, CI, project writes, second fetch, credential changes, or provider changes were performed.'],
          'source_or_runtime_activation_coverage_gain': 0, 'repair_or_release_approval': False}
assert prior_hashes == {p.name: H(p.read_bytes()) for p in prior_files}
def write_new(name, obj):
    with (D / name).open('x', encoding='utf8') as out:
        out.write(json.dumps(obj, ensure_ascii=False, indent=2) + '\n')
write_new('BOOK37_SOURCE_SCREEN.json', report)
write_new('BOOK37_CANDIDATE_QUEUE.json', {'schema': 'unapproved-book37-source-review-queue-v1', 'scope': scope,
                                         'candidates': queue, 'connected_candidate_clusters': clusters,
                                         'not_repair_approval': True})
seal = {'status': report['status'], 'scope': scope, 'report_sha256': H((D / 'BOOK37_SOURCE_SCREEN.json').read_bytes()),
        'queue_sha256': H((D / 'BOOK37_CANDIDATE_QUEUE.json').read_bytes()), 'script_sha256': H(Path(__file__).read_bytes()),
        'raw_XML_sha256': H(raw), 'raw_XML_git_blob_sha1': B(raw), 'baseline_logical_sha256': H(canonical_raw),
        'prior_422_artifacts_preserved': prior_hashes, 'no_new_repair_approval': True}
write_new('BOOK37_SCREEN_SEAL.json', seal)
print(json.dumps({**seal, 'seal_sha256': H((D / 'BOOK37_SCREEN_SEAL.json').read_bytes())}))
