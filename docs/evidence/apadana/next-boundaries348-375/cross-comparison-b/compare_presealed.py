"""Compare both presealed source reviews without app imports or data changes."""
import collections,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
D=Path(__file__).resolve().parent;ROOT=D.parent;A=ROOT/'producer-a';B=ROOT/'producer-b'
H=lambda v:hashlib.sha256(v if isinstance(v,bytes) else v.encode()).hexdigest()
C=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
J=lambda v:H(C(v))
ASEAL='996c470c30f8513faa5219352fad4f55db120898286e46779520ded1fe069eaf'
BSEAL='2a39ee56a56708e90df7b26111e79905697f16d0ee1ccf33731a95ea4f1aed05'
def frozen(directory,name,pin):
    raw=(directory/name).read_bytes();assert H(raw)==pin
    value=json.loads(raw)
    for n,row in value['files'].items():
        raw=(directory/n).read_bytes();assert len(raw)==row['bytes'] and H(raw)==row['sha256']
    return value
aseal=frozen(A,'PRESEALED_SOURCE_REVIEW.json',ASEAL)
bseal=frozen(B,'PRESEALED_REVIEW.json',BSEAL)
a=json.loads((A/'SOURCE_REVIEW.json').read_bytes());ac=json.loads((A/'SOURCE38_CROSSWALK.json').read_bytes())
b=json.loads((B/'SOURCE_BOUNDARY_REVIEW.json').read_bytes());bc=json.loads((B/'SOURCE_BLOCK_OWNERSHIP_CROSSWALK.json').read_bytes())
bp=json.loads((B/'PROPOSED_CORE_METADATA.json').read_bytes())['records']
ids=['tha-ap348','tha-ap349','tha-ap374','tha-ap375']
old={};proposed={}
for pair in a['pairs']:
    old.update(pair['old_full_records']);proposed.update(pair['proposed_source_records_without_new_namespace'])
assert list(old)==list(proposed)==ids
assert old=={r['id']:r['current'] for r in b['records']}
assert proposed==bp=={r['id']:r['proposed_core'] for r in b['records']}
assert a['current_installed_canon_logical_sha256']==b['source']['current_canonical']['logical_sha256']=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
assert a['original_XML']['sha256']==b['source']['XML_sha256']=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
assert a['original_XML']['git_blob_sha1']==b['source']['XML_git_blob_sha1']=='f37368072aece065d2668f93a74c24b423939f1f'
assert a['original_XML']['whole_tuple_sha256']==b['source']['entire_book36_tuple_sha256']
assert a['source']['commit']==b['source']['VRI_commit']=='2d134ff9ef60f70a1eb03c9370580228811a3070'

# Original XML, not either producer's candidate wording, supplies the shared
# apparatus and independent block-to-rendered-segment reconciliation.
xml=Path(a['original_XML']['path']).read_bytes();assert H(xml)==a['original_XML']['sha256']
assert hashlib.sha1(b'blob '+str(len(xml)).encode()+b'\0'+xml).hexdigest()==a['original_XML']['git_blob_sha1']
collapse=lambda s:re.sub(r'\s+',' ',s).strip()
def visible(e):
    text=e.text or ''
    for ch in e:
        if ch.tag not in ('note','pb') and not(ch.tag=='hi' and ch.get('rend') in ('paranum','dot')):text+=visible(ch)
        text+=ch.tail or ''
    return text
blocks=[]
for e in ET.fromstring(xml).iter():
    if e.tag not in ('p','head','trailer'):continue
    text,number=collapse(visible(e)),e.get('n')
    if not text and not number:continue
    pages={}
    for pb in e.iter('pb'):pages.setdefault(pb.get('ed'),[]).append('.'.join(str(int(p)) for p in pb.get('n').split('.')))
    blocks.append([e.get('rend') or ('centre' if e.tag=='trailer' else 'bodytext'),number,text,[collapse(''.join(n.itertext())) for n in e.iter('note')],pages])
