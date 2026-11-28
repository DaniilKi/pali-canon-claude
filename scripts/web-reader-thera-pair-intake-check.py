#!/usr/bin/env python3
"""Bounded actual installed MCP and Chromium acceptance for atomic Therā pair/intake.

Source oracles are independently sealed receipts; no upstream availability claim.
Only synthetic private notes are used. Viewport/host emulation is not human/device acceptance.
"""
import argparse, copy, gzip, hashlib, importlib.util, json, os, socket, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from web_reader_apadana_intake import reviewed_intake

ROOT = Path(__file__).resolve().parents[1]
BASE = 'b5669a334add97ebc0c3c32f9b3fb45ed90d9780'
VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070'
PIN = VRI + '-apadana-thera105-106-v1'
PRIVATE = 'SYNTHETIC_PRIVATE_PAIR_ā😀'
spec = importlib.util.spec_from_file_location('scaled', ROOT/'scripts/web-reader-apadana-thera-scaled-check.py')
scaled = importlib.util.module_from_spec(spec); spec.loader.exec_module(scaled)
engine, compact = scaled.engine, scaled.compact

def digest(value):
    return hashlib.sha256(value.encode() if isinstance(value,str) else value).hexdigest()


def read_sealed(path, pin):
    raw = path.read_bytes()
    assert digest(raw) == pin, 'Independent evidence pin changed: '+path.name
    return json.loads(raw)


def baseline():
    def git(path): return subprocess.check_output(['git','show',BASE+':'+path],cwd=ROOT,stderr=subprocess.DEVNULL)
    m = json.loads(git('server/data/apadana.json'))
    parts = json.loads(git('server/data/canon.json.gz.parts.json'))
    data = b''.join(git('server/data/'+(p if isinstance(p,str) else p['file'])) for p in parts['parts'])
    return m,json.loads(gzip.decompress(data))


def pair_mcp(rpc, tool, plan, checks):
    """Every old anchor refuses, including stable wording and vanished tails."""
    count = 0
    for row in plan['units']:
        uid = row['id']; expected = row['future_segments']
        for fresh in ({'uid':uid},{'uid':uid,'limit':200}):
            data = tool('get_text',fresh)
            assert data['source']['commit'] == VRI and data['source']['locator_revision'] == PIN
        data = tool('get_text',{'uid':uid,'limit':200})
        assert [{**{k:s[k] for k in ('ref','type')},'text_sha256':digest(s['text'])} for s in data['segments']] == [{k:s[k] for k in ('ref','type','text_sha256')} for s in expected]
        opaque = rpc('get_text',{'uid':uid,'offset':0,'source_commit':'controlled-compat-old-revision'})
        assert opaque.get('isError')
        opaque_data = opaque.get('structuredContent') or json.loads(opaque['content'][0]['text'])
        assert opaque_data.get('code') == 'READING_SOURCE_CHANGED' and opaque_data['reopen'] == '#read?uid='+uid
        assert opaque_data['error'] == 'The source or citation mapping revision changed. Reopen the whole current text explicitly and compare its source positions; no replacement wording was displayed and no saved reference or note was moved.'
        for old in row['old_segments']:
            for selection in ({'uid':uid,'offset':old['offset']}, {'uid':uid,'offset':old['offset'],'source_commit':VRI}):
                assert rpc('get_text',selection).get('isError'), 'Old/unversioned offset accepted'
            for pin in (None,VRI):
                args = {'uid':uid,'segment':old['ref']}
                if pin:args['source_commit'] = pin
                assert rpc('read_passage_widget',args).get('isError'), 'Old widget exact ref accepted'
                assert rpc('analyse_passage',args).get('isError'), 'Old analysis exact ref accepted'
            count += 1
        for s in expected:
            args = {'uid':uid,'offset':s['offset'],'source_commit':PIN,'limit':1}
            actual = tool('get_text',args)
            assert actual['segments'][0]['ref'] == s['ref'] and digest(actual['segments'][0]['text']) == s['text_sha256']
            widget = tool('read_passage_widget',{'uid':uid,'segment':s['ref'],'source_commit':PIN,'english':False})
            assert digest(widget['pali']['segments'][0]['text']) == s['text_sha256']
        cursor = tool('get_text',{'uid':uid,'limit':1});page_count = 1
        while cursor['next_offset'] is not None:
            cursor = tool('get_text',{'uid':uid,'offset':cursor['next_offset'],'source_commit':PIN,'limit':1});page_count += 1
            assert page_count <= len(expected)
        assert page_count == len(expected)
        for alias in ('Tha Ap '+uid.removeprefix('tha-ap'),):
            assert tool('get_text',{'uid':alias})['text_id'] == uid
            assert rpc('get_text',{'uid':alias,'offset':0}).get('isError')
        for exact in (uid+'/2',uid+':2'):
            assert rpc('get_text',{'uid':exact}).get('isError')
        native = tool('get_text',{'uid':uid,'script':'sinhala'})
        assert native['source']['locator_revision'] == PIN and native['segments'][0]['ref'] == uid+'/1'
        analyse = tool('analyse_passage',{'uid':uid,'segment':uid+'/2','source_commit':PIN,'limit':1})
        assert digest(analyse['segment']['text']) == expected[1]['text_sha256']
        focused = tool('read_passage_widget',{'uid':uid,'segment':uid+'/2','source_commit':PIN,'english':False})
        context_command = focused['pali'].get('context_with')
        assert context_command, 'Exact widget lacks source-pinned context command'
        context_args = context_command.get('arguments',context_command)
        assert context_args['source_commit'] == PIN
        assert not rpc('read_passage_widget',context_args).get('isError')
        # Independent source receipt supplies text only via the actual checked root segment.
        quote = data['segments'][1]['text']
        verification = tool('verify_quote',{'text':quote[:1900],'language':'pali','limit':10})
        matches = [m for m in verification.get('matches',[]) if m.get('text_id',m.get('id')) == uid]
        assert matches, 'Verified whole stanza did not return its repaired source owner'
        for match in matches:
            for command in match.get('reading_commands',[match.get('read_with')]):
                if not command:continue
                args = command.get('arguments',command)
                if args.get('uid') == uid and 'offset' in args:assert args.get('source_commit') == PIN
        found = tool('search_texts',{'query':' '.join(quote.split()[:8]),'collection':uid,'english':'off','limit':10})
        assert len(found['results']) == 1 and found['results'][0]['id'] == uid
        hit = found['results'][0];read = hit['read_with'];read_args = read.get('arguments',read)
        assert read_args['source_commit'] == PIN
        tool('get_text',{k:v for k,v in read_args.items() if k != 'tool'})
    assert count == 18
    checks.append({'check':'actual MCP repaired pair current segments and all old anchors/offsets refused before wording','old_anchors':count,'new_segments':18})


