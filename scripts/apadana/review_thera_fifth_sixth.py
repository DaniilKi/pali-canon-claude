"""Independent source extraction and XML replay. No production parser imports."""
import pathlib,json,re,html,hashlib,gzip,argparse,xml.etree.ElementTree as ET
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root',type=pathlib.Path,action='append',required=True,help='Pinned publisher checkout containing src/. Supply one shared root or one root per goldens file.')
parser.add_argument('--goldens',type=pathlib.Path,action='append',required=True,help='Independent D249 source-review golden JSON. Repeat for the fifth and sixth groups.')
parser.add_argument('--canon',type=pathlib.Path,required=True,help='Unpacked compact canonical JSON or gzip JSON, preserving its pinned VRI source.')
parser.add_argument('--xml',type=pathlib.Path,required=True,help='Exact original s0510m1.mul.xml at the pinned VRI revision.')
parser.add_argument('--output-dir',type=pathlib.Path,required=True,help='Directory for metadata/hash-only review receipts.')
args=parser.parse_args()
assert len(args.goldens)==2, 'D249 requires the independently reviewed fifth and sixth golden inputs'
assert len(args.source_root)in[1,len(args.goldens)], 'Supply one shared source root or one per goldens input'
D=args.output_dir;D.mkdir(parents=True,exist_ok=True);B='a154013eded45f6ee319fff5cc246ed563811c55'
source_roots=args.source_root*len(args.goldens)if len(args.source_root)==1 else args.source_root
EXPECTED={41:'tha-ap43',43:'tha-ap45',44:'tha-ap46',45:'tha-ap47',46:'tha-ap48',47:'tha-ap49',48:'tha-ap50',49:'tha-ap51',50:'tha-ap52',51:'tha-ap53',52:'tha-ap54',53:'tha-ap55',54:'tha-ap56',55:'tha-ap57',56:'tha-ap58',57:'tha-ap59',58:'tha-ap60',59:'tha-ap61',60:'tha-ap62'}
sha=lambda v:hashlib.sha256(v.encode()if isinstance(v,str)else v).hexdigest();j=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':'));clean=lambda s:re.sub(r'\s+',' ',s).strip()
def present(value):
 value=re.sub(r'\[([^\[\]]*)\]\{\.diacritics data-state=on\}\[([^\[\]]*)\]\{\.no-diacritics data-state=off\}',lambda m:m[1],value)
 value=re.sub(r'<span class="diacritics" data-state="on">(c|cc)</span><span class="no-diacritics" data-state="off">(ch|chch)</span>',lambda m:m[1]if m[2]==('ch'if m[1]=='c'else'chch')else (_ for _ in[]).throw(ValueError('Unexpected display')),value)
 value=re.sub(r'<dfn id="#(?:PTS|BJTS)">(<abbr title="[^"]*">[^<>]*</abbr>)</dfn>',lambda m:m[1],value)
 value=re.sub(r'<a href="#(?:PTS|BJTS)" class="abbr">([^<>]*)</a>',lambda m:m[1],value)
 value=re.sub(r'<abbr title="[^"]*">([^<>]*)</abbr>',lambda m:m[1],value)
 assert '<'not in value and '>'not in value and '{.diacritics'not in value
 value=re.sub(r'\[\^(\d+)\]',r'[Note \1]',value);value=html.unescape(value);value=re.sub(r'\\([\\`*{}\[\]()#+.!_>\-])',lambda m:m[1],value);value=re.sub(r'^#{1,3}\s+','',value,flags=re.M);value=re.sub(r'\*([^*\n]+)\*',r'\1',value);value=re.sub(r'[ \t]+\n','\n',value);return re.sub(r'\n{3,}','\n\n',value).strip()
