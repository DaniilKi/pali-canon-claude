/** Actual source positives and host-owned same-object JSON changes; no private state oracle. */
import test, {afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readPassage,WIDGET_HTML} from '../src/chatgpt-widget.mjs';
import {liveCache} from '../src/cache.mjs';
import {sixteenEnglishEvidence,sha} from './helpers/thera335-350-evidence.mjs';
import {view,settle} from './helpers/widget-view.mjs';

const source=sixteenEnglishEvidence(),originalFetch=globalThis.fetch;
const wire=value=>JSON.parse(JSON.stringify(value)); // Exact JSON host-transport domain.
const sourceIds=['tha-ap337','tha-ap338'];
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});

async function canonical(uid='mn1',offset=0) {
  return wire(await readPassage({uid,offset,limit:1,english:false}));
}
function replaceSameObject(target,next) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target,wire(next));
  return target;
}
function noOutboundCanary(ui,canary) {
  assert.ok(!JSON.stringify({calls:ui.calls,messages:ui.messages,models:ui.models,state:ui.stateUpdates}).includes(canary));
}
function snapshotFunctions() {
  // Isolate only the actual source helpers for the Array.prototype hook probe:
  // existing model-context JSON operations are outside this cache change.
  const script=WIDGET_HTML.match(/<script>([^]*?)<\/script>/)[1];
  const start=script.indexOf('  function jsonToolSnapshot('),end=script.indexOf('  function render(d) {');
  assert.ok(start>=0&&end>start,'The real widget snapshot functions are required');
  return script.slice(start,end);
}
async function sourcePage(uid) {
  liveCache.clear();
  globalThis.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:input.href;
    const id=sourceIds.find(id=>source.profiles[id].raw_url===url);
    assert.ok(id,'Only the two exact independently pinned source originals may be fetched');
    assert.ok(!JSON.stringify(init).includes('SYNTHETIC_PRIVATE_CACHE_DRAFT'));
    return new Response(source.artifact(id));
  };
  const p=source.profiles[uid];
  const data=wire(await readPassage({uid,translation:'ap:'+p.path.replace(/^\/text\/|\/$/g,''),englishCharacters:500,limit:1}));
  assert.ok(data.english,data.english_error);
  assert.equal(sha(data.english.text),source.rows[uid].pages[0].text_sha256);
  assert.equal(sha(JSON.stringify(data.english.translator_notes)),p.notes_sha256);
  return data;
}

