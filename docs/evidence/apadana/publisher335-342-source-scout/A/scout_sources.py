"""Finite source-only scouting; no application imports or activation objects."""
import gzip,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
D=Path(__file__).resolve().parent;DATA=Path('/tmp/pali-boundaries340-nov26/server/data')
PROJECT=DATA.parent.parent;PRIOR=Path('/tmp/pali-next334-source-review-nov26')
H=lambda v:hashlib.sha256(v if isinstance(v,bytes) else v.encode()).hexdigest()
C=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
J=lambda v:H(C(v))
B=lambda v:hashlib.sha1(b'blob '+str(len(v)).encode()+b'\0'+v).hexdigest()
acq=json.loads((D/'ACQUISITION.json').read_bytes());assert len(acq['files'])==8
assert acq['revision']=='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
priorraw=(PRIOR/'independent-review/ORIGINAL_SOURCE_REVIEW.json').read_bytes()
assert H(priorraw)=='dace9bc63059c211f0ae090dc69a2bd4487b2fbeaee9fdce0579eae40c0c65a2'
prior=json.loads(priorraw)
rights=[]
for row in prior['rights_originals']:
    raw=(PRIOR/'originals'/row['path']).read_bytes()
    assert len(raw)==row['bytes'] and H(raw)==row['sha256'] and B(raw)==row['git_blob_sha1']
    rights.append({**row,'verified_local_original_path':str(PRIOR/'originals'/row['path'])})
about=(PRIOR/'originals/src/_pages/about.md').read_text()
assert 'The text of the translation and the site’s code are made freely available to' in about
assert '[8]: https://creativecommons.org/licenses/by-nc-sa/4.0/' in about
assert 'https://creativecommons.org/licenses/by-nc-sa/4.0/' in (PRIOR/'originals/src/_includes/layouts/epub-metadata.xml').read_text()
manifest=json.loads((DATA/'canon.json.gz.parts.json').read_bytes());parts=[]
for part in manifest['parts']:
    raw=(DATA/part['file']).read_bytes();assert len(raw)==part['size'] and H(raw)==part['sha256'];parts.append(raw)
packed=b''.join(parts);assert len(packed)==manifest['size'] and H(packed)==manifest['sha256']
canonraw=gzip.decompress(packed);assert H(canonraw)=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
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
    for p in e.iter('pb'):pages.setdefault(p.get('ed'),[]).append('.'.join(str(int(k)) for k in p.get('n').split('.')))
    blocks.append([e.get('rend') or ('centre' if e.tag=='trailer' else 'bodytext'),n,t,[collapse(''.join(x.itertext())) for x in e.iter('note')],pages])
