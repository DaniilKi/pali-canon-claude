#!/usr/bin/env python3
"""Unexecuted proposal: installed six-boundary HTTP/native-reader acceptance.
No upstream content or personal data; only synthetic isolated browser records.
Expected segment hashes must be independently sealed before root execution.
"""
import argparse,copy,hashlib,json,os,signal,socket,stat,subprocess,sys,tempfile,time,traceback,urllib.parse,urllib.request,re
from pathlib import Path
HERE=Path(__file__).resolve().parent
IDS=['tha-ap340','tha-ap341','tha-ap343','tha-ap344','tha-ap346','tha-ap347'];VRI='2d134ff9ef60f70a1eb03c9370580228811a3070';INDEX='apadana-thera340-341-343-344-346-347-v1';PIN=VRI+'-'+INDEX
KEY='pali-library-v1';DRAFT='pali-library-note-drafts-v1';PRIVATE_MARKER='SYNTHETIC_PRIVATE_B340';PRIVATE=PRIVATE_MARKER+'_ā😀'
digest=lambda x:hashlib.sha256(x if isinstance(x,bytes) else x.encode()).hexdigest()
compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
pretty=lambda x:json.dumps(x,ensure_ascii=False,indent=2).encode()
class GateError(Exception):pass
phase='arguments';report={'status':'running','checks':[],'limitations':'Genuine installed HTTP/MCP and Chromium DOM with synthetic local data; two simulated host bridges. No live publisher, physical-device, human AT or signed-in host acceptance.'}
def check(ok,code):
 if not ok:raise GateError(code)
def sealed(d):
 p=Path(d['path']);check(p.is_absolute() and not p.is_symlink(),'SEALED_ABSOLUTE_REGULAR');b=p.read_bytes();check(digest(b)==d['sha256'],'SEALED_DESCRIPTOR_CHANGED');return json.loads(b)
def inventory(root):
 out={}
 for p in sorted(root.rglob('*')):
  check(not p.is_symlink(),'NO_PACKAGE_SYMLINKS')
  if p.is_file():b=p.read_bytes();out[str(p.relative_to(root))]={'bytes':len(b),'sha256':digest(b)}
 return out
def stop_owned(child):
 group=child.pid
 def exists():
  try:os.killpg(group,0);return True
  except ProcessLookupError:return False
 def kill(sig):
  try:os.killpg(group,sig)
  except ProcessLookupError:pass
 if exists():kill(signal.SIGTERM)
 try:child.wait(timeout=8)
 except subprocess.TimeoutExpired:kill(signal.SIGKILL);child.wait(timeout=5)
 until=time.monotonic()+2
 while exists() and time.monotonic()<until:time.sleep(.05)
 if exists():kill(signal.SIGKILL)
 until=time.monotonic()+2
 while exists() and time.monotonic()<until:time.sleep(.05)
 return {'owned_process_group':group,'leader_reaped':child.poll() is not None,'group_absent':not exists()}
