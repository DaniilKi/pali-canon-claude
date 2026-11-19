#!/usr/bin/env python3
"""Offline actual-reader regression for three exact Theragāthā boundary repairs; metadata-only reports."""
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

ROOT = Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE_MARKER = 'PRIVATE_THAG_SIXTEEN'
PRIVATE = PRIVATE_MARKER + '_ā😀'
BASELINE_COMMIT = 'a8c6e47175d5a771c7c85cf30ea2e777c31044a4'
SOURCE_COMMIT = '2d134ff9ef60f70a1eb03c9370580228811a3070'
INDEX_REVISION = 'thag16-3-5-v1'
SOURCE_BOOK_SHA256 = 'b0b90484c28900df58af24661aa54dd482186e0d61cff04da9f420dbb713c4c1'
SOURCE_BLOCKS_SHA256 = '5a9e85d495a03f840bfe7dfa85bb8a4b8a1b31ec31c24b4cd2c1827a780b559f'
# Full old sequences are pinned to the independent a8c6e471 consumer snapshot. No wording is bundled here.
UNITS = {'thag16.3': {'before_unit': {'id': 'thag16.3',
                              'book': 34,
                              'start': 2973,
                              'end': 3045,
                              'title': 'Telakānittheragāthā',
                              'collection': 'thag',
                              'acronym': 'Thag 16.3',
                              'vri': '747–769',
                              'pts': {'volume': 0, 'page': 73, 'end_page': 75}},
              'after_unit': {'id': 'thag16.3',
                             'book': 34,
                             'start': 2973,
                             'end': 3041,
                             'title': 'Telakānittheragāthā',
                             'collection': 'thag',
                             'acronym': 'Thag 16.3',
                             'vri': '747–768',
                             'pts': {'volume': 0, 'page': 73, 'end_page': 75},
                             'index_revision': 'thag16-3-5-v1'},
              'old_count': 26,
              'new_count': 24,
              'old_segments_json_sha256': 'a17d17481f3142b47d75012766c9e0b479bc9679091e1a6ab92cb573e639762b',
              'new_segments_json_sha256': '3ef9f5336d49e8d0e91d67e3741fd23278ac78470976b551bcecf2a955e14493',
              'vanished_old_refs': ['thag16.3/25', 'thag16.3/26'],
              'old_source_revision': '2d134ff9ef60f70a1eb03c9370580228811a3070'},
 'thag16.4': {'before_unit': {'id': 'thag16.4',
                              'book': 34,
                              'start': 3045,
                              'end': 3122,
                              'title': 'Raṭṭhapālattheragāthā',
                              'collection': 'thag',
                              'acronym': 'Thag 16.4',
                              'vri': '770–794',
                              'pts': {'volume': 0, 'page': 75, 'end_page': 77}},
              'after_unit': {'id': 'thag16.4',
                             'book': 34,
                             'start': 3041,
                             'end': 3118,
                             'title': 'Raṭṭhapālattheragāthā',
                             'collection': 'thag',
                             'acronym': 'Thag 16.4',
                             'vri': '769–793',
                             'pts': {'volume': 0, 'page': 75, 'end_page': 77},
                             'index_revision': 'thag16-3-5-v1'},
              'old_count': 27,
              'new_count': 27,
              'old_segments_json_sha256': '6cd83936bb3c093fc1f2821e50305e8969826c77e5dcdac8a7ae328d7f839d2b',
              'new_segments_json_sha256': '553ac0e7a098bf534a115e04623dff0a1afdc1123fb16aa29f7ef1598e8f6f7e',
              'vanished_old_refs': [],
              'old_source_revision': '2d134ff9ef60f70a1eb03c9370580228811a3070'},
 'thag16.5': {'before_unit': {'id': 'thag16.5',
                              'book': 34,
                              'start': 3122,
                              'end': 3204,
                              'title': 'Mālukyaputtattheragāthā',
                              'collection': 'thag',
                              'acronym': 'Thag 16.5',
                              'vri': '795–817',
                              'pts': {'volume': 0, 'page': 77, 'end_page': 78}},
              'after_unit': {'id': 'thag16.5',
                             'book': 34,
                             'start': 3118,
                             'end': 3204,
                             'title': 'Mālukyaputtattheragāthā',
                             'collection': 'thag',
                             'acronym': 'Thag 16.5',
                             'vri': '794–817',
                             'pts': {'volume': 0, 'page': 77, 'end_page': 78},
                             'index_revision': 'thag16-3-5-v1'},
              'old_count': 24,
              'new_count': 26,
              'old_segments_json_sha256': 'a45c475ab1dfaf0459ac358e60aa988c5d3600a40a510ee91a3161a8b130d594',
              'new_segments_json_sha256': '4f04b414920f042463e3a0dfa145e81a3bd7ee86b25309bf24d59643f84ef548',
              'vanished_old_refs': [],
              'old_source_revision': '2d134ff9ef60f70a1eb03c9370580228811a3070'}}


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


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


