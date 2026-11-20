#!/usr/bin/env python3
"""Original-first, stdlib-only, metadata-only review of selected publisher 301--310.
No translated body or Pali payload is ever written or printed.
"""
import argparse, gzip, hashlib, html, json, re
from pathlib import Path
import xml.etree.ElementTree as ET

REV='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
CANON='1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
XML='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
SPECS={
301:('Padumakesariya',303,9046,9062,'bfcec617ee5987e83bfb8f7577212a6d2ba12d8723e2d266438bde3eb750ca7c',6,[(1,1),(2,2),(3,3),(4,4)],2717),
302:('Sabbagandhiya',304,9062,9076,'d917549c9e0b73e3ca1d9813f3191571cc005cf3df5391cf981ac815300581fa',3,[(1,1),(2,2),(3,3),(4,4)],2721),
303:('Paramannadāyaka',305,9076,9090,'3e14bdff87cdd14d8b5d82c6dfffb15b44db4da9c8b2f2903439407232169f75',3,[(1,1),(2,2),(3,3),(4,4)],2725),
304:('Dhammasaññaka',306,9090,9113,'42019b58ec5d47b70a11a45e35c57f766d77e1f7706eac1233425e81570c16cd',7,[(1,1),(2,2),(3,3),(4,4),(5,5),(6,6),(7,7)],2729),
305:('Phaladāyaka',307,9113,9127,'a5d7840990e96df7d0a0721c7801c560c8bb987eeb9d9cd4f09572e953a48a6a',3,[(1,1),(2,2),(3,3),(4,4)],2736),
308:('Anulepadāyaka',310,9176,9190,'a0294e61e20e01f34c013bd2f12781116ce6f469dce8a515b063b100a8d06818',1,[(1,1),(2,2),(3,3),(4,4)],2755),
309:('Buddhasaññaka',311,9190,9204,'e24177fc5986ce7220c72731e93f07ebff8f47d1b19f3b27de0d9ce6241ec620',1,[(1,2),(3,3),(4,4)],2759),
310:('Pabbhāradāyaka',312,9204,9226,'f96bb36873c528c5fc05128c415978bbb2ae0f0c32b7e4dd0f49d7f3af0dffe6',8,[(1,1),(2,3),(4,4),(5,5)],2763)}

RIGHTS={
'LICENSE.md':'66eea18fe8cb99e0d178d838a4932be0d3af8a6f844e933a8bbb0054e22f2592',
'src/_pages/about.md':'17d8029419cd7b4c7f9e7f88d0127141d2425b3fe30516888b389ce7521f1352',
'src/_includes/site/footer.njk':'08a7d4a0c3a9841afa38a8d98aa563e0ddedc6228f66e86b9a49d564aba26fd4',
'src/_includes/layouts/epub-metadata.xml':'1a6320b1580b76112c63bd557e419d5816b410197da666444e9d412327430b2f',
'src/_data/site.json':'6b4b5b5661b1bfb35cee0f207066fd6941aa042d6377993b02c77db677319efa',
'src/_poems/_poems.json':'7c0d9a568ff9c495c89fb3ae13397ff71e8e1d678c221cca5966c9adc886cf22'}
CAVEATS={
301:['Original publisher file has no chapter heading/preface despite VRI chapter heading at9046; do not invent translated paratext.','Elephant lotus-pollen narrative and plural Pacceka/Self-Enlightened Victors identify this poem; do not substitute the separate opening Paccekabuddha work or a named Buddha.','Preserve note4 literal Or glossary? and note5 literal xxx with all alternative readings of whose pleasure is meant; no editorial resolution.','Notes3/5/6 attribute commentary interpretations and presumed meditating context; do not promote that apparatus to root facts. Retain literal ŋ in mahesīnaŋ and all three exact cc/chch state-on choices.'],
302:['Preserve the original garland/cloth/perfumes wording together; actual VRI stanza6 has vattha with recorded gandhamadadiṃ (syā.) variant, not a correction of the publisher.','Original state-on ruler name Sucela differs from actual VRI suceḷo; preserve the source nonretroflex l and fifteenth-aeon ruler wording without harmonization.','Original name-note crossreference to publisher40 is not another source mapping or consent to substitute translations.'],
303:['Milk-rice is the publisher/Sinhala-tradition interpretation of paramanna; retain complete alternatives including outstanding food and coconut/cow-milk discussion in both notes1 and3 without deduplicating or resolving them.','Keep the full dinner-plate-tree/botanical note2 and its uncertainty; its Siddhattha Bodhi-tree aside does not change this poem’s explicitly named Vipassi recipient.','Actual VRI paramanna forms and recorded variants remain separate edition evidence; no wording or food reconstruction.'],
304:['Note2 treats BJTS vocatives as typos as the translator’s opinion only; retain all source wording alongside actual VRI stanza13 and its recorded alternatives without canonical repair.','Preserve complete note3 manuscript/readings discussion, both c/ch display pairs, literal greater-than sign and source vācā/āsabhī choices; no unrecorded variant inferred.','Note4 retains all alternative vivatta-cchada epithet interpretations and commentary about open-fisted teaching; note5 retains purified/extinguished/quenched alternatives without resolution.','Note6 follows BJTS dhamma-saññā over PTS dhamma-dāna and includes original recipent spelling; actual VRI result reads dhammasavassidaṃ with no such recorded variant at that block. Preserve independent editions.','Publisher Sutava lacks the final ā in actual VRI Sutavā; retain source name and thirty-third-aeon wording without normalization.'],
305:['Repeated Phaladāyaka title is identified only by this Bhāgīrathī-hermitage/Vipassi fruit narrative and exact boundaries; do not borrow another fruit-donor source.','Preserve note1 literal more? xxx and all crossreferences; note2 distinguishes source BJTS Bhāgīrathī from PTS Bhāgīrasī, while actual VRI main has Bhāgīrathī with no recorded river-name variant there.','Publisher rayless/vītaraṃsa in note3 differs from actual VRI pītaraṃsiṃva yellow-rayed wording with no recorded vīta variant; preserve both without inferred correction.'],
308:['The original gift recipient is a follower/monk of Atthadassi during boundary repairs, not Atthadassi himself; preserve that distinction and original1800aeon wording.','Ointment, boundary and merit-field wording remains the publisher’s interpretation of the exact root; no inferred substance or recipient identity.'],
309:['Keep one eight-line entry for local1–2/global2759–2760; source reorders the dream/Siddhattha and sun/forest material across actual VRI43–44, so scope is not line equivalence.','Publisher rayless sun differs from actual VRI pītaraṃsiṃva yellow-rayed phrase; there is no recorded vīta variant at that block.','Publisher approached the Well-Gone Buddha differs from actual VRI sugatiṃ upapajjahaṃ in stanza44; retain both independently without reconstructing words or asserting an unrecorded variant.'],
310:['Poem notes1–7 remain separate from chapter-summary note8; summary and chapter closing stay outside poem body and verse quotations.','Preserve the eight-line combined local2–3/global2764–2765 entry, mil-kaṇḍa/cent-bheṇḍu neologisms, obscure-measure alternatives and all question marks; no conversion or editorial resolution.','Note3 follows BJTS bheṇḍu versus PTS geṇḍu; actual VRI satabheṇḍu has recorded satageṇḍu (syā. ka.) variant. Preserve independent readings and uncertainty, not inferred measurement equivalence.','Summary prints49(one less than fifty), while actual chapter/global labels and VRI number51. Preserve original49 without correction. The complete summary enumerates all10 poems including held306/307; only this8-poem/36-label subset is approved, not wholechapter31 coverage.','Source summary Lomaka differs from actual VRI lepako, and publisher Padumakesariya chapter-name differs from VRI Padumakesaravagga; retain the original names, order and separately owned note8.']}

