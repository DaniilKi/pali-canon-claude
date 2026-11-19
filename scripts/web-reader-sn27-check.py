#!/usr/bin/env python3
"""One finite SN27.5 whole-discourse selection through actual MCP and browser.

Official immutable source bytes replace only test-process provider transport.
The test does not establish live publisher availability or physical-device use.
"""
import argparse,copy,hashlib,json,os,pathlib,socket,subprocess,tempfile,time,urllib.request
from playwright.sync_api import expect,sync_playwright
from web_reader_test_helpers import read_tool
ROOT=pathlib.Path(__file__).resolve().parents[1];UID='sn27.5';KEY='pali-library-v1';PRIVATE='PRIVATE_SN27_DRAFT_ā😀'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source-root',type=pathlib.Path);p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--a11y',action='store_true');p.add_argument('--report');args=p.parse_args()
manifest=json.loads((ROOT/'scripts/canon/reviewed_ati_sections.json').read_text());row=next(r for r in manifest['links'] if r['unit_id']==UID);assert len(manifest['links'])==45 and sum(r['section']['profile']=='ati-kelly-milinda-v1' for r in manifest['links'])==14
assert row['path']=='/tipitaka/sn/sn27/sn27.001-010.than' and row['anchor']=='sn27.005' and row['section']['profile']=='ati-sn27-feelings-v1' and row['section']['note_count']==0
VERSION='ati:'+row['path']+'#'+row['anchor'];URL='https://accesstoinsight.org'+row['path']+'.html';server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server';assert json.loads((server_dir/'data/reviewed-ati-sections.json').read_text())==manifest
stage=pathlib.Path(tempfile.mkdtemp(prefix='pali-sn27-browser-'));filename=row['path'].split('/')[-1]+'.html';source=args.source_root.resolve()/filename if args.source_root else stage/filename
if not args.source_root:
 official='https://raw.githubusercontent.com/bcbsit/ati/'+manifest['ati_commit']+row['path']+'.html';request=urllib.request.Request(official,headers={'User-Agent':'pali-canon-pinned-source-test'})
 with urllib.request.urlopen(request,timeout=60) as response:
  assert response.url==official,'Pinned official artifact unexpectedly redirected';source.write_bytes(response.read())
assert hashlib.sha256(source.read_bytes()).hexdigest()==row['source_html_sha256']=='4cda764c8a27a64faf96f6cd2ce0dc08808816ab80d329f3ad264b4516ee1e79'
extract="""import{readFileSync}from'node:fs';import{extractAtiSection}from'./src/ati-sections.mjs';import{atiNotice}from'./src/english.mjs';import{plainText}from'./src/http.mjs';const{row,path}=JSON.parse(readFileSync(0,'utf8')),html=readFileSync(path,'utf8'),chapters=[...html.matchAll(/<div class="chapter">([^]*?)<\\/div>/g)];const siblings=chapters.filter(c=>!c[1].includes('id="'+row.anchor+'"')).map(c=>plainText(c[1].match(/<p>([^]*?)<\\/p>/)[1]));console.log(JSON.stringify({...extractAtiSection(html,row),notice:atiNotice(html),siblings}));"""
expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',extract],cwd=ROOT,input=json.dumps({'row':row,'path':str(source)}).encode()))
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
assert len(expected['text'])==614 and expected['translator_notes']==[] and len(expected['siblings'])==9
assert digest(expected['text'])==row['section']['text_sha256'];assert digest(expected['notice'])==row['section']['notice_sha256'];assert digest([])==row['section']['notes_sha256']
ledger=stage/'fetches.jsonl';ledger.write_text('');preload=stage/'provider.cjs'
preload.write_text("const fs=require('node:fs'),url="+json.dumps(URL)+",file="+json.dumps(str(source))+";globalThis.fetch=async input=>{const requested=typeof input==='string'?input:input.url||String(input);fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify({url:requested,allowed:requested===url})+'\\n');if(requested!==url)throw Error('UNEXPECTED_PROVIDER_FETCH');return new Response(fs.readFileSync(file),{status:200,headers:{'content-type':'text/html'}})};")
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';server=subprocess.Popen(['node','--require',str(preload),str(server_dir/'http.cjs')],cwd=stage,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0','PALI_CANON_CACHE_MB':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);checks=[];scans=[]
def rpc(name,arguments):
 body={'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}};request=urllib.request.Request(base+'/mcp',data=json.dumps(body).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'});return json.load(urllib.request.urlopen(request,timeout=90))['result']
