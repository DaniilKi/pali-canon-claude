#!/usr/bin/env python3
"""Original-first, stdlib-only, metadata-only review of selected publisher 292--299.
No translated body or Pali payload is ever written or printed.
"""
import argparse, gzip, hashlib, html, json, re
from pathlib import Path
import xml.etree.ElementTree as ET

REV='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4'
CANON='1c40c69f6d1efb7f4407260cfba24c905c959ae21cf678665816772d37a53b32'
XML='ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1'
SPECS={
292:('Pupphadhāraka',294,8891,8908,'80e90251728fd39d9dec778b05b526d3400d68919ea1f31384769238512121d5',4,[(1,1),(2,2),(3,3),(4,4),(5,5)],2676),
293:('Chattadāyaka',295,8908,8928,'66c0f894c402a9aaf855edd89db267461d6a76e5ff41fbb6302335e089512425',3,[(1,1),(2,2),(3,3),(4,4),(5,5),(6,6)],2681),
294:('Saddasaññaka',296,8928,8942,'5899fe758a443ce8011c7f94065f748a24036b79af996920fdca0a77c2753ad3',3,[(1,1),(2,2),(3,3),(4,4)],2687),
295:('Gosīsanikkhepa',297,8942,8962,'c872cfd7b599a2e3f5e4205efc1f415f1d6226d17a7de5608951e9e206c1d3e2',5,[(1,1),(2,2),(3,3),(4,4),(5,5),(6,6)],2691),
296:('Padapūjaka',298,8962,8976,'0ffc75664a8b8998a2805fb3b8928d9c28c478572b50c854b23d1d17ec718220',4,[(1,2),(3,3),(4,4)],2697),
298:('Saraṇagamaniya',300,8993,9007,'bd70819d798221f8386de13f6502146c78f2e706ae950d2e0121d61e07f276e9',1,[(1,1),(2,2),(3,3),(4,4)],2706),
299:('Ambapiṇḍiya',301,9007,9018,'980936fe1d48e97a06431fc9cc80f399466bd43c40b68f5e2c2db777826e14ea',2,[(1,1),(2,2),(3,3)],2710)}

