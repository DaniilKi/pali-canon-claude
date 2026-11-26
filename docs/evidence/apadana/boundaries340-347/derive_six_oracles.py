"""Independent source-only review; no app imports, tests, build, Git or network."""
import collections,copy,gzip,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
D=Path(__file__).parent;DATA=Path('/tmp/pali-boundaries340-nov26/server/data');XML=Path('/tmp/pali-sariputta-release/vri-fixture/romn/s0510m1.mul.xml')
H=lambda value:hashlib.sha256(value if isinstance(value,bytes) else value.encode('utf8')).hexdigest();C=lambda obj:json.dumps(obj,ensure_ascii=False,separators=(',',':'));J=lambda obj:H(C(obj));B=lambda raw:hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
xml_raw=XML.read_bytes();assert H(xml_raw)=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1' and B(xml_raw)=='f37368072aece065d2668f93a74c24b423939f1f'
root=ET.fromstring(xml_raw);physical=[e for e in root.iter() if e.tag in ('p','head','trailer')]
def visible(e):
 text=e.text or ''
 for child in e:
  if child.tag not in ('note','pb') and not(child.tag=='hi' and child.get('rend') in ('paranum','dot')):text+=visible(child)
  text+=child.tail or ''
 return text
collapse=lambda text:re.sub(r'\s+',' ',text).strip()
blocks=[];omitted=[]
for i,e in enumerate(physical):
 text=collapse(visible(e));number=e.get('n')
 if not text and not number:omitted.append(i);continue
 pages={}
 for pb in e.iter('pb'):pages.setdefault(pb.get('ed'),[]).append('.'.join(str(int(x)) for x in pb.get('n').split('.')))
 blocks.append([e.get('rend') or ('centre' if e.tag=='trailer' else 'bodytext'),number,text,[collapse(''.join(n.itertext())) for n in e.iter('note')],pages])
assert len(physical)==14646 and len(blocks)==14645 and omitted==[1130] and J(blocks)=='bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44'
manifest=json.loads((DATA/'canon.json.gz.parts.json').read_bytes());packed=b''.join((DATA/p['file']).read_bytes() for p in manifest['parts']);assert len(packed)==manifest['size'] and H(packed)==manifest['sha256'];rawcanon=gzip.decompress(packed);assert H(rawcanon)=='46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8';canon=json.loads(rawcanon);assert canon['source']['commit']=='2d134ff9ef60f70a1eb03c9370580228811a3070' and canon['books'][36]['blocks']==blocks

BASE='c1b2433481399b2125f6645a75bf4105cb212440'
PIN=canon['source']['commit'];REV='apadana-thera340-341-343-344-346-347-v1'
IDS=['tha-ap340','tha-ap341','tha-ap343','tha-ap344','tha-ap346','tha-ap347']
PAIRS=[('tha-ap340','tha-ap341',10118),('tha-ap343','tha-ap344',10258),('tha-ap346','tha-ap347',10324)]
assert re.fullmatch(r'[A-Za-z0-9._-]{1,40}',REV) and len(REV)==39
assert C(canon).encode()==rawcanon and len(canon['units'])==8544 and len(canon['books'])==61
units={u['id']:u for u in canon['units']};before={uid:copy.deepcopy(units[uid]) for uid in IDS}
prior=D.parent.parent/'pali-four-english-evidence-nov26/next-boundary-independent-review'
assert H((prior/'SOURCE_BOUNDARY_REVIEW.json').read_bytes())=='5f91dfe0a7c29fadf58f9d71f5a24f22e9c18dc3bd7a9eb2767f4beb3092f05a'
assert H((prior/'OLD_CITATION_CROSSWALK.json').read_bytes())=='a60394f1f4aa978a0f6ffade5465e8b0e1cfea8e9a9ad6049ec214a3f3f1c621'
oldmap=json.loads((prior/'OLD_CITATION_CROSSWALK.json').read_bytes())
old_review=json.loads((prior/'SOURCE_BOUNDARY_REVIEW.json').read_bytes())
assert all(before[uid]==r['old_records'][uid] for r in old_review['pair_records'] for uid in r['ids'])

