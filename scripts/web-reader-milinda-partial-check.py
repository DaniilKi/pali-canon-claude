#!/usr/bin/env python3
"""Actual two-stanza Olendzki partial, exact fresh consent and unchanged Pāli root.

Immutable official ATI bytes replace only the test-process provider transport.
No preface, source body or private draft is copied into a report.
"""
import argparse,copy,hashlib,json,os,pathlib,socket,subprocess,tempfile,time,urllib.request
from playwright.sync_api import expect,sync_playwright
from web_reader_test_helpers import read_tool
ROOT=pathlib.Path(__file__).resolve().parents[1];UID='mil6.4.1';KEY='pali-library-v1';PRIVATE='PRIVATE_MILINDA_PARTIAL_ā😀'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source-root',type=pathlib.Path);p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--a11y',action='store_true');p.add_argument('--report');args=p.parse_args()
manifest=json.loads((ROOT/'scripts/canon/reviewed_partial_pages.json').read_text());row=next(r for r in manifest['links'] if r['unit_id']==UID);assert len(manifest['links'])==22
assert row['path']=='/tipitaka/kn/miln/miln.5x.olen' and row['partial_scope']['extractor']=='ati-milinda-medicine-two-verses-v1'
server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server';assert json.loads((server_dir/'data/reviewed-partial-pages.json').read_text())==manifest
VERSION='ati:'+row['path'];URL='https://accesstoinsight.org'+row['path']+'.html';stage=pathlib.Path(tempfile.mkdtemp(prefix='pali-milinda-partial-'));filename=row['path'].split('/')[-1]+'.html';source=args.source_root.resolve()/filename if args.source_root else stage/filename
if not args.source_root:
 official='https://raw.githubusercontent.com/bcbsit/ati/'+manifest['ati_commit']+row['path']+'.html';request=urllib.request.Request(official,headers={'User-Agent':'pali-canon-pinned-source-test'})
 with urllib.request.urlopen(request,timeout=60) as response:
  assert response.url==official,'Pinned official source unexpectedly redirected';source.write_bytes(response.read())
