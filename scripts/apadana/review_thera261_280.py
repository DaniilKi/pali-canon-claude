"""Original-first finite source derivation. Standard library only; no production imports.
English/Pali full strings are written ONLY to external private fixture files here.
"""
from pathlib import Path
import argparse,gzip,hashlib,json,re,xml.etree.ElementTree as ET,datetime
parser=argparse.ArgumentParser(description='Replay exactly18 independently reviewed publisher261–265/267–279 poems from pinned originals; never a production-parser oracle.')
parser.add_argument('--source-root',required=True,type=Path,help='Raw source root containing LICENSE.md and src/_poems; exact pinned files only.')
parser.add_argument('--canon',required=True,type=Path,help='CanonicalJSON or single gzip-compressed canonicalJSON; decompressed hash is fixed.')
parser.add_argument('--xml',required=True,type=Path,help='Exact original UTF16LE VRI s0510m1.mul.xml at pinned2d134 revision.')
parser.add_argument('--evidence',required=True,type=Path,help='Original reviewerA GOLDENS.json, or metadata directory containing GOLDENS.json/THERA_261_280_GOLDENS.json/THERA_261_280_A_GOLDENS.json with fixedc92b06 seal.')
parser.add_argument('--output',required=True,type=Path,help='NEW empty external output directory. Full normalized payloads must never enter a project/package.')
parser.add_argument('--metadata-only',action='store_true',help='Derive and verify all6buffers in memory, but write only4safe metadata files plus receipt; never fullEnglish/Pali payloads. Allows marker-containing artifact ancestors only in this explicit mode.')
args=parser.parse_args()
R=args.source_root.resolve();C=args.canon.resolve();X=args.xml.resolve();E=args.evidence.resolve();O=args.output.resolve()
assert R.is_dir() and C.is_file() and X.is_file() and E.exists()
for location in (O,Path(__file__).resolve(),Path.cwd().resolve(),C,X,E):
 for ancestor in (location,*location.parents):
  if (ancestor/'.git').exists() or (ancestor/'package.json').exists():
   if not args.metadata_only:
    assert not O.is_relative_to(ancestor),'Full translated payload output must remain outside every detected project root'
