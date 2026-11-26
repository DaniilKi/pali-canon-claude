"""Ten-record independent source/data oracle, no app/Builder/repair imports."""
import copy,gzip,hashlib,json,re,xml.etree.ElementTree as ET
from pathlib import Path
R=Path('/tmp/pali-next-ten-boundaries-nov26');D=Path(__file__).resolve().parent
PROOFS=Path('/tmp/pali-next-cohort-nov26/docs/evidence/apadana')
CURRENT='0f9eedc279fbf63a93b541c27aae2f6b6e799e7bb3e5805c4da13b1692b9db7b'
COMMIT='2d134ff9ef60f70a1eb03c9370580228811a3070';REV='apadana-thera-next10-v1'
H=lambda v:hashlib.sha256(v if isinstance(v,bytes) else v.encode()).hexdigest()
C=lambda v:json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()
J=lambda v:H(C(v))
def pinned(path,pin):
    raw=path.read_bytes();assert H(raw)==pin,(str(path),H(raw));return json.loads(raw)
def verify_files(directory,name,pin):
    value=pinned(directory/name,pin)
    for filename,binding in value['files'].items():
        raw=(directory/filename).read_bytes()
        if isinstance(binding,str):assert H(raw)==binding
        else:assert H(raw)==binding['sha256'] and len(raw)==binding['bytes']
    return value
seals={}
for directory,name,pin in [
 ('next-boundaries348-375/producer-a','PRESEALED_SOURCE_REVIEW.json','996c470c30f8513faa5219352fad4f55db120898286e46779520ded1fe069eaf'),
 ('next-boundaries348-375/producer-b','PRESEALED_REVIEW.json','2a39ee56a56708e90df7b26111e79905697f16d0ee1ccf33731a95ea4f1aed05'),
 ('book37-first-three-pairs/A','FINAL_SEAL.json','7c1c8449a4acd17e83121d1b403d9d02c33f9891936e3f19b411d9393cac087c'),
 ('book37-first-three-pairs/B','PRESEALED_REVIEW.json','1420b5674a940e3c237eb342246e13e067d3197916d8d0475e1c822dd5af662c')]:
    verify_files(PROOFS/directory,name,pin);seals[directory+'/'+name]=pin
g36=pinned(PROOFS/'next-boundaries348-375/joint-source-handoff/GO_REPORT.json','5a8efdc0c5108dc70fa8de15e5c93e1ffe2e3feb8b683e10f2c245ddd8a391d0')
g37=pinned(PROOFS/'book37-first-three-pairs/joint/JOINT_SOURCE_REVIEW.json','95bd32c722d083f2f8f16e7cbd269e284d95847b40b3337226e8f2e1efbe7c67')
assert g36['core_old_and_proposed4_records_exact'] and g37['before_after_complete_records_compared']==6
review36=json.loads((PROOFS/'next-boundaries348-375/producer-a/SOURCE_REVIEW.json').read_bytes())
review37=json.loads((PROOFS/'book37-first-three-pairs/A/PROPOSED_SIX_CORE_RECORDS.json').read_bytes())
review37b=json.loads((PROOFS/'book37-first-three-pairs/B/BEFORE_AFTER_RECORDS.json').read_bytes())
old={};cores={}
for pair in review36['pairs']:
    old.update(pair['old_full_records']);cores.update(pair['proposed_source_records_without_new_namespace'])
assert cores==g36['source_only_proposed_records']
old.update(review37['before']);cores.update(review37['after_core_only'])
assert review37['before']=={r['id']:r['before'] for r in review37b}
assert review37['after_core_only']=={r['id']:r['source_supported_proposed'] for r in review37b}
IDS=['tha-ap348','tha-ap349','tha-ap374','tha-ap375','tha-ap423','tha-ap424','tha-ap426','tha-ap427','tha-ap428','tha-ap429']
assert list(old)==list(cores)==IDS
def shards(name):
    path=R/'server/data'/f'{name}.json.gz.parts.json';mr=path.read_bytes();m=json.loads(mr);ps=[]
    for p in m['parts']:
        raw=(path.parent/p['file']).read_bytes();assert len(raw)==p['size'] and H(raw)==p['sha256'];ps.append(raw)
    packed=b''.join(ps);assert len(packed)==m['size'] and H(packed)==m['sha256'];raw=gzip.decompress(packed)
    return json.loads(raw),raw,{'manifest_sha256':H(mr),'packed_sha256':H(packed),'logical_sha256':H(raw)}
