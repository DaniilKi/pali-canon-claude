// Current380 app/API inputs remain actual R; historical375 and H368 remain separately named. Named H metadata below is source-derived, never an API projection.
import {intake380Authority} from './helpers/intake380-metadata.mjs';
import {requireProfiles382 as requireProfiles380,requireMetadata382 as requireMetadata380} from './helpers/intake382-metadata.mjs';
import {assertCurrent382SourceClosure as assertCurrent389390SourceClosure} from './helpers/intake382-metadata.mjs';
assertCurrent389390SourceClosure(new URL('../',import.meta.url));
const current380Source=intake380Authority();
assert.equal(current380Source.historical375.ids.length,375);assert.deepEqual(current380Source.ids.slice(0,375),current380Source.historical375.ids);
const HistoricalH368Profiles=current380Source.historical368.profiles;
const HistoricalH368Catalogue={version:1,source:current380Source.historical368.manifest_source,vri_commit:current380Source.manifest.vri_commit,held:current380Source.historical368.manifest_held,links:current380Source.historical368.links};
requireProfiles380(APADANA_PROFILES);
import {CURRENT_WIDGET_VERSION} from './helpers/intake382-metadata.mjs';
import {currentHeldPublishers} from './helpers/intake343-metadata.mjs';
/** Source-positive comparisons use presealed metadata, not implementation output as expected data. */
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js';
import {createServer} from '../src/server.mjs';
import * as canon from '../src/canon.mjs';
import * as english from '../src/english.mjs';
import {APADANA_PROFILES,APADANA_COMMIT} from '../src/apadana-profiles.mjs';
import {parseApadana,quotationText} from '../src/apadana.mjs';
import {readPassage,registerChatgptWidget,WIDGET_TOOL,WIDGET_VERSION} from '../src/chatgpt-widget.mjs';
import {liveCache} from '../src/cache.mjs';
import {validateApadanaChoice,validateEnglishPage} from '../web/translation-policy.mjs';
import {validateComparisonPage} from '../web/translation-comparison.mjs';
import {bookmarkLocation} from '../web/bookmark-location.mjs';
import {apadanaEditionNavigation} from '../web/apadana-edition-navigation.mjs';
import {passageNoteKey} from '../web/passage-notes.mjs';
import {stageNoteDraftEntry,serializeNoteDraftJournal,parseNoteDraftJournal,reconcileNoteDraftJournal,removeNoteDraftEntry,guardedNoteDraftJournalWrite} from '../web/note-draft-recovery.mjs';
import {view} from './helpers/widget-view.mjs';
import {thera321329Evidence,digest,REV,VRI} from './helpers/thera321-329-evidence.mjs';

