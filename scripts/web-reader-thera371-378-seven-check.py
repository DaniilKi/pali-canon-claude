#!/usr/bin/env python3
"""Finite installed NEW7 reader acceptance; strict reviewed contract required.
Source fixtures are exact pinned originals, never forwarded upstream. Reports contain metadata only.
"""
import argparse,copy,gzip,hashlib,json,math,os,re,signal,socket,stat,subprocess,sys,tempfile,time,traceback,unicodedata,urllib.parse,urllib.request
from contextlib import contextmanager
from pathlib import Path
VRI='2d134ff9ef60f70a1eb03c9370580228811a3070';REV='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';F3='f3b3a608bac8d7e9f56323eb06fcc6fccdf2640561b7c2382d5c8cc34cc535de'
KEY='pali-library-v1';DRAFT='pali-library-note-drafts-v1';CANARY='SYNTHETIC_PRIVATE_ENGLISH16';PRIVATE=CANARY+'_a\u0304😀'
phase='arguments';report={'status':'running','checks':[],'counts':{},'limitations':'Fresh installed HTTP/MCP and actual Chromium DOM using7pinned external publisher fixtures. No live provider/signedhost/physicaldevice/humanAT/freshbrowseroffline or originalVRI-note acceptance claim.'}
PAIRS=[(371, 'tha-ap373'), (372, 'tha-ap374'), (374, 'tha-ap376'), (375, 'tha-ap377'), (376, 'tha-ap378'), (377, 'tha-ap379'), (378, 'tha-ap380')]
EXPECTED_COUNTS={'api_metadata_sources': 7, 'api_catalogue': 1, 'compatibility_refusals': 24, 'api_full_sources': 7, 'api_search_sources': 7, 'api_quote_sources': 7, 'api_pagination_pages': 16, 'pagination_negative_cases': 14, 'held_API_refusals': 3, 'native_catalogue_cells': 2, 'native_cells': 9, 'native_saved': 9, 'native_word_study': 9, 'native_tamper_cases': 6, 'host_stale_cases': 84, 'host_valid_owner_transitions': 14, 'host_canonical_stale_cases': 4, 'host_held_refusals': 2, 'host_cells': 14, 'native_legacy_refusals': 2, 'deny_all_provider': 1}
SYNTHETIC_SEED=json.loads('{"theme":"light","remember_position":false,"saved":[{"uid":"tha-ap348","ref":"tha-ap348/1","title":"Synthetic old pinned tha-ap348","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap348 pinned"},{"uid":"tha-ap348","ref":"tha-ap348/9","title":"Synthetic old unversioned tha-ap348","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap348 legacy"},{"uid":"tha-ap349","ref":"tha-ap349/1","title":"Synthetic old pinned tha-ap349","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap349 pinned"},{"uid":"tha-ap349","ref":"tha-ap349/3","title":"Synthetic old unversioned tha-ap349","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap349 legacy"},{"uid":"tha-ap374","ref":"tha-ap374/1","title":"Synthetic old pinned tha-ap374","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap374 pinned"},{"uid":"tha-ap374","ref":"tha-ap374/11","title":"Synthetic old unversioned tha-ap374","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap374 legacy"},{"uid":"tha-ap375","ref":"tha-ap375/1","title":"Synthetic old pinned tha-ap375","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap375 pinned"},{"uid":"tha-ap375","ref":"tha-ap375/3","title":"Synthetic old unversioned tha-ap375","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap375 legacy"},{"uid":"tha-ap423","ref":"tha-ap423/1","title":"Synthetic old pinned tha-ap423","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap423 pinned"},{"uid":"tha-ap423","ref":"tha-ap423/23","title":"Synthetic old unversioned tha-ap423","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap423 legacy"},{"uid":"tha-ap424","ref":"tha-ap424/1","title":"Synthetic old pinned tha-ap424","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap424 pinned"},{"uid":"tha-ap424","ref":"tha-ap424/3","title":"Synthetic old unversioned tha-ap424","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap424 legacy"},{"uid":"tha-ap426","ref":"tha-ap426/1","title":"Synthetic old pinned tha-ap426","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap426 pinned"},{"uid":"tha-ap426","ref":"tha-ap426/12","title":"Synthetic old unversioned tha-ap426","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap426 legacy"},{"uid":"tha-ap427","ref":"tha-ap427/1","title":"Synthetic old pinned tha-ap427","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap427 pinned"},{"uid":"tha-ap427","ref":"tha-ap427/3","title":"Synthetic old unversioned tha-ap427","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap427 legacy"},{"uid":"tha-ap428","ref":"tha-ap428/1","title":"Synthetic old pinned tha-ap428","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap428 pinned"},{"uid":"tha-ap428","ref":"tha-ap428/15","title":"Synthetic old unversioned tha-ap428","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap428 legacy"},{"uid":"tha-ap429","ref":"tha-ap429/1","title":"Synthetic old pinned tha-ap429","offset":0,"source_commit":"2d134ff9ef60f70a1eb03c9370580228811a3070","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap429 pinned"},{"uid":"tha-ap429","ref":"tha-ap429/3","title":"Synthetic old unversioned tha-ap429","note":"SYNTHETIC_PRIVATE_ENGLISH16_ā😀 saved tha-ap429 legacy"}],"reading_progress":[]}')

GUARD_SOURCE="'use strict';\n// UNEXECUTED PROPOSAL. Only exact independently approved raw artifacts, no forwarding.\nconst fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');\nconst H=b=>crypto.createHash('sha256').update(b).digest('hex');\nfunction physical(p){if(!path.isAbsolute(p)||fs.realpathSync(p)!==p||!fs.lstatSync(p).isFile())throw Error('Physical absolute file required');return fs.readFileSync(p);}\nconst cp=process.env.PALI_ENGLISH16_GUARD_CONFIG,cs=process.env.PALI_ENGLISH16_GUARD_SHA256;\nconst raw=physical(cp);if(!/^[a-f0-9]{64}$/.test(cs||'')||H(raw)!==cs)throw Error('Unsealed guard configuration');\nconst c=JSON.parse(raw);const REV='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';\nconst owners=new Map([[371,'tha-ap373'],[372,'tha-ap374'],[374,'tha-ap376'],[375,'tha-ap377'],[376,'tha-ap378'],[377,'tha-ap379'],[378,'tha-ap380']]);\nif(!['pinned-fixture','deny-all'].includes(c.mode)||c.source_revision!==REV||!Array.isArray(c.approved_publishers)||c.approved_publishers.length!==7||new Set(c.approved_publishers).size!==c.approved_publishers.length||c.approved_publishers.some(n=>!Number.isSafeInteger(n)||!owners.has(n))||!Array.isArray(c.files)||!path.isAbsolute(c.ledger)||fs.realpathSync(path.dirname(c.ledger))!==path.dirname(c.ledger))throw Error('Invalid finite source scope');\nif(c.mode==='deny-all'&&c.files.length!==0||c.mode==='pinned-fixture'&&c.files.length!==c.approved_publishers.length)throw Error('Source fixture count mismatch');\nconst allowed=new Map(),seen=new Set();\nfor(const f of c.files){\n const expected='https://raw.githubusercontent.com/apadana-translation/apadana-site/'+REV+'/src/_poems/chapter-3/poem-'+f.publisher+'.md';\n if(!c.approved_publishers.includes(f.publisher)||f.id!==owners.get(f.publisher)||f.url!==expected||!/^[a-f0-9]{64}$/.test(f.sha256||'')||seen.has(f.publisher)||H(physical(f.path))!==f.sha256)throw Error('Unapproved raw fixture');\n seen.add(f.publisher);allowed.set(expected,Object.freeze({...f}));\n}\n// Root precreates one empty physical ledger in its owned0700 output directory.\n// Preload may run again in a worker: append metadata, never truncate or recreate.\nphysical(c.ledger);const log=fs.openSync(c.ledger,'a');let sequence=0;\nfunction event(x){if(++sequence>4096)throw Error('Guard ledger bound');fs.writeSync(log,JSON.stringify({sequence,...x})+'\\n');}\nconst deny=api=>function(){event({kind:'socket-denied',api});const e=Error('Offline acceptance denies network');e.code='OFFLINE_SOCKET_DENIED';throw e;};\nglobalThis.fetch=async(input,options={})=>{\n const url=typeof input==='string'?input:input instanceof URL?input.href:input?.url||'';const f=allowed.get(url);const method=options.method||input?.method||'GET';\n if(c.mode!=='pinned-fixture'||!f||method!=='GET'||options.body!=null){event({kind:'fetch-denied',url_sha256:H(url),known_url:!!f});throw Error('Source outside sealed finite fixture map');}\n const bytes=physical(f.path);if(H(bytes)!==f.sha256)throw Error('Raw artifact changed');event({kind:'fixture-read',id:f.id,publisher:f.publisher,raw_sha256:f.sha256,url_sha256:H(url),actual_network_forwarded:0});return new Response(bytes,{status:200,headers:{'content-type':'text/plain; charset=utf-8'}});\n};\nfor(const n of ['node:http','node:https']){const m=require(n);m.request=deny(n+'.request');m.get=deny(n+'.get');if(m.Agent?.prototype?.createConnection)m.Agent.prototype.createConnection=deny(n+'.Agent.createConnection');}\nconst net=require('node:net');net.connect=deny('net.connect');net.createConnection=deny('net.createConnection');net.Socket.prototype.connect=deny('net.Socket.connect');require('node:tls').connect=deny('tls.connect');\nconst dns=require('node:dns');for(const k of Object.keys(dns))if(k.startsWith('resolve'))dns[k]=deny('dns.'+k);\ndns.lookup=function(hostname,options,callback){const cb=typeof options==='function'?options:callback;const opts=typeof options==='number'?{family:options}:options&&typeof options==='object'?options:{};if(hostname!=='127.0.0.1'||typeof cb!=='function'||![undefined,0,4].includes(opts.family)||opts.all!==undefined&&typeof opts.all!=='boolean')return deny('dns.lookup')();event({kind:'literal-loopback-resolution',hostname:'127.0.0.1',family:4,all:opts.all===true});process.nextTick(()=>opts.all===true?cb(null,[{address:'127.0.0.1',family:4}]):cb(null,'127.0.0.1',4));};\nfor(const k of Object.keys(dns.promises))if(k==='lookup'||k.startsWith('resolve'))dns.promises[k]=deny('dns.promises.'+k);\nrequire('node:dgram').createSocket=deny('dgram.createSocket');if(typeof globalThis.WebSocket==='function')globalThis.WebSocket=deny('WebSocket');require('node:module').syncBuiltinESMExports();\nevent({kind:'guard-ready',mode:c.mode,allowlisted:allowed.size,actual_network_forwarded:0});\n"

GUARD_SHA256='7a8a7640f9861afcae96b8fa1442db5cbdbbf8b6ec371ae28a0e49badd373174'


def require(ok,code):
 if not ok:raise ValueError(code)


def js_utf8(value):return value.encode('utf-16-le','surrogatepass').decode('utf-16-le','replace').encode('utf-8')


def sha(value):
 if isinstance(value,bytes):raw=value
 elif isinstance(value,str):raw=js_utf8(value)
 else:raise TypeError('SHA_EXPECTS_BYTES_OR_STR')
 return hashlib.sha256(raw).hexdigest()


def packed(value):return json.dumps(value,ensure_ascii=False,separators=(',',':'))


def utf16(value):return len(value.encode('utf-16-le','surrogatepass'))//2


