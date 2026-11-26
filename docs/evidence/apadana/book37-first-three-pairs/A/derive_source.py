"""Original-first finite Book37 producer A; stdlib, no app imports."""
import copy,gzip,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
D=Path(__file__).resolve().parent;DATA=Path('/tmp/pali-boundaries340-nov26/server/data')
XML=Path('/tmp/pali-boundaries340-evidence-nov26/book37-recovery/s0510m2.mul.xml')
H=lambda v:hashlib.sha256(v if isinstance(v,bytes)else v.encode()).hexdigest()
C=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
J=lambda v:H(C(v))
def readshards(name):
    mr=(DATA/(name+'.json.gz.parts.json')).read_bytes();m=json.loads(mr);parts=[]
    for p in m['parts']:
        raw=(DATA/p['file']).read_bytes();assert len(raw)==p['size']and H(raw)==p['sha256'];parts.append(raw)
    packed=b''.join(parts);assert len(packed)==m['size']and H(packed)==m['sha256'];logical=gzip.decompress(packed)
    return json.loads(logical),logical,{'manifest_sha256':H(mr),'packed_sha256':H(packed),'logical_sha256':H(logical)}
xml=XML.read_bytes();blob=hashlib.sha1(b'blob '+str(len(xml)).encode()+b'\0'+xml).hexdigest()
assert H(xml)=='23e0721c8fe05a6105b56b627ac38291d10e0eab799a082c257466603f0839a1'and blob=='c2a96aed52fb5de3e7fe66442633e5f045cf5bdf'
canon,cr,cp=readshards('canon');assert H(cr)=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
assert canon['source']['commit']=='2d134ff9ef60f70a1eb03c9370580228811a3070'and canon['books'][37]['file']=='s0510m2.mul.xml'
root=ET.fromstring(xml);collapse=lambda v:re.sub(r'\s+',' ',v).strip()
def visible(e):
    text=e.text or ''
    for ch in e:
        if ch.tag not in('note','pb')and not(ch.tag=='hi'and ch.get('rend')in('paranum','dot')):text+=visible(ch)
        text+=ch.tail or ''
    return text
physical=[e for e in root.iter()if e.tag in('p','head','trailer')];blocks=[];physical_indices=[];omitted=[]
for pi,e in enumerate(physical):
    text,n=collapse(visible(e)),e.get('n')
    if not text and not n:omitted.append(pi);continue
    pages={}
    for p in e.iter('pb'):pages.setdefault(p.get('ed'),[]).append('.'.join(str(int(k))for k in p.get('n').split('.')))
    blocks.append([e.get('rend')or('centre'if e.tag=='trailer'else'bodytext'),n,text,[collapse(''.join(v.itertext()))for v in e.iter('note')],pages]);physical_indices.append(pi)
