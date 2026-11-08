#!/usr/bin/env python3
"""Actual Pāli quote engine; labelled malformed, hostile and late-response fixtures. No live English."""
import argparse,json,os,pathlib,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1];p=argparse.ArgumentParser();p.add_argument('--report');p.add_argument('--a11y',action='store_true');p.add_argument('--server-dir',type=pathlib.Path);args=p.parse_args()
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}';checks=[];scans=[];server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server';server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.server_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
quote='Sabbapāpassa akaraṇaṃ kusalassa upasampadā sacittapariyodapanaṃ'
def passed(width,name):checks.append({'width':width,'check':name})
def tool(text):
 payload={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':'verify_quote','arguments':{'text':text,'language':'pali','limit':5}}};data=json.dumps(payload).encode();result=json.load(urllib.request.urlopen(urllib.request.Request(base+'/mcp',data=data,headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})))['result'];assert not result.get('isError');return result['structuredContent']
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 expected=tool(quote);native='सब्बपापस्स अकरणं कुसलस्स उपसम्पदा सचित्तपरियोदपनं';native_expected=tool(native);negative='zzzxqv zzzxqv zzzxqv';negative_expected=tool(negative);assert negative_expected['verdict']=='not_found_in_scope'
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  cases=[(390,theme) for theme in ['light','dark']]+[(1280,theme) for theme in ['light','dark']] if args.a11y else [(320,'light'),(390,'light'),(768,'light'),(1280,'light')]
  for width,theme in cases:
   context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y);context.add_init_script("localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'theme':theme})+"))");page=context.new_page();errors=[];calls=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:calls.append(r.post_data_json['params']) if r.method=='POST' and r.url.endswith('/mcp') and r.post_data_json.get('method')=='tools/call' else None)
   def audit(state):
    if not args.a11y:return
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));d=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'state':state,'violations':[{'id':v['id'],'impact':v['impact'],'targets':[n['target'] for n in v['nodes']]} for v in d['violations']],'manual_review_rules':[v['id'] for v in d['incomplete']]})
   def submit(text):
    page.get_by_label('Pāli quotation',exact=True).fill(text);page.get_by_role('button',name='Check bundled Pāli',exact=True).focus();page.keyboard.press('Enter');page.locator('#quote-result[aria-busy]').wait_for(state='hidden')
   page.goto(base+'/#browse?node=canon');page.get_by_role('link',name='Check quote',exact=True).click();page.get_by_label('Pāli quotation',exact=True).wait_for();assert page.locator('#quote-input').get_attribute('maxlength')=='2000';assert page.title()=='Check a Pāli quotation · Pāli Library';assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');audit('empty form');passed(width,'keyboard-labelled Pāli-only form is discoverable and fits the viewport')
   submit(quote);expect(page.get_by_role('heading',name='Matching wording found',exact=True)).to_be_visible();result=page.locator('#quote-result');assert expected['scope']['searched'] in result.inner_text();assert expected['comparison']['note'] in result.inner_text();assert expected['citation_note'] in result.inner_text();assert expected['scope']['terms'] in result.inner_text();assert result.locator('.word-card .passage').all_text_contents()==[m['matched_text'] for m in expected['matches']];assert page.evaluate('document.activeElement.id')=='quote-result';assert quote not in page.url and quote not in page.title() and quote not in page.evaluate("localStorage.getItem('pali-library-v1')");assert calls[-1]['arguments']=={'text':quote,'language':'pali','limit':5};audit('actual matches');passed(width,'actual source wording, repeated-source caution and terms are retained without storing the quotation')
   page.get_by_role('link',name='Open source at match start · Dhp 183',exact=True).click();expect(page.locator('.segment-label span').first).to_contain_text('dhp183/1');assert 'ref=dhp183%2F1' in page.url;passed(width,'candidate reading link opens the exact canonical match start')
   page.goto(base+'/#verify');submit(native);expect(page.get_by_role('heading',name='Matching wording found',exact=True)).to_be_visible();assert native_expected['input_romanized'] in result.inner_text();assert result.locator('.word-card .passage').all_text_contents()==[m['matched_text'] for m in native_expected['matches']];passed(width,'native Pāli input retains engine conversion labels and Roman source evidence')
   submit(negative);expect(page.get_by_role('heading',name='Not found in the searched scope',exact=True)).to_be_visible();assert negative_expected['explanation'] in result.inner_text();audit('negative scope');passed(width,'negative result remains limited to canonical texts searched and never claims a fake quotation')
   submit('a '*121);expect(page.get_by_role('heading',name='Unable to check this quotation',exact=True)).to_be_visible();assert '120 words' in result.inner_text();assert result.locator('.word-card').count()==0;passed(width,'engine word limit is enforced without an invented verdict and form remains usable')
   def corrupt(route):
    payload=route.request.post_data_json
    if payload.get('params',{}).get('name')!='verify_quote':route.continue_();return
    response=route.fetch();data=response.json();data['result']['structuredContent']['scope']={};route.fulfill(response=response,json=data)
   page.route('**/mcp',corrupt);submit(quote);expect(page.get_by_role('heading',name='Unable to check this quotation',exact=True)).to_be_visible();assert 'incomplete' in result.inner_text();assert result.locator('.word-card').count()==0;audit('malformed scope');page.unroute('**/mcp');passed(width,'missing scope metadata fails closed without rendering a verdict or match')
   def hostile(route):
    payload=route.request.post_data_json
    if payload.get('params',{}).get('name')!='verify_quote':route.continue_();return
    response=route.fetch();data=response.json();data['result']['structuredContent']['explanation']='<img src=x onerror=alert(1)> synthetic fixture';route.fulfill(response=response,json=data)
   page.route('**/mcp',hostile);submit(quote);assert '<img src=x' in result.inner_text();assert result.locator('img').count()==0;page.unroute('**/mcp');passed(width,'untrusted result strings stay inert text under normal production CSP')
   held=[]
   def hold(route):
    if route.request.post_data_json.get('params',{}).get('name')=='verify_quote':held.append(route)
    else:route.continue_()
   page.route('**/mcp',hold);page.get_by_label('Pāli quotation',exact=True).fill(quote);page.get_by_role('button',name='Check bundled Pāli',exact=True).click();page.wait_for_function("document.getElementById('quote-result').getAttribute('aria-busy')==='true'");page.get_by_role('link',name='Library',exact=True).click();page.get_by_role('heading',name='The Pāli Canon',exact=True).wait_for();assert held;payload=held[0].request.post_data_json;held[0].fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':payload['id'],'result':{'structuredContent':expected}}));page.locator('#quote-result').wait_for(state='detached');assert not any(c['name']=='get_translation' for c in calls);assert not errors,errors;passed(width,'late comparison cannot replace newer navigation and no live English is requested');context.close()
  browser.close()
 result={'passed':len(checks),'outside_source_tree':bool(args.server_dir),'checks':checks,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Real bundled Pāli matching; malformed, hostile and late responses are labelled controlled fixtures. English quote matching is intentionally not exposed. No human accessibility, physical-device or authorship certification. Only axe audit contexts bypass CSP.'};text=json.dumps(result,indent=2);print(text)
 if args.report:pathlib.Path(args.report).write_text(text+'\n')
 if result['a11y']['violations']:raise SystemExit(1)
finally:server.terminate();server.wait(timeout=10)
