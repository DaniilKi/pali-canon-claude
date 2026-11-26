"""Bind presealed source ownership to isolated existing-reader positions."""
import collections,hashlib,json
from pathlib import Path
D=Path(__file__).resolve().parent
H=lambda raw:hashlib.sha256(raw).hexdigest()
J=lambda obj:H(json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode())
def read(name):return json.loads((D/name).read_bytes())
seal=read('SOURCE_ONLY_PRESEAL.json')
for name,row in seal['files'].items():
    raw=(D/name).read_bytes();assert len(raw)==row['bytes'] and H(raw)==row['sha256']
source=read('SOURCE_CORE_REPORT.json');positions=read('ISOLATED_RENDER_POSITIONS.json');blocks=read('SOURCE256_BLOCK_CROSSWALK.json')['rows']
assert positions['source_preseal_before_renderer']==H((D/'SOURCE_CORE_REPORT.json').read_bytes())
assert positions['input_sha256']==H((D/'ISOLATED_RENDER_INPUT.json').read_bytes())
assert positions['original_source_unchanged']is True and positions['VM_filesystem_network_process_interfaces']is False
old=[];new=[]
for phase,target in [('old',old),('proposed',new)]:
    for unit in positions[phase]:
        for offset,s in enumerate(unit['segments']):
            assert s['ref']==unit['id']+'/'+str(offset+1)
            target.append({'uid':unit['id'],'offset':offset,**s})
assert len(old)==len(new)==106
future_span={tuple(s['source_blocks']):s for s in new};future_ref={s['ref']:s for s in new}
assert len(future_span)==len(future_ref)==106
byblock={row['block']:row for row in blocks};assert len(byblock)==256
cross=[];categories=collections.Counter();moves=[];covered=[]
identity_fields=['type','source_blocks','text_sha256','text_utf16_length','notes_sha256','note_count','vri_paragraph','pts_page_begins','thai_page_begins','myanmar_page_begins','vri_page_begins','note_text_sha256']
for s in old:
    dest=future_span[tuple(s['source_blocks'])]
    assert all(s.get(k)==dest.get(k)for k in identity_fields)
    same=future_ref.get(s['ref'])
    category='OLD_REF_ABSENT'if same is None else'SAME_REF_DIFFERENT_SOURCE'if same['source_blocks']!=s['source_blocks']else'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY'
    categories[category]+=1
    lo,hi=s['source_blocks'];covered.extend(range(lo,hi))
    assert all(byblock[i]['current_owner']==s['uid']and byblock[i]['proposed_source_owner']==dest['uid']for i in range(lo,hi))
    row={'old':s,'exact_source_proposed_position':dest,'same_numeric_ref_proposed':same,'classification':category,'no_automatic_locator_or_private_data_migration':True};cross.append(row)
    if s['uid']!=dest['uid']:moves.append({'source_blocks':s['source_blocks'],'old_ref':s['ref'],'proposed_ref':dest['ref'],'type':s['type']})
assert len(covered)==len(set(covered))==256 and set(covered)==set(byblock)
assert dict(categories)=={'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY':47,'OLD_REF_ABSENT':6,'SAME_REF_DIFFERENT_SOURCE':53}
assert len(moves)==6 and sum(m['source_blocks'][1]-m['source_blocks'][0]for m in moves)==12
assert sum(s['note_count']for s in old)==sum(s['note_count']for s in new)==14
anomalies=[]
for i in(112,240):
    seg=next(s for s in new if s['source_blocks'][0]<=i<s['source_blocks'][1])
    assert seg['type']=='verse'and seg['source_blocks'][0]<i
    anomalies.append({'source_block':i,'original_kind':'gathalast','existing_rendered_source_segment':seg,'no_source_retagging_or_split':True})
