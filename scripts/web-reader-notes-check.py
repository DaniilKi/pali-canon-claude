#!/usr/bin/env python3
"""Actual bundled passage notes; synthetic private notes and explicit storage/pin faults.

Scripture, IDs and baseline source revisions/associations come from actual
bundled responses. Old/invalid saved pins, an invalid response revision and quota
failure are labelled metadata/storage fixtures. No English is retrieved.
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

from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY = 'pali-library-v1'
PRIVATE = 'PRIVATE_NOTES_ACCEPTANCE_'
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
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')],
                          cwd='/tmp' if args.server_dir else ROOT,
                          env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'},
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
checks, scans = [], []


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


def href(context, **extra):
    return base + '/#read?' + urllib.parse.urlencode({**context, **extra})


def source_case(name, context, name_of_tool, arguments, selector):
    data = tool(name_of_tool, {**arguments, 'offset': 0, 'limit': 30, 'script': 'roman'})
    index, segment = next((i, s) for i, s in enumerate(data['segments']) if s['type'] != 'heading')
    mark = {'uid': selector, 'ref': segment['ref'], 'title': data.get('title') or data.get('book', {}).get('title') or data.get('citation') or data['book_id'],
            'note': '', 'offset': data['offset'] + index, 'source_commit': revision(data)}
    return {'name': name, 'context': context, 'data': data, 'index': index, 'mark': mark}


def profile(page):
    return page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)


def record(page, mark):
    return next(x for x in profile(page)['saved'] if x['uid'] == mark['uid'] and x['ref'] == mark['ref'])


def download(page, control):
    with page.expect_download() as info:
        control.click()
    return json.loads(pathlib.Path(info.value.path()).read_text(encoding='utf-8'))


def exact_record(records, mark):
    matches = [x for x in records if x['uid'] == mark['uid'] and x['ref'] == mark['ref']]
    assert len(matches) == 1, matches
    return matches[0]


try:
    for _ in range(100):
        try:
            urllib.request.urlopen(base + '/healthz', timeout=1)
            break
        except Exception:
            time.sleep(.1)
    else:
        raise AssertionError('Bundled server did not become ready')

    book_catalogue = tool('browse_canon', {'node': 'books', 'limit': 60})
    book_id = book_catalogue['items'][0]['read_with']['book']
    commentary_catalogue = tool('get_commentary', {'uid': 'commentary', 'limit': 40})
    commentary_id = commentary_catalogue['books'][0]['uid']
    post_catalogue = tool('get_post_canonical', {'limit': 40})
    post_id = post_catalogue['items'][0]['id']
    sources = [
        source_case('canonical MN10', {'uid': 'mn10'}, 'get_text', {'uid': 'mn10'}, 'mn10'),
        source_case('canonical Dhp183', {'uid': 'dhp183'}, 'get_text', {'uid': 'dhp183'}, 'dhp183'),
        source_case('complete root book', {'book': book_id}, 'get_text', {'book': book_id}, 'book:' + book_id),
        source_case('direct commentary book', {'kind': 'commentary', 'uid': commentary_id}, 'get_commentary', {'uid': commentary_id}, commentary_id),
        source_case('post-canonical book', {'kind': 'post', 'uid': post_id}, 'get_post_canonical', {'citation': post_id}, 'post:' + post_id),
    ]
    mn, dhp = sources[:2]
    # Actual source-book locations provide >25 Saved rows and a full 500-record
    # capacity fixture. No invented refs are allowed into the attachment checks.
    capacity = []
    offset = 0
    while len(capacity) < 500:
        page_data = tool('get_text', {'book': book_id, 'offset': offset, 'limit': 200, 'script': 'roman'})
        capacity.extend({'uid': 'book:' + book_id, 'ref': s['ref'], 'title': page_data['title'], 'note': '',
                         'offset': offset + i, 'source_commit': revision(page_data)}
                        for i, s in enumerate(page_data['segments']))
        assert page_data['next_offset'] is not None or len(capacity) >= 500
        offset = page_data['next_offset']
    capacity = capacity[:500]
    # The book attachment under test must be outside the 26 seed records.
    book_data = tool('get_text', {'book': book_id, 'offset': 30, 'limit': 30, 'script': 'roman'})
    bi, bs = next((i, s) for i, s in enumerate(book_data['segments']) if s['type'] != 'heading')
    sources[2].update(data=book_data, index=bi, context={'book': book_id, 'offset': 30},
                      mark={**sources[2]['mark'], 'ref': bs['ref'], 'offset': 30 + bi, 'source_commit': revision(book_data)})

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        expect.set_options(timeout=30000)
        cases = [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]
        for width, theme in cases:
            def passed(name):
                checks.append({'width': width, 'theme': theme, 'check': name})
                print(f'{width}px {theme}: {name}', flush=True)

            def environment(saved, invalid_response=False):
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                state = {'theme': theme, 'font': 30, 'remember_position': False, 'saved': copy.deepcopy(saved)}
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," +
                                        json.dumps(json.dumps(state)) + ");window.notesDenyWrites=false;" +
                                        "const notesOriginalSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){" +
                                        "if(key==='pali-library-v1'&&window.notesDenyWrites)throw Error('Controlled notes quota denial');return notesOriginalSet.call(this,key,value)};" +
                                        "window.notesPrintCalls=0;window.print=()=>{window.notesPrintCalls++;dispatchEvent(new Event('beforeprint'))}")
                ledger = {'requests': [], 'external': [], 'forbidden': [], 'errors': []}

                def intercept(route):
                    request = route.request
                    body = request.post_data or ''
                    if PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in body:
                        ledger['forbidden'].append('Private note was put in a request')
                        route.abort()
                    elif not request.url.startswith(base + '/'):
                        ledger['external'].append(request.url)
                        route.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        payload = request.post_data_json
                        ledger['requests'].append(copy.deepcopy(payload))
                        params = payload.get('params', {})
                        if params.get('name') not in {'get_text', 'get_commentary', 'get_post_canonical', 'browse_canon', 'list_sources'}:
                            ledger['forbidden'].append(params.get('name'))
                            route.fulfill(status=200, content_type='application/json', body=json.dumps(
                                {'jsonrpc': '2.0', 'id': payload['id'], 'result': {'isError': True, 'structuredContent': {'error': 'Unexpected provider access blocked by notes harness'}}}))
                        elif invalid_response and params.get('name') == 'get_text' and params.get('arguments', {}).get('uid') == 'mn10':
                            response = route.fetch()
                            data = response.json()
                            data['result']['structuredContent']['source']['locator_revision'] = 'https://invalid.example/controlled-revision'
                            route.fulfill(response=response, json=data)
                        else:
                            route.continue_()
                    else:
                        route.continue_()

                context.route('**/*', intercept)

                def new_page():
                    page = context.new_page()
                    page.set_default_timeout(30000)
                    page.on('pageerror', lambda error: ledger['errors'].append(str(error)))
                    return page

                return context, new_page, ledger

            def privacy(page, ledger):
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert not ledger['external'] and not ledger['forbidden'], ledger
                assert not ledger['errors'], ledger['errors']
                assert page.evaluate('window.noteFixtureExecuted') is None
                expect(page.locator('.personal-note img, [aria-label="Saved passage results"] img')).to_have_count(0)

            def audit(page, ledger, state):
                privacy(page, ledger)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), f'{width}px {theme}: {state} overflow'
                if not args.a11y:
                    return
                page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width': width, 'theme': theme, 'state': state,
                              'violations': [{'id': x['id'], 'targets': [n['target'] for n in x['nodes']]} for x in result['violations']],
                              'manual_review_rules': [x['id'] for x in result['incomplete']]})

            def ready(page, source):
                expect(page).to_have_url(href(source['context']))
                data = source['data']
                title = data.get('title') or data.get('book', {}).get('title') or data.get('book_id')
                expect(page.locator('#view > h2')).to_have_text((data['citation'] + ' · ' if data.get('citation') else '') + title)
                expect(page.locator('section[aria-label="Pāli passage"] .segment .passage')).to_have_text([s['text'] for s in data['segments']])
                expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)

            def read(page, source):
                page.goto(href(source['context']))
                ready(page, source)

            def note_region(page, source):
                return page.get_by_role('region', name='Personal note for ' + source['mark']['ref'], exact=True)

            def opener(page, source):
                return note_region(page, source).get_by_role('button', name=re.compile(r'^(Add personal note|View\/edit personal note)$'))

            def editor(page, source):
                region = note_region(page, source)
                label = 'Your personal note for ' + source['mark']['ref']
                if not region.get_by_label(label, exact=True).count():
                    opener(page, source).click()
                field = region.get_by_label(label, exact=True)
                expect(field).to_be_visible()
                expect(field).to_have_attribute('maxlength', '4000')
                return region, field

            def saved(page):
                page.goto(base + '/#saved')
                expect(page).to_have_url(base + '/#saved')
                expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
                expect(page.get_by_role('region', name='Saved passage results', exact=True)).to_be_visible()

            def saved_item(page, mark):
                return page.get_by_role('region', name='Saved passage results', exact=True).locator('article').filter(
                    has=page.get_by_text(mark['title'] + ' · ' + mark['ref'], exact=True))

            def find_saved(page, mark):
                page.get_by_label('Search saved passages and notes', exact=True).fill(mark['ref'])
                box = saved_item(page, mark)
                expect(box).to_have_count(1)
                return box

            def exported(page, recovery=False):
                control = (page.locator('#storage-recovery').get_by_role('button', name='Download this tab’s bookmarks and notes', exact=True)
                           if recovery else page.get_by_role('button', name='Export bookmarks and notes', exact=True))
                return download(page, control)['saved']

            def confirmation(page):
                group = page.get_by_role('group', name='Confirm bookmark and note removal', exact=True)
                expect(group).to_be_visible()
                return group

            # The ordinary flow starts with 26 real source-book references so the
            # new notes are off page one in Saved, not specially injected DOM rows.
            context, new_page, ledger = environment(capacity[:26])
            page = new_page()
            own_marks = []
            for source in sources:
                read(page, source)
                button = opener(page, source)
                button.focus()
                page.keyboard.press('Enter')
                region, field = editor(page, source)
                expect(field).to_be_focused()
                note = PRIVATE + source['name'] + ' <img src=x onerror=window.noteFixtureExecuted=true>'
                before = len(ledger['requests'])
                field.fill(note)
                privacy(page, ledger)
                region.get_by_role('button', name='Save note', exact=True).click()
                expect(page.locator('#status')).to_contain_text('Personal note saved')
                actual = record(page, source['mark'])
                assert actual == {**source['mark'], 'note': note}, actual
                assert len(ledger['requests']) == before
                own_marks.append(copy.deepcopy(actual))
                audit(page, ledger, 'saved in-context note: ' + source['name'])
                page.reload()
                ready(page, source)
                region, field = editor(page, source)
                expect(field).to_have_value(note)
                assert record(page, source['mark']) == actual
                region.get_by_role('button', name='Close note editor', exact=True).focus()
                page.keyboard.press('Enter')
                expect(opener(page, source)).to_be_focused()
                passed(source['name'] + ': keyboard editor saves/reloads exact reference, absolute offset and actual source revision without a note request')

            read(page, mn)
            region, field = editor(page, mn)
            draft = PRIVATE + 'in-context unsaved draft <script>window.noteFixtureExecuted=true</script>'
            field.fill(draft)
            privacy(page, ledger)
            region.get_by_role('button', name='Close note editor', exact=True).click()
            region, field = editor(page, mn)
            expect(field).to_have_value(draft)
            read(page, dhp)
            read(page, mn)
            region, field = editor(page, mn)
            expect(field).to_have_value(draft)
            assert record(page, mn['mark'])['note'] == own_marks[0]['note']
            # Use the real print integration; mock only the OS print dialogue.
            actions = page.locator('.study-actions')
            if actions.count() and actions.get_attribute('open') is None:
                actions.locator('summary').click()
            page.locator('[data-print-page]').focus()
            page.keyboard.press('Enter')
            assert page.evaluate('window.notesPrintCalls') == 1
            expect(page.locator('#print-document .print-passage')).to_have_text([s['text'] for s in mn['data']['segments']])
            assert PRIVATE not in page.locator('#print-document').text_content()
            expect(page.locator('#print-document textarea, #print-document .personal-note')).to_have_count(0)
            page.evaluate("dispatchEvent(new Event('afterprint'))")
            passed('unsaved draft survives Close and other passages; real reading print snapshot excludes all personal notes and controls')

            saved(page)
            results = page.get_by_role('region', name='Saved passage results', exact=True)
            expect(results.locator('textarea')).to_have_count(25)
            first_seed = capacity[0]
            first_box = saved_item(page, first_seed)
            offscreen_draft = PRIVATE + 'Saved page one draft'
            first_box.get_by_label('Your personal note', exact=True).fill(offscreen_draft)
            # A draft alone needs confirmation even when the durable note is empty.
            first_box.get_by_role('button', name='Remove bookmark', exact=True).click()
            confirmation(page).get_by_role('button', name='Cancel removal', exact=True).click()
            expect(first_box.get_by_label('Your personal note', exact=True)).to_have_value(offscreen_draft)
            assert record(page, first_seed)['note'] == ''
            page.get_by_role('button', name='Next saved page', exact=True).click()
            mn_box = saved_item(page, mn['mark'])
            expect(mn_box.get_by_label('Your personal note', exact=True)).to_have_value(draft)
            expect(mn_box.get_by_label('Your personal note', exact=True)).to_have_attribute('maxlength', '4000')
            shared_draft = PRIVATE + 'edited through shared Saved editor'
            mn_box.get_by_label('Your personal note', exact=True).fill(shared_draft)
            privacy(page, ledger)
            page.get_by_role('button', name='Previous saved page', exact=True).click()
            expect(saved_item(page, first_seed).get_by_label('Your personal note', exact=True)).to_have_value(offscreen_draft)
            assert page.evaluate('document.activeElement.getAttribute("role")') == 'status'
            all_notes = exported(page)
            assert len(all_notes) == 26 + len(sources)
            assert exact_record(all_notes, first_seed)['note'] == offscreen_draft
            assert exact_record(all_notes, mn['mark'])['note'] == shared_draft
            assert record(page, mn['mark'])['note'] == own_marks[0]['note']
            read(page, mn)
            region, field = editor(page, mn)
            expect(field).to_have_value(shared_draft)
            audit(page, ledger, 'draft shared with Saved and offscreen export')
            passed('shared 4000-character Saved editor, paging, return to source and export retain both visible and offscreen drafts without implicit save')
            # Exercise the browser's user-input limit, not an implementation mirror.
            field.fill('N' * 3999)
            field.press('End')
            field.press_sequentially('XYZ')
            expect(field).to_have_value('N' * 3999 + 'X')
            field.fill(shared_draft)
            audit(page, ledger, 'largest-font personal editor')
            privacy(page, ledger)
            context.close()

            # Both public removal paths must confirm nonempty saved OR draft notes.
            original = [copy.deepcopy(x) for x in own_marks[:2]]
            for mode in ['reading toggle', 'Saved Remove']:
                context, new_page, ledger = environment(original)
                page = new_page()
                if mode == 'reading toggle':
                    read(page, mn)
                    region, field = editor(page, mn)
                    remove = page.get_by_role('button', name='Save passage ' + mn['mark']['ref'], exact=True)
                else:
                    saved(page)
                    box = find_saved(page, mn['mark'])
                    field = box.get_by_label('Your personal note', exact=True)
                    remove = box.get_by_role('button', name='Remove bookmark', exact=True)
                # A stored note alone also needs confirmation before any draft.
                remove.click()
                confirmation(page).get_by_role('button', name='Cancel removal', exact=True).click()
                assert profile(page)['saved'] == original
                removal_draft = PRIVATE + mode + ' nonempty removal draft'
                field.fill(removal_draft)
                privacy(page, ledger)
                remove.click()
                group = confirmation(page)
                audit(page, ledger, mode + ' removal confirmation')
                group.get_by_role('button', name='Cancel removal', exact=True).focus()
                page.keyboard.press('Enter')
                expect(group).to_have_count(0)
                expect(field).to_have_value(removal_draft)
                assert profile(page)['saved'] == original
                remove.click()
                page.evaluate('window.notesDenyWrites=true')
                confirmation(page).get_by_role('button', name='Remove bookmark and note', exact=True).click()
                expect(page.locator('#storage-recovery')).to_be_visible()
                assert profile(page)['saved'] == original
                recovery = exported(page, recovery=True)
                assert len(recovery) == 2
                assert exact_record(recovery, mn['mark'])['note'] == removal_draft
                assert exact_record(recovery, dhp['mark']) == original[1]
                audit(page, ledger, mode + ' failed removal recovery')
                # The restored local item must remain accessible after leaving the view.
                saved(page)
                box = find_saved(page, mn['mark'])
                expect(box.get_by_label('Your personal note', exact=True)).to_have_value(removal_draft)
                page.evaluate('window.notesDenyWrites=false')
                box.get_by_role('button', name='Remove bookmark', exact=True).click()
                confirmation(page).get_by_role('button', name='Remove bookmark and note', exact=True).click()
                expect(saved_item(page, mn['mark'])).to_have_count(0)
                assert profile(page)['saved'] == [original[1]]
                assert exported(page) == [original[1]]
                privacy(page, ledger)
                passed(mode + ': Cancel preserves note/draft; denied removal restores both for recovery; later confirmation removes only the exact record')
                context.close()

            context, new_page, ledger = environment([])
            page = new_page()
            read(page, mn)
            page.evaluate('window.notesDenyWrites=true')
            region, field = editor(page, mn)
            new_draft = PRIVATE + 'new note under controlled quota denial'
            field.fill(new_draft)
            privacy(page, ledger)
            region.get_by_role('button', name='Save note', exact=True).click()
            expect(page.locator('#storage-recovery')).to_be_visible()
            expect(field).to_have_value(new_draft)
            assert profile(page)['saved'] == []
            page.get_by_role('link', name='Library', exact=True).click()
            expect(page.get_by_role('heading', name='The Pāli Canon', exact=True)).to_be_visible()
            assert exported(page, recovery=True) == [{**mn['mark'], 'note': new_draft}]
            read(page, mn)
            region, field = editor(page, mn)
            expect(field).to_have_value(new_draft)
            page.evaluate('window.notesDenyWrites=false')
            region.get_by_role('button', name='Save note', exact=True).click()
            expect(page.locator('#storage-recovery')).to_be_hidden()
            assert record(page, mn['mark']) == {**mn['mark'], 'note': new_draft}
            audit(page, ledger, 'new note recovers from unavailable storage')
            passed('a new note with unavailable storage survives navigation in tab memory/recovery export and can be explicitly saved after writes recover')
            context.close()

            # Two real same-origin pages; no artificial storage-event or merge model.
            context, new_page, ledger = environment(original)
            a, b = new_page(), new_page()
            read(a, mn)
            a_region, a_field = editor(a, mn)
            stale_draft = PRIVATE + 'stale A unsaved note'
            a_field.fill(stale_draft)
            privacy(a, ledger)
            read(b, dhp)
            b_region, b_field = editor(b, dhp)
            newer = PRIVATE + 'newer different note in B'
            b_field.fill(newer)
            privacy(b, ledger)
            b_region.get_by_role('button', name='Save note', exact=True).click()
            expect(b.locator('#status')).to_contain_text('Personal note saved')
            privacy(b, ledger)
            a.bring_to_front()
            a_region.get_by_role('button', name='Save note', exact=True).click()
            expect(a.locator('#storage-recovery')).to_be_visible()
            expect(a.locator('#status')).to_contain_text('Another tab changed')
            assert record(a, dhp['mark'])['note'] == newer and record(a, mn['mark']) == original[0]
            expect(a_field).to_have_value(stale_draft)
            assert exact_record(exported(a, recovery=True), mn['mark'])['note'] == stale_draft
            a.get_by_role('button', name='Save passage ' + mn['mark']['ref'], exact=True).click()
            confirmation(a).get_by_role('button', name='Remove bookmark and note', exact=True).click()
            assert record(a, dhp['mark'])['note'] == newer and record(a, mn['mark']) == original[0]
            recovery = exported(a, recovery=True)
            assert len(recovery) == 2 and exact_record(recovery, mn['mark'])['note'] == stale_draft
            saved(a)
            expect(find_saved(a, mn['mark']).get_by_label('Your personal note', exact=True)).to_have_value(stale_draft)
            audit(a, ledger, 'stale tab save/removal preserves newer other note and recovery')
            passed('stale-tab save and removal never overwrite the other tab’s newer different note; local record/draft remain in Saved and recovery export')
            context.close()

            for variant in ['stale saved pin', 'invalid saved pin', 'legacy saved pin']:
                mark = copy.deepcopy(original[0])
                if variant == 'stale saved pin':
                    mark['source_commit'] = 'controlled-old-revision'
                elif variant == 'invalid saved pin':
                    mark['source_commit'] = 'https://invalid.example/controlled-pin'
                else:
                    del mark['source_commit']
                    del mark['offset']
                context, new_page, ledger = environment([mark])
                page = new_page()
                read(page, mn)
                region = note_region(page, mn)
                if variant != 'legacy saved pin':
                    expect(region.locator('textarea')).to_have_count(0)
                    expect(opener(page, mn)).to_have_count(0)
                    expect(region.get_by_role('link', name='See saved bookmark and note', exact=True)).to_have_attribute('href', '#saved')
                    assert mark['note'] not in region.inner_text()
                else:
                    expect(region).to_contain_text(re.compile('unversioned|no source version', re.I))
                    _, field = editor(page, mn)
                    expect(field).to_have_value(mark['note'])
                assert profile(page)['saved'] == [mark]
                saved(page)
                box = find_saved(page, mark)
                expect(box.get_by_label('Your personal note', exact=True)).to_have_value(mark['note'])
                assert exported(page) == [mark]
                replacement = PRIVATE + variant + ' explicitly edited in Saved'
                box.get_by_label('Your personal note', exact=True).fill(replacement)
                box.get_by_role('button', name='Save note', exact=True).click()
                expect(page.locator('#status')).to_contain_text('Personal note saved')
                assert profile(page)['saved'] == [{**mark, 'note': replacement}]
                audit(page, ledger, variant + ' preserved in Saved without metadata upgrade')
                passed(variant + ': association safeguards keep notes exportable/editable in Saved and never silently upgrade pin or position')
                context.close()

            context, new_page, ledger = environment([], invalid_response=True)
            page = new_page()
            page.goto(href(mn['context']))
            expect(page.locator('#status').filter(has_text='Opening')).to_have_count(0)
            expect(page.locator('#view')).to_contain_text(re.compile('invalid|unsupported', re.I))
            expect(page.locator('.personal-note textarea')).to_have_count(0)
            expect(page.get_by_role('button', name=re.compile(r'^(Add personal note|View\/edit personal note)$'))).to_have_count(0)
            assert profile(page)['saved'] == []
            privacy(page, ledger)
            passed('explicit invalid current-source revision fixture cannot create or associate a reading note')
            context.close()

            context, new_page, ledger = environment(capacity)
            page = new_page()
            read(page, mn)
            opener(page, mn).click()
            expect(page.locator('#status')).to_contain_text('500')
            assert profile(page)['saved'] == capacity
            saved(page)
            assert exported(page) == capacity
            audit(page, ledger, 'full saved capacity refuses eviction')
            passed('500 actual source-pinned bookmarks prevent a new note without evicting, altering or hiding existing personal records')
            context.close()
        browser.close()

    result = {'passed': len(checks), 'checks': checks, 'outside_source_tree': bool(args.server_dir),
              'actual_sources': [{'name': s['name'], 'context': s['context'], 'ref': s['mark']['ref'], 'offset': s['mark']['offset'],
                                  'source_commit': s['mark']['source_commit']} for s in sources],
              'a11y': {'scans': len(scans), 'violations': sum(len(x['violations']) for x in scans), 'results': scans},
              'limits': 'Actual bundled canonical Pāli, complete source book, direct commentary and post-canonical source IDs/references/revisions; synthetic personal notes only. Old/invalid metadata and quota denial are explicit fixtures; two tabs are real same-origin pages. Private payloads are blocked before any accidental request. Font30px; reading-position saving disabled. No English/publisher fetch, source-body generation, atomic storage/CAS, physical-device, native printer or human accessibility certification.'}
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
