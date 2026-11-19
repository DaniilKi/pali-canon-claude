#!/usr/bin/env python3
"""Actual packaged MCP/browser acceptance with pinned official Apadāna bytes; no live requests."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
from tempfile import TemporaryDirectory
import time
import urllib.request

from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool

ROOT = Path(__file__).resolve().parents[1]
KEY, PRIVATE = 'pali-library-v1', 'PRIVATE_APADANA_DRAFT_ā😀'
IDS = ('thi-ap1', 'thi-ap2', 'thi-ap3', 'thi-ap6', 'thi-ap7', 'thi-ap8', 'thi-ap9')
PINS = ('raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256')
CANONICAL_LICENSE = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root', required=True, type=Path, help='Official repository checked out at the pinned revision')
parser.add_argument('--server-dir', type=Path, help='Server directory from an extracted npm package')
mode = parser.add_mutually_exclusive_group()
mode.add_argument('--a11y', action='store_true')
mode.add_argument('--mcp-only', action='store_true', help='Verify the actual HTTP bundle without launching Chromium')
parser.add_argument('--report', type=Path)
args = parser.parse_args()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
manifest = json.loads((server_dir / 'data/apadana.json').read_text())
assert manifest == json.loads((ROOT / 'server/data/apadana.json').read_text())
rows, commit = manifest['links'], manifest['source']['commit']
assert tuple(uid for uid in rows if uid in IDS) == IDS
assert set(rows) == {'thi-ap' + str(n) for n in range(1, 21)}
assert subprocess.check_output(['git', '-C', str(args.source_root), 'rev-parse', 'HEAD'], text=True).strip() == commit
files = {}
for row in (rows[uid] for uid in IDS):
    url = row['raw_url']
    local = args.source_root.resolve() / url.split(commit + '/', 1)[1]
    assert hashlib.sha256(local.read_bytes()).hexdigest() == row['raw_sha256']
    files[url] = str(local)


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def version(uid):
    return 'ap:' + rows[uid]['path'].removeprefix('/text/').rstrip('/')


def rpc(tool, arguments):
    body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
                       'params': {'name': tool, 'arguments': arguments}}).encode()
    request = urllib.request.Request(base + '/mcp', data=body,
                                     headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)['result']


def tool(name, arguments):
    result = rpc(name, arguments)
    assert not result.get('isError'), f'{name} returned an MCP error'
    return result['structuredContent']


def check_source(data, uid):
    row = rows[uid]
    assert data['text_id'] == uid and data['translation_id'] == version(uid)
    assert data['translation_revision'] == commit and data['url'] == row['url'] and data['fetched_url'] == row['raw_url']
    assert 'translation_scope' not in data and data.get('whole_unit_coverage') is not False
    assert data['license'] == 'CC BY-NC-SA 4.0' and data['license_url'] == CANONICAL_LICENSE
    assert 'Walters' in data['attribution'] and 'Whitman College' in data['attribution'] and data['changes']
    assert all(data[key] == row[key] for key in PINS)
    assert data['mapping_notes'] == row['mapping_notes']
    assert all(note in data['notes'] for note in row['mapping_notes'])
    notes = data['translator_notes']
    assert [note['number'] for note in notes] == list(range(1, row['note_count'] + 1))
    assert digest(json.dumps(notes, ensure_ascii=False, separators=(',', ':'))) == row['notes_sha256']
    assert bool(data['publisher_paratext']) == (uid == 'thi-ap1')
    assert digest(data['publisher_paratext']) == row['paratext_sha256']


with TemporaryDirectory(prefix='pali-apadana-browser-') as work:
    stage = Path(work)
    ledger = stage / 'fetches.jsonl'
    preload = stage / 'provider.cjs'
    preload.write_text(
        "const fs=require('node:fs'),files=" + json.dumps(files)
        + "; globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);"
        + "const ok=Object.hasOwn(files,url);fs.appendFileSync(" + json.dumps(str(ledger))
        + ",JSON.stringify({url,ok})+'\\n');if(!ok)throw Error('Unexpected provider request');"
        + "return new Response(fs.readFileSync(files[url]),{status:200,headers:{'content-type':'text/plain'}});};"
    )
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    server = subprocess.Popen(['node', '--require', str(preload), str(server_dir / 'http.cjs')], cwd=stage,
                              env={**os.environ, 'HOST': '127.0.0.1', 'PORT': str(port), 'RATE_LIMIT_PER_MINUTE': '0'},
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    scans, checks, receipts = [], [], []
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(base + '/healthz', timeout=1).close()
                break
            except OSError:
                time.sleep(.1)
        else:
            raise AssertionError('Actual HTTP bundle did not start')
        metadata = {uid: tool('get_text', {'uid': uid, 'limit': 1}) for uid in IDS}
        assert not ledger.exists(), 'Metadata automatically retrieved English'
        for uid, meta in metadata.items():
            choices = meta['english_available']
            assert len(choices) == 1 and choices[0]['translation_id'] == version(uid)
        for uid in ('thi-ap4', 'thi-ap5', 'thi-ap10'):
            assert len(tool('get_text', {'uid': uid, 'limit': 1})['english_available']) == 1
            assert rpc('get_translation', {'uid': uid, 'translation': version(IDS[0])}).get('isError')
        uid = IDS[0]
        request = {'uid': uid, 'translation': version(uid), 'translation_revision': commit, 'limit': 500}
        pieces = []
        while request:
            data = tool('get_translation', request)
            check_source(data, uid)
            assert data['offset'] == len(''.join(pieces)) and len(pieces) < 30
            pieces.append(data['text'])
            continuation = data['continue_with']
            request = continuation['arguments'] if continuation else None
            if request:
                assert request['uid'] == uid and request['translation'] == version(uid) and request['translation_revision'] == commit
                assert request['offset'] == data['next_offset'] and request['prefix_sha256'] == digest(''.join(pieces))
                assert rpc('get_translation', {**request, 'translation_revision': '0' * 40}).get('isError')
        assert len(pieces) > 1 and digest(''.join(pieces)) == rows[uid]['body_sha256']
        checks.append({'check': 'MCP 500-character continuation preserves version, owner and prefix', 'pages': len(pieces)})
        for uid in IDS:
            result = tool('get_translation', {'uid': uid, 'translation': version(uid), 'translation_revision': commit, 'limit': 6000})
            check_source(result, uid)
            assert result['continue_with'] is None and digest(result['text']) == rows[uid]['body_sha256']
            if uid in ('thi-ap7', 'thi-ap9'):
                head = result['text'].splitlines()[0]
                assert head.startswith(f"[{rows[uid]['poem']}. ") and head.endswith(']') and '.diacritics' not in head
                assert rows[uid]['title'] in head
            receipts.append({'uid': uid, 'transport': 'mcp', 'characters': len(result['text']),
                             'note_count': rows[uid]['note_count'], **{key: rows[uid][key] for key in PINS}})
        checks.append({'check': 'All seven official whole sources match body, notes, paratext, root and revision pins'})
        if not args.mcp_only:
            mark = {
                'uid': uid, 'title': metadata[uid]['title'], 'ref': metadata[uid]['segments'][0]['ref'], 'offset': 0,
                'source_commit': metadata[uid]['source'].get('locator_revision', manifest['vri_commit']), 'note': PRIVATE + ' durable'
            }
            with sync_playwright() as pw:
                browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                for width in (390, 1280):
                    for theme in ('light', 'dark') if args.a11y else ('light',):
                        context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                        raw = json.dumps({'theme': theme, 'remember_position': False, 'saved': [mark], 'reading_progress': []}, ensure_ascii=False)
                        context.add_init_script(f'if(!localStorage.getItem({json.dumps(KEY)}))localStorage.setItem({json.dumps(KEY)},{json.dumps(raw)})')
                        page, traffic, errors, requests = context.new_page(), [], [], []
                        state = {'drift': None}
                        page.on('pageerror', lambda error: errors.append(type(error).__name__))

                        def route_request(route):
                            req = route.request
                            if (not req.url.startswith(base + '/') or 'PRIVATE_APADANA_DRAFT' in req.url
                                    or 'PRIVATE_APADANA_DRAFT' in (req.post_data or '')
                                    or any('PRIVATE_APADANA_DRAFT' in value for value in req.headers.values())):
                                traffic.append('external request or private content')
                                route.abort()
                                return
                            if req.method == 'POST' and req.url.endswith('/mcp'):
                                params = req.post_data_json['params']
                                if params['name'] == 'get_translation':
                                    requests.append(params['arguments'])
                                    if state['drift']:
                                        response = route.fetch()
                                        content = response.json()
                                        candidate = content['result']['structuredContent']
                                        key, value = state['drift']
                                        candidate[key] = value
                                        route.fulfill(response=response, json=content)
                                        return
                            route.continue_()

                        context.route('**/*', route_request)
                        page.on('dialog', lambda dialog: dialog.accept())

                        def audit(label):
                            assert not errors and not traffic, 'Page errors or forbidden traffic'
                            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
                            assert PRIVATE not in page.title()
                            assert page.evaluate('key=>localStorage.getItem(key)', KEY) == raw, 'Durable note changed'
                            if args.a11y:
                                page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                                result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                                scans.append({'width': width, 'theme': theme, 'state': label, 'violations': [v['id'] for v in result['violations']]})

                        def choose(uid):
                            prior = len(requests)
                            read_tool(page, 'English sources').click()
                            card = page.locator('#study .translation-choice').filter(has_text=rows[uid]['reference'])
                            expect(card).to_have_count(1)
                            assert len(requests) == prior, 'English requested before explicit selection'
                            button = card.get_by_role('button').filter(has_text='Read source ·')
                            button.focus()
                            page.keyboard.press('Enter')

                        page.goto(base + '/#saved')
                        page.get_by_label('Your personal note', exact=True).fill(PRIVATE + ' unsaved')
                        for uid in IDS:
                            prior = len(requests)
                            page.goto(base + '/#read?uid=' + uid)
                            read_tool(page, 'English sources').wait_for()
                            assert len(requests) == prior
                            with page.expect_response(lambda r: r.request.method == 'POST' and r.url.endswith('/mcp') and
                                                      r.request.post_data_json['params']['name'] == 'get_translation') as received:
                                choose(uid)
                            response = received.value.json()['result']['structuredContent']
                            check_source(response, uid)
                            assert requests[-1] == {'uid': uid, 'translation': version(uid), 'limit': 6000, 'translation_revision': commit}
                            body = page.locator('#study > .translation')
                            body.wait_for()
                            rendered = body.text_content()
                            assert rendered == response['text'] and digest(rendered) == rows[uid]['body_sha256']
                            notices = page.locator('#study > .notice').all_text_contents()
                            assert all(any(note in notice for notice in notices) for note in rows[uid]['mapping_notes']), 'Edition differences must remain visible outside poem wording'
                            if uid in ('thi-ap7', 'thi-ap9'):
                                head = rendered.split('\n', 1)[0]
                                assert head.startswith(f"[{rows[uid]['poem']}. ") and head.endswith(']') and '.diacritics' not in head
                                assert rows[uid]['title'] in head
                            evidence = page.locator('#study .provenance')
                            assert all(value in evidence.text_content() for value in (commit, response['license'], response['attribution'], response['changes']))
                            assert set(evidence.locator('a').evaluate_all('links=>links.map(link=>link.href)')) == {rows[uid]['url'], CANONICAL_LICENSE}
                            notes = page.get_by_role('region', name='Translator’s notes', exact=True)
                            assert notes.locator('li').count() == rows[uid]['note_count']
                            assert [item.get_attribute('value') for item in notes.locator('li').all()] == [str(i + 1) for i in range(rows[uid]['note_count'])]
                            preface = page.get_by_role('heading', name='Publisher preface · editorial, not poem text', exact=True)
                            assert preface.count() == (1 if uid == IDS[0] else 0)
                            if uid == IDS[0]:
                                assert preface.locator('..').locator('p').text_content() == response['publisher_paratext']
                            assert page.get_by_role('button', name='Next English page →', exact=True).count() == 0
                            audit(uid + ' pinned whole source')
                            receipts.append({'uid': uid, 'width': width, 'theme': theme, 'characters': len(rendered),
                                             'note_count': rows[uid]['note_count'], **{key: rows[uid][key] for key in PINS}})
                        uid = IDS[0]
                        page.goto(base + '/#read?uid=' + uid)
                        for mode in [('translation_revision', '0' * 40), ('url', rows[uid]['url'] + '?drift=1'),
                                     ('body_sha256', '0' * 64), ('translator_notes', [])]:
                            state['drift'] = mode
                            choose(uid)
                            expect(page.get_by_role('button', name='Retry selected source', exact=True)).to_be_visible()
                            expect(page.locator('#study .translation')).to_have_count(0)
                            audit('refused ' + mode[0])
                        state['drift'] = None
                        page.goto(base + '/#saved')
                        expect(page.get_by_label('Your personal note', exact=True)).to_have_value(PRIVATE + ' unsaved')
                        page.reload()
                        expect(page.get_by_label('Your personal note', exact=True)).to_have_value(PRIVATE + ' unsaved')
                        audit('private draft survives reload without provider leakage')
                        checks.append({'width': width, 'theme': theme, 'check': 'Seven explicit pinned reads; finite source links; four drift refusals; private draft preserved'})
                        context.close()
                browser.close()
        events = [json.loads(line) for line in ledger.read_text().splitlines()]
        assert {event['url'] for event in events if event['ok']} == set(files) and all(event['ok'] for event in events)
        report = {'passed': len(checks), 'checks': checks, 'sources': receipts, 'publisher_revision': commit,
                  'outside_source_tree': bool(args.server_dir), 'browser_mode': 'not run' if args.mcp_only else 'chromium', 'pinned_provider_reads': len(events), 'upstream_provider_requests': 0,
                  'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
                  'limits': 'Actual MCP and, in browser mode, Chromium with pinned official bytes injected only at provider transport. No live publisher availability, new rights or scholarly approval, physical-device or human accessibility certification. Reports contain no publisher bodies, notes or private drafts.'}
        rendered = json.dumps(report, indent=2)
        if args.report:
            args.report.write_text(rendered + '\n')
        print(rendered)
        assert report['a11y']['violations'] == 0
    finally:
        server.terminate()
        server.wait(timeout=10)