def sha(b): return hashlib.sha256(b if isinstance(b,bytes) else b.encode('utf-8')).hexdigest()
def compact(o): return json.dumps(o,ensure_ascii=False,separators=(',',':')).encode('utf-8')
def meta(s): return {'sha256':sha(s),'chars':len(s),'lines':len(s.splitlines()) if s else 0}
def norm(s):
    # Only originally observed complementary Pandoc spelling forms are accepted.
    pattern=r'\[([^\[\]\n]+)\]\{\.diacritics data-state=on\}\[([^\[\]\n]+)\]\{\.no-diacritics data-state=off\}'
    for m in re.finditer(pattern,s): assert (m[1],m[2]) in {('c','ch'),('cc','chch')}, 'unapproved spelling form'
    s=re.sub(pattern,lambda m:m[1],s)
    s=re.sub(r'<abbr title="[^"]+">([^<]+)</abbr>',r'\1',s)
    s=re.sub(r'\[\^(\d+)\]',lambda m:'[Note '+m[1]+']',s)
    s=re.sub(r'\\([\[\]#])',r'\1',s).replace('*','')
    s=html.unescape(s)
    s='\n'.join(line.rstrip() for line in s.strip().splitlines())
    assert not re.search(r'\{\.diacritics|data-state=|<[^>]+>|\[\^',s), 'unhandled source markup'
    return s

def inner(e):
    return (e.text or '')+''.join(('' if x.tag in {'note','pb'} else inner(x))+(x.tail or '') for x in e)
def xmltuple(e):
    body=' '.join(inner(e).split()); kind=e.attrib.get('rend',''); n=e.attrib.get('n')
    notes=[' '.join(''.join(x.itertext()).split()) for x in e.iter('note')]
    pages={}
    for x in e.iter('pb'):
        q=x.attrib['n']; q='.'.join(str(int(z)) for z in q.split('.'))
        pages.setdefault(x.attrib['ed'],[]).append(q)
    if kind=='hangnum': assert re.fullmatch(r'\d+\.',body); n=body[:-1]; body=''
    return [kind,n,body,notes,pages]

