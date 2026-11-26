"""Independent bounded original-first source evidence; no project module imports."""
from pathlib import Path
import argparse, copy, datetime, gzip, hashlib, json, re
import xml.etree.ElementTree as ET

P=argparse.ArgumentParser()
P.add_argument('--project',type=Path,default=Path('/tmp/pali-boundaries340-nov26'))
P.add_argument('--xml',type=Path,default=Path('/tmp/pali-boundaries340-evidence-nov26/book37-recovery/s0510m2.mul.xml'))
P.add_argument('--output',type=Path,default=Path(__file__).parent)
a=P.parse_args();a.output.mkdir(parents=True,exist_ok=True)
H=lambda b:hashlib.sha256(b).hexdigest()
C=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
pin=lambda p:{'path':str(p),'bytes':p.stat().st_size,'sha256':H(p.read_bytes())}
norm=lambda s:' '.join(s.split())
raw=a.xml.read_bytes()
assert H(raw)=='23e0721c8fe05a6105b56b627ac38291d10e0eab799a082c257466603f0839a1'
blob=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
assert blob=='c2a96aed52fb5de3e7fe66442633e5f045cf5bdf'
data=a.project/'server/data'
manifest_path=data/'canon.json.gz.parts.json';manifest=json.loads(manifest_path.read_bytes())
packed=b''.join((data/p['file']).read_bytes()for p in manifest['parts'])
logical=gzip.decompress(packed);canon=json.loads(logical)
assert H(logical)=='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
book=canon['books'][37];assert book['file']=='s0510m2.mul.xml'
current=book['blocks']

# Decode only the prefix needed for the three pairs and unchanged neighbors.
def visible(e):
    s=e.text or ''
    for ch in e:
        if ch.tag!='note':s+=visible(ch)
        s+=ch.tail or ''
    return s

source=[];source_pages=[]
for e in ET.fromstring(raw).iter():
    if e.tag not in ('p','head','trailer'):continue
    kind=e.attrib.get('rend',e.tag);text=norm(visible(e));notes=[norm(''.join(n.itertext()))for n in e.iter('note')]
    n=e.attrib.get('n');pages={}
    for pb in e.iter('pb'):
        ed=pb.attrib['ed'];v,p=map(int,pb.attrib['n'].split('.'))
        pages.setdefault(ed,[]).append(f'{v}.{p}')
    if kind=='hangnum':text=re.sub(r'^\d+\.\s*','',text)
    if not text and not n and not notes and not pages:continue
    source.append([kind,n,text,notes,pages])
    if len(source)==334:break
assert source==current[:334], 'Exact original-source type/label/text/note/page tuples'

TARGET=[423,424,426,427,428,429]
before={u['id']:copy.deepcopy(u)for u in canon['units']if u['id']in[f'tha-ap{n}'for n in TARGET]}
assert len(before)==6
spec=[(423,424,51,55,48,49,50,'sakiṃsammajjako'),(426,427,212,216,209,210,211,'sattakadambapupphiyo'),(428,429,273,277,270,271,272,'ghatamaṇḍadāyako')]
after=copy.deepcopy(before);evidence=[]
HEAD={'subhead','title','chapter','book','nikaya','subsubhead'}
PAGE_HEAD=HEAD|{'centre'}
VERSE={'gatha1','gatha2','gatha3','gathalast'}
CENTRE=re.compile(r'(niṭṭhit[aāo]ṃ?|niṭṭhitā|samattaṃ|samattā)\.?$|^Namo tassa|uddānaṃ$',re.I)

def vri_range(start,end):
    labels=[r[1]for r in source[start:end]if r[1]]
    return labels[0]if len(labels)==1 else labels[0].split('-')[0]+'–'+labels[-1].split('-')[-1]

