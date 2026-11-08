#!/usr/bin/env python3
"""Real bundled-corpus browser journeys; no remote text source required. python scripts/web-reader-browser-check.py"""
import json, os, pathlib, socket, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
with socket.socket() as sock:
 sock.bind(('127.0.0.1',0)); port=sock.getsockname()[1]
env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'}
server=subprocess.Popen(['node','server/http.cjs'],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
base=f'http://127.0.0.1:{port}'; checks=[]
def passed(width,name): checks.append({'width':width,'check':name})
try:
 for _ in range(100):
  try:
   urllib.request.urlopen(base+'/healthz',timeout=1); break
  except Exception: time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  for width in [360,390,768,1280]:
   context=browser.new_context(viewport={'width':width,'height':900})
   page=context.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(base); page.get_by_role('heading',name='The Pāli Canon',exact=True).wait_for()
   assert page.locator('.entry').count()>20
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
   passed(width,'real catalogue and no horizontal overflow')
   page.locator('.entry').filter(has_text='Dīgha Nikāya').click(); page.locator('.entry').filter(has_text='Brahmajālasuttaṃ').wait_for(); passed(width,'collection navigation')
   page.locator('#reference').fill('Dhp 183'); page.locator('#reference-form button').click()
   page.locator('.passage').filter(has_text='Sabbapāpassa akaraṇaṃ').wait_for(); assert 'VRI' in page.locator('.provenance').inner_text(); assert 'non-commercial' in page.locator('.provenance').inner_text(); passed(width,'exact real passage and attribution')
   original_hash=page.evaluate('location.hash'); page.locator('.skip').focus(); page.keyboard.press('Enter'); assert page.evaluate('location.hash')==original_hash; assert 'Sabbapāpassa' in page.locator('.passage').inner_text(); passed(width,'skip link focuses reading without replacing the passage')
   page.get_by_role('button',name='Save passage dhp183/1',exact=True).click(); page.get_by_role('link',name='Saved',exact=True).click(); page.get_by_role('heading',name='Saved passages').wait_for()
   page.locator('textarea').fill('Personal reading note'); page.get_by_role('button',name='Save note',exact=True).click(); page.reload(); page.locator('textarea').wait_for(); assert page.locator('textarea').input_value()=='Personal reading note'; passed(width,'bookmark and note persist after reload')
   page.locator('main a').filter(has_text='Buddhavaggo').click(); page.locator('.passage').filter(has_text='Sabbapāpassa akaraṇaṃ').wait_for()
   page.locator('summary').click(); page.locator('#theme').select_option('dark'); page.locator('#script').select_option('devanagari'); page.locator('.passage').filter(has_text='स').first.wait_for(); passed(width,'native script and night theme')
   page.locator('#script').select_option('roman'); page.locator('.passage').filter(has_text='Sabbapāpassa').first.wait_for()
   page.locator('#font-size').fill('30'); page.locator('#font-size').dispatch_event('input'); assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'); passed(width,'largest text setting has no horizontal overflow')
   page.get_by_role('button',name='Traditional commentary',exact=True).click(); page.get_by_role('heading',name='Traditional commentary · not canonical root text').wait_for(); page.locator('#study .passage').first.wait_for(); passed(width,'commentary kept distinct from root')
   page.get_by_role('button',name='English translations',exact=True).click(); page.get_by_role('heading',name='English translations',exact=True).wait_for(); assert page.locator('#study button').count()>1; passed(width,'translation selection without a remote fetch')
   page.locator('#query').fill('metta'); page.locator('#search-form button').click(); page.locator('.entry').first.wait_for(); assert page.locator('.entry').count()>0; passed(width,'real canonical search')
   page.goto(base+'/#browse?node=books'); page.get_by_role('heading',name='Complete VRI source books').wait_for(); page.locator('.entry').first.click(); page.locator('.passage').first.wait_for(); old=page.locator('.segment-label span').first.inner_text(); page.get_by_role('link',name='Next page →',exact=True).click(); expect(page.locator('.segment-label span').first).not_to_have_text(old); passed(width,'complete source-book pagination')
   # Browse all supplementary corpora through their own tools; never label these as canonical.
   page.goto(base+'/#browse?node=commentary'); page.get_by_role('heading',name='Traditional commentary',exact=True).wait_for(); assert page.locator('.entry').count()==40
   page.get_by_role('link',name='Next page →',exact=True).click(); expect(page.locator('.entry')).to_have_count(7); passed(width,'all 47 commentary books are reachable through catalogue pagination')
   page.locator('.entry').first.click(); page.locator('.passage').first.wait_for(); assert 'NOT CANON' in page.locator('main .eyebrow').inner_text(); assert 'does not assert an alignment' in page.locator('main').inner_text(); assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'); assert page.get_by_role('button',name='English translations',exact=True).count()==0; passed(width,'commentary book reading preserves non-canonical and unaligned scope')
   page.get_by_role('link',name='Next page →',exact=True).click(); page.locator('.segment-label span').first.filter(has_text='/c31').wait_for(); passed(width,'direct commentary-book continuation retains selection')
   page.locator('#search-scope').select_option('commentary'); page.locator('#query').fill('metta'); page.locator('#search-form button').click(); page.locator('.entry').first.wait_for(); assert 'NOT CANON' in page.locator('main .eyebrow').inner_text(); page.locator('.entry').first.click(); page.locator('.passage').first.wait_for(); assert page.locator('.segment').count()==1
   exact_ref=page.locator('.segment-label span').first.inner_text(); exact_text=page.locator('.passage').first.inner_text(); page.locator('.segment button').first.click(); page.get_by_role('link',name='Saved',exact=True).click(); page.locator('main a').filter(has_text='commentary:').last.click(); page.locator('.passage').first.wait_for(); assert page.locator('.segment-label span').first.inner_text()==exact_ref; assert page.locator('.passage').first.inner_text()==exact_text; passed(width,'commentary search and bookmark reopen the identical exact source segment')
   page.goto(base+'/#browse?node=post'); page.get_by_role('heading',name='Later Pāli works',exact=True).wait_for(); expect(page.locator('.entry')).to_have_count(40); page.get_by_role('link',name='Next page →',exact=True).click(); expect(page.locator('.entry')).to_have_count(40); page.get_by_role('link',name='Next page →',exact=True).click(); expect(page.locator('.entry')).to_have_count(29); passed(width,'all 109 later works are reachable through catalogue pagination')
   page.locator('.entry').first.click(); page.locator('.passage').first.wait_for(); assert 'NOT CANON' in page.locator('main .eyebrow').inner_text(); assert page.get_by_role('button',name='English translations',exact=True).count()==0; assert 'non-commercial' in page.locator('.provenance').inner_text(); assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'); passed(width,'later work reading preserves scope and attribution')
   page.locator('#search-scope').select_option('post'); page.locator('#query').fill('metta'); page.locator('#search-form button').click(); page.locator('.entry').first.wait_for(); assert 'NOT CANON' in page.locator('main .eyebrow').inner_text(); page.locator('.entry').first.click(); page.locator('.passage').first.wait_for(); assert 'NOT CANON' in page.locator('main .eyebrow').inner_text(); assert 'mett' in page.locator('main').inner_text().lower(); passed(width,'later-work search opens its returned citation rather than a canonical lookalike')
   page.locator('#search-scope').select_option('canon')
   page.locator('#reference').fill('not-a-real-citation-xyz'); page.locator('#reference-form button').click(); page.get_by_role('heading',name='No passage was substituted.').wait_for(); assert page.locator('.passage').count()==0; passed(width,'invalid citation fails visibly without substitution')
   # Controlled outage only, not an assertion about real upstream availability.
   page.route('**/mcp',lambda route:route.fulfill(status=503,body='unavailable'))
   page.goto(base+'/#read?uid=dhp183'); page.get_by_role('heading',name='No passage was substituted.').wait_for(); assert 'unavailable' in page.locator('.notice').inner_text(); passed(width,'HTTP outage and recoverable error')
   page.unroute('**/mcp'); page.get_by_role('button',name='Try again',exact=True).click(); page.locator('.passage').filter(has_text='Sabbapāpassa').wait_for(); passed(width,'retry returns real passage')
   # Synthetic translation pagination must replay the exact source/version guard, never a default.
   continuation={'uid':'dhp183','translation':'dt:fixture-only','offset':500,'limit':500,'prefix_sha256':'a'*64}
   translation_requests=[]
   def paged_translation(route):
    data=route.request.post_data_json
    if data.get('params',{}).get('name')!='get_translation': route.continue_(); return
    args=data['params']['arguments']; translation_requests.append(args)
    result={'translator':'Synthetic pagination fixture','text':'FIXTURE FIRST PAGE','translation_id':'dt:fixture-only','license':'Synthetic test data','continue_with':{'name':'get_translation','arguments':continuation}}
    if args.get('offset')==500: result={'translator':'Synthetic pagination fixture','text':'FIXTURE SECOND PAGE','translation_id':'dt:fixture-only','license':'Synthetic test data'}
    route.fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':data['id'],'result':{'structuredContent':result}}))
   page.route('**/mcp',paged_translation); page.get_by_role('button',name='English translations',exact=True).click(); page.locator('#study button').first.click(); page.locator('#study .translation').filter(has_text='FIXTURE FIRST PAGE').wait_for()
   page.get_by_role('button',name='Next English page →',exact=True).click(); page.locator('#study .translation').filter(has_text='FIXTURE SECOND PAGE').wait_for(); assert translation_requests[-1]==continuation; passed(width,'translation continuation preserves exact selector and source-prefix guard')
   page.unroute('**/mcp')
   # Intercept selected translation, switch studies, then resolve it. Stale result must not replace commentary.
   page.get_by_role('button',name='English translations',exact=True).click()
   pending=[]
   def hold_translation(route):
    data=route.request.post_data_json
    if data.get('params',{}).get('name')=='get_translation': pending.append(route)
    else: route.continue_()
   page.route('**/mcp',hold_translation); page.locator('#study button').first.click(); page.wait_for_timeout(100)
   page.get_by_role('button',name='Traditional commentary',exact=True).click(); page.locator('#study .passage').first.wait_for()
   assert len(pending)==1
   pending[0].fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':1,'result':{'structuredContent':{'text':'STALE TRANSLATION FIXTURE','translator':'Synthetic'}}}))
   page.wait_for_timeout(100); assert 'STALE TRANSLATION FIXTURE' not in page.locator('#study').inner_text(); passed(width,'late translation cannot overwrite commentary')
   page.unroute('**/mcp'); assert not errors,errors
   # Malicious-looking retrieved strings are data, never executable HTML or unsafe source links.
   injected='<img src=x onerror="window.readerXss=true">synthetic source text'
   def source_fixture(route):
    data=route.request.post_data_json
    result={'text_id':'fixture','title':'<script>window.readerXss=true</script>','citation':'Synthetic fixture','segments':[{'ref':'fixture/1','type':'prose','text':injected}],'total_segments':1,'offset':0,'returned':1,'next_offset':None,'notes':[],'url':'javascript:window.readerXss=true','source':{'attribution':'Synthetic safety fixture','terms':'Not scripture'}}
    route.fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':data['id'],'result':{'structuredContent':result}}))
   page.route('**/mcp',source_fixture); page.goto(base+'/#read?uid=fixture'); expect(page.locator('.passage')).to_have_text(injected); assert page.locator('#view img, #view script').count()==0; assert page.evaluate('window.readerXss===undefined'); assert page.locator('.provenance a').count()==0; passed(width,'retrieved markup and javascript URLs cannot execute')
   page.unroute('**/mcp')
   # Keyboard: skip link and main navigation are reachable.
   page.goto(base+'/#about'); page.get_by_role('heading',name='Read with the source in view.').wait_for(); page.get_by_role('link',name='Saved',exact=True).focus(); page.keyboard.press('Enter'); page.get_by_role('heading',name='Saved passages',exact=True).wait_for(); passed(width,'keyboard navigation activates the saved-passage screen')
   out=pathlib.Path('/tmp/pali-web-reader'); out.mkdir(exist_ok=True)
   page.goto(base+'/#read?uid=dhp183'); page.locator('.passage').filter(has_text='Sabbapāpassa').wait_for(); page.screenshot(path=str(out/f'reader-{width}.png'),full_page=True)
   context.close()
  # Browser storage blocked: reader still works and saving cannot claim durable success.
  context=browser.new_context(); context.add_init_script("Storage.prototype.setItem=function(){throw new DOMException('Disabled','SecurityError')};Storage.prototype.getItem=function(){throw new DOMException('Disabled','SecurityError')}")
  page=context.new_page(); page.goto(base+'/#read?uid=dhp183'); page.locator('.passage').first.wait_for(); page.get_by_role('button',name='Save passage dhp183/1').click(); assert 'unavailable' in page.locator('#status').inner_text(); passed('all','disabled browser storage does not break reader or claim persistence')
  browser.close()
 print(json.dumps({'passed':len(checks),'checks':checks},indent=2))
finally:
 server.terminate(); server.wait(timeout=10)