def derive(source_root,canon_path,xml_path,tree_path=None):
    root=Path(source_root); cr=Path(canon_path).read_bytes()
    if cr[:2]==b'\x1f\x8b': cr=gzip.decompress(cr)
    assert sha(cr)==CANON,'canon pin'
    canon=json.loads(cr); blocks=canon['books'][36]['blocks']; assert len(blocks)==14645
    xr=Path(xml_path).read_bytes(); assert sha(xr)==XML,'XML pin'; decoded=xr.decode('utf-16')
    nodes=[e for e in ET.fromstring(xr).iter() if e.tag in {'p','head','trailer'}]
    assert len(nodes)==14646 and xmltuple(nodes[1130])==['gatha1',None,'',['imā dve gāthāyo syāmapotthake na santi'],{}]
    represented=[xmltuple(e) for i,e in enumerate(nodes) if i!=1130]
    assert represented==blocks,'all 14645 canonical XML tuple comparison'
    raw_nodes=list(re.finditer(r'<(p|head|trailer)\b[^>]*>.*?</\1>',decoded,re.S));assert len(raw_nodes)==len(nodes)
    rights=[]
    for path,pin in RIGHTS.items():
        b=(root/path).read_bytes(); assert sha(b)==pin,'rights pin'
        rights.append({'path':path,'bytes':len(b),'sha256':pin,'git_blob_sha1':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()})
    tree=json.loads(Path(tree_path).read_text()) if tree_path else None
    if tree: assert tree['sha']=='be2d0cf3fe0cb19938243c2f218a6150484025c0' and tree['truncated'] is False
    facts={}; buffers={}
    for pub,(title,uid,a,b,pin,ncount,labels,global_first) in SPECS.items():
        path=f'src/_poems/chapter-3/poem-{pub}.md'; raw=(root/path).read_bytes(); assert sha(raw)==pin,'raw source pin'
        blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
        if tree: assert any(e['path']==path[4:] and e['sha']==blob and e['size']==len(raw) for e in tree['tree']),'tree membership'
        text=raw.decode('utf-8'); fm=re.match(r'^---\ntitle: ([^\n]+)\norder: (\d+)\ncategory: chapter-3\n---\n',text)
        assert fm and fm[1]==title and int(fm[2])==pub
        payload=text[fm.end():]; cut=re.search(r'^\[\^1\]:',payload,re.M);assert cut
        prose=payload[:cut.start()].strip(); defs=payload[cut.start():]
        summary_raw=''
        if pub==310:
            marker='\n\nThe Summary:\n\n'; assert prose.count(marker)==1
            prose,tail=prose.split(marker); summary_raw='The Summary:\n\n'+tail
        notes=[]; note_ownership=[]
        for m in re.finditer(r'^\[\^(\d+)\]: (.*?)(?=\n\n\[\^\d+\]:|\Z)',defs,re.M|re.S):
            number=int(m[1]); value=norm(m[2]);notes.append({'number':number,'text':value})
            start=payload.index(m[0],cut.start())+fm.end(); line=text.count('\n',0,start)+1
            note_ownership.append({'number':number,'owner':'chapter_summary' if pub==310 and number==8 else 'poem_title' if number==1 else 'poem','definition_lines':[line,line+m[0].count('\n')],'text_sha256':sha(value),'chars':len(value)})
        assert [x['number'] for x in notes]==list(range(1,ncount+1))
        all_notes=notes; all_note_ownership=note_ownership; summary_notes=[x for x in all_notes if pub==310 and x['number']==8]
        notes=[x for x in all_notes if not (pub==310 and x['number']==8)]; note_ownership=[x for x in all_note_ownership if x['owner']!='chapter_summary']
        poem_numbers=[x['number'] for x in notes]; refs=[int(x) for x in re.findall(r'\[\^(\d+)\]',prose)]; assert sorted(refs)==poem_numbers, 'every poem note referenced exactly once'
        summary=norm(summary_raw); summary_pars=summary.split('\n\n') if summary else []; assert [int(x) for x in re.findall(r'\[\^(\d+)\]',summary_raw)]==[x['number'] for x in summary_notes]
        if pub==310: assert len(summary_pars)==3 and [len(x.splitlines()) for x in summary_pars]==[1,6,1]
        pars=re.split(r'\n\s*\n',prose); paratext=''
        assert pars[0].startswith('### ') and f'\\[{pub}. ' in pars[0]
        pars[0]=pars[0][4:]; ps=[norm(p) for p in pars]; body='\n\n'.join(ps)
        assert len(ps)==len(labels)+3 and len(ps[-2].splitlines())==len(ps[-1].splitlines())==1
        entries=[]
        u=next(u for u in canon['units'] if u['id']==f'tha-ap{uid}');assert (u['book'],u['start'],u['end'])==(36,a,b)
        markers=[(i,int(blocks[i][1])) for i in range(a,b) if blocks[i][0]=='hangnum']
        assert len(markers)==sum(y-x+1 for x,y in labels)
        for idx,((lo,hi),p) in enumerate(zip(labels,ps[1:-2]),1):
            g0=global_first+lo-1;g1=global_first+hi-1
            local=str(lo) if lo==hi else f'{lo}-{hi}'; glob=str(g0) if g0==g1 else f'{g0}-{g1}'
            suffix=f'({local}) [{glob}]'; assert p.endswith(suffix)
            q=re.sub(r'\[Note \d+\]','',p[:-len(suffix)]).rstrip()
            assert len(p.splitlines())==4*(hi-lo+1)
            corresponding=[]
            for localno in range(lo,hi+1):
                start,num=markers[localno-1];end=markers[localno][0] if localno<len(markers) else next(i for i in range(start+1,b) if blocks[i][0]=='bodytext')
                corresponding.append({'canonical_marker':num,'block_range':[start,end],'canonical_tuple_sha256':sha(compact(blocks[start:end])),'root_text_sha256':sha('\n'.join(t[2] for t in blocks[start:end] if t[2])),'variant_note_sha256s':[sha(n) for t in blocks[start:end] for n in t[3]]})
            entries.append({'index':idx,'local_labels':list(range(lo,hi+1)),'global_labels':list(range(g0,g1+1)),'body_paragraph_index':idx,'lines':len(p.splitlines()),'text_sha256':sha(p),'quotation_sha256':sha(q),'quotation_chars':len(q),'pali_scope_correspondences':corresponding,'word_or_line_equivalence_proven':False})
        rp=sha(compact({'id':u['id'],'book':36,'start':a,'end':b,'blocks':blocks[a:b]}))
        start=raw_nodes[a+1].start();end=raw_nodes[b].end();xmlpart=decoded[start:end].encode('utf-16-le')
        raw_start=2+len(decoded[:start].encode('utf-16-le'));raw_end=raw_start+len(xmlpart)
        facts[u['id']]={'publisher_number':pub,'title':title,'frontmatter_order':pub,'source_path':path,'raw_sha256':pin,'raw_bytes':len(raw),'git_blob_sha1':blob,'route':f'/text/chapter-3/poem-{pub}/','canonical_unit':u,'root_sha256':rp,'root_canonical_tuple_sha256':sha(compact(blocks[a:b])),'xml':{'physical_element_range_inclusive':[a+1,b],'source_line_range':[decoded.count('\n',0,start)+1,decoded.count('\n',0,end)+1],'raw_utf16le_byte_range':[raw_start,raw_end],'raw_utf16le_sha256':sha(xmlpart),'et_serialized_utf8_sha256':sha(b''.join(ET.tostring(x,encoding='utf-8') for x in nodes[a+1:b+1])),'raw_domain':'exact original UTF16LE element range; no BOM; includes original inter-element source bytes'},'neighbor_units':{'before':next(v for v in canon['units'] if v['book']==36 and v['end']==a),'after':next(v for v in canon['units'] if v['book']==36 and v['start']==b)},'body':{**meta(body),'paragraphs':len(ps),'paragraph_sha256s':[sha(p) for p in ps],'paragraph_lines':[len(p.splitlines()) for p in ps]},'notes':{'count':len(notes),'json_sha256':sha(compact(notes)),'numbers':refs,'ownership':note_ownership},'paratext':{**meta(paratext),'kind':'bare_chapter_heading' if paratext else 'none','notes':[],'paragraph_sha256s':[sha(paratext)] if paratext else [],'paragraphs':int(bool(paratext))},'summary':{**meta(summary),'paragraphs':len(summary_pars),'paragraph_sha256s':[sha(x) for x in summary_pars],'paragraph_lines':[len(x.splitlines()) for x in summary_pars],'note_numbers':[x['number'] for x in summary_notes],'notes_sha256':sha(compact(summary_notes)),'note_text_sha256s':[{'number':x['number'],'sha256':sha(x['text'])} for x in summary_notes],'canonical_block_range':[9221,9226] if pub==310 else None,'canonical_tuple_sha256':sha(compact(blocks[9221:9226])) if pub==310 else None},'entries':entries,'entry_count':len(entries),'label_count':sum(hi-lo+1 for lo,hi in labels),'colophon_paragraphs':[len(ps)-2,len(ps)-1],'caveats':CAVEATS[pub],'complete_publisher_edition_poem':True,'line_complete_vri_translation':False,'all_note_definitions':all_note_ownership,'original_note_count':len(all_notes),'source_and_normalization_only':True,'audio_front_matter_present':False,'audio_or_media_approval':False}
        buffers[u['id']]={'body':body,'paragraphs':ps,'notes':notes,'all_notes':all_notes,'paratext':paratext,'summary':summary,'summary_raw':summary_raw,'summary_paragraphs':summary_pars,'summary_notes':summary_notes}
    assert sum(f['body']['paragraphs'] for f in facts.values())==58
    assert sum(f['entry_count'] for f in facts.values())==34
    assert sum(f['label_count'] for f in facts.values())==36
    assert sum(f['notes']['count'] for f in facts.values())==31
    return {'status':'ORIGINAL_FIRST_FACTS_SEALED_BEFORE_PROFILE_SCHEMA_OR_PEER_OUTPUTS','publisher_revision':REV,'source_root_policy':'original artifacts, not source-prep mapping as oracle','canon_sha256':CANON,'xml_sha256':XML,'vri_revision':'2d134ff9ef60f70a1eb03c9370580228811a3070','all_xml_tuple_count':14645,'separate_note_only_omission_unchanged':1130,'tree_membership_verified':bool(tree),'rights_artifacts':rights,'rights_applicability':{'translation_license':'CC BY-NC-SA 4.0','license_url':'https://creativecommons.org/licenses/by-nc-sa/4.0/','creator':'Jonathan S. Walters','publisher':'Jonathan S. Walters and Whitman College','specific_notices_override_generic_site_CC_BY_metadata':True,'retain':['attribution','copyright','license URI','disclaimer','source URI and revision','truthful extraction and prior-change notices'],'requirements':['noncommercial','sharealike','no endorsement','no downstream restrictions'],'app_policy':'consent-gated live-only English; metadata and hashes only in repository/package','audio_fonts_images_other_media_approved':False},'poems':facts,'normalization_policy':['exact publisher words, punctuation, case, Unicode retained','choose exact observed state-on complementary spelling member','drop Markdown presentation markers, retain literal brackets and unfinished xxx','footnote references become [Note N]; ordered note definitions remain poem-owned','chapter heading remains separate editorial paratext','only stanza text without references/printed numbering is quotation scope','Pali correspondence is identity/boundary evidence, not word/line equivalence'],'totals':{'poems':8,'body_paragraphs':58,'entries':34,'labels':36,'notes':31,'summary_notes':1,'original_note_definitions':32,'paratext_headings':0,'summaries':1},'excluded_publishers':[260,266,280],'runtime_approval':False,'release_approval':False},buffers

