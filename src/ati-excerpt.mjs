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