canon,canonical_raw,canonical_pins=shards('canon');assert H(canonical_raw)==CURRENT and C(canon)==canonical_raw
assert canon['source']['commit']==COMMIT and len(canon['units'])==8544 and len(canon['books'])==61
actual={u['id']:u for u in canon['units']};assert {uid:actual[uid] for uid in IDS}==old
assert all('index_revision' not in actual[uid] for uid in IDS)
collapse=lambda s:re.sub(r'\s+',' ',s).strip()
def visible(e):
    t=e.text or ''
    for child in e:
        if child.tag not in ('note','pb') and not(child.tag=='hi' and child.get('rend') in ('paranum','dot')):t+=visible(child)
        t+=child.tail or ''
    return t
raw_sources={36:('/tmp/pali-sariputta-release/vri-fixture/romn/s0510m1.mul.xml','ad566fefab842ddcf02a84b1bda9b9dafcadba2cbb4e81fad1be58c98cc2bed1','f37368072aece065d2668f93a74c24b423939f1f'),37:('/tmp/pali-boundaries340-evidence-nov26/book37-recovery/s0510m2.mul.xml','23e0721c8fe05a6105b56b627ac38291d10e0eab799a082c257466603f0839a1','c2a96aed52fb5de3e7fe66442633e5f045cf5bdf')}
sourcebindings={};original={};elements={}
for bi,(path,sha,blob) in raw_sources.items():
    raw=Path(path).read_bytes();assert H(raw)==sha and hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()==blob
    physical=[e for e in ET.fromstring(raw).iter() if e.tag in ('p','head','trailer')];rows=[];kept=[];omitted=[]
    for pi,e in enumerate(physical):
        t,n=collapse(visible(e)),e.get('n')
        if not t and not n:omitted.append(pi);continue
        pages={}
        for pb in e.iter('pb'):pages.setdefault(pb.get('ed'),[]).append('.'.join(str(int(k)) for k in pb.get('n').split('.')))
        rows.append([e.get('rend') or ('centre' if e.tag=='trailer' else 'bodytext'),n,t,[collapse(''.join(v.itertext())) for v in e.iter('note')],pages]);kept.append(e)
    assert rows==canon['books'][bi]['blocks']
    original[bi]=rows;elements[bi]=kept
    sourcebindings[str(bi)]={'path':path,'bytes':len(raw),'sha256':sha,'git_blob_sha1':blob,'VRI_commit':COMMIT,'physical_elements':len(physical),'retained_tuples':len(rows),'omitted_note_only_indices':omitted,'full_tuple_sha256':J(rows),'full_original_tuple_equality_current':True}
assert sourcebindings['36']['retained_tuples']==14645 and sourcebindings['37']['retained_tuples']==10672
new={};records=[]
for uid in IDS:
    before=actual[uid];core=cores[uid];assert set(before)==set(core)
    after=copy.deepcopy(before)
    for key in before:after[key]=copy.deepcopy(core[key])
    after['index_revision']=REV;new[uid]=after
    bi=after['book'];rows=original[bi];lo,hi=after['start'],after['end']
    labels=[int(b[1]) for b in rows[lo:hi] if b[1] is not None]
    assert after['vri']==f'{labels[0]}–{labels[-1]}' and labels==list(range(labels[0],labels[-1]+1))
    headings=[(lo+i,b) for i,b in enumerate(rows[lo:hi]) if b[0]=='subhead'];assert len(headings)==1 and headings[0][1][2].endswith(after['title'])
    previous=[(i,b[4]['P'][-1]) for i,b in enumerate(rows[:lo]) if b[4].get('P')]
    markers=[(lo+i,b[4]['P']) for i,b in enumerate(rows[lo:hi]) if b[4].get('P')]
    start=previous[-1][1] if previous else markers[0][1][0];last=markers[-1][1][-1] if markers else start
    assert after['pts']=={'volume':int(start.split('.')[0]),'page':int(start.split('.')[1]),'end_page':int(last.split('.')[1])}
    root=lambda u:J({'id':u['id'],'book':u['book'],'start':u['start'],'end':u['end'],'blocks':rows[u['start']:u['end']]})
    records.append({'id':uid,'before':before,'after':after,'before_object_sha256':J(before),'after_object_sha256':J(after),'before_root_tuple_sha256':root(before),'after_root_tuple_sha256':root(after),'after_source_scope_tuple_sha256':J(rows[lo:hi])})