def write_new(path,obj):
    with Path(path).open('x',encoding='utf-8') as f: f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
import sys
original=sys.modules[__name__]
sha=original.sha
compact=original.compact
FACTS_PIN='f7a8355557cecb81877a59d88812b91964807435790a07b4ca84dd448368b089'
NARRATIVES={
301:'Elephant lotus-pollen offering to plural Pacceka/Self-Enlightened Victors; ninety-one aeons; complete attainment formula retained in this first chapter poem.',
302:'Garland, perfumes and finest silk-cloth offering to Vipassi; ninety-one aeons; Sucela ruler in the fifteenth aeon.',
303:'Vipassi dinner-plate-tree/sun simile, invited home and offered paramanna interpreted as milk-rice; ninety-one aeons; full food and botanical alternatives retained.',
304:'Vipassi Bodhi-tree festival and summary/extended truth teaching; listener turns north; ninety-one aeons; Sutava in the thirty-third aeon.',
305:'Bhāgīrathī river hermitage fruit offering to Vipassi; ninety-one aeons. Distinct narrative and boundaries identify this repeated title.',
308:'Ointment gift to a follower of Atthadassi during boundary repairs; eighteen hundred aeons; recipient is not the Buddha himself.',
309:'Dream of Siddhattha followed by hundred-rayed/rayless rising sun and forest narrative; local1–2 form one eight-line entry; ninety-four aeons.',
310:'Cave cleaning and water-pot gift to Piyadassi; gold-post/gem prophecy and heaven result form paired local2–3; Susuddha in the thirty-second aeon. Separate chapter summary and note8 follow both poem colophons.'}

