#!/usr/bin/env python3
"""Real bundled reading-plan flows, plus labelled synthetic failure responses. No publisher content fetched."""
import argparse,json,os,pathlib,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--report');p.add_argument('--a11y',action='store_true');p.add_argument('--server-dir',type=pathlib.Path,help='Test an extracted package server from outside the checkout');args=p.parse_args()
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}';checks=[];scans=[]
server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server'
server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.server_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def passed(width,name):checks.append({'width':width,'check':name})
def mcp(name,arguments):
 data=json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}}).encode()
 return json.load(urllib.request.urlopen(urllib.request.Request(base+'/mcp',data=data,headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})))['result']['structuredContent']
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 day2=mcp('reading_plan',{'name':'mn-year','day':26});reading=day2['readings'][0];start=reading['get_text']['offset'];limit=reading['get_text']['limit'];uid=reading['id'];expected=mcp('get_text',{'uid':uid,'offset':start,'limit':min(30,limit)})
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  for width,theme in ([(w,t) for w in [390,1280] for t in ['light','dark']] if args.a11y else [(w,'light') for w in [360,390,768,1280]]):
   context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y);context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'theme':theme})+"))")
   page=context.new_page();errors=[];calls=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('request',lambda req:calls.append(req.post_data_json['params']) if req.method=='POST' and req.url.endswith('/mcp') and req.post_data_json.get('method')=='tools/call' else None)
   def audit(state):
    if not args.a11y:return
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));d=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
    scans.append({'width':width,'theme':theme,'state':state,'violations':[{'id':v['id'],'impact':v['impact'],'targets':[n['target'] for n in v['nodes']]} for v in d['violations']],'manual_review_rules':[v['id'] for v in d['incomplete']]})
   page.goto(base+'/#plans');page.get_by_role('heading',name='Reading plans',exact=True).wait_for();expect(page.locator('.cards .entry')).to_have_count(4);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');audit('catalogue');passed(width,'all four real plans visible with browser-local manual-progress limits')
   page.locator('.cards .entry').filter(has_text='The Dhammapada in 26 days').click();page.get_by_role('heading',name='Day 1 of 26',exact=True).wait_for();page.get_by_role('button',name='Mark this day read',exact=True).focus();page.keyboard.press('Enter');expect(page.get_by_role('button',name='Day marked ✓ · undo',exact=True)).to_have_attribute('aria-pressed','true');page.reload();page.get_by_role('button',name='Day marked ✓ · undo',exact=True).wait_for();audit('day');passed(width,'manual mark is keyboard-operable and survives reload')
   page.get_by_role('link',name='Read assigned Pāli · Dhp 1–20',exact=True).click();page.locator('.passage').first.wait_for();assert 'assigned' not in page.locator('#view .notice').first.inner_text() or 'English sources' in page.locator('#view .notice').first.inner_text();page.get_by_role('link',name='← Return to plan day 1',exact=True).click();page.get_by_role('button',name='Day marked ✓ · undo',exact=True).wait_for();passed(width,'complete chapter opens actual Pāli and returns to the marked plan day')
   page.goto(base+'/#plans?name=mn-year&day=1');page.get_by_role('heading',name='Day 1 of 365',exact=True).wait_for();page.get_by_label('Go to day',exact=True).fill('26');page.get_by_label('Go to day',exact=True).press('Enter');page.get_by_role('heading',name='Day 26 of 365',exact=True).wait_for();page.get_by_role('link',name='Read assigned Pāli · '+reading['citation'],exact=True).click();page.locator('.passage').first.wait_for();expect(page.locator('.segment-label span').first).to_have_text(expected['segments'][0]['ref']+((' · VRI '+str(expected['segments'][0]['vri_paragraph'])) if expected['segments'][0].get('vri_paragraph') else ''));assert page.locator('.passage').count()==expected['returned'];assert 'assigned segments '+str(start+1)+'–'+str(start+limit) in page.locator('#view .notice').first.inner_text();assert page.get_by_role('link',name='← Previous page',exact=True).count()==0;audit('bounded reading');passed(width,'selected MN part starts at exact engine assignment and never exposes an earlier page')
   seen=page.locator('.passage').count()
   while page.get_by_role('link',name='Next page →',exact=True).count():
    old=page.locator('.segment-label span').first.inner_text();page.get_by_role('link',name='Next page →',exact=True).click();expect(page.locator('.segment-label span').first).not_to_have_text(old);seen+=page.locator('.passage').count()
   assert seen==limit;passed(width,'plan pagination stops exactly at assigned end, without entering another day')
   page.goto(base+f'/#read?uid={uid}&plan=mn-year&day=26&offset={start-1}');page.get_by_role('heading',name='No passage was substituted.',exact=True).wait_for();assert 'outside the selected plan day' in page.locator('#view').inner_text();passed(width,'tampered out-of-span reading URL fails without substituting a different passage')
   page.goto(base+'/#plans?name=ati-into-the-stream&day=2');page.get_by_role('heading',name='Day 2 of 50',exact=True).wait_for();assert 'not an available whole-unit translation' in page.locator('#view').inner_text();assert page.locator('a[href="https://www.accesstoinsight.org/tipitaka/mn/mn.095x.than.html"]').count()==1;assert page.get_by_role('link',name='Read assigned Pāli · MN 95',exact=True).count()==1;assert not any(c.get('name')=='get_translation' for c in calls);audit('reviewed guide excerpt subject');passed(width,'withdrawn guide excerpt keeps original day and Pali assignment with visible external-only scope and no automatic English fetch')
   page.goto(base+'/#plans?name=ati-four-noble-truths&day=1');page.get_by_role('heading',name='Day 1 of 37',exact=True).wait_for();assert 'CC BY-NC' in page.locator('#view').inner_text();assert 'Link only' in page.locator('#view').inner_text();page.get_by_text('Unplaced guide links (1)',exact=True).click();assert 'Not in the verified link index' in page.locator('#view').inner_text();audit('guide and omissions');passed(width,'study guide remains link-only with author, rights and unplaced-link limitations')
   page.goto(base+'/#plans');page.get_by_role('heading',name='Reading plans',exact=True).wait_for()
   with page.expect_download() as download:page.get_by_role('button',name='Export reading progress',exact=True).click()
   exported=json.loads(pathlib.Path(download.value.path()).read_text());assert exported['format']=='pali-library-reading-progress-v1' and len(exported['progress'])==1 and exported['progress'][0]['name']=='dhammapada-26-days';passed(width,'progress exports only local manual marks with assignment/source signature')
   def damaged(route):
    body=route.request.post_data_json
    if body.get('params',{}).get('name')!='reading_plan':route.continue_();return
    response=route.fetch();data=response.json();data['result']['structuredContent']['source']={};route.fulfill(response=response,json=data)
   page.route('**/mcp',damaged);page.goto(base+'/#plans?name=mn-year&day=3');page.get_by_role('heading',name='No passage was substituted.',exact=True).wait_for();assert page.get_by_role('button',name='Mark this day read',exact=True).count()==0;page.unroute('**/mcp');passed(width,'missing plan source provenance fails before a reading or completion control is shown')
   def changed_source(route):
    body=route.request.post_data_json
    if body.get('params',{}).get('name')!='reading_plan':route.continue_();return
    response=route.fetch();data=response.json();data['result']['structuredContent']['source']['pali']['commit']='synthetic-changed-source-pin';route.fulfill(response=response,json=data)
   page.route('**/mcp',changed_source);page.goto(base+'/#plans?name=dhammapada-26-days&day=1');page.locator('.notice').filter(has_text='different assignment or source revision').wait_for();expect(page.get_by_role('button',name='Mark this day read',exact=True)).to_have_attribute('aria-pressed','false');page.unroute('**/mcp');passed(width,'historical mark is not silently credited to a changed source revision');page.reload()
   page.goto(base+'/#plans?name=dhammapada-26-days&day=1');page.get_by_role('button',name='Day marked ✓ · undo',exact=True).wait_for();page.get_by_role('button',name='Day marked ✓ · undo',exact=True).click();expect(page.get_by_role('button',name='Mark this day read',exact=True)).to_have_attribute('aria-pressed','false');passed(width,'manual completion can be undone')
   assert all(c['name']!='get_translation' for c in calls);assert all('signature' not in json.dumps(c['arguments']) and 'reading_progress' not in c['arguments'] for c in calls);assert not errors,errors;passed(width,'plans neither retrieve English bodies nor transmit personal progress');context.close()
  if not args.a11y:
   context=browser.new_context(viewport={'width':390,'height':900});context.add_init_script("Storage.prototype.getItem=function(){throw Error('Synthetic denied storage')};Storage.prototype.setItem=function(){throw Error('Synthetic denied storage')}");page=context.new_page();page.goto(base+'/#plans?name=dhammapada-26-days&day=1');page.get_by_role('button',name='Mark this day read',exact=True).wait_for();page.get_by_role('button',name='Mark this day read',exact=True).click();expect(page.locator('#status')).to_contain_text('Export reading progress');page.goto(base+'/#plans');page.get_by_role('heading',name='Reading plans',exact=True).wait_for()
   with page.expect_download() as download:page.get_by_role('button',name='Export reading progress',exact=True).click()
   assert len(json.loads(pathlib.Path(download.value.path()).read_text())['progress'])==1;passed('storage-disabled','failed storage never claims durable progress and tab-local marks remain exportable');context.close()
  browser.close()
 result={'passed':len(checks),'outside_source_tree':bool(args.server_dir),'checks':checks,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limitations':'Real bundled reading plans; missing-provenance failure is a synthetic response. No upstream source fetch, human accessibility review or physical-device certification. Only a11y contexts bypass CSP for checker injection.'};text=json.dumps(result,indent=2);print(text)
 if args.report:pathlib.Path(args.report).write_text(text+'\n')
 if result['a11y']['violations']:raise SystemExit(1)
finally:
 server.terminate();server.wait(timeout=10)
