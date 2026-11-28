#!/usr/bin/env python3
"""Eight reviewed originals through the real current reader, with bounded private fixtures.

Normal/a11y use R/server; installed compares an external genuine npm server to
approved34. Installation provenance is a separate package receipt. No live
provider, signed host, physical device, human AT or fresh-browser offline claim.
"""
import argparse, copy, gzip, hashlib, importlib.util, json, os, re, signal, socket
import subprocess, sys, tempfile, time, traceback, urllib.parse, urllib.request
from contextlib import contextmanager
from pathlib import Path

PAIRS = ((411, 'tha-ap413'), (412, 'tha-ap414'), (414, 'tha-ap416'), (415, 'tha-ap417'),
         (416, 'tha-ap418'), (417, 'tha-ap419'), (418, 'tha-ap420'), (419, 'tha-ap421'))
REV = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070'
CANON = '883d62fbf6cbb7333f9968ee1a906a34ae337024ee1e0cab47e7fc69beb8350a'
UTILITY = 'scripts/web-reader-thera381-386-five-check.py'
UTILITY_SHA = '66044879d1cc3387ebc47b33fb92242eb56131e7889b69d38404a751451d3473'
INPUTS = 'scripts/apadana/thera411-419-eight/browser-inputs.py'
INPUTS_SHA = '72c8bc12b60b93e9e8aeb6a9f8bf6217aebff9d89ddd727f09907d77bfeff2ef'
AXE_SHA = '20c09fe157a8a34a30e241aaa1fcdade657734f08ab379ecfbeb7d45cc46e878'
KEY = 'pali-library-v1'
MARKER = 'SYNTHETIC_PRIVATE_411419'
PRIVATE = MARKER + '_a\u0304😀'
CELLS = ((390, 'light', True, False), (1280, 'dark', False, True))
phase = 'arguments'
report = {'schema': 'eight411419-reader-v1', 'status': 'running', 'counts': {}, 'checks': [],
          'physical_devices': False, 'human_assistive_testing': False, 'signed_host': False,
          'live_provider': False, 'fresh_browser_offline': False,
          'partial_integrity_scope': 'Exact observed page oracles plus revision/identity refusal; advertised whole-body hash alone does not authenticate arbitrary forged partial chunks.'}


def require(ok, code):
    if not ok:
        raise ValueError(code)


def sha(value):
    if isinstance(value, str):
        value = value.encode('utf-16-le', 'surrogatepass').decode('utf-16-le', 'replace').encode('utf-8')
    require(type(value) is bytes, 'HASH_BYTES_OR_TEXT')
    return hashlib.sha256(value).hexdigest()


