#!/usr/bin/env python3
"""Actual-source bookmark pins; controlled saved-metadata drift, never invented text."""
import argparse,json,os,pathlib,socket,subprocess,time,urllib.request,urllib.parse
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];parser=argparse.ArgumentParser();parser.add_argument('--report');parser.add_argument('--a11y',action='store_true');parser.add_argument('--server-dir',type=pathlib.Path);args=parser.parse_args()
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server'
server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.server_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
checks=[];scans=[]
def profile(page):return page.evaluate("JSON.parse(localStorage.getItem('pali-library-v1'))")
def loaded(page):page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
def saved(page):page.goto(base+'/#saved');page.get_by_role('heading',name='Saved passages',exact=True).wait_for();loaded(page)
def bookmark_link(page,item):return page.get_by_role('region',name='Saved passage results').get_by_role('link',name=item['title']+' · '+item['ref'],exact=True)
def seeded(browser,width,theme,marks):
    context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y)
    context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'theme':theme,'saved':marks})+"))")
    return context
try:
    for _ in range(100):
        try:urllib.request.urlopen(base+'/healthz',timeout=1);break
        except Exception:time.sleep(.1)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
        cases=[(390,t) for t in ['light','dark']]+[(1280,t) for t in ['light','dark']] if args.a11y else [(320,'light'),(390,'light'),(768,'light'),(1280,'light')]
        for width,theme in cases:
            def passed(name):checks.append({'width':width,'theme':theme,'check':name})
            def audit(page,state):
                if not args.a11y:return
                page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width':width,'theme':theme,'state':state,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']]})
            context=seeded(browser,width,theme,[]);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));marks=[];wording={}
            for route,kind in [('uid=dhp183','canon'),('book=vin02m1&offset=6','book'),('kind=post&uid=Vism%201.1','post'),('kind=commentary&uid=commentary%3Aabh01a.att.xml','commentary'),('kind=commentary&uid=mn10','aligned commentary')]:
                page.goto(base+'/#read?'+route);part=page.locator('section[aria-label="Pāli passage"] .segment').first;part.wait_for();loaded(page)
                reference=part.locator('.segment-label a').first.inner_text();text=part.locator('.passage').inner_text();part.get_by_role('button',name='Save passage '+reference,exact=True).click()
                item=profile(page)['saved'][-1];assert item['source_commit'] and isinstance(item['offset'],int);marks.append(item);wording[item['uid']]=text
                saved(page);link=bookmark_link(page,item);params=dict(urllib.parse.parse_qsl(link.get_attribute('href').split('?',1)[1]));assert params['source']==item['source_commit'] and params['ref']==item['ref'] and int(params['offset'])==item['offset']
                link.focus();page.keyboard.press('Enter');page.locator('.passage').first.wait_for();loaded(page);assert page.locator('section[aria-label="Pāli passage"] .passage').first.inner_text()==text;assert page.locator('.segment-label a').first.inner_text()==item['ref'];passed(kind+': saved link keeps exact revision, offset, source kind and wording')
            saved(page);audit(page,'current source-pinned saved records');assert not errors,errors;context.close()
            # Synthetic OLD metadata simulates a corpus upgrade. Actual text is not changed.
            old=[{**m,'source_commit':'controlled-old-revision','note':'Synthetic private source note'} for m in marks]
            context=seeded(browser,width,theme,old);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            for item in old:
                saved(page);bookmark_link(page,item).click();page.get_by_role('heading',name='No passage was substituted.',exact=True).wait_for();assert page.locator('.passage').count()==0;assert 'source revision changed' in page.locator('#view').inner_text();assert 'Synthetic private source note' not in page.locator('#view').inner_text()
                audit(page,'revision drift refusal '+item['uid']);review=page.get_by_role('link',name='Review current source at this reference',exact=True);review.focus();page.keyboard.press('Enter');page.locator('.passage').first.wait_for();loaded(page)
                assert page.locator('.segment-label a').first.inner_text()==item['ref'];assert page.locator('section[aria-label="Pāli passage"] .passage').first.inner_text()==wording[item['uid']];assert 'source=' not in page.url
                persisted=next(m for m in profile(page)['saved'] if m['uid']==item['uid']);assert persisted['source_commit']=='controlled-old-revision' and persisted['note']==item['note'];passed('changed revision refuses wording before explicit review: '+item['uid'])
            assert not errors,errors;context.close()
            legacy={k:v for k,v in marks[0].items() if k not in ['source_commit','offset']};context=seeded(browser,width,theme,[legacy]);page=context.new_page();saved(page);assert 'no source version was saved' in page.locator('#view').inner_text();link=bookmark_link(page,legacy);assert 'source=' not in link.get_attribute('href');link.click();page.locator('.passage').first.wait_for();loaded(page);assert page.locator('.segment-label a').first.inner_text()==legacy['ref'];passed('legacy bookmark is clearly unversioned and still checks actual reference');context.close()
            invalid=[{**marks[0],'title':'Synthetic missing position','offset':None},{**marks[0],'title':'Synthetic invalid pin','source_commit':'https://invalid.example'}];context=seeded(browser,width,theme,invalid);page=context.new_page();requests=[];page.on('request',lambda r:requests.append(r.url) if r.method=='POST' else None);saved(page)
            assert page.get_by_role('region',name='Saved passage results').get_by_role('link').count()==0;assert page.locator('.notice').filter(has_text='cannot be opened safely').count()==2;assert not requests;audit(page,'invalid metadata retained without unsafe links')
            with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
            exported=json.loads(pathlib.Path(download.value.path()).read_text());assert exported['saved']==invalid;assert profile(page)['saved']==invalid;passed('invalid version metadata stays exportable without dropping pin or contacting server');context.close()
        browser.close()
    data={'passed':len(checks),'outside_source_tree':bool(args.server_dir),'checks':checks,'a11y':{'scans':len(scans),'violations':sum(len(x['violations']) for x in scans),'results':scans},'limits':'Actual bundled Pali in five source modes; controlled old/invalid bookmark metadata, not a real upstream text update. No archive retrieval, translation-source consent, physical-device or human screen-reader certification.'}
    text=json.dumps(data,indent=2);print(text)
    if args.report:pathlib.Path(args.report).write_text(text+'\n')
    if data['a11y']['violations']:raise SystemExit(1)
finally:server.terminate();server.wait(timeout=10)