def typed_equal(a,b):return json.dumps(a,ensure_ascii=False,sort_keys=True,separators=(',',':'))==json.dumps(b,ensure_ascii=False,sort_keys=True,separators=(',',':'))


def whole_payload(data,row,profile,translation_id):
 require(data['text_id']==row['id']==profile['id'],'EXACT_NATIVE_OWNER');whole_source(data,row,profile,translation_id)


def whole_widget_payload(widget,row,profile,translation_id,source_pin):
 require(widget['text_id']==row['id']==profile['id'] and widget['canonical'] is True,'EXACT_WIDGET_OUTER_OWNER');require(widget['source']['commit']==VRI and widget['source'].get('locator_revision',VRI)==source_pin,'EXACT_WIDGET_CURRENT_PIN');data=widget['english'];require(isinstance(data,dict) and 'text_id'not in data and 'limit'not in data,'REAL_PROJECTED_WIDGET_SCHEMA');require(data['reference']==profile['reference'],'EXACT_WIDGET_SOURCE_REFERENCE');wanted={'name':'read_passage_widget','arguments':{'uid':row['id'],'source_commit':source_pin,'translation':translation_id,'english':True,'offset':0,'limit':80,'english_offset':0,'english_translation_revision':REV}};require(typed_equal(data['read_with'],wanted),'EXACT_WIDGET_OWNER_READING_CONTEXT');require(data['truncated']is False,'COMPLETE_WIDGET_BODY');whole_source(data,row,profile,translation_id)


def continuation_page(data,row,version,offset,limit,prior,page):
 require(data['text_id']==row['id'] and data['translation_id']==version and data['translation_revision']==REV,'PAGE_OWNER_VERSION');require(type(data['offset'])is int and data['offset']==offset==utf16(prior) and data['limit']==limit==500,'PAGE_ORDINAL_UTF16');require(sha(data['text'])==page['text_sha256'] and utf16(data['text'])==page['characters_utf16'],'INDEPENDENT_ORIGINAL_PAGE_WORDS');require(data['prefix_sha256']==page['start_prefix_sha256']==sha(prior),'START_PREFIX_BEFORE_PAGE');combined=prior+data['text'];following=page['next_offset'];require(data['next_offset']==following and (following is None or type(following)is int),'EXACT_PAGE_CURSOR');require(sha(combined)==page['continuation_prefix_sha256'],'END_PREFIX_THROUGH_NEXT_OFFSET')
 if following is None:require(data['continue_with']is None and sha(combined)==row['body_sha256'],'TERMINAL_NULL_COMPLETE_BODY')
 else:require(typed_equal(data['continue_with'],{'name':'get_translation','arguments':{'uid':row['id'],'translation':version,'offset':following,'limit':500,'prefix_sha256':sha(combined),'translation_revision':REV}}),'EXACT_SOURCE_PINNED_PAGE_COMMAND')
 return combined,data['continue_with']


def count(name,n=1):report['counts'][name]=report['counts'].get(name,0)+n


def sealed(d,json_data=True):
 p=Path(d['path']);require(p.is_absolute() and p.is_file() and not any(z.is_symlink() for z in [p,*p.parents]),'PHYSICAL_ABSOLUTE_REGULAR_INPUT');b=p.read_bytes();require(sha(b)==d['sha256'],'INPUT_SEAL_CHANGED');return json.loads(b) if json_data else b


def inventory(p):
 out={}
 for z in sorted(p.rglob('*')):
  require(not z.is_symlink(),'NO_PACKAGE_SYMLINKS')
  if z.is_file():b=z.read_bytes();out[str(z.relative_to(p))]={'bytes':len(b),'sha256':sha(b)}
 return out


def read_tool(page,name):
 panel=page.locator('.study-actions')
 if panel.count() and panel.get_attribute('open') is None:panel.locator(':scope > summary').click()
 return page.get_by_role('button',name=name,exact=True)


def fields(href):return dict(urllib.parse.parse_qsl(urllib.parse.urlsplit(href).fragment.split('?',1)[1]))


def profile(page):return json.loads(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')') or '{}')


def semantic(a,b,code):require(typed_equal(a,b),code)


def segments(actual,expected):
 require(len(actual)==len(expected),'EXACT_PALI_PAGE_COUNT')
 for got,want in zip(actual,expected,strict=True):
  require(got['ref']==want['ref'] and got['type']==want['type'] and got['text']==want['text'] and got.get('vri_paragraph')==want['vri_paragraph'],'INDEPENDENT_PALI_WORDS_REFS_TYPES_LABELS')
  for field in ['pts_page_begins','thai_page_begins','myanmar_page_begins','vri_page_begins']:require(got.get(field,[])==want[field],'ORIGINAL_PALI_PAGE_MARKERS')


