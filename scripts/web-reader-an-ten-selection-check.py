#!/usr/bin/env python3
"""Actual bundled reader for ten exact AN paragraph selections and legacy shared pages.

Four SHA-verified official immutable artifacts use process-local test transport;
no source bodies are bundled and no upstream provider request is made. Chromium
viewports and optional axe checks are emulation, not physical-device or human AT
acceptance, translation-specialist review or a new source-rights determination.
"""
import argparse,copy,hashlib,json,os,pathlib,socket,subprocess,sys,tempfile,time,urllib.error,urllib.request
from playwright.sync_api import expect,sync_playwright
from web_reader_test_helpers import read_tool
ROOT=pathlib.Path(__file__).resolve().parents[1];KEY='pali-library-v1';PRIVATE='PRIVATE_AN_TEN_DRAFT_ā😀';PROFILE='ati-an-ten-paragraph-selection-v1'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source-root',type=pathlib.Path);p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--a11y',action='store_true');p.add_argument('--report');args=p.parse_args()
# A rerun must never leave an earlier successful report looking current.
if args.report:pathlib.Path(args.report).write_text(json.dumps({'status':'running','limits':__doc__},indent=2)+'\n')
original_excepthook=sys.excepthook
def failure_report(kind,value,traceback):
 if args.report:pathlib.Path(args.report).write_text(json.dumps({'status':'failed','error_type':kind.__name__,'limits':__doc__},indent=2)+'\n')
 original_excepthook(kind,value,traceback)
sys.excepthook=failure_report
manifest=json.loads((ROOT/'scripts/canon/reviewed_ati_sections.json').read_text());rows=[r for r in manifest['links'] if r['section']['profile']==PROFILE]
assert len(manifest['links'])==45 and len(rows)==10
assert [r['unit_id'] for r in rows]==['an1.45','an1.46','an1.49','an1.50','an1.51','an1.52','an2.32','an2.33','an2.125','an2.126']
version=lambda row:'ati:'+row['path']+'::selection:'+row['unit_id']
server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server';assert json.loads((server_dir/'data/reviewed-ati-sections.json').read_text())==manifest
stage=pathlib.Path(tempfile.mkdtemp(prefix='pali-an-ten-browser-'));sources={}
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,request,fp,code,message,headers,newurl):raise urllib.error.HTTPError(request.full_url,code,'Pinned official artifact redirect refused',headers,fp)
source_opener=urllib.request.build_opener(NoRedirect)
for row in rows:
 path=row['path'];filename=path.split('/')[-1]+'.html';source=args.source_root.resolve()/filename if args.source_root else stage/filename
 if not args.source_root and path not in sources:
  official='https://raw.githubusercontent.com/bcbsit/ati/'+manifest['ati_commit']+path+'.html';request=urllib.request.Request(official,headers={'User-Agent':'pali-canon-pinned-source-test'})
  with source_opener.open(request,timeout=60) as response:
   assert response.url==official,'Pinned official artifact unexpectedly redirected';source.write_bytes(response.read())
 assert source.is_file();assert hashlib.sha256(source.read_bytes()).hexdigest()==row['source_html_sha256'],'Pinned source artifact hash changed';sources[path]=str(source)
assert len(sources)==4
extract="""import{readFileSync}from'node:fs';import{extractAtiSection}from'./src/ati-sections.mjs';import{atiNotice,atiContent}from'./src/english.mjs';import{plainText}from'./src/http.mjs';const{rows,sources}=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify(rows.map(row=>{const raw=readFileSync(sources[row.path],'utf8');return{selected:extractAtiSection(raw,row),notice:atiNotice(raw),shared:plainText(atiContent(raw))}})));"""
expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',extract],cwd=ROOT,input=json.dumps({'rows':rows,'sources':sources}).encode()))
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
for row,item in zip(rows,expected):
 assert digest(item['selected']['text'])==row['section']['text_sha256'] and digest(item['selected']['translator_notes'])==row['section']['notes_sha256'] and digest(item['notice'])==row['section']['notice_sha256']
 assert len(item['selected']['translator_notes'])==(1 if row['unit_id'] in ['an1.49','an2.125'] else 0)