def final_metadata(facts,buffers,source_root,canon_path,xml_path):
    cr=Path(canon_path).read_bytes()
    if cr[:2]==b'\x1f\x8b':cr=gzip.decompress(cr)
    canon=json.loads(cr); blocks=canon['books'][36]['blocks']; xr=Path(xml_path).read_bytes();decoded=xr.decode('utf-16')
    nodes=[e for e in ET.fromstring(xr).iter() if e.tag in {'p','head','trailer'}]
    raw_nodes=list(re.finditer(r'<(p|head|trailer)\b[^>]*>.*?</\1>',decoded,re.S))
    def xmlproof(a,b):
        start=raw_nodes[a+1].start();end=raw_nodes[b].end();part=decoded[start:end].encode('utf-16-le');bs=2+len(decoded[:start].encode('utf-16-le'))
        return {'canonical_block_range':[a,b],'XML_physical_element_range_zero_based':[a+1,b+1],'range_convention':'half-open','raw_UTF16LE_byte_range':[bs,bs+len(part)],'raw_UTF16LE_sha256':sha(part),'ET_serialization_sha256':sha(b''.join(ET.tostring(e,encoding='utf-8') for e in nodes[a+1:b+1])),'ET_domain':'ElementTree UTF8 serialization includes tails; distinct from exact raw UTF16LE source slice and normalized canonical tuples.'}
    profiles={};links={};rows=[]
    pairpat=r'\[([^\[\]\n]+)\]\{\.diacritics data-state=on\}\[([^\[\]\n]+)\]\{\.no-diacritics data-state=off\}'
    for uid,f in facts['poems'].items():
        pub=f['publisher_number'];u=f['canonical_unit'];buf=buffers[uid];raw=(Path(source_root)/f['source_path']).read_text(encoding='utf-8');fm=re.match(r'^---\n.*?\n---\n',raw,re.S);payload=raw[fm.end():];cut=re.search(r'^\[\^1\]:',payload,re.M);rawbody=payload[:cut.start()].strip();defs=payload[cut.start():]
        if pub==310: rawbody=rawbody.split('\n\nThe Summary:\n\n')[0]
        pre=''
        mapping=['Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Preserve independent VRI wording and explicit edition differences; matching ordinal labels are scope evidence, not word/line equivalence.',f'Full original publisher chapter-3 poem {pub} narrative, title and both colophons, compared with original VRI XML and both canonical neighbors, identify {uid}; title and numbering alone do not establish the mapping.']+f['caveats']
        layout=[]
        for ent in f['entries']:
            local='-'.join(str(n) for n in [ent['local_labels'][0],ent['local_labels'][-1]]) if len(ent['local_labels'])>1 else str(ent['local_labels'][0]); glob='-'.join(str(n) for n in [ent['global_labels'][0],ent['global_labels'][-1]]) if len(ent['global_labels'])>1 else str(ent['global_labels'][0]);layout.append({'local_label':local,'publisher_label':glob,'suffix':f'({local}) [{glob}]','lines':ent['lines']})
        if pub!=301: mapping.append('Publisher expands the final attainment formula while the actual VRI root uses peyyāla abbreviation; preserve the independent editions without reconstructing words or claiming line-complete equivalence.')
        if pub==310: mapping.append('Publisher summary order is the summary marker, six-line summary verse, then chapter closing; actual VRI places the chapter closing before the summary marker and verse. Preserve both edition orders without moving the summary or its note8 into the poem.')
        v0=f['entries'][0]['global_labels'][0];v1=f['entries'][-1]['global_labels'][-1];markers=[int(blocks[i][1]) for i in range(u['start'],u['end']) if blocks[i][0]=='hangnum']
        rawurl=f'https://raw.githubusercontent.com/apadana-translation/apadana-site/{original.REV}/{f["source_path"]}'
        profile={'exact_ref_url':rawurl,'id':uid,'publisher_chapter':'chapter-3','poem':pub,'verses':[v0,v1],'root_verses':[markers[0],markers[-1]],'note_count':f['notes']['count'],'note_numbers':sorted(x['number'] for x in buf['notes']),'source':'apadana','path':f['route'],'url':'https://apadanatranslation.com'+f['route'],'raw_url':rawurl,'translator':'Jonathan S. Walters','license':'CC BY-NC-SA 4.0','translation_revision':original.REV,'title':f['title'],'reference':f'Therā Apadāna publisher poem {pub}; complete publisher-edition poem; original numbering retained','raw_sha256':f['raw_sha256'],'body_sha256':f['body']['sha256'],'notes_sha256':f['notes']['json_sha256'],'paratext_sha256':f['paratext']['sha256'],'root_sha256':f['root_sha256'],'stanza_layout':layout,'mapping_notes':mapping}
        profiles[uid]=profile;links[uid]={**profile,'english':f['title'],'match':'individually-reviewed-whole-poem'}
        segs=[];i=u['start']
        while i<u['end']:
            start=i;kind,num,text,notes,pages=blocks[i];variant_count=len(notes)
            if kind=='hangnum':
                i+=1;parts=[]
                while i<u['end'] and blocks[i][0].startswith('gatha'):
                    parts.append(blocks[i][2]);variant_count+=len(blocks[i][3]);i+=1
                text='\n'.join(parts);typ='verse'
            elif kind.startswith('gatha'):
                parts=[]
                while i<u['end'] and blocks[i][0].startswith('gatha'):
                    parts.append(blocks[i][2]);i+=1
                text='\n'.join(parts);typ='verse';num=None
            else:
                i+=1;typ='heading' if kind in {'chapter','subhead'} else 'prose';num=None
            segs.append({'ref':f'{uid}/{len(segs)+1}','type':typ,'blocks':[start,i],'vri_paragraph':num,'text_sha256':sha(text),'variant_count':variant_count})
        summary_desc=None
        if pub==310:
            assert [(s['ref'],s['blocks']) for s in segs[-3:]]==[(uid+'/9',[9221,9222]),(uid+'/10',[9222,9223]),(uid+'/11',[9223,9226])]
            sa,sb=9221,9226
            summary_desc={'kind':'canonical_chapter_summary','label':'Thirty-First Therā Apadāna chapter summary','parent_id':uid,'first_ref':uid+'/9','last_ref':uid+'/11','root_start':sa,'root_end':sb,'root_sha256':sha(compact({'id':uid,'book':36,'start':sa,'end':sb,'blocks':blocks[sa:sb]})),'body_sha256':f['summary']['sha256'],'notes_sha256':f['summary']['notes_sha256'],'note_numbers':[8]}
            profile['chapter_summary']=summary_desc
            # links was initially copied before this descriptor existed.
            links[uid]={**profile,'english':f['title'],'match':'individually-reviewed-whole-poem'}
        stanza_corr=[]
        for ent,lay in zip(f['entries'],layout):
            scopes=[]
            for corr in ent['pali_scope_correspondences']:
                a,b=corr['block_range'];scopes.append({'vri_label':corr['canonical_marker'],'canonical_blocks':[a,b],'block_tuple_sha256':corr['canonical_tuple_sha256'],'original_XML':xmlproof(a,b),'actual_segment_ref':next(s['ref'] for s in segs if s['blocks']==[a,b])})
            stanza_corr.append({'publisher_physical_entry':ent['index'],'local_label':lay['local_label'],'global_label':lay['publisher_label'],'normalized_English_paragraph_sha256':ent['text_sha256'],'VRI_scope_units':scopes,'ordinal_scope_and_narrative_evidence_not_word_or_line_equivalence':True})
        notes=[]
        for m in re.finditer(r'^\[\^(\d+)\]: (.*?)(?=\n\n\[\^\d+\]:|\Z)',defs,re.M|re.S):
            n=int(m[1]);actual=next(x for x in buf['all_notes'] if x['number']==n)
            if pub==310 and n==8: continue
            notes.append({'number':n,'owner':'poem','reference_owner':'poem_title' if n==1 else 'poem_body','raw_sha256':sha(m[2].strip()),'body_sha256':sha(actual['text']),'characters':len(actual['text'])})
        pairs=[]
        for owner,rawscope in [('poem',rawbody),('poem_notes',defs)]:
            for match in re.finditer(pairpat,rawscope):
                pairs.append({'owner':owner,'raw_sha256':sha(match[0]),'rendered_sha256':sha(match[1]),'alternate':match[2],'alternate_sha256':sha(match[2]),'occurrences':1,'form':'exact_Markdown_pair'})
        a=u['start'];b=u['end'];pp=buf['paratext'];empty_notes_sha=sha(compact([]))
        rows.append({'path':f['source_path'],'bytes':f['raw_bytes'],'raw_sha256':f['raw_sha256'],'git_blob_sha1':f['git_blob_sha1'],'raw_url':rawurl,'exact_ref_url':rawurl,'id':uid,'publisher_chapter':'chapter-3','poem':pub,'title':f['title'],'source_scope_decision':'APPROVE_EXACT_COMPLETE_PUBLISHER_POEM_AND_FINITE_PRESENTATION_ONLY','narrative_identity':NARRATIVES[pub],'identity_basis':'Exact full source narrative/title/colophons compared with actual original Pali/XML and both canonical neighbors; not a name/number-only match.','front_matter_raw_sha256':sha(fm[0]),'source_raw_body_sha256':sha(rawbody),'raw_definitions_sha256':sha(defs.strip()),'body_sha256':f['body']['sha256'],'notes_sha256':f['notes']['json_sha256'],'paratext_sha256':f['paratext']['sha256'],'body_paragraphs':[{'paragraph':idx,'sha256':sha(p),'lines':len(p.splitlines()),'characters':len(p)} for idx,p in enumerate(buf['paragraphs'])],'physical_stanza_count':f['entry_count'],'printed_local_verse_label_count':f['label_count'],'stanza_layout':layout,'note_count':len(notes),'original_note_count':f['original_note_count'],'note_numbers':profile['note_numbers'],'notes':notes,'original_raw_body_paragraph_count':len(re.split(r'\n\s*\n',rawbody)),'normalized_body_paragraph_count':len(buf['paragraphs']),'publisher_preface':{'kind':'publisher_chapter_heading_audit_only' if pp else 'none','runtime_publisher_preface_descriptor':False,'raw_sha256':sha(pre),'body_sha256':sha(pp),'paragraph_count':int(bool(pp)),'paragraphs':[{'paragraph':0,'sha256':sha(pp),'lines':len(pp.splitlines()),'characters':len(pp)}] if pp else [],'note_numbers':[],'notes_sha256':empty_notes_sha},'publisher_divisions':[],'original_audio_frontmatter_present':False,'audio_or_media_rights_approval':False,'presentation_recipe':{'paired_display_inventory':pairs,'allowed_changes':facts['normalization_policy'],'Unicode_normalization':False},'root':{'id':uid,'book':36,'start':a,'end':b,'title':u['title'],'root_sha256':f['root_sha256'],'root_verses':profile['root_verses'],'numbered_stanza_count':len(markers),'vri':u['vri'],'index_revision':None,'first_ref':segs[0]['ref'],'last_ref':segs[-1]['ref'],'segments':segs},'root_original_XML':xmlproof(a,b),'mapping_notes':mapping,'poem_only_root_sha256':sha(compact({'id':uid,'book':36,'start':a,'end':9221,'blocks':blocks[a:9221]})) if pub==310 else f['root_sha256'],'verse_scope_correspondences':stanza_corr,'quotation_proofs':[{'physical_entry':e['index'],'sha256':e['quotation_sha256'],'characters':e['quotation_chars'],'notes_and_printed_numbering_excluded':True,'body_colophons_and_editorial_paratext_excluded':True} for e in f['entries']],'original_VRI_notes':[{'block_index':idx,'note_number_at_block':n+1,'note_sha256':sha(note)} for idx in range(a,b) for n,note in enumerate(blocks[idx][3])],'source_approval':True,'normalization_approval':True,'activation':False,'neighbors':{'previous_block':{'index':a-1,'sha256':sha(compact(blocks[a-1])),'original_XML':xmlproof(a-1,a)},'next_block':{'index':b,'sha256':sha(compact(blocks[b])),'original_XML':xmlproof(b,b+1)},'previous_unit':{'id':f['neighbor_units']['before']['id'],'metadata':f['neighbor_units']['before']},'next_unit':{'id':f['neighbor_units']['after']['id'],'metadata':f['neighbor_units']['after']},'publisher_previous':pub-1,'publisher_next':pub+1,'boundary_only_publishers_outside_selected_scope':True}})
        if summary_desc:
            sn=buf['summary_notes']; summary_proof={**summary_desc,'raw_sha256':sha(buf['summary_raw']),'paragraph_count':len(buf['summary_paragraphs']),'paragraphs':[{'paragraph':i,'sha256':sha(p),'lines':len(p.splitlines()),'characters':len(p)} for i,p in enumerate(buf['summary_paragraphs'])],'notes':[{'number':x['number'],'owner':'chapter_summary','body_sha256':sha(x['text']),'characters':len(x['text'])} for x in sn],'note_text_sha256s':f['summary']['note_text_sha256s'],'publisher_stated_total':49,'vri_stated_total':51,'actual_vri_numbered_stanzas':51,'full_publisher_local_label_occurrences':51,'approved_subset_poems':8,'approved_subset_entries':34,'approved_subset_printed_labels':36,'held_publisher_poems':[306,307],'held_canonical_ids':['tha-ap308','tha-ap309'],'original_publisher_order':'summary then chapter colophon; VRI chapter colophon precedes summary','count_limitation':f['caveats'][3],'original_XML':xmlproof(9221,9226)}
            rows[-1]['chapter_summary']=summary_proof
            rows[-1]['poem_only_root_original_XML']=xmlproof(a,9221)
            rows[-1]['poem_only_root_canonical_block_range']=[a,9221]
    totals={'poems':8,'body_paragraphs':58,'stanza_entries':34,'printed_local_labels':36,'poem_notes':31,'chapter_heading_paratexts':0,'paratext_notes':0,'summaries':1,'summary_notes':1,'original_note_definitions':32,'paired_display_occurrences':7}
    golden={'review_type':'ORIGINAL_FIRST_SOURCE_AND_FINITE_NORMALIZATION_REVIEW_A','baseline':'4c69f023c9fe1093ad8aadf0ac7f3caf766d92f0','publisher_revision':original.REV,'vri_revision':facts['vri_revision'],'canonical_logical_sha256':original.CANON,'original_XML_sha256':original.XML,'rights':facts['rights_artifacts'],'publisher_routing':{'category':'chapter-3','route_template':'/text/{{ category | slug }}/{{ page.fileSlug }}/index.html','all_orders_match_printed_poem_numbers':True},'all14645_original_XML_tuples_match_baseline':True,'baseline_note_only_omission':{'original_physical_element':1130,'separately_indexed_Sariputta_record_unchanged':True,'not_part_of_this_intake':True},'poems':rows,'totals':totals,'excluded_publishers':[260,266,280,286,289,290,291,297,300,306,307],'source_approval_count':8,'normalization_approval_count':8,'runtime_approval':False,'release_approval':False}
    return {'GOLDENS.json':golden,'EXPECTED_PROFILES.json':profiles,'EXPECTED_LINKS.json':links}