def protocol(base,method,params):
 req=urllib.request.Request(base+'/mcp',data=compact({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json','Accept':'application/json, text/event-stream'})
 with urllib.request.urlopen(req,timeout=30) as response:return json.load(response)['result']
def rpc(base,name,args):return protocol(base,'tools/call',{'name':name,'arguments':args})
def data(base,name,args):
 r=rpc(base,name,args);check(not r.get('isError'),'PUBLIC_TOOL_REFUSED');return r['structuredContent']
def refusal(base,name,args,uid):
 r=rpc(base,name,args);check(r.get('isError') is True,'OLD_POSITION_ACCEPTED');e=r.get('structuredContent') or json.loads(next(x['text'] for x in r['content'] if x['type']=='text'))
 if name=='read_passage_widget':
  check(isinstance(e,dict) and set(e)=={'error','recovery'},'EXACT_WIDGET_ERROR_RECOVERY_ENVELOPE')
  check(isinstance(e['recovery'],str) and 0<len(e['recovery'])<=1000,'NONEMPTY_WIDGET_RECOVERY')
  expected=('This unversioned numeric position is ambiguous after the reviewed Apadāna boundary repair. Reopen the whole current text explicitly, then use a returned source-pinned reading link. Keep old citations and personal notes for separate review; no passage or note was substituted.' if args.get('source_commit') is None else 'The requested VRI source version or locator revision changed. Reopen the selection from the current source; no continuation or context was substituted.')
  check(e['error']==expected,'EXACT_WIDGET_SOURCE_MAPPING_REFUSAL_MESSAGE')
 else:
  check(e.get('code') in ('READING_SOURCE_CHANGED','READING_LOCATOR_AMBIGUOUS'),'EXPECTED_LOCATOR_REFUSAL');check(e.get('reopen')=='#read?uid='+uid,'EXACT_WHOLE_REOPEN');check(not any(k in e for k in ('segments','segment','pali','words')),'REFUSAL_BEFORE_WORDING')
def malformed_pin_refusal(base,name,args):
 r=rpc(base,name,{**args,'source_commit':'malformed pin with spaces'});check(r.get('isError') is True,'MALFORMED_PIN_SCHEMA_REFUSAL')
 check('structuredContent' not in r and all(key not in r for key in ('pali','segments','words','matches','results')),'SDK_REFUSAL_NO_READING_PAYLOAD')
 check(isinstance(r.get('content'),list) and len(r['content'])==1 and r['content'][0].get('type')=='text','SDK_PLAIN_TEXT_ERROR_CONTENT')
 message=r['content'][0].get('text');check(isinstance(message,str) and 0<len(message)<=8192 and ('Invalid arguments for tool '+name) in message and 'source_commit' in message,'SDK_VALIDATION_NAMES_TOOL_AND_SOURCE_COMMIT')
 try:json.loads(message)
 except json.JSONDecodeError:pass
 else:raise GateError('SDK_VALIDATION_ERROR_MUST_BE_PLAIN_TEXT')
def private_text(value):
 # Bounds and three explicit decode rounds cover URL and JSON-escaped sentinels.
 check(isinstance(value,str) and len(value)<=1048576,'REQUEST_TEXT_BOUND')
 for _ in range(3):
  if PRIVATE_MARKER in value:return True
  value=urllib.parse.unquote(re.sub(r'\\u([0-9a-fA-F]{4})',lambda m:chr(int(m.group(1),16)),value))
 return PRIVATE_MARKER in value

def request_allowed(req,base):
 url=req.url;check(len(url)<=16384,'REQUEST_URL_BOUND');origin=urllib.parse.urlsplit(base);actual=urllib.parse.urlsplit(url)
 if actual.scheme!=origin.scheme or actual.netloc!=origin.netloc:return False
 if private_text(url):return False
 headers=req.headers;check(len(headers)<=128 and sum(len(k)+len(v) for k,v in headers.items())<=65536,'REQUEST_HEADERS_BOUND')
 for key,value in headers.items():
  check(len(key)<=8192 and len(value)<=8192,'REQUEST_HEADER_FIELD_BOUND')
  if private_text(key) or private_text(value):return False
 body=req.post_data or '';check(len(body)<=1048576,'REQUEST_BODY_BOUND')
 if private_text(body):return False
 if body:
  try:parsed=json.loads(body)
  except (json.JSONDecodeError,RecursionError):return False
  pending=[parsed];visited=0
  while pending:
   item=pending.pop();visited+=1;check(visited<=4096,'REQUEST_JSON_NODE_BOUND')
   if isinstance(item,str):
    if private_text(item):return False
   elif isinstance(item,dict):pending.extend(item.keys());pending.extend(item.values())
   elif isinstance(item,list):pending.extend(item)
 return True

def segments(actual,expected):
 check(len(actual)==len(expected),'SEGMENT_COUNT')
 for a,b in zip(actual,expected):
  check(a['ref']==b['ref'] and a['type']==b['type'] and digest(a['text'])==b['text_sha256'],'INDEPENDENT_SEGMENT_REF_TYPE_WORDS')
  if 'vri_paragraph' in b:check(a.get('vri_paragraph')==b['vri_paragraph'],'VRI_NUMBER_PRESERVED')
  for field in ('pts_page_begins','thai_page_begins','myanmar_page_begins','vri_page_begins','commentary_pts_page_begins'):
   if field in b:check(a.get(field,[])==b[field],'ORIGINAL_PUBLIC_PAGE_MARKERS_PRESERVED')
def analysed_segment(actual,expected):
 # Canonical analyse_passage returns this four-field projection, not page metadata.
 check(set(actual)=={'ref','type','text','vri_paragraph'},'EXACT_CANONICAL_WORD_SEGMENT_FIELDS')
 check(actual['ref']==expected['ref'] and actual['type']==expected['type'] and digest(actual['text'])==expected['text_sha256'],'WORD_SEGMENT_SOURCE_REF_TYPE_TEXT_HASH')
 check(actual['vri_paragraph']==expected['vri_paragraph'],'WORD_SEGMENT_ORIGINAL_VRI_LABEL')
def profile(page):return json.loads(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')') or '{}')
def saved(page,entry):
 page.goto(entry+'#saved');page.get_by_role('heading',name='Saved passages',exact=True).wait_for();page.locator('#status').filter(has_text='Opening').wait_for(state='hidden')
def mark_link(page,item):return page.get_by_role('region',name='Saved passage results').get_by_role('link',name=item['title']+' · '+item['ref'],exact=True)
def read_tool(page,name):
 panel=page.locator('.study-actions')
 if panel.count() and panel.get_attribute('open') is None:panel.locator(':scope > summary').click()
 return page.get_by_role('button',name=name,exact=True)
def fixture_records():
 out=[]
 for uid in IDS:
  out.extend([{'uid':uid,'ref':uid+'/1','title':'Synthetic old pinned '+uid,'offset':0,'source_commit':VRI,'note':PRIVATE+' saved '+uid+' pinned'},{'uid':uid,'ref':uid+'/4','title':'Synthetic old unversioned '+uid,'note':PRIVATE+' saved '+uid+' legacy'}])
 return out

def api_cases(base,oracle):
 metadata={};widgets={};old_count=0
 for row in oracle['units']:
  uid=row['id'];d=data(base,'get_text',{'uid':uid,'limit':200,'variants':'none'});check(d['text_id']==uid and d['source']['commit']==VRI and d['source']['locator_revision']==PIN,'FRESH_SOURCE_AND_INDEX_IDENTITY');check(d['title']==row['after_unit']['title'],'EXACT_CURRENT_READING_TITLE')
  m=data(base,'get_metadata',{'uid':uid});check(m['id']==uid and m['title']==row['after_unit']['title'] and m['vri_paragraphs']==row['after_unit']['vri'],'EXACT_CURRENT_METADATA_ID_TITLE_VRI_RANGE')
  segments(d['segments'],row['future_segments']);check(d['next_offset'] is None,'COMPLETE_SIX_SMALL_UNITS');check(not any(x.get('source')=='apadana' or x.get('translation_id','').startswith('ap:') for x in d.get('english_available',[])),'NO_NEW_ENGLISH_ACTIVATION');metadata[uid]=d
  malformed_pin_refusal(base,'get_text',{'uid':uid,'offset':0,'limit':1})
  malformed_pin_refusal(base,'read_passage_widget',{'uid':uid,'segment':uid+'/1','english':False})
  for old in row['old_segments']:
   for pin in (None,VRI,'0000000000000000000000000000000000000000',VRI+'-apadana-thera340-341-343-344-346-347-v99'):
    a={'uid':uid,'offset':old['offset'],'limit':1};a.update({'source_commit':pin} if pin else {});refusal(base,'get_text',a,uid)
    w={'uid':uid,'segment':old['ref'],'english':False};w.update({'source_commit':pin} if pin else {});refusal(base,'read_passage_widget',w,uid)
   old_count+=1
  for s in row['future_segments']:
   current=data(base,'get_text',{'uid':uid,'offset':s['offset'],'limit':1,'source_commit':PIN});segments(current['segments'],[s])
  cursor=data(base,'get_text',{'uid':uid,'limit':1});n=1
  while cursor['next_offset'] is not None:
   cursor=data(base,'get_text',{'uid':uid,'offset':cursor['next_offset'],'limit':1,'source_commit':PIN});n+=1;check(n<=len(row['future_segments']),'CONTINUATION_BOUND')
  check(n==len(row['future_segments']),'EXACT_CURRENT_CONTINUATION_COUNT');widgets[uid]=data(base,'read_passage_widget',{'uid':uid,'limit':80,'english':False});widget_payload(widgets[uid],uid,row['future_segments'])
  first_widget=data(base,'read_passage_widget',{'uid':uid,'limit':1,'english':False});follow=first_widget['pali']['continue_with']['arguments'];check(follow['source_commit']==PIN and follow['uid']==uid and follow['offset']==1,'GENERATED_CURRENT_WIDGET_CONTINUATION_PIN');continued=data(base,'read_passage_widget',follow);segments(continued['pali']['segments'],row['future_segments'][1:2])
  for expected in (None,VRI):
   bad=dict(follow);bad.pop('source_commit',None)
   if expected:bad['source_commit']=expected
   refusal(base,'read_passage_widget',bad,uid)
  # Context and word-offset representatives must fail before source wording too.
  verse=next(x for x in row['future_segments'] if x['type']=='verse')
  for old_pin in (None,VRI):
   a={'uid':uid,'segment':verse['ref'],'context':1,'english':False};a.update({'source_commit':old_pin} if old_pin else {});refusal(base,'read_passage_widget',a,uid)
   a={'uid':uid,'segment':verse['ref'],'offset':0,'limit':1};a.update({'source_commit':old_pin} if old_pin else {});refusal(base,'analyse_passage',a,uid)
  analysed=data(base,'analyse_passage',{'uid':uid,'segment':verse['ref'],'source_commit':PIN,'offset':0,'limit':1});analysed_segment(analysed['segment'],verse);check(analysed['text_source']['commit']==VRI and analysed['text_source']['locator_revision']==PIN,'CURRENT_WORD_ANALYSIS_USES_REPAIRED_SOURCE_PIN')
  for selector in (uid+'/1',uid+':1','https://suttacentral.net/'+uid+'/1','https://suttacentral.net/'+uid+'?offset=0'):
   check(rpc(base,'get_text',{'uid':selector}).get('isError') is True,'BARE_POSITION_ALIAS_ACCEPTED')
 for page in oracle['source_book_pages']:
  d=data(base,'get_text',page['arguments']);check(d['selection']=='source_book' and d['source']['commit']==VRI and 'locator_revision' not in d['source'],'ORIGINAL_SOURCEBOOK_NAMESPACE');segments(d['segments'],page['segments'])
 for control in oracle['unaffected_controls']:
  d=data(base,'get_text',control['arguments']);check(d['source']['commit']==VRI and d['source'].get('locator_revision')==control.get('locator_revision'),'UNRELATED_REVISION_CHANGED');segments(d['segments'],control['segments'])
 report['checks'].append({'family':'Installed MCP reads all six units; old positions refuse and source-book controls stay stable','units':6,'old_positions_checked':old_count,'same_numeric_source_positions_also_refused':45,'new_segments':sum(len(x['future_segments']) for x in oracle['units']),'sourcebook_pages':len(oracle['source_book_pages'])});return metadata,widgets

def browser_cases(browser,base,metadata,oracle,stage,entry_path):
 from playwright.sync_api import expect
 entry=base+entry_path
 records=fixture_records();draft=PRIVATE+' unsaved a\u0304😀';fault_data=rpc(base,'get_text',{'uid':IDS[0],'limit':40,'variants':'none'});check(not fault_data.get('isError'),'CONTROLLED_REPLAY_ACTUAL_SUCCESS');segments(fault_data['structuredContent']['segments'],oracle['units'][0]['future_segments'])
 def environment(width):
  c=browser.new_context(viewport={'width':width,'height':900});seed={'theme':'light','remember_position':False,'saved':copy.deepcopy(records),'reading_progress':[]};c.add_init_script('if(!localStorage.getItem('+json.dumps(KEY)+'))localStorage.setItem('+json.dumps(KEY)+','+json.dumps(compact(seed))+');Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw Error("Controlled clipboard denial")}}});window.ignoreNextAbort=false;const originalFetch=window.fetch.bind(window);window.fetch=(url,options)=>{if(window.ignoreNextAbort&&options?.signal&&JSON.parse(options.body||"{}").params?.name==="get_text"){window.ignoreNextAbort=false;const{signal,...rest}=options;return originalFetch(url,rest).then(async r=>{await r.clone().text();document.documentElement.dataset.boundaryBodyComplete="true";return r})}return originalFetch(url,options)};')
  state={'bad':[],'errors':[],'calls':[],'hold':False,'held':[]}
  def intercept(route):
   req=route.request
   try:allowed=request_allowed(req,base)
   except GateError:state['bad'].append('REQUEST_BOUND_EXCEEDED');route.abort();return
   if not allowed:state['bad'].append('EXTERNAL_OR_PRIVATE_REQUEST');route.abort();return
   if req.method=='POST' and req.url.endswith('/mcp'):
    cmd=(req.post_data_json or {}).get('params',{});state['calls'].append(cmd.get('name'));check(cmd.get('name')!='get_translation','NO_ENGLISH_FETCH')
    if state['hold'] and cmd.get('name')=='get_text' and cmd.get('arguments',{}).get('uid')==IDS[0]:state['held'].append(route);req.frame.evaluate('document.documentElement.dataset.boundaryHeld="true"');return
   route.continue_()
  c.route('**/*',intercept);state['route_guard']=intercept
  def newpage():
   p=c.new_page();p.set_default_timeout(15000);p.on('pageerror',lambda x:state['errors'].append(type(x).__name__));return p
  return c,newpage,state
 for width in (390,1280):
  context,newpage,state=environment(width);page=newpage()
  try:
   page.goto(entry);page.get_by_role('link',name='Library',exact=True).click();page.locator('#view a.entry[href="#browse?node=ap"]').click();page.locator('#view a.entry[href^="#read?uid="]').first.wait_for(state='visible');saved(page,entry);page.get_by_label('Your personal note',exact=True).first.fill(draft);page.wait_for_function('(a)=>(sessionStorage.getItem(a.key)||"").includes(a.marker)',arg={'key':DRAFT,'marker':PRIVATE_MARKER});journal=page.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')');store=page.evaluate('localStorage.getItem('+json.dumps(KEY)+')');second=newpage();saved(second,entry);expect(second.get_by_label('Your personal note',exact=True).first).to_have_value(records[0]['note']);check(second.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')') is None,'DRAFT_COPIED_TO_FRESH_TAB')
   for item in records:
    saved(page,entry);page.evaluate('window.wordLeaks=0;window.wordObserver=new MutationObserver(()=>{if(document.querySelector(".passage"))window.wordLeaks++});window.wordObserver.observe(document.getElementById("view"),{childList:true,subtree:true});')
    mark_link(page,item).focus();page.keyboard.press('Enter');expect(page.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible();expect(page.locator('.passage')).to_have_count(0);check(page.evaluate('window.wordLeaks')==0,'TRANSIENT_WORDING_BEFORE_REFUSAL');page.evaluate('window.wordObserver.disconnect()');expect(page.locator('#view textarea')).to_have_count(0)
    reopen=page.get_by_role('link',name='Reopen whole current text · saved references stay unchanged',exact=True);check(reopen.get_attribute('href')=='#read?uid='+item['uid'],'WHOLE_REOPEN_HAS_NO_OLD_POSITION');reopen.focus();page.keyboard.press('Enter');expect(page.locator('.segment-label a').first).to_have_text(item['uid']+'/1');page.locator('#status').filter(has_text='Opening').wait_for(state='hidden');check(page.url==entry+'#read?uid='+item['uid'],'WHOLE_REOPEN_ROUTE');current_anchor=page.locator('.segment-label a').first.element_handle();current_href=current_anchor.get_attribute('href');current_target=urllib.parse.urljoin(page.url,current_href);current_locator=urllib.parse.parse_qs(urllib.parse.urlparse(current_target).fragment.removeprefix('read?'));check(current_locator.get('source')==[PIN] and current_locator.get('ref')==[item['uid']+'/1'],'CURRENT_PARAGRAPH_LINK_PIN');current_anchor.click();page.wait_for_url(current_target);page.wait_for_function('(node)=>!node.isConnected',arg=current_anchor);expect(page.locator('.segment-label a').first).to_have_text(item['uid']+'/1');read_tool(page,'Copy reading link').click();current_copy=page.get_by_role('link',name='Exact reading link · open or long-press to copy',exact=True);expect(current_copy).to_be_visible();current_params=urllib.parse.parse_qs(urllib.parse.urlparse(current_copy.get_attribute('href')).fragment.removeprefix('read?'));check(current_params.get('uid')==[item['uid']] and current_params.get('ref')==[item['uid']+'/1'] and current_params.get('source')==[PIN] and current_params.get('offset')==['0'],'CURRENT_NATIVE_COPY_USES_NEW_INDEX_PIN');check(page.locator('.passage').all_text_contents()==[s['text'] for s in metadata[item['uid']]['segments']],'CURRENT_INDEPENDENT_WORDS_AFTER_EXPLICIT_REOPEN');check(PRIVATE not in page.locator('#content').text_content(),'OLD_NOTE_ATTACHED_TO_REPAIRED_WORDS');check(page.evaluate('localStorage.getItem('+json.dumps(KEY)+')')==store and page.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')')==journal,'OLD_PERSONAL_BYTES_MUTATED')
    collision=page.locator('section[aria-label="Pāli passage"] .segment').first;expect(collision.get_by_role('button',name='Save passage '+item['uid']+'/1',exact=True)).to_be_disabled();expect(collision).to_contain_text('Saved reference needs review');expect(collision.locator('textarea')).to_have_count(0)
   saved(page,entry);page.reload();expect(page.get_by_label('Your personal note',exact=True).first).to_have_value(draft);check(profile(page)['saved']==records,'RELOAD_REPINNED_RECORDS')
   with page.expect_download() as event:page.get_by_role('button',name='Export bookmarks and notes',exact=True).click()
   downloaded=Path(event.value.path()).read_bytes();expected={'format':KEY,'saved':[{**records[0],'note':draft},*records[1:]]};check(downloaded==pretty(expected),'EXACT_UTF8_NOTE_DRAFT_EXPORT_BYTES');check(profile(page)['saved']==records,'EXPORT_SAVED_DRAFT_IMPLICITLY');path=stage/('synthetic-roundtrip-'+('root' if entry_path=='/' else 'reader')+'-'+str(width)+'.json');
   with path.open('xb') as stream:stream.write(downloaded)
   restored=browser.new_context(viewport={'width':width,'height':900});restored.route('**/*',state['route_guard'])
   try:
    fresh=restored.new_page();fresh.set_default_timeout(15000);fresh.on('pageerror',lambda x:state['errors'].append(type(x).__name__));saved(fresh,entry);fresh.get_by_label('Restore bookmarks and notes from a JSON export',exact=True).set_input_files(str(path));fresh.get_by_role('button',name='Cancel import',exact=True).click();check(profile(fresh).get('saved',[])==[],'CANCEL_IMPORT_MUTATED_PROFILE');fresh.get_by_label('Restore bookmarks and notes from a JSON export',exact=True).set_input_files(str(path));fresh.get_by_role('button',name='Add 12 new bookmarks',exact=True).click();fresh.wait_for_function("""(a)=>{
 const actual=JSON.parse(localStorage.getItem(a.key)||'{}').saved;
 const allowed=new Set(['uid','ref','title','note','offset','source_commit']);
 const flat=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>allowed.has(k)&&(k==='offset'?Number.isSafeInteger(x[k])&&x[k]>=0&&x[k]<=100000:typeof x[k]==='string'));
 if(!Array.isArray(actual)||!Array.isArray(a.expected)||actual.length!==a.expected.length)return false;
 return actual.every((x,i)=>{
  const y=a.expected[i];if(!flat(x)||!flat(y))return false;
  const keys=Object.keys(x).sort(),expectedKeys=Object.keys(y).sort();
  return keys.length===expectedKeys.length&&keys.every((k,j)=>k===expectedKeys[j]&&Object.is(x[k],y[k]));
 });
}""",arg={'key':KEY,'expected':expected['saved']});check(profile(fresh)['saved']==expected['saved'],'RESTORE_REPINNED_OR_DROPPED_NOTE');mark_link(fresh,records[0]).click();expect(fresh.get_by_role('heading',name='No passage was substituted.',exact=True)).to_be_visible()
   finally:restored.close()
   # Raw source-book segment offsets come from independent source-book oracles, never block indices.
   book=oracle['source_book_pages'][0];a=book['arguments'];route={'book':a['book'],'offset':a.get('offset',0),'ref':book['segments'][0]['ref'],'source':VRI};page.goto(entry+'#read?'+urllib.parse.urlencode(route));expect(page.locator('.segment-label a').first).to_have_text(book['segments'][0]['ref']);page.locator('#status').filter(has_text='Opening').wait_for(state='hidden');check(digest(page.locator('.passage').first.text_content())==book['segments'][0]['text_sha256'],'SOURCEBOOK_WORDS_MOVED');read_tool(page,'Copy reading link').click();fallback=page.get_by_role('link',name='Exact reading link · open or long-press to copy',exact=True);expect(fallback).to_be_visible();copied=urllib.parse.parse_qs(urllib.parse.urlparse(fallback.get_attribute('href')).fragment.removeprefix('read?'));check(copied.get('source')==[VRI] and copied.get('book')==[a['book']] and copied.get('ref')==[book['segments'][0]['ref']],'SOURCEBOOK_LOCATOR_REWRITTEN')
   check(not state['bad'] and not state['errors'],'BROWSER_PRIVACY_OR_SCRIPT_ERROR');report['checks'].append({'family':'Native old bookmarks refuse; explicit reopening preserves notes, exports and source-book references','entrypoint':entry_path,'width':width,'old_records':12,'export_utf8_bytes':len(downloaded),'export_sha256':digest(downloaded),'stored_data_unchanged':True})
  finally:context.close()
 # Explicit new saves are possible at unoccupied current positions; nothing is migrated automatically.
 context,newpage,state=environment(390);page=newpage()
 try:
  for index,uid in enumerate(IDS):
   row=next(x for x in oracle['units'] if x['id']==uid);chosen=next(x for x in row['future_segments'] if x['type']=='verse' and not any(m['uid']==uid and m['ref']==x['ref'] for m in records));page.goto(entry+'#read?uid='+uid);expect(page.locator('.segment-label a').first).to_have_text(uid+'/1');page.locator('#status').filter(has_text='Opening').wait_for(state='hidden');segment=page.locator('section[aria-label="Pāli passage"] .segment').nth(chosen['offset']);segment.get_by_role('button',name='Save passage '+chosen['ref'],exact=True).click();page.wait_for_function('(a)=>JSON.parse(localStorage.getItem(a.key)||"{}").saved?.some(x=>x.uid===a.uid&&x.ref===a.ref&&x.source_commit===a.pin)',arg={'key':KEY,'uid':uid,'ref':chosen['ref'],'pin':PIN});fresh=profile(page)['saved'][-1];check(fresh['uid']==uid and fresh['ref']==chosen['ref'] and fresh['offset']==chosen['offset'] and fresh['source_commit']==PIN,'EXPLICIT_CURRENT_SAVE_PIN');saved(page,entry);field=page.get_by_label('Your personal note',exact=True).nth(12+index);field.fill(PRIVATE+' current '+uid);page.get_by_role('button',name='Save note',exact=True).nth(12+index).click();check(profile(page)['saved'][:12]==records,'EXPLICIT_NEW_SAVE_MUTATED_OLD_RECORDS');mark_link(page,profile(page)['saved'][-1]).click();expect(page.locator('.segment-label a').first).to_have_text(chosen['ref']);page.locator('#status').filter(has_text='Opening').wait_for(state='hidden');check(digest(page.locator('.passage').first.text_content())==chosen['text_sha256'],'EXPLICIT_CURRENT_NOTE_REF_WORDS')
  check(not state['bad'] and not state['errors'],'CURRENT_NOTE_PRIVACY');report['checks'].append({'family':'Six explicit current notes use new pins; twelve old records remain unchanged','new_pins':6,'old_records_preserved':12})
 finally:context.close()
 # One controlled actual-data replay after Stop; do not weaken current source/ref/personal guards.
 context,newpage,state=environment(390);page=newpage()
 try:
  saved(page,entry);page.evaluate('window.ignoreNextAbort=true;document.documentElement.dataset.boundaryHeld="false";document.documentElement.dataset.boundaryBodyComplete="false"');state['hold']=True;page.goto(entry+'#read?uid='+IDS[0]);expect(page.locator('html')).to_have_attribute('data-boundary-held','true');page.get_by_role('button',name='Stop waiting for Pāli reading',exact=True).click();expect(page.get_by_role('heading',name='Reading request stopped',exact=True)).to_be_visible();saved(page,entry);field=page.get_by_label('Your personal note',exact=True).first;field.fill(draft);field.focus();check(len(state['held'])==1,'ONE_HELD_REQUEST');r=state['held'].pop()
  # The root oracle has already verified the actual source result replayed here; no new wording.
  with page.expect_response(lambda x:x.request.method=='POST' and x.url.endswith('/mcp')):r.fulfill(status=200,content_type='application/json',body=compact({'jsonrpc':'2.0','id':r.request.post_data_json['id'],'result':fault_data}))
  expect(page.locator('html')).to_have_attribute('data-boundary-body-complete','true');page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');expect(page.get_by_role('heading',name='Saved passages',exact=True)).to_be_visible();expect(field).to_have_value(draft);expect(field).to_be_focused();expect(page.locator('.passage')).to_have_count(0);check(not state['bad'] and not state['errors'],'LATE_RESULT_PRIVACY_ERROR');report['checks'].append({'family':'A stopped response completes late without replacing Saved or moving draft focus','body_completed':True})
 finally:context.close()
 # Actual second-tab stored write must refuse a stale first-tab Save and quarantine its draft after reload.
 context,newpage,state=environment(390);a=newpage();b=newpage()
 try:
  saved(a,entry);a.get_by_label('Your personal note',exact=True).first.fill(draft);saved(b,entry);other=PRIVATE+' other tab';b.get_by_label('Your personal note',exact=True).first.fill(other);b.get_by_role('button',name='Save note',exact=True).first.click();b.wait_for_function('(a)=>JSON.parse(localStorage.getItem(a.key)||"{}").saved?.[0]?.note===a.note',arg={'key':KEY,'note':other});stored=b.evaluate('localStorage.getItem('+json.dumps(KEY)+')');a.get_by_role('button',name='Save note',exact=True).first.click();expect(a.get_by_role('heading',name='Keep this tab’s changes',exact=True)).to_be_visible();check(a.evaluate('localStorage.getItem('+json.dumps(KEY)+')')==stored,'STALE_TAB_OVERWROTE_NEWER_NOTE');a.reload();region=a.locator('#draft-recovery');expect(region.get_by_label('Recovered unsaved personal note · '+records[0]['ref'],exact=True)).to_have_value(draft);check(profile(a)['saved'][0]['note']==other,'RECOVERY_OVERWROTE_NEWER_NOTE');raw=a.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')')
  with a.expect_download() as event:region.get_by_role('button',name='Download recovered notes',exact=True).click()
  recovered=Path(event.value.path()).read_bytes();check(recovered==pretty(json.loads(raw)),'EXACT_RECOVERY_DOWNLOAD_BYTES');region.get_by_role('button',name='Discard recovered draft',exact=True).first.click();region.get_by_role('button',name='Cancel discard',exact=True).click();check(a.evaluate('sessionStorage.getItem('+json.dumps(DRAFT)+')')==raw and a.evaluate('localStorage.getItem('+json.dumps(KEY)+')')==stored,'CANCEL_DISCARD_MUTATED_RECOVERY');check(not state['bad'] and not state['errors'],'TWO_TAB_PRIVACY');report['checks'].append({'family':'Stale tab save refuses; draft recovery and cancelled discard preserve both versions','recovery_sha256':digest(recovered),'recovery_utf8_bytes':len(recovered)})
 finally:context.close()

