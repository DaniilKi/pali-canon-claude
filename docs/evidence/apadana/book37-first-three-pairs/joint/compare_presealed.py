#!/usr/bin/env python3
"""Compare frozen independent source-only reports; never authorizes activation."""
import argparse,hashlib,json,pathlib
P=argparse.ArgumentParser();P.add_argument('--evidence',type=pathlib.Path,required=True);P.add_argument('--out',type=pathlib.Path,required=True);a=P.parse_args();E=a.evidence;O=a.out;O.mkdir(parents=True,exist_ok=True)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def get(p):return json.loads(p.read_text())
A=E/'book37-first3-A';B=E/'book37-first3-B'
assert sha(A/'FINAL_SEAL.json')=='7c1c8449a4acd17e83121d1b403d9d02c33f9891936e3f19b411d9393cac087c'
assert sha(B/'PRESEALED_REVIEW.json')=='1420b5674a940e3c237eb342246e13e067d3197916d8d0475e1c822dd5af662c'
for name,record in get(A/'FINAL_SEAL.json')['files'].items():assert sha(A/name)==record['sha256'],name
bs=get(B/'PRESEALED_REVIEW.json')
for name,digest in bs['files'].items():assert sha(B/name)==digest,name
assert sha(B/'derive_book37.py')==bs['producer']['sha256']
ac=get(A/'PROPOSED_SIX_CORE_RECORDS.json');br=get(B/'BEFORE_AFTER_RECORDS.json')
ids=['tha-ap423','tha-ap424','tha-ap426','tha-ap427','tha-ap428','tha-ap429']
assert set(ac['before'])==set(ac['after_core_only'])==set(ids);assert len(br)==6 and {x['id'] for x in br}==set(ids)
for x in br:
 assert ac['before'][x['id']]==x['before'];assert ac['after_core_only'][x['id']]==x['source_supported_proposed'];assert x['before']['pts']==x['source_supported_proposed']['pts']
ar=get(A/'FINAL_SOURCE_REVIEW.json');rr=get(B/'SOURCE_REVIEW.json');bind=get(B/'SOURCE_BINDINGS.json')
assert ar['independence']['other_new_reviewer_outputs_read'] is False and rr['A_or_other_new_review_read'] is False
assert ar['original_source']['XML_sha256']==bind['raw_XML']['sha256']=='23e0721c8fe05a6105b56b627ac38291d10e0eab799a082c257466603f0839a1'
assert ar['original_source']['XML_git_blob_sha1']==bind['raw_git_blob_sha1']=='c2a96aed52fb5de3e7fe66442633e5f045cf5bdf'
assert ar['original_source']['VRI_commit']==bind['VRI_commit']=='2d134ff9ef60f70a1eb03c9370580228811a3070'
assert ar['original_source']['current_canonical']['logical_sha256']==bind['current_canonical_logical_sha256']=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
assert [x['proposed_cut'] for x in ar['exact_proposed_cuts']]==rr['source_supported_cuts']==[51,212,273]
aw=get(A/'SOURCE106_REFERENCE_CROSSWALK.json');bw=get(B/'SEGMENT_CROSSWALK.json');assert len(aw['records'])==len(bw['records'])==106
fields=['uid','offset','ref','type','source_blocks','text_sha256','text_utf16_length','notes_sha256','note_count','vri_paragraph','pts_page_begins','thai_page_begins','myanmar_page_begins','vri_page_begins']
rename={'VRI_label':'vri_paragraph','variant_note_count':'note_count','variant_notes_sha256':'notes_sha256'}
def norm(v,producer):
 if v is None:return None
 assert set(v)<=(set(fields)|({'note_text_sha256'} if producer=='A' else set(rename))),(producer,set(v)-set(fields))
 v={rename.get(k,k):value for k,value in v.items() if k!='note_text_sha256'}
 for k in fields:
  if k not in v:
   assert k=='vri_paragraph' or k.endswith('_page_begins'),k
   v[k]=None if k=='vri_paragraph' else []
 return {k:v[k] for k in fields}