RIGHTS={
'LICENSE.md':'66eea18fe8cb99e0d178d838a4932be0d3af8a6f844e933a8bbb0054e22f2592',
'src/_pages/about.md':'17d8029419cd7b4c7f9e7f88d0127141d2425b3fe30516888b389ce7521f1352',
'src/_includes/site/footer.njk':'08a7d4a0c3a9841afa38a8d98aa563e0ddedc6228f66e86b9a49d564aba26fd4',
'src/_includes/layouts/epub-metadata.xml':'1a6320b1580b76112c63bd557e419d5816b410197da666444e9d412327430b2f',
'src/_data/site.json':'6b4b5b5661b1bfb35cee0f207066fd6941aa042d6377993b02c77db677319efa',
'src/_poems/_poems.json':'7c0d9a568ff9c495c89fb3ae13397ff71e8e1d678c221cca5966c9adc886cf22'}
CAVEATS={
292:['Preserve the publisher floral-canopy interpretation and original VRI pāricchattakapupphāni without inferred botanical or line equivalence.','Publisher Samantadharaṇa and literal ŋ in note3 lokapajjotaŋ remain as printed; do not harmonize to VRI Samantadhāraṇo.','Poem-owned note2 contains translator interpretation of the five special knowledges; it is not added canonical wording.'],
293:['Original note2 is adjacent to the printed stanza2 label without an intervening space; preserve the exact body adjacency and quotation boundary without inserting whitespace.','Publisher Lamp of the World differs from actual VRI lokapūjito, with no recorded variant in that block; preserve editions without invented cause or correction.','The source identifies a son who attained Buddhahood but supplies no named Buddha; ninety-four aeons alone does not authorize supplying a name.'],
294:['Inline footnote2 followed by a colon is a reference in stanza1, not a footnote definition; preserve the colon and complete owned note.','Publisher brightness/pleasure note quotes pasādo while VRI main has panādo with recorded pasādo (syā. aṭṭha.) variant; do not replace the main root or settle the interpretation.','Preserve publisher sound wording and actual VRI ghosa with recorded sadda variant; title cross-references do not prove alternate source mappings.','Exact existing c/ch display pair in note3 retains state-on c; no generic spelling or source correction.'],
295:['Retain the mixed curly opening and ASCII closing quotation marks in note5 and the missing final punctuation in stanza3.','Literal ŋ in note3 kāraŋ and original note4 sangha remain unchanged; do not normalize spelling to the VRI.','Publisher Gosīsanikkhepa title and VRI Gosīsanikkhepaka title are retained as their distinct original forms; no title reconstruction.','Source offers sandalwood/monastic-deed narrative without naming a Buddha; do not infer a recipient from the aeon count.'],
296:['Publisher Padapūjaka and VRI Pādapūjaka title spellings remain distinct.','The first physical English entry combines labels1–2/global2697–2698 in eight lines, corresponding to VRI27–28 at scope level, not proven line/word equivalence.','Publisher rayless/vītaraṃsa interpretation and unfinished xxx question in note3 remain verbatim; actual VRI main pītaraṃsiṃva is yellow-rayed with no recorded vīta variant there.','Retain the original VRI approach variants at stanza28 without using them to silently rewrite the English or establish an unsupported cause.'],
298:['Repeated Saraṇagamaniya title and original note1 cross-references do not identify a source by name or number alone; Himalayan hunter, Vipassi, service and refuge narrative plus colophons/neighbor boundaries establish this exact mapping.','Only this publisher poem is reviewed; do not substitute another refuge-going poem or claim whole chapter30.'],
299:['The original title has no note reference; both notes1–2 attach to stanza1, never the title. Do not invent a title gloss or migrate note ownership.','Preserve the original Romasa uncertainty in note2 without inventing a meaning; source titan/Dānava note1 remains translator apparatus.','Actual VRI ambapiṇḍī with recorded ambapiṇḍo mayā dinno (syā.) variant and the publisher mango-alms wording remain separate edition evidence, not a reconstruction.']}

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
        notes=[]; note_ownership=[]
        for m in re.finditer(r'^\[\^(\d+)\]: (.*?)(?=\n\n\[\^\d+\]:|\Z)',defs,re.M|re.S):
            number=int(m[1]); value=norm(m[2]);notes.append({'number':number,'text':value})
            start=payload.index(m[0],cut.start())+fm.end(); line=text.count('\n',0,start)+1
            note_ownership.append({'number':number,'owner':'poem_title' if number==1 and pub!=299 else 'poem','definition_lines':[line,line+m[0].count('\n')],'text_sha256':sha(value),'chars':len(value)})
        assert [x['number'] for x in notes]==list(range(1,ncount+1))
        refs=[int(x) for x in re.findall(r'\[\^(\d+)\]',prose)]; assert sorted(refs)==list(range(1,ncount+1)), 'every note referenced exactly once in own poem'
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
            if pub==293 and idx==2: assert p.endswith('.[Note 2](2) [2682]'), 'exact adjacent note and printed label'
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
        facts[u['id']]={'publisher_number':pub,'title':title,'frontmatter_order':pub,'source_path':path,'raw_sha256':pin,'raw_bytes':len(raw),'git_blob_sha1':blob,'route':f'/text/chapter-3/poem-{pub}/','canonical_unit':u,'root_sha256':rp,'root_canonical_tuple_sha256':sha(compact(blocks[a:b])),'xml':{'physical_element_range_inclusive':[a+1,b],'source_line_range':[decoded.count('\n',0,start)+1,decoded.count('\n',0,end)+1],'raw_utf16le_byte_range':[raw_start,raw_end],'raw_utf16le_sha256':sha(xmlpart),'et_serialized_utf8_sha256':sha(b''.join(ET.tostring(x,encoding='utf-8') for x in nodes[a+1:b+1])),'raw_domain':'exact original UTF16LE element range; no BOM; includes original inter-element source bytes'},'neighbor_units':{'before':next(v for v in canon['units'] if v['book']==36 and v['end']==a),'after':next(v for v in canon['units'] if v['book']==36 and v['start']==b)},'body':{**meta(body),'paragraphs':len(ps),'paragraph_sha256s':[sha(p) for p in ps],'paragraph_lines':[len(p.splitlines()) for p in ps]},'notes':{'count':len(notes),'json_sha256':sha(compact(notes)),'numbers':refs,'ownership':note_ownership},'paratext':{**meta(paratext),'kind':'bare_chapter_heading' if paratext else 'none','notes':[],'paragraph_sha256s':[sha(paratext)] if paratext else [],'paragraphs':int(bool(paratext))},'summary':{**meta(''),'paragraphs':0,'notes':[]},'entries':entries,'entry_count':len(entries),'label_count':sum(hi-lo+1 for lo,hi in labels),'colophon_paragraphs':[len(ps)-2,len(ps)-1],'caveats':CAVEATS[pub],'complete_publisher_edition_poem':True,'line_complete_vri_translation':False,'source_and_normalization_only':True,'audio_front_matter_present':False,'audio_or_media_approval':False}
        buffers[u['id']]={'body':body,'paragraphs':ps,'notes':notes,'paratext':paratext,'summary':''}
    assert sum(f['body']['paragraphs'] for f in facts.values())==52
    assert sum(f['entry_count'] for f in facts.values())==31
    assert sum(f['label_count'] for f in facts.values())==32
    assert sum(f['notes']['count'] for f in facts.values())==22
    return {'status':'ORIGINAL_FIRST_FACTS_SEALED_BEFORE_PROFILE_SCHEMA_OR_PEER_OUTPUTS','publisher_revision':REV,'source_root_policy':'original artifacts, not source-prep mapping as oracle','canon_sha256':CANON,'xml_sha256':XML,'vri_revision':'2d134ff9ef60f70a1eb03c9370580228811a3070','all_xml_tuple_count':14645,'separate_note_only_omission_unchanged':1130,'tree_membership_verified':bool(tree),'rights_artifacts':rights,'rights_applicability':{'translation_license':'CC BY-NC-SA 4.0','license_url':'https://creativecommons.org/licenses/by-nc-sa/4.0/','creator':'Jonathan S. Walters','publisher':'Jonathan S. Walters and Whitman College','specific_notices_override_generic_site_CC_BY_metadata':True,'retain':['attribution','copyright','license URI','disclaimer','source URI and revision','truthful extraction and prior-change notices'],'requirements':['noncommercial','sharealike','no endorsement','no downstream restrictions'],'app_policy':'consent-gated live-only English; metadata and hashes only in repository/package','audio_fonts_images_other_media_approved':False},'poems':facts,'normalization_policy':['exact publisher words, punctuation, case, Unicode retained','choose exact observed state-on complementary spelling member','drop Markdown presentation markers, retain literal brackets and unfinished xxx','footnote references become [Note N]; ordered note definitions remain poem-owned','chapter heading remains separate editorial paratext','only stanza text without references/printed numbering is quotation scope','Pali correspondence is identity/boundary evidence, not word/line equivalence'],'totals':{'poems':7,'body_paragraphs':52,'entries':31,'labels':32,'notes':22,'paratext_headings':0,'summaries':0},'excluded_publishers':[260,266,280],'runtime_approval':False,'release_approval':False},buffers

