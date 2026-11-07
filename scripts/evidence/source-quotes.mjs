// Source-derived quotations whose printed glyphs cannot undergo complete native conversion.
import * as canon from '../../src/canon.mjs';
import {romanizeLookupInput,detectScript} from '../../src/script.mjs';
export function sourceQuoteFixtures() {
 const fixtures=[];
 for(const book of canon.load().canon.books) for(const [blockIndex,block] of book.blocks.entries()) {
  const text=block[2];if(!text)continue;
  try {romanizeLookupInput(text);continue;} catch {}
  const at=[...text.matchAll(/./gsu)].find(m=>detectScript(m[0])!=='roman'||(/\p{L}/u.test(m[0])&&!/\p{Script=Latin}/u.test(m[0])))?.index;
  if(at===undefined)continue;
  const words=[...text.matchAll(/\S+/gu)],k=words.findIndex(w=>w.index<=at&&at<w.index+w[0].length);
  const lo=Math.max(0,k-4),hi=Math.min(words.length-1,k+4);
  fixtures.push({file:book.file,block:blockIndex,text:text.slice(words[lo].index,words[hi].index+words[hi][0].length)});
 }
 return fixtures;
}
