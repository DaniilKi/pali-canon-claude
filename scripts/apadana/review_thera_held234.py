#!/usr/bin/env python3
"""Finite source-derived publisher234 identity exception normalization; standard library only.
No production-parser imports, expected-output oracle, generated scripture, network,
or repository writes. Original raw files + XML independently determine all text.
Shared XML/segment/hash utilities retain the preceding portable review semantics.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
PUB='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
VRI='2d134ff9ef60f70a1eb03c9370580228811a3070'
BASE='7d5ac90845402b322dabf2c5120d1485b15c0bda'
CANON='1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
XML='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
RAW_SEALS={
 'GOLDENS.json':'46821de4c13466a9142d3fbf38aa4f86ccf63ea601180646f63055f169533b0f',
 'SOURCE_REVIEW.json':'bc9419b06a9e920cc034f57e0154e56c798ae9bfbb49b917e90bb7700227acc1',
 'RIGHTS_REVIEW.json':'11326226c65efaae2aa657b709eb4bf5bc651c573656f3a3143257fbd1fb0ad3',
 'AMENDMENT.json':'19ea89ba87cde832a2935b0ea3ba18f5963da2f6d0f6e556031b861e07f79226'
}
CHANGES=('Presentation extraction only: remove reviewed Markdown heading/emphasis markers and abbreviation tags; '
'unescape literal brackets and cross-reference punctuation; replace footnote references with explicit note labels; '
'remove Markdown hard-break padding while preserving every line and physical paragraph. Preserve publisher wording, typography, '
'original printed234, original frontmatterorder235, exactpoem-234route, all five printed stanza labels, four poem notes and both colophons. '
'No source metadata or translation wording is rewritten, generated or harmonized to VRI. Complete publisher-edition poem is not a line-complete VRI translation.')


def sha(v):return hashlib.sha256(v.encode('utf-8') if isinstance(v,str) else v).hexdigest()

def js(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))

def blob(v):return hashlib.sha1(b'blob '+str(len(v)).encode()+b'\0'+v).hexdigest()

def paras(v):return [] if not v else [dict(paragraph=i,sha256=sha(p),lines=len(p.split('\n')),characters=len(p)) for i,p in enumerate(v.split('\n\n'))]

def rootpin(uid,start,end,blocks):return sha(js(dict(id=uid,book=36,start=start,end=end,blocks=blocks[start:end])))

def xml_replay(path):
    raw=path.read_bytes();assert sha(raw)==XML,'original XML pin differs'
    def visible(e):return (e.text or '')+''.join((visible(c) if c.tag not in ('note','pb') else '')+(c.tail or '') for c in e)
    norm=lambda s:re.sub(r'\s+',' ',s).strip()
    blocks=[];physical=0;note_only=[]
    for e in ET.fromstring(raw).iter():
        if e.tag not in ('p','head','trailer'):continue
        position=physical;physical+=1;r=e.get('rend');n=e.get('n')
        t='' if r=='hangnum' else norm(visible(e))
        if not t and r!='hangnum':
            note_only.append(dict(physical_element=position,preceding_block=len(blocks)-1,following_block=len(blocks),note_sha256s=[sha(norm(''.join(x.itertext()))) for x in e.iter('note')],page_markers=[dict(x.attrib) for x in e.iter('pb')]))
            continue
        pages={}
        for pb in e.iter('pb'):pages.setdefault(pb.get('ed'),[]).append('.'.join(str(int(x)) for x in pb.get('n').split('.')))
        blocks.append([r,n,t,[norm(''.join(x.itertext())) for x in e.iter('note')],pages])
    assert physical==14646 and len(blocks)==14645
    return blocks,dict(xml_sha256=XML,xml_git_blob_sha1=blob(raw),xml_bytes=len(raw),physical_xml_block_elements=physical,full_original_xml_blocks_exact=len(blocks),note_only_elements=note_only,full_original_xml_book_sha256=sha(js(blocks)),all_rend_number_text_notes_pages_tuples_exact=True,production_parser_imports=0)

def segments(uid,start,end,blocks):
    out=[];verse=None
    def flush():
        nonlocal verse
        if verse is not None:out.append(verse);verse=None
    for i in range(start,end):
        r,n,t,notes,pages=blocks[i]
        if r=='hangnum':flush();verse=dict(type='verse',vri_paragraph=n,text='',blocks=[i,i+1],variant_count=0);continue
        if r in ('gatha1','gatha2','gatha3','gathalast'):
            if verse is None:verse=dict(type='verse',vri_paragraph=n,text='',blocks=[i,i+1],variant_count=0)
            verse['blocks'][1]=i+1;verse['text']+=('\n' if verse['text'] else '')+t;verse['variant_count']+=len(notes)
            if r=='gathalast':flush()
            continue
        flush()
        if t:
            heading=r in ('subhead','title','chapter','book','nikaya','subsubhead') or (r=='centre' and re.search(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$',t,re.I))
            out.append(dict(type='heading' if heading else 'prose',vri_paragraph=n,text=t,blocks=[i,i+1],variant_count=len(notes)))
    flush()
    return [dict(ref=uid+'/'+str(i+1),type=s['type'],blocks=s['blocks'],vri_paragraph=s['vri_paragraph'],text_sha256=sha(s['text']),variant_count=s['variant_count']) for i,s in enumerate(out)]

def artifact(path,raw):
    return dict(path=path,bytes=len(raw),raw_sha256=sha(raw),git_blob_sha1=blob(raw),raw_url=f'https://raw.githubusercontent.com/apadana-translation/apadana-site/{PUB}/{path}',exact_ref_url=f'https://raw.githubusercontent.com/apadana-translation/apadana-site/{PUB}/{path}')

def present(raw, number, owner):
    v=raw; audit={}; pairs=[]
    # Exact reviewed Pandoc displays only, at these source-specific owners.
    permitted=[]  # No paired display exists in this exact source artifact.
    for diacritic,alternate in permitted:
        token=f'[{diacritic}]{{.diacritics data-state=on}}[{alternate}]{{.no-diacritics data-state=off}}'
        assert v.count(token)==1,'missing/duplicate finite paired display'
        pairs.append(dict(owner=owner,diacritic=diacritic,alternate=alternate,raw_sha256=sha(token),rendered_sha256=sha(diacritic),occurrences=1));v=v.replace(token,diacritic)
    audit['paired_display_sequences']=pairs
    for title,label in [('Pali Text Society','PTS'),('Buddha Jayanthi Tripitaka Series','BJTS')]:
        token=f'<abbr title="{title}">{label}</abbr>';audit[label+'_abbr']=v.count(token);v=v.replace(token,label)
    assert not re.search(r'[<>]|\{\.|&(?:#\d+|#x[0-9a-f]+|[A-Za-z]+);',v),'unknown HTML/entity/paired display'
    audit['note_references']=len(re.findall(r'\[\^\d+\]',v));v=re.sub(r'\[\^(\d+)\]',r'[Note \1]',v)
    escaped=re.findall(r'\\(.)',v);assert set(escaped)<=set('[]#'),'unreviewed escape'
    for symbol in '[]#':v=v.replace('\\'+symbol,symbol)
    audit['literal_escapes']=len(escaped);assert '\\' not in v
    audit['heading_markers']=len(re.findall(r'^#{2,3} ',v,re.M));v=re.sub(r'^#{2,3} ','',v,flags=re.M)
    assert not re.search(r'^#+\s',v,re.M)
    audit['emphasis_pairs']=len(re.findall(r'\*([^*\n]+)\*',v));v=re.sub(r'\*([^*\n]+)\*',r'\1',v);assert '*' not in v
    audit['hard_break_padding_runs']=len(re.findall(r'[ \t]+\n',v));v=re.sub(r'[ \t]+\n','\n',v).strip()
    assert not re.search(r'\n{3,}',v),'unreviewed paragraph collapse'
    return v,audit

def validate_scope(source_bytes, scope):
    b=source_bytes[scope['byte_start']:scope['byte_end_exclusive']]
    assert sha(b)==scope['raw_sha256'],'sealed raw scope differs'
    return b.decode('utf-8')

def labels(label):
    parts=[int(x) for x in label.split('-')];assert len(parts) in (1,2)
    return list(range(parts[0],parts[-1]+1))

def collect(source_root,raw_packet,canon_path,xml_path,seed=None):
    if raw_packet:
        for name,seal in RAW_SEALS.items():assert sha((raw_packet/name).read_bytes())==seal,(name,'raw source seal')
        rg=json.loads((raw_packet/'GOLDENS.json').read_bytes());review=json.loads((raw_packet/'SOURCE_REVIEW.json').read_bytes());rights_record=json.loads((raw_packet/'RIGHTS_REVIEW.json').read_bytes())
        golden_by={p['publisher_poem']:p for p in rg['poems']};review_by={p['publisher_poem']:p for p in review['poems']};rights_config=rights_record['primary_notice_artifacts']
    else:
        assert seed and seed['raw_source_v2_seals']==RAW_SEALS
        golden_by={p['poem']:p['raw_source_evidence'] for p in seed['poems']};review_by={p['poem']:p['prior_full_source_review'] for p in seed['poems']};rights_config=seed['rights']+[seed['publisher_routing']]
    raw=canon_path.read_bytes();canon=json.loads(gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw)
    assert sha(js(canon))==CANON and canon['source']['commit']==VRI,'canonical logical identity differs'
    blocks,xmlfacts=xml_replay(xml_path);assert blocks==canon['books'][36]['blocks'],'all original XML block tuples differ'
    xmlfacts.update(baseline=BASE,publisher_revision=PUB,vri_revision=VRI,canon_compact_sha256=CANON)
    units={u['id']:u for u in canon['units']};rights=[]
    for a in rights_config:
        b=(source_root/a['path']).read_bytes();assert sha(b)==a['raw_sha256'] and blob(b)==a.get('official_git_blob_sha1',a.get('git_blob_sha1'))
        rights.append(artifact(a['path'],b))
    routing=next(a for a in rights if a['path']=='src/_poems/chapter-3/chapter-3.json');rights=[a for a in rights if a!=routing]
    rows=[];profiles={};links={};payloads={}
    for number in (234,):
        rawgold=golden_by[number];prior=review_by[number];uid=rawgold['canonical_owner'];u=units[uid]
        assert rawgold['canonical']==prior['canonical_bounds'];assert prior['source_scope_approval']=='APPROVE_EXACT_RAW_PUBLISHER_SCOPE' and not prior['source_scope_ambiguity_hold']
        path=f'src/_poems/chapter-3/poem-{number}.md';b=(source_root/path).read_bytes();assert sha(b)==rawgold['raw_sha256'];raw=b.decode();assert '\r' not in raw
        fm=re.fullmatch(r'---\n(.*?)\n---\n(.*)',raw,re.S);assert fm;front,rest=fm.groups()
        assert re.search(r'^order: 235$',front,re.M) and re.search(r'^category: chapter-3$',front,re.M)
        title=re.search(r'^title: (.+)$',front,re.M).group(1);assert title==rawgold['frontmatter_title']
        # Validate every selected physical raw coordinate, including each stanza's
        # sealed VRI span, independently of later Markdown normalization.
        for scope in rawgold['poem_parts']+rawgold['notes']+rawgold['prefaces']+rawgold['apparatus']:
            validate_scope(b,scope)
            if scope.get('pali_stanza_scope'):
                s=scope['pali_stanza_scope'];assert sha(js(blocks[s['start_block']:s['end_block_exclusive']]))==s['blocks_sha256']
                assert [x[1] for x in blocks[s['start_block']:s['end_block_exclusive']] if x[0]=='hangnum']==s['vri_labels']
        poem_raw=validate_scope(b,rawgold['poem_scope']).strip();definitions=validate_scope(b,rawgold['note_section_scope']).strip()
        heading_positions=list(re.finditer(r'^### ',poem_raw,re.M));assert len(heading_positions)==1 and heading_positions[0].start()==0
        preface_raw=validate_scope(b,rawgold['prefaces'][0]).strip() if rawgold['prefaces'] else '';assert not preface_raw
        summary_raw='\n\n'.join(validate_scope(b,s).strip() for s in rawgold['apparatus']);assert not summary_raw
        entries=list(re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',definitions,re.M|re.S));assert len(entries)==len(rawgold['notes'])
        notes=[];note_goldens=[];audits=[]
        for i,e in enumerate(entries):
            n=int(e.group(1));assert n==i+1 and rawgold['notes'][i]['id']==str(n) and rawgold['notes'][i]['owner']=='poem'
            original=validate_scope(b,rawgold['notes'][i]).strip();assert original==e.group(0).strip()
            note_raw=e.group(2).strip();note,audit=present(note_raw,number,f'note{n}');audits.append(dict(owner='note',number=n,**audit));notes.append(dict(number=n,text=note))
            note_goldens.append(dict(number=n,owner='poem',raw_sha256=sha(note_raw),body_sha256=sha(note),paragraph_count=len(paras(note)),paragraphs=paras(note),lines=len(note.splitlines()),anchor_lines=[i+1 for i,line in enumerate(raw.splitlines()) if f'[^{n}]' in line and not line.startswith(f'[^{n}]:')],complete_raw_definition_sha256=rawgold['notes'][i]['raw_sha256']))
        assert set(map(int,re.findall(r'\[\^(\d+)\]',poem_raw)))==set(range(1,len(notes)+1))
        assert not re.search(r'\[\^\d+\]',preface_raw+summary_raw)
        text,ba=present(poem_raw,number,'poem');preface,pa=present(preface_raw,number,'preface');summary,sa=present(summary_raw,number,'summary');audits.extend([dict(owner='poem',**ba),dict(owner='preface',**pa),dict(owner='summary',**sa)])
        pp=text.split('\n\n');assert len(pp)==rawgold['physical_stanza_entries']+3
        assert pp[0]==f'[{number}. {title}[Note 1]]' and pp[-2]==f'Thus indeed Venerable {title} Thera spoke these verses.' and pp[-1]==f'The legend of {title} Thera is finished.'
        layout=[];raw_stanzas=[s for s in rawgold['poem_parts'] if s['kind']=='stanza'];all_local=[]
        for i,p in enumerate(pp[1:-2]):
            m=re.search(r'\((\d+(?:-\d+)?)\) \[(\d+(?:-\d+)?)\]$',p);assert m
            assert raw_stanzas[i]['printed_local_global_labels']==[[m.group(1),m.group(2)]]
            local=labels(m.group(1));global_labels=labels(m.group(2));assert len(local)==len(global_labels) and len(p.splitlines())==4*len(local)
            assert len(local)==1 and len(p.splitlines())==4, 'unreviewed combined entry'
            all_local+=local;layout.append(dict(local_label=m.group(1),publisher_label=m.group(2),suffix=m.group(),lines=len(p.splitlines())))
        assert all_local==list(range(1,rawgold['local_stanza_labels']+1)) and len(layout)==rawgold['physical_stanza_entries']
        pairs=[p for a in audits for p in a['paired_display_sequences']];assert len(pairs)==rawgold['paired_spelling_displays']==0
        start,end=u['start'],u['end'];assert [start,end]==[rawgold['canonical']['start_block'],rawgold['canonical']['end_block_exclusive']]
        assert sha(js(blocks[start:end]))==rawgold['canonical']['unit_blocks_sha256']
        speech=[i for i in range(start,end) if blocks[i][0]=='bodytext' and blocks[i][2].startswith('Itthaṃ sudaṃ')];assert len(speech)==1;legend=speech[0]+1;assert blocks[legend][0]=='centre' and 'therassāpadānaṃ' in blocks[legend][2]
        sg=segments(uid,start,end,blocks);root_numbers=[int(blocks[i][1]) for i in range(start,legend+1) if blocks[i][0]=='hangnum']
        root=dict(id=uid,book=36,start=start,end=end,title=u['title'],root_sha256=rootpin(uid,start,end,blocks),root_verses=[root_numbers[0],root_numbers[-1]],numbered_stanza_count=len(root_numbers),vri=u['vri'],index_revision=u.get('index_revision'),first_ref=sg[0]['ref'],last_ref=sg[-1]['ref'],segments=sg)
        mapping_notes=[
          'Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Preserve independent VRI wording and all explicit edition differences; do not infer missing words, stanza equivalence or other mappings by number.',
          f'Explicit full-source narrative/title/colophon review maps publisher chapter-3 poem {number} to canonical {uid}. Shared numbers alone do not establish any other mapping.',*prior['specific_caveats']]
        mapping_notes.extend([
          'Original publisher file poem-234.md has frontmatter order235 and printed poem234. Its Kilañjadāyaka title, mat narrative, four poem notes and both colophons belong to canonicaltha-ap236; neither order235 nor a numeric offset identifies another text.',
          'The publisher permalink derives from category plus page.fileSlug, so this choice stays /text/chapter-3/poem-234/. Separate poem-235.md/order235/printed235 is Vediyadāyaka, the railing gift to Vipassi, canonicaltha-ap237; no source substitution or metadata correction is made.',
          'The earlier nine-poem source intake (D256) held publisher234 and reviewed33entries; its publisher240 summary warning is retained as historical intake provenance. This separately reviewed publisher234 choice does not rewrite that earlier approval or its source objects. Original full-chapter38count remains a source statement, not a line-complete VRI or generated coverage claim.'
        ])
        row=artifact(path,b)|dict(id=uid,publisher_chapter='chapter-3',poem=number,title=title,source_scope_decision='APPROVE exact normalized complete publisher-edition poem and separately owned apparatus; subject to independent review and later runtime gates. No activation or line-complete VRI claim.',narrative_identity=prior['mapping_basis'],prior_full_source_review=prior,raw_source_evidence=rawgold,identity_basis='Full raw stanza/note/title/colophon review; sealed v2 narrative/title/colophon/variant/neighbor evidence retained; all original XML blocks replayed independently.',front_matter_raw_sha256=sha(front),source_raw_body_sha256=sha(poem_raw),raw_definitions_sha256=sha(definitions),body_sha256=sha(text),notes_sha256=sha(js(notes)),paratext_sha256=sha(preface),body_paragraphs=paras(text),physical_stanza_count=len(layout),printed_local_verse_label_count=len(all_local),stanza_layout=layout,note_count=len(notes),original_note_count=len(notes),note_numbers=list(range(1,len(notes)+1)),notes=note_goldens,original_raw_body_paragraph_count=len(poem_raw.split('\n\n')),normalized_body_paragraph_count=len(pp),publisher_preface=dict(raw_sha256=sha(preface_raw),body_sha256=sha(preface),paragraph_count=len(paras(preface)),paragraphs=paras(preface),notes_sha256=sha('[]'),note_numbers=[]),publisher_divisions=[],presentation_recipe=dict(independent_extractor=True,no_project_parser_imported=True,exact_raw_pin_required=True,paired_markdown_display_inventory=pairs,speech_colophon_sha256=sha(pp[-2]),legend_colophon_sha256=sha(pp[-1]),colophons_share_physical_paragraph=False,joined_colophon_paragraph_sha256=None,source_wording_repaired=False,changes=CHANGES,operations=audits),root=root,mapping_notes=mapping_notes,poem_only_root_sha256=rootpin(uid,start,legend+1,blocks),finite_parser_exceptions_needed=['exact own-ID tha-ap236/printed234/filepoem-234/rawSHA24e6aa7f… expects literal original frontmatterorder235; every other profile retains order===poem; no new descriptor field or general grammar'],source_approval=True,normalization_approval=True,activation=False)
        neighbors=[other for other in units.values() if other['book']==36 and (other['end']==start or other['start']==end)];assert len(neighbors)==2
        row['neighbors']=[dict(id=other['id'],title=other['title'],start=other['start'],end=other['end'],root_sha256=rootpin(other['id'],other['start'],other['end'],blocks),first_last_heading_hashes=[sha(blocks[other['start']][2]),sha(blocks[other['end']-1][2])]) for other in sorted(neighbors,key=lambda u:u['start'])]
        payload=dict(title=title,text=text,translator_notes=notes,publisher_paratext=preface,changes=CHANGES)
        row['source_identity_audit']=dict(kind='audit_metadata_only_not_new_runtime_descriptor',frontmatter_order=235,printed_poem_number=234,filename='poem-234.md',canonical_id=uid,category='chapter-3',permalink_template='/text/{{ category | slug }}/{{ page.fileSlug }}/index.html',route='/text/chapter-3/poem-234/',order_rewritten=False,printed_number_rewritten=False,neighbor_publisher_poem=235,neighbor_canonical_id='tha-ap237',neighbor_title='Vediyadāyaka')
        profile={k:row[k] for k in ('exact_ref_url','id','publisher_chapter','poem')};profile.update(verses=[labels(layout[0]['publisher_label'])[0],labels(layout[-1]['publisher_label'])[-1]],root_verses=root['root_verses'],note_count=len(notes),note_numbers=row['note_numbers'],source='apadana',path=f'/text/chapter-3/poem-{number}/',url=f'https://apadanatranslation.com/text/chapter-3/poem-{number}/',raw_url=row['raw_url'],translator='Jonathan S. Walters',license='CC BY-NC-SA 4.0',translation_revision=PUB,title=title,reference=f'Therā Apadāna publisher poem {number}; complete publisher-edition poem; original numbering retained',raw_sha256=sha(b),body_sha256=sha(text),notes_sha256=sha(js(notes)),paratext_sha256=sha(preface),root_sha256=root['root_sha256'],stanza_layout=layout,mapping_notes=mapping_notes)
        profiles[uid]=profile;links[uid]=profile|dict(english=title,match='individually-reviewed-whole-poem');rows.append(row);payloads[uid]=payload
    totals=dict(poems=1,physical_publisher_stanzas=sum(p['physical_stanza_count'] for p in rows),printed_local_label_occurrences=sum(p['printed_local_verse_label_count'] for p in rows),vri_numbered_stanzas=sum(p['root']['numbered_stanza_count'] for p in rows),body_paragraphs=sum(len(p['body_paragraphs']) for p in rows),original_raw_body_paragraphs=sum(p['original_raw_body_paragraph_count'] for p in rows),poem_notes=sum(p['note_count'] for p in rows),original_notes=sum(p['original_note_count'] for p in rows),preface_notes=0,summary_notes=0,collection_summary_notes=0,source_blobs=1,rights_blobs=len(rights),routing_blobs=1,audio_fetches=0,normalization_approvals=1,external_activations=0)
    assert (totals['body_paragraphs'],totals['physical_publisher_stanzas'],totals['printed_local_label_occurrences'],totals['poem_notes'])==(8,5,5,4)
    goldens=dict(review_type='Independent standard-library source-derived normalization; sealed v2 scope review retained. Metadata/hashes only, no production-parser imports or output oracle.',baseline=BASE,publisher_revision=PUB,vri_revision=VRI,raw_source_v2_seals=RAW_SEALS,rights=rights,publisher_routing=routing,rights_decision='Walters/Whitman specific CC BY-NC-SA4.0 covers text, notes and textual apparatus; generic CC BY site metadata does not relax it. Live-only English; bundle metadata/hashes only, attribution/revision/full notices/noncommercial/share-alike/changes required. No media approval.',totals=totals,poems=rows,original_vri_replay=xmlfacts)
    return goldens,profiles,links,payloads
NORMALIZED_SEALS={
 'GOLDENS.json':'f431e9c1e69ef7bcafe6a511a3bbddc87e64739a5df5910ed6ee65f31a642ce9',
 'EXPECTED_PROFILES.json':'af6d434558dc690935a4cc12672999de9114afaeed259c4039492f8e6bd32efc',
 'EXPECTED_LINKS.json':'279a6106888c4978da6abe40207cba84f4f994e5aad5014bf3023da27f095d77',
 'NORMALIZED_PAYLOADS_EXTERNAL_ONLY.json':'1f0285a2994824097ffa581fd76ab778bcedf6870f164e6eaf0aa59a54a2ae1c'
}
def main():
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ('source-root','canon','xml','goldens','profiles','links'):p.add_argument('--'+arg,type=Path,required=True)
    p.add_argument('--raw-packet',type=Path,help='Optional deeper historical raw-v2 packet verification; portable replay does not require it')
    p.add_argument('--payloads',type=Path,help='External-only complete normalized payload comparison; never copy payloads to repository/package')
    choice=p.add_mutually_exclusive_group(required=True);choice.add_argument('--verify-only',action='store_true');choice.add_argument('--output',type=Path)
    a=p.parse_args()
    for name,path in [('GOLDENS.json',a.goldens),('EXPECTED_PROFILES.json',a.profiles),('EXPECTED_LINKS.json',a.links)]:assert sha(path.read_bytes())==NORMALIZED_SEALS[name],name+' seal differs'
    if a.payloads:assert sha(a.payloads.read_bytes())==NORMALIZED_SEALS['NORMALIZED_PAYLOADS_EXTERNAL_ONLY.json'],'external payload seal differs'
    seed=json.loads(a.goldens.read_bytes());g,pr,li,pa=collect(a.source_root,a.raw_packet,a.canon,a.xml,seed)
    assert g==seed and pr==json.loads(a.profiles.read_bytes()) and li==json.loads(a.links.read_bytes()),'source-derived normalized metadata differs'
    if a.payloads:assert pa==json.loads(a.payloads.read_bytes()),'source-derived external payload differs'
    result=dict(status='PASS; INDEPENDENT_NORMALIZATION_ONLY',baseline=BASE,eligible_ids=list(pr),totals=g['totals'],full_original_xml_blocks_exact=14645,production_parser_imports=0,runtime_release_approval=False,external_payloads_checked=bool(a.payloads),optional_deeper_raw_packet_checked=bool(a.raw_packet),metadata_sha256=NORMALIZED_SEALS)
    if a.output:a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