def packed(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def utf16(value):
    return len(value.encode('utf-16-le', 'surrogatepass')) // 2


def regular(path):
    require(path.is_absolute() and '..' not in path.parts, 'PHYSICAL_ABSOLUTE_INPUT')
    for part in [*reversed(path.parents), path]:
        require(not part.is_symlink(), 'INPUT_COMPONENT_ALIAS_REFUSED')
    require(path.is_file(), 'REGULAR_INPUT_REQUIRED')
    return path.read_bytes()


def count(name, n=1):
    report['counts'][name] = report['counts'].get(name, 0) + n


def load_fixed(root, relative, expected, name):
    require(re.fullmatch('[a-f0-9]{64}', expected) is not None, 'PENDING_REVIEWED_SOURCE_PIN')
    raw = regular(root / relative)
    require(sha(raw) == expected, 'EXACT_REUSED_SOURCE_BYTES')
    spec = importlib.util.spec_from_file_location(name, root / relative)
    module = importlib.util.module_from_spec(spec)
    exec(compile(raw, str(root / relative), 'exec'), module.__dict__)
    return module


def fixture_guard(utilities):
    old = "const owners=new Map([[381,'tha-ap383'],[383,'tha-ap385'],[384,'tha-ap386'],[385,'tha-ap387'],[386,'tha-ap388']]);"
    new = "const owners=new Map([[411,'tha-ap413'],[412,'tha-ap414'],[414,'tha-ap416'],[415,'tha-ap417'],[416,'tha-ap418'],[417,'tha-ap419'],[418,'tha-ap420'],[419,'tha-ap421']]);"
    source = utilities.GUARD_SOURCE
    require(source.count(old) == source.count('c.approved_publishers.length!==5') == 1, 'EXACT_FINITE_GUARD_TEMPLATE')
    return source.replace(old, new).replace('c.approved_publishers.length!==5', 'c.approved_publishers.length!==8')


@contextmanager
def epoch(utilities, server, stage, prepared, publisher):
    ledger, config, preload = stage / 'ledger.jsonl', stage / 'guard.json', stage / 'guard.cjs'
    ledger.write_bytes(b''); preload.write_text(fixture_guard(utilities), encoding='utf-8')
    files = [{'id': uid, 'publisher': pub, 'url': prepared['profiles'][uid]['raw_url'],
              'path': str(publisher / ('src/_poems/chapter-3/poem-' + str(pub) + '.md')),
              'sha256': prepared['profiles'][uid]['raw_sha256']} for pub, uid in PAIRS]
    config.write_text(packed({'mode': 'pinned-fixture', 'source_revision': REV,
                             'approved_publishers': [p for p, _ in PAIRS], 'files': files, 'ledger': str(ledger)}))
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
        require({e['id'] for e in reads} == {u for _, u in PAIRS} and
                all(e['actual_network_forwarded'] == 0 for e in reads), 'ALL_EIGHT_PINNED_ORIGINALS_NO_UPSTREAM')
        report['fixture_ledger'] = {'sha256': sha(raw), 'fixture_reads': len(reads), 'upstream_forwarded': 0}


def roots_from_server(server, prepared, utilities):
    parts = json.loads(regular(server / 'data/canon.json.gz.parts.json')); chunks = []
    for part in parts['parts']:
        require(re.fullmatch(r'canon\.json\.gz\.part-\d{4}', part['file']) is not None, 'FINITE_CANON_PART_PATH')
        raw = regular(server / 'data' / part['file'])
        require(len(raw) == part['size'] and sha(raw) == part['sha256'], 'EXACT_APPROVED_CANON_PART')
        chunks.append(raw)
    logical = gzip.decompress(b''.join(chunks)); require(sha(logical) == CANON, 'CURRENT_CANON_883D')
    canon = json.loads(logical); units = {u['id']: u for u in canon['units']}; roots = {}
    # Only these eight and their finite neighbours need independent Pāli word oracles.
    selected = {uid for _, uid in PAIRS} | {other['id']
        for index, row in enumerate(prepared['navigation']) if row['id'] in {uid for _, uid in PAIRS}
        for other in prepared['navigation'][max(0, index - 1):index + 2]}
    for uid in sorted(selected):
        roots[uid] = utilities.render(canon, units[uid])
    for _, uid in PAIRS:
        unit = units[uid]
        wrapper = {'id': uid, 'book': unit['book'], 'start': unit['start'], 'end': unit['end'],
                   'blocks': canon['books'][unit['book']]['blocks'][unit['start']:unit['end']]}
        require(sha(packed(wrapper)) == prepared['goldens'][uid]['root_wrapper_sha256_JSON_stringify'],
                'EXACT_ORIGINAL_ROOT_WRAPPER')
    return roots, units


def api_cases(client, inputs, prepared):
    baseline = {}
    for pub, uid in PAIRS:
        data = client.data('get_translation', {'uid': uid, 'translation': 'ap:chapter-3/poem-' + str(pub), 'limit': 10000})
        inputs.validate_full_api(data, uid, prepared); baseline[uid] = data; count('whole_sources')
        g = prepared['goldens'][uid]; prior = ''
        command = {'name': 'get_translation', 'arguments': {'uid': uid, 'translation': data['translation_id'],
                   'offset': 0, 'limit': 500, 'translation_revision': REV}}
        for proof in g['pages500']:
            page = client.data(command['name'], command['arguments'])
            require(type(page['offset']) is int and page['offset'] == proof['offset'] == utf16(prior) and
                    sha(page['text']) == proof['text_sha256'] and utf16(page['text']) == proof['characters_utf16'] and
                    page['prefix_sha256'] == proof['start_prefix_sha256'] == sha(prior), 'EXACT_HARD500_PAGE_WORDS_START_PREFIX')
            prior += page['text']; require(sha(prior) == proof['continuation_prefix_sha256'], 'EXACT_PAGE_END_PREFIX')
            nxt = None if proof['next_offset'] is None else {'name': 'get_translation', 'arguments': {
                'uid': uid, 'translation': data['translation_id'], 'offset': proof['next_offset'], 'limit': 500,
                'prefix_sha256': proof['continuation_prefix_sha256'], 'translation_revision': REV}}
            require(page['next_offset'] == proof['next_offset'] and page['continue_with'] == nxt and
                    page['text_id'] == uid and page['translation_id'] == data['translation_id'] and
                    page['translation_revision'] == REV and type(page['limit']) is int and page['limit'] == 500 and
                    page['total_characters'] == g['body_characters_utf16'], 'EXACT_EMITTED_CURSOR_OWNER_EXTENT')
            require(type(page['total_characters']) is int and
                    (page['next_offset'] is None or type(page['next_offset']) is int) and
                    all(page[key] == prepared['profiles'][uid][key] for key in
                        ('raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256')),
                    'PAGE_TYPED_EXTENT_AND_STABLE_SOURCE_HASHES')
            inputs.validate_notes(page['translator_notes'], uid, prepared)
            command = page['continue_with']; count('hard500_pages')
        require(command is None and sha(prior) == g['body_sha256'], 'COMPLETE_TERMINAL_SOURCE_NO_SKIP')
        for arguments in ({'translation': 'ap:chapter-3/poem-' + uid[6:]},
                          {'translation': data['translation_id'], 'translation_revision': '0' * 40},
                          {'translation': data['translation_id'], 'offset': 500, 'limit': 500,
                           'translation_revision': REV, 'prefix_sha256': '0' * 64}):
            result = client.rpc('get_translation', {'uid': uid, **arguments})
            require(result.get('isError') is True and 'structuredContent' not in result, 'EXPLICIT_SOURCE_VERSION_OR_CURSOR_REFUSAL')
            count('api_refusals')
    return baseline


def ready(page, root, expected_offset, expect):
    uid = root[0]['ref'].split('/')[0]
    page.wait_for_function("uid=>location.hash.startsWith('#read?')&&new URLSearchParams(location.hash.slice(6)).get('uid')===uid", arg=uid)
    fields = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(page.url).fragment.split('?', 1)[1]))
    offset = int(fields.get('offset', 0)); require(offset == expected_offset, 'EXACT_REQUESTED_ROUTE_OFFSET')
    expected = root[offset:offset + 30]; require(expected, 'NONEMPTY_EXPECTED_SOURCE_PAGE')
    expect(page.locator('.segment-label a').first).to_have_text(expected[0]['ref'])
    page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
    require(page.locator('.segment-label a').all_text_contents() == [s['ref'] for s in expected], 'ORDERED_EXACT_PALI_SLICE')
    require(page.locator('section[aria-label="Pāli passage"] .passage').all_text_contents() ==
            [s['text'] for s in expected], 'INDEPENDENT_PALI_WORDS')
    if 'source' in fields or 'page_source' in fields:
        require(fields.get('source', fields.get('page_source')) == root[offset]['expected_source_pin'], 'CURRENT_ROUTE_SOURCE_PIN')
    if 'ref' in fields:
        require(fields['ref'] == expected[0]['ref'], 'CURRENT_ROUTE_SAVED_REFERENCE')


