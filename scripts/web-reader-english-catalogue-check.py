#!/usr/bin/env python3
"""Actual bundled English-link discovery; metadata never authorizes English retrieval."""
import argparse,copy,json,os,pathlib,socket,subprocess,time,urllib.request,urllib.parse
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--report');p.add_argument('--a11y',action='store_true');p.add_argument('--package-dir',type=pathlib.Path);p.add_argument('--server-dir',type=pathlib.Path);args=p.parse_args()
assert not(args.package_dir and args.server_dir)
server_dir=args.server_dir.resolve() if args.server_dir else (args.package_dir.resolve()/'server' if args.package_dir else ROOT/'server')
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';checks=[];scans=[]
server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.package_dir or args.server_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def tool(name,arguments):
 payload={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}}
 req=urllib.request.Request(base+'/mcp',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
 result=json.load(urllib.request.urlopen(req,timeout=30))['result'];assert not result.get('isError'),result
 return result['structuredContent']
def catalogue(availability='linked',offset=0,limit=40,collection=None):
 args={'node':'english','availability':availability,'offset':offset,'limit':limit}
 if collection:args['collection']=collection
 return tool('browse_canon',args)
def href(availability='linked',collection=None,offset=0):
 query={'node':'english','availability':availability}
 if collection:query['collection']=collection
 if offset:query['offset']=offset
 return base+'/#browse?'+urllib.parse.urlencode(query)
def ready(page):page.get_by_role('heading',name='Find English sources',exact=True).wait_for();page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise AssertionError('Bundled server did not become ready')
 linked=catalogue();second=catalogue(offset=40);scoped=catalogue('scoped');none=catalogue('none',collection='sn');whole=catalogue('whole',collection='dhp')
 all_linked=[];at=0
 while True:
  data=catalogue(offset=at,limit=200);all_linked.extend(data['items'])
  if data['next_offset'] is None:break
  at=data['next_offset']
 partial_ids={r['unit_id'] for r in json.loads((ROOT/'scripts/canon/reviewed_partial_pages.json').read_text(encoding='utf-8'))['links']}
 assert partial_ids<={r['id'] for r in all_linked if r.get('partial_english_available',0)}
 assert any(r.get('shared_english_available',0) for r in all_linked)
 assert any(r.get('source_context') for r in whole['items']),'Dhp catalogue must expose inherited chapter context'
 scoped_pages=[scoped];at=scoped['next_offset']
 while at is not None:
  data=catalogue('scoped',offset=at);scoped_pages.append(data);at=data['next_offset']
 empty_collection=next(c['id'] for c in linked['collections'] if catalogue('linked',collection=c['id'])['total']==0)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  cases=[(w,t) for w in [320,390,768,1280] for t in (['light','dark'] if args.a11y else ['light'])]
  for width,theme in cases:
   def passed(name):checks.append({'width':width,'theme':theme,'check':name})
   context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y)
   context.add_init_script("if(!localStorage.getItem('pali-library-v1'))localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'theme':theme,'remember_position':False,'saved':[]})+"))")
   page=context.new_page();calls=[];errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   def record(req):
    if req.method=='POST' and req.url.endswith('/mcp') and req.post_data_json.get('method')=='tools/call':calls.append(req.post_data_json['params'])
   page.on('request',record)
   def audit(state):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'{width}px {theme} {state} overflow'
    if not args.a11y:return
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
    d=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
    scans.append({'width':width,'theme':theme,'state':state,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in d['violations']]})
   page.goto(base+'/#browse?node=canon');page.get_by_role('link',name='Find English sources',exact=True).click();ready(page)
   before=page.evaluate("localStorage.getItem('pali-library-v1')")
   assert page.locator('.cards .entry strong').all_text_contents()==[x['title'] for x in linked['items']]
   assert str(linked['total']) in page.locator('.english-catalogue-count').inner_text();assert 'not a guarantee' in page.locator('#view').inner_text();audit('default catalogue');passed('Library link opens actual metadata catalogue with counts, completeness caution and no overflow')
   page.get_by_role('link',name='Next page →',exact=True).click();ready(page);assert 'offset=40' in page.url
   assert page.locator('.cards .entry strong').all_text_contents()==[x['title'] for x in second['items']]
   page.go_back();ready(page);assert page.locator('.cards .entry strong').all_text_contents()==[x['title'] for x in linked['items']];passed('hash pagination and browser back preserve actual record pages')
   page.get_by_label('English availability',exact=True).select_option('none');page.get_by_label('Collection',exact=True).select_option('sn');page.get_by_role('button',name='Apply',exact=True).focus();page.keyboard.press('Enter');ready(page)
   assert page.url.endswith('availability=none&collection=sn');assert page.locator('.cards .entry strong').all_text_contents()==[x['title'] for x in none['items']]
   page.reload();ready(page);assert page.get_by_label('English availability',exact=True).input_value()=='none';assert page.get_by_label('Collection',exact=True).input_value()=='sn';audit('filtered catalogue');passed('keyboard Apply resets offset and reload preserves both exact filters')
   discovered=[]
   for data in scoped_pages:
    page.goto(href('scoped',offset=data['offset']));ready(page)
    assert page.locator('.cards .entry strong').all_text_contents()==[x['title'] for x in data['items']]
    for card,item in zip(page.locator('.cards .entry').all(),data['items']):
     assert card.get_attribute('href')=='#read?uid='+urllib.parse.quote(item['id'],safe='')
     label=card.inner_text();assert 'review required' in label
     if item.get('partial_english_available'):assert 'Partial' in label
     if item.get('shared_english_available'):assert 'shared' in label.lower()
    discovered.extend(x['id'] for x in data['items'])
   assert len(discovered)==scoped['total'];audit('scoped catalogue');passed('every scoped-only matching record is reachable with partial/shared review badges; all registered partials exist in linked catalogue')
   page.goto(href('whole','dhp'));ready(page);assert 'Linked through' in page.locator('#view').inner_text();audit('inherited chapter cue');passed('whole-link filter labels inherited chapter context without inventing individual alignment')
   page.goto(href('linked',empty_collection));ready(page);page.get_by_text('No matching records in this index',exact=False).wait_for();assert page.locator('.cards .entry').count()==0;assert 'elsewhere' in page.locator('#view').inner_text()
   page.goto(href('whole','dhp',100000));ready(page);page.get_by_text('This page is beyond the matching records.',exact=True).wait_for();assert page.get_by_text('No matching records in this index',exact=False).count()==0
   page.get_by_role('link',name='Return to first matching page',exact=True).click();ready(page);assert 'offset=' not in page.url;audit('first matching page');passed('empty-index matches differ from out-of-range pages, with exact-filter first-page recovery')
   # Explicit metadata fixture checks the combined badge; no fixture English is retrieved.
   combined=copy.deepcopy(scoped);combined['items'][0]['partial_english_available']=1;combined['items'][0]['shared_english_available']=1
   def reply(route,data):
    payload=route.request.post_data_json;route.fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':payload['id'],'result':{'structuredContent':data}}))
   def both(route):
    if route.request.post_data_json.get('params',{}).get('arguments',{}).get('node')=='english':reply(route,combined)
    else:route.continue_()
   page.route('**/mcp',both);page.goto(href('scoped'));ready(page);page.get_by_text('Partial and shared sources · review required',exact=True).first.wait_for();page.unroute('**/mcp');passed('controlled mixed-scope metadata displays combined review badge without retrieval')
   bad=copy.deepcopy(linked);bad['items'][0]['read_with']={'tool':'get_translation','uid':bad['items'][0]['id']}
   def malformed(route):
    if route.request.post_data_json.get('params',{}).get('arguments',{}).get('node')=='english':reply(route,bad)
    else:route.continue_()
   page.route('**/mcp',malformed);page.goto(href());page.get_by_role('heading',name='No passage was substituted.',exact=True).wait_for();assert page.locator('.cards').count()==0;page.unroute('**/mcp');audit('malformed catalogue refused');passed('unsafe source command refuses before rendering any catalogue cards')
   for query in ['node=English','node=%20english%20','node=eng%20lish','node=eng%09lish','node=%C3%89nglish','node=canon&node=english','node=english&node=canon','node=books&availability=none','node=post&collection=sn']:
    count=len(calls);page.goto(base+'/#browse?'+query);page.get_by_role('heading',name='No passage was substituted.',exact=True).wait_for();assert page.locator('.cards').count()==0;assert len(calls)==count
   passed('noncanonical aliases, duplicate nodes and off-route filters refuse before any request or silent filter drop')
   page.goto(base+'/#browse?node=canon');page.get_by_role('heading',name='The Pāli Canon',exact=True).wait_for()
   held=[]
   def delay(route):
    if route.request.post_data_json.get('params',{}).get('arguments',{}).get('node')=='english':held.append(route)
    else:route.continue_()
   page.route('**/mcp',delay)
   with page.expect_request(lambda r:r.method=='POST' and r.url.endswith('/mcp') and r.post_data_json.get('params',{}).get('arguments',{}).get('node')=='english'):page.goto(href())
   page.get_by_role('link',name='Library',exact=True).click();page.get_by_role('heading',name='The Pāli Canon',exact=True).wait_for();assert held;reply(held[0],linked);page.unroute('**/mcp');assert page.get_by_role('heading',name='Find English sources',exact=True).count()==0;passed('delayed catalogue response cannot replace newer library navigation')
   page.goto(href('scoped'));ready(page);selected=scoped['items'][0]['id'];page.locator('.cards .entry').first.click();page.locator('.passage').first.wait_for();assert urllib.parse.parse_qs(page.url.split('?',1)[1])['uid']==[selected]
   assert any(c['name']=='get_text' and c['arguments'].get('uid')==selected for c in calls);assert not any(c['name']=='get_translation' for c in calls)
   assert page.evaluate("localStorage.getItem('pali-library-v1')")==before;assert not errors,errors;passed('card opens exact Pali UID without automatic English retrieval or personal-data changes')
   for node in ['books','commentary','post']:
    page.goto(base+'/#browse?node='+node);page.locator('#status').filter(has_text='Opening').wait_for(state='hidden');assert page.get_by_label('English availability',exact=True).count()==0
   passed('English filters remain absent from source books/commentary/later-work views');context.close()
  browser.close()
 result={'passed':len(checks),'checks':checks,'installed':bool(args.package_dir or args.server_dir),'linked_registered_partials_verified':len(partial_ids),'scoped_records_verified':scoped['total'],'a11y':{'scans':len(scans),'violations':sum(len(x['violations']) for x in scans),'results':scans},'limits':'Actual bundled metadata/Pali navigation; mixed-scope, unsafe-command and delayed responses are explicit controlled fixtures. No English source requests, mapping approvals, live publisher or physical-device certification. Seeded reading-position saving disabled to isolate catalogue storage behavior.'}
 text=json.dumps(result,indent=2);print(text)
 if args.report:pathlib.Path(args.report).write_text(text+'\n',encoding='utf-8')
 if result['a11y']['violations']:raise SystemExit(1)
finally:server.terminate();server.wait(timeout=10)
