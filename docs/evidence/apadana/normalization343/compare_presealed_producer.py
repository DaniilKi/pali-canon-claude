"""Compare presealed independent metadata to producer metadata; no app imports.
Own original-first normalizer is reused solely for supplemental raw/quote proofs.
"""
import ast,collections,hashlib,html,json,re
from pathlib import Path
D=Path(__file__).parent;P=D.parent/'normalization-source';ORIGINAL=Path('/tmp/pali-next334-source-review-nov26/originals')
H=lambda x:hashlib.sha256(x if isinstance(x,bytes) else x.encode('utf8')).hexdigest();C=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'));U=lambda x:len(x.encode('utf-16-le'))//2
assert H((D/'PRE_COMPARISON_SEAL.json').read_bytes())=='3b1c53934f2b19b8d61d8cb29dbfa458c5da436c8c0cf300139473b7c10357df'
B=json.loads((D/'INDEPENDENT_ORIGINAL_FIRST_PROOF.json').read_bytes());assert H((D/'INDEPENDENT_ORIGINAL_FIRST_PROOF.json').read_bytes())=='c27c6aea04e3be33244c4e231ba4aefe5509d2b32b4fada1fd268b1c6a8afc51'
manifest_raw=(P/'PRESEALED_NORMALIZATION_PROPOSAL.json').read_bytes();assert H(manifest_raw)=='5096b5d7ced86b6805b91cb7592d47eb256dcf3dfc8376cebf3b5ad02ae8811e';manifest=json.loads(manifest_raw);F=P/'original-first-v1'
for name,pin in manifest['files'].items():assert H((F/name).read_bytes())==pin
profiles=json.loads((F/'EXPECTED_PROFILES.json').read_bytes());links=json.loads((F/'EXPECTED_LINKS.json').read_bytes());gold=json.loads((F/'GOLDENS.json').read_bytes());scopes=json.loads((F/'SOURCE_SCOPES.json').read_bytes());G={r['id']:r for r in gold['poems']};S={r['canonical_candidate']:r for r in scopes['poems']}
assert list(profiles)==list(links)==list(B['rows'])==['tha-ap333','tha-ap334','tha-ap335','tha-ap336']
# Only the reviewer's own already-presealed normalizer, never producer/SUT code.
tree=ast.parse((D/'derive_independent_originals.py').read_text());own_function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='normalize');namespace={'re':re,'html':html};exec(compile(ast.Module(body=[own_function],type_ignores=[]),'<own-presealed-normalizer>','exec'),namespace);normalize=namespace['normalize']
diffs=[];checks=collections.Counter();rows=[]
def eq(a,b,label):
 checks['field_comparisons']+=1
 if a!=b:diffs.append({'field':label,'independent':a,'producer':b})