future=dict(canon,units=[new.get(u['id'],u) for u in canon['units']]);future_raw=C(future);FUTURE=H(future_raw)
inverse=dict(future,units=[old.get(u['id'],u) for u in future['units']]);assert C(inverse)==canonical_raw
others=[u for u in canon['units'] if u['id'] not in IDS]
assert len(others)==8534 and [u for u in future['units'] if u['id'] not in IDS]==others
assert future['books']==canon['books'] and [u['id'] for u in future['units'] if u!=actual[u['id']]]==IDS
oldnamespaces={u['id']:u['index_revision'] for u in canon['units'] if 'index_revision' in u}
assert all(actual[uid].get('index_revision')!=REV for uid in actual)
assert {u['id']:u['index_revision'] for u in future['units'] if 'index_revision' in u and u['id'] not in IDS}==oldnamespaces
assert [u['id'] for u in future['units'] if u.get('index_revision')==REV]==IDS
comment,commentraw,commentpins=shards('commentary');assert H(commentraw)=='8b9c055181913097bb37cbe0046e8c64efcabea884aad49d272a424cd1207461'
assert all(not comment['units'].get(uid) for uid in IDS)
pairs=[('tha-ap348','tha-ap349',10367),('tha-ap374','tha-ap375',10786),('tha-ap423','tha-ap424',51),('tha-ap426','tha-ap427',212),('tha-ap428','tha-ap429',273)]
pairproofs=[];notes=[];sourceblocks=[]
for left,right,cut in pairs:
    a,z=old[left],old[right];bi=a['book'];lo,hi=a['start'],z['end'];rows=original[bi]
    assert a['end']==z['start'] and a['end']-cut==4 and new[left]['end']==new[right]['start']==cut
    assert [b[0] for b in rows[cut:a['end']]]==['subhead','hangnum','gatha1','gathalast']
    pairproofs.append({'ids':[left,right],'book':bi,'old_cut':a['end'],'new_cut':cut,'union':[lo,hi],'union_tuple_sha256':J(rows[lo:hi]),'moved_prefix':[cut,a['end']],'moved_prefix_tuple_sha256':J(rows[cut:a['end']])})
    assert not any(p[3]==bi and p[9]<hi and lo<p[10] for p in comment['passages'])
    for i in range(lo,hi):
        row=rows[i];sourceblocks.append({'book':bi,'block':i,'tuple_sha256':J(row),'old_owner':left if i<a['end'] else right,'new_owner':left if i<cut else right})
        for ni,note in enumerate(row[3]):notes.append({'book':bi,'block':i,'note_index':ni,'text_sha256':H(note),'old_owner':left if i<a['end'] else right,'new_owner':left if i<cut else right})
assert len(sourceblocks)==340 and len(notes)==17 and sum(r['old_owner']!=r['new_owner'] for r in sourceblocks)==20
assert not [u for u in canon['units'] if u.get('shares_passage_with') in IDS or set(u.get('members',[]))&set(IDS)]
assert next(n for n in notes if n['book']==37 and n['block']==214)['new_owner']=='tha-ap427'
assert original[36][10381][0]=='centre' and original[36][10381][2]=='Terasamaṃ bhāṇavāraṃ.'
assert new['tha-ap349']['start']<=10381<new['tha-ap349']['end']
opening=elements[36][10788];prefix=opening.text or '';inline=[]
for child in opening:
    if child.tag=='pb':inline.append({'edition':child.get('ed'),'page':'.'.join(str(int(p)) for p in child.get('n').split('.')),'visible_offset':len(collapse(prefix)),'visible_prefix_sha256':H(collapse(prefix))})
    elif child.tag!='note':prefix+=visible(child)
    prefix+=child.tail or ''