def widget_payload(data,uid,expected):
 check(data['text_id']==uid and data['source']['commit']==VRI and data['source']['locator_revision']==PIN and data['english'] is None,'EXACT_SIX_WIDGET_ROOT_NAMESPACE_NO_ENGLISH')
 page=data['pali'];check(page['offset']==0 and page['returned']==page['total_segments']==len(expected) and page['next_offset'] is None and page['continue_with'] is None,'COMPLETE_SIX_WIDGET_PALI_COUNTS');segments(page['segments'],expected)
def bridge_pali(frame,expected):
 actual=frame.locator('#pali .seg').evaluate_all("nodes=>nodes.map(n=>({classes:[...n.classList],text:[...n.childNodes].filter(c=>c.nodeType===3).map(c=>c.textContent).join('')}))");check(len(actual)==len(expected),'EXACT_BRIDGE_SEGMENT_COUNT')
 for got,want in zip(actual,expected):check(want['type'] in got['classes'] and digest(got['text'])==want['text_sha256'],'BRIDGE_EVERY_SOURCE_TYPE_AND_WORD_HASH')

def pair_widgets(html,widgets,checks,oracle):
    """Initial stale pair payload refuses before Pāli through both simulated bridges."""
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('PALI_BROWSER','/usr/bin/chromium'),headless=True)
        for width in (390,1280):
            for bridge in ('MCP Apps','Apps SDK'):
                page = browser.new_page(viewport={'width':width,'height':900});errors=[];traffic=[]
                page.on('pageerror',lambda error:errors.append(type(error).__name__))
                page.route('**/*',lambda route:(traffic.append('unexpected request'),route.abort()))
                if bridge == 'MCP Apps':
                    page.set_content('<iframe id="reader" style="width:100%;height:850px;border:0"></iframe>')
                    page.evaluate("""html=>{window.messages=[];const frame=document.querySelector('iframe');window.addEventListener('message',e=>{window.messages.push(e.data);if(e.data.method==='ui/initialize')frame.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{hostContext:{theme:'light'},hostCapabilities:{serverTools:{},openLinks:{},updateModelContext:{structuredContent:{}}}}},'*');if(e.data.method==='ui/update-model-context')frame.contentWindow.postMessage({jsonrpc:'2.0',id:e.data.id,result:{}},'*')});frame.srcdoc=html}""",html)
                    page.wait_for_function("window.messages.some(m=>m.method==='ui/notifications/initialized')");frame=page.frames[1]
                    def send(data):page.evaluate("data=>document.querySelector('iframe').contentWindow.postMessage({jsonrpc:'2.0',method:'ui/notifications/tool-result',params:{structuredContent:data}},'*')",data)
                else:
                    page.evaluate("window.openai={theme:'light',setWidgetState(){},openExternal(){},callTool(){throw Error('Unexpected widget tool')}}")
                    page.set_content(html);frame=page.main_frame
                    def send(data):page.evaluate("data=>{window.openai.toolOutput=data;window.dispatchEvent(new Event('openai:set_globals'))}",data)
                for uid,data in widgets.items():
                    expected=next(row['future_segments'] for row in oracle['units'] if row['id']==uid);widget_payload(data,uid,expected)
                    send(data);expect(frame.locator('#pali .seg')).to_have_count(len(expected));bridge_pali(frame,expected)
                    for missing in (False,True):
                        changed=copy.deepcopy(data)
                        if missing:changed['source'].pop('locator_revision')
                        else:changed['source']['locator_revision']=VRI
                        send(changed);expect(frame.locator('#title')).to_have_text('Could not open the passage')
                        expect(frame.locator('#pali .seg')).to_have_count(0);expect(frame.locator('#english .en')).to_have_count(0)
                        send(data);expect(frame.locator('#pali .seg')).to_have_count(len(expected));bridge_pali(frame,expected)
                check(not traffic and not errors,'HOST_SCRIPT_OR_NETWORK_ERROR')
                checks.append({'check':'initial six-boundary payload current pins accepted; old/missing locator refused before Pāli and English','bridge':bridge,'width':width,'sources':len(widgets),'independent_source_segments':89,'stale_cases':2*len(widgets),'network_requests':0})
                page.close()
        browser.close()

