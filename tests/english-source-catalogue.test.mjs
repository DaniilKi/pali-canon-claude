import {test,before,after,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import * as canon from '../src/canon.mjs';
import {isPartial,isShared,isScoped,scopeHash} from '../src/translation-scope.mjs';
import {createServer} from '../src/server.mjs';
import * as sourceBooks from '../src/source-books.mjs';

const d=canon.load(),originalFetch=globalThis.fetch;
let client,requests=0,savedTranslations;
before(async()=>{
  globalThis.fetch=async()=>{requests++;throw Error('The English source catalogue must stay offline');};
  const [ct,st]=InMemoryTransport.createLinkedPair();client=new Client({name:'english-source-catalogue-test',version:'1'});
  await Promise.all([createServer().connect(st),client.connect(ct)]);
});
afterEach(()=>{if(savedTranslations)d.translations=savedTranslations;savedTranslations=undefined;});
after(async()=>{await client.close();globalThis.fetch=originalFetch;assert.equal(requests,0);});

const primary=d.canon.units.filter(u=>!u.approximate&&u.kind!=='range').sort((a,b)=>a.book-b.book||a.start-b.start||(a.id<b.id?-1:a.id>b.id?1:0));
const expected=primary.map(unit=>{
  const {links,via}=canon.linksFor(unit);
  return {unit,via,ordinary:links.filter(l=>!isScoped(l)).length,partial:links.filter(isPartial).length,shared:links.filter(isShared).length};
});
const matches=(r,availability)=>availability==='whole'?r.ordinary>0:availability==='scoped'?r.ordinary===0&&(r.partial+r.shared)>0:availability==='none'?r.ordinary+r.partial+r.shared===0:r.ordinary+r.partial+r.shared>0;
const snapshotPages={};
function allPages(options={},limit=200){
  const items=[];let offset=0,total;
  for(;;){
    const page=canon.browse('english',{...options,offset,limit});
    total??=page.total;assert.equal(page.total,total);assert.equal(page.offset,offset);assert.equal(page.limit,limit);
    assert.equal(page.next_offset,offset+limit<total?offset+limit:null);
    items.push(...page.items);if(page.next_offset===null)break;offset=page.next_offset;
  }
  assert.equal(items.length,total);assert.equal(new Set(items.map(r=>r.id)).size,total);return items;
}
const snapshot=availability=>snapshotPages[availability]??=(allPages({availability},availability==='scoped'?7:200));
async function call(args){
  try{
    const result=await client.callTool({name:'browse_canon',arguments:args});
    const data=JSON.parse(result.content.find(c=>c.type==='text').text);
    return {error:!!result.isError,data};
  }catch(error){return {error:true,data:{error:error.message}};}
}

test('English catalogue filters before pagination in stable source order and echoes exact options',()=>{
  const page=canon.browse('english');
  assert.deepEqual([page.catalogue,page.node,page.name,page.availability,page.collection,page.offset,page.limit],[true,'english','Find English sources','linked',null,0,60]);
  assert.match(page.note,/confirmed locations/);assert.match(page.note,/containing chapter/);assert.match(page.note,/do not guarantee/);
  const collectionIds=canon.browse('canon',{limit:200}).items.map(r=>r.id);
  assert.deepEqual(page.collections.map(r=>r.id),collectionIds);assert.ok(page.collections.every(r=>typeof r.name==='string'&&r.name));
  for(const availability of ['linked','whole','scoped','none']){
    const wanted=expected.filter(r=>matches(r,availability)),got=snapshot(availability);
    assert.deepEqual(got.map(r=>r.id),wanted.map(r=>r.unit.id),availability);
    for(const item of got){
      const u=d.byId.get(item.id);assert.ok(u&&!u.approximate&&u.kind!=='range');
      assert.equal(item.collection_id,u.collection);assert.equal(item.citation,u.acronym);assert.equal(item.title,u.title||null);
      assert.deepEqual(item.read_with,{tool:'get_text',uid:u.id});
    }
    const past=canon.browse('english',{availability,offset:wanted.length+3,limit:17});
    assert.deepEqual(past.items,[]);assert.equal(past.next_offset,null);assert.equal(past.total,wanted.length);
  }
});

test('all eighteen partial owners remain discoverable and scoped-only discovery includes each actual shared-only record once',()=>{
  const linked=snapshot('linked'),scoped=snapshot('scoped'),whole=snapshot('whole');
  const linkedIds=new Set(linked.map(r=>r.id)),scopedIds=new Set(scoped.map(r=>r.id)),wholeIds=new Set(whole.map(r=>r.id));
  const partial=expected.filter(r=>r.partial),sharedOnly=expected.filter(r=>r.shared&&!r.ordinary),partialOnly=partial.filter(r=>!r.ordinary);
  assert.equal(partial.length,18);assert.equal(sharedOnly.length,52);assert.equal(partialOnly.length,12);
  for(const r of partial){assert.ok(linkedIds.has(r.unit.id));assert.equal(scopedIds.has(r.unit.id),r.ordinary===0);assert.equal(wholeIds.has(r.unit.id),r.ordinary>0);}
  for(const r of sharedOnly)assert.ok(scopedIds.has(r.unit.id));
  const union=new Set([...partialOnly,...sharedOnly].map(r=>r.unit.id));
  assert.deepEqual([...scopedIds].sort(),[...union].sort(),'Union uses actual IDs, without adding overlapping source counts');
  for(const item of scoped){assert.equal(item.english_available,0);assert.ok((item.partial_english_available||0)+(item.shared_english_available||0)>0);}
});

test('inherited chapter links stay ordinary choices with explicit containing-group context',()=>{
  const inherited=expected.find(r=>r.via&&r.ordinary>0);assert.ok(inherited,'The actual snapshot includes inherited chapter choices');
  const item=snapshot('whole').find(r=>r.id===inherited.unit.id);assert.ok(item);
  assert.deepEqual(item.source_context,{kind:'containing_group',id:inherited.via.id,citation:inherited.via.acronym,title:inherited.via.title||null});
  assert.equal(item.english_available,inherited.ordinary);assert.ok(!snapshot('scoped').some(r=>r.id===item.id));
  assert.equal(item.individual_alignment_verified,undefined);assert.equal(item.translation_scope,undefined);
});

test('exact collection filters agree with the actual global partition and permit empty results',()=>{
  const {collections}=canon.browse('english');
  for(const availability of ['linked','whole','scoped','none']){
    let sum=0;
    for(const {id} of collections){
      const wanted=expected.filter(r=>r.unit.collection===id&&matches(r,availability)),page=canon.browse('english',{collection:id,availability,offset:0,limit:13});
      assert.equal(page.collection,id);assert.equal(page.availability,availability);assert.equal(page.total,wanted.length);
      assert.deepEqual(page.items.map(r=>r.id),wanted.slice(0,13).map(r=>r.unit.id));sum+=page.total;
    }
    assert.equal(sum,canon.browse('english',{availability}).total);
  }
  const vinaya=canon.browse('english',{collection:'vinaya',availability:'linked'});assert.equal(vinaya.total,0);assert.deepEqual(vinaya.items,[]);assert.equal(vinaya.next_offset,null);
});

test('catalogue is offline and fresh, preserves snapshot data and refuses scope/source drift',()=>{
  const before={canon:scopeHash(d.canon),translations:scopeHash(d.translations),registry:scopeHash(d.partialRegistry)},first=canon.browse('english',{availability:'scoped',limit:200});
  const owner='sn36.15',link=d.translations[owner].find(isPartial);
  savedTranslations=d.translations;d.translations=structuredClone(savedTranslations);
  d.translations[owner].find(isPartial).partial_scope.notice_sha256='0'.repeat(64);
  assert.throws(()=>canon.browse('english',{availability:'scoped'}),/Registered partial|Invalid/);
  d.translations=savedTranslations;
  assert.deepEqual(canon.browse('english',{availability:'scoped',limit:200}),first,'No stale catalogue cache survives repaired metadata');
  const commit=d.canon.source.commit;
  try{d.canon.source.commit='synthetic-source-drift';assert.throws(()=>canon.browse('english',{availability:'scoped'}),/Invalid|changed|registered/i);}finally{d.canon.source.commit=commit;}
  assert.equal(link.partial_scope.notice_sha256,savedTranslations[owner].find(isPartial).partial_scope.notice_sha256);
  assert.deepEqual({canon:scopeHash(d.canon),translations:scopeHash(d.translations),registry:scopeHash(d.partialRegistry)},before);assert.equal(requests,0);
});

test('ordinary browsing and complete source books retain their existing response contracts',async()=>{
  const root=canon.browse();assert.deepEqual(Object.keys(root),['node','total','offset','limit','next_offset','items']);
  assert.equal(root.node,'canon');assert.deepEqual(root.items.slice(0,5).map(r=>r.id),['vinaya','dn','mn','sn','an']);assert.ok(!root.items.some(r=>r.id==='english'));
  assert.deepEqual(canon.browse('mn1').items.map(r=>r.id),['mn1']);assert.equal(canon.browse('mn1').catalogue,undefined);
  const ordinary=await call({node:'mn',offset:2,limit:3});assert.equal(ordinary.error,false);assert.deepEqual(ordinary.data,canon.browse('mn',{offset:2,limit:3}));
  const books=await call({node:'books',offset:2,limit:3});assert.equal(books.error,false);assert.deepEqual(books.data,sourceBooks.catalogue({offset:2,limit:3}));
});

test('MCP rejects unknown filters and scopes, including filters supplied to books or ordinary browse nodes',async()=>{
  const good=await call({node:'english',availability:'scoped',collection:'sn',offset:2,limit:5});assert.equal(good.error,false);assert.deepEqual(good.data,canon.browse('english',{availability:'scoped',collection:'sn',offset:2,limit:5}));
  const bad=[{node:'english',availability:'partial'},{node:'english',availability:'all'},{node:'english',collection:'SN'},{node:'english',collection:'sn12'},{node:'english',collection:'sn36.15'},{node:'english',collection:' sn '},{node:'english',collection:'unknown'},{node:'english',collection:''},{node:'english',collection:null},{node:'english',unknown_option:true},{node:'english',include_shared:true},{node:'English sources'},{node:'translations'},{node:'english',limit:0},{node:'english',offset:-1}];
  for(const node of ['books','canon','mn','sn12','mn1'])for(const filters of [{availability:'linked'},{collection:'mn'},{availability:'none',collection:'sn'}])bad.push({node,...filters});
  bad.push({collection:'mn'});
  for(const args of bad){const result=await call(args);assert.equal(result.error,true,JSON.stringify(args));assert.ok(result.data.error,JSON.stringify(result));}
  for(const node of ['canon','mn1','books'])assert.throws(()=>canon.browse(node,{availability:undefined}),/require.*english/);
});
