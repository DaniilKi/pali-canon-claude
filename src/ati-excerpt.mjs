/** One reviewed verse container; editorial prose is never scripture for this extraction. */
import {plainText} from './http.mjs';
export function atiVerseExcerpt(html) {
  const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
  const fail=()=>{throw Error('The reviewed ATI verse extraction structure changed. No excerpt was returned.');};
  if(typeof html!=='string'||html.split(begin).length!==2||html.split(end).length!==2)fail();
  const start=html.indexOf(begin)+begin.length,stop=html.indexOf(end);if(stop<=start)fail();
  const chunk=html.slice(start,stop),opens=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])freeverse\1[^>]*>/gi)];
  if(opens.length!==1)fail();
  const from=opens[0].index+opens[0][0].length,to=chunk.indexOf('</div>',from);if(to<from)fail();
  const verse=chunk.slice(from,to);if(/<\/?div\b|<script\b|<style\b/i.test(verse))fail();
  const text=plainText(verse);if(!text)fail();return text;
}

/** A single prose paragraph inside the reviewed chapter, excluding the notes list. */
export function atiChapterProse(html) {
  const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
  const fail=()=>{throw Error('The reviewed ATI prose extraction structure changed. No excerpt was returned.');};
  if(typeof html!=='string'||html.split(begin).length!==2||html.split(end).length!==2)fail();
  const from=html.indexOf(begin)+begin.length,to=html.indexOf(end);if(to<=from)fail();
  const chunk=html.slice(from,to),opens=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])chapter\1[^>]*>/gi)];
  if(opens.length!==1)fail();
  const start=opens[0].index+opens[0][0].length,notes=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])notes\1[^>]*>/gi)];
  if(notes.length!==1)fail();
  const stop=notes[0].index;if(stop<=start||chunk.indexOf('</div>',start)<stop)fail();
  const body=chunk.slice(start,stop),paragraphs=[...body.matchAll(/<p\b[^>]*>([^]*?)<\/p>/gi)];
  if(paragraphs.length!==1||/<\/?(?:div|script|style|dl|ol|ul)\b/i.test(body)||body.replace(paragraphs[0][0],'').trim())fail();
  // Citation markers are not translation wording; the full notes remain on the publisher page.
  const text=plainText(paragraphs[0][1].replace(/<a\b[^>]*class=['"]noteTag['"][^>]*>[^]*?<\/a>/gi,''));
  if(!text)fail();return text;
}
export function atiPartialExcerpt(html,extractor) {
  if(extractor==='ati-freeverse-v1')return atiVerseExcerpt(html);
  if(extractor==='ati-chapter-prose-v1')return atiChapterProse(html);
  if(extractor==='ati-chapter-p5-of5-no-notes-v1')return chapterLastParagraphWithoutNotes(html);
  if(extractor==='ati-chapter-p1to3-of4-ellipsis-v1')return chapterProseBeforeEllipsis(html);
  if(extractor==='ati-chapter-p1to4-of5-notes-v1')return chapterProsePrefixBeforeNotes(html);
  if(extractor==='ati-vinaya-mv6-p1to5-of5-v1')return vinayaChapterProse(html,5);
  if(extractor==='ati-vinaya-mv8-p1to22-of22-v1')return vinayaChapterProse(html,22);
  if(extractor==='ati-vinaya-mv1-mixed21p6v-v1')return upatissaChapter(html);
  if(extractor==='ati-chapter-p2-of2-v1')return chapterParagraph(html,2,2);
  if(extractor==='ati-chapter-p11-of11-v1')return chapterParagraph(html,11,11,'Seeing the Dhamma');
  if(extractor==='ati-chapter-p1-of4-v1')return chapterParagraph(html,4,1);
  if(extractor==='ati-chapter-p14-of24-v1')return chapterParagraph(html,24,14);
  if(extractor==='ati-excerpt-verse-pre-v1')return excerptVersePre(html);
  throw Error('Unsupported ATI partial extractor. No excerpt was returned.');
}

export const ATI_SUBPARAGRAPH_EXTRACTORS = Object.freeze(['ati-chapter-prose-v1', 'ati-chapter-p5-of5-no-notes-v1', 'ati-chapter-p1to4-of5-notes-v1']);

// Reviewed finite source structures, never caller-supplied HTML selectors.
export const ATI_SEGMENT_EXTRACTORS = Object.freeze([
  'ati-freeverse-v1', 'ati-chapter-p2-of2-v1', 'ati-chapter-p11-of11-v1',
  'ati-chapter-p1-of4-v1', 'ati-excerpt-verse-pre-v1', 'ati-chapter-p14-of24-v1', 'ati-chapter-p1to3-of4-ellipsis-v1',
  'ati-vinaya-mv6-p1to5-of5-v1', 'ati-vinaya-mv8-p1to22-of22-v1',
  'ati-vinaya-mv1-mixed21p6v-v1',
]);

/** All 27 reviewed Mv1.23.1–10 children, keeping each stanza's line breaks. */
function upatissaChapter(html) {
  const fail=()=>{throw Error('The reviewed ATI Upatissa mixed-body extraction structure changed. No excerpt was returned.');};
  const chunk=copyrightedChunk(html).trim();
  const chapter=chunk.match(/^<div class=(["'])chapter\1>([^]*)<\/div>\s*<\/div>$/);
  if(!chapter)fail();
  const sequence=[...Array(8).fill('p'),'verse','p','verse','p','verse',...Array(9).fill('p'),'verse','p','verse','p','verse'];
  const anchorsByParagraph=new Map([[1,['sanjaya','rajagaha','sariputta','moggallana']],[2,['assaji']],[10,['saristream']],[21,['moggstream']]]);
  let rest=chapter[2],paragraph=0;
  const texts=[];
  for(const kind of sequence){
    rest=rest.trimStart();
    const child=kind==='p'?rest.match(/^<p>([^]*?)<\/p>/):rest.match(/^<div class=(["'])freeverse\1>([^]*?)<\/div>/);
    if(!child)fail();
    const body=child[kind==='p'?1:2],expected=kind==='p'?(anchorsByParagraph.get(++paragraph)||[]):[];
    let active=false,count=0;
    for(const [tag]of body.matchAll(/<[^>]*>/g)){
      if(!active&&count<expected.length&&new RegExp('^<a id=(["\'])'+expected[count]+'\\1>$').test(tag)){active=true;count++;}
      else if(active&&tag==='</a>')active=false;
      else fail();
    }
    if(active||count!==expected.length||/[<>]/.test(body.replace(/<[^>]*>/g,'')))fail();
    const text=plainText(body);if(!text)fail();texts.push(text);
    rest=rest.slice(child[0].length);
  }
  if(rest.trim())fail();
  return texts.join('\n\n');
}
function copyrightedChunk(html) {
  const begin='<!-- BEGIN COPYRIGHTED TEXT CHUNK -->',end='<!-- #COPYRIGHTED_TEXT_CHUNK (END OF COPYRIGHTED TEXT CHUNK) -->';
  if(typeof html!=='string'||html.split(begin).length!==2||html.split(end).length!==2)throw Error('The reviewed ATI selection extraction structure changed. No excerpt was returned.');
  const start=html.indexOf(begin)+begin.length,stop=html.indexOf(end);
  if(stop<=start)throw Error('The reviewed ATI selection extraction structure changed. No excerpt was returned.');
  return html.slice(start,stop);
}
function chapterParagraph(html,total,selected,heading) {
  const fail=()=>{throw Error('The reviewed ATI paragraph selection extraction structure changed. No excerpt was returned.');};
  const chunk=copyrightedChunk(html),chapters=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])chapter\1[^>]*>/gi)],notes=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])notes\1[^>]*>/gi)];
  if(chapters.length!==1||notes.length!==1)fail();
  const start=chapters[0].index+chapters[0][0].length,stop=notes[0].index;
  if(stop<=start||chunk.indexOf('</div>',start)<stop)fail();
  const body=chunk.slice(start,stop),paragraphs=[...body.matchAll(/<p\b[^>]*>([^]*?)<\/p>/gi)];
  if(paragraphs.length!==total||/<\/?(?:div|script|style|dl|ol|ul|pre)\b/i.test(body))fail();
  let remainder=body.replace(/<p\b[^>]*>[^]*?<\/p>/gi,'').trim();
  if(heading){if(remainder!==`<h4>${heading}</h4>`)fail();}else if(remainder)fail();
  const chosen=paragraphs[selected-1][1];
  if(/<\/?p\b/i.test(chosen))fail();
  const text=plainText(chosen.replace(/<a\b[^>]*class=['"]noteTag['"][^>]*>[^]*?<\/a>/gi,''));
  if(!text)fail();return text;
}
function excerptVersePre(html) {
  const fail=()=>{throw Error('The reviewed ATI preformatted verse extraction structure changed. No excerpt was returned.');};
  const chunk=copyrightedChunk(html),opens=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])excerpt verse\1[^>]*>/gi)];
  const chapters=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])chapter\1[^>]*>/gi)];
  if(opens.length!==1||chapters.length!==1||chapters[0].index>=opens[0].index||[...chunk.matchAll(/<pre\b/gi)].length!==1)fail();
  const start=opens[0].index+opens[0][0].length,stop=chunk.indexOf('</div>',start);if(stop<start)fail();
  const body=chunk.slice(start,stop),pres=[...body.matchAll(/<pre\b[^>]*>([^]*?)<\/pre>/gi)];
  if(pres.length!==1||body.replace(pres[0][0],'').trim()||/<[^>]*>/.test(pres[0][1]))fail();
  const text=plainText(pres[0][1]);if(!text)fail();return text;
}

