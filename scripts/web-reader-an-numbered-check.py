#!/usr/bin/env python3
"""Twenty finite AN1.21–40 treatments and their preserved legacy shared choice.

Actual bundled MCP/Chromium use hash-verified official immutable ATI bytes through
process-local provider transport. Viewports emulate devices; no physical-device,
human assistive-technology, source-accuracy or live-availability claim is made.
"""
import argparse,copy,hashlib,json,os,pathlib,socket,subprocess,tempfile,time,urllib.request
from playwright.sync_api import expect,sync_playwright
from web_reader_test_helpers import read_tool
ROOT=pathlib.Path(__file__).resolve().parents[1];KEY='pali-library-v1';PRIVATE='PRIVATE_AN_NUMBERED_DRAFT_ā😀';PROFILE='ati-an1-ekadhamma-numbered-paragraph-v1';BARE='ati:/tipitaka/an/an01/an01.021-040.than';RAW='df8afc7457b8720a55f487f52fb47bff94371e52455cf3596daecc5fbbfa65a4'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source-root',type=pathlib.Path);p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--a11y',action='store_true');p.add_argument('--report');args=p.parse_args()
manifest=json.loads((ROOT/'scripts/canon/reviewed_ati_sections.json').read_text());rows=[r for r in manifest['links'] if r['section']['profile']==PROFILE];assert len(manifest['links'])==45 and len(rows)==20 and [r['unit_id'] for r in rows]==['an1.'+str(n) for n in range(21,41)]
for n,row in enumerate(rows,21):assert row['path']==BARE[4:] and row['anchor']=='sutta-'+str(n) and row['section']['heading']==str(n)+'.' and row['section']['note_count']==0
server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server';assert json.loads((server_dir/'data/reviewed-ati-sections.json').read_text())==manifest
URL='https://accesstoinsight.org'+rows[0]['path']+'.html';stage=pathlib.Path(tempfile.mkdtemp(prefix='pali-an-numbered-browser-'));filename=rows[0]['path'].split('/')[-1]+'.html';source=args.source_root.resolve()/filename if args.source_root else stage/filename
if not args.source_root:
 official='https://raw.githubusercontent.com/bcbsit/ati/'+manifest['ati_commit']+rows[0]['path']+'.html';request=urllib.request.Request(official,headers={'User-Agent':'pali-canon-pinned-source-test'})
 with urllib.request.urlopen(request,timeout=60) as response:
  assert response.url==official,'Pinned official artifact unexpectedly redirected';source.write_bytes(response.read())
