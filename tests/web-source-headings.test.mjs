import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import {bookSearchSelection,bookSearchRoute,validateBookSearchPage,bookSearchHitLinks} from '../web/book-search.mjs';
import {sourceRevision,assertPositionPin,isReadingLocator} from '../web/reading-position.mjs';
import {assertPagePin} from '../web/reading-navigation.mjs';
import {transliterate} from '../src/script.mjs';
let client;const clone=x=>JSON.parse(JSON.stringify(x));
before(async()=>{const[a,b]=InMemoryTransport.createLinkedPair();client=new Client({name:'web-heading-test',version:'1'});await Promise.all([createServer().connect(b),client.connect(a)]);});
after(async()=>{await client?.close();});
async function tool(name,args){const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));return r.structuredContent;}
const sel=(query='',offset=0,source=null)=>bookSearchSelection(new URLSearchParams({book:'vin02m1',mode:'headings',q:query,offset,...(source===null?{}:{source})}));
const fetchPage=(s,script='roman')=>tool('search_source_book',{book:s.book,query:s.query,offset:s.offset,limit:15,headings_only:true,script});
const params=href=>new URLSearchParams(href.split('?')[1]);

test('heading routes allow blank paginated browsing only through an explicit bounded mode',()=>{
 const s=sel('',15);assert.equal(s.headings_only,true);assert.equal(s.offset,15);assert.equal(s.query,'');assert.equal(isReadingLocator(bookSearchRoute(s)),false);
 assert.deepEqual(bookSearchSelection(params(bookSearchRoute(s))),s);
 const normal=bookSearchSelection(new URLSearchParams({book:'vin02m1',q:'namo'}));assert.equal(Object.hasOwn(normal,'headings_only'),false);assert.equal(bookSearchRoute(normal),'#book-search?book=vin02m1&q=namo');
 for(const raw of ['book=vin02m1&mode=unknown','book=vin02m1&mode=','book=vin02m1&mode=headings&mode=headings','book=vin02m1&headings_only=true','book=vin02m1&offset=15','book=vin02m1&mode=headings&offset=-1','book=vin02m1&mode=headings&offset=01','book=vin02m1&mode=headings&uid=mn10','book=vin02m1&mode=headings&q=%00'])assert.throws(()=>bookSearchSelection(new URLSearchParams(raw)),raw);
 for(const raw of ['book=vin02m1&mode=headings&q=%ZZ','book=vin02m1&mode=headings&q=%C3%28'])assert.throws(()=>bookSearchSelection(new URLSearchParams(raw),raw));
});

test('literal heading pages retain actual source order and pinned reading/context positions',async()=>{
 const s=sel(),raw=await fetchPage(s),d=validateBookSearchPage(raw,s);assert.equal(d.total_headings,480);assert.equal(d.total_matched,480);assert.equal(d.results.length,15);assert.equal(d.next_offset,15);
 assert.ok(d.results.every(row=>row.type==='heading'));const next=sel('',15,sourceRevision(d)),n=validateBookSearchPage(await fetchPage(next),next);assert.ok(n.results[0].segment>d.results.at(-1).segment);
 const one=sel('senāvāsasikkhāpadaṃ'),exact=validateBookSearchPage(await fetchPage(one),one);assert.equal(exact.results.length,1);const hit=exact.results[0];assert.equal(hit.ref,'vri-book:vin02m1/1006');assert.equal(hit.excerpt,'9. Senāvāsasikkhāpadaṃ');
 const links=bookSearchHitLinks(exact,hit,one),p=params(links.read);assert.equal(p.get('offset'),'1005');assert.equal(p.get('ref'),hit.ref);assert.equal(p.get('source'),sourceRevision(d));
 const read=await tool('get_text',{book:'vin02m1',offset:1005,limit:1,script:'roman'});assert.equal(read.segments[0].text,hit.excerpt);assertPositionPin(p,read);
 const cp=params(links.context),context=await tool('get_text',{book:'vin02m1',offset:Number(cp.get('offset')),limit:3});assertPagePin(cp,context);assert.ok(context.segments.some(row=>row.ref===hit.ref));
});

test('headings mode cannot silently accept an ignored filter, prose, invalid counts or altered selection',async()=>{
 const s=sel(),raw=await fetchPage(s),bad=[];
 for(const patch of [{headings_only:false},{headings_only:undefined},{total_headings:1},{total_headings:481},{total_headings:raw.total_segments+1},{heading_note:''},{query:'invented query'},{total_matched:479},{next_offset:0}])bad.push({...clone(raw),...patch});
 for(const patch of [{type:'prose'},{ref:'vri-book:vin02m1/999'},{read_with:{tool:'get_text',uid:'mn10',offset:0,limit:1}},{book_id:'abh01m'}]){const b=clone(raw);b.results[0]={...b.results[0],...patch};bad.push(b);}
 {const b=clone(raw);b.results[1]=clone(b.results[0]);bad.push(b);}
 for(const data of bad)assert.throws(()=>validateBookSearchPage(data,s));
 const normal=bookSearchSelection(new URLSearchParams({book:'vin02m1',q:'namo'})),ordinary=await tool('search_source_book',{book:'vin02m1',query:'namo',limit:15});assert.throws(()=>validateBookSearchPage(ordinary,sel('namo')));assert.throws(()=>validateBookSearchPage({...ordinary,headings_only:true,total_headings:480,heading_note:raw.heading_note},normal));
});

test('source drift refuses a heading list and both emitted reading paths before substitution',async()=>{
 const s=sel(),d=await fetchPage(s);assert.throws(()=>validateBookSearchPage(d,sel('',0,'old-heading-source')),/changed/);
 const p=validateBookSearchPage(d,s),links=bookSearchHitLinks(p,p.results[0],s);const read=await tool('get_text',{book:'vin02m1',offset:0,limit:3});const changed={...read,source:{...read.source,locator_revision:'changed-heading-source'}};
 assert.throws(()=>assertPositionPin(params(links.read),changed),/changed/);assert.throws(()=>assertPagePin(params(links.context),changed),/changed/);
});

test('native output and existing Unicode-equivalent filters retain literal labels and source identity',async()=>{
 const s=sel(),native=validateBookSearchPage(await fetchPage(s,'sinhala'),s);assert.equal(native.script,'sinhala');assert.ok(native.results[0].excerpt.match(/[\u0d80-\u0dff]/));assert.equal(native.query,'');assert.equal(native.input_normalised,undefined);
 for(const query of ['namo','saṁ','sam\u0323','senāvāsasikkhāpadaṃ',transliterate('senāvāsasikkhāpadaṃ','roman','sinhala')]){const q=sel(query),raw=await fetchPage(q);const d=validateBookSearchPage(raw,q);assert.equal(d.headings_only,true);assert.ok(d.results.every(row=>row.type==='heading'));}
});