def render(canon,u):
 """Finite standalone source-data model; no SUT parser/module imported."""
 rows=canon['books'][u['book']]['blocks'];out=[];active=None;pending=[];heads={'subhead','title','chapter','book','nikaya','subsubhead'};verses={'gatha1','gatha2','gatha3','gathalast'};eds={'T':('thai','Thai'),'M':('myanmar','Myanmar'),'V':('vri','VRI')}
 def flush():
  nonlocal active
  if active is not None:out.append(active);active=None
 for i in range(u['start'],u['end']):
  rend,n,text,notes,pages=rows[i];events=pending+[(ed,p) for ed in eds for p in pages.get(ed,[])];pending=[]
  if rend=='hangnum':flush();active={'type':'verse','n':n,'text':'','pts':[],'ed':events,'span':[i,i+1]};continue
  if rend in verses:
   if active is None:active={'type':'verse','n':n,'text':'','pts':[],'ed':[],'span':[i,i+1]}
   active['text']+=('\n' if active['text'] else '')+text;active['pts']+=pages.get('P',[]);active['ed']+=events;active['span'][1]=i+1
   if rend=='gathalast':flush()
  else:
   flush()
   if not text:pending=events;continue
   heading=rend in heads or rend=='centre' and re.search(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$',text,re.I)
   out.append({'type':'heading' if heading else 'prose','n':n,'text':text,'pts':pages.get('P',[]),'ed':events,'span':[i,i+1]})
 flush();answer=[];unique=lambda xs:list(dict.fromkeys(xs))
 for i,z in enumerate(out):
  def pts(p):
   v,n=map(int,p.split('.'));return 'Ap '+(({1:'i',2:'ii'}.get(v,str(v))+' ') if v else '')+str(n)
  def edlabel(ed,p):
   v,n=map(int,p.split('.'));return eds[ed][1]+' Ap '+(str(v)+'.' if v else '')+str(n)
  answer.append({'ref':u['id']+'/'+str(i+1),'type':z['type'],'text':z['text'],'vri_paragraph':z['n'],'source_blocks':z['span'],'offset':i,'expected_source_pin':VRI+'-'+u['index_revision'] if 'index_revision'in u else VRI,'pts_page_begins':unique([pts(p) for p in z['pts']]),**{meta[0]+'_page_begins':unique([edlabel(ed,p) for e,p in z['ed'] if e==ed]) for ed,meta in eds.items()}})
 return answer


class Client:
 def __init__(self,base):self.base=base
 def protocol(self,method,params):
  req=urllib.request.Request(self.base+'/mcp',data=packed({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
  with urllib.request.urlopen(req,timeout=30) as r:return json.load(r)['result']
 def rpc(self,name,args):return self.protocol('tools/call',{'name':name,'arguments':args})
 def data(self,name,args):
  r=self.rpc(name,args);require(not r.get('isError'),'PUBLIC_TOOL_REFUSED');return r['structuredContent']


def stop_owned(child):
 group=child.pid
 def exists():
  try:os.killpg(group,0);return True
  except ProcessLookupError:return False
 if exists():os.killpg(group,signal.SIGTERM)
 try:child.wait(timeout=8)
 except subprocess.TimeoutExpired:
  try:os.killpg(group,signal.SIGKILL)
  except ProcessLookupError:pass
  child.wait(timeout=5)
 for _ in range(40):
  if not exists():break
  time.sleep(.05)
 if exists():
  try:os.killpg(group,signal.SIGKILL)
  except ProcessLookupError:pass
 for _ in range(40):
  if not exists():break
  time.sleep(.05)
 return {'pid':child.pid,'leader_reaped':child.poll() is not None,'group_absent':not exists()}


@contextmanager
def epoch(c,server,stage,mode):
 global phase
 ledger=stage/(mode+'.jsonl');ledger.write_text('');config=stage/(mode+'.json');files=[]
 if mode=='pinned-fixture':
  for row in c['_rows']:
   p=c['_profiles'][row['id']];files.append({'id':row['id'],'publisher':row['publisher'],'url':p['raw_url'],'path':str(Path(c['publisher_originals'])/row['raw_artifact']['path']),'sha256':row['raw_artifact']['sha256']})
 cfg={'mode':mode,'source_revision':REV,'approved_publishers':[r['publisher'] for r in c['_rows']],'files':files,'ledger':str(ledger)};config.write_text(packed(cfg))
 with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
 env={k:v for k,v in os.environ.items() if k not in ('NODE_OPTIONS','NODE_PATH','PALI_ENGLISH16_GUARD_CONFIG','PALI_ENGLISH16_GUARD_SHA256')};env.update(HOST='127.0.0.1',PORT=str(port),RATE_LIMIT_PER_MINUTE='0',CHATGPT_WIDGET='1',PALI_ENGLISH16_GUARD_CONFIG=str(config),PALI_ENGLISH16_GUARD_SHA256=sha(config.read_bytes()))
 child=subprocess.Popen(['node','--require',str(stage/'offline-pali-guard.cjs'),str(server/'http.cjs')],cwd=stage,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True);client=Client('http://127.0.0.1:'+str(port));record={'mode':mode,'pid':child.pid,'ledger':str(ledger)};report.setdefault('epochs',[]).append(record)
 try:
  for _ in range(100):
   try:urllib.request.urlopen(client.base+'/healthz',timeout=1).close();break
   except OSError:time.sleep(.1)
  else:raise ValueError('INSTALLED_HTTP_STARTUP')
  yield client
 finally:
  record['cleanup']=stop_owned(child);require(record['cleanup']['leader_reaped'] and record['cleanup']['group_absent'],'HTTP_GROUP_CLEANUP_UNCERTAIN')
  raw=ledger.read_bytes();require(len(raw)<=2097152,'LEDGER_BOUND');events=[json.loads(x) for x in raw.splitlines()];allowed={'guard-ready','literal-loopback-resolution','fixture-read'} if mode=='pinned-fixture' else {'guard-ready','literal-loopback-resolution','fetch-denied'}
  require(bool(events) and all(x['kind'] in allowed for x in events),'UNEXPECTED_UPSTREAM_EVENT')
  if mode=='pinned-fixture':require(all(x['id'] in c['approved_ids'] and x['actual_network_forwarded']==0 for x in events if x['kind']=='fixture-read'),'EXACT_SOURCE_FIXTURE_EVENTS')
  record.update(ledger_sha256=sha(raw),fixture_reads=sum(x['kind']=='fixture-read' for x in events),denied_reads=sum(x['kind']=='fetch-denied' for x in events),actual_upstream_forwarded=0)
  if mode=='pinned-fixture':require({x['id']for x in events if x['kind']=='fixture-read'}==set(c['approved_ids']),'EVERY_APPROVED_ORIGINAL_ACTUALLY_READ')
  else:require(record['denied_reads']>=1,'ACTUAL_DENIED_PROVIDER_ATTEMPT_REQUIRED')


def private_text(value,markers):
 for _ in range(4):
  if any(m in value for m in markers):return True
  value=urllib.parse.unquote(re.sub(r'\\u([a-fA-F0-9]{4})',lambda m:chr(int(m.group(1),16)),value))
 return any(m in value for m in markers)


def guarded_context(browser,base,seed,width,markers):
 context=browser.new_context(viewport={'width':width,'height':900},has_touch=width<600,is_mobile=width<600);state={'bad':[],'errors':[],'calls':[],'patch':None,'expected':None}
 context.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(packed(seed))+');Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw Error("Controlled clipboard denial")}}});')
 def intercept(route):
  req=route.request;parts=urllib.parse.urlsplit(req.url);origin=urllib.parse.urlsplit(base)
  if len(req.url)>16384 or (parts.scheme,parts.netloc)!=(origin.scheme,origin.netloc) or any(private_text(s,markers) for s in [req.url,req.post_data or '',*req.headers.keys(),*req.headers.values()]):state['bad'].append('EXTERNAL_OR_PRIVATE');route.abort();return
  if req.method=='POST' and req.url.endswith('/mcp'):
   message=req.post_data_json or {};cmd=message.get('params',{});state['calls'].append(copy.deepcopy(cmd))
   if cmd.get('name')=='get_translation' and state['patch'] is not None:
    response=route.fetch();payload=response.json();result=payload['result'];require(not result.get('isError'),'GENUINE_NATIVE_TAMPER_BASELINE_REFUSED');genuine=result['structuredContent'];expected=state['expected'];require(expected is not None and genuine['text_id']==expected['id'] and sha(genuine['text'])==expected['body_sha256'],'TAMPER_ONLY_GENUINE_CHECKED_BODY');changed=copy.deepcopy(genuine);changed.update(state['patch']);result['structuredContent']=changed
    for part in result.get('content',[]):
     if part.get('type')=='text':part['text']=packed(changed)
    route.fulfill(response=response,json=payload);return
  route.continue_()
 context.route('**/*',intercept)
 def page():
  p=context.new_page();p.set_default_timeout(15000);p.on('pageerror',lambda _:state['errors'].append('PAGE_ERROR'));return p
 return context,page,state


def audit_state(state):require(not state['bad'] and not state['errors'],'BROWSER_PRIVATE_OR_SCRIPT_ERROR')


def saved(page,entry):
 page.goto(entry+'#saved');page.get_by_role('heading',name='Saved passages',exact=True).wait_for();page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')


def native_ready(page,root):
 uid=root[0]['ref'].rsplit('/',1)[0];page.wait_for_function("uid=>location.hash.startsWith('#read?')&&new URLSearchParams(location.hash.slice(6)).get('uid')===uid",arg=uid);selected=fields(page.url);offset=int(selected.get('offset','0'));require(0<=offset<len(root),'NATIVE_EXPECTED_ROUTE_OFFSET');expected_ref=root[offset]['ref'];require(not selected.get('ref') or selected['ref']==expected_ref,'NATIVE_EXPECTED_SOURCE_ROUTE_REF');expect(page.locator('.segment-label a').first).to_have_text(expected_ref);expect(page.locator('section[aria-label="Pāli passage"]')).to_be_visible();page.locator('#status').filter(has_text='Opening').wait_for(state='hidden');actual_refs=page.locator('.segment-label a').all_text_contents();require(bool(actual_refs),'NATIVE_PALI_NOT_EMPTY');expected_page=root[offset:offset+30];require(actual_refs==[s['ref'] for s in expected_page],'NATIVE_COMPLETE_ORDERED_SOURCE_SLICE_NO_SKIP_DUPLICATE');by={s['ref']:s for s in root};actual_words=page.locator('.passage').all_text_contents();require(len(actual_refs)==len(actual_words),'NATIVE_PALI_REF_COUNT')
 for ref,text in zip(actual_refs,actual_words,strict=True):require(ref in by and by[ref]['text']==text,'NATIVE_INDEPENDENT_PALI_WORDS')


def native_go(page,destination,root,action=None):
 # Attach before the existing navigation; same UID/ref is not proof of a new render.
 uid=root[0]['ref'].rsplit('/',1)[0]
 def desired(response):
  if response.request.method!='POST' or not response.url.endswith('/mcp'):return False
  cmd=(response.request.post_data_json or {}).get('params',{});return cmd.get('name')=='get_text' and cmd.get('arguments',{}).get('uid')==uid
 with page.expect_response(desired,timeout=15000) as pending:
  if action is not None:action()
  elif page.url==destination:page.reload()
  else:page.goto(destination)
 response=pending.value;response.finished();result=response.json()['result'];require(not result.get('isError'),'NATIVE_CURRENT_SOURCE_READ_REFUSED');data=result['structuredContent'];require(data['text_id']==uid and data['source']['commit']==VRI and data['source'].get('locator_revision',VRI)==root[0]['expected_source_pin'],'NATIVE_RESPONSE_EXACT_CURRENT_OWNER_AND_PIN');offset=data['offset'];selected=fields(page.url);require(type(offset)is int and offset==int(selected.get('offset','0')) and 0<=offset<len(root),'NATIVE_RESPONSE_EXACT_OFFSET');require(data['limit']==30 and type(data['limit'])is int and data['returned']==len(root[offset:offset+30]) and data['total_segments']==len(root),'NATIVE_RESPONSE_COMPLETE_SOURCE_PAGE_COUNTS');segments(data['segments'],root[offset:offset+30]);native_ready(page,root)


def native_choose(page,entry,row,profile,root,state):
 native_go(page,entry+'#read?uid='+row['id'],root);before=sum(x.get('name')=='get_translation' for x in state['calls']);read_tool(page,'English sources').click();card=page.locator('#study .translation-choice').filter(has_text=profile['reference']);expect(card).to_have_count(1);require(sum(x.get('name')=='get_translation' for x in state['calls'])==before,'SOURCE_PICKER_FETCHED_BEFORE_CONSENT');card.get_by_role('button').filter(has_text='Read source ·').click()


def native_english(page,row,normalized):
 expect(page.locator('#study > .translation')).to_be_visible();require(sha(page.locator('#study > .translation').text_content())==row['body_sha256'],'NATIVE_COMPLETE_SOURCE_BODY');region=page.get_by_role('region',name='Translator’s notes',exact=True);expect(region).to_have_count(int(bool(row['note_count'])));got=[]
 if row['note_count']:
  for li in region.locator('li').all():got.append({'number':int(li.get_attribute('value')),'text':li.locator('p').text_content()})
 require(sha(packed(got))==row['notes_sha256'],'NATIVE_EVERY_ORDERED_POEM_NOTE');summary=page.get_by_role('region',name='Canonical chapter summary · not poem text',exact=True);expect(summary).to_have_count(int(bool(row['summary'])))
 if row['summary']:require(sha(summary.locator('.translation').text_content())==row['summary']['body_sha256'] and summary.locator('li').count()==0,'NATIVE_OWNED_NOTE_FREE_SUMMARY')
 preface=page.locator('#study > section').filter(has=page.get_by_role('heading',name='Publisher preface · editorial, not poem text',exact=True));expect(preface).to_have_count(int(bool(row['paratext'])))
 if row['paratext']:require(sha(preface.locator('.translation').text_content())==row['paratext_sha256'] and preface.locator('li').count()==0,'NATIVE_341_NOTE_FREE_PARATEXT')
 require('CC BY-NC-SA 4.0' in page.locator('#study').text_content() and 'Whole reviewed poem' in page.locator('#study').text_content(),'NATIVE_RIGHTS_EDITION_SCOPE');require(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'NATIVE_HORIZONTAL_OVERFLOW')


def explicit_saved(page,entry,row,unit,root,c,state,stage,tag):
 old=c['_seed']['saved'];chosen=next(s for s in root if s['type']=='verse' and not any(x['uid']==row['id'] and x['ref']==s['ref'] for x in old));native_go(page,entry+'#read?uid='+row['id'],root);require(chosen['offset']<30,'SAVED_WITNESS_ON_ORDINARY_FIRST_PAGE');page.get_by_role('button',name='Save passage '+chosen['ref'],exact=True).click();expected={'uid':row['id'],'ref':chosen['ref'],'title':unit['title'],'note':'','offset':chosen['offset'],'source_commit':c['_pins'][row['id']]};page.wait_for_function('(x)=>JSON.parse(localStorage.getItem(x.key)||"{}").saved?.length===x.n',arg={'key':KEY,'n':len(old)+1});semantic(profile(page)['saved'],old+[expected],'SAVED_NEW_REFERENCE_EXACT_WITH_ALL_OLD_PRESERVED');saved(page,entry);page.get_by_label('Search saved passages and notes',exact=True).fill(chosen['ref']);region=page.get_by_role('region',name='Saved passage results');expect(region.locator('article.segment')).to_have_count(1);field=region.get_by_label('Your personal note',exact=True);expect(field).to_have_count(1);note=PRIVATE+' current '+row['id'];field.fill(note);region.get_by_role('button',name='Save note',exact=True).click();expected['note']=note;semantic(profile(page)['saved'],old+[expected],'NEW_NOTE_PERSISTED_OLD_RECORDS_UNCHANGED');draft=PRIVATE+' unsaved export '+row['id'];field.fill(draft);page.wait_for_function('(x)=>(sessionStorage.getItem(x.key)||"").includes(x.marker)',arg={'key':DRAFT,'marker':CANARY});journal=page.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')');stored=page.evaluate('localStorage.getItem('+json.dumps(KEY)+')');expected_export={'format':KEY,'saved':old+[{**expected,'note':draft}]}
 with page.expect_download() as pending:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
 raw=Path(pending.value.path()).read_bytes();require(raw==json.dumps(expected_export,ensure_ascii=False,indent=2).encode(),'EXACT_SYNTHETIC_UTF8_EXPORT_INCLUDING_UNSAVED_DRAFT');require(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')')==stored,'EXPORT_DID_NOT_SILENTLY_SAVE_DRAFT');p=stage/('synthetic-'+tag+'.json')
 with p.open('xb') as f:f.write(raw)
 new,make,ns=guarded_context(c['_browser'],c['_base'],{'theme':'light','remember_position':False,'saved':[],'reading_progress':[]},1280,c['private_markers'])
 try:
  target=make();saved(target,entry);target.get_by_label('Restore bookmarks and notes from a JSON export',exact=True).set_input_files(str(p));target.get_by_role('button',name='Cancel import',exact=True).click();require(profile(target).get('saved',[])==[],'CANCEL_IMPORT_INERT');target.get_by_label('Restore bookmarks and notes from a JSON export',exact=True).set_input_files(str(p));target.get_by_role('button',name='Add '+str(len(old)+1)+' new bookmarks',exact=True).click();target.wait_for_function('(x)=>JSON.parse(localStorage.getItem(x.key)||"{}").saved?.length===x.n',arg={'key':KEY,'n':len(old)+1});semantic(profile(target)['saved'],expected_export['saved'],'RESTORE_STRICT_VALUES_TYPES_ARRAY_ORDER_NO_REPINS');audit_state(ns)
 finally:new.close()
 page.reload();page.get_by_label('Search saved passages and notes',exact=True).fill(chosen['ref']);expect(page.get_by_label('Your personal note',exact=True)).to_have_value(draft);require(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')')==stored and page.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')')==journal,'RELOAD_EXACT_LOCAL_DATA_AND_TAB_DRAFT');region=page.get_by_role('region',name='Saved passage results');link=region.get_by_role('link',name=unit['title']+' · '+chosen['ref'],exact=True);require(fields(link.get_attribute('href')).get('source')==c['_pins'][row['id']],'SAVED_LINK_EXACT_EFFECTIVE_PIN');native_go(page,None,root,action=link.click);require(page.locator('.segment-label a').first.text_content()==chosen['ref'] and page.locator('.passage').first.text_content()==chosen['text'],'SAVED_CURRENT_CITATION_REOPENS_EXACT_WORDS');button=page.get_by_role('button',name='Study words in '+chosen['ref'],exact=True);button.click();expect(page.locator('#study').get_by_role('heading',name='Word study · dictionary reference',exact=True)).to_be_visible();word_calls=[x for x in state['calls'] if x.get('name')=='analyse_passage'];require(bool(word_calls) and word_calls[-1]['arguments']['uid']==row['id'] and word_calls[-1]['arguments']['segment']==chosen['ref'] and word_calls[-1]['arguments'].get('source_commit',VRI)==c['_pins'][row['id']],'NATIVE_STUDY_EXACT_SELECTED_SOURCE_PIN');require(chosen['ref'] in page.locator('#study').text_content(),'WORD_STUDY_SELECTED_REF_DISCLOSED');audit_state(state);count('native_saved');count('native_word_study')


