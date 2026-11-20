import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import {readBook} from '../src/source-books.mjs';
import {textSegments} from '../src/variants.mjs';
import {readPassage} from '../src/chatgpt-widget.mjs';
import {localizeText,SCRIPTS} from '../src/script.mjs';
import {sourceNotesForPage,validateSourceNoteRegistry} from '../src/source-notes.mjs';
import {SOURCE_NOTES_PROFILE} from '../src/source-notes-profiles.mjs';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const stable=value=>JSON.stringify(ordered(value));
const approvalBytes=readFileSync(join(root,'docs/evidence/source-notes/SARIPUTTA_SOURCE_SCHEMA_APPROVAL.json'));
assert.equal(sha(approvalBytes),'61121e60049a1a03976d72a6967ebef28dea08bbf9e79349d7a3aa025ec93930');
const approval=JSON.parse(approvalBytes),record=approval.approved_record_object,profile=approval.approved_profile_object;
const registryBytes=()=>readFileSync(join(root,'server/data/source-notes.json'));
const corpus=()=>canon.load().canon;
const selected=()=>canon.resolve('tha-ap3').unit;
const source=()=>canon.readingSource(selected());
const clone=value=>JSON.parse(JSON.stringify(value));
const originalFetch=globalThis.fetch;let unexpectedRequests=0;
before(()=>{globalThis.fetch=async()=>{unexpectedRequests++;throw Error('Source-note tests prohibit upstream requests');};});
after(()=>{globalThis.fetch=originalFetch;assert.equal(unexpectedRequests,0,'all source-note retrieval remains offline');});
const options=(mode='uid',offset=mode==='uid'?235:386,limit=1)=>mode==='uid'?{corpus:corpus(),unitId:'tha-ap3',source:source(),offset,segments:canon.segments(selected()).slice(offset,offset+limit)}:{corpus:corpus(),bookId:'s0510m1',source:canon.source(),offset,segments:readBook({book:'s0510m1',offset,limit}).segments};
function exactEnvelope(value,mode,entries){
 assert.deepEqual(Object.keys(value).sort(),['schema','state','extraction_revision','record_sha256','availability','entries','error_code'].sort());
 assert.equal(value.schema,profile.schema);assert.equal(value.state,'available');assert.equal(value.extraction_revision,profile.extraction_revision);
 assert.equal(value.record_sha256,profile.record_sha256);assert.deepEqual(value.availability,profile.anchors[mode].availability);assert.equal(value.error_code,null);
 assert.deepEqual(value.entries,entries?[record]:[]);
}
async function session(run){
 const [a,b]=InMemoryTransport.createLinkedPair(),client=new Client({name:'original-source-notes',version:'1'}),server=createServer();
 const call=async args=>{const response=await client.callTool({name:'get_text',arguments:args});assert.ok(!response.isError,JSON.stringify(response.content));assert.deepEqual(JSON.parse(response.content[0].text),response.structuredContent);return response.structuredContent;};
 try{await Promise.all([client.connect(a),server.connect(b)]);await run(call);}finally{await client.close();await server.close();}
}

test('independent original-note authority binds exact metadata, registry and distinct existing373 note',()=>{
 assert.equal(approval.source_approval,true);assert.equal(approval.schema_approval,true);assert.equal(approval.runtime_implementation_acceptance,false);
 assert.deepEqual(SOURCE_NOTES_PROFILE,profile);assert.equal(sha(registryBytes()),approval.approved_registry_file_sha256);
 assert.equal(sha(stable(record)),approval.approved_record_sha256);assert.equal(sha(record.text),'e4544e7b41ad8ed3f72d281f9735359c51aac2f8c758588731a1135e4a03fa60');
 assert.equal(record.text,'imā dve gāthāyo syāmapotthake na santi');assert.match(record.label,/Roman Pāli/);
 const book=corpus().books.find(book=>book.file==='s0510m1.mul.xml'),existing=book.blocks[1134][3][0];
 assert.equal(sha(existing),'f0c05b524768e8663aa1c23d2674ec0674870f83fd27fc63e9b3f08e4fab12d9');
 assert.match(existing,/gāthāro/);assert.notEqual(existing,record.text);
 assert.equal(record.physical_location.semantic_stanza_owner_verified,false);assert.equal(record.origin.no_root_body_text,true);
 const registry=validateSourceNoteRegistry(registryBytes(),corpus());assert.equal(Object.isFrozen(registry),true);assert.deepEqual(registry.records,[record]);
});

