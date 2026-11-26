"""Independent original-first finite source review. Standard library only.

No other producer output or old screen is read. No application/Builder/repair
module is imported. Output is a core-metadata proposal, not activation approval.
"""
import copy,gzip,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path

D=Path(__file__).resolve().parent
DATA=Path('/tmp/pali-boundaries340-nov26/server/data')
XML=Path('/tmp/pali-sariputta-release/vri-fixture/romn/s0510m1.mul.xml')
CURRENT='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
COMMIT='2d134ff9ef60f70a1eb03c9370580228811a3070'
H=lambda b:hashlib.sha256(b if isinstance(b,bytes) else b.encode()).hexdigest()
C=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
J=lambda v:H(C(v))
def load_shards(name):
    mraw=(DATA/(name+'.json.gz.parts.json')).read_bytes();m=json.loads(mraw);parts=[]
    for p in m['parts']:
        raw=(DATA/p['file']).read_bytes()
        assert len(raw)==p['size'] and H(raw)==p['sha256']
        parts.append(raw)
    packed=b''.join(parts)
    assert len(packed)==m['size'] and H(packed)==m['sha256']
    logical=gzip.decompress(packed)
    return json.loads(logical),logical,{'manifest_sha256':H(mraw),'packed_sha256':H(packed),'logical_sha256':H(logical)}

raw=XML.read_bytes()
assert H(raw)=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
assert blob=='f37368072aece065d2668f93a74c24b423939f1f'
canon,canonical_raw,canonicalpins=load_shards('canon')
assert H(canonical_raw)==CURRENT and canon['source']['commit']==COMMIT
assert canon['books'][36]['file']=='s0510m1.mul.xml'
root=ET.fromstring(raw)
physical=[e for e in root.iter() if e.tag in ('p','head','trailer')]
collapse=lambda s:re.sub(r'\s+',' ',s).strip()
def visible(element):
    text=element.text or ''
    for child in element:
        if child.tag not in ('note','pb') and not(child.tag=='hi' and child.get('rend') in ('paranum','dot')):
            text+=visible(child)
        text+=child.tail or ''
    return text
blocks=[];source_elements=[];omitted=[]
for pi,e in enumerate(physical):
    text,number=collapse(visible(e)),e.get('n')
    if not text and not number:
        omitted.append(pi);continue
    pages={}
    for pb in e.iter('pb'):
        pages.setdefault(pb.get('ed'),[]).append('.'.join(str(int(p)) for p in pb.get('n').split('.')))
    blocks.append([e.get('rend') or ('centre' if e.tag=='trailer' else 'bodytext'),number,text,
                   [collapse(''.join(n.itertext())) for n in e.iter('note')],pages])
    source_elements.append((pi,e))
assert len(physical)==14646 and len(blocks)==14645 and omitted==[1130]
assert J(blocks)=='bce212d970603cb0ef7fbebbc4b78de5538377f8fbf7e451b1a4487c97753d44'
assert blocks==canon['books'][36]['blocks']
byid={u['id']:u for u in canon['units']}
IDS=['tha-ap348','tha-ap349','tha-ap374','tha-ap375']
PAIRS=[('tha-ap348','tha-ap349',10367),('tha-ap374','tha-ap375',10786)]
expected={
 'tha-ap348':{'start':10350,'end':10367,'title':'Campakapupphiyattheraapadānaṃ','vri':'39–43','pts':{'volume':1,'page':279,'end_page':279},'heading':'6. Campakapupphiyattheraapadānaṃ','speaker':'campakapupphiyo','colophon':'Campakapupphiyattherassāpadānaṃ chaṭṭhaṃ.','close':10365,'colophon_block':10366},
 'tha-ap349':{'start':10367,'end':10382,'title':'Padumapūjakattheraapadānaṃ','vri':'44–47','pts':{'volume':1,'page':279,'end_page':280},'heading':'7. Padumapūjakattheraapadānaṃ','speaker':'padumapūjako','colophon':'Padumapūjakattherassāpadānaṃ sattamaṃ.','close':10379,'colophon_block':10380},
 'tha-ap374':{'start':10763,'end':10786,'title':'Pāṭalipupphiyattheraapadānaṃ','vri':'6–12','pts':{'volume':1,'page':290,'end_page':290},'heading':'2. Pāṭalipupphiyattheraapadānaṃ','speaker':'pāṭalipupphiyo','colophon':'Pāṭalipupphiyattherassāpadānaṃ dutiyaṃ.','close':10784,'colophon_block':10785},
 'tha-ap375':{'start':10786,'end':10815,'title':'Tīṇuppalamāliyattheraapadānaṃ','vri':'13–21','pts':{'volume':1,'page':290,'end_page':291},'heading':'3. Tīṇuppalamāliyattheraapadānaṃ','speaker':'tīṇuppalamāliyo','colophon':'Tīṇuppalamāliyattherassāpadānaṃ tatiyaṃ.','close':10813,'colophon_block':10814},
}
def pts_at(cut):
    candidates=[(i,row[4]['P'][-1]) for i,row in enumerate(blocks[:cut]) if row[4].get('P')]
    assert candidates
    return candidates[-1]
