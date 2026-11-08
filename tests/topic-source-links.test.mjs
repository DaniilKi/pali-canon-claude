import{test}from'node:test';import assert from'node:assert/strict';import{readFileSync,mkdtempSync,writeFileSync,rmSync}from'node:fs';import{tmpdir}from'node:os';import{join}from'node:path';import{spawnSync}from'node:child_process';import{heldTopicReference,reconcileTopicReferences}from'../scripts/topic-source-links.mjs';import{topic}from'../src/topics.mjs';import*as canon from'../src/canon.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
const url='https://www.accesstoinsight.org/tipitaka/an/an06/an06.054.olen.html';
test('held topic source aliases become external-only links without demoting other versions or modifying input',()=>{const index={topics:[{slug:'fixture',texts:[{id:'an6.54',ati_reference:'AN 6.54',ati_url:url+'?view=1#tail'},{id:'an6.54',ati_reference:'Synthetic alternative only',ati_url:'https://www.accesstoinsight.org/tipitaka/an/an06/unregistered-fixture.html'},{id:'mn1',ati_reference:'MN 1',ati_url:'https://www.accesstoinsight.org/tipitaka/mn/mn.001.than.html'}]}]},before=structuredClone(index);const r=reconcileTopicReferences(index);assert.deepEqual(index,before);assert.equal(r.removed.length,1);assert.deepEqual(r.index.topics[0].texts,index.topics[0].texts.slice(1));assert.deepEqual(r.index.topics[0].further_reading,[{title:'AN 6.54',url,scope:'withheld-publisher-page'}]);assert.deepEqual(reconcileTopicReferences(r.index).index,r.index);assert.equal(heldTopicReference('https://evil.example/tipitaka/an/an06/an06.054.olen.html','x'),null);});
test('current khanti keeps the publisher link without a canonical card, translation selection or misleading commentary label',()=>{const t=topic(canon,'khanti');assert.ok(!t.texts.some(t=>t.id==='an6.54'));const x=t.further_reading.find(r=>r.url===url);assert.equal(x.scope,'withheld-publisher-page');assert.match(x.kind,/automatic canonical mapping withheld/);assert.ok(!/commentary/.test(x.kind));assert.equal(x.read_with,undefined);assert.ok(!canon.describe(canon.resolve('an6.54').unit).english.length);});
test('offline topic builder classifies reviewed aliases before SN/AN resolution and writes only the explicit output',()=>{const tmp=mkdtempSync(join(tmpdir(),'pali-topic-hold-')),before=readFileSync('server/data/topics.json','utf8');try{writeFileSync(join(tmp,'index-subject.html'),'<!-- COPYRIGHTED TEXT CHUNK --><dt><a id="fixture"></a>Synthetic fixture</dt><dd><a href="tipitaka/an/an06/an06.054.olen.html?x=1#excerpt">AN 6.54</a><a href="tipitaka/mn/mn.001.than.html">MN 1</a></dd>');writeFileSync(join(tmp,'index-number.html'),'');const out=join(tmp,'out.json'),r=spawnSync(process.execPath,['scripts/build_topics.mjs','--from',tmp,'--output',out],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);const data=JSON.parse(readFileSync(out,'utf8'));assert.equal(data.topics.length,1);assert.deepEqual(data.topics[0].texts.map(t=>t.id),['mn1']);assert.deepEqual(data.topics[0].further_reading,[{title:'AN 6.54',url,scope:'withheld-publisher-page'}]);assert.equal(readFileSync('server/data/topics.json','utf8'),before);}finally{rmSync(tmp,{recursive:true,force:true});}});

test('every D213 held source becomes external-only without changing other collections or inventing translation availability', () => {
 const rows=JSON.parse(readFileSync('docs/data/final-excerpt-binding-review.json','utf8')).rows;
 assert.equal(rows.length,14);
 for(const row of rows){
  const alias=row.url.replace('https://www.','https://')+'?view=1#tail';
  assert.deepEqual(heldTopicReference(alias,row.owner),{title:row.owner,url:row.url,scope:'withheld-publisher-page'});
  const input={topics:[{slug:'fixture',texts:[{id:row.owner,ati_reference:row.owner,ati_url:alias}]}]};
  const before=structuredClone(input),r=reconcileTopicReferences(input);
  assert.deepEqual(input,before);assert.equal(r.removed.length,1);assert.deepEqual(r.index.topics[0].texts,[]);
  assert.deepEqual(r.index.topics[0].further_reading,[{title:row.owner,url:row.url,scope:'withheld-publisher-page'}]);
  assert.deepEqual(reconcileTopicReferences(r.index).index,r.index);
  assert.equal(heldTopicReference(row.url.replace(new URL(row.url).hostname,'evil.example'),row.owner),null);
 }
 // This bounded integration does not rewrite the older DN/Iti/Snp by-number policy.
 for(const [url,id] of [['https://www.accesstoinsight.org/tipitaka/dn/dn.21.2x.than.html','dn21'],['https://www.accesstoinsight.org/tipitaka/kn/iti/iti.3.050-099.than.html','iti50'],['https://www.accesstoinsight.org/tipitaka/kn/snp/snp.2.14.irel.html','snp2.14']])assert.equal(heldTopicReference(url,id),null);
});

