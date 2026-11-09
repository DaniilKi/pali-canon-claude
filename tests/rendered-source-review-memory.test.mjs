import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import * as canon from '../src/canon.mjs';
import {scopeScreen,mappingFingerprint} from '../scripts/source-scope-screen.mjs';
import {validateRenderedReview} from '../scripts/rendered-source-reviews.mjs';

const file='scripts/canon/retained_rendered_pages.json';
const memory=JSON.parse(readFileSync(file,'utf8'));
const atiBytes=readFileSync('scripts/canon/retained_ordinary_pages.json');
const ati=JSON.parse(atiBytes);
const primary=memory.rows[0];
const fetchBefore=globalThis.fetch;
afterEach(()=>{globalThis.fetch=fetchBefore;});
function fixture() {
  const real=canon.load(),roots=[primary.root,primary.boundary_control.root];
  const blocks=Array(primary.boundary_control.root.end).fill(null);
  for(const r of roots)for(let i=r.start;i<r.end;i++)blocks[i]=structuredClone(real.canon.books[r.book].blocks[i]);
  const books=[];books[primary.root.book]={blocks};
  return {canon:{source:{commit:memory.vri_commit},books},byId:new Map(roots.map(({root_blocks_sha256,...u})=>[u.id,structuredClone(u)])),translations:{[primary.owner]:[structuredClone(primary.original_link)]},partialRegistry:{links:[]}};
}
function screen(data,renderedReview=memory) {return scopeScreen(data,{renderedReview});}
const selected=result=>result.rows.find(r=>r.translation_id==='dt:AN/AN3_47');

test('rendered DT memory preserves D203 ownership, both complete root pins and its adjacent control without new coverage',()=>{
  assert.equal(memory.rows.length,1);assert.equal(primary.owner,'an3.47');
  assert.equal(primary.link_metadata_sha256,mappingFingerprint(primary.owner,primary.original_link));
  assert.equal(primary.boundary_control.role,'adjacent-boundary-control');
  assert.equal(primary.boundary_control.root.id,'an3.48');
  assert.equal(primary.root.book,primary.boundary_control.root.book);
  assert.equal(primary.root.end,primary.boundary_control.root.start);
  const old=JSON.parse(readFileSync('docs/data/provider-scope-audit.json','utf8')).cases.find(r=>r.owner==='an3.47');
  for(const root of [primary.root,primary.boundary_control.root]) {
    assert.equal(root.root_blocks_sha256,old.root_units.find(u=>u.id===root.id).root_blocks_sha256);
    const u=canon.resolve(root.id).unit;const{root_blocks_sha256,...identity}=root;
    assert.deepEqual(identity,u);
    assert.equal(createHash('sha256').update(JSON.stringify(canon.load().canon.books[u.book].blocks.slice(u.start,u.end))).digest('hex'),root_blocks_sha256);
  }
  assert.equal(memory.new_coverage,0);assert.equal(memory.runtime_authority,false);assert.equal(memory.current_upstream_freshness_verified,false);
  assert.equal(primary.historical_review.decision,'D203');
  assert.equal(Object.hasOwn(primary,'source_html_sha256'),false);
  assert.equal(Object.hasOwn(primary,'text_sha256'),false);
  assert.equal(Object.hasOwn(primary,'notice_sha256'),false);
});

test('explicit rendered snapshots annotate only exact metadata and never fetch, mutate or expose a control subject',()=>{
  const data=fixture(),before=structuredClone(data),reviewBefore=structuredClone(memory);
  let fetches=0;globalThis.fetch=()=>{fetches++;throw Error('Offline metadata only');};
  assert.equal(selected(scopeScreen(data)).review_status,'unreviewed');
  const result=screen(data),r=selected(result);
  assert.equal(r.review_status,'reviewed-retained-at-snapshot');assert.equal(result.reviewed_retained_snapshots,1);
  assert.equal(r.review_evidence_kind,'publisher-rendered-web');
  assert.deepEqual(r.review_rendered_view.scripture_lines,[27,41]);
  assert.equal(r.review_source_commit,undefined);assert.match(r.review_note,/no raw source pins/);
  assert.ok(!result.rows.some(x=>x.owner==='an3.48'));
  assert.equal(fetches,0);assert.deepEqual(data,before);assert.deepEqual(memory,reviewBefore);
  r.review_rendered_view.scripture_lines[0]=0;
  assert.deepEqual(memory,reviewBefore,'emitted view metadata must not alias review input');
});

