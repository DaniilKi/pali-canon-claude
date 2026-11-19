#!/usr/bin/env python3
"""Refresh actual source displays after script changes without executing local form drafts."""
import argparse,copy,hashlib,json,os,pathlib,socket,subprocess,time,urllib.parse,urllib.request
from playwright.sync_api import expect,sync_playwright
from web_reader_test_helpers import find_control
ROOT=pathlib.Path(__file__).resolve().parents[1];KEY='pali-library-v1';PRIVATE='PRIVATE_SCRIPT_REFRESH_NOTE_ā😀';UNSENT='UNSENT_SCRIPT_QUERY_';BOOK_DRAFT='sati  source draft ā😀  '
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--a11y',action='store_true');p.add_argument('--debug',action='store_true',help='Only the first 390px refresh case');p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--report');args=p.parse_args()
server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server'
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';checks=[];scans=[];receipts=[]
server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.server_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def tool(name,arguments):
 body={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}}
 request=urllib.request.Request(base+'/mcp',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
 result=json.load(urllib.request.urlopen(request,timeout=60))['result'];assert not result.get('isError');return result['structuredContent']
def sha(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def revision(data):return data['source'].get('locator_revision',data['source']['commit'])
def texts(case,data):return [data['citation']+' · '+data['title']] if case['tool']=='resolve_reference' else [row['excerpt'] for row in data['results']]
def refs(data):return [r.get('ref',r.get('segment_ref',r.get('citation'))) for r in data.get('results',[])]
def fulfill(route,data):route.fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':route.request.post_data_json['id'],'result':{'structuredContent':data}}))
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise AssertionError('Bundled server did not become ready')
 cases=[
  {'name':'source headings','route':'book-search?book=vin02m1&mode=headings&offset=15','tool':'search_source_book','arguments':{'book':'vin02m1','query':'','headings_only':True,'offset':15,'limit':15},'selector':'.book-search-results .passage'},
  {'name':'source query','route':'book-search?book=vin02m1&q=sati','tool':'search_source_book','arguments':{'book':'vin02m1','query':'sati','offset':0,'limit':15},'selector':'.book-search-results .passage'},
  {'name':'canonical search','route':'search?q=sati&scope=canon&offset=15','tool':'search_texts','arguments':{'query':'sati','offset':15,'limit':15},'selector':'section[aria-label="Matching Pāli passages"] .search-excerpt'},
  {'name':'commentary search','route':'search?q=sati&scope=commentary&offset=15','tool':'search_commentary','arguments':{'query':'sati','offset':15,'limit':15},'selector':'.commentary-search-result > .entry .search-excerpt'},
  {'name':'later-work search','route':'search?q=sati&scope=post&offset=15','tool':'search_post_canonical','arguments':{'query':'sati','offset':15,'limit':15},'selector':'.post-search-result > .entry .search-excerpt'},
  {'name':'citation lookup','route':'resolve?reference=MN%2010','tool':'resolve_reference','arguments':{'reference':'MN 10'},'selector':'#view > h2'}]
 for case in cases:
  case['data']={script:tool(case['tool'],{**case['arguments'],'script':script}) for script in ['roman','sinhala','thai']}
  assert texts(case,case['data']['roman']) and texts(case,case['data']['roman'])!=texts(case,case['data']['sinhala'])
  assert refs(case['data']['roman'])==refs(case['data']['sinhala'])
  for script,data in case['data'].items():
   if isinstance(data.get('source'),dict) and data['source'].get('commit'):assert revision(data)==revision(case['data']['roman'])
   if 'query' in case['arguments']:assert data['query']==case['arguments']['query'] and data['offset']==case['arguments']['offset']
  if case['tool']=='search_source_book':case['route']+='&source='+revision(case['data']['roman'])
 daily=tool('daily_text',{'date':'2026-11-19','kind':'verse'})
 read_data={script:tool('get_text',{'uid':'dhp183','offset':0,'limit':30,'script':script}) for script in ['roman','sinhala']}
 daily_data={script:tool('get_text',{'uid':daily['text']['id'],'offset':0,'limit':30,'script':script}) for script in ['roman','sinhala']}
 assert [s['text'] for s in daily['pali']]==[s['text'] for s in daily_data['roman']['segments']]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True);expect.set_options(timeout=30000)
  contexts=[(390,'light')] if args.debug else [(390,'light'),(1280,'light')]+([(390,'dark'),(1280,'dark')] if args.a11y else [])
  for width,theme in contexts:
   context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y)
   seed={'theme':theme,'script':'roman','remember_position':False,'saved':[{'uid':'dhp183','ref':'dhp183/1','offset':0,'title':'Synthetic private fixture','note':PRIVATE+'durable'}],'reading_progress':[]}
   context.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+');'+"window.refreshIgnoreAbort=false;const refreshFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.refreshIgnoreAbort&&options?.signal){window.refreshIgnoreAbort=false;const {signal,...rest}=options;return refreshFetch(url,rest).then(async response=>{await response.clone().text();document.documentElement.setAttribute('data-refresh-body-complete','true');return response})}return refreshFetch(url,options)}")
   state={'calls':[],'forbidden':[],'errors':[],'mode':None,'held':[]};page=context.new_page()
   def intercept(route):
    req=route.request
    if not req.url.startswith(base+'/') or PRIVATE in urllib.parse.unquote(req.url) or PRIVATE in (req.post_data or '') or UNSENT in (req.post_data or '') or BOOK_DRAFT in (req.post_data or ''):state['forbidden'].append(req.url);route.abort();return
    if req.method=='POST' and req.url.endswith('/mcp'):
     params=req.post_data_json['params'];state['calls'].append(copy.deepcopy(params))
     if params['name'] not in ['search_source_book','search_texts','search_commentary','search_post_canonical','resolve_reference','get_text','daily_text'] or params['name']=='get_text' and 'translation' in params['arguments']:state['forbidden'].append(params);route.abort();return
     if state['mode'] and params['name']=='search_source_book':
      mode=state['mode'];state['mode']=None
      if mode=='error':route.fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':req.post_data_json['id'],'result':{'isError':True,'structuredContent':{'error':'Controlled script refresh service failure'}}}));return
      response=route.fetch();body=response.json();data=body['result']['structuredContent']
      if mode=='drift':data['source']['locator_revision']='controlled-script-refresh-source-change';route.fulfill(response=response,json=body);return
      state['held'].append((route,data));page.locator('html').evaluate("node=>node.setAttribute('data-refresh-held','true')");return
    route.continue_()
   context.route('**/*',intercept);page.on('pageerror',lambda error:state['errors'].append(str(error)))
   def passed(label):checks.append({'width':width,'theme':theme,'check':label});print(f'{width}px {theme}: {label}',flush=True)
   def audit(label):
    assert not state['forbidden'] and not state['errors'];assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    raw=page.evaluate('key=>localStorage.getItem(key)',KEY);assert UNSENT not in raw and BOOK_DRAFT not in raw
    stored=json.loads(raw);assert stored['saved']==seed['saved'] and stored['reading_progress']==[]
    assert UNSENT not in page.url and PRIVATE not in page.url and BOOK_DRAFT not in page.url
    if args.a11y:
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));d=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'state':label,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in d['violations']]})
   def saved():page.goto(base+'/#saved');expect(page.get_by_role('heading',name='Saved passages',exact=True)).to_be_visible()
   def preferences():
    if page.locator('.preferences').get_attribute('open') is None:page.locator('.preferences > summary').click()
   def select(script):preferences();page.locator('#script').focus();page.locator('#script').select_option(script)
   def ready(case,script):
    data=case['data'][script];expect(page.locator(case['selector'])).to_have_text(texts(case,data));assert page.locator(case['selector']).all_text_contents()==texts(case,data)
    if isinstance(data.get('source'),dict) and data['source'].get('commit'):expect(page.get_by_role('region',name='Source attribution',exact=True)).to_contain_text(data['source']['commit'])
    if case['tool']=='search_texts':
     expect(page.locator('section[aria-label="Matching titles"] strong')).to_have_text([r['title'] for r in data['title_matches']])
     expect(page.locator('section[aria-label="Matching Pāli passages"] strong')).to_have_text([r['title'] for r in data['results']])
    elif case['tool']=='search_commentary':expect(page.locator('.commentary-search-result > .entry strong')).to_have_text([r['book']['title'] for r in data['results']])
    elif case['tool']=='search_post_canonical':expect(page.locator('.post-search-result > .entry strong')).to_have_text([r['book_title'] for r in data['results']])
    for key in ['query_note','script_note']:
     if data.get(key):expect(page.locator('#view')).to_contain_text(data[key])
   def draft_form():
    form=page.get_by_role('form',name='Source book search',exact=True);form.locator('input').fill(BOOK_DRAFT);form.locator('input').evaluate('(node)=>node.setSelectionRange(2,7)');return form.locator('input')
   def assert_form():
    field=page.get_by_role('form',name='Source book search',exact=True).locator('input');expect(field).to_have_value(BOOK_DRAFT);assert field.evaluate('(node)=>[node.selectionStart,node.selectionEnd]')==[2,7]
   def hold_next():state['mode']='hold';page.evaluate("window.refreshIgnoreAbort=true;document.documentElement.removeAttribute('data-refresh-held');document.documentElement.removeAttribute('data-refresh-body-complete')")
   def release():route,data=state['held'].pop(0);fulfill(route,data);expect(page.locator('html')).to_have_attribute('data-refresh-body-complete','true');page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
   saved();page.get_by_label('Your personal note',exact=True).fill(PRIVATE+'draft')
   selected_cases=cases[:1] if args.debug else cases if theme=='light' else [cases[0],cases[2]]
   for case in selected_cases:
    if page.locator('#script').input_value()!='roman':select('roman')
    page.goto(base+'/#'+case['route']);ready(case,'roman')
    find_control(page,'#query').fill(UNSENT+'finder');page.locator('#search-scope').select_option('post' if 'scope=post' not in case['route'] else 'canon');draft_scope=page.locator('#search-scope').input_value()
    has_form=case['tool']=='search_source_book'
    if has_form:draft_form()
    url=page.url
    for script in ['sinhala','roman']+(['thai','roman'] if case is cases[0] else []):
     before=len(state['calls']);select(script);ready(case,script)
     assert state['calls'][before:]==[{'name':case['tool'],'arguments':{**case['arguments'],'script':script}}]
     assert page.url==url;expect(page.locator('#script')).to_be_focused();expect(page.locator('#find-panel')).to_have_attribute('open','')
     expect(page.locator('#query')).to_have_value(UNSENT+'finder');expect(page.locator('#search-scope')).to_have_value(draft_scope)
     if has_form:assert_form()
     audit(case['name']+' '+script)
    if case is cases[1]:
     field=page.get_by_role('form',name='Source book search',exact=True).locator('input');field.fill('sati');old_field=field.element_handle();before=len(state['calls']);field.press('Enter');page.wait_for_function('(node)=>!node.isConnected',arg=old_field);ready(case,'roman')
     expect(page.get_by_role('form',name='Source book search',exact=True).locator('input')).to_have_value('sati')
     assert state['calls'][before:]==[{'name':case['tool'],'arguments':{**case['arguments'],'script':'roman'}}]
     assert page.url==url
    receipts.append({'width':width,'theme':theme,'view':case['name'],'route':case['route'],'refs':refs(case['data']['roman']),'roman_sha256':sha(texts(case,case['data']['roman'])),'sinhala_sha256':sha(texts(case,case['data']['sinhala'])),'source_commit':case['data']['roman'].get('source',{}).get('commit')})
    passed(case['name']+': actual script output, executed offset/query/source pin, finder/form drafts and script focus retained')
   if args.debug or theme=='dark':context.close();continue
   case=cases[0];page.goto(base+'/#'+case['route']);ready(case,'roman');draft_form()
   # A late transport that ignores AbortSignal cannot replace a newer script or route.
   hold_next();select('sinhala');expect(page.locator('html')).to_have_attribute('data-refresh-held','true');select('thai');ready(case,'thai');release();ready(case,'thai');expect(page.locator('#script')).to_be_focused();assert_form();audit('late old script refused');passed('rapid script changes retain only latest actual result despite abort-ignoring old body')
   hold_next();select('sinhala');expect(page.locator('html')).to_have_attribute('data-refresh-held','true');saved();field=page.get_by_label('Your personal note',exact=True);expect(field).to_have_value(PRIVATE+'draft');field.focus();release();expect(field).to_be_focused();expect(field).to_have_value(PRIVATE+'draft');passed('navigation and private editor reject late script-refresh body without focus stealing')
   # Static personal editors must keep their DOM and in-tab drafts while preference changes.
   node=field.element_handle();before=len(state['calls']);select('roman');assert node.evaluate('(node)=>node.isConnected');assert len(state['calls'])==before;expect(field).to_have_value(PRIVATE+'draft')
   with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
   exported=json.loads(pathlib.Path(download.value.path()).read_text());assert exported['saved'][0]['note']==PRIVATE+'draft';audit('static editor and export');passed('static Saved script preference preserves exact private editor node, draft and export without MCP request')
   page.goto(base+'/#'+case['route']);ready(case,'roman');draft_form();find_control(page,'#query').fill(UNSENT+'failure');page.locator('#search-scope').select_option('post');state['mode']='error';select('sinhala');expect(page.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible()
   find_control(page,'#query').fill(UNSENT+'edited after failure');page.locator('#search-scope').select_option('commentary');page.get_by_role('button',name='Try again',exact=True).click();page.locator('#script').focus();ready(case,'sinhala');assert_form()
   expect(page.locator('#query')).to_have_value(UNSENT+'edited after failure');expect(page.locator('#search-scope')).to_have_value('commentary');expect(page.locator('#find-panel')).to_have_attribute('open','');expect(page.locator('#script')).to_be_focused();audit('service retry restores unsubmitted form draft and latest finder edits')
   hold_next();select('roman');expect(page.locator('html')).to_have_attribute('data-refresh-held','true');page.get_by_role('button',name='Stop waiting for Source-book search',exact=True).click();expect(page.get_by_role('heading',name='Reading request stopped',exact=True)).to_be_visible();page.get_by_role('button',name='Try again',exact=True).click();ready(case,'roman');assert_form();release();ready(case,'roman');audit('Stop retry restores exact draft');passed('service failure and Stop/retry preserve raw source query draft and selection without executing it')
   state['mode']='drift';select('sinhala');expect(page.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible();expect(page.locator('.book-search-results .passage')).to_have_count(0);assert page.url.endswith(case['route']);audit('old pinned source refuses changed revision');passed('pinned source refresh refuses replacement wording when returned source revision drifts')
   select('roman');page.goto(base+'/#read?uid=dhp183');expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in read_data['roman']['segments']]);select('sinhala');expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in read_data['sinhala']['segments']]);expect(page.locator('#script')).to_be_focused()
   page.goto(base+'/#daily?date=2026-11-19&kind=verse');expect(page.locator('.daily-reading .passage')).to_have_text([s['text'] for s in daily_data['sinhala']['segments']]);select('roman');expect(page.locator('.daily-reading .passage')).to_have_text([s['text'] for s in daily_data['roman']['segments']]);expect(page.locator('#script')).to_be_focused();audit('existing read and daily refresh');passed('existing actual reading and dated verse refresh still preserve script-control focus')
   saved();expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+'draft');audit('final private draft retained');context.close()
  browser.close()
 result={'passed':len(checks),'checks':checks,'actual_sources':receipts,'outside_source_tree':bool(args.server_dir),'debug':args.debug,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual bundled MCP and Chromium, local server only. Controlled service failure, revision drift and abort-ignoring held actual responses are explicit fixtures. Reports contain hashes and source metadata, no source bodies or private draft values. Not publisher availability, native-reader, physical-device or human screen-reader certification.'}
 if args.report:pathlib.Path(args.report).write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2));assert result['a11y']['violations']==0
finally:server.terminate();server.wait(timeout=10)
