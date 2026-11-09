#!/usr/bin/env python3
"""Local study-backup journeys with actual bundled identities and synthetic private data.

Source locations and ordinary plan signatures are actual MCP results. Archived
plan capacity, byte limits, held file/catalogue reads, unsafe locators and storage
failures are explicit fixtures. No publisher English is fetched or reconstructed.
"""
import argparse
import copy
import json
import os
import pathlib
import re
import socket
import subprocess
import time
import urllib.parse
import urllib.request

from playwright.sync_api import Error, expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
FORMAT = 'pali-library-study-backup-v1'
PRIVATE = 'PRIVATE_STUDY_BACKUP_'
MIB = 1024 * 1024
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report')
parser.add_argument('--a11y', action='store_true')
parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'
checks, scans = [], []
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')],
                          cwd='/tmp' if args.server_dir else ROOT,
                          env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'},
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def tool(name, arguments):
    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    request = urllib.request.Request(base + '/mcp', data=json.dumps(payload).encode(),
                                    headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(request, timeout=30))['result']
    assert not result.get('isError'), result
    return result['structuredContent']


def revision(data):
    source = data['source']
    return source['locator_revision'] if 'locator_revision' in source else source['commit']


def source_mark(data, uid):
    index, segment = next((i, s) for i, s in enumerate(data['segments']) if s['type'] != 'heading')
    return {'uid': uid, 'ref': segment['ref'],
            'title': data.get('title') or data.get('book', {}).get('title') or data.get('citation') or data['book_id'],
            'offset': data['offset'] + index, 'source_commit': revision(data),
            'note': PRIVATE + 'synthetic note for ' + uid}


def locator(context, mark):
    return '#read?' + urllib.parse.urlencode({**context, 'offset': mark['offset'], 'ref': mark['ref'], 'source': mark['source_commit']})


def signature(day):
    return compact({'name': day['name'], 'day': day['day'], 'source': day['source']['pali']['commit'],
                    'readings': [{'id': r['id'], 'offset': r['get_text'].get('offset', 0),
                                  'limit': r['get_text'].get('limit'), 'part': r.get('part'), 'of': r.get('of')}
                                 for r in day['readings']]})


def backup(saved=None, progress=None, resume=None):
    return {'format': FORMAT, 'saved': copy.deepcopy(saved or []), 'progress': copy.deepcopy(progress or []), 'resume': resume}


def identity(item):
    return item['uid'], item['ref']


def find_record(items, wanted):
    found = [item for item in items if identity(item) == identity(wanted)]
    assert len(found) == 1, found
    return found[0]


def profile(page):
    return page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)


def stored(page):
    return page.evaluate('key=>localStorage.getItem(key)', KEY)


def reply(route, data=None, error=None):
    payload = route.request.post_data_json
    result = {'isError': True, 'structuredContent': {'error': error}} if error else {'structuredContent': data}
    route.fulfill(status=200, content_type='application/json', body=json.dumps({'jsonrpc': '2.0', 'id': payload['id'], 'result': result}))


