#!/usr/bin/env python3
"""Actual-source personal highlights; explicit saved-metadata and storage fixtures."""
import argparse, copy, json, os, pathlib, re, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool

ROOT = pathlib.Path(__file__).resolve().parents[1]
PRIVATE = 'PRIVATE_HIGHLIGHT_DRAFT_'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report'); parser.add_argument('--a11y', action='store_true'); parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
checks, scans = [], []
started = time.monotonic()
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def tool(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    req = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(req, timeout=30))['result']
    assert not result.get('isError'), result
    return result['structuredContent']

def revision(data): return data['source'].get('locator_revision', data['source']['commit'])
def mark(data, selector, index):
    return {'uid': selector, 'ref': data['segments'][index]['ref'], 'title': data.get('title') or data.get('book', {}).get('title') or data.get('citation') or data['book_id'],
            'note': '', 'offset': data['offset'] + index, 'source_commit': revision(data)}
def source(label, context, name, arguments, selector):
    data = tool(name, {**arguments, 'offset': 0, 'limit': 30, 'script': 'roman'})
    index = next(i for i, s in enumerate(data['segments']) if s['type'] != 'heading')
    return {'label': label, 'context': context, 'data': data, 'mark': mark(data, selector, index)}
def profile(page): return page.evaluate("JSON.parse(localStorage.getItem('pali-library-v1'))")
def location(case): return base + '/#read?' + urllib.parse.urlencode(case['context'])
def downloaded(page, control):
    with page.expect_download() as info: control.click()
    return json.loads(pathlib.Path(info.value.path()).read_text(encoding='utf-8'))

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    book_id = tool('browse_canon', {'node': 'books', 'limit': 60})['items'][0]['read_with']['book']
    commentary_id = tool('get_commentary', {'uid': 'commentary', 'limit': 40})['books'][0]['uid']
    post_id = tool('get_post_canonical', {'limit': 40})['items'][0]['id']
    sources = [source('canonical', {'uid': 'mn10'}, 'get_text', {'uid': 'mn10'}, 'mn10'),
               source('root book', {'book': book_id}, 'get_text', {'book': book_id}, 'book:' + book_id),
               source('direct commentary', {'kind': 'commentary', 'uid': commentary_id}, 'get_commentary', {'uid': commentary_id}, commentary_id),
               source('post-canonical', {'kind': 'post', 'uid': post_id}, 'get_post_canonical', {'citation': post_id}, 'post:' + post_id)]
    canonical = sources[0]
    native = tool('get_text', {'uid': 'mn10', 'offset': 0, 'limit': 30, 'script': 'sinhala'})
    aligned_commentary = tool('get_commentary', {'uid': 'mn10', 'offset': 0, 'limit': 20, 'script': 'roman'})
    body_indices = [i for i, s in enumerate(canonical['data']['segments']) if s['type'] != 'heading'][:8]
    assert len(body_indices) == 8
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]:
            def passed(name):
                checks.append({'width': width, 'theme': theme, 'check': name}); print(f'{width}px {theme}: {name}', flush=True)
            def environment(saved=None):
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                seed = {'theme': theme, 'font': 30, 'remember_position': False, 'saved': copy.deepcopy(saved or [])}
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(json.dumps(seed)) + ");" +
                    "window.highlightDenyWrites=false;window.highlightHeld=0;const originalHighlightSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pali-library-v1'&&window.highlightDenyWrites)throw Error('Controlled highlight storage denial');return originalHighlightSet.call(this,k,v)}")
                state = {'calls': [], 'errors': [], 'forbidden': [], 'hold': False, 'held': []}
                def intercept(route):
                    request = route.request
                    if PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or '') or not request.url.startswith(base + '/'):
                        state['forbidden'].append(request.url); route.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        payload = request.post_data_json; params = payload.get('params', {}); state['calls'].append(copy.deepcopy(params))
                        if params.get('name') not in {'get_text', 'get_commentary', 'get_post_canonical', 'browse_canon'} or params.get('name') == 'get_text' and 'translation' in params.get('arguments', {}):
                            state['forbidden'].append(params); route.abort()
                        elif state['hold'] and params.get('name') == 'get_commentary' and params.get('arguments', {}).get('uid') == 'mn10':
                            state['held'].append(route); request.frame.evaluate('window.highlightHeld++')
                        else: route.continue_()
                    else: route.continue_()
                context.route('**/*', intercept)
                page = context.new_page(); page.set_default_timeout(30000)
                page.on('pageerror', lambda error: state['errors'].append(str(error)))
                return context, page, state
            def privacy(page, state):
                assert not state['forbidden'] and not state['errors'], state
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                expect(page.locator('#view img, #view script')).to_have_count(0)
            def audit(page, state, label):
                privacy(page, state); assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{width}px {theme} {label} overflow'
                if args.a11y:
                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                    d = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width': width, 'theme': theme, 'state': label, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in d['violations']]})
            def ready(page, case, data=None):
                data = data or case['data']; expect(page).to_have_url(location(case))
                expect(page.locator('section[aria-label="Pāli passage"] .segment .passage')).to_have_text([s['text'] for s in data['segments']])
                assert page.locator('section[aria-label="Pāli passage"] .segment .passage').all_text_contents() == [s['text'] for s in data['segments']]
                expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)
            def part(page, record):
                return page.locator('section[aria-label="Pāli passage"] > .segment').filter(has=page.get_by_role('link', name='Open exact passage ' + record['ref'], exact=True))
            def highlighted(node, expected):
                expect(node).to_have_class(re.compile(r'\bpersonal-highlight\b')) if expected else expect(node).not_to_have_class(re.compile(r'\bpersonal-highlight\b'))
            def preference(page):
                preferences = page.locator('details.preferences')
                if preferences.get_attribute('open') is None: preferences.locator('summary').click()
                control = page.locator('#highlight-saved'); expect(control).to_be_visible(); return control
            def personal_field(page):
                region = page.get_by_role('region', name='Personal note for ' + canonical['mark']['ref'], exact=True)
                field = region.get_by_label('Your personal note for ' + canonical['mark']['ref'], exact=True)
                if not field.count(): region.get_by_role('button', name='View/edit personal note', exact=True).click()
                expect(field).to_be_visible(); return region, field

            context, page, state = environment()
            for case in sources:
                page.goto(location(case)); ready(page, case)
                node = part(page, case['mark']); body = node.locator('.passage'); original = body.inner_html()
                background = node.evaluate('(e)=>getComputedStyle(e).backgroundColor')
                highlighted(node, False)
                save = node.get_by_role('button', name='Save passage ' + case['mark']['ref'], exact=True)
                save.focus(); page.keyboard.press('Enter'); highlighted(node, True)
                expect(save).to_have_attribute('aria-pressed', 'true'); expect(node).to_have_class(re.compile(r'\bmarked\b'))
                assert profile(page)['saved'][-1] == case['mark'] and body.inner_html() == original
                assert node.evaluate('(e)=>getComputedStyle(e).backgroundColor') != background
                save.click(); highlighted(node, False); expect(save).to_have_attribute('aria-pressed', 'false')
                assert node.evaluate('(e)=>getComputedStyle(e).backgroundColor') == background
                save.click(); highlighted(node, True)
                passed(case['label'] + ': exact saved pin/ref/offset highlights on add, removes on delete and leaves source HTML and bookmark/star semantics unchanged')

            page.goto(location(canonical)); ready(page, canonical)
            region, field = personal_field(page)
            draft = PRIVATE + '<img src=x onerror=alert(1)> පුද්ගලික'
            field.fill(draft); privacy(page, state)
            state['hold'] = True; read_tool(page, 'Traditional commentary').click(); page.wait_for_function('window.highlightHeld===1')
            control = preference(page); control.focus(); page.evaluate('window.scrollBy(0,47)')
            before = profile(page); before_calls = len(state['calls']); scroll = page.evaluate('scrollY')
            node = part(page, canonical['mark']); body = node.locator('.passage').element_handle(); body_html = body.inner_html(); rectangle = node.bounding_box()
            for enabled in [False, True]:
                page.keyboard.press('Space')
                expect(control).to_be_checked() if enabled else expect(control).not_to_be_checked()
                expect(control).to_be_focused(); highlighted(node, enabled)
                assert page.evaluate('scrollY') == scroll and body.evaluate('(e)=>e.isConnected') and body.inner_html() == body_html
                assert node.bounding_box() == rectangle
                expect(field).to_have_value(draft)
                assert profile(page) == {**before, 'highlight_saved': enabled} and len(state['calls']) == before_calls
                expect(page.get_by_role('button', name='Stop waiting for Commentary', exact=True)).to_be_visible()
            route = state['held'].pop(); route.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': route.request.post_data_json['id'], 'result': {'structuredContent': aligned_commentary}}))
            expect(page.get_by_role('heading', name='Traditional commentary · not canonical root text', exact=True)).to_be_visible()
            expect(page.locator('#study .passage')).to_have_text([s['text'] for s in aligned_commentary['segments']])
            region, field = personal_field(page); expect(field).to_have_value(draft)
            save = node.get_by_role('button', name='Save passage ' + canonical['mark']['ref'], exact=True); save.click()
            confirmation = page.get_by_role('group', name='Confirm bookmark and note removal', exact=True)
            confirmation.get_by_role('button', name='Cancel removal', exact=True).focus(); page.keyboard.press('Enter')
            expect(save).to_be_focused(); highlighted(node, True); expect(field).to_have_value(draft)
            audit(page, state, 'live toggle preserves source/draft/focus/scroll and pending study')
            passed('live keyboard off/on preserves existing source DOM, typed draft, scroll/focus, pending commentary and all other data; note-bearing Cancel preserves its marker')

            region.get_by_role('button', name='Save note', exact=True).click(); expect(page.locator('#status')).to_contain_text('Personal note saved')
            control = preference(page); control.uncheck(); page.reload(); ready(page, canonical)
            highlighted(part(page, canonical['mark']), False); expect(preference(page)).not_to_be_checked()
            page.get_by_role('combobox', name='Pāli script', exact=True).select_option('sinhala'); ready(page, canonical, native)
            highlighted(part(page, canonical['mark']), False)
            preference(page).check(); highlighted(part(page, canonical['mark']), True)
            assert profile(page)['saved'][0] == {**canonical['mark'], 'note': draft}
            audit(page, state, 'persisted preference and native-script exact pin match')
            passed('off preference survives reload; Sinhala rendering retains original refs/pins and switching on colors the same saved passage')

            if width == 390 and theme == 'light':
                node = part(page, canonical['mark']); control = preference(page); control.focus()
                rectangle = node.bounding_box()
                page.emulate_media(forced_colors='active')
                page.wait_for_function('matchMedia("(forced-colors: active)").matches')
                style = node.evaluate('(e)=>{const s=getComputedStyle(e);return {style:s.outlineStyle,width:s.outlineWidth,offset:s.outlineOffset,shadow:s.boxShadow}}')
                assert style == {'style': 'solid', 'width': '3px', 'offset': '-3px', 'shadow': 'none'}, style
                assert node.bounding_box() == rectangle
                control.uncheck(); highlighted(node, False)
                assert node.evaluate('(e)=>getComputedStyle(e).outlineStyle') == 'none'
                assert node.bounding_box() == rectangle
                control.check(); page.emulate_media(forced_colors='none'); highlighted(node, True)
                passed('forced colors uses a visible 3px inset outline without layout movement; off removes the outline and normal media restores the marker')

            expected_saved = copy.deepcopy(profile(page)['saved'])
            page.evaluate("dispatchEvent(new Event('beforeprint'))")
            expect(page.locator('#print-document .print-passage')).to_have_text([s['text'] for s in native['segments']])
            assert page.locator('#print-document .print-passage').all_text_contents() == [s['text'] for s in native['segments']]
            expect(page.locator('#print-document .personal-highlight, #print-document .marked, #print-document .personal-note, #print-document textarea')).to_have_count(0)
            assert PRIVATE not in page.locator('#print-document').text_content()
            page.evaluate("dispatchEvent(new Event('afterprint'))")
            page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            assert downloaded(page, page.get_by_role('button', name='Export bookmarks and notes', exact=True)) == {'format': 'pali-library-v1', 'saved': expected_saved}
            page.get_by_role('link', name='Study backup', exact=True).click(); expect(page.get_by_role('heading', name='Study backup', exact=True)).to_be_visible()
            combined = downloaded(page, page.locator('#view').get_by_role('button', name='Download study backup', exact=True))
            assert combined == {'format': 'pali-library-study-backup-v1', 'saved': expected_saved, 'progress': [], 'resume': None}
            passed('print copies only exact Pāli without personal markers/notes; individual and combined exports contain no highlight settings or new bookmark metadata')
            page.goto(location(canonical)); ready(page, canonical, native); node = part(page, canonical['mark'])
            node.get_by_role('button', name='Save passage ' + canonical['mark']['ref'], exact=True).click()
            page.get_by_role('group', name='Confirm bookmark and note removal', exact=True).get_by_role('button', name='Remove bookmark and note', exact=True).click()
            highlighted(node, False); expect(node).not_to_have_class(re.compile(r'\bmarked\b'))
            assert len(profile(page)['saved']) == 3; privacy(page, state)
            passed('confirmed removal of a note-bearing bookmark clears only its exact personal marker and saved record')
            context.close()

            # One actual page exercises all fail-closed variants, with a positive
            # control to prevent an always-off implementation from passing.
            variants, seeded = [], []
            labels = ['stale pin', 'legacy unpinned', 'missing offset', 'wrong offset', 'invalid pin', 'duplicate identity', 'wrong selector', 'valid control']
            for n, label in enumerate(labels):
                record = mark(canonical['data'], 'mn10', body_indices[n]); row = copy.deepcopy(record)
                if label == 'stale pin': row['source_commit'] = 'controlled-old-highlight-revision'
                elif label == 'legacy unpinned': row.pop('source_commit'); row.pop('offset')
                elif label == 'missing offset': row.pop('offset')
                elif label == 'wrong offset': row['offset'] += 1
                elif label == 'invalid pin': row['source_commit'] = 'https://invalid.example/pin'
                elif label == 'wrong selector': row['uid'] = sources[1]['mark']['uid']
                seeded.append(row)
                if label == 'duplicate identity': seeded.append({**row, 'source_commit': 'controlled-duplicate-old-revision'})
                variants.append((label, record))
            context, page, state = environment(seeded); page.goto(location(canonical)); ready(page, canonical)
            for label, record in variants:
                node = part(page, record); highlighted(node, label == 'valid control')
                expect(node.get_by_role('button', name='Save passage ' + record['ref'], exact=True)).to_have_attribute('aria-pressed', 'false' if label == 'wrong selector' else 'true')
                if label != 'valid control': assert node.evaluate('(e)=>getComputedStyle(e).backgroundColor') == 'rgba(0, 0, 0, 0)'
            assert profile(page)['saved'] == seeded
            audit(page, state, 'fail-closed metadata matrix with positive control')
            passed('stale/legacy/missing-or-wrong-offset/invalid/duplicate/wrong-owner fixtures remain uncolored and untouched; unique exact positive control is highlighted')
            context.close()

            for fault in ['quota', 'private peer change']:
                record = {**canonical['mark'], 'note': PRIVATE + 'stored note'}
                context, page, state = environment([record]); page.goto(location(canonical)); ready(page, canonical)
                region, field = personal_field(page); field.fill(PRIVATE + fault + ' draft')
                control = preference(page); control.focus(); before = profile(page); before_calls = len(state['calls'])
                if fault == 'quota':
                    page.evaluate('window.highlightDenyWrites=true'); durable = before
                else:
                    page.evaluate("()=>{const x=JSON.parse(localStorage.getItem('pali-library-v1'));x.saved[0].note='" + PRIVATE + "newer peer note';localStorage.setItem('pali-library-v1',JSON.stringify(x))}")
                    durable = {**before, 'saved': [{**record, 'note': PRIVATE + 'newer peer note'}]}
                page.keyboard.press('Space'); expect(control).not_to_be_checked(); highlighted(part(page, record), False)
                expect(page.locator('#storage-recovery')).to_be_visible(); expect(field).to_have_value(PRIVATE + fault + ' draft')
                assert profile(page) == durable and len(state['calls']) == before_calls
                recovered = downloaded(page, page.locator('#storage-recovery').get_by_role('button', name='Download study backup', exact=True))
                assert recovered['saved'] == [{**record, 'note': PRIVATE + fault + ' draft'}] and set(recovered) == {'format', 'saved', 'progress', 'resume'}
                audit(page, state, fault + ' tab-only preference and draft recovery')
                passed(fault + ': live tab-only toggle warns without overwriting durable notes/settings; latest private draft remains recoverable')
                context.close()
        browser.close()
    result = {'passed': len(checks), 'checks': checks, 'outside_source_tree': bool(args.server_dir), 'duration_seconds': round(time.monotonic() - started, 2),
              'actual_sources': [{k: s['mark'][k] for k in ['uid', 'ref', 'offset', 'source_commit']} for s in sources],
              'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
              'limits': 'Actual bundled canonical/root/direct-commentary/post-canonical Pāli and source metadata; private notes, old/invalid/wrong-offset/duplicate saved records and storage/peer changes are explicit fixtures. A held actual aligned-commentary result tests pending-study continuity. No English/provider fetch, source-data activation, private-note upload or source-body export. Native codepoints are checked, not OS glyph shaping; Chromium viewport/axe checks are not physical-device or human accessibility certification. Only axe contexts bypass CSP.'}
    text = json.dumps(result, indent=2); print(text)
    if args.report: pathlib.Path(args.report).write_text(text + '\n', encoding='utf-8')
    if result['a11y']['violations']: raise SystemExit(1)
finally:
    server.terminate()
    try: server.wait(timeout=10)
    except subprocess.TimeoutExpired: server.kill(); server.wait()
