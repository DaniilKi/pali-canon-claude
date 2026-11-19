"""Fixed-epoch independent Therā publisher141–180 source extraction. No production parser imports.
Requires the exact unchanged05fc canon snapshot; publisher158/159 remain held.
"""
import argparse,pathlib,json,gzip,hashlib,re,html,xml.etree.ElementTree as ET
P=argparse.ArgumentParser(description=__doc__)
P.add_argument('--source-root',type=pathlib.Path,action='append',required=True)
P.add_argument('--goldens',type=pathlib.Path,action='append',required=True)
P.add_argument('--canon',type=pathlib.Path,required=True)
P.add_argument('--xml',type=pathlib.Path,required=True)
P.add_argument('--output-dir',type=pathlib.Path,required=True)
A=P.parse_args()
B='05fc4e29540fc0799145dc28838bedb7d964b2c7';PUB='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';VRI='2d134ff9ef60f70a1eb03c9370580228811a3070'
CANON='1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
# Frozen by independent reviewer after the source agents have sealed their work.
SEALED_GOLDENS={'THERA_FIFTEENTH_GOLDENS.json':'787881e778e68b2c6aa307cc00231138c7301d353469d80969cd8dae3f34dc05','THERA_SIXTEENTH_GOLDENS.json':'baf49911d45f09c26447437a40695c0747b748d4526557dc38b4a684547d2d61','THERA_SEVENTEENTH_GOLDENS.json':'c71f8f9903d20168e42000ce1d22811abbe15571ee8d1734184d79383246071a','THERA_EIGHTEENTH_GOLDENS.json':'f393a0809314ce216316261e2338d79c06acf1af860b5b11d8b778033b931e07'}

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
 v=re.sub(r'<span class="diacritics" data-state="on">cc</span><span class="no-diacritics" data-state="off">chch</span>','cc',v)
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
  n=q['poem'];uid='tha-ap'+str(n+2);assert uid==q['id']and 141<=n<=180
  b=(sr/q['path']).read_bytes();assert sha(b)==q['raw_sha256']and len(b)==q['bytes']and hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==q['git_blob_sha1']
  fm,body=re.fullmatch(r'---\n(.*?)\n---\n(.*)',b.decode(),re.S).groups();assert re.search(r'^order: '+str(n)+'$',fm,re.M)and re.search(r'^category: chapter-3$',fm,re.M);assert re.search(r'^title: (.+)$',fm,re.M)[1]==q['title'];assert not re.search(r'(?i)audio|\.mp3|\.wav|youtube',fm)
  body=body.strip();m=re.search(r'^\[\^\d+\]:',body,re.M);assert m;body,nt=body[:m.start()].strip(),body[m.start():]
  notes=[dict(number=int(z[1]),text=present(z[2]))for z in re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',nt,re.M|re.S)];assert[n['number']for n in notes]==list(range(1,len(notes)+1))
  summary=None
  if n in[150,160,170,180]:
   assert body.count('\n\nThe Summary:\n\n')==1;body,end=body.split('\n\nThe Summary:\n\n');summary='The Summary:\n\n'+end
  if n in[158,159]:
   assert q['source_scope_decision'].startswith('HOLD'),'Boundary sources must remain explicitly held'
   u=us[uid]
   assert (u['start'],u['end'],u['vri'])==({158:(6576,6603,'39–46'),159:(6603,6616,'47–50')}[n])
   assert blocks[6599][0]=='subhead' and 'Punnāga' in blocks[6599][2] and blocks[6600][:2]==['hangnum','46']
   held.append(dict(poem=n,id=uid,raw_sha256=sha(b),reason='Current metadata does not own exactly the complete source poem; split6599 proposal only, no canonical or private-locator migration.'))
   continue
  assert q['source_scope_decision'].startswith('APPROVE')
  match=list(re.finditer(r'^#{2,3} \\\[\d+\.',body,re.M));assert len(match)==1;at=match[0].start();preface=present(body[:at]);text=present(body[at:]);assert bool(preface)==(n in[141,151,161,171]);poemnotes=notes
  assert sha(text)==q['body_sha256']and sha(js(poemnotes))==q['notes_sha256']and sha(preface)==q['paratext_sha256'],(n,'body/notes/preface')
  checkparas(text,q['body_paragraphs']);assert[{k:z[k]for k in['number']}|{'body_sha256':sha(z['text'])}for z in notes]==[{k:z[k]for k in['number','body_sha256']}for z in q['notes']],(n,'every note')
  assert set(map(int,re.findall(r'\[Note (\d+)\]',text)))==set(z['number']for z in poemnotes)
  pp=text.split('\n\n');assert pp[-1].endswith('Thera is finished.');endpos=len(pp)-2;layout=[]
  for i,p in enumerate(pp[1:endpos],1):
   v=re.sub(r'\[Note \d+\]','',p);matches=list(re.finditer(r'\((\d+(?:-\d+)?)\)(?:\s+\[([0-9-]+)(\]|\)))?',v));assert matches,(n,i)
   es=[dict(local_label=z[1],publisher_label=z[2],suffix=z[0],line=1+v[:z.end()].count('\n'))for z in matches]
   if len(es)==1:layout.append({k:es[0][k]for k in['local_label','publisher_label','suffix']}|{'lines':len(p.split('\n'))})
   else:raise AssertionError((n,'Unreviewed multiple-label physical paragraph'))
  assert layout==q['stanza_layout'],(n,'layout',layout,q['stanza_layout'])
  u=us[uid];rp=q['root'];assert(u['book'],u['start'],u['end'],u['title'],u['vri'],u.get('index_revision'))==(36,rp['start'],rp['end'],rp['title'],rp['vri'],rp.get('index_revision'));assert rootpin(uid,u['start'],u['end'])==rp['root_sha256'];sg=segments(u);expected_sg=[dict(ref=z['ref'],offset=i,root_start=z['blocks'][0],root_end=z['blocks'][1],text_sha256=z['text_sha256'],vri_paragraph=z['vri_paragraph'],rends=[bl[0] for bl in blocks[z['blocks'][0]:z['blocks'][1]]]) for i,z in enumerate(sg)] if n<=160 else sg;assert expected_sg==rp['segments'],(n,'segments',expected_sg,rp['segments'])
  if summary:
   sm=q['chapter_summary'];st=present(summary);sn=[];assert sha(st)==sm['body_sha256']and sha(js(sn))==sm['notes_sha256'];checkparas(st,sm.get('body_paragraphs',sm.get('paragraphs')));assert set(map(int,re.findall(r'\[Note (\d+)\]',st)))==set(sm['note_numbers']);assert rootpin(uid,sm['root_start'],sm['root_end'])==sm['root_sha256'];assert sm['parent_id']==uid and u['start']<=sm['root_start']<sm['root_end']<=u['end']
  rows.append(dict(poem=n,id=uid,body_sha256=sha(text),notes_sha256=sha(js(poemnotes)),paratext_sha256=sha(preface),root_sha256=rp['root_sha256'],paragraphs=len(pp),printed_entries=len(layout),notes=len(poemnotes)))
assert[n['poem']for n in rows]==list(range(141,158))+list(range(160,181)) and[n['poem']for n in held]==[158,159]
A.output_dir.mkdir(parents=True,exist_ok=True)
receipt=dict(review_epoch='05fc/38approved141-157,160-180/158-159held/unchanged-canon',baseline=B,publisher_revision=PUB,vri_revision=VRI,canon_logical_sha256=sha(js(c)),goldens=[dict(name=p.name,sha256=sha(p.read_bytes()))for p in A.goldens],full_original_xml_blocks_exact=14645,production_parser_imports=0,rights_artifacts_rehashed=rights,approved=rows,held=held,totals=dict(poems=len(rows),body_paragraphs=sum(z['paragraphs']for z in rows),printed_entries=sum(z['printed_entries']for z in rows),poem_notes=sum(z['notes']for z in rows)))
(A.output_dir/'INDEPENDENT_SOURCE_REPLAY.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print(json.dumps(receipt['totals']))
