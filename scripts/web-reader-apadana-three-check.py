#!/usr/bin/env python3
"""Actual MCP/browser checks for the three reviewed Apadāna additions; pinned local bytes only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import socket
import subprocess
from tempfile import TemporaryDirectory
import time
import urllib.parse
import urllib.request

from playwright.sync_api import expect, sync_playwright
from web_reader_test_helpers import read_tool

ROOT = Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_APADANA_THREE_ā😀'
PRIVATE_MARKER = 'PRIVATE_APADANA_THREE'
NEW_IDS = ('thi-ap4', 'thi-ap5', 'thi-ap10')
BASELINE = {
    'thi-ap1': '638d3e4b302e259cb18c2f2164373c0ddaa0073fb07a1d2a5457607ef287b7b2',
    'thi-ap2': '1bed49287d4dc1089c273475fdd7ed1c714d10d6f9bf844a07b27897724c944b',
    'thi-ap3': 'e7fe6e215b9f123c001a93b2e488f2c2a8f2022699f6169029a0a3effc907ce7',
    'thi-ap6': '7748af5daa3e4d149fc8f9ea8d0d1be6dc0f0f5e93b90577aab9a42c7786a2b8',
    'thi-ap7': '58cdffbb119abd6b8c1226ddfe08d0487514d13a1ad332cd894f06ef539c400d',
    'thi-ap8': '2074f7d98be420ab240540c03cd1303c883f2eea4658cdc450b1dd0fe6361c5b',
    'thi-ap9': 'e92139ffd441fc1ec7f22478cb1967e26e86f4c7809f5e011f13e5603a3e5d40',
}
PINS = ('raw_sha256', 'body_sha256', 'notes_sha256', 'paratext_sha256', 'root_sha256')
LICENSE_URL = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
SUMMARY = {
    'kind': 'canonical_chapter_summary', 'label': 'First Therī Apadāna chapter summary',
    'parent_id': 'thi-ap10', 'first_ref': 'thi-ap10/19', 'last_ref': 'thi-ap10/22',
    'root_start': 6930, 'root_end': 6936,
    'root_sha256': '37490df4056522cb2cf00a3e3372fa3730dd2f49979c95b021bf6ee6e76a3057',
    'body_sha256': '652008e55afc3343b94eb3a5042a8ad9874b4904aedd13126555e84798abc0dd',
    'notes_sha256': '7e43cbed8c710d9a0458f2e6d8919f3f79afc983a37c0b36dd4e4626777cafc5',
    'note_numbers': [8],
}
# Independent held-source receipt, reviewed before activation; not derived from runtime output.
EXPECTED = {
    'thi-ap4': {
        'raw_sha256': 'c059f6361fa2b6f98e599baa84721e615c63f5052a60e0b11d304b89a7c4bc5f',
        'body_sha256': 'ae1326cf8ebab5a14db40b108dc40085e2691a6d63ac7c48b2c8ae6340a69e19',
        'notes_sha256': 'bc9e1cbe2bb2972a044360e44587c12a089131da087e70897207fa7dbb671bdb',
        'root_sha256': '21bf7bb0a2998c44df1b93c5fa421397060d441a063d9df15674904acf7f4ff8',
        'labels': ['31', '32', '33', '34', '35', '36'], 'notes': [1]},
    'thi-ap5': {
        'raw_sha256': '8f91f8c76988b7367fbbdf60245983dfc156f315095e11c26dfd1c33f5f46288',
        'body_sha256': 'ba73861917517774a6b76506bf54bdcd94d0abe989c5fa51b33ea3e6309c30f5',
        'notes_sha256': 'd1d133a8e25163d7ca2d883c77dcd1a5040ce34b936d45c5531c3c0040b25108',
        'root_sha256': 'bc87b06e6c4713fe575053f88a8c7efe1a4bac017e6b830dfd371b14eeffcbaf',
        'labels': ['37', '38', '39-40', '40', '42', '41', '43', '44', '45'], 'notes': list(range(1, 8))},
    'thi-ap10': {
        'raw_sha256': '2696db2cc5d8cc1271c611864e5f3a687e97af7208e80472a4dbdfbc257a6af3',
        'body_sha256': '11892ab91ea2091ba9568089a417abf764129a20d4393d3fbc7036b82919f47f',
        'notes_sha256': 'b44ff0d544bca0de72278f0cf4e8fbcacd466cdd5d17bfc1b8a2a4fe9351b0dd',
        'root_sha256': 'd2b542bdf76f31f4a5c46d56ae2d43e8c612d46902bb6d9725e034ec2e4229ce',
        'labels': [str(n) for n in range(116, 131)], 'notes': list(range(1, 8))},
}


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def compact(value, sort=False):
    return json.dumps(value, ensure_ascii=False, sort_keys=sort, separators=(',', ':'))


def profile(page):
    return page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)


def loaded(page):
    page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')


def saved(page, base):
    page.goto(base + '/#saved')
    page.get_by_role('heading', name='Saved passages', exact=True).wait_for()
    loaded(page)


def bookmark_link(page, item):
    return page.get_by_role('region', name='Saved passage results').get_by_role(
        'link', name=item['title'] + ' · ' + item['ref'], exact=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', required=True, type=Path,
                        help='Official Git checkout at the exact manifest publisher revision')
    parser.add_argument('--server-dir', type=Path, help='Server directory from an extracted npm package')
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--a11y', action='store_true', help='Labelled test-only CSP bypass for axe injection')
    modes.add_argument('--mcp-only', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
    manifest = json.loads((server_dir / 'data/apadana.json').read_text())
    assert manifest == json.loads((ROOT / 'server/data/apadana.json').read_text()), 'Package metadata differs'
    rows, commit = manifest['links'], manifest['source']['commit']
    assert set(rows) == {'thi-ap' + str(n) for n in range(1, 41)}, 'Unexpected activated source scope'
    for uid, expected in BASELINE.items():
        assert digest(compact(rows[uid], sort=True)) == expected, uid + ': previous metadata changed'
    for uid in NEW_IDS:
        for key in ('raw_sha256', 'body_sha256', 'notes_sha256', 'root_sha256'):
            assert rows[uid][key] == EXPECTED[uid][key], uid + ': source receipt differs: ' + key
        assert rows[uid]['note_count'] == len(EXPECTED[uid]['notes'])
    assert rows['thi-ap10']['chapter_summary'] == SUMMARY
    assert all('chapter_summary' not in row for uid, row in rows.items() if uid in set(BASELINE) | set(NEW_IDS) and uid != 'thi-ap10')
    checkout = args.source_root.resolve()
    assert subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip() == commit
    for artifact in manifest['source']['rights_artifacts']:
        assert hashlib.sha256((checkout / artifact['path']).read_bytes()).hexdigest() == artifact['sha256']
    files = {}
    for row in rows.values():
        relative = row['raw_url'].split(commit + '/', 1)[1]
        local = (checkout / relative).resolve()
        assert local.is_relative_to(checkout), 'Source path escaped official checkout'
        assert hashlib.sha256(local.read_bytes()).hexdigest() == row['raw_sha256']
        files[row['raw_url']] = str(local)

    def version(uid):
        return 'ap:' + rows[uid]['path'].removeprefix('/text/').rstrip('/')

    with TemporaryDirectory(prefix='pali-apadana-three-') as work:
        stage, checks, scans, receipts = Path(work), [], [], []
        ledger, preload = stage / 'fetches.jsonl', stage / 'provider.cjs'
        preload.write_text(
            "const fs=require('node:fs'),files=" + json.dumps(files)
            + ";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);"
            + "const ok=Object.hasOwn(files,url);fs.appendFileSync(" + json.dumps(str(ledger))
            + ",JSON.stringify({url,ok})+'\\n');if(!ok)throw Error('Unexpected provider request');"
            + "return new Response(fs.readFileSync(files[url]),{status:200,headers:{'content-type':'text/plain'}});};")
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        server = subprocess.Popen(['node', '--require', str(preload), str(server_dir / 'http.cjs')], cwd=stage,
                                  env={**os.environ, 'HOST': '127.0.0.1', 'PORT': str(port), 'RATE_LIMIT_PER_MINUTE': '0'},
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        def rpc(name, arguments):
            body = json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
                               'params': {'name': name, 'arguments': arguments}}).encode()
            req = urllib.request.Request(base + '/mcp', data=body,
                                         headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
            with urllib.request.urlopen(req, timeout=90) as response:
                return json.load(response)['result']

        def tool(name, arguments):
            result = rpc(name, arguments)
            assert not result.get('isError'), name + ': unexpected MCP error'
            return result['structuredContent']

        def check_source(data, uid):
            row = rows[uid]
            assert data['text_id'] == uid and data['translation_id'] == version(uid)
            assert data['translation_revision'] == commit and data['url'] == row['url']
            assert data['fetched_url'] == row['raw_url']
            assert 'translation_scope' not in data and data.get('whole_unit_coverage') is not False
            assert data['license'] == 'CC BY-NC-SA 4.0' and data['license_url'] == LICENSE_URL
            assert 'Walters' in data['attribution'] and 'Whitman College' in data['attribution'] and data['changes']
            assert all(data[key] == row[key] for key in PINS)
            assert data['mapping_notes'] == row['mapping_notes'] and row['mapping_notes']
            assert all(note in data['notes'] for note in row['mapping_notes'])
            assert [note['number'] for note in data['translator_notes']] == EXPECTED[uid]['notes']
            assert digest(compact(data['translator_notes'])) == row['notes_sha256']
            assert data['publisher_paratext'] == '' and digest('') == row['paratext_sha256']
            if uid == 'thi-ap10':
                summary = data['chapter_summary']
                assert set(summary) == set(SUMMARY) | {'text', 'translator_notes'}
                assert all(summary[key] == value for key, value in SUMMARY.items())
                assert digest(summary['text']) == SUMMARY['body_sha256']
                assert [note['number'] for note in summary['translator_notes']] == [8]
                assert digest(compact(summary['translator_notes'])) == SUMMARY['notes_sha256']
                assert '[Note 8]' not in data['text'] and '[Note 8]' in summary['text']
            else:
                assert 'chapter_summary' not in data

        def check_whole(data, uid):
            check_source(data, uid)
            assert data['continue_with'] is None and digest(data['text']) == rows[uid]['body_sha256']
            labels = re.findall(r'\((\d+)\)\s*\[([\d-]+)\](?:\[Note \d+\])*$', data['text'], re.M)
            assert labels == [(str(i + 1), label) for i, label in enumerate(EXPECTED[uid]['labels'])]
            assert len(data['text'].split('\n\n')) == len(labels) + 3

        try:
            for _ in range(100):
                try:
                    urllib.request.urlopen(base + '/healthz', timeout=1).close()
                    break
                except OSError:
                    time.sleep(.1)
            else:
                raise AssertionError('Actual packaged HTTP bundle did not start')
            metadata = {uid: tool('get_text', {'uid': uid, 'limit': 200}) for uid in rows if uid in set(BASELINE) | set(NEW_IDS)}
            assert not ledger.exists(), 'Metadata automatically retrieved English'
            for uid, meta in metadata.items():
                assert len(meta['english_available']) == 1
                choice = meta['english_available'][0]
                assert choice['translation_id'] == version(uid) and choice['translation_revision'] == commit
                assert choice['license'] == 'CC BY-NC-SA 4.0' and choice['url'] == rows[uid]['url']
                if uid == 'thi-ap10':
                    assert choice['chapter_summary'] == SUMMARY
                else:
                    assert 'chapter_summary' not in choice
                if uid in ('thi-ap4', 'thi-ap5'):
                    assert meta['source']['locator_revision'] == manifest['vri_commit'] + '-apadana-theri45-v1'
                elif uid in BASELINE:
                    assert 'locator_revision' not in meta['source']
            assert digest(metadata['thi-ap5']['segments'][0]['text']) == '27c23679d743e8b8ace2f93630d5715002c3d400ae259322b2819ce70f6da876'
            assert digest(metadata['thi-ap5']['segments'][1]['text']) == 'c7c7e15de09e69b63ed8aae7a3ee8e57b44a5c338fbf64d602dbe8cb119aa4f7'
            assert len(metadata['thi-ap4']['segments']) == 9
            assert [s['ref'] for s in metadata['thi-ap10']['segments'][18:22]] == ['thi-ap10/' + str(n) for n in range(19, 23)]
            for uid in NEW_IDS:
                foreign = next(candidate for candidate in NEW_IDS if candidate != uid)
                for request in ({'uid': uid, 'translation': version(foreign)},
                                {'uid': uid, 'translation': version(uid), 'translation_revision': '0' * 40},
                                {'uid': uid, 'translation': version(uid), 'offset': 1, 'prefix_sha256': '0' * 64}):
                    assert rpc('get_translation', request).get('isError'), 'Unsafe owner/revision request accepted'
            assert not ledger.exists(), 'Invalid source identity fetched publisher bytes'
            checks.append({'check': 'All ten choices explicit; previous seven metadata frozen; paired roots move exact existing wording; foreign owners and stale revisions refuse before fetch'})
            whole = {}
            for uid in NEW_IDS:
                request = {'uid': uid, 'translation': version(uid), 'translation_revision': commit, 'limit': 500}
                pieces = []
                while request:
                    data = tool('get_translation', request)
                    check_source(data, uid)
                    prefix = ''.join(pieces)
                    assert data['offset'] == len(prefix) and len(pieces) < 30
                    pieces.append(data['text'])
                    continuation = data['continue_with']
                    request = continuation['arguments'] if continuation else None
                    if request:
                        assert request['uid'] == uid and request['translation'] == version(uid)
                        assert request['translation_revision'] == commit and request['offset'] == data['next_offset']
                        assert request['prefix_sha256'] == digest(''.join(pieces))
                        assert rpc('get_translation', {**request, 'prefix_sha256': '0' * 64}).get('isError')
                        assert rpc('get_translation', {**request, 'translation_revision': '0' * 40}).get('isError')
                assert len(pieces) > 1 and digest(''.join(pieces)) == rows[uid]['body_sha256']
                whole[uid] = tool('get_translation', {'uid': uid, 'translation': version(uid), 'translation_revision': commit, 'limit': 6000})
                check_whole(whole[uid], uid)
                checks.append({'check': uid + ': complete pinned poem and separately owned notes; finite 500-character continuation', 'pages': len(pieces)})
                receipts.append({'uid': uid, 'transport': 'mcp', 'characters': len(whole[uid]['text']),
                                 'stanzas': len(EXPECTED[uid]['labels']), 'note_count': len(EXPECTED[uid]['notes']),
                                 **{key: rows[uid][key] for key in PINS}})
            result10 = whole['thi-ap10']
            positive = result10['text'].split('\n\n')[1].split('\n')[0]
            for label, text, found in (
                    ('poem stanza', positive, True),
                    ('canonical chapter summary', result10['chapter_summary']['text'].split('\n\n')[1], False),
                    ('summary-only note 8', result10['chapter_summary']['translator_notes'][0]['text'], False)):
                result = tool('verify_quote', {'text': text, 'language': 'english', 'texts': ['thi-ap10'],
                                               'translation_ids': [version('thi-ap10')]})
                assert (result['verdict'] != 'not_found_in_scope') == found, label + ': quotation owner differs'
                assert result['scope']['translations_checked'][0]['translation_revision'] == commit
            checks.append({'check': 'Only substantive poem wording verifies as poem quotation; chapter summary and its note 8 do not'})
            if not args.mcp_only:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                    for width in (390, 1280):
                        for theme in ('light', 'dark'):
                            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                            old = [{'uid': uid, 'title': 'Authentic pre-repair ' + ref, 'ref': ref, 'offset': offset,
                                    'source_commit': manifest['vri_commit'], 'note': PRIVATE + ' saved ' + ref}
                                   for uid, ref, offset in [('thi-ap4', 'thi-ap4/1', 0), ('thi-ap4', 'thi-ap4/10', 9), ('thi-ap5', 'thi-ap5/1', 0)]]
                            raw = compact({'theme': theme, 'remember_position': False, 'saved': old, 'reading_progress': []})
                            context.add_init_script(f'if(!localStorage.getItem({json.dumps(KEY)}))localStorage.setItem({json.dumps(KEY)},{json.dumps(raw)})')
                            page, errors, forbidden, requests = context.new_page(), [], [], []
                            page.set_default_timeout(15000)
                            state = {'drift': None}
                            page.on('pageerror', lambda error: errors.append(type(error).__name__))

                            def intercept(route):
                                req = route.request
                                if (not req.url.startswith(base + '/') or PRIVATE_MARKER in req.url or PRIVATE_MARKER in (req.post_data or '')
                                        or any(PRIVATE_MARKER in value for value in req.headers.values())):
                                    forbidden.append('external request or private data')
                                    route.abort()
                                    return
                                if req.method == 'POST' and req.url.endswith('/mcp'):
                                    command = req.post_data_json['params']
                                    if command['name'] == 'get_translation':
                                        requests.append(command['arguments'])
                                        if state['drift']:
                                            response = route.fetch()
                                            content = response.json()
                                            content['result']['structuredContent'].update(state['drift'])
                                            route.fulfill(response=response, json=content)
                                            return
                                route.continue_()

                            context.route('**/*', intercept)
                            page.on('dialog', lambda dialog: dialog.accept())

                            def audit(label):
                                assert not errors and not forbidden, 'Page error or forbidden/private traffic'
                                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
                                assert PRIVATE_MARKER not in page.title()
                                assert profile(page)['saved'][:len(old)] == old, 'Original saved notes or source pins changed'
                                if args.a11y:
                                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                                    result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                                    scans.append({'width': width, 'theme': theme, 'state': label,
                                                  'violations': [item['id'] for item in result['violations']]})

                            def choose(uid):
                                prior = len(requests)
                                read_tool(page, 'English sources').click()
                                card = page.locator('#study .translation-choice').filter(has_text=rows[uid]['reference'])
                                expect(card).to_have_count(1)
                                assert len(requests) == prior, 'English fetched without explicit selection'
                                card.get_by_role('button').filter(has_text='Read source ·').focus()
                                page.keyboard.press('Enter')

                            saved(page, base)
                            page.get_by_label('Your personal note', exact=True).first.fill(PRIVATE + ' unsaved')
                            for uid in NEW_IDS:
                                prior = len(requests)
                                page.goto(base + '/#read?uid=' + uid)
                                read_tool(page, 'English sources').wait_for()
                                assert len(requests) == prior
                                with page.expect_response(lambda response: response.request.method == 'POST' and response.url.endswith('/mcp')
                                                          and response.request.post_data_json['params']['name'] == 'get_translation') as received:
                                    choose(uid)
                                data = received.value.json()['result']['structuredContent']
                                check_whole(data, uid)
                                body = page.locator('#study > .translation')
                                body.wait_for()
                                assert digest(body.text_content()) == rows[uid]['body_sha256']
                                assert requests[-1] == {'uid': uid, 'translation': version(uid), 'limit': 6000, 'translation_revision': commit}
                                notices = page.locator('#study > .notice').all_text_contents()
                                assert all(any(note in notice for notice in notices) for note in rows[uid]['mapping_notes'])
                                provenance = page.locator('#study > .provenance')
                                assert all(value in provenance.text_content() for value in (commit, data['license'], data['attribution'], data['changes']))
                                assert set(provenance.locator('a').evaluate_all('links=>links.map(link=>link.href)')) == {rows[uid]['url'], LICENSE_URL}
                                notes = page.get_by_role('region', name='Translator’s notes', exact=True)
                                assert [item.get_attribute('value') for item in notes.locator('li').all()] == [str(n) for n in EXPECTED[uid]['notes']]
                                assert page.get_by_role('heading', name='Publisher preface · editorial, not poem text', exact=True).count() == 0
                                summary = page.get_by_role('region', name='Canonical chapter summary · not poem text', exact=True)
                                if uid == 'thi-ap10':
                                    expect(summary).to_have_count(1)
                                    summary.get_by_role('heading', name='Canonical chapter summary · not poem text', exact=True).wait_for()
                                    assert digest(summary.locator('.translation').text_content()) == SUMMARY['body_sha256']
                                    summary.get_by_role('heading', name='Chapter summary notes · editorial, not poem notes', exact=True).wait_for()
                                    assert [item.get_attribute('value') for item in summary.locator('li').all()] == ['8']
                                    assert digest(compact([{'number': 8, 'text': summary.locator('li p').text_content()}])) == SUMMARY['notes_sha256']
                                    assert '[Note 8]' not in body.text_content()
                                else:
                                    expect(summary).to_have_count(0)
                                assert page.get_by_role('button', name='Next English page →', exact=True).count() == 0
                                audit(uid + ': explicit source and owned material')
                            uid = 'thi-ap10'
                            for label, patch in (
                                    ('revision', {'translation_revision': '0' * 40}),
                                    ('owner', {'text_id': 'thi-ap9'}),
                                    ('raw source', {'raw_sha256': '0' * 64}),
                                    ('terms', {'license': 'CC BY 4.0'}),
                                    ('poem-note ownership', {'translator_notes': result10['translator_notes'] + result10['chapter_summary']['translator_notes']}),
                                    ('missing summary', {'chapter_summary': None}),
                                    ('summary owner', {'chapter_summary': {**result10['chapter_summary'], 'parent_id': 'thi-ap9'}}),
                                    ('summary root', {'chapter_summary': {**result10['chapter_summary'], 'root_sha256': '0' * 64}}),
                                    ('summary note ownership', {'chapter_summary': {**result10['chapter_summary'], 'translator_notes': []}})):
                                page.goto(base + '/#read?uid=' + uid)
                                state['drift'] = patch
                                choose(uid)
                                expect(page.get_by_role('button', name='Retry selected source', exact=True)).to_be_visible()
                                expect(page.locator('#study .translation')).to_have_count(0)
                                expect(page.get_by_role('region', name='Canonical chapter summary · not poem text', exact=True)).to_have_count(0)
                                audit('refused ' + label)
                            state['drift'] = None
                            for item in old:
                                saved(page, base)
                                bookmark_link(page, item).focus()
                                page.keyboard.press('Enter')
                                page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                                assert page.locator('.passage').count() == 0
                                assert 'source or citation mapping revision changed' in page.locator('#view').inner_text()
                                assert PRIVATE_MARKER not in page.locator('#view').inner_text()
                                audit('authentic pre-repair refusal ' + item['ref'])
                                review = page.get_by_role('link', name='Review current source at this reference', exact=True)
                                review.focus()
                                page.keyboard.press('Enter')
                                if item['ref'] == 'thi-ap4/10':
                                    page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                                    assert page.locator('.passage').count() == 0
                                else:
                                    page.locator('.passage').first.wait_for()
                                    loaded(page)
                                    assert page.locator('.segment-label a').first.inner_text() == item['ref']
                                    assert 'source=' not in page.url
                                audit('explicit current review ' + item['ref'])
                            saved(page, base)
                            expect(page.get_by_label('Your personal note', exact=True).first).to_have_value(PRIVATE + ' unsaved')
                            page.reload()
                            expect(page.get_by_label('Your personal note', exact=True).first).to_have_value(PRIVATE + ' unsaved')
                            with page.expect_download() as download:
                                page.get_by_role('button', name='Export bookmarks and notes', exact=True).click()
                            exported = json.loads(Path(download.value.path()).read_text())
                            assert exported['saved'] == [{**old[0], 'note': PRIVATE + ' unsaved'}, *old[1:]]
                            assert profile(page)['saved'] == old
                            audit('draft recovery and export retain original saved versions')
                            page.goto(base + '/#read?uid=thi-ap5')
                            segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                            segment.wait_for()
                            segment.get_by_role('button', name='Save passage thi-ap5/2', exact=True).click()
                            fresh = profile(page)['saved'][-1]
                            assert fresh['ref'] == 'thi-ap5/2' and fresh['offset'] == 1
                            assert fresh['source_commit'] == manifest['vri_commit'] + '-apadana-theri45-v1'
                            saved(page, base)
                            bookmark_link(page, fresh).focus()
                            page.keyboard.press('Enter')
                            page.locator('.passage').first.wait_for()
                            loaded(page)
                            assert page.locator('.segment-label a').first.inner_text() == fresh['ref']
                            assert digest(page.locator('section[aria-label="Pāli passage"] .passage').first.inner_text()) == 'c7c7e15de09e69b63ed8aae7a3ee8e57b44a5c338fbf64d602dbe8cb119aa4f7'
                            audit('fresh paired-source bookmark keeps exact transferred verse and mapping revision')
                            checks.append({'width': width, 'theme': theme, 'check': 'Three explicit pinned reads; separated canonical summary and note8; nine drift refusals; authentic old locator refusals/current review; local-only drafts/export and fresh mapping-pin roundtrip'})
                            context.close()
                    browser.close()
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(event['ok'] for event in events)
            assert {event['url'] for event in events} == {rows[uid]['raw_url'] for uid in NEW_IDS}
            report = {'passed': len(checks), 'checks': checks, 'sources': receipts, 'publisher_revision': commit,
                      'previous_metadata_baseline': '1df48b8', 'previous_metadata_preserved': len(BASELINE),
                      'chapter_summary': SUMMARY,
                      'outside_source_tree': bool(args.server_dir), 'browser_mode': 'not run' if args.mcp_only else 'chromium',
                      'csp_bypass': 'test-only axe contexts' if args.a11y else 'none',
                      'pinned_provider_reads': len(events), 'upstream_provider_requests': 0,
                      'a11y': {'scans': len(scans), 'violations': sum(len(scan['violations']) for scan in scans), 'results': scans},
                      'limits': 'Actual packaged MCP and emulated Chromium viewports with exact official local publisher bytes at provider transport. No live publisher availability, new rights or specialist approval, physical-device or human assistive acceptance. Reports contain metadata/hashes only, no publisher bodies, translator notes or private drafts.'}
            rendered = json.dumps(report, indent=2)
            if args.report:
                args.report.parent.mkdir(parents=True, exist_ok=True)
                args.report.write_text(rendered + '\n')
            print(rendered)
            assert report['a11y']['violations'] == 0
        finally:
            server.terminate()
            server.wait(timeout=10)


if __name__ == '__main__':
    main()