const e=thera321329Evidence(),originalFetch=globalThis.fetch,clone=value=>JSON.parse(JSON.stringify(value));
const tid=p=>canon.translationId(p),PRIVATE='SYNTHETIC_PRIVATE_321_329';
afterEach(()=>{globalThis.fetch=originalFetch;liveCache.clear();});
function transport(calls) {
  liveCache.clear();globalThis.fetch=async(input,init={})=>{
    const url=typeof input==='string'?input:input.href,id=e.ids.find(id=>e.profiles[id].raw_url===url);
    assert.ok(id,'Only exact six approved fixture URLs reach transport');assert.ok(!url.includes(PRIVATE)&&!JSON.stringify(init).includes(PRIVATE));calls.push(id);return new Response(e.artifact(id));
  };
}
async function withMCP(run) {
  const server=createServer();registerChatgptWidget(server);
  const client=new Client({name:'independent-eight312-319-regression',version:'1'}),[a,b]=InMemoryTransport.createLinkedPair();
  try {
    await Promise.all([server.connect(b),client.connect(a)]);
    return await run(async(name,args,{refused=false}={})=>{
      const result=await client.callTool({name,arguments:args});
      if(refused){assert.equal(result.isError,true,name+' must refuse');return result;}
      assert.equal(result.isError??false,false,name+' must succeed');return result.structuredContent;
    });
  } finally {await client.close();await server.close();}
}
async function actual(id) {
  const profile=APADANA_PROFILES[id],unit=canon.resolve(id).unit,args={uid:id,translation:tid(profile),translation_revision:REV,limit:500};
  const parsed=parseApadana(e.artifact(id),profile);e.assertNormalized(id,parsed);
  const context={uid:id,choices:english.available(unit),accepted:null},first=await english.translation(unit,args.translation,args);
  const widget=await readPassage({uid:id,translation:args.translation,englishCharacters:500,limit:2});assert.ok(widget.english,'Authentic English available');
  return {profile,unit,args,parsed,context,first,widget};
}
function shown(host,value,pali,id) {
  assert.ok(host.elements.english.textContent.includes(value.text),id+' genuine source page visible');
  for(const note of value.translator_notes) assert.ok(host.elements.english.textContent.includes(note.text),id+' full owned note visible');
  for(const notice of APADANA_PROFILES[id].mapping_notes) assert.ok(host.elements.english.textContent.includes(notice),id+' full edition caveat visible');
  assert.ok(host.elements.pali.textContent.includes(pali),id+' Pāli retained');assert.ok(!host.elements.english.textContent.includes('.mp3'));
}
function refuse(host,widget,bad,first,pali,id) {
  host.output({...clone(widget),english:bad});
  assert.ok(/No English|No translation/.test(host.elements.english.textContent),id+' corrupt English refused');
  assert.ok(!host.elements.english.textContent.includes(first.text));assert.ok(host.elements.pali.textContent.includes(pali));
}

// 1. Metadata-only capability and no-auto-fetch behavior remains meaningful without a raw fixture.
test('current359 clients retain the reviewed339 cohort and40+319 identities with no automatic English or remaining held-source transport',async()=>{
  e.assertProfiles(HistoricalH368Profiles);assert.equal(APADANA_COMMIT,REV);assert.equal(WIDGET_VERSION,CURRENT_WIDGET_VERSION);
  assert.equal(Object.keys(APADANA_PROFILES).filter(id=>id.startsWith('thi-ap')).length,40);
  assert.equal(Object.keys(HistoricalH368Profiles).filter(id=>id.startsWith('tha-ap')).length,328);
  const currentTheraCount=Object.keys(current380Source.profiles).filter(id=>id.startsWith('tha-ap')).length;
  assert.equal(Object.keys(current380Source.historical375.profiles).filter(id=>id.startsWith('tha-ap')).length,335);assert.equal(currentTheraCount,340);
  assert.equal(Object.keys(APADANA_PROFILES).filter(id=>id.startsWith('tha-ap')).length,currentTheraCount);
  let calls=0;globalThis.fetch=async()=>{calls++;throw Error('Metadata or held request attempted provider transport');};
  await withMCP(async call=>{
    for(const id of e.ids) {
      const p=APADANA_PROFILES[id],data=await call('get_text',{uid:id,limit:2}),choice=data.english_available.find(row=>row.translation_id===tid(p));
      assert.ok(choice);validateApadanaChoice(choice,id);assert.deepEqual(p,e.profiles[id]);
      const navigation=apadanaEditionNavigation(data),observed=navigation.groups.flatMap(group=>group.poems);
      const ordered=Object.values(APADANA_PROFILES).filter(p=>p.id.startsWith('tha-ap')).sort((a,b)=>a.poem-b.poem);
      assert.deepEqual(observed.map(row=>({uid:row.uid,label:row.label})),ordered.map(p=>({uid:p.id,label:'Publisher poem '+p.poem+' · '+p.title+' · '+p.id})));
      assert.equal(observed.length,currentTheraCount);assert.equal(navigation.revision,REV);assert.equal(navigation.summary,null); // No new chapter32 summary.
      assert.equal(choice.translation_id,tid(p));assert.equal(choice.translation_revision,REV);assert.equal(choice.url,p.url);assert.equal(choice.note_count,p.note_count);assert.deepEqual(choice.note_numbers,p.note_numbers);
      for(const field of ['audio','media','reciter']) assert.equal(Object.hasOwn(choice,field),false);
      const widget=await call(WIDGET_TOOL,{uid:id,english:false,limit:2});assert.equal(widget.english,null);assert.ok(widget.pali.segments.length);assert.equal(widget.source.commit,VRI);
    }
    for(const poem of currentHeldPublishers(e.heldPublishers).filter(poem=>[322,327,328,330,331].includes(poem))) {
      const id='tha-ap'+(poem+2);assert.equal(APADANA_PROFILES[id],undefined);
      await call('get_translation',{uid:id,translation:`ap:chapter-3/poem-${poem}`,limit:500},{refused:true});
      assert.throws(()=>validateApadanaChoice({...e.profiles[e.ids[0]],translation_id:`ap:chapter-3/poem-${poem}`},id));
    }
  });
  assert.equal(calls,0);
});