def dom_notes(page, inputs, prepared, uid, expect):
    region = page.get_by_role('region', name='Translator’s notes', exact=True); expect(region).to_have_count(1)
    notes = [{'number': int(li.get_attribute('value')), 'text': li.locator('p').text_content()}
             for li in region.locator('li').all()]
    inputs.validate_notes(notes, uid, prepared)
    text = page.locator('#study').text_content(); profile = prepared['profiles'][uid]
    require(all(n in text for n in profile['mapping_notes']) and REV in text and
            'CC BY-NC-SA 4.0' in text and 'Walters' in text and 'Whitman' in text, 'ALL_VISIBLE_SOURCE_CAVEATS_AND_ATTRIBUTION')
    links = page.locator('#study a[href]').evaluate_all('xs=>xs.map(x=>x.href)')
    require(profile['url'] in links and 'https://creativecommons.org/licenses/by-nc-sa/4.0/' in links, 'VISIBLE_ACTUAL_SOURCE_AND_LICENSE_LINKS')
    preface = page.locator('#study > section').filter(has=page.get_by_role('heading', name='Publisher preface · editorial, not poem text', exact=True))
    expect(preface).to_have_count(int(uid == 'tha-ap413'))
    paratext = preface.locator('.translation').text_content() if uid == 'tha-ap413' else ''
    require(sha(paratext) == prepared['goldens'][uid]['paratext_sha256'] and
            utf16(paratext) == prepared['goldens'][uid]['paratext_characters_utf16'] and
            (preface.locator('li').count() == 0 if uid == 'tha-ap413' else True), 'EXACT_VISIBLE_SEPARATE_UNNOTED_411_HEADING')
    return notes, paratext


