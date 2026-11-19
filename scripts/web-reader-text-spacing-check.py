#!/usr/bin/env python3
"""Expanded user text spacing, narrow reflow and keyboard reading workflows.

Actual bundled Pāli and English-source metadata; no translation-body retrieval.
The isolated browser context bypasses CSP only to apply a user-spacing stylesheet
and optional axe audit. This is not browser zoom or physical-device acceptance.
"""
import argparse
import hashlib
import json
import os
import pathlib
import socket
import subprocess
import time
import urllib.parse
import urllib.request

from web_reader_test_helpers import read_tool, source_position

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_TEXT_SPACING_ā😀'
SPACING = '* {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} p {margin-bottom:2em!important}'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report', type=pathlib.Path)
parser.add_argument('--a11y', action='store_true')
parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args()
checks, metrics, scans, receipts = [], [], [], []


def report(status):
    result = {'status': status, 'passed': len(checks), 'checks': checks, 'metrics': metrics, 'source_receipts': receipts,
              'outside_source_tree': bool(args.server_dir),
              'spacing_override': {'line_height': 1.5, 'paragraph_margin_em': 2, 'letter_spacing_em': .12, 'word_spacing_em': .16},
              'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
              'limits': 'Actual bundled Pāli and source-choice metadata with a synthetic local personal note. Audit-only contexts bypass CSP to inject user text spacing and optional axe; production CSP is unchanged. 320/390/1280 CSS-pixel viewports are emulation, not browser zoom, physical-device, OS text scaling, glyph-shaping or human assistive-technology certification. No English body retrieval, publisher requests, source activation or private note values in this report.'}
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(result, indent=2) + '\n')
    return result


report('running')
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
server = None


def tool(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    request = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(request, timeout=30))['result']
    assert not result.get('isError'), 'Actual bundled source lookup failed'
    return result['structuredContent']


