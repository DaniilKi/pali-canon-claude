#!/usr/bin/env python3
"""Actual printed source headings, filters and pinned reading. Invalid/stale metadata are fixtures."""
import argparse, copy, hashlib, json, os, pathlib, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY, PRIVATE = 'pali-library-v1', 'PRIVATE_SOURCE_HEADING_NOTE_'
FILTER = 'senāvāsasikkhāpadaṃ'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report'); parser.add_argument('--a11y', action='store_true'); parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args(); started = time.monotonic()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock: sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'; checks, scans, receipts, semantic_receipts = [], [], [], []
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def tool(name, arguments):
    body = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    req = urllib.request.Request(base + '/mcp', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(req, timeout=30))['result']; assert not result.get('isError'), result
    return result.get('structuredContent') or json.loads(result['content'][0]['text'])
def headings(book='vin02m1', query='', offset=0, script='roman'):
    return tool('search_source_book', {'book': book, 'query': query, 'headings_only': True, 'offset': offset, 'limit': 15, 'script': script})
def read(book='vin02m1', offset=0, script='roman', limit=30): return tool('get_text', {'book': book, 'offset': offset, 'limit': limit, 'script': script})
def revision(data): return data['source'].get('locator_revision', data['source']['commit'])
def route(book='vin02m1', query='', offset=0, source=None):
    values = {'book': book, 'mode': 'headings'}
    if query: values['q'] = query
    if offset: values['offset'] = offset
    if source is not None: values['source'] = source
    return base + '/#book-search?' + urllib.parse.urlencode(values)
def fields(href): return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(href).fragment.split('?', 1)[1]))
def reply(r, data=None, error=None):
    result = {'isError': True, 'structuredContent': {'error': error}} if error else {'structuredContent': data}
    r.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': r.request.post_data_json['id'], 'result': result}))

