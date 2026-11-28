"""Eight-source input/word validation only; one shared current capture owns R.

No English body/note fixture, runtime metadata pin, or historical runtime
projection is constructed here. Native windows use source-only UTF16 proofs.
"""
import hashlib
import json
import re
from pathlib import Path

PAIRS = ((411, 'tha-ap413'), (412, 'tha-ap414'), (414, 'tha-ap416'), (415, 'tha-ap417'),
         (416, 'tha-ap418'), (417, 'tha-ap419'), (418, 'tha-ap420'), (419, 'tha-ap421'))
FOUR_IDS = ('tha-ap396', 'tha-ap399', 'tha-ap408', 'tha-ap409')
SEVEN_IDS = ('tha-ap423', 'tha-ap425', 'tha-ap426', 'tha-ap427', 'tha-ap428', 'tha-ap429', 'tha-ap431')
CANON = '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'
VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070'
REV = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
GOLDEN_ENTRIES_SHA = '9bb12f7adef8d9736e97e84481a0844cadf8cc899d94dd5c978798355f382c87'
INPUT_CONTRACT_JSON_SHA = 'a087f4f0ec34f8953e46d7827d48f8f06c02249cd9145cf5c471c880926fe779'
PUBLISHER_HOLDS = (391, 392, 393, 403, 404, 405, 408, 409, 410)
CONDITIONAL_PUBLISHERS = (413, 420)


def require(ok, code):
    if not ok:
        raise ValueError(code)


def packed(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def sha(value):
    if isinstance(value, str):
        value = value.encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'replace').encode('utf-8')
    require(type(value) is bytes, 'HASH_BYTES_OR_TEXT')
    return hashlib.sha256(value).hexdigest()


def utf16(value):
    return len(value.encode('utf-16-le', 'surrogatepass')) // 2


def slice_utf16(value, start, end):
    return value.encode('utf-16-le', 'surrogatepass')[start * 2:end * 2].decode('utf-16-le', 'surrogatepass')


def regular(path):
    require(type(path) is type(Path('.')) and path.is_absolute(), 'PHYSICAL_ABSOLUTE_FILE')
    require('..' not in path.parts, 'PARENT_TRAVERSAL_REFUSED')
    for component in [*reversed(path.parents), path]:
        require(not component.is_symlink(), 'PHYSICAL_COMPONENT_NO_ALIAS')
    require(path.is_file(), 'REGULAR_INPUT_REQUIRED')
    return path.read_bytes()


def inventory(server):
    require(server.is_absolute() and not server.is_symlink(), 'PHYSICAL_SERVER_DIRECTORY')
    for parent in server.parents:
        require(not parent.is_symlink(), 'SERVER_PARENT_ALIAS')
    result = {}
    for file in sorted(server.rglob('*')):
        require(not file.is_symlink(), 'SERVER_COMPONENT_ALIAS')
        if file.is_file():
            raw = file.read_bytes()
            result[file.relative_to(server).as_posix()] = {'bytes': len(raw), 'sha256': sha(raw)}
        else:
            require(file.is_dir(), 'SERVER_REGULAR_FILES_ONLY')
    return result