def main():
 global phase,expect,sync_playwright
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--contract',required=True,type=Path);p.add_argument('--contract-sha',required=True);p.add_argument('--server-dir',required=True,type=Path);p.add_argument('--report',required=True,type=Path);p.add_argument('--browser',default='/usr/bin/chromium');a=p.parse_args();check(not a.report.exists(),'PRESERVE_OLD_REPORT')
 signal.signal(signal.SIGALRM,lambda *_:(_ for _ in ()).throw(GateError('OVERALL_540_SECOND_DEADLINE')));signal.alarm(540)
 phase='sealed metadata and package binding';c=sealed({'path':str(a.contract.resolve()),'sha256':a.contract_sha});check(c['schema']=='reviewed-six-boundary-reader-v1' and c['execution_status']=='READY_REVIEWED_BINDING','DRAFT_REQUIRES_REVIEWED_BINDING');check(c['ids']==IDS and c['locator_revision']==PIN and c['original_source_commit']==VRI,'EXACT_SIX_FINITE_SCOPE')
 for name,value in c['harness_closure'].items():check(name in ('check-boundary-reader.py','offline-pali-guard.cjs','run-bounded.py') and digest((HERE/name).read_bytes())==value,'FROZEN_HARNESS_BYTES')
 check(set(c['harness_closure'])=={'check-boundary-reader.py','offline-pali-guard.cjs','run-bounded.py'},'EXACT_THREE_HARNESS_FILES')
 for d in c['required_authorities'].values():sealed(d)
 check(set(c['required_authorities'])=={'source_boundary_review','source_oracle_review','historical_preservation_review','runtime_review','widget_source_review'},'FIVE_REVIEW_ROLES')
 check(c['required_authorities']['source_boundary_review']['sha256']=='5f91dfe0a7c29fadf58f9d71f5a24f22e9c18dc3bd7a9eb2767f4beb3092f05a','EXACT_ORIGINAL_BOUNDARY_REVIEW')
 check(1<=len(INDEX)<=40 and c['index_revision']==INDEX,'CLOSED_SIX_REVISION_BOUND')
 oracle=sealed(c['oracles']);check(c['oracles']['sha256']=='69e6f7c66480e5b40ddc554ab863d5fb8ac0341b8c7f280ebd9f64bbd4a84516' and oracle['index_revision']==INDEX and oracle['future_canon_sha256']=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b','PINNED_SOURCE_FIRST_SIX_ORACLE');check(oracle['schema']=='source-first-six-boundary-reader-oracles-v1' and oracle['candidate_output_used_as_expectation'] is False,'INDEPENDENT_ORIGINAL_EXPECTATIONS');check([r['id'] for r in oracle['units']]==IDS,'EXACT6_ORACLE_ROWS');check(sum(len(r['old_segments']) for r in oracle['units'])==sum(len(r['future_segments']) for r in oracle['units'])==89,'EXACT_OLD_NEW_89_SOURCE_SEGMENTS');check(oracle['source_book_pages'] and oracle['unaffected_controls'],'SOURCEBOOK_AND_OLDPAIR_CONTROLS_REQUIRED')
 for row in oracle['units']:
  check(4<=len(row['future_segments'])<=40,'SIX_SMALL_CURRENT_UNIT_UI_PAGES');check([s['offset'] for s in row['old_segments']]==list(range(len(row['old_segments']))),'ALL_OLD_POSITIONS_COVERED');check([s['offset'] for s in row['future_segments']]==list(range(len(row['future_segments']))),'ALL_CURRENT_POSITIONS_COVERED')
 check([x['arguments'].get('uid') for x in oracle['unaffected_controls']]==c['control_ids'] and {'tha-ap107','tha-ap108','tha-ap333','tha-ap334','tha-ap335','tha-ap336','mn10'}<=set(c['control_ids']) and not {'tha-ap348','tha-ap349'}&set(c['control_ids']),'EXACT_OLDER_NAMESPACE_AND_ORDINARY_CONTROLS')
 crosswalk=sealed(c['crosswalk']);check(c['crosswalk']['sha256']=='a60394f1f4aa978a0f6ffade5465e8b0e1cfea8e9a9ad6049ec214a3f3f1c621' and crosswalk['old_segments']==crosswalk['future_segments']==89 and crosswalk['same_numeric_ref_different_source']==38 and crosswalk['old_refs_absent_in_future_owner']==6 and crosswalk['same_numeric_ref_same_source']==45,'EXACT89_SOURCE_CROSSWALK_PARTITIONS')
 old_by_ref={seg['ref']:seg for row in oracle['units'] for seg in row['old_segments']};future_by_ref={seg['ref']:seg for row in oracle['units'] for seg in row['future_segments']};check(len(old_by_ref)==len(future_by_ref)==len(crosswalk['records'])==89,'ALL89_OLD_AND_CURRENT_IDENTITIES')
 for row in crosswalk['records']:
  for expected,current in [(row['old'],old_by_ref[row['old']['ref']]),(row['source_identical_future_owner'],future_by_ref[row['source_identical_future_owner']['ref']])]:
   check(all(expected.get(k)==current.get(k) for k in ('ref','offset','type','vri_paragraph','text_sha256')),'EACH_CROSSWALK_SOURCE_POSITION_MATCHES_ORACLE')
 package=a.server_dir.resolve().parent;check(str(a.server_dir.resolve()).endswith('/node_modules/pali-canon-mcp/server'),'GENUINE_INSTALLED_PACKAGE_REQUIRED');runtime=sealed(c['runtime_inventory']);install=sealed(c['install_receipt']);binding=sealed(c['final_commit_binding']);check(install['status']=='PASS' and binding['status']=='PASS' and binding['commit']==c['candidate_commit'],'EXACT_FINAL_PACKAGE_RECEIPTS');check(install['all39_archive_checkout_install_bytes_exact'] is True and binding['all39_commit_archive_installed_exact'] is True,'REAL_INSTALLED_ARCHIVE_GIT_BINDING');check(len(install['members'])==len(binding['members'])==39 and len(runtime['files'])==34 and inventory(package)==install['members']==binding['members'] and inventory(a.server_dir.resolve())==runtime['files'],'ALL39_INSTALLED_AND34_RUNTIME_BYTES');check(install['installed']==str(package),'INSTALL_DIRECTORY_BINDING');check(digest(Path(c['archive']['path']).read_bytes())==c['archive']['sha256']==install['archive_sha256']==binding['archive_sha256'],'SAME_ACTUAL_ARCHIVE');check(install['offline_npm_install'] is True and install['npm_scripts_executed'] is False and install['registry_downloads']==0 and install['observed_http_fetches']==0,'OFFLINE_NO_NOTIFIER_FETCH_RECEIPT')
 check(digest((a.server_dir/'data/apadana.json').read_bytes())==oracle['unchanged_apadana_manifest_sha256'],'ALL343_ENGLISH_CHOICES_UNCHANGED');check(len(json.loads((a.server_dir/'data/apadana.json').read_text())['links'])==343,'NO_ENGLISH_COVERAGE_GAIN')
 retained=sealed(c['retained_profile_observation']);check(c['retained_profile_observation']['sha256']=='f8bc0cfdcb97ed77e48076626754303a349041cc2aaa8d566853bc524213d664' and len(retained['profile_ids'])==len(retained['profile_object_sha256'])==343,'C1_ACTUAL343_PROFILE_AUTHORITY')
 exact_modules={'src/apadana-profiles.mjs','src/apadana-thera-profiles.mjs',*{'src/apadana-thera'+cohort+'-profiles.mjs' for cohort in ['261-280','281-285','287-288','292-299','301-310','312-319','321-329','331-334']}};check(set(retained['source_files'])==exact_modules,'EXACT_TEN_RETAINED_PROFILE_MODULES')
 for name,expected in retained['source_files'].items():
  source=Path(c['project'])/name;raw=source.read_bytes();check(not source.is_symlink() and len(raw)==expected['bytes'] and digest(raw)==expected['sha256'],'ALL343_PROFILE_SOURCE_MODULE_BYTES_UNCHANGED')
 html_path=Path(c['expected_source_widget_html']['path']);html_bytes=html_path.read_bytes();check(digest(html_bytes)==c['expected_source_widget_html']['sha256'],'REVIEWED_SOURCE_WIDGET_HTML');expected_html=html_bytes.decode();check(c['widget_version']=='v43','EXACT_REPAIRED_WIDGET_VERSION')
 stage=Path(tempfile.mkdtemp(prefix='s634-',dir='/tmp'));info=stage.lstat();check(stat.S_ISDIR(info.st_mode) and not stage.is_symlink() and info.st_uid==os.geteuid() and stat.S_IMODE(info.st_mode)==0o700 and len(str(stage))<=32,'OWNED_SHORT_BROWSER_TEMP');os.environ['TMPDIR']=str(stage);os.environ['PALI_BROWSER']=a.browser
 ledger=stage/'network.jsonl';ledger.write_text('');config=stage/'guard.json';config.write_text(compact({'mode':'deny-all','ledger':str(ledger),'files':[]}));empty=stage/'empty';empty.mkdir()
 with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 base=f'http://127.0.0.1:{port}';argv=['node','--require',str(HERE/'offline-pali-guard.cjs'),str(a.server_dir.resolve()/'http.cjs')];env={k:v for k,v in os.environ.items() if k not in ('NODE_OPTIONS','NODE_PATH','PALI_INTAKE_GATE_CONFIG')};env.update(HOST='127.0.0.1',PORT=str(port),CHATGPT_WIDGET='1',RATE_LIMIT_PER_MINUTE='0',PALI_INTAKE_GATE_CONFIG=str(config));child=subprocess.Popen(argv,cwd=empty,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
 report.update(contract_sha256=a.contract_sha,candidate_commit=c['candidate_commit'],stage=str(stage),server_argv=argv,server_pid=child.pid,owned_process_group=child.pid)
 try:
  for _ in range(100):
   try:urllib.request.urlopen(base+'/healthz',timeout=1).close();break
   except OSError:time.sleep(.1)
  else:raise GateError('INSTALLED_HTTP_STARTUP')
  phase='actual installed MCP and old locator refusals';metadata,widgets=api_cases(base,oracle)
  phase='both strict whole widget resources';check(c['widget_uris']==['ui://pali-canon/reader-v43.html','ui://pali-canon/reader-v43.skybridge.html'],'EXACT_TWO_WIDGET_URIS')
  for uri in c['widget_uris']:
   resource=protocol(base,'resources/read',{'uri':uri});check(len(resource['contents'])==1 and resource['contents'][0]['text']==expected_html,'STRICT_WHOLE_INSTALLED_WIDGET_EQUALS_REVIEWED_SOURCE')
  from playwright.sync_api import expect,sync_playwright
  phase='actual Chromium DOM with two simulated host bridges';pair_widgets(expected_html,widgets,report['checks'],oracle)
  phase='actual native six-boundary saved reading and synthetic local data'
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=a.browser,headless=True)
   try:
    for entry_path in ('/','/reader'):browser_cases(browser,base,metadata,oracle,stage,entry_path)
   finally:browser.close()
  events=[json.loads(x) for x in ledger.read_text().splitlines()];check(ledger.stat().st_size<=2097152 and all(x['kind'] in ('guard-ready','literal-loopback-resolution') for x in events),'NO_UPSTREAM_PROVIDER_REQUESTS')
  for event in events:
   if event['kind']=='guard-ready':check(event=={'sequence':1,'kind':'guard-ready','mode':'deny-all','allowlisted':0,'actual_network_forwarded':0},'EXACT_LAZY_WORKER_GUARD_INIT_ONLY')
   else:check(set(event)=={'sequence','kind','hostname','family','all'} and event['hostname']=='127.0.0.1' and event['family']==4 and isinstance(event['all'],bool),'ONLY_LITERAL_LOOPBACK_SERVER_RESOLUTION')
  check(inventory(package)==install['members'],'PACKAGE_CHANGED_DURING_ACCEPTANCE');report.update(status='passed',provider_ledger_sha256=digest(ledger.read_bytes()),upstream_requests=0,browser_run=True,physical_device=False,human_assistive_testing=False)
 finally:
  report['cleanup']=stop_owned(child)
  check(report['cleanup']['leader_reaped'] and report['cleanup']['group_absent'],'OWNED_PROCESS_GROUP_NOT_REAPED')
 signal.alarm(0)
if __name__=='__main__':
 try:main()
 except Exception as error:
  report.update(status='failed',failure={'phase':phase,'category':type(error).__name__,'code':str(error) if isinstance(error,GateError) else 'OPERATION_FAILED','frames':[{'file':Path(x.filename).name,'line':x.lineno,'function':x.name} for x in traceback.extract_tb(error.__traceback__)]})
 finally:
  # No error.message, source wording, private values, HTML or screenshots are logged.
  text=json.dumps(report,indent=2)+'\n';destination=None
  if '--report' in sys.argv:
   try:destination=Path(sys.argv[sys.argv.index('--report')+1]);destination.parent.mkdir(parents=True,exist_ok=True)
   except Exception:destination=None
  if destination and not destination.exists():
   with destination.open('x') as f:f.write(text)
  print(text);sys.exit(0 if report['status']=='passed' else 1)
