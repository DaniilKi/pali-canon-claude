"""Seal fresh finite existing-renderer metadata against both original proofs."""
import collections,hashlib,json
from pathlib import Path
D=Path(__file__).resolve().parent;P=Path('/tmp/pali-next-cohort-nov26/docs/evidence/apadana')
H=lambda v:hashlib.sha256(v).hexdigest()
J=lambda v:H(json.dumps(v,ensure_ascii=False,separators=(',',':')).encode())
def read(path):return json.loads(path.read_bytes())
preseal=read(D/'PRESEALED_ORACLE.json')
for name,row in preseal['files'].items():
    raw=(D/name).read_bytes();assert len(raw)==row['bytes'] and H(raw)==row['sha256']
oracle=read(D/'FUTURE_ORACLE.json');observed=read(D/'ISOLATED_RENDER_POSITIONS.json')
assert observed['source_preseal_before_renderer']==H((D/'FUTURE_ORACLE.json').read_bytes())
assert observed['input_sha256']==H((D/'ISOLATED_RENDER_INPUT.json').read_bytes())
assert observed['original_source_unchanged'] and not observed['VM_filesystem_network_process_interfaces']
before=[];after=[]
for phase,target in [('old',before),('proposed',after)]:
    for unit in observed[phase]:
        for offset,row in enumerate(unit['segments']):
            assert row['ref']==unit['id']+'/'+str(offset+1)
            target.append({'uid':unit['id'],'offset':offset,**row})
assert len(before)==len(after)==144
old36=read(P/'next-boundaries348-375/producer-a/SOURCE38_CROSSWALK.json')['records']
old37=read(P/'book37-first-three-pairs/A/SOURCE106_REFERENCE_CROSSWALK.json')['records']
prior=old36+old37;assert len(prior)==144
new_by_span={(r['uid'],tuple(r['source_blocks'])):r for r in after}
new_by_location={(r['uid'],r['offset']):r for r in after}
new_by_physical={}
records_by_id={row['id']:row['after'] for row in oracle['records']}
for row in after:
    key=(records_by_id[row['uid']]['book'],tuple(row['source_blocks']))
    assert key not in new_by_physical;new_by_physical[key]=row
cross=[];categories=collections.Counter();moves=[];covered=[]
source=read(D/'SOURCE340_BLOCKS.json');source_by_key={(r['book'],r['block']):r for r in source['rows']}
assert len(source_by_key)==340
common=['type','source_blocks','text_sha256','text_utf16_length','notes_sha256','note_count','vri_paragraph']
identity=common+['pts_page_begins','thai_page_begins','myanmar_page_begins','vri_page_begins','note_text_sha256']
for old,previous in zip(before,prior,strict=True):
    priorold=previous['old'];assert all(old.get(k)==priorold.get(k) for k in common)
    assert (old['uid'],old['offset'],old['ref'])==(priorold['uid'],priorold['offset'],priorold['ref'])
    bi=records_by_id[old['uid']]['book'];dest=new_by_physical[(bi,tuple(old['source_blocks']))]
    assert all(old.get(k)==dest.get(k) for k in identity)
    priorfuture=previous.get('exact_source_future_owner',previous.get('exact_source_proposed_position'))
    assert priorfuture and all(dest.get(k)==priorfuture.get(k) for k in common)
    assert (dest['uid'],dest['offset'],dest['ref'])==(priorfuture['uid'],priorfuture['offset'],priorfuture['ref'])
    same=new_by_location.get((old['uid'],old['offset']))
    category='OLD_REF_ABSENT' if same is None else 'SAME_REF_DIFFERENT_SOURCE' if same['source_blocks']!=old['source_blocks'] else 'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY'
    categories[category]+=1;lo,hi=old['source_blocks']
    for i in range(lo,hi):
        block=source_by_key[(bi,i)];assert block['old_owner']==old['uid'] and block['new_owner']==dest['uid'];covered.append((bi,i))
    cross.append({'old':old,'old_locator':oracle['original_sources'][str(bi)]['VRI_commit'],'exact_source_new':dest,'new_locator':oracle['locator_revision'],'same_numeric_ref_new':same,'classification':category,'requires_current_revision_before_any_positional_read':True,'automatic_private_data_migration':False})
    if old['uid']!=dest['uid']:moves.append({'book':bi,'source_blocks':old['source_blocks'],'old_ref':old['ref'],'new_ref':dest['ref'],'type':old['type']})
