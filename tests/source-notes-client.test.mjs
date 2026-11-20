import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {runInNewContext} from 'node:vm';
import {TextEncoder} from 'node:util';
import {createServer} from '../src/server.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {contentSha256} from '../web/content-sha256.mjs';
import {createSourceNotesPolicy} from '../web/source-notes-policy.mjs';

const sha=value=>createHash('sha256').update(value).digest('hex');
const bytes=readFileSync(new URL('../docs/evidence/source-notes/SARIPUTTA_SOURCE_SCHEMA_APPROVAL.json',import.meta.url));
assert.equal(sha(bytes),'61121e60049a1a03976d72a6967ebef28dea08bbf9e79349d7a3aa025ec93930');
const approval=JSON.parse(bytes),profile=approval.approved_profile_object,record=approval.approved_record_object;
const clone=value=>JSON.parse(JSON.stringify(value));
const originalFetch=globalThis.fetch;let unexpectedRequests=0;
before(()=>{globalThis.fetch=async()=>{unexpectedRequests++;throw Error('Source-note tests prohibit upstream requests');};});
after(()=>{globalThis.fetch=originalFetch;assert.equal(unexpectedRequests,0,'all source-note retrieval remains offline');});
const policy=()=>createSourceNotesPolicy(contentSha256,profile);
const widget=async(mode='uid',offset=mode==='uid'?235:386)=>readPassage({...(mode==='uid'?{uid:'tha-ap3'}:{book:'s0510m1'}),offset,limit:1,english:false});
function valid(view,mode,withEntry,opening=false){
 assert.equal(view.state,'available');assert.equal(view.affected,true);assert.equal(view.opening,opening);
 assert.equal(view.anchor_ref,profile.anchors[mode].segment.ref);assert.deepEqual(view.availability,profile.anchors[mode].availability);
 assert.deepEqual(view.entry,withEntry?record:null);assert.equal(view.warning,null);assert.equal(typeof view.signature,'string');
}
function unavailable(view,affected=true){assert.equal(view.state,'unavailable');assert.equal(view.affected,affected);assert.equal(view.entry,null);assert.equal(view.availability,null);assert.match(view.warning,/Pāli remains available/);}
async function native(run){
 const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'source-note-client-policy',version:'1'}),server=createServer();
 try{await Promise.all([client.connect(a),server.connect(b)]);await run(async args=>{const response=await client.callTool({name:'get_text',arguments:args});assert.ok(!response.isError,JSON.stringify(response.content));return response.structuredContent;});}
 finally{await client.close();await server.close();}
}

test('authentic native and widget UID/book anchors, openings and neighbors pass before any mutation controls',async()=>{
 const previous=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;throw Error('No note-driven network request');};
 try{
  await native(async call=>{
   for(const [mode,selector,anchor]of [['uid',{uid:'tha-ap3'},235],['book',{book:'s0510m1'},386]]){
    for(const [offset,entry]of [[0,false],[anchor-1,false],[anchor,true],[anchor+1,false]]){
     const page=await call({...selector,offset,limit:1});valid(policy().inspect(page),mode,entry,offset===0);
     const hosted=await widget(mode,offset);valid(policy().inspect(hosted),mode,entry,offset===0);
    }
   }
  });assert.equal(requests,0);
 }finally{globalThis.fetch=previous;}
});

test('missing, typed-unavailable or contradictory envelope suppresses only apparatus on authentic root',async()=>{
 const original=await widget(),root=clone(original.pali),source=clone(original.source),inspect=policy();
 const mutations=[
  page=>delete page.source_notes,
  page=>page.source_notes=null,
  page=>{page.source_notes.state='unavailable';page.source_notes.error_code='SOURCE_NOTE_UNAVAILABLE';page.source_notes.entries=[];},
  page=>page.source_notes.state='unavailable',
  page=>page.source_notes.error_code='SOURCE_NOTE_UNAVAILABLE',
  page=>page.source_notes.state='unknown',
  page=>page.source_notes.entries=[],
  page=>page.source_notes.entries.push(clone(page.source_notes.entries[0])),
  page=>page.source_notes.unapproved=true,
 ];
 for(const mutate of mutations){const page=clone(original);mutate(page);unavailable(inspect.inspect(page));assert.deepEqual(page.pali,root);assert.deepEqual(page.source,source);}
});

test('same object is rehashed for each host event and changing then restoring content cannot reuse prior trust',async()=>{
 const page=clone(await widget());let hashes=0;const inspect=createSourceNotesPolicy(text=>{hashes++;return contentSha256(text);},profile);
 const before=clone(page);const first=inspect.inspect(page);valid(first,'uid',true);const firstHashes=hashes;
 valid(inspect.inspect(page),'uid',true);assert.ok(hashes>firstHashes,'same object is revalidated, not identity-cached');
 page.source_notes.entries[0].text=page.source_notes.entries[0].text.replace('gāthāyo','gāthāro');unavailable(inspect.inspect(page));
 assert.equal(first.entry.text,record.text,'returned view is an independent validated snapshot');
 page.source_notes=clone(before.source_notes);valid(inspect.inspect(page),'uid',true);
 delete page.source_notes;unavailable(inspect.inspect(page));
 page.source_notes=clone(before.source_notes);valid(inspect.inspect(page),'uid',true);
 page.pali.segments[0].text='changed anchor';unavailable(inspect.inspect(page));
});