def inline_markers(element):
    chunks=[];events=[]
    def visit(e):
        chunks.append(e.text or '')
        for child in e:
            if child.tag=='pb':
                events.append({'edition':child.get('ed'),'page':'.'.join(str(int(p)) for p in child.get('n').split('.')),
                               'visible_offset':len(collapse(''.join(chunks)))})
            elif child.tag!='note' and not(child.tag=='hi' and child.get('rend') in ('paranum','dot')):
                visit(child)
            chunks.append(child.tail or '')
    visit(element)
    return events
proposed={};records=[]
for uid in IDS:
    e=expected[uid];lo,hi=e['start'],e['end'];rows=blocks[lo:hi]
    assert rows[0][0]=='subhead' and rows[0][2]==e['heading']
    assert rows[1][0]=='hangnum' and rows[1][1].isdigit() and not rows[1][2]
    assert [r[0] for r in rows[2:4]]==['gatha1','gathalast']
    labels=[int(r[1]) for r in rows if r[1] is not None]
    assert labels==list(range(labels[0],labels[-1]+1))
    assert e['vri']==str(labels[0])+'–'+str(labels[-1])
    assert blocks[e['close']][0]=='bodytext'
    assert blocks[e['close']][2]=='Itthaṃ sudaṃ āyasmā '+e['speaker']+' thero imā gāthāyo abhāsitthāti.'
    assert blocks[e['colophon_block']][0]=='centre' and blocks[e['colophon_block']][2]==e['colophon']
    assert e['close']>lo+3 and e['colophon_block']==e['close']+1
    carried_index,carried=pts_at(lo)
    marks=[{'block':i,'pages':r[4]['P']} for i,r in enumerate(rows,lo) if r[4].get('P')]
    vol,page=map(int,carried.split('.'));last=marks[-1]['pages'][-1] if marks else carried
    derived={'volume':vol,'page':page,'end_page':int(last.split('.')[1])}
    assert derived==e['pts']
    u=copy.deepcopy(byid[uid]);assert not u.get('index_revision')
    u.update({k:e[k] for k in ('start','end','title','vri','pts')});proposed[uid]=u
    note_rows=[{'block':i,'count':len(r[3]),'notes_sha256':J(r[3])} for i,r in enumerate(rows,lo) if r[3]]
    page_rows=[{'block':i,'pages':r[4],'inline_positions':inline_markers(source_elements[i][1])} for i,r in enumerate(rows,lo) if r[4]]
    records.append({'id':uid,'current':byid[uid],'current_object_sha256':J(byid[uid]),'proposed_core':u,'proposed_core_object_sha256':J(u),
                    'source_span_half_open':[lo,hi],'source_span_tuple_sha256':J(rows),'source_heading':{'block':lo,'printed_label':e['heading'].split('. ')[0],'title':e['title'],'tuple_sha256':J(rows[0])},
                    'opening_stanza':{'vri':str(labels[0]),'source_blocks':[lo+1,lo+4],'body_sha256':H('\n'.join(r[2] for r in rows[2:4]))},
                    'named_speaker':{'block':e['close'],'name':e['speaker'],'tuple_sha256':J(blocks[e['close']])},
                    'closing_colophon':{'block':e['colophon_block'],'tuple_sha256':J(blocks[e['colophon_block']])},
                    'printed_labels':labels,'notes':note_rows,'page_markers':page_rows,'PTS_proof':{'carried_at_source_heading':{'marker_block':carried_index,'value':carried},'inside_markers':marks,'derived':derived,'first_non_heading_block':lo+1,'first_non_heading_is_empty_number_marker':True}})

