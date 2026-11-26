"""Independent source-only review; no app imports, tests, build, Git or network."""
import collections,copy,gzip,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
D=Path(__file__).parent;DATA=Path('/tmp/pali-boundaries340-evidence-nov26/install/node_modules/pali-canon-mcp/server/data');XML=Path('/tmp/pali-sariputta-release/vri-fixture/romn/s0510m1.mul.xml')
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
manifest=json.loads((DATA/'canon.json.gz.parts.json').read_bytes());packed=b''.join((DATA/p['file']).read_bytes() for p in manifest['parts']);assert len(packed)==manifest['size'] and H(packed)==manifest['sha256'];rawcanon=gzip.decompress(packed);assert H(rawcanon)=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b';canon=json.loads(rawcanon);assert canon['source']['commit']=='2d134ff9ef60f70a1eb03c9370580228811a3070' and canon['books'][36]['blocks']==blocks

# This derivation precedes reading the previous structural-screen conclusions or
# another producer. Local source title + both colophons identify ownership.
units={u['id']:u for u in canon['units']}
IDS=['tha-ap348','tha-ap349','tha-ap374','tha-ap375'];PAIRS=[('tha-ap348','tha-ap349'),('tha-ap374','tha-ap375')]
assert len(canon['units'])==8544 and len(canon['books'])==61
# Evidence literals below come from the assigned original's actual named headings
# and speaker/closing formulas, not a canonical/publisher ordinal correspondence.
IDENTITIES={
 'tha-ap348':('Campakapupphiyattheraapadānaṃ','campakapupphiyo','Campakapupphiyattherassāpadānaṃ chaṭṭhaṃ.'),
 'tha-ap349':('Padumapūjakattheraapadānaṃ','padumapūjako','Padumapūjakattherassāpadānaṃ sattamaṃ.'),
 'tha-ap374':('Pāṭalipupphiyattheraapadānaṃ','pāṭalipupphiyo','Pāṭalipupphiyattherassāpadānaṃ dutiyaṃ.'),
 'tha-ap375':('Tīṇuppalamāliyattheraapadānaṃ','tīṇuppalamāliyo','Tīṇuppalamāliyattherassāpadānaṃ tatiyaṃ.')}
carried=[];last=None;last_index=None;carried_index=[]
for i,row in enumerate(blocks):
 carried.append(last);carried_index.append(last_index)
 if row[4].get('P'):last=row[4]['P'][-1];last_index=i
STRUCT={'subhead','title','chapter','book','nikaya','centre','subsubhead'}
def pts(u):
 span=blocks[u['start']:u['end']];first=next(row for row in span if row[0] not in STRUCT)
 assert first[0]=='hangnum' and not first[2] and not first[4].get('P')
 opening=carried[u['start']];assert opening
 end=next((row[4]['P'][-1] for row in reversed(span) if row[4].get('P')),opening)
 v,p=map(int,opening.split('.'));return {'volume':v,'page':p,'end_page':int(end.split('.')[1])}
