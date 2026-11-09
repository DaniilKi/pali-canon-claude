#!/usr/bin/env python3
"""Focused real-engine study acceptance, with actual bundled Pāli and private fixtures.

No engine substitution, publisher English fetch, source reconstruction or physical
Safari/device certification. Clipboard denial, an old pin and a held abort-ignoring
response are explicit fixtures. Bookmarks/source revisions and plan marks are real.
"""
import argparse
import copy
import importlib.metadata
import json
import os
import pathlib
import re
import socket
import subprocess
import time
import urllib.parse

from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool, source_position
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_COMPAT_NOTE_'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--engine', choices=['chromium', 'firefox', 'webkit'], default='chromium')
parser.add_argument('--executable', type=pathlib.Path, help='Optional executable for the selected engine only; PALI_BROWSER applies only to Chromium.')
parser.add_argument('--server-dir', type=pathlib.Path)
parser.add_argument('--report')
parser.add_argument('--a11y', action='store_true')
args = parser.parse_args()
started = time.monotonic()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
checks, scans, source_receipts = [], [], []
engine_info = {'requested': args.engine, 'playwright': importlib.metadata.version('playwright')}
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
                          env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'},
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def tool(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    request = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(),
                                    headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(request, timeout=30))['result']
    assert not result.get('isError'), result
    return result['structuredContent']


def revision(data):
    return data['source'].get('locator_revision', data['source']['commit'])


def make_case(label, context, name, arguments, selector):
    data = tool(name, {**arguments, 'offset': 0, 'limit': 30, 'script': 'roman'})
    index, segment = next((i, s) for i, s in enumerate(data['segments']) if s['type'] != 'heading')
    mark = {'uid': selector, 'ref': segment['ref'], 'title': data.get('title') or data.get('book', {}).get('title') or data.get('citation') or data['book_id'],
            'note': '', 'offset': data['offset'] + index, 'source_commit': revision(data)}
    source_receipts.append({'kind': label, 'uid': selector, 'ref': mark['ref'], 'offset': mark['offset'], 'revision': mark['source_commit'],
                            'attribution': data['source'].get('attribution'), 'terms': data['source'].get('terms')})
    return {'label': label, 'context': context, 'data': data, 'mark': mark}


def profile(page):
    return page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)


def url(context):
    return base + '/#read?' + urllib.parse.urlencode(context)


def report(status, error_type=None):
    result = {'status': status, 'passed': len(checks), 'checks': checks, 'engine': engine_info,
              'outside_source_tree': bool(args.server_dir), 'duration_seconds': round(time.monotonic() - started, 2),
              'actual_sources': source_receipts,
              'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
              'limits': 'Actual bundled canonical/root-book/direct-commentary/post-canonical text, identities, revisions and plan signatures. Notes are synthetic UTF-8/private markup fixtures. Clipboard denial, controlled old source pin, retained stale file/callback and a held real-data response with abort-ignoring transport are explicit fixtures. No publisher English fetch or source activation. Source codepoints and layout are checked, not OS glyph shaping or human screen-reader output. Desktop Firefox/WebKit engines are not physical Firefox devices, iOS/Safari, Mobile Files, OS clipboard or printer certification. Axe contexts alone bypass CSP; normal contexts preserve production CSP.'}
    if error_type:
        result['error_type'] = error_type
    text = json.dumps(result, indent=2)
    print(text)
    if args.report:
        pathlib.Path(args.report).write_text(text + '\n', encoding='utf-8')
    return result