def write_new(path,obj):
    with Path(path).open('x',encoding='utf-8') as f: f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')

#!/usr/bin/env python3
"""Metadata-only original-source review; never exports English or Pali payloads."""
import argparse, gzip, hashlib, json, re
from pathlib import Path
import xml.etree.ElementTree as ET
import sys
original=sys.modules[__name__]

sha=original.sha
compact=original.compact
FACTS_PIN='33ac7c0101b0fd0497e16449e41d55de25d94eed0ffa82d1446fea18651e34ca'
NARRATIVES={292:'Bark-clothed deer-robed ascetic with five special knowledges bears a floral canopy for Vipassi; ninety-one aeons; Samantadharaṇa in the eighty-seventh aeon.',293:'A father visits the pyre of his son who had attained Buddhahood and raises a white umbrella; ninety-four aeons; seven Mahārahā rulers in the twenty-fifth aeon.',294:'Hears but does not see the Buddha, remembers at death, and recounts sound-perception and ninety-four aeons; brightness/pleasure and sound-reading notes retained.',295:'Golden sandalwood laid at an ashram exit, fine horses and praise of deeds for the monks; ninety-four aeons; Suppatiṭṭhita in the seventy-fifth aeon.',296:'Himalayan kinnara sees Vipassi and anoints his feet with sandalwood and incense; one eight-line pair and ninety-one aeons.',298:'Himalayan hunter sees Vipassi, performs service and goes for refuge; ninety-one aeons. This distinct narrative identifies one repeated-title source.',299:'Titan/Dānava called Romasa gives mango alms to Vipassi; ninety-one aeons; both original notes belong to stanza1, not the unannotated title.'}