test('exact originalXML note-only element, both raw neighbors and byte ranges remain independently auditable',{skip:!process.env.VRI_SOURCE_CHECKOUT},()=>{
 const raw=readFileSync(join(resolve(process.env.VRI_SOURCE_CHECKOUT),'romn/s0510m1.mul.xml'));
 assert.equal(sha(raw),record.origin.xml_sha256);
 const interval=record.origin.raw_byte_interval,element=raw.subarray(...interval);
 assert.equal(sha(element),record.origin.raw_element_sha256);
 const xml=element.toString('utf16le');assert.match(xml,/<p rend="gatha1">/);assert.ok(xml.includes('<note>'+record.text+'</note>'));assert.ok(!xml.includes('gāthāro'));
 for(const neighbor of Object.values(record.origin.raw_neighbors))assert.equal(sha(raw.subarray(...neighbor.raw_utf16le_byte_interval)),neighbor.raw_element_sha256);
});

test('builder profile destinations cannot overwrite any input or the registry output/verify target',{skip:!process.env.VRI_SOURCE_CHECKOUT},()=>{
 const temp=mkdtempSync(join(tmpdir(),'pali-source-note-collisions-'));
 try{
  const xml=join(temp,'original.xml'),canonical=join(temp,'canon.json'),manifest=join(temp,'manifest.json'),destination=join(temp,'registry.json');
  copyFileSync(join(resolve(process.env.VRI_SOURCE_CHECKOUT),'romn/s0510m1.mul.xml'),xml);
  writeFileSync(canonical,JSON.stringify(corpus()));copyFileSync(join(root,'scripts/canon/source_note_manifest.json'),manifest);writeFileSync(destination,registryBytes());
  const protectedPaths=[xml,canonical,manifest,destination],before=protectedPaths.map(path=>sha(readFileSync(path)));
  for(const [mode,profileOutput]of [['--output',xml],['--output',canonical],['--output',manifest],['--output',destination],['--verify',destination]]){
   const result=spawnSync('python3',[join(root,'scripts/canon/build_source_notes.py'),'--xml',xml,'--canon',canonical,'--manifest',manifest,mode,destination,'--profile-output',profileOutput],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
   assert.equal(result.error,undefined,'finite Python probe completes without timeout or oversized output');assert.equal(result.signal,null);assert.notEqual(result.status,0);
   assert.match(result.stderr,/An input cannot be overwritten by generated metadata|Registry and generated metadata destinations must differ/);
   assert.equal(result.stdout,'');assert.deepEqual(protectedPaths.map(path=>sha(readFileSync(path))),before,'all copied inputs and existing registry bytes survive refusal');
  }
  writeFileSync(manifest,readFileSync(manifest,'utf8').replace('"schema":','"schema":"vri-source-note-build-v1","schema":'));
  const duplicateBefore=protectedPaths.map(path=>sha(readFileSync(path))),output=join(temp,'duplicate-output.json'),metadata=join(temp,'duplicate-profile.mjs');
  const duplicate=spawnSync('python3',[join(root,'scripts/canon/build_source_notes.py'),'--xml',xml,'--canon',canonical,'--manifest',manifest,'--output',output,'--profile-output',metadata],{encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(duplicate.error,undefined);assert.equal(duplicate.signal,null);assert.notEqual(duplicate.status,0);assert.match(duplicate.stderr,/duplicate.*key/i);
  assert.equal(duplicate.stdout,'');assert.equal(existsSync(output),false);assert.equal(existsSync(metadata),false);
  assert.deepEqual(protectedPaths.map(path=>sha(readFileSync(path))),duplicateBefore,'duplicate-key refusal preserves every supplied input');
 }finally{rmSync(temp,{recursive:true,force:true});}
});

test('UID and complete-book pages disclose one separately owned note only at the actual physical anchor',async()=>{
 for(const mode of ['uid','book']){
  const anchor=profile.anchors[mode].offset;
  for(const [offset,limit]of [[0,1],[anchor-1,1],[anchor,1],[anchor+1,1],[anchor-1,3],[100000,1]]){
   const input=options(mode,offset,limit),before=stable(input.segments);const value=await sourceNotesForPage(input);
   exactEnvelope(value,mode,input.segments.some(s=>s.ref===profile.anchors[mode].segment.ref));
   assert.equal(stable(input.segments),before,'sidecar never changes an existing segment');
  }
 }
 assert.equal(await sourceNotesForPage({...options(),unitId:'tha-ap4'}),undefined);
 assert.equal(await sourceNotesForPage({...options('book'),bookId:'s0511m'}),undefined);
});

test('get_text retains Roman apparatus through variant modes and every supported display script',async()=>session(async call=>{
 for(const [mode,selector,offset]of [['uid',{uid:'tha-ap3'},234],['book',{book:'s0510m1'},385]]){
  for(const variants of ['none','raw','structured']){
   const roman=await call({...selector,offset,limit:3,variants});exactEnvelope(roman.source_notes,mode,true);
   for(const script of SCRIPTS){
    const page=await call({...selector,offset,limit:3,variants,script});
    assert.deepEqual(page.source_notes,roman.source_notes,'original edition note remains Roman');
    assert.deepEqual(page.segments,localizeText({segments:roman.segments},script).segments);
    assert.deepEqual(page.source,roman.source);
   }
  }
  const legacy=await call({...selector,offset,limit:3,includeVariants:true});const raw=await call({...selector,offset,limit:3,variants:'raw'});
  assert.deepEqual(legacy.segments,raw.segments);assert.deepEqual(legacy.source_notes,raw.source_notes);
 }
}));

test('widget exact anchors, neighboring exact reads and overlapping context keep original source-note boundaries',async()=>{
 for(const [mode,selector]of [['uid',{uid:'tha-ap3'}],['book',{book:'s0510m1'}]]){
  const anchor=profile.anchors[mode],exact=await readPassage({...selector,segment:anchor.segment.ref,english:false});
  exactEnvelope(exact.source_notes,mode,true);assert.deepEqual(exact.pali.segments,[anchor.segment]);
  const fingerprint=sha(JSON.stringify(anchor.segment));assert.equal(exact.pali.read_with.arguments.anchor_sha256,fingerprint);
  const context=await readPassage({...exact.pali.context_with.arguments});exactEnvelope(context.source_notes,mode,true);
  assert.equal(context.source_notes.entries.length,1);assert.equal(context.context_for,anchor.segment.ref);
  const next=anchor.segment.ref.replace(/\/(\d+)$/,(_,n)=>'/'+(Number(n)+1));
  exactEnvelope((await readPassage({...selector,segment:next,english:false})).source_notes,mode,false);
  exactEnvelope((await readPassage({...selector,segment:next,context:1,english:false})).source_notes,mode,true);
 }
});

test('recovered note never enters canonical root, existing variants or root search wording',()=>{
 const unit=selected(),all=canon.segments(unit,{includeNotes:true}),existing=corpus().books[unit.book].blocks[1134][3][0];
 assert.equal(all.flatMap(segment=>segment.variant_readings||[]).filter(text=>text===existing).length,1);
 assert.equal(all.flatMap(segment=>segment.variant_readings||[]).filter(text=>text===record.text).length,0);
 for(const mode of ['none','raw','structured']){
  const segments=textSegments(unit,{variants:mode}).segments;
  assert.ok(!JSON.stringify(segments).includes(record.text));assert.equal(segments[235].text,'');
 }
 const search=canon.search('\"'+record.text+'\"',{collection:'tha-ap3',limit:20});assert.deepEqual(search.results,[]);assert.equal(search.total_texts_matched,0);
});

test('same-count mutated registry, forged hashes, duplicate keys and owner/neighbor changes refuse',()=>{
 const original=JSON.parse(registryBytes());
 const mutations=[
  registry=>registry.records[0].text=registry.records[0].text.replace('gāthāyo','gāthāro'),
  registry=>registry.records[0].text+='x',
  registry=>registry.records[0].text_sha256=sha('forged'),
  registry=>registry.records[0].origin.file='s0511m.mul.xml',
  registry=>registry.records[0].origin.physical_element_zero_based++,
  registry=>registry.records[0].origin.raw_byte_interval[0]++,
  registry=>registry.records[0].origin.raw_neighbors.previous.raw_element_sha256='0'.repeat(64),
  registry=>registry.records[0].provenance.commit='0'.repeat(40),
  registry=>registry.records[0].physical_location.unit_id='tha-ap4',
  registry=>registry.records[0].physical_location.uid_anchor.offset++,
  registry=>registry.records[0].unapproved=true,
  registry=>registry.records.push(clone(registry.records[0])),
  registry=>registry.records=[],
  registry=>registry.extraction_revision='future-unapproved',
 ];
 for(const mutate of mutations){const value=clone(original);mutate(value);assert.throws(()=>validateSourceNoteRegistry(Buffer.from(JSON.stringify(value)),corpus()));}
 const text=registryBytes().toString();assert.throws(()=>validateSourceNoteRegistry(Buffer.from(text.replace('"schema":','"schema":"duplicate","schema":')),corpus()));
 assert.throws(()=>validateSourceNoteRegistry(Buffer.from('{bad'),corpus()));
 const forged=clone(original);forged.records[0].text+='x';forged.records[0].text_sha256=sha(forged.records[0].text);assert.throws(()=>validateSourceNoteRegistry(Buffer.from(stable(forged)),corpus()));
});

test('wrong canonical neighbor/body/source suppresses only the sidecar and leaves authentic root readable',async()=>{
 const input=options(),before=stable(canon.segments(selected()));
 for(const change of [
  value=>value.source.commit='0'.repeat(40),
  value=>value.segments[0].text='unapproved root',
  value=>value.segments[0].vri_paragraph='373',
  value=>value.segments.push(clone(value.segments[0])),
 ]){
  const value={...input,source:clone(input.source),segments:clone(input.segments)};change(value);
  const out=await sourceNotesForPage(value);assert.equal(out.state,'unavailable');assert.equal(out.error_code,'SOURCE_NOTE_UNAVAILABLE');assert.deepEqual(out.entries,[]);
 }
 const altered={...corpus(),books:[...corpus().books]};const index=selected().book;
 altered.books[index]={...corpus().books[index],blocks:clone(corpus().books[index].blocks)};altered.books[index].blocks[1129][2]+='x';
 assert.throws(()=>validateSourceNoteRegistry(registryBytes(),altered));
 assert.equal((await sourceNotesForPage({...input,corpus:altered})).state,'unavailable');
 assert.equal(stable(canon.segments(selected())),before);
});

test('lazy missing/malformed registry is an apparatus-only failure with no startup or root mutation',async()=>{
 const baseline=stable(canon.segments(selected())),temp=mkdtempSync(join(tmpdir(),'pali-source-note-failure-'));
 try{
  for(const [index,bytes]of [undefined,Buffer.from('{bad'),Buffer.from('{}'),registryBytes()].entries()){
   const base=join(temp,String(index));for(const dir of ['src','web','server/data'])mkdirSync(join(base,dir),{recursive:true});
   for(const path of ['src/source-notes.mjs','src/source-notes-profiles.mjs','web/source-notes-policy.mjs'])copyFileSync(join(root,path),join(base,path));
   if(bytes)writeFileSync(join(base,'server/data/source-notes.json'),bytes);
   const module=await import(pathToFileURL(join(base,'src/source-notes.mjs')).href);
   const page=await module.sourceNotesForPage(options());
   if(index===3)exactEnvelope(page,'uid',true);else{assert.equal(page.state,'unavailable');assert.equal(page.error_code,'SOURCE_NOTE_UNAVAILABLE');assert.deepEqual(page.entries,[]);assert.equal(page.availability.total,1);}
   assert.equal(await module.sourceNotesForPage({...options(),unitId:'tha-ap4'}),undefined);
   if(index===0){writeFileSync(join(base,'server/data/source-notes.json'),registryBytes());exactEnvelope(await module.sourceNotesForPage(options()),'uid',true);}
   assert.equal(stable(canon.segments(selected())),baseline);
  }
 }finally{rmSync(temp,{recursive:true,force:true});}
});
