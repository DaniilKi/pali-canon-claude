"""Independent stdlib replay of eight pinned publisher scopes; no project imports."""
from pathlib import Path
import ast,collections,datetime,gzip,hashlib,html,json,re,subprocess,xml.etree.ElementTree as ET
O=Path('/tmp/pali325-nov26/independent-source-review');P=Path('/tmp/pali-thera301-310-local');F=Path('/tmp/pali-301-310-official-fixture');RAW=Path('/tmp/pali-after280-source-prep/raw');V=Path('/tmp/pali-next-batch-boundaries/vri/romn')
PUB='fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4';VRI='2d134ff9ef60f70a1eb03c9370580228811a3070';BASE='4c69f023c9fe1093ad8aadf0ac7f3caf766d92f0';CAND='6555a21f7290a28a893a8dfb3aa37117ff13afd6';NUMS=[301,302,303,304,305,308,309,310];IDS=['tha-ap'+str(n) for n in [303,304,305,306,307,310,311,312]]
sha=lambda b:hashlib.sha256(b if isinstance(b,bytes) else b.encode()).hexdigest();js=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'));J=lambda x:sha(js(x));blob=lambda b:hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest();read=lambda p:json.loads(p.read_bytes());git=lambda d,*a:subprocess.check_output(['git',*a],cwd=d)
assert git(P,'rev-parse','HEAD').decode().strip()==CAND
assert git(F,'rev-parse','HEAD').decode().strip()==PUB
assert git(F,'show','-s','--format=%T',PUB).decode().strip()=='dee02e7343e559abfed5b1fb1099fb64607cbff4'
rights_paths=['LICENSE.md','src/_pages/about.md','src/_includes/site/footer.njk','src/_includes/layouts/epub-metadata.xml','src/_data/site.json','src/_poems/_poems.json']
artifacts=[]
for path in rights_paths+[f'src/_poems/chapter-3/poem-{n}.md' for n in NUMS]:
 b=(F/path).read_bytes();assert git(F,'show',PUB+':'+path)==b,path
 tree=git(F,'ls-tree',PUB,path).decode().split();assert tree[0]=='100644' and tree[2]==blob(b),path
 if (RAW/path).exists():assert (RAW/path).read_bytes()==b,path
 artifacts.append(dict(path=path,bytes=len(b),sha256=sha(b),git_blob_sha1=blob(b),pinned_commit=PUB,second_preserved_copy_matches=(RAW/path).exists()))
license=(F/'LICENSE.md').read_text();about=(F/'src/_pages/about.md').read_text();footer=(F/'src/_includes/site/footer.njk').read_text();epub=(F/'src/_includes/layouts/epub-metadata.xml').read_text();site=read(F/'src/_data/site.json');route=read(F/'src/_poems/_poems.json')
assert 'Attribution-NonCommercial-ShareAlike 4.0 International' in license and 'for NonCommercial purposes only' in license
assert 'The text of the translation and the site’s code' in about and '[CC-BY-NC-SA license][8]' in about and '[8]: https://creativecommons.org/licenses/by-nc-sa/4.0/' in about
assert 'Jonathan S. Walters and Whitman College' in footer and 'by-nc-sa/4.0/' in footer
assert '<dc:creator>Jonathan S. Walters</dc:creator>' in epub and '<dc:rights>https://creativecommons.org/licenses/by-nc-sa/4.0/</dc:rights>' in epub
assert site['license']['title']=='CC-BY-4.0' and route['permalink']=='/text/{{ category | slug }}/{{ page.fileSlug }}/index.html'
manifest=read(P/'server/data/canon.json.gz.parts.json');parts=[]
for part in manifest['parts']:
 b=(P/'server/data'/part['file']).read_bytes();assert len(b)==part['size'] and sha(b)==part['sha256'];parts.append(b)
compressed=b''.join(parts);assert len(compressed)==manifest['size'] and sha(compressed)==manifest['sha256'];canon=json.loads(gzip.decompress(compressed));assert canon['source']['commit']==VRI
book=canon['books'][36];assert book['file']=='s0510m1.mul.xml';units={u['id']:u for u in canon['units']};rootbytes=(V/'s0510m1.mul.xml').read_bytes();commentbytes=(V/'s0510a.att.xml').read_bytes()
assert blob(rootbytes)=='f37368072aece065d2668f93a74c24b423939f1f' and len(rootbytes)==2464074
assert blob(commentbytes)=='d5a3b791ac751f0a8e9c1e96c6877ea20a983917' and len(commentbytes)==2838750
xml=ET.fromstring(rootbytes)
def plain(e):
 out=[e.text or '']
 for ch in e:
  if ch.tag not in ('note','pb') and not(ch.tag=='hi' and ch.get('rend') in ('paranum','dot')):out.append(plain(ch))
  out.append(ch.tail or '')
 return ''.join(out)