pairproofs=[];crosswalk=[]
for left,right,cut in PAIRS:
    a,z=byid[left],byid[right];lo,hi=a['start'],z['end']
    assert a['end']==z['start'] and a['start']==proposed[left]['start'] and z['end']==proposed[right]['end']
    assert a['end']-cut==4 and proposed[left]['end']==proposed[right]['start']==cut
    assert expected[left]['colophon_block']==cut-1 and expected[left]['close']==cut-2
    assert [r[0] for r in blocks[cut:a['end']]]==['subhead','hangnum','gatha1','gathalast']
    assert int(blocks[a['end']][1])==int(blocks[cut+1][1])+1
    pairproofs.append({'ids':[left,right],'current_cut':a['end'],'proposed_source_cut':cut,'preserved_union_half_open':[lo,hi],
                      'preserved_union_tuple_sha256':J(blocks[lo:hi]),'moved_prefix_half_open':[cut,a['end']],
                      'moved_prefix_tuple_sha256':J(blocks[cut:a['end']]),'moved_notes_count':sum(len(r[3]) for r in blocks[cut:a['end']]),
                      'actual_moved_page_markers':[{'block':i,'pages':r[4]} for i,r in enumerate(blocks[cut:a['end']],cut) if r[4]],
                      'source_closing_before_next_heading':True,'opening_stanza_precedes_current_right_start':True})
    stanza=None
    for i in range(lo,hi):
        r=blocks[i]
        if r[1] is not None:stanza=r[1]
        current=left if i<a['end'] else right;future=left if i<cut else right
        crosswalk.append({'source_book':36,'source_block':i,'tuple_sha256':J(r),'kind':r[0],'number_at_block':r[1],
                          'current_canonical_owner':current,'proposed_core_owner':future,'ownership_changed':current!=future,
                          'notes_count':len(r[3]),'notes_sha256':J(r[3]),'pages':r[4]})
assert len(crosswalk)==84 and sum(r['ownership_changed'] for r in crosswalk)==8
comment,comment_raw,commentpins=load_shards('commentary')
assert H(comment_raw)=='8b9c055181913097bb37cbe0046e8c64efcabea884aad49d272a424cd1207461'
associations={uid:comment['units'].get(uid,[]) for uid in IDS};assert all(not x for x in associations.values())
intersections=[p for p in comment['passages'] if p[3]==36 and any(p[9]<hi and lo<p[10] for lo,hi in ((10350,10382),(10763,10815)))]
assert intersections==[]
dependencies=[u for u in canon['units'] if u.get('shares_passage_with') in IDS or set(u.get('members',[]))&set(IDS)]
assert not dependencies
parraw=gzip.decompress((DATA/'parallels.json.gz').read_bytes());par=json.loads(parraw)
assert all(uid not in C(par[k]).decode() for uid in IDS for k in ('citations','shared'))
neighbors=[byid[uid] for uid in ('tha-ap347','tha-ap350','tha-ap373','tha-ap376')]
assert [(u['start'],u['end']) for u in neighbors]==[(10324,10350),(10382,10417),(10744,10763),(10815,10835)]
all_other=[u for u in canon['units'] if u['id'] not in IDS]
no_new_namespace=True
proposal=copy.deepcopy(canon)
proposal['units']=[proposed.get(u['id'],u) for u in canon['units']]
assert len(proposal['units'])==8544 and len(all_other)==8540
assert proposal['books']==canon['books']
assert [u for u in proposal['units'] if u['id'] not in IDS]==all_other
# This is an in-memory core-only digest, NOT an output dataset or activatable state.
source={'VRI_commit':COMMIT,'original_xml_path':str(XML),'XML_sha256':H(raw),'XML_git_blob_sha1':blob,
        'physical_elements':len(physical),'retained_tuples':len(blocks),'omitted_note_only_physical_indices':omitted,
        'entire_book36_tuple_sha256':J(blocks),'all_original_tuples_equal_current_book36':True,
        'current_canonical':canonicalpins,'commentary':commentpins}
