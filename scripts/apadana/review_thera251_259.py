#!/usr/bin/env python3
"""Finite independent normalization of publisher251-259 GroupB. Standard library only.

No project imports and no generated scripture. Expected output comes from
original Markdown, sealed independent raw-source evidence, and original XML.
The CLI verifies sealed metadata and never writes when --verify-only is used.
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
BASE='cdbefd514164a559bc5aaab631c267f3084e31a6'
CANON='1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
XML='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
RAW_GOLDEN='0d7021a33b3588c803afaef279cfa7185182e320ef05ddae9a10d7c8684502d1'
V2_MANIFEST='782a5ce56f65036342cbf165683d3e1041fd55f3473ecfcd3a3bd0e806552ec8'
GOLDENS='6f217a19e96a6d171a4c3a171778f50bc1e973c8c74948b7751a2b9ab5cc6a2a'
PROFILES='dcb7eb11ee17006331bcbc6333e689feb8f01f44666cbb858896ad0cd3ba7332'
LINKS='e81b97b665cdec6157eb91a31d7c3857e4f03d38d53523f70ab33d927856a227'
PAYLOADS='f2a106f36f541b019d09a64b9c0c37c2391bb5da2bcc0358dc721dc0da08d0f6'
CHANGES=('Presentation extraction only: remove reviewed Markdown heading/emphasis markers and abbreviation tags; '
 'unescape literal bracket and cross-reference punctuation; render only the fourteen exact publisher253/254/256 owner-bound '
 'Pandoc display alternatives using their original diacritics-on C/c text; replace original note references with explicit note labels; '
 'remove Markdown hard-break padding while preserving every line and paragraph. Preserve wording, typography, diacritics, '
 'brackets, uncertainty, both numbering systems, both colophons and all original notes. Keep publisher251 chapter preface '
 'separate and note-free. No source wording is generated, repaired or harmonized to VRI; no Pali peyyala is expanded. '
 'Complete publisher-edition poems are not line-complete VRI translations.')
# Inventoried from originals before authoring. Exact owner/token/count only.
PAIR_COUNTS={
 (253,'poem'):{('C','Ch'):3},
 (253,'note1'):{('C','Ch'):1,('c','ch'):2},
 (253,'note3'):{('c','ch'):2},
 (254,'poem'):{('c','ch'):3},
 (254,'note1'):{('C','Ch'):1,('c','ch'):1},
 (256,'poem'):{('C','Ch'):1},
}
PAIR_TOTALS={253:8,254:5,256:1}

def sha(v):return hashlib.sha256(v.encode('utf-8') if isinstance(v,str) else v).hexdigest()
def js(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
def blob(v):return hashlib.sha1(b'blob '+str(len(v)).encode()+b'\0'+v).hexdigest()
def paras(v):return [] if not v else [dict(paragraph=i,sha256=sha(p),lines=len(p.split('\n')),characters=len(p)) for i,p in enumerate(v.split('\n\n'))]
def rootpin(uid,start,end,blocks):return sha(js(dict(id=uid,book=36,start=start,end=end,blocks=blocks[start:end])))

def present(raw,number,owner):
    # The nine exact GroupB files use only the finite pairs above and these abbreviation tags,
    # emphasis, headings, note references and three literal escape kinds.
    # Unknown/unpaired markup is refused rather than silently stripped.
    audit={}
    v=raw
    expected=PAIR_COUNTS.get((number,owner),{})
    observed={};pairs=[]
    pattern=r'\[([^\[\]\n]+)\]\{\.diacritics data-state=on\}\[([^\[\]\n]+)\]\{\.no-diacritics data-state=off\}'
    for m in re.finditer(pattern,v):
        pair=(m.group(1),m.group(2));assert pair in expected,'unreviewed exact paired-display owner/token'
        observed[pair]=observed.get(pair,0)+1
    assert observed==expected,'missing/extra paired display at this exact owner'
    for (diacritic,alternate),count in expected.items():
        token=f'[{diacritic}]{{.diacritics data-state=on}}[{alternate}]{{.no-diacritics data-state=off}}'
        assert v.count(token)==count
        pairs.append(dict(owner=owner,diacritic=diacritic,alternate=alternate,raw_sha256=sha(token),rendered_sha256=sha(diacritic),occurrences=count))
        v=v.replace(token,diacritic)
    audit['paired_display_sequences']=pairs
    for title,label in [('Pali Text Society','PTS'),('Buddha Jayanthi Tripitaka Series','BJTS')]:
        token=f'<abbr title="{title}">{label}</abbr>'
        audit[label+'_abbr']=v.count(token);v=v.replace(token,label)
    assert not re.search(r'[<>]|\{\.|&(?:#\d+|#x[0-9a-f]+|[A-Za-z]+);',v), 'unknown HTML, entity or alternate display'
    refs=re.findall(r'\[\^(\d+)\]',v)
    v=re.sub(r'\[\^(\d+)\]',r'[Note \1]',v);audit['note_references']=len(refs)
    escaped=re.findall(r'\\(.)',v)
    assert set(escaped)<=set('[]#'), 'unreviewed escape'
    for symbol in '[]#':v=v.replace('\\'+symbol,symbol)
    audit['literal_escapes']=len(escaped)
    assert '\\' not in v, 'unprocessed escape'
    headings=list(re.finditer(r'^#{2,3} ',v,re.M));audit['heading_markers']=len(headings)
    v=re.sub(r'^#{2,3} ','',v,flags=re.M)
    assert not re.search(r'^#+\s',v,re.M), 'unreviewed heading'
    emphasis=list(re.finditer(r'\*([^*\n]+)\*',v));audit['emphasis_pairs']=len(emphasis)
    v=re.sub(r'\*([^*\n]+)\*',r'\1',v)
    assert '*' not in v,'unpaired emphasis'
    audit['hard_break_padding_runs']=len(re.findall(r'[ \t]+\n',v))
    v=re.sub(r'[ \t]+\n','\n',v).strip()
    assert not re.search(r'\n{3,}',v),'unreviewed paragraph collapse'
    return v,audit

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

def collect(source_root,raw_packet,canon_path,xml_path,review_seed=None):
    if raw_packet is not None:
        # Optional deeper historical verification during independent review.
        # CI needs only the sealed metadata, original sources and original XML.
        manifest_raw=(raw_packet/'FILE_SHA256S.json').read_bytes();assert sha(manifest_raw)==V2_MANIFEST
        manifest=json.loads(manifest_raw)
        for name,expected in manifest.items():assert sha((raw_packet/name).read_bytes())==expected,(name,'raw packet seal')
        rg_raw=(raw_packet/'GOLDENS.json').read_bytes();assert sha(rg_raw)==RAW_GOLDEN
        rg=json.loads(rg_raw);rr=json.loads((raw_packet/'SOURCE_REVIEW.json').read_bytes())
        official={a['path']:a for a in rg['verified_upstream_artifacts']}
        rrights=json.loads((raw_packet/'RIGHTS_REVIEW.json').read_bytes())
    else:
        # Human-reviewed metadata is a finite source configuration, never an
        # imported production parse. All text and note hashes are independently
        # recomputed below from the exact original Markdown bytes.
        assert review_seed and review_seed['raw_source_v2_manifest_sha256']==V2_MANIFEST and review_seed['raw_scope_goldens_sha256']==RAW_GOLDEN
        rg={'poems':[q['raw_source_evidence'] for q in review_seed['poems']]}
        rr={'poems':[q['prior_full_source_review'] for q in review_seed['poems']]}
        rrights={'notice_artifacts':review_seed['rights']+[review_seed['publisher_routing']]}
        official={a['path']:a for a in review_seed['poems']}
    raw=canon_path.read_bytes()
    canon=json.loads(gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw)
    assert sha(js(canon))==CANON and canon['source']['commit']==VRI,'current canonical logical pin differs'
    blocks,xmlfacts=xml_replay(xml_path);assert blocks==canon['books'][36]['blocks'],'full current canonical book differs'
    xmlfacts.update(baseline=BASE,publisher_revision=PUB,vri_revision=VRI,canon_compact_sha256=CANON)
    units={u['id']:u for u in canon['units']};golden_by={q['publisher_poem']:q for q in rg['poems']};review_by={q['publisher_poem']:q for q in rr['poems']}
    rights=[]
    for a in rrights['notice_artifacts']:
        b=(source_root/a['path']).read_bytes();assert sha(b)==a['raw_sha256'] and blob(b)==a['git_blob_sha1']
        rights.append(artifact(a['path'],b))
    routing=next(a for a in rights if a['path']=='src/_poems/chapter-3/chapter-3.json');rights=[a for a in rights if a!=routing]
    rows=[];payloads={};profiles={};links={}
    for number in range(251,260):
        rawgold=golden_by[number];prior=review_by[number];uid=rawgold['canonical_id'];u=units[uid]
        path=f'src/_poems/chapter-3/poem-{number}.md';b=(source_root/path).read_bytes();assert sha(b)==rawgold['raw_sha256'];assert sha(b)==official[path]['raw_sha256'] and blob(b)==official[path]['git_blob_sha1'],'immutable official artifact differs';raw=b.decode('utf-8');assert '\r' not in raw
        fm=re.fullmatch(r'---\n(.*?)\n---\n(.*)',raw,re.S);assert fm
        front,rest=fm.groups();assert re.search(r'^order: '+str(number)+'$',front,re.M) and re.search(r'^category: chapter-3$',front,re.M)
        title=re.search(r'^title: (.+)$',front,re.M).group(1);assert title==rawgold['publisher_title']
        rest=rest.strip();at=re.search(r'^\[\^\d+\]:',rest,re.M).start();before=rest[:at].strip();definitions=rest[at:]
        entries=list(re.finditer(r'^\[\^(\d+)\]:[ \t]*(.*?)(?=^\[\^\d+\]:|\Z)',definitions,re.M|re.S))
        allnotes=[];note_goldens=[];audits=[]
        for i,e in enumerate(entries):
            n=int(e.group(1));assert n==i+1
            note_raw=e.group(2).strip();note,audit=present(note_raw,number,f'note{n}');audits.append(dict(owner='note',number=n,**audit))
            assert rawgold['notes'][i]['number']==n and rawgold['notes'][i]['owner']=='poem'
            assert sha(e.group(0).strip('\n'))==rawgold['notes'][i]['raw_definition_sha256']
            allnotes.append(dict(number=n,text=note))
            anchor_lines=[i+1 for i,line in enumerate(raw.splitlines()) if f'[^{n}]' in line and not line.startswith(f'[^{n}]:')]
            note_goldens.append(dict(number=n,owner='poem',raw_sha256=sha(note_raw),body_sha256=sha(note),paragraph_count=len(paras(note)),paragraphs=paras(note),lines=len(note.splitlines()),anchor_lines=anchor_lines,complete_raw_definition_sha256=rawgold['notes'][i]['raw_definition_sha256']))
        assert len(allnotes)==len(rawgold['notes'])
        summary_raw='';assert '\n\nThe Summary' not in before,'GroupB excludes held260 summary'
        bodypart=before
        heads=list(re.finditer(r'^### ',bodypart,re.M));assert len(heads)==1
        split=heads[0].start();preface_raw=bodypart[:split].strip();body_raw=bodypart[split:].strip()
        assert bool(preface_raw)==(number==251)
        assert sha(body_raw)==rawgold['body_raw_sha256'] and sha(preface_raw)==rawgold['preface_raw_sha256'] and sha(summary_raw)==rawgold['chapter_apparatus_raw_sha256']
        assert set(map(int,re.findall(r'\[\^(\d+)\]',body_raw)))==set(n['number'] for n in allnotes)
        assert not re.search(r'\[\^\d+\]',preface_raw+summary_raw)
        text,ba=present(body_raw,number,'poem');preface,pa=present(preface_raw,number,'preface');summary,sa=present(summary_raw,number,'summary')
        audits.extend([dict(owner='poem',**ba),dict(owner='preface',**pa),dict(owner='summary',**sa)])
        pp=text.split('\n\n');assert len(pp)==rawgold['body_paragraphs']
        assert pp[0]==f'[{number}. {title}[Note 1]]'
        assert pp[-2]==f'Thus indeed Venerable {title} Thera spoke these verses.'
        assert pp[-1]==f'The legend of {title} Thera is finished.'
        layout=[]
        for i,p in enumerate(pp[1:-2]):
            m=re.search(r'\((\d+)\) \[(\d+)\]$',p);assert m
            assert m.group(1)==str(i+1) and len(p.splitlines())==4
            rawstanza=rawgold['stanzas'][i];assert (m.group(1),m.group(2))==(rawstanza['local_label'],rawstanza['global_label'])
            layout.append(dict(local_label=m.group(1),publisher_label=m.group(2),suffix=m.group(),lines=4))
        assert len(layout)==len(rawgold['stanzas'])
        start,end=u['start'],u['end'];assert [start,end]==rawgold['canonical_bounds']
        speech=[i for i in range(start,end) if blocks[i][0]=='bodytext' and blocks[i][2].startswith('Itthaṃ sudaṃ')];assert len(speech)==1
        legend=speech[0]+1;assert blocks[legend][0]=='centre' and 'therassāpadānaṃ' in blocks[legend][2]
        sg=segments(uid,start,end,blocks);root_numbers=[int(blocks[i][1]) for i in range(start,legend+1) if blocks[i][0]=='hangnum']
        root=dict(id=uid,book=36,start=start,end=end,title=u['title'],root_sha256=rootpin(uid,start,end,blocks),root_verses=[root_numbers[0],root_numbers[-1]],numbered_stanza_count=len(root_numbers),vri=u['vri'],index_revision=u.get('index_revision'),first_ref=sg[0]['ref'],last_ref=sg[-1]['ref'],segments=sg)
        observed_limits=list(prior['observed_limits'])
        # Preserve historical raw review; new caveats state only finite derivation.
        if number==253:
            observed_limits=[prior['observed_limits'][0], 'Exactly eight paired Pandoc display alternatives retain original diacritics-on C/c forms: heading and both colophons, three in note1 and two in note3. Only these owner/token/count combinations qualify; no general HTML syntax is approved. Notes1–4 remain poem-owned.']
        if number==254:
            observed_limits=[prior['observed_limits'][0], 'Exactly five paired Pandoc display alternatives retain original diacritics-on C/c forms in the heading, both colophons and twice in note1. Preserve botanical names, source spellings and uncertainty; no general HTML syntax is approved. Notes1–3 remain poem-owned.']
        if number==256:
            observed_limits=[*prior['observed_limits'][:2], 'The sole uppercase C/Ch paired display in publisher local1 retains original diacritics-on C. Its original temporal Awakening interpretation and elided title stay unchanged. Notes1–2 remain poem-owned; no other paired owner or token is approved.']
        pair_inventory=[pair for audit in audits for pair in audit.get('paired_display_sequences',[])]
        assert sum(pair['occurrences'] for pair in pair_inventory)==PAIR_TOTALS.get(number,0)
        notes=list(range(1,len(allnotes)+1));mapping_notes=[
          'Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Preserve independent VRI wording and all explicit edition differences; do not infer missing words, stanza equivalence or other mappings by number.',
          f'Explicit full-source narrative/title/colophon review maps publisher chapter-3 poem {number} to canonical {uid}. Shared numbers alone do not establish any other mapping.',*observed_limits]
        row=artifact(path,b)|dict(id=uid,publisher_chapter='chapter-3',poem=number,title=title,source_scope_decision='APPROVE exact normalized complete publisher-edition poem and separately owned apparatus; conditional on independent final review and runtime/CI gates. NOT line-complete VRI.',narrative_identity=prior['narrative_identity'],prior_full_source_review=prior,raw_source_evidence=rawgold,vri_peyyala_blocks=prior['vri_peyyala_blocks'],identity_basis='Sealed independent v2 full-source narrative/title/colophon/variant/neighbor review reused; every resulting displayed stanza and note compared against original Markdown.',front_matter_raw_sha256=sha(front),source_raw_body_sha256=sha(body_raw),raw_definitions_sha256=sha(definitions),body_sha256=sha(text),notes_sha256=sha(js(allnotes)),paratext_sha256=sha(preface),body_paragraphs=paras(text),physical_stanza_count=len(layout),printed_local_verse_label_count=len(layout),complete_raw_body_before_definitions_sha256=sha(before),complete_raw_body_before_definitions_paragraph_count=len(before.split('\n\n')),stanza_layout=layout,note_count=len(allnotes),original_note_count=len(allnotes),note_numbers=notes,notes=note_goldens,original_raw_body_paragraph_count=len(body_raw.split('\n\n')),normalized_body_paragraph_count=len(pp),publisher_preface=dict(raw_sha256=sha(preface_raw),body_sha256=sha(preface),paragraph_count=len(paras(preface)),paragraphs=paras(preface),notes_sha256=sha('[]'),note_numbers=[]),publisher_divisions=[],presentation_recipe=dict(independent_extractor=True,no_project_parser_imported=True,exact_raw_pin_required=True,paired_markdown_display_inventory=pair_inventory,speech_colophon_sha256=sha(pp[-2]),legend_colophon_sha256=sha(pp[-1]),colophons_share_physical_paragraph=False,joined_colophon_paragraph_sha256=None,source_wording_repaired=False,changes=CHANGES,operations=audits),root=root,mapping_notes=mapping_notes,poem_only_root_sha256=rootpin(uid,start,legend+1,blocks),finite_parser_exceptions_needed=([f'exact paired-display owner {uid}; preserve finite original owner/token/count inventory'] if number in PAIR_TOTALS else ['exact own-ID note-free chapter preface owner tha-ap253'] if number==251 else []),source_approval=True,normalization_approval=True,activation=False)
        neighboring_units=[other for other in units.values() if other['book']==36 and (other['end']==start or other['start']==end)]
        assert len(neighboring_units)==2
        row['neighbors']=[dict(id=other['id'],title=other['title'],start=other['start'],end=other['end'],root_sha256=rootpin(other['id'],other['start'],other['end'],blocks),first_last_heading_hashes=[sha(blocks[other['start']][2]),sha(blocks[other['end']-1][2])]) for other in sorted(neighboring_units,key=lambda u:u['start'])]
        payload=dict(title=title,text=text,translator_notes=allnotes,publisher_paratext=preface,changes=CHANGES)
        profile={k:row[k] for k in ('exact_ref_url','id','publisher_chapter','poem')}
        profile.update(verses=[int(layout[0]['publisher_label']),int(layout[-1]['publisher_label'])],root_verses=root['root_verses'],note_count=len(allnotes),note_numbers=notes,source='apadana',path=f'/text/chapter-3/poem-{number}/',url=f'https://apadanatranslation.com/text/chapter-3/poem-{number}/',raw_url=row['raw_url'],translator='Jonathan S. Walters',license='CC BY-NC-SA 4.0',translation_revision=PUB,title=title,reference=f'Therā Apadāna publisher poem {number}; complete publisher-edition poem; original numbering retained',raw_sha256=sha(b),body_sha256=sha(text),notes_sha256=sha(js(allnotes)),paratext_sha256=sha(preface),root_sha256=root['root_sha256'],stanza_layout=layout,mapping_notes=mapping_notes)
        profiles[uid]=profile;links[uid]=profile|dict(english=title,match='individually-reviewed-whole-poem');rows.append(row);payloads[uid]=payload
    totals=dict(poems=9,physical_publisher_stanzas=sum(p['physical_stanza_count'] for p in rows),printed_local_label_occurrences=sum(p['printed_local_verse_label_count'] for p in rows),vri_numbered_stanzas=sum(p['root']['numbered_stanza_count'] for p in rows),body_paragraphs=sum(len(p['body_paragraphs']) for p in rows),original_raw_body_paragraphs=sum(p['original_raw_body_paragraph_count'] for p in rows),poem_notes=sum(p['note_count'] for p in rows),original_notes=sum(p['original_note_count'] for p in rows),preface_notes=0,summary_notes=0,collection_summary_notes=0,source_blobs=9,rights_blobs=len(rights),routing_blobs=1,audio_fetches=0,normalization_approvals=9,external_activations=0)
    assert (totals['body_paragraphs'],totals['physical_publisher_stanzas'],totals['printed_local_label_occurrences'],totals['poem_notes'])==(63,36,36,34)
    goldens=dict(review_type='Independent sealed raw-source review reused, plus independent finite standard-library normalization. Metadata/hashes only; no production parser output imported.',baseline=BASE,publisher_revision=PUB,vri_revision=VRI,raw_source_v2_manifest_sha256=V2_MANIFEST,raw_scope_goldens_sha256=RAW_GOLDEN,rights=rights,publisher_routing=routing,rights_decision='Exact text, notes and textual apparatus under Walters/Whitman CC BY-NC-SA4.0. Preserve attribution, source/revision, complete notices, noncommercial/share-alike and changes notice. Generic CC BY4.0 site metadata does not relax specific terms. All English live-only; metadata/hashes only packaged. No media rights.',totals=totals,poems=rows,original_vri_replay=xmlfacts)
    goldens['held_scope_exclusions']=[dict(publisher_poem=260,canonical_id='tha-ap262',reason='Malformed summary/note5 remains separate held evidence; no poem or summary activation here'),dict(publisher_poem=234,canonical_id='tha-ap236',reason='Separate identity hold; outside GroupB'),dict(canonical_id='tha-ap3',reason='Separate note-only XML omission evidence; no repair authorized')]
    goldens['original_v2_amendment257_retained']=next(p for p in rows if p['poem']==257)['prior_full_source_review']['observed_limits'][-1]
    return goldens,profiles,links,payloads

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for arg in ('source-root','canon','xml','goldens','profiles','links'):p.add_argument('--'+arg,type=Path,required=True)
    p.add_argument('--raw-packet',type=Path,help='Optional historical v2 packet; not required by portable CI replay')
    p.add_argument('--payloads',type=Path,help='Optional external-only normalized payload comparison; never package these bodies')
    group=p.add_mutually_exclusive_group(required=True);group.add_argument('--verify-only',action='store_true');group.add_argument('--output',type=Path)
    a=p.parse_args();gb=a.goldens.read_bytes();pb=a.profiles.read_bytes();lb=a.links.read_bytes()
    assert sha(gb)==GOLDENS and sha(pb)==PROFILES and sha(lb)==LINKS,'normalized metadata seals differ'
    g,profiles,links,payloads=collect(a.source_root,a.raw_packet,a.canon,a.xml,json.loads(gb))
    assert g==json.loads(gb) and profiles==json.loads(pb) and links==json.loads(lb),'independent normalization differs'
    if a.payloads:
        payload_bytes=a.payloads.read_bytes()
        assert sha(payload_bytes)==PAYLOADS and payloads==json.loads(payload_bytes),'external comparison payload differs'
    result=dict(status='PASS; INDEPENDENT_NORMALIZATION_ONLY',baseline=BASE,goldens_sha256=sha(gb),profiles_sha256=sha(pb),links_sha256=sha(lb),external_payloads_checked=bool(a.payloads),totals=g['totals'],full_original_xml_blocks_exact=14645,production_parser_imports=0,runtime_release_approval=False)
    if a.output:a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':main()