def validate_context(context, four, eight):
    """Pure closed source views; no IO, runtime capture or full386 snapshot."""
    require(type(context) is dict and set(context) == {'english', 'canonical', 'widget'}, 'CLOSED_CURRENT_CONTEXT')
    english, canonical = context['english'], context['canonical']
    require(set(english['source_cohorts']) == {'four394407', 'eight411419', 'seven421429'}, 'EXACT_THREE_FLAT_SOURCE_COHORTS')
    seven = english['source_cohorts']['seven421429']
    for key, value in (('four394407', four), ('eight411419', eight), ('seven421429', seven)):
        require(type(value) is dict and set(value) == {'directory', 'ids', 'records', 'profiles', 'links', 'documents', 'approval'} and
                value == english['source_cohorts'][key], 'CLOSED_PURE_SOURCE_COHORT_VIEW')
    old = english['historical382']; ids = [uid for _, uid in PAIRS]
    require(len(old['ids']) == 382 and four['ids'] == list(FOUR_IDS) and eight['ids'] == ids and
            english['ids'][:394] == old['ids'] + four['ids'] + ids and len(english['ids'][:394]) == 394 and
            seven['ids'] == list(SEVEN_IDS) and english['ids'] == old['ids'] + four['ids'] + ids + seven['ids'] and len(english['ids']) == 401,
            'EXACT_CURRENT401_WITH_COMPLETE_OLD394_SOURCE_PREFIX')
    require(list(english['profiles']) == list(english['links']) == english['ids'], 'ORDERED_FULL_SOURCE_OBJECTS')
    for uid in old['ids']:
        require(english['profiles'][uid] == old['profiles'][uid] and english['links'][uid] == old['links'][uid],
                'UNCHANGED_FULL_OLD382_OBJECTS')
    for uid in four['ids']:
        require(english['profiles'][uid] == four['profiles'][uid] and english['links'][uid] == four['links'][uid],
                'UNCHANGED_COMPLETE_FOUR_SOURCE_OBJECTS_NOT_RUNTIME_PROJECTION')
    require(english['manifest']['held'] == old['manifest']['held'] and
            english['selection']['held_ids'] == old['selection']['held_ids'], 'UNCHANGED_HISTORICAL_HELD_OBJECTS')
    require(canonical['new_canonical_logical_sha256'] == CANON and
            canonical['namespace'] == 'apadana-thera389-390-v1', 'UNCHANGED_CANONICAL_CONTEXT')
    require(context['widget'] == {'version': 'v53', 'uri': 'ui://pali-canon/reader-v53.html',
                                  'skybridge': 'ui://pali-canon/reader-v53.skybridge.html'}, 'EXACT_REVIEWED_WIDGET_BINDING')
    documents = eight['documents']
    require(set(documents) == {'APPROVAL.json', 'PROFILES.json', 'LINKS.json', 'REQUIRED_NOTICES.json',
            'SOURCE_BINDINGS.json', 'SOURCE_REVIEW.json', 'NORMALIZATION_REVIEW.json'}, 'CLOSED_SEVEN_CANONICAL_SOURCE_DOCUMENTS')
    bindings = documents['SOURCE_BINDINGS.json']
    require(bindings['schema'] == 'reviewed-thera411-419-eight-source-bindings-v1' and
            set(bindings['source_derived_API_expected_metadata']) == {'entries'}, 'ACTUAL_CANONICAL_SOURCE_BINDINGS_ENVELOPE')
    goldens = bindings['source_derived_API_expected_metadata']['entries']
    original = bindings['source_contract']
    require(list(goldens) == ids and sha(packed(goldens)) == GOLDEN_ENTRIES_SHA, 'INDEPENDENT_EIGHT_WORD_GOLDENS')
    require(sha(packed(original)) == INPUT_CONTRACT_JSON_SHA, 'EXACT_UNTRANSFORMED_SOURCE_CONTRACT_DOMAIN')
    require(original['literal_pairs'] == [[pub, uid] for pub, uid in PAIRS], 'LITERAL_EIGHT_SOURCE_ID_PAIRS')
    profiles = eight['profiles']
    require(list(profiles) == list(eight['links']) == ids and eight['records'] ==
            [{'id': uid, 'publisher_chapter': 'chapter-3', 'poem': pub} for pub, uid in PAIRS], 'EXACT_EIGHT_PROFILE_RECORDS')
    for publisher, uid in PAIRS:
        p, g = profiles[uid], goldens[uid]
        require(p == english['profiles'][uid] and eight['links'][uid] == english['links'][uid], 'WHOLE_ACTUAL_CURRENT_SOURCE_OBJECTS')
        require(p['id'] == uid and p['poem'] == g['publisher_poem'] == publisher and
                p['publisher_chapter'] == 'chapter-3' and p['translation_revision'] == REV,
                'LITERAL_SOURCE_OWNER_NOT_NUMBER_OFFSET')
        require(p['body_sha256'] == g['body_sha256'] and p['notes_sha256'] == g['notes_sha256_JSON_stringify'] and
                p['root_sha256'] == g['root_wrapper_sha256_JSON_stringify'] and p['raw_sha256'] == g['raw']['sha256'] and
                p['paratext_sha256'] == g['paratext_sha256'], 'EXACT_ORIGINAL_WORD_PINS')
        require((g['paratext_characters_utf16'] == 34 if uid == 'tha-ap413' else g['paratext_characters_utf16'] == 0) and
                not g['paratext_note_numbers'], 'ONLY_SEPARATE_UNNOTED_411_CHAPTER_HEADING')
        require(eight['links'][uid] == {**p, 'english': p['title'], 'match': 'individually-reviewed-whole-poem'}, 'APPROVED_ACTIVE_LINK_DOMAIN')
        row = next(r for r in original['entries'] if r['canonical_id'] == uid)
        require(row['raw'] == g['raw'], 'EXACT_RAW_SOURCE_OWNER')
    records = english['selection']['baseline_records'] + english['selection']['approved_records']
    require([r['id'] for r in records] == english['ids'], 'COMPLETE_ORDERED_SOURCE_RECORDS')
    navigation = sorted([r for r in records if r.get('publisher_chapter') == 'chapter-3'], key=lambda r: r['poem'])
    require(len(navigation) == 361 and len({r['poem'] for r in navigation}) == 361, 'INDEPENDENT_CURRENT_PUBLISHER_ORDER')
    require(not any(r['poem'] in PUBLISHER_HOLDS + CONDITIONAL_PUBLISHERS for r in navigation), 'ALL_HOLDS_AND_CONDITIONAL_SOURCES_INACTIVE')
    require(sum(len(g['body_paragraphs']) for g in goldens.values()) == 179 and
            sum(len(g['note_owners']) for g in goldens.values()) == 183 and
            sum(len(g['pages500']) for g in goldens.values()) == 54 and
            sum(len(g['physical_stanzas']) for g in goldens.values()) == 155, 'EXACT_COMPLETE_EIGHT_SOURCE_EXTENTS')
    pairs = [pair for row in original['entries'] for pair in row['source_display_pair_vector']]
    require(len(pairs) == 27 and all((r['owner'] == 'body' or re.fullmatch(r'note:\d+', r['owner'])) and
            (r['on'], r['off']) in (('c', 'ch'), ('C', 'Ch'), ('cc', 'chch')) for r in pairs), 'ALL27_BODY_AND_NOTE_GLYPH_PAIRS')
    return {'context': context, 'english': english, 'cohort': eight, 'profiles': profiles, 'goldens': goldens,
            'navigation': navigation, 'rights': original['specific_rights_artifacts']}