def produce(source_root,canon_path,xml_path,tree_path):
    facts,buffers=original.derive(source_root,canon_path,xml_path,tree_path)
    factbytes=(json.dumps(facts,ensure_ascii=False,indent=2)+'\n').encode('utf-8');assert sha(factbytes)==FACTS_PIN,'sealed original-first facts mismatch'
    return final_metadata(facts,buffers,source_root,canon_path,xml_path)


def main():
    ap=argparse.ArgumentParser(description='Original-source metadata-only replay for eight publisher poems301--310; complete payloads never written or printed.')
    for flag in ['source-root','canon','xml','tree','evidence','output']:ap.add_argument('--'+flag,required=True)
    args=ap.parse_args();out=Path(args.output).resolve();src=Path(args.source_root).resolve();evidence=Path(args.evidence).resolve();code=Path(__file__).resolve()
    for protected,label in [(src,'source'),(evidence,'evidence'),(code.parent,'code')]:
        assert out!=protected and protected not in out.parents and out not in protected.parents,'output overlaps '+label
    assert not out.exists(),'new output directory required'
    objects=produce(args.source_root,args.canon,args.xml,args.tree)
    encoded={name:(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode('utf-8') for name,obj in objects.items()}
    assert set(encoded)=={'GOLDENS.json','EXPECTED_PROFILES.json','EXPECTED_LINKS.json'}
    for name,b in encoded.items():assert b==(evidence/name).read_bytes(),'sealed metadata mismatch: '+name
    out.mkdir(parents=True)
    for name,b in encoded.items():
        with (out/name).open('xb') as f:f.write(b)
    write_new(out/'REPLAY_RECEIPT.json',{'status':'PASS_EIGHT_ORIGINAL_SOURCE_AND_FINITE_NORMALIZATION_METADATA_ONLY','files':{n:sha(b) for n,b in encoded.items()},'original_first_facts_sha256':FACTS_PIN,'poems':8,'all_xml_tuple_count':14645,'full_english_payload_files_written':0,'full_pali_payload_files_written':0,'runtime_approval':False,'release_approval':False})
    print(json.dumps({'status':'PASS','poems':8,'metadata_files':4,'full_payload_files':0}))
if __name__=='__main__':main()