def native_cell(browser,client,row,source_profile,root,unit,c,cell,stage):
 entry=client.base+cell['entry'];context,make,state=guarded_context(browser,client.base,c['_seed'],cell['width'],c['private_markers']);page=make();tag=cell['entry'].replace('/','root')+'-'+str(cell['width'])+'-'+row['id']
 try:
  page.goto(entry);library=page.get_by_role('link',name='Library',exact=True);library.tap()if cell['width']<600 else library.click();page.locator('#view a.entry[href="#browse?node=ap"]').click();page.locator('#view a.entry[href^="#read?uid="]').first.wait_for();before=page.evaluate('localStorage.getItem('+json.dumps(KEY)+')');saved(page,entry);oldfield=page.get_by_label('Your personal note',exact=True).first;oldfield.fill(PRIVATE+' retained draft');page.wait_for_function('(x)=>(sessionStorage.getItem(x.key)||"").includes(x.marker)',arg={'key':DRAFT,'marker':CANARY});journal=page.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')');oldstored=page.evaluate('localStorage.getItem('+json.dumps(KEY)+')')
  # Ordinary global title search: only the independently known owner/pin is accepted.
  query=page.locator('#query');
  if not query.is_visible():page.locator('#find-panel > summary').click()
  query.fill(unit['title']);page.locator('#search-form button').click();page.get_by_role('heading',name='Results for “'+unit['title']+'”',exact=True).wait_for();links=page.locator('#view a.entry').filter(has=page.locator('strong',has_text=unit['title']));candidates=[]
  for link in links.all():
   href=link.get_attribute('href') or ''
   try:f=fields(href)
   except (ValueError,IndexError):continue
   if f.get('uid')==row['id'] and not ('source'in f and 'page_source'in f) and (f.get('source') or f.get('page_source'))==c['_pins'][row['id']]:candidates.append(link)
  require(bool(candidates),'SOURCE_EXPECTED_SEARCH_OWNER_WITHIN_EXISTING_15_CAP');native_go(page,None,root,action=candidates[0].click);require(not any(x.get('name')=='get_translation' for x in state['calls']),'SEARCH_AND_PALI_NO_ENGLISH_FETCH')
  # Actual edition selector is independently ordered, including all retained choices.
  # Opening the existing tools disclosure does not invoke its English source button.
  read_tool(page,'English sources');navigation=page.get_by_role('region',name='Reviewed publisher edition navigation',exact=True);expect(navigation).to_have_count(1);details=navigation.locator('details');expect(details).to_have_count(1)
  if details.get_attribute('open') is None:details.locator(':scope > summary').click()
  picker=navigation.get_by_role('combobox');diagnostics=report.setdefault('selector_diagnostics',[]);require(len(diagnostics)<len(c['native_cells']),'SELECTOR_DIAGNOSTIC_BOUND');diagnostic={'id':row['id'],'entry':cell['entry'],'width':cell['width'],'combobox_count':picker.count(),'expected_option_count':len(c['_navigation']['edition_ids']),'option_count':None,'first_mismatch':None};diagnostics.append(diagnostic);require(diagnostic['combobox_count']==1,'EDITION_SELECTOR_SINGLE_CONTROL');picker.wait_for(state='visible');diagnostic['option_count']=picker.locator('option').count();require(diagnostic['option_count']<=1000,'EDITION_SELECTOR_OPTION_BOUND');actual_ids=picker.locator('option').evaluate_all('xs=>xs.map(x=>x.value)');wanted_ids=c['_navigation']['edition_ids'];difference=next((i for i in range(max(len(actual_ids),len(wanted_ids))) if i>=len(actual_ids) or i>=len(wanted_ids) or actual_ids[i]!=wanted_ids[i]),None)
  if difference is not None:
   safe_id=lambda xs,i:xs[i] if i<len(xs) and isinstance(xs[i],str) and re.fullmatch(r'tha-ap[1-9][0-9]{0,3}',xs[i]) else ('ABSENT' if i>=len(xs) else 'INVALID_ID');diagnostic['first_mismatch']={'index':difference,'actual':safe_id(actual_ids,difference),'expected':safe_id(wanted_ids,difference)}
  require(actual_ids==wanted_ids,'FULL_REVIEWED_EDITION_SELECTOR_IDS_ORDER');require(picker.input_value()==row['id'],'SELECTOR_CURRENT_OWNER')
  neighbor=next(uid for uid in c['approved_ids'] if uid!=row['id']) if len(c['approved_ids'])>1 else c['foreign_source']['id'];picker.select_option(neighbor);native_go(page,None,c['_roots'].get(neighbor) or render(c['_canon'],c['_units'][neighbor]),action=navigation.get_by_role('button',name='Open reviewed poem',exact=True).click);require(fields(page.url).get('uid')==neighbor,'EDITION_SELECTOR_ORDINARY_NAVIGATION_EXACT_OWNER');require(not any(x.get('name')=='get_translation' for x in state['calls']),'EDITION_SELECTOR_NO_ENGLISH_BEFORE_CHOICE')
  native_choose(page,entry,row,source_profile,root,state);native_english(page,row,c['_verified_mutation_baselines'][row['id']]);dom_source_notices(page.locator('#study'),page.locator('#study > .provenance'),row);calls=[x for x in state['calls'] if x.get('name')=='get_translation'];require(len(calls)==1 and calls[0]['arguments']=={'uid':row['id'],'translation':c['_versions'][row['id']],'limit':6000,'translation_revision':REV},'EXACT_EXPLICIT_NATIVE_SOURCE_COMMAND');require(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')')==oldstored and page.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')')==journal,'SOURCE_VIEW_PRESERVES_ALL_PRIVATE_BYTES');displayed_ref=page.locator('.segment-label a').first.text_content();displayed_source=next(s for s in root if s['ref']==displayed_ref);read_tool(page,'Copy reading link').click();fallback=page.get_by_role('link',name='Exact reading link · open or long-press to copy',exact=True);expect(fallback).to_be_visible();copied=fallback.get_attribute('href');f=fields(copied);require(f.get('uid')==row['id'] and f.get('source')==c['_pins'][row['id']] and f.get('ref')==displayed_ref and f.get('offset')==str(displayed_source['offset']),'EXACT_CURRENT_CITATION_COPY');prior=len(calls);native_go(page,copied,root);require(page.locator('.segment-label a').first.text_content()==displayed_ref and page.locator('.passage').first.text_content()==displayed_source['text'],'COPIED_CITATION_REOPEN_EXACT_DISPLAYED_PASSAGE');native_go(page,None,root,action=page.reload);require(page.locator('.segment-label a').first.text_content()==displayed_ref and page.locator('.passage').first.text_content()==displayed_source['text'],'COPIED_CITATION_RELOAD_EXACT_DISPLAYED_PASSAGE');require(sum(x.get('name')=='get_translation' for x in state['calls'])==prior,'RELOAD_REQUIRES_EXPLICIT_ENGLISH_CHOICE');require(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')')==oldstored and page.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')')==journal,'CITATION_RELOAD_NO_PRIVATE_REWRITE')
  # Remove this intentionally unsaved old-note edit by explicit Save in its own Saved field.
  # This is synthetic fixture setup within a fresh context; no implicit discard/migration.
  saved(page,entry);page.get_by_label('Search saved passages and notes',exact=True).fill(c['_seed']['saved'][0]['ref']);region=page.get_by_role('region',name='Saved passage results');oldtarget=region.locator('article.segment').filter(has=page.get_by_role('link',name=c['_seed']['saved'][0]['title']+' · '+c['_seed']['saved'][0]['ref'],exact=True));expect(oldtarget).to_have_count(1);oldtarget.get_by_label('Your personal note',exact=True).fill(c['_seed']['saved'][0]['note']);oldtarget.get_by_role('button',name='Save note',exact=True).click();semantic(profile(page)['saved'],c['_seed']['saved'],'EXPLICIT_SYNTHETIC_OLD_NOTE_RESTORED_WITHOUT_REPIN');explicit_saved(page,entry,row,unit,root,c,state,stage,tag);audit_state(state);optional_a11y(page,c,cell);count('native_cells');report['checks'].append({'family':'actual native source/search/Saved/citation/consent','id':row['id'],'entry':cell['entry'],'width':cell['width'],'poem_notes':row['note_count'],'physical_device':False,'touch_context_emulated':cell['width']<600})
 finally:context.close()


def catalogue_ui(browser,client,c,entry_path,width,canon):
 context,make,state=guarded_context(browser,client.base,c['_seed'],width,c['private_markers']);p=make();entry=client.base+entry_path
 try:
  p.goto(entry+'#browse?node=canon');p.get_by_role('link',name='Find English sources',exact=True).click();p.get_by_role('heading',name='Find English sources',exact=True).wait_for();p.get_by_label('Collection',exact=True).select_option('ap');p.get_by_role('button',name='Apply',exact=True).click();expect(p.locator('.english-catalogue-count')).to_have_text(str(len(c['_navigation']['ap_catalogue_ids']))+' matching indexed records');p.locator('#status').filter(has_text='Opening').wait_for(state='hidden');expected=c['_navigation']['ap_catalogue_ids'][:40];actual=[fields(x.get_attribute('href'))['uid'] for x in p.locator('.cards a.entry').all()];require(actual==expected,'NATIVE_ENGLISH_AVAILABILITY_FIRST_PAGE_INDEPENDENT_IDS');require(not any(x.get('name')=='get_translation' for x in state['calls']),'CATALOGUE_NO_AUTOMATIC_ENGLISH');audit_state(state);count('native_catalogue_cells')
 finally:context.close()


def widget_positive(frame,row):
 expect(frame.locator('#english > div.en')).to_be_visible();require(sha(frame.locator('#english > div.en').text_content())==row['body_sha256'],'HOST_COMPLETE_BODY');actual=[{'number':int(n.get_attribute('value')),'text':n.text_content()} for n in frame.locator('#english > ol > li').all()];require(sha(packed(actual))==row['notes_sha256'],'HOST_ALL_OWNED_NOTES');regions=frame.get_by_role('region',name='Canonical chapter summary · not poem text',exact=True);expect(regions).to_have_count(int(bool(row['summary'])))
 if row['summary']:require(sha(regions.locator('p.en').text_content())==row['summary']['body_sha256'] and regions.locator('li').count()==0,'HOST_SEPARATE_SUMMARY')
 heading=frame.get_by_role('heading',name='Publisher preface · editorial, not poem text',exact=True);expect(heading).to_have_count(int(bool(row['paratext'])))
 if row['paratext']:require(sha(heading.locator('xpath=following-sibling::p[1]').text_content())==row['paratext_sha256'],'HOST_SEPARATE_PARATEXT')


