#!/usr/bin/env python3
"""Actual revision-pinned canonical search; malformed metadata and late bodies are fixtures."""
import argparse, copy, json, os, pathlib, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY, PRIVATE = 'pali-library-v1', 'PRIVATE_SEARCH_PIN_NOTE_'
PHRASE = '"dasabalasamannāgato, bhikkhave, tathāgato catūhi ca vesārajjehi"'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report'); parser.add_argument('--a11y', action='store_true'); parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args(); started = time.monotonic()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock: sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'; checks, scans, receipts = [], [], []
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def tool(name, arguments):
    body = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    req = urllib.request.Request(base + '/mcp', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(req, timeout=30))['result']; assert not result.get('isError'), result
    return result.get('structuredContent') or json.loads(result['content'][0]['text'])
def search(query, offset=0, script='roman'): return tool('search_texts', {'query': query, 'offset': offset, 'limit': 15, 'script': script})
def read(row, script='roman', title=False): return tool('get_text', {'uid': row['id'], 'offset': 0 if title else row['read_with']['offset'], 'limit': 30, 'script': script})
def revision(data): return data['source'].get('locator_revision', data['source']['commit'])
def route(query, offset=None):
    values = {'q': query, 'scope': 'canon'}
    if offset is not None: values['offset'] = offset
    return base + '/#search?' + urllib.parse.urlencode(values)