assert len(blocks)==14645 and J(blocks)==a['original_XML']['whole_tuple_sha256']
byblock={r['source_block']:r for r in bc['rows']};assert len(byblock)==84
for index,row in byblock.items():
    original=blocks[index]
    assert row['tuple_sha256']==J(original) and row['notes_count']==len(original[3]) and row['notes_sha256']==J(original[3]) and row['pages']==original[4]

pair_results=[]
for ap,bpair in zip(a['pairs'],b['pair_proofs'],strict=True):
    assert ap['ids']==bpair['ids']
    assert ap['old_cut']==bpair['current_cut'] and ap['proposed_cut']==bpair['proposed_source_cut']
    assert ap['combined_source_union']==bpair['preserved_union_half_open']
    assert ap['combined_source_tuple_sha256']==bpair['preserved_union_tuple_sha256']
    lo,hi=ap['combined_source_union'];assert J(blocks[lo:hi])==ap['combined_source_tuple_sha256']
    assert ap['source_notes']==[{'source_block':i,'note_sha256':[H(n) for n in r[3]]} for i,r in enumerate(blocks[lo:hi],lo) if r[3]]
    assert ap['source_pages']==[{'source_block':i,'markers':r[4]} for i,r in enumerate(blocks[lo:hi],lo) if r[4]]
    for heading in ap['headings']:
        i=heading['source_block'];assert heading['sha256']==H(blocks[i][2])
        br=next(r for r in b['records'] if r['proposed_core']['start']==i)
        assert br['source_heading']['tuple_sha256']==J(blocks[i]) and br['source_heading']['title']==heading['title']
    for statement in ap['source_speaker_and_closing_colophons']:
        i=statement['source_block'];assert statement['sha256']==H(blocks[i][2]) and statement['kind']==blocks[i][0]
    for pts in ap['PTS_source_carry']:
        br=next(r for r in b['records'] if r['id']==pts['id'])['PTS_proof']
        assert pts['proposed_pts']==br['derived']
        assert (pts['preceding_last_P_marker_block'],pts['preceding_last_P_marker'])==(br['carried_at_source_heading']['marker_block'],br['carried_at_source_heading']['value'])
        assert pts['P_markers_in_span']==[{'source_block':r['block'],'P':r['pages']} for r in br['inside_markers']]
    pair_results.append({'ids':ap['ids'],'old_cut':ap['old_cut'],'proposed_cut':ap['proposed_cut'],'union':ap['combined_source_union'],'union_tuple_sha256':ap['combined_source_tuple_sha256'],'exact_core_metadata_and_all_raw_apparatus_equal':True})

def project_segments(unit):
    out=[];pending=None
    def flush():
        nonlocal pending
        if pending is not None:
            assert pending['text'];out.append(pending);pending=None
    for i in range(unit['start'],unit['end']):
        kind,n,text,notes,pages=blocks[i]
        if kind=='hangnum' and n is not None:
            flush();pending={'type':'verse','vri':n,'text':'','lo':i,'hi':i+1,'notes':[],'pages':[]};continue
        if kind in ('gatha1','gatha2','gatha3','gathalast'):
            assert pending is not None
            pending['text']+=('\n' if pending['text'] else '')+text;pending['hi']=i+1;pending['notes']+=notes
            if pages:pending['pages'].append([i,pages])
        else:
            flush();assert text
            out.append({'type':'heading' if kind=='subhead' else 'prose','vri':n,'text':text,'lo':i,'hi':i+1,'notes':notes,'pages':[[i,pages]] if pages else []})
    flush()
    return [{'ref':unit['id']+'/'+str(j+1),'uid':unit['id'],'offset':j,'type':r['type'],'vri_paragraph':r['vri'],'source_blocks':[r['lo'],r['hi']],
             'text_sha256':H(r['text']),'text_utf16_length':len(r['text'].encode('utf-16-le'))//2,'source_note_sha256':[H(n) for n in r['notes']],
             'notes_sha256':J(r['notes']),'note_count':len(r['notes']),'source_page_markers':r['pages'],'source_page_markers_sha256':J(r['pages'])} for j,r in enumerate(out)]
