#!/usr/bin/env python3
"""Reviewed Vinaya excerpts: actual bundled HTTP worker with pinned official ATI snapshots.

Provider fetch is replaced only inside this test process; reports contain metadata,
never publisher wording. This proves fixture integration, not live availability.
"""
import argparse, copy, hashlib, json, os, pathlib, socket, subprocess, tempfile, time, urllib.request
from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_VINAYA_DRAFT_සති'
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--source-root', type=pathlib.Path, help='Optional directory containing the three original publisher HTML filenames')
p.add_argument('--server-dir', type=pathlib.Path)
p.add_argument('--a11y', action='store_true')
p.add_argument('--report')
args = p.parse_args()
manifest = json.loads((ROOT / 'scripts/canon/reviewed_partial_pages.json').read_text())
assert len(manifest['links']) == 21
rows = [r for r in manifest['links'] if r['unit_id'] in {'pli-tv-kd1', 'pli-tv-kd6', 'pli-tv-kd8'}]
assert len(rows) == 3, 'All three reviewed Vinaya partials must be active'
assert {(r['unit_id'], r['partial_scope']['first_ref'], r['partial_scope']['last_ref']) for r in rows} == {('pli-tv-kd1', 'pli-tv-kd1/190', 'pli-tv-kd1/201'), ('pli-tv-kd6', 'pli-tv-kd6/195', 'pli-tv-kd6/195'), ('pli-tv-kd8', 'pli-tv-kd8/174', 'pli-tv-kd8/178')}
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
assert json.loads((server_dir / 'data/reviewed-partial-pages.json').read_text()) == manifest
stage = pathlib.Path(tempfile.mkdtemp(prefix='pali-vinaya-browser-'))
sources = {}
for row in rows:
    filename = row['path'].split('/')[-1] + '.html'
    path = args.source_root.resolve() / filename if args.source_root else stage / filename
    if not args.source_root:
        url = 'https://raw.githubusercontent.com/bcbsit/ati/' + manifest['ati_commit'] + row['path'] + '.html'
        request = urllib.request.Request(url, headers={'User-Agent': 'pali-canon-pinned-source-test'})
        with urllib.request.urlopen(request, timeout=60) as response:
            assert response.url == url, 'Pinned source request unexpectedly redirected'
            path.write_bytes(response.read())
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row['source_html_sha256'], filename
    sources['https://accesstoinsight.org' + row['path'] + '.html'] = str(path)
extract = """import{readFileSync}from'node:fs';import{atiPartialExcerpt}from'./src/ati-excerpt.mjs';import{atiNotice}from'./src/english.mjs';const input=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify(Object.fromEntries(input.rows.map(r=>{const h=readFileSync(input.sources['https://accesstoinsight.org'+r.path+'.html'],'utf8');return[r.unit_id,{text:atiPartialExcerpt(h,r.partial_scope.extractor),notice:atiNotice(h)}]}))));"""
expected = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', extract], cwd=ROOT, input=json.dumps({'rows': rows, 'sources': sources}).encode()))
def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
for row in rows:
    assert len(expected[row['unit_id']]['text']) == {'pli-tv-kd1': 5452, 'pli-tv-kd6': 914, 'pli-tv-kd8': 5165}[row['unit_id']]
    assert digest(expected[row['unit_id']]['text']) == row['partial_scope']['text_sha256']
    assert digest(expected[row['unit_id']]['notice']) == row['partial_scope']['notice_sha256']