classes={'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY':'SAME_NUMERIC_REF_SAME_SOURCE','OLD_REF_ABSENT':'VANISHED_OLD_OWNER_REF','SAME_REF_DIFFERENT_SOURCE':'SAME_NUMERIC_REF_DIFFERENT_SOURCE'}
bm={x['old']['ref']:x for x in bw['records']};assert len(bm)==106
assert len({x['old']['ref'] for x in aw['records']})==106 and len({x['exact_source_proposed_position']['ref'] for x in aw['records']})==106
for x in aw['records']:
 y=bm[x['old']['ref']]
 for ak,bk in [('old','old'),('exact_source_proposed_position','same_source_future'),('same_numeric_ref_proposed','same_numeric_future')]:assert norm(x[ak],'A')==norm(y[bk],'B'),(x['old']['ref'],ak)
 assert classes[x['classification']]==y['category'];assert x['no_automatic_locator_or_private_data_migration'] is True
 assert y['automatic_private_record_migration_authorized'] is False and y['legacy_position_requires_separate_version_policy'] is True
expected={'SAME_NUMERIC_REF_SAME_SOURCE':47,'VANISHED_OLD_OWNER_REF':6,'SAME_NUMERIC_REF_DIFFERENT_SOURCE':53}
assert {classes[k]:v for k,v in aw['category_counts'].items()}==expected
assert {k:bw['stats'][k] for k in expected}==expected
assert aw['moved_segments']==bw['stats']['cross_owner_moved_segments']==6 and aw['moved_blocks']==bw['stats']['moved_source_blocks']==12
assert ar['source_bindings']['variant_notes']==sum(x['old']['note_count'] for x in aw['records'])==sum(x['old']['variant_note_count'] for x in bw['records'])==14
r={'schema':'joint-book37-first3-source-only-comparison-v1','status':'GO_SOURCE_ONLY_INDEPENDENT_AGREEMENT_IMPLEMENTATION_HELD','A_seal':sha(A/'FINAL_SEAL.json'),'B_preseal':sha(B/'PRESEALED_REVIEW.json'),'before_after_complete_records_compared':6,'source_cuts':[{'ids':['tha-ap423','tha-ap424'],'old':55,'proposed':51},{'ids':['tha-ap426','tha-ap427'],'old':216,'proposed':212},{'ids':['tha-ap428','tha-ap429'],'old':277,'proposed':273}],'all_six_PTS_unchanged':True,'raw_sha256':bind['raw_XML']['sha256'],'current_canonical_logical_sha256':bind['current_canonical_logical_sha256'],'rendered_crosswalk_rows_compared':106,'compared_segment_semantic_fields':fields,'categories':expected,'moved_source_segments':6,'moved_source_blocks':12,'source_union_blocks':256,'notes_preserved':14,'schema_asymmetry':'A retains individual note-string hashes not separately present in B. Both independently bind complete ordered note-list hashes/counts; no claim of identical schemas. Missing A optional page arrays normalize only to empty and absent VRIlabel only to null; all other fields exact.','source_formula_finding':'Named closing speaker fragments span centre and following capitalized bodytext, then left colophon. Do not broaden Book36 matcher or rewrite raw markup.','rendering_limits':'Existing gathalast speakers112/240 remain inside final verse; standalone unlabelled verse292 retained. This static source model is not runtime acceptance.','holds':['No future namespace/activation/English mapping/coverage gain/private data migration.','All106old positions including47same-source need a separately reviewed version policy.','Future implementation needs full corpus, consumer, genuine installed/browser and exactCI validation.','Other24structural flags and lexical lead remain unreviewed.'],'releases_changed':False,'producer_sha256':sha(pathlib.Path(__file__))}
(O/'JOINT_SOURCE_REVIEW.json').write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
(O/'JOINT_SEAL.json').write_text(json.dumps({'report_sha256':sha(O/'JOINT_SOURCE_REVIEW.json'),'producer_sha256':sha(pathlib.Path(__file__)),'A_seal_sha256':sha(A/'FINAL_SEAL.json'),'B_preseal_sha256':sha(B/'PRESEALED_REVIEW.json'),'activation_approved':False},indent=2)+'\n')
print(json.dumps({'status':r['status'],'report_sha256':sha(O/'JOINT_SOURCE_REVIEW.json'),'seal_sha256':sha(O/'JOINT_SEAL.json')},indent=2))
