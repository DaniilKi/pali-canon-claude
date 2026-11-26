/** Actual pinned ap3 apparatus; partial host edits retain only the loaded view. */
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {readPassage,WIDGET_HTML} from '../src/chatgpt-widget.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const approvalBytes=readFileSync(new URL('../docs/evidence/source-notes/SARIPUTTA_SOURCE_SCHEMA_APPROVAL.json',import.meta.url));
assert.equal(createHash('sha256').update(approvalBytes).digest('hex'),'61121e60049a1a03976d72a6967ebef28dea08bbf9e79349d7a3aa025ec93930');
const approval=JSON.parse(approvalBytes),profile=approval.approved_profile_object,record=approval.approved_record_object;
const previousFetch=globalThis.fetch;let requests=0;
before(()=>{globalThis.fetch=async()=>{requests++;throw Error('Source-note frame tests prohibit upstream requests');};});
after(()=>{globalThis.fetch=previousFetch;assert.equal(requests,0);});

// Existing widget-view bridge protocol with parent-aware DOM/focus semantics
// needed by the source-note insertion/removal contract. Actual HTML is unedited.
function hostView(bridge) {
  const handlers={},messages=[],states=[],calls=[],timers=new Map();let id=0;
  const document={activeElement:null};
  class Element {
    constructor(tag=''){this.tagName=tag;this.children=[];this.attributes={};this.listeners={};this._text='';this.value='';this.parentNode=null;}
    get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
    set textContent(value){for(const n of [...this.children])this.removeChild(n);this._text=String(value);}
    get firstChild(){return this.children[0];}get lastChild(){return this.children.at(-1);}
    get nextSibling(){return this.parentNode?.children[this.parentNode.children.indexOf(this)+1];}
    appendChild(node){if(node.parentNode)node.parentNode.removeChild(node);this.children.push(node);node.parentNode=this;return node;}
    removeChild(node){if(node.contains(document.activeElement))document.activeElement=document.body;this.children.splice(this.children.indexOf(node),1);node.parentNode=null;return node;}
    insertBefore(node,before){if(!before)return this.appendChild(node);if(node.parentNode)node.parentNode.removeChild(node);const i=this.children.indexOf(before);assert.ok(i>=0);this.children.splice(i,0,node);node.parentNode=this;return node;}
    contains(node){return node===this||this.children.some(child=>child.contains(node));}
    setAttribute(key,value){this.attributes[key]=value;}
    addEventListener(name,fn){this.listeners[name]=fn;}
    focus(){document.activeElement=this;}
    click(){if(!this.disabled)this.listeners.click?.();}
  }
  const elements=Object.fromEntries(['title','meta','pali','pali-h','english','footer','status','navigation','context-status','link-status'].map(name=>[name,new Element()]));
  document.body=new Element('body');document.documentElement=new Element('html');
  for(const node of Object.values(elements))document.body.appendChild(node);
  document.activeElement=document.body;document.getElementById=name=>elements[name];document.createElement=tag=>new Element(tag);
  document.createTextNode=text=>{const node=new Element();node.textContent=text;return node;};
  const parent={postMessage(message){messages.push(message);if(message.method==='tools/call')calls.push(message);}};
  const window={parent,addEventListener(name,fn){handlers[name]=fn;}};
  if(bridge==='Apps SDK')window.openai={callTool(name,args){return new Promise(resolve=>calls.push({name,args,resolve}));},setWidgetState(value){states.push(value);}};
  runInNewContext(WIDGET_HTML.match(/<script>([^]*?)<\/script>/)[1],{window,document,Date,TextEncoder,setTimeout(fn){timers.set(++id,fn);return id;},clearTimeout(id){timers.delete(id);}});
  const send=data=>handlers.message({source:parent,data:{jsonrpc:'2.0',...data}});
  if(bridge==='MCP Apps')send({id:1,result:{hostCapabilities:{serverTools:{},updateModelContext:{structuredContent:{}}}}});
  return {elements,document,window,messages,states,calls,timers,
    output(data){if(bridge==='Apps SDK'){window.openai.toolOutput=data;handlers['openai:set_globals']();}else send({method:'ui/notifications/tool-result',params:{structuredContent:data}});},
    ack(){for(const message of [...messages])if(message.method==='ui/update-model-context')send({id:message.id,result:{}});},
    modelSnapshot(){return JSON.stringify({models:messages.filter(m=>m.method==='ui/update-model-context'),states});},
    input(){const node=new Element('input');node.value='SYNTHETIC_PRIVATE_SOURCE_NOTE_DRAFT';document.body.appendChild(node);node.focus();return node;},
    click(label){const node=elements.navigation.children.find(n=>n.textContent===label);assert.ok(node,label);node.click();return node;},
    reply(index,data){if(bridge==='Apps SDK')calls[index].resolve({structuredContent:data});else send({id:calls[index].id,result:{structuredContent:data}});}
  };
}
const nodes=node=>[node,...node.children.flatMap(nodes)];
const withClass=(root,name)=>nodes(root).filter(n=>(n.className||'').split(' ').includes(name));
const rootNodes=ui=>ui.elements.pali.children.filter(n=>(n.className||'').split(' ').includes('seg'));
function sameLoadedView(ui,roots,input,model){
  const actual=rootNodes(ui);assert.equal(actual.length,roots.length);
  actual.forEach((node,index)=>assert.equal(node,roots[index],'The exact loaded Pali nodes remain'));
  assert.equal(ui.document.activeElement,input);assert.equal(input.value,'SYNTHETIC_PRIVATE_SOURCE_NOTE_DRAFT');
  assert.equal(ui.modelSnapshot(),model,'Partial apparatus/selector edits never republish reading context');
  assert.ok(!ui.modelSnapshot().includes(input.value));
  assert.ok(!rootNodes(ui).map(n=>n.textContent).join('').includes(record.text));
}
function replaceSameObject(target,next){for(const key of Object.keys(target))delete target[key];Object.assign(target,clone(next));}
async function page(mode='uid',delta=0){const anchor=profile.anchors[mode];return clone(await readPassage({...anchor.selector,offset:anchor.offset+delta,limit:1,english:false}));}

