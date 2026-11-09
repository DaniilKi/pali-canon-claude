#!/usr/bin/env python3
"""Bundled comparison UI acceptance with explicitly synthetic, intercepted English.

Pāli, the four MN 10 choices and scoped-source declarations are actual bundled
MCP results. English bodies and notices below are test fixtures, never publisher
wording, current licence verification or evidence of live source availability.
"""
import argparse
import copy
import hashlib
import json
import os
import pathlib
import socket
import subprocess
import time
import urllib.parse
import urllib.request

from playwright.sync_api import Error, expect, sync_playwright
from web_reader_test_helpers import read_tool

ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report')
parser.add_argument('--a11y', action='store_true')
parser.add_argument('--package-dir', type=pathlib.Path)
parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args()
assert not (args.package_dir and args.server_dir)
server_dir = (args.server_dir.resolve() if args.server_dir else
              args.package_dir.resolve() / 'server' if args.package_dir else ROOT / 'server')
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
checks, scans = [], []
server = subprocess.Popen(
    ['node', str(server_dir / 'http.cjs')],
    cwd='/tmp' if args.package_dir or args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'},
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def tool(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
               'params': {'name': name, 'arguments': arguments}}
    request = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(),
                                    headers={'Content-Type': 'application/json',
                                             'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(request, timeout=30))['result']
    assert not result.get('isError'), result
    return result['structuredContent']


def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def reply(route, data=None, error=None):
    request = route.request.post_data_json
    result = ({'isError': True, 'structuredContent': {'error': error}} if error else
              {'structuredContent': data})
    route.fulfill(status=200, content_type='application/json', body=json.dumps(
        {'jsonrpc': '2.0', 'id': request['id'], 'result': result}))


try:
    for _ in range(100):
        try:
            urllib.request.urlopen(base + '/healthz', timeout=1)
            break
        except Exception:
            time.sleep(.1)
    else:
        raise AssertionError('Bundled server did not become ready')

    pali = tool('get_text', {'uid': 'mn10', 'offset': 0, 'limit': 30, 'script': 'roman'})
    metadata = tool('get_metadata', {'uid': 'mn10'})
    choices = pali['english_available']
    assert len(choices) == 4 and all('translation_scope' not in c for c in choices)
    assert {c['translation_id'] for c in choices} == {c['translation_id'] for c in metadata['english']}
    versions = [c['translation_id'] for c in choices]
    by_id = {c['translation_id']: c for c in choices}
    urls = {c['translation_id']: c['url'] for c in metadata['english']}
    scoped = {uid: tool('get_text', {'uid': uid, 'limit': 30, 'script': 'roman'})
              for uid in ['an8.59', 'mn54']}
    assert all(any(c.get('translation_scope', {}).get('kind') == 'partial_unit'
                   for c in data['english_available']) for data in scoped.values())
    commentary = tool('get_commentary', {'uid': 'mn10', 'offset': 0, 'limit': 20, 'script': 'roman'})

    # ASCII fixtures make these Python offsets exactly the server's UTF-16 offsets.
    # The markup-shaped substring must stay inert text, never an HTML node/request.
    bodies = {}
    for index, version in enumerate(versions):
        lead = (f'SYNTHETIC COMPARISON FIXTURE {index + 1}: {version}. '
                'Not scripture or publisher wording. '
                '<img src="https://comparison.invalid/leak" onerror="window.fixtureExecuted=true"> ')
        bodies[version] = (lead + ('Inert test wording for an independently paginated source. ' * 120))[:6400]
    notices = {version: 'SYNTHETIC COMPLETE LICENCE FIXTURE for ' + version +
               '. This notice applies only to artificial test wording; it grants no rights to publisher content. '
               'Keep this entire fixture notice with the fixture. END OF SYNTHETIC NOTICE.'
               for version in versions}
    attributions = {version: 'SYNTHETIC TEST ATTRIBUTION: metadata names ' + by_id[version]['translator'] +
                    '; this artificial response is not their translation. END OF SYNTHETIC ATTRIBUTION.'
                    for version in versions}

    def fixture(request, version=None):
        version = version or request['translation']
        choice = by_id[version]
        offset, limit = request.get('offset', 0), request['limit']
        body = bodies[version]
        assert limit >= 500
        if offset:
            assert request['prefix_sha256'] == digest(body[:offset]), request
        next_offset = offset + limit if offset + limit < len(body) else None
        continuation = None if next_offset is None else {
            'name': 'get_translation', 'arguments': {
                'uid': 'mn10', 'translation': version, 'offset': next_offset,
                'limit': limit, 'prefix_sha256': digest(body[:next_offset])}}
        return {'text_id': 'mn10', 'citation': pali['citation'],
                'translator': choice['translator'], 'translation_id': version,
                'source': choice['source'], 'url': urls[version],
                'text': body[offset:offset + limit], 'offset': offset, 'limit': limit,
                'total_characters': len(body), 'next_offset': next_offset,
                'prefix_sha256': digest(body[:offset]), 'continue_with': continuation,
                'attribution': attributions[version], 'license': notices[version],
                'notes': ['Explicit synthetic provider-response fixture; no live publisher request or freshness claim.'],
                'match': choice['match']}

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280]
                             for t in (['light', 'dark'] if args.a11y else ['light'])]:
            context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
            seed = {'theme': theme, 'font': 30, 'remember_position': False, 'saved': []}
            context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," +
                                    json.dumps(json.dumps(seed)) + ");window.comparisonStorageWrites=[];" +
                                    "for(const method of ['setItem','removeItem','clear']){const original=Storage.prototype[method];" +
                                    "Storage.prototype[method]=function(...args){window.comparisonStorageWrites.push([method,...args]);return original.apply(this,args)}}")
            page = context.new_page()
            page.set_default_timeout(30000)
            calls, errors, external, held, unexpected = [], [], [], [], []
            mode = {'kind': 'normal', 'target': versions[1], 'remaining': 0}
            page.on('pageerror', lambda error: errors.append(str(error)))

            def intercept(route):
                request = route.request
                if not request.url.startswith(base + '/'):
                    external.append(request.url)
                    route.abort()
                    return
                if request.method != 'POST' or not request.url.endswith('/mcp'):
                    route.continue_()
                    return
                payload = request.post_data_json
                params = payload.get('params', {})
                name, arguments = params.get('name'), params.get('arguments', {})
                if payload.get('method') == 'tools/call':
                    calls.append(copy.deepcopy(params))
                if name == 'get_translation':
                    assert arguments['uid'] == 'mn10' and arguments['translation'] in versions, arguments
                    assert set(arguments) <= {'uid', 'translation', 'offset', 'limit', 'prefix_sha256'}, arguments
                    target = arguments['translation'] == mode['target']
                    if mode['kind'] == 'hold' and target:
                        held.append((route, copy.deepcopy(arguments)))
                        return
                    if mode['kind'] == 'failure' and target and mode['remaining']:
                        mode['remaining'] -= 1
                        reply(route, error='Synthetic comparison provider failure; other selected source remains available.')
                        return
                    data = fixture(arguments)
                    if target and mode['kind'] == 'fallback':
                        data = fixture(arguments, versions[0])
                    elif target and mode['kind'] == 'scoped':
                        data['translation_scope'] = copy.deepcopy(next(
                            c['translation_scope'] for c in scoped['mn54']['english_available'] if 'translation_scope' in c))
                        data['whole_unit_coverage'] = False
                    elif target and mode['kind'] == 'unsafe':
                        assert data['continue_with'] is not None
                        data['continue_with']['arguments']['uid'] = 'mn11'
                    reply(route, data)
                elif name == 'compare_translations' or name in {'get_access_to_insight_text', 'lookup_pali'} or (name == 'get_text' and 'translation' in arguments):
                    unexpected.append(params)
                    reply(route, error='Unexpected provider access blocked by the comparison harness.')
                else:
                    route.continue_()

            context.route('**/*', intercept)

            def passed(name):
                checks.append({'width': width, 'theme': theme, 'check': name})
                print(f'{width}px {theme}: {name}', flush=True)

            def english_calls():
                return [c['arguments'] for c in calls if c['name'] == 'get_translation']

            def panel(version):
                return page.get_by_role('article', name='English comparison source · ' + version, exact=True)

            def audit(state):
                overflow = page.evaluate("""()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,
                    elements:[...document.querySelectorAll('#view *')].filter(x=>x.getBoundingClientRect().right>innerWidth+1||x.scrollWidth>x.clientWidth+1)
                    .slice(0,8).map(x=>({tag:x.tagName,classes:x.className,right:x.getBoundingClientRect().right,
                    clientWidth:x.clientWidth,scrollWidth:x.scrollWidth,overflowWrap:getComputedStyle(x).overflowWrap}))})""")
                assert overflow['width'] <= overflow['viewport'], f'{width}px {theme} {state} overflow: {overflow}'
                assert not external, external
                assert not unexpected, unexpected
                assert page.evaluate('window.fixtureExecuted') is None
                expect(page.locator('#study img')).to_have_count(0)
                if not args.a11y:
                    return
                page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                data = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width': width, 'theme': theme, 'state': state,
                              'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in data['violations']],
                              'manual_review_rules': [v['id'] for v in data['incomplete']]})

            def read_ready(uid='mn10', data=None):
                data = data or pali
                expect(page).to_have_url(base + '/#read?uid=' + uid)
                expect(page.locator('#view > h2')).to_have_text(data['citation'] + ' · ' + data['title'])
                expect(page.locator('.segment .passage')).to_have_text([s['text'] for s in data['segments']])
                expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)

            def picker():
                back = page.get_by_role('button', name='Choose English sources', exact=True)
                if back.count():
                    back.click()
                else:
                    read_tool(page, 'English sources').click()
                expect(page.get_by_role('heading', name='English sources', exact=True)).to_be_visible()
                boxes = page.get_by_role('checkbox', name='Compare · ', exact=False)
                expect(boxes).to_have_count(4)
                for box in boxes.all():
                    expect(box).not_to_be_checked()
                return boxes

            def choose(selected):
                boxes = picker()
                for version in selected:
                    box = page.get_by_role(
                        'checkbox', name='Compare · ' + ' · '.join([by_id[version]['translator'], by_id[version]['source'],
                                                                  by_id[version]['reference'], version]), exact=True)
                    box.check()
                compare = page.get_by_role('button', name='Compare selected sources', exact=True)
                expect(compare).to_be_enabled()
                compare.click()
                expect(page.locator('.comparison-grid > .comparison-panel')).to_have_count(len(selected))

            def loaded(version, offset=0):
                item = panel(version)
                expected = fixture({'translation': version, 'offset': offset, 'limit': 6000,
                                    **({'prefix_sha256': digest(bodies[version][:offset])} if offset else {})})
                expect(item.locator('.translation')).to_have_text(expected['text'])
                expect(item).to_have_attribute('aria-busy', 'false')
                expect(item.get_by_text('Source version: ' + version, exact=True)).to_be_visible()
                expect(item.get_by_text(attributions[version], exact=True)).to_be_visible()
                expect(item.get_by_text(notices[version], exact=True)).to_be_visible()
                for text in [by_id[version]['translator'], by_id[version]['source'], by_id[version]['reference']]:
                    assert text in item.inner_text()
                return item

            def settled_error(version):
                item = panel(version)
                expect(item.get_by_role('button', name='Retry this source page', exact=True)).to_be_visible()
                expect(item).to_have_attribute('aria-busy', 'false')
                expect(item.locator('.translation')).to_have_count(0)
                return item

            def transient():
                expect(page).to_have_url(base + '/#read?uid=mn10')
                assert page.evaluate('Object.fromEntries(Object.entries(localStorage))') == {'pali-library-v1': json.dumps(seed)}
                assert page.evaluate('Object.fromEntries(Object.entries(sessionStorage))') == {}
                assert page.evaluate('window.comparisonStorageWrites') == []
                assert 'SYNTHETIC' not in page.title()

            def release_held(error=None):
                while held:
                    route, request = held.pop(0)
                    try:
                        reply(route, fixture(request) if error is None else None, error=error)
                    except Error as route_error:
                        # A real AbortController cancellation may close the intercepted fetch.
                        if not any(x in str(route_error).lower() for x in ['closed', 'invalid interception', 'cancel']):
                            raise
                # Flush renderer microtasks after the fulfilled/cancelled response,
                # rather than accepting the still-mounted newer heading immediately.
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')

            page.goto(base + '/#read?uid=mn10')
            read_ready()
            boxes = picker()
            compare = page.get_by_role('button', name='Compare selected sources', exact=True)
            expect(compare).to_be_disabled()
            boxes.nth(0).check()
            expect(compare).to_be_disabled()
            boxes.nth(1).check()
            expect(compare).to_be_enabled()
            assert not english_calls()
            transient()
            audit('two unchecked-by-default choices selected without retrieval')
            passed('actual MN10 four ordinary choices start unchecked; zero/one disabled, two enabled; selection retrieves no English')
            compare.focus()
            page.keyboard.press('Enter')
            first, second = loaded(versions[0]), loaded(versions[1])
            assert sorted(english_calls(), key=lambda request: request['translation']) == sorted(
                [{'uid': 'mn10', 'translation': version, 'limit': 6000} for version in versions[:2]],
                key=lambda request: request['translation'])
            caution = page.locator('#study').inner_text().lower()
            assert 'publisher' in caution and ('not aligned' in caution or 'no alignment' in caution or 'not an aligned' in caution)
            assert first.locator('.translation').inner_text() != second.locator('.translation').inner_text()
            transient()
            audit('two independent sources with complete fixture notices')
            passed('explicit keyboard comparison opens distinct exact-ID bodies, full notices and publisher/nonalignment caution')

            before = len(english_calls())
            mode.update(kind='hold', target=versions[0])
            first.get_by_role('button', name='Next English page →', exact=True).click()
            expect(first).to_have_attribute('aria-busy', 'true')
            expect(first.get_by_role('button', name='Next English page →', exact=True)).to_be_disabled()
            peer_next = second.get_by_role('button', name='Next English page →', exact=True)
            expect(peer_next).to_be_enabled()
            peer_next.focus()
            expect(peer_next).to_be_focused()
            assert len(held) == 1
            release_held()
            loaded(versions[0], 6000)
            loaded(versions[1])
            expect(peer_next).to_be_focused()
            mode.update(kind='normal', target=versions[1])
            assert english_calls()[before:] == [fixture({'translation': versions[0], 'limit': 6000})['continue_with']['arguments']]
            expect(first.get_by_role('button', name='Next English page →', exact=True)).to_have_count(0)
            transient()
            passed('one panel Next forwards exact source/offset/limit/prefix while its peer retains its own page, enabled control and user focus')

            choose(versions)
            for version in versions:
                loaded(version)
            audit('four selected sources at largest reading font')
            transient()
            passed('all four actual choices can be compared independently at the upper selection bound')

            choose(versions[:2])
            loaded(versions[0])
            loaded(versions[1])
            mode.update(kind='hold', target=versions[0])
            before = len(english_calls())
            panel(versions[0]).get_by_role('button', name='Next English page →', exact=True).click()
            expect(panel(versions[0])).to_have_attribute('aria-busy', 'true')
            expect(panel(versions[0]).get_by_role('button', name='Next English page →', exact=True)).to_be_disabled()
            peer_next = panel(versions[1]).get_by_role('button', name='Next English page →', exact=True)
            peer_next.focus()
            expect(peer_next).to_be_focused()
            assert len(held) == 1
            release_held(error='Synthetic comparison continuation failure; other source remains available.')
            failed = panel(versions[0])
            expect(failed.get_by_role('button', name='Retry this source page', exact=True)).to_be_visible()
            expect(failed.locator('.translation')).to_have_text(fixture({'translation': versions[0], 'limit': 6000})['text'])
            expect(failed.locator('.comparison-panel-status')).to_contain_text('previously loaded page remains shown')
            expect(peer_next).to_be_focused()
            loaded(versions[1])
            continuation = fixture({'translation': versions[0], 'limit': 6000})['continue_with']['arguments']
            mode.update(kind='normal', target=versions[1])
            failed.get_by_role('button', name='Retry this source page', exact=True).click()
            loaded(versions[0], 6000)
            loaded(versions[1])
            assert english_calls()[before:] == [continuation, continuation]
            passed('failed continuation preserves its previous body and peer focus; Retry forwards the identical exact source/offset/limit/prefix')

            mode.update(kind='failure', target=versions[1], remaining=1)
            choose(versions[:2])
            loaded(versions[0])
            failed = settled_error(versions[1])
            expect(failed).to_contain_text('Synthetic comparison provider failure')
            before = len(english_calls())
            failed.get_by_role('button', name='Retry this source page', exact=True).click()
            loaded(versions[1])
            loaded(versions[0])
            assert english_calls()[before:] == [{'uid': 'mn10', 'translation': versions[1], 'limit': 6000}]
            passed('one provider failure preserves the successful panel and Retry requests only the failed exact source page')

            for kind in ['fallback', 'scoped', 'unsafe']:
                mode.update(kind=kind)
                before = len(english_calls())
                choose(versions[:2])
                loaded(versions[0])
                failed = settled_error(versions[1])
                expect(failed.get_by_role('button', name='Next English page →', exact=True)).to_have_count(0)
                expect(page.locator('.comparison-panel .translation')).to_have_count(1)
                assert len(english_calls()) == before + 2
                mode.update(kind='normal')
                failed.get_by_role('button', name='Retry this source page', exact=True).click()
                loaded(versions[1])
                loaded(versions[0])
                passed(kind + ' response is refused before body/Next display; successful panel survives and explicit retry recovers')
            audit('recovered independent source errors')

            mode.update(kind='hold')
            choose(versions[:2])
            loaded(versions[0])
            stop = page.get_by_role('button', name='Stop waiting for English comparison ' + versions[1], exact=True)
            expect(stop).to_be_visible()
            assert len(held) == 1
            stop.click()
            failed = settled_error(versions[1])
            loaded(versions[0])
            mode.update(kind='normal')
            release_held()
            settled_error(versions[1])
            failed.get_by_role('button', name='Retry this source page', exact=True).click()
            loaded(versions[1])
            transient()
            passed('Stop waiting cancels one source, preserves its peer and permits an explicit retry without late-body substitution')

            mode.update(kind='hold')
            choose(versions[:2])
            loaded(versions[0])
            expect(page.get_by_role('button', name='Stop waiting for English comparison ' + versions[1], exact=True)).to_be_visible()
            read_tool(page, 'Traditional commentary').click()
            expect(page.get_by_role('heading', name='Traditional commentary · not canonical root text', exact=True)).to_be_visible()
            expect(page.locator('#study .passage')).to_have_text([s['text'] for s in commentary.get('segments', [])])
            release_held()
            expect(page.locator('.comparison-grid')).to_have_count(0)
            expect(page.locator('#study .passage')).to_have_text([s['text'] for s in commentary.get('segments', [])])
            transient()
            passed('held comparison response cannot replace a newer real bundled commentary selection')

            choose(versions[:2])
            loaded(versions[0])
            expect(page.get_by_role('button', name='Stop waiting for English comparison ' + versions[1], exact=True)).to_be_visible()
            page.get_by_role('link', name='Library', exact=True).click()
            expect(page).to_have_url(base + '/#browse?node=canon')
            expect(page.get_by_role('heading', name='The Pāli Canon', exact=True)).to_be_visible()
            release_held()
            expect(page.locator('.comparison-grid')).to_have_count(0)
            passed('held comparison response cannot replace newer Library navigation')

            mode.update(kind='normal')
            for uid, data in scoped.items():
                before = len(english_calls())
                page.goto(base + '/#read?uid=' + uid)
                read_ready(uid, data)
                read_tool(page, 'English sources').click()
                expect(page.get_by_role('heading', name='English sources', exact=True)).to_be_visible()
                partials = [c for c in data['english_available'] if c.get('translation_scope', {}).get('kind') == 'partial_unit']
                for choice in partials:
                    card = page.locator('.translation-choice').filter(has=page.get_by_text(choice['translator'], exact=True))
                    # More than one version can share a translator; identify the scoped card by its review action.
                    card = card.filter(has=page.get_by_role('button', name='Review partial-unit source', exact=True))
                    expect(card).to_have_count(1)
                    expect(card.get_by_role('checkbox', name='Compare · ', exact=False)).to_have_count(0)
                    card.get_by_role('button', name='Review partial-unit source', exact=True).click()
                    expect(page.get_by_role('heading', name='Review English source scope', exact=True)).to_be_visible()
                    expect(page.locator('#scope-consent')).not_to_be_checked()
                    expect(page.get_by_role('button', name='Read reviewed partial source', exact=True)).to_be_disabled()
                    assert len(english_calls()) == before
                    break
                passed(uid + ' actual partial source keeps individual unchecked scope review and has no comparison checkbox')

            page.goto(base + '/#read?uid=mn10')
            read_ready()
            picker()
            before = len(english_calls())
            single = page.get_by_role('button', name='Read source · ' + ' · '.join(
                [by_id[versions[0]]['translator'], by_id[versions[0]]['source'], by_id[versions[0]]['reference']]), exact=True)
            single.click()
            expect(page.locator('#study > .translation')).to_have_text(fixture({'translation': versions[0], 'limit': 6000})['text'])
            expect(page.locator('.comparison-grid')).to_have_count(0)
            assert english_calls()[before:] == [{'uid': 'mn10', 'translation': versions[0], 'limit': 6000}]
            transient()
            audit('existing single source flow')
            assert not errors, errors
            assert not external and not unexpected
            passed('existing single-source reader remains available; comparison bodies/selections never enter URL, title or browser storage')
            context.close()
        browser.close()

    result = {'passed': len(checks), 'checks': checks,
              'installed': bool(args.package_dir or args.server_dir),
              'actual_metadata': {'uid': 'mn10', 'translation_ids': versions, 'scoped_controls': list(scoped)},
              'provider_responses': 'explicit synthetic intercepted fixtures; no live publisher retrieval',
              'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
              'limits': 'Actual bundled Pāli, commentary and source metadata; all English bodies, complete notices, errors, fallbacks and continuations are synthetic contract fixtures. No live publisher wording, freshness, source approval, rights verification, physical-device or human screen-reader certification. Font 30px throughout; reading-position saving disabled to isolate comparison storage behavior.'}
    text = json.dumps(result, indent=2)
    print(text)
    if args.report:
        pathlib.Path(args.report).write_text(text + '\n', encoding='utf-8')
    if result['a11y']['violations']:
        raise SystemExit(1)
finally:
    server.terminate()
    try:
        server.wait(timeout=10)
    except subprocess.TimeoutExpired:
        server.kill()
        server.wait()