def pair_widgets(html,widgets,checks):
    """Initial stale pair payload refuses before Pāli through both simulated bridges."""
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
        for bridge in ('MCP Apps','Apps SDK'):
            page = browser.new_page(viewport={'width':390,'height':900});errors=[];traffic=[]
            page.on('pageerror',lambda error:errors.append(type(error).__name__))
            page.route('**/*',lambda route:(traffic.append('unexpected request'),route.abort()))
            if bridge == 'MCP Apps':
                page.set_content('<iframe id="reader" style="width:100%;height:850px;border:0"></iframe>')
                page.evaluate("""html=>{window.messages=[];const frame=document.querySelector('iframe');window.addEventListener('message',e=>{window.messages.push(e.data);if(e.data.method==='ui/initialize')frame.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{hostContext:{theme:'light'},hostCapabilities:{serverTools:{},openLinks:{},updateModelContext:{structuredContent:{}}}}},'*');if(e.data.method==='ui/update-model-context')frame.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{}},'*')});frame.srcdoc=html}""",html)
                page.wait_for_function("window.messages.some(m=>m.method==='ui/notifications/initialized')");frame=page.frames[1]
                def send(data):page.evaluate("data=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:data}},'*')",data)
            else:
                page.evaluate("window.openai={theme:'light',setWidgetState(){},openExternal(){},callTool(){throw Error('Unexpected widget tool')}}")
                page.set_content(html);frame=page.main_frame
                def send(data):page.evaluate("data=>{window.openai.toolOutput=data;window.dispatchEvent(new Event('openai:set_globals'))}",data)
            for uid,data in widgets.items():
                send(data);expect(frame.locator('#pali .seg')).to_have_count(len(data['pali']['segments']))
                for missing in (False,True):
                    changed=copy.deepcopy(data)
                    if missing:changed['source'].pop('locator_revision')
                    else:changed['source']['locator_revision']=VRI
                    send(changed);expect(frame.locator('#title')).to_have_text('Could not open the passage')
                    expect(frame.locator('#pali .seg')).to_have_count(0);expect(frame.locator('#english .en')).to_have_count(0)
                    send(data);expect(frame.locator('#pali .seg')).to_have_count(len(data['pali']['segments']))
            assert not traffic and not errors
            checks.append({'check':'initial pair payload current pins accepted; old/missing locator refused before Pāli and English','bridge':bridge,'sources':2,'stale_cases':4,'network_requests':0})
            page.close()
        browser.close()


