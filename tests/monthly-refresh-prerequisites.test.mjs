// Genuine current monthly source counterpart; old historical104 registrations stay unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
import {HISTORICAL104_AUX_FETCH} from './helpers/historical104-auxiliary-workflow.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
// The index-bound test authenticates this one auxiliary before executing its exact buffer.
const monthlyHelperPath=fileURLToPath(new URL('./helpers/monthly-refresh-prerequisites.mjs',import.meta.url));
for(let current=monthlyHelperPath;;current=dirname(current)){
 const info=lstatSync(current);
 assert.equal(info.isSymbolicLink(),false,'Monthly prerequisite helper parents must be physical');
 assert.equal(current===monthlyHelperPath?info.isFile():info.isDirectory(),true);
 if(dirname(current)===current)break;
}
const monthlyBefore=lstatSync(monthlyHelperPath,{bigint:true});
assert.equal(monthlyBefore.size,BigInt(4946));
assert.ok(monthlyBefore.size<=65536n);
const monthlyHelperBytes=readFileSync(monthlyHelperPath);
const monthlyAfter=lstatSync(monthlyHelperPath,{bigint:true});
for(const key of ['dev','ino','size','mode','mtimeNs','ctimeNs'])assert.equal(monthlyAfter[key],monthlyBefore[key]);
assert.equal(monthlyHelperBytes.length,4946);
assert.equal(sha(monthlyHelperBytes),'fc209d0d51dbd21f91993c177753437fc71aa672db0d580fcb6d9003c6edeb39');
const {MONTHLY_PATH,MONTHLY_HISTORICAL104_FETCH,restoreCurrentMonthlyPrerequisites,checkCurrentMonthlyPrerequisiteControls}=await import('data:text/javascript;base64,'+monthlyHelperBytes.toString('base64'));
assert.equal(MONTHLY_HISTORICAL104_FETCH,HISTORICAL104_AUX_FETCH,'Original historical104 block remains byte-exact');
test('current monthly exact104 and fixedH setup has strict historical inverse and drift refusals',{timeout:5000},()=>{
 const result=checkCurrentMonthlyPrerequisiteControls(readFileSync(MONTHLY_PATH,'utf8'));
 assert.deepEqual(result,{historical104_inverse:true,refusals:26});
});