test('owner, both root identities/wording, adjacency, VRI and translator/link drift expire rendered annotations',()=>{
  const changes=[
    d=>{d.canon.source.commit='0'.repeat(40);},
    d=>{d.translations['an3.47'][0].translator='Synthetic different translator';},
    d=>{d.translations['an3.47'][0].reference='AN3:47–48 Synthetic changed reference';},
    d=>{d.translations['an3.47'][0].url='https://www.dhammatalks.org/suttas/AN/AN3_49.html';},
    d=>{d.translations['an3.48']=d.translations['an3.47'];delete d.translations['an3.47'];},
    d=>{d.byId.get('an3.47').title='Synthetic owner identity drift';},
    d=>{d.byId.get('an3.47').pts.end_page++;},
    d=>{d.byId.get('an3.47').approximate=true;},
    d=>{d.canon.books[18].blocks[primary.root.start]=['Synthetic owner block drift'];},
    d=>{d.byId.get('an3.48').title='Synthetic control identity drift';},
    d=>{d.byId.get('an3.48').start++;},
    d=>{d.canon.books[18].blocks[primary.boundary_control.root.start]=['Synthetic control block drift'];},
  ];
  for(const change of changes){const data=fixture();change(data);const r=screen(data).rows[0];assert.equal(r.review_status,'stale-reviewed-snapshot');assert.notEqual(r.triage,'reviewed retained snapshot');assert.equal(r.review_rendered_view,undefined);}
});

test('unsupported/plain receipts, incomplete bounds, mismatched URLs and fabricated raw pins cannot approve a rendered source',()=>{
  const bad=[
    m=>{m.version=2;},m=>{m.evidence_kind='raw-html';},m=>{m.runtime_authority=true;},
    m=>{m.current_upstream_freshness_verified=true;},m=>{m.new_coverage=1;},
    m=>{m.reviewed_on='2026-02-30';},m=>{m.rows[0].owner='an3.48';},
    m=>{m.rows[0].source='ati';},m=>{m.rows[0].url='https://evil.example/suttas/AN/AN3_47.html';},
    m=>{m.rows[0].original_link.translator='Synthetic unpinned translator';},
    m=>{m.rows[0].rendered_view.evidence_kind='publisher-summary';},
    m=>{m.rows[0].rendered_view.source_url='https://www.dhammatalks.org/suttas/AN/AN3_49.html';},
    m=>{m.rows[0].rendered_view.first_line=1;},m=>{m.rows[0].rendered_view.last_line--;},
    m=>{m.rows[0].rendered_view.scripture_lines=[41,27];},
    m=>{m.rows[0].rendered_view.scripture_lines=[27,46];},
    m=>{m.rows[0].rendered_view.primary_rendering_lines=[28,32];},
    m=>{m.rows[0].rendered_view.alternative_label_line=40;},
    m=>{delete m.rows[0].rendered_view.alternative_rendering_lines;},
    m=>{m.rows[0].boundary_control.role='covered-subject';},
    m=>{m.rows[0].boundary_control.root.start++;},
    ...['source_html_sha256','text_sha256','notice_sha256'].map(k=>m=>{m.rows[0][k]='0'.repeat(64);}),
  ];
  for(const change of bad){const m=structuredClone(memory);change(m);assert.throws(()=>screen(fixture(),m),/Invalid rendered review memory/);}
  for(const m of [null,{},'retain',{rows:[{owner:'an3.47',decision:'retain'}]}])assert.throws(()=>validateRenderedReview(m),/Invalid rendered review memory/);
  assert.deepEqual(validateRenderedReview({rows:[]}),{rows:[]});
});

test('CLI loads separate memories while API defaults and all seven ATI rows remain unchanged',()=>{
  const bytes=readFileSync('scripts/canon/retained_ordinary_pages.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'b468c15c0a56a5bcee6ab6bf7040f8778ab8e5fde47b8844cf2d762ac7be7c31');
  assert.equal(ati.rows.length,7);assert.deepEqual(bytes,atiBytes);
  const api=scopeScreen(canon.load(),{review:ati});
  assert.deepEqual([api.count,api.reviewed_retained_snapshots,api.unreviewed_leads],[220,6,214]);
  assert.equal(selected(api).review_status,'unreviewed');
  const both=scopeScreen(canon.load(),{review:ati,renderedReview:memory});
  assert.deepEqual([both.count,both.reviewed_retained_snapshots,both.unreviewed_leads],[220,7,213]);
  assert.deepEqual(both.rows.filter(r=>r.source==='ati'),api.rows.filter(r=>r.source==='ati'));
  const cli=spawnSync(process.execPath,['scripts/source-scope-screen.mjs'],{encoding:'utf8',maxBuffer:4*1024*1024});
  assert.equal(cli.status,0,cli.stderr);assert.deepEqual(JSON.parse(cli.stdout),both);
  const tmp=mkdtempSync(join(tmpdir(),'pali-rendered-memory-'));
  try{
    const empty=join(tmp,'empty.json');writeFileSync(empty,JSON.stringify({rows:[]}));
    const explicit=spawnSync(process.execPath,['scripts/source-scope-screen.mjs','--rendered-review',empty],{encoding:'utf8',maxBuffer:4*1024*1024});
    assert.equal(explicit.status,0,explicit.stderr);assert.deepEqual(JSON.parse(explicit.stdout),api);
    const malformed=join(tmp,'malformed.json');writeFileSync(malformed,JSON.stringify({rows:[{decision:'retain'}]}));
    const refused=spawnSync(process.execPath,['scripts/source-scope-screen.mjs','--rendered-review',malformed],{encoding:'utf8',maxBuffer:4*1024*1024});
    assert.notEqual(refused.status,0);assert.match(refused.stderr,/Invalid rendered review memory/);assert.equal(refused.stdout,'');
  }finally{rmSync(tmp,{recursive:true,force:true});}
});