def capture_inputs(root, server, publisher, mode):
    """One source capture, pure cohort selectors, then independent serving34 IO."""
    from web_reader_current_apadana import capture_current, source_cohort
    context, approved = capture_current(root)
    prepared = validate_context(context, source_cohort(context, 'four394407'), source_cohort(context, 'eight411419'))
    require(len(approved) == 34 and list(approved) == sorted(approved), 'APPROVED34_PATH_SET')
    for row in approved.values():
        require(set(row) == {'bytes', 'sha256'} and type(row['bytes']) is int and row['bytes'] >= 0 and
                re.fullmatch('[a-f0-9]{64}', row['sha256']), 'STRICT_APPROVED_RUNTIME_ROW')
    if mode == 'installed':
        require(not server.is_relative_to(root) and str(server).endswith('/node_modules/pali-canon-mcp/server'), 'SEPARATE_FRESH_NPM_INSTALLED_SERVER')
    else:
        require(server == root / 'server', 'ACTUAL_SOURCE_SERVER_MODE')
    require(inventory(server) == approved, 'EXACT_CURRENT_TARGET34_APPROVED_BYTES')
    require(len(prepared['rights']) == 6, 'SIX_CONTROLLING_ORIGINAL_RIGHTS_ARTIFACTS')
    for row in prepared['rights']:
        relative = row['path']
        require(relative and not relative.startswith('/') and '\\' not in relative and
                all(part not in ('', '.', '..') for part in relative.split('/')), 'FINITE_ORIGINAL_RIGHTS_PATH')
        raw = regular(publisher / relative)
        require(len(raw) == row['bytes'] and sha(raw) == row['sha256'] and
                hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == row['git_blob_sha1'], 'EXACT_CONTROLLING_RIGHTS_BYTES')
    for pub, uid in PAIRS:
        descriptor = prepared['goldens'][uid]['raw']; relative = 'src/_poems/chapter-3/poem-' + str(pub) + '.md'
        require(descriptor['path'] == relative, 'EXACT_LITERAL_PUBLISHER_SOURCE_PATH')
        raw = regular(publisher / relative)
        require(len(raw) == descriptor['bytes'] and sha(raw) == descriptor['sha256'] and
                hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == descriptor['git_blob_sha1'], 'EXACT_PINNED_PUBLISHER_ORIGINAL')
    prepared['runtime'] = approved
    return prepared