assert hashlib.sha256(source.read_bytes()).hexdigest()==RAW and all(r['source_html_sha256']==RAW for r in rows)
extract="""import{readFileSync}from'node:fs';import{extractAtiSection}from'./src/ati-sections.mjs';import{atiNotice,atiContent}from'./src/english.mjs';import{plainText}from'./src/http.mjs';const{rows,path}=JSON.parse(readFileSync(0,'utf8')),html=readFileSync(path,'utf8');console.log(JSON.stringify({selected:rows.map(row=>extractAtiSection(html,row)),notice:atiNotice(html),shared:plainText(atiContent(html))}));"""
expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',extract],cwd=ROOT,input=json.dumps({'rows':rows,'path':str(source)}).encode()))
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
for row,selected in zip(rows,expected['selected']):assert digest(selected['text'])==row['section']['text_sha256'] and selected['translator_notes']==[] and digest([])==row['section']['notes_sha256'] and digest(expected['notice'])==row['section']['notice_sha256']
ledger=stage/'fetches.jsonl';ledger.write_text('');preload=stage/'provider.cjs'
preload.write_text("const fs=require('node:fs'),url="+json.dumps(URL)+",file="+json.dumps(str(source))+";globalThis.fetch=async input=>{const requested=typeof input==='string'?input:input.url||String(input);fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify({url:requested,allowed:requested===url})+'\\n');if(requested!==url)throw Error('UNEXPECTED_PROVIDER_FETCH');return new Response(fs.readFileSync(file),{status:200,headers:{'content-type':'text/html'}})};")
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';server=subprocess.Popen(['node','--require',str(preload),str(server_dir/'http.cjs')],cwd=stage,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0','PALI_CANON_CACHE_MB':'32'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);checks=[];scans=[]
def rpc(name,arguments):
 body={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}};request=urllib.request.Request(base+'/mcp',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'});return json.load(urllib.request.urlopen(request,timeout=90))['result']
def tool(name,arguments):
 result=rpc(name,arguments);assert not result.get('isError'),'Unexpected MCP error for '+name;return result['structuredContent']
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise AssertionError('Actual HTTP bundle did not start')
 natives={};choices={};shared_choices={}
 assert not ledger.read_text()
 for row in rows:
  uid=row['unit_id'];version=BARE+'#'+row['anchor'];native=tool('get_text',{'uid':uid,'limit':30,'script':'sinhala'});natives[uid]=native
  choices[uid]=next(c for c in native['english_available'] if c['translation_id']==version);shared_choices[uid]=next(c for c in native['english_available'] if c['translation_id']==BARE)
  assert choices[uid]['source_section']==row['section'] and 'translation_scope' not in choices[uid]
  scope=shared_choices[uid]['translation_scope'];assert scope['text_ids']==[r['unit_id'] for r in rows] and scope['whole_unit_coverage'] is False and scope['individual_alignment_verified'] is False
 assert not ledger.read_text(),'Pāli metadata must never fetch English'
 # Consent and page-level semantics remain unchanged for every old shared subject.
 for row in rows:
  uid=row['unit_id'];scope=shared_choices[uid]['translation_scope'];assert rpc('get_translation',{'uid':uid,'translation':BARE}).get('isError')
  shared=tool('get_translation',{'uid':uid,'translation':BARE,'allow_shared':True,'scope_sha256':scope['scope_sha256'],'limit':30000})
  assert shared['text_id'] is None and shared['requested_text_id']==uid and shared['translation_scope']==scope and shared['whole_unit_coverage'] is False and shared['citation']==scope['source_reference']
  assert shared['text']==expected['shared'] and digest(shared['text'])==scope['text_sha256'] and 'source_section' not in shared
 checks.append({'check':'all20 pre-existing shared subjects still require consent and return exact pinned compilation with null individual ownership'})
 # Revisit all versions in reverse to exercise cache keys across siblings and bare page.
 for selection_index,row in enumerate(rows+list(reversed(rows))):
  if selection_index==20:warm_fetches=len(ledger.read_text().splitlines())
  uid=row['unit_id'];selected=expected['selected'][rows.index(row)];version=BARE+'#'+row['anchor'];result=tool('get_translation',{'uid':uid,'translation':version,'limit':500})
  assert result['text_id']==uid and result['translation_id']==version and result['source_section']==row['section'] and result['translator_notes']==[] and 'translation_scope' not in result and result['text']==selected['text']
  assert result['next_offset'] is None and result.get('continue_with') is None and result['url']==URL+'#'+row['anchor'] and result['license']==expected['notice']['licensing'] and result['attribution']==expected['notice']['citation']
  assert all(other['text'] not in result['text'] for other in expected['selected'] if other!=selected)
 assert len(ledger.read_text().splitlines())==warm_fetches,'Cached reverse pass unexpectedly fetched another source artifact'
 health=json.load(urllib.request.urlopen(base+'/healthz',timeout=10));assert health['cache']['hits']>=20
 checks.append({'check':'all20 exact selected texts/full notices and reverse-order cached versions stay isolated from siblings and bare compilation','versions':20,'passes':2})
 for arguments in [{'uid':'an1.21','translation':BARE+'#sutta-20'},{'uid':'an1.21','translation':BARE+'#sutta-41'},{'uid':'an1.20','translation':BARE+'#sutta-21'},{'uid':'an1.22','translation':BARE+'#sutta-21'},{'uid':'an1.21','translation':BARE+'%23sutta-21'}]:assert rpc('get_translation',arguments).get('isError')
 saved=tool('get_text',{'uid':'dhp183','limit':1});mark={'uid':'dhp183','ref':saved['segments'][0]['ref'],'offset':0,'source_commit':saved['source'].get('locator_revision',saved['source']['commit']),'title':saved['title'],'note':PRIVATE+' durable'}
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  for width,theme in [(w,t) for w in [390,1280] for t in (['light','dark'] if args.a11y else ['light'])]:
   context=browser.new_context(viewport={'width':width,'height':844 if width==390 else 900},bypass_csp=args.a11y);seed={'theme':theme,'script':'sinhala','remember_position':False,'saved':[mark],'reading_progress':[]};raw=json.dumps(seed,ensure_ascii=False);context.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(raw)+')');page=context.new_page();page.on('dialog',lambda dialog:dialog.accept());calls=[];errors=[];forbidden=[];drift={'mode':None}
   def intercept(route):
    req=route.request
    if not req.url.startswith(base+'/') or PRIVATE in req.url or PRIVATE in (req.post_data or '') or any(PRIVATE in value for value in req.headers.values()):forbidden.append(req.url);route.abort();return
    if req.method=='POST' and req.url.endswith('/mcp'):
     params=req.post_data_json['params'];calls.append(copy.deepcopy(params))
     if params['name'] not in ['get_text','get_translation']:forbidden.append(params);route.abort();return
     if params['name']=='get_translation' and drift['mode']:
      response=route.fetch();body=response.json();data=body['result']['structuredContent'];mode=drift['mode']
      if mode=='missing_section':del data['source_section']
      elif mode=='missing_notes':del data['translator_notes']
      elif mode=='extra_notes':data['translator_notes']=[{'number':1,'text':'Synthetic unexpected note.'}]
      elif mode=='whole_downgrade':data['whole_unit_coverage']=False
      elif mode=='strip_anchor_descriptor':
       data['translation_id']=BARE;data.pop('source_section',None);data.pop('translator_notes',None)
      elif mode=='shared_identity':data['text_id']='an1.21'
      elif mode=='shared_pin':data['translation_scope']['text_sha256']='0'*64
      elif mode=='profile':data['source_section']['profile']='ati-sn27-feelings-v1'
      elif mode=='owner':data['source_section']['unit_id']='an1.20'
      elif mode=='anchor':data['source_section']['anchor']='sutta-20'
      elif mode=='heading':data['source_section']['heading']='A fabricated individual title'
      elif mode=='paragraph_count':data['source_section']['paragraph_count']=2
      elif mode=='count':data['source_section']['note_count']=1
      else:data['source_section']['text_sha256']='0'*64
      route.fulfill(response=response,json=body);return
    route.continue_()
   context.route('**/*',intercept);page.on('pageerror',lambda error:errors.append(str(error)))
   def audit(label):
    assert not errors and not forbidden;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.evaluate('key=>localStorage.getItem(key)',KEY)==raw;assert PRIVATE not in page.title()
    assert not page.evaluate('Object.keys(localStorage).some(k=>localStorage.getItem(k).includes("unpliant"))'),'Source text entered localStorage'
    if args.a11y:
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'state':label,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']]})
   def whole(row):
    read_tool(page,'English sources').click();card=page.locator('#study .translation-choice').filter(has_text=row['source_reference']);expect(card).to_have_count(1);assert page.locator('#scope-consent').count()==0;button=card.get_by_role('button').filter(has_text='Read source ·');button.focus();page.keyboard.press('Enter')
   def shared_review():
    read_tool(page,'English sources').click();page.locator('#study .translation-choice').filter(has_text=shared_choices['an1.21']['reference']).get_by_role('button',name='Review shared compilation page',exact=True).click();expect(page.locator('#scope-consent')).not_to_be_checked();expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_disabled();assert page.locator('#study li').count()==20
   def consent():
    page.locator('#scope-consent').focus();page.keyboard.press('Space');page.keyboard.press('Tab');expect(page.get_by_role('button',name='Read reviewed shared page',exact=True)).to_be_focused();page.keyboard.press('Enter')
   page.goto(base+'/#saved');page.get_by_label('Your personal note',exact=True).fill(PRIVATE+' unsaved')
   for row,selected in zip(rows,expected['selected']):
    before=sum(c['name']=='get_translation' for c in calls);uid=row['unit_id'];page.goto(base+'/#read?uid='+uid);expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in natives[uid]['segments']]);assert sum(c['name']=='get_translation' for c in calls)==before
    whole(row);expect(page.locator('#study .translation')).to_have_text(selected['text']);assert page.locator('#study .translation').text_content()==selected['text'];assert calls[-1]=={'name':'get_translation','arguments':{'uid':uid,'translation':BARE+'#'+row['anchor'],'limit':6000}}
    expect(page.get_by_role('heading',name='English numbered treatment source · '+row['translator'],exact=True)).to_be_visible();expect(page.locator('#study')).to_contain_text('Complete substantive numbered treatment selection.');expect(page.locator('#study')).to_contain_text('not word-by-word alignment');expect(page.locator('#study')).to_contain_text(row['mapping_note']);expect(page.locator('#study')).to_contain_text(row['source_reference'])
    provenance=page.locator('#study .provenance');assert expected['notice']['licensing'] in provenance.text_content() and expected['notice']['citation'] in provenance.text_content();assert URL+'#'+row['anchor'] in provenance.locator('a').evaluate_all('nodes=>nodes.map(node=>node.href)');assert page.get_by_role('region',name='Translator’s notes',exact=True).count()==0;assert page.get_by_role('button',name='Next English page →',exact=True).count()==0;audit('whole '+uid)
   for mode in ['missing_section','missing_notes','extra_notes','profile','owner','anchor','heading','count','paragraph_count','pin','whole_downgrade','strip_anchor_descriptor']:
    drift['mode']=mode;whole(rows[-1]);expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study .translation')).to_have_count(0);audit('refuses '+mode+' before wording');drift['mode']=None
   for uid in ['an1.21','an1.40']:
    page.goto(base+'/#read?uid='+uid);read_tool(page,'English sources').wait_for();before=sum(c['name']=='get_translation' for c in calls);shared_review();assert sum(c['name']=='get_translation' for c in calls)==before;audit('shared fresh consent '+uid);consent();expect(page.locator('#study .translation')).to_have_text(expected['shared']);expect(page.get_by_role('heading',name='Shared English source page · Thanissaro Bhikkhu',exact=True)).to_be_visible();expect(page.locator('#study')).to_contain_text('not a separately aligned full translation');assert calls[-1]['arguments']['allow_shared'] is True and calls[-1]['arguments']['scope_sha256']==shared_choices[uid]['translation_scope']['scope_sha256'];audit('shared page '+uid)
    for mode in ['shared_identity','shared_pin']:
     shared_review();drift['mode']=mode;consent();expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study .translation')).to_have_count(0);drift['mode']=None
    shared_review();assert sum(c['name']=='get_translation' for c in calls)==before+3
   page.goto(base+'/#saved');expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+' unsaved')
   with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
   assert json.loads(pathlib.Path(download.value.path()).read_text())['saved'][0]['note']==PRIVATE+' unsaved';page.reload();expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+' unsaved');audit('local-only draft/export/reload preserves saved base')
   checks.append({'width':width,'theme':theme,'check':'all20 keyboard-selected native-script treatments/exact notices/finite ends, no automatic English, descriptor and whole downgrade guards, legacy shared fresh consent, private local draft/export/reload'})
   print(f'{width}px {theme}: all20 AN numbered sources and legacy/private guards passed',flush=True);context.close()
  browser.close()
 events=[json.loads(line) for line in ledger.read_text().splitlines()];assert events and all(e['allowed'] and e['url']==URL and '#' not in e['url'] for e in events)
 result={'passed':len(checks),'checks':checks,'outside_source_tree':bool(args.server_dir),'pinned_local_source_only':True,'upstream_provider_requests':0,'source_html_sha256':RAW,'whole_sections':20,'legacy_shared_subjects':20,'first_whole_coverage_gain':20,'first_any_english_coverage_gain':0,'source_pins':[{'uid':r['unit_id'],'text_sha256':r['section']['text_sha256'],'notes_sha256':r['section']['notes_sha256'],'notice_sha256':r['section']['notice_sha256']} for r in rows],'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual bundled MCP and Chromium against hash-verified official immutable ATI bytes in process-local provider transport. Widths390/1280 are viewport emulation, not physical-device acceptance. No live publisher availability, new rights clearance, translation-specialist or human assistive-technology certification. Reports exclude source wording and private draft values.'}
 if args.report:pathlib.Path(args.report).write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2));assert result['a11y']['violations']==0
finally:server.terminate();server.wait(timeout=10)
