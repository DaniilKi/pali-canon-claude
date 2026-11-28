#!/usr/bin/env python3
"""One-source actual HTTP/browser acceptance for publisher234 / canonicaltha-ap236.

Pinned external originals only. Viewports and simulated bridges are not physical
or human assistive acceptance. Full English is never written to reports.
"""
import argparse,gzip,hashlib,importlib.util,json,os,re,signal,socket,subprocess,sys,tempfile,time,traceback,urllib.request
from datetime import datetime,timezone
from web_reader_four_boundary_history import historical_canon_bytes
import copy
from canon.apadana_thera389390_spans import canon_before_389390, POST_PAIR_SHA256
from pathlib import Path
from web_reader_apadana_intake import reviewed_held234_intake,read_261_280,read_281_285,read_287_288,read_292_299,read_301_310,read_312_319,read_321_329,read_331_334,read_335_350,_reviewed_current368 as read_historical368,_reviewed_current375 as read_historical375,curated_additions
from web_reader_intake380 import reviewed_intake380 as read_historical380
from web_reader_approved_acceptance import assert_runtime
ROOT=Path(__file__).resolve().parents[1]
BASE='7d5ac90845402b322dabf2c5120d1485b15c0bda'
UID='tha-ap236';NEIGHBOR='tha-ap237'
spec=importlib.util.spec_from_file_location('held234_scaled',ROOT/'scripts/web-reader-apadana-thera-scaled-check.py')
scaled=importlib.util.module_from_spec(spec);spec.loader.exec_module(scaled)
engine,compact=scaled.engine,scaled.compact
def digest(value):
    assert isinstance(value,(bytes,str)), 'Digest domain must be raw bytes or explicit UTF8 text'
    return hashlib.sha256(value if isinstance(value,bytes) else value.encode('utf-8')).hexdigest()
VRI='2d134ff9ef60f70a1eb03c9370580228811a3070'
PIN='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
PEER_SHA='9b7b6cf1d4efe45ee06330551651e1baaf76f20226a35c47a07224592d1cfb8d'
NORM_SHA='bdc46f96753c743b0d099beb1334719f9cd061f6e3a1ece275de29d1c6d8ebf7'
def utc_now():return datetime.now(timezone.utc).isoformat()
def sealed(directory,descriptor):
    assert Path(descriptor['file']).name==descriptor['file']
    p=directory/descriptor['file'];assert digest(p.read_bytes())==descriptor['sha256']
    return json.loads(p.read_text())
