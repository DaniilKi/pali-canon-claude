import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReading, parallelPages } from '../scripts/evidence/check.mjs';
import * as parallels from '../src/parallels.mjs';
import * as canon from '../src/canon.mjs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer } from '../src/server.mjs';

test('shared-passage commands open the cited segment in both directions over MCP', async () => {
  const [a,b] = InMemoryTransport.createLinkedPair();
  const server=createServer(), client=new Client({name:'shared-evidence-test',version:'1'});
  try {
    await Promise.all([server.connect(a),client.connect(b)]);
    for(const uid of ['DN 22','MN 10']) {
      const result=await client.callTool({name:'get_parallels',arguments:{uid,limit:100}});
      const link=JSON.parse(result.content[0].text).links.find(l=>l.source==='shared-passage' && ['mn10','dn22'].includes(l.text.id));
      assert.ok(link);
      for(const side of ['this','other']) {
        const ref=link[`${side}_segments`][0];
        const [id,n]=ref.split('/');
        const expected=canon.segments(canon.resolve(id).unit)[Number(n)-1];
        await checkReading(async(name,args)=>{
          const r=await client.callTool({name,arguments:args});assert.ok(!r.isError);return JSON.parse(r.content[0].text);
        },link[`${side}_read_with`],expected);
      }
    }
  } finally {await client.close();await server.close()}
});

test('the evidence audit rejects wrong source text, omitted commands and non-advancing pages', async () => {
  const expected={ref:'mn10/66',text:'Source fixture'};
  await assert.rejects(checkReading(async()=>({returned:1,segments:[{...expected,text:'Altered fixture'}]}),{tool:'get_text',uid:'mn10',offset:65,limit:1},expected),/cited source segment/);
  await assert.rejects(checkReading(async()=>({returned:0,segments:[]}),{tool:'get_text',uid:'mn10'},expected),/exactly one/);
  await assert.rejects(checkReading(()=>{},null,expected),/Missing/);
  await assert.rejects(parallelPages(async()=>({total:2,offset:0,returned:0,links:[],next_offset:0}),'mn10'),/does not advance/);
  await assert.rejects(parallelPages(async()=>({total:2,offset:0,returned:1,links:[{}],next_offset:null}),'mn10'),/missing parallel evidence/);
});

test('every shared-passage command targets the first retained source segment, including late evidence', () => {
  let late=0;
  for(const edge of parallels.load().shared) {
    const link=parallels.getParallels(edge.a,{limit:100000}).links.find(l=>l.source==='shared-passage' && l.text.id===edge.b);
    for(const side of ['this','other']) {
      const [uid,n]=link[`${side}_segments`][0].split('/');
      assert.deepEqual(link[`${side}_read_with`],{tool:'get_text',uid,offset:Number(n)-1,limit:1});
      if(Number(n)>60)late++;
    }
  }
  assert.ok(late>0,'exercise evidence beyond the default first page');
});