assert not O.is_relative_to(R),'Never place payload output inside source fixtures'
assert not O.is_relative_to(E if E.is_dir() else E.parent),'Never place replay payload output inside sealed evidence'
assert not O.is_relative_to(Path(__file__).resolve().parent),'Keep portable code/seals and descendants separate from replay outputs'
assert not O.exists() or (O.is_dir() and not any(O.iterdir())),'Preserve prior outputs; choose a new empty external directory'
OUTPUTS={}
AUTHORITY_SHA='c92b06cc14d73b6e2cb2ce053b5997d4786d4191c5ae54abb66d6711ded54ca1'
EXPECTED_OUTPUT_SHA={'GOLDENS.json': 'c92b06cc14d73b6e2cb2ce053b5997d4786d4191c5ae54abb66d6711ded54ca1', 'EXPECTED_PROFILES.json': '12a23c45ce992184376342ec8aa62b6a8018b1bfd83b83f653f4c46efe4e0046', 'EXPECTED_LINKS.json': 'b57b1fe248115bf18bfacad21d2ea9e17dc0b1bf7fdd9e1b049d7cbaf8ddf371', 'NORMALIZED_PAYLOADS_EXTERNAL_ONLY.json': '5b5d03bc8d27b6702fafd6254ed0038e8fadcc9bb32a42c190957cad34fc4989', 'PALI_BLOCKS_EXTERNAL_ONLY.json': '8f235a72c875b9c3d96397db28192a1d077c6321066868981bd2d6488452dcc2', 'SOURCE_REVIEW.json': '9d302203f245d11b83d3fcdf4f65d3877af76552a984158ccd798dfc8ef2c98c'}
REV='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';VRI='2d134ff9ef60f70a1eb03c9370580228811a3070';BASE='d31757b922fe2fa1fcf7bd903469e608f4eef6fb'
N=[261,262,263,264,265,267,268,269,270,271,272,273,274,275,276,277,278,279]
def sha(v):return hashlib.sha256(v.encode('utf-8') if isinstance(v,str) else v).hexdigest()
def compact(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def save(n,v):OUTPUTS[n]=(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode('utf-8')
def blob(raw):return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
def artifact(path):
 raw=(R/path).read_bytes();a=artifacts[path];assert sha(raw)==a['sha256'] and blob(raw)==a['git_blob_sha1'] and len(raw)==a['bytes'];url='https://raw.githubusercontent.com/apadana-translation/apadana-site/'+REV+'/'+path
 return {'path':path,'bytes':len(raw),'raw_sha256':sha(raw),'git_blob_sha1':blob(raw),'raw_url':url,'exact_ref_url':url}
LOW=('[c]{.diacritics data-state=on}[ch]{.no-diacritics data-state=off}','c','ch')
UP=('[C]{.diacritics data-state=on}[Ch]{.no-diacritics data-state=off}','C','Ch')
CC=('[cc]{.diacritics data-state=on}[chch]{.no-diacritics data-state=off}','cc','chch')
HTML=('<span class="diacritics" data-state="on">c</span><span class="no-diacritics" data-state="off">ch</span>','c','ch')
PAIRS={(261,'poem'):[(LOW,1)],(262,'poem'):[(LOW,1)],(263,'poem'):[(HTML,3)],(264,'poem'):[(LOW,1)],(265,'note2'):[(CC,1)],(267,'poem'):[(UP,1)],(268,'poem'):[(UP,1)],(270,'summary'):[(UP,1),(LOW,1)],(273,'poem'):[(UP,3)],(273,'note2'):[(LOW,1)],(274,'poem'):[(UP,1)],(274,'note2'):[(LOW,1)],(276,'note2'):[(LOW,1)],(277,'poem'):[(UP,4)]}
def present(raw,n,owner):
 value=raw;used=[]
 for (literal,on,off),count in PAIRS.get((n,owner),[]):
  assert value.count(literal)==count,(n,owner,literal,value.count(literal))
  used.append({'owner':owner,'raw_sha256':sha(literal),'rendered_sha256':sha(on),'alternate':off,'alternate_sha256':sha(off),'occurrences':count,'form':'exact_HTML_span_pair' if literal.startswith('<') else 'exact_Markdown_pair'})
  value=value.replace(literal,on)
 assert '{.diacritics' not in value and '{.no-diacritics' not in value and '<span' not in value,(n,owner)
 out=[]
 for line in value.splitlines():
  if line.startswith('### '):line=line[4:]
  elif line.startswith('## '):line=line[3:]
  chars=[];i=0;em=False
  while i<len(line):
   if line.startswith('<abbr title="',i):
    end=line.index('">',i);close=line.index('</abbr>',end);word=line[end+2:close];assert '<' not in word and '>' not in word;chars.append(word);i=close+7
   elif line.startswith('[^',i):
    end=line.index(']',i);number=line[i+2:end];assert number.isdecimal();chars.append('[Note '+number+']');i=end+1
   elif line[i]=='\\':
    assert i+1<len(line) and line[i+1] in '\\`*{}[]()#+.!_>-';chars.append(line[i+1]);i+=2
   elif line[i]=='*':em=not em;i+=1
   else:assert line[i] not in '<>',(n,owner,line[i:]);chars.append(line[i]);i+=1
  assert not em,(n,owner,line);out.append(''.join(chars).rstrip(' \t'))
 return '\n'.join(out).strip(),used

def xml_fields(e):
 def content(e):
  s=e.text or ''
  for ch in e:
   if ch.tag not in ('note','pb'):s+=content(ch)
   s+=ch.tail or ''
  return s
 body=' '.join(content(e).split());notes=[' '.join(''.join(x.itertext()).split()) for x in e.iter('note')];pages={}
 for pb in e.iter('pb'):
  a,b=pb.attrib['n'].split('.');pages.setdefault(pb.attrib['ed'],[]).append(str(int(a))+'.'+str(int(b)))
 number=e.attrib.get('n');kind=e.attrib.get('rend','')
 if kind=='hangnum':assert re.fullmatch(r'\d+\.',body);number,body=body[:-1],''
 return [kind,number,body,notes,pages]
def root_segments(uid,start,end):
 rows=[];i=start
 while i<end:
  kind,num,text,notes,pages=blocks[i];j=i+1
  if kind=='hangnum':
   while j<end and blocks[j][0].startswith('gatha'):j+=1
   typ='verse';texts=[b[2] for b in blocks[i:j] if b[2]]
  elif kind.startswith('gatha'):
   while j<end and blocks[j][0].startswith('gatha'):j+=1
   typ='verse';texts=[b[2] for b in blocks[i:j] if b[2]]
  else:typ='heading' if kind in ('chapter','subhead','subsubhead','title') else 'prose';texts=[text]
  rows.append({'ref':uid+'/'+str(len(rows)+1),'type':typ,'blocks':[i,j],'vri_paragraph':num,'text_sha256':sha('\n'.join(texts)),'variant_count':sum(len(b[3]) for b in blocks[i:j])});i=j
 return rows

def para_proofs(text):return [{'paragraph':i,'sha256':sha(p),'lines':len(p.splitlines()),'characters':len(p)} for i,p in enumerate(text.split('\n\n') if text else [])]
def xml_pin(start,end):
 a=rawnodes[start+1].start();b=rawnodes[end].end();payload=decoded[a:b].encode('utf-16-le');byte_start=2+len(decoded[:a].encode('utf-16-le'));assert xr[byte_start:byte_start+len(payload)]==payload
 return {'canonical_block_range':[start,end],'XML_physical_element_range_zero_based':[start+1,end+1],'raw_UTF16LE_byte_range':[byte_start,byte_start+len(payload)],'raw_UTF16LE_sha256':sha(payload),'ET_serialization_sha256':sha(b''.join(ET.tostring(e,encoding='utf-8') for e in represented[start:end])),'ET_domain':'ElementTree UTF8 serialization includes element tails; distinct from exact rawUTF16LE slice and normalized canonicaltuple hashes.'}

if E.is_file():authority_path=E
else:
 choices=[E/name for name in ('GOLDENS.json','THERA_261_280_GOLDENS.json','THERA_261_280_A_GOLDENS.json') if (E/name).is_file()]
 choices=[path for path in choices if sha(path.read_bytes())==AUTHORITY_SHA]
 assert choices,'Provide exact original reviewerA metadata GOLDENS; runtime manifests and peer output are not authority'
 authority_path=choices[0]
authority_raw=authority_path.read_bytes();assert sha(authority_raw)==AUTHORITY_SHA
original_evidence=json.loads(authority_raw)
assert original_evidence['baseline']==BASE and original_evidence['publisher_revision']==REV and original_evidence['vri_revision']==VRI
assert [row['poem'] for row in original_evidence['poems']]==N and original_evidence['excluded_publishers']==[260,266,280]
# Only independently sealed ORIGINAL source identities and narrative/count review leads
# are adapted here; no generated runtime manifest, production parser or body oracle.
artifacts={a['path']:{'path':a['path'],'bytes':a['bytes'],'sha256':a['raw_sha256'],'git_blob_sha1':a['git_blob_sha1']} for a in [*original_evidence['rights'],*original_evidence['poems']]}
survey={'publisher_revision':REV,'rights_artifacts':[{'path':a['path']} for a in original_evidence['rights']]}
sc={row['poem']:{'narrative_screen':row['narrative_identity'],'printed_local_label_occurrences':row['printed_local_verse_label_count']} for row in original_evidence['poems']}
# Read-only boundary controls only: no held body normalization or activation.
BOUNDARY_PINS={266:{'bytes':1126,'sha256':'ab02aa96bcdbd0db833bf8bb2bcd835ffbfa5653f2059952d0366e1f41a59428','git_blob_sha1':'67d375cae4ca052f2855961707668b1a3d8bd329'},280:{'bytes':1650,'sha256':'2b7f892502f3667171201859e6ab640df47d4c4f1227b641e23071902d952765','git_blob_sha1':'f39444a54b5fa9d85a700f4fc05f5746ddfe4df8'}}
for number,pins in BOUNDARY_PINS.items():
 raw=(R/f'src/_poems/chapter-3/poem-{number}.md').read_bytes()
 assert len(raw)==pins['bytes'] and sha(raw)==pins['sha256'] and blob(raw)==pins['git_blob_sha1']
cr=C.read_bytes();cr=gzip.decompress(cr) if cr.startswith(b'\x1f\x8b') else cr
assert sha(cr)=='1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32';canon=json.loads(cr);book=canon['books'][36];blocks=book['blocks'];units={u['id']:u for u in canon['units']}
xr=X.read_bytes();assert sha(xr)=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1' and blob(xr)=='f37368072aece065d2668f93a74c24b423939f1f'
elements=[e for e in ET.fromstring(xr).iter() if e.tag in ('p','head','trailer')];assert len(elements)==14646 and len(blocks)==14645
assert xml_fields(elements[1130])==['gatha1',None,'',['imā dve gāthāyo syāmapotthake na santi'],{}]
represented=elements[:1130]+elements[1131:]
for i,e in enumerate(represented):assert xml_fields(e)==blocks[i],i
# Exact raw node ranges are separately bound to UTF16LE bytes, not ET serialization.
decoded=xr.decode('utf-16');rawnodes=list(re.finditer(r'<(p|head|trailer)\b[^>]*>.*?</\1>',decoded,re.S));assert len(rawnodes)==len(elements)
for i,m in enumerate(rawnodes):assert ET.fromstring(m.group()) .attrib==elements[i].attrib
CAVEATS={
261:['Publisher chapter Padumukkhepa differs from VRI Padumukkhipavagga; the chapter heading is separately owned, not poem scripture. Poem-title note1 remains poem-owned even though it explains chaptername.','Publisher verse4 prints thirty-second aeon and normalized diacritic name Antalikkhacara, whereas VRI verse4 reads chattiṃsa (thirty-six) and Antalikkhakaro. Preserve both editions without correction or inferred cause.'],
262:['Publisher final attainment formula is expanded while VRI abbreviates it with peyyāla; do not equate matching ordinal counts with line-complete translation. Preserve original oil/railing and chronology wording.'],
263:['Publisher Devapa and its uncertain-name note5 differ from VRI devalo; publisher flower interpretation remains attributed translator/commentary apparatus. VRI verse11 reads canda with recorded puppha variant. Preserve uncertainties and three original HTML diacritic display pairs.'],
264:['Publisher Araṇadīpiya differs from VRI Padīpadāyaka and the actual VRI colophon variant apaṇṇadīpiyo; full god-descends/five-lamps/94aeons/Samantacakkhu narrative and neighbors establish identity.','Retain the original publisher wording “I’ve come to no know bad rebirth” exactly; no typographic correction.'],
265:['Romasa is the mountain here, distinct from the Lonely Buddha in publisher279. Preserve translator uncertainty and long cross-references in note2; do not infer names-only identities.'],
267:['Preserve publisher Javahaŋsaka with literal U+014Bŋ, while VRI uses Javahaṃsaka. Forester/Candabhāgā/Siddhattha travelling throughsky/joinedhands narrative and neighbors establish identity.'],
268:['Retain publisher Saḷala/BJTS salala botanical variant and translator kinnara explanation as notes. VRI peyyāla remains independent of the expanded English attainment formula.'],
269:['Publisher Upāgatabhāsaniya differs from VRI Upāgatāsaya. VRI colophon notes upāgatahāsaniyo (syā.) and upāgatāhāsaniyo (ka.), not the exact publisher form; do not invent an attested spelling.','Preserve publisher note3 BJTS heṭṭhasīso/PTSpoṭṭhasīso decision and demon/lake/Vipassi narrative; VRI main text has heṭhasīlo. No edition harmonization.'],
270:['Publisher Taraṇiya is Vipassi at the riverbank with no boats and uncertain means of crossing; it is distinct from excluded publisher280 highwaybridge narrative even though titles repeat.','Original chapter summary declares41 although the ten source poems print42 labels/global2540–2581; VRI summary also states41 while its numbered chapter stanzas total42. Preserve original counts and wording without inferred repair.','This summary covers all ten publisher poems including excluded publisher266/canonicaltha-ap268. Only nine poems/39printed labels in that chapter qualify here; chapter-summary display does not activate the held poem or establish complete chapter English coverage.'],
271:['Publisher Suvaṇṇabimbohaniya/chapterBimbohana differs from VRI Suvaṇṇabibbohaniya/Bibbohana; publisher note1 and actual VRI bimbohanañca (sī.pī.) note retain edition spellings. Chapter heading is separately owned.'],
272:['Publisher verse4 names Nandiya whereas VRI verse8 reads tantiso with recorded khantiyo (syā.) variant. Preserve these independent edition names; do not silently correct or invent a recorded Nandiya variant.'],
273:['Publisher Caṅgoṭakiya differs from VRI Caṅkoṭakiya; actual VRI note records caṅgoṭaka (sī.) and alternative approach wording. Preserve sea/mountain/box/Siddhattha narrative and translator note2; do not equate every first-stanza line across editions.'],
274:['Publisher local1–2/global2595–2596 is one eight-line physical display corresponding by scope to VRI numbered14–15. Preserve the compound labels and all eight lines; no reconstructed or split wording.','Keep the publisher’s glossary and uncertain Cirappa-name note5 attributed to this poem; VRI abbreviation/reading notes remain independent.'],
275:['Publisher Ekañjaliya differs from VRI Ekañjalika; preserve poem note7 and the distinct Eka-añjalika rebirth name, without harmonizing typography or names.'],
276:['Publisher Potthadāyaka differs from VRI Potthakadāyaka. Retain original plaster/cloth/bark/stupa/recipient uncertainty in notes1–3, not a settled reconstruction or expanded root scripture.'],
277:['Publisher verse3 says seventy-seven aeons; VRI verse29 reads Sattasaṭṭhi (sixty-seven). The actual VRI note varies king-number/name wording and does not record seventy-seven; do not infer a cause or correction.','Shrine construction from sand is publisher commentary note3, not additional verse text; preserve poem-note ownership.'],
278:['Retain publisher BJTS/commentary brightness reading and bulbous-root interpretation as attributed notes; VRI main text suppabhāsaṃ and independent wording remain unchanged.'],
279:['Romasa is the Lonely Buddha here, distinct from publisher265 mountain; VRI main text subbato and recorded sappabho (syā.) remain independent of publisher “Bright” interpretation.']}
common=['Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Preserve independent VRI wording and all explicit edition differences; do not infer missing words, stanza equivalence or other mappings by number.']
changes='Presentation extraction only: remove reviewed Markdown heading/emphasis and abbreviation markers; decode literal escapes; select exact source-owned existing diacritic-state-on display members with alternatives preserved in evidence; replace footnote references with explicit note labels; remove hard-break padding while preserving original lines/paragraphs, wording, typography, uncertainty and numbering. Keep chapter headings and summary outside poem text. No Unicode normalization, wording correction, VRI expansion or source reconstruction. Publishers260/266/280 remain excluded.'
gold=[];profiles={};links={};payload={};pali_external={};source_reviews=[];allpairs=[]
for n in N:
 path=f'src/_poems/chapter-3/poem-{n}.md';ar=artifact(path);raw=(R/path).read_bytes();s=raw.decode('utf-8');assert s.startswith('---\n');end=s.index('\n---\n',4)+5;front=s[4:end-5];content=s[end:];title=next(x[7:] for x in front.splitlines() if x.startswith('title: '));assert f'order: {n}' in front and 'category: chapter-3' in front
 definitions=list(re.finditer(r'^\[\^(\d+)\]: ',content,re.M));assert definitions;before=content[:definitions[0].start()].strip('\n');pars=before.split('\n\n');start=next(i for i,p in enumerate(pars) if p.startswith('### '));summ=next((i for i,p in enumerate(pars) if p in ('The Summary:','The summary:')),len(pars));pr=pars[:start];br=pars[start:summ];sr=pars[summ:]
 assert br[0].startswith(f'### \\[{n}. ') and br[-2].startswith('Thus indeed Venerable ') and br[-1].endswith(' is finished.')
 body,pairs=present('\n\n'.join(br),n,'poem');pref,prefpairs=present('\n\n'.join(pr),n,'preface');summary,spairs=present('\n\n'.join(sr),n,'summary');pairs+=prefpairs+spairs;bp=body.split('\n\n');assert len(bp)==len(br)
 notes=[];noteproof=[]
 for i,m in enumerate(definitions):
  num=int(m[1]);assert num==i+1;stop=definitions[i+1].start() if i+1<len(definitions) else len(content);nr=content[m.end():stop];value,ps=present(nr,n,'note'+str(num));pairs+=ps;notes.append({'number':num,'text':value});noteproof.append({'number':num,'owner':'poem','raw_sha256':sha(nr),'body_sha256':sha(value),'characters':len(value)})
 assert [int(x) for x in re.findall(r'\[Note (\d+)\]',body)]==[x['number'] for x in notes]
 assert not re.search(r'\[Note \d+\]',pref+summary);assert bool(pref)==(n in (261,271));assert bool(summary)==(n==270)
 layout=[]
 for p in bp[1:-2]:
  m=re.search(r'\((\d+(?:-\d+)?)\) \[(\d+(?:-\d+)?)\]$',p.splitlines()[-1]);assert m;lines=len(p.splitlines());assert lines==(8 if n==274 and not layout else 4)
  layout.append({'local_label':m[1],'publisher_label':m[2],'suffix':m[0],'lines':lines})
 uid='tha-ap'+str(n+2);u=units[uid];a,b=u['start'],u['end'];ub=blocks[a:b];rootpin=sha(compact({'id':uid,'book':36,'start':a,'end':b,'blocks':ub}));rv=[int(x[1]) for x in ub if x[0]=='hangnum'];assert len(rv)==sc[n]['printed_local_label_occurrences'];segments=root_segments(uid,a,b)
 maps=[];ri=0
 for j,st in enumerate(layout):
  labels=list(map(int,st['local_label'].split('-')));count=labels[-1]-labels[0]+1;vlabels=rv[ri:ri+count];cor=[]
  for lab in vlabels:
   si=next(i for i,x in enumerate(ub) if x[0]=='hangnum' and x[1]==str(lab));ei=si+1
   while ei<len(ub) and ub[ei][0].startswith('gatha'):ei+=1
   cor.append({'vri_label':lab,'canonical_blocks':[a+si,a+ei],'block_tuple_sha256':sha(compact(ub[si:ei])),'original_XML':xml_pin(a+si,a+ei),'actual_segment_ref':next(x['ref'] for x in segments if x['blocks']==[a+si,a+ei])})
  maps.append({'publisher_physical_entry':j+1,'local_label':st['local_label'],'global_label':st['publisher_label'],'normalized_English_paragraph_sha256':sha(bp[j+1]),'VRI_scope_units':cor,'ordinal_scope_and_narrative_evidence_not_word_or_line_equivalence':True});ri+=count
 root={'id':uid,'book':36,'start':a,'end':b,'title':u['title'],'root_sha256':rootpin,'root_verses':[rv[0],rv[-1]],'numbered_stanza_count':len(rv),'vri':u['vri'],'index_revision':u.get('locatorRevision'),'first_ref':segments[0]['ref'],'last_ref':segments[-1]['ref'],'segments':segments}
 mn=common+[f'Full original publisher chapter-3 poem {n} narrative/title/colophons and exact VRI XML/unit/neighbor review maps this source to {uid}; numbers and title alone do not establish another mapping.']+CAVEATS[n]
 p={'exact_ref_url':ar['exact_ref_url'],'id':uid,'publisher_chapter':'chapter-3','poem':n,'verses':[int(layout[0]['publisher_label'].split('-')[0]),int(layout[-1]['publisher_label'].split('-')[-1])],'root_verses':root['root_verses'],'note_count':len(notes),'note_numbers':[x['number'] for x in notes],'source':'apadana','path':f'/text/chapter-3/poem-{n}/','url':f'https://apadanatranslation.com/text/chapter-3/poem-{n}/','raw_url':ar['raw_url'],'translator':'Jonathan S. Walters','license':'CC BY-NC-SA 4.0','translation_revision':REV,'title':title,'reference':f'Therā Apadāna publisher poem {n}; complete publisher-edition poem; original numbering retained','raw_sha256':ar['raw_sha256'],'body_sha256':sha(body),'notes_sha256':sha(compact(notes)),'paratext_sha256':sha(pref),'root_sha256':rootpin,'stanza_layout':layout,'mapping_notes':mn}
 val={'title':title,'text':body,'translator_notes':notes,'publisher_paratext':pref,'changes':changes};sumgold=None
 if summary:
  sa,sb=8545,8550;ss=[x for x in segments if x['blocks'][0]>=sa];assert ss[0]['ref']==uid+'/8' and ss[-1]['ref']==uid+'/10'
  desc={'kind':'canonical_chapter_summary','label':'Twenty-Seventh Therā Apadāna chapter summary','parent_id':uid,'first_ref':uid+'/8','last_ref':uid+'/10','root_start':sa,'root_end':sb,'root_sha256':sha(compact({'id':uid,'book':36,'start':sa,'end':sb,'blocks':blocks[sa:sb]})),'body_sha256':sha(summary),'notes_sha256':sha('[]'),'note_numbers':[]}
  p['chapter_summary']=desc;val['chapter_summary']={**desc,'text':summary,'translator_notes':[]}
  sumgold={**desc,'raw_sha256':sha('\n\n'.join(sr)),'paragraph_count':len(summary.split('\n\n')),'paragraphs':para_proofs(summary),'publisher_stated_total':41,'vri_stated_total':41,'actual_vri_numbered_stanzas':42,'full_publisher_local_label_occurrences':42,'approved_subset_entries':39,'held_publisher_poem':266,'held_canonical_id':'tha-ap268','original_publisher_order':'summary then chapter colophon; VRI chapter colophon precedes summary','count_limitation':CAVEATS[n][-1],'original_XML':xml_pin(sa,sb)}
  assert [x['lines'] for x in sumgold['paragraphs']]==[1,6,1]
 q='\n\n'.join(re.sub(r'\[Note \d+\]','',para)[:-len(st['suffix'])].strip() for para,st in zip(bp[1:-2],layout))
 prefproof={'kind':'publisher_chapter_heading_audit_only','runtime_publisher_preface_descriptor':False,'raw_sha256':sha('\n\n'.join(pr)),'body_sha256':sha(pref),'paragraph_count':len(pr),'paragraphs':para_proofs(pref),'note_numbers':[],'notes_sha256':sha('[]')}
 proof={**ar,'id':uid,'publisher_chapter':'chapter-3','poem':n,'title':title,'source_scope_decision':'APPROVE_EXACT_COMPLETE_PUBLISHER_POEM_AND_FINITE_PRESENTATION_ONLY','narrative_identity':sc[n]['narrative_screen'],'identity_basis':'Exact full source narrative and colophons compared with original Pali/XML contents and both canonical neighbors; no name/number-only inference.','front_matter_raw_sha256':sha(front),'source_raw_body_sha256':sha('\n\n'.join(br)),'raw_definitions_sha256':sha(content[definitions[0].start():]),'body_sha256':p['body_sha256'],'notes_sha256':p['notes_sha256'],'paratext_sha256':p['paratext_sha256'],'body_paragraphs':para_proofs(body),'physical_stanza_count':len(layout),'printed_local_verse_label_count':len(rv),'stanza_layout':layout,'note_count':len(notes),'original_note_count':len(notes),'note_numbers':p['note_numbers'],'notes':noteproof,'original_raw_body_paragraph_count':len(br),'normalized_body_paragraph_count':len(bp),'publisher_preface':prefproof,'publisher_divisions':[],'presentation_recipe':{'paired_display_inventory':pairs,'allowed_changes':changes,'Unicode_normalization':False},'root':root,'root_original_XML':xml_pin(a,b),'mapping_notes':mn,'poem_only_root_sha256':sha(compact({'id':uid,'book':36,'start':a,'end':8545 if n==270 else b,'blocks':blocks[a:8545 if n==270 else b]})),'verse_scope_correspondences':maps,'original_VRI_notes': [{'block':a+i,'note_index':j,'note_utf8_sha256':sha(note)} for i,x in enumerate(ub) for j,note in enumerate(x[3])],'source_approval':True,'normalization_approval':True,'activation':False,'neighbors':{'previous_block':{'index':a-1,'sha256':sha(compact(blocks[a-1])),'original_XML':xml_pin(a-1,a)},'next_block':{'index':b,'sha256':sha(compact(blocks[b])),'original_XML':xml_pin(b,b+1)},'previous_unit':{'id':'tha-ap'+str(n+1),'metadata':units['tha-ap'+str(n+1)]},'next_unit':{'id':'tha-ap'+str(n+3),'metadata':units['tha-ap'+str(n+3)]},'publisher_previous':n-1,'publisher_next':n+1,'excluded_266_280_are_boundary_controls_only':True}}
 if sumgold:proof['chapter_summary']=sumgold
 gold.append(proof);profiles[uid]=p;links[uid]={**p,'english':title,'match':'individually-reviewed-whole-poem'};payload[uid]=val
 pali_external[uid]={'original_block_tuples':ub,'original_XML_element_indices':[a+1,b+1],'verse_source_only':[{**m,'Pali_block_tuples':[blocks[x['canonical_blocks'][0]:x['canonical_blocks'][1]] for x in m['VRI_scope_units']]} for m in maps]}
 allpairs.extend([{'poem':n,**x} for x in pairs]);source_reviews.append({'publisher_poem':n,'id':uid,'mapping_basis':sc[n]['narrative_screen'],'specific_caveats':CAVEATS[n],'root_sha256':rootpin,'source_raw_sha256':ar['raw_sha256'],'both_original_XML_neighbors_verified':True,'all_words_notes_boundaries_owned':True,'complete_publisher_poem_not_line_complete_VRI':True})
assert len(gold)==18 and not set(profiles)&{'tha-ap262','tha-ap268','tha-ap282'}
assert len(allpairs)==sum(len(PAIRS[k]) for k in PAIRS) and sum(x['occurrences'] for x in allpairs)==22
assert 'Antalikkhacara' in payload['tha-ap263']['text'] and 'thirty-second' in payload['tha-ap263']['text'];assert 'no know' in payload['tha-ap266']['text'] and 'Javahaŋsaka' in payload['tha-ap269']['text'];assert 'Nandiya' in payload['tha-ap274']['text'] and 'Seventy-seven' in payload['tha-ap279']['text']
totals={'poems':18,'body_paragraphs':sum(len(p['body_paragraphs']) for p in gold),'stanza_entries':sum(p['physical_stanza_count'] for p in gold),'printed_local_labels':sum(p['printed_local_verse_label_count'] for p in gold),'poem_notes':sum(p['note_count'] for p in gold),'chapter_heading_paratexts':2,'paratext_notes':0,'summaries':1,'summary_notes':0,'paired_display_occurrences':sum(x['occurrences'] for x in allpairs)}
assert totals=={'poems':18,'body_paragraphs':129,'stanza_entries':75,'printed_local_labels':76,'poem_notes':59,'chapter_heading_paratexts':2,'paratext_notes':0,'summaries':1,'summary_notes':0,'paired_display_occurrences':22}
rights=[artifact(a['path']) for a in survey['rights_artifacts']]
G={'review_type':'Independent original-first standard-library full-source/Pali/XML/neighbor and finite-normalization review A; metadata/hashes only.','baseline':BASE,'publisher_revision':REV,'vri_revision':VRI,'canonical_logical_sha256':sha(cr),'original_XML_sha256':sha(xr),'rights':rights,'publisher_routing':artifact('src/_poems/_poems.json'),'all14645_original_XML_tuples_match_baseline':True,'baseline_note_only_omission':'One exact separately indexed Sariputta note atphysical1130 is excluded only to compare existing canonicaltuple sequence; sidecar already approved separately and untouched. RawUTF16LE/ET/blocktuple hash domains remain distinct.','poems':gold,'totals':totals,'excluded_publishers':[260,266,280],'source_approval_count':18,'normalization_approval_count':18,'runtime_approval':False,'release_approval':False}
save('GOLDENS.json',G);save('EXPECTED_PROFILES.json',profiles);save('EXPECTED_LINKS.json',links);save('NORMALIZED_PAYLOADS_EXTERNAL_ONLY.json',payload);save('PALI_BLOCKS_EXTERNAL_ONLY.json',pali_external);save('SOURCE_REVIEW.json',{'status':'INDEPENDENT18_EXACT_SOURCE_SCOPE_AND_FINITE_NORMALIZATION_ONLY','baseline':BASE,'publisher_revision':REV,'vri_revision':VRI,'source_reviews':source_reviews,'totals':totals,'all_originals_read_before_any_peer_output':True,'production_imports_or_oracle':False,'normalization_source_approvals':18,'runtime_release_approval':False})
assert set(OUTPUTS)==set(EXPECTED_OUTPUT_SHA)
for name,raw in OUTPUTS.items():assert sha(raw)==EXPECTED_OUTPUT_SHA[name],name+' differs from independently sealed original-derived expectation'
# All hashes checked before creating any result files. Write fixedUTF8/LF bytes,
# avoiding locale/newline conversion on Windows and preserving earlier receipts.
SAFE_METADATA_OUTPUTS=('GOLDENS.json','EXPECTED_PROFILES.json','EXPECTED_LINKS.json','SOURCE_REVIEW.json')
FULL_PAYLOAD_OUTPUTS=('NORMALIZED_PAYLOADS_EXTERNAL_ONLY.json','PALI_BLOCKS_EXTERNAL_ONLY.json')
assert set(OUTPUTS)==set(SAFE_METADATA_OUTPUTS)|set(FULL_PAYLOAD_OUTPUTS)
WRITTEN={name:raw for name,raw in OUTPUTS.items() if not args.metadata_only or name in SAFE_METADATA_OUTPUTS}
assert len(WRITTEN)==(4 if args.metadata_only else 6)
assert not args.metadata_only or not set(WRITTEN)&set(FULL_PAYLOAD_OUTPUTS)
O.mkdir(parents=True,exist_ok=True)
for name,raw in WRITTEN.items():
 with (O/name).open('xb') as target:target.write(raw)
result={'status':'PASS_EXACT18_ORIGINAL_SOURCE_AND_FINITE_NORMALIZATION_REPLAY','baseline':BASE,'publisher_revision':REV,'vri_revision':VRI,'source_root':str(R),'canon':str(C),'canonical_logical_sha256':sha(cr),'xml':str(X),'original_XML_sha256':sha(xr),'independent_A_authority':str(authority_path),'independent_A_authority_sha256':sha(authority_raw),'all14645_original_XML_tuples_verified':True,'verified_source_files':26,'boundary_only_excluded_publishers':[266,280],'excluded_publishers':[260,266,280],'approved_source_IDs':list(profiles),'totals':totals,'mode':'metadata-only' if args.metadata_only else 'full-external-payloads','all6_derived_output_sha256s':{name:sha(raw) for name,raw in OUTPUTS.items()},'outputs':{name:sha(raw) for name,raw in WRITTEN.items()},'written_output_names':list(WRITTEN),'full_payload_files_written':sum(name in FULL_PAYLOAD_OUTPUTS for name in WRITTEN),'safe_metadata_only_outputs':list(SAFE_METADATA_OUTPUTS),'external_payloads_never_copy_into_project_package':list(FULL_PAYLOAD_OUTPUTS),'production_imports_or_runtime_oracle':False,'runtime_approval':False,'release_approval':False,'activations':0}
with (O/'REPLAY_RESULT.json').open('xb') as target:target.write((json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
print(json.dumps({'status':result['status'],'mode':result['mode'],'totals':totals,'output':str(O),'files':result['outputs'],'full_payload_files_written':result['full_payload_files_written'],'all6_derived_output_sha256s':result['all6_derived_output_sha256s'],'runtime_release_approval':False}))
