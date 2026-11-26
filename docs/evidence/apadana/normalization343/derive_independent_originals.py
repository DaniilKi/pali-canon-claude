"""Original-first independent stdlib normalization proof; metadata only output.
No application/parser imports, producer reads, candidate reads, Git or network.
"""
import collections,hashlib,html,json,re,xml.etree.ElementTree as ET
from pathlib import Path
D=Path(__file__).parent;ORIGINAL=Path('/tmp/pali-next334-source-review-nov26/originals')
SOURCE=Path('/tmp/pali-next334-source-review-nov26/independent-review/ORIGINAL_SOURCE_REVIEW.json')
PUB='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';VRI='2d134ff9ef60f70a1eb03c9370580228811a3070'
H=lambda x:hashlib.sha256(x if isinstance(x,bytes) else x.encode('utf8')).hexdigest()
C=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
J=lambda x:H(C(x))
B=lambda raw:hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
U=lambda text:len(text.encode('utf-16-le'))//2
assert H(SOURCE.read_bytes())=='dace9bc63059c211f0ae090dc69a2bd4487b2fbeaee9fdce0579eae40c0c65a2'
review=json.loads(SOURCE.read_bytes());source_by_number={row['publisher_poem']:row for row in review['poems']}
rights=[]
for rec in review['rights_originals']:
 raw=(ORIGINAL/rec['path']).read_bytes();assert len(raw)==rec['bytes'] and H(raw)==rec['sha256'] and B(raw)==rec['git_blob_sha1']
 rights.append({'path':rec['path'],'bytes':len(raw),'sha256':H(raw),'git_blob_sha1':B(raw)})
license=(ORIGINAL/'LICENSE.md').read_text(encoding='utf8');about=(ORIGINAL/'src/_pages/about.md').read_text(encoding='utf8');footer=(ORIGINAL/'src/_includes/site/footer.njk').read_text(encoding='utf8');epub=(ORIGINAL/'src/_includes/layouts/epub-metadata.xml').read_text(encoding='utf8');site=json.loads((ORIGINAL/'src/_data/site.json').read_bytes());routing=json.loads((ORIGINAL/'src/_poems/_poems.json').read_bytes())
assert 'Attribution-NonCommercial-ShareAlike 4.0 International' in license and 'for NonCommercial purposes only' in license and 'indicate if You modified' in license
assert 'The text of the translation and the site’s code' in about and '[CC-BY-NC-SA license][8]' in about
assert 'Jonathan S. Walters and Whitman College' in footer and 'by-nc-sa/4.0/' in footer
assert '<dc:creator>Jonathan S. Walters</dc:creator>' in epub and '<dc:rights>https://creativecommons.org/licenses/by-nc-sa/4.0/</dc:rights>' in epub
assert site['license']['title']=='CC-BY-4.0' and routing['permalink']=='/text/{{ category | slug }}/{{ page.fileSlug }}/index.html'
xml_path=Path(review['original_XML']['path']);xml_raw=xml_path.read_bytes();assert H(xml_raw)=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1' and B(xml_raw)=='f37368072aece065d2668f93a74c24b423939f1f'
xml=ET.fromstring(xml_raw)
def visible(node):
 result=node.text or ''
 for child in node:
  if child.tag not in ('note','pb') and not(child.tag=='hi' and child.get('rend') in ('paranum','dot')):result+=visible(child)
  result+=child.tail or ''
 return result
collapse=lambda text:re.sub(r'\s+',' ',text).strip()
physical=[n for n in xml.iter() if n.tag in ('p','head','trailer')];blocks=[];omitted=[]
for i,node in enumerate(physical):
 text=collapse(visible(node));number=node.get('n')
 if not text and not number:omitted.append(i);continue
 pages={}
 for pb in node.iter('pb'):pages.setdefault(pb.get('ed'),[]).append('.'.join(str(int(x)) for x in pb.get('n').split('.')))
 notes=[collapse(''.join(note.itertext())) for note in node.iter('note')]
 blocks.append([node.get('rend') or ('centre' if node.tag=='trailer' else 'bodytext'),number,text,notes,pages])