assert next(x for x in inline if x['edition']=='P')['visible_offset']==20
assert new['tha-ap374']['pts']=={'volume':1,'page':290,'end_page':290} and new['tha-ap375']['pts']=={'volume':1,'page':290,'end_page':291}
apraw=(R/'server/data/apadana.json').read_bytes();ap=json.loads(apraw);assert H(apraw)=='18ef986dccbc05cabf311ba44d553b0cf415893484428eecdd476bfe2e1f4bbf' and len(ap['links'])==343
assert not set(IDS)&set(ap['links'])
# Statically decode full compiled profile objects; no app module import.
compiled=(R/'server/index.cjs').read_text();decoder=json.JSONDecoder();profiles={}
def decode_tail(t):return decoder.raw_decode(re.sub(r'\\x([0-9a-fA-F]{2})',r'\\u00\1',t))[0]
for name in('THERI_APADANA_PROFILES','THERA_APADANA_PROFILES'):
    match=re.search(r'var '+name+r'\s*=\s*deepFreeze\d*\(',compiled);assert match;tail=compiled[match.end():]
    if name=='THERI_APADANA_PROFILES':value=decode_tail(tail)
    else:
        spread=re.search(r'\n\s*\.\.\.(THERA_[A-Z0-9_]+)',tail);assert spread
        value=decode_tail(tail[:spread.start()].rstrip().removesuffix(',')+'\n}')
        end=re.search(r'\n\s*}\);',tail[spread.start():]);names=re.findall(r'\.\.\.(THERA_[A-Z0-9_]+)',tail[spread.start():spread.start()+end.start()])
        assert names==['THERA_261_280_PROFILES','THERA_281_285_PROFILES','THERA_287_288_PROFILES','THERA_292_299_PROFILES','THERA_301_310_PROFILES','THERA_312_319_PROFILES','THERA_321_329_PROFILES','THERA_331_334_PROFILES']
        for nested in names:
            nm=re.search(r'var '+nested+r'\s*=\s*(?:deepFreeze\d*\()?\s*',compiled);obj=decode_tail(compiled[nm.end():]);assert not set(value)&set(obj);value.update(obj)
    assert not set(profiles)&set(value);profiles.update(value)
assert len(profiles)==343 and set(profiles)==set(ap['links']) and not set(profiles)&set(IDS)
assert J(profiles)=='10bdd7fe9a67caae44858e2e257724cfbc9d5b6a9a55285c389bba27f5e4bc22'
revision_pin=COMMIT+'-'+REV
assert len(REV)==23 and len(revision_pin)==64 and re.fullmatch(r'[a-zA-Z0-9._-]{1,40}',REV)
assert re.fullmatch(r'[a-f0-9]{40}(?:-[a-zA-Z0-9._-]{1,40})?',revision_pin) and len(revision_pin)<=80
datapins={p.name:{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())} for p in (R/'server/data').iterdir() if p.is_file()}
report={'schema':'independent-original-first-next-ten-source-oracle-v1','status':'PRESEALED_EXACT_TEN_RECORD_FUTURE_EXPECTATIONS_NOT_ACTIVATION',
 'application_baseline_commit':'dd7b697df2c54308084fffd934af38130d01f952','research_commit':'902bc627','targets':IDS,'index_revision':REV,'index_revision_length':len(REV),'locator_revision':revision_pin,'locator_revision_length':len(revision_pin),
 'old_canonical_logical_sha256':CURRENT,'future_canonical_logical_sha256':FUTURE,'serialization':'UTF-8 JSON ensure_ascii=False,separators=(comma,colon),existing key/unit order retained; append index_revision only to each of10target objects',
 'source_preseals':seals,'source_joint_reports':{'Book36':'5a8efdc0c5108dc70fa8de15e5c93e1ffe2e3feb8b683e10f2c245ddd8a391d0','Book37':'95bd32c722d083f2f8f16e7cbd269e284d95847b40b3337226e8f2e1efbe7c67'},
 'original_sources':sourcebindings,'records':records,'pair_proofs':pairproofs,
 'preservation':{'whole_unit_count':8544,'all61_books_sha256':J(canon['books']),'full_other8534_records_sha256':J(others),'other_full_records':8534,'strict_ten_inverse_equal_original_complete_bytes':True,'all_prior_namespaces':oldnamespaces,'all_prior_namespaces_sha256':J(oldnamespaces),'new_revision_on_exact10_only':True,'canonical_source_object_sha256':J(canon['source']),
    'commentary':commentpins,'commentary_associations':sum(map(len,comment['units'].values())),'no_target_association_or_union_interval_conflict':True,'343_full_profiles_sha256':J(profiles),'343_full_links_sha256':J(ap['links']),'343_manifest_sha256':H(apraw),'all343_choices_outside10targets':True,'current_data_file_inventory':datapins},
 'notes_and_pages':{'all17_original_note_occurrences':notes,'note214_future_owner':'tha-ap427','all_original_notes_pages_and_rendering_tags_unchanged':True,'PTS10788_inline':inline,'PTS374_375_new':{'tha-ap374':new['tha-ap374']['pts'],'tha-ap375':new['tha-ap375']['pts']},'recitation10381':{'kind':'centre','tuple_sha256':J(original[36][10381]),'owner':'tha-ap349','not_stanza':True}},
 'namespace_scope':{'fits_current_index_and_widget_analysis_source_pin_regexes':True,'fits_effective80_character_limit':True,'current_closed_locator_registry_not_yet_extended':True,'root_architecture_and_activation_approval_pending':True},
 'holds':['This is an independent source/dataset oracle. No complete future dataset is written into the application or activated.','Root owns namespace policy, closed target registration and compatibility before activation; all144old positional intents require separate refusal/current-version review, including unchanged-source refs.','Preserve earlier repair helper constants/hooks/authorities with explicit ordered stages/inverses. Do not broaden the Book36 matcher for split Book37 speaker formulas.','No raw English or personal records accessed;343Englishobjects preserved by exact current hashes, not new source acquisition.','Runtime/package/browser/fullcheck/exactCI/release/push and private-data migration approval are outside this oracle.'],
 'source_ownership_presealed_before_isolated_renderer':True,'app_Builder_or_proposed_repair_imports':False,'coverage_gain':0}
