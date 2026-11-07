// Existing bundled VRI wording, including vowel junctions; these fixtures do not correct the source.
import assert from 'node:assert/strict';
import {SCRIPTS,transliterate} from '../../src/script.mjs';
import {fold} from '../../src/postcanonical.mjs';

export const quotedWordingFixtures = [
 {book:'abhidhammavatara-puranatika',phrase:'hiito bhavato atītasmiṃ bhave'},
 {book:'visuddhimagga-mahatika-1',phrase:'saantake eva'},
 {book:'niruttidipani',phrase:'abalaabalo'},
 {book:'namakkaratika',phrase:'satiiti samaññā satisamaññā'},
 {book:'namakkaratika',phrase:'punarapi punaapi'},
 {book:'buddhagunagathavali',phrase:'Siddhadhammo siddhaattho'},
 {book:'sasanavamsa',phrase:'ete gotamāsāvakā hontii'},
 {book:'moggallanabyakaranam',phrase:'yamaajja mithasakā'},
];
const commentaryFixtures = [
 {book:'s0102a.att.xml',phrase:'tattaaya salākagūthādīni'},
 {book:'s0402a.att.xml',phrase:'hiiti nipātamattaṃ'},
];

export async function auditQuotedWording(client,{scripts=SCRIPTS}={}) {
 const call=async(name,args)=>{const r=await client.callTool({name,arguments:args});assert.ok(!r.isError,JSON.stringify(r.content));assert.deepEqual(JSON.parse(r.content[0].text),JSON.parse(JSON.stringify(r.structuredContent)));return r.structuredContent;};
 let searches=0,reads=0,combined=0,nativeCombined=0,commentarySearches=0,canonicalSearches=0,sourceBookSearches=0;
 for(const fixture of quotedWordingFixtures)for(const script of scripts){
  const query=transliterate('"'+fixture.phrase+'"','roman',script);
  const r=await call('search_post_canonical',{query,books:[fixture.book],script,limit:1});searches++;
  assert.ok(r.total_matched>0,fixture.phrase);assert.equal(r.canonical,false);assert.equal(r.query_mode,'as_typed_phrase');assert.equal(r.input_normalised,undefined);assert.match(r.query_note,/not verified/);
  const hit=r.results[0];assert.equal(hit.book_id,fixture.book);assert.equal(hit.read_with.script,script);
  const {tool,...args}=hit.read_with,page=await call(tool,args);reads++;assert.equal(page.canonical,false);assert.equal(page.source.commit,r.source.commit);
  assert.ok(page.segments.some(s=>fold(script==='roman'?s.text:transliterate(s.text,script,'roman')).includes(fold(fixture.phrase))),'Reading command must recover the copied source wording');
  if(script==='roman')assert.ok(page.segments.some(s=>s.text.includes(fixture.phrase)),'The original Roman source glyphs must remain unchanged');
 }
 for(const fixture of commentaryFixtures)for(const script of scripts){
  const query=transliterate('"'+fixture.phrase+'"','roman',script),r=await call('search_commentary',{query,books:[fixture.book],script,limit:1});commentarySearches++;
  assert.ok(r.total_matched>0);assert.equal(r.query_mode,'as_typed_phrase');assert.equal(r.input_normalised,undefined);assert.equal(r.results[0].book.vri_file,fixture.book);
  const {tool,...args}=r.results[0].read_with,page=await call(tool,args);reads++;assert.equal(page.content_type,'commentary');assert.equal(page.canonical,false);
  assert.ok(page.segments.some(s=>fold(script==='roman'?s.text:transliterate(s.text,script,'roman')).includes(fold(fixture.phrase))));
  if(script==='roman')assert.ok(page.segments.some(s=>s.text.includes(fixture.phrase)));
 }
 for(const script of scripts)for(const name of ['search_texts','search_source_book']){
  const query=transliterate('"ii"','roman',script),r=await call(name,{query,script,limit:1,...(name==='search_texts'?{english:'off'}:{book:'s0102m'})});
  if(name==='search_texts')canonicalSearches++;else sourceBookSearches++;
  assert.equal(r.query_mode,'as_typed_phrase');assert.equal(r.input_normalised,undefined);assert.ok((r.total_matched??r.total_texts_matched)>0);
  const {tool,...args}=r.results[0].read_with,page=await call(tool,args);reads++;
  assert.ok(page.segments.some(s=>fold(script==='roman'?s.text:transliterate(s.text,script,'roman')).includes('ii')));
 }
 for(const fixture of quotedWordingFixtures){
  const query='“'+fixture.phrase+'”',r=await call('search_texts',{query,english:'off',include_post_canonical:true,limit:50});combined++;
  assert.equal(r.post_canonical.query,query);assert.equal(r.post_canonical.query_mode,'as_typed_phrase');assert.equal(r.post_canonical.input_normalised,undefined);
  assert.ok(r.post_canonical.results.some(hit=>hit.book_id===fixture.book),'Canonical normalization must not change the post-canonical query');
 }
 for(const script of scripts){
  const r=await call('search_texts',{query:transliterate('"abalaabalo"','roman',script),script,english:'off',include_post_canonical:true,limit:1});nativeCombined++;
  assert.equal(r.post_canonical.query_mode,'as_typed_phrase');assert.equal(r.post_canonical.query,'"abalaabalo"');assert.equal(r.post_canonical.results[0].book_id,'niruttidipani');assert.equal(r.post_canonical.results[0].read_with.script,script);
 }
 return {source_fixtures:quotedWordingFixtures.length,commentary_fixtures:commentaryFixtures.length,scripts:scripts.length,searches,commentary_searches:commentarySearches,canonical_searches:canonicalSearches,source_book_searches:sourceBookSearches,reads,combined,native_combined:nativeCombined};
}
