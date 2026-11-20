/** Independent curatorial expectations; never derive this whitelist from runtime data. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {remainingEvidence} from './thera-remaining-evidence.mjs';
import {held234Evidence} from './thera-held234-evidence.mjs';
import {thera261280Evidence} from './thera261-280-evidence.mjs';

const historical=JSON.parse(readFileSync(new URL('../../docs/evidence/apadana/THERA_SCALED_APPROVAL.json',import.meta.url),'utf8'));
const previousBytes=readFileSync(new URL('../../docs/evidence/apadana/THERA_241_250_APPROVAL.json',import.meta.url));
const previous=JSON.parse(previousBytes);
const intake=JSON.parse(readFileSync(new URL('../../docs/evidence/apadana/THERA_221_230_APPROVAL.json',import.meta.url),'utf8'));
assert.equal(previous.schema,'reviewed-apadana-intake-v1');
assert.equal(previous.status,'approved');
assert.equal(previous.expected_profile_ids.length,256);
assert.equal(createHash('sha256').update(previousBytes).digest('hex'),'4d11c069b21e87ba7b58ea9a55c6b39d0a1beef0c9cd9f824e7c3f6146736df2');
assert.equal(intake.previous_intake.file,'THERA_241_250_APPROVAL.json');
assert.equal(intake.previous_intake.sha256,createHash('sha256').update(previousBytes).digest('hex'));
assert.deepEqual(intake.baseline_ids,previous.expected_profile_ids);
assert.deepEqual(intake.baseline_records,[...previous.baseline_records,...previous.approved_records]);
assert.equal(intake.base_commit,'9ceed785d30afdcdc1f09021d6098b5bb85f02fb');
assert.equal(intake.approved_ids.length,10);
assert.equal(intake.schema,'reviewed-apadana-intake-v1');
assert.equal(intake.status,'approved');
assert.equal(intake.publisher_revision,'fb76b8b4556c559aeaaba852f9bf7ed74ea11fd4');
assert.deepEqual(intake.expected_profile_ids,[...intake.baseline_ids,...intake.approved_ids]);
assert.equal(new Set(intake.expected_profile_ids).size,intake.expected_profile_ids.length);
const latest=remainingEvidence('A').combined;
assert.equal(latest.previous_intake.file,'THERA_221_230_APPROVAL.json');
const intakeBytes=readFileSync(new URL('../../docs/evidence/apadana/THERA_221_230_APPROVAL.json',import.meta.url));
assert.equal(createHash('sha256').update(intakeBytes).digest('hex'),'4ae2cd3fea1c64e323dfa41c15403c33215e90f8834c7ee0a4db708f77f68bed');
assert.equal(latest.previous_intake.sha256,createHash('sha256').update(intakeBytes).digest('hex'));
assert.deepEqual(latest.baseline_ids,intake.expected_profile_ids);
assert.deepEqual(latest.baseline_records,[...intake.baseline_records,...intake.approved_records]);
const held234=held234Evidence().approval;
assert.deepEqual(held234.baseline_ids,latest.expected_profile_ids);
assert.deepEqual(held234.baseline_records,[...latest.baseline_records,...latest.approved_records]);
const newIntake=thera261280Evidence(),current=newIntake.approval;
assert.deepEqual(newIntake.previous,held234,'The sealed285 intake remains the exact historical anchor');
assert.deepEqual(current.baseline_ids,held234.expected_profile_ids);
assert.deepEqual(current.baseline_records,[...held234.baseline_records,...held234.approved_records]);
const approvedPairs=[[263,261],[264,262],[265,263],[266,264],[267,265],[269,267],[270,268],[271,269],[272,270],[273,271],[274,272],[275,273],[276,274],[277,275],[278,276],[279,277],[280,278],[281,279]];
const approvedRecords=approvedPairs.map(([canonical,poem])=>({id:'tha-ap'+canonical,publisher_chapter:'chapter-3',poem}));
assert.deepEqual(current.approved_records,approvedRecords);
assert.deepEqual(current.approved_ids,approvedRecords.map(row=>row.id));
assert.ok(current.approved_ids.every(id=>!current.baseline_ids.includes(id)));
assert.deepEqual(current.expected_profile_ids,[...held234.expected_profile_ids,...current.approved_ids]);
assert.equal(current.baseline_ids.length,285);assert.equal(current.expected_profile_ids.length,303);
assert.equal(new Set(current.expected_profile_ids).size,303);
for(const id of ['tha-ap262','tha-ap268','tha-ap282']){assert.ok(current.held_ids.includes(id));assert.ok(!current.expected_profile_ids.includes(id));}
const records=[...current.baseline_records,...current.approved_records];
assert.deepEqual(records.map(row=>row.id),current.expected_profile_ids);
assert.ok(records.every(row=>/^(?:thi|tha)-ap\d+$/.test(row.id)&&Number.isInteger(row.poem)&&row.poem>0&&['chapter-3','chapter-4'].includes(row.publisher_chapter)));

export const CURRENT_APADANA_IDS=Object.freeze([...current.expected_profile_ids]);
export const CURRENT_APADANA_RECORDS=Object.freeze(records.map(row=>Object.freeze({...row})));
export const CURRENT_THERA_IDS=Object.freeze(records.filter(row=>row.publisher_chapter==='chapter-3').map(row=>row.id));
export const BASELINE_APADANA_IDS=Object.freeze([...historical.baseline_ids]);
/** Select only immutable pre-D250 records, using their reviewed publisher metadata. */
export function historicalApadanaIds(lastTheraPoem=60){
  return historical.baseline_records.filter(row=>row.publisher_chapter==='chapter-4'||row.poem<=lastTheraPoem).map(row=>row.id);
}

export const CURRENT_APADANA_URLS=Object.freeze(records.map(row=>`https://apadanatranslation.com/text/${row.publisher_chapter}/poem-${String(row.poem).padStart(3,'0')}/`));