# XML-derived printed numbers, literal titles and carried PTS pages.
carried=[];previous_P=None
for row in blocks:
 carried.append(previous_P)
 if row[4].get('P'):previous_P=row[4]['P'][-1]
HD={'subhead','title','chapter','book','nikaya','centre','subsubhead'}
def pts(u):
 span=blocks[u['start']:u['end']];first=next(row for row in span if row[0] not in HD)
 assert not first[4].get('P'),'Reviewed openings have no inline PTS offset ambiguity'
 first_inside=next((row[4]['P'][0] for row in span if row[4].get('P')),None)
 at=carried[u['start']];opening=at if at and (not first_inside or at.split('.')[0]==first_inside.split('.')[0]) else first_inside
 last=next((row[4]['P'][-1] for row in reversed(span) if row[4].get('P')),opening)
 volume,page=map(int,opening.split('.'));return {'volume':volume,'page':page,'end_page':int(last.split('.')[1])}
after={};pairs=[]
for left,right,cut in PAIRS:
 a=copy.deepcopy(before[left]);b=copy.deepcopy(before[right]);assert a['book']==b['book']==36 and a['end']==b['start']==cut+4
 assert [x[0] for x in blocks[cut:cut+4]]==['subhead','hangnum','gatha1','gathalast']
 assert [x[0] for x in blocks[cut-2:cut]]==['bodytext','centre']
 assert blocks[cut-2][2].endswith('imā gāthāyo abhāsitthāti.') and 'padānaṃ ' in blocks[cut-1][2]
 a['end']=cut;b['start']=cut;b['title']=re.sub(r'^\d+\.\s*','',blocks[cut][2]);assert b['title']==before[right]['title']+'ṃ'
 for u in [a,b]:
  ns=[int(row[1]) for row in blocks[u['start']:u['end']] if row[0]=='hangnum'];assert ns==list(range(ns[0],ns[-1]+1))
  u['vri']=f'{ns[0]}–{ns[-1]}';u['index_revision']=REV;assert pts(u)==pts(before[u['id']])==u['pts'];after[u['id']]=u
 pairs.append({'ids':[left,right],'old_cut':cut+4,'new_cut':cut,'unchanged_combined_source_span':[a['start'],b['end']],
  'combined_source_tuple_sha256':J(blocks[a['start']:b['end']]),'literal_heading_sha256':H(blocks[cut][2]),
  'physical_XML_heading_index':cut+1,'previous_speaker_sha256':H(blocks[cut-2][2]),'previous_closing_colophon_sha256':H(blocks[cut-1][2]),
  'first_stanza_vri':blocks[cut+1][1],'old_current_right_first_vri':blocks[cut+4][1],
  'first_stanza_source_blocks':[cut+1,cut+4],'prefix_notes_sha256':J([n for row in blocks[cut:cut+4] for n in row[3]]),
  'prefix_page_markers':[[cut+i,row[4]] for i,row in enumerate(blocks[cut:cut+4]) if row[4]],
  'unchanged_book_source_locator':PIN,'new_unit_locator_revision':PIN+'-'+REV})
future=copy.deepcopy(canon)
for i,u in enumerate(future['units']):
 if u['id'] in after:future['units'][i]=after[u['id']]
future_raw=C(future).encode();future_sha=H(future_raw)
assert future['books']==canon['books'] and future['source']==canon['source'] and future['collections']==canon['collections']
assert [u for u in future['units'] if u['id'] not in IDS]==[u for u in canon['units'] if u['id'] not in IDS]
assert len([u for u in canon['units'] if u['id'] not in IDS])==8538
assert {u['id'] for u in canon['units'] if u!=next(v for v in future['units'] if v['id']==u['id'])}==set(IDS)
dependencies=[u['id'] for u in canon['units'] if u.get('shares_passage_with') in IDS or set(u.get('members',[]))&set(IDS)];assert dependencies==[]

