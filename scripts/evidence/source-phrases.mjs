// Pinned post-canonical source examples containing letters outside Roman/Pāli conversion.
import * as post from '../../src/postcanonical.mjs';
import {romanizeLookupInput} from '../../src/script.mjs';
export function sourceGrammarFixtures() {
 const out=[];
 for(const book of post.load().books) for(const [i,b] of book.blocks.entries()) {
  const text=b[2],at=text.search(/[^\p{Script=Latin}\P{L}]/u); // a letter outside Latin
  if(at<0)continue;
  try {romanizeLookupInput(text);continue;} catch {}
  const words=[...text.matchAll(/\S+/gu)],k=words.findIndex(w=>w.index<=at&&at<w.index+w[0].length),lo=Math.max(0,k-3),hi=Math.min(words.length-1,k+3);
  const phrase=text.slice(words[lo].index,words[hi].index+words[hi][0].length);
  out.push({book:book.id,block:i,phrase,query:'"'+phrase+'"',glyphs:[...new Set([...phrase].filter(c=>/\p{L}/u.test(c)&&!/\p{Script=Latin}/u.test(c)))]});
 }
 return out;
}
