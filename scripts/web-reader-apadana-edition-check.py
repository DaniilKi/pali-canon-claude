#!/usr/bin/env python3
"""Reviewed publisher-family navigation; actual offline metadata, no English retrieval."""
import argparse,copy,json,os,pathlib,socket,subprocess,tempfile,time,urllib.parse,urllib.request
from playwright.sync_api import expect,sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
KEY='pali-library-v1';PRIVATE='PRIVATE_EDITION_DRAFT_ā😀'
p=argparse.ArgumentParser();p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--package-dir',type=pathlib.Path);p.add_argument('--a11y',action='store_true');p.add_argument('--report',type=pathlib.Path);args=p.parse_args()
assert not(args.server_dir and args.package_dir)
server_dir=(args.server_dir or (args.package_dir/'server' if args.package_dir else ROOT/'server')).resolve()
manifest=json.loads((server_dir/'data/apadana.json').read_text());rows=manifest['links'];vri=manifest['vri_commit']
families=[sorted([r for r in rows.values() if r['path'].startswith('/text/'+chapter+'/')],key=lambda r:r['poem']) for chapter in ['chapter-4','chapter-3']]
assert [len(f) for f in families]==[40,30]
assert [r['id'] for r in families[1]]==['tha-ap13','tha-ap14','tha-ap15','tha-ap16','tha-ap17','tha-ap18','tha-ap19','tha-ap20','tha-ap21','tha-ap22','tha-ap23','tha-ap24','tha-ap25','tha-ap26','tha-ap27','tha-ap28','tha-ap29','tha-ap30','tha-ap31','tha-ap32','tha-ap33','tha-ap34','tha-ap35','tha-ap36','tha-ap37','tha-ap38','tha-ap39','tha-ap40','tha-ap41','tha-ap42']
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';checks=[];scans=[];layouts=[]
def tool(name,arguments):
 req=urllib.request.Request(base+'/mcp',data=json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}}).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
 result=json.load(urllib.request.urlopen(req,timeout=30))['result'];assert not result.get('isError'),'Metadata tool refused';return result['structuredContent']
def revision(row):return vri+('-'+row['index_revision'] if row.get('index_revision') else '')
def route(row):return '#read?'+urllib.parse.urlencode({'uid':row['id'],'offset':0,'page_source':revision(row)})
def ready(page,uid,open_edition=True):
 expect(page.locator('#view .segment')).not_to_have_count(0)
 expect(page.locator('#view .segment').first.locator('.segment-label')).to_contain_text(uid+'/')
 page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
 panel=page.locator('.study-actions')
 if open_edition and panel.get_attribute('open') is None:panel.locator(':scope > summary').click()
 region=page.get_by_role('region',name='Reviewed publisher edition navigation',exact=True,include_hidden=True)
 if open_edition and region.count() and region.locator('details').get_attribute('open') is None:region.get_by_text('Reviewed publisher edition order',exact=True).click()
 return region
