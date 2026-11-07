import {test} from 'node:test';
import assert from 'node:assert/strict';
import {view, fixture, settle} from './helpers/widget-view.mjs';
const url = 'https://suttacentral.net/mn10'; // Existing outbound link only; no retrieval.
const source = label => ({...fixture(label), links:{suttacentral:url}});
const find = e => e.tagName === 'a' ? e : e.children.map(find).find(Boolean);
function activate(ui) { const a = find(ui.elements.footer); a.listeners.click({preventDefault(){}}); return a; }
const calls = ui => ui.messages.filter(m=>m.method==='ui/open-link');
test('MCP source links use unique IDs, serialize clicks and distinguish host acceptance from actual opening',()=>{
 const ui=view('MCP Apps'); ui.output(source()); const anchor=activate(ui); activate(ui);
 assert.equal(calls(ui).length,1); assert.equal(anchor.href,url); assert.equal(calls(ui)[0].params.url,url);
 assert.match(ui.elements['link-status'].textContent,/Asking/);
 ui.response(calls(ui)[0].id); assert.match(ui.elements['link-status'].textContent,/host accepted/);
 assert.match(ui.elements['link-status'].textContent,/not verified/); assert.equal(ui.timers.size,0);
 activate(ui); assert.notEqual(calls(ui)[0].id,calls(ui)[1].id);
});
test('MCP refusal, protocol errors and malformed replies report failure without exposing private errors or clearing source',()=>{
 for(const reply of [{isError:true},[], 'malformed', null, false, 0]){
  const ui=view('MCP Apps');ui.output(source());activate(ui);ui.response(calls(ui)[0].id,reply);
  assert.match(ui.elements['link-status'].textContent,reply && reply.isError?/could not open/:/did not confirm/);assert.match(ui.elements.pali.textContent,/first fixture/);
  assert.match(ui.elements.footer.textContent,/Fixture credit/);assert.equal(calls(ui).length,1);
 }
 const ui=view('MCP Apps');ui.output(source());activate(ui);ui.response(calls(ui)[0].id,undefined,{message:'Private host refusal'});
 assert.match(ui.elements['link-status'].textContent,/could not open/);assert.doesNotMatch(ui.elements['link-status'].textContent,/Private/);
});
test('unsupported link hosts retain hrefs and explain unavailability without attempting an unsupported route',()=>{
 const ui=view('MCP Apps',{openLinks:false});ui.output(source());const a=activate(ui);
 assert.equal(a.href,url);assert.equal(calls(ui).length,0);assert.equal(ui.timers.size,0);
 assert.match(ui.elements['link-status'].textContent,/unavailable/);
});
test('timed-out, unrelated and late MCP link replies cannot overwrite a newer reading or closed reader',()=>{
 const ui=view('MCP Apps');ui.output(source());activate(ui);const id=calls(ui)[0].id;
 ui.response(id+10);assert.match(ui.elements['link-status'].textContent,/Asking/);
 ui.timeout();assert.match(ui.elements['link-status'].textContent,/did not confirm/);
 ui.response(id);assert.match(ui.elements['link-status'].textContent,/did not confirm/);
 activate(ui);const second=calls(ui)[1].id;ui.output(source('new'));ui.response(second);
 assert.equal(ui.elements['link-status'].textContent,'');assert.match(ui.elements.pali.textContent,/new fixture/);
 activate(ui);const third=calls(ui)[2].id;const a=find(ui.elements.footer);ui.request('close','ui/resource-teardown');ui.response(third);
 a.listeners.click({preventDefault(){}});assert.equal(calls(ui).length,3);assert.equal(ui.elements['link-status'].textContent,'');assert.equal(ui.timers.size,0);
});
test('legacy synchronous and asynchronous link failures are contained without retrying through MCP',async()=>{
 for(const mode of ['throw','reject','isError','asyncError','success','asyncSuccess']){
  const ui=view('Apps SDK');let count=0;ui.window.openai.openExternal=()=>{count++;if(mode==='throw')throw Error('Private failure');if(mode==='reject')return Promise.reject(Error('Private failure'));if(mode==='isError')return {isError:true};if(mode==='asyncError')return Promise.resolve({isError:true});if(mode==='asyncSuccess')return Promise.resolve();};
  ui.initialize();ui.output(source());activate(ui);await settle();
  assert.match(ui.elements['link-status'].textContent,mode.includes('Success')||mode==='success'?/sent to the host/:/could not open/);
  assert.equal(count,1);assert.equal(calls(ui).length,0);assert.equal(ui.timers.size,0);
  assert.match(ui.elements.pali.textContent,/first fixture/);assert.doesNotMatch(ui.elements['link-status'].textContent,/Private/);
 }
});
test('late legacy link callbacks and reentrant teardown cannot revive link status or source',async()=>{
 const ui=view('Apps SDK');let resolve;ui.window.openai.openExternal=()=>new Promise(r=>resolve=r);
 ui.output(source());activate(ui);ui.output(source('new'));resolve();await settle();assert.equal(ui.elements['link-status'].textContent,'');
 ui.window.openai.openExternal=()=>{ui.request('close','ui/resource-teardown');return Promise.reject(Error('Private closed failure'));};
 activate(ui);await settle();assert.equal(ui.elements.title.textContent,'Reader closed');assert.equal(ui.elements['link-status'].textContent,'');assert.equal(ui.timers.size,0);
});
test('new UI navigation clears pending link feedback and ignores its later response',async()=>{
 const ui=view('MCP Apps');ui.output(source());activate(ui);const id=calls(ui)[0].id;
 ui.click('Continue Pāli');ui.response(id,{isError:true});assert.equal(ui.elements['link-status'].textContent,'');
 ui.reply(0,{structuredContent:source('next')});await settle();assert.match(ui.elements.pali.textContent,/next fixture/);
});
