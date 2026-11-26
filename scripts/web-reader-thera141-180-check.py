#!/usr/bin/env python3
"""Bounded actual-MCP/browser acceptance for independently curated Therā141–180.

Reuse frozen D251 pair/privacy journeys and D250 reader/widget framework. Source
oracles remain independent sealed receipts, never generated from runtime profiles.
"""
import argparse,gzip,hashlib,importlib.util,json,os,re,socket,subprocess,sys,tempfile,time,urllib.request
from datetime import datetime,timezone
from pathlib import Path
from web_reader_apadana_intake import reviewed_intake
ROOT=Path(__file__).resolve().parents[1]
BASE='05fc4e29540fc0799145dc28838bedb7d964b2c7'
spec=importlib.util.spec_from_file_location('d251',ROOT/'scripts/web-reader-thera-pair-intake-check.py')
d251=importlib.util.module_from_spec(spec);spec.loader.exec_module(d251)
scaled,engine,compact,digest,read_sealed=d251.scaled,d251.engine,d251.compact,d251.digest,d251.read_sealed
pair_mcp,pair_widgets,pair_browser=d251.pair_mcp,d251.pair_widgets,d251.pair_browser
VRI,PIN=d251.VRI,d251.PIN

def utc_now():return datetime.now(timezone.utc).isoformat()

def git_bytes(path):return subprocess.check_output(['git','show',BASE+':'+path],cwd=ROOT,stderr=subprocess.DEVNULL)

def baseline():
    git=git_bytes
    manifest=json.loads(git('server/data/apadana.json'))
    parts=json.loads(git('server/data/canon.json.gz.parts.json'))
    raw=b''.join(git('server/data/'+(p if isinstance(p,str) else p['file'])) for p in parts['parts'])
    return manifest,json.loads(gzip.decompress(raw))

