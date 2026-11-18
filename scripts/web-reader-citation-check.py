#!/usr/bin/env python3
"""Actual offline citation lookup and explicit reading; invalid/stale data are fixtures."""
import argparse, copy, json, os, pathlib, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY, PRIVATE = 'pali-library-v1', 'PRIVATE_CITATION_NOTE_'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report'); parser.add_argument('--a11y', action='store_true'); parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args(); started = time.monotonic()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock: sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'; checks, scans, receipts = [], [], []
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tool(name, arguments, error=False):
    body = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    req = urllib.request.Request(base + '/mcp', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(req, timeout=30))['result']
    assert bool(result.get('isError')) == error, result
    return result.get('structuredContent') or json.loads(result['content'][0]['text'])
def resolve(reference, script='roman', error=False): return tool('resolve_reference', {'reference': reference, 'script': script}, error)
def route(reference): return base + '/#resolve?' + urllib.parse.urlencode({'reference': reference})
def fields(href): return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(href).fragment.split('?', 1)[1]))
def reply(r, data=None, error=None):
    result = {'isError': True, 'structuredContent': {'error': error}} if error else {'structuredContent': data}
    r.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': r.request.post_data_json['id'], 'result': result}))

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    queries = ['Vism I.1', 'Abhidh-s 1', 'Satipatthana Sutta', 'MN10-12', 'M i 55', 'AN 1.82', 'Vism I,5', 'satipatthaana sutta']
    results = {q: resolve(q) for q in queries}
    native_query = 'සතිපට්ඨාන සුත්ත'; native = resolve(native_query, 'sinhala')
    assert results['Vism I.1']['canonical'] is False and results['Vism I.1']['citation'] == 'Vism 1.1'
    assert results['Abhidh-s 1']['canonical'] is False and len(results['Satipatthana Sutta']['also_named']) == 2
    assert results['AN 1.82']['approximate'] and results['Vism I,5']['approximate']
    unsupported = resolve('Abhidh-s1', error=True); assert 'error' in unsupported
    readings = {}
    for q, d in {**results, native_query: native}.items():
        script = 'sinhala' if q == native_query else 'roman'
        name = 'get_post_canonical' if d.get('canonical') is False else 'get_text'
        selector = {'citation': d['read_with']['citation']} if name == 'get_post_canonical' else {'uid': d['id']}
        readings[q] = tool(name, {**selector, 'offset': 0, 'limit': 30, 'script': script})
        receipts.append({'input': q, 'citation': d['citation'], 'id': d.get('id'), 'canonical': d.get('canonical', True), 'source': d['source']['commit']})
    alternatives = results['Satipatthana Sutta']['also_named'] + results['M i 55']['also_on_that_page']
    alternative_readings = {d['id']: tool('get_text', {'uid': d['id'], 'offset': 0, 'limit': 30, 'script': 'roman'}) for d in alternatives}
    seed_read = readings['MN10-12']; segment = seed_read['segments'][0]
    mark = {'uid': 'mn10', 'ref': segment['ref'], 'offset': 0, 'title': seed_read['title'],
            'source_commit': seed_read['source'].get('locator_revision', seed_read['source']['commit']), 'note': PRIVATE + 'durable <script>window.citationInjected=true</script> ā😀'}
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
                    "window.citationIgnoreAbort=false;const citationFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.citationIgnoreAbort&&JSON.parse(options?.body||'{}').params?.name==='resolve_reference'){window.citationIgnoreAbort=false;const {signal,...rest}=options;return citationFetch(url,rest).then(async response=>{await response.clone().text();document.documentElement.setAttribute('data-citation-body-complete','true');return response})}return citationFetch(url,options)};")
                state = {'calls': [], 'errors': [], 'forbidden': [], 'mode': None, 'held': []}
                def intercept(r):
                    request = r.request
                    if not request.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or ''):
                        state['forbidden'].append(request.url); r.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        params = request.post_data_json.get('params', {}); state['calls'].append(copy.deepcopy(params)); name = params.get('name')
                        if name not in ['resolve_reference', 'get_text', 'get_post_canonical'] or 'translation' in params.get('arguments', {}):
                            state['forbidden'].append(params); r.abort()
                        elif name == 'resolve_reference' and state['mode'] == 'hold':
                            state['held'].append(r); request.frame.evaluate("document.documentElement.setAttribute('data-citation-held','true')")
                        elif name == 'resolve_reference' and state['mode'] == 'error': reply(r, error='Controlled citation lookup failure')
                        elif name == 'resolve_reference' and isinstance(state['mode'], dict): reply(r, state['mode'])
                        else: r.continue_()
                    else: r.continue_()
                context.route('**/*', intercept); page = context.new_page(); page.set_default_timeout(30000)
                page.on('pageerror', lambda e: state['errors'].append(str(e))); return context, page, state
            def saved(page):
                page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            def failure(page):
                expect(page.get_by_role('heading', name='No passage was substituted.', exact=True)).to_be_visible()
                expect(page.locator('.citation-resolution, section[aria-label="Pāli passage"]')).to_have_count(0)
            def ready(page, reference, data):
                expect(page).to_have_url(route(reference)); expect(page.locator('#view > h2')).to_have_text(data['citation'] + ' · ' + data['title'])
                card = page.locator('.citation-resolution'); expect(card).to_be_visible()
                expect(card).to_contain_text('Later Pāli work · not canon' if data.get('canonical') is False else 'Canonical Pāli')
                for note in data.get('notes', []): expect(card).to_contain_text(note)
                if data.get('label'): expect(card).to_contain_text(data['label'])
                if data.get('alignment', {}).get('note'): expect(card).to_contain_text(data['alignment']['note'])
                if data.get('input_normalised'): expect(card).to_contain_text(data['input_normalised']['note'])
                if data.get('input_romanized'): expect(card).to_contain_text(data['input_romanized'])
                if data.get('approximate'): expect(card).to_contain_text('This location is approximate.')
                if data.get('name_match'):
                    expect(card).to_contain_text(data['name_match']['matched_name']); expect(card).to_contain_text(data['name_match']['via'])
                attribution = page.get_by_role('region', name='Source attribution', exact=True)
                expect(attribution).to_contain_text(data['source']['attribution']); expect(attribution).to_contain_text(data['source']['terms'])
                expect(page.locator('section[aria-label="Pāli passage"]')).to_have_count(0)
                assert page.title() == 'Citation lookup · Pāli Library'
                expected = {'kind': 'post', 'uid': data['read_with']['citation']} if data.get('canonical') is False else {'uid': data['id']}
                assert fields(page.get_by_role('link', name='Read Pāli', exact=True).get_attribute('href')) == expected
            def read_ready(page, data):
                texts = page.locator('section[aria-label="Pāli passage"] .passage')
                expect(texts).to_have_text([s['text'] for s in data['segments']]); assert texts.all_text_contents() == [s['text'] for s in data['segments']]
            def privacy(page, state):
                assert not state['errors'] and not state['forbidden'], state
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert page.evaluate('window.citationInjected') is None; expect(page.locator('#view img, #view script')).to_have_count(0)
            def audit(page, state, stage):
                privacy(page, state); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, theme, stage)
                if args.a11y:
                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                    d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width': width, 'theme': theme, 'state': stage, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})

            context, page, state = environment(); saved(page)
            draft = PRIVATE + 'unsaved exact draft ā😀'; page.get_by_label('Your personal note', exact=True).fill(draft)
            raw = page.evaluate('localStorage.getItem("pali-library-v1")')
            panel = page.locator('#find-panel')
            if panel.get_attribute('open') is None: panel.locator('summary').focus(); page.keyboard.press('Enter')
            field = page.locator('#reference'); field.fill('Vism I.1'); field.press('Enter'); ready(page, 'Vism I.1', results['Vism I.1'])
            assert state['calls'] == [{'name': 'resolve_reference', 'arguments': {'reference': 'Vism I.1', 'script': 'roman'}}]
            audit(page, state, 'keyboard sidebar lookup with post-canonical label and all numbering cautions')
            page.get_by_role('link', name='Read Pāli', exact=True).focus(); page.keyboard.press('Enter'); read_ready(page, readings['Vism I.1'])
            passed('sidebar Open resolves before reading; explicit normalized Vism command retrieves the actual post-canonical source')
            for q in queries[1:]:
                before = len(state['calls']); page.goto(route(q)); ready(page, q, results[q])
                assert state['calls'][before:] == [{'name': 'resolve_reference', 'arguments': {'reference': q, 'script': 'roman'}}]
                audit(page, state, 'actual citation metadata · ' + q)
                page.get_by_role('link', name='Read Pāli', exact=True).click(); read_ready(page, readings[q])
            passed('actual manual, name, range, PTS page, uncertain alignment and keyboard spelling notices survive explicit correct Pāli reading links')
            for q, key, label in [('Satipatthana Sutta', 'also_named', 'Other texts with this name'), ('M i 55', 'also_on_that_page', 'Other texts on this page')]:
                for alternative in results[q][key]:
                    page.goto(route(q)); ready(page, q, results[q]); section = page.get_by_role('region', name=label, exact=True)
                    expect(section.locator('.entry')).to_have_count(len(results[q][key]))
                    entry = section.locator('.entry').filter(has_text=alternative['citation'])
                    expect(entry).to_contain_text(alternative['title']); assert fields(entry.get_attribute('href')) == {'uid': alternative['id']}
                    entry.click(); read_ready(page, alternative_readings[alternative['id']])
            passed('all actual same-name and same-PTS-page alternatives open their own canonical identity without arbitrary substitution')
            page.goto(route('Abhidh-s1')); failure(page)
            for fragment in ['resolve?reference=', 'resolve?reference=MN10&reference=MN11', 'resolve?reference=MN10&uid=mn11', 'resolve?reference=' + 'x' * 301, 'resolve?reference=%00', 'resolve?reference=MN10&unknown=1', 'resolve?reference=%ZZ', 'resolve?reference=%C3%28']:
                before = len(state['calls']); page.goto(base + '/#' + fragment); failure(page); assert len(state['calls']) == before, fragment
            audit(page, state, 'malformed routes fail before MCP')
            passed('unsupported existing compact grammar stays an explicit error; empty, duplicate, mixed, oversized, control and unknown-field routes never call MCP')
            for bad in [{**results['MN10-12'], 'id': 'mn10&uid=mn11'}, {**results['MN10-12'], 'id': 'mn11'}, {**results['Satipatthana Sutta'], 'also_named': [{'id': 'mn11', 'citation': 'MN 10', 'title': 'Mismatched canonical identity fixture'}]}, {**results['Vism I.1'], 'read_with': {'tool': 'get_text', 'uid': 'mn10'}}, {**results['Satipatthana Sutta'], 'also_named': [{'id': 'javascript:alert(1)', 'citation': 'MN 10', 'title': 'Unsafe identity fixture'}]}]:
                state['mode'] = bad; page.goto(route('MN10-12')); failure(page)
            state['mode'] = 'error'; page.goto(route('Vism I.1')); failure(page); state['mode'] = None
            page.get_by_role('button', name='Try again', exact=True).focus(); page.keyboard.press('Enter'); ready(page, 'Vism I.1', results['Vism I.1'])
            passed('unsafe resolver identities/commands fail closed; a service error retries the same reference by keyboard')
            state['mode'] = 'hold'; page.evaluate("()=>{window.citationIgnoreAbort=true;document.documentElement.removeAttribute('data-citation-held');document.documentElement.removeAttribute('data-citation-body-complete')}")
            page.goto(route('MN10-12')); expect(page.locator('html')).to_have_attribute('data-citation-held', 'true')
            page.get_by_role('button', name='Stop waiting for Citation lookup', exact=True).focus(); page.keyboard.press('Enter')
            expect(page.get_by_role('heading', name='Reading request stopped', exact=True)).to_be_visible(); state['mode'] = None
            page.get_by_role('button', name='Try again', exact=True).click(); ready(page, 'MN10-12', results['MN10-12'])
            reply(state['held'].pop(), results['Vism I.1']); expect(page.locator('html')).to_have_attribute('data-citation-body-complete', 'true')
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); ready(page, 'MN10-12', results['MN10-12'])
            state['mode'] = 'hold'; page.evaluate("()=>{window.citationIgnoreAbort=true;document.documentElement.removeAttribute('data-citation-held');document.documentElement.removeAttribute('data-citation-body-complete')}")
            page.goto(route('Vism I.1')); expect(page.locator('html')).to_have_attribute('data-citation-held', 'true'); saved(page)
            reply(state['held'].pop(), results['Vism I.1']); expect(page.locator('html')).to_have_attribute('data-citation-body-complete', 'true')
            page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible(); expect(page.locator('.citation-resolution')).to_have_count(0)
            expect(page.get_by_label('Your personal note', exact=True)).to_have_value(draft)
            assert page.evaluate('localStorage.getItem("pali-library-v1")') == raw; audit(page, state, 'stop retry and late lookup after navigation preserve private draft')
            passed('abort-ignoring old bodies cannot replace retry or Saved; exact notes/drafts/storage remain local and unchanged')
            context.close()
            context, page, state = environment('sinhala'); page.goto(route(native_query)); ready(page, native_query, native)
            assert state['calls'] == [{'name': 'resolve_reference', 'arguments': {'reference': native_query, 'script': 'sinhala'}}]
            audit(page, state, 'native input conversion and actual native title')
            page.get_by_role('link', name='Read Pāli', exact=True).click(); read_ready(page, readings[native_query]); audit(page, state, 'actual native Pāli')
            passed('native input retains backend conversion labels and opens actual Sinhala-script Pāli without generated scripture or English')
            context.close()
        browser.close()
    result = {'status': 'passed' if not any(s['violations'] for s in scans) else 'failed', 'passed': len(checks), 'checks': checks,
        'duration_seconds': round(time.monotonic() - started, 2), 'engine': engine, 'outside_source_tree': bool(args.server_dir), 'actual_resolutions': receipts,
        'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
        'limits': 'Actual bundled resolver metadata and Pāli, including normalized post-canonical commands and all returned alternatives. Unsafe identity/command data, service errors and held abort-ignoring bodies are explicit fixtures. No source fetch, new grammar, English retrieval, scripture reconstruction, private schema, physical-device or human-accessibility certification. Only axe contexts bypass CSP.'}
    print(json.dumps(result, indent=2))
    if args.report: pathlib.Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if result['status'] != 'passed': raise SystemExit(1)
finally: server.terminate(); server.wait(timeout=10)