// 2. One coherent complete-source/API/render parity case; derived paging is not a copied historical count.
test('all6 genuine bodies56paragraphs28notes and source-derived500character pages pass actual MCP/native validators and both widget bridges',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);let paragraphs=0,notes=0,totalPages=0,quotes=0;
  await withMCP(async call=>{
    for(const id of e.ids) {
      const selected=await actual(id),{profile,parsed,context}=selected,b=e.independent(id),hosts=['MCP Apps','Apps SDK'].map(bridge=>view(bridge));
      notes+=parsed.translator_notes.length;paragraphs+=parsed.text.split('\n\n').length;
      let args=selected.args,body='',pages=0,widgetArgs={uid:id,translation:tid(profile),englishCharacters:500,limit:2};
      while(args) {
        const value=await call('get_translation',args),widget=await readPassage(widgetArgs),offset=args.offset||0;pages++;
        // The registered MCP widget exposes6000-character pages; its schema intentionally omits the internal englishCharacters knob.
        // Verify that public whole-body path independently; use the real internal renderer at500 for per-page bridge parity.
        if(pages===1){
          const publicWidget=await call(WIDGET_TOOL,{uid:id,translation:tid(profile),limit:2});
          assert.equal(digest(publicWidget.english.text),b.expected_profile_fields_except_mapping_notes.body_sha256);
          assert.equal(digest(JSON.stringify(publicWidget.english.translator_notes)),profile.notes_sha256);
          assert.equal(publicWidget.english.translation_id,tid(profile));assert.equal(publicWidget.english.translation_revision,REV);
          assert.equal(publicWidget.english.continue_with,null);
          for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(publicWidget);shown(host,publicWidget.english,publicWidget.pali.segments[0].text,id);assert.ok(host.elements.footer.textContent.includes(publicWidget.english.attribution)&&host.elements.footer.textContent.includes(publicWidget.english.license));}
        }
        assert.equal(value.text_id,id);assert.equal(value.translation_id,tid(profile));assert.equal(value.translation_revision,REV);
        const pageGolden=e.pages[id].pages500[pages-1];assert.equal(pageGolden.offset,offset);assert.equal(value.text.length,pageGolden.characters_utf16);assert.equal(digest(value.text),pageGolden.text_sha256);assert.equal(value.prefix_sha256,pages===1?digest(''):e.pages[id].pages500[pages-2].prefix_sha256);
        assert.equal(value.offset,offset);assert.equal(value.total_characters,e.bodyLength(id));assert.equal(value.prefix_sha256,digest(parsed.text.slice(0,offset)));
        assert.equal(value.next_offset,offset+500<e.bodyLength(id)?offset+500:null);
        assert.equal(value.fetched_url,profile.raw_url);assert.equal(value.url,profile.url);assert.equal(value.license,'CC BY-NC-SA 4.0');
        assert.equal(value.license_url,'https://creativecommons.org/licenses/by-nc-sa/4.0/');assert.equal(value.translator,profile.translator);assert.ok(typeof value.changes==='string'&&value.changes.length>0);
        assert.ok(value.attribution.includes('Jonathan S. Walters and Whitman College'));
        assert.deepEqual(value.mapping_notes,profile.mapping_notes);assert.equal(digest(JSON.stringify(value.translator_notes)),profile.notes_sha256);
        assert.equal(digest(JSON.stringify(widget.english.translator_notes)),profile.notes_sha256);
        assert.equal(digest(value.publisher_paratext),profile.paratext_sha256);assert.equal(digest(widget.english.publisher_paratext),profile.paratext_sha256);assert.equal(digest(widget.english.text),digest(value.text));
        for(const field of ['publisher_preface','chapter_summary','collection_summary','publisher_divisions','editorial_gap','audio','media','reciter']) assert.equal(Object.hasOwn(value,field),false);
        const next=validateEnglishPage(value,args,context);assert.deepEqual(validateComparisonPage(value,args,context),next);
        for(const host of hosts){host.output(widget);shown(host,value,widget.pali.segments[0].text,id);}
        body+=value.text;
        if(next){assert.equal(next.offset,body.length);assert.equal(next.prefix_sha256,digest(body));assert.equal(next.prefix_sha256,pageGolden.prefix_sha256);assert.equal(widget.english.continue_with.arguments.english_offset,next.offset);widgetArgs={...widget.english.continue_with.arguments,englishCharacters:500};}
        else assert.equal(widget.english.continue_with,null);
        args=next;
      }
      assert.equal(pages,Math.ceil(b.body_characters_utf16/500));assert.equal(digest(body),b.expected_profile_fields_except_mapping_notes.body_sha256);totalPages+=pages;
      const query=quotationText({...parsed,translation_id:tid(profile)}).split('\n\n')[0];assert.equal(digest(query),b.quotation_entries_sha256[0]);
      const verified=await call('verify_quote',{text:query,language:'english',texts:[id],translation_ids:[tid(profile)],limit:1});
      assert.equal(verified.verdict,'found');assert.equal(verified.scope.complete_source_versions_compared,1);assert.equal(verified.scope.source_versions_not_compared,0);quotes++;
    }
  });
  assert.deepEqual({paragraphs,notes,quotes},{paragraphs:56,notes:28,quotes:6});assert.equal(totalPages,e.expectedPages);assert.ok(calls.every(id=>e.ids.includes(id)));
});