def fields(href): return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(href).fragment.split('?', 1)[1]))
def reply(r, data=None, error=None):
    result = {'isError': True, 'structuredContent': {'error': error}} if error else {'structuredContent': data}
    r.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': r.request.post_data_json['id'], 'result': result}))

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    repaired = search(PHRASE); repaired_hit = next(r for r in repaired['results'] if r['id'] == 'sn12.21')
    assert repaired_hit['segment_ref'] == 'sn12.21/3' and repaired_hit['read_with']['offset'] == 2
    assert revision(repaired_hit) != repaired['source']['commit'] and 'sn-dasabala' in revision(repaired_hit)
    repaired_text = read(repaired_hit)
    overlap = search('satipaṭṭhāna'); shared = set(r['id'] for r in overlap['title_matches']) & set(r['id'] for r in overlap['results'])
    assert {'dn22', 'mn10'} <= shared
    title_hit = next(r for r in overlap['title_matches'] if r['id'] == 'mn10'); title_text = read(title_hit, title=True)
    paged = [search('metta', n) for n in [0, 15, 30]]
    assert paged[0]['title_next_offset'] == 15 and paged[1]['title_next_offset'] is None and paged[1]['next_offset'] == 30
    keyboard_query = 'satipatthaana'; keyboard = search(keyboard_query); assert keyboard['input_normalised']
    native_query = 'සතිපට්ඨාන'; native = search(native_query, script='sinhala'); assert native['input_romanized']
    dot_query = 'saṁyutta'; dot = search(dot_query)
    assert dot['selection']['query'] == dot_query and (dot['results'] or dot['title_matches'])
    english_query = 'mindfulness of breathing'; english = search(english_query); assert english['expanded_from_english']
    native_hit = native['results'][0]; native_text = read(native_hit, 'sinhala')
    empty_query = 'zzzznonpalimatchzzzz'; empty = search(empty_query)
    for data in [repaired, overlap, *paged, keyboard, native, dot, english, empty]:
        assert data['selection']['query'] in [PHRASE, 'satipaṭṭhāna', 'metta', keyboard_query, native_query, dot_query, english_query, empty_query]
        for stream in ['title_matches', 'results']:
            receipts.extend({'stream': stream, 'query': data['selection']['query'], 'id': r['id'], 'ref': r.get('segment_ref'), 'revision': revision(r)} for r in data[stream])
    mark = {'uid': 'sn12.21', 'ref': repaired_hit['segment_ref'], 'offset': 2, 'source_commit': revision(repaired_hit),
            'title': repaired_hit['title'], 'note': PRIVATE + 'durable <script>window.searchPinInjected=true</script> ā😀'}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        engine = {'actual': browser.browser_type.name, 'version': browser.version}; expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]:
            def passed(check):
                checks.append({'width': width, 'theme': theme, 'check': check}); print(f'{width}px {theme}: {check}', flush=True)
            def environment(script='roman'):
                seed = {'theme': theme, 'font': 30, 'script': script, 'remember_position': False, 'saved': [mark], 'reading_progress': []}
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(json.dumps(seed)) + ");" +
                    "window.searchPinIgnoreAbort=false;const searchPinFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.searchPinIgnoreAbort&&JSON.parse(options?.body||'{}').params?.name==='search_texts'){window.searchPinIgnoreAbort=false;const {signal,...rest}=options;return searchPinFetch(url,rest).then(async response=>{await response.clone().text();document.documentElement.setAttribute('data-search-pin-body-complete','true');return response})}return searchPinFetch(url,options)};")
                state = {'calls': [], 'errors': [], 'forbidden': [], 'mode': None, 'held': []}
                def intercept(r):
                    request = r.request
                    if not request.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or ''):
                        state['forbidden'].append(request.url); r.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        params = request.post_data_json.get('params', {}); state['calls'].append(copy.deepcopy(params)); name = params.get('name')
                        if name not in ['search_texts', 'get_text'] or 'translation' in params.get('arguments', {}): state['forbidden'].append(params); r.abort()
                        elif name == 'search_texts' and state['mode'] == 'hold':
                            state['held'].append(r); request.frame.evaluate("document.documentElement.setAttribute('data-search-pin-held','true')")
                        elif name == 'search_texts' and state['mode'] == 'error': reply(r, error='Controlled canonical search service error')
                        elif name == 'search_texts' and isinstance(state['mode'], dict): reply(r, state['mode'])
                        elif name == 'get_text' and state['mode'] == 'changed_read':
                            response = r.fetch(); rpc = response.json(); rpc['result']['structuredContent']['source']['locator_revision'] = 'controlled-changed-search-revision'
                            r.fulfill(response=response, body=json.dumps(rpc))
                        else: r.continue_()
                    else: r.continue_()
                context.route('**/*', intercept); page = context.new_page(); page.set_default_timeout(30000)
                page.on('pageerror', lambda e: state['errors'].append(str(e))); return context, page, state
            def saved(page):
                page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            def stream(page, titles=False): return page.get_by_role('region', name='Matching titles' if titles else 'Matching Pāli passages', exact=True)
            def failure(page):
                expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
                expect(page.locator('.search-excerpt, section[aria-label="Pāli passage"], section[aria-label="Matching titles"], section[aria-label="Matching Pāli passages"]')).to_have_count(0)
            def ready(page, query, data, offset=None):
                expect(page).to_have_url(route(query, offset)); expect(page.locator('#view > h2')).to_have_text('Results for “' + query + '”')
                for key, titles in [('title_matches', True), ('results', False)]:
                    if not data[key]: expect(stream(page, titles)).to_have_count(0); continue
                    entries = stream(page, titles).locator('.entry')
                    expect(entries).to_have_count(len(data[key]))
                    for entry, row in zip(entries.all(), data[key]):
                        expect(entry).to_contain_text(row['citation']); expect(entry).to_contain_text(row['title'])
                        if row.get('alignment'): expect(entry).to_contain_text(row['alignment']['note'])
                        if row.get('approximate'): expect(entry).to_contain_text('This location is approximate.')
                        wanted = {'uid': row['id'], 'offset': '0', 'page_source': revision(row)} if titles else {'uid': row['id'], 'offset': str(row['read_with']['offset']), 'ref': row['segment_ref'], 'source': revision(row)}
                        assert fields(entry.get_attribute('href')) == wanted
                    if not titles:
                        expect(stream(page).locator('.search-excerpt')).to_have_text([r['excerpt'] for r in data[key]])
                        assert stream(page).locator('.search-excerpt').all_text_contents() == [r['excerpt'] for r in data[key]]
                for note in data.get('notes', []): expect(page.locator('#view')).to_contain_text(note)
                for key in ['alignment_note', 'alignment_method', 'input_romanized', 'query_note', 'spelling_note', 'script_note']:
                    if data.get(key): expect(page.locator('#view')).to_contain_text(data[key])
                if data.get('input_normalised'): expect(page.locator('#view')).to_contain_text(data['input_normalised']['note'])
                if data.get('expanded_from_english'):
                    expect(page.locator('#view')).to_contain_text('English keywords expanded into Pāli: ' + json.dumps(data['expanded_from_english'], ensure_ascii=False, separators=(',', ':')))
                expect(page.get_by_role('region', name='Source attribution', exact=True)).to_contain_text(data['source']['terms'])
                expect(page.locator('section[aria-label="Pāli passage"]')).to_have_count(0)
            def read_ready(page, data):
                texts = page.locator('section[aria-label="Pāli passage"] .passage'); expect(texts).to_have_text([s['text'] for s in data['segments']]); assert texts.all_text_contents() == [s['text'] for s in data['segments']]
            def observe(page):
                page.evaluate("""()=>{window.searchPinObserver?.disconnect();window.searchPinAdded=0;window.searchPinObserver=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)window.searchPinAdded+=(n.matches('.search-excerpt,.passage,section[aria-label="Matching titles"] .entry,section[aria-label="Matching Pāli passages"] .entry')?1:0)+n.querySelectorAll('.search-excerpt,.passage,.entry').length});window.searchPinObserver.observe(document.getElementById('view'),{childList:true,subtree:true})}""")
            def no_transient(page):
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); assert page.evaluate('window.searchPinAdded') == 0; page.evaluate('window.searchPinObserver.disconnect()')
            def privacy(page, state):
                assert not state['errors'] and not state['forbidden'], state
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert page.evaluate('window.searchPinInjected') is None; expect(page.locator('#view img, #view script')).to_have_count(0)
            def audit(page, state, stage):
                privacy(page, state); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, theme, stage)
                if args.a11y:
                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                    d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width': width, 'theme': theme, 'state': stage, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})

            context, page, state = environment(); saved(page)
            draft = PRIVATE + 'unsaved exact draft ā😀'; page.get_by_label('Your personal note', exact=True).fill(draft); raw = page.evaluate('localStorage.getItem("pali-library-v1")')
            panel = page.locator('#find-panel')
            if panel.get_attribute('open') is None: panel.locator('summary').focus(); page.keyboard.press('Enter')
            page.locator('#query').fill(PHRASE); page.locator('#query').press('Enter'); ready(page, PHRASE, repaired)
            assert state['calls'] == [{'name': 'search_texts', 'arguments': {'query': PHRASE, 'offset': 0, 'limit': 15, 'script': 'roman'}}]
            audit(page, state, 'actual repaired SN12.21 exact revision hit')
            stream(page).locator('.entry').filter(has_text=repaired_hit['citation']).focus(); page.keyboard.press('Enter'); read_ready(page, repaired_text)
            assert fields(page.url) == {'uid': 'sn12.21', 'offset': '2', 'ref': 'sn12.21/3', 'source': revision(repaired_hit)}
            passed('keyboard canonical search opens actual repaired SN12.21/3 with its own mapping revision and exact source wording')
            page.goto(route('satipaṭṭhāna')); ready(page, 'satipaṭṭhāna', overlap)
            for uid in shared:
                assert any(fields(a.get_attribute('href'))['uid'] == uid for a in stream(page, True).locator('.entry').all())
                assert any(fields(a.get_attribute('href'))['uid'] == uid for a in stream(page).locator('.entry').all())
            audit(page, state, 'same identity retained independently as title and body match')
            stream(page, True).locator('.entry').filter(has_text=title_hit['citation']).click(); read_ready(page, title_text)
            assert fields(page.url) == {'uid': 'mn10', 'offset': '0', 'page_source': revision(title_hit)}
            passed('title and body hits retain duplicate IDs in separate streams; title link pins the whole current page without fabricating a segment reference')
            for index, data in enumerate(paged):
                if index == 0: page.goto(route('metta'))
                else: page.get_by_role('link', name='Next page →', exact=True).click()
                ready(page, 'metta', data, None if index == 0 else data['offset'])
            page.go_back(); ready(page, 'metta', paged[1], 15); page.go_forward(); ready(page, 'metta', paged[2], 30)
            audit(page, state, 'independently exhausted title stream preserves continuing Pāli-body pages')
            passed('actual title continuation ends while body continuation remains available; common Next and Back/Forward preserve every returned row and source pin')
            for query, data in [(keyboard_query, keyboard), (dot_query, dot), (english_query, english), (empty_query, empty)]:
                page.goto(route(query)); ready(page, query, data); audit(page, state, 'backend-labelled query · ' + query)
            passed('keyboard inference and English expansion retain backend labels; an actual above-dot Pāli query preserves original selection and exact returned excerpts, and an empty search remains successful')
            for fragment in ['search?q=&scope=canon', 'search?q=metta&q=dhamma&scope=canon', 'search?q=metta&scope=unknown', 'search?q=metta&scope=canon&offset=-1', 'search?q=metta&scope=canon&offset=1.5', 'search?q=metta&scope=canon&offset=100001', 'search?q=metta&scope=canon&uid=mn10', 'search?q=' + 'x' * 301 + '&scope=canon']:
                before = len(state['calls']); page.goto(base + '/#' + fragment); failure(page); assert len(state['calls']) == before
            passed('empty, duplicate, unknown, mixed and invalid-offset canonical routes fail before MCP or result rendering')
            variants = []
            for kind in ['selection', 'query', 'source', 'id', 'ref', 'readtool', 'readuid', 'offset', 'limit', 'context', 'hitrevision', 'count', 'continuation', 'duplicate', 'titlecommand', 'titlesource']:
                bad = copy.deepcopy(overlap); row = bad['results'][0]
                if kind == 'selection': bad['selection']['query'] = 'controlled wrong original input'
                elif kind == 'query': bad['query'] = 'controlled unreported query rewrite'
                elif kind == 'source': bad['source']['repository'] = 'https://example.invalid/unreviewed'
                elif kind == 'id': row['id'] = 'mn10&uid=mn11'
                elif kind == 'ref': row['segment_ref'] = 'mn10/1'
                elif kind == 'readtool': row['read_with']['tool'] = 'get_translation'
                elif kind == 'readuid': row['read_with']['uid'] = 'mn10'
                elif kind == 'offset': row['read_with']['offset'] += 1
                elif kind == 'limit': row['read_with']['limit'] = 30
                elif kind == 'context': row['context_with']['offset'] += 10
                elif kind == 'hitrevision': row['source']['locator_revision'] = 'unsafe&pin'
                elif kind == 'count': bad['total_texts_matched'] = 0
                elif kind == 'continuation': bad['next_offset'] = 0
                elif kind == 'duplicate': bad['results'][1] = copy.deepcopy(row)
                elif kind == 'titlecommand': bad['title_matches'][0]['read_with']['tool'] = 'get_translation'
                elif kind == 'titlesource': del bad['title_matches'][0]['source']
                variants.append((kind, bad))
            for kind, bad in variants:
                saved(page); observe(page); state['mode'] = bad; page.goto(route('satipaṭṭhāna')); failure(page); no_transient(page)
            state['mode'] = None; audit(page, state, 'malformed search metadata refuses all result anchors and excerpts')
            passed('each malformed selection/query/source/ID/ref/command/context/count/continuation/duplicate fixture fails before any title link or body excerpt enters the DOM')
            for title in [False, True]:
                saved(page); page.goto(route('satipaṭṭhāna')); ready(page, 'satipaṭṭhāna', overlap); state['mode'] = 'changed_read'; observe(page)
                stream(page, title).locator('.entry').first.click(); failure(page); no_transient(page)
                review = page.get_by_role('link', name='Review current source at this position' if title else 'Review current source at this reference', exact=True)
                expected = {k: v for k, v in fields(page.url).items() if k not in ['source', 'page_source']}; assert fields(review.get_attribute('href')) == expected
                state['mode'] = None; review.click(); expect(page.locator('section[aria-label="Pāli passage"] .passage').first).to_be_visible()
            passed('both title page pins and exact body pins refuse changed-source wording before explicit review removes only the old revision')
            saved(page); state['mode'] = 'error'; page.goto(route(PHRASE)); failure(page); state['mode'] = None
            page.get_by_role('button', name='Try again', exact=True).focus(); page.keyboard.press('Enter'); ready(page, PHRASE, repaired)
            state['mode'] = 'hold'; page.evaluate("()=>{window.searchPinIgnoreAbort=true;document.documentElement.removeAttribute('data-search-pin-held');document.documentElement.removeAttribute('data-search-pin-body-complete')}")
            page.goto(route('satipaṭṭhāna')); expect(page.locator('html')).to_have_attribute('data-search-pin-held', 'true')
            page.get_by_role('button', name='Stop waiting for Text search', exact=True).focus(); page.keyboard.press('Enter')
            expect(page.get_by_role('heading', name='Reading request stopped', exact=True)).to_be_visible(); state['mode'] = None
            page.get_by_role('button', name='Try again', exact=True).click(); ready(page, 'satipaṭṭhāna', overlap)
            current_result = stream(page).locator('.entry').first.element_handle()
            reply(state['held'].pop(), overlap); expect(page.locator('html')).to_have_attribute('data-search-pin-body-complete', 'true')
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); ready(page, 'satipaṭṭhāna', overlap)
            assert current_result.evaluate('(node)=>node.isConnected'), 'Late old body replaced the newer search results'
            state['mode'] = 'hold'; page.evaluate("()=>{window.searchPinIgnoreAbort=true;document.documentElement.removeAttribute('data-search-pin-held');document.documentElement.removeAttribute('data-search-pin-body-complete')}")
            page.goto(route(PHRASE)); expect(page.locator('html')).to_have_attribute('data-search-pin-held', 'true'); saved(page)
            reply(state['held'].pop(), repaired); expect(page.locator('html')).to_have_attribute('data-search-pin-body-complete', 'true')
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            expect(page.get_by_label('Your personal note', exact=True)).to_have_value(draft); assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw
            audit(page, state, 'retry and late abort-ignoring search preserve route and private drafts')
            passed('service retry and keyboard Stop recover; late search bodies cannot replace retry or Saved, and exact raw private state/drafts remain local')
            context.close()
            context, page, state = environment('sinhala'); page.goto(route(native_query)); ready(page, native_query, native)
            audit(page, state, 'actual native-script matching titles and excerpts')
            stream(page).locator('.entry').first.click(); read_ready(page, native_text); audit(page, state, 'actual native-script pinned source')
            passed('native-script input retains backend conversion labels and exact excerpt codepoints, then opens actual pinned Sinhala-script Pāli')
            context.close()
        browser.close()
    result = {'status': 'passed' if not any(s['violations'] for s in scans) else 'failed', 'passed': len(checks), 'checks': checks,
        'duration_seconds': round(time.monotonic() - started, 2), 'engine': engine, 'outside_source_tree': bool(args.server_dir), 'actual_hits': receipts,
        'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
        'limits': 'Actual bundled canonical search, mapping revisions, title/body streams and source wording. Only three actual metta pages are visited; no complete search-index coverage claim. Malformed metadata, changed revisions, service errors and held abort-ignoring responses are explicit fixtures. No publisher fetch, English retrieval, personal writes or scripture reconstruction. Normal/installed retain CSP; only axe bypasses it. No physical-device or human-accessibility certification.'}
    print(json.dumps(result, indent=2))
    if args.report: pathlib.Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if result['status'] != 'passed': raise SystemExit(1)
finally: server.terminate(); server.wait(timeout=10)