assert len(physical)==14646 and len(blocks)==14645 and omitted==[1130] and J(blocks)=='bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44'
# No app normalizer: explicitly render only encountered source presentation syntax.
def normalize(text):
 text=re.sub(r'<abbr title="[^"<>]*">([^<>]*)</abbr>',lambda m:m[1],text)
 assert not re.search('[<>]',text),'Unreviewed HTML presentation'
 text=re.sub(r'\[\^(\d+)\]',lambda m:'[Note '+m[1]+']',text)
 text=html.unescape(text)
 escaped=[]
 def hold(match):escaped.append(match[1]);return '\ue000'+str(len(escaped)-1)+'\ue001'
 text=re.sub(r'\\([\\`*{}\[\]()#+.!_>\-])',hold,text)
 text=re.sub(r'^#{1,3}[ \t]+','',text,flags=re.M)
 text=re.sub(r'\*([^*\n]+)\*',lambda m:m[1],text)
 text=re.sub(r'\ue000(\d+)\ue001',lambda m:escaped[int(m[1])],text)
 text=re.sub(r'[ \t]+\n','\n',text)
 return re.sub(r'\n{3,}','\n\n',text).strip()
refs=lambda text:sorted(set(int(x) for x in re.findall(r'\[Note (\d+)\]',text)))
rows={};totals=collections.Counter();objects={}
for n,uid in [(331,'tha-ap333'),(332,'tha-ap334'),(333,'tha-ap335'),(334,'tha-ap336')]:
 path=f'src/_poems/chapter-3/poem-{n}.md';raw=(ORIGINAL/path).read_bytes();proof=source_by_number[n]['source'];assert len(raw)==proof['bytes'] and H(raw)==proof['sha256'] and B(raw)==proof['git_blob_sha1'];original=raw.decode('utf8');assert '\r' not in original
 fm=re.match(r'^---\n(.*?)\n---\n',original,re.S);assert fm
 fields=dict(re.findall(r'^(title|order|category): (.*)$',fm[1],re.M));assert fields['order']==str(n) and fields['category']=='chapter-3'
 rest=original[fm.end():].strip();first_note=re.search(r'^\[\^\d+\]:',rest,re.M);assert first_note
 raw_poem=rest[:first_note.start()].strip();definition_text=rest[first_note.start():]
 note_matches=list(re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',definition_text,re.M|re.S));assert note_matches and note_matches[0].start()==0
 definitions=[{'number':int(m[1]),'text':normalize(m[2])} for m in note_matches];assert [x['number'] for x in definitions]==list(range(1,len(definitions)+1))
 headings=list(re.finditer(r'^### ',raw_poem,re.M));assert len(headings)==1
 raw_preface=raw_poem[:headings[0].start()].strip();body=normalize(raw_poem[headings[0].start():]);preface=normalize(raw_preface)
 poem_notes=[x for x in definitions if x['number'] in refs(body)];preface_notes=[x for x in definitions if x['number'] in refs(preface)]
 assert not set(refs(body))&set(refs(preface)) and refs(body)+refs(preface)!=[]
 assert set(refs(body))|set(refs(preface))=={x['number'] for x in definitions}
 assert [x['number'] for x in poem_notes]==([2,3,4] if n==331 else list(range(1,len(definitions)+1)))
 assert [x['number'] for x in preface_notes]==([1] if n==331 else [])
 paras=body.split('\n\n');assert paras[-2]=='Thus indeed Venerable '+fields['title']+' Thera spoke these verses.' and paras[-1]=='The legend of '+fields['title']+' Thera is finished.'
 if n==331:assert paras[0]=='[331. Gandhathūpiya[Note 2]]' and preface=='Gandhathūpiya[Note 1] Chapter, the Thirty-Fourth'
 else:assert paras[0]=='{*'+str(n)+', BJTS only: '+fields['title']+'[Note 1]}'+('[Note 2]' if n==332 else '')
 layout=[];quote=[];cursor=0;paragraph_records=[]
 for i,paragraph in enumerate(paras):
  paragraph_records.append({'paragraph_index0':i,'offset_utf16':cursor,'characters_utf16':U(paragraph),'lines':len(paragraph.splitlines()),'sha256':H(paragraph),'note_numbers':refs(paragraph)});cursor+=U(paragraph)+2
 for i,paragraph in enumerate(paras[1:-2],1):
  cleaned=re.sub(r'\[Note \d+\]','',paragraph).strip();label=re.search(r'(?:(\(\d+(?:-\d+)?\)) )?(\[(\d+(?:-\d+)?)\])$',cleaned);assert label
  local=label[1][1:-1] if label[1] else None;global_label=label[3];suffix=label[0];layout.append({'local_label':local,'publisher_label':global_label,'suffix':suffix,'lines':len(paragraph.splitlines())})
  q=cleaned[:label.start()].rstrip();assert q and 'Note ' not in q and 'legend of' not in q
  quote.append({'paragraph':i,'local_label':local,'publisher_label':global_label,'text_sha256':H(q),'characters_utf16':U(q),'source_paragraph_sha256':H(paragraph),'suffix_sha256':H(suffix),'verse_lines':len(q.splitlines())})
 globals_flat=[i for r in layout for i in range(int(r['publisher_label'].split('-')[0]),int(r['publisher_label'].split('-')[-1])+1)];assert globals_flat==list(range(globals_flat[0],globals_flat[-1]+1))
 locals_flat=[i for r in layout if r['local_label'] is not None for i in range(int(r['local_label'].split('-')[0]),int(r['local_label'].split('-')[-1])+1)]
 assert locals_flat==(list(range(1,7)) if n==331 else [])
 u=source_by_number[n]['canonical_identity']['record'];assert u['id']==uid and u['book']==36
 root_sha=J({'id':uid,'book':36,'start':u['start'],'end':u['end'],'blocks':blocks[u['start']:u['end']]});assert root_sha==source_by_number[n]['canonical_identity']['root_sha256']
 root_numbers=[int(b[1]) for b in blocks[u['start']:u['end']] if b[0]=='hangnum'];assert root_numbers==list(range(root_numbers[0],root_numbers[-1]+1))
 descriptor={'kind':'publisher_preface','label':'Thirty-fourth Therā chapter preface','parent_id':uid,'body_sha256':H(preface),'notes_sha256':J(preface_notes),'note_numbers':[1]} if n==331 else None
 assert (bool(preface),bool(preface_notes))==((True,True) if n==331 else (False,False))
 # Empty publisher_paratext: the chapter text is represented ONCE in its separately owned preface.
 paratext=''
 assert all(ord(ch)<=65535 for ch in body)
 pages=[{'offset':i,'characters_utf16':U(body[i:i+500]),'text_sha256':H(body[i:i+500]),'prefix_sha256':H(body[:i+500])} for i in range(0,len(body),500)]
 note_records=[{'number':x['number'],'text_sha256':H(x['text']),'characters_utf16':U(x['text'])} for x in poem_notes]
 row={'publisher_poem':n,'canonical_owner':uid,'raw_sha256':H(raw),'raw_bytes':len(raw),'git_blob_sha1':B(raw),'title':fields['title'],'heading_sha256':H(paras[0]),'body_sha256':H(body),'body_characters_utf16':U(body),'body_paragraphs':len(paras),'body_paragraph_sha256s':[H(x) for x in paras],'paragraph_records':paragraph_records,'colophon_sha256s':[H(x) for x in paras[-2:]],'notes_sha256':J(poem_notes),'poem_note_numbers':[x['number'] for x in poem_notes],'note_count':len(poem_notes),'note_records':note_records,'preface':None if descriptor is None else {'descriptor':descriptor,'body_characters_utf16':U(preface),'note_records':[{'number':x['number'],'text_sha256':H(x['text']),'characters_utf16':U(x['text'])} for x in preface_notes]},'publisher_paratext_sha256':H(paratext),'stanza_layout':layout,'physical_entries':len(layout),'global_printed_labels':globals_flat,'local_printed_labels':locals_flat,'root':{'book':36,'start':u['start'],'end':u['end'],'root_sha256':root_sha,'root_verses':[root_numbers[0],root_numbers[-1]]},'stanza_quotation_scope':quote,'pages500':pages,'raw_region_hashes':{'raw_poem':H(raw_poem),'raw_definitions':H(definition_text),'raw_preface':H(raw_preface)},'complete_publisher_edition':True,'line_complete_VRI_claim':False}
 rows[uid]=row
 totals.update(sources=1,body_paragraphs=len(paras),physical_entries=len(layout),global_labels=len(globals_flat),poem_notes=len(poem_notes),prefaces=descriptor is not None,preface_notes=len(preface_notes),pages500=len(pages),quotes=len(quote))
# Neighbor is verified only as boundary evidence; never receives profile/activation.
witness=ORIGINAL/'src/_poems/chapter-3/poem-335.md';wraw=witness.read_bytes();assert H(wraw)=='d584d972d7a6009c74a9def1914607171090d3f0cf593189fdc135fd4d42d389' and B(wraw)=='e56193acd2dea3bca64af6a14232375235a83e7f'
assert r'### \[332. {335.}[^1] Phussitakammiya[^2]\]' in wraw.decode()
assert totals['physical_entries']==36 and totals['global_labels']==38 and totals['poem_notes']==22 and totals['preface_notes']==1
proof={'schema':'independent-original-first-four-english-normalization-v1','status':'PRESEALED_ORIGINAL_DERIVATION_BEFORE_PRODUCER_COMPARISON','publisher_revision':PUB,'vri_commit':VRI,'source_review_sha256':H(SOURCE.read_bytes()),'artifacts':rights,'xml_sha256':H(xml_raw),'xml_git_blob_sha1':B(xml_raw),'all14645_xml_tuple_sha256':J(blocks),'rows':rows,'totals':dict(totals),'rights':{'translation_license':'CC BY-NC-SA 4.0','license_url':'https://creativecommons.org/licenses/by-nc-sa/4.0/','translator':'Jonathan S. Walters','publisher':'Jonathan S. Walters and Whitman College','specific_translation_grant_over_generic_siteCCBY':True,'body_notes_apparatus_included':True,'media_audio_fonts_images_commercial_approval':False,'metadata_only_bundles_English_live_only':True,'retain_attribution_revision_license_modification_and_warranty_notices':True},'scope_caveats':['331 publisher Gandhathūpiya and VRI Gandhadhūpiya remain distinct spellings.','331 chapter preface owns note1 separately; poem owns2–4. Chapter preface is not poem paratext, stanza or quotation.','332–334 literal fancy headings retain braces, asterisk, BJTS-only statement and heading notes; absent local stanza numbers remain null.','331 physical combined3–4 and334 combined globals2951–2952 retain eight-line entries. No sub-entry English/VRI alignment is invented.','334 note4/body number tension and note8 repeated-foot discussion remain literally unchanged.','335 is a boundary witness only; all previous holds and339 source objects remain outside this additive normalization review.'],'no_producer_outputs_or_implementation_read_before_seal':True,'no_app_parser_import_runtime_test_build_git_or_network':True,'full_English_or_notes_written_to_reports':False,'source_and_normalization_only_not_runtime_activation_or_release':True}
for name,value in [('INDEPENDENT_ORIGINAL_FIRST_PROOF.json',proof)]:
 target=D/name;assert not target.exists();target.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
seal={'status':proof['status'],'proof_sha256':H((D/'INDEPENDENT_ORIGINAL_FIRST_PROOF.json').read_bytes()),'script_sha256':H(Path(__file__).read_bytes()),'producer_unread_before_this_seal':True,'totals':dict(totals)}
(D/'PRE_COMPARISON_SEAL.json').write_text(json.dumps(seal,indent=2)+'\n');print(json.dumps({**seal,'seal_sha256':H((D/'PRE_COMPARISON_SEAL.json').read_bytes())}))