oldsegments=[s for uid in ids for s in project_segments(old[uid])]
newsegments=[s for uid in ids for s in project_segments(proposed[uid])]
assert len(oldsegments)==len(newsegments)==38
assert oldsegments==[row['old'] for row in ac['records']]
future_by_span={tuple(s['source_blocks']):s for s in newsegments};future_by_ref={s['ref']:s for s in newsegments}
assert len(future_by_span)==len(future_by_ref)==38
categories=collections.Counter();moved=[];covered=[]
for row,source in zip(ac['records'],oldsegments,strict=True):
    dest=future_by_span[tuple(source['source_blocks'])];assert row['exact_source_future_owner']==dest
    assert row['same_numeric_ref_future']==future_by_ref.get(source['ref'])
    category='OLD_REF_ABSENT' if row['same_numeric_ref_future'] is None else 'SAME_REF_DIFFERENT_SOURCE' if row['same_numeric_ref_future']['source_blocks']!=source['source_blocks'] else 'SAME_REF_SAME_SOURCE_NOT_MIGRATION_AUTHORITY'
    assert row['category']==category;categories[category]+=1
    lo,hi=source['source_blocks'];covered.extend(range(lo,hi))
    assert all(byblock[i]['current_canonical_owner']==source['uid'] and byblock[i]['proposed_core_owner']==dest['uid'] for i in range(lo,hi))
    if source['uid']!=dest['uid']:moved.append({'source_blocks':[lo,hi],'current_owner':source['uid'],'proposed_owner':dest['uid'],'type':source['type']})
