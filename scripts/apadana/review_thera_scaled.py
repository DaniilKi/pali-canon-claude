"""Independent source extraction and XML replay. No production parser imports."""
import pathlib,json,re,html,hashlib,gzip,argparse,xml.etree.ElementTree as ET
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root',type=pathlib.Path,action='append',required=True,help='Pinned publisher checkout containing src/. Supply one shared root or one root per goldens file.')
parser.add_argument('--goldens',type=pathlib.Path,action='append',required=True,help='One of five independently sealed D250 source-review golden JSON files.')
parser.add_argument('--canon',type=pathlib.Path,required=True,help='Unpacked compact canonical JSON or gzip JSON, preserving its pinned VRI source.')
parser.add_argument('--xml',type=pathlib.Path,required=True,help='Exact original s0510m1.mul.xml at the pinned VRI revision.')
parser.add_argument('--output-dir',type=pathlib.Path,required=True,help='Directory for metadata/hash-only review receipts.')
args=parser.parse_args()
assert len(args.goldens)==5, 'D250 requires exactly five independently sealed source reviews'
assert {hashlib.sha256(p.read_bytes()).hexdigest()for p in args.goldens}=={'1aa8fadf962964ddf1ee2faefa86bcf3914944337ba61b7e2214600170210ac8', '2bbc739ecb97d198ecc0e4f6d599569bc846c74e03744367c649d3e87309db89', '7071e9ceaa4475a974b30ee7afa43cd8f5186c30e198e8290752b340972fca68', '4297ca598c8f0b78176f5e74cf158a581ce173a022f9c070ce3d8f9cce044d8b', '070286aa013457d7bd387121945b8b720b83f1aeb1f6a788409594535de712f5'}, 'D250 source-review input seals differ'
assert len(args.source_root)in[1,len(args.goldens)], 'Supply one shared source root or one per goldens input'
D=args.output_dir;D.mkdir(parents=True,exist_ok=True);B='64a336789ab5f4f02964ff3023ea6b26b330e406'
source_roots=args.source_root*len(args.goldens)if len(args.source_root)==1 else args.source_root
EXPECTED={42: 'tha-ap44', 61: 'tha-ap63', 62: 'tha-ap64', 63: 'tha-ap65', 64: 'tha-ap66', 65: 'tha-ap67', 66: 'tha-ap68', 67: 'tha-ap69', 68: 'tha-ap70', 69: 'tha-ap71', 71: 'tha-ap73', 72: 'tha-ap74', 73: 'tha-ap75', 74: 'tha-ap76', 75: 'tha-ap77', 76: 'tha-ap78', 77: 'tha-ap79', 78: 'tha-ap80', 79: 'tha-ap81', 80: 'tha-ap82', 81: 'tha-ap83', 82: 'tha-ap84', 83: 'tha-ap85', 84: 'tha-ap86', 85: 'tha-ap87', 86: 'tha-ap88', 87: 'tha-ap89', 88: 'tha-ap90', 89: 'tha-ap91', 90: 'tha-ap92', 91: 'tha-ap93', 92: 'tha-ap94', 93: 'tha-ap95', 94: 'tha-ap96', 95: 'tha-ap97', 96: 'tha-ap98', 97: 'tha-ap99', 98: 'tha-ap100', 99: 'tha-ap101', 100: 'tha-ap102'}
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
# The same VRI revision can occur in stale temporary indexes; D250 preserves this exact repaired canonical snapshot.
assert sha(j(canon))=='49701605d61352898b3970143192e12b3509dbda966cfb42511e2af0e5f790a1', 'Canonical snapshot differs from the reviewed base64a/D250 data'
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

