"""Cross-compare presealed source-only evidence; no app imports/Builder/repair."""
import gzip,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
D=Path(__file__).parent;A=D.parent/'producer-a';B=D.parent/'producer-b';E=D.parents[1]
H=lambda b:hashlib.sha256(b if isinstance(b,bytes) else b.encode()).hexdigest();J=lambda v:H(json.dumps(v,ensure_ascii=False,separators=(',',':')))
a_raw=(A/'PRESEALED_SOURCE_REVIEW.json').read_bytes();b_raw=(B/'PRESEALED_REVIEW.json').read_bytes();assert H(a_raw)=='996c470c30f8513faa5219352fad4f55db120898286e46779520ded1fe069eaf' and H(b_raw)=='2a39ee56a56708e90df7b26111e79905697f16d0ee1ccf33731a95ea4f1aed05'
for folder,seal in [(A,json.loads(a_raw)),(B,json.loads(b_raw))]:
 for n,r in seal['files'].items():
  data=(folder/n).read_bytes();assert len(data)==r['bytes'] and H(data)==r['sha256']
a=json.loads((A/'SOURCE_REVIEW.json').read_bytes());am=json.loads((A/'SOURCE38_CROSSWALK.json').read_bytes());b=json.loads((B/'SOURCE_BOUNDARY_REVIEW.json').read_bytes());bm=json.loads((B/'SOURCE_BLOCK_OWNERSHIP_CROSSWALK.json').read_bytes())
ac={uid:r for pair in a['pairs'] for uid,r in pair['proposed_source_records_without_new_namespace'].items()};ao={uid:r for pair in a['pairs'] for uid,r in pair['old_full_records'].items()}
assert list(ac)==b['scope']['ids'] and len(ac)==4
for r in b['records']:
 assert ao[r['id']]==r['current'] and ac[r['id']]==r['proposed_core']
assert a['unaffected_neighbors']=={u['id']:u for u in b['preservation']['neighbor_full_objects']}
for ap,bp in zip(a['pairs'],b['pair_proofs']):
 assert ap['ids']==bp['ids'] and ap['old_cut']==bp['current_cut'] and ap['proposed_cut']==bp['proposed_source_cut']
 assert ap['combined_source_union']==bp['preserved_union_half_open'] and ap['combined_source_tuple_sha256']==bp['preserved_union_tuple_sha256']
assert a['original_XML']['sha256']==b['source']['XML_sha256'] and a['original_XML']['whole_tuple_sha256']==b['source']['entire_book36_tuple_sha256']
P=E/'install/node_modules/pali-canon-mcp/server/data';m=json.loads((P/'canon.json.gz.parts.json').read_bytes());raw=gzip.decompress(b''.join((P/r['file']).read_bytes() for r in m['parts']));assert H(raw)==a['current_installed_canon_logical_sha256']==b['source']['current_canonical']['logical_sha256'];c=json.loads(raw);blocks=c['books'][36]['blocks'];assert J(blocks)==a['original_XML']['whole_tuple_sha256']
expected_blocks={i for pair in a['pairs'] for i in range(*pair['combined_source_union'])};assert len(expected_blocks)==84 and len(bm['rows'])==84 and {r['source_block'] for r in bm['rows']}==expected_blocks
raw_moves=[];note_total=0;page_inventory=[]
for r in bm['rows']:
 i=r['source_block'];row=blocks[i];assert r['source_book']==36 and r['tuple_sha256']==J(row) and r['kind']==row[0] and r['number_at_block']==row[1]
 assert r['notes_count']==len(row[3]) and r['notes_sha256']==J(row[3]) and r['pages']==row[4];note_total+=len(row[3])
 old=next(uid for uid,u in ao.items() if u['start']<=i<u['end']);new=next(uid for uid,u in ac.items() if u['start']<=i<u['end']);assert (old,new)==(r['current_canonical_owner'],r['proposed_core_owner']) and r['ownership_changed']==(old!=new)
 rendered=next(x for x in am['records'] if x['old']['source_blocks'][0]<=i<x['old']['source_blocks'][1]);assert rendered['old']['uid']==old and rendered['exact_source_future_owner']['uid']==new
 if old!=new:raw_moves.append(i)
 if row[4]:page_inventory.append({'source_block':i,'markers':row[4]})