# Source-derived grouping: empty numbered markers open stanzas; gathalast closes
# them; nonverse source paragraphs are separate. Words never leave this process.
HEAD={'subhead','title','chapter','book','nikaya','subsubhead'};VERSE={'gatha1','gatha2','gatha3','gathalast'}
CENTRE=re.compile(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$',re.I)
EDITIONS={'T':('thai','Thai'),'M':('myanmar','Myanmar'),'V':('vri','VRI')}
ROMAN={1:'i',2:'ii',3:'iii',4:'iv',5:'v'}
def uniq(xs):return list(dict.fromkeys(xs))
def render(u,source_blocks=blocks):
 out=[];stanza=None;pending=[]
 def flush():
  nonlocal stanza
  if stanza is not None:out.append(stanza);stanza=None
 for i in range(u['start'],u['end']):
  rend,n,text,notes,pages=source_blocks[i];eds=pending+[(ed,p) for ed in EDITIONS for p in pages.get(ed,[])];pending=[]
  if rend=='hangnum':
   assert not text and not notes and not pages.get('P'), 'Source markers in reviewed book have no unsupported number-only payload'
   flush();stanza={'type':'verse','vri_paragraph':n,'text':'','source_blocks':[i,i+1],'notes':[],'P':[],'editions':eds};continue
  if rend in VERSE:
   if stanza is None:stanza={'type':'verse','vri_paragraph':n,'text':'','source_blocks':[i,i+1],'notes':[],'P':[],'editions':[]}
   stanza['text']+=('\n' if stanza['text'] else '')+text;stanza['source_blocks'][1]=i+1;stanza['notes'].extend(notes);stanza['P'].extend(pages.get('P',[]));stanza['editions'].extend(eds)
   if rend=='gathalast':flush()
   continue
  flush()
  if not text:pending=eds;continue
  out.append({'type':'heading' if rend in HEAD or rend=='centre' and CENTRE.search(text) else 'prose','vri_paragraph':n,'text':text,'source_blocks':[i,i+1],'notes':notes,'P':pages.get('P',[]),'editions':eds})
 flush();rows=[]
 for i,s in enumerate(out):
  r={'ref':u['id']+'/'+str(i+1),'uid':u['id'],'segment_index0':i,'offset':i,'type':s['type'],'vri_paragraph':s['vri_paragraph'],
   'source_blocks':s['source_blocks'],'text_sha256':H(s['text']),'text_utf16_length':len(s['text'].encode('utf-16-le'))//2,
   'source_note_sha256':[H(n) for n in s['notes']],'source_notes_sha256':J(s['notes']),'variant_reading_count':len(s['notes']),
   'raw_PTS_page_begins':uniq(s['P']),'raw_edition_page_begins':{ed:uniq(p for e,p in s['editions'] if e==ed) for ed in EDITIONS},
   'pts_page_begins':uniq('Ap '+ROMAN.get(int(p.split('.')[0]),p.split('.')[0])+' '+str(int(p.split('.')[1])) for p in s['P'])}
  for ed,(key,name) in EDITIONS.items():r[key+'_page_begins']=uniq(name+' Ap '+str(int(p.split('.')[0]))+'.'+str(int(p.split('.')[1])) for e,p in s['editions'] if e==ed)
  rows.append(r)
 return rows
old=[s for uid in IDS for s in render(before[uid])];new=[s for uid in IDS for s in render(after[uid])];assert len(old)==len(new)==89
old_core={s['ref']:{k:s[k] for k in ('ref','type','vri_paragraph','source_blocks','text_sha256')} for s in old}
for r in oldmap['records']:
 assert old_core[r['old']['ref']]=={k:r['old'][k] for k in old_core[r['old']['ref']]}
new_by_span={tuple(s['source_blocks']):s for s in new};new_by_ref={s['ref']:s for s in new};assert len(new_by_span)==89
mapping=[]
for s in old:
 destination=new_by_span[tuple(s['source_blocks'])]
 fields=('type','vri_paragraph','source_blocks','text_sha256','text_utf16_length','source_note_sha256','source_notes_sha256','variant_reading_count','raw_PTS_page_begins','raw_edition_page_begins','pts_page_begins','thai_page_begins','myanmar_page_begins','vri_page_begins')
 assert all(s[k]==destination[k] for k in fields)
 same=new_by_ref.get(s['ref']);category='VANISHED_OLD_OWNER_REF' if same is None else 'SAME_NUMERIC_REF_DIFFERENT_SOURCE' if same['source_blocks']!=s['source_blocks'] else 'SAME_NUMERIC_REF_AND_SOURCE_STILL_REQUIRES_NEW_PIN'
 mapping.append({'old':s,'future_exact_source_owner':destination,'same_numeric_ref_future':same,'category':category,'cross_owner_move':s['uid']!=destination['uid'],'require_new_pin_for_old_position':True,'automatic_private_data_or_export_migration_authorized':False})
counts=dict(collections.Counter(r['category'] for r in mapping));assert counts=={'SAME_NUMERIC_REF_AND_SOURCE_STILL_REQUIRES_NEW_PIN':45,'SAME_NUMERIC_REF_DIFFERENT_SOURCE':38,'VANISHED_OLD_OWNER_REF':6}
assert sum(r['cross_owner_move'] for r in mapping)==6
assert sum(s['variant_reading_count'] for s in old)==sum(s['variant_reading_count'] for s in new)==17

# Full source-book anchors are rendered by source position, never unit ownership.
whole={'id':'vri-book:s0510m1','start':0,'end':len(blocks)};book_segments=render(whole);pages=[]
for focus in sorted({v for a,b,cut in PAIRS for v in (before[a]['start'],cut,before[b]['end'])}):
 index=next(i for i,s in enumerate(book_segments) if s['source_blocks'][0]<=focus<s['source_blocks'][1]);offset=max(0,index-1)
 pages.append({'source_block_focus':focus,'arguments':{'book':'s0510m1','offset':offset,'limit':3,'variants':'none'},'segments':book_segments[offset:offset+3]})
controls=[]
for uid in ['tha-ap107','tha-ap108','tha-ap333','tha-ap334','tha-ap335','tha-ap336','tha-ap342','tha-ap345','mn10']:
 u=units[uid];assert next(x for x in future['units'] if x['id']==uid)==u
 expected='apadana-thera105-106-v1' if uid in ('tha-ap107','tha-ap108') else 'apadana-thera333-336-v1' if uid in ('tha-ap333','tha-ap334','tha-ap335','tha-ap336') else None
 assert u.get('index_revision')==expected
 control_blocks=blocks if u['book']==36 else canon['books'][u['book']]['blocks']
 controls.append({'arguments':{'uid':uid,'limit':1},'locator_revision':PIN+'-'+expected if expected else None,'record_sha256':J(u),'segments':render(u,control_blocks)[:1],
  'source_basis':'THIS_PINNED_ORIGINAL_XML' if u['book']==36 else 'UNCHANGED_FROZEN_C1_CANONICAL_INPUT_NOT_XML_REVIEWED_HERE'})

def load_data(name):
 direct=DATA/(name+'.json.gz');m=DATA/(name+'.json.gz.parts.json')
 if direct.exists():rawpacked=direct.read_bytes()
 else:
  met=json.loads(m.read_bytes());rawpacked=b''.join((DATA/x['file']).read_bytes() for x in met['parts']);assert H(rawpacked)==met['sha256'] and len(rawpacked)==met['size']
 raw=gzip.decompress(rawpacked);return raw,json.loads(raw)
commentary_raw,commentary=load_data('commentary');assert sum(map(len,commentary['units'].values()))==16473 and all(not commentary['units'].get(uid) for uid in IDS)
parallels_raw,parallels=load_data('parallels')
def targets(value):
 if isinstance(value,str):return value in IDS or any(value.startswith(uid+'/') for uid in IDS)
 if isinstance(value,list):return any(targets(x) for x in value)
 if isinstance(value,dict):return any(targets(x) for x in value.values())
 return False
target_edges={key:[r for r in parallels[key] if targets(r)] for key in ('citations','shared')};assert not any(target_edges.values())
catalogue_raw=(DATA/'apadana.json').read_bytes();catalogue=json.loads(catalogue_raw);assert len(catalogue['links'])==343 and not(set(IDS)&set(catalogue['links']))
observation_file=Path('/tmp/pali-four-english-evidence-nov26/ACTUAL343_PROFILE_OBSERVATION.json');observation_raw=observation_file.read_bytes();assert H(observation_raw)=='f8bc0cfdcb97ed77e48076626754303a349041cc2aaa8d566853bc524213d664';observation=json.loads(observation_raw)
for path,record in observation['source_files'].items():
 raw=(DATA.parent.parent/path).read_bytes();assert len(raw)==record['bytes'] and H(raw)==record['sha256']
assert len(observation['profile_ids'])==343 and set(observation['profile_ids'])==set(catalogue['links'])
data_files={p.name:{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())} for p in sorted(DATA.iterdir()) if p.is_file()}

