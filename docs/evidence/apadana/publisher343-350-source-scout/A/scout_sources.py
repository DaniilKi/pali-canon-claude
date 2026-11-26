"""Eight original-first source scopes. No app/parser imports or activation."""
import gzip,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
D=Path(__file__).resolve().parent;E=D.parent;DATA=Path('/tmp/pali-boundaries340-nov26/server/data')
PRIOR=Path('/tmp/pali-next334-source-review-nov26');PROJECT=DATA.parent.parent
H=lambda v:hashlib.sha256(v if isinstance(v,bytes) else v.encode()).hexdigest()
C=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
J=lambda v:H(C(v))
B=lambda v:hashlib.sha1(b'blob '+str(len(v)).encode()+b'\0'+v).hexdigest()
acq=json.loads((D/'ACQUISITION.json').read_bytes());assert len(acq['files'])==8
assert acq['revision']=='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
priorraw=(PRIOR/'independent-review/ORIGINAL_SOURCE_REVIEW.json').read_bytes()
assert H(priorraw)=='dace9bc63059c211f0ae090dc69a2bd4487b2fbeaee9fdce0579eae40c0c65a2'
prior=json.loads(priorraw);rights=[]
for r in prior['rights_originals']:
    raw=(PRIOR/'originals'/r['path']).read_bytes();assert len(raw)==r['bytes'] and H(raw)==r['sha256'] and B(raw)==r['git_blob_sha1'];rights.append(r)
proposal_path=E/'next-source-review/producer-b/PROPOSED_CORE_METADATA.json'
proposeraw=proposal_path.read_bytes();assert H(proposeraw)=='9a02e4a137de6c046213573b3d1aebbc981a0b02ea34f2b037f16922eb992035'
proposed=json.loads(proposeraw)['records']
joint_path=E/'next-source-review/cross-comparison-b/SOURCE_ONLY_CROSS_COMPARISON_GO.json'
jointraw=joint_path.read_bytes();assert H(jointraw)=='a5d36a7c120ed1bb7609800089e51b41c58756f71ae0a6541d3b4cbb7a89cfb0'
assert json.loads(jointraw)['status']=='SOURCE_ONLY_GO_EXACT_FOUR_CORE_PROPOSALS_NO_ACTIVATION'
m=json.loads((DATA/'canon.json.gz.parts.json').read_bytes());chunks=[]
for r in m['parts']:
    raw=(DATA/r['file']).read_bytes();assert len(raw)==r['size'] and H(raw)==r['sha256'];chunks.append(raw)
packed=b''.join(chunks);assert len(packed)==m['size'] and H(packed)==m['sha256'];canonraw=gzip.decompress(packed)
assert H(canonraw)=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
canon=json.loads(canonraw);assert canon['source']['commit']=='2d134ff9ef60f70a1eb03c9370580228811a3070'
xml=Path('/tmp/pali-sariputta-release/vri-fixture/romn/s0510m1.mul.xml').read_bytes()
assert H(xml)=='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1' and B(xml)=='f37368072aece065d2668f93a74c24b423939f1f'
collapse=lambda s:re.sub(r'\s+',' ',s).strip()
def visible(e):
    t=e.text or ''
    for ch in e:
        if ch.tag not in ('note','pb') and not(ch.tag=='hi' and ch.get('rend') in ('paranum','dot')):t+=visible(ch)
        t+=ch.tail or ''
    return t
blocks=[]
for e in ET.fromstring(xml).iter():
    if e.tag not in ('p','head','trailer'):continue
    t,n=collapse(visible(e)),e.get('n')
    if not t and not n:continue
    pages={}
    for pb in e.iter('pb'):pages.setdefault(pb.get('ed'),[]).append('.'.join(str(int(p))for p in pb.get('n').split('.')))
    blocks.append([e.get('rend') or ('centre'if e.tag=='trailer'else'bodytext'),n,t,[collapse(''.join(v.itertext()))for v in e.iter('note')],pages])