def pts(start,end):
    carried=None
    for b in source[:start]:
        if b[4].get('P'):carried=b[4]['P'][-1]
    rows=source[start:end];body=next(b for b in rows if b[0]not in PAGE_HEAD)
    # All twelve old/proposed target openings are page-free hangnum blocks.
    assert body[0]=='hangnum'and not body[4].get('P')
    inside=[p for b in rows for p in b[4].get('P',[])]
    first=inside[0]if inside else None
    start_page=carried if carried and(not first or carried.split('.')[0]==first.split('.')[0])else first
    assert start_page
    v,p=map(int,start_page.split('.'));last=(inside[-1]if inside else start_page).split('.')[-1]
    return {'volume':v,'page':p,'end_page':int(last)}

for left,right,cut,oldcut,s1,s2,closing,speaker in spec:
    l=before[f'tha-ap{left}'];r=before[f'tha-ap{right}']
    assert l['end']==r['start']==oldcut
    assert source[cut][0]=='subhead'and source[cut+1][0]=='hangnum'
    assert source[closing][0]=='centre'and closing==cut-1
    assert source[s1][0]=='centre'and source[s2][0]=='bodytext'
    assert source[s1][2].startswith('Itthaṃ sudaṃ āyasmā '+speaker+' thero imā')
    assert source[s2][2]in ('Abhāsitthāti.','Gāthāyo abhāsitthāti.')
    assert source[closing][2].casefold().startswith((speaker.removesuffix('o')+'attherassāpadānaṃ').casefold())
    title=re.sub(r'^\d+\.\s*','',source[cut][2]);assert title==r['title']+'ṃ'
    after[l['id']]['end']=cut;after[r['id']]['start']=cut;after[r['id']]['title']=title
    for u in (l,r):
        assert u['vri']==vri_range(u['start'],u['end'])
        assert u['pts']==pts(u['start'],u['end'])
        v=after[u['id']];v['vri']=vri_range(v['start'],v['end']);v['pts']=pts(v['start'],v['end'])
    evidence.append({'left_id':l['id'],'right_id':r['id'],'current_cut':oldcut,'source_supported_cut':cut,'source_union_half_open':[l['start'],r['end']],'current_union_tuple_sha256':H(C(source[l['start']:r['end']])),'speaker_fragments':[{'block':k,'style':source[k][0],'raw_text':source[k][2],'tuple_sha256':H(C(source[k]))}for k in(s1,s2)],'named_closing':{'block':closing,'style':source[closing][0],'text_sha256':H(source[closing][2].encode())},'right_heading':{'block':cut,'title':title,'text_sha256':H(source[cut][2].encode())},'opening_VRI_label':source[cut+1][1],'moved_blocks':[{'block':k,'kind':source[k][0],'VRI_label':source[k][1],'tuple_sha256':H(C(source[k])),'notes_sha256':H(C(source[k][3])),'note_count':len(source[k][3]),'page_begins':source[k][4]}for k in range(cut,oldcut)],'status':'GO_SOURCE_CUT_ONLY','Book36_signature_failure':'Previous speaker formula is centre partial + bodytext capitalized continuation, not one complete bodytext formula; source strings/tags are not changed.'})

# Literal model of current renderUnitSegments behavior; no application import.
editions={'T':('thai','Thai'),'M':('myanmar','Myanmar'),'V':('vri','VRI')}
marker_books={}
for bi,b in enumerate(canon['books']):
    if b['collection']!='ap':continue
    for row in b['blocks']:
        for ed in editions:
            for page in row[4].get(ed,[]):marker_books.setdefault((ed,page),set()).add(bi)
qualified={ed for(ed,p),owners in marker_books.items()if len(owners)>1}