assert len(covered)==84 and len(set(covered))==84 and set(covered)==set(byblock)
assert len(moved)==4 and sum(r['source_blocks'][1]-r['source_blocks'][0] for r in moved)==8
assert dict(categories)==ac['category_counts']
assert sum(s['note_count'] for s in oldsegments)==sum(s['note_count'] for s in newsegments)==ac['source_note_count']==3
paratext=next(s for s in oldsegments if s['source_blocks']==[10381,10382])
assert paratext['type']=='prose' and paratext['vri_paragraph'] is None and paratext['note_count']==0
assert {k:v for k,v in future_by_span[(10381,10382)].items() if k not in ('ref','offset')}=={k:v for k,v in paratext.items() if k not in ('ref','offset')}
assert blocks[10381][0]=='centre' and H(blocks[10381][2])==H('Terasamaṃ bhāṇavāraṃ.')
inline=b['apparatus']['PTS374_375_subtlety']['original_inline_markers'];pmark=next(r for r in inline if r['edition']=='P')
assert pmark['page']=='1.291' and pmark['visible_offset']>12
assert proposed['tha-ap374']['pts']=={'volume':1,'page':290,'end_page':290}
assert proposed['tha-ap375']['pts']=={'volume':1,'page':290,'end_page':291}
assert a['unaffected_neighbors']=={r['id']:r for r in b['preservation']['neighbor_full_objects']}
assert a['commentary']['logical_sha256']==b['source']['commentary']['logical_sha256']
assert a['commentary']['total_associations']==b['dependencies']['commentary_total_associations']==16473
assert a['commentary']['target_existing_associations']==b['dependencies']['target_commentary_associations']
assert a['commentary']['accepted_root_intersections_with_moved_prefixes']==b['dependencies']['commentary_union_intersections']==[]
assert a['group_shared_dependencies']==b['dependencies']['group_dependencies']==[]
assert a['parallels_logical_sha256']==b['dependencies']['parallels_logical_sha256']
assert not a['existing_parallels_touching_targets']['citations'] and not a['existing_parallels_touching_targets']['shared']
assert a['implementation_activation_rights_English_runtime_or_release_approval'] is False and bp==proposed
assert all(not p.get('index_revision') for p in proposed.values())
receipt={'schema':'independent-two-pair-presealed-source-cross-comparison-v1','reviewer':'producer-b-after-both-preseals',
 'status':'SOURCE_ONLY_GO_EXACT_FOUR_CORE_PROPOSALS_NO_ACTIVATION','producer_a_preseal_sha256':ASEAL,'producer_b_preseal_sha256':BSEAL,
 'current_canonical_logical_sha256':a['current_installed_canon_logical_sha256'],'original_XML_sha256':a['original_XML']['sha256'],
 'exact_four_old_records_equal':True,'exact_four_proposed_records_equal':True,'old_records_sha256':J(old),'proposed_core_records_sha256':J(proposed),
 'pair_comparisons':pair_results,'actual_discrepancies':[],
 'representation_reconciliation':{'A_original_source_segments':38,'B_original_source_blocks':84,'all84_blocks_covered_exactly_once_in_each_frame':True,
      'A_cross_owner_segment_moves':4,'B_cross_owner_block_moves':8,'exact_moved_segments':moved,'category_counts':dict(categories),
      'explanation':'Each moved prefix consists of one heading segment (one block) and one stanza segment (three blocks). Two pairs therefore move4rendered source segments or8source blocks; these agree exactly.',
      'all38_original_text_notes_pages_and_owner_metadata_independently_reprojected':True,'API_behavior_or_locator_migration_approval':False},
 'PTS10788':{'original_inline_P_marker':pmark,'both_proposed374_end_page':290,'both_proposed375_start_page':290,'both_proposed375_end_page':291,'inline_source_break_not_opening_page_relabel':True},
 'apparatus':{'all3_original_notes_equal':True,'all_original_edition_markers_equal':True,'all_combined_union_tuples_equal':True,
              'recitation10381':'Unchanged source centre block retained in existing349scope; A renders it as prose, B retains raw centre type. Both explicitly exclude it from stanza numbering and any English poem quotation.'},
 'dependencies':{'commentary_no_target_association_or_interval_conflict':True,'no_group_dependency':True,'no_existing_target_parallel_edge':True,'all_four_neighbor_objects_equal':True},
 'future_implementation_constraints':['Keep the current32f six-record candidate immutable; this receipt does not authorize any implementation this turn.',
      'The preserved six-record helper records neighbor348 as[10350,10371). Future348end10367cannot be silently accepted by changing that historical constant, its approved authority or earlier hook.',
      'A later separately approved implementation must preserve the old authority and hook, use explicit ordered source repairs and exact historical inverses before old hash gates, and independently validate compatibility with the future348record.',
      'No new locator namespace is assigned here. All old positional intent, including the18same-reference/same-source cases, needs separate explicit versioning/refusal review; never migrate personal data automatically.',
      'No English source mapping, rights clearance, activated coverage, runtime, tests, package, browser, fullcheck, CI, push, merge, deploy or release approval is conveyed.'],
 'no_other_producer_output_before_preseal':True,'no_namespace_or_runtime_or_English_or_private_migration_approval':True,'project_files_changed':False,
 'comparison_app_import_tests_build_network_Git_execution':False}
def write(name,value):
    with (D/name).open('x',encoding='utf8') as f:f.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
write('SOURCE_ONLY_CROSS_COMPARISON_GO.json',receipt)
write('COMPARISON_SEAL.json',{'status':receipt['status'],'report_sha256':H((D/'SOURCE_ONLY_CROSS_COMPARISON_GO.json').read_bytes()),'script_sha256':H(Path(__file__).read_bytes()),'producer_a_preseal_sha256':ASEAL,'producer_b_preseal_sha256':BSEAL,'no_activation_approval':True})
print(json.dumps({'status':receipt['status'],'receipt_sha256':H((D/'SOURCE_ONLY_CROSS_COMPARISON_GO.json').read_bytes()),'seal_sha256':H((D/'COMPARISON_SEAL.json').read_bytes()),'discrepancies':[]}))