def normalized_segments(g,canon):
    unit=next(u for u in canon['units'] if u['id']==UID)
    assert all(unit[k]==g['root'][k] for k in ('book','start','end','title','vri'))
    blocks=canon['books'][unit['book']]['blocks'];out=[];stanza=None
    def flush():
        nonlocal stanza
        if stanza is not None:out.append(stanza);stanza=None
    for index in range(unit['start'],unit['end']):
        rend,number,text,variants,_=blocks[index]
        if rend=='hangnum':flush();stanza={'type':'verse','vri_paragraph':number,'text':'','blocks':[index,index+1],'variant_count':0};continue
        if rend in ('gatha1','gatha2','gatha3','gathalast'):
            assert stanza is not None
            stanza['text']+=('\n' if stanza['text'] else '')+text;stanza['blocks'][1]=index+1;stanza['variant_count']+=len(variants)
            if rend=='gathalast':flush()
            continue
        flush();out.append({'type':'heading' if rend=='subhead' else 'prose','vri_paragraph':number,'text':text,'blocks':[index,index+1],'variant_count':len(variants)})
    flush()
    proof=[{'ref':UID+'/'+str(i+1),'type':s['type'],'blocks':s['blocks'],'vri_paragraph':s['vri_paragraph'],'text_sha256':digest(s['text']),'variant_count':s['variant_count']} for i,s in enumerate(out)]
    assert proof==g['root']['segments'] and len(proof)==8
    envelope={'id':unit['id'],'book':unit['book'],'start':unit['start'],'end':unit['end'],'blocks':blocks[unit['start']:unit['end']]}
    assert digest(compact(envelope))==g['root']['root_sha256']
    return proof

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-root',required=True,type=Path)
    p.add_argument('--official-checkout',type=Path,help='Optional external provenance directory; source bytes are verified against sealed raw/blob metadata without Git or network')
    p.add_argument('--timeout-seconds',type=int,default=900,help='Hard overall acceptance bound, 1–1200 seconds')
    p.add_argument('--approval',type=Path,default=ROOT/'docs/evidence/apadana/THERA_HELD234_APPROVAL.json')
    p.add_argument('--server-dir',type=Path)
    p.add_argument('--report',type=Path)
    p.add_argument('--launch-receipt',type=Path)
    p.add_argument('--package-archive',type=Path)
    modes=p.add_mutually_exclusive_group();modes.add_argument('--a11y',action='store_true');modes.add_argument('--mcp-only',action='store_true')
    args=p.parse_args()
    assert 1<=args.timeout_seconds<=1200
    def timeout_signal(_signal,_frame):raise TimeoutError('Bounded one-source acceptance deadline')
    signal.signal(signal.SIGALRM,timeout_signal);signal.alarm(args.timeout_seconds)
    approval=json.loads(args.approval.read_text());evidence_dir=ROOT/'docs/evidence/apadana'
    assert approval==reviewed_held234_intake(ROOT)
    current_additions=curated_additions(ROOT,'THERA_HELD234_APPROVAL.json')
    current_curation=current_additions['curation'];current_ids=current_curation['expected_profile_ids']
    historical303=read_261_280(ROOT)
    historical308=read_281_285(ROOT)
    historical310=read_287_288(ROOT)
    historical317=read_292_299(ROOT)
    historical325=read_301_310(ROOT)
    historical333=read_312_319(ROOT)
    historical339=read_321_329(ROOT)
    historical343=read_331_334(ROOT)
    historical359=read_335_350(ROOT)
    historical368=read_historical368(ROOT)
    historical375=read_historical375(ROOT)
    historical380=read_historical380(ROOT)
    assert len(historical375['expected_profile_ids'])==375 and len(historical375['expected_profile_ids'][285:])==90
    assert len(historical380['expected_profile_ids'])==380 and len(historical380['expected_profile_ids'][285:])==95
    assert len(current_ids)==382 and len(current_additions['ids'])==97
    assert current_ids[-2:]==['tha-ap403','tha-ap404']
    assert len(historical368['expected_profile_ids'])==368
    assert approval['base_commit']==BASE and approval['approved_ids']==[UID] and len(approval['baseline_ids'])==284
    assert approval['expected_profile_ids']==approval['baseline_ids']+[UID] and len(set(approval['expected_profile_ids']))==285
    assert approval['before_canon_sha256']==approval['after_canon_sha256']
    peer=sealed(evidence_dir,approval['independent_source_approval']);norm=sealed(evidence_dir,approval['independent_normalization'])
    assert approval['independent_source_approval']['sha256']==PEER_SHA and approval['independent_normalization']['sha256']==NORM_SHA
    assert peer['source_approval'] is True and peer['normalization_approval'] is True and peer['runtime_approval'] is False and peer['release_approval'] is False
    assert peer['approved_ids']==[UID] and peer['baseline']==BASE
    golden=sealed(evidence_dir,approval['goldens'][0] if isinstance(approval['goldens'],list) else approval['goldens'])
    profiles=sealed(evidence_dir,approval['expected_profiles']);links=sealed(evidence_dir,approval['expected_links'])
    assert profiles==peer['approved_profile_objects'] and links==peer['approved_link_objects']
    assert set(profiles)==set(links)=={UID} and len(golden['poems'])==1 and golden['poems'][0]['id']==UID
    expected={UID:golden['poems'][0]};g=expected[UID];normalization_poems={UID:norm['poems'][0]}
    assert norm['totals']=={'poems':1,'body_paragraphs':8,'stanza_entries':5,'printed_local_labels':5,'poem_notes':4,'prefaces':0,'summaries':0,'paired_displays':0}
    assert g['source_identity_audit']['frontmatter_order']==235 and g['poem']==234
    assert peer['source_identity']=={'file_slug':'poem-234','printed_poem_number':234,'frontmatter_order':235,'canonical_owner':UID,'path':'/text/chapter-3/poem-234/','neighbor235_is_distinct':True}
    server_dir=(args.server_dir or ROOT/'server').resolve()
    if args.server_dir:
        assert not server_dir.is_relative_to(ROOT) and server_dir.name=='server' and server_dir.parent.name=='pali-canon-mcp' and server_dir.parent.parent.name=='node_modules'
        assert args.package_archive and args.package_archive.is_file()
        assert json.loads((server_dir.parent/'package.json').read_text())['name']=='pali-canon-mcp'
    manifest=json.loads((server_dir/'data/apadana.json').read_text());rows=manifest['links']
    assert manifest==json.loads((ROOT/'server/data/apadana.json').read_text())
    assert historical303['baseline_ids']==approval['expected_profile_ids']
    assert historical308['baseline_ids']==historical303['expected_profile_ids']
    assert historical310['baseline_ids']==historical308['expected_profile_ids']
    assert historical317['baseline_ids']==historical310['expected_profile_ids']
    assert historical325['baseline_ids']==historical317['expected_profile_ids']
    assert historical333['baseline_ids']==historical325['expected_profile_ids']
    assert historical339['baseline_ids']==historical333['expected_profile_ids']
    assert historical343['baseline_ids']==historical339['expected_profile_ids']
    assert historical359['baseline_ids']==historical343['expected_profile_ids']
    assert historical368['baseline_ids']==historical359['expected_profile_ids']
    assert historical375['baseline_ids']==historical368['expected_profile_ids']
    assert historical380['baseline_ids']==historical375['expected_profile_ids']
    assert current_curation['baseline_ids']==historical380['expected_profile_ids']
    assert current_ids==approval['expected_profile_ids']+current_additions['ids']
    assert set(rows)==set(current_ids) and rows[UID]==links[UID]
    prior=sealed(evidence_dir,historical303['baseline_freeze'])
    assert prior['baseline']==historical303['base_commit'] and prior['profiles']==285
    assert list(prior['translation_objects'])==approval['expected_profile_ids']
    for old_id,old_row in prior['translation_objects'].items():assert rows[old_id]==old_row, 'Historical source changed: '+old_id
    for new_id,new_row in current_additions['links'].items():assert rows[new_id]==new_row, 'Current addition differs from independent pins: '+new_id
    old_source=prior['manifest_source']
    assert {key:value for key,value in manifest['source'].items() if key!='policy'}=={key:value for key,value in old_source.items() if key!='policy'}
    assert manifest['source']['policy']==old_source['policy'].replace('285 finite','382 finite').replace('245 explicitly mapped Therā','342 explicitly mapped Therā')
    assert rows[NEIGHBOR]['poem']==235 and rows[NEIGHBOR]['path']=='/text/chapter-3/poem-235/' and rows[NEIGHBOR]['title']=='Vediyadāyaka'
    assert rows[UID]['poem']==234 and rows[UID]['path']=='/text/chapter-3/poem-234/' and rows[UID]['title']=='Kilañjadāyaka'
    assert rows[UID]['raw_sha256']!=rows[NEIGHBOR]['raw_sha256'] and rows[UID]['body_sha256']!=rows[NEIGHBOR]['body_sha256']
    parts=json.loads((server_dir/'data/canon.json.gz.parts.json').read_text())['parts']
    canon_raw=gzip.decompress(b''.join((server_dir/'data'/(part if isinstance(part,str) else part['file'])).read_bytes() for part in parts))
    current_canon_source=json.loads(canon_raw)
    assert digest(compact(current_canon_source))==POST_PAIR_SHA256, 'Actual installed current canonical JSON must be exactly883d'
    historical_canon_source=canon_before_389390(copy.deepcopy(current_canon_source))
    canon_raw=historical_canon_bytes(compact(historical_canon_source).encode('utf-8'))
    assert digest(canon_raw)==approval['after_canon_sha256'];canon=json.loads(canon_raw)
    normalized=normalized_segments(g,canon);assert normalized==norm['poems'][0]['pali_segments']
    for k in engine.PINS:assert rows[UID][k]==normalization_poems[UID][k]
    assert rows[UID]['note_numbers']==[1,2,3,4] and not any(rows[UID].get(k) for k in ('publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap'))
    checkout=args.source_root.resolve();artifacts=[]
    for a in [*golden['rights'],golden['publisher_routing'],g]:
        path=(checkout/a['path']).resolve();assert path.is_relative_to(checkout)
        raw=path.read_bytes();assert len(raw)==a['bytes'] and digest(raw)==a['raw_sha256']
        blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest();assert blob==a['git_blob_sha1']
        artifacts.append({'path':a['path'],'sha256':a['raw_sha256'],'git_blob_sha1':blob})
    files={}
    for uid in (UID,NEIGHBOR):
        row=rows[uid];path=(checkout/row['raw_url'].split(PIN+'/',1)[1]).resolve();assert path.is_relative_to(checkout) and digest(path.read_bytes())==row['raw_sha256']
        files[row['raw_url']]=str(path)
    launch_hashes=assert_runtime(ROOT,server_dir)
    launch_harness=digest(Path(__file__).read_bytes())
    launch_helpers={name:digest((ROOT/'scripts'/name).read_bytes()) for name in ('web-reader-apadana-thera-scaled-check.py','web-reader-apadana-thera-expansion-check.py','web_reader_test_helpers.py','web_reader_apadana_intake.py','web_reader_approved_acceptance.py')}
    mode=('installed-' if args.server_dir else '')+('mcp-only' if args.mcp_only else 'a11y' if args.a11y else 'normal')
    work_root=Path('/tmp/pali-held234-browser');work_root.mkdir(exist_ok=True)
    mode_root=work_root/mode;mode_root.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='run-',dir=mode_root) as work:
        stage = Path(work);ledger = stage/'provider.jsonl'; preload = stage/'provider.cjs'
        preload.write_text("const fs=require('node:fs'),files="+json.dumps(files)+";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);const ok=Object.hasOwn(files,url);fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify({url,ok})+'\\n');if(!ok)throw Error('Unexpected provider request');return new Response(fs.readFileSync(files[url]),{status:200,headers:{'content-type':'text/plain'}});};")
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port = sock.getsockname()[1]
        base = 'http://127.0.0.1:'+str(port)
        server_argv=['node','--require',str(preload),str(server_dir/'http.cjs')]
        launch_path=args.launch_receipt or (args.report.with_suffix('.launch.json') if args.report else mode_root/(stage.name+'.launch.json'))
        launch={'status':'launching','compiled_after_runs':False,'started_utc':utc_now(),'mode':mode,'selected_source_count':1,'registry_profiles':len(current_ids),'source_approval':approval['independent_source_approval'],'independent_normalization':approval['independent_normalization'],
            'harness_pid':os.getpid(),'harness_argv':[sys.executable,*sys.argv],'harness_cwd':str(Path.cwd()),'server_argv':server_argv,
            'server_cwd':str(stage),'source_fixture':str(checkout),'official_checkout_provenance':str(args.official_checkout.resolve()) if args.official_checkout else None,'timeout_seconds':args.timeout_seconds,'server_directory':str(server_dir),'outside_source_tree':bool(args.server_dir),'runtime_origin':'isolated-npm-install' if args.server_dir else 'repository-compiled',
            'server_file_sha256':launch_hashes,'harness_sha256':launch_harness,'helper_sha256':launch_helpers,
            'approval_sha256':digest(args.approval.read_bytes()),'current_curation_sha256':current_curation['current_source_approval']['sha256'],'historical343_curation_sha256':current_curation['historical343_source_approval']['sha256'],'historical359_curation_sha256':current_curation['historical359_source_approval']['sha256'],'historical368_curation_sha256':current_curation['historical368_source_approval']['sha256'],'historical375_curation_sha256':current_curation['historical375_source_approval']['sha256'],'current_additions_ids':current_additions['ids'],
            'package_archive':str(args.package_archive.resolve()) if args.package_archive else None,
            'package_sha256':digest(args.package_archive.read_bytes()) if args.package_archive else None}
        def write_launch():
            launch_path.parent.mkdir(parents=True,exist_ok=True);launch_path.write_text(json.dumps(launch,indent=2)+'\n')
        assert not launch_path.exists(), 'Preserve the earlier launch receipt; choose a fresh report/receipt path'
        write_launch()  # Contemporaneous record exists BEFORE the server subprocess.
        accepted=False
        checks,scans,receipts = [],[],[]
        def protocol(method,params):
            req = urllib.request.Request(base+'/mcp',data=compact({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
            with urllib.request.urlopen(req,timeout=90) as response:return json.load(response)['result']
        def rpc(name,arguments):return protocol('tools/call',{'name':name,'arguments':arguments})
        def tool(name,arguments):
            result = rpc(name,arguments);assert not result.get('isError'), 'MCP refused: '+name+' keys='+','.join(sorted(arguments))
            return result['structuredContent']
        server = subprocess.Popen(server_argv,cwd=stage,start_new_session=True,env={**os.environ,'HOST':'127.0.0.1','PORT':str(port),'RATE_LIMIT_PER_MINUTE':'0','CHATGPT_WIDGET':'1'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            launch.update(status='running',server_pid=server.pid,server_process_group=server.pid,server_group_confirmed=os.getpgid(server.pid)==server.pid);write_launch()
            assert launch['server_group_confirmed'], 'Server must own its newly created process group'
            for _ in range(100):
                try:urllib.request.urlopen(base+'/healthz',timeout=1).close();break
                except OSError:time.sleep(.1)
            else:raise AssertionError('Installed HTTP bundle failed startup')
            metadata={uid:tool('get_text',{'uid':uid,'limit':200}) for uid in (UID,NEIGHBOR,'thi-ap31')}
            assert metadata[UID]['text_id']==UID and metadata[NEIGHBOR]['text_id']==NEIGHBOR
            assert metadata[UID]['title']!=metadata[NEIGHBOR]['title']
            assert [{**{k:s[k] for k in ('ref','type')},'text_sha256':digest(s['text']),'vri_paragraph':s.get('vri_paragraph')} for s in metadata[UID]['segments']]==[{k:s[k] for k in ('ref','type','text_sha256','vri_paragraph')} for s in normalized]
            assert not ledger.exists(), 'Metadata caused English request'
            neighbor=tool('get_translation',{'uid':NEIGHBOR,'translation':'ap:chapter-3/poem-235','translation_revision':PIN,'limit':500})
            assert neighbor['text_id']==NEIGHBOR and neighbor['raw_sha256']==rows[NEIGHBOR]['raw_sha256'] and neighbor['fetched_url']==rows[NEIGHBOR]['raw_url']
            checks.append({'check':'neighbor235 separate identity/source original positive','uid':NEIGHBOR})
            whole,widgets,first_pages = {},{},{}
            for uid,g in expected.items():
                row = rows[uid];version = 'ap:'+row['path'].removeprefix('/text/').rstrip('/')
                command = {'uid':uid,'translation':version,'translation_revision':engine.SOURCE_REVISION,'limit':500};pieces=[];first=None
                while command:
                    d = tool('get_translation',command);first = first or d
                    assert d['text_id'] == uid and d['translation_id'] == version and d['translation_revision'] == engine.SOURCE_REVISION
                    assert all(d[k] == row[k] for k in engine.PINS)
                    assert d['license'] == 'CC BY-NC-SA 4.0' and d['license_url'] == engine.LICENSE_URL
                    assert d['mapping_notes'] == row['mapping_notes'] and row['mapping_notes'] and all(n in d['notes'] for n in row['mapping_notes'])
                    assert digest(compact(d['translator_notes'])) == g['notes_sha256']
                    assert d['url'] == row['url'] and d['fetched_url'] == row['raw_url']
                    assert 'Walters' in d['attribution'] and 'Whitman College' in d['attribution'] and d['changes']
                    assert digest(d['publisher_paratext']) == g['paratext_sha256']
                    preface=g['publisher_preface']
                    assert isinstance(preface,dict)
                    assert 'publisher_preface' not in d, 'New payload preface descriptor is outside this note-free intake'
                    assert not any(d.get(k) for k in ('chapter_summary','collection_summary','publisher_divisions','editorial_gap'))
                    assert preface['note_numbers']==[] and preface['notes_sha256']==digest('[]')
                    assert d['publisher_paratext']==''
                    assert digest(d['publisher_paratext'])==preface['body_sha256']
                    paragraphs=d['publisher_paratext'].split('\n\n') if d['publisher_paratext'] else []
                    assert len(paragraphs)==preface['paragraph_count']
                    assert [digest(p) for p in paragraphs]==[p['sha256'] for p in preface['paragraphs']]
                    assert [len(p.split('\n')) for p in paragraphs]==[p['lines'] for p in preface['paragraphs']]
                    assert [len(p) for p in paragraphs]==[p['characters'] for p in preface['paragraphs']]
                    assert not re.search(r'\[Note \d+\]',d['publisher_paratext']), 'Reviewed note-free preface acquired a note reference'
                    for key in ('publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap'):
                        contract,actual = row.get(key),d.get(key)
                        assert bool(contract) == bool(actual), 'Owned source scope presence: '+key
                        if not contract:continue
                        contracts = contract if isinstance(contract,list) else [contract]
                        actuals = actual if isinstance(actual,list) else [actual]
                        for c,a in zip(contracts,actuals,strict=True):
                            assert all(a[k] == v for k,v in c.items()) and set(a) == set(c)|{'text','translator_notes'}
                            assert digest(a['text']) == c['body_sha256'] and digest(compact(a['translator_notes'])) == c['notes_sha256']

                    assert d['limit']==500
                    assert d['offset'] == len(''.join(pieces));pieces.append(d['text']);assert len(pieces)<150
                    command = d['continue_with']['arguments'] if d['continue_with'] else None
                    if command:assert command['prefix_sha256'] == digest(''.join(pieces))
                first_pages[uid] = first
                whole[uid] = {**first,'text':''.join(pieces),'continue_with':None}
                assert digest(whole[uid]['text']) == g['body_sha256']
                paragraphs = whole[uid]['text'].split('\n\n')
                assert [digest(p) for p in paragraphs] == [p['sha256'] for p in g['body_paragraphs']]
                assert [len(p.split('\n')) for p in paragraphs] == [p['lines'] for p in g['body_paragraphs']]
                assert [len(p) for p in paragraphs] == [p['characters'] for p in g['body_paragraphs']]
                assert len(g['stanza_layout']) == g['physical_stanza_count']
                for stanza in g['stanza_layout']:
                    assert whole[uid]['text'].count(stanza['suffix']) == 1
                proof=normalization_poems[uid]
                assert proof['canonical_owner']==uid and proof['publisher_poem']==g['poem']
                assert [digest(p) for p in paragraphs]==proof['body_paragraph_sha256s']
                assert len(paragraphs)==proof['body_paragraphs']==1+g['physical_stanza_count']+2
                stanzas=[p for p in paragraphs if any(p.endswith(stanza['suffix']) for stanza in g['stanza_layout'])]
                assert len(stanzas)==g['physical_stanza_count']
                assert g['stanza_layout']==proof['stanza_layout']
                assert digest(stanzas[0])==proof['body_paragraph_sha256s'][1] and digest(stanzas[-1])==proof['body_paragraph_sha256s'][-3]
                assert digest(paragraphs[-2])==proof['body_paragraph_sha256s'][-2] and digest(paragraphs[-1])==proof['body_paragraph_sha256s'][-1]
                assert [n['number'] for n in whole[uid]['translator_notes']]==proof['note_numbers']
                assert [{'number':n['number'],'sha256':digest(n['text'])} for n in whole[uid]['translator_notes']]==proof['note_text_sha256s']
                if len(whole[uid]['text'])>500:
                    assert len(pieces)>=2 and len(first['text'])==500, 'Long originals must exercise authentic 500-character continuation'
                else:
                    assert len(pieces)==1 and first['continue_with'] is None and first['text']==whole[uid]['text']
                checks.append({'check':'actual complete MCP body equals independent paragraph hashes including first/final stanza and closing colophons; owned poem notes exact','uid':uid,'paragraphs':len(paragraphs),'physical_entries':len(g['stanza_layout'])})
                widgets[uid] = tool('read_passage_widget',{'uid':uid,'translation':version,'english_translation_revision':engine.SOURCE_REVISION})
                receipts.append({'uid':uid,'publisher_poem':g['poem'],'body_sha256':g['body_sha256'],'pages':len(pieces)})
            continuation=first_pages[UID]['continue_with']['arguments']
            assert continuation and continuation['offset']==500
            for label,patch in [('changed revision',{'translation_revision':'0'*40}),('changed prefix',{'prefix_sha256':'0'*64}),('foreign source235 continuation',{'translation':'ap:chapter-3/poem-235'})]:
                assert rpc('get_translation',{**continuation,**patch}).get('isError'), label
            assert rpc('get_translation',{'uid':UID,'translation':'ap:chapter-3/poem-235','translation_revision':PIN,'limit':500}).get('isError')
            checks.append({'check':'public synthetic wrong revision/prefix/neighbor source continuation refused','uid':UID,'controls':4})
            patches = scaled.mutations(whole)
            for uid,data in whole.items():
                changed=[{**n,'text':n['text']+'\nSYNTHETIC_CACHED_NOTE_EDIT'} if i==0 else n for i,n in enumerate(data['translator_notes'])]
                patches.extend([(uid,'same-count actual cached-note edit',{'translator_notes':changed}),(uid,'forged edited cached-note hash',{'translator_notes':changed,'notes_sha256':digest(compact(changed))})])
                altered = first_pages[uid]['text']+'\nSYNTHETIC_BODY_CORRUPTION'
                patches.append((uid,'changed page text with forged registered whole-body hash metadata',{'text':altered,'body_sha256':digest(altered)}))
                patches.append((uid,'actual publisher-paratext newline corruption including reviewed empty owner',{'publisher_paratext':data['publisher_paratext']+'\n'}))
                if data.get('chapter_summary'):
                    patches.append((uid,'actual owned-summary newline corruption',{'chapter_summary':{**data['chapter_summary'],'text':data['chapter_summary']['text']+'\n'}}))
            patches.extend([(UID,'foreign publisher235 translation path',{'translation_id':'ap:chapter-3/poem-235'}),(UID,'foreign publisher235 fetched path',{'fetched_url':rows[NEIGHBOR]['raw_url']}),(UID,'foreign publisher235 source owner',{'text_id':NEIGHBOR})])
            assert all(any(whole[uid].get(k)!=value for k,value in patch.items()) for uid,_,patch in patches), 'No-op mutation'
            comparison = """import assert from'node:assert/strict';
import{validateComparisonPage,comparisonChoices}from'./web/translation-comparison.mjs';
let active={stage:'input'};
try{
  process.stdin.setEncoding('utf8');let s='';for await(const c of process.stdin)s+=c;const p=JSON.parse(s);
  for(const[uid,d]of Object.entries(p.first)){
    active={stage:'actual-source-positive',uid};
    const choices=p.metadata[uid].english_available,args={uid,translation:d.translation_id,translation_revision:d.translation_revision,limit:d.limit};
    assert.equal(comparisonChoices(choices,uid).length,1);
    validateComparisonPage(d,args,{uid,choices,accepted:null});
  }
  for(const[uid,label,patch]of p.patches){
    active={stage:'synthetic-negative',uid,label};
    const d=p.first[uid],choices=p.metadata[uid].english_available,args={uid,translation:d.translation_id,translation_revision:d.translation_revision,limit:d.limit};
    assert.throws(()=>validateComparisonPage({...d,...patch},args,{uid,choices,accepted:null}),label);
  }
}catch(error){
  process.stderr.write(JSON.stringify({...active,error_category:error.code||error.name||'Error'})+'\\n');
  process.exitCode=1;
}"""
            comparison_run = subprocess.run(['node','--input-type=module','-e',comparison],cwd=ROOT,input=compact({'first':first_pages,'metadata':metadata,'patches':patches}),text=True,capture_output=True,timeout=90)
            if comparison_run.returncode:
                safe={'stage':'subprocess','error_category':'UnexpectedExit'}
                for line in comparison_run.stderr.splitlines():
                    try:detail=json.loads(line)
                    except (ValueError,TypeError):continue
                    if not isinstance(detail,dict) or detail.get('stage') not in ('input','actual-source-positive','synthetic-negative'):continue
                    candidate={'stage':detail['stage']}
                    uid=detail.get('uid')
                    if uid in first_pages:candidate['uid']=uid
                    label=detail.get('label')
                    if any(uid==u and label==l for u,l,_ in patches):candidate['label']=label
                    category=detail.get('error_category')
                    candidate['error_category']=category if isinstance(category,str) and re.fullmatch(r'[A-Za-z0-9_]{1,50}',category) else 'Error'
                    safe=candidate
                print(compact({'comparison_failure':safe}),file=sys.stderr)
            assert comparison_run.returncode == 0, 'Actual-response standalone comparison validator failed'
            checks.append({'check':'actual MCP source pages accepted by standalone comparison validator; source/body/notices/owned-apparatus mutations refused','sources':len(expected),'mutations':len(patches)})
            resources=protocol('resources/list',{})['resources'];uri=next(r['uri'] for r in resources if r['uri'].startswith('ui://pali-canon/reader-') and r['uri'].endswith('.html') and 'skybridge' not in r['uri'])
            html=protocol('resources/read',{'uri':uri})['contents'][0]['text']
            if not args.mcp_only:
                order=sorted((uid for uid in rows if uid.startswith('tha-ap')),key=lambda uid:rows[uid]['poem'])
                scaled.browser_checks(args,base,rows,expected,whole,metadata,widgets,html,patches,checks,scans,order,{})
            events=[json.loads(line) for line in ledger.read_text().splitlines()]
            assert events and all(e['ok'] for e in events) and {e['url'] for e in events}==set(files)
            report={'mode':mode,'server_directory':str(server_dir),'runtime_origin':launch['runtime_origin'],'launch_receipt':str(launch_path),'selected_source_count':1,'registry_profiles':len(current_ids),'passed':len(checks),'checks':checks,'sources':receipts,'source_artifacts':artifacts,'source_approval':approval['independent_source_approval'],'independent_normalization':approval['independent_normalization'],'curation_sha256':digest(args.approval.read_bytes()),'current_curation_sha256':launch['current_curation_sha256'],'historical343_curation_sha256':launch['historical343_curation_sha256'],'historical359_curation_sha256':launch['historical359_curation_sha256'],'historical368_curation_sha256':launch['historical368_curation_sha256'],'historical375_curation_sha256':launch['historical375_curation_sha256'],'current_additions_ids':current_additions['ids'],'harness_sha256':launch_harness,'helper_sha256':launch_helpers,'server_file_sha256':launch_hashes,'package_sha256':launch['package_sha256'],'browser_run':not args.mcp_only,'full_batch_acceptance':not args.mcp_only,'pinned_provider_reads':len(events),'upstream_provider_requests':0,'a11y':{'performed':args.a11y,'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Exact local pinned originals over actual HTTP; Chromium390/1280 and two simulated host bridges. No live-provider, physical-device, signed-in-host, human AT, specialist or release claim. Client hash-metadata refusal does not authenticate arbitrary forged partial-page wording. Publisher wording/notes/private drafts excluded from reports.'}
            assert report['a11y']['violations']==0
            if args.a11y:
                for width in (390,1280):
                    for theme in ('light','dark'):
                        assert any(s['width']==width and s['theme']==theme and s['state']==UID+' page 1' for s in scans)
            assert launch_hashes=={str(p.relative_to(server_dir)):digest(p.read_bytes()) for p in sorted(server_dir.rglob('*')) if p.is_file()}
            assert launch_harness==digest(Path(__file__).read_bytes())
            assert all(pin==digest((ROOT/'scripts'/name).read_bytes()) for name,pin in launch_helpers.items())
            rendered=json.dumps(report,indent=2)
            if args.report:args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(rendered+'\n')
            print(rendered);accepted=True
        finally:
            signal.alarm(0)  # cleanup has its own bounded waits after success/deadline/failure
            # start_new_session creates this exact owned group; never target
            # names, ports, parent groups or unrelated test sessions.
            group=server.pid;cleanup={'process_group':group,'leader_pid':server.pid,'term_sent':False,'kill_sent':False,'leftover_group':None}
            def group_exists():
                try:os.killpg(group,0);return True
                except ProcessLookupError:return False
            def send_owned(sig):
                try:os.killpg(group,sig);return True
                except ProcessLookupError:return False  # owned group exited between probe and signal
            try:
                if group_exists():cleanup['term_sent']=send_owned(signal.SIGTERM)
                try:server.wait(timeout=10)
                except subprocess.TimeoutExpired:pass
                deadline=time.monotonic()+2
                while group_exists() and time.monotonic()<deadline:time.sleep(.05)
                if group_exists():
                    cleanup['kill_sent']=send_owned(signal.SIGKILL)
                server.wait(timeout=10)
                deadline=time.monotonic()+2
                while group_exists() and time.monotonic()<deadline:time.sleep(.05)
                cleanup['leftover_group']=group_exists()
                cleanup['status']='failed' if cleanup['leftover_group'] else 'reaped-owned-group'
            except Exception as cleanup_error:
                cleanup.update(status='failed',error_category=type(cleanup_error).__name__)
            clean=cleanup['status']=='reaped-owned-group'
            launch.update(status='passed' if accepted and clean else 'failed',completed_utc=utc_now(),harness_exit_code=0 if accepted and clean else 1,server_returncode=server.returncode,server_group_cleanup=cleanup)
            if args.report and args.report.exists() and accepted:launch['report_sha256']=digest(args.report.read_bytes())
            write_launch()
            assert clean, 'Owned server process group did not cleanly exit'

if __name__ == '__main__':
    try:main()
    except Exception as error:
        frames = [f for f in traceback.extract_tb(error.__traceback__) if f.filename == __file__]
        trace,context = error.__traceback__,{}
        while trace:
            scope = trace.tb_frame.f_locals
            uid = str(scope.get('uid',''))
            if re.fullmatch(r'(?:thi|tha)-ap\d+',uid):context['uid']=uid
            label = scope.get('label')
            if isinstance(label,str) and re.fullmatch(r'[A-Za-z0-9 _-]{1,100}',label):context['check_label']=label
            trace=trace.tb_next
        print(json.dumps({'passed':False,'error_type':type(error).__name__,
            'failure_at':{'file':Path(__file__).name,'line':frames[-1].lineno if frames else None},
            'context':context,'limits':'Failure details exclude publisher wording, translator notes and private draft bodies.'}),file=sys.stderr)
        sys.exit(1)
