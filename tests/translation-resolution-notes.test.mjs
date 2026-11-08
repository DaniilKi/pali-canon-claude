import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {liveCache} from '../src/cache.mjs';
import {scopeHash} from '../src/translation-scope.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const originalFetch=globalThis.fetch;
let originalTranslations;
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();if(originalTranslations)canon.load().translations=originalTranslations;originalTranslations=undefined;});
async function withClient(run){
  const [ct,st]=InMemoryTransport.createLinkedPair(),server=createServer();
  const client=new Client({name:'translation-resolution-notes-test',version:'1'},{capabilities:{}});
  await server.connect(st);await client.connect(ct);
  try{await run(client);}finally{await client.close();}
}
async function call(client,args){
  const r=await client.callTool({name:'get_translation',arguments:args});
  assert.ok(!r.isError,JSON.stringify(r));
  assert.deepEqual(JSON.parse(r.content.find(c=>c.type==='text').text),r.structuredContent);
  return r.structuredContent;
}
test('get_translation preserves resolver numbering notes alongside provider notes in both MCP representations',async()=>{
  let requests=0;
  globalThis.fetch=async()=>{requests++;return new Response('<body><div id="sutta">Synthetic numbering fixture only.</div></body>');};
  const resolution=canon.resolve('an3.65'),id=english.available(resolution.unit).find(l=>l.translation_id.startsWith('dt:')).translation_id;
  const provider=await english.translation(resolution.unit,id);
  assert.ok(resolution.notes.length);
  await withClient(async client=>{
    const result=await call(client,{uid:'an3.65',translation:id});
    assert.deepEqual(result.notes,[...resolution.notes,...provider.notes]);
    assert.equal(result.text,provider.text);assert.equal(result.translation_id,id);
    assert.equal(result.license,provider.license);assert.equal(result.attribution,provider.attribution);
  });
  assert.equal(requests,1,'Existing provider cache reused without refetching for resolution notes');
});
test('group-member resolution notes survive shared-page consent while canonical continuations do not inherit the old alias note',async()=>{
  const d=canon.load();originalTranslations=d.translations;d.translations=structuredClone(d.translations);
  const child='sn56.106',resolution=canon.resolve(child),group=resolution.unit.id;
  assert.equal(group,'sn56.105-107');assert.equal(resolution.notes.length,1);
  const link=d.translations['sn56.102'].find(l=>l.shared_scope?.text_ids.includes(group)),id='ati:'+link.path;
  const text='Synthetic fixture only: copper lantern in an amber courtyard. '.repeat(40).trim();
  const html=`<!-- BEGIN COPYRIGHTED TEXT CHUNK -->${text}<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) --><div id="F_provenance">Synthetic test notice, not actual publisher rights.</div><div id="F_citation">Synthetic attribution.</div>`;
  link.shared_scope.text_sha256=scopeHash(text);link.shared_scope.notice_sha256=scopeHash(english.atiNotice(html));
  let requests=0;globalThis.fetch=async()=>{requests++;return new Response(html);};
  await withClient(async client=>{
    const denied=await client.callTool({name:'get_translation',arguments:{uid:child,translation:id,limit:500}});
    assert.ok(denied.isError);assert.equal(requests,0,'No implicit shared consent');
    const provider=await english.translation(resolution.unit,id,{allow_shared:true,limit:500});
    const result=await call(client,{uid:child,translation:id,allow_shared:true,limit:500});
    assert.deepEqual(result.notes,[...resolution.notes,...provider.notes]);
    assert.equal(result.text_id,null);assert.equal(result.requested_text_id,group);
    assert.equal(result.whole_unit_coverage,false);assert.equal(result.translation_scope.kind,'shared_page');
    assert.equal(result.translation_scope.individual_alignment_verified,false);
    assert.equal(result.translation_scope.condensed,true);assert.equal(result.text,text.slice(0,500));
    assert.deepEqual(result.continue_with,provider.continue_with);
    const next=await call(client,result.continue_with.arguments);
    assert.equal(next.text,text.slice(500,1000));assert.ok(!next.notes.includes(resolution.notes[0]));
    const direct=await call(client,{uid:group,translation:id,allow_shared:true,limit:500});
    assert.deepEqual(direct.notes,provider.notes,'Cached source data is not mutated by an alias-specific note');
    assert.equal(direct.text_id,null);assert.equal(direct.whole_unit_coverage,false);
  });
  assert.equal(requests,1,'One unchanged source fetch for alias, direct and continuation requests');
});
