#!/usr/bin/env python3
"""Actual reviewed ATI excerpts through bundled HTTP/browser, using pinned local HTML only.

No publisher body is written to reports or repository files. All upstream fetches
are intercepted in the server/worker process; this is not live-source evidence.
"""
import argparse,datetime,hashlib,json,os,pathlib,socket,subprocess,tempfile,time,urllib.request
from playwright.sync_api import sync_playwright,expect
from web_reader_test_helpers import read_tool

ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--source-root',type=pathlib.Path,required=True);p.add_argument('--server-dir',type=pathlib.Path);p.add_argument('--a11y',action='store_true');p.add_argument('--report');args=p.parse_args()
manifest=json.loads((ROOT/'scripts/canon/reviewed_partial_pages.json').read_text(encoding='utf-8'));rows=manifest['links']
assert {r['unit_id'] for r in rows}=={'thag6.13','thag17.3','thag10.1','thag15.2','thag16.8','thag2.13','thag15.1','snp3.11','mn34','sn12.22','sn12.60','sn22.87','sn35.244','sn56.22'} and len(rows)==14
server_dir=args.server_dir.resolve() if args.server_dir else ROOT/'server'
assert json.loads((server_dir/'data/reviewed-partial-pages.json').read_text(encoding='utf-8'))==manifest
source_root=args.source_root.resolve();sources={}
for row in rows:
    path=(source_root/(row['path'].lstrip('/')+'.html')).resolve();assert path.is_relative_to(source_root)
    assert hashlib.sha256(path.read_bytes()).hexdigest()==row['source_html_sha256']
    sources['https://accesstoinsight.org'+row['path']+'.html']=str(path)
