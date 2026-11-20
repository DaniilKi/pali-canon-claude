#!/usr/bin/env python3
"""Bounded offline source-note acceptance: native reader and two simulated hosts.

No English retrieval, source-text migration, physical-device or human AT claim.
"""
import argparse,copy,hashlib,json,os,signal,socket,subprocess,sys,tempfile,time,traceback,urllib.request
from datetime import datetime,timezone
from pathlib import Path
from playwright.sync_api import expect,sync_playwright
ROOT=Path(__file__).resolve().parents[1]
APPROVAL_SHA='61121e60049a1a03976d72a6967ebef28dea08bbf9e79349d7a3aa025ec93930'
PRIVATE='SYNTHETIC_SOURCE_NOTE_PRIVATE_DRAFT'
KEY='pali-library-v1'
def compact(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def digest(v):return hashlib.sha256(v if isinstance(v,bytes) else v.encode('utf-8')).hexdigest()
def stable(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'),sort_keys=True)
def now():return datetime.now(timezone.utc).isoformat()
def shown(locator):
    expect(locator).to_be_visible()
    assert locator.evaluate("node=>{const s=getComputedStyle(node);return s.display!=='none'&&s.visibility!=='hidden'&&node.getBoundingClientRect().height>0}")

def mutations(envelope):
    def changed(label,mutate):
        value=copy.deepcopy(envelope);mutate(value);return (label,value)
    return [('missing envelope',None),
        changed('missing record',lambda x:x.update(entries=[])),
        changed('duplicate record',lambda x:x['entries'].append(copy.deepcopy(x['entries'][0]))),
        changed('changed revision',lambda x:x.update(extraction_revision='synthetic-stale')),
        changed('foreign availability anchor',lambda x:x['availability'].update(anchor_ref='tha-ap3/237')),
        changed('foreign navigation source',lambda x:x['availability']['read_with'].update(uid='tha-ap4')),
        changed('foreign record owner',lambda x:x['entries'][0]['physical_location'].update(unit_id='tha-ap4')),
        changed('changed original note',lambda x:x['entries'][0].update(text=x['entries'][0]['text']+' synthetic')),
        changed('forged changed note hash',lambda x:x['entries'][0].update(text='SYNTHETIC_FOREIGN_NOTE',text_sha256=digest('SYNTHETIC_FOREIGN_NOTE'))),
        changed('changed raw source pin',lambda x:x['entries'][0]['origin'].update(xml_sha256='0'*64)),
        changed('foreign physical element',lambda x:x['entries'][0]['origin'].update(physical_element_zero_based=1131)),
        changed('extra envelope field',lambda x:x.update(unexpected=True))]

def native_checks(browser,base,args,record,profile,checks,scans):
    for width in (390,1280):
        for theme in ('light','dark'):
            context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y)
            saved=[{'uid':'tha-ap3','title':'Preserved synthetic bookmark','ref':'tha-ap3/237','offset':236,'source_commit':profile['source_commit'],'note':PRIVATE+' saved'}]
            initial={'theme':theme,'remember_position':False,'saved':saved,'reading_progress':[]}
            context.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(compact(initial))+')')
            page=context.new_page();page.set_default_timeout(15000);errors=[];traffic=[];requests=[];state={'envelope':'original'}
            page.on('pageerror',lambda error:errors.append(type(error).__name__))
            def intercept(route):
                req=route.request
                if not req.url.startswith(base+'/') or PRIVATE in req.url or PRIVATE in (req.post_data or '') or any(PRIVATE in v for v in req.headers.values()):traffic.append('external or private request');route.abort();return
                if req.method=='POST' and req.url.endswith('/mcp'):
                    command=req.post_data_json.get('params',{});requests.append(command.get('name'))
                    assert command.get('name')!='get_translation','Unexpected English retrieval'
                    if command.get('name')=='get_text' and state['envelope']!='original':
                        response=route.fetch();body=response.json();data=body['result']['structuredContent']
                        if state['envelope'] is None:data.pop('source_notes',None)
                        else:data['source_notes']=state['envelope']
                        for item in body['result'].get('content',[]):
                            if item.get('type')=='text':item['text']=compact(data)
                        route.fulfill(response=response,json=body);return
                route.continue_()
            context.route('**/*',intercept)
            def audit(label):
                assert not errors and not traffic and page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                assert record['text'] not in ''.join(page.locator('.passage').all_text_contents())
                assert json.loads(page.evaluate('(key)=>localStorage.getItem(key)',KEY))['saved']==saved
                if args.a11y:
                    page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
                    result=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                    scans.append({'surface':'native','width':width,'theme':theme,'state':label,'violations':[v['id'] for v in result['violations']]})
            def open_route(query,ref):
                destination=base+'/#read?'+query
                if page.url==destination:page.reload()
                else:page.goto(destination)
                expect(page.locator('.segment-label a').first).to_have_text(ref)
            for kind in ('uid','book'):
                anchor=profile['anchors'][kind];selector=anchor['selector'];name,value=next(iter(selector.items()));opening=name+'='+value
                state['envelope']='original';open_route(opening,('tha-ap3/1' if kind=='uid' else 'vri-book:s0510m1/1'))
                expect(page.get_by_role('link',name='Open original edition note location',exact=True)).to_have_count(1)
                expect(page.locator('.edition-note-text')).to_have_count(0);audit(kind+' opening')
                jump=page.get_by_role('link',name='Open original edition note location',exact=True);jump.focus();page.keyboard.press('Enter')
                expect(page.locator('.segment-label a').first).to_have_text(anchor['segment']['ref'])
                expect(page.locator('.edition-note-text')).to_have_count(1)
                shown(page.locator('.edition-note-text'));shown(page.locator('.edition-note-provenance'))
                assert page.locator('.edition-note-text').text_content()==record['text']
                assert page.locator('.edition-note-text').get_attribute('lang')=='pi-Latn'
                assert page.locator('.original-edition-note').text_content().count(record['text'])==1
                assert page.locator('.original-edition-note').locator('.segment,.passage,textarea').count()==0
                page.evaluate("window.dispatchEvent(new Event('beforeprint'))")
                assert record['text'] not in page.locator('#print-document').text_content()
                assert page.locator('#print-document .print-passage').count()>0
                audit(kind+' anchor positive')
                anchor_route=name+'='+value+'&offset='+str(anchor['offset'])+'&ref='+anchor['segment']['ref']+'&source='+profile['source_commit']
                original_passages=page.locator('.passage').all_text_contents()
                for label,envelope in mutations(profile['_actual_envelopes'][kind]):
                    state['envelope']=envelope;open_route(anchor_route,anchor['segment']['ref'])
                    expect(page.locator('.edition-note-text')).to_have_count(0)
                    expect(page.locator('.source-notes-status')).to_contain_text('could not be verified')
                    shown(page.locator('.source-notes-status > p').first)
                    assert page.locator('.passage').all_text_contents()==original_passages
                    audit(kind+' refused '+label)
                state['envelope']='original';open_route(anchor_route,anchor['segment']['ref']);expect(page.locator('.edition-note-text')).to_have_text(record['text'])
                after_ref=anchor['segment']['ref'].rsplit('/',1)[0]+'/'+str(anchor['offset']+2)
                open_route(name+'='+value+'&offset='+str(anchor['offset']+1)+'&page_source='+profile['source_commit'],after_ref)
                expect(page.locator('.edition-note-text')).to_have_count(0);audit(kind+' following page')
            # Preserve the existing exact bookmark and its local draft across the new apparatus paths.
            page.goto(base+'/#saved');expect(page.get_by_label('Your personal note',exact=True).first).to_be_visible()
            page.get_by_label('Your personal note',exact=True).first.fill(PRIVATE+' unsaved')
            page.goto(base+'/#read?uid=tha-ap3&offset=235&ref=tha-ap3/236&source='+profile['source_commit'])
            expect(page.locator('.edition-note-text')).to_have_text(record['text'])
            page.goto(base+'/#saved');page.reload();expect(page.get_by_label('Your personal note',exact=True).first).to_have_value(PRIVATE+' unsaved')
            assert record['text'] not in page.locator('textarea').first.input_value()
            checks.append({'surface':'native','width':width,'theme':theme,'check':'UID/book actual openings and exact anchors; twelve cached-note refusals each with Pali retained; following-page exclusion; print/private draft recovery','mutations':24})
            context.close()


