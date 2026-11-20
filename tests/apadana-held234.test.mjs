/** Original234 identity exception, independently sealed text and unchanged neighboring235. */
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT,isApadanaRawUrl} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText,digest,rootDigest,validateLink} from '../src/apadana.mjs';
import {parseTheraApadana} from '../src/apadana-thera.mjs';
import {fetchPublic} from '../src/http.mjs';
import {held234Evidence} from './helpers/thera-held234-evidence.mjs';
import {CURRENT_APADANA_IDS} from './helpers/apadana-intake-expectations.mjs';
const e=held234Evidence(),ids=['tha-ap236','tha-ap237'];
const tid=p=>canon.translationId(p),originalFetch=globalThis.fetch;
afterEach(()=>{globalThis.fetch=originalFetch;});
function transport(calls){globalThis.fetch=async url=>{const id=ids.find(id=>APADANA_PROFILES[id].raw_url===url.href);assert.ok(id,'Only exact234 and unchanged235 artifacts may be fetched');calls.push(id);return new Response(e.artifact(id));};}
function assertParsed(id,value){
  const g=e.goldenFor(id),peer=e.peerFor(id),p=APADANA_PROFILES[id];
  for(const key of ['body_sha256','notes_sha256','paratext_sha256','root_sha256'])assert.equal(p[key],peer[key]);
  assert.equal(digest(value.text),peer.body_sha256);assert.equal(digest(JSON.stringify(value.translator_notes)),peer.notes_sha256);
  assert.deepEqual(value.text.split('\n\n').map(digest),peer.body_paragraph_sha256s);
  const noteHashes=id==='tha-ap236'?peer.note_text_sha256s.map(n=>n.sha256):peer.note_text_sha256s;
  assert.deepEqual(value.translator_notes.map(n=>digest(n.text)),noteHashes);
  assert.deepEqual(value.translator_notes.map(n=>n.number),peer.note_numbers);assert.deepEqual(p.stanza_layout,peer.stanza_layout);
  assert.equal(value.publisher_paratext,'');assert.equal(digest(value.publisher_paratext),peer.paratext_sha256);
  for(const key of ['publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap'])assert.equal(Object.hasOwn(value,key),false,id+' has no invented apparatus');
  assert.equal(value.text.split('\n\n').length,g.body_paragraphs.length);
}

test('held234 curation appends only236 to exact284 objects and preserves separate historical source groups and canon',()=>{
  const data=canon.load(),manifest=JSON.parse(readFileSync('server/data/apadana.json','utf8'));
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,284),e.previous.expected_profile_ids);
  assert.deepEqual(Object.keys(APADANA_PROFILES).slice(0,285),e.approval.expected_profile_ids);
  assert.deepEqual(CURRENT_APADANA_IDS.slice(0,285),e.approval.expected_profile_ids);
  assert.deepEqual(Object.keys(APADANA_PROFILES),CURRENT_APADANA_IDS);
  assert.equal(CURRENT_APADANA_IDS.length,308);
  for(const id of e.previous.expected_profile_ids){assert.deepEqual(APADANA_PROFILES[id],e.priorProfiles[id],id+' prior profile exact');assert.deepEqual(manifest.links[id],e.priorLinks[id],id+' prior link exact');}
  assert.deepEqual(APADANA_PROFILES['tha-ap236'],e.profiles['tha-ap236']);assert.deepEqual(manifest.links['tha-ap236'],e.links['tha-ap236']);
  assert.equal(digest(JSON.stringify(data.canon)),e.approval.before_canon_sha256);assert.equal(e.approval.after_canon_sha256,e.approval.before_canon_sha256);
  assert.deepEqual(data.byId.get('tha-ap236'),e.peer.canonical_unit);assert.equal(data.byId.get('tha-ap236').index_revision,undefined);
  assert.equal(rootDigest(data.byId.get('tha-ap236'),data.canon.books[36]),e.peerGolden.root_sha256);
  assert.equal(digest(JSON.stringify(data.canon.books[36].blocks.slice(8015,8032))),e.peerGolden.raw_unit_blocks_sha256,'Raw-block and registered-root hash domains remain distinct');
  assert.equal(APADANA_PROFILES['tha-ap262'],undefined);assert.equal(e.previous.approved_ids.includes('tha-ap236'),false,'Historical D256 authority stays unchanged');
  assert.ok(e.priorProfiles['tha-ap242'].mapping_notes.includes(e.profiles['tha-ap236'].mapping_notes.at(-1))===false,'New context is separate from immutable old source notices');
  for(const row of e.rights){assert.equal(row.license,'CC BY-NC-SA 4.0');assert.equal(row.normalization_wording_changes,false);assert.equal(row.source_frontmatter_changes,false);assert.equal(row.full_English_text_and_notes_live_only,true);assert.equal(row.no_audio_or_media_approval,true);}
});

