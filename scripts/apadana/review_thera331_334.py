#!/usr/bin/env python3
"""Original-first four-poem normalization proposal; stdlib, metadata/hashes only.
No application/parser import, generated scripture, network, test, build or Git.
CLI requires pinned originals, corrected canonical gzip, original XML, source-only
review and a fresh external output directory. English strings live only in memory.
"""
import argparse
import collections
import gzip
import hashlib
import json
import re
import time
import xml.etree.ElementTree as ET
from pathlib import Path

PUB = 'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
VRI = '2d134ff9ef60f70a1eb03c9370580228811a3070'
CANON = '46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8'
XML = 'ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
XML_BLOB = 'f37368072aece065d2668f93a74c24b423939f1f'
BOOK = 'bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44'
ORIGINAL_REVIEW = 'dace9bc63059c211f0ae090dc69a2bd4487b2fbeaee9fdce0579eae40c0c65a2'
REVISION = 'apadana-thera333-336-v1'
SELECTED = (331, 332, 333, 334)
SOURCES = {
331: ('Gandhathūpiya', 'b4fa678c98a204bc591a5d6d656961060af3d5164e23516b9c8dfadf98902b4e', '8e2540ef68328fcfe4efb38501d3d794a99892b5', 1803, 'tha-ap333', 9767, 9789),
332: ('Udakapūjaka', '4bdc8cc3749555de984ac177e2f23ce2cfae4d745a71844ac2d2009d1531a61a', '41d86773604b95cf0698e0e9fc19f6b5ff5d9bed', 4316, 'tha-ap334', 9789, 9812),
333: ('Punnāgapupphiya', '563afee319204fbf60b53ef7516e6fd0ffe44b13dec33760fefc8b68972a8be6', '1a934bc3068da402ba0f0550cd393fe0f07eb092', 1508, 'tha-ap335', 9812, 9829),
334: ('Ekadussadāyaka', 'a3694e139df9486a268e4e70ea6fe169d4a89827e6dfac3ea38def83340321f6', '18fa12248c64c360d1137240bf24fdabfa8a8d1f', 4761, 'tha-ap336', 9829, 9890),
}
RIGHTS = [
('LICENSE.md',19093,'66eea18fe8cb99e0d178d838a4932be0d3af8a6f844e933a8bbb0054e22f2592','4fd532b173b207f8bb96c861f58eaec49fd105b7'),
('src/_pages/about.md',12404,'17d8029419cd7b4c7f9e7f88d0127141d2425b3fe30516888b389ce7521f1352','70ae05d036d0440a69c0fb8d6d79cf478468ad54'),
('src/_includes/site/footer.njk',555,'08a7d4a0c3a9841afa38a8d98aa563e0ddedc6228f66e86b9a49d564aba26fd4','8fbd7bb5ccd73fb28dc789ad437b857891f3432c'),
('src/_includes/layouts/epub-metadata.xml',603,'1a6320b1580b76112c63bd557e419d5816b410197da666444e9d412327430b2f','3d3605879c096daea5cda3c3399ca93e771e6ec5'),
('src/_data/site.json',659,'6b4b5b5661b1bfb35cee0f207066fd6941aa042d6377993b02c77db677319efa','83f16121b162cff069e526cfc475edde1695f2cd'),
('src/_poems/_poems.json',135,'7c0d9a568ff9c495c89fb3ae13397ff71e8e1d678c221cca5966c9adc886cf22','da2e2f144856a7244b5c204464a596bd49af85c5'),
]
ESC = set('\\`*{}[]()#+.!_>-')
COMMON_NOTICES = [
 'Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Preserve independent VRI wording and all explicit edition differences; matching scope does not imply word/line equivalence.',
 'The canonical scope uses the reviewed atomic tha-ap333–336 boundary revision. Preserve source and locator pins; no old position, citation, note or private draft may be automatically rebased.',
]
NOTICES = {
331: [
 'Full original narrative of the scented offering to Siddhattha, chapter context, title and both colophons identify tha-ap333; no identity is inferred from a numerical offset.',
 'Publisher Gandhathūpiya and the supplied Gandhathūpiya chapter name remain distinct from VRI Gandhadhūpiya and Gandhodakavaggo. Publisher chapter note1 attributes its chapter-name choice to BJTS versus PTS; preserve that discussion without changing either source.',
 'The publisher chapter heading owns original note1 outside the poem. Poem heading owns note2; poem notes are exactly2–4. Never copy or reassign chapter note1 into poem text, poem notes or quotation evidence.',
 'Publisher local3–4/global2933–2934 is one original eight-line entry. Preserve its combined labels and wording, not an invented stanza split.',
 'Poem note2 alleges conflation with publisher95; retain that attributed cross-reference without approving a mapping to the earlier poem.',
],
332: [
 'Full original golden-Buddha, hand-tossed-water and Padumuttara prophecy narrative, title and both colophons identify tha-ap334; no identity is inferred from a numerical offset.',
 'The complete fancy-brace heading explicitly identifies BJTS-only332, including its literal asterisk and both title notes1–2. The seven stanza entries print only globals2937–2943; no local labels are supplied or inferred.',
 'Heading note2 owns the publisher explanation of three poems absent in its PTS witnesses and the divergence of PTS main versus BJTS brace numbering. Retain it as an attributed edition statement, not a newly verified manuscript conclusion or chapter-preface note.',
 'Heading note1 claims an earlier duplicate at publisher106; this does not approve a new identity, substitute source or root reuse.',
 'VRI13 remains abbreviated with peyyāla; the full published attainment formula belongs to the publisher edition and does not expand the VRI. Note5 keeps its mixed straight/curly quotation punctuation.',
],
333: [
 'Full original hunter, flowering punnāga, sand-stupa and Tamonuda narrative, title and both colophons identify tha-ap335; no identity is inferred from a numerical offset.',
 'The complete fancy-brace heading explicitly identifies BJTS-only333, including its literal asterisk and original title note1. Five stanza entries print only globals2944–2948; no local labels are supplied or inferred.',
 'Title note1 claims an earlier duplicate at publisher159; retain its original punctuation and discussion without approving a different canonical root. Note4 keeps its speculative etymology and question mark without scholarly correction.',
 'VRI18 remains abbreviated with peyyāla; the full published attainment formula belongs to the publisher edition and does not expand the VRI.',
],
334: [
 'Full original Haṃsavatī grass-bearer, children, single-cloth gift and Padumuttara prophecy narrative, title and both colophons identify tha-ap336; no identity is inferred from a numerical offset.',
 'The complete fancy-brace heading explicitly identifies BJTS-only334, including its literal asterisk and original title note1. Nineteen physical entries print twenty global labels2949–2968; no local labels are supplied or inferred.',
 'Globals2951–2952 remain one original eight-line entry. Printed globals2957–2959 divide material across VRI27–28 differently; preserve the publisher partition and never claim one-entry/one-VRI-stanza or line-complete correspondence.',
 'Note2 attributes a later duplicate419 {422} and an editorial-supply explanation. Preserve the note without approving that later source or a replacement mapping.',
 'Note4 retains the published amendment statement kappasatahassāni to kappasattasahassāni alongside the English hundred-thousand wording and untouched VRI26 Kappasatasahassāni. Do not silently reconcile their apparent tension; interpretation remains for specialist review.',
 'Retain the repeated wording discussed in note8 and the supplied finite-verb reading in note7, including its mixed straight/curly quotation punctuation. VRI37 remains abbreviated with peyyāla; the full published formula does not expand it.',
]}

