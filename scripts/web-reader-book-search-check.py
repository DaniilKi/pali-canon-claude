#!/usr/bin/env python3
"""Actual complete-source-book discovery/search. Malformed/stale responses are explicit fixtures."""
import argparse, copy, json, os, pathlib, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY, PRIVATE = 'pali-library-v1', 'PRIVATE_BOOK_SEARCH_NOTE_'
PHRASE = 'Ime kho panāyasmanto dvenavuti pācittiyā'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report'); parser.add_argument('--a11y', action='store_true'); parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args(); started = time.monotonic()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock: sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'; checks, scans, metrics = [], [], []
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tool(name, arguments):
    body = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    req = urllib.request.Request(base + '/mcp', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(req, timeout=30))['result']; assert not result.get('isError'), result
    return result['structuredContent']
def rev(data): return data['source'].get('locator_revision', data['source']['commit'])
def route(name, **values): return base + '/#' + name + '?' + urllib.parse.urlencode(values)
def fields(url): return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).fragment.split('?', 1)[1]))
def search(book, query, offset=0, script='roman'): return tool('search_source_book', {'book': book, 'query': query, 'offset': offset, 'limit': 15, 'script': script})
def reading(book, offset=0, script='roman'): return tool('get_text', {'book': book, 'offset': offset, 'limit': 30, 'script': script})
def reply(request_route, data=None, error=None):
    result = {'isError': True, 'structuredContent': {'error': error}} if error else {'structuredContent': data}
    request_route.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': request_route.request.post_data_json['id'], 'result': result}))

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    catalogue = tool('browse_canon', {'node': 'books', 'offset': 0, 'limit': 200})
    assert catalogue['total'] == 61 and len(catalogue['items']) == 61 and catalogue['next_offset'] is None
    cat_pages = [tool('browse_canon', {'node': 'books', 'offset': n, 'limit': 40}) for n in [0, 40]]
    quote = '"' + PHRASE + '"'; front = search('vin02m1', quote)
    global_result = tool('search_texts', {'query': quote, 'offset': 0, 'limit': 15, 'script': 'roman'})
    assert not global_result['results'] and front['total_matched'] == 1
    hit = front['results'][0]; assert hit['ref'] == 'vri-book:vin02m1/7' and hit['read_with']['offset'] == 6
    front_page, match_page, context_page = reading('vin02m1'), reading('vin02m1', 6), reading('vin02m1', 5)
    native_segment = tool('get_text', {'book': 'vin02m1', 'offset': 6, 'limit': 1, 'script': 'sinhala'})['segments'][0]
    native_query = '"' + native_segment['text'] + '"'; assert len(native_query) <= 500
    native_front, native_match = search('vin02m1', native_query, script='sinhala'), reading('vin02m1', 6, 'sinhala')
    assert native_front['total_matched'] == 1 and native_front['results'][0]['ref'] == hit['ref']
    keyboard_query = '"Ime kho panāyasmanto dvenavuti paacittiyaa"'; keyboard_result = search('vin02m1', keyboard_query)
    assert keyboard_result['total_matched'] == 1 and keyboard_result['input_normalised']
    candidates = [b for b in catalogue['items'] if 'dhammapad' in b['title'].lower()] + [b for b in catalogue['items'] if b['id'] == 'vin02m1']
    paged = None
    for book in candidates:
        for query in ['dhamma', 'bhikkhu', 'sabba', 'buddha']:
            first = search(book['id'], query)
            if 15 < first['total_matched'] <= 60:
                paged = [first]; break
        if paged: break
    assert paged, 'Choose an actual bounded multi-page book/query, not fabricated matches'
    while paged[-1]['next_offset'] is not None: paged.append(search(paged[0]['book']['id'], paged[0]['query'], paged[-1]['next_offset']))
    all_refs = [r['ref'] for p in paged for r in p['results']]
    assert len(all_refs) == len(set(all_refs)) == paged[0]['total_matched']
    empty_query = 'zzzznonpalimatchzzzz'; empty = search('vin02m1', empty_query); assert empty['total_matched'] == 0
    beyond = search(paged[0]['book']['id'], paged[0]['query'], 1000000)
    mark = {'uid': 'book:vin02m1', 'ref': hit['ref'], 'offset': 6, 'source_commit': rev(front),
            'title': front['book']['title'], 'note': PRIVATE + 'durable <script>window.bookSearchInjected=true</script>'}
    late_reading = tool('get_text', {'uid': 'mn10', 'offset': 0, 'limit': 30, 'script': 'roman'})
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        engine = {'actual': browser.browser_type.name, 'version': browser.version}; expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]:
            def passed(name):
                checks.append({'width': width, 'theme': theme, 'check': name}); print(f'{width}px {theme}: {name}', flush=True)
            def environment(script='roman'):
                seed = {'theme': theme, 'font': 21, 'script': script, 'remember_position': False, 'saved': [mark], 'reading_progress': []}
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(json.dumps(seed)) + ");" +
                    "window.bookSearchIgnoreAbort=false;const bookFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.bookSearchIgnoreAbort&&JSON.parse(options?.body||'{}').params?.name==='search_source_book'){window.bookSearchIgnoreAbort=false;const {signal,...rest}=options;return bookFetch(url,rest).then(async response=>{await response.clone().text();document.documentElement.setAttribute('data-book-search-held-complete','true');return response})}return bookFetch(url,options)};")
                state = {'calls': [], 'errors': [], 'forbidden': [], 'mode': None, 'held': []}
                def intercept(r):
                    request = r.request
                    if not request.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or ''):
                        state['forbidden'].append(request.url); r.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        params = request.post_data_json.get('params', {}); state['calls'].append(copy.deepcopy(params))
                        if params.get('name') not in ['browse_canon', 'get_text', 'search_source_book']:
                            state['forbidden'].append(params); r.abort()
                        elif params['name'] == 'search_source_book' and state['mode'] == 'hold':
                            state['held'].append(r); request.frame.evaluate("document.documentElement.setAttribute('data-book-search-held','true')")
                        elif params['name'] == 'search_source_book' and state['mode'] == 'error': reply(r, error='Controlled source-book search retry fixture')
                        elif params['name'] == 'search_source_book' and isinstance(state['mode'], dict): reply(r, state['mode'])
                        elif params['name'] == 'get_text' and state['mode'] == 'changed_read':
                            response = r.fetch(); rpc = response.json(); rpc['result']['structuredContent']['source']['locator_revision'] = 'controlled-changed-source-book-revision'
                            r.fulfill(response=response, body=json.dumps(rpc))
                        else: r.continue_()
                    else: r.continue_()
                context.route('**/*', intercept); page = context.new_page(); page.set_default_timeout(30000); page.on('pageerror', lambda e: state['errors'].append(str(e)))
                return context, page, state, seed
            def search_url(data, query=None, offset=None, source=True):
                v = {'book': data['book']['id'], 'q': data['query'] if query is None else query}
                if (data['offset'] if offset is None else offset): v['offset'] = data['offset'] if offset is None else offset
                if source: v['source'] = rev(data)
                return route('book-search', **v)
            def ready(page, url, expected, query=None):
                expect(page).to_have_url(url); expect(page.get_by_role('heading', name='Search · ' + expected['book']['title'], exact=True)).to_be_visible()
                expect(page.get_by_role('form', name='Source book search', exact=True).get_by_label('Search this source book', exact=True)).to_have_value(expected['query'] if query is None else query)
                expect(page.locator('.book-search-results h3')).to_have_text([h['ref'] for h in expected['results']])
                excerpts = page.locator('.book-search-results .passage'); expect(excerpts).to_have_text([h['excerpt'] for h in expected['results']]); assert excerpts.all_text_contents() == [h['excerpt'] for h in expected['results']]
                if expected['returned']: expect(page.get_by_text(f"Matching source segments: {expected['total_matched']} · showing {expected['offset'] + 1}–{expected['offset'] + expected['returned']}", exact=True)).to_be_visible()
                elif expected['total_matched']: expect(page.get_by_text(f"This page is beyond the {expected['total_matched']} matching source segments.", exact=True)).to_be_visible()
                else: expect(page.get_by_text('No matching source segments in this book. Try a different Pāli word or phrase.', exact=True)).to_be_visible()
                expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)
                assert page.title() == 'Source-book search · Pāli Library'
            def read_ready(page, expected):
                texts = page.locator('section[aria-label="Pāli passage"] .passage'); expect(texts).to_have_text([s['text'] for s in expected['segments']]); assert texts.all_text_contents() == [s['text'] for s in expected['segments']]
                expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)
            def saved(page):
                page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            def failure(page):
                expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
                expect(page.locator('.book-search-results .passage, section[aria-label="Pāli passage"]')).to_have_count(0)
            def arm_excerpt_counter(page):
                page.evaluate("""()=>{window.bookSearchExcerptObserver?.disconnect();window.bookSearchAddedExcerpts=0;
                    window.bookSearchExcerptObserver=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)
                    if(n.nodeType===1)window.bookSearchAddedExcerpts+=(n.matches('.passage')?1:0)+n.querySelectorAll('.passage').length});
                    window.bookSearchExcerptObserver.observe(document.getElementById('view'),{childList:true,subtree:true})}""")
            def no_transient_excerpt(page):
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                assert page.evaluate('window.bookSearchAddedExcerpts') == 0
                page.evaluate('window.bookSearchExcerptObserver.disconnect()')
            def privacy(page, state):
                assert not state['errors'] and not state['forbidden'], state
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert page.evaluate('window.bookSearchInjected') is None; expect(page.locator('#view img, #view script')).to_have_count(0)
            def audit(page, state, stage):
                privacy(page, state); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, theme, stage)
                if not args.a11y: return
                page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width': width, 'theme': theme, 'state': stage, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})

            context, page, state, seed = environment(); saved(page)
            draft = PRIVATE + 'unsaved exact note ā😀'; page.get_by_label('Your personal note', exact=True).fill(draft)
            raw = page.evaluate('localStorage.getItem("pali-library-v1")')
            discovered = []
            for cp in cat_pages:
                page.goto(route('browse', node='books', **({'offset': cp['offset']} if cp['offset'] else {})))
                expect(page.get_by_role('heading', name='Complete VRI source books', exact=True)).to_be_visible()
                expect(page.locator('.book-catalogue-card .entry strong')).to_have_text([b['title'] for b in cp['items']])
                expect(page.locator('.book-catalogue-card')).to_have_count(len(cp['items']))
                for card, book in zip(page.locator('.book-catalogue-card').all(), cp['items']):
                    assert fields(base + '/' + card.locator('a.entry').get_attribute('href')) == {'book': book['id']}
                    search_link = card.get_by_role('link', name='Search this source book', exact=True)
                    assert fields(base + '/' + search_link.get_attribute('href')) == {'book': book['id']}
                    discovered.append(book['id'])
            assert discovered == [b['id'] for b in catalogue['items']]
            last_book = catalogue['items'][-1]; page.locator('.book-catalogue-card').last.get_by_role('link', name='Search this source book', exact=True).focus(); page.keyboard.press('Enter')
            expect(page.get_by_role('heading', name='Search · ' + last_book['title'], exact=True)).to_be_visible(); expect(page.locator('.book-search-results')).to_have_count(0)
            assert state['calls'][-1] == {'name': 'browse_canon', 'arguments': {'node': 'books', 'offset': 0, 'limit': 200}}
            audit(page, state, 'all61 catalogue IDs reachable through separate search links')
            passed('all 61 actual catalogue IDs remain readable and separately searchable on both pages; keyboard last-book entry verifies the complete catalogue without a query/source request')

            page.goto(route('read', book='vin02m1')); read_ready(page, front_page)
            form = page.get_by_role('form', name='Source book search', exact=True); outer = page.locator('.study-actions')
            assert (outer.get_attribute('open') is None) == (width <= 760)
            metrics.append({'width': width, 'theme': theme, 'first_book_passage_y': page.locator('section[aria-label="Pāli passage"] .passage').first.bounding_box()['y'], 'search_form_visible_initially': form.is_visible()})
            if width <= 760: expect(form).to_be_hidden(); outer.locator('summary').focus(); page.keyboard.press('Enter')
            expect(form).to_be_visible(); field = form.get_by_label('Search this source book', exact=True)
            before = len(state['calls']); url_before = page.url; field.fill(''); field.press('Enter'); expect(form.get_by_role('alert')).to_be_visible(); expect(field).to_be_focused()
            assert len(state['calls']) == before and page.url == url_before
            field.fill(quote); field.press('Enter'); ready(page, search_url(front), front)
            assert state['calls'][-1] == {'name': 'search_source_book', 'arguments': {'book': 'vin02m1', 'query': quote, 'offset': 0, 'limit': 15, 'script': 'roman'}}
            expect(page.get_by_role('region', name='Source attribution', exact=True)).to_contain_text(front['source']['terms'])
            audit(page, state, 'front matter search via existing phone reading tools')
            passed('existing phone tools hide the new form without an extra disclosure row; keyboard query finds actual front matter that global canonical search omits and returns full attribution/citation caution')

            exact_link = page.get_by_role('link', name='Read match · ' + hit['ref'], exact=True); target = exact_link.get_attribute('href')
            assert fields(base + '/' + target) == {'book': 'vin02m1', 'offset': '6', 'ref': hit['ref'], 'source': rev(front)}
            exact_link.click(); read_ready(page, match_page); assert page.locator('.segment-label a').first.inner_text() == hit['ref']
            page.go_back(); ready(page, search_url(front), front)
            context_link = page.get_by_role('link', name='Read surrounding source · ' + hit['ref'], exact=True); target = context_link.get_attribute('href')
            assert fields(base + '/' + target) == {'book': 'vin02m1', 'offset': '5', 'page_source': rev(front)}
            context_link.click(); read_ready(page, context_page); page.go_back(); ready(page, search_url(front), front)
            passed('exact reading uses actual ref/source/offset; surrounding source uses revision-only page_source without inventing a citation, and browser Back restores the precise search')

            visited = []
            for i, expected in enumerate(paged):
                expected_url = search_url(expected)
                if i == 0: page.goto(expected_url)
                else: page.get_by_role('link', name='Next page →', exact=True).click()
                ready(page, expected_url, expected); visited += page.locator('.book-search-results h3').all_text_contents()
            assert visited == all_refs and len(visited) == len(set(visited))
            page.go_back(); ready(page, search_url(paged[-2]), paged[-2]); page.go_forward(); ready(page, search_url(paged[-1]), paged[-1])
            assert any(h['read_with']['offset'] != p['offset'] + i for p in paged for i, h in enumerate(p['results']))
            audit(page, state, 'complete actual within-book matching pagination')
            passed('every bounded actual matching page is visited with no omitted/duplicated refs; match-list offsets differ from source positions and Back/Forward restore exact pages')

            page.goto(search_url(empty)); ready(page, search_url(empty), empty)
            expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_have_count(0)
            page.goto(search_url(beyond)); ready(page, search_url(beyond), beyond); page.get_by_role('link', name='First search results', exact=True).click(); ready(page, search_url(paged[0]), paged[0])
            audit(page, state, 'empty result versus out-of-range matching page')
            assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw
            saved(page); expect(page.get_by_label('Your personal note', exact=True)).to_have_value(draft); privacy(page, state)
            passed('zero matches are a successful search, beyond-end pages recover with preserved query/book/source, and exact private notes/drafts/storage never enter search requests, title or URL')
            context.close()

            context, page, state, seed = environment('sinhala')
            page.goto(route('book-search', book='vin02m1', source=rev(front)))
            expect(page.get_by_role('heading', name='Search · ' + front['book']['title'], exact=True)).to_be_visible()
            field = page.get_by_role('form', name='Source book search', exact=True).get_by_label('Search this source book', exact=True); field.fill(native_query); field.press('Enter')
            ready(page, search_url(native_front, native_query), native_front, native_query)
            page.get_by_role('link', name='Read match · ' + hit['ref'], exact=True).click(); read_ready(page, native_match)
            assert any(c == {'name': 'search_source_book', 'arguments': {'book': 'vin02m1', 'query': native_query, 'offset': 0, 'limit': 15, 'script': 'sinhala'}} for c in state['calls'])
            assert json.loads(page.evaluate('localStorage.getItem("pali-library-v1")')) == seed
            audit(page, state, 'native quoted input/output and exact source reading')
            passed('quoted Sinhala input/output round-trips actual source codepoints and the same ref/pin; explicit search never reads English or changes private browser data')
            context.close()

            if width == 390 and theme == 'light':
                context, page, state, seed = environment()
                page.goto(search_url(keyboard_result, keyboard_query)); ready(page, search_url(keyboard_result, keyboard_query), keyboard_result, keyboard_query)
                expect(page.locator('#view')).to_contain_text(keyboard_result['input_normalised']['note'])
                passed('actual labelled keyboard normalization retains the original query selection while showing its inferred Roman reading')
                bad_routes = ['q=dhamma', 'book=../vin02m1&q=dhamma', 'book=vin02m1&book=vin02m1&q=dhamma', 'book=vin02m1&q=dhamma&q=metta',
                    'book=vin02m1&q=dhamma&offset=-1', 'book=vin02m1&q=dhamma&offset=01', 'book=vin02m1&q=dhamma&offset=1000001',
                    'book=vin02m1&offset=1', 'book=vin02m1&q=' + 'a' * 501, 'book=vin02m1&q=dhamma&script=sinhala',
                    'book=vin02m1&q=dhamma&allow_partial=true', 'book=vin02m1&q=dhamma&source=', 'book=vin02m1&q=dhamma&source=' + rev(front) + '?ignored=1']
                for query in bad_routes:
                    saved(page); before = len(state['calls']); page.goto(base + '/#book-search?' + query); failure(page); assert len(state['calls']) == before
                audit(page, state, 'malformed root-book search routes fail before MCP')
                passed('missing/path/duplicate/mixed/oversize/noninteger source-search routes reject before any MCP call or excerpt')
                variants = []
                for kind in ['book', 'ref', 'tool', 'readbook', 'read_offset', 'context', 'next', 'duplicate', 'source', 'count', 'query', 'normalization']:
                    bad = copy.deepcopy(paged[0])
                    if kind == 'book': bad['book']['id'] = 'vin02m1' if bad['book']['id'] != 'vin02m1' else catalogue['items'][0]['id']
                    elif kind == 'ref': bad['results'][0]['ref'] = bad['results'][0]['ref'] + '0'
                    elif kind == 'tool': bad['results'][0]['read_with']['tool'] = 'get_translation'
                    elif kind == 'readbook': bad['results'][0]['read_with']['book'] = 'unsupported-book'
                    elif kind == 'read_offset': bad['results'][0]['read_with']['offset'] += 1
                    elif kind == 'context': bad['results'][0]['context_with']['limit'] = 30
                    elif kind == 'next': bad['next_offset'] = 0
                    elif kind == 'duplicate': bad['results'][1] = copy.deepcopy(bad['results'][0])
                    elif kind == 'source': bad['source']['repository'] = 'https://example.invalid/unreviewed'
                    elif kind == 'count': bad['total_segments'] = 0
                    elif kind == 'query': bad['query'] = 'controlled wrong query'
                    else: bad['input_normalised'] = {**copy.deepcopy(keyboard_result['input_normalised']), 'original': 'controlled wrong original', 'read_as': bad['query']}
                    variants.append((kind, bad))
                for kind, bad in variants:
                    saved(page); arm_excerpt_counter(page); state['mode'] = bad; before = len(state['calls'])
                    page.goto(search_url(paged[0])); failure(page)
                    no_transient_excerpt(page)
                    assert state['calls'][before:] == [{'name': 'search_source_book', 'arguments': {'book': paged[0]['book']['id'], 'query': paged[0]['query'], 'offset': 0, 'limit': 15, 'script': 'roman'}}], kind
                state['mode'] = None; audit(page, state, 'malformed metadata refused before any excerpt')
                passed('each wrong-book/ref/reading-command/context/continuation/duplicate/source/count fixture executes its own request and fails before rendering any excerpt')
                saved(page); arm_excerpt_counter(page); stale = copy.deepcopy(front); stale['source']['locator_revision'] = 'controlled-changed-source-book-revision'; state['mode'] = stale
                page.goto(search_url(front)); failure(page); no_transient_excerpt(page)
                review = page.get_by_role('link', name='Review current source book search', exact=True)
                assert fields(base + '/' + review.get_attribute('href')) == {'book': 'vin02m1', 'q': quote}
                state['mode'] = None; review.click(); ready(page, route('book-search', book='vin02m1', q=quote), front)
                passed('changed search revision exposes no substitute excerpt; explicit review removes only its old source pin')
                state['mode'] = 'changed_read'
                # The current valid search is already mounted; count only newly added nodes.
                arm_excerpt_counter(page); page.get_by_role('link', name='Read surrounding source · ' + hit['ref'], exact=True).click(); failure(page); no_transient_excerpt(page)
                assert fields(page.url)['page_source'] == rev(front); assert json.loads(page.evaluate('localStorage.getItem("pali-library-v1")')) == seed
                state['mode'] = None; passed('context page_source refuses changed source wording without upgrading a saved note/ref pin')
                saved(page); state['mode'] = 'error'; page.goto(search_url(front)); failure(page)
                before = len(state['calls']); state['mode'] = None; page.get_by_role('button', name='Try again', exact=True).click(); ready(page, search_url(front), front)
                assert state['calls'][before:] == [{'name': 'search_source_book', 'arguments': {'book': 'vin02m1', 'query': quote, 'offset': 0, 'limit': 15, 'script': 'roman'}}]
                passed('explicit retry repeats the same book/query/page/script without granting source consent or fallback')
                saved(page); state['mode'] = 'hold'
                page.evaluate("()=>{window.bookSearchIgnoreAbort=true;document.documentElement.removeAttribute('data-book-search-held-complete')}")
                page.goto(search_url(front)); expect(page.locator('html')).to_have_attribute('data-book-search-held', 'true')
                stop = page.get_by_role('button', name='Stop waiting for Source-book search', exact=True); stop.focus(); page.keyboard.press('Enter')
                expect(page.get_by_role('heading', name='Reading request stopped', exact=True)).to_be_visible()
                state['mode'] = None; page.goto(route('read', uid='mn10')); read_ready(page, late_reading)
                reply(state['held'].pop(), front); expect(page.locator('html')).to_have_attribute('data-book-search-held-complete', 'true')
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                read_ready(page, late_reading); expect(page.locator('.book-search-results')).to_have_count(0); privacy(page, state)
                passed('keyboard Stop plus a real abort-ignoring held search body cannot overwrite a newer actual Pāli reading')
                context.close()
        browser.close()
    result = {'status': 'passed' if not any(s['violations'] for s in scans) else 'failed', 'passed': len(checks), 'checks': checks,
              'duration_seconds': round(time.monotonic() - started, 2), 'engine': engine, 'outside_source_tree': bool(args.server_dir),
              'source_gap': {'book': 'vin02m1', 'ref': hit['ref'], 'source_offset': 6, 'global_canonical_matches': len(global_result['results']), 'source_book_matches': front['total_matched'], 'revision': rev(front)},
              'catalogue_total': catalogue['total'], 'pagination': {'book': paged[0]['book']['id'], 'query': paged[0]['query'], 'matched': len(all_refs), 'pages': len(paged)},
              'metrics': metrics, 'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
              'limits': 'Actual complete VRI root-book catalogue, source search, native source text and exact get_text metadata; the quoted front matter is an observed absence from global canonical body results, not proof of broader unavailability. Private notes, changed source pins, malformed command/count metadata, retry errors and an abort-ignoring held source response are explicit fixtures. No reconstructed scripture, English/provider request or source-coverage expansion. Normal contexts preserve CSP; only axe contexts bypass it. Desktop/codepoint/axe checks do not certify physical devices, native OS glyph shaping or human accessibility.'}
    print(json.dumps(result, indent=2))
    if args.report: pathlib.Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if result['status'] != 'passed': raise SystemExit(1)
finally: server.terminate(); server.wait(timeout=10)
