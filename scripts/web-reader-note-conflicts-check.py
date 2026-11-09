#!/usr/bin/env python3
"""Explicit personal-note choices against actual saved source identities; no publisher fetch."""
import argparse, copy, json, os, pathlib, socket, subprocess, time, urllib.parse, urllib.request
from playwright.sync_api import expect, sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY, FORMAT, PRIVATE = 'pali-library-v1', 'pali-library-study-backup-v1', 'PRIVATE_NOTE_CONFLICT_'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--report'); parser.add_argument('--a11y', action='store_true'); parser.add_argument('--server-dir', type=pathlib.Path)
args = parser.parse_args(); started = time.monotonic()
server_dir = args.server_dir.resolve() if args.server_dir else ROOT / 'server'
with socket.socket() as sock: sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'; checks, scans = [], []
server = subprocess.Popen(['node', str(server_dir / 'http.cjs')], cwd='/tmp' if args.server_dir else ROOT,
    env={**os.environ, 'PORT': str(port), 'HOST': '127.0.0.1', 'RATE_LIMIT_PER_MINUTE': '0'}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def compact(value): return json.dumps(value, ensure_ascii=False, separators=(',', ':'))
def tool(name, arguments):
    body = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call', 'params': {'name': name, 'arguments': arguments}}
    request = urllib.request.Request(base + '/mcp', data=compact(body).encode(), headers={'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream'})
    result = json.load(urllib.request.urlopen(request, timeout=30))['result']; assert not result.get('isError'), result
    return result['structuredContent']
def revision(data): return data['source'].get('locator_revision', data['source']['commit'])
def mark(data, selector):
    index, segment = next((i, s) for i, s in enumerate(data['segments']) if s['type'] != 'heading')
    return {'uid': selector, 'ref': segment['ref'], 'offset': data['offset'] + index, 'source_commit': revision(data),
            'title': data.get('title') or data.get('book', {}).get('title') or data.get('citation') or data['book_id'], 'note': ''}
def backup(saved, progress=None, resume=None): return {'format': FORMAT, 'saved': copy.deepcopy(saved), 'progress': copy.deepcopy(progress or []), 'resume': resume}
def locator(context, row): return '#read?' + urllib.parse.urlencode({**context, 'offset': row['offset'], 'ref': row['ref'], 'source': row['source_commit']})
def profile(page): return page.evaluate('key=>JSON.parse(localStorage.getItem(key))', KEY)
def stored(page): return page.evaluate('key=>localStorage.getItem(key)', KEY)
def identity(row): return row['uid'], row['ref']
def effective(rows, drafts):
    return [{**r, 'note': drafts.get(identity(r), r['note'])} for r in rows]
def normalized(value): return value.replace('\r\n', '\n').replace('\r', '\n')
def reply(route, value):
    route.fulfill(status=200, content_type='application/json', body=compact({'jsonrpc': '2.0', 'id': route.request.post_data_json['id'], 'result': {'structuredContent': value}}))

try:
    for _ in range(100):
        try: urllib.request.urlopen(base + '/healthz', timeout=1); break
        except Exception: time.sleep(.1)
    else: raise AssertionError('Bundled server did not become ready')
    book_id = tool('browse_canon', {'node': 'books', 'limit': 60})['items'][0]['read_with']['book']
    commentary_id = tool('get_commentary', {'uid': 'commentary', 'limit': 40})['books'][0]['uid']
    post_id = tool('get_post_canonical', {'limit': 40})['items'][0]['id']
    data = [tool('get_text', {'uid': 'mn10', 'limit': 30}), tool('get_text', {'book': book_id, 'limit': 30}),
            tool('get_commentary', {'uid': commentary_id, 'limit': 30}), tool('get_post_canonical', {'citation': post_id, 'limit': 30})]
    selectors = ['mn10', 'book:' + book_id, commentary_id, 'post:' + post_id]
    sources = [mark(d, uid) for d, uid in zip(data, selectors)]
    source_receipts = [{'uid': r['uid'], 'ref': r['ref'], 'offset': r['offset'], 'revision': r['source_commit'],
                        'attribution': d['source'].get('attribution'), 'terms': d['source'].get('terms')} for r, d in zip(sources, data)]
    extra = [{**sources[1], 'ref': s['ref'], 'offset': data[1]['offset'] + i} for i, s in enumerate(data[1]['segments']) if s['ref'] != sources[1]['ref']][:12]
    assert len(extra) == 12 and len({identity(r) for r in sources + extra}) == 16
    current = [{**r, 'note': PRIVATE + 'durable ' + str(i) + '\r\na\u0304 😀'} for i, r in enumerate(sources)]
    incoming = [{**r, 'title': PRIVATE + 'incoming title must not replace current metadata',
                 'note': PRIVATE + 'incoming ' + str(i) + '\r\nā\u0301 😀 <img src=x onerror=window.conflictInjected=true>'} for i, r in enumerate(sources)]
    incoming[2]['note'] = ''
    current_resume, peer_resume = locator({'uid': 'mn10'}, sources[0]), locator({'book': book_id}, sources[1])
    catalog = tool('reading_plan', {}); plan = next(p for p in catalog['plans'] if p['days'] >= 2); marks = []
    for n in [1, 2]:
        day = tool('reading_plan', {'name': plan['name'], 'day': n})
        sig = compact({'name': day['name'], 'day': day['day'], 'source': day['source']['pali']['commit'],
                       'readings': [{'id': r['id'], 'offset': r['get_text'].get('offset', 0), 'limit': r['get_text'].get('limit'), 'part': r.get('part'), 'of': r.get('of')} for r in day['readings']]})
        marks.append({'name': day['name'], 'day': day['day'], 'signature': sig})

    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER', '/usr/bin/chromium'), headless=True)
        engine = {'actual': browser.browser_type.name, 'version': browser.version}
        expect.set_options(timeout=30000)
        for width, theme in [(w, t) for w in [320, 390, 768, 1280] for t in (['light', 'dark'] if args.a11y else ['light'])]:
            def passed(name):
                checks.append({'width': width, 'theme': theme, 'check': name}); print(f'{width}px {theme}: {name}', flush=True)
            def environment(rows=None, progress=None, resume=current_resume, remember=True):
                seed = {'theme': theme, 'font': 30, 'remember_position': remember, 'saved': copy.deepcopy(current if rows is None else rows),
                        'reading_progress': copy.deepcopy(marks[:1] if progress is None else progress), 'last': resume}
                context = browser.new_context(viewport={'width': width, 'height': 900}, bypass_csp=args.a11y)
                context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1'," + json.dumps(compact(seed)) + ");" +
                    "window.conflictDenyWrites=false;window.conflictWrites=[];const conflictSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pali-library-v1'){window.conflictWrites.push(v);if(window.conflictDenyWrites)throw Error('Controlled note conflict quota denial')}return conflictSet.call(this,k,v)};" +
                    "window.conflictHoldFile=false;window.conflictHeldFiles=[];const conflictText=File.prototype.text;File.prototype.text=function(){const result=conflictText.call(this);if(!window.conflictHoldFile)return result;window.conflictHoldFile=false;document.documentElement.setAttribute('data-conflict-file-held','true');return new Promise(resolve=>window.conflictHeldFiles.push(()=>result.then(text=>{resolve(text);requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.setAttribute('data-conflict-file-released','true')))})))};" +
                    "window.conflictObserveCatalogue=false;const conflictFetch=window.fetch.bind(window);window.fetch=async(url,options)=>{const observe=window.conflictObserveCatalogue&&JSON.parse(options?.body||'{}').params?.name==='reading_plan';if(observe)window.conflictObserveCatalogue=false;const response=await conflictFetch(url,options);if(observe){await response.clone().text();document.documentElement.setAttribute('data-conflict-catalog-complete','true')}return response};")
                state = {'calls': [], 'forbidden': [], 'errors': [], 'catalog': 'block', 'held': []}
                def intercept(route):
                    request = route.request
                    if not request.url.startswith(base + '/') or PRIVATE in urllib.parse.unquote(request.url) or PRIVATE in (request.post_data or ''):
                        state['forbidden'].append(request.url); route.abort()
                    elif request.method == 'POST' and request.url.endswith('/mcp'):
                        params = request.post_data_json.get('params', {}); state['calls'].append(copy.deepcopy(params))
                        if params != {'name': 'reading_plan', 'arguments': {}} or state['catalog'] == 'block':
                            state['forbidden'].append(params); route.abort()
                        elif state['catalog'] == 'hold':
                            state['held'].append(route); request.frame.evaluate("document.documentElement.setAttribute('data-conflict-catalog-held','true')")
                        else: route.continue_()
                    else: route.continue_()
                context.route('**/*', intercept)
                def new_page():
                    page = context.new_page(); page.set_default_timeout(30000)
                    page.on('pageerror', lambda e: state['errors'].append(str(e))); return page
                return context, new_page, state, seed
            def open_backup(page):
                page.goto(base + '/#backup'); expect(page.get_by_role('heading', name='Study backup', exact=True)).to_be_visible()
            def saved(page):
                page.goto(base + '/#saved'); expect(page.get_by_role('heading', name='Saved passages', exact=True)).to_be_visible()
            def saved_item(page, row):
                return page.get_by_role('region', name='Saved passage results', exact=True).locator('article').filter(has=page.get_by_text(row['title'] + ' · ' + row['ref'], exact=True))
            def draft(page, row, value):
                page.get_by_label('Search saved passages and notes', exact=True).fill(row['ref'])
                field = saved_item(page, row).get_by_label('Your personal note', exact=True); expect(field).to_be_visible(); field.fill(value)
            def upload(page, value):
                field = page.get_by_label('Restore study backup from JSON', exact=True)
                field.set_input_files({'name': PRIVATE + '<img onerror=window.conflictInjected=true>.json', 'mimeType': 'application/json', 'buffer': compact(value).encode()})
                expect(field).to_have_value('')
            def preview(page):
                section = page.get_by_role('region', name='Study backup preview', exact=True)
                expect(section.get_by_role('heading', name='Review study backup', exact=True)).to_be_visible()
                expect(section.get_by_role('button', name='Apply study backup', exact=True)).to_be_enabled(); return section
            def review(page): return page.get_by_role('region', name='Review personal note differences', exact=True)
            def row(page, item): return review(page).get_by_role('article', name='Note difference ' + item['uid'] + ' · ' + item['ref'], exact=True)
            def choose(page, item): return page.get_by_label('Use incoming note for ' + item['uid'] + ' · ' + item['ref'], exact=True)
            def note_field(page, item, incoming_note=False):
                return page.get_by_label(('Incoming personal note' if incoming_note else 'Note before restore (including draft)') + ' · ' + item['uid'] + ' · ' + item['ref'], exact=True)
            def download(page, name='Download study backup', recovery=False):
                scope = page.locator('#storage-recovery') if recovery else page.locator('#view')
                with page.expect_download() as info: scope.get_by_role('button', name=name, exact=True).click()
                assert info.value.suggested_filename == 'pali-library-study-backup.json'
                result = json.loads(pathlib.Path(info.value.path()).read_text(encoding='utf-8')); assert set(result) == {'format', 'saved', 'progress', 'resume'}
                return result
            def apply(page):
                button = page.get_by_role('button', name='Apply study backup', exact=True); button.focus(); page.keyboard.press('Enter')
                done = page.get_by_role('heading', name='Study backup restored in this browser', exact=True); expect(done).to_be_visible(); expect(done).to_be_focused()
                expect(button).to_be_disabled(); expect(page).to_have_url(base + '/#backup')
            def settle(page): page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
            def privacy(page, state):
                assert PRIVATE not in urllib.parse.unquote(page.url) and PRIVATE not in page.title()
                assert not state['forbidden'] and not state['errors'], state
                assert page.evaluate('window.conflictInjected') is None
                expect(page.locator('#view img, #view script')).to_have_count(0)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (width, theme)
            def audit(page, state, stage):
                privacy(page, state)
                if not args.a11y: return
                page.add_script_tag(path=str(ROOT / 'node_modules/axe-core/axe.min.js'))
                result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width': width, 'theme': theme, 'state': stage, 'violations': [{'id': v['id'], 'targets': [n['target'] for n in v['nodes']]} for v in result['violations']]})

            # Default choices compare effective drafts without changing personal data.
            context, new_page, state, seed = environment(); page = new_page(); saved(page)
            drafts = {identity(current[0]): '', identity(current[1]): PRIVATE + 'unsaved target draft 😀'}
            for item in current[:2]: draft(page, item, drafts[identity(item)])
            open_backup(page); before = stored(page); upload(page, backup(incoming, resume=peer_resume)); preview(page)
            expect(review(page)).to_contain_text('Personal note differences · not scripture')
            expect(review(page).get_by_text('Showing note differences 1–4 of 4', exact=True)).to_be_visible()
            for old, new in zip(effective(current, drafts), incoming):
                expect(choose(page, old)).not_to_be_checked(); expect(note_field(page, old)).to_have_value(normalized(old['note']))
                expect(note_field(page, old, True)).to_have_value(normalized(new['note']))
                assert note_field(page, old).get_attribute('readonly') is not None and note_field(page, old, True).get_attribute('readonly') is not None
                expect(row(page, old)).to_contain_text(old['source_commit']); expect(row(page, old)).to_contain_text('source offset: ' + str(old['offset']))
            expect(page.get_by_label('Restore incoming reading position', exact=True)).not_to_be_checked()
            assert stored(page) == before and not state['calls']
            assert download(page, 'Download current study backup') == backup(effective(current, drafts), marks[:1], current_resume)
            audit(page, state, 'all four source identities and default-off personal note differences')
            passed('all four actual pinned source types show effective current drafts and incoming private notes read-only; choices default off, current backup preserves raw Unicode/CRLF, and preview sends no MCP')
            apply(page); assert profile(page) == seed
            assert download(page) == backup(effective(current, drafts), marks[:1], current_resume)
            passed('default Apply keeps every current durable note, unsaved draft, source/title/offset, plan mark and reading pointer')
            context.close()

            # Note-only replacements clear selected drafts after a durable write.
            context, new_page, state, seed = environment(); page = new_page(); saved(page)
            drafts = {identity(current[0]): '', identity(current[1]): PRIVATE + 'unselected nonempty draft', identity(current[2]): PRIVATE + 'selected clear draft', identity(current[3]): ''}
            for item in current: draft(page, item, drafts[identity(item)])
            open_backup(page); upload(page, backup(incoming, resume=peer_resume)); preview(page); before = stored(page)
            for item in [current[0], current[2]]: choose(page, item).focus(); page.keyboard.press('Space'); expect(choose(page, item)).to_be_checked()
            expect(review(page).get_by_text('2 incoming notes selected', exact=True)).to_be_visible()
            expect(row(page, current[2])).to_contain_text('The incoming note is empty.')
            review(page).get_by_role('button', name='Clear incoming note choices', exact=True).click()
            for item in current: expect(choose(page, item)).not_to_be_checked()
            for item in [current[0], current[2]]: choose(page, item).check()
            assert stored(page) == before and not state['calls']; audit(page, state, 'explicit selected note and empty-note clear before durable Apply')
            apply(page)
            selected = {identity(current[0]), identity(current[2])}
            expected = [{**old, 'note': new['note']} if identity(old) in selected else copy.deepcopy(old) for old, new in zip(current, incoming)]
            assert profile(page) == {**seed, 'saved': expected}
            remaining = {k: v for k, v in drafts.items() if k not in selected}
            assert download(page) == backup(effective(expected, remaining), marks[:1], current_resume)
            assert profile(page)['saved'][0]['note'].encode() == incoming[0]['note'].encode() and '\r\n' in profile(page)['saved'][0]['note']
            passed('keyboard-selected incoming raw Unicode/CRLF and explicit empty clearing replace only note strings; selected empty/nonempty drafts retire after save while unselected drafts and all metadata persist')
            page.reload(); expect(page.get_by_role('heading', name='Study backup', exact=True)).to_be_visible()
            assert download(page) == backup(expected, marks[:1], current_resume); privacy(page, state)
            passed('reload retains the exact confirmed incoming note bytes and existing source metadata without source/catalogue requests')
            context.close()

            # Selections survive pagination, including a later-page actual book ref.
            paged_current = copy.deepcopy(current) + [{**r, 'note': PRIVATE + 'page current ' + str(i)} for i, r in enumerate(extra)]
            paged_incoming = [{**r, 'title': PRIVATE + 'incoming title', 'note': PRIVATE + 'page incoming ' + str(i)} for i, r in enumerate(paged_current)]
            old_mark = copy.deepcopy(marks[0]); sig = json.loads(old_mark['signature']); sig['source'] = 'controlled-existing-plan-revision'; old_mark['signature'] = compact(sig)
            context, new_page, state, seed = environment(paged_current, [old_mark]); page = new_page(); open_backup(page); state['catalog'] = 'allow'
            upload(page, backup(paged_incoming, marks, peer_resume)); preview(page)
            expect(review(page).get_by_role('article')).to_have_count(10); choose(page, paged_current[0]).check()
            review(page).get_by_role('button', name='Next note differences', exact=True).click()
            expect(review(page).get_by_text('Showing note differences 11–16 of 16', exact=True)).to_be_focused(); expect(review(page).get_by_role('article')).to_have_count(6)
            choose(page, paged_current[-1]).check(); review(page).get_by_role('button', name='Previous note differences', exact=True).click(); expect(choose(page, paged_current[0])).to_be_checked()
            expect(review(page).get_by_text('2 incoming notes selected', exact=True)).to_be_visible(); audit(page, state, 'paged personal conflict choices and constant plan catalogue request')
            apply(page)
            expected = [{**r, 'note': paged_incoming[i]['note']} if i in [0, 15] else r for i, r in enumerate(paged_current)]
            assert profile(page) == {**seed, 'saved': expected, 'reading_progress': [old_mark, marks[1]]}
            assert download(page) == backup(expected, [old_mark, marks[1]], current_resume)
            assert state['calls'] == [{'name': 'reading_plan', 'arguments': {}}]
            passed('ten-row pagination preserves explicit choices across pages; only selected notes change, current conflicting plan mark/pointer stay and new actual mark uses only constant reading_plan({})')
            context.close()

            # Ineligible pins expose no choice; a retired eligible callback cannot carry authority.
            context, new_page, state, seed = environment(); page = new_page(); open_backup(page)
            upload(page, backup(incoming)); preview(page); retired_choice = choose(page, current[0]).element_handle(); retired_apply = page.get_by_role('button', name='Apply study backup', exact=True).element_handle()
            ineligible = copy.deepcopy(incoming); ineligible[0]['source_commit'] = 'controlled-old-note-revision'; ineligible[1]['offset'] += 1
            del ineligible[2]['source_commit']; del ineligible[2]['offset']; ineligible[3]['offset'] += 1
            upload(page, backup(ineligible)); preview(page)
            expect(review(page).get_by_role('checkbox')).to_have_count(0)
            for item in current: expect(row(page, item)).to_contain_text('Read-only difference:')
            retired_choice.evaluate("(e)=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}"); retired_apply.evaluate('(e)=>e.click()')
            expect(review(page).get_by_text('0 incoming notes selected', exact=True)).to_be_visible(); assert profile(page) == seed
            audit(page, state, 'stale/legacy/offset mismatch read-only differences and retired eligibility callback')
            apply(page); assert profile(page) == seed and not state['calls']
            passed('stale revisions, legacy references and mismatched offsets offer no choice or source lookup; old eligible controls cannot force replacement in a newer ineligible preview')
            context.close()

            # Failed selected-note writes preserve both durable state and draft recovery.
            for fault in ['quota', 'peer private change']:
                context, new_page, state, seed = environment(); page = new_page(); saved(page)
                pending = PRIVATE + fault + ' selected unsaved draft'; draft(page, current[0], pending); open_backup(page); upload(page, backup(incoming)); preview(page); choose(page, current[0]).check()
                if fault == 'quota': page.evaluate('window.conflictDenyWrites=true'); durable = seed
                else:
                    peer = new_page(); open_backup(peer)
                    peer.evaluate("note=>{const x=JSON.parse(localStorage.getItem('pali-library-v1'));x.saved[3].note=note;localStorage.setItem('pali-library-v1',JSON.stringify(x))}", PRIVATE + 'newer peer note')
                    durable = {**seed, 'saved': [*current[:3], {**current[3], 'note': PRIVATE + 'newer peer note'}]}
                page.get_by_role('button', name='Apply study backup', exact=True).click(); expect(page.locator('#storage-recovery')).to_be_visible()
                assert profile(page) == durable
                assert download(page, recovery=True) == backup([{**current[0], 'note': pending}, *current[1:]], marks[:1], current_resume)
                expect(page.get_by_role('heading', name='Study backup restored in this browser', exact=True)).to_have_count(0)
                audit(page, state, fault + ' preserves selected draft after failed note replacement')
                if fault == 'quota':
                    page.evaluate('window.conflictDenyWrites=false'); apply(page)
                    expected = [{**current[0], 'note': incoming[0]['note']}, *current[1:]]
                    assert profile(page) == {**seed, 'saved': expected}; assert download(page) == backup(expected, marks[:1], current_resume)
                passed(fault + ': selected note is not half-applied and its draft remains recoverable; only a later confirmed quota retry can retire it')
                context.close()

            # Cancel/new-file/route epochs never transfer a private-note selection.
            context, new_page, state, seed = environment(); page = new_page(); open_backup(page); upload(page, backup(incoming)); preview(page); choose(page, current[0]).check()
            retired_choice = choose(page, current[0]).element_handle(); retired_apply = page.get_by_role('button', name='Apply study backup', exact=True).element_handle()
            page.get_by_role('button', name='Cancel restore', exact=True).focus(); page.keyboard.press('Enter')
            expect(page.get_by_label('Restore study backup from JSON', exact=True)).to_be_focused(); expect(page.locator('[aria-label="Study backup preview"]')).to_be_empty()
            retired_choice.evaluate("(e)=>{e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}))}"); retired_apply.evaluate('(e)=>e.click()'); assert profile(page) == seed
            upload(page, backup(incoming)); preview(page); expect(choose(page, current[0])).not_to_be_checked(); choose(page, current[0]).check()
            replacement = [{**r, 'note': PRIVATE + 'new-file note ' + str(i)} for i, r in enumerate(incoming)]
            upload(page, backup(replacement)); preview(page); expect(choose(page, current[0])).not_to_be_checked(); expect(note_field(page, current[0], True)).to_have_value(replacement[0]['note'])
            retired_apply = page.get_by_role('button', name='Apply study backup', exact=True).element_handle()
            saved(page); latest = PRIVATE + 'newer draft after review navigation'; draft(page, current[0], latest); retired_apply.evaluate('(e)=>e.click()')
            open_backup(page); assert profile(page) == seed; assert download(page) == backup([{**current[0], 'note': latest}, *current[1:]], marks[:1], current_resume)
            audit(page, state, 'cancel/new file/route invalidate old personal-note selections')
            passed('Cancel, replacement file and route changes reset unchecked choices; retired private-note callbacks cannot mutate a newer draft or storage')
            context.close()

            if width == 390 and theme == 'light':
                # A slow old file and catalogue must not restore a superseded selection.
                context, new_page, state, seed = environment(); page = new_page(); open_backup(page)
                page.evaluate("()=>{window.conflictHoldFile=true;document.documentElement.removeAttribute('data-conflict-file-released')}")
                upload(page, backup(incoming)); expect(page.locator('html')).to_have_attribute('data-conflict-file-held', 'true')
                replacement = [{**r, 'note': PRIVATE + 'winning file ' + str(i)} for i, r in enumerate(incoming)]
                upload(page, backup(replacement)); preview(page); choose(page, current[0]).check()
                page.evaluate('window.conflictHeldFiles.shift()()'); expect(page.locator('html')).to_have_attribute('data-conflict-file-released', 'true')
                expect(note_field(page, current[0], True)).to_have_value(replacement[0]['note']); expect(choose(page, current[0])).to_be_checked()
                apply(page); assert profile(page) == {**seed, 'saved': [{**current[0], 'note': replacement[0]['note']}, *current[1:]]}
                passed('actual delayed File.text completion cannot replace a newer file or its explicit note choice')
                context.close()
                context, new_page, state, seed = environment(); page = new_page(); open_backup(page); state['catalog'] = 'hold'
                page.evaluate("()=>{window.conflictObserveCatalogue=true;document.documentElement.removeAttribute('data-conflict-catalog-complete')}")
                upload(page, backup(incoming, marks)); expect(page.locator('html')).to_have_attribute('data-conflict-catalog-held', 'true')
                upload(page, backup(replacement)); preview(page); choose(page, current[0]).check()
                for held in state['held']: reply(held, catalog)
                expect(page.locator('html')).to_have_attribute('data-conflict-catalog-complete', 'true'); settle(page)
                expect(note_field(page, current[0], True)).to_have_value(replacement[0]['note']); expect(choose(page, current[0])).to_be_checked(); assert profile(page) == seed
                assert state['calls'] == [{'name': 'reading_plan', 'arguments': {}}]
                audit(page, state, 'late catalogue cannot replace a new local-note preview')
                passed('late actual plan-catalogue response cannot resurrect an older file, note choices or marks')
                context.close()
                # A selected note plus failed selected-resume write must restore the raw baseline.
                context, new_page, state, seed = environment(); page, peer = new_page(), new_page(); saved(page)
                pending = PRIVATE + 'selected draft before pointer rollback'; unrelated = PRIVATE + 'unrelated draft after quota'
                draft(page, current[0], pending); draft(page, current[1], unrelated); open_backup(peer)
                peer.evaluate("pointer=>{const x=JSON.parse(localStorage.getItem('pali-library-v1'));x.last=pointer;localStorage.setItem('pali-library-v1',JSON.stringify(x))}", peer_resume)
                open_backup(page); upload(page, backup(incoming, resume=current_resume)); preview(page); choose(page, current[0]).check(); page.get_by_label('Restore incoming reading position', exact=True).check()
                page.evaluate('window.conflictDenyWrites=true'); page.get_by_role('button', name='Apply study backup', exact=True).click(); expect(page.locator('#storage-recovery')).to_be_visible()
                assert profile(page) == {**seed, 'last': peer_resume}
                assert download(page, recovery=True) == backup([{**current[0], 'note': pending}, {**current[1], 'note': unrelated}, *current[2:]], marks[:1], current_resume)
                page.evaluate('window.conflictDenyWrites=false'); saved(page); page.get_by_label('Search saved passages and notes', exact=True).fill(current[1]['ref'])
                saved_item(page, current[1]).get_by_role('button', name='Save note', exact=True).click(); expect(page.locator('#status')).to_contain_text('Personal note saved')
                assert profile(page) == {**seed, 'last': peer_resume, 'saved': [current[0], {**current[1], 'note': unrelated}, *current[2:]]}
                open_backup(page); assert download(page) == backup([{**current[0], 'note': pending}, {**current[1], 'note': unrelated}, *current[2:]], marks[:1], peer_resume)
                privacy(page, state); passed('failed selected note/resume transaction preserves peer pointer baseline and selected draft; later unrelated save cannot resurrect the old pointer')
                context.close()
        browser.close()
    result = {'status': 'passed' if not any(s['violations'] for s in scans) else 'failed', 'passed': len(checks), 'checks': checks,
              'duration_seconds': round(time.monotonic() - started, 2), 'engine': engine, 'outside_source_tree': bool(args.server_dir),
              'actual_sources': source_receipts, 'a11y': {'scans': len(scans), 'violations': sum(len(s['violations']) for s in scans), 'results': scans},
              'limits': 'Actual bundled saved identities/source pins and actual plan signatures; note texts, filenames, old pins/offsets, quota, peer edits and delayed files/catalogues are explicit private-data fixtures. No source bodies in backups, source association/upgrade, publisher fetch or incoming data sent to MCP. CRLF normalizes in textarea display; durable replacement/download retains the original raw string. Ineligible rows expose no checkbox; forced-invalid choice policy is independently tested, while this browser proves retired eligible callbacks cannot bypass new-file ineligibility. Normal contexts preserve CSP; axe contexts alone bypass it. Desktop Chromium/axe is not physical-device, OS glyph-shaping or human accessibility certification.'}
    print(json.dumps(result, indent=2))
    if args.report: pathlib.Path(args.report).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    if result['status'] != 'passed': raise SystemExit(1)
finally:
    server.terminate(); server.wait(timeout=10)
