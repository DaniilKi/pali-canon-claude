import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NAVIGATION_TIMEOUT_MS} from '../src/chatgpt-widget.mjs';
import {view,fixture,settle} from './helpers/widget-view.mjs';

for(const bridge of ['MCP Apps','Apps SDK']) {
 test(`${bridge}: cold navigation remains pending past 30 seconds and accepts the measured 55-second reply`,async()=>{
  const ui=view(bridge);ui.output(fixture());ui.click('Continue Pāli');
  assert.equal(NAVIGATION_TIMEOUT_MS,90000);ui.advance(55000);
  assert.equal(ui.elements.navigation.attributes['aria-busy'],'true');assert.match(ui.elements.navigation.textContent,/90 seconds/);
  ui.reply(0,{structuredContent:fixture('cold result')});await settle();
  assert.match(ui.elements.pali.textContent,/cold result/);assert.equal(ui.elements.navigation.attributes['aria-busy'],'false');assert.equal(ui.timers.size,0);
 });
 test(`${bridge}: navigation still has a finite deadline and ignores later success or failure`,async()=>{
  for(const reject of [false,true]) {
   const ui=view(bridge);ui.output(fixture());ui.click('Continue Pāli');ui.advance(NAVIGATION_TIMEOUT_MS-1);
   assert.equal(ui.elements.navigation.attributes['aria-busy'],'true');ui.advance(1);
   assert.match(ui.elements.status.textContent,/within 90 seconds/);assert.doesNotMatch(ui.elements.pali.textContent,/first fixture/);assert.equal(ui.timers.size,0);
   if(reject)ui.reject(0,'Late failure');else ui.reply(0,{structuredContent:fixture('late result')});await settle();
   assert.doesNotMatch(ui.elements.pali.textContent,/late result|Late failure/);
  }
 });
 test(`${bridge}: Stop waiting cancels only its current navigation and leaves late replies inert`,async()=>{
  for(const reject of [false,true]) {
   const ui=view(bridge,{...(bridge==='Apps SDK'?{stateWriter:true}:{modelCapabilities:{structuredContent:{}}})});ui.output(fixture());
   if(bridge==='MCP Apps')ui.contextReply(0);
   ui.click('Continue Pāli');ui.advance(31000);const stop=ui.click('Stop waiting');
   assert.equal(ui.elements.title.textContent,'Reading cancelled');assert.equal(ui.elements.navigation.children.length,0);
   // Pending model acknowledgement is independent; drain it before checking the cancellation snapshot.
   if(bridge==='MCP Apps')ui.contextReply(1);
   const context=bridge==='MCP Apps'?ui.models.at(-1).params.structuredContent.pali_reader:JSON.parse(ui.stateUpdates.at(-1).modelContent).pali_reader;
   assert.equal(context.state,'cancelled');assert.equal(context.source,undefined);assert.equal(context.pali,undefined);
   if(reject)ui.reject(0,'Late failure');else ui.reply(0,{structuredContent:fixture('late result')});await settle();
   assert.equal(ui.elements.title.textContent,'Reading cancelled');ui.output(fixture('fresh'));ui.click('Continue Pāli');stop.click();
   assert.equal(ui.elements.navigation.attributes['aria-busy'],'true','an old Stop waiting control cannot cancel a newer request');
   ui.reply(1,{structuredContent:fixture('fresh next')});await settle();assert.match(ui.elements.pali.textContent,/fresh next/);
  }
 });
}