# Source-integrity negative controls are private copies; no SUT or fixture files
# are changed. Every failure below is an intentionally triggered oracle gate.
negatives=[]
def reject(name,call):
 try:call()
 except (AssertionError,ValueError):negatives.append({'control':name,'rejected':True});return
 raise AssertionError('Negative control accepted: '+name)
def original_gate(raw,expected_blocks):
 assert H(raw)=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1' and B(raw)=='f37368072aece065d2668f93a74c24b423939f1f'
 assert expected_blocks==blocks
reject('one_original_XML_byte_substituted',lambda:original_gate(xml_raw[:-1]+bytes([xml_raw[-1]^1]),blocks))
changed=copy.deepcopy(blocks);changed[10120][2]+='x';reject('source_first_stanza_word_changed',lambda:original_gate(xml_raw,changed))
changed=copy.deepcopy(blocks);noted=next(i for i in range(10053,10174) if changed[i][3]);changed[noted][3][0]+='x';reject('source_note_changed',lambda:original_gate(xml_raw,changed))
changed=copy.deepcopy(blocks);changed[10120][4]['V'][0]='1.999';reject('source_edition_page_changed',lambda:original_gate(xml_raw,changed))
def future_gate(c):
 assert c['source']==canon['source'] and c['collections']==canon['collections'] and c['books']==canon['books']
 assert len(c['units'])==8544 and [u for u in c['units'] if u['id'] not in IDS]==[u for u in canon['units'] if u['id'] not in IDS]
 assert {u['id']:u for u in c['units'] if u['id'] in IDS}==after and J(c)==future_sha