clean=lambda x:re.sub(r'\s+',' ',x).strip();blocks=[];omitted=[];physical=[x for x in xml.iter() if x.tag in ('p','head','trailer')]
for i,e in enumerate(physical):
 text=clean(plain(e));n=e.get('n');notes=[clean(''.join(x.itertext())) for x in e.iter('note')];pages={}
 for pb in e.iter('pb'):pages.setdefault(pb.get('ed'),[]).append('.'.join(str(int(x)) for x in pb.get('n').split('.')))
 if not text and not n:omitted.append(dict(physical_zero_based=i,notes_sha256=J(notes)));continue
 blocks.append([e.get('rend') or ('centre' if e.tag=='trailer' else 'bodytext'),n,text,notes,pages])
assert len(physical)==14646 and len(blocks)==14645 and blocks==book['blocks'] and [x['physical_zero_based'] for x in omitted]==[1130]
def rootpin(uid,start,end):return J(dict(id=uid,book=36,start=start,end=end,blocks=blocks[start:end]))
# Only syntax actually present in these eight originals is removed. No source wording edited.
def normalize(t):
 t=re.sub(r'\[([^\]]*)\]\{\.diacritics data-state=on\}\[([^\]]*)\]\{\.no-diacritics data-state=off\}',lambda m:m[1],t)
 t=re.sub(r'<abbr\s+title="[^"]+">([^<]+)</abbr>',lambda m:m[1],t)
 t=t.replace('\\[','[').replace('\\]',']').replace('\\#','#')
 t=re.sub(r'\[\^(\d+)\]',lambda m:'[Note '+m[1]+']',t);t=t.replace('*','');t=html.unescape(t);t=re.sub(r'^### +','',t)
 return '\n'.join(l.rstrip() for l in t.strip().splitlines())
def intake(n,base):
 text=(base/f'src/_poems/chapter-3/poem-{n}.md').read_text();_,front,after=text.split('---',2);fm=dict(re.findall(r'^(title|order|category): (.+)$',front,re.M));assert fm['order']==str(n) and fm['category']=='chapter-3';parts=re.split(r'\n\s*\n',after.strip());notes=[];body=[];summary=[]
 for part in parts:
  m=re.match(r'^\[\^(\d+)\]:\s*(.*)$',part,re.S)
  if m:notes.append(dict(number=int(m[1]),text=normalize(m[2])))
  elif summary or part=='The Summary:':summary.append(normalize(part))
  else:body.append(normalize(part))
 return fm,body,notes,summary
profiles=read(P/'docs/evidence/apadana/THERA_301_310_EXPECTED_PROFILES.json');runtime=read(P/'server/data/apadana.json');prior=json.loads(git(P,'show',BASE+':server/data/apadana.json'));assert list(profiles)==IDS and len(prior['links'])==317 and len(runtime['links'])==325
assert all(runtime['links'][uid]==v for uid,v in prior['links'].items());assert set(runtime['links'])-set(prior['links'])==set(IDS)
for table in ['translations.json','anandajoti.json']:
 old=json.loads(git(P,'show',BASE+':server/data/'+table));assert all(uid not in js(old) for uid in IDS)
