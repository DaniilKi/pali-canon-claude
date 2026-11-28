"""Fixed four-source field/raw validation and target-server comparison only.

The stable shared capture owns current source validation and actual R/data27.
This helper never constructs another authority or captures an installation.
"""
import hashlib
import json
import re
from pathlib import Path

PAIRS = ((394, 'tha-ap396'), (397, 'tha-ap399'), (406, 'tha-ap408'), (407, 'tha-ap409'))
CANON = '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'
VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070'
REV = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
GOLDEN_ENTRIES_SHA = '307bf86ef7a6436f6d42336e7a9db167e0c707145d380d5e2e41f780da6e1aef'
PUBLISHER_HOLDS = (391, 392, 393, 403, 404, 405, 408, 409, 410)


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


def validate_context(context):
    """Pure field validation; no file, server or runtime access on this route."""
    require(type(context) is dict and set(context) == {'english', 'canonical', 'widget'}, 'CLOSED_CURRENT_CONTEXT')
    english, canonical = context['english'], context['canonical']
    from web_reader_current_apadana import source_cohort, widget_contract
    cohort = source_cohort(context, 'four394407')
    old = english['historical382']
    ids = [uid for _, uid in PAIRS]
    cohort_ids = old['ids'] + ids
    require(len(old['ids']) == 382 and cohort['ids'] == ids and len(cohort_ids) == 386 and
            cohort['approval']['expected_profile_ids'] == cohort_ids and english['ids'][:386] == cohort_ids,
            'EXACT_HISTORICAL386_SOURCE_PREFIX_AND_FOUR')
    require(english['ids'] == english['selection']['expected_profile_ids'], 'FULL_CURRENT_SOURCE_DECLARATION')
    require(list(english['profiles']) == list(english['links']) == english['ids'], 'ORDERED_FULL_SOURCE_OBJECTS')
    for uid in old['ids']:
        require(english['profiles'][uid] == old['profiles'][uid] and english['links'][uid] == old['links'][uid],
                'UNCHANGED_FULL_OLD382_OBJECTS')
    require(english['manifest']['held'] == old['manifest']['held'] and
            english['selection']['held_ids'] == old['selection']['held_ids'], 'UNCHANGED_HISTORICAL_HELD_OBJECTS')
    require(canonical['new_canonical_logical_sha256'] == CANON and
            canonical['namespace'] == 'apadana-thera389-390-v1', 'UNCHANGED_CANONICAL_CONTEXT')
    require(context['widget'] == widget_contract(), 'EXACT_REVIEWED_CURRENT_WIDGET_BINDING')
    bindings = cohort['documents']['SOURCE_BINDINGS.json']
    require(set(bindings['source_derived_API_expected_metadata']) == {'entries'}, 'CLOSED_GOLDEN_ENVELOPE')
    goldens = bindings['source_derived_API_expected_metadata']['entries']
    require(list(goldens) == ids and sha(packed(goldens)) == GOLDEN_ENTRIES_SHA, 'INDEPENDENT_SOURCE_GOLDENS')
    profiles = cohort['profiles']
    require(list(profiles) == list(cohort['links']) == ids, 'EXACT_FOUR_SOURCE_OBJECT_DOMAINS')
    for uid in ids:
        require(english['profiles'][uid] == profiles[uid] and english['links'][uid] == cohort['links'][uid],
                'CURRENT_RETAINS_FOUR_COMPLETE_SOURCE_OBJECTS')
    for publisher, uid in PAIRS:
        p, g = profiles[uid], goldens[uid]
        require(p['id'] == uid and p['poem'] == g['publisher_poem'] == publisher and
                p['publisher_chapter'] == 'chapter-3' and p['translation_revision'] == REV,
                'LITERAL_SOURCE_IDENTITY_NOT_NUMBER_OFFSET')
        require(p['body_sha256'] == g['body_sha256'] and p['notes_sha256'] == g['notes_sha256_JSON_stringify'] and
                p['root_sha256'] == g['root_wrapper_sha256_JSON_stringify'], 'EXACT_SOURCE_PINS')
        require(p['paratext_sha256'] == g['paratext_sha256'] == sha('') and g['paratext_characters_utf16'] == 0 and
                not g['paratext_note_numbers'], 'NO_NEW_PARATEXT_OR_NOTE_OWNERS')
        require(sha(packed(p)) == g['full_proposed_profile_sha256_JSON_stringify'], 'COMPLETE_APPROVED_PROFILE_OBJECT')
        require(english['links'][uid] == {**p, 'english': p['title'], 'match': 'individually-reviewed-whole-poem'},
                'APPROVED_LINK_DOMAIN_NOT_PENDING_DOMAIN')
    source_records = english['selection']['baseline_records'] + english['selection']['approved_records']
    require([r['id'] for r in source_records] == english['ids'], 'SOURCE_REGISTRY_RECORDS_ORDER')
    navigation = sorted([r for r in source_records if r.get('publisher_chapter') == 'chapter-3'], key=lambda r: r['poem'])
    historical_records = old['selection']['baseline_records'] + old['selection']['approved_records'] + cohort['records']
    historical_navigation = sorted([r for r in historical_records if r['publisher_chapter'] == 'chapter-3'], key=lambda r: r['poem'])
    require(len(historical_navigation) == 346, 'HISTORICAL_FOUR_SOURCE_PUBLISHER_ORDER')
    require([r for r in navigation if r['id'] in cohort_ids] == historical_navigation and
            len(navigation) == len({r['poem'] for r in navigation}), 'FULL_CURRENT_PUBLISHER_ORDER_AND_OLD_SUBSEQUENCE')
    require(not any(r['poem'] in PUBLISHER_HOLDS for r in navigation), 'ALL_NINE_PUBLISHER_HOLDS_UNCHANGED')
    require(sum(len(g['body_paragraphs']) for g in goldens.values()) == 121 and
            sum(len(g['note_owners']) for g in goldens.values()) == 141 and
            sum(len(g['pages500']) for g in goldens.values()) == 37, 'COMPLETE_FOUR_SOURCE_EXTENTS')
    pairs = [pair for uid in ids for pair in bindings['entries'][uid]['display_pairs']]
    require(len(pairs) == 16 and all(pair['owner'].startswith('note:') and pair['state_on'] == 'c' and
                                   pair['state_off'] == 'ch' for pair in pairs), 'SIXTEEN_NOTE_OWNED_STATE_PAIRS')
    return {'context': context, 'english': english, 'profiles': profiles, 'goldens': goldens,
            'navigation': navigation, 'rights': cohort['documents']['REQUIRED_NOTICES.json']['specific_rights_artifacts']}