try:
    for _ in range(100):
        try:
            urllib.request.urlopen(base + '/healthz', timeout=1)
            break
        except Exception:
            time.sleep(.1)
    else:
        raise AssertionError('Bundled server did not become ready')

    books = tool('browse_canon', {'node': 'books', 'limit': 60})
    book_id = books['items'][0]['read_with']['book']
    comments = tool('get_commentary', {'uid': 'commentary', 'limit': 40})
    commentary_id = comments['books'][0]['uid']
    posts = tool('get_post_canonical', {'limit': 40})
    post_id = posts['items'][0]['id']
    mn = source_mark(tool('get_text', {'uid': 'mn10', 'offset': 0, 'limit': 30}), 'mn10')
    dhp = source_mark(tool('get_text', {'uid': 'dhp183', 'offset': 0, 'limit': 30}), 'dhp183')
    book = source_mark(tool('get_text', {'book': book_id, 'offset': 0, 'limit': 30}), 'book:' + book_id)
    commentary = source_mark(tool('get_commentary', {'uid': commentary_id, 'offset': 0, 'limit': 30}), commentary_id)
    post = source_mark(tool('get_post_canonical', {'citation': post_id, 'offset': 0, 'limit': 30}), 'post:' + post_id)
    incoming_resume = locator({'uid': 'mn10'}, mn)
    local_resume = locator({'uid': 'dhp183'}, dhp)
    peer_resume = locator({'book': book_id}, book)
    catalog = tool('reading_plan', {})
    plan = next(p for p in catalog['plans'] if p['days'] >= 4)
    marks = []
    for n in [1, 2, 3, 4]:
        actual = tool('reading_plan', {'name': plan['name'], 'day': n})
        marks.append({'name': actual['name'], 'day': actual['day'], 'signature': signature(actual)})
    capacity = []
    offset = 0
    while len(capacity) < 500:
        data = tool('get_text', {'book': book_id, 'offset': offset, 'limit': 200})
        capacity.extend({'uid': 'book:' + book_id, 'ref': s['ref'], 'title': data['title'], 'note': '',
                         'offset': offset + i, 'source_commit': revision(data)} for i, s in enumerate(data['segments']))
        assert data['next_offset'] is not None or len(capacity) >= 500
        offset = data['next_offset']
    capacity = capacity[:500]

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        expect.set_options(timeout=30000)
        cases = [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]
        for width, theme in cases:
            def passed(name):
                checks.append({'width': width, 'theme': theme, 'check': name})
                print(f'{width}px {theme}: {name}', flush=True)

            def environment(saved=None, progress=None, resume=local_resume, remember=True):
                initial = {'theme': theme, 'font': 30, 'remember_position': remember, 'saved': copy.deepcopy(saved or []),
                           'reading_progress': copy.deepcopy(progress or [])}
                if resume is not None:
                    initial['last'] = resume
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(json.dumps(initial)) + ");" +
                    "window.backupDenyWrites=false;window.backupWrites=[];const backupSet=Storage.prototype.setItem;" +
                    "Storage.prototype.setItem=function(key,value){if(key==='pali-library-v1'){window.backupWrites.push(value);if(window.backupDenyWrites)throw Error('Controlled backup quota denial')}return backupSet.call(this,key,value)};" +
                    "window.backupReadCount=0;window.backupHoldNextFile=false;window.backupHeldFiles=[];window.backupHeldCatalogueCount=0;const backupText=File.prototype.text;" +
                    "File.prototype.text=function(){window.backupReadCount++;const result=backupText.call(this);if(!window.backupHoldNextFile)return result;window.backupHoldNextFile=false;return new Promise(resolve=>window.backupHeldFiles.push(()=>result.then(resolve)))};")
                state = {'mode': 'offline', 'calls': [], 'held': [], 'forbidden': [], 'errors': []}

                def intercept(route):
                    request = route.request
                    if PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or ''):
                        state['forbidden'].append('Private backup data in request')
                        route.abort()
                    elif not request.url.startswith(base + '/'):
                        state['forbidden'].append(request.url)
                        route.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        payload = request.post_data_json
                        state['calls'].append(copy.deepcopy(payload))
                        params = payload.get('params', {})
                        if params != {'name': 'reading_plan', 'arguments': {}} or state['mode'] == 'offline':
                            state['forbidden'].append(params)
                            reply(route, error='Unexpected request blocked by local-backup harness')
                        elif state['mode'] == 'hold':
                            state['held'].append(route)
                            request.frame.evaluate('window.backupHeldCatalogueCount++')
                        elif state['mode'] == 'failure':
                            reply(route, error='Controlled current reading-plan catalogue failure')
                        else:
                            route.continue_()
                    else:
                        route.continue_()

                context.route('**/*', intercept)

                def new_page():
                    page = context.new_page()
                    page.set_default_timeout(30000)
                    page.on('pageerror', lambda error: state['errors'].append(str(error)))
                    return page

                return context, new_page, state, initial

            def privacy(page, state):
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert not state['forbidden'] and not state['errors'], state
                assert page.evaluate('window.backupFixtureExecuted') is None
                expect(page.locator('#view img, #view script')).to_have_count(0)

            def audit(page, state, stage):
                privacy(page, state)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{width}px {theme}: {stage} overflow'
                if not args.a11y:
                    return
                page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                data = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width': width, 'theme': theme, 'state': stage,
                              'violations': [{'id': x['id'], 'targets': [n['target'] for n in x['nodes']]} for x in data['violations']],
                              'manual_review_rules': [x['id'] for x in data['incomplete']]})

            def ready(page):
                expect(page).to_have_url(base + '/#backup')
                expect(page.get_by_role('heading', name='Study backup', exact=True)).to_be_visible()
                expect(page.get_by_label('Restore study backup from JSON', exact=True)).to_be_visible()
                expect(page.get_by_role('button', name='Download study backup', exact=True)).to_be_visible()

            def open_backup(page):
                page.goto(base + '/#backup')
                ready(page)

            def open_saved(page):
                page.goto(base + '/#saved')
                expect(page).to_have_url(base + '/#saved')
                expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()

            def saved_item(page, mark):
                return page.get_by_role('region', name='Saved passage results', exact=True).locator('article').filter(
                    has=page.get_by_text(mark['title'] + ' · ' + mark['ref'], exact=True))

            def draft(page, mark, value):
                page.get_by_label('Search saved passages and notes', exact=True).fill(mark['ref'])
                field = saved_item(page, mark).get_by_label('Your personal note', exact=True)
                expect(field).to_be_visible()
                field.fill(value)
                return field

            def download(page, recovery=False):
                scope = page.locator('#storage-recovery') if recovery else page.locator('#view')
                with page.expect_download() as info:
                    scope.get_by_role('button', name='Download study backup', exact=True).click()
                assert info.value.suggested_filename == 'pali-library-study-backup.json'
                value = json.loads(pathlib.Path(info.value.path()).read_text(encoding='utf-8'))
                assert set(value) == {'format', 'saved', 'progress', 'resume'} and value['format'] == FORMAT
                return value

            def upload(page, value, filename=PRIVATE + '<img src=x onerror=window.backupFixtureExecuted=true>.json'):
                raw = value if isinstance(value, bytes) else compact(value).encode('utf-8')
                field = page.get_by_label('Restore study backup from JSON', exact=True)
                field.set_input_files(
                    {'name': filename, 'mimeType': 'application/json', 'buffer': raw})
                expect(field).to_have_value('')

            def preview(page, saved_counts, progress_counts):
                section = page.get_by_role('region', name='Study backup preview', exact=True)
                expect(section.get_by_role('heading', name='Review study backup', exact=True)).to_be_visible()
                expect(section.get_by_text('Saved passages: {} new · {} duplicates · {} conflicts kept'.format(*saved_counts), exact=True)).to_be_visible()
                expect(section.get_by_text('Plan marks: {} new · {} duplicates · {} conflicts kept'.format(*progress_counts), exact=True)).to_be_visible()
                expect(section.get_by_role('button', name='Apply study backup', exact=True)).to_be_enabled()
                return section

            def failed(page, text=None):
                section = page.get_by_role('region', name='Study backup preview', exact=True)
                expect(section.get_by_role('heading', name='Unable to restore study backup', exact=True)).to_be_visible()
                if text:
                    expect(section).to_contain_text(text)
                expect(section.get_by_role('button', name='Apply study backup', exact=True)).to_have_count(0)
                return section

            def apply(page):
                page.get_by_role('button', name='Apply study backup', exact=True).focus()
                page.keyboard.press('Enter')
                done = page.get_by_role('heading', name='Study backup restored in this browser', exact=True)
                expect(done).to_be_visible()
                expect(done).to_be_focused()
                expect(page.get_by_role('button', name='Apply study backup', exact=True)).to_be_disabled()
                expect(page).to_have_url(base + '/#backup')

            def settle(page):
                page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')

            def release_catalogues(page, state):
                while state['held']:
                    route = state['held'].pop(0)
                    try:
                        reply(route, catalog)
                    except Error as error:
                        if not any(word in str(error).lower() for word in ['closed', 'invalid interception', 'cancel']):
                            raise
                settle(page)

            def peer_pointer(page, pointer):
                page.evaluate("value=>{const x=JSON.parse(localStorage.getItem('pali-library-v1'));x.last=value;localStorage.setItem('pali-library-v1',JSON.stringify(x))}", pointer)

            # Device A: entirely offline export, with drafts on different Saved pages.
            source_saved = copy.deepcopy(capacity[:26]) + [copy.deepcopy(mn), copy.deepcopy(commentary), copy.deepcopy(post)]
            context, new_page, state, initial = environment(source_saved, marks[:3], incoming_resume)
            page = new_page()
            open_saved(page)
            raw = stored(page)
            expect(page.get_by_role('region', name='Saved passage results').locator('textarea')).to_have_count(25)
            first_draft = PRIVATE + 'offscreen book draft <script>window.backupFixtureExecuted=true</script>'
            saved_item(page, source_saved[0]).get_by_label('Your personal note', exact=True).fill(first_draft)
            page.get_by_role('button', name='Next saved page', exact=True).click()
            second_draft = PRIVATE + 'second Saved page unsaved note'
            saved_item(page, mn).get_by_label('Your personal note', exact=True).fill(second_draft)
            page.get_by_role('link', name='Study backup', exact=True).focus()
            page.keyboard.press('Enter')
            ready(page)
            transferred = download(page)
            expected_source = copy.deepcopy(source_saved)
            expected_source[0]['note'] = first_draft
            find_record(expected_source, mn)['note'] = second_draft
            assert transferred == backup(expected_source, marks[:3], incoming_resume)
            assert stored(page) == raw and page.evaluate('window.backupWrites') == [] and not state['calls']
            audit(page, state, 'offline one-file export with offscreen private drafts')
            passed('Saved opens Backup and offline one-file download includes all four source types, exact pins, actual marks/resume and offscreen drafts without writes or MCP')
            state['mode'] = 'allow'
            page.get_by_role('link', name='Plans', exact=True).click()
            expect(page.get_by_role('heading', name='Reading plans', exact=True)).to_be_visible()
            before = len(state['calls'])
            state['mode'] = 'offline'
            page.get_by_role('link', name='Study backup', exact=True).click()
            ready(page)
            assert len(state['calls']) == before and download(page) == transferred and stored(page) == raw
            passed('Plans links to Backup; opening and downloading require no plan/source request')
            context.close()

            # Device B: existing pins, note drafts and conflicting marks win.
            existing_mn = {**mn, 'source_commit': 'controlled-existing-bookmark-revision', 'note': PRIVATE + 'existing durable note'}
            conflict_mark = copy.deepcopy(marks[1])
            old_signature = json.loads(conflict_mark['signature'])
            old_signature['source'] = 'controlled-existing-plan-revision'
            conflict_mark['signature'] = compact(old_signature)
            current_saved = [copy.deepcopy(transferred['saved'][0]), existing_mn, copy.deepcopy(dhp)]
            current_progress = [copy.deepcopy(marks[0]), conflict_mark, copy.deepcopy(marks[3])]
            context, new_page, state, initial = environment(current_saved, current_progress)
            page = new_page()
            open_saved(page)
            current_draft = PRIVATE + 'existing unsaved target-device draft'
            draft(page, existing_mn, current_draft)
            open_backup(page)
            raw = stored(page)
            state['mode'] = 'allow'
            upload(page, transferred)
            section = preview(page, (len(transferred['saved']) - 2, 1, 1), (1, 1, 1))
            expect(section.get_by_role('heading', name='Review study backup', exact=True)).to_be_focused()
            choice = page.get_by_label('Restore incoming reading position', exact=True)
            expect(choice).not_to_be_checked()
            expect(choice).to_be_enabled()
            assert stored(page) == raw
            audit(page, state, 'additive restore preview with actual conflicts')
            section.get_by_role('button', name='Cancel restore', exact=True).focus()
            page.keyboard.press('Enter')
            expect(page.locator('[aria-label="Study backup preview"]')).to_be_empty()
            expect(page.get_by_label('Restore study backup from JSON', exact=True)).to_be_focused()
            assert stored(page) == raw
            passed('keyboard preview/cancel shows exact new/duplicate/conflict counts and never mutates existing data or defaults resume on')
            upload(page, transferred)
            preview(page, (len(transferred['saved']) - 2, 1, 1), (1, 1, 1))
            apply(page)
            added_saved = [r for r in transferred['saved'] if identity(r) not in {identity(x) for x in current_saved}]
            expected_saved = current_saved + added_saved
            expected_progress = current_progress + [marks[2]]
            assert profile(page) == {**initial, 'saved': expected_saved, 'reading_progress': expected_progress}
            combined = download(page)
            effective = copy.deepcopy(expected_saved)
            find_record(effective, mn)['note'] = current_draft
            assert combined == backup(effective, expected_progress, local_resume)
            assert find_record(profile(page)['saved'], mn)['source_commit'] == existing_mn['source_commit']
            audit(page, state, 'confirmed cross-device additive restore preserves existing private state')
            passed('confirmed additive transfer keeps existing notes/drafts/source pins/conflicting marks, adds only new records and leaves current resume/navigation unchanged')
            context.close()

            small = backup([mn], [marks[1]], incoming_resume)
            # Explicit resume is a pinned pointer only, never automatic navigation.
            context, new_page, state, initial = environment([dhp], [marks[0]])
            page = new_page()
            open_backup(page)
            state['mode'] = 'allow'
            upload(page, small)
            preview(page, (1, 0, 0), (1, 0, 0))
            expect(page.get_by_role('link', name='Open incoming reading position', exact=True)).to_have_attribute('href', incoming_resume)
            page.get_by_label('Restore incoming reading position', exact=True).check()
            apply(page)
            assert profile(page) == {**initial, 'saved': [dhp, mn], 'reading_progress': marks[:2], 'last': incoming_resume}
            assert download(page) == backup([dhp, mn], marks[:2], incoming_resume)
            audit(page, state, 'explicit pinned resume restore')
            passed('explicit opt-in restores the exact incoming pinned locator without opening a passage or granting source consent')
            context.close()

            # Parent-reviewed regression: forced disabled checkbox must not stage arrays.
            for remember, incoming_pointer in [(False, incoming_resume), (True, None)]:
                context, new_page, state, initial = environment([dhp], [marks[0]], remember=remember)
                page = new_page()
                open_backup(page)
                state['mode'] = 'allow'
                upload(page, backup([mn], [marks[1]], incoming_pointer))
                preview(page, (1, 0, 0), (1, 0, 0))
                choice = page.get_by_label('Restore incoming reading position', exact=True)
                expect(choice).not_to_be_checked()
                expect(choice).to_be_disabled()
                choice.evaluate('(input)=>{input.checked=true}')
                page.get_by_role('button', name='Apply study backup', exact=True).click()
                expect(page.get_by_role('region', name='Study backup preview')).to_contain_text('no longer available')
                assert profile(page) == initial
                assert download(page) == backup([dhp], [marks[0]], local_resume if remember else None)
                privacy(page, state)
                passed(('privacy preference off' if not remember else 'absent incoming resume') + ': forced disabled-resume fixture refuses before staging saved/progress/pointer state')
                context.close()

            # A peer pointer change after preview prevents selected overwrite;
            # unchecked retry may still add study data while adopting that pointer.
            context, new_page, state, initial = environment([dhp], [marks[0]])
            a, b = new_page(), new_page()
            open_backup(a)
            open_backup(b)
            state['mode'] = 'allow'
            upload(a, small)
            preview(a, (1, 0, 0), (1, 0, 0))
            choice = a.get_by_label('Restore incoming reading position', exact=True)
            choice.check()
            peer_pointer(b, peer_resume)
            a.get_by_role('button', name='Apply study backup', exact=True).click()
            expect(a.get_by_role('region', name='Study backup preview')).to_contain_text('reading position changed since preview')
            assert profile(a) == {**initial, 'last': peer_resume}
            choice.uncheck()
            apply(a)
            assert profile(a) == {**initial, 'saved': [dhp, mn], 'reading_progress': marks[:2], 'last': peer_resume}
            assert download(a)['resume'] == peer_resume
            audit(a, state, 'peer-pointer preservation after selected resume refusal')
            passed('changed peer pointer blocks selected resume; unchecked pointer-only update is preserved while new study data is added')
            context.close()

            # Quota/stale restore never creates a partial in-tab import and retains drafts.
            for fault in ['quota', 'private other-tab change']:
                context, new_page, state, initial = environment([dhp], [marks[0]])
                a, b = new_page(), new_page()
                open_saved(a)
                pending = PRIVATE + fault + ' current draft'
                draft(a, dhp, pending)
                open_backup(a)
                state['mode'] = 'allow'
                upload(a, small)
                preview(a, (1, 0, 0), (1, 0, 0))
                if fault == 'quota':
                    a.evaluate('window.backupDenyWrites=true')
                    durable = initial
                else:
                    open_backup(b)
                    b.evaluate("()=>{const x=JSON.parse(localStorage.getItem('pali-library-v1'));x.saved[0].note='" + PRIVATE + "newer note in peer';localStorage.setItem('pali-library-v1',JSON.stringify(x))}")
                    durable = {**initial, 'saved': [{**dhp, 'note': PRIVATE + 'newer note in peer'}]}
                a.get_by_role('button', name='Apply study backup', exact=True).click()
                expect(a.locator('#storage-recovery')).to_be_visible()
                assert profile(a) == durable
                recovered = download(a, recovery=True)
                assert recovered == backup([{**dhp, 'note': pending}], [marks[0]], local_resume)
                assert a.get_by_role('heading', name='Study backup restored in this browser', exact=True).count() == 0
                audit(a, state, fault + ' atomic restore rollback and combined recovery export')
                passed(fault + ': failed restore preserves durable private data and original in-tab arrays/drafts; combined recovery export contains no partial import')
                context.close()

            # Parent-reviewed raw-baseline rollback: peer changed before preview,
            # incoming pointer equals stale local pointer, selected write then fails.
            context, new_page, state, initial = environment([dhp], [marks[0]])
            a, b = new_page(), new_page()
            open_saved(a)
            pending = PRIVATE + 'unrelated note after failed resume write'
            draft(a, dhp, pending)
            open_backup(b)
            peer_pointer(b, peer_resume)
            open_backup(a)
            state['mode'] = 'allow'
            upload(a, backup([mn], [marks[1]], local_resume))
            preview(a, (1, 0, 0), (1, 0, 0))
            a.get_by_label('Restore incoming reading position', exact=True).check()
            a.evaluate('window.backupDenyWrites=true')
            a.get_by_role('button', name='Apply study backup', exact=True).click()
            expect(a.locator('#storage-recovery')).to_be_visible()
            assert profile(a) == {**initial, 'last': peer_resume}
            assert download(a, recovery=True) == backup([{**dhp, 'note': pending}], [marks[0]], local_resume)
            a.evaluate('window.backupDenyWrites=false')
            open_saved(a)
            a.get_by_label('Search saved passages and notes', exact=True).fill(dhp['ref'])
            saved_item(a, dhp).get_by_role('button', name='Save note', exact=True).click()
            expect(a.locator('#status')).to_contain_text('Personal note saved')
            assert profile(a) == {**initial, 'saved': [{**dhp, 'note': pending}], 'last': peer_resume}
            privacy(a, state)
            passed('failed opted-in resume restores the raw storage baseline; later unrelated note save preserves the peer pointer rather than resurrecting the old local locator')
            context.close()

            # Malformed components/locators are rejected as one file, before any merge.
            context, new_page, state, initial = environment([dhp], [marks[0]])
            page = new_page()
            open_backup(page)
            bad_files = []
            for changed in [
                {**small, 'progress': [{**marks[1], 'signature': '{'}]},
                {**small, 'saved': [{**mn, 'text': PRIVATE + 'unsupported source/body field'}]},
                {**small, 'source_text': PRIVATE + 'unknown root field'},
            ]:
                bad_files.append(changed)
            for pointer in ['https://example.invalid/private', 'javascript:alert(1)', incoming_resume + '&allow_partial=true',
                            incoming_resume + '&translation=default', incoming_resume + '&source=duplicate']:
                bad_files.append({**small, 'resume': pointer})
            for bad in bad_files:
                upload(page, bad)
                failed(page)
                assert profile(page) == initial
                assert download(page) == backup([dhp], [marks[0]], local_resume)
            assert not state['calls']
            audit(page, state, 'malformed components and unsafe resume atomically refused offline')
            passed('malformed saved/progress/body fields and external/JavaScript/source-consent/duplicate resume parameters refuse the entire file without a request or partial merge')

            # The current catalogue is required, without uploading any file data.
            state['mode'] = 'failure'
            upload(page, small)
            section = failed(page, 'Controlled current reading-plan catalogue failure')
            expect(section.get_by_role('heading', name='Unable to restore study backup', exact=True)).to_be_focused()
            assert profile(page) == initial
            state['mode'] = 'allow'
            section.get_by_role('button', name='Retry plan verification', exact=True).click()
            preview(page, (1, 0, 0), (1, 0, 0))
            page.get_by_role('button', name='Cancel restore', exact=True).click()
            assert profile(page) == initial
            passed('current catalogue failure prevents both components; explicit verification retry sends only reading_plan with empty arguments')
            context.close()

            # A retired preview cannot overwrite a draft changed in Saved.
            context, new_page, state, initial = environment([dhp], [marks[0]])
            page = new_page()
            open_backup(page)
            state['mode'] = 'allow'
            upload(page, small)
            preview(page, (1, 0, 0), (1, 0, 0))
            retired_apply = page.get_by_role('button', name='Apply study backup', exact=True).element_handle()
            open_saved(page)
            newest_draft = PRIVATE + 'draft changed after leaving preview'
            draft(page, dhp, newest_draft)
            retired_apply.evaluate('(button)=>button.click()')
            assert profile(page) == initial
            open_backup(page)
            state['mode'] = 'offline'
            assert download(page) == backup([{**dhp, 'note': newest_draft}], [marks[0]], local_resume)
            passed('a retired preview callback cannot import over a newer local draft after navigation; latest draft remains in the offline backup')
            context.close()

            # Interrupted file/catalogue reads: route changes and new files win.
            replacement = backup([commentary], [], None)
            for held_kind in ['file', 'catalogue']:
                for destination in ['new file', 'Saved route']:
                    context, new_page, state, initial = environment([dhp], [marks[0]])
                    page = new_page()
                    open_backup(page)
                    if held_kind == 'file':
                        page.evaluate('window.backupHoldNextFile=true')
                        state['mode'] = 'offline'
                    else:
                        state['mode'] = 'hold'
                    upload(page, small)
                    if held_kind == 'file':
                        page.wait_for_function('window.backupHeldFiles.length===1')
                    else:
                        page.get_by_text('Verifying current reading-plan assignments…', exact=True).wait_for()
                        page.wait_for_function('window.backupHeldCatalogueCount===1')
                        assert len(state['held']) == 1
                    if destination == 'new file':
                        upload(page, replacement, PRIVATE + 'replacement.json')
                        preview(page, (1, 0, 0), (0, 0, 0))
                    else:
                        open_saved(page)
                    if held_kind == 'file':
                        page.evaluate('async()=>{await window.backupHeldFiles.shift()()}')
                        settle(page)
                    else:
                        release_catalogues(page, state)
                    assert profile(page) == initial
                    if destination == 'new file':
                        preview(page, (1, 0, 0), (0, 0, 0))
                        apply(page)
                        assert profile(page) == {**initial, 'saved': [dhp, commentary]}
                    else:
                        expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
                        expect(page.get_by_role('heading', name='Review study backup', exact=True)).to_have_count(0)
                    privacy(page, state)
                    passed('held ' + held_kind + ' read cannot replace ' + destination + ' or import any part of the retired file')
                    context.close()

            # Invalid remembered metadata must not make an unsafe resume export.
            context, new_page, state, initial = environment([dhp], [marks[0]], resume='mn10')
            page = new_page()
            open_backup(page)
            assert download(page) == backup([dhp], [marks[0]], None)
            expect(page.locator('#status')).to_contain_text(re.compile('invalid|unsupported|omitted', re.I))
            assert profile(page) == initial and not state['calls']
            state['mode'] = 'allow'
            upload(page, small)
            preview(page, (1, 0, 0), (1, 0, 0))
            expect(page.get_by_label('Restore incoming reading position', exact=True)).not_to_be_checked()
            apply(page)
            assert profile(page) == {**initial, 'saved': [dhp, mn], 'reading_progress': marks[:2]}
            assert download(page) == backup([dhp, mn], marks[:2], None)
            privacy(page, state)
            passed('unsupported old local pointer is explicitly omitted from export but unchanged-profile restore still adds notes/marks without upgrading or overwriting that pointer')
            context.close()

            # Byte/capacity limits are invariant across viewports; run the large
            # metadata fixtures once per invocation rather than repeat 32MiB files.
            if width == 390 and theme == 'light':
                context, new_page, state, initial = environment([dhp], [marks[0]])
                page = new_page()
                open_backup(page)
                before_reads = page.evaluate('window.backupReadCount')
                upload(page, b' ' * (32 * MIB + 1), 'oversize-study-backup.json')
                failed(page, '32 MiB')
                assert page.evaluate('window.backupReadCount') == before_reads
                huge_saved = backup([{**mn, 'note': PRIVATE + 'X' * (16 * MIB)}], [marks[1]], incoming_resume)
                upload(page, huge_saved)
                failed(page, '16 MiB')
                synthetic_progress = []
                for i in range(1600):
                    name, day = 'fixture-archived-plan-' + str(i // 400), i % 400 + 1
                    raw_signature = compact({'name': name, 'day': day, 'source': 'synthetic-capacity-fixture',
                                             'readings': [{'id': 'mn10', 'offset': 0, 'limit': None, 'part': None, 'of': None}]})
                    synthetic_progress.append({'name': name, 'day': day, 'signature': raw_signature})
                huge_progress = [{**m, 'signature': m['signature'] + ' ' * (11900 - len(m['signature']))} for m in synthetic_progress]
                upload(page, backup([mn], huge_progress, incoming_resume))
                failed(page, '16 MiB')
                assert profile(page) == initial and not state['calls']
                privacy(page, state)
                passed('32MiB outer limit is checked before file reading; both 16MiB component limits refuse before catalogue requests or any partial restore')
                context.close()
                for component in ['500 bookmarks', '1600 marks']:
                    prior_saved = capacity if component == '500 bookmarks' else [dhp]
                    prior_progress = [marks[0]] if component == '500 bookmarks' else synthetic_progress
                    context, new_page, state, initial = environment(prior_saved, prior_progress)
                    page = new_page()
                    open_backup(page)
                    state['mode'] = 'allow'
                    upload(page, small)
                    failed(page, '500' if component == '500 bookmarks' else '1,600')
                    assert profile(page) == initial
                    assert download(page) == backup(prior_saved, prior_progress, local_resume)
                    privacy(page, state)
                    passed(component + ' capacity refuses the entire additive file without eviction or a half-import of the other component')
                    context.close()
        browser.close()

    result = {'passed': len(checks), 'checks': checks, 'outside_source_tree': bool(args.server_dir),
              'actual_sources': [{k: x[k] for k in ['uid', 'ref', 'offset', 'source_commit']} for x in [mn, dhp, book, commentary, post]],
              'actual_plan': {'name': plan['name'], 'days': plan['days'], 'current_catalogue_total_days': sum(p['days'] for p in catalog['plans'])},
              'a11y': {'scans': len(scans), 'violations': sum(len(x['violations']) for x in scans), 'results': scans},
              'limits': 'Actual bundled source IDs/references/pins and engine plan signatures; private notes are synthetic. Archived 1600-mark states, size stress, old/conflicting revisions, unsafe pointers, forced disabled checkboxes, retired callbacks, delayed local files/catalogue responses and denied writes are labelled fixtures. No publisher source text or English retrieval. Backup open/export are tested with MCP blocked; restore requests only constant reading_plan({}). Local draft changes retire the preview via public navigation; no private Map test hook is exposed. Font30px, four Chromium widths; no atomic-CAS, account sync, physical-device or human accessibility certification.'}
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