assert len(blocks)==14645 and blocks==canon['books'][36]['blocks']
units={u['id']:u for u in canon['units']}
# Explicit mappings from eight individually inspected narrative/closing scopes.
# No numeric publisher offset generates these identities.
MAPPINGS={335:'tha-ap337',336:'tha-ap338',337:'tha-ap339',338:'tha-ap340',339:'tha-ap341',340:'tha-ap342',341:'tha-ap343',342:'tha-ap344'}
DETAILS={
335:{'name':'Phussitakammiya','speaker':'phusitakampiyo','features':['Vipassi and the monks’ hermitage','flower/safflower-water sprinkling','five thousand drops and two allocations of2500','Phusita name and later fragrance'],
     'English_cues':['The Sambuddha named Vipassi','There were five thousand','my name is \\[always\\] “Phussita.”','Phussitakammiya'],
     'Pali_cues':['Vipassī nāma','Kusumodakamādāya','Phusitā pañcasahassā','phusito nāma homahaṃ'],
     'caveats':['Publisher Phussitakammiya versus VRI Phusitakampiya is expressly discussed in original notes2,19,20; retain both source identities.','Original note6 discusses safflower-water/sandalwood tension; note7 suspects repeated wording and note10 questions the karma arithmetic. These are attributed translator statements, not corrections.','VRI opening stanza has an intervening bodytext block9893. Preserve every original block; English physical entries do not define VRI segment boundaries.','Publisher combined local6–7/global2974–2975 remains one8-line entry.']},
336:{'name':'Pabhaṅkara','speaker':'pabhaṅkaro','features':['Padumuttara’s ruined stupa in beast-filled forest','forest worker clears grass sticks and vines','later possessions and repeated fruits of stupa cleaning'],
     'English_cues':['Blessed Padumuttara','I was then a forest-worker','Cleaning off the grasses','Pabhaṅkara'],
     'Pali_cues':['Padumuttarabhagavato','Vanakammiko tadā āsiṃ','sodhayitvāna cetiye','pabhaṅkaro thero'],
     'caveats':['Publisher local9/global2992 says thirty divine reigns; VRI61 contains Tisatāni (three hundred). Disclose the edition/translation difference without harmonizing either.','Publisher combined local4–5/global2987–2988 is one8-line entry. Original notes15–16 explain selected PTS/BJTS readings; preserve all22notes.']},
337:{'name':'Tiṇakuṭidāyaka','speaker':'tiṇakuṭidāyako','features':['servant in Bandhumati','asks employer for one day','grass hut given to the community','protection from animals and nonhuman beings'],
     'English_cues':['In the city, Bandumatī','I was one who worked for others','grass-hut','Tiṇakuṭidāyaka'],
     'Pali_cues':['Nagare bandhumatiyā','ahosiṃ parakammiko','akaṃ tiṇakuṭiṃ ahaṃ','Saṅghassatthāya kuṭikaṃ'],
     'caveats':['Original notes10–11 discuss obscure measures and transmission; note15 discusses the animal-list reading. Retain uncertainty and original vocabulary, with no inferred measurements.']},
338:{'name':'Uttareyyadāyaka','speaker':'uttareyyadāyako','features':['brahmin versed in three Vedas in Hamsavati','ritual water-bath excursion','upper cloak covers Padumuttara’s assembly','prophecy and cloth-canopy fruits'],
     'English_cues':['In the city, Haṃsavatī','a master of the three Vedas','an upper cloak','Uttareyyadāyaka'],
     'Pali_cues':['Nagare haṃsavatiyā','tiṇṇaṃ vedāna pāragū','uttarīyamadāsahaṃ','dussachadanaṃ'],
     'caveats':['Requires current corrected canonical340end10118 and its existing six-unit locator revision; the next poem’s opening must not leak into the root pin.','Original note13 marks uncertainty about the house and note25 identifies a BJTS reading. Preserve all26notes and uncertainty.']},
339:{'name':'Dhammasavaniya','speaker':'dhammasavaniyo','features':['matted-haired ascetic flying over Padumuttara','flight obstructed and descent to hear impermanence','later monk recites impermanence verse','attainment at age seven'],
     'English_cues':['A matted-haired ascetic','I traveled in the sky','Being \\[only\\] seven years old','Dhammasavaniya'],
     'Pali_cues':['jaṭilo uggatāpano','gacchāmi ambare','Aniccā vata saṅkhārā','Jātiyā sattavassohaṃ'],
     'caveats':['Requires corrected canonical341start10118 so first stanza111 is present; old bare-commit locators remain stale.','Original note18 explicitly selects a BJTS formulation, and note20 supplies other canonical references. These note citations do not create source links or alternate rights grants.']},
340:{'name':'Ukkhittapadumiya','speaker':'ukkhittapadumiyo','features':['Hamsavati florist collecting lotuses','throws flowers which rest on Padumuttara’s head','Satapatta mansion and one-lotus fruit','then separate chapter34summary'],
     'English_cues':['I was a florist','Plunging into a lotus lake','One Hundred Petals','Ukkhittapadumiya'],
     'Pali_cues':['ahosiṃ māliko tadā','Ogāhetvā padumasaraṃ','satapattanti vuccati','ukkhittapadumiyo thero'],
     'caveats':['Separate The Summary, its8-line roster/count144 and final chapter title from poem pagination/quotation evidence; summary owns zero notes.','Publisher chapter-footer Gandhathūpiya differs from VRI Gandhodakavaggo. The literal roster ends Ekapadumi while the full poem is Ukkhittapadumiya; retain original wording.','Publisher combined local2–3/global3061–3062 remains one8-line entry.']},
341:{'name':'Ekapadumiya','speaker':'ekapadumiyo','features':['chapter35opening','swan king at a natural lake','lotus carried with beak and tossed to Padumuttara','Buddha speaks thanks from the sky'],
     'English_cues':['Ekapadumiya Chapter, the Thirty-Fifth','I was a swan-king','gathered lotuses with my beak','Ekapadumiya'],
     'Pali_cues':['35. Ekapadumiyavaggo','Haṃsarājā tadā homi','Mukhatuṇḍena paggayha','Antalikkhe ṭhito satthā'],
     'caveats':['Separate note-free chapter heading as publisher paratext, not poem or a duplicate title; poemheading note1 remains poem-owned.','Requires corrected canonical343end10258 and existing six-unit locator pin.','Publisher combined local4–5/global3077–3078 remains one8-line entry.']},
342:{'name':'Tīṇuppalamāliya','speaker':'tīṇuppalamāliyo','features':['after Ekapadumiya in chapter35','monkey by Candabhaga','three uppala flowers to Vipassi','ninety-one aeons and second-poem closing'],
     'English_cues':['I was a monkey','to Vipassi, the Greatest Sage','In the ninety-one aeons','Tīṇuppalamāliya'],
     'Pali_cues':['Candabhāgānadītīre','ahosiṃ vānaro tadā','vipassissa mahesino','Ekanavutito kappe'],
     'caveats':['Repeated title/narrative is not unique. This occurrence is canonical344 in chapter35, supported specifically by Vipassi and91aeons. The other occurrence at current375 uses Phussa and92aeons; no mapping to375 is proposed.','Requires corrected canonical344start10258 including first stanza11; original note6 explicitly flags inherited human-body wording despite monkey identity. Do not repair that wording.','Original note2 BJTS Tiuppalamāliya spelling and note5 posture interpretation remain unchanged.']},
}
catalograw=(DATA/'apadana.json').read_bytes();catalog=json.loads(catalograw);assert len(catalog['links'])==343
records=[];physical_total=label_total=notes_total=body_paragraph_total=0
for source in acq['files']:
    n=source['publisher_poem'];uid=MAPPINGS[n];unit=units[uid];detail=DETAILS[n]
    raw=Path(source['local_path']).read_bytes();assert H(raw)==source['sha256'] and B(raw)==source['expected_git_blob']
    text=raw.decode();assert '\r' not in text
    front=re.match(r'^---\n(.*?)\n---\n',text,re.S)
    assert front and f'order: {n}' in front[1] and 'category: chapter-3' in front[1]
    title=re.search(r'^title: (.+)$',front[1],re.M)[1];assert title==detail['name']
    rest=text[front.end():].strip();split=re.search(r'^\[\^\d+\]:',rest,re.M);assert split
    poem=rest[:split.start()].strip();definitions=rest[split.start():]
    notes=[(int(m[1]),m[2].strip()) for m in re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',definitions,re.M|re.S)]
    assert [k for k,v in notes]==list(range(1,len(notes)+1))
    assert set(map(int,re.findall(r'\[\^(\d+)\]',poem)))==set(k for k,v in notes)
    allnotes='\n'.join(v for k,v in notes)
    prefix,summary='',None
    if n==340:
        poem,summarytail=poem.split('\n\nThe Summary:\n\n');summary='The Summary:\n\n'+summarytail
        assert len(summary.split('\n\n'))==3 and len(summary.split('\n\n')[1].splitlines())==8
        assert not re.search(r'\[\^\d+\]',summary)
    if n==341:
        prefix,poem=poem.split('\n\n### ',1);poem='### '+poem
        assert prefix=='## Ekapadumiya Chapter, the Thirty-Fifth' and not re.search(r'\[\^\d+\]',prefix)
    paragraphs=poem.split('\n\n');heading=paragraphs[0]
    h=re.match(r'^### \\\[(\d+)\. \{(\d+)\.\}\[\^1\] (.+)\\\]$',heading);assert h and int(h[2])==n
    assert paragraphs[-2].startswith('Thus indeed Venerable '+detail['name']) and paragraphs[-1].startswith('The legend of '+detail['name'])
    layout=[];global_labels=[];local_labels=[]
    for para in paragraphs[1:-2]:
        match=re.search(r'\((\d+(?:-\d+)?)\) \\\[(\d+(?:-\d+)?)\\\](?:\[\^\d+\])?$',para);assert match
        local,pub=match.groups();expand=lambda s:list(range(int(s.split('-')[0]),int(s.split('-')[-1])+1))
        local_labels+=expand(local);global_labels+=expand(pub)
        layout.append({'local_label':local,'publisher_label':pub,'lines':len(para.splitlines()),'raw_paragraph_sha256':H(para),'raw_note_calls':list(map(int,re.findall(r'\[\^(\d+)\]',para)))})
    assert local_labels==list(range(1,len(local_labels)+1)) and global_labels==list(range(global_labels[0],global_labels[-1]+1))
    rows=blocks[unit['start']:unit['end']];subheads=[(unit['start']+i,r) for i,r in enumerate(rows) if r[0]=='subhead']
    assert len(subheads)==1 and subheads[0][1][2].endswith(unit['title'])
    speakers=[(unit['start']+i,r) for i,r in enumerate(rows) if r[0]=='bodytext' and r[2]=='Itthaṃ sudaṃ āyasmā '+detail['speaker']+' thero imā gāthāyo abhāsitthāti.']
    assert len(speakers)==1;speaker=speakers[0][0];assert blocks[speaker+1][0]=='centre' and 'ttherassāpadānaṃ' in blocks[speaker+1][2]
    for cue in detail['English_cues']:assert cue in poem or cue in prefix,(n,cue)
    for cue in detail['Pali_cues']:assert any(cue in row[2] for row in rows)
    assert not catalog['links'].get(uid)
    coreend=speaker+2
    namespace_dependency=unit.get('index_revision')
    parserwork=['All eight files need an exact finite reviewed mixed-number heading identity: the existing normal heading guard expects the filename poem number first, but the original heading prints PTS'+h[1]+' before BJTS'+h[2]+'. No arithmetic offset rule should be introduced.']
    if n==340:parserwork.append('Add only canonical342 to the finite chapter-summary ownership scope after independent original-derived metadata review; preserve zero summary notes and chapter spelling/count.')
    if n==341:parserwork.append('Add only canonical343 to the finite note-free leading-chapter-paratext scope. Do not generalize or reuse the special note-owning333preface.')
    records.append({'publisher_poem':n,'publisher_title':title,'printed_PTS_poem':int(h[1]),'printed_BJTS_poem':int(h[2]),'candidate_canonical_uid':uid,
       'status':'STRONG_SOURCE_SCOUT_CANDIDATE_PENDING_INDEPENDENT_REVIEW_NORMALIZATION_AND_FINITE_PARSER_WORK',
       'raw_source':source,'canonical_full_object':unit,'canonical_object_sha256':J(unit),'current_root_scope_sha256':J({'id':uid,'book':36,'start':unit['start'],'end':unit['end'],'blocks':rows}),
       'original_VRI_evidence':{'heading_block':subheads[0][0],'heading_sha256':H(subheads[0][1][2]),'source_poem_core_half_open':[subheads[0][0],coreend],'core_tuple_sha256':J(blocks[subheads[0][0]:coreend]),'named_speaker_block':speaker,'named_speaker_sha256':H(blocks[speaker][2]),'closing_colophon_block':speaker+1,'closing_colophon_sha256':H(blocks[speaker+1][2]),'notes_count':sum(len(r[3]) for r in rows),'edition_page_markers':[{'block':i,'pages':r[4]}for i,r in enumerate(rows,unit['start'])if r[4]]},
       'individually_compared_narrative_features':detail['features'],'edition_caveats':detail['caveats'],
       'publisher_structure':{'poem_body_paragraphs':len(paragraphs),'physical_entries':len(layout),'expanded_local_labels':len(local_labels),'global_label_range':[global_labels[0],global_labels[-1]],'all_note_numbers':[k for k,v in notes],'note_definitions':[{'number':k,'raw_definition_sha256':H(v)}for k,v in notes],'stanza_layout_raw':layout,'full_poem_raw_sha256':H(poem),'summary':{'raw_sha256':H(summary),'paragraphs':3,'lines':8,'note_numbers':[]}if summary else None,'leading_chapter_paratext':{'raw_sha256':H(prefix),'note_numbers':[]}if prefix else None},
       'parser_static_assessment':{'currently_registered':False,'current_parser_would_accept_new_sources':False,'bounded_representability':'Existing stanza_layout, Markdown notes/diacritic-pair presentation and separate apparatus shapes can represent these originals, subject to exact new profile pins and the listed finite extensions; no parser/application test was executed.','required_finite_work':parserwork,'current_revision_dependency':namespace_dependency},
       'source_match_is_not_line_complete_VRI_translation':True,'activation_or_rights_hold_clearance':False})
    physical_total+=len(layout);label_total+=len(global_labels);notes_total+=len(notes);body_paragraph_total+=len(paragraphs)
assert (physical_total,label_total,notes_total,body_paragraph_total)==(120,124,133,144)
# Explicit disambiguation against the known repeated-title occurrence, using
# the original book wording, not its currently incomplete metadata span.
assert 'vipassissa mahesino' in blocks[10269][2] and 'Ekanavutito kappe' in blocks[10281][2]
assert 'phussassāhaṃ mahesino' in blocks[10797][2] and 'Dvenavute ito kappe' in blocks[10809][2]
parserpath=PROJECT/'src/apadana-thera.mjs';presentation=PROJECT/'src/apadana-presentation.mjs'
report={'schema':'bounded-original-first-publisher335-342-scout-v1','status':'EIGHT_STRONG_SOURCE_CANDIDATES_IMPLEMENTATION_AND_ACTIVATION_HELD',
 'scope':{'publisher_poems':list(MAPPINGS),'explicit_candidate_mappings':MAPPINGS,'source_files':8,'physical_entries':physical_total,'global_labels':label_total,'poem_notes':notes_total,'poem_body_paragraphs':body_paragraph_total,'summary_poems':[340],'note_free_chapter_heading_poems':[341],'new_activation_count':0},
 'source_pins':{'publisher_repository':acq['repository'],'publisher_revision':acq['revision'],'acquisition_sha256':H((D/'ACQUISITION.json').read_bytes()),'VRI_commit':canon['source']['commit'],'original_XML_sha256':H(xml),'original_XML_git_blob_sha1':B(xml),'all14645_original_VRI_tuples_equal_current_book':True,'current_canonical_logical_sha256':H(canonraw),'current343_catalogue_sha256':H(catalograw),'current343_choices':343},
 'rights':{'status':'SPECIFIC_TRANSLATION_GRANT_EVIDENCE_PRESENT_CONDITIONS_UNCHANGED_NOT_NEW_LEGAL_OR_ACTIVATION_APPROVAL','specific_text_license':'CC BY-NC-SA 4.0','translator':'Jonathan S. Walters','publisher':'Jonathan S. Walters and Whitman College','original_rights_artifacts':rights,'controlling_evidence':['about.md explicitly covers translation text and code and links4.0NC-SA','footer and epub rights repeatNC-SA4.0','full LICENSE.md original retained'],'generic_site_CC_BY_does_not_broaden_grant':True,'required_retention':['translator/publisher attribution','original source and pinned revision','full copyright/licence/disclaimer notices','disclosed extraction/presentation changes','noncommercial/share-alike conditions','no endorsement'],'no_audio_media_or_commercial_permission_added':True,'live_only_English_body_and_notes_policy_unchanged':True},
 'records':records,
 'coherent_recommendation':{'largest_evidence_backed_shortlist':list(MAPPINGS),'reason':'Six remaining poems close chapter34; first two poems begin chapter35. Every candidate has source-local heading, independent narrative features and named closing. The mapping list is explicit, not generated from numbering.','boundary_dependency':'Publisher338/339/341/342 depend on the already reviewed current six-boundary repair. Pin current0f9canon and preserve its existing namespace; never calculate root pins from the earlier C1 cuts.','duplicate_title_disambiguation':{'publisher_poem':342,'candidate':'tha-ap344','positive_VRI_blocks':[10269,10281],'excluded_other_occurrence':'tha-ap375','excluded_VRI_blocks':[10797,10809],'distinction':'Publisher342 names Vipassi and91aeons, matching344; the other original occurrence names Phussa and92aeons. Chapter35placement and second-poem colophon independently corroborate.'}},
 'holds':['This scout is not independent normalization/profile/runtime approval. No profile or English link may be activated from this report alone.','All eight need separately reviewed exact mixed PTS/BJTS heading guards and positive/negative original-source representation evidence. Current parser rejects unknown profiles and the mixed-number headings; this is an observed static guard, not an executed parser failure.','Publisher340 requires exact separate chapter-summary ownership and publisher341 a note-free leading-chapter-heading scope. Keep all133poem notes; neither apparatus owns notes.','Retain combined eight-line entries335local6–7,336local4–5,340local2–3,341local4–5; do not split or infer new paragraph boundaries.','Publisher336 thirty/three-hundred divergence, publisher335 naming/water/karma tensions, and every original uncertain reading must remain attributed and disclosed. Whole means complete publisher-edition poem, never line-complete VRI.','No publisher343 or wider catalogue source was acquired. The final file342 has its own named closing, but no new mapping beyond342 is assessed.','Preserve all343earlier full objects, source holds, existing locator namespaces and local-only private data. No canonical repair, new namespace, private migration or rights hold is cleared.'],
 'parser_static_source_bindings':{'src/apadana-thera.mjs':H(parserpath.read_bytes()),'src/apadana-presentation.mjs':H(presentation.read_bytes()),'read_ranges':['apadana-thera56–84 known-profile/raw guards and presentation','apadana-thera251–305 finite summary/preface/heading/layout guards','apadana-presentation plainMarkdown']},
 'work_performed':{'official_raw_requests':7,'preserved335reused':True,'local_git_reads_with_lazy_network_disabled':True,'project_branch_or_tracked_files_changed':False,'app_imports_tests_build_browser_runtime_or_private_data_access':False,'commits_push_CI_or_outreach':False,'broad_catalogue_search':False},'activation_coverage_gain':0}
with (D/'SCOUT_REPORT.json').open('x',encoding='utf8') as out:out.write(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
seal={'schema':'bounded-eight-poem-source-scout-seal-v1','status':report['status'],'files':{str(p.relative_to(D)):{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())}for p in D.rglob('*')if p.is_file()},'no_activation_or_runtime_approval':True}
with (D/'SCOUT_SEAL.json').open('x',encoding='utf8') as out:out.write(json.dumps(seal,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'report_sha256':H((D/'SCOUT_REPORT.json').read_bytes()),'seal_sha256':H((D/'SCOUT_SEAL.json').read_bytes()),'totals':report['scope']}))