def reconstructed(server_dir):
    # Use the unchanged source renderer against the actual target package's verified raw book.
    # Its captured output stays in memory; reports contain hashes/counts, never these Pāli sequences.
    code = '''
import {gunzipSync} from 'node:zlib';
import {readBundled,sha256} from %s;
import {segmentsFromCorpus} from %s;
const corpus=JSON.parse(gunzipSync(readBundled(process.argv[1]+'/data/canon.json.gz')));
const contracts=JSON.parse(process.argv[2]), book=corpus.books[34], result={
  source_commit:corpus.source.commit,
  book_sha256:sha256(Buffer.from(JSON.stringify(book))),
  blocks_sha256:sha256(Buffer.from(JSON.stringify(book.blocks))),units:{}};
for(const [uid,contract]of Object.entries(contracts)){
  const current=corpus.units.find(unit=>unit.id===uid);
  if(!current)throw Error('Missing literal repaired unit');
  result.units[uid]={actual:current,
    old:segmentsFromCorpus(contract.before_unit,corpus,{includeSourcePositions:true}),
    current:segmentsFromCorpus(contract.after_unit,corpus,{includeSourcePositions:true})};
}
process.stdout.write(JSON.stringify(result));
''' % (json.dumps((ROOT / 'src/bundled-data.mjs').as_uri()), json.dumps((ROOT / 'src/canon.mjs').as_uri()))
    result = subprocess.run(['node', '--input-type=module', '-e', code, str(server_dir), compact(UNITS)],
                            cwd=ROOT, capture_output=True, text=True, check=True)
    value = json.loads(result.stdout)
    assert value['source_commit'] == SOURCE_COMMIT
    assert value['book_sha256'] == SOURCE_BOOK_SHA256 and value['blocks_sha256'] == SOURCE_BLOCKS_SHA256
    for uid, contract in UNITS.items():
        row = value['units'][uid]
        assert row['actual'] == contract['after_unit'], uid + ': repaired unit metadata drift'
        assert len(row['old']) == contract['old_count'] and len(row['current']) == contract['new_count']
        assert digest(compact(row['old'])) == contract['old_segments_json_sha256'], uid + ': authentic old consumer sequence drift'
        assert digest(compact(row['current'])) == contract['new_segments_json_sha256'], uid + ': independently checked current sequence drift'
    return value['units']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--server-dir', type=Path, help='Server directory from an isolated extracted package')
    parser.add_argument('--report', type=Path)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--a11y', action='store_true', help='Test-only CSP bypass for axe injection')
    mode.add_argument('--mcp-only', action='store_true')
    args = parser.parse_args()
    server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
    source = reconstructed(server_dir)
    current_revision = SOURCE_COMMIT + '-' + INDEX_REVISION
    checks, scans, receipts = [], [], []
    with TemporaryDirectory(prefix='pali-thag-sixteen-') as work:
        stage = Path(work)
        ledger, preload = stage / 'fetches.jsonl', stage / 'no-network.cjs'
        preload.write_text("const fs=require('node:fs');globalThis.fetch=async input=>{fs.appendFileSync("
                           + json.dumps(str(ledger)) + ",JSON.stringify({unexpected_provider_request:true})+'\\n');throw Error('Provider requests forbidden in offline Thag regression');};")
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        base = f'http://127.0.0.1:{port}'
        server = subprocess.Popen(['node', '--require', str(preload), str(server_dir / 'http.cjs')], cwd=stage,
                                  env={**os.environ, 'HOST': '127.0.0.1', 'PORT': str(port), 'RATE_LIMIT_PER_MINUTE': '0'},
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        def tool(name, arguments):
            body = compact({'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
                            'params': {'name': name, 'arguments': arguments}}).encode()
            request = urllib.request.Request(base + '/mcp', data=body,
                                             headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
            with urllib.request.urlopen(request, timeout=90) as response:
                result = json.load(response)['result']
            assert not result.get('isError'), name + ': unexpected MCP error'
            return result['structuredContent']

        try:
            for _ in range(100):
                try:
                    urllib.request.urlopen(base + '/healthz', timeout=1).close()
                    break
                except OSError:
                    time.sleep(.1)
            else:
                raise AssertionError('Actual packaged HTTP bundle did not start')
            metadata = {}
            for uid, contract in UNITS.items():
                data = tool('get_text', {'uid': uid, 'limit': 200})
                assert data['source']['commit'] == SOURCE_COMMIT and data['source']['locator_revision'] == current_revision
                assert data['total_segments'] == contract['new_count']
                # Public get_text omits internal block coordinates; the full reconstruction pins above retain them.
                expected_public = [{key: value for key, value in segment.items() if key != 'source_blocks'}
                                   for segment in source[uid]['current']]
                assert data['segments'] == expected_public, uid + ': actual MCP differs from independent current sequence'
                metadata[uid] = data
                receipts.append({'uid': uid, 'old_bounds': [contract['before_unit']['start'], contract['before_unit']['end']],
                                 'current_bounds': [contract['after_unit']['start'], contract['after_unit']['end']],
                                 'old_count': contract['old_count'], 'current_count': contract['new_count'],
                                 'old_segments_sha256': contract['old_segments_json_sha256'],
                                 'current_segments_sha256': contract['new_segments_json_sha256']})
            assert not ledger.exists(), 'Canonical metadata retrieved a provider'
            checks.append({'check': 'Actual MCP returns all77 current segments with the new mapping pin; original77 old segments match independent baseline hashes; unchanged raw book/blocks pinned'})
            if not args.mcp_only:
                with sync_playwright() as pw:
                    browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
                    for width in (390, 1280):
                        for theme in ('light', 'dark'):
                            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                            old = []
                            for uid, contract in UNITS.items():
                                for offset in (0, contract['old_count'] - 1):
                                    ref = source[uid]['old'][offset]['ref']
                                    old.append({'uid': uid, 'title': 'Authentic original ' + ref, 'ref': ref, 'offset': offset,
                                                'source_commit': contract['old_source_revision'], 'note': PRIVATE + ' saved ' + ref})
                            assert len(old) == 6
                            raw = compact({'theme': theme, 'remember_position': False, 'saved': old, 'reading_progress': []})
                            context.add_init_script(f'if(!localStorage.getItem({json.dumps(KEY)}))localStorage.setItem({json.dumps(KEY)},{json.dumps(raw)})')
                            page, errors, forbidden, calls = context.new_page(), [], [], []
                            page.set_default_timeout(15000)
                            page.on('pageerror', lambda error: errors.append(type(error).__name__))
                            page.on('dialog', lambda dialog: dialog.accept())

                            def intercept(route):
                                request = route.request
                                if (not request.url.startswith(base + '/') or PRIVATE_MARKER in request.url
                                        or PRIVATE_MARKER in (request.post_data or '')
                                        or any(PRIVATE_MARKER in value for value in request.headers.values())):
                                    forbidden.append('external request or private data')
                                    route.abort()
                                    return
                                if request.method == 'POST' and request.url.endswith('/mcp'):
                                    command = request.post_data_json['params']
                                    calls.append(command['name'])
                                    assert not command.get('arguments', {}).get('translation'), 'Unexpected English selection'
                                route.continue_()

                            context.route('**/*', intercept)

                            def audit(label):
                                assert not errors and not forbidden, 'Page error or forbidden/private request'
                                assert not ledger.exists() and 'get_translation' not in calls
                                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Horizontal overflow'
                                assert PRIVATE_MARKER not in page.title()
                                assert profile(page)['saved'][:6] == old, 'Original saved values/source revisions changed'
                                if args.a11y:
                                    page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                                    result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                                    scans.append({'width': width, 'theme': theme, 'state': label,
                                                  'violations': [item['id'] for item in result['violations']]})

                            saved(page, base)
                            page.get_by_label('Your personal note', exact=True).first.fill(PRIVATE + ' unsaved')
                            for item in old:
                                saved(page, base)
                                bookmark_link(page, item).focus()
                                page.keyboard.press('Enter')
                                page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                                assert page.locator('.passage').count() == 0, 'Stale saved mapping displayed replacement words'
                                assert 'source or citation mapping revision changed' in page.locator('#view').inner_text()
                                assert PRIVATE_MARKER not in page.locator('#view').inner_text()
                                audit('old source refused ' + item['ref'])
                                page.get_by_role('heading', name='No passage was substituted.', exact=True).evaluate(
                                    "node=>node.dataset.thagPriorRefusal='yes'")
                                review = page.get_by_role('link', name='Review current source at this reference', exact=True)
                                assert 'source=' not in review.get_attribute('href')
                                review.focus()
                                page.keyboard.press('Enter')
                                expect(page.locator('[data-thag-prior-refusal]')).to_have_count(0)
                                loaded(page)
                                target = next((s for s in source[item['uid']]['current'] if s['ref'] == item['ref']), None)
                                if target is None:
                                    page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                                    assert page.locator('.passage').count() == 0
                                    audit('vanished current reference refuses ' + item['ref'])
                                else:
                                    passage = page.locator('section[aria-label="Pāli passage"] .passage').first
                                    passage.wait_for()
                                    loaded(page)
                                    assert page.locator('.segment-label a').first.inner_text() == item['ref']
                                    assert digest(passage.inner_text()) == digest(target['text']), 'Explicit review displays another segment'
                                    assert 'source=' not in page.url
                                    audit('explicit current review ' + item['ref'])
                            for uid in UNITS:
                                fresh_targets = [source[uid]['current'][0], source[uid]['current'][-1]]
                                for target in fresh_targets:
                                    ref = target['ref']
                                    page.goto(base + '/#read?uid=' + uid + '&offset=' + str(int(ref.rsplit('/', 1)[1]) - 1) + '&page_source=' + current_revision)
                                    passage = page.locator('section[aria-label="Pāli passage"] .passage').first
                                    passage.wait_for()
                                    loaded(page)
                                    assert page.locator('.segment-label a').first.inner_text() == ref
                                    assert digest(passage.inner_text()) == digest(target['text'])
                                    audit('fresh current first/last ' + ref)
                            saved(page, base)
                            expect(page.get_by_label('Your personal note', exact=True).first).to_have_value(PRIVATE + ' unsaved')
                            page.reload()
                            expect(page.get_by_label('Your personal note', exact=True).first).to_have_value(PRIVATE + ' unsaved')
                            with page.expect_download() as download:
                                page.get_by_role('button', name='Export bookmarks and notes', exact=True).click()
                            exported = json.loads(Path(download.value.path()).read_text())
                            assert exported['saved'] == [{**old[0], 'note': PRIVATE + ' unsaved'}, *old[1:]]
                            assert profile(page)['saved'] == old
                            audit('draft recovery/export retain all original saved source bases')
                            page.goto(base + '/#read?uid=thag16.4')
                            segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
                            segment.wait_for()
                            segment.get_by_role('button', name='Save passage thag16.4/2', exact=True).click()
                            fresh = profile(page)['saved'][-1]
                            assert fresh['ref'] == 'thag16.4/2' and fresh['offset'] == 1
                            assert fresh['source_commit'] == current_revision
                            saved(page, base)
                            bookmark_link(page, fresh).focus()
                            page.keyboard.press('Enter')
                            passage = page.locator('section[aria-label="Pāli passage"] .passage').first
                            passage.wait_for()
                            loaded(page)
                            assert digest(passage.inner_text()) == digest(source['thag16.4']['current'][1]['text'])
                            audit('fresh saved bookmark roundtrip keeps the current mapping')
                            checks.append({'width': width, 'theme': theme,
                                           'check': 'Six authentic old first/last bookmarks refuse before words; explicit current review/vanished target; six fresh current first/last reads; private draft reload/export and fresh saved mapping roundtrip'})
                            context.close()
                    browser.close()
            assert not ledger.exists(), 'Unexpected provider activity'
            report = {'passed': len(checks), 'checks': checks, 'units': receipts,
                      'baseline_commit': BASELINE_COMMIT, 'source_commit': SOURCE_COMMIT,
                      'current_locator_revision': current_revision, 'source_book_sha256': SOURCE_BOOK_SHA256,
                      'source_blocks_sha256': SOURCE_BLOCKS_SHA256,
                      'authentic_old_segments': sum(row['old_count'] for row in UNITS.values()),
                      'current_segments': sum(row['new_count'] for row in UNITS.values()),
                      'outside_source_tree': bool(args.server_dir), 'upstream_provider_requests': 0,
                      'browser_mode': 'not run' if args.mcp_only else 'chromium',
                      'csp_bypass': 'test-only axe contexts' if args.a11y else 'none',
                      'a11y': {'scans': len(scans), 'violations': sum(len(scan['violations']) for scan in scans), 'results': scans},
                      'limits': 'Actual packaged MCP and emulated Chromium at 390/1280 in both themes. Independent original consumer hashes and unchanged VRI source blocks bind reconstruction; no source wording or private values in reports. No English/provider retrieval, source/rights approval, physical-device or human assistive acceptance.'}
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