assert len(physical)==10673and len(blocks)==10672and omitted==[8858]
assert J(blocks)=='bd0177c2025298415abd2e90e1d576d2418127e08ce339699ad725960089f8cc'and blocks==canon['books'][37]['blocks']
byid={u['id']:u for u in canon['units']};IDS=['tha-ap423','tha-ap424','tha-ap426','tha-ap427','tha-ap428','tha-ap429']
PAIRS=[('tha-ap423','tha-ap424',51),('tha-ap426','tha-ap427',212),('tha-ap428','tha-ap429',273)]
DETAILS={
 'tha-ap423':{'start':1,'end':51,'title':'Sakiṃsammajjakattheraapadānaṃ','vri':'1–14','heading':5,'printed':1,'speaker_blocks':[48,49],'speaker':'sakiṃsammajjako','colophon':50,'source_cues':['Vipassino bhagavato','bodhiṃ sammajji','Ajagaro maṃ pīḷesi']},
 'tha-ap424':{'start':51,'end':114,'title':'Ekadussadāyakattheraapadānaṃ','vri':'15–35','heading':51,'printed':2,'speaker_blocks':[112],'speaker':'ekadussadāyako','colophon':113,'source_cues':['Nagare haṃsavatiyā','ahosiṃ tiṇahārako','Ekaṃ dussaṃ gahetvāna']},
 'tha-ap426':{'start':190,'end':212,'title':'Sattakadambapupphiyattheraapadānaṃ','vri':'61–67','heading':190,'printed':4,'speaker_blocks':[209,210],'speaker':'sattakadambapupphiyo','colophon':211,'source_cues':['kukkuṭo nāma pabbato','satta buddhā vasiṃsu','Satta mālā gahetvāna']},
 'tha-ap427':{'start':212,'end':242,'title':'Koraṇḍapupphiyattheraapadānaṃ','vri':'68–77','heading':212,'printed':5,'speaker_blocks':[240],'speaker':'koraṇḍapupphiyo','colophon':241,'source_cues':['Vanakammiko pure āsiṃ','tis‍so lokagganāyako'.replace('\u200d',''),'Padāni tīṇi dassesi','Koraṇḍaṃ pupphitaṃ disvā']},
 'tha-ap428':{'start':242,'end':273,'title':'Ghatamaṇḍadāyakattheraapadānaṃ','vri':'78–87','heading':242,'printed':6,'speaker_blocks':[270,271],'speaker':'ghatamaṇḍadāyako','colophon':272,'source_cues':['Sucintitaṃ bhagavantaṃ','vātābādhena pīḷitaṃ','ghatamaṇḍamupānayiṃ']},
 'tha-ap429':{'start':273,'end':333,'title':'Ekadhammassavaniyattheraapadānaṃ','vri':'88–106','heading':273,'printed':7,'speaker_blocks':[330,331],'speaker':'ekadhammassavaniyo','colophon':332,'source_cues':['Padumuttaro nāma jino','jaṭilo uggatāpano','Aniccā vata saṅkhārā','Jātiyā sattavassena']},
}
proposed={};records=[]
for uid in IDS:
    d=DETAILS[uid];lo,hi=d['start'],d['end'];rows=blocks[lo:hi];heading=d['heading'];old=byid[uid]
    assert blocks[heading][0]=='subhead'and blocks[heading][2]==str(d['printed'])+'. '+d['title']
    assert all(any(cue in b[2]for b in rows)for cue in d['source_cues'])
    assert d['speaker']in blocks[d['speaker_blocks'][0]][2]
    assert blocks[d['colophon']][0]=='centre'and 'ttherassāpadānaṃ'in blocks[d['colophon']][2]
    assert d['speaker_blocks'][-1]+1==d['colophon']and d['colophon']+1==hi
    labels=[int(b[1])for b in rows if b[1]is not None]
    assert labels==list(range(labels[0],labels[-1]+1))and d['vri']==str(labels[0])+'–'+str(labels[-1])
    previous=[(i,b[4]['P'][-1])for i,b in enumerate(blocks[:lo])if b[4].get('P')]
    inside=[(i,b[4]['P'])for i,b in enumerate(rows,lo)if b[4].get('P')]
    first=previous[-1][1]if previous else inside[0][1][0];last=inside[-1][1][-1]if inside else first
    pts={'volume':int(first.split('.')[0]),'page':int(first.split('.')[1]),'end_page':int(last.split('.')[1])}
    assert pts==old['pts']
    after=copy.deepcopy(old);assert 'index_revision'not in after
    after.update({k:d[k]for k in('start','end','title','vri')});proposed[uid]=after
    records.append({'id':uid,'before':old,'after_core_only':after,'before_object_sha256':J(old),'after_core_object_sha256':J(after),
      'source_heading':{'block':heading,'physical_XML_index':physical_indices[heading],'printed_label':d['printed'],'title':d['title'],'tuple_sha256':J(blocks[heading])},
      'poem_numbered_labels':labels,'source_scope_tuple_sha256':J(rows),
      'speaker_formula':{'blocks':d['speaker_blocks'],'renditions':[blocks[i][0]for i in d['speaker_blocks']],'tuples_sha256':J([blocks[i]for i in d['speaker_blocks']]),'named_speaker':d['speaker'],'visible_text_sha256':[H(blocks[i][2])for i in d['speaker_blocks']]},
      'closing_colophon':{'block':d['colophon'],'tuple_sha256':J(blocks[d['colophon']])},
      'PTS_source':{'carried_marker_before_scope':{'block':previous[-1][0],'page':previous[-1][1]}if previous else None,'actual_markers_inside':[{'block':i,'pages':p}for i,p in inside],'derived':pts,'unchanged':True},
      'all_original_notes':[{'block':i,'note_sha256':[H(t)for t in b[3]]}for i,b in enumerate(rows,lo)if b[3]],
      'all_original_page_markers':[{'block':i,'pages':b[4]}for i,b in enumerate(rows,lo)if b[4]]})
