#!/usr/bin/env python3
"""Real MCP scoped-source guards against synthetic in-memory bindings; compilation uses a labelled forward UI fixture."""
import argparse, copy, json, os, pathlib, socket, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--report');parser.add_argument('--a11y', action='store_true', help='Use a separate CSP-bypassing context only to inject axe-core');args=parser.parse_args()
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
ledger=pathlib.Path(tempfile.gettempdir())/f'pali-scope-{port}.jsonl';ledger.write_text('')
server=subprocess.Popen(['node','scripts/web-reader-scope-fixtures.mjs'],cwd=ROOT,env={**os.environ,'PORT':str(port),'PALI_SCOPE_FIXTURES':'1','PALI_SCOPE_LEDGER':str(ledger)},stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
base=f'http://127.0.0.1:{port}';checks=[];scans=[]
def passed(width,name):checks.append({'width':width,'check':name})
def count():return len(ledger.read_text().splitlines())
def mcp(name,arguments):
 payload=json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}}).encode()
 return json.load(urllib.request.urlopen(urllib.request.Request(base+'/mcp',data=payload,headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})))['result']['structuredContent']
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 shared=mcp('get_text',{'uid':'iti11','limit':1})['english_available'][0];partial=mcp('get_text',{'uid':'patthana1.1','limit':1})['english_available'][0]
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  for width,theme in [(w,t) for w in [390,1280] for t in (['light','dark'] if args.a11y else ['light'])]:
   context=b.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y)
   context.add_init_script("localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'theme':theme})+"))")
   page=context.new_page();calls=[];errors=[]
   def audit(state):
    if not args.a11y:return
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
    data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
    scans.append({'width':width,'theme':theme,'state':state,'violations':[{'id':v['id'],'impact':v['impact'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']],'manual_review_rules':[v['id'] for v in data['incomplete']]})
   page.on('pageerror',lambda error:errors.append(str(error)))
   def record(req):
    if req.method=='POST' and req.url.endswith('/mcp'):
     data=req.post_data_json
     if data.get('params',{}).get('name')=='get_translation':calls.append(data['params']['arguments'])
   page.on('request',record)
   def review(uid,label):
    page.goto(base+'/#read?uid='+uid);page.reload();page.get_by_role('button',name='English sources',exact=True).wait_for();page.get_by_role('button',name='English sources',exact=True).click();page.get_by_role('button',name=label,exact=True).wait_for();audit('source choices');page.get_by_role('button',name=label,exact=True).click();page.get_by_role('heading',name='Review English source scope',exact=True).wait_for()
   before=count();review('iti11','Review shared condensed page');assert len(calls)==0 and count()==before;assert page.locator('#study li').count()==4;assert 'not a separately aligned full translation' in page.locator('#study').inner_text();expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_disabled();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');passed(width,'all shared members and limitations shown before consent, with no translation retrieval')
   audit('shared consent');page.locator('#scope-consent').focus();page.keyboard.press('Space');expect(page.locator('#scope-consent')).to_be_checked();page.keyboard.press('Tab');expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_focused();page.keyboard.press('Enter');page.locator('.translation').wait_for();audit('shared page');assert 'Shared English source page' in page.locator('#study h3').inner_text();assert 'Pāli selection: Iti 11' in page.locator('#study').inner_text();assert 'not a separately aligned full translation' in page.locator('#study').inner_text();assert calls[-1]['allow_shared'] is True and calls[-1]['scope_sha256']==shared['translation_scope']['scope_sha256'];passed(width,'shared source is retrieved only after exact pinned consent and remains page-level')
   page.get_by_role('button',name='Next English page →',exact=True).click();page.locator('.translation').wait_for();expect(page.locator('#study .translation')).to_be_visible();assert calls[-1]['uid']=='iti11' and calls[-1]['allow_shared'] is True and calls[-1]['translation']==shared['translation_id'] and calls[-1]['scope_sha256']==shared['translation_scope']['scope_sha256'] and len(calls[-1]['prefix_sha256'])==64;passed(width,'shared continuation retains version, requested member, consent, source prefix and mapping')
   prior=len(calls);review('iti12','Review shared condensed page');expect(page.locator('#scope-consent')).not_to_be_checked();expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_disabled();assert len(calls)==prior;passed(width,'moving to another member requires new explicit consent')
   prior=len(calls);review('patthana1.1','Review partial-unit source');assert 'patthana1.1/6 to patthana1.1/9' in page.locator('#study').inner_text();expect(page.get_by_role('button',name='Read reviewed partial source',exact=True)).to_be_disabled();assert len(calls)==prior;audit('partial consent');page.locator('#scope-consent').check();page.get_by_role('button',name='Read reviewed partial source',exact=True).click();page.locator('.translation').wait_for();audit('partial page');assert 'Partial English source' in page.locator('#study h3').inner_text();assert calls[-1]['allow_partial'] is True and 'allow_shared' not in calls[-1];passed(width,'partial span is disclosed and never retrieved with whole-unit defaults')
   page.get_by_role('button',name='Next English page →',exact=True).click();page.locator('.translation').wait_for();assert calls[-1]['allow_partial'] is True and calls[-1]['scope_sha256']==partial['translation_scope']['scope_sha256'] and calls[-1]['translation']==partial['translation_id'];passed(width,'partial continuation retains scope and version pins')
   # Real backend checks plus a deliberately corrupted response test the display guard.
   def corrupt_page(route):
    data=route.request.post_data_json
    if data.get('params',{}).get('name')!='get_translation':route.continue_();return
    response=route.fetch();body=response.json();body['result']['structuredContent']['text_id']='iti11';route.fulfill(response=response,json=body)
   review('iti11','Review shared condensed page');page.route('**/mcp',corrupt_page);page.locator('#scope-consent').check();page.get_by_role('button',name='Read reviewed shared page',exact=True).click();page.locator('#study .notice').filter(has_text='incorrectly attributed').wait_for();assert page.locator('.translation').count()==0;passed(width,'shared response attributed to one discourse is rejected before display');page.unroute('**/mcp')
   def corrupt_continuation(route):
    data=route.request.post_data_json
    if data.get('params',{}).get('name')!='get_translation':route.continue_();return
    response=route.fetch();body=response.json();body['result']['structuredContent']['continue_with']['arguments']['uid']='iti14';route.fulfill(response=response,json=body)
   review('iti11','Review shared condensed page');page.route('**/mcp',corrupt_continuation);prior=len(calls);page.locator('#scope-consent').check();page.get_by_role('button',name='Read reviewed shared page',exact=True).click();page.locator('#study .notice').filter(has_text='unsafe continuation').wait_for();assert page.get_by_role('button',name='Next English page →',exact=True).count()==0;assert len(calls)==prior+1;passed(width,'unsafe continuation cannot switch the source to another discourse');page.unroute('**/mcp')
   # Forward UI contract from current dev. Not proof that the old backend supports compilation data.
   forward_scope=copy.deepcopy(shared['translation_scope']);forward_scope.update({'presentation':'compilation','condensed':False,'notice_sha256':'c'*64,'scope_sha256':'d'*64,'source_reference':'Synthetic compilation page','note':'Synthetic compiled source page, with no verified per-discourse wording alignment.'})
   def compilation_fixture(route):
    data=route.request.post_data_json;name=data.get('params',{}).get('name')
    if name=='get_text':
     response=route.fetch();body=response.json();body['result']['structuredContent']['english_available'][0]['translation_scope']=forward_scope;body['result']['structuredContent']['english_available'][0]['reference']='Synthetic compilation page';route.fulfill(response=response,json=body)
    elif name=='get_translation':
     result={'text':'Synthetic compilation UI fixture only.','text_id':None,'requested_text_id':'iti11','citation':forward_scope['source_reference'],'translator':'Synthetic fixture translator','translation_id':shared['translation_id'],'offset':0,'next_offset':None,'attribution':'Synthetic test attribution','license':'Synthetic rights fixture, not a real publication','translation_scope':forward_scope,'whole_unit_coverage':False}
     route.fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':data['id'],'result':{'structuredContent':result}}))
    else:route.continue_()
   page.route('**/mcp',compilation_fixture);review('iti11','Review shared compilation page');assert 'Shared compilation page' in page.locator('#study').inner_text();page.locator('#scope-consent').check();page.get_by_role('button',name='Read reviewed shared page',exact=True).click();page.locator('.translation').wait_for();assert 'Synthetic compilation page' in page.locator('#study').inner_text();passed(width,'forward compilation metadata receives distinct shared-page review, not individual-translation framing');audit('compilation page');page.unroute('**/mcp')
   def unknown_scope(route):
    data=route.request.post_data_json
    if data.get('params',{}).get('name')=='get_text':
     response=route.fetch();body=response.json();body['result']['structuredContent']['english_available'][0]['translation_scope']['kind']='future-unknown-scope';route.fulfill(response=response,json=body)
    else:route.continue_()
   prior=len(calls);page.route('**/mcp',unknown_scope);page.goto(base+'/#read?uid=iti11');page.reload();page.get_by_role('button',name='English sources',exact=True).wait_for();page.get_by_role('button',name='English sources',exact=True).click();page.locator('#study .notice').filter(has_text='unsupported or incomplete').wait_for();assert page.locator('#study button').count()==0 and len(calls)==prior;passed(width,'unknown scope kinds remain withheld without a request');page.unroute('**/mcp')
   assert not errors,errors;context.close()
  b.close()
 result={'checks_passed':len(checks),'checks':checks,'synthetic_only':True,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans,'limitations':'Automated DOM checks only. Audit contexts bypass CSP to inject axe-core; normal scope checks keep production CSP. Human screen-reader and contrast reviews remain.'},'limits':'Condensed/partial use actual current MCP/backend validation with in-memory synthetic source records and a non-network publisher fixture. Compilation is a forward UI fixture, not actual backend integration or source approval.'}
 text=json.dumps(result,indent=2);print(text)
 if args.report:pathlib.Path(args.report).write_text(text+'\n')
 if result['a11y']['violations']:raise SystemExit(1)
finally:
 server.terminate()
 try:server.wait(timeout=10)
 except subprocess.TimeoutExpired:server.kill();server.wait()