// 3. Real source positives, then same-count corruption and forged metadata controls.
test('cached actual note/provenance/rights/body-scope mutations refuse in both individual/comparison validators and both bridges',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);
  for(const id of e.ids) {
    const {profile,first,widget,args,context}=await actual(id),pali=widget.pali.segments[0].text;
    const rows=[{translation_revision:'0'.repeat(40)},{license:'CC0'},{attribution:''},{url:e.profiles[e.ids.find(other=>other!==id)].url},{fetched_url:profile.raw_url.replace(REV,'0'.repeat(40))},...['raw_sha256','body_sha256','notes_sha256','paratext_sha256','root_sha256'].map(key=>({[key]:'0'.repeat(64)})),{translator_notes:undefined},{translator_notes:[]},{mapping_notes:[]},{publisher_paratext:'\n'},{publisher_preface:{}},{chapter_summary:{}},{collection_summary:{}},{publisher_divisions:[]},{editorial_gap:{}}];
    for(const [index,note] of first.translator_notes.entries()) {
      const changed=first.translator_notes.map((n,i)=>i===index?{...n,text:n.text+'\n'}:n);
      rows.push({translator_notes:changed},{translator_notes:changed,notes_sha256:digest(JSON.stringify(changed))});
      const foreign=clone(first.translator_notes);foreign[index]={...note,number:99};rows.push({translator_notes:foreign});
    }
    for(const notice of profile.mapping_notes) rows.push({notes:first.notes.filter(n=>n!==notice)});
    for(const patch of rows) assert.ok(Object.keys(patch).some(key=>JSON.stringify(first[key])!==JSON.stringify(patch[key])),'Meaningful source-payload mutation '+id);
    for(const bridge of ['MCP Apps','Apps SDK']) {
      const host=view(bridge);host.output(widget);shown(host,widget.english,pali,id);
      for(const patch of rows) {
        const bad={...clone(first),...structuredClone(patch)};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));refuse(host,widget,bad,first,pali,id);
      }
    }
  }
});

