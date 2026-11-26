#!/usr/bin/env python3
"""Reproduce16 source-only normalization pins, never an application oracle.

Inputs are exact pinned original publisher files, corrected canonical JSON/gzip
and original VRI XML.  Standard library only; no imports from a checkout, Git,
network, application/build/test execution or tracked-file writes.

Outputs include source-derived English text: keep the output external to Git.
The immutable adjacent expectations file contains metadata/hashes only, derived
and reviewed before application implementation.  This producer is not its own
independent approval, and its report is not browser/CI/release evidence.
"""
import argparse
from collections import Counter
import gzip
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

EXPECTED_SHA='5d32d5a646b9fa69d84cc15645220e7bb6c51ce16fdcdf8b55ffc0721ce8e484'

def sha(value):return hashlib.sha256(value if isinstance(value,bytes) else value.encode()).hexdigest()
def compact(value):return json.dumps(value,ensure_ascii=False,separators=(',',':'))
def jsha(value):return sha(compact(value))
def u16(value):return len(value.encode('utf-16-le'))//2
def blob(value):return hashlib.sha1(b'blob '+str(len(value)).encode()+b'\0'+value).hexdigest()
def require(condition,label):
    if not condition:raise ValueError(label)
def descriptor(path):
    data=path.read_bytes()
    return {'path':str(path.resolve()),'bytes':len(data),'sha256':sha(data)}
def pinned_file(path,pin):
    require(path.is_file() and not path.is_symlink(),'Source must be a physical file: '+str(path))
    data=path.read_bytes()
    require((len(data),sha(data),blob(data))==(pin['bytes'],pin['sha256'],pin['git_blob_sha1']),'Original pin mismatch: '+str(path))
    return data

HTML=re.compile(r'<span class="diacritics" data-state="on">([^<>]+)</span><span class="no-diacritics" data-state="off">([^<>]+)</span>')
PANDOC=re.compile(r'\[([^\[\]]+)\]\{\.diacritics data-state=on\}\[([^\[\]]+)\]\{\.no-diacritics data-state=off\}')
ESCAPES=set('\\`*{}[]()#+-.!_>')
def normalize(raw,owner):
    pairs=[]
    def choose(match,syntax):
        on,off=match.groups()
        require((on,off) in [('C','Ch'),('c','ch'),('cc','chch')],'Unreviewed display spelling')
        pairs.append({'syntax':syntax,'owner':owner,'raw_start0':match.start(),'raw_end_exclusive':match.end(),'raw_sha256':sha(match[0]),'state_on':on,'state_off':off})
        return on
    value=HTML.sub(lambda m:choose(m,'HTML'),raw)
    value=PANDOC.sub(lambda m:choose(m,'Pandoc'),value)
    def abbreviation(m):
        require((m[1],m[2]) in [('Buddha Jayanthi Tripitaka Series','BJTS'),('Pali Text Society','PTS')],'Unreviewed abbreviation wrapper')
        return m[2]
    value=re.sub(r'<abbr title="([^"]+)">([^<>]+)</abbr>',abbreviation,value)
    require(not re.search(r'<[^>]+>|\{\.(?:no-)?diacritics\b|&(?:#|[A-Za-z])[^\s;]*;',value),'Unreviewed markup/entity')
    value=re.sub(r'\[\^(\d+)\]',lambda m:'[Note '+m[1]+']',value)
    chars=[];index=0
    while index<len(value):
        if value[index]=='\\' and index+1<len(value) and value[index+1] in ESCAPES:chars.append(value[index+1]);index+=2
        else:chars.append(value[index]);index+=1
    lines=[]
    for line in ''.join(chars).splitlines():
        line=re.sub(r'^#{1,3}\s+','',line)
        result=[];index=0
        while index<len(line):
            if line[index]=='*':
                end=line.find('*',index+1);require(end>index+1,'Unbalanced emphasis')
                result.append(line[index+1:end]);index=end+1
            else:result.append(line[index]);index+=1
        lines.append(''.join(result).rstrip(' \t'))
    value=re.sub(r'\n{3,}','\n\n','\n'.join(lines)).strip()
    require(all(ord(c)<=65535 for c in value),'New non-BMP text requires explicit slice review')
    return value,pairs

