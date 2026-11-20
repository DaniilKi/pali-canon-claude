"""Fixed-epoch independent Therā publisher181–220 source extraction. No production parser imports.
Requires the exact unchanged94c6073 canon snapshot; existing70/140/158/159 remain held.
"""
import argparse,pathlib,json,gzip,hashlib,re,html,xml.etree.ElementTree as ET
P=argparse.ArgumentParser(description=__doc__)
P.add_argument('--source-root',type=pathlib.Path,action='append',required=True)
P.add_argument('--goldens',type=pathlib.Path,action='append',required=True)
P.add_argument('--canon',type=pathlib.Path,required=True)
P.add_argument('--xml',type=pathlib.Path,required=True)
P.add_argument('--output-dir',type=pathlib.Path,required=True)
A=P.parse_args()
B='94c607310845b84dc3cd51ba3a19ce6fecd28683';PUB='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';VRI='2d134ff9ef60f70a1eb03c9370580228811a3070'
CANON='1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
# Frozen by independent reviewer after the source agents have sealed their work.
SEALED_GOLDENS={'THERA_NINETEENTH_GOLDENS.json': '3e31c2def0c65d0c0a561911a06f601623ea0c84c51f199307ab514076cd0ee0', 'THERA_TWENTIETH_GOLDENS.json': '318ad1831dfc57a17ead4112e1d115df42ee87e3adac18ac0db3573ec9bce49a', 'THERA_TWENTY_FIRST_GOLDENS.json': 'f69238f30fc3f8ed0579f2e7818ec8458e1a73c9be03d0d73c44720fbfb2cfcd', 'THERA_TWENTY_SECOND_GOLDENS.json': '921f5678f24bac155e9ec294e6ddc0d677aa1facc04835d060b17bbddc2b4af7'}