// 4. Whole source-owned exceptions are checked against both original-first proof sets.
test('six owned displaypairs one nonempty321heading three eightline entries and329literalxxxellipsis render without scope invention',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);let combined=0,headings=0;
  for(const id of e.ids){const {profile,unit,parsed,context}=await actual(id),args={uid:id,translation:tid(profile),translation_revision:REV,limit:6000};
    const full=await english.translation(unit,args.translation,args),widget=await readPassage({uid:id,translation:args.translation,englishCharacters:6000,limit:2});e.assertNormalized(id,full);assert.equal(validateEnglishPage(full,args,context),null);assert.equal(validateComparisonPage(full,args,context),null);
    const rows=parsed.text.split('\n\n'),combinedRows=profile.stanza_layout.flatMap((r,i)=>r.lines===8?[rows[i+1]]:[]);combined+=combinedRows.length;if(full.publisher_paratext){headings++;assert.equal(id,'tha-ap323');assert.ok(!full.text.includes(full.publisher_paratext));}
    for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(widget);shown(host,full,widget.pali.segments[0].text,id);for(const row of combinedRows)assert.ok(host.elements.english.textContent.includes(row));if(full.publisher_paratext)assert.ok(host.elements.english.textContent.includes(full.publisher_paratext));assert.ok(!/<span|data-state/.test(host.elements.english.textContent));}
    const foreign=structuredClone(full.translator_notes);foreign[0]={...foreign[0],text:foreign[0].text+'\n'};const bad={...full,translator_notes:foreign,notes_sha256:digest(JSON.stringify(foreign))};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));
    if(id==='tha-ap331'){const n=full.translator_notes.find(n=>n.number===2);assert.ok(n.text.includes('xxx'));assert.ok(n.text.endsWith('…'));assert.equal(digest(n.text),e.arows[id].notes[1].text_sha256);}
  }
  assert.equal(headings,1);assert.equal(combined,3);assert.equal(e.A.finite_pair_owner_inventory.reduce((n,r)=>n+r.count,0),6);
});