ledger = stage / 'fetches.jsonl'; ledger.write_text('')
preload = stage / 'provider.cjs'
preload.write_text("const fs=require('node:fs');const sources=" + json.dumps(sources) + ";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);fs.appendFileSync(" + json.dumps(str(ledger)) + ",JSON.stringify({url,allowed:Object.hasOwn(sources,url)})+'\\n');if(!Object.hasOwn(sources,url))throw Error('UNEXPECTED_PROVIDER_FETCH');return new Response(fs.readFileSync(sources[url]),{status:200,headers:{'content-type':'text/html'}})};")
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
server = subprocess.Popen(['node', '--require', str(preload), str(server_dir / 'http.cjs')], cwd=stage,
                          env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0', 'PALI_CANON_CACHE_MB': '0'},
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
checks, scans = [], []
def rpc(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    req = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    return json.load(urllib.request.urlopen(req, timeout=180))['result']
def tool(name, arguments):
    result = rpc(name, arguments); assert not result.get('isError'), str(result)[:300]
    return result['structuredContent']
try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('HTTP server did not start')
    catalogue = tool('browse_canon', {'node': 'english', 'availability': 'scoped', 'collection': 'vinaya', 'limit': 40})
    assert {r['id'] for r in catalogue['items']} == {r['unit_id'] for r in rows} and catalogue['total'] == 3
    assert all(r['english_available'] == 0 and r['partial_english_available'] == 1 for r in catalogue['items'])
    assert tool('browse_canon', {'node': 'english', 'availability': 'whole', 'collection': 'vinaya'})['total'] == 0
    coverage = tool('list_sources', {})['translation_coverage']
    assert (coverage['total']['partial_links'], coverage['total']['partial_only']) == (21, 15)
    vinaya = next(r for r in coverage['collections'] if r['collection'] == 'vinaya')
    assert (vinaya['partial_links'], vinaya['with_partial_english'], vinaya['with_english']) == (3, 3, 0)
    scopes = {}; native = {}
    for row in rows:
        uid, version = row['unit_id'], 'ati:' + row['path']
        choice = next(c for c in tool('get_text', {'uid': uid, 'limit': 1})['english_available'] if c['translation_id'] == version)
        scopes[uid] = choice['translation_scope']
        native[uid] = tool('get_text', {'uid': uid, 'limit': 30, 'script': 'sinhala'})['segments']
        assert rpc('get_translation', {'uid': uid, 'translation': version}).get('isError')
        request = {'uid': uid, 'translation': version, 'allow_partial': True, 'scope_sha256': scopes[uid]['scope_sha256'], 'limit': 500}
        accumulated = ''; pages = 0
        while True:
            result = tool('get_translation', request); pages += 1
            assert result['text_id'] == uid and result['translation_id'] == version and result['translation_scope'] == scopes[uid] and result['whole_unit_coverage'] is False
            assert result['offset'] == len(accumulated)
            assert digest({'licensing': result['license'], 'citation': result['attribution']}) == row['partial_scope']['notice_sha256']
            accumulated += result['text']
            if result['next_offset'] is None: break
            assert pages < 100
            request = result['continue_with']['arguments']
            assert request['uid'] == uid and request['translation'] == version and request['allow_partial'] is True and request['scope_sha256'] == scopes[uid]['scope_sha256'] and request['prefix_sha256'] == hashlib.sha256(accumulated.encode()).hexdigest()
            if pages == 1:
                assert rpc('get_translation', {**request, 'prefix_sha256': '0' * 64}).get('isError')
        assert accumulated == expected[uid]['text'] and pages > 1
        bad = {**request, 'scope_sha256': '0' * 64}
        assert rpc('get_translation', bad).get('isError')
        checks.append({'unit': uid, 'check': 'actual MCP rejects absent/drifted consent and paginates only exact excerpt to finite end', 'pages': pages, 'characters': len(accumulated)})
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        for width in [320, 390, 768, 1280]:
            for theme in ['light', 'dark']:
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                seed = {'theme': theme, 'remember_position': False, 'script': 'sinhala', 'saved': [{'uid': 'dhp183', 'ref': 'dhp183/1', 'title': 'Synthetic private fixture', 'offset': 0, 'note': PRIVATE}], 'reading_progress': []}
                raw = json.dumps(seed, ensure_ascii=False)
                context.add_init_script('if(!localStorage.getItem(' + json.dumps(KEY) + '))localStorage.setItem(' + json.dumps(KEY) + ',' + json.dumps(raw) + ')')
                page = context.new_page(); calls = []; forbidden = []; errors = []; drift = {'field': None}
                def intercept(route):
                    req = route.request
                    if not req.url.startswith(base + '/') or PRIVATE in req.url or PRIVATE in (req.post_data or ''):
                        forbidden.append(req.url); route.abort(); return
                    if req.method == 'POST' and req.url.endswith('/mcp'):
                        payload = req.post_data_json; calls.append(copy.deepcopy(payload['params']))
                        if payload['params']['name'] == 'get_translation' and drift['field']:
                            response = route.fetch(); body = response.json(); data = body['result']['structuredContent']
                            if drift['field'] == 'source': data['translation_id'] = 'ati:/tipitaka/vin/mv/wrong'
                            elif drift['field'] == 'notice': data['translation_scope']['notice_sha256'] = '0' * 64
                            else: data['translation_scope']['scope_sha256'] = '0' * 64
                            route.fulfill(response=response, json=body); return
                    route.continue_()
                context.route('**/*', intercept)
                page.on('pageerror', lambda e: errors.append(str(e)))
                def audit(state):
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, theme, state)
                    assert page.evaluate('key=>localStorage.getItem(key)', KEY) == raw
                    assert not forbidden and not errors
                    if args.a11y:
                        page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                        data = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                        scans.append({'width': width, 'theme': theme, 'state': state, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in data['violations']]})
                page.goto(base + '/#saved')
                page.get_by_label('Your personal note', exact=True).fill(PRIVATE + '_UNSAVED')
                page.goto(base + '/#browse?node=english&availability=scoped&collection=vinaya')
                expect(page.locator('.english-catalogue-count')).to_have_text('3 matching indexed records')
                assert len(calls) == 1 and calls[0]['name'] == 'browse_canon'; audit('scoped Vinaya catalogue without English fetch')
                for row in rows:
                    uid, version = row['unit_id'], 'ati:' + row['path']; scope = scopes[uid]
                    def review():
                        before = sum(c['name'] == 'get_translation' for c in calls)
                        if page.url == base + '/#read?uid=' + uid:
                            page.goto(base + '/#saved')
                            expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
                        page.goto(base + '/#read?uid=' + uid); read_tool(page, 'English sources').wait_for()
                        expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([segment['text'] for segment in native[uid]])
                        read_tool(page, 'English sources').click()
                        card = page.locator('#study .translation-choice').filter(has_text=row['source_reference'])
                        card.get_by_role('button', name='Review partial-unit source', exact=True).click()
                        expect(page.locator('#scope-consent')).not_to_be_checked()
                        expect(page.get_by_role('button', name='Read reviewed partial source', exact=True)).to_be_disabled()
                        assert scope['first_ref'] + ' to ' + scope['last_ref'] in page.locator('#study').inner_text()
                        assert row['mapping_note'] in page.locator('#study').inner_text()
                        assert sum(c['name'] == 'get_translation' for c in calls) == before
                    def consent():
                        page.locator('#scope-consent').focus(); page.keyboard.press('Space'); page.keyboard.press('Tab')
                        expect(page.get_by_role('button', name='Read reviewed partial source', exact=True)).to_be_focused(); page.keyboard.press('Enter')
                    review(); audit(uid + ' fresh explicit consent')
                    def translation_response(response):
                        return response.request.method == 'POST' and response.url.endswith('/mcp') and response.request.post_data_json.get('params', {}).get('name') == 'get_translation'
                    with page.expect_response(translation_response) as response:
                        consent()
                    payload = response.value.json()['result']['structuredContent']
                    pieces = []; offset = 0
                    while True:
                        expect(page.locator('#study .translation')).to_have_text(payload['text'])
                        # text_content additionally checks the actual publisher verse/newline breaks.
                        piece = page.locator('#study .translation').text_content()
                        assert piece == payload['text']
                        assert payload['text_id'] == uid and payload['translation_id'] == version and payload['whole_unit_coverage'] is False
                        assert payload['translation_scope'] == scope and payload['offset'] == offset
                        assert digest({'licensing': payload['license'], 'citation': payload['attribution']}) == row['partial_scope']['notice_sha256']
                        pieces.append(piece); offset += len(piece)
                        audit(uid + ' exact English page at ' + str(payload['offset']))
                        if payload['next_offset'] is None:
                            assert payload.get('continue_with') is None
                            break
                        continuation = payload['continue_with']['arguments']
                        assert continuation['uid'] == uid and continuation['translation'] == version and continuation['allow_partial'] is True
                        assert continuation['scope_sha256'] == scope['scope_sha256'] and continuation['offset'] == offset
                        assert continuation['prefix_sha256'] == hashlib.sha256(''.join(pieces).encode()).hexdigest()
                        assert len(pieces) < 100
                        with page.expect_response(translation_response) as response:
                            page.get_by_role('button', name='Next English page →', exact=True).click()
                        assert response.value.request.post_data_json['params']['arguments'] == continuation
                        payload = response.value.json()['result']['structuredContent']
                    assert ''.join(pieces) == expected[uid]['text']
                    assert (len(pieces) > 1) if len(expected[uid]['text']) > 6000 else (len(pieces) == 1)
                    assert page.get_by_role('button', name='Next English page →', exact=True).count() == 0
                    notice = expected[uid]['notice']; provenance = page.locator('#study .provenance').text_content()
                    assert notice['licensing'] in provenance and notice['citation'] in provenance
                    assert version in page.locator('#study').inner_text() and 'Partial English source' in page.locator('#study h3').inner_text()
                    request = calls[-1]['arguments']; assert request['translation'] == version and request['allow_partial'] is True and request['scope_sha256'] == scope['scope_sha256']
                    audit(uid + ' exact finite excerpt and complete notice')
                    page.get_by_role('button', name='Reload passage and review sources', exact=True).click()
                    read_tool(page, 'English sources').click(); page.locator('#study .translation-choice').filter(has_text=row['source_reference']).get_by_role('button', name='Review partial-unit source', exact=True).click()
                    expect(page.locator('#scope-consent')).not_to_be_checked()
                    for field in ['source', 'notice', 'scope']:
                        drift['field'] = field; consent()
                        expect(page.get_by_role('button', name='Retry selected source', exact=True)).to_be_visible()
                        expect(page.locator('#study .translation')).to_have_count(0)
                        audit(uid + ' refuses ' + field + ' drift')
                        drift['field'] = None
                        review()
                    checks.append({'width': width, 'theme': theme, 'unit': uid, 'check': 'Sinhala Pāli, exact fresh consent, complete notice, finite excerpt, source/notice/scope guards and private storage preserved', 'browser_pages': len(pieces)})
                page.goto(base + '/#saved')
                expect(page.get_by_label('Your personal note', exact=True)).to_have_value(PRIVATE + '_UNSAVED')
                with page.expect_download() as download:
                    page.get_by_role('button', name='Export bookmarks and notes', exact=True).click()
                exported = json.loads(pathlib.Path(download.value.path()).read_text())
                assert exported['saved'][0]['note'] == PRIVATE + '_UNSAVED'
                assert page.evaluate('key=>localStorage.getItem(key)', KEY) == raw
                assert not forbidden and not errors
                print(f'{width}px {theme}: all three exact Vinaya partials and private draft export passed', flush=True)
                context.close()
        browser.close()
    events = [json.loads(line) for line in ledger.read_text().splitlines()]
    assert events and all(e['allowed'] and e['url'] in sources for e in events)
    result = {'passed': len(checks), 'checks': checks, 'outside_source_tree': bool(args.server_dir), 'pinned_local_sources_only': True, 'upstream_provider_requests': 0,
              'sources': [{'unit': r['unit_id'], 'source_html_sha256': r['source_html_sha256'], 'text_sha256': r['partial_scope']['text_sha256'], 'notice_sha256': r['partial_scope']['notice_sha256']} for r in rows],
              'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
              'limits': 'Pinned official ATI repository HTML in test-only provider transport, actual bundled HTTP/MCP worker and browser. Not live publisher availability, whole-Khandhaka English, new rights approval, human screen-reader/native-script or physical-device certification. Publisher bodies and synthetic private notes are excluded from reports.'}
    text = json.dumps(result, indent=2); print(text)
    if args.report: pathlib.Path(args.report).write_text(text + '\n')
    assert result['a11y']['violations'] == 0
finally:
    server.terminate(); server.wait(timeout=10)
