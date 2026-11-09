// Installed synthetic contracts plus real reviewed metadata; no live author requests.
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { syntheticLink, syntheticHtml, syntheticText } from '../tests/helpers/partial-translation.mjs';
import {atiPartial,html as atiHtml,verse as atiVerse,editorial as atiEditorial} from '../tests/helpers/ati-partial.mjs';
import { translationCoverage } from '../src/providers.mjs';
import * as canon from '../src/canon.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
function option(name) { const i = process.argv.indexOf(name); if (i < 0) return; assert.ok(process.argv[i + 1]); return resolve(process.argv[i + 1]); }
const serverDir = option('--server-dir') || resolve('server'), reportPath = option('--report');
let stage, child, client, timer;
const reports = []; let previous;
const baseline = translationCoverage().total;
async function close() {
  if (client) await client.close(); client = null;
  if (child && child.exitCode === null && child.signalCode === null) { const ended = new Promise(r => child.once('exit', r)); child.kill(); await ended; }
  child = null; clearTimeout(timer);
}
try {
  stage = await mkdtemp(join(tmpdir(), 'pali-partial-fixture-'));
  await cp(serverDir, join(stage, 'server'), { recursive: true }); await mkdir(join(stage, 'empty'));
  const original = JSON.parse(await readFile(join(stage, 'server/data/translations.json'), 'utf8'));
  const preload = join(stage, 'synthetic-provider.cjs');
  for (const mode of ['stdio', 'http', 'mixed_versions', 'changed_mapping', 'changed_source', 'ati', 'registered_metadata', 'registered_downgrade']) {
    const registered=mode.startsWith('registered_');
    const registry=JSON.parse(await readFile(join(stage,'server/data/reviewed-partial-pages.json'),'utf8'));
    const link = mode === 'ati' ? atiPartial() : mode === 'changed_mapping' ? syntheticLink('patthana1.1', 5, 9) : syntheticLink();
    const expectedText=mode==='ati'?atiVerse:syntheticText;
    const full = { ...link, url: link.url.replace('PARTIAL', 'FULL') }; delete full.partial_scope;
    const translations=registered?structuredClone(original):{...original,'patthana1.1':mode==='mixed_versions'?[link,full]:[link]};
    if(mode==='registered_downgrade'){const row=registry.links[0];delete translations[row.unit_id].find(l=>l.path===row.path).partial_scope;}
    await writeFile(join(stage,'server/data/translations.json'),JSON.stringify(translations));
    const html = mode === 'ati'||registered ? atiHtml : mode === 'changed_source' ? syntheticHtml.replace('amber', 'changed') : syntheticHtml;
    const allowed=registered?registry.links.map(r=>'https://accesstoinsight.org'+r.path+'.html'):[link.url,full.url];
    await writeFile(preload, `globalThis.fetch=async input=>{const url=String(input);if(!${JSON.stringify(allowed)}.includes(url)){console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')}return new Response(${JSON.stringify(html)},{status:200,headers:{'content-type':'text/html'}})};`);
    const env = { ...process.env, PALI_CANON_CACHE_MB: '0', HOST: '127.0.0.1', PORT: '0', RATE_LIMIT_PER_MINUTE: '0' };
    let stderr = ''; client = new Client({ name: 'installed-partial-fixture', version: '1' });
    if (mode === 'stdio') {
      const transport = new StdioClientTransport({ command: process.execPath, args: ['--require', preload, join(stage, 'server/index.cjs')], cwd: join(stage, 'empty'), env, stderr: 'pipe' });
      transport.stderr?.on('data', b => { stderr += b; }); await client.connect(transport);
    } else {
      child = spawn(process.execPath, ['--require', preload, join(stage, 'server/http.cjs')], { cwd: join(stage, 'empty'), env, stdio: ['ignore', 'ignore', 'pipe'] });
      const url = await new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(Error('Fixture HTTP readiness timed out')), 30000);
        child.once('error', reject); child.once('exit', code => reject(Error(`Fixture server exited ${code}`)));
        child.stderr.on('data', b => { stderr += b; const m = stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/); if (m) { clearTimeout(timer); resolve(m[1]); } });
      });
      await client.connect(new StreamableHTTPClientTransport(new URL(url)));
    }
    let requests = 0;
    const call = async (name, args, error) => {
      requests++; const r = await client.callTool({ name, arguments: args });
      if (error) { assert.equal(r.isError, true); assert.match(r.content[0].text, error); return; }
      assert.ok(!r.isError, JSON.stringify(r.content)); assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent); return r.structuredContent;
    };
    const id = mode==='ati'?'ati:'+link.path:'dt:SYNTHETIC/PARTIAL', uid = 'patthana1.1';
    if(mode==='ati'&&previous){await call('get_translation',previous,/not linked|not available/);previous=null;}
    if(mode==='registered_downgrade'){
      const row=registry.links[0],rid='ati:'+row.path;
      await call('get_metadata',{uid:row.unit_id},/Registered partial/);
      await call('get_translation',{uid:row.unit_id,translation:rid,allow_partial:true},/Registered partial/);
      await call('resolve_reference',{reference:'https://accesstoinsight.org'+row.path+'.html'},/Registered partial/);
      await call('list_sources',{},/Registered partial/);
    }else if(mode==='registered_metadata'){
      for(const row of registry.links){const rid='ati:'+row.path,meta=await call('get_metadata',{uid:row.unit_id}),choice=meta.english.find(l=>l.translation_id===rid);assert.equal(choice.translation_scope.kind,'partial_unit');assert.equal(choice.translation_scope.notice_sha256,row.partial_scope.notice_sha256);assert.equal(choice.translation_scope.extractor,row.partial_scope.extractor);assert.equal(meta.english_available,original[row.unit_id].filter(l=>!l.partial_scope&&!l.shared_scope).length);
        await call('get_translation',{uid:row.unit_id,translation:rid},/partial unit/);
        const attached=await call('get_text',{uid:row.unit_id,translation:rid,limit:1});assert.match(attached.english_error,/partial unit/);assert.equal(attached.english,undefined);
        await call('verify_quote',{text:'Synthetic fixture only amber lantern copper window',language:'english',texts:[row.unit_id],translation_ids:[rid]},/include_partial/);
        await call('get_translation',{uid:row.unit_id,translation:rid,allow_partial:true},row.partial_scope.extractor!=='ati-freeverse-v1'?/extraction structure changed/:/source text changed/);
      }
      const totals=(await call('list_sources',{})).translation_coverage.total;assert.equal(totals.partial_links,registry.links.length);assert.equal(totals.partial_only,baseline.partial_only);assert.equal(totals.links,baseline.links);
    }else if (mode === 'mixed_versions') {
      const selected = await call('get_translation', { uid }); assert.equal(selected.translation_id, 'dt:SYNTHETIC/FULL');
      const named = await call('get_translation', { uid, translation: 'Synthetic fixture translator' }); assert.equal(named.translation_id, selected.translation_id);
      const totals = (await call('list_sources', {})).translation_coverage.total;
      assert.equal(totals.with_english, baseline.with_english + 1); assert.equal(totals.partial_links, baseline.partial_links + 1);
      assert.equal(totals.partial_only, baseline.partial_only);
      const quote = { text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [uid] };
      const normal = await call('verify_quote', quote); assert.equal(normal.scope.partial_translations_excluded.length, 1);
      assert.ok(normal.scope.translations_checked.every(t => !t.translation_scope));
      const inclusive = await call('verify_quote', { ...quote, include_partial: true });
      assert.equal(inclusive.scope.translations_checked.length, 2);
      assert.equal(inclusive.scope.translations_checked.filter(t => t.translation_scope?.kind === 'partial_unit').length, 1);
    } else if (mode === 'changed_mapping') {
      await call('get_translation', previous, /mapping changed/);
    } else if (mode === 'changed_source') {
      await call('get_translation', { uid, translation: id, allow_partial: true }, /source text changed/);
    } else {
      const meta = await call('get_metadata', { uid });
      const resolved = await call('resolve_reference', { reference: link.url });
      assert.equal(resolved.id, uid); assert.match(resolved.notes.join(' '), /partial translation source/);
      assert.equal(meta.english_available, 0); assert.equal(meta.partial_english_available, 1);
      assert.equal(meta.english[0].translation_scope.whole_unit_coverage, false);
      const coverage = (await call('list_sources', {})).translation_coverage;
      for (const key of ['links', 'with_english', 'with_english_including_inherited', 'percent_with_english']) assert.equal(coverage.total[key], baseline[key]);
      assert.equal(coverage.total.partial_links, baseline.partial_links + 1);
      const row = coverage.collections.find(c => c.collection === 'patthana');
      assert.equal(row.with_english, 0); assert.equal(row.partial_only, 1);
      const attached = await call('get_text', { uid, translation: id, limit: 1 }); assert.match(attached.english_error, /partial unit/);
      await call('get_translation', { uid }, /Only partial/);
      await call('get_translation', { uid, translation: id }, /partial unit/);
      const first = await call('get_translation', { uid, translation: id, allow_partial: true, limit: 500 });
      assert.equal(first.text, expectedText.slice(0, 500)); assert.equal(first.whole_unit_coverage, false);
      assert.deepEqual(first.translation_scope.read_with, { tool: 'get_text', uid, offset: 5, limit: 4 });
      const next = await call('get_translation', first.continue_with.arguments);
      assert.equal(next.text, expectedText.slice(500, 1000)); assert.deepEqual(next.translation_scope, first.translation_scope);
      await call('get_translation', { ...first.continue_with.arguments, scope_sha256: '0'.repeat(64) }, /mapping changed/);
      await call('get_translation', { ...first.continue_with.arguments, allow_partial: false }, /partial unit/);
      if (previous) { const resumed = await call('get_translation', previous); assert.equal(resumed.text, next.text); assert.deepEqual(resumed.translation_scope, next.translation_scope); }
      previous = first.continue_with.arguments;
      const args = { text: 'Synthetic fixture only amber lantern copper window', language: 'english', texts: [uid] };
      await call('verify_quote', args, /Only partial/);
      const verified = await call('verify_quote', { ...args, include_partial: true });
      assert.equal(verified.verdict, 'found'); assert.equal(verified.matches[0].whole_unit_coverage, false);
      assert.equal(verified.matches[0].translation_scope.first_ref, 'patthana1.1/6');
      if(mode==='ati'){const omitted=await call('verify_quote',{...args,text:atiEditorial,include_partial:true});assert.equal(omitted.verdict,'not_found_in_scope');}
      const negative = await call('verify_quote', { ...args, text: 'Purple zeppelin reaches distant synthetic harbor', include_partial: true });
      assert.equal(negative.verdict, 'not_found_in_scope'); assert.match(negative.explanation, /Partial translation.*negative result/);
    }
    assert.doesNotMatch(stderr, /UNEXPECTED_NETWORK_ATTEMPT/);
    reports.push({ mode, requests, status: 'passed', synthetic_provider_only:true,real_declaration_metadata:registered,real_network_attempts:0 });
    await close();
  }
  // A separate continuation state proves sole-body version2 across native/HTTP
  // restarts without reusing the older Patthana version1 fixture above.
  const soleUid='sn36.15',solePath='/tipitaka/sn/sn36/synthetic-sole-body-prefix';
  const soleUrl='https://accesstoinsight.org'+solePath+'.html',soleId='ati:'+solePath;
  const soleParagraphs=[
    'Selected synthetic prefix amber lantern copper window. '.repeat(12).trim(),
    'Selected synthetic second paragraph silver compass maple garden. '.repeat(8).trim(),
    'Selected synthetic third paragraph cedar bridge quiet meadow. '.repeat(8).trim(),
    'Selected synthetic fourth paragraph olive basket distant orchard. '.repeat(8).trim(),
  ];
  const soleText=soleParagraphs.join('\n\n');
  const omittedParagraph='Excluded synthetic sequel violet zeppelin quartz telescope lunar harbor.';
  const omittedNote='Excluded synthetic editorial note about an imaginary glass observatory.';
  const soleLicense='Synthetic fixture author. Complete synthetic free-test-use notice: preserve attribution and this entire invented notice. This is not publisher rights evidence.';
  const soleCitation='Synthetic sole-body prefix fixture, for installed contract testing only.';
  const soleHtml=`<html><head><title>Synthetic sole-body fixture only</title></head><body><div id="COPYRIGHTED_TEXT_CHUNK"><!-- BEGIN COPYRIGHTED TEXT CHUNK --><div class="chapter">${[...soleParagraphs,omittedParagraph].map(t=>`<p>${t}</p>`).join('')}<div class="notes"><h1>Notes</h1><dl><dt>1</dt><dd>${omittedNote}</dd></dl></div></div></div><!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">${soleLicense}</div><div id="F_citation">${soleCitation}</div></body></html>`;
  const context=canon.segments(canon.resolve(soleUid).unit).find(s=>s.ref===soleUid+'/2');
  const fullSegment={ref:context.ref,type:context.type,text:context.text};
  const registeredSole=original[soleUid].find(l=>l.partial_scope);
  assert.equal(original[soleUid].length,1);assert.equal(registeredSole.partial_scope.version,2);
  assert.deepEqual([registeredSole.partial_scope.subparagraph.start_char,registeredSole.partial_scope.subparagraph.end_char],[0,794]);
  assert.equal(scopeHash(fullSegment),registeredSole.partial_scope.subparagraph.segment_sha256);
  const soleLink={source:'ati',path:solePath,url:soleUrl,english:'Synthetic sole-body prefix only',translator:'Synthetic fixture translator',
    license:'Synthetic free test fixture only',reference:'Synthetic sole-body fixture only',match:'synthetic-test-only',
    partial_scope:{...structuredClone(registeredSole.partial_scope),pali_sha256:scopeHash([{...fullSegment,text:context.text.slice(0,794)}]),text_sha256:scopeHash(soleText),notice_sha256:scopeHash({licensing:soleLicense,citation:soleCitation})}};
  assert.equal(soleLink.partial_scope.extractor,'ati-chapter-p1to4-of5-notes-v1');
  assert.notEqual(solePath,registeredSole.path);
  const registryBefore=await readFile(join(stage,'server/data/reviewed-partial-pages.json'),'utf8');
  let solePrevious;
  for(const mode of ['sole_body_v2_stdio','sole_body_v2_http','sole_body_v2_http_restart']) {
    await writeFile(join(stage,'server/data/translations.json'),JSON.stringify({...original,[soleUid]:[soleLink]}));
    assert.equal(await readFile(join(stage,'server/data/reviewed-partial-pages.json'),'utf8'),registryBefore);
    const ledger=join(stage,mode+'-fetches.jsonl');await writeFile(ledger,'');
    await writeFile(preload,`const fs=require('node:fs');globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url||String(input);if(url!==${JSON.stringify(soleUrl)}){console.error('UNEXPECTED_NETWORK_ATTEMPT');throw Error('UNEXPECTED_NETWORK_ATTEMPT')}fs.appendFileSync(${JSON.stringify(ledger)},JSON.stringify({kind:'synthetic-fixture',url})+'\\n');return new Response(${JSON.stringify(soleHtml)},{status:200,headers:{'content-type':'text/html'}})};`);
    const fetches=async()=>{const events=(await readFile(ledger,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);assert.ok(events.every(e=>e.kind==='synthetic-fixture'&&e.url===soleUrl));return events.length;};
    // Enable caching here: an independently retrieved whole ATI article must
    // never stand in for the finite partial extractor's separate cache entry.
    const env={...process.env,PALI_CANON_CACHE_MB:'64',HOST:'127.0.0.1',PORT:'0',RATE_LIMIT_PER_MINUTE:'0'};
    let stderr='';client=new Client({name:'installed-sole-body-fixture',version:'1'});
    if(mode==='sole_body_v2_stdio') {
      const transport=new StdioClientTransport({command:process.execPath,args:['--require',preload,join(stage,'server/index.cjs')],cwd:join(stage,'empty'),env,stderr:'pipe'});
      transport.stderr?.on('data',b=>{stderr+=b;});await client.connect(transport);
    } else {
      child=spawn(process.execPath,['--require',preload,join(stage,'server/http.cjs')],{cwd:join(stage,'empty'),env,stdio:['ignore','ignore','pipe']});
      const url=await new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Sole-body fixture HTTP readiness timed out')),30000);child.once('error',reject);child.once('exit',code=>reject(Error(`Sole-body fixture server exited ${code}`)));child.stderr.on('data',b=>{stderr+=b;const m=stderr.match(/listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
      await client.connect(new StreamableHTTPClientTransport(new URL(url)));
    }
    let requests=0;
    const call=async(name,args,error)=>{requests++;const r=await client.callTool({name,arguments:args});if(error){assert.equal(r.isError,true);assert.match(r.content[0].text,error);return;}assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
    const metadata=await call('get_metadata',{uid:soleUid});
    assert.equal(metadata.english_available,0);assert.equal(metadata.partial_english_available,1);assert.equal(metadata.english[0].translation_id,soleId);
    const scope=metadata.english[0].translation_scope;
    assert.equal(scope.version,2);assert.equal(scope.whole_unit_coverage,false);assert.equal(scope.first_ref,soleUid+'/2');assert.equal(scope.last_ref,soleUid+'/2');
    assert.deepEqual(scope.pali_excerpt,{...fullSegment,text:context.text.slice(0,794),...soleLink.partial_scope.subparagraph});
    assert.equal(scope.read_with,undefined);assert.equal(scope.read_pages,undefined);
    const resolved=await call('resolve_reference',{reference:soleUrl});assert.equal(resolved.id,soleUid);assert.match(resolved.notes.join(' '),/partial translation source/);
    for(const args of[{uid:soleUid},{uid:soleUid,translation:soleId},{uid:soleUid,translation:'Synthetic fixture translator',allow_partial:true}])await call('get_translation',args,/partial/i);
    await call('get_translation',{uid:soleUid,translation:soleId,allow_shared:true},/shared-page scope/);
    const attached=await call('get_text',{uid:soleUid,translation:soleId,limit:1});assert.match(attached.english_error,/partial unit/);assert.equal(attached.english,undefined);
    const quote={text:'Selected synthetic prefix amber lantern copper window',language:'english',texts:[soleUid],translation_ids:[soleId]};
    await call('verify_quote',quote,/include_partial/);
    assert.equal(await fetches(),0,'implicit English and missing consent must not fetch');
    const coverage=(await call('list_sources',{})).translation_coverage.total;
    for(const key of ['links','with_english','with_english_including_inherited','percent_with_english','partial_links','partial_only'])assert.equal(coverage[key],baseline[key],key+': replacing one partial must not change coverage');
    const article=await call('get_access_to_insight_text',{path:solePath,limit:24000});
    assert.ok(article.text.includes(omittedParagraph));assert.ok(article.text.includes(omittedNote));assert.equal(await fetches(),1);
    if(solePrevious){const resumed=await call('get_translation',solePrevious);assert.equal(resumed.text,soleText.slice(500,1000));assert.deepEqual(resumed.translation_scope,scope);}
    const first=await call('get_translation',{uid:soleUid,translation:soleId,allow_partial:true,limit:500});
    assert.equal(first.text,soleText.slice(0,500));assert.equal(first.whole_unit_coverage,false);assert.deepEqual(first.translation_scope,scope);
    assert.equal(first.license,soleLicense);assert.equal(first.attribution,soleCitation);
    assert.equal(await fetches(),2,'whole article and partial extraction require distinct cache entries');
    const args=first.continue_with.arguments;assert.equal(args.uid,soleUid);assert.equal(args.translation,soleId);assert.equal(args.allow_partial,true);assert.equal(args.scope_sha256,scope.scope_sha256);
    const next=await call('get_translation',args);assert.equal(next.text,soleText.slice(500,1000));assert.deepEqual(next.translation_scope,scope);assert.equal(next.license,soleLicense);assert.equal(next.attribution,soleCitation);
    for(const pin of ['prefix_sha256','scope_sha256'])await call('get_translation',{...args,[pin]:undefined},/unchanged scope_sha256 and prefix_sha256/);
    await call('get_translation',{...args,prefix_sha256:'0'.repeat(64)},/prefix changed/);
    await call('get_translation',{...args,scope_sha256:'0'.repeat(64)},/mapping changed/);
    await call('get_translation',{...args,allow_partial:false},/partial unit/);
    const found=await call('verify_quote',{...quote,include_partial:true});assert.equal(found.verdict,'found');assert.equal(found.matches[0].whole_unit_coverage,false);assert.deepEqual(found.matches[0].translation_scope,scope);
    const excluded=await call('verify_quote',{...quote,text:omittedParagraph,include_partial:true});assert.equal(excluded.verdict,'not_found_in_scope');assert.match(excluded.explanation,/Partial translation.*negative result/);
    assert.equal(await fetches(),2,'continuation and verification must reuse only the checked partial cache');
    solePrevious=structuredClone(args);
    assert.equal(await readFile(join(stage,'server/data/reviewed-partial-pages.json'),'utf8'),registryBefore);
    assert.doesNotMatch(stderr,/UNEXPECTED_NETWORK_ATTEMPT/);
    reports.push({mode,requests,status:'passed',synthetic_provider_only:true,real_declaration_metadata:false,real_network_attempts:0,whole_article_cache_separate:true,sole_body_utf16_bounds:[0,794],resumed_previous_process:mode!=='sole_body_v2_stdio',partial_links:coverage.partial_links,partial_only:coverage.partial_only});
    await close();
  }
  const report = { status: 'passed', cases: reports, scope: 'Extracted-package synthetic providers plus real registered declarations. Explicit partial retrieval, source/mapping pins, verification, coverage and restart guards. Real declarations are checked as metadata or refused on simulated source drift; no live author request or new approval.' };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
} catch (error) {
  if (reportPath) await writeFile(reportPath, JSON.stringify({ status: 'failed', error: error.message }, null, 2) + '\n'); throw error;
} finally { await close(); if (stage) await rm(stage, { recursive: true, force: true }); }
