#!/usr/bin/env python3
"""Print the actual bundled reader; verify source text, scope, privacy and PDF output."""
import argparse, json, os, pathlib, socket, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(); parser.add_argument('--report'); parser.add_argument('--server-dir', type=pathlib.Path); args = parser.parse_args()
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT, env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
checks = []
def print_control(page):
    control = page.locator('[data-print-page]'); control.wait_for(state='attached')
    panel = page.locator('.study-actions')
    if panel.count() and panel.get_attribute('open') is None: panel.locator('summary').click()
    return control
try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    with sync_playwright() as pw, tempfile.TemporaryDirectory() as folder:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        for width in [390, 1280]:
            context = browser.new_context(viewport={'width': width, 'height': 900})
            context.add_init_script("window.printCalls=0;window.print=()=>{window.printCalls++;dispatchEvent(new Event('beforeprint'))}")
            page = context.new_page(); errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
            for suffix, label in [('uid=dhp183', 'canon'), ('uid=mn10&offset=30', 'continuation'), ('book=vin02m1&offset=6', 'book'), ('kind=post&uid=Vism%201.1', 'later work'), ('kind=commentary&uid=mn1', 'commentary')]:
                page.goto(base + '/?private-hosting-token=DO_NOT_PRINT#read?' + suffix)
                control = print_control(page)
                page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
                original = page.locator('section[aria-label="Pāli passage"] .passage').all_text_contents()
                # Synthetic private study content must never leak into the printable snapshot.
                page.evaluate("document.getElementById('study').textContent='PRIVATE_NOTE_DO_NOT_PRINT'")
                control.focus(); page.keyboard.press('Enter')
                assert page.evaluate('window.printCalls') > 0
                assert page.locator('#print-document .print-passage').all_text_contents() == original
                text = page.locator('#print-document').text_content()
                assert 'Loaded Pāli page only' in text and 'VRI' in text
                assert 'PRIVATE_NOTE_DO_NOT_PRINT' not in text and 'private-hosting-token' not in text
                assert not page.locator('#print-document button, #print-document textarea, #print-document input').count()
                if label in ['later work', 'commentary']: assert 'NOT CANON' in text
                page.emulate_media(media='print')
                expect(page.locator('#print-document')).to_be_visible(); expect(page.locator('.workspace')).to_be_hidden()
                assert page.locator('#print-document').evaluate('(e)=>getComputedStyle(e).color') == 'rgb(0, 0, 0)'
                pdf = page.pdf(path=str(pathlib.Path(folder)/f'{width}-{label}.pdf'), format='A4')
                assert pdf.startswith(b'%PDF-') and len(pdf) > 1000
                checks.append({'width': width, 'case': label, 'segments': len(original), 'pdf_bytes': len(pdf)})
                page.emulate_media(media='screen'); page.evaluate("dispatchEvent(new Event('afterprint'))")
                assert page.locator('#print-document').text_content() == ''
            page.goto(base + '/#read?uid=dhp183'); print_control(page)
            page.get_by_text('Reading preferences', exact=True).click(); page.locator('#theme').select_option('dark'); page.locator('#script').select_option('devanagari')
            page.locator('.passage').filter(has_text='स').wait_for()
            page.evaluate("dispatchEvent(new Event('beforeprint'))")
            assert page.locator('#print-document .print-passage').all_text_contents() == page.locator('section[aria-label="Pāli passage"] .passage').all_text_contents()
            page.emulate_media(media='print'); assert page.locator('#print-document').evaluate('(e)=>getComputedStyle(e).color') == 'rgb(0, 0, 0)'
            page.emulate_media(media='screen')
            # Printing immediately after a route change must not relabel old text.
            during_navigation = page.evaluate("location.hash='#read?uid=mn10';dispatchEvent(new Event('beforeprint'));document.getElementById('print-document').textContent")
            assert 'No Pāli page ready to print' in during_navigation
            print_control(page)
            page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
            for route in ['saved', 'browse?node=canon', 'read?uid=NOT_A_TEXT']:
                page.goto(base + '/#' + route); page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
                assert page.get_by_role('button', name='Print loaded Pāli page', exact=True).count() == 0
                page.evaluate("dispatchEvent(new Event('beforeprint'))")
                text = page.locator('#print-document').text_content()
                assert 'No Pāli page ready to print' in text and 'Sabbapāpassa' not in text
            checks.append({'width': width, 'case': 'native-script, dark theme, nonreading/error privacy, snapshot cleanup'})
            assert not errors, errors
            context.close()
        browser.close()
    result = {'passed': len(checks), 'outside_source_tree': bool(args.server_dir), 'checks': checks, 'limits': 'Actual bundled source in headless Chromium. PDF signature/size and print DOM checked; no printer hardware, Safari, tagged-PDF or glyph-by-glyph visual certification.'}
    output = json.dumps(result, indent=2); print(output)
    if args.report: pathlib.Path(args.report).write_text(output+'\n')
finally:
    server.terminate(); server.wait(timeout=10)