canonical_bytes=args.canon.read_bytes();canon=json.loads(gzip.decompress(canonical_bytes)if canonical_bytes[:2]==b'\x1f\x8b'else canonical_bytes);assert canon['source']['commit']=='2d134ff9ef60f70a1eb03c9370580228811a3070'
# The same VRI revision can occur in stale temporary indexes; D249 preserves this exact repaired canonical snapshot.
assert sha(j(canon))=='49701605d61352898b3970143192e12b3509dbda966cfb42511e2af0e5f790a1', 'Canonical snapshot differs from the reviewed a154/D249 data'
units={u['id']:u for u in canon['units']}
xml=args.xml;data=xml.read_bytes();assert sha(data)=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1';tree=ET.fromstring(data)
def visible(e):
 out=e.text or '';skipdot=False
 for c in e:
  if c.tag=='note' or(c.tag=='hi'and c.get('rend')=='paranum'):skipdot=c.tag=='hi'
  elif c.tag=='hi'and c.get('rend')=='dot'and skipdot:skipdot=False
  else:out+=visible(c);skipdot=False
  out+=c.tail or ''
 return out
blocks=[]
for e in tree.iter():
 if e.tag not in ['head','p','trailer']:continue
 text=clean(html.unescape(visible(e)));rend=e.get('rend',e.tag);n=e.get('n')
 if not text and rend!='hangnum'and not n:continue
 notes=[clean(html.unescape(''.join(c.itertext())))for c in e.iter('note')];pages={}
 def walk(e):
  for c in e:
   if c.tag=='note'or(c.tag=='hi'and c.get('rend')in ['paranum','dot']):continue
   if c.tag=='pb':
    v=c.get('n','').split('.');assert len(v)==2;pages.setdefault(c.get('ed'),[]).append(str(int(v[0]))+'.'+str(int(v[1])))
   walk(c)
 walk(e);blocks.append([rend,n,text,notes,pages])