def host_cases(browser,c,widgets,html):
 for bridge in ('MCP Apps','Apps SDK'):
  page=browser.new_page(viewport={'width':390,'height':900});page.set_default_timeout(15000);bad=[];errors=[];page.route('**/*',lambda r:(bad.append('HOST_NETWORK'),r.abort()));page.on('pageerror',lambda _:errors.append('HOST_SCRIPT'))
  try:
   if bridge=='MCP Apps':
    page.set_content('<iframe id="reader" style="width:100%;height:850px;border:0"></iframe>');page.evaluate("""html=>{window.messages=[];const f=document.querySelector('iframe');window.addEventListener('message',e=>{window.messages.push(e.data);if(e.data.method==='ui/initialize')f.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{hostContext:{theme:'light'},hostCapabilities:{serverTools:{},openLinks:{},updateModelContext:{structuredContent:{}}}}},'*');if(e.data.method==='ui/update-model-context')f.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{}},'*')});f.srcdoc=html}""",html);page.wait_for_function("window.messages.some(x=>x.method==='ui/notifications/initialized')");frame=page.frames[1];frame.evaluate("()=>{window.__received=null;window.addEventListener('message',e=>{if(e.source===window.parent&&e.data?.method==='ui/notifications/tool-result')window.__received=e.data.params.structuredContent},true)}")
    def send(data):page.evaluate("d=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:d}},'*')",data)
   else:
    page.evaluate("window.openai={theme:'light',setWidgetState(){},openExternal(){},callTool(){throw Error('Unexpected host tool')}}");page.set_content(html);frame=page.main_frame
    def send(data):page.evaluate("d=>{window.openai.toolOutput=d;window.dispatchEvent(new Event('openai:set_globals'))}",data)
   for row in c['_rows']:
    uid=row['id'];data=widgets[uid];mutations=[(['english','translation_revision'],'0'*40),(['english','text'],('Y' if c['_verified_mutation_baselines'][uid]['body'][0]=='X' else 'X')+c['_verified_mutation_baselines'][uid]['body'][1:]),(['english','root_sha256'],c['_foreign_root_sha256']),(['english','translator_notes',0,'text'],c['_verified_mutation_baselines'][uid]['translator_notes'][0]['text']+'\nSYNTHETIC_SOURCE_NOTE_DRIFT_EN16'),(['english','translation_id'],c['foreign_source']['translation_id']),(['english','publisher_paratext'],('X'+data['english']['publisher_paratext'][1:])if data['english']['publisher_paratext']else' ')]
    for path,value in mutations:
     send(data);widget_positive(frame,row);dom_source_notices(frame.locator('#english'),frame.locator('#footer'),row);identity=frame.evaluate("""bridge=>{const x=bridge==='Apps SDK'?window.openai.toolOutput:window.__received;window.__same=x;if(!x)throw Error('No consumed object');if(bridge==='Apps SDK')window.dispatchEvent(new Event('openai:set_globals'));else window.dispatchEvent(new MessageEvent('message',{source:window.parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:x}}}));return x===window.__same}""",bridge);require(identity is True,'UNCHANGED_SAME_OBJECT_POSITIVE');widget_positive(frame,row);dom_source_notices(frame.locator('#english'),frame.locator('#footer'),row)
     identity=frame.evaluate("""a=>{const x=a.bridge==='Apps SDK'?window.openai.toolOutput:window.__received;window.__same=x;let target=x;for(const key of a.path.slice(0,-1))target=target[key];target[a.path.at(-1)]=a.value;if(a.bridge==='Apps SDK')window.dispatchEvent(new Event('openai:set_globals'));else window.dispatchEvent(new MessageEvent('message',{source:window.parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:x}}}));return x===window.__same}""",{'bridge':bridge,'path':path,'value':value});require(identity is True,'IN_PLACE_RECEIVER_OBJECT_MUTATED');expect(frame.locator('#english .en')).to_have_count(0);actual=frame.locator('#pali .seg').evaluate_all("ns=>ns.map(n=>[...n.childNodes].filter(c=>c.nodeType===3).map(c=>c.textContent).join(''))");require(actual==[s['text'] for s in data['pali']['segments']],'HOST_ENGLISH_REFUSAL_RETAINS_CURRENT_PALI');send(data);widget_positive(frame,row);dom_source_notices(frame.locator('#english'),frame.locator('#footer'),row);count('host_stale_cases')
    if uid=='tha-ap374':
     send(data);widget_positive(frame,row);dom_source_notices(frame.locator('#english'),frame.locator('#footer'),row);frame.evaluate("""bridge=>{const x=bridge==='Apps SDK'?window.openai.toolOutput:window.__received;x.source.locator_revision='2d134ff9ef60f70a1eb03c9370580228811a3070';if(bridge==='Apps SDK')window.dispatchEvent(new Event('openai:set_globals'));else window.dispatchEvent(new MessageEvent('message',{source:window.parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:x}}}))}""",bridge);expect(frame.locator('#pali .seg')).to_have_count(0);expect(frame.locator('#english .en')).to_have_count(0);send(data);widget_positive(frame,row);dom_source_notices(frame.locator('#english'),frame.locator('#footer'),row);count('host_canonical_stale_cases')
    count('host_cells')
   for i,row in enumerate(c['_rows']):
    current=widgets[row['id']];following_row=c['_rows'][(i+1)%len(c['_rows'])];following=widgets[following_row['id']];send(current);widget_positive(frame,row);dom_source_notices(frame.locator('#english'),frame.locator('#footer'),row)
    same=frame.evaluate("""a=>{const x=a.bridge==='Apps SDK'?window.openai.toolOutput:window.__received;window.__same=x;for(const key of Object.keys(x))delete x[key];Object.assign(x,a.next);if(a.bridge==='Apps SDK')window.dispatchEvent(new Event('openai:set_globals'));else window.dispatchEvent(new MessageEvent('message',{source:window.parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:x}}}));return x===window.__same}""",{'bridge':bridge,'next':following});require(same is True,'VALID_CHANGED_OWNER_SAME_OBJECT');widget_positive(frame,following_row);dom_source_notices(frame.locator('#english'),frame.locator('#footer'),following_row);count('host_valid_owner_transitions')
   legacy=c['_legacy_widget'];send(legacy);expect(frame.locator('#pali .seg').first).to_be_visible();require(legacy['pali']['segments'][0]['text'] in frame.locator('#pali').text_content(),'GENUINE_OLD_PIN_SOURCE_BEFORE_NEGATIVE')
   frame.evaluate("""bridge=>{const x=bridge==='Apps SDK'?window.openai.toolOutput:window.__received;x.source.locator_revision='2d134ff9ef60f70a1eb03c9370580228811a3070';if(bridge==='Apps SDK')window.dispatchEvent(new Event('openai:set_globals'));else window.dispatchEvent(new MessageEvent('message',{source:window.parent,data:{jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:x}}}))}""",bridge);expect(frame.locator('#pali .seg')).to_have_count(0);expect(frame.locator('#english .en')).to_have_count(0);count('host_canonical_stale_cases')
   held=copy.deepcopy(c['_held_widget']);held['english']=copy.deepcopy(widgets[c['_rows'][0]['id']]['english']);send(held);expect(frame.locator('#english .en')).to_have_count(0);require(held['pali']['segments'][0]['text'] in frame.locator('#pali').text_content(),'HELD_ENGLISH_REFUSAL_KEEPS_ORIGINAL_PALI');count('host_held_refusals')
   require(not bad and not errors,'HOST_NETWORK_OR_SCRIPT_ERROR')
  finally:page.close()


