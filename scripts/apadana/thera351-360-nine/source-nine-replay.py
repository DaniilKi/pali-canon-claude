#!/usr/bin/env python3
"""Portable source-only351–360 segmentation and finite presentation proposal.

Stdlib only; no application/parser imports, tests, builds, Git, CI or network.
Keep all generated fixtures outside any repository: they contain English text.
Existing source/rights/alignment review is not approval of these new hashes.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

CONTRACT_SHA='1fc76e48616de1c8948410151f167d59eb97d31ebe8d4f7c70e80598e0d6ba44'
def sha(x):return hashlib.sha256(x if isinstance(x,bytes) else x.encode()).hexdigest()
def compact(x):return json.dumps(x,ensure_ascii=False,separators=(',',':'))
def jsha(x):return sha(compact(x))
def u16(x):return len(x.encode('utf-16-le'))//2
def blob(x):return hashlib.sha1(b'blob '+str(len(x)).encode()+b'\0'+x).hexdigest()
def require(value,label):
    if not value:raise ValueError(label)
def descriptor(path):
    raw=path.read_bytes();return {'file':path.name,'bytes':len(raw),'sha256':sha(raw)}
def write_json(path,value):
    with path.open('x') as f:f.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    return descriptor(path)
def pinned_file(path,pin):
    require(path.is_file() and not path.is_symlink(),'Input must be a physical file: '+str(path))
    b=path.read_bytes()
    require((len(b),sha(b),blob(b))==(pin['bytes'],pin['sha256'],pin['git_blob_sha1']),'Pinned original bytes differ: '+str(path))
    return b

PAIR=re.compile(r'\[([^\[\]]+)\]\{\.diacritics data-state=on\}\[([^\[\]]+)\]\{\.no-diacritics data-state=off\}')
ABBR=re.compile(r'<abbr title="([^"]+)">([^<>]+)</abbr>')
ESCAPE=re.compile(r'\\([\\`*{}\[\]()#+\-.!_>])')
NOTE=re.compile(r'\[\^(\d+)\]')

def presentation(raw,owner,expected_pairs):
    """Explicit formatting conversions only; keep each stage in a hash ledger."""
    edits=[];counts=Counter();value=raw
    def replace_stage(name,pattern,replacer):
        nonlocal value
        before=value;changes=[]
        def replace(match):
            chosen=replacer(match)
            changes.append({'stage_input_start0':match.start(),'stage_input_end_exclusive':match.end(),
                            'matched_sha256':sha(match[0]),'replacement_sha256':sha(chosen)})
            return chosen
        value=pattern.sub(replace,value)
        if changes:
            edits.append({'owner':owner,'operation':name,'stage_input_sha256':sha(before),'stage_output_sha256':sha(value),'changes':changes})
            counts[name]+=len(changes)
    pairs=[]
    for i,m in enumerate(PAIR.finditer(raw),1):
        require((m[1],m[2]) in [('c','ch'),('cc','chch')],'Unreviewed paired display spelling')
        pairs.append({'syntax':'Pandoc','owner':owner,'occurrence1_in_owner':i,'raw_start0':m.start(),
                      'raw_end_exclusive':m.end(),'raw_sha256':sha(m[0]),'state_on':m[1],'state_off':m[2]})
    require(pairs==expected_pairs,'Source display ownership/range mismatch: '+owner)
    replace_stage('finite_pandoc_display_select_state_on',PAIR,lambda m:m[1])
    def abbreviation(m):
        require((m[1],m[2]) in [('Buddha Jayanthi Tripitaka Series','BJTS'),('Pali Text Society','PTS')],'Unreviewed abbreviation wrapper')
        return m[2]
    replace_stage('finite_PTS_BJTS_abbreviation_wrapper',ABBR,abbreviation)
    require(not re.search(r'<[^>]+>|\{\.(?:no-)?diacritics\b|&(?:#|[A-Za-z])[^\s;]*;',value),'Unreviewed HTML/entity/control')
    replace_stage('original_note_call_to_visible_same_number',NOTE,lambda m:'[Note '+m[1]+']')
    replace_stage('finite_Markdown_punctuation_escape',ESCAPE,lambda m:m[1])
    replace_stage('heading_prefix_only',re.compile(r'^#{1,3}\s+'),lambda m:'')
    replace_stage('balanced_same_line_emphasis_wrapper',re.compile(r'\*([^*\n]+)\*'),lambda m:m[1])
    require('*' not in value,'Unreviewed unbalanced or literal star')
    replace_stage('Markdown_hard_break_trailing_spaces_only',re.compile(r'[ \t]+$',re.M),lambda m:'')
    # Source inputs are already segmented without boundary blank lines. A new
    # generic strip, entity decoder or Unicode normalization is not permitted.
    require(value==value.strip('\n') and '\r' not in value,'Unexpected presentation boundary newline')
    require(all(ord(c)<=65535 for c in value),'New non-BMP slicing requires review')
    require([int(n) for n in re.findall(r'\[Note (\d+)\]',value)]==[int(n) for n in NOTE.findall(raw)],'Original note sequence changed')
    return value,edits,counts,pairs

def slice_pin(text,start,end):
    return {'source_characters_half_open':[start,end],
            'source_UTF8_bytes_half_open':[len(text[:start].encode()),len(text[:end].encode())],
            'raw_sha256':sha(text[start:end]),'raw_bytes':len(text[start:end].encode())}

def derive(source,raw_bytes):
    pub=source['publisher'];uid=source['source_alignment_candidate']['canonical_candidate']
    original=raw_bytes.decode('utf-8')
    require(not original.startswith('\ufeff'),'Unreviewed UTF8 BOM')
    text=original.replace('\r\n','\n').replace('\r','\n')
    newline_edits={'CRLF_to_LF':original.count('\r\n'),'lone_CR_to_LF':original.count('\r')-original.count('\r\n')}
    front=re.match(r'^---\ntitle: ([^\n]+)\norder: (\d+)\ncategory: chapter-3\n---\n',text)
    require(front is not None and front[1]==source['title'] and int(front[2])==pub,'Frontmatter mismatch')
    definitions=list(re.finditer(r'^\[\^(\d+)\]: ',text,re.M))
    require(len(definitions)==len(source['raw_note_definitions']),'Original note definition count differs')
    main_lo=front.end()
    while main_lo<definitions[0].start() and text[main_lo]=='\n':main_lo+=1
    main_hi=definitions[0].start()
    while main_hi>main_lo and text[main_hi-1]=='\n':main_hi-=1
    main=text[main_lo:main_hi]
    raw_paragraphs=re.split(r'\n[ \t]*\n',main)
    sections=[];body_paragraphs=[];summary_paragraphs=[];paratext_paragraphs=[]
    cursor=main_lo;in_summary=False;physical=0
    for paragraph in raw_paragraphs:
        start=text.index(paragraph,cursor,main_hi);end=start+len(paragraph);cursor=end
        if paragraph.startswith('## '):kind='chapter_heading_paratext';owner='paratext:'+str(len(paratext_paragraphs));paratext_paragraphs.append(paragraph)
        elif paragraph=='The Summary:':kind='chapter_summary_marker';in_summary=True;owner='chapter_summary:0';summary_paragraphs.append(paragraph)
        elif in_summary:
            kind='chapter_summary_verse' if len(paragraph.splitlines())>1 else 'chapter_summary_closing_heading'
            owner='chapter_summary:'+str(len(summary_paragraphs));summary_paragraphs.append(paragraph)
        else:
            owner='body:'+str(len(body_paragraphs));body_paragraphs.append(paragraph)
            if paragraph.startswith('### '):kind='poem_heading'
            elif re.search(r'\(\d+\) \\\[(\d+)\\\]$',paragraph):kind='poem_stanza';physical+=1
            elif paragraph.startswith('Thus indeed Venerable '):kind='poem_speaker_colophon'
            elif paragraph.startswith('The legend of ') and paragraph.endswith(' is finished.'):kind='poem_completion_colophon'
            else:raise ValueError('Unclassified publisher section')
        sections.append({'kind':kind,'owner':owner,'raw':paragraph,**slice_pin(text,start,end),
                         'lines':len(paragraph.splitlines()),'note_refs':[int(n) for n in NOTE.findall(paragraph)]})
    section_authority=[{'kind':s['kind'],'raw_paragraph_sha256':s['raw_sha256'],'lines':s['lines'],'note_refs':s['note_refs']} for s in sections]
    require(section_authority==source['raw_sections'],'Source segmentation differs from independent ownership review')
    require(len(body_paragraphs)==physical+3,'Complete poem body shape differs')
    require(len(paratext_paragraphs)==(1 if pub==351 else 0),'Unexpected preface scope')
    require(len(summary_paragraphs)==(3 if pub==360 else 0),'Unexpected summary scope')
    require(not NOTE.search('\n\n'.join(paratext_paragraphs+summary_paragraphs)),'Chapter apparatus acquired notes')
    body_lo=next(s['source_characters_half_open'][0] for s in sections if s['kind']=='poem_heading')
    body_hi=next(s['source_characters_half_open'][1] for s in sections if s['kind']=='poem_completion_colophon')
    raw_body=text[body_lo:body_hi]
    require(raw_body=='\n\n'.join(body_paragraphs),'Body source separators differ')
    source_notes=[];notes_meta=[];owned_definition_spans=[]
    for i,m in enumerate(definitions):
        n=int(m[1]);end=definitions[i+1].start() if i+1<len(definitions) else len(text)
        complete_definition=text[m.start():end]
        authority=source['raw_note_definitions'][i]
        require(n==authority['number'] and sha(complete_definition)==authority['raw_definition_sha256'],'Original whole definition differs')
        owners=[s for s in sections if n in s['note_refs']]
        require(len(owners)==1 and owners[0]['kind']==authority['owner_section'],'Note owner differs')
        note_start=m.end();note_end=end
        while note_end>note_start and text[note_end-1]=='\n':note_end-=1
        raw_note=text[note_start:note_end]
        require(not NOTE.search(raw_note),'Unreviewed nested note reference')
        source_notes.append({'number':n,'raw_markdown':raw_note,'complete_original_definition':complete_definition,
                             'owner':owners[0]['owner'],'owner_kind':owners[0]['kind']})
        notes_meta.append({'number':n,'owner':owners[0]['owner'],'owner_kind':owners[0]['kind'],
                           'whole_definition':slice_pin(text,m.start(),end),'content':slice_pin(text,note_start,note_end),
                           'definition_marker_prefix_sha256':sha(text[m.start():m.end()]),
                           'definition_boundary_newline_characters':end-note_end})
        owned_definition_spans.append(('note_definition:'+str(n),m.start(),end))
    numbers=[n['number'] for n in source_notes]
    require(numbers==list(range(1,len(numbers)+1)),'Original note numbering differs')
    require(Counter(int(n) for n in NOTE.findall(raw_body))==Counter(numbers),'Complete note calls differ')
    # A complete ordered partition proves nothing was dropped during extraction.
    spans=[('frontmatter',0,front.end())]
    if paratext_paragraphs:
        s=next(s for s in sections if s['kind']=='chapter_heading_paratext');spans.append(('chapter_heading_paratext',*s['source_characters_half_open']))
    spans.append(('complete_poem_body',body_lo,body_hi))
    if summary_paragraphs:
        selected=[s for s in sections if s['owner'].startswith('chapter_summary:')]
        spans.append(('chapter_summary_and_closing',selected[0]['source_characters_half_open'][0],selected[-1]['source_characters_half_open'][1]))
    spans+=owned_definition_spans
    segments=[];cursor=0
    for kind,start,end in sorted(spans,key=lambda s:s[1]):
        require(cursor<=start<=end,'Source spans overlap')
        if cursor<start:segments.append({'kind':'source_separator','raw_markdown':text[cursor:start],**slice_pin(text,cursor,start)})
        segments.append({'kind':kind,'raw_markdown':text[start:end],**slice_pin(text,start,end)});cursor=end
    if cursor<len(text):segments.append({'kind':'source_separator','raw_markdown':text[cursor:],**slice_pin(text,cursor,len(text))})
    require(''.join(s['raw_markdown'] for s in segments)==text,'Lossless source reconstruction failed')
    lossless={'schema':'publisher-lossless-segmented-source-fixture-v1','publisher_poem':pub,
              'candidate_canonical_id_from_independent_alignment_only':uid,'title':source['title'],
              'source_revision':source['source_revision'],'raw_file_sha256':sha(raw_bytes),'LF_file_sha256':sha(text),
              'newline_normalization':newline_edits,'complete_poem_body_markdown':raw_body,
              'translator_notes':source_notes,'publisher_paratext_markdown':'\n\n'.join(paratext_paragraphs),
              'chapter_summary_markdown':'\n\n'.join(summary_paragraphs) if summary_paragraphs else None,
              'whole_original_LF_partition':segments,'source_segmentation_only_no_markup_changes':True,
              'runtime_activation_approval':False}
    expected_pairs=source['finite_display_pairs']
    rendered={};edit_ledger=[];operations=Counter();pairs_seen=[];para_meta=[]
    for section in sections:
        owner=section['owner'];expected=[p for p in expected_pairs if p['owner']==owner]
        value,edits,counts,pairs=presentation(section['raw'],owner,expected)
        rendered[owner]=value;edit_ledger+=edits;operations.update(counts);pairs_seen+=pairs
    api_notes=[];api_note_pins=[]
    for note,meta in zip(source_notes,notes_meta):
        owner='note:'+str(note['number']);expected=[p for p in expected_pairs if p['owner']==owner]
        value,edits,counts,pairs=presentation(note['raw_markdown'],owner,expected)
        api_notes.append({'number':note['number'],'text':value});edit_ledger+=edits;operations.update(counts);pairs_seen+=pairs
        api_note_pins.append({'number':note['number'],'owner':note['owner'],'owner_kind':note['owner_kind'],
                              'raw_content_sha256':sha(note['raw_markdown']),'text_sha256':sha(value),'characters_utf16':u16(value)})
    require(pairs_seen==expected_pairs,'Original display occurrence order differs')
    api_paragraphs=[rendered['body:'+str(i)] for i in range(len(body_paragraphs))]
    api_body='\n\n'.join(api_paragraphs)
    paratext='\n\n'.join(rendered['paratext:'+str(i)] for i in range(len(paratext_paragraphs)))
    summary='\n\n'.join(rendered['chapter_summary:'+str(i)] for i in range(len(summary_paragraphs))) if summary_paragraphs else None
    prefix=0
    for i,p in enumerate(api_paragraphs):
        para_meta.append({'paragraph_index0':i,'raw_sha256':sha(body_paragraphs[i]),'text_sha256':sha(p),'characters_utf16':u16(p),'lines':len(p.splitlines()),'body_start_utf16':prefix,'body_end_utf16':prefix+u16(p),'original_note_numbers':[int(n) for n in NOTE.findall(body_paragraphs[i])]});prefix+=u16(p)+2
    stanza_layout=[];quotes=[];quote_meta=[]
    for i,paragraph in enumerate(api_paragraphs[1:-2],1):
        bare=re.sub(r'\[Note \d+\]','',paragraph)
        suffix=re.search(r'\((\d+(?:-\d+)?)\) \[(\d+(?:-\d+)?)\]$',bare)
        require(suffix is not None,'Exact printed suffix absent')
        quote=bare[:suffix.start()].rstrip();quotes.append(quote)
        stanza_layout.append({'local_label':suffix[1],'publisher_label':suffix[2],'suffix':suffix[0],'lines':len(paragraph.splitlines())})
        quote_meta.append({'physical_entry1':i,'body_paragraph_index0':i,'text_sha256':sha(quote),'characters_utf16':u16(quote),'lines':len(quote.splitlines()),'suffix_sha256':sha(suffix[0]),'domain':'Only physical stanza wording; original note calls and terminal printed numeric suffix excluded; bracketed words retained.'})
    authority_layout=[{'local_label':str(q['local']),'publisher_label':str(q['publisher_global']),'suffix':'('+str(q['local'])+') ['+str(q['publisher_global'])+']','lines':q['raw_lines']} for q in source['physical_stanzas']]
    require(stanza_layout==authority_layout,'Physical stanza labels/lines differ')
    pages=[{'offset':i,'characters_utf16':u16(api_body[i:i+500]),'text_sha256':sha(api_body[i:i+500]),'prefix_sha256':sha(api_body[:i+len(api_body[i:i+500])]),'next_offset':i+500 if i+500<len(api_body) else None} for i in range(0,len(api_body),500)]
    proposal={'schema':'finite-presentation-proposal-not-approved-api-output-v1','publisher_poem':pub,
              'candidate_canonical_id_from_independent_alignment_only':uid,'title':source['title'],
              'text':api_body,'translator_notes':api_notes,'publisher_paratext':paratext,
              'quotation_texts_marker_and_suffix_free':quotes,'future_API_hashes_approved':False,
              'source_markers_preserved_as_same_number_visible_calls':True,'source_words_and_edition_caveats_not_edited':True,
              'runtime_activation_approval':False}
    summary_meta=None
    if summary is not None:
        require(len(summary_paragraphs)==3 and len(summary_paragraphs[1].splitlines())==6,'Original summary structure changed')
        proposal['chapter_summary']={'text':summary,'translator_notes':[],'source_only_boundary_from_independent_alignment':[10592,10597],
                                      'proposed_runtime_descriptor_or_reference_approval':False}
        summary_meta={'raw_sha256':sha('\n\n'.join(summary_paragraphs)),'body_sha256':sha(summary),
                      'characters_utf16':u16(summary),'paragraphs':[{'paragraph_index0':i,'text_sha256':sha(rendered['chapter_summary:'+str(i)]),'lines':len(p.splitlines())} for i,p in enumerate(summary_paragraphs)],
                      'notes_sha256':jsha([]),'note_numbers':[],'verse_lines':6,'publisher_stated_count':40,
                      'source_only_boundary_from_independent_alignment':[10592,10597],
                      'order':'publisher summary marker, six-line roster, chapter-closing heading',
                      'runtime_wrapper_and_slash_ref_descriptor_not_proposed_here':True}
    if pub==358:
        require([n['number'] for n in api_notes]==[1,2,3,4,5],'358 lost original notes')
        require(api_note_pins[-2]['owner_kind']=='poem_speaker_colophon' and api_note_pins[-1]['owner_kind']=='poem_completion_colophon','358 colophon note ownership changed')
    if pub==360:
        require('Tusitā, I\nI gave' in api_body,'360 original repeated wording changed')
    metadata={'publisher_poem':pub,'source_alignment_candidate_only':source['source_alignment_candidate'],
              'title':source['title'],'raw_source':source['raw_pin'],'raw_file_LF_sha256':sha(text),'newline_normalization':newline_edits,
              'lossless_source_segmentation':{'complete_poem_body_raw_sha256':sha(raw_body),'body_span':slice_pin(text,body_lo,body_hi),
                 'whole_LF_source_reconstructed_exactly':True,'original_note_markers_and_definitions_unchanged':True,
                 'partition_pins':[{k:v for k,v in q.items() if k!='raw_markdown'} for q in segments],
                 'notes':notes_meta,'paratext_raw_sha256':sha('\n\n'.join(paratext_paragraphs)),
                 'summary_raw_sha256':sha('\n\n'.join(summary_paragraphs)) if summary_paragraphs else None},
              'finite_presentation_proposal':{'body_sha256':sha(api_body),'body_characters_utf16':u16(api_body),
                'body_paragraphs':para_meta,'notes_sha256':jsha(api_notes),'note_numbers':numbers,'note_count':len(numbers),
                'notes':api_note_pins,'paratext_sha256':sha(paratext),'paratext_note_numbers':[],
                'publisher_preface_descriptor_present':False,'chapter_summary':summary_meta,
                'physical_stanza_entries':len(stanza_layout),'stanza_layout':stanza_layout,
                'quotation_proofs':quote_meta,'whole_quote_sha256':sha('\n\n'.join(quotes)),
                'pages500':pages,'display_pairs':pairs_seen,'formatting_operations':dict(operations),
                'literal_heading_sha256':sha(api_paragraphs[0]),'printed_PTS_main_label':source['PTS_main'],'printed_BJTS_fancy_label':source['BJTS_brace'],
                'hashes_are_source_derived_proposals_not_approved_API_expectations':True},
              'independent_rights_caveats_retained':source['independent_rights_caveats'],
              'specialist_edition_review_required':source['specialist_edition_review_required'],
              'normalization_not_activation':True,'runtime_activation_release_approval':False}
    return lossless,proposal,metadata,edit_ledger

# Canon/XML verification is stdlib source evidence, never a canon/app import.
import gzip
import xml.etree.ElementTree as ET

SELECTED_PAIRS=[(351,'tha-ap353'),(352,'tha-ap354'),(353,'tha-ap355'),(354,'tha-ap356'),
                (355,'tha-ap357'),(356,'tha-ap358'),(357,'tha-ap359'),(359,'tha-ap361'),(360,'tha-ap362')]

def source_book36(raw):
    def item(element):
        pages={}
        def visit(node):
            value=node.text or ''
            for child in node:
                if child.tag=='pb':pages.setdefault(child.attrib['ed'],[]).append('.'.join(str(int(p)) if p.isdigit() else p for p in child.attrib['n'].split('.')))
                elif child.tag!='note':value+=visit(child)
                value+=child.tail or ''
            return value
        value=' '.join(visit(element).split());rend=element.attrib.get('rend',element.tag);number=element.attrib.get('n')
        notes=[' '.join(''.join(e.itertext()).split()) for e in element.iter('note')]
        if rend=='hangnum':require(re.fullmatch(r'\d+\.',value) is not None,'Changed original hangnum');number,value=value[:-1],''
        return [rend,number,value,notes,pages]
    nodes=[n for n in ET.fromstring(raw).iter() if n.tag in ('p','head','trailer')]
    require(len(nodes)==14646,'Original XML event count changed')
    require(item(nodes[1130])==['gatha1',None,'',['imā dve gāthāyo syāmapotthake na santi'],{}],'Original note-only event changed')
    return [item(n) for i,n in enumerate(nodes) if i!=1130]

def source_canon(path,contract):
    if path.exists():
        require(path.is_file() and not path.is_symlink(),'Canon input must be physical')
        compressed=path.read_bytes()
    else:
        manifest_path=path.with_name(path.name+'.parts.json')
        require(manifest_path.is_file() and not manifest_path.is_symlink(),'Physical canon shards manifest required')
        manifest=json.loads(manifest_path.read_bytes());require(manifest['version']==1,'Canon shard version')
        chunks=[]
        for i,part in enumerate(manifest['parts'],1):
            name=path.name+'.part-'+str(i).zfill(4)
            require(part['file']==name and 0<part['size']<5*1024*1024,'Canon shard descriptor')
            p=path.with_name(name);require(p.is_file() and not p.is_symlink(),'Physical canon shard required')
            data=p.read_bytes();require(len(data)==part['size'] and sha(data)==part['sha256'],'Canon shard bytes changed');chunks.append(data)
        compressed=b''.join(chunks)
        require(len(compressed)==manifest['size'] and sha(compressed)==manifest['sha256'],'Whole compressed canon shard join changed')
    require(sha(compressed)==contract['expected_canonical_compressed_sha256'],'Pinned compressed canon changed')
    logical=gzip.decompress(compressed)
    require(sha(logical)==contract['expected_canonical_logical_sha256'],'Pinned f3 canonical logical bytes changed')
    canon=json.loads(logical)
    require(canon['source']['commit']==contract['canonical_source_scope_only']['VRI_revision'],'Pinned VRI revision changed')
    require(len(canon['books'])==61 and len(canon['units'])==8544,'Full canonical scope changed')
    return canon

def source_ordinals(book,start,end):
    spans=[];pending=None
    def flush():
        nonlocal pending
        if pending is not None:spans.append(pending);pending=None
    for i in range(start,end):
        rend,number,text,notes,pages=book[i]
        if rend=='hangnum':flush();pending=[i,i+1];continue
        if rend in {'gatha1','gatha2','gatha3','gathalast'}:
            if pending is None:pending=[i,i+1]
            pending[1]=i+1
            if rend=='gathalast':flush()
        else:
            flush()
            if text:spans.append([i,i+1])
    flush();return spans

def text_pin(value):return {'sha256':sha(value),'characters_utf16':u16(value),'lines':len(value.splitlines())}

def compare_nine_source(source,lossless,presentation_value,metadata,contract,canon,book):
    pub=source['publisher'];uid=source['source_alignment_candidate']['canonical_candidate']
    blind=contract['independent_blind_goldens'][str(pub)]
    profile=contract['approved_profiles'][uid];link=contract['approved_links'][uid]
    require(profile['poem']==pub and profile['id']==uid,'Literal reviewed source identity differs')
    require(link=={**profile,'english':profile['title'],'match':'individually-reviewed-whole-poem'},'Exact reviewed link composition differs')
    body=presentation_value['text'];paras=body.split('\n\n');notes=presentation_value['translator_notes']
    api=metadata['finite_presentation_proposal']
    require(text_pin(body)==blind['body'],'Independent full body/UTF16 differs')
    require([text_pin(p) for p in paras]==blind['body_paragraphs'],'Independent paragraph hashes differ')
    require([{'number':n['number'],**text_pin(n['text'])} for n in notes]==blind['notes'],'Independent all note texts differ')
    require(jsha(notes)==blind['notes_sha256']==profile['notes_sha256'],'Independent ordered note domain differs')
    require([n['number'] for n in notes]==blind['note_numbers']==profile['note_numbers'],'Original note numbers differ')
    kinds={'poem_heading':'heading','poem_stanza':'stanza','poem_speaker_colophon':'speaker','poem_completion_colophon':'closing'}
    owners=[{'number':n['number'],'body_paragraph_index':int(n['owner'].split(':')[1]),'section':kinds[n['owner_kind']]} for n in api['notes']]
    require(owners==blind['note_owners'],'Independent note owners differ')
    require(text_pin(paras[0])==blind['heading'] and text_pin(paras[-2])==blind['speaker'] and text_pin(paras[-1])==blind['closing'],'Independent heading/colophons differ')
    require(sha(body)==profile['body_sha256'] and sha(paras[0])==profile['publisher_heading_sha256'],'Reviewed profile body/heading pin differs')
    require(metadata['raw_source']['sha256']==profile['raw_sha256']==blind['raw_source']['sha256'],'Reviewed raw pin differs')
    require(profile['title']==source['title']==blind['title'],'Printed publisher title differs')
    require(profile['stanza_layout']==api['stanza_layout'],'Reviewed physical stanza layout differs')
    quotes=presentation_value['quotation_texts_marker_and_suffix_free'];stanzas=[]
    for i,(layout,quote) in enumerate(zip(api['stanza_layout'],quotes),1):
        stanzas.append({'paragraph_index':i,'local':int(layout['local_label']),'global':layout['publisher_label'],
                        'rendered':text_pin(paras[i]),'quotation':text_pin(quote)})
    require(stanzas==blind['stanzas'] and text_pin('\n\n'.join(quotes))==blind['quotation_text'],'Independent physical quote domain differs')
    require(profile['publisher_verse_labels']==[q['publisher_label'] for q in api['stanza_layout']],'Literal publisher labels differ')
    labels=[int(q['publisher_label']) for q in api['stanza_layout']]
    require(profile['verses']==[labels[0],labels[-1]],'Whole publisher label range differs')
    paratext=presentation_value['publisher_paratext']
    require(text_pin(paratext)==blind['publisher_paratext'] and sha(paratext)==profile['paratext_sha256'],'Independent separate paratext differs')
    require('publisher_preface' not in profile,'Unnoted heading cannot acquire a note-owning descriptor')
    summary_value=presentation_value.get('chapter_summary',{}).get('text','')
    require(text_pin(summary_value)==blind['summary'],'Independent summary differs')
    if summary_value:require([text_pin(p) for p in summary_value.split('\n\n')]==blind['summary_paragraphs'],'Independent summary paragraph pins differ')
    else:require(blind['summary_paragraphs']==[],'Unexpected independent summary paragraphs')
    pages=[]
    for i in range(0,len(body),500):
        pages.append({'offset_utf16':i,**text_pin(body[i:i+500]),'body_prefix_sha256':sha(body[:i])})
    require(pages==blind['hard500_pages'],'Independent hard500 page/prefix-before-page domain differs')
    # Retain the producer's distinct prefix-through-page-end pin and verify it
    # against direct source slicing; do not equate the two named conventions.
    for page in api['pages500']:
        i=page['offset'];end=i+page['characters_utf16']
        require(page['text_sha256']==sha(body[i:end]) and page['prefix_sha256']==sha(body[:end]),'Source prefix-through-page-end differs')
    display=[]
    for m in PAIR.finditer(lossless['complete_poem_body_markdown']):
        display.append({'owner_section':'body','raw_sha256':sha(m[0]),'default':m[1],'alternative':m[2],'offset_raw_utf16':u16(lossless['complete_poem_body_markdown'][:m.start()])})
    require(display==blind['display_pairs'],'Independent display inventory differs')
    require(len(display)==(1 if pub==356 else 0),'Only the exact356 body pair is selected')
    units={u['id']:u for u in canon['units']};require(len(units)==8544,'Duplicate canonical IDs')
    u=units[uid];scope={'book':u['book'],'start':u['start'],'end':u['end']}
    require(scope==blind['root_scope'] and jsha(u)==blind['root_unit_sha256'],'Independent canonical whole-unit identity differs')
    root={'id':uid,**scope,'blocks':book[u['start']:u['end']]}
    require(jsha(root)==profile['root_sha256']==blind['root_wrapper_sha256'],'Original full root wrapper domain differs')
    numbered=[int(b[1]) for b in book[u['start']:u['end']] if b[0]=='hangnum']
    require(numbered==list(range(profile['root_verses'][0],profile['root_verses'][1]+1)),'Complete root stanza scope differs')
    require('index_revision' not in u and 'index_revision' not in profile,'No new source cut or locator namespace is authorized')
    summary=None
    if pub==360:
        summary=profile['chapter_summary'];start,end=summary['root_start'],summary['root_end']
        require(set(summary)=={'kind','label','parent_id','first_ref','last_ref','root_start','root_end','root_sha256','body_sha256','notes_sha256','note_numbers'},'Summary strict11-key schema')
        require((start,end)==(10592,10597) and summary['parent_id']==uid,'Summary physical ownership differs')
        require(summary['kind']=='canonical_chapter_summary' and summary['note_numbers']==[] and summary['notes_sha256']==jsha([]),'Summary cannot acquire notes')
        require(sha(summary_value)==summary['body_sha256'],'Summary complete publisher text differs')
        require(jsha({'id':uid,'book':36,'start':start,'end':end,'blocks':book[start:end]})==summary['root_sha256'],'Summary parent wrapper hash differs')
        spans=source_ordinals(book,u['start'],u['end']);first=next(i+1 for i,s in enumerate(spans) if s[0]==start);last=next(i+1 for i,s in enumerate(spans) if s[1]==end)
        require((summary['first_ref'],summary['last_ref'])==(uid+'/'+str(first),uid+'/'+str(last))==(uid+'/8',uid+'/10'),'Summary slash ordinals differ')
        require(len(summary_value.split('\n\n'))==3 and len(summary_value.split('\n\n')[1].splitlines())==6,'Publisher summary shape differs')
    else:require('chapter_summary' not in profile and not summary_value,'Unexpected chapter summary owner')
    return {'publisher_poem':pub,'id':uid,'body_sha256':sha(body),'notes_sha256':jsha(notes),'paratext_sha256':sha(paratext),
            'root_wrapper_sha256':jsha(root),'body_paragraphs':len(paras),'physical_stanza_entries':len(stanzas),'notes':len(notes),
            'pages500':len(pages),'display_pairs':len(display),'body_characters_utf16':u16(body),'summary':summary,
            'all_original_source_domains_match_independent_blind_goldens':True,'all_computed_pins_match_reviewed_nine_packet':True}

def main():
    parser=argparse.ArgumentParser(description='Exact nine source replay: private English external; metadata report only is a CI artifact.')
    parser.add_argument('--publisher-root',required=True,type=Path)
    parser.add_argument('--canon',required=True,type=Path)
    parser.add_argument('--vri-xml',required=True,type=Path)
    parser.add_argument('--out',required=True,type=Path)
    parser.add_argument('--input-contract',type=Path,default=Path(__file__).with_name('SOURCE_NINE_INPUT_CONTRACT.json'))
    args=parser.parse_args();raw_contract=args.input_contract.read_bytes()
    require(sha(raw_contract)==CONTRACT_SHA,'Frozen nine-source input/goldens contract changed')
    contract=json.loads(raw_contract)
    require([(q['publisher'],q['id']) for q in contract['literal_selected_pairs']]==SELECTED_PAIRS,'Literal nine whitelist differs')
    require([(q['publisher'],q['source_alignment_candidate']['canonical_candidate']) for q in contract['poems']]==SELECTED_PAIRS,'Only exact nine source records permitted')
    require(list(contract['approved_profiles'])==[uid for _,uid in SELECTED_PAIRS] and list(contract['approved_links'])==[uid for _,uid in SELECTED_PAIRS],'Held/unknown profile or link supplied')
    require('tha-ap360' not in contract['approved_profiles'] and all(p['poem']!=358 for p in contract['approved_profiles'].values()),'Held source358 remains excluded')
    require(sha(json.dumps(contract['approved_profiles'],ensure_ascii=False,indent=2)+'\n')=='a9ce377c7ec5c75fff7315c45dbd0328b7164dd4120b83b3f7c8a6406df6a367','Reviewed profile packet changed')
    require(sha(json.dumps(contract['approved_links'],ensure_ascii=False,indent=2)+'\n')=='49c53fa616ac61c135705e97215c381426d344af3141c217eb8c72f9a48c566d','Reviewed link packet changed')
    require(not args.out.exists(),'Use a new external output directory')
    for pin in contract['rights_pins']:pinned_file(args.publisher_root/pin['path'],pin)
    canon=source_canon(args.canon,contract)
    require(args.vri_xml.is_file() and not args.vri_xml.is_symlink(),'Physical original XML required')
    xml=args.vri_xml.read_bytes();require(sha(xml)==contract['expected_VRI_XML_sha256'],'Pinned original XML changed')
    book=source_book36(xml)
    require(len(book)==14645 and jsha(book)==contract['expected_book36_tuples_sha256'] and book==canon['books'][36]['blocks'],'All14645 original source tuples must equal current Book36')
    prepared=[];results=[];totals=Counter()
    for record in contract['poems']:
        source={**record,'source_revision':contract['publisher_revision']}
        raw=pinned_file(args.publisher_root/source['source_path'],source['raw_pin'])
        lossless,value,metadata,ledger=derive(source,raw)
        result=compare_nine_source(source,lossless,value,metadata,contract,canon,book);results.append(result)
        prepared.append((source['publisher'],lossless,value,metadata,ledger))
        api=metadata['finite_presentation_proposal']
        totals.update(poems=1,body_paragraphs=len(api['body_paragraphs']),physical_stanza_entries=api['physical_stanza_entries'],
          poem_notes=api['note_count'],display_pairs=len(api['display_pairs']),pages500=len(api['pages500']),body_characters_utf16=api['body_characters_utf16'],
          separate_note_free_paratext=bool(lossless['publisher_paratext_markdown']),separate_note_free_summaries=bool(api['chapter_summary']))
    require(dict(totals)==contract['expected_counts'],'Exact nine source totals differ')
    args.out.mkdir(parents=True);private=args.out/'private-source-text';private.mkdir();rows=[]
    for pub,lossless,value,metadata,ledger in prepared:
        files={}
        files['lossless_source']=write_json(private/('publisher-'+str(pub)+'.lossless-source.json'),lossless)
        files['presentation_source']=write_json(private/('publisher-'+str(pub)+'.presentation-source.json'),value)
        metadata['external_fixture_files']=files;rows.append(metadata)
    metadata=write_json(args.out/'NORMALIZATION_MANIFEST.json',{'schema':'portable-nine-source-normalization-metadata-v1','source_input_contract':descriptor(args.input_contract),
      'totals':dict(totals),'poems':rows,'private_text_relative_directory':'private-source-text/','source_English_body_or_note_text_in_manifest':False,
      'runtime_API_reader_activation_or_release_approval':False})
    report=write_json(args.out/'SOURCE_NINE_REPORT.json',{'schema':'portable-nine-source-independent-goldens-report-v1',
      'status':'EXACT_NINE_SOURCE_DOMAINS_AND_ORIGINAL_ROOTS_MATCH_REVIEWED_GOLDENS_NOT_RUNTIME_ACCEPTANCE',
      'source_input_contract':descriptor(args.input_contract),'producer':descriptor(Path(__file__)),
      'publisher_revision':contract['publisher_revision'],'VRI_revision':contract['canonical_source_scope_only']['VRI_revision'],
      'canonical_logical_sha256':contract['expected_canonical_logical_sha256'],'original_XML_sha256':sha(xml),
      'all14645_original_book36_tuples_equal_current_canon':True,'rights_artifacts':len(contract['rights_pins']),
      'held_publisher358_English_file_never_read_or_activated':True,'totals':dict(totals),'per_poem':results,
      'legacy359_scope':contract['legacy359_scope'],'normalization_manifest':metadata,
      'source_authorities':contract['new_source_authorities'],'old_English16_replay_unchanged_and_still_required':True,
      'artifact_policy':'Upload only SOURCE_NINE_REPORT.json, NORMALIZATION_MANIFEST.json and SOURCE_NINE_SEAL.json. Never upload private-source-text/ or pinned English originals.',
      'app_parser_runtime_reader_browser_tests_Git_CI_network_execution':False,'runtime_API_activation_or_release_approval':False})
    seal=write_json(args.out/'SOURCE_NINE_SEAL.json',{'schema':'portable-nine-source-metadata-seal-v1','report':report,'normalization_manifest':metadata,
      'source_input_contract':descriptor(args.input_contract),'producer':descriptor(Path(__file__)),'runtime_API_activation_release_approval':False})
    print(json.dumps({'status':'SOURCE_ONLY_NINE_VERIFIED','totals':dict(totals),'report':report,'seal':seal}))

if __name__=='__main__':main()