rootbook=next(b for b in canon['books']if b['file']=='s0510m1.mul.xml');assert len(blocks)==14645
for i,(a,b)in enumerate(zip(blocks,rootbook['blocks'])):assert a==b,(i,a,b)
rows=[];compared=[]
for source_root,goldens_path in zip(source_roots,args.goldens):
 gold=json.loads(goldens_path.read_text(encoding='utf-8'));assert gold['baseline']==B and gold['publisher_revision']=='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4' and gold['vri_revision']=='2d134ff9ef60f70a1eb03c9370580228811a3070';rights=gold['rights']+[gold['publisher_routing']]
 for r in rights:
  b=(source_root/r['path']).read_bytes();assert len(b)==r['bytes']and sha(b)==r['raw_sha256'];assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==r['git_blob_sha1']
 for g in gold['poems']:
  number=g['poem']
  if number==42:continue
  assert EXPECTED.get(number)==g['id'], 'Unreviewed or misidentified D249 poem'
  raw=(source_root/g['path']).read_text(encoding='utf-8');assert sha(raw)==g['raw_sha256'];assert hashlib.sha1(b'blob '+str(len(raw.encode())).encode()+b'\0'+raw.encode()).hexdigest()==g['git_blob_sha1']
  front,rest=re.match(r'^---\n(.*?)\n---\n(.*)$',raw,re.S).groups();assert re.search(r'^order: '+str(number)+'$',front,re.M)and re.search(r'^category: chapter-3$',front,re.M);title=re.search(r'^title: (.+)$',front,re.M)[1];assert title==g['title']
  assert not re.search(r'(?i)audio|youtube|\.mp3|\.wav',front)
  rest=rest.strip();at=re.search(r'^\[\^\d+\]:',rest,re.M);assert at;body=rest[:at.start()].strip();tail=rest[at.start():]
  defs=list(re.finditer(r'^\[\^(\d+)\]:\s*(.*?)(?=^\[\^\d+\]:|\Z)',tail,re.M|re.S));notes=[{'number':int(x[1]),'text':present(x[2])}for x in defs];assert[n['number']for n in notes]==list(range(1,len(notes)+1));assert all(n['text']for n in notes)
  division=None
  if number==49:
   marker='The Fifth Recitation Portion.  \n';assert body.count(marker)==1;before,after=body.split(marker);assert re.search(r'\(14\) \\\[1228\\\]$',before.strip());assert re.search(r'\(15\) \\\[1229\\\]',after.split('\n\n')[0]);division={'text_sha256':sha(present(marker)),'before_local_label':'15','before_publisher_label':'1229','notes_sha256':sha('[]'),'note_numbers':[]};body=before+after
  summary=None
  if number in [50,60]:
   marker='\n\nThe Summary:\n\n';assert body.count(marker)==1;body,end=body.split(marker);summarytext=present('The Summary:\n\n'+end);summary={'body_sha256':sha(summarytext),'paragraphs':[{'sha256':sha(p),'lines':len(p.split('\n'))}for p in summarytext.split('\n\n')],'note_numbers':[]};assert not re.search(r'\[Note \d+\]',summarytext)
  at=body.index('### ');assert len(re.findall(r'^### ',body,re.M))==1;preface=present(body[:at]);text=present(body[at:]);paragraphs=text.split('\n\n');assert bool(preface)==(number in [41,51]);assert re.search(r'^Thus indeed',paragraphs[-2]);assert re.search(r'^The [lL]egend of',paragraphs[-1]);refs=[int(n)for n in re.findall(r'\[Note (\d+)\]',text)];assert set(refs)==set(n['number']for n in notes)
  layout=[]
  for p in paragraphs[1:-2]:
   no_notes=re.sub(r'\[Note \d+\]','',p).strip();match=re.search(r'\((\d+(?:-\d+)?)\)\s+\[+([0-9a-z-]+)\]$',no_notes);assert match,(number,no_notes[-100:]);layout.append({'local_label':match[1],'publisher_label':match[2],'suffix':match[0],'lines':len(p.split('\n'))})
  uid=g['id'];u=units[uid];root={'id':uid,'book':u['book'],'start':u['start'],'end':u['end'],'blocks':canon['books'][u['book']]['blocks'][u['start']:u['end']]};r={'id':uid,'poem':number,'title':title,'raw_sha256':sha(raw),'body_sha256':sha(text),'notes_sha256':sha(j(notes)),'paratext_sha256':sha(preface),'stanza_layout':layout,'paragraphs':[{'sha256':sha(p),'lines':len(p.split('\n'))}for p in paragraphs],'notes':[{'number':n['number'],'body_sha256':sha(n['text'])}for n in notes],'root_sha256':sha(j(root)),'summary':summary,'division':division}
  for k in ['body_sha256','notes_sha256','paratext_sha256','stanza_layout']:assert r[k]==g[k],(number,k,r[k],g[k])
  assert r['root_sha256']==g['root']['root_sha256'];assert len(paragraphs)==len(g['body_paragraphs']);assert all(r['paragraphs'][i]['sha256']==p['sha256']and r['paragraphs'][i]['lines']==p['lines']for i,p in enumerate(g['body_paragraphs']));assert all(r['notes'][i]['body_sha256']==n['body_sha256']for i,n in enumerate(g['notes']))
  if summary:assert summary['body_sha256']==g['chapter_summary']['body_sha256']
  rows.append(r);compared.append({'poem':number,'id':uid,'body_paragraphs':len(paragraphs),'stanzas':len(layout),'notes':len(notes),'all_hashes_match':True})
assert {r['poem']:r['id']for r in rows}==EXPECTED and len(rows)==19
inputs={'source_roots':[str(p)for p in source_roots],'goldens':[{ 'path':str(p),'sha256':sha(p.read_bytes())}for p in args.goldens],'canon':{'path':str(args.canon),'sha256':sha(canonical_bytes)},'xml':{'path':str(xml),'sha256':sha(data)}}
out={'inputs':inputs,'base_commit':B,'independence':'Separate Python parser and ElementTree XML replay, no source-agent extraction functions or production English/VRI parsers imported','original_xml_sha256':sha(data),'full_original_xml_blocks_exact':len(blocks),'poems':rows,'totals':{'poems':len(rows),'stanzas':sum(len(r['stanza_layout'])for r in rows),'body_paragraphs':sum(len(r['paragraphs'])for r in rows),'notes':sum(len(r['notes'])for r in rows)}};(D/'INDEPENDENT_GOLDENS.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(D/'EXTRACTION_COMPARISON.json').write_text(json.dumps({'base_commit':B,'all19_match':True,'differences':[],'rows':compared,'totals':out['totals'],'rights_rehashed_per_group':7,'full_original_xml_blocks_exact':14645,'production_parser_imports':0,'inputs':inputs},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(out['totals']))
