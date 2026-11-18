#!/usr/bin/env python3
"""Actual commentary-search context, source pins and owned inline request lifecycle.

Bad responses, service failures and an abort-ignoring transport are explicit fixtures.
"""
import argparse, copy, json, os, pathlib, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY, PRIVATE = 'pali-library-v1', 'PRIVATE_COMMENTARY_CONTEXT_'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report'); parser.add_argument('--a11y', action='store_true'); parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args(); started = time.monotonic()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock: sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'; checks, scans, receipts = [], [], []
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def tool(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    req = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(req, timeout=30))['result']; assert not result.get('isError'), result
    return result['structuredContent']
def revision(data): return data['source'].get('locator_revision', data['source']['commit'])
def fields(href): return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(href).fragment.split('?', 1)[1]))
def reply(route, data=None, error=None):
    result = {'isError': True, 'structuredContent': {'error': error}} if error else {'structuredContent': data}
    route.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': route.request.post_data_json['id'], 'result': result}))
def command(hit): return {k: v for k, v in hit['context_with'].items() if k != 'tool'}
def search_url(query='sati'): return base + '/#search?' + urllib.parse.urlencode({'q': query, 'scope': 'commentary'})

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    actual = {}
    for script in ['roman', 'sinhala']:
        search = tool('search_commentary', {'query': 'sati', 'offset': 0, 'limit': 15, 'script': script})
        hit = search['results'][0]; around = tool('get_commentary', command(hit))
        exact = tool('get_commentary', {k: v for k, v in hit['read_with'].items() if k != 'tool'})
        continuation = tool('get_commentary', {'uid': hit['book']['uid'], 'offset': hit['segment'] - 1, 'limit': 30, 'script': script})
        assert around['returned'] == 3 and exact['returned'] == exact['total_segments'] == 1
        assert around['segments'][1]['ref'] == hit['citation'] == exact['segments'][0]['ref']
        actual[script] = (search, hit, around, exact, continuation)
        receipts.append({'script': script, 'match': hit['citation'], 'command': hit['context_with'], 'refs': [s['ref'] for s in around['segments']], 'source': revision(around)})
    boundaries = []
    for query in ['"Namo tassa bhagavato arahato sammāsambuddhassa"', '"Dhammasaṅgaha-aṭṭhakathā niṭṭhitā."']:
        data = tool('search_commentary', {'query': query, 'offset': 0, 'limit': 15, 'script': 'roman'})
        hit = data['results'][0]; around = tool('get_commentary', command(hit)); boundaries.append((data, hit, around))
        assert around['offset'] == max(0, hit['segment'] - 2)
        assert around['segments'][hit['segment'] - around['offset'] - 1]['ref'] == hit['citation']
    assert boundaries[0][1]['segment'] == 1 and boundaries[0][2]['returned'] == 3
    assert boundaries[1][1]['segment'] == boundaries[1][2]['total_segments'] and boundaries[1][2]['returned'] == 2
    mark = {'uid': actual['roman'][1]['book']['uid'], 'ref': actual['roman'][1]['citation'], 'offset': actual['roman'][1]['segment'] - 1,
            'source_commit': revision(actual['roman'][2]), 'title': actual['roman'][1]['book']['title'], 'note': PRIVATE + 'saved ā😀'}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        engine = {'actual': browser.browser_type.name, 'version': browser.version}; expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]:
            def passed(check):
                checks.append({'width': width, 'theme': theme, 'check': check}); print(f'{width}px {theme}: {check}', flush=True)
            def environment(script='roman'):
                seed = {'theme': theme, 'font': 30, 'script': script, 'remember_position': False, 'highlight_saved': True, 'saved': [mark], 'reading_progress': []}
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(json.dumps(seed)) + ");" +
                    "window.contextIgnoreAbort=false;const contextFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.contextIgnoreAbort&&JSON.parse(options?.body||'{}').params?.name==='get_commentary'){window.contextIgnoreAbort=false;const {signal,...rest}=options;return contextFetch(url,rest).then(async response=>{await response.clone().text();document.documentElement.setAttribute('data-context-body-complete','true');return response})}return contextFetch(url,options)};")
                state = {'calls': [], 'forbidden': [], 'errors': [], 'mode': None, 'held': []}
                def intercept(r):
                    request = r.request
                    if not request.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or ''):
                        state['forbidden'].append(request.url); r.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        params = request.post_data_json.get('params', {}); state['calls'].append(copy.deepcopy(params)); name = params.get('name')
                        if name not in ['browse_canon', 'search_commentary', 'get_commentary']: state['forbidden'].append(params); r.abort()
                        elif name == 'get_commentary' and state['mode'] == 'hold':
                            state['held'].append(r); request.frame.evaluate("document.documentElement.setAttribute('data-context-held','true')")
                        elif name == 'get_commentary' and state['mode'] == 'error': reply(r, error='Controlled commentary-context service failure')
                        elif name == 'get_commentary' and isinstance(state['mode'], dict): reply(r, state['mode'])
                        else: r.continue_()
                    else: r.continue_()
                context.route('**/*', intercept); page = context.new_page(); page.on('pageerror', lambda e: state['errors'].append(str(e)))
                return context, page, state
            def saved(page):
                page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            def result_rows(page, data):
                rows = page.locator('section[aria-label="Commentary search results"] .commentary-search-result')
                expect(rows).to_have_count(len(data['results'])); return rows
            def search_ready(page, data):
                expect(page.locator('#view > h2')).to_have_text('Results for “' + data['query'] + '”'); rows = result_rows(page, data)
                expect(rows.locator('.entry')).to_have_count(len(data['results']))
                for row, hit in zip(rows.all(), data['results']):
                    assert fields(row.locator('.entry').get_attribute('href')) == {'kind': 'commentary', 'uid': hit['citation'], 'offset': '0', 'ref': hit['citation'], 'source': revision(data)}
                    expect(row.get_by_role('button', name='Read surrounding context', exact=True)).to_be_visible()
                return rows
            def pane(page): return page.get_by_role('region', name='Surrounding commentary context', exact=True)
            def context_ready(page, data, hit):
                region = pane(page); expect(region).to_be_visible(); expect(region.locator('article.segment .passage')).to_have_text([s['text'] for s in data['segments']])
                assert region.locator('article.segment .passage').all_text_contents() == [s['text'] for s in data['segments']]
                expect(region).to_contain_text(data['label']); expect(region).to_contain_text(data['alignment_note'])
                expect(region).to_contain_text(data['source']['terms']); expect(region.locator('.search-match')).to_have_count(1)
                expect(region.locator('.search-match')).to_contain_text('Search match'); expect(region.locator('.search-match')).to_contain_text(hit['citation'])
                expect(region.locator('.personal-highlight')).to_have_count(0)
                for segment in data['segments']:
                    expect(region).to_contain_text(segment['ref'])
                    for key in ['vri_paragraph', 'commentary_pts_page_begins']:
                        if segment.get(key):
                            for value in segment[key] if isinstance(segment[key], list) else [segment[key]]: expect(region).to_contain_text(str(value))
                for key in ['notes', 'script_note']:
                    values = data.get(key, []); values = [values] if isinstance(values, str) else values
                    for value in values: expect(region).to_contain_text(value)
                continuation = region.get_by_role('link', name='Continue from match in source book', exact=True)
                assert fields(continuation.get_attribute('href')) == {'kind': 'commentary', 'uid': hit['book']['uid'], 'offset': str(hit['segment'] - 1), 'ref': hit['citation'], 'source': revision(data)}
                return region
            def audit(page, state, label):
                assert not state['errors'] and not state['forbidden'], state
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, theme, label)
                if args.a11y:
                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                    d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width': width, 'theme': theme, 'state': label, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})
            def settle(page): page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            def hold(page, state, button):
                state['mode'] = 'hold'; page.evaluate("()=>{window.contextIgnoreAbort=true;document.documentElement.removeAttribute('data-context-held');document.documentElement.removeAttribute('data-context-body-complete')}")
                button.click(); expect(page.locator('html')).to_have_attribute('data-context-held', 'true')
            search, hit, around, exact, continuation = actual['roman']
            context, page, state = environment(); saved(page)
            draft = PRIVATE + 'unsaved exact draft ā😀'; page.get_by_label('Your personal note', exact=True).fill(draft); raw = page.evaluate('localStorage.getItem("pali-library-v1")')
            page.goto(search_url()); rows = search_ready(page, search); original_rows = rows.first.element_handle(); before = len(state['calls'])
            trigger = rows.first.get_by_role('button', name='Read surrounding context', exact=True); trigger.focus(); page.keyboard.press('Enter')
            region = context_ready(page, around, hit)
            assert state['calls'][before:] == [{'name': 'get_commentary', 'arguments': command(hit)}]
            assert original_rows.evaluate('(node)=>node.isConnected'); expect(region).to_be_focused(); expect(page).to_have_url(search_url())
            audit(page, state, 'actual three-paragraph inline context and source warning')
            region.get_by_role('button', name='Close context', exact=True).click(); expect(region).to_have_count(0); expect(trigger).to_be_focused(); search_ready(page, search)
            trigger.click(); context_ready(page, around, hit).get_by_role('link', name='Continue from match in source book', exact=True).click()
            expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in continuation['segments']])
            page.goto(search_url()); rows = search_ready(page, search); rows.first.locator('.entry').click()
            expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in exact['segments']]); expect(page.locator('section[aria-label="Pāli passage"] .segment')).to_have_count(1)
            passed('actual context_with uses exact three source paragraphs inline; independent exact anchor remains one paragraph and source-book continuation is pinned to the match')
            page.goto(search_url()); rows = search_ready(page, search); trigger = rows.first.get_by_role('button', name='Read surrounding context', exact=True)
            variants = []
            for kind in ['changed_source', 'wrong_book', 'wrong_ref', 'missing_match', 'wrong_offset', 'duplicate', 'canonical']:
                bad = copy.deepcopy(around)
                if kind == 'changed_source': bad['source']['commit'] = 'controlled-different-context-source'
                elif kind == 'wrong_book': bad['book']['uid'] = 'commentary:other.att.xml'
                elif kind == 'wrong_ref': bad['segments'][0]['ref'] = 'commentary:abh01a.att.xml/c999'
                elif kind == 'missing_match': bad['segments'][1]['ref'] = 'commentary:abh01a.att.xml/c999'
                elif kind == 'wrong_offset': bad['offset'] += 1
                elif kind == 'duplicate': bad['segments'][2] = copy.deepcopy(bad['segments'][1])
                elif kind == 'canonical': bad['canonical'] = True
                variants.append((kind, bad))
            for kind, bad in variants:
                state['mode'] = bad
                page.evaluate("()=>{window.contextAdded=0;window.contextObserver=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)window.contextAdded+=(n.matches('.passage')?1:0)+n.querySelectorAll('.passage').length});window.contextObserver.observe(document.getElementById('view'),{childList:true,subtree:true})}")
                trigger.click(); expect(page.get_by_role('button', name='Retry context', exact=True)).to_be_visible(); expect(page.locator('#study .passage')).to_have_count(0)
                settle(page); assert page.evaluate('window.contextAdded') == 0, kind; page.evaluate('window.contextObserver.disconnect()')
                search_ready(page, search)
                if kind == 'changed_source':
                    rerun = page.get_by_role('button', name='Run commentary search again', exact=True); expect(rerun).to_be_visible()
                    state['mode'] = None; rerun.click(); rows = search_ready(page, search)
                    trigger = rows.first.get_by_role('button', name='Read surrounding context', exact=True)
                else: page.get_by_role('button', name='Close context', exact=True).click()
            audit(page, state, 'malformed or changed context cannot publish source wording')
            passed('changed revision, wrong book/ref/offset, missing/duplicate match and canonical mislabelling fail inline before wording enters the DOM')
            state['mode'] = 'error'; trigger.click(); expect(page.get_by_role('button', name='Retry context', exact=True)).to_be_visible()
            state['mode'] = None; page.get_by_role('button', name='Retry context', exact=True).focus(); page.keyboard.press('Enter'); context_ready(page, around, hit)
            page.get_by_role('button', name='Close context', exact=True).click()
            hold(page, state, trigger); stop = page.get_by_role('button', name='Stop waiting for Commentary source context', exact=True); stop.focus(); page.keyboard.press('Enter')
            expect(page.get_by_role('button', name='Retry context', exact=True)).to_be_visible(); state['mode'] = None
            page.get_by_role('button', name='Retry context', exact=True).click(); current = context_ready(page, around, hit).element_handle()
            reply(state['held'].pop(), around); expect(page.locator('html')).to_have_attribute('data-context-body-complete', 'true'); settle(page)
            assert current.evaluate('(node)=>node.isConnected'); context_ready(page, around, hit)
            page.get_by_role('button', name='Close context', exact=True).click()
            for destination in ['close', 'route']:
                hold(page, state, trigger)
                if destination == 'close': page.get_by_role('button', name='Close context', exact=True).click()
                else: saved(page)
                reply(state['held'].pop(), around); expect(page.locator('html')).to_have_attribute('data-context-body-complete', 'true'); settle(page)
                expect(page.locator('#study .passage')).to_have_count(0)
                if destination == 'close': search_ready(page, search)
            saved(page); expect(page.get_by_label('Your personal note', exact=True)).to_have_value(draft); assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw
            audit(page, state, 'retry Stop close route and late abort-ignoring response preserve draft')
            passed('keyboard retry and owned Stop recover; late bodies cannot replace successful retry, reopen closed context or overwrite Saved and private draft')
            state['mode'] = None; page.goto(search_url()); rows = search_ready(page, search); trigger = rows.first.get_by_role('button', name='Read surrounding context', exact=True)
            hold(page, state, trigger); other_focus = rows.nth(1).locator('.entry'); other_focus.focus()
            reply(state['held'].pop(), around); expect(page.locator('html')).to_have_attribute('data-context-body-complete', 'true'); context_ready(page, around, hit)
            expect(other_focus).to_be_focused(); state['mode'] = None
            for boundary_search, boundary_hit, boundary_context in boundaries:
                page.goto(search_url(boundary_search['query'])); rows = search_ready(page, boundary_search)
                rows.first.get_by_role('button', name='Read surrounding context', exact=True).click(); context_ready(page, boundary_context, boundary_hit)
                expect(page.locator('#study article.segment')).to_have_count(boundary_context['returned'])
                audit(page, state, 'actual source start/end boundaries')
            passed('late context preserves a reader’s newly chosen focus; actual first and final commentary source matches respect three/two-paragraph boundaries without filling missing neighbours')

            context.close()
            search, hit, around, exact, continuation = actual['sinhala']; context, page, state = environment('sinhala')
            page.goto(search_url()); rows = search_ready(page, search); rows.first.get_by_role('button', name='Read surrounding context', exact=True).focus(); page.keyboard.press('Enter')
            context_ready(page, around, hit); assert state['calls'][-1] == {'name': 'get_commentary', 'arguments': command(hit)}
            audit(page, state, 'actual native script context exact source codepoints')
            passed('Sinhala search and context preserve literal source text, Roman references, source terms and backend script warnings')
            context.close()
        browser.close()
    result = {'status': 'passed' if not any(s['violations'] for s in scans) else 'failed', 'passed': len(checks), 'checks': checks,
        'duration_seconds': round(time.monotonic() - started, 2), 'engine': engine, 'outside_source_tree': bool(args.server_dir), 'actual_sources': receipts,
        'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
        'limits': 'Actual bundled commentary hits and context in Roman/Sinhala, exact source codepoints and representative viewport geometry. Changed/malformed metadata, service failures and abort-ignoring transport are explicit fixtures. No publisher fetch, source reconstruction, private writes, full corpus browser traversal, physical-device or human accessibility certification. Axe contexts alone bypass CSP.'}
    print(json.dumps(result, indent=2))
    if args.report: pathlib.Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if result['status'] != 'passed': raise SystemExit(1)
finally: server.terminate(); server.wait(timeout=10)