def write(name,obj):
    with(D/name).open('x',encoding='utf8') as f:f.write(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
write('FUTURE_ORACLE.json',report);write('OLD_TEN_RECORDS.json',old);write('NEW_TEN_RECORDS.json',new)
write('SOURCE340_BLOCKS.json',{'source_only':True,'rows':sourceblocks,'notes':notes})
write('PRESEALED_ORACLE.json',{'schema':'independent-next-ten-future-oracle-preseal-v1','files':{p.name:{'bytes':p.stat().st_size,'sha256':H(p.read_bytes())} for p in D.iterdir() if p.is_file()},'future_canonical_logical_sha256':FUTURE,'no_activation':True})
# Minimal original-source input for the same existing isolated renderer, with
# null outside the five finite union ranges. No full corpus copy is produced.
locations={}
for bi,book in enumerate(canon['books']):
    for row in book['blocks']:
        for ed in('T','M','V'):
            for at in row[4].get(ed,[]):locations.setdefault((ed,book['collection'],at),set()).add(bi)
needs=sorted({ed+'|'+coll for(ed,coll,at),owners in locations.items() if len(owners)>1})
books=[{k:v for k,v in book.items() if k!='blocks'} for book in canon['books']]
for bi,end in((36,10815),(37,333)):books[bi]['blocks']=[None]*end
for row in sourceblocks:books[row['book']]['blocks'][row['block']]=original[row['book']][row['block']]
write('ISOLATED_RENDER_INPUT.json',{'canon':{'books':books,'units':[old[uid] for uid in IDS]},'old_units':[old[uid] for uid in IDS],'proposed_units':[new[uid] for uid in IDS],'needsBook':needs,'presealed_source_report_sha256':H((D/'FUTURE_ORACLE.json').read_bytes())})
print(json.dumps({'status':report['status'],'future_canonical_logical_sha256':FUTURE,'oracle_sha256':H((D/'FUTURE_ORACLE.json').read_bytes()),'old_records_sha256':H((D/'OLD_TEN_RECORDS.json').read_bytes()),'new_records_sha256':H((D/'NEW_TEN_RECORDS.json').read_bytes()),'preseal_sha256':H((D/'PRESEALED_ORACLE.json').read_bytes()),'namespace_length':len(REV),'locator_length':len(revision_pin)}))
