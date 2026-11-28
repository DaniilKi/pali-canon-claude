#!/usr/bin/env python3
"""Two exact publisher sources through the real current installed/browser reader.

Fixture-backed network denial and synthetic personal data only. Browser sizes,
touch flags and automated axe are not physical-device, human-AT or signed-host
acceptance. Root source/runtime review and exact CI remain separate gates.
"""
import argparse, copy, gzip, hashlib, importlib.util, json, os, re, signal, socket
import subprocess, sys, tempfile, time, traceback, urllib.parse, urllib.request
from contextlib import contextmanager
from pathlib import Path

PAIRS = ((401, 'tha-ap403'), (402, 'tha-ap404'))
REV = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070'
CANON = '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'
UTILITY = 'scripts/web-reader-thera381-386-five-check.py'
UTILITY_SHA = 'c2fc19380376b65ce4f5478093442306a9bf8f2a85cf6bc5c74b2cb6500677af'
GOLDENS_FILE = 'docs/source-preparation/thera401-402/proposal/derived-v1/public/SOURCE_DERIVED_GOLDENS.json'
GOLDENS_SHA = '6658c027a133048622bc1d3a6ac82a41d699594c3679b6c6effc01a3ccc1b718'
AXE_SHA = '20c09fe157a8a34a30e241aaa1fcdade657734f08ab379ecfbeb7d45cc46e878'
KEY = 'pali-library-v1'
MARKER = 'SYNTHETIC_PRIVATE_401402'
PRIVATE = MARKER + '_a\u0304😀'
CELLS = ((390, 'light', True, False), (768, 'dark', True, True))
phase = 'arguments'
report = {'schema': 'publisher401402-reader-v1', 'status': 'running', 'checks': [],
          'counts': {}, 'physical_devices': False, 'human_assistive_testing': False,
          'signed_host': False, 'live_provider': False, 'fresh_browser_offline': False}


def require(ok, code):
    if not ok:
        raise ValueError(code)


def sha(value):
    if isinstance(value, str):
        value = value.encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'replace').encode('utf-8')
    require(isinstance(value, bytes), 'SHA_BYTES_OR_STR')
    return hashlib.sha256(value).hexdigest()


