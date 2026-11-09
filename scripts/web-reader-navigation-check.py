#!/usr/bin/env python3
"""Actual multi-page source navigation; old pins and malformed responses are fixtures."""
import argparse, copy, json, os, pathlib, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool, source_position

ROOT = pathlib.Path(__file__).resolve().parents[1]
PRIVATE = 'PRIVATE_NAVIGATION_'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report'); parser.add_argument('--a11y', action='store_true'); parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args(); started = time.monotonic()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock: sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'; checks, scans = [], []
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tool(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    request = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(request, timeout=30))['result']; assert not result.get('isError'), result
    return result['structuredContent']
def revision(data): return data['source'].get('locator_revision', data['source']['commit'])
def href(context, **extra): return base + '/#read?' + urllib.parse.urlencode({**context, **extra})
def fields(url): return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).fragment.split('?', 1)[1]))
def profile(page): return page.evaluate("JSON.parse(localStorage.getItem('pali-library-v1'))")
def actual_page(case, offset, limit=30): return tool(case['tool'], {**case['arguments'], 'offset': offset, 'limit': limit, 'script': 'roman'})
def case(label, context, name, arguments, selector):
    result = {'label': label, 'context': context, 'tool': name, 'arguments': arguments, 'selector': selector}
    data = actual_page(result, 0)
    if data.get('next_offset') is None or not 32 < data['total_segments'] <= 100001: return None
    result.update(data=data, next=actual_page(result, data['next_offset']), jump=actual_page(result, data['next_offset'] + 1))
    return result