def run_cell(utilities, inputs, client, browser, root, stage, prepared, roots, units, baseline, mode, cell, expect):
    global phase
    width, theme, touch, keyboard = cell; entry = client.base + '/reader'
    old = [{'uid': uid, 'ref': ref, 'offset': offset, 'source_commit': VRI,
            'title': 'Synthetic old ' + ref, 'note': PRIVATE + ' ' + ref}
           for uid, ref, offset in [('tha-ap389', 'tha-ap389/1', 0), ('tha-ap389', 'tha-ap389/10', 9), ('tha-ap390', 'tha-ap390/1', 0)]]
    old.append({'uid': 'tha-ap390', 'ref': 'tha-ap390/9', 'title': 'Synthetic unversioned', 'note': PRIVATE})
    context, make, state = utilities.guarded_context(browser, client.base,
        {'theme': theme, 'remember_position': False, 'saved': old, 'reading_progress': []}, width, [MARKER],
        {'has_touch': touch, 'is_mobile': width == 390})
    page = make(); page.set_default_timeout(15000)
    native_first = {}
    def activate(control):
        expect(control).to_be_visible()
        if keyboard:
            control.focus(); expect(control).to_be_focused(); control.press('Enter')
        else:
            control.tap()
    def go(uid, action=None, offset=0):
        def requested(response):
            if response.request.method != 'POST' or not response.url.endswith('/mcp'):
                return False
            command = (response.request.post_data_json or {}).get('params', {})
            return command.get('name') == 'get_text' and command.get('arguments', {}).get('uid') == uid
        with page.expect_response(requested, timeout=15000) as pending:
            if action:
                action()
            else:
                destination = entry + '#read?uid=' + uid + ('&offset=' + str(offset) if offset else '')
                page.reload() if page.url == destination else page.goto(destination)
        response = pending.value; response.finished(); result = response.json()['result']
        require(not result.get('isError'), 'ACTUAL_PALI_SOURCE_RESPONSE_REFUSED')
        data = result['structuredContent']; pin = roots[uid][offset]['expected_source_pin']
        require(data['text_id'] == uid and data['source']['commit'] == VRI and
                data['source'].get('locator_revision', VRI) == pin, 'ACTUAL_CURRENT_PALI_OWNER_PIN')
        ready(page, roots[uid], offset, expect)
    def open_source(uid):
        go(uid); before = sum(c.get('name') == 'get_translation' for c in state['calls'])
        utilities.read_tool(page, 'English sources').click()
        card = page.locator('#study .translation-choice').filter(has_text=prepared['profiles'][uid]['reference'])
        expect(card).to_have_count(1)
        require(sum(c.get('name') == 'get_translation' for c in state['calls']) == before, 'EXPLICIT_ENGLISH_CONSENT')
        control = card.get_by_role('button').filter(has_text='Read source ·')
        if uid == 'tha-ap414' and state['patch'] is None:
            def first_response(response):
                if response.request.method != 'POST' or response.url != client.base + '/mcp':
                    return False
                command = (response.request.post_data_json or {}).get('params', {})
                arguments = command.get('arguments', {})
                return command.get('name') == 'get_translation' and arguments.get('uid') == uid and arguments.get('offset', 0) == 0
            with page.expect_response(first_response, timeout=15000) as pending:
                activate(control)
            response = pending.value; response.finished(); result = response.json()['result']
            require(not result.get('isError'), 'GENUINE_NATIVE_FIRST_PAGE_REQUIRED')
            data = result['structuredContent']; proof = next(r for r in prepared['goldens'][uid]['pages500'] if r['offset'] == 6000)
            require(data['text_id'] == uid and data['translation_id'] == 'ap:chapter-3/poem-412', 'NATIVE_FIRST_SOURCE_OWNER')
            require(data['translation_revision'] == REV and data['offset'] == 0 and data['limit'] == 6000 and
                    utf16(data['text']) == 6000 and sha(data['text']) == proof['start_prefix_sha256'] and
                    data['next_offset'] == utf16(data['text']) and data['total_characters'] == prepared['goldens'][uid]['body_characters_utf16'],
                    'GENUINE_NATIVE6000_SOURCE_ORACLE')
            cursor = data['continue_with']
            require(type(cursor) is dict and set(cursor) == {'name', 'arguments'} and
                    cursor['name'] == 'get_translation' and type(cursor['arguments']) is dict and
                    set(cursor['arguments']) == {'uid', 'translation', 'offset', 'limit', 'prefix_sha256', 'translation_revision'},
                    'CLOSED_ACTUAL_NATIVE_CONTINUATION')
            arguments = cursor['arguments']
            require(arguments['uid'] == uid and arguments['translation'] == data['translation_id'] and
                    arguments['offset'] == data['next_offset'] and arguments['limit'] == data['limit'] and
                    arguments['prefix_sha256'] == sha(data['text']) and arguments['translation_revision'] == data['translation_revision'],
                    'ACTUAL_CURSOR_BINDS_GENUINE_NATIVE_FIRST_PAGE')
            native_first[uid] = copy.deepcopy(data)
        else:
            activate(control)
    def check_page(uid, offset):
        g = prepared['goldens'][uid]; body = page.locator('#study > .translation')
        expect(body).to_be_visible()
        page.wait_for_function("([selector,n])=>document.querySelector(selector)?.textContent.length===n",
                               arg=['#study > .translation', min(6000, g['body_characters_utf16'] - offset)])
        text = body.text_content(); inputs.validate_window(text, uid, offset, prepared)
        notes, paratext = dom_notes(page, inputs, prepared, uid, expect)
        require(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'NO_HORIZONTAL_OVERFLOW')
        if mode == 'a11y':
            axe = regular(root / 'node_modules/axe-core/axe.min.js'); require(sha(axe) == AXE_SHA, 'PINNED_AXE_ASSET')
            page.evaluate(axe.decode('utf-8'))
            violations = page.evaluate("async()=>{let x=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return x.violations.map(v=>({id:v.id,impact:v.impact}))}")
            report['a11y']['scans'] += 1; report['a11y']['violations'] += len(violations)
            require(not violations, 'AUTOMATED_A11Y_VIOLATION')
        return text, notes, paratext
    def full_source(uid, account=False):
        first, notes, paratext = check_page(uid, 0)
        if uid == 'tha-ap414':
            def click_next():
                if not account:
                    activate(page.get_by_role('button', name='Next English page →', exact=True)); return
                require(uid in native_first, 'FIRST_NATIVE_RESPONSE_CURSOR_WITNESS_REQUIRED')
                def next_request(request):
                    command = (request.post_data_json or {}).get('params', {}) if request.method == 'POST' else {}
                    return request.url == client.base + '/mcp' and command.get('name') == 'get_translation'
                with page.expect_request(next_request, timeout=15000) as pending:
                    activate(page.get_by_role('button', name='Next English page →', exact=True))
                actual = (pending.value.post_data_json or {}).get('params', {})
                require(json.dumps(actual, sort_keys=True, ensure_ascii=False) ==
                        json.dumps(native_first[uid]['continue_with'], sort_keys=True, ensure_ascii=False),
                        'NEXT_REQUEST_EQUALS_FIRST_NATIVE_EMITTED_CONTINUATION')
            if keyboard and account:
                # Hold only one genuine continuation response; source words are never fabricated.
                held = {}
                def hold_continuation(route):
                    request = route.request
                    command = (request.post_data_json or {}).get('params', {}) if request.method == 'POST' else {}
                    arguments = command.get('arguments', {})
                    if command.get('name') != 'get_translation' or arguments.get('uid') != uid or arguments.get('offset') != 6000:
                        route.fallback(); return
                    require(not held and request.url == client.base + '/mcp' and
                            not any(utilities.private_text(value, [MARKER]) for value in
                                    [request.url, request.post_data or '', *request.headers.keys(), *request.headers.values()]),
                            'BOUNDED_PRIVATE_SAFE_CONTINUATION_HOLD')
                    state['calls'].append(copy.deepcopy(command))
                    response = route.fetch(); result = response.json()['result']
                    require(not result.get('isError'), 'GENUINE_CONTINUATION_REQUIRED')
                    data = result['structuredContent']; proof = next(r for r in prepared['goldens'][uid]['pages500'] if r['offset'] == 6000)
                    require(data['text_id'] == uid and data['translation_revision'] == REV and
                            data['translation_id'] == 'ap:chapter-3/poem-412' and data['limit'] == 6000 and
                            data['offset'] == 6000 and data['prefix_sha256'] == proof['start_prefix_sha256'] and
                            data['next_offset'] is None and data['continue_with'] is None and
                            utf16(data['text']) == 1546, 'GENUINE_SOURCE_PINNED_1546_RESPONSE')
                    inputs.validate_window(data['text'], uid, 6000, prepared)
                    held.update(route=route, response=response)
                pattern = '**/mcp'; page.route(pattern, hold_continuation)
                try:
                    click_next()
                    deadline = time.monotonic() + 15
                    while not held and time.monotonic() < deadline:
                        page.wait_for_timeout(10)
                    require(bool(held), 'CONTINUATION_HOLD_DEADLINE')
                    expect(page.locator('#study')).to_be_focused()
                    query = page.locator('#query')
                    if not query.is_visible():
                        page.locator('#find-panel > summary').click()
                    query.fill('synthetic focus selection'); query.focus()
                    query.evaluate('(e)=>e.setSelectionRange(1,3)')
                    held['route'].fulfill(response=held['response']); held['released'] = True
                    tail, later, later_paratext = check_page(uid, 6000)
                    expect(query).to_be_focused()
                    require(query.evaluate('(e)=>[e.selectionStart,e.selectionEnd]') == [1, 3],
                            'LATE_ENGLISH_COMPLETION_PRESERVES_QUERY_FOCUS_AND_CARET')
                    count('continuation_focus')
                finally:
                    if held and not held.get('released'):
                        held['route'].abort()
                    page.unroute(pattern, hold_continuation)
            else:
                click_next()
                tail, later, later_paratext = check_page(uid, 6000)
            require(later == notes and later_paratext == paratext, 'NOTES_AND_PARATEXT_STABLE_ACROSS_ACTUAL_PAGES')
            require(page.get_by_role('button', name='Next English page →', exact=True).count() == 0, 'TERMINAL_ENGLISH_PAGE')
            first += tail
        inputs.validate_body(first, notes, paratext, uid, prepared)
        if account:
            count('native_sources'); count('native_english_pages', 2 if uid == 'tha-ap414' else 1)
    def navigation():
        utilities.read_tool(page, 'English sources')
        nav = page.get_by_role('region', name='Reviewed publisher edition navigation', exact=True)
        detail = nav.locator('details')
        if detail.get_attribute('open') is None:
            detail.locator(':scope > summary').click()
        picker = nav.get_by_role('combobox'); expect(picker).to_have_count(1)
        expected = [{'id': r['id'], 'label': 'Publisher poem ' + str(r['poem']) + ' · ' + prepared['english']['profiles'][r['id']]['title'] + ' · ' + r['id']}
                    for r in prepared['navigation']]
        require(picker.locator('option').evaluate_all('xs=>xs.map(x=>({id:x.value,label:x.textContent}))') == expected,
                'COMPLETE354_PUBLISHER_ORDER_OPTIONS_AND_LABELS')
        return nav, picker
    def export_current():
        with page.expect_download() as pending:
            activate(page.get_by_role('button', name='Export bookmarks and notes', exact=True))
        return json.loads(Path(pending.value.path()).read_bytes())
    try:
        phase = 'old positional bookmarks refuse without rewriting private records'
        for item in old:
            utilities.saved(page, entry); stored = page.evaluate('k=>localStorage.getItem(k)', KEY)
            activate(page.get_by_role('region', name='Saved passage results').get_by_role('link', name=item['title'] + ' · ' + item['ref'], exact=True))
            expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
            expected = 'source or citation mapping revision changed' if 'source_commit' in item else 'unversioned numeric position is ambiguous'
            require(expected in page.locator('#view').text_content() and page.locator('.passage').count() == 0 and
                    PRIVATE not in page.locator('#view').text_content(), 'TYPED_OLD_REFUSAL_NO_SUBSTITUTION')
            require(page.evaluate('k=>localStorage.getItem(k)', KEY) == stored, 'OLD_PRIVATE_STORAGE_UNCHANGED')
            count('old_refusals')
        for pub, uid in PAIRS:
            phase = 'browse search publisher navigation and complete original English'
            before = sum(c.get('name') == 'get_translation' for c in state['calls'])
            page.goto(entry); activate(page.get_by_role('link', name='Library', exact=True))
            page.locator('#view a.entry[href="#browse?node=ap"]').click()
            page.locator('#view a.entry[href^="#read?uid="]').first.wait_for()
            query = page.locator('#query')
            if not query.is_visible():
                page.locator('#find-panel > summary').click()
            query.fill(units[uid]['title']); activate(page.locator('#search-form button'))
            expect(page.get_by_role('heading', name='Results for “' + units[uid]['title'] + '”', exact=True)).to_be_visible()
            page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
            results = page.locator('#view a.entry[href^="#read?"]').filter(has_text=units[uid]['title'])
            wanted = [x for x in results.all() if utilities.fields(x.get_attribute('href')).get('uid') == uid]
            require(wanted and len(results.all()) <= 15, 'SOURCE_OWNER_IN_UNCHANGED_SEARCH_CAP')
            go(uid, lambda: activate(wanted[0]))
            nav, picker = navigation(); at = next(i for i, r in enumerate(prepared['navigation']) if r['id'] == uid)
            previous = prepared['navigation'][at - 1] if at else None
            following = prepared['navigation'][at + 1] if at + 1 < len(prepared['navigation']) else None
            siblings = nav.get_by_role('navigation', name='Reviewed publisher poem sequence', exact=True)
            for other, prefix in ((previous, '← Previous reviewed poem · '), (following, 'Next reviewed poem · ')):
                links = siblings.get_by_role('link').filter(has_text=prefix)
                require(links.count() == int(other is not None), 'EXACT_PREVIOUS_NEXT_REVIEWED_MEMBERSHIP')
                if other:
                    label_matches = links.text_content() == prefix + str(other['poem']) + (' →' if prefix == 'Next reviewed poem · ' else '')
                    route_matches = utilities.fields(links.get_attribute('href')) == {'uid': other['id'], 'offset': '0',
                            'page_source': roots[other['id']][0]['expected_source_pin']}
                    if not (label_matches and route_matches) and 'adjacent_source_diagnostic' not in report:
                        report['adjacent_source_diagnostic'] = {'ownerUID': uid,
                            'direction': 'next' if prefix == 'Next reviewed poem · ' else 'previous',
                            'label_matches': label_matches, 'route_matches': route_matches}
                    require(label_matches and route_matches, 'EXACT_ADJACENT_SOURCE_PIN_ROUTE')
            adjacent = following or previous; target = adjacent['id']
            go(target, lambda: activate(siblings.get_by_role('link', name=('Next reviewed poem · ' if following else '← Previous reviewed poem · ') + str(adjacent['poem']) + (' →' if following else ''), exact=True)))
            count('edition_switches'); nav, picker = navigation(); picker.select_option(uid)
            go(uid, lambda: activate(nav.get_by_role('button', name='Open reviewed poem', exact=True))); count('edition_switches')
            require(sum(c.get('name') == 'get_translation' for c in state['calls']) == before, 'BROWSE_SEARCH_EDITION_NO_AUTO_ENGLISH')
            open_source(uid); full_source(uid, True)
            chosen = next(s for s in roots[uid] if s['type'] == 'verse'); go(uid)
            activate(page.get_by_role('button', name='Save passage ' + chosen['ref'], exact=True))
            utilities.saved(page, entry); page.get_by_label('Search saved passages and notes', exact=True).fill(chosen['ref'])
            result = page.get_by_role('region', name='Saved passage results'); expect(result.locator('article')).to_have_count(1)
            field = result.get_by_label('Your personal note', exact=True); field.fill(PRIVATE + ' ' + uid)
            activate(result.get_by_role('button', name='Save note', exact=True))
            records = utilities.profile(page)['saved']; require(records[:4] == old, 'OLD_RECORDS_PRESERVED_AFTER_NEW_PRIVATE_NOTE')
            fresh = next(r for r in records if r['uid'] == uid)
            require(fresh['source_commit'] == chosen['expected_source_pin'] and fresh['ref'] == chosen['ref'] and
                    fresh['offset'] == chosen['offset'], 'FRESH_SAVED_SOURCE_POSITION_PIN')
            link = result.get_by_role('link', name=fresh['title'] + ' · ' + chosen['ref'], exact=True)
            expected_link = utilities.fields(link.get_attribute('href'))
            require(expected_link == {'uid': uid, 'offset': str(chosen['offset']), 'ref': chosen['ref'],
                                      'source': chosen['expected_source_pin']}, 'EXACT_CURRENT_SAVED_LINK')
            before_reopen = sum(c.get('name') == 'get_translation' for c in state['calls'])
            go(uid, lambda: activate(link), chosen['offset']); go(uid, page.reload, chosen['offset'])
            require(sum(c.get('name') == 'get_translation' for c in state['calls']) == before_reopen, 'REOPEN_RELOAD_REQUIRES_ENGLISH_CONSENT')
            utilities.read_tool(page, 'Copy reading link').click()
            copied = page.get_by_role('link', name='Exact reading link · open or long-press to copy', exact=True)
            expect(copied).to_be_visible()
            require(utilities.fields(copied.get_attribute('href')) == expected_link, 'COPIED_READING_LINK_EXACT_REF_OFFSET_PIN')
            activate(copied); ready(page, roots[uid], chosen['offset'], expect)
            go(uid, page.reload, chosen['offset'])
            require(sum(c.get('name') == 'get_translation' for c in state['calls']) == before_reopen,
                    'COPIED_LINK_RELOAD_REQUIRES_ENGLISH_CONSENT')
            count('new_saved_roundtrips')
            stored = page.evaluate('k=>localStorage.getItem(k)', KEY)
            wrong = entry + '#read?' + urllib.parse.urlencode({**expected_link, 'source': '0' * 40})
            page.goto(wrong); expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
            require(page.locator('.passage').count() == 0 and page.evaluate('k=>localStorage.getItem(k)', KEY) == stored,
                    'SOURCE_PIN_DRIFT_REFUSAL_NO_RECORD_REWRITE')
            count('source_pin_refusals')
        phase = 'positive before exact source counterfactuals'
        if width == 390:
            for uid, kind in (('tha-ap413', 'body'), ('tha-ap413', 'heading'), ('tha-ap414', 'note'),
                              ('tha-ap420', 'paratext'), ('tha-ap414', 'revision')):
                open_source(uid); full_source(uid)
                data = baseline[uid]
                if kind == 'body':
                    patch = {'text': data['text'].replace(' (18) [4285]', ' (17) [4285]', 1)}
                    require(patch['text'] != data['text'], 'GENUINE_INTERNAL_NUMERIC_MARKER_COUNTERFACTUAL')
                elif kind == 'heading':
                    patch = {'publisher_paratext': 'X' + data['publisher_paratext'][1:]}
                elif kind == 'note':
                    notes = copy.deepcopy(data['translator_notes']); note = next(n for n in notes if n['number'] == 85)
                    note['text'] += '”'; patch = {'translator_notes': notes}
                elif kind == 'paratext':
                    patch = {'publisher_paratext': ' '}
                else:
                    patch = {'translation_revision': '0' * 40}
                # The original finite utility checks the genuine source body before changing metadata.
                expected_body = prepared['goldens'][uid]['body_sha256'] if uid != 'tha-ap414' else next(r for r in prepared['goldens'][uid]['pages500'] if r['offset'] == 6000)['start_prefix_sha256']
                state['expected'] = {'id': uid, 'body_sha256': expected_body}; state['patch'] = patch
                open_source(uid); expect(page.get_by_role('button', name='Retry selected source', exact=True)).to_be_visible()
                expect(page.locator('#study > .translation')).to_have_count(0)
                state['patch'] = None; activate(page.get_by_role('button', name='Retry selected source', exact=True))
                full_source(uid); count('native_tamper_controls')
        phase = 'private offline export and exact cancel restore'
        utilities.saved(page, entry); page.get_by_label('Search saved passages and notes', exact=True).fill('')
        if width == 390:
            page.get_by_label('Search saved passages and notes', exact=True).fill('tha-ap421')
            expect(page.get_by_role('region', name='Saved passage results').locator('article')).to_have_count(1)
            calls = len(state['calls']); context.set_offline(True)
            try:
                field = page.get_by_role('region', name='Saved passage results').get_by_label('Your personal note', exact=True).last
                field.fill(PRIVATE + ' offline')
                activate(page.get_by_role('region', name='Saved passage results').get_by_role('button', name='Save note', exact=True).last)
                exported = export_current(); require(len(state['calls']) == calls, 'LOCAL_OFFLINE_NOTE_EXPORT_NO_TOOL_CALL')
                count('offline_personal_notes')
            finally:
                context.set_offline(False)
        else:
            exported = export_current()
        records = utilities.profile(page)['saved']
        require(exported['saved'] == records and records[:4] == old and len(records) == 12, 'EXACT_PRIVATE_EXPORT_OLD_FIELDS_AND_EIGHT_NEW_PINS')
        require(all(r['source_commit'] == roots[r['uid']][r['offset']]['expected_source_pin'] for r in records[4:]), 'NO_AUTOMATIC_PIN_MIGRATION')
        # Restore into a second genuinely isolated local profile, never a shared/global cache.
        restored, create, restore_state = utilities.guarded_context(browser, client.base,
            {'theme': theme, 'remember_position': False, 'saved': [], 'reading_progress': []}, width, [MARKER],
            {'has_touch': touch, 'is_mobile': width == 390})
        try:
            other = create(); utilities.saved(other, entry)
            upload = other.get_by_label('Restore bookmarks and notes from a JSON export', exact=True)
            payload = {'name': 'synthetic-study.json', 'mimeType': 'application/json', 'buffer': packed(exported).encode()}
            upload.set_input_files(payload)
            expect(other.get_by_role('heading', name='Review bookmark import', exact=True)).to_be_visible()
            other.get_by_role('button', name='Cancel import', exact=True).click()
            require(utilities.profile(other)['saved'] == [], 'CANCEL_IMPORT_INERT')
            upload.set_input_files(payload)
            other.get_by_role('button', name='Add 12 new bookmarks', exact=True).click()
            expect(other.get_by_role('region', name='Saved passage results').locator('article')).to_have_count(12)
            require(utilities.profile(other)['saved'] == records, 'RESTORE_EXACT_ALL_PRIVATE_FIELDS_AND_OLD_OPTIONAL_ABSENCE')
            utilities.audit_state(restore_state); count('private_restore')
        finally:
            restored.close()
        utilities.audit_state(state); require(len(state['calls']) <= 768, 'FINITE_NATIVE_CALL_BOUND')
        require(PRIVATE not in page.title(), 'PRIVATE_NOT_IN_DOCUMENT_TITLE')
        report['checks'].append({'width': width, 'theme': theme, 'emulated_touch': touch, 'keyboard': keyboard,
                                 'source_owners': [u for _, u in PAIRS], 'all_private_records_preserved': True})
    finally:
        context.close()