changed=copy.deepcopy(future);changed['units']=[before[u['id']] if u['id']=='tha-ap341' else u for u in changed['units']];reject('one_of_six_repairs_missing',lambda:future_gate(changed))
changed=copy.deepcopy(future);next(u for u in changed['units'] if u['id']=='tha-ap341')['index_revision']='foreign';reject('one_of_six_locator_namespaces_substituted',lambda:future_gate(changed))
changed=copy.deepcopy(future);next(u for u in changed['units'] if u['id']=='tha-ap349')['start']-=4;reject('unapproved348_349_change',lambda:future_gate(changed))
assert len(negatives)==7

records=[{'id':uid,'before_unit':before[uid],'after_unit':after[uid],
 'old_root_sha256':J({'id':uid,'book':36,'start':before[uid]['start'],'end':before[uid]['end'],'blocks':blocks[before[uid]['start']:before[uid]['end']]}),
 'future_root_sha256':J({'id':uid,'book':36,'start':after[uid]['start'],'end':after[uid]['end'],'blocks':blocks[after[uid]['start']:after[uid]['end']]}),
 'old_segments':render(before[uid]),'future_segments':render(after[uid])} for uid in IDS]
preserve={'all61_books_sha256':J(canon['books']),'other8538_unit_records_ordered_sha256':J([u for u in canon['units'] if u['id'] not in IDS]),
 'all_source_collections_sha256':J(canon['collections']),'source_policy_sha256':J(canon['source']),'all343_Apadana_links_full_objects_sha256':J(catalogue['links']),
 'apadana_metadata_file_sha256':H(catalogue_raw),'all343_profile_object_sha256':observation['profile_object_sha256'],'profile_ids_in_order':observation['profile_ids'],
 'all10_profile_source_files_exact':observation['source_files'],'profile_authority_observation_sha256':H(observation_raw),
 'commentary_raw_logical_sha256':H(commentary_raw),'commentary_units_associations_sha256':J(commentary['units']),'commentary_association_count':16473,
 'target_commentary_associations':{uid:commentary['units'].get(uid,[]) for uid in IDS},
 'parallels_raw_logical_sha256':H(parallels_raw),'all_existing_citation_edges_sha256':J(parallels['citations']),'all_existing_shared_edges_sha256':J(parallels['shared']),
 'existing_edges_targeting_repaired_source_roots':target_edges,'parallel_root_segment_policy':'All89 source-coordinate/type/text/note/page identities survive. No existing citation/shared edge targets these6, so root-segment references of all existing edges stay valid. A future rebuild must independently check edge arrays and source input hashes; internal candidate statistics are not inferred here.',
 'group_shared_dependencies':dependencies,'current_data_file_records':data_files}