def sha(value): return hashlib.sha256(value if isinstance(value,bytes) else value.encode()).hexdigest()
def compact(value): return json.dumps(value,ensure_ascii=False,separators=(',',':'))
def utf16(value): return len(value.encode('utf-16-le'))//2
def blob(value): return hashlib.sha1(b'blob '+str(len(value)).encode()+b'\0'+value).hexdigest()
def source_file(source,path,size,pin,oid):
 p=(source/path).resolve();assert p.is_relative_to(source)
 raw=p.read_bytes();assert len(raw)==size and sha(raw)==pin and blob(raw)==oid,path
 return raw

def xml_tuple(e):
 pages={}
 def inner(n):
  value=n.text or ''
  for c in n:
   if c.tag=='pb':pages.setdefault(c.get('ed'),[]).append('.'.join(str(int(x))if x.isdigit()else x for x in c.get('n').split('.')))
   elif c.tag!='note':value+=inner(c)
   value+=c.tail or ''
  return value
 value=' '.join(inner(e).split());rend=e.get('rend',e.tag);number=e.get('n');notes=[' '.join(''.join(x.itertext()).split())for x in e.iter('note')]
 if rend=='hangnum':assert re.fullmatch(r'\d+\.',value);number,value=value[:-1],''
 return [rend,number,value,notes,pages]