assert hashlib.sha256(source.read_bytes()).hexdigest()==row['source_html_sha256']=='7c117b838aef75fcc9c595b5b903b5769221bae6269492e1ed8d86811cf8c299'
extract="""import{readFileSync}from'node:fs';import{atiPartialExcerpt}from'./src/ati-excerpt.mjs';import{atiNotice,atiContent}from'./src/english.mjs';import{plainText}from'./src/http.mjs';const{row,path}=JSON.parse(readFileSync(0,'utf8')),html=readFileSync(path,'utf8'),content=atiContent(html),preface=content.match(/<div class='preface'>([^]*?)<\\/div>/)[1];console.log(JSON.stringify({text:atiPartialExcerpt(html,row.partial_scope.extractor),notice:atiNotice(html),preface:[...preface.matchAll(/<p>([^]*?)<\\/p>/g)].map(m=>plainText(m[1])),cite:plainText(content.match(/<p class="cite">([^]*?)<\\/p>/)[1])}));"""
expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',extract],cwd=ROOT,input=json.dumps({'row':row,'path':str(source)}).encode()))
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
assert len(expected['text'])==265 and [len(s.splitlines()) for s in expected['text'].split('\n\n')]==[4,5] and len(expected['preface'])==3 and expected['cite']=='— Miln 335'
assert digest(expected['text'])==row['partial_scope']['text_sha256'];assert digest(expected['notice'])==row['partial_scope']['notice_sha256'];assert all(p not in expected['text'] for p in expected['preface']) and expected['cite'] not in expected['text']
ledger=stage/'fetches.jsonl';ledger.write_text('');preload=stage/'provider.cjs';preload.write_text("const fs=require('node:fs'),url="+json.dumps(URL)+",file="+json.dumps(str(source))+";globalThis.fetch=async input=>{const target=typeof input==='string'?input:input.url||String(input);fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify({url:target,allowed:target===url})+'\\n');if(target!==url)throw Error('UNEXPECTED_PROVIDER_FETCH');return new Response(fs.readFileSync(file),{status:200,headers:{'content-type':'text/html'}})};")
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
 whole=tool('get_text',{'uid':UID,'limit':200,'script':'roman'});assert whole['total_segments']==96 and len(whole['segments'])==96
 projected=[{k:s[k] for k in ['ref','type','text']} for s in whole['segments']];assert digest(projected)=='802aeb895d091f986a8c84041ceb491f17f04b9f201b5eda773b0c85198d9a90'
 choice=next(c for c in whole['english_available'] if c['translation_id']==VERSION);scope=choice['translation_scope'];assert scope['kind']=='partial_unit' and scope['version']==1 and scope['whole_unit_coverage'] is False and scope['pali_segments']==2 and (scope['first_ref'],scope['last_ref'])==(UID+'/20',UID+'/21')
 assert scope['read_with']=={'tool':'get_text','uid':UID,'offset':19,'limit':2};bounded=tool('get_text',{k:v for k,v in scope['read_with'].items() if k!='tool'});selected=[{k:s[k] for k in ['ref','type','text']} for s in bounded['segments']];assert selected==projected[19:21] and all(s['type']=='verse' for s in selected) and digest(selected)==row['partial_scope']['pali_sha256']
 native=tool('get_text',{'uid':UID,'limit':30,'script':'sinhala'});bound_native=tool('get_text',{'uid':UID,'offset':19,'limit':2,'script':'sinhala'});assert native['segments'][19:21]==bound_native['segments']
 assert tool('browse_canon',{'node':'english','availability':'whole','collection':'mil','limit':40})['total']==14
 coverage=tool('list_sources',{})['translation_coverage'];assert (coverage['total']['partial_links'],coverage['total']['partial_only'])==(22,16)
 result=tool('get_translation',{'uid':UID,'translation':VERSION,'allow_partial':True,'scope_sha256':scope['scope_sha256'],'limit':500})
 assert result['text']==expected['text'] and result['translation_scope']==scope and result['text_id']==UID and result['translation_id']==VERSION and result['whole_unit_coverage'] is False and result['next_offset'] is None and result.get('continue_with') is None
 assert result['license']==expected['notice']['licensing'] and result['attribution']==expected['notice']['citation'] and result['url']==URL
 assert '335' in json.dumps({'reference':row['source_reference'],'mapping':row['mapping_note']}) and all(p not in result['text'] for p in expected['preface']) and expected['cite'] not in result['text']
 for arguments in [{'uid':UID},{'uid':UID,'translation':VERSION},{'uid':'mil3.1.8','translation':VERSION,'allow_partial':True},{'uid':UID,'translation':VERSION,'allow_partial':True,'scope_sha256':'0'*64},{'uid':UID,'translation':VERSION,'allow_partial':True,'scope_sha256':scope['scope_sha256'],'offset':1},{'uid':UID,'translation':VERSION,'allow_partial':True,'scope_sha256':scope['scope_sha256'],'offset':500,'prefix_sha256':hashlib.sha256(expected['text'].encode()).hexdigest()}]:assert rpc('get_translation',arguments).get('isError')
 checks.append({'check':'actual96-segment root unchanged; exact two-stanza command and265-character 4+5line partial only, full notice, excluded3preface paragraphs/cite, exact consent/pins and finite min500 end','root_segments':96,'selected_segments':2,'characters':265,'pages':1})
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
      if mode=='generic':data['translation_scope']['extractor']='ati-freeverse-v1'
      elif mode=='owner':data['translation_scope']['unit_id']='mil6.4.2'
      elif mode=='whole':data['whole_unit_coverage']=True
      elif mode=='missing_scope':del data['translation_scope']
      elif mode=='notice':data['translation_scope']['notice_sha256']='0'*64
      else:data['translation_scope']['scope_sha256']='0'*64
      route.fulfill(response=response,json=body);return
    route.continue_()
   context.route('**/*',intercept);page.on('pageerror',lambda error:errors.append(str(error)))
   def audit(label):
    assert not errors and not forbidden;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert page.evaluate('key=>localStorage.getItem(key)',KEY)==raw;assert PRIVATE not in page.title()
    if args.a11y:
     page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));data=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");scans.append({'width':width,'theme':theme,'state':label,'violations':[{'id':v['id'],'targets':[n['target'] for n in v['nodes']]} for v in data['violations']]})
   def review():
    before=sum(c['name']=='get_translation' for c in calls);read_tool(page,'English sources').click();page.locator('#study .translation-choice').filter(has_text=row['source_reference']).get_by_role('button',name='Review partial-unit source',exact=True).click();expect(page.locator('#scope-consent')).not_to_be_checked();expect(page.get_by_role('button',name='Read reviewed partial source',exact=True)).to_be_disabled();assert sum(c['name']=='get_translation' for c in calls)==before
    expect(page.locator('#study')).to_contain_text(UID+'/20 to '+UID+'/21');expect(page.locator('#study')).to_contain_text(row['mapping_note']);expect(page.locator('#study')).to_contain_text(row['source_reference'])
   def consent():page.locator('#scope-consent').focus();page.keyboard.press('Space');page.keyboard.press('Tab');expect(page.get_by_role('button',name='Read reviewed partial source',exact=True)).to_be_focused();page.keyboard.press('Enter')
   page.goto(base+'/#saved');page.get_by_label('Your personal note',exact=True).fill(PRIVATE+' unsaved');page.goto(base+'/#read?uid='+UID);expect(page.locator('section[aria-label="Pāli passage"] .passage')).to_have_text([s['text'] for s in native['segments']]);assert all(c['name']!='get_translation' for c in calls);review();audit('fresh exact partial scope, unchanged native Pāli context, no English before consent')
   consent();expect(page.locator('#study .translation')).to_have_text(expected['text']);assert page.locator('#study .translation').text_content()==expected['text'];assert calls[-1]=={'name':'get_translation','arguments':{'uid':UID,'translation':VERSION,'limit':6000,'allow_partial':True,'scope_sha256':scope['scope_sha256']}}
   expect(page.get_by_role('heading',name='Partial English source · '+row['translator'],exact=True)).to_be_visible();expect(page.locator('#study')).to_contain_text('335');assert expected['notice']['licensing'] in page.locator('#study .provenance').text_content() and expected['notice']['citation'] in page.locator('#study .provenance').text_content();assert expected['cite'] not in page.locator('#study .translation').text_content() and all(p not in page.locator('#study .translation').text_content() for p in expected['preface']);assert page.get_by_role('button',name='Next English page →',exact=True).count()==0;audit('exact4+5line poem only with complete notice and finite end')
   page.get_by_role('button',name='Reload passage and review sources',exact=True).click();read_tool(page,'English sources').wait_for();review();expect(page.locator('#scope-consent')).not_to_be_checked()
   for mode in ['generic','owner','whole','missing_scope','notice','consent']:
    drift['mode']=mode;consent();expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study .translation')).to_have_count(0);audit('refuses '+mode+' drift');drift['mode']=None;review()
   page.goto(base+'/#saved');expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+' unsaved')
   with page.expect_download() as download:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
   assert json.loads(pathlib.Path(download.value.path()).read_text())['saved'][0]['note']==PRIVATE+' unsaved';page.reload();expect(page.get_by_label('Your personal note',exact=True)).to_have_value(PRIVATE+' unsaved');audit('private draft/export/reload stay local with unchanged saved base')
   checks.append({'width':width,'theme':theme,'check':'exact fresh keyboard consent; two stanzas only; unchanged original/native Pāli context, publisher335/notice metadata and finite end; scoped guards and private recovery preserved'});print(f'{width}px {theme}: exact Olendzki two-stanza partial passed',flush=True);context.close()
  browser.close()
 events=[json.loads(line) for line in ledger.read_text().splitlines()];assert events and all(e['allowed'] and e['url']==URL for e in events)
 result={'passed':len(checks),'checks':checks,'outside_source_tree':bool(args.server_dir),'pinned_local_source_only':True,'upstream_provider_requests':0,'source_html_sha256':row['source_html_sha256'],'text_sha256':row['partial_scope']['text_sha256'],'notice_sha256':row['partial_scope']['notice_sha256'],'pali_sha256':row['partial_scope']['pali_sha256'],'root_segments':96,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual bundled MCP and Chromium, immutable official ATI bytes in test-only provider transport. Two reviewed stanzas only; preface and publisher cite excluded from poem, full notice/numbering retained separately. No whole96-segment question/wholeMilinda translation, live publisher availability, new rights approval, physical-device or human-AT claim. Reports exclude source wording and private draft values.'}
 if args.report:pathlib.Path(args.report).write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps(result,indent=2));assert result['a11y']['violations']==0
finally:server.terminate();server.wait(timeout=10)
