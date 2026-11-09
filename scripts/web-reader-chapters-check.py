#!/usr/bin/env python3
"""Actual existing post-canonical chapter menus and finite source-context compaction."""
import argparse, copy, json, os, pathlib, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY, PRIVATE = 'pali-library-v1', 'PRIVATE_CHAPTER_NOTE_'
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
def post(citation, limit=30, script='roman'): return tool('get_post_canonical', {'citation': citation, 'offset': 0, 'limit': limit, 'script': script})
def revision(data): return data['source'].get('locator_revision', data['source']['commit'])
def href(citation, pin=None):
    params = {'kind': 'post', 'uid': citation}
    if pin is not None: params.update(offset=0, page_source=pin)
    return base + '/#read?' + urllib.parse.urlencode(params)
def fields(url): return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(url).fragment.split('?', 1)[1]))
def reply(r, data=None, error=None):
    result = {'isError': True, 'structuredContent': {'error': error}} if error else {'structuredContent': data}
    r.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': r.request.post_data_json['id'], 'result': result}))

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    expected_counts = {'Vism': 23, 'Abhidh-s': 9, 'mahavamsa': 63, 'visuddhimagga-1': 11, 'visuddhimagga-2': 12,
        'abhidhammatthasangaho': 18, 'visuddhimagga-nidanakatha': 37, 'visuddhimagga-mahatika-1': 11, 'visuddhimagga-mahatika-2': 12}
    roots = {name: post(name) for name in expected_counts}
    for name, data in roots.items():
        assert len(data['chapters']) == expected_counts[name]
        assert data['chapter_index']['scope'] == ('work' if name in ['Vism', 'Abhidh-s'] else 'source_file')
        assert data['chapter_index']['read_with'] == {'tool': 'get_post_canonical', 'citation': name, 'offset': 0, 'limit': 1}
    targets = {r['citation']: post(r['citation']) for name, indices in [('Vism', [0, 11, 22]), ('Abhidh-s', [8]), ('abhidhammatthasangaho', [17]), ('mahavamsa', [62])]
               for i, r in enumerate(roots[name]['chapters']) if i in indices}
    child = targets[roots['Vism']['chapters'][11]['citation']]
    parent = post('Vism', 1)
    native_root = post('Vism', 30, 'sinhala'); native_parent = post('Vism', 1, 'sinhala')
    native_child = post(roots['Vism']['chapters'][11]['citation'], 30, 'sinhala'); native_last = post(roots['Vism']['chapters'][22]['citation'], 30, 'sinhala')
    root_book = tool('get_text', {'book': 'vin02m1', 'offset': 0, 'limit': 30, 'script': 'roman'})
    canonical = tool('get_text', {'uid': 'mn10', 'offset': 0, 'limit': 30, 'script': 'roman'})
    marker = {'uid': 'post:' + child['citation'], 'ref': child['segments'][0]['ref'], 'offset': 0, 'source_commit': revision(child),
              'title': child['title'], 'note': PRIVATE + 'durable ā😀'}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        engine = {'actual': browser.browser_type.name, 'version': browser.version}; expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]:
            height = 700 if width == 320 else 844 if width == 390 else 900
            def passed(name):
                checks.append({'width': width, 'theme': theme, 'check': name}); print(f'{width}px {theme}: {name}', flush=True)
            def environment(script='roman'):
                seed = {'font': 21, 'theme': theme, 'script': script, 'remember_position': False, 'saved': [marker], 'reading_progress': []}
                context = browser.new_context(viewport={'width': width, 'height': height}, bypass_csp=args.a11y)
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(json.dumps(seed)) + ");" +
                    "window.chapterIgnoreAbort=false;const chapterFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.chapterIgnoreAbort&&JSON.parse(options?.body||'{}').params?.arguments?.limit===1){window.chapterIgnoreAbort=false;const {signal,...rest}=options;return chapterFetch(url,rest).then(async response=>{await response.clone().text();document.documentElement.setAttribute('data-chapter-body-complete','true');return response})}return chapterFetch(url,options)};")
                state = {'calls': [], 'errors': [], 'forbidden': [], 'mode': None, 'held': []}
                def intercept(r):
                    request = r.request
                    if not request.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or ''):
                        state['forbidden'].append(request.url); r.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        params = request.post_data_json.get('params', {}); state['calls'].append(copy.deepcopy(params)); name, arguments = params.get('name'), params.get('arguments', {})
                        if name not in ['get_text', 'get_post_canonical']:
                            state['forbidden'].append(params); r.abort()
                        elif name == 'get_post_canonical' and arguments.get('limit') == 1 and state['mode'] == 'hold':
                            state['held'].append(r); request.frame.evaluate("document.documentElement.setAttribute('data-chapter-held','true')")
                        elif name == 'get_post_canonical' and arguments.get('limit') == 1 and state['mode'] == 'error': reply(r, error='Controlled chapter-list service failure')
                        elif name == 'get_post_canonical' and arguments.get('limit') == 1 and isinstance(state['mode'], dict): reply(r, state['mode'])
                        elif name == 'get_text' and state['mode'] == 'warnings':
                            response = r.fetch(); rpc = response.json(); d = rpc['result']['structuredContent']
                            d['notes'] += ['CONTROLLED unknown source-selection note remains visible', 'CONTROLLED plan assignment warning remains visible']
                            d['approximate'] = True; d['alignment_note'] = 'CONTROLLED alignment warning remains visible'
                            d['input_normalised'] = {'note': 'CONTROLLED input interpretation remains visible'}
                            r.fulfill(response=response, body=json.dumps(rpc))
                        elif name == 'get_post_canonical' and arguments.get('limit') == 30 and state['mode'] == 'post_warnings':
                            response = r.fetch(); rpc = response.json()
                            rpc['result']['structuredContent']['notes'].append('CONTROLLED unfamiliar post selection note remains visible')
                            r.fulfill(response=response, body=json.dumps(rpc))
                        else: r.continue_()
                    else: r.continue_()
                context.route('**/*', intercept); page = context.new_page(); page.set_default_timeout(30000)
                page.on('pageerror', lambda e: state['errors'].append(str(e))); return context, page, state, seed
            def ready(page, data, expected_url=None):
                if expected_url: expect(page).to_have_url(expected_url)
                title = (data['citation'] + ' · ' if data.get('citation') else '') + data.get('title', data.get('book_id', ''))
                expect(page.locator('#view > h2')).to_have_text(title)
                texts = page.locator('section[aria-label="Pāli passage"] .passage'); expect(texts).to_have_text([s['text'] for s in data['segments']])
                assert texts.all_text_contents() == [s['text'] for s in data['segments']]
                expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)
            def tools(page):
                outer = page.locator('.study-actions')
                if outer.get_attribute('open') is None: outer.locator('summary').focus(); page.keyboard.press('Enter')
                return outer
            def menu(page, data):
                form = page.get_by_role('form', name='Chapter navigation', exact=True)
                control = form.get_by_role('combobox', name='Chapter in this work' if data['chapter_index']['scope'] == 'work' else 'Chapter in this source file', exact=True)
                expect(control).to_be_visible(); expect(control.locator('option')).to_have_text(['Choose a chapter'] + [r['citation'] + ' · ' + r['title'] for r in data['chapters']])
                assert control.locator('option').evaluate_all('(items)=>items.map(x=>x.value)') == [''] + [r['citation'] for r in data['chapters']]
                return control
            def load_menu(page, current, root):
                tools(page); command = current['chapter_index']['read_with']; before = len(state['calls'])
                page.get_by_role('button', name='Choose chapter', exact=True).click(); control = menu(page, root); expect(control).to_be_focused()
                assert state['calls'][before:] == [{'name': command['tool'], 'arguments': {'citation': command['citation'], 'offset': 0, 'limit': 1, 'script': 'roman'}}]
                return control
            def open_chapter(page, root, row, expected):
                control = menu(page, root); before = len(state['calls']); old_url = page.url
                control.select_option(row['citation']); expect(control).to_have_value(row['citation'])
                assert len(state['calls']) == before and page.url == old_url
                page.get_by_role('button', name='Open chapter', exact=True).focus(); page.keyboard.press('Enter')
                expected_url = href(row['citation'], revision(root)); ready(page, expected, expected_url)
                assert fields(page.url) == {'kind': 'post', 'uid': row['citation'], 'offset': '0', 'page_source': revision(root)}
                assert state['calls'][before:] == [{'name': 'get_post_canonical', 'arguments': {'citation': row['citation'], 'offset': 0, 'limit': 30, 'script': 'roman'}}]
            def saved(page):
                page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            def private_draft(page):
                saved(page); page.get_by_label('Your personal note', exact=True).fill(PRIVATE + 'unsaved exact draft')
            def unchanged(page, state, raw):
                assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw
                assert not state['errors'] and not state['forbidden'], state
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
            def audit(page, state, stage):
                assert not state['errors'] and not state['forbidden'], state
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, theme, stage)
                if not args.a11y: return
                page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width': width, 'theme': theme, 'state': stage, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})
            def print_source(page, data, originals):
                page.evaluate("dispatchEvent(new Event('beforeprint'))")
                assert page.locator('#print-document .print-passage').all_text_contents() == [s['text'] for s in data['segments']]
                text = page.locator('#print-document').text_content()
                for note in originals: assert note in text, note
                assert data['source']['terms'] in text and PRIVATE not in text
                assert 'Choose a chapter' not in text and 'Open chapter' not in text
                expect(page.locator('#print-document .chapter-picker, #print-document .source-position')).to_have_count(0)
                page.evaluate("dispatchEvent(new Event('afterprint'))")
            def first_line(page, label):
                page.evaluate('scrollTo(0,0)')
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                first = page.locator('section[aria-label="Pāli passage"] .passage').first
                body = page.locator('section[aria-label="Pāli passage"] .segment:not(.heading) .passage').first
                y, line = first.bounding_box()['y'], first.evaluate('(e)=>parseFloat(getComputedStyle(e).lineHeight)')
                metric = {'width': width, 'height': height, 'theme': theme, 'case': label, 'first_source_y': y, 'first_source_line_height': line,
                          'first_nonheading_y': body.bounding_box()['y'], 'scroll_y': page.evaluate('scrollY'), 'tools_open': page.locator('.study-actions').get_attribute('open') is not None}
                metrics.append(metric)
                if width <= 760: assert not metric['tools_open'] and y + line <= height, metric
                print('GEOMETRY ' + json.dumps(metric), flush=True)
            def arm_titles(page):
                page.evaluate("""()=>{window.chapterTitleObserver?.disconnect();window.chapterAddedTitles=0;window.chapterTitleObserver=new MutationObserver(rs=>{for(const r of rs)for(const n of r.addedNodes)if(n.nodeType===1)window.chapterAddedTitles+=(n.matches('option[value]:not([value=""])')?1:0)+n.querySelectorAll('option[value]:not([value=""])').length});window.chapterTitleObserver.observe(document.querySelector('.chapter-navigation'),{childList:true,subtree:true})}""")
            def no_titles(page):
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); assert page.evaluate('window.chapterAddedTitles') == 0
                page.evaluate('window.chapterTitleObserver.disconnect()')

            context, page, state, seed = environment()
            for data, url, label, originals in [(root_book, base + '/#read?book=vin02m1', 'complete root book', root_book['notes']), (roots['Vism'], href('Vism'), 'logical Vism work', [roots['Vism']['label'], *roots['Vism']['notes']])]:
                page.goto(url); ready(page, data, url); first_line(page, label)
                expect(page.locator('.reading-context-status')).to_be_visible()
                if width <= 760: expect(page.get_by_role('region', name='Source context', exact=True)).to_be_hidden()
                tools(page)
                for original in originals: expect(page.get_by_role('region', name='Source context', exact=True)).to_contain_text(original)
                if label == 'logical Vism work':
                    expect(page.locator('.reading-context-status')).to_contain_text('Not canon.')
                    expect(page.locator('.reading-context-status')).to_contain_text('Volume 1: chapters 1–11 of 23')
                print_source(page, data, originals); audit(page, state, label + ' compact intro preserves full source context and print')
                passed(label + ': first printed source line fits the phone budget with tools closed; all source headings/text/context/terms remain printable and no chapter options are printed')
            private_draft(page); raw = page.evaluate('localStorage.getItem("pali-library-v1")')
            page.goto(href('Vism')); ready(page, roots['Vism']); tools(page)
            control = menu(page, roots['Vism']); expect(control).to_have_value(''); expect(page.get_by_role('button', name='Open chapter', exact=True)).to_be_disabled()
            before = len(state['calls']); control.focus(); page.keyboard.press('ArrowDown'); assert len(state['calls']) == before
            audit(page, state, 'logical23 chapter menu')
            passed('logical Vism exposes all23 actual ordered chapters with an empty initial selection, explicit keyboard Open and no menu-fetch/autonavigation')
            for index in [0, 11, 22]:
                if index: load_menu(page, targets[roots['Vism']['chapters'][0 if index == 11 else 11]['citation']], roots['Vism'])
                row = roots['Vism']['chapters'][index]; open_chapter(page, roots['Vism'], row, targets[row['citation']])
                if index == 11:
                    expect(page.get_by_role('region', name='Personal note for ' + marker['ref'], exact=True).get_by_label('Your personal note for ' + marker['ref'], exact=True)).to_have_value(PRIVATE + 'unsaved exact draft')
                    print_source(page, targets[row['citation']], [targets[row['citation']]['label'], *targets[row['citation']]['notes']])
            assert targets[roots['Vism']['chapters'][11]['citation']]['book']['id'] == 'visuddhimagga-2'
            before = len(state['calls']); page.reload(); ready(page, targets[roots['Vism']['chapters'][22]['citation']])
            assert len(state['calls']) == before + 1 and state['calls'][-1]['arguments']['limit'] == 30
            load_menu(page, targets[roots['Vism']['chapters'][22]['citation']], roots['Vism']); unchanged(page, state, raw)
            # Reload deliberately starts a new in-memory draft Map. Durable data stays exact;
            # explicitly begin a fresh tab draft for the remaining navigation checks.
            saved(page); expect(page.get_by_label('Your personal note', exact=True)).to_have_value(marker['note'])
            page.get_by_label('Your personal note', exact=True).fill(PRIVATE + 'unsaved exact draft')
            passed('Vism1→12→23 opens literal returned citations across both files with revision-only pins; reloading a child fetches its parent only after explicit Choose chapter')

            for name, index in [('Abhidh-s', 8), ('abhidhammatthasangaho', 17)]:
                page.goto(href(name)); ready(page, roots[name]); tools(page); menu(page, roots[name])
                row = roots[name]['chapters'][index]; open_chapter(page, roots[name], row, targets[row['citation']])
            assert roots['Abhidh-s']['chapters'][0]['title'] == roots['abhidhammatthasangaho']['chapters'][0]['title']
            audit(page, state, 'Abhidh9 work versus raw18 source file')
            passed('Abhidh-s has nine work chapters while its exact raw file has18 including the appended material; each opens only its own returned literal citation')
            for name in ['visuddhimagga-1', 'visuddhimagga-2', 'visuddhimagga-nidanakatha', 'visuddhimagga-mahatika-1', 'visuddhimagga-mahatika-2']:
                page.goto(href(name)); ready(page, roots[name]); tools(page); menu(page, roots[name])
                expect(page.get_by_role('combobox', name='Chapter in this work', exact=True)).to_have_count(0)
                assert all(r['citation'].startswith(name + ' ') for r in roots[name]['chapters'])
            passed('raw Vism volumes retain11/12 rows, Nidānakathā37 and Mahāṭīkā11/12 remain separate source files without any prefix-based Vism work mapping')
            page.goto(href('mahavamsa')); ready(page, roots['mahavamsa']); tools(page); menu(page, roots['mahavamsa'])
            row = roots['mahavamsa']['chapters'][62]; open_chapter(page, roots['mahavamsa'], row, targets[row['citation']])
            unchanged(page, state, raw); saved(page); expect(page.get_by_label('Your personal note', exact=True)).to_have_value(PRIVATE + 'unsaved exact draft')
            passed('all63 actual Mahāvaṃsa chapter options are reachable and the last opens its exact Pāli/pin; chapter browsing never alters the saved note or its draft')
            context.close()

            context, page, state, seed = environment('sinhala'); private_draft(page); raw = page.evaluate('localStorage.getItem("pali-library-v1")')
            page.goto(href(child['citation'])); ready(page, native_child); tools(page); before = len(state['calls'])
            page.get_by_role('button', name='Choose chapter', exact=True).click(); control = menu(page, native_root)
            assert state['calls'][before:] == [{'name': 'get_post_canonical', 'arguments': {'citation': 'Vism', 'offset': 0, 'limit': 1, 'script': 'sinhala'}}]
            control.select_option(native_root['chapters'][22]['citation']); expect(control).to_have_value(roots['Vism']['chapters'][22]['citation'])
            page.get_by_role('button', name='Open chapter', exact=True).click(); ready(page, native_last, href(native_last['citation'], revision(native_root)))
            tools(page); page.get_by_role('button', name='Choose chapter', exact=True).click(); control = menu(page, native_root)
            preferences = page.locator('details.preferences')
            if preferences.get_attribute('open') is None: preferences.locator('summary').click()
            page.locator('#font-size').fill('30'); page.locator('#font-size').dispatch_event('input')
            control.focus(); page.set_viewport_size({'width': 390, 'height': 844}); expect(page.locator('.study-actions summary')).to_be_focused() if width > 760 else None
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.set_viewport_size({'width': 1280, 'height': 900}); expect(page.locator('.study-actions')).to_have_attribute('open', '')
            menu(page, native_root); assert json.loads(page.evaluate('localStorage.getItem("pali-library-v1")'))['saved'] == seed['saved']
            audit(page, state, 'native chapter titles/literal citations at30px and responsive focus')
            passed('actual Sinhala chapter titles and source wording retain Roman citation identity;30px and breakpoint focus preserve the compact picker, source text and personal draft')
            context.close()

            if width == 390 and theme == 'light':
                context, page, state, seed = environment(); private_draft(page); raw = page.evaluate('localStorage.getItem("pali-library-v1")')
                state['mode'] = 'warnings'; page.goto(base + '/#read?book=vin02m1')
                ready(page, root_book)
                for text in ['CONTROLLED unknown source-selection note remains visible', 'CONTROLLED plan assignment warning remains visible', 'CONTROLLED alignment warning remains visible', 'CONTROLLED input interpretation remains visible', 'This source selection is approximate or abbreviated.']:
                    expect(page.locator('#view > .notice')).to_contain_text(text)
                audit(page, state, 'unknown/selection/plan/alignment/input/approximate warnings remain visible')
                state['mode'] = 'post_warnings'; page.goto(href('Vism')); ready(page, roots['Vism'])
                expect(page.locator('#view > .notice')).to_contain_text('CONTROLLED unfamiliar post selection note remains visible'); state['mode'] = None
                passed('finite boilerplate compaction leaves all controlled unknown/selection/plan/alignment/input and approximate warnings outside collapsed tools')
                variants = []
                for kind in ['citation', 'scope', 'book', 'duplicate', 'order', 'count']:
                    bad = copy.deepcopy(parent)
                    if kind == 'citation': bad['citation'] = 'visuddhimagga-1'
                    elif kind == 'scope': bad['chapter_index']['scope'] = 'source_file'
                    elif kind == 'book': bad['book']['id'] = 'visuddhimagga-nidanakatha'
                    elif kind == 'duplicate': bad['chapters'][1] = copy.deepcopy(bad['chapters'][0])
                    elif kind == 'order': bad['chapters'][0]['citation'] = 'Vism ch. 999'
                    else: bad['chapters'] = bad['chapters'][:-1]
                    variants.append((kind, bad))
                for kind, bad in variants:
                    saved(page); page.goto(href(child['citation'])); ready(page, child); tools(page); body = page.locator('section[aria-label="Pāli passage"]').element_handle()
                    state['mode'] = bad; arm_titles(page); before = len(state['calls']); page.get_by_role('button', name='Choose chapter', exact=True).click()
                    expect(page.get_by_role('region', name='Source chapters', exact=True).get_by_role('alert')).to_be_visible(); no_titles(page)
                    expect(page.get_by_role('form', name='Chapter navigation', exact=True)).to_have_count(0); ready(page, child)
                    assert body.evaluate('(e)=>e.isConnected') and state['calls'][before:] == [{'name': 'get_post_canonical', 'arguments': {'citation': 'Vism', 'offset': 0, 'limit': 1, 'script': 'roman'}}], kind
                    unchanged(page, state, raw); state['mode'] = None
                audit(page, state, 'each inconsistent parent rejected before any chapter title')
                passed('each wrong parent citation/scope/book/order/duplicate/truncated-list fixture executes one request and installs no transient chapter options; current Pāli and note remain intact')
                saved(page); page.goto(href(child['citation'], revision(child))); ready(page, child); tools(page)
                changed = copy.deepcopy(parent); changed['source']['locator_revision'] = 'controlled-changed-chapter-revision'; state['mode'] = changed
                arm_titles(page); page.get_by_role('button', name='Choose chapter', exact=True).click(); expect(page.get_by_role('link', name='Review current reading source', exact=True)).to_be_visible(); no_titles(page)
                expect(page.get_by_role('form', name='Chapter navigation', exact=True)).to_have_count(0)
                ready(page, child); review = page.get_by_role('link', name='Review current reading source', exact=True)
                assert fields(base + '/' + review.get_attribute('href')) == {'kind': 'post', 'uid': child['citation'], 'offset': '0'}
                state['mode'] = None; review.click(); ready(page, child); unchanged(page, state, raw)
                passed('changed parent revision never replaces current source wording or saved pins; explicit review removes only the page pin while keeping the literal current citation')
                tools(page); state['mode'] = 'error'; before = len(state['calls']); page.get_by_role('button', name='Choose chapter', exact=True).focus(); page.keyboard.press('Enter')
                expect(page.get_by_role('button', name='Retry chapter list', exact=True)).to_be_focused(); ready(page, child)
                state['mode'] = None; page.keyboard.press('Enter'); expect(menu(page, roots['Vism'])).to_be_focused()
                assert state['calls'][before:] == [{'name': 'get_post_canonical', 'arguments': {'citation': 'Vism', 'offset': 0, 'limit': 1, 'script': 'roman'}}] * 2
                unchanged(page, state, raw); audit(page, state, 'chapter failure and explicit retry retain reading')
                passed('chapter-list service failure and exact explicit retry preserve all current Pāli, reference pins and unsaved personal text')
                saved(page); page.goto(href(child['citation'])); ready(page, child); tools(page); state['mode'] = 'hold'
                page.evaluate("()=>{window.chapterIgnoreAbort=true;document.documentElement.removeAttribute('data-chapter-body-complete')}")
                page.get_by_role('button', name='Choose chapter', exact=True).click(); expect(page.locator('html')).to_have_attribute('data-chapter-held', 'true')
                page.get_by_role('button', name='Stop waiting for Chapter list', exact=True).click(); expect(page.get_by_role('button', name='Retry chapter list', exact=True)).to_be_visible()
                state['mode'] = None; page.get_by_role('button', name='Retry chapter list', exact=True).click(); current_menu = menu(page, roots['Vism']).element_handle()
                reply(state['held'].pop(), parent); expect(page.locator('html')).to_have_attribute('data-chapter-body-complete', 'true')
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                assert current_menu.evaluate('(e)=>e.isConnected'); ready(page, child); unchanged(page, state, raw)
                passed('Stop/retry supersedes an abort-ignoring old parent body; its completion cannot replace the newer picker or current source')
                saved(page); page.goto(href(child['citation'])); ready(page, child); tools(page); state['mode'] = 'hold'
                page.evaluate("()=>{window.chapterIgnoreAbort=true;document.documentElement.removeAttribute('data-chapter-body-complete');document.documentElement.removeAttribute('data-chapter-held')}")
                page.get_by_role('button', name='Choose chapter', exact=True).click(); expect(page.locator('html')).to_have_attribute('data-chapter-held', 'true')
                state['mode'] = None; page.goto(base + '/#read?uid=mn10'); ready(page, canonical)
                reply(state['held'].pop(), parent); expect(page.locator('html')).to_have_attribute('data-chapter-body-complete', 'true')
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                ready(page, canonical); expect(page.locator('.chapter-navigation')).to_have_count(0); saved(page)
                expect(page.get_by_label('Your personal note', exact=True)).to_have_value(PRIVATE + 'unsaved exact draft'); unchanged(page, state, raw)
                passed('a late complete parent response cannot overwrite a newer canonical reading or lose the existing private draft')
                context.close()
        browser.close()
    result = {'status': 'passed' if not any(s['violations'] for s in scans) else 'failed', 'passed': len(checks), 'checks': checks,
        'duration_seconds': round(time.monotonic() - started, 2), 'engine': engine, 'outside_source_tree': bool(args.server_dir),
        'chapter_scopes': [{'citation': name, 'scope': d['chapter_index']['scope'], 'book_id': d['book']['id'], 'chapters': len(d['chapters']), 'revision': revision(d)} for name, d in roots.items()],
        'metrics': metrics, 'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
        'limits': 'Actual existing VRI post-canonical/root data, chapter titles/citations and complete source text. Only representative chapters are opened; policy tests independently cover all95 work rows. Malformed parents, service errors, changed revisions, critical-note flags and abort-ignoring held bodies are explicit metadata/transport fixtures. First printed source line is the phone budget; real source headings/order and later first nonheading bodies are preserved and measured separately. Normal/installed retain CSP; only axe bypasses it. No English/provider fetch, scripture reconstruction, physical-device, OS glyph-shaping or human-accessibility certification.'}
    print(json.dumps(result, indent=2))
    if args.report: pathlib.Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if result['status'] != 'passed': raise SystemExit(1)
finally: server.terminate(); server.wait(timeout=10)