HEAD={'subhead','title','chapter','book','nikaya','subsubhead'};VERSE={'gatha1','gatha2','gatha3','gathalast'};CENTRE=re.compile(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$',re.I)
def segments(u):
 out=[];stanza=None
 def flush():
  nonlocal stanza
  if stanza is not None:out.append(stanza);stanza=None
 for i in range(u['start'],u['end']):
  rend,n,text,notes,pages=blocks[i]
  if rend=='hangnum':
   flush();stanza={'type':'verse','vri':n,'text':'','source_blocks':[i,i+1],'notes':[],'pages':[]};continue
  if rend in VERSE:
   if stanza is None:stanza={'type':'verse','vri':n,'text':'','source_blocks':[i,i+1],'notes':[],'pages':[]}
   stanza['text']+=('\n' if stanza['text'] else '')+text;stanza['source_blocks'][1]=i+1;stanza['notes'].extend(notes)
   if pages:stanza['pages'].append([i,pages])
   if rend=='gathalast':flush()
   continue
  flush()
  if text:out.append({'type':'heading' if rend in HEAD or rend=='centre' and CENTRE.search(text) else 'prose','vri':n,'text':text,'source_blocks':[i,i+1],'notes':notes,'pages':[[i,pages]] if pages else []})
 flush()
 return [{'ref':u['id']+'/'+str(i+1),'uid':u['id'],'offset':i,'type':s['type'],'vri_paragraph':s['vri'],'source_blocks':s['source_blocks'],'text_sha256':H(s['text']),'text_utf16_length':len(s['text'].encode('utf-16-le'))//2,'source_note_sha256':[H(n) for n in s['notes']],'notes_sha256':J(s['notes']),'note_count':len(s['notes']),'source_page_markers':s['pages'],'source_page_markers_sha256':J(s['pages'])} for i,s in enumerate(out)]
after={};evidence=[]
for left,right in PAIRS:
 olda,oldb=units[left],units[right];assert olda['book']==oldb['book']==36 and olda['end']==oldb['start']
 a_title,a_speaker,a_close=IDENTITIES[left];b_title,b_speaker,b_close=IDENTITIES[right]
 headings=[i for i in range(olda['start'],oldb['end']) if blocks[i][0]=='subhead' and re.sub(r'^\d+\.\s*','',blocks[i][2]) in (a_title,b_title)]
 assert len(headings)==2 and headings[0]==olda['start'];lo,cut=headings
 assert re.sub(r'^\d+\.\s*','',blocks[cut][2])==b_title and cut<oldb['start']
 assert blocks[cut-2][2]==f'Itthaṃ sudaṃ āyasmā {a_speaker} thero imā gāthāyo abhāsitthāti.' and blocks[cut-2][0]=='bodytext'
 assert blocks[cut-1][2]==a_close and blocks[cut-1][0]=='centre'
 speaker=next(i for i in range(cut,oldb['end']) if blocks[i][2]==f'Itthaṃ sudaṃ āyasmā {b_speaker} thero imā gāthāyo abhāsitthāti.')
 assert blocks[speaker][0]=='bodytext' and blocks[speaker+1][2]==b_close and blocks[speaker+1][0]=='centre'
 assert [x[0] for x in blocks[cut:oldb['start']]]==['subhead','hangnum','gatha1','gathalast'] and oldb['start']==cut+4
 a,b=copy.deepcopy(olda),copy.deepcopy(oldb);a['end']=cut;b['start']=cut;b['title']=b_title
 assert b['title']==oldb['title']+'ṃ' and 'index_revision' not in a and 'index_revision' not in b
 for u in [a,b]:
  ns=[int(row[1]) for row in blocks[u['start']:u['end']] if row[0]=='hangnum'];assert ns==list(range(ns[0],ns[-1]+1));u['vri']=f'{ns[0]}–{ns[-1]}';u['pts']=pts(u);assert pts(units[u['id']])==units[u['id']]['pts'];after[u['id']]=u
 terminal=[{'source_block':i,'rend':blocks[i][0],'text_sha256':H(blocks[i][2]),'note_sha256':[H(n) for n in blocks[i][3]],'page_markers':blocks[i][4]} for i in range(speaker+2,oldb['end'])]
 if right=='tha-ap349':assert terminal==[{'source_block':10381,'rend':'centre','text_sha256':H('Terasamaṃ bhāṇavāraṃ.'),'note_sha256':[],'page_markers':{}}]
 else:assert terminal==[]
 evidence.append({'ids':[left,right],'status':'SOURCE_OWNERSHIP_CUT_QUALIFIES_PROPOSAL_ONLY','old_cut':olda['end'],'proposed_cut':cut,'physical_XML_cut_index':cut+1,
  'old_full_records':{left:olda,right:oldb},'proposed_source_records_without_new_namespace':{left:a,right:b},
  'headings':[{'source_block':i,'physical_XML_index':i+1,'sha256':H(blocks[i][2]),'printed_label':re.match(r'^(\d+)\.',blocks[i][2])[1],'title':re.sub(r'^\d+\.\s*','',blocks[i][2])} for i in headings],
  'source_speaker_and_closing_colophons':[{'source_block':i,'physical_XML_index':i+1,'sha256':H(blocks[i][2]),'kind':blocks[i][0]} for i in [cut-2,cut-1,speaker,speaker+1]],
  'next_heading_unchanged':{'source_block':oldb['end'],'kind':blocks[oldb['end']][0],'text_sha256':H(blocks[oldb['end']][2])},
  'combined_source_union':[olda['start'],oldb['end']],'combined_source_tuple_sha256':J(blocks[olda['start']:oldb['end']]),
  'first_right_stanza':{'vri_paragraph':blocks[cut+1][1],'source_blocks':[cut+1,cut+4],'text_sha256':H(blocks[cut+2][2]+'\n'+blocks[cut+3][2]),'notes_sha256':J(blocks[cut+2][3]+blocks[cut+3][3]),'page_markers':[{'source_block':i,'markers':blocks[i][4]} for i in range(cut+1,cut+4) if blocks[i][4]]},
  'source_notes':[{'source_block':i,'note_sha256':[H(n) for n in blocks[i][3]]} for i in range(olda['start'],oldb['end']) if blocks[i][3]],
  'source_pages':[{'source_block':i,'markers':blocks[i][4]} for i in range(olda['start'],oldb['end']) if blocks[i][4]],
  'PTS_source_carry':[{'id':u['id'],'proposed_start':u['start'],'preceding_last_P_marker_block':carried_index[u['start']],'preceding_last_P_marker':carried[u['start']],'first_nonstructural_block_is_empty_numbered_marker':True,'old_pts':units[u['id']]['pts'],'proposed_pts':u['pts'],'P_markers_in_span':[{'source_block':i,'P':blocks[i][4]['P']} for i in range(u['start'],u['end']) if blocks[i][4].get('P')]} for u in [a,b]],
  'post_poem_paratext_blocks_preserved':terminal})
old=[s for uid in IDS for s in segments(units[uid])];new=[s for uid in IDS for s in segments(after[uid])];assert len(old)==len(new)==38
new_span={tuple(s['source_blocks']):s for s in new};new_ref={s['ref']:s for s in new};cross=[]
for s in old:
 dest=new_span[tuple(s['source_blocks'])];assert all(s[k]==dest[k] for k in ['type','vri_paragraph','source_blocks','text_sha256','text_utf16_length','source_note_sha256','notes_sha256','note_count','source_page_markers','source_page_markers_sha256'])
 same=new_ref.get(s['ref']);category='OLD_REF_ABSENT' if same is None else 'SAME_REF_DIFFERENT_SOURCE' if same['source_blocks']!=s['source_blocks'] else 'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY'
 cross.append({'old':s,'exact_source_future_owner':dest,'same_numeric_ref_future':same,'category':category,'no_automatic_locator_note_bookmark_or_export_migration':True})
counts=dict(collections.Counter(r['category'] for r in cross));assert sorted(counts.values())==[4,16,18] and sum(s['note_count'] for s in old)==3
# Read only existing data associations; never infer a new one from stanza numbers.
def load_data(name):
 p=DATA/(name+'.json.gz');mp=Path(str(p)+'.parts.json')
 if p.exists():packed=p.read_bytes()
 else:
  m=json.loads(mp.read_bytes());packed=b''.join((DATA/r['file']).read_bytes() for r in m['parts']);assert H(packed)==m['sha256'] and len(packed)==m['size']
 raw=gzip.decompress(packed);return raw,json.loads(raw)
cr,commentary=load_data('commentary');assocs={uid:commentary['units'].get(uid,[]) for uid in IDS};accepted=[(i,p) for i,p in enumerate(commentary['passages']) if p[3]==36];intersections=[]
for pi,p in accepted:
 lo,hi=p[9:11];assert type(lo)is int and type(hi)is int and 0<=lo<hi<=len(blocks)
 if any(lo<r['old_cut'] and r['proposed_cut']<hi for r in evidence):intersections.append({'passage_index':pi,'root_span':[lo,hi],'root_vri':[p[4],p[5]]})
groups=[u['id'] for u in canon['units'] if u.get('shares_passage_with') in IDS or set(u.get('members',[]))&set(IDS)]
pr,parallels=load_data('parallels')
def touches(v):
 if isinstance(v,str):return v in IDS or any(v.startswith(uid+'/') for uid in IDS)
 if isinstance(v,list):return any(touches(x) for x in v)
 if isinstance(v,dict):return any(touches(x) for x in v.values())
 return False
edges={k:[r for r in parallels[k] if touches(r)] for k in ['citations','shared']}
catraw=(DATA/'apadana.json').read_bytes();cat=json.loads(catraw);assert len(cat['links'])==343
neighbors={uid:units[uid] for uid in ['tha-ap347','tha-ap350','tha-ap373','tha-ap376']}
assert neighbors['tha-ap347']['index_revision']=='apadana-thera340-341-343-344-346-347-v1'
assert units['tha-ap107']['index_revision']==units['tha-ap108']['index_revision']=='apadana-thera105-106-v1'
assert all(units[f'tha-ap{n}']['index_revision']=='apadana-thera333-336-v1' for n in range(333,337))
mapdoc={'schema':'independent-next-two-pair-source-only38-crosswalk-v1','current_canon_logical_sha256':H(rawcanon),'exact_ids':IDS,'old_segments':38,'proposed_source_segments':38,'category_counts':counts,'cross_owner_moves':sum(r['old']['uid']!=r['exact_source_future_owner']['uid'] for r in cross),'source_note_count':3,'records':cross,'new_locator_namespace_assigned':False,'personal_data_migration_or_runtime_approval':False}
report={'schema':'independent-original-first-two-pair-source-boundary-review-v1','status':'SOURCE_CUTS_QUALIFY_ONLY_NO_ACTIVATION_OR_RUNTIME_APPROVAL','current_installed_canon_logical_sha256':H(rawcanon),'source':canon['source'],
 'original_XML':{'path':str(XML),'sha256':H(xml_raw),'git_blob_sha1':B(xml_raw),'physical_elements':len(physical),'retained_blocks':len(blocks),'note_only_omission_physical_indices':omitted,'whole_tuple_sha256':J(blocks),'every_original_tuple_equal_current_installed_book36':True},
 'pairs':evidence,'unaffected_neighbors':neighbors,
 'commentary':{'logical_sha256':H(cr),'total_associations':sum(map(len,commentary['units'].values())),'target_existing_associations':assocs,'accepted_book36_passages':len(accepted),'accepted_root_intersections_with_moved_prefixes':intersections,'no_new_association_inferred':True},
 'group_shared_dependencies':groups,'existing_parallels_touching_targets':edges,'parallels_logical_sha256':H(pr),
 'current343_English_manifest':{'sha256':H(catraw),'target_link_counts':{uid:len(cat['links'].get(uid,[])) for uid in IDS},'all343_preserved_not_rebuilt':True},
 'important_points':['For348/349, source10381 is the separate post-colophon thirteenth-recitation marker; retain its existing349owner/paratext identity and never count it as a stanza or English poem wording.','For374/375 the moved first right stanza contains actual PTS1.291 at10788. Source374therefore ends on290, not291. Source375opens at the preceding heading/empty13marker under carried290, then crosses the recorded291break in its first stanza; do not silently retain both oldPTSannotations.','Tīṇuppalamāliya occurs elsewhere in this book; only the local heading, both named colophons, exact coordinates and printed13–21sequence identify this occurrence. No global repeated-title or publisher-offset mapping is used.'],
 'hold_points':['No locator namespace is assigned. Any implementation requires a separately reviewed finite policy for every old position, even18same-reference/source cases; no automatic note/bookmark/draft/export rewrite.','No English originals, source rights or publisher mapping for these four were acquired/approved here. No English translation or rights hold is cleared.','Future derived-parallels changes and any commentary/group ownership changes require separate review; this report only inventories current accepted evidence.','Current32f six-unit repair, all343Englishobjects, all61sourcebooks and8538otherunits of that earlier repair remain untouched. This is future-task source evidence only.'],
 'crosswalk_summary':{k:v for k,v in mapdoc.items() if k!='records'},'independence':{'old_systemic_screen_read_during_this_new_derivation':False,'prior_context_had_the_two_flags':True,'other_producer_conclusions_or_candidate_output_read_before_preseal':False,'sourcebook_current_output_used_as_wording_oracle':False,'current_data_used_only_for_frozen_metadata_and_tuple_equality':True,'app_import_Builder_repair_test_build_browser_network_Git_mutation_or_project_edits':False},
 'coverage_gain':0,'proposed_new_canonical_logical_digest_or_namespace':None,'implementation_activation_rights_English_runtime_or_release_approval':False}
for name,value in [('SOURCE_REVIEW.json',report),('SOURCE38_CROSSWALK.json',mapdoc)]:
 target=D/name;assert not target.exists();target.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
seal={'schema':'original-first-next-two-pair-source-preseal-v1','status':report['status'],'files':{n:{'bytes':len((D/n).read_bytes()),'sha256':H((D/n).read_bytes())} for n in ['review_original_pairs.py','SOURCE_REVIEW.json','SOURCE38_CROSSWALK.json']},'source_scope_only_no_new_namespace_or_activation':True}
(D/'PRESEALED_SOURCE_REVIEW.json').write_text(json.dumps(seal,indent=2)+'\n')
print(json.dumps({'status':report['status'],'report_sha256':H((D/'SOURCE_REVIEW.json').read_bytes()),'crosswalk_sha256':H((D/'SOURCE38_CROSSWALK.json').read_bytes()),'preseal_sha256':H((D/'PRESEALED_SOURCE_REVIEW.json').read_bytes()),'counts':counts,'commentary_target_associations':{k:len(v) for k,v in assocs.items()},'commentary_moved_prefix_intersections':len(intersections),'group_dependencies':groups,'target_parallel_edges':{k:len(v) for k,v in edges.items()}}))