synthetic={'schema':'source-only-synthetic-old-position-export-vector-v1','records':[{'id':'synthetic-'+str(i+1),'uid':s['uid'],'ref':s['ref'],'source_commit':PIN,'text_sha256':s['text_sha256'],'note':'SYNTHETIC_LOCAL_ONLY_BOUNDARY_REVIEW_'+str(i+1)} for i,s in enumerate(old)]}
export_bytes=(json.dumps(synthetic,ensure_ascii=False,indent=2)+'\n').encode()
policies=[]
for r in mapping:
 s=r['old'];policies.append({'old_ref':s['ref'],'old_offset':s['offset'],'old_vri_commit':PIN,'old_numeric_colon_ref':s['uid']+':'+str(s['offset']+1),
  'future_locator_revision':PIN+'-'+REV,'unversioned_or_old_pin_position':'REFUSE_BEFORE_REPLACEMENT_WORDS_INCLUDING_OFFSET0',
  'all_old_positions_require_current_pin':True,'same_number_does_not_authorize_rebinding':True,
  'fresh_whole_unit_reopen':'ALLOW_WITH_NEW_REVISION_NO_AUTOMATIC_OFFSET_OR_NOTE_TRANSFER',
  'explicitly_current_pinned_future_ref':r['future_exact_source_owner']['ref'],'private_stored_record':'PRESERVE_RAW_BYTES_REQUIRES_EXPLICIT_REVIEW','migration_authorized':False})