for uid,b in B['rows'].items():
 p=profiles[uid];g=G[uid];scope=S[uid];n=b['publisher_poem'];path=f'src/_poems/chapter-3/poem-{n}.md';raw=(ORIGINAL/path).read_text(encoding='utf8');rest=raw.split('---\n',2)[2].strip();at=re.search(r'^\[\^\d+\]:',rest,re.M);raw_poem=rest[:at.start()].strip();defs=rest[at.start():];heading=re.search(r'^### ',raw_poem,re.M);raw_preface=raw_poem[:heading.start()].strip();bodyraw=raw_poem[heading.start():];rawparas=bodyraw.split('\n\n');paras=[normalize(x) for x in rawparas];body='\n\n'.join(paras);preface=normalize(raw_preface)
 eq(H(body),b['body_sha256'],uid+'.repeat_body')
 note_matches=list(re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',defs,re.M|re.S));notes={int(m[1]):{'raw':m[2].strip(),'text':normalize(m[2]),'line':raw[:raw.index('[^'+m[1]+']:')].count('\n')+1} for m in note_matches}
 urls={'path':f'/text/chapter-3/poem-{n}/','url':f'https://apadanatranslation.com/text/chapter-3/poem-{n}/','raw_url':f'https://raw.githubusercontent.com/apadana-translation/apadana-site/{B["publisher_revision"]}/{path}'}
 effective_paratext=H(preface)
 expected={'id':uid,'publisher_chapter':'chapter-3','poem':n,'title':b['title'],'source':'apadana','translator':'Jonathan S. Walters','license':'CC BY-NC-SA 4.0','translation_revision':B['publisher_revision'],'raw_sha256':b['raw_sha256'],'body_sha256':b['body_sha256'],'notes_sha256':b['notes_sha256'],'paratext_sha256':effective_paratext,'root_sha256':b['root']['root_sha256'],'note_count':b['note_count'],'note_numbers':b['poem_note_numbers'],'stanza_layout':b['stanza_layout'],'verses':[b['global_printed_labels'][0],b['global_printed_labels'][-1]],'root_verses':b['root']['root_verses'],'index_revision':'apadana-thera333-336-v1','publisher_verse_labels':[r['publisher_label'] for r in b['stanza_layout']],'exact_ref_url':urls['raw_url'],'reference':f'Therā Apadāna publisher poem {n}; complete publisher-edition poem; original numbering retained',**urls}
 if b['preface']:expected['publisher_preface']=b['preface']['descriptor']
 else:expected['publisher_heading_sha256']=b['heading_sha256']
 eq(set(p),set(expected)|{'mapping_notes'},uid+'.profile_exact_fields')
 for key,value in expected.items():eq(value,p.get(key),uid+'.profile.'+key)
 eq(links[uid],{**p,'english':b['title'],'match':'individually-reviewed-whole-poem'},uid+'.link_exact_profile_extension')
 eq(g['body_sha256'],b['body_sha256'],uid+'.golden.body');eq(g['body_characters_utf16'],b['body_characters_utf16'],uid+'.golden.utf16');eq(g['notes_sha256'],b['notes_sha256'],uid+'.golden.notes');eq(g['note_numbers'],b['poem_note_numbers'],uid+'.golden.note_numbers');eq(g['raw_sha256'],b['raw_sha256'],uid+'.golden.raw');eq(g['raw_bytes'],b['raw_bytes'],uid+'.golden.raw_bytes');eq(g['git_blob_sha1'],b['git_blob_sha1'],uid+'.golden.blob');eq(g['title'],b['title'],uid+'.golden.title');eq(g['publisher_poem'],n,uid+'.golden.poem');eq(g['source_path'],path,uid+'.golden.path');eq(g['stanza_layout'],b['stanza_layout'],uid+'.golden.layout');eq(g['physical_stanza_entries'],b['physical_entries'],uid+'.golden.entries');eq(g['printed_global_labels'],b['global_printed_labels'],uid+'.golden.global_labels');eq(g['printed_local_labels'],b['local_printed_labels'],uid+'.golden.local_labels');eq(g['paratext_sha256'],effective_paratext,uid+'.golden.paratext')
 eq(len(g['body_paragraphs']),len(paras),uid+'.paragraph_count')
 for i,(record,own) in enumerate(zip(g['body_paragraphs'],b['paragraph_records'])):
  for key in ('paragraph_index0','sha256','characters_utf16','lines'):eq(record[key],own[key],uid+f'.paragraph[{i}].'+key)
  eq(record['raw_sha256'],H(rawparas[i]),uid+f'.paragraph[{i}].raw')
 heading_proof=g['heading'];eq(heading_proof['body_sha256'],b['heading_sha256'],uid+'.heading.hash');eq(heading_proof['raw_sha256'],H(rawparas[0]),uid+'.heading.raw');eq(heading_proof['characters_utf16'],U(paras[0]),uid+'.heading.utf16');eq(heading_proof['note_numbers'],b['paragraph_records'][0]['note_numbers'],uid+'.heading.notes');eq(heading_proof['literal_asterisk_preserved'],n!=331,uid+'.heading.asterisk')
 owners=[]
 for number,note in notes.items():
  if number in b['poem_note_numbers']:
   indices=[i for i,t in enumerate(paras) if '[Note '+str(number)+']' in t];assert len(indices)==1;i=indices[0];owner={'kind':'poem_title' if i==0 else 'poem','paragraph_index':i,'physical_entry':None if i==0 else i}
  else:owner={'kind':'publisher_preface','parent_id':uid,'paragraph_index':None,'physical_entry':None}
  owners.append({'number':number,'definition_line':note['line'],'owner':owner})
  record=next(x for x in g['all_original_notes'] if x['number']==number)
  for key,value in {'sha256':H(note['text']),'characters_utf16':U(note['text']),'lines':len(note['text'].splitlines()),'raw_sha256':H(note['raw']),'owner':owner}.items():eq(record[key],value,uid+f'.note[{number}].'+key)
 eq(scope['note_owners'],owners,uid+'.all_note_owners');eq(g['notes'],[x for x in g['all_original_notes'] if x['number'] in b['poem_note_numbers']],uid+'.poem_notes_subset');eq(g['original_note_count'],len(notes),uid+'.original_note_count')
 for key,value in {'body_sha256':H(preface),'characters_utf16':U(preface),'lines':len(preface.splitlines()) if preface else 0,'raw_sha256':H(raw_preface),'note_numbers':[1] if b['preface'] else [],'notes_sha256':b['preface']['descriptor']['notes_sha256'] if b['preface'] else H('[]')}.items():eq(g['publisher_paratext'][key],value,uid+'.paratext.'+key)
 eq(g['publisher_preface'],b['preface']['descriptor'] if b['preface'] else None,uid+'.preface_descriptor')
 eq(g['publisher_paratext']['note_proofs'],[x for x in g['all_original_notes'] if x['number'] not in b['poem_note_numbers']],uid+'.preface_note_proofs')
 if b['preface']:eq(set(g['publisher_preface']),{'kind','parent_id','label','body_sha256','notes_sha256','note_numbers'},uid+'.preface_six_keys')
 qtexts=[];suffixtexts=[]
 for i,(q,own) in enumerate(zip(g['quotation_proofs'],b['stanza_quotation_scope'])):
  paragraph=paras[i+1];suffix=b['stanza_layout'][i]['suffix'];assert paragraph.endswith(suffix);suffixonly=paragraph[:-len(suffix)].rstrip();qtext=re.sub(r'\[Note \d+\]','',suffixonly).strip();qtexts.append(qtext);suffixtexts.append(suffixonly)
  expect={'physical_entry':i+1,'body_paragraph':i+1,'sha256':own['text_sha256'],'characters_utf16':own['characters_utf16'],'lines':own['verse_lines'],'suffix_only_sha256':H(suffixonly),'suffix_only_characters_utf16':U(suffixonly),'removed_suffix_sha256':H(suffix),'owned_note_markers_removed':True,'all_wording_punctuation_linebreaks_preserved':True};eq(q,expect,uid+f'.quote[{i}]')
 eq(len(g['quotation_proofs']),len(b['stanza_quotation_scope']),uid+'.quote_count');eq(g['quotation_text_sha256'],H('\n\n'.join(qtexts)),uid+'.quote_joined');eq(g['suffix_only_quotation_text_sha256'],H('\n\n'.join(suffixtexts)),uid+'.quote_suffix_joined')
 expected_pages=[{**page,'next_offset':page['offset']+page['characters_utf16'] if page['offset']+page['characters_utf16']<b['body_characters_utf16'] else None} for page in b['pages500']];eq(g['pages500'],expected_pages,uid+'.all500pages')
 for key,value in {'id':uid,'book':36,'start':b['root']['start'],'end':b['root']['end'],'root_sha256':b['root']['root_sha256'],'index_revision':'apadana-thera333-336-v1','vri_numbered_labels':list(range(b['root']['root_verses'][0],b['root']['root_verses'][1]+1))}.items():eq(g['root'][key],value,uid+'.root.'+key)
 source_report=json.loads(Path('/tmp/pali-next334-source-review-nov26/independent-review/ORIGINAL_SOURCE_REVIEW.json').read_bytes());canonical=next(x for x in source_report['poems'] if x['publisher_poem']==n)['canonical_identity']['record']
 eq(g['root']['title'],canonical['title'],uid+'.root.title');eq(g['root']['vri'],canonical['vri'],uid+'.root.vri')
 eq(scope['canonical_candidate'],uid,uid+'.scope.owner');eq(scope['publisher'],n,uid+'.scope.publisher');eq(scope['publisher_title'],b['title'],uid+'.scope.title');eq(scope['root_span'],[b['root']['start'],b['root']['end']],uid+'.scope.root_span');eq(scope['root_sha256'],b['root']['root_sha256'],uid+'.scope.root_sha');eq(scope['poem_note_numbers'],b['poem_note_numbers'],uid+'.scope.notes');eq(scope['preface_note_numbers'],[1] if b['preface'] else [],uid+'.scope.preface_notes')
 for key,value in {'path':path,'url':urls['raw_url'],'bytes':b['raw_bytes'],'sha256':b['raw_sha256'],'git_blob_sha1':b['git_blob_sha1']}.items():eq(scope['raw_artifact'][key],value,uid+'.scope.raw.'+key)
 eq(scope['body_paragraphs'],b['body_paragraphs'],uid+'.scope.paragraphs');eq(scope['physical_entries'],b['physical_entries'],uid+'.scope.entries');eq(scope['printed_global_labels'],b['global_printed_labels'],uid+'.scope.globals');eq(scope['printed_local_labels'],b['local_printed_labels'],uid+'.scope.locals')
 for key in ('chapter_summary','collection_summary','publisher_divisions'):eq(g[key],[] if key=='publisher_divisions' else None,uid+'.no_invented_'+key)
 eq(p['mapping_notes'],g['mapping_notes'],uid+'.mapping_notes_identical');eq(g['mapping_notes'][2:],g['edition_limits'],uid+'.edition_notes_owned')
 assert 'not a line-complete translation' in p['mapping_notes'][0]
 rows.append({'id':uid,'publisher':n,'decision':'GO_EXACT_NORMALIZED_PUBLISHER_SCOPE' if not any(x['field'].startswith(uid+'.') for x in diffs) else 'HOLD_DIFFERENCES','body_sha256':b['body_sha256'],'notes_sha256':b['notes_sha256'],'effective_paratext_sha256':effective_paratext,'root_sha256':b['root']['root_sha256'],'body_characters_utf16':b['body_characters_utf16'],'poem_notes':b['poem_note_numbers'],'preface_notes':[1] if b['preface'] else [],'whole_profile_object_sha256':H(C(p)),'whole_link_object_sha256':H(C(links[uid]))})
for top in (gold,scopes):
 eq(top['publisher_revision'],B['publisher_revision'],'top.publisher_revision');eq(top.get('vri_revision'),B['vri_commit'],'top.vri_revision');eq(top['original_xml_sha256'],B['xml_sha256'],'top.XML_sha');eq(top['rights'],B['artifacts'],'top.six_rights')
ops=collections.Counter()
for n in range(331,335):
 raw=(ORIGINAL/f'src/_poems/chapter-3/poem-{n}.md').read_text(encoding='utf8');text=raw.split('---\n',2)[2].strip();at=re.search(r'^\[\^\d+\]:',text,re.M);poem=text[:at.start()].strip();definitions=text[at.start():];notebodies=[m[2].strip() for m in re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',definitions,re.M|re.S)];content='\n\n'.join([poem,*notebodies])
 ops['source_note_marker']+=len(re.findall(r'\[\^\d+\]',poem));ops['heading_prefix']+=len(re.findall(r'^#{1,3}[ \t]+',poem,re.M));ops['markdown_escape']+=len(re.findall(r'\\([\\`*{}\[\]()#+.!_>\-])',content));ops['abbreviation_wrapper']+=len(re.findall(r'<abbr title="[^"<>]*">([^<>]*)</abbr>',content));masked=re.sub(r'\\[\\`*{}\[\]()#+.!_>\-]','ESCAPED',content);ops['balanced_emphasis_pair']+=len(re.findall(r'\*([^*\n]+)\*',masked));ops['literal_unpaired_asterisk_retained']+=int(n!=331)
eq(dict(ops),gold['presentation_operations'],'top.presentation_operation_counts')
eq(gold['all_original_xml_tuples'],14645,'top.XML_count');eq(gold['canonical_logical_sha256'],'46698d63192a1be9dd943a877baed430b61802bb54a7046c18b7c5c518e06eb8','top.canon_hash')
eq(scopes['source_book_sha256'],B['all14645_xml_tuple_sha256'],'top.book_sha');eq(scopes['prior_original_review_sha256'],B['source_review_sha256'],'top.source_review')
assert gold['candidate_runtime_or_profile_outputs_used_as_oracle'] is False and scopes['candidate_runtime_or_profile_outputs_used_as_oracle'] is False
result={'schema':'independent-four-normalization-cross-comparison-v1','status':'GO_ALL_FOUR_NORMALIZED_METADATA_ONLY' if not diffs else 'HOLD_EXACT_DIFFERENCES','independent_preseal_sha256':H((D/'PRE_COMPARISON_SEAL.json').read_bytes()),'independent_proof_sha256':H((D/'INDEPENDENT_ORIGINAL_FIRST_PROOF.json').read_bytes()),'producer_preseal_sha256':H(manifest_raw),'producer_files':manifest['files'],'field_comparisons':checks['field_comparisons'],'differences':diffs,'rows':rows,'schema_adapter':{'reason':'Original-first reviewer assumed separate preface wording would leave publisher_paratext empty. Parent clarified approved representation: publisher_paratext stores heading ONCE, while six-key publisher_preface contains only metadata and notes, never duplicate wording.','changed_expectation':'Only tha-ap333 effective publisher_paratext_sha256 uses the independently presealed preface body hash12568de…; no source wording/body/notes/ownership/quote or root value was changed. Original preseal remains immutable.','empty_runtime_publisher_paratext_not_approved':True,'empty_optional_divisions_schema':'Empty list is the correct no-division representation; the first comparator expected null. Correcting that reviewer-side type assumption changes no producer source or metadata.','no_text_key_in_preface_descriptor':True},'no_app_parser_import_runtime_test_build_git_or_network':True,'English_bodies_or_notes_written':False,'runtime_activation_release_approval':False}
(D/'PRODUCER_CROSS_COMPARISON.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':result['status'],'field_comparisons':checks['field_comparisons'],'differences':diffs,'review_sha256':H((D/'PRODUCER_CROSS_COMPARISON.json').read_bytes())}))