/** Finite no-notes chapter parser, called only with source-reviewed constants. */
function chapterParagraphsWithoutNotes(html,total) {
  const fail=()=>{throw Error('The reviewed ATI no-notes paragraph extraction structure changed. No excerpt was returned.');};
  const chunk=copyrightedChunk(html),chapters=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])chapter\1[^>]*>/gi)];
  if(chapters.length!==1)fail();
  const start=chapters[0].index+chapters[0][0].length,stop=chunk.indexOf('</div>',start);
  if(stop<start||chunk.slice(0,chapters[0].index).trim()||chunk.slice(stop+6).trim()!=='</div>')fail();
  const body=chunk.slice(start,stop),paragraphs=[...body.matchAll(/<p\b[^>]*>([^]*?)<\/p>/gi)];
  if(paragraphs.length!==total||/<\/?(?:div|script|style|dl|ol|ul|pre)\b/i.test(body)||body.replace(/<p\b[^>]*>[^]*?<\/p>/gi,'').trim()||paragraphs.some(p=>/<\/?p\b/i.test(p[1])))fail();
  return paragraphs.map(p=>p[1]);
}
const selectedProse=paragraphs=>{
  const texts=paragraphs.map(p=>plainText(p.replace(/<a\b[^>]*class=['"]noteTag['"][^>]*>[^]*?<\/a>/gi,'')));
  if(texts.some(t=>!t))throw Error('The reviewed ATI prose extraction structure changed. No excerpt was returned.');
  return texts.join('\n\n');
};
// These two reviewed bodies have no inline notes or formatting. Only Mv8's three
// inert named anchors are permitted; do not let selectedProse erase added notes.
function vinayaChapterProse(html,total) {
  const paragraphs=chapterParagraphsWithoutNotes(html,total);
  const fail=()=>{throw Error('The reviewed ATI Vinaya inline extraction structure changed. No excerpt was returned.');};
  for(const paragraph of paragraphs){
    let anchor=false;
    for(const [tag] of paragraph.matchAll(/<[^>]*>/g)){
      if(total===22&&!anchor&&/^<a id=(["'])(?:ananda|patient|nurse)\1>$/.test(tag))anchor=true;
      else if(anchor&&tag==='</a>')anchor=false;
      else fail();
    }
    if(anchor)fail();
  }
  return selectedProse(paragraphs);
}
function chapterLastParagraphWithoutNotes(html) {
  return selectedProse(chapterParagraphsWithoutNotes(html,5).slice(4));
}
function chapterProseBeforeEllipsis(html) {
  const paragraphs=chapterParagraphsWithoutNotes(html,4);
  if(plainText(paragraphs[3])!=='...')throw Error('The reviewed ATI final ellipsis structure changed. No excerpt was returned.');
  return selectedProse(paragraphs.slice(0,3));
}
function chapterProsePrefixBeforeNotes(html) {
  const fail=()=>{throw Error('The reviewed ATI five-paragraph notes extraction structure changed. No excerpt was returned.');};
  const chunk=copyrightedChunk(html),chapters=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])chapter\1[^>]*>/gi)],notes=[...chunk.matchAll(/<div\b[^>]*\sclass\s*=\s*(["'])notes\1[^>]*>/gi)];
  if(chapters.length!==1||notes.length!==1)fail();
  const start=chapters[0].index+chapters[0][0].length,stop=notes[0].index;
  if(stop<=start||chunk.slice(0,chapters[0].index).trim()||chunk.indexOf('</div>',start)<stop)fail();
  const tail=chunk.slice(stop+notes[0][0].length),notesEnd=tail.indexOf('</div>');
  if(notesEnd<0||/<\/?(?:div|script|style|pre)\b/i.test(tail.slice(0,notesEnd))||!/^\s*<\/div>\s*<\/div>\s*$/.test(tail.slice(notesEnd+6)))fail();
  const body=chunk.slice(start,stop),paragraphs=[...body.matchAll(/<p\b[^>]*>([^]*?)<\/p>/gi)];
  if(paragraphs.length!==5||/<\/?(?:div|script|style|dl|ol|ul|pre)\b/i.test(body)||body.replace(/<p\b[^>]*>[^]*?<\/p>/gi,'').trim()||paragraphs.some(p=>/<\/?p\b/i.test(p[1])))fail();
  return selectedProse(paragraphs.slice(0,4).map(p=>p[1]));
}