def capture_inputs(root, server, publisher, mode):
    """Exactly ONE shared current capture, then independently compare the target34."""
    from web_reader_current_apadana import capture_current
    context, approved = capture_current(root)
    prepared = validate_context(context)
    require(len(approved) == 34 and list(approved) == sorted(approved), 'APPROVED34_PATH_SET')
    for row in approved.values():
        require(set(row) == {'bytes', 'sha256'} and type(row['bytes']) is int and row['bytes'] >= 0 and
                re.fullmatch('[a-f0-9]{64}', row['sha256']), 'STRICT_APPROVED_RUNTIME_ROW')
    if mode == 'installed':
        require(not server.is_relative_to(root) and str(server).endswith('/node_modules/pali-canon-mcp/server'),
                'SEPARATE_NPM_INSTALLED_SERVER_PATH')
    else:
        require(server == root / 'server', 'ACTUAL_SOURCE_SERVER_MODE')
    require(inventory(server) == approved, 'EXACT_ACTUAL_TARGET34_APPROVED_BYTES')
    require(len(prepared['rights']) == 6, 'SIX_CONTROLLING_SOURCE_RIGHTS_ARTIFACTS')
    for relative, descriptor in prepared['rights'].items():
        require(relative and not relative.startswith('/') and '\\' not in relative and
                all(part not in ('', '.', '..') for part in relative.split('/')), 'FINITE_RIGHTS_PATH')
        raw = regular(publisher / relative)
        require(len(raw) == descriptor['bytes'] and sha(raw) == descriptor['sha256'] and
                hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == descriptor['git_blob_sha1'],
                'EXACT_ORIGINAL_RIGHTS_BYTES')
    for pub, uid in PAIRS:
        raw = regular(publisher / ('src/_poems/chapter-3/poem-' + str(pub) + '.md'))
        require(sha(raw) == prepared['profiles'][uid]['raw_sha256'], 'EXACT_PINNED_PUBLISHER_ORIGINAL')
    prepared['runtime'] = approved
    return prepared