test('D213 corrects exactly ten topic references, preserves all other topic records and exposes no read command for held publisher pages', () => {
 const data=JSON.parse(readFileSync('server/data/topics.json','utf8'));
 const affected=['adinava','bojjhanga','happiness','khanti','metta','nivarana','speech','teaching','viriya','n5-speech-aspects-of-suitable'];
 assert.equal(data.topics.length,472);
 assert.equal(scopeHash({...data,topics:data.topics.filter(t=>!affected.includes(t.slug))}),'1717bff2f3bbe8e253e4bba3745d6b7baf1c1ec38face5c54541eb90538ff225');
 const rows=JSON.parse(readFileSync('docs/data/final-excerpt-binding-review.json','utf8')).rows;
 const held=new Map(rows.map(r=>[r.url,r]));let changed=0;
 const beforeFetch=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('Topic browsing is offline');};
 try{for(const entry of data.topics){
  assert.ok(entry.texts.every(t=>!held.has(t.ati_url)),entry.slug);
  for(const external of (entry.further_reading||[]).filter(r=>held.has(r.url))){
   changed++;assert.ok(affected.includes(entry.slug));assert.equal(external.scope,'withheld-publisher-page');
   const rendered=topic(canon,entry.slug).further_reading.find(r=>r.url===external.url);
   assert.match(rendered.kind,/automatic canonical mapping withheld/);assert.ok(!/commentary/.test(rendered.kind));
   assert.equal(rendered.id,undefined);assert.equal(rendered.read_with,undefined);assert.equal(rendered.translation_id,undefined);
  }
 }}finally{globalThis.fetch=beforeFetch;}
 assert.equal(changed,10);assert.equal(calls,0);
 assert.deepEqual(reconcileTopicReferences(data).index,data);
});

test('offline builder handles D213 MN holds before safe-by-number mapping and preserves the exact publisher URL', () => {
 const tmp=mkdtempSync(join(tmpdir(),'pali-topic-mn-hold-'));
 try{
  writeFileSync(join(tmp,'index-subject.html'),'<!-- COPYRIGHTED TEXT CHUNK --><dt><a id="fixture"></a>Synthetic fixture</dt><dd><a href="tipitaka/mn/mn.054x.than.html">MN 54</a><a href="tipitaka/sn/sn46/sn46.053.wlsh.html">SN 46.53</a><a href="tipitaka/mn/mn.001.than.html">MN 1</a></dd>');
  writeFileSync(join(tmp,'index-number.html'),'');const out=join(tmp,'out.json');
  const r=spawnSync(process.execPath,['scripts/build_topics.mjs','--from',tmp,'--output',out],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);const t=JSON.parse(readFileSync(out,'utf8')).topics[0];
  assert.deepEqual(t.texts.map(x=>x.id),['mn1']);
  assert.deepEqual(t.further_reading,[{title:'MN 54',url:'https://www.accesstoinsight.org/tipitaka/mn/mn.054x.than.html',scope:'withheld-publisher-page'},{title:'SN 46.53',url:'https://www.accesstoinsight.org/tipitaka/sn/sn46/sn46.053.wlsh.html',scope:'withheld-publisher-page'}]);
 }finally{rmSync(tmp,{recursive:true,force:true});}
});

test('builder preserves a held-source-only subject and numbered topic rather than dropping their external reading', () => {
 const tmp=mkdtempSync(join(tmpdir(),'pali-topic-external-only-'));
 try{
  const link='<dd><a href="tipitaka/sn/sn46/sn46.053.wlsh.html">SN 46.53</a></dd>';
  writeFileSync(join(tmp,'index-subject.html'),'<!-- COPYRIGHTED TEXT CHUNK --><dt><a id="bojjhanga"></a>Awakening factors</dt>'+link);
  writeFileSync(join(tmp,'index-number.html'),"<!-- COPYRIGHTED TEXT CHUNK --><h1 id='num-7'>Seven</h1><dt>Factors</dt>"+link);
  const out=join(tmp,'out.json'),r=spawnSync(process.execPath,['scripts/build_topics.mjs','--from',tmp,'--output',out],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);const data=JSON.parse(readFileSync(out,'utf8'));
  assert.deepEqual(data.topics.map(t=>t.slug),['bojjhanga','n7-factors']);
  for(const t of data.topics){assert.deepEqual(t.texts,[]);assert.equal(t.further_reading.length,1);assert.equal(t.further_reading[0].scope,'withheld-publisher-page');}
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