def pair_browser(args,base,metadata,checks,scans):
    """Saved old versions stay byte-exact; explicit reopen selects whole current poem."""
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
        for width in (390,768,1280):
            context = browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y)
            records = []
            for uid in ('tha-ap107','tha-ap108'):
                for pinned in (True,False):
                    item = {'uid':uid,'title':'Synthetic '+uid+(' versioned' if pinned else ' legacy'),'ref':uid+('/2' if pinned else '/4'),'offset':1 if pinned else 3,'note':PRIVATE+' saved '+uid+str(pinned)}
                    if pinned:item['source_commit'] = VRI
                    records.append(item)
            initial = compact({'theme':'light','remember_position':False,'saved':records,'reading_progress':[]})
            context.add_init_script('if(!localStorage.getItem('+json.dumps(engine.KEY)+'))localStorage.setItem('+json.dumps(engine.KEY)+','+json.dumps(initial)+')')
            failures, errors, calls = [],[],[]
            def intercept(route):
                request = route.request
                if not request.url.startswith(base+'/') or 'SYNTHETIC_PRIVATE_PAIR' in request.url or 'SYNTHETIC_PRIVATE_PAIR' in (request.post_data or '') or any('SYNTHETIC_PRIVATE_PAIR' in h for h in request.headers.values()):
                    failures.append('External/private network request');route.abort();return
                if request.method == 'POST' and request.url.endswith('/mcp'):calls.append(request.post_data_json.get('params',{}))
                route.continue_()
            context.route('**/*',intercept)
            page = context.new_page();page.on('pageerror',lambda error:errors.append(type(error).__name__))
            page.set_default_timeout(15000)
            engine.saved(page,base)
            field = page.get_by_label('Your personal note',exact=True).first
            field.fill(PRIVATE+' unsaved independent tab')
            second = context.new_page();engine.saved(second,base)
            expect(second.get_by_label('Your personal note',exact=True).first).to_have_value(records[0]['note'])
            for item in records:
                engine.saved(page,base)
                link = engine.bookmark_link(page,item);link.focus();page.keyboard.press('Enter')
                expect(page.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible()
                expect(page.locator('.passage')).to_have_count(0)
                reopen = page.get_by_role('link',name='Reopen whole current text · saved references stay unchanged',exact=True)
                assert reopen.get_attribute('href') == '#read?uid='+item['uid']
                reopen.focus();page.keyboard.press('Enter')
                expect(page.locator('.segment-label a').first).to_have_text(item['uid']+'/1');engine.loaded(page)
                assert page.url.endswith('/#read?uid='+item['uid'])
                assert page.locator('.passage').first.inner_text() == metadata[item['uid']]['segments'][0]['text']
                assert 'SYNTHETIC_PRIVATE_PAIR' not in page.locator('#content').text_content()
                assert engine.profile(page)['saved'] == records
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                if args.a11y:
                    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
                    result = page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'width':width,'state':'pair explicit reopen '+item['uid'],'violations':[v['id'] for v in result['violations']]})
            before_opaque = page.evaluate("sessionStorage.getItem('pali-library-note-drafts-v1')")
            page.goto(base+'/#read?uid=tha-ap108&ref=tha-ap108%2F2&offset=1&source=controlled-compat-old-revision')
            expect(page.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible()
            expect(page.locator('#content .notice')).to_have_text('The source or citation mapping revision changed. Reopen the whole current text explicitly and compare its source positions; no replacement wording was displayed and no saved reference or note was moved.')
            expect(page.locator('.passage')).to_have_count(0)
            expect(page.locator('#content textarea')).to_have_count(0)
            assert page.get_by_role('link',name='Reopen whole current text · saved references stay unchanged',exact=True).get_attribute('href') == '#read?uid=tha-ap108'
            assert engine.profile(page)['saved'] == records
            assert page.evaluate("sessionStorage.getItem('pali-library-note-drafts-v1')") == before_opaque
            # A newly selected unambiguous position can be saved with the current pin.
            page.goto(base+'/#read?uid=tha-ap108')
            expect(page.locator('.segment-label a').first).to_have_text('tha-ap108/1');engine.loaded(page)
            collision = page.locator('section[aria-label="Pāli passage"] .segment').nth(1)
            expect(collision.get_by_role('button',name='Save passage tha-ap108/2',exact=True)).to_be_disabled()
            expect(collision).to_contain_text('Saved reference needs review')
            expect(collision).to_contain_text('No personal note was associated with this reading.')
            expect(collision.locator('textarea')).to_have_count(0)
            assert engine.profile(page)['saved'] == records
            assert PRIVATE+' unsaved independent tab' in page.evaluate("sessionStorage.getItem('pali-library-note-drafts-v1')")
            segment = page.locator('section[aria-label="Pāli passage"] .segment').nth(2)
            segment.get_by_role('button',name='Save passage tha-ap108/3',exact=True).click()
            fresh = engine.profile(page)['saved'][-1]
            assert fresh['source_commit'] == PIN and fresh['ref'] == 'tha-ap108/3' and fresh['offset'] == 2
            engine.saved(page,base);engine.bookmark_link(page,fresh)
            page.get_by_label('Your personal note',exact=True).fill(PRIVATE+' current saved note')
            page.get_by_role('button',name='Save note',exact=True).click()
            fresh = {**fresh,'note':PRIVATE+' current saved note'}
            assert engine.profile(page)['saved'] == [*records,fresh]
            engine.bookmark_link(page,fresh).focus();page.keyboard.press('Enter')
            expect(page.locator('.segment-label a').first).to_have_text('tha-ap108/3');engine.loaded(page)
            assert page.locator('.passage').first.inner_text() == metadata['tha-ap108']['segments'][2]['text']
            engine.saved(page,base);page.reload()
            expect(page.get_by_label('Your personal note',exact=True).first).to_have_value(PRIVATE+' unsaved independent tab')
            with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
            path = Path(download.value.path()); exported = json.loads(path.read_text())
            assert exported['saved'] == [{**records[0],'note':PRIVATE+' unsaved independent tab'},*records[1:],fresh]
            assert engine.profile(page)['saved'] == [*records,fresh] and engine.profile(second)['saved'][:4] == records
            # Import the real download in a fresh browser context through the ordinary UI.
            restored = browser.new_context(viewport={'width':width,'height':900});restored.route('**/*',intercept)
            imported = restored.new_page();engine.saved(imported,base)
            imported.get_by_label('Restore bookmarks and notes from a JSON export',exact=True).set_input_files(str(path))
            imported.get_by_role('button',name='Add 5 new bookmarks',exact=True).click()
            assert engine.profile(imported)['saved'] == exported['saved']
            engine.bookmark_link(imported,records[0]).click()
            expect(imported.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible()
            assert not failures and not errors
            checks.append({'check':'paired legacy/current and opaque-old source review; keyboard whole reopen; current-collision refusal; local draft/reload/export/reimport and independent second tab','width':width,'saved_records':5,'network_private_bytes':0})
            restored.close();context.close()
            if width == 390:
                # Retain the initial pilot's ambiguous fixture as a negative case.
                duplicate = [records[0],{**records[0],'title':'Synthetic duplicate legacy','note':PRIVATE+' conflicting saved'}]
                duplicate[1].pop('source_commit')
                recovery = browser.new_context(viewport={'width':width,'height':900});recovery.route('**/*',intercept)
                seed = compact({'saved':duplicate,'reading_progress':[],'remember_position':False})
                recovery.add_init_script('if(!localStorage.getItem('+json.dumps(engine.KEY)+'))localStorage.setItem('+json.dumps(engine.KEY)+','+json.dumps(seed)+')')
                negative = recovery.new_page();engine.saved(negative,base)
                negative.get_by_label('Your personal note',exact=True).first.fill(PRIVATE+' ambiguous draft preserved')
                journal = negative.evaluate("sessionStorage.getItem('pali-library-note-drafts-v1')")
                assert journal and PRIVATE+' ambiguous draft preserved' in journal
                negative.reload();engine.loaded(negative)
                assert negative.evaluate("sessionStorage.getItem('pali-library-note-drafts-v1')") == journal
                assert engine.profile(negative)['saved'] == duplicate
                expect(negative.get_by_label('Your personal note',exact=True).first).to_have_value(duplicate[0]['note'])
                pending = negative.locator('#draft-recovery')
                expect(pending.get_by_label('Recovered unsaved personal note · tha-ap107/2',exact=True)).to_have_value(PRIVATE+' ambiguous draft preserved')
                expect(pending).to_contain_text('ambiguous-bookmark')
                with negative.expect_download() as receipt:pending.get_by_role('button',name='Download recovered notes',exact=True).click()
                assert json.loads(Path(receipt.value.path()).read_text()) == json.loads(journal)
                checks.append({'check':'original duplicate-key fixture retained: exact draft journal preserved; ambiguous-bookmark recovery refuses inline association; actual recovery download byte-equivalent data','width':width,'ambiguous_drafts':1})
                recovery.close()
        browser.close()


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-root',required=True,type=Path)
    p.add_argument('--official-checkout',type=Path)
    p.add_argument('--approval',type=Path,default=ROOT/'docs/evidence/apadana/THERA_PAIR_INTAKE_APPROVAL.json')
    p.add_argument('--batch',choices=('101-120','121-140'),required=True)
    p.add_argument('--server-dir',type=Path)
    p.add_argument('--report',type=Path)
    p.add_argument('--pilot',action='store_true')
    p.add_argument('--pilot-poem',type=int)
    modes = p.add_mutually_exclusive_group(); modes.add_argument('--a11y',action='store_true'); modes.add_argument('--mcp-only',action='store_true')
    args = p.parse_args()
    approval = json.loads(args.approval.read_text())
    assert approval['base_commit'] == BASE
    assert approval['schema'] == 'reviewed-apadana-intake-v1'
    assert approval['status'] == 'approved'
    evidence_dir = ROOT/'docs/evidence/apadana'
    pair_descriptor = approval['pair_golden']
    pair = read_sealed(evidence_dir/pair_descriptor['file'],pair_descriptor['sha256'])
    all_evidence = [read_sealed(evidence_dir/g['file'],g['sha256']) for g in approval['goldens']]
    assert len(all_evidence) == 4 and len(pair) == 2
    low,high = map(int,args.batch.split('-'))
    evidence = [e for e in all_evidence if all(low <= g['poem'] <= high for g in e['poems'])]
    assert len(evidence) == 2, 'Both independent chapter receipts required'
    for family in ('source_reviews','rights','independent_source_approvals'):
        for seal in approval[family]:read_sealed(evidence_dir/seal['file'],seal['sha256'])
    for field in ('independent_source_approval','baseline_freeze'):
        seal=approval[field];read_sealed(evidence_dir/seal['file'],seal['sha256'])
    independent_pair = {g['id']:g for e in all_evidence for g in e['poems'] if g['id'] in pair}
    assert set(independent_pair) == set(pair) == {'tha-ap107','tha-ap108'}
    plan = {'units':[{'id':uid,'old_unit':parts['before'],'after':parts['after'],
        'future_segments':[{**seg,'offset':offset} for offset,seg in enumerate(independent_pair[uid]['root']['segments'])],
        'old_segments':[{'ref':uid+'/'+str(offset+1),'offset':offset} for offset in range({'tha-ap107':10,'tha-ap108':8}[uid])]} for uid,parts in pair.items()]}
    all_approved = set(approval['approved_ids'])
    expected = {g['id']:g for e in evidence for g in e['poems'] if g['id'] in all_approved}
    assert expected and len(expected) == sum(g['id'] in all_approved for e in evidence for g in e['poems']), 'Duplicate or empty independently curated batch'
    server_dir = (args.server_dir or ROOT/'server').resolve()
    launch_hashes = {str(p.relative_to(server_dir)):digest(p.read_bytes()) for p in sorted(server_dir.rglob('*')) if p.is_file()}
    launch_harness = digest(Path(__file__).read_bytes())
    launch_helpers = {name:digest((ROOT/'scripts'/name).read_bytes()) for name in ('web-reader-apadana-thera-scaled-check.py','web-reader-apadana-thera-expansion-check.py','web_reader_test_helpers.py')}
    manifest = json.loads((server_dir/'data/apadana.json').read_text())
    assert manifest == json.loads((ROOT/'server/data/apadana.json').read_text())
    old, canon = baseline()
    assert set(old['links']) == set(approval['baseline_ids']) and len(old['links']) == 129
    assert set(old['links'])|all_approved == set(approval['expected_profile_ids']), 'Historical D251 cohort differs'
    current_intake = reviewed_intake(ROOT)
    assert current_intake['expected_profile_ids'][:len(approval['expected_profile_ids'])] == approval['expected_profile_ids'], 'Historical168 prefix differs'
    assert set(manifest['links']) == set(current_intake['expected_profile_ids']), 'Unreviewed current activation'
    rows = manifest['links']
    for uid,row in old['links'].items():assert rows[uid] == row, 'Previous source changed: '+uid
    probe = "import{historicalF3SourceBytes}from'./tests/helpers/historical389390-source-canon.mjs';import{exactHistoricalCanonBytes}from'./tests/helpers/canon-before-four.mjs';import{gunzipSync}from'node:zlib';import{readBundled}from'./src/bundled-data.mjs';process.stdin.setEncoding('utf8');let s='';for await(const c of process.stdin)s+=c;process.stdout.write(exactHistoricalCanonBytes(historicalF3SourceBytes(gunzipSync(readBundled(JSON.parse(s))))).toString());"
    run = subprocess.run(['node','--input-type=module','-e',probe],cwd=ROOT,input=json.dumps(str(server_dir/'data/canon.json.gz')),text=True,capture_output=True)
    assert run.returncode == 0 and digest(run.stdout) == approval['after_canon_sha256'], 'Current logical canonical pin differs'
    historical_source_canon = json.loads(run.stdout)
    for row in plan['units']:
        assert next(u for u in historical_source_canon['units'] if u['id'] == row['id']) == row['after'], 'Current pair metadata differs before inverse'
    inverse = copy.deepcopy(historical_source_canon)
    for row in plan['units']:
        unit = next(u for u in inverse['units'] if u['id'] == row['id'])
        unit.clear();unit.update(row['old_unit'])
    assert inverse == canon, 'Changes beyond exact independently approved atomic pair'
    for uid,g in expected.items():
        row = rows[uid]
        for key in engine.PINS:assert row[key] == (g['root'][key] if key == 'root_sha256' else g[key])
        for key in ('poem','title','publisher_chapter','note_numbers','note_count','stanza_layout'):assert row[key] == g[key]
        for key in ('chapter_summary','collection_summary','publisher_divisions','editorial_gap'):
            actual,proof = row.get(key),g.get(key)
            assert bool(actual) == bool(proof), 'Independent source scope presence differs: '+uid+' '+key
            if not proof:continue
            actuals = actual if isinstance(actual,list) else [actual]
            proofs = proof if isinstance(proof,list) else [proof]
            for a,b in zip(actuals,proofs,strict=True):
                if 'scope' in b:assert a == b['scope']
                else:
                    for field in ('body_sha256','notes_sha256','root_sha256','first_ref','last_ref','parent_id','note_numbers','kind','label'):
                        if field in a and field in b:assert a[field] == b[field]
    checkout = args.source_root.resolve(); official = (args.official_checkout or checkout).resolve()
    env = {**os.environ,'GIT_NO_LAZY_FETCH':'1'}
    assert subprocess.check_output(['git','-C',str(official),'rev-parse','HEAD'],text=True,env=env).strip() == engine.SOURCE_REVISION
    artifacts = []
    for e in evidence:
        route = e['publisher_routing']; route = route if isinstance(route,list) else [route]
        for a in [*e['rights'],*route,*e['poems']]:
            path = (checkout/a['path']).resolve();assert path.is_relative_to(checkout)
            raw = path.read_bytes(); assert len(raw) == a['bytes'] and digest(raw) == a['raw_sha256']
            blob = hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest();assert blob == a['git_blob_sha1']
            assert subprocess.check_output(['git','-C',str(official),'rev-parse',engine.SOURCE_REVISION+':'+a['path']],text=True,env=env).strip() == blob
            artifacts.append({'path':a['path'],'sha256':a['raw_sha256'],'git_blob_sha1':blob})
    if args.pilot_poem is not None:
        assert args.pilot; expected = {u:g for u,g in expected.items() if g['poem'] == args.pilot_poem};assert len(expected) == 1
    elif args.pilot:expected = dict(list(expected.items())[:1])
    files = {rows[u]['raw_url']:str(checkout/expected[u]['path']) for u in expected}
    work_root = Path('/tmp/pali-thera-pair-browser');work_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='run-',dir=work_root) as work:
        stage = Path(work);ledger = stage/'provider.jsonl'; preload = stage/'provider.cjs'
        preload.write_text("const fs=require('node:fs'),files="+json.dumps(files)+";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);const ok=Object.hasOwn(files,url);fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify({url,ok})+'\\n');if(!ok)throw Error('Unexpected provider request');return new Response(fs.readFileSync(files[url]),{status:200,headers:{'content-type':'text/plain'}});};")
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port = sock.getsockname()[1]
        base = 'http://127.0.0.1:'+str(port)
        server = subprocess.Popen(['node','--require',str(preload),str(server_dir/'http.cjs')],cwd=stage,env={**os.environ,'HOST':'127.0.0.1','PORT':str(port),'RATE_LIMIT_PER_MINUTE':'0','CHATGPT_WIDGET':'1'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        checks,scans,receipts = [],[],[]
        def protocol(method,params):
            req = urllib.request.Request(base+'/mcp',data=compact({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
            with urllib.request.urlopen(req,timeout=90) as response:return json.load(response)['result']
        def rpc(name,arguments):return protocol('tools/call',{'name':name,'arguments':arguments})
        def tool(name,arguments):
            result = rpc(name,arguments);assert not result.get('isError'), 'MCP refused: '+name+' keys='+','.join(sorted(arguments))
            return result['structuredContent']
        try:
            for _ in range(100):
                try:urllib.request.urlopen(base+'/healthz',timeout=1).close();break
                except OSError:time.sleep(.1)
            else:raise AssertionError('Installed HTTP bundle failed startup')
            pair_mcp(rpc,tool,plan,checks)
            # Original full-book references remain under their unchanged VRI authority.
            book_id = canon['books'][36]['file'].removesuffix('.mul.xml')
            source_page = tool('get_text',{'book':book_id,'offset':0,'source_commit':VRI,'limit':200})
            assert source_page['source']['commit'] == VRI
            source_widget = tool('read_passage_widget',{'book':book_id,'segment':source_page['segments'][0]['ref'],'source_commit':VRI,'english':False})
            assert source_widget['pali']['segments'][0]['text'] == source_page['segments'][0]['text']
            assert rpc('get_text',{'book':book_id,'offset':0,'source_commit':PIN}).get('isError')
            checks.append({'check':'unchanged direct source-book authority accepts VRI pin and refuses unit-mapping pin'})
            metadata = {uid:tool('get_text',{'uid':uid,'limit':200}) for uid in rows}
            for held in ('tha-ap72','tha-ap142'):
                assert not tool('get_text',{'uid':held,'limit':200})['english_available'], 'Held source activated: '+held
            for uid,g in expected.items():
                assert [{**{k:s[k] for k in ('ref','type')},'text_sha256':digest(s['text'])} for s in metadata[uid]['segments']] == [{k:s[k] for k in ('ref','type','text_sha256')} for s in g['root']['segments']]
            assert not ledger.exists(), 'Pāli/metadata caused an English request'
            whole,widgets,first_pages = {},{},{}
            for uid,g in expected.items():
                row = rows[uid];version = 'ap:'+row['path'].removeprefix('/text/').rstrip('/')
                command = {'uid':uid,'translation':version,'translation_revision':engine.SOURCE_REVISION,'limit':500};pieces=[];first=None
                while command:
                    d = tool('get_translation',command);first = first or d
                    assert d['text_id'] == uid and d['translation_id'] == version and d['translation_revision'] == engine.SOURCE_REVISION
                    assert all(d[k] == row[k] for k in engine.PINS)
                    assert d['license'] == 'CC BY-NC-SA 4.0' and d['license_url'] == engine.LICENSE_URL
                    assert d['mapping_notes'] == row['mapping_notes'] and row['mapping_notes'] and all(n in d['notes'] for n in row['mapping_notes'])
                    assert digest(compact(d['translator_notes'])) == g['notes_sha256']
                    assert d['url'] == row['url'] and d['fetched_url'] == row['raw_url']
                    assert 'Walters' in d['attribution'] and 'Whitman College' in d['attribution'] and d['changes']
                    assert digest(d['publisher_paratext']) == g['paratext_sha256']
                    for key in ('publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap'):
                        contract,actual = row.get(key),d.get(key)
                        assert bool(contract) == bool(actual), 'Owned source scope presence: '+key
                        if not contract:continue
                        contracts = contract if isinstance(contract,list) else [contract]
                        actuals = actual if isinstance(actual,list) else [actual]
                        for c,a in zip(contracts,actuals,strict=True):
                            assert all(a[k] == v for k,v in c.items()) and set(a) == set(c)|{'text','translator_notes'}
                            assert digest(a['text']) == c['body_sha256'] and digest(compact(a['translator_notes'])) == c['notes_sha256']
                    assert d['offset'] == len(''.join(pieces));pieces.append(d['text']);assert len(pieces)<150
                    command = d['continue_with']['arguments'] if d['continue_with'] else None
                    if command:assert command['prefix_sha256'] == digest(''.join(pieces))
                first_pages[uid] = first
                whole[uid] = {**first,'text':''.join(pieces),'continue_with':None}
                assert digest(whole[uid]['text']) == g['body_sha256']
                assert [digest(p) for p in whole[uid]['text'].split('\n\n')] == [p['sha256'] for p in g['body_paragraphs']]
                widgets[uid] = tool('read_passage_widget',{'uid':uid,'translation':version,'english_translation_revision':engine.SOURCE_REVISION})
                receipts.append({'uid':uid,'publisher_poem':g['poem'],'body_sha256':g['body_sha256'],'pages':len(pieces)})
            patches = scaled.mutations(whole)
            comparison = """import assert from'node:assert/strict';import{validateComparisonPage,comparisonChoices}from'./web/translation-comparison.mjs';process.stdin.setEncoding('utf8');let s='';for await(const c of process.stdin)s+=c;const p=JSON.parse(s);for(const[uid,d]of Object.entries(p.first)){const choices=p.metadata[uid].english_available,args={uid,translation:d.translation_id,translation_revision:d.translation_revision,limit:d.limit};assert.equal(comparisonChoices(choices,uid).length,1);validateComparisonPage(d,args,{uid,choices,accepted:null});}for(const[uid,label,patch]of p.patches){const d=p.first[uid],choices=p.metadata[uid].english_available,args={uid,translation:d.translation_id,translation_revision:d.translation_revision,limit:d.limit};assert.throws(()=>validateComparisonPage({...d,...patch},args,{uid,choices,accepted:null}),label)}"""
            comparison_run = subprocess.run(['node','--input-type=module','-e',comparison],cwd=ROOT,input=compact({'first':first_pages,'metadata':metadata,'patches':patches}),text=True,capture_output=True)
            assert comparison_run.returncode == 0, 'Actual-response standalone comparison validator failed'
            checks.append({'check':'actual MCP source pages accepted by standalone comparison validator; source/body/notices/owned-apparatus mutations refused','sources':len(expected),'mutations':len(patches)})
            resources = protocol('resources/list',{})['resources'];uri = next(r['uri'] for r in resources if r['uri'].startswith('ui://pali-canon/reader-') and r['uri'].endswith('.html') and 'skybridge' not in r['uri'])
            html = protocol('resources/read',{'uri':uri})['contents'][0]['text']
            if not args.mcp_only:
                pair_widgets(html,{uid:tool('read_passage_widget',{'uid':uid,'english':False}) for uid in ('tha-ap107','tha-ap108')},checks)
                pair_browser(args,base,metadata,checks,scans)
                order = sorted((u for u in rows if u.startswith('tha-ap')),key=lambda u:rows[u]['poem'])
                origins = {}
                for independent_chapter in evidence:
                    chapter_ids = [g['id'] for g in independent_chapter['poems'] if g['id'] in expected]
                    for g in independent_chapter['poems']:
                        peers = [uid for uid in chapter_ids if uid != g['id']]
                        if g['id'] in expected and g.get('chapter_summary') and peers:origins[g['id']] = peers[0]
                scaled.browser_checks(args,base,rows,expected,whole,metadata,widgets,html,patches,checks,scans,order,origins)
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(e['ok'] for e in events) and {e['url'] for e in events} == set(files)
            report = {'passed':len(checks),'baseline':BASE,'batch':args.batch,'pilot_only':args.pilot,'checks':checks,'sources':receipts,'source_artifacts':artifacts,'source_review_approval_sha256':digest(args.approval.read_bytes()),'harness_sha256':launch_harness,'helper_sha256':launch_helpers,'server_file_sha256':launch_hashes,'pinned_provider_reads':len(events),'upstream_provider_requests':0,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual installed MCP; exact local pinned official source fixtures. Chromium viewport and two simulated host bridges, not physical devices, signed-in host, human AT, specialist or new rights acceptance. No live upstream availability claim; report excludes publisher wording, notes and private draft bodies.'}
            assert report['a11y']['violations'] == 0
            assert launch_hashes == {str(p.relative_to(server_dir)):digest(p.read_bytes()) for p in sorted(server_dir.rglob('*')) if p.is_file()}, 'Installed package changed during acceptance'
            assert launch_harness == digest(Path(__file__).read_bytes()), 'Harness changed during acceptance'
            assert all(pin == digest((ROOT/'scripts'/name).read_bytes()) for name,pin in launch_helpers.items()), 'Shared helpers changed during acceptance'
            rendered = json.dumps(report,indent=2)
            if args.report:args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(rendered+'\n')
            print(rendered)
        finally:server.terminate();server.wait(timeout=10)

if __name__ == '__main__':main()