def validate_notes(notes, uid, prepared):
    p, g = prepared['profiles'][uid], prepared['goldens'][uid]
    require(type(notes) is list and all(type(n) is dict and set(n) == {'number', 'text'} and
            type(n['number']) is int and type(n['text']) is str for n in notes), 'STRICT_NOTE_SCHEMA')
    require([n['number'] for n in notes] == p['note_numbers'] == g['note_numbers'] and
            sha(packed(notes)) == g['notes_sha256_JSON_stringify'], 'ALL_ORIGINAL_NOTE_WORDS_ORDER')
    for note, proof in zip(notes, g['note_owners'], strict=True):
        require(note['number'] == proof['number'] and sha(note['text']) == proof['text_sha256'] and
                utf16(note['text']) == proof['characters_utf16'], 'EXACT_NOTE_WORDS_AND_OWNER')
        require(proof['number'] in g['body_paragraphs'][proof['owner_body_paragraph_index0']]['original_note_numbers'], 'EXACT_NOTE_PARAGRAPH_OWNER')


def validate_body(text, notes, paratext, uid, prepared):
    p, g = prepared['profiles'][uid], prepared['goldens'][uid]
    require(sha(text) == g['body_sha256'] and utf16(text) == g['body_characters_utf16'], 'EXACT_COMPLETE_SOURCE_WORDS')
    paragraphs = text.split('\n\n')
    require(len(paragraphs) == len(g['body_paragraphs']), 'EXACT_PHYSICAL_PARAGRAPHS')
    for part, proof in zip(paragraphs, g['body_paragraphs'], strict=True):
        require(sha(part) == proof['text_sha256'] and utf16(part) == proof['characters_utf16'] and
                len(part.split('\n')) == proof['lines'], 'EXACT_PARAGRAPH_WORDS_AND_BREAKS')
        require([int(n) for n in re.findall(r'\[Note (\d+)\]', part)] == proof['original_note_numbers'], 'ORIGINAL_NOTECALL_ORDER')
    for proof in g['physical_stanzas']:
        part = paragraphs[proof['body_paragraph_index0']]
        require(sha(part) == proof['presentation_paragraph_sha256'] and len(part.split('\n')) == proof['lines'], 'ORIGINAL_PHYSICAL_STANZA_OWNER')
        without = re.sub(r'\[Note \d+\]', '', part).rstrip()
        found = list(re.finditer(r' \((\d+)\)(?: \[(\d+)\])?[ \t]*$', without, re.M))
        actual = [{'local_label': int(m[1]), 'publisher_global_label': int(m[2]) if m[2] else None,
                   'line1': without[:m.start()].count('\n') + 1, 'suffix': m[0].rstrip(), 'suffix_sha256': sha(m[0].rstrip())} for m in found]
        require(actual == proof['numeric_markers'], 'ALL_ORIGINAL_INTERNAL_NUMERIC_MARKERS_AND_NULL_GLOBALS')
        quote = without
        for match in reversed(found):
            quote = quote[:match.start()] + quote[match.end():]
        quote = quote.rstrip()
        require(sha(quote) == proof['physical_quote_all_original_numeric_suffixes_removed_sha256'] and
                utf16(quote) == proof['quote_characters_utf16'], 'EXACT155_PHYSICAL_QUOTE_WORDS_NOT_REFLOWED')
    validate_notes(notes, uid, prepared)
    require(type(paratext) is str and sha(paratext) == g['paratext_sha256'] and
            utf16(paratext) == g['paratext_characters_utf16'] == (34 if uid == 'tha-ap413' else 0), 'EXACT_SEPARATE_UNNOTED_411_HEADING')