def widget_checks(browser,html,args,widgets,unrelated,record,checks,scans):
    for width in (390,1280):
        for theme in ('light','dark'):
            for bridge in ('MCP Apps','Apps SDK'):
                page=browser.new_page(viewport={'width':width,'height':900});errors=[];traffic=[]
                page.on('pageerror',lambda error:errors.append(type(error).__name__))
                page.route('**/*',lambda route:(traffic.append('unexpected widget request'),route.abort()))
                if bridge=='MCP Apps':
                    page.set_content('<style>body{margin:0}iframe{border:0;width:100%;height:850px}</style>')
                    page.evaluate("""p=>{window.bridgeMessages=[];let frame=document.createElement('iframe');frame.id='reader';window.addEventListener('message',e=>{window.bridgeMessages.push(e.data);if(e.data.method==='ui/initialize')frame.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{hostContext:{theme:p.theme},hostCapabilities:{serverTools:{},updateModelContext:{structuredContent:{}}}}},'*');if(e.data.method==='ui/update-model-context')frame.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{}},'*')});frame.srcdoc=p.html;document.body.append(frame)}""",{'html':html,'theme':theme})
                    page.wait_for_function("window.bridgeMessages.some(x=>x.method==='ui/notifications/initialized')");frame=page.frames[1]
                else:
                    page.evaluate("theme=>{window.hostSnapshots=[];window.openai={theme,setWidgetState(value){window.hostSnapshots.push(value)},callTool(){throw Error('Unexpected tool request')}}}",theme);page.set_content(html);frame=page.main_frame
                # Subsequent events deliberately reuse the SAME object in the widget realm.
                frame.evaluate("""()=>{window.noteTestSend=function(){if(window.openai){window.openai.toolOutput=window.noteTestData;window.dispatchEvent(new Event('openai:set_globals'))}else window.dispatchEvent(new MessageEvent('message',{source:window.parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:window.noteTestData}}}))};let input=document.createElement('input');input.id='unrelated-task';input.setAttribute('aria-label','Unrelated task');document.body.append(input)}""")
                def audit(label):
                    assert not errors and not traffic
                    assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    assert record['text'] not in ''.join(frame.locator('#pali > .seg').all_text_contents())
                    if bridge=='MCP Apps':assert record['text'] not in page.evaluate('JSON.stringify(window.bridgeMessages)')
                    else:assert record['text'] not in page.evaluate('JSON.stringify(window.hostSnapshots)')
                    if args.a11y:
                        frame.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'))
                        result=frame.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                        scans.append({'surface':bridge,'width':width,'theme':theme,'state':label,'violations':[v['id'] for v in result['violations']]})
                for kind,data in widgets.items():
                    frame.evaluate("d=>{window.noteTestData=d;window.noteOriginalEnvelope=JSON.parse(JSON.stringify(d.source_notes));window.noteTestSend()}",data)
                    expect(frame.locator('.edition-note-text')).to_have_text(record['text'])
                    shown(frame.locator('.edition-note-text'));shown(frame.locator('.edition-note-provenance'))
                    frame.evaluate("()=>{window.noteRootNodes=[...document.querySelectorAll('#pali > .seg')];document.getElementById('unrelated-task').focus()}")
                    audit(kind+' actual positive')
                    for label,envelope in mutations(data['source_notes']):
                        frame.evaluate("p=>{if(p.envelope===null)delete window.noteTestData.source_notes;else window.noteTestData.source_notes=p.envelope;window.noteTestSend()}",{'envelope':envelope})
                        expect(frame.locator('.edition-note-text')).to_have_count(0)
                        expect(frame.locator('.source-notes-status')).to_contain_text('could not be verified')
                        shown(frame.locator('.source-notes-status > p').first)
                        assert frame.evaluate("document.activeElement.id==='unrelated-task' && window.noteRootNodes.every((n,i)=>document.querySelectorAll('#pali > .seg')[i]===n)")
                        audit(kind+' reused object refused '+label)
                        frame.evaluate("()=>{window.noteTestData.source_notes=JSON.parse(JSON.stringify(window.noteOriginalEnvelope));window.noteTestSend()}")
                        expect(frame.locator('.edition-note-text')).to_have_text(record['text'])
                        assert frame.evaluate("document.activeElement.id==='unrelated-task' && window.noteRootNodes.every((n,i)=>document.querySelectorAll('#pali > .seg')[i]===n)")
                    frame.evaluate("()=>window.noteOriginalSegments=JSON.parse(JSON.stringify(window.noteTestData.pali.segments))")
                    for anchor_failure in ('missing','changed','duplicate'):
                        frame.evaluate("""kind=>{let items=JSON.parse(JSON.stringify(window.noteOriginalSegments));if(kind==='missing')items=[];else if(kind==='changed')items[0].vri_paragraph='373';else items.push(JSON.parse(JSON.stringify(items[0])));window.noteTestData.pali.segments=items;window.noteTestSend()}""",anchor_failure)
                        expect(frame.locator('.edition-note-text')).to_have_count(0)
                        assert frame.evaluate("document.activeElement.id==='unrelated-task' && window.noteRootNodes.every((n,i)=>document.querySelectorAll('#pali > .seg')[i]===n)")
                        audit(kind+' reused object '+anchor_failure+' anchor refused')
                        frame.evaluate("()=>{window.noteTestData.pali.segments=JSON.parse(JSON.stringify(window.noteOriginalSegments));window.noteTestSend()}")
                        expect(frame.locator('.edition-note-text')).to_have_text(record['text'])
                    audit(kind+' reused object valid restored')
                # An unrelated no-envelope reading stays unrelated when a host
                # reuses its object and changes only source/selector metadata.
                frame.evaluate("d=>{window.noteTestData=d;window.noteTestSend()}",unrelated)
                expect(frame.locator('.original-edition-note,.source-notes-status')).to_have_count(0)
                frame.evaluate("()=>{window.noteUnrelatedRoot=[...document.querySelectorAll('#pali > .seg')];document.getElementById('unrelated-task').focus()}")
                if bridge=='MCP Apps':
                    page.wait_for_function("window.bridgeMessages.some(m=>m.method==='ui/update-model-context'&&m.params?.structuredContent?.pali_reader?.text_id==='mn1')")
                    before_model=page.evaluate("JSON.stringify(window.bridgeMessages.filter(m=>m.method==='ui/update-model-context').map(m=>m.params))")
                else:
                    page.wait_for_function("window.hostSnapshots.some(m=>JSON.parse(m.modelContent).pali_reader.text_id==='mn1')")
                    before_model=page.evaluate('JSON.stringify(window.hostSnapshots)')
                frame.evaluate("()=>{window.noteTestData.text_id='mn2';window.noteTestData.source={...window.noteTestData.source,commit:'0'.repeat(40)};window.noteTestSend()}")
                expect(frame.locator('.original-edition-note,.source-notes-status')).to_have_count(0)
                assert frame.evaluate("document.activeElement.id==='unrelated-task' && window.noteUnrelatedRoot.every((n,i)=>document.querySelectorAll('#pali > .seg')[i]===n)")
                after_model=page.evaluate("JSON.stringify(window.bridgeMessages.filter(m=>m.method==='ui/update-model-context').map(m=>m.params))") if bridge=='MCP Apps' else page.evaluate('JSON.stringify(window.hostSnapshots)')
                assert before_model==after_model,'Unrelated note-only event changed host reading context'
                audit('unrelated no-envelope reused-object selector/source change stays absent')
                checks.append({'surface':bridge,'width':width,'theme':theme,'check':'actual UID/book positives before same-object valid/missing/corrupt/valid events; root DOM and unrelated focus preserved; no model-context note text/network','mutations':30})
                page.close()


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--approval',type=Path,default=ROOT/'docs/evidence/source-notes/SARIPUTTA_SOURCE_SCHEMA_APPROVAL.json')
    p.add_argument('--server-dir',type=Path);p.add_argument('--package-archive',type=Path)
    p.add_argument('--report',type=Path,required=True);p.add_argument('--launch-receipt',type=Path)
    p.add_argument('--timeout-seconds',type=int,default=900)
    modes=p.add_mutually_exclusive_group();modes.add_argument('--mcp-only',action='store_true');modes.add_argument('--a11y',action='store_true')
    args=p.parse_args();assert 1<=args.timeout_seconds<=1200
    def deadline(_sig,_frame):raise TimeoutError('Bounded source-note acceptance deadline')
    signal.signal(signal.SIGALRM,deadline);signal.alarm(args.timeout_seconds)
    assert digest(args.approval.read_bytes())==APPROVAL_SHA
    approval=json.loads(args.approval.read_text());record=approval['approved_record_object'];profile=approval['approved_profile_object']
    assert digest(stable(record))==profile['record_sha256']==approval['approved_record_sha256']
    assert digest(record['text'])==profile['text_sha256']
    server_dir=(args.server_dir or ROOT/'server').resolve()
    if args.server_dir:
        assert not server_dir.is_relative_to(ROOT) and server_dir.name=='server' and server_dir.parent.name=='pali-canon-mcp' and server_dir.parent.parent.name=='node_modules'
        assert args.package_archive and args.package_archive.is_file()
        assert json.loads((server_dir.parent/'package.json').read_text())['name']=='pali-canon-mcp'
    runtime={str(f.relative_to(server_dir)):digest(f.read_bytes()) for f in sorted(server_dir.rglob('*')) if f.is_file()}
    assert 'data/source-notes.json' in runtime and runtime['data/source-notes.json']==profile['registry_sha256']
    helper_names=('web/source-notes-policy.mjs','web/content-sha256.mjs','src/source-notes-profiles.mjs','web/reader.js','web/reader.css')
    helpers={name:digest((ROOT/name).read_bytes()) for name in helper_names};harness=digest(Path(__file__).read_bytes())
    mode=('installed-' if args.server_dir else '')+('mcp-only' if args.mcp_only else 'a11y' if args.a11y else 'normal')
    workroot=Path('/tmp/pali-sariputta-browser');workroot.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=mode+'-',dir=workroot) as temporary:
        stage=Path(temporary);ledger=stage/'network.jsonl';preload=stage/'offline.cjs'
        preload.write_text("const fs=require('node:fs');globalThis.fetch=async()=>{fs.appendFileSync("+json.dumps(str(ledger))+",'unexpected upstream\\n');throw Error('Offline source-note test refuses upstream');};")
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        base='http://127.0.0.1:'+str(port);argv=['node','--require',str(preload),str(server_dir/'http.cjs')]
        launchpath=args.launch_receipt or args.report.with_suffix('.launch.json')
        launch={'status':'launching','started_utc':now(),'mode':mode,'harness_pid':os.getpid(),'harness_argv':[sys.executable,*sys.argv],'harness_cwd':str(Path.cwd()),'server_argv':argv,'server_cwd':str(stage),'server_directory':str(server_dir),'runtime_origin':'isolated-npm-install' if args.server_dir else 'repository-compiled','server_file_sha256':runtime,'harness_sha256':harness,'helper_sha256':helpers,'approval_sha256':APPROVAL_SHA,'record_sha256':profile['record_sha256'],'registry_sha256':profile['registry_sha256'],'package_archive':str(args.package_archive.resolve()) if args.package_archive else None,'package_sha256':digest(args.package_archive.read_bytes()) if args.package_archive else None}
        def write_launch():launchpath.parent.mkdir(parents=True,exist_ok=True);launchpath.write_text(json.dumps(launch,indent=2)+'\n')
        assert not launchpath.exists(),'Preserve previous receipt; choose a fresh label';write_launch()
        def protocol(method,params):
            request=urllib.request.Request(base+'/mcp',data=compact({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
            with urllib.request.urlopen(request,timeout=90) as response:return json.load(response)['result']
        def tool(name,arguments):
            result=protocol('tools/call',{'name':name,'arguments':arguments});assert not result.get('isError'),'Unexpected public tool refusal';return result['structuredContent']
        accepted=False;checks=[];scans=[]
        server=subprocess.Popen(argv,cwd=stage,start_new_session=True,env={**os.environ,'HOST':'127.0.0.1','PORT':str(port),'RATE_LIMIT_PER_MINUTE':'0','CHATGPT_WIDGET':'1'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            launch.update(status='running',server_pid=server.pid,server_process_group=server.pid,server_group_confirmed=os.getpgid(server.pid)==server.pid);write_launch();assert launch['server_group_confirmed']
            for _ in range(100):
                try:urllib.request.urlopen(base+'/healthz',timeout=1).close();break
                except OSError:time.sleep(.1)
            else:raise AssertionError('Offline HTTP server did not start')
            widgets={};profile['_actual_envelopes']={}
            for kind,anchor in profile['anchors'].items():
                for offset,limit in ((0,30),(anchor['offset'],1),(anchor['offset']-1,1),(anchor['offset']+1,1),(anchor['offset']-2,5)):
                    data=tool('get_text',{**anchor['selector'],'offset':offset,'limit':limit})
                    envelope=data['source_notes'];present=any(s['ref']==anchor['segment']['ref'] for s in data['segments'])
                    assert envelope['state']=='available' and envelope['record_sha256']==profile['record_sha256'] and envelope['availability']==anchor['availability']
                    assert envelope['entries']==([record] if present else [])
                    assert record['text'] not in '\n'.join(s['text'] for s in data['segments'])
                    if offset==anchor['offset']:profile['_actual_envelopes'][kind]=envelope
                for script in ('roman','sinhala','thai','myanmar','devanagari','khmer','lao','lanna'):
                    data=tool('get_text',{**anchor['selector'],'offset':anchor['offset'],'limit':1,'script':script})
                    assert data['source_notes']['entries']==[record] and data['segments']==[anchor['segment']]
                for variants in ('none','raw','structured'):
                    data=tool('get_text',{**anchor['selector'],'offset':anchor['offset'],'limit':1,'variants':variants});assert data['source_notes']['entries']==[record]
                widget=tool('read_passage_widget',{**anchor['selector'],'segment':anchor['segment']['ref'],'english':False,'source_commit':profile['source_commit']})
                assert widget['source_notes']['entries']==[record] and widget['pali']['segments']==[anchor['segment']]
                surrounding=tool('read_passage_widget',widget['pali']['context_with']['arguments']);assert surrounding['source_notes']['entries']==[record]
                returned=tool('read_passage_widget',surrounding['pali']['exact_with']['arguments']);assert returned['pali']['segments']==widget['pali']['segments'] and returned['source_notes']==widget['source_notes']
                widgets[kind]=widget
                checks.append({'surface':'API','selection':kind,'check':'opening/exact/before/after/context,all8scripts,3variants and exact-context-return authentic note/root separation'})
            unrelated=tool('read_passage_widget',{'uid':'mn1','english':False,'limit':1})
            assert 'source_notes' not in unrelated
            assert not ledger.exists(),'Unexpected upstream request'
            if not args.mcp_only:
                resources=protocol('resources/list',{})['resources'];uri=next(x['uri'] for x in resources if x['uri'].startswith('ui://pali-canon/reader-') and x['uri'].endswith('.html') and 'skybridge' not in x['uri']);html=protocol('resources/read',{'uri':uri})['contents'][0]['text']
                with sync_playwright() as pw:
                    browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
                    native_checks(browser,base,args,record,profile,checks,scans)
                    widget_checks(browser,html,args,widgets,unrelated,record,checks,scans)
                    browser.close()
            assert not ledger.exists()
            assert all(not scan['violations'] for scan in scans)
            if args.a11y:
                for surface in ('native','MCP Apps','Apps SDK'):
                    label='uid anchor positive' if surface=='native' else 'uid actual positive'
                    for width in (390,1280):
                        for theme in ('light','dark'):
                            assert any(s['surface']==surface and s['width']==width and s['theme']==theme and s['state']==label for s in scans)
            assert runtime=={str(f.relative_to(server_dir)):digest(f.read_bytes()) for f in sorted(server_dir.rglob('*')) if f.is_file()}
            assert helpers=={name:digest((ROOT/name).read_bytes()) for name in helpers} and harness==digest(Path(__file__).read_bytes())
            report={'mode':mode,'passed':len(checks),'checks':checks,'browser_run':not args.mcp_only,'full_batch_acceptance':not args.mcp_only,'runtime_origin':launch['runtime_origin'],'server_directory':str(server_dir),'server_file_sha256':runtime,'harness_sha256':harness,'helper_sha256':helpers,'approval_sha256':APPROVAL_SHA,'record_sha256':profile['record_sha256'],'package_sha256':launch['package_sha256'],'upstream_provider_requests':0,'a11y':{'performed':args.a11y,'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'One original VRI apparatus note, never root scripture/English coverage. Actual offline HTTP, Chromium390/1280 and two simulated bridges; no physical devices,human AT,signed-in hosts,live upstream or release claim. Arbitrary body-page authenticity is outside this finite apparatus contract. No source-note wording or private drafts included in receipts.'}
            args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));accepted=True
        finally:
            signal.alarm(0);group=server.pid;cleanup={'process_group':group,'leader_pid':server.pid,'term_sent':False,'kill_sent':False,'leftover_group':None}
            def exists():
                try:os.killpg(group,0);return True
                except ProcessLookupError:return False
            def send(sig):
                try:os.killpg(group,sig);return True
                except ProcessLookupError:return False
            try:
                if exists():cleanup['term_sent']=send(signal.SIGTERM)
                try:server.wait(timeout=10)
                except subprocess.TimeoutExpired:pass
                end=time.monotonic()+2
                while exists() and time.monotonic()<end:time.sleep(.05)
                if exists():cleanup['kill_sent']=send(signal.SIGKILL)
                server.wait(timeout=10);end=time.monotonic()+2
                while exists() and time.monotonic()<end:time.sleep(.05)
                cleanup['leftover_group']=exists();cleanup['status']='failed' if cleanup['leftover_group'] else 'reaped-owned-group'
            except Exception as error:cleanup.update(status='failed',error_category=type(error).__name__)
            clean=cleanup['status']=='reaped-owned-group';launch.update(status='passed' if accepted and clean else 'failed',completed_utc=now(),harness_exit_code=0 if accepted and clean else 1,server_returncode=server.returncode,server_group_cleanup=cleanup)
            if accepted:launch['report_sha256']=digest(args.report.read_bytes())
            write_launch();assert clean,'Owned server group cleanup failed'

if __name__=='__main__':
    try:main()
    except Exception as error:
        frames=[f for f in traceback.extract_tb(error.__traceback__) if f.filename==__file__]
        print(json.dumps({'passed':False,'error_type':type(error).__name__,'failure_at':{'file':Path(__file__).name,'line':frames[-1].lineno if frames else None},'limits':'No source-note/private wording in failure diagnostics.'}),file=sys.stderr);sys.exit(1)