test('record text, full nested source identity, physical ownership and forged pins cannot authorize a note',async()=>{
 const original=await widget();const mutations=[
  page=>page.source_notes.entries[0].text=record.text.replace('ā','a'),
  page=>page.source_notes.entries[0].text_sha256=sha('foreign'),
  page=>{const note=page.source_notes.entries[0];note.text='<img onerror=alert(1)>';note.text_sha256=sha(note.text);page.source_notes.record_sha256=sha(JSON.stringify(note));},
  page=>page.source_notes.entries[0].id='vri:s0510m1:note-only:1131',
  page=>page.source_notes.entries[0].origin.physical_element_zero_based++,
  page=>page.source_notes.entries[0].origin.raw_neighbors.following.raw_element_sha256='0'.repeat(64),
  page=>page.source_notes.entries[0].provenance.commit='0'.repeat(40),
  page=>page.source_notes.entries[0].physical_location.semantic_stanza_owner_verified=true,
  page=>page.source_notes.entries[0].physical_location.unit_id='tha-ap4',
  page=>page.source_notes.entries[0].physical_location.distinct_existing_373_note.text_sha256=record.text_sha256,
  page=>page.source_notes.entries[0].qualification='unreviewed interpretation',
  page=>page.source_notes.entries[0].unapproved=true,
  page=>page.source_notes.record_sha256='0'.repeat(64),
  page=>page.source_notes.extraction_revision='unreviewed-future',
  page=>page.source.commit='0'.repeat(40),
  page=>page.source.locator_revision='unreviewed-locator',
 ];
 for(const mutate of mutations){const page=clone(original);mutate(page);unavailable(policy().inspect(page));}
});

test('actual anchor location, strict shape, selection identity and commands are required; no neighboring reassignment',async()=>{
 const original=await widget();const mutations=[
  page=>page.pali.segments[0].text='nonempty',
  page=>page.pali.segments[0].type='prose',
  page=>page.pali.segments[0].vri_paragraph='373',
  page=>page.pali.segments[0].ref='tha-ap3/237',
  page=>page.pali.segments[0].source_blocks=[1129,1130],
  page=>page.pali.segments.push(clone(page.pali.segments[0])),
  page=>page.pali.returned=0,
  page=>page.pali.offset++,
  page=>page.source_notes.availability.read_with.offset++,
  page=>page.source_notes.availability.widget_read_with.arguments.english=true,
  page=>page.source_notes.availability.physical_location_only=false,
  page=>page.book_id='s0510m1',
 ];
 for(const mutate of mutations){const page=clone(original);mutate(page);unavailable(policy().inspect(page));}
 const context=clone(await readPassage({uid:'tha-ap3',segment:'tha-ap3/236',context:1,english:false}));
 [context.pali.segments[0],context.pali.segments[1]]=[context.pali.segments[1],context.pali.segments[0]];unavailable(policy().inspect(context));
 const neighbor=await widget('uid',236);neighbor.source_notes.entries=[clone(record)];unavailable(policy().inspect(neighbor));
 const foreign=clone(original);foreign.text_id='tha-ap4';unavailable(policy().inspect(foreign),false);
 delete foreign.source_notes;const absent=policy().inspect(foreign);assert.equal(absent.state,'absent');assert.equal(absent.entry,null);assert.equal(absent.warning,null);
 const book=await widget('book');book.source_notes.availability=clone(profile.anchors.uid.availability);unavailable(policy().inspect(book));
});

test('unsupported structures fail closed and metadata mutations after construction do not change authority',async()=>{
 const metadata=clone(profile),inspect=createSourceNotesPolicy(contentSha256,metadata),original=await widget();
 metadata.record_sha256='0'.repeat(64);metadata.anchors.uid.availability.read_with.uid='tha-ap4';valid(inspect.inspect(original),'uid',true);
 const cyclic=clone(original);cyclic.source_notes.entries[0].origin.loop=cyclic.source_notes;unavailable(inspect.inspect(cyclic));
 const huge=clone(original);huge.source_notes.entries[0].text='x'.repeat(20000);unavailable(inspect.inspect(huge));
 const absent=inspect.inspect(undefined);assert.equal(absent.state,'absent');assert.equal(absent.affected,false);
 assert.throws(()=>inspect.stable({value:BigInt(1)}));assert.throws(()=>inspect.stable({value:()=>{}}));
});

test('self-contained serialized policy runs without imported closures and validates actual source data',async()=>{
 const factory=runInNewContext('('+createSourceNotesPolicy.toString()+')',{TextEncoder});
 const inspect=factory(contentSha256,profile),page=clone(await widget());
 assert.deepEqual(JSON.parse(JSON.stringify(inspect.inspect(page))),policy().inspect(page));
 page.source_notes.entries[0].text+='x';unavailable(inspect.inspect(page));
 assert.equal(inspect.stable({z:[true,'ā'],a:1}),'{"a":1,"z":[true,"ā"]}');
});
