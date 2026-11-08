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
  throw Error('Unsupported ATI partial extractor. No excerpt was returned.');
}