def render(value,publisher,owner):
 """Explicit source rules; no SUT imports, outputs or unknown presentation grammar."""
 operations=collections.Counter()
 assert not re.search(r'\{\.(?:no-)?diacritics\b|<span\b',value),'These four raw artifacts own no state-pair syntax'
 def abbreviation(m):operations['abbreviation_wrapper']+=1;return m[2]
 value=re.sub(r'<abbr title="(Buddha Jayanthi Tripitaka Series|Pali Text Society)">([^<>]+)</abbr>',abbreviation,value)
 assert '<'not in value and '>'not in value and not re.search(r'&\S+;',value)
 def note(m):operations['source_note_marker']+=1;return '[Note '+m[1]+']'
 value=re.sub(r'\[\^(\d+)\]',note,value)
 chars=[];i=0
 while i<len(value):
  if value[i]=='\\'and i+1<len(value)and value[i+1]in ESC:
   chars.append(value[i+1]);i+=2;operations['markdown_escape']+=1
  else:chars.append(value[i]);i+=1
 lines=[]
 for line in ''.join(chars).splitlines():
  heading=re.match(r'^#{1,3}\s+',line)
  if heading:line=line[heading.end():];operations['heading_prefix']+=1
  result=[];i=0
  while i<len(line):
   if line[i]=='*':
    end=line.find('*',i+1)
    if end>i+1:
     result.append(line[i+1:end]);i=end+1;operations['balanced_emphasis_pair']+=1
    else:
     assert publisher in (332,333,334)and owner=='body:0'and line.startswith('{*'+str(publisher)+', '),'Unexpected unpaired emphasis'
     result.append('*');i+=1;operations['literal_unpaired_asterisk_retained']+=1
   else:result.append(line[i]);i+=1
  lines.append(''.join(result).rstrip(' \t'))
 return re.sub(r'\n{3,}','\n\n','\n'.join(lines)).strip(),dict(operations)