report={'schema':'independent-original-first-two-pair-boundary-review-v1','producer':'b','status':'SOURCE_SUPPORTS_FOUR_CORE_METADATA_PROPOSALS_ONLY_NO_ACTIVATION',
        'scope':{'ids':IDS,'source_book':36,'pairs':2,'records':4,'full_other_records_preserved':8540,'source_books_preserved':61,'source_block_crosswalk_rows':84,'source_blocks_changing_owner':8},
        'source':source,'records':records,'pair_proofs':pairproofs,
        'voice_and_boundary_review':['Canonical348 has its own numbered source heading, a seven-campaka/Sudassana narrative, then the campakapupphiyo speaker formula and sixth-poem colophon at10365–10366. The following Paduma heading and Sambhava opening stanza at10367–10370 precede current349 and belong with the locally closed padumapujako narrative, not348.',
                                    'Canonical374 has its own Patali/Vipassi narrative, then the patalipupphiyo speaker formula and second-poem colophon at10784–10785. The following Tinu​ppalamaliya heading and Candabhaga/monkey opening at10786–10789 lead into its Phussa/three-uppala narrative and named tinu​ppalamaliyo closing. The old374 span crosses that explicit boundary.',
                                    'Identity uses local source coordinates, full opening-to-speaker-to-colophon continuity and both unchanged neighboring spans. Repeated Tinu​ppalamaliya titles elsewhere do not define identity; no global title match or publisher-number offset was used.'],
        'apparatus':{'all_source_notes_and_edition_markers_unchanged':True,'recitation_after349':{'block':10381,'kind':'centre','tuple_sha256':J(blocks[10381]),'unchanged_current_canonical_owner':'tha-ap349','is_stanza':False,'no_new_paratext_identity_assigned':True},
                     'PTS374_375_subtlety':{'inline_marker_block':10788,'original_inline_markers':inline_markers(source_elements[10788][1]),'right_opening_begins_before_page291_marker':True,'left_proposed_end_page':290,'right_proposed_start_page':290,'right_proposed_end_page':291,'no_page_marker_moved_or_renumbered':True}},
        'dependencies':{'commentary_total_associations':sum(map(len,comment['units'].values())),'target_commentary_associations':associations,'commentary_union_intersections':[],'group_dependencies':[],'target_parallels_edges':False,'parallels_logical_sha256':H(parraw)},
        'preservation':{'all61_books_sha256':J(canon['books']),'all8540_other_records_sha256':J(all_other),'neighbor_full_objects':neighbors,'neighbor_objects_sha256':J(neighbors),'prior_six_namespace_347_preserved':byid['tha-ap347'].get('index_revision'),'canonical_source_object_sha256':J(canon['source']),'no_private_data_read':True},
        'core_only_proposal_digest':J(proposal),
        'independence':{'other_producer_output_read':False,'old_screen_output_read':False,'app_Builder_or_repair_imports':False,'Builder_annotation_source_read_after_first_original_derivation':{'path':'scripts/canon/build_canon.py','lines':[338,363],'role':'Compatibility convention cross-check only; original inline markers independently establish the page carry.'}},
        'not_approved':['No new locator namespace assigned. This core-only proposal cannot be activated until explicit versioning and stale-position refusal design is independently approved.','No app/runtime repair, consumer crosswalk, browser behavior, personal-data migration, English source match, rights change, source activation, Git/CI/push or release approval.','Source-block crosswalk is not an API segment/ref migration; old positional intent must never be silently translated.','No dataset was written or project file changed. Current32f candidate and its six-record scope remain immutable.'],
        'source_or_runtime_activation_coverage_gain':0}
def write(name,value):
    with (D/name).open('x',encoding='utf8') as f:f.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
write('SOURCE_BOUNDARY_REVIEW.json',report)
write('PROPOSED_CORE_METADATA.json',{'schema':'unactivated-four-source-core-records-v1','source':source,'records':proposed,'namespace_assigned':False,'not_activation_approval':True})
write('SOURCE_BLOCK_OWNERSHIP_CROSSWALK.json',{'schema':'independent-two-pair-original-source-block-owner-crosswalk-v1','current_canonical_sha256':CURRENT,'granularity':'original_source_block_not_API_segment','rows':crosswalk,'not_personal_data_migration':True,'not_activation_approval':True})
seal={'schema':'independent-two-pair-producer-b-preseal-v1','status':report['status'],'producer':'b','current_canonical_logical_sha256':CURRENT,'original_xml_sha256':H(raw),'other_producer_or_old_screen_read':False,'files':{p.name:{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())} for p in D.iterdir() if p.is_file()},'no_namespace_or_runtime_activation_approval':True}
write('PRESEALED_REVIEW.json',seal)
print(json.dumps({'status':report['status'],'report_sha256':H((D/'SOURCE_BOUNDARY_REVIEW.json').read_bytes()),'proposal_sha256':H((D/'PROPOSED_CORE_METADATA.json').read_bytes()),'crosswalk_sha256':H((D/'SOURCE_BLOCK_OWNERSHIP_CROSSWALK.json').read_bytes()),'preseal_sha256':H((D/'PRESEALED_REVIEW.json').read_bytes())}))