test('source-enabled real234/order235 and distinct235/order235 positives precede corruption controls',{skip:!e.checkout},()=>{
  for(const id of ids){
    const g=e.goldenFor(id),raw=e.artifact(id),p=APADANA_PROFILES[id],parsed=parseApadana(raw,p);
    assert.match(raw,/^order: 235$/m);assert.match(raw,new RegExp('^title: '+(id==='tha-ap236'?'Kilañjadāyaka':'Vediyadāyaka')+'$','m'));
    assert.equal(p.poem,id==='tha-ap236'?234:235);assert.equal(p.path,`/text/chapter-3/poem-${p.poem}/`);
    assert.equal(p.raw_url,`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/${g.path}`);
    assertParsed(id,parsed);assert.equal(parsed.translator_notes.length,id==='tha-ap236'?4:2);
    const paragraphs=parsed.text.split('\n\n'),quote=quotationText({...parsed,translation_id:tid(p)});
    const expected=p.stanza_layout.map((row,i)=>paragraphs[i+1].replace(/\[Note \d+\]/g,'').trim().slice(0,-row.suffix.length).trim()).join('\n\n');
    assert.equal(quote,expected);assert.equal(quote.split('\n\n').length,id==='tha-ap236'?5:4);
    for(const outside of [paragraphs[0],paragraphs.at(-2),paragraphs.at(-1),...parsed.translator_notes.map(n=>n.text)])assert.ok(!quote.includes(outside));
    for(const row of g.body_paragraphs){assert.equal(digest(paragraphs[row.paragraph]),row.sha256);assert.equal(paragraphs[row.paragraph].split('\n').length,row.lines);}
  }
  assert.equal(e.golden.source_identity_audit.frontmatter_order,235);assert.equal(e.golden.source_identity_audit.printed_poem_number,234);assert.equal(e.golden.source_identity_audit.order_rewritten,false);
  assert.notEqual(e.golden.raw_sha256,e.neighborGolden.raw_sha256);
  for(const packet of e.packets)for(const artifact of [...packet.rights,packet.publisher_routing]){const bytes=readFileSync(join(e.checkout,artifact.path));assert.equal(digest(bytes),artifact.raw_sha256);assert.equal(bytes.length,artifact.bytes);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),artifact.git_blob_sha1);}
  const text=parseApadana(e.artifact('tha-ap236'),APADANA_PROFILES['tha-ap236']).text;
  for(const path of ['server/data/apadana.json','src/apadana-thera-profiles.mjs','server/index.cjs','server/http.cjs','server/http-worker.cjs'])assert.ok(!readFileSync(path,'utf8').includes(text),path+' contains metadata, never the complete live English body');
});