def produce(source,canon_path,xml_path,review_path):
 start=time.monotonic();raw=Path(review_path).read_bytes();assert sha(raw)==ORIGINAL_REVIEW
 review=json.loads(raw);assert review['status']=='GO_FOUR_EXACT_ORIGINAL_PUBLISHER_SCOPES_IMPLEMENTATION_HELD'
 prior={r['publisher_poem']:r for r in review['poems']}
 packed=Path(canon_path).read_bytes();canonraw=gzip.decompress(packed)if packed.startswith(b'\x1f\x8b')else packed;assert sha(canonraw)==CANON
 canon=json.loads(canonraw);assert canon['source']['commit']==VRI
 xml=Path(xml_path).read_bytes();assert sha(xml)==XML and blob(xml)==XML_BLOB
 nodes=[n for n in ET.fromstring(xml).iter()if n.tag in ('p','head','trailer')];assert len(nodes)==14646
 assert xml_tuple(nodes[1130])==['gatha1',None,'',['imā dve gāthāyo syāmapotthake na santi'],{}]
 blocks=[xml_tuple(n)for i,n in enumerate(nodes)if i!=1130];assert len(blocks)==14645 and sha(compact(blocks))==BOOK and blocks==canon['books'][36]['blocks']
 units={u['id']:u for u in canon['units']};rights=[]
 for path,size,pin,oid in RIGHTS:
  source_file(source,path,size,pin,oid);rights.append(dict(path=path,bytes=size,sha256=pin,git_blob_sha1=oid))
 profiles={};links={};goldens=[];scopes=[];combined=[];all_ops=collections.Counter()
 for publisher in SELECTED:
  assert time.monotonic()-start<90
  title,pin,oid,size,uid,a,b=SOURCES[publisher];path=f'src/_poems/chapter-3/poem-{publisher}.md'
  data=source_file(source,path,size,pin,oid);raw=data.decode();assert all(ord(c)<=0xffff for c in raw),'BMP proof required for Python/JS UTF16 slice equality'
  front=re.match(r'^---\ntitle: ([^\n]+)\norder: (\d+)\ncategory: chapter-3\n---\n',raw);assert front and front[1]==title and int(front[2])==publisher
  definitions=list(re.finditer(r'^\[\^(\d+)\]:[ \t]*',raw,re.M));assert definitions
  original_paragraphs=re.split(r'\n[ \t]*\n',raw[front.end():definitions[0].start()].strip())
  preface_raw=original_paragraphs.pop(0)if publisher==331 else''
  assert preface_raw.startswith('## ')if publisher==331 else not any(p.startswith('## ')for p in original_paragraphs)
  assert original_paragraphs[0].startswith('### ')and original_paragraphs[-2].startswith('Thus indeed ')and original_paragraphs[-1].startswith('The legend of ')
  preface,pref_ops=render(preface_raw,publisher,'chapter-heading');all_ops.update(pref_ops)
  paragraphs=[];paragraph_proofs=[]
  for i,p in enumerate(original_paragraphs):
   text,ops=render(p,publisher,'body:'+str(i));paragraphs.append(text);all_ops.update(ops)
   paragraph_proofs.append(dict(paragraph_index0=i,raw_sha256=sha(p),sha256=sha(text),characters_utf16=utf16(text),lines=len(text.splitlines()),presentation_operations=ops))
  text='\n\n'.join(paragraphs);assert len(paragraphs)==len(prior[publisher]['stanza_layout_source_only'])+3
  all_notes=[];note_proofs=[];note_owners=[]
  for i,m in enumerate(definitions):
   n=int(m[1]);end=definitions[i+1].start()if i+1<len(definitions)else len(raw);note_raw=raw[m.end():end]
   note,ops=render(note_raw,publisher,'note:'+str(n));all_ops.update(ops)
   assert all(ord(c)<=0xffff for c in note)
   owners=[j for j,p in enumerate(original_paragraphs)if '[^'+str(n)+']'in p]
   if publisher==331 and n==1:
    assert not owners and '[^1]'in preface_raw;owner=dict(kind='publisher_preface',parent_id=uid,paragraph_index=None,physical_entry=None)
   else:
    assert len(owners)==1;j=owners[0];owner=dict(kind='poem_title'if j==0 else'poem',paragraph_index=j,physical_entry=j if j>0 else None)
   all_notes.append(dict(number=n,text=note));note_proofs.append(dict(number=n,sha256=sha(note),characters_utf16=utf16(note),lines=len(note.splitlines()),raw_sha256=sha(note_raw.strip()),owner=owner,presentation_operations=ops))
   note_owners.append(dict(number=n,definition_line=raw[:m.start()].count('\n')+1,owner=owner))
  assert [n['number']for n in all_notes]==list(range(1,len(all_notes)+1))
  preface_notes=[n for n in all_notes if publisher==331 and n['number']==1];notes=[n for n in all_notes if n not in preface_notes]
  assert [n['number']for n in notes]==([2,3,4]if publisher==331 else list(range(1,len(all_notes)+1)))
  assert sorted(int(n)for n in re.findall(r'\[\^(\d+)\]','\n\n'.join(original_paragraphs)))==[n['number']for n in notes]
  layout=[];quote_proofs=[];quotations=[];suffix_only=[];global_labels=[];local_labels=[]
  for i,p in enumerate(paragraphs[1:-2],1):
   clean=re.sub(r'\[Note \d+\]','',p).strip();suffix=re.search(r'(?:\((\d+(?:-\d+)?)\) )?\[(\d+(?:-\d+)?)\]$',clean);assert suffix
   local,glob=suffix[1],suffix[2];lo=int(glob.split('-')[0]);hi=int(glob.split('-')[-1]);global_labels.extend(range(lo,hi+1))
   assert (local is not None)==(publisher==331)
   if local is not None:local_labels.extend(range(int(local.split('-')[0]),int(local.split('-')[-1])+1))
   assert len(p.splitlines())==4*(hi-lo+1)
   if hi>lo:combined.append(dict(publisher_poem=publisher,physical_entry=i,local_label=local,publisher_label=glob,lines=len(p.splitlines())))
   descriptor=dict(local_label=local,publisher_label=glob,suffix=suffix[0],lines=len(p.splitlines()));layout.append(descriptor)
   quotation=clean[:suffix.start()].strip();quotations.append(quotation)
   assert p.endswith(suffix[0]);with_markers=p[:-len(suffix[0])].strip();suffix_only.append(with_markers)
   quote_proofs.append(dict(physical_entry=i,body_paragraph=i,sha256=sha(quotation),characters_utf16=utf16(quotation),lines=len(quotation.splitlines()),suffix_only_sha256=sha(with_markers),suffix_only_characters_utf16=utf16(with_markers),removed_suffix_sha256=sha(suffix[0]),owned_note_markers_removed=True,all_wording_punctuation_linebreaks_preserved=True))
  unit=units[uid];assert (unit['book'],unit['start'],unit['end'],unit['index_revision'])==(36,a,b,REVISION)
  root_blocks=blocks[a:b];markers=[int(x[1])for x in root_blocks if x[0]=='hangnum'];root=sha(compact(dict(id=uid,book=36,start=a,end=b,blocks=root_blocks)))
  assert root==prior[publisher]['canonical_identity']['root_sha256']
  rawurl=f'https://raw.githubusercontent.com/apadana-translation/apadana-site/{PUB}/{path}'
  profile=dict(exact_ref_url=rawurl,id=uid,publisher_chapter='chapter-3',poem=publisher,verses=[global_labels[0],global_labels[-1]],root_verses=[markers[0],markers[-1]],note_count=len(notes),note_numbers=[n['number']for n in notes],source='apadana',path=f'/text/chapter-3/poem-{publisher}/',url=f'https://apadanatranslation.com/text/chapter-3/poem-{publisher}/',raw_url=rawurl,translator='Jonathan S. Walters',license='CC BY-NC-SA 4.0',translation_revision=PUB,title=title,reference=f'Therā Apadāna publisher poem {publisher}; complete publisher-edition poem; original numbering retained',raw_sha256=pin,body_sha256=sha(text),notes_sha256=sha(compact(notes)),paratext_sha256=sha(preface),root_sha256=root,stanza_layout=layout,mapping_notes=COMMON_NOTICES+NOTICES[publisher],index_revision=REVISION,publisher_verse_labels=[x['publisher_label']for x in layout])
  heading_proof=dict(raw_sha256=sha(original_paragraphs[0]),body_sha256=sha(paragraphs[0]),characters_utf16=utf16(paragraphs[0]),lines=1,note_numbers=[int(n)for n in re.findall(r'\[\^(\d+)\]',original_paragraphs[0])],literal_asterisk_preserved=publisher!=331,kind='ordinary_publisher_heading'if publisher==331 else'BJTS-only-fancy-brace-heading')
  if publisher!=331:
   profile['publisher_heading_sha256']=sha(paragraphs[0]);assert paragraphs[0].startswith('{*'+str(publisher)+', BJTS only: ')
  if preface:
   profile['publisher_preface']=dict(kind='publisher_preface',parent_id=uid,label='Thirty-fourth Therā chapter preface',body_sha256=sha(preface),notes_sha256=sha(compact(preface_notes)),note_numbers=[1])
  profiles[uid]=profile;links[uid]={**profile,'english':title,'match':'individually-reviewed-whole-poem'}
  pages=[dict(offset=o,characters_utf16=utf16(text[o:o+500]),text_sha256=sha(text[o:o+500]),prefix_sha256=sha(text[:o+len(text[o:o+500])]),next_offset=o+500 if o+500<len(text)else None)for o in range(0,len(text),500)]
  paratext_proof=dict(raw_sha256=sha(preface_raw),body_sha256=sha(preface),characters_utf16=utf16(preface),lines=len(preface.splitlines()),note_numbers=[n['number']for n in preface_notes],notes_sha256=sha(compact(preface_notes)),note_proofs=[n for n in note_proofs if n['owner']['kind']=='publisher_preface'],presentation_operations=pref_ops)
  golden=dict(id=uid,publisher_poem=publisher,source_path=path,raw_sha256=pin,raw_bytes=size,git_blob_sha1=oid,title=title,body_sha256=sha(text),body_characters_utf16=utf16(text),body_paragraphs=paragraph_proofs,heading=heading_proof,notes_sha256=sha(compact(notes)),notes=[n for n in note_proofs if n['owner']['kind']!='publisher_preface'],note_numbers=profile['note_numbers'],all_original_notes=note_proofs,original_note_count=len(all_notes),paratext_sha256=sha(preface),publisher_paratext=paratext_proof,publisher_preface=profile.get('publisher_preface'),stanza_layout=layout,physical_stanza_entries=len(layout),printed_global_labels=global_labels,printed_local_labels=local_labels,quotation_proofs=quote_proofs,quotation_text_sha256=sha('\n\n'.join(quotations)),suffix_only_quotation_text_sha256=sha('\n\n'.join(suffix_only)),pages500=pages,root=dict(id=uid,book=36,start=a,end=b,title=unit['title'],vri=unit['vri'],index_revision=REVISION,root_sha256=root,vri_numbered_labels=markers),mapping_notes=profile['mapping_notes'],chapter_summary=None,collection_summary=None,publisher_divisions=[],edition_limits=NOTICES[publisher])
  goldens.append(golden)
  scopes.append(dict(publisher=publisher,canonical_candidate=uid,publisher_title=title,raw_artifact=dict(path=path,url=rawurl,bytes=size,sha256=pin,git_blob_sha1=oid),source_scope_decision='EXACT_COMPLETE_PUBLISHER_EDITION_POEM_ONLY',body_paragraphs=len(paragraphs),physical_entries=len(layout),printed_global_labels=global_labels,printed_local_labels=local_labels,poem_note_numbers=profile['note_numbers'],preface_note_numbers=[n['number']for n in preface_notes],note_owners=note_owners,root_span=[a,b],root_sha256=root,vri_numbered_labels=markers,index_revision=REVISION,presentation_recipe='explicit-source-rules-v1',source_approval_inherited_only=True,normalization_proposal_only=True,runtime_activation_approval=False))
 assert [p['physical_stanza_entries']for p in goldens]==[5,7,5,19]
 assert sum(len(g['body_paragraphs'])for g in goldens)==48 and sum(len(g['all_original_notes'])for g in goldens)==23 and sum(len(g['notes'])for g in goldens)==22
 assert [n for g in goldens for n in g['printed_global_labels']]==list(range(2931,2969))
 assert combined==[dict(publisher_poem=331,physical_entry=3,local_label='3-4',publisher_label='2933-2934',lines=8),dict(publisher_poem=334,physical_entry=3,local_label=None,publisher_label='2951-2952',lines=8)]
 assert all_ops['literal_unpaired_asterisk_retained']==3
 rules=['Pinned original Markdown only; reject unknown HTML/state-pair/entity syntax.','Replace only exact PTS/BJTS abbreviation wrappers with their inner printed label.','Replace owned source footnote calls with [Note n]; preserve each note definition under its source owner.','Unescape the explicit Markdown punctuation set, strip one-to-three-hash heading prefixes, remove balanced emphasis per line, retain source unpaired literal asterisks in the three exact BJTS-only headings.','Trim line-final spaces/tabs, join paragraphs by two newlines, collapse excess blank lines. Do not normalize Unicode, smart quotes, spelling, words, numbering, combined entries or missing local labels.','Standard quotation excludes owned note markers and the exact printed terminal suffix only; suffix-only hashes additionally retain note markers for a literal proof. No title, colophon or chapter apparatus enters quotation.','500-character API plans use UTF16 units; all four pinned raw sources and normalized strings are BMP-only, making these slices exactly Python/JS equal.']
 scope=dict(schema='independent-four-original-normalization-source-scopes-v1',base_commit='ac620911e349b089eedeb93906675c62c9523b24',publisher_revision=PUB,vri_revision=VRI,canonical_logical_sha256=CANON,original_xml_sha256=XML,source_book_sha256=BOOK,prior_original_review_sha256=ORIGINAL_REVIEW,rights=rights,poems=scopes,presentation_rules=rules,finite_combined_entries=combined,finite_literal_asterisk_owners=[dict(publisher=p,body_paragraph=0)for p in (332,333,334)],original_source_comparison_repeated=True,candidate_runtime_or_profile_outputs_used_as_oracle=False,runtime_activation_approval=False)
 scope_sha=sha((json.dumps(scope,ensure_ascii=False,indent=2)+'\n').encode())
 totals=dict(poems=4,body_paragraphs=48,physical_stanza_entries=36,printed_global_labels=38,printed_local_labels=6,entries_with_absent_local_label=31,original_notes=23,poem_notes=22,preface_notes=1,preface_scopes=1,combined_eight_line_entries=2,pages500=sum(len(g['pages500'])for g in goldens),body_characters_utf16=sum(g['body_characters_utf16']for g in goldens),poem_note_characters_utf16=sum(n['characters_utf16']for g in goldens for n in g['notes']),preface_note_characters_utf16=sum(n['characters_utf16']for g in goldens for n in g['all_original_notes']if n['owner']['kind']=='publisher_preface'))
 goldenroot=dict(schema='independent-original-four-normalization-goldens-v1',publisher_revision=PUB,vri_revision=VRI,canonical_logical_sha256=CANON,original_xml_sha256=XML,all_original_xml_tuples=14645,source_scope_sha256=scope_sha,rights=rights,totals=totals,presentation_operations=dict(all_ops),poems=goldens,candidate_runtime_or_profile_outputs_used_as_oracle=False,normalization_proposal_only=True,runtime_activation_release_approval=False)
 return {'SOURCE_SCOPES.json':scope,'EXPECTED_PROFILES.json':profiles,'EXPECTED_LINKS.json':links,'GOLDENS.json':goldenroot}

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for name in ('source','canon','xml','source-review','out'):p.add_argument('--'+name,required=True,type=Path)
 a=p.parse_args();source=a.source.resolve();out=a.out.resolve();assert source.is_dir()and not out.exists()and source not in out.parents
 objects=produce(source,a.canon,a.xml,a.source_review);out.mkdir(parents=True)
 files={}
 for name,v in objects.items():
  data=(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode();(out/name).write_bytes(data);files[name]=dict(bytes=len(data),sha256=sha(data))
 receipt=dict(schema='original-first-four-normalization-producer-receipt-v1',producer_sha256=sha(Path(__file__).read_bytes()),inputs=dict(source=str(source),canon=str(a.canon),xml=str(a.xml),source_review=str(a.source_review)),output=files,totals=objects['GOLDENS.json']['totals'],metadata_hashes_only=True,English_bodies_or_notes_written=False,app_import_build_tests_Git_network=False,runtime_activation_release_approval=False)
 (out/'DERIVATION_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
