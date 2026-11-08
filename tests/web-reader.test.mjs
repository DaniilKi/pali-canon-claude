import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHttpServer} from '../src/http-server.mjs';
import {readFileSync} from 'node:fs';

test('standalone reader serves only fixed first-party assets with restrictive policies; MCP still works', async t => {
 const server=createHttpServer({rateLimitPerMinute:0}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`;
 for(const [path,type] of [['/','text/html'],['/reader','text/html'],['/reader.js','text/javascript'],['/reader.css','text/css']]) {
  const response=await fetch(base+path); assert.equal(response.status,200); assert.match(response.headers.get('content-type'),new RegExp(type));
  assert.match(response.headers.get('content-security-policy'),/default-src 'none'/); assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  assert.ok((await response.text()).length>100);
  const head=await fetch(base+path,{method:'HEAD'}); assert.equal(head.status,200); assert.equal(await head.text(),'');
 }
 assert.equal((await fetch(base+'/reader.js/private')).status,404);
 assert.equal((await fetch(base+'/package.json')).status,404);
 const mcp=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'get_text',arguments:{uid:'dhp183'}}})});
 const result=(await mcp.json()).result; assert.equal(result.structuredContent.text_id,'dhp183');
});

test('reader does not execute fetched markup or load third-party assets',()=>{
 const js=readFileSync('web/reader.js','utf8'),html=readFileSync('web/index.html','utf8');
 assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|eval\(/);
 assert.doesNotMatch(html,/(?:src|href)="https?:/);
 assert.match(js,/epoch/); assert.match(js,/studyEpoch/);
});