standalone=next(s for s in new if s['source_blocks']==[292,293]);assert standalone['type']=='verse'and'vri_paragraph'not in standalone
counts={phase:{u['id']:len(u['segments'])for u in positions[phase]}for phase in('old','proposed')}
crossdoc={'schema':'book37-first3-existing-reader-source106-crosswalk-v1','source_core_report_sha256':H((D/'SOURCE_CORE_REPORT.json').read_bytes()),'current_canonical_logical_sha256':source['source']['current_canonical']['logical_sha256'],'old_segments':106,'proposed_source_segments':106,'source_blocks':256,'moved_segments':6,'moved_blocks':12,'category_counts':dict(categories),'per_unit_counts':counts,'records':cross,'namespace_assigned':False,'not_positional_migration_authority':True}
report={'schema':'independent-book37-first-three-pairs-source-and-position-review-v1','producer':'A','status':'SOURCE_ONLY_GO_SIX_CORE_PROPOSALS_RUNTIME_NAMESPACE_AND_ACTIVATION_HELD',
 'original_source':source['source'],'source_core_preseal_sha256':H((D/'SOURCE_ONLY_PRESEAL.json').read_bytes()),'source_core_report_sha256':H((D/'SOURCE_CORE_REPORT.json').read_bytes()),'six_core_record_proposals_sha256':H((D/'PROPOSED_SIX_CORE_RECORDS.json').read_bytes()),
 'exact_proposed_cuts':[{'ids':p['ids'],'old_cut':p['old_cut'],'proposed_cut':p['source_proposed_cut'],'union':p['union_half_open'],'union_tuple_sha256':p['union_tuple_sha256']}for p in source['pair_proofs']],
 'metadata_delta':'Exactly6core records; three cuts, VRI label endpoints and three right-hand final-niggahita titles. All6PTS objects remain unchanged. No namespace is added.',
 'source_formula_finding':source['Book36_signature_failure'],'source_bindings':{'all10672_original_book37_tuples_equal_current':True,'all_words_notes_pages_renditions_unchanged':True,'all256_closed_union_blocks_conserved_once_each':True,'variant_notes':14,'moved_note_owner':'The original note at214moves with Koraṇḍa opening to427; wording/hash unchanged.','source_page_ownership':'VRI2.3at53moves with424opening; Thai2.34at275moves with429opening. No page is moved in originalXML, relabelled or renumbered.'},
 'position_diagnostic':{'old_segments':106,'proposed_source_segments':106,'counts':counts,'category_counts':dict(categories),'moved_segments':moves,'all106_exact_original_type_word_note_page_segments_preserved':True,'implementation':'Exact finite existing renderUnitSegments/ptsLabel/editionIndex/editionLabel and their constant declarations evaluated in a no-I/O VM against original source blocks; no app import, lazy loading or tool/server invocation.','isolated_observation_sha256':H((D/'ISOLATED_RENDER_POSITIONS.json').read_bytes()),'renderer_source_sha256':positions['canon_source_sha256'],'edition_source_sha256':positions['editions_source_sha256'],'extracted_code_sha256':positions['exact_extracted_code_sha256'],'source_markup_edge_cases':anomalies,'consecutive_gathalast292_emitted_unlabelled_verse':standalone},
 'dependencies':source['dependencies'],'independence':source['independence'],
 'holds':['No Book36 signature matcher change is proposed. The raw split formula independently explains why the old literal check fails.','All106old positions, including47same-reference/same-source cases, need a separately reviewed locator/version policy before any repair activation. No private note/bookmark/draft/export migration is authorized.','No future namespace, active canon bytes, English identity, translation activation or coverage gain has been produced.','An independent peer source comparison, exact complete dataset proof, namespace/consumer review, runtime/package/browser acceptance and exact-commitCI remain required for any future implementation.','This bounded source diagnostic does not assess other Book37screen flags or establish corpus-wide correctness.'],
 'other_new_reviewer_output_read':False,'private_user_data_accessed':False,'tracked_project_or_Git_CI_mutation':False,'coverage_gain':0,'runtime_or_release_approval':False}
def write(name,obj):
    with(D/name).open('x',encoding='utf8')as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
write('SOURCE106_REFERENCE_CROSSWALK.json',crossdoc);write('FINAL_SOURCE_REVIEW.json',report)
write('FINAL_SEAL.json',{'schema':'book37-first3-producer-A-final-seal-v1','status':report['status'],'files':{p.name:{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())}for p in D.iterdir()if p.is_file()},'no_namespace_activation_runtime_or_private_migration_approval':True})
print(json.dumps({'status':report['status'],'report_sha256':H((D/'FINAL_SOURCE_REVIEW.json').read_bytes()),'reference_crosswalk_sha256':H((D/'SOURCE106_REFERENCE_CROSSWALK.json').read_bytes()),'final_seal_sha256':H((D/'FINAL_SEAL.json').read_bytes()),'categories':dict(categories)}))