NOTICE_ONLY_V2_ADDITIONS={293: ['Preserve the publisher ruler name Mahārahā exactly, including its final ā; do not normalize the original spelling or the seven-ruler and twenty-fifth-aeon wording.'], 296: ['Source note4 identifies Sinh. tuvaralā/frankincense as the translator’s interpretation beside actual VRI tagarañcāpi (tagara). Preserve both; infer no unrecorded variant or botanical correction.']}

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
        pre=''
        mapping=['Complete publisher-edition poem (PTS/BJTS), not a line-complete translation of every VRI stanza. Preserve independent VRI wording and explicit edition differences; matching ordinal labels are scope evidence, not word/line equivalence.',f'Full original publisher chapter-3 poem {pub} narrative, title and both colophons, compared with original VRI XML and both canonical neighbors, identify {uid}; title and numbering alone do not establish the mapping.']+f['caveats']
        mapping.extend(NOTICE_ONLY_V2_ADDITIONS.get(pub, []))
        layout=[]
        for ent in f['entries']:
            local='-'.join(str(n) for n in [ent['local_labels'][0],ent['local_labels'][-1]]) if len(ent['local_labels'])>1 else str(ent['local_labels'][0]); glob='-'.join(str(n) for n in [ent['global_labels'][0],ent['global_labels'][-1]]) if len(ent['global_labels'])>1 else str(ent['global_labels'][0]);layout.append({'local_label':local,'publisher_label':glob,'suffix':f'({local}) [{glob}]','lines':ent['lines']})
        mapping.append('Publisher expands the final attainment formula while the actual VRI root uses peyyāla abbreviation; preserve the independent editions without reconstructing words or claiming line-complete equivalence.')
        v0=f['entries'][0]['global_labels'][0];v1=f['entries'][-1]['global_labels'][-1];markers=[int(blocks[i][1]) for i in range(u['start'],u['end']) if blocks[i][0]=='hangnum']
        rawurl=f'https://raw.githubusercontent.com/apadana-translation/apadana-site/{original.REV}/{f["source_path"]}'
        profile={'exact_ref_url':rawurl,'id':uid,'publisher_chapter':'chapter-3','poem':pub,'verses':[v0,v1],'root_verses':[markers[0],markers[-1]],'note_count':f['notes']['count'],'note_numbers':list(range(1,f['notes']['count']+1)),'source':'apadana','path':f['route'],'url':'https://apadanatranslation.com'+f['route'],'raw_url':rawurl,'translator':'Jonathan S. Walters','license':'CC BY-NC-SA 4.0','translation_revision':original.REV,'title':f['title'],'reference':f'Therā Apadāna publisher poem {pub}; complete publisher-edition poem; original numbering retained','raw_sha256':f['raw_sha256'],'body_sha256':f['body']['sha256'],'notes_sha256':f['notes']['json_sha256'],'paratext_sha256':f['paratext']['sha256'],'root_sha256':f['root_sha256'],'stanza_layout':layout,'mapping_notes':mapping}
        profiles[uid]=profile;links[uid]={**profile,'english':f['title'],'match':'individually-reviewed-whole-poem'}
        segs=[];i=u['start']
        while i<u['end']:
            start=i;kind,num,text,notes,pages=blocks[i];variant_count=len(notes)
            if kind=='hangnum':
                i+=1;parts=[]
                while i<u['end'] and blocks[i][0].startswith('gatha'):
                    parts.append(blocks[i][2]);variant_count+=len(blocks[i][3]);i+=1
                text='\n'.join(parts);typ='verse'
            else:
                i+=1;typ='heading' if kind in {'chapter','subhead'} else 'prose';num=None
            segs.append({'ref':f'{uid}/{len(segs)+1}','type':typ,'blocks':[start,i],'vri_paragraph':num,'text_sha256':sha(text),'variant_count':variant_count})
        stanza_corr=[]
        for ent,lay in zip(f['entries'],layout):
            scopes=[]
            for corr in ent['pali_scope_correspondences']:
                a,b=corr['block_range'];scopes.append({'vri_label':corr['canonical_marker'],'canonical_blocks':[a,b],'block_tuple_sha256':corr['canonical_tuple_sha256'],'original_XML':xmlproof(a,b),'actual_segment_ref':next(s['ref'] for s in segs if s['blocks']==[a,b])})
            stanza_corr.append({'publisher_physical_entry':ent['index'],'local_label':lay['local_label'],'global_label':lay['publisher_label'],'normalized_English_paragraph_sha256':ent['text_sha256'],'VRI_scope_units':scopes,'ordinal_scope_and_narrative_evidence_not_word_or_line_equivalence':True})
        notes=[]
        for m in re.finditer(r'^\[\^(\d+)\]: (.*?)(?=\n\n\[\^\d+\]:|\Z)',defs,re.M|re.S):
            n=int(m[1]);actual=next(x for x in buf['notes'] if x['number']==n)
            notes.append({'number':n,'owner':'poem','reference_owner':'poem_title' if n==1 and pub!=299 else 'poem_body','raw_sha256':sha(m[2].strip()),'body_sha256':sha(actual['text']),'characters':len(actual['text'])})
        pairs=[]
        for owner,rawscope in [('poem',rawbody),('poem_notes',defs)]:
            for match in re.finditer(pairpat,rawscope):
                pairs.append({'owner':owner,'raw_sha256':sha(match[0]),'rendered_sha256':sha(match[1]),'alternate':match[2],'alternate_sha256':sha(match[2]),'occurrences':1,'form':'exact_Markdown_pair'})
        a=u['start'];b=u['end'];pp=buf['paratext'];empty_notes_sha=sha(compact([]))
        rows.append({'path':f['source_path'],'bytes':f['raw_bytes'],'raw_sha256':f['raw_sha256'],'git_blob_sha1':f['git_blob_sha1'],'raw_url':rawurl,'exact_ref_url':rawurl,'id':uid,'publisher_chapter':'chapter-3','poem':pub,'title':f['title'],'source_scope_decision':'APPROVE_EXACT_COMPLETE_PUBLISHER_POEM_AND_FINITE_PRESENTATION_ONLY','narrative_identity':NARRATIVES[pub],'identity_basis':'Exact full source narrative/title/colophons compared with actual original Pali/XML and both canonical neighbors; not a name/number-only match.','front_matter_raw_sha256':sha(fm[0]),'source_raw_body_sha256':sha(rawbody),'raw_definitions_sha256':sha(defs.strip()),'body_sha256':f['body']['sha256'],'notes_sha256':f['notes']['json_sha256'],'paratext_sha256':f['paratext']['sha256'],'body_paragraphs':[{'paragraph':idx,'sha256':sha(p),'lines':len(p.splitlines()),'characters':len(p)} for idx,p in enumerate(buf['paragraphs'])],'physical_stanza_count':f['entry_count'],'printed_local_verse_label_count':f['label_count'],'stanza_layout':layout,'note_count':len(notes),'original_note_count':len(notes),'note_numbers':profile['note_numbers'],'notes':notes,'original_raw_body_paragraph_count':len(re.split(r'\n\s*\n',rawbody)),'normalized_body_paragraph_count':len(buf['paragraphs']),'publisher_preface':{'kind':'publisher_chapter_heading_audit_only' if pp else 'none','runtime_publisher_preface_descriptor':False,'raw_sha256':sha(pre),'body_sha256':sha(pp),'paragraph_count':int(bool(pp)),'paragraphs':[{'paragraph':0,'sha256':sha(pp),'lines':len(pp.splitlines()),'characters':len(pp)}] if pp else [],'note_numbers':[],'notes_sha256':empty_notes_sha},'publisher_divisions':[],'original_audio_frontmatter_present':False,'audio_or_media_rights_approval':False,'presentation_recipe':{'paired_display_inventory':pairs,'allowed_changes':facts['normalization_policy'],'Unicode_normalization':False},'root':{'id':uid,'book':36,'start':a,'end':b,'title':u['title'],'root_sha256':f['root_sha256'],'root_verses':profile['root_verses'],'numbered_stanza_count':len(markers),'vri':u['vri'],'index_revision':None,'first_ref':segs[0]['ref'],'last_ref':segs[-1]['ref'],'segments':segs},'root_original_XML':xmlproof(a,b),'mapping_notes':mapping,'poem_only_root_sha256':f['root_sha256'],'verse_scope_correspondences':stanza_corr,'quotation_proofs':[{'physical_entry':e['index'],'sha256':e['quotation_sha256'],'characters':e['quotation_chars'],'notes_and_printed_numbering_excluded':True,'body_colophons_and_editorial_paratext_excluded':True} for e in f['entries']],'original_VRI_notes':[{'block_index':idx,'note_number_at_block':n+1,'note_sha256':sha(note)} for idx in range(a,b) for n,note in enumerate(blocks[idx][3])],'source_approval':True,'normalization_approval':True,'activation':False,'neighbors':{'previous_block':{'index':a-1,'sha256':sha(compact(blocks[a-1])),'original_XML':xmlproof(a-1,a)},'next_block':{'index':b,'sha256':sha(compact(blocks[b])),'original_XML':xmlproof(b,b+1)},'previous_unit':{'id':f['neighbor_units']['before']['id'],'metadata':f['neighbor_units']['before']},'next_unit':{'id':f['neighbor_units']['after']['id'],'metadata':f['neighbor_units']['after']},'publisher_previous':pub-1,'publisher_next':pub+1,'boundary_only_publishers_outside_selected_scope':True}})
    totals={'poems':7,'body_paragraphs':52,'stanza_entries':31,'printed_local_labels':32,'poem_notes':22,'chapter_heading_paratexts':0,'paratext_notes':0,'summaries':0,'summary_notes':0,'paired_display_occurrences':1}
    golden={'review_type':'ORIGINAL_FIRST_SOURCE_AND_FINITE_NORMALIZATION_REVIEW_A','baseline':'3da5b3831af6396447dcc5d23f24cd03c34fdd9c','publisher_revision':original.REV,'vri_revision':facts['vri_revision'],'canonical_logical_sha256':original.CANON,'original_XML_sha256':original.XML,'rights':facts['rights_artifacts'],'publisher_routing':{'category':'chapter-3','route_template':'/text/{{ category | slug }}/{{ page.fileSlug }}/index.html','all_orders_match_printed_poem_numbers':True},'all14645_original_XML_tuples_match_baseline':True,'baseline_note_only_omission':{'original_physical_element':1130,'separately_indexed_Sariputta_record_unchanged':True,'not_part_of_this_intake':True},'poems':rows,'totals':totals,'excluded_publishers':[260,266,280,291,297,300],'source_approval_count':7,'normalization_approval_count':7,'runtime_approval':False,'release_approval':False}
    return {'GOLDENS.json':golden,'EXPECTED_PROFILES.json':profiles,'EXPECTED_LINKS.json':links}