def tool(name,arguments):
 result=rpc(name,arguments);assert not result.get('isError'),'Unexpected MCP error for '+name;return result['structuredContent']
try:
 for _ in range(100):
  try:urllib.request.urlopen(base+'/healthz',timeout=1);break
  except Exception:time.sleep(.1)
 else:raise AssertionError('Actual HTTP bundle did not start')
 roman=tool('get_text',{'uid':UID,'limit':30,'script':'roman'});native=tool('get_text',{'uid':UID,'limit':30,'script':'sinhala'});assert any('…pe…' in s['text'] for s in roman['segments'])
 choice=next(c for c in roman['english_available'] if c['translation_id']==VERSION);assert choice['source_section']==row['section'] and 'translation_scope' not in choice
 request={'uid':UID,'translation':VERSION,'limit':500};pieces=[];pages=0
 while True:
  result=tool('get_translation',request);pages+=1
  assert result['text_id']==UID and result['translation_id']==VERSION and result['source_section']==row['section'] and result['translator_notes']==[] and 'translation_scope' not in result and result.get('whole_unit_coverage') is not False
  assert result['url']==URL+'#'+row['anchor'] and result['license']==expected['notice']['licensing'] and result['attribution']==expected['notice']['citation'];assert result['offset']==len(''.join(pieces));pieces.append(result['text'])
  if result['next_offset'] is None:assert result.get('continue_with') is None;break
  request=result['continue_with']['arguments'];assert request['uid']==UID and request['translation']==VERSION and request['prefix_sha256']==hashlib.sha256(''.join(pieces).encode()).hexdigest() and 'allow_partial' not in request and 'allow_shared' not in request;assert pages<10
 assert ''.join(pieces)==expected['text'] and pages==2 and all(sibling not in ''.join(pieces) for sibling in expected['siblings'])
 checks.append({'check':'actual finite fifth discourse, zero notes, complete CC-BY-NC notice, fragment identity and guarded500-character continuation','pages':pages,'characters':len(''.join(pieces))})
 for arguments in [{'uid':UID,'translation':VERSION.split('#')[0]},{'uid':UID,'translation':VERSION.replace('sn27.005','sn27.004')},{'uid':'sn27.4','translation':VERSION},{'uid':'sn27.6','translation':VERSION},{'uid':UID,'translation':VERSION+'-unknown'}]:assert rpc('get_translation',arguments).get('isError')
 checks.append({'check':'bare page, sibling/unknown anchor and wrong-unit source selection refuse'})
 saved_source=tool('get_text',{'uid':'dhp183','limit':1});mark={'uid':'dhp183','ref':saved_source['segments'][0]['ref'],'offset':0,'source_commit':saved_source['source'].get('locator_revision',saved_source['source']['commit']),'title':saved_source['title'],'note':PRIVATE+' durable'}
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
      if mode=='missing_notes':del data['translator_notes']
      elif mode=='extra_notes':data['translator_notes']=[{'number':1,'text':'Synthetic malformed response note.'}]
      elif mode=='profile':data['source_section']['profile']='ati-kelly-milinda-v1'
      elif mode=='owner':data['source_section']['unit_id']='sn27.4'
      elif mode=='anchor':data['source_section']['anchor']='sn27.004'
      elif mode=='count':data['source_section']['note_count']=1
      else:data['source_section']['text_sha256']='0'*64
      route.fulfill(response=response,json=body);return
    route.continue_()
   context.route('**/*',intercept);page.on('pageerror',lambda error:errors.append(str(error)))
   def audit(label):
    assert not errors and not forbidden;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.evaluate('key=>localStorage.getItem(key)',KEY)==raw;assert PRIVATE not in page.title()
    if args.a11y:
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'state':label,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']]})
   def choose():
    read_tool(page,'English sources').click();card=page.locator('#study .translation-choice').filter(has_text=row['source_reference']);expect(card).to_have_count(1);assert page.locator('#scope-consent').count()==0;button=card.get_by_role('button').filter(has_text='Read source ·');button.focus();page.keyboard.press('Enter')
   page.goto(base+'/#saved');page.get_by_label('Your personal note',exact=True).fill(PRIVATE+' unsaved');page.goto(base+'/#read?uid='+UID);expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in native['segments']]);assert all(c['name']!='get_translation' for c in calls);audit('native original Pāli with ellipsis retained, no implicit English')
   choose();expect(page.locator('#study .translation')).to_have_text(expected['text']);assert page.locator('#study .translation').text_content()==expected['text'];assert calls[-1]=={'name':'get_translation','arguments':{'uid':UID,'translation':VERSION,'limit':6000}}
   expect(page.get_by_role('heading',name='English discourse source · '+row['translator'],exact=True)).to_be_visible();expect(page.locator('#study')).to_contain_text('Complete substantive discourse selection.');expect(page.locator('#study')).to_contain_text(row['mapping_note']);expect(page.locator('#study')).to_contain_text(row['source_reference'])
   provenance=page.locator('#study .provenance');assert expected['notice']['licensing'] in provenance.text_content() and expected['notice']['citation'] in provenance.text_content();assert URL+'#'+row['anchor'] in provenance.locator('a').evaluate_all('nodes=>nodes.map(node=>node.href)');assert page.get_by_role('region',name='Translator’s notes',exact=True).count()==0;assert page.get_by_role('button',name='Next English page →',exact=True).count()==0;audit('exact selected discourse and complete source notice, finite end')
   for mode in ['missing_notes','extra_notes','profile','owner','anchor','count','pin']:
    drift['mode']=mode;choose();expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study .translation')).to_have_count(0);audit('refuses '+mode+' drift before wording');drift['mode']=None
   page.goto(base+'/#saved');expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+' unsaved')
   with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
   assert json.loads(pathlib.Path(download.value.path()).read_text())['saved'][0]['note']==PRIVATE+' unsaved';page.reload();expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+' unsaved');audit('private session draft/export/reload preserves saved base')
   checks.append({'width':width,'theme':theme,'check':'keyboard deliberate whole-discourse retrieval, native original Pāli, fifth-only exact text/full rights/fragment, finite end, descriptor/note guards and private session/export/reload'})
   print(f'{width}px {theme}: exact SN27.5 source and privacy passed',flush=True);context.close()
  browser.close()
 events=[json.loads(line) for line in ledger.read_text().splitlines()];assert events and all(e['allowed'] and e['url']==URL and '#' not in e['url'] for e in events)
 result={'passed':len(checks),'checks':checks,'outside_source_tree':bool(args.server_dir),'pinned_local_source_only':True,'upstream_provider_requests':0,'source_html_sha256':row['source_html_sha256'],'text_sha256':row['section']['text_sha256'],'notes_sha256':row['section']['notes_sha256'],'notice_sha256':row['section']['notice_sha256'],'excluded_siblings':9,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual bundled MCP and Chromium against hash-verified official immutable ATI bytes in test-only provider transport. One complete substantive discourse, not the ten-discourse page; original Pāli abbreviation/title/ordinal disclosures retained. No live publisher availability, new rights clearance, physical-device or human-AT certification. Reports exclude source wording and private draft values.'}
 if args.report:pathlib.Path(args.report).write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2));assert result['a11y']['violations']==0
finally:server.terminate();server.wait(timeout=10)