try:
    from playwright.sync_api import expect, sync_playwright

    server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
        env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    dhp = tool('get_text', {'uid': 'dhp183', 'limit': 30, 'script': 'roman'})
    ref = dhp['segments'][0]['ref']
    revision = dhp['source'].get('locator_revision', dhp['source']['commit'])
    receipts.append({'uid': 'dhp183', 'source_revision': revision, 'references': [s['ref'] for s in dhp['segments']],
                     'http_bundle_sha256': hashlib.sha256((server_dir / 'http.cjs').read_bytes()).hexdigest()})
    mark = {'uid': 'dhp183', 'ref': ref, 'offset': 0, 'source_commit': revision, 'title': dhp['title'], 'note': PRIVATE + ' durable'}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        expect.set_options(timeout=15000)
        for width in [320, 390, 1280]:
            for theme in ['light', 'dark']:
                height = 844 if width < 761 else 900
                context = browser.new_context(viewport={'width': width, 'height': height}, bypass_csp=True)
                seed = {'theme': theme, 'remember_position': False, 'font': 30, 'saved': [mark], 'reading_progress': []}
                context.add_init_script("if(!localStorage.getItem('" + KEY + "'))localStorage.setItem('" + KEY + "',JSON.stringify(" + json.dumps(seed) + '))')
                page = context.new_page(); state = {'calls': [], 'errors': [], 'forbidden': []}
                page.on('pageerror', lambda error: state['errors'].append(type(error).__name__))

                def intercept(route):
                    req = route.request
                    if not req.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(req.url) or PRIVATE in (req.post_data or '') or any(PRIVATE in value for value in req.headers.values()):
                        state['forbidden'].append({'method': req.method, 'url_sha256': hashlib.sha256(req.url.encode()).hexdigest()}); route.abort(); return
                    if req.method == 'POST' and req.url.endswith('/mcp'):
                        params = req.post_data_json.get('params', {})
                        state['calls'].append(params)
                        if params.get('name') not in ['get_text', 'list_translations']:
                            state['forbidden'].append({'tool': params.get('name')}); route.abort(); return
                    route.continue_()

                context.route('**/*', intercept)

                def passed(label):
                    checks.append({'width': width, 'theme': theme, 'check': label})
                    print(f'{width}px {theme}: {label}', flush=True)

                def local():
                    return page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)

                def keyboard(control, key='Enter'):
                    control.scroll_into_view_if_needed(); control.focus(); expect(control).to_be_focused()
                    box = control.bounding_box()
                    assert box and box['x'] >= -1 and box['x'] + box['width'] <= width + 1, 'Keyboard control extends beyond viewport'
                    assert box['y'] >= -1 and box['y'] + box['height'] <= height + 1, 'Keyboard control is not visible after scrolling'
                    page.keyboard.press(key)

                def loaded():
                    page.locator('.passage').first.wait_for()
                    page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')

                def spacing():
                    page.add_style_tag(content=SPACING)
                    style = page.locator('p.passage').first.evaluate('(node)=>{const s=getComputedStyle(node);return {font:parseFloat(s.fontSize),line:parseFloat(s.lineHeight),letter:parseFloat(s.letterSpacing),word:parseFloat(s.wordSpacing),paragraph:parseFloat(s.marginBottom)}}')
                    assert abs(style['line'] / style['font'] - 1.5) < .01
                    assert abs(style['letter'] / style['font'] - .12) < .01
                    assert abs(style['word'] / style['font'] - .16) < .01
                    assert abs(style['paragraph'] / style['font'] - 2) < .01

                def layout(stage):
                    data = page.evaluate('''()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,
                      clipped:Array.from(document.querySelectorAll('main p,main h2,main h3,main button,main summary,main textarea,main input,main select,main label')).filter(node=>{
                        if(!node.getClientRects().length||!node.checkVisibility())return false;
                        const style=getComputedStyle(node);if(style.visibility==='hidden')return false;
                        const box=node.getBoundingClientRect();
                        if(box.left < -1 || box.right > innerWidth+1)return true;
                        return !['TEXTAREA','INPUT','SELECT'].includes(node.tagName)&&((node.scrollWidth>node.clientWidth+1)||(node.scrollHeight>node.clientHeight+1));
                      }).map(node=>({tag:node.tagName,class:node.className,id:node.id,parent_class:node.parentElement.className,
                        child_tags:Array.from(node.children).map(child=>child.tagName),
                        width:node.clientWidth,scroll_width:node.scrollWidth,height:node.clientHeight,scroll_height:node.scrollHeight,
                        bounds:{x:node.getBoundingClientRect().x,right:node.getBoundingClientRect().right}}))})''')
                    metrics.append({'width': width, 'theme': theme, 'state': stage, **data})
                    assert data['document'] <= width + 1, 'Expanded spacing creates horizontal document overflow'
                    assert not data['clipped'], 'Expanded spacing clips reading text or controls: ' + json.dumps(data['clipped'])
                    assert not state['forbidden'] and not state['errors'], 'Unexpected requests or browser errors'
                    assert PRIVATE not in page.url and PRIVATE not in page.title()
                    assert local()['reading_progress'] == [] and local()['remember_position'] is False
                    if args.a11y:
                        page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                        audit = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                        violations = [{'id': v['id'], 'impact': v['impact'], 'targets': [n['target'] for n in v['nodes']]} for v in audit['violations']]
                        scans.append({'width': width, 'theme': theme, 'state': stage, 'violations': violations, 'manual_review_rules': [v['id'] for v in audit['incomplete']]})
                        assert not violations, 'Expanded-spacing axe violation'

                page.goto(base + '/#read?uid=dhp183'); loaded(); spacing()
                assert page.locator('.passage').all_text_contents() == [s['text'] for s in dhp['segments']], 'Spacing changed source wording'
                editor = page.get_by_role('region', name='Personal note for ' + ref, exact=True)
                draft = editor.get_by_label('Your personal note for ' + ref, exact=True)
                draft.fill(PRIVATE + ' unsaved'); draft.focus(); before = local()
                page.set_viewport_size({'width': 1280 if width < 761 else 390, 'height': height})
                if width < 761: expect(page.locator('.study-actions')).to_have_attribute('open', '')
                else: expect(page.locator('.study-actions')).not_to_have_attribute('open', '')
                assert draft.input_value() == PRIVATE + ' unsaved' and local() == before, 'Responsive change lost or saved draft'
                expect(draft).to_be_focused()
                page.set_viewport_size({'width': width, 'height': height})
                if width < 761: expect(page.locator('.study-actions')).not_to_have_attribute('open', '')
                else: expect(page.locator('.study-actions')).to_have_attribute('open', '')
                layout('canonical passage and private unsaved note at expanded spacing')
                passed('expanded spacing preserves exact Pāli, visible note controls and the focused unsaved draft across a responsive change')
                keyboard(editor.get_by_role('button', name='Save note', exact=True))
                expect(page.locator('#status')).to_have_text('Personal note saved in this browser.')
                assert local()['saved'][0]['note'] == PRIVATE + ' unsaved'
                draft.fill(PRIVATE + ' discarded')
                keyboard(editor.get_by_role('button', name='Discard draft', exact=True))
                layout('expanded-spacing explicit discard confirmation')
                keyboard(editor.get_by_role('button', name='Discard this recovered draft', exact=True))
                assert draft.input_value() == PRIVATE + ' unsaved' and local()['saved'][0]['note'] == PRIVATE + ' unsaved'
                expect(editor.get_by_role('button', name='Discard draft', exact=True)).to_be_focused()
                passed('keyboard Save and confirmed Discard stay reachable without overwriting saved note or exposing private data')

                page.goto(base + '/#read?book=vin02m1'); loaded(); spacing()
                position = source_position(page)
                keyboard(position.get_by_label('Go to source position', exact=True), 'Tab')
                expect(position.get_by_role('button', name='Go', exact=True)).to_be_focused()
                layout('root-book source navigation with expanded spacing')
                passed('expanded root-book tools and source-position form reflow while retaining logical keyboard order')

                page.goto(base + '/#read?uid=an1.52'); loaded(); spacing()
                keyboard(read_tool(page, 'English sources'))
                keyboard(page.get_by_role('button', name='Review shared compilation page', exact=True))
                consent = page.locator('#scope-consent')
                read = page.get_by_role('button', name='Read reviewed shared page', exact=True)
                expect(read).to_be_disabled()
                assert 'not a separately aligned full translation' in page.locator('#study').inner_text()
                layout('expanded-spacing shared-source boundary warning and unchecked consent')
                keyboard(consent, 'Space'); expect(consent).to_be_checked(); expect(read).to_be_enabled()
                page.keyboard.press('Tab'); expect(read).to_be_focused()
                keyboard(consent, 'Space'); expect(consent).not_to_be_checked(); expect(read).to_be_disabled()
                assert not any(c['name'] == 'get_translation' for c in state['calls'])
                assert local()['saved'][0]['note'] == PRIVATE + ' unsaved'
                passed('source boundary warnings and explicit consent remain readable and keyboard-operable without English retrieval or private-note writes')
                context.close()
        browser.close()
    print(json.dumps(report('passed'), indent=2))
except BaseException:
    report('failed')
    raise
finally:
    if server is not None:
        server.terminate(); server.wait(timeout=10)