artifacts={
 'PROPOSED_SIX_RECORDS.json':{'schema':'source-first-exact-six-boundary-record-proposal-v1','baseline_commit_authorized':BASE,'baseline_commit_blob_binding_independently_checked':False,'old_canon_logical_sha256':H(rawcanon),'future_canon_logical_sha256':future_sha,'index_revision':REV,'namespace_characters':len(REV),'source':canon['source'],'records':[{k:v for k,v in r.items() if k not in ('old_segments','future_segments')} for r in records],'pair_source_evidence':pairs,'exact_other_unit_count':8538,'no_English_coverage_gain':True},
 'ALL89_CROSSWALK.json':{'schema':'source-first-all89-old-future-source-owner-crosswalk-v1','old_canon_logical_sha256':H(rawcanon),'future_canon_logical_sha256':future_sha,'index_revision':REV,'segment_count':89,'category_counts':counts,'cross_owner_moves':6,'raw_source_note_count':17,'records':mapping,'automatic_migration_authorized':False},
 'READER_ORACLES.json':{'schema':'source-first-six-boundary-reader-oracles-v1','candidate_output_used_as_expectation':False,'origin':'Pinned original XML plus frozen C1 unit metadata; independent stdlib traversal/grouping only.','old_canon_sha256':H(rawcanon),'future_canon_sha256':future_sha,'index_revision':REV,'units':records,'source_book_pages':pages,'source_book_total_segments':len(book_segments),'source_book_all_segment_metadata_sha256':J(book_segments),'unaffected_controls':controls,'unchanged_apadana_manifest_sha256':H(catalogue_raw),'all61_book_hash':J(canon['books']),'other8538_unit_hash':preserve['other8538_unit_records_ordered_sha256'],'metadata_only_no_words_emitted':True},
 'PRESERVATION_ORACLES.json':{'schema':'source-first-six-boundary-preservation-oracles-v1','baseline_commit_authorized':BASE,'old_canon_logical_sha256':H(rawcanon),'future_canon_logical_sha256':future_sha,'preservation':preserve,'unchanged_English_choices':343,'English_words_fetched_or_activated':False,'new_rights_or_hold_clearance':False},
 'POSITIONAL_POLICY_ORACLES.json':{'schema':'source-first-six-boundary-position-policy-and-synthetic-export-v1','index_revision':REV,'policy_for_all_old89_positions':policies,'synthetic_export_vector':{'bytes':len(export_bytes),'sha256':H(export_bytes),'serialization':'UTF8 JSON indent2 plus terminal newline','owned_synthetic_data_only':True,'before_after_required_exact_bytes':True,'does_not_define_or_change_application_export_schema':True},'no_automatic_personal_data_or_export_migration':True},
 'NEGATIVE_INTEGRITY_CONTROLS.json':{'schema':'source-first-six-boundary-oracle-negative-controls-v1','stdlib_only_not_application_tests':True,'controls':negatives},
 'SYNTHETIC_OLD_POSITION_EXPORT.json':synthetic}
for name,value in artifacts.items():
 target=D/name;assert not target.exists();target.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
assert (D/'SYNTHETIC_OLD_POSITION_EXPORT.json').read_bytes()==export_bytes
seal={'schema':'source-first-six-boundary-preseal-v1','status':'PRESEALED_SOURCE_ORACLES_AWAIT_INDEPENDENT_COMPARISON','baseline_commit_authorized':BASE,'source_XML_sha256':H(xml_raw),'source_XML_blob_sha1':B(xml_raw),'source_commit':PIN,'old_canon_logical_sha256':H(rawcanon),'future_canon_logical_sha256':future_sha,'index_revision':REV,'namespace_characters':len(REV),'ids':IDS,'files':{n:{'bytes':len((D/n).read_bytes()),'sha256':H((D/n).read_bytes())} for n in ['derive_six_oracles.py',*artifacts]},'source_only_not_implementation_runtime_behavior_CI_release_or_personal_data_migration_approval':True}
(D/'PRESEALED_SOURCE_ORACLES.json').write_text(json.dumps(seal,indent=2)+'\n')
print(json.dumps({'status':seal['status'],'future_canon_logical_sha256':future_sha,'preseal_sha256':H((D/'PRESEALED_SOURCE_ORACLES.json').read_bytes()),'namespace_characters':len(REV),'counts':counts,'old_future_segments':89,'notes':17,'source_book_pages':len(pages),'source_book_segments':len(book_segments),'negative_controls':len(negatives)}))
