import {test} from 'node:test';
import assert from 'node:assert/strict';
import {search,searchCacheStats} from '../src/commentary-search.mjs';
import * as commentary from '../src/commentary.mjs';
test('repeated full commentary scans retain the shipped corpus instead of cyclically rebuilding every index',()=>{
 const first=search('sati',{limit:3}),warm=searchCacheStats(),second=search('sati',{limit:3}),last=searchCacheStats();
 assert.deepEqual(second,first);assert.equal(warm.books,commentary.load().books.length);assert.equal(last.builds,warm.builds);assert.ok(last.bytes<=last.max_bytes);assert.ok(last.bytes>8*1024*1024);
 for(const hit of second.results)assert.ok(commentary.getCommentary(hit.citation).segments[0].text.includes(hit.excerpt.replace(/^…|…$/gu,'')));
});