def api_cases(client,c,canon,units,roots):
 metadata={};widgets={};whole={};source=client.data
 # Pure discovery first: every new source and all English availability metadata precede fixture reads.
 for row in c['_rows']:
  uid=row['id'];p=c['_profiles'][uid];d=source('get_text',{'uid':uid,'limit':200,'variants':'none'});require(d['source']['commit']==VRI and d['source'].get('locator_revision',VRI)==c['_pins'][uid],'CURRENT_ROOT_COMMIT_AND_MAPPING_PIN');segments(d['segments'],roots[uid]);require(d['next_offset'] is None,'COMPLETE_CURRENT_ROOT_UNIT');choices=[x for x in d['english_available'] if x['translation_id']==c['_versions'][uid]];require(len(choices)==1 and choices[0]['translation_revision']==REV and choices[0]['reference']==p['reference'],'EXACT_DISCOVERY_SOURCE_VERSION_REFERENCE');metadata[uid]=d;count('api_metadata_sources')
 expected_ids=c['_navigation']['ap_catalogue_ids'];got=[];at=0
 while True:
  d=source('browse_canon',{'node':'english','availability':'linked','collection':'ap','offset':at,'limit':200});got.extend(x['id'] for x in d['items']);require(d['total']==len(expected_ids) and len(got)<=len(expected_ids),'FINITE_ENGLISH_CATALOGUE_COUNT');next_offset=d['next_offset']
  if next_offset is None:break
  require(type(next_offset) is int and next_offset==at+200,'CATALOGUE_EXACT_CURSOR');at=next_offset
 require(got==expected_ids,'ALL_ENGLISH_AVAILABILITY_IDS_ORDER');count('api_catalogue')
 # Closed older namespace controls remain independent of newly retrieved English.
 for uid in c['compatibility_ids']:
  unit=units[uid];pin=VRI+'-'+unit['index_revision'];d=source('get_text',{'uid':uid,'limit':200});require(d['source']['locator_revision']==pin,'EARLIER_NAMESPACE_PRESERVED');segments(d['segments'],render(canon,unit))
  for bad in (None,VRI,VRI+'-apadana-thera-next10-v99'):
   for name,args in [('get_text',{'uid':uid,'offset':0,'limit':1}),('read_passage_widget',{'uid':uid,'segment':uid+'/1','english':False})]:
    if bad:args['source_commit']=bad
    result=client.rpc(name,args);require(result.get('isError') is True,'OLD_POSITION_REFUSED_BEFORE_WORDS');payload=result.get('structuredContent') or {};require(not any(k in payload for k in ['pali','segments','segment','words']),'REFUSAL_NO_SOURCE_PAYLOAD');count('compatibility_refusals')
 # Metadata and Pali must not trigger a fixture fetch.
 ledger=Path(report['epochs'][-1]['ledger']);require(not any(json.loads(x)['kind']=='fixture-read' for x in ledger.read_text().splitlines()),'DISCOVERY_FETCHED_ENGLISH')
 for row in c['_rows']:
  uid=row['id'];p=c['_profiles'][uid];version=c['_versions'][uid];d=source('get_translation',{'uid':uid,'translation':version,'translation_revision':REV,'limit':6000});whole_payload(d,row,p,version);whole[uid]=d;c['_verified_mutation_baselines'][uid]={'body':d['text'],'translator_notes':d['translator_notes'],'paratext':d['publisher_paratext']};count('api_full_sources');widgets[uid]=source('read_passage_widget',{'uid':uid,'translation':version,'english_translation_revision':REV,'limit':80});w=widgets[uid];require(w['text_id']==uid and w['source']['commit']==VRI and w['source'].get('locator_revision',VRI)==c['_pins'][uid],'WIDGET_EXACT_ROOT_SOURCE');segments(w['pali']['segments'],roots[uid]);whole_widget_payload(w,row,p,version,c['_pins'][uid])
  # Source-derived query word and physical block witnesses, never SUT search output as oracle.
  q=c['_queries'][uid];d=source('search_texts',{'query':'"'+q['query']+'"','collection':uid,'english':'off','limit':5});require(len(d['results'])==1 and d['results'][0]['id']==uid,'SCOPED_SOURCE_QUERY_OWNER');hit=d['results'][0];args=hit['read_with'];require(args['tool']=='get_text' and args['uid']==uid and args.get('source_commit',VRI)==c['_pins'][uid],'SOURCE_SEARCH_COMMAND_PIN');offset=args['offset'];expected=roots[uid][offset];require(hit['segment_ref']==expected['ref'] and any(expected['source_blocks'][0]<=i<expected['source_blocks'][1] for i in q['source_text_occurrence_blocks']),'SEARCH_HIT_LITERAL_SOURCE_BLOCK_PROVENANCE');read=source('get_text',{k:v for k,v in args.items() if k!='tool'});segments(read['segments'],[expected]);count('api_search_sources')
  quote=c['_quotes'][uid][0];d=source('verify_quote',{'text':quote,'language':'english','texts':[uid],'translation_ids':[version],'limit':5});scope=d['scope'];require(scope['complete_source_versions_compared']==1 and scope['source_versions_not_compared']==0,'QUOTE_COMPLETE_EXACT_VERSION_SCOPE');require(any(x['text_id']==uid and x['translation_id']==version and x['translation_revision']==REV for x in d['matches']),'PRESEALED_POEM_VERSE_QUOTE_FOUND_IN_OWN_SOURCE');require(scope['translations_checked'][0]['translation_id']==version,'QUOTE_NO_CROSS_SOURCE_SUBSTITUTION');count('api_quote_sources')
 for pub in c['pagination_publishers']:
  row=next(r for r in c['_rows'] if r['publisher']==pub);version=c['_versions'][row['id']];prior='';command={'uid':row['id'],'translation':version,'translation_revision':REV,'limit':500};total=math.ceil(row['body_characters_utf16']/500)
  for i in range(total):
   d=source('get_translation',command);require(d['body_sha256']==row['body_sha256'] and d['notes_sha256']==row['notes_sha256'],'PAGINATION_REGISTERED_BODY_NOTE_IDENTITY');prior,following=continuation_page(d,row,version,utf16(prior),500,prior,row['pages'][i]);count('api_pagination_pages')
   if i+1<total:require(following is not None,'NO_EARLY_PAGINATION_END');command=following['arguments']
   else:require(following is None,'EXACT_COMPLETE_PAGINATION_END')
  require(prior==c['_verified_mutation_baselines'][row['id']]['body'],'PAGINATION_UNCHANGED_SOURCE_WORDS');bad={'uid':row['id'],'translation':version,'translation_revision':'0'*40,'limit':500};require(client.rpc('get_translation',bad).get('isError') is True,'STALE_ENGLISH_REVISION_REFUSED');bad={'uid':row['id'],'translation':version,'translation_revision':REV,'offset':500,'limit':500,'prefix_sha256':'0'*64};require(client.rpc('get_translation',bad).get('isError') is True,'WRONG_SOURCE_PREFIX_REFUSED');count('pagination_negative_cases',2)
 before=sum(json.loads(line)['kind']=='fixture-read'for line in ledger.read_text().splitlines());result=client.rpc('get_translation',{'uid':'tha-ap360','translation':'ap:chapter-3/poem-358','translation_revision':REV,'limit':6000});require(result.get('isError')is True,'HELD_TRANSLATION_REFUSES_BEFORE_PROVIDER');count('held_API_refusals')
 held=source('read_passage_widget',{'uid':'tha-ap360','translation':'ap:chapter-3/poem-358','english_translation_revision':REV,'limit':80});require(held['text_id']=='tha-ap360' and held['english']is None and bool(held['english_error']),'HELD_WIDGET_ENGLISH_UNAVAILABLE');segments(held['pali']['segments'],roots['tha-ap360']);c['_held_widget']=held;count('held_API_refusals');result=client.rpc('verify_quote',{'text':c['_quotes'][c['_rows'][0]['id']][0],'language':'english','texts':['tha-ap360'],'translation_ids':['ap:chapter-3/poem-358'],'limit':5});require(result.get('isError')is True,'HELD_QUOTE_SOURCE_REFUSED');count('held_API_refusals');require(sum(json.loads(line)['kind']=='fixture-read'for line in ledger.read_text().splitlines())==before,'HELD_SOURCE_MUST_NOT_REACH_PROVIDER')
 legacy=source('read_passage_widget',{'uid':'tha-ap348','english':False,'limit':80});require(legacy['source']['locator_revision']==VRI+'-apadana-thera-next10-v1','OLD_CURRENT_PIN_REMAINS_EXACT');segments(legacy['pali']['segments'],roots['tha-ap348']);c['_legacy_widget']=legacy
 return metadata,whole,widgets


