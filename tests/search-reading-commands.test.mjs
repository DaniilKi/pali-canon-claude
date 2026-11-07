import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import * as canon from '../src/canon.mjs';
import * as post from '../src/postcanonical.mjs';
import {createServer} from '../src/server.mjs';
import {checkSearchHit} from '../scripts/evidence/search.mjs';

const quoted = s => '"'+s.text.split(/\s+/u).slice(0,8).join(' ')+'"';
test('source-position bookkeeping preserves every rendered field by default', () => {
  for(const uid of ['dn2','dhp183','pli-tv-kd1']) {
    const u=canon.resolve(uid).unit;
    const enriched=canon.segments(u,{includeSourcePositions:true});
    assert.deepEqual(enriched.map(({source_blocks,...s})=>s),canon.segments(u));
    for(const s of enriched)assert.ok(s.source_blocks[0]>=u.start && s.source_blocks[1]<=u.end);
  }
  const b=post.load().books.find(b=>b.id==='niruttidipani');
  assert.deepEqual(post.segmentsOf(b.blocks,{includeSourcePositions:true}).map(({source_blocks,...s})=>s),post.segmentsOf(b.blocks));
});

test('canonical and post-canonical search commands read their late hit and adjacent context over MCP', async () => {
  const [a,b]=InMemoryTransport.createLinkedPair();const server=createServer();const client=new Client({name:'search-evidence-test',version:'1'});
  try{
    await Promise.all([server.connect(a),client.connect(b)]);
    const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));return JSON.parse(r.content[0].text)};
    const all=canon.segments(canon.resolve('dn2').unit);
    const query=quoted(all.filter(s=>s.type!=='heading'&&s.text.length>80).at(-1));
    const found=await call('search_texts',{query,collection:'dn2',english:'off',limit:1});
    assert.ok(found.results[0].read_with.offset>=60,'late passage is not on the default opening page');
    await checkSearchHit(call,found.results[0],all,query);
    const book=post.load().books.find(b=>b.id==='niruttidipani');
    const q=quoted(post.segmentsOf(book.blocks).filter(s=>s.type!=='heading'&&s.text.length>80).at(-1));
    const result=await call('search_post_canonical',{query:q,books:[book.id],limit:1});
    const hit=result.results[0];const source=(await post.getText(hit.citation,{limit:100000})).segments;
    await checkSearchHit(call,hit,source,q);
  }finally{await client.close();await server.close()}
});

test('search-command audit rejects a valid reading command that misses the phrase or supplies the wrong context', async () => {
  const source=[{ref:'mn1/1',text:'Earlier fixture'}, {ref:'mn1/2',text:'Matching fixture'}, {ref:'mn1/3',text:'Later fixture'}];
  const hit={id:'mn1',segment_ref:'mn1/1',read_with:{tool:'get_text',uid:'mn1',offset:0,limit:1},context_with:{tool:'get_text',uid:'mn1',offset:0,limit:3}};
  await assert.rejects(checkSearchHit(()=>{},hit,source,'"Matching fixture"'),/misses the search phrase/);
  hit.segment_ref='mn1/2';hit.read_with.offset=1;hit.context_with.offset=1;
  await assert.rejects(checkSearchHit(async()=>({text_id:'mn1',notes:[],returned:1,segments:[source[1]]}),hit,source,'"Matching fixture"'),/offset/);
});

test('repeated post-canonical paragraph numbers retain distinct exact reading offsets', async () => {
  const offsets=[];
  for(const text of ['Āmantane .','Ayunaṃ vā dīgho .']) {
    const result=await post.search('"'+text+'"',{books:['niruttidipani'],limit:1000});
    const hit=result.results.find(h=>h.match_vri_paragraph==='63' && h.citation==='niruttidipani 2');
    assert.ok(hit,text);
    const r=await post.getText(hit.read_with.citation,hit.read_with);
    assert.equal(r.segments.length,1);
    assert.equal(r.segments[0].text,text);
    assert.equal(r.segments[0].vri_paragraph,'63');
    offsets.push(hit.read_with.offset);
  }
  assert.notEqual(offsets[0],offsets[1]);
});

test('a source-book reading cannot acquire an individual text identity', async () => {
  const segment={ref:'vri-book:fixture/1',text:'Fixture book text'};
  const hit={ref:segment.ref,book_id:'fixture',read_with:{tool:'get_text',book:'fixture',offset:0,limit:1},context_with:{tool:'get_text',book:'fixture',offset:0,limit:3}};
  await assert.rejects(checkSearchHit(async()=>({returned:1,segments:[segment],selection:'source_book',canonical:true,book_id:'fixture',text_id:'mn1'}),hit,[segment],'"Fixture book text"'),/individual text identity/);
});