assert len(raw_moves)==8 and note_total==3 and len(am['records'])==38
assert sum(r['old']['uid']!=r['exact_source_future_owner']['uid'] for r in am['records'])==4
assert a['commentary']['target_existing_associations']==b['dependencies']['target_commentary_associations'] and a['commentary']['accepted_root_intersections_with_moved_prefixes']==b['dependencies']['commentary_union_intersections']==[]
assert a['group_shared_dependencies']==b['dependencies']['group_dependencies']==[] and not any(a['existing_parallels_touching_targets'].values()) and b['dependencies']['target_parallels_edges'] is False
assert a['parallels_logical_sha256']==b['dependencies']['parallels_logical_sha256'] and a['commentary']['logical_sha256']==b['source']['commentary']['logical_sha256']
# The subtle page break is independently located inside the original source line,
# not merely inferred from either producer's PTS result.
xml=Path(a['original_XML']['path']).read_bytes();assert H(xml)==a['original_XML']['sha256'];nodes=[e for e in ET.fromstring(xml).iter() if e.tag in ('p','head','trailer')];node=nodes[10789];assert node.get('rend')=='gatha1'
prefix='';events=[]
def walk(n):
 global prefix
 prefix+=n.text or ''
 for child in n:
  if child.tag=='pb':
   normalized=re.sub(r'\s+',' ',prefix).lstrip();events.append({'edition':child.get('ed'),'page':'.'.join(str(int(x)) for x in child.get('n').split('.')),'visible_offset':len(normalized),'visible_prefix_sha256':H(normalized)})
  elif child.tag!='note' and not(child.tag=='hi' and child.get('rend') in ('paranum','dot')):walk(child)
  prefix+=child.tail or ''
