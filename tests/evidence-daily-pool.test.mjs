import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expectedDailyPools } from '../scripts/evidence/study.mjs';
import * as canon from '../src/canon.mjs';

test('independent daily evidence pool excludes shared/partial-only declarations, including malformed scope keys',()=>{
 const units=[{id:'dhp1',collection:'dhp'},{id:'dhp1-20',collection:'dhp',kind:'range'},...Array.from({length:8},(_,i)=>({id:'dn'+(i+1),collection:'dn'}))];units.find(u=>u.id==='dn5').approximate=true;units.find(u=>u.id==='dn6').kind='range';
 const whole={source:'synthetic'},shared={...whole,shared_scope:{presentation:'compilation'}},partial={...whole,partial_scope:{}};
 const fixture={canon:{units},translations:{dn1:[whole],dn2:[shared],dn3:[partial],dn4:[shared,whole],dn5:[whole],dn6:[whole],dn8:[{...whole,shared_scope:undefined}]}};
 const pools=expectedDailyPools(fixture);assert.deepEqual(pools.verse.map(u=>u.id),['dhp1']);assert.deepEqual(pools.sutta.map(u=>u.id),['dn1','dn4']);
 const actual=expectedDailyPools(canon.load());assert.ok(actual.sutta.length>1000);for(const id of ['an1.45','an1.46','an1.49','an1.50','an1.51','an1.52','an2.32','an2.33'])assert.ok(!actual.sutta.some(u=>u.id===id));
});