def packed(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def utf16(value):
    return len(value.encode('utf-16-le', 'surrogatepass')) // 2


def regular(path):
    require(path.is_absolute(), 'ABSOLUTE_INPUT_REQUIRED')
    for parent in [*reversed(path.parents), path]:
        require(not parent.is_symlink(), 'INPUT_ALIAS_REFUSED')
    require(path.is_file(), 'REGULAR_INPUT_REQUIRED')
    return path.read_bytes()


def passed(name, amount=1):
    report['counts'][name] = report['counts'].get(name, 0) + amount


def source_body(data, uid, profile, golden):
    require(data['text_id'] == uid and data['source'] == 'apadana', 'EXACT_SOURCE_OWNER')
    require(data['translation_id'] == 'ap:chapter-3/poem-' + str(golden['publisher_poem']) and
            data['translation_revision'] == REV, 'EXACT_SOURCE_VERSION')
    for key in ('raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256'):
        require(data[key] == profile[key], 'EXACT_ADVERTISED_SOURCE_PIN')
    text, notes, paratext = data['text'], data['translator_notes'], data['publisher_paratext']
    require(sha(text) == golden['body_sha256'] == profile['body_sha256'] and
            utf16(text) == golden['body_characters_utf16'], 'EXACT_COMPLETE_BODY')
    parts = text.split('\n\n')
    require(len(parts) == len(golden['body_paragraphs']), 'EXACT_PARAGRAPH_COUNT')
    for part, proof in zip(parts, golden['body_paragraphs'], strict=True):
        require(sha(part) == proof['text_sha256'] and utf16(part) == proof['characters_utf16'] and
                len(part.split('\n')) == proof['lines'], 'EXACT_PARAGRAPH_WORDS_AND_LINES')
        require([int(n) for n in re.findall(r'\[Note (\d+)\]', part)] == proof['original_note_numbers'],
                'EXACT_PARAGRAPH_NOTE_CALLS')
    require([n['number'] for n in notes] == profile['note_numbers'] == golden['note_numbers'] and
            all(set(n) == {'number', 'text'} for n in notes), 'EXACT_NOTE_OWNER_NUMBERS')
    require(sha(packed(notes)) == profile['notes_sha256'] == golden['notes_sha256_JSON_stringify'],
            'EXACT_ALL_NOTE_WORDS')
    for note, proof in zip(notes, golden['note_owners'], strict=True):
        require(note['number'] == proof['number'] and sha(note['text']) == proof['text_sha256'] and
                utf16(note['text']) == proof['characters_utf16'], 'EXACT_INDIVIDUAL_NOTE')
        owner = int(proof['owner'].split(':')[1])
        require(proof['number'] in golden['body_paragraphs'][owner]['original_note_numbers'],
                'EXACT_NOTE_PARAGRAPH_OWNER')
    require(sha(paratext) == profile['paratext_sha256'] == golden['paratext_sha256'] and
            utf16(paratext) == golden['paratext_characters_utf16'], 'EXACT_SEPARATE_CHAPTER_HEADING')
    require(bool(paratext) == (uid == 'tha-ap403') and not golden['paratext_note_numbers'],
            'UNNOTED_CHAPTER_HEADING_ONLY_403')
    require(not any(k in data for k in ('publisher_preface', 'chapter_summary', 'collection_summary',
                                       'publisher_divisions', 'editorial_gap')), 'NO_INVENTED_APPARATUS')
    require(data['mapping_notes'] == profile['mapping_notes'] and
            data['license'] == 'CC BY-NC-SA 4.0' and data['url'] == profile['url'] and
            data['fetched_url'] == profile['raw_url'], 'EXACT_NOTICES_RIGHTS_SOURCE_LINKS')
    require(data['offset'] == 0 and data['next_offset'] is None and data['continue_with'] is None,
            'COMPLETE_SOURCE_NOT_PARTIAL')


def fixture_guard(utilities):
    """Reuse the audited closed guard, changing exactly its finite owner matrix."""
    old = "const owners=new Map([[381,'tha-ap383'],[383,'tha-ap385'],[384,'tha-ap386'],[385,'tha-ap387'],[386,'tha-ap388']]);"
    new = "const owners=new Map([[401,'tha-ap403'],[402,'tha-ap404']]);"
    text = utilities.GUARD_SOURCE
    require(text.count(old) == text.count('c.approved_publishers.length!==5') == 1, 'EXACT_GUARD_TEMPLATE')
    return text.replace(old, new).replace('c.approved_publishers.length!==5', 'c.approved_publishers.length!==2')


@contextmanager
def installed_epoch(utilities, server, stage, profiles, publisher):
    ledger, config, preload = stage / 'ledger.jsonl', stage / 'guard.json', stage / 'guard.cjs'
    ledger.write_text('', encoding='utf-8'); preload.write_text(fixture_guard(utilities), encoding='utf-8')
    files = []
    for pub, uid in PAIRS:
        profile = profiles[uid]; raw = publisher / ('src/_poems/chapter-3/poem-' + str(pub) + '.md')
        require(sha(regular(raw)) == profile['raw_sha256'], 'EXACT_EXTERNAL_PUBLISHER_RAW')
        files.append({'id': uid, 'publisher': pub, 'url': profile['raw_url'], 'path': str(raw),
                      'sha256': profile['raw_sha256']})
    config.write_text(packed({'mode': 'pinned-fixture', 'source_revision': REV,
                             'approved_publishers': [401, 402], 'files': files, 'ledger': str(ledger)}))
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
    env = {k: v for k, v in os.environ.items() if k not in
           ('NODE_OPTIONS', 'NODE_PATH', 'PALI_ENGLISH16_GUARD_CONFIG', 'PALI_ENGLISH16_GUARD_SHA256')}
    env.update(PORT=str(port), HOST='127.0.0.1', RATE_LIMIT_PER_MINUTE='0', CHATGPT_WIDGET='1',
               PALI_ENGLISH16_GUARD_CONFIG=str(config), PALI_ENGLISH16_GUARD_SHA256=sha(config.read_bytes()))
    child = subprocess.Popen(['node', '--require', str(preload), str(server / 'http.cjs')], cwd=stage,
                             env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    client = utilities.Client('http://127.0.0.1:' + str(port))
    try:
        deadline = time.monotonic() + 15
        while True:
            try:
                with urllib.request.urlopen(client.base + '/healthz', timeout=1) as response:
                    require(response.status == 200, 'HTTP_HEALTH_STATUS')
                break
            except OSError:
                require(child.poll() is None and time.monotonic() < deadline, 'HTTP_STARTUP_DEADLINE')
                time.sleep(.1)
        yield client
    finally:
        report['cleanup'] = utilities.stop_owned(child)
        require(all(report['cleanup'][k] for k in ('leader_reaped', 'group_absent')), 'HTTP_OWNED_CLEANUP')
        raw = ledger.read_bytes(); require(len(raw) <= 2097152, 'LEDGER_BOUND')
        events = [json.loads(line) for line in raw.splitlines()]
        require(events and all(e['kind'] in ('guard-ready', 'literal-loopback-resolution', 'fixture-read')
                               for e in events), 'NO_DENIED_OR_EXTERNAL_SOURCE_TRAFFIC')
        reads = [e for e in events if e['kind'] == 'fixture-read']
        require({e['id'] for e in reads} == {'tha-ap403', 'tha-ap404'} and
                all(e['actual_network_forwarded'] == 0 for e in reads), 'BOTH_PINNED_ORIGINALS_READ_NO_UPSTREAM')
        report['fixture_ledger'] = {'sha256': sha(raw), 'fixture_reads': len(reads), 'upstream_forwarded': 0}


def ready(page, root, pin, expect):
    fields = dict(urllib.parse.parse_qsl(page.url.split('?', 1)[1]))
    offset = int(fields.get('offset', 0)); expected = root[offset:offset + 30]
    require(fields.get('uid') == root[0]['ref'].split('/')[0] and expected, 'EXACT_CURRENT_ROUTE')
    expect(page.locator('.segment-label a').first).to_have_text(expected[0]['ref'])
    page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
    require(page.locator('.segment-label a').all_text_contents() == [s['ref'] for s in expected],
            'ORDERED_CURRENT_PALI_REFERENCES')
    require(page.locator('section[aria-label="Pāli passage"] .passage').all_text_contents() ==
            [s['text'] for s in expected], 'INDEPENDENT_CURRENT_PALI_WORDS')
    if 'source' in fields:
        require(fields['source'] == pin, 'EXACT_ROUTE_SOURCE_PIN')


def english_dom(page, uid, profile, golden, expect):
    expect(page.locator('#study > .translation')).to_be_visible()
    body = page.locator('#study > .translation').text_content()
    require(sha(body) == golden['body_sha256'], 'DOM_EXACT_WHOLE_SOURCE')
    for part, proof in zip(body.split('\n\n'), golden['body_paragraphs'], strict=True):
        require(sha(part) == proof['text_sha256'] and len(part.split('\n')) == proof['lines'],
                'DOM_SPEAKER_STANZA_PARAGRAPH_AND_LINES')
    region = page.get_by_role('region', name='Translator’s notes', exact=True)
    expect(region).to_have_count(1)
    notes = [{'number': int(li.get_attribute('value')), 'text': li.locator('p').text_content()}
             for li in region.locator('li').all()]
    require(sha(packed(notes)) == golden['notes_sha256_JSON_stringify'], 'DOM_ALL36_NOTE_WORDS')
    for note, proof in zip(notes, golden['note_owners'], strict=True):
        require(note['number'] == proof['number'] and sha(note['text']) == proof['text_sha256'],
                'DOM_EXACT_NUMBERED_NOTE')
    preface = page.locator('#study > section').filter(has=page.get_by_role(
        'heading', name='Publisher preface · editorial, not poem text', exact=True))
    expect(preface).to_have_count(int(uid == 'tha-ap403'))
    if uid == 'tha-ap403':
        require(sha(preface.locator('.translation').text_content()) == golden['paratext_sha256'] and
                preface.locator('li').count() == 0, 'DOM_UNNOTED_CHAPTER_HEADING')
    text = page.locator('#study').text_content()
    require(all(n in text for n in profile['mapping_notes']) and REV in text and
            'CC BY-NC-SA 4.0' in text and 'Walters' in text and 'Whitman' in text,
            'DOM_EVERY_NOTICE_AND_ATTRIBUTION')
    links = page.locator('#study a[href]').evaluate_all('xs=>xs.map(x=>x.href)')
    require(profile['url'] in links and 'https://creativecommons.org/licenses/by-nc-sa/4.0/' in links,
            'DOM_ACTUAL_SOURCE_AND_LICENCE_LINKS')
    require(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'NO_HORIZONTAL_OVERFLOW')


def main():
    global phase
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--mode', choices=('normal', 'a11y', 'installed'), required=True)
    for name in ('source-root', 'server-dir', 'publisher-root', 'report'):
        ap.add_argument('--' + name, type=Path, required=True)
    ap.add_argument('--browser', default='/usr/bin/chromium')
    args = ap.parse_args(); root, server = args.source_root.absolute(), args.server_dir.absolute()
    require(root == Path(__file__).absolute().parents[1], 'FIXED_ACTUAL_SOURCE_ROOT')
    require(not args.report.exists(), 'PRESERVE_OLD_REPORT')
    require(os.name == 'posix', 'POSIX_OWNED_PROCESS_GROUPS')
    if args.mode == 'installed':
        require(not server.is_relative_to(root) and server.name == 'server', 'REAL_SEPARATE_INSTALLED_SERVER')
    else:
        require(server == root / 'server', 'NORMAL_AND_A11Y_ACTUAL_ROOT_SERVER')
    signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(ValueError('OVERALL_300_SECOND_DEADLINE')))
    signal.alarm(300)
    require(re.fullmatch('[a-f0-9]{64}', UTILITY_SHA) is not None, 'PENDING_REVIEWED_UTILITY_SOURCE')
    raw = regular(root / UTILITY); require(sha(raw) == UTILITY_SHA, 'EXACT_REUSED_BROWSER_UTILITY_SOURCE')
    spec = importlib.util.spec_from_file_location('reviewed_five_browser_utilities', root / UTILITY)
    utilities = importlib.util.module_from_spec(spec); spec.loader.exec_module(utilities)
    sys.path.insert(0, str(root / 'scripts'))
    from web_reader_intake382 import source_authority382
    from web_reader_approved_acceptance import assert_runtime
    context = source_authority382(root); english = context['english']
    require(set(context) == {'english', 'canonical', 'widget'} and len(english['ids']) == 382 and
            english['ids'][:380] == english['historical380']['ids'] and
            english['ids'][380:] == ['tha-ap403', 'tha-ap404'], 'ACTUAL382_AND_UNCHANGED380_PREFIX')
    require(context['canonical']['new_canonical_logical_sha256'] == CANON and
            context['widget'] == {'version': 'v50', 'uri': 'ui://pali-canon/reader-v50.html',
                                 'skybridge': 'ui://pali-canon/reader-v50.skybridge.html'}, 'EXACT_CURRENT_CANON_AND_WIDGET')
    actual_runtime = assert_runtime(root, server)
    rights = english['documents']['REQUIRED_NOTICES.json']['specific_rights_artifacts']
    require(len(rights) == 6, 'EXACT_SIX_SOURCE_RIGHTS_ARTIFACTS')
    for relative, descriptor in rights.items():
        require(relative and not relative.startswith('/') and all(p not in ('', '.', '..') for p in relative.split('/')),
                'FIXED_RELATIVE_RIGHTS_ARTIFACT')
        raw = regular(args.publisher_root.absolute() / relative)
        require(len(raw) == descriptor['bytes'] and sha(raw) == descriptor['sha256'] and
                hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest() == descriptor['git_blob_sha1'],
                'EXACT_ACTUAL_PUBLISHER_RIGHTS_BYTES')
    golden_raw = regular(root / GOLDENS_FILE)
    require(sha(golden_raw) == GOLDENS_SHA, 'EXACT_INDEPENDENT_RAW_SOURCE_GOLDENS')
    golden = json.loads(golden_raw); require(list(golden['entries']) == [u for _, u in PAIRS], 'EXACT_GOLDEN_OWNERS')
    profiles = {uid: english['profiles'][uid] for _, uid in PAIRS}
    parts = json.loads(regular(server / 'data/canon.json.gz.parts.json'))
    chunks = []
    for part in parts['parts']:
        chunk = regular(server / 'data' / part['file'])
        require(len(chunk) == part['size'] and sha(chunk) == part['sha256'], 'EXACT_CANON_PART')
        chunks.append(chunk)
    logical = gzip.decompress(b''.join(chunks)); require(sha(logical) == CANON, 'EXACT_CURRENT_CANON_LOGICAL')
    canon = json.loads(logical); units = {u['id']: u for u in canon['units']}; roots = {}
    for _, uid in PAIRS:
        unit, profile = units[uid], profiles[uid]
        wrapper = {'id': uid, 'book': unit['book'], 'start': unit['start'], 'end': unit['end'],
                   'blocks': canon['books'][unit['book']]['blocks'][unit['start']:unit['end']]}
        require(sha(packed(wrapper)) == profile['root_sha256'] ==
                golden['entries'][uid]['root_wrapper_sha256_JSON_stringify'], 'INDEPENDENT_ROOT_WORDS')
        roots[uid] = utilities.render(canon, unit)
    report.update(mode=args.mode, actual_runtime=actual_runtime, canonical_sha256=CANON,
                  source_goldens_sha256=GOLDENS_SHA, fixture_mode='two-exact-pinned-originals',
                  a11y={'performed': args.mode == 'a11y', 'scans': 0, 'violations': 0})
    from playwright.sync_api import sync_playwright, expect
    with tempfile.TemporaryDirectory(prefix='pali401402-') as temporary:
        stage = Path(temporary)
        with installed_epoch(utilities, server, stage, profiles, args.publisher_root.absolute()) as client:
            phase = 'public source APIs and sixteen hard500 continuations'
            baseline = {}
            for pub, uid in PAIRS:
                profile, g = profiles[uid], golden['entries'][uid]
                data = client.data('get_translation', {'uid': uid, 'translation': 'ap:chapter-3/poem-' + str(pub), 'limit': 6000})
                source_body(data, uid, profile, g); baseline[uid] = data; passed('whole_sources')
                prior = ''; command = {'name': 'get_translation', 'arguments': {'uid': uid,
                    'translation': data['translation_id'], 'offset': 0, 'limit': 500, 'translation_revision': REV}}
                for proof in g['pages500']:
                    page = client.data(command['name'], command['arguments'])
                    require(page['offset'] == proof['offset'] == utf16(prior) and
                            sha(page['text']) == proof['text_sha256'] and
                            page['prefix_sha256'] == proof['start_prefix_sha256'] == sha(prior), 'EXACT_HARD500_PAGE')
                    prior += page['text']; require(sha(prior) == proof['continuation_prefix_sha256'], 'EXACT_END_PREFIX')
                    require(page['next_offset'] == proof['next_offset'], 'EXACT_NEXT_OFFSET')
                    expected_next = None if proof['next_offset'] is None else {'name': 'get_translation', 'arguments': {
                        'uid': uid, 'translation': data['translation_id'], 'offset': proof['next_offset'], 'limit': 500,
                        'prefix_sha256': proof['continuation_prefix_sha256'], 'translation_revision': REV}}
                    require(page['continue_with'] == expected_next and page['text_id'] == uid and
                            page['translation_id'] == data['translation_id'] and page['translation_revision'] == REV and
                            page['limit'] == 500 and utf16(page['text']) == proof['characters_utf16'] and
                            page['total_characters'] == g['body_characters_utf16'], 'EXACT_CURSOR_OWNER_PINS_EXTENT')
                    command = page['continue_with']; passed('hard500_pages')
                require(command is None and sha(prior) == g['body_sha256'], 'COMPLETE_TERMINAL_SOURCE')
            with sync_playwright() as pw:
                browser = pw.chromium.launch(executable_path=args.browser, headless=True)
                try:
                    for width, theme, touch, keyboard in CELLS:
                        run_cell(utilities, client, browser, root, stage, context, roots, units,
                                 profiles, golden['entries'], baseline, args.mode,
                                 width, theme, touch, keyboard, expect)
                finally:
                    browser.close()
    require(report['counts'] == {'whole_sources': 2, 'hard500_pages': 16, 'native_sources': 4,
                                'old_refusals': 8, 'new_saved_roundtrips': 4,
                                'edition_switches': 8, 'native_tamper_controls': 3,
                                'offline_personal_notes': 1}, 'EXACT_COMPLETE_CASE_COUNTS_NO_SKIP')
    require(report['a11y']['scans'] == (4 if args.mode == 'a11y' else 0), 'EXACT_A11Y_SCOPE')
    require(assert_runtime(root, server) == actual_runtime, 'RUNTIME_UNCHANGED_DURING_JOURNEYS')
    signal.alarm(0); report['status'] = 'passed'


def run_cell(utilities, client, browser, root, stage, context, roots, units, profiles,
             goldens, baseline, mode, width, theme, touch, keyboard, expect):
    global phase
    old = [{'uid': uid, 'ref': ref, 'offset': offset, 'source_commit': VRI,
            'title': 'Synthetic old ' + ref, 'note': PRIVATE + ' ' + ref}
           for uid, ref, offset in [('tha-ap389', 'tha-ap389/1', 0), ('tha-ap389', 'tha-ap389/10', 9),
                                    ('tha-ap390', 'tha-ap390/1', 0)]]
    old.append({'uid': 'tha-ap390', 'ref': 'tha-ap390/9', 'title': 'Synthetic unversioned', 'note': PRIVATE})
    seed = {'theme': theme, 'remember_position': False, 'saved': old, 'reading_progress': []}
    browser_context, make, state = utilities.guarded_context(browser, client.base, seed, width, [MARKER],
                                                            {'has_touch': touch, 'is_mobile': width == 390})
    page = make(); entry = client.base + '/reader'
    def activate(control):
        expect(control).to_be_visible()
        if keyboard:
            control.focus(); expect(control).to_be_focused(); control.press('Enter')
        else:
            control.tap()
    def go(uid, action=None):
        def requested(response):
            if response.request.method != 'POST' or not response.url.endswith('/mcp'):
                return False
            command = (response.request.post_data_json or {}).get('params', {})
            return command.get('name') == 'get_text' and command.get('arguments', {}).get('uid') == uid
        with page.expect_response(requested, timeout=15000) as pending:
            if action is not None:
                action()
            elif page.url == entry + '#read?uid=' + uid:
                page.reload()
            else:
                page.goto(entry + '#read?uid=' + uid)
        response = pending.value; response.finished(); result = response.json()['result']
        require(not result.get('isError'), 'ACTUAL_CURRENT_PALI_RESPONSE_REFUSED')
        data = result['structuredContent']
        require(data['text_id'] == uid and data['source']['commit'] == VRI and
                data['source'].get('locator_revision', VRI) == VRI, 'ACTUAL_CURRENT_PALI_SOURCE_OWNER')
        ready(page, roots[uid], VRI, expect)
    def open_source(uid):
        go(uid)
        before = sum(x.get('name') == 'get_translation' for x in state['calls'])
        utilities.read_tool(page, 'English sources').click()
        card = page.locator('#study .translation-choice').filter(has_text=profiles[uid]['reference'])
        expect(card).to_have_count(1)
        require(sum(x.get('name') == 'get_translation' for x in state['calls']) == before, 'EXPLICIT_ENGLISH_CONSENT')
        activate(card.get_by_role('button').filter(has_text='Read source ·'))
    try:
        phase = 'historical refusal and private preservation'
        for item in old:
            utilities.saved(page, entry)
            stored = page.evaluate('key=>localStorage.getItem(key)', KEY)
            link = page.get_by_role('region', name='Saved passage results').get_by_role(
                'link', name=item['title'] + ' · ' + item['ref'], exact=True)
            activate(link); expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
            require(page.locator('.passage').count() == 0 and PRIVATE not in page.locator('#view').text_content(),
                    'OLD_REFUSAL_WITHOUT_REPLACEMENT_OR_PRIVATE_WORDS')
            expected = 'source or citation mapping revision changed' if 'source_commit' in item else 'unversioned numeric position is ambiguous'
            require(expected in page.locator('#view').text_content(), 'TYPED_OLD_REFUSAL')
            require(page.evaluate('key=>localStorage.getItem(key)', KEY) == stored, 'OLD_REFUSAL_STORAGE_UNCHANGED')
            passed('old_refusals')
        for pub, uid in PAIRS:
            phase = 'current edition selection and exact source rendering'
            navigation_before = sum(x.get('name') == 'get_translation' for x in state['calls'])
            page.goto(entry); activate(page.get_by_role('link', name='Library', exact=True))
            page.locator('#view a.entry[href="#browse?node=ap"]').click()
            page.locator('#view a.entry[href^="#read?uid="]').first.wait_for()
            # Use a rare exact source title, not a stock refrain or an app-derived hit as the oracle.
            query = page.locator('#query')
            if not query.is_visible():
                page.locator('#find-panel > summary').click()
            query.fill(units[uid]['title']); activate(page.locator('#search-form button'))
            expect(page.get_by_role('heading', name='Results for “' + units[uid]['title'] + '”', exact=True)).to_be_visible()
            page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
            result = page.locator('#view a.entry[href^="#read?"]').filter(has_text=units[uid]['title'])
            wanted = [link for link in result.all() if utilities.fields(link.get_attribute('href')).get('uid') == uid]
            require(wanted, 'KNOWN_SOURCE_OWNER_IN_EXISTING_SEARCH_CAP'); go(uid, lambda: activate(wanted[0]))
            utilities.read_tool(page, 'English sources')
            nav = page.get_by_role('region', name='Reviewed publisher edition navigation', exact=True)
            detail = nav.locator('details')
            if detail.get_attribute('open') is None:
                detail.locator(':scope > summary').click()
            picker = nav.get_by_role('combobox'); expect(picker).to_have_count(1)
            expected_ids = [k for k, p in sorted(context['english']['profiles'].items(), key=lambda item: item[1]['poem'])
                            if p.get('publisher_chapter') == 'chapter-3']
            require(len(expected_ids) == 342 and picker.locator('option').evaluate_all('xs=>xs.map(x=>x.value)') == expected_ids,
                    'FULL_ACTUAL382_EDITION_SELECTOR')
            other = 'tha-ap404' if uid == 'tha-ap403' else 'tha-ap403'
            for target in (other, uid):
                picker.select_option(target); go(target, lambda: activate(nav.get_by_role('button', name='Open reviewed poem', exact=True)))
                passed('edition_switches')
                utilities.read_tool(page, 'English sources'); nav = page.get_by_role('region', name='Reviewed publisher edition navigation', exact=True)
                detail = nav.locator('details')
                if detail.get_attribute('open') is None:
                    detail.locator(':scope > summary').click()
                picker = nav.get_by_role('combobox')
            require(sum(x.get('name') == 'get_translation' for x in state['calls']) == navigation_before, 'NAVIGATION_AND_EDITION_NO_AUTOMATIC_ENGLISH')
            open_source(uid); english_dom(page, uid, profiles[uid], goldens[uid], expect)
            if mode == 'a11y':
                axe = regular(root / 'node_modules/axe-core/axe.min.js'); require(sha(axe) == AXE_SHA, 'PINNED_AXE_ASSET')
                page.evaluate(axe.decode('utf-8'))
                scan = page.evaluate("async()=>{let x=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return x.violations.map(v=>({id:v.id,impact:v.impact}))}")
                report['a11y']['scans'] += 1; report['a11y']['violations'] += len(scan); require(not scan, 'AUTOMATED_A11Y_VIOLATION')
            passed('native_sources')
            chosen = next(s for s in roots[uid] if s['type'] == 'verse')
            go(uid)
            activate(page.get_by_role('button', name='Save passage ' + chosen['ref'], exact=True))
            utilities.saved(page, entry); page.get_by_label('Search saved passages and notes', exact=True).fill(chosen['ref'])
            region = page.get_by_role('region', name='Saved passage results'); expect(region.locator('article')).to_have_count(1)
            field = region.get_by_label('Your personal note', exact=True); field.fill(PRIVATE + ' ' + uid)
            activate(region.get_by_role('button', name='Save note', exact=True))
            saved = utilities.profile(page)['saved']; require(saved[:4] == old, 'OLD_RECORDS_UNCHANGED_AFTER_NEW_NOTE')
            fresh = next(r for r in saved if r['uid'] == uid)
            require(fresh['source_commit'] == VRI and fresh['offset'] == chosen['offset'] and fresh['ref'] == chosen['ref'], 'FRESH_SOURCE_PIN')
            link = region.get_by_role('link', name=fresh['title'] + ' · ' + chosen['ref'], exact=True)
            require(utilities.fields(link.get_attribute('href'))['source'] == VRI, 'SAVED_LINK_PIN_NOT_DROPPED')
            before_reopen = sum(x.get('name') == 'get_translation' for x in state['calls'])
            go(uid, lambda: activate(link)); go(uid, page.reload)
            require(sum(x.get('name') == 'get_translation' for x in state['calls']) == before_reopen,
                    'CURRENT_CITATION_RELOAD_REQUIRES_FRESH_ENGLISH_CONSENT')
            passed('new_saved_roundtrips')
        phase = 'positive-before-reader-corruption controls'
        if width == 390:
            for uid, kind in [('tha-ap403', 'body'), ('tha-ap403', 'paratext'), ('tha-ap404', 'note')]:
                open_source(uid); english_dom(page, uid, profiles[uid], goldens[uid], expect)
                data = baseline[uid]
                if kind == 'body':
                    patch = {'text': 'X' + data['text'][1:]}
                elif kind == 'paratext':
                    patch = {'publisher_paratext': 'X' + data['publisher_paratext'][1:]}
                else:
                    notes = copy.deepcopy(data['translator_notes']); notes[0]['text'] += ' SYNTHETIC_NOTE_DRIFT'; patch = {'translator_notes': notes}
                state['expected'] = {'id': uid, 'body_sha256': goldens[uid]['body_sha256']}; state['patch'] = patch
                open_source(uid); expect(page.get_by_role('button', name='Retry selected source', exact=True)).to_be_visible()
                expect(page.locator('#study > .translation')).to_have_count(0)
                state['patch'] = None; page.get_by_role('button', name='Retry selected source', exact=True).click()
                english_dom(page, uid, profiles[uid], goldens[uid], expect); passed('native_tamper_controls')
        utilities.saved(page, entry); page.get_by_label('Search saved passages and notes', exact=True).fill('')
        def export_current():
            with page.expect_download() as pending:
                activate(page.get_by_role('button', name='Export bookmarks and notes', exact=True))
            return json.loads(Path(pending.value.path()).read_bytes())
        exported = None
        if width == 390:
            before = len(state['calls']); browser_context.set_offline(True)
            try:
                region = page.get_by_role('region', name='Saved passage results')
                field = region.get_by_label('Your personal note', exact=True).first; field.fill(PRIVATE + ' offline')
                activate(region.get_by_role('button', name='Save note', exact=True).first)
                exported = export_current()
                require(len(state['calls']) == before, 'LOCAL_OFFLINE_NOTE_AND_EXPORT_NO_TOOL_CALL')
                passed('offline_personal_notes')
            finally:
                browser_context.set_offline(False)
        if exported is None:
            exported = export_current()
        current = utilities.profile(page)['saved']
        require(exported['saved'] == current, 'EXPORT_EXACT_CURRENT_PRIVATE_RECORDS')
        require(all(r['source_commit'] == VRI for r in current[4:]), 'NO_NEW_SOURCE_REPIN')
        # Offline note edit is explicit and local; all other old fields and source pins stay unchanged.
        old_expected = copy.deepcopy(old)
        if width == 390:
            old_expected[0]['note'] = PRIVATE + ' offline'
        require(current[:4] == old_expected, 'OLD_PRIVATE_FIELDS_NO_AUTOMATIC_MIGRATION')
        utilities.audit_state(state); require(len(state['calls']) <= 512, 'FINITE_BROWSER_CALL_BOUND')
        require(PRIVATE not in page.title(), 'PRIVATE_NOT_IN_DOCUMENT_TITLE')
        report['checks'].append({'width': width, 'theme': theme, 'source_owners': [u for _, u in PAIRS],
                                 'emulated_touch': touch, 'keyboard': keyboard, 'private_export_preserved': True})
    finally:
        browser_context.close()


if __name__ == '__main__':
    if '--help' in sys.argv or '-h' in sys.argv:
        main()
    destination = None
    try:
        main()
    except Exception as error:
        report.update(status='failed', failure={'phase': phase, 'category': type(error).__name__,
            'code': str(error) if isinstance(error, ValueError) and re.fullmatch('[A-Z0-9_]+', str(error)) else 'OPERATION_FAILED',
            'frames': [{'file': Path(x.filename).name, 'line': x.lineno, 'function': x.name}
                       for x in traceback.extract_tb(error.__traceback__)]})
    finally:
        if '--report' in sys.argv:
            destination = Path(sys.argv[sys.argv.index('--report') + 1])
        text = json.dumps(report, indent=2) + '\n'
        if destination is not None and not destination.exists():
            destination.parent.mkdir(parents=True, exist_ok=True); destination.write_text(text, encoding='utf-8')
        print(text); sys.exit(0 if report['status'] == 'passed' else 1)