assert len(blocks)==14645 and blocks==canon['books'][36]['blocks']
units={u['id']:u for u in canon['units']};catraw=(DATA/'apadana.json').read_bytes();cat=json.loads(catraw);assert len(cat['links'])==343
MAPPINGS={343:'tha-ap345',344:'tha-ap346',345:'tha-ap347',346:'tha-ap348',347:'tha-ap349',348:'tha-ap350',349:'tha-ap351',350:'tha-ap352'}
DETAILS={
343:{'title':'Dhajadāyaka','speaker':'dhajadāyako','english':['was named Tissa','I hoisted a flag','ninety-two aeons'],'pali':['Tisso nāma ahu satthā','dhajaṃ āropitaṃ','Dvenavute ito kappe'],
 'features':['Tissa’s passing and flag offering','300divine/500monarchic reigns','92aeons and khoma-cloth covering'],
 'caveats':['Original note3 attributes a BJTS/gloss interpretation of the passing expression. Preserve it as the translator’s reading.','The original local6 wording attaches note5 directly to the following word; do not manufacture whitespace to improve it.']},
344:{'title':'Tīṇikiṅkhaṇikapūjaka','speaker':'tikiṅkaṇipūjako','english':['mountain, Bhūtagaṇa','a robe made of rags','thirty-one aeons'],'pali':['bhūtagaṇo nāma pabbato','Tatthaddasaṃ paṃsukūlaṃ','Ekattiṃse ito kappe'],
 'features':['Bhutagana mountain','rag robe at tree top','three kinkani flowers and31aeons'],
 'caveats':['Original publisher Tīṇikiṅkhaṇika spelling, note2BJTS Tikiṅkiṇi and VRI Tikiṅkaṇi differ. Keep all names source-specific.','Original note5 chooses tree-top over bad-road interpretation using commentary/BJTS gloss; no commentary acquisition or fresh specialist verdict is implied.','Current canonical346already uses the six-record corrected end10324; do not pin the earlier overextended scope.']},
345:{'title':'Nalāgārika','speaker':'naḷāgāriko','english':['The Self-Become One, Nārada','a house of reeds','seventy-seven times'],'pali':['Sayambhū nārado nāma','Naḷāgāraṃ karitvāna','Catusattati kkhattuñca'],
 'features':['Harita mountain and Narada','reed house/grass roof/cleared walkway','later luminous thousand-pillared mansion'],
 'caveats':['Publisher local4/global3107 prints77monarchic reigns; original VRI34at10335has74. Retain and disclose, without harmonization.','Publisher Nalāgārika versus VRI Naḷāgārika and the original note3parallel-mountain discussion remain source-attributed, not duplicate mapping authority.','Current canonical347uses corrected start10324and existing six-unit revision.']},
346:{'title':'Campakapupphiya','speaker':'campakapupphiyo','english':['The Buddha named Sudassana','seven \\[fragrant\\]','thirty-one aeons'],'pali':['Buddho sudassano nāma','Satta campakapupphāni','Ekattiṃse ito kappe'],
 'features':['Himalayan mountain name differs by edition','Sudassana and seven campaka flowers','named Campaka speaker closes before Paduma heading'],
 'caveats':['ACTIVATION CONDITIONAL: current canonical348end10371includes next poem’s heading and first stanza. Only the independently presealed core end10367matches this five-stanza publisher poem; no repair or namespace is activated here.','Publisher Cāvala contrasts with VRI jāpalo and VRI variants cāpalo/chāpalo. Preserve spellings and uncertain etymology.','Exact original mixed-case C/Ch and c/ch HTML display pairs occur in heading, body, colophons and notes; require finite validated owner/location guards. Current generic HTML rejection must not be relaxed globally.']},
347:{'title':'Padumapūjaka','speaker':'padumapūjako','english':['mountain named Romasa','Buddha known as Sambhava','ninety-one aeons'],'pali':['romaso nāma pabbato','Buddhopi sambhavo nāma','Ekanavutito kappe'],
 'features':['Romasa mountain and Sambhava','lotus carrying and91aeons','distinct named speaker and seventh-poem colophon'],
 'caveats':['ACTIVATION CONDITIONAL: current canonical349start10371omits its heading and opening VRI44. Only presealed core start10367and final-niggahita title include the complete source poem. No active span was changed or treated as corrected.','The publisher prints local labels1,2,3,3 beside global3117–3120. Keep the repeated3; never invent local4.','Original note2compares another near-duplicate with31rather than91aeons and a longer refrain. It authorizes no second mapping.','Original local2translates movement differently from VRI residence wording; preserve the English edition and literal note4, without reconciling it.','Original VRI recitation block10381stays unchanged in existing349scope and is not a stanza. This English file prints no matching recitation marker; do not insert one.']},
348:{'title':'Tiṇamuṭṭhidāyaka','speaker':'tiṇamuṭṭhidāyako','english':['The Sambuddha, Upatissa','I was a deer-hunter','ninety-four aeons'],'pali':['Upatisso nāma sambuddho','Migaluddo tadā āsiṃ','Catunnavutito kappe'],
 'features':['Lambaka and Upatissa','hunter offers grass seat and is killed by lion','divine sacrificial post and94aeons'],
 'caveats':['Combined local2–3/global3122–3123is one8-line physical entry.','Original note2points to a similar later poem with opening/refrain changes; no global title or offset mapping is inferred.','Original notes10–11retain uncertain ancient measures; do not infer dimensions.']},
349:{'title':'Tiṇḍukaphaladāyaka','speaker':'tindukaphaladāyako','english':['shining like a dinner-plate tree','I gave them to \\[him\\], Vessabhu','ninety-one aeons'],'pali':['Kaṇikāraṃva jotantaṃ','Tindukaṃ saphalaṃ disvā','Ekanavutito kappe'],
 'features':['radiant Buddha on mountain','tinduka fruit offering','91aeons and fruit-giving refrain'],
 'caveats':['Publisher Tiṇḍuka contrasts with VRI Tinduka; retain source names and botanical notes2,4,5.','English names Vessabhu, whereas VRI60at10423says the Self-Born One without that name. Disclose the edition difference; do not add the name to Pāli.']},
350:{'title':'Ekañjaliya','speaker':'ekañjaliyo','english':['Sambuddha named Revata','I pressed my hands together once','ninety-four aeons'],'pali':['Romaso nāma sambuddho','ekañjalimakāsahaṃ','Catunnavutito kappe'],
 'features':['radiant Buddha at riverbank','forge/charcoal/star similes','single salutation and94aeons','then separate chapter35summary'],
 'caveats':['Original English Revata versus VRI Romasa is an expressly attributed choice in note3; note4discusses competing ray readings. Preserve the original uncertainty/alternatives.','Combined local1–2/global3136–3137is one8-line entry.','Separate note-free summary has6lines, count66and chapter35footer; its Pandoc C/Ch roster display retains on-state spelling. No summary text belongs in poem pagination or quotations.']},
}
# Finite original HTML presentation for evidence matching ONLY. This does not
# import/call the application parser or authorize changes to it.
def visible_display(raw):
    return re.sub(r'<span class="diacritics" data-state="on">([cC])</span><span class="no-diacritics" data-state="off">(?:ch|Ch)</span>',r'\1',raw)