def sha(v):return hashlib.sha256(v.encode()if isinstance(v,str)else v).hexdigest()
def js(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
assert len(A.goldens)==4 and len(A.source_root)in[1,4]
assert {p.name:sha(p.read_bytes())for p in A.goldens}==SEALED_GOLDENS,'Source-review seals differ'
roots=A.source_root*4 if len(A.source_root)==1 else A.source_root
raw=A.canon.read_bytes();c=json.loads(gzip.decompress(raw)if raw[:2]==b'\x1f\x8b'else raw)
assert c['source']['commit']==VRI and sha(js(c))==CANON,'Exact post-pair canonical snapshot required; stale or tampered indexes refuse'
us={u['id']:u for u in c['units']};assert len(us)==8544 and len(c['books'])==61
for uid,span,vri in [('tha-ap107',(5231,5248),'24–28'),('tha-ap108',(5248,5271),'29–35')]:
 u=us[uid];assert(u['start'],u['end'])==span and u['vri']==vri and u['index_revision']=='apadana-thera105-106-v1'
x=A.xml.read_bytes();assert sha(x)=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
def clean(t):return re.sub(r'\s+',' ',html.unescape(t)).strip()
def visible(e):
 t=e.text or '';skip=False
 for z in e:
  if z.tag=='note'or(z.tag=='hi'and z.get('rend')=='paranum'):skip=z.tag=='hi'
  elif z.tag=='hi'and z.get('rend')=='dot'and skip:skip=False
  else:t+=visible(z);skip=False
  t+=z.tail or ''
 return t
blocks=[]
for e in ET.fromstring(x).iter():
 if e.tag not in ['head','p','trailer']:continue
 t=clean(visible(e));r=e.get('rend',e.tag);n=e.get('n')
 if not t and r!='hangnum'and not n:continue
 pages={}
 def walk(e):
  for z in e:
   if z.tag=='note'or(z.tag=='hi'and z.get('rend')in['paranum','dot']):continue
   if z.tag=='pb':pages.setdefault(z.get('ed'),[]).append('.'.join(str(int(v))for v in z.get('n').split('.')))
   walk(z)
 walk(e);blocks.append([r,n,t,[clean(''.join(z.itertext()))for z in e.iter('note')],pages])
assert len(blocks)==14645 and blocks==c['books'][36]['blocks'] and c['books'][36]['file']=='s0510m1.mul.xml'
def segments(u):
 out=[];s=None
 def flush():
  nonlocal s
  if s is not None:out.append(s);s=None
 for i in range(u['start'],u['end']):
  r,n,t,nt,pg=blocks[i]
  if r=='hangnum':flush();s=dict(type='verse',vri_paragraph=n,text='',blocks=[i,i+1],variant_count=0);continue
  if r in['gatha1','gatha2','gatha3','gathalast']:
   if s is None:s=dict(type='verse',vri_paragraph=n,text='',blocks=[i,i+1],variant_count=0)
   s['blocks'][1]=i+1;s['text']+=('\n'if s['text']else'')+t;s['variant_count']+=len(nt)
   if r=='gathalast':flush()
   continue
  flush()
  if t:out.append(dict(type='heading'if r in['subhead','title','chapter','book','nikaya','subsubhead']or(r=='centre'and re.search(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$',t,re.I))else'prose',vri_paragraph=n,text=t,blocks=[i,i+1],variant_count=len(nt)))
 flush();return[dict(ref=u['id']+'/'+str(i+1),type=s['type'],blocks=s['blocks'],vri_paragraph=s['vri_paragraph'],text_sha256=sha(s['text']),variant_count=s['variant_count'])for i,s in enumerate(out)]
def present(v):
 v=re.sub(r'\[([^\[\]]*)\]\{\.diacritics data-state=on\}\[([^\[\]]*)\]\{\.no-diacritics data-state=off\}',lambda m:m[1],v)
 v=re.sub(r'<span class="diacritics" data-state="on">c</span><span class="no-diacritics" data-state="off">ch</span>','c',v)
 v=re.sub(r'<abbr title="[^"]*">([^<>]*)</abbr>',lambda m:m[1],v)
 assert not any(x in v for x in['<','>','{.diacritics','{.no-diacritics']),'Unapproved display markup'
 v=re.sub(r'\[\^(\d+)\]',r'[Note \1]',v);v=html.unescape(v)
 v=re.sub(r'\\([\\`*{}\[\]()#+.!_>\-])',lambda m:m[1],v);v=re.sub(r'^#{1,3}\s+','',v,flags=re.M);v=re.sub(r'\*([^*\n]+)\*',r'\1',v);v=re.sub(r'[ \t]+\n','\n',v)
 return re.sub(r'\n{3,}','\n\n',v).strip()
def paragraphs(v):return[dict(sha256=sha(p),lines=len(p.split('\n')))for p in v.split('\n\n')]if v else[]
def checkparas(v,g):
 actual=paragraphs(v);assert len(actual)==len(g)
 for a,b in zip(actual,g):assert all(a[k]==b[k]for k in a)
def rootpin(uid,start,end):return sha(js(dict(id=uid,book=36,start=start,end=end,blocks=blocks[start:end])))
rows=[];held=[];rights=[]
for sr,gp in zip(roots,A.goldens):
 g=json.loads(gp.read_bytes());assert(g['baseline'],g['publisher_revision'],g['vri_revision'])==(B,PUB,VRI)
 for q in g['rights']+[g['publisher_routing']]:
  b=(sr/q['path']).read_bytes();assert len(b)==q['bytes']and sha(b)==q['raw_sha256']and hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==q['git_blob_sha1'];rights.append(dict(path=q['path'],sha256=sha(b)))
 for q in g['poems']:
  n=q['poem'];uid='tha-ap'+str(n+2);assert uid==q['id']and 181<=n<=220
  b=(sr/q['path']).read_bytes();assert sha(b)==q['raw_sha256']and len(b)==q['bytes']and hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==q['git_blob_sha1']
  fm,body=re.fullmatch(r'---\n(.*?)\n---\n(.*)',b.decode(),re.S).groups();assert re.search(r'^order: '+str(n)+'$',fm,re.M)and re.search(r'^category: chapter-3$',fm,re.M);assert re.search(r'^title: (.+)$',fm,re.M)[1]==q['title'];assert not re.search(r'(?i)audio|\.mp3|\.wav|youtube',fm)
  body=body.strip();m=re.search(r'^\[\^\d+\]:',body,re.M);assert m;body,nt=body[:m.start()].strip(),body[m.start():]
  notes=[dict(number=int(z[1]),text=present(z[2]))for z in re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',nt,re.M|re.S)];assert[n['number']for n in notes]==list(range(1,len(notes)+1))
  summary=None;collection=None
  if n==200:
   marker='\n\nThen there is the Summary of Chapters:\n\n';assert body.count(marker)==1;body,end=body.split(marker);collection=marker.strip()+'\n\n'+end
  if n in[190,200,210,220]:
   assert body.count('\n\nThe Summary:\n\n')==1;body,end=body.split('\n\nThe Summary:\n\n');summary='The Summary:\n\n'+end
  assert q['source_scope_decision'].startswith('APPROVE')
  match=list(re.finditer(r'^#{2,3} \\\[\d+\.',body,re.M));assert len(match)==1;at=match[0].start();preface=present(body[:at]);text=present(body[at:]);assert bool(preface)==(n in[181,191,201,211]);poemnotes=[z for z in notes if not(n==190 and z['number']==7)and not(n==200 and z['number']in[5,6,7])]
  assert sha(text)==q['body_sha256']and sha(js(poemnotes))==q['notes_sha256']and sha(preface)==q['paratext_sha256'],(n,'body/notes/preface')
  checkparas(text,q['body_paragraphs']);assert[{k:z[k]for k in['number']}|{'body_sha256':sha(z['text'])}for z in notes]==[{k:z[k]for k in['number','body_sha256']}for z in q['notes']],(n,'every note')
  assert set(map(int,re.findall(r'\[Note (\d+)\]',text)))==set(z['number']for z in poemnotes)
  pp=text.split('\n\n');assert pp[-1].endswith('Thera is finished' + ('' if n==212 else '.'));endpos=len(pp)-(1 if n==182 else 2);layout=[]
  if n==208:
   assert len(pp)==7 and len(pp[0].split('\n'))==5
   stanza_paragraphs=[(i,'\n'.join(pp[i].split('\n')[1:])if i==0 else pp[i])for i in range(5)]
  else:stanza_paragraphs=list(enumerate(pp[1:endpos],1))
  for i,p in stanza_paragraphs:
   v=re.sub(r'\[Note \d+\]','',p);matches=list(re.finditer(r'\((\d+(?:-\d+)?)\)(?:\s+\[([0-9-]+)(\]|\)))?',v));assert len(matches)==1,(n,i)
   m=matches[0];entry=dict(local_label=m[1],publisher_label=m[2],suffix=m[0],lines=len(p.split('\n')))
   if n==208:entry.update(paragraph=i,first_line=2 if i==0 else 1)
   layout.append(entry)
  assert layout==q['stanza_layout'],(n,'layout',layout,q['stanza_layout'])
  if n==182:assert len(pp[-1].split('\n'))==2 and len(layout)==6
  if n==190:assert b.decode().count('<span class="diacritics" data-state="on">c</span><span class="no-diacritics" data-state="off">ch</span>')==5
  if n==199:assert [e['local_label']for e in layout].count('5')==2 and '[offered [it]'in text
  if n==208:
   proof=q['joined_heading_stanza'];rawpp=body[at:].strip().split('\n\n')[0];rawlines=rawpp.split('\n');lines=pp[0].split('\n')
   assert (proof['owner_id'],proof['publisher_poem'],proof['body_paragraph'],proof['body_paragraph_count'],proof['first_paragraph_lines'])==(uid,n,0,7,5)
   for field,value in [('raw_heading_line_sha256',rawlines[0]),('rendered_heading_line_sha256',lines[0]),('raw_first_physical_paragraph_sha256',rawpp),('rendered_first_physical_paragraph_sha256',pp[0]),('raw_first_stanza_lines_sha256','\n'.join(rawlines[1:])),('rendered_first_stanza_lines_sha256','\n'.join(lines[1:]))]:assert sha(value)==proof[field],(n,field)
   for (i,stanza),entry,pin in zip(stanza_paragraphs,layout,proof['stanza_entry_pins']):
    assert pin==entry|dict(body_sha256=sha(stanza),characters=len(stanza)),(n,'entry pin')
   assert len(proof['stanza_entry_pins'])==5 and sha('\n\n'.join(p for i,p in stanza_paragraphs))==proof['quotation_body_sha256']
   assert proof['source_wording_or_paragraphs_changed']is False
  if n==204:
   om=q['omitted_vri_stanza'];assert (om['vri_paragraph'],om['root_start'],om['root_end'])==('19',7487,7490)
   assert rootpin(uid,7487,7490)==om['root_sha256']and om['publisher_translation_present']is False and om['publisher_explanation_present']is False
   assert om['segment']in q['root']['segments'] and len(layout)==5 and q['root']['numbered_stanza_count']==6

  u=us[uid];rp=q['root'];assert(u['book'],u['start'],u['end'],u['title'],u['vri'],u.get('index_revision'))==(36,rp['start'],rp['end'],rp['title'],rp['vri'],rp.get('index_revision'));assert rootpin(uid,u['start'],u['end'])==rp['root_sha256'];sg=segments(u);assert sg==rp['segments'],(n,'segments',sg,rp['segments'])
  if summary:
   sm=q['chapter_summary'];st=present(summary);sn=[z for z in notes if(n==190 and z['number']==7)or(n==200 and z['number']==5)];assert sha(st)==sm['body_sha256']and sha(js(sn))==sm['notes_sha256'];checkparas(st,sm.get('body_paragraphs',sm.get('paragraphs')));assert set(map(int,re.findall(r'\[Note (\d+)\]',st)))==set(sm['note_numbers']);assert rootpin(uid,sm['root_start'],sm['root_end'])==sm['root_sha256'];assert sm['parent_id']==uid and u['start']<=sm['root_start']<sm['root_end']<=u['end']
  if collection:
   sm=q['collection_summary'];st=present(collection);sn=[z for z in notes if z['number']in[6,7]]
   assert n==200 and sha(st)==sm['body_sha256'] and sha(js(sn))==sm['notes_sha256'];checkparas(st,sm.get('body_paragraphs',sm.get('paragraphs')))
   assert sm['note_numbers']==[6,7] and set(map(int,re.findall(r'\[Note (\d+)\]',st)))=={6,7} and rootpin(uid,sm['root_start'],sm['root_end'])==sm['root_sha256']
   assert sm['parent_id']==uid and u['start']<=sm['root_start']<sm['root_end']<=u['end']
  rows.append(dict(poem=n,id=uid,local_labels=sum(int(e['local_label'].split('-')[-1])-int(e['local_label'].split('-')[0])+1 for e in layout),original_notes=len(notes),body_sha256=sha(text),notes_sha256=sha(js(poemnotes)),paratext_sha256=sha(preface),root_sha256=rp['root_sha256'],paragraphs=len(pp),printed_entries=len(layout),notes=len(poemnotes)))
assert[n['poem']for n in rows]==list(range(181,221)) and held==[]
A.output_dir.mkdir(parents=True,exist_ok=True)
receipt=dict(review_epoch='94c6073/approved181-220/unchanged-canon/no-new-locator',baseline=B,publisher_revision=PUB,vri_revision=VRI,canon_logical_sha256=sha(js(c)),goldens=[dict(name=p.name,sha256=sha(p.read_bytes()))for p in A.goldens],full_original_xml_blocks_exact=14645,production_parser_imports=0,rights_artifacts_rehashed=rights,approved=rows,held=held,totals=dict(poems=len(rows),body_paragraphs=sum(z['paragraphs']for z in rows),printed_entries=sum(z['printed_entries']for z in rows),poem_notes=sum(z['notes']for z in rows),original_notes=sum(z['original_notes']for z in rows),local_labels=sum(z['local_labels']for z in rows)))
(A.output_dir/'INDEPENDENT_SOURCE_REPLAY.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print(json.dumps(receipt['totals']))
