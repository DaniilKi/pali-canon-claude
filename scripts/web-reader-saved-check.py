#!/usr/bin/env python3
"""Saved-library navigation, privacy and draft retention against the actual app."""
import argparse, json, os, pathlib, socket, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--report');p.add_argument('--a11y',action='store_true');p.add_argument('--server-dir',type=pathlib.Path);args=p.parse_args()
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server'
server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.server_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
checks=[];scans=[]
items=[]
for i in range(500):
    uid=['mn1','book:vin02m1','commentary:mn01a.att.xml','post:Vism 1.1'][i%4]
    items.append({'uid':uid,'ref':f'synthetic-ref-{i}','title':f'Synthetic bookmark {i:03}','note':f'Synthetic personal note {i}'})
items[0]={'uid':'dhp183','ref':'dhp183/1','title':'Buddhavaggo','note':'Original synthetic personal note','offset':0}
items[30]['title']='Mettā practice';items[30]['note']='Distinct private reflection'
try:
    for _ in range(100):
        try:urllib.request.urlopen(base+'/healthz',timeout=1);break
        except Exception:time.sleep(.1)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
        cases=[(390,'light'),(390,'dark'),(1280,'light'),(1280,'dark')] if args.a11y else [(320,'light'),(390,'light'),(768,'light'),(1280,'light')]
        for width,theme in cases:
            context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y)
            context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'saved':items,'theme':theme})+"))")
            page=context.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url) if r.method=='POST' else None)
            page.goto(base+'/#saved');page.get_by_role('heading',name='Saved passages',exact=True).wait_for()
            query=page.get_by_label('Search saved passages and notes',exact=True);scope=page.get_by_label('Saved source type',exact=True);results=page.get_by_role('region',name='Saved passage results',exact=True)
            def audit(state):
                if not args.a11y:return
                page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
                data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width':width,'theme':theme,'state':state,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']]})
            def passed(name):checks.append({'width':width,'theme':theme,'check':name})
            assert results.locator('textarea').count()==25 and 'Page 1 of 20' in results.inner_text()
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');audit('500 bookmarks, first page');passed('bounded editors, count and responsive source labels')
            raw=page.evaluate("localStorage.getItem('pali-library-v1')")
            results.locator('textarea').first.fill('Uncommitted draft unique words')
            page.get_by_role('button',name='Next saved page',exact=True).click();assert 'Page 2 of 20' in results.inner_text()
            assert page.evaluate("document.activeElement.getAttribute('role')")=='status'
            expect(page.locator('#saved-count')).to_be_in_viewport()
            results.locator('textarea').first.fill('Second-page unsaved reflection')
            page.get_by_role('button',name='Previous saved page',exact=True).click();assert results.locator('textarea').first.input_value()=='Uncommitted draft unique words';passed('pagination keeps unsaved notes and moves keyboard focus visibly')
            query.fill('unique words');query.press('Enter');expect(results.locator('textarea')).to_have_count(1);assert results.locator('textarea').input_value()=='Uncommitted draft unique words';assert '#saved'==page.evaluate('location.hash');assert 'unique words' not in page.title();audit('private draft filter');passed('unsaved drafts searched locally without URL or title disclosure')
            query.fill('metta');expect(results.locator('textarea')).to_have_count(1);assert 'Mettā practice' in results.inner_text();passed('accent-insensitive saved metadata search')
            query.fill('');scope.select_option('commentary');assert '125 matching' in page.locator('#saved-count').inner_text();assert all('Commentary · not canon' in t for t in results.locator('article').all_text_contents());audit('commentary filter');passed('source types remain distinct and labelled noncanonical')
            query.fill('<img src=x onerror=alert(1)>');expect(results.locator('textarea')).to_have_count(0);assert page.locator('#view img').count()==0;audit('no matches');passed('hostile or unmatched query stays inert')
            assert page.evaluate("localStorage.getItem('pali-library-v1')")==raw and not requests
            page.get_by_role('button',name='Clear saved filters',exact=True).click();expect(query).to_be_focused();assert results.locator('textarea').first.input_value()=='Uncommitted draft unique words';passed('filter changes never write profile or call server')
            query.fill('unique words');expect(results.locator('textarea')).to_have_count(1)
            with page.expect_download() as info:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
            exported=json.loads(pathlib.Path(info.value.path()).read_text());assert len(exported['saved'])==500 and exported['saved'][0]['note']=='Uncommitted draft unique words' and exported['saved'][25]['note']=='Second-page unsaved reflection';passed('export retains all 500 bookmarks and off-page drafts')
            query.fill('unique words');results.get_by_role('button',name='Save note',exact=True).click();assert json.loads(page.evaluate("localStorage.getItem('pali-library-v1')"))['saved'][0]['note']=='Uncommitted draft unique words';passed('explicit save remains durable')
            results.get_by_role('link',name='Buddhavaggo · dhp183/1',exact=True).click();page.locator('.passage').filter(has_text='Sabbapāpassa').wait_for();passed('filtered reference opens actual source unchanged')
            page.get_by_role('link',name='Saved',exact=True).click();expect(query).to_have_value('unique words');expect(results.locator('textarea')).to_have_count(1)
            results.get_by_role('button',name='Remove bookmark',exact=True).click();expect(results.get_by_role('button',name='Remove bookmark and note',exact=True)).to_be_visible();results.get_by_role('button',name='Remove bookmark and note',exact=True).click();assert results.locator('textarea').count()==0 and '499 saved' in page.locator('#saved-count').inner_text();assert page.evaluate("document.activeElement.getAttribute('role')")=='status';passed('navigation preserves tab filters, removal restores visible focus')
            assert not errors,errors;context.close()
        browser.close()
    data={'passed':len(checks),'outside_source_tree':bool(args.server_dir),'checks':checks,'a11y':{'scans':len(scans),'violations':sum(len(x['violations']) for x in scans),'results':scans},'limits':'Synthetic personal bookmarks/notes, actual Dhp 183 source. Chromium widths emulate devices; no real-client or human screen-reader certification.'}
    text=json.dumps(data,indent=2);print(text)
    if args.report:pathlib.Path(args.report).write_text(text+'\n')
    if data['a11y']['violations']:raise SystemExit(1)
finally:server.terminate();server.wait(timeout=10)