def native_legacy_refusals(browser,client,c,roots):
 context,make,state=guarded_context(browser,client.base,c['_seed'],390,c['private_markers']);p=make();entry=client.base+'/reader'
 try:
  for uid in ('tha-ap348','tha-ap349'):
   item=next(x for x in c['_seed']['saved'] if x['uid']==uid);saved(p,entry);p.get_by_label('Search saved passages and notes',exact=True).fill(item['ref']);before=p.evaluate('localStorage.getItem('+json.dumps(KEY)+')');p.get_by_role('region',name='Saved passage results').get_by_role('link',name=item['title']+' · '+item['ref'],exact=True).click();expect(p.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible();expect(p.locator('.passage')).to_have_count(0);expect(p.locator('#view textarea')).to_have_count(0);reopen=p.get_by_role('link',name='Reopen whole current text · saved references stay unchanged',exact=True);require(reopen.get_attribute('href')=='#read?uid='+uid,'OLD_SAVED_REF_WHOLE_REOPEN_ONLY');native_go(p,None,roots[uid],action=reopen.click);require(p.evaluate('localStorage.getItem('+json.dumps(KEY)+')')==before,'OLD_SAVED_RECORD_NOT_REPINNED');require(not any(x.get('name')=='get_translation' for x in state['calls']),'LEGACY_REOPEN_DOES_NOT_RETRIEVE_ENGLISH');count('native_legacy_refusals')
  audit_state(state)
 finally:context.close()


def first_source_quote(c,row,p):
 raw=(Path(c['publisher_originals'])/row['raw_artifact']['path']).read_text();heading=raw.index('\n### ')+1;part=raw[heading:].split('\n\n')[1];part=re.sub(r'\[\^\d+\]','',part);part=re.sub(r'\\([\[\]{}*_])',r'\1',part);part=re.sub(r'\*([^*\n]+)\*',r'\1',part);part='\n'.join(line.rstrip()for line in part.split('\n')).strip();suffix=p['stanza_layout'][0]['suffix'];require(part.endswith(suffix),'ORIGINAL_QUOTE_SUFFIX');quote=part[:-len(suffix)].rstrip();proof=row['quote_proofs'][0];require(sha(quote)==proof['text_sha256'] and utf16(quote)==proof['characters_utf16'],'ORIGINAL_FIRST_STANZA_QUOTE_HASH');require(8<=utf16(quote)<=2000 and len(re.findall('[a-z0-9]+',unicodedata.normalize('NFD',quote).lower()))<=120,'BOUNDED_ORIGINAL_QUOTE');return quote


# Finite new cohort adapters. No old9 global retargeting or current-to-history view.
def whole_source(data,row,p,version):
 require(data['source']=='apadana' and data['translation_id']==version and data['translation_revision']==REV,'SOURCE_OWNER_REVISION')
 for key in('raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'):require(data[key]==p[key],'EXACT_SOURCE_PIN')
 require(data['url']==p['url'] and data['fetched_url']==p['raw_url'] and data['license']=='CC BY-NC-SA 4.0' and data['license_url']=='https://creativecommons.org/licenses/by-nc-sa/4.0/','SOURCE_RIGHTS_URL')
 require(data['mapping_notes']==p['mapping_notes'] and all(n in data['notes']for n in p['mapping_notes']),'EDITION_NOTICES_PRESERVED')
 require('Walters'in data['attribution'] and 'Whitman College'in data['attribution'] and bool(data['changes']),'ATTRIBUTION_CHANGES')
 require(data['offset']==0 and data['next_offset']is None and data['continue_with']is None and data['prefix_sha256']==sha(''),'COMPLETE_SOURCE_NOT_PARTIAL')
 require(data['total_characters']==row['body_characters_utf16'] and utf16(data['text'])==row['body_characters_utf16'] and sha(data['text'])==row['body_sha256'],'EXACT_COMPLETE_SOURCE_BODY')
 require(len(data['text'].split('\n\n'))==row['paragraph_count'],'SOURCE_PARAGRAPH_COUNT')
 notes=data['translator_notes'];require(isinstance(notes,list)and len(notes)==p['note_count']and[n['number']for n in notes]==p['note_numbers']and all(set(n)=={'number','text'}and type(n['number'])is int and isinstance(n['text'],str)for n in notes),'EXACT_NOTE_OWNERS_ORDER_SCHEMA')
 require(sha(packed(notes))==p['notes_sha256'],'EXACT_ALL_ORIGINAL_NOTES')
 for body,layout in zip(data['text'].split('\n\n')[1:-2],p['stanza_layout'],strict=True):require(re.sub(r'\[Note \d+\]','',body).rstrip().endswith(layout['suffix'])and len(body.split('\n'))==layout['lines'],'SOURCE_PHYSICAL_STANZA_LABEL_AND_LINES')
 require(isinstance(data['publisher_paratext'],str)and sha(data['publisher_paratext'])==row['paratext_sha256']and utf16(data['publisher_paratext'])==row['paratext_characters'],'EXACT_SEPARATE_UNNOTED_HEADING')
 require(bool(data['publisher_paratext'])==(row['publisher']==371),'ONLY371_OWNS_PARATEXT')
 require(not any(k in data for k in('publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap')),'NO_INVENTED_APPARATUS')

def source_metadata(c,stage):
 root=Path(c['source_root']);require(root.is_absolute()and root.is_dir()and not any(z.is_symlink()for z in[root,*root.parents]),'PHYSICAL_CURRENT_SOURCE_ROOT')
 require(set(c['qa_source_closure'])=={'tests/helpers/intake380-metadata.mjs'},'ONE_FIXED_CURRENT_SOURCE_HELPER')
 for path,pin in c['qa_source_closure'].items():sealed({'path':str(root/path),'sha256':pin},False)
 program="""import{pathToFileURL}from'node:url';const root=pathToFileURL(process.argv[1]+'/'),m=await import(new URL('tests/helpers/intake380-metadata.mjs',root));m.assertCurrent380SourceClosure(root);const a=m.intake380Authority(root),old=a.historical375;console.log(JSON.stringify({ids:a.ids,profiles:a.profiles,links:a.links,historical375_ids:old.ids,baseline:a.historical368,manifest:a.manifest,approval:a.approval,documents:old.documents,source_pins:Object.fromEntries(Object.entries(a.approval.baseline_source.files).map(([key,value])=>[key,value.sha256])),current_source_pins:m.INTAKE380_PINS,widget_version:m.CURRENT_WIDGET_VERSION,widget_uri:m.CURRENT_WIDGET_URI}));"""
 env={k:v for k,v in os.environ.items()if k not in('NODE_OPTIONS','NODE_PATH')}
 result=subprocess.run(['node','--input-type=module','-e',program,str(root)],cwd=stage,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=30)
 require(result.returncode==0 and len(result.stdout)<=16777216,'GENUINE_CURRENT380_SOURCE_HOOK_REFUSED_OR_BOUND');return json.loads(result.stdout)

def preflight(c,server,stage):
 require(c['schema']=='english7-installed-reader-contract-v1'and c['execution_status']=='READY_EXACT_SEVEN_SOURCE_AND_INSTALLED_BINDINGS','UNREVIEWED_OR_PENDING_CONTRACT')
 require(re.fullmatch('[a-f0-9]{40}',c['application_commit'])is not None and re.fullmatch('[a-f0-9]{40}',c['package_snapshot_commit'])is not None,'ACTUAL_COMMIT_PINS_REQUIRED')
 require(sha(Path(__file__).read_bytes())==c['harness_sha256'],'EXACT_REVIEWED_SEVEN_DRIVER')
 require(c['canonical_logical_sha256']==F3 and c['publisher_revision']==REV and c['approved_pairs']==[{'publisher':p,'id':u}for p,u in PAIRS],'EXACT_SOURCE_SCOPE')
 require(c['pending_roles']==[],'PENDING_BINDINGS')
 meta=source_metadata(c,stage);ids=[uid for _,uid in PAIRS]
 require(len(meta['ids'])==380 and meta['historical375_ids']==meta['baseline']['ids']+ids and meta['ids']==meta['historical375_ids']+['tha-ap383','tha-ap385','tha-ap386','tha-ap387','tha-ap388'] and list(meta['documents']['PROFILES.json'])==ids,'SOURCE_DERIVED_FULL380_AND_RETAINED_EXACT_SEVEN');c['approved_ids']=ids
 require(meta['current_source_pins']['APPROVAL.json']==c['source_approval']['sha256'],'EXACT_INDEPENDENT_SOURCE_APPROVAL');sealed(c['source_approval'])
 for key in('source_schema','runtime','widget_source','harness_static'):sealed(c['required_authorities'][key])
 require(set(c['required_authorities'])=={'source_schema','runtime','widget_source','harness_static'},'CLOSED_EXISTING_BINDING_ROLES')
 peer=sealed(c['required_authorities']['source_schema']);require(peer==meta['documents']['SOURCE_REVIEW.json']and c['required_authorities']['source_schema']['sha256']==meta['source_pins']['SOURCE_REVIEW.json'],'EXACT_RETAINED_SEVEN_SOURCE_PEER_COPY');require(peer['source_metadata_and_finite_code_GO']is True and peer['literal_canonical_ids']==ids,'EXACT_SEVEN_SOURCE_PROFILE_PEER')
 for name in('PROFILES.json','LINKS.json'):require(peer['approved_expected_metadata'][name]['sha256']==meta['source_pins'][name],'PEER_BINDS_EXACT_SOURCE_OBJECTS')
 harness=sealed(c['required_authorities']['harness_static']);require(harness['schema']=='english7-installed-runner-static-review-v1'and harness['status']=='GO_SOURCE_ONLY_FOR_EXACT_RUNNER_AND_CONTRACT_SCHEMA'and harness['harness_sha256']==c['harness_sha256'],'EXACT_DRIVER_SOURCE_PEER')
 c['_profiles']=meta['documents']['PROFILES.json'];c['_versions']={uid:'ap:chapter-3/poem-'+str(pub)for pub,uid in PAIRS};c['_foreign_root_sha256']=meta['baseline']['profiles']['tha-ap107']['root_sha256']
 package=server.resolve().parent;require(str(server.resolve()).endswith('/node_modules/pali-canon-mcp/server'),'ACTUAL_FRESH_NPM_INSTALLED_ENTRY')
 install=sealed(c['install_receipt']);binding=sealed(c['Git_archive_installed_binding']);runtime=sealed(c['runtime_inventory']);review=sealed(c['required_authorities']['runtime'])
 require(install['schema']=='english7-actual-offline-install39-receipt-v1'and binding['schema']=='english7-commit-archive-installed39-binding-v1','TYPED_NEW_INSTALL_BINDINGS')
 require(install['status']==binding['status']=='PASS'and binding['commit']==c['package_snapshot_commit']and binding['application_component_commit']==c['application_commit'],'SAME_REAL_COMPONENT_AND_PACKAGE')
 require(install['offline_npm_install']is True and install['npm_scripts_executed']is False and install['registry_downloads']==install['observed_http_fetches']==0,'GENUINE_OFFLINE_PACKAGE_INSTALL_PROCESS')
 require(install['all39_archive_checkout_install_bytes_exact']is True and binding['all39_commit_archive_installed_exact']is True and len(install['members'])==39 and inventory(package)==install['members']==binding['members'],'ALL39_ACTUAL_INSTALLED_BYTES')
 require(install['installed']==str(package)and inventory(server.resolve())==runtime['files']and len(runtime['files'])==34,'ALL34_CURRENT_INSTALLED_RUNTIME_BYTES')
 require(runtime['schema']=='independent-reviewed-intake380-runtime-inventory-v1'and runtime['candidate_commit']==c['application_commit']and runtime['canonical_logical_sha256']==F3 and runtime['runtime_files']==34 and runtime['inventory_only']is True and runtime['behavioral_or_release_approval']is False,'ACTUAL_TYPED_CURRENT_RUNTIME_INVENTORY')
 require(review['schema']=='reviewed-intake380-runtime-approval-v1'and review['status']=='GO_RUNTIME_INVENTORY_ONLY'and review['application_commit']==c['application_commit']and review['inventory_sha256']==c['runtime_inventory']['sha256'],'EXACT_CURRENT_RUNTIME_REVIEW_APP_AND_INVENTORY_BINDING')
 require(runtime['curation_sha256']==review['curation_sha256']==meta['current_source_pins']['APPROVAL.json']and runtime['baseline_commit']==review['baseline_commit']=='9bacd4d7b98c53ed4ae53785b5213a35c2a93096','SAME_EXACT_SOURCE_CURATION_AND_BASELINE')
 require(review['runtime_paths']==34 and review['actual_data_paths']==27 and review['physical_and_Git_blob_inventory_exact']is True and review['canonical_data26_and_H_held_preserved']is True and review['behavioral_installed_browser_native_CI_or_release_approval']is False,'EXACT_REVIEWED34_PHYSICAL_GIT_AND_DATA_SCOPE')
 require(review['changed_paths']==runtime['allowed_changed_paths']and review['unchanged_paths']==len(runtime['unchanged_paths'])==29,'FINITE_REVIEWED_RUNTIME_DELTA')
 require(review['expected_manifest_sha256']==runtime['files']['data/apadana.json']['sha256']==sha((server/'data/apadana.json').read_bytes()),'INDEPENDENT_EXPECTED_MANIFEST_BYTE_BINDING')
 require(sha(sealed(c['archive'],False))==install['archive_sha256']==binding['archive_sha256'],'EXACT_SAME_ARCHIVE');require(json.loads((server/'data/apadana.json').read_bytes())==meta['manifest'],'ACTUAL_INSTALLED_MANIFEST_EQUALS_SOURCE380')
 parts=json.loads((server/'data/canon.json.gz.parts.json').read_bytes());chunks=[]
 for part in parts['parts']:
  raw=(server/'data'/part['file']).read_bytes();require(sha(raw)==part['sha256']and len(raw)==part['size'],'CANON_PART_PIN');chunks.append(raw)
 logical=gzip.decompress(b''.join(chunks));require(sha(logical)==F3,'UNCHANGED_F3');canon=json.loads(logical);require(len(canon['units'])==8544 and len(canon['books'])==61,'UNCHANGED_CORPUS_EXTENT');units={u['id']:u for u in canon['units']}
 c['_pins']={uid:VRI+'-'+u['index_revision']if'index_revision'in u else VRI for uid,u in units.items()};roots={uid:render(canon,units[uid])for uid in[*ids,'tha-ap107','tha-ap333','tha-ap340','tha-ap348','tha-ap349','tha-ap360']}
 golden=meta['documents']['SOURCE_BINDINGS.json']['source_derived_API_expected_metadata'];require(golden['ordered_ids']==ids,'SOURCE_GOLDEN_IDS');c['_rows']=[];c['_quotes']={};c['_queries']={};c['_verified_mutation_baselines']={}
 for pub,uid in PAIRS:
  g=golden['entries'][uid];p=c['_profiles'][uid];u=units[uid];require(u==g['root_record'],'EXACT_INDEPENDENT_CANONICAL_RECORD')
  wrapper={'id':uid,'book':u['book'],'start':u['start'],'end':u['end'],'blocks':canon['books'][u['book']]['blocks'][u['start']:u['end']]};require(sha(packed(wrapper))==p['root_sha256']==g['root_wrapper_sha256'],'ROOT_WRAPPER_PIN')
  require(p.get('index_revision')==('apadana-thera-next10-v1'if uid=='tha-ap374'else None),'EXACT_RETAINED374_REVISION')
  relative='src/_poems/chapter-3/poem-'+str(pub)+'.md';raw=sealed({'path':str(Path(c['publisher_originals'])/relative),'sha256':p['raw_sha256']},False);binding=next(x for x in meta['documents']['SOURCE_BINDINGS.json']['source_bindings']if x['canonical_id']==uid);require(len(raw)==binding['raw']['bytes']and sha(raw)==binding['raw']['sha256'],'EXACT_ORIGINAL_RAW_SIZE_AND_PIN')
  pages=[{'offset':z['offset'],'characters_utf16':z['characters_utf16'],'text_sha256':z['text_sha256'],'start_prefix_sha256':z['page_start_prefix_sha256'],'continuation_prefix_sha256':z['continuation_end_prefix_sha256'],'next_offset':z['next_offset']}for z in g['hard500_UTF16_pages']]
  row={'id':uid,'publisher':pub,'body_sha256':g['body_sha256'],'body_characters_utf16':g['body_characters_utf16'],'paragraph_count':len(g['body_paragraphs']),'note_count':p['note_count'],'notes_sha256':p['notes_sha256'],'paratext_sha256':p['paratext_sha256'],'paratext_characters':g['paratext_characters_utf16'],'paratext':{'present':True}if pub==371 else None,'summary':None,'pages':pages,'quote_proofs':g['quotation_proofs'],'raw_artifact':{'path':relative,'sha256':p['raw_sha256']},'dom_identity':g['translation_source_metadata']};c['_rows'].append(row);c['_quotes'][uid]=[first_source_quote(c,row,p)]
  blocks=canon['books'][u['book']]['blocks'];at=next(i for i in range(u['start'],u['end'])if blocks[i][0]=='gatha1');word=re.search('[A-Za-zāīūṅñṭḍṇḷṃṁĀĪŪṄÑṬḌṆḶṂṀ]{5,}',blocks[at][2]).group();fold=lambda text:''.join(x for x in unicodedata.normalize('NFD',text.lower())if not unicodedata.category(x).startswith('M')).replace('ṁ','m').replace('ṃ','m');c['_queries'][uid]={'query':word,'source_text_occurrence_blocks':[i for i in range(u['start'],u['end'])if fold(word)in fold(blocks[i][2])]}
 for right in meta['documents']['REQUIRED_NOTICES.json']['exact_rights_artifacts']:
  raw=sealed({'path':str(Path(c['publisher_originals'])/right['path']),'sha256':right['sha256']},False);require(len(raw)==right['bytes'],'SOURCE_RIGHTS_BYTES')
 require(sum(len(r['pages'])for r in c['_rows'])==16 and sum(r['note_count']for r in c['_rows'])==42 and sum(r['paragraph_count']for r in c['_rows'])==57,'EXACT_SEVEN_SOURCE_TOTALS')
 c['_navigation']={'edition_ids':[uid for uid,p in sorted(meta['profiles'].items(),key=lambda x:x[1]['poem'])if p.get('publisher_chapter')=='chapter-3'],'ap_catalogue_ids':[u['id']for u in sorted(canon['units'],key=lambda u:(u['book'],u['start'],u['id']))if u['id']in set(meta['ids'])]};require(len(c['_navigation']['edition_ids'])==340,'EXACT380_SELECTOR');c['_seed']=SYNTHETIC_SEED
 require(c['native_cells']==[{'id':uid,'entry':'/reader','width':390}for _,uid in PAIRS]+[{'id':uid,'entry':'/','width':1280}for pub,uid in PAIRS if pub in[371,377]],'CLOSED_NINE_NATIVE_CELLS');require(c['native_tamper_publishers']==[371,377]and c['pagination_publishers']==[p for p,_ in PAIRS],'CLOSED_SOURCE_WITNESSES')
 require(c['compatibility_ids']==['tha-ap107','tha-ap333','tha-ap340','tha-ap348']and c['foreign_source']=={'id':'tha-ap107','translation_id':'ap:chapter-3/poem-105'}and c['private_markers']==[CANARY],'EXPLICIT_OLD_CITATION_AND_PRIVATE_CONTROLS')
 html=sealed(c['source_widget_HTML'],False).decode('utf-8');widget=sealed(c['required_authorities']['widget_source']);version=c['widget_version'];require(re.fullmatch('v[1-9][0-9]*',version)is not None and c['widget_uris']==['ui://pali-canon/reader-'+version+'.html','ui://pali-canon/reader-'+version+'.skybridge.html'],'ACTUAL_WIDGET_VERSION_URIS')
 require(widget['schema']=='english7-independent-whole-widget-source-review-v1'and widget['status']=='PASS'and widget['application_component_commit']==c['application_commit']and widget['widget_version']==version and widget['html_sha256']==c['source_widget_HTML']['sha256']and widget['html_obtained_from_http']is False and widget['all_profile_objects_from_independent_approval']is True,'INDEPENDENT_SOURCE_HTML_NEVER_HTTP_GOLDEN')
 require(meta['widget_version']==version and meta['widget_uri']==c['widget_uris'][0],'SOURCE_HELPER_ACTUAL_WIDGET_BINDING')
 require(c['expected_counts']==EXPECTED_COUNTS,'FINITE_COMPLETE_NO_SKIP_FAMILIES');c['_axe_path']=None
 if c['axe']is not None:sealed(c['axe'],False);c['_axe_path']=c['axe']['path']
 report['a11y']={'performed':c['_axe_path']is not None,'checked_cells':0,'violations':0};return canon,units,roots,html,package,install

def dom_source_notices(scope,credit,row):
 expected=row['dom_identity'];require(credit.count()==1,'ONE_ENGLISH_CREDIT_DOMAIN');text=scope.text_content();credit_text=credit.text_content()
 require(all(note in text for note in expected['mapping_notes']),'DOM_EVERY_SOURCE_EDITION_NOTICE')
 require(expected['translator']in(text+credit_text)and expected['attribution']in credit_text and expected['license']in credit_text,'DOM_EXACT_TRANSLATOR_PUBLISHER_AND_LICENCE')
 require(expected['translation_revision']in(text+credit_text),'DOM_EXACT_SOURCE_REVISION')
 source_links=[a.get_attribute('href')for a in scope.locator('a[href]').all()]+[a.get_attribute('href')for a in credit.locator('a[href]').all()]
 require(expected['url']in source_links and expected['license_url']in source_links,'DOM_EXACT_PUBLISHER_AND_LICENCE_LINKS')

def optional_a11y(page,c,cell):
 if c['_axe_path']is None:return
 page.evaluate(sealed(c['axe'],False).decode('utf-8'));result=page.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return{violations:r.violations.map(v=>({id:v.id,impact:v.impact}))}}")
 report['a11y']['checked_cells']+=1;report['a11y']['violations']+=len(result['violations']);require(not result['violations'],'AUTOMATED_A11Y_VIOLATIONS')