def render(u):
    out=[];stanza=None;pending=[]
    def flush():
        nonlocal stanza
        if stanza is not None:out.append(stanza);stanza=None
    for k in range(u['start'],u['end']):
        kind,n,text,notes,pages=source[k]
        p_labels=['Ap ii '+p.split('.')[1]for p in pages.get('P',[])]
        ed_labels=pending;pending=[]
        for ed,(_,name)in editions.items():
            for page in pages.get(ed,[]):ed_labels.append((ed,name+' Ap '+page+(' ('+book['title']+')'if ed in qualified else'')))
        if kind=='hangnum':
            flush();stanza={'type':'verse','vri':n,'text':'','pts':[],'eds':ed_labels,'notes':[],'start':k,'end':k+1};continue
        if kind in VERSE:
            if stanza is None:stanza={'type':'verse','vri':n,'text':'','pts':[],'eds':[],'notes':[],'start':k,'end':k+1}
            stanza['end']=k+1;stanza['text']+=('\n'if stanza['text']else'')+text
            stanza['pts']+=p_labels;stanza['eds']+=ed_labels;stanza['notes']+=notes
            if kind=='gathalast':flush()
            continue
        flush()
        if not text:pending=ed_labels;continue
        out.append({'type':'heading'if kind in HEAD or(kind=='centre'and CENTRE.search(text))else'prose','vri':n,'text':text,'pts':p_labels,'eds':ed_labels,'notes':notes,'start':k,'end':k+1})
    flush();result=[]
    for i,s in enumerate(out):
        row={'ref':u['id']+'/'+str(i+1),'uid':u['id'],'offset':i,'type':s['type'],'source_blocks':[s['start'],s['end']],'text_sha256':H(s['text'].encode()),'text_utf16_length':len(s['text'].encode('utf-16-le'))//2,'VRI_label':s['vri'],'variant_note_count':len(s['notes']),'variant_notes_sha256':H(C(s['notes'])),'pts_page_begins':list(dict.fromkeys(s['pts']))}
        for ed,(key,_)in editions.items():row[key+'_page_begins']=list(dict.fromkeys(label for e,label in s['eds']if e==ed))
        result.append(row)
    return result

old_segments=[s for u in before.values()for s in render(u)]
new_segments=[s for u in after.values()for s in render(u)]
assert len(old_segments)==len(new_segments)
identity=lambda s:(tuple(s['source_blocks']),s['type'],s['text_sha256'],s['VRI_label'],s['variant_notes_sha256'],tuple(s['pts_page_begins']),tuple(s['thai_page_begins']),tuple(s['myanmar_page_begins']),tuple(s['vri_page_begins']))
new_by_source={identity(s):s for s in new_segments};new_by_ref={s['ref']:s for s in new_segments}
assert len(new_by_source)==len(new_segments)
cross=[]
for s in old_segments:
    owner=new_by_source[identity(s)];numeric=new_by_ref.get(s['ref'])
    category='VANISHED_OLD_OWNER_REF'if numeric is None else'SAME_NUMERIC_REF_SAME_SOURCE'if identity(numeric)==identity(s)else'SAME_NUMERIC_REF_DIFFERENT_SOURCE'
    cross.append({'old':s,'same_source_future':owner,'same_numeric_future':numeric,'category':category,'owner_moves':owner['uid']!=s['uid'],'legacy_position_requires_separate_version_policy':True,'automatic_private_record_migration_authorized':False})
stats={k:sum(r['category']==k for r in cross)for k in('VANISHED_OLD_OWNER_REF','SAME_NUMERIC_REF_SAME_SOURCE','SAME_NUMERIC_REF_DIFFERENT_SOURCE')}
stats.update({'old_segments':len(old_segments),'proposed_segments':len(new_segments),'cross_owner_moved_segments':sum(r['owner_moves']for r in cross),'moved_source_blocks':sum(e['current_cut']-e['source_supported_cut']for e in evidence)})
records=[]
for key,u in before.items():
    v=after[key];changed=[k for k in set(u)|set(v)if u.get(k)!=v.get(k)]
    assert set(changed)<= {'start','end','title','vri','pts'}
    records.append({'id':key,'before':u,'source_supported_proposed':v,'before_record_sha256':H(C(u)),'proposed_record_sha256':H(C(v)),'changed_fields':sorted(changed),'before_segment_count':len(render(u)),'proposed_segment_count':len(render(v)),'before_scope_tuple_sha256':H(C(source[u['start']:u['end']])),'proposed_scope_tuple_sha256':H(C(source[v['start']:v['end']])),'PTS_fields_changed':u['pts']!=v['pts']})
assert all(not r['PTS_fields_changed']for r in records)
bindings={'schema':'independent-book37-first3-source-bindings-v1','raw_XML':pin(a.xml),'VRI_commit':'2d134ff9ef60f70a1eb03c9370580228811a3070','raw_git_blob_sha1':blob,'current_canonical_parts_manifest':pin(manifest_path),'current_canonical_logical_sha256':H(logical),'book_index':37,'book_file':book['file'],'source_prefix_compared_blocks':334,'target_pair_union_blocks':256,'exact_raw_source_tuple_fields':['style','VRI_label','text','variant_notes','page_begins'],'project_sources_read_statically':{n:pin(a.project/n)for n in('src/canon.mjs','src/editions.mjs','scripts/canon/build_canon.py')},'application_or_Builder_imported_or_executed':False,'other_new_review_outputs_read':False}
report={'schema':'independent-original-first-book37-first3-source-review-v1','status':'GO_SOURCE_ONLY_THREE_CUTS_IMPLEMENTATION_AND_ACTIVATION_HELD','reviewed_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_supported_cuts':[e['source_supported_cut']for e in evidence],'current_cuts':[e['current_cut']for e in evidence],'records':records,'pairs':evidence,'segment_stats':stats,'source_words_notes_and_page_tuples_unchanged':True,'PTS_metadata_unchanged_all6':True,'retained_current_rendering_peculiarities':['423/426/428speakerformula remains two separate centre/bodytext prose fragments.','424/427speakerformula is original gathalast and remains inside final numbered verse segment.','429has consecutive gathalast paragraphs at291/292; block292remains a separate unnumbered verse under current rendering. No retagging or verse expansion.'],'defensibility':'Each exact left named closing precedes the next literal subhead and first numbered stanza. Split speaker fragments complete the left formula before that colophon; narrative changes independently corroborate the new owner. Do not generalize Book36single-bodytext signature.','holds':['Source-only six proposed records; no canonical file,namespace,application parser or locator policy is changed.','Every old numeric position needs a separately reviewed version/refusal policy,including stable-looking refs; never migrate notes/bookmarks/drafts/exports automatically.','Current segmentation is modeled statically,not application-executed acceptance. Preserve literal tag-driven peculiarities and all note/page ownership.','Downstream commentary/parallels/groups,runtime/index/build/installed/CI verification are not certified by this source-only task.','No English identity,translation,rights clearance or coverage gain is inferred.'],'A_or_other_new_review_read':False,'activation_count':0,'full_corpus_proof_or_future_canonical_logical_hash_generated':False,'method':'Independent stdlib raw XML prefix extraction and metadata comparison; complete6current/proposed records; literal current segment model from statically read source; no project module import,app/parser/Builder/tests/build/Git/CI/network/private-data operation.'}
objects={'SOURCE_BINDINGS.json':bindings,'SOURCE_REVIEW.json':report,'BEFORE_AFTER_RECORDS.json':records,'SEGMENT_CROSSWALK.json':{'schema':'book37-first3-source-segment-crosswalk-v1','stats':stats,'records':cross},'SEGMENT_ORACLES.json':{'schema':'book37-first3-static-current-rendering-model-v1','before':old_segments,'source_supported_proposed':new_segments,'edition_scope_qualifier_flags':sorted(qualified)}}
for name,value in objects.items():
    with(a.output/name).open('x',encoding='utf8')as f:f.write(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
seal={'schema':'independent-book37-first3-original-first-preseal-v1','status':'SEALED_BEFORE_ANY_OTHER_NEW_REVIEW_COMPARISON','files':{name:H((a.output/name).read_bytes())for name in objects},'producer':pin(Path(__file__)),'other_new_reviews_read':False,'no_activation':True}
with(a.output/'PRESEALED_REVIEW.json').open('x')as f:f.write(json.dumps(seal,indent=2)+'\n')
print(json.dumps({'stats':stats,'records':[(r['id'],r['source_supported_proposed']['start'],r['source_supported_proposed']['end'],r['source_supported_proposed']['vri'],r['before_segment_count'],r['proposed_segment_count'])for r in records],'files':{n:H((a.output/n).read_bytes())for n in[*objects,'PRESEALED_REVIEW.json']}}))