def source_semantics(page, data, root='section[aria-label="Pāli passage"]', level=3, passage='.passage'):
    region = page.locator(root); blocks = region.locator(passage)
    assert blocks.all_text_contents() == [segment['text'] for segment in data['segments']]
    expected_headings = [segment['text'] for segment in data['segments'] if segment['type'] == 'heading']
    assert region.locator('h' + str(level) + passage).all_text_contents() == expected_headings
    if root.startswith('section'):
        expect(region.get_by_role('heading', level=level)).to_have_text(expected_headings)
    assert blocks.evaluate_all("nodes=>nodes.map(node=>({tag:node.tagName,lang:node.getAttribute('lang')}))") == [
        {'tag': 'H' + str(level) if segment['type'] == 'heading' else 'P', 'lang': 'pi'} for segment in data['segments']]
    return expected_headings

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    catalogue = [tool('browse_canon', {'node': 'books', 'offset': offset, 'limit': 40}) for offset in [0, 40]]
    first, second = headings(), headings(offset=15)
    assert first['headings_only'] is True and first['total_headings'] == first['total_matched'] == 480 and first['total_segments'] == 3671
    last_offset = (first['total_headings'] - 1) // 15 * 15; last = headings(offset=last_offset)
    filtered = headings(query=FILTER); assert filtered['total_matched'] == 1 and filtered['total_headings'] == 480
    hit = filtered['results'][0]; assert hit['ref'] == 'vri-book:vin02m1/1006' and hit['type'] == 'heading' and hit['read_with']['offset'] == 1005
    book_start, exact_text, context_text = read(), read(offset=1005), read(offset=1004)
    assert exact_text['segments'][0]['ref'] == hit['ref'] and exact_text['segments'][0]['text'] == hit['excerpt']
    native_heading = read(offset=1005, script='sinhala', limit=1)['segments'][0]
    native_query = '"' + native_heading['text'] + '"'
    native_first, native_filtered = headings(script='sinhala'), headings(query=native_query, script='sinhala')
    native_exact = read(offset=1005, script='sinhala')
    assert native_filtered['results'][0]['ref'] == hit['ref'] and native_filtered['input_romanized']
    abhidhamma = headings('abh01m'); assert abhidhamma['total_headings'] == 155 and abhidhamma['total_segments'] == 2436
    abhidhamma_last = headings('abh01m', offset=150)
    largest = headings('abh03m10'); assert largest['total_headings'] == 2503 and largest['total_segments'] == 8046
    largest_last = headings('abh03m10', offset=2500)
    beyond = headings(offset=1000000); assert beyond['returned'] == 0 and beyond['total_matched'] == 480
    empty_query = 'zzzznonpaliheadingzzzz'; empty = headings(query=empty_query); assert empty['total_matched'] == 0
    for data in [first, second, last, filtered, native_first, native_filtered, abhidhamma, abhidhamma_last, largest, largest_last, beyond]:
        assert data['headings_only'] is True and all(r['type'] == 'heading' for r in data['results'])
        receipts.append({'book': data['book']['id'], 'query': data['query'], 'offset': data['offset'], 'total_headings': data['total_headings'],
                         'refs': [r['ref'] for r in data['results']], 'source': revision(data)})
    commentary_id = tool('get_commentary', {'uid': 'commentary', 'limit': 40})['books'][0]['uid']
    post_id = tool('get_post_canonical', {'limit': 40})['items'][0]['id']
    semantic_cases = []
    for label, command, arguments, context in [
        ('canonical', 'get_text', {'uid': 'mn10'}, {'uid': 'mn10'}),
        ('root book', 'get_text', {'book': 'vin02m1'}, {'book': 'vin02m1'}),
        ('direct commentary', 'get_commentary', {'uid': commentary_id}, {'kind': 'commentary', 'uid': commentary_id}),
        ('later work', 'get_post_canonical', {'citation': post_id}, {'kind': 'post', 'uid': post_id}),
        ('canonical verse', 'get_text', {'uid': 'dhp183'}, {'uid': 'dhp183'})]:
        for script in ['roman', 'sinhala']:
            data = tool(command, {**arguments, 'offset': 0, 'limit': 30, 'script': script})
            semantic_cases.append({'label': label, 'script': script, 'command': command, 'arguments': arguments, 'context': context, 'data': data})
    heading_previews = {}
    for script in ['roman', 'sinhala']:
        direct = next(case['data'] for case in semantic_cases if case['label'] == 'direct commentary' and case['script'] == script)
        query = next(segment['text'] for segment in direct['segments'] if segment['type'] == 'heading')
        search = tool('search_commentary', {'query': query, 'offset': 0, 'limit': 15, 'script': script})
        index, selected = next((i, hit) for i, hit in enumerate(search['results']) if hit['type'] == 'heading')
        command = {k: v for k, v in selected['context_with'].items() if k != 'tool'}
        context_data = tool('get_commentary', {**command, 'script': script})
        assert any(segment['type'] == 'heading' for segment in context_data['segments'])
        heading_previews[script] = {'query': query, 'index': index, 'data': context_data}
    inline_commentary = {script: tool('get_commentary', {'uid': 'mn10', 'offset': 0, 'limit': 20, 'script': script}) for script in ['roman', 'sinhala']}
    assert {s['type'] for c in semantic_cases for s in c['data']['segments']} >= {'heading', 'prose', 'verse'}
    mark = {'uid': 'book:vin02m1', 'ref': hit['ref'], 'offset': 1005, 'source_commit': revision(filtered),
            'title': first['book']['title'], 'note': PRIVATE + 'durable <script>window.headingInjected=true</script> ā😀'}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        engine = {'actual': browser.browser_type.name, 'version': browser.version}; expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]:
            def passed(check):
                checks.append({'width': width, 'theme': theme, 'check': check}); print(f'{width}px {theme}: {check}', flush=True)
            def environment(script='roman', font=30):
                seed = {'theme': theme, 'font': font, 'script': script, 'remember_position': False, 'saved': [mark], 'reading_progress': []}
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(json.dumps(seed)) + ");" +
                    "window.headingIgnoreAbort=false;const headingFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.headingIgnoreAbort&&JSON.parse(options?.body||'{}').params?.name==='search_source_book'){window.headingIgnoreAbort=false;const {signal,...rest}=options;return headingFetch(url,rest).then(async response=>{await response.clone().text();document.documentElement.setAttribute('data-heading-body-complete','true');return response})}return headingFetch(url,options)};")
                state = {'calls': [], 'errors': [], 'forbidden': [], 'mode': None, 'held': []}
                def intercept(r):
                    request = r.request
                    if not request.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or ''):
                        state['forbidden'].append(request.url); r.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        params = request.post_data_json.get('params', {}); state['calls'].append(copy.deepcopy(params)); name = params.get('name')
                        if name not in ['browse_canon', 'search_source_book', 'get_text', 'get_commentary', 'get_post_canonical', 'search_commentary'] or 'translation' in params.get('arguments', {}): state['forbidden'].append(params); r.abort()
                        elif name == 'search_source_book' and state['mode'] == 'hold':
                            state['held'].append(r); request.frame.evaluate("document.documentElement.setAttribute('data-heading-held','true')")
                        elif name == 'search_source_book' and state['mode'] == 'error': reply(r, error='Controlled printed-heading service error')
                        elif name == 'search_source_book' and isinstance(state['mode'], dict): reply(r, state['mode'])
                        elif name == 'get_text' and state['mode'] == 'changed_read':
                            response = r.fetch(); rpc = response.json(); rpc['result']['structuredContent']['source']['locator_revision'] = 'controlled-changed-heading-revision'
                            r.fulfill(response=response, body=json.dumps(rpc))
                        else: r.continue_()
                    else: r.continue_()
                context.route('**/*', intercept); page = context.new_page(); page.set_default_timeout(30000)
                page.on('pageerror', lambda e: state['errors'].append(str(e))); return context, page, state
            def saved(page):
                page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            def result_region(page): return page.get_by_role('region', name='Printed source headings', exact=True)
            def failure(page):
                expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
                expect(page.locator('.book-search-results, section[aria-label="Pāli passage"]')).to_have_count(0)
            def ready(page, data, url=None, query=None):
                query = data['query'] if query is None else query
                if url: expect(page).to_have_url(url)
                expect(page.locator('#view > h2')).to_have_text('Headings · ' + data['book']['title'])
                expect(page.get_by_role('form', name='Source book search', exact=True).get_by_label('Filter printed headings', exact=True)).to_have_value(query)
                expect(page.get_by_role('button', name='Find headings', exact=True)).to_be_visible()
                region = result_region(page); expect(region.locator('h3')).to_have_text([r['ref'] for r in data['results']])
                texts = region.locator('.passage'); expect(texts).to_have_text([r['excerpt'] for r in data['results']]); assert texts.all_text_contents() == [r['excerpt'] for r in data['results']]
                if data['returned']:
                    expect(page.get_by_text(f"Printed source headings: {data['total_headings']} · {data['total_matched']} matching · showing {data['offset'] + 1}–{data['offset'] + data['returned']}", exact=True)).to_be_visible()
                elif data['total_matched']:
                    expect(page.get_by_text(f"This page is beyond the {data['total_matched']} matching printed headings.", exact=True)).to_be_visible()
                else: expect(page.get_by_text('No matching printed headings in this source book.', exact=True)).to_be_visible()
                expect(page.locator('#view')).to_contain_text(data['heading_note']); expect(page.locator('#view')).to_contain_text(data['citation_note'])
                for key in ['input_romanized', 'query_note', 'script_note']:
                    if data.get(key): expect(page.locator('#view')).to_contain_text(data[key])
                if data.get('input_normalised'): expect(page.locator('#view')).to_contain_text(data['input_normalised']['note'])
                expect(page.get_by_role('region', name='Source attribution', exact=True)).to_contain_text(data['source']['terms'])
                for row in data['results']:
                    assert fields(page.get_by_role('link', name='Open heading · ' + row['ref'], exact=True).get_attribute('href')) == {'book': data['book']['id'], 'offset': str(row['read_with']['offset']), 'ref': row['ref'], 'source': revision(data)}
                    if row.get('context_with'):
                        assert fields(page.get_by_role('link', name='Read surrounding source · ' + row['ref'], exact=True).get_attribute('href')) == {'book': data['book']['id'], 'offset': str(row['context_with']['offset']), 'page_source': revision(data)}
                assert page.title() == 'Source headings · Pāli Library'
            def read_ready(page, data):
                texts = page.locator('section[aria-label="Pāli passage"] .passage'); expect(texts).to_have_text([s['text'] for s in data['segments']]); assert texts.all_text_contents() == [s['text'] for s in data['segments']]
                source_semantics(page, data)
            def observe(page):
                page.evaluate("""()=>{window.headingObserver?.disconnect();window.headingAdded=0;window.headingObserver=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)window.headingAdded+=(n.matches('.passage')?1:0)+n.querySelectorAll('.passage').length});window.headingObserver.observe(document.getElementById('view'),{childList:true,subtree:true})}""")
            def no_transient(page):
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); assert page.evaluate('window.headingAdded') == 0; page.evaluate('window.headingObserver.disconnect()')
            def privacy(page, state):
                assert not state['errors'] and not state['forbidden'], state
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert page.evaluate('window.headingInjected') is None; expect(page.locator('#view img, #view script')).to_have_count(0)
            def audit(page, state, stage):
                privacy(page, state); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, theme, stage)
                if args.a11y:
                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                    d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width': width, 'theme': theme, 'state': stage, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})

            context, page, state = environment(); saved(page)
            draft = PRIVATE + 'unsaved exact draft ā😀'; page.get_by_label('Your personal note', exact=True).fill(draft); raw = page.evaluate('localStorage.getItem("pali-library-v1")')
            found_books = []
            for cat in catalogue:
                page.goto(base + '/#browse?' + urllib.parse.urlencode({'node': 'books', **({'offset': cat['offset']} if cat['offset'] else {})}))
                expect(page.locator('.book-catalogue-card')).to_have_count(len(cat['items']))
                for card, book in zip(page.locator('.book-catalogue-card').all(), cat['items']):
                    assert fields(card.get_by_role('link', name='Source headings', exact=True).get_attribute('href')) == {'book': book['id'], 'mode': 'headings'}
                    found_books.append(book['id'])
            assert len(found_books) == len(set(found_books)) == 61
            audit(page, state, 'every real catalogue source has a separate printed-heading entry')
            page.goto(base + '/#browse?node=books')
            catalogue_entry = page.locator('.book-catalogue-card').filter(has=page.locator('a.entry[href="#read?book=vin02m1"]')).get_by_role('link', name='Source headings', exact=True)
            expect(catalogue_entry).to_be_visible()
            before = len(state['calls']); catalogue_entry.focus(); page.keyboard.press('Enter'); ready(page, first, route())
            assert state['calls'][before:] == [{'name': 'search_source_book', 'arguments': {'book': 'vin02m1', 'query': '', 'headings_only': True, 'offset': 0, 'limit': 15, 'script': 'roman'}}], state['calls'][before:]
            page.goto(base + '/#read?book=vin02m1'); read_ready(page, book_start)
            outer = page.locator('.study-actions')
            if outer.get_attribute('open') is None: outer.locator('summary').focus(); page.keyboard.press('Enter')
            before = len(state['calls']); browse_link = page.get_by_role('link', name='Browse source headings', exact=True)
            assert fields(browse_link.get_attribute('href')) == {'book': 'vin02m1', 'mode': 'headings', 'source': revision(book_start)}
            browse_link.focus(); page.keyboard.press('Enter'); ready(page, first, route(source=revision(first)))
            assert state['calls'][before:] == [{'name': 'search_source_book', 'arguments': {'book': 'vin02m1', 'query': '', 'headings_only': True, 'offset': 0, 'limit': 15, 'script': 'roman'}}], state['calls'][before:]
            audit(page, state, 'blank heading browse from existing responsive reading tools')
            passed('all 61 catalogue books expose headings; keyboard reading-tools entry explicitly searches blank headings with the actual source pin')
            page.get_by_role('link', name='Next page →', exact=True).click(); ready(page, second, route(offset=15, source=revision(first)))
            page.go_back(); ready(page, first, route(source=revision(first))); page.go_forward(); ready(page, second, route(offset=15, source=revision(first)))
            page.goto(route(offset=last_offset, source=revision(first))); ready(page, last)
            assert last['results'][-1]['ref'] == 'vri-book:vin02m1/3671'
            for data in [abhidhamma, abhidhamma_last, largest, largest_last]:
                page.goto(route(data['book']['id'], offset=data['offset'])); ready(page, data)
            audit(page, state, 'late colophons and largest source heading list')
            passed('blank browse uses matching-heading pagination independently of source offsets, preserves Back/Forward pins and reaches actual Vinaya/Abhidhamma colophons')
            page.goto(route(offset=1000000)); ready(page, beyond)
            first_link = page.get_by_role('link', name='First source headings', exact=True)
            assert fields(first_link.get_attribute('href')) == {'book': 'vin02m1', 'mode': 'headings', 'source': revision(first)}
            first_link.focus(); page.keyboard.press('Enter'); ready(page, first, route(source=revision(first)))
            page.goto(route(source=revision(first))); ready(page, first)
            field = page.get_by_label('Filter printed headings', exact=True); field.fill(FILTER); field.press('Enter')
            ready(page, filtered, route(query=FILTER, source=revision(first)))
            audit(page, state, 'literal late heading filter without canonical hierarchy claims')
            page.get_by_role('link', name='Open heading · ' + hit['ref'], exact=True).focus(); page.keyboard.press('Enter'); read_ready(page, exact_text)
            page.go_back(); ready(page, filtered, route(query=FILTER, source=revision(first)))
            page.get_by_role('link', name='Read surrounding source · ' + hit['ref'], exact=True).click(); read_ready(page, context_text)
            page.go_back(); ready(page, filtered, route(query=FILTER, source=revision(first)))
            reset = page.get_by_role('link', name='All source headings', exact=True)
            assert fields(reset.get_attribute('href')) == {'book': 'vin02m1', 'mode': 'headings', 'source': revision(first)}
            reset.click(); ready(page, first, route(source=revision(first)))
            field = page.get_by_label('Filter printed headings', exact=True); field.fill(FILTER); field.press('Enter'); ready(page, filtered)
            field = page.get_by_label('Filter printed headings', exact=True); field.fill(''); field.press('Enter'); ready(page, first, route(source=revision(first)))
            normal = page.get_by_role('link', name='Search full source', exact=True)
            assert fields(normal.get_attribute('href')) == {'book': 'vin02m1', 'source': revision(first)}
            normal.click(); expect(page.locator('#view > h2')).to_have_text('Search · ' + first['book']['title'])
            expect(page.get_by_label('Search this source book', exact=True)).to_have_value('')
            expect(page.locator('.book-search-results')).to_have_count(0)
            passed('filtered heading /1006 opens exact source or surrounding context; reset/blank submit preserve heading mode and revision, while full-source switch retains legacy empty-search behaviour')
            page.goto(route(query=empty_query)); ready(page, empty); audit(page, state, 'successful empty heading filter')
            for fragment in ['book-search?book=vin02m1&mode=unknown', 'book-search?book=vin02m1&mode=headings&mode=headings', 'book-search?book=vin02m1&mode=headings&offset=-1', 'book-search?book=vin02m1&mode=headings&offset=1.5', 'book-search?book=vin02m1&mode=headings&offset=1000001', 'book-search?book=vin02m1&mode=headings&uid=mn10', 'book-search?book=unknown&mode=headings', 'book-search?book=vin02m1&mode=headings&q=%00', 'book-search?book=vin02m1&mode=headings&q=%ZZ']:
                before = len(state['calls']); page.goto(base + '/#' + fragment); failure(page); assert len(state['calls']) == before
            variants = []
            for kind in ['ignored_mode', 'false_mode', 'wrong_type', 'wrong_count', 'inconsistent_unfiltered_count', 'missing_note', 'wrong_ref', 'wrong_book', 'wrong_command', 'wrong_offset', 'duplicate', 'next']:
                bad = copy.deepcopy(first)
                if kind == 'ignored_mode': del bad['headings_only']
                elif kind == 'false_mode': bad['headings_only'] = False
                elif kind == 'wrong_type': bad['results'][0]['type'] = 'prose'
                elif kind == 'wrong_count': bad['total_headings'] = bad['total_segments'] + 1
                elif kind == 'inconsistent_unfiltered_count': bad['total_headings'] += 1
                elif kind == 'missing_note': bad['heading_note'] = ''
                elif kind == 'wrong_ref': bad['results'][0]['ref'] = 'vri-book:vin02m1/1006'
                elif kind == 'wrong_book': bad['results'][0]['book_id'] = 'abh01m'
                elif kind == 'wrong_command': bad['results'][0]['read_with']['tool'] = 'get_translation'
                elif kind == 'wrong_offset': bad['results'][0]['read_with']['offset'] += 1
                elif kind == 'duplicate': bad['results'][1] = copy.deepcopy(bad['results'][0])
                elif kind == 'next': bad['next_offset'] = 0
                variants.append((kind, bad))
            for kind, bad in variants:
                saved(page); observe(page); state['mode'] = bad; page.goto(route()); failure(page); no_transient(page)
            state['mode'] = None; audit(page, state, 'invalid route or heading response refuses excerpts before DOM')
            passed('invalid heading modes/routes and ignored-mode, prose-row, impossible-count/ref/command/duplicate/continuation fixtures fail before heading text or reading links')
            saved(page); changed = copy.deepcopy(first); changed['source']['locator_revision'] = 'controlled-changed-heading-revision'; state['mode'] = changed; observe(page)
            page.goto(route(source=revision(first))); failure(page); no_transient(page)
            review = page.get_by_role('link', name='Review current source book search', exact=True)
            assert fields(review.get_attribute('href')) == {'book': 'vin02m1', 'mode': 'headings'}
            state['mode'] = None; review.click(); ready(page, first, route())
            field = page.get_by_label('Filter printed headings', exact=True); field.fill(FILTER); field.press('Enter'); ready(page, filtered)
            state['mode'] = 'changed_read'; observe(page); page.get_by_role('link', name='Open heading · ' + hit['ref'], exact=True).click(); failure(page); no_transient(page)
            state['mode'] = None
            passed('changed list or exact-reading revisions refuse replacement wording; explicit list review preserves headings mode while removing only the old pin')
            saved(page); state['mode'] = 'error'; page.goto(route()); failure(page); state['mode'] = None
            page.get_by_role('button', name='Try again', exact=True).focus(); page.keyboard.press('Enter'); ready(page, first)
            saved(page); state['mode'] = 'hold'; page.evaluate("()=>{window.headingIgnoreAbort=true;document.documentElement.removeAttribute('data-heading-held');document.documentElement.removeAttribute('data-heading-body-complete')}")
            page.goto(route()); expect(page.locator('html')).to_have_attribute('data-heading-held', 'true')
            page.get_by_role('button', name='Stop waiting for Source-book search', exact=True).focus(); page.keyboard.press('Enter')
            expect(page.get_by_role('heading', name='Reading request stopped', exact=True)).to_be_visible(); state['mode'] = None
            page.get_by_role('button', name='Try again', exact=True).click(); ready(page, first); current = result_region(page).element_handle()
            reply(state['held'].pop(), first); expect(page.locator('html')).to_have_attribute('data-heading-body-complete', 'true')
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); assert current.evaluate('(node)=>node.isConnected'); ready(page, first)
            state['mode'] = 'hold'; page.evaluate("()=>{window.headingIgnoreAbort=true;document.documentElement.removeAttribute('data-heading-held');document.documentElement.removeAttribute('data-heading-body-complete')}")
            page.goto(route(query=FILTER)); expect(page.locator('html')).to_have_attribute('data-heading-held', 'true'); saved(page)
            reply(state['held'].pop(), filtered); expect(page.locator('html')).to_have_attribute('data-heading-body-complete', 'true')
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            expect(page.get_by_label('Your personal note', exact=True)).to_have_value(draft); assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw
            audit(page, state, 'stopped or late heading lookup preserves newer view and exact private draft')
            passed('keyboard service retry/Stop recover and late abort-ignoring bodies cannot replace retry or Saved; raw personal notes and drafts stay local and unchanged')
            context.close()
            context, page, state = environment('sinhala'); page.goto(route()); ready(page, native_first, query=''); audit(page, state, 'actual native blank-heading list')
            field = page.get_by_label('Filter printed headings', exact=True); field.fill(native_query); field.press('Enter')
            ready(page, native_filtered, route(query=native_query, source=revision(native_first)), query=native_query)
            assert state['calls'][-1] == {'name': 'search_source_book', 'arguments': {'book': 'vin02m1', 'query': native_query, 'headings_only': True, 'offset': 0, 'limit': 15, 'script': 'sinhala'}}
            audit(page, state, 'native source-derived filter retains conversion labels and literal heading')
            page.get_by_role('link', name='Open heading · ' + hit['ref'], exact=True).click(); read_ready(page, native_exact); audit(page, state, 'actual native heading source position')
            passed('native blank browse and source-derived heading filter preserve backend conversion labels, literal Unicode and actual exact-source reading')
            context.close()
            for script in ['roman', 'sinhala']:
                context, page, state = environment(script, font=None); saved(page)
                draft = PRIVATE + 'semantic unsaved ā😀'
                page.get_by_label('Your personal note', exact=True).fill(draft)
                raw = page.evaluate('localStorage.getItem("pali-library-v1")')
                for case in [c for c in semantic_cases if c['script'] == script]:
                    data = case['data']
                    pinned = {**case['context'], 'offset': '0', 'page_source': revision(data)}
                    page.goto(base + '/#read?' + urllib.parse.urlencode(pinned)); read_ready(page, data)
                    actual_headings = source_semantics(page, data)
                    first_passage = page.locator('section[aria-label="Pāli passage"] .passage').first
                    box = first_passage.bounding_box()
                    line = first_passage.evaluate('(node)=>parseFloat(getComputedStyle(node).lineHeight)')
                    if width <= 390 and case['label'] == 'canonical':
                        assert box['y'] + line <= (700 if width == 320 else 844), (width, script, box, line)
                    for index, segment in enumerate(data['segments']):
                        if segment['type'] != 'heading': continue
                        exact = page.get_by_role('link', name='Open exact passage ' + segment['ref'], exact=True)
                        fields_actual = fields(exact.get_attribute('href'))
                        assert fields_actual == {**case['context'], 'offset': str(index), 'ref': segment['ref'], 'source': revision(data)}
                    if data['segments'][0]['type'] == 'heading':
                        exact = page.get_by_role('link', name='Open exact passage ' + data['segments'][0]['ref'], exact=True)
                        previous_passage = first_passage.element_handle()
                        exact.focus(); page.keyboard.press('Enter')
                        page.wait_for_function('(node)=>!node.isConnected', arg=previous_passage)
                        read_ready(page, data)
                        assert fields(page.url)['source'] == revision(data)
                    audit(page, state, case['label'] + ' ' + script + ' literal source headings are accessible without turning prose/verse into headings')
                    if case['label'] == 'canonical':
                        read_tool(page, 'Traditional commentary').click()
                        expect(page.locator('#study .passage')).to_have_text([s['text'] for s in inline_commentary[script]['segments']])
                        source_semantics(page, inline_commentary[script], '#study', 4)
                        expect(page.locator('#study').get_by_role('heading', level=4)).to_have_text([s['text'] for s in inline_commentary[script]['segments'] if s['type'] == 'heading'])
                        audit(page, state, script + ' aligned inline commentary keeps its distinct level-four source headings')
                    # beforeprint builds the real private-free sheet while preserving its hidden normal-UI lifecycle.
                    page.evaluate("dispatchEvent(new Event('beforeprint'))")
                    sheet = page.locator('#print-document')
                    expect(sheet).to_have_attribute('aria-hidden', 'true')
                    assert sheet.locator('h1').count() == 1
                    source_semantics(page, data, '#print-document', 2, '.print-passage')
                    assert PRIVATE not in sheet.text_content() and 'Your personal note' not in sheet.text_content()
                    assert sheet.locator('textarea,input,button').count() == 0
                    page.emulate_media(media='print')
                    print_styles = sheet.locator('.print-passage').evaluate_all("nodes=>nodes.map(node=>{const s=getComputedStyle(node);return {fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,marginTop:s.marginTop,marginBottom:s.marginBottom}})")
                    assert all(style == print_styles[0] for style in print_styles), 'Printed literal headings changed paragraph typography'
                    assert print_styles[0] == {'fontSize': '17.3333px', 'fontWeight': '400', 'lineHeight': '31.2px', 'marginTop': '17.3333px', 'marginBottom': '17.3333px'}
                    page.emulate_media(media='screen'); page.evaluate("dispatchEvent(new Event('afterprint'))")
                    assert sheet.text_content() == ''
                    assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw
                    semantic_receipts.append({'width': width, 'theme': theme, 'script': script, 'kind': case['label'],
                        'source': revision(data), 'refs': [s['ref'] for s in data['segments']],
                        'source_headings': len(actual_headings), 'segments': len(data['segments']),
                        'types': {kind: sum(s['type'] == kind for s in data['segments']) for kind in ['heading', 'prose', 'verse']},
                        'text_sha256': hashlib.sha256(json.dumps([s['text'] for s in data['segments']], ensure_ascii=False).encode()).hexdigest(),
                        'first_passage_y': box['y'], 'line_height': line, 'print_style': print_styles[0]})
                preview = heading_previews[script]
                page.goto(base + '/#search?' + urllib.parse.urlencode({'q': preview['query'], 'scope': 'commentary'}))
                row = page.locator('section[aria-label="Commentary search results"] .commentary-search-result').nth(preview['index'])
                row.get_by_role('button', name='Read surrounding context', exact=True).click()
                pane = page.get_by_role('region', name='Surrounding commentary context', exact=True)
                expect(pane.locator('.passage')).to_have_text([segment['text'] for segment in preview['data']['segments']])
                source_semantics(page, preview['data'], '[aria-label="Surrounding commentary context"]', 5)
                expect(pane.get_by_role('heading', level=5)).to_have_text([segment['text'] for segment in preview['data']['segments'] if segment['type'] == 'heading'])
                assert pane.get_by_role('heading', level=4).all_text_contents() == [segment['ref'] for segment in preview['data']['segments']]
                audit(page, state, script + ' actual commentary heading search preview retains ref h4 and literal source h5')
                saved(page); expect(page.get_by_label('Your personal note', exact=True)).to_have_value(draft)
                with page.expect_download() as download:
                    page.get_by_role('button', name='Export bookmarks and notes', exact=True).click()
                exported = json.loads(pathlib.Path(download.value.path()).read_text())
                assert exported['saved'][0]['note'] == draft
                assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw
                audit(page, state, script + ' semantic-source navigation and print preserve raw private draft and export')
                passed(script + ': four real source modes plus verse retain literal heading roles, exact pins/text/lang, paragraph print geometry and private draft/export')
                context.close()

        browser.close()
    result = {'status': 'passed' if not any(s['violations'] for s in scans) else 'failed', 'passed': len(checks), 'checks': checks,
        'duration_seconds': round(time.monotonic() - started, 2), 'engine': engine, 'outside_source_tree': bool(args.server_dir), 'actual_pages': receipts, 'semantic_sources': semantic_receipts,
        'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
        'limits': 'Actual bundled printed source headings, source references/revisions and unchanged get_text wording. Representative blank/filter/late pages only, not complete browser traversal of all 20,329 headings. Heading rows include invocations and colophons and establish no canonical hierarchy. Invalid metadata, changed revisions, service errors and abort-ignoring held responses are explicit fixtures. No publisher fetch, English retrieval, private writes, scripture reconstruction or physical-device/human-accessibility certification. Only axe contexts bypass CSP.'}
    print(json.dumps(result, indent=2))
    if args.report: pathlib.Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if result['status'] != 'passed': raise SystemExit(1)
finally: server.terminate(); server.wait(timeout=10)