# Expected wording/notice remains in process memory, never in an evidence artifact.
extract=r"""import{readFileSync}from'node:fs';import{atiPartialExcerpt}from'./src/ati-excerpt.mjs';import{atiNotice}from'./src/english.mjs';import{plainText}from'./src/http.mjs';const paths=JSON.parse(readFileSync(0,'utf8')),rows=JSON.parse(readFileSync('scripts/canon/reviewed_partial_pages.json','utf8')).links;console.log(JSON.stringify(Object.fromEntries(Object.entries(paths).map(([url,path])=>{const h=readFileSync(path,'utf8'),note=h.match(/<div class=['"]preface['"]>([^]*?)<\/div>/i);return[url,{text:atiPartialExcerpt(h,rows.find(r=>'https://accesstoinsight.org'+r.path+'.html'===url).partial_scope.extractor),notice:atiNotice(h),preface:note?plainText(note[1]):''}]}))));"""
expected=json.loads(subprocess.check_output(['node','--input-type=module','-e',extract],input=json.dumps(sources).encode(),cwd=ROOT))
def digest(value):return hashlib.sha256(json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
for row in rows:
    e=expected['https://accesstoinsight.org'+row['path']+'.html'];assert digest(e['text'])==row['partial_scope']['text_sha256'];assert digest(e['notice'])==row['partial_scope']['notice_sha256']
stage=pathlib.Path(tempfile.mkdtemp(prefix='pali-real-partial-browser-'));ledger=stage/'fetches.jsonl';ledger.write_text('',encoding='utf-8');preload=stage/'provider.cjs'
preload.write_text("const fs=require('node:fs');const sources="+json.dumps(sources)+";const record=x=>fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify(x)+'\\n');globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);if(!Object.hasOwn(sources,url)){record({kind:'unexpected',url});throw Error('UNEXPECTED_NETWORK_ATTEMPT')}record({kind:'pinned-local-source',url});return new Response(fs.readFileSync(sources[url],'utf8'),{status:200,headers:{'content-type':'text/html'}})};",encoding='utf-8')
def fetches():
    events=[json.loads(line) for line in ledger.read_text(encoding='utf-8').splitlines()]
    assert all(e['kind']=='pinned-local-source' and e['url'] in sources for e in events),events
    return events
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
base=f'http://127.0.0.1:{port}';checks=[];scans=[];receipts=[]
server=subprocess.Popen(['node','--require',str(preload),str(server_dir/'http.cjs')],cwd=stage,env={**os.environ,'PORT':str(port),'HOST':'127.0.0.1','RATE_LIMIT_PER_MINUTE':'0','PALI_CANON_CACHE_MB':'0'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
def rpc(name,arguments):
    body=json.dumps({'jsonrpc':'2.0','id':1,'method':'tools/call','params':{'name':name,'arguments':arguments}}).encode()
    return json.load(urllib.request.urlopen(urllib.request.Request(base+'/mcp',data=body,headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'}),timeout=180))['result']
def tool(name,arguments):
    r=rpc(name,arguments);assert not r.get('isError'),str(r)[:300]
    return r.get('structuredContent') or json.loads(next(c['text'] for c in r['content'] if c['type']=='text'))
try:
    ready=False
    for _ in range(100):
        try:urllib.request.urlopen(base+'/healthz',timeout=1);ready=True;break
        except Exception:time.sleep(.1)
    assert ready,'Bundled HTTP server did not become ready'
    holds=[('dn21','/tipitaka/dn/dn.21.2x.than',1),('an6.54','/tipitaka/an/an06/an06.054.olen',0),('an10.27','/tipitaka/an/an10/an10.027x.nypo',0)]
    batch=json.loads((ROOT/'docs/data/ordinary-excerpt-bindings-review.json').read_text(encoding='utf-8'))
    holds.extend((r['owner'],r['path'],len(r['merged_ordinary_alternatives'])) for r in batch['rows'] if r['decision']=='hold-whole-binding-partial-unit')
    for uid,held,remaining in holds:
        before=len(fetches());meta=tool('get_metadata',{'uid':uid});version='ati:'+held
        assert all(c['translation_id']!=version for c in meta['english'])
        assert meta['english_available']==remaining
        assert rpc('get_translation',{'uid':uid,'translation':version,'allow_partial':True}).get('isError')
        assert rpc('resolve_reference',{'reference':'https://www.accesstoinsight.org'+held+'.html'}).get('isError')
        assert tool('get_text',{'uid':uid,'limit':1})['segments']
        assert len(fetches())==before
        checks.append({'width':'http','unit':uid,'check':'held exact source and URL refuse before fetch; Pali and remaining indexed alternative are preserved'})
    scopes={}
    for row in rows:
        uid=row['unit_id'];version='ati:'+row['path'];before=len(fetches());data=tool('get_text',{'uid':uid,'limit':1});choices=data['english_available'];choice=next(c for c in choices if c['translation_id']==version);scope=choice['translation_scope'];scopes[uid]=scope
        assert scope['first_ref']==row['partial_scope']['first_ref'] and scope['last_ref']==row['partial_scope']['last_ref'] and scope['whole_unit_coverage'] is False
        assert scope['notice_sha256']==row['partial_scope']['notice_sha256'] and scope['extractor']==row['partial_scope']['extractor']
        assert rpc('get_translation',{'uid':uid,'translation':version}).get('isError')
        if uid in ['thag17.3','thag15.1','mn34','sn12.22','sn12.60','sn22.87','sn35.244','sn56.22']:assert len(choices)==1 and rpc('get_translation',{'uid':uid}).get('isError')
        else:
            ordinary={c['translation_id'] for c in choices if not c.get('translation_scope')}
            expected_full={'snp3.11':{'dt:KN/StNp/StNp3_11','ati:/tipitaka/kn/snp/snp.3.11.than'},'thag6.13':{'dt:KN/Thag/thag6_13','ati:/tipitaka/kn/thag/thag.06.13.than'},'thag2.13':{'dt:KN/Thag/thag2_13','ati:/tipitaka/kn/thag/thag.02.13.than'},'thag10.1':{'dt:KN/Thag/thag10_1'},'thag15.2':{'dt:KN/Thag/thag15_2'},'thag16.8':{'dt:KN/Thag/thag16_8','ati:/tipitaka/kn/thag/thag.16.08.than'}}
            assert ordinary==expected_full[uid]
        assert len(fetches())==before
        checks.append({'width':'http','unit':uid,'check':'exact pilot requires consent before fetch; whole alternatives and partial-only identity remain distinct'})
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
        cases=[(w,t) for w in [390,1280] for t in ['light','dark']] if args.a11y else [(w,'light') for w in [320,390,768,1280]]
        for width,theme in cases:
            context=browser.new_context(viewport={'width':width,'height':900},bypass_csp=args.a11y);context.add_init_script("localStorage.setItem('pali-library-v1',JSON.stringify("+json.dumps({'theme':theme})+"))");page=context.new_page();errors=[];calls=[];unexpected=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            def route_request(route):
                if not route.request.url.startswith(base+'/'):unexpected.append(route.request.url);route.abort()
                else:route.continue_()
            context.route('**/*',route_request)
            def record(req):
                if req.method=='POST' and req.url.endswith('/mcp') and req.post_data_json.get('params',{}).get('name')=='get_translation':calls.append(req.post_data_json['params']['arguments'])
            page.on('request',record)
            def audit(state,uid):
                if not args.a11y:return
                page.add_script_tag(path=str(ROOT/'node_modules/axe-core/axe.min.js'));d=page.evaluate("async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})")
                scans.append({'width':width,'theme':theme,'unit':uid,'state':state,'violations':[{'id':v['id'],'impact':v['impact'],'targets':[n['target'] for n in v['nodes']]} for v in d['violations']],'manual_review_rules':[v['id'] for v in d['incomplete']]})
            for row in rows:
                uid=row['unit_id'];version='ati:'+row['path'];scope=scopes[uid];e=expected['https://accesstoinsight.org'+row['path']+'.html'];before=len(calls);network_before=len(fetches())
                page.goto(base+'/#read?uid='+uid);read_tool(page,'English sources').wait_for();read_tool(page,'English sources').click()
                choice=page.locator('#study .translation-choice').filter(has_text=row['source_reference']);choice.get_by_role('button',name='Review partial-unit source',exact=True).wait_for()
                assert len(calls)==before and len(fetches())==network_before;audit('source choices',uid)
                choice.get_by_role('button',name='Review partial-unit source',exact=True).click();page.get_by_role('heading',name='Review English source scope',exact=True).wait_for()
                assert scope['first_ref']+' to '+scope['last_ref'] in page.locator('#study').inner_text();assert row['source_reference'] in page.locator('#study').inner_text();assert row['mapping_note'] in page.locator('#study').inner_text()
                expect(page.locator('#scope-consent')).not_to_be_checked();expect(page.get_by_role('button',name='Read reviewed partial source',exact=True)).to_be_disabled();assert len(calls)==before and len(fetches())==network_before
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');audit('explicit partial consent',uid)
                checks.append({'width':width,'theme':theme,'unit':uid,'check':'exact Pali span and publisher numbering visible; default consent absent; no English retrieval'})
                page.locator('#scope-consent').focus();page.keyboard.press('Space');page.keyboard.press('Tab');expect(page.get_by_role('button',name='Read reviewed partial source',exact=True)).to_be_focused()
                with page.expect_response(lambda r:r.request.method=='POST' and r.url.endswith('/mcp') and r.request.post_data_json.get('params',{}).get('name')=='get_translation',timeout=180000) as response:page.keyboard.press('Enter')
                payload=response.value.json()['result']['structuredContent'];expect(page.locator('#study .translation')).to_have_text(e['text'],timeout=180000)
                assert payload['text']==e['text'] and payload['text_id']==uid and payload['translation_id']==version and payload['whole_unit_coverage'] is False and payload['translation_scope']==scope and payload['next_offset'] is None
                assert digest({'licensing':payload['license'],'citation':payload['attribution']})==row['partial_scope']['notice_sha256']
                assert e['notice']['licensing'] in page.locator('#study .provenance').text_content() and e['notice']['citation'] in page.locator('#study .provenance').text_content()
                assert 'Partial English source' in page.locator('#study h3').inner_text();assert calls[-1]['translation']==version and calls[-1]['allow_partial'] is True and calls[-1]['scope_sha256']==scope['scope_sha256'] and 'allow_shared' not in calls[-1]
                if uid=='sn12.22':
                    quote=page.locator('#study blockquote');expect(quote).to_have_text(scope['pali_excerpt']['text']);assert 'Only part of this paragraph is translated.' in page.locator('#study').inner_text();assert scope['pali_excerpt']['start_char']==229 and scope['pali_excerpt']['end_char']==977;assert 'Dutiyaṃ.' not in quote.inner_text() and not quote.inner_text().startswith('Dukkhaṃ');assert 'Hiina.m:' not in payload['text'] and '[1]' not in payload['text']
                if uid=='sn12.60':assert 'The Blessed One was once staying' not in payload['text'] and '[1]' not in payload['text']
                if uid=='sn22.87':assert 'The Buddha visits' not in payload['text'] and 'Are you feeling better' not in payload['text'] and '[3]' not in payload['text']
                if uid=='sn35.244':assert 'iron pot' not in payload['text'] and '...' not in payload['text'] and '[1]' not in payload['text'] and 'publisher SN35.203' in page.locator('#study').inner_text()
                if uid=='sn56.22':assert 'See also' not in payload['text'] and 'untranslated inline colophon' in page.locator('#study').inner_text()
                editorial=e['preface'];assert not editorial or (editorial not in payload['text'] and editorial not in page.locator('#study').inner_text())
                if uid in ['thag15.1','snp3.11']:assert payload['text'].startswith('...') and payload['text'].endswith('...')
                if uid=='snp3.11':assert 'VRI725' in page.locator('#study').inner_text() and scope['first_ref']=='snp3.11/44'
                if uid=='thag17.3':assert all(label in payload['text'] for label in ['1034.','1035.','1036.']) and 'VRI1037–1039' in page.locator('#study').inner_text()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');audit('pinned verse-only partial source',uid)
                checks.append({'width':width,'theme':theme,'unit':uid,'check':'keyboard consent renders entire pinned verse excerpt and complete notice; preface excluded and partial identity preserved'})
                page.get_by_role('button',name='Reload passage and review sources',exact=True).click();read_tool(page,'English sources').wait_for();read_tool(page,'English sources').click();page.locator('#study .translation-choice').filter(has_text=row['source_reference']).get_by_role('button',name='Review partial-unit source',exact=True).click();expect(page.locator('#scope-consent')).not_to_be_checked();expect(page.get_by_role('button',name='Read reviewed partial source',exact=True)).to_be_disabled();assert len(calls)==before+1
                checks.append({'width':width,'theme':theme,'unit':uid,'check':'reload requires a new explicit partial-source consent'})
            assert not errors,errors;assert not unexpected,unexpected;context.close()
        browser.close()
    events=fetches();assert {e['url'] for e in events}==set(sources)
    receipts=[{'unit':r['unit_id'],'translation_id':'ati:'+r['path'],'source_html_sha256':r['source_html_sha256'],'text_sha256':r['partial_scope']['text_sha256'],'notice_sha256':r['partial_scope']['notice_sha256'],'first_ref':r['partial_scope']['first_ref'],'last_ref':r['partial_scope']['last_ref']} for r in rows]
    result={'checked_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':len(checks),'outside_source_tree':bool(args.server_dir),'pinned_local_sources_only':True,'upstream_http_requests':0,'provider_fetches':len(events),'checks':checks,'sources':receipts,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual bundled HTTP worker and browser with fourteen official pinned local publisher snapshots. No upstream/live availability, new rights approval, full-unit English coverage, word-level alignment or human accessibility certification. No publisher bodies in evidence reports.'}
    text=json.dumps(result,indent=2);print(text)
    if args.report:pathlib.Path(args.report).write_text(text+'\n',encoding='utf-8')
    if result['a11y']['violations']:raise SystemExit(1)
finally:server.terminate();server.wait(timeout=10)