for (const bridge of ['MCP Apps','Apps SDK']) {
  test(`${bridge}: genuine English same-object note corruption clears the old body and restores only after repair`,{skip:!source.checkout},async()=>{
    const data=await sourcePage('tha-ap337'),ui=view(bridge);
    const body=data.english.text,pali=data.pali.segments[0].text;
    ui.output(data);assert.ok(ui.elements.english.textContent.includes(body));
    const goodNote=data.english.translator_notes[0].text,marker='SYNTHETIC_CORRUPT_INPLACE_NOTE';
    data.english.translator_notes[0].text=goodNote+marker;
    ui.output(data); // Same outer object and same English/note object identities.
    assert.ok(!ui.elements.english.textContent.includes(body),'The old validated body is cleared');
    assert.match(ui.elements.english.textContent,/No English|No translation/);
    assert.ok(!ui.elements.english.textContent.includes(marker),'Corrupted words are not displayed');
    assert.ok(ui.elements.pali.textContent.includes(pali));noOutboundCanary(ui,marker);
    data.english.translator_notes[0].text=goodNote;
    ui.output(data);assert.ok(ui.elements.english.textContent.includes(body));
  });

  test(`${bridge}: both genuine English sources pass before a valid new unit reuses the same object identity`,{skip:!source.checkout},async()=>{
    const first=await sourcePage('tha-ap337'),next=await sourcePage('tha-ap338');
    const ui=view(bridge),positive=view(bridge);ui.output(first);positive.output(next);
    assert.ok(ui.elements.english.textContent.includes(first.english.text));
    assert.ok(positive.elements.english.textContent.includes(next.english.text),'The next pinned source is independently displayable');
    const oldEnglish=first.english.text,oldPali=first.pali.segments[0].text;
    replaceSameObject(first,next);ui.output(first);
    assert.ok(ui.elements.english.textContent.includes(next.english.text));
    assert.ok(ui.elements.pali.textContent.includes(next.pali.segments[0].text));
    assert.ok(!ui.elements.english.textContent.includes(oldEnglish));
    assert.ok(!ui.elements.pali.textContent.includes(oldPali));
  });

  test(`${bridge}: unchanged ordinary cross-realm JSON preserves DOM focus pending Stop and unrelated private state`,async()=>{
    const data=await canonical(),ui=view(bridge,{stateWriter:true});ui.output(data);
    const pali=ui.elements.pali.firstChild,english=ui.elements.english.firstChild;
    ui.click('Continue Pāli');
    const stop=ui.elements.navigation.children.find(node=>node.textContent==='Stop waiting');
    assert.ok(stop);stop.focus();let privateReads=0;
    Object.defineProperty(ui.window.openai,'widgetState',{get(){privateReads++;throw Error('Private widgetState must not be read');}});
    ui.window.localDraft={text:'SYNTHETIC_PRIVATE_CACHE_DRAFT',toJSON(){privateReads++;throw Error('Private drafts must not be serialized');}};
    ui.output(data);
    if (bridge==='Apps SDK') {ui.window.openai.theme='dark';ui.refresh();}
    else ui.notify('ui/notifications/host-context-changed',{theme:'dark',privateDraft:ui.window.localDraft});
    assert.equal(ui.elements.pali.firstChild,pali);assert.equal(ui.elements.english.firstChild,english);
    assert.equal(ui.elements.navigation.children.find(node=>node.textContent==='Stop waiting'),stop);
    assert.equal(stop.focused,true);assert.equal(ui.timers.size,1);assert.equal(privateReads,0);
    noOutboundCanary(ui,'SYNTHETIC_PRIVATE_CACHE_DRAFT');
    ui.click('Stop waiting');assert.match(ui.elements.title.textContent,/cancelled/);
    ui.reply(0,{structuredContent:await canonical('mn1',1)});await settle();
    assert.match(ui.elements.title.textContent,/cancelled/,'Late reply cannot replace Stop');
  });

  test(`${bridge}: a changed same-identity valid canonical selection cancels stale navigation and preserves exact replay commands`,async()=>{
    const data=await canonical('mn1'),next=await canonical('mn2'),late=await canonical('mn1',1),ui=view(bridge);
    ui.output(data);ui.click('Continue Pāli');
    replaceSameObject(data,next);ui.output(data);
    assert.ok(ui.elements.pali.textContent.includes(next.pali.segments[0].text));
    assert.equal(ui.timers.size,0);assert.equal(ui.elements.navigation.attributes['aria-busy'],'false');
    const expected=JSON.stringify(next.pali.read_with);assert.equal(JSON.stringify(data.pali.read_with),expected);
    ui.reply(0,{structuredContent:late});await settle();
    assert.ok(ui.elements.pali.textContent.includes(next.pali.segments[0].text));
    assert.ok(!ui.elements.pali.textContent.includes(late.pali.segments[0].text));
  });

  test(`${bridge}: same-object repaired-source pin changes reenter the existing locator refusal and recover explicitly`,async()=>{
    const data=wire(await readPassage({uid:'tha-ap348',limit:1,english:false})),ui=view(bridge),pin=data.source.locator_revision;
    assert.ok(pin);ui.output(data);const text=data.pali.segments[0].text;
    assert.ok(ui.elements.pali.textContent.includes(text));
    data.source.locator_revision='0'.repeat(40);ui.output(data);
    assert.ok(!ui.elements.pali.textContent.includes(text));assert.match(ui.elements.pali.textContent,/mapping revision changed/);
    data.source.locator_revision=pin;ui.output(data);assert.ok(ui.elements.pali.textContent.includes(text));
  });

  test(`${bridge}: unsupported non-JSON shapes disable reuse without getter or toJSON side effects`,async()=>{
    const original=await canonical();let reads=0;
    const changes=[
      d=>{d.extra=undefined;},d=>{d.extra=()=>{};},d=>{d.extra=Infinity;},
      d=>{d.extra=d;},d=>{d.extra=new Date(0);},d=>{d.extra=Object.create({inherited:true});},
      d=>{const prototype=Object.create(null);Object.defineProperty(prototype,'constructor',{value:Object});d.extra=Object.assign(Object.create(prototype),{value:'spoofed Object prototype'});},
      d=>{const prototype=[];Object.setPrototypeOf(prototype,Object.prototype);Object.defineProperty(prototype,'constructor',{value:Array});d.extra=[];Object.setPrototypeOf(d.extra,prototype);},
      d=>{d.extra=[,1];},d=>{d.extra={toJSON(){reads++;return 'not JSON data';}};},
      d=>{d[Symbol('host-local')]=true;},
      d=>Object.defineProperty(d,'extra',{enumerable:true,get(){reads++;return 'not read';}}),
    ];
    for(const change of changes){
      const data=wire(original),ui=view(bridge);ui.output(data);
      change(data);ui.output(data);const first=ui.elements.pali.firstChild;
      ui.output(data);assert.notEqual(ui.elements.pali.firstChild,first,'Unsupported shape must not produce a cache hit');
      assert.ok(ui.elements.pali.textContent.includes(original.pali.segments[0].text));
    }
    assert.equal(reads,0);
    const probe={value:wire(original)};
    runInNewContext(snapshotFunctions()+`
      globalThis.arrayHookReads=0;
      Object.defineProperty(Array.prototype,'toJSON',{configurable:true,get:function(){arrayHookReads++;throw Error('Inherited array toJSON must not run');}});
      globalThis.key=jsonToolSnapshot(value);
      globalThis.resultKey=resultSnapshot({structuredContent:value});
    `,probe);
    assert.equal(probe.arrayHookReads,0,'Copied snapshot arrays must have no inherited toJSON hook');
    assert.equal(probe.key,JSON.stringify(original));
    assert.equal(probe.resultKey,JSON.stringify({structuredContent:original}));
  });
}