ledger=stage/'fetches.jsonl';ledger.write_text('');preload=stage/'provider.cjs';url_files={'https://accesstoinsight.org'+path+'.html':file for path,file in sources.items()}
preload.write_text("const fs=require('node:fs'),files="+json.dumps(url_files)+";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input),file=files[url];fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify({url,allowed:!!file})+'\\n');if(!file)throw Error('UNEXPECTED_PROVIDER_FETCH');return new Response(fs.readFileSync(file),{status:200,headers:{'content-type':'text/html'}})};")
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';server=subprocess.Popen(['node','--require',str(preload),str(server_dir/'http.cjs')],cwd=stage,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0','PALI_CANON_CACHE_MB':'32'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);checks=[];scans=[]
def rpc(name,arguments):
 request=urllib.request.Request(base+'/mcp',data=json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}}).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'});return json.load(urllib.request.urlopen(request,timeout=90))['result']
def tool(name,arguments):
 result=rpc(name,arguments);assert not result.get('isError'),str(result);return result['structuredContent']
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise AssertionError('Actual HTTP bundle did not start')
 natives={};choices={};shared_choices={}
 for row in rows:
  uid=row['unit_id'];native=tool('get_text',{'uid':uid,'limit':30,'script':'sinhala'});natives[uid]=native;choices[uid]=next(c for c in native['english_available'] if c['translation_id']==version(row));shared_choices[uid]=next(c for c in native['english_available'] if c['translation_id']=='ati:'+row['path']);assert choices[uid]['source_section']==row['section'] and 'translation_scope' not in choices[uid]
 assert not ledger.read_text(),'Pāli metadata fetched English unexpectedly'
 for row,item in zip(rows,expected):
  uid=row['unit_id'];bare='ati:'+row['path'];scope=shared_choices[uid]['translation_scope'];assert rpc('get_translation',{'uid':uid,'translation':bare}).get('isError')
  shared=tool('get_translation',{'uid':uid,'translation':bare,'allow_shared':True,'scope_sha256':scope['scope_sha256'],'limit':30000});assert shared['text_id'] is None and shared['requested_text_id']==uid and shared['translation_scope']==scope and shared['whole_unit_coverage'] is False and shared['citation']==scope['source_reference'] and shared['text']==item['shared'] and 'source_section' not in shared
 checks.append({'check':'all10 legacy shared subjects retain exact pinned page, consent and null individual ownership'})
 page_counts={}
 for pass_index in range(2):
  if pass_index:warm_fetches=len(ledger.read_text().splitlines())
  for row in (rows if pass_index==0 else list(reversed(rows))):
   uid=row['unit_id'];item=expected[rows.index(row)];request={'uid':uid,'translation':version(row),'limit':500};parts=[];count=0
   while request:
    result=tool('get_translation',request);count+=1;assert count<30;parts.append(result['text']);assert result['text_id']==uid and result['translation_id']==version(row) and result['source_section']==row['section'] and result['translator_notes']==item['selected']['translator_notes'] and 'translation_scope' not in result
    assert result['title']==row['english_title'] and result['url']=='https://accesstoinsight.org'+row['path']+'.html'+('#s32' if uid=='an2.33' else '') and result['license']==item['notice']['licensing'] and result['attribution']==item['notice']['citation']
    request=result['continue_with']['arguments'] if result.get('continue_with') else None
    if request:assert request['uid']==uid and request['translation']==version(row) and request['limit']==500 and 'allow_shared' not in request and 'allow_partial' not in request
   assert ''.join(parts)==item['selected']['text'];page_counts[uid]=count
 assert len(ledger.read_text().splitlines())==warm_fetches and max(page_counts.values())>1
 checks.append({'check':'all10 exact selections, parent titles, full notices, owned notes and finite500-character pagination remain isolated in reverse cached pass','page_counts':page_counts})
 for row in rows:
  for identity in ['ati:'+row['path']+'::selection:an9.999',version(row)+'#fake',version(row).replace('::selection:', '%3A%3Aselection%3A')]:assert rpc('get_translation',{'uid':row['unit_id'],'translation':identity}).get('isError')
  assert rpc('get_translation',{'uid':'an9.999','translation':version(row)}).get('isError')
 saved=tool('get_text',{'uid':'dhp183','limit':1});mark={'uid':'dhp183','ref':saved['segments'][0]['ref'],'offset':0,'source_commit':saved['source'].get('locator_revision',saved['source']['commit']),'title':saved['title'],'note':PRIVATE+' durable'}
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  for width,theme in [(w,t) for w in [320,390,1280] for t in (['light','dark'] if args.a11y else ['light'])]:
   context=browser.new_context(viewport={'width':width,'height':844 if width<760 else 900},bypass_csp=args.a11y);raw=json.dumps({'theme':theme,'script':'sinhala','remember_position':False,'saved':[mark],'reading_progress':[]},ensure_ascii=False);context.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(raw)+')');page=context.new_page();page.on('dialog',lambda dialog:dialog.accept());calls=[];errors=[];forbidden=[];drift={'mode':None}
   def intercept(route):
    req=route.request
    if not req.url.startswith(base+'/') or PRIVATE in req.url or PRIVATE in (req.post_data or '') or any(PRIVATE in v for v in req.headers.values()):forbidden.append(req.url);route.abort();return
    if req.method=='POST' and req.url.endswith('/mcp'):
     params=req.post_data_json['params'];calls.append(copy.deepcopy(params))
     if params['name'] not in ['get_text','get_translation']:forbidden.append(params);route.abort();return
     if params['name']=='get_translation' and drift['mode']:
      response=route.fetch();body=response.json();data=body['result']['structuredContent'];mode=drift['mode']
      if mode=='missing_section':del data['source_section']
      elif mode=='missing_notes':del data['translator_notes']
      elif mode=='cloned_note':data['translator_notes']=[{'number':1,'text':'Synthetic cloned sibling editorial note.'}]
      elif mode=='whole_downgrade':data['whole_unit_coverage']=False
      elif mode=='bare_downgrade':data['translation_id']=data['translation_id'].split('::')[0];data.pop('source_section',None);data.pop('translator_notes',None)
      elif mode=='shared_owner':data['text_id']=data['requested_text_id']
      elif mode=='shared_pin':data['translation_scope']['text_sha256']='0'*64
      elif mode=='selection':data['source_section']['selection_id']='an9.999'
      elif mode=='anchor':data['source_section']['anchor']='invented-fragment'
      elif mode=='heading':data['source_section']['heading']='Invented individual heading'
      elif mode=='owner':data['source_section']['unit_id']='an9.999'
      elif mode=='paragraph_count':data['source_section']['paragraph_count']=99
      elif mode=='count':data['source_section']['note_count']=1
      elif mode=='profile':data['source_section']['profile']='ati-an1-ekadhamma-numbered-paragraph-v1'
      else:data['source_section']['text_sha256']='0'*64
      route.fulfill(response=response,json=body);return
    route.continue_()
   context.route('**/*',intercept);page.on('pageerror',lambda error:errors.append(str(error)))
   def audit(label):
    assert not errors and not forbidden;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), {'state':label,'overflow':page.evaluate('Array.from(document.querySelectorAll("body *")).filter(n=>n.getBoundingClientRect().right>innerWidth||n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,cls:n.className,right:n.getBoundingClientRect().right,scrollWidth:n.scrollWidth,clientWidth:n.clientWidth})).slice(-8)')};assert page.evaluate('key=>localStorage.getItem(key)',KEY)==raw
    for item in expected:
     assert not page.evaluate('(word)=>Object.keys(localStorage).some(k=>localStorage.getItem(k).includes(word))',item['selected']['text'][:80]),'Publisher text entered localStorage'
    if args.a11y:
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));scan=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'state':label,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in scan['violations']]})
   def whole(row):
    read_tool(page,'English sources').click();choice=choices[row['unit_id']];name='Read source · '+' · '.join(choice[k] for k in ['translator','source','reference'] if choice.get(k));button=page.get_by_role('button',name=name,exact=True);expect(button).to_have_count(1);assert page.locator('#scope-consent').count()==0;button.focus();page.keyboard.press('Enter')
   def shared_review(row):
    read_tool(page,'English sources').click();page.locator('#study .translation-choice').filter(has_text=shared_choices[row['unit_id']]['reference']).get_by_role('button',name='Review shared compilation page',exact=True).click();expect(page.locator('#scope-consent')).not_to_be_checked();expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_disabled()
   def consent():
    page.locator('#scope-consent').focus();page.keyboard.press('Space');page.keyboard.press('Tab');expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_focused();page.keyboard.press('Enter')
   page.goto(base+'/#saved');page.get_by_label('Your personal note',exact=True).fill(PRIVATE+' unsaved')
   for row,item in zip(rows,expected):
    uid=row['unit_id'];before=sum(c['name']=='get_translation' for c in calls);page.goto(base+'/#read?uid='+uid);expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in natives[uid]['segments']]);assert sum(c['name']=='get_translation' for c in calls)==before;whole(row);expect(page.locator('#study .translation')).to_have_text(item['selected']['text']);assert page.locator('#study .translation').text_content()==item['selected']['text'];assert calls[-1]=={'name':'get_translation','arguments':{'uid':uid,'translation':version(row),'limit':6000}}
    expect(page.get_by_role('heading',name='English paragraph selection source · '+row['translator'],exact=True)).to_be_visible();expect(page.locator('#study .source-version')).to_have_text('Source version: '+version(row));assert page.locator('#study .source-version').text_content()=='Source version: '+version(row);expect(page.locator('#study')).to_contain_text('exact paragraphs on the parent publisher page');expect(page.locator('#study')).to_contain_text('no individual publisher heading');expect(page.locator('#study')).to_contain_text(row['mapping_note'])
    provenance=page.locator('#study .provenance');assert item['notice']['licensing'] in provenance.text_content() and item['notice']['citation'] in provenance.text_content();links=provenance.locator('a').evaluate_all('nodes=>nodes.map(n=>n.href)');assert 'https://accesstoinsight.org'+row['path']+'.html'+('#s32' if uid=='an2.33' else '') in links;assert all('::selection:' not in url for url in links)
    owned=item['selected']['translator_notes'];assert page.get_by_role('region',name='Translator’s notes',exact=True).count()==(1 if owned else 0)
    if owned:expect(page.locator('#study .translator-note')).to_have_text([note['text'] for note in owned]);expect(page.get_by_role('heading',name='Translator’s notes · editorial, not canonical discourse text',exact=True)).to_be_visible()
    assert page.get_by_role('button',name='Next English page →',exact=True).count()==0;audit('whole '+uid)
   for mode in ['missing_section','missing_notes','cloned_note','whole_downgrade','bare_downgrade','selection','anchor','heading','owner','paragraph_count','count','profile','pin']:
    drift['mode']=mode;whole(rows[-1]);expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study .translation')).to_have_count(0);audit('refuses '+mode);drift['mode']=None
   for row in [rows[0],rows[2],rows[6],rows[8]]:
    page.goto(base+'/#read?uid='+row['unit_id']);read_tool(page,'English sources').wait_for();before=sum(c['name']=='get_translation' for c in calls);shared_review(row);assert sum(c['name']=='get_translation' for c in calls)==before;audit('fresh shared consent '+row['unit_id']);consent();expect(page.locator('#study .translation')).to_have_text(expected[rows.index(row)]['shared']);expect(page.get_by_role('heading',name='Shared English source page · Thanissaro Bhikkhu',exact=True)).to_be_visible();audit('legacy shared '+row['unit_id'])
    for mode in ['shared_owner','shared_pin']:
     shared_review(row);drift['mode']=mode;consent();expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study .translation')).to_have_count(0);drift['mode']=None
   page.goto(base+'/#saved');expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+' unsaved')
   with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
   assert json.loads(pathlib.Path(download.value.path()).read_text())['saved'][0]['note']==PRIVATE+' unsaved';page.reload();expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+' unsaved');audit('private draft/export/reload')
   checks.append({'width':width,'theme':theme,'check':'all10 keyboard/native-script selections, exact editorial ownership/full notices, no invented anchors/headings, descriptor/drift guards, four legacy consent pages and private draft/export/reload'})
   print(f'{width}px {theme}: ten AN selections, four legacy pages and private guards passed',flush=True);context.close()
  browser.close()
 events=[json.loads(line) for line in ledger.read_text().splitlines()];assert events and all(e['allowed'] and e['url'] in url_files and '#' not in e['url'] for e in events)
 result={'status':'passed','passed':len(checks),'checks':checks,'outside_source_tree':bool(args.server_dir),'pinned_local_source_only':True,'upstream_provider_requests':0,'source_artifact_downloads':0 if args.source_root else len(sources),'source_artifact_origin':'supplied_local_files' if args.source_root else 'official_immutable_github_raw','whole_selections':10,'first_whole_coverage_gain':10,'first_any_english_coverage_gain':0,'source_pins':[{'uid':r['unit_id'],'source_html_sha256':r['source_html_sha256'],'text_sha256':r['section']['text_sha256'],'notes_sha256':r['section']['notes_sha256'],'notice_sha256':r['section']['notice_sha256']} for r in rows],'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':__doc__}
 assert result['a11y']['violations']==0
 if args.report:pathlib.Path(args.report).write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2))
finally:server.terminate();server.wait(timeout=10)