def original_xml_tuples(raw):
    def item(element):
        pages={}
        def visit(node):
            value=node.text or ''
            for child in node:
                if child.tag=='pb':pages.setdefault(child.attrib['ed'],[]).append('.'.join(str(int(p)) if p.isdigit() else p for p in child.attrib['n'].split('.')))
                elif child.tag!='note':value+=visit(child)
                value+=child.tail or ''
            return value
        text=' '.join(visit(element).split());rend=element.attrib.get('rend',element.tag);n=element.attrib.get('n')
        notes=[' '.join(''.join(e.itertext()).split()) for e in element.iter('note')]
        if rend=='hangnum':
            require(re.fullmatch(r'\d+\.',text) is not None,'Unexpected hangnum source')
            n,text=text[:-1],''
        return [rend,n,text,notes,pages]
    nodes=[e for e in ET.fromstring(raw).iter() if e.tag in ('p','head','trailer')]
    require(len(nodes)==14646,'Unexpected original XML event count')
    require(item(nodes[1130])==['gatha1',None,'',['imā dve gāthāyo syāmapotthake na santi'],{}],'Note-only source event changed')
    return [item(e) for i,e in enumerate(nodes) if i!=1130]

def ordinal_spans(book,lo,hi):
    spans=[];pending=None
    def flush():
        nonlocal pending
        if pending is not None:spans.append(pending);pending=None
    for index in range(lo,hi):
        rend,n,text,notes,pages=book[index]
        if rend=='hangnum':flush();pending=[index,index+1];continue
        if rend in {'gatha1','gatha2','gatha3','gathalast'}:
            if pending is None:pending=[index,index+1]
            pending[1]=index+1
            if rend=='gathalast':flush()
        else:
            flush()
            if text:spans.append([index,index+1])
    flush()
    return spans

def write_new(path,value):
    with path.open('x') as handle:handle.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
    return descriptor(path)