# Independent implementation of the existing canonical reader's segment contract.
# Source XML/rend classification is preserved; centred completion colophons are
# headings under the pre-existing reader rule, not new inferred source headings.
def independent_segments(unit):
 out=[];stanza=None
 def flush():
  nonlocal stanza
  if stanza is not None:out.append(stanza);stanza=None
 heading_rends={'subhead','title','chapter','book','nikaya','subsubhead'}
 centre_heading=re.compile(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$',re.I)
 for i in range(unit['start'],unit['end']):
  rend,n,text,notes,pages=canon['books'][unit['book']]['blocks'][i]
  if rend=='hangnum':
   flush();stanza={'type':'verse','vri_paragraph':n,'text':'','blocks':[i,i+1],'variant_count':0};continue
  if rend in{'gatha1','gatha2','gatha3','gathalast'}:
   if stanza is None:stanza={'type':'verse','vri_paragraph':n,'text':'','blocks':[i,i+1],'variant_count':0}
   stanza['blocks'][1]=i+1;stanza['text']+=('\n'if stanza['text']else'')+text;stanza['variant_count']+=len(notes)
   if rend=='gathalast':flush()
   continue
  flush()
  if text:out.append({'type':'heading'if rend in heading_rends or(rend=='centre'and centre_heading.search(text))else'prose','vri_paragraph':n,'text':text,'blocks':[i,i+1],'variant_count':len(notes)})
 flush()
 return[{'ref':unit['id']+'/'+str(i+1),'type':v['type'],'blocks':v['blocks'],'vri_paragraph':v['vri_paragraph'],'text_sha256':sha(v['text']),'variant_count':v['variant_count']}for i,v in enumerate(out)]
rows=[];compared=[];rights=[];held=[]
for source_root,goldens_path in zip(source_roots,args.goldens):
 gold=json.loads(goldens_path.read_text());assert gold['baseline']==B and gold['publisher_revision']=='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4' and gold['vri_revision']=='2d134ff9ef60f70a1eb03c9370580228811a3070'
 for a in gold['rights']+[gold['publisher_routing']]:
  raw=(source_root/a['path']).read_bytes();assert len(raw)==a['bytes']and sha(raw)==a['raw_sha256'];assert hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==a['git_blob_sha1'];rights.append({'path':a['path'],'sha256':sha(raw)})
 for g in gold['poems']:
  number=g['poem']
  if number==70:
   assert g['source_scope_decision'].startswith('HOLD');hb=(source_root/g['path']).read_bytes();assert sha(hb)==g['raw_sha256']and len(hb)==g['bytes']and hashlib.sha1(b'blob '+str(len(hb)).encode()+b'\0'+hb).hexdigest()==g['git_blob_sha1'];assert g['chapter_summary']['body_sha256']is None;held.append({'poem':70,'id':g['id'],'raw_sha256':sha(hb),'cooked_summary_emitted':False});continue
  assert EXPECTED.get(number)==g['id'] and g['source_scope_decision'].startswith('APPROVE'),(number,'scope')
  raw=(source_root/g['path']).read_text();assert sha(raw)==g['raw_sha256'];assert hashlib.sha1(b'blob '+str(len(raw.encode())).encode()+b'\0'+raw.encode()).hexdigest()==g['git_blob_sha1']
  front,rest=re.fullmatch(r'---\n(.*?)\n---\n(.*)',raw,re.S).groups();assert re.search(r'^order: '+str(number)+'$',front,re.M)and re.search(r'^category: chapter-3$',front,re.M);title=re.search(r'^title: (.+)$',front,re.M)[1];assert title==g['title'];assert not re.search(r'(?i)audio|youtube|\.mp3|\.wav',front)
  rest=rest.strip();at=re.search(r'^\[\^\d+\]:',rest,re.M);assert at or number==86;body=rest[:at.start()].strip()if at else rest;tail=rest[at.start():]if at else ''
  defs=list(re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',tail,re.M|re.S));notes=[{'number':int(x[1]),'text':present(x[2])}for x in defs];assert[n['number']for n in notes]==list(range(1,len(notes)+1));assert all(n['text']for n in notes)
  editorial=None
  if number==42:
   marker='\\[hiatus?\\][^12]';assert body.count(marker)==1;before,after=body.split('\n\n'+marker+'\n\n');assert re.search(r'\(25\) \\\[1164\\\]$',before)and after.split('\n\n')[0].endswith(r'(26) \[1165\]');body=before+'\n\n'+after;etext=present(marker);en=[n for n in notes if n['number']==12];editorial={'body_sha256':sha(etext),'notes_sha256':sha(j(en)),'note_numbers':[12],'after_local_label':'25','after_publisher_label':'1164','before_local_label':'26','before_publisher_label':'1165'};eg=g['editorial_gap'];assert all(editorial[k]==eg[k]for k in editorial);assert set(map(int,re.findall(r'\[Note (\d+)\]',etext)))=={12};assert eg['scope']=={'kind':'publisher_editorial_gap','parent_id':'tha-ap44','placement':'before_local_label',**editorial}
  division=None
  if number==74:
   marker='\n\nThe Sixth Recitation Portion.';assert body.endswith(marker)and body.count(marker)==1;body=body[:-len(marker)];division={'body_sha256':sha(present(marker)),'note_numbers':[],'notes_sha256':sha('[]')};assert g['publisher_divisions'][0]['body_sha256']==division['body_sha256'];assert not re.search(r'\[Note \d+\]',present(marker))
  collection=None
  if number==100:
   marker='\n\nThen there is the Summary of Chapters:\n\n';assert body.count(marker)==1;body,end=body.split(marker);ctext=present(marker.strip()+'\n\n'+end);cn=[n for n in notes if n['number']==4];collection={'body_sha256':sha(ctext),'paragraphs':[{'sha256':sha(p),'lines':len(p.split('\n'))}for p in ctext.split('\n\n')],'note_numbers':[4],'notes_sha256':sha(j(cn))};cg=g['collection_summary'];assert collection['body_sha256']==cg['body_sha256']and collection['notes_sha256']==cg['notes_sha256'];assert set(map(int,re.findall(r'\[Note (\d+)\]',ctext)))=={4};assert all(collection['paragraphs'][i]['sha256']==x['sha256']and collection['paragraphs'][i]['lines']==x['lines']for i,x in enumerate(cg['paragraphs']))
  summary=None
  if number in[80,90,100]:
   marker='\n\nThe Summary:\n\n';assert body.count(marker)==1;body,end=body.split(marker);stext=present('The Summary:\n\n'+end);sn=[n for n in notes if number==100 and n['number']==3];summary={'body_sha256':sha(stext),'paragraphs':[{'sha256':sha(p),'lines':len(p.split('\n'))}for p in stext.split('\n\n')],'note_numbers':[3]if number==100 else[],'notes_sha256':sha(j(sn))};sg=g['chapter_summary'];assert summary['body_sha256']==sg['body_sha256']and summary['notes_sha256']==sg['notes_sha256'];assert set(map(int,re.findall(r'\[Note (\d+)\]',stext)))==set(summary['note_numbers']);assert all(summary['paragraphs'][i]['sha256']==x['sha256']and summary['paragraphs'][i]['lines']==x['lines']for i,x in enumerate(sg['body_paragraphs']if 'body_paragraphs'in sg else sg['paragraphs']))
  all_notes=notes;notes=[n for n in notes if(number!=100 or n['number']in[1,2])and(number!=42 or n['number']!=12)]
  at=body.index('### ');assert len(re.findall(r'^### ',body,re.M))==1;preface=present(body[:at]);text=present(body[at:]);paragraphs=text.split('\n\n');assert bool(preface)==(number in [61,71,81,91]);assert re.search(r'^Thus indeed',paragraphs[-2]);assert re.search(r'^The [lL]egend of',paragraphs[-1]);refs=[int(n)for n in re.findall(r'\[Note (\d+)\]',text)];assert set(refs)==set(n['number']for n in notes)
  layout=[]
  for p in paragraphs[1:-2]:
   no_notes=re.sub(r'\[Note \d+\]','',p).strip();match=re.search(r'\((\d+(?:-\d+)?)\)\s+\[+([0-9a-z-]+)\]$',no_notes);assert match,(number,no_notes[-100:]);layout.append({'local_label':match[1],'publisher_label':match[2],'suffix':match[0],'lines':len(p.split('\n'))})
  uid=g['id'];u=units[uid];root={'id':uid,'book':u['book'],'start':u['start'],'end':u['end'],'blocks':canon['books'][u['book']]['blocks'][u['start']:u['end']]}
  r={'id':uid,'poem':number,'title':title,'raw_sha256':sha(raw),'body_sha256':sha(text),'notes_sha256':sha(j(notes)),'paratext_sha256':sha(preface),'stanza_layout':layout,'paragraphs':[{'sha256':sha(p),'lines':len(p.split('\n'))}for p in paragraphs],'notes':[{'number':n['number'],'body_sha256':sha(n['text'])}for n in notes],'root_sha256':sha(j(root)),'summary':summary,'collection':collection,'division':division,'editorial':editorial,'all_original_notes':[{'number':n['number'],'body_sha256':sha(n['text'])}for n in all_notes]}
  r['root_segments']=independent_segments(u)
  if 'segments'in g['root']:assert r['root_segments']==g['root']['segments'],(number,'independent canonical reader segment contract')
  for k in ['body_sha256','notes_sha256','paratext_sha256','stanza_layout']:assert r[k]==g[k],(number,k,r[k],g[k])
  assert r['root_sha256']==g['root']['root_sha256'];assert (u['book'],u['start'],u['end'])==(g['root']['book'],g['root']['start'],g['root']['end']);assert len(paragraphs)==len(g['body_paragraphs']);assert all(r['paragraphs'][i]['sha256']==p['sha256']and r['paragraphs'][i]['lines']==p['lines']for i,p in enumerate(g['body_paragraphs']));assert all(r['all_original_notes'][i]['body_sha256']==n['body_sha256']for i,n in enumerate(g['notes']))
  for scope in [g.get('chapter_summary'),g.get('collection_summary'),*(g.get('publisher_divisions')or[])]:
   if not scope:continue
   sb=canon['books'][u['book']]['blocks'][scope['root_start']:scope['root_end']];assert scope['parent_id']==uid and u['start']<=scope['root_start']<scope['root_end']<=u['end'];assert sha(j({'id':uid,'book':u['book'],'start':scope['root_start'],'end':scope['root_end'],'blocks':sb}))==scope['root_sha256'];assert scope['note_numbers']==([3]if number==100 and scope['kind']=='canonical_chapter_summary'else[4]if number==100 else[])
  rows.append(r);compared.append({'poem':number,'id':uid,'body_paragraphs':len(paragraphs),'stanzas':len(layout),'notes':len(notes),'all_hashes_match':True})
assert {r['poem']:r['id']for r in rows}==EXPECTED and len(rows)==len(EXPECTED)
inputs={'source_roots':[str(p)for p in source_roots],'goldens':[{ 'path':str(p),'sha256':sha(p.read_bytes())}for p in args.goldens],'canon':{'path':str(args.canon),'sha256':sha(canonical_bytes)},'xml':{'path':str(xml),'sha256':sha(data)}}
out={'inputs':inputs,'base_commit':B,'independence':'Separate fixed-epoch D250 Python parser adapted from prior independent D249 replay, no source-agent extraction functions or production English/VRI parsers imported','original_xml_sha256':sha(data),'full_original_xml_blocks_exact':len(blocks),'poems':rows,'totals':{'poems':len(rows),'stanzas':sum(len(r['stanza_layout'])for r in rows),'body_paragraphs':sum(len(r['paragraphs'])for r in rows),'notes':sum(len(r['notes'])for r in rows),'apparatus_notes':sum(len(r['all_original_notes'])-len(r['notes'])for r in rows)}}
(D/'INDEPENDENT_GOLDENS.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');(D/'EXTRACTION_COMPARISON.json').write_text(json.dumps({'base_commit':B,'all_approved_match':True,'differences':[],'rows':compared,'totals':out['totals'],'rights_artifacts_rehashed':rights,'full_original_xml_blocks_exact':14645,'production_parser_imports':0,'held':held,'review_epoch':'D250/base64a3367/fixed40approvedsources','inputs':inputs},ensure_ascii=False,indent=2)+'\n');print(json.dumps(out['totals']))
