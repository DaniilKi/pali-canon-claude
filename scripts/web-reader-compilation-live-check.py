#!/usr/bin/env python3
"""Opt-in real compilation integration. Records metadata/hashes only, never publisher text bodies."""
from web_reader_test_helpers import read_tool, find_control
import argparse,datetime,hashlib,json,os,pathlib,socket,subprocess,time,urllib.request
from playwright.sync_api import sync_playwright,expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--live',action='store_true',required=True,help='Explicitly permit existing engine provider requests');p.add_argument('--a11y',action='store_true');p.add_argument('--report');p.add_argument('--server-dir',type=pathlib.Path,help='Test an extracted package outside the checkout');args=p.parse_args()
manifest=json.loads((ROOT/'scripts/canon/reviewed_shared_pages.json').read_text());rows=manifest['links'];checks=[];receipts=[];scans=[]
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
base=f'http://127.0.0.1:{port}';server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server';server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.server_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def rpc(name,arguments):
 data=json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}}).encode()
 return json.load(urllib.request.urlopen(urllib.request.Request(base+'/mcp',data=data,headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'}),timeout=180))['result']
def tool(name,arguments):
 result=rpc(name,arguments);data=result.get('structuredContent')
 if data is None:data=json.loads(next(c['text'] for c in result.get('content',[]) if c['type']=='text'))
 assert not result.get('isError') and 'error' not in data,(name,data.get('error','MCP error'))
 return data
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 for row in rows:
  uid=row['text_ids'][-1];version='ati:'+row['path'];metadata=tool('get_text',{'uid':uid,'limit':1});choice=next(c for c in metadata['english_available'] if c['translation_id']==version);scope=choice['translation_scope'];assert scope['presentation']=='compilation' and scope['condensed'] is False and scope['text_ids']==row['text_ids'] and scope['notice_sha256']==row['notice_sha256']
  for request in [{'uid':uid},{'uid':uid,'translation':version}]:
   result=rpc('get_translation',request);assert result.get('isError') and any(x in json.dumps(result).lower() for x in ['shared','scoped','allow_shared'])
  checks.append({'width':'http','page':row['owner_id'],'check':'actual metadata preserves exact members; ordinary and exact-without-consent retrieval refuse'})
  params={'uid':uid,'translation':version,'allow_shared':True,'scope_sha256':scope['scope_sha256'],'limit':1000};pages=[];offset=0
  while params:
   result=tool('get_translation',params);assert result['text_id'] is None and result['requested_text_id']==uid and result['translation_scope']==scope and result['translation_id']==version and result['citation']==row['source_reference'] and result['whole_unit_coverage'] is False and result['offset']==offset
   assert digest({'licensing':result['license'],'citation':result['attribution']})==row['notice_sha256'];pages.append(result['text']);offset+=len(result['text']);n=result.get('continue_with')
   if n:
    assert n['name']=='get_translation';params=n['arguments'];assert params['uid']==uid and params['translation']==version and params['allow_shared'] is True and params['scope_sha256']==scope['scope_sha256'] and params['offset']==offset and len(params['prefix_sha256'])==64
   else:params=None
  assert digest(''.join(pages))==row['text_sha256'];receipts.append({'page':row['owner_id'],'requested_subject':uid,'translation_id':version,'publisher_reference':row['source_reference'],'members':row['text_ids'],'characters':offset,'http_pages':len(pages),'text_sha256':row['text_sha256'],'notice_sha256':row['notice_sha256'],'scope_sha256':scope['scope_sha256'],'fetched_from':result.get('fetched_from'),'fetched_url':result.get('fetched_url')});checks.append({'width':'http','page':row['owner_id'],'check':'real English continuation reconstructs pinned full page and notice without individual attribution'})
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  contexts=[(w,t) for w in [390,1280] for t in ['light','dark']] if args.a11y else [(w,'light') for w in [320,390,768,1280]]
  for width,theme in contexts:
   context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y);context.add_init_script("localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'theme':theme})+"))");page=context.new_page();errors=[];calls=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def record(req):
    if req.method=='POST' and req.url.endswith('/mcp') and req.post_data_json.get('params',{}).get('name')=='get_translation':calls.append(req.post_data_json['params']['arguments'])
   page.on('request',record)
   def audit(state,owner):
    if not args.a11y:return
    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));d=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'page':owner,'state':state,'violations':[{'id':v['id'],'impact':v['impact'],'targets':[n['target'] for n in v['nodes']]} for v in d['violations']],'manual_review_rules':[v['id'] for v in d['incomplete']]})
   for row in rows:
    uid=row['text_ids'][-1];version='ati:'+row['path'];before=len(calls);page.goto(base+'/#read?uid='+uid);read_tool(page, 'English sources').wait_for();read_tool(page, 'English sources').click();page.get_by_role('button',name='Review shared compilation page',exact=True).wait_for();assert len(calls)==before;audit('source choices',row['owner_id']);page.get_by_role('button',name='Review shared compilation page',exact=True).click();page.get_by_role('heading',name='Review English source scope',exact=True).wait_for();assert page.locator('#study li').count()==len(row['text_ids']);assert all(uid in page.locator('#study').inner_text() for uid in row['text_ids']);assert row['source_reference'] in page.locator('#study').inner_text();expect(page.locator('#scope-consent')).not_to_be_checked();expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_disabled();assert len(calls)==before;audit('explicit consent',row['owner_id']);checks.append({'width':width,'page':row['owner_id'],'check':'no English request before consent; exact publisher reference and all actual members displayed'})
    page.locator('#scope-consent').focus();page.keyboard.press('Space');page.keyboard.press('Tab');expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_focused()
    with page.expect_response(lambda r:r.request.method=='POST' and r.url.endswith('/mcp') and r.request.post_data_json.get('params',{}).get('name')=='get_translation',timeout=180000) as response:page.keyboard.press('Enter')
    payload=response.value.json()['result']['structuredContent'];page.locator('#study .translation').wait_for(timeout=180000);assert payload['text_id'] is None and payload['requested_text_id']==uid and payload['whole_unit_coverage'] is False and payload['translation_id']==version and payload['next_offset'] is None;assert digest(page.locator('#study .translation').text_content())==row['text_sha256'];assert digest({'licensing':payload['license'],'citation':payload['attribution']})==row['notice_sha256'];assert payload['license'] in page.locator('#study .provenance').text_content() and payload['attribution'] in page.locator('#study .provenance').text_content();assert 'Shared English source page' in page.locator('#study h3').inner_text();assert row['source_reference'] in page.locator('#study').inner_text();assert 'not a separately aligned full translation' in page.locator('#study').inner_text();assert calls[-1]['allow_shared'] is True and calls[-1]['scope_sha256']==payload['translation_scope']['scope_sha256'];assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');audit('real compiled page',row['owner_id']);checks.append({'width':width,'page':row['owner_id'],'check':'keyboard consent retrieves and renders the exact pinned real page and full notice with page-level identity'})
    page.get_by_role('button',name='Reload passage and review sources',exact=True).click();read_tool(page, 'English sources').wait_for();read_tool(page, 'English sources').click();page.get_by_role('button',name='Review shared compilation page',exact=True).click();expect(page.locator('#scope-consent')).not_to_be_checked();checks.append({'width':width,'page':row['owner_id'],'check':'reloading the source requires new explicit consent'})
   assert not errors,errors;context.close()
  browser.close()
 result={'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'live':True,'outside_source_tree':bool(args.server_dir),'passed':len(checks),'checks':checks,'sources':receipts,'vri_commit':manifest['vri_commit'],'ati_archive_commit':manifest['ati_commit'],'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Real current approved-provider responses, through the actual worker-backed HTTP bundle and browser. No publisher text body is stored in this report. No new scholarly alignment/rights approval, human accessibility certification or physical-device claim. Audit contexts alone bypass CSP for axe-core injection.'};text=json.dumps(result,indent=2);print(text)
 if args.report:pathlib.Path(args.report).write_text(text+'\n')
 if result['a11y']['violations']:raise SystemExit(1)
finally:
 server.terminate();server.wait(timeout=10)
