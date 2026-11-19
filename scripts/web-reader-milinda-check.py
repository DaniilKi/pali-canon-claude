#!/usr/bin/env python3
"""Fourteen reviewed Kelly question selections through actual bundled MCP and browser.

Only the test-process provider transport uses hash-verified official ATI artifacts.
No publisher bodies or private drafts are written to reports.
"""
import argparse,copy,hashlib,json,os,pathlib,socket,subprocess,tempfile,time,urllib.request
from playwright.sync_api import expect,sync_playwright
from web_reader_test_helpers import read_tool
ROOT=pathlib.Path(__file__).resolve().parents[1];KEY='pali-library-v1';PRIVATE='PRIVATE_MILINDA_DRAFT_සති'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source-root',type=pathlib.Path,help='Optional directory containing the two original publisher HTML filenames');p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--a11y',action='store_true');p.add_argument('--report');args=p.parse_args()
manifest=json.loads((ROOT/'scripts/canon/reviewed_ati_sections.json').read_text());rows=manifest['links'];assert len(rows)==14 and len({r['unit_id'] for r in rows})==14
assert sum(r['section']['note_count'] for r in rows)==4 and sum(r['section']['note_count']>0 for r in rows)==3
assert all(r['license']=='Kelly-free-distribution-2005' for r in rows)
server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server';assert json.loads((server_dir/'data/reviewed-ati-sections.json').read_text())==manifest
assert len(json.loads((server_dir/'data/reviewed-partial-pages.json').read_text())['links'])==21
stage=pathlib.Path(tempfile.mkdtemp(prefix='pali-milinda-browser-'));sources={}
for row in rows:
 url='https://accesstoinsight.org'+row['path']+'.html'
 if url in sources:continue
 filename=row['path'].split('/')[-1]+'.html';path=args.source_root.resolve()/filename if args.source_root else stage/filename
 if not args.source_root:
  official='https://raw.githubusercontent.com/bcbsit/ati/'+manifest['ati_commit']+row['path']+'.html';req=urllib.request.Request(official,headers={'User-Agent':'pali-canon-pinned-source-test'})
  with urllib.request.urlopen(req,timeout=60) as response:
   assert response.url==official,'Pinned official source unexpectedly redirected';path.write_bytes(response.read())
 assert hashlib.sha256(path.read_bytes()).hexdigest()==row['source_html_sha256'];sources[url]=str(path)
extract="""import{readFileSync}from'node:fs';import{extractAtiSection}from'./src/ati-sections.mjs';import{atiNotice}from'./src/english.mjs';const input=JSON.parse(readFileSync(0,'utf8'));console.log(JSON.stringify(Object.fromEntries(input.rows.map(r=>{const html=readFileSync(input.sources['https://accesstoinsight.org'+r.path+'.html'],'utf8');return[r.unit_id,{...extractAtiSection(html,r),notice:atiNotice(html)}]}))));"""
expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',extract],cwd=ROOT,input=json.dumps({'rows':rows,'sources':sources}).encode()))
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
for row in rows:
 e=expected[row['unit_id']];assert digest(e['text'])==row['section']['text_sha256'];assert digest(e['translator_notes'])==row['section']['notes_sha256'];assert digest(e['notice'])==row['section']['notice_sha256']