def validate_window(text, uid, offset, prepared):
    """Actual observed6000-window slices checked only against presealed500 proofs."""
    g = prepared['goldens'][uid]; total = g['body_characters_utf16']
    require(type(text) is str and type(offset) is int and offset in (0, 6000) and 0 <= offset < total, 'NATIVE_SOURCE_WINDOW_ORDINAL')
    extent = min(6000, total - offset)
    require(utf16(text) == extent, 'EXACT_NATIVE_UTF16_WINDOW_EXTENT')
    proofs = [r for r in g['pages500'] if offset <= r['offset'] < offset + extent]
    covered = 0
    for proof in proofs:
        require(proof['offset'] == offset + covered, 'WINDOW_PROOF_NO_GAP_OR_OVERLAP')
        piece = slice_utf16(text, covered, covered + proof['characters_utf16'])
        require(sha(piece) == proof['text_sha256'] and utf16(piece) == proof['characters_utf16'], 'ORIGINAL_NATIVE_WINDOW_WORDS')
        covered += proof['characters_utf16']
    require(covered == extent, 'COMPLETE_NATIVE_WINDOW_SOURCE_COVERAGE')


def validate_full_api(data, uid, prepared):
    p, g = prepared['profiles'][uid], prepared['goldens'][uid]
    require(data['text_id'] == uid and data['translation_id'] == 'ap:chapter-3/poem-' + str(p['poem']) and
            data['source'] == 'apadana' and data['translation_revision'] == REV, 'EXACT_API_SOURCE_OWNER_VERSION')
    for key in ('raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'):
        require(data[key] == p[key], 'EXACT_ADVERTISED_SOURCE_PIN')
    require(data['url'] == p['url'] and data['fetched_url'] == p['raw_url'] and data['license'] == 'CC BY-NC-SA 4.0' and
            data['license_url'] == 'https://creativecommons.org/licenses/by-nc-sa/4.0/' and data['mapping_notes'] == p['mapping_notes'], 'EXACT_API_RIGHTS_NOTICES_SOURCE_LINKS')
    require(type(data['offset']) is int and data['offset'] == 0 and data['next_offset'] is None and data['continue_with'] is None and
            data['prefix_sha256'] == sha('') and type(data['limit']) is int and data['limit'] == 10000 and
            type(data['total_characters']) is int and data['total_characters'] == g['body_characters_utf16'], 'COMPLETE_SUPPORTED_API_WINDOW')
    require(not any(k in data for k in ('publisher_preface', 'chapter_summary', 'collection_summary', 'publisher_divisions', 'editorial_gap')), 'NO_UNOWNED_APPARATUS')
    validate_body(data['text'], data['translator_notes'], data['publisher_paratext'], uid, prepared)