try:
    for _ in range(100):
        try:
            urllib.request.urlopen(base + '/healthz', timeout=1)
            break
        except Exception:
            time.sleep(.1)
    else:
        raise AssertionError('Bundled server did not become ready')
    book_id = tool('browse_canon', {'node': 'books', 'limit': 60})['items'][0]['read_with']['book']
    commentary_id = tool('get_commentary', {'uid': 'commentary', 'limit': 40})['books'][0]['uid']
    post_id = tool('get_post_canonical', {'limit': 40})['items'][0]['id']
    sources = [make_case('canonical', {'uid': 'dhp183'}, 'get_text', {'uid': 'dhp183'}, 'dhp183'),
               make_case('complete root book', {'book': book_id}, 'get_text', {'book': book_id}, 'book:' + book_id),
               make_case('direct commentary', {'kind': 'commentary', 'uid': commentary_id}, 'get_commentary', {'uid': commentary_id}, commentary_id),
               make_case('post-canonical', {'kind': 'post', 'uid': post_id}, 'get_post_canonical', {'citation': post_id}, 'post:' + post_id)]
    canonical, root_book = sources[:2]
    navigation_source = next(s for s in sources if s['data'].get('next_offset') is not None and s['data']['total_segments'] > s['data']['next_offset'] + 1)
    navigation_offset = navigation_source['data']['next_offset']
    navigation_tool = 'get_text' if 'book' in navigation_source['context'] or 'kind' not in navigation_source['context'] else 'get_commentary' if navigation_source['context']['kind'] == 'commentary' else 'get_post_canonical'
    navigation_args = ({'book': navigation_source['context']['book']} if 'book' in navigation_source['context'] else
                       {'citation' if navigation_tool == 'get_post_canonical' else 'uid': navigation_source['context']['uid']})
    navigation_page = tool(navigation_tool, {**navigation_args, 'offset': navigation_offset, 'limit': 30, 'script': 'roman'})
    native = tool('get_text', {'uid': 'dhp183', 'offset': 0, 'limit': 30, 'script': 'sinhala'})
    late_pali = tool('get_text', {'uid': 'mn10', 'offset': 0, 'limit': 30, 'script': 'roman'})
    catalog = tool('reading_plan', {})
    plan = next(p for p in catalog['plans'] if p['days'] >= 2)
    progress = []
    for day in [1, 2]:
        d = tool('reading_plan', {'name': plan['name'], 'day': day})
        signature = compact({'name': d['name'], 'day': d['day'], 'source': d['source']['pali']['commit'],
                             'readings': [{'id': r['id'], 'offset': r['get_text'].get('offset', 0), 'limit': r['get_text'].get('limit'),
                                           'part': r.get('part'), 'of': r.get('of')} for r in d['readings']]})
        progress.append({'name': d['name'], 'day': d['day'], 'signature': signature})

    with sync_playwright() as pw:
        browser_type = getattr(pw, args.engine)
        executable = str(args.executable.resolve()) if args.executable else os.environ.get('PALI_' + args.engine.upper() + '_BROWSER')
        if not executable and args.engine == 'chromium':
            executable = os.environ.get('PALI_BROWSER') or ('/usr/bin/chromium' if pathlib.Path('/usr/bin/chromium').is_file() else None)
        # Firefox/WebKit never inherit PALI_BROWSER and never fall back to Chromium.
        browser = browser_type.launch(headless=True, **({'executable_path': executable} if executable else {}))
        assert browser.browser_type.name == args.engine
        engine_info.update(actual=browser.browser_type.name, version=browser.version,
                           executable=executable or browser_type.executable_path, executable_kind='explicit/system' if executable else 'Playwright managed')
        expect.set_options(timeout=30000)

        for width, theme in [(w, t) for w in [390, 1280] for t in ['light', 'dark']]:
            def passed(name):
                checks.append({'width': width, 'theme': theme, 'check': name})
                print(f'{args.engine} {width}px {theme}: {name}', flush=True)

            def environment(saved=None, marks=None, last=None):
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                seed = {'theme': theme, 'font': 30, 'remember_position': False, 'saved': copy.deepcopy(saved or []), 'reading_progress': copy.deepcopy(marks or [])}
                if last is not None:
                    seed['last'] = last
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(json.dumps(seed)) + ");" +
                    "Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Controlled clipboard denial')}}});" +
                    "window.compatIgnoreNextAbort=false;window.compatHeld=0;window.compatHeldBodyComplete=false;const compatFetch=window.fetch.bind(window);window.fetch=(url,options)=>{" +
                    "if(window.compatIgnoreNextAbort&&options?.signal&&JSON.parse(options.body||'{}').params?.name==='get_text'){window.compatIgnoreNextAbort=false;const {signal,...rest}=options;return compatFetch(url,rest).then(async response=>{await response.clone().text();window.compatHeldBodyComplete=true;document.documentElement.setAttribute('data-compat-held-body-complete','true');return response})}return compatFetch(url,options)};")
                state = {'calls': [], 'forbidden': [], 'errors': [], 'hold': False, 'held': []}

                def intercept(route):
                    request = route.request
                    if PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or '') or not request.url.startswith(base + '/'):
                        state['forbidden'].append(request.url)
                        route.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        payload = request.post_data_json
                        params = payload.get('params', {})
                        state['calls'].append(copy.deepcopy(params))
                        name, arguments = params.get('name'), params.get('arguments', {})
                        if name not in {'get_text', 'get_commentary', 'get_post_canonical', 'browse_canon', 'reading_plan'} or name == 'get_text' and 'translation' in arguments or name == 'reading_plan' and arguments:
                            state['forbidden'].append(params)
                            route.abort()
                        elif state['hold'] and name == 'get_text' and arguments.get('uid') == 'mn10':
                            state['held'].append(route)
                            request.frame.evaluate("document.documentElement.setAttribute('data-compat-held',String(++window.compatHeld))")
                        else:
                            route.continue_()
                    else:
                        route.continue_()

                context.route('**/*', intercept)
                page = context.new_page()
                page.set_default_timeout(30000)
                page.on('pageerror', lambda error: state['errors'].append(str(error)))
                return context, page, state

            def privacy(page, state):
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert not state['forbidden'] and not state['errors'], state
                expect(page.locator('#view img, #view script')).to_have_count(0)
                assert page.evaluate('window.compatInjected') is None

            def audit(page, state, label):
                privacy(page, state)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{args.engine} {width}px {theme}: {label} overflow'
                if args.a11y:
                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                    d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width': width, 'theme': theme, 'state': label,
                                  'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})

            def ready(page, source, data=None, expected_url=None):
                data = data or source['data']
                expect(page).to_have_url(expected_url or url(source['context']))
                title = data.get('title') or data.get('book', {}).get('title') or data.get('book_id')
                expect(page.locator('#view > h2')).to_have_text((data['citation'] + ' · ' if data.get('citation') else '') + title)
                text = page.locator('section[aria-label="Pāli passage"] .segment .passage')
                expect(text).to_have_text([s['text'] for s in data['segments']])
                assert text.all_text_contents() == [s['text'] for s in data['segments']], 'Source codepoints/whitespace changed'
                expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)

            def saved(page):
                page.goto(base + '/#saved')
                expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
                expect(page).to_have_url(base + '/#saved')

            def saved_item(page, mark):
                return page.get_by_role('region', name='Saved passage results').locator('article').filter(
                    has=page.get_by_text(mark['title'] + ' · ' + mark['ref'], exact=True))

            context, page, state = environment(marks=progress[:1])
            engine_info.setdefault('user_agent', page.evaluate('navigator.userAgent'))
            actual_marks = []
            for source in sources:
                page.goto(url(source['context']))
                ready(page, source)
                mark = source['mark']
                exact = page.get_by_role('link', name='Open exact passage ' + mark['ref'], exact=True)
                fields = dict(urllib.parse.parse_qsl(exact.get_attribute('href').split('?', 1)[1]))
                assert fields['ref'] == mark['ref'] and fields['source'] == mark['source_commit'] and int(fields['offset']) == mark['offset']
                save = page.get_by_role('button', name='Save passage ' + mark['ref'], exact=True)
                save.focus()
                page.keyboard.press('Enter')
                expect(save).to_have_attribute('aria-pressed', 'true')
                assert profile(page)['saved'][-1] == mark
                actual_marks.append(copy.deepcopy(mark))
                if source['label'] in ['direct commentary', 'post-canonical']:
                    expect(page.locator('#view > .eyebrow')).to_contain_text('NOT CANON')
                privacy(page, state)
                passed(source['label'] + ': actual source wording/codepoints and exact revision/ref/offset survive keyboard bookmarking')

            page.goto(url(navigation_source['context']))
            ready(page, navigation_source)
            navigation_ref = navigation_source['mark']['ref']
            navigation_region = page.get_by_role('region', name='Personal note for ' + navigation_ref, exact=True)
            navigation_region.get_by_role('button', name='View/edit personal note', exact=True).click()
            navigation_draft = PRIVATE + 'retained through source-position navigation'
            navigation_field = navigation_region.get_by_label('Your personal note for ' + navigation_ref, exact=True)
            navigation_field.fill(navigation_draft)
            form = source_position(page)
            position = form.get_by_label('Go to source position', exact=True)
            before_calls, before_url = len(state['calls']), page.url
            position.fill('0'); form.get_by_role('button', name='Go', exact=True).click()
            expect(form.get_by_role('alert')).to_be_visible(); expect(position).to_be_focused()
            expect(navigation_field).to_have_value(navigation_draft)
            assert len(state['calls']) == before_calls and page.url == before_url
            position.fill(str(navigation_offset + 1)); position.press('Enter')
            expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in navigation_page['segments']])
            fields = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(page.url).fragment.split('?', 1)[1]))
            assert fields == {**navigation_source['context'], 'offset': str(navigation_offset), 'page_source': revision(navigation_source['data'])}
            previous = page.get_by_role('link', name='← Previous page', exact=True)
            previous_href = previous.get_attribute('href')
            previous_fields = dict(urllib.parse.parse_qsl(previous_href.split('?', 1)[1]))
            assert previous_fields == {**navigation_source['context'], 'offset': '0', 'page_source': revision(navigation_source['data'])}
            previous.focus(); page.keyboard.press('Enter')
            ready(page, navigation_source, expected_url=base + '/' + previous_href)
            expect(navigation_region.get_by_label('Your personal note for ' + navigation_ref, exact=True)).to_have_value(navigation_draft)
            privacy(page, state)
            passed('source-position jump and Previous use actual revision-only page pins; invalid input sends no request and the private draft survives returning to its actual ref')

            page.goto(url(canonical['context']))
            ready(page, canonical)
            preferences = page.locator('details.preferences')
            preferences.locator('summary').focus()
            page.keyboard.press('Enter')
            script = page.get_by_role('combobox', name='Pāli script', exact=True)
            expect(script).to_be_visible()
            script.select_option('sinhala')
            ready(page, canonical, native)
            assert [s['ref'] for s in native['segments']] == [s['ref'] for s in canonical['data']['segments']]
            assert revision(native) == revision(canonical['data'])
            script.select_option('roman')
            ready(page, canonical)
            remember = page.get_by_label('Remember reading position on this device', exact=True)
            remember.focus()
            page.keyboard.press('Space')
            expect(remember).to_be_checked()
            page.keyboard.press('Space')
            expect(remember).not_to_be_checked()
            assert profile(page)['remember_position'] is False and 'last' not in profile(page)
            preferences.locator('summary').focus()
            page.keyboard.press('Space')
            expect(script).to_be_hidden()
            audit(page, state, 'native-script roundtrip and keyboard preferences')
            passed('native details/checkbox keyboard actions and Sinhala→Roman roundtrip preserve actual source codepoints, refs, revisions and opt-out')

            ref = canonical['mark']['ref']
            region = page.get_by_role('region', name='Personal note for ' + ref, exact=True)
            region.get_by_role('button', name='View/edit personal note', exact=True).focus()
            page.keyboard.press('Enter')
            field = region.get_by_label('Your personal note for ' + ref, exact=True)
            expect(field).to_be_focused()
            unicode_note = PRIVATE + 'පුද්ගලික नोट <img src=x onerror=window.compatInjected=true>'
            before = len(state['calls'])
            field.fill(unicode_note)
            privacy(page, state)
            # Critical cross-engine highlight path only; the dedicated suite owns
            # the legacy/stale/duplicate metadata matrix.
            part = region.locator('xpath=..')
            expect(part).to_have_class(re.compile(r'\bpersonal-highlight\b'))
            if preferences.get_attribute('open') is None:
                preferences.locator('summary').click()
            highlight = page.locator('#highlight-saved')
            highlight.focus()
            before_highlight = profile(page)
            body = part.locator('.passage').element_handle()
            body_html = body.inner_html()
            for enabled in [False, True]:
                page.keyboard.press('Space')
                expect(highlight).to_be_checked() if enabled else expect(highlight).not_to_be_checked()
                expect(highlight).to_be_focused()
                assert part.evaluate('(e)=>e.classList.contains("personal-highlight")') == enabled
                assert body.evaluate('(e)=>e.isConnected') and body.inner_html() == body_html
                expect(field).to_have_value(unicode_note)
                assert profile(page) == {**before_highlight, 'highlight_saved': enabled}
                assert len(state['calls']) == before
            passed('live verified-source highlight off/on preserves the existing Pāli node, typed draft, keyboard focus and other private data without an API call')
            region.get_by_role('button', name='Save note', exact=True).focus()
            page.keyboard.press('Enter')
            expect(page.locator('#status')).to_contain_text('Personal note saved')
            assert profile(page)['saved'][0]['note'] == unicode_note and len(state['calls']) == before
            field.fill('')
            save = page.get_by_role('button', name='Save passage ' + ref, exact=True)
            save.click()
            confirmation = page.get_by_role('group', name='Confirm bookmark and note removal', exact=True)
            expect(confirmation.get_by_role('button', name='Cancel removal', exact=True)).to_be_focused()
            page.keyboard.press('Enter')
            expect(save).to_be_focused()
            expect(field).to_have_value('')
            assert profile(page)['saved'][0]['note'] == unicode_note
            region.get_by_role('button', name='Close note editor', exact=True).click()
            expect(region.get_by_role('button', name='View/edit personal note', exact=True)).to_be_focused()
            read_tool(page, 'Copy reading link').click()
            fallback = page.get_by_role('link', name='Exact reading link · open or long-press to copy', exact=True)
            expect(fallback).to_be_visible()
            pinned = fallback.get_attribute('href')
            pinned_fields = dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(pinned).fragment.split('?', 1)[1]))
            assert pinned_fields['ref'] == ref and pinned_fields['source'] == canonical['mark']['source_commit']
            audit(page, state, 'private note, cancellation focus and denied clipboard fallback')
            passed('keyboard note save, empty-clearing draft, removal Cancel/Close focus and exact clipboard-denied link preserve private data without API/URL/title leakage')

            # Change only the locator pin, never the actual source response.
            wrong = {**pinned_fields, 'source': 'controlled-compat-old-revision'}
            page.goto(base + '/#read?' + urllib.parse.urlencode(wrong))
            expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
            expect(page.locator('section[aria-label="Pāli passage"]')).to_have_count(0)
            expect(page.locator('#view')).to_contain_text('source or citation mapping revision changed')
            page.get_by_role('link', name='Review current source at this reference', exact=True).click()
            expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in canonical['data']['segments']])
            assert profile(page)['saved'][0]['source_commit'] == canonical['mark']['source_commit']
            passed('an explicit old pin refuses all wording before deliberate source review; stored source identity is never upgraded')

            saved(page)
            book_field = saved_item(page, root_book['mark']).get_by_label('Your personal note', exact=True)
            book_field.fill(unicode_note)
            saved_item(page, root_book['mark']).get_by_role('button', name='Save note', exact=True).click()
            expect(page.locator('#status')).to_contain_text('Personal note saved')
            expect(saved_item(page, canonical['mark']).get_by_label('Your personal note', exact=True)).to_have_value('')
            expected_saved = copy.deepcopy(profile(page)['saved'])
            expected_saved[0]['note'] = ''
            page.get_by_role('link', name='Study backup', exact=True).click()
            expect(page.get_by_role('heading', name='Study backup', exact=True)).to_be_visible()
            before = len(state['calls'])
            raw_before = page.evaluate('localStorage.getItem("pali-library-v1")')
            with page.expect_download() as info:
                page.get_by_role('button', name='Download study backup', exact=True).click()
            assert info.value.suggested_filename == 'pali-library-study-backup.json'
            file_bytes = pathlib.Path(info.value.path()).read_bytes()
            transfer = json.loads(file_bytes.decode('utf-8'))
            assert transfer == {'format': 'pali-library-study-backup-v1', 'saved': expected_saved, 'progress': progress[:1], 'resume': None}
            assert unicode_note.encode('utf-8') in file_bytes and len(state['calls']) == before
            assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw_before
            audit(page, state, 'actual UTF-8 Blob download with empty-clearing draft')
            passed('actual Blob download has the exact filename/UTF-8 JSON and all four pinned source modes; empty draft overrides durable text without a write or upload')
            context.close()

            context, page, state = environment()
            page.goto(base + '/#backup')
            expect(page.get_by_role('heading', name='Study backup', exact=True)).to_be_visible()
            input_file = page.get_by_label('Restore study backup from JSON', exact=True)
            filename = PRIVATE + '<img src=x onerror=window.compatInjected=true>.json'
            def choose_backup():
                input_file.set_input_files({'name': filename, 'mimeType': 'application/json', 'buffer': file_bytes})
                expect(input_file).to_have_value('')
                expect(page.get_by_role('heading', name='Review study backup', exact=True)).to_be_visible()
                expect(page.get_by_text('Saved passages: 4 new · 0 duplicates · 0 conflicts kept', exact=True)).to_be_visible()
                expect(page.get_by_text('Plan marks: 1 new · 0 duplicates · 0 conflicts kept', exact=True)).to_be_visible()
            choose_backup()
            page.get_by_role('button', name='Cancel restore', exact=True).focus()
            page.keyboard.press('Enter')
            expect(input_file).to_be_focused()
            assert profile(page)['saved'] == []
            choose_backup()
            expect(page.get_by_label('Restore incoming reading position', exact=True)).not_to_be_checked()
            page.get_by_role('button', name='Apply study backup', exact=True).focus()
            page.keyboard.press('Enter')
            expect(page.get_by_role('heading', name='Study backup restored in this browser', exact=True)).to_be_focused()
            expect(page).to_have_url(base + '/#backup')
            assert profile(page)['saved'] == expected_saved and profile(page)['reading_progress'] == progress[:1]
            assert all(call == {'name': 'reading_plan', 'arguments': {}} for call in state['calls'])
            audit(page, state, 'same-file backup reselection and restored private data')
            passed('real local file can be selected again after Cancel; keyboard additive restore preserves exact data and sends only constant reading_plan({})')
            context.close()

            # Explicit duplicate-note choices are local and preserve exact saved metadata.
            original_note = {**canonical['mark'], 'note': PRIVATE + 'existing duplicate note'}
            incoming_note = {**original_note, 'title': PRIVATE + 'incoming title must stay unused',
                             'note': PRIVATE + 'incoming ā\u0301\r\n😀 <script>window.compatInjected=true</script>'}
            context, page, state = environment([original_note], progress[:1])
            page.goto(base + '/#backup')
            expect(page.get_by_role('heading', name='Study backup', exact=True)).to_be_visible()
            original_profile = copy.deepcopy(profile(page)); before_calls = len(state['calls'])
            note_file = compact({'format': 'pali-library-study-backup-v1', 'saved': [incoming_note], 'progress': [], 'resume': None}).encode()
            def duplicate_note_preview():
                field = page.get_by_label('Restore study backup from JSON', exact=True)
                field.set_input_files({'name': PRIVATE + 'duplicate-note.json', 'mimeType': 'application/json', 'buffer': note_file})
                expect(field).to_have_value('')
                expect(page.get_by_role('heading', name='Review study backup', exact=True)).to_be_visible()
                choice = page.get_by_label('Use incoming note for ' + original_note['uid'] + ' · ' + original_note['ref'], exact=True)
                expect(choice).not_to_be_checked()
                expect(page.get_by_label('Incoming personal note · ' + original_note['uid'] + ' · ' + original_note['ref'], exact=True)).to_have_value(incoming_note['note'].replace('\r\n', '\n'))
                return choice
            duplicate_note_preview()
            page.get_by_role('button', name='Apply study backup', exact=True).click()
            expect(page.get_by_role('heading', name='Study backup restored in this browser', exact=True)).to_be_visible()
            assert profile(page) == original_profile
            choice = duplicate_note_preview(); raw_before = page.evaluate('localStorage.getItem("pali-library-v1")')
            choice.focus(); page.keyboard.press('Space'); expect(choice).to_be_checked()
            assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw_before
            audit(page, state, 'explicit source-pinned personal-note choice remains local and unchecked by default')
            page.get_by_role('button', name='Apply study backup', exact=True).focus(); page.keyboard.press('Enter')
            expect(page.get_by_role('heading', name='Study backup restored in this browser', exact=True)).to_be_visible()
            expected_note = {**original_note, 'note': incoming_note['note']}
            assert profile(page) == {**original_profile, 'saved': [expected_note]}
            assert profile(page)['saved'][0]['note'].encode() == incoming_note['note'].encode() and len(state['calls']) == before_calls
            privacy(page, state)
            passed('duplicate personal-note restore keeps current by default; an explicit keyboard choice replaces only raw note text while pins/title/marks/private state stay and no MCP request occurs')
            context.close()

            # The narrow legacy-progress fix is exercised in each real engine.
            context, page, state = environment(saved=[canonical['mark']], marks=progress[:1], last='mn10')
            page.goto(base + '/#plans')
            expect(page.get_by_role('heading', name='Reading plans', exact=True)).to_be_visible()
            progress_file = page.get_by_label('Restore reading progress from JSON', exact=True)
            payload = compact({'format': 'pali-library-reading-progress-v1', 'progress': progress[1:]}).encode()
            def choose_progress():
                progress_file.set_input_files({'name': 'same-progress.json', 'mimeType': 'application/json', 'buffer': payload})
                expect(progress_file).to_have_value('')
                expect(page.get_by_role('heading', name='Review reading progress', exact=True)).to_be_visible()
            choose_progress()
            page.get_by_role('button', name='Cancel progress import', exact=True).click()
            expect(progress_file).to_be_focused()
            choose_progress()
            page.get_by_role('button', name='Add 1 reading marks', exact=True).click()
            expect(page.get_by_role('heading', name='Reading marks restored', exact=True)).to_be_visible()
            assert profile(page)['last'] == 'mn10' and profile(page)['reading_progress'] == progress
            choose_progress()
            expect(page.get_by_text('No new marks to add.', exact=True)).to_be_visible()
            assert profile(page)['reading_progress'] == progress
            privacy(page, state)
            passed('same progress file retries after Cancel/success, and unchanged unsupported legacy pointer neither blocks restore nor gets upgraded')
            context.close()

            # A genuine source response is held, then delivered after stop/navigation.
            context, page, state = environment()
            page.goto(base + '/#saved')
            expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            # Fixture-only root markers reset before this request, outside source content.
            page.evaluate("()=>{window.compatIgnoreNextAbort=true;window.compatHeld=0;window.compatHeldBodyComplete=false;document.documentElement.setAttribute('data-compat-held','0');document.documentElement.setAttribute('data-compat-held-body-complete','false')}")
            state['hold'] = True
            page.goto(base + '/#read?uid=mn10')
            expect(page.locator('html')).to_have_attribute('data-compat-held', '1')
            stop = page.get_by_role('button', name='Stop waiting for Pāli reading', exact=True)
            stop.focus()
            page.keyboard.press('Enter')
            expect(page.get_by_role('heading', name='Reading request stopped', exact=True)).to_be_visible()
            expect(page.locator('.passage')).to_have_count(0)
            saved(page)
            route = state['held'].pop()
            with page.expect_response(lambda response: response.request.method == 'POST' and response.url.endswith('/mcp')):
                route.fulfill(status=200, content_type='application/json', body=json.dumps(
                    {'jsonrpc': '2.0', 'id': route.request.post_data_json['id'], 'result': {'structuredContent': late_pali}}))
            expect(page.locator('html')).to_have_attribute('data-compat-held-body-complete', 'true')
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            expect(page.locator('.passage')).to_have_count(0)
            expect(page.locator('#pending-requests')).to_be_hidden()
            privacy(page, state)
            passed('keyboard Stop and a late abort-ignoring actual source response cannot replace a newer Saved route or expose stale wording')
            context.close()
        browser.close()
    result = report('passed' if not any(s['violations'] for s in scans) else 'failed')
    if result['a11y']['violations']:
        raise SystemExit(1)
except Exception as error:
    report('failed', type(error).__name__)
    raise
finally:
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