pairproofs=[];blockrows=[]
for left,right,cut in PAIRS:
    a,z=byid[left],byid[right];lo,hi=a['start'],z['end'];assert a['end']==z['start']and a['end']-cut==4
    assert proposed[left]['end']==proposed[right]['start']==cut
    assert [b[0]for b in blocks[cut:a['end']]]==['subhead','hangnum','gatha1','gathalast']
    assert blocks[cut+1][1]and int(blocks[a['end']][1])==int(blocks[cut+1][1])+1
    assert DETAILS[left]['colophon']==cut-1
    # Explain the old failure without weakening or changing its literal rule.
    literal_failure=not blocks[cut-2][2].endswith('imā gāthāyo abhāsitthāti.')
    assert literal_failure
    assert 'Itthaṃ sudaṃ āyasmā '+DETAILS[left]['speaker']+' thero'in blocks[cut-3][2]
    assert blocks[cut-2][2]in('Abhāsitthāti.','Gāthāyo abhāsitthāti.')
    pairproofs.append({'ids':[left,right],'old_cut':a['end'],'source_proposed_cut':cut,'union_half_open':[lo,hi],'union_tuple_sha256':J(blocks[lo:hi]),'moved_blocks_half_open':[cut,a['end']],'moved_prefix_tuple_sha256':J(blocks[cut:a['end']]),
      'raw_split_left_speaker_formula':{'blocks':[cut-3,cut-2],'kinds':[blocks[cut-3][0],blocks[cut-2][0]],'each_text_sha256':[H(blocks[i][2])for i in(cut-3,cut-2)],'single_previous_bodytext_literal_rule_passes':False,'unchanged_Book36_matcher':True},
      'left_named_speaker_and_colophon_before_right_heading':True,'distinct_right_opening_narrative_and_named_closing':True})
    for i in range(lo,hi):
        blockrows.append({'book':37,'block':i,'tuple_sha256':J(blocks[i]),'kind':blocks[i][0],'number':blocks[i][1],
           'current_owner':left if i<a['end']else right,'proposed_source_owner':left if i<cut else right,
           'notes_sha256':J(blocks[i][3]),'notes_count':len(blocks[i][3]),'pages':blocks[i][4]})
assert len(blockrows)==256and len({r['block']for r in blockrows})==256
assert sum(r['current_owner']!=r['proposed_source_owner']for r in blockrows)==12
comment,comraw,compins=readshards('commentary');assert H(comraw)=='8b9c055181913097bb37cbe0046e8c64efcabea884aad49d272a424cd1207461'
assocs={uid:comment['units'].get(uid,[])for uid in IDS};assert all(not v for v in assocs.values())
intersections=[p for p in comment['passages']if p[3]==37and any(p[9]<hi and lo<p[10]for lo,hi in[(1,114),(190,242),(242,333)])];assert not intersections
groups=[u for u in canon['units']if u.get('shares_passage_with')in IDS or set(u.get('members',[]))&set(IDS)];assert not groups
parraw=gzip.decompress((DATA/'parallels.json.gz').read_bytes());par=json.loads(parraw);assert all(uid not in C(par[k]).decode()for uid in IDS for k in('citations','shared'))
neighbors=[byid[k]for k in('tha-ap422','tha-ap425','tha-ap430')]
others=[u for u in canon['units']if u['id']not in IDS];assert len(others)==8538
report={'schema':'independent-original-first-book37-first-three-pairs-source-review-v1','producer':'A','status':'SOURCE_CORE_SIX_RECORD_PROPOSALS_QUALIFY_NO_NAMESPACE_OR_ACTIVATION',
 'source':{'XML_path':str(XML),'XML_sha256':H(xml),'XML_git_blob_sha1':blob,'VRI_commit':canon['source']['commit'],'physical_elements':len(physical),'retained_tuples':len(blocks),'omitted_note_only_physical_indices':omitted,'whole_book_tuple_sha256':J(blocks),'all_original_tuples_equal_current_book37':True,'current_canonical':cp},
 'scope':{'ids':IDS,'three_pairs':3,'core_records':6,'source_blocks_in_closed_unions':256,'moved_source_blocks':12,'English_scope':None},
 'records':records,'pair_proofs':pairproofs,
 'source_voice_review':['423closes its Vipassi/patali-Bodhi sweeping narrative through a named two-block speaker formula and first-poem colophon. The following Hamsavati grass-worker/one-cloth opening belongs with424’s Padumuttara/cloth story, named closing and second colophon.',
 '426closes the seven-buddha/kadamba-flower narrative through its split named speaker and fourth colophon. The next forest-worker/Tissa footprints/koranda-flower opening belongs with427’s matching story, named speaker and fifth colophon.',
 '428closes ghatamanda-giving to Sucintita with its split named speaker and sixth colophon. The next Padumuttara/Four-Truths opening belongs with429’s flying ascetic/impermanence-hearing narrative and named seventh colophon. Similar stories elsewhere establish no English or second canonical identity.'],
 'Book36_signature_failure':'The literal preceding bodytext clause is only the final Abhasitthati or Gathayo abhasitthati; the named speaker begins one block earlier in centre. No single prior bodytext ends with the full Book36 formula. Original kinds, capital letters, punctuation and splits are evidence; do not broaden the ten-check detector or flatten/rewrite these source blocks.',
 'original_markup_preserved':['Right424speaker at112and right427speaker at240are gathalast, so the existing renderer may append them to the preceding verse. This review must not retag or separate them.','429has consecutive gathalast blocks291/292; the existing renderer emits292as a separate verse without an invented paragraph label. Preserve that exact behavior.','423keeps original front matter1–5and source-book scope; no prefatory block is discarded to make the cut look regular.'],
 'dependencies':{'commentary':compins,'commentary_total_associations':sum(map(len,comment['units'].values())),'accepted_book37_root_intervals':sum(p[3]==37for p in comment['passages']),'target_associations':assocs,'union_root_intersections':[],'group_dependencies':[],'target_parallel_edges':False,'parallels_logical_sha256':H(parraw)},
 'preservation':{'all61_books_sha256':J(canon['books']),'all8538_other_full_units_sha256':J(others),'full_neighbor_records':neighbors,'source_object_sha256':J(canon['source']),'all_notes_pages_source_types_and_words_unchanged':True,'private_data_accessed':False},
 'independence':{'raw_read_before_screen_or_queue_consultation':True,'other_new_reviewer_outputs_read':False,'screen_or_queue_used_as_proof':False,'app_Builder_repair_imports':False,'new_namespace_assigned':False,'renderer_not_used_to_establish_ownership':True},
 'holds':['Core-only source proposal, no future namespace or activation. Any implementation needs independent exact dataset/revision/consumer policy approval and preservation of every old saved position.','No English identity, translation rights, coverage gain, note/bookmark migration, runtime/app/browser/package/fullcheck/CI/push or release approval.','The unchanged ten-check detector still fails these three; source semantic evidence does not authorize matcher broadening.','Read-only isolated invocation of existing rendering logic is a source-position diagnostic; no actual MCP/UI acceptance or correct saved-locator migration is implied.'],
 'coverage_gain':0}