assert not any(re.fullmatch(r'tha-ap\d+-\d+',u['id']) for u in canon['units'])
rows=[];alllayout=[];note_total=0;paragraph_total=0
for n,uid in zip(NUMS,IDS):
 p=profiles[uid];u=units[uid];fm,body,notes,summary=intake(n,F);poemnotes=[x for x in notes if n!=310 or x['number']!=8];layout=[]
 for part in body:
  m=re.search(r'\((\d+(?:-\d+)?)\) \[(\d+(?:-\d+)?)\]$',part)
  if m:layout.append(dict(local_label=m[1],publisher_label=m[2],suffix=m[0],lines=len(part.splitlines())))
 bodytext='\n\n'.join(body);assert p['poem']==n and p['title']==fm['title'];assert sha(bodytext)==p['body_sha256'] and J(poemnotes)==p['notes_sha256'] and sha('')==p['paratext_sha256'];assert layout==p['stanza_layout']
 assert rootpin(uid,u['start'],u['end'])==p['root_sha256'];assert [int(b[1]) for b in blocks[u['start']:u['end']] if b[0]=='hangnum']==list(range(p['root_verses'][0],p['root_verses'][1]+1))
 assert [x['number'] for x in poemnotes]==p['note_numbers'] and len(poemnotes)==p['note_count'];assert set(map(int,re.findall(r'\[Note (\d+)\]',bodytext)))==set(p['note_numbers']);assert body[-2].startswith('Thus indeed Venerable '+fm['title']) and body[-1]=='The legend of '+fm['title']+' Thera is finished.'
 assert runtime['links'][uid]['body_sha256']==p['body_sha256'] and bodytext not in (P/'server/data/apadana.json').read_text()
 labels=sum(int(x['local_label'].split('-')[-1])-int(x['local_label'].split('-')[0])+1 for x in layout);notesmeta=[dict(number=x['number'],text_sha256=sha(x['text']),characters=len(x['text'])) for x in poemnotes]
 row=dict(publisher=n,id=uid,title=fm['title'],decision='GO_EXACT_COMPLETE_PUBLISHER_EDITION_SCOPE_ONLY',raw_sha256=p['raw_sha256'],body_sha256=sha(bodytext),notes_sha256=J(poemnotes),root_sha256=rootpin(uid,u['start'],u['end']),paragraphs=len(body),physical_stanza_entries=len(layout),printed_labels=labels,layout=layout,notes=notesmeta,pali=dict(start=u['start'],end=u['end'],numbering=u['vri'],title=u['title'],previous=units['tha-ap'+str(int(uid[6:])-1)]['title'],next=units['tha-ap'+str(int(uid[6:])+1)]['title'],has_abbreviated_final_attainment=any('…pe…' in b[2] for b in blocks[u['start']:u['end']])),no_publisher_preface=not any('Chapter' in s for s in body),bundled_full_body_absent=True)
 if n==310:
  s=p['chapter_summary'];sn=[x for x in notes if x['number']==8];summarytext='\n\n'.join(summary);assert len(summary)==3 and len(sn)==1 and 'one less than fifty' in summarytext;assert sha(summarytext)==s['body_sha256'] and J(sn)==s['notes_sha256'];assert rootpin(uid,9221,9226)==s['root_sha256'];assert s['first_ref']=='tha-ap312/9' and s['last_ref']=='tha-ap312/11';assert [x['number'] for x in poemnotes]==list(range(1,8));assert '[Note 8]' not in bodytext and '[Note 8]' in summarytext
  row['separate_chapter_summary']=dict(paragraphs=3,body_sha256=sha(summarytext),notes_sha256=J(sn),note_numbers=[8],root_sha256=s['root_sha256'],root_blocks=[9221,9226],refs=['tha-ap312/9','tha-ap312/11'],publisher_stated=49,vri_stated=51,publisher_order=['marker','six-line verse','chapter closing'],vri_order=['chapter closing','marker','verse'],does_not_approve_held306_307=True,excluded_from_poem_body_and_quotation_material=True)
 rows.append(row);alllayout+=layout;note_total+=len(poemnotes);paragraph_total+=len(body)
assert paragraph_total==58 and len(alllayout)==34 and sum(x['printed_labels'] for x in rows)==36 and note_total==31
# Specific identity/edition witnesses from original XML, not receipt text.
witness={301:['mātaṅgavāraṇo','Paccekajinaseṭṭhesu','padmakesaramokiriṃ'],302:['Gandhamālaṃ','vipassissa','koseyyavatthamuttamaṃ','suceḷo'],303:['Kaṇikāraṃva','Vipassiṃ','sakaṃ gharaṃ','paramannamadāsahaṃ'],304:['Vipassino','Catusaccaṃ','uttarāmukho','Tettiṃsamhi','Sutavā'],305:['Bhāgīrathīnadītīre','assamo','Vipassiṃ','phalahattho'],308:['Atthadassissa','sāvakaṃ','Navakammaṃ','sīmāya','Aṭṭhārase kappasate'],309:['supinantena','siddhatthaṃ','pītaraṃsiṃva','sugatiṃ upapajjahaṃ','Catunnavutito'],310:['Piyadassino','pabbhāro','Ghaṭakañca','Sahassakaṇḍo satabheṇḍu','yūpo','susuddho']}
for row in rows:
 u=units[row['id']];text=' '.join(b[2] for b in blocks[u['start']:u['end']]);assert all(s in text for s in witness[row['publisher']]);row['independently_observed_narrative_witness_terms']=witness[row['publisher']]