def main():
    global phase
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--mode', choices=('normal', 'a11y', 'installed'), required=True)
    for name in ('source-root', 'server-dir', 'publisher-root', 'report'):
        ap.add_argument('--' + name, type=Path, required=True)
    ap.add_argument('--browser', default='/usr/bin/chromium')
    args = ap.parse_args(); root, server, publisher = args.source_root.absolute(), args.server_dir.absolute(), args.publisher_root.absolute()
    require(root == Path(__file__).absolute().parents[1], 'FIXED_ACTUAL_SOURCE_ROOT')
    require(not args.report.exists() and os.name == 'posix', 'FRESH_REPORT_POSIX_OWNED_GROUPS')
    signal.signal(signal.SIGALRM, lambda *_: (_ for _ in ()).throw(ValueError('OVERALL_300_SECOND_DEADLINE')))
    signal.alarm(300)
    inputs = load_fixed(root, INPUTS, INPUTS_SHA, 'reviewed_eight_browser_inputs')
    utilities = load_fixed(root, UTILITY, UTILITY_SHA, 'reviewed_five_browser_utilities')
    sys.path.insert(0, str(root / 'scripts'))
    phase = 'one shared current source capture and exact target34 comparison'
    prepared = inputs.capture_inputs(root, server, publisher, args.mode)
    roots, units = roots_from_server(server, prepared, utilities)
    report.update(mode=args.mode, canonical_sha256=CANON, current_source_count=394,
                  source_goldens_sha256=inputs.GOLDEN_ENTRIES_SHA, actual_target34=prepared['runtime'],
                  fixture_mode='eight-exact-pinned-originals', a11y={'performed': args.mode == 'a11y', 'scans': 0, 'violations': 0})
    from playwright.sync_api import sync_playwright, expect
    with tempfile.TemporaryDirectory(prefix='pali411419-') as temporary:
        stage = Path(temporary).resolve(strict=True)
        with epoch(utilities, server, stage, prepared, publisher) as client:
            phase = 'full source positives then hard500 actual cursor chain and explicit refusals'
            baseline = api_cases(client, inputs, prepared)
            with sync_playwright() as pw:
                browser = pw.chromium.launch(executable_path=args.browser, headless=True)
                report['browser_version'] = browser.version
                try:
                    for cell in CELLS:
                        run_cell(utilities, inputs, client, browser, root, stage, prepared, roots, units, baseline, args.mode, cell, expect)
                finally:
                    browser.close()
    expected = {'whole_sources': 8, 'hard500_pages': 54, 'api_refusals': 24, 'old_refusals': 8,
                'edition_switches': 32, 'native_sources': 16, 'native_english_pages': 18,
                'new_saved_roundtrips': 16, 'source_pin_refusals': 16,
                'native_tamper_controls': 5, 'offline_personal_notes': 1, 'private_restore': 2, 'continuation_focus': 1}
    require(report['counts'] == expected, 'EXACT_COMPLETE_COUNTS_NO_ASSERTION_SKIPS')
    require(inputs.inventory(server) == prepared['runtime'], 'TARGET34_UNCHANGED_AFTER_JOURNEYS')
    require(sha(regular(root / INPUTS)) == INPUTS_SHA and sha(regular(root / UTILITY)) == UTILITY_SHA, 'REUSED_CODE_UNCHANGED_DURING_JOURNEYS')
    # Extra positive/retry scans are recorded, not mislabeled as just the 18 owner-page matrix.
    require(report['a11y']['scans'] == (32 if args.mode == 'a11y' else 0), 'EXACT_AUTOMATED_SCAN_SCOPE')
    signal.alarm(0); report['status'] = 'passed'


if __name__ == '__main__':
    if '--help' in sys.argv or '-h' in sys.argv:
        main()
    try:
        main()
    except Exception as error:
        report.update(status='failed', failure={'phase': phase, 'category': type(error).__name__,
            'code': str(error) if isinstance(error, ValueError) and re.fullmatch('[A-Z0-9_]+', str(error)) else 'OPERATION_FAILED',
            'frames': [{'file': Path(frame.filename).name, 'line': frame.lineno, 'function': frame.name}
                       for frame in traceback.extract_tb(error.__traceback__)]})
    finally:
        text = json.dumps(report, indent=2) + '\n'
        if '--report' in sys.argv:
            destination = Path(sys.argv[sys.argv.index('--report') + 1])
            if not destination.exists():
                destination.parent.mkdir(parents=True, exist_ok=True); destination.write_text(text, encoding='utf-8')
        print(text); sys.exit(0 if report['status'] == 'passed' else 1)