def main():
    args=argparse.ArgumentParser(description=__doc__)
    args.add_argument('--publisher-checkout',required=True,type=Path)
    args.add_argument('--canon',required=True,type=Path)
    args.add_argument('--vri-xml',required=True,type=Path)
    args.add_argument('--out',required=True,type=Path)
    args.add_argument('--expectations',type=Path,default=Path(__file__).with_name('PORTABLE_SOURCE_EXPECTATIONS.json'))
    a=args.parse_args()
    raw_expected=a.expectations.read_bytes()
    require(sha(raw_expected)==EXPECTED_SHA,'Expected source authority seal mismatch')
    expected=json.loads(raw_expected)
    require(not a.out.exists(),'Output must be a new external directory')
    require(a.publisher_checkout.is_dir(),'Publisher root is not a directory')
    canonical_bytes=a.canon.read_bytes()
    logical=gzip.decompress(canonical_bytes) if canonical_bytes[:2]==b'\x1f\x8b' else canonical_bytes
    require(sha(logical)==expected['canonical_logical_sha256'],'Corrected canonical logical pin mismatch')
    canonical=json.loads(logical)
    require(canonical['source']['commit']==expected['vri_revision'],'VRI edition mismatch')
    xml=a.vri_xml.read_bytes()
    require(sha(xml)==expected['vri_xml_sha256'],'Original VRI XML pin mismatch')
    book=original_xml_tuples(xml)
    require(len(book)==14645 and jsha(book)==expected['vri_book36_tuple_sha256'] and book==canonical['books'][36]['blocks'],'Original full XML tuple scope differs from current canonical book')
    units={unit['id']:unit for unit in canonical['units']}
    for path,pin in expected['rights'].items():pinned_file(a.publisher_checkout/path,pin)
    normalized=[];results=[];totals=Counter()
    for source in expected['poems']:
        uid=source['id'];pub=source['publisher_poem'];unit=units[uid]
        require(jsha(unit)==source['canonical_unit_sha256'],'Canonical unit metadata mismatch: '+uid)
        lo,hi=source['canonical_blocks_half_open']
        require((unit['book'],unit['start'],unit['end'])==(36,lo,hi),'Canonical span mismatch: '+uid)
        wrapper={'id':uid,'book':36,'start':lo,'end':hi,'blocks':book[lo:hi]}
        require(jsha(wrapper)==source['canonical_root_wrapper_sha256'],'Whole wrapper-domain root mismatch: '+uid)
        raw=pinned_file(a.publisher_checkout/source['original']['path'],source['original']).decode()
        front=re.match(r'^---\ntitle: ([^\n]+)\norder: (\d+)\ncategory: chapter-3\n---\n',raw)
        require(front is not None and front[1]==source['title'] and int(front[2])==pub,'Original front matter mismatch: '+uid)
        definitions=list(re.finditer(r'^\[\^(\d+)\]:[ \t]*',raw,re.M))
        require(bool(definitions),'Original note definitions absent: '+uid)
        content=raw[front.end():definitions[0].start()].strip()
        rawparagraphs=re.split(r'\n[ \t]*\n',content)
        paratext=''
        if pub==341:
            require(rawparagraphs[0]=='## Ekapadumiya Chapter, the Thirty-Fifth','Note-free preface changed')
            paratext,pairs=normalize(rawparagraphs.pop(0),'paratext:0');require(not pairs,'Unexpected preface display')
        rawsummary=[]
        if source['chapter_summary']:
            require(rawparagraphs.count('The Summary:')==1,'Chapter summary marker mismatch: '+uid)
            index=rawparagraphs.index('The Summary:');rawsummary=rawparagraphs[index:];rawparagraphs=rawparagraphs[:index]
            require(len(rawsummary)==3,'Chapter summary paragraph count changed: '+uid)
        paragraphs=[];pairs=[]
        for i,paragraph in enumerate(rawparagraphs):
            value,controls=normalize(paragraph,'body:'+str(i));paragraphs.append(value);pairs.extend(controls)
        body='\n\n'.join(paragraphs)
        require(sha(body)==source['body_sha256'] and u16(body)==source['body_characters_utf16'],'Source body pin mismatch: '+uid)
        require(sha(paragraphs[0])==source['publisher_heading_sha256'],'Original heading pin mismatch: '+uid)
        para_pins=[{'sha256':sha(p),'characters_utf16':u16(p),'lines':len(p.splitlines())} for p in paragraphs]
        require(para_pins==source['paragraph_pins'],'Original paragraph pin mismatch: '+uid)
        notes=[];note_pins=[]
        for i,m in enumerate(definitions):
            number=int(m[1]);end=definitions[i+1].start() if i+1<len(definitions) else len(raw)
            text,controls=normalize(raw[m.end():end].strip(),'note:'+str(number));pairs.extend(controls)
            require(not re.search(r'\[Note \d+\]',text),'Unexpected nested note call: '+uid)
            notes.append({'number':number,'text':text});note_pins.append({'number':number,'sha256':sha(text),'characters_utf16':u16(text)})
        note_numbers=[n['number'] for n in notes]
        require(note_numbers==source['note_numbers'] and jsha(notes)==source['notes_sha256'] and note_pins==source['note_pins'],'Original ordered notes mismatch: '+uid)
        require(Counter(map(int,re.findall(r'\[\^(\d+)\]','\n\n'.join(rawparagraphs))))==Counter(note_numbers),'Original note owner/call mismatch: '+uid)
        require(sha(paratext)==source['paratext_sha256'],'Source paratext mismatch: '+uid)
        quotations=[];layout=[]
        for paragraph in paragraphs[1:-2]:
            bare=re.sub(r'\[Note \d+\]','',paragraph)
            suffix=re.search(r'\((\d+(?:-\d+)?)\) \[(\d+(?:-\d+)?)\]$',bare)
            require(suffix is not None,'Printed stanza suffix absent: '+uid)
            local,global_=suffix[1],suffix[2]
            layout.append({'local_label':local,'publisher_label':global_,'suffix':suffix[0],'lines':len(paragraph.splitlines())})
            quotations.append(bare[:suffix.start()].rstrip())
        require(layout==source['stanza_layout'] and [sha(q) for q in quotations]==source['quotation_sha256'],'Physical stanza/quote source domain differs: '+uid)
        summary=None
        if rawsummary:
            texts=[]
            for i,paragraph in enumerate(rawsummary):
                text,controls=normalize(paragraph,'chapter_summary:'+str(i));texts.append(text);pairs.extend(controls)
            text='\n\n'.join(texts);scope=source['chapter_summary']
            require(not re.search(r'\[\^\d+\]','\n'.join(rawsummary)) and scope['note_numbers']==[],'Summary owns unexpected notes: '+uid)
            require(sha(text)==scope['body_sha256'] and jsha([])==scope['notes_sha256'],'Summary source pin mismatch: '+uid)
            start,end=scope['root_start'],scope['root_end']
            require(jsha({'id':uid,'book':36,'start':start,'end':end,'blocks':book[start:end]})==scope['root_sha256'],'Summary wrapper-domain pin mismatch: '+uid)
            spans=ordinal_spans(book,lo,hi)
            first=next(i+1 for i,s in enumerate(spans) if s[0]==start)
            last=next(i+1 for i,s in enumerate(spans) if s[1]==end)
            require((scope['first_ref'],scope['last_ref'])==(uid+'/'+str(first),uid+'/'+str(last)),'Summary source ordinal mismatch: '+uid)
            summary={**scope,'text':text,'translator_notes':[]}
        require(pairs==source['display_pairs'],'Source display ownership/range pin mismatch: '+uid)
        pages=[{'offset':i,'characters_utf16':u16(body[i:i+500]),'text_sha256':sha(body[i:i+500]),'next_offset':i+500 if i+500<len(body) else None} for i in range(0,len(body),500)]
        normalized.append({'id':uid,'publisher_poem':pub,'title':source['title'],'body':body,'translator_notes':notes,'publisher_paratext':paratext,'chapter_summary':summary,'quotation_texts':quotations,'external_source_text_do_not_commit':True})
        results.append({'id':uid,'publisher_poem':pub,'status':'SOURCE_REPLAY_MATCHES_FROZEN_INDEPENDENT_EXPECTATIONS','body_sha256':sha(body),'notes_sha256':jsha(notes),'paratext_sha256':sha(paratext),'body_paragraphs':len(paragraphs),'physical_stanza_entries':len(layout),'note_count':len(notes),'display_pair_count':len(pairs),'whole_root_wrapper_sha256':jsha(wrapper),'chapter_summary':source['chapter_summary'],'pages500':pages})
        totals.update(poems=1,body_paragraphs=len(paragraphs),physical_stanza_entries=len(layout),poem_notes=len(notes),display_pairs=len(pairs),chapter_summaries=bool(summary),note_free_prefaces=bool(paratext),pages500=len(pages),body_characters_utf16=u16(body))
    require(totals==Counter(poems=16,body_paragraphs=213,physical_stanza_entries=165,poem_notes=191,display_pairs=25,chapter_summaries=2,note_free_prefaces=1,pages500=63,body_characters_utf16=28105),'Sixteen-source cohort totals differ')
    a.out.mkdir(parents=True)
    private=write_new(a.out/'NORMALIZED_PRIVATE_DO_NOT_COMMIT.json',{'schema':'portable-sixteen-original-source-replay-private-v1','external_only':True,'poems':normalized})
    report=write_new(a.out/'SOURCE_REPLAY_REPORT.json',{
      'schema':'portable-sixteen-original-source-replay-report-v1','status':'SOURCE_ONLY_REPLAY_PASS_NOT_APPLICATION_OR_RELEASE_ACCEPTANCE',
      'expectations':descriptor(a.expectations),'producer':descriptor(Path(__file__)),
      'publisher_root':str(a.publisher_checkout.resolve()),'canon':descriptor(a.canon),'canonical_logical_sha256':sha(logical),'vri_xml':descriptor(a.vri_xml),
      'all14645_original_XML_tuples_equal_current_book36':True,'rights_artifacts':len(expected['rights']),
      'totals':dict(totals),'poems':results,'private_source_text':private,
      'application_runtime_parser_build_test_Git_network_executions':0,'production_outputs_used_as_oracle':False,
      'runtime_activation_behavior_browser_CI_release_or_push_approval':False
    })
    seal=write_new(a.out/'SOURCE_REPLAY_SEAL.json',{'schema':'portable-sixteen-source-replay-seal-v1','files':{'source_private':private,'source_report':report},'runtime_activation_or_release_approval':False})
    print(json.dumps({'status':'SOURCE_ONLY_REPLAY_PASS','totals':dict(totals),'report':report,'seal':seal}))

if __name__=='__main__':main()