walk(node);assert re.sub(r'\s+',' ',prefix).strip()==blocks[10788][2]
assert [(e['edition'],e['page'],e['visible_offset']) for e in events]==[('T','1.455',20),('P','1.291',20)]
assert a['pairs'][1]['proposed_source_records_without_new_namespace']['tha-ap374']['pts']=={'volume':1,'page':290,'end_page':290}
assert a['pairs'][1]['proposed_source_records_without_new_namespace']['tha-ap375']['pts']=={'volume':1,'page':290,'end_page':291}
recitation=blocks[10381];assert J(recitation)==b['apparatus']['recitation_after349']['tuple_sha256'] and recitation[0]=='centre'
recrow=next(x for x in am['records'] if x['old']['source_blocks']==[10381,10382]);assert recrow['old']['uid']==recrow['exact_source_future_owner']['uid']=='tha-ap349' and recrow['old']['type']!='verse'
helper=Path('/tmp/pali-boundaries340-nov26/scripts/canon/apadana_thera340_spans.py').read_bytes();assert H(helper)=='1ffaf4393d7e20d675eaa29494ce5a45c4e5ea55902ef3a18c84639fe8e52f92'
assert "'tha-ap348': (10350, 10371)" in helper.decode()
report={'schema':'dual-presealed-next-two-pair-source-only-crosscomparison-v1','status':'GO_SOURCE_ONLY_NEXT_HANDOFF_NOT_IMPLEMENTATION_OR_NAMESPACE_APPROVAL','comparison_by':'producer-a comparing both independently presealed sources; no fabricated additional signature',
 'producer_a':{'preseal_sha256':H(a_raw),'report_sha256':H((A/'SOURCE_REVIEW.json').read_bytes()),'crosswalk_sha256':H((A/'SOURCE38_CROSSWALK.json').read_bytes())},
 'producer_b':{'preseal_sha256':H(b_raw),'report_sha256':H((B/'SOURCE_BOUNDARY_REVIEW.json').read_bytes()),'raw_crosswalk_sha256':H((B/'SOURCE_BLOCK_OWNERSHIP_CROSSWALK.json').read_bytes())},
 'current_installed_logical_canon_sha256':H(raw),'source_XML_sha256':H(xml),'full_book36_tuple_sha256':J(blocks),'core_old_and_proposed4_records_exact':True,'four_full_neighbor_records_exact':True,'both_pair_unions_cuts_headings_named_closings_exact':True,'raw_note_and_page_differences':0,
 'representation_reconciliation':{'producer_b_source_blocks':84,'producer_b_raw_blocks_changing_owner':8,'producer_a_grouped_source_segments':38,'producer_a_grouped_references_changing_owner':4,'these_are_different_granularities_not_a_mismatch':True,'all84_raw_block_hash_note_page_and_old_future_owners_compared':True,'all84_blocks_map_consistently_into38_grouped_source_segments':True,'grouped_ref_categories':am['category_counts'],'all38_legacy_positions_require_separately_reviewed_fresh_mapping_policy':True,'automatic_migration_authorized':False},
 'source_only_proposed_records':ac,'cut_coordinates':[[10371,10367],[10790,10786]],'source_note_count':3,
 'PTS_marker_proof':{'source_block':10788,'physical_XML_index':10789,'original_inline_markers_independently_rederived':events,'page291_marker_after20_visible_characters_not_at_start':True,'proposed374_pts':ac['tha-ap374']['pts'],'proposed375_pts':ac['tha-ap375']['pts'],'source_words_and_marker_positions_unchanged':True},
 'recitation10381':{'source_tuple_sha256':J(recitation),'kind':'centre','remains_existing349_owner':True,'grouped_segment_not_verse':True,'no_new_poem_stanza_or_paratext_identity_assigned':True},
 'ownership_dependencies':{'accepted_commentary_targets_and_moved_prefix_intersections':0,'group_dependencies':0,'existing_parallel_edges_touching_targets':0,'not_permission_to_add_a_new_association':True},
 'future_implementation_constraints':['Preserve frozen32f and its existing exact6 repaired unit objects, locator namespace and source helper1ffaf439… . Do not broaden the current candidate.','Run a separately reviewed future348/349/374/375 repair AFTER the existing apadana_thera340_spans builder hook, so its original348neighbor guard remains valid on its reviewed pre-next-repair stage.','Never silently rewrite the old six helper NEIGHBOUR_SPANS tha-ap348=(10350,10371), old constants, old hashes or old assertions to accommodate a later stage. A future explicit historical/stage inverse must validate exact new records before restoring the original input for old checks.','A direct idempotence call of the old six helper on a later corrected348record will correctly reject its changedneighbor; do not suppress that failure or fallback to a different payload.','No new namespace or final canonical digest is assigned here. Implementation needs a separately approved closed4 mapping revision and fail-closed stale/unversioned/current-position policy for all38 old refs, even18 numerically stable positions and explicitoffset0.','Preserve source books/notes/pages, all8540other unit records (including all6current repaired units), all343fullEnglishobjects, older107/108/333–336pins, current source rights and private raw notes/bookmarks/drafts/exportbytes; no automatic migration.','A later derived-index rebuild, independent runtime inventory, genuine installed/native/widget acceptance and exact-final-commit CI remain separate gates.'],
 'not_approved':['Namespace or canonical-data activation','Any English or publisher mapping/rightshold clearance','Application or repair implementation','Personal-data or export migration','Runtime/package/browser/physical-device/human-assistive acceptance','CI/dev promotion/main/deploy/outreach'],
 'actions':'Read-only stdlib source/metadata/hash comparison and static old-helper guard check. No app imports, Builder/repair execution, tests, build, browser, network, Git mutations or tracked edits.'}
(D/'GO_REPORT.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'GO_report_sha256':H((D/'GO_REPORT.json').read_bytes()),'core_records':4,'raw_blocks':84,'grouped_segments':38,'differences':0,'PTS_visible_offset':20}))