def normalized_segments(g,canon):
    """Reconcile only the two reviewed receipt shapes against immutable original blocks.

    This independent finite replay imports no production segmentation/parser code.
    Both shape-specific block bounds and labels must match before MCP comparison.
    """
    uid=g['id'];u=next(u for u in canon['units'] if u['id']==uid);root=g['root']
    assert all(u[k]==root[k] for k in ('book','start','end','title','vri'))
    assert u.get('index_revision')==root.get('index_revision')
    blocks=canon['books'][u['book']]['blocks'];out=[];stanza=None
    def flush():
        nonlocal stanza
        if stanza is not None:out.append(stanza);stanza=None
    for i in range(u['start'],u['end']):
        rend,number,text,notes,_=blocks[i]
        if rend=='hangnum':
            flush();stanza={'type':'verse','vri_paragraph':number,'text':'','blocks':[i,i+1],'variant_count':0};continue
        if rend in ('gatha1','gatha2','gatha3','gathalast'):
            if stanza is None:stanza={'type':'verse','vri_paragraph':number,'text':'','blocks':[i,i+1],'variant_count':0}
            stanza['blocks'][1]=i+1;stanza['text']+=('\n' if stanza['text'] else '')+text;stanza['variant_count']+=len(notes)
            if rend=='gathalast':flush()
            continue
        flush()
        heading=rend in ('subhead','title','chapter','book','nikaya','subsubhead') or (rend=='centre' and re.search(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$',text,re.I))
        if text:out.append({'type':'heading' if heading else 'prose','vri_paragraph':number,'text':text,'blocks':[i,i+1],'variant_count':len(notes)})
    flush()
    normalized=[{'ref':uid+'/'+str(i+1),'type':seg['type'],'blocks':seg['blocks'],'vri_paragraph':seg['vri_paragraph'],'text_sha256':digest(seg['text']),'variant_count':seg['variant_count']} for i,seg in enumerate(out)]
    if 141<=g['poem']<=160:
        proof=[{'ref':seg['ref'],'offset':i,'root_start':seg['blocks'][0],'root_end':seg['blocks'][1],
            'text_sha256':seg['text_sha256'],'vri_paragraph':seg['vri_paragraph'],
            'rends':[block[0] for block in blocks[seg['blocks'][0]:seg['blocks'][1]]]} for i,seg in enumerate(normalized)]
    else:
        assert 161<=g['poem']<=180
        proof=normalized
    assert proof==root['segments'], 'Independent source segment shape/bounds/labels differ: '+uid
    assert normalized[0]['ref']==root['first_ref'] and normalized[-1]['ref']==root['last_ref']
    return normalized


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--source-root',required=True,type=Path)
    p.add_argument('--official-checkout',type=Path)
    p.add_argument('--approval',type=Path,default=ROOT/'docs/evidence/apadana/THERA_141_180_APPROVAL.json')
    p.add_argument('--batch',choices=('141-160','161-180'),required=True)
    p.add_argument('--server-dir',type=Path)
    p.add_argument('--report',type=Path)
    p.add_argument('--launch-receipt',type=Path,help='Written before server launch, then completed after observed acceptance')
    p.add_argument('--package-archive',type=Path,help='Optional exact npm archive for installed-package receipt binding')
    p.add_argument('--pilot',action='store_true')
    p.add_argument('--pilot-poem',type=int)
    modes = p.add_mutually_exclusive_group(); modes.add_argument('--a11y',action='store_true'); modes.add_argument('--mcp-only',action='store_true')
    args = p.parse_args()
    approval = json.loads(args.approval.read_text())
    assert approval['base_commit'] == BASE
    assert approval['schema'] == 'reviewed-apadana-intake-v1'
    assert approval['status'] == 'approved'
    evidence_dir = ROOT/'docs/evidence/apadana'
    all_evidence = [read_sealed(evidence_dir/g['file'],g['sha256']) for g in approval['goldens']]
    assert len(all_evidence) == 4
    low,high = map(int,args.batch.split('-'))
    evidence = [e for e in all_evidence if all(low <= g['poem'] <= high for g in e['poems'])]
    assert len(evidence) == 2, 'Both independently reviewed chapter receipts required'
    for family in ('source_reviews','rights','independent_source_approvals'):
        for seal in approval[family]:read_sealed(evidence_dir/seal['file'],seal['sha256'])
    for field in ('independent_source_approval','baseline_freeze'):
        seal=approval[field];read_sealed(evidence_dir/seal['file'],seal['sha256'])
    # Reuse the frozen, independently curated D251 two-unit regression oracles.
    old_approval = json.loads((evidence_dir/'THERA_PAIR_INTAKE_APPROVAL.json').read_text())
    pair_seal=old_approval['pair_golden'];pair=read_sealed(evidence_dir/pair_seal['file'],pair_seal['sha256'])
    old_evidence=[read_sealed(evidence_dir/g['file'],g['sha256']) for g in old_approval['goldens']]
    independent_pair={g['id']:g for e in old_evidence for g in e['poems'] if g['id'] in pair}
    assert set(independent_pair) == set(pair) == {'tha-ap107','tha-ap108'}
    plan={'units':[{'id':uid,'after':parts['after'],
        'future_segments':[{**seg,'offset':offset} for offset,seg in enumerate(independent_pair[uid]['root']['segments'])],
        'old_segments':[{'ref':uid+'/'+str(offset+1),'offset':offset} for offset in range({'tha-ap107':10,'tha-ap108':8}[uid])]} for uid,parts in pair.items()]}
    all_approved = set(approval['approved_ids'])
    assert len(all_approved) == 38 and not all_approved & set(approval['baseline_ids'])
    assert {g['id'] for e in all_evidence for g in e['poems'] if g['id'] in all_approved} == all_approved
    assert approval['before_canon_sha256'] == approval['after_canon_sha256']
    expected = {g['id']:g for e in evidence for g in e['poems'] if g['id'] in all_approved}
    assert expected and len(expected) == sum(g['id'] in all_approved for e in evidence for g in e['poems']), 'Duplicate or empty independently curated batch'
    server_dir = (args.server_dir or ROOT/'server').resolve()
    launch_hashes = {str(p.relative_to(server_dir)):digest(p.read_bytes()) for p in sorted(server_dir.rglob('*')) if p.is_file()}
    launch_harness = digest(Path(__file__).read_bytes())
    mode = ('installed-' if args.server_dir else '') + ('mcp-only' if args.mcp_only else 'a11y' if args.a11y else 'normal')
    if args.server_dir:assert server_dir != ROOT/'server', 'Installed mode must launch outside the repository server tree'
    launch_helpers = {name:digest((ROOT/'scripts'/name).read_bytes()) for name in ('web-reader-thera-pair-intake-check.py','web-reader-apadana-thera-scaled-check.py','web-reader-apadana-thera-expansion-check.py','web_reader_test_helpers.py')}
    manifest = json.loads((server_dir/'data/apadana.json').read_text())
    assert manifest == json.loads((ROOT/'server/data/apadana.json').read_text())
    old, canon = baseline()
    current_curation = reviewed_intake(ROOT)
    current_ids = current_curation['expected_profile_ids']
    assert current_ids[:206] == approval['expected_profile_ids'], 'Historical206 cohort changed'
    assert set(old['links']) == set(approval['baseline_ids']) and len(old['links']) == 168
    assert set(old['links'])|all_approved == set(approval['expected_profile_ids'])
    assert set(manifest['links']) == set(current_ids), 'Current independently curated membership differs'
    rows = manifest['links']
    assert {k:v for k,v in manifest['source'].items() if k != 'policy'} == {k:v for k,v in old['source'].items() if k != 'policy'}, 'Existing source/rights provenance changed'
    current_thera_count = sum(row['publisher_chapter'] == 'chapter-3' for row in current_curation['baseline_records']+current_curation['approved_records'])
    assert manifest['source']['policy'] == old['source']['policy'].replace('168 finite',str(len(current_ids))+' finite').replace('128 explicitly mapped Therā',str(current_thera_count)+' explicitly mapped Therā')
    commentary_parts=git_bytes('server/data/commentary.json.gz.parts.json')
    assert (server_dir/'data/commentary.json.gz.parts.json').read_bytes() == commentary_parts
    for part in json.loads(commentary_parts)['parts']:
        name=part if isinstance(part,str) else part['file']
        assert (server_dir/'data'/name).read_bytes() == git_bytes('server/data/'+name), 'Existing commentary shard changed'
    for uid,row in old['links'].items():assert rows[uid] == row, 'Previous source changed: '+uid
    profile_probe="""import assert from'node:assert/strict';import{APADANA_PROFILES as current}from'./src/apadana-profiles.mjs';let s='';for await(const c of process.stdin)s+=c;const p=JSON.parse(s),url=x=>'data:text/javascript;base64,'+Buffer.from(x).toString('base64');const old=await import(url(p.root.replace('./apadana-thera-profiles.mjs',url(p.thera))));assert.equal(Object.keys(old.APADANA_PROFILES).length,168);for(const[id,row]of Object.entries(old.APADANA_PROFILES))assert.deepEqual(current[id],row,id);console.log(JSON.stringify({preserved:168}));"""
    old_profiles={'root':git_bytes('src/apadana-profiles.mjs').decode(),'thera':git_bytes('src/apadana-thera-profiles.mjs').decode()}
    profile_run=subprocess.run(['node','--input-type=module','-e',profile_probe],cwd=ROOT,input=compact(old_profiles),text=True,capture_output=True)
    assert profile_run.returncode == 0 and json.loads(profile_run.stdout)['preserved'] == 168, 'Previous browser source profiles changed'
    probe = "import{exactHistoricalCanonBytes}from'./tests/helpers/canon-before-four.mjs';import{gunzipSync}from'node:zlib';import{readBundled}from'./src/bundled-data.mjs';let s='';for await(const c of process.stdin)s+=c;process.stdout.write(exactHistoricalCanonBytes(gunzipSync(readBundled(JSON.parse(s)))).toString());"
    run = subprocess.run(['node','--input-type=module','-e',probe],cwd=ROOT,input=json.dumps(str(server_dir/'data/canon.json.gz')),text=True,capture_output=True)
    assert run.returncode == 0 and digest(run.stdout) == approval['after_canon_sha256'], 'Current logical canonical pin differs'
    current = json.loads(run.stdout)
    for row in plan['units']:
        assert next(u for u in current['units'] if u['id'] == row['id']) == row['after'], 'Existing repaired pair metadata changed'
    assert current == canon, 'Canonical words, books and metadata must remain unchanged in source-only intake'
    for uid,g in expected.items():
        row = rows[uid]
        for key in engine.PINS:assert row[key] == (g['root'][key] if key == 'root_sha256' else g[key])
        for key in ('poem','title','publisher_chapter','note_numbers','note_count','stanza_layout'):assert row[key] == g[key]
        raw_url='https://raw.githubusercontent.com/apadana-translation/apadana-site/'+engine.SOURCE_REVISION+'/'+g['path']
        if 141<=g['poem']<=160:assert g['raw_url']==raw_url
        else:assert g['exact_ref_url']=='https://github.com/apadana-translation/apadana-site/blob/'+engine.SOURCE_REVISION+'/'+g['path']
        assert row['raw_url']==raw_url and row['mapping_notes']==g['mapping_notes']
        assert row['path'] == '/text/'+g['path'].removeprefix('src/_poems/').removesuffix('.md')+'/'
        assert row['url'] == 'https://apadanatranslation.com'+row['path']
        for key in ('chapter_summary','collection_summary','publisher_divisions','editorial_gap'):
            actual,proof = row.get(key),g.get(key)
            assert bool(actual) == bool(proof), 'Independent source scope presence differs: '+uid+' '+key
            if not proof:continue
            actuals = actual if isinstance(actual,list) else [actual]
            proofs = proof if isinstance(proof,list) else [proof]
            for a,b in zip(actuals,proofs,strict=True):
                if 'scope' in b:assert a == b['scope']
                else:
                    for field in ('body_sha256','notes_sha256','root_sha256','first_ref','last_ref','parent_id','note_numbers','kind','label'):
                        if field in a and field in b:assert a[field] == b[field]
    checkout = args.source_root.resolve(); official = (args.official_checkout or checkout).resolve()
    env = {**os.environ,'GIT_NO_LAZY_FETCH':'1'}
    assert subprocess.check_output(['git','-C',str(official),'rev-parse','HEAD'],text=True,env=env).strip() == engine.SOURCE_REVISION
    artifacts = []
    for e in evidence:
        route = e['publisher_routing']; route = route if isinstance(route,list) else [route]
        for a in [*e['rights'],*route,*e['poems']]:
            path = (checkout/a['path']).resolve();assert path.is_relative_to(checkout)
            raw = path.read_bytes(); assert len(raw) == a['bytes'] and digest(raw) == a['raw_sha256']
            blob = hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest();assert blob == a['git_blob_sha1']
            assert subprocess.check_output(['git','-C',str(official),'rev-parse',engine.SOURCE_REVISION+':'+a['path']],text=True,env=env).strip() == blob
            artifacts.append({'path':a['path'],'sha256':a['raw_sha256'],'git_blob_sha1':blob})
    if args.pilot_poem is not None:
        assert args.pilot; expected = {u:g for u,g in expected.items() if g['poem'] == args.pilot_poem};assert len(expected) == 1
    elif args.pilot:expected = dict(list(expected.items())[:1])
    files = {rows[u]['raw_url']:str(checkout/expected[u]['path']) for u in expected}
    work_root = Path('/tmp/pali-thera141-180-browser');work_root.mkdir(exist_ok=True)
    mode_root=work_root/mode/args.batch;mode_root.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='run-',dir=mode_root) as work:
        stage = Path(work);ledger = stage/'provider.jsonl'; preload = stage/'provider.cjs'
        preload.write_text("const fs=require('node:fs'),files="+json.dumps(files)+";globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);const ok=Object.hasOwn(files,url);fs.appendFileSync("+json.dumps(str(ledger))+",JSON.stringify({url,ok})+'\\n');if(!ok)throw Error('Unexpected provider request');return new Response(fs.readFileSync(files[url]),{status:200,headers:{'content-type':'text/plain'}});};")
        with socket.socket() as sock:sock.bind(('127.0.0.1',0));port = sock.getsockname()[1]
        base = 'http://127.0.0.1:'+str(port)
        server_argv=['node','--require',str(preload),str(server_dir/'http.cjs')]
        launch_path=args.launch_receipt or (args.report.with_suffix('.launch.json') if args.report else mode_root/(stage.name+'.launch.json'))
        launch={'status':'launching','compiled_after_runs':False,'started_utc':utc_now(),'mode':mode,'batch':args.batch,
            'harness_argv':[sys.executable,*sys.argv],'harness_cwd':str(Path.cwd()),'server_argv':server_argv,
            'server_cwd':str(stage),'server_directory':str(server_dir),'outside_source_tree':bool(args.server_dir),
            'server_file_sha256':launch_hashes,'harness_sha256':launch_harness,'helper_sha256':launch_helpers,
            'approval_sha256':digest(args.approval.read_bytes()),
            'package_archive':str(args.package_archive.resolve()) if args.package_archive else None,
            'package_sha256':digest(args.package_archive.read_bytes()) if args.package_archive else None}
        def write_launch():
            launch_path.parent.mkdir(parents=True,exist_ok=True);launch_path.write_text(json.dumps(launch,indent=2)+'\n')
        assert not launch_path.exists(), 'Preserve the earlier launch receipt; choose a fresh report/receipt path'
        write_launch()  # Contemporaneous record exists BEFORE the server subprocess.
        server = subprocess.Popen(server_argv,cwd=stage,env={**os.environ,'HOST':'127.0.0.1','PORT':str(port),'RATE_LIMIT_PER_MINUTE':'0','CHATGPT_WIDGET':'1'},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        launch.update(status='running',server_pid=server.pid);write_launch()
        accepted=False
        checks,scans,receipts = [],[],[]
        def protocol(method,params):
            req = urllib.request.Request(base+'/mcp',data=compact({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
            with urllib.request.urlopen(req,timeout=90) as response:return json.load(response)['result']
        def rpc(name,arguments):return protocol('tools/call',{'name':name,'arguments':arguments})
        def tool(name,arguments):
            result = rpc(name,arguments);assert not result.get('isError'), 'MCP refused: '+name+' keys='+','.join(sorted(arguments))
            return result['structuredContent']
        try:
            for _ in range(100):
                try:urllib.request.urlopen(base+'/healthz',timeout=1).close();break
                except OSError:time.sleep(.1)
            else:raise AssertionError('Installed HTTP bundle failed startup')
            pair_mcp(rpc,tool,plan,checks)
            # Original full-book references remain under their unchanged VRI authority.
            book_id = canon['books'][36]['file'].removesuffix('.mul.xml')
            source_page = tool('get_text',{'book':book_id,'offset':0,'source_commit':VRI,'limit':200})
            assert source_page['source']['commit'] == VRI
            source_widget = tool('read_passage_widget',{'book':book_id,'segment':source_page['segments'][0]['ref'],'source_commit':VRI,'english':False})
            assert source_widget['pali']['segments'][0]['text'] == source_page['segments'][0]['text']
            assert rpc('get_text',{'book':book_id,'offset':0,'source_commit':PIN}).get('isError')
            checks.append({'check':'unchanged direct source-book authority accepts VRI pin and refuses unit-mapping pin'})
            metadata = {uid:tool('get_text',{'uid':uid,'limit':200}) for uid in rows}
            for held in ('tha-ap72','tha-ap142','tha-ap160','tha-ap161'):
                assert not tool('get_text',{'uid':held,'limit':200})['english_available'], 'Held source activated: '+held
            for uid,g in expected.items():
                normalized=normalized_segments(g,canon)
                assert [{**{k:s[k] for k in ('ref','type')},'text_sha256':digest(s['text']),'vri_paragraph':s.get('vri_paragraph')} for s in metadata[uid]['segments']] == [{k:s[k] for k in ('ref','type','text_sha256','vri_paragraph')} for s in normalized]
            assert not ledger.exists(), 'Pāli/metadata caused an English request'
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
                    for key in ('publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap'):
                        contract,actual = row.get(key),d.get(key)
                        assert bool(contract) == bool(actual), 'Owned source scope presence: '+key
                        if not contract:continue
                        contracts = contract if isinstance(contract,list) else [contract]
                        actuals = actual if isinstance(actual,list) else [actual]
                        for c,a in zip(contracts,actuals,strict=True):
                            assert all(a[k] == v for k,v in c.items()) and set(a) == set(c)|{'text','translator_notes'}
                            assert digest(a['text']) == c['body_sha256'] and digest(compact(a['translator_notes'])) == c['notes_sha256']
                    assert d['offset'] == len(''.join(pieces));pieces.append(d['text']);assert len(pieces)<150
                    command = d['continue_with']['arguments'] if d['continue_with'] else None
                    if command:assert command['prefix_sha256'] == digest(''.join(pieces))
                first_pages[uid] = first
                whole[uid] = {**first,'text':''.join(pieces),'continue_with':None}
                assert digest(whole[uid]['text']) == g['body_sha256']
                assert [digest(p) for p in whole[uid]['text'].split('\n\n')] == [p['sha256'] for p in g['body_paragraphs']]
                widgets[uid] = tool('read_passage_widget',{'uid':uid,'translation':version,'english_translation_revision':engine.SOURCE_REVISION})
                receipts.append({'uid':uid,'publisher_poem':g['poem'],'body_sha256':g['body_sha256'],'pages':len(pieces)})
            patches = scaled.mutations(whole)
            for uid,data in whole.items():
                assert data['translator_notes'], 'Each new approved source must have its independently reviewed poem notes'
                changed=[{**n,'text':n['text']+'\n'} if i==0 else n for i,n in enumerate(data['translator_notes'])]
                patches.append((uid,'same-count actual poem-note newline corruption',{'translator_notes':changed}))
                if data['publisher_paratext']:
                    patches.append((uid,'actual publisher-paratext newline corruption',{'publisher_paratext':data['publisher_paratext']+'\n'}))
                if data.get('chapter_summary'):
                    patches.append((uid,'actual owned-summary newline corruption',{'chapter_summary':{**data['chapter_summary'],'text':data['chapter_summary']['text']+'\n'}}))
            assert all(any(whole[uid].get(k)!=value for k,value in patch.items()) for uid,_,patch in patches), 'No-op mutation'
            comparison = """import assert from'node:assert/strict';import{validateComparisonPage,comparisonChoices}from'./web/translation-comparison.mjs';let s='';for await(const c of process.stdin)s+=c;const p=JSON.parse(s);for(const[uid,d]of Object.entries(p.first)){const choices=p.metadata[uid].english_available,args={uid,translation:d.translation_id,translation_revision:d.translation_revision,limit:d.limit};assert.equal(comparisonChoices(choices,uid).length,1);validateComparisonPage(d,args,{uid,choices,accepted:null});}for(const[uid,label,patch]of p.patches){const d=p.first[uid],choices=p.metadata[uid].english_available,args={uid,translation:d.translation_id,translation_revision:d.translation_revision,limit:d.limit};assert.throws(()=>validateComparisonPage({...d,...patch},args,{uid,choices,accepted:null}),label)}"""
            comparison_run = subprocess.run(['node','--input-type=module','-e',comparison],cwd=ROOT,input=compact({'first':first_pages,'metadata':metadata,'patches':patches}),text=True,capture_output=True)
            assert comparison_run.returncode == 0, 'Actual-response standalone comparison validator failed'
            checks.append({'check':'actual MCP source pages accepted by standalone comparison validator; source/body/notices/owned-apparatus mutations refused','sources':len(expected),'mutations':len(patches)})
            resources = protocol('resources/list',{})['resources'];uri = next(r['uri'] for r in resources if r['uri'].startswith('ui://pali-canon/reader-') and r['uri'].endswith('.html') and 'skybridge' not in r['uri'])
            html = protocol('resources/read',{'uri':uri})['contents'][0]['text']
            if not args.mcp_only:
                pair_widgets(html,{uid:tool('read_passage_widget',{'uid':uid,'english':False}) for uid in ('tha-ap107','tha-ap108')},checks)
                pair_browser(args,base,metadata,checks,scans)
                order = sorted((u for u in rows if u.startswith('tha-ap')),key=lambda u:rows[u]['poem'])
                origins = {}
                for independent_chapter in evidence:
                    chapter_ids = [g['id'] for g in independent_chapter['poems'] if g['id'] in expected]
                    for g in independent_chapter['poems']:
                        peers = [uid for uid in chapter_ids if uid != g['id']]
                        if g['id'] in expected and g.get('chapter_summary') and peers:origins[g['id']] = peers[0]
                scaled.browser_checks(args,base,rows,expected,whole,metadata,widgets,html,patches,checks,scans,order,origins)
            events = [json.loads(line) for line in ledger.read_text().splitlines()]
            assert all(e['ok'] for e in events) and {e['url'] for e in events} == set(files)
            report = {'mode':mode,'server_directory':str(server_dir),'outside_source_tree':bool(args.server_dir),'launch_receipt':str(launch_path),'started_utc':launch['started_utc'],'passed':len(checks),'baseline':BASE,'batch':args.batch,'pilot_only':args.pilot,'checks':checks,'sources':receipts,'source_artifacts':artifacts,'source_review_approval_sha256':digest(args.approval.read_bytes()),'harness_sha256':launch_harness,'helper_sha256':launch_helpers,'server_file_sha256':launch_hashes,'pinned_provider_reads':len(events),'upstream_provider_requests':0,'a11y':{'scans':len(scans),'violations':sum(len(s['violations']) for s in scans),'results':scans},'limits':'Actual installed MCP; exact local pinned official source fixtures. Chromium viewport and two simulated host bridges, not physical devices, signed-in host, human AT, specialist or new rights acceptance. No live upstream availability claim; report excludes publisher wording, notes and private draft bodies.'}
            assert report['a11y']['violations'] == 0
            assert launch_hashes == {str(p.relative_to(server_dir)):digest(p.read_bytes()) for p in sorted(server_dir.rglob('*')) if p.is_file()}, 'Installed package changed during acceptance'
            assert launch_harness == digest(Path(__file__).read_bytes()), 'Harness changed during acceptance'
            assert all(pin == digest((ROOT/'scripts'/name).read_bytes()) for name,pin in launch_helpers.items()), 'Shared helpers changed during acceptance'
            rendered = json.dumps(report,indent=2)
            if args.report:args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(rendered+'\n')
            print(rendered)
            accepted=True
        finally:
            server.terminate();server.wait(timeout=10)
            launch.update(status='passed' if accepted else 'failed',completed_utc=utc_now(),harness_exit_code=0 if accepted else 1,server_returncode=server.returncode)
            if args.report and args.report.exists() and accepted:launch['report_sha256']=digest(args.report.read_bytes())
            write_launch()

if __name__ == '__main__':main()