records=[];totals={'physical_entries':0,'global_labels':0,'poem_notes':0,'body_paragraphs':0};combined=[]
for acquired in acq['files']:
    n=acquired['publisher_poem'];uid=MAPPINGS[n];detail=DETAILS[n];current=units[uid]
    raw=Path(acquired['local_path']).read_bytes();assert H(raw)==acquired['sha256'] and B(raw)==acquired['expected_git_blob']
    text=raw.decode();assert '\r'not in text;front=re.match(r'^---\n(.*?)\n---\n',text,re.S);assert front
    title=re.search(r'^title: (.+)$',front[1],re.M)[1];assert title==detail['title'] and f'order: {n}'in front[1] and 'category: chapter-3'in front[1]
    rest=text[front.end():].strip();at=re.search(r'^\[\^\d+\]:',rest,re.M);assert at;poem,defs=rest[:at.start()].strip(),rest[at.start():]
    notes=[(int(m[1]),m[2].strip())for m in re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',defs,re.M|re.S)]
    assert [k for k,v in notes]==list(range(1,len(notes)+1))
    assert set(map(int,re.findall(r'\[\^(\d+)\]',poem)))==set(k for k,v in notes)
    summary=None
    if n==350:
        poem,tail=poem.split('\n\nThe Summary:\n\n');summary='The Summary:\n\n'+tail
        assert len(summary.split('\n\n'))==3 and len(summary.split('\n\n')[1].splitlines())==6 and not re.search(r'\[\^\d+\]',summary)
    paragraphs=poem.split('\n\n');clean=visible_display(poem);cleanparas=clean.split('\n\n')
    heading=re.match(r'^### \\\[(\d+)\. \{(\d+)\.\}\[\^1\] (.+)\\\]$',cleanparas[0]);assert heading and int(heading[2])==n
    assert cleanparas[-2].startswith('Thus indeed Venerable '+title) and cleanparas[-1].startswith('The legend of '+title)
    layout=[];global_labels=[];local_printed=[]
    for index,para in enumerate(paragraphs[1:-2]):
        match=re.search(r'\((\d+(?:-\d+)?)\) \\\[(\d+(?:-\d+)?)\\\](?:\[\^\d+\])?$',para);assert match
        local,publisher=match.groups();expand=lambda s:list(range(int(s.split('-')[0]),int(s.split('-')[-1])+1))
        local_printed+=expand(local);global_labels+=expand(publisher)
        layout.append({'local_label':local,'publisher_label':publisher,'lines':len(para.splitlines()),'raw_paragraph_sha256':H(para),'raw_note_calls':list(map(int,re.findall(r'\[\^(\d+)\]',para)))})
        if '-'in local:combined.append({'publisher_poem':n,'local':local,'global':publisher,'physical_lines':len(para.splitlines())})
    assert global_labels==list(range(global_labels[0],global_labels[-1]+1))
    if n==347:assert local_printed==[1,2,3,3]
    else:assert local_printed==list(range(1,len(local_printed)+1))
    conditional=uid in ('tha-ap348','tha-ap349');sourcecore=proposed[uid]if conditional else current
    lo,hi=sourcecore['start'],sourcecore['end'];rows=blocks[lo:hi]
    hs=[(lo+i,r)for i,r in enumerate(rows)if r[0]=='subhead'];assert len(hs)==1 and hs[0][1][2].endswith(sourcecore['title'])
    formula='Itthaṃ sudaṃ āyasmā '+detail['speaker']+' thero imā gāthāyo abhāsitthāti.'
    speakers=[lo+i for i,r in enumerate(rows)if r[0]=='bodytext'and r[2]==formula];assert len(speakers)==1;speaker=speakers[0]
    assert blocks[speaker+1][0]=='centre' and 'ttherassāpadānaṃ'in blocks[speaker+1][2]
    for cue in detail['english']:assert cue in clean,(n,cue)
    for cue in detail['pali']:assert any(cue in r[2]for r in rows),(n,cue)
    assert not cat['links'].get(uid)
    current_extra=[{'block':i,'kind':blocks[i][0],'tuple_sha256':J(blocks[i])}for i in range(current['start'],current['end'])if not lo<=i<hi]
    missing=[{'block':i,'kind':blocks[i][0],'tuple_sha256':J(blocks[i])}for i in range(lo,hi)if not current['start']<=i<current['end']]
    html_pairs=re.findall(r'<span class="diacritics" data-state="on">([cC])</span><span class="no-diacritics" data-state="off">(ch|Ch)</span>',text)
    parserwork=['Exact mixed PTS/BJTS heading identity for this original only; no generic filename-number offset. All new profiles remain currently unregistered.']
    if n==346:parserwork.append('Exact case-sensitive HTML display-pair validation with pinned counts and paragraph/note locations; uppercase C/Ch is currently rejected outside finite approved source owners. Do not extend arbitrary HTML acceptance.')
    if n==347:parserwork.append('Preserve duplicate local3 in literal stanza_layout suffixes; source global labels remain unique. No synthetic local4 or paragraph change.')
    if n==350:parserwork.append('Add only canonical352 to the exact note-free chapter-summary owner scope after independent source/normalization approval; preserve6summary lines and66count.')
    records.append({'publisher_poem':n,'title':title,'printed_PTS_poem':int(heading[1]),'printed_BJTS_poem':int(heading[2]),'candidate_canonical_uid':uid,
      'status':'CONDITIONAL_ON_INDEPENDENTLY_APPROVED_BUT_NOT_ACTIVE348_349_REPAIR'if conditional else'STRONG_SOURCE_CANDIDATE_PENDING_INDEPENDENT_NORMALIZATION_AND_FINITE_PARSER_REVIEW',
      'raw_source':acquired,'actual_current_canonical_record':current,'actual_current_record_sha256':J(current),
      'source_reviewed_record_for_comparison':sourcecore,'source_reviewed_record_sha256':J(sourcecore),'comparison_record_is_active':not conditional,
      'boundary_scope_comparison':{'conditional':conditional,'current_scope_half_open':[current['start'],current['end']],'source_scope_half_open':[lo,hi],'current_extra_foreign_blocks':current_extra,'current_missing_opening_blocks':missing,'no_active_record_changed':True},
      'original_VRI_evidence':{'heading_block':hs[0][0],'heading_sha256':H(hs[0][1][2]),'named_speaker_block':speaker,'named_speaker_sha256':H(blocks[speaker][2]),'closing_colophon_block':speaker+1,'closing_colophon_sha256':H(blocks[speaker+1][2]),'poem_core_half_open':[hs[0][0],speaker+2],'poem_core_tuple_sha256':J(blocks[hs[0][0]:speaker+2]),'whole_reviewed_scope_tuple_sha256':J(rows),'original_number_markers':[r[1]for r in rows if r[1]is not None],'original_notes_count':sum(len(r[3])for r in rows),'original_pages':[{'block':i,'pages':r[4]}for i,r in enumerate(rows,lo)if r[4]]},
      'individually_compared_features':detail['features'],'edition_caveats':detail['caveats'],
      'publisher_structure':{'body_paragraphs':len(paragraphs),'physical_entries':len(layout),'printed_local_labels_expanded_without_correction':local_printed,'global_label_range':[global_labels[0],global_labels[-1]],'stanza_layout_raw':layout,'note_numbers':[k for k,v in notes],'raw_note_definition_hashes':[{'number':k,'sha256':H(v)}for k,v in notes],'all_notes_poem_owned':True,'raw_poem_sha256':H(poem),'summary':{'raw_sha256':H(summary),'paragraphs':3,'physical_lines':6,'note_numbers':[]}if summary else None,'HTML_display_pair_counts':{'upper_C_Ch':html_pairs.count(('C','Ch')),'lower_c_ch':html_pairs.count(('c','ch'))}},
      'parser_static_assessment':{'current_parser_acceptance_executed':False,'current_profile_registered':False,'required_finite_work':parserwork,'representation':'Existing explicit stanza_layout and notes shapes can represent source structure after separately approved finite guards; no source renumbering or broad HTML rule is warranted.'},
      'whole_means_complete_publisher_edition_not_line_complete_VRI':True,'activation_or_namespace_approval':False})
    totals['physical_entries']+=len(layout);totals['global_labels']+=len(global_labels);totals['poem_notes']+=len(notes);totals['body_paragraphs']+=len(paragraphs)
assert totals=={'physical_entries':45,'global_labels':47,'poem_notes':58,'body_paragraphs':69}
assert [r['candidate_canonical_uid']for r in records if r['boundary_scope_comparison']['conditional']]==['tha-ap348','tha-ap349']
assert len(records[3]['boundary_scope_comparison']['current_extra_foreign_blocks'])==4
assert len(records[4]['boundary_scope_comparison']['current_missing_opening_blocks'])==4
assert records[3]['publisher_structure']['HTML_display_pair_counts']=={'upper_C_Ch':5,'lower_c_ch':3}
assert blocks[10381][0]=='centre' and blocks[10381][2]=='Terasamaṃ bhāṇavāraṃ.'
oldscout_path=E/'next-english335-342-scout/SCOUT_REPORT.json';oldscoutraw=oldscout_path.read_bytes();assert H(oldscoutraw)=='9c0b486c4f88faec01f772b949e7f9306caabbd2e5768f0e64034b3b4a80f4cc';oldscout=json.loads(oldscoutraw)
source_constraints={'proposed_core_metadata':{'path':str(proposal_path),'sha256':H(proposeraw),'NOT_ACTIVE':True},'independent_cross_comparison':{'path':str(joint_path),'sha256':H(jointraw),'source_only':True}}
report={'schema':'bounded-original-first-publisher343-350-scout-v1','status':'EIGHT_SOURCE_CANDIDATES_TWO_BOUNDARY_CONDITIONAL_NO_ACTIVATION',
 'scope':{'publisher_poems':list(MAPPINGS),'explicit_mappings':MAPPINGS,'totals':totals,'global_label_range':[3093,3139],'boundary_conditional_publisher_poems':[346,347],'separate_note_free_summary_publisher':350,'beyond350_acquired':False,'activation_count':0},
 'source_pins':{'publisher_repository':acq['repository'],'publisher_revision':acq['revision'],'acquisition_sha256':H((D/'ACQUISITION.json').read_bytes()),'VRI_commit':canon['source']['commit'],'XML_sha256':H(xml),'XML_git_blob_sha1':B(xml),'all14645_original_tuples_equal_active_book36':True,'current_canon_logical_sha256':H(canonraw),'current343_catalogue_sha256':H(catraw)},
 'rights':{'specific_translation_grant':'CC BY-NC-SA4.0','translator':'Jonathan S. Walters','publisher':'Jonathan S. Walters and Whitman College','six_original_rights_artifacts':rights,'specific_translation_grant_overrides_generic_site_CC_BY':True,'required_retention':['attribution','original source/revision','full copyright/licence/disclaimer','disclosed presentation changes','noncommercial/share-alike conditions','no endorsement'],'bodies_and_notes_live_only_no_app_bundling':True,'no_new_rights_or_audio_media_commercial_clearance':True},
 'records':records,'conditional_boundary_authorities':source_constraints,
 'special_preservation':{'347duplicate_local_label_sequence':[1,2,3,3],'combined_physical_entries':combined,'346mixed_HTML_pairs':records[3]['publisher_structure']['HTML_display_pair_counts'],'350summary':{'physical_lines':6,'notes':[],'literal_count':66},'original_VRI_recitation10381':{'tuple_sha256':J(blocks[10381]),'unchanged_existing_owner':'tha-ap349','not_stanza_or_new_English_material':True}},
 'larger16_scout_only':{'prior335_342_report_sha256':H(oldscoutraw),'publisher_scope':[335,350],'physical_entries':oldscout['scope']['physical_entries']+totals['physical_entries'],'printed_global_labels':oldscout['scope']['global_labels']+totals['global_labels'],'global_label_range':[2969,3139],'poem_notes':oldscout['scope']['poem_notes']+totals['poem_notes'],'poem_body_paragraphs':oldscout['scope']['poem_body_paragraphs']+totals['body_paragraphs'],'chapter34summary_publisher':340,'chapter35opening_publisher':341,'chapter35summary_publisher':350,'all16_already_approved_or_activated':False,'candidates_not_coverage_gain':True},
 'holds':['No canonical348/349correction is active. Publisher346/347must not receive whole-unit links or source pins built from the current wrong spans.','A later repair must preserve old six-helper neighbor348constant and its earlier authority/hook; use separately reviewed ordered repairs/inverses. This scout approves no repair, namespace or migration.','All eight require independent source/normalization/profile review and exact mixed PTS/BJTS heading guards. Publisher346needs finite mixed-case HTML owner/location controls and publisher350needs a separate zero-note summary scope.','Retain publisher347duplicate local3 and all edition/narrative differences, original note calls and complete colophons. Never invent missing labels, words or full VRI expansion.','Current343choices, prior holds, source books, accepted six-unit namespace, private data and the frozen exact85drelease/CIremain unchanged.','No English343+source outside the eight files was acquired; no broader catalogue mapping or physical/human usability claim is made.'],
 'static_parser_source_pins':{name:H((PROJECT/name).read_bytes())for name in ('src/apadana-thera.mjs','src/apadana-presentation.mjs')},
 'operations':{'raw_requests':8,'each_exact_blob_verified':True,'no_boundary351_needed':'Publisher350has complete named closing plus chapter35summary/footer, closing the finite source scope.','project_or_Git_mutations':False,'parser_app_imports_tests_build_browser_runtime':False,'canonical_or_namespace_change':False,'private_data_or_CI_access':False,'outreach':False},'activation_coverage_gain':0}
with(D/'SCOUT_REPORT.json').open('x',encoding='utf8')as f:f.write(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
seal={'schema':'eight-source343-350-scout-seal-v1','status':report['status'],'files':{str(p.relative_to(D)):{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())}for p in D.rglob('*')if p.is_file()},'no_implementation_activation_or_runtime_approval':True}
with(D/'SCOUT_SEAL.json').open('x',encoding='utf8')as f:f.write(json.dumps(seal,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'report_sha256':H((D/'SCOUT_REPORT.json').read_bytes()),'seal_sha256':H((D/'SCOUT_SEAL.json').read_bytes()),'totals':totals,'sixteen':report['larger16_scout_only']}))
