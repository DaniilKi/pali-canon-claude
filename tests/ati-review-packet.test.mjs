import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);

test('review packets expose ambiguous evidence and rights work without approving or copying bodies', {skip:!python},()=>{
 const r=spawnSync(python,['-c',`
import sys,json,tempfile,pathlib,copy
sys.path.insert(0,'scripts/canon')
from ati_review_packet import packet
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);(root/'tipitaka/sn/sn01').mkdir(parents=True)
 raw='[MY_TITLE]={Same title} [PTS_ID]={S i 2} [EXTENT]={complete} [AUTHOR]={Synthetic} [LICENSE]={Synthetic}<div id="F_provenance">Synthetic notice</div><!-- BEGIN COPYRIGHTED TEXT CHUNK -->DO_NOT_COPY_BODY<!-- #COPYRIGHTED_TEXT_CHUNK -->'
 p=root/'tipitaka/sn/sn01/fixture.html';p.write_text(raw)
 c={'source':{'commit':'vri'},'units':[{'id':'sn1.2','title':'Same','collection':'sn','pts':{'volume':1,'page':2,'end_page':2}}, {'id':'sn1.3','title':'Same','collection':'sn','pts':{'volume':1,'page':2,'end_page':2}}]}
 ledger={'rows':[{'path':'tipitaka/sn/sn01/fixture.html'}],'followup_reviews':[{'decision':'Dtest','deferred':[{'path':'tipitaka/sn/sn01/fixture.html','reason':'Prior scope gap to recheck'}]}]};m={'ati_commit':'ati','vri_commit':'vri','links':[]};links={}
 frozen=copy.deepcopy((c,ledger,m,links));out=packet(c,links,root,ledger,m)
 assert (c,ledger,m,links)==frozen
 assert out['review_packet_only'] and not out['approvals_changed']
 row=out['rows'][0];assert not row['approved'] and len(row['possible_pts_matches'])==2
 assert row['first_english_possibilities']==2 and row['rights_notice_container_present']
 assert 'page-specific rights and complete notice' in row['review_required']
 assert row['prior_review_holds']==[{'decision':'Dtest','reason':'Prior scope gap to recheck'}]
 assert 'DO_NOT_COPY_BODY' not in json.dumps(out)
 links={'sn1.2':[{'source':'ati','path':'/tipitaka/sn/sn01/another'}]}
 assert packet(c,links,root,ledger,m)['rows'][0]['first_english_possibilities']==1
 m['links']=[{'path':'/tipitaka/sn/sn01/fixture'}]
 assert packet(c,links,root,ledger,m)['summary']['pending_pages']==0
 m['links']=[];links={'sn1.2':[{'source':'ati','path':'/tipitaka/sn/sn01/fixture'}]}
 assert packet(c,links,root,ledger,m)['summary']['pending_pages']==0
 p.write_text(raw.replace('[PTS_ID]={S i 2}','[PTS_ID]={unresolved}').replace('[EXTENT]={complete}','[EXTENT]={excerpt}').replace('F_provenance','other'))
 row=packet(c,{},root,ledger,m)['rows'][0]
 assert row['possible_pts_matches']==[] and not row['rights_notice_container_present']
 assert row['publisher_extent']=='excerpt' and not row['approved']
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});

test('review packet rejects traversal, absent sources, duplicate rows and stale checkout provenance', {skip:!python},()=>{
 const r=spawnSync(python,['-c',`
import sys,tempfile,pathlib
from unittest.mock import patch
sys.path.insert(0,'scripts/canon')
from ati_review_packet import packet,require_checkout,require_ledger_sources
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);(root/'tipitaka').mkdir();(root/'tipitaka/fixture.html').write_text('[PTS_ID]={unknown}')
 c={'source':{'commit':'vri'},'units':[]};m={'vri_commit':'vri','ati_commit':'ati','links':[]}
 for paths in [['tipitaka/../outside.html'],['tipitaka/missing.html'],['tipitaka/fixture.html','tipitaka/fixture.html']]:
  try:packet(c,{},root,{'rows':[{'path':p} for p in paths]},m)
  except (ValueError,FileNotFoundError):pass
  else:raise AssertionError(paths)
 c['source']['commit']='wrong'
 try:packet(c,{},root,{'rows':[]},m)
 except ValueError:pass
 else:raise AssertionError('stale VRI accepted')
 for responses in [['wrong',''],['ati',' M tipitaka/fixture.html'],['ati','?? tipitaka/fixture.html']]:
  with patch('ati_review_packet.subprocess.check_output',side_effect=responses):
   try:require_checkout(root,'ati')
   except ValueError:pass
   else:raise AssertionError(responses)
 with patch('ati_review_packet.subprocess.check_output',side_effect=['ati','']):require_checkout(root,'ati')
 with patch('ati_review_packet.subprocess.check_output') as probe:
  require_ledger_sources(root,{'rows':[]});probe.assert_not_called()
 ledger={'rows':[{'path':'tipitaka/fixture.html'}]}
 with patch('ati_review_packet.subprocess.check_output',return_value='tipitaka/fixture.html'+chr(0)):require_ledger_sources(root,ledger)
 with patch('ati_review_packet.subprocess.check_output',return_value=''):
  try:require_ledger_sources(root,ledger)
  except ValueError:pass
  else:raise AssertionError('untracked ledger source accepted')
`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
});

test('review screening never counts a shared owner or its reached members as whole-unit English',{skip:!python},()=>{
 const r=spawnSync(python,['-c',`
import sys,json,tempfile,pathlib
sys.path.insert(0,'scripts/canon')
from ati_review_packet import packet
with tempfile.TemporaryDirectory() as tmp:
 root=pathlib.Path(tmp);p=root/'tipitaka/sn/sn01/fixture.html';p.parent.mkdir(parents=True);p.write_text('[MY_TITLE]={Fixture} [PTS_ID]={S i 2} [EXTENT]={complete}')
 c={'source':{'commit':'vri'},'units':[{'id':'sn1.2','title':'One','collection':'sn','pts':{'volume':1,'page':2,'end_page':2}},{'id':'sn1.3','title':'Two','collection':'sn','pts':{'volume':1,'page':2,'end_page':2}}]}
 links={'sn1.2':[{'source':'ati','path':'/tipitaka/sn/other','reference':'Shared fixture','shared_scope':{'text_ids':['sn1.2','sn1.3']}}]}
 row=packet(c,links,root,{'rows':[{'path':'tipitaka/sn/sn01/fixture.html'}]},{'ati_commit':'ati','vri_commit':'vri','links':[]})['rows'][0]
 assert row['first_english_possibilities']==2
 assert all(not u['has_english'] and u['has_shared_english'] and u['shared_page_references']==['Shared fixture'] for u in row['possible_pts_matches'])
print('passed')`],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/passed/);
});