def produce(source_root,canon_path,xml_path,tree_path):
    facts,buffers=original.derive(source_root,canon_path,xml_path,tree_path)
    factbytes=(json.dumps(facts,ensure_ascii=False,indent=2)+'\n').encode('utf-8');assert sha(factbytes)==FACTS_PIN,'sealed original-first facts mismatch'
    return final_metadata(facts,buffers,source_root,canon_path,xml_path)

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    for flag in ['source-root','canon','xml','tree','output']:ap.add_argument('--'+flag,required=True)
    ap.add_argument('--evidence',help='optional directory containing sealed three core expectations; comparison only, never derivation oracle')
    args=ap.parse_args();out=Path(args.output).resolve();src=Path(args.source_root).resolve();code=Path(__file__).resolve()
    assert out!=src and src not in out.parents,'output inside original sources refused'
    assert out!=code and out not in code.parents,'output would contain or replace review code'
    if args.evidence:
        evidence=Path(args.evidence).resolve();assert out!=evidence and evidence not in out.parents,'output inside evidence refused'
    assert not out.exists(),'new output directory required'
    objects=produce(args.source_root,args.canon,args.xml,args.tree)
    encoded={name:(json.dumps(obj,ensure_ascii=False,indent=2)+'\n').encode('utf-8') for name,obj in objects.items()}
    if args.evidence:
        for name,b in encoded.items():assert b==(Path(args.evidence)/name).read_bytes(),'sealed metadata comparison failed: '+name
    out.mkdir(parents=True)
    for name,b in encoded.items():
        with (out/name).open('xb') as f:f.write(b)
    original.write_new(out/'REPLAY_RECEIPT.json',{'status':'PASS_SEVEN_ORIGINAL_SOURCE_AND_FINITE_NORMALIZATION_METADATA_ONLY','review_version':2,'notice_only_amendment':True,'files':{n:sha(b) for n,b in encoded.items()},'original_first_facts_sha256':FACTS_PIN,'poems':7,'all_xml_tuple_count':14645,'full_english_payload_files_written':0,'full_pali_payload_files_written':0,'runtime_approval':False,'release_approval':False})
    print(json.dumps({'status':'PASS','poems':7,'metadata_files':4,'full_payload_files':0}))
if __name__=='__main__':main()