for(const bridge of ['MCP Apps','Apps SDK']) {
  test(`${bridge}: actual uid/book note envelopes and missing changed duplicate anchors preserve loaded DOM/focus through refusal and recovery`,async()=>{
    for(const mode of ['uid','book']){
      const data=await page(mode),original=clone(data),ui=hostView(bridge);ui.output(data);ui.ack();
      assert.equal(withClass(ui.elements.pali,'edition-note-text').length,1);
      assert.equal(withClass(ui.elements.pali,'edition-note-text')[0].textContent,record.text);
      assert.equal(data.pali.segments[0].ref,profile.anchors[mode].segment.ref);
      const roots=rootNodes(ui),input=ui.input(),model=ui.modelSnapshot();assert.ok(roots.length);
      const mutations=[
        d=>delete d.source_notes,d=>{d.source_notes=null;},d=>{d.source_notes.entries=[];},
        d=>{d.source_notes.entries.push(clone(d.source_notes.entries[0]));},
        d=>{d.source_notes.extraction_revision='synthetic-stale';},
        d=>{d.source_notes.entries[0].text+=' synthetic changed note';},
        d=>{d.source_notes.entries[0].text_sha256='0'.repeat(64);},
        d=>{d.source_notes.availability.read_with.uid='tha-ap4';},
      ];
      for(const mutate of mutations){
        mutate(data);ui.output(data);
        assert.equal(withClass(ui.elements.pali,'edition-note-text').length,0);
        assert.match(withClass(ui.elements.pali,'source-notes-status')[0].textContent,/could not be verified/);
        sameLoadedView(ui,roots,input,model);
        data.source_notes=clone(original.source_notes);ui.output(data);
        assert.equal(withClass(ui.elements.pali,'edition-note-text')[0].textContent,record.text);
        sameLoadedView(ui,roots,input,model);
      }
      for(const kind of ['missing','changed','changed-text','duplicate']){
        const segments=clone(original.pali.segments);
        if(kind==='missing')segments.length=0;
        else if(kind==='changed')segments[0].vri_paragraph='373';
        else if(kind==='changed-text')segments[0].text='SYNTHETIC_UNTRUSTED_ROOT_CHANGE';
        else segments.push(clone(segments[0]));
        data.pali.segments=segments;ui.output(data);
        assert.ok(!ui.elements.pali.textContent.includes('SYNTHETIC_UNTRUSTED_ROOT_CHANGE'));
        assert.equal(withClass(ui.elements.pali,'edition-note-text').length,0);
        assert.match(withClass(ui.elements.pali,'source-notes-status')[0].textContent,/could not be verified/);
        sameLoadedView(ui,roots,input,model);
        data.pali.segments=clone(original.pali.segments);ui.output(data);
        assert.equal(withClass(ui.elements.pali,'edition-note-text')[0].textContent,record.text);
        sameLoadedView(ui,roots,input,model);
      }
      const next=await page(mode,1);replaceSameObject(data,next);ui.output(data);
      assert.notEqual(rootNodes(ui)[0],roots[0],'A genuine changed offset is a complete new reading');
      assert.ok(ui.elements.pali.textContent.includes(next.pali.segments[0].text));
      assert.equal(withClass(ui.elements.pali,'edition-note-text').length,0);
    }
  });

  test(`${bridge}: identity-only partial headers retain loaded words/context and Stop while genuine same-object replacements render`,async()=>{
    const data=clone(await readPassage({uid:'mn1',limit:1,english:false})),ui=hostView(bridge);ui.output(data);ui.ack();
    const roots=rootNodes(ui),input=ui.input(),model=ui.modelSnapshot();
    data.text_id='mn2';data.source.commit='0'.repeat(40);ui.output(data);
    sameLoadedView(ui,roots,input,model);
    assert.equal(withClass(ui.elements.pali,'source-notes-status').length,0);
    const next=clone(await readPassage({uid:'mn2',limit:1,english:false}));replaceSameObject(data,next);ui.output(data);ui.ack();
    assert.notEqual(rootNodes(ui)[0],roots[0]);assert.ok(ui.elements.pali.textContent.includes(next.pali.segments[0].text));
    assert.notEqual(ui.modelSnapshot(),model,'Genuine replacement publishes the genuine new reading');
    ui.click('Continue Pāli');ui.ack();input.focus();
    const currentRoots=rootNodes(ui),loadingModel=ui.modelSnapshot(),stop=ui.elements.navigation.children.find(n=>n.textContent==='Stop waiting');
    assert.ok(stop);assert.ok(ui.timers.size);
    data.text_id='mn3';data.source.commit='0'.repeat(40);ui.output(data);
    sameLoadedView(ui,currentRoots,input,loadingModel);
    assert.equal(ui.elements.navigation.children.find(n=>n.textContent==='Stop waiting'),stop);
    assert.ok(ui.timers.size,'Partial headers must not abandon the pending request');
    ui.click('Stop waiting');assert.match(ui.elements.title.textContent,/cancelled/);
    ui.reply(0,clone(await readPassage({uid:'mn2',offset:1,limit:1,english:false})));
    await new Promise(resolve=>setImmediate(resolve));assert.match(ui.elements.title.textContent,/cancelled/);
    const staleSelector=clone(await readPassage({uid:'mn1',limit:1,english:false})),guarded=hostView(bridge);guarded.output(staleSelector);guarded.ack();
    staleSelector.text_id='tha-ap348';guarded.output(staleSelector);
    assert.match(guarded.elements.title.textContent,/Could not open/);
    assert.match(guarded.elements.status.textContent,/citation mapping revision changed/);
    assert.equal(rootNodes(guarded).length,0,'The header frame cannot override canonical locator refusal');
  });
}