test('source-enabled finite identity rejects corrected order, swapped235, malformed heading and forged metadata',{skip:!e.checkout},()=>{
  const p=APADANA_PROFILES['tha-ap236'],neighbor=APADANA_PROFILES['tha-ap237'],raw=e.artifact(p.id),other=e.artifact(neighbor.id);
  const changes=[other,raw+'\n',raw.replace('order: 235','order: 234'),raw.replace('order: 235','order: 236'),raw.replace('order: 235\n',''),raw.replace('order: 235','order: 235\norder: 235'),raw.replace('category: chapter-3','category: chapter-4'),raw.replace('title: Kilañjadāyaka','title: Vediyadāyaka'),raw.replace('234. Kilañjadāyaka','235. Kilañjadāyaka'),raw.replace('Mat Donor','Changed Donor')];
  for(const changed of changes){assert.notEqual(changed,raw);assert.throws(()=>parseApadana(changed,p),/differs/);assert.throws(()=>parseTheraApadana(changed,{...p,raw_sha256:digest(changed)}),/differs/);}
  assert.throws(()=>parseApadana(raw,neighbor),/differs/);assert.throws(()=>parseApadana(other,p),/differs/);
  for(const patch of [{id:neighbor.id},{poem:235},{path:neighbor.path},{raw_url:neighbor.raw_url},{root_sha256:neighbor.root_sha256},{note_numbers:[1,2]},{translation_revision:'0'.repeat(40)},{publisher_preface:{}},{chapter_summary:{}}])assert.throws(()=>parseTheraApadana(raw,{...p,...patch}),/differs/);
  const data=canon.load();assert.throws(()=>validateLink({...p,id:neighbor.id},neighbor.id,data.byId.get(neighbor.id),data.canon.books[36]),/differs/);
});

test('source-enabled both complete API streams preserve identities and warmed metadata refuses before transport',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);const data=canon.load();
  for(const id of ids){
    const p=APADANA_PROFILES[id],u=data.byId.get(id);let options={limit:500,translation_revision:APADANA_COMMIT},body='',pages=0;
    while(options){const value=await english.translation(u,tid(p),options);body+=value.text;pages++;assert.equal(value.translation_id,tid(p));assert.equal(value.fetched_url,p.raw_url);assert.equal(value.license,'CC BY-NC-SA 4.0');assert.deepEqual(value.mapping_notes,p.mapping_notes);for(const note of p.mapping_notes)assert.ok(value.notes.includes(note));assert.equal(digest(JSON.stringify(value.translator_notes)),p.notes_sha256);options=value.continue_with?.arguments;}
    assert.ok(pages>1,'Actual source500char continuation exercised');assert.equal(digest(body),e.goldenFor(id).body_sha256);
  }
  const p=APADANA_PROFILES['tha-ap236'],u=data.byId.get(p.id),link=data.translations[p.id].find(row=>canon.translationId(row)===tid(p)),original=structuredClone(link);
  for(const patch of [{poem:235},{path:APADANA_PROFILES['tha-ap237'].path},{raw_url:APADANA_PROFILES['tha-ap237'].raw_url},{raw_sha256:'0'.repeat(64)},{body_sha256:'0'.repeat(64)},{notes_sha256:'0'.repeat(64)},{paratext_sha256:'0'.repeat(64)},{root_sha256:'0'.repeat(64)},{license:'CC0'},{translation_revision:'0'.repeat(40)},{mapping_notes:[]},{note_numbers:[1,2]},{publisher_preface:{}},{chapter_summary:{}}]){
    const before=calls.length;Object.assign(link,structuredClone(patch));try{await assert.rejects(english.translation(u,tid(p),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,before,'Changed cached identity refuses before another source request');}finally{for(const key of Object.keys(link))delete link[key];Object.assign(link,structuredClone(original));}
  }
});

test('same-order artifacts never authorize cross-owner selectors or unreviewed revisions/held260',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);const data=canon.load();
  for(const [id,foreign] of [['tha-ap236','tha-ap237'],['tha-ap237','tha-ap236']]){const before=calls.length;await assert.rejects(english.translation(data.byId.get(id),tid(APADANA_PROFILES[foreign]),{translation_revision:APADANA_COMMIT}));assert.equal(calls.length,before);}
  const before=calls.length;
  for(const url of [`https://raw.githubusercontent.com/apadana-translation/apadana-site/${'0'.repeat(40)}/src/_poems/chapter-3/poem-234.md`,`https://raw.githubusercontent.com/apadana-translation/apadana-site/${APADANA_COMMIT}/src/_poems/chapter-3/poem-260.md`]){assert.equal(isApadanaRawUrl(url),false);await assert.rejects(fetchPublic(url,{json:false}),/outside the supported public sources/);}
  assert.equal(calls.length,before);
});
