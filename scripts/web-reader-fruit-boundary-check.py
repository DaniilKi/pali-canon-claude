"""Fixed 389/390 installed-reader journeys; synthetic private local data only.

Run after exact runtime/source inventory review. Viewports are emulation, not
physical devices or human accessibility acceptance. No external text fetches.
"""
import argparse, hashlib, json, os, pathlib, socket, subprocess, sys, time
import urllib.request
from playwright.sync_api import sync_playwright, expect

OLD = '2d134ff9ef60f70a1eb03c9370580228811a3070'
NEW = OLD + '-apadana-thera389-390-v1'
KEY = 'pali-library-v1'
PRIVATE_MARKER = 'SYNTHETIC_PRIVATE_FRUIT_BOUNDARY'
PRIVATE = PRIVATE_MARKER + '_ā'

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--source-root', type=pathlib.Path, required=True)
    ap.add_argument('--installed-root', type=pathlib.Path, required=True)
    ap.add_argument('--report', type=pathlib.Path, required=True)
    args = ap.parse_args()
    root, installed = args.source_root.resolve(), args.installed_root.resolve()
    assert root != installed and not installed.is_relative_to(root)
    sys.path.insert(0, str(root / 'scripts'))
    from web_reader_approved_acceptance import assert_runtime
    from web_reader_test_helpers import read_tool
    assert_runtime(root, installed / 'server')
    # These literal source-derived crosswalk hashes are frozen in the existing
    # independently reviewed six-case pair regression, never from SUT output.
    raw_test = (root / 'tests/apadana-thera389390-boundary.test.mjs').read_text()
    crosswalk = json.loads(raw_test.split('const crosswalk=', 1)[1].split('];', 1)[0] + ']')
    expected = {row['new_ref']: row['text_sha256'] for row in crosswalk}
    assert len(crosswalk) == len(expected) == 18
    checks = []
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    env = {**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}
    server = subprocess.Popen(['node', 'server/http.cjs'], cwd=installed, env=env,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        deadline = time.monotonic() + 15
        while True:
            try:
                with urllib.request.urlopen(base + '/healthz', timeout=1) as response:
                    assert response.status == 200
                break
            except OSError:
                assert time.monotonic() < deadline and server.poll() is None, 'Installed server startup failed'
                time.sleep(.1)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
            for width in (390, 1280):
                for theme in ('light', 'dark'):
                    context = browser.new_context(viewport={'width': width, 'height': 900})
                    old = [{'uid': uid, 'title': 'Synthetic old ' + ref, 'ref': ref, 'offset': offset,
                            'source_commit': OLD, 'note': PRIVATE + ' ' + ref}
                           for uid, ref, offset in [('tha-ap389', 'tha-ap389/1', 0),
                                                   ('tha-ap389', 'tha-ap389/10', 9),
                                                   ('tha-ap390', 'tha-ap390/1', 0)]]
                    old.append({'uid': 'tha-ap390', 'title': 'Synthetic unversioned',
                                'ref': 'tha-ap390/9', 'note': PRIVATE + ' unversioned'})
                    seed = {'theme': theme, 'remember_position': False, 'saved': old, 'reading_progress': []}
                    raw = json.dumps(seed, ensure_ascii=False, separators=(',', ':'))
                    context.add_init_script('if(!localStorage.getItem(' + json.dumps(KEY) + '))localStorage.setItem(' + json.dumps(KEY) + ',' + json.dumps(raw) + ')')
                    page = context.new_page(); page.set_default_timeout(15000)
                    errors, forbidden = [], []
                    page.on('pageerror', lambda e: errors.append(type(e).__name__))
                    def intercept(route):
                        req = route.request
                        if not req.url.startswith(base + '/') or PRIVATE_MARKER in req.url or PRIVATE_MARKER in (req.post_data or '') or any(PRIVATE_MARKER in v for v in req.headers.values()):
                            forbidden.append('external request or private data'); route.abort()
                        else: route.continue_()
                    page.route('**/*', intercept)
                    def saved():
                        page.goto(base + '/#saved')
                        page.get_by_role('heading', name='Saved passages', exact=True).wait_for()
                        page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
                    for item in old:
                        saved()
                        link = page.get_by_role('region', name='Saved passage results').get_by_role('link', name=item['title'] + ' · ' + item['ref'], exact=True)
                        link.focus(); page.keyboard.press('Enter')
                        page.get_by_role('heading', name='No passage was substituted.', exact=True).wait_for()
                        assert page.locator('.passage').count() == 0
                        notice = page.locator('#view').inner_text()
                        expected_notice = 'source or citation mapping revision changed' if 'source_commit' in item else 'unversioned numeric position is ambiguous'
                        assert expected_notice in notice
                        assert PRIVATE not in page.locator('#view').inner_text()
                        assert page.evaluate('key=>localStorage.getItem(key)', KEY) == raw
                    # Both roots load actual new source positions and save the exact new pin.
                    for uid in ('tha-ap389', 'tha-ap390'):
                        page.goto(base + '/#read?uid=' + uid)
                        segments = page.locator('section[aria-label="Pāli passage"] .segment')
                        expect(segments).to_have_count(9)
                        segment = segments.nth(1)
                        assert hashlib.sha256(segment.locator('.passage').inner_text().encode()).hexdigest() == expected[uid + '/2']
                        segment.get_by_role('button', name='Save passage ' + uid + '/2', exact=True).click()
                        profile = page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)
                        fresh = next(x for x in profile['saved'] if x['ref'] == uid + '/2' and x.get('source_commit') == NEW)
                        assert fresh['offset'] == 1
                        assert profile['saved'][:4] == old
                        saved(); page.get_by_role('region', name='Saved passage results').get_by_role('link', name=fresh['title'] + ' · ' + fresh['ref'], exact=True).click()
                        expect(page.locator('.segment-label a').first).to_have_text(uid + '/2')
                        assert hashlib.sha256(page.locator('.passage').first.inner_text().encode()).hexdigest() == expected[uid + '/2']
                        page.reload()
                        expect(page.locator('.segment-label a').first).to_have_text(uid + '/2')
                        assert hashlib.sha256(page.locator('.passage').first.inner_text().encode()).hexdigest() == expected[uid + '/2']
                    saved()
                    with page.expect_download() as download:
                        page.get_by_role('button', name='Export bookmarks and notes', exact=True).click()
                    exported = json.loads(pathlib.Path(download.value.path()).read_text())
                    profile = page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)
                    assert exported['saved'] == profile['saved'] and exported['saved'][:4] == old
                    assert not errors and not forbidden and PRIVATE not in page.title()
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    checks.append({'width': width, 'theme': theme, 'stale_or_unversioned_refusals': 4,
                                   'fresh_pinned_save_reload_routes': 2, 'export_preserved': True,
                                   'external_or_private_requests': 0, 'page_errors': 0})
                    context.close()
            browser.close()
        args.report.write_text(json.dumps({'schema': 'installed389390-browser-v1', 'passed': len(checks),
            'checks': checks, 'locator_revision': NEW, 'emulation_only': True,
            'human_accessibility_physical_device_signed_host': False}, indent=2) + '\n')
    finally:
        server.terminate()
        try: server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill(); server.wait(timeout=5)

if __name__ == '__main__': main()