ledger=stage/'fetches.jsonl';ledger.write_text('');preload=stage/'provider.cjs'
preload.write_text("const fs=require('node:fs'),sources="+json.dumps(sources)+";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify({url,allowed:Object.hasOwn(sources,url)})+'\\n');if(!Object.hasOwn(sources,url))throw Error('UNEXPECTED_PROVIDER_FETCH');return new Response(fs.readFileSync(sources[url]),{status:200,headers:{'content-type':'text/html'}})};")
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';server=subprocess.Popen(['node','--require',str(preload),str(server_dir/'http.cjs')],cwd=stage,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0','PALI_CANON_CACHE_MB':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);checks=[];scans=[]
def rpc(name,arguments):
 body={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}};req=urllib.request.Request(base+'/mcp',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'});return json.load(urllib.request.urlopen(req,timeout=90))['result']
def tool(name,arguments):
 result=rpc(name,arguments);assert not result.get('isError'),'Actual MCP returned an error for '+name;return result['structuredContent']
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise AssertionError('Actual HTTP bundle did not start')
 catalogue=tool('browse_canon',{'node':'english','availability':'whole','collection':'mil','limit':40});assert catalogue['total']==14 and {r['id'] for r in catalogue['items']}=={r['unit_id'] for r in rows}
 coverage=tool('list_sources',{})['translation_coverage'];assert (coverage['total']['partial_links'],coverage['total']['partial_only'],coverage['total']['shared_links'])==(21,15,12)
 mil=next(c for c in coverage['collections'] if c['collection']=='mil');assert (mil['with_english'],mil['links'])==(14,14)
 native={};choices={}
 for index,row in enumerate(rows):
  uid=row['unit_id'];version='ati:'+row['path']+'#'+row['anchor'];e=expected[uid]
  metadata=tool('get_text',{'uid':uid,'limit':30,'script':'sinhala'});native[uid]=metadata['segments'];choices[uid]=metadata['english_available'];choice=next(c for c in choices[uid] if c['translation_id']==version)
  assert choice['source_section']==row['section'] and 'translation_scope' not in choice and len(choices[uid])==1
  request={'uid':uid,'translation':version,'limit':500};pieces=[];pages=0
  while True:
   result=tool('get_translation',request);pages+=1
   assert result['text_id']==uid and result['translation_id']==version and result['source_section']==row['section'] and 'translation_scope' not in result and result.get('whole_unit_coverage') is not False
   assert result['translator_notes']==e['translator_notes'] and result['license']==e['notice']['licensing'] and result['attribution']==e['notice']['citation']
   assert result['url']=='https://accesstoinsight.org'+row['path']+'.html#'+row['anchor']
   assert result['offset']==len(''.join(pieces));pieces.append(result['text'])
   if result['next_offset'] is None:assert result.get('continue_with') is None;break
   request=result['continue_with']['arguments'];assert request['uid']==uid and request['translation']==version and request['prefix_sha256']==hashlib.sha256(''.join(pieces).encode()).hexdigest() and 'allow_partial' not in request and 'allow_shared' not in request;assert pages<100
  body=''.join(pieces);assert body==e['text']
  assert all(other['text'] not in body for other_uid,other in expected.items() if other_uid!=uid)
  assert rpc('get_translation',{'uid':uid,'translation':'ati:'+row['path']}).get('isError')
  other=rows[(index+1)%len(rows)];assert rpc('get_translation',{'uid':uid,'translation':'ati:'+other['path']+'#'+other['anchor']}).get('isError')
  assert rpc('get_translation',{'uid':uid,'translation':version+'-unknown'}).get('isError')
  checks.append({'unit':uid,'check':'actual MCP exact ordinary question, owned notes, full Kelly notice, fragment identity and finite guarded continuation; siblings/bare/unknown selectors refuse','characters':len(body),'notes':len(e['translator_notes']),'pages':pages})
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
  for width,theme in [(w,t) for w in [390,1280] for t in (['light','dark'] if args.a11y else ['light'])]:
   context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y);seed={'theme':theme,'script':'sinhala','remember_position':False,'saved':[{'uid':'dhp183','ref':'dhp183/1','offset':0,'title':'Synthetic private fixture','note':PRIVATE}],'reading_progress':[]};raw=json.dumps(seed,ensure_ascii=False)
   context.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(raw)+')');page=context.new_page();calls=[];forbidden=[];errors=[];drift={'mode':None}
   def intercept(route):
    req=route.request
    if not req.url.startswith(base+'/') or PRIVATE in req.url or PRIVATE in (req.post_data or ''):forbidden.append(req.url);route.abort();return
    if req.method=='POST' and req.url.endswith('/mcp'):
     params=req.post_data_json['params'];calls.append(copy.deepcopy(params))
     if params['name'] not in ['browse_canon','get_text','get_translation']:forbidden.append(params);route.abort();return
     if params['name']=='get_translation' and drift['mode']:
      response=route.fetch();body=response.json();data=body['result']['structuredContent']
      if drift['mode']=='notes':del data['translator_notes']
      elif drift['mode']=='count_missing':data['translator_notes']=[]
      elif drift['mode']=='count_extra':data['translator_notes']=[copy.deepcopy(expected['mil3.5.5']['translator_notes'][0])]
      elif drift['mode']=='declared_count':data['source_section']['note_count']=0
      else:data['source_section']['notes_sha256']='0'*64
      route.fulfill(response=response,json=body);return
    route.continue_()
   context.route('**/*',intercept);page.on('pageerror',lambda error:errors.append(str(error)))
   def audit(label):
    assert not forbidden and not errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.evaluate('key=>localStorage.getItem(key)',KEY)==raw
    if args.a11y:
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));d=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'state':label,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in d['violations']]})
   page.goto(base+'/#saved');page.get_by_label('Your personal note',exact=True).fill(PRIVATE+'_UNSAVED');page.goto(base+'/#browse?node=english&availability=whole&collection=mil');expect(page.locator('.english-catalogue-count')).to_have_text('14 matching indexed records');assert all(c['name']!='get_translation' for c in calls)
   for row in rows:
    uid=row['unit_id'];e=expected[uid];version='ati:'+row['path']+'#'+row['anchor'];before=sum(c['name']=='get_translation' for c in calls)
    page.goto(base+'/#read?uid='+uid);expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in native[uid]])
    read_tool(page,'English sources').click();card=page.locator('#study .translation-choice').filter(has_text=row['source_reference']);expect(card).to_have_count(1);assert sum(c['name']=='get_translation' for c in calls)==before
    assert page.locator('#scope-consent').count()==0
    card.get_by_role('button').filter(has_text='Read source ·').click();expect(page.locator('#study .translation')).to_have_text(e['text']);assert page.locator('#study .translation').text_content()==e['text']
    assert calls[-1]=={'name':'get_translation','arguments':{'uid':uid,'translation':version,'limit':6000}}
    expect(page.get_by_role('heading',name='English question source · John Kelly',exact=True)).to_be_visible();assert row['source_reference'] in page.locator('#study').inner_text() and row['mapping_note'] in page.locator('#study').inner_text()
    assert 'Complete substantive question selection.' in page.locator('#study').inner_text()
    assert e['notice']['licensing'] in page.locator('#study .provenance').text_content() and e['notice']['citation'] in page.locator('#study .provenance').text_content()
    links=page.locator('#study .provenance a').evaluate_all('nodes=>nodes.map(node=>node.href)');assert 'https://accesstoinsight.org'+row['path']+'.html#'+row['anchor'] in links
    notes=page.get_by_role('region',name='Translator’s notes',exact=True)
    if e['translator_notes']:
     expect(notes.get_by_role('heading',name='Translator’s notes · not translated question text',exact=True)).to_be_visible();assert notes.locator('.translator-note').all_text_contents()==[n['text'] for n in e['translator_notes']];assert notes.locator('li').evaluate_all('nodes=>nodes.map(node=>node.value)')==[n['number'] for n in e['translator_notes']]
     assert all(n['text'] not in page.locator('#study .translation').text_content() for n in e['translator_notes'])
    else:expect(notes).to_have_count(0)
    assert page.get_by_role('button',name='Next English page →',exact=True).count()==0
    audit(uid+' exact selected question, separately numbered translator notes and full notice')
    checks.append({'width':width,'theme':theme,'unit':uid,'check':'native Pāli, deliberate ordinary question retrieval, exact body and separate owned notes, fragment URL, numbering/paratext disclosure, full licence and finite end'})
   for mode in ['notes','descriptor','count_missing','count_extra','declared_count']:
    row=next(r for r in rows if r['unit_id']=='mil3.5.6') if mode=='count_missing' else next(r for r in rows if r['section']['note_count']==0) if mode=='count_extra' else next(r for r in rows if r['section']['note_count']==2);page.goto(base+'/#read?uid='+row['unit_id']);read_tool(page,'English sources').click();drift['mode']=mode;page.locator('#study .translation-choice').get_by_role('button').filter(has_text='Read source ·').click();expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study .translation')).to_have_count(0);audit('refuses '+mode+' drift before English body');drift['mode']=None
   page.goto(base+'/#saved');expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+'_UNSAVED')
   with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
   exported=json.loads(pathlib.Path(download.value.path()).read_text());assert exported['saved'][0]['note']==PRIVATE+'_UNSAVED';audit('private draft and export unchanged')
   checks.append({'width':width,'theme':theme,'check':'missing/extra notes or changed finite count/descriptor refuses before body; private draft and export preserved'});print(f'{width}px {theme}: all14 actual question selections, four owned notes and private export passed',flush=True);context.close()
  browser.close()
 events=[json.loads(line) for line in ledger.read_text().splitlines()];assert events and all(e['allowed'] and e['url'] in sources and '#' not in e['url'] for e in events)
 result={'passed':len(checks),'checks':checks,'outside_source_tree':bool(args.server_dir),'pinned_local_sources_only':True,'upstream_provider_requests':0,'sources':[{'unit':r['unit_id'],'source_html_sha256':r['source_html_sha256'],'text_sha256':r['section']['text_sha256'],'notes_sha256':r['section']['notes_sha256'],'notice_sha256':r['section']['notice_sha256']} for r in rows],'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Immutable official ATI repository bytes, test-only provider transport and actual bundled HTTP/MCP worker. Fourteen complete substantive question selections, not a whole Milindapañha or publisher page; untranslated root paratext and publisher numbering remain disclosed. No live publisher availability, additional source-rights approval, human accessibility or physical-device certification. Reports exclude source bodies and private note values.'}
 if args.report:pathlib.Path(args.report).write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2));assert result['a11y']['violations']==0
finally:server.terminate();server.wait(timeout=10)
