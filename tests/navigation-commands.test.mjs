import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import * as canon from '../src/canon.mjs';

async function session(run) {
  const [a,b]=InMemoryTransport.createLinkedPair();const server=createServer(),client=new Client({name:'navigation-test',version:'1'});
  const raw=(name,args)=>client.callTool({name,arguments:args});
  const call=async(name,args)=>{const r=await raw(name,args);assert.ok(!r.isError,JSON.stringify(r.content));return JSON.parse(r.content[0].text)};
  const follow=command=>{const {tool,...args}=command;return call(tool,args)};
  try{await Promise.all([client.connect(a),server.connect(b)]);await run({call,raw,follow})}finally{await client.close();await server.close()}
}

test('topic and numbered-list catalogues provide executable navigation and canonical reading commands', async()=>session(async({call,follow})=>{
  const catalog=await call('list_topics',{query:'emptiness',limit:1});
  const topic=await follow(catalog.topics[0].read_with);
  assert.equal(topic.topic.slug,catalog.topics[0].slug);
  const ref=topic.texts[0];const text=await follow(ref.read_with);
  assert.equal(text.text_id,ref.id);assert.deepEqual(text.source,canon.source());
  const list=await call('dhamma_list',{name:'thirty-seven-aids-to-awakening'});
  const nested=await follow(list.members.find(m=>m.list).read_with);
  assert.equal(nested.slug,list.members.find(m=>m.list).list);
  const passage=await follow(nested.defined_in[0].read_with);
  assert.equal(passage.text_id,nested.defined_in[0].id);
  assert.deepEqual(list.source.pali,canon.source());
}));

test('paritta refuses ignored or blank source selectors and retains valid catalogue navigation', async()=>session(async({call,raw,follow})=>{
  for(const args of [{text:'MN 999'},{text:''},{name:'ratana',text:''},{name:'ratana',text:'MN 10'}]){
    const result=await raw('paritta',args);assert.equal(result.isError,true,JSON.stringify(args));
  }
  const catalog=await call('paritta',{});
  const entry=catalog.paritta.find(e=>e.key==='mangala');
  const defaultSource=await follow(entry.read_with);assert.equal(defaultSource.text_id,'kp5');
  const alternative=await follow(entry.texts.find(t=>t.text_id==='snp2.4').read_with);
  assert.equal(alternative.text_id,'snp2.4');assert.deepEqual(alternative.source,canon.source());
}));

test('paritta continuation pins alternative sources and uses excerpt-relative offsets', async()=>session(async({call,follow})=>{
  const all=[];let page=await call('paritta',{name:'mangala',text:'Snp 2.4',limit:2});
  do{assert.equal(page.text_id,'snp2.4');all.push(...page.segments);if(!page.continue_with)break;assert.equal(page.continue_with.text,'snp2.4');page=await follow(page.continue_with)}while(true);
  assert.deepEqual(all,canon.segments(canon.resolve('snp2.4').unit));
  const excerpt=[];page=await call('paritta',{name:'angulimala',limit:1});
  do{excerpt.push(...page.segments);if(!page.continue_with)break;assert.equal(page.continue_with.offset,excerpt.length);page=await follow(page.continue_with)}while(true);
  assert.deepEqual(excerpt.map(s=>s.ref),['mn86/1','mn86/16','mn86/17']);
  const source=canon.segments(canon.resolve('mn86').unit);
  for(const segment of excerpt)assert.deepEqual(segment,source[Number(segment.ref.split('/')[1])-1]);
  assert.equal(page.continue_with,null);
  assert.deepEqual(page.canonical_read_with,{tool:'get_text',uid:'mn86'});
}));
