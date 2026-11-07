// Replays measured real MCP wall time through the installed widget's deterministic UI clock.
// This is not a signed-in host or a claim that a host permits a 90-second tool call.
import assert from 'node:assert/strict';
import {view,settle} from '../../tests/helpers/widget-view.mjs';

export async function readerDeadlineAudit(client) {
 const tool=(await client.listTools()).tools.find(t=>t.name==='read_passage_widget');
 const html=(await client.readResource({uri:tool._meta.ui.resourceUri})).contents[0].text;
 assert.ok(html.includes('}, 90000);'),'Installed widget must have the bounded navigation deadline');
 const control=html.replace('}, 90000);','}, 30000);'),cases=[];
 return {
  begin(seed,args) {
   return ['MCP Apps','Apps SDK'].map(bridge=>{
    const initial=structuredClone(seed);initial.pali.continue_with={name:'read_passage_widget',arguments:args};
    const current=view(bridge,{html}),old=view(bridge,{html:control});
    for(const ui of [current,old]){ui.output(initial);ui.click('Continue Pāli');}
    return {bridge,current,old};
   });
  },
  async finish(uis,result,milliseconds) {
   for(const {bridge,current,old}of uis){
    current.advance(milliseconds);old.advance(milliseconds);
    const previousExpired=old.elements.status.textContent.includes('within 90 seconds');
    current.reply(0,result);old.reply(0,result);await settle();
    assert.equal(current.timers.size,0);assert.equal(current.elements.navigation.attributes['aria-busy'],'false');
    if(!result.isError){
     assert.ok(milliseconds<90000,'Cold reader result must fit the finite UI deadline');
     for(const segment of result.structuredContent.pali.segments)assert.ok(current.elements.pali.textContent.includes(segment.text),'Installed reader must display the returned source, not a timeout or stale page');
     if(previousExpired)assert.match(old.elements.title.textContent,/Could not open/,'30-second control must ignore its late source reply');
    }else assert.match(current.elements.title.textContent,/Could not open/);
    cases.push({bridge,milliseconds,source_displayed:!result.isError,previous_30s_expired:previousExpired,explicit_busy:result.structuredContent?.code==='HOSTED_TOOL_BUSY'});
   }
  },
  report() {
   return {deadline_ms:90000,previous_deadline_reproduced:cases.some(c=>c.source_displayed&&c.previous_30s_expired),cases,scope:'Real cold installed MCP timings replayed through installed HTML with deterministic UI clocks, including a same-HTML 30-second control. No actual-host or real-clock browser acceptance.'};
  },
 };
}