assert blocks[9067][3]==['gandhamadadiṃ (syā.)'];assert not blocks[9118][3] and not blocks[9192][3];assert blocks[9210][3]==['satageṇḍu (syā. ka.)'];assert 'ekapaññāsa' in blocks[9225][2] and blocks[9221][0]=='centre' and blocks[9222][2]=='Tassuddānaṃ –'
holds=[]
for n,uid in [(306,'tha-ap308'),(307,'tha-ap309')]:
 fm,body,notes,summary=intake(n,RAW);assert uid not in runtime['links'];b=(RAW/f'src/_poems/chapter-3/poem-{n}.md').read_bytes();assert b==git(F,'show',PUB+f':src/_poems/chapter-3/poem-{n}.md');holds.append(dict(publisher=n,id=uid,title=fm['title'],decision='HOLD_UNCHANGED_NOT_APPROVED_BY_THIS_REVIEW',raw_sha256=sha(b),git_blob_sha1=blob(b),root_title=units[uid]['title'],reason='Outside approved eight;306repeatlocal4 and307abbreviatedglobal2748-49 need separate finite representation review, not a numeric hold transfer.'))
report=dict(schema='independent-original-derived325-source-review-v1',observed_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),review_scope='All eight raw poems, complete original notes and separate310summary; stdlibonly/no productionparser or oldreplay imports',candidate=CAND,baseline=BASE,publisher_commit=PUB,vri_commit=VRI,agents_file_sha256=sha((P/'AGENTS.md').read_bytes()),primary_fresh_GitHub_bindings=dict(publisher_root_tree='dee02e7343e559abfed5b1fb1099fb64607cbff4',vri_root_tree='5b7f3fafaff186cfa75917fecf8377e15ff6fd6a',vri_romn_tree='6d7aa447eac664284da25f4ce809ee5f1f7b42d9',vri_root_blob=blob(rootbytes),vri_commentary_blob=blob(commentbytes),origin='Authorized GitHub connector GET commit and tree responses26Nov; pinnedGitobjects and localbytes independently checked'),artifacts=artifacts,rights=dict(decision='GO_NONCOMMERCIAL_TEXT_WITH_ATTRIBUTION_SHAREALIKE_NOTICES_AND_IDENTIFIED_EXTRACTION',specific_license='CC BY-NC-SA 4.0',attribution='Jonathan S. Walters and Whitman College',generic_site_metadata_license='CC-BY-4.0',generic_does_not_relax_translation_specific_terms=True,bodies_notes_and_apparatus_covered_by_translation_grant=True,no_media_audio_or_commercial_approval=True,live_only_English_and_metadata_only_bundles_required=True,no_endorsement_or_warranty_claim=True),xml=dict(raw_sha256=sha(rootbytes),physical_elements=len(physical),canonical_tuples=len(blocks),all_book_tuples_exact=True,omitted_existing_note_only=omitted,no_canonical_wording_or_boundary_change=True),per_source=rows,holds=holds,coverage=dict(previous317objects_deep_exact=True,first_indexed_whole_publisher_poem_choices_delta=8,first_indexed_anyEnglish_delta=8,before317=317,after325=325,body_paragraphs=58,physical_stanza_entries=34,printed_labels=36,poem_notes=31,separate_summary_notes=1,whole_chapter31=False,line_complete_VRI=False),limits=['Source/normalization/rights-scope approval only; not runtimeintegration,test,CI,release,physicaldevice,humanAT,liveprovider or specialist translationaccuracy approval','PublisherPTS/BJTS recension is independentofVRI; abbreviatedVRIformulas are not reconstructed','Uncertainties and divergent wording preserved, not certified as manuscriptfacts','Held306/307 and all other held material remain inactive','No projecttest/build/Gitmutation/outreach; evidence output only in ownreviewdirectory'])
(O/'REPLAY_EVIDENCE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'sources':[dict(publisher=r['publisher'],id=r['id'],decision=r['decision'],paragraphs=r['paragraphs'],entries=r['physical_stanza_entries'],notes=len(r['notes'])) for r in rows],'evidence_sha256':sha((O/'REPLAY_EVIDENCE.json').read_bytes()),'script_sha256':sha(Path(__file__).read_bytes())},indent=2))