// 5. Actual continuation data plus UI/schema drift controls, never manually fabricated successful pages.
test('genuine500character continuations reject stale UID/version/prefix/offset/scope metadata and retain authentic Pali on refused widget reads',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);
  for(const id of e.ids) {
    const {first,widget,args,context,profile}=await actual(id);assert.ok(first.continue_with);assert.ok(e.bodyLength(id)>500);
    const next=first.continue_with.arguments,other=e.ids.find(other=>other!==id);
    for(const patch of [{uid:other},{translation:tid(APADANA_PROFILES[other])},{offset:next.offset+1},{translation_revision:'0'.repeat(40)},{prefix_sha256:'invalid-prefix'},{allow_partial:true},{allow_shared:true}]) {
      const bad={...clone(first),continue_with:{...clone(first.continue_with),arguments:{...next,...patch}}};assert.throws(()=>validateEnglishPage(bad,args,context));assert.throws(()=>validateComparisonPage(bad,args,context));
    }
    // A validly shaped future-prefix digest is checked against actual re-fetched source text on the next request.
    const countBeforeCorruptPrefix=calls.length;
    await assert.rejects(()=>english.translation(canon.resolve(id).unit,tid(profile),{...next,prefix_sha256:'0'.repeat(64)}),/prefix changed/);
    assert.equal(calls.length,countBeforeCorruptPrefix+1,'Corrupt prefix rejected after revalidating the exact pinned source');
    assert.equal(calls.at(-1),id,'Prefix validation cannot fetch a different source');
    const continued=await english.translation(canon.resolve(id).unit,tid(profile),next);
    assert.equal(continued.offset,500);assert.equal(digest(continued.text),digest(parseApadana(e.artifact(id),profile).text.slice(500,1000)));
    const before=calls.length,bad=await readPassage({...widget.english.continue_with.arguments,english_translation_revision:'0'.repeat(40),englishCharacters:500});
    assert.equal(calls.length,before);assert.equal(bad.english,null);assert.ok(bad.english_error);assert.equal(digest(bad.pali.segments[0].text),digest(widget.pali.segments[0].text));
    for(const bridge of ['MCP Apps','Apps SDK']){const host=view(bridge);host.output(bad);assert.ok(host.elements.english.textContent.includes(bad.english_error));assert.ok(!host.elements.english.textContent.includes(first.text));assert.ok(host.elements.pali.textContent.includes(widget.pali.segments[0].text));}
  }
});

// 6. Personal records never become source inputs and stale/changed bases cannot be silently replaced.
test('synthetic private drafts remain local unsaved and exact pinned citations survive cancel changedbase and stalejournal guards',{skip:!e.checkout},async()=>{
  const calls=[];transport(calls);await withMCP(async call=>{for(const id of e.ids){const p=e.profiles[id],data=await call('get_translation',{uid:id,translation:tid(p),translation_revision:REV,limit:500});assert.ok(!JSON.stringify(data).includes(PRIVATE));assert.equal(digest(data.text),e.pages[id].pages500[0].text_sha256);}});
  const mark={uid:e.ids[0],ref:e.ids[0]+'/2',title:'Synthetic saved source citation',note:PRIVATE+' saved',offset:1,source_commit:VRI},before=digest(JSON.stringify(mark));
  const entries=stageNoteDraftEntry([],mark,PRIVATE+' unsaved'),raw=serializeNoteDraftJournal(entries),roundtrip=parseNoteDraftJournal(raw),recovered=reconcileNoteDraftJournal(roundtrip,[mark]);
  assert.equal(digest(JSON.stringify(mark)),before);assert.equal(digest(recovered.drafts.get(passageNoteKey(mark))),digest(PRIVATE+' unsaved'));assert.equal(recovered.restored.length,1);
  const location=bookmarkLocation(mark,{uid:mark.uid}),params=new URLSearchParams(location.href.slice(6));assert.equal(params.get('uid'),mark.uid);assert.equal(params.get('ref'),mark.ref);assert.equal(params.get('source'),VRI);assert.equal(params.get('offset'),'1');assert.ok(!location.href.includes(PRIVATE));
  const changed={...mark,source_commit:'0'.repeat(40)},quarantined=reconcileNoteDraftJournal(roundtrip,[changed]);assert.equal(quarantined.restored.length,0);assert.equal(quarantined.pending[0].reason,'changed-bookmark');
  assert.equal(removeNoteDraftEntry(roundtrip,{...roundtrip[0],draft:'stale action'}).length,1);assert.equal(removeNoteDraftEntry(roundtrip,roundtrip[0]).length,0);
  let wrote=false;assert.throws(()=>guardedNoteDraftJournalWrite({expected:raw,entries:[],read:()=>raw+' ',write:()=>{wrote=true;}}),/changed/);assert.equal(wrote,false);assert.equal(digest(JSON.stringify(mark)),before);assert.ok(calls.every(id=>e.ids.includes(id)));
});