def write(name,v):
    with(D/name).open('x',encoding='utf8')as f:f.write(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
write('SOURCE_CORE_REPORT.json',report);write('PROPOSED_SIX_CORE_RECORDS.json',{'schema':'unactivated-book37-first3-six-core-records-v1','before':{uid:byid[uid]for uid in IDS},'after_core_only':proposed,'namespace_assigned':False})
write('SOURCE256_BLOCK_CROSSWALK.json',{'schema':'source-block-only-book37-first3-crosswalk-v1','rows':blockrows,'not_positional_migration_authority':True})
write('SOURCE_ONLY_PRESEAL.json',{'status':report['status'],'files':{p.name:{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())}for p in D.iterdir()if p.is_file()},'ownership_presealed_before_reader_position_diagnostic':True,'no_namespace_or_activation_approval':True})
# Edition cache qualification is derived from the complete current marker map,
# so the isolated existing renderer uses authentic labels without lazy loading.
locations={}
for bi,book in enumerate(canon['books']):
    for row in book['blocks']:
        for ed in('T','M','V'):
            for at in row[4].get(ed,[]):locations.setdefault((ed,book['collection'],at),set()).add(bi)
needs=sorted({ed+'|'+coll for(ed,coll,at),owners in locations.items()if len(owners)>1})
books=[{k:v for k,v in book.items()if k!='blocks'}for book in canon['books']];books[37]['blocks']=blocks[:333]
write('ISOLATED_RENDER_INPUT.json',{'canon':{'books':books,'units':[byid[uid]for uid in IDS]},'old_units':[byid[uid]for uid in IDS],'proposed_units':[proposed[uid]for uid in IDS],'needsBook':needs,'presealed_source_report_sha256':H((D/'SOURCE_CORE_REPORT.json').read_bytes())})
print(json.dumps({'status':report['status'],'source_report_sha256':H((D/'SOURCE_CORE_REPORT.json').read_bytes()),'source_preseal_sha256':H((D/'SOURCE_ONLY_PRESEAL.json').read_bytes()),'core_records_sha256':H((D/'PROPOSED_SIX_CORE_RECORDS.json').read_bytes())}))
