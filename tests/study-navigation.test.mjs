import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import * as canon from '../src/canon.mjs';
import {parseDate,dailyText} from '../src/daily.mjs';
import {readAssignment} from '../scripts/evidence/study.mjs';
import {createServer} from '../src/server.mjs';

test('daily dates preserve full ISO years without the Date.UTC 1900 adjustment', () => {
  for(const date of ['0000-02-29','0001-01-01','0099-12-31','0100-01-01','1900-03-01','2000-02-29','2026-11-07','9999-12-31']) {
    const actual=parseDate(date);
    assert.equal(actual.date,date);
    assert.equal(actual.dayNumber,Math.floor(Date.parse(date+'T00:00:00Z')/86400000));
  }
  for(const date of ['0001-02-29','0099-02-29','0100-02-29','1900-02-29','2026-13-01','2026-00-01','2026-01-00'])assert.throws(()=>parseDate(date),/does not exist/);
  assert.equal(parseDate('0100-01-01').dayNumber-parseDate('0099-12-31').dayNumber,1);
  assert.equal(parseDate(undefined,new Date('2026-11-07T23:30:00-02:00')).date,'2026-11-08');
});

test('both daily kinds provide reading commands; MCP reading retains pinned source and terms', async () => {
  const [a,b]=InMemoryTransport.createLinkedPair();const server=createServer(),client=new Client({name:'daily-source-test',version:'1'});
  try{
    await Promise.all([server.connect(a),client.connect(b)]);
    for(const kind of ['verse','sutta']) {
      const daily=await client.callTool({name:'daily_text',arguments:{date:'0001-01-01',kind}});
      assert.ok(!daily.isError);
      const result=JSON.parse(daily.content[0].text);
      assert.equal(result.read_with.tool,'get_text');
      assert.equal(result.read_with.uid,result.text.id);
      const read=await client.callTool({name:'get_text',arguments:{uid:result.read_with.uid,limit:1}});
      const value=JSON.parse(read.content[0].text);
      assert.equal(value.text_id,result.text.id);
      assert.deepEqual(value.source,canon.source());
      assert.ok(value.source.terms);
      assert.equal(result.source.pali.commit,value.source.commit);
    }
  }finally{await client.close();await server.close()}
});

test('planned parts stop at their assignment boundary while whole readings follow all pages', async () => {
  const unit=canon.resolve('dn2').unit,all=canon.segments(unit);let calls=0;
  const correct=async(name,args)=>{
    calls++;const offset=args.offset??0,limit=args.limit??2;const segments=all.slice(offset,offset+limit);
    return {text_id:unit.id,source:canon.source(),attribution:canon.source().attribution,total_segments:all.length,offset,limit,returned:segments.length,segments,next_offset:offset+segments.length<all.length?offset+segments.length:null};
  };
  const part=await readAssignment(correct,{uid:unit.id,offset:5,limit:3},unit);
  assert.equal(part.pages,1);assert.equal(calls,1);assert.equal(part.end,8);
  const whole=await readAssignment(correct,{uid:unit.id},unit);assert.equal(whole.segments,all.length);assert.ok(whole.pages>1);
  await assert.rejects(readAssignment(async(name,args)=>({...await correct(name,args),segments:all.slice(5)}),{uid:unit.id,offset:5,limit:3},unit),/spills beyond source bounds/);
  await assert.rejects(readAssignment(async(name,args)=>({...await correct(name,args),source:{}}),{uid:unit.id,offset:5,limit:3},unit),/pinned source and terms/);
});