assert len(covered)==len(set(covered))==340 and set(covered)==set(source_by_key)
assert dict(categories)=={'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY':65,'OLD_REF_ABSENT':10,'SAME_REF_DIFFERENT_SOURCE':69}
assert len(moves)==10 and sum(r['source_blocks'][1]-r['source_blocks'][0] for r in moves)==20
assert sum(r['note_count'] for r in before)==sum(r['note_count'] for r in after)==17
recitation=next(r for r in after if r['source_blocks']==[10381,10382] and r['uid']=='tha-ap349');assert recitation['type']=='prose'
note214=next(r for r in after if r['uid']=='tha-ap427' and r['source_blocks'][0]<=214<r['source_blocks'][1]);assert note214['note_count']==1
assert next(r for r in after if r['uid']=='tha-ap429' and r['source_blocks']==[292,293])['type']=='verse'
counts={phase:{r['id']:len(r['segments']) for r in observed[phase]} for phase in('old','proposed')}
positions={'schema':'independent-next-ten-source144-reference-crosswalk-v1','status':'SOURCE_ORACLE_NOT_MIGRATION_AUTHORITY','old_canonical_logical_sha256':oracle['old_canonical_logical_sha256'],'future_canonical_logical_sha256':oracle['future_canonical_logical_sha256'],'index_revision':oracle['index_revision'],'old_positions':144,'new_positions':144,'classification_counts':dict(categories),'source_union_blocks':340,'moved_source_segments':10,'moved_source_blocks':20,'per_unit_counts':counts,'records':cross,'private_data_accessed':False}
completion={'schema':'independent-next-ten-source-oracle-completion-v1','status':'GO_EXACT_SOURCE_DATA_EXPECTATIONS_ONLY_ARCHITECTURE_AND_ACTIVATION_HELD',
 'future_canonical_logical_sha256':oracle['future_canonical_logical_sha256'],'old_canonical_logical_sha256':oracle['old_canonical_logical_sha256'],'index_revision':oracle['index_revision'],
 'presealed_oracle_sha256':H((D/'FUTURE_ORACLE.json').read_bytes()),'preseal_sha256':H((D/'PRESEALED_ORACLE.json').read_bytes()),
 'fresh_source_rendered_positions':{'old':144,'new':144,'categories':dict(categories),'per_unit_counts':counts,'exact_original_proof38_plus106_metadata_reconciled':True,'source_only_owner_moves':moves,'all340_source_blocks_once_each':True,'all17notes_preserved':True,'note214_new_position':note214,'recitation10381_new_position':recitation,'recitation_not_stanza':True},
 'source_renderer_bindings':{'existing_canon_mjs_sha256':observed['canon_source_sha256'],'existing_editions_mjs_sha256':observed['editions_source_sha256'],'exact_finite_extracted_code_sha256':observed['exact_extracted_code_sha256'],'isolated_observation_sha256':H((D/'ISOLATED_RENDER_POSITIONS.json').read_bytes()),'app_modules_imported':False,'filesystem_network_or_process_inside_VM':False,'raw_source_unchanged':True},
 'independent_proofs_preserved':{'Book36_A_preseal':'996c470c30f8513faa5219352fad4f55db120898286e46779520ded1fe069eaf','Book36_B_preseal':'2a39ee56a56708e90df7b26111e79905697f16d0ee1ccf33731a95ea4f1aed05','Book37_A_final':'7c1c8449a4acd17e83121d1b403d9d02c33f9891936e3f19b411d9393cac087c','Book37_B_preseal':'1420b5674a940e3c237eb342246e13e067d3197916d8d0475e1c822dd5af662c','all_pinned_evidence_file_bytes_revalidated':True,'Book37_B_separate_producer_sha256':'0404686b66f7385104e217b560004a9fe8f25b0970ed1c6d836a30821dda485d','joint_Book36_closure_sha256':'8bc5307043b7c0c723ea863cc3bcc0542556c29711f0561675d471947d2119e8','joint_Book37_seal_sha256':'2dd0b31f0de2ce02d5991b1eb7b35fc6b0be0f0b8c628b805b66e98daf600b0a'},
 'namespace_limits':{'requested_index_revision_length':23,'combined_locator_length':64,'fits_current40_suffix_and80total_limits':True,'closed_registry_and_prewording_stale_pin_policy_pending_root_review':True},
 'holds':['No actual canonical/app/namespace activation performed. Exact10records and full future hash are expectations for root implementation and independent comparison.','All144legacy positional intentions require current-version policy, including65same-reference/source cases; no private migration is authorized.','Root must preserve earlier source helpers/hooks/constants and validate an explicit ordered historical inverse. No broadened detector or source-tag normalization.','All61books/8534unrelated full records/343Englishprofile+linkobjects/commentary/earlier namespaces remain unchanged in this derived snapshot. No rawEnglish or personal data was accessed.','No tests, builds, server/tool/browser, package, full-repo copying, Git mutation, network, CI, push or release action; isolated existing-renderer computation is source-only evidence.']}
def write(name,obj):
    with(D/name).open('x',encoding='utf8') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
write('POSITION_CROSSWALK144.json',positions);write('ORACLE_COMPLETION.json',completion)
write('FINAL_ORACLE_SEAL.json',{'schema':'independent-next-ten-source-oracle-final-seal-v1','status':completion['status'],'future_canonical_logical_sha256':oracle['future_canonical_logical_sha256'],'files':{p.name:{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())} for p in D.iterdir() if p.is_file()},'architecture_runtime_activation_and_release_approval':False})
print(json.dumps({'status':completion['status'],'future_canonical_logical_sha256':oracle['future_canonical_logical_sha256'],'crosswalk_sha256':H((D/'POSITION_CROSSWALK144.json').read_bytes()),'completion_sha256':H((D/'ORACLE_COMPLETION.json').read_bytes()),'final_seal_sha256':H((D/'FINAL_ORACLE_SEAL.json').read_bytes())}))