def validate_body(text, notes, paratext, uid, prepared):
    p, g = prepared['profiles'][uid], prepared['goldens'][uid]
    require(sha(text) == g['body_sha256'] and utf16(text) == g['body_characters_utf16'], 'EXACT_COMPLETE_BODY_WORDS')
    paragraphs = text.split('\n\n')
    require(len(paragraphs) == len(g['body_paragraphs']), 'EXACT_PARAGRAPH_COUNT')
    for part, proof in zip(paragraphs, g['body_paragraphs'], strict=True):
        require(sha(part) == proof['text_sha256'] and utf16(part) == proof['characters_utf16'] and
                len(part.split('\n')) == proof['lines'], 'EXACT_PHYSICAL_PARAGRAPH_LINES')
        require([int(n) for n in re.findall(r'\[Note (\d+)\]', part)] == proof['original_note_numbers'], 'EXACT_ORIGINAL_NOTE_CALLS')
    validate_notes(notes, uid, prepared)
    require(type(paratext) is str and paratext == '' and sha(paratext) == p['paratext_sha256'], 'NO_INVENTED_PARATEXT')
    if uid == 'tha-ap396':
        part = paragraphs[15]; suffix = p['stanza_layout'][14]['suffix']
        require(p['stanza_layout'][14]['local_label'] == '15-16' and len(part.split('\n')) == 4 and
                part.index('[Note 21]') > part.index(suffix) + len(suffix) - 1,
                'NOTE21_AFTER_SINGLE_LOCAL15_16_SUFFIX')


def validate_notes(notes, uid, prepared):
    p, g = prepared['profiles'][uid], prepared['goldens'][uid]
    require(type(notes) is list and all(type(n) is dict and set(n) == {'number', 'text'} and
                                      type(n['number']) is int and type(n['text']) is str for n in notes), 'STRICT_NOTE_SCHEMA')
    require([n['number'] for n in notes] == p['note_numbers'] == g['note_numbers'] and
            sha(packed(notes)) == g['notes_sha256_JSON_stringify'], 'ALL_ORIGINAL_NOTE_WORDS_ORDER')
    for note, proof in zip(notes, g['note_owners'], strict=True):
        require(note['number'] == proof['number'] and sha(note['text']) == proof['text_sha256'] and
                utf16(note['text']) == proof['characters_utf16'], 'EXACT_NOTE_WORDS_AND_OWNERS')
        owner = int(proof['owner'].split(':')[1])
        require(proof['number'] in g['body_paragraphs'][owner]['original_note_numbers'], 'ORIGINAL_NOTE_PARAGRAPH_OWNER')


def validate_full_api(data, uid, prepared):
    p = prepared['profiles'][uid]
    require(data['text_id'] == uid and data['translation_id'] == 'ap:chapter-3/poem-' + str(p['poem']) and
            data['source'] == 'apadana' and data['translation_revision'] == REV, 'EXACT_API_SOURCE_OWNER_VERSION')
    for key in ('raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'):
        require(data[key] == p[key], 'EXACT_ADVERTISED_SOURCE_PIN')
    require(data['url'] == p['url'] and data['fetched_url'] == p['raw_url'] and data['license'] == 'CC BY-NC-SA 4.0' and
            data['license_url'] == 'https://creativecommons.org/licenses/by-nc-sa/4.0/' and
            data['mapping_notes'] == p['mapping_notes'], 'EXACT_API_SOURCE_RIGHTS_NOTICES')
    require(data['offset'] == 0 and type(data['offset']) is int and data['next_offset'] is None and
            data['continue_with'] is None and data['prefix_sha256'] == sha('') and
            type(data['limit']) is int and data['limit'] == 10000 and
            type(data['total_characters']) is int and
            data['total_characters'] == prepared['goldens'][uid]['body_characters_utf16'],
            'COMPLETE_SUPPORTED_API_WINDOW')
    require(not any(k in data for k in ('publisher_preface', 'chapter_summary', 'collection_summary',
                                       'publisher_divisions', 'editorial_gap')), 'NO_UNOWNED_APPARATUS')
    validate_body(data['text'], data['translator_notes'], data['publisher_paratext'], uid, prepared)