server=subprocess.Popen(['node',str(server_dir/'http.cjs')],cwd='/tmp' if args.server_dir or args.package_dir else ROOT,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise AssertionError('Reader readiness timeout')
 origin=tool('get_text',{'uid':'thi-ap31','limit':30});segment=next(s for s in origin['segments'] if s['type']!='heading')
 saved={'uid':'thi-ap31','ref':segment['ref'],'title':origin['title'],'offset':origin['segments'].index(segment),'source_commit':revision(rows['thi-ap31']),'note':'Original synthetic saved note'}
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  for width in [320,390,1280]:
   for theme in (['light','dark'] if args.a11y else ['light']):
    context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y,accept_downloads=True)
    seed=json.dumps({'saved':[saved],'theme':theme,'remember_position':False},ensure_ascii=False)
    context.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(seed)+')')
    page=context.new_page();calls=[];errors=[];forbidden=[];state={'drift':False}
    page.set_default_timeout(15000)
    page.on('pageerror',lambda error:errors.append(type(error).__name__))
    def intercept(request):
     req=request.request
     if not req.url.startswith(base+'/') or PRIVATE in req.url or PRIVATE in (req.post_data or '') or any(PRIVATE in v for v in req.headers.values()):forbidden.append('external/private request');request.abort();return
     if req.method=='POST' and req.url.endswith('/mcp'):
      command=req.post_data_json.get('params',{});calls.append(command)
      if state['drift'] and command.get('name')=='get_text':
       response=request.fetch();body=response.json();body['result']['structuredContent']['english_available'][0]['translation_revision']='0'*40;request.fulfill(response=response,json=body);return
     request.continue_()
    context.route('**/*',intercept)
    def audit(label):
     assert not errors and not forbidden,'Page error or privacy/network failure'
     assert not any(c.get('name')=='get_translation' for c in calls),'Navigation fetched English without explicit choice'
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Horizontal overflow'
     assert json.loads(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')'))['saved']==[saved],'Saved note/source changed'
     if args.a11y:
      page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
      result=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
      scans.append({'width':width,'theme':theme,'state':label,'violations':[item['id'] for item in result['violations']]})
     checks.append({'width':width,'theme':theme,'check':label})
    for family in families:
     first,last=family[0],family[-1];page.goto(base+'/'+route(first));nav=ready(page,first['id'],False)
     assert nav.locator('details').get_attribute('open') is None
     geometry=nav.evaluate('node=>{const text=document.querySelector("#view .segment:not(.heading) .passage"),before=text.getBoundingClientRect().top,prior=node.style.display;node.style.display="none";const baseline=text.getBoundingClientRect().top;node.style.display=prior;return {first_pali:before,without_navigation:baseline,added_pixels:before-baseline};}')
     assert geometry['added_pixels']<=100,'Default edition utility pushed Pāli down by more than one compact control row'
     layouts.append({'width':width,'theme':theme,'family':first['path'].split('/')[2],**geometry})
     audit('Edition order starts collapsed; default Pāli position stays within one compact control row of the prior layout')
     nav=ready(page,first['id'])
     selector=nav.get_by_role('combobox',name='Poem in this reviewed publisher edition',exact=True)
     expect(selector).to_have_value(first['id']);assert selector.locator('option').evaluate_all('nodes=>nodes.map(n=>n.value)')==[r['id'] for r in family]
     assert nav.get_by_role('link',name='← Previous reviewed poem',exact=False).count()==0
     if len(family)>1:
      next_link=nav.get_by_role('link',name='Next reviewed poem',exact=False);assert next_link.get_attribute('href')==route(family[1]);next_link.focus();page.keyboard.press('Enter');ready(page,family[1]['id']);expect(page).to_have_url(base+'/'+route(family[1]))
     # Visit every literal reviewed owner, checking canonical target pins, family separation and real summaries.
     for row in family:
      nav=page.get_by_role('region',name='Reviewed publisher edition navigation',exact=True);nav.get_by_role('combobox',name='Poem in this reviewed publisher edition',exact=True).select_option(row['id']);nav.get_by_role('button',name='Open reviewed poem',exact=True).focus();page.keyboard.press('Enter');nav=ready(page,row['id']);expect(page).to_have_url(base+'/'+route(row))
      group=[r for r in family if (r['poem']-1)//10==(row['poem']-1)//10];summary=nav.get_by_role('link',name='Chapter summary source',exact=False)
      if group[-1].get('chapter_summary'):assert summary.get_attribute('href')==route(group[-1])
      else:assert summary.count()==0
     nav=page.get_by_role('region',name='Reviewed publisher edition navigation',exact=True);assert nav.get_by_role('link',name='Next reviewed poem',exact=False).count()==0
     audit('Every reviewed family owner has exact source-pinned keyboard navigation; true sequence edges and summary owners')
    page.goto(base+'/'+route(rows['thi-ap31']));nav=ready(page,'thi-ap31');editor=page.get_by_label('Your personal note for '+saved['ref'],exact=True);editor.fill(PRIVATE)
    nav.get_by_role('link',name='Next reviewed poem',exact=False).click();nav=ready(page,'thi-ap32');nav.get_by_role('link',name='← Previous reviewed poem',exact=False).click();ready(page,'thi-ap31');expect(page.get_by_label('Your personal note for '+saved['ref'],exact=True)).to_have_value(PRIVATE)
    page.reload();ready(page,'thi-ap31');expect(page.get_by_label('Your personal note for '+saved['ref'],exact=True)).to_have_value(PRIVATE)
    audit('Unsaved local draft survives next/previous and fresh reopening without becoming a saved write')
    nav=page.get_by_role('region',name='Reviewed publisher edition navigation',exact=True);selector=nav.get_by_role('combobox',name='Poem in this reviewed publisher edition',exact=True);selector.evaluate("node=>{const option=document.createElement('option');option.value='mn1';node.append(option);node.value='mn1';}");before=len(calls);nav.get_by_role('button',name='Open reviewed poem',exact=True).click();expect(nav.get_by_role('alert')).to_contain_text('unavailable');assert len(calls)==before
    audit('Foreign selector destination refuses without a request or draft mutation')
    state['drift']=True;page.goto(base+'/'+route(rows['thi-ap32']));ready(page,'thi-ap32');page.get_by_text('The pinned Apadāna source identity or terms changed. No English source was displayed.',exact=True).wait_for();assert page.get_by_role('region',name='Reviewed publisher edition navigation',exact=True).count()==0;assert page.locator('#view .segment').count()>0;state['drift']=False
    audit('Changed publisher revision disables edition actions while retaining the loaded Pāli')
    page.goto(base+'/#read?uid=thi-ap33&offset=0&page_source=old');page.get_by_role('heading',name='No passage was substituted.',exact=True).wait_for();assert page.locator('#view .segment').count()==0
    audit('Stale canonical mapping page refuses before wording')
    page.goto(base+'/#saved');page.get_by_label('Your personal note',exact=True).wait_for();expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE)
    with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
    export=json.loads(pathlib.Path(download.value.path()).read_text());assert export['saved'][0]['note']==PRIVATE
    audit('Draft stays local and joins explicit export; original saved note and source pins remain unchanged')
    context.close()
  browser.close()
 report={'passed':len(checks),'checks':checks,'installed':bool(args.server_dir or args.package_dir),'reviewed_families':[len(f) for f in families],'default_layout':layouts,'a11y':{'scans':len(scans),'violations':sum(len(r['violations']) for r in scans),'results':scans},'limits':'Actual MCP/Pāli metadata and emulated Chromium viewports; source-revision drift is an explicit controlled fixture. No English retrieval, source/rights approval, physical-device or human assistive certification. Reports contain no publisher wording, translator notes or private drafts.'}
 if args.report:args.report.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report));assert report['a11y']['violations']==0
finally:server.terminate();server.wait(timeout=10)