def native_tamper(browser,client,c,roots):
 for pub in c['native_tamper_publishers']:
  row=next(r for r in c['_rows']if r['publisher']==pub);p=c['_profiles'][row['id']]
  for kind in('body','paratext','notes'):
   context,make,state=guarded_context(browser,client.base,c['_seed'],390,c['private_markers']);page=make();entry=client.base+'/reader'
   try:
    native_choose(page,entry,row,p,roots[row['id']],state);native_english(page,row,c['_verified_mutation_baselines'][row['id']]);baseline=c['_verified_mutation_baselines'][row['id']]
    patch={'text':('X'if baseline['body'][0]!='X'else'Y')+baseline['body'][1:]}if kind=='body'else{'publisher_paratext':('X'+baseline['paratext'][1:])if baseline['paratext']else' '}
    if kind=='notes':notes=copy.deepcopy(baseline['translator_notes']);notes[0]['text']+=' SYNTHETIC_NOTE_DRIFT';patch={'translator_notes':notes}
    state['expected']=row;state['patch']=patch;native_choose(page,entry,row,p,roots[row['id']],state);expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study > .translation')).to_have_count(0);native_ready(page,roots[row['id']]);state['patch']=None;page.get_by_role('button',name='Retry selected source',exact=True).click();native_english(page,row,baseline);audit_state(state);count('native_tamper_cases')
   finally:context.close()

def main():
 global phase,expect,sync_playwright
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--contract',required=True,type=Path);parser.add_argument('--contract-sha',required=True);parser.add_argument('--server-dir',required=True,type=Path);parser.add_argument('--report',required=True,type=Path);parser.add_argument('--browser',default='/usr/bin/chromium');args=parser.parse_args()
 require(os.name=='posix','POSIX_OWNED_PROCESS_GROUPS_REQUIRED');require(not args.report.exists(),'PRESERVE_EARLIER_REPORT');signal.signal(signal.SIGALRM,lambda *_:(_ for _ in()).throw(ValueError('OVERALL_300_SECOND_DEADLINE')));signal.alarm(300);stage=Path(tempfile.mkdtemp(prefix='en7-',dir='/tmp'));st=stage.lstat();require(stat.S_IMODE(st.st_mode)==0o700 and st.st_uid==os.geteuid()and len(str(stage))<=32,'OWNED_SHORT_TMPDIR');os.environ['TMPDIR']=str(stage)
 c=sealed({'path':str(args.contract.absolute()),'sha256':args.contract_sha});phase='actual380 source and fresh installed package preflight';canon,units,roots,html,package,install=preflight(c,args.server_dir,stage);guard=stage/'offline-pali-guard.cjs';guard.write_text(GUARD_SOURCE);require(sha(guard.read_bytes())==GUARD_SHA256,'EXACT_AUDITED_NETWORK_GUARD');report.update(application_component_commit=c['application_commit'],package_snapshot_commit=c['package_snapshot_commit'],harness_sha256=sha(Path(__file__).read_bytes()),contract_sha256=args.contract_sha,source_note_scope='English translator notes42; original VRI note acceptance remains its separate existing gate',physical_device=False,human_assistive_testing=False,fresh_browser_offline_verified=False)
 from playwright.sync_api import expect,sync_playwright
 with epoch(c,args.server_dir.resolve(),stage,'pinned-fixture')as client:
  phase='installed seven source APIs and16 source-pinned500 cursors';metadata,whole,widgets=api_cases(client,c,canon,units,roots)
  for uri in c['widget_uris']:
   resource=client.protocol('resources/read',{'uri':uri});require(len(resource['contents'])==1 and resource['contents'][0]['text']==html,'WHOLE_INSTALLED_WIDGET_RESOURCE_EQUALS_SOURCE')
  phase='actual Chromium nine native and fourteen host source cells'
  with sync_playwright()as pw:
   browser=pw.chromium.launch(executable_path=args.browser,headless=True);c['_browser']=browser;c['_base']=client.base;c['_roots']=roots;c['_canon']=canon;c['_units']=units
   try:
    catalogue_ui(browser,client,c,'/reader',390,canon);catalogue_ui(browser,client,c,'/',1280,canon)
    for cell in c['native_cells']:
     row=next(r for r in c['_rows']if r['id']==cell['id']);native_cell(browser,client,row,c['_profiles'][row['id']],roots[row['id']],units[row['id']],c,cell,stage)
    native_tamper(browser,client,c,roots);host_cases(browser,c,widgets,html);native_legacy_refusals(browser,client,c,roots)
   finally:browser.close()
 with epoch(c,args.server_dir.resolve(),stage,'deny-all')as client:
  phase='fresh source-denied installed epoch retains Pali and private records'
  with sync_playwright()as pw:
   browser=pw.chromium.launch(executable_path=args.browser,headless=True);context,make,state=guarded_context(browser,client.base,c['_seed'],390,c['private_markers']);page=make();row=c['_rows'][0]
   try:
    native_choose(page,client.base+'/reader',row,c['_profiles'][row['id']],roots[row['id']],state);expect(page.get_by_role('button',name='Retry selected source',exact=True)).to_be_visible();expect(page.locator('#study > .translation')).to_have_count(0);native_ready(page,roots[row['id']]);semantic(profile(page)['saved'],c['_seed']['saved'],'SOURCE_DENIED_PRIVATE_RECORDS_UNCHANGED');audit_state(state);count('deny_all_provider')
   finally:context.close();browser.close()
 phase='strict counts unchanged package and owned cleanup';require(report['counts']==EXPECTED_COUNTS,'EXACT_COMPLETE_CASE_COUNTS_NO_SKIP');require(inventory(package)==install['members'],'PACKAGE_CHANGED_DURING_ACCEPTANCE');require(all(e['cleanup']['leader_reaped']and e['cleanup']['group_absent']for e in report['epochs']),'OWNED_HTTP_GROUPS_ABSENT')
 require(report['a11y']['checked_cells']==(9 if c['_axe_path']is not None else 0),'EXACT_OPTIONAL_A11Y_SCOPE');signal.alarm(0);report.update(status='passed',browser_run=True,upstream_provider_requests_forwarded=0)

if __name__=='__main__':
 if '--help'in sys.argv or '-h'in sys.argv:main()
 try:main()
 except Exception as error:report.update(status='failed',failure={'phase':phase,'category':type(error).__name__,'code':str(error)if type(error)is ValueError and re.fullmatch(r'[A-Z0-9_]+',str(error))else'OPERATION_FAILED','frames':[{'file':Path(x.filename).name,'line':x.lineno,'function':x.name}for x in traceback.extract_tb(error.__traceback__)]})
 finally:
  text=json.dumps(report,indent=2)+'\n';destination=None
  if '--report'in sys.argv:
   try:destination=Path(sys.argv[sys.argv.index('--report')+1]);destination.parent.mkdir(parents=True,exist_ok=True)
   except Exception:destination=None
  if destination and not destination.exists():
   with destination.open('x',encoding='utf-8')as f:f.write(text)
  print(text);sys.exit(0 if report['status']=='passed'else 1)
