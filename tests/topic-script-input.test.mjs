import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {topic,listTopics,dhammaList,listsIndex} from '../src/topics.mjs';
import {SCRIPTS,transliterate} from '../src/script.mjs';
import {createServer} from '../src/server.mjs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
const native=(text,script)=>transliterate(text,'roman',script);
function same(actual,expected,script,text){const {input_script,input_romanized,...source}=actual;assert.deepEqual(source,expected);if(script==='roman'){assert.equal(input_script,undefined);assert.equal(input_romanized,undefined);}else{assert.equal(input_script,script);assert.equal(input_romanized,text.toLowerCase());}}
test('handwritten Thai selectors reproduce topic, filtered catalogue and numbered-list source results',()=>{
 for(const [name,roman] of [['สติ','sati'],['กมฺม','kamma']]){same(topic(canon,name),topic(canon,roman),'thai',roman);same(listTopics({query:name}),listTopics({query:roman}),'thai',roman);same(dhammaList(canon,name),dhammaList(canon,roman),'thai',roman);}
 assert.equal(topic(canon,'สติ').topic.slug,'sati');assert.equal(listTopics({query:'สติ'}).total,2);assert.equal(dhammaList(canon,'สติ').slug,'four-foundations-of-mindfulness');
});
test('Pali topic aliases, ranked alternatives and catalogue filters/pages stay equivalent in eight scripts',()=>{
 for(const name of ['sati','kamma','upekkhā','jhāna','brahma','paṭiccasamuppāda','satipaṭṭhāna'])for(const script of SCRIPTS){
  same(topic(canon,native(name,script)),topic(canon,name),script,name);
  for(const index of ['all','subject','numerical'])for(const offset of [0,1])same(listTopics({query:native(name,script),index,offset,limit:1}),listTopics({query:name,index,offset,limit:1}),script,name);
 }
 const broad=topic(canon,'jhāna');assert.ok(broad.other_matches.length>1);assert.ok(dhammaList(canon,'jhāna').other_matches.length);
 for(const script of SCRIPTS)same(dhammaList(canon,native('jhāna',script)),dhammaList(canon,'jhāna'),script,'jhāna');
});
test('every curated Pali list selector retains its own members, status, gloss cautions and source commands across scripts',()=>{
 for(const entry of listsIndex().lists){const expected=dhammaList(canon,entry.pali);assert.equal(expected.slug,entry.slug);
  for(const script of SCRIPTS)same(dhammaList(canon,native(entry.pali,script)),expected,script,entry.pali);
 }
 assert.equal(dhammaList(canon,native('dasa pāramiyo','thai')).status,'later');
});
test('mixed/unsupported and unknown selectors do not choose another topic, list or full catalogue',()=>{
 for(const name of ['สति','ส่ติ','漢sati字','ηsati']){assert.throws(()=>topic(canon,name),/converted completely/);assert.throws(()=>dhammaList(canon,name),/converted completely/);assert.throws(()=>listTopics({query:name}),/converted completely/);}
 for(const script of SCRIPTS){const name=native('papapapapapapa',script);assert.throws(()=>topic(canon,name),/No topic/);assert.throws(()=>dhammaList(canon,name),/No numbered list/);const r=listTopics({query:name});assert.equal(r.total,0);assert.deepEqual(r.topics,[]);}
 assert.equal(dhammaList(canon).lists.length,listsIndex().lists.length);assert.equal(listTopics().total,listTopics({query:''}).total);
});
test('MCP native navigation preserves structured/text parity, alternatives and executable canonical source commands',async()=>{
 const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'native-topic-fixture',version:'1'}),server=createServer();
 const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),r.structuredContent);return r.structuredContent;};
 try{await Promise.all([client.connect(a),server.connect(b)]);for(const script of SCRIPTS){
  const name=native('jhāna',script);same(await call('topic',{name}),topic(canon,'jhāna'),script,'jhāna');same(await call('list_topics',{query:name,limit:1,offset:1}),listTopics({query:'jhāna',limit:1,offset:1}),script,'jhāna');const list=await call('dhamma_list',{name});same(list,dhammaList(canon,'jhāna'),script,'jhāna');
  for(const command of [list.defined_in[0].read_with,list.other_matches[0].read_with]){const {tool,...args}=command;const r=await call(tool,args);assert.ok(r.text_id||r.slug);}
 }
 for(const tool of ['topic','list_topics','dhamma_list']){const r=await client.callTool({name:tool,arguments:tool==='list_topics'?{query:'สति'}:{name:'สति'}});assert.equal(r.isError,true);assert.match(JSON.parse(r.content[0].text).error,/converted completely/);}
 }finally{await client.close();await server.close();}
});
