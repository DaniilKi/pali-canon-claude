import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as canon from '../src/canon.mjs';
import {readingPlan} from '../src/daily.mjs';
import {daySignature,planCatalog} from '../web/reading-plans.mjs';
import {parseProgress,mergeProgress,MAX_PROGRESS_MARKS} from '../web/progress-import.mjs';
const catalog=planCatalog(readingPlan(canon,{}));
const mark=(day=1)=>({name:'mn-year',day,signature:daySignature(readingPlan(canon,{name:'mn-year',day}))});
const file=progress=>JSON.stringify({format:'pali-library-reading-progress-v1',progress});
test('all actual plan-day signatures round trip without changing assignments or source revisions',()=>{
 const marks=catalog.flatMap(p=>Array.from({length:p.days},(_,i)=>({name:p.name,day:i+1,signature:daySignature(readingPlan(canon,{name:p.name,day:i+1}))})));
 assert.deepEqual(parseProgress(file(marks),catalog),marks);
});
test('foreign files, duplicate days, unknown plans, extra fields and inconsistent nested signatures fail atomically',()=>{
 const good=mark(),s=JSON.parse(good.signature);
 for(const text of ['x','{}',JSON.stringify({format:'pali-library-v1',saved:[]}),file([good,good]),file([{...good,name:'unknown'}]),file([{...good,day:401}]),file([{...good,extra:1}]),file([{...good,signature:JSON.stringify({...s,day:2})}]),file([{...good,signature:JSON.stringify({...s,source:'<img>'})}]),file([{...good,signature:JSON.stringify({...s,extra:1})}]),file([{...good,signature:JSON.stringify({...s,readings:[{...s.readings[0],id:'javascript:alert(1)'}]})}]),file([{...good,signature:JSON.stringify({...s,readings:[{...s.readings[0],offset:-1}]})}]),file([{...good,signature:JSON.stringify({...s,readings:[...s.readings,...s.readings]})}])])assert.throws(()=>parseProgress(text,catalog));
});
test('old source pins remain old and harmless whitespace/key order is normalized to the actual signature format',()=>{
 const m=mark(),s=JSON.parse(m.signature);const old={...m,signature:JSON.stringify({...s,source:'old-revision'})};assert.equal(JSON.parse(parseProgress(file([old]),catalog)[0].signature).source,'old-revision');
 const reordered=JSON.stringify({readings:s.readings,source:s.source,day:s.day,name:s.name},null,2);assert.equal(parseProgress(file([{...m,signature:reordered}]),catalog)[0].signature,m.signature);
});
test('additive merge preserves conflicting local marks and refuses overflow without mutation',()=>{
 const first=mark(),different={...first,signature:first.signature.replace('"source":"','"source":"old-')},second=mark(2),existing=[first];
 assert.deepEqual(mergeProgress(existing,[different,second]),{progress:[first,second],added:1,duplicates:0,conflicts:1});
 assert.equal(mergeProgress(existing,[first]).duplicates,1);assert.deepEqual(existing,[first]);
 const full=Array.from({length:MAX_PROGRESS_MARKS},(_,i)=>({name:'local-'+i,day:1,signature:'legacy'}));assert.throws(()=>mergeProgress(full,[second]));assert.equal(full.length,MAX_PROGRESS_MARKS);
});