def downloadable(page, control):
    with page.expect_download() as info: control.click()
    return json.loads(pathlib.Path(info.value.path()).read_text(encoding='utf-8'))

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    canonical = case('canonical MN10', {'uid': 'mn10'}, 'get_text', {'uid': 'mn10'}, 'mn10'); assert canonical
    sources = [canonical]
    catalogues = [
        ('root book', tool('browse_canon', {'node': 'books', 'limit': 60})['items'], 'get_text'),
        ('direct commentary', tool('get_commentary', {'uid': 'commentary', 'limit': 100})['books'], 'get_commentary'),
        ('post-canonical', tool('get_post_canonical', {'limit': 200})['items'], 'get_post_canonical')]
    for label, rows, name in catalogues:
        selected = None
        for row in rows:
            identity = row['read_with']['book'] if name == 'get_text' else row['uid'] if name == 'get_commentary' else row['id']
            context = {'book': identity} if name == 'get_text' else {'kind': 'commentary' if name == 'get_commentary' else 'post', 'uid': identity}
            arguments = {'book' if name == 'get_text' else 'uid' if name == 'get_commentary' else 'citation': identity}
            selector = 'book:' + identity if name == 'get_text' else identity if name == 'get_commentary' else 'post:' + identity
            selected = case(label, context, name, arguments, selector)
            if selected: break
        assert selected, 'No actual multi-page ' + label
        sources.append(selected)
    plans = tool('reading_plan', {})['plans']; plan_name = next(p['name'] for p in plans if p['name'] == 'mn-year')
    schedule = tool('reading_plan', {'name': plan_name})['schedule']
    assignments = []
    for day in schedule:
        if not any(r['id'] == 'mn10' and r.get('part', 0) > 1 for r in day['readings']): continue
        p = tool('reading_plan', {'name': plan_name, 'day': day['day']})
        r = next(r for r in p['readings'] if r['id'] == 'mn10'); a = r['get_text']
        if a.get('offset', 0) > 0 and a.get('limit'):
            assignments.append({'plan': p, 'reading': r, 'start': a['offset'], 'end': a['offset'] + a['limit']})
    bounded = next(x for x in assignments if x['end'] < canonical['data']['total_segments'])
    multipage = next(x for x in assignments if x['end'] - x['start'] > 30)
    for x in [bounded, multipage]:
        x['context'] = {'uid': 'mn10', 'plan': plan_name, 'day': x['plan']['day']}
        x['data'] = actual_page(canonical, x['start'], min(30, x['end'] - x['start']))
        x['last'] = actual_page(canonical, x['end'] - 1, 1)
    plan_next = actual_page(canonical, multipage['start'] + 30, min(30, multipage['end'] - multipage['start'] - 30))

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]:
            def passed(text): checks.append({'width': width, 'theme': theme, 'check': text}); print(f'{width}px {theme}: {text}', flush=True)
            def environment():
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1',JSON.stringify(" + json.dumps({'theme': theme, 'font': 30, 'remember_position': False, 'saved': []}) + "));Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.navigationCopied=text}}})")
                state = {'calls': [], 'errors': [], 'forbidden': [], 'corrupt': None}
                def intercept(route):
                    request = route.request
                    if PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or '') or not request.url.startswith(base + '/'):
                        state['forbidden'].append(request.url); route.abort(); return
                    if request.method != 'POST' or not request.url.endswith('/mcp'): route.continue_(); return
                    payload = request.post_data_json; params = payload.get('params', {}); state['calls'].append(copy.deepcopy(params))
                    name, a = params.get('name'), params.get('arguments', {})
                    allowed = {'uid', 'book', 'citation', 'offset', 'limit', 'script'} if name in {'get_text', 'get_commentary', 'get_post_canonical'} else {'name', 'day'} if name == 'reading_plan' else None
                    if allowed is None or set(a) - allowed:
                        state['forbidden'].append(params); route.abort(); return
                    if state['corrupt'] and name == 'get_text' and a.get('uid') == 'mn10':
                        response = route.fetch(); body = response.json(); data = body['result']['structuredContent']; mode = state['corrupt']
                        if mode == 'revision': data['source']['locator_revision'] = 'controlled-navigation-new-revision'
                        elif mode == 'count': data['returned'] -= 1
                        elif mode == 'next': data['next_offset'] = data['offset'] + 1
                        elif mode == 'offset': data['offset'] += 1
                        elif mode == 'empty': data['segments'] = []; data['returned'] = 0
                        elif mode == 'range': data['total_segments'] = data['offset'] + 1
                        elif mode == 'missing revision': data['source'].pop('commit', None); data['source'].pop('locator_revision', None)
                        route.fulfill(response=response, json=body)
                    else: route.continue_()
                context.route('**/*', intercept)
                page = context.new_page(); page.set_default_timeout(30000); page.on('pageerror', lambda error: state['errors'].append(str(error)))
                return context, page, state
            def privacy(page, state):
                assert not state['forbidden'] and not state['errors'], state
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                expect(page.locator('#view script, #view img')).to_have_count(0)
            def audit(page, state, label):
                privacy(page, state); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{width}px {theme}: {label} overflow'
                if args.a11y:
                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                    d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width': width, 'theme': theme, 'state': label, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})
            def ready(page, expected_url, data):
                expect(page).to_have_url(expected_url)
                texts = page.locator('section[aria-label="Pāli passage"] .segment .passage')
                expect(texts).to_have_text([s['text'] for s in data['segments']]); assert texts.all_text_contents() == [s['text'] for s in data['segments']]
                expect(page.get_by_text(f"Segments {data['offset'] + 1}–{data['offset'] + data['returned']} of {data['total_segments']}", exact=True)).to_be_visible()
                expect(page.get_by_label('Go to source position', exact=True)).to_have_value(str(data['offset'] + 1))
                expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)
            def navigation(page): return source_position(page)
            def jump(page, position):
                control = navigation(page).get_by_label('Go to source position', exact=True)
                control.fill(str(position)); control.press('Enter')
            def pinned(context, offset, data): return {**{k: str(v) for k, v in context.items()}, 'offset': str(offset), 'page_source': revision(data)}
            def assert_page_url(actual_url, context, offset, data):
                assert fields(actual_url) == pinned(context, offset, data), actual_url
                assert not {'source', 'ref', 'translation', 'allow_partial', 'allow_shared', 'scope_sha256'} & set(fields(actual_url))
            def error_page(page):
                expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
                expect(page.locator('section[aria-label="Pāli passage"]')).to_have_count(0)

            context, page, state = environment()
            copied_records = []
            for case_data in sources:
                data, next_data, jump_data = case_data['data'], case_data['next'], case_data['jump']
                start_url = href(case_data['context']); page.goto(start_url); ready(page, start_url, data)
                index = next(i for i, s in enumerate(data['segments']) if s['type'] != 'heading'); ref = data['segments'][index]['ref']
                page.get_by_role('button', name='Save passage ' + ref, exact=True).click()
                region = page.get_by_role('region', name='Personal note for ' + ref, exact=True)
                region.get_by_role('button', name='View/edit personal note', exact=True).click()
                field = region.get_by_label('Your personal note for ' + ref, exact=True)
                draft = PRIVATE + case_data['label'] + ' draft'; field.fill(draft)
                raw = page.evaluate("localStorage.getItem('pali-library-v1')"); calls = len(state['calls'])
                first_body = page.locator('section[aria-label="Pāli passage"]').element_handle()
                for bad in ['', '0', '-1', '1.5', '1e2', '01', ' 2', '1000000', PRIVATE + 'bad', str(data['total_segments'] + 1)]:
                    jump(page, bad)
                    expect(navigation(page).get_by_role('alert')).to_be_visible()
                    expect(navigation(page).get_by_label('Go to source position', exact=True)).to_be_focused()
                    expect(field).to_have_value(draft)
                    assert page.url == start_url and len(state['calls']) == calls and page.evaluate("localStorage.getItem('pali-library-v1')") == raw
                    assert first_body.evaluate('(e)=>e.isConnected')
                next_link = page.get_by_role('link', name='Next page →', exact=True); next_href = next_link.get_attribute('href')
                assert_page_url(base + '/' + next_href, case_data['context'], next_data['offset'], data)
                next_link.focus(); page.keyboard.press('Enter'); ready(page, base + '/' + next_href, next_data)
                previous = page.get_by_role('link', name='← Previous page', exact=True); previous_href = previous.get_attribute('href')
                assert_page_url(base + '/' + previous_href, case_data['context'], 0, data)
                previous.click(); ready(page, base + '/' + previous_href, data)
                expect(region.get_by_label('Your personal note for ' + ref, exact=True)).to_have_value(draft)
                jump(page, jump_data['offset'] + 1)
                target_url = href(case_data['context'], offset=jump_data['offset'], page_source=revision(data)); ready(page, target_url, jump_data)
                assert_page_url(page.url, case_data['context'], jump_data['offset'], data)
                actual_ref = jump_data['segments'][0]['ref']
                read_tool(page, 'Copy reading link').click(); page.wait_for_function('typeof window.navigationCopied==="string"')
                exact = fields(page.evaluate('window.navigationCopied'))
                assert exact == {**{k: str(v) for k, v in case_data['context'].items()}, 'offset': str(jump_data['offset']), 'ref': actual_ref, 'source': revision(data)}
                page.get_by_role('button', name='Save passage ' + actual_ref, exact=True).click()
                record = profile(page)['saved'][-1]
                assert record['uid'] == case_data['selector'] and record['ref'] == actual_ref and record['offset'] == jump_data['offset'] and record['source_commit'] == revision(data)
                assert set(record) == {'uid', 'ref', 'title', 'offset', 'source_commit', 'note'}
                copied_records.append(record)
                audit(page, state, case_data['label'] + ' pinned pager/jump/copy')
                passed(case_data['label'] + ': invalid input is local; Next/Previous/jump retain actual page pin and wording, draft survives back, copy/save use a real paragraph source/ref')

            # Manual page destinations never become resume/backup paragraph locators.
            preferences = page.locator('details.preferences')
            if preferences.get_attribute('open') is None: preferences.locator('summary').click()
            page.get_by_label('Remember reading position on this device', exact=True).check()
            selected = page.locator('section[aria-label="Pāli passage"] > .segment').first
            selected.evaluate('(e)=>{e.scrollIntoView({block:"start"});window.scrollBy(0,2);dispatchEvent(new PageTransitionEvent("pagehide"))}')
            page.wait_for_function("JSON.parse(localStorage.getItem('pali-library-v1')).last?.includes('ref=')")
            remembered = fields(base + '/' + profile(page)['last'])
            assert 'page_source' not in remembered and remembered['source'] == revision(sources[-1]['data']) and remembered['ref'] == sources[-1]['jump']['segments'][0]['ref']
            page.evaluate("dispatchEvent(new Event('beforeprint'))")
            assert page.locator('#print-document .print-passage').all_text_contents() == [s['text'] for s in sources[-1]['jump']['segments']]
            assert PRIVATE not in page.locator('#print-document').text_content()
            page.evaluate("dispatchEvent(new Event('afterprint'))")
            page.goto(base + '/#backup'); expect(page.get_by_role('heading', name='Study backup', exact=True)).to_be_visible()
            exported = downloadable(page, page.locator('#view').get_by_role('button', name='Download study backup', exact=True))
            assert exported['resume'] == profile(page)['last'] and 'page_source' not in exported['resume']
            for record in copied_records: assert record in exported['saved']
            assert all(set(r) == {'uid', 'ref', 'title', 'offset', 'source_commit', 'note'} for r in exported['saved'])
            privacy(page, state)
            passed('resume/backup keep actual paragraph source/ref rather than transient page_source; print contains exactly the actual loaded positions and no private draft')
            context.close()

            context, page, state = environment()
            p = bounded; start, end = p['start'], p['end']; initial = href(p['context'], offset=start)
            page.goto(initial); ready(page, initial, p['data'])
            expect(navigation(page)).to_contain_text(f'Available positions {start + 1}–{end}.')
            before_calls = len(state['calls'])
            for bad in [start, end + 1]:
                jump(page, bad); expect(navigation(page).get_by_role('alert')).to_be_visible()
                assert len(state['calls']) == before_calls and page.url == initial
            jump(page, end); last_url = href(p['context'], offset=end - 1, page_source=revision(p['data'])); ready(page, last_url, p['last'])
            expect(page.get_by_role('link', name='Next page →', exact=True)).to_have_count(0)
            previous = page.get_by_role('link', name='← Previous page', exact=True); previous_href = previous.get_attribute('href')
            assert_page_url(base + '/' + previous_href, p['context'], start, p['data'])
            previous.click(); ready(page, base + '/' + previous_href, p['data'])
            p = multipage; initial = href(p['context'], offset=p['start']); page.goto(initial); ready(page, initial, p['data'])
            next_link = page.get_by_role('link', name='Next page →', exact=True); next_href = next_link.get_attribute('href')
            assert_page_url(base + '/' + next_href, p['context'], p['start'] + 30, p['data'])
            next_link.click(); ready(page, base + '/' + next_href, plan_next)
            audit(page, state, 'actual bounded plan positions and page identity')
            passed('actual split-plan min/max positions reject outside assignments; valid last-position jump and multi-page Next preserve plan/day/source pin and clipped wording')
            context.close()

            context, page, state = environment()
            rev = revision(canonical['data']); root = 'uid=mn10&offset=30&page_source=' + rev
            bad_queries = [root + '?ignored=1', root + '&ref=mn10%2F31', root + '&source=' + rev, root + '&page_source=' + rev,
                           root + '&uid=mn10', root + '&allow_partial=true', root + '&scope_sha256=' + 'a' * 64,
                           root.replace('offset=30', 'offset=1.5'), root.replace('offset=30', 'offset=01'),
                           root.replace('offset=30&', ''), root.replace(rev, 'https%3A%2F%2Finvalid.example'),
                           'uid=mn10&plan=' + plan_name + '&day=' + str(bounded['plan']['day']) + '&offset=1e2&page_source=' + rev]
            for query in bad_queries:
                page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
                before = len(state['calls']); page.goto(base + '/#read?' + query); error_page(page); assert len(state['calls']) == before
            audit(page, state, 'early malformed page-source rejection')
            passed('mixed/duplicate/invalid page pins, noninteger offsets and consent fields reject before any source or plan MCP request')
            state['corrupt'] = 'revision'; target = href(canonical['context'], offset=30, page_source=rev)
            page.goto(target); error_page(page)
            expect(page.locator('#view')).to_contain_text('source or citation mapping revision changed')
            review = page.get_by_role('link', name='Review current source at this position', exact=True)
            assert 'page_source' not in fields(base + '/' + review.get_attribute('href')) and 'ref' not in fields(base + '/' + review.get_attribute('href'))
            review.focus(); page.keyboard.press('Enter')
            ready(page, href(canonical['context'], offset=30), canonical['next'])
            audit(page, state, 'source revision changed then explicit current-position review')
            passed('changed revision is refused before any wording; explicit current-position review removes only the transient pin without inventing a paragraph reference')
            context.close()

            if width == 390 and theme == 'light':
                context, page, state = environment()
                for mode in ['count', 'next', 'offset', 'empty', 'range', 'missing revision']:
                    page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
                    state['corrupt'] = mode; before = len(state['calls'])
                    with page.expect_response(lambda r: r.request.method == 'POST' and r.url.endswith('/mcp') and r.request.post_data_json.get('params', {}).get('name') == 'get_text'):
                        page.goto(href(canonical['context'], offset=30, page_source=rev))
                    error_page(page)
                    assert state['calls'][before:] == [{'name': 'get_text', 'arguments': {'uid': 'mn10', 'offset': 30, 'limit': 30, 'script': 'roman'}}]
                for mode in ['count', 'next', 'missing revision']:
                    page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
                    state['corrupt'] = mode; before = len(state['calls']); plain = href(canonical['context'], offset=30)
                    with page.expect_response(lambda r: r.request.method == 'POST' and r.url.endswith('/mcp') and r.request.post_data_json.get('params', {}).get('name') == 'get_text'):
                        page.goto(plain)
                    expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in canonical['next']['segments']])
                    expect(navigation(page)).to_have_count(0); expect(page.get_by_role('navigation', name='Pagination', exact=True)).to_have_count(0)
                    assert state['calls'][before:] == [{'name': 'get_text', 'arguments': {'uid': 'mn10', 'offset': 30, 'limit': 30, 'script': 'roman'}}]
                privacy(page, state)
                passed('guarded malformed response counts/offset/next/empty/range/revision refuse wording; unguarded malformed navigation metadata retains actual Pāli and omits unsafe controls')
                context.close()
        browser.close()
    result = {'passed': len(checks), 'checks': checks, 'outside_source_tree': bool(args.server_dir), 'duration_seconds': round(time.monotonic() - started, 2),
              'actual_sources': [{'kind': c['label'], 'context': c['context'], 'total_segments': c['data']['total_segments'], 'next_offset': c['next']['offset'], 'jump_offset': c['jump']['offset'], 'revision': revision(c['data'])} for c in sources],
              'actual_plan_windows': [{'context': p['context'], 'start_offset': p['start'], 'end_exclusive': p['end']} for p in [bounded, multipage]],
              'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
              'limits': 'Actual bundled multi-page source selections verified by returned totals/next offsets, exact Pāli and current engine plan assignments. Clipboard capture, private drafts, changed/malformed response metadata are explicit fixtures; source bodies are never generated. No publisher English fetch, source activation, invented next ref, or import of page_source as a paragraph locator. Desktop Chromium/axe and codepoint checks are not physical-device, OS glyph-shaping or human screen-reader certification. Only axe contexts bypass CSP.'}
    text = json.dumps(result, indent=2); print(text)
    if args.report: pathlib.Path(args.report).write_text(text + '\n', encoding='utf-8')
    if result['a11y']['violations']: raise SystemExit(1)
finally:
    server.terminate()
    try: server.wait(timeout=10)
    except subprocess.TimeoutExpired: server.kill(); server.wait()