test('Apps SDK same-object result metadata is rechecked without inspecting unrelated host-private metadata',async()=>{
  const first=await canonical('mn1'),next=await canonical('mn2'),ui=view('Apps SDK');
  const result={structuredContent:first},metadata={mcp_tool_result:result};let reads=0;
  Object.defineProperty(metadata,'privateDraft',{get(){reads++;throw Error('Private metadata must not be read');}});
  Object.defineProperty(result,'_meta',{get(){reads++;throw Error('Unconsumed private result metadata must not be serialized');}});
  ui.globals(undefined,metadata);assert.ok(ui.elements.pali.textContent.includes(first.pali.segments[0].text));
  const node=ui.elements.pali.firstChild;ui.refresh();assert.equal(ui.elements.pali.firstChild,node);
  replaceSameObject(first,next);ui.globals(undefined,metadata);
  assert.ok(ui.elements.pali.textContent.includes(next.pali.segments[0].text));
  result.isError=true;result.content=[{type:'text',text:'{"error":"Same-object host refusal"}'}];
  ui.globals(undefined,metadata);assert.match(ui.elements.pali.textContent,/Same-object host refusal/);
  assert.ok(!ui.elements.pali.textContent.includes(next.pali.segments[0].text));
  delete result.isError;delete result.content;ui.globals(undefined,metadata);
  assert.ok(ui.elements.pali.textContent.includes(next.pali.segments[0].text));assert.equal(reads,0);
  const before=await canonical('mn1'),prototype=Object.create(null);
  Object.defineProperty(prototype,'constructor',{value:Object});
  const spoofed=Object.assign(Object.create(prototype),{structuredContent:before});
  const inheritedPrototype=Object.create(null);
  Object.defineProperties(inheritedPrototype,{constructor:{value:Object},structuredContent:{value:before,writable:true}});
  const inherited=Object.create(inheritedPrototype),probe={spoofed,inherited};
  runInNewContext(snapshotFunctions()+';globalThis.spoofedKey=resultSnapshot(spoofed);globalThis.inheritedKey=resultSnapshot(inherited);',probe);
  assert.equal(probe.spoofedKey,null,'A native constructor name alone cannot approve a lookalike prototype');
  assert.equal(probe.inheritedKey,null,'Consumed result fields must be own JSON data fields');
  const other=view('Apps SDK'),inheritedMetadata={call_tool_result:inherited};
  other.globals(undefined,inheritedMetadata);assert.ok(other.elements.pali.textContent.includes(before.pali.segments[0].text));
  inheritedPrototype.structuredContent=next;other.globals(undefined,inheritedMetadata);
  assert.ok(other.elements.pali.textContent.includes(next.pali.segments[0].text),'An inherited-field result never becomes a memoized JSON hit');
});
