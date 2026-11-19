#!/usr/bin/env python3
"""Bounded quote/commentary focus acceptance with actual local MCP source fixtures.

Only delay/error/abort timing is synthetic. No publisher fetch, generated source
wording, actual private data, physical-device or human-AT acceptance is involved.
"""
import argparse
import copy
import hashlib
import json
import os
import pathlib
import socket
import subprocess
import time
import urllib.parse
import urllib.request

from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import find_control, read_tool

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
JOURNAL = 'pali-library-note-drafts-v1'
PRIVATE = 'SYNTHETIC_PRIVATE_STUDY_NOTE_ā😀'
UNSENT = 'UNSENT_STUDY_FINDER_ā😀'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report', type=pathlib.Path)
parser.add_argument('--a11y', action='store_true')
parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
checks, scans, receipts = [], [], []
result = {'status': 'running', 'passed': 0, 'checks': checks}

def write_report():
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2) + '\n')

write_report()
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
server = subprocess.Popen(
    ['node', str(server_dir / 'http.cjs')], cwd='/tmp',
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'},
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tool(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    req = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    response = json.load(urllib.request.urlopen(req, timeout=60))['result']
    assert not response.get('isError'), 'Actual local MCP fixture failed'
    return response['structuredContent']

try:
    for attempt in range(100):
        try:
            urllib.request.urlopen(base + '/healthz', timeout=1)
            break
        except Exception:
            time.sleep(.1)
    else:
        raise AssertionError('Actual committed HTTP server did not start')
    root = tool('get_text', {'uid': 'mn10', 'offset': 0, 'limit': 30, 'script': 'roman'})
    dhp = tool('get_text', {'uid': 'dhp183', 'offset': 0, 'limit': 30, 'script': 'roman'})
    quote = dhp['segments'][0]['text']
    verified = tool('verify_quote', {'text': quote, 'language': 'pali', 'limit': 5})
    commentary = {offset: tool('get_commentary', {'uid': 'mn10', 'offset': offset, 'limit': 20, 'script': 'roman'}) for offset in [0, 20, 40]}
    assert commentary[0]['next_offset'] == 20 and commentary[20]['next_offset'] == 40
    mark = {'uid': 'dhp183', 'ref': dhp['segments'][0]['ref'], 'offset': 0, 'source_commit': dhp['source']['commit'], 'title': dhp['title'], 'note': PRIVATE}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        expect.set_options(timeout=15000)
        cases = [(390, 'light'), (1280, 'light')] + ([(390, 'dark'), (1280, 'dark')] if args.a11y else [])
        for width, theme in cases:
            context = browser.new_context(viewport={'width': width, 'height': 844}, bypass_csp=args.a11y)
            seed = {'theme': theme, 'script': 'roman', 'remember_position': False, 'saved': [mark], 'reading_progress': []}
            context.add_init_script("if(!localStorage.getItem(" + json.dumps(KEY) + "))localStorage.setItem(" + json.dumps(KEY) + "," + json.dumps(json.dumps(seed)) + ");" + """
                const studyFetch = window.fetch.bind(window);
                window.studyIgnoreAbort = false;
                window.fetch = (url, options) => {
                  if(window.studyIgnoreAbort && options?.signal) {
                    window.studyIgnoreAbort = false;
                    const {signal, ...rest} = options;
                    return studyFetch(url, rest).then(async response => {
                      await response.clone().text();
                      document.documentElement.setAttribute('data-study-body-complete', 'true');
                      return response;
                    });
                  }
                  return studyFetch(url, options);
                };
            """)
            state = {'hold': None, 'held': [], 'calls': [], 'forbidden': [], 'errors': []}
            page = context.new_page()
            page.on('pageerror', lambda error: state['errors'].append(str(error)))

            def intercept(route):
                req = route.request
                if not req.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(req.url) or UNSENT in urllib.parse.unquote(req.url) or PRIVATE in (req.post_data or '') or UNSENT in (req.post_data or '') or any(PRIVATE in urllib.parse.unquote(value) or UNSENT in urllib.parse.unquote(value) for value in req.headers.values()):
                    state['forbidden'].append('outside or private request')
                    route.abort()
                    return
                if req.method == 'POST' and req.url.endswith('/mcp'):
                    command = req.post_data_json['params']
                    state['calls'].append(copy.deepcopy(command))
                    if command['name'] not in ['get_text', 'get_commentary', 'verify_quote']:
                        state['forbidden'].append('unexpected tool')
                        route.abort()
                        return
                    if command['name'] == state['hold']:
                        state['hold'] = None
                        state['held'].append(route)
                        req.frame.evaluate("document.documentElement.setAttribute('data-study-held', 'true')")
                        return
                route.continue_()

            context.route('**/*', intercept)

            def audit(label):
                assert not state['forbidden'] and not state['errors'], 'Privacy/request or browser error guard failed'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
                stored = page.evaluate('key => JSON.parse(localStorage.getItem(key))', KEY)
                assert stored['saved'] == [mark] and stored['reading_progress'] == [], 'Private saved data changed'
                assert quote not in json.dumps(stored, ensure_ascii=False), 'Quotation was stored'
                assert page.evaluate('key => sessionStorage.getItem(key)', JOURNAL) is None, 'Unrelated recovery journal changed'
                assert all(text not in page.url and text not in page.title() for text in [quote, PRIVATE, UNSENT]), 'Private input entered URL/title'
                if args.a11y:
                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                    data = page.evaluate("async () => await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width': width, 'theme': theme, 'state': label, 'violations': [{'id': row['id'], 'targets': [node['target'] for node in row['nodes']]} for row in data['violations']], 'manual_review_rules': [row['id'] for row in data['incomplete']]})
                checks.append({'width': width, 'theme': theme, 'check': label})
                print(f'{width}px {theme}: {label}', flush=True)

            def hold(name, ignore_abort=False):
                assert not state['held'], 'Previous held response not settled'
                state['hold'] = name
                page.evaluate("document.documentElement.removeAttribute('data-study-held');document.documentElement.removeAttribute('data-study-body-complete')")
                page.evaluate('value => window.studyIgnoreAbort = value', ignore_abort)

            def held_ready():
                expect(page.locator('html')).to_have_attribute('data-study-held', 'true')
                assert len(state['held']) == 1, 'Expected exactly one delayed source response'

            def release(error=False, await_body=False):
                route = state['held'].pop(0)
                payload = route.request.post_data_json
                command = payload['params']
                if error:
                    answer = {'isError': True, 'structuredContent': {'error': 'Controlled study focus failure'}}
                else:
                    if command['name'] == 'verify_quote':
                        assert command['arguments'] == {'text': quote, 'language': 'pali', 'limit': 5}, 'Quotation request changed'
                        data = verified
                    else:
                        assert command['name'] == 'get_commentary' and command['arguments'] == {'uid': 'mn10', 'offset': command['arguments']['offset'], 'limit': 20, 'script': 'roman'}, 'Commentary request changed'
                        data = commentary[command['arguments']['offset']]
                    answer = {'structuredContent': data}
                route.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': payload['id'], 'result': answer}))
                if await_body:
                    expect(page.locator('html')).to_have_attribute('data-study-body-complete', 'true')
                    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')

            def quote_open():
                page.goto(base + '/#verify')
                expect(page.get_by_label('Pāli quotation', exact=True)).to_be_visible()

            def quote_submit():
                page.get_by_label('Pāli quotation', exact=True).fill(quote)
                control = page.get_by_role('button', name='Check bundled Pāli', exact=True)
                control.focus()
                page.keyboard.press('Enter')
                held_ready()

            def quote_done(error=False):
                expect(page.get_by_role('heading', name='Unable to check this quotation' if error else 'Matching wording found', exact=True)).to_be_visible()
                expect(page.locator('#quote-result')).not_to_have_attribute('aria-busy', 'true')
                expect(page.get_by_role('button', name='Check bundled Pāli', exact=True)).to_be_enabled()
                if not error:
                    expect(page.locator('#quote-result .word-card .passage')).to_have_text([match['matched_text'] for match in verified['matches']])
                    expect(page.locator('#quote-result')).to_contain_text(verified['scope']['terms'])

            def read_open():
                page.goto(base + '/#read?uid=mn10')
                root_same()

            def root_same():
                expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([segment['text'] for segment in root['segments']])

            def commentary_open():
                control = read_tool(page, 'Traditional commentary')
                control.focus()
                page.keyboard.press('Enter')
                held_ready()

            def commentary_done(offset):
                expect(page.get_by_role('heading', name='Traditional commentary · not canonical root text', exact=True)).to_be_visible()
                expect(page.locator('#study .passage')).to_have_text([segment['text'] for segment in commentary[offset]['segments']])
                expect(page.locator('#study')).to_contain_text(commentary[offset]['source']['terms'])
                root_same()

            def next_commentary():
                control = page.get_by_role('button', name='Next commentary page →', exact=True)
                control.focus()
                page.keyboard.press('Enter')
                held_ready()

            def move_to(selector):
                if selector in ['#query', '#reference']:
                    target = find_control(page, selector)
                    target.fill(UNSENT)
                else:
                    if page.locator('.preferences').get_attribute('open') is None:
                        page.locator('.preferences > summary').click()
                    target = page.locator(selector)
                target.focus()
                return target

            # The deliberate paths must focus a useful loading target synchronously.
            quote_open(); hold('verify_quote'); quote_submit()
            expect(page.locator('#quote-result')).to_be_focused()
            release(); quote_done(); expect(page.locator('#quote-result')).to_be_focused()
            audit('intentional keyboard quote submission owns synchronous loading and exact result focus')

            quote_open(); hold('verify_quote'); quote_submit()
            field = page.get_by_label('Pāli quotation', exact=True)
            field.focus(); field.press('End'); page.keyboard.type(' ')
            field.evaluate('node => node.setSelectionRange(3, 8, "backward")')
            snapshot = field.evaluate('node => ({value: node.value, start: node.selectionStart, end: node.selectionEnd, direction: node.selectionDirection})')
            release(); quote_done(); expect(field).to_be_focused()
            assert field.evaluate('node => ({value: node.value, start: node.selectionStart, end: node.selectionEnd, direction: node.selectionDirection})') == snapshot, 'Resumed quotation value/caret/selection changed'
            page.keyboard.type('x')
            assert field.input_value() == snapshot['value'][:3] + 'x' + snapshot['value'][8:], 'Continued quotation key was lost'
            audit('delayed quote success preserves resumed textarea selection and next typed key')

            for selector, error in [('#query', False), ('#reference', True), ('#font-size', False)]:
                quote_open(); hold('verify_quote'); quote_submit(); target = move_to(selector)
                before_scroll = page.evaluate('scrollY')
                release(error=error); quote_done(error); expect(target).to_be_focused()
                assert page.evaluate('scrollY') == before_scroll, 'Delayed quotation completion scrolled another task'
                if selector in ['#query', '#reference']:
                    expect(target).to_have_value(UNSENT)
                audit('delayed quote ' + ('error' if error else 'success') + ' preserves ' + selector + ' and scroll')

            quote_open(); hold('verify_quote'); quote_submit()
            page.evaluate("window.studyWheelObserved=false;document.addEventListener('wheel',()=>window.studyWheelObserved=true,{once:true})")
            page.mouse.move(width // 2, 400); page.mouse.wheel(0, -10000)
            page.wait_for_function('() => window.studyWheelObserved===true')
            page.wait_for_function('() => scrollY===0')
            expect(page.locator('#quote-result')).to_be_focused()
            before_scroll = page.evaluate('scrollY')
            release(); quote_done()
            expect(page.locator('#quote-result')).to_be_focused()
            assert page.evaluate('scrollY') == before_scroll, 'Wheel-revoked quotation lease scrolled the reader on completion'
            audit('native wheel revokes asynchronous quotation scrolling while the stable result retains focus')

            quote_open(); hold('verify_quote', True); quote_submit()
            stop = page.get_by_role('button', name='Stop waiting for Quotation check', exact=True)
            stop.focus(); page.keyboard.press('Enter'); quote_done(True)
            expect(page.locator('#content')).to_be_focused()
            release(await_body=True)
            expect(page.get_by_role('heading', name='Unable to check this quotation', exact=True)).to_be_visible()
            hold('verify_quote'); quote_submit(); release(); quote_done()
            audit('keyboard quotation Stop ignores late body and explicit retry returns the actual result')

            quote_open(); hold('verify_quote', True); quote_submit()
            page.get_by_role('link', name='Saved', exact=True).click()
            expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            note = page.get_by_label('Your personal note', exact=True); note.focus()
            release(await_body=True); expect(note).to_be_focused(); expect(note).to_have_value(PRIVATE)
            expect(page.locator('#quote-result')).to_have_count(0)
            audit('late quotation body cannot replace newer Saved navigation or steal private note focus')

            read_open(); hold('get_commentary'); commentary_open()
            expect(page.locator('#study')).to_be_focused()
            release(); commentary_done(0); expect(page.locator('#study')).to_be_focused()
            hold('get_commentary'); next_commentary(); expect(page.locator('#study')).to_be_focused()
            release(); commentary_done(20); expect(page.locator('#study')).to_be_focused()
            previous = page.get_by_role('button', name='← Previous commentary page', exact=True)
            if previous.count():
                hold('get_commentary'); previous.focus(); page.keyboard.press('Enter'); held_ready(); release(); commentary_done(0)
                expect(page.locator('#study')).to_be_focused()
            else:
                hold('get_commentary'); next_commentary(); release(); commentary_done(40); expect(page.locator('#study')).to_be_focused()
            audit('aligned MN10 opening and keyboard commentary pagination retain useful loading/result focus')

            for selector, error in [('#query', False), ('#font-size', False), ('#reference', True)]:
                read_open(); hold('get_commentary'); commentary_open(); target = move_to(selector)
                before_scroll = page.evaluate('scrollY'); release(error=error)
                if error:
                    expect(page.locator('#study')).to_contain_text('Controlled study focus failure')
                else:
                    commentary_done(0)
                expect(target).to_be_focused(); assert page.evaluate('scrollY') == before_scroll, 'Commentary completion scrolled another task'
                root_same(); audit('delayed commentary ' + ('error' if error else 'success') + ' preserves ' + selector + ' and root source')

            read_open(); hold('get_commentary'); commentary_open(); release(); commentary_done(0)
            hold('get_commentary'); next_commentary(); release(error=True)
            expect(page.locator('#study')).to_contain_text('Controlled study focus failure')
            expect(page.locator('#study')).to_be_focused()
            retry = page.get_by_role('button', name='Retry commentary page', exact=True)
            hold('get_commentary'); retry.focus(); page.keyboard.press('Enter'); held_ready()
            assert state['held'][0].request.post_data_json['params']['arguments']['offset'] == 20, 'Commentary retry changed requested page'
            release(); commentary_done(20); expect(page.locator('#study')).to_be_focused()
            audit('commentary error preserves intentional focus and retries the exact failed offset')

            read_open(); hold('get_commentary', True); commentary_open()
            stop = page.get_by_role('button', name='Stop waiting for Commentary', exact=True)
            stop.focus(); page.keyboard.press('Enter')
            expect(page.locator('#study')).to_contain_text('Stopped waiting'); expect(page.locator('#study')).to_be_focused()
            release(await_body=True); expect(page.locator('#study')).to_contain_text('Stopped waiting')
            hold('get_commentary'); page.get_by_role('button', name='Retry commentary page', exact=True).focus(); page.keyboard.press('Enter'); held_ready(); release(); commentary_done(0)
            audit('commentary keyboard Stop retains its target, rejects late body and permits explicit retry')

            read_open(); hold('get_commentary', True); commentary_open()
            read_tool(page, 'English sources').click()
            expect(page.get_by_role('heading', name='English sources', exact=True)).to_be_visible()
            release(await_body=True)
            expect(page.get_by_role('heading', name='English sources', exact=True)).to_be_visible()
            expect(page.get_by_role('heading', name='Traditional commentary · not canonical root text', exact=True)).to_have_count(0)
            root_same(); audit('study supersession rejects delayed commentary without fetching English or altering canonical text')
            receipts.append({'width': width, 'theme': theme, 'actual_commentary_total': commentary[0]['total_segments'], 'verified_offsets': [0, 20, 40], 'quotation_fixture_sha256': hashlib.sha256(json.dumps(verified, ensure_ascii=False, sort_keys=True).encode()).hexdigest(), 'source_body_preserved': True, 'external_requests': len(state['forbidden']), 'page_errors': len(state['errors'])})
            context.close()
        browser.close()
    result = {'status': 'passed', 'passed': len(checks), 'checks': checks, 'outside_source_tree': bool(args.server_dir), 'receipts': receipts, 'a11y': {'scans': len(scans), 'violations': sum(len(scan['violations']) for scan in scans), 'results': scans}, 'limits': 'Actual bundled Pāli, aligned commentary and quote-matching results; only held/error/abort timing and synthetic private fixtures are controlled. Normal flows enforce production CSP; only axe contexts bypass it. Viewport/keyboard checks do not certify physical devices, OS scaling, native input methods or human assistive usability. Background/window-focus acceptance remains unverified: headless Chromium tab-front switching kept the original document focused. No publisher English or external request is made. Reports omit source wording and private inputs.'}
    assert result['a11y']['violations'] == 0, 'Automated accessibility violations'
except BaseException as error:
    result.update({'status': 'failed', 'passed': len(checks), 'checks': checks, 'failure_type': type(error).__name__})
    raise
finally:
    server.terminate()
    server.wait(timeout=10)
    write_report()
print(json.dumps(result, indent=2))
