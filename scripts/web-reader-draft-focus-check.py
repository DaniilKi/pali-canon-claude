#!/usr/bin/env python3
"""Actual reader note-session recovery and owned-focus acceptance, with local fixtures.

Uses real bundled MCP source text. Outbound documents, storage failures and held
responses are explicit fixtures; no publisher network or private report values.
"""
import argparse,copy,hashlib,json,os,pathlib,re,socket,subprocess,time,urllib.parse,urllib.request
from playwright.sync_api import expect,sync_playwright,Error as PlaywrightError
from web_reader_test_helpers import find_control
ROOT=pathlib.Path(__file__).resolve().parents[1];KEY='pali-library-v1';JOURNAL='pali-library-note-drafts-v1';PRIVATE='PRIVATE_DRAFT_FOCUS_ā😀';RECOVERY='Unsaved draft recovery'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--report');p.add_argument('--a11y',action='store_true');p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--debug',action='store_true');p.add_argument('--capacity-only',action='store_true');p.add_argument('--malformed-only',action='store_true');p.add_argument('--focus-only',type=int,choices=[390,1280],help='Run only focused response ownership diagnostics at one width');args=p.parse_args()
server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server'
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';checks=[];scans=[];receipts=[]
server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.server_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def tool(name,arguments):
 body={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}};req=urllib.request.Request(base+'/mcp',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'});result=json.load(urllib.request.urlopen(req,timeout=60))['result'];assert not result.get('isError');return result['structuredContent']
def sha(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
def revision(data):return data['source'].get('locator_revision',data['source']['commit'])
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise AssertionError('Actual HTTP bundle did not start')
 dhp=tool('get_text',{'uid':'dhp183','offset':0,'limit':30,'script':'roman'});mn=tool('get_text',{'uid':'mn10','offset':30,'limit':30,'script':'roman'});native=tool('get_text',{'uid':'dhp183','offset':0,'limit':30,'script':'sinhala'})
 mn_route='/#read?'+urllib.parse.urlencode({'uid':'mn10','offset':30,'ref':mn['segments'][0]['ref'],'source':revision(mn)})
 mark={'uid':'dhp183','ref':dhp['segments'][0]['ref'],'offset':0,'source_commit':revision(dhp),'title':dhp['title'],'note':PRIVATE+' durable'}
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True);expect.set_options(timeout=15000)
  contexts=[(390,'light')] if args.capacity_only or args.malformed_only else [(args.focus_only,'light')] if args.focus_only else [(390,'light')] if args.debug else [(390,'light'),(1280,'light')]+([(390,'dark'),(1280,'dark')] if args.a11y else [])
  for width,theme in contexts:
   def passed(label):checks.append({'width':width,'theme':theme,'check':label});print(f'{width}px {theme}: {label}',flush=True)
   def environment(failure=None,mark_override=None):
    context=browser.new_context(viewport={'width':width,'height':844 if width==390 else 900},bypass_csp=args.a11y)
    seed={'theme':theme,'script':'roman','remember_position':False,'saved':[mark_override or mark],'reading_progress':[]}
    init_script='if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(json.dumps(seed))+');'+"window.draftTestSession=window.sessionStorage;window.draftIgnoreAbort=false;const draftFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.draftIgnoreAbort&&options?.signal){window.draftIgnoreAbort=false;const {signal,...rest}=options;return draftFetch(url,rest).then(async response=>{await response.clone().text();document.documentElement.setAttribute('data-draft-body-complete','true');return response})}return draftFetch(url,options)};"
    if failure=='blocked':init_script+="Object.defineProperty(window,'sessionStorage',{configurable:true,get(){throw new DOMException('Controlled session storage denial','SecurityError')}})"
    elif failure=='quota':init_script+="const quotaSession=window.sessionStorage,quotaSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(this===quotaSession)throw new DOMException('Controlled session storage quota','QuotaExceededError');return quotaSet.call(this,key,value)}"
    elif failure=='malformed':init_script+='if(sessionStorage.getItem('+json.dumps(JOURNAL)+')===null)sessionStorage.setItem('+json.dumps(JOURNAL)+',\'{"broken":\')'
    context.add_init_script(init_script)
    state={'calls':[],'forbidden':[],'errors':[],'mode':None,'held':[],'external_url':None,'outbound':[],'dialogs':[],'cancel_leave':False}
    def intercept(route):
     req=route.request
     if PRIVATE in urllib.parse.unquote(req.url) or PRIVATE in (req.post_data or '') or any(PRIVATE in value for value in req.headers.values()):state['forbidden'].append(req.url);route.abort();return
     if not req.url.startswith(base+'/'):
      if req.url==state['external_url'] and req.is_navigation_request():
       state['outbound'].append({'referrer_absent':'referer' not in req.headers,'url_sha256':sha(req.url)});route.fulfill(status=200,content_type='text/html',body='<!doctype html><html lang="en"><title>Controlled outbound document</title><link rel="icon" href="data:,"><h1>Controlled outbound document</h1></html>');return
      state['forbidden'].append(req.url);route.abort();return
     if req.method=='POST' and req.url.endswith('/mcp'):
      params=req.post_data_json['params'];state['calls'].append(copy.deepcopy(params))
      if params['name']!='get_text' or 'translation' in params['arguments']:state['forbidden'].append(params);route.abort();return
      if state['mode']:
       mode=state['mode'];state['mode']=None;response=route.fetch();state['held'].append((route,response,mode));req.frame.evaluate("document.documentElement.setAttribute('data-draft-held','true')");return
     route.continue_()
    context.route('**/*',intercept)
    def attach(page):
     page.on('pageerror',lambda error:state['errors'].append(str(error)))
     def dialog_handler(dialog):
      state['dialogs'].append(dialog.type)
      if dialog.type=='beforeunload' and state['cancel_leave']:state['cancel_leave']=False;dialog.dismiss()
      else:dialog.accept()
     page.on('dialog',dialog_handler)
     return page
    page=attach(context.new_page());return context,page,state,attach
   def saved(page):page.goto(base+'/#saved');expect(page.get_by_role('heading',name='Saved passages',exact=True)).to_be_visible()
   def note(page):return page.get_by_label('Your personal note',exact=True)
   def journal(page):return page.evaluate('key=>{const raw=window.draftTestSession.getItem(key);return raw===null?null:JSON.parse(raw)}',JOURNAL)
   def journal_raw(page):return page.evaluate('key=>window.draftTestSession.getItem(key)',JOURNAL)
   def entries(page):return (journal(page) or {}).get('entries',[])
   def local(page):return page.evaluate('key=>JSON.parse(localStorage.getItem(key))',KEY)
   def export(page,label='Export bookmarks and notes'):
    with page.expect_download() as download:page.get_by_role('button',name=label,exact=True).click()
    return json.loads(pathlib.Path(download.value.path()).read_text())
   def audit(page,state,label):
    assert not state['forbidden'] and not state['errors'];assert PRIVATE not in page.url and PRIVATE not in page.title();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert local(page)['reading_progress']==[];assert page.evaluate('key=>localStorage.getItem(key)',JOURNAL) is None
    if args.a11y:
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'state':label,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']]})
   def recovery(page):return page.get_by_role('region',name=RECOVERY,exact=True)
   if width==390 and theme=='light' and not args.debug and not args.focus_only and not args.malformed_only:
    fixture_code="import{readFileSync}from'node:fs';import{capacityFixture}from'./scripts/web-reader-draft-fixtures.mjs';const mark=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify(capacityFixture(mark)));"
    fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e',fixture_code],cwd=ROOT,input=json.dumps(mark).encode()))
    context,page,state,attach=environment(mark_override=fixture['mark']);session=context.new_cdp_session(page);session.send('Page.enable')
    def adapter(raw):
     source="(()=>{let raw="+json.dumps(raw)+",key="+json.dumps(JOURNAL)+";const store={getItem(k){return k===key?raw:null},setItem(k,value){if(k!==key)throw Error('Unexpected fixture key');raw=String(value)},removeItem(k){if(k===key)raw=null},get length(){return raw===null?0:1},key(i){return i===0&&raw!==null?key:null}};Object.defineProperty(window,'sessionStorage',{configurable:true,get:()=>store});window.draftTestSession=store})()"
     return session.send('Page.addScriptToEvaluateOnNewDocument',{'source':source})['identifier']
    adapter_id=adapter(fixture['raw']);saved(page)
    initial_metadata=page.evaluate('key=>({sessionRawLength:sessionStorage.getItem(key)?.length,rawCount:JSON.parse(sessionStorage.getItem(key))?.entries.length,editorLength:document.querySelector(".note-field")?.value.length,warning:document.querySelector("#draft-recovery > p.notice")?.textContent})',JOURNAL)
    print(json.dumps({'capacity_initial':initial_metadata,'page_errors':state['errors']}),flush=True)
    assert note(page).input_value()==fixture['entries'][0]['draft'],'Capacity fixture initial recovery did not match its original base'
    assert len(entries(page))==500 and recovery(page).locator(':scope > article.segment').count()<=25
    note(page).evaluate('(node,value)=>{node.value=value;node.dispatchEvent(new Event("input",{bubbles:true}))}',fixture['latest'])
    assert note(page).input_value()==fixture['latest'];expect(recovery(page)).to_contain_text('Session draft recovery could not be confirmed.')
    assert entries(page)[0]['draft']==fixture['entries'][0]['draft'];assert export(page)['saved'][0]['note']==fixture['latest']
    unrelated=fixture['entries'][2]
    card=recovery(page).locator(':scope > article.segment').filter(has=page.get_by_label('Recovered unsaved personal note · '+unrelated['bookmark']['ref'],exact=True))
    card.get_by_role('button',name='Discard recovered draft',exact=True).click();card.get_by_role('button',name='Discard this recovered draft',exact=True).click()
    assert len(entries(page))==499;expect(recovery(page)).to_contain_text('Session draft recovery could not be confirmed.');assert export(page)['saved'][0]['note']==fixture['latest']
    page.get_by_role('button',name='Discard draft',exact=True).click();page.get_by_role('button',name='Discard this recovered draft',exact=True).click()
    expected_entries=[entry for i,entry in enumerate(fixture['entries']) if i not in [0,2]]
    assert entries(page)==expected_entries and local(page)['saved']==[fixture['mark']]
    assert export(page,'Download recovered notes')['entries']==expected_entries
    persisted=journal_raw(page);session.send('Page.removeScriptToEvaluateOnNewDocument',{'identifier':adapter_id});adapter_id=adapter(persisted);page.reload();expect(note(page)).to_have_value(fixture['mark']['note']);assert entries(page)==expected_entries
    assert recovery(page).locator(':scope > article.segment').count()<=25 and state['calls']==[]
    receipts.append({'width':width,'workflow':'explicit synthetic memory-session capacity boundary',**fixture['metadata'],'remaining_entries':len(expected_entries),'different_same_identity_base_retained':fixture['entries'][1] in entries(page),'latest_memory_export_preserved_before_discard':True,'older_original_base_not_restored':True,'journal_sha256_after':sha(persisted)})
    audit(page,state,'capacity rejection warning and exact-base discard cleanup');passed('synthetic memory-session capacity: unrelated discard keeps unjournaled-edit warning; active Discard clears older exact-base recovery without reviving it on reload or deleting other bases')
    session.detach();context.close()
   if args.capacity_only:continue
   if not args.focus_only and not args.malformed_only:
    # Real source link and reload boundary; the external destination is inert test transport.
    context,page,state,attach=environment();saved(page);draft=PRIVATE+' reload';note(page).fill(draft)
    assert entries(page)==[{'bookmark':mark,'draft':draft}] and local(page)['saved']==[mark]
    page.goto(base+'/#about');outbound=page.get_by_role('link',name=re.compile('^Source and licence register'))
    assert outbound.get_attribute('target')=='_blank';assert {'noopener','noreferrer'}<=set(outbound.get_attribute('rel').split());assert any('new tab' in page.locator('#'+identifier).text_content().lower() for identifier in (outbound.get_attribute('aria-describedby') or '').split())
    state['external_url']=outbound.get_attribute('href')
    with context.expect_page() as popup_info:outbound.focus();page.keyboard.press('Enter')
    popup=popup_info.value;popup.wait_for_load_state();assert popup.evaluate('window.opener===null') and popup.evaluate('document.referrer')=='';assert state['outbound'] and state['outbound'][-1]['referrer_absent'];popup.close()
    saved(page);expect(note(page)).to_have_value(draft);assert not state['dialogs'];page.reload();expect(note(page)).to_have_value(draft);assert 'beforeunload' in state['dialogs'];assert local(page)['saved']==[mark]
    page.goto(base+'/?fresh-document=1#saved');expect(note(page)).to_have_value(draft);assert entries(page)==[{'bookmark':mark,'draft':draft}]
    audit(page,state,'safe outbound tab and real document reload recovery');passed('controlled outbound source opens a labelled isolated tab; original memory and session-backed draft survive reload/fresh document without saved-note writes')
    # Empty clears are drafts too. Save and explicit discard remove only their exact journal entries.
    note(page).fill('');assert entries(page)==[{'bookmark':mark,'draft':''}];page.reload();expect(note(page)).to_have_value('');page.get_by_role('button',name='Save note',exact=True).click();assert local(page)['saved'][0]['note']=='' and entries(page)==[]
    note(page).fill(PRIVATE+' discard');page.get_by_role('button',name='Discard draft',exact=True).click();page.get_by_role('button',name='Cancel discard',exact=True).click();expect(note(page)).to_have_value(PRIVATE+' discard');page.get_by_role('button',name='Discard draft',exact=True).click();page.get_by_role('button',name='Discard this recovered draft',exact=True).click();expect(note(page)).to_have_value('');assert entries(page)==[] and local(page)['saved'][0]['note']==''
    audit(page,state,'empty draft and explicit save/discard');passed('empty draft survives reload; explicit Save and Discard clear exact journal entries without resurrecting old text')
    context.close()
    if args.debug:continue
    # Two real tabs share saved records, never their private session draft journals.
    context,a,state,attach=environment();saved(a);draft_a=PRIVATE+' tab A';note(a).fill(draft_a);b=attach(context.new_page());saved(b);expect(note(b)).to_have_value(mark['note']);draft_b=PRIVATE+' tab B';note(b).fill(draft_b)
    assert entries(a)==[{'bookmark':mark,'draft':draft_a}] and entries(b)==[{'bookmark':mark,'draft':draft_b}]
    a.reload();b.reload();expect(note(a)).to_have_value(draft_a);expect(note(b)).to_have_value(draft_b)
    b.get_by_role('button',name='Save note',exact=True).click();assert local(b)['saved'][0]['note']==draft_b and entries(b)==[]
    a.reload();expect(note(a)).to_have_value(draft_b);expect(recovery(a)).to_be_visible();expect(a.get_by_label('Recovered unsaved personal note · '+mark['ref'],exact=True)).to_have_value(draft_a);assert entries(a)==[{'bookmark':mark,'draft':draft_a}];assert local(a)['saved'][0]['note']==draft_b
    recovered=export(a,'Download recovered notes');assert recovered['entries']==[{'bookmark':mark,'draft':draft_a}]
    audit(a,state,'per-tab isolation and changed-base quarantine');passed('two independent tab drafts survive reload; another tab’s Save quarantines the old draft instead of replacing the changed saved note')
    new_local=local(a);new_local['saved']=[];a.evaluate('x=>localStorage.setItem(x.key,JSON.stringify(x.data))',{'key':KEY,'data':new_local});a.reload();expect(recovery(a)).to_be_visible();expect(note(a)).to_have_count(0);assert local(a)['saved']==[];assert export(a,'Download recovered notes')['entries']==[{'bookmark':mark,'draft':draft_a}]
    audit(a,state,'missing-base quarantine');passed('missing saved bookmark leaves the original draft recoverable and exportable without recreating a bookmark');context.close()
    if theme=='dark':continue
   if not args.focus_only and theme=='light':
    for failure in (['malformed'] if args.malformed_only else ['blocked','quota','malformed']):
     context,page,state,attach=environment(failure);saved(page);old_raw=journal_raw(page);value=PRIVATE+' '+failure;note(page).fill(value);page.keyboard.press('End');expect(recovery(page)).to_be_visible();expect(recovery(page)).to_contain_text(re.compile('export|download',re.I))
     assert journal_raw(page)==old_raw and local(page)['saved']==[mark];assert export(page)['saved'][0]['note']==value
     if failure=='malformed':
      with page.expect_download() as download:page.get_by_role('button',name='Download unreadable draft recovery',exact=True).click()
      assert pathlib.Path(download.value.path()).read_text()==old_raw
     state['cancel_leave']=True;old_url=page.url
     try:page.goto(base+'/?unsafe-leave=1#saved')
     except PlaywrightError:pass
     assert state['cancel_leave'] is False and 'beforeunload' in state['dialogs'] and page.url==old_url;expect(note(page)).to_have_value(value)
     if failure=='malformed' and width==390:
      page.get_by_role('button',name='Discard unreadable recovery',exact=True).click();confirmation=page.get_by_role('group',name='Confirm unsaved draft discard',exact=True)
      expect(confirmation).to_contain_text('ENTIRE unreadable recovery record');expect(confirmation).to_contain_text('several old drafts');confirmation.get_by_role('button',name='Cancel discard',exact=True).click()
      assert journal_raw(page)==old_raw;expect(note(page)).to_have_value(value)
      page.get_by_role('button',name='Discard unreadable recovery',exact=True).click();page.get_by_role('button',name='Discard this recovered draft',exact=True).click()
      assert entries(page)==[{'bookmark':mark,'draft':value}] and local(page)['saved']==[mark];expect(note(page)).to_have_value(value)
      page.reload();expect(note(page)).to_have_value(value);assert entries(page)==[{'bookmark':mark,'draft':value}] and local(page)['saved']==[mark]
     page.goto(base+'/#about');saved(page);expect(note(page)).to_have_value(value)
     audit(page,state,failure+' recovery failure preserves raw journal and memory');passed(failure+': visible session-recovery warning, unchanged old raw data, memory/export and unsafe-leave guard');context.close()
   if args.malformed_only:continue
   # Actual held MCP source responses: subsequent user focus owns completion and errors.
   context,page,state,attach=environment();saved(page);note(page).fill(PRIVATE+' focus')
   def hold(mode='success',ignore=False):
    state['mode']=mode;page.evaluate("document.documentElement.removeAttribute('data-draft-held');document.documentElement.removeAttribute('data-draft-body-complete')");page.evaluate('value=>window.draftIgnoreAbort=value',ignore)
   def release():
    route,response,mode=state['held'].pop(0)
    if mode=='error':route.fulfill(status=200,content_type='application/json',body=json.dumps({'jsonrpc':'2.0','id':route.request.post_data_json['id'],'result':{'isError':True,'structuredContent':{'error':'Controlled pending reading failure'}}}))
    else:route.fulfill(response=response)
   def read_ready():expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in mn['segments']])
   for selector,mode in [('#query','success'),('#reference','error'),('#font-size','success')]:
    saved(page);hold(mode);page.goto(base+mn_route);expect(page.locator('html')).to_have_attribute('data-draft-held','true')
    if selector=='#font-size':
     if page.locator('.preferences').get_attribute('open') is None:page.locator('.preferences > summary').click()
     field=page.locator(selector);field.focus();page.keyboard.press('ArrowUp');before_value=field.input_value()
    else:
     field=find_control(page,selector);summary=page.locator('#find-panel > summary')
     if summary.is_visible():summary.focus()
     else:page.get_by_role('navigation',name='Main',exact=True).get_by_role('link',name='Sources',exact=True).focus()
     for _ in range(8):
      page.keyboard.press('Tab')
      if field.evaluate('(node)=>node===document.activeElement'):break
     expect(field).to_be_focused();field.fill('sati' if selector=='#query' else 'MN 1');page.keyboard.press('Home');page.keyboard.press('ArrowRight');page.keyboard.press('ArrowRight');before_value=field.input_value()
    release()
    if mode=='error':expect(page.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible()
    else:read_ready()
    expect(field).to_be_focused();expect(field).to_be_in_viewport();assert field.input_value()==before_value
    if selector!='#font-size':
     assert field.evaluate('(node)=>[node.selectionStart,node.selectionEnd]')==[2,2];page.keyboard.type('X');assert field.input_value()==before_value[:2]+'X'+before_value[2:]
    session=context.new_cdp_session(page);tree=session.send('Accessibility.getFullAXTree')['nodes'];roles=[n.get('role',{}).get('value') for n in tree if any(v.get('name')=='focused' and v.get('value',{}).get('value') for v in n.get('properties',[]))];session.detach();assert ('slider' if selector=='#font-size' else 'textbox') in roles;receipts.append({'width':width,'control':selector,'response':mode,'focused_AX_roles':roles,'source_commit':revision(mn),'source_refs':[s['ref'] for s in mn['segments']]})
    audit(page,state,'owned '+selector+' focus after '+mode)
   passed('ordinary pending reading completion/error preserves subsequent finder/reference/font focus, caret and continued typing; native AX focus agrees')
   saved(page);hold();page.goto(base+mn_route);expect(page.locator('html')).to_have_attribute('data-draft-held','true');release();read_ready();expect(page.locator('#content')).to_be_focused()
   saved(page);hold(ignore=True);page.goto(base+mn_route);expect(page.locator('html')).to_have_attribute('data-draft-held','true');page.get_by_role('button',name='Stop waiting for Pāli reading',exact=True).focus();page.keyboard.press('Enter');expect(page.get_by_role('heading',name='Reading request stopped',exact=True)).to_be_visible();expect(page.locator('#content')).to_be_focused();page.get_by_role('button',name='Try again',exact=True).click();read_ready();release();expect(page.locator('html')).to_have_attribute('data-draft-body-complete','true');read_ready()
   saved(page);hold(ignore=True);page.goto(base+mn_route);expect(page.locator('html')).to_have_attribute('data-draft-held','true');saved(page);note(page).focus();release();expect(page.locator('html')).to_have_attribute('data-draft-body-complete','true');expect(note(page)).to_be_focused();expect(note(page)).to_have_value(PRIVATE+' focus');expect(page.get_by_role('heading',name='Saved passages',exact=True)).to_be_visible();expect(page.locator('section[aria-label="Pāli passage"]')).to_have_count(0)
   page.goto(base+'/#read?uid=dhp183');expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in dhp['segments']])
   if page.locator('.preferences').get_attribute('open') is None:page.locator('.preferences > summary').click()
   page.locator('#script').focus();page.locator('#script').select_option('sinhala');expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in native['segments']]);expect(page.locator('#script')).to_be_focused()
   saved(page);expect(note(page)).to_have_value(PRIVATE+' focus');assert local(page)['saved']==[mark];audit(page,state,'intentional route, Stop/retry, stale route and script rules');passed('intentional reading focus, Stop/retry, stale-navigation refusal and existing script-refresh focus remain intact');context.close()
  browser.close()
 result={'passed':len(checks),'checks':checks,'focus_receipts':receipts,'outside_source_tree':bool(args.server_dir),'debug':args.debug,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual bundled HTTP/MCP and Chromium native AX. External documents are inert intercepted responses; service failures, aborted late bodies, blocked/quota/malformed session storage are controlled fixtures. Session recovery is best effort and per-tab; beforeunload checks do not establish OS-kill, browser-crash or physical-device/human-AT guarantees. Reports omit private note/query values and source wording; no publisher request is sent.'}
 if args.report:pathlib.Path(args.report).write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2));assert result['a11y']['violations']==0
finally:server.terminate();server.wait(timeout=10)
